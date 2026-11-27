// GoHighLevel Private Integration (API v2). When GHL_API_KEY and GHL_LOCATION_ID are set, the Hub
// sends emails and texts straight through GoHighLevel's API: no workflow to build, and every
// message shows up in the contact's Conversations. Without them, the Hub falls back to the
// Inbound Webhook workflow (GHL_WEBHOOK_URL).
// Env: GHL_API_KEY (Private Integration token), GHL_LOCATION_ID (sub-account id),
//      GHL_EMAIL_FROM (optional, e.g. "Laptop Business Mastery <admin@thelaptopbusiness.com>")
import { db, enc } from "./supa.js";

const API = "https://services.leadconnectorhq.com";
export const ghlApi = () => Boolean(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID);
const headers = version => ({
  Authorization: `Bearer ${process.env.GHL_API_KEY}`, Version: version,
  "Content-Type": "application/json", Accept: "application/json"
});

/** Phone numbers into the +15551234567 form GoHighLevel expects (US/Canada numbers without a country code get +1). */
export function e164(p) {
  const raw = String(p || "").trim(); if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return "+" + d;
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  return "+" + d;
}
const split = n => { const w = String(n || "").trim().split(/\s+/); return { firstName: w[0] || "", lastName: w.slice(1).join(" ") }; };

/** Create or update a contact (matched by email/phone, so existing marketing contacts are reused). Returns the contact id. */
export async function upsertContact({ email, phone, name }) {
  const body = { locationId: process.env.GHL_LOCATION_ID, source: "Student Hub" };
  if (email) body.email = String(email).toLowerCase();
  if (phone) body.phone = e164(phone);
  if (name) Object.assign(body, split(name));
  const r = await fetch(`${API}/contacts/upsert`, { method: "POST", headers: headers("2021-07-28"), body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GoHighLevel contact failed: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  const id = (j.contact && j.contact.id) || j.id;
  if (!id) throw new Error("GoHighLevel contact response had no id.");
  return id;
}

/** The student's GoHighLevel contact id, created once and remembered. */
export async function contactFor(student) {
  if (student.ghl_contact_id) return student.ghl_contact_id;
  // email and text go out at the same moment: share one lookup instead of creating the contact twice
  if (!student._ghl) student._ghl = upsertContact({ email: student.email, phone: student.phone, name: student.name });
  let id; try { id = await student._ghl; } catch (e) { delete student._ghl; throw e; }
  if (student.ghl_contact_id === id) return id;
  student.ghl_contact_id = id;
  if (student.id) await db(`students?id=eq.${enc(student.id)}`, { method: "PATCH", prefer: "return=minimal", body: { ghl_contact_id: id } }).catch(() => {});
  return id;
}

/** Send one message. type: "SMS" or "Email". */
export async function sendMessage({ contactId, type, message, subject, html }) {
  const body = { type, contactId };
  if (type === "SMS") body.message = message;
  else {
    body.subject = subject; body.html = html; body.message = message || "";
    if (process.env.GHL_EMAIL_FROM) body.emailFrom = process.env.GHL_EMAIL_FROM;
  }
  const r = await fetch(`${API}/conversations/messages`, { method: "POST", headers: headers("2021-04-15"), body: JSON.stringify(body) });
  if (!r.ok) { lastErr = `GoHighLevel ${r.status}: ${(await r.text().catch(() => "")).slice(0, 220)}`; console.error("GoHighLevel send failed", type, lastErr); return false; }
  return true;
}
let lastErr = "";
export const lastGhlError = () => lastErr;
