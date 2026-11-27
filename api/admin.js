// /api/admin — coach-only. Only emails listed in ADMIN_EMAILS get in.
// GET                → all students with progress
// GET ?id=<student>  → one student's intake, roadmap tasks and check-ins
// POST {action:"add", name, email}        → enroll + send welcome email
// POST {action:"resend", id}              → send a fresh sign-in link
// POST {action:"status", id, status}      → pause or reactivate
// POST {action:"notes", id, notes}        → save private coach notes
// GET  ?pulses=1&week=YYYY-MM-DD           → that week's check-in answers + who hasn't answered
// POST {action:"update", id, fields}       → edit a student's details
// POST {action:"delete", id, confirm:"DELETE"} → delete a student and everything about them
// POST {action:"send_weekly", kind:"checkin"|"monday", id?} → send now (to one student, or everyone)
// POST {action:"call_reminder", when}      → email + text every student (when: tomorrow | today | hour | now)
import { getUser, isAdmin, getStudent, getStudentByEmail, updateStudent, db, enc, signInLink, configured, deleteUser, setUserEmail, nowIso } from "../lib/supa.js";
import { sendMonday, sendCheckin } from "../lib/weekly.js";
import { weekKey, weekLabel } from "../lib/pulse.js";
import { sendEmail, templates } from "../lib/email.js";
import { summarize } from "../lib/checklist.js";
import { enrollStudent, postMessage } from "../lib/dashboard.js";
import { coachNames, teamNames, teamName } from "../lib/team.js";
import { sendCallReminder } from "../lib/calls.js";
import { json, readJson, isEmail } from "../lib/http.js";

export const config = { runtime: "edge" };

const LIST_FIELDS = "id,email,name,phone,business_name,status,owner,onboarded_at,tasks_total,tasks_done,last_task_done_at,last_checkin_at,last_active_at,last_activity_at,last_contact_at,reminders_paused,created_at";

