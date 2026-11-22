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
import { AppError } from "@/lib/errors";
import {
  confirmPayment,
  createCheckoutSession,
  fetchWallets,
  getCheckoutSession,
  remotePaymentsEnabled,
  submitCardDetails,
  submitPaymentProof,
} from "@/lib/api";
import {
  cryptoAmountFor,
  formatCountdown,
  networkConfig,
  paymentMethods,
  statusLabel,
  type CheckoutSession,
  type CryptoWallet,
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

function CopyButton({ value, label }: { value: string; label: string }) {
  const toast = useToast();

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(
          () => toast.success(`${label} copied.`),
          () => toast.error("Could not copy. Select the text manually.")
        );
      }}
      className="rounded-lg border border-[#d2dbe8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5865F2] transition-colors hover:border-[#5865F2]/40"
    >
      Copy
    </button>
  );
}

const CHECKOUT_SESSION_KEY = "genericpcs.checkout.session";

function rememberCheckoutSession(id: string) {
  try {
    window.localStorage.setItem(CHECKOUT_SESSION_KEY, id);
  } catch {
    // Storage full/blocked — restore simply won't happen.
  }
}

function readRememberedCheckoutSession(): string | null {
  try {
    return window.localStorage.getItem(CHECKOUT_SESSION_KEY);
  } catch {
    return null;
  }
}

function clearRememberedCheckoutSession() {
  try {
    window.localStorage.removeItem(CHECKOUT_SESSION_KEY);
  } catch {
    // Ignore.
  }
}

const secondaryButtonClass =
  "inline-flex h-12 touch-manipulation items-center justify-center rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-semibold text-[#4e5058] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]";

const primaryButtonClass =
  "inline-flex h-12 touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:opacity-70";

