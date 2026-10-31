// Copie MIROIR : on fige le rendu réel (MHTML = HTML + CSS + images + polices) puis on dump les styles sur disque.
import fs from 'node:fs'; import path from 'node:path';
import { chromium, dir, openPage, extractStyles, writeJson, setState } from './lib.mjs';
const [url, name] = process.argv.slice(2);
if (!url || !name) { console.log('usage: npm run mirror -- <url> <nom>'); process.exit(1); }
const browser = await chromium.launch();
const page = await openPage(browser, url, 1440);
const cdp = await page.context().newCDPSession(page);
const { data } = await cdp.send('Page.captureSnapshot', { format: 'mhtml' });
const cd = path.join('clones', name); fs.mkdirSync(cd, { recursive: true });
fs.writeFileSync(path.join(cd, 'mirror.mhtml'), data);
fs.writeFileSync(path.join(cd, 'rendered.html'), await page.content());
const st = await extractStyles(page);
const out = dir(name, 'ref');
writeJson(path.join(out, 'styles.json'), st);
writeJson(path.join(out, 'meta.json'), { url, at: new Date().toISOString() });
await browser.close();
setState({ name, phase: 'clone-pending', url });
console.log(`miroir OK → clones/${name}/mirror.mhtml | ${st.elements.length} éléments | ${st.keyframes.length} keyframes | ${st.fonts.length} polices`);
console.log('Suite : npm run visual-diff -- clone && npm run states -- clone');
