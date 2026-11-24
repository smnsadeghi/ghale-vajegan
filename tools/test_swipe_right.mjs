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
await new Promise(r => server.listen(3341, r));

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9230',
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
    const res = await fetch('http://127.0.0.1:9230/json/list');
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
  if (m.method === 'Runtime.exceptionThrown') console.error('Exception in browser:', JSON.stringify(m.params));
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
await send('Page.navigate', { url: 'http://localhost:3341/index.html' });

for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 200));
  const chk = await send('Runtime.evaluate', {
    expression: 'typeof window.appState !== "undefined" && typeof window.openStudyMode === "function"'
  });
  if (chk.result?.value === true) break;
}

const r1 = await send('Runtime.evaluate', {
  expression: `(function() {
    if (typeof dismissSplashScreen === 'function') dismissSplashScreen();
    const splash = document.getElementById('splashScreen');
    if (splash) splash.style.display = 'none';

    localStorage.setItem('flashcard_tutorial_seen', 'true');
    const app = window.appState;
    app.currentUserCode = '09120000000';
    app.students['09120000000'] = { name: 'شوالیه آزمایشی', grade: '10', xp: 120, account_status: 'approved' };
    const stages = getActiveStages();
    openStudyMode(stages[0]);
    return {
      word: document.getElementById('studyCardWord')?.innerText,
      next: document.getElementById('studyDeckBack1Word')?.innerText,
      next2: document.getElementById('studyDeckBack2Word')?.innerText,
      counter: document.getElementById('studyCounter')?.innerText
    };
  })()`,
  returnByValue: true
});
console.log('Open state (card 0):', r1.result?.value);

// Advance to card index 1 (next)
const r2 = await send('Runtime.evaluate', {
  expression: `(async function() {
    flyCardAndAdvance(1);
    await new Promise(r => setTimeout(r, 350));
    return {
      idx: studyIndex,
      word: document.getElementById('studyCardWord')?.innerText,
      next: document.getElementById('studyDeckBack1Word')?.innerText,
      next2: document.getElementById('studyDeckBack2Word')?.innerText,
      counter: document.getElementById('studyCounter')?.innerText
    };
  })()`,
  awaitPromise: true,
  returnByValue: true
});
console.log('After advance next (card 1):', r2.result?.value);

// Advance to card index 2 (next)
const r3 = await send('Runtime.evaluate', {
  expression: `(async function() {
    flyCardAndAdvance(1);
    await new Promise(r => setTimeout(r, 350));
    return {
      idx: studyIndex,
      word: document.getElementById('studyCardWord')?.innerText,
      next: document.getElementById('studyDeckBack1Word')?.innerText,
      next2: document.getElementById('studyDeckBack2Word')?.innerText,
      counter: document.getElementById('studyCounter')?.innerText
    };
  })()`,
  awaitPromise: true,
  returnByValue: true
});
console.log('After advance next (card 2):', r3.result?.value);

// Now swipe right to previous card (goes back to card 1)
const r4 = await send('Runtime.evaluate', {
  expression: `(async function() {
    flyCardAndAdvance(-1);
    await new Promise(r => setTimeout(r, 350));
    return {
      idx: studyIndex,
      word: document.getElementById('studyCardWord')?.innerText,
      next: document.getElementById('studyDeckBack1Word')?.innerText,
      next2: document.getElementById('studyDeckBack2Word')?.innerText,
      counter: document.getElementById('studyCounter')?.innerText
    };
  })()`,
  awaitPromise: true,
  returnByValue: true
});
console.log('After swipe-right to prev (should be card 1):', r4.result?.value);

await new Promise(r => setTimeout(r, 200));

const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'flashcard_swipe_right_390x844.png'), Buffer.from(shot.data, 'base64'));
console.log('Saved flashcard_swipe_right_390x844.png');

try { ws.close(); } catch (e) {}
try { chrome.kill(); } catch (e) {}
try { server.close(); } catch (e) {}
process.exit(0);
