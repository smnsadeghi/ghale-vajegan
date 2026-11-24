import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const rootDir = 'C:/Users/acer/.gemini/antigravity/scratch/ghale-vajegan';

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(rootDir, reqPath);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});
await new Promise(r => server.listen(3399, r));

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9299',
  '--hide-scrollbars',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
]);

let targets = null;
for (let i = 0; i < 25; i++) {
  await new Promise(r => setTimeout(r, 200));
  try {
    const res = await fetch('http://127.0.0.1:9299/json/list');
    targets = await res.json();
    if (targets && targets.length > 0) break;
  } catch (e) {}
}

const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);

let id = 1;
const pending = new Map();
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) p.reject(m.error); else p.resolve(m.result);
  }
};
function send(method, params = {}) {
  const i = id++;
  return new Promise((resolve, reject) => {
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
}

await send('Page.enable');
await send('Runtime.enable');

// Prevent SW controllerchange reload
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    try {
      Object.defineProperty(navigator, 'serviceWorker', {
        get: () => ({
          register: () => Promise.resolve({ update: () => Promise.resolve() }),
          addEventListener: () => {},
          removeEventListener: () => {}
        })
      });
    } catch(e) {}
  `
});

const loadPromise = new Promise(resolve => {
  const origOnMsg = ws.onmessage;
  ws.onmessage = e => {
    origOnMsg(e);
    const m = JSON.parse(e.data);
    if (m.method === 'Page.loadEventFired') resolve();
  };
});

await send('Page.navigate', { url: 'http://localhost:3399/index.html' });
await loadPromise;

// Wait for AudioEngine
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 200));
  const chk = await send('Runtime.evaluate', {
    expression: 'typeof window.AudioEngine !== "undefined"'
  });
  if (chk.result?.value === true) break;
}

const metrics = await send('Runtime.evaluate', {
  expression: `(async function() {
    window.enterDashboard = () => {};
    if (typeof dismissSplashScreen === 'function') dismissSplashScreen();
    const splash = document.getElementById('appSplashScreen');
    if (splash) splash.remove();

    const ctx = AudioEngine.initAudio();
    const baseLatency = ctx.baseLatency;
    const outputLatency = ctx.outputLatency;
    const sampleRate = ctx.sampleRate;
    const state = ctx.state;

    // Track AudioNode creation vs garbage collection
    let createdOscillators = 0;
    let createdGains = 0;
    let createdFilters = 0;

    const origOsc = ctx.createOscillator.bind(ctx);
    ctx.createOscillator = function() {
      createdOscillators++;
      return origOsc();
    };

    const origGain = ctx.createGain.bind(ctx);
    ctx.createGain = function() {
      createdGains++;
      return origGain();
    };

    const origFilter = ctx.createBiquadFilter.bind(ctx);
    ctx.createBiquadFilter = function() {
      createdFilters++;
      return origFilter();
    };

    // Play battle-vazhgan for 6 seconds
    AudioEngine.playTrack('battle-vazhgan', { crossfadeMs: 200 });
    await new Promise(r => setTimeout(r, 6000));

    const oscAfter6s = createdOscillators;
    const gainAfter6s = createdGains;
    const filterAfter6s = createdFilters;

    AudioEngine.stopMusic({ fadeMs: 200 });

    return {
      baseLatency,
      outputLatency,
      sampleRate,
      state,
      createdOscillators6s: oscAfter6s,
      createdGains6s: gainAfter6s,
      createdFilters6s: filterAfter6s,
      nodesCreatedPerSec: Math.round((createdOscillators + createdGains + createdFilters) / 6.0)
    };
  })()`,
  awaitPromise: true,
  returnByValue: true
});

console.log('Audio Context & Node Lifecycle Metrics:');
console.log(JSON.stringify(metrics.result?.value, null, 2));

try { ws.close(); } catch (e) {}
try { chrome.kill(); } catch (e) {}
try { server.close(); } catch (e) {}
process.exit(0);
