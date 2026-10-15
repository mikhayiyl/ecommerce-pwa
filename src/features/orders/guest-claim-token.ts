import { createHash, randomBytes } from "node:crypto";

export const GUEST_ORDER_CLAIM_TTL_MS = 30 * 60 * 1000;

export function createGuestOrderClaimToken() {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashGuestOrderClaimToken(token),
    expiresAt: new Date(Date.now() + GUEST_ORDER_CLAIM_TTL_MS),
  };
}

export function hashGuestOrderClaimToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
