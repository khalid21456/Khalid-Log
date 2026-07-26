import crypto from "node:crypto";

/**
 * Password verification for the admin login.
 *
 * The stored value is a single self-describing string:
 *
 *     scrypt:<N>:<r>:<p>:<salt base64url>:<hash base64url>
 *
 * Colons and base64url are used deliberately. Next loads `.env.local` through
 * dotenv-expand, which would treat a `$16384` segment as an undefined variable
 * reference and silently strip it, and base64url avoids `+`, `/` and `=` as
 * well — so the whole value survives the env file untouched and unquoted.
 *
 * The cost parameters are read back out of the string rather than hard-coded
 * here, so `scripts/set-admin-password.mjs` — which generates it — can change
 * them without this file needing to agree. Only the format is shared.
 *
 * The plaintext password is never stored anywhere in the project.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, rawN, rawR, rawP, saltEncoded, hashEncoded] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);

  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (N < 2 || r < 1 || p < 1) return false;

  const salt = Buffer.from(saltEncoded, "base64url");
  const expected = Buffer.from(hashEncoded, "base64url");
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = crypto.scryptSync(password, salt, expected.length, {
      N,
      r,
      p,
      // The default maxmem (32 MB) is too small for stronger cost parameters.
      maxmem: 512 * 1024 * 1024,
    });
  } catch {
    return false;
  }

  // Constant-time: a wrong password must not be distinguishable by timing.
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
