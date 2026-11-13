export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id,name,price,description,category,image_url,featured
       FROM products WHERE active=1 ORDER BY featured DESC,id DESC`
    ).all();
    return Response.json({ products: results });
  } catch {
    return Response.json({ error: "Product service is not configured yet." }, { status: 503 });
  }
}
