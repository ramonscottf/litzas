// scripts/fetch-content.mjs
// Pulls editable copy + published blog posts from the Foster Content Store and
// writes data/content.json + data/posts.json BEFORE render-site.mjs runs.
// Falls back to committed copies if the store is unreachable — site never breaks.
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.CONTENT_API_BASE || 'https://cms.wickowaypoint.com';

async function pull(path, outName, minOk, validate) {
  const out = join(root, 'data', outName);
  try {
    const res = await fetch(BASE + path, { headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!validate(data)) throw new Error('failed validation');
    writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
    console.log('fetch-content: wrote ' + outName);
  } catch (err) {
    if (existsSync(out)) console.warn('fetch-content: ' + outName + ' fetch failed (' + err.message + '); keeping committed copy.');
    else { console.warn('fetch-content: ' + outName + ' fetch failed, no committed copy; writing empty.'); writeFileSync(out, Array.isArray(minOk) ? '[]\n' : '{}\n'); }
  }
}

await pull('/api/content/litzas', 'content.json', {}, (d) => d && typeof d === 'object' && Object.keys(d).length >= 5);
await pull('/api/posts/litzas', 'posts.json', [], (d) => Array.isArray(d));
