// États forcés via CDP (hover / focus / active) sur les 40 premiers éléments interactifs, comparés ref vs test.
import { PNG } from 'pngjs'; import pixelmatch from 'pixelmatch'; import path from 'node:path';
import { chromium, openPage, getState, setGate, toUrl } from './lib.mjs';
const [phase, refArg, testArg] = process.argv.slice(2);
const st = getState(); if (!st || !phase) { console.log('usage: npm run states -- <clone|compo|adapt> [ref] [test]'); process.exit(1); }
const ref = toUrl(refArg ?? st.url); const test = toUrl(testArg ?? path.join('clones', st.name, 'mirror.mhtml'));
const browser = await chromium.launch();
async function grab(url) {
  const page = await openPage(browser, url, 1440); const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'a,button,input,select,textarea,summary,[role=button],[tabindex]' });
  const out = {};
  for (const [i, nodeId] of nodeIds.slice(0, 40).entries()) for (const s of ['hover', 'focus', 'active']) {
    try {
      await cdp.send('DOM.scrollIntoViewIfNeeded', { nodeId }).catch(() => {});
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [s] });
      const { model } = await cdp.send('DOM.getBoxModel', { nodeId }); const q = model.border;
      const clip = { x: Math.max(0, q[0] - 8), y: Math.max(0, q[1] - 8), width: Math.min(600, q[2] - q[0] + 16), height: Math.min(400, q[5] - q[1] + 16) };
      if (clip.width > 0 && clip.height > 0) out[`${i}:${s}`] = PNG.sync.read(await page.screenshot({ clip }));
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
    } catch {}
  }
  await page.context().close(); return out;
}
const A = await grab(ref), B = await grab(test); await browser.close();
const bad = [];
for (const k of Object.keys(A)) { const a = A[k], b = B[k];
  if (!b || a.width !== b.width || a.height !== b.height) { bad.push(`${k} (taille/absent)`); continue; }
  if (pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 }) > 0) bad.push(k); }
const pass = bad.length === 0; setGate(st.name, `${phase}-states`, pass, { checked: Object.keys(A).length, bad: bad.length });
console.log(`${pass ? 'PASS' : 'FAIL'} states[${phase}] ${Object.keys(A).length} états testés, ${bad.length} écarts`);
if (bad.length) console.log('  ' + bad.slice(0, 10).join(', ') + '  (index:état)');
