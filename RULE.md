# RULE.md — How to write a post on this blog

Every rule below is enforced by the code, required by the design system, or a mistake that has already been made once. Rules marked **MUST** break something if ignored. Rules marked **SHOULD** are conventions that keep posts consistent.

For the *why* behind the setup, see [README.md](README.md). This file is the working reference.

---

## 1. The file

**MUST** — one post is one file: `content/posts/<slug>.txt`. Nothing else is a post.

**MUST** — the filename is the URL. `content/posts/my-trip.txt` serves at `/blog/my-trip`.

**MUST** — the slug matches `^[a-z0-9]+(-[a-z0-9]+)*$`:

| Valid | Invalid | Why |
|---|---|---|
| `ai-agents` | `AI-Agents` | no uppercase |
| `two-languages` | `two_languages` | no underscores |
| `part-2` | `part 2` | no spaces |
| `deploiement` | `déploiement` | no accents |
| `notes` | `-notes`, `notes-`, `a--b` | no leading, trailing or doubled hyphens |

A file whose name is not a valid slug **fails the build**, naming the file. Maximum 80 characters.

**SHOULD** — pick the slug once. Renaming a published post breaks every existing link to it.

**SHOULD** — write the slug from the topic, not the title: `typing-python-and-typescript`, not `two-languages-two-ideas-of-what-a-type-is`.

---

## 2. Frontmatter

**MUST** — the very first line of the file is `---`, and the block closes with `---`. No blank line before it, no comments above it.

```
---
title: AI agents that actually ship
date: 2026-07-26
excerpt: What changed when I stopped treating the model as the product.
tags: [agents, python]
cover: github-screenshot.jpg
coverAlt: A pull request diff showing the agent's output
draft: false
---
```

| Field | Required | Rule |
|---|---|---|
| `title` | **MUST** | Non-empty. Plain text — markdown inside it is not rendered |
| `date` | **MUST** | Exactly `YYYY-MM-DD`. Quoted or unquoted both work. Read as UTC |
| `excerpt` | SHOULD | 1–2 sentences, plain text, ≤ 200 characters |
| `tags` | SHOULD | Lowercase list, 1–4 tags |
| `cover` | optional | A bare filename from this post's own image folder |
| `coverAlt` | **MUST if `cover` is set** | Describes the cover image |
| `draft` | optional | `true` while unfinished |

### Field rules

**MUST** — a malformed required field fails the build with the filename and the field named. This is intentional: a broken post should not reach the site.

**MUST NOT** — invent fields. Unknown keys are silently ignored, so `author:` or `series:` will look accepted and do nothing.

**SHOULD** — keep the title under about 60 characters so search results do not truncate it. No trailing full stop.

**SHOULD** — write an excerpt for every post. It is used on cards, on the archive, and as the `<meta name="description">`. Without one, the opening paragraph is used instead, which usually reads badly out of context.

**SHOULD** — make the excerpt stand alone. It is read by people who have not seen the title.

**MUST** — check tag spelling. Tags drive the archive filter, so `pyhton` creates a second, permanent, near-empty category next to `python`.

**SHOULD** — reuse existing tags rather than inventing near-duplicates. Check the archive first. Prefer `python` over `python3`, `process` over `my-process`. Singular, lowercase, hyphenated if multi-word.

---

## 3. Body structure

**MUST** — open with a paragraph of prose. Not a heading, not an image, not a code block. The paragraph directly under the title is what a reader sees first and what the excerpt falls back to.

**MUST NOT** — use `#` for a heading. The post title is already the page's `<h1>`; a markdown `#` produces a **second** `<h1>`, which is invalid HTML, confuses screen-reader navigation, and renders unstyled.

```markdown
## Section heading        ← start here
### Sub-section
#### Rarely needed
```

**MUST NOT** — skip heading levels (`##` straight to `####`).

**SHOULD** — use sentence case in headings: "What this actually costs", not "What This Actually Costs".

**SHOULD** — write headings as statements or questions a reader would scan for, not labels. "Where this bites" beats "Problems".

**SHOULD** — keep paragraphs to 2–4 sentences. The reading column is deliberately narrow (704px); long paragraphs become walls.

**MUST** — leave one blank line between blocks. An `::image` or `:::gallery` directive **must** have a blank line before and after it, or it will not be recognised.

---

## 4. Images

### Where they live

**MUST** — a post's images go in `public/blog/<slug>/`, matching the post's slug exactly.

```
content/posts/ai-agents.txt
public/blog/ai-agents/github-screenshot.jpg
public/blog/ai-agents/diagram.png
```

The editor creates this folder for you when you save, and uploads land in it.

### How to reference them

**MUST** — use the **bare filename**. That is the whole point of the per-post folder.

```markdown
::image{src="github-screenshot.jpg" alt="A pull request diff" width="wide"}
```

