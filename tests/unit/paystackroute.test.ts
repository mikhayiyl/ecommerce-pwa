import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/payments/paystack", () => ({
  verifyPaystackSignature: vi.fn(),
}));

vi.mock("@/features/payments/settle", () => ({
  settleAttemptSuccess: vi.fn(),
}));

import { POST } from "@/app/api/webhooks/paystack/route";
import { verifyPaystackSignature } from "@/features/payments/paystack";
import { settleAttemptSuccess } from "@/features/payments/settle";

const successEvent = {
  event: "charge.success",
  data: {
    reference: "paystack-ref-123",
    amount: 125000,
    currency: "KES",
    status: "success",
    id: "receipt-123",
  },
};

function makeRequest(
  body: string,
  signature: string | null = "valid-signature",
) {
  const headers = new Headers();

  if (signature !== null) {
    headers.set("x-paystack-signature", signature);
  }

  return new Request("http://localhost/api/webhooks/paystack", {
    method: "POST",
    headers,
    body,
  });
}

async function postEvent(
  body: unknown,
  signature: string | null = "valid-signature",
) {
  return POST(
    makeRequest(
      typeof body === "string" ? body : JSON.stringify(body),
      signature,
    ),
  );
}

beforeEach(() => {
  vi.stubEnv("PAYSTACK_SECRET_KEY", "test-paystack-secret");
  vi.mocked(verifyPaystackSignature).mockReturnValue(true);

  vi.mocked(settleAttemptSuccess).mockResolvedValue({
    ok: true,
    orderId: "order-123",
    changed: true,
    needsRefund: false,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("Paystack webhook", () => {
  it("returns 503 when the Paystack secret is not configured", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");

    const response = await postEvent(successEvent);

    expect(response.status).toBe(503);
    expect(verifyPaystackSignature).not.toHaveBeenCalled();
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });

  it("rejects a missing signature", async () => {
    vi.mocked(verifyPaystackSignature).mockReturnValue(false);

    const response = await postEvent(successEvent, null);

    expect(response.status).toBe(401);
    expect(verifyPaystackSignature).toHaveBeenCalledWith(
      JSON.stringify(successEvent),
      null,
      "test-paystack-secret",
    );
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature", async () => {
    vi.mocked(verifyPaystackSignature).mockReturnValue(false);

    const response = await postEvent(successEvent, "invalid-signature");

    expect(response.status).toBe(401);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON with a valid signature", async () => {
    const response = await postEvent("{invalid-json");

    expect(response.status).toBe(400);
    expect(verifyPaystackSignature).toHaveBeenCalled();
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });

  it("ignores unrelated payment events", async () => {
    const response = await postEvent({
      event: "charge.failed",
      data: {
        reference: "paystack-ref-123",
        status: "failed",
      },
    });

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });

  it("settles a successful charge with the provider's payment details", async () => {
    const response = await postEvent(successEvent);

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).toHaveBeenCalledWith({
      reference: "paystack-ref-123",
      amountCents: 125000,
      currency: "KES",
      receipt: "receipt-123",
    });
  });

  it("does not settle a charge whose status is not successful", async () => {
    const response = await postEvent({
      event: "charge.success",
      data: {
        reference: "paystack-ref-123",
        amount: 125000,
        currency: "KES",
        status: "failed",
      },
    });

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });

  it("does not settle a charge with a non-numeric amount", async () => {
    const response = await postEvent({
      event: "charge.success",
      data: {
        ...successEvent.data,
        amount: "not-a-number",
      },
    });

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });

  it("does not settle a charge with a missing amount", async () => {
    const dataWithoutAmount = {
      reference: successEvent.data.reference,
      currency: successEvent.data.currency,
      status: successEvent.data.status,
      id: successEvent.data.id,
    };
    const response = await postEvent({
      event: "charge.success",
      data: dataWithoutAmount,
    });

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });

  it("does not settle a charge with a non-string currency", async () => {
    const response = await postEvent({
      event: "charge.success",
      data: {
        ...successEvent.data,
        currency: 123,
      },
    });

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });

  it("does not settle a charge with an empty reference", async () => {
    const response = await postEvent({
      event: "charge.success",
      data: {
        ...successEvent.data,
        reference: "",
      },
    });

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });
});
