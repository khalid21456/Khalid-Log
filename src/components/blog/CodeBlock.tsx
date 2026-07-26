import type { ReactNode } from "react";

/**
 * Display names for the languages this blog highlights. Python, JavaScript and
 * TypeScript are the primary three; the rest are here so a shell or JSON block
 * is labelled just as clearly.
 */
const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  py: "Python",
  "python-repl": "Python REPL",
  javascript: "JavaScript",
  js: "JavaScript",
  jsx: "JSX",
  mjs: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  tsx: "TSX",
  bash: "Shell",
  sh: "Shell",
  shell: "Shell",
  zsh: "Shell",
  console: "Shell",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  css: "CSS",
  scss: "SCSS",
  html: "HTML",
  xml: "HTML",
  markdown: "Markdown",
  md: "Markdown",
  sql: "SQL",
  diff: "Diff",
  go: "Go",
  rust: "Rust",
  java: "Java",
  php: "PHP",
  plaintext: "Text",
  text: "Text",
  txt: "Text",
};

export function languageLabel(language: string | null): string | null {
  if (!language) return null;
  const key = language.toLowerCase();
  return LANGUAGE_LABELS[key] ?? key.toUpperCase();
}

/**
 * A fenced code block: the highlighted `<pre><code>` that react-markdown
 * produced, wrapped in a bordered card with the language named in the corner.
 */
export function CodeBlock({
  language,
  children,
}: {
  language: string | null;
  children: ReactNode;
}) {
  const label = languageLabel(language);

  return (
    <div className="pb-code" data-language={language ?? undefined}>
      {label ? <div className="pb-code-label">{label}</div> : null}
      <pre>{children}</pre>
    </div>
  );
}
