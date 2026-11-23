export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function readJson(req, max = 200_000) {
  const raw = await req.text();
  if (raw.length > max) throw Object.assign(new Error("too_large"), { status: 413 });
  try { return raw ? JSON.parse(raw) : {}; }
  catch { throw Object.assign(new Error("bad_request"), { status: 400 }); }
}

export const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
