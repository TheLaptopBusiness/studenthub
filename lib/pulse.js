// Weekly check-in ("pulse") links. Each student gets a private link per week that works without
// signing in: the link carries their id and the week, signed so nobody can forge one.
const secret = () => process.env.PULSE_SECRET || process.env.CRON_SECRET || process.env.ENROLL_SECRET || "";
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = s => atob(s.replace(/-/g, "+").replace(/_/g, "/"));
async function hmac(msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg))).slice(0, 22);
}
/** Monday's date (YYYY-MM-DD) of the week `date` falls in, in the program's timezone. */
export function weekKey(date = new Date(), tz = process.env.TIMEZONE || "America/Los_Angeles") {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
    .formatToParts(date).map(x => [x.type, x.value]));
  const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
  const back = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[p.weekday];
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}
export const weekLabel = wk => "Week of " + new Date(wk + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
export async function pulseToken(studentId, week) {
  const raw = btoa(`${studentId}.${week}`).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${raw}.${await hmac(studentId + "." + week)}`;
}
export async function readToken(t) {
  const [raw, sig] = String(t || "").split(".");
  if (!raw || !sig || !secret()) return null;
  let decoded; try { decoded = fromB64u(raw); } catch { return null; }
  const [studentId, week] = decoded.split(".");
  if (!/^[0-9a-f-]{36}$/i.test(studentId || "") || !/^\d{4}-\d{2}-\d{2}$/.test(week || "")) return null;
  return (await hmac(studentId + "." + week)) === sig ? { studentId, week } : null;
}
