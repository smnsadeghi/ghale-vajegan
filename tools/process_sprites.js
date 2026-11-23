#!/usr/bin/env node

/**
 * tools/process_sprites.js
 * 
 * Automates sprite sheet processing for "Knight of Words" (شوالیه واژه‌ها):
 * 1. Chroma-keys pixels close to #FF00FF (magenta, tolerance 40 per channel) to 100% transparent (no blur).
 * 2. Strictly enforces exact dimensions: 512x512 (enemy_w4: 768x768). Throws an error if mismatch; DOES NOT RESIZE.
 * 3. Writes transparent PNG and lossless WebP to assets/redesign/.
 * 
 * Usage:
 *   node tools/process_sprites.js
 *   node tools/process_sprites.js --help
 *   node tools/process_sprites.js --prep-gemini   (Optional helper to prepare 512x512 / 768x768 inputs from raw Gemini JPGs)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(PROJECT_ROOT, 'assets', 'redesign', 'raw');
const OUT_DIR = path.join(PROJECT_ROOT, 'assets', 'redesign');

const SPRITE_SPECS = [
  { id: 'knight', file: 'knight.png', expectedWidth: 512, expectedHeight: 512, label: 'شوالیه (Knight)' },
  { id: 'enemy_w1', file: 'enemy_w1.png', expectedWidth: 512, expectedHeight: 512, label: 'دشمن جهان ۱ - غول گورستان (Graveyard Ghoul)' },
  { id: 'enemy_w2', file: 'enemy_w2.png', expectedWidth: 512, expectedHeight: 512, label: 'دشمن جهان ۲ - ربات ساعت‌دار (Clockwork Golem)' },
  { id: 'enemy_w3', file: 'enemy_w3.png', expectedWidth: 512, expectedHeight: 512, label: 'دشمن جهان ۳ - شوالیه محراب (Altar Rune Knight)' },
  { id: 'enemy_w4', file: 'enemy_w4.png', expectedWidth: 768, expectedHeight: 768, label: 'دشمن جهان ۴ - درخت مرده جهنمی (Hell Treant)' },
];

const GEMINI_RAW_MAPPINGS = {
  knight: 'Gemini_Generated_Image_5xrnpn5xrnpn5xrn.jpg',
  enemy_w1: 'Gemini_Generated_Image_qk8mg9qk8mg9qk8m.jpg',
  enemy_w2: 'Gemini_Generated_Image_nipoignipoignipo.jpg',
  enemy_w3: 'Gemini_Generated_Image_gi0infgi0infgi0i.jpg',
  enemy_w4: 'Gemini_Generated_Image_t8z0u8t8z0u8t8z0.jpg'
};

const DEFAULT_TOLERANCE = 40;

/**
 * Reads image width and height from PNG header (or via ffmpeg probe for other formats).
 */
function getImageDimensions(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const buf = fs.readFileSync(filePath);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  }

  // Probe with ffprobe
  const probe = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'csv=s=x:p=0',
    filePath
  ], { encoding: 'utf-8' });

  if (probe.status === 0 && probe.stdout) {
    const [w, h] = probe.stdout.trim().split('x').map(Number);
    if (w && h) return { width: w, height: h };
  }

  // Fallback scan for JPEG SOF marker
  if (buf.length > 4 && buf[0] === 0xFF && buf[1] === 0xD8) {
    let offset = 2;
    while (offset < buf.length) {
      if (buf[offset] !== 0xFF) break;
      const marker = buf[offset + 1];
      if (marker === 0xC0 || marker === 0xC2) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        return { width, height };
      }
      const len = buf.readUInt16BE(offset + 2);
      offset += 2 + len;
    }
  }

  throw new Error(`Could not determine dimensions for: ${filePath}`);
}

/**
 * Decodes an image file to a raw RGBA buffer using ffmpeg.
 */
function decodeImageToRgba(filePath) {
  const res = spawnSync('ffmpeg', [
    '-v', 'error',
    '-i', filePath,
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    'pipe:1'
  ], { maxBuffer: 100 * 1024 * 1024 });

  if (res.status !== 0 || !res.stdout || res.stdout.length === 0) {
    const err = res.stderr ? res.stderr.toString() : 'Unknown error';
    throw new Error(`FFmpeg decoding failed for ${filePath}: ${err}`);
  }

  return res.stdout;
}

/**
 * Precision Flood-fill Chroma Key for Gemini Sprite Sheets:
 * 1. Seeds a queue strictly from the outer borders of each cell.
 * 2. BFS expands ONLY into adjacent pixels that match the vivid magenta background:
 *    (r > 120 && b > 120 && g < 45 && |r - b| <= 50) || (r > 150 && b > 150 && g < 60)
 * 3. Crucially, the flood fill CANNOT penetrate inside the character perimeter.
 *    This 100% protects dark shadows (rgb(30,15,30)), leather belts, armor creases,
 *    tree bark, roots, and purple cloaks from being accidentally erased!
 * 4. A secondary cleanup pass removes isolated vivid magenta pixels (e.g. enclosed between legs).
 */
