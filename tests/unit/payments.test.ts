import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { availableMethods, chargeCents, mpesaWholeAmount } from "@/features/payments/methods";
import { mpesaPassword, mpesaTimestamp, normalizeKenyanPhone, parseStkCallback } from "@/features/payments/mpesa";
import { verifyPaystackSignature } from "@/features/payments/paystack";
import { holdUntil } from "@/features/orders/release";
import { safeEqual } from "@/lib/security/safe-equal";

afterEach(() => vi.unstubAllEnvs());

describe("normalizeKenyanPhone", () => {
  it("accepts the common ways of writing a Safaricom number", () => {
    for (const input of ["0712345678", "712345678", "+254712345678", "254712345678", "0712 345 678", "0712-345-678", "0112345678"]) {
      expect(normalizeKenyanPhone(input)).toMatch(/^254[17]\d{8}$/);
    }
    expect(normalizeKenyanPhone("0712345678")).toBe("254712345678");
  });
  it("rejects anything else", () => {
    for (const input of ["", "abc", "071234567", "07123456789", "0212345678", "+255712345678", "0712345678; drop"]) {
      expect(normalizeKenyanPhone(input)).toBeNull();
    }
  });
});

describe("M-Pesa request helpers", () => {
  it("builds a 14 digit East Africa Time timestamp", () => {
    expect(mpesaTimestamp(new Date("2026-10-09T21:05:09Z"))).toBe("20261010000509");
  });
  it("base64-encodes shortcode + passkey + timestamp", () => {
    expect(mpesaPassword("174379", "key", "20261010000509")).toBe(Buffer.from("174379key20261010000509").toString("base64"));
  });
});

describe("parseStkCallback", () => {
  const success = {
    Body: {
      stkCallback: {
        MerchantRequestID: "m1",
        CheckoutRequestID: "ws_CO_1",
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 1250 },
            { Name: "MpesaReceiptNumber", Value: "QJK1ABC2DE" },
            { Name: "PhoneNumber", Value: 254712345678 },
          ],
        },
      },
    },
  };
  it("reads a successful callback", () => {
    expect(parseStkCallback(success)).toEqual({
      checkoutRequestId: "ws_CO_1",
      resultCode: 0,
      resultDesc: "The service request is processed successfully.",
      amount: 1250,
      receipt: "QJK1ABC2DE",
    });
  });
  it("reads a failed callback that has no metadata", () => {
    const failed = { Body: { stkCallback: { CheckoutRequestID: "ws_CO_2", ResultCode: 1032, ResultDesc: "Request cancelled by user" } } };
    expect(parseStkCallback(failed)).toMatchObject({ checkoutRequestId: "ws_CO_2", resultCode: 1032, amount: null, receipt: null });
  });
  it("returns null for anything that is not an STK callback", () => {
    expect(parseStkCallback(null)).toBeNull();
    expect(parseStkCallback({})).toBeNull();
    expect(parseStkCallback({ Body: { stkCallback: { ResultCode: 0 } } })).toBeNull();
  });
});

describe("verifyPaystackSignature", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "r1", amount: 5000 } });
  const sign = (b: string, key: string) => createHmac("sha512", key).update(b).digest("hex");
  it("accepts a correct signature", () => {
    expect(verifyPaystackSignature(body, sign(body, "sk_test_x"), "sk_test_x")).toBe(true);
  });
  it("rejects a wrong key, a tampered body and a missing signature", () => {
    expect(verifyPaystackSignature(body, sign(body, "other"), "sk_test_x")).toBe(false);
    expect(verifyPaystackSignature(`${body} `, sign(body, "sk_test_x"), "sk_test_x")).toBe(false);
    expect(verifyPaystackSignature(body, null, "sk_test_x")).toBe(false);
  });
});

describe("payment methods", () => {
  it("offers nothing until a provider is configured", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    vi.stubEnv("MPESA_CONSUMER_KEY", "");
    expect(availableMethods("kes")).toEqual([]);
  });
  it("offers Paystack in any currency but M-Pesa only for KES", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk");
    vi.stubEnv("MPESA_CONSUMER_KEY", "k");
    vi.stubEnv("MPESA_CONSUMER_SECRET", "s");
    vi.stubEnv("MPESA_SHORTCODE", "174379");
    vi.stubEnv("MPESA_PASSKEY", "p");
    vi.stubEnv("MPESA_CALLBACK_SECRET", "c");
    expect(availableMethods("usd")).toEqual(["PAYSTACK"]);
    expect(availableMethods("KES")).toEqual(["PAYSTACK", "MPESA"]);
  });
  it("rounds M-Pesa up to whole shillings and leaves Paystack exact", () => {
    expect(mpesaWholeAmount(5599)).toBe(56);
    expect(mpesaWholeAmount(5600)).toBe(56);
    expect(chargeCents("MPESA", 5599)).toBe(5600);
    expect(chargeCents("PAYSTACK", 5599)).toBe(5599);
  });
});

describe("helpers", () => {
  it("compares secrets in constant time, whatever their length", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });
  it("computes the order hold deadline", () => {
    const now = new Date("2026-10-10T10:00:00Z");
    expect(holdUntil(now).toISOString()).toBe("2026-10-10T10:30:00.000Z");
    expect(holdUntil(now, 15).toISOString()).toBe("2026-10-10T10:15:00.000Z");
  });
});
