import type { Env } from "./types";

/** Giveaway closes 30 days after the first request (stable once set). */
const CLOSING_KEY = "giveaway.closing";

export type GiveawayStatus = {
  closesAt: string;
  closed: boolean;
  entered: boolean;
  totalEntries: number;
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

  return {
    closesAt,
    closed,
    entered,
    totalEntries: countRow?.count ?? 0,
  };
}

export async function redeemGiveaway(
  env: Env,
  identity: { userId: string | null; guestId: string | null },
  details: { email: string; name: string }
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

  await env.DB.prepare(
    `INSERT INTO giveaway_entries (id, user_id, guest_id, email, name, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  )
    .bind(
      crypto.randomUUID(),
      identity.userId,
      identity.guestId,
      email,
      name,
      new Date().toISOString()
    )
    .run();

  return { ok: true, status: await getGiveawayStatus(env, identity) };
}
