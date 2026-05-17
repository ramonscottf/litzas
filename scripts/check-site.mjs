import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pages = ['index.html', 'menu/index.html', 'locations/index.html', 'shop/index.html', 'story/index.html'];
const errors = [];

for (const page of pages) {
  const target = join(root, page);
  if (!existsSync(target)) {
    errors.push(`Missing page: ${page}`);
    continue;
  }
  const html = readFileSync(target, 'utf8');
  if (!html.includes('<title>')) errors.push(`${page} missing title`);
  if (!html.includes('css/style.css') && !html.includes('/css/style.css')) errors.push(`${page} missing stylesheet`);
  if (!html.includes('js/main.js') && !html.includes('/js/main.js')) errors.push(`${page} missing script`);
  if (/<a[^>]+href="\/(order|blog)\//.test(html)) errors.push(`${page} links to removed /order/ or /blog/ route`);
}

const order = JSON.parse(readFileSync(join(root, 'data/order-links.json'), 'utf8'));
if (order.enabled || order.status !== 'pending') {
  errors.push('SpotOn config should remain pending/disabled until real URLs are supplied.');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Site sanity check passed for ${pages.length} pages.`);
