import path from "node:path";

/**
 * Join `segments` onto `base` and guarantee the result stays inside `base`.
 *
 * Every filesystem path in this project that is built from frontmatter, a URL
 * segment, an uploaded filename or an API payload goes through here, so a value
 * like `../../etc/passwd` or an absolute path can never escape the directory it
 * is supposed to be confined to.
 */
export function resolveInside(base: string, ...segments: string[]): string {
  const root = path.resolve(base);
  const target = path.resolve(root, ...segments);

  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(
      `Refusing to access ${JSON.stringify(target)}: outside of ${JSON.stringify(root)}.`,
    );
  }

  return target;
}
