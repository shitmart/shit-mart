const json = (data, status = 200, headers = {}) =>
  Response.json(data, { status, headers });

const cookieName = "sm_admin_session";
const cookieFlags = "Path=/; HttpOnly; Secure; SameSite=Strict";

function b64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function enc(s) {
  return b64(new TextEncoder().encode(s));
}
async function signature(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return b64(new Uint8Array(await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(payload)
  )));
}
async function makeSession(secret) {
  const payload = enc(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000 }));
  return payload + "." + await signature(payload, secret);
}
async function validSession(request, secret) {
  const raw = (request.headers.get("Cookie") || "").split(";")
    .map(x => x.trim()).find(x => x.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
  if (!raw || !secret) return false;
  const parts = raw.split(".");
  if (parts.length !== 2) return false;
  const expected = await signature(parts[0], secret);
  if (expected !== parts[1]) return false;
  try {
    const payload = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp > Date.now();
  } catch { return false; }
}
function cookie(value, maxAge) {
  return `${cookieName}=${value}; ${cookieFlags}; Max-Age=${maxAge}`;
}
function cleanText(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function productInput(body) {
  const name = cleanText(body.name, 120);
  const price = Number(body.price);
  const category = cleanText(body.category, 40).toLowerCase();
  const image_url = cleanText(body.image_url, 1500);
  if (!name || !Number.isFinite(price) || price < 0 || price > 100000000)
    throw new Error("Enter a product name and a valid non-negative price.");
  if (image_url && !/^https:\/\/[^ ]+/i.test(image_url))
    throw new Error("Image URL must begin with https://");
  const categories = ["subscriptions","topups","giftcards","software","accounts","other"];
  return {
    name, price,
    description: cleanText(body.description, 2000),
    category: categories.includes(category) ? category : "other",
    image_url,
    featured: body.featured ? 1 : 0,
    active: body.active === false ? 0 : 1
  };
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method.toUpperCase();

  if (!env.DB) return json({ error: "Database binding DB is not configured." }, 503);

  if (method === "POST" && path === "/api/admin/login") {
    if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET)
      return json({ error: "Admin secrets are not configured in Cloudflare." }, 503);
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return json({ error: "Invalid origin." }, 403);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
    if (typeof body.password !== "string" || body.password !== env.ADMIN_PASSWORD)
      return json({ error: "Incorrect password." }, 401);
    const token = await makeSession(env.SESSION_SECRET);
    return json({ ok: true }, 200, {
      "Set-Cookie": cookie(token, 28800),
      "Cache-Control": "no-store"
    });
  }

  if (method === "POST" && path === "/api/admin/logout")
    return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });

  if (!env.SESSION_SECRET || !(await validSession(request, env.SESSION_SECRET)))
    return json({ error: "Please log in again." }, 401, { "Cache-Control": "no-store" });

  if (method !== "GET") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return json({ error: "Invalid origin." }, 403);
  }

  if (method === "GET" && path === "/api/admin/me")
    return json({ ok: true }, 200, { "Cache-Control": "no-store" });

  if (method === "GET" && path === "/api/admin/products") {
    const { results } = await env.DB.prepare(
      "SELECT * FROM products ORDER BY id DESC"
    ).all();
    return json({ products: results }, 200, { "Cache-Control": "no-store" });
  }

  if (method === "POST" && path === "/api/admin/products") {
    let body, p;
    try {
      body = await request.json();
      p = productInput(body);
    } catch (e) { return json({ error: e.message || "Invalid product." }, 400); }
    const result = await env.DB.prepare(
      `INSERT INTO products(name,price,description,category,image_url,featured,active)
       VALUES(?,?,?,?,?,?,?)`
    ).bind(p.name,p.price,p.description,p.category,p.image_url,p.featured,p.active).run();
    return json({ ok: true, id: result.meta.last_row_id }, 201);
  }

  const match = path.match(/^\/api\/admin\/products\/(\d+)$/);
  if (match && method === "PUT") {
    let body, p;
    try {
      body = await request.json();
      p = productInput(body);
    } catch (e) { return json({ error: e.message || "Invalid product." }, 400); }
    const result = await env.DB.prepare(
      `UPDATE products SET name=?,price=?,description=?,category=?,image_url=?,
       featured=?,active=?,updated_at=datetime('now') WHERE id=?`
    ).bind(p.name,p.price,p.description,p.category,p.image_url,p.featured,p.active,Number(match[1])).run();
    return result.meta.changes ? json({ ok: true }) : json({ error: "Product not found." }, 404);
  }

  if (match && method === "DELETE") {
    const result = await env.DB.prepare("DELETE FROM products WHERE id=?")
      .bind(Number(match[1])).run();
    return result.meta.changes ? json({ ok: true }) : json({ error: "Product not found." }, 404);
  }

  return json({ error: "Not found." }, 404);
}
