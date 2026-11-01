// Sans dépendance (pas de Playwright) : utilisé par les git hooks, le hook Claude/OpenCode et approve.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
export const R = process.env.CLAUDE_PROJECT_DIR || process.cwd();
export const p = (...a) => path.join(R, ...a);
export const pubPath = p('design-pack', 'kyle.pub.pem');
export const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
export function srcHash() {
  const files = []; const walk = (d) => { if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d).sort()) { const x = path.join(d, f);
      if (f === 'node_modules') continue; fs.statSync(x).isDirectory() ? walk(x) : files.push(x); } };
  walk(p('src')); const h = crypto.createHash('sha256');
  for (const f of files) { h.update(path.relative(R, f).replaceAll('\\', '/')); h.update(fs.readFileSync(f).toString('latin1').replace(/\r\n/g, '\n')); } return h.digest('hex');
}
export function payload(name, kind) {
  if (kind === 'clone') return `${name}|clone|${sha(fs.readFileSync(p('clones', name, 'mirror.mhtml')))}`;
  return `${name}|adapt|${srcHash()}`;
}
export function isApproved(name, kind) {
  try {
    const ap = JSON.parse(fs.readFileSync(p('.design-pack', 'approvals.json'), 'utf8')); const e = ap[`${name}:${kind}`]; if (!e) return false;
    const pl = payload(name, kind); if (e.payload !== pl) return false;
    return crypto.verify(null, Buffer.from(pl), crypto.createPublicKey(fs.readFileSync(pubPath)), Buffer.from(e.sig, 'base64'));
  } catch { return false; }
}
export const cloneNames = () => (fs.existsSync(p('clones')) ? fs.readdirSync(p('clones')).filter((n) => fs.statSync(p('clones', n)).isDirectory() && fs.existsSync(p('clones', n, 'mirror.mhtml'))) : []);
