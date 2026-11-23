import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const manifestPath = path.join(rootDir, 'manifest.json');
const swPath = path.join(rootDir, 'sw.js');
const rootSvgPath = path.join(rootDir, 'icon.svg');
const assetSvgPath = path.join(rootDir, 'assets', 'icon.svg');

const html = fs.readFileSync(indexPath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sw = fs.readFileSync(swPath, 'utf8');

describe('Primary App Icon & Startup Splash Screen Suite', () => {
  test('1. Vector source icons (root icon.svg & assets/icon.svg) exist and are identical', () => {
    assert.ok(fs.existsSync(rootSvgPath), 'root icon.svg must exist');
    assert.ok(fs.existsSync(assetSvgPath), 'assets/icon.svg must exist');
    const rootHash = crypto.createHash('sha256').update(fs.readFileSync(rootSvgPath)).digest('hex');
    const assetHash = crypto.createHash('sha256').update(fs.readFileSync(assetSvgPath)).digest('hex');
    assert.equal(rootHash, assetHash, 'root icon.svg and assets/icon.svg SHA256 hashes must match exactly');
  });

  test('2. All required PWA PNG icon assets exist and are valid PNG images', () => {
    const pngNames = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png'];
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    for (const name of pngNames) {
      const p = path.join(rootDir, name);
      assert.ok(fs.existsSync(p), `${name} must exist on disk`);
      const buffer = fs.readFileSync(p);
      assert.ok(buffer.length > 500, `${name} must not be empty`);
      assert.deepEqual(buffer.subarray(0, 8), pngSignature, `${name} must have valid PNG magic header`);
    }
  });

  test('3. manifest.json registers primary SVG, 192, 512 and maskable icons', () => {
    assert.equal(manifest.name, 'شوالیه واژه‌ها');
    assert.equal(manifest.short_name, 'شوالیه واژه‌ها');
    assert.ok(manifest.icons.some(i => i.src.includes('icon.svg')), 'Must contain SVG icon');
    assert.ok(manifest.icons.some(i => i.src.includes('icon-192.png') && i.sizes === '192x192'), 'Must contain 192 PNG');
    assert.ok(manifest.icons.some(i => i.src.includes('icon-512.png') && i.sizes === '512x512' && i.purpose === 'any'), 'Must contain 512 any PNG');
    assert.ok(manifest.icons.some(i => i.src.includes('icon-maskable-512.png') && i.purpose === 'maskable'), 'Must contain 512 maskable PNG');
  });

  test('4. Service Worker caches primary icon assets and bumps cache', () => {
    assert.ok(sw.includes('./icon.svg'), 'sw.js must cache ./icon.svg');
    assert.ok(sw.includes('./assets/icon.svg'), 'sw.js must cache ./assets/icon.svg');
    assert.ok(sw.includes('./icon-192.png'), 'sw.js must cache ./icon-192.png');
    assert.ok(sw.includes('./icon-512.png'), 'sw.js must cache ./icon-512.png');
    assert.ok(sw.includes('./icon-maskable-512.png'), 'sw.js must cache ./icon-maskable-512.png');
    assert.ok(sw.includes('shovalie-vajeha-v6.8.0'), 'sw.js cache name must be bumped to v6.8.0');
  });

  test('5. HTML head links all mobile touch, favicon, and tile icons', () => {
    assert.ok(html.includes('<link rel="icon" type="image/svg+xml" href="./icon.svg" />'));
    assert.ok(html.includes('<link rel="icon" type="image/png" sizes="32x32" href="./favicon-32.png" />'));
    assert.ok(html.includes('<link rel="icon" type="image/png" sizes="192x192" href="./icon-192.png" />'));
    assert.ok(html.includes('<link rel="icon" type="image/png" sizes="512x512" href="./icon-512.png" />'));
    assert.ok(html.includes('<link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png" />'));
    assert.ok(html.includes('<meta name="msapplication-TileImage" content="./icon-512.png" />'));
  });

  test('6. HTML body contains #appSplashScreen with brand icon and title', () => {
    assert.ok(html.includes('<div id="appSplashScreen" class="app-splash-screen"'), 'Must define #appSplashScreen element');
    assert.ok(html.includes('class="splash-logo-wrap"'), 'Must contain logo wrapper');
    assert.ok(html.includes('class="splash-logo-glow"'), 'Must contain ambient logo glow');
    assert.ok(html.includes('class="splash-logo-img"'), 'Must contain splash logo image');
    assert.ok(html.includes('src="./assets/icon.svg"'), 'Must reference ./assets/icon.svg');
    assert.ok(html.includes('class="splash-title">شوالیه واژه‌ها</h1>'), 'Must render splash title');
    assert.ok(html.includes('class="splash-progress-track"'), 'Must contain progress track');
  });

  test('7. CSS defines zoom/grow animation and smooth closing transitions', () => {
    assert.ok(html.includes('.app-splash-screen.splash-closing .splash-logo-img'), 'Must define closing grow style');
    assert.ok(html.includes('transform: scale(1.22);'), 'Must scale up logo on exit transition');
    assert.ok(html.includes('@keyframes splashLogoScaleIn'), 'Must define splashLogoScaleIn animation');
    assert.ok(html.includes('@keyframes splashGlowPulse'), 'Must define splashGlowPulse animation');
    assert.ok(html.includes('@keyframes splashProgressFill'), 'Must define splashProgressFill animation');
  });

  test('8. JS exposes dismissSplashScreen with safe fallbacks and timer handling', () => {
    assert.ok(html.includes('function dismissSplashScreen()'), 'Must define dismissSplashScreen');
    assert.ok(html.includes('window.dismissSplashScreen = dismissSplashScreen'), 'Must expose dismissSplashScreen on window');
    assert.ok(html.includes('splash.classList.add("splash-closing")'), 'Must add splash-closing class');
    assert.ok(html.includes('splash.classList.add("splash-hidden")'), 'Must add splash-hidden class');
  });
});
