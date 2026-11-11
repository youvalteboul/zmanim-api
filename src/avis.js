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
