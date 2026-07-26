import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/LoginForm";
import { getSession, isAdminConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Already signed in — no reason to show the form again.
  if (await getSession()) redirect("/admin/write");

  return (
    <section className="shell py-16 md:py-24">
      <div className="mx-auto max-w-md">
        <h1 className="t-display-sm text-ink">Sign in to write</h1>
        <p className="mt-3 t-body-md text-muted">
          Publishing is limited to the site owner. Everything else here is public.
        </p>

        <div className="mt-8">
          <LoginForm configured={isAdminConfigured()} />
        </div>
      </div>
    </section>
  );
}
