// Extrait les éléments graphiques d'un site cloné (SVG inline, <img>, background-image) vers clones/<nom>/assets/.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { chromium, openPage, getState, writeJson } from './lib.mjs';
const st = getState(); const name = process.argv[2] || st?.name;
if (!st || !name) { console.log('usage: npm run extract-assets -- <nom>  (après npm run mirror)'); process.exit(1); }
const browser = await chromium.launch(); const page = await openPage(browser, st.url, 1440);
const found = await page.evaluate(() => {
  const out = []; const rect = (e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  document.querySelectorAll('svg').forEach((s) => { if (s.parentElement && s.parentElement.closest('svg')) return;
    const c = s.cloneNode(true); if (!c.getAttribute('xmlns')) c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const o = [s, ...s.querySelectorAll('*')], k = [c, ...c.querySelectorAll('*')];
    o.forEach((el, i) => { if (!(el.hasAttribute('class') || el.hasAttribute('style'))) return; const cs = getComputedStyle(el);   // fige les couleurs venues du CSS
      const props = el.tagName.toLowerCase() === 'stop' ? ['stop-color'] : ['fill', 'stroke'];
      for (const p of props) { const v = cs.getPropertyValue(p); if (v && v !== 'none') k[i].setAttribute(p, v); } });
    out.push({ type: 'svg', ...rect(s), svg: c.outerHTML }); });
  document.querySelectorAll('img').forEach((i) => out.push({ type: 'img', ...rect(i), src: i.currentSrc || i.src }));
  document.querySelectorAll('*').forEach((e) => { const bg = getComputedStyle(e).backgroundImage;
    for (const m of bg.matchAll(/url\("?([^")]+)"?\)/g)) out.push({ type: 'bg', ...rect(e), src: new URL(m[1], document.baseURI).href }); });
  return out;
});
const dir = path.join('clones', name, 'assets'); fs.mkdirSync(dir, { recursive: true });
const colorsOf = (t) => [...new Set((t.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || []).map((c) => c.toLowerCase()))];
const seen = new Set(); const manifest = []; let n = 0;
for (const f of found.slice(0, 400)) {
  try {
    let buf, ext;
    if (f.type === 'svg') { buf = Buffer.from(f.svg); ext = 'svg'; }
    else if (f.src.startsWith('data:')) { const m = f.src.match(/^data:([^;,]+)(;base64)?,(.*)$/s); if (!m) continue; buf = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3])); ext = m[1].includes('svg') ? 'svg' : m[1].split('/')[1] || 'bin'; }
    else { const r = await page.context().request.get(f.src); if (!r.ok()) continue; buf = await r.body(); const ct = r.headers()['content-type'] || ''; ext = ct.includes('svg') ? 'svg' : ct.split('/')[1]?.split(';')[0] || path.extname(new URL(f.src).pathname).slice(1) || 'bin'; }
    const h = crypto.createHash('sha1').update(buf).digest('hex'); if (seen.has(h)) continue; seen.add(h);
    const id = 'a' + String(++n).padStart(3, '0'); const file = path.join(dir, `${id}.${ext}`); fs.writeFileSync(file, buf);
    manifest.push({ id, file, kind: f.type, ext, w: f.w, h: f.h, colors: ext === 'svg' ? colorsOf(buf.toString()) : undefined, src: f.src });
  } catch {}
}
await browser.close(); writeJson(path.join(dir, 'manifest.json'), manifest);
const by = {}; manifest.forEach((m) => (by[m.ext] = (by[m.ext] || 0) + 1));
console.log(`assets OK → ${dir} | ${manifest.length} fichiers ${JSON.stringify(by)}`);
manifest.filter((m) => m.w <= 128 && m.h <= 128 && m.w > 0).slice(0, 10).forEach((m) => console.log(`  ${m.id}.${m.ext} ${m.w}x${m.h}${m.colors ? ' ' + m.colors.slice(0, 4).join(' ') : ''}`));
console.log('Détail : manifest.json (ne pas le relire en entier, cibler un id).');
