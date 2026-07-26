import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { readingStats } from "@/lib/reading-time";
import { resolveInside } from "@/lib/safe-path";
import { isValidSlug } from "@/lib/slug";
import type { Post, PostSummary } from "@/types/post";

export const POSTS_DIR = path.join(process.cwd(), "content", "posts");

/** Posts are plain `.txt` files: YAML frontmatter, then a markdown body. */
export const POST_EXTENSION = ".txt";

/** Drafts are visible while developing and dropped from production builds. */
const INCLUDE_DRAFTS = process.env.NODE_ENV !== "production";

export function postFilePath(slug: string): string {
  return resolveInside(POSTS_DIR, `${slug}${POST_EXTENSION}`);
}

function fail(file: string, field: string, problem: string): Error {
  return new Error(
    `Invalid frontmatter in content/posts/${file}: "${field}" ${problem}.\n` +
      `See README.md for the post format.`,
  );
}

function requireString(value: unknown, file: string, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw fail(file, field, "is required and must be a non-empty string");
  }
  return value.trim();
}

/**
 * Normalise a frontmatter date to `YYYY-MM-DD`.
 *
 * js-yaml turns an unquoted `date: 2026-07-20` into a `Date` at UTC midnight
 * while a quoted `date: "2026-07-20"` stays a string, so both have to be
 * accepted. UTC accessors are used throughout so the stored day never shifts
 * with the machine's timezone.
 */
function normaliseDate(value: unknown, file: string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw fail(file, "date", "is not a real date");
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) throw fail(file, "date", "must be in YYYY-MM-DD form");
    const [, year, month, day] = match;
    const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) throw fail(file, "date", "is not a real date");
    return `${year}-${month}-${day}`;
  }

  throw fail(file, "date", "is required (YYYY-MM-DD)");
}

function normaliseTags(value: unknown, file: string): string[] {
  if (value === undefined || value === null) return [];

  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;

  if (raw === null) throw fail(file, "tags", "must be a list or a comma-separated string");

  const tags = raw
    .map((tag) => String(tag).trim().toLowerCase())
    .filter((tag) => tag !== "");

  return [...new Set(tags)];
}

function parsePost(slug: string, raw: string, file: string): Post {
  const { data, content } = matter(raw);

  const title = requireString(data.title, file, "title");
  const date = normaliseDate(data.date, file);
  const tags = normaliseTags(data.tags, file);
  const body = content.trim();

  if (body === "") throw fail(file, "body", "is empty — a post needs content below the frontmatter");

  if (data.cover !== undefined && data.cover !== null && typeof data.cover !== "string") {
    throw fail(file, "cover", "must be an image filename inside public/blog/" + slug);
  }

  const excerpt =
    typeof data.excerpt === "string" && data.excerpt.trim() !== ""
      ? data.excerpt.trim()
      : // Fall back to the opening prose so cards and <meta description> are
        // never blank, even for a post written without an excerpt.
        body
          .split(/\n{2,}/)
          .find((block) => !/^[#>:`|!\-*]/.test(block.trim()))
          ?.replace(/\s+/g, " ")
          .slice(0, 200)
          .trim() ?? title;

  const cover = typeof data.cover === "string" && data.cover.trim() !== "" ? data.cover.trim() : null;

  return {
    slug,
    title,
    date,
    excerpt,
    tags,
    cover,
    coverAlt: typeof data.coverAlt === "string" ? data.coverAlt.trim() : "",
    draft: data.draft === true,
    body,
    ...readingStats(body),
  };
}

/**
 * Read and parse every post from disk.
 *
 * Memoised in production (the content cannot change between requests once the
 * server is built) but deliberately *not* in development, so a post saved from
 * the editor shows up on the next refresh.
 */
let productionCache: Post[] | null = null;

function loadPosts(): Post[] {
  if (productionCache) return productionCache;

  let entries: string[];
  try {
    entries = fs.readdirSync(POSTS_DIR);
  } catch {
    // No content directory yet — an empty blog is a valid state, not an error.
    return [];
  }

  const posts: Post[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(POST_EXTENSION) || entry.startsWith(".")) continue;

    const slug = entry.slice(0, -POST_EXTENSION.length);
    if (!isValidSlug(slug)) {
      throw new Error(
        `content/posts/${entry}: "${slug}" is not a usable slug. ` +
          `Use lowercase letters, digits and single hyphens (e.g. my-first-post.txt).`,
      );
    }

    const raw = fs.readFileSync(path.join(POSTS_DIR, entry), "utf8");
    posts.push(parsePost(slug, raw, entry));
  }

  // Newest first; ties broken by slug so ordering is stable across builds.
  posts.sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));

  if (process.env.NODE_ENV === "production") productionCache = posts;

  return posts;
}

/**
 * Drop the production cache after a post is written from the editor, so the
 * running server picks the change up without a restart.
 */
export function invalidatePostCache(): void {
  productionCache = null;
}

function visible(posts: Post[]): Post[] {
  return INCLUDE_DRAFTS ? posts : posts.filter((post) => !post.draft);
}

function toSummary({ body: _body, ...summary }: Post): PostSummary {
  return summary;
}

export function getAllPosts(): PostSummary[] {
  return visible(loadPosts()).map(toSummary);
}

export function getAllSlugs(): string[] {
  return visible(loadPosts()).map((post) => post.slug);
}

export function getPostBySlug(slug: string): Post | null {
  if (!isValidSlug(slug)) return null;
  return visible(loadPosts()).find((post) => post.slug === slug) ?? null;
}

export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const post of visible(loadPosts())) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (b.count === a.count ? a.tag.localeCompare(b.tag) : b.count - a.count));
}

export function getPostsByTag(tag: string): PostSummary[] {
  const needle = tag.trim().toLowerCase();
  return getAllPosts().filter((post) => post.tags.includes(needle));
}

/** The newer and older neighbours of a post, for in-article navigation. */
export function getAdjacentPosts(slug: string): {
  newer: PostSummary | null;
  older: PostSummary | null;
} {
  const posts = getAllPosts();
  const index = posts.findIndex((post) => post.slug === slug);

  if (index === -1) return { newer: null, older: null };

  return {
    newer: posts[index - 1] ?? null,
    older: posts[index + 1] ?? null,
  };
}

/** Posts sharing the most tags with `slug`, newest first. */
export function getRelatedPosts(slug: string, limit = 3): PostSummary[] {
  const posts = getAllPosts();
  const current = posts.find((post) => post.slug === slug);
  if (!current) return [];

  return posts
    .filter((post) => post.slug !== slug)
    .map((post) => ({
      post,
      shared: post.tags.filter((tag) => current.tags.includes(tag)).length,
    }))
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => (b.shared === a.shared ? (a.post.date < b.post.date ? 1 : -1) : b.shared - a.shared))
    .slice(0, limit)
    .map((entry) => entry.post);
}

/**
 * Format a `YYYY-MM-DD` frontmatter date for display.
 * Pinned to UTC so the rendered day matches the day in the file, and so a
 * statically rendered page and a client re-render can never disagree.
 */
export function formatPostDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
