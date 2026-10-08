/* Lab Bangun Gabungan — rumah, roket, tangki */
(function(){
"use strict";
const { $, $$, initLab, vsRow, makeLabel, std, PALETTE } = Lab;

/* S & state 3D dideklarasikan di awal agar aman dipanggil balik oleh initLab
   (deep-link #tahap=N memicu onTahap SEBELUM initLab selesai) */
let S = null, sc = null, cur = 'rumah', mode = 'a', markOn = false;
function _onTahap(n){
  if(n===2) setTimeout(()=>{ if(sc) sc.resize(); }, 80);
  if(!S) return;   // init belum selesai -> tunda, di-render ulang di akhir
  if(n===3){ const el=$('#vsBox'); if(el) renderVs(el); }
  if(n===5){
    const el=$('#refleksiVs'); if(el) renderVs(el);
    if(S.stars) $$('#stars span').forEach(x=>x.classList.toggle('on', +x.dataset.s<=S.stars));
    if(S.refTeks) $('#refTeks').value = S.refTeks;
  }
}
const lab = initLab('bangun-gabungan', { onTahap:_onTahap });
S = lab.S;

/* ================= data preset ================= */
const PRESETS = {
  rumah: {
    name:'Rumah', desc:'Balok <b>6×6×4</b> ditempel limas segiempat (alas 6×6, tinggi 4) tepat di atasnya.',
    v1t:'V balok = 6 × 6 × 4', v1:'144',
    v2t:'V limas = ⅓ × 6 × 6 × 4', v2:'48',
    vsum:'144 + 48 = <b>192</b>',
    lp1:'2×(36 + 24 + 24) = 168', lp2:'36 + 4×15 = 96',
    lt:'36', ltNote:'1 bidang persegi 6×6',
    lptot:'168 + 96 − 2×36 = <b>192</b>',
    q2key:'persegi',
    q2opts:'<label class="opt"><input type="radio" name="bq2" value="persegi"><span class="big">persegi</span></label>'+
           '<label class="opt"><input type="radio" name="bq2" value="lingkaran"><span class="big">lingkaran</span></label>'+
           '<label class="opt"><input type="radio" name="bq2" value="segitiga"><span class="big">segitiga</span></label>'
  },
  roket: {
    name:'Roket', desc:'Tabung (<b>r = 3, t = 5</b>) ditempel kerucut (<b>r = 3, t = 4</b>) tepat di atasnya.',
    v1t:'V tabung = π × 3² × 5', v1:'45π ≈ 141,3',
    v2t:'V kerucut = ⅓ × π × 3² × 4', v2:'12π ≈ 37,7',
    vsum:'45π + 12π = 57π ≈ <b>179,0</b>',
    lp1:'2×π×3² + 2×π×3×5 = 48π ≈ 150,7', lp2:'π×3² + π×3×5 = 24π ≈ 75,4',
    lt:'9π ≈ 28,3', ltNote:'1 bidang lingkaran r = 3',
    lptot:'48π + 24π − 2×9π = 54π ≈ <b>169,6</b>',
    q2key:'lingkaran',
    q2opts:'<label class="opt"><input type="radio" name="bq2" value="lingkaran"><span class="big">lingkaran</span></label>'+
           '<label class="opt"><input type="radio" name="bq2" value="persegi"><span class="big">persegi</span></label>'+
           '<label class="opt"><input type="radio" name="bq2" value="segitiga"><span class="big">segitiga</span></label>'
  },
  tangki: {
    name:'Tangki', desc:'Tabung (<b>r = 2, t = 5</b>) ditempel setengah bola (<b>r = 2</b>) di kedua ujungnya.',
    v1t:'V tabung = π × 2² × 5', v1:'20π ≈ 62,8',
    v2t:'V 2 setengah bola = ⁴⁄₃ × π × 2³', v2:'³²⁄₃π ≈ 33,5',
    vsum:'20π + ³²⁄₃π = ⁹²⁄₃π ≈ <b>96,3</b>',
    lp1:'2×π×2² + 2×π×2×5 = 28π ≈ 87,9', lp2:'2 × (8π + 4π) = 24π ≈ 75,4',
    lt:'2 × 4π = 8π ≈ 25,1', ltNote:'2 bidang lingkaran r = 2',
    lptot:'28π + 24π − 2×8π = 36π ≈ <b>113,0</b>',
    q2key:'2 lingkaran',
    q2opts:'<label class="opt"><input type="radio" name="bq2" value="2 lingkaran"><span class="big">2 lingkaran</span></label>'+
           '<label class="opt"><input type="radio" name="bq2" value="1 lingkaran"><span class="big">1 lingkaran</span></label>'+
           '<label class="opt"><input type="radio" name="bq2" value="persegi"><span class="big">persegi</span></label>'
  }
};

/* ================= TAHAP 1 : prediksi ================= */
$('#btnPrediksi').addEventListener('click', ()=>{
  const p1 = document.querySelector('input[name=p1]:checked');
  const p2 = document.querySelector('input[name=p2]:checked');
  if(!p1 || !p2){ alert('Isi kedua dugaan dulu ya.'); return; }
  S.pred1 = p1.value; S.pred2 = p2.value; lab.save();
  lab.unlock(2); lab.unlock(3); lab.gotoTahap(2);
});

/* ================= TAHAP 2 : eksperimen 3D ================= */
const built = {};   // preset -> {group, mats, marks}

function matsOf(root){
  const set = new Set();
  root.traverse(o=>{
    if(o.isMesh && o.material && !o.userData.marker)
      (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>set.add(m));
  });
  return [...set];
}
function redMark(geo){
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial(
    { color:0xef4444, transparent:true, opacity:0.5, side:THREE.DoubleSide }));
  m.visible = false; m.userData.marker = true;
  return m;
}
function lbl(text, x, y, z){
  const l = makeLabel(text); l.position.set(x, y, z); return l;
}
function buildRumah(){
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(6,4,6), std(PALETTE.blue));
  box.position.y = 2; g.add(box);
  const lim = Lab.buildNet('limas', { s:6, h:4 }, { color: PALETTE.orange });
  lim.setFold(1); lim.group.position.y = 4; g.add(lim.group);
  const mark = redMark(new THREE.PlaneGeometry(6,6));
  mark.rotation.x = -Math.PI/2; mark.position.y = 4.02; g.add(mark);
  g.add(lbl('balok 6×6×4', -5.6, 2, 0));
  g.add(lbl('limas s=6, t=4', 5.6, 6.6, 0));
  return { group:g, mats:matsOf(g), marks:[mark], cam:[0.65, 1.0, 27, 3.6] };
}
function buildRoket(){
  const g = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(3,3,5,48), std(PALETTE.blue));
  cyl.position.y = 2.5; g.add(cyl);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3,4,48), std(PALETTE.red));
  cone.position.y = 7; g.add(cone);
  const mark = redMark(new THREE.CircleGeometry(3,48));
  mark.rotation.x = -Math.PI/2; mark.position.y = 5.02; g.add(mark);
  g.add(lbl('tabung r=3, t=5', -5.8, 2.5, 0));
  g.add(lbl('kerucut r=3, t=4', 5.8, 7, 0));
  return { group:g, mats:matsOf(g), marks:[mark], cam:[0.65, 1.0, 27, 4] };
}
function buildTangki(){
  const g = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(2,2,5,48), std(PALETTE.green));
  cyl.rotation.z = Math.PI/2; cyl.position.y = 2; g.add(cyl);
  const dg = new THREE.SphereGeometry(2, 32, 16, 0, Math.PI*2, 0, Math.PI/2);
  const dl = new THREE.Mesh(dg, std(PALETTE.orange));
  dl.rotation.z = Math.PI/2; dl.position.set(-2.5, 2, 0); g.add(dl);
  const dr = new THREE.Mesh(dg.clone(), std(PALETTE.orange));
  dr.rotation.z = -Math.PI/2; dr.position.set(2.5, 2, 0); g.add(dr);
  const m1 = redMark(new THREE.CircleGeometry(2,48));
  m1.rotation.y = Math.PI/2; m1.position.set(-2.5, 2, 0); g.add(m1);
  const m2 = redMark(new THREE.CircleGeometry(2,48));
  m2.rotation.y = Math.PI/2; m2.position.set(2.5, 2, 0); g.add(m2);
  g.add(lbl('tabung r=2, t=5', -6.6, 4.2, 0));
  g.add(lbl('2 × ½ bola r=2', 6.6, 4.2, 0));
  return { group:g, mats:matsOf(g), marks:[m1,m2], cam:[1.05, 1.08, 28, 2.2] };
}
const BUILDERS = { rumah:buildRumah, roket:buildRoket, tangki:buildTangki };

