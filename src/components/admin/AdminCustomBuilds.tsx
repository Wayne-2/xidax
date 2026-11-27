"use client";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { fetchAdminCustomBuildRequests, updateAdminCustomBuildRequest, type AdminCustomBuildRequest } from "@/lib/admin-api";

const STATUSES = ["new","reviewing","quoted","awaiting_payment","paid","building","shipped","completed","cancelled"];

export default function AdminCustomBuilds() {
  const toast = useToast();
  const [requests, setRequests] = useState<AdminCustomBuildRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRequests((await fetchAdminCustomBuildRequests()).requests); }
    catch (e) { toast.error((e as { error?: string }).error || "Could not load custom build requests."); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t); }, [load]);

  async function save(id: string, patch: Partial<Pick<AdminCustomBuildRequest, "status" | "admin_notes" | "quote_amount" | "quote_currency">>) {
    setSavingId(id);
    try {
      const res = await updateAdminCustomBuildRequest(id, patch);
      setRequests((prev) => prev.map((r) => r.id === id ? res.request : r));
      toast.success("Request updated.");
    } catch (e) { toast.error((e as { error?: string }).error || "Could not update request."); }
    finally { setSavingId(null); }
  }

  return (
    <section className="rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="text-xl font-bold text-[#2e3338]">Custom build requests</h2><p className="mt-1 text-sm text-[#5c5e66]">Review requests, set quote/status, and track progress.</p></div>
        <button onClick={() => void load()} className="h-10 rounded-xl border border-[#d2dbe8] px-4 text-sm font-semibold text-[#5c5e66] hover:border-[#5865F2]/50">Refresh</button>
      </div>
      {loading ? <p className="mt-6 text-sm text-[#80848e]">Loading…</p> : requests.length === 0 ? <p className="mt-6 text-sm text-[#80848e]">No custom build requests yet.</p> : (
        <div className="mt-6 space-y-4">
          {requests.map((r) => (
            <article key={r.id} className="rounded-2xl border border-[#dce3ee] bg-[#f8fafe] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-semibold text-[#2e3338]">{r.name} <span className="text-[#80848e]">&lt;{r.email}&gt;</span></p><p className="text-xs text-[#80848e]">{new Date(r.created_at).toLocaleString()} {r.contact ? `· ${r.contact}` : ""} {r.budget ? `· Budget: ${r.budget}` : ""}</p></div>
                <select defaultValue={r.status} disabled={savingId===r.id} onChange={(e)=>void save(r.id,{status:e.target.value})} className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm">
                  {STATUSES.map((s)=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-xs text-[#5c5e66] border border-[#dce3ee]">{r.request_text}</pre>
              <div className="mt-3 grid gap-3 sm:grid-cols-[160px_120px_1fr_auto]">
                <input defaultValue={r.quote_amount ?? ""} placeholder="Quote amount" type="number" step="0.01" className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm" id={`qa-${r.id}`} />
                <input defaultValue={r.quote_currency ?? "USD"} placeholder="USD" className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm" id={`qc-${r.id}`} />
                <input defaultValue={r.admin_notes ?? ""} placeholder="Admin notes / compatibility / quote details" className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm" id={`qn-${r.id}`} />
                <button disabled={savingId===r.id} onClick={()=>{
                  const quoteAmount = (document.getElementById(`qa-${r.id}`) as HTMLInputElement).value;
                  const quoteCurrency = (document.getElementById(`qc-${r.id}`) as HTMLInputElement).value;
                  const adminNotes = (document.getElementById(`qn-${r.id}`) as HTMLInputElement).value;
                  void save(r.id,{ quote_amount: quoteAmount===""?null:Number(quoteAmount), quote_currency: quoteCurrency, admin_notes: adminNotes });
                }} className="h-10 rounded-xl bg-[#5865F2] px-4 text-sm font-semibold text-white disabled:opacity-60">Save</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
