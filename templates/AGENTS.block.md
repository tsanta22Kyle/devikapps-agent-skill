<!-- design-pack:start -->
## design-pack (clone → adaptation)
- URL ou template à copier : charger le skill `clone-absolu` ; à adapter au design system : `adaptation`. Support : `anti-ai-style`, `motion`, `generate-in-style`. Fichiers : `.agents/skills/<nom>/SKILL.md` (les lire directement si l'agent n'a pas d'outil skill).
- Les scripts (`npm run mirror | visual-diff | states | dom-diff | lint-ui | report-check | compare`) écrivent sur disque et renvoient un verdict court. Ne jamais lire les dumps en entier.
- Jamais de validation par l'agent : `npm run approve` est réservé à Kyle (passphrase). Aucune écriture dans `src/` avant la validation du clone.
- Interdits : `git commit --no-verify`, `git push --no-verify`, modifier `design-pack/`, `.design-pack/`, `clones/*/mirror.mhtml`.
- Aucun élément, texte ou style absent de la source ou du contenu fourni.
<!-- design-pack:end -->
