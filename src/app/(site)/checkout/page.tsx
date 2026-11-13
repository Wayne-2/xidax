import type { Metadata } from "next";
import CheckoutFlow from "@/components/CheckoutFlow";

export const metadata: Metadata = {
  title: "Checkout | Pcmart",
  description: "Complete your Pcmart order with crypto or wire transfer.",
};

export default function CheckoutPage() {
  return (
    <main className="relative flex-1">
      <CheckoutFlow />
    </main>
  );
}
