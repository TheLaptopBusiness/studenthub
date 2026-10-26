// Student dashboards: creating them, loading them, and what happens when items are ticked.
import { db, enc, nowIso, getStudentByEmail, updateStudent, signInLink, siteUrl } from "./supa.js";
import { TEMPLATE, summarize, sectionTitle, sectionCongrats, unitTarget, SECTIONS } from "./checklist.js";
import { templates, sendEmail } from "./email.js";
import { notify } from "./notify.js";
import { defaultOwner, shownToStudent, coachFor, coachNames, signoff, teamEmails } from "./team.js";

const first = name => String(name || "").trim().split(/\s+/)[0] || "there";

/** Makes sure the student has every checklist item from the template (creates the dashboard on first call). */
export async function ensureChecklist(student) {
  let items = await db(`checklist_items?student_id=eq.${enc(student.id)}&select=*&limit=200`);
  const have = new Set(items.map(i => i.key));
  const missing = TEMPLATE.filter(t => !have.has(t.key)).map(t => ({ student_id: student.id, key: t.key }));
  if (missing.length) {
    await db("checklist_items?on_conflict=student_id,key", { method: "POST", prefer: "resolution=ignore-duplicates,return=minimal", body: missing });
    items = await db(`checklist_items?student_id=eq.${enc(student.id)}&select=*&limit=200`);
  }
  return items;
}

export async function loadDashboard(student, { forStudent = false } = {}) {
  const items = await ensureChecklist(student);
  const [comments, messages] = await Promise.all([
    db(`item_comments?student_id=eq.${enc(student.id)}&select=id,item_key,author,from_team,body,created_at&order=created_at.asc&limit=1000`),
    db(`messages?student_id=eq.${enc(student.id)}&select=id,author,body,read_at,created_at&order=created_at.desc&limit=100`)
  ]);
  const sum = summarize(student, items);
  const byKey = {};
  for (const c of comments) (byKey[c.item_key] = byKey[c.item_key] || []).push(c);
  sum.items.forEach(i => { i.comments = byKey[i.key] || []; if (i.link) i.link = process.env[i.link] || null; });
  if (forStudent) {
    sum.items.forEach(i => i.comments.forEach(c => { if (c.from_team) c.author = shownToStudent(c.author); }));
    messages.forEach(m => { m.author = shownToStudent(m.author); });
    sum.items.forEach(i => { if (i.done_by_name && i.done_by_name !== student.name) i.done_by_name = shownToStudent(i.done_by_name); });
  }
  return { summary: sum, messages, rawItems: items };
}

export const PROFILE_FIELDS = ["name", "phone", "location", "business_name", "domain", "partner", "tier", "focus_brand", "monthly_goal", "weekly_unit_target", "logo_url", "website_url"];
export function publicProfile(s) {
  const p = {};
  for (const f of PROFILE_FIELDS) p[f] = s[f] ?? "";
  p.email = s.email; p.owner = s.owner || ""; p.status = s.status; p.created_at = s.created_at;
  p.password_set = !!s.password_set; p.reminders_paused = !!s.reminders_paused;
  p.brand = s.brand && typeof s.brand === "object" ? s.brand : {}; p.brand_submitted_at = s.brand_submitted_at || null;
  return p;
}

export async function postMessage(student, author, body, { notifyStudent = true } = {}) {
  await db("messages", { method: "POST", prefer: "return=minimal", body: { student_id: student.id, author, body: String(body).slice(0, 4000) } });
  await updateStudent(student.id, { last_contact_at: nowIso() });
  if (notifyStudent) {
    await notify(student, {
      event: "new_message",
      email: templates.newMessage(student.name, shownToStudent(author), body),
      text: `${first(student.name)}, ${shownToStudent(author)} left you a message in your Hub: ${siteUrl()}/#dashboard`
    });
  }
}

function welcomeText(student) {
  return `Hey ${first(student.name)}, welcome to Laptop Business Mastery! I'm ${first(coachFor(student))}, your success coach, and I'll be with you every step along with ${coachNames().filter(n => n !== coachFor(student)).map(n => first(n)).join(" and ") || "the team"}. ` +
    `Your dashboard is live. Two things to do right now: fill out the brand survey (step 5 on your checklist) so we can start your logo and website, ` +
    `and work through your checklist below. Stuck on anything? Comment right on that step and we'll answer. Let's get it.`;
}

/** Enrolls a student: login account, fresh dashboard, welcome message, welcome email + SMS.
    Safe to call twice for the same email (returns the existing student). */
