import Link from "next/link";

import { site } from "@/lib/site";

/**
 * `footer` from DESIGN.MD:472 — the dark band that closes every page. 4 columns
 * at desktop, collapsing to 2 then 1. This is the only dark surface on a light
 * page, and the light-to-dark transition is part of the editorial rhythm
 * (DESIGN.MD:484).
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-footer text-on-dark-soft">


      <div className="shell">
        <div className="flex flex-col gap-2 border-t border-footer-hairline py-6 t-body-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {site.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
