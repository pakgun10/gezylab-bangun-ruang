/* Lab Volume BRSL — prototype
   Alur: Prediksi → Eksperimen → Simpulkan → Latihan → Refleksi
   Three.js r149 (bundel lokal, offline-ready) */
(function(){
"use strict";

/* ---------- helpers ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
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
function save(){ try{ localStorage.setItem('lab-brsl', JSON.stringify({
  pred1:S.pred1, pred2:S.pred2, refTeks:$('#refTeks')?$('#refTeks').value:'',
  stars:S.stars })); }catch(e){} }

/* ---------- state ---------- */
const S = { tahap:1, pred1:null, pred2:null, doneA:false, doneB:false, doneC:false,
            pours:0, score:0, correct:{}, stars:0 };
try{ Object.assign(S, JSON.parse(localStorage.getItem('lab-brsl')||'{}')); }catch(e){}

/* ---------- stepper ---------- */
const unlocked = {1:true};
function gotoTahap(n){
  S.tahap = n;
  $$('.tahap').forEach(el => el.classList.remove('active'));
  $('#tahap'+n).classList.add('active');
  $$('#stepper .step').forEach(b => {
    const t = +b.dataset.t;
    b.classList.toggle('active', t === n);
    b.classList.toggle('done', !!((t < n) || (t === 5 && S.finished)));
    b.disabled = !unlocked[t];
  });
  window.scrollTo({top:0, behavior:'smooth'});
  if (n === 2) setTimeout(resizeGL, 60);
  if (n === 3) renderVs($('#vsBox'));
  if (n === 5) renderVs($('#refleksiVs'));
}
function unlock(n){ unlocked[n] = true; const b = $('#stepper .step[data-t="'+n+'"]'); if(b) b.disabled = false; }
$$('#stepper .step').forEach(b => b.addEventListener('click', () => { if(!b.disabled) gotoTahap(+b.dataset.t); }));

/* restore prediksi terpilih */
function restoreRadio(name, val){
  if(!val) return;
  const r = document.querySelector('input[name="'+name+'"][value="'+val+'"]');
  if(r){ r.checked = true; r.closest('.opt').classList.add('sel'); }
}

/* ================================================================
   THREE.JS
================================================================ */
let renderer=null, scene=null, camera=null, world=null;
const drag = { on:false, x:0, y:0, az:0.7, pol:1.05, R:30 };
let autoRot = false, mode = 'a';
const exp = {};

const MAT = {
  orange: new THREE.MeshStandardMaterial({color:0xf5a623, roughness:.55, metalness:.05}),
  orangeGlass: new THREE.MeshStandardMaterial({color:0xf5a623, roughness:.35, transparent:true, opacity:.35, side:THREE.DoubleSide}),
  water: new THREE.MeshStandardMaterial({color:0x3b82f6, roughness:.2, metalness:.1, transparent:true, opacity:.88}),
  glass: new THREE.MeshStandardMaterial({color:0x93c5fd, roughness:.15, metalness:0, transparent:true, opacity:.22, side:THREE.DoubleSide}),
  glassBase: new THREE.MeshStandardMaterial({color:0xbfdbfe, roughness:.4, transparent:true, opacity:.55, side:THREE.DoubleSide}),
  gold: new THREE.MeshStandardMaterial({color:0xd4a017, roughness:.4}),
  grey: new THREE.MeshStandardMaterial({color:0x9ca3af, roughness:.5}),
  sky: new THREE.MeshStandardMaterial({color:0x38bdf8, roughness:.5}),
  rim: new THREE.MeshStandardMaterial({color:0xdc2626, roughness:.5}),
};

function makeLabel(text, s){
  s = s || 1;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(30,42,90,0.92)';
  if (g.roundRect){ g.beginPath(); g.roundRect(6, 14, 500, 100, 42); g.fill(); }
  else g.fillRect(6, 14, 500, 100);
  // kecilkan font otomatis sampai teks muat di dalam label
  let fs = 42;
  const setF = () => { g.font = 'bold ' + fs + 'px "Segoe UI", sans-serif'; };
  setF();
  while (g.measureText(text).width > 460 && fs > 20){ fs -= 2; setF(); }
  g.fillStyle = '#fff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 66);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true, depthTest:false}));
  sp.scale.set(7*s, 1.75*s, 1);
  return sp;
}

function initGL(){
  const cv = $('#c3d');
  renderer = new THREE.WebGLRenderer({canvas:cv, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd7e2f5, 0.95));
  const dl = new THREE.DirectionalLight(0xffffff, 0.6);
  dl.position.set(9, 15, 7); scene.add(dl);
  const grid = new THREE.GridHelper(44, 44, 0xc3cfe8, 0xdbe4f5);
  grid.position.y = -0.02; scene.add(grid);
  world = new THREE.Group(); scene.add(world);

  cv.addEventListener('pointerdown', e => {
    drag.on = true; drag.x = e.clientX; drag.y = e.clientY;
    autoRot = false; cv.setPointerCapture(e.pointerId); cv.style.cursor='grabbing';
  });
  cv.addEventListener('pointermove', e => {
    if(!drag.on) return;
    drag.az -= (e.clientX - drag.x) * 0.008;
    drag.pol = Math.min(1.45, Math.max(0.3, drag.pol - (e.clientY - drag.y) * 0.006));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const up = () => { drag.on = false; cv.style.cursor='grab'; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    drag.R = Math.min(60, Math.max(15, drag.R + e.deltaY * 0.03));
  }, {passive:false});

  new ResizeObserver(resizeGL).observe(cv);
  resizeGL();
  (function loop(){
    requestAnimationFrame(loop);
    if (autoRot && !drag.on) drag.az += 0.004;
    updCam();
    renderer.render(scene, camera);
  })();
}
function updCam(){
  const tY = 4;
  camera.position.set(
    drag.R * Math.sin(drag.pol) * Math.sin(drag.az),
    tY + drag.R * Math.cos(drag.pol),
    drag.R * Math.sin(drag.pol) * Math.cos(drag.az));
  camera.lookAt(0, tY, 0);
}
function resizeGL(){
  if(!renderer) return;
  const cv = $('#c3d');
  const w = cv.clientWidth, h = cv.clientHeight;
  if(!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w/h; camera.updateProjectionMatrix();
}
function clearWorld(){
  while(world.children.length){
    const o = world.children.pop();
    o.traverse(n => { if(n.geometry) n.geometry.dispose(); });
  }
  for(const k in exp) delete exp[k];
}

/* ---------- tabung kaca (dipakai B & C) ---------- */
function buildGlassCyl(R, H, x){
  const g = new THREE.Group(); g.position.set(x, 0, 0);
  const side = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 48, 1, true), MAT.glass);
  side.position.y = 0.4 + H/2; g.add(side);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.1, 12, 48), MAT.gold);
  rim.rotation.x = Math.PI/2; rim.position.y = 0.4 + H; g.add(rim);
  const bot = new THREE.Mesh(new THREE.CircleGeometry(R, 48), MAT.glassBase);
  bot.rotation.x = -Math.PI/2; bot.position.y = 0.42; g.add(bot);
  const wg = new THREE.CylinderGeometry(R*0.88, R*0.88, 1, 48); wg.translate(0, 0.5, 0);
  const water = new THREE.Mesh(wg, MAT.water);
  water.position.y = 0.45; water.scale.y = 0.001; water.visible = false; g.add(water);
  world.add(g);
  return {grp:g, water, maxH:H - 0.15};
}

