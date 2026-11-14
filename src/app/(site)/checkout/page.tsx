import type { Metadata } from "next";
import CheckoutFlow from "@/components/CheckoutFlow";

export const metadata: Metadata = {
  title: "Checkout | generic pcs",
  description: "Complete your generic pcs order with crypto or wire transfer.",
};

export default function CheckoutPage() {
  return (
    <main className="relative flex-1">
      <CheckoutFlow />
    </main>
  );
}
