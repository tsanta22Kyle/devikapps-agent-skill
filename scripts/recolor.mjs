// Recolore un SVG ou un PNG de façon déterministe (pas de réinterprétation).
//   --to #hex      aligne la teinte dominante sur cette couleur (garde les nuances : dégradés, clairs/foncés)
//   --map "#a=#b,#c=#d"  remplacement exact de couleurs (SVG)
//   --hue 40 --sat 1.1 --light -0.05   décalages manuels (teinte en degrés, saturation x, luminosité +/-)
import fs from 'node:fs'; import path from 'node:path';
const a = process.argv.slice(2); const [inp, out] = a; const opt = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : undefined; };
if (!inp || !out) { console.log('usage: npm run recolor -- <in.svg|png> <out> [--to #hex | --map "#a=#b" | --hue N --sat K --light D]'); process.exit(1); }
const hex2 = (h) => { h = h.replace('#', ''); if (h.length <= 4) h = [...h].map((c) => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1]; };
const toHsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; };
const toRgb = ([h, s, l]) => { h = ((h % 360) + 360) % 360 / 360; if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255)); };
const parse = (c) => { c = c.trim().toLowerCase(); if (c[0] === '#') return hex2(c); const m = c.match(/^rgba?\(([^)]*)\)/); if (!m) return null;
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map((x) => (x.endsWith('%') ? parseFloat(x) * 2.55 : parseFloat(x))); return [p[0], p[1], p[2], p[3] ?? 1]; };
const fmt = ([r, g, b, al], orig) => { const x = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  if (orig.startsWith('rgb')) return al < 1 ? `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${+al.toFixed(3)})` : `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  return '#' + x(r) + x(g) + x(b) + (al < 1 ? x(al * 255) : ''); };
// teinte dominante = moyenne circulaire pondérée par la saturation (gris/blanc/noir ignorés)
const dominant = (list) => { let X = 0, Y = 0, W = 0; for (const [c, w] of list) { const [h, s] = toHsl(c); if (s < 0.15) continue; const k = s * w; X += Math.cos((h * Math.PI) / 180) * k; Y += Math.sin((h * Math.PI) / 180) * k; W += k; }
  return W ? ((Math.atan2(Y, X) * 180) / Math.PI + 360) % 360 : null; };
const to = opt('to'), map = opt('map'); let dh = parseFloat(opt('hue') ?? '0'); const sat = parseFloat(opt('sat') ?? '1'), light = parseFloat(opt('light') ?? '0');
const shift = (rgba) => { const [h, s, l] = toHsl(rgba); const [r, g, b] = toRgb([h + dh, Math.min(1, s * sat), Math.max(0, Math.min(1, l + light))]); return [r, g, b, rgba[3]]; };
const ext = path.extname(inp).toLowerCase();
if (ext === '.svg') {
  let svg = fs.readFileSync(inp, 'utf8'); const re = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\([^)]*\)/g; const found = [...svg.matchAll(re)].map((m) => m[0]);
  if (map) { const pairs = map.split(',').map((p) => p.split('=').map((x) => x.trim().toLowerCase())); let n = 0;
    svg = svg.replace(re, (c) => { const k = fmt(parse(c) ?? [0, 0, 0, 1], '#'); const hit = pairs.find(([from]) => fmt(parse(from), '#') === k); if (hit) { n++; return hit[1]; } return c; }); console.log(`${n} couleurs remplacées (map)`); }
  else { if (to) { const d = dominant(found.map((c) => [parse(c), 1]).filter(([p]) => p)); if (d === null) { console.log('Aucune couleur saturée trouvée : utilise --map'); process.exit(2); } dh = toHsl(hex2(to))[0] - d; }
    let n = 0; svg = svg.replace(re, (c) => { const p = parse(c); if (!p) return c; n++; return fmt(shift(p), c); }); console.log(`${n} couleurs décalées (teinte ${dh >= 0 ? '+' : ''}${Math.round(dh)}°)`); }
  const named = [...svg.matchAll(/(?:fill|stroke|stop-color)\s*[:=]\s*["']?([a-z]+)/gi)].map((m) => m[1].toLowerCase()).filter((v) => !['none', 'currentcolor', 'url', 'transparent', 'inherit', 'rgb', 'rgba', 'hsl', 'hsla'].includes(v));
  if (named.length) console.log(`! couleurs nommées non traitées : ${[...new Set(named)].join(', ')} (remplace-les par des hex dans l'original)`);
  fs.writeFileSync(out, svg);
} else if (ext === '.png') {
  const { PNG } = await import('pngjs'); const img = PNG.sync.read(fs.readFileSync(inp)); const d = img.data;
  if (to) { const list = []; for (let i = 0; i < d.length; i += 4 * 7) if (d[i + 3] > 40) list.push([[d[i], d[i + 1], d[i + 2]], d[i + 3] / 255]); const dm = dominant(list);
    if (dm === null) { console.log('Image sans couleur saturée'); process.exit(2); } dh = toHsl(hex2(to))[0] - dm; }
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const [r, g, b] = shift([d[i], d[i + 1], d[i + 2], 1]); d[i] = r; d[i + 1] = g; d[i + 2] = b; }
  fs.writeFileSync(out, PNG.sync.write(img)); console.log(`PNG recoloré (teinte ${dh >= 0 ? '+' : ''}${Math.round(dh)}°)`);
} else { console.log(`Format ${ext} non supporté : convertis en PNG, ou refais l'élément en SVG (skill asset-variants).`); process.exit(2); }
console.log('→ ' + out);
