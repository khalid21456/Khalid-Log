import { isAdminConfigured, startSession, verifyCredentials } from "@/lib/auth";
import { checkRateLimit, clientKey, resetRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** 10 attempts per IP per 15 minutes. */
const LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json(
      {
        error:
          "Admin login is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD_HASH and AUTH_SECRET in .env.local — see README.md.",
      },
      { status: 503 },
    );
  }

  const key = `login:${clientKey(request)}`;
  const rate = checkRateLimit(key, LIMIT);

  if (!rate.ok) {
    return Response.json(
      { error: `Too many attempts. Try again in ${rate.retryAfterSeconds} seconds.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { email, password } = (payload ?? {}) as { email?: unknown; password?: unknown };

  if (typeof email !== "string" || typeof password !== "string") {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (!verifyCredentials(email, password)) {
    // One message for both cases, so the response cannot be used to discover
    // whether an email address is the configured one.
    return Response.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  resetRateLimit(key);
  await startSession();

  return Response.json({ ok: true });
}