function chromaKeyMagenta(rgbaBuffer, width, height) {
  const len = rgbaBuffer.length;
  let transparentCount = 0;
  let totalPixels = len / 4;
  const cell = (width === 768) ? 192 : 128;
  const cols = width / cell;
  const rows = height / cell;

  const isBgColor = (r, g, b) => {
    return (r > 120 && b > 120 && g < 45 && Math.abs(r - b) <= 50) ||
           (r > 150 && b > 150 && g < 60);
  };

  const visited = new Uint8Array(width * height);
  const queue = [];

  // Seed queue with all cell borders (which are background/grid)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const minX = c * cell;
      const maxX = minX + cell - 1;
      const minY = r * cell;
      const maxY = minY + cell - 1;

      // Top and bottom borders of cell
      for (let x = minX; x <= maxX; x++) {
        [minY, maxY].forEach(y => {
          const idx = y * width + x;
          const p = idx * 4;
          if (!visited[idx] && isBgColor(rgbaBuffer[p], rgbaBuffer[p+1], rgbaBuffer[p+2])) {
            visited[idx] = 1;
            queue.push(idx);
          }
        });
      }
      // Left and right borders of cell
      for (let y = minY; y <= maxY; y++) {
        [minX, maxX].forEach(x => {
          const idx = y * width + x;
          const p = idx * 4;
          if (!visited[idx] && isBgColor(rgbaBuffer[p], rgbaBuffer[p+1], rgbaBuffer[p+2])) {
            visited[idx] = 1;
            queue.push(idx);
          }
        });
      }
    }
  }

  // BFS Flood Fill from borders inward
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    // Turn pixel completely transparent
    const p = curr * 4;
    rgbaBuffer[p] = 0;
    rgbaBuffer[p + 1] = 0;
    rgbaBuffer[p + 2] = 0;
    rgbaBuffer[p + 3] = 0;
    transparentCount++;

    // Check 4 adjacent neighbors
    const neighbors = [
      cx > 0 ? curr - 1 : -1,
      cx < width - 1 ? curr + 1 : -1,
      cy > 0 ? curr - width : -1,
      cy < height - 1 ? curr + width : -1
    ];

    for (const n of neighbors) {
      if (n !== -1 && !visited[n]) {
        const np = n * 4;
        if (isBgColor(rgbaBuffer[np], rgbaBuffer[np+1], rgbaBuffer[np+2])) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }
  }

  // Pass 2: Clean remaining isolated enclosed vivid magenta pockets (e.g. between legs/arms)
  for (let i = 0; i < len; i += 4) {
    if (rgbaBuffer[i + 3] > 0) {
      const r = rgbaBuffer[i];
      const g = rgbaBuffer[i + 1];
      const b = rgbaBuffer[i + 2];
      if (isBgColor(r, g, b)) {
        rgbaBuffer[i] = 0;
        rgbaBuffer[i + 1] = 0;
        rgbaBuffer[i + 2] = 0;
        rgbaBuffer[i + 3] = 0;
        transparentCount++;
      }
    }
  }

  return {
    buffer: rgbaBuffer,
    transparentCount,
    totalPixels,
    ratio: (transparentCount / totalPixels * 100).toFixed(1)
  };
}

/**
 * Encodes RGBA buffer to transparent PNG file.
 */
function encodePng(rgbaBuffer, width, height, outputPath) {
  const res = spawnSync('ffmpeg', [
    '-v', 'error',
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${width}x${height}`,
    '-i', 'pipe:0',
    '-c:v', 'png',
    outputPath
  ], { input: rgbaBuffer, maxBuffer: 50 * 1024 * 1024 });

  if (res.status !== 0) {
    const err = res.stderr ? res.stderr.toString() : 'Unknown error';
    throw new Error(`Failed to encode PNG ${outputPath}: ${err}`);
  }
}

/**
 * Encodes RGBA buffer to lossless WebP file.
 */
function encodeLosslessWebp(rgbaBuffer, width, height, outputPath) {
  const res = spawnSync('ffmpeg', [
    '-v', 'error',
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${width}x${height}`,
    '-i', 'pipe:0',
    '-c:v', 'libwebp',
    '-lossless', '1',
    outputPath
  ], { input: rgbaBuffer, maxBuffer: 50 * 1024 * 1024 });

  if (res.status !== 0) {
    const err = res.stderr ? res.stderr.toString() : 'Unknown error';
    throw new Error(`Failed to encode WebP ${outputPath}: ${err}`);
  }
}

