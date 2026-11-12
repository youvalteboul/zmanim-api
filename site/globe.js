// Globe en temps réel : la Terre en points, éclairée par le Soleil à sa vraie position.
// Jour en bleu tekhelet, crépuscule en or (de la shqi'a à 16,1° sous l'horizon, l'aube et la nuit
// de CalJ), nuit en bleu profond. Les villes de l'API sont cliquables. Three.js, sans texture :
// les continents viennent de world-atlas (Natural Earth), dessinés puis échantillonnés en points.
import * as THREE from 'three';

const RAD = Math.PI / 180;
const R = 1;
const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Latitude / longitude (degrés) → point de la sphère ; longitude 0 face à la caméra (+z)
function vecteur(lat, lon, r = R) {
  const la = lat * RAD, lo = lon * RAD;
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
}

// Point sous-solaire (formules de la NOAA, à quelques minutes d'arc près : assez pour dessiner)
export function pointSubsolaire(t) {
  const d = new Date(t);
  const debut = Date.UTC(d.getUTCFullYear(), 0, 1);
  const heures = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const g = 2 * Math.PI / 365 * ((t - debut) / 86400000 - heures / 24 + (heures - 12) / 24);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  let lon = -15 * (heures - 12 + eq / 60);
  lon = ((lon + 540) % 360) - 180;
  return { lat: dec / RAD, lon };
}

