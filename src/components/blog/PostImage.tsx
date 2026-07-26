import Image from "next/image";
import type { ReactNode } from "react";

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
  ratio?: string | null;
  /** Render just the image — used for images sitting inline among text. */
  bare?: boolean;
  priority?: boolean;
};

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
        <div className="pb-frame">{remote}</div>
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
      sizes={SIZES[width]}
      priority={priority}
    />
  );

  if (bare) return image;

  return (
    <figure className="pb-figure" data-width={width}>
      <div
        className="pb-frame"
        {...(ratio ? { "data-crop": "", style: { aspectRatio: ratio } } : {})}
      >
        {image}
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
