// Verrous mécaniques : l'agent ne peut ni valider, ni écrire dans src avant validation, ni toucher au miroir.
import fs from 'node:fs';
let input = ''; for await (const c of process.stdin) input += c;
const j = JSON.parse(input || '{}'); const ti = j.tool_input || {};
const deny = (m) => { console.error('[design-pack] ' + m); process.exit(2); };
const fp = String(ti.file_path || ''); const cmd = String(ti.command || '');
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let st = null; try { st = JSON.parse(fs.readFileSync(root + '/.design-pack/state.json', 'utf8')); } catch {}

if (fp.includes('.design-pack/')) deny('Écriture interdite dans .design-pack/ (état et gates gérés par les scripts).');
if (/(^|\/)clones\/[^/]+\/(mirror\.mhtml|rendered\.html)$/.test(fp)) deny('Le miroir est figé : ne pas le modifier.');
if (/approve/.test(cmd)) deny('Les validations sont réservées à Kyle, dans son propre terminal.');
if (cmd.includes('.design-pack') && /(>|tee |sed -i|\brm\b|\bmv\b|\bcp\b)/.test(cmd)) deny('Écriture shell interdite dans .design-pack/.');
if (st && st.phase === 'clone-pending' && /(^|\/)(src|app|components)\//.test(fp))
  deny('Clone non validé par Kyle : aucune écriture dans src/ avant `npm run approve clone`.');
process.exit(0);
