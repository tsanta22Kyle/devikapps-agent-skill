// Page de validation pour Kyle : slider avant/après par largeur.
import fs from 'node:fs'; import path from 'node:path';
import { getState, dir, WIDTHS, readJson } from './lib.mjs';
const phase = process.argv[2]; const st = getState();
if (!st || !phase) { console.log('usage: npm run compare -- <clone|compo|adapt>'); process.exit(1); }
const d = dir(st.name, phase); const gates = readJson(path.join(d, '..', 'gates.json'), {});
const opts = WIDTHS.map((w) => `<option value="${w}">${w}px</option>`).join('');
fs.writeFileSync(path.join(d, 'compare.html'), `<!doctype html><meta charset="utf-8"><title>${st.name} · ${phase}</title>
<style>body{font:14px system-ui;margin:16px}.box{position:relative;display:inline-block;max-width:100%}.box img{display:block;max-width:100%}
#top{position:absolute;inset:0;overflow:hidden;width:50%}#top img{max-width:none}#r{width:100%;margin:8px 0}pre{background:#f4f4f4;padding:8px}</style>
<select id="w">${opts}</select> gauche = référence · droite = résultat<input id="r" type="range" min="0" max="100" value="50">
<div class="box"><img id="b"><div id="top"><img id="a"></div></div><pre>${JSON.stringify(gates, null, 1)}</pre>
<script>const $=i=>document.getElementById(i);function L(){const w=$('w').value;$('a').src='ref-'+w+'.png';$('b').src='test-'+w+'.png';sync()}
function sync(){$('top').style.width=$('r').value+'%';$('a').style.width=$('b').clientWidth+'px'}
$('w').onchange=L;$('r').oninput=sync;$('b').onload=sync;$('w').value=1440;L();</script>`);
console.log(`Ouvre : .design-pack/${st.name}/${phase}/compare.html`);
