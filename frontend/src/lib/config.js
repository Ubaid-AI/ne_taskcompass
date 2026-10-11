// NE TaskCompass - runtime configuration.
//
// These are the public "anon / publishable" Supabase values. They are meant to
// be shipped to the browser. Vite inlines any VITE_ prefixed variable straight
// into the built JavaScript bundle, so an environment variable would end up
// equally visible to anyone who opens the site. Keeping the values here simply
// makes that fact explicit, and means a fresh clone or a fresh Vercel deploy
// talks to the real database with no extra setup.
//
// Access control is enforced by Postgres Row Level Security on the Supabase
// side, not by hiding this key. The service_role key must never appear here or
// anywhere else in this repository.
//
// A local demo/.env still wins if it is present, which is handy for pointing a
// developer at a scratch project without editing tracked files.

export const SUPABASE_URL = "https://zmkqtcjcungdrpenrkpq.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_VA6aFEA2q3ZWVbp49JiKMw_uXktxBJk";
