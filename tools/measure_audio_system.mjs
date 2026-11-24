import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { audioBufferToWav } from './wav_writer.js';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const rootDir = 'C:/Users/acer/.gemini/antigravity/scratch/ghale-vajegan';
const recordingsDir = path.join(rootDir, 'tools', 'recordings');
if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true });

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
      res.writeHead(404);
      res.end('Not Found');
    } else {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});
await new Promise(r => server.listen(3388, r));

console.log('Test HTTP server listening on port 3388');

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9288',
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
    const res = await fetch('http://127.0.0.1:9288/json/list');
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
    // console.log('[Browser Console]', m.params.args.map(a => a.value || a.description).join(' '));
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

await send('Page.navigate', { url: 'http://localhost:3388/index.html' });
await loadPromise;
console.log('Game page loaded in Chromium');

// Wait for AudioEngine ready
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 200));
  const chk = await send('Runtime.evaluate', {
    expression: 'typeof window.AudioEngine !== "undefined" && typeof window.AudioEngine.startBattleMusic === "function"'
  });
  if (chk.result?.value === true) break;
}

// Inject Live Audio Tap & Long Task Monitor into Browser
await send('Runtime.evaluate', {
  expression: `(function() {
    window.enterDashboard = () => {};
    if (typeof dismissSplashScreen === 'function') dismissSplashScreen();
    const splash = document.getElementById('appSplashScreen');
    if (splash) splash.remove();

    window._audioTest = {
      longTasks: [],
      recordedBuffers: [],
      recording: false,
      activeNodesApprox: 0
    };

    // Monitor Long Tasks (> 50ms)
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window._audioTest.longTasks.push({
            startTime: entry.startTime,
            duration: entry.duration,
            name: entry.name
          });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.warn('Longtask observer not supported:', e);
    }

    // Attach Audio Tap to Master Gain
    const origInit = window.AudioEngine.initAudio;
    window.initAudioCapture = function() {
      const ctx = origInit();
      const master = window.AudioEngine.getMasterGainNode();
      if (!ctx || !master || window._audioTest.recorderAttached) return ctx;

      window._audioTest.recorderAttached = true;
      const bufferSize = 4096;
      const sp = ctx.createScriptProcessor(bufferSize, 2, 2);
      sp.onaudioprocess = function(e) {
        if (!window._audioTest.recording) return;
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.getChannelData(1);
        window._audioTest.recordedBuffers.push({
          l: new Float32Array(left),
          r: new Float32Array(right)
        });
      };

      // Connect master output to recorder node
      master.connect(sp);
      sp.connect(ctx.destination);
      return ctx;
    };

    window.startRecording = function() {
      window._audioTest.recordedBuffers = [];
      window._audioTest.longTasks = [];
      window._audioTest.recording = true;
    };

    window.stopRecording = function() {
      window._audioTest.recording = false;
      const bufs = window._audioTest.recordedBuffers;
      if (bufs.length === 0) return { samples: 0, l: [], r: [] };

      const totalSamples = bufs.length * bufs[0].l.length;
      const mergedL = new Float32Array(totalSamples);
      const mergedR = new Float32Array(totalSamples);
      let offset = 0;
      for (const b of bufs) {
        mergedL.set(b.l, offset);
        mergedR.set(b.r, offset);
        offset += b.l.length;
      }
      return {
        sampleRate: AudioEngine.initAudio().sampleRate,
        totalSamples,
        longTasks: window._audioTest.longTasks,
        // Return base64 or array slices
        l: Array.from(mergedL),
        r: Array.from(mergedR)
      };
    };
  })()`
});

console.log('Audio capture tap ready');

async function runScenario(scenarioName, actionFn, durationMs, cpuThrottle = 1) {
  console.log(`\n======================================================`);
  console.log(`Running Scenario: [${scenarioName}] (CPU throttle: ${cpuThrottle}x, Duration: ${durationMs}ms)`);
  console.log(`======================================================`);

  if (cpuThrottle > 1) {
    await send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
  } else {
    await send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }

  // Start recording
  await send('Runtime.evaluate', { expression: 'window.initAudioCapture(); window.startRecording();' });

  // Execute scenario actions
  await actionFn();

  // Wait for scenario duration
  await new Promise(r => setTimeout(r, durationMs));

  // Stop recording & fetch audio
  const res = await send('Runtime.evaluate', {
    expression: 'window.stopRecording()',
    returnByValue: true
  });

  if (cpuThrottle > 1) {
    await send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }

  const audioData = res.result?.value;
  if (!audioData || audioData.totalSamples === 0) {
    console.warn(`No audio captured for scenario: ${scenarioName}`);
    return null;
  }

  console.log(`Captured ${audioData.totalSamples} samples (${(audioData.totalSamples / audioData.sampleRate).toFixed(2)}s) at ${audioData.sampleRate}Hz`);
  console.log(`Long tasks recorded: ${audioData.longTasks.length}`);

  // Convert to WAV file
  const wavBuf = audioBufferToWav([audioData.l, audioData.r], audioData.sampleRate);
  const wavPath = path.join(recordingsDir, `${scenarioName}.wav`);
  fs.writeFileSync(wavPath, wavBuf);
  console.log(`Saved WAV to: ${wavPath}`);

  // Analyze with Python
  try {
    const pyOutput = execSync(`python tools/analyze_audio.py "${wavPath}"`, { encoding: 'utf-8' });
    const analysis = JSON.parse(pyOutput);
    console.log('Python Analysis Results:');
    console.log(JSON.stringify(analysis, null, 2));
    return {
      scenario: scenarioName,
      cpuThrottle,
      longTasks: audioData.longTasks,
      analysis
    };
  } catch (err) {
    console.error('Error running Python analysis:', err.message);
    return null;
  }
}

