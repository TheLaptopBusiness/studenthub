// /api/admin — coach-only. Only emails listed in ADMIN_EMAILS get in.
// GET                → all students with progress
// GET ?id=<student>  → one student's intake, roadmap tasks and check-ins
// POST {action:"add", name, email}        → enroll + send welcome email
// POST {action:"resend", id}              → send a fresh sign-in link
// POST {action:"status", id, status}      → pause or reactivate
// POST {action:"notes", id, notes}        → save private coach notes
import { getUser, isAdmin, getStudent, getStudentByEmail, updateStudent, db, enc, signInLink, configured } from "../lib/supa.js";
import { sendEmail, templates } from "../lib/email.js";
import { summarize } from "../lib/checklist.js";
import { enrollStudent } from "../lib/dashboard.js";
import { coachNames, teamNames } from "../lib/team.js";
import { json, readJson, isEmail } from "../lib/http.js";

export const config = { runtime: "edge" };

const LIST_FIELDS = "id,email,name,phone,business_name,status,owner,onboarded_at,tasks_total,tasks_done,last_task_done_at,last_checkin_at,last_active_at,last_activity_at,last_contact_at,reminders_paused,created_at";

export default async function handler(req) {
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  const user = await getUser(req);
  if (!user) return json({ error: "signed_out" }, 401);
  if (!isAdmin(user.email)) return json({ error: "forbidden" }, 403);

  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      const [students, items] = await Promise.all([
        db(`students?select=${LIST_FIELDS}&order=created_at.desc&limit=1000`),
        db(`checklist_items?select=student_id,key,done,done_at,due_override,awaiting_reply&limit=50000`)
      ]);
      const byStudent = {};
      for (const i of items) (byStudent[i.student_id] = byStudent[i.student_id] || []).push(i);
      const out = students.map(s => {
        const sum = summarize(s, byStudent[s.id] || []);
        return { ...s, stage: sum.stage, percent: sum.percent, done: sum.done, total: sum.total, overdue: sum.overdue,
          overdue_team: sum.overdue_team, awaiting_reply: sum.awaiting_reply, at_risk: sum.at_risk, quiet_days: sum.quiet_days,
          next: sum.next ? sum.next.title : "" };
      });
      return json({ students: out, team: teamNames(), coaches: coachNames() });
    }
    const s = await getStudent(id);
    if (!s) return json({ error: "not_found" }, 404);
    const [tasks, checkins, auctions] = await Promise.all([
      db(`tasks?student_id=eq.${enc(id)}&select=id,phase,week,title,done,done_at&order=sort.asc`),
      db(`checkins?student_id=eq.${enc(id)}&select=week_label,data,report,created_at&order=created_at.desc&limit=8`),
      db(`auctions?student_id=eq.${enc(id)}&select=url,title,rating,result,created_at&order=created_at.desc&limit=6`)
    ]);
    const { ai_day, ai_count, reminders, ...student } = s;
    return json({ student: { ...student, ai_today: ai_day === new Date().toISOString().slice(0, 10) ? ai_count : 0 }, tasks, checkins, auctions });
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body;
  try { body = await readJson(req, 20000); } catch (e) { return json({ error: e.message }, e.status || 400); }

  if (body.action === "add") {
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim().slice(0, 100);
    if (!isEmail(email) || !name) return json({ error: "Enter the student's name and a valid email." }, 400);
    if (await getStudentByEmail(email)) return json({ error: "That email is already enrolled." }, 409);
    const r = await enrollStudent({ name, email, phone: String(body.phone || "").trim(), owner: body.owner });
    return json({ ok: true, emailed: r.emailed });
  }

  const s = await getStudent(String(body.id || ""));
  if (!s) return json({ error: "not_found" }, 404);

  if (body.action === "resend") {
    const { link } = await signInLink(s.email, "/");
    const t = s.onboarded_at ? templates.login(s.name, link) : templates.welcome(s.name, link);
    const emailed = await sendEmail({ to: s.email, ...t });
    return json({ ok: true, emailed });
  }
  if (body.action === "status") {
    const status = body.status === "paused" ? "paused" : (s.onboarded_at ? "active" : "invited");
    await updateStudent(s.id, { status });
    return json({ ok: true, status });
  }
  if (body.action === "notes") {
    await updateStudent(s.id, { coach_notes: String(body.notes || "").slice(0, 10000) });
    return json({ ok: true });
  }
  return json({ error: "bad_request" }, 400);
}
