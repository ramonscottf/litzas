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

const priceLine = (prices = []) => prices.length
  ? `<p class="price">${prices.map((price) => `$${price}`).join(' <span>/</span> ')}</p>`
  : '';

function nav(current = '') {
  const links = [
    ['/', 'Home'],
    ['/menu/', 'Menu'],
    ['/locations/', 'Locations'],
    ['/story/', 'Story'],
    ['/shop/', 'Root Beer']
  ];
  return `
<a class="skip-link" href="#main">Skip to content</a>
<header class="nav" id="nav">
  <div class="scroll-progress" id="scroll-progress" aria-hidden="true"></div>
  <div class="nav-inner">
    <button class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links">
      <span></span><span></span><span></span>
    </button>
    <a href="/" class="nav-mark" aria-label="Litzas Pizza home">
      <img src="/assets/images/optimized/logo-wordmark.webp" alt="Litzas Pizza" width="160" height="56">
    </a>
    <nav id="nav-links" class="nav-links" aria-label="Primary">
      ${links.map(([href, label]) => `<a href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a>`).join('\n      ')}
      <a href="/locations/#order" class="nav-cta">Order Soon</a>
    </nav>
  </div>
</header>`;
}

function footer() {
  return `
<footer class="footer">
  <div class="footer-inner">
    <a href="/" class="footer-mark"><img src="/assets/images/optimized/logo-wordmark.webp" alt="Litzas Pizza" width="120" height="42"></a>
    <nav class="footer-nav" aria-label="Footer">
      <a href="/menu/">Menu</a>
      <a href="/locations/">Locations</a>
      <a href="/story/">Story</a>
      <a href="/shop/">Root Beer</a>
    </nav>
    <p class="footer-legal">
      &copy; <span id="year">2026</span> Litzas Pizza Co. A Utah classic since 1965.
      <br><a href="tel:+18013595352">801.359.5352</a> · <a href="tel:+18015612171">801.561.2171</a>
    </p>
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
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter+Tight:wght@400;500;600;700&family=Fraunces:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
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
    {"@type": "PostalAddress", "streetAddress": "400 South 716 East", "addressLocality": "Salt Lake City", "addressRegion": "UT", "postalCode": "84102"},
    {"@type": "PostalAddress", "streetAddress": "835 East Fort Union", "addressLocality": "Midvale", "addressRegion": "UT", "postalCode": "84047"}
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

function locationCards(orderButtons = false) {
  return locationsData.locations.map((location) => `
<article class="loc-card reveal">
  <header>
    <span class="loc-tag">${esc(location.tag)}</span>
    <h3>${esc(location.name)}</h3>
  </header>
  <p class="loc-addr">${location.address.map(esc).join('<br>')}</p>
  <dl class="loc-hours">
    ${location.hours.map((row) => `<div><dt>${esc(row.days)}</dt><dd>${esc(row.time)}</dd></div>`).join('\n    ')}
  </dl>
  <div class="loc-actions">
    <a class="text-link" href="tel:${esc(location.tel)}">${esc(location.phone)}</a>
    <a class="text-link" href="${esc(location.mapUrl)}">Map</a>
  </div>
  ${orderButtons ? `<button class="btn btn-primary order-button" type="button" data-order-location="${esc(location.id)}">Order with SpotOn Soon</button>` : ''}
</article>`).join('\n');
}

function imagePanel(src, alt, modifier = '') {
  return `<figure class="image-panel ${modifier} reveal"><img data-parallax src="${src}" alt="${esc(alt)}" loading="lazy"></figure>`;
}

function pizzaCard(pizza, index) {
  const photo = approvedPhotos.get(pizza.slug);
  if (photo) {
    return `<article class="pizza-card pizza-card--photo reveal">
      <img src="/${esc(photo.file)}" alt="${esc(photo.alt)}" width="1536" height="1024" loading="lazy">
      <div class="pizza-body">
        <span class="pizza-number">${String(index + 1).padStart(2, '0')}</span>
        <h3>${esc(pizza.name)}</h3>
        <p>${esc(pizza.ingredients)}</p>
        ${priceLine(pizza.prices)}
      </div>
    </article>`;
  }

  return `<article class="pizza-card pizza-card--text reveal">
    <div class="pizza-body">
      <span class="pizza-number">${String(index + 1).padStart(2, '0')}</span>
      <h3>${esc(pizza.name)}</h3>
      <p>${esc(pizza.ingredients)}</p>
      ${priceLine(pizza.prices)}
      <span class="photo-status">Photo in approval</span>
    </div>
  </article>`;
}

function homePage() {
  return layout({
    current: '/',
    title: 'Litzas Pizza - A Utah Classic Since 1965',
    description: 'Pizza, root beer, and the dark old-Utah room you remember. Litzas Pizza in Salt Lake City and Midvale.'
  }, `
<section class="cinema-hero" aria-labelledby="hero-h">
  <div class="hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/pizza-overhead-pair.jpg" alt="">
  </div>
  <div class="hero-shade" aria-hidden="true"></div>
  <div class="hero-content reveal">
    <p class="eyebrow">Salt Lake City & Midvale · Est. 1965</p>
    <h1 id="hero-h">Pizza, root beer, and the room you remember.</h1>
    <p>Medium crust. House sauce. Booth-lit nostalgia. Litzas does not need a gimmick when the pizza is this steady.</p>
    <div class="button-row">
      <a href="/menu/" class="btn btn-primary">See the Menu</a>
      <a href="/story/" class="btn btn-ghost">Feel the Story</a>
    </div>
  </div>
  <aside class="hero-note reveal" aria-label="Litzas house notes">
    <span>Daily dough</span>
    <span>House sauce</span>
    <span>Hires on tap</span>
  </aside>
</section>

<section class="marquee" aria-label="Litzas values">
  <div><span>No windows</span><span>No stage</span><span>No TV wall</span><span>Just pizza</span><span>Root beer in a frosty mug</span><span>Utah since 1965</span></div>
  <div aria-hidden="true"><span>No windows</span><span>No stage</span><span>No TV wall</span><span>Just pizza</span><span>Root beer in a frosty mug</span><span>Utah since 1965</span></div>
</section>

<section class="sticky-story dark-section" aria-labelledby="room-h">
  <div class="sticky-copy reveal">
    <p class="eyebrow">The room</p>
    <h2 id="room-h">Dark in the best way.</h2>
    <p>No arcade glow. No bar noise. No karaoke calendar taped to the door. Litzas feels like a fixture because it behaves like one: warm, direct, and quietly confident.</p>
  </div>
  ${imagePanel('/assets/images/optimized/litzas-night-sign.jpg', 'The Litzas and Hires Big H sign glowing at night', 'image-panel--wide')}
</section>

<section class="craft-run" aria-labelledby="craft-h">
  <div class="section-kicker reveal">
    <p class="eyebrow">The work</p>
    <h2 id="craft-h">The dough still has to earn the day.</h2>
  </div>
  <div class="craft-grid">
    ${imagePanel('/assets/images/optimized/dough-hands.jpg', 'Hands holding fresh pizza dough dusted with flour')}
    <article class="craft-card reveal">
      <span>01</span>
      <h3>Dough mixed in house.</h3>
      <p>Every morning starts with the thing that matters most. Not frozen. Not fussy. Just handled.</p>
    </article>
    <article class="craft-card reveal">
      <span>02</span>
      <h3>Sauce with a memory.</h3>
      <p>Tomato, spice, heat, sweetness, restraint. The recipe knows what it is.</p>
    </article>
    ${imagePanel('/assets/images/optimized/pizzeria-mural.jpg', 'Gold Litzas mural inside the Salt Lake City restaurant', 'image-panel--wide')}
  </div>
</section>

<section class="menu-tease dark-section" aria-labelledby="menu-tease-h">
  <div class="section-kicker reveal">
    <p class="eyebrow">The menu</p>
    <h2 id="menu-tease-h">Enough options. No confusion.</h2>
    <p>The site now shows real approved pizza photography only. The rest of the named menu gets strong typography until final generated photos are approved.</p>
  </div>
  <div class="featured-menu">
    ${['pepperoni', 'spinach-artichoke', 'litzas-meatza', 'vegetarian', 'western-bbq', 'deluxe'].map((slug, i) => pizzaCard(pizzas.find((pizza) => pizza.slug === slug), i)).join('\n')}
  </div>
  <div class="center-row reveal"><a href="/menu/" class="btn btn-primary">Open Full Menu</a></div>
</section>

<section class="rootbeer-moment" aria-labelledby="rootbeer-h">
  ${imagePanel('/assets/images/optimized/rootbeer-mug.jpg', 'A frosty mug of Hires Big H root beer on a diner table')}
  <div class="section-copy reveal">
    <p class="eyebrow">The pour</p>
    <h2 id="rootbeer-h">Hires Big H belongs beside the slice.</h2>
    <p>Cold root beer in a frosty mug is not an add-on. It is the Utah table setting. Litzas keeps the pizza first, and lets the root beer carry the family-brand bridge.</p>
    <a href="/shop/" class="btn btn-dark">Shop Root Beer</a>
  </div>
</section>

<section class="locations page-band" aria-labelledby="loc-h">
  <div class="section-kicker reveal">
    <p class="eyebrow">Two shops. Same feeling.</p>
    <h2 id="loc-h">Find your Litzas.</h2>
  </div>
  <div class="loc-grid">${locationCards(false)}</div>
</section>`);
}

function menuPage() {
  const otherCategories = menu.categories.filter((category) => category.id !== 'pizzas');
  return layout({
    current: '/menu/',
    title: 'Menu - Litzas Pizza',
    description: 'The full Litzas Pizza menu with named pizzas, full menu sections, and SpotOn-ready order placeholders.'
  }, `
<section class="page-hero menu-hero" aria-labelledby="menu-h">
  <div class="page-hero-bg" aria-hidden="true"><img data-parallax src="/assets/images/optimized/pizza-overhead-pair.jpg" alt=""></div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">Full menu</p>
    <h1 id="menu-h">Pizza first. Everything else earns its place.</h1>
    <p>${esc(menu.note)} Final online ordering will connect through SpotOn when the links are ready.</p>
  </div>
</section>

<nav class="menu-jump" aria-label="Menu sections">
  <a href="#pizzas">Pizzas</a>
  <a href="#create-your-own">Create Your Own</a>
  <a href="#salads-appetizers">Salads</a>
  <a href="#specials-entrees">Entrees</a>
  <a href="#beverages">Drinks</a>
</nav>

<section class="menu-section page-band" id="pizzas" aria-labelledby="pizza-h">
  <div class="section-kicker reveal">
    <p class="eyebrow">${esc(menu.sizes.join(' · '))}</p>
    <h2 id="pizza-h">Litzas Favorites</h2>
    <p>Approved photos appear as photos. Everything still waiting on final photography stays clean and text-led.</p>
  </div>
  <div class="pizza-grid pizza-grid--menu">
    ${pizzas.map((pizza, index) => pizzaCard(pizza, index)).join('\n')}
  </div>
</section>

${otherCategories.map((category) => `
<section class="menu-list-section ${category.id === 'create-your-own' ? 'dark-section' : 'page-band'}" id="${esc(category.id)}" aria-labelledby="${esc(category.id)}-h">
  <div class="section-kicker reveal">
    <p class="eyebrow">Litzas menu</p>
    <h2 id="${esc(category.id)}-h">${esc(category.name)}</h2>
  </div>
  <div class="menu-list">
    ${category.items.map((item) => `<article class="menu-row reveal">
      <div><h3>${esc(item.name)}</h3>${item.description ? `<p>${esc(item.description)}</p>` : ''}</div>
      ${priceLine(item.prices)}
    </article>`).join('\n    ')}
  </div>
  ${category.toppings ? `<div class="topping-panel reveal">
    <h3>Toppings</h3>
    <p><strong>Sauces & cheeses:</strong> ${esc(category.toppings.saucesAndCheeses.join(', '))}</p>
    <p><strong>Meats:</strong> ${esc(category.toppings.meats.join(', '))}</p>
    <p><strong>Vegetables:</strong> ${esc(category.toppings.vegetables.join(', '))}</p>
  </div>` : ''}
</section>`).join('\n')}

<section class="download-panel" aria-labelledby="photo-pack-h">
  <div class="reveal">
    <p class="eyebrow">SpotOn assets</p>
    <h2 id="photo-pack-h">Photo pack stays ready without faking the menu.</h2>
    <p>The ZIP is still available for Ali and SpotOn, but public-facing pages only show approved photography until final image generation can run.</p>
    <a href="/downloads/litzas-spoton-menu-photos.zip" class="btn btn-primary">Download Photo Pack</a>
  </div>
</section>`);
}

function locationsPage() {
  return layout({
    current: '/locations/',
    title: 'Locations & Order - Litzas Pizza',
    description: 'Litzas Pizza locations in Salt Lake City and Midvale with hours, phone numbers, maps, and SpotOn-ready order buttons.'
  }, `
<section class="page-hero location-hero" aria-labelledby="locations-h">
  <div class="page-hero-bg" aria-hidden="true"><img data-parallax src="/assets/images/optimized/litzas-brick-door.jpg" alt=""></div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">Locations & order</p>
    <h1 id="locations-h">Pick a shop. Call now. SpotOn soon.</h1>
    <p>Final SpotOn URLs will be dropped into data/order-links.json. Until then, every order button stays honest and points customers to the phone.</p>
  </div>
</section>
<section class="locations page-band" id="order" aria-labelledby="order-h">
  <div class="section-kicker reveal">
    <p class="eyebrow">Salt Lake City & Midvale</p>
    <h2 id="order-h">Two doors. Same old comfort.</h2>
  </div>
  <div class="loc-grid">${locationCards(true)}</div>
</section>`);
}

function shopPage() {
  return layout({
    current: '/shop/',
    title: 'Root Beer Shop - Litzas Pizza',
    description: 'Litzas-branded Hires Big H root beer shop bridge, linking pizza nostalgia with the family root beer tradition.'
  }, `
<section class="page-hero shop-hero" aria-labelledby="shop-h">
  <div class="page-hero-bg" aria-hidden="true"><img data-parallax src="/assets/images/optimized/rootbeer-floats.jpg" alt=""></div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">Hires Big H</p>
    <h1 id="shop-h">Root beer, the Utah way.</h1>
    <p>Cold enough to frost the mug. Familiar enough to pull the room backward in time.</p>
    <div class="button-row">
      <a href="https://www.hiresbigh.com/" class="btn btn-primary">Visit Hires Big H</a>
      <a href="https://www.hiresbigh.com/store" class="btn btn-ghost">Shop Extract</a>
    </div>
  </div>
</section>
<section class="product-story dark-section" aria-labelledby="shop-story-h">
  ${imagePanel('/assets/images/optimized/rootbeer-extract-front.png', 'Hires Big H root beer extract bottle', 'image-panel--product')}
  <div class="section-copy reveal">
    <p class="eyebrow">The bridge</p>
    <h2 id="shop-story-h">Litzas stands alone. The root beer brings the family line into the glass.</h2>
    <p>This page is ready to behave like the Hires shop flow while staying darker, calmer, and unmistakably Litzas. When the confirmed Amazon URL is ready, it belongs in data/shop-links.json.</p>
  </div>
</section>`);
}

function storyPage() {
  return layout({
    current: '/story/',
    title: 'Story - Litzas Pizza',
    description: 'The Litzas Pizza story: old Utah, Don Hale, handmade dough, Hires Big H root beer, and the no-gimmicks restaurant feel.'
  }, `
<section class="page-hero story-hero" aria-labelledby="story-h">
  <div class="page-hero-bg" aria-hidden="true"><img data-parallax src="/assets/images/optimized/litzas-night-sign.jpg" alt=""></div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">Old Utah, still open</p>
    <h1 id="story-h">The room is dark for a reason.</h1>
    <p>There are places that try to entertain you into staying. Litzas does the older thing: good pizza, familiar booths, and a room that lets the conversation do the work.</p>
  </div>
</section>
<section class="story-stack page-band" aria-label="Litzas heritage">
  <article class="story-block reveal">
    <span>1965</span>
    <h2>Don Hale and a recipe people remembered.</h2>
    <p>The story starts with craft customers could taste: dough made fresh, sauce with its own spice profile, and a medium crust that never needed to chase a trend.</p>
  </article>
  <article class="story-block reveal">
    <span>Today</span>
    <h2>No windows. No show. No apologies.</h2>
    <p>Litzas feels like an old building because it is allowed to. Dark, warm, a little tucked away, and honest about what it does best.</p>
  </article>
  <article class="story-block reveal">
    <span>Family bridge</span>
    <h2>Hires Big H in the glass.</h2>
    <p>The Hires connection belongs here as a quiet signal: regional, nostalgic, quality-minded, and deeply Utah. Litzas stands alone, with root beer as the bridge back home.</p>
  </article>
</section>
<section class="wide-photo" aria-label="Litzas pizzeria mural">
  <img data-parallax src="/assets/images/optimized/pizzeria-mural.jpg" alt="Gold Litzas mural inside the Salt Lake City restaurant" width="1600" height="900" loading="lazy">
</section>`);
}

const outputs = new Map([
  ['index.html', homePage()],
  ['menu/index.html', menuPage()],
  ['locations/index.html', locationsPage()],
  ['shop/index.html', shopPage()],
  ['story/index.html', storyPage()]
]);

for (const [path, html] of outputs) {
  mkdirSync(join(root, dirname(path)), { recursive: true });
  writeFileSync(join(root, path), html);
}

console.log(`Rendered ${outputs.size} static pages.`);
