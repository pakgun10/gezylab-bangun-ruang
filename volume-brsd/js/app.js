/* Lab Volume BRSD — balok, prisma, limas
   Alur: Prediksi → Eksperimen → Simpulkan → Latihan → Refleksi
   Memakai Lab.initLab + Lab.createScene dari ../assets/core.js */
(function(){
"use strict";
const { $, $$, anim, initLab, vsRow, std, makeLabel, PALETTE } = Lab;

/* dipanggil setiap ganti tahap (via opts initLab) */
let _ready = false;   // jadi true setelah S terisi (hindari TDZ saat deep-link #tahap=N)
function _onTahap(n){
  if(!_ready) return;
  if(n===3){ const el=$('#vsBox'); if(el) renderVs(el); }
  if(n===5){
    const el=$('#refleksiVs'); if(el) renderVs(el);
    if(S.stars) $$('#stars span').forEach(x=>x.classList.toggle('on', +x.dataset.s<=S.stars));
    if(S.refTeks) $('#refTeks').value = S.refTeks;
  }
}
const lab = initLab('volume-brsd', { onTahap:_onTahap });
const S = lab.S;

const MAT = {
  orange: std(PALETTE.orange),
  teal:   std(PALETTE.teal),
  sky:    std(PALETTE.blue),
  skyLt:  std(0xbae6fd),
  water:  std(PALETTE.water, { transparent:true, opacity:.88, roughness:.2 }),
  glass:  std(0x93c5fd, { transparent:true, opacity:.16, roughness:.15, depthWrite:false }),
  gold:   std(PALETTE.gold),
  navyLine: new THREE.LineBasicMaterial({ color: PALETTE.navy }),
  edgeOrange: new THREE.LineBasicMaterial({ color: 0xb45309 }),
  edgeTeal: new THREE.LineBasicMaterial({ color: 0x0f766e })
};

/* ================= TAHAP 1 : prediksi ================= */
$('#btnPrediksi').addEventListener('click', ()=>{
  const p1 = document.querySelector('input[name=p1]:checked');
  const p2 = document.querySelector('input[name=p2]:checked');
  if(!p1 || !p2){ alert('Isi kedua dugaan dulu ya — tidak ada jawaban salah.'); return; }
  S.pred1 = p1.value; S.pred2 = p2.value; lab.save();
  lab.unlock(2); lab.unlock(3); lab.gotoTahap(2);
});

/* ================= TAHAP 2 : eksperimen ================= */
let mode = 'a', sc = null;
const expC = {};   // state tuang eksperimen C

/* ---------- A : kubus satuan ---------- */
let cubeG=null, boxMesh=null, boxEdges=null, lblA=null;
const cubeGeo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
function buildA(){
  cubeG = new THREE.Group(); sc.world.add(cubeG);
  for(let i=0;i<5;i++) for(let j=0;j<4;j++) for(let k=0;k<4;k++){
    const m = new THREE.Mesh(cubeGeo, (i+j+k)%2 ? MAT.sky : MAT.skyLt);
    m.userData = {i,j,k};
    cubeG.add(m);
  }
  boxMesh = new THREE.Mesh(unitBoxGeo, MAT.glass);
  sc.world.add(boxMesh);
  boxEdges = new THREE.LineSegments(new THREE.EdgesGeometry(unitBoxGeo), MAT.navyLine);
  sc.world.add(boxEdges);
  lblA = makeLabel('balok p × l × t'); sc.world.add(lblA);
  sc.setCam(0.7, 1.02, 24, 2);
  updateA();
}
function updateA(){
  const p = +$('#rngP').value, l = +$('#rngL').value, t = +$('#rngT').value;
  $('#pVal').textContent = p; $('#lVal').textContent = l; $('#tVal').textContent = t;
  boxMesh.scale.set(p, t, l); boxMesh.position.y = t/2;
  boxEdges.scale.set(p, t, l); boxEdges.position.y = t/2;
  cubeG.children.forEach(m=>{
    const {i,j,k} = m.userData;
    const vis = i<p && j<t && k<l;
    m.visible = vis;
    if(vis) m.position.set(i-(p-1)/2, j+0.5, k-(l-1)/2);
  });
  const V = p*l*t;
  $('#cubeCount').textContent = V;
  $('#formulaV').textContent = p+' × '+l+' × '+t+' = '+V;
  lblA.position.set(0, t+2.2, 0);
  S.pA=p; S.pL=l; S.pT=t; lab.save();
}
['rngP','rngL','rngT'].forEach(id=>$('#'+id).addEventListener('input', updateA));
$('#btnADone').addEventListener('click', ()=>{
  S.doneA = true; lab.save(); checkExpDone(); setMode('b');
  $('#btnADone').textContent = '✓ Paham! Lanjut ke eksperimen B →';
});

/* ---------- B : prisma = ½ balok ---------- */
/* prisma segitiga siku-siku: segitiga (w×h) diekstrusi sepanjang len */
function rightPrism(w, h, len, mat, flip){
  const T = flip ? [[w,0],[w,h],[0,h]] : [[0,0],[w,0],[0,h]];
  const v = [];
  const tri = (a,b,c,z)=>{ v.push(a[0],a[1],z, b[0],b[1],z, c[0],c[1],z); };
  tri(T[0],T[1],T[2],0); tri(T[2],T[1],T[0],len);
  [[T[0],T[1]],[T[1],T[2]],[T[2],T[0]]].forEach(([a,b])=>{
    v.push(a[0],a[1],0, b[0],b[1],0, b[0],b[1],len,
           a[0],a[1],0, b[0],b[1],len, a[0],a[1],len);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}
let prism1=null, prism2=null, lblB=null;
function buildB(){
  const w=4, h=3, len=4;
  const g = new THREE.Group();
  g.position.set(-w/2, 0, -len/2);
  sc.world.add(g);
  // bayangan balok utuh (tetap di tempat)
  const ghost = new THREE.Mesh(unitBoxGeo, MAT.glass);
  ghost.scale.set(w, h, len); ghost.position.set(w/2, h/2, len/2); g.add(ghost);
  const gedges = new THREE.LineSegments(new THREE.EdgesGeometry(unitBoxGeo), MAT.navyLine);
  gedges.scale.set(w, h, len); gedges.position.set(w/2, h/2, len/2); g.add(gedges);
  // dua prisma kongruen
  prism1 = rightPrism(w, h, len, MAT.orange, false);
  prism1.add(new THREE.LineSegments(new THREE.EdgesGeometry(prism1.geometry), MAT.edgeOrange));
  prism2 = rightPrism(w, h, len, MAT.teal, true);
  prism2.add(new THREE.LineSegments(new THREE.EdgesGeometry(prism2.geometry), MAT.edgeTeal));
  g.add(prism1); g.add(prism2);
  lblB = makeLabel('2 prisma kongruen = 1 balok'); lblB.position.set(0, h+2.4, 0); sc.world.add(lblB);
  const l2 = makeLabel('balok 4 × 3 × 4'); l2.position.set(0, -1.4, 0); sc.world.add(l2);
  sc.setCam(0.7, 1.0, 24, 2);
  setBelah(+$('#rngBelah').value);
}
function setBelah(v){
  $('#belahPct').textContent = v + '%';
  const sh = v/100 * 3.2;              // jarak geser maksimum
  const nx = 0.6, ny = 0.8;            // normal bidang diagonal (h,w) ternormalisasi
  if(prism1){ prism1.position.set(-nx*sh, -ny*sh, 0); prism2.position.set(nx*sh, ny*sh, 0); }
  S.belah = v;
  if(v >= 80) S.doneB = true;
  $('#belahNote').innerHTML = S.doneB
    ? '✓ <b>Terbelah penuh!</b> Dua prisma itu kongruen dan pas menjadi satu balok.'
    : 'Geser sampai ≥ 80% untuk menuntaskan eksperimen ini.';
  lab.save(); checkExpDone();
}
$('#rngBelah').addEventListener('input', e=>setBelah(+e.target.value));

/* ---------- C : tuang limas → prisma (pola pourB volume-brsl) ---------- */
function buildC(){
  const s=4, H=6, r = s/Math.SQRT2;
  // limas segiempat sebagai wadah (puncak di bawah, mulut persegi di atas)
  const limasG = new THREE.Group();
  const spin = new THREE.Group(); spin.rotation.y = Math.PI/4; limasG.add(spin);
  const coneGeo = new THREE.ConeGeometry(r, H, 4, 1, true);
  const limas = new THREE.Mesh(coneGeo, MAT.orange);
  limas.rotation.x = Math.PI; spin.add(limas);
  const limasEdges = new THREE.LineSegments(new THREE.EdgesGeometry(coneGeo), MAT.edgeOrange);
  limasEdges.rotation.x = Math.PI; spin.add(limasEdges);
  const wgeo = new THREE.ConeGeometry(r*0.88, H*0.88, 4);
  const water = new THREE.Mesh(wgeo, MAT.water);
  water.rotation.x = Math.PI; water.position.y = H*0.05; spin.add(water);
  const home = new THREE.Vector3(-5.5, H/2 + 0.8, 0);
  const above = new THREE.Vector3(6.28, 10.4, 0);
  limasG.position.copy(home); sc.world.add(limasG);
  const l1 = makeLabel('limas · alas 4×4, t=6'); l1.position.set(-5.5, H+2.8, 0); sc.world.add(l1);
  // prisma segiempat kaca (alas & tinggi sama)
  const pg = new THREE.Group(); pg.position.set(5.5, 0, 0); sc.world.add(pg);
  const side = new THREE.Mesh(new THREE.BoxGeometry(s, H, s), MAT.glass);
  side.position.y = 0.4 + H/2; pg.add(side);
  const pedges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s, H, s)), MAT.navyLine);
  pedges.position.y = 0.4 + H/2; pg.add(pedges);
  const bot = new THREE.Mesh(new THREE.PlaneGeometry(s, s), std(0xbfdbfe, {transparent:true, opacity:.5}));
  bot.rotation.x = -Math.PI/2; bot.position.y = 0.42; pg.add(bot);
  const pwg = new THREE.BoxGeometry(1, 1, 1); pwg.translate(0, 0.5, 0);
  const prismWater = new THREE.Mesh(pwg, MAT.water);
  prismWater.scale.set(s*0.9, 0.001, s*0.9); prismWater.position.y = 0.45;
  prismWater.visible = false; pg.add(prismWater);
  const rimG = new THREE.Group();
  const rs = s + 0.18, rt = 0.14;
  [[0, rs/2, rs+rt, rt],[0, -rs/2, rs+rt, rt],[rs/2, 0, rt, rs],[-rs/2, 0, rt, rs]].forEach(a=>{
    const bar = new THREE.Mesh(new THREE.BoxGeometry(a[2], 0.12, a[3]), MAT.gold);
    bar.position.set(a[0], 0, a[1]); rimG.add(bar);
  });
  rimG.position.y = 0.4 + H; pg.add(rimG);
  const l2 = makeLabel('prisma · alas 4×4, t=6'); l2.position.set(5.5, H+2.8, 0); sc.world.add(l2);
  // aliran air
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.4, 16), MAT.water);
  stream.position.set(5.5, 0.4 + H + 0.55, 0); stream.visible = false; sc.world.add(stream);
  Object.assign(expC, { limasG, water, stream, prismWater, maxH: H-0.15,
    home, above, tilt: Math.PI*0.917 });
  sc.setCam(0.55, 1.08, 30, 4);
  S.pours = 0; lab.save(); updatePourUI();
}
let pouringC = false;
async function pourC(){
  if(pouringC || S.pours >= 3) return;
  pouringC = true; $('#btnPourC').disabled = true;
  const { limasG, water, stream, prismWater, maxH, home, above, tilt } = expC;
  await anim(650, k => limasG.position.lerpVectors(home, above, k));
  await anim(550, k => { limasG.rotation.z = tilt * k; });
  stream.visible = true; prismWater.visible = true;
  const h0 = prismWater.scale.y, h1 = maxH/3 * (S.pours + 1);
  await anim(1500, k => {
    const sc2 = Math.max(0.03, 1 - k); water.scale.set(sc2, sc2, sc2);
    prismWater.scale.y = h0 + (h1 - h0) * k;
  });
  stream.visible = false;
  await anim(550, k => { limasG.rotation.z = tilt * (1 - k); });
  await anim(650, k => limasG.position.lerpVectors(above, home, k));
  await anim(350, k => { const sc2 = 0.03 + 0.97*k; water.scale.set(sc2, sc2, sc2); });
  S.pours++;
  updatePourUI(); lab.save();
  pouringC = false;
  $('#btnPourC').disabled = S.pours >= 3;
  if(S.pours >= 3){ S.doneC = true; lab.save(); checkExpDone(); }
}
function updatePourUI(){
  $('#pourCount').textContent = S.pours || 0;
  const box = $('#evalC'), txt = $('#evalCText');
  box.classList.remove('ok');
  if(!S.pours){
    txt.textContent = 'Tekan “Tuang” untuk menuang isi limas yang pertama.';
  } else if(S.pours < 3){
    txt.innerHTML = 'Prisma baru terisi <b>' + S.pours + '/3 (belum penuh!)</b> Mari tuangkan lagi.';
  } else {
    box.classList.add('ok');
    txt.innerHTML = '<b>Prisma penuh setelah 3 tuangan!</b> Jadi volume 1 limas = <b>⅓ volume prisma</b>.';
    $('#btnPourC').classList.remove('pulse');
  }
}
function resetC(){
  if(pouringC || mode !== 'c') return;
  S.pours = 0; S.doneC = false; lab.save();
  expC.prismWater.scale.y = 0.001; expC.prismWater.visible = false;
  expC.water.scale.set(1, 1, 1);
  $('#btnPourC').disabled = false; $('#btnPourC').classList.add('pulse');
  updatePourUI(); checkExpDone();
}
$('#btnPourC').addEventListener('click', pourC);
$('#btnResetC').addEventListener('click', resetC);

