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
    let token = (await supabase.auth.getSession()).data.session?.access_token;

    if (!token) {
      token = await new Promise<string | undefined>((resolve) => {
        const timer = setTimeout(() => {
          sub.data.subscription.unsubscribe();
          resolve(undefined);
        }, 750);
        const sub = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.access_token) {
            clearTimeout(timer);
            sub.data.subscription.unsubscribe();
            resolve(session.access_token);
          }
        });
      });
    }

    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
