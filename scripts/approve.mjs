// Réservé à Kyle : terminal interactif obligatoire, bloqué dans Claude Code, gates auto exigés.
import readline from 'node:readline'; import path from 'node:path';
import { getState, setState, readJson, DP } from './lib.mjs';
const kind = process.argv[2]; const st = getState();
if (!st || !['clone', 'adapt'].includes(kind)) { console.log('usage: npm run approve clone|adapt'); process.exit(1); }
if (!process.stdin.isTTY || process.env.CLAUDECODE) { console.error('Réservé à Kyle : lance cette commande depuis ton propre terminal.'); process.exit(1); }
const need = kind === 'clone' ? ['clone-visual', 'clone-states'] : ['compo-visual', 'dom', 'lint-ui', 'report', 'adapt-visual'];
const g = readJson(path.join(DP, st.name, 'gates.json'), {}); const fail = need.filter((k) => !g[k]?.pass);
if (fail.length) { console.error('Gates non passés : ' + fail.join(', ')); process.exit(1); }
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question(`Tape "${st.name}" pour valider (${kind}) : `, (a) => { rl.close();
  if (a.trim() !== st.name) { console.log('Annulé.'); process.exit(1); }
  setState({ phase: kind === 'clone' ? 'clone-validated' : 'adapt-validated' }); console.log('Validé → ' + (kind === 'clone' ? 'clone-validated' : 'adapt-validated')); });
