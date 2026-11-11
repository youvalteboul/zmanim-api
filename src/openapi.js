// Description OpenAPI 3.1 de l'API HTTP (servie en /openapi.json, construite par build.js).
// Les listes de valeurs viennent du code (zmanim, minhagim, avis), pour rester à jour.
'use strict';
const API = require('./api.js');
const Avis = require('./avis.js');

module.exports = function (version) {
  const MINHAGIM = Avis.PRESETS.map(p => p.id);
  const codes = k => Avis.METHODES[k].map(x => x[0]);
  const heure = { type: ['string', 'integer', 'null'], description: 'Selon `format` : "07:56", "2026-11-13T07:56:00+01:00" ou millisecondes. null si le zman n\'existe pas ce jour-là (angle jamais atteint).' };
  const avisLibre = (k, sens) => ({
    type: 'string',
    description: `Code proposé (${codes(k).join(', ')}) ou avis libre : degrés sous l'horizon (« 18 »), minutes proportionnelles (« 120p ») ou fixes (« 45f ») ${sens}.`,
    examples: [codes(k)[0]]
  });
  const param = (name, schema, description, exemple) => ({ name, in: 'query', required: false, description, schema, example: exemple });

  const Options = {
    type: 'object',
    description: 'Options de calcul. Seul le lieu est obligatoire (lieu, ou lat et lon).',
    properties: {
      lieu: { description: 'Nom de ville (français, anglais ou hébreu, sans accents ni majuscules ; un début de nom sans ambiguïté suffit), « lat,lon », ou objet.',
        oneOf: [{ type: 'string', examples: ['Paris', 'charenton', '48.85,2.35'] },
          { type: 'object', properties: { nom: { type: 'string' }, lat: { type: 'number' }, lon: { type: 'number' }, tz: { type: 'string' }, bougies: { type: 'number' }, israel: { type: 'boolean' } }, required: ['lat', 'lon'] }] },
      lat: { type: 'number', minimum: -90, maximum: 90 },
      lon: { type: 'number', minimum: -180, maximum: 180 },
      tz: { type: 'string', description: 'Fuseau IANA. Par défaut celui de la ville, ou de la ville connue la plus proche (25 km).', examples: ['Europe/Paris'] },
      bougies: { type: 'number', minimum: 0, maximum: 120, description: 'Minutes d\'allumage avant la shqi\'a (18 par défaut, 40 à Jérusalem…).' },
      israel: { type: 'boolean', description: 'Calendrier d\'Israël (un jour de fête, paracha d\'Israël). Par défaut selon le pays.' },
      joursIsrael: { type: 'boolean', description: 'Jours nationaux israéliens.' },
      date: { type: 'string', format: 'date', description: 'AAAA-MM-JJ (1900 à 2239). Par défaut : aujourd\'hui dans le fuseau du lieu.' },
      jours: { type: 'integer', minimum: 1, maximum: 366, default: 1 },
      minhag: { type: 'string', enum: MINHAGIM, default: 'ormeir' },
      alot: avisLibre('alot', 'avant le netz'),
      misheyakir: avisLibre('misheyakir', 'après l\'aube'),
      tzeit: avisLibre('tzeit', 'après la shqi\'a'),
      fin: avisLibre('fin', 'après la shqi\'a ; aussi « rt » et « min »'),
      finMinutes: { type: 'number', minimum: 0, maximum: 240, description: 'Minutes après la shqi\'a si fin = min.' },
      rt: avisLibre('rt', 'après la shqi\'a'),
      plag: { type: 'string', enum: codes('plag') },
      avis: { type: 'object', description: 'Les mêmes avis, groupés.', additionalProperties: { type: 'string' } },
      zmanim: { description: 'Zmanim à renvoyer (tous par défaut).', oneOf: [{ type: 'string', examples: ['netz,shqia,tzeit'] }, { type: 'array', items: { type: 'string', enum: API.ZMANIM } }] },
      format: { type: 'string', enum: ['hhmm', 'iso', 'ms'], default: 'hhmm' },
      arrondi: { type: 'string', enum: ['calj', 'proche', 'aucun'], default: 'calj', description: 'calj : minute inférieure, fin de Shabbat à la minute supérieure.' },
      langue: { type: 'string', enum: ['fr', 'en', 'he'], default: 'fr' },
      calendrier: { type: 'boolean', default: true },
      tefila: { type: 'boolean', default: false },
      nusach: { type: 'string', enum: ['sefarade', 'ashkenaze', 'sfard'] },
      ajouts: { type: 'object', description: 'Vos propres zmanim, par nom.', additionalProperties: { $ref: '#/components/schemas/Ajout' } },
      offices: { type: 'array', items: { $ref: '#/components/schemas/Office' } }
    }
  };

  return {
    openapi: '3.1.0',
    info: {
      title: 'Zmanim API', version,
      summary: 'Horaires juifs réglables avis par avis, en JSON.',
      description: 'Zmanim selon les règles de CalJ (Or Méïr · Rav Posen), Rav Ovadia Yossef ou hebcal, et n\'importe quel avis libre ; date hébraïque, fêtes (diaspora et Israël), paracha, allumage, jeûnes, tefila du jour et offices. Mêmes calculs dans Node, dans un navigateur (hors ligne) ou par cette API HTTP.'
    },
    servers: [{ url: 'http://localhost:3000', description: 'npm start' }],
    tags: [{ name: 'Horaires' }, { name: 'Catalogues' }],
    paths: {
      '/horaires': {
        get: {
          tags: ['Horaires'], operationId: 'horaires', summary: 'Horaires d\'un ou plusieurs jours',
          description: 'Toutes les options en paramètres. `ajouts` et `offices` se passent en JSON encodé, ou par POST.',
          parameters: [
            param('lieu', { type: 'string' }, 'Ville, ou « lat,lon ».', 'Paris'),
            param('lat', { type: 'number' }, 'Latitude.'), param('lon', { type: 'number' }, 'Longitude.'),
            param('tz', { type: 'string' }, 'Fuseau IANA.'),
            param('date', { type: 'string', format: 'date' }, 'AAAA-MM-JJ.', '2026-11-13'),
            param('jours', { type: 'integer', minimum: 1, maximum: 366 }, 'Nombre de jours.', 7),
            param('minhag', { type: 'string', enum: MINHAGIM }, 'Pré-réglage des avis.'),
            ...['alot', 'misheyakir', 'tzeit', 'fin', 'rt'].map(k => param(k, { type: 'string' }, Options.properties[k].description)),
            param('finMinutes', { type: 'number' }, 'Minutes après la shqi\'a si fin = min.'),
            param('plag', { type: 'string', enum: codes('plag') }, 'Plag hamin\'ha.'),
            param('bougies', { type: 'number' }, 'Minutes d\'allumage.'),
            param('israel', { type: 'boolean' }, 'Calendrier d\'Israël.'),
            param('zmanim', { type: 'string' }, 'Liste séparée par des virgules.', 'netz,shqia,tzeit'),
            param('format', { type: 'string', enum: ['hhmm', 'iso', 'ms'] }, 'Format des heures.'),
            param('arrondi', { type: 'string', enum: ['calj', 'proche', 'aucun'] }, 'Arrondi.'),
            param('langue', { type: 'string', enum: ['fr', 'en', 'he'] }, 'Langue des noms.'),
            param('calendrier', { type: 'boolean' }, 'Date hébraïque, fêtes, paracha, événements.'),
            param('tefila', { type: 'boolean' }, 'Ajouts de la tefila.'),
            param('nusach', { type: 'string', enum: ['sefarade', 'ashkenaze', 'sfard'] }, 'Nousa\'h.'),
            param('ajouts', { type: 'string' }, 'JSON : { nom: { ref, minutes | proportionnelles, arrondi } | { angle, moment } }.'),
            param('offices', { type: 'string' }, 'JSON : liste d\'offices.')
          ],
          responses: { 200: { $ref: '#/components/responses/Horaires' }, 400: { $ref: '#/components/responses/Erreur' } }
        },
        post: {
          tags: ['Horaires'], operationId: 'horairesPost', summary: 'Horaires, options en JSON',
          requestBody: { required: true, content: { 'application/json': { schema: Options, examples: {
            shabbat: { summary: 'Shabbat à Marseille, Rav Ovadia', value: { lieu: 'Marseille', date: '2026-11-13', jours: 2, minhag: 'ovadia', zmanim: ['bougies', 'finShabbat', 'rabenouTam'] } },
            communaute: { summary: 'Offices et zmanim ajoutés', value: { lieu: 'Charenton', date: '2026-11-14', ajouts: { korbanot: { ref: 'netz', proportionnelles: -90 } },
              offices: [{ nom: 'Cha\'harit', jours: [6], heure: '09:00' }, { nom: 'Min\'ha', ref: 'shqia', decalage: -15, arrondi: 'bas5' }] } }
          } } } },
          responses: { 200: { $ref: '#/components/responses/Horaires' }, 400: { $ref: '#/components/responses/Erreur' } }
        }
      },
      '/villes': {
        get: { tags: ['Catalogues'], operationId: 'villes', summary: 'Villes connues',
          parameters: [param('langue', { type: 'string', enum: ['fr', 'en', 'he'] }, 'Langue des noms.')],
          responses: { 200: { description: 'Liste des villes', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Ville' } } } } } } }
      },
      '/avis': {
        get: { tags: ['Catalogues'], operationId: 'avis', summary: 'Avis et minhagim disponibles',
          parameters: [param('langue', { type: 'string', enum: ['fr', 'en', 'he'] }, 'Langue des libellés.')],
          responses: { 200: { description: 'Catalogue', content: { 'application/json': { schema: { $ref: '#/components/schemas/Catalogue' } } } } } }
      },
      '/api': { get: { tags: ['Catalogues'], operationId: 'aide', summary: 'Aide courte', responses: { 200: { description: 'Routes et exemple' } } } }
    },
    components: {
      schemas: {
        Options,
        Ajout: {
          description: 'Zman ajouté : décalage depuis un zman, ou angle du soleil.',
          oneOf: [
            { type: 'object', required: ['ref'], properties: { ref: { type: 'string', enum: API.ZMANIM }, minutes: { type: 'number' }, proportionnelles: { type: 'number' }, arrondi: { type: 'string', pattern: '^(aucun|(bas|haut|proche)\\d{1,2})$' } } },
            { type: 'object', required: ['angle'], properties: { angle: { type: 'number' }, moment: { type: 'string', enum: ['matin', 'soir'], default: 'soir' }, arrondi: { type: 'string' } } }
          ]
        },
        Office: {
          type: 'object', description: 'Heure fixe (heure) ou relative à un zman (ref, decalage, arrondi). jours : 0 = dimanche … 5 = vendredi ou veille de fête, 6 = Shabbat ou fête.',
          properties: { nom: { type: 'string' }, jours: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 } }, heure: { type: 'string', pattern: '^\\d{1,2}:\\d{2}$' },
            ref: { type: 'string', enum: API.ZMANIM }, decalage: { type: 'number' }, arrondi: { type: 'string' }, note: { type: 'string' } }
        },
        Reponse: {
          type: 'object',
          properties: {
            version: { type: 'integer' },
            lieu: { type: 'object', properties: { nom: { type: ['string', 'null'] }, lat: { type: 'number' }, lon: { type: 'number' }, tz: { type: 'string' }, tzDeduit: { type: 'boolean' }, israel: { type: 'boolean' }, bougies: { type: 'number' } } },
            avis: { type: 'object', properties: { minhag: { type: 'string', description: 'Minhag reconnu, ou « personnalise ».' }, methodes: { type: 'object' }, nusach: { type: 'string' } } },
            reglages: { type: 'object', properties: { langue: { type: 'string' }, format: { type: 'string' }, arrondi: { type: 'string' } } },
            jours: { type: 'array', items: { $ref: '#/components/schemas/Jour' } }
          }
        },
        Jour: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' }, jourSemaine: { type: 'integer', description: '0 = dimanche' }, nomJour: { type: 'string' },
            zmanim: { type: 'object', properties: Object.fromEntries(API.ZMANIM.map(k => [k, heure])) },
            ajouts: { type: 'object', additionalProperties: heure },
            offices: { type: 'array', items: { type: 'object', properties: { nom: { type: 'string' }, heure, note: { type: 'string' } } } },
            hebreu: { type: 'object', properties: { jour: { type: 'integer' }, mois: { type: 'integer', description: '1 Nissan … 7 Tishri … 12 Adar (I), 13 Adar II' }, annee: { type: 'integer' }, nomMois: { type: 'string' }, texte: { type: 'string' } } },
            fetes: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, type: { type: 'string', enum: ['yomtov', 'cholhamoed', 'jeune', 'roshhodesh', 'mineur', 'national'] }, nom: { type: 'string' } } } },
            shabbat: { type: 'boolean' }, yomTov: { type: 'boolean' },
            paracha: { type: ['object', 'null'], properties: { nom: { type: 'string' }, fete: { type: 'boolean' }, date: { type: 'string', format: 'date' } } },
            shabbatParticulier: { type: 'array', items: { type: 'string' } },
            omer: { type: ['integer', 'null'] },
            evenements: { type: 'array', items: { type: 'object', properties: { cle: { type: 'string', enum: ['bougies', 'bougies2', 'fin', 'debutJeune', 'finJeune'] }, nom: { type: 'string' }, heure } } },
            tefila: { type: 'array', items: { type: 'object', properties: { cle: { type: 'string' }, nom: { type: 'string' } } } }
          }
        },
        Ville: { type: 'object', properties: { nom: { type: 'string' }, id: { type: 'string' }, pays: { type: 'string' }, nomPays: { type: 'string' }, lat: { type: 'number' }, lon: { type: 'number' }, tz: { type: 'string' }, bougies: { type: 'number' }, israel: { type: 'boolean' } } },
        Catalogue: { type: 'object', properties: { methodes: { type: 'object' }, libres: { type: 'string' }, minhagim: { type: 'array', items: { type: 'object' } }, zmanim: { type: 'array', items: { type: 'string' } } } },
        Erreur: { type: 'object', properties: { erreur: { type: 'string' }, champ: { type: 'string', description: 'Option fautive, ex. avis.alot' } }, required: ['erreur'] }
      },
      responses: {
        Horaires: { description: 'Horaires calculés', content: { 'application/json': { schema: { $ref: '#/components/schemas/Reponse' } } } },
        Erreur: { description: 'Option invalide', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' }, example: { erreur: 'avis.alot : « abc » non reconnu', champ: 'avis.alot' } } } }
      }
    }
  };
};
