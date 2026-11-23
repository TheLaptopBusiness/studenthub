// POST /api/tasks  { id, done }  → tick a roadmap task on or off.
import { getUser, getStudent, db, enc, nowIso, recountTasks, configured, studentFor } from "../lib/supa.js";
import { json, readJson } from "../lib/http.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  const user = await getUser(req);
  if (!user) return json({ error: "signed_out" }, 401);
  const s = await studentFor(user);
  if (!s || s.status === "paused") return json({ error: "not_enrolled" }, 403);
  let body;
  try { body = await readJson(req, 2000); } catch (e) { return json({ error: e.message }, e.status || 400); }
  const id = String(body.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "bad_request" }, 400);
  const done = Boolean(body.done);
  const rows = await db(`tasks?id=eq.${enc(id)}&student_id=eq.${enc(s.id)}`, {
    method: "PATCH", prefer: "return=representation", body: { done, done_at: done ? nowIso() : null }
  });
  if (!rows || !rows.length) return json({ error: "not_found" }, 404);
  const counts = await recountTasks(s.id);
  return json({ ok: true, ...counts });
}
