import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import manifest from '../data/menu-photo-manifest.json' with { type: 'json' };

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(root, '.env.local');

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map((slug) => slug.trim())) : null;
const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

const targets = manifest.pizzas.filter((item) => {
  if (only && !only.has(item.slug)) return false;
  return item.approvalStatus === 'needs-generation' || args.has('--all');
});

if (!targets.length) {
  console.log('No menu photos selected.');
  process.exit(0);
}

if (dryRun) {
  for (const item of targets) console.log(`${item.slug}: ${item.prompt}`);
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required. Add it to .env.local or the environment before generating photos.');
}

mkdirSync(join(root, 'assets/images/menu/pizzas'), { recursive: true });

for (const item of targets) {
  console.log(`Generating ${item.name}...`);
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      prompt: item.prompt,
      size: '1536x1024',
      quality: 'high',
      output_format: 'jpeg'
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Image generation failed for ${item.slug}: ${response.status} ${detail}`);
  }

  const payload = await response.json();
  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) throw new Error(`Image generation response for ${item.slug} did not include b64_json.`);
  writeFileSync(join(root, item.file), Buffer.from(b64, 'base64'));
}

console.log(`Generated ${targets.length} menu photo(s). Review them, then update approvalStatus in data/menu-photo-manifest.json.`);
