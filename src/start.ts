import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/lib/attach-supabase-auth";
import { buildMissingAuthLog } from "@/lib/auth-audit";


const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/")) {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Structured logging for server-fn calls that arrive without an Authorization
// header. Helps trace which route / server fn is firing while signed out.
const authAuditMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/")) {
    return next();
  }
  try {
    const hasAuth = Boolean(request.headers.get("authorization"));
    if (!hasAuth) {
      const entry = buildMissingAuthLog({
        url: request.url,
        referer: request.headers.get("referer"),
      });
      if (entry) console.warn(JSON.stringify(entry));
    }
  } catch {
    /* logging must never break the request */
  }
  return next();
});


export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, authAuditMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
