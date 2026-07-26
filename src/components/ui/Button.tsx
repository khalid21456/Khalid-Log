import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

/**
 * Button styling, per DESIGN.MD:422-428 — 40px tall, 8px radius, Inter 600
 * label. Hover and pressed states both shift to the same tone, so pressing
 * while hovering doesn't produce a visible double-jump; `disabled:pointer-events-none`
 * keeps a disabled button from ever matching `:hover` in the first place.
 *
 * Exported as a class helper as well as a component because Cal.com renders most
 * CTAs as links (DESIGN.MD:536), so `<Link className={buttonClasses()}>` is the
 * common case.
 */
const BASE =
  "inline-flex h-10 shrink-0 cursor-pointer select-none items-center justify-center gap-2 rounded-md px-5 t-button transition-colors disabled:cursor-not-allowed disabled:pointer-events-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-active active:bg-primary-active disabled:bg-primary-disabled disabled:text-muted",
  secondary:
    "border border-hairline bg-canvas text-ink hover:bg-surface-soft active:bg-surface-strong disabled:text-muted",
  ghost: "text-ink hover:bg-surface-soft active:bg-surface-strong disabled:text-muted",
};

export function buttonClasses(variant: ButtonVariant = "primary", extra = ""): string {
  return `${BASE} ${VARIANTS[variant]}${extra ? ` ${extra}` : ""}`;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
