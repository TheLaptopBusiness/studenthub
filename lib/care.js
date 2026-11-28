// Student care: the 45-day first sale, the health score, the 24-hour reply promise,
// exit-risk detection, red alerts to the success coach, and the team activity log.
// Env (all optional):
//   ALERT_EMAILS        who gets red alerts and exit-risk alerts (default topfigurecs@gmail.com)
//   FIRST_SALE_DAYS     days from enrollment to the first sale (default 45)
//   REPLY_HOURS         the reply promise, in Monday–Friday hours (default 24)
//   TIMEZONE            the team's time zone, used for Monday–Friday (default America/Los_Angeles)
import { db, enc, nowIso, updateStudent, siteUrl } from "./supa.js";
import { sendEmail } from "./email.js";

const DAY = 864e5, HOUR = 36e5;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const first = name => String(name || "").trim().split(/\s+/)[0] || "there";

export const alertEmails = () => String(process.env.ALERT_EMAILS || "topfigurecs@gmail.com").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
export const firstSaleDays = () => parseInt(process.env.FIRST_SALE_DAYS || "45", 10) || 45;
export const replyHours = () => parseInt(process.env.REPLY_HOURS || "24", 10) || 24;
const tz = () => process.env.TIMEZONE || "America/Los_Angeles";

/* ---------- Monday–Friday hours ---------- */
const wdFmt = {};
function isWeekend(t) {
  const z = tz();
  wdFmt[z] = wdFmt[z] || new Intl.DateTimeFormat("en-US", { timeZone: z, weekday: "short" });
  const d = wdFmt[z].format(new Date(t));
  return d === "Sat" || d === "Sun";
}
/** Hours between `since` and now, counting Monday to Friday only (in the team's time zone). */
export function weekdayHoursSince(since, now = Date.now()) {
  let t = Date.parse(since);
  if (!t || t >= now) return 0;
  let hours = 0;
  // step hour by hour (capped at 60 days, which is far past any alert)
  for (let i = 0; t < now && i < 1440; i++) {
    const step = Math.min(HOUR, now - t);
    if (!isWeekend(t)) hours += step / HOUR;
    t += step;
  }
  return hours;
}

/* ---------- the first sale (45 days) ---------- */
export function firstSale(student, now = Date.now()) {
  const days = firstSaleDays();
  const start = Date.parse(student.created_at || nowIso());
  const due = start + days * DAY;
  const day = Math.max(1, Math.floor((now - start) / DAY) + 1);
  if (student.first_sale_at) return { done: true, at: student.first_sale_at, days, day: Math.max(1, Math.floor((Date.parse(student.first_sale_at) - start) / DAY) + 1), due: new Date(due).toISOString() };
  return { done: false, days, day, days_left: Math.ceil((due - now) / DAY), overdue: now > due, due: new Date(due).toISOString() };
}

/* ---------- exit risk (never shown to students) ---------- */
const EXIT_RE = /\b(refund|money ?back|charge ?back|dispute (the|my) (charge|payment)|cancel(l?ing|l?ed|lation)?( my| the)? (membership|program|subscription|enrol+ment|payment)|quit(ting)?|giv(e|ing) up|leave the program|drop(ping)? out|want out|not worth (it|the money)|waste of (my )?money|scam|rip ?off|lawyer|bbb)\b/i;
export const soundsLikeExit = text => EXIT_RE.test(String(text || ""));

/** Flags a student as an exit risk (once, until a coach marks it resolved) and alerts the success coach. */
export async function flagExit(student, source, text) {
  if (!student || student.exit_risk_at) return false;
  const reason = String(text || "").replace(/\s+/g, " ").trim().slice(0, 300);
  await updateStudent(student.id, { exit_risk_at: nowIso(), exit_risk_reason: reason, exit_risk_source: source });
  student.exit_risk_at = nowIso();
  const name = student.name || student.email;
  await sendAlert(`Exit risk: ${name} (call them today)`, "A student may be about to leave", [
    `<strong>${esc(name)}</strong> said something that sounds like they may want to leave the program (from their ${esc(source)}):`,
    `<em>"${esc(reason)}"</em>`,
    `<strong>What to do:</strong> call ${esc(first(student.name))} today and offer a free one-on-one call to get them unstuck. Listen first, find the real blocker, and agree one small next step together.`,
    `Suggested message: <em>"Hey ${esc(first(student.name))}, I read your note and I want to help personally. Can we jump on a quick one-on-one call this week? I'll make time for you."</em>`,
    `This alert is only for the team. The student never sees it.`
  ], `${siteUrl()}/admin#student=${student.id}`);
  await logAction("System", "exit_risk", student, `Flagged from their ${source}: "${reason.slice(0, 120)}"`);
  return true;
}

/* ---------- alerts to the success coach ---------- */
export async function sendAlert(subject, title, lines, link) {
  const to = alertEmails();
  if (!to.length) return false;
  const P = h => `<p style="margin:0 0 16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#17162b">${h}</p>`;
  const html = `<div style="background:#fbf8f4;padding:32px 16px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;padding:32px 30px">
<p style="margin:0 0 14px"><span style="display:inline-block;background:#fbe5df;color:#b3402e;border-radius:999px;padding:5px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:700">TEAM ALERT</span></p>
<h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:26px;line-height:1.2;color:#17162b">${esc(title)}</h1>
${lines.map(P).join("")}
${link ? `<p style="margin:22px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#17162b;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px">Open in the coach dashboard</a></p>` : ""}
</div></div>`;
  return sendEmail({ to, subject, html, event: "team_alert" }).catch(() => false);
}

