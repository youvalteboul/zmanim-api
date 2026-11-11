/* Zmanim API 1.0.0 : ZmanimAPI.horaires({ lieu: 'Paris' }). Documentation : docs/API.md */
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

/* Avis proposés pour chaque zman, et pré-réglages de minhag. Les codes sont ceux de Zmanim.zmanim()
 * (voir engine.js). Libellés : [français, anglais, hébreu]. Les pré-réglages sont des points de départ :
 * chaque communauté les fait valider par son rabbin, puis ajuste avis par avis dans les réglages. */
(function (root) {
  'use strict';
  var METHODES = {
    alot: [
      ['16.1', ['16,1° sous l\'horizon', '16.1° below the horizon', '16.1° מתחת לאופק']],
      ['72p', ['72 min proportionnelles avant le netz', '72 proportional min before sunrise', '72 דק׳ זמניות לפני הנץ']],
      ['90p', ['90 min proportionnelles avant le netz', '90 proportional min before sunrise', '90 דק׳ זמניות לפני הנץ']],
      ['72f', ['72 min fixes avant le netz', '72 fixed min before sunrise', '72 דק׳ קבועות לפני הנץ']],
      ['19.8', ['19,8° sous l\'horizon', '19.8° below the horizon', '19.8° מתחת לאופק']]
    ],
    misheyakir: [
      ['11', ['11° sous l\'horizon', '11° below the horizon', '11° מתחת לאופק']],
      ['11.5', ['11,5° sous l\'horizon', '11.5° below the horizon', '11.5° מתחת לאופק']],
      ['10.2', ['10,2° sous l\'horizon', '10.2° below the horizon', '10.2° מתחת לאופק']],
      ['6p', ['Aube + 6 min proportionnelles', 'Dawn + 6 proportional min', 'עלות השחר + 6 דק׳ זמניות']]
    ],
    tzeit: [
      ['7.08', ['7,08° sous l\'horizon', '7.08° below the horizon', '7.08° מתחת לאופק']],
      ['8.5', ['8,5° sous l\'horizon', '8.5° below the horizon', '8.5° מתחת לאופק']],
      ['13.5p', ['13,5 min proportionnelles après la shqi\'a', '13.5 proportional min after sunset', '13.5 דק׳ זמניות אחרי השקיעה']],
      ['18f', ['18 min après la shqi\'a', '18 min after sunset', '18 דק׳ אחרי השקיעה']],
      ['20f', ['20 min après la shqi\'a', '20 min after sunset', '20 דק׳ אחרי השקיעה']]
    ],
    fin: [
      ['8.5', ['8,5° sous l\'horizon', '8.5° below the horizon', '8.5° מתחת לאופק']],
      ['7.08', ['7,08° (comme le tzeit)', '7.08° (as nightfall)', '7.08° (כצאת הכוכבים)']],
      ['min', ['Minutes fixes après la shqi\'a', 'Fixed minutes after sunset', 'דקות קבועות אחרי השקיעה']],
      ['rt', ['Rabénou Tam', 'Rabbeinu Tam', 'רבנו תם']]
    ],
    rt: [
      ['16.1', ['16,1° sous l\'horizon', '16.1° below the horizon', '16.1° מתחת לאופק']],
      ['72p', ['72 min proportionnelles après la shqi\'a', '72 proportional min after sunset', '72 דק׳ זמניות אחרי השקיעה']],
      ['72f', ['72 min fixes après la shqi\'a (P\'ri Megadim)', '72 fixed min after sunset (Pri Megadim)', '72 דק׳ קבועות אחרי השקיעה (פרי מגדים)']]
    ],
    plag: [
      ['gra', ['GR"A / Levouch (journée du netz à la shqi\'a)', 'GR"A / Levush (sunrise to sunset)', 'גר״א / לבוש (מהנץ עד השקיעה)']],
      ['ma', ['Maguen Avraham (journée de l\'aube à la nuit)', 'Magen Avraham (dawn to nightfall)', 'מגן אברהם (מעלות השחר עד צאת הכוכבים)']],
      ['yy', ['Yalkout Yossef (tzeit − 1¼ h proportionnelle)', 'Yalkut Yosef (nightfall − 1¼ proportional h)', 'ילקוט יוסף (צאת הכוכבים פחות שעה ורבע זמנית)']]
    ]
  };
  var PRESETS = [
    { id: 'ormeir', noms: ['Or Méïr · Rav Posen (CalJ)', 'Or Meir · Rav Posen (CalJ)', 'אור מאיר · הרב פוזן (CalJ)'],
      desc: ['Les horaires de calj.net, en degrés : aube 16,1°, tefilin 11°, tzeit 7,08°, fin de Shabbat 8,5°.',
        'The calj.net times, in degrees: dawn 16.1°, tefillin 11°, nightfall 7.08°, end of Shabbat 8.5°.',
        'זמני calj.net, במעלות: עלות השחר 16.1°, תפילין 11°, צאת הכוכבים 7.08°, צאת השבת 8.5°.'],
      mention: ['Or Méïr · Rav Posen', 'Or Meir · Rav Posen', 'אור מאיר · הרב פוזן'],
      methodes: { alot: '16.1', misheyakir: '11', tzeit: '7.08', fin: '8.5', finMinutes: 50, rt: '16.1', plag: 'gra' } },
    { id: 'ovadia', noms: ['Rav Ovadia Yossef (séfarade)', 'Rav Ovadia Yosef (Sephardi)', 'הרב עובדיה יוסף (ספרדי)'],
      desc: ['En minutes proportionnelles : aube 72 min avant le netz, tzeit 13,5 min, Rabénou Tam 72 min, plag du Yalkout Yossef.',
        'In proportional minutes: dawn 72 min before sunrise, nightfall 13.5 min, Rabbeinu Tam 72 min, Yalkut Yosef plag.',
        'בדקות זמניות: עלות השחר 72 דק׳ לפני הנץ, צאת הכוכבים 13.5 דק׳, רבנו תם 72 דק׳, פלג המנחה לפי ילקוט יוסף.'],
      mention: ['Rav Ovadia Yossef', 'Rav Ovadia Yosef', 'מרן הרב עובדיה יוסף'],
      methodes: { alot: '72p', misheyakir: '6p', tzeit: '13.5p', fin: '8.5', finMinutes: 50, rt: '72p', plag: 'yy' }, nusach: 'sefarade' },
    { id: 'standard', noms: ['Standard ashkénaze (hebcal)', 'Standard Ashkenazi (hebcal)', 'אשכנזי מקובל (hebcal)'],
      desc: ['Les réglages courants d\'hebcal : aube 16,1°, tefilin 11,5°, tzeit et fin de Shabbat 8,5°, Rabénou Tam 72 min.',
        'The common hebcal settings: dawn 16.1°, tefillin 11.5°, nightfall and end of Shabbat 8.5°, Rabbeinu Tam 72 min.',
        'הגדרות hebcal המקובלות: עלות השחר 16.1°, תפילין 11.5°, צאת הכוכבים וצאת השבת 8.5°, רבנו תם 72 דק׳.'],
      mention: ['', '', ''],
      methodes: { alot: '16.1', misheyakir: '11.5', tzeit: '8.5', fin: '8.5', finMinutes: 50, rt: '72f', plag: 'gra' }, nusach: 'ashkenaze' }
  ];
  var IDX = { fr: 0, en: 1, he: 2 };
  function libelle(tab, lang) { return tab[IDX[lang] || 0]; }
  function trouver(id) { return PRESETS.filter(function (p) { return p.id === id; })[0] || null; }
  // Pré-réglage correspondant exactement à des avis (sinon null = personnalisé)
  function reconnaitre(m) {
    return PRESETS.filter(function (p) {
      return Object.keys(p.methodes).every(function (k) { return k === 'finMinutes' && m.fin !== 'min' ? true : String(m[k]) === String(p.methodes[k]); });
    })[0] || null;
  }
  var api = { METHODES: METHODES, PRESETS: PRESETS, libelle: libelle, trouver: trouver, reconnaitre: reconnaitre };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Avis = api;
})(this);

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

