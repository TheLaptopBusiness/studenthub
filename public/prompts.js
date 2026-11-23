// Shared by the website (browser) and the server function (api/ai.js).
// The server builds every prompt itself, so students can only use the four tools, not general chat.
import { PLAYBOOK_TEXT, section } from "./playbook.js";

const str = (v, max = 2000) => String(v ?? "").slice(0, max).trim();
const n = v => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
const pct = x => Number.isFinite(x) ? (x * 100).toFixed(1) + "%" : "n/a";

/* ---------- Deal math (the numbers students see come from here) ---------- */
export function analyze(raw) {
  const i = {};
  for (const k of ["qty","bid","prem","tax","freight","refurb","defect","parts","resale","fee","order","ship","pack","target"]) i[k] = n(raw?.[k]);
  const qty = Math.max(0, i.qty);
  const defect = Math.min(Math.max(i.defect, 0), 100) / 100;
  const sellable = qty * (1 - defect);
  const duds = qty - sellable;
  const f = Math.min(i.fee, 99) / 100;
  const acq = i.bid * (1 + i.prem / 100) * (1 + i.tax / 100) + i.freight;
  const refurb = sellable * i.refurb;
  const outbound = sellable * (i.ship + i.pack);
  const partsRev = duds * i.parts;
  const revenue = sellable * i.resale + partsRev;
  const fees = revenue * f + sellable * i.order;
  const profit = revenue - fees - outbound - refurb - acq;
  const invested = acq + refurb + outbound;
  const roi = invested > 0 ? profit / invested : NaN;
  const margin = revenue > 0 ? profit / revenue : NaN;
  const unitCost = qty > 0 ? (acq + refurb) / qty : NaN;
  const breakEven = sellable > 0 ? ((sellable * i.order + outbound + refurb + acq) / (1 - f) - partsRev) / sellable : NaN;
  const r = i.target / 100;
  const maxAcq = (revenue - fees - outbound - refurb - r * (refurb + outbound)) / (1 + r);
  const maxBid = (maxAcq - i.freight) / ((1 + i.prem / 100) * (1 + i.tax / 100));
  return { i, qty, sellable, duds, acq, refurb, outbound, revenue, partsRev, fees, profit, invested, roi, margin, unitCost, breakEven, maxBid, target: r };
}

function profileText(p = {}) {
  const lines = ["Stage: " + (str(p.stage, 80) || "not given")];
  if (str(p.capital)) lines.push("Starting capital: $" + str(p.capital, 20));
  if (str(p.hours)) lines.push("Hours per week: " + str(p.hours, 10));
  if (str(p.location)) lines.push("Location: " + str(p.location, 80));
  if (str(p.goal)) lines.push("Goal: " + str(p.goal, 300));
  if (str(p.progress)) lines.push("Roadmap progress: " + str(p.progress, 300));
  return lines.join("\n");
}

/* ---------- Prompts ----------
   Returns { system, messages, maxTokens, json }.
   messages always start and end with a user turn. */
