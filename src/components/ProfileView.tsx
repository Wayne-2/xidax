"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowIcon, CheckIcon } from "@/components/BuildIcons";
import { useAccount } from "@/components/AccountProvider";
import {
  accountOrders,
  currencies,
  languages,
  savedItems,
  type AccountOrderStatus,
} from "@/data/account";
import { countries } from "@/data/account";

const statusTone: Record<AccountOrderStatus, string> = {
  Delivered: "bg-[#16A34A]/10 text-[#15803D]",
  Building: "bg-[#B45309]/10 text-[#B45309]",
  "In transit": "bg-[#5865F2]/10 text-[#4752C4]",
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#2e3338]">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#5c5e66]">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#5865F2]" : "bg-[#c8d1de]"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 pr-9 text-sm text-[#2e3338] outline-none transition-colors focus:border-[#5865F2]"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#80848e]"
        >
          <ChevronIcon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

export default function ProfileView() {
  const router = useRouter();
  const {
    user,
    settings,
    ready,
    signOut,
    updateProfile,
    saveSettings,
    resetSettings,
  } = useAccount();
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (ready && !user) {
      router.replace("/login");
    }
  }, [ready, user, router]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) {
        clearTimeout(savedTimer.current);
      }
    };
  }, []);

  function markSaved() {
    setSaved(true);

    if (savedTimer.current) {
      clearTimeout(savedTimer.current);
    }

    savedTimer.current = setTimeout(() => setSaved(false), 2200);
  }

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[#dce3ee]" />
        <p className="mt-4 text-sm text-[#5c5e66]">Checking your session…</p>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const fieldClass =
    "h-11 w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 text-sm text-[#2e3338] outline-none transition-colors placeholder:text-[#80848e] focus:border-[#5865F2]";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm font-medium text-[#5c5e66]"
      >
        <Link href="/" className="transition-colors hover:text-[#5865F2]">
          Home
        </Link>
        <span aria-hidden="true" className="text-[#80848e]">
          /
        </span>
        <span className="text-[#2e3338]">Profile</span>
      </nav>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5865F2]">
            {user.tier}
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#2e3338] sm:text-5xl">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span
            aria-live="polite"
            className={`inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D] transition-opacity ${
              saved ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <CheckIcon className="h-3.5 w-3.5" />
            Changes saved
          </span>
          <button
            type="button"
            onClick={() => {
              signOut();
              router.push("/login");
            }}
            className="inline-flex h-11 touch-manipulation items-center justify-center gap-2 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
          >
            Sign out
          </button>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#5865F2] text-lg font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold tracking-tight text-[#2e3338]">
                {user.name}
              </p>
              <p className="truncate text-sm text-[#5c5e66]">{user.email}</p>
              <p className="mt-0.5 text-xs text-[#80848e]">
                Customer since {user.memberSince} · {user.phone}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {[
              { value: accountOrders.length, label: "Orders" },
              { value: savedItems.length, label: "Saved" },
              { value: "24/7", label: "Support" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl font-bold tracking-tight text-[#2e3338]">
                  {stat.value}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#80848e]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
              Recent orders
            </h2>
            <Link
              href="/prebuilds"
              className="text-xs font-semibold text-[#5865F2] transition-colors hover:text-[#4752C4]"
            >
              Shop again
            </Link>
          </div>

          <ul className="mt-4 space-y-3">
            {accountOrders.map((order) => (
              <li
                key={order.id}
                className="rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2e3338]">
                      {order.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#5c5e66]">
                      {order.detail}
                    </p>
                    <p className="mt-1 text-[11px] text-[#80848e]">
                      {order.id} · {order.date}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-sm font-bold text-[#2e3338]">
                      {money.format(order.total)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        statusTone[order.status]
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 border-t border-[#dce3ee] pt-3">
                  <Link
                    href={order.href}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5865F2] transition-colors hover:text-[#4752C4]"
                  >
                    View details
                    <ArrowIcon className="h-3 w-3" />
                  </Link>
                  <Link
                    href="/support"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5c5e66] transition-colors hover:text-[#5865F2]"
                  >
                    Get help with this order
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="min-w-0 space-y-6">
          <section className="min-w-0 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
              Saved for later
            </h2>

            <ul className="mt-4 space-y-3">
              {savedItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-3 transition-colors hover:border-[#5865F2]/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#2e3338]">
                        {item.name}
                      </span>
                      <span className="block truncate text-xs text-[#5c5e66]">
                        {item.kind} · {item.detail}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-[#5865F2]">
                      {money.format(item.price)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="min-w-0 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
              Account details
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#5c5e66]">Email</dt>
                <dd className="min-w-0 truncate font-semibold text-[#2e3338]">
                  {user.email}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#5c5e66]">Phone</dt>
                <dd className="min-w-0 truncate font-semibold text-[#2e3338]">
                  {user.phone}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#5c5e66]">Country</dt>
                <dd className="min-w-0 truncate font-semibold text-[#2e3338]">
                  {user.country}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#5c5e66]">Postal code</dt>
                <dd className="min-w-0 truncate font-semibold text-[#2e3338]">
                  {user.postalCode}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#5c5e66]">Account ID</dt>
                <dd className="min-w-0 truncate font-semibold text-[#2e3338]">
                  {user.id}
                </dd>
              </div>
            </dl>
          </section>

          <section className="min-w-0 rounded-2xl border border-[#5865F2]/25 bg-[#eaf0f8] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
              Need a hand?
            </h2>
            <ul className="mt-3 space-y-2">
              {[
                "Talk to a technician about an order",
                "Extend coverage on an older machine",
                "Book a parts or repair appointment",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-xs leading-relaxed text-[#5c5e66]"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#5865F2]/10 text-[#5865F2]">
                    <CheckIcon className="h-2.5 w-2.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/support"
              className="mt-4 inline-flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#5865F2] text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
            >
              Go to support
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>

      <section
        id="settings"
        className="mt-6 scroll-mt-28 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
              Settings
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#5c5e66]">
              Update your details, delivery address and notification
              preferences. Everything saves straight away on this device.
            </p>
          </div>
          <span
            aria-live="polite"
            className={`inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D] transition-opacity ${
              saved ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <CheckIcon className="h-3.5 w-3.5" />
            Changes saved
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#80848e]">
              Profile details
            </h3>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="settings-name"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                >
                  Full name
                </label>
                <input
                  id="settings-name"
                  value={user.name}
                  onChange={(event) => {
                    updateProfile({ name: event.target.value });
                    markSaved();
                  }}
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="settings-email"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                >
                  Email address
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={user.email}
                  onChange={(event) => {
                    updateProfile({ email: event.target.value });
                    markSaved();
                  }}
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="settings-phone"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                >
                  Phone
                </label>
                <input
                  id="settings-phone"
                  value={user.phone}
                  onChange={(event) => {
                    updateProfile({ phone: event.target.value });
                    markSaved();
                  }}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#80848e]">
              Delivery address
            </h3>

            <div className="mt-4 space-y-4">
              <SelectField
                id="settings-country"
                label="Country"
                value={user.country}
                options={countries.filter((option) => option !== "Other")}
                onChange={(next) => {
                  updateProfile({ country: next });
                  markSaved();
                }}
              />
              <div>
                <label
                  htmlFor="settings-postal"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
                >
                  Postal code
                </label>
                <input
                  id="settings-postal"
                  value={user.postalCode}
                  onChange={(event) => {
                    updateProfile({ postalCode: event.target.value });
                    markSaved();
                  }}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#80848e]">
              Notifications
            </h3>

            <div className="mt-2 divide-y divide-[#dce3ee]">
              <Toggle
                label="Order updates"
                description="Email me when a build ships or an order is delivered."
                checked={settings.orderUpdates}
                onChange={(next) => {
                  saveSettings({ orderUpdates: next });
                  markSaved();
                }}
              />
              <Toggle
                label="Drop notifications"
                description="Hear about restocks and limited-run machines."
                checked={settings.dropNotifications}
                onChange={(next) => {
                  saveSettings({ dropNotifications: next });
                  markSaved();
                }}
              />
              <Toggle
                label="Marketing emails"
                description="Occasional offers and new product announcements."
                checked={settings.marketingEmails}
                onChange={(next) => {
                  saveSettings({ marketingEmails: next });
                  markSaved();
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#80848e]">
              Preferences
            </h3>

            <div className="mt-4 space-y-4">
              <SelectField
                id="settings-language"
                label="Language"
                value={settings.language}
                options={languages}
                onChange={(next) => {
                  saveSettings({ language: next });
                  markSaved();
                }}
              />
              <SelectField
                id="settings-currency"
                label="Currency"
                value={settings.currency}
                options={currencies}
                onChange={(next) => {
                  saveSettings({ currency: next });
                  markSaved();
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[#d2dbe8] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-[#80848e]">
            Signed in as {user.email}. Preferences are stored on this device.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                resetSettings();
                markSaved();
              }}
              className="inline-flex h-11 touch-manipulation items-center justify-center rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
            >
              Reset preferences
            </button>
            <button
              type="button"
              onClick={() => {
                signOut();
                router.push("/login");
              }}
              className="inline-flex h-11 touch-manipulation items-center justify-center rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 px-5 text-sm font-semibold text-[#B91C1C] transition-colors hover:bg-[#DC2626]/10"
            >
              Sign out everywhere
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
