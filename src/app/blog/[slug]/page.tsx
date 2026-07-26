import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostBody } from "@/components/blog/PostBody";
import { PostCard } from "@/components/blog/PostCard";
import { PostMeta } from "@/components/blog/PostMeta";
import { BadgePill } from "@/components/ui/BadgePill";
import { getImageMeta } from "@/lib/images";
import { getAdjacentPosts, getAllSlugs, getPostBySlug, getRelatedPosts } from "@/lib/posts";

type PageProps = { params: Promise<{ slug: string }> };

/** One static page per published post. */
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) return { title: "Post not found" };

  const cover = post.cover ? getImageMeta(slug, post.cover) : null;
  const url = `/blog/${slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      tags: [...post.tags],
      url,
      images: cover
        ? [{ url: cover.src, width: cover.width, height: cover.height, alt: post.coverAlt }]
        : undefined,
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt,
      images: cover ? [cover.src] : undefined,
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

  const cover = post.cover ? getImageMeta(slug, post.cover) : null;
  const { newer, older } = getAdjacentPosts(slug);
  const related = getRelatedPosts(slug);

  return (
    <article>
      <header className="shell pt-12 pb-10 md:pt-20">
        {/* 44rem matches --pb-text, so the header sits on the same measure as
            the body's reading column. */}
        <div className="mx-auto max-w-[44rem]">
          {post.draft ? (
            <p className="mb-6 rounded-md border border-warning px-4 py-2 t-caption text-ink">
              Draft — visible while developing, excluded from production builds.
            </p>
          ) : null}

          <Link href="/blog" className="t-caption text-muted hover:underline">
            &larr; All posts
          </Link>

          {post.tags.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="transition-opacity hover:opacity-70"
                >
                  <BadgePill>{tag}</BadgePill>
                </Link>
              ))}
            </div>
          ) : null}

          <h1 className="mt-6 t-display-lg text-ink">{post.title}</h1>

          <p className="mt-6 t-body-md text-body md:text-lg">{post.excerpt}</p>

          <div className="mt-8">
            <PostMeta date={post.date} readingMinutes={post.readingMinutes} />
          </div>
        </div>
      </header>

      {cover ? (
        <div className="shell">
          <div className="mx-auto max-w-[59rem] overflow-hidden rounded-xl bg-surface-card">
            <Image
              src={cover.src}
              alt={post.coverAlt}
              width={cover.width}
              height={cover.height}
              sizes="(max-width: 1024px) 100vw, 944px"
              priority
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
          {post.coverAlt ? (
            <p className="mx-auto mt-3 max-w-[59rem] t-caption text-muted">{post.coverAlt}</p>
          ) : null}
        </div>
      ) : null}

      <div className="shell pt-12 pb-16 md:pt-16 md:pb-24">
        <PostBody slug={post.slug} body={post.body} />
      </div>

      {newer || older ? (
        <nav aria-label="More posts" className="shell pb-16 md:pb-24">
          <div className="mx-auto grid max-w-[44rem] gap-4 border-t border-hairline pt-8 sm:grid-cols-2">
            {older ? (
              <Link
                href={`/blog/${older.slug}`}
                className="rounded-lg border border-hairline bg-canvas p-5 transition-colors hover:bg-surface-soft active:bg-surface-strong"
              >
                <span className="t-caption text-muted">Previous</span>
                <span className="mt-2 block t-title-sm text-ink">{older.title}</span>
              </Link>
            ) : (
              <span />
            )}

            {newer ? (
              <Link
                href={`/blog/${newer.slug}`}
                className="rounded-lg border border-hairline bg-canvas p-5 text-right transition-colors hover:bg-surface-soft active:bg-surface-strong sm:col-start-2"
              >
                <span className="t-caption text-muted">Next</span>
                <span className="mt-2 block t-title-sm text-ink">{newer.title}</span>
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}

      {related.length > 0 ? (
        <section className="border-t border-hairline-soft bg-surface-soft py-16 md:py-section">
          <div className="shell">
            <h2 className="t-display-md text-ink">Related reading</h2>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((entry) => (
                <PostCard key={entry.slug} post={entry} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
