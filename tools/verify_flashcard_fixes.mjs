import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ARTIFACT_DIR = 'C:/Users/acer/.gemini/antigravity/brain/b274b952-e7d5-43e5-845c-7709f2a8956c';
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
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(rootDir, reqPath);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});
await new Promise(r => server.listen(3366, r));

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9266',
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
    const res = await fetch('http://127.0.0.1:9266/json/list');
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
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

// Prevent SW from registering and triggering reload
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

await send('Page.navigate', { url: 'http://localhost:3366/index.html' });

for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 200));
  const chk = await send('Runtime.evaluate', {
    expression: 'typeof window.appState !== "undefined" && typeof window.openStudyMode === "function"'
  });
  if (chk.result?.value === true) break;
}

// Setup environment
await send('Runtime.evaluate', {
  expression: `(function() {
    window.enterDashboard = function() {
      console.log('enterDashboard blocked during test');
    };
    if (typeof dismissSplashScreen === 'function') dismissSplashScreen();
    const splash = document.getElementById('appSplashScreen');
    if (splash) splash.remove();

    localStorage.setItem('flashcard_tutorial_seen', 'true');
    const app = window.appState;
    app.currentUserCode = '09120000000';
    app.students['09120000000'] = { name: 'شوالیه آزمایشی', grade: '10', xp: 120, account_status: 'approved' };
  })()`
});

// 1. Single-Meaning Card Back Screenshot (Card 0: "سفینه")
console.log('--- 1. Testing Single-Meaning Card Back (Card 0: سفینه) ---');
await send('Runtime.evaluate', {
  expression: `(function() {
    const stages = getActiveStages();
    openStudyMode(stages[0]);

    // Flip Card 0
    isCardFlipped = true;
    applyCardFlipState();
  })()`
});

await new Promise(r => setTimeout(r, 400));
const shot1 = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'flashcard_single_meaning_back_390x844.png'), Buffer.from(shot1.data, 'base64'));
console.log('Saved: flashcard_single_meaning_back_390x844.png');

// 2. Multi-Meaning Card Back Screenshot (Card 1: "کفایت" with 3 meanings)
console.log('--- 2. Testing Multi-Meaning Card Back (Card 1: کفایت) ---');
await send('Runtime.evaluate', {
  expression: `(async function() {
    flyCardAndAdvance(1);
    await new Promise(r => setTimeout(r, 380));
    isCardFlipped = true;
    applyCardFlipState();
  })()`,
  awaitPromise: true
});

await new Promise(r => setTimeout(r, 400));
const shot2 = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'flashcard_multi_meaning_back_390x844.png'), Buffer.from(shot2.data, 'base64'));
console.log('Saved: flashcard_multi_meaning_back_390x844.png');

// 3. Swipe through all cards WITHOUT FLIPPING and verify battle unlocks
console.log('--- 3. Testing Swipe Through All Cards Without Flipping ---');

const swipeResult = await send('Runtime.evaluate', {
  expression: `(async function() {
    const app = window.appState;
    const stages = getActiveStages();
    const st = stages[0];
    const key = getStageKey(st);
    localStorage.removeItem('gv_seen_09120000000_' + key);
    if (app.students['09120000000'].seenCards) {
      delete app.students['09120000000'].seenCards[key];
    }
    openStudyMode(st);

    const total = studyDeck.length; // 14
    console.log('Total cards to swipe:', total);

    // Swipe next until we reach the last card (index total - 1)
    while (studyIndex < total - 1) {
      flyCardAndAdvance(1);
      await new Promise(r => setTimeout(r, 350));
    }

    // Now on last card (card 13). Swipe next on last card to clamp with spring-back
    flyCardAndAdvance(1);
    await new Promise(r => setTimeout(r, 450));

    const battleBtn = document.getElementById('btnStudyEnterBattle');
    const isLocked = battleBtn?.classList.contains('is-locked');
    const btnText = battleBtn?.innerText.trim();
    const seenCount = seenIds ? seenIds.size : 0;

    return {
      total,
      finalIndex: studyIndex,
      seenCount,
      isLocked,
      btnText
    };
  })()`,
  awaitPromise: true,
  returnByValue: true
});

console.log('Swipe without flipping result:', swipeResult.result?.value);

await new Promise(r => setTimeout(r, 400));
const shot3 = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'flashcard_end_deck_unlocked_390x844.png'), Buffer.from(shot3.data, 'base64'));
console.log('Saved: flashcard_end_deck_unlocked_390x844.png');

try { ws.close(); } catch (e) {}
try { chrome.kill(); } catch (e) {}
try { server.close(); } catch (e) {}
process.exit(0);
