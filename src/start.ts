import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/lib/attach-supabase-auth";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
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
  try {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/_serverFn/")) {
      const hasAuth = Boolean(request.headers.get("authorization"));
      if (!hasAuth) {
        const fnId = url.pathname.replace("/_serverFn/", "");
        let file: string | undefined;
        let exportName: string | undefined;
        try {
          const decoded = JSON.parse(
            typeof atob === "function"
              ? atob(fnId)
              : Buffer.from(fnId, "base64").toString("utf-8"),
          ) as { file?: string; export?: string };
          file = decoded.file;
          exportName = decoded.export;
        } catch {
          /* ignore */
        }
        console.warn(
          JSON.stringify({
            level: "warn",
            error_type: "MISSING_AUTH_HEADER",
            message: "Server function invoked without Authorization header",
            path: url.pathname,
            referer: request.headers.get("referer") ?? undefined,
            server_fn_file: file,
            server_fn_export: exportName,
          }),
        );
      }
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
