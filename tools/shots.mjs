// Retakes the entry's four screenshots: serves game/ on a local port, opens each ?shot= scene in
// headless Chrome at the design field's own size, waits for the frame the game says it has drawn,
// and saves a JPEG beside the others. Standard library only, no browser-automation package: it talks
// to Chrome over the DevTools protocol with Node's own WebSocket.
//   node tools/shots.mjs
import { createReadStream, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repository = resolve(here, '..');
const gameRoot = join(repository, 'game');
const shots = JSON.parse(readFileSync(join(repository, 'shots.json'), 'utf8'));

const CHROME =
  process.env.CHROME_PATH ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(
    (candidate) => {
      try {
        readFileSync(candidate);
        return true;
      } catch {
        return false;
      }
    },
  ) ??
  'chrome';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const file = resolve(join(gameRoot, normalize(pathname.endsWith('/') ? `${pathname}index.html` : pathname)));
  if (file !== gameRoot && !file.startsWith(gameRoot + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  try {
    const body = readFileSync(file);
    response.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
});

await new Promise((done) => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
const profile = mkdtempSync(join(tmpdir(), 'lantern-line-'));

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--window-size=1280,800',
    '--hide-scrollbars',
    '--no-first-run',
    '--disable-extensions',
    '--force-device-scale-factor=1',
    'about:blank',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

const portFile = new Promise((done, fail) => {
  let buffered = '';
  chrome.stderr.on('data', (chunk) => {
    buffered += chunk.toString();
    const match = buffered.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
    if (match) done(Number(match[1]));
  });
  chrome.on('exit', (code) => fail(new Error(`chrome exited with ${code}: ${buffered.slice(0, 400)}`)));
});

const debugPort = await portFile;
const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();

const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((done, fail) => {
  socket.addEventListener('open', done, { once: true });
  socket.addEventListener('error', fail, { once: true });
});

let nextId = 1;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { done, fail } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) fail(new Error(JSON.stringify(message.error)));
    else done(message.result);
  }
});

function send(method, params = {}, sessionId) {
  const id = nextId++;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  socket.send(JSON.stringify(payload));
  return new Promise((done, fail) => pending.set(id, { done, fail }));
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

await send('Page.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);

for (const shot of shots) {
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html${shot.query}` }, sessionId);

  let ready = null;
  for (let attempt = 0; attempt < 120 && ready === null; attempt += 1) {
    await new Promise((done) => setTimeout(done, 150));
    try {
      const result = await send(
        'Runtime.evaluate',
        { expression: 'window.__lanternLine ? window.__lanternLine.describe() : null', returnByValue: true },
        sessionId,
      );
      ready = result.result.value;
    } catch {
      ready = null;
    }
  }
  if (!ready) throw new Error(`the ${shot.name} scene never reported a frame`);

  const image = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, sessionId);
  const buffer = Buffer.from(image.data, 'base64');
  writeFileSync(join(repository, 'screenshots', shot.name), buffer);
  console.log(`${shot.name}: ${buffer.length} bytes  ${JSON.stringify(ready)}`);
}

socket.close();
chrome.kill();
server.close();
try { rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch { /* Windows keeps the profile locked for a moment; it is a temp folder. */ }
