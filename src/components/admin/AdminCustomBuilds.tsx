"use client";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { fetchAdminCustomBuildRequests, updateAdminCustomBuildRequest, type AdminCustomBuildRequest, type AdminCustomBuildQuoteItem } from "@/lib/admin-api";

const STATUSES = ["new","reviewing","quoted","awaiting_payment","paid","building","shipped","completed","cancelled"];

function emptyItem(): AdminCustomBuildQuoteItem { return { name: "", spec: "", price: undefined, note: "" }; }

export default function AdminCustomBuilds() {
  const toast = useToast();
  const [requests, setRequests] = useState<AdminCustomBuildRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<AdminCustomBuildRequest> & { send_email?: boolean }>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetchAdminCustomBuildRequests();
      setRequests(res.requests);
      setDrafts(Object.fromEntries(res.requests.map((r) => [r.id, { status: r.status, admin_notes: r.admin_notes ?? "", quote_amount: r.quote_amount, quote_currency: r.quote_currency ?? "USD", quote_message: r.quote_message ?? "", quote_items: r.quote_items?.length ? r.quote_items : [emptyItem()], send_email: true }])));
    } catch (e) { toast.error((e as { error?: string }).error || "Could not load custom build requests."); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t); }, [load]);

  function patchDraft(id: string, patch: Partial<AdminCustomBuildRequest> & { send_email?: boolean }) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  async function save(id: string) {
    const d = drafts[id] || {};
    setSavingId(id);
    try {
      const items = (d.quote_items ?? []).map((it) => ({ name: it.name?.trim() || "", spec: it.spec?.trim() || undefined, price: it.price == null || Number.isNaN(Number(it.price)) ? undefined : Number(it.price), note: it.note?.trim() || undefined })).filter((it) => it.name);
      const res = await updateAdminCustomBuildRequest(id, { status: d.status, admin_notes: d.admin_notes ?? "", quote_amount: d.quote_amount === null || d.quote_amount === undefined || d.quote_amount === ("" as unknown as number) ? null : Number(d.quote_amount), quote_currency: d.quote_currency || "USD", quote_message: d.quote_message ?? "", quote_items: items, send_email: d.send_email !== false });
      setRequests((prev) => prev.map((r) => r.id === id ? res.request : r));
      setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], status: res.request.status, admin_notes: res.request.admin_notes ?? "", quote_amount: res.request.quote_amount, quote_currency: res.request.quote_currency ?? "USD", quote_message: res.request.quote_message ?? "", quote_items: res.request.quote_items?.length ? res.request.quote_items : [emptyItem()] } }));
      toast.success(d.send_email === false ? "Request saved." : "Request saved and customer emailed.");
    } catch (e) { toast.error((e as { error?: string }).error || "Could not update request."); }
    finally { setSavingId(null); }
  }

  return (
    <section className="rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="text-xl font-bold text-[#2e3338]">Custom build requests</h2><p className="mt-1 text-sm text-[#5c5e66]">Requests go to support email. Send suggestions/quotes here; customer sees them on their custom builds page and by email.</p></div>
        <button onClick={() => void load()} className="h-10 rounded-xl border border-[#d2dbe8] px-4 text-sm font-semibold text-[#5c5e66] hover:border-[#5865F2]/50">Refresh</button>
      </div>
      {loading ? <p className="mt-6 text-sm text-[#80848e]">Loading…</p> : requests.length === 0 ? <p className="mt-6 text-sm text-[#80848e]">No custom build requests yet.</p> : (
        <div className="mt-6 space-y-5">
          {requests.map((r) => {
            const d = drafts[r.id] || {};
            const items = d.quote_items ?? [];
            return (
              <article key={r.id} className="rounded-2xl border border-[#dce3ee] bg-[#f8fafe] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-semibold text-[#2e3338]">{r.name} <span className="text-[#80848e]">&lt;{r.email}&gt;</span></p><p className="text-xs text-[#80848e]">{new Date(r.created_at).toLocaleString()} {r.contact ? `· ${r.contact}` : ""} {r.budget ? `· Budget: ${r.budget}` : ""}</p></div>
                  <select value={String(d.status ?? r.status)} disabled={savingId===r.id} onChange={(e)=>patchDraft(r.id,{status:e.target.value})} className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm">{STATUSES.map((s)=><option key={s} value={s}>{s}</option>)}</select>
                </div>
                <div className="mt-3 rounded-xl border border-[#dce3ee] bg-white p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Customer request</p><pre className="mt-2 whitespace-pre-wrap text-xs text-[#5c5e66]">{r.request_text}</pre></div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Quote amount</span><input value={d.quote_amount ?? ""} onChange={(e)=>patchDraft(r.id,{quote_amount: e.target.value === "" ? null : Number(e.target.value)})} type="number" step="0.01" className="h-10 w-full rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm" /></label>
                  <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Currency</span><input value={String(d.quote_currency ?? "USD")} onChange={(e)=>patchDraft(r.id,{quote_currency:e.target.value})} className="h-10 w-full rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm" /></label>
                </div>
                <label className="mt-3 block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Suggestion / quote message to customer</span><textarea value={String(d.quote_message ?? "")} onChange={(e)=>patchDraft(r.id,{quote_message:e.target.value})} rows={4} className="w-full rounded-xl border border-[#d2dbe8] bg-white px-3 py-2 text-sm" placeholder="Explain compatibility, suggested build, availability, lead time, deposit..." /></label>
                <label className="mt-3 block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Internal admin notes</span><input value={String(d.admin_notes ?? "")} onChange={(e)=>patchDraft(r.id,{admin_notes:e.target.value})} className="h-10 w-full rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm" placeholder="Internal notes (also visible to customer in current simple flow? no, internal only)" /></label>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Suggested build items</span><button type="button" onClick={()=>patchDraft(r.id,{quote_items:[...items, emptyItem()]})} className="text-xs font-semibold text-[#5865F2]">+ Add item</button></div>
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="grid gap-2 rounded-xl border border-[#dce3ee] bg-white p-3 sm:grid-cols-[1.2fr_1fr_120px_auto]">
                        <input value={it.name||""} onChange={(e)=>patchDraft(r.id,{quote_items: items.map((x,i)=>i===idx?{...x,name:e.target.value}:x)})} placeholder="Part name" className="h-10 rounded-lg border border-[#d2dbe8] px-3 text-sm" />
                        <input value={it.spec||""} onChange={(e)=>patchDraft(r.id,{quote_items: items.map((x,i)=>i===idx?{...x,spec:e.target.value}:x)})} placeholder="Spec / note" className="h-10 rounded-lg border border-[#d2dbe8] px-3 text-sm" />
                        <input value={it.price ?? ""} onChange={(e)=>patchDraft(r.id,{quote_items: items.map((x,i)=>i===idx?{...x,price:e.target.value===""?undefined:Number(e.target.value)}:x)})} type="number" step="0.01" placeholder="Price" className="h-10 rounded-lg border border-[#d2dbe8] px-3 text-sm" />
                        <button type="button" onClick={()=>patchDraft(r.id,{quote_items: items.filter((_,i)=>i!==idx)})} className="h-10 rounded-lg border border-[#d2dbe8] px-3 text-xs font-semibold text-[#B91C1C]">Remove</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-[#5c5e66]"><input type="checkbox" checked={d.send_email !== false} onChange={(e)=>patchDraft(r.id,{send_email:e.target.checked})} className="h-4 w-4" />Email customer + support copy</label>
                  <button disabled={savingId===r.id} onClick={()=>void save(r.id)} className="ml-auto h-10 rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white disabled:opacity-60">{savingId===r.id?"Saving...":"Save & send update"}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