function showPreset(key){
  cur = key;
  if(!sc){ sc = Lab.createScene($('#c3d')); sc.loop(); }
  if(!built[key]) built[key] = BUILDERS[key]();
  sc.clear();
  sc.world.add(built[key].group);
  sc.setCam(...built[key].cam);
  markOn = false; applyMark();
  $('#btnMark').classList.remove('pulse');
  S.seen = S.seen || {};
  S.seen[key] = true; lab.save();
  const P = PRESETS[key];
  $('#presetDesc').innerHTML = P.desc;
  $('#volBox').innerHTML =
    '<div class="kv"><span>'+P.v1t+'</span><b>'+P.v1+'</b></div>'+
    '<div class="kv"><span>'+P.v2t+'</span><b>'+P.v2+'</b></div>'+
    '<div class="formula">V gabungan = '+P.vsum+'</div>';
  $('#canvasTag').textContent = P.name + (mode==='a' ? ' · rakit & amati' : ' · bedah hitungan');
  renderBedah();
  checkExpDone();
}
function applyMark(){
  const b = built[cur]; if(!b) return;
  b.marks.forEach(m=>{ m.visible = markOn; });
  b.mats.forEach(m=>{ m.transparent = markOn; m.opacity = markOn ? 0.45 : 1; m.needsUpdate = true; });
  $('#btnMark').innerHTML = markOn ? '✓ Sisi tempelan ditandai — tekan lagi untuk sembunyikan' : '🔴 Tandai sisi yang menempel';
}
$('#btnMark').addEventListener('click', ()=>{
  markOn = !markOn; applyMark();
});
$$('#presetPills .pill').forEach(p=>p.addEventListener('click', ()=>{
  $$('#presetPills .pill').forEach(x=>x.classList.remove('active'));
  p.classList.add('active');
  showPreset(p.dataset.p);
}));

