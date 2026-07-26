const WORDS_PER_MINUTE = 225;

/**
 * Word count and reading estimate for a markdown body.
 *
 * Fenced code, inline code, image directives and link targets are stripped
 * first so that a post full of code samples is not reported as a 40-minute
 * read on the strength of its punctuation.
 */
export function readingStats(markdown: string): {
  wordCount: number;
  readingMinutes: number;
} {
  const prose = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`]*`/g, " ")
    // LaTeX: a formula is one "thing" to read, not a word per symbol.
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$\n]+\$/g, " ")
    .replace(/^:{2,}[a-z][\w-]*\{[^}]*\}\s*$/gim, " ")
    .replace(/^:{3,}\s*$/gm, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>|*_~`]+/g, " ");

  const wordCount = prose.split(/\s+/).filter(Boolean).length;

  return {
    wordCount,
    readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
  };
}
