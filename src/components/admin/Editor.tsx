"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { inputClasses } from "@/components/admin/LoginForm";
import { PostBodyPreview } from "@/components/blog/PostBodyPreview";
import { BadgePill } from "@/components/ui/BadgePill";
import { Button } from "@/components/ui/Button";
import { formatBytes, MAX_IMAGE_BYTES } from "@/lib/image-src";
import { slugify } from "@/lib/slug";

type PostListEntry = { slug: string; title: string; date: string; draft: boolean };
type ImageEntry = { name: string; src: string; width: number; height: number; bytes: number };

type Form = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string;
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
  tags: "",
  cover: "",
  coverAlt: "",
  draft: false,
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

const labelClasses = "t-title-sm text-ink";
const fieldClasses = "flex flex-col gap-2";

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

  const [posts, setPosts] = useState<PostListEntry[]>([]);
  const [images, setImages] = useState<ImageEntry[]>([]);

  const [view, setView] = useState<"split" | "write" | "preview">("split");
  const [busy, setBusy] = useState<"idle" | "saving" | "uploading" | "loading">("idle");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = useCallback(<K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
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

        const { post } = (await response.json()) as {
          post: Omit<Form, "tags"> & { tags: string[] };
        };
        if (cancelled) return;

        setForm({ ...post, tags: post.tags.join(", ") });
        setExisting(true);
        setSlugFollowsTitle(false);
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
        body: JSON.stringify({
          ...form,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          overwrite: existing,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; slug?: string };

      if (!response.ok) {
        setMessage({ tone: "error", text: data.error ?? "Could not save the post." });
        return;
      }

      setExisting(true);
      setSlugFollowsTitle(false);
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

  return (
    <div className="shell py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <h1 className="t-display-sm text-ink">Write</h1>
          <p className="mt-2 t-body-sm text-muted">
            Signed in as {email}. Posts are written to{" "}
            <code className="t-code">content/posts/</code>, images to{" "}
            <code className="t-code">public/blog/&lt;slug&gt;/</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={startNewPost}>
            New post
          </Button>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      {message ? (
        <p
          role="status"
          className={`mt-6 rounded-md border px-4 py-3 t-body-sm ${
            message.tone === "ok" ? "border-success text-ink" : "border-error text-error"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ---- Sidebar: metadata, images, existing posts ---- */}
        <aside className="flex flex-col gap-8">
          <section className="flex flex-col gap-4 rounded-lg border border-hairline bg-canvas p-5">
            <h2 className="t-title-md text-ink">Details</h2>

            <label className={fieldClasses}>
              <span className={labelClasses}>Title</span>
              <input
                value={form.title}
                onChange={(event) => onTitleChange(event.target.value)}
                className={inputClasses}
                placeholder="Building in public, quietly"
              />
            </label>

            <label className={fieldClasses}>
              <span className={labelClasses}>Slug</span>
              <input
                value={form.slug}
                onChange={(event) => {
                  setSlugFollowsTitle(false);
                  update("slug", slugify(event.target.value));
                }}
                className={inputClasses}
                placeholder="building-in-public"
              />
              <span className="t-caption text-muted">
                {form.slug ? `/blog/${form.slug}` : "Set from the title"}
                {existing ? " · editing an existing post" : ""}
              </span>
            </label>

            <label className={fieldClasses}>
              <span className={labelClasses}>Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => update("date", event.target.value)}
                className={inputClasses}
              />
            </label>

            <label className={fieldClasses}>
              <span className={labelClasses}>Tags</span>
              <input
                value={form.tags}
                onChange={(event) => update("tags", event.target.value)}
                className={inputClasses}
                placeholder="typescript, process"
              />
              <span className="t-caption text-muted">Comma separated</span>
            </label>

            <label className={fieldClasses}>
              <span className={labelClasses}>Excerpt</span>
              <textarea
                value={form.excerpt}
                onChange={(event) => update("excerpt", event.target.value)}
                rows={3}
                className="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 t-body-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
                placeholder="Shown on cards and as the meta description."
              />
            </label>

            <label className={fieldClasses}>
              <span className={labelClasses}>Cover image</span>
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
              <span className={labelClasses}>Cover alt text</span>
              <input
                value={form.coverAlt}
                onChange={(event) => update("coverAlt", event.target.value)}
                className={inputClasses}
                placeholder="What the cover shows"
              />
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.draft}
                onChange={(event) => update("draft", event.target.checked)}
                className="size-4 cursor-pointer accent-primary"
              />
              <span className="t-body-sm text-ink">
                Draft — visible locally, excluded from production builds
              </span>
            </label>

            <Button onClick={save} disabled={!canSave || busy !== "idle"} className="w-full">
              {busy === "saving" ? "Saving…" : existing ? "Update post" : "Save post"}
            </Button>

            {existing && form.slug ? (
              <Link href={`/blog/${form.slug}`} className="t-caption text-ink hover:underline">
                View the published page &rarr;
              </Link>
            ) : null}
          </section>

          {/* ---- Images ---- */}
          <section className="flex flex-col gap-4 rounded-lg border border-hairline bg-canvas p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="t-title-md text-ink">Images</h2>
              <span className="t-caption text-muted">{images.length}</span>
            </div>

            <p className="t-caption text-muted">
              {form.slug ? (
                <>
                  Stored in <code className="t-code">public/blog/{form.slug}/</code>
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
                      onClick={() =>
                        insert(`::image{src="${image.name}" alt="" width="inline"}\n`)
                      }
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
          </section>

          {/* ---- Existing posts ---- */}
          <section className="flex flex-col gap-3 rounded-lg border border-hairline bg-canvas p-5">
            <h2 className="t-title-md text-ink">All posts</h2>

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
                <li className="py-2 t-caption text-muted">Nothing written yet.</li>
              ) : null}
            </ul>
          </section>
        </aside>

        {/* ---- Body + preview ---- */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 rounded-full bg-surface-soft p-1.5">
              {(["write", "split", "preview"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  aria-current={view === mode ? "true" : undefined}
                  className={`cursor-pointer rounded-md px-3.5 py-2 t-nav-link capitalize transition-colors hover:text-ink ${
                    view === mode ? "bg-canvas text-ink shadow-soft" : "text-muted"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <ToolbarButton onClick={() => insert("", ["**", "**"])}>Bold</ToolbarButton>
              <ToolbarButton onClick={() => insert("", ["*", "*"])}>Italic</ToolbarButton>
              <ToolbarButton onClick={() => insert("\n## ")}>H2</ToolbarButton>
              <ToolbarButton onClick={() => insert("", ["[", "](https://)"])}>Link</ToolbarButton>
              <ToolbarButton onClick={() => insert("", ["`", "`"])}>Code</ToolbarButton>
              <ToolbarButton onClick={() => insert("\n```python\n\n```\n")}>Python</ToolbarButton>
              <ToolbarButton onClick={() => insert("\n```javascript\n\n```\n")}>JS</ToolbarButton>
              <ToolbarButton onClick={() => insert("\n```typescript\n\n```\n")}>TS</ToolbarButton>
              <ToolbarButton onClick={() => insert("", ["$", "$"])}>Math</ToolbarButton>
              <ToolbarButton onClick={() => insert("\n$$\n\n$$\n")}>Math block</ToolbarButton>
              <ToolbarButton
                onClick={() => insert('\n::image{src="" alt="" width="wide" caption=""}\n')}
              >
                Image
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  insert(
                    '\n:::gallery{cols=2}\n::image{src="" alt=""}\n::image{src="" alt=""}\n:::\n',
                  )
                }
              >
                Gallery
              </ToolbarButton>
            </div>
          </div>

          <div
            className={`grid min-w-0 gap-4 ${view === "split" ? "xl:grid-cols-2" : "grid-cols-1"}`}
          >
            {view !== "preview" ? (
              <textarea
                ref={bodyRef}
                value={form.body}
                onChange={(event) => update("body", event.target.value)}
                spellCheck
                className="min-h-[70vh] w-full resize-y rounded-lg border border-hairline bg-canvas p-5 t-code text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
                placeholder={STARTER_BODY}
              />
            ) : null}

            {view !== "write" ? (
              <div className="min-w-0 overflow-hidden rounded-lg border border-hairline bg-canvas p-5">
                {form.body.trim() === "" ? (
                  <p className="t-body-sm text-muted">Nothing to preview yet.</p>
                ) : (
                  <PostBodyPreview slug={form.slug} body={form.body} />
                )}
              </div>
            ) : null}
          </div>

          <details className="rounded-lg border border-hairline bg-canvas p-5">
            <summary className="cursor-pointer t-title-sm text-ink">Syntax reference</summary>

            <div className="mt-4 flex flex-col gap-3 t-body-sm text-body">
              <p className="t-title-sm text-ink">Maths</p>
              <p>
                LaTeX, typeset by KaTeX at build time. Inline between single
                dollars, display between double. Write <code className="t-code">\$</code> for a
                literal dollar sign.
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
                Filenames resolve against this post&apos;s folder, so{" "}
                <code className="t-code">hero.png</code> is enough.
              </p>
              <pre className="overflow-x-auto rounded-md bg-surface-card p-3 t-code text-ink">
                {`![Alt text](hero.png "Optional caption")

::image{src="hero.png" alt="Alt" width="full" caption="Edge to edge"}

:::image{src="hero.png" width="wide"}
Caption with **markdown**
:::

:::gallery{cols=2}
::image{src="left.png" alt="Left"}
::image{src="right.png" alt="Right"}
:::`}
              </pre>
              <p>
                <code className="t-code">width</code> is{" "}
                <code className="t-code">inline</code> (default),{" "}
                <code className="t-code">wide</code> or <code className="t-code">full</code>. Add{" "}
                <code className="t-code">ratio=&quot;16/9&quot;</code> to crop.
              </p>
            </div>
          </details>
        </div>
      </div>
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
      className="cursor-pointer rounded-md border border-hairline bg-canvas px-2.5 py-1.5 t-caption text-ink transition-colors hover:bg-surface-soft active:bg-surface-strong"
    >
      {children}
    </button>
  );
}
