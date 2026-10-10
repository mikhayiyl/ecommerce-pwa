// Client-safe: no secrets, only which payment methods a store can offer.

export type PaymentMethod = "PAYSTACK" | "MPESA";

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  PAYSTACK: "Card, bank or mobile money (Paystack)",
  MPESA: "M-Pesa",
};

export function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function mpesaConfigured(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CALLBACK_SECRET,
  );
}

/** M-Pesa only moves Kenyan shillings; Paystack accepts whatever currencies the merchant account has enabled. */
export function availableMethods(currency: string): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  if (paystackConfigured()) methods.push("PAYSTACK");
  if (mpesaConfigured() && currency.toUpperCase() === "KES") methods.push("MPESA");
  return methods;
}

/** Whole shillings M-Pesa will charge for an order total: it cannot take cents, so it rounds up. */
export function mpesaWholeAmount(totalCents: number): number {
  return Math.ceil(totalCents / 100);
}

/** The charge, in minor units of the order currency, that a provider should report back for an order. */
export function chargeCents(method: PaymentMethod, totalCents: number): number {
  return method === "MPESA" ? mpesaWholeAmount(totalCents) * 100 : totalCents;
}
