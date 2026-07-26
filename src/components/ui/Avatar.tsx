/**
 * `avatar-circle` from DESIGN.MD:460 — a perfect 36px circle holding initials in
 * caption type. Avatars are the one place the badge pastels are allowed to
 * appear (DESIGN.MD:482).
 */
const TINTS = {
  none: "bg-surface-card text-ink",
  orange: "bg-badge-orange text-[#111111]",
  pink: "bg-badge-pink text-white",
  violet: "bg-badge-violet text-white",
  emerald: "bg-badge-emerald text-[#111111]",
} as const;

export type AvatarTint = keyof typeof TINTS;

export function Avatar({
  initials,
  tint = "none",
  className = "",
}: {
  initials: string;
  tint?: AvatarTint;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full t-caption font-semibold ${TINTS[tint]} ${className}`}
    >
      {initials}
    </span>
  );
}
