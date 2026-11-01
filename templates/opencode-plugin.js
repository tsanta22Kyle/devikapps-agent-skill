// OpenCode : appelle la même garde que Claude Code. Un seul export (fonction), sinon le plugin ne charge pas.
import { spawnSync } from 'node:child_process';
export const DesignPackGuard = async ({ directory }) => ({
  'tool.execute.before': async (input, output) => {
    const a = output?.args ?? {};
    const req = JSON.stringify({ tool_name: input?.tool, tool_input: { file_path: a.filePath ?? a.file_path ?? a.path ?? '', command: a.command ?? '' } });
    const r = spawnSync('node', ['design-pack/hooks/guard.mjs'], { input: req, encoding: 'utf8', cwd: directory, env: { ...process.env, CLAUDE_PROJECT_DIR: directory } });
    if (r.status === 2) throw new Error(r.stderr.trim());
  },
});
