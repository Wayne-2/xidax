"use client";

import { useEffect, useState } from "react";
import { ClockIcon } from "@/components/SupportIcons";
import { useRegion } from "@/components/RegionProvider";
import { supportSchedule } from "@/data/support";

export default function SupportAvailability() {
  const { region, clock, isOpen } = useRegion();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const initial = setTimeout(tick, 0);
    const timer = setInterval(tick, 30000);

    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);

  const todayIndex = now
    ? supportSchedule.findIndex((day) => day.day === clock.weekday)
    : -1;
  const openNow = now ? isOpen(supportSchedule) : false;

  return (
    <aside className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-6 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d2dbe8] bg-[#5865F2]/10 text-[#5865F2]">
          <ClockIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold tracking-tight text-[#2e3338]">
            When we are active
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#5c5e66]">
            Shown in your local time — {region.timeZone}.
          </p>
        </div>
      </div>

      <div
        aria-live="polite"
        className="mt-4 flex items-center justify-between rounded-xl border border-[#d2dbe8] bg-[#f8fafe] shadow-card px-3.5 py-2.5"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#80848e]">
          Status
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          {now ? (
            <>
              <span
                className={`h-2 w-2 rounded-full ${
                  openNow ? "bg-[#16A34A]" : "bg-[#B45309]"
                }`}
              />
              <span className={openNow ? "text-[#15803D]" : "text-[#B45309]"}>
                {openNow ? "Active now" : "Not active now"}
              </span>
            </>
          ) : (
            <span className="text-[#80848e]">Checking…</span>
          )}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] shadow-card px-3.5 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#80848e]">
          Your time
        </span>
        <span className="font-mono text-sm font-semibold text-[#2e3338]">
          {clock.label}
        </span>
      </div>

      <ul className="mt-4 space-y-1.5">
        {supportSchedule.map((day, index) => {
          const isToday = index === todayIndex;
          const isClosed = day.open === null || day.close === null;

          return (
            <li
              key={day.day}
              className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ${
                isToday
                  ? "border border-[#5865F2]/40 bg-[#f8fafe]"
                  : "border border-transparent"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2e3338]">
                  {day.day}
                  {isToday && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#5865F2]">
                      Today
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#5c5e66]">{day.hours}</p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  isClosed
                    ? "bg-[#dce3ee] text-[#5c5e66]"
                    : "bg-[#5865F2]/10 text-[#4752C4]"
                }`}
              >
                {isClosed ? "Closed" : "Active"}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-[#d2dbe8] pt-4 text-xs leading-relaxed text-[#5c5e66]">
        Our team works these hours in West Africa Time (WAT). Messages that land
        outside them are queued and answered on the next active day.
      </p>
    </aside>
  );
}
