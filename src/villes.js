/* Pays et villes proposés dans les réglages et l'assistant (centre-ville ; pour plus de précision,
 * saisir les coordonnées de la synagogue). Choisir une ville pré-remplit : coordonnées, fuseau horaire,
 * calendrier (Israël ou diaspora), minutes d'allumage selon l'usage local, et la langue suggérée.
 * bougies : 18 min par défaut ; Jérusalem 40, Haïfa et Zikhron Ya'akov 30 (usages repris par hebcal). */
(function (root) {
  'use strict';
  // code : [français, anglais, hébreu, langue suggérée, calendrier d'Israël]
  var PAYS = {
    FR: ['France', 'France', 'צרפת', 'fr'], BE: ['Belgique', 'Belgium', 'בלגיה', 'fr'], CH: ['Suisse', 'Switzerland', 'שווייץ', 'fr'],
    IL: ['Israël', 'Israel', 'ישראל', 'he', true], GB: ['Royaume-Uni', 'United Kingdom', 'בריטניה', 'en'], GI: ['Gibraltar', 'Gibraltar', 'גיברלטר', 'en'],
    US: ['États-Unis', 'United States', 'ארצות הברית', 'en'], CA: ['Canada', 'Canada', 'קנדה', 'en'], MX: ['Mexique', 'Mexico', 'מקסיקו', 'en'],
    PA: ['Panama', 'Panama', 'פנמה', 'en'], AR: ['Argentine', 'Argentina', 'ארגנטינה', 'en'], BR: ['Brésil', 'Brazil', 'ברזיל', 'en'],
    MA: ['Maroc', 'Morocco', 'מרוקו', 'fr'], TN: ['Tunisie', 'Tunisia', 'תוניסיה', 'fr'], ZA: ['Afrique du Sud', 'South Africa', 'דרום אפריקה', 'en'],
    IT: ['Italie', 'Italy', 'איטליה', 'en'], ES: ['Espagne', 'Spain', 'ספרד', 'en'], NL: ['Pays-Bas', 'Netherlands', 'הולנד', 'en'],
    DE: ['Allemagne', 'Germany', 'גרמניה', 'en'], AT: ['Autriche', 'Austria', 'אוסטריה', 'en'], HU: ['Hongrie', 'Hungary', 'הונגריה', 'en'],
    CZ: ['Tchéquie', 'Czechia', 'צ׳כיה', 'en'], RU: ['Russie', 'Russia', 'רוסיה', 'en'], UA: ['Ukraine', 'Ukraine', 'אוקראינה', 'en'],
    TR: ['Turquie', 'Turkey', 'טורקיה', 'en'], AU: ['Australie', 'Australia', 'אוסטרליה', 'en']
  };
  var V = [
    // pays, français, anglais, hébreu, latitude, longitude, fuseau, bougies, langue (si différente du pays)
    ['FR', 'Paris', 'Paris', 'פריז', 48.8667, 2.3333, 'Europe/Paris'],
    ['FR', 'Charenton-le-Pont', 'Charenton-le-Pont', 'שרנטון-לה-פון', 48.8265, 2.405, 'Europe/Paris'],
    ['FR', 'Boulogne-Billancourt', 'Boulogne-Billancourt', 'בולון-בילנקור', 48.8397, 2.2399, 'Europe/Paris'],
    ['FR', 'Créteil', 'Créteil', 'קרטיי', 48.7904, 2.4556, 'Europe/Paris'],
    ['FR', 'Le Raincy', 'Le Raincy', 'לה ראנסי', 48.8990, 2.5170, 'Europe/Paris'],
    ['FR', 'Levallois-Perret', 'Levallois-Perret', 'לבלואה-פרה', 48.8950, 2.2875, 'Europe/Paris'],
    ['FR', 'Neuilly-sur-Seine', 'Neuilly-sur-Seine', 'נויי-סור-סן', 48.8846, 2.2697, 'Europe/Paris'],
    ['FR', 'Saint-Mandé', 'Saint-Mandé', 'סן-מנדה', 48.8422, 2.4186, 'Europe/Paris'],
    ['FR', 'Saint-Maur-des-Fossés', 'Saint-Maur-des-Fossés', 'סן-מור-דה-פוסה', 48.7994, 2.4997, 'Europe/Paris'],
    ['FR', 'Sarcelles', 'Sarcelles', 'סרסל', 48.9973, 2.3800, 'Europe/Paris'],
    ['FR', 'Vincennes', 'Vincennes', 'ונסן', 48.8474, 2.4392, 'Europe/Paris'],
    ['FR', 'Bordeaux', 'Bordeaux', 'בורדו', 44.8378, -0.5792, 'Europe/Paris'],
    ['FR', 'Grenoble', 'Grenoble', 'גרנובל', 45.1885, 5.7245, 'Europe/Paris'],
    ['FR', 'Lille', 'Lille', 'ליל', 50.6292, 3.0573, 'Europe/Paris'],
    ['FR', 'Lyon', 'Lyon', 'ליון', 45.7640, 4.8357, 'Europe/Paris'],
    ['FR', 'Marseille', 'Marseille', 'מרסיי', 43.2965, 5.3698, 'Europe/Paris'],
    ['FR', 'Metz', 'Metz', 'מץ', 49.1193, 6.1757, 'Europe/Paris'],
    ['FR', 'Montpellier', 'Montpellier', 'מונפלייה', 43.6108, 3.8767, 'Europe/Paris'],
    ['FR', 'Nancy', 'Nancy', 'ננסי', 48.6921, 6.1844, 'Europe/Paris'],
    ['FR', 'Nice', 'Nice', 'ניס', 43.7102, 7.2620, 'Europe/Paris'],
    ['FR', 'Strasbourg', 'Strasbourg', 'שטרסבורג', 48.5734, 7.7521, 'Europe/Paris'],
    ['FR', 'Toulouse', 'Toulouse', 'טולוז', 43.6047, 1.4442, 'Europe/Paris'],
    ['BE', 'Anvers', 'Antwerp', 'אנטוורפן', 51.2194, 4.4025, 'Europe/Brussels'],
    ['BE', 'Bruxelles', 'Brussels', 'בריסל', 50.8503, 4.3517, 'Europe/Brussels'],
    ['CH', 'Bâle', 'Basel', 'באזל', 47.5596, 7.5886, 'Europe/Zurich'],
    ['CH', 'Genève', 'Geneva', 'ז׳נבה', 46.2044, 6.1432, 'Europe/Zurich'],
    ['CH', 'Lausanne', 'Lausanne', 'לוזאן', 46.5197, 6.6323, 'Europe/Zurich'],
    ['CH', 'Zurich', 'Zurich', 'ציריך', 47.3769, 8.5417, 'Europe/Zurich'],
    ['IL', 'Jérusalem', 'Jerusalem', 'ירושלים', 31.7683, 35.2137, 'Asia/Jerusalem', 40],
    ['IL', 'Tel Aviv', 'Tel Aviv', 'תל אביב', 32.0853, 34.7818, 'Asia/Jerusalem'],
    ['IL', 'Haïfa', 'Haifa', 'חיפה', 32.7940, 34.9896, 'Asia/Jerusalem', 30],
    ['IL', 'Ashdod', 'Ashdod', 'אשדוד', 31.8044, 34.6553, 'Asia/Jerusalem'],
    ['IL', 'Ashkelon', 'Ashkelon', 'אשקלון', 31.6688, 34.5743, 'Asia/Jerusalem'],
    ['IL', 'Beer-Sheva', 'Beersheba', 'באר שבע', 31.2518, 34.7913, 'Asia/Jerusalem'],
    ['IL', 'Beit Shemesh', 'Beit Shemesh', 'בית שמש', 31.7470, 34.9881, 'Asia/Jerusalem'],
    ['IL', 'Bnei Brak', 'Bnei Brak', 'בני ברק', 32.0807, 34.8338, 'Asia/Jerusalem'],
    ['IL', 'Eilat', 'Eilat', 'אילת', 29.5577, 34.9519, 'Asia/Jerusalem'],
    ['IL', 'Herzliya', 'Herzliya', 'הרצליה', 32.1663, 34.8436, 'Asia/Jerusalem'],
    ['IL', 'Ma\'ale Adoumim', 'Ma\'ale Adumim', 'מעלה אדומים', 31.7770, 35.2980, 'Asia/Jerusalem'],
    ['IL', 'Modiin', 'Modi\'in', 'מודיעין', 31.8980, 35.0104, 'Asia/Jerusalem'],
    ['IL', 'Nahariya', 'Nahariya', 'נהריה', 33.0089, 35.0981, 'Asia/Jerusalem'],
    ['IL', 'Netanya', 'Netanya', 'נתניה', 32.3215, 34.8532, 'Asia/Jerusalem'],
    ['IL', 'Petah Tikva', 'Petah Tikva', 'פתח תקווה', 32.0840, 34.8878, 'Asia/Jerusalem'],
    ['IL', 'Raanana', 'Ra\'anana', 'רעננה', 32.1848, 34.8713, 'Asia/Jerusalem'],
    ['IL', 'Rehovot', 'Rehovot', 'רחובות', 31.8928, 34.8113, 'Asia/Jerusalem'],
    ['IL', 'Rishon LeZion', 'Rishon LeZion', 'ראשון לציון', 31.9730, 34.7925, 'Asia/Jerusalem'],
    ['IL', 'Safed', 'Safed', 'צפת', 32.9646, 35.4960, 'Asia/Jerusalem'],
    ['IL', 'Tibériade', 'Tiberias', 'טבריה', 32.7959, 35.5310, 'Asia/Jerusalem'],
    ['IL', 'Zikhron Ya\'akov', 'Zichron Ya\'akov', 'זכרון יעקב', 32.5707, 34.9542, 'Asia/Jerusalem', 30],
    ['GB', 'Londres', 'London', 'לונדון', 51.5074, -0.1278, 'Europe/London'],
    ['GB', 'Gateshead', 'Gateshead', 'גייטסהד', 54.9527, -1.6034, 'Europe/London'],
    ['GB', 'Manchester', 'Manchester', 'מנצ׳סטר', 53.4808, -2.2426, 'Europe/London'],
    ['GI', 'Gibraltar', 'Gibraltar', 'גיברלטר', 36.1408, -5.3536, 'Europe/Gibraltar'],
    ['US', 'New York', 'New York', 'ניו יורק', 40.7128, -74.0060, 'America/New_York'],
    ['US', 'Brooklyn', 'Brooklyn', 'ברוקלין', 40.6782, -73.9442, 'America/New_York'],
    ['US', 'Lakewood', 'Lakewood', 'לייקווד', 40.0821, -74.2097, 'America/New_York'],
    ['US', 'Baltimore', 'Baltimore', 'בולטימור', 39.2904, -76.6122, 'America/New_York'],
    ['US', 'Boston', 'Boston', 'בוסטון', 42.3601, -71.0589, 'America/New_York'],
    ['US', 'Miami', 'Miami', 'מיאמי', 25.7617, -80.1918, 'America/New_York'],
    ['US', 'Chicago', 'Chicago', 'שיקגו', 41.8781, -87.6298, 'America/Chicago'],
    ['US', 'Los Angeles', 'Los Angeles', 'לוס אנג׳לס', 34.0522, -118.2437, 'America/Los_Angeles'],
    ['CA', 'Montréal', 'Montreal', 'מונטריאול', 45.5019, -73.5674, 'America/Toronto', 18, 'fr'],
    ['CA', 'Toronto', 'Toronto', 'טורונטו', 43.6532, -79.3832, 'America/Toronto'],
    ['MX', 'Mexico', 'Mexico City', 'מקסיקו סיטי', 19.4326, -99.1332, 'America/Mexico_City'],
    ['PA', 'Panama', 'Panama City', 'פנמה סיטי', 8.9824, -79.5199, 'America/Panama'],
    ['AR', 'Buenos Aires', 'Buenos Aires', 'בואנוס איירס', -34.6037, -58.3816, 'America/Argentina/Buenos_Aires'],
    ['BR', 'São Paulo', 'São Paulo', 'סאו פאולו', -23.5505, -46.6333, 'America/Sao_Paulo'],
    ['MA', 'Casablanca', 'Casablanca', 'קזבלנקה', 33.5731, -7.5898, 'Africa/Casablanca'],
    ['MA', 'Marrakech', 'Marrakesh', 'מרקש', 31.6295, -7.9811, 'Africa/Casablanca'],
    ['TN', 'Djerba', 'Djerba', 'ג׳רבה', 33.8076, 10.8451, 'Africa/Tunis'],
    ['TN', 'Tunis', 'Tunis', 'תוניס', 36.8065, 10.1815, 'Africa/Tunis'],
    ['ZA', 'Johannesburg', 'Johannesburg', 'יוהנסבורג', -26.2041, 28.0473, 'Africa/Johannesburg'],
    ['ZA', 'Le Cap', 'Cape Town', 'קייפטאון', -33.9249, 18.4241, 'Africa/Johannesburg'],
    ['IT', 'Milan', 'Milan', 'מילאנו', 45.4642, 9.1900, 'Europe/Rome'],
    ['IT', 'Rome', 'Rome', 'רומא', 41.9028, 12.4964, 'Europe/Rome'],
    ['ES', 'Barcelone', 'Barcelona', 'ברצלונה', 41.3874, 2.1686, 'Europe/Madrid'],
    ['ES', 'Madrid', 'Madrid', 'מדריד', 40.4168, -3.7038, 'Europe/Madrid'],
    ['NL', 'Amsterdam', 'Amsterdam', 'אמסטרדם', 52.3676, 4.9041, 'Europe/Amsterdam'],
    ['DE', 'Berlin', 'Berlin', 'ברלין', 52.5200, 13.4050, 'Europe/Berlin'],
    ['DE', 'Francfort', 'Frankfurt', 'פרנקפורט', 50.1109, 8.6821, 'Europe/Berlin'],
    ['DE', 'Munich', 'Munich', 'מינכן', 48.1351, 11.5820, 'Europe/Berlin'],
    ['AT', 'Vienne', 'Vienna', 'וינה', 48.2082, 16.3738, 'Europe/Vienna'],
    ['HU', 'Budapest', 'Budapest', 'בודפשט', 47.4979, 19.0402, 'Europe/Budapest'],
    ['CZ', 'Prague', 'Prague', 'פראג', 50.0755, 14.4378, 'Europe/Prague'],
    ['RU', 'Moscou', 'Moscow', 'מוסקבה', 55.7558, 37.6173, 'Europe/Moscow'],
    ['UA', 'Kiev', 'Kyiv', 'קייב', 50.4501, 30.5234, 'Europe/Kiev'],
    ['UA', 'Odessa', 'Odesa', 'אודסה', 46.4825, 30.7233, 'Europe/Kiev'],
    ['TR', 'Istanbul', 'Istanbul', 'איסטנבול', 41.0082, 28.9784, 'Europe/Istanbul'],
    ['AU', 'Melbourne', 'Melbourne', 'מלבורן', -37.8136, 144.9631, 'Australia/Melbourne'],
    ['AU', 'Sydney', 'Sydney', 'סידני', -33.8688, 151.2093, 'Australia/Sydney']
  ];
  var VILLES = V.map(function (v) {
    var p = PAYS[v[0]];
    return { pays: v[0], nom: v[1], noms: { fr: v[1], en: v[2], he: v[3] }, lat: v[4], lon: v[5], tz: v[6],
      bougies: v[7] || 18, langue: v[8] || p[3], israel: !!p[4] };
  });
  // Fuseaux proposés si le navigateur ne fournit pas la liste complète (Intl.supportedValuesOf)
  var FUSEAUX = [];
  VILLES.forEach(function (v) { if (FUSEAUX.indexOf(v.tz) < 0) FUSEAUX.push(v.tz); });
  FUSEAUX.sort();
  function nomPays(code, lang) { var p = PAYS[code]; return p ? p[{ fr: 0, en: 1, he: 2 }[lang] || 0] : code; }
  function nomVille(v, lang) { return v.noms[lang] || v.nom; }
  // Ville la plus proche de coordonnées (pour reconnaître une ville saisie ou localisée), à moins de ~25 km
  function proche(lat, lon) {
    var best = -1, dmin = 0.05;
    VILLES.forEach(function (v, i) {
      var d = Math.pow(v.lat - lat, 2) + Math.pow((v.lon - lon) * Math.cos(lat * Math.PI / 180), 2);
      if (d < dmin) { dmin = d; best = i; }
    });
    return best;
  }
  var api = { VILLES: VILLES, PAYS: PAYS, FUSEAUX: FUSEAUX, nomPays: nomPays, nomVille: nomVille, proche: proche };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Villes = api;
})(this);
