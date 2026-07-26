import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Editor } from "@/components/admin/Editor";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Write",
  robots: { index: false, follow: false },
};

/**
 * The editor.
 *
 * The session is checked here on the server, so an unauthenticated visitor never
 * receives the editor markup at all — and each API route the editor calls checks
 * again independently, so the guard cannot be bypassed by calling them directly.
 */
export default async function WritePage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  // Today's date comes from here so the client's first render matches.
  return <Editor email={session.email} today={new Date().toISOString().slice(0, 10)} />;
}
