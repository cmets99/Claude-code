// Generates the PWA icon PNGs with zero external dependencies (no ImageMagick/PIL
// available in this environment). Draws a simple flat "dashboard grid" mark:
// a solid background with a centered 2x2 grid of squares.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [15, 23, 42]; // #0f172a
const FG = [56, 189, 248]; // #38bdf8

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function pixelColor(x, y, size) {
  const pad = size * 0.2;
  const gap = size * 0.1;
  const square = (size - 2 * pad - gap) / 2;

  const cells = [
    [pad, pad],
    [pad + square + gap, pad],
    [pad, pad + square + gap],
    [pad + square + gap, pad + square + gap],
  ];

  for (const [cx, cy] of cells) {
    if (x >= cx && x < cx + square && y >= cy && y < cy + square) {
      return FG;
    }
  }
  return BG;
}

function generatePng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelColor(x, y, size);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = 255;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const idatData = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdrData),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'client', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];

for (const [filename, size] of targets) {
  fs.writeFileSync(path.join(outDir, filename), generatePng(size));
  console.log(`Generated ${filename} (${size}x${size})`);
}
