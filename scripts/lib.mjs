import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
export { chromium };
export const ROOT = process.cwd(); export const DP = '.design-pack';
export const WIDTHS = Array.from({ length: 11 }, (_, i) => 320 + i * 160); // 320 → 1920
export const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
export const writeJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 1)); };
export const dir = (...p) => { const d = path.join(ROOT, DP, ...p); fs.mkdirSync(d, { recursive: true }); return d; };
export const getState = () => readJson(path.join(ROOT, DP, 'state.json'), null);
export const setState = (s) => writeJson(path.join(ROOT, DP, 'state.json'), { ...getState(), ...s });
export const setGate = (name, key, pass, info = {}) => {
  const f = path.join(ROOT, DP, name, 'gates.json'); const g = readJson(f, {});
  g[key] = { pass, info, at: new Date().toISOString() }; writeJson(f, g);
};
export const toUrl = (t) => (/^(https?|file):/.test(t) ? t : 'file://' + path.resolve(t));

export async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((r) => { let y = 0; const t = setInterval(() => {
      window.scrollBy(0, 400); y += 400;
      if (y >= document.body.scrollHeight || y > 30000) { clearInterval(t); window.scrollTo(0, 0); setTimeout(r, 600); }
    }, 120); });
  });
}
// Page déterministe : Math.random figé, scroll complet (déclenche les animations au scroll), networkidle.
export async function openPage(browser, url, w, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => { let s = 42; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await autoScroll(page);
  return page;
}
export async function extractStyles(page) {
  return page.evaluate(() => {
    const pick = (cs) => { const o = {}; for (const p of cs) o[p] = cs.getPropertyValue(p); return o; };
    const pathOf = (el) => { const a = []; while (el && el.nodeType === 1 && el !== document.documentElement) {
      a.unshift(el.tagName.toLowerCase() + ':' + [...el.parentNode.children].indexOf(el)); el = el.parentNode; } return a.join('>'); };
    const skip = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META'];
    const elements = [...document.body.querySelectorAll('*')].filter((e) => !skip.includes(e.tagName)).map((el) => {
      const r = { path: pathOf(el), tag: el.tagName.toLowerCase(), styles: pick(getComputedStyle(el)) };
      for (const ps of ['::before', '::after']) { const c = getComputedStyle(el, ps);
        if (c.content && c.content !== 'none' && c.content !== 'normal') r[ps] = pick(c); }
      return r; });
    const keyframes = [];
    for (const sh of document.styleSheets) { try { for (const rule of sh.cssRules) if (rule.type === 7) keyframes.push(rule.cssText); } catch {} }
    const fonts = [...document.fonts].map((f) => ({ family: f.family, weight: f.weight, style: f.style, status: f.status }));
    return { elements, keyframes, fonts };
  });
}
