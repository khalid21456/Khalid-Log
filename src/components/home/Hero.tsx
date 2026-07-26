import Link from "next/link";

import { ReadingWidget } from "@/components/home/ReadingWidget";
import { buttonClasses } from "@/components/ui/Button";
import { site } from "@/lib/site";
import type { PostSummary } from "@/types/post";

/**
 * `hero-band` from DESIGN.MD:434 — white canvas, 96px vertical padding, a 7/5
 * split with the headline and button row on the left and the app-mockup card on
 * the right, collapsing to a single column on mobile (DESIGN.MD:513).
 */
export function Hero({ posts }: { posts: PostSummary[] }) {
  return (
    <section className="shell grid items-center gap-12 py-16 md:py-section lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
        <h1 className="t-display-xl text-ink">{site.tagline}</h1>

        <p className="mt-6 max-w-xl t-body-md text-body md:text-lg">{site.description}</p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/blog" className={buttonClasses("primary")}>
            Read the blog
          </Link>

          {posts.length > 0 ? (
            <Link href={`/blog/${posts[0].slug}`} className={buttonClasses("secondary")}>
              Latest post
            </Link>
          ) : null}
        </div>
      </div>

      {posts.length > 0 ? (
        <div className="lg:col-span-5">
          <ReadingWidget posts={posts.slice(0, 4)} />
        </div>
      ) : null}
    </section>
  );
}
