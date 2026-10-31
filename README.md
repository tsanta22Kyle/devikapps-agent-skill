# design-pack

Pipeline : clone absolu → validation Kyle → componentisation → swap tokens → validation Kyle.

## Installation (à la racine du projet Next.js)
```bash
# copier le dossier design-pack/ à la racine du projet
# fusionner "scripts" et "devDependencies" de design-pack/package.json dans ton package.json
npm i -D playwright pixelmatch pngjs && npx playwright install chromium
mkdir -p .claude/skills && cp design-pack/.claude/settings.json .claude/settings.json   # ou fusionner les hooks
cp -r design-pack/skills/* .claude/skills/
cp design-pack/tokens.json ./tokens.json         # puis adapter à ton design system
claude mcp add playwright -- npx @playwright/mcp@latest
```
Les scripts s'appellent `node design-pack/scripts/...` : garde le dossier `design-pack/` à la racine.

## Gates
| Gate | Script | Bloque si |
|---|---|---|
| clone-visual | visual-diff clone | écart > 0,1 % (11 largeurs) |
| clone-states | states clone | hover/focus/active différents |
| Validation Kyle (clone) | approve clone | gates non passés (terminal Kyle seulement) |
| compo-visual | visual-diff compo (seuil 0) | écart vs baseline |
| dom | dom-diff | élément ajouté/supprimé |
| lint-ui | lint-ui | pilule, eyebrow, ombre+bordure, Card/Card, texte non fourni |
| report | report-check | valeur modifiée hors rapport |
| adapt-visual | visual-diff adapt | rendu inattendu |
| Validation Kyle (adapt) | approve adapt | gates non passés |

## Verrous (hook guard.mjs)
Bloque : écriture dans src/ avant clone-validated, toute modification de .design-pack/ et du miroir, toute commande contenant `approve`.

## À tester en premier
Le chargement du .mhtml en file:// dans Chromium headless (sinon servir clones/ avec `npx serve` et passer l'URL locale).
# devikapps-agent-skill
