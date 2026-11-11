// Serveur HTTP de l'API, sans dépendance : node src/serveur.js (port : PORT, 3000 par défaut).
//   GET  /horaires?lieu=Paris&date=2026-11-13&minhag=ovadia&alot=72p   → JSON
//   POST /horaires   { "lieu": "Paris", "ajouts": {…}, "offices": […] } → JSON (mêmes options)
//   GET  /villes · GET /avis · GET /api (aide) · GET /openapi.json
//   Tout le reste : le site de présentation (dossier site/, complété par npm run build).
// Options : docs/API.md. Réponses en JSON, CORS ouvert (l'API ne fait que lire).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const API = require('./api.js');

const SITE = path.join(__dirname, '..', 'site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8' };
const AIDE = {
  nom: 'Zmanim API', version: API.VERSION, documentation: '/docs.html', openapi: '/openapi.json',
  routes: {
    'GET /horaires': 'options en paramètres : ?lieu=Paris&date=2026-11-13&jours=7&minhag=ovadia&alot=72p&format=iso',
    'POST /horaires': 'options en JSON dans le corps (pour ajouts et offices)',
    'GET /villes': 'villes connues (?langue=fr|en|he)',
    'GET /avis': 'avis et minhagim disponibles (?langue=fr|en|he)'
  },
  exemple: '/horaires?lieu=Paris&jours=7&zmanim=netz,shqia,tzeit'
};
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function repondre(res, code, corps) {
  res.writeHead(code, Object.assign({ 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' }, CORS));
  res.end(code === 204 ? '' : JSON.stringify(corps, null, 2));
}

function lireCorps(req) {
  return new Promise((ok, ko) => {
    let s = '';
    req.setEncoding('utf8');
    req.on('data', c => { s += c; if (s.length > 100000) { ko(Object.assign(new Error('corps trop long (100 ko au plus)'), { statut: 413 })); req.destroy(); } });
    req.on('end', () => {
      if (!s.trim()) return ok({});
      try { ok(JSON.parse(s)); } catch (e) { ko(Object.assign(new Error('JSON invalide'), { statut: 400 })); }
    });
    req.on('error', ko);
  });
}

// Fichier du site, sans jamais sortir du dossier site/
function fichier(res, chemin) {
  let rel;
  try { rel = decodeURIComponent(chemin === '/' ? '/index.html' : chemin); } catch (e) { return repondre(res, 400, { erreur: 'adresse invalide' }); }
  const f = path.normalize(path.join(SITE, rel));
  if (!f.startsWith(SITE + path.sep)) return repondre(res, 404, { erreur: 'introuvable' });
  fs.readFile(f, (err, data) => {
    if (err) return repondre(res, 404, { erreur: 'route inconnue', aide: '/api' });
    res.writeHead(200, Object.assign({ 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }, CORS));
    res.end(data);
  });
}

async function traiter(req, res) {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (e) { return repondre(res, 400, { erreur: 'adresse invalide' }); }
  const params = Object.fromEntries(url.searchParams);
  if (req.method === 'OPTIONS') return repondre(res, 204);
  const route = url.pathname.replace(/\/+$/, '') || '/';
  try {
    switch (route) {
      case '/api': return repondre(res, 200, AIDE);
      case '/villes': return repondre(res, 200, API.villes(params.langue));
      case '/avis': return repondre(res, 200, API.avis(params.langue));
      case '/horaires': {
        if (req.method !== 'GET' && req.method !== 'POST') return repondre(res, 405, { erreur: 'GET ou POST' });
        const corps = req.method === 'POST' ? await lireCorps(req) : {};
        if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return repondre(res, 400, { erreur: 'objet JSON attendu' });
        return repondre(res, 200, API.horaires(Object.assign({}, params, corps)));
      }
      default:
        if (req.method !== 'GET' && req.method !== 'HEAD') return repondre(res, 405, { erreur: 'GET seulement' });
        return fichier(res, url.pathname);
    }
  } catch (e) {
    if (e.code === 'OPTION_INVALIDE') return repondre(res, 400, { erreur: e.message, champ: e.champ });
    if (e.statut) return repondre(res, e.statut, { erreur: e.message });
    console.error(e);
    return repondre(res, 500, { erreur: 'erreur interne' });
  }
}

function demarrer(port, silencieux) {
  const serveur = http.createServer((req, res) => { traiter(req, res); });
  serveur.listen(port, () => { if (!silencieux) console.log(`Zmanim API : http://localhost:${serveur.address().port}/`); });
  return serveur;
}

if (require.main === module) demarrer(+process.env.PORT || 3000);
module.exports = { demarrer, traiter };
