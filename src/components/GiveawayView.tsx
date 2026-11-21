"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountProvider";
import { ArrowIcon, CheckIcon } from "@/components/BuildIcons";
import { useToast } from "@/components/ToastProvider";
import {
  fetchGiveawayStatus,
  redeemGiveaway,
  type GiveawayStatus,
} from "@/lib/api";

function useCountdown(closesAt: string | null) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!closesAt) return;

    const update = () => {
      setRemaining(Math.max(0, new Date(closesAt).getTime() - Date.now()));
    };

    update();
    const timer = window.setInterval(update, 1000);

    return () => window.clearInterval(timer);
  }, [closesAt]);

  const totalSeconds = Math.floor(remaining / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    ended: remaining <= 0,
  };
}

export default function GiveawayView() {
  const { token } = useAccount();
  const toast = useToast();
  const [status, setStatus] = useState<GiveawayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const countdown = useCountdown(status?.closesAt ?? null);

  const load = useCallback(async () => {
    try {
      const result = await fetchGiveawayStatus(token);
      setStatus(result);
    } catch {
      // Leave status null; the page still renders with a neutral message.
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function handleRedeem(event: React.FormEvent) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {
      const result = await redeemGiveaway({ name, email }, token);
      setStatus(result.status);
      toast.success("You're entered! Good luck.");
      setName("");
      setEmail("");
    } catch (error) {
      const payload = error as { error?: string; status?: GiveawayStatus };

      if (payload.status) setStatus(payload.status);

      toast.error(payload.error ?? "Could not enter the giveaway.");
    } finally {
      setSubmitting(false);
    }
  }

  const gridMask =
    "linear-gradient(to right, transparent 0%, black 55%, black 100%)";

  return (
    <main className="relative flex-1 overflow-hidden">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#dce3ee] bg-[#f0f4fa]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: gridMask,
            WebkitMaskImage: gridMask,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#5865F2]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 bg-[radial-gradient(circle_at_bottom_right,rgba(88,101,242,0.18),transparent_70%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-sm font-medium text-[#5c5e66]"
          >
            <Link href="/" className="transition-colors hover:text-[#5865F2]">
              Home
            </Link>
            <span aria-hidden="true" className="text-[#80848e]">/</span>
            <span aria-current="page" className="text-[#2e3338]">
              Giveaway
            </span>
          </nav>

          <div className="mt-10 max-w-2xl sm:mt-14">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-gradient-to-r from-[#5865F2] to-transparent" />
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5865F2]">
                Free giveaway
              </p>
            </div>

            <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-balance text-[#2e3338] sm:text-6xl lg:text-7xl">
              WIN A FREE PC
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#5c5e66] sm:text-lg">
              One lucky winner takes home a custom-built gaming PC — built,
              tested and shipped on us. Enter below for your chance. No
              purchase required, one entry per person.
            </p>
          </div>

          {/* Countdown */}
          <div className="mt-10 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#80848e]">
              Entries closing
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: "Days", value: countdown.days },
                { label: "Hours", value: countdown.hours },
                { label: "Mins", value: countdown.minutes },
                { label: "Secs", value: countdown.seconds },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="rounded-2xl border border-[#dce3ee] bg-white px-2 py-4 text-center shadow-card sm:py-5"
                >
                  <p className="text-2xl font-extrabold tabular-nums text-[#2e3338] sm:text-4xl">
                    {String(unit.value).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                    {unit.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[#80848e]">
              {loading
                ? "Loading…"
                : countdown.ended || status?.closed
                  ? "Entries have closed."
                  : `${status?.totalEntries ?? 0} entries so far`}
            </p>
          </div>
        </div>
      </section>

      {/* Enter form */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#2e3338] sm:text-3xl">
                Redeem your entry
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#5c5e66]">
                Enter your details and we&apos;ll count you in. The winner is
                contacted by email once entries close.
              </p>

              <ul className="mt-6 space-y-3">
                {[
                  "No purchase necessary",
                  "One entry per person",
                  "Winner contacted by email",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[#5c5e66]">
                    <CheckIcon className="h-4 w-4 text-[#16A34A]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <form
              onSubmit={handleRedeem}
              noValidate
              className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 shadow-card sm:p-7"
            >
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                  Full name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Wayne Adebayo"
                  className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 text-sm outline-none focus:border-[#5865F2]"
                  required
                />
              </label>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                  Email address
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 text-sm outline-none focus:border-[#5865F2]"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={
                  submitting ||
                  Boolean(status?.entered) ||
                  countdown.ended ||
                  Boolean(status?.closed)
                }
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Entering…"
                  : status?.entered
                    ? "Already entered"
                    : countdown.ended || status?.closed
                      ? "Entries closed"
                      : "Redeem giveaway"}
                {!submitting && !status?.entered && <ArrowIcon className="h-4 w-4" />}
              </button>

              {status?.entered && (
                <p className="mt-3 text-center text-sm font-semibold text-[#15803D]">
                  You&apos;re in. Good luck!
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* PC gallery */}
      <section className="border-t border-[#dce3ee] bg-[#f0f4fa]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5865F2]">
              The prize
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#2e3338] sm:text-3xl">
              A machine worth winning
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#5c5e66]">
              A custom-built gaming PC with premium cooling, RGB lighting and
              components built to last.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              "/hero_image.png",
              "/display_section.png",
              "/display_section2.png",
            ].map((src, index) => (
              <div
                key={src}
                className="relative aspect-square overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-card"
              >
                <Image
                  src={src}
                  alt={`Giveaway gaming PC ${index + 1}`}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
