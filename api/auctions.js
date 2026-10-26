// GET /api/auctions → the signed-in student's 10 most recent auction analyses.
import { getUser, getStudent, db, enc, configured, studentFor } from "../lib/supa.js";
import { json } from "../lib/http.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  const user = await getUser(req);
  if (!user) return json({ error: "signed_out" }, 401);
  const s = await studentFor(user);
  if (!s || s.status === "paused") return json({ error: "not_enrolled" }, 403);
  const auctions = await db(`auctions?student_id=eq.${enc(s.id)}&select=id,url,title,rating,result,created_at&order=created_at.desc&limit=10`);
  return json({ auctions });
}
