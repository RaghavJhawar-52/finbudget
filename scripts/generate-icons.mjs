/**
 * Regenerates all PWA PNG icons from public/icons/icon.svg using sharp.
 * Run once: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, "..");
const svgPath   = join(root, "public", "icons", "icon.svg");
const svgBuffer = readFileSync(svgPath);

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

for (const size of sizes) {
  const out = join(root, "public", "icons", `icon-${size}x${size}.png`);
  await sharp(svgBuffer)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`✓ icon-${size}x${size}.png`);
}

// apple-touch-icon (180x180) goes in public root — Safari uses this
const appleOut = join(root, "public", "apple-touch-icon.png");
await sharp(svgBuffer)
  .resize(180, 180)
  .png({ compressionLevel: 9 })
  .toFile(appleOut);
console.log("✓ apple-touch-icon.png");

console.log("\nAll icons generated successfully.");
