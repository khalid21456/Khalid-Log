import fs from "node:fs";
import path from "node:path";

import { imageSize } from "image-size";

import { requireApiSession } from "@/lib/auth";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_IMAGE_BYTES,
  hasAllowedImageExtension,
  listPostImages,
  postImageDir,
  sanitiseImageName,
} from "@/lib/images";
import { isValidSlug } from "@/lib/slug";

export const runtime = "nodejs";

function slugFrom(request: Request): string | null {
  const slug = new URL(request.url).searchParams.get("slug");
  return slug && isValidSlug(slug) ? slug : null;
}

/** GET /api/admin/images?slug=x -> the post's image folder. */
export async function GET(request: Request) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const slug = slugFrom(request);
  if (!slug) return Response.json({ error: "Invalid slug." }, { status: 400 });

  return Response.json({ images: listPostImages(slug) });
}

/** POST /api/admin/images -> upload into public/blog/<slug>/ */
export async function POST(request: Request) {
  const denied = await requireApiSession();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected a multipart form." }, { status: 400 });
  }

  const slug = String(form.get("slug") ?? "");
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Save the post first — a slug is needed to name the folder." }, { status: 400 });
  }

  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) return Response.json({ error: "No files were sent." }, { status: 400 });

  const directory = postImageDir(slug);
  const saved: string[] = [];
  const rejected: { name: string; reason: string }[] = [];

  try {
    await fs.promises.mkdir(directory, { recursive: true });
  } catch (error) {
    return Response.json(
      { error: `Could not create the image folder: ${(error as Error).message}` },
      { status: 500 },
    );
  }

  for (const file of files) {
    if (!hasAllowedImageExtension(file.name)) {
      rejected.push({ name: file.name, reason: `Only ${ALLOWED_IMAGE_EXTENSIONS.join(", ")} are allowed.` });
      continue;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      rejected.push({
        name: file.name,
        reason: `Larger than ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`,
      });
      continue;
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // Confirm the bytes really are an image rather than trusting the extension.
    try {
      const { width, height } = imageSize(bytes);
      if (!width || !height) throw new Error("no dimensions");
    } catch {
      rejected.push({ name: file.name, reason: "Not a readable image file." });
      continue;
    }

    // Never silently replace an existing image: add -2, -3, … instead.
    const safeName = sanitiseImageName(file.name);
    const extension = path.extname(safeName);
    const stem = safeName.slice(0, safeName.length - extension.length);

    let finalName = safeName;
    for (let attempt = 2; fs.existsSync(path.join(directory, finalName)); attempt += 1) {
      finalName = `${stem}-${attempt}${extension}`;
    }

    try {
      await fs.promises.writeFile(path.join(directory, finalName), bytes);
      saved.push(finalName);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      rejected.push({
        name: file.name,
        reason:
          code === "EROFS" || code === "EACCES" || code === "EPERM"
            ? "The filesystem is read-only."
            : (error as Error).message,
      });
    }
  }

  return Response.json({ saved, rejected, images: listPostImages(slug) });
}

/** DELETE /api/admin/images?slug=x&name=y */
export async function DELETE(request: Request) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const url = new URL(request.url);
  const slug = slugFrom(request);
  const name = url.searchParams.get("name") ?? "";

  if (!slug) return Response.json({ error: "Invalid slug." }, { status: 400 });

  // A name that does not survive sanitising is not one we wrote.
  if (name === "" || name !== sanitiseImageName(name) || !hasAllowedImageExtension(name)) {
    return Response.json({ error: "Invalid image name." }, { status: 400 });
  }

  const target = path.join(postImageDir(slug), name);

  try {
    await fs.promises.unlink(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return Response.json({ error: "No such image." }, { status: 404 });
    }
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }

  return Response.json({ ok: true, images: listPostImages(slug) });
}
