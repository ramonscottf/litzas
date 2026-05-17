import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import menu from '../data/menu.json' with { type: 'json' };

const root = fileURLToPath(new URL('..', import.meta.url));
const pizzas = menu.categories.find((category) => category.id === 'pizzas').items;

const basePrompt = [
  'Photorealistic menu photograph for Litzas Pizza in Utah.',
  'One whole medium-thick crust pizza in a metal pan on a warm, worn wood table.',
  '3/4 overhead angle, warm dark restaurant lighting, classic neighborhood pizzeria feel.',
  'Visible browned mozzarella, medium crust, generous but believable toppings.',
  'No hands, no plates, no text, no logos, no labels, no impossible slices.'
].join(' ');

const approvedExisting = new Set(['pepperoni', 'spinach-artichoke']);

const manifest = {
  generatedOn: new Date().toISOString().slice(0, 10),
  artDirection: {
    angle: '3/4 overhead',
    lighting: 'warm dark restaurant light',
    surface: 'worn wood table',
    crust: 'medium-thick Utah pizzeria crust',
    exclusions: ['text', 'logos', 'hands', 'thin artisan crust', 'extra toppings']
  },
  pizzas: pizzas.map((pizza) => ({
    slug: pizza.slug,
    name: pizza.name,
    ingredients: pizza.ingredients,
    prompt: `${basePrompt} Pizza: ${pizza.name}. Toppings must match: ${pizza.ingredients}`,
    file: `assets/images/menu/pizzas/${pizza.slug}.jpg`,
    source: approvedExisting.has(pizza.slug) ? 'existing/user-supplied overhead reference' : 'provisional style reference; generate final with scripts/generate-menu-photos.mjs',
    usage: 'Website menu card and SpotOn menu photo export',
    alt: `${pizza.name} pizza with ${pizza.ingredients.replace(/\.$/, '').toLowerCase()} on a warm wood table.`,
    approvalStatus: approvedExisting.has(pizza.slug) ? 'approved-existing' : 'needs-generation',
    spotOnExportName: `${pizza.slug}.jpg`,
    notes: approvedExisting.has(pizza.slug)
      ? 'Existing reference image is usable for visual direction; final crop can be replaced after owner approval.'
      : 'Queued for GPT Image generation in the Litzas overhead wood-table style.'
  }))
};

writeFileSync(join(root, 'data/menu-photo-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
