// POST /api/login  { email }  → emails a one-click sign-in link to enrolled students and coaches.
// Always answers the same way, so nobody can use it to check who is enrolled.
import { getStudentByEmail, isAdmin, signInLink, configured } from "../lib/supa.js";
import { sendEmail, templates } from "../lib/email.js";
import { json, readJson, isEmail } from "../lib/http.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  let body;
  try { body = await readJson(req, 5000); } catch (e) { return json({ error: e.message }, e.status || 400); }
  const email = String(body.email || "").trim().toLowerCase();
  if (!isEmail(email)) return json({ error: "bad_email" }, 400);

  try {
    const admin = isAdmin(email);
    const student = await getStudentByEmail(email);
    if (admin || (student && student.status !== "paused")) {
      const { link } = await signInLink(email, admin && !student ? "/admin.html" : "/");
      const t = templates.login(student ? student.name : "Coach", link);
      await sendEmail({ to: email, ...t });
    }
  } catch (e) {
    console.error("Login link failed", e && e.message);
  }
  return json({ ok: true });
}
