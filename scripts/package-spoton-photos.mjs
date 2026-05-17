import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import manifest from '../data/menu-photo-manifest.json' with { type: 'json' };

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packDir = join(root, 'downloads/spoton-menu-photos');
mkdirSync(packDir, { recursive: true });

const csv = ['slug,name,file,approvalStatus,notes'];
for (const item of manifest.pizzas) {
  const source = join(root, item.file);
  const dest = join(packDir, item.spotOnExportName);
  if (existsSync(source)) copyFileSync(source, dest);
  csv.push([item.slug, item.name, item.spotOnExportName, item.approvalStatus, item.notes]
    .map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','));
}

writeFileSync(join(packDir, 'manifest.csv'), `${csv.join('\n')}\n`);
writeFileSync(join(packDir, 'README.txt'), [
  'Litzas SpotOn menu photo pack',
  '',
  'Images are named by menu slug for clean SpotOn import.',
  'Manifest status marks which photos are approved existing assets and which are queued for final generation.',
  'Replace any generated image in this folder with the same filename before zipping if an owner-approved alternate is chosen.',
  ''
].join('\n'));

execFileSync('zip', ['-qr', '../litzas-spoton-menu-photos.zip', '.'], { cwd: packDir });
console.log('Wrote downloads/litzas-spoton-menu-photos.zip');
