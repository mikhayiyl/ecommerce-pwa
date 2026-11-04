import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    mpesaCallback: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    paymentAttempt: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/features/payments/settle", () => ({
  settleAttemptFailure: vi.fn(),
  settleAttemptSuccess: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/webhooks/mpesa/[secret]/route";
import {
  settleAttemptFailure,
  settleAttemptSuccess,
} from "@/features/payments/settle";

const successCallback = {
  Body: {
    stkCallback: {
      CheckoutRequestID: "ws_CO_123",
      ResultCode: 0,
      ResultDesc: "Success",
      CallbackMetadata: {
        Item: [
          { Name: "Amount", Value: 1250 },
          { Name: "MpesaReceiptNumber", Value: "QJK1ABC2DE" },
        ],
      },
    },
  },
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/webhooks/mpesa/test-secret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function makeContext(secret = "test-secret") {
  return { params: Promise.resolve({ secret }) };
}

async function postCallback(body: unknown, secret = "test-secret") {
  return POST(makeRequest(body), makeContext(secret));
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.stubEnv("MPESA_CALLBACK_SECRET", "test-secret");
  vi.mocked(prismaMock.mpesaCallback.upsert).mockResolvedValue({} as never);
  vi.mocked(prismaMock.mpesaCallback.update).mockResolvedValue({} as never);
});

