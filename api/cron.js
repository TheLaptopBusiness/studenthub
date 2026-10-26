// GET /api/cron — runs every hour (see vercel.json) and decides what's due:
//  • Daily at DAILY_HOUR (default 9) in TIMEZONE: overdue items, the quiet-student ladder, sign-in reminders,
//    Monday focus, Sunday check-in, and the team's daily summary email.
//  • Coaching call reminders: email 24 hours before, SMS 1 hour before (CALL_DAY / CALL_HOUR in CALL_TZ;
//    defaults Saturday 18:00 America/Denver = 6pm MT). CALL_LINK = the call's join link.
// Add ?run=daily to run the daily part now (for testing).
// Env: CRON_SECRET (Vercel sends it automatically), TIMEZONE (default America/Los_Angeles)
import { db, nowIso, updateStudent, configured, siteUrl } from "../lib/supa.js";
import { sendEmail, templates } from "../lib/email.js";
import { summarize, TEMPLATE } from "../lib/checklist.js";
import { sms } from "../lib/notify.js";
import { teamEmails, escalationName, defaultOwner, coachFor } from "../lib/team.js";
import { json } from "../lib/http.js";

export const config = { runtime: "edge" };

const DAY = 864e5;
const daysSince = iso => (iso ? (Date.now() - Date.parse(iso)) / DAY : Infinity);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const first = name => String(name || "").trim().split(/\s+/)[0] || "there";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function partsIn(tz, date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", hour: "numeric", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date).map(x => [x.type, x.value]));
  return { weekday: p.weekday, hour: Number(p.hour), date: `${p.year}-${p.month}-${p.day}` };
}
// kept for older imports
export function weekdayIn(tz, date = new Date()) { return partsIn(tz, date).weekday; }

/** Automatic SMS limit: 1 a day and 4 a week per student (call reminders are exempt). */
function smsAllowed(rem, today) {
  const log = (rem.sms_log || []).filter(d => daysSince(d + "T12:00:00Z") < 7);
  return !log.includes(today) && log.length < 4;
}
function logSms(rem, today) { rem.sms_log = [...(rem.sms_log || []).filter(d => daysSince(d + "T12:00:00Z") < 7), today]; }

