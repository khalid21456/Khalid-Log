import { Children, type CSSProperties, type ReactNode } from "react";
import type { Components } from "react-markdown";

import { CodeBlock } from "@/components/blog/CodeBlock";
import { normaliseImageWidth, normaliseRatio, type ImageWidth } from "@/lib/image-src";

export type FigureSpec = {
  /** As written by the author — a bare filename, absolute path or URL. */
  src: string;
  alt: string;
  caption: ReactNode | null;
  width: ImageWidth;
  ratio: string | null;
};

export type InlineImageSpec = {
  src: string;
  alt: string;
};

/**
 * How to draw an image. The server renderer uses `next/image` with dimensions
 * read from disk; the editor preview uses a plain `<img>` because the browser
 * cannot stat a file and an image that has not been uploaded yet would make the
 * optimizer throw.
 */
export type MarkdownRenderers = {
  figure: (spec: FigureSpec) => ReactNode;
  inlineImage: (spec: InlineImageSpec) => ReactNode;
};

function dataAttribute(props: object, key: string): string | null {
  const value = (props as Record<string, unknown>)[key];
  return typeof value === "string" && value !== "" ? value : null;
}

/** Children that are not just the whitespace remark leaves between blocks. */
function meaningfulChildren(children: ReactNode): ReactNode | null {
  const list = Children.toArray(children).filter(
    (child) => !(typeof child === "string" && child.trim() === ""),
  );
  return list.length > 0 ? list : null;
}

/**
 * The element -> component map handed to react-markdown.
 *
 * This module is deliberately free of server-only imports so the exact same
 * mapping can run in a server component and in the client-side editor preview.
 */
export function createMarkdownComponents(renderers: MarkdownRenderers): Components {
  return {
    // `::image{…}` and image-only paragraphs both arrive here as a <figure>
    // carrying data-* attributes (see lib/markdown/plugins.ts).
    figure({ node: _node, children, ...rest }) {
      const src = dataAttribute(rest, "data-image");
      if (!src) return <figure {...rest}>{children}</figure>;

      const captionText = dataAttribute(rest, "data-caption");

      return renderers.figure({
        src,
        alt: dataAttribute(rest, "data-alt") ?? "",
        // A `:::image{…}` container uses its body as the caption; the leaf form
        // and markdown titles supply one via the attribute.
        caption: captionText ?? meaningfulChildren(children),
        width: normaliseImageWidth(dataAttribute(rest, "data-width")),
        ratio: normaliseRatio(dataAttribute(rest, "data-ratio")),
      });
    },

    // An image sitting inline among text — no figure, no caption.
    img({ node: _node, src, alt }) {
      if (typeof src !== "string" || src === "") return null;
      return renderers.inlineImage({ src, alt: typeof alt === "string" ? alt : "" });
    },

    div({ node: _node, children, ...rest }) {
      const unknownDirective = dataAttribute(rest, "data-unknown-directive");
      if (unknownDirective) {
        return (
          <div className="pb-unknown-directive">
            Unknown directive <strong>:::{unknownDirective}</strong> — this post uses a block the site
            does not know how to render. Supported: <code>::image{"{…}"}</code> and{" "}
            <code>:::gallery{"{…}"}</code>.
          </div>
        );
      }

      const malformed = dataAttribute(rest, "data-malformed-directive");
      if (malformed) {
        return (
          <div className="pb-unknown-directive">
            This <strong>{malformed}</strong> block could not be parsed, so it would have shown as raw
            text. Attribute values cannot contain escaped double quotes — put the caption in the{" "}
            <code>:::{malformed}{"{…}"}</code> container form instead, and keep{" "}
            <code>{'"'}</code> out of the attributes.
          </div>
        );
      }

      const gallery = dataAttribute(rest, "data-gallery");
      if (gallery) {
        return (
          <div
            {...rest}
            className="pb-gallery"
            style={{ "--pb-cols": gallery } as CSSProperties}
          >
            {children}
          </div>
        );
      }

      return <div {...rest}>{children}</div>;
    },

    // Wide tables scroll inside their own container instead of stretching the page.
    table({ node: _node, children, ...rest }) {
      return (
        <div className="pb-table-wrap">
          <table {...rest}>{children}</table>
        </div>
      );
    },

    pre({ node, children }) {
      const code = node?.children?.find(
        (child) => child.type === "element" && child.tagName === "code",
      );

      // rehype-highlight tags the <code> element with `language-<name>`.
      const classes = code && code.type === "element" ? (code.properties?.className ?? []) : [];

      const language = classes
        .find((name) => name.startsWith("language-"))
        ?.slice("language-".length);

      return <CodeBlock language={language ?? null}>{children}</CodeBlock>;
    },

    a({ node: _node, href, children, ...rest }) {
      const external = typeof href === "string" && /^https?:\/\//i.test(href);

      return (
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          {...rest}
        >
          {children}
        </a>
      );
    },
  };
}
