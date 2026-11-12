// Accueil : le globe, la carte de la ville choisie, « en ce moment dans le monde » et le temps accéléré.
// Toutes les heures viennent de ZmanimAPI, calculées dans le navigateur.
const API = window.ZmanimAPI;
const $ = id => document.getElementById(id);
const MIN = 60000;
const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NOMS = { alot: 'Aube', tefilin: 'Talit et tefilin', netz: 'Netz', shemaGRA: 'Fin du Shema', tefila: 'Fin de la Tefila', hatsot: '\'Hatsot',
  minhaGuedola: 'Min\'ha guedola', plag: 'Plag hamin\'ha', bougies: 'Allumage', shqia: 'Shqi\'a', tzeit: 'Tzeit', rabenouTam: 'Rabénou Tam' };
const SUITE = ['alot', 'tefilin', 'netz', 'shemaGRA', 'tefila', 'hatsot', 'minhaGuedola', 'plag', 'shqia', 'tzeit', 'rabenouTam'];
const GRILLE = ['alot', 'netz', 'shemaGRA', 'hatsot', 'shqia', 'tzeit'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- Temps : réel, ou une journée en 30 secondes ----------
const temps = { rapide: false, base: Date.now(), depart: performance.now() };
const maintenant = () => temps.rapide ? temps.base + (performance.now() - temps.depart) * 2880 : Date.now();
function basculer(rapide) {
  temps.base = maintenant(); temps.depart = performance.now(); temps.rapide = rapide;
  if (!rapide) temps.base = Date.now();
  $('t-direct').setAttribute('aria-pressed', String(!rapide));
  $('t-rapide').setAttribute('aria-pressed', String(rapide));
  document.querySelector('.ciel').classList.toggle('accelere', rapide);
}

// ---------- Horaires, mis en cache par ville et par jour ----------
const fmtDate = {};
function dateDans(tz, t) {
  if (!fmtDate[tz]) fmtDate[tz] = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmtDate[tz].format(new Date(t));
}
const cache = new Map();
function horaires(v, t) {
  const date = dateDans(v.tz, t), cle = v.id + date;
  if (!cache.has(cle)) {
    if (cache.size > 400) cache.clear();
    const veille = API.horaires({ lieu: v.id, date, jours: 2, format: 'ms', calendrier: false, zmanim: SUITE }).jours;
    const cal = API.horaires({ lieu: v.id, date, zmanim: 'netz' }).jours[0];
    cache.set(cle, { aujourd: veille[0].zmanim, demain: veille[1].zmanim, cal });
  }
  return cache.get(cle);
}
function prochain(v, t, cles) {
  const h = horaires(v, t);
  for (const jour of [h.aujourd, h.demain]) for (const k of cles) if (jour[k] && jour[k] > t) return { k, t: jour[k] };
  return null;
}
function dans(ms) {
  const m = Math.round(ms / MIN);
  if (m < 1) return 'maintenant';
  if (m < 60) return 'dans ' + m + ' min';
  return 'dans ' + Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0');
}
const fmtHeure = {};
function heure(t, tz, secondes) {
  const k = tz + secondes;
  if (!fmtHeure[k]) fmtHeure[k] = new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: secondes ? '2-digit' : undefined, hourCycle: 'h23' });
  return fmtHeure[k].format(new Date(t));
}

// ---------- Carte de la ville ----------
const villes = API.villes('fr');
let choisie = null;
function choisir(v, globe, immediat) {
  choisie = v;
  if (globe) globe.viser(v, immediat);
  $('v-nom').textContent = v.nom;
  $('v-sous').textContent = v.nomPays + ' · ' + v.tz.replace(/_/g, ' ');
  const q = 'lieu=' + encodeURIComponent(v.nom.length <= v.id.length ? v.nom : v.id);
  $('v-code').textContent = 'GET /horaires?' + q;
  $('ville').classList.remove('change'); void $('ville').offsetWidth; $('ville').classList.add('change');
  majCarte();
}
function majCarte() {
  const v = choisie; if (!v) return;
  const t = maintenant(), h = horaires(v, t), z = h.aujourd;
  $('v-heure').textContent = heure(t, v.tz, !temps.rapide);
  $('v-heb').textContent = h.cal.hebreu.texte + (h.cal.paracha && !h.cal.paracha.fete ? ' · ' + h.cal.paracha.nom : '');
  const p = prochain(v, t, SUITE);
  $('v-prochain-lib').textContent = p ? 'Prochain : ' + NOMS[p.k] : 'Prochain zman';
  $('v-prochain').textContent = p ? heure(p.t, v.tz) : '—';
  $('v-dans').textContent = p ? dans(p.t - t) : '';
  // Frise de la journée, de l'aube à la nuit de Rabénou Tam
  const debut = z.alot || z.netz - 90 * MIN, fin = z.rabenouTam || z.tzeit + 60 * MIN;
  const pc = x => Math.max(0, Math.min(100, (x - debut) / (fin - debut) * 100));
  const marques = ['netz', 'hatsot', 'shqia', 'tzeit'].filter(k => z[k]).map(k =>
    `<span class="marque-frise" style="left:${pc(z[k]).toFixed(2)}%"><i></i>${k === 'tzeit' ? '' : '<em>' + esc(NOMS[k]) + '</em>'}</span>`).join('');
  const jour = `<span class="frise-jour" style="left:${pc(z.netz).toFixed(2)}%;right:${(100 - pc(z.shqia)).toFixed(2)}%"></span>`;
  const ici = t >= debut && t <= fin ? `<span class="frise-ici" style="left:${pc(t).toFixed(2)}%"></span>` : '';
  $('v-frise').innerHTML = '<span class="frise-fond"></span>' + jour + marques + ici;
  $('v-zmanim').innerHTML = GRILLE.map(k => {
    const passe = z[k] && z[k] <= t;
    return `<div class="${passe ? 'passe' : ''}${p && p.k === k && z[k] === p.t ? ' suivant' : ''}"><dt>${esc(NOMS[k])}</dt><dd>${z[k] ? heure(z[k], v.tz) : '—'}</dd></div>`;
  }).join('');
}

