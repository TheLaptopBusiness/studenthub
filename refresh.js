// POST /api/refresh  { refresh_token }  → a fresh session, so students stay signed in.
import { refreshSession, configured } from "../lib/supa.js";
import { json, readJson } from "../lib/http.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  let body;
  try { body = await readJson(req, 5000); } catch (e) { return json({ error: e.message }, e.status || 400); }
  const s = await refreshSession(String(body.refresh_token || ""));
  if (!s) return json({ error: "signed_out" }, 401);
  return json({ access_token: s.access_token, refresh_token: s.refresh_token, expires_in: s.expires_in, expires_at: s.expires_at });
}
