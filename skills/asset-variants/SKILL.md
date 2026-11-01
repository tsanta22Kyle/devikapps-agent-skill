---
name: asset-variants
description: Recolorer, décliner en nuances ou regénérer un élément graphique repris d'un site cloné (icône, emoji, smiley, illustration, logo, dégradé) avec les couleurs du design system de Kyle. À utiliser dès que Kyle veut réutiliser un élément d'un site avec une autre couleur, une nuance différente, ou un nouvel élément dans le même style.
---

# Asset variants

Règle d'or : **palette-swap avec preuve**. L'élément est d'abord reproduit à l'identique avec ses couleurs d'origine, puis on change seulement la palette.

## 1. Extraire
`npm run extract-assets -- <nom>` → `clones/<nom>/assets/` + `manifest.json` (id, format, taille, couleurs). Ne pas relire le manifest en entier : cibler un id.

## 2. Choisir la méthode selon le format
| Format de l'élément | Méthode |
|---|---|
| SVG | `recolor` directe (les dégradés et nuances sont conservés) |
| PNG | `recolor` par décalage de teinte |
| JPG / WebP / GIF / photo | pas de recoloration propre : refaire en SVG, ou garder tel quel |
| Dégradé / forme en CSS | variables de `tokens.json` dans le composant |
| Emoji ou police d'icônes | remplacer par un SVG |
| Canvas / Lottie / WebGL | hors périmètre : le signaler à Kyle |

## 3. Recolorer (déterministe)
- `npm run recolor -- in.svg out.svg --to #HEX` : aligne la teinte dominante sur la cible, garde les nuances.
- `--map "#ff7a2f=#2b4eff"` : remplacement exact (SVG).
- `--hue N --sat K --light D` : réglage manuel. Une "nuance" = `--sat` / `--light`, 2-3 variantes nommées (base, soft, strong) dérivées du même token.
- La couleur cible vient toujours de `tokens.json`, jamais d'un hex libre.

## 4. Regénérer un élément dans le même style
1. Copier la géométrie de l'original : viewBox, rayons, positions, mêmes stops de dégradé.
2. Écrire un SVG avec les couleurs **d'origine**, puis `npm run asset-diff -- original.png ma-version.svg` (seuil 2 %). FAIL : corriger la géométrie, pas la couleur.
3. Seulement après PASS : appliquer la nouvelle palette (`recolor`).

## 5. Intégrer
SVG inline ou `<img>` ; `currentColor` / variables CSS si l'élément doit suivre le thème. Lister chaque changement dans `adaptation/<nom>.assets.json` : `[{ "asset": "a007", "from": "#ff7a2f", "to": "#2b4eff", "token": "color.accent" }]`. Kyle valide visuellement via `compare`.

## Interdit
Ajouter reflets, ombres, bordures ou détails absents de l'original ; couleur hors tokens ; regénérer une illustration entière à la place de l'original sans demande de Kyle.
