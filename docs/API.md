# Documentation

Zmanim, date hébraïque, fêtes, paracha, allumage, jeûnes, tefila du jour et offices : tout passe par **une seule fonction**, `horaires(options)`, qui renvoie du JSON. Avec les réglages par défaut, les horaires sont identiques à ceux de calj.net (règles Or Méïr · Rav Posen, même arrondi).

## Installation

| Où | Comment |
|---|---|
| Node 18 ou plus | `npm install github:youvalteboul/zmanim-api`, puis `const API = require('zmanim-api')`. Ou copier `src/` et `require('./src/api.js')`. |
| Navigateur | `<script src="zmanim-api.js"></script>` (le fichier `dist/zmanim-api.js`, un seul script sans dépendance), puis `ZmanimAPI.horaires(…)`. Aucune connexion nécessaire. |
| HTTP | `npm start` (port 3000, ou `PORT=8080 npm start`), puis `GET /horaires?lieu=Paris`. Le même serveur sert ce site. Description OpenAPI : `/openapi.json`. |

## Le plus simple

```js
ZmanimAPI.horaires({ lieu: 'Paris' })            // aujourd'hui, avis Or Méïr (CalJ)
ZmanimAPI.horaires({ lieu: 'Paris', date: '2026-11-13', jours: 7 })
ZmanimAPI.horaires({ lieu: 'Jerusalem', minhag: 'ovadia', langue: 'he' })
```

```
GET /horaires?lieu=Paris&jours=7&zmanim=netz,shqia,tzeit
GET /horaires?lieu=Marseille&minhag=ovadia&tzeit=18f&format=iso
```

## Options

Toutes facultatives, sauf le lieu. Une option invalide lève une erreur `ErreurAPI` (`e.champ` nomme le champ, `e.code === 'OPTION_INVALIDE'`) ; par HTTP, une réponse 400 `{ erreur, champ }`.

### Lieu

| Option | Valeurs | Défaut |
|---|---|---|
| `lieu` | nom de ville (`'Paris'`, `'charenton'`, `'ירושלים'`, `'New York'` : sans accents ni majuscules, un début de nom suffit s'il n'y a pas d'ambiguïté), `'48.85,2.35'`, ou `{ lat, lon, tz, nom, bougies, israel }` | — |
| `lat`, `lon` | degrés (remplacent ceux de la ville) | |
| `tz` | fuseau IANA (`'Europe/Paris'`) | celui de la ville ; pour des coordonnées, celui de la ville connue la plus proche (à moins de 25 km), sinon obligatoire |
| `bougies` | minutes d'allumage avant la shqi'a | 18 (40 à Jérusalem…) |
| `israel` | calendrier d'Israël (un jour de fête, paracha d'Israël) | selon le pays |
| `joursIsrael` | jours nationaux israéliens | comme `israel` |

La liste des villes : `ZmanimAPI.villes('fr')` ou `GET /villes?langue=fr`.

### Avis (minhag)

| Option | Valeurs | Défaut |
|---|---|---|
| `minhag` | `ormeir` (Or Méïr · Rav Posen, CalJ), `ovadia` (Rav Ovadia Yossef), `standard` (ashkénaze, hebcal) | `ormeir` |
| `alot` | aube | selon le minhag |
| `misheyakir` | talit et tefilin | |
| `tzeit` | sortie des étoiles | |
| `fin` | fin de Shabbat et des fêtes ; en plus : `rt` (heure de Rabénou Tam), `min` (avec `finMinutes`) | |
| `finMinutes` | minutes après la shqi'a si `fin=min` | 50 |
| `rt` | nuit de Rabénou Tam | |
| `plag` | `gra`, `ma` (Maguen Avraham), `yy` (Yalkout Yossef) | |

Ces avis se donnent au premier niveau (`{ tzeit: '18f' }`, `?tzeit=18f`) ou groupés (`{ avis: { tzeit: '18f' } }`). Ils partent du minhag choisi et le remplacent avis par avis.

**Avis libres** : en plus des codes proposés dans les réglages (`ZmanimAPI.avis()` ou `GET /avis`), `alot`, `misheyakir`, `tzeit`, `fin` et `rt` acceptent n'importe quelle valeur :

