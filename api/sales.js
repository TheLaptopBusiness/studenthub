// /api/sales — the student's sales and profit tracker, and the community wins wall.
// GET                         → { sales, totals, first_sale, share_wins, wins }
// GET ?student=<id>           → (team) the same for one student
// POST {action:"add", model, platform, buy_price, sale_price, sold_on, supplied}
// POST {action:"delete", id}
// POST {action:"share", share}            → show or hide my sales on the wins wall
// Team requests add student: "<id>".
import { getUser, isAdmin, getStudent, studentFor, updateStudent, db, enc, nowIso, configured, siteUrl } from "../lib/supa.js";
import { firstSale, totals, logAction } from "../lib/care.js";
import { templates, sendEmail } from "../lib/email.js";
import { notify } from "../lib/notify.js";
import { teamEmails, teamName } from "../lib/team.js";
import { json, readJson } from "../lib/http.js";

export const config = { runtime: "edge" };
const isId = s => /^[0-9a-f-]{36}$/i.test(String(s || ""));
const first = name => String(name || "").trim().split(/\s+/)[0] || "there";
export const PLATFORMS = ["eBay", "Amazon", "Facebook Marketplace", "Other"];
const MILESTONES = [5, 10, 25, 50, 100, 250, 500];
const money = v => { const n = Number(String(v ?? "").replace(/[$,\s]/g, "")); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN; };
const city = loc => String(loc || "").split(",")[0].trim();

async function who(req, studentId) {
  const user = await getUser(req);
  if (!user) return { error: json({ error: "signed_out" }, 401) };
  const team = isAdmin(user.email);
  if (studentId) {
    if (!team) return { error: json({ error: "forbidden" }, 403) };
    if (!isId(studentId)) return { error: json({ error: "bad_request" }, 400) };
    const s = await getStudent(studentId);
    return s ? { student: s, asTeam: true, actor: teamName(user.email) } : { error: json({ error: "not_found" }, 404) };
  }
  const s = await studentFor(user);
  if (!s) return { error: json({ error: team ? "no_student" : "not_enrolled" }, team ? 404 : 403) };
  if (s.status === "paused") return { error: json({ error: "paused" }, 403) };
  return { student: s, asTeam: false, actor: s.name || "Student" };
}

export async function winsWall(limit = 12) {
  const rows = await db(`sales?select=student_id,model,platform,buy_price,sale_price,sold_on,created_at&order=created_at.desc&limit=60`).catch(() => []);
  if (!rows.length) return [];
  const ids = [...new Set(rows.map(r => r.student_id))];
  const studs = await db(`students?id=in.(${ids.map(enc).join(",")})&select=id,name,location,share_wins,status&limit=200`).catch(() => []);
  const by = Object.fromEntries(studs.map(s => [s.id, s]));
  return rows.filter(r => by[r.student_id] && by[r.student_id].share_wins !== false && by[r.student_id].status !== "paused").slice(0, limit).map(r => ({
    name: first(by[r.student_id].name), city: city(by[r.student_id].location), model: r.model, platform: r.platform,
    profit: Math.round(((Number(r.sale_price) || 0) - (Number(r.buy_price) || 0)) * 100) / 100, at: r.created_at
  }));
}

async function respond(s) {
  const fresh = await getStudent(s.id);
  const [sales, wins] = await Promise.all([
    db(`sales?student_id=eq.${enc(s.id)}&select=*&order=sold_on.desc,created_at.desc&limit=1000`),
    winsWall()
  ]);
  return json({ sales, totals: totals(sales), first_sale: firstSale(fresh), share_wins: fresh.share_wins !== false, wins, platforms: PLATFORMS });
}

