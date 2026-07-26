"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { MobileSheet } from "@/components/layout/MobileSheet";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { buttonClasses } from "@/components/ui/Button";
import { SocialLinks } from "@/components/ui/SocialLinks";
import { site } from "@/lib/site";

/**
 * `top-nav` from DESIGN.MD:416 — 64px tall, canvas background, wordmark left,
 * menu centre, theme toggle + primary CTA right. Collapses to a hamburger sheet
 * below 768px.
 */
export function TopNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Growing past the breakpoint where the sheet no longer applies closes it.
  // (Navigating away is handled by each link's onClick.)
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 rounded-md" aria-label={`${site.name} — home`}>
          <span className="size-6 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span className="font-display t-title-md tracking-[-0.02em] text-ink">
            {site.wordmark}
            <span className="text-muted">.</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-md px-3.5 py-2 t-nav-link transition-colors hover:text-ink ${
                isActive(item.href) ? "text-ink" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <SocialLinks className="hidden md:flex" />

          <ThemeToggle />

          <Link href="/blog" className={buttonClasses("primary", "hidden sm:inline-flex")}>
            Read the blog
          </Link>

          <button
            type="button"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-hairline bg-canvas text-ink transition-colors hover:bg-surface-soft active:bg-surface-strong md:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      <MobileSheet open={menuOpen} onClose={closeMenu}>
        <div className="shell flex h-16 shrink-0 items-center justify-between">
          <span className="font-display t-title-md tracking-[-0.02em] text-ink">
            {site.wordmark}
            <span className="text-muted">.</span>
          </span>

          <button
            type="button"
            autoFocus
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-hairline bg-canvas text-ink transition-colors hover:bg-surface-soft active:bg-surface-strong"
            aria-label="Close menu"
            onClick={closeMenu}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav aria-label="Main" className="shell flex flex-col gap-1 pt-6">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              onClick={closeMenu}
              className={`rounded-md px-3 py-3 t-title-md transition-colors hover:bg-surface-soft ${
                isActive(item.href) ? "bg-surface-card text-ink" : "text-body"
              }`}
            >
              {item.label}
            </Link>
          ))}

          <Link href="/blog" onClick={closeMenu} className={buttonClasses("primary", "mt-4 w-full")}>
            Read the blog
          </Link>

          <div className="mt-6 border-t border-hairline-soft pt-6">
            <SocialLinks />
          </div>
        </nav>
      </MobileSheet>
    </header>
  );
}