// ---------- En ce moment dans le monde ----------
const EVENEMENTS = ['alot', 'netz', 'shqia', 'tzeit'];
function majMonde() {
  const t = maintenant(), liste = [];
  for (const v of villes) {
    const p = prochain(v, t, EVENEMENTS);
    if (p && p.t - t < 3 * 3600000) liste.push({ v, p });
  }
  liste.sort((a, b) => a.p.t - b.p.t);
  const vus = new Set(), choix = [];
  for (const x of liste) { const k = x.p.k + Math.round(x.p.t / (10 * MIN)); if (!vus.has(x.v.pays + k)) { vus.add(x.v.pays + k); choix.push(x); } if (choix.length === 4) break; }
  $('monde').innerHTML = '<span class="monde-titre">Bientôt dans le monde</span>' + choix.map(x =>
    `<button type="button" class="evt" data-ville="${esc(x.v.id)}"><b>${esc(NOMS[x.p.k])}</b> à ${esc(x.v.nom)} <span>${dans(x.p.t - t)}</span></button>`).join('');
  $('t-utc').textContent = new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

// ---------- Démarrage ----------
function villeDeDepart() {
  let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
  return villes.find(v => v.tz === tz && /Paris|Londres|New York|Jérusalem|Montr/.test(v.id)) || villes.find(v => v.tz === tz) || villes.find(v => v.id === 'Jérusalem') || villes[0];
}

async function demarrer() {
  let globe = null;
  const depart = villeDeDepart();
  choisir(depart, null);
  const bulle = $('bulle');
  try {
    const canvas = document.createElement('canvas');
    if (!(canvas.getContext('webgl2') || canvas.getContext('webgl'))) throw new Error('webgl');
    const { creerGlobe } = await import('./globe.js');
    globe = await creerGlobe($('globe'), {
      villes, maintenant, rapide: () => temps.rapide,
      onChoix: v => choisir(v, globe),
      onSurvol: (v, e) => {
        if (!v) { bulle.hidden = true; return; }
        const p = prochain(v, maintenant(), EVENEMENTS);
        bulle.innerHTML = `<b>${esc(v.nom)}</b>${p ? `<span>${esc(NOMS[p.k])} ${dans(p.t - maintenant())}</span>` : ''}`;
        const r = $('globe').parentElement.getBoundingClientRect();
        bulle.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
        bulle.hidden = false;
      }
    });
    globe.viser(depart, true);
    document.querySelector('.ciel').classList.add('globe-pret');
  } catch (e) {
    document.querySelector('.ciel').classList.add('sans-globe');
  }
  $('monde').addEventListener('click', e => {
    const b = e.target.closest('[data-ville]'); if (!b) return;
    const v = villes.find(x => x.id === b.dataset.ville); if (v) choisir(v, globe);
  });
  $('t-direct').addEventListener('click', () => basculer(false));
  $('t-rapide').addEventListener('click', () => basculer(!temps.rapide));
  $('v-essayer').addEventListener('click', () => {
    const f = $('f-lieu'); if (!f || !choisie) return;
    f.value = choisie.nom; f.dispatchEvent(new Event('change', { bubbles: true }));
  });
  majMonde();
  let dernier = 0;
  (function boucle(ts) {
    requestAnimationFrame(boucle);
    if (document.hidden || ts - dernier < (temps.rapide ? 120 : 1000)) return;
    dernier = ts;
    majCarte();
    if (temps.rapide || Math.floor(ts / 15000) !== Math.floor((ts - 1000) / 15000)) majMonde();
  })(0);
}
demarrer();

// Apparition des sections au défilement
if (!reduit && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.apparait').forEach(el => io.observe(el));
} else document.querySelectorAll('.apparait').forEach(el => el.classList.add('vu'));
