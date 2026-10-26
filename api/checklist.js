// /api/checklist — the student dashboard.
// GET                    → the signed-in student's dashboard
// GET ?student=<id>      → (team) any student's dashboard
// POST {action, ...}     → tick · comment · profile · read_messages            (student or team)
//                          message · due · owner · pause                        (team only)
// Team requests add student: "<id>".
import { getUser, isAdmin, getStudent, studentFor, updateStudent, db, enc, nowIso, configured, siteUrl } from "../lib/supa.js";
import { TEMPLATE, summarize } from "../lib/checklist.js";
import { loadDashboard, ensureChecklist, publicProfile, postMessage, afterTick, applyInput, saveSurvey } from "../lib/dashboard.js";
import { teamName, teamNames, coachNames, coachFor, shownToStudent } from "../lib/team.js";
import { templates } from "../lib/email.js";
import { notify } from "../lib/notify.js";
import { json, readJson } from "../lib/http.js";

export const config = { runtime: "edge" };
const isId = s => /^[0-9a-f-]{36}$/i.test(String(s || ""));
const first = name => String(name || "").trim().split(/\s+/)[0] || "there";

async function whoAndWhich(req, studentId) {
  const user = await getUser(req);
  if (!user) return { error: json({ error: "signed_out" }, 401) };
  const team = isAdmin(user.email);
  let student;
  if (studentId) {
    if (!team) return { error: json({ error: "forbidden" }, 403) };
    if (!isId(studentId)) return { error: json({ error: "bad_request" }, 400) };
    student = await getStudent(studentId);
    if (!student) return { error: json({ error: "not_found" }, 404) };
  } else {
    student = await studentFor(user);
    if (!student) return { error: json({ error: team ? "no_student" : "not_enrolled" }, team ? 404 : 403) };
    if (student.status === "paused") return { error: json({ error: "paused" }, 403) };
  }
  return { user, team, student, actor: team && studentId ? teamName(user.email) : (student.name || "Student"), asTeam: team && Boolean(studentId) };
}

async function respond(student, asTeam) {
  const fresh = await getStudent(student.id);
  const d = await loadDashboard(fresh, { forStudent: !asTeam });
  return json({ profile: publicProfile(fresh), ...d.summary, messages: d.messages, call_link: process.env.CALL_LINK || "",
    coach: coachFor(fresh), coaches: coachNames(), team: asTeam ? teamNames() : undefined });
}

