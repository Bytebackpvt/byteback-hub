/**
 * Pure helpers for the server-side auth-audit middleware.
 * Extracted so unit tests can exercise them without spinning up the
 * TanStack Start server runtime.
 */

export interface DecodedServerFn {
  file?: string;
  export?: string;
}

export function decodeServerFnId(fnId: string): DecodedServerFn | undefined {
  try {
    const json =
      typeof atob === "function"
        ? atob(fnId)
        : Buffer.from(fnId, "base64").toString("utf-8");
    const parsed = JSON.parse(json) as DecodedServerFn;
    return parsed;
  } catch {
    return undefined;
  }
}

export interface MissingAuthLogInput {
  url: string;
  referer?: string | null;
}

export interface MissingAuthLog {
  level: "warn";
  error_type: "MISSING_AUTH_HEADER";
  message: string;
  path: string;
  referer?: string;
  server_fn_file?: string;
  server_fn_export?: string;
}

/**
 * Build the structured log entry for a server-fn request that arrived
 * without an Authorization header. Returns undefined if the request is
 * not a server-fn call (nothing to log).
 */
export function buildMissingAuthLog(
  input: MissingAuthLogInput,
): MissingAuthLog | undefined {
  const url = new URL(input.url);
  if (!url.pathname.startsWith("/_serverFn/")) return undefined;

  const fnId = url.pathname.replace("/_serverFn/", "");
  const decoded = decodeServerFnId(fnId);

  return {
    level: "warn",
    error_type: "MISSING_AUTH_HEADER",
    message: "Server function invoked without Authorization header",
    path: url.pathname,
    referer: input.referer ?? undefined,
    server_fn_file: decoded?.file,
    server_fn_export: decoded?.export,
  };
}
