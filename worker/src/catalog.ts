import type { Env } from "./types";

export type CatalogKind = "laptops" | "consoles";

function tableFor(kind: CatalogKind) {
  return kind === "laptops" ? "laptops" : "consoles";
}

export type CatalogItem = {
  id: string;
  data: Record<string, unknown>;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  data: string;
  published: number;
  created_at: string;
  updated_at: string;
};

function rowToItem(row: Row): CatalogItem {
  return {
    id: row.id,
    data: JSON.parse(row.data) as Record<string, unknown>,
    published: row.published === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCatalogItems(
  env: Env,
  kind: CatalogKind,
  publishedOnly: boolean
): Promise<CatalogItem[]> {
  const table = tableFor(kind);
  const where = publishedOnly ? "WHERE published = 1" : "";

  const rows = await env.DB.prepare(
    `SELECT id, data, published, created_at, updated_at FROM ${table} ${where} ORDER BY created_at ASC`
  ).all<Row>();

  return (rows.results ?? []).map(rowToItem);
}

export async function getCatalogItem(
  env: Env,
  kind: CatalogKind,
  id: string
): Promise<CatalogItem | null> {
  const table = tableFor(kind);
  const row = await env.DB.prepare(
    `SELECT id, data, published, created_at, updated_at FROM ${table} WHERE id = ?1`
  )
    .bind(id)
    .first<Row>();

  return row ? rowToItem(row) : null;
}

export async function saveCatalogItem(
  env: Env,
  kind: CatalogKind,
  id: string,
  data: Record<string, unknown>
): Promise<CatalogItem | null> {
  const table = tableFor(kind);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO ${table} (id, data, published, created_at, updated_at)
     VALUES (?1, ?2, 1, ?3, ?3)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  )
    .bind(id, JSON.stringify(data), now)
    .run();

  return getCatalogItem(env, kind, id);
}

export async function deleteCatalogItem(
  env: Env,
  kind: CatalogKind,
  id: string
): Promise<boolean> {
  const table = tableFor(kind);
  const result = await env.DB.prepare(
    `DELETE FROM ${table} WHERE id = ?1`
  )
    .bind(id)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function setCatalogPublished(
  env: Env,
  kind: CatalogKind,
  id: string,
  published: boolean
): Promise<boolean> {
  const table = tableFor(kind);
  const result = await env.DB.prepare(
    `UPDATE ${table} SET published = ?1, updated_at = ?2 WHERE id = ?3`
  )
    .bind(published ? 1 : 0, new Date().toISOString(), id)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}
