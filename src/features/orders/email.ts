import { prisma } from "@/lib/prisma";
import { escapeHtml, sendEmail } from "@/lib/email";
import { formatPrice } from "@/lib/utils";
import { siteUrl } from "@/lib/site";

/** Best-effort payment confirmation; a failure here must never undo a payment. */
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return;
    const money = (cents: number) => escapeHtml(formatPrice(cents, order.currency));
    const rows = order.items
      .map((i) => `<tr><td>${i.quantity} × ${escapeHtml(i.name)}</td><td align="right">${money(i.priceCents * i.quantity)}</td></tr>`)
      .join("");
    await sendEmail({
      to: order.email,
      subject: `Payment received for order #${order.number}`,
      html: `<p>Thanks for your order! We received your payment for order <strong>#${order.number}</strong>.</p>
<table cellpadding="4">${rows}<tr><td><strong>Total</strong></td><td align="right"><strong>${money(order.totalCents)}</strong></td></tr></table>
<p>Track it any time: <a href="${siteUrl()}/checkout/success?order=${encodeURIComponent(order.id)}">view your order</a>.</p>`,
    });
  } catch (e) {
    console.error("order confirmation failed", e);
  }
}
