import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import menu from '../data/menu.json' with { type: 'json' };
import locationsData from '../data/locations.json' with { type: 'json' };
import manifest from '../data/menu-photo-manifest.json' with { type: 'json' };
import content from '../data/content.json' with { type: 'json' };
import storePosts from '../data/posts.json' with { type: 'json' };
import reviewsData from '../data/reviews.json' with { type: 'json' };
import orderLinks from '../data/order-links.json' with { type: 'json' };

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Cache-bust CSS/JS by content hash. style.css ships with max-age=14400, so
// without a versioned URL Safari serves a stale stylesheet for hours over the
// always-fresh HTML — which is exactly how the side-photo peeks looked
// "unclipped/floating" on a phone after the clipping fix had already shipped.
// Hash changes only when the asset changes, so it busts precisely when needed.
const assetVer = (rel) => createHash('sha1').update(readFileSync(join(root, rel))).digest('hex').slice(0, 8);
const cssVer = assetVer('css/style.css');
const jsVer = assetVer('js/main.js');

// t(key, fallback): editable copy from the Foster Content Store (edit.fosterlabs.org).
// Ali edits these values; `fallback` is the original baked-in text so a missing
// key never blanks the page. content.json is produced by scripts/fetch-content.mjs.
const t = (key, fallback = '') => {
  const v = content[key];
  return (v === undefined || v === null || v === '') ? fallback : v;
};
const pizzas = menu.categories.find((category) => category.id === 'pizzas').items;

// MENU PHOTOS — OFF until Litzas' real food photography lands.
// Ali flagged the placeholder AI shots as off-brand on 2026-05-25 (cheese
// browns wrong, pepperoni laid out wrong, "looks like Little Caesars"). Until
// real photos arrive, the menu renders as clean numbered text cards.
// TO RESTORE PHOTOS: set this to true AND approve real photos in
// data/menu-photo-manifest.json (approvalStatus !== 'needs-generation').
const SHOW_MENU_PHOTOS = false;
const approvedPhotos = new Map(
  SHOW_MENU_PHOTOS
    ? manifest.pizzas
        .filter((item) => item.approvalStatus !== 'needs-generation')
        .map((item) => [item.slug, item])
    : []
);

// Per-pizza photos live in R2 (bucket litzas-menu) and are served by the
// litzas-menu Worker. Cards point at R2 by slug; if a pizza has no photo yet
// the <img> onerror falls back to the generic pepperoni peek. Upload new ones
// at /studio/ — they appear on the next page load, no rebuild needed.
const MENU_IMG_BASE = 'https://litzas-menu.ramonscottf.workers.dev/img';
const PEEK_FALLBACK = '/assets/images/optimized/pizza-pepperoni-peek.png';
// Bump when a menu photo is re-uploaded to R2 — the worker serves images with
// max-age=300, so a version param forces browsers/CDN to pull the new file now.
const PEEK_VER = '2';

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

// tc(): HTML-escape + encode common typographic chars as named entities, so
// store-driven copy renders byte-identical to the hand-entered entities the
// templates used before (&rsquo;, &middot;, etc). Used for editable text blocks.
const tc = (value) => esc(value)
  .replaceAll('\u2019', '&rsquo;')   // ’ right single quote
  .replaceAll('\u2018', '&lsquo;')   // ‘ left single quote
  .replaceAll('\u201C', '&ldquo;')   // “ left double quote
  .replaceAll('\u201D', '&rdquo;')   // ” right double quote
  .replaceAll('\u2014', '&mdash;')   // — em dash
  .replaceAll('\u2013', '&ndash;')   // – en dash
  .replaceAll('\u00B7', '&middot;'); // · middot

// hoursFor(locationId, fallbackRows): build {days,time} display rows from the
// structured hours in the content store (content['hours.<id>']), collapsing
// consecutive same-time days into ranges (e.g. "Wed–Thu"). Holiday/special-day
// overrides (content['holidays.<id>']) are appended as note lines. If the store
// has no hours for this location, returns the fallback rows from locations.json.
const DOW = [['mon','Mon'],['tue','Tue'],['wed','Wed'],['thu','Thu'],['fri','Fri'],['sat','Sat'],['sun','Sun']];
// emphasize(text, phrases): tc()-encode then italicize known phrases. Lets a
// few editable fields keep intentional <em> styling (book title, box wordmark)
// without letting Ali inject arbitrary HTML.
const emphasize = (value, phrases) => {
  let s = tc(value);
  for (const p of phrases) s = s.split(tc(p)).join('<em>' + tc(p) + '</em>');
  return s;
};
function hoursFor(locId, fallbackRows) {
  let h;
  try { h = JSON.parse(content['hours.' + locId] || 'null'); } catch (e) { h = null; }
  if (!h || typeof h !== 'object') return fallbackRows || [];
  // group consecutive days with identical time string
  const cell = (d) => {
    const x = h[d] || {};
    if (x.closed || (!x.open && !x.close)) return 'Closed';
    return (x.open || '') + ' - ' + (x.close || '');
  };
  const rows = [];
  let i = 0;
  while (i < DOW.length) {
    const t = cell(DOW[i][0]);
    let j = i;
    while (j + 1 < DOW.length && cell(DOW[j + 1][0]) === t) j++;
    const label = i === j ? DOW[i][1] : DOW[i][1] + '-' + DOW[j][1];
    rows.push({ days: label, time: t });
    i = j + 1;
  }
  // holiday overrides
  let hol = [];
  try { hol = JSON.parse(content['holidays.' + locId] || '[]'); } catch (e) { hol = []; }
  for (const x of hol) {
    if (!x || !x.date) continue;
    rows.push({ days: x.date, time: x.note || 'Closed' });
  }
  return rows;
}

// ── Live open/closed status ────────────────────────────────────────────────
// parseClock("11:00 am") -> minutes since midnight (660). null if unparseable.
function parseClock(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m?\.?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toLowerCase() === 'p') h += 12;
  return h * 60 + (m[2] ? parseInt(m[2], 10) : 0);
}
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']; // index = JS getDay()
const DAY_IDX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
// scheduleFor(locId): 7-element array indexed by getDay() (0=Sun). Each entry is
// [openMinutes, closeMinutes] or null (closed). Uses the same CMS structured
// hours hoursFor() displays; falls back to parsing locations.json string rows so
// the live status always matches the posted hours.
function scheduleFor(locId, fallbackRows) {
  const week = [null, null, null, null, null, null, null];
  let h = null;
  try { h = JSON.parse(content['hours.' + locId] || 'null'); } catch (e) { h = null; }
  if (h && typeof h === 'object') {
    DAY_KEYS.forEach((k, i) => {
      const x = h[k] || {};
      if (x.closed) return;
      const o = parseClock(x.open), c = parseClock(x.close);
      if (o != null && c != null) week[i] = [o, c];
    });
    return week;
  }
  for (const row of (fallbackRows || [])) {
    const time = String(row.time || '').trim();
    let span = null;
    if (!/closed/i.test(time)) {
      const parts = time.split(/\s*[-–]\s*/);
      const o = parseClock(parts[0]), c = parseClock(parts[1]);
      if (o != null && c != null) span = [o, c];
    }
    const days = String(row.days || '').toLowerCase().split(/\s*[-–]\s*/);
    const a = DAY_IDX[days[0]];
    const b = days.length > 1 ? DAY_IDX[days[1]] : a;
    if (a == null || b == null) continue;
    for (let d = a; ; d = (d + 1) % 7) { week[d] = span; if (d === b) break; }
  }
  return week;
}
// Runtime payload the client reads to render the live status + order buttons.
// Baked at build time; refreshes against the visitor's clock in America/Denver.
const litzasRuntime = JSON.stringify({
  tz: 'America/Denver',
  hours: Object.fromEntries(locationsData.locations.map((l) => [l.id, scheduleFor(l.id, l.hours)])),
  order: {
    enabled: !!orderLinks.enabled,
    locations: Object.fromEntries((orderLinks.locations || []).map((o) => {
      const loc = locationsData.locations.find((l) => l.id === o.id) || {};
      return [o.id, { url: o.orderUrl || '', phone: loc.phone || '' }];
    }))
  }
});

// Pizza price line.
// All four sizes are embedded as data attributes; the visible span shows ONE
// price at a time. A size-tabs UI on the menu page (and homepage menu band)
// updates the active size for every card in unison via JS. Default size = md
// (Medium 12" — the canonical Litzas order).
// Labels mirror data/menu.json `sizes` exactly: Mini 8" / Small 10" / Medium 12" / Large 16".
const SIZE_KEYS = ['mini', 'sm', 'md', 'lg'];
const SIZE_LABELS = { mini: 'Mini 8"', sm: 'Small 10"', md: 'Medium 12"', lg: 'Large 16"' };
const DEFAULT_SIZE = 'md';

