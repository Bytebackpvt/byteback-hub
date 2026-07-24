// PayU India — one-time payments helper (server only)
// Hash spec (v1): https://devguide.payu.in/rest-api-integration/checkout-api-integration/

const enc = new TextEncoder();

async function sha512Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-512", enc.encode(input));
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

export type PayuMode = "test" | "production";

export function getPayuConfig(): {
  key: string;
  salt: string;
  mode: PayuMode;
  actionUrl: string;
} {
  const key = process.env.PAYU_MERCHANT_KEY;
  const salt = process.env.PAYU_MERCHANT_SALT;
  const modeRaw = (process.env.PAYU_MODE ?? "test").toLowerCase();
  if (!key || !salt) throw new Error("PayU credentials are not configured");
  const mode: PayuMode = modeRaw === "production" ? "production" : "test";
  const actionUrl =
    mode === "production"
      ? "https://secure.payu.in/_payment"
      : "https://test.payu.in/_payment";
  return { key, salt, mode, actionUrl };
}

export type PayuRequestFields = {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  hash: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
};

export async function buildRequestHash(input: {
  key: string;
  salt: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}): Promise<string> {
  const seq = [
    input.key,
    input.txnid,
    input.amount,
    input.productinfo,
    input.firstname,
    input.email,
    input.udf1 ?? "",
    input.udf2 ?? "",
    input.udf3 ?? "",
    input.udf4 ?? "",
    input.udf5 ?? "",
    "", "", "", "", "", "",
    input.salt,
  ].join("|");
  return sha512Hex(seq);
}

/**
 * Verify PayU response POST-back. Returns true if hash matches.
 * Uses fields exactly as PayU sent them (amount, etc.).
 */
export async function verifyResponseHash(
  fields: Record<string, string>,
  salt: string,
): Promise<boolean> {
  const provided = fields.hash;
  if (!provided) return false;
  const additional = fields.additionalCharges;
  const base = [
    salt,
    fields.status ?? "",
    "", "", "", "", "",
    fields.udf5 ?? "",
    fields.udf4 ?? "",
    fields.udf3 ?? "",
    fields.udf2 ?? "",
    fields.udf1 ?? "",
    fields.email ?? "",
    fields.firstname ?? "",
    fields.productinfo ?? "",
    fields.amount ?? "",
    fields.txnid ?? "",
    fields.key ?? "",
  ].join("|");
  const seq = additional ? `${additional}|${base}` : base;
  const expected = await sha512Hex(seq);
  return expected.toLowerCase() === provided.toLowerCase();
}

export function newTxnId(workspaceId: string): string {
  const wsShort = workspaceId.replace(/-/g, "").slice(0, 8);
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `bb_${wsShort}_${ts}_${rand}`;
}
