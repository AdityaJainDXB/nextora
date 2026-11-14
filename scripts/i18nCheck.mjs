// i18n completeness check. No dependencies.
// Usage: node scripts/i18nCheck.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = join(root, 'locales');

// Read active language codes from locales/meta.ts: l('xx', ...) entries without status: 'comingSoon'.
const metaSrc = readFileSync(join(localesDir, 'meta.ts'), 'utf8');
const codes = [];
for (const line of metaSrc.split('\n')) {
  const m = line.match(/^\s*l\(\s*'([a-z-]+)'/);
  if (m && !/comingSoon/.test(line)) codes.push(m[1]);
}

const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};
const placeholders = (s) => (typeof s === 'string' ? (s.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? []).map((p) => p.replace(/\s/g, '')).sort() : []);

const load = (code) => flatten(JSON.parse(readFileSync(join(localesDir, `${code}.json`), 'utf8')));

const en = load('en');
const enKeys = Object.keys(en);
const problems = [];

for (const code of codes) {
  if (code === 'en') continue;
  let t;
  try {
    t = load(code);
  } catch (e) {
    problems.push(`[${code}] cannot load ${code}.json: ${e.message}`);
    continue;
  }
  for (const k of enKeys) {
    if (!(k in t)) problems.push(`[${code}] missing key: ${k}`);
    else if (placeholders(en[k]).join() !== placeholders(t[k]).join())
      problems.push(`[${code}] placeholder mismatch: ${k} (en: ${placeholders(en[k]).join(' ') || 'none'}; ${code}: ${placeholders(t[k]).join(' ') || 'none'})`);
  }
  for (const k of Object.keys(t)) if (!(k in en)) problems.push(`[${code}] extra key: ${k}`);
}

if (problems.length) {
  console.error(`i18n:check FAIL (${problems.length} problems)`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`i18n:check PASS (${codes.length} languages, ${enKeys.length} keys)`);
