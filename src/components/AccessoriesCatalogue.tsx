"use client";

import { useEffect, useRef, useState } from "react";
import AccessoryRail from "@/components/AccessoryRail";
import {
  AccessoryCategoryIcon,
  CartIcon,
} from "@/components/AccessoryIcons";
import { CheckIcon } from "@/components/BuildIcons";
import type { Accessory, AccessoryCategory } from "@/data/accessories";

type AccessoriesCatalogueProps = {
  categories: AccessoryCategory[];
  products: Accessory[];
};

type Toast = {
  id: number;
  message: string;
};

export default function AccessoriesCatalogue({
  categories,
  products,
}: AccessoriesCatalogueProps) {
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  function toggleProduct(product: Accessory) {
    const isAdded = addedIds.includes(product.id);

    setAddedIds((current) =>
      isAdded
        ? current.filter((id) => id !== product.id)
        : [...current, product.id],
    );

    setToast((current) => ({
      id: (current?.id ?? 0) + 1,
      message: isAdded
        ? `${product.name} removed from cart`
        : `${product.name} added to cart`,
    }));

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }

  return (
    <>
      <nav
        aria-label="Accessory categories"
        className="sticky top-16 z-40 border-y border-[#dce3ee] bg-[#f0f4fa]/90 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 pr-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
            Shop by category
          </span>
          {categories.map((category) => (
            <a
              key={category.id}
              href={`#${category.id}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-xs font-semibold text-[#4e5058] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
            >
              <AccessoryCategoryIcon
                category={category.id}
                className="h-3.5 w-3.5"
              />
              {category.navLabel}
            </a>
          ))}
          <span
            aria-live="polite"
            className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              addedIds.length > 0
                ? "border-[#5865F2] bg-[#5865F2] text-white"
                : "border-[#d2dbe8] bg-[#f8fafe] text-[#80848e]"
            }`}
          >
            <CartIcon className="h-3.5 w-3.5" />
            {addedIds.length} in cart
          </span>
        </div>
      </nav>

      <div className="bg-[#f0f4fa]">
        {categories.map((category) => (
          <AccessoryRail
            key={category.id}
            category={category}
            products={products.filter(
              (product) => product.category === category.id,
            )}
            addedIds={addedIds}
            onToggle={toggleProduct}
          />
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="animate-toast-in flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-[#d2dbe8] bg-[#2e3338] px-4 py-2.5 text-sm font-medium text-white shadow-xl"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5865F2]">
              <CheckIcon className="h-3 w-3" />
            </span>
            <span className="min-w-0 truncate">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