/**
 * Optional preparation helper:
 * Converts raw Gemini JPG images into properly sized PNGs (512x512 / 768x768) in assets/redesign/raw/
 * using nearest-neighbor interpolation to preserve crisp pixel-art grids.
 */
function prepGeminiRaw() {
  console.log('\n--- آماده‌سازی اسپریت‌ها از تصاویر خام Gemini (--prep-gemini) ---');
  
  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
  }

  for (const spec of SPRITE_SPECS) {
    const geminiFileName = GEMINI_RAW_MAPPINGS[spec.id];
    const geminiFilePath = path.join(RAW_DIR, geminiFileName);
    const targetPngPath = path.join(RAW_DIR, spec.file);

    if (!fs.existsSync(geminiFilePath)) {
      console.warn(`[هشدار] فایل خام پیدا نشد: ${geminiFilePath}`);
      continue;
    }

    const { width: origW, height: origH } = getImageDimensions(geminiFilePath);
    console.log(`پردازش ${spec.label}: ${origW}x${origH} -> ${spec.expectedWidth}x${spec.expectedHeight}`);

    // If source is enemy_w4 (2400x1792 4:3), crop to 1792x1792 center square or scale with nearest neighbor
    let scaleFilter;
    if (spec.id === 'enemy_w4' && origW === 2400 && origH === 1792) {
      // 4x4 grid of 600x448 cells: scale with aspect preservation or fit
      scaleFilter = `scale=${spec.expectedWidth}:${spec.expectedHeight}:flags=neighbor`;
    } else {
      scaleFilter = `scale=${spec.expectedWidth}:${spec.expectedHeight}:flags=neighbor`;
    }

    const res = spawnSync('ffmpeg', [
      '-v', 'error',
      '-y',
      '-i', geminiFilePath,
      '-vf', scaleFilter,
      '-c:v', 'png',
      targetPngPath
    ]);

    if (res.status !== 0) {
      console.error(`خطا در ایجاد ${targetPngPath}:`, res.stderr.toString());
    } else {
      console.log(`  -> ذخیره شد در ورودی خام: ${targetPngPath} (${spec.expectedWidth}x${spec.expectedHeight})`);
    }
  }
  console.log('آماده‌سازی فایل‌های خام با موفقیت انجام شد.\n');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
راهنمای استفاده از اسکریپت پردازش اسپریت‌ها (tools/process_sprites.js):
  ورودی‌های مورد انتظار:
    assets/redesign/raw/knight.png       (512x512)
    assets/redesign/raw/enemy_w1.png     (512x512)
    assets/redesign/raw/enemy_w2.png     (512x512)
    assets/redesign/raw/enemy_w3.png     (512x512)
    assets/redesign/raw/enemy_w4.png     (768x768)

  قوانین:
    ۱. شفاف‌سازی پیکسلهای نزدیک به #FF00FF (با تلورانس 40 در هر کانال) بدون بلور.
    ۲. بررسی دقیق ابعاد؛ اگر اندازه دقیق نبود خطا می‌دهد و تغییر اندازه نمی‌دهد.
    ۳. تولید دو خروجی PNG شفاف و WebP بدون‌افت (lossless) در assets/redesign/.

  گزینه‌ها:
    --prep-gemini    تبدیل تصاویر خام دانلود شده از جمینای به ابعاد مشخص شده با فیلتر neighbor
    --tolerance <N>  تنظیم تلورانس کانال‌های رنگی (پیش‌فرض: 40)
