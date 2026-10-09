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
  it("gives stock back on any cancellation, including unpaid orders", () => {
    expect(restocksOnTransition("CANCELLED", "PENDING")).toBe(true);
    expect(restocksOnTransition("CANCELLED", "PAID")).toBe(true);
  });
  it("restocks a refund only while the goods have not shipped", () => {
    expect(restocksOnTransition("REFUNDED", "PAID")).toBe(true);
    expect(restocksOnTransition("REFUNDED", "PROCESSING")).toBe(true);
    expect(restocksOnTransition("REFUNDED", "SHIPPED")).toBe(false);
    expect(restocksOnTransition("REFUNDED", "DELIVERED")).toBe(false);
  });
});