const priceLine = (prices = []) => {
  if (!prices.length) return '';
  // Pad/truncate to exactly four sizes so the data attributes always exist.
  const four = [...prices].slice(0, 4);
  while (four.length < 4) four.push(four[four.length - 1] || '');
  const dataAttrs = SIZE_KEYS.map((k, i) => `data-price-${k}="${esc(four[i])}"`).join(' ');
  const defaultIdx = SIZE_KEYS.indexOf(DEFAULT_SIZE);
  const shown = String(four[defaultIdx] ?? '');
  const amount = shown.startsWith('+') ? `+$${shown.slice(1)}` : `$${shown}`;
  return `<p class="pizza-price" ${dataAttrs}><span class="price-size">${esc(SIZE_LABELS[DEFAULT_SIZE])}</span><span class="price-amount">${esc(amount)}</span></p>`;
};

// Simpler price line for single-price items (salads, apps, drinks).
const singlePriceLine = (price) => price
  ? `<p class="pizza-price single"><span class="price-amount">$${esc(price)}</span></p>`
  : '';

// Labeled, multi-tier price rows for items sold in more than one size/format
// (Garden Salad medium/large, garlic bread slice/full order, spaghetti combo, etc.).
const priceTierLines = (tiers = []) => tiers.length
  ? `<ul class="price-tiers">${tiers.map((tier) => {
      const raw = String(tier.price ?? '');
      const amount = raw.startsWith('+') ? `+$${raw.slice(1)}` : `$${raw}`;
      return `<li><span class="tier-label">${esc(tier.label)}</span><span class="tier-amount">${esc(amount)}</span></li>`;
    }).join('')}</ul>`
  : '';

// Size-tabs UI rendered above any grid of multi-size pizza cards.
const sizeTabs = () => `<div class="size-tabs" role="tablist" aria-label="Pizza size">
  ${SIZE_KEYS.map((k) => `<button type="button" class="size-tab${k === DEFAULT_SIZE ? ' active' : ''}" role="tab" aria-selected="${k === DEFAULT_SIZE}" data-size="${k}">${esc(SIZE_LABELS[k])}</button>`).join('\n  ')}
</div>`;

const HIRES_API_BASE = 'https://hiresbigh.com';
const JOBS_ENDPOINT = `${HIRES_API_BASE}/api/jobs`;
const CATERING_ENDPOINT = `${HIRES_API_BASE}/api/catering`;

function orderPickerHTML() {
  const opts = (orderLinks.locations || []).map((o) => {
    const loc = locationsData.locations.find((l) => l.id === o.id) || {};
    const name = loc.name || o.label || o.id;
    const addr = (loc.address && loc.address[0]) || '';
    const live = orderLinks.enabled && o.orderUrl;
    return live
      ? `<a href="${esc(o.orderUrl)}" target="_blank" rel="noopener noreferrer" class="loc-picker-btn" onclick="closeOrderPicker()">${esc(name)}<span>${esc(addr)}</span></a>`
      : `<button type="button" class="loc-picker-btn is-disabled" disabled aria-disabled="true">${esc(name)}<span>Coming soon</span></button>`;
  }).join('\n      ');
  return `
<div class="order-picker" id="orderPicker" role="dialog" aria-modal="true" aria-labelledby="orderPickerTitle">
  <div class="order-picker-card">
    <button type="button" class="order-picker-close" onclick="closeOrderPicker()" aria-label="Close">&times;</button>
    <h3 id="orderPickerTitle">Order Online</h3>
    <p>Choose a location to start your order.</p>
    <div class="order-picker-options">
      ${opts}
    </div>
  </div>
</div>`;
}

function nav(current = '', stack = '') {
  const links = [
    ['/', 'Home'],
    ['/menu/', 'Menu'],
    ['/locations/', 'Locations'],
    ['/story/', 'Story'],
    ['/catering/', 'Catering'],
    ['/blog/', 'Blog'],
    ['/jobs/', 'Jobs']
  ];
  return `
<a class="skip-link" href="#main">Skip to content</a>
<header class="nav${stack ? ' nav--stacked' : ''}" id="nav">
  <div class="scroll-progress" id="scroll-progress" aria-hidden="true"></div>
  <div class="nav-inner">
    <a href="/" class="nav-mark" aria-label="Litzas Pizza home">
      <img src="/assets/images/brand/litzas-logo-cream.png" alt="Litzas Pizza" width="394" height="137" loading="eager">
    </a>
    <nav id="nav-links" class="nav-links" aria-label="Primary">
      ${links.map(([href, label]) => `<a href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a>`).join('\n      ')}
      <a href="#" class="nav-cta" onclick="openOrderPicker(event)">Order Online</a>
    </nav>
    <button class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links">
      <span></span><span></span><span></span>
    </button>
  </div>
  ${stack ? `<div class="nav-stack">${stack}</div>` : ''}
</header>`;
}

function footer() {
  return `
<footer class="footer">
  <div class="footer-inner">
    <div>
      <a href="/" class="footer-mark" aria-label="Litzas Pizza home">
        <img src="/assets/images/brand/litzas-logo.png" alt="Litzas Pizza" width="394" height="137" loading="lazy">
      </a>
      <p class="footer-tagline">Family pizza in Salt Lake City and Midvale. Classic since 1965 — same family, same pizza, no notes.</p>
    </div>
    <div class="footer-col">
      <h4>Visit</h4>
      <ul>
        <li><a href="/locations/">Locations &amp; Hours</a></li>
        <li><a href="/menu/">Full Menu</a></li>
        <li><a href="/catering/">Catering</a></li>
        <li><a href="/story/">Our Story</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Order</h4>
      <ul>
        <li><a href="#" onclick="openOrderPicker(event)">Order Online</a></li>
        <li><a href="/locations/">Get Directions</a></li>
        <li><a href="https://hiresbigh.com" target="_blank" rel="noopener">Hires Big H</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Family</h4>
      <ul>
        <li><a href="/jobs/">Join the Team</a></li>
        <li><a href="/catering/">Catering &amp; Events</a></li>
        <li><a href="/blog/">Blog</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; <span id="year">2026</span> Litzas Pizza · A Hale Family Restaurant</span>
    <span>Salt Lake City · Midvale · Utah</span>
  </div>
</footer>
${orderPickerHTML()}
<script src="/js/main.js?v=${jsVer}" defer></script>`;
}

