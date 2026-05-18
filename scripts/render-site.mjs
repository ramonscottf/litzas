import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import menu from '../data/menu.json' with { type: 'json' };
import locationsData from '../data/locations.json' with { type: 'json' };
import manifest from '../data/menu-photo-manifest.json' with { type: 'json' };

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pizzas = menu.categories.find((category) => category.id === 'pizzas').items;
const approvedPhotos = new Map(
  manifest.pizzas
    .filter((item) => item.approvalStatus !== 'needs-generation')
    .map((item) => [item.slug, item])
);

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

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
  return `<p class="pizza-price" ${dataAttrs}><span class="price-size">${esc(SIZE_LABELS[DEFAULT_SIZE])}</span><span class="price-amount">$${esc(four[defaultIdx])}</span></p>`;
};

// Simpler price line for single-price items (salads, apps, drinks).
const singlePriceLine = (price) => price
  ? `<p class="pizza-price single"><span class="price-amount">$${esc(price)}</span></p>`
  : '';

// Size-tabs UI rendered above any grid of multi-size pizza cards.
const sizeTabs = () => `<div class="size-tabs" role="tablist" aria-label="Pizza size">
  ${SIZE_KEYS.map((k) => `<button type="button" class="size-tab${k === DEFAULT_SIZE ? ' active' : ''}" role="tab" aria-selected="${k === DEFAULT_SIZE}" data-size="${k}">${esc(SIZE_LABELS[k])}</button>`).join('\n  ')}
</div>`;

const HIRES_API_BASE = 'https://hiresbigh.com';
const JOBS_ENDPOINT = `${HIRES_API_BASE}/api/jobs`;
const CATERING_ENDPOINT = `${HIRES_API_BASE}/api/catering`;

function nav(current = '') {
  const links = [
    ['/', 'Home'],
    ['/menu/', 'Menu'],
    ['/locations/', 'Locations'],
    ['/story/', 'Story'],
    ['/catering/', 'Catering'],
    ['/blog/', 'Stories'],
    ['/jobs/', 'Jobs']
  ];
  return `
<a class="skip-link" href="#main">Skip to content</a>
<header class="nav" id="nav">
  <div class="scroll-progress" id="scroll-progress" aria-hidden="true"></div>
  <div class="nav-inner">
    <a href="/" class="nav-mark" aria-label="Litzas Pizza home">
      <img src="/assets/images/brand/litzas-logo-cream.png" alt="Litzas Pizza" width="394" height="137" loading="eager">
    </a>
    <nav id="nav-links" class="nav-links" aria-label="Primary">
      ${links.map(([href, label]) => `<a href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a>`).join('\n      ')}
      <a href="tel:+18013595352" class="nav-cta">Call to Order</a>
    </nav>
    <button class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>`;
}

function footer() {
  return `
<footer class="footer">
  <div class="footer-inner">
    <div>
      <a href="/" class="footer-mark" aria-label="Litzas Pizza home">
        <img src="/assets/images/brand/litzas-logo-cream.png" alt="Litzas Pizza" width="394" height="137" loading="lazy">
      </a>
      <p class="footer-tagline">Family pizza in Salt Lake City and Midvale since 1965. Same Hale family. Same Utah pride.</p>
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
        <li><a href="tel:+18013595352">SLC · 801.359.5352</a></li>
        <li><a href="tel:+18015612171">Midvale · 801.561.2171</a></li>
        <li><a href="/locations/">Get Directions</a></li>
        <li><a href="https://hiresbigh.com" target="_blank" rel="noopener">Hires Big H</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Family</h4>
      <ul>
        <li><a href="/jobs/">Join the Team</a></li>
        <li><a href="/catering/">Catering &amp; Events</a></li>
        <li><a href="/blog/">Stories from the Booth</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; <span id="year">2026</span> Litzas Pizza · A Hale Family Restaurant</span>
    <span>Salt Lake City · Midvale · Utah</span>
  </div>
</footer>
<script src="/js/main.js" defer></script>`;
}

