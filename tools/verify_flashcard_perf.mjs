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

await new Promise(resolve => server.listen(3336, resolve));

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9225',
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
    const res = await fetch('http://127.0.0.1:9225/json/list');
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

// Emulate 390x844 mobile with 4x CPU throttling
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true
});
await send('Emulation.setVisibleSize', { width: 390, height: 844 });
await send('Emulation.setCPUThrottlingRate', { rate: 4 });

await send('Page.navigate', { url: 'http://localhost:3336/index.html' });

for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 200));
  const chk = await send('Runtime.evaluate', {
    expression: 'typeof window.appState !== "undefined" && typeof window.openStudyMode === "function"'
  });
  if (chk.result?.value === true) break;
}

// Setup study mode
await send('Runtime.evaluate', {
  expression: `(function() {
    if (typeof dismissSplashScreen === 'function') dismissSplashScreen();
    const splash = document.getElementById('splashScreen');
    if (splash) splash.style.display = 'none';

    localStorage.setItem("flashcard_tutorial_seen", "true");
    const app = window.appState;
    app.currentUserCode = "09120000000";
    app.students["09120000000"] = {
      name: "شوالیه آزمایشی",
      grade: "10",
      xp: 120,
      account_status: "approved"
    };

    const stages = (typeof getActiveStages === 'function' ? getActiveStages() : null) || app.stages || [];
    openStudyMode(stages[0]);
  })()`
});

await new Promise(r => setTimeout(r, 500));

// Setup benchmark observer
await send('Runtime.evaluate', {
  expression: `(function() {
    window.__bench = {
      frames: [],
      longTasks: [],
      isRecording: false,
      lastFrameTime: performance.now(),
      observer: new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__bench.longTasks.push({ duration: entry.duration, startTime: entry.startTime });
        }
      })
    };
    window.__bench.observer.observe({ entryTypes: ['longtask'] });

    window.__recordFrame = function(now) {
      if (!window.__bench.isRecording) return;
      window.__bench.frames.push(now - window.__bench.lastFrameTime);
      window.__bench.lastFrameTime = now;
      requestAnimationFrame(window.__recordFrame);
    };

    window.__startBench = function() {
      window.__bench.frames = [];
      window.__bench.longTasks = [];
      window.__bench.isRecording = true;
      window.__bench.lastFrameTime = performance.now();
      requestAnimationFrame(window.__recordFrame);
    };

    window.__stopBench = function() {
      window.__bench.isRecording = false;
      const f = window.__bench.frames;
      const lt = window.__bench.longTasks;
      const totalTime = f.reduce((a, b) => a + b, 0);
      const avgFps = f.length > 0 ? (f.length / (totalTime / 1000)) : 0;
      const longest = f.length > 0 ? Math.max(...f) : 0;
      return {
        frameCount: f.length,
        totalTimeMs: totalTime,
        avgFps: Math.round(avgFps * 10) / 10,
        longestFrameMs: Math.round(longest * 10) / 10,
        longTaskCount: lt.length,
        longTasksTotalMs: Math.round(lt.reduce((a, b) => a + b.duration, 0) * 10) / 10,
        longTasks: lt
      };
    };
  })()`
});

// TEST 1: Benchmark Slow Drag (4x CPU)
console.log('--- Starting Slow Drag Benchmark (AFTER, 4x CPU) ---');
const slowDragRes = await send('Runtime.evaluate', {
  expression: `(async function() {
    window.__startBench();
    const card = document.getElementById('studyCard');
    const rect = card.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    card.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: startX,
      clientY: startY,
      bubbles: true,
      cancelable: true,
      pointerId: 1
    }));

    // Drag slowly over 50 steps (~1000ms)
    const steps = 50;
    const totalDx = -140;
    for (let i = 1; i <= steps; i++) {
      const curX = startX + (totalDx * (i / steps));
      card.dispatchEvent(new PointerEvent('pointermove', {
        clientX: curX,
        clientY: startY,
        bubbles: true,
        cancelable: true,
        pointerId: 1
      }));
      await new Promise(r => setTimeout(r, 20));
    }

    card.dispatchEvent(new PointerEvent('pointerup', {
      clientX: startX + totalDx,
      clientY: startY,
      bubbles: true,
      cancelable: true,
      pointerId: 1
    }));

    await new Promise(r => setTimeout(r, 350));
    return window.__stopBench();
  })()`,
  awaitPromise: true,
  returnByValue: true
});

console.log('Slow Drag Result (AFTER):', slowDragRes.result.value);

