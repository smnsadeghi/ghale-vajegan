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
      console.log('404:', reqPath);
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

await new Promise(resolve => server.listen(3333, resolve));
console.log('Static server listening on port 3333');

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--hide-scrollbars',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
]);

let targets = null;
for (let i = 0; i < 20; i++) {
  await new Promise(r => setTimeout(r, 300));
  try {
    const res = await fetch('http://127.0.0.1:9222/json/list');
    targets = await res.json();
    if (targets && targets.length > 0) break;
  } catch (e) {}
}

const pageTarget = targets[0];
const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let msgId = 1;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === 'Runtime.consoleAPICalled') {
    console.log('[Browser Console]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    console.error('[Browser Exception]', msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
  }
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(msg.error);
    else resolve(msg.result);
  }
};

function send(method, params = {}) {
  const id = msgId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send('Page.enable');
await send('Runtime.enable');

await send('Page.navigate', { url: 'http://localhost:3333/index.html' });

// Wait until page script loads
let loaded = false;
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 200));
  const chk = await send('Runtime.evaluate', {
    expression: 'typeof window.appState !== "undefined" && typeof window.startBattleMode === "function"'
  });
  if (chk.result && chk.result.value === true) {
    loaded = true;
    break;
  }
}
console.log('Page scripts loaded:', loaded);

// Initialize Battle
const initResult = await send('Runtime.evaluate', {
  expression: `(function() {
    try {
      if (typeof dismissSplashScreen === 'function') dismissSplashScreen();
      const splash = document.getElementById('splashScreen');
      if (splash) {
        splash.style.display = 'none';
        splash.classList.add('splash-hidden');
      }

      window.canBattleForStage = () => true;
      const app = window.appState;
      app.currentUserCode = "09120000000";
      app.students["09120000000"] = {
        name: "شوالیه آزمایشی",
        grade: "10",
        xp: 120,
        account_status: "approved"
      };
      
      const stages = (typeof getActiveStages === 'function' ? getActiveStages() : null) || app.stages || [];
      const st = stages[0];
      if (!st) return { error: "No stage found" };
      
      startBattleMode(st);
      return {
        activeView: document.querySelector('.view:not(.hidden)')?.id,
        stageTitle: st.title,
        promptLead: document.querySelector('.quiz-prompt-lead')?.innerText || document.querySelector('.quiz-badge-chip')?.innerText,
        targetWord: document.querySelector('.quiz-target-word')?.innerText || document.querySelector('.quiz-word-highlight')?.innerText,
        optionsCount: document.querySelectorAll('.rpg-option-btn').length,
        optionsText: Array.from(document.querySelectorAll('.rpg-option-btn .opt-text')).map(el => el.innerText.trim())
      };
    } catch(e) {
      return { error: e.message, stack: e.stack };
    }
  })()`,
  returnByValue: true
});
console.log('Init Battle Result:', initResult.result.value);

const viewports = [
  { name: '360x640', width: 360, height: 640 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 }
];

const results = [];

for (const vp of viewports) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: 2,
    mobile: true
  });
  await send('Emulation.setVisibleSize', { width: vp.width, height: vp.height });
  await new Promise(r => setTimeout(r, 500));

  const metrics = await send('Runtime.evaluate', {
    expression: `(function() {
      const arena = document.getElementById('viewArena');
      const question = document.querySelector('.rpg-question');
      const options = Array.from(document.querySelectorAll('.rpg-option-btn'));
      const stage = document.getElementById('stageScene');
      const hp = document.getElementById('enemyHpWrap');
      const topHud = document.querySelector('.top-hud.hud-arena');
      
      const qRect = question ? question.getBoundingClientRect() : {};
      const optRects = options.map(b => b.getBoundingClientRect());
      const lastOpt = optRects[optRects.length - 1] || {};
      const stageRect = stage ? stage.getBoundingClientRect() : {};
      const hpRect = hp ? hp.getBoundingClientRect() : {};
      const topHudRect = topHud ? topHud.getBoundingClientRect() : {};

      const windowH = window.innerHeight;
      const arenaH = arena ? arena.clientHeight : 0;
      const scrollH = arena ? arena.scrollHeight : 0;
      const hasVerticalScroll = scrollH > windowH;
      const bottomGap = windowH - (lastOpt.bottom || 0);

      return {
        viewport: { width: window.innerWidth, height: windowH },
        arenaScrollHeight: scrollH,
        arenaClientHeight: arenaH,
        hasVerticalScroll,
        bottomGap: Math.round(bottomGap),
        topHudHeight: Math.round(topHudRect.height || 0),
        stageHeight: Math.round(stageRect.height || 0),
        hpHeight: Math.round(hpRect.height || 0),
        questionHeight: Math.round(qRect.height || 0),
        optionButtonHeights: optRects.map(r => Math.round(r.height)),
        lastOptionBottom: Math.round(lastOpt.bottom || 0),
        optionsGridStyle: window.getComputedStyle(document.getElementById('qzOptions')).display
      };
    })()`,
    returnByValue: true
  });

  const data = metrics.result.value;
  console.log(`\n=== Metrics for Viewport ${vp.name} ===`);
  console.log(JSON.stringify(data, null, 2));
  results.push({ name: vp.name, data });

  const screenshot = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true
  });

  const outPath = path.join(ARTIFACT_DIR, `arena_layout_${vp.name}.png`);
  fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`Screenshot saved to: ${outPath}`);
}

ws.close();
chrome.kill();
server.close();
console.log('\nVerification complete!');
