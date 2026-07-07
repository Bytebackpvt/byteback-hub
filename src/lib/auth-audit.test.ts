import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildMissingAuthLog,
  decodeServerFnId,
} from "./auth-audit";

// Same encoding TanStack Start uses for server-fn IDs: base64({file, export}).
function encodeFnId(payload: { file: string; export: string }) {
  const json = JSON.stringify(payload);
  return typeof btoa === "function"
    ? btoa(json)
    : Buffer.from(json, "utf-8").toString("base64");
}

const SAMPLE = {
  file: "/src/lib/timeline.functions.ts?tss-serverfn-split",
  export: "listAiEvents_createServerFn_handler",
};

describe("decodeServerFnId", () => {
  it("decodes a valid base64 server-fn id into file + export", () => {
    const decoded = decodeServerFnId(encodeFnId(SAMPLE));
    expect(decoded).toEqual(SAMPLE);
  });

  it("returns undefined for garbage input instead of throwing", () => {
    expect(decodeServerFnId("!!!not-base64!!!")).toBeUndefined();
    expect(decodeServerFnId("")).toBeUndefined();
  });
});

describe("buildMissingAuthLog", () => {
  it("returns undefined for non server-fn requests", () => {
    const log = buildMissingAuthLog({
      url: "https://app.test/api/public/webhook",
      referer: null,
    });
    expect(log).toBeUndefined();
  });

  it("includes path, referer, decoded file and export for a server-fn call", () => {
    const fnId = encodeFnId(SAMPLE);
    const log = buildMissingAuthLog({
      url: `https://app.test/_serverFn/${fnId}`,
      referer: "https://app.test/app/inbox",
    });

    expect(log).toBeDefined();
    expect(log).toMatchObject({
      level: "warn",
      error_type: "MISSING_AUTH_HEADER",
      path: `/_serverFn/${fnId}`,
      referer: "https://app.test/app/inbox",
      server_fn_file: SAMPLE.file,
      server_fn_export: SAMPLE.export,
    });
    expect(log?.message).toMatch(/Authorization header/i);
  });

  it("still logs path when the fn id cannot be decoded", () => {
    const log = buildMissingAuthLog({
      url: "https://app.test/_serverFn/not-valid-b64!!",
      referer: null,
    });
    expect(log).toBeDefined();
    expect(log?.path).toBe("/_serverFn/not-valid-b64!!");
    expect(log?.server_fn_file).toBeUndefined();
    expect(log?.server_fn_export).toBeUndefined();
    expect(log?.referer).toBeUndefined();
  });
});

// Integration-style: simulate a request pipeline that would call
// console.warn(JSON.stringify(buildMissingAuthLog(...))), matching what
// authAuditMiddleware does in src/start.ts.
describe("authAudit integration", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  function simulate(request: Request) {
    const hasAuth = Boolean(request.headers.get("authorization"));
    if (hasAuth) return;
    const entry = buildMissingAuthLog({
      url: request.url,
      referer: request.headers.get("referer"),
    });
    if (entry) console.warn(JSON.stringify(entry));
  }

  it("emits a structured warn log with route + server-fn export when auth is missing", () => {
    const fnId = encodeFnId(SAMPLE);
    simulate(
      new Request(`https://app.test/_serverFn/${fnId}`, {
        headers: { referer: "https://app.test/app/inbox" },
      }),
    );

    expect(warn).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(warn.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      error_type: "MISSING_AUTH_HEADER",
      path: `/_serverFn/${fnId}`,
      referer: "https://app.test/app/inbox",
      server_fn_file: SAMPLE.file,
      server_fn_export: SAMPLE.export,
    });
  });

  it("does not log when Authorization header is present", () => {
    const fnId = encodeFnId(SAMPLE);
    simulate(
      new Request(`https://app.test/_serverFn/${fnId}`, {
        headers: { authorization: "Bearer token" },
      }),
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not log for non server-fn paths", () => {
    simulate(new Request("https://app.test/api/public/cron.escalate"));
    expect(warn).not.toHaveBeenCalled();
  });
});
