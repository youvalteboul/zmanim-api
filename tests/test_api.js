// API (src/api.js) et son serveur HTTP (src/serveur.js) : node tests/test_api.js
'use strict';
const API = require('../src/api.js');
const Z = require('../src/engine.js');
const Avis = require('../src/avis.js');
const { demarrer } = require('../src/serveur.js');
let ok = 0, total = 0;
const echecs = [];
function v(c, msg) { total++; if (c) ok++; else echecs.push(msg); }
function erreur(o) { try { API.horaires(o); return null; } catch (e) { return e; } }

// --- Mêmes horaires que l'écran (moteur + arrondi CalJ) ---
const CHARENTON = { lat: 48.8265, lon: 2.405, bougies: 18 };
const r = API.horaires({ lieu: 'Charenton-le-Pont', date: '2026-11-13' });
const z = Z.zmanim(2026, 11, 13, CHARENTON);
for (const k of API.ZMANIM) {
  v(r.jours[0].zmanim[k] === Z.hhmm(Z.roundCalj(z[k], k === 'finShabbat'), 'Europe/Paris'), `${k} identique au moteur`);
}
v(r.lieu.tz === 'Europe/Paris' && r.avis.minhag === 'ormeir', 'ville reconnue, minhag par défaut Or Méïr');
v(r.jours[0].paracha.nom === 'Toledot', 'paracha de la semaine');
v(r.jours[0].evenements.some(e => e.cle === 'bougies' && e.heure === r.jours[0].zmanim.bougies), 'allumage du vendredi');
v(r.jours[0].hebreu.texte === '3 Kislev 5787', 'date hébraïque');

// --- Lieu ---
v(API.horaires({ lieu: 'paris' }).lieu.nom === 'Paris', 'ville sans majuscule');
v(API.horaires({ lieu: 'ירושלים' }).lieu.israel === true, 'ville en hébreu, calendrier d\'Israël');
v(API.horaires({ lieu: 'Jerusalem' }).lieu.bougies === 40, 'minutes d\'allumage de la ville');
v(API.horaires({ lieu: 'Jerusalem', bougies: 30 }).lieu.bougies === 30, 'allumage réglable');
const coord = API.horaires({ lieu: '48.85,2.35' });
v(coord.lieu.tz === 'Europe/Paris' && coord.lieu.tzDeduit, 'coordonnées : fuseau déduit de la ville proche');
v(API.horaires({ lat: 40, lon: -74, tz: 'America/New_York' }).lieu.tz === 'America/New_York', 'coordonnées libres');
v(erreur({ lat: 0, lon: -30 }).champ === 'tz', 'fuseau exigé loin des villes connues');
v(erreur({ lieu: 'Atlantide' }).champ === 'lieu', 'ville inconnue');
v(erreur({}).champ === 'lieu', 'lieu obligatoire');
v(erreur({ lat: 99, lon: 0, tz: 'UTC' }).champ === 'lat', 'latitude hors limites');
v(erreur({ lieu: 'Paris', tz: 'Mars/Olympus' }).champ === 'tz', 'fuseau inconnu');

