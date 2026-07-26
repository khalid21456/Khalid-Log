#!/usr/bin/env node
/**
 * Generate the placeholder images the sample posts reference.
 *
 *   npm run make-placeholders
 *
 * These are real PNGs, written by a minimal encoder below (signature + IHDR +
 * deflated IDAT + IEND, each chunk CRC32'd). Real raster files matter because
 * `lib/images.ts` reads intrinsic dimensions off the header to give next/image
 * correct width/height — an SVG placeholder would have needed
 * `dangerouslyAllowSVG` in next.config.ts instead.
 *
 * Existing files are never overwritten, so replacing one with a real photograph
 * is safe: this script will leave it alone.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBytes = Buffer.from(type, "ascii");

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);

  return Buffer.concat([length, typeBytes, data, crc]);
}

/** 8-bit truecolour RGB, no interlacing. */
function encodePng(width, height, paint) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  // Each scanline is prefixed with its filter type (0 = none).
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0;
    offset += 1;

    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y, width, height);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      offset += 3;
    }
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));

/**
 * A diagonal two-colour gradient with a faint grid and one soft highlight —
 * enough for each placeholder to be visually distinct without pretending to be
 * a photograph.
 */
function gradient(from, to, options = {}) {
  const { grid = 64, highlight = 0.55 } = options;

  return (x, y, width, height) => {
    const t = (x / width) * 0.65 + (y / height) * 0.35;

    // Radial lift, offset from centre so the images do not look symmetrical.
    const dx = x / width - highlight;
    const dy = y / height - 0.42;
    const lift = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2.4) * 26;

    const onGrid = x % grid === 0 || y % grid === 0;
    const gridShift = onGrid ? 12 : 0;

    return [
      clamp(from[0] + (to[0] - from[0]) * t + lift + gridShift),
      clamp(from[1] + (to[1] - from[1]) * t + lift + gridShift),
      clamp(from[2] + (to[2] - from[2]) * t + lift + gridShift),
    ];
  };
}

/**
 * Which files the sample posts expect. Palettes are drawn from the DESIGN.MD
 * badge pastels and surface tones.
 */
const IMAGES = [
  // plain-text-blogging
  ["plain-text-blogging/cover.png", 1600, 900, gradient([17, 17, 17], [90, 92, 106])],
  ["plain-text-blogging/desk.png", 1400, 800, gradient([59, 130, 246], [139, 92, 246])],
  ["plain-text-blogging/folders.png", 1200, 800, gradient([245, 245, 245], [180, 184, 196], { grid: 48 })],
  ["plain-text-blogging/left.png", 900, 700, gradient([251, 146, 60], [236, 72, 153])],
  ["plain-text-blogging/right.png", 900, 700, gradient([52, 211, 153], [59, 130, 246])],

  // typing-python-and-typescript
  ["typing-python-and-typescript/cover.png", 1600, 900, gradient([15, 118, 110], [124, 58, 237])],
  ["typing-python-and-typescript/diagram.png", 1400, 780, gradient([248, 249, 250], [203, 213, 225], { grid: 40 })],

  // design-tokens-in-the-dark (draft)
  ["design-tokens-in-the-dark/cover.png", 1600, 900, gradient([11, 11, 11], [70, 70, 82])],
  ["design-tokens-in-the-dark/light.png", 900, 700, gradient([255, 255, 255], [229, 231, 235], { grid: 36 })],
  ["design-tokens-in-the-dark/dark.png", 900, 700, gradient([11, 11, 11], [42, 42, 42], { grid: 36 })],
];

function main() {
  const root = path.join(process.cwd(), "public", "blog");
  let written = 0;
  let skipped = 0;

  for (const [relative, width, height, paint] of IMAGES) {
    const target = path.join(root, ...relative.split("/"));

    if (fs.existsSync(target)) {
      skipped += 1;
      continue;
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, encodePng(width, height, paint));

    console.log(`  ${relative}  ${width}x${height}`);
    written += 1;
  }

  console.log(
    `\n${written} placeholder${written === 1 ? "" : "s"} written` +
      (skipped > 0 ? `, ${skipped} already present (left alone)` : ""),
  );
}

main();
