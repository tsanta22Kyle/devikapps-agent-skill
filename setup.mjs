// node design-pack/setup.mjs : installe le pack pour Claude Code, Codex et OpenCode (idempotent).
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const R = process.cwd(); const P = path.join(R, 'design-pack'); const J = (...a) => path.join(R, ...a);
const rd = (f, d = '') => { try { return fs.readFileSync(f, 'utf8'); } catch { return d; } };
const rj = (f, d = {}) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const wj = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n'); };
const ok = (m) => console.log('✓ ' + m);
if (!fs.existsSync(P)) { console.error('Lance cette commande à la racine du projet, avec le dossier design-pack/ dedans.'); process.exit(1); }

// 1. Skills : source unique .agents/skills (Codex + OpenCode), lien .claude/skills (Claude Code + OpenCode)
const dst = J('.agents', 'skills'); fs.mkdirSync(dst, { recursive: true });
for (const n of fs.readdirSync(path.join(P, 'skills'))) fs.cpSync(path.join(P, 'skills', n), path.join(dst, n), { recursive: true });
ok('skills → .agents/skills');
if (!fs.existsSync(J('.claude', 'skills'))) {
  fs.mkdirSync(J('.claude'), { recursive: true });
  try { // Windows : "junction" ne demande pas les droits admin ; ailleurs : lien relatif
    if (process.platform === 'win32') fs.symlinkSync(dst, J('.claude', 'skills'), 'junction'); else fs.symlinkSync('../.agents/skills', J('.claude', 'skills'));
    ok('.claude/skills → .agents/skills');
  } catch { fs.cpSync(dst, J('.claude', 'skills'), { recursive: true }); ok('.claude/skills (copie : relance setup après modification des skills)'); }
} else console.log('! .claude/skills existe déjà : lie ou copie les skills à la main');
// Fins de ligne : le miroir ne doit jamais être converti par git (signature)
const ga = rd(J('.gitattributes')); if (!ga.includes('clones/**')) { fs.writeFileSync(J('.gitattributes'), ga + (ga && !ga.endsWith('\n') ? '\n' : '') + 'clones/** -text\n'); ok('.gitattributes'); }

// 2. Instructions : AGENTS.md (Codex, OpenCode) + CLAUDE.md qui l'importe
const block = rd(path.join(P, 'templates', 'AGENTS.block.md')); const ag = rd(J('AGENTS.md'));
if (!ag.includes('design-pack:start')) { fs.writeFileSync(J('AGENTS.md'), ag + (ag && !ag.endsWith('\n') ? '\n' : '') + block); ok('AGENTS.md'); }
const cm = rd(J('CLAUDE.md')); if (!cm.includes('@AGENTS.md')) { fs.writeFileSync(J('CLAUDE.md'), cm + (cm && !cm.endsWith('\n') ? '\n' : '') + '@AGENTS.md\n'); ok('CLAUDE.md → @AGENTS.md'); }

// 3. Playwright MCP + gardes, par agent
const mcp = rj(J('.mcp.json')); mcp.mcpServers ??= {}; mcp.mcpServers.playwright ??= { command: 'npx', args: ['@playwright/mcp@latest'] }; wj(J('.mcp.json'), mcp); ok('Claude : .mcp.json');
const sf = J('.claude', 'settings.json'); const s = rj(sf); s.hooks ??= {}; s.hooks.PreToolUse ??= [];
if (!JSON.stringify(s.hooks.PreToolUse).includes('design-pack/hooks/guard.mjs')) s.hooks.PreToolUse.push(...rj(path.join(P, 'templates', 'claude-settings.json')).hooks.PreToolUse); wj(sf, s); ok('Claude : hook PreToolUse');
const toml = rd(J('.codex', 'config.toml'));
if (!toml.includes('[mcp_servers.playwright]')) { fs.mkdirSync(J('.codex'), { recursive: true }); fs.writeFileSync(J('.codex', 'config.toml'), toml + (toml && !toml.endsWith('\n') ? '\n' : '') + '\n[mcp_servers.playwright]\ncommand = "npx"\nargs = ["@playwright/mcp@latest"]\n'); ok('Codex : .codex/config.toml (projet à marquer "trusted")'); }
const oc = rj(J('opencode.json')); oc.$schema ??= 'https://opencode.ai/config.json'; oc.mcp ??= {}; oc.mcp.playwright ??= { type: 'local', command: ['npx', '@playwright/mcp@latest'], enabled: true }; wj(J('opencode.json'), oc); ok('OpenCode : opencode.json');
fs.mkdirSync(J('.opencode', 'plugins'), { recursive: true }); fs.copyFileSync(path.join(P, 'templates', 'opencode-plugin.js'), J('.opencode', 'plugins', 'design-pack.js')); ok('OpenCode : plugin de garde');

// 4. package.json + git hooks (garde commune à tous les agents, y compris Codex)
const pj = rj(J('package.json')); const dp = rj(path.join(P, 'package.json'));
pj.scripts = { ...pj.scripts, ...dp.scripts }; pj.devDependencies = { ...pj.devDependencies, ...dp.devDependencies }; wj(J('package.json'), pj); ok('package.json');
try { for (const h of fs.readdirSync(path.join(P, 'githooks'))) fs.chmodSync(path.join(P, 'githooks', h), 0o755); execFileSync('git', ['config', 'core.hooksPath', 'design-pack/githooks'], { cwd: R }); ok('git hooks (pre-commit, pre-push)'); }
catch { console.log('! pas de dépôt git : lance `git init` puis `git config core.hooksPath design-pack/githooks`'); }
console.log('\nSuite : npm i && npx playwright install chromium && npm run approve init');
