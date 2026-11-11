// Ajouts et changements de la tefila : node tests/test_tefila.js
'use strict';
const Z = require('../src/engine.js');
const M = Z.M;
let ok = 0, total = 0;
const echecs = [];
function eq(a, b, msg) { total++; if (a === b) ok++; else echecs.push(`${msg} : attendu ${b}, obtenu ${a}`); }
const G = (y, m, d) => Z.rdFromGreg(y, m, d);
const H = (y, m, d) => Z.rdFromHebrew(y, m, d);
const k = (rd, o, ph) => Z.tefila(rd, o || {}, ph || 'matin').map(x => x.k + (x.pref ? '(' + x.pref + ')' : ''));
const a = (rd, o, ph, cle) => k(rd, o, ph).includes(cle);
const IL = { israel: true };

// 1) Demande de pluie : diaspora 4 décembre au soir (5 si l'année suivante est bissextile), Israël 7 'Heshvan
eq(Z.hiver(G(2026, 12, 4), false), false, 'diaspora 2026 : pas encore le 4 décembre');
eq(Z.hiver(G(2026, 12, 5), false), true, 'diaspora 2026 : dès le soir du 4 (jour hébraïque du 5)');
eq(Z.hiver(G(2027, 12, 5), false), false, 'diaspora 2027 (2028 bissextile) : pas le 5');
eq(Z.hiver(G(2027, 12, 6), false), true, 'diaspora 2027 : dès le soir du 5');
eq(Z.hiver(G(2026, 10, 17), true), false, 'Israël : pas avant le 7 \'Heshvan 5787');
eq(Z.hiver(G(2026, 10, 18), true), true, 'Israël : 7 \'Heshvan 5787 (18 octobre 2026)');
eq(Z.hiver(G(2027, 4, 21), false), true, 'jusqu\'au 14 Nissan inclus');
eq(Z.hiver(G(2027, 4, 22), false), false, 'plus à partir du 15 Nissan');
// Le 5 décembre 2026 est un Shabbat : rappel le Shabbat, « dès ce soir » à l'Arvit de motsaé Shabbat
eq(a(G(2026, 12, 5), {}, 'minha', 'tf_barekh(ceSoir)'), true, 'rappel le Shabbat 5 décembre 2026');
eq(a(G(2026, 12, 6), {}, 'soir', 'tf_barekh(desCeSoir)'), true, '« dès ce soir » le samedi soir');
eq(a(G(2026, 12, 6), { nusach: 'ashkenaze' }, 'soir', 'tf_talOumatar(desCeSoir)'), true, 'ashkénaze : Tal oumatar');
eq(a(G(2026, 10, 18), IL, 'soir', 'tf_barekh(desCeSoir)'), true, 'Israël : dès le soir du 6 \'Heshvan');

// 2) Machiv haroua'h : du Moussaf de Chemini Atseret au Moussaf du 1er jour de Pessa'h
eq(a(G(2026, 10, 3), {}, 'matin', 'tf_mashivMoussaf'), true, '22 Tishri : Machiv haroua\'h dès Moussaf');
eq(Z.machiv(G(2026, 10, 4)), true, 'Machiv le lendemain');
eq(a(G(2027, 4, 22), {}, 'matin', 'tf_moridMoussaf'), true, '15 Nissan, séfarade : Morid hatal dès Moussaf');
eq(a(G(2027, 4, 22), { nusach: 'ashkenaze' }, 'matin', 'tf_stopMashivMoussaf'), true, '15 Nissan, ashkénaze en diaspora : fin de Machiv');
eq(a(G(2027, 4, 22), { nusach: 'ashkenaze', israel: true }, 'matin', 'tf_moridMoussaf'), true, '15 Nissan, ashkénaze en Israël : Morid hatal');
eq(Z.machiv(G(2027, 4, 23)), false, 'plus de Machiv après Pessa\'h');
eq(a(G(2027, 6, 1), { saison: true }, 'matin', 'tf_morid'), true, 'été, séfarade : Morid hatal rappelé');
eq(a(G(2027, 6, 1), { saison: true, nusach: 'ashkenaze' }, 'matin', 'tf_morid'), false, 'été, ashkénaze en diaspora : rien');

