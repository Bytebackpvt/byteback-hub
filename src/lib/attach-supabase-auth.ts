import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side function middleware that attaches the Supabase bearer token
 * to every server-fn RPC. If the call fails with an Unauthorized error,
 * we refresh the session once and retry — this smooths over transient
 * token expiry / hydration races without bubbling a crash to the UI.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined") return next();

    const token = await getFreshAccessToken();

    try {
      return await next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
    } catch (err) {
      if (!isUnauthorized(err)) throw err;

      const refreshed = await refreshAccessToken();
      if (!refreshed) throw err;

      return await next({ headers: { Authorization: `Bearer ${refreshed}` } });
    }
  },
);

async function getFreshAccessToken(): Promise<string | undefined> {
  const current = (await supabase.auth.getSession()).data.session?.access_token;
  if (current) return current;
  return waitForAccessToken();
}

async function refreshAccessToken(): Promise<string | undefined> {
  try {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token;
  } catch {
    return undefined;
  }
}

async function waitForAccessToken(): Promise<string | undefined> {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return undefined;
}

function isUnauthorized(err: unknown): boolean {
  if (!err) return false;
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
  return /Unauthorized|401|No authorization header/i.test(message);
}
