"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckIcon } from "@/components/BuildIcons";
import { useAccount } from "@/components/AccountProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchMyCustomBuildRequests, submitCustomBuildRequest, type CustomBuildRequest as MyRequest } from "@/lib/api";

type Mode = "scratch" | "parts";
type Step = 1 | 2 | 3 | 4;
const gridMask = "linear-gradient(to right, transparent 0%, black 55%, black 100%)";
const blank = { mode: "scratch" as Mode, name: "", email: "", contact: "", budget: "", useCase: "", games: "", performance: "", style: "", notes: "", cpu:"", gpu:"", ram:"", storage:"", motherboard:"", psu:"", case:"", cooling:"", extras:"" };

export default function CustomBuildRequest() {
  const toast = useToast();
  const { token, user } = useAccount();
  const [mode, setMode] = useState<Mode>("scratch");
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sent, setSent] = useState(false);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from signed-in account
    setForm((c) => ({ ...c, name: c.name || user.name || "", email: c.email || user.email || "" }));
  }, [user?.name, user?.email]);
  const loadMine = useCallback(async () => { if (!token) { setMyRequests([]); return; } try { setMyRequests((await fetchMyCustomBuildRequests(token)).requests); } catch {} }, [token]);
  useEffect(() => {
    if (!token) { setMyRequests([]); return; } // eslint-disable-line react-hooks/set-state-in-effect
    void loadMine();
  }, [token, loadMine]);

  const requestText = useMemo(() => {
    if (form.mode === "scratch") {
      return [`Build type: Build PC from scratch`, `Use case: ${form.useCase}`, `Games/apps: ${form.games}`, `Performance target: ${form.performance}`, `Style/preferences: ${form.style}`, `Notes: ${form.notes}`].filter(Boolean).join("\n");
    }
    return [`Build type: Build PC with parts`, `CPU: ${form.cpu}`, `GPU: ${form.gpu}`, `RAM: ${form.ram}`, `Storage: ${form.storage}`, `Motherboard: ${form.motherboard}`, `PSU: ${form.psu}`, `Case: ${form.case}`, `Cooling: ${form.cooling}`, `Extras: ${form.extras}`, `Notes: ${form.notes}`].filter(Boolean).join("\n");
  }, [form]);

  function validateStep(s: Step) {
    if (s === 1) return true;
    if (s === 2) {
      if (form.mode === "scratch") return form.useCase.trim().length >= 3;
      return [form.cpu, form.gpu, form.ram, form.storage, form.motherboard, form.psu, form.case].some((v) => v.trim().length > 0);
    }
    if (s === 3) return form.name.trim().length > 1 && (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || form.contact.trim().length > 3);
    return requestText.trim().length >= 10;
  }

  async function submit() {
    if (submitting) return;
    if (!validateStep(4)) { toast.error("Please complete the required fields."); return; }
    setSubmitting(true); setProcessing(true);
    try {
      await Promise.all([
        submitCustomBuildRequest({ name: form.name.trim(), email: form.email.trim() || `${form.name.toLowerCase().replace(/[^a-z0-9]+/g,".") || "customer"}@no-email.local`, contact: form.contact.trim() || undefined, budget: form.budget.trim() || undefined, requestText }, token),
        new Promise((r) => setTimeout(r, 3500)),
      ]);
      setSent(true); setStep(4);
      setForm((c) => ({ ...blank, name: c.name, email: c.email, contact: c.contact, mode: c.mode }));
      toast.success("Request submitted. Waiting for admin confirmation.");
      void loadMine();
    } catch (err) {
      toast.error((err as { error?: string; message?: string }).error || (err as { message?: string }).message || "Could not submit request.");
    } finally { setSubmitting(false); setProcessing(false); }
  }



  return (
    <>
      <section className="relative overflow-hidden border-b border-[#dce3ee] bg-[#f0f4fa]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-80" style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: gridMask, WebkitMaskImage: gridMask }} />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-medium text-[#5c5e66]"><Link href="/" className="hover:text-[#5865F2]">Home</Link><span className="text-[#80848e]">/</span><span className="text-[#2e3338]">Custom Builds</span></nav>
          <div className="mt-10 max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5865F2]">Made to order</p><h1 className="mt-4 text-5xl font-extrabold tracking-tight text-[#2e3338] sm:text-6xl">CUSTOM BUILD</h1><p className="mt-5 text-base leading-relaxed text-[#5c5e66] sm:text-lg">Choose how you want to build, fill the details, submit, and we’ll process it for admin confirmation.</p></div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["scratch","parts"] as Mode[]).map((m) => (
                <button key={m} type="button" onClick={()=>{setMode(m); setForm((c)=>({...c, mode:m})); setStep(2);}} className={`rounded-2xl border p-5 text-left shadow-card transition ${mode===m?"border-[#5865F2] bg-[#EEF0FF]":"border-[#dce3ee] bg-[#f8fafe] hover:border-[#5865F2]/40"}`}>
                  <p className="text-lg font-bold text-[#2e3338]">{m==="scratch"?"Build PC from scratch":"Build PC with parts"}</p>
                  <p className="mt-2 text-sm text-[#5c5e66]">{m==="scratch"?"Tell us your budget, games/apps, and goals. We’ll design the build.":"Paste/select the components you want. We’ll verify compatibility and quote it."}</p>
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-[#dce3ee] bg-[#f8fafe] p-5 sm:p-6">
              <div className="flex flex-wrap gap-2">{([[1,"Build type"],[2,"Build details"],[3,"Contact"],[4,"Review & submit"]] as [Step,string][]).map(([n,label]) => (<button key={n} type="button" onClick={() => setStep(n)} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${step===n?"bg-[#5865F2] text-white":"bg-white text-[#5c5e66] border border-[#dce3ee]"}`}><span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${step===n?"bg-white/20":"bg-[#f0f4fa]"}`}>{n}</span>{label}</button>))}</div>

              {step===1 && <div className="mt-6 text-sm text-[#5c5e66]">Select a build option above to continue.</div>}

              {step===2 && mode==="scratch" && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2 block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]">What will you use it for? *</span><input value={form.useCase} onChange={(e)=>setForm({...form,useCase:e.target.value})} className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm" placeholder="Gaming, streaming, video editing, work..." /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]">Games / apps</span><input value={form.games} onChange={(e)=>setForm({...form,games:e.target.value})} className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm" placeholder="Fortnite, Warzone, Blender..." /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]">Performance target</span><input value={form.performance} onChange={(e)=>setForm({...form,performance:e.target.value})} className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm" placeholder="1080p high, 1440p, 4K..." /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]">Style / size</span><input value={form.style} onChange={(e)=>setForm({...form,style:e.target.value})} className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm" placeholder="White, RGB, mini-ITX..." /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]">Budget</span><input value={form.budget} onChange={(e)=>setForm({...form,budget:e.target.value})} className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm" placeholder="$2,000" /></label>
                  <label className="sm:col-span-2 block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]">Notes</span><textarea value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} rows={4} className="w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 py-3 text-sm" placeholder="Anything else we should know?" /></label>
                </div>
              )}

              {step===2 && mode==="parts" && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    ["cpu","CPU *"],["gpu","GPU *"],["ram","RAM *"],["storage","Storage *"],["motherboard","Motherboard *"],["psu","Power supply *"],["case","Case *"],["cooling","Cooling"],["extras","Extras / peripherals"]
                  ].map(([k,label])=>(
                    <label key={k} className={k==="extras"?"sm:col-span-2 block":"block"}><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]">{label}</span><input value={String((form as unknown as Record<string,string>)[k] ?? "")} onChange={(e)=>setForm({...form,[k]:e.target.value} as typeof form)} className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm" placeholder={`Enter ${label.replace(" *","").toLowerCase()}`} /></label>
                  ))}
                  <label className="sm:col-span-2 block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]">Notes / compatibility concerns</span><textarea value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} rows={4} className="w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 py-3 text-sm" placeholder="Paste links, part numbers, or special requests..." /></label>
                </div>
              )}

              {step===3 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]">Name *</span><input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm" placeholder="John Doe" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]">Email *</span><input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm" placeholder="you@example.com" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]">Contact number (optional)</span><input value={form.contact} onChange={(e)=>setForm({...form,contact:e.target.value})} className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm" placeholder="+1 555 000 0000" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]">Budget (optional)</span><input value={form.budget} onChange={(e)=>setForm({...form,budget:e.target.value})} className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm" placeholder="$2,000" /></label>
                </div>
              )}

              {step===4 && (
                <div className="mt-6">
                  <div className="rounded-xl border border-[#dce3ee] bg-white p-4"><p className="text-sm font-semibold text-[#2e3338]">Review your request</p><pre className="mt-3 whitespace-pre-wrap text-sm text-[#5c5e66]">{requestText || "Complete the previous steps."}</pre></div>
                  {processing && <div className="mt-4 rounded-xl border border-[#5865F2]/20 bg-[#EEF0FF] p-4 text-sm text-[#2e3338]"><div className="flex items-center gap-3"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#5865F2]/30 border-t-[#5865F2]" /> Processing request for admin confirmation...</div></div>}
                  {sent && !processing && <div className="mt-4 rounded-xl border border-[#16A34A]/20 bg-[#16A34A]/10 p-4 text-sm text-[#166534]"><div className="flex items-center gap-2"><CheckIcon className="h-4 w-4" /> Submitted. Support and admin have your request; you’ll get confirmation/quote by email and in this page.</div></div>}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <button type="button" onClick={()=>setStep((s)=> (Math.max(1, s-1) as Step))} disabled={step===1 || submitting} className="h-11 rounded-xl border border-[#d2dbe8] bg-white px-5 text-sm font-semibold text-[#5c5e66] disabled:opacity-50">Back</button>
                {step < 4 ? (
                  <button type="button" onClick={()=>{ if(!validateStep(step)){ toast.error("Complete the required fields for this step."); return; } setStep((s)=> (Math.min(4, s+1) as Step)); }} className="h-11 rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white hover:bg-[#4752C4]">Continue</button>
                ) : (
                  <button type="button" disabled={submitting} onClick={()=>void submit()} className="h-11 rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:opacity-60">{submitting?"Submitting...":"Submit request"}</button>
                )}
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 shadow-card sm:p-7 h-fit">
            <h3 className="text-lg font-bold text-[#2e3338]">What happens next</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#5c5e66]">
              <li>• Your request is sent to support and admin dashboard.</li>
              <li>• We check compatibility, stock, and pricing.</li>
              <li>• Admin sends suggestions/quote to your email and this page.</li>
              <li>• Quotes are valid 48 hours; payment before parts sourcing.</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="border-t border-[#dce3ee] bg-[#f0f4fa]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5865F2]">Your requests</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#2e3338]">Quotes & suggestions</h2></div>{token && <button onClick={()=>void loadMine()} className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-4 text-sm font-semibold text-[#5c5e66]">Refresh</button>}</div>
          {!token ? <div className="mt-6 rounded-2xl border border-[#dce3ee] bg-white p-6 text-sm text-[#5c5e66]">Sign in to see your requests and admin quotes. <Link href="/login?next=%2Fcustom-builds" className="font-semibold text-[#5865F2] hover:underline">Sign in</Link></div>
          : myRequests.length===0 ? <div className="mt-6 rounded-2xl border border-dashed border-[#c7d2e0] bg-white p-6 text-sm text-[#80848e]">No requests yet.</div>
          : <div className="mt-6 grid gap-4">{myRequests.map((r)=>(<article key={r.id} className="rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#2e3338]">Request #{r.id.slice(0,8)}</p><p className="text-xs text-[#80848e]">{new Date(r.created_at).toLocaleString()} {r.budget ? `· Budget ${r.budget}`:""}</p></div><span className="rounded-full bg-[#5865F2]/10 px-3 py-1 text-xs font-semibold text-[#5865F2]">{r.status}</span></div><pre className="mt-3 whitespace-pre-wrap text-sm text-[#5c5e66]">{r.request_text}</pre>{(r.quote_message || r.quote_amount!=null || (r.quote_items?.length??0)>0) && <div className="mt-4 rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-4"><p className="text-sm font-bold text-[#2e3338]">Admin suggestion / quote</p>{r.quote_amount!=null && <p className="mt-1 text-sm text-[#2e3338]">Quote: <span className="font-semibold">${Number(r.quote_amount).toFixed(2)} {r.quote_currency||"USD"}</span></p>}{r.quote_message && <p className="mt-2 whitespace-pre-wrap text-sm text-[#5c5e66]">{r.quote_message}</p>}</div>}</article>))}</div>}
        </div>
      </section>
    </>
  );
}
