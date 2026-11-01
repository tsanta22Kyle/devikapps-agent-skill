// Adaptateur unique : entrée JSON sur stdin {tool_name, tool_input:{file_path|filePath|path, command}} ; exit 2 = refus.
import path from 'node:path';
import { R, cloneNames, isApproved } from '../scripts/verify-lib.mjs';
let input = ''; for await (const c of process.stdin) input += c;
const j = JSON.parse(input || '{}'); const ti = j.tool_input || {};
const deny = (m) => { console.error('[design-pack] ' + m); process.exit(2); };
const raw = String(ti.file_path || ti.filePath || ti.path || ''); const cmd = String(ti.command || '').replaceAll('\\', '/');
const fp = (path.isAbsolute(raw) ? path.relative(R, raw) : raw).replaceAll('\\', '/');
const PROTECTED = /^(\.design-pack\/|design-pack\/(scripts|hooks|githooks|templates)\/|design-pack\/kyle\.pub\.pem|\.claude\/settings\.json|\.opencode\/plugins\/|\.codex\/(hooks|config))/;
if (PROTECTED.test(fp)) deny('Fichier protégé (état, scripts, hooks, clé publique).');
if (/(^|\/)clones\/[^/]+\/(mirror\.mhtml|rendered\.html)$/.test(fp)) deny('Le miroir est figé : ne pas le modifier.');
if (/\bapprove\b/.test(cmd)) deny('Les validations sont réservées à Kyle (passphrase), dans son propre terminal.');
if (/(\.design-pack|design-pack\/(scripts|hooks|githooks|templates)|kyle\.pub|\.claude\/settings|\.opencode\/plugins|core\.hooksPath|--no-verify)/.test(cmd) && /(>|tee |sed -i|\brm\b|\bmv\b|\bcp\b|git config|--no-verify)/.test(cmd))
  deny('Commande refusée : écriture dans les fichiers protégés ou contournement des git hooks.');
if (/(^|\/)(src|app|components)\//.test(fp)) { const bad = cloneNames().filter((n) => !isApproved(n, 'clone'));
  if (bad.length) deny(`Clone non validé par Kyle (${bad.join(', ')}) : aucune écriture dans src/ avant \`npm run approve clone\`.`); }
process.exit(0);
