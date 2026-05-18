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
  ? `<p class="pizza-price">${prices.map((p) => `$${p}`).join(' <span>·</span> ')}</p>`
  : '';

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
    <a href="/" class="nav-mark" aria-label="Litzas Pizza home">LITZAS</a>
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
      <div class="footer-mark">LITZAS<span class="slab">PIZZA</span></div>
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
    title: 'Litzas Pizza · Family Pizza in Salt Lake City & Midvale Since 1965',
    description: 'Pizza Don Hale brought home from a thousand road trips with his kids. Made by hand in Salt Lake City and Midvale since 1965.'
  }, `
<section class="cinema-hero" aria-labelledby="hero-h">
  <div class="hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/pizza-overhead-pair.jpg" alt="">
  </div>
  <div class="hero-shade" aria-hidden="true"></div>
  <div class="hero-content reveal">
    <p class="eyebrow">A Hale Family Restaurant · Salt Lake City &amp; Midvale</p>
    <h1 id="hero-h">Just Pizza.<span class="slab">The Way Don Made It.</span></h1>
    <p>Family-owned since 1965. Same crust. Same sauce. Same gold lettering on the box. Walk in. Order a Classic. Pour yourself a Hires. Sit down.</p>
    <div class="button-row">
      <a href="/menu/" class="btn btn-primary">See the Menu</a>
      <a href="/story/" class="btn btn-ghost">The Don Hale Story</a>
    </div>
  </div>
  <aside class="hero-note reveal" aria-label="Litzas house notes">
    <span>Dough hand-rolled daily</span>
    <span>House sauce since '65</span>
    <span>Hires Big H on tap</span>
  </aside>
</section>

<section class="marquee" aria-label="Litzas neighborhood ticker">
  <div>
    <span>Fresh Hot Pizza</span>
    <span>Since 1965</span>
    <span>Family Owned</span>
    <span>Real Mozzarella</span>
    <span>Hand-Rolled Dough</span>
    <span>Hires Root Beer</span>
    <span>Salt Lake &amp; Midvale</span>
    <span>Fresh Hot Pizza</span>
    <span>Since 1965</span>
    <span>Family Owned</span>
    <span>Real Mozzarella</span>
    <span>Hand-Rolled Dough</span>
    <span>Hires Root Beer</span>
    <span>Salt Lake &amp; Midvale</span>
  </div>
</section>

<section class="dark-section" aria-labelledby="story-tease-h">
  <div class="sticky-story">
    <div class="copy reveal">
      <p class="eyebrow">Our Story</p>
      <h2 id="story-tease-h">Don loaded up the kids<span class="slab">and went looking.</span></h2>
      <p>In 1965, Don Hale already had a hamburger drive-in on his hands — Hires Big H — six years deep and the busiest joint in Salt Lake. He didn't need another restaurant. He just loved pizza.</p>
      <p>So he piled the family into the car and drove. Utah. Idaho. Wyoming. Colorado. Anywhere he heard there was a good slice. He tasted, he asked questions, he wrote things down. The kids loved it.</p>
      <p>When he came home he started building. Sauce. Dough. Garlic bread. Salad dressing. Spaghetti. He wanted a name that fit. Something with a <em>z</em>, because a name with a <em>z</em> sounds solid.</p>
      <p><strong>Litzas.</strong> Rhymes with pizza. Sounds like it means something. Sixty years later, it does.</p>
      <div class="button-row">
        <a href="/story/" class="btn btn-primary">Read the Full Story</a>
      </div>
    </div>
    <div class="image-stack">
      <figure class="reveal">
        <img src="/assets/images/optimized/pizzeria-mural.jpg" alt="The gold Litzas mural inside the Salt Lake City restaurant" loading="lazy">
        <figcaption>SLC · The mural</figcaption>
      </figure>
      <figure class="reveal">
        <img src="/assets/images/optimized/dough-hands.jpg" alt="Hands rolling fresh pizza dough on flour" loading="lazy">
        <figcaption>Hand-rolled every morning</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="warm-section">
  <div class="pillars">
    <article class="pillar reveal">
      <div class="pillar-num">01 · DOUGH</div>
      <h3>Hand-Rolled Daily</h3>
      <p>Every morning. Every shop. The dough still has to earn the day.</p>
    </article>
    <article class="pillar reveal">
      <div class="pillar-num">02 · SAUCE</div>
      <h3>Made from Scratch</h3>
      <p>Don's recipe. Same tomato, same spice, same restraint.</p>
    </article>
    <article class="pillar reveal">
      <div class="pillar-num">03 · CHEESE</div>
      <h3>100% Real Mozzarella</h3>
      <p>Not a blend. Not a substitute. The real thing — because the real thing tastes better.</p>
    </article>
    <article class="pillar reveal">
      <div class="pillar-num">04 · CRUST</div>
      <h3>Utah Pizzeria Medium</h3>
      <p>Not thin-and-fancy. Not deep-dish heavy. The crust you grew up on.</p>
    </article>
  </div>
</section>

<section class="dark-section" aria-labelledby="menu-tease-h">
  <div class="section-kicker reveal">
    <p class="eyebrow">The Menu</p>
    <h2 id="menu-tease-h">Pizzas named after Utah peaks.<span class="slab"> Because Don was from here.</span></h2>
    <p>The full menu is below. Photos are owner-review stand-ins until the camera comes through. The pizza is the same as it has always been.</p>
  </div>
  <div class="menu-band">
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
      <p class="eyebrow">The Family Brand</p>
      <h2>Same Family.<span class="slab"> Same Don.</span></h2>
      <p>Hires Big H came first — Don Hale opened it in 1959. Litzas came six years later. In Midvale, we share a building. In Salt Lake, we share a parking lot. Different menus, one family, one set of values.</p>
      <p>If you grew up with a frosty mug of Hires Root Beer, you already know how this story goes.</p>
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
    <p>Salt Lake City and Midvale. Walk in. Call ahead. We'll have a pie waiting.</p>
  </div>
  <div class="loc-band">
    <div class="loc-grid">${locationCards()}</div>
  </div>
</section>`);
}