// TEST 2: Benchmark Rapid 5-Card Swipe (4x CPU)
console.log('--- Starting Rapid 5-Card Swipe Benchmark (AFTER, 4x CPU) ---');
const rapidSwipeRes = await send('Runtime.evaluate', {
  expression: `(async function() {
    window.__startBench();

    for (let c = 0; c < 5; c++) {
      const card = document.getElementById('studyCard');
      const rect = card.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;

      card.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: startX,
        clientY: startY,
        bubbles: true,
        cancelable: true,
        pointerId: 1
      }));

      // Rapid flick left
      for (let s = 1; s <= 5; s++) {
        card.dispatchEvent(new PointerEvent('pointermove', {
          clientX: startX - (s * 25),
          clientY: startY,
          bubbles: true,
          cancelable: true,
          pointerId: 1
        }));
        await new Promise(r => setTimeout(r, 12));
      }

      card.dispatchEvent(new PointerEvent('pointerup', {
        clientX: startX - 125,
        clientY: startY,
        bubbles: true,
        cancelable: true,
        pointerId: 1
      }));

      await new Promise(r => setTimeout(r, 320));
    }

    await new Promise(r => setTimeout(r, 100));
    return window.__stopBench();
  })()`,
  awaitPromise: true,
  returnByValue: true
});

console.log('Rapid 5-Card Swipe Result (AFTER):', rapidSwipeRes.result.value);

// TEST 3: Capture screenshot at 390x844 mid-drag (~40% swipe) showing next card with real word visible behind
console.log('--- Capturing Mid-Drag Screenshot (~40% swipe) ---');
await send('Runtime.evaluate', {
  expression: `(function() {
    // Clean open to card 0
    const stages = (typeof getActiveStages === 'function' ? getActiveStages() : null) || appState.stages || [];
    openStudyMode(stages[0]);
    const card = document.getElementById('studyCard');
    const rect = card.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    // Simulate 40% swipe to the left (dx = -120px)
    card.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: startX,
      clientY: startY,
      bubbles: true,
      cancelable: true,
      pointerId: 1
    }));

    card.dispatchEvent(new PointerEvent('pointermove', {
      clientX: startX - 120,
      clientY: startY,
      bubbles: true,
      cancelable: true,
      pointerId: 1
    }));
  })()`
});

await new Promise(r => setTimeout(r, 200));

const shotMidDrag = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'flashcard_mid_drag_390x844.png'), Buffer.from(shotMidDrag.data, 'base64'));
console.log('Saved: flashcard_mid_drag_390x844.png');

// Inspect what is rendered behind during mid drag
const midDragAudit = await send('Runtime.evaluate', {
  expression: `(function() {
    const activeWord = document.getElementById('studyCardWord')?.innerText;
    const nextWord = document.getElementById('studyDeckBack1Word')?.innerText;
    const next2Word = document.getElementById('studyDeckBack2Word')?.innerText;
    const deck1 = document.getElementById('studyDeckBack1');
    const deck1Style = deck1 ? window.getComputedStyle(deck1).transform : '';
    return { activeWord, nextWord, next2Word, deck1Transform: deck1Style };
  })()`,
  returnByValue: true
});
console.log('Mid-Drag Elements Audit:', midDragAudit.result.value);

// Release pointer from mid-drag
await send('Runtime.evaluate', {
  expression: `(function() {
    const card = document.getElementById('studyCard');
    card.dispatchEvent(new PointerEvent('pointerup', {
      clientX: 50,
      clientY: 300,
      bubbles: true,
      cancelable: true,
      pointerId: 1
    }));
  })()`
});

await new Promise(r => setTimeout(r, 400));

// TEST 4: Capture screenshot after swipe-right to a previous card
console.log('--- Capturing Screenshot After Swipe-Right to Previous Card ---');
const swipeRightRes = await send('Runtime.evaluate', {
  expression: `(async function() {
    // Advance to card index 2
    studyIndex = 2;
    renderStudyCard();
    await new Promise(r => setTimeout(r, 100));

    // Swipe right (prev card)
    flyCardAndAdvance(-1);
    await new Promise(r => setTimeout(r, 350));

    return {
      studyIndex,
      activeWord: document.getElementById('studyCardWord')?.innerText,
      nextWord: document.getElementById('studyDeckBack1Word')?.innerText,
      counter: document.getElementById('studyCounter')?.innerText
    };
  })()`,
  awaitPromise: true,
  returnByValue: true
});
console.log('Swipe-Right Result:', swipeRightRes.result.value);

await new Promise(r => setTimeout(r, 200));

const shotSwipeRight = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'flashcard_swipe_right_390x844.png'), Buffer.from(shotSwipeRight.data, 'base64'));
console.log('Saved: flashcard_swipe_right_390x844.png');

ws.close();
chrome.kill();
server.close();
console.log('Verification script completed.');
