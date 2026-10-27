import { redirect } from "next/navigation";

/**
 * Root page redirects to /dashboard.
 * Next.js Edge middleware blocks unauthenticated users and forwards to /login.
 */
export default function RootPage() {
  redirect("/dashboard");
}