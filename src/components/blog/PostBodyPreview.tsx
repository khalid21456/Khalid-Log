"use client";

import { useMemo } from "react";
import Markdown from "react-markdown";

import "katex/dist/katex.min.css";

import {
  createMarkdownComponents,
  type FigureSpec,
  type InlineImageSpec,
} from "@/components/blog/markdown-components";
import { resolveImageSrc } from "@/lib/image-src";
import { markdownRehypePlugins, markdownRemarkPlugins } from "@/lib/markdown/plugins";

/**
 * The editor's live preview.
 *
 * Same plugins and same component map as `PostBody`, with one deliberate
 * difference: images render as plain `<img>` rather than `next/image`. The
 * browser cannot read a file's intrinsic size, and an image the author has not
 * uploaded yet would otherwise fail the optimizer instead of simply showing as
 * missing.
 */
export function PostBodyPreview({ slug, body }: { slug: string; body: string }) {
  const components = useMemo(() => {
    const figure = ({ src, alt, caption, width, ratio }: FigureSpec) => {
      const url = resolveImageSrc(slug || "unsaved-post", src);

      return (
        <figure className="pb-figure" data-width={width}>
          <div
            className="pb-frame"
            {...(ratio ? { "data-crop": "", style: { aspectRatio: ratio } } : {})}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- preview only: the file may not exist yet, and the browser cannot measure it */}
            <img src={url} alt={alt} loading="lazy" decoding="async" />
          </div>
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>
      );
    };

    const inlineImage = ({ src, alt }: InlineImageSpec) => (
      // eslint-disable-next-line @next/next/no-img-element -- see above
      <img src={resolveImageSrc(slug || "unsaved-post", src)} alt={alt} loading="lazy" />
    );

    return createMarkdownComponents({ figure, inlineImage });
  }, [slug]);

  return (
    <div className="post-body">
      <Markdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={components}
      >
        {body}
      </Markdown>
    </div>
  );
}