export function buildPrompt(tool, d = {}) {
  if (tool === "coach") {
    let turns = Array.isArray(d.turns) ? d.turns : [];
    turns = turns
      .filter(t => t && (t.role === "user" || t.role === "assistant") && str(t.content, 8000))
      .map(t => ({ role: t.role, content: str(t.content, 8000) }))
      .slice(-16);
    while (turns.length && turns[0].role !== "user") turns.shift();
    if (!turns.length || turns[turns.length - 1].role !== "user") throw new Error("Chat must end with a student message.");
    const kn = d.knowledge || {};
    const verified = str(kn.verified, 200000);
    const library = str(kn.library, 1200000);
    const stable = `You are the AI Coach for "Laptop Business Mastery", a mentorship program run by Abdi Hassan that teaches students to buy used laptops (often in bulk from government/school surplus auctions and business IT refreshes), test, refurbish, grade, list and resell them for profit.

Where your answers come from, in this order of priority:
1. VERIFIED ANSWERS below: written or approved by Abdi. If one matches the question, follow it exactly; it overrides everything else.
2. ABDI'S LIBRARY below: transcripts of his videos and his own documents. This is how the program actually teaches. Prefer his methods, numbers, models and wording over general advice.
3. PROGRAM PLAYBOOK below.
4. Your general knowledge, only when none of the above covers the question. Say so ("This isn't covered in the program material, but…").
Never contradict the verified answers or Abdi's library with general knowledge. If sources disagree, follow the higher-priority one.

How to answer:
- Answer the student's actual question first, in plain, beginner-friendly language. Explain any jargon you use.
- Be practical and specific: steps, numbers, and what to check. Keep answers short (under ~250 words) unless the student asks for detail. Use short paragraphs and bullet lists; no tables.
- When your answer draws on a video or document from Abdi's library, end with one line: "From: <title>" (up to 2 titles).
- Only help with topics related to the student's laptop reselling business. Politely decline unrelated requests.
- Never invent live data: current marketplace fees, today's resale prices, or auction results. Tell the student how to check (e.g. eBay sold listings).
- Safety: swollen batteries, burning smells, liquid damage and mains electricity get a safety-first answer.
- Never help bypass BIOS passwords, MDM, Computrace or activation locks the student doesn't own the rights to remove.
- Legal, tax and business-structure questions: give general orientation only and tell them to ask a qualified professional.
- If you're not confident, or the question matches the playbook's "Bring it to a coaching call" list, say so honestly and end with a line starting "**Bring this to your coach:**" and a one-sentence summary they can paste. A wrong confident answer is worse than "I'm not sure".
- Be encouraging but honest. If a deal or plan looks bad, say so plainly.

VERIFIED ANSWERS
${verified || "(none yet)"}

ABDI'S LIBRARY
${library || "(no videos or documents added yet)"}

PROGRAM PLAYBOOK
${PLAYBOOK_TEXT}`;
    const dynamic = `STUDENT PROFILE
${profileText(d.profile)}`;
    return {
      maxTokens: 1400, json: false, messages: turns,
      systemParts: [stable, dynamic],
      system: stable + "\n\n" + dynamic
    };
  }

  if (tool === "deal") {
    const a = analyze(d.inputs);
    const i = a.i;
    return {
      maxTokens: 1200, json: false,
      system: `You are the deal reviewer for the "Laptop Business Mastery" laptop reselling program. You review auction lots for students using the program rules below. The numbers come from the program's Deal Analyzer; trust the arithmetic but question the assumptions. Never state current market prices as fact; tell the student to confirm resale price with recent sold listings.

PROGRAM RULES
${section(["model", "sourcing", "diligence", "qc", "repairs"])}`,
      messages: [{ role: "user", content: `LOT: ${str(d.desc, 500) || "(not described)"}
STUDENT INPUTS: ${i.qty} units, winning bid $${i.bid}, buyer's premium ${i.prem}%, sales tax ${i.tax}%, freight in $${i.freight}, parts per unit $${i.refurb}, expected duds ${i.defect}%, dud parts value $${i.parts}, resale per unit $${i.resale}, marketplace fee ${i.fee}% + $${i.order}/order, shipping out $${i.ship}/unit, packaging $${i.pack}/unit, target ROI ${i.target}%.
RESULTS: landed cost $${a.acq.toFixed(2)}, expected profit $${a.profit.toFixed(2)}, ROI ${pct(a.roi)}, margin ${pct(a.margin)}, break-even resale ${Number.isFinite(a.breakEven) ? "$" + a.breakEven.toFixed(2) : "n/a"}/unit, max bid for target ${Number.isFinite(a.maxBid) ? "$" + a.maxBid.toFixed(0) : "n/a"}.
AUCTION TEXT: ${str(d.listing, 6000) || "(none provided)"}
${d.hasImages ? "The attached images are screenshots of the auction listing." : ""}

Write the review in this format, under 300 words, using markdown headings and bullets:
### Verdict
One line: **Bid up to $X**, **Bid with caution**, or **Pass**, then one sentence why.
### Assumptions to double-check
Which inputs look optimistic or risky (resale price, dud rate, parts cost, missing drives/chargers, CPU generation and Windows 11 support).
### Red flags
Anything in the lot or listing text that matches the program's red-flag list. Say "None spotted" if none.
### Questions to ask the seller
3–5 specific questions.` }]
    };
  }

  if (tool === "listing") {
    const market = ["eBay", "Facebook Marketplace", "Mercari", "OfferUp", "Back Market"].includes(d.market) ? d.market : "eBay";
    const grade = { A: "Grade A – Excellent", B: "Grade B – Good", C: "Grade C – Fair", P: "For parts / not working" }[d.grade] || "Grade B – Good";
    return {
      maxTokens: 2000, json: true,
      system: `You write marketplace listings for refurbished laptops for students of the "Laptop Business Mastery" program, following the program rules below. Be accurate: only claim what the student's details support. Disclose every flaw plainly. Reply with only a JSON object, no other text.

RULES
${section(["listing", "grading", "pricing"])}`,
      messages: [{ role: "user", content: `Write a ${market} listing for this laptop.

Model: ${str(d.model, 200)}
Processor: ${str(d.cpu, 200)}
RAM: ${str(d.ram, 100)}
Storage: ${str(d.ssd, 100)}
Screen: ${str(d.screen, 200)}
OS: ${str(d.os, 200)}
Battery health: ${str(d.batt, 100)}
Grade: ${grade}
Test results: ${str(d.tests, 2000)}
Cosmetic flaws: ${str(d.flaws, 1500)}
Included: ${str(d.incl, 300)}
Recent sold prices the student found: ${str(d.comps, 500) || "none provided"}
${d.hasImages ? "The attached photos show this laptop; mention any visible flaw the student didn't list in conditionNote and in warnings." : ""}

Reply with only a JSON object of this shape:
{"title": string (${market === "eBay" ? "max 80 characters" : "max 100 characters"}, title formula from the rules),
 "description": string (plain text using the description template, sections separated by blank lines, bullet lines starting with "- "),
 "conditionNote": string (1-3 sentences for the marketplace condition field),
 "itemSpecifics": [{"name": string, "value": string}],
 "keywords": [string] (5-8 search terms buyers use),
 "price": {"list": number, "floor": number, "reasoning": string} (from the student's sold prices and the grade; if no sold prices were given, set list and floor to 0 and explain how to find comps),
 "warnings": [string] (anything the student should fix or verify before listing; empty array if none)}` }]
    };
  }

  if (tool === "checkin") {
    return {
      maxTokens: 1200, json: false,
      system: `You are the accountability coach for the "Laptop Business Mastery" laptop reselling program. You turn a student's weekly check-in into a focused plan and a report for their human coach. Be encouraging but honest.

PROGRAM RULES
${section(["rhythm", "model", "sourcing"])}`,
      messages: [{ role: "user", content: `CHECK-IN
${str(d.week, 60)}
Student: ${str(d.name, 100) || "(no name given)"}
Laptops bought: ${n(d.bought)}; spent on inventory: $${n(d.spent)}
Tested: ${n(d.tested)}; listed: ${n(d.listed)}; sold: ${n(d.sold)}
Revenue: $${n(d.rev)}; profit: $${n(d.profit)}
Hours available next week: ${n(d.hours)}
Wins: ${str(d.wins, 1500) || "(none listed)"}
Stuck on: ${str(d.stuck, 1500) || "(nothing listed)"}
Goal for next week: ${str(d.goal, 500) || "(none set)"}

STUDENT PROFILE
${profileText(d.profile)}

Write, in markdown, under 350 words:
### This week in one line
A plain, encouraging but honest summary. Name the milestone they're on (from the milestones list).
### Your plan for next week
3–5 numbered tasks that fit their hours, most important first, each concrete and checkable (e.g. "List the 6 tested ThinkPads by Friday"). Address what they're stuck on.
### Watch out for
1–2 risks you see in the numbers (e.g. inventory piling up untested, profit per unit falling, overspending capital). Skip if none.
### Coach report
A compact block the student pastes to their coach: name, week, the numbers on one line, wins, blockers, and "Needs help with:" one line. Add "**Flag for coaching call**" if anything matches the program's bring-it-to-a-call list.` }]
    };
  }

  if (tool === "roadmap") {
    const it = d.intake || {};
    return {
      maxTokens: 4000, json: true,
      system: `You are the onboarding coach for the "Laptop Business Mastery" laptop reselling program. You build each new student's personal 30/60/90-day roadmap from their intake answers, following the program playbook below. Make it realistic for their budget and hours: a student with $500 and 5 hours a week gets smaller lots and fewer tasks per week than one with $5,000 and 25 hours. Reply with only a JSON object, no other text.

PROGRAM PLAYBOOK
${PLAYBOOK_TEXT}`,
      messages: [{ role: "user", content: `STUDENT INTAKE
${intakeText(it)}

Build the roadmap. Reply with only a JSON object of this shape:
{"summary": string (2-3 sentences addressed to the student: their 90-day target in dollars or units, and the plan's shape),
 "tasks": [{"phase": 1|2|3 (1 = days 1-30, 2 = days 31-60, 3 = days 61-90),
            "week": integer 1-13,
            "title": string (a concrete, checkable action under 90 characters, e.g. "Register on GovDeals and Public Surplus"),
            "details": string (1-3 sentences: how to do it and what "done" looks like, with numbers sized to their budget),
            "playbook": string (the id of the most relevant playbook section, one of: ${PLAYBOOK_IDS.join(", ")}; or "" if none)}]}
Rules: 20-30 tasks in total, ordered by week. Week 1 has 3-5 tasks and starts with what they haven't done yet (skip setup steps they've already finished). Include the program milestones (first lot won, first 10 tested, first listing, first sale, first $1,000 profit) as tasks in realistic weeks. Spread the rest so no week has more than their hours allow.` }]
    };
  }

  if (tool === "auction") {
    const budget = n(d.budget);
    return {
      maxTokens: 3500, json: true,
      system: `You analyze laptop auction lots (GovDeals, Public Surplus, school and business surplus sales) for students of the "Laptop Business Mastery" reselling program, using the program rules below. Be skeptical and specific. Only state what the listing, page text or screenshots support; when something is unknown, say so in "missing" instead of guessing. Resale estimates are rough ranges for used, tested units of that model/spec in typical condition; the student must confirm them with recent sold listings. Reply with only a JSON object, no other text.

PROGRAM RULES
${section(["sourcing", "diligence", "model", "qc", "wipe", "repairs"])}`,
      messages: [{ role: "user", content: `Analyze this auction lot.

AUCTION LINK: ${str(d.url, 500) || "(none)"}
${d.fetchNote ? "NOTE: " + str(d.fetchNote, 300) + "\n" : ""}PAGE TEXT FROM THE LINK:
${str(d.pageText, 25000) || "(not available)"}

TEXT THE STUDENT PASTED:
${str(d.listing, 12000) || "(none)"}
${d.hasImages ? "\nThe attached images are screenshots or photos from the auction listing. Read model numbers, quantities, condition notes and terms from them." : ""}
STUDENT'S MAX BUDGET FOR THIS LOT: ${budget > 0 ? "$" + budget : "not given"}

Reply with only a JSON object of this shape (use null or "" for unknowns):
{"title": string (short name for the lot, e.g. "12x Dell Latitude 5420 – City of Tulsa"),
 "auction": {"site": string, "closes": string, "currentBid": number|null, "buyerPremiumPct": number|null, "location": string, "pickup": string, "payment": string},
 "units": [{"model": string, "qty": number, "cpu": string, "ram": string, "storage": string, "condition": string, "win11": "yes"|"no"|"unknown", "resaleLow": number, "resaleHigh": number}],
 "totalUnits": number,
 "missing": [string] (important facts the listing doesn't state, e.g. "Whether drives are included"),
 "redFlags": [{"level": "high"|"medium"|"low", "text": string}] (match the program's red-flag list; empty if none),
 "questions": [string] (3-6 specific questions to send the seller before bidding),
 "verdict": {"rating": "Strong"|"Worth a look"|"Pass", "reason": string (1-2 sentences${budget > 0 ? ", including whether it fits their budget" : ""})},
 "dealInputs": {"qty": number, "resale": number (weighted average resale per sellable unit), "refurb": number (likely parts cost per unit, e.g. chargers, drives, batteries), "defect": number (expected % of duds, 5-40), "parts": number (value of a dud sold for parts), "prem": number (buyer's premium % if stated, else 10), "freight": number (pickup or shipping cost estimate in dollars)}}
resaleLow/resaleHigh: use 0 for both if you can't identify the model well enough to estimate.` }]
    };
  }

  throw new Error("Unknown tool");
}