**MUST NOT** — write `/public/...` in `src`. `public/` is the web root, so it never appears in a URL. `src="/public/blog/ai-agents/shot.jpg"` resolves to a URL that does not exist and renders a "Missing image" box.

| Form | Result |
|---|---|
| `src="shot.jpg"` | **Correct** — resolves to this post's folder |
| `src="/blog/ai-agents/shot.jpg"` | Works, but redundant and breaks if the post is renamed |
| `src="/public/blog/ai-agents/shot.jpg"` | **Broken** — `/public` is not part of any URL |
| `src="https://example.com/x.jpg"` | Works, but unoptimised and no dimensions — avoid |

### Alt text

**MUST** — every image has `alt`. It is not optional and it is not the caption.

- **alt** describes the image for someone who cannot see it: `alt="A pull request diff showing three changed files"`
- **caption** adds context for everyone: `caption="The agent's first passing run"`

**MUST NOT** — use placeholder alt text (`alt="image"`, `alt="dazd"`, `alt="screenshot"`). If the image is purely decorative, write `alt=""` deliberately.

### Layout

**MUST** — `width` is exactly one of three named layouts. It is **not a size**.

| `width` | Renders at |
|---|---|
| `inline` (default) | The text column, ~704px |
| `wide` | Breaks out past the text, ~944px |
| `full` | Full content width, ~1152px |

**MUST NOT** — write `width="50px"`, `width="300"`, or `width="huge"`. Anything that is not `inline`, `wide` or `full` is **silently treated as `inline`** — the image will look untouched and you will not be told why.

There is no way to set pixel dimensions from a post. To make an image smaller, resize the file itself before uploading.

**Optional** — `ratio` crops to a shape, and must be `N/N`:

```markdown
::image{src="hero.png" alt="…" width="full" ratio="21/9"}
```

`ratio="abc"`, `ratio="21:9"` and `ratio="21 by 9"` are ignored without warning.

### Captions with punctuation

**MUST NOT** — put escaped double quotes inside an attribute. `caption="he said \"hi\""` does not parse, and the whole block would leak into the post as raw text (a visible warning is shown instead).

For anything with quotes, markdown, or links in the caption, use the **container form**, where the body is the caption:

```markdown
:::image{src="hero.png" width="wide"}
He said "hi", and the [full thread](https://example.com) explains why.
:::
```

### Galleries

```markdown
:::gallery{cols=2}
::image{src="before.png" alt="Before: three separate services"}
::image{src="after.png" alt="After: one service"}
:::
```

`cols` accepts 1–4 and collapses to one column below 640px. Use it for images that are meant to be compared; two unrelated images do not belong in a gallery.

### File rules

**MUST** — `.jpg` `.jpeg` `.png` `.webp` `.avif` `.gif`, 8 MB maximum each. Uploads are verified to actually decode as an image, so a renamed file is rejected.

**SHOULD** — name files for their content: `pr-diff.png`, not `IMG_4821.png` or `Screenshot 2026-07-26 at 16.55.01.png`. Lowercase with hyphens.

**SHOULD** — resize before uploading. Roughly 1600px wide for `full`, 1400px for `wide`, 1400px for `inline`. A 6000px camera file wastes bandwidth for no visible gain.

**SHOULD NOT** — repeat the `cover` image as the first image in the body. The cover already renders directly above the text, so the reader sees the same picture twice.

**MUST** — fix a "Missing image" box before publishing. It means the file is not where the post says it is.

---

## 5. Code blocks

**MUST** — tag every fence with a language. An untagged fence renders as plain monospace with no colouring and no label.

````markdown
```python
def greet(name: str) -> str:
    return f"Hello, {name}"
```
````

Primary languages: `python`, `javascript`, `typescript`. Also available: `tsx`, `jsx`, `bash`, `shell`, `json`, `yaml`, `sql`, `css`, `html`, `markdown`, `diff`, `go`, `rust`, `java`, `php`. Use `text` when you deliberately want no highlighting.

**SHOULD** — keep lines under about 80 characters. The code block is as wide as the reading column; longer lines scroll sideways, which readers miss.

**SHOULD** — show the smallest snippet that makes the point. Trim imports and boilerplate that are not part of what you are explaining.

**SHOULD NOT** — leave a blank line at the end of a fence. It renders as visible empty space.

**SHOULD** — use inline code for identifiers, filenames, values and flags: `` `resolveImageSrc` ``, `` `.env.local` ``, `` `width="wide"` ``.

**SHOULD NOT** — put prose in a code block to make it stand out. Use a blockquote.

---

## 6. Maths

LaTeX is typeset at build time by KaTeX.

```markdown
Inline: the ratio $(L_1 + 0.05) / (L_2 + 0.05)$ must clear 4.5.

$$
C = \frac{L_1 + 0.05}{L_2 + 0.05}
$$
```

