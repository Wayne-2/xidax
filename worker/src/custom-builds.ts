import type { Env } from "./types";
import { resolveSupportEmail } from "./email";

export type CustomBuildQuoteItem = { name: string; spec?: string; price?: number; note?: string };
export type CustomBuildRequestRow = {
  id: string; user_id: string | null; name: string; email: string; contact: string | null; budget: string | null;
  request_text: string; status: string; admin_notes: string | null; quote_amount: number | null;
  quote_currency: string | null; quote_message: string | null; quote_items: CustomBuildQuoteItem[];
  created_at: string; updated_at: string;
};

const STATUSES = new Set(["new","reviewing","quoted","awaiting_payment","paid","building","shipped","completed","cancelled"]);

function mapRow(r: Record<string, unknown>): CustomBuildRequestRow {
  let quoteItems: CustomBuildQuoteItem[] = [];
  if (typeof r.quote_items === "string" && r.quote_items) {
    try { const parsed = JSON.parse(r.quote_items); if (Array.isArray(parsed)) quoteItems = parsed.filter((x)=>x&&typeof x==="object").map((x:Record<string,unknown>)=>({name:String(x.name??"").slice(0,160), spec:x.spec?String(x.spec).slice(0,240):undefined, price: x.price==null||x.price===""?undefined:Number(x.price), note:x.note?String(x.note).slice(0,240):undefined})).filter((x)=>x.name); } catch {}
  }
  return {
    id: String(r.id ?? ""),
    user_id: r.user_id == null ? null : String(r.user_id),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    contact: r.contact == null ? null : String(r.contact),
    budget: r.budget == null ? null : String(r.budget),
    request_text: String(r.request_text ?? ""),
    status: String(r.status ?? "new"),
    admin_notes: r.admin_notes == null ? null : String(r.admin_notes),
    quote_amount: r.quote_amount == null ? null : Number(r.quote_amount),
    quote_currency: r.quote_currency == null ? "USD" : String(r.quote_currency),
    quote_message: r.quote_message == null ? null : String(r.quote_message),
    quote_items: quoteItems,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export async function createCustomBuildRequest(env: Env, input: { userId?: string | null; name: string; email: string; contact?: string; budget?: string; requestText: string; }) {
  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().toLowerCase().slice(0, 200);
  const contact = input.contact?.trim().slice(0, 120) || null;
  const budget = input.budget?.trim().slice(0, 120) || null;
  const requestText = input.requestText.trim().slice(0, 5000);
  if (!name) return { ok: false as const, error: "Name is required.", status: 400 };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, error: "Valid email is required.", status: 400 };
  if (requestText.length < 10) return { ok: false as const, error: "Please provide build details (at least 10 characters).", status: 400 };
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO custom_build_requests (id,user_id,name,email,contact,budget,request_text,status,admin_notes,quote_amount,quote_currency,quote_message,quote_items,created_at,updated_at)
     VALUES (?1,?2,?3,?4,?5,?6,?7,'new',NULL,NULL,'USD',NULL,NULL,?8,?8)`
  ).bind(id, input.userId ?? null, name, email, contact, budget, requestText, now).run();
  return { ok: true as const, id };
}

export async function listCustomBuildRequests(env: Env) {
  const { results } = await env.DB.prepare(`SELECT * FROM custom_build_requests ORDER BY created_at DESC LIMIT 200`).all();
  return { requests: (results ?? []).map((r) => mapRow(r as Record<string, unknown>)) };
}

export async function listMyCustomBuildRequests(env: Env, userId: string, email: string) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM custom_build_requests WHERE user_id=?1 OR LOWER(email)=?2 ORDER BY created_at DESC LIMIT 100`
  ).bind(userId, email.toLowerCase()).all();
  return { requests: (results ?? []).map((r) => mapRow(r as Record<string, unknown>)) };
}

