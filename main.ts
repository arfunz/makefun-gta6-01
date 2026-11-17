// KOTA SENJA — entrypoint: hands the game to make.fun.
// Copies game/ and screenshots/ into the output directory and writes
// the dossier the scorer rebuilds byte for byte. Node 22 stdlib only.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function repoRoot(): string {
  return dirname(fileURLToPath(import.meta.url));
}

function outputDir(): string {
  return process.env.MAKEFUN_OUTPUT_DIR || '/output';
}

function copyEntryTree(sourceDir: string, targetDir: string): void {
  if (!existsSync(sourceDir)) {
    throw new Error(`missing input directory: ${sourceDir}`);
  }
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, {
    recursive: true,
    dereference: false,
    filter: (src: string) => !src.includes('/.git/'),
  });
}

function main(): void {
  const root = repoRoot();
  const out = outputDir();
  mkdirSync(out, { recursive: true });
  copyEntryTree(join(root, 'game'), join(out, 'game'));
  copyEntryTree(join(root, 'screenshots'), join(out, 'screenshots'));
  const dossier = buildDossier(out, DOSSIER_CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);
}

main();
