import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function createPNG(width, height, drawPixel) {
  // Each scanline: 1 byte filter type (0) + width * 4 bytes RGBA
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawPixel(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // CRC32 helper
  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // 8-bit
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // No interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Draw Moodsonix brand icon: Dark background (#0A0A0F / #111118) + Lime soundbars (#C8F542)
function brandPixel(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dist = Math.hypot(x - cx, y - cy);

  // Background: dark #0A0A0F (10, 10, 15) to #181824 (24, 24, 36)
  let r = 10 + Math.floor(14 * (1 - dist / (w * 0.7)));
  let g = 10 + Math.floor(14 * (1 - dist / (w * 0.7)));
  let b = 15 + Math.floor(20 * (1 - dist / (w * 0.7)));
  r = Math.max(10, Math.min(25, r));
  g = Math.max(10, Math.min(25, g));
  b = Math.max(15, Math.min(36, b));

  // Scale inner artwork inside 80% safe zone for maskable icons
  const safeScale = isMaskable ? 0.82 : 1.0;
  const sx = cx + (x - cx) / safeScale;
  const sy = cy + (y - cy) / safeScale;
  const sDist = dist / safeScale;

  // Sound bars normalized coordinates:
  const scale = w / 512;
  const bars = [
    { x: 136 * scale, y: 216 * scale, w: 28 * scale, h: 80 * scale },
    { x: 184 * scale, y: 156 * scale, w: 28 * scale, h: 200 * scale },
    { x: 232 * scale, y: 116 * scale, w: 28 * scale, h: 280 * scale },
    { x: 280 * scale, y: 176 * scale, w: 28 * scale, h: 160 * scale },
    { x: 328 * scale, y: 236 * scale, w: 28 * scale, h: 40 * scale },
  ];

  for (const bar of bars) {
    if (sx >= bar.x && sx <= bar.x + bar.w && sy >= bar.y && sy <= bar.y + bar.h) {
      // Lime accent #C8F542 (200, 245, 66)
      return [200, 245, 66, 255];
    }
  }

  // Rounded outer circle ring
  const ringR = 190 * scale;
  if (Math.abs(sDist - ringR) < 2 * scale) {
    return [32, 32, 42, 255];
  }

  return [r, g, b, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, (x, y, w, h) => brandPixel(x, y, w, h, false)));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, (x, y, w, h) => brandPixel(x, y, w, h, false)));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-192x192.png'), createPNG(192, 192, (x, y, w, h) => brandPixel(x, y, w, h, true)));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, (x, y, w, h) => brandPixel(x, y, w, h, true)));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, (x, y, w, h) => brandPixel(x, y, w, h, false)));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(32, 32, (x, y, w, h) => brandPixel(x, y, w, h, false)));

console.log('Successfully generated PWA icon assets!');
