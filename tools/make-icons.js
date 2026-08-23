"use strict";

// Generates the toolbar icons (16 / 48 / 128) with no image dependencies.
// A tiny from-scratch PNG encoder draws an indigo rounded tile with a light
// phone screen on it. Run: node tools/make-icons.js

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

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

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // color type: RGBA

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const deflated = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflated),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function insideRoundedRect(x, y, left, top, w, h, radius) {
  const right = left + w;
  const bottom = top + h;
  if (x < left || x > right || y < top || y > bottom) {
    return false;
  }
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, top + radius), bottom - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const tile = [79, 70, 229, 255]; // indigo-600
  const screen = [244, 245, 250, 255];

  const tileRadius = size * 0.22;
  const phoneW = size * 0.42;
  const phoneH = size * 0.6;
  const phoneLeft = (size - phoneW) / 2;
  const phoneTop = (size - phoneH) / 2;
  const phoneRadius = size * 0.1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let color = [0, 0, 0, 0];
      if (insideRoundedRect(px, py, 0, 0, size, size, tileRadius)) {
        color = tile;
      }
      if (
        insideRoundedRect(px, py, phoneLeft, phoneTop, phoneW, phoneH, phoneRadius)
      ) {
        color = screen;
      }
      const i = (y * size + x) * 4;
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = color[3];
    }
  }
  return encodePng(size, size, rgba);
}

const outDir = path.join(__dirname, "..", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, drawIcon(size));
  console.log("wrote", file);
}
