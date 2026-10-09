export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function allowedTransitions(from: OrderStatusValue) {
  return TRANSITIONS[from];
}

export function canTransition(from: OrderStatusValue, to: OrderStatusValue) {
  return TRANSITIONS[from].includes(to);
}

export function paymentStatusFor(to: OrderStatusValue, current: "UNPAID" | "PAID" | "FAILED" | "REFUNDED") {
  if (to === "PAID") return "PAID" as const;
  if (to === "REFUNDED") return "REFUNDED" as const;
  return current;
}

/**
 * Stock is reserved when an order is placed (even while it is still PENDING), so every cancellation
 * gives it back. A refund only does so while the goods have not left the warehouse; once shipped
 * they have to come back before anyone can restock them, which is a manual step.
 */
export function restocksOnTransition(to: OrderStatusValue, from?: OrderStatusValue) {
  if (to === "CANCELLED") return true;
  if (to === "REFUNDED") return from === undefined || from === "PAID" || from === "PROCESSING";
  return false;
}

export const statusTone = {
  PENDING: "yellow",
  PAID: "blue",
  PROCESSING: "blue",
  SHIPPED: "blue",
  DELIVERED: "green",
  CANCELLED: "red",
  REFUNDED: "gray",
} as const;
