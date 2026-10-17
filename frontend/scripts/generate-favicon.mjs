import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicDir = path.join(root, "public");
const appDir = path.join(root, "src", "app");

mkdirSync(publicDir, { recursive: true });
mkdirSync(appDir, { recursive: true });

// 1. Generate 32x32 32-bit RGBA BMP-ICO
const width = 32, height = 32;
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type 1 = ICO
header.writeUInt16LE(1, 4); // 1 image

const imgSize = 40 + width * height * 4 + (width * height / 8);
const dir = Buffer.alloc(16);
dir.writeUInt8(width, 0);
dir.writeUInt8(height, 1);
dir.writeUInt8(0, 2); // no color palette
dir.writeUInt8(0, 3); // reserved
dir.writeUInt16LE(1, 4); // color planes
dir.writeUInt16LE(32, 6); // bpp
dir.writeUInt32LE(imgSize, 8); // image size
dir.writeUInt32LE(22, 12); // image offset

const bih = Buffer.alloc(40);
bih.writeUInt32LE(40, 0); // biSize
bih.writeInt32LE(width, 4); // biWidth
bih.writeInt32LE(height * 2, 8); // biHeight (XOR + AND mask)
bih.writeUInt16LE(1, 12); // biPlanes
bih.writeUInt16LE(32, 14); // biBitCount
bih.writeUInt32LE(0, 16); // BI_RGB
bih.writeUInt32LE(width * height * 4 + (width * height / 8), 20);

const pixels = Buffer.alloc(width * height * 4);
const cx = 15.5, cy = 15.5;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const row = height - 1 - y; // bottom-up
    const offset = (row * width + x) * 4;
    const dx = x - cx, dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r <= 14) {
      if (r >= 9 && r <= 13) {
        // Luminous mercury ring (#c3dff0)
        pixels[offset] = 240;     // B
        pixels[offset + 1] = 223; // G
        pixels[offset + 2] = 195; // R
        pixels[offset + 3] = 255; // A
      } else if (r <= 3) {
        // Bright silver droplet center
        pixels[offset] = 255;
        pixels[offset + 1] = 255;
        pixels[offset + 2] = 255;
        pixels[offset + 3] = 255;
      } else {
        // Midnight archival basin background (#0b1018)
        pixels[offset] = 24;     // B
        pixels[offset + 1] = 16;  // G
        pixels[offset + 2] = 11;  // R
        pixels[offset + 3] = 255; // A
      }
    } else {
      pixels[offset + 3] = 0; // Transparent outside circle
    }
  }
}

const mask = Buffer.alloc(width * height / 8); // all 0 = opaque
const ico = Buffer.concat([header, dir, bih, pixels, mask]);

writeFileSync(path.join(publicDir, "favicon.ico"), ico);
writeFileSync(path.join(appDir, "favicon.ico"), ico);

// 2. Generate crisp SVG vector asset
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="14" fill="#0b1018"/>
  <circle cx="16" cy="16" r="11" stroke="#c3dff0" stroke-width="2" stroke-opacity="0.9"/>
  <circle cx="16" cy="16" r="2.5" fill="#ffffff" fill-opacity="0.95"/>
</svg>
`;
writeFileSync(path.join(publicDir, "favicon.svg"), svg, "utf8");
console.log("Generated favicon.ico and favicon.svg successfully.");
