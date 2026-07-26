import type { Metadata } from "next";
import Link from "next/link";

import { PostCard } from "@/components/blog/PostCard";
import { TagFilter } from "@/components/blog/TagFilter";
import { getAllPosts, getAllTags } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description: "Every post, newest first — filterable by tag.",
};

/**
 * The archive.
 *
 * The active tag is read from the URL rather than component state, so a filtered
 * view is shareable and needs no client JavaScript. Reading `searchParams` makes
 * this page render per request; the individual post pages remain statically
 * generated.
 */
export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>;
}) {
  const { tag } = await searchParams;

  const requested = (Array.isArray(tag) ? tag[0] : tag)?.trim().toLowerCase() ?? "";
  const tags = getAllTags();

  // Only honour a tag that actually exists, so `?tag=nonsense` shows everything
  // rather than an empty page with a filter that cannot be cleared.
  const activeTag = tags.some((entry) => entry.tag === requested) ? requested : null;

  const posts = getAllPosts();
  const visible = activeTag ? posts.filter((post) => post.tags.includes(activeTag)) : posts;

  return (
    <>
      <section className="shell py-16 md:py-24">
        <h1 className="t-display-lg text-ink">Writing</h1>
        <p className="mt-4 max-w-2xl t-body-md text-body">
          {posts.length} {posts.length === 1 ? "post" : "posts"}, newest first.
          {activeTag ? (
            <>
              {" "}
              Showing <span className="text-ink">{activeTag}</span>.
            </>
          ) : null}
        </p>

        <div className="mt-8">
          <TagFilter tags={tags} activeTag={activeTag} />
        </div>
      </section>

      <section className="border-t border-hairline-soft bg-surface-soft py-16 md:py-section">
        <div className="shell">
          {visible.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-hairline bg-canvas p-10 text-center">
              <h2 className="t-title-lg text-ink">Nothing here yet</h2>
              <p className="mx-auto mt-3 max-w-md t-body-md text-muted">
                {posts.length === 0
                  ? "Add a .txt file to content/posts/ to publish the first post."
                  : `No posts are tagged "${activeTag}".`}
              </p>

              {posts.length > 0 ? (
                <Link href="/blog" className="mt-6 inline-block t-button text-ink underline">
                  Clear the filter
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
