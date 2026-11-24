import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const rootDir = 'C:/Users/acer/.gemini/antigravity/scratch/ghale-vajegan';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(rootDir, reqPath);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      console.log('404:', reqPath);
      res.writeHead(404);
      res.end('Not Found');
    } else {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});
await new Promise(r => server.listen(3377, r));

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9277',
  '--hide-scrollbars',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required',
  'about:blank'
]);

let targets = null;
for (let i = 0; i < 25; i++) {
  await new Promise(r => setTimeout(r, 200));
  try {
    const res = await fetch('http://127.0.0.1:9277/json/list');
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
  if (m.method === 'Runtime.consoleAPICalled') {
    console.log('[Browser Console]', m.params.args.map(a => a.value || a.description).join(' '));
  }
  if (m.method === 'Runtime.exceptionThrown') {
    console.error('[Browser Exception]', JSON.stringify(m.params));
  }
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

await send('Page.navigate', { url: 'http://localhost:3377/index.html' });
await loadPromise;
console.log('Page loaded!');

for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 200));
  const chk = await send('Runtime.evaluate', {
    expression: 'typeof window.AudioEngine !== "undefined" && typeof window.AudioEngine.startBattleMusic === "function"'
  });
  if (chk.result?.value === true) break;
}

const testResults = await send('Runtime.evaluate', {
  expression: `(async function() {
    window.enterDashboard = () => {};
    if (typeof dismissSplashScreen === 'function') dismissSplashScreen();
    const splash = document.getElementById('appSplashScreen');
    if (splash) splash.remove();

    const AE = window.AudioEngine;
    AE.initAudio();

    // 1. Start battle music for world 1
    const trackId = AE.startBattleMusic({ world: 1 });
    const initialTempo = AE.getTempoMultiplier();
    const initialLayer = AE.getLayerLevel();

    // Let it play for 500ms
    await new Promise(r => setTimeout(r, 500));

    // 2. Advance battle progress to 50%
    const step1 = AE.updateBattleMusicProgress(5, 10, false);

    await new Promise(r => setTimeout(r, 400));

    // 3. Advance battle progress to 70%
    const step2 = AE.updateBattleMusicProgress(3, 10, false);

    await new Promise(r => setTimeout(r, 400));

    // 4. Advance battle progress to 90% (Climax - 1 hit left)
    const step3 = AE.updateBattleMusicProgress(1, 10, false);

    // Wait for smooth ramp to settle
    await new Promise(r => setTimeout(r, 900));
    const climaxTempo = AE.getTempoMultiplier();
    const climaxLayer = AE.getLayerLevel();

    AE.stopMusic();

    return {
      trackId,
      initialTempo,
      initialLayer,
      step1Tempo: step1.tempo,
      step2Tempo: step2.tempo,
      step3Tempo: step3.tempo,
      climaxTempoFinal: climaxTempo,
      climaxLayerFinal: climaxLayer
    };
  })()`,
  awaitPromise: true,
  returnByValue: true
});

console.log('Live Audio Test Results:', JSON.stringify(testResults, null, 2));

try { ws.close(); } catch (e) {}
try { chrome.kill(); } catch (e) {}
try { server.close(); } catch (e) {}
process.exit(0);
