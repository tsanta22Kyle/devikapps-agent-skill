---
name: clone-absolu
description: Cloner un site, une page ou un composant existant à l'identique (pixel + hover + animations) via Playwright, SANS interpréter ni réécrire. À utiliser dès que Kyle envoie une URL de template ou de site à copier, ou dit "clone", "copie", "reprends ce design", avant toute adaptation.
---

# Clone absolu

Objectif : un miroir figé du rendu réel. L'agent ne crée aucun style, il extrait.

## Règles
- Extraire, ne jamais interpréter. Ne pas relire `styles.json` en entier (très lourd) : les scripts renvoient un verdict court.
- Aucun élément, texte ou style absent de la source n'a le droit d'exister.
- Ne jamais modifier `clones/<nom>/mirror.mhtml` (garde Claude/OpenCode + git hooks pour tous les agents).
- Pas d'écriture dans `src/` tant que Kyle n'a pas validé (garde Claude/OpenCode + git hooks pour tous les agents).

## Étapes
1. `npm run mirror -- <url> <nom>` : miroir MHTML + `styles.json` (computed styles, `::before/::after`, keyframes, polices) sur disque.
2. `npm run visual-diff -- clone` : 11 largeurs (320→1920), seuil 0,1 %.
3. `npm run states -- clone` : hover / focus / active forcés via CDP.
4. Si FAIL : ouvrir uniquement l'image `diff-<largeur>.png` recadrée sur la zone signalée, corriger la cause (polices non chargées, animation non déclenchée, contenu aléatoire, shadow DOM, iframe), relancer. Max 5 itérations, puis rapport des écarts restants.
5. Animations JS / canvas / WebGL / Lottie / vidéo : garder le script d'origine tel quel, jamais de recréation. Les lister dans le rapport.
6. `npm run compare -- clone`, puis dire à Kyle : "Clone prêt, valide avec `npm run approve clone`" (il saisit sa passphrase, tu ne peux pas le faire) + checklist manuelle (hover, scroll, clic, resize, animations).

## Limite à annoncer
Le diff prouve l'identité sur des captures, pas le comportement JS complexe : la validation de Kyle couvre ça.
