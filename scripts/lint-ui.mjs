// Linter anti-AI : refus mécanique des réflexes (pilules, eyebrow, ombre+bordure, Card dans Card, texte non fourni).
import fs from 'node:fs'; import path from 'node:path';
import { getState, setGate } from './lib.mjs';
const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['src'];
const files = []; const walk = (p) => { if (!fs.existsSync(p)) return; const s = fs.statSync(p);
  if (s.isDirectory()) { for (const f of fs.readdirSync(p)) if (f !== 'node_modules') walk(path.join(p, f)); }
  else if (/\.(tsx|jsx|html|css)$/.test(p)) files.push(p); };
roots.forEach(walk);
const allow = fs.existsSync('content.allowlist.txt') ? fs.readFileSync('content.allowlist.txt', 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : null;
const issues = []; const add = (f, l, m) => issues.push(`${f}:${l} ${m}`);
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8'); const lineOf = (i) => src.slice(0, i).split('\n').length; let m;
  const re = /(?:className|class)=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g;
  while ((m = re.exec(src))) {
    const c = m[1] ?? m[2] ?? m[3] ?? ''; const t = c.split(/\s+/).map((x) => x.replace(/^[a-z0-9-]+:/, '')); const has = (r) => t.some((x) => r.test(x)); const L = lineOf(m.index);
    const round = has(/^rounded-full$/);
    if (round && has(/^border(-\d+)?$/)) add(f, L, 'pilule : rounded-full + border');
    if (has(/^uppercase$/) && has(/^tracking-(wide|wider|widest|\[.*\])$/)) add(f, L, 'eyebrow : uppercase + tracking');
    if (has(/^border(-\d+)?$/) && has(/^shadow(-(sm|md|lg|xl|2xl|inner))?$/)) add(f, L, 'bordure + ombre sur le même élément');
    if (round && has(/^(w|h|size)-(1|1\.5|2|2\.5)$/)) add(f, L, 'point de statut (●)');
    if (/\[(#[0-9a-fA-F]{3,8}|-?\d*\.?\d+(px|rem|em))\]/.test(c)) add(f, L, 'valeur arbitraire hors tokens');
  }
  let depth = 0; const cr = /<(\/?)Card\b[^>]*?(\/?)>/g;
  while ((m = cr.exec(src))) { if (m[1]) depth--; else if (!m[2]) { depth++; if (depth > 1) add(f, lineOf(m.index), 'Card dans Card'); } }
  if (f.endsWith('.css')) src.split('\n').forEach((ln, i) => { if (/#[0-9a-fA-F]{3,8}\b/.test(ln) && !/^\s*--/.test(ln)) add(f, i + 1, 'couleur brute hors variable de token'); });
  if (allow && /\.(tsx|jsx|html)$/.test(f)) { const tr = />\s*([^<>{}\n][^<>{}]*?)\s*</g;
    while ((m = tr.exec(src))) { const s = m[1].trim(); if (s && !allow.some((a) => a.includes(s) || s.includes(a))) add(f, lineOf(m.index), `texte non fourni : "${s.slice(0, 40)}"`); } }
}
const pass = issues.length === 0; const st = getState(); if (st) setGate(st.name, 'lint-ui', pass, { issues: issues.length });
console.log(`${pass ? 'PASS' : 'FAIL'} lint-ui ${files.length} fichiers, ${issues.length} problèmes`); issues.slice(0, 15).forEach((i) => console.log('  ' + i));
