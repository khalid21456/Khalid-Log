"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

/**
 * `button-icon-circular` from DESIGN.MD:426 — 36px, canvas fill, hairline
 * border. Both icons are always rendered and CSS shows the right one based on
 * the `.dark` class, so the markup is identical on server and client.
 */
export function ThemeToggle() {
  const { toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-hairline bg-canvas text-ink transition-colors hover:bg-surface-soft active:bg-surface-strong"
    >
      <svg
        className="theme-icon-light size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.25" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
      </svg>

      <svg
        className="theme-icon-dark size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