function head({ title, description, current = '', navStack = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0a0908">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<script>window.__LITZAS=${litzasRuntime};</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="/assets/images/optimized/litzas-pizza-spread.jpg">
<meta property="og:type" content="restaurant.restaurant">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Alfa+Slab+One&family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Bebas+Neue&family=Roboto+Slab:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/webp" href="/assets/images/optimized/logo-wordmark.webp">
<link rel="stylesheet" href="/css/style.css?v=${cssVer}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "Litzas Pizza",
  "url": "https://www.litzaspizza.com",
  "image": "https://www.litzaspizza.com/assets/images/optimized/litzas-pizza-spread.jpg",
  "servesCuisine": "Pizza",
  "priceRange": "$$",
  "telephone": "+1-801-359-5352",
  "foundingDate": "1965",
  "address": [
    {"@type": "PostalAddress", "streetAddress": "716 East 400 South", "addressLocality": "Salt Lake City", "addressRegion": "UT", "postalCode": "84102"},
    {"@type": "PostalAddress", "streetAddress": "835 East Fort Union Boulevard", "addressLocality": "Midvale", "addressRegion": "UT", "postalCode": "84047"}
  ]
}
</script>
</head>
<body data-page="${esc(current)}">
${nav(current, navStack)}`;
}

function layout(meta, body) {
  return `${head(meta)}
<main id="main">
${body}
</main>
${footer()}
</body>
</html>
`;
}

function pizzaCard(pizza, index, { numbered = false, showPrice = true } = {}) {
  const photo = approvedPhotos.get(pizza.slug);
  const ingredients = pizza.ingredients || '';
  const number = String(index + 1).padStart(2, '0');
  const chip = numbered ? `<span class="pizza-no" aria-hidden="true">N<sup>o</sup> ${number}</span>` : '';

  if (photo) {
    return `<article class="pizza-card reveal">
  <div class="pizza-photo">
    ${chip}
    <img src="/${esc(photo.file)}" alt="${esc(photo.alt)}" loading="lazy" width="1024" height="768">
  </div>
  <div class="pizza-body">
    <h3 class="pizza-name">${esc(pizza.name)}</h3>
    <p class="toppings">${esc(ingredients)}</p>
    ${showPrice ? priceLine(pizza.prices) : ''}
  </div>
</article>`;
  }

  // Text-only card — clean numbered tile with a per-pizza photo "peek" pulled
  // from R2 by slug; falls back to the generic pepperoni peek if none yet.
  return `<article class="pizza-card text-only reveal">
  <img class="pizza-peek" src="${MENU_IMG_BASE}/${esc(pizza.slug)}.png?v=${PEEK_VER}" onerror="this.onerror=null;this.src='${PEEK_FALLBACK}'" alt="" aria-hidden="true" loading="lazy" width="680" height="680">
  <div class="pizza-body">
    ${chip}
    <h3 class="pizza-name">${esc(pizza.name)}</h3>
    <p class="toppings">${esc(ingredients)}</p>
    ${showPrice ? priceLine(pizza.prices) : ''}
  </div>
</article>`;
}

// Coordinates for Litzas locations (used for maps deep links + embeds)
const LOC_COORDS = {
  'salt-lake-city': { lat: 40.760780, lng: -111.864320, mapsQuery: 'Litzas Pizza, 716 E 400 S, Salt Lake City, UT 84102' },
  'midvale':        { lat: 40.624620, lng: -111.873360, mapsQuery: 'Litzas Pizza, 835 E Fort Union Blvd, Midvale, UT 84047' }
};

function locationCards(opts = {}) {
  const { withMap = false, withOrderButton = false } = opts;
  return locationsData.locations.map((location) => {
    const coords = LOC_COORDS[location.id] || {};
    const mapsQuery = coords.mapsQuery || `Litzas Pizza ${location.name}`;
    const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&z=16&output=embed`;
    const photoBySlug = {
      'salt-lake-city': '/assets/images/optimized/litzas-downtown-night-2026.jpg',
      'midvale':        '/assets/images/optimized/litzas-midvale-dusk-2026.jpg'
    };
    const photo = photoBySlug[location.id] || '/assets/images/optimized/pizza-overhead-pair.jpg';

    return `<article class="loc-card reveal" data-loc="${esc(location.id)}">
  <div class="loc-photo">
    <img src="${photo}" alt="${esc(location.name + ' Litzas exterior')}" loading="lazy">
    <span class="badge">${esc(location.tag || '')}</span>
  </div>
  <div class="loc-body">
    <h3>${esc(location.name)}</h3>
    <p class="loc-meta">${esc(location.tag || 'Family pizza · Since 1965')}</p>
    <div class="loc-status" data-loc-status="${esc(location.id)}" hidden></div>
    <p class="loc-address">${location.address.map(esc).join('<br>')}</p>
    <div class="loc-hours">
      ${hoursFor(location.id, location.hours).map((row) => `<div><strong>${esc(row.days)}</strong> · ${esc(row.time)}</div>`).join('\n      ')}
    </div>
    <div class="loc-actions">
      <button type="button" class="btn btn-primary order-button" data-order-location="${esc(location.id)}">Coming soon</button>
      <a class="btn btn-ghost" data-maps="${esc(mapsQuery)}" data-lat="${coords.lat}" data-lng="${coords.lng}" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(mapsQuery)}">Directions</a>
    </div>
  </div>
</article>`;
  }).join('\n');
}