/* ---- B : bedah hitungan ---- */
function renderBedah(){
  const P = PRESETS[cur];
  $('#bedahPreset').textContent = P.name;
  $('#bedahBox').innerHTML =
    '<div class="kv"><span>'+P.v1t+'</span><b>'+P.v1+'</b></div>'+
    '<div class="kv"><span>'+P.v2t+'</span><b>'+P.v2+'</b></div>'+
    '<div class="formula">V gabungan = '+P.vsum+'</div>'+
    '<div class="eval"><strong>⚠️ Jebakan!</strong> Ada '+P.ltNote+' yang menempel — tidak terlihat dari luar, jadi tidak dihitung.</div>'+
    '<div class="kv"><span>LP bagian 1</span><b>'+P.lp1+'</b></div>'+
    '<div class="kv"><span>LP bagian 2</span><b>'+P.lp2+'</b></div>'+
    '<div class="kv"><span>Luas tempelan</span><b>'+P.lt+'</b></div>'+
    '<div class="formula">L gabungan = '+P.lptot+'</div>'+
    '<div class="quiz-q"><p><b>1.</b> Mengapa luas tempelan dikali 2?</p><div class="opts">'+
      '<label class="opt"><input type="radio" name="bq1" value="a"><span>Karena tempelan menutupi satu sisi dari <b>tiap</b> bangun</span></label>'+
      '<label class="opt"><input type="radio" name="bq1" value="b"><span>Karena ada dua bangun yang digabung</span></label>'+
      '<label class="opt"><input type="radio" name="bq1" value="c"><span>Karena rumusnya memang selalu dikali 2</span></label>'+
    '</div><div class="fb" id="fb-bq1"></div></div>'+
    '<div class="quiz-q"><p><b>2.</b> Pada '+P.name+', bidang tempelannya berbentuk…</p><div class="opts">'+P.q2opts+'</div><div class="fb" id="fb-bq2"></div></div>';
  Lab.wireOpts($('#bedahBox'));
  const st = { b1:false, b2:false };
  document.querySelectorAll('input[name=bq1]').forEach(r=>r.addEventListener('change', ()=>{
    const ok = r.value==='a', fb = $('#fb-bq1');
    fb.className = 'fb show '+(ok?'ok':'no');
    fb.textContent = ok ? '✓ Tepat! Satu sisi hilang dari tiap bangun — total dua sisi.' : '✗ Belum tepat. Pikirkan: sisi siapa saja yang tertutup tempelan?';
    st.b1 = ok; if(st.b1&&st.b2) bedahDone();
  }));
  document.querySelectorAll('input[name=bq2]').forEach(r=>r.addEventListener('change', ()=>{
    const ok = r.value===P.q2key, fb = $('#fb-bq2');
    fb.className = 'fb show '+(ok?'ok':'no');
    fb.textContent = ok ? '✓ Tepat! Perhatikan bentuk bidang yang menempel di 3D.' : '✗ Belum tepat. Lihat lagi tanda merah di kanvas 3D.';
    st.b2 = ok; if(st.b1&&st.b2) bedahDone();
  }));
}
function bedahDone(){
  if(S.doneB) return;
  S.doneB = true; lab.save();
  $('#bedahChip').style.display = '';
  checkExpDone();
}