export async function enrollStudent({ name, email, phone, owner }) {
  email = String(email || "").trim().toLowerCase();
  name = String(name || "").trim().slice(0, 100);
  const existing = await getStudentByEmail(email);
  if (existing) {
    if (phone && !existing.phone) await updateStudent(existing.id, { phone: String(phone).slice(0, 40) });
    await ensureChecklist(existing);
    return { student: existing, existed: true, emailed: false };
  }
  const { link, userId } = await signInLink(email, "/");
  const row = { id: userId, email, name, status: "invited", phone: String(phone || "").slice(0, 40), owner: coachNames().includes(owner) ? owner : defaultOwner() };
  await db("students", { method: "POST", prefer: "return=minimal", body: row });
  const student = { ...row, created_at: nowIso(), sections_done: {} };
  await ensureChecklist(student);
  await postMessage(student, coachFor(student), welcomeText(student), { notifyStudent: false });
  const res = await notify(student, {
    event: "enrolled",
    email: templates.welcome(name, link),
    text: `Welcome to Laptop Business Mastery, ${first(name)}! Your dashboard is live. Check your email for your sign-in link, then fill out the brand survey so we can start your logo and website. — ${signoff()}`
  });
  return { student, existed: false, emailed: res.email };
}

/** Runs after any tick: congratulations for finished sections, team deliveries, the gate. */
export async function afterTick(student, item, beforeSummary, afterSummary, actorIsTeam) {
  const done = { ...(student.sections_done || {}) };
  let changed = false;
  for (const sec of afterSummary.sections) {
    const was = beforeSummary.sections.find(s => s.n === sec.n);
    if (sec.status === "complete" && was.status !== "complete" && !done[sec.n]) {
      done[sec.n] = nowIso(); changed = true;
      const next = SECTIONS.find(s => s.n > sec.n && afterSummary.sections.find(x => x.n === s.n).status !== "complete");
      const text = sectionCongrats(sec.n, student);
      await notify(student, {
        event: "section_complete",
        email: templates.sectionComplete(student.name, sectionTitle(sec.n), text, next ? next.title : ""),
        text,
        data: { section: sectionTitle(sec.n), section_number: sec.n }
      });
    }
  }
  if (changed) await updateStudent(student.id, { sections_done: done });

  const t = TEMPLATE.find(x => x.key === item.key);
  if (actorIsTeam && t && t.by === "team" && item.done) {
    const what = item.key === "logo" ? "logo" : "website";
    const link = item.value || (what === "logo" ? student.logo_url : student.website_url) || "";
    await notify(student, {
      event: what === "logo" ? "logo_delivered" : "website_live",
      email: templates.delivered(student.name, what, link),
      text: `${first(student.name)}, your ${what} is ready! Take a look and approve it in your Hub: ${siteUrl()}/#dashboard`
    });
  }

  if (afterSummary.gate_open && !beforeSummary.gate_open && !student.gate_opened_at) {
    await updateStudent(student.id, { gate_opened_at: nowIso() });
    await postMessage(student, coachFor(student),
      `${first(student.name)}, every box is checked. You're cleared to buy. Before you spend a dollar, send me your first deal and we'll review it within 24 hours. Do this for your first 5–7 deals.`,
      { notifyStudent: false });
    await notify(student, {
      event: "gate_open",
      email: templates.gateOpen(student.name, coachFor(student)),
      text: `${first(student.name)}, every box is checked: you're cleared to buy! Send your first deal to ${first(coachFor(student))} for review before spending a dollar. — ${signoff()}`
    });
  }
}