export default async function handler(req) {
  if (!configured()) return json({ error: "server_not_configured" }, 500);

  if (req.method === "GET") {
    const w = await whoAndWhich(req, new URL(req.url).searchParams.get("student"));
    if (w.error) return w.error;
    if (!w.asTeam) {
      const last = w.student.last_active_at ? Date.parse(w.student.last_active_at) : 0;
      if (Date.now() - last > 30 * 60 * 1000) await updateStudent(w.student.id, { last_active_at: nowIso(), ...(w.student.status === "invited" ? { status: "active" } : {}) });
    }
    return respond(w.student, w.asTeam);
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body;
  try { body = await readJson(req, 20000); } catch (e) { return json({ error: e.message }, e.status || 400); }
  const w = await whoAndWhich(req, body.student);
  if (w.error) return w.error;
  const { student, asTeam, actor } = w;
  const touch = asTeam ? { last_contact_at: nowIso() } : { last_activity_at: nowIso(), last_active_at: nowIso() };

  try {
    switch (body.action) {
      case "tick": {
        const t = TEMPLATE.find(x => x.key === body.key);
        if (!t) return json({ error: "bad_request" }, 400);
        if (t.by === "team" && !asTeam) return json({ error: "Our team ticks this one when it's delivered." }, 403);
        if (!asTeam && t.input && t.input.type === "survey" && body.done && !student.brand_submitted_at) return json({ error: "Fill out the brand survey first. Sending it ticks this step." }, 400);
        const items = await ensureChecklist(student);
        const item = items.find(i => i.key === t.key);
        const before = summarize(student, items);
        const done = Boolean(body.done);
        let value = item.value, profile = {};
        if (done) ({ value, profile } = applyInput(t, body.value, student));
        await db(`checklist_items?id=eq.${enc(item.id)}`, { method: "PATCH", prefer: "return=minimal", body: {
          done, done_at: done ? nowIso() : null, done_by_name: done ? actor : "", value: done ? value : item.value
        } });
        const updatedStudent = { ...student, ...profile, ...touch };
        await updateStudent(student.id, { ...profile, ...touch });
        const after = summarize(updatedStudent, items.map(i => i.id === item.id ? { ...i, done, done_at: done ? nowIso() : null, value } : i));
        await afterTick(updatedStudent, { ...item, done, value }, before, after, asTeam);
        return respond(student, asTeam);
      }
      case "comment": {
        const t = TEMPLATE.find(x => x.key === body.key);
        const text = String(body.body || "").trim().slice(0, 2000);
        if (!t || !text) return json({ error: "Write a comment first." }, 400);
        const items = await ensureChecklist(student);
        const item = items.find(i => i.key === t.key);
        await db("item_comments", { method: "POST", prefer: "return=minimal", body: { student_id: student.id, item_key: t.key, author: actor, from_team: asTeam, body: text } });
        await db(`checklist_items?id=eq.${enc(item.id)}`, { method: "PATCH", prefer: "return=minimal", body: {
          awaiting_reply: !asTeam, comment_count: (item.comment_count || 0) + 1
        } });
        await updateStudent(student.id, touch);
        if (asTeam) {
          await notify(student, {
            event: "comment_reply",
            email: templates.commentReply(student.name, shownToStudent(actor), t.title, text),
            text: `${first(student.name)}, ${shownToStudent(actor)} replied about "${t.title}" in your Hub: ${siteUrl()}/#dashboard`
          });
        }
        return respond(student, asTeam);
      }
      case "brand_survey": {
        await saveSurvey(student, body.answers || {}, actor);
        return respond(student, asTeam);
      }
      case "profile": {
        const f = {};
        for (const k of ["name", "phone", "location", "business_name"]) if (typeof body[k] === "string") f[k] = body[k].trim().slice(0, 120);
        if (asTeam) for (const k of ["logo_url", "website_url", "domain"]) if (typeof body[k] === "string") f[k] = body[k].trim().slice(0, 300);
        if (f.name === "") delete f.name;
        await updateStudent(student.id, { ...f, ...touch });
        return respond(student, asTeam);
      }
      case "read_messages": {
        if (asTeam) return respond(student, asTeam);
        await db(`messages?student_id=eq.${enc(student.id)}&read_at=is.null`, { method: "PATCH", prefer: "return=minimal", body: { read_at: nowIso() } });
        return respond(student, asTeam);
      }
      case "message": {
        if (!asTeam) return json({ error: "forbidden" }, 403);
        const text = String(body.body || "").trim();
        if (!text) return json({ error: "Write a message first." }, 400);
        await postMessage(student, actor, text);
        return respond(student, asTeam);
      }
      case "due": {
        if (!asTeam) return json({ error: "forbidden" }, 403);
        const t = TEMPLATE.find(x => x.key === body.key);
        if (!t) return json({ error: "bad_request" }, 400);
        const d = body.date ? new Date(String(body.date) + "T23:59:00Z") : null;
        if (body.date && isNaN(d)) return json({ error: "Pick a valid date." }, 400);
        const items = await ensureChecklist(student);
        const item = items.find(i => i.key === t.key);
        await db(`checklist_items?id=eq.${enc(item.id)}`, { method: "PATCH", prefer: "return=minimal", body: { due_override: d ? d.toISOString() : null, reminded_at: null } });
        if (d && t.by === "team" && body.tell_student) {
          const what = t.key === "logo" ? "logo" : "website";
          const when = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
          await postMessage(student, actor, `Quick heads-up: your ${what} is taking a little longer than promised. New date: ${when}. Thanks for your patience, and it'll be worth it.`);
        }
        return respond(student, asTeam);
      }
      case "owner": {
        if (!asTeam) return json({ error: "forbidden" }, 403);
        if (!coachNames().includes(body.owner)) return json({ error: `Owner must be one of: ${coachNames().join(", ")}.` }, 400);
        await updateStudent(student.id, { owner: body.owner });
        return respond(student, asTeam);
      }
      case "pause": {
        if (!asTeam) return json({ error: "forbidden" }, 403);
        await updateStudent(student.id, { reminders_paused: Boolean(body.paused) });
        return respond(student, asTeam);
      }
      default:
        return json({ error: "bad_request" }, 400);
    }
  } catch (e) {
    const msg = e && e.message ? e.message : "Something went wrong.";
    if (/^Database|^Couldn't/.test(msg)) { console.error(msg); return json({ error: "Something went wrong. Try again." }, 500); }
    return json({ error: msg }, 400);
  }
}
