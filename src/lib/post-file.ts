import fs from "node:fs";

import matter from "gray-matter";

import { postImageDir } from "@/lib/images";
import { POST_EXTENSION, POSTS_DIR, postFilePath } from "@/lib/posts";
import { isValidSlug } from "@/lib/slug";

/**
 * Reading and writing post files for the editor.
 *
 * Deliberately lenient where `lib/posts.ts` is strict: the site refuses to
 * render a post with broken frontmatter, but the editor still has to be able to
 * open one in order to fix it. So nothing here throws on bad metadata — missing
 * fields simply come back empty.
 */
export type RawPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  cover: string;
  coverAlt: string;
  draft: boolean;
  body: string;
};

export type PostListEntry = {
  slug: string;
  title: string;
  date: string;
  draft: boolean;
};

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return String(value);
  return "";
}

function asTags(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(raw.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];
}

export function postExists(slug: string): boolean {
  if (!isValidSlug(slug)) return false;
  try {
    return fs.statSync(postFilePath(slug)).isFile();
  } catch {
    return false;
  }
}

export function readRawPost(slug: string): RawPost | null {
  if (!isValidSlug(slug)) return null;

  let contents: string;
  try {
    contents = fs.readFileSync(postFilePath(slug), "utf8");
  } catch {
    return null;
  }

  const { data, content } = matter(contents);

  return {
    slug,
    title: asString(data.title),
    date: asString(data.date).slice(0, 10),
    excerpt: asString(data.excerpt),
    tags: asTags(data.tags),
    cover: asString(data.cover),
    coverAlt: asString(data.coverAlt),
    draft: data.draft === true,
    body: content.replace(/^\n+/, ""),
  };
}

/** Every post on disk, newest first — including drafts and broken ones. */
export function listRawPosts(): PostListEntry[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(POSTS_DIR);
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.endsWith(POST_EXTENSION) && !entry.startsWith("."))
    .map((entry) => {
      const slug = entry.slice(0, -POST_EXTENSION.length);
      const post = readRawPost(slug);

      return {
        slug,
        title: post?.title || slug,
        date: post?.date ?? "",
        draft: post?.draft ?? false,
      };
    })
    .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));
}

/**
 * Write a post to `content/posts/<slug>.txt` and make sure its image folder
 * exists. Frontmatter is serialised by gray-matter, so the file it produces is
 * guaranteed to parse back.
 */
export async function writeRawPost(post: RawPost): Promise<void> {
  const frontmatter: Record<string, unknown> = {
    title: post.title,
    date: post.date,
    excerpt: post.excerpt,
    tags: post.tags,
  };

  // Omit rather than write `null`, so hand-edited files stay tidy.
  if (post.cover) frontmatter.cover = post.cover;
  if (post.coverAlt) frontmatter.coverAlt = post.coverAlt;
  if (post.draft) frontmatter.draft = true;

  const file = matter.stringify(`${post.body.trim()}\n`, frontmatter);

  await fs.promises.mkdir(POSTS_DIR, { recursive: true });
  await fs.promises.writeFile(postFilePath(post.slug), file, "utf8");

  // A post always owns an image folder, even before anything is uploaded.
  await fs.promises.mkdir(postImageDir(post.slug), { recursive: true });
}