function menuPage() {
  const cards = pizzas.map((pizza, i) => pizzaCard(pizza, i)).join('\n');
  return layout({
    current: '/menu/',
    title: 'Litzas Pizza Menu · Salt Lake City &amp; Midvale',
    description: 'The full Litzas Pizza menu. Classic Litzas, Litzas Meatza, Utah peaks specialties, and the Hires Big H family of starters.'
  }, `
<section class="page-hero menu-hero" aria-labelledby="menu-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/pizza-overhead-pair.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">The Menu</p>
    <h1 id="menu-h">Pizza by the peak.<span class="slab"> Made by hand.</span></h1>
    <p>Don named his pizzas after Utah peaks. Lone Peak. Mt Olympus. Twin Peaks. Kings Peak. It was a small thing — but small things matter.</p>
  </div>
</section>

<section class="dark-section">
  <div class="menu-band">
    <div class="menu-grid">${cards}</div>
    <p class="menu-note"><strong>Heads up —</strong> menu photography you see here is from a generated-review batch awaiting owner approval. The pizza is real. The recipe hasn't changed since 1965. Prices and full topping detail are available at both locations and on the SpotOn menu once it launches.</p>
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
    title: 'The Litzas Story · Don Hale, the Hale Family, and 60 Years of Pizza',
    description: 'Don Hale loaded his kids into the car in the 1960s and went looking for the perfect pizza. He brought one home. It has been on the menu ever since.'
  }, `
<section class="page-hero" aria-labelledby="story-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/pizzeria-mural.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">Est. 1965 · A Hale Family Restaurant</p>
    <h1 id="story-h">A grocer.<span class="slab"> A station wagon. Some pizza.</span></h1>
    <p>Don Hale already had a hamburger joint. He just loved pizza. So one summer he packed up the kids and went looking for a good slice.</p>
  </div>
</section>

<section class="dark-section">
  <div class="sticky-story">
    <div class="copy reveal">
      <p class="eyebrow">Chapter One · 1959</p>
      <h2>Hires came<span class="slab"> first.</span></h2>
      <p>Don Hale opened the first Hires Big H drive-in on a Salt Lake City corner in 1959. He was a grocer before that — he knew produce, he knew quality, and he knew that the best food comes from knowing your farmer by name. The drive-in was busy from the day it opened.</p>
      <p>He could have stopped there. He had a good thing going. He didn't.</p>
    </div>
    <div class="image-stack">
      <figure class="reveal">
        <img src="/assets/images/optimized/litzas-night-sign.jpg" alt="The Litzas and Hires Big H sign glowing at night" loading="lazy">
        <figcaption>SLC · Litzas &amp; Hires share a corner</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="warm-section">
  <div class="sticky-story">
    <div class="image-stack">
      <figure class="reveal">
        <img src="/assets/images/optimized/dough-hands.jpg" alt="Fresh pizza dough being rolled by hand" loading="lazy">
        <figcaption>The dough still has to earn the day</figcaption>
      </figure>
    </div>
    <div class="copy reveal">
      <p class="eyebrow">Chapter Two · The Search</p>
      <h2>He loaded up<span class="slab"> the kids.</span></h2>
      <p>Don wanted to add pizza to the family. He didn't want to add a frozen-crust afterthought. He wanted the real thing — rich, top-quality, the kind of pizza you remember.</p>
      <p>So he did what a Utah dad in the 1960s would do. He gassed up the car, piled the kids in, and drove. Utah pizzerias. Idaho pizzerias. Wherever someone said "you have to try this place." The kids loved it — a thousand pizza dinners across a thousand miles.</p>
      <p>He tasted. He asked questions. He wrote things down. He came home with recipes — for pizza, for spaghetti, for salad dressing, for garlic bread. He worked on them. Tweaked. Tested. Pulled the family in as the tasting panel.</p>
      <p>When the pizza passed Don's own bar — and Don's bar was a high one — he was ready.</p>
    </div>
  </div>
</section>

<section class="dark-section">
  <div class="sticky-story">
    <div class="copy reveal">
      <p class="eyebrow">Chapter Three · The Name</p>
      <h2>He wanted<span class="slab"> a name with a z.</span></h2>
      <p>Don was particular. He thought a name with a <em>z</em> in it sounded solid. He wanted something with zip. Something that rhymed with pizza.</p>
      <p>He landed on <strong>Litzas</strong>. It rhymed. It had the z. It was his.</p>
      <p>In 1965, Litzas Pizza opened on 400 South, sharing a parking lot with the Hires Big H drive-in. Same family. Same standards. Different menu.</p>
      <p>Sixty years later, the recipes are the recipes. The cheese is still 100% real mozzarella — not a blend, not a substitute, the way Don insisted. The dough is still hand-rolled every morning. The sauce is still made from scratch. The Hires root beer still comes in a frosted mug.</p>
    </div>
    <div class="image-stack">
      <figure class="reveal">
        <img src="/assets/images/optimized/pizzeria-mural.jpg" alt="The Litzas mural in gold lettering inside the SLC restaurant" loading="lazy">
        <figcaption>The mural · 400 South</figcaption>
      </figure>
      <figure class="reveal">
        <img src="/assets/images/optimized/pizza-overhead-pair.jpg" alt="Two Litzas pizzas on a worn wood table" loading="lazy">
        <figcaption>Don's pizza, still on the menu</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="warm-section">
  <div class="hires-bridge">
    <div class="copy reveal">
      <p class="eyebrow">The Hale Family Today</p>
      <h2>One family.<span class="slab"> Two restaurants. Same pride.</span></h2>
      <p>Hires Big H is still hand-cutting beef every morning. Litzas is still hand-rolling dough. Different food, same family — and a lot of the same team. Some of our crew have been with us for more than 25 years. That kind of consistency is what makes a place feel like a fixture.</p>
      <p>Don wrote a book about it called <em>Opportunity Knocks Twice</em>. He wrote it with his son Mark. It's a Utah story — a grocer who took his shot, took it again, and never stopped caring about the details.</p>
      <p>Want to taste the family connection? Order a pizza, pour yourself a Hires, and you've got it.</p>
      <div class="button-row">
        <a href="/menu/" class="btn btn-primary">See the Menu</a>
        <a href="https://hiresbigh.com" class="btn btn-ghost" target="_blank" rel="noopener">Visit Hires Big H</a>
      </div>
    </div>
    <figure class="reveal">
      <img src="/assets/images/optimized/rootbeer-floats.jpg" alt="Hires Big H root beer floats" loading="lazy">
    </figure>
  </div>
</section>

<section class="dark-section">
  <div class="page-band">
    <div class="section-kicker center reveal">
      <p class="eyebrow">Boxed up to go</p>
      <h2>The same gold lettering.<span class="slab"> The same fresh hot pizza.</span></h2>
      <p>It says it on the side of every box: <em>Fresh Hot Pizza</em>. It's not marketing. It's instructions. Pizza is supposed to be hot. Pizza is supposed to be fresh. We've been keeping that promise since 1965.</p>
      <div class="button-row center-row">
        <a href="/locations/" class="btn btn-primary">Visit a Shop</a>
        <a href="/catering/" class="btn btn-ghost">Cater an Event</a>
      </div>
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
    title: 'Where to Find the Best Pizza in Salt Lake City',
    date: '2026-05-17',
    excerpt: 'Family-owned since 1965, real mozzarella, hand-rolled dough — what makes a Salt Lake City pizza last six decades.',
    photo: '/assets/images/optimized/pizza-overhead-pair.jpg',
    eyebrow: 'Salt Lake City · Pizza'
  },
  {
    slug: 'why-litzas-is-named-with-a-z',
    title: 'Why Don Hale Picked a Name with a Z',
    date: '2026-05-12',
    excerpt: 'A station wagon, four kids, a thousand miles of road trips, and a founder who thought a name needed a Z to sound solid.',
    photo: '/assets/images/optimized/pizzeria-mural.jpg',
    eyebrow: 'Heritage · 1965'
  },
  {
    slug: 'midvale-family-pizza',
    title: 'Family Pizza Near Midvale — What\u2019s Still Hand-Made',
    date: '2026-05-06',
    excerpt: 'Why Litzas Pizza Midvale still rolls dough every morning, still uses real mozzarella, and still tastes like 1965.',
    photo: '/assets/images/optimized/litzas-brick-door.jpg',
    eyebrow: 'Midvale · Family'
  }
];