const allResults = [];

// 1. Scenario A: Each track alone
const tracksToTest = [
  'battle-vazhgan',
  'flashcards-chill',
  'battle-kenayeh',
  'battle-iham',
  'battle-inferno'
];

for (const tId of tracksToTest) {
  const r = await runScenario(`track_${tId}_normal`, async () => {
    await send('Runtime.evaluate', {
      expression: `(function() {
        AudioEngine.stopMusic({ fadeMs: 0 });
        AudioEngine.playTrack('${tId}', { crossfadeMs: 200 });
      })()`
    });
  }, 12000, 1);
  if (r) allResults.push(r);
}

// 2. Scenario B: Track switch / crossfade (flashcards-chill -> battle-vazhgan -> battle-inferno)
const rSwitch = await runScenario('track_crossfade_switch', async () => {
  await send('Runtime.evaluate', {
    expression: `(async function() {
      AudioEngine.playTrack('flashcards-chill', { crossfadeMs: 200 });
      await new Promise(r => setTimeout(r, 4000));
      AudioEngine.playTrack('battle-vazhgan', { crossfadeMs: 1000 });
      await new Promise(r => setTimeout(r, 5000));
      AudioEngine.playTrack('battle-inferno', { crossfadeMs: 1000 });
    })()`,
    awaitPromise: true
  });
}, 14000, 1);
if (rSwitch) allResults.push(rSwitch);

// 3. Scenario C: SFX bursts over music (battle-vazhgan playing + rapid correct/wrong/select SFX)
const rSfx = await runScenario('sfx_bursts_over_music', async () => {
  await send('Runtime.evaluate', {
    expression: `(async function() {
      AudioEngine.playTrack('battle-vazhgan', { crossfadeMs: 200 });
      await new Promise(r => setTimeout(r, 1000));
      // Fire bursts of SFX every 200-300ms
      for (let i = 0; i < 15; i++) {
        if (i % 3 === 0) AudioEngine.playSfx('correct');
        else if (i % 3 === 1) AudioEngine.playSfx('wrong');
        else AudioEngine.playSfx('select');
        await new Promise(r => setTimeout(r, 250));
      }
    })()`,
    awaitPromise: true
  });
}, 8000, 1);
if (rSfx) allResults.push(rSfx);

// 4. Scenario D: Heavy UI animation (card swiping) while music plays at 4x and 6x CPU throttle
for (const throttle of [4, 6]) {
  const rUI = await runScenario(`heavy_ui_swiping_throttle_${throttle}x`, async () => {
    await send('Runtime.evaluate', {
      expression: `(async function() {
        localStorage.setItem('flashcard_tutorial_seen', 'true');
        const stages = getActiveStages();
        openStudyMode(stages[0]);
        AudioEngine.playTrack('battle-vazhgan', { crossfadeMs: 200 });
        await new Promise(r => setTimeout(r, 1000));

        // Rapid card flips and card swipes
        for (let i = 0; i < 12; i++) {
          isCardFlipped = !isCardFlipped;
          applyCardFlipState();
          await new Promise(r => setTimeout(r, 150));
          flyCardAndAdvance(1);
          await new Promise(r => setTimeout(r, 350));
        }
      })()`,
      awaitPromise: true
    });
  }, 9000, throttle);
  if (rUI) allResults.push(rUI);
}

// 5. Scenario E: Tab hidden then visible again
const rVis = await runScenario('tab_hidden_resume', async () => {
  await send('Runtime.evaluate', {
    expression: `(async function() {
      AudioEngine.playTrack('battle-vazhgan', { crossfadeMs: 200 });
      await new Promise(r => setTimeout(r, 2000));

      // Simulate tab hide
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(r => setTimeout(r, 2500));

      // Simulate tab resume
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    })()`,
    awaitPromise: true
  });
}, 7000, 1);
if (rVis) allResults.push(rVis);

// Save summary of all results
fs.writeFileSync(path.join(recordingsDir, 'benchmark_summary.json'), JSON.stringify(allResults, null, 2));
console.log('\n======================================================');
console.log('ALL BENCHMARKS COMPLETED. Summary saved to tools/recordings/benchmark_summary.json');
console.log('======================================================');

try { ws.close(); } catch (e) {}
try { chrome.kill(); } catch (e) {}
try { server.close(); } catch (e) {}
process.exit(0);
