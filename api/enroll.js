// POST /api/enroll — for GoHighLevel workflows (Custom Webhook action).
// Secured with ENROLL_SECRET: send it as the header "x-hub-secret" or as ?secret=… in the URL.
//
// Enroll a student (creates their login and a fresh dashboard, sends the welcome email + SMS):
//   { "action": "enroll", "name": "Angela Westwood", "email": "...", "phone": "..." }
//   (GoHighLevel's standard contact fields first_name / last_name / email / phone also work)
// Brand details received outside the Hub (ticks "Fill out the brand survey"; normally students send the survey in the Hub):
//   { "action": "brand_form", "email": "..." }
import { getStudentByEmail, updateStudent, db, enc, nowIso, configured } from "../lib/supa.js";
import { summarize } from "../lib/checklist.js";
import { enrollStudent, ensureChecklist, afterTick } from "../lib/dashboard.js";
import { json, readJson, isEmail } from "../lib/http.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  const secret = process.env.ENROLL_SECRET;
  const given = req.headers.get("x-hub-secret") || new URL(req.url).searchParams.get("secret") || "";
  if (!secret || given !== secret) return json({ error: "forbidden" }, 403);

  let body;
  try { body = await readJson(req, 50000); } catch (e) { return json({ error: e.message }, e.status || 400); }
  const c = body.contact || {};
  const email = String(body.email || c.email || "").trim().toLowerCase();
  if (!isEmail(email)) return json({ error: "A valid email is required." }, 400);
  const action = body.action || (new URL(req.url).searchParams.get("action")) || "enroll";

  if (action === "brand_form") {
    const s = await getStudentByEmail(email);
    if (!s) return json({ error: "No student with that email." }, 404);
    const items = await ensureChecklist(s);
    const item = items.find(i => i.key === "brand_form");
    if (!item.done) {
      const before = summarize(s, items);
      await db(`checklist_items?id=eq.${enc(item.id)}`, { method: "PATCH", prefer: "return=minimal", body: { done: true, done_at: nowIso(), done_by_name: "Brand form" } });
      await updateStudent(s.id, { last_activity_at: nowIso() });
      const after = summarize(s, items.map(i => i.id === item.id ? { ...i, done: true, done_at: nowIso() } : i));
      await afterTick(s, { ...item, done: true }, before, after, false);
    }
    return json({ ok: true });
  }

  const name = String(body.name || c.name || [body.first_name || c.first_name, body.last_name || c.last_name].filter(Boolean).join(" ") || body.full_name || "").trim();
  if (!name) return json({ error: "A name is required." }, 400);
  const phone = String(body.phone || c.phone || "").trim();
  const r = await enrollStudent({ name, email, phone, owner: body.owner });
  return json({ ok: true, existed: r.existed, emailed: r.emailed, student_id: r.student.id });
}
