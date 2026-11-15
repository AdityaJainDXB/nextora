// Manual deploy from this computer: build, then upload dist-web/ to the nextora Vercel project.
// (Pushes to GitHub main deploy automatically through Vercel's Git integration; see vercel.json.)
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out = 'dist-web';
execSync('node scripts/buildWeb.mjs', { stdio: 'inherit' });
// The export wipes the output folder, so re-link it to the nextora Vercel project.
mkdirSync(join(out, '.vercel'), { recursive: true });
copyFileSync('config/vercel-project.json', join(out, '.vercel/project.json'));
// Single-page app: every unknown path serves index.html. Only the rewrites are uploaded;
// the build settings in vercel.json are for Vercel's own Git builds.
writeFileSync(join(out, 'vercel.json'), JSON.stringify({ rewrites: JSON.parse(readFileSync('vercel.json', 'utf8')).rewrites }));
execSync(`npx vercel deploy ${out} --prod --yes`, { stdio: 'inherit' });
