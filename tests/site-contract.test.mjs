import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const parseJson = (path) => JSON.parse(read(path));

const expectedPizzas = [
  'Cheese',
  'Garlic Cheese',
  'Pepperoni',
  'Ground Sausage',
  'Western BBQ',
  'Ham',
  'Canadian',
  'Hawaiian',
  'Red & Black',
  'Red & Green',
  'Red, Green & Yellow',
  'Italian Carbonara',
  'Lone Peak',
  'Mt Olympus',
  'Twin Peaks',
  'Kings Peak',
  'Little Litzas',
  'Classic Litzas',
  'Litzas Meatza',
  'Spinach Artichoke',
  'Five Cheese',
  'Vegetarian',
  'Traditional',
  'Deluxe'
];

function localTargetExists(href) {
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:')) {
    return true;
  }

  const clean = href.split('#')[0].split('?')[0];
  if (clean === '/' || clean === '') return existsSync(join(root, 'index.html'));
  const target = clean.endsWith('/') ? join(root, clean, 'index.html') : join(root, clean);
  return existsSync(normalize(target));
}

function collectHtmlFiles() {
  return ['index.html', 'menu/index.html', 'locations/index.html', 'shop/index.html', 'story/index.html'];
}

test('menu data contains the approved named pizza set once', () => {
  const menu = parseJson('data/menu.json');
  const pizzas = menu.categories.find((category) => category.id === 'pizzas')?.items ?? [];
  assert.deepEqual(pizzas.map((item) => item.name), expectedPizzas);
  assert.equal(new Set(pizzas.map((item) => item.slug)).size, expectedPizzas.length);
});

test('photo manifest covers every named pizza with SpotOn export metadata', () => {
  const manifest = parseJson('data/menu-photo-manifest.json');
  assert.deepEqual(manifest.pizzas.map((item) => item.name), expectedPizzas);
  for (const photo of manifest.pizzas) {
    assert.match(photo.file, /^assets\/images\/menu\/pizzas\/[a-z0-9-]+\.jpg$/);
    assert.match(photo.spotOnExportName, /^[a-z0-9-]+\.jpg$/);
    assert.ok(photo.alt.length > 20, `${photo.name} needs useful alt text`);
    assert.ok(['approved-existing', 'generated-approved', 'generated-review', 'needs-generation'].includes(photo.approvalStatus));
  }
});

test('SpotOn links are centralized config placeholders until launch', () => {
  const order = parseJson('data/order-links.json');
  assert.equal(order.provider, 'SpotOn');
  assert.equal(order.status, 'pending');
  assert.equal(order.enabled, false);
  assert.ok(order.locations.every((location) => !location.orderUrl));
});

test('primary pages and local navigation targets exist', () => {
  for (const htmlPath of collectHtmlFiles()) {
    assert.ok(existsSync(join(root, htmlPath)), `${htmlPath} should exist`);
    const html = read(htmlPath);
    const hrefs = [...html.matchAll(/\bhref="([^"]+)"/g)].map((match) => match[1]);
    for (const href of hrefs) {
      assert.ok(localTargetExists(href), `${htmlPath} links to missing local target ${href}`);
    }
  }
});

test('served local images referenced by pages and manifests exist', () => {
  const htmlImageRefs = collectHtmlFiles()
    .flatMap((htmlPath) => [...read(htmlPath).matchAll(/\bsrc="([^"]+)"/g)].map((match) => match[1]))
    .filter((src) => !src.startsWith('http') && !src.startsWith('data:'));

  const manifest = parseJson('data/menu-photo-manifest.json');
  const manifestRefs = [
    ...manifest.pizzas
      .filter((item) => item.approvalStatus !== 'needs-generation')
      .map((item) => item.file),
    ...parseJson('data/site-assets.json').images.map((item) => item.file)
  ];

  for (const src of [...htmlImageRefs, ...manifestRefs]) {
    const clean = src.startsWith('/') ? src.slice(1) : src;
    const target = join(root, clean);
    assert.ok(existsSync(target), `${src} should exist`);
    assert.ok(statSync(target).size > 1000, `${src} should not be an empty placeholder`);
  }
});

test('menu does not render generated-photo placeholders as customer-facing pizza photos', () => {
  const manifest = parseJson('data/menu-photo-manifest.json');
  const menuHtml = read('menu/index.html');
  const renderSrc = read('scripts/render-site.mjs');
  const photosOn = /const\s+SHOW_MENU_PHOTOS\s*=\s*true/.test(renderSrc);

  if (photosOn) {
    // Photos enabled: approved photos render, pending (generated) ones never do.
    const approved = manifest.pizzas.filter((item) => item.approvalStatus !== 'needs-generation');
    const pending = manifest.pizzas.filter((item) => item.approvalStatus === 'needs-generation');
    for (const photo of approved) {
      assert.match(menuHtml, new RegExp(photo.file.replaceAll('/', '\\/')), `${photo.name} approved photo should render`);
    }
    for (const photo of pending) {
      assert.doesNotMatch(menuHtml, new RegExp(photo.file.replaceAll('/', '\\/')), `${photo.name} pending photo should not render as real`);
    }
  } else {
    // Photos OFF (real food photography pending): the menu is text-only. No
    // pizza photos and no "in approval" placeholder ever reach customers.
    assert.doesNotMatch(menuHtml, /class="pizza-photo"/, 'no pizza photos should render while SHOW_MENU_PHOTOS is off');
    assert.doesNotMatch(menuHtml, /PHOTO IN APPROVAL/, 'no in-approval placeholder should render to customers');
    for (const photo of manifest.pizzas) {
      assert.doesNotMatch(menuHtml, new RegExp(photo.file.replaceAll('/', '\\/')), `${photo.name} photo file should not render while photos are off`);
    }
    // Cards still render — favorites appear as clean text-only tiles.
    assert.match(menuHtml, /pizza-card text-only/, 'favorites should render as text-only cards');
  }
});

test('site asset manifest has role metadata for the creative system', () => {
  const assets = parseJson('data/site-assets.json');
  const roles = new Set(assets.images.flatMap((image) => image.roles ?? []));
  for (const role of ['hero', 'food', 'interior', 'craft', 'rootBeer', 'menuPhoto', 'downloadOnly']) {
    assert.ok(roles.has(role), `missing asset role: ${role}`);
  }
});
