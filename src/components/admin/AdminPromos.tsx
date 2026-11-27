"use client";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { fetchAdminPromos, fetchAdminUsers, assignUserPromo, deleteUserPromo, setUserPromoActive, generateUserPromoCode, type AdminPromoOverview } from "@/lib/admin-api";

export default function AdminPromos() {
  const toast = useToast();
  const [data, setData] = useState<AdminPromoOverview | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ uid: "", code: "", discount: 10 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [promoRes, usersRes] = await Promise.all([fetchAdminPromos(), fetchAdminUsers({ limit: 100 })]);
      setData(promoRes);
      setUsers(usersRes.users.map((u) => ({ id: u.id, email: u.email, name: u.name })));
    } catch (e) { toast.error((e as { error?: string }).error || "Could not load promos."); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { const t=window.setTimeout(()=>void load(),0); return ()=>window.clearTimeout(t); }, [load]);

  async function generate() {
    try { const r = await generateUserPromoCode(); setForm((f) => ({ ...f, code: r.code })); } catch { toast.error("Could not generate code."); }
  }
  async function save() {
    if (!form.uid || !form.code.trim()) { toast.error("Select user and code."); return; }
    setSaving(true);
    try { await assignUserPromo(form.uid, form.code, form.discount); toast.success("Promo assigned."); setForm({ uid: "", code: "", discount: 10 }); await load(); }
    catch (e) { toast.error((e as { error?: string }).error || "Could not assign promo."); }
    finally { setSaving(false); }
  }

  return (
    <section className="rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card sm:p-7">
      <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-[#2e3338]">Promo codes</h2><p className="mt-1 text-sm text-[#5c5e66]">Generate/assign user promo codes and track product discounts.</p></div><button onClick={()=>void load()} className="h-10 rounded-xl border border-[#d2dbe8] px-4 text-sm font-semibold text-[#5c5e66]">Refresh</button></div>
      <div className="mt-6 rounded-2xl border border-[#dce3ee] bg-[#f8fafe] p-4">
        <h3 className="text-sm font-bold text-[#2e3338]">Assign promo to user</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_1fr_120px_auto_auto]">
          <select value={form.uid} onChange={(e)=>setForm({...form, uid:e.target.value})} className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm"><option value="">Select user</option>{users.map((u)=><option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>)}</select>
          <input value={form.code} onChange={(e)=>setForm({...form, code:e.target.value.toUpperCase()})} placeholder="PCM-XXXXXX" className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm font-mono" />
          <input type="number" min={1} max={100} value={form.discount} onChange={(e)=>setForm({...form, discount:Number(e.target.value)})} className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm" />
          <button onClick={()=>void generate()} className="h-10 rounded-xl border border-[#5865F2]/40 px-4 text-sm font-semibold text-[#4752C4]">Generate</button>
          <button disabled={saving} onClick={()=>void save()} className="h-10 rounded-xl bg-[#5865F2] px-4 text-sm font-semibold text-white disabled:opacity-60">{saving?"Saving...":"Assign"}</button>
        </div>
      </div>

      {loading ? <p className="mt-6 text-sm text-[#80848e]">Loading…</p> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-[#2e3338]">User promo codes</h3>
            <div className="mt-3 space-y-2">
              {(data?.userPromos ?? []).map((p) => (
                <div key={p.uid} className="rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><div><p className="font-semibold text-[#2e3338]">{p.code} <span className="text-[#5865F2]">{p.discount}% off</span></p><p className="text-xs text-[#80848e]">{p.name || p.email} · {p.email}</p></div><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.active?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{p.active?"Active":"Disabled"}</span></div>
                  <div className="mt-2 flex gap-2"><button onClick={async()=>{try{await setUserPromoActive(p.uid,!p.active); await load();}catch{toast.error("Update failed");}}} className="rounded-lg border border-[#d2dbe8] px-2.5 py-1 text-xs font-semibold text-[#5c5e66]">{p.active?"Disable":"Enable"}</button><button onClick={async()=>{if(!confirm(`Remove ${p.code}?`))return; try{await deleteUserPromo(p.uid); await load();}catch{toast.error("Remove failed");}}} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600">Remove</button></div>
                </div>
              ))}
              {(data?.userPromos ?? []).length === 0 && <p className="text-sm text-[#80848e]">No user promos assigned.</p>}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2e3338]">Product discounts</h3>
            <div className="mt-3 space-y-2">
              {(data?.productPromos ?? []).map((p) => (
                <div key={`${p.kind}-${p.productId}`} className="rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><div><p className="font-semibold text-[#2e3338]">{p.name}</p><p className="text-xs text-[#80848e]">{p.kind} · {p.code || "No code"} · {p.discount}%</p></div><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.active?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{p.active?"Active":"Inactive"}</span></div>
                </div>
              ))}
              {(data?.productPromos ?? []).length === 0 && <p className="text-sm text-[#80848e]">No product promo discounts configured.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