/* ---------- Eksperimen A : tumpukan keping ---------- */
function buildA(){
  clearWorld(); autoRot = false;
  const R = 2.4, th = 0.55, MAX = 12;
  const discs = [];
  for(let i=0;i<MAX;i++){
    const d = new THREE.Mesh(new THREE.CylinderGeometry(R, R, th, 48), MAT.sky.clone());
    d.material.transparent = true; d.material.opacity = 0.92;
    d.position.y = th/2 + i*th;
    d.visible = i < 4;
    world.add(d); discs.push(d);
  }
  const lbl = makeLabel('tumpukan keping lingkaran'); lbl.position.set(0, th*MAX + 2.2, 0); world.add(lbl);
  exp.discs = discs; exp.th = th;
  drag.az = 0.7; drag.pol = 1.02; drag.R = 26;
  setCoins(+$('#coinRange').value);
}
function setCoins(n){
  if(!exp.discs) return;
  exp.discs.forEach((d,i) => d.visible = i < n);
  $('#coinN').textContent = n;
  $('#coinH').textContent = n + ' satuan';
}

/* ---------- Eksperimen B : kerucut → tabung ---------- */
function buildB(){
  clearWorld(); autoRot = false;
  const R = 2.6, H = 6.2;
  // kerucut (wadah) + air di dalamnya
  const coneG = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(R, H, 48, 1, true), MAT.orange);
  cone.rotation.x = Math.PI; coneG.add(cone);              // ujung di bawah
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 12, 48), MAT.rim);
  rim.rotation.x = Math.PI/2; rim.position.y = H/2; coneG.add(rim);
  const water = new THREE.Mesh(new THREE.ConeGeometry(R*0.9, H*0.9, 48), MAT.water);
  water.rotation.x = Math.PI; coneG.add(water);
  const home = new THREE.Vector3(-5.5, H/2 + 0.6, 0);
  const above = new THREE.Vector3(6.3, 10.2, 0);
  coneG.position.copy(home); world.add(coneG);
  const l1 = makeLabel('kerucut · r=5, t=12'); l1.position.set(-5.5, H + 2.6, 0); world.add(l1);
  // tabung kaca
  const cyl = buildGlassCyl(R, H, 5.5);
  const l2 = makeLabel('tabung · r=5, t=12'); l2.position.set(5.5, H + 2.6, 0); world.add(l2);
  // aliran air
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.0, 16), MAT.water);
  stream.position.set(5.5, 0.4 + H + 0.35, 0); stream.visible = false; world.add(stream);
  Object.assign(exp, {coneG, water, stream, cylWater:cyl.water, maxH:cyl.maxH, home, above, tilt:Math.PI*0.917, pouring:false});
  drag.az = 0.55; drag.pol = 1.08; drag.R = 30;
  S.pours = 0; updatePourUI();
}
let pouringB = false;
async function pourB(){
  if (pouringB || S.pours >= 3) return;
  pouringB = true; $('#btnPour').disabled = true;
  const {coneG, water, stream, cylWater, maxH, home, above, tilt} = exp;
  await anim(650, k => coneG.position.lerpVectors(home, above, k));
  await anim(550, k => { coneG.rotation.z = tilt * k; });
  stream.visible = true; cylWater.visible = true;
  const h0 = cylWater.scale.y, h1 = maxH/3 * (S.pours + 1);
  await anim(1500, k => {
    const s = Math.max(0.03, 1 - k); water.scale.set(s, s, s);
    cylWater.scale.y = h0 + (h1 - h0) * k;
  });
  stream.visible = false;
  await anim(550, k => { coneG.rotation.z = tilt * (1 - k); });
  await anim(650, k => coneG.position.lerpVectors(above, home, k));
  await anim(350, k => { const s = 0.03 + 0.97*k; water.scale.set(s, s, s); });
  S.pours++;
  updatePourUI();
  pouringB = false;
  $('#btnPour').disabled = S.pours >= 3;
  if (S.pours >= 3){ S.doneB = true; checkExpDone(); }
}
function updatePourUI(){
  $('#pourCount').textContent = S.pours;
  const box = $('#evalB'), txt = $('#evalBText');
  box.classList.remove('ok');
  if (S.pours === 0){
    txt.textContent = 'Tekan “Tuang” untuk menuang isi kerucut yang pertama.';
  } else if (S.pours < 3){
    txt.innerHTML = 'Kamu menduga <b>' + (S.pred1 || '?') + ' kerucut</b> cukup untuk memenuhi tabung. ' +
      'Namun perhatikan: tabung baru terisi <b>' + S.pours + '/3 (belum penuh!)</b> Mari tuangkan lagi.';
  } else {
    box.classList.add('ok');
    txt.innerHTML = '<b>Tabung penuh setelah 3 tuangan!</b> Jadi volume 1 kerucut = <b>⅓ volume tabung</b>.';
    $('#btnPour').classList.remove('pulse');
  }
}
function resetB(){
  if (pouringB || mode !== 'b') return;
  S.pours = 0; S.doneB = false;
  exp.cylWater.scale.y = 0.001; exp.cylWater.visible = false; exp.water.scale.set(1,1,1);
  $('#btnPour').disabled = false; $('#btnPour').classList.add('pulse');
  updatePourUI(); checkExpDone();
}

