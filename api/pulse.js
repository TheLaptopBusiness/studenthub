// /api/pulse — the weekly check-in form (works from the private link in the Friday email/text, no sign-in).
// GET  ?t=<token>                              → { first_name, week_label, coach, answered }
// POST { t, win, challenge, mood, need_help }  → saves (one per student per week; resubmitting updates it)
import { getStudent, updateStudent, db, nowIso, configured, siteUrl } from "../lib/supa.js";
import { readToken, weekLabel } from "../lib/pulse.js";
import { teamEmails, coachFor } from "../lib/team.js";
import { sendEmail, templates } from "../lib/email.js";
import { json, readJson } from "../lib/http.js";
import { analyzePulse } from "../lib/analyze.js";
import { summarize } from "../lib/checklist.js";
import { soundsLikeExit, flagExit } from "../lib/care.js";

export const config = { runtime: "edge" };
const MOODS = ["Tough", "Slow", "Okay", "Good", "Great"];

export default async function handler(req) {
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  let body = {};
  if (req.method === "POST") { try { body = await readJson(req, 20000); } catch (e) { return json({ error: e.message }, e.status || 400); } }
  else if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  const tok = await readToken(req.method === "GET" ? new URL(req.url).searchParams.get("t") : body.t);
  if (!tok) return json({ error: "This link isn't valid. Use the link from your latest Friday email or text." }, 403);
  const s = await getStudent(tok.studentId);
  if (!s || s.status === "paused") return json({ error: "This link isn't active." }, 403);
  const existing = (await db(`pulses?student_id=eq.${s.id}&week=eq.${tok.week}&select=*`))[0] || null;

  if (req.method === "GET") {
    return json({ first_name: String(s.name || "").split(/\s+/)[0], week_label: weekLabel(tok.week), coach: coachFor(s), answered: existing });
  }
  const clip = (v, n) => String(v || "").trim().slice(0, n);
  const row = { student_id: s.id, week: tok.week, win: clip(body.win, 2000), challenge: clip(body.challenge, 2000),
    mood: MOODS.includes(body.mood) ? body.mood : "", need_help: !!body.need_help, updated_at: nowIso() };
  if (!row.win) return json({ error: "Tell us your win this week. Big or small, it counts." }, 400);
  // read it: does the team need to respond?
  const [items, history] = await Promise.all([
    db(`checklist_items?student_id=eq.${s.id}&select=*&limit=200`).catch(() => []),
    db(`pulses?student_id=eq.${s.id}&week=lt.${tok.week}&select=week,win,challenge,mood&order=week.desc&limit=3`).catch(() => [])
  ]);
  const sum = summarize(s, items);
  const progress = `${sum.done} of ${sum.total} checklist steps done (stage: ${sum.stage}); ${sum.overdue} overdue; quiet ${sum.quiet_days} days`;
  const a = await analyzePulse({ student: s, pulse: row, progress, history, coach: coachFor(s) });
  Object.assign(row, { flag: a.flag, flag_reason: a.reason, ai_summary: a.summary, ai_reply: a.reply });
  if (existing && existing.replied_at) Object.assign(row, { replied_at: existing.replied_at, replied_by: existing.replied_by });
  await db("pulses?on_conflict=student_id,week", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: row });
  await updateStudent(s.id, { last_activity_at: nowIso(), last_checkin_at: nowIso() });
  const said = `${row.win} ${row.challenge}`;
  if (soundsLikeExit(said)) await flagExit(s, "weekly check-in", row.challenge || row.win).catch(() => {});
  const to = teamEmails();
  if (to.length && (!existing || (a.flag === "respond" && existing.flag !== "respond"))) {
    await sendEmail({ to, ...templates.teamPulse(s.name || s.email, row, `${siteUrl()}/admin#checkins`, coachFor(s)) }).catch(() => {});
  }
  return json({ ok: true, updated: !!existing, coach: coachFor(s) });
}
