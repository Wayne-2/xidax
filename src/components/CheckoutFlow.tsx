"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon } from "@/components/BuildIcons";
import PaymentFailedModal from "@/components/PaymentFailedModal";
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
  notifyWirePending,
  sendCheckoutOtp,
  submitCardDetails,
  submitPaymentProof,
  updateCheckoutWallet,
  verifyCheckoutOtp,
} from "@/lib/api";
import {
  DELIVERY_OPTIONS,
  cryptoNetworks,
  formatCheckoutAddress,
  formatCountdown,
  formatDeliveryWindow,
  paymentMethods,
  type CheckoutSession,
  type CryptoWallet,
  type DeliveryMethod,
  type PaymentMethod,
} from "@/lib/payments";

const CHECKOUT_SESSION_KEY = "genericpcs.checkout.session";
const DRAFT_KEY = "genericpcs.checkout.draft";

type Draft = {
  email: string;
  marketingOptIn: boolean;
  firstName: string;
  lastName: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  discountCode: string;
};

const defaultDraft: Draft = {
  email: "",
  marketingOptIn: false,
  firstName: "",
  lastName: "",
  address: "",
  apartment: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  phone: "",
  deliveryMethod: "standard",
  paymentMethod: "crypto",
  discountCode: "",
};

function loadDraft(): Draft {
  if (typeof window === "undefined") return defaultDraft;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return defaultDraft;
    return { ...defaultDraft, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch {
    return defaultDraft;
  }
}

function saveDraft(draft: Draft) {
  try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
}
function rememberCheckoutSession(id: string) { try { window.localStorage.setItem(CHECKOUT_SESSION_KEY, id); } catch {} }
function readRememberedCheckoutSession() { try { return window.localStorage.getItem(CHECKOUT_SESSION_KEY); } catch { return null; } }
function clearRememberedCheckoutSession() { try { window.localStorage.removeItem(CHECKOUT_SESSION_KEY); } catch {} }

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function StepIcon({ state, index }: { state: "active" | "done" | "idle"; index: number }) {
  if (state === "done") {
    return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5965F5] text-white"><CheckIcon className="h-4 w-4" /></span>;
  }
  if (state === "active") {
    return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5965F5] text-sm font-semibold text-white">{index}</span>;
  }
  return <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DCE1ED] bg-white text-sm font-semibold text-[#737D94]">{index}</span>;
}