/* ---------- Eksperimen C : bola → tabung ---------- */
function buildC(){
  clearWorld(); autoRot = false;
  const R = 2.6, H = 5.2;   // t tabung = 2r
  const sphG = new THREE.Group(); sphG.position.set(-5.5, R + 0.7, 0);
  sphG.add(new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), MAT.orangeGlass));
  const ballWater = new THREE.Mesh(new THREE.SphereGeometry(R*0.94, 48, 32), MAT.water);
  sphG.add(ballWater); world.add(sphG);
  const stand = new THREE.Mesh(new THREE.TorusGeometry(R*0.55, 0.12, 12, 32), MAT.grey);
  stand.rotation.x = Math.PI/2; stand.position.set(-5.5, 0.15, 0); world.add(stand);
  const l1 = makeLabel('bola · r=5'); l1.position.set(-5.5, R*2 + 2.4, 0); world.add(l1);
  const cyl = buildGlassCyl(R, H, 5.5);
  // garis ukur ½ (abu) dan ⅔ (emas)
  [[0.5, MAT.grey],[2/3, MAT.gold]].forEach(([f, m]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.06, 0.07, 10, 48), m);
    ring.rotation.x = Math.PI/2; ring.position.set(5.5, 0.45 + cyl.maxH * f, 0);
    world.add(ring);
  });
  const l2 = makeLabel('tabung · r=5, t=10'); l2.position.set(5.5, H + 2.6, 0); world.add(l2);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.4, 16), MAT.water);
  stream.position.set(5.5, 0.4 + H + 0.75, 0); stream.visible = false; world.add(stream);
  Object.assign(exp, {sphG, ballWater, stream, cylWater:cyl.water, maxH:cyl.maxH,
    home:new THREE.Vector3(-5.5, R + 0.7, 0), above:new THREE.Vector3(5.5, 8.8, 0)});
  drag.az = 0.55; drag.pol = 1.08; drag.R = 30;
  updatePourCUI(false);
}
let pouringC = false, doneCPour = false;
async function pourC(){
  if (pouringC || doneCPour) return;
  pouringC = true; $('#btnPourC').disabled = true;
  const {sphG, ballWater, stream, cylWater, maxH, home, above} = exp;
  await anim(650, k => sphG.position.lerpVectors(home, above, k));
  stream.visible = true; cylWater.visible = true;
  const h1 = maxH * (2/3);
  await anim(1600, k => {
    const s = Math.max(0.03, 1 - k); ballWater.scale.set(s, s, s);
    cylWater.scale.y = Math.max(0.001, h1 * k);
  });
  stream.visible = false;
  await anim(650, k => sphG.position.lerpVectors(above, home, k));
  await anim(350, k => { const s = 0.03 + 0.97*k; ballWater.scale.set(s, s, s); });
  doneCPour = true; S.doneC = true;
  updatePourCUI(true); checkExpDone();
  pouringC = false;
  $('#btnPourC').classList.remove('pulse');
}
function updatePourCUI(done){
  const box = $('#evalC'), txt = $('#evalCText');
  box.classList.toggle('ok', !!done);
  txt.innerHTML = done
    ? 'Air dari <b>1 bola</b> hanya mengisi <b>⅔ tabung</b> (tepat di garis emas)! Jadi volume bola = <b>⅔ × volume tabung</b> ber-tinggi 2r.'
    : 'Tekan “Tuang” untuk menuang isi bola.';
}
function resetC(){
  if (pouringC || mode !== 'c') return;
  doneCPour = false; S.doneC = false;
  exp.cylWater.scale.y = 0.001; exp.cylWater.visible = false; exp.ballWater.scale.set(1,1,1);
  $('#btnPourC').disabled = false; $('#btnPourC').classList.add('pulse');
  updatePourCUI(false); checkExpDone();
}

