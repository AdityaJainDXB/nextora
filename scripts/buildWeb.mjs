// Builds the public web site into dist-web/ against the real Firebase project.
// Used by Vercel's Git builds (see vercel.json) and by `npm run deploy:web`.
// Folders named node_modules are skipped when files are uploaded, and Expo puts fonts and
// icons in assets/node_modules, so that folder is renamed and references to it are rewritten.
import { execSync } from 'node:child_process';
import { copyFileSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
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

// Stamp the commit into the page so a check can see which version each site is really serving
// (Vercel can finish a build without making it the live one).
const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'local';
writeFileSync(join(out, 'index.html'), readFileSync(join(out, 'index.html'), 'utf8').replace('</head>', `<meta name="nextora-build" content="${sha}"></head>`));

// GitHub Pages has no rewrites: unknown paths get 404.html, so it is a copy of the app shell.
// The app then reads the address and shows the right screen (or its own "page doesn't exist").
if (process.env.WEB_BASE_URL) {
  copyFileSync(join(out, 'index.html'), join(out, '404.html'));
  writeFileSync(join(out, '.nojekyll'), '');
}
