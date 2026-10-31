---
name: generate-in-style
description: Générer un nouvel élément ou une section dans le style du design system de Kyle, avec ou sans fond. À utiliser quand Kyle demande un composant ou une section nouvelle (pas issue d'un clone), ou une variante avec/sans background.
---

# Generate in style

## Règles
- Partir des composants et tokens existants ; ne rien inventer hors `tokens.json`.
- Une prop `surface="none | tinted | image"` sur chaque section, pas de composants dupliqués :
  - `none` : fond hérité de la page, aucune bordure, aucune ombre.
  - `tinted` : un seul token de fond (`color.surface`).
  - `image` : image + overlay défini dans les tokens.
- Mêmes interdits que `anti-ai-style` ; contenu fourni par Kyle uniquement.
- Valider visuellement avec Playwright (screenshot aux largeurs 375 / 768 / 1440), puis `npm run lint-ui`, puis validation de Kyle.
