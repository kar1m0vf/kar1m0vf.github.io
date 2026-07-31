import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const media = [
  { source: 'assets/media/nar/nar-home-viewport.png', target: 'public/media/nar/home', widths: [720, 960, 1440] },
  { source: 'assets/media/nar/nar-catalog-viewport.png', target: 'public/media/nar/catalog', widths: [720, 960, 1440] },
  { source: 'assets/media/nar/nar-product-viewport.png', target: 'public/media/nar/product', widths: [720, 960, 1440] },
  { source: 'assets/media/projects/blaster-menu.png', target: 'public/media/blaster/menu', widths: [640, 1280] },
  { source: 'assets/media/projects/blaster-boss.png', target: 'public/media/blaster/boss', widths: [640, 1280] },
  { source: 'assets/media/projects/blaster-battle.png', target: 'public/media/blaster/battle', widths: [640, 1280] },
  { source: 'assets/media/projects/trendyol-price-tracker-logo.png', target: 'public/media/trendyol/logo', widths: [560, 960] },
  { source: 'assets/media/journey/baku-skyline.png', target: 'public/media/journey/baku', widths: [1280, 1920] },
];

for (const item of media) {
  const source = resolve(item.source);
  const target = resolve(item.target);
  await mkdir(dirname(target), { recursive: true });

  for (const width of item.widths) {
    const image = sharp(source).rotate().resize({ width, withoutEnlargement: true });
    await image.clone().webp({ quality: 82, smartSubsample: true }).toFile(`${target}-${width}.webp`);
    await image.clone().avif({ quality: 52, effort: 5 }).toFile(`${target}-${width}.avif`);
  }
}

process.stdout.write(`Optimized ${media.length} source images.\n`);