export default async function handler(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "forbidden" }, 403);
  if (!configured()) return json({ error: "server_not_configured" }, 500);

  const url = new URL(req.url);
  const force = url.searchParams.get("run") || "";
  const tz = process.env.TIMEZONE || "America/Los_Angeles";
  const local = partsIn(tz);
  const callTz = process.env.CALL_TZ || "America/Denver";
  const callDay = process.env.CALL_DAY || "Sat";
  const callHour = parseInt(process.env.CALL_HOUR || "18", 10);
  const callLocal = partsIn(callTz);
  const dayBefore = DAYS[(DAYS.indexOf(callDay) + 6) % 7];

  const doDaily = force === "daily" || local.hour === parseInt(process.env.DAILY_HOUR || "9", 10);
  const doCall24 = force === "call24" || (callLocal.weekday === dayBefore && callLocal.hour === callHour);
  const doCall1 = force === "call1" || (callLocal.weekday === callDay && callLocal.hour === callHour - 1);
  if (!doDaily && !doCall24 && !doCall1) return json({ ok: true, skipped: true });

  const students = await db("students?status=in.(invited,active)&select=*&limit=5000");
  const allItems = await db("checklist_items?select=*&limit=50000");
  const itemsBy = {};
  for (const i of allItems) (itemsBy[i.student_id] = itemsBy[i.student_id] || []).push(i);

  const sent = { call24: 0, call1: 0, overdue: 0, quiet_sms: 0, quiet_email: 0, signin: 0, focus: 0, checkin: 0 };
  const callLink = process.env.CALL_LINK || "";
  const hourLabel = callHour > 12 ? `${callHour - 12}pm` : callHour === 12 ? "12pm" : `${callHour}am`;
  const dg = { teamLate: [], replies: [], late3: [], late7: [], quiet7: [], quiet10: [], risk: [], notSignedIn: [], wins: [] };
  const today = local.date;

  for (const s of students) {
    const rem = { ...(s.reminders || {}) };
    let changed = false;
    const sum = summarize(s, itemsBy[s.id] || []);
    const who = s.name || s.email;
    const paused = !!s.reminders_paused;

    // ----- coaching call reminders -----
    if (doCall24 && !paused && rem.call24 !== callLocal.date) {
      if (await sendEmail({ to: s.email, ...templates.callReminder(s.name, `tomorrow (${callDay === "Sat" ? "Saturday" : callDay}) at ${hourLabel} MT`, callLink) })) sent.call24++;
      rem.call24 = callLocal.date; changed = true;
    }
    if (doCall1 && !paused && rem.call1 !== callLocal.date) {
      await sms("call_reminder", s, `${first(s.name)}, our coaching call starts in 1 hour (${hourLabel} MT).${callLink ? " Join: " + callLink : " Join from Skool."}`);
      sent.call1++; rem.call1 = callLocal.date; changed = true;
    }

    if (doDaily) {
      // ----- team-facing lists for the daily summary (always, even if paused) -----
      for (const i of sum.items.filter(x => x.overdue && x.by === "team")) dg.teamLate.push(`${who}: ${i.title} (${i.overdue_days} day${i.overdue_days === 1 ? "" : "s"} late)`);
      if (sum.awaiting_reply) dg.replies.push(`${who}: ${sum.awaiting_reply} comment${sum.awaiting_reply === 1 ? "" : "s"} waiting`);
      const late = sum.items.filter(x => x.overdue && x.by === "student");
      const worst = late.reduce((m, x) => Math.max(m, x.overdue_days), 0);
      if (worst >= 7) dg.late7.push(`${who}: ${late.length} overdue, up to ${worst} days`);
      else if (worst >= 3) dg.late3.push(`${who}: ${late.length} overdue (${late.map(x => x.title).slice(0, 2).join("; ")})`);
      for (const [n, at] of Object.entries(s.sections_done || {})) if (daysSince(at) < 1) dg.wins.push(`${who}: finished section ${n}`);

      if (!s.last_active_at) {
        const age = daysSince(s.created_at);
        if (age >= 5) dg.notSignedIn.push(`${who} (enrolled ${Math.floor(age)} days ago)`);
      } else if (sum.quiet_days >= 14) dg.risk.push(`${who}: quiet ${sum.quiet_days} days. ${escalationName()} to call.`);
      else if (sum.quiet_days >= 10) dg.quiet10.push(`${who}: quiet ${sum.quiet_days} days. Call or send a voice note.`);
      else if (sum.quiet_days >= 7) dg.quiet7.push(`${who}: quiet ${sum.quiet_days} days. Write them a personal message.`);

      if (!paused) {
        // ----- not signed in yet -----
        if (!s.last_active_at) {
          const age = daysSince(s.created_at), count = rem.onboarding_count || 0;
          if (age >= 2 && count < 3 && daysSince(rem.onboarding_at) >= 3) {
            await sendEmail({ to: s.email, ...templates.onboardingReminder(s.name) });
            if (smsAllowed(rem, today)) { await sms("not_signed_in", s, `${first(s.name)}, your Laptop Business Mastery dashboard is ready and waiting. Check your email for the sign-in link, or go to ${siteUrl()}`); logSms(rem, today); }
            rem.onboarding_count = count + 1; rem.onboarding_at = nowIso(); changed = true; sent.signin++;
          }
        } else {
          // ----- overdue items (once per item) -----
          const fresh = late.filter(x => !(itemsBy[s.id] || []).find(r => r.key === x.key && r.reminded_at));
          if (fresh.length) {
            await sendEmail({ to: s.email, ...templates.overdue(s.name, fresh.map(x => x.title)) });
            if (smsAllowed(rem, today)) {
              await sms("overdue", s, fresh.length === 1
                ? `${first(s.name)}, "${fresh[0].title}" was due ${new Date(fresh[0].due).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Can you get it done in the next couple of days? Reply if you're stuck.`
                : `${first(s.name)}, ${fresh.length} checklist items are past due, starting with "${fresh[0].title}". Can you catch up this week? Reply if you're stuck.`);
              logSms(rem, today);
            }
            const keys = fresh.map(x => x.key);
            for (const r of (itemsBy[s.id] || []).filter(r => keys.includes(r.key))) {
              await db(`checklist_items?id=eq.${r.id}`, { method: "PATCH", prefer: "return=minimal", body: { reminded_at: nowIso() } });
            }
            sent.overdue++;
          }

          // ----- quiet ladder: day 3 SMS, day 5 email (once per quiet streak) -----
          const since = [s.last_active_at, s.last_activity_at].filter(Boolean).sort().pop();
          if (!rem.ladder || rem.ladder.since !== since) { rem.ladder = { since, level: 0 }; changed = true; }
          const next = sum.next;
          if (sum.quiet_days >= 3 && rem.ladder.level < 1 && smsAllowed(rem, today)) {
            await sms("quiet_3", s, `Hey ${first(s.name)}, haven't seen you in the Hub for a few days. Your next step is "${next ? next.title : "your next checklist item"}". Need a hand? Just reply here.`);
            logSms(rem, today); rem.ladder.level = 1; changed = true; sent.quiet_sms++;
          }
          if (sum.quiet_days >= 5 && rem.ladder.level < 2) {
            const t = next ? TEMPLATE.find(x => x.key === next.key) : null;
            await sendEmail({ to: s.email, ...templates.quiet(s.name, next && next.title, t && t.help) });
            rem.ladder.level = 2; changed = true; sent.quiet_email++;
          }

          // ----- Monday focus · Sunday check-in -----
          if (local.weekday === "Mon" && rem.focus !== today && sum.next && smsAllowed(rem, today)) {
            const open = sum.items.filter(x => !x.done && x.by === "student" && !x.waiting_on).slice(0, 2).map(x => `"${x.title}"`);
            await sms("weekly_focus", s, `${first(s.name)}, ${first(coachFor(s))} here. This week's focus: ${open.join(" and ")}. That's it. Knock it out and tick it in your Hub: ${siteUrl()}/#dashboard`);
            logSms(rem, today); rem.focus = today; changed = true; sent.focus++;
          }
          if (local.weekday === "Sun" && daysSince(s.last_checkin_at) > 5 && rem.checkin !== today) {
            const open = sum.total - sum.done;
            await sendEmail({ to: s.email, ...templates.checkinReminder(s.name, open ? `${open} item${open === 1 ? "" : "s"}` : "") });
            if (smsAllowed(rem, today)) { await sms("checkin", s, `${first(s.name)}, it's check-in time! 3 minutes: what got done this week, and where you're stuck. ${siteUrl()}/#checkin`); logSms(rem, today); }
            rem.checkin = today; changed = true; sent.checkin++;
          }
        }
      }
    }
    if (changed) await updateStudent(s.id, { reminders: rem });
  }

  let digest = false;
  if (doDaily) {
    const since = new Date(Date.now() - DAY).toISOString();
    const recent = await db(`checkins?created_at=gte.${encodeURIComponent(since)}&select=student_id,report&limit=500`);
    const names = Object.fromEntries(students.map(s => [s.id, s.name || s.email]));
    const flagged = recent.filter(c => /flag for coaching call/i.test(c.report)).map(c => names[c.student_id] || "A student");
    const wrong = await db("coach_feedback?status=eq.open&rating=eq.down&select=id&limit=500");
    const block = (title, arr) => arr.length ? `<strong>${title}</strong><br>${arr.map(esc).join("<br>")}` : null;
    const lines = [
      block("⚠️ Our logo or website is late:", dg.teamLate),
      block(`🚨 At risk (14+ days quiet), for ${escalationName()}:`, dg.risk),
      block("Comments waiting for a reply:", dg.replies),
      block(`Quiet 10+ days, call them (${defaultOwner()}):`, dg.quiet10),
      block(`Quiet 7+ days, write a personal message (${defaultOwner()}):`, dg.quiet7),
      block(`7+ days late on checklist items, for ${escalationName()}:`, dg.late7),
      block(`3+ days late on checklist items (${defaultOwner()}):`, dg.late3),
      block("Haven't signed in yet:", dg.notSignedIn),
      flagged.length ? `<strong>Check-ins flagged for a coaching call:</strong> ${esc(flagged.join(", "))}` : null,
      wrong.length ? `<strong>Coach answers marked wrong:</strong> ${wrong.length}. Open "Questions to review".` : null,
      block("🎉 Wins to celebrate (sections finished in the last day):", dg.wins)
    ].filter(Boolean);
    const to = teamEmails();
    if (lines.length && to.length) digest = await sendEmail({ to, ...templates.coachDigest(lines) });
  }

  return json({ ok: true, ran: { daily: doDaily, call24: doCall24, call1: doCall1 }, students: students.length, sent, digest,
    counts: Object.fromEntries(Object.entries(dg).map(([k, v]) => [k, v.length])) });
}