// --- Avis : pré-réglages, codes connus et avis libres ---
const ov = API.horaires({ lieu: 'Paris', date: '2026-03-20', minhag: 'ovadia', calendrier: false });
v(ov.avis.minhag === 'ovadia' && ov.avis.nusach === 'sefarade', 'pré-réglage Rav Ovadia');
v(API.horaires({ lieu: 'Paris', minhag: 'ovadia', tzeit: '7.08' }).avis.minhag === 'personnalise', 'avis modifié : personnalisé');
v(API.horaires({ lieu: 'Paris', avis: { alot: '72p' } }).avis.methodes.alot === '72p', 'avis en objet');
// Avis libres = mêmes valeurs que les codes du tableau quand ils coïncident
const libre = Z.zmanim(2026, 3, 20, Object.assign({ methodes: { alot: '72.0p', tzeit: '18.0f', rt: '16.10' } }, CHARENTON));
const tab = Z.zmanim(2026, 3, 20, Object.assign({ methodes: { alot: '72p', tzeit: '18f', rt: '16.1' } }, CHARENTON));
v(libre.alot === tab.alot && libre.tzeit === tab.tzeit && libre.rabenouTam === tab.rabenouTam, 'avis libre = code connu équivalent');
const deg = Z.zmanim(2026, 3, 20, Object.assign({ methodes: { alot: '18', tzeit: '45f', misheyakir: '30f', fin: '13.5p' } }, CHARENTON));
v(deg.alot === Z.sunEvent(2026, 3, 20, CHARENTON.lat, CHARENTON.lon, -18, true), 'aube à 18°');
v(deg.tzeit === deg.shqia + 45 * 60000, 'tzeit 45 min fixes');
v(deg.tefilin === deg.alot + 30 * 60000, 'tefilin 30 min fixes après l\'aube');
v(Math.abs(deg.finShabbat - (deg.shqia + deg.heureGRA * 13.5 / 60)) < 1, 'fin de Shabbat 13,5 min proportionnelles');
for (const k of Object.keys(Avis.METHODES)) for (const [code] of Avis.METHODES[k]) {
  v(!erreur({ lieu: 'Paris', [k]: code }), `code connu accepté : ${k} ${code}`);
}
for (const [k, code] of [['alot', 'abc'], ['alot', '95'], ['tzeit', '-5'], ['plag', '18'], ['inconnu', '1'], ['tzeit', '700f']]) {
  const e = k === 'inconnu' ? erreur({ lieu: 'Paris', avis: { [k]: code } }) : erreur({ lieu: 'Paris', [k]: code });
  v(e && e.code === 'OPTION_INVALIDE' && e.champ === 'avis.' + k, `avis refusé : ${k} ${code}`);
}
v(erreur({ lieu: 'Paris', minhag: 'x' }).champ === 'minhag', 'minhag inconnu');
// Hautes latitudes : un angle jamais atteint donne null, pas une heure fausse
v(API.horaires({ lieu: 'Paris', date: '2026-06-21', alot: '18' }).jours[0].zmanim.alot === null, 'angle jamais atteint : null');

// --- Dates, plage, formats, arrondis ---
const sem = API.horaires({ lieu: 'Paris', date: '2026-11-08', jours: 7, calendrier: false });
v(sem.jours.length === 7 && sem.jours[6].date === '2026-11-14' && sem.jours[6].jourSemaine === 6, 'sept jours');
v(API.horaires({ lieu: 'Paris', date: new Date(Date.UTC(2026, 10, 12, 23, 30)) }).jours[0].date === '2026-11-13', 'objet Date lu dans le fuseau du lieu');
v(/^\d{4}-\d{2}-\d{2}$/.test(API.horaires({ lieu: 'Paris' }).jours[0].date), 'date par défaut : aujourd\'hui');
for (const d of ['2026-02-30', '13/11/2026', '1800-01-01']) v(erreur({ lieu: 'Paris', date: d }).champ === 'date', `date refusée : ${d}`);
for (const n of [0, 367, 1.5, 'x']) v(erreur({ lieu: 'Paris', jours: n }).champ === 'jours', `jours refusé : ${n}`);
const iso = API.horaires({ lieu: 'Paris', date: '2026-11-13', format: 'iso' }).jours[0].zmanim;
v(iso.netz === '2026-11-13T07:56:00+01:00', 'format ISO avec décalage d\'hiver');
v(API.horaires({ lieu: 'Paris', date: '2026-07-01', format: 'iso' }).jours[0].zmanim.netz.endsWith('+02:00'), 'format ISO avec décalage d\'été');
v(new Date(iso.netz).getTime() === Z.roundCalj(Z.zmanim(2026, 11, 13, { lat: 48.8566, lon: 2.3522 }).netz, false), 'ISO = instant exact');
const ms = API.horaires({ lieu: 'Paris', date: '2026-11-13', format: 'ms', arrondi: 'aucun' }).jours[0].zmanim;
v(typeof ms.netz === 'number' && ms.netz % 60000 !== 0, 'millisecondes sans arrondi');
const ny = API.horaires({ lieu: 'New York', date: '2026-11-13', format: 'iso' }).jours[0].zmanim.netz;
v(ny.endsWith('-05:00'), 'décalage négatif');
const filtre = API.horaires({ lieu: 'Paris', zmanim: 'netz,shqia' }).jours[0].zmanim;
v(Object.keys(filtre).join() === 'netz,shqia', 'choix des zmanim (texte)');
v(Object.keys(API.horaires({ lieu: 'Paris', zmanim: ['tzeit'] }).jours[0].zmanim).join() === 'tzeit', 'choix des zmanim (liste)');
v(erreur({ lieu: 'Paris', zmanim: 'netz,lune' }).champ === 'zmanim', 'zman inconnu');
v(erreur({ lieu: 'Paris', format: 'xml' }).champ === 'format', 'format inconnu');
v(!('hebreu' in API.horaires({ lieu: 'Paris', calendrier: 'false' }).jours[0]), 'calendrier désactivable');

