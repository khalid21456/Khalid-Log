#!/usr/bin/env node
/**
 * Create or update the admin credentials in `.env.local`.
 *
 *   npm run set-admin-password -- --email you@example.com --password "your password"
 *
 * Or, to keep the password out of your shell history:
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='your password' npm run set-admin-password
 *
 * Writes three keys, preserving anything else already in the file:
 *   ADMIN_EMAIL          the one address allowed to sign in
 *   ADMIN_PASSWORD_HASH  scrypt hash — the plaintext is never stored
 *   AUTH_SECRET          HMAC key for session cookies (generated once)
 *
 * The hash format is documented in src/lib/password.ts, which verifies it.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ENV_FILE = path.join(process.cwd(), ".env.local");

/** scrypt cost: ~16 MB of memory per attempt, well above bcrypt-equivalent. */
const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 64, saltBytes: 16 };

function hashPassword(password) {
  const salt = crypto.randomBytes(SCRYPT.saltBytes);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keyLength, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 512 * 1024 * 1024,
  });

  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join(":");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;

    const [flag, inline] = current.slice(2).split("=");
    args[flag] = inline !== undefined ? inline : argv[++i];
  }
  return args;
}

/** Replace a key in place if present, otherwise append it. */
function upsert(contents, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(contents)) return contents.replace(pattern, line);
  if (contents === "") return `${line}\n`;
  return contents.endsWith("\n") ? `${contents}${line}\n` : `${contents}\n${line}\n`;
}

function readExisting() {
  try {
    return fs.readFileSync(ENV_FILE, "utf8");
  } catch {
    return "";
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = (args.email ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = args.password ?? process.env.ADMIN_PASSWORD ?? "";

  if (!email || !email.includes("@")) {
    console.error(
      "An email address is required:\n" +
        '  npm run set-admin-password -- --email you@example.com --password "your password"',
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("The password must be at least 8 characters.");
    process.exit(1);
  }

  let contents = readExisting();
  const hadSecret = /^AUTH_SECRET=.+$/m.test(contents);

  contents = upsert(contents, "ADMIN_EMAIL", email);
  contents = upsert(contents, "ADMIN_PASSWORD_HASH", hashPassword(password));

  // Rotating this would sign every existing session out, so only generate it
  // when it is genuinely missing.
  if (!hadSecret) {
    contents = upsert(contents, "AUTH_SECRET", crypto.randomBytes(48).toString("base64url"));
  }

  fs.writeFileSync(ENV_FILE, contents, { encoding: "utf8", mode: 0o600 });

  console.log(`Saved credentials for ${email} to .env.local`);
  console.log(hadSecret ? "Kept the existing AUTH_SECRET." : "Generated a new AUTH_SECRET.");
  console.log("Restart the dev server, then sign in at /admin/login");

  if (/^\d+$/.test(password)) {
    console.warn(
      "\nNote: this password is digits only. If the site will be reachable from the\n" +
        "internet, use a longer passphrase with mixed characters.",
    );
  }
}

main();
