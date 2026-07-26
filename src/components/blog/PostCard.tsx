import Image from "next/image";
import Link from "next/link";

import { BadgePill } from "@/components/ui/BadgePill";
import { getImageMeta } from "@/lib/images";
import { formatPostDate } from "@/lib/posts";
import type { PostSummary } from "@/types/post";

/**
 * `feature-card` from DESIGN.MD:438 — light-gray card surface, 12px radius,
 * 32px internal padding, title in `title-md`, body in `body-md`.
 *
 * The whole card is a single link so the tap target is the card, not just the
 * headline. Tags are rendered as plain badges rather than nested links to keep
 * it that way.
 */
export function PostCard({ post }: { post: PostSummary }) {
  const cover = post.cover ? getImageMeta(post.slug, post.cover) : null;

  return (
    <article className="h-full">
      <Link
        href={`/blog/${post.slug}`}
        className="flex h-full flex-col overflow-hidden rounded-lg bg-surface-card p-6 transition-colors hover:bg-surface-strong active:bg-surface-strong sm:p-8"
      >
        {cover ? (
          <div className="mb-6 overflow-hidden rounded-md bg-surface-strong">
            <Image
              src={cover.src}
              alt={post.coverAlt}
              width={cover.width}
              height={cover.height}
              sizes="(max-width: 768px) 100vw, 380px"
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        ) : null}

        {post.tags.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.tags.slice(0, 2).map((tag) => (
              <BadgePill key={tag} className="bg-canvas">
                {tag}
              </BadgePill>
            ))}
            {post.draft ? <BadgePill className="bg-warning text-[#111111]">draft</BadgePill> : null}
          </div>
        ) : null}

        <h3 className="t-title-md text-ink">{post.title}</h3>

        <p className="mt-3 line-clamp-3 t-body-md text-body">{post.excerpt}</p>

        <div className="mt-6 flex flex-wrap items-center gap-2 t-caption text-muted">
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
      </Link>
    </article>
  );
}
