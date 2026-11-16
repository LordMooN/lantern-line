// Lantern Line's hand-in program (Node 22, standard library only).
//
// The game itself is game/: plain static files that a desktop browser opens with no build step and
// no network request. This program does the one job the bounty asks of it: it copies game/ and
// screenshots/ into /output, then writes /output/dossier.json — the summary the judge reads — with
// the kit's vendored buildDossier, which hashes and lays out the very files it just copied. The two
// runs the grader makes therefore produce the same bytes, because nothing here reads a clock or a
// random source.
//
// Locally, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Start from an empty output folder, so a stale file from an earlier run can never ride along. */
function freshOutput(path) {
  mkdirSync(path, { recursive: true });
  for (const entry of readdirSync(path)) {
    rmSync(join(path, entry), { recursive: true, force: true });
  }
}

freshOutput(output);
cpSync(join(root, 'game'), join(output, 'game'), { recursive: true });

const shotsSource = join(root, 'screenshots');
if (existsSync(shotsSource)) {
  mkdirSync(join(output, 'screenshots'), { recursive: true });
  cpSync(shotsSource, join(output, 'screenshots'), { recursive: true });
}

// The scorer's caps, as the kit states them: the text cap shapes dossier.json itself, and the rest
// make buildDossier refuse an entry the site's gate would refuse.
const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(output, 'dossier.json'), dossier);
console.log(`dossier.json written: ${dossier.length} bytes from ${root}`);
