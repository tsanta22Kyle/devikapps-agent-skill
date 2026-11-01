// Inventaire des animations via le moteur du navigateur (document.getAnimations) : CSS, transitions, Web Animations, scroll-driven.
// usage: npm run extract-motion -- <clone|compo|adapt> [ref] [test]   (ref/test par défaut : site d'origine / miroir)
// Sur la phase clone, écrit .design-pack/<nom>/ref/motion.json ; compare toujours ref vs test (gate <phase>-motion).
import fs from 'node:fs'; import path from 'node:path';
import { chromium, dir, openPage, getState, setGate, toUrl, writeJson } from './lib.mjs';
const [phase, refArg, testArg] = process.argv.slice(2); const st = getState();
if (!st || !phase) { console.log('usage: npm run extract-motion -- <clone|compo|adapt> [ref] [test]'); process.exit(1); }
const ref = toUrl(refArg ?? st.url); const test = toUrl(testArg ?? `mirror:${st.name}`);

const collector = () => { // injecté avant le chargement de la page : enregistre chaque animation vue, avec le déclencheur courant
  const seen = new WeakSet(); const out = []; window.__dpMotion = out; window.__dpPhase = 'load';
  const pathOf = (el) => { const a = []; while (el && el.nodeType === 1 && el !== document.documentElement) { a.unshift(el.tagName.toLowerCase() + ':' + [...el.parentNode.children].indexOf(el)); el = el.parentNode; } return a.join('>'); };
  const plain = (v) => (v && typeof v === 'object' ? String(v) : v);
  const tick = () => { try { for (const a of document.getAnimations()) { if (seen.has(a)) continue; seen.add(a); const e = a.effect; if (!e || !e.target) continue; const t = e.getTiming(); const tl = a.timeline;
    out.push({ type: a.constructor.name, name: a.animationName || a.transitionProperty || a.id || '', target: pathOf(e.target), pseudo: e.pseudoElement || null, trigger: window.__dpPhase,
      timeline: tl && tl.constructor && tl.constructor.name !== 'DocumentTimeline' ? tl.constructor.name : 'document',
      timing: { duration: plain(t.duration), delay: t.delay, easing: (a.constructor.name === 'CSSAnimation' && e.getKeyframes().some((k) => k.easing && k.easing !== 'linear')) ? e.getKeyframes().find((k) => k.easing && k.easing !== 'linear').easing : t.easing, iterations: plain(t.iterations), direction: t.direction, fill: t.fill },
      keyframes: e.getKeyframes().map((k) => { const o = {}; for (const [p, v] of Object.entries(k)) if (p !== 'computedOffset') o[p] = plain(v); return o; }) }); } } catch {} requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};

async function collect(browser, tgt) {
  const page = await openPage(browser, tgt, 1440, 900, { init: collector, noScroll: true, waitUntil: 'load' }); const ctx = page.context(); await page.waitForTimeout(1500);
  const label = (l) => page.evaluate((x) => (window.__dpPhase = x), l);
  const H = await page.evaluate(() => document.body.scrollHeight);                      // déclencheurs scroll, par paliers
  for (let y = 0; y < Math.min(H, 30000); y += 300) { await label('scroll:' + y); await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(350); }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  const els = await page.$$('a,button,[role=button],summary,input,select,textarea,[tabindex]');   // déclencheurs hover
  for (const [i, el] of els.slice(0, 30).entries()) { try { await label('hover:' + i); await el.scrollIntoViewIfNeeded({ timeout: 800 }); await el.hover({ timeout: 800 }); await page.waitForTimeout(450); } catch {} }
  await page.mouse.move(0, 0); await page.waitForTimeout(300);
  const anims = await page.evaluate(() => window.__dpMotion);
  const libs = await page.evaluate(() => { const w = window, L = new Set(); const q = (s) => document.querySelector(s);
    if (w.gsap || w.TweenMax) L.add('GSAP'); if (w.ScrollTrigger) L.add('ScrollTrigger'); if (w.lottie || w.bodymovin || q('lottie-player,dotlottie-player,dotlottie-wc')) L.add('Lottie');
    if (w.anime) L.add('anime.js'); if (w.THREE) L.add('three.js'); if (w.Lenis || document.documentElement.classList.contains('lenis')) L.add('Lenis'); if (q('[data-scroll-container]')) L.add('Locomotive Scroll');
    if (q('[data-aos]')) L.add('AOS'); if (q('[data-w-id]')) L.add('Webflow IX'); if (q('[data-framer-name],[data-framer-component-type]')) L.add('Framer'); if (w.Swiper) L.add('Swiper');
    for (const s of document.scripts) { const m = (s.src || '').match(/gsap|lottie|framer-motion|motion\.dev|anime|three|lenis|locomotive|rive|splitting|scrollmagic|barba/i); if (m) L.add('script:' + m[0].toLowerCase()); }
    let tl = false; for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) if (/animation-timeline|scroll-timeline|view-timeline/.test(r.cssText)) tl = true; } catch {} } if (tl) L.add('CSS scroll-driven (animation-timeline)');
    return { libs: [...L], canvas: document.querySelectorAll('canvas').length, video: document.querySelectorAll('video').length }; });
  await ctx.close(); return { anims, ...libs };
}
const cat = (t) => t.split(':')[0];
const collapse = (anims) => { const m = new Map(); for (const a of anims) { const k = `${a.type}|${a.timing.duration}|${a.timing.delay}|${a.timing.easing}|${cat(a.trigger)}`;
  const e = m.get(k) ?? { type: a.type, name: a.name, timing: a.timing, trigger: cat(a.trigger), timeline: a.timeline, count: 0, targets: [], keyframes: a.keyframes }; e.count++; if (e.targets.length < 5) e.targets.push(a.target); m.set(k, e); } return m; };