/* ---------- ganti mode ---------- */
const EXP_NAMES = { a:'Eksperimen A', b:'Eksperimen B', c:'Eksperimen C' };
function setMode(m){
  mode = m;
  if(!sc){ sc = Lab.createScene($('#c3d')); sc.loop(); }
  sc.clear();
  for(const k in expC) delete expC[k];
  pouringC = false;
  if(m==='a') buildA(); else if(m==='b') buildB(); else buildC();
  $$('#expPills .pill').forEach(p=>p.classList.toggle('active', p.dataset.e===m));
  $('#panelA').style.display = m==='a' ? '' : 'none';
  $('#panelB').style.display = m==='b' ? '' : 'none';
  $('#panelC').style.display = m==='c' ? '' : 'none';
  $('#canvasTag').textContent = EXP_NAMES[m];
  setTimeout(()=>sc.resize(), 60);
}
$$('#expPills .pill').forEach(p=>p.addEventListener('click', ()=>setMode(p.dataset.e)));
function checkExpDone(){
  const ok = S.doneA && S.doneB && S.doneC;
  $('#btnExpDone').disabled = !ok;
  $('#expHint').textContent = ok ? 'Semua eksperimen selesai. Lanjut!'
    : 'Selesaikan ketiga eksperimen (A: tekan “Saya paham”, B: geser ≥ 80%, C: 3 tuangan sampai penuh) untuk membuka Tahap 3.';
}
checkExpDone();
$('#btnExpDone').addEventListener('click', ()=>{ lab.unlock(4); lab.gotoTahap(3); });

