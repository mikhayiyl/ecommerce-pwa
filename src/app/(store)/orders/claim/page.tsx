import Link from "next/link";
import { auth } from "@/lib/auth";
import ClaimOrderForm from "./claim-order-form";

type ClaimPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ClaimOrderPage({ searchParams }: ClaimPageProps) {
  const params = await searchParams;
  const token =
    typeof params.token === "string" && params.token.length <= 200
      ? params.token
      : null;

  const session = await auth();

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Customer account
        </p>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
          Claim your guest order
        </h1>

        {!token ? (
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            This claim link is missing or invalid. Request a new claim link
            using the email address from your checkout.
          </p>
        ) : !session?.user?.id ? (
          <>
            <p className="mt-4 text-sm leading-6 text-neutral-600">
              Sign in to the customer account that uses the email address
              associated with your guest order. You will return here to confirm
              the claim.
            </p>

            <Link
              href={`/login?callbackUrl=${encodeURIComponent(
                `/orders/claim?token=${encodeURIComponent(token)}`,
              )}`}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Sign in to continue
            </Link>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm leading-6 text-neutral-600">
              Confirm below to link your guest order to your account. We will
              verify your account email and the claim link before making any
              changes.
            </p>

            <ClaimOrderForm token={token} />
          </>
        )}
      </section>
    </main>
  );
}
