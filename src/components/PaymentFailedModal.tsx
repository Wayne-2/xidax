"use client";

import { useEffect, useRef } from "react";

export default function PaymentFailedModal({
  amount,
  onClose,
  onUpdateCard,
  onPayWithCrypto,
  onPayWithWire,
}: {
  amount: string;
  onClose: () => void;
  onUpdateCard: () => void;
  onPayWithCrypto: () => void;
  onPayWithWire: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) { if (e.key === "Escape") closeRef.current(); }
    window.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = overflow; prev?.focus(); };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="card-declined-title" tabIndex={-1} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="m15 14 4 4m0-4-4 4"/></svg>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[#737D94] hover:bg-[#F0F2F8] hover:text-[#20212B]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>

        <h2 id="card-declined-title" className="mt-5 text-3xl font-semibold tracking-tight text-[#20212B]">Your card was declined</h2>
        <p className="mt-3 text-sm leading-6 text-[#737D94]">
          Your bank didn’t approve this payment of {amount}, so you haven’t been charged. Check your card details and try again, use a different card, or pay another way.
        </p>

        <button type="button" onClick={onUpdateCard} className="mt-6 h-12 w-full rounded-xl bg-[#5965F5] text-sm font-semibold text-white hover:bg-[#4d58e0]">Update card details</button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#DCE1ED]" />
          <span className="text-xs text-[#737D94]">or pay another way</span>
          <div className="h-px flex-1 bg-[#DCE1ED]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="absolute -top-2 left-3 rounded-full bg-[#EEF0FF] px-2 py-0.5 text-[10px] font-semibold text-[#5965F5]">Faster</span>
            <button type="button" onClick={onPayWithCrypto} className="h-12 w-full rounded-xl border border-[#DCE1ED] bg-white text-sm font-semibold text-[#20212B] hover:border-[#5965F5]">Pay with crypto</button>
          </div>
          <button type="button" onClick={onPayWithWire} className="h-12 w-full rounded-xl border border-[#DCE1ED] bg-white text-sm font-semibold text-[#20212B] hover:border-[#5965F5]">Pay by wire transfer</button>
        </div>
      </div>
    </div>
  );
}
