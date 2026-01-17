const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const generateSVG = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#000000" rx="${size * 0.15}"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.45}" font-weight="bold">H</text>
</svg>`;

const iconsDir = path.join(__dirname, "../public/icons");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  for (const size of sizes) {
    const svg = Buffer.from(generateSVG(size));
    const filename = `icon-${size}x${size}.png`;
    
    await sharp(svg)
      .png()
      .toFile(path.join(iconsDir, filename));
    
    console.log(`Generated ${filename}`);
  }
  
  console.log("\nAll icons generated successfully!");
}

generateIcons().catch(console.error);