// --- Langues ---
const he = API.horaires({ lieu: 'Paris', date: '2026-11-14', langue: 'he' }).jours[0];
v(he.paracha.nom === 'תולדות' && he.nomJour === 'שבת', 'noms en hébreu');
v(API.horaires({ lieu: 'Paris', date: '2026-11-14', langue: 'en' }).jours[0].evenements[0].nom === 'Shabbat ends', 'événements en anglais');
v(erreur({ lieu: 'Paris', langue: 'de' }).champ === 'langue', 'langue inconnue');

// --- Fêtes, Israël, tefila ---
const rh = API.horaires({ lieu: 'Paris', date: '2026-09-12', jours: 2 });
v(rh.jours.every(j => j.fetes.some(f => f.id === 'roshhashana')), 'Rosh Hashana, deux jours');
const souccot8 = d => API.horaires({ lieu: d, date: '2026-10-03' }).jours[0].fetes.map(f => f.id);
v(souccot8('Paris').indexOf('sheminiatseret') >= 0 && souccot8('Jerusalem').indexOf('sheminisimhat') >= 0, 'diaspora / Israël');
v(API.horaires({ lieu: 'Paris', date: '2026-09-12', israel: true }).lieu.israel, 'calendrier d\'Israël forcé');
const tf = API.horaires({ lieu: 'Paris', date: '2026-12-10', tefila: true }).jours[0].tefila;
v(tf.some(x => x.cle === 'tf_alHanissim' && x.nom === 'Al hanissim'), 'tefila de Hanouka');
v(API.horaires({ lieu: 'Paris', date: '2027-04-25' }).jours[0].omer > 0, 'Omer');

// --- Zmanim ajoutés ---
const aj = API.horaires({ lieu: 'Charenton', date: '2026-11-13', format: 'ms', ajouts: {
  korbanot: { ref: 'netz', proportionnelles: -90 }, avant: { ref: 'shqia', minutes: -30, arrondi: 'bas5' }, nuit: { angle: 12 }, aube: { angle: 16.1, moment: 'matin' }
} }).jours[0];
v(aj.ajouts.korbanot === Z.roundCalj(z.netz - z.heureGRA * 1.5, false), 'ajout en minutes proportionnelles');
v(new Date(aj.ajouts.avant).getUTCMinutes() % 5 === 0 && aj.ajouts.avant <= Z.roundCalj(z.shqia, false) - 30 * 60000, 'ajout arrondi aux 5 minutes inférieures');
v(aj.ajouts.aube === aj.zmanim.alot, 'ajout par angle = aube à 16,1°');
v(aj.ajouts.nuit === Z.roundCalj(Z.sunEvent(2026, 11, 13, 48.8265, 2.405, -12, false), false), 'ajout par angle le soir');
v(API.horaires({ lieu: 'Paris', ajouts: '{"x":{"ref":"netz","minutes":10}}' }).jours[0].ajouts.x, 'ajouts en JSON (texte)');
for (const a of [{ x: { ref: 'lune', minutes: 1 } }, { x: { ref: 'netz' } }, { x: { ref: 'netz', minutes: 1, proportionnelles: 1 } }, { x: { angle: 100 } }, { x: { ref: 'netz', minutes: 1, arrondi: 'bas0' } }, '{']) {
  v((erreur({ lieu: 'Paris', ajouts: a }) || {}).code === 'OPTION_INVALIDE', `ajout refusé : ${JSON.stringify(a)}`);
}

// --- Offices ---
const off = [
  { nom: 'Cha\'harit', jours: [0, 1, 2, 3, 4, 5], heure: '07:00' },
  { nom: 'Cha\'harit Shabbat', jours: [6], heure: '09:00' },
  { nom: 'Min\'ha', ref: 'shqia', decalage: -15, arrondi: 'bas5' },
  { nom: 'Arvit', jours: [6], ref: 'finShabbat' }
];
const vend = API.horaires({ lieu: 'Charenton', date: '2026-11-13', offices: off }).jours[0].offices;
v(vend.map(o => o.nom).join() === 'Cha\'harit,Min\'ha' && vend[0].heure === '07:00', 'offices du vendredi, triés');
v(vend[1].heure === '16:55', 'Min\'ha shqi\'a − 15 arrondie aux 5 min');
const sam = API.horaires({ lieu: 'Charenton', date: '2026-11-14', offices: off }).jours[0].offices;
v(sam.map(o => o.nom).join() === 'Cha\'harit Shabbat,Min\'ha,Arvit' && sam[2].heure === '18:03', 'offices du Shabbat');
const ydt = API.horaires({ lieu: 'Paris', date: '2026-09-12', offices: off }).jours[0].offices;
v(ydt[0].nom === 'Cha\'harit Shabbat', 'Rosh Hashana : offices du Shabbat');
for (const o of [{ heure: '25:00' }, { jours: [7], heure: '08:00' }, { ref: 'lune' }, 'x']) {
  v((erreur({ lieu: 'Paris', offices: [o] }) || {}).code === 'OPTION_INVALIDE', `office refusé : ${JSON.stringify(o)}`);
}

