export async function onRequest({env}) {
 if(!env.DB) return new Response("Database unavailable",{status:503});
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS site_content (content_key TEXT PRIMARY KEY, content_value TEXT NOT NULL DEFAULT '')").run();
 const {results}=await env.DB.prepare("SELECT content_key,content_value FROM site_content").all();
 return Response.json(Object.fromEntries(results.map(r=>[r.content_key,r.content_value])),{headers:{"Cache-Control":"no-store"}});
}
