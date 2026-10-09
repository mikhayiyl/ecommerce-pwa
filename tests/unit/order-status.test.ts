import { describe, expect, it } from "vitest";
import { allowedTransitions, canTransition, paymentStatusFor, restocksOnTransition } from "@/features/orders/status";

describe("order status transitions", () => {
  it("allows the normal fulfilment path", () => {
    expect(canTransition("PENDING", "PAID")).toBe(true);
    expect(canTransition("PAID", "PROCESSING")).toBe(true);
    expect(canTransition("PROCESSING", "SHIPPED")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
  });
  it("blocks skipping steps and leaving terminal states", () => {
    expect(canTransition("PENDING", "SHIPPED")).toBe(false);
    expect(canTransition("DELIVERED", "PROCESSING")).toBe(false);
    expect(allowedTransitions("CANCELLED")).toEqual([]);
    expect(allowedTransitions("REFUNDED")).toEqual([]);
  });
  it("derives payment status and restocking", () => {
    expect(paymentStatusFor("PAID", "UNPAID")).toBe("PAID");
    expect(paymentStatusFor("REFUNDED", "PAID")).toBe("REFUNDED");
    expect(paymentStatusFor("SHIPPED", "PAID")).toBe("PAID");
    expect(restocksOnTransition("CANCELLED")).toBe(true);
    expect(restocksOnTransition("SHIPPED")).toBe(false);
  });
});
