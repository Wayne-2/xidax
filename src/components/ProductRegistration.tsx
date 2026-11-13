"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/BuildIcons";
import { useAccount } from "@/components/AccountProvider";
import { registerProductRemote } from "@/lib/api";
import {
  generateLabelNumber,
  generateTrackingNumber,
  type RegisteredProduct,
} from "@/data/account";

function DesktopIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

function LaptopIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="11" rx="1.5" />
      <path d="M2 19h20l-1.5-4H3.5L2 19Z" />
    </svg>
  );
}

function CopyIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </svg>
  );
}

export default function ProductRegistration() {
  const { registeredProducts, registerProduct, removeProduct, user } =
    useAccount();
  const [kind, setKind] = useState<"pc" | "laptop">("pc");
  const [name, setName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [purchasedOn, setPurchasedOn] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issued, setIssued] = useState<RegisteredProduct | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fieldClass =
    "h-11 w-full rounded-xl border bg-[#f8fafe] px-3.5 text-sm text-[#2e3338] outline-none transition-colors placeholder:text-[#80848e]";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};

    if (!name.trim()) next.name = "Name the machine you bought.";
    if (!orderNumber.trim()) next.orderNumber = "Add your order number.";
    if (!purchasedOn) next.purchasedOn = "Pick the purchase date.";

    setErrors(next);

    if (Object.keys(next).length > 0) return;

    const remote = await registerProductRemote({
      kind,
      name: name.trim(),
      orderNumber: orderNumber.trim().toUpperCase(),
      purchasedOn,
      email: user?.email ?? "",
    });

    const product: RegisteredProduct = {
      id: `reg-${Date.now()}`,
      kind,
      name: name.trim(),
      orderNumber: orderNumber.trim().toUpperCase(),
      purchasedOn,
      labelNumber: remote.labelNumber ?? generateLabelNumber(),
      trackingNumber: remote.trackingNumber ?? generateTrackingNumber(),
    };

    registerProduct(product);
    setIssued(product);
    setName("");
    setOrderNumber("");
    setPurchasedOn("");
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section
      id="registered-products"
      className="mt-6 scroll-mt-28 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
            Registered products
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#5c5e66]">
            Register the PCs and laptops you bought from us. We issue a purchase
            label number and a tracking number for each machine so support can
            validate and locate it straight away.
          </p>
        </div>
        <span className="rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-[11px] font-semibold text-[#4e5058]">
          {registeredProducts.length}{" "}
          {registeredProducts.length === 1 ? "machine" : "machines"}
        </span>
      </div>

      {issued && (
        <div className="mt-5 rounded-xl border border-[#16A34A]/40 bg-[#16A34A]/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#15803D]">
            <CheckIcon className="h-4 w-4" />
            {issued.name} is registered
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Purchase label number", value: issued.labelNumber },
              { label: "Tracking number", value: issued.trackingNumber },
            ].map((entry) => (
              <div
                key={entry.label}
                className="rounded-lg border border-[#16A34A]/25 bg-white/70 px-3 py-2"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c5e66]">
                  {entry.label}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-[#2e3338]">
                    {entry.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyValue(entry.value)}
                    aria-label={`Copy ${entry.label}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#5c5e66] transition-colors hover:bg-[#eaf0f8] hover:text-[#2e3338]"
                  >
                    {copied === entry.value ? (
                      <CheckIcon className="h-3.5 w-3.5" />
                    ) : (
                      <CopyIcon />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-5 rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-4 sm:p-5"
      >
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#80848e]">
          Register a machine
        </h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]">
              Product type
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "pc", label: "PC", icon: DesktopIcon },
                  { value: "laptop", label: "Laptop", icon: LaptopIcon },
                ] as const
              ).map((option) => {
                const active = kind === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setKind(option.value)}
                    aria-pressed={active}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
                      active
                        ? "border-[#5865F2] bg-[#5865F2] text-white"
                        : "border-[#d2dbe8] bg-[#f8fafe] text-[#5c5e66] hover:border-[#b8c4d6] hover:text-[#2e3338]"
                    }`}
                  >
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="product-name"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
            >
              Product name
            </label>
            <input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ryzen Titan"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "product-name-error" : undefined}
              className={`${fieldClass} ${
                errors.name ? "border-[#DC2626]" : "border-[#d2dbe8]"
              }`}
            />
            {errors.name && (
              <p id="product-name-error" className="mt-1.5 text-xs text-[#B91C1C]">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="product-order"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
            >
              Order number
            </label>
            <input
              id="product-order"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              placeholder="PC-20418"
              aria-invalid={Boolean(errors.orderNumber)}
              aria-describedby={
                errors.orderNumber ? "product-order-error" : undefined
              }
              className={`${fieldClass} ${
                errors.orderNumber ? "border-[#DC2626]" : "border-[#d2dbe8]"
              }`}
            />
            {errors.orderNumber && (
              <p
                id="product-order-error"
                className="mt-1.5 text-xs text-[#B91C1C]"
              >
                {errors.orderNumber}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="product-date"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
            >
              Purchase date
            </label>
            <input
              id="product-date"
              type="date"
              value={purchasedOn}
              onChange={(event) => setPurchasedOn(event.target.value)}
              aria-invalid={Boolean(errors.purchasedOn)}
              aria-describedby={
                errors.purchasedOn ? "product-date-error" : undefined
              }
              className={`${fieldClass} ${
                errors.purchasedOn ? "border-[#DC2626]" : "border-[#d2dbe8]"
              }`}
            />
            {errors.purchasedOn && (
              <p
                id="product-date-error"
                className="mt-1.5 text-xs text-[#B91C1C]"
              >
                {errors.purchasedOn}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="mt-5 inline-flex h-11 touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
        >
          Issue label &amp; tracking number
        </button>
      </form>

      {registeredProducts.length > 0 && (
        <ul className="mt-5 space-y-3">
          {registeredProducts.map((product) => (
            <li
              key={product.id}
              className="rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5865F2]/10 text-[#5865F2]">
                    {product.kind === "pc" ? (
                      <DesktopIcon className="h-4 w-4" />
                    ) : (
                      <LaptopIcon className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#2e3338]">
                      {product.name}
                    </p>
                    <p className="truncate text-xs text-[#5c5e66]">
                      {product.kind === "pc" ? "PC" : "Laptop"} ·{" "}
                      {product.orderNumber} · purchased{" "}
                      {product.purchasedOn}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeProduct(product.id)}
                  aria-label={`Remove ${product.name} from registered products`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#80848e] transition-colors hover:bg-[#DC2626]/10 hover:text-[#B91C1C]"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Label number", value: product.labelNumber },
                  { label: "Tracking number", value: product.trackingNumber },
                ].map((entry) => (
                  <div
                    key={entry.label}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#d2dbe8] bg-white/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                        {entry.label}
                      </dt>
                      <dd className="truncate font-mono text-xs font-semibold text-[#2e3338]">
                        {entry.value}
                      </dd>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyValue(entry.value)}
                      aria-label={`Copy ${entry.label} for ${product.name}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#5c5e66] transition-colors hover:bg-[#eaf0f8] hover:text-[#2e3338]"
                    >
                      {copied === entry.value ? (
                        <CheckIcon className="h-3.5 w-3.5" />
                      ) : (
                        <CopyIcon />
                      )}
                    </button>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
