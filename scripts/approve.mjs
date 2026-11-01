// Réservé à Kyle : terminal interactif + passphrase (clé privée Ed25519 hors du repo). Aucun agent ne connaît la passphrase.
import readline from 'node:readline'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto';
import { getState, setState, readJson, writeJson, DP } from './lib.mjs';
import { payload, pubPath, p } from './verify-lib.mjs';
const kind = process.argv[2]; const keyFile = path.join(os.homedir(), '.design-pack', 'kyle.key');
if (!process.stdin.isTTY) { console.error('Réservé à Kyle : lance cette commande depuis ton propre terminal.'); process.exit(1); }
const ask = (q, hidden = false) => new Promise((res) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = (s) => { if (s.includes(q)) process.stdout.write(s); };
  rl.question(q, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); res(a); }); });
if (kind === 'init') {
  if (fs.existsSync(keyFile)) { console.error('Clé déjà créée : ' + keyFile); process.exit(1); }
  const pass = await ask('Nouvelle passphrase (garde-la pour toi seul) : ', true); if (pass.length < 8) { console.error('8 caractères minimum.'); process.exit(1); }
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', { publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: pass } });
  fs.mkdirSync(path.dirname(keyFile), { recursive: true, mode: 0o700 }); fs.writeFileSync(keyFile, privateKey, { mode: 0o600 }); fs.writeFileSync(pubPath, publicKey);
  console.log('Clé privée chiffrée : ' + keyFile + '\nClé publique : design-pack/kyle.pub.pem → à committer.'); process.exit(0);
}
const st = getState();
if (!st || !['clone', 'adapt'].includes(kind)) { console.log('usage: npm run approve init | clone | adapt'); process.exit(1); }
const need = kind === 'clone' ? ['clone-visual', 'clone-states'] : ['compo-visual', 'dom', 'lint-ui', 'report', 'adapt-visual'];
const g = readJson(path.join(DP, st.name, 'gates.json'), {}); const fail = need.filter((k) => !g[k]?.pass);
if (fail.length) { console.error('Gates non passés : ' + fail.join(', ')); process.exit(1); }
if (!fs.existsSync(keyFile)) { console.error('Lance d\'abord `npm run approve init`.'); process.exit(1); }
const pass = await ask(`Passphrase pour valider "${st.name}" (${kind}) : `, true); const pl = payload(st.name, kind);
let sig; try { sig = crypto.sign(null, Buffer.from(pl), { key: fs.readFileSync(keyFile), passphrase: pass }).toString('base64'); } catch { console.error('Passphrase incorrecte.'); process.exit(1); }
const f = p('.design-pack', 'approvals.json'); const ap = readJson(f, {}); ap[`${st.name}:${kind}`] = { payload: pl, sig, at: new Date().toISOString() }; writeJson(f, ap);
setState({ phase: kind === 'clone' ? 'clone-validated' : 'adapt-validated' }); console.log('Validé et signé : ' + kind);
