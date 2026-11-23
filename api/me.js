// GET /api/me → the signed-in student's profile, roadmap tasks and last check-in.
import { getUser, isAdmin, getStudent, updateStudent, db, enc, nowIso, configured, studentFor } from "../lib/supa.js";
import { json } from "../lib/http.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  const user = await getUser(req);
  if (!user) return json({ error: "signed_out" }, 401);
  const admin = isAdmin(user.email);
  const s = await studentFor(user);
  if (!s) return admin ? json({ admin: true, student: null, tasks: [], lastCheckin: null }) : json({ error: "not_enrolled" }, 403);
  if (s.status === "paused") return json({ error: "paused" }, 403);

  const [tasks, checkins] = await Promise.all([
    db(`tasks?student_id=eq.${enc(s.id)}&select=id,phase,week,sort,title,details,playbook_id,done,done_at&order=sort.asc`),
    db(`checkins?student_id=eq.${enc(s.id)}&select=week_label,created_at&order=created_at.desc&limit=1`)
  ]);
  const last = s.last_active_at ? Date.parse(s.last_active_at) : 0;
  if (Date.now() - last > 60 * 60 * 1000) await updateStudent(s.id, { last_active_at: nowIso() });

  return json({
    admin,
    student: {
      id: s.id, name: s.name, email: s.email, status: s.status, intake: s.intake,
      roadmap_summary: s.roadmap_summary, onboarded_at: s.onboarded_at,
      tasks_total: s.tasks_total, tasks_done: s.tasks_done, password_set: !!s.password_set
    },
    tasks,
    lastCheckin: checkins[0] || null
  });
}
