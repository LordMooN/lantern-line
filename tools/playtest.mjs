// A headless smoke test of the real game loop: it opens the game the way a player does, presses the
// keys, drags the pointer, and checks that the phases move as they should. It also catches a console
// error, which is the thing a screenshot never shows. Standard library only, over the DevTools
// protocol, the same way tools/shots.mjs drives Chrome.
//   node tools/playtest.mjs
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repository = resolve(here, '..');
const gameRoot = join(repository, 'game');

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

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const file = resolve(join(gameRoot, normalize(pathname.endsWith('/') ? `${pathname}index.html` : pathname)));
  if (file !== gameRoot && !file.startsWith(gameRoot + sep)) return response.writeHead(403).end('forbidden');
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

const profile = join(tmpdir(), `lantern-playtest-${Date.now()}`);
const chrome = spawn(
  CHROME,
  ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,800', '--no-first-run', 'about:blank'],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

const debugPort = await new Promise((done, fail) => {
  let buffered = '';
  chrome.stderr.on('data', (chunk) => {
    buffered += chunk.toString();
    const match = buffered.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
    if (match) done(Number(match[1]));
  });
  chrome.on('exit', (code) => fail(new Error(`chrome exited ${code}: ${buffered.slice(0, 300)}`)));
});

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((done, fail) => {
  socket.addEventListener('open', done, { once: true });
  socket.addEventListener('error', fail, { once: true });
});

let nextId = 1;
const pending = new Map();
const problems = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') {
    problems.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    problems.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '));
  }
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
await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  return result.result.value;
}

async function key(text) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: text, text, windowsVirtualKeyCode: text === ' ' ? 32 : text.toUpperCase().charCodeAt(0) }, sessionId);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: text }, sessionId);
}

async function drag(from, to) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1 }, sessionId);
  for (let step = 1; step <= 8; step += 1) {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: from.x + ((to.x - from.x) * step) / 8,
      y: from.y + ((to.y - from.y) * step) / 8,
      button: 'left',
      buttons: 1,
    }, sessionId);
    await wait(16);
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1 }, sessionId);
}

await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` }, sessionId);
await wait(900);

const report = [];
const probe = async (label) => {
  const state = await evaluate(`(() => {
    const canvas = document.querySelector('#game');
    return { status: document.querySelector('#status').textContent, w: canvas.width, h: canvas.height, css: canvas.style.width };
  })()`);
  report.push([label, state]);
  return state;
};

await probe('title');

await key(' ');
await wait(500);
await probe('after space (should be sector 1)');

// Drag back from the lantern: the post of sector 1 is at (190, 600) in the design field, and the
// canvas is letterboxed inside a 1280x800 window, so the field maps one to one here.
await drag({ x: 190, y: 600 }, { x: 130, y: 640 });
await wait(700);
await probe('after a launch');

await key('m');
await wait(120);
await key('m');
await wait(120);

await key('r');
await wait(400);
await probe('after recall');

// Three launches straight into the dark: the run should end on the adrift screen.
for (let attempt = 0; attempt < 3; attempt += 1) {
  await drag({ x: 190, y: 600 }, { x: 260, y: 520 });
  await wait(2600);
}
await probe('after three launches (should be adrift)');

await key('r');
await wait(500);
await probe('after restart');

for (const [label, state] of report) console.log(`${label}: ${JSON.stringify(state)}`);
console.log(`console errors: ${problems.length === 0 ? 'none' : problems.join(' | ')}`);

socket.close();
chrome.kill();
server.close();
