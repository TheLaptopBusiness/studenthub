// Sign-in helpers shared by the Student Hub and the Coach Dashboard.
// Three ways in: Continue with Google, email + password, or a one-time email link (always available as backup).
export const SESSION_KEY = "lbm-session";

const store = {
  get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch{ return null; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} },
  del(k){ try{ localStorage.removeItem(k); }catch{} }
};

let cfgPromise = null;
/** { supabaseUrl, anonKey, google, siteUrl } — empty values when the site isn't set up for them. */
export function loadConfig(){
  if(!cfgPromise){
    cfgPromise = fetch("/api/config").then(r => r.ok ? r.json() : {}).catch(() => ({}));
  }
  return cfgPromise;
}

function saveSession(j){
  store.set(SESSION_KEY, {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Number(j.expires_at) || Math.floor(Date.now()/1000) + (Number(j.expires_in) || 3600)
  });
}
export function clearSession(){ store.del(SESSION_KEY); }
export function hasSession(){ const s = store.get(SESSION_KEY); return Boolean(s && s.access_token); }

/** After an email link or Google sign-in, the session arrives in the page address. Returns an error message, or "". */
export function readSessionFromLink(){
  const h = location.hash.slice(1);
  if(!h || !/access_token=|error=/.test(h)) return "";
  const q = new URLSearchParams(h);
  let err = "";
  if(q.get("access_token")){
    saveSession({ access_token: q.get("access_token"), refresh_token: q.get("refresh_token"), expires_at: q.get("expires_at"), expires_in: q.get("expires_in") });
  } else if(q.get("error")){
    const d = (q.get("error_description") || q.get("error_code") || "").toLowerCase();
    err = /expired/.test(d) ? "That sign-in link has expired. Sign in again below."
      : /signup|not allowed|disabled/.test(d) ? "That account isn't set up for the hub yet. Sign in with the email you enrolled with, or ask your coach."
      : "That sign-in didn't work. Please try again.";
  }
  history.replaceState(null, "", location.pathname + location.search);
  return err;
}

let refreshing = null;
/** A valid access token, refreshing it when it's about to expire. null = signed out. */
export async function accessToken(){
  const s = store.get(SESSION_KEY);
  if(!s || !s.access_token) return null;
  if(s.expires_at * 1000 - Date.now() > 90 * 1000) return s.access_token;
  if(!refreshing){
    refreshing = (async () => {
      try{
        const cfg = await loadConfig();
        let r;
        if(cfg.supabaseUrl && cfg.anonKey){
          r = await fetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
            method:"POST", headers:{ "content-type":"application/json", apikey: cfg.anonKey }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
        } else {
          r = await fetch("/api/refresh", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
        }
        if(!r.ok){ if(r.status === 400 || r.status === 401) clearSession(); return null; }
        const j = await r.json();
        saveSession(j);
        return j.access_token;
      }catch{ return null; }
      finally{ setTimeout(() => { refreshing = null; }, 0); }
    })();
  }
  return refreshing;
}

/** Email + password. Returns "" on success or a message to show. */
export async function signInWithPassword(email, password){
  const cfg = await loadConfig();
  if(!cfg.supabaseUrl || !cfg.anonKey) return "Password sign-in isn't switched on yet. Use \"Email me a sign-in link\" instead.";
  try{
    const r = await fetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method:"POST", headers:{ "content-type":"application/json", apikey: cfg.anonKey },
      body: JSON.stringify({ email: String(email).trim().toLowerCase(), password }) });
    if(r.status === 429) return "Too many tries. Wait a few minutes, or use \"Email me a sign-in link\".";
    if(!r.ok) return "That email and password don't match. No password yet, or forgot it? Use \"Email me a sign-in link\".";
    saveSession(await r.json());
    return "";
  }catch{ return "Couldn't reach the server. Check your internet connection."; }
}

/** Sends the browser to Google, then back to `path` signed in. */
export async function signInWithGoogle(path = "/"){
  const cfg = await loadConfig();
  if(!cfg.supabaseUrl || !cfg.google) return false;
  const back = (cfg.siteUrl || location.origin) + path;
  location.href = `${cfg.supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(back)}`;
  return true;
}

/** Emails a one-time sign-in link. Returns a message to show. */
export async function sendSignInLink(email){
  try{
    const r = await fetch("/api/login", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ email }) });
    return r.ok ? "If that email is enrolled, a sign-in link is on its way. Check your inbox and spam folder."
                : "That doesn't look like a valid email. Check it and try again.";
  }catch{ return "Couldn't reach the server. Check your internet connection."; }
}
