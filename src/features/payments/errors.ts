/** A payment provider refused or failed a request; the message is safe to show to the customer. */
export class PaymentProviderError extends Error {}

/**
 * The payment request may have reached the provider, but its outcome
 * could not be confirmed. Do not treat this as a definite failure.
 */
export class PaymentOutcomeUnknownError extends PaymentProviderError {}
