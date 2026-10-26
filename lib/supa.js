// Small helpers for talking to Supabase (database + logins) from the server.
// Uses the service role key, which must never reach the browser.
import { teamEmails } from "./team.js";

const base = () => String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
// Works with both kinds of Supabase key:
//  - new secret keys (sb_secret_…): sent only in the apikey header, as Supabase requires
//  - legacy service_role keys (a long JWT): sent in apikey and Authorization
const isNewKey = () => key().startsWith("sb_");
const svcHeaders = (extra = {}) => ({
  apikey: key(),
  ...(isNewKey() ? {} : { Authorization: `Bearer ${key()}` }),
  "content-type": "application/json",
  ...extra
});

export const configured = () => Boolean(base() && key());
export const nowIso = () => new Date().toISOString();
export const enc = v => encodeURIComponent(String(v));

/** Database call through Supabase's REST API. `path` is e.g. "students?id=eq.123&select=*". */
export async function db(path, { method = "GET", body, prefer } = {}) {
  const headers = svcHeaders(prefer ? { Prefer: prefer } : {});
  const r = await fetch(`${base()}/rest/v1/${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Database ${method} ${path.split("?")[0]} failed: ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

export async function getStudent(id) {
  const rows = await db(`students?id=eq.${enc(id)}&select=*`);
  return rows && rows[0] ? rows[0] : null;
}
export async function getStudentByEmail(email) {
  const rows = await db(`students?email=eq.${enc(String(email).toLowerCase())}&select=*`);
  return rows && rows[0] ? rows[0] : null;
}
/** The enrolled student for a signed-in user. Matches by login id first, then by verified email,
    so a student who later signs in with Google (a second login method) still reaches their own record. */
export async function studentFor(user) {
  if (!user) return null;
  const s = await getStudent(user.id);
  if (s) return s;
  if (user.email && (user.email_confirmed_at || user.confirmed_at)) return getStudentByEmail(user.email);
  return null;
}

/** Sets a password on a login account (admin API, server only). */
export async function setPassword(userId, password) {
  const r = await fetch(`${base()}/auth/v1/admin/users/${enc(userId)}`, {
    method: "PUT", headers: svcHeaders(), body: JSON.stringify({ password })
  });
  if (!r.ok) throw new Error(`Couldn't set password: ${r.status} ${(await r.text()).slice(0, 200)}`);
}

export async function updateStudent(id, fields) {
  await db(`students?id=eq.${enc(id)}`, { method: "PATCH", body: fields, prefer: "return=minimal" });
}

/** Who is calling? Reads the "Authorization: Bearer <access token>" header. Returns the Supabase user or null. */
export async function getUser(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || !configured()) return null;
  const r = await fetch(`${base()}/auth/v1/user`, { headers: { apikey: key(), Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u && u.id ? u : null;
}

/** Anyone in ADMIN_EMAILS or TEAM can open the coach dashboard. */
export function isAdmin(email) {
  return Boolean(email) && teamEmails().includes(String(email).toLowerCase());
}

export function siteUrl() {
  return String(process.env.SITE_URL || "").replace(/\/+$/, "");
}

/** Makes a one-click sign-in link. Creates the login account first if this email is new.
    Returns { link, userId }. */
export async function signInLink(email, redirectPath = "/") {
  email = String(email).trim().toLowerCase();
  const redirect_to = siteUrl() + redirectPath;
  const gen = async type => {
    const r = await fetch(`${base()}/auth/v1/admin/generate_link`, {
      method: "POST", headers: svcHeaders(), body: JSON.stringify({ type, email, redirect_to })
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j };
  };
  // "invite" creates the account if it doesn't exist; for an existing account use "magiclink".
  let res = await gen("invite");
  if (!res.ok) res = await gen("magiclink");
  if (!res.ok) throw new Error(`Couldn't create sign-in link: ${res.status} ${JSON.stringify(res.j).slice(0, 300)}`);
  const j = res.j;
  const link = j.action_link || (j.properties && j.properties.action_link);
  const userId = j.id || (j.user && j.user.id);
  if (!link || !userId) throw new Error("Sign-in link response was missing the link or user id.");
  return { link, userId };
}

/** Swap a refresh token for a fresh session (keeps students signed in). */
export async function refreshSession(refresh_token) {
  const r = await fetch(`${base()}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST", headers: svcHeaders(), body: JSON.stringify({ refresh_token })
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j && j.access_token ? j : null;
}

/** Recount a student's roadmap progress after a change. */
export async function recountTasks(studentId) {
  const rows = await db(`tasks?student_id=eq.${enc(studentId)}&select=done,done_at`);
  const total = rows.length;
  const done = rows.filter(r => r.done).length;
  const lastDone = rows.filter(r => r.done && r.done_at).map(r => r.done_at).sort().pop() || null;
  await updateStudent(studentId, { tasks_total: total, tasks_done: done, last_task_done_at: lastDone });
  return { total, done };
}
