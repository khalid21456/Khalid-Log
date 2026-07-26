"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

export const inputClasses =
  "h-10 w-full rounded-md border border-hairline bg-canvas px-3.5 t-body-md text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!configured) {
    return (
      <div className="rounded-lg border border-warning bg-canvas p-6">
        <h2 className="t-title-md text-ink">Admin login is not set up yet</h2>
        <p className="mt-3 t-body-sm text-body">
          Run <code className="t-code">npm run set-admin-password</code> to create{" "}
          <code className="t-code">.env.local</code>, then restart the dev server. The full steps are
          in <code className="t-code">README.md</code>.
        </p>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Could not sign in.");
        return;
      }

      // refresh() re-runs the server guard so it sees the new session cookie.
      router.replace("/admin/write");
      router.refresh();
    } catch {
      setError("Network error — is the server still running?");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-hairline bg-canvas p-6 shadow-soft">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="t-title-sm text-ink">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClasses}
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="t-title-sm text-ink">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClasses}
          />
        </label>

        {error ? (
          <p role="alert" className="rounded-md border border-error px-3 py-2 t-body-sm text-error">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="mt-2 w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