function Progress({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Details", "Payment", "Instructions"] as const;
  return (
    <div className="flex items-center justify-center gap-3 py-6">
      {steps.map((label, i) => {
        const index = (i + 1) as 1 | 2 | 3;
        const state = step > index ? "done" : step === index ? "active" : "idle";
        return (
          <Fragment key={label}>
            <div className="flex items-center gap-2">
              <StepIcon state={state} index={index} />
              <span className={`text-sm font-medium ${state === "idle" ? "text-[#737D94]" : "text-[#20212B]"}`}>{label}</span>
            </div>
            {i < 2 && <div className={`h-px w-10 sm:w-20 ${step > index ? "bg-[#5965F5]" : "bg-[#DCE1ED]"}`} />}
          </Fragment>
        );
      })}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-sm font-medium text-[#20212B]">{label}</span>{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const { error, className = "", ...rest } = props;
  return (
    <>
      <input {...rest} className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-[#20212B] outline-none transition placeholder:text-[#737D94] focus:border-[#5965F5] ${error ? "border-red-400" : "border-[#DCE1ED]"} ${className}`} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </>
  );
}

export default function CheckoutFlow() {
  const router = useRouter();
  const { token, user } = useAccount();
  const { items, subtotal, promo, ready } = useCart();
  const { region, setCountry: setRegionCountry } = useRegion();
  const toast = useToast();
  const [autoOtpSent, setAutoOtpSent] = useState(false);
  const draftRef = useRef<Draft>(defaultDraft);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [otpStep, setOtpStep] = useState(false);
  const [checkoutOtpVerified, setCheckoutOtpVerified] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [draftReady, setDraftReady] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [now, setNow] = useState(0);
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [walletId, setWalletId] = useState("");
  const [proofTxHash, setProofTxHash] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(false);
  const [billing, setBilling] = useState({ firstName: "", lastName: "", address: "", apartment: "", city: "", state: "", zipCode: "", country: "" });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = loadDraft();
      setDraft({ ...loaded, country: loaded.country || user?.country || region.country, email: loaded.email || user?.email || "" });
      setDiscountInput(loaded.discountCode || "");
      setDraftReady(true);
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get("verify") === "1") setOtpStep(true);
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, [region.country, user?.country, user?.email]);

  useEffect(() => { draftRef.current = draft; if (draftReady) saveDraft(draft); }, [draft, draftReady]);

  useEffect(() => {
    if (!draftReady || restoring || session || checkoutOtpVerified || autoOtpSent) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("verify") !== "1") return;
      setOtpStep(true);
      const email = draftRef.current.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setOtpStep(false); setStep(1); return; }
      setAutoOtpSent(true);
      void requestCheckoutOtp(email);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftReady, restoring, session, checkoutOtpVerified, autoOtpSent]);

  useEffect(() => {
    if (ready && items.length === 0 && !session && !restoring) router.replace("/cart");
  }, [ready, items.length, session, restoring, router]);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const storedId = readRememberedCheckoutSession();
      if (!storedId) { if (!cancelled) setRestoring(false); return; }
      try {
        const fresh = await getCheckoutSession(storedId);
        if (cancelled) return;
        if (!fresh || fresh.status === "expired") { clearRememberedCheckoutSession(); setRestoring(false); return; }
        if (fresh.status === "paid") clearRememberedCheckoutSession();
        setSession(fresh);
        setStep(3);
        setOtpStep(false);
        setCheckoutOtpVerified(true);
        setNow(Date.now());
        const d = fresh.details;
        setDraft((current) => ({
          ...current,
          email: d.email || current.email,
          marketingOptIn: Boolean(d.marketingOptIn),
          firstName: d.firstName || current.firstName,
          lastName: d.lastName || current.lastName,
          address: d.address || current.address,
          apartment: d.apartment || current.apartment || "",
          city: d.city || current.city,
          state: d.state || current.state,
          zipCode: d.zipCode || d.postalCode || current.zipCode,
          country: d.country || current.country,
          phone: d.phone || current.phone,
          deliveryMethod: d.deliveryMethod || current.deliveryMethod,
          paymentMethod: fresh.method,
          discountCode: fresh.discountCode || fresh.promoCode || current.discountCode,
        }));
        if (fresh.walletId) setWalletId(fresh.walletId);
        if (fresh.discountCode || fresh.promoCode) setAppliedDiscount({ code: fresh.discountCode || fresh.promoCode || "", amount: fresh.discount });
      } catch {} finally { if (!cancelled) setRestoring(false); }
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadWallets() {
      try { const result = await fetchWallets(); if (!cancelled) { setWallets(result.wallets); setWalletId((c) => c || result.wallets[0]?.id || ""); } }
      catch { if (!cancelled) setWallets([]); }
    }
    void loadWallets();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!session) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = window.setInterval(() => setOtpCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(t);
  }, [otpCooldown]);

  useEffect(() => {
    if (!session || ["paid", "expired", "failed"].includes(session.status)) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const fresh = await getCheckoutSession(session.id);
        if (cancelled || !fresh) return;
        setSession(fresh);
        if (fresh.status === "paid") { clearRememberedCheckoutSession(); toast.success("Payment confirmed."); }
      } catch {}
    }, 4000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [session, toast]);

  const discountFromPromo = promo ? Math.round(subtotal * promo.rate * 100) / 100 : 0;
  const discount = appliedDiscount?.amount ?? discountFromPromo;
  const discountCode = appliedDiscount?.code ?? promo?.code;
  const discountedSubtotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const shipping = draft.deliveryMethod === "express" ? 18 : 0;
  const tax = Math.round(discountedSubtotal * 0.08 * 100) / 100;
  const total = Math.round((discountedSubtotal + shipping + tax) * 100) / 100;

  const lines = useMemo(() => items.map((item) => ({ id: item.id, name: item.name, kind: item.kind, price: item.price, quantity: item.quantity })), [items]);
  const selectedWallet = wallets.find((entry) => entry.id === walletId) ?? wallets[0];
  const remaining = session ? Math.max(0, new Date(session.expiresAt).getTime() - now) : 0;
  const countdown = formatCountdown(remaining);

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => { const next = { ...current }; delete next[key]; return next; });
    if (key === "email") setCheckoutOtpVerified(false);
  }

  function validateDetails() {
    const next: Record<string, string> = {};
    if (!draft.email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) next.email = "Enter a valid email address.";
    if (!draft.firstName.trim()) next.firstName = "First name is required.";
    if (!draft.lastName.trim()) next.lastName = "Last name is required.";
    if (!draft.address.trim()) next.address = "Address is required.";
    if (!draft.city.trim()) next.city = "City is required.";
    if (!draft.state.trim()) next.state = "State is required.";
    if (!draft.zipCode.trim()) next.zipCode = "ZIP code is required.";
    if (!draft.country.trim()) next.country = "Country is required.";
    if (!draft.phone.trim()) next.phone = "Phone is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function requestCheckoutOtp(emailOverride?: string) {
    const email = (emailOverride ?? draft.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setOtpStep(false);
      setStep(1);
      setErrors((c) => ({ ...c, email: "Enter a valid email address before checkout verification." }));
      return;
    }
    setOtpSending(true);
    setOtpError("");
    try {
      await sendCheckoutOtp(email);
      setOtpDigits(Array(6).fill(""));
      setOtpCooldown(60);
      setOtpStep(true);
      toast.success("Verification code sent to your email.");
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : "Could not send verification code.");
      setOtpStep(true);
    } finally {
      setOtpSending(false);
    }
  }

  async function verifyCheckoutOtpCode(code?: string) {
    const otp = (code ?? otpDigits.join("")).trim();
    if (!/^\d{6}$/.test(otp) || otpVerifying) return;
    setOtpVerifying(true);
    setOtpError("");
    try {
      await verifyCheckoutOtp(draft.email.trim().toLowerCase(), otp);
      setCheckoutOtpVerified(true);
      setOtpStep(false);
      setStep(1);
      toast.success("Email verified. Continue with your details.");
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : "Could not verify code.");
      setOtpDigits(Array(6).fill(""));
    } finally {
      setOtpVerifying(false);
    }
  }

  function applyDiscountCode() {
    const code = discountInput.trim().toUpperCase();
    if (!code) { setErrors((c) => ({ ...c, discount: "Enter a discount or gift card code." })); return; }
    if (appliedDiscount?.code === code) { setErrors((c) => ({ ...c, discount: "This code is already applied." })); return; }
    if (promo && promo.code.toUpperCase() === code) {
      const amount = Math.round(subtotal * promo.rate * 100) / 100;
      setAppliedDiscount({ code, amount });
      setDraft((c) => ({ ...c, discountCode: code }));
      setErrors((c) => { const n = { ...c }; delete n.discount; return n; });
      toast.success("Discount applied.");
      return;
    }
    setErrors((c) => ({ ...c, discount: "This code is invalid or not available." }));
  }

  const { run: startPayment, pending: startingPayment, error: paymentError } = useAsyncAction(async () => {
    if (draft.paymentMethod === "crypto" && !selectedWallet) throw new AppError("No crypto wallet is available.");
    const payload = {
      lines,
      details: {
        email: draft.email.trim(),
        marketingOptIn: draft.marketingOptIn,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        address: draft.address.trim(),
        apartment: draft.apartment.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        zipCode: draft.zipCode.trim(),
        country: draft.country.trim(),
        phone: draft.phone.trim(),
        deliveryMethod: draft.deliveryMethod,
      },
      method: draft.paymentMethod,
      walletId: draft.paymentMethod === "crypto" ? selectedWallet?.id : undefined,
      subtotal,
      shipping,
      tax,
      discount,
      total,
      currency: "USD",
      promoCode: discountCode,
      discountCode,
    };
    try {
      const created = await createCheckoutSession(payload, token);
      rememberCheckoutSession(created.id);
      setSession(created);
      setNow(Date.now());
      setStep(3);
    } catch (e) {
      const err = e as AppError & { code?: string };
      if (err instanceof AppError && (err.code === "checkout_otp_required" || err.status === 403)) {
        setCheckoutOtpVerified(false);
        setOtpStep(true);
        setStep(1);
        void requestCheckoutOtp();
        return;
      }
      throw e;
    }
  }, { silent: true, fallback: "Could not prepare checkout. Try again." });

  const { run: submitCard, pending: submittingCard, error: cardError } = useAsyncAction(async (sessionId: string) => {
    setSession((current) => (current && current.id === sessionId ? { ...current, status: "failed" } : current));
  }, { silent: true, fallback: "Could not process card payment." });

  const { run: submitProof, pending: submittingProof, error: proofError } = useAsyncAction(async (sessionId: string) => {
    const txHash = proofTxHash.trim();
    if (!txHash) { setErrors((c) => ({ ...c, proofTxHash: "Enter a transaction hash or transfer reference." })); return; }
    const result = await submitPaymentProof(sessionId, { txHash, note: proofNote.trim() || undefined });
    setSession(result.session);
    toast.success("Proof submitted. We’ll verify it shortly.");
  }, { silent: true, fallback: "Could not submit proof." });

  const { run: confirmWire, pending: confirmingWire } = useAsyncAction(async (sessionId: string) => {
    const result = await confirmPayment(sessionId);
    setSession(result.session);
    toast.success("Transfer marked as sent.");
  }, { silent: true, fallback: "Could not confirm transfer." });

  function cancelCheckout() {
    clearRememberedCheckoutSession();
    setSession(null);
    setStep(1);
  }
  function changeMethod(next: PaymentMethod) {
    clearRememberedCheckoutSession();
    setSession(null);
    setDraft((c) => ({ ...c, paymentMethod: next }));
    setStep(2);
  }

  const summary = (
    <aside className="h-fit rounded-2xl border border-[#DCE1ED] bg-white p-5 shadow-sm lg:sticky lg:top-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#20212B]">Order summary</h2>
        <span className="text-sm text-[#737D94]">{items.length} item{items.length === 1 ? "" : "s"}</span>
      </div>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F0F2F8]">
              {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#737D94]">{item.kind}</div>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#20212B]">{item.name}</p>
              <p className="truncate text-xs text-[#737D94]">{item.meta}</p>
              <p className="mt-1 text-xs text-[#737D94]">Qty {item.quantity}</p>
            </div>
            <p className="text-sm font-medium text-[#20212B]">{money(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-[#DCE1ED] pt-4">
        <label className="mb-1.5 block text-sm font-medium text-[#20212B]">Discount or gift card code</label>
        <div className="flex gap-2">
          <Input value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="Discount or gift card code" error={errors.discount} className="uppercase" />
          <button type="button" onClick={applyDiscountCode} className="h-11 rounded-xl border border-[#DCE1ED] px-4 text-sm font-semibold text-[#20212B] hover:border-[#5965F5]">Apply</button>
        </div>
        {appliedDiscount && <p className="mt-2 text-xs text-green-700">Applied {appliedDiscount.code}</p>}
        <p className="mt-3 text-base text-[#5c5e66]">Generic Pc&apos;s come with a keyboard and a mouse</p>
        <p className="mt-1 text-base text-[#5c5e66]">Free shipping: Est. Delivery in 3-5 business days</p>
      </div>

      <dl className="mt-5 space-y-2 border-t border-[#DCE1ED] pt-4 text-sm">
        <div className="flex justify-between"><dt className="text-[#737D94]">Subtotal</dt><dd className="text-[#20212B]">{money(subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-[#737D94]">Shipping</dt><dd className="text-[#20212B]">{shipping === 0 ? "Free" : money(shipping)}</dd></div>
        <div className="flex justify-between"><dt className="text-[#737D94]">Estimated tax</dt><dd className="text-[#20212B]">{money(tax)}</dd></div>
        {discount > 0 && <div className="flex justify-between"><dt className="text-[#737D94]">Discount</dt><dd className="text-green-700">−{money(discount)}</dd></div>}
        <div className="flex justify-between border-t border-[#DCE1ED] pt-3 text-base font-semibold"><dt className="text-[#20212B]">Total</dt><dd className="text-[#20212B]">{money(total)} <span className="text-xs font-normal text-[#737D94]">USD</span></dd></div>
      </dl>
      <div className="mt-4 flex items-center gap-2 text-xs text-[#737D94]"><span aria-hidden="true">🔒</span><span>Payments are encrypted and processed securely.</span></div>
    </aside>
  );

  if (!ready || restoring || !draftReady) {
    return <div className="min-h-screen bg-[#F0F2F8]"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="h-64 animate-pulse rounded-2xl bg-white" /></div></div>;
  }

  const detailsStep = (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-[#DCE1ED] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#20212B]">Contact</h2>
          <p className="mt-1 text-sm text-[#737D94]">We&apos;ll send your receipt and shipping updates here.</p>
          <div className="mt-5 space-y-4">
            <Field label="Email"><Input type="email" value={draft.email} onChange={(e) => setField("email", e.target.value)} error={errors.email} autoComplete="email" /></Field>
            <label className="flex items-start gap-3 text-sm text-[#20212B]">
              <input type="checkbox" checked={draft.marketingOptIn} onChange={(e) => setField("marketingOptIn", e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-[#DCE1ED] text-[#5965F5]" />
              <span>Email me about new laptop drops and deals</span>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#DCE1ED] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#20212B]">Shipping address</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="First name"><Input value={draft.firstName} onChange={(e) => setField("firstName", e.target.value)} error={errors.firstName} autoComplete="given-name" /></Field>
            <Field label="Last name"><Input value={draft.lastName} onChange={(e) => setField("lastName", e.target.value)} error={errors.lastName} autoComplete="family-name" /></Field>
            <Field label="Address" className="sm:col-span-2"><Input value={draft.address} onChange={(e) => setField("address", e.target.value)} error={errors.address} autoComplete="street-address" /></Field>
            <Field label="Apartment, suite, etc." className="sm:col-span-2"><Input value={draft.apartment} onChange={(e) => setField("apartment", e.target.value)} autoComplete="address-line2" /></Field>
            <Field label="City"><Input value={draft.city} onChange={(e) => setField("city", e.target.value)} error={errors.city} autoComplete="address-level2" /></Field>
            <Field label="State"><Input value={draft.state} onChange={(e) => setField("state", e.target.value)} error={errors.state} autoComplete="address-level1" /></Field>
            <Field label="ZIP code"><Input value={draft.zipCode} onChange={(e) => setField("zipCode", e.target.value)} error={errors.zipCode} autoComplete="postal-code" /></Field>
            <Field label="Country"><Input value={draft.country} onChange={(e) => { setField("country", e.target.value); setRegionCountry(e.target.value); }} error={errors.country} autoComplete="country-name" /></Field>
            <Field label="Phone"><Input value={draft.phone} onChange={(e) => setField("phone", e.target.value)} error={errors.phone} autoComplete="tel" /></Field>
          </div>
        </section>

        <section className="rounded-2xl border border-[#DCE1ED] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#20212B]">Delivery method</h2>
          <div className="mt-5 space-y-3">
            {(["standard", "express"] as const).map((method) => {
              const option = DELIVERY_OPTIONS[method];
              const selected = draft.deliveryMethod === method;
              return (
                <button key={method} type="button" onClick={() => setField("deliveryMethod", method)} className={`flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left ${selected ? "border-[#5965F5] bg-[#EEF0FF]" : "border-[#DCE1ED] bg-white"}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-[#5965F5]" : "border-[#DCE1ED]"}`}><span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-[#5965F5]" : "bg-transparent"}`} /></span>
                    <div>
                      <p className="font-medium text-[#20212B]">{option.label}</p>
                      <p className="text-sm text-[#737D94]">{option.description}</p>
                      <p className="text-sm text-[#737D94]">Estimated arrival: {formatDeliveryWindow(method)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[#20212B]">{option.price === 0 ? "Free" : money(option.price)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between">
          <Link href="/cart" className="text-sm font-medium text-[#5965F5] hover:underline">← Return to cart</Link>
          <button type="button" disabled={otpSending} onClick={() => { if (!validateDetails()) return; if (checkoutOtpVerified) { setStep(2); return; } void requestCheckoutOtp(); }} className="rounded-xl bg-[#5965F5] px-6 py-3 text-sm font-semibold text-white hover:bg-[#4d58e0] disabled:opacity-60">{otpSending ? "Sending code..." : "Continue to payment"}</button>
        </div>
      </div>
      {summary}
    </div>
  );

  const otpVerificationStep = (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-[#DCE1ED] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#20212B]">Verify your email</h2>
          <p className="mt-1 text-sm text-[#737D94]">Enter the 6-digit code we sent to <span className="font-medium text-[#20212B]">{draft.email || "your email"}</span> to continue to checkout.</p>
          {!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()) && (
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-[#20212B]">Email for verification</label>
              <input value={draft.email} onChange={(e) => setField("email", e.target.value)} className="h-11 w-full rounded-xl border border-[#DCE1ED] px-3.5 text-sm outline-none focus:border-[#5965F5]" placeholder="you@example.com" />
              <button type="button" disabled={otpSending} onClick={() => void requestCheckoutOtp()} className="mt-3 rounded-xl bg-[#5965F5] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{otpSending ? "Sending..." : "Send code"}</button>
            </div>
          )}
          <div className="mt-5 grid grid-cols-6 gap-2" role="group" aria-label="Checkout verification code">
            {otpDigits.map((digit, index) => (
              <input key={index} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(-1);
                const next = [...otpDigits]; next[index] = v; setOtpDigits(next); setOtpError("");
                const code = next.join(""); if (code.length === 6 && !next.includes("")) void verifyCheckoutOtpCode(code);
              }} className={`h-12 w-full rounded-xl border bg-[#f8fafe] text-center text-lg font-bold text-[#20212B] outline-none focus:border-[#5965F5] ${otpError ? "border-red-400" : "border-[#DCE1ED]"}`} />
            ))}
          </div>
          {otpError && <p className="mt-3 text-sm text-red-600">{otpError}</p>}
          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" onClick={() => setOtpStep(false)} className="font-medium text-[#5965F5] hover:underline">← Back to details</button>
            <button type="button" disabled={otpCooldown > 0 || otpSending} onClick={() => void requestCheckoutOtp()} className="font-medium text-[#5965F5] disabled:opacity-50">{otpCooldown > 0 ? `Resend in ${otpCooldown}s` : otpSending ? "Sending..." : "Resend code"}</button>
          </div>
        </section>
        <div className="flex items-center justify-end">
          <button type="button" disabled={otpVerifying || otpDigits.join("").length !== 6 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())} onClick={() => void verifyCheckoutOtpCode()} className="rounded-xl bg-[#5965F5] px-6 py-3 text-sm font-semibold text-white hover:bg-[#4d58e0] disabled:opacity-60">{otpVerifying ? "Verifying..." : "Verify and continue"}</button>
        </div>
      </div>
      {summary}
    </div>
  );

  const paymentStep = (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-[#DCE1ED] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#20212B]">Contact &amp; shipping</h2>
          <dl className="mt-5 divide-y divide-[#DCE1ED] text-sm">
            <div className="flex items-start justify-between gap-4 py-3"><dt className="w-24 text-[#737D94]">Contact</dt><dd className="flex-1 text-[#20212B]">{draft.email}</dd><button type="button" onClick={() => setStep(1)} className="text-[#5965F5] hover:underline">Change</button></div>
            <div className="flex items-start justify-between gap-4 py-3"><dt className="w-24 text-[#737D94]">Ship to</dt><dd className="flex-1 text-[#20212B]">{formatCheckoutAddress({ ...draft, zipCode: draft.zipCode, marketingOptIn: draft.marketingOptIn, deliveryMethod: draft.deliveryMethod })}</dd><button type="button" onClick={() => setStep(1)} className="text-[#5965F5] hover:underline">Change</button></div>
            <div className="flex items-start justify-between gap-4 py-3"><dt className="w-24 text-[#737D94]">Method</dt><dd className="flex-1 text-[#20212B]">{DELIVERY_OPTIONS[draft.deliveryMethod].label} · {DELIVERY_OPTIONS[draft.deliveryMethod].price === 0 ? "Free" : money(DELIVERY_OPTIONS[draft.deliveryMethod].price)}</dd><button type="button" onClick={() => setStep(1)} className="text-[#5965F5] hover:underline">Change</button></div>
          </dl>
        </section>

        <section className="rounded-2xl border border-[#DCE1ED] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#20212B]">Payment method</h2>
          <p className="mt-1 text-sm text-[#737D94]">Choose how you&apos;d like to pay. All transactions are secure and encrypted.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {paymentMethods.map((option) => {
              const selected = draft.paymentMethod === option.value;
              return (
                <button key={option.value} type="button" onClick={() => setField("paymentMethod", option.value)} className={`relative rounded-xl border p-4 text-left ${selected ? "border-[#5965F5] bg-[#EEF0FF]" : "border-[#DCE1ED] bg-white"}`}>
                  {option.badge && <span className="absolute right-3 top-3 rounded-full bg-[#5965F5]/10 px-2 py-0.5 text-[10px] font-semibold text-[#5965F5]">{option.badge}</span>}
                  <div className="mb-3 text-[#20212B]">{option.value === "crypto" ? "₿" : option.value === "card" ? "💳" : "🏦"}</div>
                  <p className="font-medium text-[#20212B]">{option.label}</p>
                  <p className="mt-1 text-sm text-[#737D94]">{option.description}</p>
                  <span className={`mt-4 inline-flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-[#5965F5]" : "border-[#DCE1ED]"}`}><span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-[#5965F5]" : "bg-transparent"}`} /></span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 rounded-xl border border-[#DCE1ED] bg-[#F8FAFF] p-4 text-sm text-[#20212B]">
            {draft.paymentMethod === "crypto" && "Crypto payments confirm in minutes, so your laptop ships sooner. You'll see the wallet address on the next step."}
            {draft.paymentMethod === "card" && "Pay securely using your debit or credit card. Your payment will be processed through our secure payment provider."}
            {draft.paymentMethod === "wire" && "Complete your bank transfer using the payment details provided on the next step. Your order will be processed once payment is confirmed."}
          </div>
          {(errors.form || paymentError) && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errors.form || paymentError}</p>}
        </section>

        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setStep(1)} className="text-sm font-medium text-[#5965F5] hover:underline">← Return to details</button>
          <button type="button" disabled={startingPayment} onClick={() => { if (!draft.paymentMethod) { setErrors({ form: "Select a payment method." }); return; } void startPayment(); }} className="rounded-xl bg-[#5965F5] px-6 py-3 text-sm font-semibold text-white hover:bg-[#4d58e0] disabled:opacity-60">{startingPayment ? "Preparing..." : "Continue"}</button>
        </div>
      </div>
      {summary}
    </div>
  );

  const contactShippingCard = (
    <section className="rounded-2xl border border-[#DCE1ED] bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-[#20212B]">Contact &amp; shipping</h2>
      <dl className="mt-6 divide-y divide-[#DCE1ED] text-sm">
        <div className="flex items-start justify-between gap-4 py-4"><dt className="w-28 text-[#737D94]">Contact</dt><dd className="flex-1 font-medium text-[#20212B]">{draft.email}</dd><button type="button" onClick={() => setStep(1)} className="font-medium text-[#5965F5] hover:underline">Change</button></div>
        <div className="flex items-start justify-between gap-4 py-4"><dt className="w-28 text-[#737D94]">Ship to</dt><dd className="flex-1 font-medium text-[#20212B]">{formatCheckoutAddress({ ...draft, zipCode: draft.zipCode, marketingOptIn: draft.marketingOptIn, deliveryMethod: draft.deliveryMethod })}</dd><button type="button" onClick={() => setStep(1)} className="font-medium text-[#5965F5] hover:underline">Change</button></div>
        <div className="flex items-start justify-between gap-4 py-4"><dt className="w-28 text-[#737D94]">Method</dt><dd className="flex-1 font-medium text-[#20212B]">{DELIVERY_OPTIONS[draft.deliveryMethod].label} · {DELIVERY_OPTIONS[draft.deliveryMethod].price === 0 ? "Free" : money(DELIVERY_OPTIONS[draft.deliveryMethod].price)}</dd><button type="button" onClick={() => setStep(1)} className="font-medium text-[#5965F5] hover:underline">Change</button></div>
      </dl>
    </section>
  );

  const wirePending = session?.method === "wire" && session.instructions.method === "wire" && !session.instructions.wireDetails;

  const instructionsStep = session && (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_392px]">
      <div className="space-y-6">
        {contactShippingCard}

        <section className="rounded-2xl border border-[#DCE1ED] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#20212B]">
                {session.method === "card" ? "Pay by card" : session.method === "crypto" ? "Pay with crypto" : wirePending ? "Getting your wire transfer details" : "Pay by wire transfer"}
              </h2>
              <p className="mt-2 text-sm text-[#737D94]">
                {session.method === "card" && `Enter your card details. You’ll be charged ${money(session.total)}.`}
                {session.method === "crypto" && "Send the exact amount below. Your rate is locked while the timer runs."}
                {session.method === "wire" && (wirePending ? "Bank details depend on your country, so we’re fetching the right account for your location." : "Send the total from your bank using the details below.")}
              </p>
            </div>
            <button type="button" onClick={() => setStep(2)} className="text-sm font-medium text-[#5965F5] hover:underline">Change method</button>
          </div>

          {session.method === "card" && session.status !== "paid" && (
            <div className="mt-6 space-y-5">
              {session.status === "submitted" ? (
                <div className="rounded-xl border border-[#DCE1ED] bg-[#F8FAFF] p-4 text-sm text-[#20212B]">
                  <p className="font-semibold">Card submitted for review</p>
                  <p className="mt-1 text-[#737D94]">We’ve received your card details (masked). An admin will review and approve the payment.</p>
                  {session.cardSummary && <p className="mt-2 font-mono text-xs">{session.cardSummary.brand} •••• {session.cardSummary.last4} · {session.cardSummary.expMonth}/{session.cardSummary.expYear}</p>}
                </div>
              ) : (
                <>
                  <Field label="Card number"><Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242" /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Expiry date"><Input value={cardExpMonth && cardExpYear ? `${cardExpMonth} / ${cardExpYear}` : cardExpMonth} onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ""); setCardExpMonth(v.slice(0,2)); setCardExpYear(v.slice(2,4)); }} placeholder="MM / YY" /></Field>
                    <Field label="Security code (CVC)"><Input value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0,4))} placeholder="•••" /></Field>
                  </div>
                  <Field label="Name on card"><Input value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} placeholder="Ada Okafor" /></Field>
                  <label className="flex items-center gap-3 text-sm text-[#20212B]"><input type="checkbox" checked={billingSameAsShipping} onChange={(e) => setBillingSameAsShipping(e.target.checked)} className="h-4 w-4 rounded border-[#DCE1ED] text-[#5965F5]" />Billing address is the same as shipping</label>
                  {!billingSameAsShipping && (
                    <div className="border-t border-[#DCE1ED] pt-5">
                      <h3 className="text-lg font-semibold text-[#20212B]">Billing address</h3>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Field label="First name"><Input value={billing.firstName} onChange={(e) => setBilling({ ...billing, firstName: e.target.value })} /></Field>
                        <Field label="Last name"><Input value={billing.lastName} onChange={(e) => setBilling({ ...billing, lastName: e.target.value })} /></Field>
                        <Field label="Address" className="sm:col-span-2"><Input value={billing.address} onChange={(e) => setBilling({ ...billing, address: e.target.value })} /></Field>
                        <Field label="Apartment, suite, etc. (optional)" className="sm:col-span-2"><Input value={billing.apartment} onChange={(e) => setBilling({ ...billing, apartment: e.target.value })} /></Field>
                        <Field label="City"><Input value={billing.city} onChange={(e) => setBilling({ ...billing, city: e.target.value })} /></Field>
                        <Field label="State"><Input value={billing.state} onChange={(e) => setBilling({ ...billing, state: e.target.value })} /></Field>
                        <Field label="ZIP code"><Input value={billing.zipCode} onChange={(e) => setBilling({ ...billing, zipCode: e.target.value })} /></Field>
                        <Field label="Country" className="sm:col-span-2"><Input value={billing.country} onChange={(e) => setBilling({ ...billing, country: e.target.value })} /></Field>
                      </div>
                    </div>
                  )}
                  {cardError && <p className="text-sm text-red-600">{cardError}</p>}
                </>
              )}
            </div>
          )}

          {session.method === "crypto" && session.instructions.method === "crypto" && (
            <div className="mt-6 space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium text-[#20212B]">Currency</p>
                <div className="flex flex-wrap gap-2">
                  {wallets.map((w) => {
                    const selected = w.id === (session.instructions.method === "crypto" ? session.instructions.walletId : walletId);
                    const cfg = cryptoNetworks.find((n) => n.value === w.network);
                    return <button key={w.id} type="button" onClick={() => { if (!session || session.instructions.method !== "crypto") return; setWalletId(w.id); const rate = cfg?.rate ?? 1; const dec = cfg?.decimals ?? 2; setSession({ ...session, walletId: w.id, instructions: { ...session.instructions, walletId: w.id, walletLabel: w.label, network: w.network, currency: w.currency, address: w.address, qrCodeUrl: w.qrCodeUrl ?? null, amount: (session.total / rate).toFixed(dec), confirmations: cfg?.confirmations ?? 1 } }); void updateCheckoutWallet(session.id, w.id).then((r) => setSession(r.session)).catch((e) => toast.error(e instanceof Error ? e.message : "Could not update wallet.")); }} className={`rounded-full border px-4 py-2 text-sm font-medium ${selected ? "border-[#5965F5] bg-[#EEF0FF] text-[#5965F5]" : "border-[#DCE1ED] text-[#20212B]"}`}>{w.currency}</button>;
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-[#20212B]">Network</p>
                <div className="flex h-11 items-center justify-between rounded-xl border border-[#DCE1ED] px-3.5 text-sm text-[#20212B]"><span>{session.instructions.network.toUpperCase()}</span><span className="text-[#737D94]">▾</span></div>
              </div>
              <div className="rounded-2xl bg-[#F4F7FB] p-4 sm:p-5">
                <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl bg-white border border-[#DCE1ED] p-2">
                    {session.instructions.method === "crypto" && session.instructions.qrCodeUrl ? (
                      <img src={session.instructions.qrCodeUrl} alt={`${session.instructions.currency} payment QR code`} className="h-full w-full object-contain" />
                    ) : (
                      <span className="px-2 text-center text-xs text-[#737D94]">QR code unavailable</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-[#737D94]">Send exactly</p>
                    <div className="mt-1 flex items-center gap-2"><p className="text-3xl font-semibold text-[#20212B]">{session.instructions.amount} {session.instructions.currency}</p><button type="button" onClick={() => { void navigator.clipboard.writeText(session.instructions.amount); toast.success("Amount copied."); }} className="text-[#5965F5]">⧉</button></div>
                    <p className="mt-2 text-sm text-[#737D94]">≈ {money(session.total)} · 1 {session.instructions.currency} = ${ (session.total / Number(session.instructions.amount || 1)).toFixed(2) }</p>
                    <p className="mt-5 text-sm text-[#737D94]">To this wallet address</p>
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#DCE1ED] bg-white px-3 py-2.5">
                      <code className="min-w-0 flex-1 overflow-x-auto text-xs text-[#20212B]">{session.instructions.method === "crypto" ? session.instructions.address : ""}</code>
                      <button type="button" onClick={() => { if (session.instructions.method === "crypto") { void navigator.clipboard.writeText(session.instructions.address); toast.success("Address copied."); } }} className="shrink-0 text-sm font-medium text-[#5965F5]">Copy</button>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EEF0FF] px-3 py-1.5 text-xs font-medium text-[#5965F5]"><span>◷</span><span>Rate locked for {countdown}</span></div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#F1D48A] bg-[#FFF8E7] p-4 text-sm text-[#6B4E00]">Send only {session.instructions.currency} on the {session.instructions.network.toUpperCase()} network. Funds sent in another coin or on another network can’t be recovered.</div>
              <p className="text-sm text-[#737D94]">After sending, submit your transaction hash/reference below for admin verification.</p>
              <Field label="Transaction hash / reference"><Input value={proofTxHash} onChange={(e) => setProofTxHash(e.target.value)} error={errors.proofTxHash} /></Field>
              <Field label="Note (optional)"><Input value={proofNote} onChange={(e) => setProofNote(e.target.value)} /></Field>
              {proofError && <p className="text-sm text-red-600">{proofError}</p>}
            </div>
          )}

          {session.method === "wire" && session.instructions.method === "wire" && !session.instructions.wireDetails && (
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl bg-[#F4F7FB] px-6 py-8 text-center">
                <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-[#D7DCEF] border-t-[#5965F5]" aria-label="Loading" />
                <p className="text-lg font-semibold text-[#20212B]">Fetching wire transfer details for {draft.country || "your location"}...</p>
                <p className="mt-2 text-sm text-[#737D94]">Usually ready within a few hours, and no later than 1 business day.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5965F5] text-white"><CheckIcon className="h-3.5 w-3.5" /></span>
                  <p className="text-sm font-medium text-[#20212B]">Order {session.reference} reserved for 5 business days</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#5965F5]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#5965F5]" />
                  </span>
                  <p className="text-sm font-medium text-[#20212B]">Finding a bank account for your location</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#D7DCEF]" />
                  <p className="text-sm text-[#737D94]">Bank details emailed to {session.details.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-[#EEF0FF] px-4 py-3 text-sm text-[#20212B]">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-[#5965F5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="m22 6-10 7L2 6"/></svg>
                <p>We’ll email the bank details to <span className="font-medium">{session.details.email}</span> as soon as they’re ready. It’s safe to close this page.</p>
              </div>
            </div>
          )}

          {session.method === "wire" && session.instructions.method === "wire" && session.instructions.wireDetails && (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-[#F1D48A] bg-[#FFF8E7] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#6B4E00]"><span>ⓘ</span> Payment reference — required</p>
                <div className="mt-2 flex items-center gap-2"><p className="text-3xl font-semibold text-[#20212B]">{session.reference}</p><button type="button" onClick={() => { void navigator.clipboard.writeText(session.reference); toast.success("Reference copied."); }} className="text-sm font-medium text-[#5965F5]">Copy</button></div>
                <p className="mt-2 text-sm text-[#6B4E00]">Add this reference to your transfer so we can match it to your order. Transfers without it can take several extra days to process.</p>
              </div>
              <p className="text-sm text-[#737D94]">Send the total from your bank to the account below. We’ll hold your items for 5 business days and ship as soon as the funds arrive.</p>
              <div className="rounded-2xl bg-[#F4F7FB] p-4 sm:p-5">
                <dl className="divide-y divide-[#DCE1ED]">
                  {[
                    ["Beneficiary", session.instructions.wireDetails.beneficiary],
                    ["Bank", session.instructions.wireDetails.bankName],
                    ["Account number", session.instructions.wireDetails.accountNumber],
                    ["Routing number (ABA)", session.instructions.wireDetails.routing],
                    ["SWIFT / BIC", session.instructions.wireDetails.swift],
                    ["Amount", `USD ${session.instructions.amount}`],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={String(k)} className="flex items-center justify-between gap-4 py-3 text-sm">
                      <dt className="text-[#737D94]">{k}</dt>
                      <div className="flex items-center gap-3"><dd className="font-medium text-[#20212B]">{v}</dd><button type="button" onClick={() => { void navigator.clipboard.writeText(String(v)); toast.success("Copied."); }} className="text-[#5965F5]">Copy</button></div>
                    </div>
                  ))}
                </dl>
              </div>
              <Field label="Transfer reference / proof"><Input value={proofTxHash} onChange={(e) => setProofTxHash(e.target.value)} error={errors.proofTxHash} /></Field>
              <Field label="Note (optional)"><Input value={proofNote} onChange={(e) => setProofNote(e.target.value)} /></Field>
              {proofError && <p className="text-sm text-red-600">{proofError}</p>}
              <button type="button" onClick={() => window.print()} className="rounded-xl border border-[#DCE1ED] px-4 py-2.5 text-sm font-semibold text-[#20212B] hover:border-[#5965F5]">Download invoice (PDF)</button>
            </div>
          )}

          {session.status === "paid" && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-800">Payment confirmed</p>
              <p className="mt-1 text-sm text-green-700">Your order {session.reference} is confirmed. A receipt will be sent to {session.details.email}.</p>
            </div>
          )}
        </section>

        {wirePending && (
          <section className="rounded-2xl border border-[#AAB4FF] bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[#5965F5]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18M8 7h6a3 3 0 0 1 0 6H8h7a3 3 0 0 1 0 6H8"/></svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-semibold text-[#20212B]">Don’t want to wait? Pay with crypto</h3>
                  <span className="rounded-full bg-[#EEF0FF] px-2.5 py-1 text-xs font-semibold text-[#5965F5]">Faster</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#737D94]">
                  Crypto payments confirm in minutes, so your laptop ships sooner. Same total of {money(session.total)}, payable in USDC, USDT, BTC or ETH.
                </p>
                <button type="button" onClick={() => changeMethod("crypto")} className="mt-5 rounded-xl bg-[#5965F5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#4d58e0]">Pay with crypto instead</button>
              </div>
            </div>
          </section>
        )}

        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => setStep(2)} className="flex items-center gap-2 text-sm font-medium text-[#5965F5] hover:underline"><span aria-hidden="true">←</span> Back to payment method</button>
          {session.method === "card" && session.status !== "paid" && session.status !== "submitted" && <button type="button" disabled={submittingCard} onClick={() => void submitCard(session.id)} className="rounded-xl bg-[#5965F5] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#4d58e0] disabled:opacity-60">{submittingCard ? "Processing..." : `Pay ${money(session.total)}`}</button>}
          {session.method === "crypto" && session.status !== "paid" && session.status !== "submitted" && <button type="button" disabled={submittingProof} onClick={() => void submitProof(session.id)} className="rounded-xl bg-[#5965F5] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#4d58e0] disabled:opacity-60">{submittingProof ? "Submitting..." : "I've sent the payment"}</button>}
          {session.method === "wire" && !wirePending && session.status !== "paid" && session.status !== "submitted" && <button type="button" disabled={submittingProof || confirmingWire} onClick={() => { if (proofTxHash.trim()) void submitProof(session.id); else void confirmWire(session.id); }} className="rounded-xl bg-[#5965F5] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#4d58e0] disabled:opacity-60">{submittingProof || confirmingWire ? "Placing..." : "Place order"}</button>}
          {wirePending && <button type="button" onClick={() => { void notifyWirePending(session.id).catch(() => {}); toast.success("We’ll email you and our support team when bank details are ready."); router.push("/"); }} className="rounded-xl border border-[#DCE1ED] bg-white px-6 py-3.5 text-sm font-semibold text-[#20212B] hover:border-[#5965F5]">I’ll wait for the email</button>}
        </div>
      </div>
      {summary}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F2F8] text-[#20212B]">
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <Progress step={step} />
        {otpStep ? otpVerificationStep : step === 1 ? detailsStep : step === 2 ? paymentStep : instructionsStep}
      </div>

      {session && session.status === "failed" && session.method === "card" && (
        <PaymentFailedModal
          amount={money(session.total)}
          onClose={cancelCheckout}
          onUpdateCard={() => setSession((c) => c ? { ...c, status: "awaiting_payment" } : c)}
          onPayWithCrypto={() => changeMethod("crypto")}
          onPayWithWire={() => changeMethod("wire")}
        />
      )}
    </div>
  );
}
