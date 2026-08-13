import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Options } from "react-markdown";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";

import { IMAGE_WIDTHS } from "@/lib/image-src";

/**
 * The subset of hast fields remark-rehype reads off an mdast node.
 * Declared locally so we don't depend on the `mdast-util-to-hast` type
 * augmentation being loaded.
 */
type HastData = {
  hName?: string;
  hProperties?: Record<string, string>;
};

type DirectiveNode = {
  type: string;
  name: string;
  attributes?: Record<string, string | null | undefined> | null;
  data?: HastData;
};

const DIRECTIVE_TYPES = new Set(["containerDirective", "leafDirective", "textDirective"]);

/**
 * Bridge our custom media syntax into elements react-markdown can render.
 *
 * remark-directive parses `::image{…}` / `:::gallery{…}` into directive nodes
 * that carry no HTML meaning, so remark-rehype would drop them. Setting
 * `data.hName` + `data.hProperties` is the documented way to give them one —
 * here they become a `<figure>` / `<div>` tagged with `data-*` attributes, which
 * the component map in `components/blog/markdown-components.tsx` then turns into
 * real components.
 *
 * It also promotes a paragraph that contains nothing but an image into the same
 * `<figure>`, because `<figure>` nested inside `<p>` is invalid HTML and the
 * browser would unnest it.
 */
export function remarkPostMedia() {
  return (tree: Root) => {
    // 1. `![alt](photo.png "Optional caption")` alone in a paragraph -> figure.
    visit(tree, "paragraph", (node) => {
      const meaningful = node.children.filter(
        (child) => !(child.type === "text" && child.value.trim() === ""),
      );
      if (meaningful.length !== 1) return;

      const only = meaningful[0];
      if (only.type !== "image") return;

      const data = (node.data ?? (node.data = {})) as HastData;
      data.hName = "figure";
      data.hProperties = {
        "data-image": only.url,
        "data-alt": only.alt ?? "",
        "data-width": "inline",
        ...(only.title ? { "data-caption": only.title } : {}),
      };
      // The caption now comes from the title, so drop the original child.
      node.children = [];
    });

    // 2. `::image{…}`, `:::image{…}`, `:::gallery{…}`.
    visit(tree, (node) => {
      if (!DIRECTIVE_TYPES.has(node.type)) return;

      const directive = node as unknown as DirectiveNode;
      const attributes = directive.attributes ?? {};
      const data = (directive.data ?? (directive.data = {})) as HastData;

      if (directive.name === "image") {
        // `width` picks a layout column ("inline"/"wide"/"full"). Anything
        // else — "400", "400px", "50%" — is an explicit rendered size instead,
        // so `width="400px"` (the natural thing to try) works without a
        // separate attribute. An explicit `size` attribute wins if both are
        // given (e.g. `width="wide" size="500px"`: a wide column, smaller image).
        const rawWidth = (attributes.width ?? "").trim();
        const isLayoutKeyword = (IMAGE_WIDTHS as readonly string[]).includes(rawWidth);

        data.hName = "figure";
        data.hProperties = {
          "data-image": attributes.src ?? "",
          "data-alt": attributes.alt ?? "",
          "data-width": isLayoutKeyword ? rawWidth : "inline",
          ...(!isLayoutKeyword && rawWidth ? { "data-size": rawWidth } : {}),
          ...(attributes.size ? { "data-size": attributes.size } : {}),
          ...(attributes.caption ? { "data-caption": attributes.caption } : {}),
          ...(attributes.ratio ? { "data-ratio": attributes.ratio } : {}),
        };
        return;
      }

      if (directive.name === "gallery") {
        const columns = Number(attributes.cols ?? 2);
        const safeColumns =
          Number.isFinite(columns) && columns >= 1 && columns <= 4 ? Math.trunc(columns) : 2;

        data.hName = "div";
        data.hProperties = { "data-gallery": String(safeColumns) };
        return;
      }

      // Anything unrecognised renders as a visible warning rather than
      // silently disappearing from the post.
      data.hName = "div";
      data.hProperties = { "data-unknown-directive": directive.name };
    });

    // 3. A directive that failed to *parse* never becomes a directive node at
    // all — it stays literal text and would quietly appear in the post as
    // `::image{...}`. The usual cause is an escaped double quote inside an
    // attribute value, which the directive syntax does not support. Catch the
    // leftovers and show the author what went wrong.
    visit(tree, "paragraph", (node) => {
      const first = node.children[0];
      if (!first || first.type !== "text") return;

      const match = /^:{2,3}(image|gallery)\{/.exec(first.value);
      if (!match) return;

      const data = (node.data ?? (node.data = {})) as HastData;
      data.hName = "div";
      data.hProperties = { "data-malformed-directive": match[1] };
    });
  };
}

/**
 * Zero-width space/joiner and BOM characters, stripped before markdown ever
 * sees the body.
 *
 * These are invisible in every editor and terminal, but a code fence line has
 * to start with the backtick sequence itself — a leading zero-width space
 * means the line no longer looks like a fence to the parser, so the whole
 * block falls back to plain text (literal backticks, no highlighting). This
 * is a known artifact of some AI writing tools, which insert a zero-width
 * space before a nested ``` to stop it from being read as the *outer* fence
 * closing early. Stripped here rather than only in the saved file, so a post
 * added by hand (bypassing the editor's save path) still renders correctly.
 */
// Built from numeric code points rather than \u escapes in a literal or
// regex: those have proven unreliable to author directly in this file (they
// keep round-tripping back to either the raw character or a literal
// backslash instead of a real escape), so this sidesteps the ambiguity
// entirely — every character here is constructed, not typed.
const ZERO_WIDTH_CODE_POINTS = [0x200b, 0x200c, 0x200d, 0xfeff];
const ZERO_WIDTH_CHARACTERS = new RegExp(
  `[${ZERO_WIDTH_CODE_POINTS.map((codePoint) => String.fromCharCode(codePoint)).join("")}]`,
  "g",
);

export function sanitizeMarkdown(markdown: string): string {
  return markdown.replace(ZERO_WIDTH_CHARACTERS, "");
}

/**
 * remark-gfm       — tables, strikethrough, task lists, autolinks
 * remark-math      — LaTeX: `$inline$` and `$$display$$`
 * remark-directive — the `::image` / `:::gallery` syntax
 * remarkPostMedia  — maps those onto renderable elements (must run last)
 */
export const markdownRemarkPlugins: NonNullable<Options["remarkPlugins"]> = [
  remarkGfm,
  remarkMath,
  remarkDirective,
  remarkPostMedia,
];

/**
 * rehype-slug      — stable heading ids for deep links
 * rehype-katex     — typesets the math remark-math found, server-side. Output is
 *   HTML plus MathML, so formulas are selectable, screen-reader friendly and
 *   need no client-side JavaScript. Invalid LaTeX renders in the error colour
 *   instead of failing the build, and `strict: "ignore"` stops unicode in a
 *   formula from becoming a console warning.
 * rehype-highlight — syntax highlighting. `detect: false` keeps it to blocks
 *   that declare a language; `ignoreMissing` means an unknown language renders
 *   as plain code instead of throwing. Highlight.js's default "common" set
 *   already covers python, javascript and typescript (plus the js/ts/py/tsx
 *   aliases); the colours live in globals.css as `.hljs-*` rules.
 */
export const markdownRehypePlugins: NonNullable<Options["rehypePlugins"]> = [
  rehypeSlug,
  [rehypeKatex, { errorColor: "#ef4444", strict: "ignore" }],
  [rehypeHighlight, { detect: false, ignoreMissing: true }],
];
