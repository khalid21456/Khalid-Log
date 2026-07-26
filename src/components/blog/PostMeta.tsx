import { Avatar } from "@/components/ui/Avatar";
import { formatPostDate } from "@/lib/posts";
import { site } from "@/lib/site";

/**
 * The author row on a post: `avatar-circle`, name, date and reading time
 * (DESIGN.MD:444, 460).
 */
export function PostMeta({
  date,
  readingMinutes,
  showAuthor = true,
}: {
  date: string;
  readingMinutes: number;
  showAuthor?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 t-body-sm text-muted">
      {showAuthor ? (
        <>
          <Avatar initials={site.author.initials} />
          <span className="t-title-sm text-ink">{site.author.name}</span>
          <span aria-hidden="true">·</span>
        </>
      ) : null}

      <time dateTime={date}>{formatPostDate(date)}</time>
      <span aria-hidden="true">·</span>
      <span>{readingMinutes} min read</span>
    </div>
  );
}
