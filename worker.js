// Cloudflare Worker entry: serves the Hub pages from /public and runs each /api/* handler.
// The hourly reminder job runs from the cron trigger in wrangler.jsonc.
import admin from "./api/admin.js";
import ai from "./api/ai.js";
import auctions from "./api/auctions.js";
import checklist from "./api/checklist.js";
import config from "./api/config.js";
import cron from "./api/cron.js";
import enroll from "./api/enroll.js";
import feedback from "./api/feedback.js";
import knowledge from "./api/knowledge.js";
import login from "./api/login.js";
import me from "./api/me.js";
import password from "./api/password.js";
import refresh from "./api/refresh.js";
import tasks from "./api/tasks.js";
import pulse from "./api/pulse.js";
import sales from "./api/sales.js";

const routes = { admin, ai, auctions, checklist, config, cron, enroll, feedback, knowledge, login, me, password, refresh, tasks, pulse, sales };

// Make settings available as process.env (also done by Cloudflare's nodejs_compat; this is a safety net).
function loadEnv(env) {
  globalThis.process = globalThis.process || { env: {} };
  process.env = process.env || {};
  for (const [k, v] of Object.entries(env || {})) if (typeof v === "string" && process.env[k] === undefined) process.env[k] = v;
}

export default {
  async fetch(request, env, ctx) {
    loadEnv(env);
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/api\/([a-z]+)\/?$/);
    if (m) {
      const handler = routes[m[1]];
      if (!handler) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "content-type": "application/json" } });
      try { return await handler(request); }
      catch (e) {
        console.error("API error", m[1], e && e.stack || e);
        return new Response(JSON.stringify({ error: "Something went wrong. Try again." }), { status: 500, headers: { "content-type": "application/json" } });
      }
    }
    if (/^\/(coach|coaches|team)\/?$/.test(url.pathname)) return Response.redirect(url.origin + "/admin", 302);
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env, ctx) {
    loadEnv(env);
    const site = (env.SITE_URL || "https://hub.local").replace(/\/+$/, "");
    const req = new Request(site + "/api/cron", { headers: { authorization: "Bearer " + (env.CRON_SECRET || "") } });
    ctx.waitUntil(cron(req).then(r => r.text()).then(t => console.log("cron", t.slice(0, 500))));
  }
};
