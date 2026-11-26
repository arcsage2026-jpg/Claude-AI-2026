// Company brand kit: named colours and fonts that tools accept in place of raw values,
// so every comp Claude builds stays on-brand. Loaded from AE_MCP_BRAND_FILE or
// config/brand.json.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_BRAND_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'config', 'brand.json');

export function loadBrand(file = process.env.AE_MCP_BRAND_FILE || DEFAULT_BRAND_FILE) {
  try {
    const brand = JSON.parse(readFileSync(file, 'utf8'));
    return { name: brand.name || 'Company', colors: brand.colors || {}, fonts: brand.fonts || {}, defaults: brand.defaults || {} };
  } catch (err) {
    if (err.code === 'ENOENT') return { name: 'Company', colors: {}, fonts: {}, defaults: {} };
    throw new Error(`Could not read brand file ${file}: ${err.message}`);
  }
}

// Accepts "#RRGGBB", "#RGB", a brand colour name, or an [r,g,b] array in 0–1 (AE's native form).
export function resolveColor(brand, value) {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.slice(0, 3);
  const named = brand.colors[value];
  const hex = (named || value).trim().replace(/^#/, '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    const names = Object.keys(brand.colors);
    throw new Error(`Unknown colour "${value}". Use #RRGGBB${names.length ? ` or one of: ${names.join(', ')}` : ''}.`);
  }
  return [0, 2, 4].map((i) => Math.round((parseInt(full.slice(i, i + 2), 16) / 255) * 1000) / 1000);
}

// Accepts a brand font role ("heading", "body") or a PostScript font name.
export function resolveFont(brand, value) {
  if (!value) return brand.fonts.body || undefined;
  return brand.fonts[value] || value;
}
