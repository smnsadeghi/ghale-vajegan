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
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

await new Promise(resolve => server.listen(3334, resolve));
console.log('Server running on 3334');

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9223',
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
    const res = await fetch('http://127.0.0.1:9223/json/list');
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
const consoleLogs = [];
const browserExceptions = [];

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map(a => a.value || a.description).join(' ');
    consoleLogs.push({ type: msg.params.type, text });
    console.log('[Console]', msg.params.type, text);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
    browserExceptions.push(desc);
    console.error('[Exception]', desc);
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

// Set viewport 390x844
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true
});
await send('Emulation.setVisibleSize', { width: 390, height: 844 });

await send('Page.navigate', { url: 'http://localhost:3334/index.html' });

// Wait for appState and functions
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 200));
  const chk = await send('Runtime.evaluate', {
    expression: 'typeof window.appState !== "undefined" && typeof window.openStudyMode === "function"'
  });
  if (chk.result && chk.result.value === true) break;
}

// 1. Initial State: Open Study Mode
const openRes = await send('Runtime.evaluate', {
  expression: `(function() {
    if (typeof dismissSplashScreen === 'function') dismissSplashScreen();
    const splash = document.getElementById('splashScreen');
    if (splash) splash.style.display = 'none';

    localStorage.setItem("flashcard_tutorial_seen", "true"); // avoid tutorial overlay blocking initial view
    localStorage.removeItem("gv_study_hint_hidden"); // ensure flip hint shows initially

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
    
    // Clear seen cards for stage 1 to test clean state
    const key = "w1_s1";
    localStorage.removeItem("gv_seen_09120000000_" + key);
    if (app.students["09120000000"].seenCards) {
      delete app.students["09120000000"].seenCards[key];
    }
    
    openStudyMode(st);
    
    return {
      activeView: document.querySelector('.view:not(.hidden), #viewStudy:not(.hidden)')?.id,
      cardWord: document.getElementById('studyCardWord')?.innerText,
      tag: document.getElementById('studyCardTag')?.innerText,
      deck1Word: document.getElementById('studyDeckBack1Word')?.innerText,
      deck2Word: document.getElementById('studyDeckBack2Word')?.innerText,
      counter: document.getElementById('studyCounter')?.innerText,
      stageTitle: document.getElementById('studyStageTitle')?.innerText,
      isFlipped: document.getElementById('studyCard')?.classList.contains('is-flipped'),
      battleBtnText: document.getElementById('btnStudyEnterBattle')?.innerText?.trim(),
      dotsCount: document.querySelectorAll('.study-dot')?.length,
      seenDotsCount: document.querySelectorAll('.study-dot.seen')?.length
    };
  })()`,
  returnByValue: true
});
console.log('Open Study Result:', openRes.result.value);

await new Promise(r => setTimeout(r, 400));
let shot1 = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'flashcard_initial_390x844.png'), Buffer.from(shot1.data, 'base64'));
console.log('Saved: flashcard_initial_390x844.png');

// 2. Flipped State: Tap card to flip
const flipRes = await send('Runtime.evaluate', {
  expression: `(function() {
    const card = document.getElementById('studyCard');
    // trigger flip
    card.click();
    // In code finishPointer handles tap, let's call the flip action directly or simulate pointer
    if (!isCardFlipped) {
      isCardFlipped = true;
      applyCardFlipState();
    }
    return {
      isFlipped: document.getElementById('studyCard')?.classList.contains('is-flipped'),
      backWord: document.getElementById('studyCardBackWord')?.innerText,
      meanings: Array.from(document.querySelectorAll('.study-meaning-val')).map(el => el.innerText),
      hintText: document.getElementById('studyHint')?.innerText,
      battleBtnText: document.getElementById('btnStudyEnterBattle')?.innerText?.trim(),
      seenDotsCount: document.querySelectorAll('.study-dot.seen')?.length
    };
  })()`,
  returnByValue: true
});
console.log('Flipped Result:', flipRes.result.value);

await new Promise(r => setTimeout(r, 450));
let shot2 = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'flashcard_flipped_390x844.png'), Buffer.from(shot2.data, 'base64'));
console.log('Saved: flashcard_flipped_390x844.png');

// 3. After Interacting / All Seen State: Mark all cards as seen to reveal "ورود به نبرد"
const completeRes = await send('Runtime.evaluate', {
  expression: `(function() {
    // advance through all cards and flip each
    const deck = studyDeck || [];
    deck.forEach(c => {
      const cid = getCardId(c, studyStage.id);
      seenIds.add(cid);
    });
    persistSeenIds();
    renderStudyCard();
    updateStudyBattleButton();
    renderStudyProgressDots();
    
    return {
      seenCount: seenIds.size,
      totalCount: studyDeck.length,
      battleBtnText: document.getElementById('btnStudyEnterBattle')?.innerText?.trim(),
      battleBtnClasses: document.getElementById('btnStudyEnterBattle')?.className,
      seenDotsCount: document.querySelectorAll('.study-dot.seen')?.length
    };
  })()`,
  returnByValue: true
});
console.log('Complete Study Result:', completeRes.result.value);

await new Promise(r => setTimeout(r, 400));
let shot3 = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'flashcard_all_seen_390x844.png'), Buffer.from(shot3.data, 'base64'));
console.log('Saved: flashcard_all_seen_390x844.png');

// Inspect layout and element bounding boxes
const domAudit = await send('Runtime.evaluate', {
  expression: `(function() {
    const view = document.getElementById('viewStudy');
    const header = document.querySelector('.study-header');
    const segs = document.getElementById('studyProgressDots');
    const cardRow = document.querySelector('.study-card-row');
    const cardBox = document.getElementById('studyCard');
    const bottomAction = document.querySelector('.study-bottom-action');
    const battleBtn = document.getElementById('btnStudyEnterBattle');

    return {
      viewBox: view.getBoundingClientRect(),
      headerBox: header.getBoundingClientRect(),
      segsBox: segs.getBoundingClientRect(),
      cardRowBox: cardRow.getBoundingClientRect(),
      cardBoxRect: cardBox.getBoundingClientRect(),
      bottomActionBox: bottomAction.getBoundingClientRect(),
      battleBtnBox: battleBtn.getBoundingClientRect(),
      windowH: window.innerHeight,
      viewScrollH: view.scrollHeight,
      hasOverflow: view.scrollHeight > window.innerHeight
    };
  })()`,
  returnByValue: true
});
console.log('\nDOM Audit:', JSON.stringify(domAudit.result.value, null, 2));

ws.close();
chrome.kill();
server.close();
console.log('\nFlashcard inspection complete.');
