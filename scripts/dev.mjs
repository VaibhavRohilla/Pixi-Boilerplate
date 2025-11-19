import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import chokidar from 'chokidar';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'dist');
const PORT = 3000;
const WSPORT = 3001;

async function runPipelineDev() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'scripts', 'pipeline.mjs'), '--config', 'build.config.json', '--mode', 'development'], { stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`pipeline exited with ${code}`))));
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml; charset=utf-8';
    case '.gif': return 'image/gif';
    case '.mp3': return 'audio/mpeg';
    case '.ogg': return 'audio/ogg';
    case '.wav': return 'audio/wav';
    default: return 'application/octet-stream';
  }
}

async function ensureLiveReloadInjected() {
  const indexPath = path.join(outDir, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  let html = await fsp.readFile(indexPath, 'utf8');
  if (!html.includes('window.__WS_RELOAD__')) {
    const snippet = `
    <script>
      (function(){
        window.__WS_RELOAD__ = true;
        var ws = new WebSocket('ws://localhost:${WSPORT}');
        ws.onmessage = function (ev) {
          if (ev.data === 'reload') location.reload();
        };
      })();
    </script>`;
    html = html.replace('</body>', `${snippet}\n</body>`);
    await fsp.writeFile(indexPath, html, 'utf8');
  }
}

function createStaticServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
      let filePath = path.join(outDir, urlPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) {
        // Fallback to index.html for SPA
        filePath = path.join(outDir, 'index.html');
      }
      const data = await fsp.readFile(filePath);
      res.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': 'no-cache' });
      res.end(data);
    } catch (e) {
      res.writeHead(500);
      res.end('Server error');
    }
  });
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Dev server running at http://localhost:${PORT}`);
  });
  return server;
}

function createWsServer() {
  const wss = new WebSocketServer({ port: WSPORT });
  wss.on('connection', () => {});
  return wss;
}

function broadcastReload(wss) {
  for (const client of wss.clients) {
    try { client.send('reload'); } catch {}
  }
}

async function main() {
  await runPipelineDev();
  await ensureLiveReloadInjected();

  const server = createStaticServer();
  const wss = createWsServer();

  const watcher = chokidar.watch(
    [
      path.join(root, 'src'),
      path.join(root, 'public'),
      path.join(root, 'build.config.json'),
      path.join(root, 'raw-assets'),
      path.join(root, 'assets.config.json')
    ],
    { ignoreInitial: true }
  );

  let building = false;
  let pending = false;
  async function rebuild() {
    if (building) { pending = true; return; }
    building = true;
    try {
      await runPipelineDev();
      await ensureLiveReloadInjected();
      broadcastReload(wss);
      console.log('Rebuilt.');
    } catch (e) {
      console.error(e);
    } finally {
      building = false;
      if (pending) { pending = false; rebuild(); }
    }
  }

  watcher.on('all', rebuild);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


