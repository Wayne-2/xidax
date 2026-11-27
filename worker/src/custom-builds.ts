import type { Env } from "./types";

export type CustomBuildRequestRow = {
  id: string;
  name: string;
  email: string;
  contact: string | null;
  budget: string | null;
  request_text: string;
  status: string;
  admin_notes: string | null;
  quote_amount: number | null;
  quote_currency: string | null;
  created_at: string;
  updated_at: string;
};

const STATUSES = new Set(["new", "reviewing", "quoted", "awaiting_payment", "paid", "building", "shipped", "completed", "cancelled"]);

function mapRow(r: Record<string, unknown>): CustomBuildRequestRow {
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    contact: r.contact == null ? null : String(r.contact),
    budget: r.budget == null ? null : String(r.budget),
    request_text: String(r.request_text ?? ""),
    status: String(r.status ?? "new"),
    admin_notes: r.admin_notes == null ? null : String(r.admin_notes),
    quote_amount: r.quote_amount == null ? null : Number(r.quote_amount),
    quote_currency: r.quote_currency == null ? "USD" : String(r.quote_currency),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export async function createCustomBuildRequest(env: Env, input: { name: string; email: string; contact?: string; budget?: string; requestText: string; }) {
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
    `INSERT INTO custom_build_requests (id,name,email,contact,budget,request_text,status,admin_notes,quote_amount,quote_currency,created_at,updated_at)
     VALUES (?1,?2,?3,?4,?5,?6,'new',NULL,NULL,'USD',?7,?7)`
  ).bind(id, name, email, contact, budget, requestText, now).run();
  return { ok: true as const, id };
}

export async function listCustomBuildRequests(env: Env) {
  const { results } = await env.DB.prepare(`SELECT * FROM custom_build_requests ORDER BY created_at DESC LIMIT 200`).all();
  return { requests: (results ?? []).map(mapRow) };
}

export async function updateCustomBuildRequest(env: Env, id: string, patch: Record<string, unknown>) {
  const existing = await env.DB.prepare(`SELECT * FROM custom_build_requests WHERE id=?1`).bind(id).first();
  if (!existing) return { ok: false as const, error: "Not found.", status: 404 };
  const status = typeof patch.status === "string" && STATUSES.has(patch.status) ? patch.status : String(existing.status);
  const adminNotes = typeof patch.adminNotes === "string" ? patch.adminNotes.slice(0, 5000) : (patch.adminNotes === null ? null : existing.admin_notes);
  const quoteAmount = patch.quoteAmount === null ? null : (patch.quoteAmount !== undefined ? Number(patch.quoteAmount) : existing.quote_amount);
  const quoteCurrency = typeof patch.quoteCurrency === "string" ? patch.quoteCurrency.slice(0, 8).toUpperCase() : String(existing.quote_currency ?? "USD");
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE custom_build_requests SET status=?2, admin_notes=?3, quote_amount=?4, quote_currency=?5, updated_at=?6 WHERE id=?1`
  ).bind(id, status, adminNotes, Number.isFinite(quoteAmount as number) ? quoteAmount : null, quoteCurrency, now).run();
  const row = await env.DB.prepare(`SELECT * FROM custom_build_requests WHERE id=?1`).bind(id).first<Record<string, unknown>>();
  return { ok: true as const, request: row ? mapRow(row) : mapRow(existing as Record<string, unknown>) };
}
