// Builds the public web site against the real Firebase project and deploys it to Vercel.
// Vercel never uploads folders named node_modules, and Expo puts fonts and icons in
// assets/node_modules, so that folder is renamed and references to it are rewritten.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out = 'dist-web';
const run = (c, env = {}) => execSync(c, { stdio: 'inherit', env: { ...process.env, ...env } });
const env = { ...process.env, APP_ENV: 'development' }; delete env.USE_EMULATORS;
execSync(`npx expo export -p web --output-dir ${out} --clear`, { stdio: 'inherit', env });
renameSync(join(out, 'assets/node_modules'), join(out, 'assets/vendor'));
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk(out).filter((p) => /\.(js|css|html)$/.test(p))) {
  const s = readFileSync(f, 'utf8');
  if (s.includes('assets/node_modules')) writeFileSync(f, s.replaceAll('assets/node_modules', 'assets/vendor'));
}
writeFileSync(join(out, 'vercel.json'), JSON.stringify({ rewrites: [{ source: '/((?!_expo/|assets/|favicon).*)', destination: '/index.html' }] }));
// The export wipes the output folder, so re-link it to the nextora Vercel project.
mkdirSync(join(out, '.vercel'), { recursive: true });
copyFileSync('config/vercel-project.json', join(out, '.vercel/project.json'));
run(`npx vercel deploy ${out} --prod --yes`);
