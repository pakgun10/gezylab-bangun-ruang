/* Lab Luas Permukaan — kubus, balok, prisma, limas
   Pola: Prediksi → Eksperimen → Simpulkan → Latihan → Refleksi */
(function(){
"use strict";
const { $, $$, initLab, vsRow, buildNet, makeLabel, createScene } = Lab;

function _onTahap(n){
  if(n===3){ const el=$('#vsBox'); if(el) renderVs(el); }
  if(n===5){
    const el=$('#refleksiVs'); if(el) renderVs(el);
    if(S.stars) $$('#stars span').forEach(x=>x.classList.toggle('on', +x.dataset.s<=S.stars));
    if(S.refTeks) $('#refTeks').value = S.refTeks;
  }
}
const lab = initLab('luas-permukaan', { onTahap:_onTahap });
const S = lab.S;

/* ================= TAHAP 1 : prediksi ================= */
$('#btnPrediksi').addEventListener('click', ()=>{
  const p1 = document.querySelector('input[name=p1]:checked');
  const p2 = document.querySelector('input[name=p2]:checked');
  if(!p1 || !p2){ alert('Isi kedua dugaan dulu ya.'); return; }
  S.pred1 = p1.value; S.pred2 = p2.value; lab.save();
  lab.unlock(2); lab.unlock(3); lab.gotoTahap(2);
});

/* ================= TAHAP 2 : eksperimen ================= */
let mode = 'a', sc = null;
let kindA = 'kubus';
const dimsA = { s:3, p:4, l:3, t:2 };

function keyA(){
  if(kindA==='kubus'){ const s=dimsA.s; return 6*s*s; }
  const {p,l,t}=dimsA; return 2*(p*l+p*t+l*t);
}
function breakdownA(){
  if(kindA==='kubus'){ const s=dimsA.s;
    return '6 sisi × '+s+'² = 6 × '+(s*s)+' = <b>'+(6*s*s)+'</b> petak';
  }
  const {p,l,t}=dimsA, pl=p*l, pt=p*t, lt=l*t;
  return '2 × ('+p+'×'+l+' + '+p+'×'+t+' + '+l+'×'+t+') = 2 × ('+pl+'+'+pt+'+'+lt+') = 2 × '+(pl+pt+lt)+' = <b>'+(2*(pl+pt+lt))+'</b> petak';
}
function fpA(){
  // perkiraan lebar jaring datar (untuk jarak kamera)
  if(kindA==='kubus') return 4*dimsA.s;
  const {p,l,t}=dimsA; return Math.max(p+2*t, 2*l+2*t);
}
function showA(resetCam){
  if(!sc){ sc = createScene($('#c3d')); sc.loop(); sc.ctl.auto = true; }
  sc.clear();
  const d = kindA==='kubus' ? {s:dimsA.s} : {p:dimsA.p, l:dimsA.l, t:dimsA.t};
  const net = buildNet(kindA, d, { grid:true, color: kindA==='kubus' ? 0x38bdf8 : 0x34d399 });
  sc.world.add(net.group);
  net.setFold(0);
  const lbl = makeLabel(
    kindA==='kubus' ? 'kubus · s = '+dimsA.s
                    : 'balok · '+dimsA.p+' × '+dimsA.l+' × '+dimsA.t, 0.9);
  lbl.position.set(0, 2.5, 0); sc.world.add(lbl);
  if(resetCam) sc.setCam(0.7, 0.55, fpA()*2.2+6, 0);
  else sc.ctl.R = fpA()*2.2+6;
}
$$('#dimPills .pill').forEach(p=>p.addEventListener('click', ()=>{
  $$('#dimPills .pill').forEach(x=>x.classList.remove('active'));
  p.classList.add('active');
  kindA = p.dataset.k;
  $('#dimKubus').style.display = kindA==='kubus' ? '' : 'none';
  $('#dimBalok').style.display = kindA==='balok' ? '' : 'none';
  $('#evalA').style.display = 'none';
  showA(true);
}));
function bindDim(id, key, valId){
  $(id).addEventListener('input', e=>{
    dimsA[key] = +e.target.value;
    $(valId).textContent = e.target.value;
    $('#evalA').style.display = 'none';
    showA(false);
  });
}
bindDim('#rgS','s','#sVal'); bindDim('#rgP','p','#pVal');
bindDim('#rgL','l','#lVal'); bindDim('#rgT','t','#tVal');

function showEvalA(ok, t, x){
  const box = $('#evalA');
  box.style.display = ''; box.classList.toggle('ok', ok);
  $('#evalAT').textContent = t; $('#evalAX').innerHTML = x;
}
$('#btnCheckA').addEventListener('click', ()=>{
  const v = parseInt($('#ansA').value, 10);
  if(isNaN(v)){ showEvalA(false,'Isi dulu jawabanmu.', 'Tulis hasil hitungan petakmu pada kolom.'); return; }
  const k = keyA();
  if(v===k){
    showEvalA(true,'🎯 Tepat sekali!', 'Rinciannya: '+breakdownA()+'.<br>Inilah luas permukaan — <b>total luas semua sisi</b>!');
    if(!S.doneA){
      S.doneA = true; lab.save();
      $('#chipA').textContent = 'selesai ✓';
      checkExpDone();
    }
  } else {
    showEvalA(false,'Belum tepat.',
      kindA==='kubus'
        ? 'Ingat: kubus punya <b>6 sisi kongruen</b>, tiap sisi '+dimsA.s+'×'+dimsA.s+' petak. Hitung lagi!'
        : 'Ingat: balok punya <b>3 pasang</b> sisi. Jumlahkan: 2×(pl + pt + lt).');
  }
});

/* ---- eksperimen B : bangun rumusnya ---- */
const SHAPES = {
  kubus: { kind:'kubus', d:{s:3}, color:0x38bdf8, label:'kubus', fp:12,
    steps:['Satu sisi = <b>s × s = s²</b>','Ada <b>6</b> sisi yang kongruen'],
    formula:'L = 6 × s²',
    contoh:'s = 3 → L = 6 × 3² = 6 × 9 = <b>54</b> satuan luas' },
  balok: { kind:'balok', d:{p:4,l:3,t:2}, color:0x34d399, label:'balok', fp:11,
    steps:['Tiga pasang sisi: <b>pl</b>, <b>pt</b>, <b>lt</b>','Tiap pasang muncul <b>2 kali</b>'],
    formula:'L = 2 × (pl + pt + lt)',
    contoh:'4 × 3 × 2 → L = 2 × (12 + 8 + 6) = 2 × 26 = <b>52</b> satuan luas' },
  prisma: { kind:'prisma', d:{s:3,L:4}, color:0xf5a623, label:'prisma segitiga', fp:10,
    steps:['Dua alas segitiga: <b>2 × L.segitiga</b>','Tiga sisi tegak = <b>keliling alas × panjang prisma</b>'],
    formula:'L = 2 × L.Δ + K.alas × L.prisma',
    contoh:'Δ siku-siku 3-4-5, panjang 10 → L = 2×6 + 12×10 = 12 + 120 = <b>132</b> satuan luas' },
  limas: { kind:'limas', d:{s:6,h:4}, color:0xa78bfa, label:'limas segiempat', fp:16,
    steps:['Alas: <b>s × s</b>','<b>4</b> sisi tegak berbentuk segitiga kongruen'],
    formula:'L = L.alas + 4 × L.Δ tegak',
    contoh:'alas 6 × 6, tinggi sisi tegak 5 → L = 36 + 4 × 15 = 36 + 60 = <b>96</b> satuan luas' }
};
const viewedB = new Set(S.viewedB || []);
function renderFormulaCard(key){
  const c = SHAPES[key];
  $('#formulaCard').innerHTML =
    '<h3 style="margin-top:6px">'+c.label[0].toUpperCase()+c.label.slice(1)+'</h3>' +
    '<ol class="steps">'+c.steps.map(s=>'<li>'+s+'</li>').join('')+'</ol>' +
    '<div class="formula">'+c.formula.replace(/×/g,'<span class="gold">×</span>')+'</div>' +
    '<div class="hint">📌 Contoh: '+c.contoh+'</div>';
}
function showB(key, mark){
  const cfg = SHAPES[key];
  if(!sc){ sc = createScene($('#c3d')); sc.loop(); sc.ctl.auto = true; }
  sc.clear();
  const net = buildNet(cfg.kind, cfg.d, { color: cfg.color });
  sc.world.add(net.group);
  net.setFold(0);
  const lbl = makeLabel(cfg.label, 0.9);
  lbl.position.set(0, 2.5, 0); sc.world.add(lbl);
  sc.setCam(0.7, 0.55, cfg.fp*2.2+6, 0);
  renderFormulaCard(key);
  if(mark){
    viewedB.add(key);
    S.viewedB = [...viewedB]; lab.save();
    $('#chipB').textContent = 'dilihat '+viewedB.size+' / 4';
    if(viewedB.size===4 && !S.doneB) S.doneB = true;
    lab.save(); checkExpDone();
  }
}
$$('#shapePills .pill').forEach(p=>p.addEventListener('click', ()=>{
  $$('#shapePills .pill').forEach(x=>x.classList.remove('active'));
  p.classList.add('active');
  lastBKey = p.dataset.k;
  showB(p.dataset.k, true);
}));

/* ---- ganti mode ---- */
let lastBKey = 'kubus';
function setMode(m){
  mode = m;
  $$('#expPills .pill').forEach(p=>p.classList.toggle('active', p.dataset.e===m));
  $('#panelA').style.display = m==='a' ? '' : 'none';
  $('#panelB').style.display = m==='b' ? '' : 'none';
  $('#canvasTag').textContent = m==='a' ? 'Hitung petak' : 'Bangun rumusnya';
  if(m==='a') showA(true);
  else showB(lastBKey, false);
  setTimeout(()=>{ if(sc) sc.resize(); }, 60);
}
$$('#expPills .pill').forEach(p=>p.addEventListener('click',()=>setMode(p.dataset.e)));
function checkExpDone(){
  const ok = !!S.doneA && !!S.doneB;
  $('#btnExpDone').disabled = !ok;
  $('#expHint').textContent = ok ? 'Kedua eksperimen selesai. Lanjut!'
    : 'Selesaikan kedua eksperimen (A: jawab benar 1×'+(S.doneA?' ✓':'')+
      ', B: lihat keempat bangun ('+viewedB.size+'/4)) untuk membuka Tahap 3.';
}
$('#btnExpDone').addEventListener('click', ()=>{ lab.unlock(4); lab.gotoTahap(3); });

/* ================= TAHAP 3 : simpulkan ================= */
function renderVs(el){
  if(!el) return;
  el.innerHTML =
    vsRow('Dugaan 1 — petak jaring kubus s=3', S.pred1||'?', '54', S.pred1==='54') +
    vsRow('Dugaan 2 — luas balok 4×3×2', S.pred2||'?', '52', S.pred2==='52') +
    '<div class="hint">Yang penting bukan benar tidaknya dugaan, melainkan <b>berani menduga lalu menguji</b>.</div>';
}
function wireCek(name, kunci, fbId, pesan){
  document.querySelectorAll('input[name="'+name+'"]').forEach(r=>r.addEventListener('change',()=>{
    const ok = r.value===kunci, fb = $('#'+fbId);
    fb.className = 'fb show '+(ok?'ok':'no');
    fb.textContent = ok ? '✓ '+pesan : '✗ Coba ingat lagi hasil eksperimenmu.';
    fb.dataset.ok = ok?'1':'';
  }));
}
$('#btnCek').addEventListener('click', ()=>{
  const a = $('#fb-cek1').dataset.ok==='1', b = $('#fb-cek2').dataset.ok==='1';
  if(a&&b){ lab.unlock(4); lab.gotoTahap(4); }
  else alert('Jawab kedua cek pemahaman dengan benar dulu ya.');
});

/* ================= TAHAP 4 : latihan ================= */
const KUNCI = { '1':{v:150,t:0}, '2':{v:108,t:0}, '3':{v:'132'} };
const HINTS = {
  '1':'✗ Belum tepat. Kubus: 6 × s² = 6 × 25.',
  '2':'✗ Belum tepat. Balok: 2 × (pl + pt + lt) = 2 × (24 + 18 + 12).',
  '3':'✗ Belum tepat. Hitung: 2×6 + 12×10.'
};
$$('[data-check]').forEach(btn=>btn.addEventListener('click', ()=>{
  const n = btn.dataset.check, k = KUNCI[n], fb = $('#fb-q'+n);
  let val, ok;
  if(n==='3'){
    const r = document.querySelector('input[name=rq3]:checked');
    val = r ? r.value : ''; ok = val===k.v;
  } else {
    val = parseFloat(($('#q'+n).value||'').replace(',','.'));
    ok = !isNaN(val) && Math.abs(val-k.v) <= k.t;
  }
  fb.className = 'fb show '+(ok?'ok':'no');
  fb.textContent = ok ? '✓ Benar! Hebat.' : HINTS[n];
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
$('#refTeks').addEventListener('input', e=>{ S.refTeks = e.target.value; lab.save(); });
$('#btnFinish').addEventListener('click', ()=>{
  if(($('#refTeks').value||'').trim().length < 20){ alert('Tulis simpulanmu dulu ya, minimal satu-dua kalimat.'); return; }
  S.finished = true; lab.save();
  const score = ['1','2','3'].filter(i=>S['correct'+i]).length;
  $('#finishSum').innerHTML =
    vsRow('Dugaan 1 — petak jaring kubus s=3', S.pred1||'?', '54', S.pred1==='54') +
    vsRow('Dugaan 2 — luas balok 4×3×2', S.pred2||'?', '52', S.pred2==='52') +
    '<div class="kv"><span>Skor latihan</span><b>'+score+' / 3</b></div>' +
    '<div class="kv"><span>Penemu hari ini</span><b>kamu! 🎓</b></div>';
  $('#finishCard').style.display = '';
  lab.gotoTahap(5);
  $('#finishCard').scrollIntoView({behavior:'smooth'});
});

/* ---------- restore ---------- */
(function restore(){
  if(S.pred1){ const r=document.querySelector('input[name=p1][value="'+S.pred1+'"]'); if(r){r.checked=true;r.closest('.opt').classList.add('sel');} }
  if(S.pred2){ const r=document.querySelector('input[name=p2][value="'+S.pred2+'"]'); if(r){r.checked=true;r.closest('.opt').classList.add('sel');} }
  if(S.pred1&&S.pred2){ lab.unlock(2); lab.unlock(3); }
  if(S.stars) $$('#stars span').forEach(x=>x.classList.toggle('on', +x.dataset.s<=S.stars));
  if(S.doneA) $('#chipA').textContent = 'selesai ✓';
  $('#chipB').textContent = 'dilihat '+viewedB.size+' / 4';
  renderFormulaCard('kubus');
  checkExpDone();
  setMode('a');
})();
wireCek('cek1','benar','fb-cek1','Tepat! Itulah prinsip utama lab ini.');
wireCek('cek2','24','fb-cek2','Tepat! 6 × 2² = 24.');
})();
