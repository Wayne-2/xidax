"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowIcon, CheckIcon } from "@/components/BuildIcons";
import { useAccount } from "@/components/AccountProvider";
import { useCart } from "@/components/CartProvider";
import { useRegion } from "@/components/RegionProvider";
import { useToast } from "@/components/ToastProvider";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import {
  createCheckoutSession,
  remotePaymentsEnabled,
  submitPayment,
} from "@/lib/api";
import {
  cryptoNetworks,
  gatewayMethodLabels,
  paymentMethods,
  type CheckoutSession,
  type CryptoNetwork,
  type PaymentMethod,
} from "@/lib/payments";

function StepBadge({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
          done
            ? "bg-[#16A34A] text-white"
            : active
              ? "bg-[#5865F2] text-white"
              : "border border-[#d2dbe8] bg-[#f8fafe] text-[#80848e]"
        }`}
      >
        {done ? <CheckIcon className="h-3.5 w-3.5" /> : index}
      </span>
      <span
        className={`text-xs font-semibold uppercase tracking-[0.14em] ${
          active ? "text-[#2e3338]" : "text-[#80848e]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function CheckoutFlow() {
  const { token } = useAccount();
  const router = useRouter();
  const { items, subtotal, ready } = useCart();
  const { user } = useAccount();
  const { region, formatMoney, formatBase, clock, setCountry: setRegionCountry } =
    useRegion();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState("");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [network, setNetwork] = useState<CryptoNetwork>("usdt");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [now, setNow] = useState(0);

  const shipping = subtotal >= 99 || subtotal === 0 ? 0 : 19;
  const total = subtotal + shipping;
  const selectedMethod: PaymentMethod = method ?? region.payment;
  const countryValue = country ?? user?.country ?? region.country;

  useEffect(() => {
    if (!user) return;

    const timer = window.setTimeout(() => {
      setName((current) => current || user.name);
      setEmail((current) => current || user.email);
      setPhone((current) => current || user.phone);
      setCountry((current) => current || user.country);
      setPostalCode((current) => current || user.postalCode);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (ready && items.length === 0) {
      router.replace("/cart");
    }
  }, [ready, items.length, router]);

  useEffect(() => {
    if (!session) return;

    const update = () => setNow(Date.now());
    const frame = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1000);

    return () => {
      window.clearTimeout(frame);
      window.clearInterval(timer);
    };
  }, [session]);

  const lines = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.category,
        price: item.price,
        quantity: item.quantity,
      })),
    [items]
  );

  const remaining = session
    ? Math.max(0, new Date(session.expiresAt).getTime() - now)
    : 0;
  const countdown = `${String(Math.floor(remaining / 60000)).padStart(2, "0")}:${String(
    Math.floor((remaining % 60000) / 1000)
  ).padStart(2, "0")}`;

  const instructions = session?.instructions;
  const cryptoNetworkId =
    instructions?.method === "crypto" ? instructions.network : null;
  const cryptoNetwork = cryptoNetworkId
    ? cryptoNetworks.find((entry) => entry.value === cryptoNetworkId)
    : undefined;

  function validateDetails() {
    const next: Record<string, string> = {};

    if (!name.trim()) next.name = "Tell us who the order is for.";
    if (!email.trim()) {
      next.email = "We need an email for the receipt.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "That email address does not look right.";
    }
    if (!phone.trim()) next.phone = "Add a phone number for delivery.";
    if (!countryValue.trim()) next.country = "Choose the delivery country.";
    if (!postalCode.trim()) next.postalCode = "Add the delivery postal code.";

    setErrors(next);

    return Object.keys(next).length === 0;
  }

  const {
    run: startPayment,
    pending: startingPayment,
    error: paymentError,
  } = useAsyncAction(
    async () => {
      const created = await createCheckoutSession({
        lines,
        details: { name, email, phone, country: countryValue, postalCode },
        method: selectedMethod,
        network: selectedMethod === "crypto" ? network : undefined,
        subtotal,
        shipping,
        total,
        currency: "USD",
      }, token);

      setSession(created);
      setNow(Date.now());
      setStep(3);
    },
    {
      silent: true,
      fallback: "We could not start the payment. Try again.",
    }
  );

  const { run: confirmPayment, pending: confirmingPayment } = useAsyncAction(
    async (sessionId: string) => {
      await submitPayment(sessionId);
      setSession((current) =>
        current ? { ...current, status: "submitted" } : current
      );
      toast.success("Thanks — we have your note. We release the build once it clears.");
    },
    {
      fallback: "We could not record that. Try again in a moment.",
      retry: true,
    }
  );

  const fieldClass =
    "h-11 w-full rounded-xl border bg-[#f8fafe] px-3.5 text-sm text-[#2e3338] outline-none transition-colors placeholder:text-[#80848e]";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm font-medium text-[#5c5e66]"
      >
        <Link href="/cart" className="transition-colors hover:text-[#5865F2]">
          Cart
        </Link>
        <span aria-hidden="true" className="text-[#80848e]">
          /
        </span>
        <span className="text-[#2e3338]">Checkout</span>
      </nav>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5865F2]">
            Secure checkout
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#2e3338] sm:text-5xl">
            CHECKOUT
          </h1>
        </div>
        <div className="text-sm font-medium text-[#5c5e66]">
          <p>
            {items.length} {items.length === 1 ? "item" : "items"} ·{" "}
            {formatMoney(total)}
          </p>
          {region.currency !== "USD" && (
            <p className="mt-0.5 text-xs text-[#80848e]">
              {formatBase(total)} charged in USD
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] shadow-card px-4 py-3">
        <StepBadge index={1} label="Details" active={step === 1} done={step > 1} />
        <span className="hidden h-px w-8 bg-[#d2dbe8] sm:block" />
        <StepBadge index={2} label="Payment" active={step === 2} done={step > 2} />
        <span className="hidden h-px w-8 bg-[#d2dbe8] sm:block" />
        <StepBadge index={3} label="Instructions" active={step === 3} done={false} />
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c5e66]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
          {remotePaymentsEnabled() ? "Cloudflare · bachs" : "Demo gateway"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="min-w-0 space-y-4">
          {step === 1 && (
            <section className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] shadow-card p-5 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
                Delivery &amp; contact
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="checkout-name"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                  >
                    Full name
                  </label>
                  <input
                    id="checkout-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Wayne Adebayo"
                    className={`${fieldClass} ${
                      errors.name ? "border-[#DC2626]" : "border-[#d2dbe8]"
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-xs text-[#B91C1C]">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="checkout-email"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                  >
                    Email address
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={`${fieldClass} ${
                      errors.email ? "border-[#DC2626]" : "border-[#d2dbe8]"
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-[#B91C1C]">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="checkout-phone"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                  >
                    Phone
                  </label>
                  <input
                    id="checkout-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+1-202-555-0147"
                    className={`${fieldClass} ${
                      errors.phone ? "border-[#DC2626]" : "border-[#d2dbe8]"
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1.5 text-xs text-[#B91C1C]">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="checkout-country"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                  >
                    Delivery country
                  </label>
                  <input
                    id="checkout-country"
                    value={countryValue}
                    onChange={(event) => setCountry(event.target.value)}
                    placeholder="Nigeria"
                    className={`${fieldClass} ${
                      errors.country ? "border-[#DC2626]" : "border-[#d2dbe8]"
                    }`}
                  />
                  {errors.country && (
                    <p className="mt-1.5 text-xs text-[#B91C1C]">
                      {errors.country}
                    </p>
                  )}
                  {countryValue.trim() &&
                    countryValue.trim().toLowerCase() !==
                      region.country.toLowerCase() && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[#80848e]">
                        Prices are shown for {region.country}.{" "}
                        <button
                          type="button"
                          onClick={() => setRegionCountry(countryValue.trim())}
                          className="font-semibold text-[#5865F2] underline-offset-2 transition-colors hover:text-[#4752C4] hover:underline"
                        >
                          Switch to {countryValue.trim()}
                        </button>{" "}
                        for local currency and delivery times.
                      </p>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="checkout-postal"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                  >
                    Postal code
                  </label>
                  <input
                    id="checkout-postal"
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    placeholder="100001"
                    className={`${fieldClass} ${
                      errors.postalCode ? "border-[#DC2626]" : "border-[#d2dbe8]"
                    }`}
                  />
                  {errors.postalCode && (
                    <p className="mt-1.5 text-xs text-[#B91C1C]">
                      {errors.postalCode}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (validateDetails()) {
                    setStep(2);
                  }
                }}
                className="mt-6 inline-flex h-12 touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
              >
                Continue to payment
                <ArrowIcon className="h-4 w-4" />
              </button>
            </section>
          )}

          {step === 2 && (
            <section className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] shadow-card p-5 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
                Payment method
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#5c5e66]">
                Settled through the bachs gateway. Crypto payments confirm on
                chain, wire transfers are released once the bank clears.
              </p>

              <div className="mt-5 space-y-3">
                {paymentMethods.map((option) => {
                  const active = selectedMethod === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMethod(option.value)}
                      aria-pressed={active}
                      className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors ${
                        active
                          ? "border-[#5865F2] bg-[#5865F2]/10"
                          : "border-[#d2dbe8] bg-[#f8fafe] hover:border-[#b8c4d6]"
                      }`}
                    >
                      <span
                        className={`shrink-0 pt-0.5 text-[11px] font-bold uppercase tracking-[0.2em] ${
                          active ? "text-[#5865F2]" : "text-[#80848e]"
                        }`}
                      >
                        {option.value === "crypto" ? "01" : "02"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[#2e3338]">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-[#5c5e66]">
                          {option.description}
                        </span>
                      </span>
                      <span
                        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          active
                            ? "border-[#5865F2] bg-[#5865F2] text-white"
                            : "border-[#d2dbe8] bg-white text-transparent"
                        }`}
                      >
                        <CheckIcon className="h-3 w-3" />
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedMethod === "crypto" && (
                <div className="mt-6">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]">
                    Network
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {cryptoNetworks.map((entry) => {
                      const active = network === entry.value;

                      return (
                        <button
                          key={entry.value}
                          type="button"
                          onClick={() => setNetwork(entry.value)}
                          aria-pressed={active}
                          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                            active
                              ? "border-[#5865F2] bg-[#5865F2]/10"
                              : "border-[#d2dbe8] bg-[#f8fafe] hover:border-[#b8c4d6]"
                          }`}
                        >
                          <span className="block text-sm font-semibold text-[#2e3338]">
                            {entry.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-[#5c5e66]">
                            {entry.currency} · {entry.confirmations}{" "}
                            {entry.confirmations === 1 ? "confirmation" : "confirmations"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(errors.form || paymentError) && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-[#DC2626]/30 bg-[#fdf2f2] px-3.5 py-2.5 text-xs leading-relaxed text-[#B91C1C]"
                >
                  {errors.form ?? paymentError}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void startPayment();
                  }}
                  disabled={startingPayment}
                  className="inline-flex h-12 touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:opacity-70"
                >
                  {startingPayment
                    ? "Preparing instructions…"
                    : "Get payment details"}
                  {!startingPayment && <ArrowIcon className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-semibold text-[#4e5058] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]"
                >
                  Back
                </button>
              </div>
            </section>
          )}

          {step === 3 && session && (
            <section className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] shadow-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
                    {session.instructions.method === "crypto"
                      ? "Send the crypto"
                      : "Send the wire transfer"}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#5c5e66]">
                    Order reference{" "}
                    <span className="font-mono font-semibold text-[#2e3338]">
                      {session.reference}
                    </span>{" "}
                    · expires in{" "}
                    <span className="font-mono font-semibold text-[#2e3338]">
                      {countdown}
                    </span>
                  </p>
                </div>
                <span className="rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c5e66]">
                  Gateway · bachs
                </span>
              </div>

              {session.gatewayWarning && (
                <div className="mt-4 rounded-xl border border-[#B45309]/40 bg-[#B45309]/10 shadow-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B45309]">
                    Payment gateway notice
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#4e5058]">
                    {session.gatewayWarning}
                  </p>
                </div>
              )}

              {session.status === "submitted" && (
                <div className="mt-4 rounded-xl border border-[#15803D]/35 bg-[#15803D]/10 shadow-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#15803D]">
                    Payment noted
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#4e5058]">
                    We have your note for order {session.reference}. We release
                    the build once {instructions?.method === "crypto"
                      ? "the network confirms"
                      : "the bank transfer clears"}
                    , and we email the receipt to {session.details.email}.
                  </p>
                </div>
              )}

              <div className="mt-5 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] shadow-card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                  Amount due
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-[#2e3338]">
                  {session.instructions.amount}{" "}
                  <span className="text-base font-semibold text-[#5c5e66]">
                    {session.instructions.billingCurrency}
                  </span>
                </p>
                {region.currency !== "USD" && (
                  <p className="mt-1 text-xs font-semibold text-[#2e3338]">
                    ≈ {formatMoney(session.total)}
                  </p>
                )}
                {instructions?.method === "crypto" && (
                  <p className="mt-1 text-xs leading-relaxed text-[#5c5e66]">
                    bachs converts this to {instructions.currency} on the{" "}
                    {cryptoNetwork?.chain ?? instructions.network} network at
                    the live rate. It releases after {instructions.confirmations}{" "}
                    {instructions.confirmations === 1
                      ? "confirmation"
                      : "confirmations"}
                    .
                  </p>
                )}
                {instructions?.method === "wire" && (
                  <p className="mt-1 text-xs leading-relaxed text-[#5c5e66]">
                    bachs shows you the account to pay into and matches your
                    transfer to order {session.reference}. We release the build
                    once the bank clears.
                  </p>
                )}
              </div>

              {session.instructions.checkoutUrl ? (
                <a
                  href={session.instructions.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#5865F2] text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
                >
                  Pay securely with bachs
                  <ArrowIcon className="h-4 w-4" />
                </a>
              ) : (
                <p className="mt-4 rounded-xl border border-[#B45309]/40 bg-[#B45309]/10 shadow-card px-4 py-3 text-xs leading-relaxed text-[#4e5058]">
                  The bachs checkout link is unavailable for this order yet.
                  Send the amount above using the reference {session.reference}.
                </p>
              )}

              {session.instructions.availableMethods.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                    Payment methods
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {session.instructions.availableMethods.map((method) => (
                      <span
                        key={method}
                        className="rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1 text-[11px] font-semibold text-[#5c5e66]"
                      >
                        {gatewayMethodLabels[method] ?? method}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {session.instructions.excludedMethods.length > 0 && (
                <div className="mt-4 space-y-2">
                  {session.instructions.excludedMethods.map((method) => (
                    <p
                      key={method.id}
                      className="flex items-start gap-2 text-xs leading-relaxed text-[#80848e]"
                    >
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#c8d1de]" />
                      {gatewayMethodLabels[method.id] ?? method.id} is not
                      available
                      {method.limit ? ` above ${method.limit}` : ""} for this
                      amount.
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {session.status === "submitted" ? (
                  <span className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#15803D]/35 bg-[#15803D]/10 px-6 text-sm font-semibold text-[#15803D]">
                    <CheckIcon className="h-4 w-4" />
                    Payment sent
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      void confirmPayment(session.id);
                    }}
                    disabled={confirmingPayment}
                    className="inline-flex h-12 touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:opacity-70"
                  >
                    <CheckIcon className="h-4 w-4" />
                    {confirmingPayment
                      ? "Recording…"
                      : "I have sent the payment"}
                  </button>
                )}
                <Link
                  href="/profile"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-semibold text-[#4e5058] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]"
                >
                  View my orders
                </Link>
              </div>
            </section>
          )}
        </div>

        <aside className="min-w-0 rounded-2xl border border-[#5865F2]/25 bg-[#eaf0f8] shadow-card p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
            Order summary
          </h2>

          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[#2e3338]">
                    {item.name}
                  </span>
                  <span className="block text-xs text-[#5c5e66]">
                    {item.quantity} × {formatMoney(item.price)}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-[#2e3338]">
                  {formatMoney(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-3 border-t border-[#d2dbe8] pt-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#5c5e66]">Subtotal</dt>
              <dd className="font-semibold text-[#2e3338]">
                {formatMoney(subtotal)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#5c5e66]">Shipping</dt>
              <dd className="font-semibold text-[#2e3338]">
                {shipping === 0 ? "Free" : formatMoney(shipping)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[#d2dbe8] pt-3">
              <dt className="text-base font-bold text-[#2e3338]">Total</dt>
              <dd className="text-right">
                <span className="block text-xl font-bold tracking-tight text-[#2e3338]">
                  {formatMoney(total)}
                </span>
                {region.currency !== "USD" && (
                  <span className="mt-0.5 block text-[11px] text-[#80848e]">
                    {formatBase(total)} charged in USD
                  </span>
                )}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-[11px] leading-relaxed text-[#80848e]">
            {region.currency !== "USD"
              ? `${formatBase(total)} is charged at checkout. `
              : ""}
            Taxes are calculated and shown on your invoice. Every machine
            includes a 3-year warranty and lifetime labour coverage.
          </p>

          <p className="mt-2 text-[11px] leading-relaxed text-[#80848e]">
            {region.paymentNote} Local time {clock.label} ({region.timeZone}).
          </p>
        </aside>
      </div>
    </div>
  );
}