function head({ title, description, current = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="/assets/images/optimized/pizza-overhead-pair.jpg">
<meta property="og:type" content="restaurant.restaurant">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Alfa+Slab+One&family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/webp" href="/assets/images/optimized/logo-wordmark.webp">
<link rel="stylesheet" href="/css/style.css">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "Litzas Pizza",
  "url": "https://www.litzaspizza.com",
  "image": "https://www.litzaspizza.com/assets/images/optimized/pizza-overhead-pair.jpg",
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
${nav(current)}`;
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

function pizzaCard(pizza, index) {
  const photo = approvedPhotos.get(pizza.slug);
  const ingredients = pizza.ingredients || '';
  const number = String(index + 1).padStart(2, '0');

  if (photo) {
    return `<article class="pizza-card reveal">
  <div class="pizza-photo">
    <img src="/${esc(photo.file)}" alt="${esc(photo.alt)}" loading="lazy" width="1024" height="768">
  </div>
  <div class="pizza-body">
    <h3 class="pizza-name">${esc(pizza.name)}</h3>
    <p class="toppings">${esc(ingredients)}</p>
    ${priceLine(pizza.prices)}
  </div>
</article>`;
  }

  return `<article class="pizza-card reveal">
  <div class="pizza-photo-empty"></div>
  <div class="pizza-body">
    <h3 class="pizza-name">${esc(pizza.name)}</h3>
    <p class="toppings">${esc(ingredients)}</p>
    ${priceLine(pizza.prices)}
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
      'salt-lake-city': '/assets/images/optimized/litzas-night-sign.jpg',
      'midvale':        '/assets/images/optimized/litzas-brick-door.jpg'
    };
    const photo = photoBySlug[location.id] || '/assets/images/optimized/pizza-overhead-pair.jpg';

    return `<article class="loc-card reveal">
  <div class="loc-photo">
    <img src="${photo}" alt="${esc(location.name + ' Litzas exterior')}" loading="lazy">
    <span class="badge">${esc(location.tag || '')}</span>
  </div>
  <div class="loc-body">
    <h3>${esc(location.name)}</h3>
    <p class="loc-meta">${esc(location.tag || 'Family pizza · Since 1965')}</p>
    <p class="loc-address">${location.address.map(esc).join('<br>')}</p>
    <div class="loc-hours">
      ${location.hours.map((row) => `<div><strong>${esc(row.days)}</strong> · ${esc(row.time)}</div>`).join('\n      ')}
    </div>
    <div class="loc-actions">
      <a class="btn btn-primary" href="tel:${esc(location.tel)}">${esc(location.phone)}</a>
      <a class="btn btn-ghost" data-maps="${esc(mapsQuery)}" data-lat="${coords.lat}" data-lng="${coords.lng}" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(mapsQuery)}">Directions</a>
      ${withOrderButton ? `<button type="button" class="btn btn-ghost order-button" data-order-location="${esc(location.id)}">Order — Call Soon</button>` : ''}
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

function homePage() {
  const featured = ['classic-litzas', 'litzas-meatza', 'spinach-artichoke', 'pepperoni', 'vegetarian', 'deluxe']
    .map((slug, i) => pizzaCard(pizzas.find((p) => p.slug === slug), i))
    .join('\n');

  return layout({
    current: '/',
    title: 'Litzas Pizza · Salt Lake City\u2019s pizza joint since 1965',
    description: 'Hand-rolled dough, real mozzarella, a frosted mug of Hires next door. Salt Lake City and Midvale\u2019s pizza joint since 1965.'
  }, `
<section class="cinema-hero" aria-labelledby="hero-h">
  <div class="hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/pizza-overhead-pair.jpg" alt="">
  </div>
  <div class="hero-shade" aria-hidden="true"></div>
  <div class="hero-content reveal">
    <p class="eyebrow">Salt Lake City &amp; Midvale &middot; Since 1965</p>
    <h1 id="hero-h">Salt Lake&rsquo;s pizza joint.<span class="slab">Sixty years and counting.</span></h1>
    <p>Hand-rolled dough. Real mozzarella. A booth, a slice, a frosted Hires next door. That&rsquo;s the deal. That&rsquo;s always been the deal.</p>
    <div class="button-row">
      <a href="/menu/" class="btn btn-primary">See the Menu</a>
      <a href="/locations/" class="btn btn-ghost">Find a Shop</a>
    </div>
  </div>
  <aside class="hero-note reveal" aria-label="Litzas house notes">
    <span>Two shops</span>
    <span>Hand-rolled dough</span>
    <span>Hires on tap</span>
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

<section class="dark-section" aria-labelledby="story-tease-h">
  <div class="sticky-story">
    <div class="copy reveal">
      <p class="eyebrow">Sixty years on 400 South</p>
      <h2 id="story-tease-h">Walk in.<span class="slab">Order. Sit down.</span></h2>
      <p>There&rsquo;s a building on East 400 South that&rsquo;s been making the same pizza for sixty years. Sticky booths in the best way. The cheese pulls. The cut is still done by hand. On Friday nights the line goes out the door and nobody complains, because the food is worth it.</p>
      <p>Litzas isn&rsquo;t a date-night place. It&rsquo;s not a reservation place. It&rsquo;s the place your dad took you. It&rsquo;s where the team eats after the game. It&rsquo;s the one your kids will bring their kids to.</p>
      <p>You don&rsquo;t need a menu to know what you want. But there is one if you want it.</p>
      <div class="button-row">
        <a href="/story/" class="btn btn-primary">The Story</a>
        <a href="/menu/" class="btn btn-ghost">Open the Menu</a>
      </div>
    </div>
    <div class="image-stack">
      <figure class="reveal">
        <img src="/assets/images/optimized/pizzeria-mural.jpg" alt="The gold Litzas mural inside the Salt Lake City restaurant" loading="lazy">
        <figcaption>SLC &middot; 400 South</figcaption>
      </figure>
      <figure class="reveal">
        <img src="/assets/images/optimized/dough-hands.jpg" alt="Hands rolling fresh pizza dough on flour" loading="lazy">
        <figcaption>Hand-rolled, every morning, every shop</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="dark-section" aria-labelledby="menu-tease-h">
  <div class="section-kicker reveal">
    <p class="eyebrow">The Menu</p>
    <h2 id="menu-tease-h">Twenty-three pizzas.<span class="slab"> Hand-rolled in the morning. Baked when you order.</span></h2>
    <p>A few favorites below. Tap a size to see prices. The full menu is one click away.</p>
  </div>
  <div class="menu-band">
    ${sizeTabs()}
    <div class="menu-grid">
      ${featured}
    </div>
    <div class="center-row" style="margin-top: 36px;">
      <a href="/menu/" class="btn btn-primary">Open Full Menu</a>
    </div>
  </div>
</section>

<section class="warm-section">
  <div class="hires-bridge">
    <div class="copy reveal">
      <p class="eyebrow">Hires next door</p>
      <h2>Same parking lot.<span class="slab"> Same family.</span></h2>
      <p>In Salt Lake, Litzas shares a parking lot with Hires Big H. In Midvale, we share a building. Pour yourself a root beer in a frosted mug. Eat your pizza. It&rsquo;s been the deal since 1965.</p>
      <div class="button-row">
        <a href="https://hiresbigh.com" class="btn btn-ghost" target="_blank" rel="noopener">Visit Hires Big H</a>
      </div>
    </div>
    <figure class="reveal">
      <img src="/assets/images/optimized/rootbeer-mug.jpg" alt="Frosty mug of Hires Big H root beer" loading="lazy">
    </figure>
  </div>
</section>

<section class="dark-section" aria-labelledby="loc-h">
  <div class="section-kicker center reveal">
    <p class="eyebrow">Find Your Litzas</p>
    <h2 id="loc-h">Two shops.<span class="slab"> Same pizza.</span></h2>
    <p>Walk in. Call ahead. We&rsquo;ll have a pie waiting.</p>
  </div>
  <div class="loc-band">
    <div class="loc-grid">${locationCards()}</div>
  </div>
</section>`);
}

function menuPage() {
  // Pizzas — multi-size cards
  const pizzaCards = pizzas.map((pizza, i) => pizzaCard(pizza, i)).join('\n');

  // Build-Your-Own — multi-size (uses same shape as pizzas)
  const byo = (menu.categories.find((c) => c.id === 'create-your-own') || {}).items || [];
  const byoCards = byo.map((item, i) => pizzaCard(item, i)).join('\n');

  // Salads / appetizers / specials / drinks — single price
  const sideCards = (catId) => {
    const cat = menu.categories.find((c) => c.id === catId);
    if (!cat) return '';
    return cat.items.map((item) => `<article class="side-card reveal">
      <div class="side-body">
        <h3 class="side-name">${esc(item.name)}</h3>
        ${item.ingredients ? `<p class="toppings">${esc(item.ingredients)}</p>` : ''}
        ${singlePriceLine((item.prices && item.prices[0]) || item.price)}
      </div>
    </article>`).join('\n');
  };

  return layout({
    current: '/menu/',
    title: 'Menu · Litzas Pizza · Salt Lake City &amp; Midvale',
    description: 'Twenty-three pizzas, hand-rolled and baked when you order. Plus salads, build-your-own, specials, and Hires root beer in a frosted mug.'
  }, `
<section class="page-hero menu-hero" aria-labelledby="menu-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/pizza-overhead-pair.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">The Menu</p>
    <h1 id="menu-h">Twenty-three pizzas.<span class="slab"> Hand-rolled. Cut by hand. Boxed in gold.</span></h1>
    <p>Pick a size up top. The price updates on every pizza. Browse, or jump to a section.</p>
  </div>
</section>

<nav class="menu-jump" aria-label="Menu sections">
  <a href="#favorites">Favorites</a>
  <a href="#build">Build Your Own</a>
  <a href="#sides">Salads &amp; Apps</a>
  <a href="#specials">Specials</a>
  <a href="#drinks">Drinks</a>
</nav>

<section class="dark-section" id="favorites">
  <div class="menu-band">
    <div class="menu-section-head reveal">
      <h2>Litzas Favorites</h2>
      <p>Twenty-three pies, each available in four sizes.</p>
    </div>
    ${sizeTabs()}
    <div class="menu-grid">${pizzaCards}</div>
  </div>
</section>

${byoCards ? `<section class="warm-section" id="build">
  <div class="menu-band">
    <div class="menu-section-head reveal">
      <h2>Build Your Own</h2>
      <p>Start with a crust, add what you want.</p>
    </div>
    ${sizeTabs()}
    <div class="menu-grid">${byoCards}</div>
  </div>
</section>` : ''}

<section class="dark-section" id="sides">
  <div class="menu-band">
    <div class="menu-section-head reveal">
      <h2>Salads &amp; Appetizers</h2>
    </div>
    <div class="side-grid">${sideCards('salads-appetizers')}</div>
  </div>
</section>

<section class="warm-section" id="specials">
  <div class="menu-band">
    <div class="menu-section-head reveal">
      <h2>Specials &amp; Entrees</h2>
      <p>Lasagna, spaghetti, garlic bread — Don worked on these recipes too, back when he was figuring out the pizza.</p>
    </div>
    <div class="side-grid">${sideCards('specials-entrees')}</div>
  </div>
</section>

<section class="dark-section" id="drinks">
  <div class="menu-band">
    <div class="menu-section-head reveal">
      <h2>Drinks</h2>
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
    title: 'Litzas Pizza Locations · Salt Lake City &amp; Midvale',
    description: 'Visit Litzas Pizza at 716 East 400 South in Salt Lake City, or 835 East Fort Union Boulevard in Midvale.'
  }, `
<section class="page-hero" aria-labelledby="loc-page-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/litzas-night-sign.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">Visit · Call · Stop In</p>
    <h1 id="loc-page-h">Find your Litzas.<span class="slab"> Same pizza, two shops.</span></h1>
    <p>SLC shares a parking lot with Hires Big H. Midvale shares a building. You won't have to look hard.</p>
  </div>
</section>

<section class="dark-section">
  <div class="loc-band">
    <div class="loc-grid">${locationCards({ withOrderButton: true })}</div>
    <div class="loc-map-strip">${locationMaps()}</div>
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
    <img data-parallax src="/assets/images/optimized/rootbeer-floats.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">Hires Big H · Family Brand</p>
    <h1 id="shop-h">Root Beer in a Frosted Mug.<span class="slab"> Always Has Been.</span></h1>
    <p>Don Hale opened Hires in 1959. Six years later, he opened Litzas. The root beer has been the same all along.</p>
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
      <div class="photo"><img src="/assets/images/optimized/rootbeer-floats.jpg" alt="Root beer floats" loading="lazy"></div>
      <div class="body">
        <h3>Root Beer Floats</h3>
        <p>Vanilla ice cream meets the Hires recipe. A classic dessert order.</p>
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
    <p class="eyebrow">The Story</p>
    <h1 id="story-h">There&rsquo;s a place<span class="slab"> on 400 South.</span></h1>
    <p>It&rsquo;s been there longer than most things in this city. Salt Lake has gotten taller and weirder around it. The pizza hasn&rsquo;t moved.</p>
  </div>
</section>

<section class="dark-section">
  <div class="sticky-story">
    <div class="copy reveal">
      <p class="eyebrow">The Place</p>
      <h2>You know it<span class="slab"> when you walk in.</span></h2>
      <p>Squat brick building. Gold lettering on the door. A gravel parking lot it shares with a Hires drive-in. Inside: booths that squeak, a waitress who knows the menu by heart, a kitchen you can hear, a dining room that sounds like a dining room is supposed to sound. You sit down. They bring it to you. You pay on the way out.</p>
      <p>It&rsquo;s the place you went after the game. The place your parents took you on Friday. The place where the same song&rsquo;s been on the speakers since the Carter administration. Salt Lake is full of pizza now. Some of it is very good. None of it has been here for sixty years.</p>
    </div>
    <div class="image-stack">
      <figure class="reveal">
        <img src="/assets/images/optimized/litzas-night-sign.jpg" alt="Litzas and Hires Big H sign glowing at night on East 400 South" loading="lazy">
        <figcaption>SLC &middot; 400 South, after dark</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="warm-section">
  <div class="sticky-story">
    <div class="image-stack">
      <figure class="reveal">
        <img src="/assets/images/optimized/dough-hands.jpg" alt="Fresh pizza dough being rolled by hand" loading="lazy">
        <figcaption>Rolled in the morning, baked when you order</figcaption>
      </figure>
      <figure class="reveal">
        <img src="/assets/images/optimized/pizza-overhead-pair.jpg" alt="Two Litzas pizzas on a worn wood table" loading="lazy">
        <figcaption>The same pizza, sixty years running</figcaption>
      </figure>
    </div>
    <div class="copy reveal">
      <p class="eyebrow">The Pizza</p>
      <h2>The dough still has<span class="slab"> to earn the day.</span></h2>
      <p>The dough rests overnight and gets hand-rolled the next morning. The sauce is the sauce &mdash; tomato, the right amount of spice, the right amount of restraint. The cheese is real mozzarella. Not a blend. Not a substitute. When you pick up a slice, the cheese pulls the way it&rsquo;s supposed to pull.</p>
      <p>The pies come out of the oven hot. The cut is done by hand. The box says <em>Fresh Hot Pizza</em> on the side in gold lettering. It&rsquo;s not a slogan. It&rsquo;s the instructions.</p>
    </div>
  </div>
</section>

<section class="dark-section">
  <div class="sticky-story">
    <div class="copy reveal">
      <p class="eyebrow">A note on Don Hale</p>
      <h2>The guy who<span class="slab"> started it.</span></h2>
      <p>Litzas exists because Don Hale couldn&rsquo;t find pizza he liked in Utah in the early sixties. He already ran Hires Big H, the hamburger drive-in next door (since 1959, also still going). He didn&rsquo;t need another restaurant. He just wanted a real slice in his own town. So he drove around the West for a couple of summers tasting every pie he could find, came home with notebooks full of recipes, and built one. He picked a name with a Z in it because he thought it sounded solid. He was right about both things.</p>
      <p>Don passed on. The recipes didn&rsquo;t. He and his son Mark wrote a book about it called <em>Opportunity Knocks Twice</em>, if you&rsquo;re curious. Otherwise that&rsquo;s the whole Don story. The rest is the pizza.</p>
    </div>
    <div class="image-stack">
      <figure class="reveal">
        <img src="/assets/images/optimized/pizzeria-mural.jpg" alt="The gold Litzas mural inside the SLC dining room" loading="lazy">
        <figcaption>The mural &middot; 400 South dining room</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="warm-section">
  <div class="hires-bridge">
    <div class="copy reveal">
      <p class="eyebrow">Today</p>
      <h2>Same family.<span class="slab"> Same crew. Same pizza.</span></h2>
      <p>The Hale family still runs both places. A lot of the kitchen and floor crew has been here longer than most marriages last &mdash; some of them remember Don himself working a Friday rush. When you walk in on a Friday night you&rsquo;ll wait a few minutes. The line is part of it.</p>
      <p>You can get a Litzas pizza and a Hires burger from the same parking lot. Most people do.</p>
      <div class="button-row">
        <a href="/menu/" class="btn btn-primary">See the Menu</a>
        <a href="/locations/" class="btn btn-ghost">Find a Shop</a>
      </div>
    </div>
    <figure class="reveal">
      <img src="/assets/images/optimized/rootbeer-floats.jpg" alt="Hires Big H root beer floats on a Litzas table" loading="lazy">
    </figure>
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
    photo: '/assets/images/optimized/litzas-brick-door.jpg',
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
    ${blogPosts.map((post) => `
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
  ${body}
  <p style="margin-top: 48px;"><a href="/blog/" class="btn btn-ghost">← All Stories</a></p>
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
  return blogPosts.map((post) => ({
    path: `blog/${post.slug}/index.html`,
    html: blogPostPage(post, postBodies[post.slug] || '<p>Coming soon.</p>')
  }));
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
    <img data-parallax src="/assets/images/optimized/dough-hands.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">Now Hiring</p>
    <h1 id="jobs-h">Join the family.<span class="slab"> Make some pizza.</span></h1>
    <p>Litzas hires people who care about the details — same as Hires Big H. Crew, cooks, cashiers, shift leads. Salt Lake City and Midvale.</p>
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
    title: 'Litzas Pizza Catering · Salt Lake City &amp; Midvale',
    description: 'Catering for offices, schools, teams, weddings, and family gatherings. Big pizza orders, gluten-free options, and the SLC back room for up to 40 guests.'
  }, `
<section class="page-hero" aria-labelledby="catering-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/pizza-overhead-pair.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">Catering &amp; Big Orders</p>
    <h1 id="catering-h">Pizza for the<span class="slab"> whole crew.</span></h1>
    <p>Office lunches. Team dinners. Birthday parties. Weddings. Anything bigger than a family pie — give us a heads-up and we'll take care of it.</p>
  </div>
</section>

<section class="dark-section">
  <div class="form-band">
    <div class="form-shell">
      <p class="form-intro">Tell us about the event. We'll come back with timing, pricing, and a plan. Need to talk it through? Call <a href="tel:+18013595352">801.359.5352</a>.</p>

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