/** Celebrations: the first sale, then laptop milestones. Email + text from Abdi, a note on their board, and the team hears about it. */
async function celebrate(s, sale, count, profitTotal) {
  const profit = (Number(sale.sale_price) || 0) - (Number(sale.buy_price) || 0);
  if (count === 1) {
    await updateStudent(s.id, { first_sale_at: nowIso() });
    await notify(s, {
      event: "first_sale",
      email: templates.firstSale(s.name, sale, profit),
      text: `${first(s.name)}, YOU MADE YOUR FIRST SALE! ${sale.model ? sale.model + " sold" : "Laptop sold"}${profit > 0 ? ` for $${profit.toLocaleString("en-US")} profit` : ""}. This is the moment it becomes a real business. I'm so proud of you. Now let's do it again.`
    });
    const to = teamEmails();
    if (to.length) await sendEmail({ to, subject: `🎉 First sale: ${s.name || s.email}`, html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#17162b"><p><strong>${s.name || s.email}</strong> just logged their first sale: ${sale.model || "a laptop"} on ${sale.platform || "a marketplace"}${profit ? `, $${profit} profit` : ""}.</p><p>Send them a quick personal congratulations today.</p><p><a href="${siteUrl()}/admin#student=${s.id}">Open their page</a></p></div>` }).catch(() => {});
    return;
  }
  if (MILESTONES.includes(count)) {
    await notify(s, {
      event: "sales_milestone",
      email: templates.salesMilestone(s.name, count, profitTotal),
      text: `${first(s.name)}, that's ${count} laptops sold! $${Math.round(profitTotal).toLocaleString("en-US")} profit so far. Keep stacking those wins.`
    });
  }
}

export default async function handler(req) {
  if (!configured()) return json({ error: "server_not_configured" }, 500);
  if (req.method === "GET") {
    const w = await who(req, new URL(req.url).searchParams.get("student"));
    return w.error || respond(w.student);
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body;
  try { body = await readJson(req, 10000); } catch (e) { return json({ error: e.message }, e.status || 400); }
  const w = await who(req, body.student);
  if (w.error) return w.error;
  const s = w.student;

  if (body.action === "add") {
    const model = String(body.model || "").trim().slice(0, 120);
    const platform = PLATFORMS.includes(body.platform) ? body.platform : "";
    const buy = money(body.buy_price), sell = money(body.sale_price);
    if (!model) return json({ error: "Add the laptop model, e.g. Dell Latitude 7490." }, 400);
    if (!platform) return json({ error: "Pick where you sold it." }, 400);
    if (!(sell > 0)) return json({ error: "Add what it sold for." }, 400);
    if (isNaN(buy)) return json({ error: "Add what you paid for it (0 is fine)." }, 400);
    let sold = String(body.sold_on || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sold) || isNaN(Date.parse(sold))) sold = new Date().toISOString().slice(0, 10);
    if (Date.parse(sold) > Date.now() + 864e5) return json({ error: "The sale date can't be in the future." }, 400);
    const row = { student_id: s.id, model, platform, buy_price: buy, sale_price: sell, sold_on: sold, supplied: !!body.supplied };
    await db("sales", { method: "POST", prefer: "return=minimal", body: row });
    await updateStudent(s.id, w.asTeam ? { last_contact_at: nowIso() } : { last_activity_at: nowIso(), last_active_at: nowIso() });
    const all = await db(`sales?student_id=eq.${enc(s.id)}&select=sale_price,buy_price&limit=5000`);
    const profitTotal = all.reduce((a, r) => a + (Number(r.sale_price) || 0) - (Number(r.buy_price) || 0), 0);
    try { await celebrate(s, row, all.length, profitTotal); } catch (e) { console.error("Celebration failed", e && e.message); }
    if (w.asTeam) await logAction(w.actor, "sale_added", s, `${model}, $${sell}`);
    const r = await respond(s);
    const j = await r.json();
    return json({ ...j, celebrate: all.length === 1 ? "first" : MILESTONES.includes(all.length) ? "milestone" : "" });
  }
  if (body.action === "delete") {
    if (!isId(body.id)) return json({ error: "bad_request" }, 400);
    await db(`sales?id=eq.${enc(body.id)}&student_id=eq.${enc(s.id)}`, { method: "DELETE", prefer: "return=minimal" });
    const left = await db(`sales?student_id=eq.${enc(s.id)}&select=id&limit=1`);
    if (!left.length && s.first_sale_at) await updateStudent(s.id, { first_sale_at: null });
    if (w.asTeam) await logAction(w.actor, "sale_deleted", s, "");
    return respond(s);
  }
  if (body.action === "share") {
    await updateStudent(s.id, { share_wins: !!body.share });
    return respond(s);
  }
  return json({ error: "bad_request" }, 400);
}
