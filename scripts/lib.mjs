import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
export { chromium };

export const ROOT = process.cwd();
export const DP = '.design-pack';
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

const SCROLL_LIMIT_PX = 30000;
const SCROLL_STEP_PX = 400;
const SCROLL_DELAY_MS = 120;
const SCROLL_SETTLE_MS = 600;
const NAVIGATION_RECOVERY_MS = 5000;

function isDestroyedExecutionContext(error) {
  return /Execution context was destroyed|Cannot find context with specified id|Frame was detached/i.test(error?.message ?? '');
}

async function evaluateDuringScroll(page, callback, value, recovery) {
  try {
    return await page.evaluate(callback, value);
  } catch (error) {
    if (!isDestroyedExecutionContext(error)) throw error;
    if (recovery.used) {
      throw new Error(`Repeated navigation while scrolling ${page.url()}`, { cause: error });
    }

    recovery.used = true;
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: NAVIGATION_RECOVERY_MS });
      return await page.evaluate(callback, value);
    } catch (retryError) {
      throw new Error(`Could not resume scrolling after navigation at ${page.url()}`, { cause: retryError });
    }
  }
}

export async function autoScroll(page) {
  const recovery = { used: false };
  const evaluate = (callback, value) => evaluateDuringScroll(page, callback, value, recovery);
  const metrics = () => evaluate(() => ({
    height: Math.max(document.body?.scrollHeight ?? 0, document.documentElement?.scrollHeight ?? 0),
    viewport: window.innerHeight,
  }));

  let position = 0;
  let pageMetrics = await metrics();
  while (position < SCROLL_LIMIT_PX && position < pageMetrics.height) {
    await evaluate(y => window.scrollTo(0, y), position);
    await page.waitForTimeout(SCROLL_DELAY_MS);
    pageMetrics = await metrics();

    const maxScroll = Math.max(0, pageMetrics.height - pageMetrics.viewport);
    if (position >= maxScroll) break;
    position = Math.min(position + SCROLL_STEP_PX, maxScroll, SCROLL_LIMIT_PX);
  }

  await evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(SCROLL_SETTLE_MS);
}

// Deterministic page load. Scroll commands run from Node so archived MHTML pages
// do not depend on timers in their sandboxed document.
export async function openPage(browser, url, w, h = 900, options = {}) {
  const { init, noScroll = false, waitUntil = 'networkidle' } = options ?? {};
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => { let s = 42; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; });
  if (init) await ctx.addInitScript(init);

  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil, timeout: 60000 });
  } catch (error) {
    if (error?.name !== 'TimeoutError') {
      await ctx.close().catch(() => {});
      throw error;
    }
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: NAVIGATION_RECOVERY_MS });
    } catch (waitError) {
      await ctx.close().catch(() => {});
      throw new Error(`Navigation to ${url} timed out before DOMContentLoaded`, { cause: waitError });
    }
  }

  try {
    if (!noScroll) await autoScroll(page);
    return page;
  } catch (error) {
    await ctx.close().catch(() => {});
    throw error;
  }
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
