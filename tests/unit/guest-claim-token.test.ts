import { describe, expect, it } from "vitest";
import {
  createGuestOrderClaimToken,
  hashGuestOrderClaimToken,
  GUEST_ORDER_CLAIM_TTL_MS,
} from "@/features/orders/guest-claim-token";

describe("guest order claim tokens", () => {
  it("generates a random token and stores a hash, not the raw token", () => {
    const result = createGuestOrderClaimToken();

    expect(result.token).toBeTruthy();
    expect(result.token).not.toBe(result.tokenHash);
    expect(result.tokenHash).toBe(hashGuestOrderClaimToken(result.token));
    expect(result.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates unique tokens", () => {
    const first = createGuestOrderClaimToken();
    const second = createGuestOrderClaimToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it("sets the expiry to 30 minutes after creation", () => {
    const before = Date.now();
    const result = createGuestOrderClaimToken();
    const after = Date.now();

    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + GUEST_ORDER_CLAIM_TTL_MS,
    );
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
      after + GUEST_ORDER_CLAIM_TTL_MS,
    );
  });

  it("hashes the same token consistently", () => {
    const token = "example-test-token";

    expect(hashGuestOrderClaimToken(token)).toBe(
      hashGuestOrderClaimToken(token),
    );
  });
});
