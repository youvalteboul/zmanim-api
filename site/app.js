// Page d'accueil : la carte du jour et le bac à sable, calculés par ZmanimAPI dans le navigateur.
(function () {
  'use strict';
  var API = window.ZmanimAPI;
  var $ = function (id) { return document.getElementById(id); };
  var NOMS = {
    alot: 'Aube', tefilin: 'Talit et tefilin', netz: 'Netz', shemaMA: 'Shema (M.A.)', shemaGRA: 'Shema (GR"A)',
    tefilaMA: 'Tefila (M.A.)', tefila: 'Tefila (GR"A)', hatsot: '\'Hatsot', minhaGuedola: 'Min\'ha guedola',
    minhaKetana: 'Min\'ha ketana', plag: 'Plag hamin\'ha', bougies: 'Allumage', shqia: 'Shqi\'a', tzeit: 'Tzeit',
    finShabbat: 'Fin de Shabbat', rabenouTam: 'Rabénou Tam'
  };
  var PAR_DEFAUT = ['alot', 'netz', 'shemaGRA', 'hatsot', 'plag', 'shqia', 'tzeit'];
  var AVIS = [['alot', 'Aube'], ['misheyakir', 'Talit et tefilin'], ['tzeit', 'Tzeit'], ['fin', 'Fin de Shabbat'], ['rt', 'Rabénou Tam'], ['plag', 'Plag']];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function aujourdhui() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dateLongue(iso, langue) {
    var p = iso.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12)).toLocaleDateString(langue === 'he' ? 'he-IL' : langue === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  // ---------- Carte du jour ----------
  function carteDuJour() {
    var r = API.horaires({ lieu: 'Paris', format: 'ms' });
    var h = API.horaires({ lieu: 'Paris' });
    var j = r.jours[0], jh = h.jours[0], z = j.zmanim;
    $('jour-heb').textContent = jh.hebreu.texte;
    $('jour-date').textContent = dateLongue(jh.date, 'fr') + ' · avis Or Méïr (CalJ)';
    $('jour-paracha').textContent = jh.paracha ? (jh.paracha.fete ? jh.paracha.nom : 'Paracha ' + jh.paracha.nom) : '';
    var cles = ['alot', 'netz', 'shemaGRA', 'hatsot', 'plag', 'shqia', 'tzeit', 'rabenouTam'];
    $('jour-zmanim').innerHTML = cles.map(function (k) {
      return '<div><span>' + esc(NOMS[k]) + '</span><b>' + (jh.zmanim[k] || '—') + '</b></div>';
    }).join('');
    dessinerArc(z, jh.zmanim);
  }
  function dessinerArc(z, hh) {
    var debut = z.alot || z.netz - 5400000, fin = z.tzeit || z.shqia + 3600000;
    var X0 = 30, X1 = 490, HOR = 140, HAUT = 48, BAS = 166;
    var x = function (t) { return X0 + (X1 - X0) * (t - debut) / (fin - debut); };
    var y = function (t) {
      if (t >= z.netz && t <= z.shqia) return HOR - (HOR - HAUT) * Math.sin(Math.PI * (t - z.netz) / (z.shqia - z.netz));
      var d = t < z.netz ? (z.netz - t) / (z.netz - debut) : (t - z.shqia) / (fin - z.shqia);
      return HOR + (BAS - HOR) * Math.sin(Math.PI / 2 * Math.min(1, d));
    };
    var chemin = function (a, b) { var s = ''; for (var i = 0; i <= 60; i++) { var t = a + (b - a) * i / 60; s += (i ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(t).toFixed(1); } return s; };
    var pts = [['alot', 'Aube'], ['netz', 'Netz'], ['hatsot', '\'Hatsot'], ['shqia', 'Shqi\'a'], ['tzeit', 'Tzeit']];
    var svg = '<line class="horizon" x1="10" x2="510" y1="' + HOR + '" y2="' + HOR + '" stroke-width="1"/>' +
      '<path class="nuit" d="' + chemin(debut, z.netz) + '" stroke-width="1.5"/>' +
      '<path class="trajet" d="' + chemin(z.netz, z.shqia) + '" stroke-width="2.5"/>' +
      '<path class="nuit" d="' + chemin(z.shqia, fin) + '" stroke-width="1.5"/>';
    var maintenant = Date.now();
    // Étiquettes placées là où la courbe ne passe pas : aube et tzeit dessous, vers l'extérieur ;
    // netz à gauche et shqi'a à droite, au-dessus de l'horizon ; 'hatsot au sommet.
    var place = {
      alot: function (px, py) { return { a: 'start', x: px - 6, y: py + 20 }; },
      netz: function (px, py) { return { a: 'end', x: px - 10, y: py - 22 }; },
      hatsot: function (px, py) { return { a: 'middle', x: px, y: py - 26 }; },
      shqia: function (px, py) { return { a: 'start', x: px + 10, y: py - 22 }; },
      tzeit: function (px, py) { return { a: 'end', x: px + 6, y: py + 20 }; }
    };
    pts.forEach(function (p) {
      var t = z[p[0]]; if (!t) return;
      var px = x(t), py = y(t), e = place[p[0]](px, py);
      svg += '<circle class="point" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5"/>' +
        '<text text-anchor="' + e.a + '" x="' + e.x.toFixed(1) + '" y="' + e.y.toFixed(1) + '">' + esc(p[1]) + '</text>' +
        '<text class="h" text-anchor="' + e.a + '" x="' + e.x.toFixed(1) + '" y="' + (e.y + 15).toFixed(1) + '">' + esc(hh[p[0]] || '') + '</text>';
    });
    if (maintenant > debut && maintenant < fin) svg += '<circle class="point or" cx="' + x(maintenant).toFixed(1) + '" cy="' + y(maintenant).toFixed(1) + '" r="7"><title>Maintenant</title></circle>';
    $('arc').innerHTML = svg;
  }

  // ---------- Minhagim ----------
  function minhagim() {
    var cat = API.avis('fr');
    $('minhagim').innerHTML = cat.minhagim.map(function (m) {
      return '<div class="carte minhag"><h3>' + esc(m.nom) + ' <code>' + esc(m.id) + '</code></h3><p>' + esc(m.description) + '</p></div>';
    }).join('');
    $('f-minhag').innerHTML = cat.minhagim.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.nom) + '</option>'; }).join('');
    $('f-avis').innerHTML = AVIS.map(function (a) {
      var opts = cat.methodes[a[0]].map(function (o) { return '<option value="' + esc(o.code) + '">' + esc(o.nom) + '</option>'; }).join('');
      var libre = a[0] === 'plag' ? '' : '<option value="*">Avis libre…</option>';
      return '<div class="champ"><label for="a-' + a[0] + '">' + esc(a[1]) + '</label><div class="avis-ligne"><select id="a-' + a[0] + '" data-avis="' + a[0] + '"><option value="">selon le minhag</option>' + opts + libre + '</select>' +
        '<input id="l-' + a[0] + '" data-libre="' + a[0] + '" placeholder="ex. 18" aria-label="Avis libre ' + esc(a[1]) + '" ' + (a[0] === 'plag' ? 'hidden' : 'disabled') + '></div></div>';
    }).join('');
    $('villes').innerHTML = API.villes('fr').map(function (v) { return '<option value="' + esc(v.nom) + '">' + esc(v.nomPays) + '</option>'; }).join('');
    $('f-zmanim').innerHTML = API.ZMANIM.map(function (k) {
      return '<label><input type="checkbox" value="' + k + '"' + (PAR_DEFAUT.indexOf(k) >= 0 ? ' checked' : '') + '>' + esc(NOMS[k]) + '</label>';
    }).join('');
  }

  // ---------- Bac à sable ----------
  function lireOptions() {
    var o = { lieu: $('f-lieu').value.trim(), date: $('f-date').value || aujourdhui(), jours: +$('f-jours').value || 1 };
    if ($('f-minhag').value !== 'ormeir') o.minhag = $('f-minhag').value;
    AVIS.forEach(function (a) {
      var s = $('a-' + a[0]), l = $('l-' + a[0]);
      if (l) l.disabled = s.value !== '*';
      if (s.value === '*' && l.value.trim()) o[a[0]] = l.value.trim();
      else if (s.value && s.value !== '*') o[a[0]] = s.value;
    });
    var z = [].slice.call($('f-zmanim').querySelectorAll('input:checked')).map(function (c) { return c.value; });
    if (z.length !== API.ZMANIM.length) o.zmanim = z;
    if ($('f-format').value !== 'hhmm') o.format = $('f-format').value;
    if ($('f-langue').value !== 'fr') o.langue = $('f-langue').value;
    if ($('f-tefila').checked) o.tefila = true;
    if ($('f-israel').checked) o.israel = true;
    ['ajouts', 'offices'].forEach(function (k) {
      var t = $('f-' + k).value.trim();
      if (!t) return;
      try { o[k] = JSON.parse(t); } catch (e) { throw { champ: k, message: k + ' : JSON invalide (' + e.message + ')' }; }
    });
    return o;
  }
  function tableau(r) {
    var cles = r.jours.length ? Object.keys(r.jours[0].zmanim) : [];
    var aj = r.jours.length && r.jours[0].ajouts ? Object.keys(r.jours[0].ajouts) : [];
    var resume = '<div class="resume"><span><b>' + esc(r.lieu.nom || (r.lieu.lat + ', ' + r.lieu.lon)) + '</b> · ' + esc(r.lieu.tz) + '</span>' +
      '<span>Avis : <span class="pastille">' + esc(r.avis.minhag) + '</span></span><span>' + r.jours.length + ' jour' + (r.jours.length > 1 ? 's' : '') + '</span></div>';
    var tete = '<tr><th>Date</th>' + cles.map(function (k) { return '<th>' + esc(NOMS[k]) + '</th>'; }).join('') +
      aj.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '<th>Calendrier</th><th>Offices</th></tr>';
    var lignes = r.jours.map(function (j) {
      var cal = [j.hebreu ? j.hebreu.texte : ''].concat(j.fetes ? j.fetes.map(function (f) { return f.nom; }) : [])
        .concat(j.evenements ? j.evenements.map(function (e) { return e.nom + ' ' + e.heure; }) : [])
        .concat(j.shabbat && j.paracha ? [j.paracha.nom] : []).concat(j.omer ? ['Omer ' + j.omer] : [])
        .concat(j.tefila ? j.tefila.map(function (t) { return t.nom; }) : []).filter(Boolean);
      var off = (j.offices || []).map(function (o) { return esc(o.nom) + ' ' + esc(o.heure); }).join('<br>');
      return '<tr' + (j.shabbat || j.yomTov ? ' class="saint"' : '') + '><td>' + esc(j.date) + '<span class="sous">' + esc(j.nomJour) + '</span></td>' +
        cles.map(function (k) { return '<td class="h">' + esc(j.zmanim[k] === null ? '—' : j.zmanim[k]) + '</td>'; }).join('') +
        aj.map(function (k) { return '<td class="h">' + esc(j.ajouts[k] === null ? '—' : j.ajouts[k]) + '</td>'; }).join('') +
        '<td>' + cal.map(esc).join('<span class="sous"></span>') + '</td><td>' + off + '</td></tr>';
    }).join('');
    return resume + '<div class="tableau"><table><thead>' + tete + '</thead><tbody>' + lignes + '</tbody></table></div>';
  }
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
      else simple[k] = Array.isArray(o[k]) ? o[k].join(',') : o[k];
    });
    var qs = Object.keys(simple).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(simple[k]).replace(/%2C/g, ','); }).join('&');
    // Listes de valeurs simples sur une ligne : ["alot", "netz"] plutôt qu'une valeur par ligne
    var lisible = JSON.stringify(o, null, 2).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, function (m, c) { return '[' + c.split(/,\s*/).join(', ') + ']'; });
    var js = 'const r = ZmanimAPI.horaires(' + lisible + ');';
    var out = bloc('JavaScript (Node ou navigateur)', js);
    out += bloc(complexe ? 'HTTP GET (sans ajouts ni offices)' : 'HTTP GET', base() + '/horaires?' + qs);
    out += bloc('curl (POST, toutes les options)', "curl -H 'Content-Type: application/json' \\\n  -d '" + JSON.stringify(o).replace(/'/g, "'\\''") + "' \\\n  " + base() + '/horaires');
    return out;
  }
  function calculer() {
    var o;
    try {
      o = lireOptions();
      var r = API.horaires(o);
      $('p-tableau').innerHTML = tableau(r);
      $('p-json').innerHTML = bloc('Réponse', colorer(JSON.stringify(r, null, 2)), true);
      $('p-code').innerHTML = codes(o);
    } catch (e) {
      var msg = '<div class="erreur" role="alert">' + esc(e.message || e) + '</div>';
      $('p-tableau').innerHTML = msg; $('p-json').innerHTML = msg;
      $('p-code').innerHTML = msg;
    }
  }
  function onglets() {
    var bs = document.querySelectorAll('.onglets button');
    [].forEach.call(bs, function (b, i) {
      b.addEventListener('click', function () { choisir(i); });
      b.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (n) { var k = (i + n + bs.length) % bs.length; choisir(k); bs[k].focus(); }
      });
    });
    function choisir(i) {
      [].forEach.call(bs, function (b, k) {
        b.setAttribute('aria-selected', k === i ? 'true' : 'false');
        b.tabIndex = k === i ? 0 : -1;
        $(b.getAttribute('aria-controls')).hidden = k !== i;
      });
    }
    choisir(0);
  }

  document.addEventListener('DOMContentLoaded', function () {
    try { carteDuJour(); } catch (e) { $('jour').hidden = true; }
    minhagim();
    $('f-date').value = aujourdhui();
    onglets();
    var t;
    $('form').addEventListener('input', function () { clearTimeout(t); t = setTimeout(calculer, 120); });
    $('form').addEventListener('change', calculer);
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-copie]');
      if (!b) return;
      var txt = b.nextElementSibling.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
        b.textContent = 'Copié'; setTimeout(function () { b.textContent = 'Copier'; }, 1500);
      }, function () { b.textContent = 'Sélectionnez le texte'; });
    });
    calculer();
  });
})();
