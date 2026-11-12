"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowIcon, CheckIcon } from "@/components/BuildIcons";
import { useAccount } from "@/components/AccountProvider";
import {
  accountOrders,
  savedItems,
  type AccountOrderStatus,
} from "@/data/account";

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

function Toggle({
  label,
  description,
  defaultOn,
}: {
  label: string;
  description: string;
  defaultOn: boolean;
}) {
  const [on, setOn] = useState(defaultOn);

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
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((value) => !value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          on ? "bg-[#5865F2]" : "bg-[#c8d1de]"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            on ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function ProfileView() {
  const router = useRouter();
  const { user, ready, signOut } = useAccount();

  useEffect(() => {
    if (ready && !user) {
      router.replace("/login");
    }
  }, [ready, user, router]);

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

        <button
          type="button"
          onClick={() => {
            signOut();
            router.push("/login");
          }}
          className="inline-flex h-11 touch-manipulation items-center justify-center gap-2 self-start rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-semibold text-[#4e5058] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338] sm:self-auto"
        >
          Sign out
        </button>
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
                <dt className="text-[#5c5e66]">Account ID</dt>
                <dd className="min-w-0 truncate font-semibold text-[#2e3338]">
                  {user.id}
                </dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-[#d2dbe8] pt-1">
              <Toggle
                label="Order updates"
                description="Get an email when a build ships or an order is delivered."
                defaultOn
              />
              <Toggle
                label="Drop notifications"
                description="Hear about restocks and limited-run machines."
                defaultOn={false}
              />
              <Toggle
                label="Lifetime labour coverage"
                description="Keep labour coverage active on every Pcmart machine."
                defaultOn
              />
            </div>
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
                <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-[#5c5e66]">
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
    </div>
  );
}