/* Textes renvoyés par l'API en français, anglais et hébreu : noms des jours, événements (allumage, fin de Shabbat,
 * jeûnes) et ajouts de la tefila. Repris de l'écran de la synagogue (src/i18n.js). */
(function (root) {
  'use strict';
  var L = {
    "fr": {
      "evtBougies": "Allumage des bougies",
      "evtBougiesPasAvant": "Allumage, pas avant",
      "evtFinShabbat": "Fin de Shabbat",
      "evtFinJeune": "Fin du jeûne",
      "evtFinShabbatFete": "Fin de Shabbat et de la fête",
      "evtFinFete": "Fin de la fête",
      "evtDebutJeune": "Début du jeûne",
      "evtDebutTisha": "Début du jeûne (Tisha Beav)",
      "evtDebutKippour": "Début du jeûne (Kippour)",
      "jours": [
        "dimanche",
        "lundi",
        "mardi",
        "mercredi",
        "jeudi",
        "vendredi",
        "samedi"
      ],
      "tf_ceSoir": "Ce soir : ",
      "tf_desCeSoir": "Dès ce soir : ",
      "tf_mashiv": "Machiv haroua'h",
      "tf_morid": "Morid hatal",
      "tf_mashivMoussaf": "Machiv haroua'h dès Moussaf",
      "tf_moridMoussaf": "Morid hatal dès Moussaf",
      "tf_stopMashivMoussaf": "Fin de Machiv haroua'h dès Moussaf",
      "tf_barekh": "Barekh alénou",
      "tf_barkhenou": "Barkhénou",
      "tf_talOumatar": "Tal oumatar",
      "tf_berakha": "Veten berakha",
      "tf_yaale": "Yaalé veyavo",
      "tf_hallelPartiel": "Hallel partiel",
      "tf_hallelComplet": "Hallel complet",
      "tf_hallelMinhag": "Hallel (selon le minhag)",
      "tf_moussaf": "Moussaf",
      "tf_alHanissim": "Al hanissim",
      "tf_meguila": "Lecture de la Méguila",
      "tf_pasTahanoun": "Pas de Ta'hanoun",
      "tf_pasTahanounMinha": "Pas de Ta'hanoun à Min'ha",
      "tf_pasTsidkatekha": "Pas de Tsidkatekha",
      "tf_hamelekh": "Hamélekh hakadoch",
      "tf_zokhrenou": "Zokhrénou",
      "tf_avinou": "Avinou Malkénou",
      "tf_anenou": "Anénou",
      "tf_nahem": "Na'hem",
      "tf_selihot": "Seli'hot",
      "tf_ledavid": "LeDavid Hachem ori",
      "tf_shofar": "Chofar après Cha'harit",
      "tf_birkat": "Birkat ha'hodech : {m}",
      "evtsSemaine": "Cette semaine"
    },
    "en": {
      "evtBougies": "Candle lighting",
      "evtBougiesPasAvant": "Candle lighting, not before",
      "evtFinShabbat": "Shabbat ends",
      "evtFinJeune": "Fast ends",
      "evtFinShabbatFete": "Shabbat and Yom Tov end",
      "evtFinFete": "Yom Tov ends",
      "evtDebutJeune": "Fast begins",
      "evtDebutTisha": "Fast begins (Tish'a B'Av)",
      "evtDebutKippour": "Fast begins (Yom Kippur)",
      "jours": [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ],
      "tf_ceSoir": "Tonight: ",
      "tf_desCeSoir": "From tonight: ",
      "tf_mashiv": "Mashiv HaRuach",
      "tf_morid": "Morid HaTal",
      "tf_mashivMoussaf": "Mashiv HaRuach from Musaf",
      "tf_moridMoussaf": "Morid HaTal from Musaf",
      "tf_stopMashivMoussaf": "Stop Mashiv HaRuach from Musaf",
      "tf_barekh": "Barech Aleinu",
      "tf_barkhenou": "Barchenu",
      "tf_talOumatar": "V'ten tal umatar",
      "tf_berakha": "V'ten beracha",
      "tf_yaale": "Ya'aleh V'yavo",
      "tf_hallelPartiel": "Half Hallel",
      "tf_hallelComplet": "Full Hallel",
      "tf_hallelMinhag": "Hallel (per custom)",
      "tf_moussaf": "Musaf",
      "tf_alHanissim": "Al HaNissim",
      "tf_meguila": "Megillah reading",
      "tf_pasTahanoun": "No Tachanun",
      "tf_pasTahanounMinha": "No Tachanun at Mincha",
      "tf_pasTsidkatekha": "No Tzidkatcha",
      "tf_hamelekh": "HaMelech HaKadosh",
      "tf_zokhrenou": "Zochreinu",
      "tf_avinou": "Avinu Malkeinu",
      "tf_anenou": "Aneinu",
      "tf_nahem": "Nachem",
      "tf_selihot": "Selichot",
      "tf_ledavid": "L'David Hashem Ori",
      "tf_shofar": "Shofar after Shacharit",
      "tf_birkat": "Blessing of the new month: {m}",
      "evtsSemaine": "This week"
    },
    "he": {
      "evtBougies": "הדלקת נרות",
      "evtBougiesPasAvant": "הדלקת נרות, לא לפני",
      "evtFinShabbat": "צאת השבת",
      "evtFinJeune": "סוף הצום",
      "evtFinShabbatFete": "צאת השבת והחג",
      "evtFinFete": "צאת החג",
      "evtDebutJeune": "תחילת הצום",
      "evtDebutTisha": "תחילת הצום (תשעה באב)",
      "evtDebutKippour": "תחילת הצום (יום כיפור)",
      "jours": [
        "יום ראשון",
        "יום שני",
        "יום שלישי",
        "יום רביעי",
        "יום חמישי",
        "יום שישי",
        "שבת"
      ],
      "tf_ceSoir": "הערב: ",
      "tf_desCeSoir": "מהערב: ",
      "tf_mashiv": "משיב הרוח",
      "tf_morid": "מוריד הטל",
      "tf_mashivMoussaf": "משיב הרוח ממוסף",
      "tf_moridMoussaf": "מוריד הטל ממוסף",
      "tf_stopMashivMoussaf": "הפסקת משיב הרוח ממוסף",
      "tf_barekh": "ברך עלינו",
      "tf_barkhenou": "ברכנו",
      "tf_talOumatar": "ותן טל ומטר",
      "tf_berakha": "ותן ברכה",
      "tf_yaale": "יעלה ויבוא",
      "tf_hallelPartiel": "חצי הלל",
      "tf_hallelComplet": "הלל שלם",
      "tf_hallelMinhag": "הלל (לפי המנהג)",
      "tf_moussaf": "מוסף",
      "tf_alHanissim": "על הניסים",
      "tf_meguila": "קריאת המגילה",
      "tf_pasTahanoun": "אין אומרים תחנון",
      "tf_pasTahanounMinha": "אין תחנון במנחה",
      "tf_pasTsidkatekha": "אין אומרים צדקתך",
      "tf_hamelekh": "המלך הקדוש",
      "tf_zokhrenou": "זכרנו",
      "tf_avinou": "אבינו מלכנו",
      "tf_anenou": "עננו",
      "tf_nahem": "נחם",
      "tf_selihot": "סליחות",
      "tf_ledavid": "לדוד ה׳ אורי",
      "tf_shofar": "תקיעת שופר אחר שחרית",
      "tf_birkat": "ברכת החודש: {m}",
      "evtsSemaine": "השבוע"
    }
  };
  function t(lang, cle, vars) {
    var dict = L[lang] || L.fr;
    var v = dict[cle] !== undefined ? dict[cle] : L.fr[cle];
    if (v === undefined) return cle;
    if (vars && typeof v === 'string') v = v.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
    return v;
  }
  var api = { L: L, LANGUES: ['fr', 'en', 'he'], t: t };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Textes = api;
})(this);

