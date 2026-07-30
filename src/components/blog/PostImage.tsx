import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { getImageMeta } from "@/lib/images";
import { isExternalSrc, resolveImageSrc, type ImageWidth } from "@/lib/image-src";

/**
 * `sizes` per layout option, matching the reading-column widths declared in
 * globals.css (`--pb-text` 704px, wide ~944px, full = container width). Getting
 * these right is what stops the optimizer from shipping a 1600px file into a
 * 704px column.
 */
const SIZES: Record<ImageWidth, string> = {
  inline: "(max-width: 768px) 100vw, 704px",
  wide: "(max-width: 1024px) 100vw, 944px",
  full: "(max-width: 1200px) 100vw, 1152px",
};

type Props = {
  slug: string;
  src: string;
  alt: string;
  caption?: ReactNode | null;
  width?: ImageWidth;
  /** An explicit rendered size ("400px", "50%"). Centers instead of stretching. */
  size?: string | null;
  ratio?: string | null;
  /** Render just the image — used for images sitting inline among text. */
  bare?: boolean;
  priority?: boolean;
};

/** Inline style for the frame: an explicit size, a crop ratio, or both. */
function frameStyle(size: string | null, ratio: string | null): CSSProperties | undefined {
  if (!size && !ratio) return undefined;

  return {
    ...(ratio ? { aspectRatio: ratio } : {}),
    ...(size ? { width: size, maxWidth: "100%", marginInline: "auto" } : {}),
  };
}

/**
 * A post-body image, rendered server-side.
 *
 * Dimensions are read from the file on disk so `next/image` reserves the right
 * space before the bytes arrive. A local file that does not exist renders a
 * visible warning rather than a broken image, because a missing image in a post
 * is an authoring mistake worth surfacing.
 */
export function PostImage({
  slug,
  src,
  alt,
  caption = null,
  width = "inline",
  size = null,
  ratio = null,
  bare = false,
  priority = false,
}: Props) {
  const url = resolveImageSrc(slug, src);
  if (url === "") return null;

  // Remote images: no dimensions available and not run through the optimizer.
  if (isExternalSrc(url)) {
    const remote = (
      // eslint-disable-next-line @next/next/no-img-element -- remote dimensions are unknown, so next/image cannot be used without configuring the host
      <img src={url} alt={alt} loading="lazy" decoding="async" />
    );

    if (bare) return remote;

    return (
      <figure className="pb-figure" data-width={width}>
        <div className="pb-frame" style={frameStyle(size, null)}>
          {remote}
        </div>
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  const meta = getImageMeta(slug, src);

  if (!meta) {
    return (
      <div className="pb-unknown-directive" data-width={width}>
        Missing image: <strong>{src}</strong> — expected a file at{" "}
        <code>public{url}</code>.
      </div>
    );
  }

  const image = (
    <Image
      src={meta.src}
      alt={alt}
      width={meta.width}
      height={meta.height}
      // A pixel size is an exact display width, so request exactly that
      // rather than the whole column — otherwise a 400px image would still
      // pull down a file sized for a 944px slot.
      sizes={size?.endsWith("px") ? size : SIZES[width]}
      priority={priority}
    />
  );

  if (bare) return image;

  return (
    <figure className="pb-figure" data-width={width}>
      <div className="pb-frame" data-crop={ratio ? "" : undefined} style={frameStyle(size, ratio)}>
        {image}
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
