import Link from "next/link";
import ReviewForm from "@/components/products/ReviewForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProductReviews({ productId, slug }: { productId: string; slug: string }) {
  const session = await auth();
  const userId = session?.user?.id;
  const [reviews, mine] = await Promise.all([
    prisma.review.findMany({
      where: { productId, hidden: false },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    userId ? prisma.review.findUnique({ where: { productId_userId: { productId, userId } } }) : null,
  ]);

  return (
    <section aria-labelledby="reviews" className="space-y-6">
      <h2 id="reviews" className="text-2xl font-semibold">Customer reviews ({reviews.length})</h2>
      {reviews.length === 0 && <p className="text-muted">No reviews yet. Be the first to share your thoughts.</p>}
      <ul className="space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{r.user.name ?? "Customer"}</span>
              <span className="text-muted">{r.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
            </div>
            <p className="text-amber-400" aria-label={`${r.rating} out of 5 stars`}>
              {"★".repeat(r.rating)}
              <span className="text-muted">{"★".repeat(5 - r.rating)}</span>
            </p>
            <p className="mt-1 text-sm text-muted">{r.comment}</p>
          </li>
        ))}
      </ul>
      {userId ? (
        <ReviewForm productId={productId} initial={mine ? { rating: mine.rating, comment: mine.comment } : undefined} />
      ) : (
        <p className="text-sm">
          <Link href={`/login?callbackUrl=/products/${slug}`} className="text-accent hover:underline">Sign in</Link>{" "}
          to write a review.
        </p>
      )}
    </section>
  );
}
