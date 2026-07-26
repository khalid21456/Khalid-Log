import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="shell py-24 md:py-section">
      <div className="mx-auto max-w-xl text-center">
        <p className="t-caption text-muted">404</p>
        <h1 className="mt-4 t-display-lg text-ink">This page does not exist</h1>
        <p className="mt-6 t-body-md text-body">
          The link may be out of date, or the post may have been renamed.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/blog" className={buttonClasses("primary")}>
            Browse all posts
          </Link>
          <Link href="/" className={buttonClasses("secondary")}>
            Go home
          </Link>
        </div>
      </div>
    </section>
  );
}
