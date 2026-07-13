// Server-only helper. Reuses TOKEN_ENC_KEY so any integration secret is
// encrypted at rest the same way Gmail tokens are.
import { encryptToken, decryptToken } from "@/lib/email-ingest.server";

export async function encryptSecret(plaintext: string): Promise<string> {
  return encryptToken(plaintext);
}

export async function decryptSecret(stored: string): Promise<string> {
  return decryptToken(stored);
}
