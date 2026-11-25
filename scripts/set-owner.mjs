// Replaces the __OWNER__ placeholder with your GitHub username in every text file.
// Usage: node scripts/set-owner.mjs <github-username>
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const owner = process.argv[2];
if (!owner || !/^[A-Za-z0-9-]+$/.test(owner)) {
  console.error('Usage: node scripts/set-owner.mjs <github-username>');
  process.exit(1);
}
const TEXT = new Set(['.md', '.html', '.json', '.txt', '.xml', '.cff', '.yml', '.js', '.mjs']);
const SKIP = new Set(['node_modules', '.git', 'scripts']);
let changed = 0;

(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!TEXT.has(extname(name))) continue;
    const src = readFileSync(p, 'utf8');
    if (!src.includes('__OWNER__')) continue;
    // GitHub Pages hostnames are lowercase.
    const out = src
      .replaceAll('__OWNER__.github.io', `${owner.toLowerCase()}.github.io`)
      .replaceAll('__OWNER__', owner);
    writeFileSync(p, out);
    changed++;
    console.log(`  updated ${p}`);
  }
})('.');
console.log(`${changed} file(s) updated for ${owner}.`);
