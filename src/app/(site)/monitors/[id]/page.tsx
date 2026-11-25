import type { Metadata } from "next";
import ProductDetail from "@/components/ProductDetail";
import RevealObserver from "@/components/RevealObserver";

export const metadata: Metadata = {
  title: "Product | generic pcs",
};

export default function ProductPage() {
  return (
    <>
      <ProductDetail kind="consoles" />
      <RevealObserver />
    </>
  );
}
