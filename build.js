// Construit les fichiers publiés à partir des sources :
//   dist/zmanim-api.js    l'API pour les navigateurs, en un seul script (window.ZmanimAPI)
//   site/zmanim-api.js    la même, pour le bac à sable du site
//   site/openapi.json     la description OpenAPI de l'API HTTP (src/openapi.js)
//   site/docs.html        la documentation (docs/API.md mise en page)
'use strict';
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');
const ici = (...p) => path.join(__dirname, ...p);
const lire = f => fs.readFileSync(ici(f), 'utf8');

const bundle = `/* Zmanim API ${pkg.version} : ZmanimAPI.horaires({ lieu: 'Paris' }). Documentation : docs/API.md */\n` +
  ['src/engine.js', 'src/avis.js', 'src/villes.js', 'src/textes.js', 'src/api.js'].map(lire).join('\n');
fs.mkdirSync(ici('dist'), { recursive: true });
fs.writeFileSync(ici('dist/zmanim-api.js'), bundle);
fs.writeFileSync(ici('site/zmanim-api.js'), bundle);
fs.writeFileSync(ici('site/openapi.json'), JSON.stringify(require('./src/openapi.js')(pkg.version), null, 2) + '\n');
const md = require('./outils/markdown.js');
const gabarit = lire('site/docs.gabarit.html');
fs.writeFileSync(ici('site/docs.html'), gabarit.replace('<!--DOC-->', () => md(lire('docs/API.md'))).replace(/VERSION/g, pkg.version));
console.log('Construit : dist/zmanim-api.js (' + bundle.length + ' octets), site/openapi.json, site/docs.html');
