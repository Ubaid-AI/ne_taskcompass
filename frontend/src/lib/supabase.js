// Minimal Supabase client built on the PostgREST endpoint.
// Uses plain fetch so the project needs no extra npm dependency.
//
// Credentials resolve in two steps:
//   1. demo/.env, if it exists, via VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
//      Useful for pointing a developer at a scratch Supabase project.
//   2. Otherwise the committed values in ./config.js, so a plain clone or a
//      fresh deploy reaches the real database with no setup at all.
//
// Only if both are somehow blank does the app fall back to bundled sample data,
// which keeps a client demo alive when the database is unreachable.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const URL = (import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL || "").replace(/\/$/, "");
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(URL && KEY);

// Exported so the realtime socket can reach the same project without the
// credentials being resolved a second time somewhere else.
export const SB_URL = URL;
export const SB_KEY = KEY;

function headers(extra = {}) {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function handle(res) {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** SELECT rows. `query` is a PostgREST query string, e.g. "select=*&status=eq.approved" */
export async function sbSelect(table, query = "select=*") {
  if (!isSupabaseConfigured) return null;
  const res = await fetch(`${URL}/rest/v1/${table}?${query}`, { headers: headers() });
  return handle(res);
}

/**
 * INSERT one or more rows; returns the inserted rows.
 *
 * Pass `prefer: "resolution=merge-duplicates,return=representation"` together
 * with `?on_conflict=col1,col2` on the table name to turn this into an upsert.
 * That is how a target can be assigned twice without the second attempt failing
 * on the unique index, or silently creating a duplicate.
 */
export async function sbInsert(table, rows, { prefer = "return=representation" } = {}) {
  if (!isSupabaseConfigured) return null;
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    method: "POST",
    headers: headers({ Prefer: prefer }),
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  return handle(res);
}

/** UPDATE rows matching `query`, e.g. sbUpdate("doctors", "id=eq.123", { status: "approved" }) */
export async function sbUpdate(table, query, patch) {
  if (!isSupabaseConfigured) return null;
  const res = await fetch(`${URL}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(patch),
  });
  return handle(res);
}

/** DELETE rows matching `query`. */
export async function sbDelete(table, query) {
  if (!isSupabaseConfigured) return null;
  const res = await fetch(`${URL}/rest/v1/${table}?${query}`, {
    method: "DELETE",
    headers: headers({ Prefer: "return=representation" }),
  });
  return handle(res);
}

/** Quick connectivity probe used by the UI status badge. */
export async function sbPing() {
  if (!isSupabaseConfigured) return { ok: false, reason: "not-configured" };
  try {
    await sbSelect("products", "select=id&limit=1");
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
