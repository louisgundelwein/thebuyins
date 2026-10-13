import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const inputDir = process.env.MARKETING_SCREENSHOTS || path.resolve(root, '../screenshots/ios-6.9');
const W = 1320, H = 2868;
const formats = { ios: W, play: 1613 };
const copy = JSON.parse(await readFile(path.join(root, 'copy.json'), 'utf8'));
const features = [
  { key: 'live', filename: '02-live-table.png' },
  { key: 'seats', filename: '03-seat-draw.png' },
  { key: 'settlement', filename: '04-result.png' },
  { key: 'overview', filename: '01-overview.png' },
  { key: 'history', filename: '05-history-leaderboard.png' },
];
const COUNT = features.length;
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--lang' || !Object.hasOwn(copy, args[1]))) {
  throw new Error('Usage: node store/marketing/render.mjs [--lang de|en]');
}
const languages = args.length ? [args[1]] : Object.keys(copy);
const exists = filename => access(filename).then(() => true, () => false);
const escapeHTML = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const spadePath = 'M50 6 C50 6 92 38 92 60 C92 77 73 85 58 74 C60 85 64 92 71 96 L29 96 C36 92 40 85 42 74 C27 85 8 77 8 60 C8 38 50 6 50 6 Z';

// Read captures fresh on each run. The old flat directory is German,
// including when used as a fallback for missing English captures.
async function loadInputs(lang) {
  return Promise.all(features.map(async feature => {
    const candidates = [
      { path: path.join(inputDir, lang, feature.filename), language: lang },
      ...(lang === 'de' ? [] : [{ path: path.join(inputDir, 'de', feature.filename), language: 'de' }]),
      { path: path.join(inputDir, feature.filename), language: 'de' },
    ];
    let source;
    for (const candidate of candidates) {
      if (await exists(candidate.path)) { source = candidate; break; }
    }
    if (!source) throw new Error(`${lang}: missing ${feature.filename} in ${inputDir}. Capture the real app screen, then rerun.`);
    const bytes = await readFile(source.path);
    const meta = await sharp(bytes).metadata();
    if (meta.width !== W || meta.height !== H) throw new Error(`${source.path}: expected ${W}x${H}, got ${meta.width}x${meta.height}`);
    const fallback = source.language !== lang;
    if (fallback) console.warn(`WARNING [${lang}]: ${feature.filename} is missing in ${path.join(inputDir, lang)}; using German capture ${source.path}.`);
    const content = copy[lang].frames[feature.key];
    if (lang === 'en' && content.title.join(' ').split(/\s+/).length > 4) throw new Error(`${feature.key}: English headline exceeds four words.`);
    return { ...feature, ...content, sourcePath: source.path, sourceLanguage: source.language, fallback,
      sha256: createHash('sha256').update(bytes).digest('hex'), src: `data:image/png;base64,${bytes.toString('base64')}` };
  }));
}

function chip(size, x, y, rotation = 0, opacity = 1) {
  const id = `chip-${x}-${y}`;
  const notches = Array.from({ length: 8 }, (_, i) => `<rect x="482" y="176" width="60" height="60" rx="10" fill="#0c0b12" transform="rotate(${i * 45} 512 512)"/>`).join('');
  // Include the ring's stroke in conservative collision checks.
  return `<svg class="chip" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;opacity:${opacity};transform:rotate(${rotation}deg)" viewBox="0 0 1024 1024"><defs><linearGradient id="${id}" x2="1" y2="1"><stop stop-color="#a78bfa"/><stop offset="1" stop-color="#5eead4"/></linearGradient></defs><rect class="chip-bounds" x="174" y="174" width="676" height="676" fill="none"/><circle cx="512" cy="512" r="310" fill="none" stroke="url(#${id})" stroke-width="56"/>${notches}<circle cx="512" cy="512" r="215" fill="url(#${id})"/><path d="${spadePath}" fill="#0c0b12" transform="translate(512 512) scale(2.7) translate(-50 -51)"/></svg>`;
}

function phone(screen, x, y, width, ry, rz) {
  const height = (width - 36) * H / W + 36;
  // Original PNG bytes; only device CSS changes their presentation.
  return `<div class="phone" style="left:${x}px;top:${y}px;width:${width}px;height:${height}px;transform:perspective(5000px) rotateX(4deg) rotateY(${ry}deg) rotateZ(${rz}deg)"><div class="side-button one"></div><div class="side-button two"></div><div class="screen"><img src="${screen.src}" alt="${escapeHTML(screen.label)}"></div></div>`;
}

