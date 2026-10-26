// Reads the text of an auction listing page so the AI can analyze a link.
// Only fetches from known auction sites (plus any in AUCTION_DOMAINS_EXTRA), never internal addresses.
import { AUCTION_DOMAINS } from "../public/prompts.js";

export function allowedAuctionUrl(raw) {
  let u;
  try { u = new URL(String(raw || "").trim()); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase();
  const extra = String(process.env.AUCTION_DOMAINS_EXTRA || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const ok = [...AUCTION_DOMAINS, ...extra].some(d => host === d || host.endsWith("." + d));
  if (!ok) return null;
  u.protocol = "https:";
  return u;
}

export function htmlToText(html) {
  const meta = [];
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:title|og:description|description)["'][^>]*content=["']([^"']+)["']/gi)) meta.push(m[1]);
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d)[^>]*>/gi, "\n")
    .replace(/<td[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return [title.trim(), ...meta, t].filter(Boolean).join("\n").slice(0, 25000);
}

/** Returns { text, note }. `note` explains to the AI (and the student) when the page couldn't be read. */
export async function fetchAuctionText(raw) {
  if (!raw) return { text: "", note: "" };
  const u = allowedAuctionUrl(raw);
  if (!u) return { text: "", note: "The link isn't from a supported auction site, so it wasn't opened. Rely on pasted text and screenshots." };
  try {
    const r = await fetch(u.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; StudentHubAuctionReader/1.0)", accept: "text/html" }
    });
    if (r.url && !allowedAuctionUrl(r.url)) return { text: "", note: "The auction link redirected to another site, so it wasn't read. Rely on pasted text and screenshots." };
    if (!r.ok) return { text: "", note: `The auction page couldn't be opened (status ${r.status}). Rely on pasted text and screenshots.` };
    const html = (await r.text()).slice(0, 2_000_000);
    const text = htmlToText(html);
    if (text.length < 400) return { text, note: "The auction page loaded but showed little readable text (the site may load listings with JavaScript). Rely mostly on pasted text and screenshots, and list what's missing." };
    return { text, note: "" };
  } catch {
    return { text: "", note: "The auction page didn't respond in time. Rely on pasted text and screenshots." };
  }
}
