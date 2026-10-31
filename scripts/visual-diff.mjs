// Diff pixel sur 11 largeurs (320→1920). Sortie courte : verdict + pires zones. Images sur disque.
import fs from 'node:fs'; import path from 'node:path';
import { PNG } from 'pngjs'; import pixelmatch from 'pixelmatch';
import { chromium, dir, openPage, getState, setGate, toUrl, WIDTHS } from './lib.mjs';
const [phase, refArg, testArg, thr = '0.1'] = process.argv.slice(2);
const st = getState(); if (!st || !phase) { console.log('usage: npm run visual-diff -- <clone|compo|adapt> [ref] [test] [seuil%]'); process.exit(1); }
const name = st.name;
const ref = toUrl(refArg ?? st.url); const test = toUrl(testArg ?? path.join('clones', name, 'mirror.mhtml'));
const d = dir(name, phase); const browser = await chromium.launch(); const res = [];
for (const w of WIDTHS) {
  const f = {};
  for (const [k, u] of [['ref', ref], ['test', test]]) {
    const page = await openPage(browser, u, w); f[k] = path.join(d, `${k}-${w}.png`);
    await page.screenshot({ path: f[k], fullPage: true }); await page.context().close();
  }
  const a = PNG.sync.read(fs.readFileSync(f.ref)), b = PNG.sync.read(fs.readFileSync(f.test));
  const W = Math.max(a.width, b.width), H = Math.max(a.height, b.height);
  const pad = (img) => { const o = new PNG({ width: W, height: H }); o.data.fill(255); PNG.bitblt(img, o, 0, 0, img.width, img.height, 0, 0); return o; };
  const A = pad(a), B = pad(b), D = new PNG({ width: W, height: H });
  const n = pixelmatch(A.data, B.data, D.data, W, H, { threshold: 0.1 });
  const bands = new Array(10).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4;
    if (D.data[i] === 255 && D.data[i + 1] === 0 && D.data[i + 2] === 0) bands[Math.min(9, Math.floor((y / H) * 10))]++; }
  fs.writeFileSync(path.join(d, `diff-${w}.png`), PNG.sync.write(D));
  res.push({ w, pct: +((n / (W * H)) * 100).toFixed(3), hRef: a.height, hTest: b.height, bands });
}
await browser.close();
const worst = [...res].sort((x, y) => y.pct - x.pct); const max = worst[0].pct; const pass = max <= parseFloat(thr);
setGate(name, `${phase}-visual`, pass, { max, thr });
console.log(`${pass ? 'PASS' : 'FAIL'} visual-diff[${phase}] max=${max}% seuil=${thr}%`);
for (const r of worst.slice(0, 5).filter((r) => r.pct > 0)) {
  const bi = r.bands.indexOf(Math.max(...r.bands));
  console.log(`  ${r.w}px: ${r.pct}% | zone ${bi * 10}-${bi * 10 + 10}% de la hauteur | hauteur ref ${r.hRef} vs test ${r.hTest}`);
}
console.log(`Images : .design-pack/${name}/${phase}/diff-<largeur>.png (ne regarder que la zone en écart, recadrée)`);
