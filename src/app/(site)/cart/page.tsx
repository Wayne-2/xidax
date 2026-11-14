import type { Metadata } from "next";
import CartView from "@/components/CartView";

export const metadata: Metadata = {
  title: "Cart | Genericpcs",
  description: "Review the machines and accessories in your Genericpcs basket.",
};

export default function CartPage() {
  return (
    <main className="relative flex-1">
      <CartView />
    </main>
  );
}
