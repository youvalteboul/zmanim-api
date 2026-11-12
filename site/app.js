// Page d'accueil : les minhagim et le bac à sable « Jouez avec les avis » (le globe : ciel.js).
// Un état unique, des contrôles qui le modifient, et un rendu qui appelle ZmanimAPI à chaque changement.
(function () {
  'use strict';
  var API = window.ZmanimAPI;
  var $ = function (id) { return document.getElementById(id); };
  var MIN = 60000;
  var NOMS = {
    alot: 'Aube', tefilin: 'Talit et tefilin', netz: 'Netz', shemaMA: 'Shema (M.A.)', shemaGRA: 'Shema (GR"A)',
    tefilaMA: 'Tefila (M.A.)', tefila: 'Tefila (GR"A)', hatsot: '\'Hatsot', minhaGuedola: 'Min\'ha guedola',
    minhaKetana: 'Min\'ha ketana', plag: 'Plag hamin\'ha', bougies: 'Allumage', shqia: 'Shqi\'a', tzeit: 'Tzeit',
    finShabbat: 'Fin de Shabbat', rabenouTam: 'Rabénou Tam'
  };
  var PAR_DEFAUT = ['alot', 'tefilin', 'netz', 'shemaGRA', 'hatsot', 'plag', 'shqia', 'tzeit'];
  // Les boutons : un curseur en degrés par avis (les autres codes, 72p…, viennent du minhag)
  var CURSEURS = [
    { k: 'alot', nom: 'Aube', min: 8, max: 22, aide: 'sous l\'horizon, le matin' },
    { k: 'misheyakir', nom: 'Talit et tefilin', min: 6, max: 14, aide: 'sous l\'horizon, le matin' },
    { k: 'tzeit', nom: 'Tzeit', min: 3, max: 12, aide: 'sous l\'horizon, le soir' },
    { k: 'fin', nom: 'Fin de Shabbat', min: 5, max: 14, aide: 'sous l\'horizon, le soir' },
    { k: 'rt', nom: 'Rabénou Tam', min: 12, max: 22, aide: 'sous l\'horizon, le soir' }
  ];
  var JOURS = [1, 3, 7, 14];
  var LANGUES = [['fr', 'FR'], ['en', 'EN'], ['he', 'עב']];
  var FORMATS = [['hhmm', '07:56'], ['iso', 'ISO'], ['ms', 'ms']];
  var AJOUTS_EXEMPLE = '{\n  "korbanot": { "ref": "netz", "proportionnelles": -90 },\n  "minhaTot": { "ref": "shqia", "minutes": -20, "arrondi": "bas5" }\n}';
  var OFFICES_EXEMPLE = '[\n  { "nom": "Cha\'harit", "jours": [0,1,2,3,4,5], "heure": "07:00" },\n  { "nom": "Cha\'harit", "jours": [6], "heure": "09:00" },\n  { "nom": "Min\'ha", "ref": "shqia", "decalage": -15, "arrondi": "bas5" }\n]';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function aujourdhui() { return iso(new Date()); }
  function plus(dateIso, n) { var p = dateIso.split('-'); return iso(new Date(+p[0], +p[1] - 1, +p[2] + n)); }
  function prochainJour(dow) { var d = new Date(); d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7)); return iso(d); }
  // Prochaine date où tombe une fête (cherchée par l'API elle-même)
  function prochaineFete(id) {
    var r = API.horaires({ lieu: 'Paris', date: aujourdhui(), jours: 366, zmanim: 'netz' });
    var j = r.jours.filter(function (x) { return x.fetes.some(function (f) { return f.id === id; }); })[0];
    return j ? j.date : aujourdhui();
  }
  function arrondi2(n) { return String(Math.round(n * 100) / 100); }

  // ---------- État ----------
  var etat;
  function etatInitial() {
    return { lieu: 'Paris', lieuObjet: null, date: aujourdhui(), jours: 7, minhag: 'ormeir', avis: {}, comparer: '',
      zmanim: PAR_DEFAUT.slice(), langue: 'fr', format: 'hhmm', tefila: false, israel: false, ajouts: '', offices: '' };
  }
  var SCENARIOS = [
    { id: 'shabbat', titre: '🕯️ Shabbat à Jérusalem', f: function (e) {
      e.lieu = 'Jérusalem'; e.date = prochainJour(5); e.jours = 3; e.comparer = 'ovadia';
      e.zmanim = ['alot', 'netz', 'shemaGRA', 'plag', 'bougies', 'shqia', 'tzeit', 'finShabbat', 'rabenouTam'];
      e.offices = '[\n  { "nom": "Kabbalat Shabbat", "jours": [5], "ref": "bougies", "decalage": 10 },\n  { "nom": "Cha\'harit", "jours": [6], "heure": "08:30" },\n  { "nom": "Min\'ha", "jours": [6], "ref": "shqia", "decalage": -40, "arrondi": "bas5" },\n  { "nom": "Arvit · Havdala", "jours": [6], "ref": "finShabbat" }\n]';
    } },
    { id: 'kippour', titre: '🌙 Kippour à New York', f: function (e) {
      e.lieu = 'New York'; e.date = plus(prochaineFete('kippour'), -1); e.jours = 2; e.minhag = 'standard';
      e.zmanim = ['alot', 'netz', 'hatsot', 'plag', 'bougies', 'shqia', 'tzeit', 'finShabbat'];
    } },
    { id: 'stockholm', titre: '☀️ Nuit blanche à Stockholm', f: function (e) {
      e.lieuObjet = { nom: 'Stockholm', lat: 59.3293, lon: 18.0686, tz: 'Europe/Stockholm' }; e.lieu = 'Stockholm';
      var an = new Date().getMonth() > 5 ? new Date().getFullYear() + 1 : new Date().getFullYear();
      e.date = an + '-06-18'; e.jours = 7; e.avis = { alot: '18' }; e.comparer = 'ormeir';
      e.zmanim = ['alot', 'tefilin', 'netz', 'hatsot', 'shqia', 'tzeit', 'rabenouTam'];
    } },
    { id: 'hanouka', titre: '🕎 Hanouka à Paris', f: function (e) {
      e.date = prochaineFete('hanouka'); e.jours = 7; e.tefila = true; e.zmanim = ['netz', 'hatsot', 'plag', 'shqia', 'tzeit'];
    } },
    { id: 'marseille', titre: '🌊 Séfarades de Marseille', f: function (e) {
      e.lieu = 'Marseille'; e.minhag = 'ovadia'; e.comparer = 'ormeir'; e.jours = 7;
      e.zmanim = ['alot', 'tefilin', 'netz', 'shemaMA', 'shemaGRA', 'plag', 'shqia', 'tzeit', 'rabenouTam'];
      e.ajouts = AJOUTS_EXEMPLE; e.offices = OFFICES_EXEMPLE;
    } },
    { id: 'hasard', titre: '🎲 Au hasard', f: function (e) {
      var v = API.villes('fr'), x = v[Math.floor(Math.random() * v.length)];
      e.lieu = x.nom; e.date = plus(aujourdhui(), Math.floor(Math.random() * 365));
      var m = API.avis('fr').minhagim; e.minhag = m[Math.floor(Math.random() * m.length)].id;
      var c = CURSEURS[Math.floor(Math.random() * CURSEURS.length)];
      e.avis = {}; e.avis[c.k] = arrondi2(c.min + Math.random() * (c.max - c.min));
      e.jours = 7; e.langue = ['fr', 'en', 'he'][Math.floor(Math.random() * 3)];
    } }
  ];

  function options(e, pourComparer) {
    var o = { lieu: e.lieuObjet || e.lieu, date: e.date || aujourdhui(), jours: e.jours };
    var m = pourComparer || e.minhag;
    if (m !== 'ormeir') o.minhag = m;
    if (!pourComparer) for (var k in e.avis) o[k] = e.avis[k];
    if (e.zmanim.length !== API.ZMANIM.length) o.zmanim = e.zmanim.slice();
    if (e.format !== 'hhmm') o.format = e.format;
    if (e.langue !== 'fr') o.langue = e.langue;
    if (e.tefila) o.tefila = true;
    if (e.israel) o.israel = true;
    ['ajouts', 'offices'].forEach(function (k) {
      var t = (e[k] || '').trim(); if (!t) return;
      try { o[k] = JSON.parse(t); } catch (err) { throw { message: k + ' : JSON invalide (' + err.message + ')' }; }
    });
    return o;
  }

  // ---------- Contrôles ----------
  function segments(id, liste, cle, nb) {
    $(id).innerHTML = liste.map(function (x) {
      var v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x;
      return '<button type="button" role="radio" data-v="' + esc(v) + '">' + esc(l) + '</button>';
    }).join('');
    $(id).addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      etat[cle] = nb ? +b.dataset.v : b.dataset.v; rendre(true);
    });
  }
  function construire() {
    var cat = API.avis('fr');
    $('minhagim').innerHTML = cat.minhagim.map(function (m) {
      return '<div class="carte minhag"><h3>' + esc(m.nom) + ' <code>' + esc(m.id) + '</code></h3><p>' + esc(m.description) + '</p></div>';
    }).join('');
    $('scenarios').innerHTML = SCENARIOS.map(function (s) { return '<button type="button" class="scenario" data-s="' + s.id + '">' + esc(s.titre) + '</button>'; }).join('');
    $('scenarios').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-s]'); if (!b) return;
      var s = SCENARIOS.filter(function (x) { return x.id === b.dataset.s; })[0];
      etat = etatInitial(); s.f(etat); precedent = null;
      [].forEach.call(document.querySelectorAll('.scenario'), function (x) { x.classList.toggle('actif', x === b); });
      rendre(false);
    });
    segments('f-jours', JOURS.map(function (n) { return [n, n]; }), 'jours', true);
    segments('f-minhag', cat.minhagim.map(function (m) { return [m.id, { ormeir: 'Or Méïr', ovadia: 'Rav Ovadia', standard: 'Ashkénaze' }[m.id] || m.id]; }), 'minhag');
    segments('f-langue', LANGUES, 'langue');
    segments('f-format', FORMATS, 'format');
    $('f-comparer').innerHTML += cat.minhagim.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.nom) + '</option>'; }).join('');
    $('villes').innerHTML = API.villes('fr').map(function (v) { return '<option value="' + esc(v.nom) + '">' + esc(v.nomPays) + '</option>'; }).join('');
    $('f-avis').innerHTML = CURSEURS.map(function (c) {
      return '<div class="bouton-avis" data-k="' + c.k + '"><div class="ba-tete"><label for="c-' + c.k + '">' + esc(c.nom) + '</label>' +
        '<button type="button" class="ba-reset" data-reset="' + c.k + '" aria-label="Revenir au minhag pour ' + esc(c.nom) + '" title="Revenir au minhag">↺</button></div>' +
        '<output id="v-' + c.k + '" for="c-' + c.k + '"></output>' +
        '<input type="range" id="c-' + c.k + '" data-avis="' + c.k + '" min="' + c.min + '" max="' + c.max + '" step="0.1" aria-describedby="a-' + c.k + '">' +
        '<span class="ba-aide" id="a-' + c.k + '">' + esc(c.aide) + '</span></div>';
    }).join('') + '<div class="bouton-avis"><div class="ba-tete"><span class="lib" id="l-plag">Plag hamin\'ha</span></div><div class="segments petit" id="f-plag" role="radiogroup" aria-labelledby="l-plag"></div><span class="ba-aide">journée comptée selon…</span></div>';
    segments('f-plag', [['', 'minhag'], ['gra', 'GR"A'], ['ma', 'M.A.'], ['yy', 'Y.Y.']], 'plagChoix');
    $('f-zmanim').innerHTML = API.ZMANIM.map(function (k) { return '<label><input type="checkbox" value="' + k + '">' + esc(NOMS[k]) + '</label>'; }).join('');

    $('f-avis').addEventListener('input', function (ev) {
      var k = ev.target.dataset.avis; if (!k) return;
      etat.avis[k] = arrondi2(+ev.target.value); rendre(true);
    });
    $('f-avis').addEventListener('click', function (ev) {
      var r = ev.target.closest('[data-reset]'); if (!r) return;
      delete etat.avis[r.dataset.reset]; rendre(true);
    });
    $('f-lieu').addEventListener('change', function () { etat.lieu = $('f-lieu').value.trim(); etat.lieuObjet = null; rendre(false); });
    $('f-date').addEventListener('change', function () { etat.date = $('f-date').value; rendre(false); });
    $('f-comparer').addEventListener('change', function () { etat.comparer = $('f-comparer').value; rendre(true); });
    $('f-zmanim').addEventListener('change', function () {
      etat.zmanim = API.ZMANIM.filter(function (k) { return $('f-zmanim').querySelector('input[value="' + k + '"]').checked; }); rendre(true);
    });
    $('f-tefila').addEventListener('change', function () { etat.tefila = $('f-tefila').checked; rendre(true); });
    $('f-israel').addEventListener('change', function () { etat.israel = $('f-israel').checked; rendre(true); });
    var t;
    ['ajouts', 'offices'].forEach(function (k) {
      $('f-' + k).addEventListener('input', function () { etat[k] = $('f-' + k).value; clearTimeout(t); t = setTimeout(function () { rendre(true); }, 250); });
    });
  }
  // Recopie l'état dans les contrôles
  function synchroniser(methodes) {
    $('f-lieu').value = etat.lieu; $('f-date').value = etat.date;
    $('f-comparer').value = etat.comparer;
    $('f-tefila').checked = etat.tefila; $('f-israel').checked = etat.israel;
    if (document.activeElement !== $('f-ajouts')) $('f-ajouts').value = etat.ajouts;
    if (document.activeElement !== $('f-offices')) $('f-offices').value = etat.offices;
    var choix = { 'f-jours': String(etat.jours), 'f-minhag': etat.minhag, 'f-langue': etat.langue, 'f-format': etat.format, 'f-plag': etat.avis.plag || '' };
    Object.keys(choix).forEach(function (id) {
      [].forEach.call($(id).querySelectorAll('button'), function (b) { b.setAttribute('aria-checked', String(b.dataset.v === choix[id])); });
    });
    [].forEach.call($('f-zmanim').querySelectorAll('input'), function (c) { c.checked = etat.zmanim.indexOf(c.value) >= 0; });
    CURSEURS.forEach(function (c) {
      var code = methodes ? String(methodes[c.k]) : '', perso = c.k in etat.avis, deg = /^\d+(\.\d+)?$/.test(code);
      var r = $('c-' + c.k), boite = r.closest('.bouton-avis');
      if (document.activeElement !== r) r.value = deg ? code : (c.min + c.max) / 2;
      boite.classList.toggle('perso', perso);
      boite.classList.toggle('autre', !deg);
      $('v-' + c.k).innerHTML = deg ? esc(code) + '<small>°</small>' : esc(code === 'rt' ? 'R. Tam' : code === 'min' ? methodes.finMinutes + ' min' : code.replace(/p$/, ' min prop.').replace(/f$/, ' min'));
    });
  }
  // ---------- Rendu ----------
  var precedent = null; // horaires précédents (ms), pour animer ce qui bouge
  function rendre(animer) {
    if (etat.plagChoix !== undefined) { if (etat.plagChoix) etat.avis.plag = etat.plagChoix; else delete etat.avis.plag; delete etat.plagChoix; }
    var o, r, rms, rc;
    try {
      o = options(etat);
      r = API.horaires(o);
      rms = API.horaires(Object.assign({}, o, { format: 'ms', langue: 'fr' }));
      rc = etat.comparer ? API.horaires(Object.assign(options(etat, etat.comparer), { format: 'ms', calendrier: false })) : null;
    } catch (e) {
      synchroniser(null);
      var msg = '<div class="erreur" role="alert">' + esc(e.message || e) + '</div>';
      $('p-tableau').innerHTML = msg; $('p-json').innerHTML = msg; $('p-code').innerHTML = msg;
      return;
    }
    synchroniser(r.avis.methodes);
    $('resume').innerHTML = '<b>' + esc(r.lieu.nom || (r.lieu.lat + ', ' + r.lieu.lon)) + '</b> · ' + esc(r.lieu.tz.replace(/_/g, ' ')) +
      ' · <span class="pastille">' + esc(r.avis.minhag === 'personnalise' ? 'avis personnalisés' : r.avis.minhag) + '</span>';
    $('p-tableau').innerHTML = tableau(r, rms, rc, animer ? precedent : null);
    $('p-json').innerHTML = bloc('Réponse', colorer(JSON.stringify(r, null, 2)), true);
    $('p-code').innerHTML = codes(o);
    precedent = { cle: JSON.stringify([o.lieu, o.date, o.jours]), v: valeurs(rms) };
    if (animer) setTimeout(function () { [].forEach.call(document.querySelectorAll('.bouge'), function (c) { c.classList.remove('bouge'); }); }, 2600);
  }
  function valeurs(rms) {
    var v = {};
    rms.jours.forEach(function (j) {
      for (var k in j.zmanim) v[j.date + k] = j.zmanim[k];
      for (var a in (j.ajouts || {})) v[j.date + '+' + a] = j.ajouts[a];
    });
    return v;
  }
  function ecart(a, b) {
    var m = Math.round((a - b) / MIN);
    return (m > 0 ? '+' : m < 0 ? '−' : '±') + Math.abs(m);
  }
  function cellule(val, ms, cle, rcVal, prec, nul) {
    var anim = prec && prec[cle] !== undefined && ms !== null && prec[cle] !== null && Math.round(prec[cle] / MIN) !== Math.round(ms / MIN);
    var html = val === null ? '<span class="jamais" title="Le soleil n\'atteint pas cet angle ce jour-là">' + nul + '</span>' : '<span class="h">' + esc(val) + '</span>';
    if (anim) html += '<span class="delta">' + ecart(ms, prec[cle]) + '</span>';
    if (rcVal !== undefined && ms !== null && rcVal !== null && Math.round(rcVal / MIN) !== Math.round(ms / MIN)) {
      html += '<span class="compare" title="Avec le minhag comparé">' + heureCourte(rcVal) + ' · ' + ecart(ms, rcVal) + '</span>';
    }
    return '<td class="' + (anim ? 'bouge' : '') + '">' + html + '</td>';
  }
  var fmtH = {};
  function heureCourte(t) {
    var tz = etat._tz; if (!fmtH[tz]) fmtH[tz] = new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    return fmtH[tz].format(new Date(t));
  }
  function tableau(r, rms, rc, prec) {
    etat._tz = r.lieu.tz;
    var memeVue = prec && prec.cle === JSON.stringify([etat.lieuObjet || etat.lieu, etat.date, etat.jours]) ? prec.v : null;
    var jours = r.jours, nul = { fr: 'jamais', en: 'never', he: 'אין' }[r.reglages.langue];
    var locale = { fr: 'fr-FR', en: 'en-GB', he: 'he-IL' }[r.reglages.langue];
    var tete = '<tr><th class="coin" scope="col"><span class="sr">Zman</span></th>' + jours.map(function (j) {
      var p = j.date.split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
      var badges = (j.fetes || []).map(function (f) { return '<span class="badge f-' + esc(f.type) + '">' + esc(f.nom) + '</span>'; });
      if (j.shabbat && j.paracha) badges.unshift('<span class="badge f-shabbat">' + esc(j.paracha.nom) + '</span>');
      if (j.omer) badges.push('<span class="badge">Omer ' + j.omer + '</span>');
      return '<th scope="col" class="' + (j.shabbat || j.yomTov ? 'saint' : '') + '"><span class="j-nom">' + esc(j.nomJour) + '</span>' +
        '<span class="j-date">' + esc(d.toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })) + '</span>' +
        (j.hebreu ? '<span class="j-heb">' + esc(j.hebreu.texte) + '</span>' : '') + (badges.length ? '<span class="badges">' + badges.join('') + '</span>' : '') + '</th>';
    }).join('') + '</tr>';
    var lignes = Object.keys(jours[0].zmanim).map(function (k) {
      return '<tr><th scope="row">' + esc(NOMS[k]) + '</th>' + jours.map(function (j, i) {
        var ms = rms.jours[i].zmanim[k];
        return cellule(j.zmanim[k], ms, j.date + k, rc ? rc.jours[i].zmanim[k] : undefined, memeVue, nul);
      }).join('') + '</tr>';
    }).join('');
    Object.keys(jours[0].ajouts || {}).forEach(function (a) {
      lignes += '<tr class="ajout"><th scope="row">' + esc(a) + '<small>ajout</small></th>' + jours.map(function (j, i) {
        return cellule(j.ajouts[a], rms.jours[i].ajouts[a], j.date + '+' + a, undefined, memeVue, nul);
      }).join('') + '</tr>';
    });
    var autre = function (titre, f) {
      var cells = jours.map(f);
      if (!cells.some(Boolean)) return '';
      return '<tr class="liste"><th scope="row">' + esc(titre) + '</th>' + cells.map(function (c) { return '<td>' + (c || '') + '</td>'; }).join('') + '</tr>';
    };
    lignes += autre('Allumage · fin', function (j) { return (j.evenements || []).map(function (e) { return '<span class="evt-l"><b>' + (e.heure === null ? '<span class="jamais" title="Le soleil n\'atteint pas cet angle ce jour-là">' + nul + '</span>' : esc(e.heure)) + '</b> ' + esc(e.nom) + '</span>'; }).join(''); });
    lignes += autre('Offices', function (j) { return (j.offices || []).map(function (o) { return '<span class="evt-l"><b>' + esc(o.heure) + '</b> ' + esc(o.nom) + '</span>'; }).join(''); });
    lignes += autre('Tefila', function (j) { return (j.tefila || []).map(function (x) { return '<span class="badge">' + esc(x.nom) + '</span>'; }).join(''); });
    var legende = rc ? '<p class="legende-compare">En petit sous une heure : la même heure selon ' + esc(API.avis('fr').minhagim.filter(function (m) { return m.id === etat.comparer; })[0].nom) + ', et l\'écart en minutes (rien quand elles sont identiques).</p>' : '';
    var cols = '<colgroup><col class="c-nom">' + jours.map(function (j) { return '<col class="' + (j.shabbat || j.yomTov ? 'saint' : '') + '">'; }).join('') + '</colgroup>';
    return '<div class="tableau grille-jours" dir="' + (r.reglages.langue === 'he' ? 'rtl' : 'ltr') + '"><table>' + cols + '<thead>' + tete + '</thead><tbody>' + lignes + '</tbody></table></div>' + legende;
  }

  // ---------- JSON et code ----------
  function colorer(json) {
    return esc(json).replace(/(&quot;[^&]*?(?:&quot;))(\s*:)?|\b(-?\d+(?:\.\d+)?)\b|\b(true|false|null)\b/g, function (m, s, deux, n, b) {
      if (s) return deux ? '<span class="k">' + s + '</span>' + deux : '<span class="s">' + s + '</span>';
      if (n) return '<span class="n">' + n + '</span>';
      return '<span class="c">' + b + '</span>';
    });
  }
  function bloc(titre, texte, brut) {
    return '<p class="code-titre">' + esc(titre) + '</p><div class="copie"><button type="button" data-copie>Copier</button><pre class="code">' + (brut ? texte : esc(texte)) + '</pre></div>';
  }
  function base() { return /^https?:$/.test(location.protocol) && location.port ? location.origin : 'http://localhost:3000'; }
  function codes(o) {
    var simple = {}, complexe = false;
    Object.keys(o).forEach(function (k) {
      if (k === 'ajouts' || k === 'offices') complexe = true;
      else if (k === 'lieu' && typeof o.lieu === 'object') { simple.lat = o.lieu.lat; simple.lon = o.lieu.lon; simple.tz = o.lieu.tz; }
      else simple[k] = Array.isArray(o[k]) ? o[k].join(',') : o[k];
    });
    var qs = Object.keys(simple).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(simple[k]).replace(/%2C/g, ','); }).join('&');
    var lisible = JSON.stringify(o, null, 2).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, function (m, c) { return '[' + c.split(/,\s*/).join(', ') + ']'; });
    var out = bloc('JavaScript (Node ou navigateur)', 'const r = ZmanimAPI.horaires(' + lisible + ');');
    out += bloc(complexe ? 'HTTP GET (sans ajouts ni offices)' : 'HTTP GET', base() + '/horaires?' + qs);
    out += bloc('curl (POST, toutes les options)', "curl -H 'Content-Type: application/json' \\\n  -d '" + JSON.stringify(o).replace(/'/g, "'\\''") + "' \\\n  " + base() + '/horaires');
    return out;
  }
  function onglets() {
    var bs = document.querySelectorAll('.onglets button');
    function choisir(i) {
      [].forEach.call(bs, function (b, k) {
        b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1;
        $(b.getAttribute('aria-controls')).hidden = k !== i;
      });
    }
    [].forEach.call(bs, function (b, i) {
      b.addEventListener('click', function () { choisir(i); });
      b.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (n) { var k = (i + n + bs.length) % bs.length; choisir(k); bs[k].focus(); }
      });
    });
    choisir(0);
  }

  document.addEventListener('DOMContentLoaded', function () {
    etat = etatInitial();
    construire();
    onglets();
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-copie]'); if (!b) return;
      var txt = b.nextElementSibling.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
        b.textContent = 'Copié'; setTimeout(function () { b.textContent = 'Copier'; }, 1500);
      }, function () { b.textContent = 'Sélectionnez le texte'; });
    });
    rendre(false);
  });
})();
