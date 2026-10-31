---
name: anti-ai-style
description: Règles d'interdiction des styles "AI" génériques (badges pilule, eyebrow en majuscules, point de statut, cards dans cards, bordure + ombre, textes d'indication inutiles). À utiliser pour tout code UI écrit ou modifié, en support des skills clone-absolu et adaptation.
---

# Anti-AI style

Appliqué mécaniquement par `npm run lint-ui` ; ces règles sont là pour éviter de l'écrire d'abord.

## Interdit (sauf demande explicite de Kyle)
- Pilule : `rounded-full` + bordure fine, au-dessus d'un titre.
- Eyebrow : `uppercase` + `tracking-wide/wider/widest`.
- Point de statut coloré (●) devant un texte.
- Bordure + `shadow-*` sur le même élément.
- `Card` dans `Card`.
- Textes non fournis : sous-titres d'aide, légendes, indications, "Nouveau", "Bientôt".
- Couleur, rayon, ombre ou espacement hors `tokens.json` (valeurs arbitraires `[#fff]`, `[13px]`).

## À la place
1. Information utile : une phrase normale (casse de phrase) dans le titre ou le paragraphe.
2. Information secondaire : texte atténué (`text-sm`, couleur `muted`), sans fond ni bordure.
3. Repère visuel nécessaire : un seul élément typographique (filet, numéro, icône alignée).
4. Sinon : supprimer.

Test : "que perd l'utilisateur si je l'enlève ?" Rien → ne pas l'ajouter.
