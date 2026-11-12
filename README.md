# Zmanim API

Les horaires juifs en JSON, **réglables avis par avis** : zmanim (règles de CalJ / Or Méïr, Rav Ovadia Yossef, hebcal, ou vos propres avis au degré ou à la minute près), date hébraïque, fêtes (diaspora et Israël), paracha, allumage, jeûnes, tefila du jour et offices.

Une seule fonction, sans dépendance, qui marche **dans Node, dans un navigateur (hors ligne) et en HTTP**.

**Site, bac à sable et documentation : https://youvalteboul.github.io/zmanim-api/**

```js
const API = require('zmanim-api');
API.horaires({ lieu: 'Paris', date: '2026-11-13', jours: 7, minhag: 'ovadia', tzeit: '18f' });
```

```
GET /horaires?lieu=Paris&jours=7&minhag=ovadia&tzeit=18f
```

## Démarrer

```
npm start        # construit, puis lance l'API et le site sur http://localhost:3000
npm test         # construit, puis vérifie le moteur (calj.net, hebcal, Israël, tefila) et l'API
npm run build    # dist/zmanim-api.js, site/openapi.json, site/docs.html
```

Node 18 ou plus. Aucune dépendance à installer.

## Le site

`site/` est le site de présentation : accueil avec un globe 3D en temps réel (Three.js : le Soleil à sa vraie position, la bande dorée de la shqi'a à 16,1°, les villes cliquables avec leurs zmanim, une journée en 30 secondes), un bac à sable qui calcule en direct dans le navigateur, documentation (construite depuis [docs/API.md](docs/API.md)) et référence OpenAPI. Il est entièrement statique : `npm start` le sert avec l'API, et GitHub Pages le publie à chaque push sur `main` (`.github/workflows/pages.yml`, après les tests) ; le bac à sable n'a pas besoin du serveur.

## Organisation

| Fichier | Contenu |
|---|---|
| `src/api.js` | L'API : `horaires(options)`, `villes()`, `avis()`. Valide chaque option et nomme le champ fautif. |
| `src/engine.js` | Le moteur : soleil (Schlyter, comme CalJ), zmanim selon les avis, calendrier hébraïque, fêtes, paracha, tefila. |
| `src/avis.js` | Les avis proposés et les pré-réglages de minhag. |
| `src/villes.js` | 90 villes dans 26 pays (fuseau, minutes d'allumage, calendrier). |
| `src/textes.js` | Les textes renvoyés, en français, anglais et hébreu. |
| `src/serveur.js` | Le serveur HTTP (module `http` de Node seul) : API, `/openapi.json` et le site. |
| `src/openapi.js` | La description OpenAPI 3.1, construite à partir du code. |
| `docs/API.md` | La documentation complète des options et de la réponse. |
| `site/` | Le site de présentation. `docs.html`, `openapi.json` et `zmanim-api.js` y sont produits par `npm run build`. |
| `tests/` | Tests et relevés de référence (calj.net, hebcal diaspora et Israël). |

## Fiabilité

- **Zmanim** : 1 406 valeurs sur 1 406 identiques à calj.net, sur 8 villes (Paris, Charenton, Jérusalem, Marseille, Strasbourg, Londres, New York, Montréal), y compris les colonnes « Rav Ovadia ».
- **Calendrier hébraïque** : chaque jour de 1900 à 2240 comparé au calendrier des navigateurs (ICU).
- **Paracha** : 316 samedis identiques à hebcal en diaspora, 6 années identiques en Israël.

Le moteur vient de l'écran de synagogue (`ecran-synagogue`). Les avis halakhiques et les minutes d'allumage restent à valider avec le rabbin de chaque communauté.

## Licence

[AGPL-3.0](LICENSE) : libre d'utiliser, de modifier et de redistribuer ; une version modifiée, y compris proposée comme service en ligne, doit publier son code sous la même licence.
