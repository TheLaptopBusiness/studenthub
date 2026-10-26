// GET /api/config → public settings the sign-in screen needs. Nothing secret here:
// the Supabase URL and the anon (publishable) key are designed to be used in browsers.
// Env: SUPABASE_ANON_KEY (the publishable key sb_publishable_…, or the legacy anon key), GOOGLE_SIGNIN ("on" to show "Continue with Google")
import { json } from "../lib/http.js";

export const config = { runtime: "edge" };

export default async function handler() {
  const url = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const anon = process.env.SUPABASE_ANON_KEY || "";
  return new Response(JSON.stringify({
    supabaseUrl: anon ? url : "",
    anonKey: anon,
    google: Boolean(anon) && String(process.env.GOOGLE_SIGNIN || "").toLowerCase() === "on",
    siteUrl: String(process.env.SITE_URL || "").replace(/\/+$/, "")
  }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=300" } });
}
