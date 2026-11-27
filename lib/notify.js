// Sends student notifications: email and SMS, both through your GoHighLevel workflow (see lib/email.js).
//
// SMS: the Hub POSTs one JSON event to your GoHighLevel "Inbound Webhook" workflow (GHL_WEBHOOK_URL).
// The payload carries a ready-written `sms` text, so the workflow only needs:
//   Inbound Webhook trigger → Find/Create Contact (by email, update phone) → Send SMS with body {{inboundWebhookRequest.sms}}
// Optional: add a "time window" wait (9am–8pm) before the SMS step for quiet hours.
import { siteUrl } from "./supa.js";
import { sendEmail } from "./email.js";
import { ghlApi, contactFor, sendMessage } from "./ghl.js";
import { logOut } from "./outbox.js";

const first = name => String(name || "").trim().split(/\s+/)[0] || "";
const last = name => String(name || "").trim().split(/\s+/).slice(1).join(" ");

export async function sms(event, student, text, data = {}) {
  if (!text || student.sms_opt_out) return false;
  if (!student.phone && ghlApi()) return false;
  let ok = false;
  if (ghlApi()) {
    try { ok = await sendMessage({ contactId: await contactFor(student), type: "SMS", message: text }); }
    catch (e) { console.error("GoHighLevel SMS failed", e && e.message); }
  } else {
    const url = process.env.GHL_WEBHOOK_URL;
    if (!url) return false;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel: "sms", event, email: student.email, phone: student.phone || "",
          first_name: first(student.name), last_name: last(student.name), full_name: student.name || "",
          business_name: student.business_name || "", owner: student.owner || "", hub_url: siteUrl() + "/",
          sms: text, ...data
        })
      });
      ok = r.ok; if (!r.ok) console.error("GoHighLevel webhook failed", r.status);
    } catch (e) { console.error("GoHighLevel webhook failed", e && e.message); }
  }
  await logOut(student, { channel: "sms", event, body: text, ok });
  return ok;
}

/** Email + SMS together. Returns {email, sms}. */
export async function notify(student, { event, email, text, data }) {
  const [e, s] = await Promise.all([
    email ? sendEmail({ to: student.email, student, event, ...email }) : Promise.resolve(false),
    text ? sms(event, student, text, data) : Promise.resolve(false)
  ]);
  return { email: e, sms: s };
}