/* ---------- Auction analysis ---------- */
export const AUCTION_DOMAINS = ["govdeals.com", "publicsurplus.com", "gsaauctions.gov", "allsurplus.com", "municibid.com", "hibid.com", "bidspotter.com", "propertyroom.com", "liquidation.com", "purplewave.com", "proxibid.com", "ebay.com"];

/* Checks and cleans an auction-analysis reply. Returns a safe object or null. */
export function cleanAuction(o) {
  if (!o || typeof o !== "object") return null;
  const num = v => (v === null || v === undefined || v === "" ? null : (Number.isFinite(+v) ? +v : null));
  const a = o.auction || {};
  const units = (Array.isArray(o.units) ? o.units : []).slice(0, 40).map(u => ({
    model: str(u && u.model, 120) || "Unknown model",
    qty: Math.max(0, Math.round(n(u && u.qty))),
    cpu: str(u && u.cpu, 80), ram: str(u && u.ram, 40), storage: str(u && u.storage, 60), condition: str(u && u.condition, 200),
    win11: ["yes", "no"].includes(u && u.win11) ? u.win11 : "unknown",
    resaleLow: Math.max(0, n(u && u.resaleLow)), resaleHigh: Math.max(0, n(u && u.resaleHigh))
  }));
  const di = o.dealInputs || {};
  return {
    title: str(o.title, 160) || "Auction lot",
    auction: { site: str(a.site, 80), closes: str(a.closes, 80), currentBid: num(a.currentBid), buyerPremiumPct: num(a.buyerPremiumPct),
      location: str(a.location, 120), pickup: str(a.pickup, 300), payment: str(a.payment, 200) },
    units,
    totalUnits: Math.max(0, Math.round(n(o.totalUnits))) || units.reduce((s, u) => s + u.qty, 0),
    missing: (Array.isArray(o.missing) ? o.missing : []).slice(0, 12).map(x => str(x, 200)).filter(Boolean),
    redFlags: (Array.isArray(o.redFlags) ? o.redFlags : []).slice(0, 12)
      .map(f => ({ level: ["high", "medium", "low"].includes(f && f.level) ? f.level : "medium", text: str(f && (f.text || f), 300) }))
      .filter(f => f.text),
    questions: (Array.isArray(o.questions) ? o.questions : []).slice(0, 8).map(x => str(x, 300)).filter(Boolean),
    verdict: { rating: ["Strong", "Worth a look", "Pass"].includes(o.verdict && o.verdict.rating) ? o.verdict.rating : "Worth a look",
      reason: str(o.verdict && o.verdict.reason, 500) },
    dealInputs: { qty: Math.max(0, Math.round(n(di.qty))), resale: Math.max(0, n(di.resale)), refurb: Math.max(0, n(di.refurb)),
      defect: Math.min(100, Math.max(0, n(di.defect))), parts: Math.max(0, n(di.parts)),
      prem: num(di.prem) === null ? 10 : Math.max(0, n(di.prem)), freight: Math.max(0, n(di.freight)) }
  };
}