/* ---------- team activity log ---------- */
export async function logAction(actor, action, student, detail = "") {
  try {
    await db("team_actions", { method: "POST", prefer: "return=minimal", body: {
      actor: String(actor || "").slice(0, 80), action, student_id: student ? student.id : null,
      student_name: student ? String(student.name || student.email || "").slice(0, 120) : "", detail: String(detail).slice(0, 500)
    } });
  } catch (e) { console.error("Activity log failed", e && e.message); }
}

/* ---------- health score (0–100) ---------- */
/** sum = summarize(); sales = this student's sales; pulse = latest check-in; waiting = hours a reply has been waiting. */
export function healthOf({ student: s, sum, sales = [], pulse = null, waiting = 0, now = Date.now() }) {
  let score = 100;
  const why = [];
  const hit = (n, text) => { score -= n; why.push(text); };
  const enrolledDays = (now - Date.parse(s.created_at || nowIso())) / DAY;
  if (s.status === "paused") return { score: null, level: "paused", reasons: ["Access paused"] };

  if (s.exit_risk_at) hit(45, "Sounded like they may want to leave");
  if (!s.last_active_at) {
    if (enrolledDays >= 5) hit(40, `Never signed in (${Math.floor(enrolledDays)} days)`);
    else if (enrolledDays >= 2) hit(20, "Hasn't signed in yet");
  } else if (sum.quiet_days >= 14) hit(40, `Quiet for ${sum.quiet_days} days`);
  else if (sum.quiet_days >= 10) hit(28, `Quiet for ${sum.quiet_days} days`);
  else if (sum.quiet_days >= 7) hit(18, `Quiet for ${sum.quiet_days} days`);
  else if (sum.quiet_days >= 5) hit(8, `Quiet for ${sum.quiet_days} days`);

  const late = sum.items.filter(i => i.overdue && i.by === "student");
  const worst = late.reduce((m, i) => Math.max(m, i.overdue_days), 0);
  if (worst >= 7) hit(20, `${late.length} step${late.length === 1 ? "" : "s"} overdue, up to ${worst} days`);
  else if (worst >= 3) hit(10, `${late.length} step${late.length === 1 ? "" : "s"} overdue`);

  if (pulse) {
    if (pulse.mood === "Tough") hit(18, "Called their week Tough");
    else if (pulse.mood === "Slow") hit(8, "Called their week Slow");
    if (pulse.need_help && !pulse.replied_at) hit(12, "Asked for help on their check-in");
  }
  if (waiting >= replyHours()) hit(12, `Waiting on our reply for ${Math.round(waiting)} weekday hours`);
  if (sum.overdue_team) hit(8, "Our logo or website is late");

  const fs = firstSale(s, now);
  if (!fs.done) {
    if (fs.overdue) hit(25, `No sale yet, day ${fs.day} of ${fs.days}`);
    else if (fs.days_left <= 10) hit(8, `No sale yet, ${fs.days_left} days left to day ${fs.days}`);
  }
  const recentSale = sales.some(x => now - Date.parse(x.sold_on + "T12:00:00Z") < 14 * DAY);
  if (recentSale) score += 10;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level = score < 50 ? "red" : score < 75 ? "amber" : "green";
  return { score, level, reasons: why.length ? why : ["On track"] };
}

/** Latest pulse and sales for many students at once (for the dashboard list and the hourly job). */
export async function careData() {
  const [sales, pulses] = await Promise.all([
    db("sales?select=student_id,sale_price,buy_price,sold_on,created_at&order=sold_on.desc&limit=20000").catch(() => []),
    db(`pulses?select=student_id,mood,need_help,replied_at,flag,week&order=week.desc&limit=5000`).catch(() => [])
  ]);
  const salesBy = {}, pulseBy = {};
  for (const x of sales) (salesBy[x.student_id] = salesBy[x.student_id] || []).push(x);
  for (const p of pulses) if (!pulseBy[p.student_id]) pulseBy[p.student_id] = p;
  return { salesBy, pulseBy };
}

/** Totals for a list of sales. */
export function totals(rows) {
  const t = { count: rows.length, revenue: 0, profit: 0 };
  for (const r of rows) { t.revenue += Number(r.sale_price) || 0; t.profit += (Number(r.sale_price) || 0) - (Number(r.buy_price) || 0); }
  t.revenue = Math.round(t.revenue * 100) / 100; t.profit = Math.round(t.profit * 100) / 100;
  const month = new Date().toISOString().slice(0, 7);
  const m = rows.filter(r => String(r.sold_on).startsWith(month));
  t.month_count = m.length;
  t.month_profit = Math.round(m.reduce((a, r) => a + (Number(r.sale_price) || 0) - (Number(r.buy_price) || 0), 0) * 100) / 100;
  return t;
}
