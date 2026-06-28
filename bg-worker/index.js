// Litzas background-photo store — R2-backed (bucket: litzaspizza).
//   GET /list      -> { count, keys:[{key,size,type}] }
//   GET /img/{key} -> serve image (long cache)
const CORS = { 'Access-Control-Allow-Origin': '*' };
const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    if (req.method === 'GET' && path === '/list') {
      const out = [];
      let cursor;
      do {
        const r = await env.BUCKET.list({ limit: 1000, cursor, include: ['httpMetadata'] });
        for (const o of r.objects) out.push({ key: o.key, size: o.size, type: o.httpMetadata?.contentType || '' });
        cursor = r.truncated ? r.cursor : undefined;
      } while (cursor);
      out.sort((a, b) => a.key.localeCompare(b.key));
      return json({ count: out.length, keys: out });
    }
    if (req.method === 'GET' && path.startsWith('/img/')) {
      const key = decodeURIComponent(path.slice('/img/'.length));
      const obj = await env.BUCKET.get(key);
      if (!obj) return new Response('not found', { status: 404, headers: CORS });
      const h = new Headers(CORS);
      h.set('Content-Type', obj.httpMetadata?.contentType || 'image/jpeg');
      h.set('Cache-Control', 'public, max-age=604800, immutable');
      h.set('ETag', obj.httpEtag);
      return new Response(obj.body, { headers: h });
    }
    return json({ service: 'litzas-bg', ok: true });
  },
};
