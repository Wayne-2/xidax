"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckIcon } from "@/components/BuildIcons";
import { useAccount } from "@/components/AccountProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchMyCustomBuildRequests, submitCustomBuildRequest, type CustomBuildRequest as MyRequest } from "@/lib/api";

const gridMask = "linear-gradient(to right, transparent 0%, black 55%, black 100%)";

export default function CustomBuildRequest() {
  const toast = useToast();
  const { token, user } = useAccount();
  const [form, setForm] = useState({ name: "", email: "", budget: "", parts: "", contact: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from account
  useEffect(() => { setForm((c) => ({ ...c, name: c.name || user?.name || "", email: c.email || user?.email || "" })); }, [user?.name, user?.email]);
  const loadMine = useCallback(async () => { if (!token) { setMyRequests([]); return; } try { setMyRequests((await fetchMyCustomBuildRequests(token)).requests); } catch {} }, [token]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void loadMine(); }, [loadMine]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const parts = form.parts.trim();
    const name = form.name.trim();
    const email = form.email.trim();
    const contact = form.contact.trim();
    if (!parts || parts.length < 10) { toast.error("Please describe your build or paste a parts list."); return; }
    if (!name) { toast.error("Please enter your name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !contact) { toast.error("Add an email or WhatsApp/contact number."); return; }

    setSubmitting(true);
    try {
      await submitCustomBuildRequest({
        name,
        email: email || user?.email || `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "customer"}@no-email.local`,
        contact: contact || undefined,
        budget: form.budget.trim() || undefined,
        requestText: parts,
      }, token);
      setSent(true);
      setForm((c) => ({ ...c, budget: "", parts: "", contact: "" }));
      toast.success("Request sent. We’ll get back with a quote.");
      void loadMine();
    } catch (err) {
      toast.error((err as { error?: string; message?: string }).error || (err as { message?: string }).message || "Could not send request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-[#dce3ee] bg-[#f0f4fa]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-80" style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: gridMask, WebkitMaskImage: gridMask }} />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-medium text-[#5c5e66]">
            <Link href="/" className="transition-colors hover:text-[#5865F2]">Home</Link>
            <span aria-hidden="true" className="text-[#80848e]">/</span>
            <span aria-current="page" className="text-[#2e3338]">Custom Builds</span>
          </nav>
          <div className="mt-10 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5865F2]">Made to order</p>
            <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-[#2e3338] sm:text-6xl">CUSTOM BUILD</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#5c5e66] sm:text-lg">Send your parts list or describe what you need. We’ll check compatibility, source parts, and send a quote.</p>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 lg:py-16">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#2e3338]">How it works</h2>
            <ol className="mt-6 space-y-4">
              {[
                ["Submit your request", "Paste a parts list or tell us your budget and what you play/create."],
                ["We review compatibility", "We check CPU/motherboard socket, RAM type, PSU wattage, case size, and suggest fixes if needed."],
                ["Get a quote", "We source parts, add build fee/margin, and send a quote. Quotes are valid for 48 hours."],
                ["Pay and we build", "Deposit or full payment before parts are purchased. Typical build time: 5–10 days, then tested and shipped."],
              ].map(([title, desc], i) => (
                <li key={title} className="flex gap-4 rounded-2xl border border-[#dce3ee] bg-[#f8fafe] p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5865F2] text-sm font-bold text-white">{i + 1}</span>
                  <div><p className="font-semibold text-[#2e3338]">{title}</p><p className="mt-1 text-sm text-[#5c5e66]">{desc}</p></div>
                </li>
              ))}
            </ol>
            <div className="mt-8 rounded-2xl border border-[#F1D48A] bg-[#FFF8E7] p-4 text-sm text-[#6B4E00]">
              <p className="font-semibold">Before you request</p>
              <ul className="mt-2 space-y-1">
                <li>• Prices/stock can change; quotes are valid for 48 hours.</li>
                <li>• If a part is unavailable, we’ll suggest an equivalent or contact you first.</li>
                <li>• Payment is required before buying parts (deposit or full).</li>
                <li>• Custom builds include testing; warranty/returns terms are confirmed in your quote.</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 shadow-card sm:p-7">
            <h3 className="text-lg font-bold text-[#2e3338]">Request a quote</h3>
            <p className="mt-1 text-xs text-[#5c5e66]">Support receives your request and admin can send suggestions/quote back here and to your email.</p>
            {sent ? (
              <div className="mt-6 rounded-2xl bg-white p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#15803D]/10 text-[#15803D]"><CheckIcon className="h-6 w-6" /></div>
                <p className="mt-4 font-semibold text-[#2e3338]">Request received</p>
                <p className="mt-2 text-sm text-[#5c5e66]">We’ll review your request and get back with a compatibility-checked quote.</p>
                <button type="button" onClick={() => setSent(false)} className="mt-4 text-sm font-semibold text-[#5865F2] hover:underline">Send another request</button>
              </div>
            ) : (
              <>
                <label className="mt-5 block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Parts list or build request</span>
                  <textarea value={form.parts} onChange={(e) => setForm({ ...form, parts: e.target.value })} rows={7} required maxLength={5000} placeholder="Paste your parts list here, or tell us your budget and the games/apps you use..." className="w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 py-3 text-sm outline-none focus:border-[#5865F2]" />
                </label>
                <label className="mt-4 block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Budget (optional)</span>
                  <input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} maxLength={120} placeholder="e.g. $2,000" className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 text-sm outline-none focus:border-[#5865F2]" />
                </label>
                <label className="mt-4 block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Name</span>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} placeholder="Your name" className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 text-sm outline-none focus:border-[#5865F2]" />
                </label>
                <label className="mt-4 block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Email</span>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={200} placeholder="you@example.com" className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 text-sm outline-none focus:border-[#5865F2]" />
                </label>
                <label className="mt-4 block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">WhatsApp / contact number (optional)</span>
                  <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} maxLength={80} placeholder="+1 555 000 0000" className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 text-sm outline-none focus:border-[#5865F2]" />
                </label>
                <button type="submit" disabled={submitting} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:opacity-60">
                  {submitting ? "Sending..." : "Request quote"}
                </button>
                <p className="mt-3 text-center text-xs text-[#80848e]">By submitting, you agree we can contact you about this quote.</p>
              </>
            )}
          </form>
        </div>
      </section>

      <section className="border-t border-[#dce3ee] bg-[#f0f4fa]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5865F2]">Your requests</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#2e3338]">Quotes & suggestions</h2></div>
            {token && <button onClick={() => void loadMine()} className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-4 text-sm font-semibold text-[#5c5e66]">Refresh</button>}
          </div>
          {!token ? (
            <div className="mt-6 rounded-2xl border border-[#dce3ee] bg-white p-6 text-sm text-[#5c5e66]">Sign in to see your custom build requests, admin suggestions, and quotes here. <Link href="/login?next=%2Fcustom-builds" className="font-semibold text-[#5865F2] hover:underline">Sign in</Link></div>
          ) : myRequests.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#c7d2e0] bg-white p-6 text-sm text-[#80848e]">No requests yet. Submit one above and it will appear here.</div>
          ) : (
            <div className="mt-6 grid gap-4">
              {myRequests.map((r) => (
                <article key={r.id} className="rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-semibold text-[#2e3338]">Request #{r.id.slice(0,8)}</p><p className="text-xs text-[#80848e]">{new Date(r.created_at).toLocaleString()} {r.budget ? `· Budget ${r.budget}` : ""}</p></div>
                    <span className="rounded-full bg-[#5865F2]/10 px-3 py-1 text-xs font-semibold text-[#5865F2]">{r.status}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-[#5c5e66]">{r.request_text}</p>
                  {(r.quote_message || r.quote_amount != null || (r.quote_items?.length ?? 0) > 0) && (
                    <div className="mt-4 rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-4">
                      <p className="text-sm font-bold text-[#2e3338]">Admin suggestion / quote</p>
                      {r.quote_amount != null && <p className="mt-1 text-sm text-[#2e3338]">Quote: <span className="font-semibold">${Number(r.quote_amount).toFixed(2)} {r.quote_currency || "USD"}</span></p>}
                      {r.quote_message && <p className="mt-2 whitespace-pre-wrap text-sm text-[#5c5e66]">{r.quote_message}</p>}
                      {(r.quote_items?.length ?? 0) > 0 && (
                        <div className="mt-3 space-y-2">
                          {r.quote_items.map((it, i) => (
                            <div key={i} className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 border border-[#e4e9f0]">
                              <div><p className="text-sm font-semibold text-[#2e3338]">{it.name}</p>{it.spec && <p className="text-xs text-[#5c5e66]">{it.spec}</p>}{it.note && <p className="text-xs text-[#80848e]">{it.note}</p>}</div>
                              {it.price != null && <p className="text-sm font-semibold text-[#2e3338]">${Number(it.price).toFixed(2)}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
