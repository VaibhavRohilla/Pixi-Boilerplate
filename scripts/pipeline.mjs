import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import { build as esbuild } from 'esbuild';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

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

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fsp.copyFile(src, dest);
}

async function copyDir(srcDir, destDir) {
  const files = await globby(['**/*'], { cwd: srcDir, onlyFiles: true, dot: false });
  await Promise.all(
    files.map(async (rel) => {
      const from = path.join(srcDir, rel);
      const to = path.join(destDir, rel);
      await copyFile(from, to);
    })
  );
}

async function copyItem(src, dest) {
  const isDir = fs.existsSync(src) && fs.lstatSync(src).isDirectory();
  if (isDir) {
    await copyDir(src, dest);
  } else {
    await copyFile(src, dest);
  }
}

function deepMerge(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    return target.concat(source);
  }
  if (typeof target === 'object' && target && typeof source === 'object' && source) {
    const out = { ...target };
    for (const key of Object.keys(source)) {
      if (key in out) out[key] = deepMerge(out[key], source[key]);
      else out[key] = source[key];
    }
    return out;
  }
  return source;
}

async function mergeViewJsons(jobs, buildOutAbs) {
  if (!Array.isArray(jobs)) return;
  for (const job of jobs) {
    const patterns = job.source ?? [];
    const files = await globby(patterns, { cwd: root, onlyFiles: true, absolute: true });
    let merged = {};
    for (const file of files) {
      const data = await readJson(file, {});
      merged = deepMerge(merged, data);
    }
    const outPath = path.join(buildOutAbs, job.output);
    await ensureDir(path.dirname(outPath));
    await fsp.writeFile(outPath, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`Merged view JSON → ${path.relative(root, outPath)} (${files.length} files)`);
  }
}

async function runCopier(jobs, buildOutAbs) {
  if (!Array.isArray(jobs)) return;
  for (const job of jobs) {
    const srcAbs = path.resolve(root, job.source);
    const destAbs = path.join(buildOutAbs, job.output);
    if (!fs.existsSync(srcAbs)) {
      console.warn(`Skip copy, not found: ${path.relative(root, srcAbs)}`);
      continue;
    }
    await copyItem(srcAbs, destAbs);
    console.log(`Copied ${path.relative(root, srcAbs)} → ${path.relative(root, destAbs)}`);
  }
}

function normalizeExt(file) {
  return path.extname(file).toLowerCase();
}

function defaultPixiPatterns() {
  return [
    '**/*.{png,jpg,jpeg,webp,gif,svg}',
    '**/*.{json,atlas,skel,txt,xml,fnt}',
    '**/*.{mp3,ogg,wav,m4a}',
  ];
}

function makeAliases(relPosix) {
  const noExt = relPosix.replace(/\.[^/.]+$/, '');
  const base = path.posix.basename(noExt);
  // alias both short and path-based for convenience
  return [base, noExt];
}

