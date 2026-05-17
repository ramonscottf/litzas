import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:4173';
const outDir = new URL('../downloads/visual-smoke/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

async function checkPage(path, viewport, name) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (error) => errors.push(`${path}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${path}: ${message.text()}`);
  });
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) errors.push(`${path} has horizontal overflow at ${viewport.width}px`);

  const heroVisible = await page.locator('h1').first().isVisible();
  if (!heroVisible) errors.push(`${path} missing visible h1 at ${viewport.width}px`);

  if (path === '/menu/') {
    const generatedPizzaImages = await page.locator('img[src*="/assets/images/menu/pizzas/"]').count();
    if (generatedPizzaImages !== 23) errors.push(`/menu/ should render 23 generated pizza photos, found ${generatedPizzaImages}`);
  }

  await page.screenshot({ path: new URL(`${name}.png`, outDir).pathname, fullPage: false });
  await page.close();
}

await checkPage('/', { width: 1440, height: 1100 }, 'home-desktop');
await checkPage('/', { width: 390, height: 900 }, 'home-mobile');
await checkPage('/menu/', { width: 390, height: 900 }, 'menu-mobile');
await checkPage('/story/', { width: 390, height: 900 }, 'story-mobile');

await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Visual smoke passed for ${baseUrl}`);