/* ---- ganti mode A/B ---- */
function setMode(m){
  mode = m;
  $$('#expPills .pill').forEach(p=>p.classList.toggle('active', p.dataset.e===m));
  $('#panelA').style.display = m==='a' ? '' : 'none';
  $('#panelB').style.display = m==='b' ? '' : 'none';
  $('#canvasTag').textContent = PRESETS[cur].name + (m==='a' ? ' · rakit & amati' : ' · bedah hitungan');
  setTimeout(()=>{ if(sc) sc.resize(); }, 60);
}
$$('#expPills .pill').forEach(p=>p.addEventListener('click', ()=>setMode(p.dataset.e)));
function checkExpDone(){
  const seenCount = S.seen ? Object.keys(S.seen).length : 0;
  const ok = seenCount >= 3 && S.doneB;
  $('#btnExpDone').disabled = !ok;
  $('#expHint').textContent = ok ? 'Semua eksperimen selesai. Lanjut!'
    : 'Lihat ketiga preset di A ('+seenCount+'/3)'+(S.doneB?'':' lalu selesaikan bedah hitungan di B')+' untuk membuka Tahap 3.';
}
checkExpDone();
$('#btnExpDone').addEventListener('click', ()=>{ lab.unlock(4); lab.gotoTahap(3); });

