"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { inputClasses } from "@/components/admin/LoginForm";
import { PostBodyPreview } from "@/components/blog/PostBodyPreview";
import { Avatar } from "@/components/ui/Avatar";
import { BadgePill } from "@/components/ui/BadgePill";
import { Button } from "@/components/ui/Button";
import { formatBytes, MAX_IMAGE_BYTES } from "@/lib/image-src";
import { readingStats } from "@/lib/reading-time";
import { site } from "@/lib/site";
import { slugify } from "@/lib/slug";

type PostListEntry = { slug: string; title: string; date: string; draft: boolean };
type ImageEntry = { name: string; src: string; width: number; height: number; bytes: number };

type Form = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  cover: string;
  coverAlt: string;
  draft: boolean;
  body: string;
};

const EMPTY_FORM: Form = {
  slug: "",
  title: "",
  date: "",
  excerpt: "",
  tags: [],
  cover: "",
  coverAlt: "",
  draft: true,
  body: "",
};

const STARTER_BODY = `Open with a paragraph that says what this post is about.

## A section heading

Ordinary **markdown** works: lists, links, tables, quotes.

\`\`\`python
def greet(name: str) -> str:
    return f"Hello, {name}"
\`\`\`

Maths is LaTeX — inline as $E = mc^2$, or as its own block:

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$

Place an image by filename — it resolves to this post's own folder:

::image{src="hero.png" alt="Describe the image" width="wide" caption="An optional caption"}
`;

const sectionLabelClasses = "t-caption font-semibold uppercase tracking-wide text-muted-soft";
const fieldLabelClasses = "t-caption font-medium text-body";
const fieldClasses = "flex flex-col gap-1.5";

/** `YYYY-MM-DD` -> "Jul 28, 2026", for the read-only date shown by the title. */
function formatDateLabel(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || "No date";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    parsed,
  );
}

/**
 * `today` is computed on the server and passed in, rather than read from
 * `new Date()` here: that keeps the first client render identical to the
 * server's, so the date field needs no post-mount correction.
 */
