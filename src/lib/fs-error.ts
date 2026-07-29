/**
 * Serverless hosts (Vercel, AWS Lambda, …) run API routes against a read-only
 * deployment bundle — only `/tmp` is writable, and it's wiped between
 * invocations. Attempting to write anywhere else surfaces as EROFS, EACCES or
 * EPERM on most platforms, but Vercel's specific overlay reports ENOENT
 * instead when the target is a brand-new directory under one that already
 * exists in the bundle (e.g. creating a new post's image folder). All four
 * codes mean the same thing here: there is nowhere to persist the write.
 */
export function isReadOnlyFsError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === "EROFS" || code === "EACCES" || code === "EPERM" || code === "ENOENT";
}

/** Short form, for a per-file reason in a list of upload results. */
export const READ_ONLY_FS_REASON = "The filesystem is read-only.";

/** Long form, for a standalone error banner. */
export const READ_ONLY_FS_MESSAGE =
  "This server's filesystem is read-only, so nothing could be saved. This is expected on " +
  "serverless hosts like Vercel — write posts and images locally with `npm run dev` and " +
  "git push, or deploy to a host with a persistent writable disk. See README.md.";
