// slug-forge API — turn any string into a URL-safe slug with unicode transliteration
const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'public, max-age=60' };
const J = (o, s=200) => new Response(JSON.stringify(o, null, 2), { status: s, headers: { ...H, 'Content-Type': 'application/json' } });

function slugify(text, opts = {}) {
  const sep = opts.separator || '-';
  const lower = opts.lower !== 'false';
  const strict = opts.strict === 'true';
  const maxLen = parseInt(opts.max || '0', 10);
  // NFD unicode decomposition strips accents; then keep ascii letters/digits + separators
  let s = String(text).normalize('NFKD').replace(/[̀-ͯ]/g, '');
  // German umlauts fallback
  s = s.replace(/ß/g, 'ss').replace(/æ/gi, 'ae').replace(/œ/gi, 'oe').replace(/ø/gi, 'o');
  s = strict ? s.replace(/[^a-zA-Z0-9]+/g, sep) : s.replace(/[^a-zA-Z0-9\-_.~]+/g, sep);
  s = s.replace(new RegExp(`${sep}+`, 'g'), sep).replace(new RegExp(`^${sep}|${sep}$`, 'g'), '');
  if (lower) s = s.toLowerCase();
  if (maxLen > 0 && s.length > maxLen) s = s.slice(0, maxLen).replace(new RegExp(`${sep}$`), '');
  return s;
}

const OPENAPI = {
  openapi: '3.1.0',
  info: { title: 'slug-forge API', version: '1.0.0', description: 'Turn any string into a URL-safe slug with Unicode transliteration, custom separator, strict mode, and length cap.', contact: { name: 'Techtenstein', url: 'https://techtenstein.com' }, license: { name: 'MIT' } },
  servers: [{ url: 'https://slug-forge.techtenstein.com' }],
  paths: {
    '/': { get: { summary: 'Landing / docs' } },
    '/health': { get: { summary: 'Health' } },
    '/openapi.json': { get: { summary: 'OpenAPI spec' } },
    '/slug': { get: { summary: 'Slugify text', parameters: [
      { name: 'text', in: 'query', required: true, schema: { type: 'string' } },
      { name: 'separator', in: 'query', schema: { type: 'string', default: '-' } },
      { name: 'lower', in: 'query', schema: { type: 'string', default: 'true' } },
      { name: 'strict', in: 'query', schema: { type: 'string', default: 'false' } },
      { name: 'max', in: 'query', schema: { type: 'integer', default: 0 } }
    ], responses: { '200': { description: 'Slug result' } } } },
    '/batch': { get: { summary: 'Slugify multiple (comma-separated in "texts")', parameters: [
      { name: 'texts', in: 'query', required: true, schema: { type: 'string' } },
      { name: 'separator', in: 'query', schema: { type: 'string', default: '-' } }
    ], responses: { '200': { description: 'Array of slugs' } } } }
  }
};

const HTML = `<!doctype html><html><head><meta charset="utf-8"><title>slug-forge API</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.55}code{background:#f4f4f4;padding:2px 6px;border-radius:4px}pre{background:#0b1020;color:#e6e6ff;padding:1rem;border-radius:8px;overflow:auto}h1{margin-top:0}a{color:#2b6cb0}</style></head><body><h1>slug-forge API</h1><p>Turn any string into a clean, URL-safe slug. Unicode-aware. Free. No auth. CORS.</p><h2>Endpoints</h2><ul><li><a href="/slug?text=Hello%20W%C3%B6rld!"><code>GET /slug?text=Hello Wörld!</code></a></li><li><code>GET /slug?text=...&separator=_&strict=true&max=40</code></li><li><code>GET /batch?texts=foo,Bar Baz,Über cool</code></li><li><a href="/openapi.json"><code>/openapi.json</code></a> · <a href="/health"><code>/health</code></a></li></ul><h2>Example</h2><pre>curl "https://slug-forge.techtenstein.com/slug?text=H%C3%A9llo%20W%C3%B6rld"
# → { "slug": "hello-world" }</pre></body></html>`;

export default {
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: H });
    const u = new URL(req.url);
    const p = u.pathname;
    if (p === '/') return new Response(HTML, { headers: { ...H, 'Content-Type': 'text/html; charset=utf-8' } });
    if (p === '/health') return J({ status: 'ok', service: 'slug-forge', time: new Date().toISOString() });
    if (p === '/openapi.json') return J(OPENAPI);
    const opts = Object.fromEntries(u.searchParams.entries());
    if (p === '/slug') {
      if (!opts.text) return J({ error: 'text query param required' }, 400);
      return J({ input: opts.text, slug: slugify(opts.text, opts), options: opts });
    }
    if (p === '/batch') {
      if (!opts.texts) return J({ error: 'texts query param required (comma-separated)' }, 400);
      const arr = opts.texts.split(',');
      return J({ count: arr.length, slugs: arr.map(t => ({ input: t, slug: slugify(t, opts) })) });
    }
    return J({ error: 'Not found', endpoints: ['/','/health','/openapi.json','/slug','/batch'] }, 404);
  }
};
