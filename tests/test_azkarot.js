// Azkarot (yahrzeit) : node tests/test_azkarot.js
'use strict';
const Z = require('../src/engine.js');
const M = Z.M;
let ok = 0, total = 0;
const echecs = [];
function eq(a, b, msg) { total++; if (a === b) ok++; else echecs.push(`${msg} : attendu ${b}, obtenu ${a}`); }
const G = (y, m, d) => Z.rdFromGreg(y, m, d);
const iso = rd => { const g = Z.gregFromRd(rd); return `${g.y}-${String(g.m).padStart(2, '0')}-${String(g.d).padStart(2, '0')}`; };
const proch = (mort, apres, depuis, o) => iso(Z.prochaineAzkara(mort, apres, depuis, o || {}));

// Décès le 14 Adar 5780 (année simple, 10 mars 2020) ; 5784 est embolismique
eq(proch(G(2020, 3, 10), false, G(2024, 1, 1)), '2024-02-23', 'Adar simple vers année embolismique : Adar I (ashkénaze), Pourim katan 2024');
eq(proch(G(2020, 3, 10), false, G(2024, 1, 1), { adar2: true }), '2024-03-24', 'Adar simple vers année embolismique : Adar II (séfarade), Pourim 2024');
eq(proch(G(2020, 3, 10), false, G(2021, 1, 1)), '2021-02-26', 'Adar simple vers année simple : 14 Adar 5781 (Pourim 2021)');
// Décès le 14 Adar II 5784 (24 mars 2024) : toujours le dernier Adar
eq(proch(G(2024, 3, 24), false, G(2024, 4, 1)), '2025-03-14', 'Adar II vers année simple : 14 Adar 5785 (Pourim 2025)');
// Après la shqi'a : le jour hébraïque suivant
eq(Z.hebrewFromRd(Z.prochaineAzkara(G(2020, 3, 10), true, G(2021, 1, 1), {})).d, 15, 'décès après la shqi\'a : jour suivant');
// Jamais avant le premier anniversaire, et toujours à partir de la date demandée
const r = Z.prochaineAzkara(G(2026, 10, 1), false, G(2026, 10, 2), {});
eq(Z.hebrewFromRd(r).y, Z.hebrewFromRd(G(2026, 10, 1)).y + 1, 'premier anniversaire l\'année suivante');
// 30 'Heshvan et 30 Kislev : si le mois est court l'année suivant le décès, la veille du 1er du mois suivant
for (let y = 5770; y < 5800; y++) for (const [m, s] of [[M.HESHVAN, M.KISLEV], [M.KISLEV, M.TEVET]]) {
  const r30 = Z.rdFromHebrew(y, m, 30);
  if (Z.hebrewFromRd(r30).m !== m) continue; // pas de 30 cette année
  const court = Z.hebrewFromRd(Z.rdFromHebrew(y + 1, m, 30)).m !== m;
  for (const hy of [y + 1, y + 2, y + 3]) {
    const a = Z.yahrzeit(Z.hebrewFromRd(r30), hy, {});
    if (court) eq(a, Z.rdFromHebrew(hy, s, 1) - 1, `${y} 30/${m} → ${hy} : veille du 1/${s}`);
    else eq(Z.hebrewFromRd(a).m === m || a === Z.rdFromHebrew(hy, s, 1), true, `${y} 30/${m} → ${hy} : 30 du mois (ou 1er du suivant)`);
  }
}
console.log(`Azkarot : ${ok}/${total} vérifications réussies`);
if (echecs.length) console.log(echecs.join('\n'));
process.exit(echecs.length ? 1 : 0);
