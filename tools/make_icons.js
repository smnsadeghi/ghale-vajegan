const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'icon.svg');
const svg = fs.readFileSync(svgPath, 'utf8');

const targets = [
  { name: 'icon-192.png', width: 192, height: 192 },
  { name: 'icon-512.png', width: 512, height: 512 },
  { name: 'icon-maskable-512.png', width: 512, height: 512 },
  { name: 'apple-touch-icon.png', width: 180, height: 180 },
  { name: 'favicon-32.png', width: 32, height: 32 }
];

targets.forEach(({ name, width, height }) => {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width
    }
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  const outPath = path.join(rootDir, name);
  fs.writeFileSync(outPath, pngBuffer);
  console.log(`Generated ${name} (${width}x${height}) - ${pngBuffer.length} bytes`);
});
