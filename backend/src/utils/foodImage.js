import fs from 'fs';
import path from 'path';

const FOOD_IMAGES_DIR = path.resolve(process.cwd(), 'public/food-images');

export function toFoodSlug(raw = '') {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolveDefaultFoodImage(classOrAiId = '', name = '') {
  const candidates = [];
  if (classOrAiId) candidates.push(toFoodSlug(classOrAiId));
  if (name) candidates.push(toFoodSlug(name));

  for (const slug of candidates) {
    if (!slug) continue;
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      const directPath = path.join(FOOD_IMAGES_DIR, `${slug}.${ext}`);
      if (fs.existsSync(directPath)) {
        return `/food-images/${slug}.${ext}`;
      }
      const manualPath = path.join(FOOD_IMAGES_DIR, 'manual', `${slug}.${ext}`);
      if (fs.existsSync(manualPath)) {
        return `/food-images/manual/${slug}.${ext}`;
      }
    }
  }
  return undefined;
}
