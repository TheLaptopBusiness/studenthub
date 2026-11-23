// Loads Abdi's Coach Knowledge library for the AI Coach.
// Small library → the Coach reads all of it (and Anthropic caches it, so repeat questions cost less).
// Large library → the Coach reads the verified answers plus the parts most relevant to the question.
// Env: KNOWLEDGE_MAX_CHARS (default 200000 ≈ 50k words), KNOWLEDGE_RELEVANT_CHARS (default 60000)
import { db } from "./supa.js";

const STOP = new Set("the and for you your are with that this have from what how can should does did was were will would could about into when where which there their them then than they just like get got its it's i'm don't dont not but all any our out who why has had been being also more most some such very much many make one two use used using want need know ask lot lots".split(" "));
const terms = s => (String(s || "").toLowerCase().match(/[a-z0-9][a-z0-9.+-]{2,}/g) || []).filter(w => !STOP.has(w));

const LABEL = { video: "Video", doc: "Document", rules: "Abdi's rules" };

export function formatDoc(d, body) {
  return `### ${d.title || "Untitled"} (${LABEL[d.kind] || "Document"}${d.source_url ? ": " + d.source_url : ""})\n${body}`;
}

export function chunk(text, size = 1500) {
  // Split into sentences, then pack sentences into pieces of about `size` characters.
  const sentences = String(text || "").replace(/\s*\n\s*\n\s*/g, " \u2029 ").split(/(?<=[.!?])\s+|\s\u2029\s/).filter(Boolean);
  const out = []; let cur = "";
  for (let sent of sentences) {
    sent = sent.replace(/\u2029/g, "").trim();
    if (!sent) continue;
    while (sent.length > size) { if (cur) { out.push(cur); cur = ""; } out.push(sent.slice(0, size)); sent = sent.slice(size); }
    if (cur && cur.length + sent.length + 1 > size) { out.push(cur); cur = ""; }
    cur += (cur ? " " : "") + sent;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/** Picks the chunks of the library most relevant to `query`, up to `budget` characters. */
export function pickRelevant(docs, query, budget) {
  const q = [...new Set(terms(query))];
  const pieces = [];
  docs.forEach((d, di) => chunk(d.content).forEach((c, ci) => pieces.push({ d, di, ci, c, t: new Set(terms(d.title + " " + c)), title: new Set(terms(d.title)) })));
  if (!pieces.length) return "";
  const df = Object.fromEntries(q.map(w => [w, pieces.filter(p => p.t.has(w)).length]));
  for (const p of pieces) {
    p.score = q.reduce((s, w) => s + (p.t.has(w) ? Math.log(1 + pieces.length / (df[w] || 1)) * (p.title.has(w) ? 2 : 1) : 0), 0);
  }
  const ranked = pieces.filter(p => p.score > 0).sort((a, b) => b.score - a.score);
  const chosen = []; let used = 0;
  for (const p of ranked) {
    if (used + p.c.length > budget) continue;
    chosen.push(p); used += p.c.length;
  }
  // Keep each document's excerpts together and in their original order.
  chosen.sort((a, b) => a.di - b.di || a.ci - b.ci);
  const byDoc = new Map();
  for (const p of chosen) { if (!byDoc.has(p.di)) byDoc.set(p.di, { d: p.d, parts: [] }); byDoc.get(p.di).parts.push(p.c); }
  return [...byDoc.values()].map(({ d, parts }) => formatDoc(d, parts.join("\n\n[…]\n\n"))).join("\n\n");
}

/** Returns { verified, library, mode } for the Coach prompt. */
export async function loadKnowledge(query) {
  const [faqs, docs] = await Promise.all([
    db("knowledge?active=eq.true&kind=eq.faq&select=title,content&order=updated_at.desc&limit=1000"),
    db("knowledge?active=eq.true&kind=neq.faq&select=kind,title,source_url,content&order=created_at.asc&limit=1000")
  ]);
  const verified = faqs.map(f => `Q: ${f.title}\nA: ${f.content}`).join("\n\n");
  const max = parseInt(process.env.KNOWLEDGE_MAX_CHARS || "200000", 10);
  const total = docs.reduce((s, d) => s + d.content.length, 0);
  if (total <= max) {
    return { verified, library: docs.map(d => formatDoc(d, d.content)).join("\n\n"), mode: "all" };
  }
  const relevant = parseInt(process.env.KNOWLEDGE_RELEVANT_CHARS || "60000", 10);
  const lib = pickRelevant(docs, query, relevant);
  return {
    verified,
    library: lib ? "(Only the parts of the library most relevant to this question are shown.)\n\n" + lib : "",
    mode: "relevant"
  };
}
