export type PostFrontmatter = {
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  cover: string | null;
  coverAlt: string;
  draft: boolean;
};

export type Post = PostFrontmatter & {
  slug: string;
  body: string;
  wordCount: number;
  readingMinutes: number;
};

export type PostSummary = Omit<Post, "body">;