/* ---------- ganti mode eksperimen ---------- */
const EXP_NAMES = {a:'Eksperimen A', b:'Eksperimen B', c:'Eksperimen C'};
function setMode(m){
  mode = m;
  if (m === 'a') buildA();
  else if (m === 'b') buildB();
  else buildC();
  $$('#expPills .pill').forEach(p => p.classList.toggle('active', p.dataset.e === m));
  $('#panelA').style.display = m === 'a' ? '' : 'none';
  $('#panelB').style.display = m === 'b' ? '' : 'none';
  $('#panelC').style.display = m === 'c' ? '' : 'none';
  $('#canvasTag').textContent = EXP_NAMES[m];
  setTimeout(resizeGL, 30);
}

/* ---------- kelengkapan eksperimen ---------- */
function checkExpDone(){
  const ok = S.doneA && S.doneB && S.doneC;
  $('#btnExpDone').disabled = !ok;
  $('#expHint').textContent = ok
    ? 'Semua eksperimen selesai. Lanjut!'
    : 'Selesaikan ketiga eksperimen (A: tekan “Saya paham”, B: 3 tuangan sampai penuh, C: 1 tuangan) untuk membuka Tahap 3.';
}

/* ================================================================
   UI WIRING
================================================================ */
$$('.opt input[type=radio]').forEach(r => r.addEventListener('change', () => {
  r.closest('.opts').querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
  r.closest('.opt').classList.add('sel');
}));

