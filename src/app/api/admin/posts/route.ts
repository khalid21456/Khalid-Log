import { revalidatePath } from "next/cache";

import { requireApiSession } from "@/lib/auth";
import { listRawPosts, postExists, readRawPost, writeRawPost } from "@/lib/post-file";
import { invalidatePostCache } from "@/lib/posts";
import { isValidSlug } from "@/lib/slug";

export const runtime = "nodejs";

/** GET /api/admin/posts            -> every post on disk */
/** GET /api/admin/posts?slug=x     -> one post, for editing */
export async function GET(request: Request) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const slug = new URL(request.url).searchParams.get("slug");

  if (slug === null) return Response.json({ posts: listRawPosts() });

  if (!isValidSlug(slug)) return Response.json({ error: "Invalid slug." }, { status: 400 });

  const post = readRawPost(slug);
  if (!post) return Response.json({ error: "No such post." }, { status: 404 });

  return Response.json({ post });
}

type SaveRequest = {
  slug?: unknown;
  title?: unknown;
  date?: unknown;
  excerpt?: unknown;
  tags?: unknown;
  cover?: unknown;
  coverAlt?: unknown;
  draft?: unknown;
  body?: unknown;
  overwrite?: unknown;
};

function text(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** POST /api/admin/posts -> create or update a post file. */
export async function POST(request: Request) {
  const denied = await requireApiSession();
  if (denied) return denied;

  let payload: SaveRequest;
  try {
    payload = (await request.json()) as SaveRequest;
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const slug = text(payload.slug, 80).toLowerCase();
  if (!isValidSlug(slug)) {
    return Response.json(
      { error: "Slug must be lowercase letters, digits and single hyphens." },
      { status: 400 },
    );
  }

  const title = text(payload.title, 200);
  if (!title) return Response.json({ error: "A title is required." }, { status: 400 });

  const date = text(payload.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Date must be YYYY-MM-DD." }, { status: 400 });
  }

  const body = typeof payload.body === "string" ? payload.body : "";
  if (body.trim() === "") return Response.json({ error: "The post body is empty." }, { status: 400 });

  const tags = (Array.isArray(payload.tags) ? payload.tags : String(payload.tags ?? "").split(","))
    .map((tag) => String(tag).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

  if (postExists(slug) && payload.overwrite !== true) {
    return Response.json(
      { error: `A post called "${slug}" already exists. Open it to edit, or choose another slug.` },
      { status: 409 },
    );
  }

  try {
    await writeRawPost({
      slug,
      title,
      date,
      excerpt: text(payload.excerpt, 400),
      tags: [...new Set(tags)],
      cover: text(payload.cover, 200),
      coverAlt: text(payload.coverAlt, 300),
      draft: payload.draft === true,
      body,
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;

    if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
      return Response.json(
        {
          error:
            "The filesystem is read-only, so the post could not be saved. Publishing from the browser needs a host with a writable, persistent disk.",
        },
        { status: 500 },
      );
    }

    return Response.json(
      { error: `Could not write the post: ${(error as Error).message}` },
      { status: 500 },
    );
  }

  // Let the running server see the new file: drop the in-process cache, then
  // clear the rendered pages that reference it.
  invalidatePostCache();
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);

  return Response.json({ ok: true, slug });
}
