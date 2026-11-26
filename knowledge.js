// /api/knowledge — coach-only. Manages the Coach Knowledge library.
// GET                → list (no full text) + totals
// GET ?id=<id>       → one item with full text
// POST {action:"add", kind, title, source_url, content, clean}   (clean: true for transcripts / caption files)
// POST {action:"update", id, title?, source_url?, content?, active?}
// POST {action:"delete", id}
import { getUser, isAdmin, db, enc, nowIso, configured } from "../lib/supa.js";
import { cleanTranscript, wordCount } from "../public/prompts.js";
import { json, readJson } from "../lib/http.js";

export const config = { runtime: "edge" };
const KINDS = ["video", "doc", "rules", "faq"];
const isId = s => /^[0-9a-f-]{36}$/i.test(String(s || ""));

export default async function handler(req) {
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  const user = await getUser(req);
  if (!user) return json({ error: "signed_out" }, 401);
  if (!isAdmin(user.email)) return json({ error: "forbidden" }, 403);

  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id");
    if (id) {
      if (!isId(id)) return json({ error: "bad_request" }, 400);
      const rows = await db(`knowledge?id=eq.${enc(id)}&select=*`);
      return rows[0] ? json({ item: rows[0] }) : json({ error: "not_found" }, 404);
    }
    const items = await db("knowledge?select=id,kind,title,source_url,words,active,created_at,updated_at&order=created_at.desc&limit=2000");
    const activeWords = items.filter(i => i.active && i.kind !== "faq").reduce((s, i) => s + i.words, 0);
    const maxChars = parseInt(process.env.KNOWLEDGE_MAX_CHARS || "200000", 10);
    return json({ items, activeWords, readsAllUpToWords: Math.round(maxChars / 6) });
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body;
  try { body = await readJson(req, 3_000_000); } catch (e) { return json({ error: e.message }, e.status || 400); }

  if (body.action === "add") {
    const kind = KINDS.includes(body.kind) ? body.kind : "video";
    let content = String(body.content || "");
    if (body.clean) content = cleanTranscript(content);
    content = content.trim().slice(0, 400000);
    const title = String(body.title || "").trim().slice(0, 200);
    if (!title || !content) return json({ error: "Add a title and some text." }, 400);
    const rows = await db("knowledge", { method: "POST", prefer: "return=representation", body: {
      kind, title, source_url: String(body.source_url || "").trim().slice(0, 500), content, words: wordCount(content)
    } });
    return json({ ok: true, item: { ...rows[0], content: undefined } });
  }

  if (!isId(body.id)) return json({ error: "bad_request" }, 400);

  if (body.action === "update") {
    const f = { updated_at: nowIso() };
    if (typeof body.title === "string") f.title = body.title.trim().slice(0, 200);
    if (typeof body.source_url === "string") f.source_url = body.source_url.trim().slice(0, 500);
    if (typeof body.content === "string") { f.content = body.content.trim().slice(0, 400000); f.words = wordCount(f.content); }
    if (typeof body.active === "boolean") f.active = body.active;
    await db(`knowledge?id=eq.${enc(body.id)}`, { method: "PATCH", prefer: "return=minimal", body: f });
    return json({ ok: true });
  }
  if (body.action === "delete") {
    await db(`knowledge?id=eq.${enc(body.id)}`, { method: "DELETE", prefer: "return=minimal" });
    return json({ ok: true });
  }
  return json({ error: "bad_request" }, 400);
}
