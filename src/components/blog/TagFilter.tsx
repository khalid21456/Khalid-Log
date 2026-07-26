import Link from "next/link";

/**
 * `nav-pill-group` from DESIGN.MD:418 — a pill-radius wrapper holding
 * `category-tab` segments, with the active one rendered as a white pill inside.
 * DESIGN.MD calls the pill-in-pill treatment one of the system's signature
 * components.
 *
 * Built from plain links rather than a client component: the tag lives in the
 * URL, so filtered views are shareable and the filter needs no JavaScript.
 */
export function TagFilter({
  tags,
  activeTag,
}: {
  tags: { tag: string; count: number }[];
  activeTag: string | null;
}) {
  if (tags.length === 0) return null;

  const segments = [{ tag: null as string | null, label: "All", count: null as number | null }].concat(
    tags.map((entry) => ({ tag: entry.tag, label: entry.tag, count: entry.count })),
  );

  return (
    <nav aria-label="Filter posts by tag" className="flex">
      <div className="flex flex-wrap gap-1 rounded-full bg-surface-soft p-1.5">
        {segments.map((segment) => {
          const isActive = segment.tag === activeTag;

          return (
            <Link
              key={segment.tag ?? "all"}
              href={segment.tag ? `/blog?tag=${encodeURIComponent(segment.tag)}` : "/blog"}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-md px-3.5 py-2 t-nav-link transition-colors hover:text-ink ${
                isActive ? "bg-canvas text-ink shadow-soft" : "text-muted"
              }`}
            >
              {segment.label}
              {segment.count !== null ? (
                <span className="ml-1.5 text-muted-soft">{segment.count}</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