$('#btnPrediksi').addEventListener('click', () => {
  const p1 = document.querySelector('input[name=p1]:checked');
  const p2 = document.querySelector('input[name=p2]:checked');
  if(!p1 || !p2){ alert('Isi kedua dugaan dulu ya — tidak ada jawaban yang salah.'); return; }
  S.pred1 = p1.value; S.pred2 = p2.value; save();
  unlock(2); unlock(3); gotoTahap(2);
});

$$('#expPills .pill').forEach(p => p.addEventListener('click', () => setMode(p.dataset.e)));
$('#coinRange').addEventListener('input', e => setCoins(+e.target.value));
$('#btnADone').addEventListener('click', () => {
  S.doneA = true; checkExpDone(); setMode('b');
  $('#btnADone').textContent = '✓ Paham! Lanjut ke eksperimen B →';
});
$('#btnPour').addEventListener('click', pourB);
$('#btnResetB').addEventListener('click', resetB);
$('#btnPourC').addEventListener('click', pourC);
$('#btnResetC').addEventListener('click', resetC);
$('#btnExpDone').addEventListener('click', () => { unlock(4); gotoTahap(3); });

/* ---------- Tahap 3 : dugaan vs kenyataan ---------- */
const P2TXT = {setengah:'½ tabung', sepertiga:'⅔ tabung', penuh:'penuh (1×)', lebih:'meluap (>1×)'};
function renderVs(el){
  if(!el) return;
  const ok1 = S.pred1 === '3', ok2 = S.pred2 === 'sepertiga';
  el.innerHTML =
    '<div class="kv"><span>Dugaan 1 — tuangan kerucut: <b>' + (S.pred1||'?') + '×</b></span><b>' + (ok1?'🎯 Tepat!':'💡 Hasil: 3×') + '</b></div>' +
    '<div class="kv"><span>Dugaan 2 — isi bola: <b>' + (P2TXT[S.pred2]||'?') + '</b></span><b>' + (ok2?'🎯 Tepat!':'💡 Hasil: ⅔ tabung') + '</b></div>' +
    '<div class="hint">Yang penting bukan benar tidaknya dugaan, melainkan <b>berani menduga lalu menguji</b> — itulah cara ilmuwan berpikir.</div>';
}
function wireCek(name, kunci, fbId, pesan){
  document.querySelectorAll('input[name="'+name+'"]').forEach(r => r.addEventListener('change', () => {
    const ok = r.value === kunci;
    const fb = $('#'+fbId);
    fb.className = 'fb show ' + (ok?'ok':'no');
    fb.textContent = ok ? '✓ ' + pesan : '✗ Coba ingat lagi hasil eksperimenmu.';
    fb.dataset.ok = ok ? '1' : '';
  }));
}
$('#btnCek').addEventListener('click', () => {
  const a = $('#fb-cek1').dataset.ok === '1', b = $('#fb-cek2').dataset.ok === '1';
  if(a && b){ unlock(4); gotoTahap(4); }
  else alert('Jawab kedua cek pemahaman dengan benar dulu ya.');
});