function locationMaps() {
  return locationsData.locations.map((location) => {
    const coords = LOC_COORDS[location.id] || {};
    const mapsQuery = coords.mapsQuery || `Litzas Pizza ${location.name}`;
    const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&z=16&output=embed`;
    return `<div class="loc-map reveal">
  <iframe src="${embedSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="${esc(location.name)} on the map" allowfullscreen></iframe>
</div>`;
  }).join('\n');
}

// ---- Reviews (REAL Google reviews from data/reviews.json) -------------------
const REVIEWS = (reviewsData && reviewsData.reviews) || [];
function reviewById(id) { return REVIEWS.find(r => r.id === id); }
function reviewsFeatured(slot) { return REVIEWS.find(r => r.feature === slot); }

function gMark() {
  return `<img class="g-mark" src="/assets/images/brand/google-g.png" width="15" height="15" alt="Google" loading="lazy" decoding="async">`;
}
function stars(n = 5) {
  const k = Math.max(0, Math.min(5, Math.round(n)));
  return `<span class="rev-stars" aria-label="${k} out of 5 stars" role="img">${'★'.repeat(k)}<span class="rev-stars-empty">${'★'.repeat(5 - k)}</span></span>`;
}
function reviewWho(r) { return r.author ? esc(r.author) : 'Google review'; }

function reviewCard(r) {
  return `<figure class="review-card">
  ${stars(r.rating)}
  <blockquote>${tc(r.quote)}</blockquote>
  <figcaption class="review-meta">${gMark()}<span class="rev-who">${reviewWho(r)}</span><span class="rev-dot">·</span><span class="rev-loc">${esc(r.location)}</span></figcaption>
</figure>`;
}
function reviewScroll(list = REVIEWS) {
  if (!list.length) return '';
  return `<div class="review-scroll">${list.map(reviewCard).join('\n')}</div>`;
}
// Auto-scrolling "wall of love" — cards duplicated so translateX(-50%) loops
// seamlessly; pauses on hover, falls back to a manual scroll for reduced-motion.
function reviewMarquee(list = REVIEWS) {
  if (!list.length) return '';
  const cards = list.map(reviewCard).join('\n');
  return `<div class="review-marquee"><div class="review-marquee-track">${cards}\n${cards}</div></div>`;
}
function reviewsStory() { return REVIEWS.filter(r => r.story); }
function reviewGrid(list = reviewsStory()) {
  if (!list.length) return '';
  return `<div class="review-grid">${list.map(reviewCard).join('\n')}</div>`;
}
function reviewStandout(r, kicker = 'What people say') {
  if (!r) return '';
  return `<aside class="review-standout reveal" aria-label="Customer review">
  <p class="review-standout-kicker">${esc(kicker)}</p>
  ${stars(r.rating)}
  <blockquote>${tc(r.pull || r.quote)}</blockquote>
  <p class="review-standout-meta">${gMark()}<span>${reviewWho(r)} · ${esc(r.location)}</span></p>
</aside>`;
}

function homePage() {
  const featured = ['classic-litzas', 'litzas-meatza', 'spinach-artichoke', 'pepperoni', 'vegetarian', 'deluxe']
    .map((slug, i) => pizzaCard(pizzas.find((p) => p.slug === slug), i, { showPrice: false }))
    .join('\n');

  return layout({
    current: '/',
    title: 'Litzas Pizza · Salt Lake City\u2019s pizza joint since 1965',
    description: 'Hand-rolled dough, real mozzarella, a frosted mug of Hires next door. Salt Lake City and Midvale\u2019s pizza joint since 1965.'
  }, `
<section class="cinema-hero" aria-labelledby="hero-h">
  <div class="hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/litzas-spread-hero.jpg" alt="">
  </div>
  <div class="hero-shade" aria-hidden="true"></div>
  <div class="hero-content reveal">
    <p class="eyebrow">${tc(t('hero.eyebrow', 'Salt Lake City & Midvale'))}</p>
    <h1 id="hero-h">${tc(t('hero.headline', 'Salt Lake’s pizza joint.'))}<span class="slab">${tc(t('hero.headline_slab', 'Sixty years and counting.'))}</span></h1>
    <p>${tc(t('hero.body', 'Hand-rolled dough. Real mozzarella. A booth, a slice, a frosted Hires next door. That’s the deal. That’s always been the deal.'))}</p>
    <div class="button-row">
      <a href="/menu/" class="btn btn-primary">${tc(t('hero.cta_primary', 'See the Menu'))}</a>
      <a href="/locations/" class="btn btn-ghost">${tc(t('hero.cta_secondary', 'Find a Location'))}</a>
    </div>
  </div>
  <aside class="hero-note reveal" aria-label="Litzas house notes">
    <span>${tc(t('hero.note_1', 'Two locations'))}</span>
    <span>${tc(t('hero.note_2', 'Hand-rolled dough'))}</span>
    <span>${tc(t('hero.note_3', 'Hires on tap'))}</span>
  </aside>
</section>

<section class="marquee" aria-label="Litzas neighborhood ticker">
  <div>
    <span>Fresh Hot Pizza</span>
    <span>Since 1965</span>
    <span>Salt Lake &amp; Midvale</span>
    <span>Hand-Rolled Dough</span>
    <span>Real Mozzarella</span>
    <span>Hires Root Beer</span>
    <span>Family Owned</span>
    <span>Fresh Hot Pizza</span>
    <span>Since 1965</span>
    <span>Salt Lake &amp; Midvale</span>
    <span>Hand-Rolled Dough</span>
    <span>Real Mozzarella</span>
    <span>Hires Root Beer</span>
    <span>Family Owned</span>
  </div>
</section>

<section class="stat-strip" aria-label="Litzas by the numbers">
  <div class="stats reveal">
    <div class="stat"><span class="num" data-count="1965">1965</span><span class="lbl">Est. &middot; 400 South</span></div>
    <div class="stat"><span class="num" data-count="24">24</span><span class="lbl">Pizzas, hand-rolled</span></div>
    <div class="stat"><span class="num" data-count="2">2</span><span class="lbl">Locations &middot; one family</span></div>
  </div>
</section>

<section class="warm-section" aria-labelledby="story-tease-h">
  <div class="sticky-story story-solo">
    <div class="copy reveal">
      <p class="eyebrow">${tc(t('story.eyebrow', 'Sixty years on 400 South'))}</p>
      <h2 id="story-tease-h">${tc(t('story.headline', 'Walk in.'))}<span class="slab">${tc(t('story.headline_slab', 'Order. Sit down.'))}</span></h2>
      <figure class="wide-banner reveal">
        <img src="/assets/images/optimized/litzas-spread-table.jpg" alt="A spread of Litzas pizzas on a reclaimed-wood table" loading="lazy">
      </figure>
      <p>${tc(t('story.p1', 'There’s a building on East 400 South that’s been making the same pizza for sixty years. Sticky booths in the best way. The cheese pulls. The cut is still done by hand. On Friday nights the line goes out the door and nobody complains, because the food is worth it.'))}</p>
      <p>${tc(t('story.p2', 'Litzas isn’t a date-night place. It’s not a reservation place. It’s the place your dad took you. It’s where the team eats after the game. It’s the one your kids will bring their kids to.'))}</p>
      <p>${tc(t('story.p3', 'You don’t need a menu to know what you want. But there is one if you want it.'))}</p>
      <div class="button-row">
        <a href="/story/" class="btn btn-primary">${tc(t('story.cta_primary', 'The Story'))}</a>
        <a href="/menu/" class="btn btn-ghost">${tc(t('story.cta_secondary', 'Open the Menu'))}</a>
      </div>
    </div>
  </div>
</section>

<section class="dark-section" id="home-menu" aria-labelledby="menu-tease-h">
  <div class="menu-intro">
  <div class="section-kicker reveal">
    <p class="eyebrow">${tc(t('menu.eyebrow', 'The Menu'))}</p>
    <h2 id="menu-tease-h">${tc(t('menu.headline', 'Twenty-four pizzas.'))}<span class="slab">${tc(t('menu.headline_slab', ' Hand-rolled crust. Made to order.'))}</span></h2>
    <p>${tc(t('menu.body', 'A few favorites below. The full menu — with sizes and prices — is one click away.'))}</p>
  </div>
  <figure class="wide-banner menu-dough reveal">
    <img src="/assets/images/optimized/litzas-topping-sausage.jpg" alt="Hand-spreading sausage and cheese over fresh-rolled dough" loading="lazy">
  </figure>
  </div>
  <div class="menu-band">
    <div class="fav-scroll" data-fav-scroll>
      ${featured}
    </div>
    <div class="center-row" style="margin-top: 36px;">
      <a href="/menu/" class="btn btn-primary">Open Full Menu</a>
    </div>
  </div>
</section>

${reviewStandout(reviewsFeatured('home'), 'From the reviews')}

<section class="warm-section" aria-labelledby="loc-h">
  <div class="section-kicker center tight reveal">
    <p class="eyebrow">${tc(t('loc.eyebrow', 'Choose Your Location'))}</p>
    <h2 id="loc-h">${tc(t('loc.headline', 'Two locations.'))}<span class="slab">${tc(t('loc.headline_slab', ' Same pizza.'))}</span></h2>
    <p>${tc(t('loc.body', 'Walk in, or call ahead to order.'))}</p>
  </div>
  <div class="loc-band">
    <div class="loc-grid">${locationCards()}</div>
  </div>
</section>

<section class="dark-section">
  <div class="hires-bridge">
    <div class="copy reveal">
      <p class="eyebrow">${tc(t('bridge.eyebrow', 'Our sister restaurant'))}</p>
      <h2>${tc(t('bridge.headline', 'Same parking lot.'))}<span class="slab">${tc(t('bridge.headline_slab', ' Same family.'))}</span></h2>
      <div class="hires-body">
        <img class="hires-mug" src="/assets/images/optimized/hires-mug.png" alt="Frosty mug of Hires Big H root beer" loading="lazy">
        <p>${tc(t('bridge.p1', 'In Salt Lake, we share a parking lot with Hires Big H. In Midvale, we share the building — same family runs both. Order a frosted mug of Hires root beer to go with your pizza.'))}</p>
        <div class="button-row">
          <a href="https://hiresbigh.com" class="btn btn-ghost" target="_blank" rel="noopener">Visit Hires Big H</a>
        </div>
      </div>
    </div>
  </div>
</section>`);
}

function menuPage() {
  // Pizzas — multi-size cards, numbered 01–24 like the printed menu
  const pizzaCards = pizzas.map((pizza, i) => pizzaCard(pizza, i)).join('\n');

  // Build-Your-Own — one clean card: cheese photo, the topping bar, and a
  // price row per build tier. Each amount carries all four sizes as data attrs
  // (padded by priceLine's rule) so the sticky size-tabs update them live.
  const byoCat = menu.categories.find((c) => c.id === 'create-your-own') || {};
  const byo = byoCat.items || [];
  const byoTops = byoCat.toppings || {};
  const byoTierRow = (item) => {
    const four = [...(item.prices || [])].slice(0, 4);
    if (!four.length) return '';
    while (four.length < 4) four.push(four[four.length - 1] || '');
    const dataAttrs = SIZE_KEYS.map((k, i) => `data-price-${k}="${esc(four[i])}"`).join(' ');
    const shown = String(four[SIZE_KEYS.indexOf(DEFAULT_SIZE)] ?? '');
    const amount = shown.startsWith('+') ? `+$${shown.slice(1)}` : `$${shown}`;
    const note = item.description ? `<span class="tier-note"> · ${esc(item.description)}</span>` : '';
    return `<li><span class="tier-label">${esc(item.name)}${note}</span><span class="pizza-price" ${dataAttrs}><span class="price-amount">${esc(amount)}</span></span></li>`;
  };
  const byoTopGroup = (label, arr) => (arr && arr.length)
    ? `<div class="byo-topgroup"><span class="byo-toplabel">${esc(label)}</span><span class="byo-toplist">${esc(arr.join(', '))}</span></div>`
    : '';
  const byoCards = byo.length ? `<article class="side-card has-peek byo-card reveal">
    <img class="pizza-peek" src="${MENU_IMG_BASE}/cheese.png?v=${PEEK_VER}" onerror="this.closest('.side-card').classList.remove('has-peek');this.remove()" alt="" aria-hidden="true" loading="lazy" width="680" height="680">
    <div class="byo-body">
      <h3 class="side-name">Build Your Own</h3>
      <div class="byo-toppings">
        ${byoTopGroup('Sauces & Cheeses', byoTops.saucesAndCheeses)}
        ${byoTopGroup('Meats', byoTops.meats)}
        ${byoTopGroup('Veggies', byoTops.vegetables)}
      </div>
      <p class="byo-price-head">Per pizza · <span class="byo-size-label">${esc(SIZE_LABELS[DEFAULT_SIZE])}</span></p>
      <ul class="price-tiers byo-tiers">${byo.map(byoTierRow).join('')}</ul>
    </div>
  </article>` : '';

  // True counts, surfaced as small chips next to the section heads.
  const countOf = (catId) => ((menu.categories.find((c) => c.id === catId) || {}).items || []).length;
  const countChip = (n, noun) => `<span class="count-chip">${n} ${noun}</span>`;

  // Salads / appetizers / dressings / specials / drinks.
  // Supports: category note, per-item group subheads, labeled price tiers,
  // and plain single prices (fallback).
  const sideCards = (catId) => {
    const cat = menu.categories.find((c) => c.id === catId);
    if (!cat) return '';
    let lastGroup = null;
    const parts = [];
    if (cat.note) parts.push(`<p class="side-note">${esc(cat.note)}</p>`);
    cat.items.forEach((item) => {
      if (item.group && item.group !== lastGroup) {
        parts.push(`<h3 class="side-group">${esc(item.group)}</h3>`);
        lastGroup = item.group;
      }
      const desc = item.description || item.ingredients;
      const priceBlock = (item.priceTiers && item.priceTiers.length)
        ? priceTierLines(item.priceTiers)
        : singlePriceLine((item.prices && item.prices[0]) || item.price);
      const hasPeek = item.slug && item.peek !== false;
      const sidePhoto = hasPeek
        ? `<img class="pizza-peek" src="${MENU_IMG_BASE}/${esc(item.slug)}.png?v=${PEEK_VER}" onerror="this.closest('.side-card').classList.remove('has-peek');this.remove()" alt="" aria-hidden="true" loading="lazy" width="680" height="680">`
        : '';
      parts.push(`<article class="side-card reveal${hasPeek ? ' has-peek' : ''}">
      ${sidePhoto}
      <div class="side-body">
        <h4 class="side-name">${esc(item.name)}</h4>
        ${desc ? `<p class="toppings">${esc(desc)}</p>` : ''}
        ${priceBlock}
      </div>
    </article>`);
    });
    return parts.join('\n');
  };

  const menuRails = `
<div class="menu-rails-slot" id="menu-rails-slot">
  <div class="menu-rails" id="menu-rails">
    <div class="menu-rails-inner">
      <nav class="menu-jump" aria-label="Menu sections">
        <a href="#favorites">Favorites</a>
        ${byoCards ? '<a href="#build">Build Your Own</a>' : ''}
        <a href="#sides">Salads &amp; Apps</a>
        <a href="#dressings">Dressings</a>
        <a href="#specials">Specials</a>
        <a href="#drinks">Drinks</a>
      </nav>
      <div class="nav-sizes" data-nav-sizes>${sizeTabs()}</div>
    </div>
  </div>
</div>`;

  return layout({
    current: '/menu/',
    title: 'Menu · Litzas Pizza · Salt Lake City & Midvale',
    description: 'Twenty-four pizzas, hand-rolled and baked when you order. Plus salads, build-your-own, specials, and Hires root beer in a frosted mug.'
  }, `
<section class="page-hero menu-hero" aria-labelledby="menu-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/litzas-slice-closeup.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">${tc(t("menupg.hero.eyebrow", "The Menu"))}</p>
    <h1 id="menu-h"><span class="ln">${tc(t("menupg.hero.line1", "Hand-rolled dough."))}</span><span class="ln">${tc(t("menupg.hero.line2", "Premium ingredients."))}</span><span class="ln">${tc(t("menupg.hero.line3", "Unforgettable pizza."))}</span></h1>
    <p>${tc(t("menupg.hero.body", "Twenty-four pizzas, hand-rolled every morning and baked the minute you order. Real mozzarella — never a blend — over a sauce we haven't changed since 1965. Add scratch-made salads and dressings, lasagna and spaghetti, and a frosted mug of Hires root beer next door. Sixty years on 400 South, and still the same recipe."))}</p>
  </div>
</section>

${menuRails}

<p class="menu-rails-note">Prices update based on the size you pick up top. Browse, or jump to a section.</p>

<section class="dark-section" id="favorites">
  <div class="menu-band">
    <div class="menu-section-head reveal">
      <h2>Litzas Favorites ${countChip(pizzas.length, "pizzas")}</h2>
      <p>Twenty-four pizzas, each available in 4 sizes.</p>
    </div>
    <div class="menu-grid">${pizzaCards}</div>
  </div>
</section>

${reviewStandout(reviewsFeatured('menu'), 'Why people keep coming back')}

${byoCards ? `<section class="warm-section" id="build">
  <div class="menu-band">
    <div class="menu-section-head reveal">
      <h2>Build Your Own ${countChip(countOf("create-your-own"), "ways")}</h2>
      <p>Start with a crust, add what you want.</p>
    </div>
    <div class="byo-single">${byoCards}</div>
  </div>
</section>` : ''}

<section class="dark-section" id="sides">
  <div class="menu-band">
    <div class="menu-section-head reveal">
      <h2>Salads &amp; Appetizers ${countChip(countOf("salads-appetizers"), "plates")}</h2>
    </div>
    <div class="side-grid">${sideCards('salads-appetizers')}</div>
  </div>
</section>

<section class="warm-section" id="dressings">
  <div class="menu-band">
    <div class="menu-section-head reveal">
      <h2>Dressings ${countChip(7, "from scratch")}</h2>
      <p>All made from scratch. Pick one with any salad.</p>
    </div>
    <div class="side-grid">${sideCards('dressings')}</div>
  </div>
</section>

<section class="dark-section" id="specials">
  <div class="menu-band">
    <div class="menu-section-head reveal">
      <h2>Specials &amp; Entrees ${countChip(countOf("specials-entrees"), "meals")}</h2>
      <p>Lasagna, spaghetti, garlic bread — Don worked on these recipes too, back when he was figuring out the pizza.</p>
    </div>
    <div class="side-grid">${sideCards('specials-entrees')}</div>
  </div>
</section>

<section class="warm-section" id="drinks">
  <div class="menu-band">
    <div class="menu-section-head reveal">
      <h2>Drinks ${countChip(13, "on tap")}</h2>
      <p>Yes — that includes Hires Root Beer in a frosted mug.</p>
    </div>
    <div class="side-grid">${sideCards('beverages')}</div>
    <p class="menu-note">Prices and full topping detail are available at both locations and on the SpotOn menu once it launches. Menu photography on this page is owner-review stand-in until the camera comes through.</p>
  </div>
</section>`);
}

function locationsPage() {
  return layout({
    current: '/locations/',
    title: 'Litzas Pizza Locations · Salt Lake City & Midvale',
    description: 'Visit Litzas Pizza at 716 East 400 South in Salt Lake City, or 835 East Fort Union Boulevard in Midvale.'
  }, `
<section class="page-hero" aria-labelledby="loc-page-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/litzas-night-sign.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">${tc(t("locpg.hero.eyebrow", "Visit · Call · Stop In"))}</p>
    <h1 id="loc-page-h">${tc(t("locpg.hero.headline", "Choose your location."))}<span class="slab">${tc(t("locpg.hero.headline_slab", " Same pizza, two locations."))}</span></h1>
    <p>${tc(t("locpg.hero.body", "SLC shares a parking lot with Hires Big H. Midvale shares a building. You won't have to look hard."))}</p>
  </div>
</section>

<section class="dark-section">
  <div class="loc-band">
    <div class="loc-grid">${locationCards({ withOrderButton: true })}</div>
    <div class="loc-map-strip">${locationMaps()}</div>
  </div>
</section>

<section class="warm-section reviews-band">
  <div class="page-band">
    <div class="section-kicker center reveal">
      <p class="eyebrow">Reviews · Google</p>
      <h2>Don't take our word for it.<span class="slab"> Take theirs.</span></h2>
    </div>
    ${reviewMarquee()}
  </div>
</section>

<section class="warm-section">
  <div class="page-band">
    <div class="section-kicker center reveal">
      <p class="eyebrow">Private Room · Up to 40</p>
      <h2>Birthdays. Teams.<span class="slab"> Whatever you've got.</span></h2>
      <p>The SLC back room hosts up to 40. Pizza, root beer in frosted mugs, salad, lasagna, spaghetti. No event coordinator. No minimum spend acrobatics. Call Sherry or Ali, they'll set it up.</p>
      <div class="button-row center-row">
        <a href="/catering/" class="btn btn-primary">Plan a Gathering</a>
        <a href="tel:+18013595352" class="btn btn-ghost">Call SLC · 801.359.5352</a>
        <a href="tel:+18015612171" class="btn btn-ghost">Call Midvale · 801.561.2171</a>
      </div>
    </div>
  </div>
</section>`);
}

function shopPage() {
  return layout({
    current: '/shop/',
    title: 'Hires Root Beer at Litzas Pizza',
    description: 'Hires Big H root beer in a frosty mug, the Utah classic since 1959. Available at both Litzas locations.'
  }, `
<section class="page-hero shop-hero" aria-labelledby="shop-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/rootbeer-mug.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">${tc(t("shoppg.hero.eyebrow", "Hires Big H · Family Brand"))}</p>
    <h1 id="shop-h">${tc(t("shoppg.hero.headline", "Root Beer in a Frosted Mug."))}<span class="slab">${tc(t("shoppg.hero.headline_slab", " Always Has Been."))}</span></h1>
    <p>${tc(t("shoppg.hero.body", "Don Hale opened Hires in 1959. Six years later, he opened Litzas. The root beer has been the same all along."))}</p>
  </div>
</section>

<section class="dark-section">
  <div class="shop-grid">
    <article class="shop-card reveal">
      <div class="photo"><img src="/assets/images/optimized/rootbeer-mug.jpg" alt="Frosty mug of Hires Big H root beer" loading="lazy"></div>
      <div class="body">
        <h3>Hires on Tap</h3>
        <p>Frosted mug, hand-pulled. The way it's been done since 1959.</p>
      </div>
    </article>
    <article class="shop-card reveal">
      <div class="photo"><img src="/assets/images/optimized/rootbeer-extract-front.png" alt="Hires Big H root beer extract" loading="lazy"></div>
      <div class="body">
        <h3>Take-Home Extract</h3>
        <p>Hires extract for SodaStream — make the family recipe at home. Available at the Hires shop.</p>
      </div>
    </article>
  </div>
  <div class="center-row" style="padding: 0 var(--gutter) clamp(80px, 10vw, 120px);">
    <a href="https://hiresbigh.com/shop" class="btn btn-primary" target="_blank" rel="noopener">Shop Hires Big H</a>
  </div>
</section>`);
}

function storyPage() {
  return layout({
    current: '/story/',
    title: 'The Story \u00B7 Litzas Pizza \u00B7 Sixty years on 400 South',
    description: 'Sixty years of pizza in Salt Lake City. The place, the dough, the booths, the regulars \u2014 and the family that\u2019s been keeping it going since 1965.'
  }, `
<section class="page-hero" aria-labelledby="story-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/pizzeria-mural.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">${tc(t('storypg.hero.eyebrow','The Story'))}</p>
    <h1 id="story-h">${tc(t('storypg.hero.headline','There’s a place'))}<span class="slab">${tc(t('storypg.hero.headline_slab',' on 400 South.'))}</span></h1>
    <p>${tc(t('storypg.hero.body','It’s been there longer than most things in this city. Salt Lake has gotten taller and weirder around it. The pizza hasn’t moved.'))}</p>
  </div>
</section>

<section class="dark-section">
  <div class="sticky-story story-solo">
    <div class="copy reveal">
      <p class="eyebrow">${tc(t('storypg.place.eyebrow','The Place'))}</p>
      <h2>${tc(t('storypg.place.headline','You know it'))}<span class="slab">${tc(t('storypg.place.headline_slab',' when you walk in.'))}</span></h2>
      <p>${tc(t('storypg.place.p1','Squat brick building. Gold lettering on the door. A gravel parking lot it shares with a Hires drive-in. Inside: booths that squeak, a waitress who knows the menu by heart, a kitchen you can hear, a dining room that sounds like a dining room is supposed to sound. You sit down. They bring it to you. You pay on the way out.'))}</p>
      <p>${tc(t('storypg.place.p2','It’s the place you went after the game. The place your parents took you on Friday. The place where the same song’s been on the speakers since the Carter administration. Salt Lake is full of pizza now. Some of it is very good. None of it has been here for sixty years.'))}</p>
    </div>
  </div>
</section>

<section class="warm-section">
  <div class="sticky-story">
    <div class="image-stack">
      <figure class="reveal full">
        <img src="/assets/images/optimized/litzas-dough-flip.jpg" alt="A Litzas cook tossing fresh pizza dough high in the air" loading="lazy">
        <figcaption>Hand-tossed, every single pie</figcaption>
      </figure>
      <figure class="reveal">
        <img src="/assets/images/optimized/litzas-owner-oven.jpg" alt="The owner sliding pizzas into the rotating deck oven" loading="lazy">
        <figcaption>The owner, still working the oven</figcaption>
      </figure>
    </div>
    <div class="copy reveal">
      <p class="eyebrow">${tc(t('storypg.pizza.eyebrow','The Pizza'))}</p>
      <h2>${tc(t('storypg.pizza.headline','The dough still has'))}<span class="slab">${tc(t('storypg.pizza.headline_slab',' to earn the day.'))}</span></h2>
      <p>${tc(t('storypg.pizza.p1','The dough rests overnight and gets hand-rolled the next morning. The sauce is the sauce — tomato, the right amount of spice, the right amount of restraint. It hasn’t changed since 1965, because it was right the first time.'))}</p>
      <p>${emphasize(t('storypg.pizza.p2','The cheese is 100% real mozzarella — never a blend, never a substitute. We cube it by hand instead of shredding it, so it melts down into the pie instead of sliding off the top, and it pulls the way real cheese is supposed to when you lift a slice.'),['100% real mozzarella'])}</p>
      <p>${emphasize(t('storypg.pizza.p3','The meats are cut and seasoned in our own butcher shop — the sausage, the pepperoni, all of it. Everything else comes from producers the family has bought from for the better part of sixty-five years, and when you’ve known your suppliers that long, quality stops being a decision and becomes a habit. The pies come out of the oven hot, the cut is done by hand, and the box says Fresh Hot Pizza on the side in gold lettering. It’s not a slogan. It’s the instructions.'),['Fresh Hot Pizza'])}</p>
    </div>
  </div>
</section>

<section class="dark-section">
  <div class="sticky-story story-solo">
    <div class="copy reveal">
      <p class="eyebrow">${tc(t('storypg.don.eyebrow','A note on Don Hale'))}</p>
      <h2>${tc(t('storypg.don.headline','The guy who'))}<span class="slab">${tc(t('storypg.don.headline_slab',' started it.'))}</span></h2>
      <p>${tc(t('storypg.don.p1','Litzas exists because Don Hale couldn’t find pizza he liked in Utah in the early sixties. He already ran Hires Big H, the hamburger drive-in next door (since 1959, also still going). He didn’t need another restaurant. He just wanted a real slice in his own town. So he drove around the West for a couple of summers tasting every pie he could find, came home with notebooks full of recipes, and built one. He picked a name with a Z in it because he thought it sounded solid. He was right about both things.'))}</p>
      <p>${emphasize(t('storypg.don.p2','Don passed on. The recipes didn’t. He and his son Mark wrote a book about it called Opportunity Knocks Twice, if you’re curious. Otherwise that’s the whole Don story. The rest is the pizza.'),['Opportunity Knocks Twice'])}</p>
    </div>
  </div>
</section>

<section class="warm-section">
  <div class="hires-bridge">
    <div class="copy reveal">
      <p class="eyebrow">${tc(t('storypg.today.eyebrow','Today'))}</p>
      <h2>${tc(t('storypg.today.headline','Same family.'))}<span class="slab">${tc(t('storypg.today.headline_slab',' Same crew. Same pizza.'))}</span></h2>
      <div class="hires-body">
        <img class="hires-mug" src="/assets/images/optimized/hires-mug.png" alt="Frosty mug of Hires Big H root beer" loading="lazy">
      <p>${tc(t('storypg.today.p1','The Hale family still runs both places. A lot of the kitchen and floor crew has been here longer than most marriages last — some of them remember Don himself working a Friday rush. When you walk in on a Friday night you’ll wait a few minutes. The line is part of it.'))}</p>
      <p>${tc(t('storypg.today.p2','You can get a Litzas pizza and a Hires burger from the same parking lot. Most people do.'))}</p>
      <div class="button-row">
        <a href="/menu/" class="btn btn-primary">See the Menu</a>
        <a href="/locations/" class="btn btn-ghost">Find a Location</a>
      </div>
      </div>
    </div>
  </div>
</section>

<section class="warm-section">
  <div class="page-band">
    <div class="section-kicker center reveal">
      <p class="eyebrow">From the kitchen</p>
      <h2>Sixty years,<span class="slab"> one pizza at a time.</span></h2>
      <p>Dough in the morning, sauce by the ladle, real mozzarella by the handful, into the oven and onto your table. A look behind the counter.</p>
    </div>
    <div class="photo-gallery">
      <figure class="reveal"><img src="/assets/images/optimized/litzas-cheese-pour.jpg" alt="Shredded mozzarella poured over fresh sauce" loading="lazy"></figure>
      <figure class="reveal"><img src="/assets/images/optimized/litzas-sauce-ladle.jpg" alt="Ladling sauce onto hand-rolled dough" loading="lazy"></figure>
      <figure class="reveal"><img src="/assets/images/optimized/litzas-building-supreme.jpg" alt="Building a pepperoni, mushroom and olive pizza" loading="lazy"></figure>
      <figure class="reveal"><img src="/assets/images/optimized/litzas-peels-row.jpg" alt="A row of topped pizzas on peels waiting for the oven" loading="lazy"></figure>
      <figure class="reveal"><img src="/assets/images/optimized/litzas-spinach-oven.jpg" alt="A spinach pizza going into the rotating oven" loading="lazy"></figure>
      <figure class="reveal"><img src="/assets/images/optimized/litzas-cutting-pizza.jpg" alt="Cutting a fresh pepperoni pizza with a wheel cutter" loading="lazy"></figure>
      <figure class="reveal"><img src="/assets/images/optimized/litzas-pizza-spread.jpg" alt="A spread of finished Litzas pizzas on the table" loading="lazy"></figure>
      <figure class="reveal"><img src="/assets/images/optimized/litzas-topping-sausage.jpg" alt="Hand-spreading sausage over cheese on a thin crust" loading="lazy"></figure>
      <figure class="reveal"><img src="/assets/images/optimized/litzas-slice-closeup.jpg" alt="A gooey slice of Litzas pepperoni pizza being lifted" loading="lazy"></figure>
    </div>
  </div>
</section>

<section class="dark-section">
  <div class="page-band">
    <div class="section-kicker center reveal">
      <p class="eyebrow">Customer Love &middot; Google</p>
      <h2>Sixty years of regulars.<span class="slab"> A thousand-plus reviews.</span></h2>
      <p>We've been on 400 South since 1965, and more than a thousand Google reviews later, the regulars keep saying the same things. Here's a little of what they say.</p>
    </div>
    ${reviewGrid()}
    <div class="button-row center-row" style="margin-top: clamp(28px, 4vw, 40px);">
      <a href="/locations/" class="btn btn-ghost-light">See more, then come hungry &rarr;</a>
    </div>
  </div>
</section>`);
}

// ============================================================
// BLOG — index + sample posts
// ============================================================

const blogPosts = [
  {
    slug: 'best-pizza-salt-lake-city',
    title: 'Where to Get Pizza in Salt Lake City',
    date: '2026-05-17',
    excerpt: 'A short guide to Salt Lake pizza, from a place that\u2019s been part of it since 1965.',
    photo: '/assets/images/optimized/pizza-overhead-pair.jpg',
    eyebrow: 'Salt Lake \u00B7 Pizza'
  },
  {
    slug: 'midvale-family-pizza',
    title: 'The Fort Union Building',
    date: '2026-05-06',
    excerpt: 'Why our Midvale shop shares a building with a hamburger drive-in, and why the parking lot is busier than it has any business being.',
    photo: '/assets/images/optimized/litzas-exterior-dusk.jpg',
    eyebrow: 'Midvale \u00B7 Fort Union'
  },
  {
    slug: 'why-litzas-is-named-with-a-z',
    title: 'About the Z',
    date: '2026-05-12',
    excerpt: 'People ask about the spelling. Here\u2019s the short answer.',
    photo: '/assets/images/optimized/pizzeria-mural.jpg',
    eyebrow: 'House Notes'
  }
];

function blogIndexPage() {
  // Store posts (written by Ali in the editor) come first, newest first; then
  // any hardcoded SEO posts whose slug isn't overridden by a store post.
  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); } catch(e){ return d || ''; } };
  const fromStore = (storePosts || []).map((p) => ({
    slug: p.slug, title: p.title, date: fmtDate(p.published_at),
    excerpt: p.excerpt || '', photo: p.hero_image || '/assets/images/optimized/litzas-night-sign.jpg',
    eyebrow: p.category || 'House Notes'
  }));
  const storeSlugs = new Set(fromStore.map((p) => p.slug));
  const merged = [...fromStore, ...blogPosts.filter((p) => !storeSlugs.has(p.slug))];
  return layout({
    current: '/blog/',
    title: 'House Notes \u00B7 Litzas Pizza',
    description: 'Notes from the booth. Salt Lake pizza, the dough, the room, the regulars.'
  }, `
<section class="page-hero" aria-labelledby="blog-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/litzas-night-sign.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">House notes</p>
    <h1 id="blog-h">From the booth.<span class="slab"> Short reads about a long-running pizza joint.</span></h1>
    <p>Salt Lake pizza, the dough, the room, the regulars.</p>
  </div>
</section>

<section class="dark-section">
  <div class="blog-grid">
    ${merged.map((post) => `
    <article class="post-card reveal">
      <a href="/blog/${esc(post.slug)}/" class="photo">
        <img src="${esc(post.photo)}" alt="${esc(post.title)}" loading="lazy">
      </a>
      <div class="body">
        <p class="meta">${esc(post.eyebrow)} · ${esc(post.date)}</p>
        <h3><a href="/blog/${esc(post.slug)}/">${esc(post.title)}</a></h3>
        <p class="excerpt">${esc(post.excerpt)}</p>
        <a href="/blog/${esc(post.slug)}/" class="more">Read</a>
      </div>
    </article>`).join('\n')}
  </div>
</section>`);
}

function blogPostPage(post, body) {
  return layout({
    current: '/blog/',
    title: `${post.title} · Litzas Pizza`,
    description: post.excerpt
  }, `
<article class="post-article">
  <p class="post-meta">${esc(post.eyebrow)} · ${esc(post.date)}</p>
  <h1>${esc(post.title)}</h1>
  ${post.photo ? `<figure class="post-hero reveal"><img src="${esc(post.photo)}" alt="${esc(post.title)}" loading="lazy"></figure>` : ''}
  ${body}
  <p style="margin-top: 48px;"><a href="/blog/" class="btn btn-ghost">← All Posts</a></p>
</article>`);
}

const postBodies = {
  'best-pizza-salt-lake-city': `
<p class="lead">Salt Lake has a real pizza scene now. There are wood-fired places, Detroit-square places, fancy places with tasting menus. Some of it is genuinely great. I&rsquo;m not going to rank anyone.</p>
<p>Here&rsquo;s what I&rsquo;ll say about Litzas: we&rsquo;ve been on 400 South since 1965, doing the same thing the same way, and we&rsquo;re still here. The dough is hand-rolled in the morning. The sauce is the sauce. The cheese is real mozzarella, not a blend. The pies come out hot and get cut by hand.</p>
<p>It&rsquo;s a sit-down place. Waitresses bring the food, you pay on the way out, the Hires next door pours the root beer in a frosted mug. Pretty straightforward.</p>
<p>That&rsquo;s the deal. It&rsquo;s the deal a lot of Salt Lake families know by heart. If you&rsquo;re new in town and you want a pizza that isn&rsquo;t trying to impress you, come find us.</p>
<p><a href="/locations/">SLC \u00B7 716 East 400 South</a> &middot; <a href="/locations/">Midvale \u00B7 835 East Fort Union</a></p>
`,
  'midvale-family-pizza': `
<p class="lead">Our Midvale shop is in a building it shares with a Hires Big H drive-in. Same family runs both. Same parking lot, same kitchen-adjacent set-up, two menus.</p>
<p>You can order a Litzas pizza and a Hires cheeseburger and a frosted mug of root beer and walk out with a perfectly absurd dinner. People do it all the time. We&rsquo;ve been watching them do it for fifty years.</p>
<p>The Midvale dining room is small and warm and busy. Booth lighting. The kitchen sound is right there. Friday and Saturday nights it&rsquo;s packed. Tuesday at 4pm you can walk in and have a slice in five minutes. Both are valid.</p>
<p>The pizza is the same as the SLC pizza. The dough is rolled in the morning. The sauce is the sauce. The cheese is real. We&rsquo;re open every day. <a href="/locations/">835 East Fort Union Boulevard</a>.</p>
`,
  'why-litzas-is-named-with-a-z': `
<p class="lead">People ask about the spelling pretty often. Here&rsquo;s the short answer.</p>
<p>When Don Hale was picking a name in 1965, he wanted it to rhyme with pizza and have a Z in it because he thought a Z looked solid. That&rsquo;s it. That&rsquo;s the whole reason.</p>
<p>It is, on the merits, a slightly weird name. We&rsquo;ve owned it for sixty years. It&rsquo;s on every box. It works.</p>
<p>The pizza is the same as it&rsquo;s always been. <a href="/menu/">Menu&rsquo;s here</a>.</p>
`
};

function blogPostPages() {
  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); } catch(e){ return d || ''; } };
  // markdown-lite: blank-line paragraphs, plus "## " headings, "- " bullet lists,
  // [text](url) links, and **bold**. Everything is tc()-escaped FIRST; only these
  // specific patterns then emit tags, so store copy still can't inject arbitrary
  // HTML (and link URLs are restricted to http(s)/relative/anchor/mailto).
  const inlineMd = (s) => tc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
      if (!/^(https?:\/\/|\/|#|mailto:)/i.test(url)) return text;
      const ext = /^https?:\/\//i.test(url);
      return `<a href="${url}"${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
    });
  const bodyHtml = (raw) => String(raw || '').trim().split(/\n\s*\n/).map((block, i) => {
    const b = block.trim();
    if (b.startsWith('## ')) return `<h2>${inlineMd(b.slice(3).trim())}</h2>`;
    const lines = b.split('\n');
    if (lines.length && lines.every((l) => l.trim().startsWith('- '))) {
      return `<ul>${lines.map((l) => `<li>${inlineMd(l.trim().slice(2).trim())}</li>`).join('')}</ul>`;
    }
    return `<p${i === 0 ? ' class="lead"' : ''}>${inlineMd(b)}</p>`;
  }).join('\n');
  const storeSlugs = new Set((storePosts || []).map((p) => p.slug));
  const storePages = (storePosts || []).map((p) => ({
    path: `blog/${p.slug}/index.html`,
    html: blogPostPage(
      { slug: p.slug, title: p.title, date: fmtDate(p.published_at), excerpt: p.excerpt || '', eyebrow: p.category || 'House Notes', photo: p.hero_image || '/assets/images/optimized/litzas-night-sign.jpg' },
      bodyHtml(p.body)
    )
  }));
  const hardPages = blogPosts.filter((post) => !storeSlugs.has(post.slug)).map((post) => ({
    path: `blog/${post.slug}/index.html`,
    html: blogPostPage(post, postBodies[post.slug] || '<p>Coming soon.</p>')
  }));
  return [...storePages, ...hardPages];
}

// ============================================================
// JOBS — application form, POSTs to hiresbigh.com/api/jobs with brand=litzas
// ============================================================

function jobsPage() {
  return layout({
    current: '/jobs/',
    title: 'Join the Litzas Pizza Team · Now Hiring',
    description: 'Apply to join the Litzas Pizza team in Salt Lake City or Midvale. We hire crew, cooks, cashiers, and shift leads year round.'
  }, `
<section class="page-hero" aria-labelledby="jobs-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/litzas-topping-sausage.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">${tc(t("jobspg.hero.eyebrow", "Now Hiring"))}</p>
    <h1 id="jobs-h">${tc(t("jobspg.hero.headline", "Join the family."))}<span class="slab">${tc(t("jobspg.hero.headline_slab", " Make some pizza."))}</span></h1>
    <p>${tc(t("jobspg.hero.body", "Litzas hires people who care about the details — same as Hires Big H. Crew, cooks, cashiers, shift leads. Salt Lake City and Midvale."))}</p>
  </div>
</section>

<section class="dark-section">
  <div class="form-band">
    <div class="form-shell">
      <p class="form-intro">Fill this out and it lands with our hiring team. You'll hear back fast. Have questions? Call SLC at <a href="tel:+18013595352">801.359.5352</a> or Midvale at <a href="tel:+18015612171">801.561.2171</a>.</p>

      <form data-litzas-form action="${JOBS_ENDPOINT}" data-brand="litzas" method="post" enctype="multipart/form-data" novalidate>
        <div class="form-grid">
          <div class="field">
            <label for="firstName">First Name<span class="req">*</span></label>
            <input id="firstName" name="firstName" type="text" required autocomplete="given-name">
          </div>
          <div class="field">
            <label for="lastName">Last Name<span class="req">*</span></label>
            <input id="lastName" name="lastName" type="text" required autocomplete="family-name">
          </div>
          <div class="field">
            <label for="email">Email<span class="req">*</span></label>
            <input id="email" name="email" type="email" required autocomplete="email">
          </div>
          <div class="field">
            <label for="phone">Phone<span class="req">*</span></label>
            <input id="phone" name="phone" type="tel" required autocomplete="tel">
          </div>
          <div class="field full">
            <label for="address">City / Area</label>
            <input id="address" name="address" type="text" placeholder="e.g. Sugar House, Murray, Bountiful" autocomplete="address-level2">
          </div>
          <div class="field">
            <label for="location">Preferred Location<span class="req">*</span></label>
            <select id="location" name="location" required>
              <option value="">Pick one</option>
              <option value="slc">Salt Lake City</option>
              <option value="midvale">Midvale</option>
              <option value="any">Either / Open</option>
            </select>
          </div>
          <div class="field">
            <label for="position">Position<span class="req">*</span></label>
            <select id="position" name="position" required>
              <option value="">Pick one</option>
              <option value="crew">Crew Member</option>
              <option value="cook">Cook / Kitchen</option>
              <option value="cashier">Cashier</option>
              <option value="shift-lead">Shift Lead</option>
              <option value="manager">Manager</option>
              <option value="catering">Catering</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="field">
            <label for="type">Full / Part Time<span class="req">*</span></label>
            <select id="type" name="type" required>
              <option value="">Pick one</option>
              <option value="full-time">Full-Time</option>
              <option value="part-time">Part-Time</option>
              <option value="either">Either</option>
            </select>
          </div>
          <div class="field">
            <label for="age">16 or Older?<span class="req">*</span></label>
            <select id="age" name="age" required>
              <option value="">Pick one</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div class="field">
            <label for="experience">Restaurant Experience</label>
            <select id="experience" name="experience">
              <option value="">Pick one</option>
              <option value="none">None — happy to learn</option>
              <option value="under-1">Less than 1 year</option>
              <option value="1-3">1–3 years</option>
              <option value="3-5">3–5 years</option>
              <option value="5-plus">5+ years</option>
            </select>
          </div>
          <div class="field full">
            <label for="availability">Availability</label>
            <textarea id="availability" name="availability" rows="3" placeholder="Days, evenings, weekends — let us know what works."></textarea>
          </div>
          <div class="field full">
            <label for="why">Why Litzas?</label>
            <textarea id="why" name="why" rows="3" placeholder="A sentence is plenty."></textarea>
          </div>
          <div class="field full">
            <label for="resume">Resume (optional)</label>
            <input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx,.txt">
            <span class="field-note">PDF, Word, or text. 5 MB max.</span>
          </div>
          <div class="field full">
            <label for="referral">How did you hear about us?</label>
            <input id="referral" name="referral" type="text" placeholder="Friend, walk-in, Google, Hires team, etc.">
          </div>
        </div>
        <div class="form-actions">
          <span class="form-status" aria-live="polite"></span>
          <button type="submit" class="btn btn-primary">Send Application</button>
        </div>
      </form>
    </div>
  </div>
</section>`);
}

// ============================================================
// CATERING — inquiry form, POSTs to hiresbigh.com/api/catering with brand=litzas
// ============================================================

function cateringPage() {
  return layout({
    current: '/catering/',
    title: 'Litzas Pizza Catering · Salt Lake City & Midvale',
    description: 'Catering for offices, schools, teams, weddings, and family gatherings. Big pizza orders, gluten-free options, and the SLC back room for up to 40 guests.'
  }, `
<section class="page-hero" aria-labelledby="catering-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/litzas-cutting-pizza.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">${tc(t("cateringpg.hero.eyebrow", "Catering & Big Orders"))}</p>
    <h1 id="catering-h">${tc(t("cateringpg.hero.headline", "Pizza for the"))}<span class="slab">${tc(t("cateringpg.hero.headline_slab", " whole crew."))}</span></h1>
    <p>${tc(t("cateringpg.hero.body", "Office lunches. Team dinners. Birthday parties. Weddings. Anything bigger than a family pizza — give us a heads-up and we'll take care of it."))}</p>
  </div>
</section>

<section class="dark-section">
  <div class="form-band">
    <div class="form-shell">
      <p class="form-intro">Tell us about the event. We'll come back with timing, pricing, and a plan. Need to talk it through? Call SLC at <a href="tel:+18013595352">801.359.5352</a> or Midvale at <a href="tel:+18015612171">801.561.2171</a>.</p>

      <form data-litzas-form action="${CATERING_ENDPOINT}" data-brand="litzas" method="post" novalidate>
        <div class="form-grid">
          <div class="field">
            <label for="cName">Your Name<span class="req">*</span></label>
            <input id="cName" name="name" type="text" required autocomplete="name">
          </div>
          <div class="field">
            <label for="cCompany">Company / Group</label>
            <input id="cCompany" name="company" type="text" autocomplete="organization">
          </div>
          <div class="field">
            <label for="cEmail">Email<span class="req">*</span></label>
            <input id="cEmail" name="email" type="email" required autocomplete="email">
          </div>
          <div class="field">
            <label for="cPhone">Phone<span class="req">*</span></label>
            <input id="cPhone" name="phone" type="tel" required autocomplete="tel">
          </div>
          <div class="field">
            <label for="cEventDate">Event Date<span class="req">*</span></label>
            <input id="cEventDate" name="eventDate" type="date" required>
          </div>
          <div class="field">
            <label for="cEventTime">Event Time</label>
            <input id="cEventTime" name="eventTime" type="time">
          </div>
          <div class="field">
            <label for="cGuests">Estimated Guests<span class="req">*</span></label>
            <input id="cGuests" name="guests" type="number" min="1" required>
          </div>
          <div class="field">
            <label for="cLocation">Preferred Location</label>
            <select id="cLocation" name="location">
              <option value="">Pick one</option>
              <option value="slc">Pick up — Salt Lake City</option>
              <option value="midvale">Pick up — Midvale</option>
              <option value="delivery">Delivery</option>
              <option value="back-room">Use the SLC back room (up to 40)</option>
            </select>
          </div>
          <div class="field full">
            <label for="cEventType">Type of Event</label>
            <input id="cEventType" name="eventType" type="text" placeholder="Office lunch, birthday, team dinner, wedding, etc.">
          </div>
          <div class="field full">
            <label for="cDetails">Tell us about it</label>
            <textarea id="cDetails" name="details" rows="5" placeholder="What you'd like to serve, any dietary needs, gluten-free options, the whole story."></textarea>
          </div>
        </div>
        <div class="form-actions">
          <span class="form-status" aria-live="polite"></span>
          <button type="submit" class="btn btn-primary">Send Inquiry</button>
        </div>
      </form>
    </div>
  </div>
</section>

<section class="warm-section">
  <div class="page-band">
    <div class="section-kicker center reveal">
      <p class="eyebrow">What we cater</p>
      <h2>The full menu.<span class="slab"> At scale.</span></h2>
      <p>Whole pizzas, half-and-half, salads, made-from-scratch lasagna and spaghetti, garlic bread, gluten-free options. Drinks include the family root beer in frosted mugs (for in-room events) or bottled.</p>
    </div>
  </div>
</section>`);
}

// ============================================================
// BUILD — write all pages
// ============================================================

const pages = [
  { path: 'index.html',              html: homePage() },
  { path: 'menu/index.html',         html: menuPage() },
  { path: 'locations/index.html',    html: locationsPage() },
  { path: 'shop/index.html',         html: shopPage() },
  { path: 'story/index.html',        html: storyPage() },
  { path: 'blog/index.html',         html: blogIndexPage() },
  { path: 'jobs/index.html',         html: jobsPage() },
  { path: 'catering/index.html',     html: cateringPage() },
  ...blogPostPages()
];

for (const { path, html } of pages) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
}

console.log(`Rendered ${pages.length} pages.`);
