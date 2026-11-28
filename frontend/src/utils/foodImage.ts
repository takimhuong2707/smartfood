import { API_URL } from '@/constants';

const BASE_HOST = API_URL.replace(/\/api\/?$/, '');

export function toFoodSlug(raw?: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolveFoodImageUri(imageUrl?: string | null, fallbackSlugOrName?: string): string | null {
  const trimmed = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  if (trimmed) {
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('file://') ||
      trimmed.startsWith('content://') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('data:')
    ) {
      return trimmed;
    }
    return `${BASE_HOST}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }

  const slug = toFoodSlug(fallbackSlugOrName);
  if (slug) {
    return `${BASE_HOST}/food-images/${slug}.jpg`;
  }

  return null;
}
