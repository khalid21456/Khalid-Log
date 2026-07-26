# Personal blog

A statically-generated personal blog built on the design system in [DESIGN.MD](DESIGN.MD).

Posts are plain `.txt` files with markdown bodies. Each post owns a folder of images. There is no database and no CMS — but there is a signed-in writing UI at `/admin/write` that produces exactly the same files you would write by hand.

- **Next.js 16** (App Router) · **TypeScript** (strict) · **Tailwind CSS 4**
- **Markdown** via `react-markdown`, with GFM, LaTeX maths and syntax highlighting
- **Dark / light mode** with no flash, following the OS until you choose
- **Admin login** guarding the editor and every write endpoint

---

## Getting started

```bash
npm install

# Generate the placeholder images the sample posts reference
npm run make-placeholders

# Create .env.local with your admin credentials
npm run set-admin-password -- --email you@example.com --password "a long passphrase"

npm run dev
```

Then open <http://localhost:3000>, and <http://localhost:3000/admin/login> to write.

| Script | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (one static page per published post) |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run set-admin-password` | Write `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `AUTH_SECRET` into `.env.local` |
| `npm run make-placeholders` | Generate sample images (never overwrites an existing file) |

---

## Writing a post

A post is one file: `content/posts/<slug>.txt`. The filename **is** the URL — `content/posts/my-trip.txt` serves at `/blog/my-trip`. Slugs must be lowercase letters, digits and single hyphens.

```
---
title: Every post here is a text file
date: 2026-07-18
excerpt: Shown on cards and used as the meta description.
tags: [process, writing]
cover: cover.png
coverAlt: What the cover image shows
draft: false
---

The body starts here, in markdown.
```

| Field | Required | Notes |
|---|---|---|
| `title` | **yes** | Page title and `<h1>` |
| `date` | **yes** | `YYYY-MM-DD`, read as UTC so the day never shifts by timezone |
| `excerpt` | no | Falls back to the opening paragraph |
| `tags` | no | Lowercased and de-duplicated; drives the archive filter |
| `cover` | no | A filename from this post's own image folder |
| `coverAlt` | no | Alt text for the cover |
| `draft` | no | `true` keeps it out of production builds |

Reading time is calculated from the body — code blocks and formulas are excluded — so there is nothing to keep in sync.

Broken frontmatter fails loudly, naming the file and the field. The editor is deliberately more forgiving, so a bad file can still be opened and fixed.

### Drafts

`draft: true` posts are visible with `npm run dev` and excluded from `npm run build`. A draft's page carries a visible banner so you cannot mistake it for published.

---

## Images

Each post's images live in **`public/blog/<slug>/`**, so the body refers to them by bare filename with no path to get wrong:

```
content/posts/my-trip.txt
public/blog/my-trip/hero.png
public/blog/my-trip/map.png
```

Dimensions are read from each file at build time and passed to `next/image`, so images reserve their space before they load and the page never shifts.

### Standard markdown

```markdown
![Alt text](hero.png "An optional caption")
```

An image alone in a paragraph becomes a captioned figure. An image among text stays inline.

### The image directive

For layout control:

```markdown
::image{src="hero.png" alt="Alt text" width="wide" caption="A caption"}
```

| Attribute | Values |
|---|---|
| `src` | Filename in this post's folder, or an absolute path / external URL |
| `alt` | Alt text. Use `alt=""` only for a decorative image |
| `width` | `inline` (default, text column) · `wide` (breaks out) · `full` (full content width) |
| `caption` | Plain-text caption |
| `ratio` | e.g. `16/9` — crops the image to that shape |

When the caption itself needs markdown, use the container form and write it as the body:

```markdown
:::image{src="hero.png" width="wide"}
A caption with a [link](https://example.com) and **emphasis**.
:::
```

> **One gotcha:** attribute values cannot contain escaped double quotes —
> `caption="he said \"hi\""` will not parse. Use the container form for anything
> with quotes in it. If a directive does fail to parse, the post shows a visible
> warning where it was, rather than leaking the raw `::image{...}` text.

### Galleries

```markdown
:::gallery{cols=2}
::image{src="left.png" alt="Left"}
::image{src="right.png" alt="Right"}
:::
```

`cols` accepts 1–4 and collapses to a single column under 640px.

### A note on "full"

`width="full"` means the full width of the 1200px content container, not the browser viewport. That is deliberate: true viewport-edge bleed invites horizontal-scrollbar bugs for an effect a blog rarely needs.

---

## Maths

LaTeX, typeset by KaTeX **at build time** — no client-side JavaScript, and formulas stay selectable and readable by screen readers (KaTeX emits MathML alongside the visual output).

```markdown
Inline: the ratio $(L_1 + 0.05) / (L_2 + 0.05)$ must clear 4.5.

$$
C = \frac{L_1 + 0.05}{L_2 + 0.05}
$$
```

Write `\$` for a literal dollar sign, so prices are not mistaken for maths. Invalid LaTeX renders in the error colour where it sits instead of failing the build. A long display formula scrolls inside its own box.

---

## Code blocks

