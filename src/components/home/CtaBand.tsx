import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";

/**
 * `cta-band-light` from DESIGN.MD:470 — the pre-footer card: light card surface,
 * 12px radius, 48px padding, `display-sm` heading with a centred primary CTA.
 */
export function CtaBand({
  heading,
  subline,
  href,
  action,
}: {
  heading: string;
  subline: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-lg bg-surface-card px-6 py-12 text-center sm:px-12">
      <h2 className="t-display-sm text-ink">{heading}</h2>
      <p className="mx-auto mt-4 max-w-xl t-body-md text-body">{subline}</p>

      <Link href={href} className={buttonClasses("primary", "mt-8")}>
        {action}
      </Link>
    </div>
  );
}
