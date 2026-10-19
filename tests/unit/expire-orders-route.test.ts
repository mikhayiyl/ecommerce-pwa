import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  expireStaleOrders: vi.fn(),
  safeEqual: vi.fn(),
}));

vi.mock("@/features/orders/expire", () => ({
  expireStaleOrders: mocks.expireStaleOrders,
}));

vi.mock("@/lib/security/safe-equal", () => ({
  safeEqual: mocks.safeEqual,
}));

import { GET } from "@/app/api/cron/expire-orders/route";

describe("GET /api/cron/expire-orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    mocks.safeEqual.mockImplementation(
      (given: string, expected: string) => given === expected,
    );
    mocks.expireStaleOrders.mockResolvedValue(3);
  });

  it("returns 401 when the authorization header is missing", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/expire-orders"),
    );

    expect(response.status).toBe(401);
    expect(mocks.expireStaleOrders).not.toHaveBeenCalled();
  });

  it("returns 401 when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const request = new Request("http://localhost/api/cron/expire-orders", {
      headers: { authorization: "Bearer test-cron-secret" },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(mocks.expireStaleOrders).not.toHaveBeenCalled();
  });

  it("runs expiration for a valid bearer token", async () => {
    const request = new Request("http://localhost/api/cron/expire-orders", {
      headers: { authorization: "Bearer test-cron-secret" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      cancelled: 3,
    });
    expect(mocks.expireStaleOrders).toHaveBeenCalledOnce();
  });

  it("returns a generic 500 response if expiration fails", async () => {
    mocks.expireStaleOrders.mockRejectedValue(
      new Error("Database connection details must not leak"),
    );

    const request = new Request("http://localhost/api/cron/expire-orders", {
      headers: { authorization: "Bearer test-cron-secret" },
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to expire stale orders",
    });
  });
});
