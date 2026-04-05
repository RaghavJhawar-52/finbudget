/**
 * Generate PWA icons as PNG files using only Node.js built-ins (no extra deps).
 * Creates solid indigo (#6366f1) icons in all required sizes.
 * Run: node scripts/generate-icons.js
 */
const zlib = require("zlib");
const fs   = require("fs");
const path = require("path");

// CRC-32 lookup table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u32(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const crcBuf = Buffer.concat([t, data]);
  return Buffer.concat([u32(data.length), t, data, u32(crc32(crcBuf))]);
}

function makePNG(size, r, g, b) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk("IHDR", Buffer.concat([u32(size), u32(size), Buffer.from([8, 2, 0, 0, 0])]));

  // Raw pixel data: 1 filter byte (0 = None) + size * RGB per row
  const row = Buffer.allocUnsafe(1 + size * 3);
  row[0] = 0;
  for (let x = 0; x < size; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b; }

  const raw = Buffer.concat(Array(size).fill(row));
  const idat = chunk("IDAT", zlib.deflateSync(raw, { level: 9 }));
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const OUT_DIR = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Indigo #6366f1 = rgb(99, 102, 241)
const [R, G, B] = [99, 102, 241];

const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];
for (const s of SIZES) {
  fs.writeFileSync(path.join(OUT_DIR, `icon-${s}x${s}.png`), makePNG(s, R, G, B));
  console.log(`✓ icon-${s}x${s}.png`);
}

// apple-touch-icon in public root (iOS standard location)
fs.writeFileSync(path.join(__dirname, "..", "public", "apple-touch-icon.png"), makePNG(180, R, G, B));
console.log("✓ apple-touch-icon.png (public root)");

console.log("\n✅ All icons generated!");