/* ================= TAHAP 3 : simpulkan ================= */
const P2TXT = { setengah:'setengah (½)', sepertiga:'sepertiga (⅓)', sama:'sama (=)' };
function renderVs(el){
  if(!el) return;
  el.innerHTML =
    vsRow('Dugaan 1 — kubus dalam balok', S.pred1||'?', '24', S.pred1==='24') +
    vsRow('Dugaan 2 — prisma vs balok', P2TXT[S.pred2]||'?', 'setengah (½)', S.pred2==='setengah') +
    '<div class="hint">Yang penting bukan benar tidaknya dugaan, melainkan <b>berani menduga lalu menguji</b> — itulah cara ilmuwan berpikir.</div>';
}
function wireCek(name, kunci, fbId, pesan){
  document.querySelectorAll('input[name="'+name+'"]').forEach(r=>r.addEventListener('change', ()=>{
    const ok = r.value===kunci, fb = $('#'+fbId);
    fb.className = 'fb show '+(ok?'ok':'no');
    fb.textContent = ok ? '✓ '+pesan : '✗ Coba ingat lagi hasil eksperimenmu.';
    fb.dataset.ok = ok ? '1' : '';
  }));
}
wireCek('cek1','benar','fb-cek1','Tepat! V = p×l×t, jadi menggandakan p menggandakan V.');
wireCek('cek2','benar','fb-cek2','Tepat! Sudah dibuktikan lewat 3 tuangan.');
$('#btnCek').addEventListener('click', ()=>{
  const a = $('#fb-cek1').dataset.ok==='1', b = $('#fb-cek2').dataset.ok==='1';
  if(a&&b){ lab.unlock(4); lab.gotoTahap(4); }
  else alert('Jawab kedua cek pemahaman dengan benar dulu ya.');
});

