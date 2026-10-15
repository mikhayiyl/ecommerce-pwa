import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    guestOrderClaimToken: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    order: {
      updateMany: vi.fn(),
    },
  };

  return {
    auth: vi.fn(),
    clientIp: vi.fn(),
    rateLimit: vi.fn(),
    tx,
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/security/client-ip", () => ({
  clientIp: mocks.clientIp,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}));

import { confirmGuestOrderClaimAction } from "@/actions/guest-order-claim";
import { hashGuestOrderClaimToken } from "@/features/orders/guest-claim-token";

const rawToken = "test-guest-order-claim-token-123";
const tokenHash = hashGuestOrderClaimToken(rawToken);
const now = Date.now();

const claimToken = {
  id: "claim-token-1",
  expiresAt: new Date(now + 10 * 60_000),
  consumedAt: null,
  order: {
    id: "order-123",
    email: "customer@example.com",
    userId: null,
  },
};

describe("confirmGuestOrderClaimAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.auth.mockResolvedValue({
      user: { id: "user-123" },
    });

    mocks.clientIp.mockResolvedValue("127.0.0.1");
    mocks.rateLimit.mockReturnValue(true);

    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "customer@example.com",
      disabled: false,
    });

    mocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => Promise<unknown>) =>
        callback(mocks.tx),
    );

    mocks.tx.guestOrderClaimToken.findUnique.mockResolvedValue({
      ...claimToken,
      order: { ...claimToken.order },
    });

    mocks.tx.guestOrderClaimToken.updateMany.mockResolvedValue({
      count: 1,
    });

    mocks.tx.order.updateMany.mockResolvedValue({
      count: 1,
    });
  });

  it("requires the customer to sign in", async () => {
    mocks.auth.mockResolvedValue(null);

    const result = await confirmGuestOrderClaimAction(rawToken);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("sign in");
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid token input", async () => {
    const result = await confirmGuestOrderClaimAction("short");

    expect(result.ok).toBe(false);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a disabled account", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "customer@example.com",
      disabled: true,
    });

    const result = await confirmGuestOrderClaimAction(rawToken);

    expect(result.ok).toBe(false);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a missing token", async () => {
    mocks.tx.guestOrderClaimToken.findUnique.mockResolvedValue(null);

    const result = await confirmGuestOrderClaimAction(rawToken);

    expect(result.ok).toBe(false);
    expect(mocks.tx.guestOrderClaimToken.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    mocks.tx.guestOrderClaimToken.findUnique.mockResolvedValue({
      ...claimToken,
      expiresAt: new Date(Date.now() - 60_000),
    });

    const result = await confirmGuestOrderClaimAction(rawToken);

    expect(result.ok).toBe(false);
    expect(mocks.tx.guestOrderClaimToken.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an already-consumed token", async () => {
    mocks.tx.guestOrderClaimToken.findUnique.mockResolvedValue({
      ...claimToken,
      consumedAt: new Date(),
    });

    const result = await confirmGuestOrderClaimAction(rawToken);

    expect(result.ok).toBe(false);
    expect(mocks.tx.guestOrderClaimToken.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a different account email", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "other@example.com",
      disabled: false,
    });

    const result = await confirmGuestOrderClaimAction(rawToken);

    expect(result.ok).toBe(false);
    expect(mocks.tx.guestOrderClaimToken.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
  });

  it("claims the guest order and consumes the token", async () => {
    const result = await confirmGuestOrderClaimAction(rawToken);

    expect(result).toMatchObject({
      ok: true,
      message: expect.stringContaining("successfully linked"),
    });

    expect(mocks.tx.guestOrderClaimToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash },
      select: {
        id: true,
        expiresAt: true,
        consumedAt: true,
        order: {
          select: {
            id: true,
            email: true,
            userId: true,
          },
        },
      },
    });

    expect(mocks.tx.guestOrderClaimToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: "claim-token-1",
        consumedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { consumedAt: expect.any(Date) },
    });

    expect(mocks.tx.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: "order-123",
        userId: null,
        email: "customer@example.com",
      },
      data: { userId: "user-123" },
    });
  });

  it("does not claim an order if another request consumed the token first", async () => {
    mocks.tx.guestOrderClaimToken.updateMany.mockResolvedValue({
      count: 0,
    });

    const result = await confirmGuestOrderClaimAction(rawToken);

    expect(result.ok).toBe(false);
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an order that has already been claimed", async () => {
    mocks.tx.guestOrderClaimToken.findUnique.mockResolvedValue({
      ...claimToken,
      order: {
        ...claimToken.order,
        userId: "another-user",
      },
    });

    const result = await confirmGuestOrderClaimAction(rawToken);

    expect(result.ok).toBe(false);
    expect(mocks.tx.guestOrderClaimToken.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
  });
});