// Continents → points répartis à surface égale
async function pointsTerre() {
  const [topo, land] = await Promise.all([
    import('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm'),
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json').then(r => { if (!r.ok) throw new Error('carte'); return r.json(); })
  ]);
  const geo = topo.feature(land, land.objects.land);
  const W = 1440, H = 720;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  const anneau = r => r.forEach(([lo, la], i) => { const x = (lo + 180) / 360 * W, y = (90 - la) / 180 * H; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  for (const f of geo.features) {
    const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const p of polys) { ctx.beginPath(); p.forEach(anneau); ctx.fill('evenodd'); }
  }
  const px = ctx.getImageData(0, 0, W, H).data;
  const pos = [];
  const pas = 0.95;
  for (let lat = -84; lat <= 84; lat += pas) {
    const n = Math.max(1, Math.round(360 / pas * Math.cos(lat * RAD)));
    for (let i = 0; i < n; i++) {
      const lon = -180 + (i + (Math.abs(Math.round(lat / pas)) % 2) * 0.5) * 360 / n;
      const x = Math.min(W - 1, Math.floor((lon + 180) / 360 * W)), y = Math.min(H - 1, Math.floor((90 - lat) / 180 * H));
      if (px[(y * W + x) * 4 + 3] > 128) { const v = vecteur(lat, lon, R * 1.003); pos.push(v.x, v.y, v.z); }
    }
  }
  return new Float32Array(pos);
}

const COULEURS = `
  uniform vec3 uSoleil;
  vec3 couleurCiel(float s) {
    vec3 jour = vec3(0.50, 0.70, 1.00);
    vec3 or = vec3(1.00, 0.76, 0.36);
    vec3 nuit = vec3(0.26, 0.38, 0.66);
    // s = sinus de la hauteur du Soleil : 0 = shqi'a / netz, -0.277 = 16,1° (aube, nuit de Rabénou Tam)
    if (s > 0.0) return mix(or, jour, smoothstep(0.0, 0.22, s));
    return mix(nuit, or, pow(smoothstep(-0.277, 0.0, s), 1.4));
  }
`;

export async function creerGlobe(conteneur, options) {
  const { villes, onChoix, onSurvol, maintenant } = options;
  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendu.setClearColor(0x000000, 0);
  conteneur.appendChild(rendu.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 4.1);
  const globe = new THREE.Group();
  globe.rotation.order = 'XYZ';
  scene.add(globe);
  const uSoleil = { value: new THREE.Vector3(0, 0, 1) };

  // Sphère : bleu nuit, un peu plus claire côté jour
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.ShaderMaterial({
    uniforms: { uSoleil },
    vertexShader: `varying vec3 vN; varying vec3 vVue; void main(){ vN = normalize(position); vVue = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: COULEURS + `varying vec3 vN; varying vec3 vVue; void main(){
      float s = dot(vN, uSoleil);
      vec3 base = mix(vec3(0.025,0.05,0.11), vec3(0.06,0.13,0.27), smoothstep(-0.3, 0.6, s));
      base += vec3(0.25,0.16,0.04) * exp(-pow((s + 0.08) / 0.09, 2.0)) * 0.55;
      float bord = pow(1.0 - max(vVue.z, 0.0), 3.0);
      gl_FragColor = vec4(base + vec3(0.2,0.35,0.7) * bord * 0.5, 1.0); }`
  })));

  // Halo d'atmosphère
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.18, 64, 48), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vVue; void main(){ vVue = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vVue; void main(){ float i = pow(max(0.0, 0.72 + vVue.z), 4.0); gl_FragColor = vec4(0.30, 0.52, 1.0, 1.0) * i * 0.9; }`
  })));

  // Étoiles
  {
    const n = 1400, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(20 + Math.random() * 20); p.set([v.x, v.y, v.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb8e8, size: 0.04, sizeAttenuation: true, transparent: true, opacity: 0.4, depthWrite: false })));
  }

  // Lignes du jour : shqi'a / netz (0°) et aube / nuit à 16,1°
  const ligne = (opacite, tirets) => {
    const g = new THREE.BufferGeometry().setFromPoints(new Array(181).fill(0).map(() => new THREE.Vector3()));
    const m = tirets ? new THREE.LineDashedMaterial({ color: 0xffc35c, transparent: true, opacity: opacite, dashSize: 0.025, gapSize: 0.02 })
      : new THREE.LineBasicMaterial({ color: 0xffc35c, transparent: true, opacity: opacite });
    const l = new THREE.Line(g, m); globe.add(l); return l;
  };
  const lignes = [{ l: ligne(0.9, false), h: -0.833 }, { l: ligne(0.45, true), h: -16.1 }];
  function majLignes(s) {
    const u = new THREE.Vector3(0, 1, 0).cross(s).normalize(), v = s.clone().cross(u).normalize();
    for (const { l, h } of lignes) {
      const sh = Math.sin(h * RAD), ch = Math.cos(h * RAD), pos = l.geometry.attributes.position;
      for (let i = 0; i <= 180; i++) {
        const a = i / 180 * Math.PI * 2;
        const p = s.clone().multiplyScalar(sh).addScaledVector(u, ch * Math.cos(a)).addScaledVector(v, ch * Math.sin(a)).multiplyScalar(R * 1.004);
        pos.setXYZ(i, p.x, p.y, p.z);
      }
      pos.needsUpdate = true;
      l.computeLineDistances();
    }
  }

  // Villes
  const villesGroupe = new THREE.Group(); globe.add(villesGroupe);
  const cibles = [];
  const matVille = new THREE.MeshBasicMaterial({ color: 0xd6e4ff, transparent: true, opacity: 0.8 });
  const geoVille = new THREE.SphereGeometry(0.0062, 10, 8);
  const geoCible = new THREE.SphereGeometry(0.04, 8, 6);
  const matCible = new THREE.MeshBasicMaterial({ visible: false });
  villes.forEach((v, i) => {
    const p = vecteur(v.lat, v.lon, R * 1.006);
    const m = new THREE.Mesh(geoVille, matVille); m.position.copy(p); villesGroupe.add(m);
    const c = new THREE.Mesh(geoCible, matCible); c.position.copy(p); c.userData.i = i; villesGroupe.add(c); cibles.push(c);
  });
  // Ville choisie : point d'or et anneau qui pulse
  const anneauTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 10, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,200,100,1)'); g.addColorStop(0.18, 'rgba(255,200,100,.9)'); g.addColorStop(0.22, 'rgba(255,200,100,0)');
    g.addColorStop(0.78, 'rgba(255,200,100,0)'); g.addColorStop(0.86, 'rgba(255,200,100,.7)'); g.addColorStop(1, 'rgba(255,200,100,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const repere = new THREE.Sprite(new THREE.SpriteMaterial({ map: anneauTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  repere.scale.setScalar(0.11); repere.visible = false; globe.add(repere);

  // Continents (chargés ensuite ; le globe s'affiche déjà sans eux)
  pointsTerre().then(pos => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    globe.add(new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uSoleil, uTaille: { value: 3.1 * rendu.getPixelRatio() } }, transparent: true, depthWrite: false,
      vertexShader: COULEURS + `uniform float uTaille; varying vec3 vC; varying float vA; void main(){
        vec3 n = normalize(position); float s = dot(n, uSoleil); vC = couleurCiel(s);
        vec3 nv = normalize(normalMatrix * n); vA = smoothstep(-0.05, 0.35, nv.z) * (s > -0.277 ? 1.0 : 0.8);
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uTaille * (4.6 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
        gl_FragColor = vec4(vC, vA * smoothstep(0.5, 0.2, r)); }`
    })));
    conteneur.classList.add('terre-chargee');
  }).catch(() => conteneur.classList.add('terre-absente'));

  // Rotation : glisser pour tourner, clic sur une ville pour la choisir
  let cibleRot = null, inactifDepuis = performance.now(), glisse = null;
  const souris = new THREE.Vector2(), rayon = new THREE.Raycaster();
  function villeSous(e) {
    const r = rendu.domElement.getBoundingClientRect();
    souris.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(souris, camera);
    const touche = rayon.intersectObjects(cibles, false)[0];
    if (!touche) return null;
    // Ville cachée derrière le globe : ignorée
    const p = touche.object.getWorldPosition(new THREE.Vector3());
    return p.dot(camera.position.clone().sub(p)) > 0 ? touche.object.userData.i : null;
  }
  const el = rendu.domElement;
  el.addEventListener('pointerdown', e => { glisse = { x: e.clientX, y: e.clientY, rx: globe.rotation.x, ry: globe.rotation.y, bouge: false }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (glisse) {
      const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) glisse.bouge = true;
      if (glisse.bouge) {
        cibleRot = null;
        globe.rotation.y = glisse.ry + dx * 0.006;
        globe.rotation.x = Math.max(-1.1, Math.min(1.1, glisse.rx + dy * 0.004));
        inactifDepuis = performance.now();
      }
      return;
    }
    const i = villeSous(e);
    el.style.cursor = i === null ? 'grab' : 'pointer';
    if (onSurvol) onSurvol(i === null ? null : villes[i], e);
  });
  el.addEventListener('pointerup', e => {
    const g = glisse; glisse = null;
    if (g && !g.bouge) { const i = villeSous(e); if (i !== null) onChoix(villes[i]); }
  });
  el.addEventListener('pointerleave', () => { if (onSurvol) onSurvol(null); });

  function viser(v, immediat) {
    // Sur grand écran, la ville se place en haut à gauche du disque, à l'écart de la carte
    const large = window.innerWidth > 960;
    const ry = -v.lon * RAD - (large ? 0.38 : 0), rx = v.lat * RAD * 0.85 - (large ? 0.32 : 0);
    // Le plus court chemin en longitude
    let y0 = globe.rotation.y; const tour = Math.PI * 2;
    const ryProche = ry + Math.round((y0 - ry) / tour) * tour;
    cibleRot = { x: rx, y: ryProche };
    if (immediat || reduit) { globe.rotation.x = rx; globe.rotation.y = ryProche; cibleRot = null; }
    repere.position.copy(vecteur(v.lat, v.lon, R * 1.01)); repere.visible = true;
    inactifDepuis = performance.now();
  }

  function taille() {
    const w = conteneur.clientWidth, h = conteneur.clientHeight;
    if (!w || !h) return;
    rendu.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = window.innerWidth > 960 ? 5.1 : (w / h < 0.9 ? 4.1 / Math.max(0.62, w / h / 0.9) : 4.1);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(taille).observe(conteneur);
  taille();

  let dernierSoleil = 0, visible = true, precedent = performance.now();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(conteneur);
  function image(t) {
    requestAnimationFrame(image);
    const dt = Math.min(0.05, (t - precedent) / 1000); precedent = t;
    if (!visible || document.hidden) return;
    const now = maintenant();
    if (Math.abs(now - dernierSoleil) > 20000 || options.rapide()) {
      const s = pointSubsolaire(now); uSoleil.value.copy(vecteur(s.lat, s.lon)); majLignes(uSoleil.value); dernierSoleil = now;
    }
    if (cibleRot) {
      const k = 1 - Math.pow(0.02, dt);
      globe.rotation.x += (cibleRot.x - globe.rotation.x) * k;
      globe.rotation.y += (cibleRot.y - globe.rotation.y) * k;
      if (Math.abs(cibleRot.x - globe.rotation.x) + Math.abs(cibleRot.y - globe.rotation.y) < 0.0005) cibleRot = null;
    } else if (!reduit && !glisse && t - inactifDepuis > 7000) {
      globe.rotation.y += dt * 0.035;
    }
    if (!reduit) repere.material.opacity = 0.75 + 0.25 * Math.sin(t / 380);
    rendu.render(scene, camera);
  }
  requestAnimationFrame(image);
  return { viser };
}
