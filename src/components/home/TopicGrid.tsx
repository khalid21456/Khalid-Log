import Link from "next/link";

/**
 * `feature-icon-card` from DESIGN.MD:440 — the lower-density 4-up grid: white
 * canvas card, hairline border, 24px padding, `title-sm` heading.
 *
 * Driven by the real tag counts, so the grid describes what has actually been
 * written rather than a fixed marketing list.
 */
const ICONS = ["M4 6h16M4 12h10M4 18h13", "M12 4v16M4 12h16", "M5 12l5 5L19 7", "M4 17l6-6 4 4 6-8"];

export function TopicGrid({ topics }: { topics: { tag: string; count: number }[] }) {
  if (topics.length === 0) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {topics.map((topic, index) => (
        <Link
          key={topic.tag}
          href={`/blog?tag=${encodeURIComponent(topic.tag)}`}
          className="flex flex-col rounded-lg border border-hairline bg-canvas p-6 transition-colors hover:bg-surface-soft active:bg-surface-strong"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5 text-ink"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={ICONS[index % ICONS.length]} />
          </svg>

          <h3 className="mt-5 t-title-sm text-ink">{topic.tag}</h3>

          <p className="mt-2 t-body-sm text-muted">
            {topic.count} {topic.count === 1 ? "post" : "posts"}
          </p>
        </Link>
      ))}
    </div>
  );
}