Fenced blocks with a language are highlighted and labelled with the language name:

````markdown
```python
def greet(name: str) -> str:
    return f"Hello, {name}"
```
````

**Python, JavaScript and TypeScript** are the primary targets; `tsx`, `jsx`, `bash`, `json`, `yaml`, `sql`, `css`, `html` and the rest of highlight.js's common set work too. A block with no language renders as plain monospace.

The colours are design tokens, not a vendored theme — see the `.hljs-*` rules at the bottom of [src/app/globals.css](src/app/globals.css). Each hue was chosen to clear 4.5:1 contrast against the code surface in **both** themes.

---

## The editor

`/admin/write` — a split-pane markdown editor with a live preview, an upload control, and click-to-insert for the current post's images.

The preview shares its plugin list and component map with the published renderer ([src/lib/markdown/plugins.ts](src/lib/markdown/plugins.ts), [src/components/blog/markdown-components.tsx](src/components/blog/markdown-components.tsx)), so what you see is what the post will look like. The one difference is that preview images use a plain `<img>` — the browser cannot measure a file, and an image you have not uploaded yet would otherwise fail the optimizer.

Saving writes `content/posts/<slug>.txt` and creates `public/blog/<slug>/`. Nothing else. Delete the editor and every post still works.

### Authentication

- Credentials live in `.env.local` (gitignored) — **never in source**. Only a scrypt hash of the password is stored.
- Sessions are HMAC-signed `httpOnly` cookies lasting 8 hours. The signature covers a fingerprint of the password hash, so **changing your password signs out every existing session**.
- Login is rate-limited to 10 attempts per IP per 15 minutes, and a wrong email and a wrong password return the same message, so the endpoint cannot be used to discover the admin address.
- `/admin/*` is checked server-side before any markup is sent, and **every** `/api/admin/*` route checks independently — the guard cannot be bypassed by calling the API directly.
- Uploads are restricted by extension, size-capped, sanitised to `[a-z0-9._-]`, and verified to actually decode as an image. Every filesystem path built from user input goes through `resolveInside()` ([src/lib/safe-path.ts](src/lib/safe-path.ts)).

To change the password:

```bash
npm run set-admin-password -- --email you@example.com --password "a new passphrase"
```

`AUTH_SECRET` is generated once and left alone afterwards, since rotating it would sign you out.

---

## Deploying

`npm run build` prerenders one static page per published post. Serve it with `npm start` behind HTTPS (the session cookie is `Secure` in production).

**Publishing from the browser needs a writable, persistent disk.** The editor writes real files, so it works on a VPS, a container with a mounted volume, or your own machine — but not on a read-only serverless filesystem, where saving returns a clear error rather than failing silently. On such a host, write posts locally and deploy; the public site is unaffected either way.

After a save, the running server invalidates its post cache and revalidates `/`, `/blog` and the post's own path, so a new post appears without a restart.

Set `NEXT_PUBLIC_SITE_URL` to your real origin so canonical links and Open Graph tags are absolute.

---

## Design system

Every colour, type size, radius and spacing step comes from [DESIGN.MD](DESIGN.MD), mapped to Tailwind tokens at the top of [src/app/globals.css](src/app/globals.css). Component files name the spec section they implement.

**Typography.** The spec calls for Cal Sans for display type, which is licensed and not publicly available (DESIGN.MD:357). Its documented substitute — Inter 600 with negative tracking — is what the `.t-display-*` classes apply. To adopt the real face later, load it in [src/app/layout.tsx](src/app/layout.tsx) and point `--font-display` at it; nothing else changes.

**Dark mode.** DESIGN.MD specifies no dark theme, so the dark palette extends the three dark tokens it already defines (`surface-dark`, `surface-dark-elevated`, `on-dark-soft`) rather than inventing a second palette. The mechanism is `@theme inline`, which makes `bg-canvas` compile to `background-color: var(--canvas)` instead of a fixed hex — so redefining the variables under `.dark` re-themes the whole site, and there are almost no `dark:` prefixes in the components. A new component is correct in both themes by default.

A blocking inline script sets the theme class before first paint, so there is no flash of the wrong theme.

### Things to customise

- [src/lib/site.ts](src/lib/site.ts) — name, tagline, description, nav and footer. **The GitHub and LinkedIn footer links are placeholders.**
- `NEXT_PUBLIC_SITE_URL` in `.env.local`.

---

## Layout

```
content/posts/*.txt          the posts
public/blog/<slug>/*         each post's images
scripts/                     credential + placeholder generators
src/app/                     routes: /, /blog, /blog/[slug], /admin/*, /api/admin/*
src/components/
  blog/                      post rendering, cards, the markdown component map
  admin/                     editor + login form
  layout/  theme/  ui/       chrome, theming, primitives
src/lib/
  posts.ts                   read, validate and sort the .txt files
  post-file.ts               lenient read/write for the editor
  images.ts                  image folders + intrinsic dimensions
  markdown/plugins.ts        remark/rehype pipeline + the directive bridge
  auth.ts  password.ts       sessions and scrypt verification
```
