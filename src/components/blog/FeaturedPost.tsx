import Image from "next/image";
import Link from "next/link";

import { PostMeta } from "@/components/blog/PostMeta";
import { BadgePill } from "@/components/ui/BadgePill";
import { buttonClasses } from "@/components/ui/Button";
import { getImageMeta } from "@/lib/images";
import type { PostSummary } from "@/types/post";

/**
 * `product-mockup-card` from DESIGN.MD:442 — a white card with a hairline
 * border, used where the page should say "look at the real thing" rather than
 * make an abstract claim. Here that is the latest post, shown with its actual
 * cover, title and excerpt.
 */
export function FeaturedPost({ post }: { post: PostSummary }) {
  const cover = post.cover ? getImageMeta(post.slug, post.cover) : null;

  return (
    <article className="overflow-hidden rounded-lg border border-hairline bg-canvas p-6 shadow-soft">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <div className="flex flex-wrap items-center gap-2">
            <BadgePill>Latest</BadgePill>
            {post.tags.slice(0, 2).map((tag) => (
              <BadgePill key={tag}>{tag}</BadgePill>
            ))}
          </div>

          <h3 className="mt-5 t-display-sm text-ink">
            <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-body">
              {post.title}
            </Link>
          </h3>

          <p className="mt-4 t-body-md text-body">{post.excerpt}</p>

          <div className="mt-6">
            <PostMeta date={post.date} readingMinutes={post.readingMinutes} />
          </div>

          <Link href={`/blog/${post.slug}`} className={buttonClasses("primary", "mt-8")}>
            Read the post
          </Link>
        </div>

        <div className="order-1 lg:order-2">
          {cover ? (
            <div className="overflow-hidden rounded-md bg-surface-card">
              <Image
                src={cover.src}
                alt={post.coverAlt}
                width={cover.width}
                height={cover.height}
                sizes="(max-width: 1024px) 100vw, 560px"
                priority
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          ) : (
            <div
              className="flex aspect-[4/3] items-center justify-center rounded-md bg-surface-card t-caption text-muted"
              aria-hidden="true"
            >
              {post.title}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
