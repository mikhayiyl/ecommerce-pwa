import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/site", () => ({
  siteUrl: () => "https://example.com",
}));

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function loadMpesa() {
  const mpesa = await import("@/features/payments/mpesa");
  const errors = await import("@/features/payments/errors");

  return { ...mpesa, ...errors };
}

function mockSuccessfulOAuth() {
  fetchMock.mockResolvedValueOnce(
    jsonResponse({
      access_token: "test-access-token",
      expires_in: "3600",
    }),
  );
}

const stkInput = {
  phone: "254712345678",
  amountWhole: 1250,
  accountReference: "ORDER123456",
};

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();

  vi.stubGlobal("fetch", fetchMock);

  vi.stubEnv("MPESA_CONSUMER_KEY", "test-key");
  vi.stubEnv("MPESA_CONSUMER_SECRET", "test-secret");
  vi.stubEnv("MPESA_SHORTCODE", "174379");
  vi.stubEnv("MPESA_PASSKEY", "test-passkey");
  vi.stubEnv("MPESA_CALLBACK_SECRET", "callback-secret");
  vi.stubEnv("MPESA_ENV", "sandbox");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("stkPush", () => {
  it("returns both provider IDs after a successful STK Push", async () => {
    mockSuccessfulOAuth();

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ResponseCode: "0",
        CheckoutRequestID: "ws_CO_456",
        MerchantRequestID: "29115-123456-1",
      }),
    );

    const { stkPush } = await loadMpesa();

    await expect(stkPush(stkInput)).resolves.toEqual({
      checkoutRequestId: "ws_CO_456",
      merchantRequestId: "29115-123456-1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("allows a successful response without MerchantRequestID", async () => {
    mockSuccessfulOAuth();

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ResponseCode: "0",
        CheckoutRequestID: "ws_CO_456",
      }),
    );

    const { stkPush } = await loadMpesa();

    await expect(stkPush(stkInput)).resolves.toEqual({
      checkoutRequestId: "ws_CO_456",
      merchantRequestId: null,
    });
  });

  it("classifies an HTTP 500 response as an unknown outcome", async () => {
    mockSuccessfulOAuth();

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          errorMessage: "Internal server error",
        },
        500,
      ),
    );

    const { stkPush, PaymentOutcomeUnknownError } = await loadMpesa();

    await expect(stkPush(stkInput)).rejects.toBeInstanceOf(
      PaymentOutcomeUnknownError,
    );
  });

  it("classifies a successful HTTP response without CheckoutRequestID as unknown", async () => {
    mockSuccessfulOAuth();

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ResponseCode: "0",
        MerchantRequestID: "29115-123456-1",
      }),
    );

    const { stkPush, PaymentOutcomeUnknownError } = await loadMpesa();

    await expect(stkPush(stkInput)).rejects.toBeInstanceOf(
      PaymentOutcomeUnknownError,
    );
  });

  it("classifies a blank CheckoutRequestID as unknown", async () => {
    mockSuccessfulOAuth();

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ResponseCode: "0",
        CheckoutRequestID: "   ",
      }),
    );

    const { stkPush, PaymentOutcomeUnknownError } = await loadMpesa();

    await expect(stkPush(stkInput)).rejects.toBeInstanceOf(
      PaymentOutcomeUnknownError,
    );
  });

  it("classifies an explicit Safaricom rejection as a provider error", async () => {
    mockSuccessfulOAuth();

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ResponseCode: "1",
        ResponseDescription: "Invalid MSISDN",
      }),
    );

    const { stkPush, PaymentProviderError, PaymentOutcomeUnknownError } =
      await loadMpesa();

    await expect(stkPush(stkInput)).rejects.toBeInstanceOf(
      PaymentProviderError,
    );

    await expect(stkPush(stkInput)).rejects.not.toBeInstanceOf(
      PaymentOutcomeUnknownError,
    );
  });

  it("classifies a network failure during STK Push as an unknown outcome", async () => {
    mockSuccessfulOAuth();

    fetchMock.mockRejectedValueOnce(new TypeError("Network connection lost"));

    const { stkPush, PaymentProviderError } = await loadMpesa();

    await expect(stkPush(stkInput)).rejects.toBeInstanceOf(
      PaymentProviderError,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
