// Calendrier d'Israël : paracha contre hebcal (Israël), jours nationaux, fêtes d'un seul jour : node tests/test_israel.js
'use strict';
const fs = require('fs');
const Z = require('../src/engine.js');
let ok = 0, total = 0;
const echecs = [];
function eq(a, b, msg) { total++; if (a === b) ok++; else echecs.push(`${msg} : attendu ${b}, obtenu ${a}`); }
const IL = { israel: true };

// 1) Paracha en Israël : 6 années de hebcal (5779, 5786 à 5790)
const EN = Z.PARASHOT_EN.map(n => n.replace(/’/g, "'"));
for (const l of fs.readFileSync(__dirname + '/donnees/hebcal_israel.txt', 'utf8').split('\n')) {
  if (!l || l[0] === '#') continue;
  const [date, nom] = l.split('|');
  const [y, m, d] = date.split('-').map(Number);
  const r = Z.readingForShabbat(Z.rdFromGreg(y, m, d), IL);
  if (nom === 'FETE') eq(!!(r && r.fete), true, `${date} fête`);
  else eq(r && !r.fete ? r.en : (r && r.fr), nom, `${date} paracha`);
}

// 2) Jours nationaux (dates de hebcal, jour de l'observance)
const NAT = [
  ['yomhaatsmaout', '2024-05-14'], ['yomhaatsmaout', '2025-05-01'], ['yomhaatsmaout', '2026-04-22'], ['yomhaatsmaout', '2027-05-12'],
  ['yomhaatsmaout', '2028-05-02'], ['yomhaatsmaout', '2029-04-19'], ['yomhaatsmaout', '2030-05-08'], ['yomhaatsmaout', '2031-04-29'],
  ['yomhazikaron', '2025-04-30'], ['yomhazikaron', '2026-04-21'],
  ['yomhashoah', '2024-05-06'], ['yomhashoah', '2025-04-24'], ['yomhashoah', '2026-04-14'], ['yomhashoah', '2027-05-04'],
  ['yomhashoah', '2028-04-24'], ['yomhashoah', '2029-04-12'], ['yomhashoah', '2030-04-30'], ['yomhashoah', '2031-04-21']
];
for (const [id, date] of NAT) {
  const [y, m, d] = date.split('-').map(Number);
  eq(Z.holidaysOnRd(Z.rdFromGreg(y, m, d), IL).some(e => e.id === id), true, `${id} le ${date}`);
  eq(Z.holidaysOnRd(Z.rdFromGreg(y, m, d)).some(e => e.id === id), false, `${id} absent en diaspora par défaut`);
}

// 3) Fêtes d'un seul jour en Israël
const jour = (date, o) => { const [y, m, d] = date.split('-').map(Number); return Z.holidaysOnRd(Z.rdFromGreg(y, m, d), o); };
eq(jour('2027-04-23', IL).map(e => e.type).join(), 'cholhamoed', '16 Nissan 5787 : \'hol hamoed en Israël');
eq(jour('2027-04-23').map(e => e.type).join(), 'yomtov', '16 Nissan 5787 : fête en diaspora');
eq(jour('2027-06-12', IL).some(e => e.type === 'yomtov'), false, '7 Sivan 5787 : jour ordinaire en Israël');
eq(jour('2026-10-03', IL).map(e => e.id).join(), 'sheminisimhat', '22 Tishri 5787 : Shemini Atseret et Simhat Torah le même jour');
eq(jour('2026-10-04', IL).some(e => e.type === 'yomtov'), false, '23 Tishri : pas de fête en Israël');
// Allumage et fin : en Israël, pas de second jour de fête
const info = Z.dayInfo(2027, 4, 22, { lat: 31.7683, lon: 35.2137, bougies: 40, israel: true });
eq(info.events.map(e => e.k).join(), 'fin', 'Pessa\'h 5787 en Israël : fin de fête le premier jour');

console.log(`Israël : ${ok}/${total} vérifications réussies`);
if (echecs.length) console.log(echecs.slice(0, 30).join('\n'));
process.exit(echecs.length ? 1 : 0);