/* ================= TAHAP 4 : latihan ================= */
const KUNCI = { 1:{v:60,t:0.5}, 2:{v:240,t:0.5}, 3:{v:108,t:0.5} };
const KHINT = { 1:'V = p × l × t', 2:'V = ½ × a × t_alas × t_prisma', 3:'V = ⅓ × L.alas × t' };
$$('[data-check]').forEach(btn=>btn.addEventListener('click', ()=>{
  const n = btn.dataset.check, k = KUNCI[n], fb = $('#fb-q'+n);
  const val = parseFloat(($('#q'+n).value||'').replace(',','.'));
  const ok = !isNaN(val) && Math.abs(val - k.v) <= k.t;
  fb.className = 'fb show '+(ok?'ok':'no');
  fb.textContent = ok ? '✓ Benar! Hebat.' : '✗ Belum tepat. Cek lagi rumusnya: ' + KHINT[n];
  S['correct'+n] = ok;
  const score = ['1','2','3'].filter(i=>S['correct'+i]).length;
  $('#scoreChip').textContent = score+' / 3';
  $('#btnLatDone').disabled = score < 2;
  lab.save();
}));
$('#btnLatDone').addEventListener('click', ()=>{ lab.unlock(5); lab.gotoTahap(5); });

/* ================= TAHAP 5 : refleksi ================= */
$('#stars').addEventListener('click', e=>{
  const sp = e.target.closest('span'); if(!sp) return;
  S.stars = +sp.dataset.s; lab.save();
  $$('#stars span').forEach(x=>x.classList.toggle('on', +x.dataset.s<=S.stars));
});
$('#refTeks').addEventListener('input', ()=>{ S.refTeks = $('#refTeks').value; lab.save(); });
$('#btnFinish').addEventListener('click', ()=>{
  S.refTeks = $('#refTeks').value;
  if((S.refTeks||'').trim().length < 20){ alert('Tulis simpulanmu dulu ya, minimal satu-dua kalimat dengan bahasamu sendiri.'); return; }
  S.finished = true; lab.save();
  $('#finishSum').innerHTML =
    vsRow('Dugaan 1 — kubus dalam balok', S.pred1||'?', '24', S.pred1==='24') +
    vsRow('Dugaan 2 — prisma vs balok', P2TXT[S.pred2]||'?', 'setengah (½)', S.pred2==='setengah') +
    '<div class="kv"><span>Skor latihan</span><b>'+(['1','2','3'].filter(i=>S['correct'+i]).length)+' / 3</b></div>' +
    '<div class="kv"><span>Penemu hari ini</span><b>kamu! 🎓</b></div>';
  $('#finishCard').style.display = '';
  lab.gotoTahap(5);
  $('#finishCard').scrollIntoView({behavior:'smooth'});
});

/* ---------- restore ---------- */
(function restore(){
  ['p1','p2'].forEach(nm=>{
    const v = S[nm==='p1'?'pred1':'pred2'];
    if(!v) return;
    const r = document.querySelector('input[name='+nm+'][value="'+v+'"]');
    if(r){ r.checked = true; r.closest('.opt').classList.add('sel'); }
  });
  if(S.pred1 && S.pred2){ lab.unlock(2); lab.unlock(3); }
  if(S.stars) $$('#stars span').forEach(x=>x.classList.toggle('on', +x.dataset.s<=S.stars));
  if(S.refTeks) $('#refTeks').value = S.refTeks;
  if(S.pA) $('#rngP').value = S.pA;
  if(S.pL) $('#rngL').value = S.pL;
  if(S.pT) $('#rngT').value = S.pT;
  if(S.belah != null) $('#rngBelah').value = S.belah;
  setMode('a');
  // deep-link pengujian: #tahap=2&exp=b
  const me = /exp=([abc])/.exec(location.hash || '');
  if(me && S.tahap === 2) setMode(me[1]);
  _ready = true;
  _onTahap(S.tahap);   // render dinamis untuk tahap awal (penting utk deep-link)
})();
})();
