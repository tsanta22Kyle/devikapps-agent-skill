---
name: adaptation
description: Adapter un clone validé au design system de Kyle (tokens, contenu, motion) sans changer la structure ni inventer de composants. À utiliser quand un clone est "clone-validated", ou que Kyle demande d'intégrer, componentiser ou adapter un template à son design system.
---

# Adaptation

Le clone validé est la **baseline**. Une seule catégorie de changement à la fois.

## Interdit
Ajouter un élément, un texte, une description ou une décoration absents de la baseline. Voir skill `anti-ai-style`.

## Étape A : componentisation (rendu identique)
1. Découper `clones/<nom>/rendered.html` en composants React, valeurs d'origine conservées, aucun token.
2. Lancer le dev server, puis `npm run visual-diff -- compo <baseline> <localhost> 0` (seuil 0).
3. `npm run states -- compo <baseline> <localhost>`.
4. FAIL : corriger puis relancer (max 3 itérations).

## Étape B : swap (3 transformations autorisées seulement)
1. Valeur brute → token le plus proche de `tokens.json`.
2. Texte et images → contenu fourni par Kyle (lister dans `content.allowlist.txt`).
3. Animations → presets du skill `motion`.

Écrire `adaptation/<nom>.report.json` : `[{ "prop": "border-radius", "from": "12px", "to": "8px", "token": "radius.md" }]`. Toute valeur modifiée doit y figurer.

## Gates à passer (verdicts courts)
- `npm run dom-diff -- <baseline> <localhost>` : 0 élément ajouté ou supprimé.
- `npm run lint-ui`
- `npm run report-check -- <baseline> <localhost>`
- `npm run visual-diff -- adapt <baseline> <localhost> 100` : les écarts attendus sont ceux du rapport ; recadrer les images sur les zones qui divergent.

## Fin
`npm run compare -- adapt`, puis : "Adaptation prête, valide avec `npm run approve adapt`". Ne jamais merger avant `adapt-validated`.

## Économie de tokens
Scripts sur disque, verdicts seulement. Un sous-agent par section (nav, hero, footer...). Jamais de `browser_snapshot` sur une page entière.
