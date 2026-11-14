// Builds the public web site into dist-web/ against the real Firebase project.
// Used by Vercel's Git builds (see vercel.json) and by `npm run deploy:web`.
// Folders named node_modules are skipped when files are uploaded, and Expo puts fonts and
// icons in assets/node_modules, so that folder is renamed and references to it are rewritten.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out = 'dist-web';
const env = { ...process.env, APP_ENV: 'development' };
delete env.USE_EMULATORS;
execSync(`npx expo export -p web --output-dir ${out} --clear`, { stdio: 'inherit', env });
renameSync(join(out, 'assets/node_modules'), join(out, 'assets/vendor'));
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk(out).filter((p) => /\.(js|css|html)$/.test(p))) {
  const s = readFileSync(f, 'utf8');
  if (s.includes('assets/node_modules')) writeFileSync(f, s.replaceAll('assets/node_modules', 'assets/vendor'));
}
