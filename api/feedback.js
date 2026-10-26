// /api/feedback — the Coach correction loop.
// Students:  POST {rating:"up"|"down", question, answer, comment?}
// Coach:     GET                          → answers marked wrong that are waiting for you, plus recent totals
//            POST {action:"answer", id, answer, question?}  → saves your answer as a verified answer the Coach always uses
//            POST {action:"dismiss", id}
import { getUser, isAdmin, getStudent, db, enc, nowIso, configured, studentFor } from "../lib/supa.js";
import { wordCount } from "../public/prompts.js";
import { json, readJson } from "../lib/http.js";

export const config = { runtime: "edge" };
const isId = s => /^[0-9a-f-]{36}$/i.test(String(s || ""));

export default async function handler(req) {
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  const user = await getUser(req);
  if (!user) return json({ error: "signed_out" }, 401);
  const admin = isAdmin(user.email);

  if (req.method === "GET") {
    if (!admin) return json({ error: "forbidden" }, 403);
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const [open, recent] = await Promise.all([
      db("coach_feedback?status=eq.open&rating=eq.down&select=id,student_id,question,answer,comment,created_at&order=created_at.desc&limit=200"),
      db(`coach_feedback?created_at=gte.${enc(since)}&select=rating&limit=5000`)
    ]);
    const ids = [...new Set(open.map(o => o.student_id).filter(Boolean))];
    const students = ids.length ? await db(`students?id=in.(${ids.map(enc).join(",")})&select=id,name,email`) : [];
    const names = Object.fromEntries(students.map(s => [s.id, s.name || s.email]));
    return json({
      open: open.map(o => ({ ...o, student: names[o.student_id] || "A student" })),
      last30: { up: recent.filter(r => r.rating === "up").length, down: recent.filter(r => r.rating === "down").length }
    });
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body;
  try { body = await readJson(req, 60000); } catch (e) { return json({ error: e.message }, e.status || 400); }

  if (body.action === "answer" || body.action === "dismiss") {
    if (!admin) return json({ error: "forbidden" }, 403);
    if (!isId(body.id)) return json({ error: "bad_request" }, 400);
    const rows = await db(`coach_feedback?id=eq.${enc(body.id)}&select=*`);
    if (!rows[0]) return json({ error: "not_found" }, 404);
    if (body.action === "dismiss") {
      await db(`coach_feedback?id=eq.${enc(body.id)}`, { method: "PATCH", prefer: "return=minimal", body: { status: "dismissed" } });
      return json({ ok: true });
    }
    const answer = String(body.answer || "").trim().slice(0, 8000);
    const question = String(body.question || rows[0].question).trim().slice(0, 500);
    if (!answer) return json({ error: "Write the correct answer first." }, 400);
    const k = await db("knowledge", { method: "POST", prefer: "return=representation", body: {
      kind: "faq", title: question, content: answer, words: wordCount(answer)
    } });
    await db(`coach_feedback?id=eq.${enc(body.id)}`, { method: "PATCH", prefer: "return=minimal", body: { status: "answered", knowledge_id: k[0].id } });
    return json({ ok: true });
  }

  // A student rating an answer.
  const s = await studentFor(user);
  if (!s && !admin) return json({ error: "not_enrolled" }, 403);
  const rating = body.rating === "up" ? "up" : body.rating === "down" ? "down" : null;
  if (!rating) return json({ error: "bad_request" }, 400);
  await db("coach_feedback", { method: "POST", prefer: "return=minimal", body: {
    student_id: s ? s.id : null,
    question: String(body.question || "").slice(0, 4000),
    answer: String(body.answer || "").slice(0, 12000),
    comment: String(body.comment || "").slice(0, 2000),
    rating,
    status: rating === "up" ? "noted" : "open"
  } });
  return json({ ok: true, at: nowIso() });
}
