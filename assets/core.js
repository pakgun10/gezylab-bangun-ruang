/* =====================================================================
   Lab Bangun Ruang — SHARED CORE (classic script, tanpa module)
   Dipakai semua lab KECUALI volume-brsl (mandiri).
   Cara pakai di tiap lab:
     <link rel="stylesheet" href="../assets/lab.css">
     <script src="../assets/vendor/three.min.js"></script>
     <script src="../assets/core.js"></script>
     <script src="js/app.js"></script>
   Di app.js:
     const lab = Lab.initLab('jaring-jaring');   // id unik per lab
     lab.gotoTahap(2); lab.unlock(3); lab.S.pred1 = 'x'; lab.save();
     const sc = Lab.createScene(document.querySelector('#c3d'));
     sc.loop();                                  // mulai render loop
     const net = Lab.buildNet('kubus', {s:3});   // jaring 3D
     sc.world.add(net.group); net.setFold(0.5);
   Struktur HTML wajib: #stepper > .step[data-t=1..5], section#tahap1..5
   Kelas CSS tersedia: lihat ../assets/lab.css (sama dengan volume-brsl)
   ===================================================================== */
window.Lab = (function(){
"use strict";

/* ---------------- utils ---------------- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const ease = k => k < .5 ? 2*k*k : 1 - Math.pow(-2*k+2, 2)/2;
function anim(ms, fn){
  return new Promise(res => {
    const t0 = performance.now();
    (function f(t){
      const k = Math.min(1, (t - t0) / ms);
      fn(ease(k));
      if (k < 1) requestAnimationFrame(f); else res();
    })(t0);
  });
}
/* tandai .opt terpilih (panggil sekali; otomatis untuk semua radio) */
function wireOpts(root){
  $$('.opt input[type=radio]', root || document).forEach(r => {
    if (r.dataset.wired) return; r.dataset.wired = '1';
    r.addEventListener('change', () => {
      $$('.opt', r.closest('.opts')).forEach(o => o.classList.remove('sel'));
      r.closest('.opt').classList.add('sel');
    });
  });
}

/* ---------------- kerangka lab : stepper + tahap + simpan ---------------- */
const scenes = [];   // semua scene three.js (untuk resize saat ganti tahap)
function initLab(id, opts){
  opts = opts || {};
  const S = { tahap: 1 };
  const storeKey = 'labb-' + id;
  try { Object.assign(S, JSON.parse(localStorage.getItem(storeKey) || '{}')); } catch(e){}
  const unlocked = { 1: true };
  function save(){
    try {
      const o = {};
      for (const k in S) if (k !== 'tahap') o[k] = S[k];
      localStorage.setItem(storeKey, JSON.stringify(o));
    } catch(e){}
  }
  function gotoTahap(n){
    S.tahap = n;
    $$('.tahap').forEach(el => el.classList.remove('active'));
    const sec = $('#tahap' + n); if (sec) sec.classList.add('active');
    $$('#stepper .step').forEach(b => {
      const t = +b.dataset.t;
      b.classList.toggle('active', t === n);
      b.classList.toggle('done', !!((t < n) || (t === 5 && S.finished)));
      b.disabled = !unlocked[t];
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    scenes.forEach(sc => setTimeout(() => sc.resize(), 80));
    if (opts.onTahap) opts.onTahap(n);
  }
  function unlock(n){
    unlocked[n] = true;
    const b = $('#stepper .step[data-t="' + n + '"]');
    if (b) b.disabled = false;
  }
  $$('#stepper .step').forEach(b =>
    b.addEventListener('click', () => { if (!b.disabled) gotoTahap(+b.dataset.t); }));
  wireOpts(document);
  gotoTahap(1);
  // deep-link: #tahap=2 (demo & pengujian) — ditunda 1 tick agar initLab
  // selesai dan `lab`/`S` sudah terisi (hindari TDZ ReferenceError)
  const mh = /tahap=([1-5])/.exec(location.hash || '');
  if (mh){
    const n = +mh[1];
    setTimeout(()=>{ for (let i = 2; i <= n; i++) unlock(i); gotoTahap(n); }, 0);
  }
  if (opts.onInit) opts.onInit(S);
  return { S, save, gotoTahap, unlock, unlocked };
}

/* ---------------- three.js : scene + orbit + label ---------------- */
const PALETTE = {
  blue: 0x38bdf8, orange: 0xf5a623, green: 0x34d399, purple: 0xa78bfa,
  pink: 0xf472b6, teal: 0x2dd4bf, gold: 0xd4a017, red: 0xef4444,
  water: 0x3b82f6, navy: 0x1e2a5a
};
function std(color, extra){
  return new THREE.MeshStandardMaterial(Object.assign(
    { color, roughness: .55, metalness: .05, side: THREE.DoubleSide }, extra || {}));
}
function createScene(canvas, opts){
  opts = opts || {};
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd7e2f5, 0.95));
  const dl = new THREE.DirectionalLight(0xffffff, 0.6);
  dl.position.set(9, 15, 7); scene.add(dl);
  const grid = new THREE.GridHelper(48, 48, 0xc3cfe8, 0xdbe4f5);
  grid.position.y = -0.02; scene.add(grid);
  const world = new THREE.Group(); scene.add(world);
  const ctl = { az: .7, pol: 1.05, R: 30, ty: 4, auto: false, on: false, x: 0, y: 0 };
  function updCam(){
    camera.position.set(
      ctl.R * Math.sin(ctl.pol) * Math.sin(ctl.az),
      ctl.ty + ctl.R * Math.cos(ctl.pol),
      ctl.R * Math.sin(ctl.pol) * Math.cos(ctl.az));
    camera.lookAt(0, ctl.ty, 0);
  }
  function resize(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  canvas.addEventListener('pointerdown', e => {
    ctl.on = true; ctl.x = e.clientX; ctl.y = e.clientY; ctl.auto = false;
    try { canvas.setPointerCapture(e.pointerId); } catch(err){}
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', e => {
    if (!ctl.on) return;
    ctl.az -= (e.clientX - ctl.x) * .008;
    ctl.pol = Math.min(1.45, Math.max(.3, ctl.pol - (e.clientY - ctl.y) * .006));
    ctl.x = e.clientX; ctl.y = e.clientY;
  });
  const up = () => { ctl.on = false; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    ctl.R = Math.min(70, Math.max(12, ctl.R + e.deltaY * .03));
  }, { passive: false });
  new ResizeObserver(resize).observe(canvas);
  const api = {
    renderer, scene, camera, world, ctl, resize,
    setCam(az, pol, R, ty){
      ctl.az = az; ctl.pol = pol; ctl.R = R;
      if (ty !== undefined) ctl.ty = ty;
      updCam();
    },
    clear(){
      while (world.children.length){
        const o = world.children.pop();
        o.traverse(n => { if (n.geometry) n.geometry.dispose(); });
      }
    },
    loop(tick){
      (function l(){
        requestAnimationFrame(l);
        if (ctl.auto && !ctl.on) ctl.az += .004;
        updCam();
        if (tick) tick();
        renderer.render(scene, camera);
      })();
    }
  };
  if (opts.cam) api.setCam(opts.cam[0], opts.cam[1], opts.cam[2], opts.cam[3]);
  resize();
  scenes.push(api);
  return api;
}
/* label teks melayang (sprite); font mengecil otomatis bila teks panjang */
function makeLabel(text, s){
  s = s || 1;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(30,42,90,0.92)';
  if (g.roundRect){ g.beginPath(); g.roundRect(6, 14, 500, 100, 42); g.fill(); }
  else g.fillRect(6, 14, 500, 100);
  let fs = 42;
  const setF = () => { g.font = 'bold ' + fs + 'px "Segoe UI", sans-serif'; };
  setF();
  while (g.measureText(text).width > 460 && fs > 20){ fs -= 2; setF(); }
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 66);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  sp.scale.set(7 * s, 1.75 * s, 1);
  return sp;
}
/* tekstur petak satuan nx × ny */
function gridTexture(nx, ny, base){
  base = base || '#e0f2fe';
  const u = 64, c = document.createElement('canvas');
  c.width = nx * u; c.height = ny * u;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#0284c7'; g.lineWidth = 3;
  for (let i = 0; i <= nx; i++){ g.beginPath(); g.moveTo(i*u, 0); g.lineTo(i*u, c.height); g.stroke(); }
  for (let j = 0; j <= ny; j++){ g.beginPath(); g.moveTo(0, j*u); g.lineTo(c.width, j*u); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

/* ---------------- jaring-jaring 3D (sistem engsel) ----------------
   kind: 'kubus' {s} | 'balok' {p,l,t} | 'prisma' {s,L} | 'limas' {s,h}
   opts: {color, grid:false}
   return {group, setFold(t)}  t: 0 = terbuka datar, 1 = terlipat penuh   */
function flatRect(w, h, mat){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.rotation.x = -Math.PI / 2;   // rebah ke bidang XZ
  return m;
}
function triXZ(ax, az, bx, bz, cx, cz, mat){
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([ax, 0, az, bx, 0, bz, cx, 0, cz]), 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}
function buildNet(kind, d, opts){
  opts = opts || {};
  const g = new THREE.Group();
  const folds = [];
  const mkMat = (nx, ny) => {
    if (opts.grid && nx && ny)
      return new THREE.MeshStandardMaterial({
        map: gridTexture(nx, ny), roughness: .6, side: THREE.DoubleSide });
    return std(opts.color || PALETTE.blue);
  };
  const hinge = (px, pz, parent) => {
    const h = new THREE.Group();
    h.position.set(px, 0, pz);
    (parent || g).add(h);
    return h;
  };
  const face = (parent, w, h, ox, oz, nx, ny) => {
    const f = flatRect(w, h, mkMat(nx, ny));
    f.position.set(ox, 0, oz);
    parent.add(f);
    return f;
  };
  const fold = (o, ax, to) => folds.push({ o, ax, to });

  if (kind === 'kubus' || kind === 'balok'){
    const p = kind === 'kubus' ? d.s : d.p;   // x
    const l = kind === 'kubus' ? d.s : d.l;   // z
    const t = kind === 'kubus' ? d.s : d.t;   // tinggi
    face(g, p, l, 0, 0, p, l);                       // alas (tengah)
    let hN = hinge(0, -l/2); face(hN, p, t, 0, -t/2, p, t); fold(hN, 'x',  Math.PI/2);
    let hS = hinge(0,  l/2); face(hS, p, t, 0,  t/2, p, t); fold(hS, 'x', -Math.PI/2);
    let hE = hinge( p/2, 0); face(hE, t, l,  t/2, 0, t, l); fold(hE, 'z',  Math.PI/2);
    let hW = hinge(-p/2, 0); face(hW, t, l, -t/2, 0, t, l); fold(hW, 'z', -Math.PI/2);
    let hC = hinge(0, -t, hN); face(hC, p, l, 0, -l/2, p, l); fold(hC, 'x', Math.PI/2);
  } else if (kind === 'prisma'){
    const s = d.s, L = d.L, th = s * Math.sqrt(3) / 2;
    face(g, s, L, 0, 0);                                  // persegi tengah
    let hR = hinge( s/2, 0); face(hR, s, L,  s/2, 0); fold(hR, 'z',  2*Math.PI/3);
    let hL = hinge(-s/2, 0); face(hL, s, L, -s/2, 0); fold(hL, 'z', -2*Math.PI/3);
    let hT1 = hinge(0,  L/2);
    hT1.add(triXZ(-s/2,0, s/2,0, 0,th, mkMat())); fold(hT1, 'x', -Math.PI/2);
    let hT2 = hinge(0, -L/2);
    hT2.add(triXZ(-s/2,0, s/2,0, 0,-th, mkMat())); fold(hT2, 'x', Math.PI/2);
  } else if (kind === 'limas'){
    const s = d.s, h = d.h, m = Math.sqrt(h*h + (s/2)*(s/2));
    const aN = Math.atan2(h, -s/2), aS = Math.atan2(-h, -s/2);
    face(g, s, s, 0, 0);                                  // alas
    let hN = hinge(0, -s/2);
    hN.add(triXZ(-s/2,0, s/2,0, 0,-m, mkMat())); fold(hN, 'x', aN);
    let hS = hinge(0,  s/2);
    hS.add(triXZ(-s/2,0, s/2,0, 0, m, mkMat())); fold(hS, 'x', aS);
    let hE = hinge( s/2, 0);
    hE.add(triXZ(0,-s/2, 0,s/2, m,0, mkMat())); fold(hE, 'z', aN);
    let hW = hinge(-s/2, 0);
    hW.add(triXZ(0,-s/2, 0,s/2, -m,0, mkMat())); fold(hW, 'z', aS);
  }
  return {
    group: g,
    setFold(t){ folds.forEach(f => { f.o.rotation[f.ax] = f.to * t; }); }
  };
}

/* ---------------- komponen refleksi standar ---------------- */
function vsRow(label, before, after, ok){
  return '<div class="kv"><span>' + label + ': <b>' + before + '</b></span><b>' +
    (ok ? '🎯 Tepat!' : '💡 Hasil: ' + after) + '</b></div>';
}

return {
  $, $$, ease, anim, wireOpts,
  initLab, PALETTE, std, createScene, makeLabel, gridTexture,
  flatRect, triXZ, buildNet, vsRow
};
})();
