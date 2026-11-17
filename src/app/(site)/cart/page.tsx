import type { Metadata } from "next";
import CartView from "@/components/CartView";

export const metadata: Metadata = {
  title: "Cart | generic pcs",
  description: "Review the machines and consoles in your generic pcs basket.",
};

export default function CartPage() {
  return (
    <main className="relative flex-1">
      <CartView />
    </main>
  );
}
