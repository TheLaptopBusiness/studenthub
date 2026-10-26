// Automatic emails, sent through Resend (resend.com).
// Env: RESEND_API_KEY, EMAIL_FROM (e.g. "Laptop Business Mastery <coach@yourdomain.com>")
import { siteUrl } from "./supa.js";
import { signoff } from "./team.js";

const PROGRAM = () => process.env.PROGRAM_NAME || "Laptop Business Mastery";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const first = name => String(name || "").trim().split(/\s+/)[0] || "there";

export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.warn("Email not sent (RESEND_API_KEY or EMAIL_FROM missing):", subject, to);
    return false;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: Array.isArray(to) ? to : [to], subject, html, text })
  });
  if (!r.ok) {
    console.error("Email failed", r.status, (await r.text().catch(() => "")).slice(0, 300));
    return false;
  }
  return true;
}

function layout(paragraphs, button) {
  const body = paragraphs.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#16212a">${p}</p>`).join("");
  const btn = button
    ? `<p style="margin:22px 0"><a href="${esc(button.href)}" style="background:#1d5e86;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;display:inline-block">${esc(button.label)}</a></p>`
    : "";
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
<p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5b6872;margin:0 0 18px">${esc(PROGRAM())}</p>
${body}${btn}
<p style="font-size:12px;color:#5b6872;margin-top:28px">You're getting this because you're enrolled in ${esc(PROGRAM())}.</p></div>`;
}
const plain = (paragraphs, button) =>
  paragraphs.map(p => p.replace(/<[^>]+>/g, "")).join("\n\n") + (button ? `\n\n${button.label}: ${button.href}` : "");
function build(subject, paragraphs, button) {
  return { subject, html: layout(paragraphs, button), text: plain(paragraphs, button) };
}

export const templates = {
  welcome: (name, link) => build(`Welcome to ${PROGRAM()}, ${first(name)}`, [
    `Hi ${esc(first(name))},`,
    `Welcome in. Your personal dashboard is live. It has your checklist with due dates, a message board where our team talks to you, your AI coach and the full playbook.`,
    `Two things to do right now: fill out the brand survey on your dashboard so we can start your logo and website, and work through your checklist in order.`,
    `This sign-in button works for 24 hours. After that, go to the hub and request a new sign-in link with this email address.`
  ], { href: link, label: "Open my Student Hub" }),

  login: (name, link) => build(`Your ${PROGRAM()} sign-in link`, [
    `Hi ${esc(first(name))},`,
    `Here's your sign-in link for the Student Hub. If you didn't ask for it, you can ignore this email.`
  ], { href: link, label: "Sign in" }),

  onboardingReminder: name => build(`${first(name)}, your dashboard is waiting`, [
    `Hi ${esc(first(name))},`,
    `You haven't opened your dashboard yet. Your checklist is waiting, starting with your Skool intro and the brand survey so we can design your logo and build your website.`,
    `Students who start in the first week get their business set up much sooner. Let's get you moving.`
  ], { href: siteUrl() + "/", label: "Open my dashboard" }),

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
  ], { href: siteUrl() + "/admin.html", label: "Open the coach dashboard" }),

  sectionComplete: (name, sectionName, text, nextName) => build(`${sectionName} is done, ${first(name)}!`, [
    `Hi ${esc(first(name))},`,
    esc(text),
    nextName ? `Next up: <strong>${esc(nextName)}</strong>. Open your dashboard and keep the momentum going.` : `That was the last section. Every box is checked.`,
    `Proud of you. — ${signoff()}`
  ], { href: siteUrl() + "/#dashboard", label: "Open my dashboard" }),

  newMessage: (name, author, body) => build(`${author} left you a message`, [
    `Hi ${esc(first(name))},`,
    `${esc(author)} posted on your Coach Message Board:`,
    `<em>${esc(String(body).slice(0, 600))}</em>`
  ], { href: siteUrl() + "/#dashboard", label: "Read and reply" }),

  commentReply: (name, author, itemTitle, body) => build(`${author} replied about "${itemTitle}"`, [
    `Hi ${esc(first(name))},`,
    `${esc(author)} replied on <strong>${esc(itemTitle)}</strong>:`,
    `<em>${esc(String(body).slice(0, 600))}</em>`
  ], { href: siteUrl() + "/#dashboard", label: "Open my dashboard" }),

  delivered: (name, what, link) => build(`Your ${what} is ready, ${first(name)}`, [
    `Hi ${esc(first(name))},`,
    `Our team has delivered your <strong>${esc(what)}</strong>.` + (link ? ` Take a look: <a href="${esc(link)}">${esc(link)}</a>` : ""),
    `Happy with it? Tick "Approve" on your dashboard. Want changes? Leave a comment on that item and we'll revise it.`
  ], { href: siteUrl() + "/#dashboard", label: "Review and approve" }),

  gateOpen: (name, coach) => build(`${first(name)}, you're cleared to buy`, [
    `Hi ${esc(first(name))},`,
    `Every box on your checklist is checked, which puts you ahead of most people who start this.`,
    `Before you spend a dollar, send your first deal to ${esc(coach || "your coach")} and we'll review it within 24 hours. Do this for your first 5–7 deals. Let's get it. — ${esc(signoff())}`
  ], { href: siteUrl() + "/#dashboard", label: "Open my dashboard" }),

  overdue: (name, titles) => build(`${first(name)}, a quick catch-up on your checklist`, [
    `Hi ${esc(first(name))},`,
    titles.length === 1 ? `<strong>${esc(titles[0])}</strong> is past its due date.` : `These are past their due dates:<br>${titles.map(t => "• " + esc(t)).join("<br>")}`,
    `Can you get ${titles.length === 1 ? "it" : "them"} done in the next couple of days? If something's in the way, leave a comment on the item and we'll help.`
  ], { href: siteUrl() + "/#dashboard", label: "Open my checklist" }),

  quiet: (name, nextTitle, help) => build(`${first(name)}, your next step`, [
    `Hi ${esc(first(name))},`,
    `We haven't seen you in your dashboard for a few days. Your next step is <strong>${esc(nextTitle || "your next checklist item")}</strong>.`,
    help ? esc(help) : ``,
    `Just that one thing this week. If you're stuck, leave a comment on it and we'll help.`
  ].filter(Boolean), { href: siteUrl() + "/#dashboard", label: "Do it now" }),

  callReminder: (name, when, link) => build(`Coaching call ${when}`, [
    `Hi ${esc(first(name))},`,
    `Our weekly coaching call is ${esc(when)}. Bring your questions, your deals and your wins.`,
    link ? `Join here: <a href="${esc(link)}">${esc(link)}</a>` : `Join from the Skool community.`
  ], link ? { href: link, label: "Join the call" } : null),
};
