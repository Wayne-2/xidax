"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/components/AccountProvider";
import { useCart } from "@/components/CartProvider";
import { useRegion } from "@/components/RegionProvider";
import { useToast } from "@/components/ToastProvider";
import { CheckIcon } from "@/components/BuildIcons";

export default function CartView() {
  const { token, ready: accountReady } = useAccount();
  const router = useRouter();
  const {
    items,
    count,
    subtotal,
    promo,
    ready,
    remove,
    setQuantity,
    clear,
    applyPromo,
    clearPromo,
  } = useCart();

  useEffect(() => { if (accountReady && !token) router.replace("/login?next=%2Fcart"); }, [accountReady, token, router]);
  if (!accountReady || !token) return null;

  const { formatMoney } = useRegion();
  const toast = useToast();
  const [promoInput, setPromoInput] = useState("");

  const productDiscount = items.reduce((sum, item) => {
    if (!item.promoEnabled || !item.promoCode) return sum;
    return sum + item.price * item.quantity * ((item.promoDiscount ?? 0) / 100);
  }, 0);
  const discount = productDiscount > 0
    ? Math.round(productDiscount * 100) / 100
    : promo
      ? Math.round(subtotal * promo.rate * 100) / 100
      : 0;
  const discounted = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const shipping = items.length === 0 || discounted >= 99 ? 0 : 19;
  const total = Math.round((discounted + shipping) * 100) / 100;

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="h-40 animate-pulse rounded-2xl bg-[#dce3ee]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-md rounded-2xl border border-[#dce3ee] bg-white p-10 text-center shadow-card">
          <h1 className="text-2xl font-extrabold text-[#2e3338]">Your cart is empty</h1>
          <p className="mt-2 text-sm text-[#5c5e66]">
            Browse the store and add something you like.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/prebuilds" className="rounded-xl bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4752C4]">
              Prebuilds
            </Link>
            <Link href="/laptops" className="rounded-xl border border-[#d2dbe8] px-5 py-2.5 text-sm font-semibold text-[#5c5e66] hover:border-[#5865F2]/50">
              Laptops
            </Link>
            <Link href="/monitors" className="rounded-xl border border-[#d2dbe8] px-5 py-2.5 text-sm font-semibold text-[#5c5e66] hover:border-[#5865F2]/50">
              Monitors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#2e3338]">Cart</h1>
          <p className="mt-1 text-sm text-[#5c5e66]">{count} item{count === 1 ? "" : "s"}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            clear();
            toast.error("Cart cleared.");
          }}
          className="text-sm font-semibold text-[#B91C1C] hover:text-[#991B1B]"
        >
          Clear cart
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-4 rounded-2xl border border-[#dce3ee] bg-white p-4 shadow-card"
            >
              <Link
                href={item.href}
                className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#f0f4fa]"
              >
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wide text-[#80848e]">
                    {item.kind}
                  </span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={item.href} className="block truncate font-semibold text-[#2e3338] hover:text-[#5865F2]">
                      {item.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-[#80848e]">{item.meta}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      remove(item.id);
                      toast.error(`${item.name} removed from cart.`);
                    }}
                    aria-label={`Remove ${item.name} from cart`}
                    className="shrink-0 text-lg leading-none text-[#B91C1C] hover:text-[#991B1B]"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded-lg border border-[#d2dbe8]">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, item.quantity - 1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                      className="h-8 w-9 text-lg text-[#5c5e66] hover:text-[#2e3338]"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, item.quantity + 1)}
                      aria-label={`Increase quantity of ${item.name}`}
                      className="h-8 w-9 text-lg text-[#5c5e66] hover:text-[#2e3338]"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-bold text-[#2e3338]">
                    {formatMoney(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-[#2e3338]">Summary</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#5c5e66]">Subtotal</dt>
              <dd className="font-semibold">{formatMoney(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[#15803D]">
                <dt className="flex items-center gap-1">
                  <CheckIcon className="h-3.5 w-3.5" />
                  {promo?.code ?? items.find((item) => item.promoEnabled && item.promoCode)?.promoCode}
                </dt>
                <dd className="font-semibold">−{formatMoney(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[#5c5e66]">Shipping</dt>
              <dd className="font-semibold">{shipping === 0 ? "Free" : formatMoney(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-[#dce3ee] pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatMoney(total)}</dd>
            </div>
          </dl>

          <div className="mt-4">
            <label htmlFor="promo" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">
              Promo code
            </label>
            <div className="flex gap-2">
              <input
                id="promo"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="PCM-ABC123"
                className="h-10 min-w-0 flex-1 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3 text-sm uppercase outline-none focus:border-[#5865F2]"
              />
              <button
                type="button"
                onClick={() => {
                  const error = applyPromo(promoInput);
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  setPromoInput("");
                  toast.success("Promo applied.");
                }}
                className="h-10 rounded-xl border border-[#d2dbe8] px-4 text-sm font-semibold text-[#5c5e66] hover:border-[#5865F2]/50"
              >
                Apply
              </button>
            </div>
            {promo && (
              <button
                type="button"
                onClick={() => {
                  clearPromo();
                  toast.error("Promo removed.");
                }}
                className="mt-2 text-xs font-semibold text-[#B91C1C]"
              >
                Remove promo
              </button>
            )}
            <p className="mt-3 text-base text-[#5c5e66]">Generic Pc&apos;s come with a keyboard and a mouse</p>
            <p className="mt-1 text-base text-[#5c5e66]">Free shipping: Est. Delivery in 3-5 business days</p>
          </div>

          <Link
            href="/checkout?verify=1"
            className="mt-5 flex h-12 items-center justify-center rounded-xl bg-[#5865F2] text-sm font-semibold text-white hover:bg-[#4752C4]"
          >
            Checkout · {formatMoney(total)}
          </Link>
        </aside>
      </div>
    </div>
  );
}
