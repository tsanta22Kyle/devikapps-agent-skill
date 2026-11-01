# design-pack (Claude Code, Codex, OpenCode)

Pipeline : clone absolu → validation Kyle → componentisation → swap tokens → validation Kyle.

## Installation
```bash
# 1. copier design-pack/ à la racine du projet, puis :
node design-pack/setup.mjs
npm i && npx playwright install chromium
npm run approve init        # Kyle seul : crée la clé Ed25519 (passphrase), commit design-pack/kyle.pub.pem
```
Attention : `setup` fixe `core.hooksPath` sur `design-pack/githooks` (remplace husky ou équivalent).

## Ce qui est commun / spécifique
| Brique | Claude Code | Codex | OpenCode |
|---|---|---|---|
| Instructions | CLAUDE.md → `@AGENTS.md` | AGENTS.md | AGENTS.md |
| Skills | `.claude/skills` (lien) | `.agents/skills` | `.agents/skills` ou `.claude/skills` |
| Playwright MCP | `.mcp.json` | `.codex/config.toml` | `opencode.json` |
| Garde temps réel | hook PreToolUse | non fournie (git hooks) | plugin `tool.execute.before` |
| Scripts, signatures, git hooks | identiques (Node, dans `design-pack/`) | idem | idem |

## Validation par signature (agnostique)
`approve` signe (Ed25519) le hash du miroir (clone) ou de `src/` (adaptation). La clé privée est chiffrée dans `~/.design-pack/`, la passphrase n'est connue que de Kyle : aucun agent ne peut fabriquer une validation. `verify` (pre-commit, pre-push, CI) refuse si la signature manque ou si le contenu a changé depuis.

## Gates
| Gate | Script | Bloque si |
|---|---|---|
| clone-visual | visual-diff clone | écart > 0,1 % (11 largeurs) |
| clone-states | states clone | hover/focus/active différents |
| Validation clone | approve clone | gates non passés, passphrase |
| compo-visual | visual-diff compo (seuil 0) | écart vs baseline |
| dom | dom-diff | élément ajouté/supprimé |
| lint-ui | lint-ui | pilule, eyebrow, ombre+bordure, Card/Card, texte non fourni |
| report | report-check | valeur modifiée hors rapport |
| adapt-visual | visual-diff adapt | rendu inattendu |
| Validation adaptation | approve adapt | gates non passés, passphrase |

## Limites honnêtes
- Les git hooks se contournent avec `--no-verify` : ajoute `npm run verify -- adapt` en CI pour une garantie réelle.
- Codex : pas de garde temps réel fournie ; l'agent peut écrire dans `src/` avant validation, mais le commit et le push seront refusés. Des hooks Codex (`.codex/hooks.json`) sont possibles, schéma non inclus car non testé.
- OpenCode : le plugin ne voit pas les appels des sous-agents (bug connu) ; les git hooks couvrent ce cas.
- À tester en premier : chargement du `.mhtml` en `file://` dans Chromium headless (sinon `npx serve clones/`).
