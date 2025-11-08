import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { globby } from 'globby';

function toPosix(p) {
  return p.split(path.sep).join('/');
}

async function readJson(filePath, fallback = null) {
  try {
    const data = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

async function rimraf(targetPath) {
  if (fs.existsSync(targetPath)) {
    await fsp.rm(targetPath, { recursive: true, force: true });
  }
}

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function copyFile(source, dest) {
  await ensureDir(path.dirname(dest));
  await fsp.copyFile(source, dest);
}

async function copyTree(srcRoot, destRoot) {
  const files = await globby(['**/*'], { cwd: srcRoot, dot: false, onlyFiles: true });
  await Promise.all(
    files.map(async (rel) => {
      const from = path.join(srcRoot, rel);
      const to = path.join(destRoot, rel);
      await copyFile(from, to);
    })
  );
}

/**
 * Expected config (assets.config.json):
 * {
 *   "inputRoot": "raw-assets",
 *   "outputRoot": "public/assets",
 *   "bundles": {
 *     "loading": ["loading/**/*.{png,jpg,jpeg,webp,mp3,ogg,wav}"],
 *     "main": ["main/**/*.{png,jpg,jpeg,webp,mp3,ogg,wav}"]
 *   }
 * }
 */
async function main() {
  const root = process.cwd();
  const configPath = path.join(root, 'assets.config.json');
  const cfg = await readJson(configPath);
  if (!cfg) {
    console.error('assets.config.json not found. Please create it to define bundles and folders.');
    process.exit(1);
  }

  const inputRoot = path.resolve(root, cfg.inputRoot ?? 'raw-assets');
  const outputRoot = path.resolve(root, cfg.outputRoot ?? 'public/assets');
  const manifestsDir = path.join(outputRoot, 'manifests');

  // Clean outputRoot and re-copy all inputs
  await rimraf(outputRoot);
  await ensureDir(outputRoot);
  await copyTree(inputRoot, outputRoot);

  // Generate per-bundle manifests compatible with PIXI.Assets
  await ensureDir(manifestsDir);

  const bundleNames = Object.keys(cfg.bundles ?? {});
  for (const bundleName of bundleNames) {
    const patterns = cfg.bundles[bundleName];
    const matches = await globby(patterns, {
      cwd: inputRoot,
      onlyFiles: true,
      dot: false
    });

    // Build manifest assets entries
    const assets = matches.map((rel) => {
      const relPosix = toPosix(rel);
      const parsed = path.parse(relPosix);
      const name = parsed.name;
      const alias = [name, relPosix.replace(/\.[^/.]+$/, '')];
      return {
        alias,
        src: [relPosix],
        data: { tags: {} }
      };
    });

    const manifest = {
      bundles: [
        {
          name: bundleName,
          assets
        }
      ]
    };

    const outFile = path.join(manifestsDir, `${bundleName}.json`);
    await fsp.writeFile(outFile, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Wrote manifest: ${path.relative(root, outFile)} (${assets.length} assets)`);
  }

  console.log('Asset copy and manifest generation complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


