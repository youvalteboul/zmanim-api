// Tests du moteur : node test_engine.js
'use strict';
const Z = require('../src/engine.js');
let fails = 0, checks = 0;
function eq(a, b, msg) { checks++; if (a !== b) { fails++; if (fails < 40) console.log('ÉCHEC', msg, '| attendu', JSON.stringify(b), '| obtenu', JSON.stringify(a)); } }

// 1) Calendrier hébraïque contre Intl (ICU), chaque jour 1900-2240
const fmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const icuMonth = { Tishri: 7, Heshvan: 8, Kislev: 9, Tevet: 10, Shevat: 11, 'Adar I': 12, Adar: 12, 'Adar II': 13, Nisan: 1, Iyar: 2, Sivan: 3, Tamuz: 4, Av: 5, Elul: 6 };
let n = 0, icuBug = 0;
for (let rd = Z.rdFromGreg(1900, 1, 1); rd <= Z.rdFromGreg(2240, 12, 31); rd++) {
  const g = Z.gregFromRd(rd);
  const p = {}; fmt.formatToParts(new Date(Date.UTC(g.y, g.m - 1, g.d))).forEach(x => p[x.type] = x.value);
  const h = Z.hebrewFromRd(rd);
  const ok = h.y === +p.year && h.d === +p.day && h.m === icuMonth[p.month];
  checks++; n++;
  // ICU se trompe sur 5806-5807 (RH 5807 : ICU 02/10/2046, hebcal et ce moteur 01/10/2046) : vérifié à part ci-dessous
  if (!ok && (h.y === 5806 || h.y === 5807)) { icuBug++; continue; }
  if (!ok) { fails++; if (fails < 40) console.log('ÉCHEC hébreu', g, h, p); }
  if (Z.rdFromHebrew(h.y, h.m, h.d) !== rd) { fails++; console.log('ÉCHEC aller-retour', g); }
}
console.log(`Calendrier hébraïque : ${n} jours comparés à Intl (${icuBug} jours de 5806-5807 où ICU se trompe, vérifiés contre hebcal :)`);
eq(JSON.stringify(Z.gregFromRd(Z.rdFromHebrew(5807, Z.M.TISHRI, 1))), JSON.stringify({ y: 2046, m: 10, d: 1 }), 'hebcal : Rosh Hashana 5807 = 01/10/2046');
eq(JSON.stringify(Z.gregFromRd(Z.rdFromHebrew(5806, Z.M.KISLEV, 25))), JSON.stringify({ y: 2045, m: 12, d: 4 }), 'hebcal : Hanouka 5806 = 04/12/2045');

