import Link from "next/link";

import { FeaturedPost } from "@/components/blog/FeaturedPost";
import { PostCard } from "@/components/blog/PostCard";
import { CtaBand } from "@/components/home/CtaBand";
import { Hero } from "@/components/home/Hero";
import { TopicGrid } from "@/components/home/TopicGrid";
import { getAllPosts, getAllTags } from "@/lib/posts";

/**
 * The home page follows the band pacing DESIGN.MD:491 requires — no two
 * consecutive bands share a surface mode:
 *   white hero -> light-gray featured -> white recent -> light-gray topics ->
 *   white CTA -> dark footer.
 */
export default function HomePage() {
  const posts = getAllPosts();
  const [featured, ...older] = posts;
  const recent = older.slice(0, 3);
  const topics = getAllTags().slice(0, 4);

  return (
    <>
      <Hero posts={posts} />

      {featured ? (
        <section className="border-y border-hairline-soft bg-surface-soft py-16 md:py-section">
          <div className="shell">
            <h2 className="t-display-md text-ink">Start here</h2>
            <p className="mt-3 t-body-md text-muted">The most recent thing I published.</p>

            <div className="mt-10">
              <FeaturedPost post={featured} />
            </div>
          </div>
        </section>
      ) : (
        <section className="shell pb-16 md:pb-section">
          <div className="rounded-lg border border-dashed border-hairline bg-canvas p-10 text-center">
            <h2 className="t-title-lg text-ink">No posts yet</h2>
            <p className="mx-auto mt-3 max-w-md t-body-md text-muted">
              Add a <code className="t-code">.txt</code> file to{" "}
              <code className="t-code">content/posts/</code>, or sign in and write one at{" "}
              <Link href="/admin/write" className="text-ink underline">
                /admin/write
              </Link>
              .
            </p>
          </div>
        </section>
      )}

      {recent.length > 0 ? (
        <section className="shell py-16 md:py-section">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="t-display-md text-ink">More writing</h2>
              <p className="mt-3 t-body-md text-muted">Notes from the last few months.</p>
            </div>

            <Link href="/blog" className="t-button text-ink hover:underline">
              All posts &rarr;
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