/* ---------- Knowledge library ---------- */
/* Turns a YouTube transcript or caption file (.srt / .vtt / copied "Show transcript" text) into clean prose. */
export function cleanTranscript(raw) {
  const lines = String(raw || "").replace(/\r/g, "").split("\n");
  const out = [];
  let last = "";
  for (let l of lines) {
    l = l.trim();
    if (!l) continue;
    if (/^WEBVTT/i.test(l) || /^(Kind|Language|NOTE)\b/.test(l)) continue;
    if (/^\d+$/.test(l)) continue;                                              // srt cue numbers
    if (/-->/.test(l)) continue;                                                // cue timings
    if (/^\(?\d{1,2}:\d{2}(:\d{2})?\)?$/.test(l)) continue;                      // "0:00" lines from Show transcript
    l = l.replace(/^\d{1,2}:\d{2}(:\d{2})?\s+/, "")                             // "0:12 text" on one line
         .replace(/<[^>]+>/g, "").replace(/\{[^}]*\}/g, "")                     // vtt / styling tags
         .replace(/\[(music|applause|laughter|inaudible)\]/gi, "").trim();
    if (!l || l === last) continue;                                             // auto captions repeat lines
    out.push(l); last = l;
  }
  // Join into paragraphs of roughly 5 sentences / 600 characters.
  const text = out.join(" ").replace(/\s+/g, " ").trim();
  const paras = []; let cur = "";
  for (const sent of text.split(/(?<=[.!?])\s+/)) {
    cur += (cur ? " " : "") + sent;
    if (cur.length > 600) { paras.push(cur); cur = ""; }
  }
  if (cur) paras.push(cur);
  return paras.join("\n\n");
}
export const wordCount = s => (String(s || "").match(/\S+/g) || []).length;