async function generatePixiManifestFromOutput(buildOutAbs, baseDirRel, outputRel, bundleName = 'main') {
  const baseDirAbs = path.join(buildOutAbs, baseDirRel);
  if (!fs.existsSync(baseDirAbs)) {
    console.warn(`Pixi manifest base dir not found: ${path.relative(buildOutAbs, baseDirAbs)}`);
    return;
  }
  const outRelFromBase = toPosix(path.relative(baseDirAbs, path.join(buildOutAbs, outputRel)));
  const ignore = [];
  if (!outRelFromBase.startsWith('..')) {
    ignore.push(outRelFromBase, `${outRelFromBase}/**`);
  }
  // common tool outputs we should not include
  ignore.push('viewJsons/**', 'assetLists/**');
  const matches = await globby(defaultPixiPatterns(), { cwd: baseDirAbs, onlyFiles: true, dot: false, ignore });
  const assets = matches.map((rel) => {
    const relPosix = toPosix(rel);
    return {
      alias: makeAliases(relPosix),
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
  const outAbs = path.join(buildOutAbs, outputRel);
  await ensureDir(path.dirname(outAbs));
  await fsp.writeFile(outAbs, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Pixi manifest → ${path.relative(root, outAbs)} (${assets.length} assets)`);
}

async function createAssetLists(assetListCfg, buildOutAbs) {
  if (!assetListCfg || !Array.isArray(assetListCfg.files)) return;
  const prefixRaw = assetListCfg.filePathPrefixToTrim || '';
  const prefixNorm = toPosix(prefixRaw);
  for (const f of assetListCfg.files) {
    const srcPatterns = f.source ?? [];
    const files = await globby(
      srcPatterns.map((p) => (p.endsWith('/**/*') || p.includes('*') ? p : path.join(p, '**/*'))),
      { cwd: root, onlyFiles: true }
    );
    const normalized = files
      .map((rel) => {
        const posixPath = toPosix(rel);
        if (!prefixNorm) return posixPath;
        const relWithPrefix = toPosix(path.join('', posixPath)); // normalize
        if (relWithPrefix.startsWith(prefixNorm)) return relWithPrefix.slice(prefixNorm.length);
        // Try also trimming Windows-style if provided as forward slash
        const alt = prefixNorm.replace(/\\/g, '/');
        if (relWithPrefix.startsWith(alt)) return relWithPrefix.slice(alt.length);
        return posixPath;
      })
      .sort();
    const outPath = path.join(buildOutAbs, f.output);
    await ensureDir(path.dirname(outPath));
    await fsp.writeFile(outPath, JSON.stringify({ files: normalized }, null, 2), 'utf8');
    console.log(`Asset list → ${path.relative(root, outPath)} (${normalized.length} files)`);
  }
}

function findLocalAudiospriteBin() {
  const candidates = [
    path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'audiosprite.cmd' : 'audiosprite'),
    path.join(root, 'node_modules', 'audiosprite', 'bin', 'audiosprite')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function resolveAudiospriteBin() {
  try {
    const bin = require.resolve('audiosprite/bin/audiosprite');
    return { type: 'node', bin };
  } catch {
    const local = findLocalAudiospriteBin();
    if (local) return { type: 'cmd', bin: local };
    // no local audiosprite found; return null and skip
    return null;
  }
}

async function generateAudioSprite(audioCfg, buildOutAbs) {
  if (!audioCfg || !audioCfg.source || !audioCfg.output) return;
  const srcDir = path.resolve(root, audioCfg.source);
  if (!fs.existsSync(srcDir)) {
    console.warn(`Audio source not found: ${path.relative(root, srcDir)}`);
    return;
  }
  const cli = resolveAudiospriteBin();
  if (!cli) {
    console.warn('audiosprite is not installed locally. Skipping audio sprite generation. Install it globally with "npm i -g audiosprite" (requires FFmpeg).');
    return;
  }
  const files = await globby(['**/*.{mp3,ogg,wav,m4a}'], { cwd: srcDir, onlyFiles: true });
  if (files.length === 0) {
    console.warn('No audio files found for audiosprite.');
    return;
  }
  const outNoExt = path.join(buildOutAbs, audioCfg.output);
  await ensureDir(path.dirname(outNoExt));
  const args = [
    '-o',
    outNoExt,
    '--output',
    outNoExt,
    '--format',
    'howler',
    '--path',
    audioCfg.pathToAppendInAudioSprite || '',
    '--export',
    'mp3,ogg'
  ].concat(files.map((f) => path.join(srcDir, f)));

  console.log('Generating audiosprite...');
  await new Promise((resolve, reject) => {
    const child =
      cli.type === 'node'
        ? spawn(process.execPath, [cli.bin, ...args], { stdio: 'inherit' })
        : spawn(cli.bin, args, { stdio: 'inherit', shell: true });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`audiosprite exited with code ${code}`));
    });
  });
  console.log(`Audiosprite written at ${path.relative(root, outNoExt)}.(json,mp3,ogg)`);
}

async function buildCode(entry, outDirAbs, mode = 'production') {
  const outJs = path.join(outDirAbs, 'js');
  await ensureDir(outJs);
  await esbuild({
    entryPoints: [path.resolve(root, entry)],
    outdir: outJs,
    bundle: true,
    format: 'esm',
    splitting: false,
    sourcemap: mode === 'development',
    minify: mode === 'production',
    target: ['es2020'],
    loader: { '.ts': 'ts' },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    logLevel: 'info'
  });
  console.log(`Code built → ${path.relative(root, outJs)}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config') {
      result.config = args[i + 1];
      i++;
    } else if (args[i] === '--mode') {
      result.mode = args[i + 1];
      i++;
    }
  }
  return result;
}

async function main() {
  const { config: cfgPathArg, mode: modeArg } = parseArgs();
  const cfgPath = path.resolve(root, cfgPathArg || 'build.config.json');
  const cfg = await readJson(cfgPath);
  if (!cfg) {
    console.error(`Config not found: ${path.relative(root, cfgPath)}`);
    process.exit(1);
  }

  const buildOutAbs = path.resolve(root, cfg.buildOutput || 'build');
  await rimraf(buildOutAbs);
  await ensureDir(buildOutAbs);
  const mode = modeArg === 'development' ? 'development' : 'production';

  // 1) Merge view JSONs
  await mergeViewJsons(cfg.viewJsonMerge, buildOutAbs);
  // 2) Copy assets/files
  await runCopier(cfg.copier, buildOutAbs);
  // 2.1) Auto-copy src/assets → res/assets if res has no assets yet (ignoring manifest/list outputs)
  const pixiCfg = cfg.pixiManifest || { baseDir: 'res', output: 'res/manifest/manifest.json', bundle: 'main' };
  const resDir = path.join(buildOutAbs, pixiCfg.baseDir || 'res');
  let hasAnyResAssets = false;
  if (fs.existsSync(resDir)) {
    const ignore = [];
    const outRelFromBase = toPosix(path.relative(resDir, path.join(buildOutAbs, pixiCfg.output || 'res/manifest/manifest.json')));
    if (!outRelFromBase.startsWith('..')) {
      ignore.push(outRelFromBase, `${outRelFromBase}/**`);
    }
    ignore.push('viewJsons/**', 'assetLists/**');
    hasAnyResAssets = (await globby(defaultPixiPatterns(), { cwd: resDir, onlyFiles: true, dot: false, ignore })).length > 0;
  }
  if (!hasAnyResAssets && fs.existsSync(path.join(root, 'src', 'assets'))) {
    const dest = path.join(resDir, 'assets');
    await ensureDir(dest);
    await copyDir(path.join(root, 'src', 'assets'), dest);
    console.log(`Auto-copied src/assets → ${path.relative(buildOutAbs, dest)}`);
  }
  // 3) Asset lists
  await createAssetLists(cfg.assetList, buildOutAbs);
  // 3.5) Pixi Manifest generation from output (dynamic)
  await generatePixiManifestFromOutput(buildOutAbs, pixiCfg.baseDir || 'res', pixiCfg.output || 'res/manifest/manifest.json', pixiCfg.bundle || 'main');
  // 4) Audio sprite
  await generateAudioSprite(cfg.audio, buildOutAbs);
  // 5) Build code
  if (cfg.buildEntry) {
    await buildCode(cfg.buildEntry, buildOutAbs, mode);
  }

  console.log(`Pipeline complete → ${path.relative(root, buildOutAbs)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


