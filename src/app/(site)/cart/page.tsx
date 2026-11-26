"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import CartView from "@/components/CartView";
import { useAccount } from "@/components/AccountProvider";

export default function CartPage() {
  const { token, ready } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (ready && !token) router.replace("/login?next=%2Fcart");
  }, [ready, token, router]);

  if (!ready) return <main className="relative flex-1" />;
  if (!token) return null;

  return (
    <main className="relative flex-1">
      <CartView />
    </main>
  );
}
