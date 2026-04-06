/**
 * generate-icons.js
 * Run with: node generate-icons.js
 *
 * Generates icon-192.png and icon-512.png from the SVG icon.
 * Requires a canvas implementation. If unavailable, creates simple
 * placeholder PNGs using raw canvas drawing.
 *
 * For environments without node-canvas, open generate-icons.html
 * in a browser to download the icons.
 */

// Browser-based icon generator — open this as an HTML file
const html = `<!DOCTYPE html>
<html>
<head><title>Generate PWA Icons</title></head>
<body>
<h2>PWA Icon Generator</h2>
<p>Click a button to download the icon.</p>
<canvas id="c" style="display:none;"></canvas>
<button onclick="generate(192)">Download 192x192</button>
<button onclick="generate(512)">Download 512x512</button>
<script>
function generate(size) {
  const c = document.getElementById('c');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  // Background
  const r = size * 80 / 512;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = '#F68630';
  ctx.fill();
  // Letter D
  ctx.fillStyle = 'white';
  ctx.font = 'bold ' + (size * 360 / 512) + 'px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D', size / 2, size / 2 + size * 20 / 512);
  // Download
  const a = document.createElement('a');
  a.download = 'icon-' + size + '.png';
  a.href = c.toDataURL('image/png');
  a.click();
}
<\/script>
</body>
</html>`;

// Write the HTML generator file
const fs = require('fs');
const path = require('path');
fs.writeFileSync(path.join(__dirname, 'generate-icons.html'), html);
console.log('Created generate-icons.html — open it in a browser to download icons.');

// Also try to generate directly if canvas is available
try {
  const { createCanvas } = require('canvas');
  [192, 512].forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const r = size * 80 / 512;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fillStyle = '#F68630';
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 360 / 512}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('D', size / 2, size / 2 + size * 20 / 512);
    const buf = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(__dirname, `icon-${size}.png`), buf);
    console.log(`Generated icon-${size}.png`);
  });
} catch (e) {
  console.log('node-canvas not available. Open generate-icons.html in a browser instead.');
}