/* ---------- Onboarding ---------- */
export const PLAYBOOK_IDS = ["model","setup","sourcing","diligence","intake","qc","wipe","grading","repairs","photos","listing","pricing","shipping","support","rhythm"];

export function intakeText(it = {}) {
  const yn = v => ({ yes: "Yes", no: "No", unsure: "Not sure" }[v] || "Not answered");
  return [
    `Name: ${str(it.name, 100) || "not given"}`,
    `Location: ${str(it.location, 100) || "not given"}`,
    `Starting capital for inventory: $${n(it.capital)}`,
    `Hours per week available: ${n(it.hours)}`,
    `Experience: ${str(it.experience, 200) || "not given"}`,
    `90-day goal: ${str(it.goal, 400) || "not given"}`,
    `Has a seller's permit / resale certificate: ${yn(it.permit)}`,
    `Marketplace seller accounts already set up: ${str(it.accounts, 200) || "none"}`,
    `Owns basic repair toolkit: ${yn(it.toolkit)}`,
    `Preferred sourcing: ${str(it.sourcing, 100) || "not sure yet"}`,
    `Biggest worry or question: ${str(it.concern, 600) || "none given"}`
  ].join("\n");
}

/* Checks and cleans a roadmap reply. Returns { summary, tasks } or null. */
export function cleanRoadmap(obj) {
  if (!obj || !Array.isArray(obj.tasks)) return null;
  const tasks = obj.tasks
    .filter(t => t && str(t.title, 200))
    .slice(0, 40)
    .map(t => ({
      phase: Math.min(3, Math.max(1, Math.round(n(t.phase)) || 1)),
      week: Math.min(13, Math.max(1, Math.round(n(t.week)) || 1)),
      title: str(t.title, 160),
      details: str(t.details, 700),
      playbook: PLAYBOOK_IDS.includes(t.playbook) ? t.playbook : ""
    }))
    .sort((a, b) => a.week - b.week || a.phase - b.phase)
    .map((t, i) => ({ ...t, sort: i }));
  if (tasks.length < 5) return null;
  return { summary: str(obj.summary, 800), tasks };
}

/* Reads a JSON object out of a model reply (whole reply, a code fence, or first { to last }). */
export function parseJsonReply(text) {
  const t = String(text || "").trim();
  try { return JSON.parse(t); } catch {}
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  return null;
}
