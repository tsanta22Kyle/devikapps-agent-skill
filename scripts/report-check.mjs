// Toute valeur de style modifiée doit figurer dans adaptation/<nom>.report.json  [{prop, from, to, token}]
import fs from 'node:fs';
import { chromium, openPage, extractStyles, getState, setGate, toUrl, readJson } from './lib.mjs';
const [refArg, testArg] = process.argv.slice(2);
const st = getState(); if (!st || !refArg || !testArg) { console.log('usage: npm run report-check -- <baseline> <test>'); process.exit(1); }
const report = readJson(`adaptation/${st.name}.report.json`, null);
if (!report) { console.log(`FAIL report : adaptation/${st.name}.report.json introuvable`); setGate(st.name, 'report', false); process.exit(0); }
const tokens = fs.existsSync('tokens.json') ? fs.readFileSync('tokens.json', 'utf8') : '';
const badTokens = report.filter((r) => !tokens.includes(String(r.token).split('.').pop()));
const browser = await chromium.launch();
const get = async (u) => { const p = await openPage(browser, toUrl(u), 1440); const s = await extractStyles(p); await p.context().close(); return s; };
const A = await get(refArg), B = await get(testArg); await browser.close();
if (A.elements.length !== B.elements.length) { console.log('FAIL report : DOM différent (lancer dom-diff)'); setGate(st.name, 'report', false); process.exit(0); }
const IGNORE = new Set(['width', 'height', 'inline-size', 'block-size', 'perspective-origin', 'transform-origin', 'x', 'y']);
const covered = new Set(report.map((r) => `${r.prop}|${r.from}|${r.to}`)); const missing = new Map();
A.elements.forEach((ea, i) => { const eb = B.elements[i];
  for (const sec of ['styles', '::before', '::after']) { const sa = ea[sec], sb = eb[sec]; if (!sa || !sb) continue;
    for (const p of Object.keys(sa)) { if (IGNORE.has(p) || sa[p] === sb[p]) continue;
      const k = `${p}|${sa[p]}|${sb[p]}`; if (!covered.has(k)) missing.set(k, (missing.get(k) || 0) + 1); } } });
const pass = missing.size === 0 && badTokens.length === 0; setGate(st.name, 'report', pass, { missing: missing.size });
console.log(`${pass ? 'PASS' : 'FAIL'} report-check ${missing.size} valeurs modifiées hors rapport, ${badTokens.length} tokens inconnus`);
[...missing].slice(0, 12).forEach(([k, n]) => console.log(`  ${k.replaceAll('|', ' | ')} (x${n})`));
