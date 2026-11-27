// Reads a weekly check-in and decides whether the team should respond. Uses Claude when available,
// with simple rules as a backup, so a struggling student is never missed.
//   flag: "respond" (reach out today) · "watch" (keep an eye on them) · "ok" (celebrate the win)
const RULES = p => {
  const txt = `${p.win} ${p.challenge}`.toLowerCase();
  if (p.need_help || p.mood === "Tough" || /\b(quit|giv(e|ing) up|refund|cancel|overwhelm|can'?t afford|broke\b|scam|confus|lost\b|frustrat|stuck|struggl|hopeless|discourag|behind\b)/.test(txt))
    return { flag: "respond", reason: p.need_help ? "Asked for a coach to reach out." : p.mood === "Tough" ? "Called the week tough." : "Sounds stuck or discouraged." };
  if (p.challenge || p.mood === "Slow") return { flag: "watch", reason: p.challenge ? "Mentioned something slowing them down." : "Said the week was slow." };
  return { flag: "ok", reason: "Positive week." };
};

export async function analyzePulse({ student, pulse, progress, history = [], coach }) {
  const base = RULES(pulse);
  const out = { flag: base.flag, reason: base.reason, summary: "", reply: "" };
  if (!process.env.ANTHROPIC_API_KEY) return out;
  const first = String(student.name || "").split(/\s+/)[0] || "there";
  const coachFirst = String(coach || "Moses").split(/\s+/)[0];
  const prompt = `You support the coaching team at Laptop Business Mastery, a mentorship that helps students build a five-figure monthly laptop reselling side business (set up the business, open eBay and Facebook Marketplace, sell laptops we supply, then source and refurbish their own).

Read this student's weekly check-in and decide how the team should respond.

Student: ${student.name}
Their coach: ${coach}
Progress: ${progress}
This week's win: ${pulse.win || "(none)"}
How the week felt: ${pulse.mood || "(not given)"}
Anything slowing them down: ${pulse.challenge || "(nothing)"}
Asked for a coach to reach out: ${pulse.need_help ? "yes" : "no"}
Previous check-ins: ${history.length ? history.map(h => `[${h.week}] felt ${h.mood || "?"}; win: ${h.win}; challenge: ${h.challenge || "none"}`).join(" | ") : "none"}

Flag rules:
- "respond": they asked for help, sound discouraged, overwhelmed, confused, stuck, short on money, mention quitting or a refund, ask a question, or the same problem keeps coming back.
- "watch": a slow week, a vague answer, or a small obstacle we should check on next week.
- "ok": a good week with no real obstacle.
When in doubt between two flags, choose the more caring one.

Reply only with JSON, no other text:
{"flag":"respond|watch|ok","reason":"one short sentence for the coach, under 15 words","summary":"one sentence summarising the week","reply":"a warm message from their coach to ${first}: 2 to 4 short sentences, first person, do not sign it or mention any team member's name, celebrate the specific win, and if there is an obstacle give one concrete next step or offer a quick call. Friendly and human, no em dashes, no hashtags, never promise refunds or money."}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(20000)
    });
    if (!r.ok) throw new Error("status " + r.status);
    const j = await r.json();
    const text = (j.content || []).map(c => c.text || "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    const a = JSON.parse(m ? m[0] : text);
    const rank = { ok: 0, watch: 1, respond: 2 };
    const flag = ["ok", "watch", "respond"].includes(a.flag) ? a.flag : base.flag;
    // never let the AI downgrade a student who asked for help or called the week tough
    out.flag = rank[flag] >= rank[base.flag] || base.flag !== "respond" ? flag : base.flag;
    out.reason = String(a.reason || out.reason).slice(0, 200);
    out.summary = String(a.summary || "").slice(0, 400);
    out.reply = String(a.reply || "").slice(0, 1200);
  } catch (e) { console.error("check-in analysis failed", e && e.message); }
  return out;
}
