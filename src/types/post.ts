/**
 * Shape of a post's YAML frontmatter after validation.
 * `date` is always normalised to a UTC `YYYY-MM-DD` string so that sorting,
 * formatting and `<time dateTime>` all agree regardless of server timezone.
 */
export type PostFrontmatter = {
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  cover: string | null;
  coverAlt: string;
  draft: boolean;
};

/** A post with its markdown body, as read from `content/posts/<slug>.txt`. */
export type Post = PostFrontmatter & {
  slug: string;
  body: string;
  wordCount: number;
  readingMinutes: number;
};

/** Everything except the body — what listing pages and cards need. */
export type PostSummary = Omit<Post, "body">;