const browser = await chromium.launch(); const R = await collect(browser, ref); const T = await collect(browser, test); await browser.close();
const cr = collapse(R.anims), ct = collapse(T.anims);
if (phase === 'clone') writeJson(path.join(dir(st.name, 'ref'), 'motion.json'), { libs: R.libs, canvas: R.canvas, video: R.video, animations: [...cr.values()] });
const missing = [...cr.keys()].filter((k) => !ct.has(k)), extra = [...ct.keys()].filter((k) => !cr.has(k));
const pass = !missing.length && !extra.length; setGate(st.name, `${phase}-motion`, pass, { ref: cr.size, missing: missing.length, extra: extra.length });
const by = {}; R.anims.forEach((a) => (by[cat(a.trigger)] = (by[cat(a.trigger)] || 0) + 1));
console.log(`${pass ? 'PASS' : 'FAIL'} extract-motion[${phase}] réf: ${R.anims.length} animations (${cr.size} distinctes) | déclencheurs ${JSON.stringify(by)}`);
[...cr.values()].sort((a, b) => b.count - a.count).slice(0, 6).forEach((e) => console.log(`  ${e.type} ${e.name} ${e.timing.duration}ms ${e.timing.easing} ×${e.count} (${e.trigger})`));
if (missing.length) console.log(`  absentes du test : ${missing.slice(0, 5).map((k) => k.replaceAll('|', ' ')).join(' ; ')}`);
if (extra.length) console.log(`  en trop dans le test : ${extra.slice(0, 5).map((k) => k.replaceAll('|', ' ')).join(' ; ')}`);
if (R.libs.length || R.canvas || R.video) console.log(`! Animations non lisibles via keyframes : ${[...R.libs, R.canvas ? `${R.canvas} canvas` : '', R.video ? `${R.video} vidéo` : ''].filter(Boolean).join(', ')} → copier le script d'origine tel quel, signaler à Kyle.`);
if (phase === 'clone') console.log(`Détail : .design-pack/${st.name}/ref/motion.json (cibler une entrée, ne pas le relire en entier).`);
