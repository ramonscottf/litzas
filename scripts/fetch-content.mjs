// scripts/fetch-content.mjs
// Pulls the latest Litzas copy from the Foster Content Store and writes it to
// data/content.json. Runs BEFORE render-site.mjs in the build. If the store is
// unreachable, we keep the existing committed content.json so the site still
// builds with the last-known-good text. The site never breaks on a bad fetch.

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'data', 'content.json');
const API = process.env.CONTENT_API || 'https://edit.fosterlabs.org/api/content/litzas';

try {
  const res = await fetch(API, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const n = Object.keys(data).length;
  if (n < 5) throw new Error('suspiciously few keys (' + n + ') — refusing to overwrite');
  writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
  console.log('fetch-content: wrote ' + n + ' keys to data/content.json');
} catch (err) {
  if (existsSync(out)) {
    const n = Object.keys(JSON.parse(readFileSync(out, 'utf8'))).length;
    console.warn('fetch-content: fetch failed (' + err.message + '). Keeping committed content.json (' + n + ' keys).');
  } else {
    console.warn('fetch-content: fetch failed and no committed content.json. Renderer will use inline fallbacks.');
    writeFileSync(out, '{}\n');
  }
}
