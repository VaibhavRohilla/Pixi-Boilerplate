import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { globby } from 'globby';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const publicDir = path.join(root, 'public');

async function rimraf(targetPath) {
  if (fs.existsSync(targetPath)) {
    await fsp.rm(targetPath, { recursive: true, force: true });
  }
}

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function copyPublicToDist() {
  if (!fs.existsSync(publicDir)) return;
  const files = await globby(['**/*'], { cwd: publicDir, onlyFiles: true, dot: false });
  await Promise.all(
    files.map(async (rel) => {
      const from = path.join(publicDir, rel);
      const to = path.join(distDir, rel);
      await fsp.mkdir(path.dirname(to), { recursive: true });
      await fsp.copyFile(from, to);
    })
  );
}

async function runNode(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

async function main() {
  // 1) Generate manifests and copy assets into public/assets
  await runNode(path.join(root, 'scripts', 'generate-manifests.mjs'));

  // 2) Clean dist
  await rimraf(distDir);
  await ensureDir(distDir);

  // 3) Build with esbuild
  await build({
    entryPoints: [path.join(root, 'src', 'main.ts')],
    outdir: path.join(distDir, 'js'),
    bundle: true,
    format: 'esm',
    splitting: false,
    sourcemap: false,
    minify: true,
    target: ['es2020'],
    loader: { '.ts': 'ts' },
    logLevel: 'info'
  });

  // 4) Copy public to dist
  await copyPublicToDist();
  // 5) Copy index.html into dist
  await fsp.copyFile(path.join(root, 'index.html'), path.join(distDir, 'index.html'));

  console.log('Build complete → dist');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