/* ================= TAHAP 3 : simpulkan ================= */
function renderVs(el){
  if(!el) return;
  el.innerHTML =
    vsRow('Dugaan 1 — LP gabungan = jumlah LP', (S.pred1||'?'), 'Salah', S.pred1==='salah') +
    vsRow('Dugaan 2 — V gabungan = jumlah V', (S.pred2||'?'), 'Benar', S.pred2==='benar') +
    '<div class="hint">Volume tinggal dijumlah karena tempelan tidak mengurangi isi. Luas permukaan harus dikurangi karena tempelan menyembunyikan sisi.</div>';
}
function wireCek(name, kunci, fbId, pesan){
  document.querySelectorAll('input[name="'+name+'"]').forEach(r=>r.addEventListener('change', ()=>{
    const ok = r.value===kunci, fb = $('#'+fbId);
    fb.className = 'fb show '+(ok?'ok':'no');
    fb.textContent = ok ? '✓ '+pesan : '✗ Coba ingat lagi bedah hitunganmu.';
    fb.dataset.ok = ok?'1':'';
  }));
}
$('#btnCek').addEventListener('click', ()=>{
  const a = $('#fb-cek1').dataset.ok==='1', b = $('#fb-cek2').dataset.ok==='1';
  if(a&&b){ lab.unlock(4); lab.gotoTahap(4); }
  else alert('Jawab kedua cek pemahaman dengan benar dulu ya.');
});

/* ================= TAHAP 4 : latihan ================= */
const KUNCI = { '1':{v:'128'}, '2':{v:'32'}, '3':{v:'87'} };
const FBNO = {
  '1':'✗ Belum tepat. V gabungan = jumlah volume: 64 + 64.',
  '2':'✗ Belum tepat. Tempelan 4×4 = 16, hilang dari dua sisi → 2 × 16.',
  '3':'✗ Belum tepat. LP = 62 + 55 − 2×15 = 87. Alas limas ikut dihitung lalu dikurangi!'
};
$$('[data-check]').forEach(btn=>btn.addEventListener('click', ()=>{
  const n = btn.dataset.check, k = KUNCI[n], fb = $('#fb-q'+n);
  let val;
  if(n==='1') val = $('#q1').value.trim();
  else { const r = document.querySelector('input[name=rq'+n+']:checked'); val = r ? r.value : ''; }
  const ok = val === k.v;
  fb.className = 'fb show '+(ok?'ok':'no');
  fb.textContent = ok ? '✓ Benar! Hebat.' : FBNO[n];
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
  if((S.refTeks||'').trim().length < 20){ alert('Tulis simpulanmu dulu ya, minimal satu-dua kalimat.'); return; }
  S.finished = true; lab.save();
  const score = ['1','2','3'].filter(i=>S['correct'+i]).length;
  $('#finishSum').innerHTML =
    vsRow('Dugaan 1 — LP gabungan = jumlah LP', (S.pred1||'?'), 'Salah', S.pred1==='salah') +
    vsRow('Dugaan 2 — V gabungan = jumlah V', (S.pred2||'?'), 'Benar', S.pred2==='benar') +
    '<div class="kv"><span>Skor latihan</span><b>'+score+' / 3</b></div>';
  $('#finishCard').style.display = '';
  lab.gotoTahap(5);
  $('#finishCard').scrollIntoView({behavior:'smooth'});
});

/* ---------- restore ---------- */
(function restore(){
  if(S.pred1){ const r=document.querySelector('input[name=p1][value="'+S.pred1+'"]'); if(r){r.checked=true;r.closest('.opt').classList.add('sel');} }
  if(S.pred2){ const r=document.querySelector('input[name=p2][value="'+S.pred2+'"]'); if(r){r.checked=true;r.closest('.opt').classList.add('sel');} }
  if(S.pred1&&S.pred2){ lab.unlock(2); lab.unlock(3); }
  if(S.doneB) $('#bedahChip').style.display = '';
  const sc2 = ['1','2','3'].filter(i=>S['correct'+i]).length;
  if(sc2){ $('#scoreChip').textContent = sc2+' / 3'; $('#btnLatDone').disabled = sc2 < 2; }
  showPreset('rumah');   // siapkan scene 3D sejak awal
})();
wireCek('cek1','salah','fb-cek1','Tepat! Sisi yang menempel hilang dari pandangan.');
wireCek('cek2','8','fb-cek2','Tepat! Tempelan 2×2 = 4, dikali 2 sisi = 8.');
/* render ulang tahap aktif (deep-link #tahap=N dilewati saat init) */
_onTahap(S.tahap);
})();
