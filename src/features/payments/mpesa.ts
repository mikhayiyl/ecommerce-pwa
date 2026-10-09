import { siteUrl } from "@/lib/site";
import { PaymentProviderError } from "@/features/payments/errors";

// ---------- Pure helpers (unit tested) ----------

/** Accepts 0712345678, 712345678, +254712345678 or 254712345678 and returns 254712345678, or null. */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  return null;
}

/** Daraja timestamp: YYYYMMDDHHmmss in East Africa Time (UTC+3, no daylight saving). */
export function mpesaTimestamp(now = new Date()): string {
  const eat = new Date(now.getTime() + 3 * 3_600_000);
  return eat.toISOString().replace(/\D/g, "").slice(0, 14);
}

export function mpesaPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

export type StkCallback = {
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  /** Whole shillings paid; only present on success. */
  amount: number | null;
  receipt: string | null;
};

/** Reads Safaricom's STK callback body defensively; returns null if it is not one. */
export function parseStkCallback(body: unknown): StkCallback | null {
  const cb = (body as { Body?: { stkCallback?: Record<string, unknown> } } | null)?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== "string") return null;
  const items = (cb.CallbackMetadata as { Item?: { Name?: string; Value?: unknown }[] } | undefined)?.Item ?? [];
  const pick = (name: string) => items.find((i) => i?.Name === name)?.Value;
  const amount = Number(pick("Amount"));
  const receipt = pick("MpesaReceiptNumber");
  return {
    checkoutRequestId: cb.CheckoutRequestID,
    resultCode: Number(cb.ResultCode),
    resultDesc: typeof cb.ResultDesc === "string" ? cb.ResultDesc : "",
    amount: Number.isFinite(amount) && pick("Amount") !== undefined ? amount : null,
    receipt: typeof receipt === "string" ? receipt : null,
  };
}

// ---------- Daraja API calls ----------

function env() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackSecret = process.env.MPESA_CALLBACK_SECRET;
  if (!key || !secret || !shortcode || !passkey || !callbackSecret) {
    throw new PaymentProviderError("M-Pesa payments are not available right now");
  }
  const base = process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  return {
    key,
    secret,
    shortcode,
    passkey,
    callbackSecret,
    base,
    // Paybill: CustomerPayBillOnline. Till number (Buy Goods): CustomerBuyGoodsOnline, with MPESA_PARTY_B set to the till.
    transactionType: process.env.MPESA_TRANSACTION_TYPE === "CustomerBuyGoodsOnline" ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
    partyB: process.env.MPESA_PARTY_B || shortcode,
  };
}

let cachedToken: { value: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 30_000) return cachedToken.value;
  const e = env();
  let res: Response;
  try {
    res = await fetch(`${e.base}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${Buffer.from(`${e.key}:${e.secret}`).toString("base64")}` },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    throw new PaymentProviderError("Could not reach M-Pesa. Please try again.");
  }
  const json = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: string } | null;
  if (!res.ok || !json?.access_token) {
    console.error("mpesa token failed", res.status);
    throw new PaymentProviderError("M-Pesa is unavailable right now. Please try again.");
  }
  cachedToken = { value: json.access_token, expires: Date.now() + (Number(json.expires_in) || 3000) * 1000 };
  return json.access_token;
}

async function daraja(path: string, payload: Record<string, unknown>) {
  const e = env();
  const token = await accessToken();
  let res: Response;
  try {
    res = await fetch(`${e.base}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new PaymentProviderError("Could not reach M-Pesa. Please try again.");
  }
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { res, json };
}

/** Sends the M-Pesa PIN prompt to the customer's phone. Returns Safaricom's CheckoutRequestID. */
export async function stkPush(input: {
  phone: string;
  amountWhole: number;
  accountReference: string;
}): Promise<{ checkoutRequestId: string }> {
  const e = env();
  const timestamp = mpesaTimestamp();
  const { res, json } = await daraja("/mpesa/stkpush/v1/processrequest", {
    BusinessShortCode: e.shortcode,
    Password: mpesaPassword(e.shortcode, e.passkey, timestamp),
    Timestamp: timestamp,
    TransactionType: e.transactionType,
    Amount: input.amountWhole,
    PartyA: input.phone,
    PartyB: e.partyB,
    PhoneNumber: input.phone,
    CallBackURL: `${siteUrl()}/api/webhooks/mpesa/${e.callbackSecret}`,
    AccountReference: input.accountReference.slice(0, 12),
    TransactionDesc: "Order payment",
  });
  const id = json?.CheckoutRequestID;
  if (!res.ok || String(json?.ResponseCode) !== "0" || typeof id !== "string") {
    console.error("mpesa stk push failed", res.status, json?.errorMessage ?? json?.ResponseDescription);
    throw new PaymentProviderError("Could not send the M-Pesa prompt. Check the phone number and try again.");
  }
  return { checkoutRequestId: id };
}

export type StkQuery = { state: "success" | "failed" | "pending"; reason: string };

/** Asks Safaricom for the outcome of a prompt when the callback has not arrived. */
export async function stkQuery(checkoutRequestId: string): Promise<StkQuery> {
  const e = env();
  const timestamp = mpesaTimestamp();
  const { json } = await daraja("/mpesa/stkpushquery/v1/query", {
    BusinessShortCode: e.shortcode,
    Password: mpesaPassword(e.shortcode, e.passkey, timestamp),
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  });
  // While the customer is still entering their PIN Daraja answers with an errorCode instead of a result.
  if (!json || json.errorCode !== undefined || json.ResultCode === undefined) return { state: "pending", reason: "" };
  const code = Number(json.ResultCode);
  const reason = typeof json.ResultDesc === "string" ? json.ResultDesc : "";
  return { state: code === 0 ? "success" : "failed", reason };
}
