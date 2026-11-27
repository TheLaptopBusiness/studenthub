// Automatic emails, sent through Resend (resend.com).
// Env: RESEND_API_KEY, EMAIL_FROM (e.g. "Laptop Business Mastery <coach@yourdomain.com>")
import { siteUrl } from "./supa.js";
import { signoff } from "./team.js";
import { ghlApi, contactFor, upsertContact, sendMessage } from "./ghl.js";
import { logOut } from "./outbox.js";

const PROGRAM = () => process.env.PROGRAM_NAME || "Laptop Business Mastery";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const first = name => String(name || "").trim().split(/\s+/)[0] || "there";

const firstOf = name => String(name || "").trim().split(/\s+/)[0] || "";
const lastOf = name => String(name || "").trim().split(/\s+/).slice(1).join(" ");

/** Sends an email. Order of preference: GoHighLevel API (GHL_API_KEY) → Resend (RESEND_API_KEY)
    → GoHighLevel Inbound Webhook workflow (GHL_WEBHOOK_URL). Emails to a student are logged on their page. */
export const replyTo = () => process.env.REPLY_TO || "admin@thelaptopbusiness.com";
export async function sendEmail({ to, subject, html, text, student, event }) {
  const list = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!list.length) return false;
  const plainText = text || String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const isStu = addr => student && student.email && student.email.toLowerCase() === String(addr).toLowerCase();
  let ok = true;
  if (ghlApi()) {
    for (const addr of list) {
      let sent = false;
      try {
        const contactId = isStu(addr) ? await contactFor(student) : await upsertContact({ email: addr });
        sent = await sendMessage({ contactId, type: "Email", subject, html, message: plainText });
      } catch (e) { console.error("GoHighLevel email failed", e && e.message); }
      if (isStu(addr)) await logOut(student, { channel: "email", event: event || "email", subject, body: plainText, ok: sent });
      ok = ok && sent;
    }
    return ok;
  }
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    ok = await sendResend({ to: list, subject, html, text });
    if (student && list.some(isStu)) await logOut(student, { channel: "email", event: event || "email", subject, body: plainText, ok });
    return ok;
  }
  const url = process.env.GHL_WEBHOOK_URL;
  if (!url) { console.warn("Email not sent (set GHL_API_KEY, RESEND_API_KEY or GHL_WEBHOOK_URL):", subject, list); return false; }
  for (const addr of list) {
    let sent = false;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel: "email", event: event || "email", email: addr, reply_to: replyTo(),
          ...(isStu(addr) ? { phone: student.phone || "", first_name: firstOf(student.name), last_name: lastOf(student.name), full_name: student.name || "" } : {}),
          subject, html, text: plainText
        })
      });
      sent = r.ok; if (!r.ok) console.error("GoHighLevel email webhook failed", r.status);
    } catch (e) { console.error("GoHighLevel email webhook failed", e && e.message); }
    if (isStu(addr)) await logOut(student, { channel: "email", event: event || "email", subject, body: plainText, ok: sent });
    ok = ok && sent;
  }
  return ok;
}

async function sendResend({ to, subject, html, text }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html, text, reply_to: replyTo() })
  });
  if (!r.ok) {
    console.error("Email failed", r.status, (await r.text().catch(() => "")).slice(0, 300));
    return false;
  }
  return true;
}

