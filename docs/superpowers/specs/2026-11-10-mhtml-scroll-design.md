# Design : défilement Playwright compatible avec MHTML

## Intention

Corriger le helper Playwright du dépôt canonique `agent-skill` pour que les contrôles de clone parcourent le site source sans blocage et puissent capturer le MHTML local. Le diagnostic a montré que le MHTML est lisible et que les appels synchrones Playwright peuvent déplacer sa page, mais que la boucle `setInterval` exécutée par `page.evaluate` ne rend pas la main. Une comparaison de repli avec `rendered.html` s’exécute mais échoue à 14,599 %.

## Objectifs et limites

- Remplacer la boucle temporisée dans le contexte de page par des étapes pilotées depuis Node/Playwright.
- Garder le défilement complet des pages vivantes afin de déclencher leurs événements de scroll.
- Borner le défilement et reprendre au plus une fois après une navigation pendant un pas.
- Honorer `init`, `noScroll` et `waitUntil`, options déjà passées par `extract-motion.mjs`.
- Ne pas recréer les animations ni changer le contenu visuel.

## Approches étudiées

1. **Défilement piloté par Playwright dans le helper canonique (retenue).** Appeler un scroll synchrone par pas depuis Node, puis attendre côté Node; gérer explicitement les erreurs de navigation. Cette approche conserve les événements de scroll et fonctionne sans minuteur dans le MHTML.
2. **Servir le MHTML en HTTP.** Écartée : les essais Chrome ont déclenché un téléchargement ou affiché une page vide.
3. **Utiliser `rendered.html` comme cible de validation.** Écartée : le diff a terminé mais échoue à 14,599 % et les hauteurs divergent.

## Contraintes

- Code source : `C:\Users\kyler\projects\agent-skill\scripts\lib.mjs`.
- Exécuter les scripts canoniques depuis la racine de `devik-apps-frontend` pour qu’ils écrivent leurs sorties au bon endroit.
- Ne pas éditer le `design-pack/` local, `.design-pack/` à la main, `src/` avant validation, ni `clones/agnos-wbs/mirror.mhtml`.
- Kyle reste le seul à lancer `npm run approve clone`.

## Critères d’acceptation

- Les tests MHTML et HTML confirment que le scroll termine dans ses bornes et revient en haut.
- Une navigation pendant le scroll est récupérée une fois avec attente bornée; une nouvelle erreur est rapportée clairement.
- `openPage` respecte `init`, `noScroll` et `waitUntil`.
- Après les tests, les scripts canoniques relancent les gates sur le MHTML par défaut : `visual-diff` passe à 0,1 % maximum et `states` ne trouve aucun écart; sinon, le rapport décrit les différences restantes.