function blogIndexPage() {
  return layout({
    current: '/blog/',
    title: 'Stories from the Booth · Litzas Pizza',
    description: 'Stories about Don Hale, the Hires family, and 60 years of making pizza in Salt Lake City and Midvale.'
  }, `
<section class="page-hero" aria-labelledby="blog-h">
  <div class="page-hero-bg" aria-hidden="true">
    <img data-parallax src="/assets/images/optimized/litzas-night-sign.jpg" alt="">
  </div>
  <div class="page-hero-copy reveal">
    <p class="eyebrow">Stories from the booth</p>
    <h1 id="blog-h">Sixty years of pizza.<span class="slab"> One family.</span></h1>
    <p>Stories about Don Hale, the Hale family, the dough, the sauce, and the Salt Lake corner that started it all.</p>
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
<p class="lead">Searching for the best pizza in Salt Lake City is a fair sport. There are good spots. There are great spots. And then there are the ones that have been doing it the same way since the Beatles were on the radio.</p>
<p>Litzas Pizza opened on 400 South in 1965 — a Salt Lake City pizza shop founded by Don Hale, the same Don Hale who started Hires Big H six years earlier on the corner up the street. We've been around long enough to remember when "fresh mozzarella" wasn't a marketing line. We just kept doing it.</p>
<h2>What we still do by hand</h2>
<p>The dough is hand-rolled every morning at both shops. The sauce is made from scratch using Don's recipe. The cheese is 100% real mozzarella — not the blend most kitchens swap in to cut costs. Don was particular about that one. So are we.</p>
<p>The ground sausage is ours alone — a recipe you won't find at any other pizzeria. The ground beef comes from Hires Big H, butchered fresh that morning. The produce is washed and sliced fresh. None of this is exotic. It's just the right way to make pizza.</p>
<h2>The peaks</h2>
<p>The specialty pies are named after Utah peaks — Lone Peak, Mt Olympus, Twin Peaks, Kings Peak. Don was a Utah kid through and through. The names are a small detail. But the small details are what make a place feel like a place.</p>
<h2>Where to find us</h2>
<p>We're at <a href="/locations/">716 East 400 South in Salt Lake City</a> and 835 East Fort Union in Midvale. Walk in. Order a Classic. Pour a Hires root beer in a frosted mug. Sit down. You'll see what we mean.</p>
<blockquote>You don't need a reservation. You don't need to dress up. You just need to be hungry.</blockquote>
`,
  'why-litzas-is-named-with-a-z': `
<p class="lead">Don Hale was a particular man. When he decided to add pizza to the family, he didn't just pick a name out of a hat. He drove around for months — kids in the car, no air conditioning — looking for the right one.</p>
<p>By 1965 Don had a thriving hamburger drive-in (Hires Big H, since 1959) and an itch he couldn't ignore. He loved pizza. He didn't have one good place to get it in Salt Lake City. So he decided to build one.</p>
<h2>The road trips</h2>
<p>He started with research. Don gathered up the kids and drove. Utah. Idaho. Wyoming. Anywhere he heard there was a pizza worth trying. He'd order a pie, taste it, ask the owner questions. The kids loved it — a thousand pizza dinners across a thousand miles. He brought home recipes for pizza, spaghetti, salad dressing, garlic bread. He worked on each one until it passed his own bar. Don's bar was high.</p>
<h2>The name</h2>
<p>Then came the hard part: the name. Don wanted something that fit. He thought a name needed a <strong>Z</strong> in it to sound solid. He wanted it to rhyme with pizza. He wanted something that sounded like it meant something.</p>
<p>He landed on <em>Litzas</em>. Rhymes with pizza. Has the Z. Sounds solid. Sixty years later, you can still find it in gold letters on every box.</p>
<h2>Why it stuck</h2>
<p>The name worked because Don worked. He didn't compromise on the dough. He didn't compromise on the cheese. He didn't compromise on the sauce. And he didn't compromise on the name. That's the through-line. <a href="/story/">Read the full story →</a></p>
`,
  'midvale-family-pizza': `
<p class="lead">If you've been to Litzas in Midvale, you've been to a building that's been making the same pizza since the 1970s — and you've probably had a Hires Big H burger from the other side of the same kitchen.</p>
<p>Our Midvale shop shares a building with Hires Big H Midvale, at <a href="/locations/">835 East Fort Union Boulevard</a>. Two restaurants, one family, one set of standards. You can order a Litzas pizza and a Hires burger from the same parking lot. Most people do.</p>
<h2>What hasn't changed</h2>
<p>The dough is still hand-rolled. The sauce is still made from scratch. The mozzarella is still real. The ground sausage is still our signature recipe, unique to Litzas. The ground beef still comes from Hires's morning butchery.</p>
<p>The crew has barely changed either. Many of the team have been with us for more than 25 years. When you walk in, the people behind the counter are probably the same people you remember.</p>
<h2>What the room feels like</h2>
<p>It's a neighborhood pizzeria. Cozy and warm. Booth lighting. Frosted mugs of root beer. The Midvale dining room works for date nights, family dinners, and post-game pickups. No frills. Just pizza, the right way.</p>
<h2>For larger groups</h2>
<p>Our SLC location has a private back room that hosts up to 40 — great for birthday parties, team dinners, and family events. <a href="/catering/">Catering and large orders</a> are easy at both shops. Just give us a call.</p>
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
