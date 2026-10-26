// POST /api/password {password} → sets or changes the signed-in person's password.
// Forgot your password? Sign in with an email link, then set a new one here.
import { getUser, isAdmin, studentFor, updateStudent, setPassword, configured } from "../lib/supa.js";
import { json, readJson } from "../lib/http.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  const user = await getUser(req);
  if (!user) return json({ error: "signed_out" }, 401);
  const student = await studentFor(user);
  if (!student && !isAdmin(user.email)) return json({ error: "not_enrolled" }, 403);
  if (student && student.status === "paused") return json({ error: "paused" }, 403);
  let body;
  try { body = await readJson(req, 2000); } catch (e) { return json({ error: e.message }, e.status || 400); }
  const password = String(body.password || "");
  if (password.length < 8) return json({ error: "Use at least 8 characters." }, 400);
  if (password.length > 72) return json({ error: "Use 72 characters or fewer." }, 400);
  if (/^(password|12345678|qwertyui)/i.test(password)) return json({ error: "Pick something harder to guess." }, 400);
  try { await setPassword(user.id, password); }
  catch (e) { console.error(e.message); return json({ error: "Couldn't save your password. Try again in a minute." }, 502); }
  if (student) await updateStudent(student.id, { password_set: true });
  return json({ ok: true });
}
