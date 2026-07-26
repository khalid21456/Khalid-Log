import crypto from "node:crypto";

import { cookies } from "next/headers";

import { verifyPassword } from "@/lib/password";

export const SESSION_COOKIE = "blog_admin_session";

/** Sessions last a working day, then require signing in again. */
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AdminSession = { email: string };

type AdminConfig = {
  email: string;
  passwordHash: string;
  secret: string;
};

/**
 * Credentials come from the environment (`.env.local`, which is gitignored) and
 * never from source. Missing or weak configuration disables the admin area
 * rather than falling back to something permissive.
 */
function readAdminConfig(): AdminConfig | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const secret = process.env.AUTH_SECRET?.trim();

  if (!email || !passwordHash || !secret) return null;
  if (secret.length < 32) return null;

  return { email, passwordHash, secret };
}

export function isAdminConfigured(): boolean {
  return readAdminConfig() !== null;
}

/**
 * Short fingerprint of the stored password hash, embedded in the session.
 * Changing the admin password therefore invalidates every existing session.
 */
function passwordFingerprint(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

type SessionPayload = {
  sub: string;
  exp: number;
  fp: string;
};

function createSessionToken(email: string, config: AdminConfig): string {
  const payload: SessionPayload = {
    sub: email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    fp: passwordFingerprint(config.passwordHash),
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, config.secret)}`;
}

function verifySessionToken(token: string, config: AdminConfig): SessionPayload | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const encoded = token.slice(0, separator);
  const signature = Buffer.from(token.slice(separator + 1));
  const expected = Buffer.from(sign(encoded, config.secret));

  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(signature, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload?.sub !== "string" || typeof payload?.exp !== "number") return null;
  if (payload.exp < Date.now() / 1000) return null;

  // The configured admin, and the password, must still be the ones this token
  // was issued against.
  if (payload.sub !== config.email) return null;
  if (payload.fp !== passwordFingerprint(config.passwordHash)) return null;

  return payload;
}

/** Constant-time-ish credential check. */
export function verifyCredentials(email: string, password: string): boolean {
  const config = readAdminConfig();
  if (!config) return false;

  const submitted = Buffer.from(email.trim().toLowerCase());
  const configured = Buffer.from(config.email);

  const emailMatches =
    submitted.length === configured.length && crypto.timingSafeEqual(submitted, configured);

  // Always run the KDF so a wrong email does not return measurably faster than
  // a wrong password.
  const passwordMatches = verifyPassword(password, config.passwordHash);

  return emailMatches && passwordMatches;
}

/**
 * Issue a session cookie for the configured admin. Takes no email on purpose:
 * there is exactly one admin, and the session is always bound to the address in
 * the environment rather than to whatever was typed into the form.
 */
export async function startSession(): Promise<boolean> {
  const config = readAdminConfig();
  if (!config) return false;

  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(config.email, config), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return true;
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** The current admin session, or null. Reads the request's cookies. */
export async function getSession(): Promise<AdminSession | null> {
  const config = readAdminConfig();
  if (!config) return null;

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token, config);
  return payload ? { email: payload.sub } : null;
}

/**
 * Guard for API route handlers: returns a 401 response when there is no valid
 * session, or null when the caller may proceed.
 */
export async function requireApiSession(): Promise<Response | null> {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "The admin area is not configured. See README.md." },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session) return Response.json({ error: "Not signed in." }, { status: 401 });

  return null;
}
