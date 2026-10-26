// POST /api/ai — every AI feature in the hub goes through here.
// The student must be signed in. Your Anthropic key stays on the server.
// Env: ANTHROPIC_API_KEY, CLAUDE_MODEL (optional), AI_DAILY_LIMIT (optional, default 40 per student per day)
import { buildPrompt, parseJsonReply, cleanRoadmap, cleanAuction } from "../public/prompts.js";
import { fetchAuctionText } from "../lib/pagetext.js";
import { loadKnowledge } from "../lib/knowledge.js";
import { getUser, isAdmin, getStudent, updateStudent, db, enc, nowIso, recountTasks, configured, studentFor } from "../lib/supa.js";
import { json } from "../lib/http.js";

export const config = { runtime: "edge" };

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BODY = 4_000_000;
const MAX_IMAGES = 4;

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!configured() || !process.env.ANTHROPIC_API_KEY) return json({ error: "server_not_configured" }, 500);

  const user = await getUser(req);
  if (!user) return json({ error: "signed_out" }, 401);
  const admin = isAdmin(user.email);
  const student = await studentFor(user);
  if (!student && !admin) return json({ error: "not_enrolled" }, 403);
  if (student && student.status === "paused") return json({ error: "paused" }, 403);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: "too_large" }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: "bad_request" }, 400); }
  if ((body.tool === "roadmap" || body.tool === "checkin") && !student) return json({ error: "not_enrolled" }, 403);

  // Auction links are opened here on the server (only for known auction sites).
  let fetchNote = "";
  if (body.tool === "auction") {
    body.data = body.data || {};
    const { text, note } = await fetchAuctionText(body.data.url);
    body.data.pageText = text;
    body.data.fetchNote = note;
    fetchNote = note;
  }

  // The Coach reads Abdi's knowledge library (always loaded here, never taken from the browser).
  if (body.data && typeof body.data === "object") delete body.data.knowledge;
  if (body.tool === "coach") {
    const turns = Array.isArray(body.data && body.data.turns) ? body.data.turns : [];
    const recentQuestions = turns.filter(t => t && t.role === "user").slice(-2).map(t => String(t.content || "")).join(" ");
    try { body.data.knowledge = await loadKnowledge(recentQuestions); }
    catch (e) { console.error("Knowledge load failed", e && e.message); }
  }

  let p;
  try { p = buildPrompt(body.tool, body.data || {}); }
  catch (e) { return json({ error: "bad_request", message: e.message }, 400); }

  // Daily usage cap per student (admins are not capped).
  if (student) {
    const limit = parseInt(process.env.AI_DAILY_LIMIT || "40", 10);
    const today = new Date().toISOString().slice(0, 10);
    const used = student.ai_day === today ? student.ai_count : 0;
    if (used >= limit) return json({ error: "daily_limit" }, 429);
    await updateStudent(student.id, { ai_day: today, ai_count: used + 1, last_active_at: nowIso() });
  }

  const messages = p.messages.map(m => ({ role: m.role, content: m.content }));
  const images = ["deal", "listing", "auction"].includes(body.tool) && Array.isArray(body.images)
    ? body.images.filter(im => im && IMAGE_TYPES.includes(im.media_type) && typeof im.data === "string").slice(0, MAX_IMAGES)
    : [];
  if (images.length) {
    const last = messages[messages.length - 1];
    last.content = [
      ...images.map(im => ({ type: "image", source: { type: "base64", media_type: im.media_type, data: im.data } })),
      { type: "text", text: last.content }
    ];
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: (body.tool === "coach" && process.env.COACH_MODEL) || process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
      max_tokens: p.maxTokens,
      // The long, unchanging part (instructions + library) is cached by Anthropic so repeat questions cost less.
      system: p.systemParts
        ? [{ type: "text", text: p.systemParts[0], cache_control: { type: "ephemeral" } }, { type: "text", text: p.systemParts[1] }]
        : p.system,
      messages, stream: true
    })
  });
  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("Anthropic API error", upstream.status, detail.slice(0, 500));
    if (upstream.status === 429 || upstream.status === 529) return json({ error: "busy" }, 429);
    return json({ error: "upstream_error" }, 502);
  }

  // What to save once the answer is complete.
  const onComplete = async full => {
    if (body.tool === "roadmap") {
      const rm = cleanRoadmap(parseJsonReply(full));
      if (!rm) throw new Error("Roadmap reply could not be read.");
      await db(`tasks?student_id=eq.${enc(student.id)}`, { method: "DELETE", prefer: "return=minimal" });
      await db("tasks", { method: "POST", prefer: "return=minimal", body: rm.tasks.map(t => ({
        student_id: student.id, phase: t.phase, week: t.week, sort: t.sort, title: t.title, details: t.details, playbook_id: t.playbook
      })) });
      const intake = (body.data && body.data.intake) || {};
      await updateStudent(student.id, {
        intake, roadmap_summary: rm.summary,
        onboarded_at: student.onboarded_at || nowIso(),
        status: student.status === "invited" ? "active" : student.status,
        name: String(intake.name || student.name || "").slice(0, 100)
      });
      await recountTasks(student.id);
    } else if (body.tool === "auction") {
      const a = cleanAuction(parseJsonReply(full));
      if (!a) throw new Error("Auction reply could not be read.");
      await db("auctions", { method: "POST", prefer: "return=minimal", body: {
        student_id: student.id, url: String((body.data && body.data.url) || "").slice(0, 500),
        title: a.title, rating: a.verdict.rating, result: a
      } });
    } else if (body.tool === "checkin") {
      const d = body.data || {};
      const data = {};
      for (const k of ["bought","spent","tested","listed","sold","rev","profit","hours","wins","stuck","goal"]) data[k] = String(d[k] ?? "").slice(0, 1500);
      await db("checkins", { method: "POST", prefer: "return=minimal", body: {
        student_id: student.id, week_label: String(d.week || "").slice(0, 60), data, report: full.slice(0, 20000)
      } });
      await updateStudent(student.id, { last_checkin_at: nowIso() });
    }
  };

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = "", full = "", failed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            let ev;
            try { ev = JSON.parse(line.slice(5)); } catch { continue; }
            if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") {
              full += ev.delta.text;
              controller.enqueue(encoder.encode(ev.delta.text));
            } else if (ev.type === "error") {
              console.error("Stream error", JSON.stringify(ev).slice(0, 500));
              failed = true;
            }
          }
        }
        if (!failed && student && full) {
          try { await onComplete(full); }
          catch (e) { console.error("Saving result failed", e && e.message); failed = true; }
        }
      } catch (e) {
        console.error("Stream read failed", e);
        failed = true;
      }
      if (failed) controller.enqueue(encoder.encode("\u0000ERROR"));
      controller.close();
    }
  });

  return new Response(stream, { headers: {
    "content-type": "text/plain; charset=utf-8", "cache-control": "no-store",
    ...(fetchNote ? { "x-fetch-note": encodeURIComponent(fetchNote) } : {})
  } });
}
