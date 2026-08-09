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
    <nav aria-label="Filter posts by tag" className="flex min-w-0">
      {/*
       * `rounded-full` (DESIGN.MD's nav-pill-group spec) assumes 2-3 segments
       * that always fit one line. This list is unbounded — real posts already
       * produce a dozen tags — so on a narrow phone it wraps to several rows,
       * and a 9999px radius on a box that's now taller than it is wide renders
       * as a distorted stadium/blob rather than rows of pills. `rounded-2xl`
       * looks correct regardless of row count. Below `sm:` the row also
       * scrolls horizontally instead of wrapping, so the filter stays compact
       * and the post grid isn't pushed halfway down the screen by five rows
       * of chips; `shrink-0` on each pill keeps them from being squashed
       * while `overflow-x-auto` is active.
       */}
      <div className="flex min-w-0 gap-1 overflow-x-auto rounded-2xl bg-surface-soft p-1.5 sm:flex-wrap sm:overflow-visible">
        {segments.map((segment) => {
          const isActive = segment.tag === activeTag;

          return (
            <Link
              key={segment.tag ?? "all"}
              href={segment.tag ? `/blog?tag=${encodeURIComponent(segment.tag)}` : "/blog"}
              aria-current={isActive ? "page" : undefined}
              className={`shrink-0 rounded-md px-3.5 py-2 t-nav-link transition-colors hover:text-ink ${
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
