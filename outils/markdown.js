// Mise en page de docs/API.md pour le site : le Markdown simple qu'on y utilise (titres, paragraphes,
// listes, tableaux, blocs de code, `code`, **gras**, liens), sans dépendance.
'use strict';
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ancre = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function enLigne(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push('<code>' + esc(c) + '</code>'); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => '<a href="' + u.replace(/^docs\.html$/, 'docs.html') + '">' + t + '</a>');
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => codes[+i]);
}

module.exports = function markdown(src) {
  const lignes = src.replace(/\r/g, '').split('\n');
  const out = [], sommaire = [];
  let i = 0;
  while (i < lignes.length) {
    const l = lignes[i];
    if (/^```/.test(l)) {
      const lang = l.slice(3).trim(), bloc = [];
      for (i++; i < lignes.length && !/^```/.test(lignes[i]); i++) bloc.push(lignes[i]);
      i++;
      out.push('<pre class="code"' + (lang ? ' data-lang="' + esc(lang) + '"' : '') + '><code>' + esc(bloc.join('\n')) + '</code></pre>');
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(l);
    if (h) {
      const n = h[1].length, texte = enLigne(h[2]), id = ancre(h[2]);
      if (n === 2) sommaire.push({ id, texte, sous: [] });
      if (n === 3 && sommaire.length) sommaire[sommaire.length - 1].sous.push({ id, texte });
      out.push(`<h${n} id="${id}">${texte}</h${n}>`);
      i++; continue;
    }
    if (/^\|/.test(l) && i + 1 < lignes.length && /^\|[\s:|-]+\|$/.test(lignes[i + 1])) {
      const cellules = x => x.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => enLigne(c.trim().replace(/\\\|/g, '|')));
      const tete = cellules(l);
      i += 2;
      const rangs = [];
      for (; i < lignes.length && /^\|/.test(lignes[i]); i++) rangs.push(cellules(lignes[i]));
      out.push('<div class="table"><table><thead><tr>' + tete.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' +
        rangs.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (/^- /.test(l)) {
      const items = [];
      for (; i < lignes.length && /^- /.test(lignes[i]); i++) items.push('<li>' + enLigne(lignes[i].slice(2)) + '</li>');
      out.push('<ul>' + items.join('') + '</ul>');
      continue;
    }
    if (!l.trim()) { i++; continue; }
    const para = [];
    for (; i < lignes.length && lignes[i].trim() && !/^(```|#|\||- )/.test(lignes[i]); i++) para.push(lignes[i]);
    out.push('<p>' + enLigne(para.join(' ')) + '</p>');
  }
  const nav = '<nav class="sommaire" aria-label="Sommaire"><p class="sommaire-titre">Sur cette page</p><ul>' + sommaire.map(s =>
    '<li><a href="#' + s.id + '">' + s.texte + '</a>' + (s.sous.length ? '<ul>' + s.sous.map(x => '<li><a href="#' + x.id + '">' + x.texte + '</a></li>').join('') + '</ul>' : '') + '</li>').join('') + '</ul></nav>';
  return nav + '<article class="doc">' + out.join('\n') + '</article>';
};
