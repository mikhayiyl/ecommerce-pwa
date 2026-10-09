import CartView from "@/components/cart/CartView";

export const metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">Your cart</h1>
      <CartView />
    </>
  );
}