| Code | Sens | Exemple |
|---|---|---|
| `18`, `12.5` | soleil à N degrés sous l'horizon | `alot: '18'` |
| `120p` | N minutes proportionnelles (heure GR"A / 60) | `alot: '120p'` = 120 min proportionnelles avant le netz |
| `45f` | N minutes fixes | `tzeit: '45f'` = 45 min après la shqi'a |

Les minutes se comptent avant le netz pour `alot`, après l'aube choisie pour `misheyakir`, après la shqi'a pour `tzeit`, `fin` et `rt`. Le Maguen Avraham compte sa journée de l'aube choisie à la « nuit » symétrique (18° → 18°, 120p → 120p).

La réponse rappelle les avis appliqués (`avis.methodes`) et le minhag reconnu (`avis.minhag`, ou `personnalise`).

### Dates et présentation

| Option | Valeurs | Défaut |
|---|---|---|
| `date` | `'AAAA-MM-JJ'`, objet `Date` (lu dans le fuseau du lieu), `'aujourdhui'` | aujourd'hui dans le fuseau du lieu |
| `jours` | nombre de jours à partir de `date` (1 à 366) | 1 |
| `zmanim` | liste ou texte séparé par des virgules, parmi `alot tefilin netz shemaMA shemaGRA tefilaMA tefila hatsot minhaGuedola minhaKetana plag bougies shqia tzeit finShabbat rabenouTam` | tous |
| `format` | `hhmm` (`'07:56'`), `iso` (`'2026-11-13T07:56:00+01:00'`), `ms` (millisecondes depuis 1970) | `hhmm` |
| `arrondi` | `calj` (minute inférieure, fin de Shabbat à la minute supérieure, comme CalJ et l'écran), `proche`, `aucun` (à la seconde) | `calj` |
| `langue` | `fr`, `en`, `he` (noms des jours, fêtes, paracha, événements, tefila) | `fr` |
| `calendrier` | date hébraïque, fêtes, paracha, Omer, allumage et jeûnes | `true` |
| `tefila` | ajouts de la tefila du jour (Hallel, Yaalé veyavo, Al hanissim…) | `false` |
| `nusach` | `sefarade`, `ashkenaze`, `sfard` (pour la tefila) | selon le minhag |

Un zman qui n'existe pas ce jour-là (angle jamais atteint, au nord en été) vaut `null`.

### Zmanim ajoutés

`ajouts` : vos propres horaires, calculés chaque jour.

```js
ajouts: {
  korbanot:   { ref: 'netz',  proportionnelles: -90 },               // 1 h ½ proportionnelle avant le netz
  minhaTot:   { ref: 'shqia', minutes: -20, arrondi: 'bas5' },       // shqi'a − 20 min, aux 5 min inférieures
  nuitStricte:{ angle: 12 },                                          // soleil à 12° le soir
  aube18:     { angle: 18, moment: 'matin' }
}
```

`ref` : un des zmanim ci-dessus. `arrondi` : `basN`, `hautN` ou `procheN` (N minutes), facultatif.

### Offices

`offices` : même format que les réglages de l'écran. `jours` : 0 = dimanche … 5 = vendredi **ou veille de fête**, 6 = Shabbat **ou fête** (tous les jours si absent).

```js
offices: [
  { nom: "Cha'harit", jours: [0, 1, 2, 3, 4, 5], heure: '07:00' },
  { nom: "Cha'harit", jours: [6], heure: '09:00' },
  { nom: "Min'ha", ref: 'shqia', decalage: -15, arrondi: 'bas5' },
  { nom: 'Arvit', jours: [6], ref: 'finShabbat' }
]
```

Par HTTP, `ajouts` et `offices` se passent en JSON : dans le corps d'un `POST /horaires`, ou dans le paramètre (`?offices=[…]`, encodé).

## Réponse

```jsonc
{
  "version": 1,
  "lieu": { "nom": "Charenton-le-Pont", "lat": 48.8265, "lon": 2.405, "tz": "Europe/Paris", "israel": false, "bougies": 18 },
  "avis": { "minhag": "ormeir", "methodes": { "alot": "16.1", "misheyakir": "11", "tzeit": "7.08", "fin": "8.5", … }, "nusach": "sefarade" },
  "reglages": { "langue": "fr", "format": "hhmm", "arrondi": "calj" },
  "jours": [{
    "date": "2026-11-13", "jourSemaine": 5, "nomJour": "vendredi",
    "zmanim": { "alot": "06:18", "tefilin": "06:50", "netz": "07:56", …, "finShabbat": "18:04", "rabenouTam": "18:50" },
    "ajouts": { "korbanot": "06:46" },
    "offices": [{ "nom": "Cha'harit", "heure": "07:00" }, { "nom": "Min'ha", "heure": "16:55" }],
    "hebreu": { "jour": 3, "mois": 9, "annee": 5787, "nomMois": "Kislev", "texte": "3 Kislev 5787" },
    "fetes": [], "shabbat": false, "yomTov": false,
    "paracha": { "nom": "Toledot", "fete": false, "date": "2026-11-14" },
    "shabbatParticulier": [], "omer": null,
    "evenements": [{ "cle": "bougies", "nom": "Allumage des bougies", "heure": "16:54" }],
    "tefila": []   // avec tefila: true ; à Hanouka : [{ "cle": "tf_alHanissim", "nom": "Al hanissim" }, …]
  }]
}
```

- `fetes[].type` : `yomtov`, `cholhamoed`, `jeune`, `roshhodesh`, `mineur`, `national`.
- `paracha` : la lecture du Shabbat de la semaine (le jour même s'il est samedi) ; `fete: true` quand c'est la lecture d'une fête.
- `evenements[].cle` : `bougies`, `bougies2` (allumage du second soir, pas avant), `fin`, `debutJeune`, `finJeune`.
- `mois` : 1 Nissan … 7 Tishri … 12 Adar (Adar I), 13 Adar II.

## Exemples

Horaires du Shabbat d'une communauté séfarade de Marseille, en ISO pour un autre programme :

```
GET /horaires?lieu=Marseille&date=2026-11-13&jours=2&minhag=ovadia&format=iso&zmanim=bougies,finShabbat,rabenouTam
```

Toute une année pour imprimer un calendrier :

```js
const an = API.horaires({ lieu: 'Strasbourg', date: '2027-01-01', jours: 365, zmanim: 'alot,netz,shqia,tzeit', calendrier: true });
```

Depuis une autre page web, sans serveur :

```html
<script src="zmanim-api.js"></script>
<script>
  const j = ZmanimAPI.horaires({ lieu: { lat: 45.5017, lon: -73.5673, tz: 'America/Toronto' }, langue: 'en' }).jours[0];
  document.querySelector('#shqia').textContent = j.zmanim.shqia;
</script>
```
