import { site } from "@/lib/site";

type Platform = (typeof site.social)[number]["platform"];

/**
 * Solid brand glyphs, 24x24 viewBox — unlike the rest of the system's stroke
 * icons, a recognisable GitHub/LinkedIn/Instagram mark has to be a filled
 * shape. `fill="currentColor"` keeps them monochrome (`text-ink` / `text-muted`),
 * in line with DESIGN.MD's "accent colors never appear at the action layer"
 * rule (DESIGN.MD:487) — no brand colours, same treatment as any other icon.
 */
const ICON_PATHS: Record<Platform, string> = {
  github:
    "M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.66-.22.66-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8c.85 0 1.71.11 2.51.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.16.58.67.48A10 10 0 0 0 22 12c0-5.52-4.48-10-10-10Z",
  linkedin:
    "M6.94 8.5H3.56V20h3.38V8.5ZM5.25 4a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.45 20h-3.37v-5.6c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V20h-3.37V8.5h3.24v1.57h.05c.45-.86 1.56-1.77 3.21-1.77 3.43 0 4.06 2.26 4.06 5.2V20Z",
  instagram:
    "M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.25 1.22.6 1.77 1.15.55.55.9 1.11 1.15 1.77.25.64.42 1.37.47 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.77 4.9 4.9 0 0 1-1.77 1.15c-.64.25-1.37.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.25-.66.6-1.22 1.15-1.77A4.9 4.9 0 0 1 5.45 2.53c.64-.25 1.37-.42 2.43-.47C8.94 2.01 9.28 2 12 2Zm0 1.8c-2.67 0-2.99.01-4.04.06-.87.04-1.34.18-1.65.3-.42.16-.72.36-1.03.67-.31.31-.51.61-.67 1.03-.12.31-.26.78-.3 1.65C4.26 8.51 4.25 8.83 4.25 12s.01 3.49.06 4.49c.04.87.18 1.34.3 1.65.16.42.36.72.67 1.03.31.31.61.51 1.03.67.31.12.78.26 1.65.3 1 .05 1.32.06 3.99.06s2.99-.01 3.99-.06c.87-.04 1.34-.18 1.65-.3.42-.16.72-.36 1.03-.67.31-.31.51-.61.67-1.03.12-.31.26-.78.3-1.65.05-1 .06-1.32.06-4.49s-.01-3.49-.06-4.49c-.04-.87-.18-1.34-.3-1.65a2.6 2.6 0 0 0-.67-1.03 2.6 2.6 0 0 0-1.03-.67c-.31-.12-.78-.26-1.65-.3-1-.05-1.32-.06-3.99-.06Zm0 3.5a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4Zm0 1.8a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Zm5.88-2a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0Z",
};

/**
 * `button-icon-circular` from DESIGN.MD:426, one per social link — same 36px
 * hairline circle as the theme toggle and the hamburger button, so the row
 * reads as one family of icon buttons rather than a one-off addition.
 */
export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex items-center gap-2 ${className}`}>
      {site.social.map((entry) => (
        <li key={entry.platform}>
          <a
            href={entry.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={entry.label}
            title={entry.label}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-hairline bg-canvas text-ink transition-colors hover:bg-surface-soft active:bg-surface-strong"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
              <path d={ICON_PATHS[entry.platform]} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
