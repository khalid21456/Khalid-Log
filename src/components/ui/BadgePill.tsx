import type { ReactNode } from "react";

/**
 * `badge-pill` from DESIGN.MD:458 — caption type, pill radius, 4x12 padding,
 * on the light card surface.
 */
export function BadgePill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-surface-card px-3 py-1 t-caption text-ink ${className}`}
    >
      {children}
    </span>
  );
}
