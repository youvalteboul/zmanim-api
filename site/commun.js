// Bascule clair / sombre, mémorisée dans le navigateur (si possible).
(function () {
  var racine = document.documentElement;
  try { var t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') racine.dataset.theme = t; } catch (e) {}
  function sombre() {
    return racine.dataset.theme ? racine.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.querySelector('.bascule-theme');
    if (!b) return;
    var maj = function () { b.textContent = sombre() ? '☀' : '☾'; b.setAttribute('aria-label', sombre() ? 'Thème clair' : 'Thème sombre'); };
    maj();
    b.addEventListener('click', function () {
      racine.dataset.theme = sombre() ? 'light' : 'dark';
      try { localStorage.setItem('theme', racine.dataset.theme); } catch (e) {}
      maj();
    });
  });
})();
