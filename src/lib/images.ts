import fs from "node:fs";
import path from "node:path";

import { imageSize } from "image-size";

import { hasAllowedImageExtension, isExternalSrc, resolveImageSrc } from "@/lib/image-src";
import { resolveInside } from "@/lib/safe-path";

export {
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_IMAGE_BYTES,
  hasAllowedImageExtension,
  isExternalSrc,
  resolveImageSrc,
  sanitiseImageName,
} from "@/lib/image-src";

/** Each post's images live in their own folder: `public/blog/<slug>/`. */
export const PUBLIC_DIR = path.join(process.cwd(), "public");
export const BLOG_IMAGE_ROOT = path.join(PUBLIC_DIR, "blog");

export type ImageMeta = {
  /** Public URL, e.g. `/blog/my-post/hero.png`. */
  src: string;
  width: number;
  height: number;
};

export type PostImageListing = ImageMeta & {
  name: string;
  bytes: number;
};

export function postImageDir(slug: string): string {
  return resolveInside(BLOG_IMAGE_ROOT, slug);
}

/**
 * Intrinsic dimensions for a local image, read straight from its header.
 *
 * Real width/height means every `next/image` gets a correct aspect-ratio box
 * and the page never shifts as images load. Cached on path + mtime + size, so
 * replacing a file in development invalidates the entry without a restart.
 */
const metaCache = new Map<string, ImageMeta | null>();

export function getImageMeta(slug: string, src: string): ImageMeta | null {
  const url = resolveImageSrc(slug, src);
  if (url === "" || isExternalSrc(url)) return null;

  let absolute: string;
  try {
    absolute = resolveInside(PUBLIC_DIR, ...url.replace(/^\/+/, "").split("/"));
  } catch {
    return null;
  }

  let stats: fs.Stats;
  try {
    stats = fs.statSync(absolute);
  } catch {
    return null;
  }
  if (!stats.isFile()) return null;

  const key = `${absolute}|${stats.mtimeMs}|${stats.size}`;
  const cached = metaCache.get(key);
  if (cached !== undefined) return cached;

  let meta: ImageMeta | null = null;
  try {
    const { width, height } = imageSize(fs.readFileSync(absolute));
    if (width && height) meta = { src: url, width, height };
  } catch {
    meta = null;
  }

  metaCache.set(key, meta);
  return meta;
}

/** Every usable image in a post's folder, alphabetically. */
export function listPostImages(slug: string): PostImageListing[] {
  let dir: string;
  try {
    dir = postImageDir(slug);
  } catch {
    return [];
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    // No folder for this post yet.
    return [];
  }

  return entries
    .filter(
      (entry) => entry.isFile() && !entry.name.startsWith(".") && hasAllowedImageExtension(entry.name),
    )
    .map((entry) => {
      const meta = getImageMeta(slug, entry.name);

      let bytes = 0;
      try {
        bytes = fs.statSync(path.join(dir, entry.name)).size;
      } catch {
        bytes = 0;
      }

      return {
        name: entry.name,
        src: resolveImageSrc(slug, entry.name),
        width: meta?.width ?? 0,
        height: meta?.height ?? 0,
        bytes,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
