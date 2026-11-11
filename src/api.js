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
