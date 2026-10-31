// L'arbre DOM doit rester identique à la baseline : aucun élément ajouté/supprimé (tue badges et cards parasites).
import { chromium, openPage, getState, setGate, toUrl } from './lib.mjs';
const [refArg, testArg] = process.argv.slice(2);
const st = getState(); if (!st || !refArg || !testArg) { console.log('usage: npm run dom-diff -- <baseline> <test>'); process.exit(1); }
const browser = await chromium.launch();
const sig = async (u) => { const p = await openPage(browser, toUrl(u), 1440);
  const s = await p.evaluate(() => [...document.body.querySelectorAll('*')].filter((e) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META'].includes(e.tagName)).map((e) => e.tagName.toLowerCase()));
  await p.context().close(); return s; };
const a = await sig(refArg), b = await sig(testArg); await browser.close();
const ca = {}, cb = {}; a.forEach((t) => (ca[t] = (ca[t] || 0) + 1)); b.forEach((t) => (cb[t] = (cb[t] || 0) + 1));
const diffs = [...new Set([...Object.keys(ca), ...Object.keys(cb)])].filter((t) => (ca[t] || 0) !== (cb[t] || 0)).map((t) => `<${t}> ${ca[t] || 0} → ${cb[t] || 0}`);
let first = -1; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { first = i; break; }
const pass = diffs.length === 0 && first === -1; setGate(st.name, 'dom', pass, { diffs: diffs.length });
console.log(`${pass ? 'PASS' : 'FAIL'} dom-diff ${a.length} → ${b.length} éléments`);
if (!pass) { console.log('  ' + diffs.slice(0, 10).join(' | ')); if (first >= 0) console.log(`  1re divergence à l'index ${first}: ${a[first]} vs ${b[first]}`); }