function createHTML(lang, screens, icon, frameWidth) {
  // Play adds 57px on each side; device and type scale stay identical to iOS.
  const inset = (frameWidth - W) / 2;
  const panoramaWidth = frameWidth * COUNT;
  let shapes = '<div class="ribbon"></div>';
  let devices = '';
  screens.forEach((screen, i) => {
    const offset = i * frameWidth + inset;
    shapes += chip(1120, offset + 720, 730, i % 2 ? 16 : -12, .19);
    devices += phone(screen, offset + 205 + (i % 2 ? 50 : 0), 1110, 1010, i % 2 ? 16 : -14, i % 2 ? 9 : -9);
  });
  // Bright chips still cross frame edges, with air below the sublines.
  shapes += chip(385, frameWidth - 110, 940, 20, .85) + chip(325, frameWidth * 3 - 110, 940, -18, .85);
  const text = screens.map((screen, i) => `<div class="copy copy-${i}" style="left:${i * frameWidth + inset + 100}px"><div class="brand"><img src="${icon}" alt="">THE BUY-INS</div><h1 class="headline">${screen.title.map(line => `<span>${escapeHTML(line)}</span>`).join('')}</h1><div class="sub">${escapeHTML(screen.sub)}</div></div>`).join('');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>The Buy-Ins · ${lang} · C</title><style>
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#0c0b12}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
.canvas{width:${panoramaWidth}px;height:${H}px;position:relative;overflow:hidden;background:#0c0b12;isolation:isolate}
.backdrop{position:absolute;inset:0;background:linear-gradient(130deg,#17122a,#0c0b12 45%,#17122a)}
.copy{position:absolute;width:1120px;top:285px;z-index:20}.brand{display:flex;align-items:center;gap:22px;font-size:29px;letter-spacing:3px;font-weight:650;color:#fff}.brand img{width:68px;height:68px;border-radius:18px}
.headline{margin:60px 0 28px;font-size:152px;font-weight:800;line-height:1.02;letter-spacing:-8px}.headline span{display:block;white-space:nowrap;width:max-content}.copy-4 .headline{font-size:130px;letter-spacing:-6px}.sub{font-size:39px;font-weight:450;letter-spacing:-1px;line-height:1.25;color:#ddd9eb;width:max-content}
.phone{position:absolute;padding:18px;border-radius:142px;background:linear-gradient(115deg,#b8b8c5 0%,#35333e 10%,#08080c 22%,#121219 70%,#6e6a7b 99%);box-shadow:inset 0 0 0 3px #898592,inset 0 0 0 9px #17171d,18px 23px 0 #050509,20px 25px 0 3px #555160,45px 75px 80px #0009,90px 130px 140px #0006;z-index:8;transform-style:preserve-3d}
.screen{width:100%;height:100%;position:relative;overflow:hidden;border-radius:124px;background:#0c0b12;box-shadow:0 0 0 3px #000}.screen img{display:block;width:100%;height:100%}.side-button{position:absolute;width:9px;left:-6px;border-radius:8px;background:linear-gradient(#8c8798,#302d36);box-shadow:-2px 0 0 #111}.side-button.one{height:100px;top:340px}.side-button.two{height:170px;top:490px}
.chip{position:absolute;z-index:3;pointer-events:none}.ribbon{position:absolute;top:1400px;left:-300px;width:${panoramaWidth + 800}px;height:370px;background:#a78bfa;transform:rotate(-6deg);opacity:.16;z-index:1}
</style></head><body><main class="canvas"><div class="backdrop"></div>${shapes}${devices}${text}</main></body></html>`;
}

// Check rendered copy and transformed art for each locale and format.
async function checkLayout(page, frameWidth) {
  return page.evaluate(({ frameWidth, count }) => {
    const rect = element => element.getBoundingClientRect();
    const hazards = [...document.querySelectorAll('.phone, .chip-bounds')].map(rect);
    const errors = [];
    let minimumGap = Infinity;
    document.querySelectorAll('.copy').forEach((element, index) => {
      const frameLeft = index * frameWidth;
      element.querySelectorAll('.brand, .headline span, .sub').forEach(part => {
        const box = rect(part);
        if (box.left < frameLeft + 64 || box.right > frameLeft + frameWidth - 64) errors.push(`frame ${index + 1}: copy crosses safe margin`);
        hazards.forEach(hazard => {
          if (box.right <= hazard.left || box.left >= hazard.right) return;
          const gap = Math.max(hazard.top - box.bottom, box.top - hazard.bottom);
          minimumGap = Math.min(minimumGap, gap);
          if (gap < 24) errors.push(`frame ${index + 1}: ${part.className || part.tagName} is too close to artwork (${Math.round(gap)}px)`);
        });
      });
    });
    if (document.querySelectorAll('.phone').length !== count) errors.push('Wrong phone count');
    return { errors, minimumTextArtGap: Math.round(minimumGap) };
  }, { frameWidth, count: COUNT });
}

function galleryHTML(renderedLanguages) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Buy-Ins · C</title><style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#0c0b12;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif}main{max-width:1600px;margin:auto}h1{font-size:28px;margin:0 0 30px}section{margin-bottom:40px}h2{font-size:20px}p{color:#fff}img{width:100%;height:auto;display:block;border-radius:16px}a{color:#a78bfa;text-decoration:none}nav{display:flex;gap:20px;margin-top:16px;flex-wrap:wrap}details{margin-top:20px}summary{cursor:pointer;color:#5eead4}@media(max-width:600px){body{padding:16px}}</style></head><body><main><h1>The Buy-Ins · C</h1>${renderedLanguages.map(lang => `<section><h2>${escapeHTML(copy[lang].languageName)}</h2><p>${escapeHTML(copy[lang].preview.dimensions)}</p><a href="out/${lang}/panorama.png"><img src="out/${lang}/panorama.png" alt="${escapeHTML(copy[lang].preview.panorama)}"></a><nav><a href="out/${lang}/ios/source.html">iOS</a><a href="out/${lang}/play/source.html">Google Play</a>${features.map((_, i) => `<a href="out/${lang}/ios/0${i + 1}.png">0${i + 1}</a>`).join('')}</nav><details><summary>Google Play</summary><img src="out/${lang}/play/panorama.png" alt="${escapeHTML(copy[lang].preview.panorama)}"></details></section>`).join('')}</main></body></html>`;
}

async function findBrowser() {
  const candidates = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  throw new Error('Chrome not found. Set CHROME_PATH to a Chromium/Chrome executable.');
}

async function render() {
  const inputs = new Map();
  for (const lang of languages) inputs.set(lang, await loadInputs(lang));
  const icon = `data:image/png;base64,${(await readFile(path.resolve(root, '../../apps/app/assets/images/icon.png'))).toString('base64')}`;
  const browser = await chromium.launch({ executablePath: await findBrowser(), headless: true });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    for (const [lang, screens] of inputs) {
      const outputs = {};
      for (const [format, frameWidth] of Object.entries(formats)) {
        const outDir = path.join(root, 'out', lang, format);
        await mkdir(outDir, { recursive: true });
        const html = createHTML(lang, screens, icon, frameWidth);
        await page.setViewportSize({ width: frameWidth * COUNT, height: H });
        await page.setContent(html, { waitUntil: 'load' });
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
        const layout = await checkLayout(page, frameWidth);
        if (layout.errors.length) throw new Error(`${lang}/${format}: ${layout.errors.join('; ')}`);
        const panorama = await page.screenshot({ type: 'png', animations: 'disabled' });
        await writeFile(path.join(outDir, 'source.html'), html);
        await writeFile(path.join(outDir, 'panorama-full.png'), panorama);
        for (let i = 0; i < COUNT; i++) await sharp(panorama).extract({ left: i * frameWidth, top: 0, width: frameWidth, height: H }).png().toFile(path.join(outDir, `0${i + 1}.png`));
        const preview = await sharp(panorama).resize({ width: 3000 }).png().toBuffer();
        await writeFile(path.join(outDir, 'panorama.png'), preview);
        if (format === 'ios') await writeFile(path.join(root, 'out', lang, 'panorama.png'), preview);
        outputs[format] = { width: frameWidth, height: H, ...layout };
        console.log(`${lang}/${format}: 5 frames at ${frameWidth}x${H}, panorama 3000px; text/art gap ≥ ${layout.minimumTextArtGap}px`);
      }
      await writeFile(path.join(root, 'out', lang, 'manifest.json'), JSON.stringify({ renderedAt: new Date().toISOString(), direction: 'C', language: lang, inputDir, outputs, screens: screens.map(({ src, ...screen }) => screen) }, null, 2) + '\n');
    }
  } finally { await browser.close(); }
  const renderedLanguages = [];
  for (const lang of Object.keys(copy)) if (await exists(path.join(root, 'out', lang, 'panorama.png'))) renderedLanguages.push(lang);
  await writeFile(path.join(root, 'index.html'), galleryHTML(renderedLanguages));
}

await render();