export default async function handler(req) {
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  const user = await getUser(req);
  if (!user) return json({ error: "signed_out" }, 401);
  if (!isAdmin(user.email)) return json({ error: "forbidden" }, 403);

  if (req.method === "GET") {
    const qs = new URL(req.url).searchParams;
    const id = qs.get("id");
    if (qs.get("pulses")) {
      const wk = /^\d{4}-\d{2}-\d{2}$/.test(qs.get("week") || "") ? qs.get("week") : weekKey();
      const [rows, studs] = await Promise.all([
        db(`pulses?week=eq.${wk}&select=*&order=created_at.desc&limit=2000`),
        db(`students?status=in.(invited,active)&select=id,name,email,owner,created_at&limit=5000`)
      ]);
      const by = Object.fromEntries(studs.map(x => [x.id, x]));
      const shift = d => { const t = new Date(wk + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10); };
      return json({ week: wk, label: weekLabel(wk), prev: shift(-7), next: shift(7) <= weekKey() ? shift(7) : null,
        rows: rows.map(r => ({ ...r, name: (by[r.student_id] || {}).name || "", owner: (by[r.student_id] || {}).owner || "" })),
        missing: studs.filter(x => !rows.find(r => r.student_id === x.id) && x.created_at.slice(0, 10) <= shift(6)).map(x => ({ id: x.id, name: x.name, owner: x.owner })) });
    }
    if (!id) {
      const [students, items, wkPulses] = await Promise.all([
        db(`students?select=${LIST_FIELDS}&order=created_at.desc&limit=1000`),
        db(`checklist_items?select=student_id,key,done,done_at,due_override,awaiting_reply&limit=50000`),
        db(`pulses?week=eq.${weekKey()}&select=student_id,flag,replied_at,mood&limit=5000`).catch(() => [])
      ]);
      const pulseBy = Object.fromEntries(wkPulses.map(p => [p.student_id, p]));
      const byStudent = {};
      for (const i of items) (byStudent[i.student_id] = byStudent[i.student_id] || []).push(i);
      const out = students.map(s => {
        const sum = summarize(s, byStudent[s.id] || []);
        return { ...s, stage: sum.stage, percent: sum.percent, done: sum.done, total: sum.total, overdue: sum.overdue,
          overdue_team: sum.overdue_team, awaiting_reply: sum.awaiting_reply, at_risk: sum.at_risk, quiet_days: sum.quiet_days,
          next: sum.next ? sum.next.title : "",
          pulse: pulseBy[s.id] ? { flag: pulseBy[s.id].flag, replied: !!pulseBy[s.id].replied_at, mood: pulseBy[s.id].mood } : null };
      });
      return json({ students: out, team: teamNames(), coaches: coachNames() });
    }
    const s = await getStudent(id);
    if (!s) return json({ error: "not_found" }, 404);
    const [tasks, checkins, auctions, outbox, pulses] = await Promise.all([
      db(`tasks?student_id=eq.${enc(id)}&select=id,phase,week,title,done,done_at&order=sort.asc`),
      db(`checkins?student_id=eq.${enc(id)}&select=week_label,data,report,created_at&order=created_at.desc&limit=8`),
      db(`auctions?student_id=eq.${enc(id)}&select=url,title,rating,result,created_at&order=created_at.desc&limit=6`),
      db(`outbox?student_id=eq.${enc(id)}&select=channel,event,subject,body,ok,created_at&order=created_at.desc&limit=100`).catch(() => []),
      db(`pulses?student_id=eq.${enc(id)}&select=*&order=week.desc&limit=26`).catch(() => [])
    ]);
    const { ai_day, ai_count, reminders, ...student } = s;
    return json({ student: { ...student, ai_today: ai_day === new Date().toISOString().slice(0, 10) ? ai_count : 0 }, tasks, checkins, auctions, outbox, pulses });
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

  if (body.action === "send_weekly") {
    const kind = body.kind === "monday" ? "monday" : body.kind === "checkin" ? "checkin" : "";
    if (!kind) return json({ error: "bad_request" }, 400);
    const list = body.id ? [await getStudent(String(body.id))].filter(Boolean)
      : await db("students?status=in.(invited,active)&reminders_paused=is.false&select=*&limit=5000");
    let sent = 0;
    for (const st of list) if (await (kind === "monday" ? sendMonday(st) : sendCheckin(st))) sent++;
    return json({ ok: true, sent, total: list.length });
  }

  if (body.action === "pulse_reply") {
    const pr = (await db(`pulses?id=eq.${enc(String(body.pulse_id || ""))}&select=*`))[0];
    if (!pr) return json({ error: "not_found" }, 404);
    const st = await getStudent(pr.student_id);
    const text = String(body.body || "").trim();
    if (!st || !text) return json({ error: "Write a reply first." }, 400);
    const who = teamName(user.email);
    await postMessage(st, who, text);
    await db(`pulses?id=eq.${enc(pr.id)}`, { method: "PATCH", prefer: "return=minimal", body: { replied_at: nowIso(), replied_by: who } });
    return json({ ok: true, replied_by: who });
  }

  if (body.action === "call_reminder") {
    try { return json({ ok: true, ...(await sendCallReminder(String(body.when || ""))) }); }
    catch (e) { return json({ error: e.message }, 400); }
  }

  const s = await getStudent(String(body.id || ""));
  if (!s) return json({ error: "not_found" }, 404);

  if (body.action === "resend") {
    const { link } = await signInLink(s.email, "/");
    const t = s.onboarded_at ? templates.login(s.name, link) : templates.welcome(s.name, link);
    const emailed = await sendEmail({ to: s.email, student: s, ...t });
    return json({ ok: true, emailed });
  }
  if (body.action === "status") {
    const status = body.status === "paused" ? "paused" : (s.onboarded_at ? "active" : "invited");
    await updateStudent(s.id, { status });
    return json({ ok: true, status });
  }
  if (body.action === "update") {
    const f = body.fields || {}, out = {};
    const text = (k, n = 160) => { if (typeof f[k] === "string") out[k] = f[k].trim().slice(0, n); };
    ["name", "phone", "location", "business_name", "domain", "partner"].forEach(k => text(k));
    ["logo_url", "website_url"].forEach(k => text(k, 500));
    if (["", "Low", "Mid", "High"].includes(f.tier)) out.tier = f.tier;
    if (["", "HP", "Dell", "Lenovo"].includes(f.focus_brand)) out.focus_brand = f.focus_brand;
    for (const k of ["monthly_goal", "weekly_unit_target"]) if (f[k] !== undefined) { const n = Number(String(f[k]).replace(/[$,\s]/g, "")); out[k] = f[k] === "" || !(n > 0) ? null : (k === "weekly_unit_target" ? Math.round(n) : n); }
    if (f.owner !== undefined) { if (!coachNames().includes(f.owner)) return json({ error: "Pick an owner from the team list." }, 400); out.owner = f.owner; }
    if (out.name === "") return json({ error: "Name can't be empty." }, 400);
    if (typeof f.enrolled === "string" && f.enrolled && f.enrolled !== String(s.created_at || "").slice(0, 10)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.enrolled) || isNaN(Date.parse(f.enrolled))) return json({ error: "That enrollment date doesn't look right." }, 400);
      if (Date.parse(f.enrolled) > Date.now() + 864e5) return json({ error: "The enrollment date can't be in the future." }, 400);
      out.created_at = f.enrolled + "T12:00:00Z";
    }
    if (typeof f.email === "string" && f.email.trim().toLowerCase() !== s.email) {
      const email = f.email.trim().toLowerCase();
      if (!isEmail(email)) return json({ error: "That email doesn't look right." }, 400);
      if (await getStudentByEmail(email)) return json({ error: "Another student already uses that email." }, 409);
      await setUserEmail(s.id, email); out.email = email; out.ghl_contact_id = "";
    }
    if (out.phone !== undefined && out.phone !== s.phone) out.ghl_contact_id = "";
    await updateStudent(s.id, out);
    return json({ ok: true });
  }
  if (body.action === "delete") {
    if (body.confirm !== "DELETE") return json({ error: 'Type DELETE to confirm.' }, 400);
    await deleteUser(s.id);
    return json({ ok: true, deleted: true });
  }
  if (body.action === "notes") {
    await updateStudent(s.id, { coach_notes: String(body.notes || "").slice(0, 10000) });
    return json({ ok: true });
  }
  return json({ error: "bad_request" }, 400);
}