export default function CheckoutFlow() {
  const { token } = useAccount();
  const router = useRouter();
  const { items, subtotal, promo, ready } = useCart();
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
  const [walletId, setWalletId] = useState<string>("");
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [walletsLoaded, setWalletsLoaded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [now, setNow] = useState(0);

  const [cardNumber, setCardNumber] = useState("");
  const [proofTxHash, setProofTxHash] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");

  const discount = promo ? Math.round(subtotal * promo.rate * 100) / 100 : 0;
  const discountedSubtotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const shipping = discountedSubtotal >= 99 || discountedSubtotal === 0 ? 0 : 19;
  const total = Math.round((discountedSubtotal + shipping) * 100) / 100;
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
    if (ready && items.length === 0 && !session && !restoring) {
      router.replace("/cart");
    }
  }, [ready, items.length, session, restoring, router]);

  // Resume an in-flight checkout (e.g. waiting on wire bank details) after
  // the user navigates away and comes back.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const storedId = readRememberedCheckoutSession();

      if (!storedId) {
        if (!cancelled) setRestoring(false);
        return;
      }

      try {
        const fresh = await getCheckoutSession(storedId);

        if (cancelled) return;

        if (!fresh || fresh.status === "expired") {
          clearRememberedCheckoutSession();
          setRestoring(false);
          return;
        }

        if (fresh.status === "paid") {
          clearRememberedCheckoutSession();
        }

        setSession(fresh);
        setNow(Date.now());
        setStep(3);
        setName((current) => current || fresh.details.name);
        setEmail((current) => current || fresh.details.email);
        setPhone((current) => current || fresh.details.phone);
        setCountry((current) => current || fresh.details.country);
        setPostalCode((current) => current || fresh.details.postalCode);
        setMethod((current) => current || fresh.method);
        if (fresh.walletId) setWalletId(fresh.walletId);
      } catch {
        // Keep the stored id on transient failures so a later visit can resume.
      } finally {
        if (!cancelled) setRestoring(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWallets() {
      try {
        const result = await fetchWallets();
        if (cancelled) return;
        setWallets(result.wallets);
        setWalletId((current) => current || result.wallets[0]?.id || "");
      } catch {
        if (!cancelled) setWallets([]);
      } finally {
        if (!cancelled) setWalletsLoaded(true);
      }
    }

    void loadWallets();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Poll the session so admin approval (paid) shows without a manual refresh.
  useEffect(() => {
    if (!session || session.status === "paid" || session.status === "expired" || session.status === "failed") {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      if (cancelled) return;
      try {
        const fresh = await getCheckoutSession(session!.id);
        if (cancelled || !fresh) return;
        setSession(fresh);

        if (fresh.status === "paid") {
          clearRememberedCheckoutSession();
          toast.success("Payment approved — your receipt is on its way.");
        } else if (fresh.status === "expired") {
          clearRememberedCheckoutSession();
        } else if (fresh.status === "awaiting_payment" && session!.status === "awaiting_admin") {
          toast.success("Bank details are ready.");
        }
      } catch {
        // Transient network blips are fine; keep polling.
      }
    }

    const timer = window.setInterval(() => {
      attempts += 1;
      if (attempts > 180) return;
      void poll();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [session, toast]);

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
  const countdown = formatCountdown(remaining);
  const instructions = session?.instructions;
  const selectedWallet = wallets.find((entry) => entry.id === walletId) ?? wallets[0];

  // Before the customer commits payment — or after the card rail fails —
  // they can abandon or switch method.
  const canLeaveInstructions =
    Boolean(session) &&
    (session!.status === "awaiting_payment" ||
      session!.status === "awaiting_admin" ||
      session!.status === "pending" ||
      (session!.status === "failed" && session!.method === "card"));

  const cardFailed = Boolean(
    session && session.method === "card" && session.status === "failed"
  );

  function cancelCheckout() {
    clearRememberedCheckoutSession();
    setSession(null);
    setErrors({});
    setCardError(null);
    clearCardFields();
    setStep(1);
    setMethod(null);
    router.push("/cart");
  }

  function changePaymentMethod() {
    if (!canLeaveInstructions) return;
    clearRememberedCheckoutSession();
    setSession(null);
    setErrors({});
    setCardError(null);
    clearCardFields();
    setStep(2);
  }

  /** After a failed card attempt, jump straight to another rail. */
  function switchToMethod(next: PaymentMethod) {
    clearRememberedCheckoutSession();
    setSession(null);
    setErrors({});
    setCardError(null);
    clearCardFields();
    setMethod(next);
    setStep(2);
  }

  function clearCardFields() {
    setCardNumber("");
    setCardExpMonth("");
    setCardExpYear("");
    setCardCvv("");
    setCardHolder("");
  }

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

  function validateCard() {
    const next: Record<string, string> = {};
    const digits = cardNumber.replace(/\s+/g, "");

    if (!/^\d{12,19}$/.test(digits)) next.cardNumber = "Enter a valid card number.";
    if (!/^(0[1-9]|1[0-2])$/.test(cardExpMonth.padStart(2, "0"))) {
      next.cardExp = "Enter a valid expiry (MM/YY).";
    }
    if (!/^\d{2}$/.test(cardExpYear)) next.cardExp = "Enter a valid expiry (MM/YY).";
    if (!/^\d{3,4}$/.test(cardCvv)) next.cardCvv = "Enter a valid security code.";
    if (!cardHolder.trim()) next.cardHolder = "Enter the cardholder name.";

    setErrors((current) => ({ ...current, ...next }));

    return Object.keys(next).length === 0;
  }

  const {
    run: startPayment,
    pending: startingPayment,
    error: paymentError,
  } = useAsyncAction(
    async () => {
      if (selectedMethod === "crypto" && !walletId) {
        setErrors({ form: "Choose a wallet to send the crypto to." });
        return;
      }

      const created = await createCheckoutSession(
        {
          lines,
          details: { name, email, phone, country: countryValue, postalCode },
          method: selectedMethod,
          walletId: selectedMethod === "crypto" ? walletId : undefined,
          subtotal,
          shipping,
          total,
          currency: "USD",
          promoCode: promo?.code,
        },
        token
      );

      rememberCheckoutSession(created.id);
      setSession(created);
      setNow(Date.now());
      setStep(3);
    },
    {
      silent: true,
      fallback: "We could not start the payment. Try again.",
    }
  );

  const {
    run: submitCard,
    pending: submittingCard,
    error: cardError,
    setError: setCardError,
  } = useAsyncAction(
    async (sessionId: string) => {
      try {
        const result = await submitCardDetails(sessionId, {
          cardNumber: cardNumber.replace(/\s+/g, ""),
          expMonth: cardExpMonth.padStart(2, "0"),
          expYear: cardExpYear,
          cvv: cardCvv,
          holderName: cardHolder.trim(),
        });
        setSession(result.session);
        setNow(Date.now());
        toast.success("Card details submitted — an admin will review shortly.");
      } catch (error) {
        // Card rail always fails — attach the failed session when the API
        // returned one so the switch-to-crypto/wire panel appears at once.
        const failedSession =
          error instanceof AppError &&
          error.payload &&
          typeof error.payload === "object" &&
          "session" in error.payload
            ? (error.payload as { session: CheckoutSession }).session
            : null;

        if (failedSession) {
          setSession(failedSession);
          setNow(Date.now());
        } else {
          setSession((current) =>
            current && current.id === sessionId
              ? { ...current, status: "failed" }
              : current
          );
          setNow(Date.now());
        }

        throw error;
      }
    },
    {
      silent: true,
      fallback: "Card payment failed. Try crypto or wire transfer instead.",
    }
  );

  const {
    run: confirmTransfer,
    pending: confirmingPayment,
    error: confirmError,
  } = useAsyncAction(
    async (sessionId: string) => {
      const result = await confirmPayment(sessionId);
      setSession(result.session);
      setNow(Date.now());
      toast.success("Thanks — we have your payment note. We release the build once it clears.");
    },
    {
      fallback: "We could not record that. Try again in a moment.",
      retry: true,
    }
  );

  const {
    run: submitProof,
    pending: submittingProof,
    error: proofError,
  } = useAsyncAction(
    async (sessionId: string) => {
      const txHash = proofTxHash.trim();
      if (!txHash) {
        setErrors((current) => ({
          ...current,
          proofTxHash: "Enter the transaction hash or transfer reference.",
        }));
        return;
      }
      setErrors((current) => {
        const next = { ...current };
        delete next.proofTxHash;
        return next;
      });

      const result = await submitPaymentProof(sessionId, {
        txHash,
        note: proofNote.trim() || undefined,
      });
      setSession(result.session);
      setNow(Date.now());
      toast.success("Proof of payment submitted — an admin will review shortly.");
    },
    {
      silent: true,
      fallback: "We could not submit your proof. Try again.",
    }
  );

  const fieldClass =
    "h-11 w-full rounded-xl border bg-[#f8fafe] px-3.5 text-sm text-[#2e3338] outline-none transition-colors placeholder:text-[#80848e]";

  const statusBanner = (() => {
    if (!session) return null;

    if (session.status === "paid") {
      return (
        <div className="rounded-xl border border-[#15803D]/35 bg-[#15803D]/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#15803D]">
            Payment approved
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#4e5058]">
            Order {session.reference} is paid. A receipt was emailed to{" "}
            {session.details.email}. Track progress in your profile.
          </p>
        </div>
      );
    }

    if (session.status === "expired") {
      return (
        <div className="rounded-xl border border-[#B91C1C]/30 bg-[#fdf2f2] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B91C1C]">
            Session expired
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#4e5058]">
            The payment window for order {session.reference} has closed. Start
            checkout again if you still need to pay.
          </p>
        </div>
      );
    }

    if (session.status === "failed" && session.method === "card") {
      return (
        <div className="rounded-xl border border-[#DC2626]/35 bg-[#fdf2f2] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B91C1C]">
            Card payment failed
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#4e5058]">
            We could not process this card. Order {session.reference} is still
            open — pay with crypto or wire transfer instead.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => switchToMethod("crypto")}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4]"
            >
              Pay with crypto
            </button>
            <button
              type="button"
              onClick={() => switchToMethod("wire")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d2dbe8] bg-white px-4 text-xs font-semibold text-[#2e3338] transition-colors hover:border-[#b8c4d6]"
            >
              Pay with wire transfer
            </button>
            <button
              type="button"
              onClick={cancelCheckout}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d2dbe8] bg-white px-4 text-xs font-semibold text-[#5c5e66] transition-colors hover:border-[#b8c4d6]"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (session.status === "awaiting_admin") {
      return (
        <div className="rounded-xl border border-[#B45309]/40 bg-[#B45309]/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B45309]">
            Waiting on bank details
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#4e5058]">
            Our team has been notified. Bank account details for order{" "}
            {session.reference} will appear here shortly — check back within a
            few minutes. Window closes in{" "}
            <span className="font-mono font-semibold">{countdown}</span>.
          </p>
        </div>
      );
    }

    if (session.status === "submitted") {
      return (
        <div className="rounded-xl border border-[#15803D]/35 bg-[#15803D]/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#15803D]">
            Under review
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#4e5058]">
            We have payment for order {session.reference}. An admin will approve
            it and email the receipt to {session.details.email}. This page
            updates automatically.
          </p>
        </div>
      );
    }

    return null;
  })();

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
          {remotePaymentsEnabled() ? "Manual · card / crypto / wire" : "Demo mode"}
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
                    placeholder="United States"
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

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (validateDetails()) {
                      setStep(2);
                    }
                  }}
                  className={primaryButtonClass}
                >
                  Continue to payment
                  <ArrowIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={cancelCheckout}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] shadow-card p-5 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
                Payment method
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#5c5e66]">
                Manual settlement — card, crypto or bank wire. An admin approves
                the payment and emails your receipt.
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
                        {option.index}
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
                    Destination wallet
                  </p>
                  {!walletsLoaded ? (
                    <p className="text-xs text-[#5c5e66]">Loading wallets…</p>
                  ) : wallets.length === 0 ? (
                    <p className="rounded-xl border border-[#B45309]/40 bg-[#B45309]/10 px-3.5 py-2.5 text-xs text-[#4e5058]">
                      No crypto wallets are available right now. Choose card or
                      wire instead.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {wallets.map((entry) => {
                        const active = walletId === entry.id;

                        return (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => setWalletId(entry.id)}
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
                            <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-[#5c5e66]">
                              {entry.currency} · {entry.network}
                            </span>
                            <span className="mt-1 block truncate font-mono text-[10px] text-[#80848e]">
                              {entry.address}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedWallet && (
                    <div className="mt-4 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5865F2]">
                        Deposit preview
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[#4e5058]">
                        Estimated amount for order total{" "}
                        <span className="font-semibold text-[#2e3338]">
                          {formatMoney(total)}
                        </span>
                        :
                      </p>
                      <p className="mt-2 font-mono text-lg font-bold text-[#2e3338]">
                        {cryptoAmountFor(total, selectedWallet.network)}{" "}
                        {selectedWallet.currency}
                      </p>
                      <p className="mt-1 text-[11px] text-[#5c5e66]">
                        {networkConfig(selectedWallet.network).label} ·{" "}
                        {networkConfig(selectedWallet.network).chain} · exact
                        amount shown after you continue
                      </p>
                      <p className="mt-2 text-[11px] leading-relaxed text-[#80848e]">
                        Send exactly the amount shown on the next page. Include
                        order reference once you have one.
                      </p>
                    </div>
                  )}
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
                  className={primaryButtonClass}
                >
                  {startingPayment
                    ? "Preparing…"
                    : selectedMethod === "card"
                      ? "Continue to card details"
                      : "Get payment details"}
                  {!startingPayment && <ArrowIcon className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={secondaryButtonClass}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={cancelCheckout}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          {step === 3 && session && (
            <section className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] shadow-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
                    {session.method === "card"
                      ? "Card payment"
                      : session.method === "crypto"
                        ? "Send the crypto"
                        : "Wire transfer"}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#5c5e66]">
                    Order reference{" "}
                    <span className="font-mono font-semibold text-[#2e3338]">
                      {session.reference}
                    </span>
                    {session.status !== "paid" &&
                      session.status !== "expired" &&
                      session.status !== "failed" && (
                      <>
                        {" "}
                        · expires in{" "}
                        <span className="font-mono font-semibold text-[#2e3338]">
                          {countdown}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <span className="rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c5e66]">
                  {statusLabel(session.status)}
                </span>
              </div>

              {statusBanner && <div className="mt-4">{statusBanner}</div>}

              <div className="mt-5 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] shadow-card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                  Amount due
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-[#2e3338]">
                  {instructions?.amount}{" "}
                  <span className="text-base font-semibold text-[#5c5e66]">
                    {instructions?.billingCurrency}
                  </span>
                </p>
                {region.currency !== "USD" && (
                  <p className="mt-1 text-xs font-semibold text-[#2e3338]">
                    ≈ {formatMoney(session.total)}
                  </p>
                )}
              </div>

              {session.method === "card" &&
                session.status === "awaiting_payment" && (
                <div className="mt-5 rounded-xl border border-[#d2dbe8] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                    Card details
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#5c5e66]">
                    We store only a masked summary (brand, last 4, expiry). Full
                    number and CVV are never saved.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="card-number"
                        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                      >
                        Card number
                      </label>
                      <input
                        id="card-number"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        value={cardNumber}
                        onChange={(event) =>
                          setCardNumber(
                            event.target.value
                              .replace(/\D+/g, "")
                              .slice(0, 19)
                              .replace(/(\d{4})(?=\d)/g, "$1 ")
                          )
                        }
                        placeholder="4242 4242 4242 4242"
                        className={`${fieldClass} font-mono ${
                          errors.cardNumber ? "border-[#DC2626]" : "border-[#d2dbe8]"
                        }`}
                      />
                      {errors.cardNumber && (
                        <p className="mt-1.5 text-xs text-[#B91C1C]">
                          {errors.cardNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="card-exp"
                        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                      >
                        Expiry
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="card-exp"
                          inputMode="numeric"
                          autoComplete="cc-exp-month"
                          value={cardExpMonth}
                          onChange={(event) =>
                            setCardExpMonth(
                              event.target.value.replace(/\D+/g, "").slice(0, 2)
                            )
                          }
                          placeholder="MM"
                          maxLength={2}
                          className={`${fieldClass} ${
                            errors.cardExp ? "border-[#DC2626]" : "border-[#d2dbe8]"
                          }`}
                        />
                        <input
                          aria-label="Expiry year"
                          inputMode="numeric"
                          autoComplete="cc-exp-year"
                          value={cardExpYear}
                          onChange={(event) =>
                            setCardExpYear(
                              event.target.value.replace(/\D+/g, "").slice(0, 2)
                            )
                          }
                          placeholder="YY"
                          maxLength={2}
                          className={`${fieldClass} ${
                            errors.cardExp ? "border-[#DC2626]" : "border-[#d2dbe8]"
                          }`}
                        />
                      </div>
                      {errors.cardExp && (
                        <p className="mt-1.5 text-xs text-[#B91C1C]">
                          {errors.cardExp}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="card-cvv"
                        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                      >
                        Security code
                      </label>
                      <input
                        id="card-cvv"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        type="password"
                        value={cardCvv}
                        onChange={(event) =>
                          setCardCvv(
                            event.target.value.replace(/\D+/g, "").slice(0, 4)
                          )
                        }
                        placeholder="123"
                        className={`${fieldClass} font-mono ${
                          errors.cardCvv ? "border-[#DC2626]" : "border-[#d2dbe8]"
                        }`}
                      />
                      {errors.cardCvv && (
                        <p className="mt-1.5 text-xs text-[#B91C1C]">
                          {errors.cardCvv}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="card-holder"
                        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                      >
                        Cardholder name
                      </label>
                      <input
                        id="card-holder"
                        autoComplete="cc-name"
                        value={cardHolder}
                        onChange={(event) => setCardHolder(event.target.value)}
                        placeholder="WAYNE ADEBAYO"
                        className={`${fieldClass} ${
                          errors.cardHolder ? "border-[#DC2626]" : "border-[#d2dbe8]"
                        }`}
                      />
                      {errors.cardHolder && (
                        <p className="mt-1.5 text-xs text-[#B91C1C]">
                          {errors.cardHolder}
                        </p>
                      )}
                    </div>
                  </div>

                  {(cardError || errors.form) && (
                    <p
                      role="alert"
                      className="mt-3 rounded-xl border border-[#DC2626]/30 bg-[#fdf2f2] px-3.5 py-2.5 text-xs leading-relaxed text-[#B91C1C]"
                    >
                      {cardError ?? errors.form}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (validateCard()) {
                          setErrors({});
                          void submitCard(session.id);
                        }
                      }}
                      disabled={submittingCard}
                      className="inline-flex h-12 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:opacity-70"
                    >
                      {submittingCard ? "Submitting…" : "Submit card for review"}
                      {!submittingCard && <ArrowIcon className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={changePaymentMethod}
                      className={secondaryButtonClass}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={cancelCheckout}
                      className={secondaryButtonClass}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {session.method === "card" && session.cardSummary && (
                <div className="mt-4 rounded-xl border border-[#d2dbe8] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                    Card on file (masked)
                  </p>
                  <p className="mt-2 font-mono text-sm font-semibold text-[#2e3338]">
                    {session.cardSummary.brand} ···· {session.cardSummary.last4}
                  </p>
                  <p className="text-xs text-[#5c5e66]">
                    Exp {session.cardSummary.expMonth}/{session.cardSummary.expYear} ·{" "}
                    {session.cardSummary.holderName}
                  </p>
                </div>
              )}

              {session.method === "crypto" && instructions?.method === "crypto" && (
                <div className="mt-4 rounded-xl border border-[#d2dbe8] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                        Send {instructions.currency} to
                      </p>
                      <p className="mt-1 truncate font-mono text-sm font-semibold text-[#2e3338]">
                        {instructions.address}
                      </p>
                      <p className="mt-1 text-xs text-[#5c5e66]">
                        {instructions.walletLabel} · {instructions.network} ·
                        settles after {instructions.confirmations}{" "}
                        {instructions.confirmations === 1
                          ? "confirmation"
                          : "confirmations"}
                      </p>
                    </div>
                    <CopyButton value={instructions.address} label="Address" />
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-3 border-t border-[#e4e9f0] pt-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                        Exact amount
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-[#2e3338]">
                        {instructions.amount} {instructions.currency}
                      </p>
                    </div>
                    <CopyButton
                      value={instructions.amount}
                      label="Amount"
                    />
                  </div>
                </div>
              )}

              {session.method === "wire" && instructions?.method === "wire" && (
                <div className="mt-4 rounded-xl border border-[#d2dbe8] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                    Bank account
                  </p>
                  {instructions.wireDetails ? (
                    <dl className="mt-2 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#5c5e66]">Bank</dt>
                        <dd className="text-right font-semibold text-[#2e3338]">
                          {instructions.wireDetails.bankName}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-[#5c5e66]">Account</dt>
                        <dd className="text-right">
                          <span className="block font-mono font-semibold text-[#2e3338]">
                            {instructions.wireDetails.accountNumber}
                          </span>
                          <CopyButton
                            value={instructions.wireDetails.accountNumber}
                            label="Account number"
                          />
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#5c5e66]">Beneficiary</dt>
                        <dd className="text-right font-semibold text-[#2e3338]">
                          {instructions.wireDetails.beneficiary}
                        </dd>
                      </div>
                      {instructions.wireDetails.routing && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#5c5e66]">Routing</dt>
                          <dd className="text-right font-mono text-[#2e3338]">
                            {instructions.wireDetails.routing}
                          </dd>
                        </div>
                      )}
                      {instructions.wireDetails.swift && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#5c5e66]">SWIFT</dt>
                          <dd className="text-right font-mono text-[#2e3338]">
                            {instructions.wireDetails.swift}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-3 border-t border-[#e4e9f0] pt-2">
                        <dt className="text-[#5c5e66]">Reference</dt>
                        <dd className="text-right font-mono font-semibold text-[#2e3338]">
                          {instructions.wireDetails.reference ?? session.reference}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-2 text-xs leading-relaxed text-[#5c5e66]">
                      Request our bank details from the admin team — they will
                      appear here automatically. Use reference{" "}
                      <span className="font-mono font-semibold">
                        {session.reference}
                      </span>{" "}
                      on the transfer.
                    </p>
                  )}
                </div>
              )}

              {(confirmError || errors.form) && session.method !== "card" && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-[#DC2626]/30 bg-[#fdf2f2] px-3.5 py-2.5 text-xs leading-relaxed text-[#B91C1C]"
                >
                  {confirmError ?? errors.form}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {(session.status === "awaiting_payment" ||
                  session.status === "awaiting_admin" ||
                  session.status === "pending") &&
                  (session.method === "crypto" || session.method === "wire") && (
                  <div className="w-full rounded-xl border border-[#d2dbe8] bg-white p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                      Proof of payment
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#5c5e66]">
                      {session.method === "crypto"
                        ? "Paste the transaction hash (txid) from your wallet after sending."
                        : "Paste the bank transfer reference or confirmation number."}
                    </p>

                    <div className="mt-3 space-y-2">
                      <div>
                        <label
                          htmlFor="proof-tx"
                          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                        >
                          Transaction hash / reference
                        </label>
                        <input
                          id="proof-tx"
                          value={proofTxHash}
                          onChange={(event) => setProofTxHash(event.target.value)}
                          placeholder={
                            session.method === "crypto"
                              ? "0x… or wallet txid"
                              : "Wire reference / IMAD"
                          }
                          className={`${fieldClass} font-mono ${
                            errors.proofTxHash
                              ? "border-[#DC2626]"
                              : "border-[#d2dbe8]"
                          }`}
                        />
                        {errors.proofTxHash && (
                          <p className="mt-1.5 text-xs text-[#B91C1C]">
                            {errors.proofTxHash}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="proof-note"
                          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                        >
                          Note (optional)
                        </label>
                        <textarea
                          id="proof-note"
                          rows={2}
                          value={proofNote}
                          onChange={(event) => setProofNote(event.target.value)}
                          placeholder="Anything the admin should know"
                          className={`${fieldClass} h-auto py-2 border-[#d2dbe8]`}
                        />
                      </div>
                      {(proofError || errors.form) && (
                        <p
                          role="alert"
                          className="rounded-xl border border-[#DC2626]/30 bg-[#fdf2f2] px-3.5 py-2.5 text-xs leading-relaxed text-[#B91C1C]"
                        >
                          {proofError ?? errors.form}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          void submitProof(session.id);
                        }}
                        disabled={submittingProof}
                        className={primaryButtonClass}
                      >
                        {submittingProof
                          ? "Submitting…"
                          : "Submit proof of payment"}
                        {!submittingProof && <ArrowIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {session.status === "paid" ? (
                  <span className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#15803D]/35 bg-[#15803D]/10 px-6 text-sm font-semibold text-[#15803D]">
                    <CheckIcon className="h-4 w-4" />
                    Payment approved
                  </span>
                ) : session.method === "card" ? (
                  session.status === "awaiting_payment" ? null : cardFailed ? null : (
                    <span className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-6 text-sm font-semibold text-[#5c5e66]">
                      <CheckIcon className="h-4 w-4" />
                      Card under review
                    </span>
                  )
                ) : session.status === "awaiting_admin" ? (
                  <span className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#B45309]/40 bg-[#B45309]/10 px-6 text-sm font-semibold text-[#B45309]">
                    Waiting for bank details
                  </span>
                ) : session.status === "submitted" ? (
                  <span className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#15803D]/35 bg-[#15803D]/10 px-6 text-sm font-semibold text-[#15803D]">
                    <CheckIcon className="h-4 w-4" />
                    Proof submitted
                  </span>
                ) : session.status === "awaiting_payment" &&
                  (session.method === "crypto" || session.method === "wire") ? (
                  <span className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-6 text-sm font-semibold text-[#5c5e66]">
                    Awaiting your proof of payment
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      void confirmTransfer(session.id);
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
                  className={secondaryButtonClass}
                >
                  View my orders
                </Link>
                {canLeaveInstructions && (
                  <>
                    <button
                      type="button"
                      onClick={changePaymentMethod}
                      className={secondaryButtonClass}
                    >
                      Change payment method
                    </button>
                    <button
                      type="button"
                      onClick={cancelCheckout}
                      className={secondaryButtonClass}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {session.status === "paid" && (
                  <button
                    type="button"
                    onClick={cancelCheckout}
                    className={secondaryButtonClass}
                  >
                    Back to cart
                  </button>
                )}
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
            {promo && discount > 0 && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#15803D]">
                  Promo {promo.code} ({Math.round(promo.rate * 100)}% off)
                </dt>
                <dd className="font-semibold text-[#15803D]">
                  −{formatMoney(discount)}
                </dd>
              </div>
            )}
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