// Branded email layout: minimal and premium. Paper background, generous white space, ink type,
// a serif headline with the hand-drawn underline, one coral button, the "L" mark. Email-safe: tables,
// inline styles, PNG images, Georgia as the serif (email clients rarely load web fonts).
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const P = h => h.startsWith("<") ? h : `<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:1.65;color:#17162b">${h}</p>`;
function layout(paragraphs, button, title) {
  const img = f => `${esc(siteUrl())}/img/${f}`;
  const head = title ? `<h1 style="margin:0 0 6px;font-family:${SERIF};font-weight:700;font-size:32px;line-height:1.15;letter-spacing:-0.5px;color:#17162b">${esc(title)}</h1>
<img src="${img("swoosh.png")}" width="150" height="14" alt="" style="display:block;margin:0 0 28px;border:0">` : "";
  const btn = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0 30px"><tr><td style="background:#f4a07d;border-radius:999px">
<a href="${esc(button.href)}" style="display:inline-block;padding:15px 30px;font-family:${SANS};font-size:16px;font-weight:700;color:#17162b;text-decoration:none;border-radius:999px">${esc(button.label)}</a></td></tr></table>`
    : "";
  const after = (button && button.after ? button.after : []).map(P).join("");
  return `<div style="margin:0;padding:0;background:#fbf8f4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf8f4"><tr><td align="center" style="padding:40px 16px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">
<tr><td style="padding:0 0 30px"><img src="${img("mark.png")}" width="40" height="40" alt="${esc(PROGRAM())}" style="display:block;border:0;border-radius:10px"></td></tr>
<tr><td style="background:#ffffff;border-radius:24px;padding:44px 40px 40px">
${head}${paragraphs.map(P).join("")}${btn}${after}
</td></tr>
<tr><td style="padding:26px 8px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:#9a96a3;text-align:center">
${esc(PROGRAM())}<br>You're receiving this because you're a member.</td></tr>
</table></td></tr></table></div>`;
}
const step = (n, html) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr>
<td style="width:30px;vertical-align:top"><div style="width:26px;height:26px;border-radius:50%;background:#fbf8f4;border:1px solid #ece4d9;text-align:center;line-height:26px;font-family:${SANS};font-size:13px;font-weight:700;color:#17162b">${n}</div></td>
<td style="padding-left:12px;font-family:${SANS};font-size:16px;line-height:1.6;color:#17162b">${html}</td></tr></table>`;
// Sign-off with Abdi's face: every email comes from Abdi Hassan.
const teamSign = () => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr>
<td style="vertical-align:middle"><img src="${esc(siteUrl())}/img/abdi-avatar.jpg" width="48" height="48" alt="Abdi Hassan" style="display:block;border-radius:50%;border:0"></td>
<td style="padding-left:14px;vertical-align:middle"><div style="font-family:${SERIF};font-style:italic;font-size:21px;color:#17162b">Abdi Hassan</div><div style="font-family:${SANS};font-size:13px;color:#76727f;margin-top:2px">Founder, ${esc(PROGRAM())}</div></td></tr></table>`;
const strip = h => h.replace(/<\/div>/g, "\n").replace(/<\/li>\s*/g, "").replace(/<li[^>]*>/g, "\n• ").replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
const plain = (paragraphs, button) =>
  paragraphs.map(strip).join("\n\n") + (button ? `\n\n${button.label}: ${button.href}` : "") + (button && button.after ? "\n\n" + button.after.map(strip).join("\n\n") : "");
function build(subject, paragraphs, button, title) {
  return { subject, html: layout(paragraphs, button, title), text: (title ? title + "\n\n" : "") + plain(paragraphs, button) };
}

export const templates = {
  welcome: (name, link) => build(`${first(name)}, you're officially a member of ${PROGRAM()}`, [
    `Hi ${esc(first(name))},`,
    `I'm genuinely excited to welcome you. As of today, you are <strong>officially a member of the Laptop Resale community</strong> at ${esc(PROGRAM())}.`,
    `Joining took courage. You've decided to build something of your own, and I don't take that lightly. The exact process that has made me millions in laptop resale is now yours to follow, step by step. And you won't be doing it alone: our whole team is in your corner, and so am I.`,
    `<p style="margin:30px 0 14px;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#76727f">Getting started</p>`,
    step(1, "Sign in to your personal dashboard with the button below."),
    step(2, "Fill out the <strong>brand survey</strong>, so we can start designing your logo and website."),
    step(3, "Work through your checklist, one step at a time, until your laptops are listed for sale.")
  ], { href: link, label: "Sign in to my dashboard", after: [
    `Welcome to the family. Let's get to work.`,
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 22px"><tr>
<td style="vertical-align:middle"><img src="${esc(siteUrl())}/img/abdi-avatar.jpg" width="56" height="56" alt="Abdi Hassan" style="display:block;border-radius:50%;border:0"></td>
<td style="padding-left:16px;vertical-align:middle"><div style="font-family:${SERIF};font-style:italic;font-size:23px;color:#17162b">Abdi Hassan</div><div style="font-family:${SANS};font-size:13px;color:#76727f;margin-top:2px">Founder, ${esc(PROGRAM())}</div></td></tr></table>`,
    `<p style="margin:26px 0 0;padding-top:20px;border-top:1px solid #f0eae2;font-family:${SANS};font-size:13px;line-height:1.55;color:#9a96a3">If the button stops working, go to <a href="${esc(siteUrl())}" style="color:#17162b">${esc(siteUrl().replace(/^https?:\/\//, ""))}</a> and choose "Email me a sign-in link."</p>`
  ] }, "You're officially in."),

  mondayKickoff: (name, focus, percent, target, v, close) => build(v.subject.replace("{first}", first(name)), [
    `Good morning ${esc(first(name))},`,
    esc(v.open),
    focus.length ? `<p style="margin:26px 0 12px;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#76727f">Your focus this week</p>` : "",
    ...focus.map((f, i) => step(i + 1, esc(f))),
    `<p style="margin:18px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:#4a4859">You're <strong style="color:#17162b">${percent}%</strong> through your checklist${target ? `, and your target is <strong style="color:#17162b">${target} laptop${target == 1 ? "" : "s"} a week</strong> once you're selling` : ""}.</p>`
  ].filter(Boolean), { href: siteUrl() + "/", label: "Open my dashboard", after: [esc(close || "Let's make it a great one."), teamSign()] }, v.title),

  checkinInvite: (name, link, v) => build(v.subject.replace("{first}", first(name)), [
    `Hi ${esc(first(name))},`,
    ...v.body.map(esc)
  ], { href: link, label: v.button, after: [`With you all the way,`, teamSign(), `<p style="margin:22px 0 0;font-family:${SANS};font-size:13px;line-height:1.55;color:#9a96a3">It takes about two minutes. This link is just for you and works without signing in.</p>`] }, v.title),

  teamPulse: (name, p, link, coach) => build(`${p.flag === "respond" ? "Needs a reply" : p.flag === "watch" ? "Keep an eye on" : "Weekly win from"}: ${name}`, [
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px"><tr><td style="background:${p.flag === "respond" ? "#fbe5df" : p.flag === "watch" ? "#fcf1d3" : "#e3f1e8"};color:${p.flag === "respond" ? "#b3402e" : p.flag === "watch" ? "#93650a" : "#2c7a52"};border-radius:999px;padding:6px 14px;font-family:${SANS};font-size:13px;font-weight:700">${p.flag === "respond" ? "Reach out today" : p.flag === "watch" ? "Keep an eye on this one" : "Celebrate this win"}</td></tr></table>`,
    `<strong>${esc(name)}</strong> sent their weekly check-in${p.mood ? ` and called the week <strong>${esc(p.mood)}</strong>` : ""}. ${esc(p.flag_reason || "")}`,
    `<p style="margin:0 0 6px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#76727f">Their win</p>` + P(esc(p.win || "—")),
    p.challenge ? `<p style="margin:0 0 6px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#b3402e">What's slowing them down</p>` + P(esc(p.challenge)) : "",
    p.need_help ? P(`<strong style="color:#b3402e">They asked for a coach to reach out.</strong>`) : "",
    p.ai_reply ? `<div style="background:#fbf8f4;border-radius:16px;padding:16px 18px;margin:6px 0 4px"><p style="margin:0 0 6px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#76727f">Suggested reply</p><p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.6;color:#17162b">${esc(p.ai_reply)}</p></div>` : ""
  ].filter(Boolean), { href: link, label: p.flag === "respond" ? "Reply in the dashboard" : "Open check-ins" }, p.flag === "respond" ? "A student needs you" : p.flag === "watch" ? "Worth a check-in" : "A weekly win"),

  login: (name, link) => build(`Your ${PROGRAM()} sign-in link`, [
    `Hi ${esc(first(name))},`,
    `Here's your sign-in link for the Student Hub. If you didn't ask for it, you can ignore this email.`
  ], { href: link, label: "Sign in" }, "Sign in"),

  onboardingReminder: name => build(`${first(name)}, your dashboard is waiting`, [
    `Hi ${esc(first(name))},`,
    `You haven't opened your dashboard yet. Your checklist is waiting, starting with your Skool intro and the brand survey so we can design your logo and build your website.`,
    `Students who start in the first week get their business set up much sooner. Let's get you moving.`
  ], { href: siteUrl() + "/", label: "Open my dashboard" }, "Your dashboard is waiting."),

  checkinReminder: (name, openTasks) => build(`Sunday check-in, ${first(name)}`, [
    `Hi ${esc(first(name))},`,
    `Time for your weekly check-in. Log what you bought, tested, listed and sold, and where you're stuck. You'll get next week's plan, and your coach gets your report.`,
    openTasks ? `You have <strong>${esc(openTasks)}</strong> left on your checklist.` : ``
  ].filter(Boolean), { href: siteUrl() + "/#checkin", label: "Do my check-in" }),

  nudge: (name, nextTask) => build(`Let's get you unstuck, ${first(name)}`, [
    `Hi ${esc(first(name))},`,
    `It's been a little while since your last update. That's normal; most students hit a slow patch somewhere around the first lot.`,
    nextTask ? `Your next checklist item is: <strong>${esc(nextTask)}</strong>. Do just that one this week.` : `Open your checklist and pick the next item, just one.`,
    `If something's blocking you, ask the AI Coach, or reply in the community and bring it to the next coaching call.`
  ], { href: siteUrl() + "/#dashboard", label: "Open my checklist" }),

  coachDigest: lines => build(`Student Hub daily summary`, [
    `Here's what needs your attention today:`,
    ...lines
  ], { href: siteUrl() + "/admin.html", label: "Open the coach dashboard" }, "Today's summary"),

  sectionComplete: (name, sectionName, text, nextName) => build(`${sectionName} is done, ${first(name)}!`, [
    `Hi ${esc(first(name))},`,
    esc(text),
    nextName ? `Next up: <strong>${esc(nextName)}</strong>. Open your dashboard and keep the momentum going.` : `That was the last section. Every box is checked.`,
    `Proud of you.<br>Abdi Hassan`
  ], { href: siteUrl() + "/#dashboard", label: "Open my dashboard" }, `${sectionName}: done.`),

  newMessage: (name, author, body) => build(`${author} left you a message`, [
    `Hi ${esc(first(name))},`,
    `${esc(author)} posted on your Coach Message Board:`,
    `<em>${esc(String(body).slice(0, 600))}</em>`
  ], { href: siteUrl() + "/#dashboard", label: "Read and reply" }, "A new message for you"),

  commentReply: (name, author, itemTitle, body) => build(`${author} replied about "${itemTitle}"`, [
    `Hi ${esc(first(name))},`,
    `${esc(author)} replied on <strong>${esc(itemTitle)}</strong>:`,
    `<em>${esc(String(body).slice(0, 600))}</em>`
  ], { href: siteUrl() + "/#dashboard", label: "Open my dashboard" }, "Your coach replied"),

  delivered: (name, what, link) => build(`Your ${what} is ready, ${first(name)}`, [
    `Hi ${esc(first(name))},`,
    `Our team has delivered your <strong>${esc(what)}</strong>.` + (link ? ` Take a look: <a href="${esc(link)}">${esc(link)}</a>` : ""),
    `Happy with it? Tick "Approve" on your dashboard. Want changes? Leave a comment on that item and we'll revise it.`
  ], { href: siteUrl() + "/#dashboard", label: "Review and approve" }, `Your ${what} is ready.`),

  gateOpen: (name, coach) => build(`${first(name)}, you're cleared to buy`, [
    `Hi ${esc(first(name))},`,
    `Every box on your checklist is checked, which puts you ahead of most people who start this.`,
    `Before you spend a dollar, send your first deal to ${esc(coach || "your coach")} and we'll review it within 24 hours. Do this for your first 5–7 deals. Let's get it.<br>Abdi Hassan`
  ], { href: siteUrl() + "/#dashboard", label: "Open my dashboard" }, "You're cleared to buy."),

  overdue: (name, titles) => build(`${first(name)}, a quick catch-up on your checklist`, [
    `Hi ${esc(first(name))},`,
    titles.length === 1 ? `<strong>${esc(titles[0])}</strong> is past its due date.` : `These are past their due dates:<br>${titles.map(t => "• " + esc(t)).join("<br>")}`,
    `Can you get ${titles.length === 1 ? "it" : "them"} done in the next couple of days? If something's in the way, leave a comment on the item and we'll help.`
  ], { href: siteUrl() + "/#dashboard", label: "Open my checklist" }, "A quick catch-up"),

  quiet: (name, nextTitle, help) => build(`${first(name)}, your next step`, [
    `Hi ${esc(first(name))},`,
    `We haven't seen you in your dashboard for a few days. Your next step is <strong>${esc(nextTitle || "your next checklist item")}</strong>.`,
    help ? esc(help) : ``,
    `Just that one thing this week. If you're stuck, leave a comment on it and we'll help.`
  ].filter(Boolean), { href: siteUrl() + "/#dashboard", label: "Do it now" }),

  callReminder: (name, when) => build(`Coaching call ${when}`, [
    `Hi ${esc(first(name))},`,
    `Our group coaching call is ${esc(when)}. Bring your questions, your deals and your wins.`,
    `<strong>Check the Skool community for the link.</strong>`
  ], null, `Coaching call ${when}`),
};