/** Validates and applies the value typed for an item; returns {value, profile} or throws a message. */
export function applyInput(t, raw, student) {
  if (!t.input || t.input.type === "survey") return { value: "", profile: {} };
  const inp = t.input;
  let v = String(raw ?? "").trim();
  if (inp.type === "choice") { if (v && !inp.options.includes(v)) throw new Error(`Pick one of: ${inp.options.join(", ")}.`); }
  if (inp.type === "money" || inp.type === "number") {
    if (v) { const n = Number(v.replace(/[$,\s]/g, "")); if (!(n > 0)) throw new Error("Enter a number."); v = String(inp.type === "number" ? Math.round(n) : n); }
  }
  if (inp.type === "url" && v && !/^https?:\/\//i.test(v)) v = "https://" + v;
  if (inp.type === "text" && inp.field === "domain") v = v.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
  if (inp.required && !v) {
    if (t.key === "unit_target") {
      const auto = unitTarget(student.monthly_goal, student.tier);
      if (auto) v = String(auto); else throw new Error("Set your tier and monthly goal first, so we can work out your target.");
    } else throw new Error(`Please fill in: ${inp.label}.`);
  }
  const profile = inp.field && v ? { [inp.field]: inp.type === "money" || inp.type === "number" ? Number(v) : v } : {};
  return { value: v.slice(0, 500), profile };
}

/* ---------- brand survey ---------- */
const clip = (v, n = 300) => String(v ?? "").trim().slice(0, n);
/** Checks the survey answers; returns the cleaned answers or throws a message the student can act on. */
export function cleanSurvey(b, student) {
  const out = {
    business_name: clip(b.business_name, 120),
    name_verified: b.name_verified === "yes" ? "yes" : b.name_verified === "no" ? "no" : "",
    has_logo: b.has_logo === "yes" ? "yes" : b.has_logo === "no" ? "no" : "",
    logo_link: clip(b.logo_link, 500),
    colours: clip(b.colours, 200), colours_avoid: clip(b.colours_avoid, 200),
    swatches: (Array.isArray(b.swatches) ? b.swatches : []).filter(x => /^#[0-9a-f]{6}$/i.test(String(x))).slice(0, 3),
    style: ["Modern and clean", "Bold", "Classic and trustworthy", "Techy"].includes(b.style) ? b.style : "",
    contact_email: clip(b.contact_email, 160).toLowerCase(), contact_phone: clip(b.contact_phone, 40),
    show_address: ["none", "city", "full"].includes(b.show_address) ? b.show_address : "none",
    address: clip(b.address, 200), hours: clip(b.hours, 120), socials: clip(b.socials, 300), notes: clip(b.notes, 1000)
  };
  if (!out.business_name) throw new Error("Add your business name.");
  if (out.name_verified !== "yes") throw new Error("Please verify your business name first: Google it and search your state's LLC registry. Once it's clear, come back and choose Yes. We only design around a name that's available.");
  if (!out.has_logo) throw new Error("Tell us if you already have a logo.");
  if (out.has_logo === "no" && !out.colours) throw new Error("Tell us the colours you'd like for your logo.");
  if (out.logo_link && !/^https?:\/\//i.test(out.logo_link)) out.logo_link = "https://" + out.logo_link;
  if (!out.contact_email && !out.contact_phone) throw new Error("Add at least one way customers can contact you: an email or a phone number.");
  if (out.contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.contact_email)) throw new Error("That contact email doesn't look right.");
  if (out.show_address !== "none" && !out.address) throw new Error(out.show_address === "city" ? "Add the city and state to show." : "Add the address to show.");
  return out;
}

export function surveySummaryHtml(name, b) {
  const esc = x => String(x).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rows = [["Business name", b.business_name + " (verified)"], ["Has a logo", b.has_logo === "yes" ? "Yes" + (b.logo_link ? `: ${b.logo_link}` : "") : "No, design one"],
    ["Colours", [b.colours, b.swatches.join(" ")].filter(Boolean).join(" · ")], ["Avoid", b.colours_avoid], ["Style", b.style],
    ["Website email", b.contact_email], ["Website phone", b.contact_phone], ["Address shown", b.show_address === "none" ? "None" : b.address],
    ["Hours", b.hours], ["Social links", b.socials], ["Notes", b.notes]].filter(r => r[1]);
  return `<strong>${esc(name)}</strong> sent their brand survey. The 5-business-day logo clock has started.<br><br>` + rows.map(r => `${esc(r[0])}: ${esc(r[1])}`).join("<br>");
}

/** Saves the survey; the first time, ticks the checklist step (which starts the logo clock) and tells the team. */
export async function saveSurvey(student, body, actor) {
  const answers = cleanSurvey(body, student);
  const items = await ensureChecklist(student);
  const item = items.find(i => i.key === "brand_form");
  const first_time = !student.brand_submitted_at;
  const patch = { brand: answers, business_name: answers.business_name, brand_submitted_at: student.brand_submitted_at || nowIso(), last_activity_at: nowIso() };
  await updateStudent(student.id, patch);
  const s2 = { ...student, ...patch };
  if (!item.done) {
    const before = summarize(student, items);
    await db(`checklist_items?id=eq.${enc(item.id)}`, { method: "PATCH", prefer: "return=minimal", body: { done: true, done_at: nowIso(), done_by_name: actor } });
    const after = summarize(s2, items.map(i => i.id === item.id ? { ...i, done: true, done_at: nowIso() } : i));
    await afterTick(s2, { ...item, done: true }, before, after, false);
  }
  const to = teamEmails();
  if (to.length) {
    await sendEmail({ to, subject: (first_time ? "New brand survey: " : "Brand survey updated: ") + (student.name || student.email),
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#15232f">${surveySummaryHtml(student.name || student.email, answers)}<p><a href="${siteUrl()}/admin.html">Open the coach dashboard</a></p></div>` }).catch(() => {});
  }
  return s2;
}
