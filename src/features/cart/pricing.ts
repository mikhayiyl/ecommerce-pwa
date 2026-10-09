export const FREE_SHIPPING_THRESHOLD_CENTS = 10000;
export const FLAT_SHIPPING_CENTS = 599;
export const MAX_QTY_PER_ITEM = 10;

export type CartTotals = {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
};

export function calculateTotals(subtotalCents: number, discountCents = 0): CartTotals {
  const discounted = Math.max(0, subtotalCents - discountCents);
  const shippingCents =
    subtotalCents === 0 || discounted >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
  return {
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: discounted + shippingCents,
  };
}
