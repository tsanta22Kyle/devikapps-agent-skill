// Contrôle indépendant de l'agent : appelé par les git hooks (pre-commit, pre-push) et en CI.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { cloneNames, isApproved, pubPath, p } from './verify-lib.mjs';
const mode = process.argv[2] || 'clone'; const errs = [];
try { if (execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'design-pack/kyle.pub.pem'], { cwd: p(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()) errs.push('clé publique design-pack/kyle.pub.pem modifiée'); } catch {}
const names = cloneNames();
if (names.length && !fs.existsSync(pubPath)) errs.push('clé publique absente : Kyle doit lancer `npm run approve init`');
for (const n of names) if (!isApproved(n, 'clone')) errs.push(`clone "${n}" non validé par Kyle (ou miroir modifié)`);
if (mode === 'adapt') { let st = null; try { st = JSON.parse(fs.readFileSync(p('.design-pack', 'state.json'), 'utf8')); } catch {}
  if (st && !isApproved(st.name, 'adapt')) errs.push(`adaptation "${st.name}" non validée par Kyle (ou src modifié depuis la validation)`); }
if (errs.length) { console.error('[design-pack] BLOQUÉ :\n  - ' + errs.join('\n  - ')); process.exit(1); }
console.log('[design-pack] OK');