/* API des horaires : une seule fonction, horaires(options), qui renvoie tout ce que calcule l'écran
 * (zmanim selon les avis choisis, date hébraïque, fêtes, paracha, allumage, jeûnes, tefila, offices)
 * sous forme d'objet JSON. Fonctionne dans Node (require) et dans un navigateur (window.ZmanimAPI).
 * Chaque option est facultative ; une option invalide lève une erreur qui nomme le champ fautif.
 * Documentation : docs/API.md. */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var Z = node ? require('./engine.js') : root.Zmanim;
  var Avis = node ? require('./avis.js') : root.Avis;
  var Villes = node ? require('./villes.js') : root.Villes;
  var Textes = node ? require('./textes.js') : root.Textes;

  var VERSION = 1;
  var MIN = 60000;
  var ZMANIM = ['alot', 'tefilin', 'netz', 'shemaMA', 'shemaGRA', 'tefilaMA', 'tefila', 'hatsot', 'minhaGuedola',
    'minhaKetana', 'plag', 'bougies', 'shqia', 'tzeit', 'finShabbat', 'rabenouTam'];
  var CLES_AVIS = ['alot', 'misheyakir', 'tzeit', 'fin', 'finMinutes', 'rt', 'plag'];
  var LANGUES = ['fr', 'en', 'he'];
  var FORMATS = ['hhmm', 'iso', 'ms'];
  var ARRONDIS = ['calj', 'aucun', 'proche'];
  var NUSACH = ['sefarade', 'ashkenaze', 'sfard'];

  function ErreurAPI(champ, message) {
    var e = new Error(champ + ' : ' + message);
    e.name = 'ErreurAPI'; e.champ = champ; e.code = 'OPTION_INVALIDE';
    return e;
  }
  function verifier(cond, champ, message) { if (!cond) throw ErreurAPI(champ, message); }
  function nombre(v, champ) {
    var n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() ? +v : NaN);
    verifier(isFinite(n), champ, 'nombre attendu, reçu ' + JSON.stringify(v));
    return n;
  }
  function booleen(v, champ) {
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1' || v === 'true' || v === 'oui' || v === 'yes') return true;
    if (v === 0 || v === '0' || v === 'false' || v === 'non' || v === 'no' || v === '') return false;
    throw ErreurAPI(champ, 'vrai ou faux attendu, reçu ' + JSON.stringify(v));
  }
  function parmi(v, liste, champ) {
    verifier(liste.indexOf(v) >= 0, champ, JSON.stringify(v) + ' inconnu (valeurs possibles : ' + liste.join(', ') + ')');
    return v;
  }
  function liste(v) { return Array.isArray(v) ? v : String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
  function sansAccents(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9֐-׿]/g, ''); }

  // ---------- Lieu ----------
  function trouverVille(nom) {
    // Nom exact (sans accents ni tirets, en français, anglais ou hébreu), sinon début de nom s'il est sans ambiguïté
    var k = sansAccents(nom);
    if (!k) return null;
    var noms = function (v) { return [v.nom, v.noms.fr, v.noms.en, v.noms.he].filter(Boolean).map(sansAccents); };
    var exact = Villes.VILLES.filter(function (v) { return noms(v).indexOf(k) >= 0; });
    if (exact.length) return exact[0];
    var debut = Villes.VILLES.filter(function (v) { return noms(v).some(function (n) { return n.indexOf(k) === 0; }); });
    return debut.length === 1 ? debut[0] : null;
  }
  function lireLieu(o) {
    var l = o.lieu, base = {};
    if (typeof l === 'string' && l.trim()) {
      var c = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(l);
      if (c) base = { lat: +c[1], lon: +c[2] };
      else {
        var v = trouverVille(l);
        verifier(v, 'lieu', 'ville inconnue « ' + l + ' » (liste : villes(), ou donner lat, lon et tz)');
        base = { nom: v.nom, lat: v.lat, lon: v.lon, tz: v.tz, bougies: v.bougies, israel: v.israel, pays: v.pays };
      }
    } else if (l && typeof l === 'object') {
      ['nom', 'lat', 'lon', 'tz', 'bougies', 'israel'].forEach(function (k) { if (l[k] !== undefined) base[k] = l[k]; });
    } else verifier(l === undefined || l === null || l === '', 'lieu', 'nom de ville, « lat,lon » ou objet { lat, lon, tz } attendu');
    // Les options de premier niveau l'emportent sur la ville
    ['lat', 'lon', 'tz', 'bougies', 'israel'].forEach(function (k) { if (o[k] !== undefined && o[k] !== '') base[k] = o[k]; });
    verifier(base.lat !== undefined && base.lon !== undefined, 'lieu', 'obligatoire : une ville (ex. « Paris ») ou lat et lon');
    var r = {
      nom: base.nom ? String(base.nom) : null,
      lat: nombre(base.lat, 'lat'), lon: nombre(base.lon, 'lon'),
      tz: base.tz ? String(base.tz) : null,
      bougies: base.bougies === undefined ? 18 : nombre(base.bougies, 'bougies'),
      israel: base.israel === undefined ? false : booleen(base.israel, 'israel')
    };
    verifier(r.lat >= -90 && r.lat <= 90, 'lat', 'entre -90 et 90');
    verifier(r.lon >= -180 && r.lon <= 180, 'lon', 'entre -180 et 180');
    verifier(r.bougies >= 0 && r.bougies <= 120, 'bougies', 'entre 0 et 120 minutes');
    if (!r.tz) {
      var proche = Villes.proche(r.lat, r.lon);
      verifier(proche >= 0, 'tz', 'fuseau horaire obligatoire loin des villes connues (ex. Europe/Paris)');
      r.tz = Villes.VILLES[proche].tz;
      r.tzDeduit = true;
    }
    try { new Intl.DateTimeFormat('en', { timeZone: r.tz }); } catch (e) { throw ErreurAPI('tz', 'fuseau horaire inconnu « ' + r.tz + ' » (ex. Europe/Paris)'); }
    return r;
  }

  // ---------- Avis ----------
  function codeValide(cle, code) {
    var connus = (Avis.METHODES[cle] || []).map(function (x) { return x[0]; });
    if (connus.indexOf(code) >= 0) return true;
    if (cle === 'plag') return false;
    return !!Z.codeAvis(code);
  }
  function lireAvis(o) {
    var minhag = o.minhag === undefined || o.minhag === '' ? 'ormeir' : String(o.minhag);
    var preset = Avis.trouver(minhag);
    verifier(preset, 'minhag', JSON.stringify(minhag) + ' inconnu (valeurs possibles : ' + Avis.PRESETS.map(function (p) { return p.id; }).join(', ') + ')');
    var m = {}, k;
    for (k in preset.methodes) m[k] = preset.methodes[k];
    var demandes = {};
    if (o.avis && typeof o.avis === 'object') for (k in o.avis) demandes[k] = o.avis[k];
    CLES_AVIS.forEach(function (c) { if (o[c] !== undefined && o[c] !== '') demandes[c] = o[c]; });
    for (k in demandes) {
      verifier(CLES_AVIS.indexOf(k) >= 0, 'avis.' + k, 'avis inconnu (avis réglables : ' + CLES_AVIS.join(', ') + ')');
      if (k === 'finMinutes') { m[k] = nombre(demandes[k], 'avis.finMinutes'); verifier(m[k] >= 0 && m[k] <= 240, 'avis.finMinutes', 'entre 0 et 240'); continue; }
      var code = String(demandes[k]);
      verifier(codeValide(k, code), 'avis.' + k, '« ' + code + ' » non reconnu : ' + (k === 'plag' ? 'gra, ma ou yy'
        : 'un code de avis(), ou des degrés (« 18 »), des minutes proportionnelles (« 120p ») ou fixes (« 45f »)'));
      m[k] = code;
    }
    var reconnu = Avis.reconnaitre(m);
    return { methodes: m, minhag: reconnu ? reconnu.id : 'personnalise', preset: preset };
  }

  // ---------- Date ----------
  function lireDate(v, tz) {
    if (v === undefined || v === null || v === '' || v === 'aujourdhui' || v === 'today') {
      var p = Z.partsInTz(Date.now(), tz);
      return { y: p.y, m: p.m, d: p.d };
    }
    if (v instanceof Date) {
      verifier(!isNaN(v), 'date', 'date invalide');
      var q = Z.partsInTz(v.getTime(), tz);
      return { y: q.y, m: q.m, d: q.d };
    }
    var s = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
    verifier(s, 'date', 'format AAAA-MM-JJ attendu, reçu ' + JSON.stringify(v));
    var y = +s[1], mo = +s[2], d = +s[3], g = Z.gregFromRd(Z.rdFromGreg(y, mo, d));
    verifier(g.y === y && g.m === mo && g.d === d, 'date', JSON.stringify(v) + " n'existe pas");
    verifier(y >= 1900 && y <= 2239, 'date', 'entre 1900 et 2239');
    return { y: y, m: mo, d: d };
  }

  // ---------- Heures ----------
  function deux(n) { return (n < 10 ? '0' : '') + n; }
  function arrondir(t, mode, haut) {
    if (t === null || t === undefined) return null;
    if (mode === 'aucun') return Math.floor(t / 1000) * 1000;
    if (mode === 'proche') return Math.round(t / MIN) * MIN;
    return Z.roundCalj(t, haut);
  }
  function ecrire(t, format, tz) {
    if (t === null || t === undefined || !isFinite(t)) return null;
    if (format === 'ms') return t;
    var p = Z.partsInTz(t, tz);
    if (format === 'hhmm') return deux(p.h) + ':' + deux(p.mi);
    var dec = Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(t / 1000) * 1000) / MIN);
    var signe = dec < 0 ? '-' : '+', a = Math.abs(dec);
    return p.y + '-' + deux(p.m) + '-' + deux(p.d) + 'T' + deux(p.h) + ':' + deux(p.mi) + ':' + deux(p.s) +
      signe + deux(Math.floor(a / 60)) + ':' + deux(a % 60);
  }
  // Arrondi d'un horaire à un pas de N minutes (bas5, haut10, bas15…), en heure locale
  function lireArrondiPas(v, champ) {
    if (v === undefined || v === null || v === '' || v === 'aucun') return null;
    var m = /^(bas|haut|proche)(\d{1,2})$/.exec(String(v));
    verifier(m && +m[2] >= 1 && +m[2] <= 60, champ, 'aucun, ou basN / hautN / procheN (N minutes, ex. bas5, haut10)');
    return { sens: m[1], pas: +m[2] };
  }
  function appliquerPas(t, a, tz) {
    if (t === null || !a) return t;
    var p = Z.partsInTz(t, tz), mn = p.h * 60 + p.mi;
    var r = a.sens === 'bas' ? Math.floor(mn / a.pas) * a.pas : a.sens === 'haut' ? Math.ceil(mn / a.pas) * a.pas : Math.round(mn / a.pas) * a.pas;
    return t - p.s * 1000 - (t % 1000) + (r - mn) * MIN;
  }
  // Heure locale fixe (« 08:30 ») du jour rd dans le fuseau tz
  function heureFixe(rd, hm, tz) {
    var g = Z.gregFromRd(rd);
    var approx = Date.UTC(g.y, g.m - 1, g.d, +hm[1], +hm[2]);
    var p = Z.partsInTz(approx, tz);
    return approx - (Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - approx);
  }

  // ---------- Zmanim ajoutés par l'utilisateur ----------
  // { ref: 'netz', minutes: -30 } · { ref: 'shqia', proportionnelles: 13.5 } · { angle: 12, moment: 'soir' }
  // + arrondi facultatif (bas5, haut10…)
  function lireAjouts(a) {
    if (a === undefined || a === null || a === '') return [];
    if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { throw ErreurAPI('ajouts', 'JSON invalide'); } }
    verifier(typeof a === 'object' && !Array.isArray(a), 'ajouts', 'objet { nom: définition } attendu');
    return Object.keys(a).map(function (nom) {
      var d = a[nom], ch = 'ajouts.' + nom;
      verifier(d && typeof d === 'object', ch, 'objet attendu');
      var r = { nom: nom, arrondi: lireArrondiPas(d.arrondi, ch + '.arrondi') };
      if (d.angle !== undefined) {
        r.angle = nombre(d.angle, ch + '.angle');
        verifier(r.angle > -90 && r.angle < 90, ch + '.angle', 'degrés sous l\'horizon, entre -90 et 90');
        r.matin = parmi(d.moment || 'soir', ['matin', 'soir'], ch + '.moment') === 'matin';
      } else {
        r.ref = parmi(d.ref, ZMANIM, ch + '.ref');
        verifier((d.minutes !== undefined) !== (d.proportionnelles !== undefined), ch, 'donner minutes ou proportionnelles (une seule)');
        r.minutes = d.minutes !== undefined ? nombre(d.minutes, ch + '.minutes') : 0;
        r.prop = d.proportionnelles !== undefined ? nombre(d.proportionnelles, ch + '.proportionnelles') : 0;
      }
      return r;
    });
  }
  function calculerAjout(a, g, z, lieu) {
    if (a.angle !== undefined) return Z.sunEvent(g.y, g.m, g.d, lieu.lat, lieu.lon, -a.angle, a.matin);
    var base = z[a.ref];
    if (base === null || base === undefined) return null;
    return base + a.minutes * MIN + z.heureGRA * a.prop / 60;
  }

  // ---------- Offices (même format que les réglages de l'écran) ----------
  // { nom, jours: [0..6] (6 = Shabbat ou fête, 5 = vendredi ou veille de fête), heure: '08:00' }
  // { nom, jours, ref: 'shqia', decalage: -15, arrondi: 'bas5' }
  function lireOffices(l) {
    if (l === undefined || l === null || l === '') return [];
    if (typeof l === 'string') { try { l = JSON.parse(l); } catch (e) { throw ErreurAPI('offices', 'JSON invalide'); } }
    verifier(Array.isArray(l), 'offices', 'liste attendue');
    return l.map(function (o, i) {
      var ch = 'offices[' + i + ']';
      verifier(o && typeof o === 'object', ch, 'objet attendu');
      var r = { nom: o.nom === undefined ? '' : String(o.nom), note: o.note ? String(o.note) : '' };
      r.jours = o.jours === undefined ? [0, 1, 2, 3, 4, 5, 6] : liste(o.jours).map(function (j) {
        var n = nombre(j, ch + '.jours'); verifier(n >= 0 && n <= 6 && n === Math.floor(n), ch + '.jours', 'entiers de 0 (dimanche) à 6 (Shabbat)'); return n;
      });
      if (o.heure !== undefined && (o.mode === undefined || o.mode === 'fixe')) {
        r.hm = /^(\d{1,2}):(\d{2})$/.exec(String(o.heure));
        verifier(r.hm && +r.hm[1] < 24 && +r.hm[2] < 60, ch + '.heure', 'format HH:MM attendu');
      } else {
        r.ref = parmi(o.ref, ZMANIM, ch + '.ref');
        r.decalage = o.decalage === undefined ? 0 : nombre(o.decalage, ch + '.decalage');
        r.arrondi = lireArrondiPas(o.arrondi, ch + '.arrondi');
      }
      return r;
    });
  }
  function typeJour(di) {
    if (di.isShabbat || di.isYomTov) return 6;
    if (di.dow === 5 || di.tomorrow.some(function (e) { return e.type === 'yomtov'; })) return 5;
    return di.dow;
  }

  // ---------- Point d'entrée ----------
  function horaires(options) {
    var o = options || {};
    verifier(typeof o === 'object', 'options', 'objet attendu');
    var lieu = lireLieu(o);
    var avis = lireAvis(o);
    var langue = parmi(o.langue || 'fr', LANGUES, 'langue');
    var format = parmi(o.format || 'hhmm', FORMATS, 'format');
    var arrondi = parmi(o.arrondi || 'calj', ARRONDIS, 'arrondi');
    var jours = o.jours === undefined || o.jours === '' ? 1 : nombre(o.jours, 'jours');
    verifier(jours >= 1 && jours <= 366 && jours === Math.floor(jours), 'jours', 'entier de 1 à 366');
    var cles = o.zmanim === undefined || o.zmanim === '' || o.zmanim === 'tous' ? ZMANIM : liste(o.zmanim).map(function (k) { return parmi(k, ZMANIM, 'zmanim'); });
    var nusach = parmi(o.nusach || avis.preset.nusach || 'sefarade', NUSACH, 'nusach');
    var avecCal = o.calendrier === undefined ? true : booleen(o.calendrier, 'calendrier');
    var avecTefila = o.tefila === undefined ? false : booleen(o.tefila, 'tefila');
    var ajouts = lireAjouts(o.ajouts);
    var offices = lireOffices(o.offices);
    var debut = lireDate(o.date, lieu.tz);
    var opt = {
      lat: lieu.lat, lon: lieu.lon, bougies: lieu.bougies, methodes: avis.methodes, israel: lieu.israel,
      joursIsrael: o.joursIsrael === undefined ? lieu.israel : booleen(o.joursIsrael, 'joursIsrael'),
      nusach: nusach, pourim15: o.pourim15 === undefined ? false : booleen(o.pourim15, 'pourim15')
    };
    var T = function (cle, vars) { return Textes.t(langue, cle, vars); };
    var nomL = function (x) { return langue === 'he' ? x.he : langue === 'en' ? x.en : x.fr; };
    var rd0 = Z.rdFromGreg(debut.y, debut.m, debut.d);
    var out = [];
    for (var i = 0; i < jours; i++) {
      var rd = rd0 + i, g = Z.gregFromRd(rd);
      var di = Z.dayInfo(g.y, g.m, g.d, opt), z = di.zmanim;
      var j = { date: g.y + '-' + deux(g.m) + '-' + deux(g.d), jourSemaine: di.dow, nomJour: T('jours')[di.dow], zmanim: {} };
      cles.forEach(function (k) { j.zmanim[k] = ecrire(arrondir(z[k], arrondi, k === 'finShabbat'), format, lieu.tz); });
      if (ajouts.length) {
        j.ajouts = {};
        ajouts.forEach(function (a) { j.ajouts[a.nom] = ecrire(appliquerPas(arrondir(calculerAjout(a, g, z, lieu), arrondi, false), a.arrondi, lieu.tz), format, lieu.tz); });
      }
      if (offices.length) {
        var tj = typeJour(di);
        j.offices = offices.filter(function (of) { return of.jours.indexOf(tj) >= 0; }).map(function (of) {
          var t = of.hm ? heureFixe(rd, of.hm, lieu.tz) : (z[of.ref] === null ? null
            : appliquerPas(Z.roundCalj(z[of.ref], of.ref === 'finShabbat') + of.decalage * MIN, of.arrondi, lieu.tz));
          return { nom: of.nom, heure: ecrire(t, format, lieu.tz), note: of.note || undefined, _t: t };
        }).sort(function (a, b) { return (a._t === null) - (b._t === null) || a._t - b._t; })
          .map(function (x) { delete x._t; return x; });
      }
      if (avecCal) {
        var h = di.hebrew, sh = Z.nextShabbat(rd), lecture = Z.readingForShabbat(sh, opt);
        j.hebreu = { jour: h.d, mois: h.m, annee: h.y, nomMois: Z.monthName(h.y, h.m, langue), texte: Z.hebrewDate(h, langue) };
        j.fetes = di.today.map(function (e) { return { id: e.id, type: e.type, nom: nomL(e) }; });
        j.shabbat = di.isShabbat; j.yomTov = di.isYomTov;
        j.paracha = lecture ? { nom: nomL(lecture), fete: lecture.fete, date: (function (s) { return s.y + '-' + deux(s.m) + '-' + deux(s.d); })(Z.gregFromRd(sh)) } : null;
        j.shabbatParticulier = Z.specialShabbat(sh, opt).map(function (x) { return langue === 'he' ? x[1] : langue === 'en' ? x[2] : x[0]; });
        j.omer = di.omer || null;
        j.evenements = di.events.map(function (e) {
          return { cle: e.k, nom: T(e.lk), heure: ecrire(arrondir(e.t, arrondi === 'calj' ? 'aucun' : arrondi, false), format, lieu.tz) };
        });
      }
      if (avecTefila) {
        j.tefila = Z.tefila(rd, opt).map(function (x) { return { cle: x.k, nom: T(x.k, x) }; });
      }
      out.push(j);
    }
    return {
      version: VERSION,
      lieu: { nom: lieu.nom, lat: lieu.lat, lon: lieu.lon, tz: lieu.tz, tzDeduit: lieu.tzDeduit || undefined, israel: lieu.israel, bougies: lieu.bougies },
      avis: { minhag: avis.minhag, methodes: avis.methodes, nusach: nusach },
      reglages: { langue: langue, format: format, arrondi: arrondi },
      jours: out
    };
  }

  // ---------- Catalogues ----------
  function villes(langue) {
    langue = parmi(langue || 'fr', LANGUES, 'langue');
    return Villes.VILLES.map(function (v) {
      return { nom: Villes.nomVille(v, langue), id: v.nom, pays: v.pays, nomPays: Villes.nomPays(v.pays, langue), lat: v.lat, lon: v.lon, tz: v.tz, bougies: v.bougies, israel: v.israel };
    });
  }
  function avis(langue) {
    langue = parmi(langue || 'fr', LANGUES, 'langue');
    var methodes = {};
    Object.keys(Avis.METHODES).forEach(function (k) {
      methodes[k] = Avis.METHODES[k].map(function (x) { return { code: x[0], nom: Avis.libelle(x[1], langue) }; });
    });
    return {
      methodes: methodes,
      libres: 'alot, misheyakir, tzeit, fin, rt : degrés (« 18 »), minutes proportionnelles (« 120p ») ou fixes (« 45f »)',
      minhagim: Avis.PRESETS.map(function (p) { return { id: p.id, nom: Avis.libelle(p.noms, langue), description: Avis.libelle(p.desc, langue), methodes: p.methodes }; }),
      zmanim: ZMANIM
    };
  }

  var api = { horaires: horaires, villes: villes, avis: avis, ZMANIM: ZMANIM, VERSION: VERSION };
  if (node) module.exports = api; else root.ZmanimAPI = api;
})(this);