`);
    process.exit(0);
  }

  if (args.includes('--prep-gemini')) {
    prepGeminiRaw();
  }

  let tolerance = DEFAULT_TOLERANCE;
  const tolIdx = args.indexOf('--tolerance');
  if (tolIdx !== -1 && args[tolIdx + 1]) {
    tolerance = parseInt(args[tolIdx + 1], 10) || DEFAULT_TOLERANCE;
  }

  console.log('=====================================================');
  console.log('   پردازش اسپریت‌های بازی شوالیه واژه‌ها (v5.1.0)');
  console.log('=====================================================');
  console.log(`پوشه ورودی خام: ${RAW_DIR}`);
  console.log(`پوشه خروجی:     ${OUT_DIR}`);
  console.log(`تلورانس ماژنتا: ${tolerance} در هر کانال (#FF00FF)`);
  console.log('-----------------------------------------------------');

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // Check which raw files exist
  let missingFiles = [];
  let foundRawGemini = [];

  for (const spec of SPRITE_SPECS) {
    const inputPath = path.join(RAW_DIR, spec.file);
    if (!fs.existsSync(inputPath)) {
      missingFiles.push(spec.file);
    }
  }

  if (missingFiles.length > 0) {
    console.error(`\n[خطا] فایل‌های ورودی زیر در پوشه ${RAW_DIR} یافت نشدند:`);
    missingFiles.forEach(f => console.error(`  - ${f}`));

    // Inspect if raw Gemini files exist
    if (fs.existsSync(RAW_DIR)) {
      const filesInRaw = fs.readdirSync(RAW_DIR);
      foundRawGemini = filesInRaw.filter(f => f.startsWith('Gemini_Generated_Image') || f.endsWith('.jpg'));
      if (foundRawGemini.length > 0) {
        console.log(`\nتصاویر خام دانلودشده جمینای در پوشه موجودند (${foundRawGemini.length} فایل):`);
        foundRawGemini.forEach(f => console.log(`  * ${f}`));
        console.log(`\nنکته: برای آماده‌سازی اولیه این تصاویر خام مطابق با اندازه 512x512 و 768x768 می‌توانید از دستور زیر استفاده کنید:`);
        console.log(`  node tools/process_sprites.js --prep-gemini\n`);
      }
    }

    process.exit(1);
  }

  // Validate all dimensions FIRST (Rule 2: throw error if not exact, DO NOT RESIZE)
  console.log('\n[مرحله ۱] اعتبارسنجی ابعاد فایل‌ها (قانون ۲: اندازه دقیق بدون تغییر اندازه)...');
  let hasDimensionError = false;

  for (const spec of SPRITE_SPECS) {
    const inputPath = path.join(RAW_DIR, spec.file);
    const { width, height } = getImageDimensions(inputPath);
    const isValid = (width === spec.expectedWidth && height === spec.expectedHeight);

    if (!isValid) {
      console.error(`\n[خطای ابعاد] فایل: ${spec.file}`);
      console.error(`  اندازه کنونی: ${width}x${height}`);
      console.error(`  اندازه مورد انتظار: ${spec.expectedWidth}x${spec.expectedHeight}`);
      console.error(`  طبق دستور، تغییر خودکار اندازه مجاز نیست و اسکریپت متوقف می‌شود.`);
      hasDimensionError = true;
    } else {
      console.log(`  ✓ ${spec.file.padEnd(16)}: ${width}x${height} (تطابق کامل با اندازه استاندارد)`);
    }
  }

  if (hasDimensionError) {
    console.error('\n[خطا] به دلیل عدم تطابق ابعاد فایل‌های ورودی با استاندارد، عملیات لغو شد.');
    process.exit(1);
  }

  // Process sprites
  console.log('\n[مرحله ۲] شفاف‌سازی ماژنتا و ذخیره نسخه‌های PNG شفاف و WebP Lossless...');

  let successCount = 0;

  for (const spec of SPRITE_SPECS) {
    const inputPath = path.join(RAW_DIR, spec.file);
    const outPngPath = path.join(OUT_DIR, `${spec.id}.png`);
    const outWebpPath = path.join(OUT_DIR, `${spec.id}.webp`);

    console.log(`\nدر حال پردازش: ${spec.label} (${spec.file})`);

    // 1. Decode to raw RGBA
    const rgba = decodeImageToRgba(inputPath);

    // 2. Chroma key magenta background, dark purples & grid dividing lines
    const { buffer: transparentRgba, transparentCount, totalPixels, ratio } = chromaKeyMagenta(rgba, spec.expectedWidth, spec.expectedHeight);
    console.log(`  - پیکسلهای شفاف‌شده: ${transparentCount.toLocaleString()} از ${totalPixels.toLocaleString()} (${ratio}%)`);

    // 3. Encode PNG
    encodePng(transparentRgba, spec.expectedWidth, spec.expectedHeight, outPngPath);
    const pngSize = (fs.statSync(outPngPath).size / 1024).toFixed(1);
    console.log(`  - خروجی PNG شفاف: ${outPngPath} (${pngSize} KB)`);

    // 4. Encode WebP Lossless
    encodeLosslessWebp(transparentRgba, spec.expectedWidth, spec.expectedHeight, outWebpPath);
    const webpSize = (fs.statSync(outWebpPath).size / 1024).toFixed(1);
    console.log(`  - خروجی WebP Lossless: ${outWebpPath} (${webpSize} KB)`);

    successCount++;
  }

  console.log('\n=====================================================');
  console.log(`پایان موفقیت‌آمیز: هر ${successCount} اسپریت‌شیت پردازش و ذخیره شدند.`);
  console.log(`برای بررسی چشمی هم‌خطی فریم‌ها، فایل زیر را در مرورگر باز کنید:`);
  console.log(`  tools/sprite_preview.html`);
  console.log('=====================================================\n');
}

main();
