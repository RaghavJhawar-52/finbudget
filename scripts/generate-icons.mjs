/**
 * Regenerates all PWA + Apple touch icons from SVG sources using sharp.
 * Run once: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, "..");
const iconsDir  = join(root, "public", "icons");
const publicDir = join(root, "public");

// ── Android / PWA icons (from icons/icon.svg — has rounded corners for splash) ──
const androidSvg = readFileSync(join(iconsDir, "icon.svg"));
const androidSizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

for (const size of androidSizes) {
  await sharp(androidSvg)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(iconsDir, `icon-${size}x${size}.png`));
  console.log(`✓ icons/icon-${size}x${size}.png`);
}

// ── Apple touch icons (from apple-touch-icon-source.svg — full-bleed, no rx) ──
// iOS applies its own squircle mask, so the source must be a plain square.
const appleSvg = readFileSync(join(iconsDir, "apple-touch-icon-source.svg"));
const appleSizes = [
  { size: 120, name: "apple-touch-icon-120x120.png" },  // iPhone non-retina
  { size: 152, name: "apple-touch-icon-152x152.png" },  // iPad non-retina
  { size: 167, name: "apple-touch-icon-167x167.png" },  // iPad Pro
  { size: 180, name: "apple-touch-icon-180x180.png" },  // iPhone retina (primary)
];

for (const { size, name } of appleSizes) {
  await sharp(appleSvg)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(iconsDir, name));
  console.log(`✓ icons/${name}`);
}

// Copy 180x180 to public root — fallback for browsers that look there by convention
await sharp(appleSvg)
  .resize(180, 180)
  .png({ compressionLevel: 9 })
  .toFile(join(publicDir, "apple-touch-icon.png"));
console.log("✓ apple-touch-icon.png  (public root — Safari fallback)");

console.log("\nAll icons generated successfully.");
