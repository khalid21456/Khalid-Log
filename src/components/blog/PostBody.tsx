import Markdown from "react-markdown";

// KaTeX's stylesheet. Imported here rather than in the root layout so it only
// ships with pages that actually render a post body.
import "katex/dist/katex.min.css";

import { createMarkdownComponents } from "@/components/blog/markdown-components";
import { PostImage } from "@/components/blog/PostImage";
import { markdownRehypePlugins, markdownRemarkPlugins } from "@/lib/markdown/plugins";

/**
 * Renders a post's markdown body — server-side, so images can be measured on
 * disk and handed to `next/image`, and so highlight.js never reaches the client
 * bundle for a published page.
 *
 * The editor preview (`PostBodyPreview`) shares the plugin list and the
 * component map with this file, which is what keeps the two views identical.
 */
export function PostBody({ slug, body }: { slug: string; body: string }) {
  const components = createMarkdownComponents({
    figure: (spec) => <PostImage slug={slug} {...spec} />,
    inlineImage: ({ src, alt }) => <PostImage slug={slug} src={src} alt={alt} bare />,
  });

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
