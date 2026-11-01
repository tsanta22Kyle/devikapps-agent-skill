// Compare deux éléments graphiques (SVG/PNG) rendus à la même taille. Sert de preuve pour un élément regénéré en SVG.
import fs from 'node:fs'; import path from 'node:path'; import { PNG } from 'pngjs'; import pixelmatch from 'pixelmatch';
import { chromium } from './lib.mjs';
const [fa, fb, thr = '2'] = process.argv.slice(2); if (!fa || !fb) { console.log('usage: npm run asset-diff -- <original> <version> [seuil%]'); process.exit(1); }
const mime = (f) => ({ '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.gif': 'image/gif' }[path.extname(f).toLowerCase()] || 'application/octet-stream');
const browser = await chromium.launch(); const S = 256;
const shot = async (f) => { const p = await browser.newPage({ viewport: { width: S, height: S } });
  await p.setContent(`<body style="margin:0;background:#fff"><img style="width:${S}px;height:${S}px;object-fit:contain" src="data:${mime(f)};base64,${fs.readFileSync(f).toString('base64')}">`); await p.waitForTimeout(200);
  const b = await p.screenshot(); await p.close(); return PNG.sync.read(b); };
const A = await shot(fa), B = await shot(fb); await browser.close();
const n = pixelmatch(A.data, B.data, null, S, S, { threshold: 0.15 }); const pct = +((n / (S * S)) * 100).toFixed(2);
console.log(`${pct <= parseFloat(thr) ? 'PASS' : 'FAIL'} asset-diff ${pct}% (seuil ${thr}%)`);