**MUST** — put display maths (`$$`) on its own lines with a blank line before and after.

**MUST** — escape a literal dollar sign as `\$`. This is not optional and it is easy to get wrong: writing *"from $5 to $10"* makes KaTeX treat `$5 to $10` as a formula and swallow the words. Written as `from \$5 to \$10`, it renders correctly.

**SHOULD NOT** — use maths for things prose handles better. Write "x squared" or `x**2` rather than `$x^2$` in the middle of a sentence about code.

Invalid LaTeX renders in red where it sits rather than failing the build — so check the preview. Only KaTeX's supported subset works: no `\usepackage`, no arbitrary LaTeX environments.

---

## 7. What is not supported

**MUST NOT** — use raw HTML. It is stripped, and only the text inside survives. `<div class="box">Hello</div>` renders as the bare word `Hello`.

This means:

| Not available | Instead |
|---|---|
| `<br>` | A blank line, or end the paragraph |
| `<b>`, `<i>` | `**bold**`, `*italic*` |
| `<iframe>`, YouTube embeds | Link to the video |
| `<img>` | `::image{…}` |
| `<style>`, inline `style=` | Nothing — the design system owns the styling |
| `<script>` | Nothing |
| `<details>` | Nothing |

**MUST NOT** — invent directives. Only `::image` and `:::gallery` exist. Any other `:::name{…}` renders a visible "Unknown directive" warning.

---

## 8. Markdown that does work

Standard markdown plus GitHub-flavoured extensions:

| Feature | Syntax | Notes |
|---|---|---|
| Bold / italic | `**bold**` `*italic*` | |
| Lists | `-` and `1.` | Nest with two spaces |
| Blockquote | `>` | Use for a pull-quote or an aside |
| Tables | `\| a \| b \|` | Scroll inside their own box when wide |
| Task lists | `- [ ]` `- [x]` | |
| Strikethrough | `~~gone~~` | |
| Footnotes | `text[^1]` then `[^1]: body` | Collected at the end of the post |
| Autolinks | `https://example.com` | Bare URLs become links |
| Horizontal rule | `---` | Not in the first line — that starts frontmatter |

**SHOULD** — keep tables to 4 columns or fewer. Wider tables scroll, and scrolled columns get missed.

---

## 9. Links

**MUST** — write meaningful link text. Screen-reader users navigate by link text alone.

```markdown
See [the KaTeX support table](https://katex.org/docs/supported.html).   ← good
See the support table [here](https://katex.org/docs/supported.html).    ← bad
```

**MUST NOT** — add `target` or `rel` yourself. External links get `target="_blank"` and `rel="noopener noreferrer"` automatically.

**SHOULD** — link internally with a root-relative path: `[the earlier post](/blog/plain-text-blogging)`.

---

## 10. Drafts

**SHOULD** — set `draft: true` from the first keystroke, and remove it as the last step before publishing.

A draft is visible with `npm run dev`, carries a banner on its page, and is **excluded from production**: absent from the archive and the home page, and its URL returns 404.

**MUST** — remember that removing `draft: true` is what publishes a post. Saving in the editor does not.

---

## 11. Before you publish

```
[ ] Slug is valid, final, and describes the topic
[ ] title, date and excerpt are filled in
[ ] Tags are spelled correctly and reuse existing ones
[ ] cover has a coverAlt
[ ] Every image has real alt text — no placeholders
[ ] No src contains "/public/"
[ ] No width="50px" — only inline, wide or full
[ ] The cover is not repeated as the first body image
[ ] Every code fence declares a language
[ ] Literal dollar signs are escaped as \$
[ ] Opens with a paragraph; headings start at ##
[ ] No raw HTML
[ ] No "Missing image" or "Unknown directive" boxes in the preview
[ ] Read once in light mode and once in dark mode
[ ] npm run build passes and the post appears in the route list
```

---

## 12. Skeleton to copy

```
---
title: A clear, specific title
date: 2026-07-26
excerpt: One or two sentences that make sense to someone who has not read the title.
tags: [python, process]
cover: hero.png
coverAlt: What the cover image shows
draft: true
---

An opening paragraph that says what this post is about and why it is worth
reading. No heading above this — the title is already the heading.

## The first real section

Prose, with `inline code` for identifiers and a [meaningful link](/blog/other-post).

```python
def example() -> None:
    print("tag every fence with a language")
```

::image{src="hero.png" alt="A description of what the image shows" width="wide" caption="An optional caption"}

### A sub-section

> A blockquote for the line worth remembering.

:::gallery{cols=2}
::image{src="before.png" alt="Before: three services"}
::image{src="after.png" alt="After: one service"}
:::

Maths when it earns its place: $C = \frac{a}{b}$, or as a block:

$$
L = 0.2126 R + 0.7152 G + 0.0722 B
$$
```