async function sendQuoteEmail(env: Env, req: CustomBuildRequestRow) {
  if (!env.RESEND_API_KEY) return;
  const support = await resolveSupportEmail(env).catch(()=>"supportsgenericpcs@gmail.com");
  const itemsHtml = req.quote_items.length ? `<h3 style="margin:20px 0 8px;color:#12151c">Suggested build / parts</h3><table style="width:100%;border-collapse:collapse">${req.quote_items.map((it)=>`<tr><td style="padding:8px 0;border-bottom:1px solid #e4e9f0"><div style="font-weight:600;color:#12151c">${escapeHtml(it.name)}</div>${it.spec?`<div style="color:#5c5e66;font-size:13px">${escapeHtml(it.spec)}</div>`:""}${it.note?`<div style="color:#5c5e66;font-size:13px">${escapeHtml(it.note)}</div>`:""}</td><td style="padding:8px 0;border-bottom:1px solid #e4e9f0;text-align:right;color:#12151c">${it.price!=null?`$${Number(it.price).toFixed(2)}`:""}</td></tr>`).join("")}</table>` : "";
  const quoteHtml = req.quote_amount!=null ? `<p style="margin:16px 0;color:#12151c"><strong>Quote:</strong> $${Number(req.quote_amount).toFixed(2)} ${escapeHtml(req.quote_currency||"USD")}</p>` : "";
  const msg = req.quote_message ? `<div style="margin:16px 0;padding:14px;background:#f6f8fc;border-radius:10px;color:#2e3338;white-space:pre-wrap">${escapeHtml(req.quote_message)}</div>` : "";
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f8fc;padding:24px"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e4e9f0;border-radius:12px;padding:24px"><h2 style="margin:0 0 8px;color:#12151c">Your custom build update</h2><p style="color:#5c5e66;margin:0 0 16px">Hi ${escapeHtml(req.name)}, we reviewed your custom build request.</p><p style="color:#5c5e66"><strong>Status:</strong> ${escapeHtml(req.status)}</p>${quoteHtml}${msg}${itemsHtml}<p style="margin-top:20px;color:#5c5e66;font-size:13px">Reply to this email or contact ${escapeHtml(support)} if you have questions.</p></div></body></html>`;
  await fetch("https://api.resend.com/emails", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${env.RESEND_API_KEY}` }, body: JSON.stringify({ from:"Generic PCs <hello@genericpcs.com>", to:[req.email, support], subject:`[Custom Build] Update for your request — ${req.status}`, html }) }).catch((e)=>console.error("custom build quote email failed:",e));
}

function escapeHtml(v: string) { return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

export async function updateCustomBuildRequest(env: Env, id: string, patch: Record<string, unknown>) {
  const existing = await env.DB.prepare(`SELECT * FROM custom_build_requests WHERE id=?1`).bind(id).first<Record<string, unknown>>();
  if (!existing) return { ok: false as const, error: "Not found.", status: 404 };
  const prev = mapRow(existing);
  const status = typeof patch.status === "string" && STATUSES.has(patch.status) ? patch.status : prev.status;
  const adminNotes = typeof patch.admin_notes === "string" ? patch.admin_notes.slice(0,5000) : (patch.admin_notes === null ? null : prev.admin_notes);
  const quoteAmount = patch.quote_amount === null ? null : (patch.quote_amount !== undefined ? Number(patch.quote_amount) : prev.quote_amount);
  const quoteCurrency = typeof patch.quote_currency === "string" ? patch.quote_currency.slice(0,8).toUpperCase() : (prev.quote_currency || "USD");
  const quoteMessage = typeof patch.quote_message === "string" ? patch.quote_message.slice(0,5000) : (patch.quote_message === null ? null : prev.quote_message);
  let quoteItems = prev.quote_items;
  if (Array.isArray(patch.quote_items)) {
    quoteItems = patch.quote_items.filter((x)=>x&&typeof x==="object").map((x:Record<string,unknown>)=>({name:String(x.name??"").slice(0,160), spec:x.spec?String(x.spec).slice(0,240):undefined, price: x.price==null||x.price===""?undefined:Number(x.price), note:x.note?String(x.note).slice(0,240):undefined})).filter((x)=>x.name).slice(0,20);
  }
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE custom_build_requests SET status=?2, admin_notes=?3, quote_amount=?4, quote_currency=?5, quote_message=?6, quote_items=?7, updated_at=?8 WHERE id=?1`
  ).bind(id, status, adminNotes, Number.isFinite(quoteAmount as number) ? quoteAmount : null, quoteCurrency, quoteMessage, quoteItems.length ? JSON.stringify(quoteItems) : null, now).run();
  const row = await env.DB.prepare(`SELECT * FROM custom_build_requests WHERE id=?1`).bind(id).first<Record<string, unknown>>();
  const request = row ? mapRow(row) : prev;
  const shouldEmail = Boolean(patch.send_email) || status !== prev.status || quoteMessage !== prev.quote_message || JSON.stringify(quoteItems) !== JSON.stringify(prev.quote_items) || quoteAmount !== prev.quote_amount;
  if (shouldEmail) await sendQuoteEmail(env, request);
  return { ok: true as const, request };
}
