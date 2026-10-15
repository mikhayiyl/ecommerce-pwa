"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { siteUrl } from "@/lib/site";
import { escapeHtml, sendEmail } from "@/lib/email";
import { createGuestOrderClaimToken } from "@/features/orders/guest-claim-token";
import { auth } from "@/lib/auth";
import { hashGuestOrderClaimToken } from "@/features/orders/guest-claim-token";

const requestSchema = z.string().min(1).max(40);

export type GuestOrderClaimRequestResult = {
  ok: true;
  message: string;
};

const genericMessage =
  "If this guest order is eligible, a claim link will be sent to the email used at checkout. The link expires after 30 minutes.";

export async function requestGuestOrderClaimAction(
  input: unknown,
): Promise<GuestOrderClaimRequestResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: true, message: genericMessage };
  }

  const orderId = parsed.data;

  try {
    const ip = await clientIp();

    if (
      !rateLimit(`guest-claim:${ip}`, 5) ||
      !rateLimit(`guest-claim-order:${orderId}`, 3)
    ) {
      return { ok: true, message: genericMessage };
    }

    const tokenData = createGuestOrderClaimToken();

    const eligibleOrder = await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            number: true,
            email: true,
            userId: true,
          },
        });

        if (!order || order.userId !== null) return null;

        // Replace earlier claim links for this order.
        await tx.guestOrderClaimToken.deleteMany({
          where: { orderId: order.id },
        });

        await tx.guestOrderClaimToken.create({
          data: {
            orderId: order.id,
            tokenHash: tokenData.tokenHash,
            expiresAt: tokenData.expiresAt,
          },
        });

        return order;
      },
      { isolationLevel: "Serializable" },
    );

    if (!eligibleOrder) {
      return { ok: true, message: genericMessage };
    }

    const claimUrl = `${siteUrl()}/orders/claim?token=${encodeURIComponent(tokenData.token)}`;

    const emailAccepted = await sendEmail({
      to: eligibleOrder.email,
      subject: "Claim your guest order",
      html: `
        <div>
          <h1>Claim your guest order</h1>
          <p>
            You requested to connect guest order
            #${eligibleOrder.number} to your customer account.
          </p>
          <p>
            Sign in to the account using the email address associated with
            this order, then confirm the claim.
          </p>
          <p>
          <a href="${escapeHtml(claimUrl)}">Review and claim your order</a>
          </p>
          <p>This link expires in 30 minutes and can only be used once.</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });

    if (!emailAccepted) {
      // Avoid exposing order eligibility through the action response.
      // The generic response remains the same whether an order exists or not.
      console.error(
        "Guest order claim email was not accepted by the email provider",
      );
    }
  } catch (error) {
    console.error("Guest order claim request failed", error);
  }

  return { ok: true, message: genericMessage };
}

const confirmClaimSchema = z.string().min(20).max(200);

export type ConfirmGuestOrderClaimResult = {
  ok: boolean;
  message: string;
};

const invalidClaimMessage =
  "This claim link is invalid, expired, already used, or not eligible for this account.";

export async function confirmGuestOrderClaimAction(
  input: unknown,
): Promise<ConfirmGuestOrderClaimResult> {
  const parsed = confirmClaimSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: invalidClaimMessage };
  }

  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "Please sign in before claiming your guest order.",
    };
  }

  try {
    const ip = await clientIp();

    if (!rateLimit(`guest-claim-confirm:${ip}`, 10)) {
      return {
        ok: false,
        message: "Too many attempts. Please try again later.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, disabled: true },
    });

    if (!user || user.disabled || !user.email) {
      return { ok: false, message: invalidClaimMessage };
    }

    const tokenHash = hashGuestOrderClaimToken(parsed.data);
    const now = new Date();

    const claimed = await prisma.$transaction(async (tx) => {
      const claimToken = await tx.guestOrderClaimToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          expiresAt: true,
          consumedAt: true,
          order: {
            select: {
              id: true,
              email: true,
              userId: true,
            },
          },
        },
      });

      if (
        !claimToken ||
        claimToken.expiresAt <= now ||
        claimToken.consumedAt !== null ||
        claimToken.order.userId !== null ||
        claimToken.order.email.trim().toLowerCase() !==
          user.email.trim().toLowerCase()
      ) {
        return false;
      }

      // Consume the token only if it is still valid and unused.
      const consumed = await tx.guestOrderClaimToken.updateMany({
        where: {
          id: claimToken.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        return false;
      }

      // Assign the order only if it is still a guest order.
      const assigned = await tx.order.updateMany({
        where: {
          id: claimToken.order.id,
          userId: null,
          email: claimToken.order.email,
        },
        data: { userId: user.id },
      });

      if (assigned.count !== 1) {
        // Throwing rolls back token consumption as well.
        throw new Error("GUEST_ORDER_CLAIM_CONFLICT");
      }

      return true;
    });

    if (!claimed) {
      return { ok: false, message: invalidClaimMessage };
    }

    return {
      ok: true,
      message: "Your guest order has been successfully linked to your account.",
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "GUEST_ORDER_CLAIM_CONFLICT"
    ) {
      return { ok: false, message: invalidClaimMessage };
    }

    console.error("Guest order claim confirmation failed", error);

    return {
      ok: false,
      message: "We couldn't claim this order right now. Please try again.",
    };
  }
}
