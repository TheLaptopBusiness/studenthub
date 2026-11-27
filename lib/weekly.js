// The two weekly touches: Monday kickoff (email + text) and the Friday check-in form (email + text).
import { db, enc, siteUrl } from "./supa.js";
import { templates } from "./email.js";
import { notify } from "./notify.js";
import { summarize } from "./checklist.js";
import { weekKey, pulseToken } from "./pulse.js";
import { FRIDAY_EMAIL, FRIDAY_SMS, MONDAY_EMAIL, MONDAY_CLOSE, MONDAY_SMS, MONDAY_SMS_NOFOCUS, pick, fill } from "./variants.js";

const first = n => String(n || "").trim().split(/\s+/)[0] || "there";

export async function checkinLink(student, week = weekKey()) {
  return `${siteUrl()}/checkin.html?t=${await pulseToken(student.id, week)}`;
}

export async function sendCheckin(student) {
  const link = await checkinLink(student);
  const r = await notify(student, {
    event: "weekly_checkin",
    email: templates.checkinInvite(student.name, link, pick(FRIDAY_EMAIL, student.id)),
    text: fill(pick(FRIDAY_SMS, student.id + "s"), { first: first(student.name), link })
  });
  return r.email || r.sms;
}

export async function sendMonday(student, items) {
  if (!items) items = await db(`checklist_items?student_id=eq.${enc(student.id)}&select=*&limit=200`);
  const sum = summarize(student, items);
  const focus = sum.items.filter(x => !x.done && x.by === "student" && !x.waiting_on).slice(0, 2).map(x => x.title);
  const r = await notify(student, {
    event: "monday_kickoff",
    email: templates.mondayKickoff(student.name, focus, sum.percent, student.weekly_unit_target, pick(MONDAY_EMAIL, student.id), pick(MONDAY_CLOSE, student.id + "c")),
    text: fill(pick(focus.length ? MONDAY_SMS : MONDAY_SMS_NOFOCUS, student.id + "s"), { first: first(student.name), focus: focus.map(f => `"${f}"`).join(" and ") })
  });
  return r.email || r.sms;
}
