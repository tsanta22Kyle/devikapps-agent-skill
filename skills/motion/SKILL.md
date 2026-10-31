---
name: motion
description: Ajouter ou reproduire des animations avec un nombre limité de presets (fade-up, stagger-children, reveal-on-scroll, parallax-soft, hover-lift). À utiliser pour toute animation, transition ou effet au scroll/hover, y compris quand un template en contient.
---

# Motion

## Règles
- Presets uniquement, durées et easing pris dans `tokens.json` (`motion.fast/base/slow/ease`).
- Si le template anime déjà : extraire (durée, easing, déclencheur) depuis `styles.json` / keyframes et rejouer à l'identique pendant le clone ; ne mapper sur un preset qu'à l'étape de swap, en le notant dans le rapport.
- Toujours gérer `prefers-reduced-motion` (désactiver ou réduire à un fondu).
- Ne jamais animer un élément qui n'est pas animé dans la source (sauf demande explicite).
- CSS pur pour le simple ; Motion (ex-Framer Motion) pour React quand il faut du scroll/stagger.

## Presets
| Nom | Effet | Durée |
|---|---|---|
| fade-up | opacité 0→1, translateY 16px→0 | base |
| stagger-children | fade-up en cascade, 60 ms d'écart | base |
| reveal-on-scroll | fade-up déclenché à l'entrée dans le viewport (une seule fois) | base |
| parallax-soft | translateY ≤ 40px lié au scroll | continu |
| hover-lift | translateY -2px, sans ombre ajoutée | fast |