export function Editor({ email, today }: { email: string; today: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSlug = searchParams.get("slug");

  const [form, setForm] = useState<Form>({ ...EMPTY_FORM, date: today });
  /** True once the post exists on disk: saving then updates instead of creating. */
  const [existing, setExisting] = useState(false);
  /** While false, the slug tracks the title. Any manual edit stops that. */
  const [slugFollowsTitle, setSlugFollowsTitle] = useState(true);
  /** True when `form` matches what's on disk (or there's nothing to lose yet). */
  const [saved, setSaved] = useState(true);

  const [posts, setPosts] = useState<PostListEntry[]>([]);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [tagDraft, setTagDraft] = useState("");

  const [view, setView] = useState<"split" | "write" | "preview">("split");
  const [busy, setBusy] = useState<"idle" | "saving" | "uploading" | "loading">("idle");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = useCallback(<K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }, []);

  const refreshPosts = useCallback(async () => {
    const response = await fetch("/api/admin/posts", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { posts: PostListEntry[] };
    setPosts(data.posts);
  }, []);

  const refreshImages = useCallback(async (slug: string) => {
    if (!slug) {
      setImages([]);
      return;
    }

    const response = await fetch(`/api/admin/images?slug=${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as { images: ImageEntry[] };
    setImages(data.images);
  }, []);

  useEffect(() => {
    // Wrapped rather than called directly: the state update belongs to the
    // fetch's completion, not to the effect body.
    (async () => {
      await refreshPosts();
    })();
  }, [refreshPosts]);

  /** Load the post named in `?slug=`, so the list can link straight into it. */
  useEffect(() => {
    if (!requestedSlug) return;

    let cancelled = false;

    (async () => {
      setBusy("loading");
      try {
        const response = await fetch(`/api/admin/posts?slug=${encodeURIComponent(requestedSlug)}`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;

        const { post } = (await response.json()) as { post: Form };
        if (cancelled) return;

        setForm(post);
        setExisting(true);
        setSlugFollowsTitle(false);
        setSaved(true);
        setMessage(null);
        void refreshImages(post.slug);
      } finally {
        if (!cancelled) setBusy("idle");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestedSlug, refreshImages]);

  function onTitleChange(title: string) {
    setForm((current) => ({
      ...current,
      title,
      slug: slugFollowsTitle && !existing ? slugify(title) : current.slug,
    }));
    setSaved(false);
  }

  function addTag(raw: string) {
    const value = raw.trim().toLowerCase();
    setTagDraft("");
    if (!value) return;

    setForm((current) => (current.tags.includes(value) ? current : { ...current, tags: [...current.tags, value] }));
    setSaved(false);
  }

  function removeTag(tag: string) {
    setForm((current) => ({ ...current, tags: current.tags.filter((t) => t !== tag) }));
    setSaved(false);
  }

  function onTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagDraft);
    } else if (event.key === "Backspace" && tagDraft === "" && form.tags.length > 0) {
      removeTag(form.tags[form.tags.length - 1]);
    }
  }

  /** Insert text at the caret, or wrap the selection. */
  function insert(snippet: string, wrap?: [string, string]) {
    const element = bodyRef.current;
    if (!element) return;

    const { selectionStart: start, selectionEnd: end, value } = element;
    const selected = value.slice(start, end);
    const insertion = wrap ? `${wrap[0]}${selected}${wrap[1]}` : snippet;

    update("body", value.slice(0, start) + insertion + value.slice(end));

    // Restore the caret once React has written the new value back.
    const caret = wrap && selected ? start + insertion.length : start + insertion.length;
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(caret, caret);
    });
  }

  async function save() {
    if (busy !== "idle") return;

    setBusy("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, overwrite: existing }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; slug?: string };

      if (!response.ok) {
        setMessage({ tone: "error", text: data.error ?? "Could not save the post." });
        return;
      }

      setExisting(true);
      setSlugFollowsTitle(false);
      setSaved(true);
      setMessage({
        tone: "ok",
        text: `Saved to content/posts/${form.slug}.txt`,
      });

      await Promise.all([refreshPosts(), refreshImages(form.slug)]);
      // Let the public pages pick up the new file.
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Network error — the post was not saved." });
    } finally {
      setBusy("idle");
    }
  }

  /** Revert to the last saved version — or, for a post never saved, to blank. */
  async function discardChanges() {
    if (busy !== "idle") return;

    if (!existing) {
      startNewPost();
      return;
    }

    setBusy("loading");
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/posts?slug=${encodeURIComponent(form.slug)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        setMessage({ tone: "error", text: "Could not reload the saved post." });
        return;
      }

      const { post } = (await response.json()) as { post: Form };
      setForm(post);
      setSaved(true);
      setMessage({ tone: "ok", text: "Reverted to the last saved version." });
    } catch {
      setMessage({ tone: "error", text: "Network error — could not discard changes." });
    } finally {
      setBusy("idle");
    }
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;

    if (!form.slug) {
      setMessage({ tone: "error", text: "Give the post a slug first — it names the image folder." });
      return;
    }

    setBusy("uploading");
    setMessage(null);

    try {
      const payload = new FormData();
      payload.set("slug", form.slug);
      for (const file of Array.from(files)) payload.append("files", file);

      const response = await fetch("/api/admin/images", { method: "POST", body: payload });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        saved?: string[];
        rejected?: { name: string; reason: string }[];
        images?: ImageEntry[];
      };

      if (!response.ok) {
        setMessage({ tone: "error", text: data.error ?? "Upload failed." });
        return;
      }

      if (data.images) setImages(data.images);

      const rejected = data.rejected ?? [];
      setMessage({
        tone: rejected.length > 0 ? "error" : "ok",
        text:
          rejected.length > 0
            ? `${data.saved?.length ?? 0} uploaded. Skipped: ${rejected
                .map((entry) => `${entry.name} (${entry.reason})`)
                .join("; ")}`
            : `Uploaded ${data.saved?.length ?? 0} image${data.saved?.length === 1 ? "" : "s"}.`,
      });
    } catch {
      setMessage({ tone: "error", text: "Network error during upload." });
    } finally {
      setBusy("idle");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeImage(name: string) {
    const response = await fetch(
      `/api/admin/images?slug=${encodeURIComponent(form.slug)}&name=${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      images?: ImageEntry[];
    };

    if (!response.ok) {
      setMessage({ tone: "error", text: data.error ?? "Could not delete the image." });
      return;
    }

    if (data.images) setImages(data.images);
    if (form.cover === name) update("cover", "");
    setMessage({ tone: "ok", text: `Deleted ${name}.` });
  }

  function startNewPost() {
    setForm({ ...EMPTY_FORM, date: today, body: STARTER_BODY });
    setExisting(false);
    setSlugFollowsTitle(true);
    setSaved(true);
    setImages([]);
    setMessage(null);
    router.replace("/admin/write");
  }

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  const canSave = form.title.trim() !== "" && form.slug !== "" && form.body.trim() !== "";
  const coverImage = images.find((image) => image.name === form.cover) ?? null;
  const stats = useMemo(() => readingStats(form.body), [form.body]);
  const countsLabel = `${stats.wordCount} words · ${form.body.length} chars · ${stats.readingMinutes} min read`;

  return (
    <div className="flex flex-col">
      {/* ---- Studio header: identity, breadcrumb, save state, primary actions ---- */}
      <header className="flex h-14 items-center gap-4 overflow-x-auto border-b border-hairline bg-canvas px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="size-5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span className="whitespace-nowrap t-title-sm text-ink">
            {site.wordmark}
            <span className="text-muted">.</span>
          </span>
        </Link>

        <span className="hidden h-5 w-px shrink-0 bg-hairline sm:block" aria-hidden="true" />

        <nav
          aria-label="Breadcrumb"
          className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap t-caption sm:flex"
        >
          <span className="text-muted">Admin</span>
          <span className="text-muted-soft">/</span>
          <span className="font-medium text-ink">Write</span>
        </nav>

        <div className="flex-1" />

        {/* Hidden below sm: the button label ("Saving…") already carries this
            information, and header space is scarce on a phone. */}
        <span className="hidden shrink-0 whitespace-nowrap t-caption text-muted-soft sm:inline">
          {saved ? "All changes saved" : "Unsaved changes"}
        </span>

        {/* Short/long label pair (rather than shrinking Button's own padding)
            so "Save" always stays reachable without horizontal scrolling. */}
        <Button variant="secondary" onClick={startNewPost} className="shrink-0">
          <span className="hidden sm:inline">New post</span>
          <span className="sm:hidden">New</span>
        </Button>
        <Button onClick={save} disabled={!canSave || busy !== "idle"} className="shrink-0">
          <span className="hidden sm:inline">
            {busy === "saving" ? "Saving…" : existing ? "Update post" : "Save post"}
          </span>
          <span className="sm:hidden">{busy === "saving" ? "Saving…" : existing ? "Update" : "Save"}</span>
        </Button>

        <span className="h-5 w-px shrink-0 bg-hairline" aria-hidden="true" />

        <div className="flex shrink-0 items-center gap-2">
          <Avatar initials={site.author.initials} />
          <button
            type="button"
            onClick={signOut}
            className="cursor-pointer whitespace-nowrap rounded-md px-2 py-1.5 t-caption text-muted transition-colors hover:bg-surface-soft hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ---- Mode switch + formatting toolbar + live word count ---- */}
      <div className="flex h-12 items-center gap-3.5 overflow-x-auto border-b border-hairline bg-canvas px-5">
        <div className="flex shrink-0 gap-1 rounded-full bg-surface-soft p-1">
          {(["write", "split", "preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              aria-current={view === mode ? "true" : undefined}
              className={`cursor-pointer rounded-full px-3 py-1 t-caption font-medium capitalize transition-colors hover:text-ink ${
                view === mode ? "bg-canvas text-ink shadow-soft" : "text-muted"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <span className="h-5 w-px shrink-0 bg-hairline" aria-hidden="true" />

        <div className="flex shrink-0 items-center gap-3.5">
          <div className="flex gap-1">
            <ToolbarButton onClick={() => insert("", ["**", "**"])}>Bold</ToolbarButton>
            <ToolbarButton onClick={() => insert("", ["*", "*"])}>Italic</ToolbarButton>
            <ToolbarButton onClick={() => insert("\n## ")}>H2</ToolbarButton>
            <ToolbarButton onClick={() => insert("\n> ")}>Quote</ToolbarButton>
          </div>
          <div className="flex gap-1">
            <ToolbarButton onClick={() => insert("", ["[", "](https://)"])}>Link</ToolbarButton>
            <ToolbarButton onClick={() => insert("\n- ")}>List</ToolbarButton>
          </div>
          <div className="flex gap-1">
            <ToolbarButton onClick={() => insert("", ["`", "`"])}>Code</ToolbarButton>
            <ToolbarButton onClick={() => insert("\n```python\n\n```\n")}>Python</ToolbarButton>
            <ToolbarButton onClick={() => insert("\n```javascript\n\n```\n")}>JS</ToolbarButton>
            <ToolbarButton onClick={() => insert("\n```typescript\n\n```\n")}>TS</ToolbarButton>
          </div>
          <div className="flex gap-1">
            <ToolbarButton onClick={() => insert("", ["$", "$"])}>Math</ToolbarButton>
            <ToolbarButton onClick={() => insert("\n$$\n\n$$\n")}>Math block</ToolbarButton>
          </div>
          <div className="flex gap-1">
            <ToolbarButton onClick={() => insert('\n::image{src="" alt="" width="wide" caption=""}\n')}>
              Image
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                insert('\n:::gallery{cols=2}\n::image{src="" alt=""}\n::image{src="" alt=""}\n:::\n')
              }
            >
              Gallery
            </ToolbarButton>
          </div>
        </div>

        <div className="flex-1" />

        <span className="shrink-0 whitespace-nowrap t-caption tabular-nums text-muted-soft">
          {countsLabel}
        </span>
      </div>

      {message ? (
        <p
          role="status"
          className={`mx-5 mt-4 rounded-md border px-4 py-3 t-body-sm ${
            message.tone === "ok" ? "border-success text-ink" : "border-error text-error"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {/* ---- Body: editor/preview left, publishing sidebar right ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_316px]">
        <section className="flex min-w-0 flex-col border-hairline lg:border-r">
          <div className="border-b border-hairline-soft px-6 pt-6 pb-4 sm:px-10 sm:pt-8">
            <input
              value={form.title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Untitled post"
              className="w-full border-0 bg-transparent p-0 t-display-sm text-ink placeholder:text-muted-soft focus:outline-none"
            />

            <div className="mt-2.5 flex flex-wrap items-center gap-2 t-caption text-muted-soft">
              <span className="t-code">/blog/</span>
              <input
                value={form.slug}
                onChange={(event) => {
                  setSlugFollowsTitle(false);
                  update("slug", slugify(event.target.value));
                }}
                placeholder="post-slug"
                className="w-52 border-0 bg-transparent p-0 t-code text-body focus:outline-none"
              />
              <span className="h-3 w-px bg-hairline" aria-hidden="true" />
              <span className="whitespace-nowrap">{formatDateLabel(form.date)}</span>
              <span className="h-3 w-px bg-hairline" aria-hidden="true" />
              <span className="whitespace-nowrap">{form.draft ? "Draft" : "Published"}</span>
              {existing ? (
                <>
                  <span className="h-3 w-px bg-hairline" aria-hidden="true" />
                  <Link href={`/blog/${form.slug}`} className="whitespace-nowrap text-ink hover:underline">
                    View published page &rarr;
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          <div className={`grid min-w-0 gap-px bg-hairline-soft ${view === "split" ? "xl:grid-cols-2" : "grid-cols-1"}`}>
            {view !== "preview" ? (
              <textarea
                ref={bodyRef}
                value={form.body}
                onChange={(event) => update("body", event.target.value)}
                spellCheck
                className="min-h-[45vh] w-full resize-none bg-canvas p-6 t-code leading-[1.85] text-ink placeholder:text-muted-soft focus:outline-none sm:min-h-[65vh] sm:px-10"
                placeholder={STARTER_BODY}
              />
            ) : null}

            {view !== "write" ? (
              <div className="min-h-[45vh] min-w-0 overflow-y-auto bg-canvas p-6 sm:min-h-[65vh] sm:px-10">
                {form.body.trim() === "" ? (
                  <p className="t-body-sm text-muted">Nothing to preview yet.</p>
                ) : (
                  <PostBodyPreview slug={form.slug} body={form.body} />
                )}
              </div>
            ) : null}
          </div>

          <div className="flex h-[34px] shrink-0 items-center gap-3.5 border-t border-hairline bg-surface-soft px-6 t-caption text-muted-soft sm:px-10">
            {/* min-w-0 is load-bearing: without it, a flex child can't shrink
                below its content's intrinsic width, so `truncate` never
                engages and a long slug can push the row into overflow. */}
            <span className="min-w-0 flex-1 truncate t-code">
              content/posts/{form.slug || "untitled"}.txt
            </span>
            <span className="hidden shrink-0 whitespace-nowrap sm:inline">Markdown · LaTeX · ::image</span>
          </div>
        </section>

        <aside className="flex flex-col divide-y divide-hairline-soft border-t border-hairline lg:border-t-0">
          {/* ---- Publishing: status + date ---- */}
          <div className="flex flex-col gap-3.5 p-5">
            <h2 className={sectionLabelClasses}>Publishing</h2>

            <div className={fieldClasses}>
              <span className={fieldLabelClasses}>Status</span>
              <div className="flex gap-0.5 rounded-lg bg-surface-soft p-1">
                <button
                  type="button"
                  onClick={() => update("draft", true)}
                  aria-current={form.draft ? "true" : undefined}
                  className={`flex-1 cursor-pointer rounded-md py-1.5 t-caption font-medium transition-colors ${
                    form.draft ? "bg-canvas text-ink shadow-soft" : "text-muted hover:text-ink"
                  }`}
                >
                  Draft
                </button>
                <button
                  type="button"
                  onClick={() => update("draft", false)}
                  aria-current={!form.draft ? "true" : undefined}
                  className={`flex-1 cursor-pointer rounded-md py-1.5 t-caption font-medium transition-colors ${
                    !form.draft ? "bg-canvas text-ink shadow-soft" : "text-muted hover:text-ink"
                  }`}
                >
                  Published
                </button>
              </div>
              <p className="t-caption text-muted-soft">
                {form.draft
                  ? "Visible locally, excluded from production builds."
                  : "Included in the next production build."}
              </p>
            </div>

            <label className={fieldClasses}>
              <span className={fieldLabelClasses}>Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => update("date", event.target.value)}
                className={inputClasses}
              />
            </label>
          </div>

          {/* ---- Metadata: tags + excerpt ---- */}
          <div className="flex flex-col gap-3.5 p-5">
            <h2 className={sectionLabelClasses}>Metadata</h2>

            <div className={fieldClasses}>
              <span className={fieldLabelClasses}>Tags</span>
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-hairline p-1.5 focus-within:border-ink">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded bg-surface-card py-0.5 pl-2 pr-1 t-caption text-ink"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      className="cursor-pointer rounded-sm px-1 leading-none text-muted-soft transition-colors hover:bg-surface-strong hover:text-ink"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={onTagKeyDown}
                  onBlur={() => {
                    if (tagDraft.trim()) addTag(tagDraft);
                  }}
                  placeholder="Add tag"
                  className="min-w-[70px] flex-1 border-0 bg-transparent px-1 py-0.5 t-body-sm text-ink placeholder:text-muted-soft focus:outline-none"
                />
              </div>
              <span className="t-caption text-muted-soft">Enter or comma to add, backspace to remove</span>
            </div>

            <label className={fieldClasses}>
              <span className={fieldLabelClasses}>Excerpt</span>
              <textarea
                value={form.excerpt}
                onChange={(event) => update("excerpt", event.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-hairline bg-canvas px-3 py-2 t-body-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
                placeholder="Shown on cards and as the meta description."
              />
              <span className="text-right t-caption tabular-nums text-muted-soft">
                {form.excerpt.length}/160
              </span>
            </label>
          </div>

          {/* ---- Cover ---- */}
          <div className="flex flex-col gap-3.5 p-5">
            <h2 className={sectionLabelClasses}>Cover</h2>

            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border border-dashed border-hairline bg-surface-soft">
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local thumbnail in an admin tool; the optimizer adds nothing here
                <img src={coverImage.src} alt="" className="size-full object-cover" />
              ) : (
                <span className="p-3 text-center t-caption leading-relaxed text-muted-soft">
                  No cover selected
                  <br />
                  <span className="t-code">public/blog/{form.slug || "slug"}/</span>
                </span>
              )}
            </div>

            <label className={fieldClasses}>
              <span className={fieldLabelClasses}>Image</span>
              <select
                value={form.cover}
                onChange={(event) => update("cover", event.target.value)}
                className={inputClasses}
              >
                <option value="">None</option>
                {images.map((image) => (
                  <option key={image.name} value={image.name}>
                    {image.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={fieldClasses}>
              <span className={fieldLabelClasses}>Alt text</span>
              <input
                value={form.coverAlt}
                onChange={(event) => update("coverAlt", event.target.value)}
                className={inputClasses}
                placeholder="What the cover shows"
              />
            </label>
          </div>

          {/* ---- Images: upload, insert into body, delete ---- */}
          <div className="flex flex-col gap-3.5 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className={sectionLabelClasses}>Images</h2>
              <span className="t-caption text-muted-soft">{images.length}</span>
            </div>

            <p className="t-caption text-muted-soft">
              {form.slug ? (
                <>
                  Stored in <span className="t-code">public/blog/{form.slug}/</span>
                </>
              ) : (
                "Set a slug to enable uploads."
              )}
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
              multiple
              disabled={!form.slug || busy !== "idle"}
              onChange={(event) => void upload(event.target.files)}
              className="t-body-sm text-body file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-hairline file:bg-canvas file:px-3 file:py-1.5 file:t-caption file:text-ink file:transition-colors file:hover:bg-surface-soft disabled:cursor-not-allowed"
            />

            <span className="t-caption text-muted-soft">
              Up to {Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB each
            </span>

            {busy === "uploading" ? <span className="t-caption text-muted">Uploading…</span> : null}

            <ul className="flex flex-col gap-2">
              {images.map((image) => (
                <li
                  key={image.name}
                  className="flex items-center gap-3 rounded-md border border-hairline-soft p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local thumbnail in an admin tool; the optimizer adds nothing here */}
                  <img
                    src={image.src}
                    alt=""
                    className="size-10 shrink-0 rounded-sm bg-surface-card object-cover"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate t-caption text-ink">{image.name}</span>
                    <span className="block t-caption text-muted-soft">
                      {image.width}×{image.height} · {formatBytes(image.bytes)}
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => insert(`::image{src="${image.name}" alt="" width="inline"}\n`)}
                      className="cursor-pointer rounded-sm border border-hairline px-2 py-1 t-caption text-ink transition-colors hover:bg-surface-soft"
                    >
                      Insert
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeImage(image.name)}
                      className="cursor-pointer rounded-sm border border-hairline px-2 py-1 t-caption text-error transition-colors hover:bg-error/10"
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ---- All posts ---- */}
          <div className="flex flex-col gap-3 p-5">
            <h2 className={sectionLabelClasses}>All posts</h2>

            <ul className="flex flex-col">
              {posts.map((post) => (
                <li key={post.slug} className="border-b border-hairline-soft last:border-0">
                  <Link
                    href={`/admin/write?slug=${encodeURIComponent(post.slug)}`}
                    className="flex items-center justify-between gap-2 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate t-caption text-ink">{post.title}</span>
                      <span className="block t-caption text-muted-soft">{post.date}</span>
                    </span>
                    {post.draft ? <BadgePill>draft</BadgePill> : null}
                  </Link>
                </li>
              ))}
              {posts.length === 0 ? (
                <li className="py-2 t-caption text-muted-soft">Nothing written yet.</li>
              ) : null}
            </ul>
          </div>

          {/* ---- Actions ---- */}
          <div className="mt-auto flex flex-col gap-2 p-5">
            <Button onClick={save} disabled={!canSave || busy !== "idle"} className="w-full">
              {busy === "saving" ? "Saving…" : existing ? "Update post" : "Save post"}
            </Button>
            <Button
              variant="secondary"
              onClick={discardChanges}
              disabled={busy !== "idle" || saved}
              className="w-full"
            >
              Discard changes
            </Button>

            <p className="mt-2 t-caption leading-relaxed text-muted-soft">
              Signed in as {email} — posts write to <span className="t-code">content/posts/</span>.
            </p>
          </div>
        </aside>
      </div>

      <details className="m-5 rounded-lg border border-hairline bg-canvas p-5">
        <summary className="cursor-pointer t-title-sm text-ink">Syntax reference</summary>

        <div className="mt-4 flex flex-col gap-3 t-body-sm text-body">
          <p className="t-title-sm text-ink">Maths</p>
          <p>
            LaTeX, typeset by KaTeX at build time. Inline between single dollars, display between
            double. Write <code className="t-code">\$</code> for a literal dollar sign.
          </p>
          <pre className="overflow-x-auto rounded-md bg-surface-card p-3 t-code text-ink">
            {`Inline: the ratio $(L_1 + 0.05) / (L_2 + 0.05)$ must clear 4.5.

$$
C = \\frac{L_1 + 0.05}{L_2 + 0.05}
$$`}
          </pre>

          <p className="mt-2 t-title-sm text-ink">Code</p>
          <p>
            Fenced blocks with a language get coloured and labelled —{" "}
            <code className="t-code">python</code>, <code className="t-code">javascript</code>,{" "}
            <code className="t-code">typescript</code>, and the usual others.
          </p>

          <p className="mt-2 t-title-sm text-ink">Images</p>
          <p>
            Filenames resolve against this post&apos;s folder, so <code className="t-code">hero.png</code>{" "}
            is enough.
          </p>
          <pre className="overflow-x-auto rounded-md bg-surface-card p-3 t-code text-ink">
            {`![Alt text](hero.png "Optional caption")

::image{src="hero.png" alt="Alt" width="full" caption="Edge to edge"}

::image{src="hero.png" alt="Alt" width="400px"}

:::image{src="hero.png" width="wide"}
Caption with **markdown**
:::

:::gallery{cols=2}
::image{src="left.png" alt="Left"}
::image{src="right.png" alt="Right"}
:::`}
          </pre>
          <p>
            <code className="t-code">width</code> is a layout column —{" "}
            <code className="t-code">inline</code> (default), <code className="t-code">wide</code> or{" "}
            <code className="t-code">full</code> — or an exact size, like{" "}
            <code className="t-code">400px</code> or <code className="t-code">50%</code>: the image
            renders at that size, centered, instead of filling the column. Combine both with a
            separate <code className="t-code">size=&quot;400px&quot;</code> attribute for a wide column
            with a smaller image inside it. Add <code className="t-code">ratio=&quot;16/9&quot;</code>{" "}
            to crop.
          </p>
        </div>
      </details>
    </div>
  );
}

function ToolbarButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer whitespace-nowrap rounded-md border border-hairline bg-canvas px-2.5 py-1.5 t-caption text-ink transition-colors hover:bg-surface-soft active:bg-surface-strong"
    >
      {children}
    </button>
  );
}
