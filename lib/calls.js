// Coaching call reminders, sent by a coach from the coach dashboard (no automatic schedule).
// The join link changes each week and lives in the Skool community, so reminders point there.
import { db } from "./supa.js";
import { templates } from "./email.js";
import { notify } from "./notify.js";

const first = n => String(n || "").trim().split(/\s+/)[0] || "there";
export const CALL_WHEN = {
  tomorrow: { label: "Tomorrow at 6pm MT", email: "tomorrow (Saturday) at 6pm MT", sms: "is tomorrow (Saturday) at 6pm MT" },
  today:    { label: "Today at 6pm MT",    email: "today at 6pm MT",               sms: "is today at 6pm MT" },
  hour:     { label: "Starts in 1 hour",   email: "starting in 1 hour (6pm MT)",   sms: "starts in 1 hour (6pm MT)" },
  now:      { label: "Starting now",       email: "starting now",                  sms: "is starting now" }
};

/** Sends the reminder to every enrolled student (skips paused access and paused reminders). Returns how many. */
export async function sendCallReminder(when) {
  const w = CALL_WHEN[when];
  if (!w) throw new Error("Pick when the call is.");
  const students = await db("students?status=in.(invited,active)&reminders_paused=is.false&select=*&limit=5000");
  let sent = 0;
  for (const s of students) {
    const r = await notify(s, {
      event: "call_reminder",
      email: templates.callReminder(s.name, w.email),
      text: `${first(s.name)}, our group coaching call ${w.sms}. Check the Skool community for the link.`,
      data: { call_when: when }
    });
    if (r.email || r.sms) sent++;
  }
  return { sent, total: students.length };
}