describe("M-Pesa webhook", () => {
  it("rejects an invalid callback secret", async () => {
    const response = await postCallback(successCallback, "wrong-secret");

    expect(response.status).toBe(404);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
    expect(settleAttemptFailure).not.toHaveBeenCalled();
  });

  it("rejects requests when the callback secret is not configured", async () => {
    vi.stubEnv("MPESA_CALLBACK_SECRET", "");

    const response = await postCallback(successCallback);

    expect(response.status).toBe(404);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });

  it("acknowledges malformed JSON without settling a payment", async () => {
    const request = new Request(
      "http://localhost/api/webhooks/mpesa/test-secret",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid-json",
      },
    );

    const response = await POST(request, makeContext());

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
    expect(settleAttemptFailure).not.toHaveBeenCalled();
  });

  it("settles a successful callback using the reported amount and receipt", async () => {
    vi.mocked(settleAttemptSuccess).mockResolvedValue({
      ok: true,
      orderId: "order-123",
      changed: true,
      needsRefund: false,
    });

    vi.mocked(prismaMock.paymentAttempt.findUnique).mockResolvedValue({
      id: "attempt-123",
    } as never);
    const response = await postCallback(successCallback);

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).toHaveBeenCalledWith({
      reference: "ws_CO_123",
      checkoutRequestId: "ws_CO_123",
      amountCents: 125000,
      currency: "KES",
      receipt: "QJK1ABC2DE",
    });
    expect(settleAttemptFailure).not.toHaveBeenCalled();
    expect(prisma.mpesaCallback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          checkoutRequestId_resultCode: {
            checkoutRequestId: "ws_CO_123",
            resultCode: 0,
          },
        },
        create: expect.objectContaining({
          checkoutRequestId: "ws_CO_123",
          resultCode: 0,
          amountCents: 125000,
          receipt: "QJK1ABC2DE",
          status: "UNMATCHED",
        }),
        update: {},
      }),
    );

    expect(prisma.mpesaCallback.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          checkoutRequestId_resultCode: {
            checkoutRequestId: "ws_CO_123",
            resultCode: 0,
          },
        },
        data: expect.objectContaining({
          status: "RECONCILED",
          paymentAttemptId: "attempt-123",
        }),
      }),
    );
  });

  it("marks a successful settlement for review when the payment attempt cannot be linked", async () => {
    vi.mocked(settleAttemptSuccess).mockResolvedValue({
      ok: true,
      orderId: "order-123",
      changed: true,
      needsRefund: false,
    });

    vi.mocked(prismaMock.paymentAttempt.findUnique).mockResolvedValue(
      null as never,
    );

    const response = await postCallback(successCallback);

    expect(response.status).toBe(200);

    expect(prismaMock.mpesaCallback.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          checkoutRequestId_resultCode: {
            checkoutRequestId: "ws_CO_123",
            resultCode: 0,
          },
        },
        data: expect.objectContaining({
          status: "NEEDS_REVIEW",
          processingStatus: "NEEDS_REVIEW",
        }),
      }),
    );

    expect(prismaMock.mpesaCallback.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "RECONCILED",
        }),
      }),
    );
  });

  it("does not settle a successful callback with missing amount metadata", async () => {
    const callback = {
      Body: {
        stkCallback: {
          CheckoutRequestID: "ws_CO_456",
          ResultCode: 0,
          ResultDesc: "Success",
          CallbackMetadata: {
            Item: [{ Name: "MpesaReceiptNumber", Value: "QJK1ABC2DE" }],
          },
        },
      },
    };

    const response = await postCallback(callback);

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });

  it("records a failed or cancelled payment attempt", async () => {
    vi.mocked(settleAttemptFailure).mockResolvedValue({
      status: "RECONCILED",
      paymentAttemptId: "attempt-789",
    });
    const callback = {
      Body: {
        stkCallback: {
          CheckoutRequestID: "ws_CO_789",
          ResultCode: 1032,
          ResultDesc: "Request cancelled by user",
        },
      },
    };

    const response = await postCallback(callback);

    expect(response.status).toBe(200);

    expect(settleAttemptFailure).toHaveBeenCalledWith(
      "ws_CO_789",
      "Request cancelled by user",
      "ws_CO_789",
    );
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
    expect(prisma.mpesaCallback.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          checkoutRequestId_resultCode: {
            checkoutRequestId: "ws_CO_789",
            resultCode: 1032,
          },
        },
        data: expect.objectContaining({
          status: "RECONCILED",
          processingStatus: "RECONCILED",
          paymentAttemptId: "attempt-789",
        }),
      }),
    );
  });

  it("marks a failed callback for review when settlement needs review", async () => {
    vi.mocked(settleAttemptFailure).mockResolvedValue({
      status: "NEEDS_REVIEW",
      paymentAttemptId: "attempt-review-123",
    });

    const callback = {
      Body: {
        stkCallback: {
          CheckoutRequestID: "ws_CO_REVIEW",
          ResultCode: 1032,
          ResultDesc: "Request cancelled by user",
        },
      },
    };

    const response = await postCallback(callback);

    expect(response.status).toBe(200);
    expect(settleAttemptFailure).toHaveBeenCalledWith(
      "ws_CO_REVIEW",
      "Request cancelled by user",
      "ws_CO_REVIEW",
    );

    expect(prismaMock.mpesaCallback.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          checkoutRequestId_resultCode: {
            checkoutRequestId: "ws_CO_REVIEW",
            resultCode: 1032,
          },
        },
        data: expect.objectContaining({
          status: "NEEDS_REVIEW",
          processingStatus: "NEEDS_REVIEW",
          paymentAttemptId: "attempt-review-123",
        }),
      }),
    );
  });

  it("does not settle a callback with a null result code as success", async () => {
    const callback = {
      Body: {
        stkCallback: {
          ...successCallback.Body.stkCallback,
          ResultCode: null,
        },
      },
    };

    const response = await postCallback(callback);

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
    expect(settleAttemptFailure).not.toHaveBeenCalled();
  });

  it("does not settle a callback with an empty checkout request ID", async () => {
    const callback = {
      Body: {
        stkCallback: {
          ...successCallback.Body.stkCallback,
          CheckoutRequestID: " ",
        },
      },
    };

    const response = await postCallback(callback);

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
    expect(settleAttemptFailure).not.toHaveBeenCalled();
  });

  it("does not settle a successful callback with a negative amount", async () => {
    const callback = {
      Body: {
        stkCallback: {
          ...successCallback.Body.stkCallback,
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: -1250 },
              { Name: "MpesaReceiptNumber", Value: "QJK1ABC2DE" },
            ],
          },
        },
      },
    };

    const response = await postCallback(callback);

    expect(response.status).toBe(200);
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
  });

  it("preserves unmatched successful callback evidence without marking it reconciled", async () => {
    vi.mocked(settleAttemptSuccess).mockResolvedValue({
      ok: false,
      reason: "attempt_not_found",
    } as Awaited<ReturnType<typeof settleAttemptSuccess>>);

    const response = await postCallback(successCallback);

    expect(response.status).toBe(200);
    expect(prisma.mpesaCallback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          checkoutRequestId: "ws_CO_123",
          status: "UNMATCHED",
        }),
        update: {},
      }),
    );
    expect(prisma.mpesaCallback.update).not.toHaveBeenCalled();
  });

  it("records successful callbacks with missing amounts but does not settle them", async () => {
    const callback = {
      Body: {
        stkCallback: {
          CheckoutRequestID: "ws_CO_missing_amount",
          ResultCode: 0,
          ResultDesc: "Success",
          CallbackMetadata: {
            Item: [{ Name: "MpesaReceiptNumber", Value: "QJK1ABC2DE" }],
          },
        },
      },
    };

    const response = await postCallback(callback);

    expect(response.status).toBe(200);
    expect(prisma.mpesaCallback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          checkoutRequestId: "ws_CO_missing_amount",
          amountCents: null,
          status: "UNMATCHED",
        }),
      }),
    );
    expect(settleAttemptSuccess).not.toHaveBeenCalled();
    expect(prisma.mpesaCallback.update).not.toHaveBeenCalled();
  });

  it("preserves unmatched failed callback evidence for later reconciliation", async () => {
    vi.mocked(settleAttemptFailure).mockResolvedValue({
      status: "NOT_FOUND",
    });

    const callback = {
      Body: {
        stkCallback: {
          CheckoutRequestID: "ws_CO_unmatched_failure",
          ResultCode: 1032,
          ResultDesc: "Request cancelled by user",
        },
      },
    };

    const response = await postCallback(callback);

    expect(response.status).toBe(200);
    expect(settleAttemptFailure).toHaveBeenCalledWith(
      "ws_CO_unmatched_failure",
      "Request cancelled by user",
      "ws_CO_unmatched_failure",
    );

    expect(prisma.mpesaCallback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          checkoutRequestId: "ws_CO_unmatched_failure",
          resultCode: 1032,
          status: "UNMATCHED",
        }),
        update: {},
      }),
    );

    expect(prisma.mpesaCallback.update).not.toHaveBeenCalled();
  });
});