/* ---------- Tahap 4 : latihan ---------- */
const KUNCI = {1:{v:1540,t:0.5}, 2:{v:616,t:0.5}, 3:{v:904.32,t:0.6}};
$$('[data-check]').forEach(btn => btn.addEventListener('click', () => {
  const n = btn.dataset.check, val = parseFloat(($('#q'+n).value||'').replace(',','.'));
  const k = KUNCI[n], fb = $('#fb-q'+n);
  const ok = !isNaN(val) && Math.abs(val - k.v) <= k.t;
  fb.className = 'fb show ' + (ok?'ok':'no');
  fb.textContent = ok ? '✓ Benar! Hebat.' : '✗ Belum tepat. Cek lagi rumusnya: ' +
    (n==='1' ? 'V = πr²t' : n==='2' ? 'V = ⅓πr²t' : 'V = ⁴⁄₃πr³');
  S.correct[n] = ok;
  S.score = Object.values(S.correct).filter(Boolean).length;
  $('#scoreChip').textContent = S.score + ' / 3';
  $('#btnLatDone').disabled = S.score < 2;
}));

/* ---------- Tahap 5 : refleksi ---------- */
$('#stars').addEventListener('click', e => {
  const sp = e.target.closest('span'); if(!sp) return;
  S.stars = +sp.dataset.s; save();
  $$('#stars span').forEach(x => x.classList.toggle('on', +x.dataset.s <= S.stars));
});
$('#refTeks').addEventListener('input', save);
$('#btnFinish').addEventListener('click', () => {
  const t = $('#refTeks').value.trim();
  if(t.length < 20){ alert('Tulis simpulanmu dulu ya, minimal satu-dua kalimat dengan bahasamu sendiri.'); return; }
  S.finished = true; save();
  $('#finishSum').innerHTML =
    '<div class="kv"><span>Dugaan kerucut → hasil</span><b>' + (S.pred1||'?') + '× → 3×</b></div>' +
    '<div class="kv"><span>Dugaan bola → hasil</span><b>' + (P2TXT[S.pred2]||'?') + ' → ⅔ tabung</b></div>' +
    '<div class="kv"><span>Skor latihan</span><b>' + S.score + ' / 3</b></div>' +
    '<div class="kv"><span>Penemu hari ini</span><b>kamu! 🎓</b></div>';
  $('#finishCard').style.display = '';
  gotoTahap(5);
  $('#finishCard').scrollIntoView({behavior:'smooth'});
  $$('#stepper .step').forEach(b => b.classList.toggle('done', +b.dataset.t <= 5));
});

/* ---------- init ---------- */
function init(){
  restoreRadio('p1', S.pred1); restoreRadio('p2', S.pred2);
  if(S.stars) $$('#stars span').forEach(x => x.classList.toggle('on', +x.dataset.s <= S.stars));
  try{ const sv = JSON.parse(localStorage.getItem('lab-brsl')||'{}'); if(sv.refTeks) $('#refTeks').value = sv.refTeks; }catch(e){}
  wireCek('cek1','4','fb-cek1','Tepat! r dikuadratkan, jadi 2² = 4 kali lipat.');
  wireCek('cek2','1/3','fb-cek2','Tepat! Sudah dibuktikan lewat 3 tuangan.');
  try{ initGL(); setMode('a'); }
  catch(err){
    $('#c3d').parentElement.innerHTML = '<div class="card" style="margin:20px">⚠️ Peramban ini tidak mendukung WebGL, sehingga simulasi 3D tidak dapat tampil.</div>';
  }
  if(S.pred1 && S.pred2){ unlock(2); unlock(3); }
  // deep-link: #tahap=2&exp=b (berguna untuk demo guru & pengujian)
  const mh = /tahap=([1-5])/.exec(location.hash || '');
  const me2 = /exp=([abc])/.exec(location.hash || '');
  gotoTahap(1);
  if(mh){ const n = +mh[1]; for(let i=2;i<=n;i++) unlock(i); gotoTahap(n); }
  if(me2 && S.tahap === 2) setMode(me2[1]);
}
document.addEventListener('DOMContentLoaded', init);
})();
