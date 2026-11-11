/* Moteur de calcul pour l'écran de synagogue.
 * - Zmanim : règles CalJ (méthode des degrés, Or Méïr / Rav Posen), algorithme de Schlyter,
 *   arrondi CalJ (minute inférieure ; fin de Shabbat / fête à la minute supérieure).
 *   Validé à l'identique sur 27 valeurs publiées par calj.net.
 * - Calendrier hébraïque : arithmétique classique (molad, reports), sans dépendance au navigateur.
 * - Fêtes et paracha : règles de la diaspora.
 */
(function (root) {
  'use strict';

  // ---------- Jours fixes (R.D. : 1 = lundi 1er janvier an 1) ----------
  var RD_UNIX_EPOCH = 719163; // 1970-01-01
  function rdFromGreg(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 86400000) + RD_UNIX_EPOCH; }
  function gregFromRd(rd) {
    var dt = new Date((rd - RD_UNIX_EPOCH) * 86400000);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }
  function dow(rd) { return ((rd % 7) + 7) % 7; } // 0 = dimanche … 6 = samedi

  // ---------- Calendrier hébraïque (Reingold & Dershowitz) ----------
  // Mois : 1 Nissan … 6 Eloul, 7 Tishri … 12 Adar (Adar I en année embolismique), 13 Adar II
  var NISSAN = 1, IYAR = 2, SIVAN = 3, TAMOUZ = 4, AV = 5, ELOUL = 6, TISHRI = 7, HESHVAN = 8,
      KISLEV = 9, TEVET = 10, SHEVAT = 11, ADAR = 12, ADAR2 = 13;
  var HEBREW_EPOCH = -1373427;
  var cacheNY = {};

  function isLeap(y) { return ((7 * y + 1) % 19 + 19) % 19 < 7; }
  function lastMonth(y) { return isLeap(y) ? 13 : 12; }
  function elapsedDays(y) {
    var months = Math.floor((235 * y - 234) / 19);
    var parts = 12084 + 13753 * months;
    var day = 29 * months + Math.floor(parts / 25920);
    return ((3 * (day + 1)) % 7 < 3) ? day + 1 : day;
  }
  function yearCorrection(y) {
    var ny0 = elapsedDays(y - 1), ny1 = elapsedDays(y), ny2 = elapsedDays(y + 1);
    if (ny2 - ny1 === 356) return 2;
    if (ny1 - ny0 === 382) return 1;
    return 0;
  }
  function newYear(y) {
    if (!(y in cacheNY)) cacheNY[y] = HEBREW_EPOCH + elapsedDays(y) + yearCorrection(y);
    return cacheNY[y];
  }
  function daysInYear(y) { return newYear(y + 1) - newYear(y); }
  function monthLength(y, m) {
    if (m === IYAR || m === TAMOUZ || m === ELOUL || m === TEVET || m === ADAR2) return 29;
    if (m === ADAR) return isLeap(y) ? 30 : 29;
    if (m === HESHVAN) return daysInYear(y) % 10 === 5 ? 30 : 29;
    if (m === KISLEV) return daysInYear(y) % 10 === 3 ? 29 : 30;
    return 30;
  }
  function rdFromHebrew(y, m, d) {
    var rd = newYear(y) + d - 1, i;
    if (m < TISHRI) {
      for (i = TISHRI; i <= lastMonth(y); i++) rd += monthLength(y, i);
      for (i = NISSAN; i < m; i++) rd += monthLength(y, i);
    } else {
      for (i = TISHRI; i < m; i++) rd += monthLength(y, i);
    }
    return rd;
  }
  function hebrewFromRd(rd) {
    var y = Math.floor((rd - HEBREW_EPOCH) / (35975351 / 98496));
    while (newYear(y + 1) <= rd) y++;
    while (newYear(y) > rd) y--;
    var m = rd < rdFromHebrew(y, NISSAN, 1) ? TISHRI : NISSAN;
    while (rd > rdFromHebrew(y, m, monthLength(y, m))) m++;
    return { y: y, m: m, d: rd - rdFromHebrew(y, m, 1) + 1 };
  }

  var MONTHS_FR = [null, 'Nissan', 'Iyar', 'Sivan', 'Tamouz', 'Av', 'Eloul', 'Tishri', "'Heshvan",
    'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar II'];
  var MONTHS_EN = [null, 'Nisan', 'Iyyar', 'Sivan', 'Tamuz', 'Av', 'Elul', 'Tishrei', 'Cheshvan',
    'Kislev', 'Tevet', "Sh'vat", 'Adar', 'Adar II'];
  var MONTHS_HE = [null, 'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשון',
    'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב׳'];
  function monthNameFr(y, m) { return (m === ADAR && isLeap(y)) ? 'Adar I' : MONTHS_FR[m]; }
  function monthNameEn(y, m) { return (m === ADAR && isLeap(y)) ? 'Adar I' : MONTHS_EN[m]; }
  function monthNameHe(y, m) { return (m === ADAR && isLeap(y)) ? 'אדר א׳' : MONTHS_HE[m]; }
  function monthName(y, m, lang) { return lang === 'he' ? monthNameHe(y, m) : lang === 'en' ? monthNameEn(y, m) : monthNameFr(y, m); }

  function gematria(n) {
    var units = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    var tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    var hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    n = n % 1000;
    while (n >= 400) { s += 'ת'; n -= 400; }
    if (n >= 100) { s += hundreds[Math.floor(n / 100)]; n %= 100; }
    if (n === 15) s += 'טו';
    else if (n === 16) s += 'טז';
    else { s += tens[Math.floor(n / 10)] + units[n % 10]; }
    if (s.length === 1) return s + '׳';
    return s.slice(0, -1) + '״' + s.slice(-1);
  }
  function hebrewDateHe(h) { return gematria(h.d) + ' ' + monthNameHe(h.y, h.m) + ' ' + gematria(h.y); }
  function hebrewDateFr(h) { return h.d + ' ' + monthNameFr(h.y, h.m) + ' ' + h.y; }
  function hebrewDateEn(h) { return h.d + ' ' + monthNameEn(h.y, h.m) + ' ' + h.y; }
  function hebrewDate(h, lang) { return lang === 'he' ? hebrewDateHe(h) : lang === 'en' ? hebrewDateEn(h) : hebrewDateFr(h); }

  // ---------- Fêtes ----------
  // type : 'yomtov' (interdits de Shabbat), 'cholhamoed', 'jeune', 'roshhodesh', 'mineur', 'national'
  // opt : { israel: calendrier d'Israël (un seul jour de fête), joursIsrael: jours nationaux israéliens }
  var NOMS = {
    roshhashana: ['Rosh Hashana', 'Rosh Hashana', 'ראש השנה'],
    guedalia: ['Jeûne de Guedalia', 'Fast of Gedaliah', 'צום גדליה'],
    kippour: ['Yom Kippour', 'Yom Kippur', 'יום כיפור'],
    souccot: ['Souccot', 'Sukkot', 'סוכות'],
    cholsouccot: ['\'Hol Hamoed Souccot', 'Chol HaMoed Sukkot', 'חול המועד סוכות'],
    hoshanarabba: ['Hoshaana Rabba', 'Hoshana Raba', 'הושענא רבה'],
    sheminiatseret: ['Shemini Atseret', 'Shmini Atzeret', 'שמיני עצרת'],
    simhattorah: ['Simhat Torah', 'Simchat Torah', 'שמחת תורה'],
    sheminisimhat: ['Shemini Atseret · Simhat Torah', 'Shmini Atzeret · Simchat Torah', 'שמיני עצרת · שמחת תורה'],
    hanouka: ['Hanouka', 'Chanukah', 'חנוכה'],
    tevet10: ['Jeûne du 10 Tevet', 'Asara B\'Tevet', 'עשרה בטבת'],
    tubishvat: ['Tou Bishvat', 'Tu BiShvat', 'ט״ו בשבט'],
    pourimkatan: ['Pourim Katan', 'Purim Katan', 'פורים קטן'],
    esther: ['Jeûne d\'Esther', 'Ta\'anit Esther', 'תענית אסתר'],
    pourim: ['Pourim', 'Purim', 'פורים'],
    shoushan: ['Shoushan Pourim', 'Shushan Purim', 'שושן פורים'],
    pessahveille: ['Veille de Pessa\'h', 'Erev Pesach', 'ערב פסח'],
    pessah: ['Pessa\'h', 'Pesach', 'פסח'],
    cholpessah: ['\'Hol Hamoed Pessa\'h', 'Chol HaMoed Pesach', 'חול המועד פסח'],
    pessahfin: ['Pessa\'h (fin)', 'Pesach (last days)', 'שביעי של פסח'],
    lagbaomer: ['Lag Baomer', 'Lag BaOmer', 'ל״ג בעומר'],
    shavouot: ['Shavouot', 'Shavuot', 'שבועות'],
    tamouz17: ['Jeûne du 17 Tamouz', 'Tzom Tammuz', 'שבעה עשר בתמוז'],
    tishabeav: ['Tisha Beav', 'Tish\'a B\'Av', 'תשעה באב'],
    toubeav: ['Tou Beav', 'Tu B\'Av', 'ט״ו באב'],
    rhveille: ['Veille de Rosh Hashana', 'Erev Rosh Hashana', 'ערב ראש השנה'],
    yomhashoah: ['Yom HaShoah', 'Yom HaShoah', 'יום השואה'],
    yomhazikaron: ['Yom HaZikaron', 'Yom HaZikaron', 'יום הזיכרון'],
    yomhaatsmaout: ['Yom HaAtsmaout', 'Yom HaAtzma\'ut', 'יום העצמאות'],
    yomyerushalayim: ['Yom Yeroushalayim', 'Yom Yerushalayim', 'יום ירושלים']
  };
  function opts(o) { return o || {}; }
  function holidaysOnRd(rd, o) {
    o = opts(o);
    var h = hebrewFromRd(rd), y = h.y, m = h.m, d = h.d, wd = dow(rd), out = [], il = !!o.israel;
    function add(id, type, extra, num) {
      var n = NOMS[id], e = { id: id, fr: n[0], en: n[1], he: n[2], type: type };
      if (extra) { e.fr += extra[0]; e.en += extra[1]; e.he += extra[2]; }
      if (num) e.n = num;
      out.push(e);
    }
    function rh(yy, mm) {
      out.push({ id: 'roshhodesh', type: 'roshhodesh', fr: 'Rosh \'Hodesh ' + monthNameFr(yy, mm), en: 'Rosh Chodesh ' + monthNameEn(yy, mm), he: 'ראש חודש ' + monthNameHe(yy, mm) });
    }
    var adarPurim = isLeap(y) ? ADAR2 : ADAR;

    if (d === 1 && m !== TISHRI) rh(y, m);
    if (d === 30) { var next = hebrewFromRd(rd + 1); rh(next.y, next.m); }
    if (m === TISHRI) {
      if (d === 1 || d === 2) add('roshhashana', 'yomtov');
      if ((d === 3 && wd !== 6) || (d === 4 && wd === 0)) add('guedalia', 'jeune');
      if (d === 10) add('kippour', 'yomtov');
      if (d === 15 || (d === 16 && !il)) add('souccot', 'yomtov');
      if ((d >= 17 || (il && d === 16)) && d <= 20) add('cholsouccot', 'cholhamoed');
      if (d === 21) add('hoshanarabba', 'cholhamoed');
      if (d === 22) add(il ? 'sheminisimhat' : 'sheminiatseret', 'yomtov');
      if (d === 23 && !il) add('simhattorah', 'yomtov');
    }
    if (m === TISHRI || m === HESHVAN || m === KISLEV || m === TEVET) {
      var hs = rdFromHebrew(y, KISLEV, 25);
      if (rd >= hs && rd < hs + 8) { var n = rd - hs + 1; add('hanouka', 'mineur', [' (' + n + 'ᵉ jour)', ' (day ' + n + ')', n === 1 ? ' – נר ראשון' : ' – ' + gematria(n) + ' נרות'], n); }
    }
    if (m === TEVET && d === 10) add('tevet10', 'jeune');
    if (m === SHEVAT && d === 15) add('tubishvat', 'mineur');
    if (isLeap(y) && m === ADAR && d === 14) add('pourimkatan', 'mineur');
    if (m === adarPurim) {
      if ((d === 13 && wd !== 6) || (d === 11 && wd === 4)) add('esther', 'jeune');
      if (d === 14) add('pourim', 'mineur');
      if (d === 15) add('shoushan', 'mineur');
    }
    if (m === NISSAN) {
      if (d === 14) add('pessahveille', 'mineur');
      if (d === 15 || (d === 16 && !il)) add('pessah', 'yomtov');
      if ((d >= 17 || (il && d === 16)) && d <= 20) add('cholpessah', 'cholhamoed');
      if (d === 21 || (d === 22 && !il)) add('pessahfin', 'yomtov');
    }
    if (m === IYAR && d === 18) add('lagbaomer', 'mineur');
    if (m === SIVAN && (d === 6 || (d === 7 && !il))) add('shavouot', 'yomtov');
    if (m === TAMOUZ && ((d === 17 && wd !== 6) || (d === 18 && wd === 0))) add('tamouz17', 'jeune');
    if (m === AV && ((d === 9 && wd !== 6) || (d === 10 && wd === 0))) add('tishabeav', 'jeune');
    if (m === AV && d === 15) add('toubeav', 'mineur');
    if (m === ELOUL && d === 29) add('rhveille', 'mineur');
    if (o.israel || o.joursIsrael) {
      // Yom HaShoah : 27 Nissan, avancé au jeudi s'il tombe un vendredi, repoussé au lundi s'il tombe un dimanche
      var sh = rdFromHebrew(y, NISSAN, 27);
      if (dow(sh) === 5) sh -= 1; else if (dow(sh) === 0) sh += 1;
      if (rd === sh) add('yomhashoah', 'national');
      // Yom HaAtsmaout : 5 Iyar ; vendredi ou samedi -> jeudi précédent ; lundi -> mardi. Yom HaZikaron la veille.
      var at = rdFromHebrew(y, IYAR, 5);
      if (dow(at) === 5) at -= 1; else if (dow(at) === 6) at -= 2; else if (dow(at) === 1) at += 1;
      if (rd === at - 1) add('yomhazikaron', 'national');
      if (rd === at) add('yomhaatsmaout', 'national');
      if (m === IYAR && d === 28) add('yomyerushalayim', 'national');
    }
    return out;
  }
  function isYomTovRd(rd, o) { return holidaysOnRd(rd, o).some(function (e) { return e.type === 'yomtov'; }); }
  function omerDay(rd) {
    var h = hebrewFromRd(rd);
    var start = rdFromHebrew(h.y, NISSAN, 16);
    var n = rd - start + 1;
    return (n >= 1 && n <= 49) ? n : 0;
  }

  // ---------- Paracha (diaspora et Israël) ----------
  var PARASHOT = [
    ['Bereshit', 'בראשית'], ['Noa\'h', 'נח'], ['Lekh Lekha', 'לך לך'], ['Vayera', 'וירא'],
    ['\'Hayé Sarah', 'חיי שרה'], ['Toledot', 'תולדות'], ['Vayetse', 'ויצא'], ['Vayishla\'h', 'וישלח'],
    ['Vayeshev', 'וישב'], ['Mikets', 'מקץ'], ['Vayigash', 'ויגש'], ['Vaye\'hi', 'ויחי'],
    ['Shemot', 'שמות'], ['Vaéra', 'וארא'], ['Bo', 'בא'], ['Beshala\'h', 'בשלח'], ['Yitro', 'יתרו'],
    ['Mishpatim', 'משפטים'], ['Terouma', 'תרומה'], ['Tetsavé', 'תצוה'], ['Ki Tissa', 'כי תשא'],
    ['Vayakhel', 'ויקהל'], ['Pekoudé', 'פקודי'], ['Vayikra', 'ויקרא'], ['Tsav', 'צו'],
    ['Shemini', 'שמיני'], ['Tazria', 'תזריע'], ['Metsora', 'מצורע'], ['A\'harei Mot', 'אחרי מות'],
    ['Kedoshim', 'קדושים'], ['Emor', 'אמור'], ['Behar', 'בהר'], ['Be\'houkotaï', 'בחקתי'],
    ['Bamidbar', 'במדבר'], ['Nasso', 'נשא'], ['Beha\'alotekha', 'בהעלתך'], ['Shela\'h Lekha', 'שלח לך'],
    ['Kora\'h', 'קרח'], ['\'Houkat', 'חקת'], ['Balak', 'בלק'], ['Pin\'has', 'פינחס'], ['Matot', 'מטות'],
    ['Masseï', 'מסעי'], ['Devarim', 'דברים'], ['Vaet\'hanan', 'ואתחנן'], ['Ekev', 'עקב'], ['Reé', 'ראה'],
    ['Shoftim', 'שופטים'], ['Ki Tetsé', 'כי תצא'], ['Ki Tavo', 'כי תבוא'], ['Nitsavim', 'נצבים'],
    ['Vayelekh', 'וילך'], ['Haazinou', 'האזינו'], ['Vezot Haberakha', 'וזאת הברכה']
  ];
  var PARASHOT_EN = ['Bereshit', 'Noach', 'Lech-Lecha', 'Vayera', 'Chayei Sara', 'Toldot', 'Vayetzei', 'Vayishlach',
    'Vayeshev', 'Miketz', 'Vayigash', 'Vayechi', 'Shemot', 'Vaera', 'Bo', 'Beshalach', 'Yitro', 'Mishpatim', 'Terumah',
    'Tetzaveh', 'Ki Tisa', 'Vayakhel', 'Pekudei', 'Vayikra', 'Tzav', 'Shmini', 'Tazria', 'Metzora', 'Achrei Mot',
    'Kedoshim', 'Emor', 'Behar', 'Bechukotai', 'Bamidbar', 'Nasso', 'Beha\'alotcha', 'Sh\'lach', 'Korach', 'Chukat',
    'Balak', 'Pinchas', 'Matot', 'Masei', 'Devarim', 'Vaetchanan', 'Eikev', 'Re\'eh', 'Shoftim', 'Ki Teitzei', 'Ki Tavo',
    'Nitzavim', 'Vayeilech', 'Ha\'azinu', 'Vezot Haberakhah'];
  var cacheSched = {};

  function nextShabbat(rd) { return rd + ((6 - dow(rd)) + 7) % 7; } // rd lui-même s'il est samedi
  function isReadingFestival(rd, o) { return holidaysOnRd(rd, o).some(function (e) { return e.type === 'yomtov' || e.type === 'cholhamoed'; }); }

  // Répartit `items` (indices de paracha) sur `slots` lectures, en joignant les paires de
  // `joins` (indice de la première paracha de la paire) dans l'ordre de priorité.
  function distribute(items, slots, joins) {
    var need = items.length - slots;
    if (need < 0 || need > joins.length) throw new Error('Paracha : répartition impossible');
    var joined = {};
    for (var i = 0; i < need; i++) joined[joins[i]] = true;
    var out = [];
    for (var j = 0; j < items.length; j++) {
      if (joined[items[j]]) { out.push([items[j], items[j] + 1]); j++; } else out.push([items[j]]);
    }
    return out;
  }

  // Calendrier des lectures pour l'« année de paracha » commençant après Simhat Torah de l'année y.
  function parashaSchedule(y, o) {
    var il = !!opts(o).israel, cle = y + (il ? 'il' : '');
    if (cacheSched[cle]) return cacheSched[cle];
    var oo = { israel: il };
    var start = nextShabbat(rdFromHebrew(y, TISHRI, il ? 23 : 24)); // Bereshit
    var shavuot = rdFromHebrew(y, SIVAN, 6);
    var chazonLimit = rdFromHebrew(y, AV, 9);
    var rhNext = newYear(y + 1);
    var sukkotNext = rdFromHebrew(y + 1, TISHRI, 15);
    function slots(from, to) { // samedis disponibles dans [from, to)
      var out = [];
      for (var s = nextShabbat(from); s < to; s += 7) if (!isReadingFestival(s, oo)) out.push(s);
      return out;
    }
    var s1 = slots(start, chazonLimit + 1);          // Bereshit … Devarim (Shabbat 'Hazon)
    var s3 = slots(chazonLimit + 1, rhNext);         // Vaet'hanan … Nitsavim
    var s4 = slots(rhNext, sukkotNext);              // Shabbat Shouva / entre Kippour et Souccot
    var range = function (a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; };
    // Jonctions par priorité. Diaspora : 'Houkat-Balak d'abord si le 2e jour de Shavouot est un Shabbat,
    // puis Matot-Masseï, Tazria-Metsora, A'harei-Kedoshim, Behar-Be'houkotaï, Vayakhel-Pekoudé.
    // Israël : jamais 'Houkat-Balak ; Behar-Be'houkotaï est la dernière paire réunie (vérifié sur hebcal).
    var joins = il ? [41, 26, 28, 21, 31] : [41, 26, 28, 31, 21];
    if (!il && dow(shavuot + 1) === 6) joins.unshift(38);
    var r1 = distribute(range(0, 43), s1.length, joins);
    var r3, r4;
    if (s4.length === 2) { r3 = distribute(range(44, 50), s3.length, []); r4 = [[51], [52]]; }
    else { r3 = distribute(range(44, 51), s3.length, [50]); r4 = [[52]]; }
    var sched = {}, all = [[s1, r1], [s3, r3], [s4, r4]];
    all.forEach(function (pair) {
      if (pair[0].length !== pair[1].length) throw new Error('Paracha : incohérence');
      pair[0].forEach(function (s, i) { sched[s] = pair[1][i]; });
    });
    cacheSched[cle] = sched;
    return sched;
  }

  function parashaIndices(rdShabbat, o) {
    var y = hebrewFromRd(rdShabbat).y;
    var sched = parashaSchedule(y, o);
    if (sched[rdShabbat]) return sched[rdShabbat];
    var prev = parashaSchedule(y - 1, o);
    return prev[rdShabbat] || null;
  }
  function parashaName(idx, lang) {
    if (lang === 'en') return idx.map(function (i) { return PARASHOT_EN[i]; }).join('-');
    var k = lang === 'he' ? 1 : 0;
    return idx.map(function (i) { return PARASHOT[i][k]; }).join(lang === 'he' ? '-' : ' - ');
  }

  // Shabbatot particuliers : [français, hébreu, anglais]
  function specialShabbat(rd, o) {
    var h = hebrewFromRd(rd), y = h.y, m = h.m, d = h.d, out = [];
    var adarP = isLeap(y) ? ADAR2 : ADAR;
    var rhAdar = rdFromHebrew(y, adarP, 1), purim = rdFromHebrew(y, adarP, 14), rhNissan = rdFromHebrew(y, NISSAN, 1);
    if (rd <= rhAdar && rd > rhAdar - 7) out.push(['Shabbat Shekalim', 'שבת שקלים', 'Shabbat Shekalim']);
    if (rd < purim && rd >= purim - 7) out.push(['Shabbat Zakhor', 'שבת זכור', 'Shabbat Zachor']);
    if (rd <= rhNissan && rd > rhNissan - 7) out.push(['Shabbat Ha\'hodesh', 'שבת החודש', 'Shabbat HaChodesh']);
    if (rd <= rhNissan - 7 && rd > rhNissan - 14) out.push(['Shabbat Para', 'שבת פרה', 'Shabbat Parah']);
    if (m === NISSAN && d >= 8 && d <= 14) out.push(['Shabbat Hagadol', 'שבת הגדול', 'Shabbat HaGadol']);
    if (m === TISHRI && d >= 3 && d <= 9) out.push(['Shabbat Shouva', 'שבת שובה', 'Shabbat Shuva']);
    if (m === AV && d >= 3 && d <= 9) out.push(['Shabbat \'Hazon', 'שבת חזון', 'Shabbat Chazon']);
    if (m === AV && d >= 10 && d <= 16) out.push(['Shabbat Na\'hamou', 'שבת נחמו', 'Shabbat Nachamu']);
    var idx = parashaIndices(rd, o);
    if (idx && idx[0] === 15) out.push(['Shabbat Shira', 'שבת שירה', 'Shabbat Shirah']);
    if ((d === 1 && m !== TISHRI) || d === 30) out.push(['Shabbat Rosh \'Hodesh', 'שבת ראש חודש', 'Shabbat Rosh Chodesh']);
    else if (d === 29 && m !== ELOUL) out.push(['Ma\'har \'Hodesh', 'מחר חודש', 'Machar Chodesh']);
    return out;
  }

  function readingForShabbat(rd, o) {
    var fest = holidaysOnRd(rd, o).filter(function (e) { return e.type === 'yomtov' || e.type === 'cholhamoed'; });
    if (fest.length) return { fr: fest[0].fr, he: fest[0].he, en: fest[0].en, fete: true };
    var idx = parashaIndices(rd, o);
    if (!idx) return null;
    return { fr: parashaName(idx, 'fr'), he: parashaName(idx, 'he'), en: parashaName(idx, 'en'), idx: idx, fete: false };
  }

  // ---------- Soleil : Schlyter, méthode directe (celle de CalJ) ----------
  var RAD = Math.PI / 180;
  function schlyterDays(y, m, d) {
    return 367 * y - Math.floor(7 * (y + Math.floor((m + 9) / 12)) / 4) + Math.floor(275 * m / 9) + d - 730530;
  }
  function sunEq(dd) {
    var M = ((356.0470 + 0.9856002585 * dd) % 360 + 360) % 360;
    var w = 282.9404 + 4.70935e-5 * dd, e = 0.016709 - 1.151e-9 * dd;
    var E = M + e / RAD * Math.sin(M * RAD) * (1 + e * Math.cos(M * RAD));
    var x = Math.cos(E * RAD) - e, yv = Math.sin(E * RAD) * Math.sqrt(1 - e * e);
    var r = Math.sqrt(x * x + yv * yv);
    var lon = ((Math.atan2(yv, x) / RAD + w) % 360 + 360) % 360;
    var obl = 23.4393 - 3.563e-7 * dd;
    var X = r * Math.cos(lon * RAD), Y0 = r * Math.sin(lon * RAD);
    var Z = Y0 * Math.sin(obl * RAD), Y = Y0 * Math.cos(obl * RAD);
    return { ra: Math.atan2(Y, X) / RAD, dec: Math.atan2(Z, Math.sqrt(X * X + Y * Y)) / RAD, L: ((M + w) % 360 + 360) % 360 };
  }
  // Instant (ms UTC) où le centre du Soleil passe à la hauteur alt (°), matin ou soir ; null si jamais.
  function sunEvent(y, m, d, lat, lon, alt, rising) {
    // Position du soleil prise à midi UT, sans correction de longitude : c'est ce que fait CalJ
    // (vérifié sur 8 villes de Jérusalem à Montréal ; « + 0.5 - lon/360 » donne des écarts d'une minute à l'ouest).
    var dd = schlyterDays(y, m, d) + 0.5;
    var s = sunEq(dd);
    var x = (s.L + 180) % 360 + 180 + lon - s.ra;
    var tsouth = 12.0 - (x - 360 * Math.floor(x / 360 + 0.5)) / 15.0;
    var cost = (Math.sin(alt * RAD) - Math.sin(lat * RAD) * Math.sin(s.dec * RAD)) /
               (Math.cos(lat * RAD) * Math.cos(s.dec * RAD));
    if (cost > 1 || cost < -1) return null;
    var t = Math.acos(cost) / RAD / 15.0;
    var h = rising ? tsouth - t : tsouth + t;
    return Date.UTC(y, m - 1, d) + h * 3600000;
  }

  // ---------- Zmanim du jour, selon les avis choisis ----------
  // methodes (toutes facultatives ; par défaut : Or Méïr / Rav Posen, comme CalJ) :
  //   alot        '16.1' (degrés) | '72p' (72 min proportionnelles, Rav Ovadia) | '72f' (72 min fixes) | '90p' | '19.8'
  //   misheyakir  '11' | '11.5' | '10.2' | '6p' (aube + 6 min proportionnelles, Rav Ovadia)
  //   tzeit       '7.08' | '8.5' | '13.5p' (Rav Ovadia) | '18f' | '20f'
  //   fin         fin de Shabbat et des fêtes : '8.5' | '7.08' | 'rt' (heure de Rabbénou Tam choisie) | 'min' (finMinutes après la shqi'a)
  //   rt          nuit de Rabbénou Tam : '16.1' | '72p' | '72f'
  //   plag        'gra' | 'ma' | 'yy' (Yalkout Yossef : tzeit Rav Ovadia − 75 min proportionnelles)
  // Le Maguen Avraham compte la journée de l'aube choisie à sa « nuit » symétrique (16,1° → 16,1° ; 72 → 72…).
  // Avis libres, en plus des codes ci-dessus : « 18 » ou « 12.5 » = degrés sous l'horizon ; « 120p » = minutes
  // proportionnelles ; « 45f » = minutes fixes. Les minutes se comptent avant le netz (alot), après l'aube
  // (misheyakir) ou après la shqi'a (tzeit, fin, rt). Renvoie null si le code n'est pas lisible.
  function codeAvis(code) {
    var m = /^(\d{1,3}(?:\.\d+)?)([pf]?)$/.exec(String(code));
    if (!m) return null;
    var n = +m[1];
    if (m[2] === '' ? !(n > 0 && n < 90) : !(n >= 0 && n <= 600)) return null;
    return { n: n, u: m[2] };
  }
  var MIN = 60000;
  var DEFAUT_METHODES = { alot: '16.1', misheyakir: '11', tzeit: '7.08', fin: '8.5', finMinutes: 50, rt: '16.1', plag: 'gra' };
  function zmanim(y, m, d, loc) {
    var me = {}, k;
    for (k in DEFAUT_METHODES) me[k] = DEFAUT_METHODES[k];
    if (loc.methodes) for (k in loc.methodes) if (loc.methodes[k] !== undefined && loc.methodes[k] !== null) me[k] = loc.methodes[k];
    var ev = function (alt, rising) { return sunEvent(y, m, d, loc.lat, loc.lon, alt, rising); };
    var netz = ev(-0.8333, true), shqia = ev(-0.8333, false);
    var D = (shqia - netz) / 12; // heure proportionnelle GR"A (ms)
    var p = function (n) { return D * n / 60; };
    var v = {
      alot: { '16.1': ev(-16.1, true), '72p': netz - p(72), '72f': netz - 72 * MIN, '90p': netz - p(90), '19.8': ev(-19.8, true) },
      nuitMA: { '16.1': ev(-16.1, false), '72p': shqia + p(72), '72f': shqia + 72 * MIN, '90p': shqia + p(90), '19.8': ev(-19.8, false) },
      tzeit: { '7.08': ev(-7.08, false), '8.5': ev(-8.5, false), '13.5p': shqia + p(13.5), '18f': shqia + 18 * MIN, '20f': shqia + 20 * MIN },
      rt: { '16.1': ev(-16.1, false), '72p': shqia + p(72), '72f': shqia + 72 * MIN }
    };
    // Avis libre (voir codeAvis) : degrés sous l'horizon, ou minutes comptées depuis ref (sens -1 = avant, +1 = après)
    var libre = function (code, rising, ref, sens) {
      var c = codeAvis(code);
      if (!c) return undefined;
      if (c.u === '') return ev(-c.n, rising);
      if (ref === null) return null;
      return ref + sens * (c.u === 'p' ? p(c.n) : c.n * MIN);
    };
    var choix = function (table, code, defaut, rising, ref, sens) {
      if (table[code] !== undefined) return table[code];
      var x = libre(code, rising, ref, sens);
      return x !== undefined ? x : table[defaut];
    };
    var alot = choix(v.alot, me.alot, '16.1', true, netz, -1);
    var nuitMA = choix(v.nuitMA, me.alot, '16.1', false, shqia, 1);
    var misheyakir = { '11': ev(-11, true), '11.5': ev(-11.5, true), '10.2': ev(-10.2, true), '6p': alot === null ? null : alot + p(6) }[me.misheyakir];
    if (misheyakir === undefined) misheyakir = libre(me.misheyakir, true, alot, 1);
    if (misheyakir === undefined) misheyakir = ev(-11, true);
    var tzeit = choix(v.tzeit, me.tzeit, '7.08', false, shqia, 1);
    var rt = choix(v.rt, me.rt, '16.1', false, shqia, 1);
    var fin = me.fin === '7.08' ? v.tzeit['7.08'] : me.fin === 'rt' ? rt : me.fin === 'min' ? shqia + (+me.finMinutes || 50) * MIN : choix(v.tzeit, me.fin, '8.5', false, shqia, 1);
    var hMA = (alot !== null && nuitMA !== null) ? (nuitMA - alot) / 12 : null;
    var plag = me.plag === 'ma' && hMA !== null ? alot + 10.75 * hMA : me.plag === 'yy' ? v.tzeit['13.5p'] - p(75) : netz + 10.75 * D;
    var z = {
      alot: alot, tefilin: misheyakir, netz: netz,
      shemaMA: hMA !== null ? alot + 3 * hMA : null, tefilaMA: hMA !== null ? alot + 4 * hMA : null,
      shemaGRA: netz + 3 * D, tefila: netz + 4 * D, hatsot: netz + 6 * D,
      minhaGuedola: netz + 6 * D + Math.max(30 * MIN, D / 2),
      minhaKetana: netz + 9.5 * D, plag: plag,
      shqia: shqia, tzeit: tzeit, finShabbat: fin, rabenouTam: rt,
      bougies: shqia - (loc.bougies === undefined ? 18 : loc.bougies) * MIN, heureGRA: D, heureMA: hMA,
      variantes: v, methodes: me
    };
    return z;
  }
  // Arrondi CalJ : secondes tronquées, minute inférieure ; fin de Shabbat/fête à la minute supérieure.
  function roundCalj(t, up) {
    if (t === null || t === undefined) return null;
    var s = Math.floor(t / 1000) * 1000;
    return up ? Math.ceil(s / MIN) * MIN : Math.floor(s / MIN) * MIN;
  }

  // ---------- Heure locale du lieu, indépendante du fuseau de l'appareil ----------
  var fmtCache = {};
  function partsInTz(t, tz) {
    var key = tz;
    if (!fmtCache[key]) fmtCache[key] = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
      minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short' });
    var p = {};
    fmtCache[key].formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
  }
  function hhmm(t, tz) {
    if (t === null || t === undefined) return '—';
    var p = partsInTz(t, tz);
    return (p.h < 10 ? '0' : '') + p.h + ':' + (p.mi < 10 ? '0' : '') + p.mi;
  }

  // ---------- Synthèse d'une journée civile ----------
  function dayInfo(y, m, d, loc) {
    var rd = rdFromGreg(y, m, d), wd = dow(rd);
    var z = zmanim(y, m, d, loc);
    var g1 = gregFromRd(rd + 1);
    var today = holidaysOnRd(rd, loc), tomorrow = holidaysOnRd(rd + 1, loc);
    var ytToday = today.some(function (e) { return e.type === 'yomtov'; });
    var ytTomorrow = tomorrow.some(function (e) { return e.type === 'yomtov'; });
    var sacredToday = ytToday || wd === 6, sacredTomorrow = ytTomorrow || wd === 5;
    var events = [];
    var a = function (e) { events.push(e); };
    var estKippour = function (l) { return l.some(function (e) { return e.id === 'kippour'; }); };
    // Allumage (lk = clé du libellé, traduit par l'écran ; label = libellé français)
    if (sacredTomorrow && !sacredToday) a({ k: 'bougies', lk: 'evtBougies', label: 'Allumage des bougies', t: roundCalj(z.bougies, false) });
    else if (sacredTomorrow && sacredToday) a({ k: 'bougies2', lk: 'evtBougiesPasAvant', label: 'Allumage, pas avant', t: roundCalj(z.finShabbat, true) });
    // Fin
    if (sacredToday && !sacredTomorrow) {
      var lk = wd === 6 && !ytToday ? 'evtFinShabbat' : (estKippour(today) ? 'evtFinJeune' : (wd === 6 ? 'evtFinShabbatFete' : 'evtFinFete'));
      var lbl = { evtFinShabbat: 'Fin de Shabbat', evtFinJeune: 'Fin du jeûne', evtFinShabbatFete: 'Fin de Shabbat et de la fête', evtFinFete: 'Fin de la fête' }[lk];
      a({ k: 'fin', lk: lk, label: lbl, t: roundCalj(z.finShabbat, true) });
    }
    // Jeûnes
    var fastToday = today.filter(function (e) { return e.type === 'jeune'; });
    var fastTomorrow = tomorrow.filter(function (e) { return e.type === 'jeune'; });
    if (fastToday.length) {
      if (fastToday[0].id !== 'tishabeav') a({ k: 'debutJeune', lk: 'evtDebutJeune', label: 'Début du jeûne', t: roundCalj(z.alot, false), jeune: fastToday[0] });
      a({ k: 'finJeune', lk: 'evtFinJeune', label: 'Fin du jeûne', t: roundCalj(z.tzeit, false), jeune: fastToday[0] });
    }
    if (fastTomorrow.length && fastTomorrow[0].id === 'tishabeav') a({ k: 'debutJeune', lk: 'evtDebutTisha', label: 'Début du jeûne (Tisha Beav)', t: roundCalj(z.shqia, false), jeune: fastTomorrow[0] });
    if (estKippour(tomorrow)) a({ k: 'debutJeune', lk: 'evtDebutKippour', label: 'Début du jeûne (Kippour)', t: roundCalj(z.shqia, false) });
    return {
      rd: rd, dow: wd, greg: { y: y, m: m, d: d }, hebrew: hebrewFromRd(rd), hebrewNext: hebrewFromRd(rd + 1),
      zmanim: z, today: today, tomorrow: tomorrow, events: events,
      omer: omerDay(rd), omerNext: omerDay(rd + 1), isShabbat: wd === 6, isYomTov: ytToday,
      nextGreg: g1
    };
  }

  // ---------- Azkarot (yahrzeit) ----------
  // Date de l'anniversaire de décès dans l'année hébraïque hy (règles de Reingold et Dershowitz, comme hebcal) :
  // 30 'Heshvan ou 30 Kislev : si ce mois est court l'année suivant le décès, la veille du 1er du mois suivant ;
  // décès en Adar II : dernier Adar ; 30 Adar I vers une année simple : 30 Shevat ;
  // décès en Adar d'une année simple vers une année embolismique : Adar I (ashkénazes) ou Adar II (séfarades, o.adar2).
  function yahrzeit(mort, hy, o) {
    o = opts(o);
    var m = mort.m, d = mort.d;
    if (m === HESHVAN && d === 30 && monthLength(mort.y + 1, HESHVAN) === 29) return rdFromHebrew(hy, KISLEV, 1) - 1;
    if (m === KISLEV && d === 30 && monthLength(mort.y + 1, KISLEV) === 29) return rdFromHebrew(hy, TEVET, 1) - 1;
    if (m === ADAR2) return rdFromHebrew(hy, lastMonth(hy), d);
    if (m === ADAR && d === 30 && !isLeap(hy)) return rdFromHebrew(hy, SHEVAT, 30);
    if (m === ADAR && !isLeap(mort.y) && isLeap(hy) && o.adar2) m = ADAR2;
    return rdFromHebrew(hy, m, 1) + d - 1;
  }
  // Prochaine date d'azkara à partir du jour rd (inclus), pour un décès au jour civil rdMort (après la shqi'a : jour suivant)
  function prochaineAzkara(rdMort, apresShqia, rd, o) {
    var mort = hebrewFromRd(rdMort + (apresShqia ? 1 : 0)), hy = hebrewFromRd(rd).y;
    for (var y = hy - 1; y <= hy + 1; y++) { var r = yahrzeit(mort, y, o); if (r >= rd && y > mort.y) return r; }
    return null;
  }

  // ---------- Ajouts et changements de la tefila ----------
  // rd : jour hébraïque concerné (après la shqi'a, c'est le lendemain civil) ; phase : 'soir' (Arvit),
  // 'matin' (Cha'harit, Moussaf), 'minha'. o : { israel, joursIsrael, nusach: 'sefarade'|'ashkenaze'|'sfard',
  // pourim15 (ville emmurée), saison (rappeler chaque jour Morid hatal / Barekh alénou) }.
  // Retour : liste de { k: clé du libellé, pref: 'ceSoir'|'desCeSoir' (facultatif), m: [fr,en,he] (mois) }.
  function gregLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  // Début de la demande de pluie (Barekh alénou / Tal oumatar), en jour hébraïque :
  // Israël : 7 'Heshvan ; diaspora : Arvit du 4 décembre (du 5 si l'année civile suivante est bissextile).
  function debutPluie(hy, il) {
    if (il) return rdFromHebrew(hy, HESHVAN, 7);
    var g = gregFromRd(rdFromHebrew(hy, TISHRI, 1)).y;
    return rdFromGreg(g, 12, gregLeap(g + 1) ? 6 : 5);
  }
  function hiver(rd, il) { // Barekh alénou
    var h = hebrewFromRd(rd);
    return rd >= debutPluie(h.y, il) && rd < rdFromHebrew(h.y, NISSAN, 15);
  }
  function machiv(rd) { // Machiv haroua'h (toute la journée ; transitions au Moussaf traitées à part)
    var h = hebrewFromRd(rd);
    return rd > rdFromHebrew(h.y, TISHRI, 22) && rd < rdFromHebrew(h.y, NISSAN, 15);
  }
  // Jours sans Ta'hanoun en raison de la date (Shabbat mis à part)
  function sansTahanoun(rd, o) {
    o = opts(o);
    var h = hebrewFromRd(rd), m = h.m, d = h.d, fetes = holidaysOnRd(rd, o);
    if (fetes.some(function (e) { return e.type === 'yomtov' || e.type === 'cholhamoed' || e.type === 'roshhodesh' ||
      ['hanouka', 'pourim', 'shoushan', 'pourimkatan', 'tubishvat', 'lagbaomer', 'toubeav', 'rhveille', 'tishabeav'].indexOf(e.id) >= 0 ||
      (o.joursIsrael && (e.id === 'yomhaatsmaout' || e.id === 'yomyerushalayim')); })) return true;
    if (m === NISSAN) return true;
    if (m === IYAR && d === 14) return true;              // Pessa'h chéni
    if (m === SIVAN && d <= 12) return true;
    if (m === TISHRI && d >= 9) return true;             // de la veille de Kippour à la fin de Tishri
    if (m === ADAR && isLeap(h.y) && d === 15) return true; // Chouchan Pourim katan
    return false;
  }
  function tefila(rd, o, phase) {
    o = opts(o);
    var il = !!o.israel, nus = o.nusach || 'sefarade', ashk = nus !== 'sefarade';
    var h = hebrewFromRd(rd), m = h.m, d = h.d, wd = dow(rd);
    var fetes = holidaysOnRd(rd, o), out = [];
    var a = function (k, x) { var e = { k: k }; if (x) for (var c in x) e[c] = x[c]; out.push(e); };
    var aId = function (id) { return fetes.some(function (e) { return e.id === id; }); };
    var aType = function (t) { return fetes.some(function (e) { return e.type === t; }); };
    var yomtov = aType('yomtov'), semaine = wd !== 6 && !yomtov, jour = phase !== 'soir';
    // Saisons
    var r22 = rdFromHebrew(h.y, TISHRI, 22), r15 = rdFromHebrew(h.y, NISSAN, 15);
    if (rd === r22 && jour) a('tf_mashivMoussaf');
    else if (rd === r15 && jour) a(ashk && !il ? 'tf_stopMashivMoussaf' : 'tf_moridMoussaf');
    else if (o.saison) { if (machiv(rd)) a('tf_mashiv'); else if (!ashk || il) a('tf_morid'); }
    var hv = hiver(rd, il), lib = hv ? (ashk ? 'tf_talOumatar' : 'tf_barekh') : (ashk ? 'tf_berakha' : 'tf_barkhenou');
    // Première amida de semaine de l'hiver (si le début tombe un Shabbat ou une fête, on commence après)
    var hyP = m >= TISHRI ? h.y : h.y - 1, premier = debutPluie(hyP, il);
    while (dow(premier) === 6 || isYomTovRd(premier, o)) premier++;
    if (semaine && rd === premier) a(lib, phase === 'soir' ? { pref: 'desCeSoir' } : null);
    else if (semaine && o.saison) a(lib);
    if (phase !== 'soir' && rd === premier - 1) a(ashk ? 'tf_talOumatar' : 'tf_barekh', { pref: 'ceSoir' });
    // Jours redoutables
    if (m === TISHRI && d <= 10) { a('tf_hamelekh'); a('tf_zokhrenou'); }
    if (m === TISHRI && d >= 3 && d <= 9 && semaine && jour && !(d === 9 && phase === 'minha')) a('tf_avinou');
    // Roch 'Hodech, fêtes, 'Hol hamoed
    var rh = aType('roshhodesh'), han = aId('hanouka'), chm = aType('cholhamoed');
    if (rh || chm) a('tf_yaale');
    if (han || (aId('pourim') && !o.pourim15) || (aId('shoushan') && o.pourim15)) a('tf_alHanissim');
    if ((aId('pourim') && !o.pourim15) || (aId('shoushan') && o.pourim15)) a('tf_meguila');
    if (jour) {
      var complet = han || aId('cholsouccot') || aId('hoshanarabba') || aId('souccot') || aId('sheminiatseret') || aId('simhattorah') ||
        aId('sheminisimhat') || aId('shavouot') || (aId('pessah') && (d === 15 || (d === 16 && !il)));
      if (complet) a('tf_hallelComplet');
      else if (rh || aId('cholpessah') || aId('pessahfin')) a('tf_hallelPartiel');
      if (o.joursIsrael && (aId('yomhaatsmaout') || aId('yomyerushalayim'))) a('tf_hallelMinhag');
      if (rh || chm) a('tf_moussaf');
    }
    // Jeûnes
    var jeune = fetes.filter(function (e) { return e.type === 'jeune'; })[0];
    if (jeune && jour) {
      a('tf_anenou');
      if (ashk && jeune.id !== 'tishabeav') a('tf_avinou');
      if (jeune.id === 'tishabeav' && phase === 'minha') a('tf_nahem');
    }
    // Ta'hanoun
    if (semaine && jour && sansTahanoun(rd, o)) a('tf_pasTahanoun');
    else if (semaine && phase === 'minha' && (sansTahanoun(rd + 1, o) || isYomTovRd(rd + 1, o)) && dow(rd + 1) !== 6) a('tf_pasTahanounMinha');
    if (wd === 6 && phase === 'minha' && sansTahanoun(rd, o)) a('tf_pasTsidkatekha');
    // Elloul : Seli'hot, Chofar et LeDavid (ashkénazes et sfard)
    var rhRd = rdFromHebrew(m === TISHRI ? h.y : h.y + 1, TISHRI, 1);
    var debutSel = rdFromHebrew(h.y, ELOUL, 2);
    if (ashk) { debutSel = rhRd - dow(rhRd); if (rhRd - debutSel < 4) debutSel -= 7; }
    var finSel = rdFromHebrew(m === TISHRI ? h.y : h.y + 1, TISHRI, 9);
    if (phase !== 'minha' && rd >= debutSel && rd <= finSel && semaine && !(m === TISHRI && d <= 2)) a('tf_selihot');
    if (ashk && ((m === ELOUL) || (m === TISHRI && d <= 22))) a('tf_ledavid');
    if (ashk && m === ELOUL && d <= 28 && wd !== 6 && phase === 'matin') a('tf_shofar');
    // Chabbat Mevarkhim : Birkat ha'hodech (sauf pour Tishri)
    if (wd === 6 && phase !== 'minha') {
      var r1 = rd + 1; while (hebrewFromRd(r1).d !== 1) r1++;
      var debutRh = hebrewFromRd(r1 - 1).d === 30 ? r1 - 1 : r1, h1 = hebrewFromRd(r1);
      if (h1.m !== TISHRI && debutRh > rd && debutRh <= rd + 7) a('tf_birkat', { m: [monthNameFr(h1.y, h1.m), monthNameEn(h1.y, h1.m), monthNameHe(h1.y, h1.m)] });
    }
    return out;
  }

  function upcoming(rd, count, o) {
    var out = [], seen = {};
    for (var i = 1; i < 400 && out.length < count; i++) {
      holidaysOnRd(rd + i, o).forEach(function (e) {
        var key = e.id === 'roshhodesh' ? e.fr : e.id;
        if (e.type === 'cholhamoed') return;
        if (seen[key] && seen[key] >= rd + i - 8) { seen[key] = rd + i; return; }
        seen[key] = rd + i;
        if (out.length < count) {
          var nom = function (x) { return x.replace(/ \(.*\)$/, '').replace(/ – .*$/, ''); };
          out.push({ rd: rd + i, id: e.id, fr: nom(e.fr), en: nom(e.en), he: nom(e.he), type: e.type });
        }
      });
    }
    return out;
  }

  var api = {
    rdFromGreg: rdFromGreg, gregFromRd: gregFromRd, dow: dow, isLeap: isLeap,
    hebrewFromRd: hebrewFromRd, rdFromHebrew: rdFromHebrew, monthNameFr: monthNameFr, monthNameHe: monthNameHe,
    hebrewDateHe: hebrewDateHe, hebrewDateFr: hebrewDateFr, hebrewDateEn: hebrewDateEn, hebrewDate: hebrewDate,
    monthNameEn: monthNameEn, monthName: monthName, gematria: gematria, DEFAUT_METHODES: DEFAUT_METHODES, PARASHOT_EN: PARASHOT_EN,
    holidaysOnRd: holidaysOnRd, omerDay: omerDay, parashaIndices: parashaIndices, parashaName: parashaName,
    readingForShabbat: readingForShabbat, specialShabbat: specialShabbat, nextShabbat: nextShabbat,
    sunEvent: sunEvent, zmanim: zmanim, codeAvis: codeAvis, roundCalj: roundCalj, partsInTz: partsInTz, hhmm: hhmm,
    dayInfo: dayInfo, upcoming: upcoming, tefila: tefila, yahrzeit: yahrzeit, prochaineAzkara: prochaineAzkara, sansTahanoun: sansTahanoun, hiver: hiver, machiv: machiv, PARASHOT: PARASHOT,
    M: { NISSAN: NISSAN, IYAR: IYAR, SIVAN: SIVAN, TAMOUZ: TAMOUZ, AV: AV, ELOUL: ELOUL, TISHRI: TISHRI, HESHVAN: HESHVAN, KISLEV: KISLEV, TEVET: TEVET, SHEVAT: SHEVAT, ADAR: ADAR, ADAR2: ADAR2 }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Zmanim = api;
})(this);