// --- Chaque texte renvoyé existe dans les trois langues ---
const Textes = require('../src/textes.js');
for (const l of ['fr', 'en', 'he']) for (const k of Object.keys(Textes.L.fr)) v(Textes.L[l][k] !== undefined, `texte ${k} en ${l}`);
for (let d = Z.rdFromGreg(2026, 1, 1); d < Z.rdFromGreg(2028, 1, 1); d++) for (const nus of ['sefarade', 'ashkenaze']) {
  for (const x of Z.tefila(d, { nusach: nus }).concat(Z.tefila(d, { nusach: nus, israel: true }))) if (!(x.k in Textes.L.fr)) v(false, 'texte manquant : ' + x.k);
  const g = Z.gregFromRd(d), di = Z.dayInfo(g.y, g.m, g.d, CHARENTON);
  for (const e of di.events) if (!(e.lk in Textes.L.fr)) v(false, 'texte manquant : ' + e.lk);
}

// --- Catalogues ---
v(API.villes().length > 80 && API.villes('he').some(x => x.nom === 'ירושלים'), 'liste des villes');
const cat = API.avis('en');
v(cat.minhagim.length === Avis.PRESETS.length && cat.methodes.alot[0].nom === '16.1° below the horizon', 'liste des avis');

// --- Serveur HTTP ---
(async () => {
  const s = demarrer(0, true);
  await new Promise(ok => s.on('listening', ok));
  const base = `http://localhost:${s.address().port}`;
  const get = async (p, init) => { const r = await fetch(base + p, init); return { statut: r.status, json: await r.json(), cors: r.headers.get('access-control-allow-origin') }; };
  let x = await get('/horaires?lieu=Charenton-le-Pont&date=2026-11-13&zmanim=netz,shqia');
  v(x.statut === 200 && x.json.jours[0].zmanim.netz === r.jours[0].zmanim.netz && x.cors === '*', 'GET /horaires');
  x = await get('/horaires?lieu=Paris&alot=72p&tzeit=18f&jours=3&calendrier=0');
  v(x.statut === 200 && x.json.avis.methodes.alot === '72p' && x.json.jours.length === 3 && !x.json.jours[0].hebreu, 'GET avec avis et options');
  x = await get('/horaires?lieu=Paris&alot=zzz');
  v(x.statut === 400 && x.json.champ === 'avis.alot', 'GET : erreur 400 qui nomme le champ');
  x = await get('/horaires', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lieu: 'Charenton', date: '2026-11-14', offices: off }) });
  v(x.statut === 200 && x.json.jours[0].offices.length === 3, 'POST /horaires avec offices');
  x = await get('/horaires', { method: 'POST', body: '{pas du json' });
  v(x.statut === 400, 'POST : JSON invalide');
  x = await get('/horaires', { method: 'POST', body: '[1]' });
  v(x.statut === 400, 'POST : liste refusée');
  x = await get('/villes?langue=en');
  v(x.statut === 200 && x.json.some(c => c.nom === 'London'), 'GET /villes');
  x = await get('/avis');
  v(x.statut === 200 && x.json.minhagim.length === 3, 'GET /avis');
  x = await get('/api');
  v(x.statut === 200 && x.json.routes, 'GET /api (aide)');
  let page = await fetch(base + '/');
  v(page.status === 200 && /text\/html/.test(page.headers.get('content-type')), 'GET / : site de présentation');
  page = await fetch(base + '/openapi.json');
  v(page.status === 200 && (await page.json()).openapi, 'GET /openapi.json');
  page = await fetch(base + '/..%2Fpackage.json');
  v(page.status === 404, 'pas de sortie du dossier du site');
  x = await get('/rien');
  v(x.statut === 404, 'route inconnue');
  s.close();

  console.log(`API : ${ok}/${total} vérifications réussies`);
  if (echecs.length) { echecs.forEach(e => console.log('  ✗ ' + e)); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