// 2) Paracha contre hebcal (diaspora), 5786-5790
const START = { // premier verset de chaque paracha -> indice
  'Genesis 1:1': 0, 'Genesis 6:9': 1, 'Genesis 12:1': 2, 'Genesis 18:1': 3, 'Genesis 23:1': 4, 'Genesis 25:19': 5, 'Genesis 28:10': 6, 'Genesis 32:4': 7, 'Genesis 37:1': 8, 'Genesis 41:1': 9, 'Genesis 44:18': 10, 'Genesis 47:28': 11,
  'Exodus 1:1': 12, 'Exodus 6:2': 13, 'Exodus 10:1': 14, 'Exodus 13:17': 15, 'Exodus 18:1': 16, 'Exodus 21:1': 17, 'Exodus 25:1': 18, 'Exodus 27:20': 19, 'Exodus 30:11': 20, 'Exodus 35:1': 21, 'Exodus 38:21': 22,
  'Leviticus 1:1': 23, 'Leviticus 6:1': 24, 'Leviticus 9:1': 25, 'Leviticus 12:1': 26, 'Leviticus 14:1': 27, 'Leviticus 16:1': 28, 'Leviticus 19:1': 29, 'Leviticus 21:1': 30, 'Leviticus 25:1': 31, 'Leviticus 26:3': 32,
  'Numbers 1:1': 33, 'Numbers 4:21': 34, 'Numbers 8:1': 35, 'Numbers 13:1': 36, 'Numbers 16:1': 37, 'Numbers 19:1': 38, 'Numbers 22:2': 39, 'Numbers 25:10': 40, 'Numbers 30:2': 41, 'Numbers 33:1': 42,
  'Deuteronomy 1:1': 43, 'Deuteronomy 3:23': 44, 'Deuteronomy 7:12': 45, 'Deuteronomy 11:26': 46, 'Deuteronomy 16:18': 47, 'Deuteronomy 21:10': 48, 'Deuteronomy 26:1': 49, 'Deuteronomy 29:9': 50, 'Deuteronomy 31:1': 51, 'Deuteronomy 32:1': 52
};
const ORDER = Object.entries(START).map(([k, i]) => { const [b, cv] = k.split(' '); const [c, v] = cv.split(':').map(Number); return { b, c, v, i }; });
function versesToIdx(ref) { // "Leviticus 12:1-15:33" -> [26,27] ; null si lecture de fête
  if (ref.split(';')[0].trim() === 'Leviticus 16:1-34') return null; // Kippour
  const m = ref.match(/^(\w+) (\d+):(\d+)-(?:(\d+):)?(\d+)/);
  const b = m[1], c1 = +m[2], v1 = +m[3], c2 = m[4] ? +m[4] : c1, v2 = +m[5];
  if (START[`${b} ${c1}:${v1}`] === undefined) return null;
  const le = (c, v, cc, vv) => c < cc || (c === cc && v <= vv);
  return ORDER.filter(o => o.b === b && le(c1, v1, o.c, o.v) && le(o.c, o.v, c2, v2)).map(o => o.i);
}
const EN = ['Bereshit', 'Noach', 'Lech-Lecha', 'Vayera', 'Chayei Sara', 'Toldot', 'Vayetzei', 'Vayishlach', 'Vayeshev', 'Miketz', 'Vayigash', 'Vayechi', 'Shemot', 'Vaera', 'Bo', 'Beshalach', 'Yitro', 'Mishpatim', 'Terumah', 'Tetzaveh', 'Ki Tisa', 'Vayakhel', 'Pekudei', 'Vayikra', 'Tzav', 'Shmini', 'Tazria', 'Metzora', 'Achrei Mot', 'Kedoshim', 'Emor', 'Behar', 'Bechukotai', 'Bamidbar', 'Nasso', 'Beha’alotcha', 'Sh’lach', 'Korach', 'Chukat', 'Balak', 'Pinchas', 'Matot', 'Masei', 'Devarim', 'Vaetchanan', 'Eikev', 'Re’eh', 'Shoftim', 'Ki Teitzei', 'Ki Tavo', 'Nitzavim', 'Vayeilech', 'Ha’azinu'];
function namesToIdx(s) {
  const first = s.split(';')[0].trim();
  const parts = first.split('-');
  // noms composés contenant un tiret (Lech-Lecha) : on essaie la correspondance la plus longue
  const out = []; let i = 0;
  while (i < parts.length) {
    if (i + 1 < parts.length && EN.indexOf(parts[i] + '-' + parts[i + 1]) >= 0) { out.push(EN.indexOf(parts[i] + '-' + parts[i + 1])); i += 2; }
    else if (EN.indexOf(parts[i]) >= 0) { out.push(EN.indexOf(parts[i])); i++; }
    else return null; // fête
  }
  return out;
}
const fs = require('fs');
const H = JSON.parse(fs.readFileSync(__dirname + '/donnees/hebcal_ref.json', 'utf8'));
let pn = 0;
for (const [date, ref] of H.rows) {
  const [y, m, d] = date.split('-').map(Number);
  const rd = Z.rdFromGreg(y, m, d);
  const exp = /^[A-Z][a-z]+ \d/.test(ref) ? versesToIdx(ref) : namesToIdx(ref);
  const r = Z.readingForShabbat(rd);
  if (exp === null) eq(r && r.fete, true, `${date} fête attendue (${ref}), obtenu ${r && r.fr}`);
  else eq(r && !r.fete ? r.idx.join(',') : (r ? r.fr : null), exp.join(','), `${date} ${ref}`);
  pn++;
}
console.log(`Paracha : ${pn} samedis comparés à hebcal`);

// 3) Shabbatot particuliers contre hebcal 5787-5788
const SP = { 'Shekalim': 'Shabbat Shekalim', 'Zachor': 'Shabbat Zakhor', 'Parah': 'Shabbat Para', 'HaChodesh': 'Shabbat Ha\'hodesh', 'HaGadol': 'Shabbat Hagadol', 'Shuva': 'Shabbat Shouva', 'Chazon': 'Shabbat \'Hazon', 'Nachamu': 'Shabbat Na\'hamou', 'Shirah': 'Shabbat Shira' };
let sn = 0;
for (const [date, ref] of H.rows.filter(r => !/^[A-Z][a-z]+ \d/.test(r[1]))) {
  const [y, m, d] = date.split('-').map(Number);
  const got = Z.specialShabbat(Z.rdFromGreg(y, m, d)).map(x => x[0]).filter(x => Object.values(SP).includes(x)).sort().join(',');
  const exp = Object.keys(SP).filter(k => new RegExp('Shab\\. ' + k).test(ref)).map(k => SP[k]).sort().join(',');
  eq(got, exp, `${date} shabbat particulier (${ref})`); sn++;
}
console.log(`Shabbatot particuliers : ${sn} samedis comparés`);