// 3) Ta'hanoun (par date, pour 5786 à 5790)
for (let y = 5786; y <= 5790; y++) {
  const sans = [[M.NISSAN, 1], [M.NISSAN, 29], [M.IYAR, 14], [M.IYAR, 18], [M.SIVAN, 1], [M.SIVAN, 12], [M.AV, 15], [M.ELOUL, 29],
    [M.TISHRI, 9], [M.TISHRI, 25], [M.SHEVAT, 15], [M.KISLEV, 25], [M.HESHVAN, 1]];
  for (const [m, d] of sans) eq(Z.sansTahanoun(H(y, m, d)), true, `${y} ${m}/${d} : pas de Ta'hanoun`);
  const avec = [[M.IYAR, 13], [M.SIVAN, 13], [M.HESHVAN, 5], [M.ELOUL, 10], [M.SHEVAT, 14]];
  for (const [m, d] of avec) eq(Z.sansTahanoun(H(y, m, d)), false, `${y} ${m}/${d} : Ta'hanoun dit`);
  // Pourim : Adar ou Adar II ; Pourim katan en année embolismique
  const adar = Z.isLeap(y) ? M.ADAR2 : M.ADAR;
  eq(Z.sansTahanoun(H(y, adar, 14)) && Z.sansTahanoun(H(y, adar, 15)), true, `${y} Pourim et Chouchan Pourim`);
  if (Z.isLeap(y)) eq(Z.sansTahanoun(H(y, M.ADAR, 14)) && Z.sansTahanoun(H(y, M.ADAR, 15)), true, `${y} Pourim katan`);
}
eq(a(G(2026, 10, 13), {}, 'matin', 'tf_pasTahanoun'), false, 'mardi 13 octobre 2026 : Ta\'hanoun dit');
eq(a(G(2026, 10, 12), {}, 'matin', 'tf_pasTahanoun'), true, 'Roch \'Hodech \'Heshvan : pas de Ta\'hanoun');
// Min'ha de la veille d'un jour sans Ta'hanoun (1 Kislev 5787 tombe un mercredi)
const rhK = H(5787, M.KISLEV, 1);
eq(a(rhK - 2, {}, 'minha', 'tf_pasTahanounMinha'), true, 'Min\'ha de la veille de Roch \'Hodech Kislev');

// 4) Roch 'Hodech, Hanouka, fêtes : Hallel, Yaalé veyavo, Moussaf
eq(k(G(2026, 10, 12)).join(), 'tf_yaale,tf_hallelPartiel,tf_moussaf,tf_pasTahanoun', 'Roch \'Hodech \'Heshvan');
const rhTevet = H(5787, M.TEVET, 1);
eq(['tf_yaale', 'tf_alHanissim', 'tf_hallelComplet', 'tf_moussaf'].every(x => a(rhTevet, {}, 'matin', x)), true, 'Roch \'Hodech Tevet pendant Hanouka : Hallel complet');
eq(a(H(5787, M.NISSAN, 16), {}, 'matin', 'tf_hallelComplet'), true, '16 Nissan en diaspora : Hallel complet');
eq(a(H(5787, M.NISSAN, 16), IL, 'matin', 'tf_hallelPartiel'), true, '16 Nissan en Israël (\'hol hamoed) : Hallel partiel');
eq(a(H(5787, M.TISHRI, 18), {}, 'matin', 'tf_hallelComplet'), true, '\'Hol hamoed Souccot : Hallel complet');
eq(a(H(5788, M.ADAR, 14), {}, 'matin', 'tf_alHanissim'), true, 'Pourim 5788 (année simple) : Al hanissim le 14');
eq(a(H(5788, M.ADAR, 14), { pourim15: true }, 'matin', 'tf_alHanissim'), false, 'Jérusalem : pas le 14');
eq(a(H(5788, M.ADAR, 15), { pourim15: true }, 'matin', 'tf_meguila'), true, 'Jérusalem : Méguila le 15');

// 5) Jeûnes et jours redoutables
eq(a(H(5787, M.TEVET, 10), {}, 'minha', 'tf_anenou'), true, '10 Tevet : Anénou');
eq(a(H(5787, M.TEVET, 10), { nusach: 'ashkenaze' }, 'matin', 'tf_avinou'), true, '10 Tevet, ashkénaze : Avinou Malkénou');
const tb = Z.rdFromHebrew(5787, M.AV, 9) + (Z.dow(H(5787, M.AV, 9)) === 6 ? 1 : 0);
eq(a(tb, {}, 'minha', 'tf_nahem'), true, 'Tisha Beav : Na\'hem à Min\'ha');
eq(a(H(5787, M.TISHRI, 5), {}, 'soir', 'tf_hamelekh'), true, 'Dix jours : Hamélekh hakadoch');

// 6) Chabbat Mevarkhim : un par mois sauf Tishri, 1 à 7 jours avant Roch 'Hodech
for (let y = 5786; y <= 5789; y++) {
  let n = 0;
  for (let rd = H(y, M.TISHRI, 1); rd < H(y + 1, M.TISHRI, 1); rd++) if (Z.dow(rd) === 6 && a(rd, {}, 'matin', 'tf_birkat')) n++;
  eq(n, Z.isLeap(y) ? 12 : 11, `${y} : nombre de Chabbatot Mevarkhim`);
}

// 7) Seli'hot : séfarades dès le 2 Elloul ; ashkénazes dès le dimanche, au moins 4 jours avant Roch Hachana
eq(a(G(2026, 8, 16), {}, 'matin', 'tf_selihot'), true, 'séfarade : Seli\'hot le dimanche 16 août 2026 (3 Elloul)');
eq(a(G(2026, 8, 16), { nusach: 'ashkenaze' }, 'matin', 'tf_selihot'), false, 'ashkénaze : pas encore');
eq(a(G(2026, 9, 6), { nusach: 'ashkenaze' }, 'soir', 'tf_selihot'), true, 'ashkénaze 5787 : première nuit motsaé Shabbat 5 septembre');
eq(a(G(2026, 9, 4), { nusach: 'ashkenaze' }, 'matin', 'tf_selihot'), false, 'ashkénaze 5787 : pas avant');

console.log(`Tefila : ${ok}/${total} vérifications réussies`);
if (echecs.length) console.log(echecs.slice(0, 30).join('\n'));
process.exit(echecs.length ? 1 : 0);
