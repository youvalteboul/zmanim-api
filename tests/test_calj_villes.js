// Compare le moteur aux relevés calj.net du 19/10/2026 (8 villes, 10 dates, 5 Shabbatot) : node tests/test_calj_villes.js
// Trois cas sont classés à part, car ce sont des défauts de CalJ, pas du moteur :
//  - jour de changement d'heure : CalJ garde le décalage horaire de minuit (tous ses horaires sont faux d'une heure) ;
//  - angle jamais atteint (Londres en juin) : CalJ affiche 0h00 ;
//  - valeur à moins d'une seconde d'une bascule de minute : bruit de calcul entre deux programmes.
'use strict';
const fs = require('fs');
const Z = require('../src/engine.js');

const KEYS = ['korbanot', 'alot_posen', 'alot_ovadia', 'tefilin_posen', 'tefilin_ovadia', 'netz', 'shema_ma', 'shema_gra',
  'tefila', 'hatsot', 'mg', 'mk', 'plag', 'shqia', 'tzeit', 'rt_posen', 'rt_ovadia', 'h_gra', 'h_ma'];

function instants(y, m, d, loc) {
  const z = Z.zmanim(y, m, d, loc), D = z.heureGRA;
  // Avis du Rav Ovadia, calculés par les variantes du moteur (réglages « séfarade »)
  const o = Z.zmanim(y, m, d, Object.assign({}, loc, { methodes: { alot: '72p', misheyakir: '6p', rt: '72p' } }));
  return {
    korbanot: z.netz - 90 * D / 60, alot_posen: z.alot, alot_ovadia: o.alot, tefilin_posen: z.tefilin,
    tefilin_ovadia: o.tefilin, netz: z.netz, shema_ma: z.shemaMA, shema_gra: z.shemaGRA, tefila: z.tefila,
    hatsot: z.hatsot, mg: z.minhaGuedola, mk: z.minhaKetana, plag: z.plag, shqia: z.shqia, tzeit: z.tzeit,
    rt_posen: z.rabenouTam, rt_ovadia: o.rabenouTam,
    // Durées affichées par CalJ : heure GR"A, et « heure M"A » = (tzeit -7,08° − aube -16,1°) / 12
    h_gra: { duree: D }, h_ma: z.alot === null ? null : { duree: (z.tzeit - z.alot) / 12 }
  };
}
const hm = (t, tz, haut) => Z.hhmm(Z.roundCalj(t, haut), tz).replace(':', '').replace(/^0/, '');
const dur = ms => { const mn = Math.floor(Math.floor(ms / 1000) / 60); return Math.floor(mn / 60) + String(mn % 60).padStart(2, '0'); };
function changementHeure(y, m, d, tz) {
  const off = h => { const p = Z.partsInTz(Date.UTC(y, m - 1, d, h), tz); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Date.UTC(y, m - 1, d, h); };
  return off(0) !== off(23);
}

const lines = fs.readFileSync(__dirname + '/donnees/calj_releves.txt', 'utf8').split('\n').filter(l => l && l[0] !== '#');
let city = null;
const n = { ok: 0, total: 0, heure: 0, angle: 0, bord: 0 };
const ecarts = [];
function verifier(nom, exp, t, tz, haut) {
  if (t === null) { n.angle++; return; }
  n.total++;
  if (typeof t === 'object') { if (dur(t.duree) === exp) n.ok++; else ecarts.push(`${nom} : CalJ ${exp}, moteur ${dur(t.duree)}`); return; }
  if (hm(t, tz, haut) === exp) { n.ok++; return; }
  if (hm(t - 1000, tz, haut) === exp || hm(t + 1000, tz, haut) === exp) { n.ok++; n.bord++; return; }
  ecarts.push(`${nom} : CalJ ${exp}, moteur ${hm(t, tz, haut)}`);
}
for (const l of lines) {
  const p = l.split('|');
  if (p[0] === 'C') {
    const c = p[2].split(',');
    city = { nom: p[1], lat: (+c[0] + c[1] / 60) * (c[2] === 'n' ? 1 : -1), lon: (+c[3] + c[4] / 60) * (c[5] === 'e' ? 1 : -1),
      tz: p[3], bougies: p[1] === 'Jerusalem' ? 40 : 18 };
    continue;
  }
  const [y, m, d] = p[1].split('-').map(Number);
  const loc = { lat: city.lat, lon: city.lon, bougies: city.bougies };
  if (p[0] === 'D') {
    const vals = p[2].split(' ');
    if (changementHeure(y, m, d, city.tz)) { n.heure += vals.length; continue; }
    const t = instants(y, m, d, loc);
    KEYS.forEach((k, i) => {
      if (vals[i] === '000' || t[k] === null) { n.angle++; return; }
      verifier(`${city.nom} ${p[1]} ${k}`, vals[i], t[k], city.tz, false);
    });
  } else {
    const [allum, fin] = p[2].split(' ');
    const sam = Z.gregFromRd(Z.rdFromGreg(y, m, d) + 1);
    verifier(`${city.nom} ${p[1]} allumage`, allum, Z.zmanim(y, m, d, loc).bougies, city.tz, false);
    verifier(`${city.nom} ${p[1]} fin de Shabbat`, fin, Z.zmanim(sam.y, sam.m, sam.d, loc).finShabbat, city.tz, true);
  }
}
console.log(`calj.net : ${n.ok}/${n.total} valeurs identiques (dont ${n.bord} à moins d'une seconde d'une bascule de minute)`);
console.log(`Écartées car fausses chez CalJ : ${n.heure} valeurs de jours de changement d'heure, ${n.angle} valeurs d'angles jamais atteints`);
if (ecarts.length) console.log('ÉCARTS :\n' + ecarts.join('\n'));
process.exit(ecarts.length ? 1 : 0);
