# MHTML-safe Clone Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger le helper Playwright canonique pour que le pipeline clone gère les MHTML sandboxés et les navigations pendant le scroll.

**Architecture:** Modifier `openPage` et `autoScroll` dans le dépôt source `agent-skill`. Le scroll sera piloté par étapes depuis Node, avec un appel synchrone par pas, des attentes bornées et une reprise limitée en cas de navigation. Les scripts canoniques seront exécutés depuis la racine de `devik-apps-frontend` pour réutiliser le clone existant sans éditer sa copie `design-pack/`.

**Tech Stack:** Node.js ESM, Playwright, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-10-mhtml-scroll-design.md`

## Global Constraints

- Le correctif source reste dans `C:\Users\kyler\projects\agent-skill`.
- Ne pas modifier `devik-apps-frontend/design-pack/`, `devik-apps-frontend/.design-pack/` à la main, `src/` avant validation ou `clones/agnos-wbs/mirror.mhtml`.
- Ne pas recréer les animations du site; conserver les scripts d’origine.
- `npm run approve clone` reste réservé à Kyle.

## Review Focus

- MHTML local sandboxé : pas d’attente d’un timer de page; la position revient en haut. Test : `autoScroll_mhtml_finishes_and_restores_top`.
- Page HTML longue : événements de scroll déclenchés, distance plafonnée, position restaurée. Tests : `autoScroll_live_page_scrolls_and_restores_top`, `autoScroll_limits_distance`.
- Navigation complète pendant un pas : reprise au plus une fois après `domcontentloaded`; erreurs répétées remontées clairement. Test : `autoScroll_recovers_once_from_navigation`.
- Option `noScroll` : aucun déplacement. Test : `openPage_honors_noScroll`.
- Options `init` et `waitUntil` : initialisation injectée et jalon de navigation respecté. Test : `openPage_honors_init_and_waitUntil`.

---

### Task 1: Ajouter des tests de régression du helper

**Files:**
- Create: `scripts/lib.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `autoScroll(page, options?)` et `openPage(browser, url, width, height, options?)` depuis `scripts/lib.mjs`.
- Produces: commande `npm run test:lib` utilisant `node:test`.

**Prerequisite:** Si `node_modules/playwright` est absent dans le dépôt source, installer ses dépendances déclarées avec `npm.cmd install --no-package-lock` depuis ce dépôt.

- [x] **Step 1: Écrire `autoScroll_mhtml_finishes_and_restores_top`** avec un petit MHTML temporaire de grande hauteur et un délai maximal de test; vérifier que le helper finit et revient en haut.
- [x] **Step 2: Exécuter le test MHTML contre le helper actuel et confirmer l’échec reproductible.**

Run: `node --test --test-name-pattern=autoScroll_mhtml_finishes_and_restores_top scripts/lib.test.mjs`
Expected: échec de l’assertion de délai avant le correctif.

- [x] **Step 3: Ajouter les tests HTML et options** `autoScroll_live_page_scrolls_and_restores_top`, `autoScroll_limits_distance`, `autoScroll_recovers_once_from_navigation`, `openPage_honors_noScroll` et `openPage_honors_init_and_waitUntil`, avec fixtures locales sans réseau.
- [x] **Step 4: Ajouter le script `test:lib`** dans `package.json`.
- [x] **Step 5: Lancer la suite et confirmer que les nouveaux tests échouent sur les comportements visés.**

Run: `npm.cmd run test:lib`
Expected: les tests de régression échouent sur la version actuelle.

### Task 2: Rendre le scroll borné et tolérant aux navigations

**Files:**
- Modify: `scripts/lib.mjs`
- Test: `scripts/lib.test.mjs`

**Interfaces:**
- Consumes: les tests de Task 1.
- Produces: `autoScroll(page, options?)` piloté par Node; `openPage(browser, url, width, height, options?)` acceptant `init`, `noScroll` et `waitUntil`.

- [x] **Step 1: Remplacer `setInterval` dans `page.evaluate`** par une boucle Node qui lit la hauteur, appelle `page.evaluate(y => window.scrollTo(0, y), y)` à chaque pas de 400 px, attend 120 ms côté Node, plafonne à 30 000 px, puis remet la page en haut et attend 600 ms.
- [x] **Step 2: Gérer une navigation durant un pas** : ne récupérer que l’erreur de contexte détruit, attendre `domcontentloaded` au plus 5 s, puis réessayer ce pas une fois; propager toute autre erreur et toute seconde navigation avec l’URL courante.
- [x] **Step 3: Adapter `openPage`** pour accepter le cinquième argument `options`; utiliser `options.waitUntil ?? 'networkidle'`, ajouter `options.init` au contexte et ignorer le scroll si `options.noScroll` vaut `true`.
- [x] **Step 4: Ne pas masquer les erreurs de navigation autres qu’un timeout réseau**; après un timeout de `networkidle`, attendre `domcontentloaded` de façon bornée avant le scroll.
- [x] **Step 5: Lancer `npm.cmd run test:lib`.**

Expected: tous les tests passent; l’ouverture du MHTML ne dépasse pas le délai prévu.

### Task 3: Reprendre les gates du clone existant

**Files:**
- Lire/exécuter depuis le dépôt source : `scripts/visual-diff.mjs`, `scripts/states.mjs`, `scripts/compare-page.mjs`
- Sorties attendues dans : `devik-apps-frontend/.design-pack/agnos-wbs/`

**Interfaces:**
- Consumes: le helper corrigé et le clone `agnos-wbs` existant.
- Produces: verdicts `clone-visual`, `clone-states` et rapport `compare.html` dans le projet consommateur.

- [x] **Step 1: Depuis `devik-apps-frontend`, lancer le diff canonique avec la cible MHTML par défaut.**

Run: `node C:\Users\kyler\projects\agent-skill\scripts\visual-diff.mjs clone`

- [ ] **Step 2: Vérifier le verdict visuel** : `PASS` et écart maximal ≤ 0,1 %. En cas d’échec, ouvrir uniquement le crop de la zone signalée, corriger la cause dans le dépôt source autorisé et répéter au plus cinq fois.
- [ ] **Step 3: Après la fin du diff, lancer les états canoniques.**

Run: `node C:\Users\kyler\projects\agent-skill\scripts\states.mjs clone`
Expected: `PASS`, zéro écart.

- [x] **Step 4: Générer le rapport avec le script canonique.**

Run: `node C:\Users\kyler\projects\agent-skill\scripts\compare-page.mjs clone`

- [x] **Step 5: Si les deux gates passent, remettre le clone à Kyle pour sa validation manuelle et sa commande `npm run approve clone`; sinon, rapporter les écarts et laisser l’état `clone-pending`.**
