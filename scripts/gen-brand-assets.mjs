import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...x) => join(root, ...x);

const COIN = p("public/brand/coin-heads.webp");
const LOGO = p("public/brand/logo.webp");

/* ---------- OpenGraph image (1200x630) ---------- */
const ogSvg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0b10"/>
      <stop offset="55%" stop-color="#121214"/>
      <stop offset="100%" stop-color="#0a0a0d"/>
    </linearGradient>
    <radialGradient id="glowPink" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f80498" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="#f80498" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#f80498" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#268df4" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#268df4" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="930" cy="300" r="360" fill="url(#glowPink)"/>
  <circle cx="180" cy="540" r="320" fill="url(#glowBlue)"/>

  <!-- subtle top hairline -->
  <rect x="0" y="0" width="1200" height="2" fill="#ffffff" opacity="0.06"/>

  <text x="84" y="318" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="#f4f4f7">Verifiable coin-flip casino</text>
  <text x="84" y="372" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="#9aa0ad">on Solana <tspan fill="#ff49b8">Devnet</tspan>.</text>

  <!-- pill -->
  <rect x="86" y="424" width="430" height="52" rx="26" fill="#f80498" fill-opacity="0.08" stroke="#f80498" stroke-opacity="0.55"/>
  <circle cx="116" cy="450" r="5" fill="#ff49b8"/>
  <text x="134" y="457" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" letter-spacing="1.5" fill="#ffafe0">SOLANA DEVNET · TESTNET ONLY</text>

  <text x="84" y="548" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="500" fill="#6c7280">Provably fair · every flip verifiable on-chain</text>
</svg>`;

async function og() {
  const coin = await sharp(COIN).resize(460, 460, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const logo = await sharp(LOGO).resize({ width: 440 }).toBuffer();
  await sharp(Buffer.from(ogSvg))
    .composite([
      { input: coin, left: 700, top: 90 },
      { input: logo, left: 80, top: 150 },
    ])
    .png()
    .toFile(p("src/app/opengraph-image.png"));
  console.log("wrote src/app/opengraph-image.png");
}

/* ---------- Favicon icon.png (256x256, rounded dark tile + coin) ---------- */
const iconSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a20"/>
      <stop offset="100%" stop-color="#0c0c10"/>
    </linearGradient>
    <radialGradient id="g" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="#f80498" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#f80498" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#t)"/>
  <rect x="1.5" y="1.5" width="${size - 3}" height="${size - 3}" rx="${Math.round(size * 0.21)}" fill="none" stroke="#f80498" stroke-opacity="0.45" stroke-width="3"/>
  <circle cx="${size / 2}" cy="${size * 0.46}" r="${size * 0.4}" fill="url(#g)"/>
</svg>`;

async function icon(size, file, coinScale) {
  const cs = Math.round(size * coinScale);
  const coin = await sharp(COIN).resize(cs, cs, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const off = Math.round((size - cs) / 2);
  await sharp(Buffer.from(iconSvg(size)))
    .composite([{ input: coin, left: off, top: off }])
    .png()
    .toFile(p("src/app", file));
  console.log("wrote src/app/" + file);
}

await og();
await icon(256, "icon.png", 0.74);
await icon(180, "apple-icon.png", 0.72);
console.log("done");
