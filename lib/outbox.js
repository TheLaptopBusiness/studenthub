// A log of every email and text the Hub sends to a student, shown on their page in the coach dashboard.
import { db } from "./supa.js";
export async function logOut(student, { channel, event, subject, body, ok }) {
  if (!student || !student.id) return;
  try {
    await db("outbox", { method: "POST", prefer: "return=minimal", body: {
      student_id: student.id, channel, event: String(event || "").slice(0, 60), subject: String(subject || "").slice(0, 300),
      body: String(body || "").replace(/\s+\n/g, "\n").slice(0, 1500), ok: !!ok
    } });
  } catch (e) { console.error("outbox log failed", e && e.message); }
}
