import Link from "next/link";

import { formatPostDate } from "@/lib/posts";
import type { PostSummary } from "@/types/post";

/**
 * `hero-app-mockup-card` from DESIGN.MD:436 — the hero's right-hand artifact:
 * 16px radius, hairline border, subtle shadow.
 *
 * DESIGN.MD:481 asks for real product UI in-card rather than an illustration of
 * it. A blog's "product" is the reading surface, so this shows the actual latest
 * posts as a working list, not a drawing of one.
 */
export function ReadingWidget({ posts }: { posts: PostSummary[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-canvas shadow-card">
      <div className="flex items-center justify-between border-b border-hairline-soft px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-badge-emerald" aria-hidden="true" />
          <span className="t-title-sm text-ink">Latest posts</span>
        </div>
        <span className="t-caption text-muted">{posts.length}</span>
      </div>

      <ul className="divide-y divide-hairline-soft">
        {posts.map((post, index) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface-soft active:bg-surface-strong"
            >
              <span
                className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-card t-caption text-muted"
                aria-hidden="true"
              >
                {index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate t-title-sm text-ink">{post.title}</span>
                <span className="mt-1 block t-caption text-muted">
                  <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                  <span aria-hidden="true"> · </span>
                  {post.readingMinutes} min
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="border-t border-hairline-soft bg-surface-soft px-5 py-3">
        <Link href="/blog" className="t-caption text-ink hover:underline">
          Browse the archive &rarr;
        </Link>
      </div>
    </div>
  );
}
