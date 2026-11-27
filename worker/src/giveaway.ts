import type { Env } from "./types";

/** Giveaway closes 30 days after the first request (stable once set). */
const CLOSING_KEY = "giveaway.closing";
const PRIZE_KEY = "giveaway.prize";

export type GiveawayPrize = {
  name: string;
  description: string;
  images: string[];
  specs: { label: string; value: string }[];
};

export type GiveawayStatus = {
  closesAt: string;
  closed: boolean;
  entered: boolean;
  totalEntries: number;
  prize: GiveawayPrize | null;
};

type Row = {
  id: string;
  user_id: string | null;
  guest_id: string | null;
  email: string;
  name: string;
  created_at: string;
};

async function getClosingAt(env: Env): Promise<string> {
  const stored = await env.SESSIONS.get(CLOSING_KEY, "text");

  if (stored) return stored;

  // 30 days from now, rounded to midnight UTC.
  const closing = new Date();
  closing.setUTCDate(closing.getUTCDate() + 30);
  closing.setUTCHours(23, 59, 59, 999);
  const iso = closing.toISOString();

  await env.SESSIONS.put(CLOSING_KEY, iso);

  return iso;
}

function normalizePrize(raw: unknown): GiveawayPrize | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as { name?: unknown; description?: unknown; images?: unknown; specs?: unknown };
  const name = typeof value.name === "string" ? value.name.trim().slice(0, 200) : "";
  const description = typeof value.description === "string" ? value.description.trim().slice(0, 1000) : "";
  const images = Array.isArray(value.images)
    ? value.images.filter((img): img is string => typeof img === "string" && img.trim().length > 0).slice(0, 12)
    : [];
  const specs = Array.isArray(value.specs)
    ? value.specs.map((s) => {
        const o = s && typeof s === "object" ? s as { label?: unknown; value?: unknown } : {};
        return { label: typeof o.label === "string" ? o.label.trim().slice(0, 80) : "", value: typeof o.value === "string" ? o.value.trim().slice(0, 160) : "" };
      }).filter((s) => s.label && s.value).slice(0, 12)
    : [];

  if (!name && !description && images.length === 0 && specs.length === 0) return null;

  return { name, description, images, specs };
}

async function getPrize(env: Env): Promise<GiveawayPrize | null> {
  const stored = await env.SESSIONS.get(PRIZE_KEY, "text");
  if (!stored) return null;

  try {
    return normalizePrize(JSON.parse(stored));
  } catch {
    return null;
  }
}

export async function setGiveawayPrize(
  env: Env,
  prize: unknown
): Promise<{ ok: true; status: GiveawayStatus } | { ok: false; error: string }> {
  const normalized = normalizePrize(prize);

  if (!normalized) {
    return { ok: false, error: "Add a prize name, image, or spec before saving." };
  }

  await env.SESSIONS.put(PRIZE_KEY, JSON.stringify(normalized));
  const status = await getGiveawayStatus(env, { userId: null, guestId: null });
  return { ok: true, status };
}

export async function clearGiveawayPrize(
  env: Env
): Promise<{ ok: true; status: GiveawayStatus }> {
  await env.SESSIONS.delete(PRIZE_KEY);
  const status = await getGiveawayStatus(env, { userId: null, guestId: null });
  return { ok: true, status };
}

export async function getGiveawayStatus(
  env: Env,
  identity: { userId: string | null; guestId: string | null }
): Promise<GiveawayStatus> {
  const closesAt = await getClosingAt(env);
  const closed = new Date(closesAt).getTime() < Date.now();

  let entered = false;

  if (identity.userId) {
    const row = await env.DB.prepare(
      "SELECT id FROM giveaway_entries WHERE user_id = ?1"
    )
      .bind(identity.userId)
      .first<{ id: string }>();
    entered = Boolean(row);
  } else if (identity.guestId) {
    const row = await env.DB.prepare(
      "SELECT id FROM giveaway_entries WHERE guest_id = ?1"
    )
      .bind(identity.guestId)
      .first<{ id: string }>();
    entered = Boolean(row);
  }

  const countRow = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM giveaway_entries"
  ).first<{ count: number }>();
  const prize = await getPrize(env);

  return {
    closesAt,
    closed,
    entered,
    totalEntries: countRow?.count ?? 0,
    prize,
  };
}

export async function setGiveawayClosing(
  env: Env,
  closesAt: string
): Promise<{ ok: true; status: GiveawayStatus } | { ok: false; error: string }> {
  const parsed = new Date(closesAt);

  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Enter a valid closing time." };
  }

  await env.SESSIONS.put(CLOSING_KEY, parsed.toISOString());

  const status = await getGiveawayStatus(env, { userId: null, guestId: null });

  return { ok: true, status };
}

export async function redeemGiveaway(
  env: Env,
  identity: { userId: string | null; guestId: string | null },
  details: { email: string; name: string; reason: string }
): Promise<
  | { ok: true; status: GiveawayStatus }
  | { error: string; status: number; statusCode: GiveawayStatus }
> {
  const current = await getGiveawayStatus(env, identity);

  if (current.closed) {
    return {
      error: "Entries have closed.",
      status: 410,
      statusCode: current,
    };
  }

  if (current.entered) {
    return {
      error: "You have already entered the giveaway.",
      status: 409,
      statusCode: current,
    };
  }

  const email = details.email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      error: "Enter a valid email address.",
      status: 400,
      statusCode: current,
    };
  }

  const name = details.name.trim().slice(0, 200);

  if (!name) {
    return {
      error: "Tell us your name.",
      status: 400,
      statusCode: current,
    };
  }

  const reason = details.reason.trim().slice(0, 1200);
  if (reason.length < 10) {
    return {
      error: "Tell us why you need a PC (at least 10 characters).",
      status: 400,
      statusCode: current,
    };
  }

  await env.DB.prepare(
    `INSERT INTO giveaway_entries (id, user_id, guest_id, email, name, reason, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(
      crypto.randomUUID(),
      identity.userId,
      identity.guestId,
      email,
      name,
      reason,
      new Date().toISOString()
    )
    .run();

  return { ok: true, status: await getGiveawayStatus(env, identity) };
}