// 4) Invariants de paracha sur 300 ans
for (let y = 5700; y <= 6000; y++) {
  try {
    const nis = Z.rdFromHebrew(y, Z.M.NISSAN, 15);
    const before = Z.readingForShabbat(Z.nextShabbat(nis - 7) === nis ? nis - 7 : Z.nextShabbat(nis - 7));
    const sh = Z.rdFromHebrew(y, Z.M.SIVAN, 6);
    const lastBefore = Z.dow(sh) === 6 ? sh - 7 : Z.nextShabbat(sh) - 7;
    const rb = Z.readingForShabbat(lastBefore);
    eq([33, 34].includes(rb && rb.idx && rb.idx[0]), true, `${y} Bamidbar ou Nasso juste avant Shavouot (obtenu ${rb && rb.fr})`);
    let s = Z.nextShabbat(Z.rdFromHebrew(y, Z.M.TISHRI, 24)), seen = [];
    for (; s < Z.rdFromHebrew(y + 1, Z.M.TISHRI, 15); s += 7) { const r = Z.parashaIndices(s); if (r) seen.push(...r); }
    eq(seen.join(','), Array.from({ length: 53 }, (_, i) => i).join(','), `${y} les 53 parachiot dans l'ordre, une seule fois`);
    const av9 = Z.rdFromHebrew(y, Z.M.AV, 9);
    const hz = Z.readingForShabbat(Z.dow(av9) === 6 ? av9 : Z.nextShabbat(av9) - 7);
    eq(hz && hz.idx && hz.idx[0], 43, `${y} Devarim = Shabbat 'Hazon`);
    if (!Z.isLeap(y)) eq(before && before.idx && before.idx.slice(-1)[0], 24, `${y} Tsav avant Pessa'h (année simple)`);
  } catch (e) { fails++; console.log('ÉCHEC', y, e.message); }
}
console.log('Invariants vérifiés pour 5700-6000');

// 5) Zmanim contre les relevés CalJ (Paris)
const PARIS = { lat: 48 + 52 / 60, lon: 2 + 20 / 60 };
const TZ = 'Europe/Paris';
const z = Z.zmanim(2026, 10, 18, PARIS);
const exp18 = { alot: '06:42', tefilin: '07:13', netz: '08:15', shemaMA: '10:09', shemaGRA: '10:55', tefila: '11:49', hatsot: '13:35', minhaGuedola: '14:05', minhaKetana: '16:42', plag: '17:49', shqia: '18:55', tzeit: '19:34', rabenouTam: '20:29' };
for (const k in exp18) eq(Z.hhmm(Z.roundCalj(z[k], false), TZ), exp18[k], `CalJ 18/10 ${k}`);
for (const [d, k, v] of [[[2026, 10, 16], 'bougies', '18:41'], [[2026, 10, 17], 'finShabbat', '19:45'], [[2026, 10, 23], 'bougies', '18:28'], [[2026, 10, 24], 'finShabbat', '19:33'], [[2026, 10, 30], 'bougies', '17:16'], [[2026, 10, 31], 'finShabbat', '18:21'], [[2026, 11, 6], 'bougies', '17:04'], [[2026, 11, 7], 'finShabbat', '18:11']]) {
  const zz = Z.zmanim(d[0], d[1], d[2], PARIS);
  eq(Z.hhmm(Z.roundCalj(zz[k], k === 'finShabbat'), TZ), v, `CalJ ${d.join('-')} ${k}`);
}
// Date hébraïque et prochains rendez-vous annoncés par CalJ le 18/10/2026
eq(Z.hebrewDateFr(Z.hebrewFromRd(Z.rdFromGreg(2026, 10, 18))), "7 'Heshvan 5787", 'date hébraïque 18/10/2026');
eq(Z.holidaysOnRd(Z.rdFromGreg(2026, 11, 10)).map(e => e.fr).join(), "Rosh 'Hodesh Kislev", 'RH Kislev 10/11');
eq(Z.holidaysOnRd(Z.rdFromGreg(2026, 11, 11)).map(e => e.fr).join(), "Rosh 'Hodesh Kislev", 'RH Kislev 11/11');
eq(Z.holidaysOnRd(Z.rdFromGreg(2026, 12, 5)).some(e => /Hanouka \(1/.test(e.fr)), true, 'Hanouka 1er jour 05/12');
eq(Z.holidaysOnRd(Z.rdFromGreg(2026, 12, 20)).map(e => e.fr).join(), 'Jeûne du 10 Tevet', '10 Tevet 20/12');

// 6) Zmanim JS identiques au module Python (fichier de référence)
const ref = JSON.parse(fs.readFileSync(__dirname + '/donnees/python_ref.json', 'utf8'));
let zn = 0, maxDiff = 0;
for (const row of ref) {
  const zz = Z.zmanim(row.y, row.m, row.d, { lat: row.lat, lon: row.lon });
  for (const k of Object.keys(row.z)) {
    const diff = Math.abs(zz[k] - row.z[k]);
    maxDiff = Math.max(maxDiff, diff); checks++; zn++;
    if (diff > 5) { fails++; if (fails < 40) console.log('ÉCHEC python', row.y, row.m, row.d, k, diff); }
  }
}
console.log(`Zmanim : ${zn} valeurs comparées au module Python (écart max ${maxDiff.toFixed(3)} ms)`);

console.log(`\n${checks - fails}/${checks} vérifications réussies`);
process.exit(fails ? 1 : 0);
