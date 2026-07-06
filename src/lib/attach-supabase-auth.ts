import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side function middleware that attaches the Supabase bearer token.
 * More robust than the generated attacher: if getSession() returns null
 * (transient race right after sign-in / hydration), it waits briefly for
 * an INITIAL_SESSION / SIGNED_IN event before giving up.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined") return next();

    let token = (await supabase.auth.getSession()).data.session?.access_token;

    if (!token && shouldWaitForHydratedSession()) {
      token = await waitForAccessToken();
    }

    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);

function shouldWaitForHydratedSession() {
  const path = window.location.pathname;
  return path === "/app" || path.startsWith("/app/") || path.startsWith("/onboarding");
}

async function waitForAccessToken() {
  const deadline = Date.now() + 3_000;

  while (Date.now() < deadline) {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return undefined;
}
