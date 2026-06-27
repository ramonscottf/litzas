// Litzas menu photo store — R2-backed.
//   GET  /img/{slug}.png   -> serve image from R2 (public, cached)
//   GET  /list             -> { slugs: [...] } of uploaded photos
//   POST /upload           -> token-gated; X-Slug header + PNG body -> R2
// CORS-open so the studio page works from any origin.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Upload-Token,X-Slug',
  'Access-Control-Max-Age': '86400',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const cleanSlug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // Serve an image
    if (req.method === 'GET' && path.startsWith('/img/')) {
      const key = path.slice('/img/'.length);
      const obj = await env.BUCKET.get(key);
      if (!obj) return new Response('not found', { status: 404, headers: CORS });
      const h = new Headers(CORS);
      h.set('Content-Type', obj.httpMetadata?.contentType || 'image/png');
      h.set('Cache-Control', 'public, max-age=300');
      h.set('ETag', obj.httpEtag);
      return new Response(obj.body, { headers: h });
    }

    // List uploaded slugs
    if (req.method === 'GET' && path === '/list') {
      const out = [];
      let cursor;
      do {
        const r = await env.BUCKET.list({ limit: 1000, cursor });
        for (const o of r.objects) out.push(o.key.replace(/\.png$/, ''));
        cursor = r.truncated ? r.cursor : undefined;
      } while (cursor);
      return json({ slugs: out });
    }

    // Upload (token-gated)
    if (req.method === 'POST' && path === '/upload') {
      const token = req.headers.get('X-Upload-Token') || '';
      if (!env.UPLOAD_TOKEN || token !== env.UPLOAD_TOKEN) return json({ error: 'unauthorized' }, 401);
      const slug = cleanSlug(req.headers.get('X-Slug'));
      if (!slug) return json({ error: 'missing or bad slug' }, 400);
      const body = await req.arrayBuffer();
      if (!body || body.byteLength < 200) return json({ error: 'empty or tiny image' }, 400);
      if (body.byteLength > 8 * 1024 * 1024) return json({ error: 'image too large (>8MB)' }, 413);
      await env.BUCKET.put(slug + '.png', body, { httpMetadata: { contentType: 'image/png' } });
      return json({ ok: true, slug, bytes: body.byteLength });
    }

    return json({ service: 'litzas-menu', ok: true });
  },
};
