import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CartSyncBoundary from "@/components/cart/CartSyncBoundary";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <CartSyncBoundary />
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <Footer />
    </>
  );
}
