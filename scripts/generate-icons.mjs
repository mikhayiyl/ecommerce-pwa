// Generates PWA icons from scripts/icon.svg. Run: node scripts/generate-icons.mjs
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const src = fileURLToPath(new URL("./icon.svg", import.meta.url));
const out = fileURLToPath(new URL("../public/icons/", import.meta.url));
await mkdir(out, { recursive: true });

const targets = [
  ["icon-192.png", 192, 0],
  ["icon-512.png", 512, 0],
  ["apple-touch-icon.png", 180, 0],
  // Maskable icons need a safe zone, so the artwork is shrunk onto a solid background.
  ["icon-maskable-512.png", 512, 0.2],
];

for (const [name, size, padding] of targets) {
  const inner = Math.round(size * (1 - padding * 2));
  const art = await sharp(src).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#0a1628" } })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toFile(out + name);
}
console.log("icons generated");
