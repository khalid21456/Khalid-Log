/**
 * Pure image helpers — no Node built-ins.
 *
 * This module is imported by both the server renderer and the client-side
 * editor preview, so it must stay free of `node:fs` / `node:path`. The
 * filesystem side lives in `lib/images.ts`.
 */

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"] as const;

/** Upload ceiling per file, enforced by the images API route. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Layout options for an image in a post body. */
export const IMAGE_WIDTHS = ["inline", "wide", "full"] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

export function normaliseImageWidth(value: string | null | undefined): ImageWidth {
  return IMAGE_WIDTHS.includes(value as ImageWidth) ? (value as ImageWidth) : "inline";
}

/** A CSS aspect-ratio like `16/9`, or null if the value is not one. */
export function normaliseRatio(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+(?:\.\d+)?)\s*)?$/.exec(value);
  if (!match) return null;
  const [, width, height] = match;
  if (Number(width) <= 0) return null;
  if (height === undefined) return width;
  if (Number(height) <= 0) return null;
  return `${width} / ${height}`;
}

/** `https://…`, `//…` or `data:…` — anything we must not rewrite. */
export function isExternalSrc(src: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith("//");
}

/**
 * Resolve an image reference from a post body to a public URL.
 *
 * A bare filename (`hero.png`) resolves against the post's own folder, which is
 * what lets an author write filenames instead of paths. Absolute paths and
 * external URLs pass through untouched.
 */
export function resolveImageSrc(slug: string, src: string): string {
  const value = src.trim();
  if (value === "") return "";
  if (isExternalSrc(value) || value.startsWith("/")) return value;
  return `/blog/${slug}/${value.replace(/^\.\//, "")}`;
}

export function hasAllowedImageExtension(name: string): boolean {
  const match = /\.[a-z0-9]+$/i.exec(name);
  return match ? (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(match[0].toLowerCase()) : false;
}

/**
 * Make an uploaded filename safe to place on disk: basename only, lowercased,
 * anything outside `[a-z0-9._-]` collapsed to a hyphen.
 */
export function sanitiseImageName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const lower = base.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const ext = dot > 0 ? lower.slice(dot) : "";
  const stem = (dot > 0 ? lower.slice(0, dot) : lower)
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 60);

  return `${stem === "" ? "image" : stem}${ext}`;
}

/** Human-readable file size for the editor's image list. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
