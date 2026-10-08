/* Lab Jaring-Jaring — kubus, balok, prisma, limas */
(function(){
"use strict";
const { $, $$, anim, initLab, vsRow } = Lab;
/* dipanggil setiap ganti tahap (via opts initLab) */
function _onTahap(n){
  if(n===3){ const el=$('#vsBox'); if(el) renderVs(el); }
  if(n===5){
    const el=$('#refleksiVs'); if(el) renderVs(el);
    const S2 = lab.S;
    if(S2.stars) $$('#stars span').forEach(x=>x.classList.toggle('on', +x.dataset.s<=S2.stars));
    if(S2.refTeks) $('#refTeks').value = S2.refTeks;
  }
}
const lab = initLab('jaring-jaring', { onTahap:_onTahap });
const S = lab.S;

/* ---------- data: 11 jaring kubus (terverifikasi via simulasi lipat) ---------- */
const NETS_11 = [
  [[0,1],[1,1],[0,2],[2,1],[1,0],[3,1]],
  [[0,2],[1,2],[0,3],[2,2],[1,1],[1,0]],
  [[0,1],[1,1],[0,2],[2,1],[3,1],[2,0]],
  [[0,1],[1,1],[0,2],[2,1],[3,1],[3,0]],
  [[0,1],[1,1],[0,2],[2,1],[2,0],[3,0]],
  [[0,2],[1,2],[0,3],[1,1],[0,4],[1,0]],
  [[0,2],[1,2],[0,3],[1,1],[2,1],[1,0]],
  [[0,2],[1,2],[0,3],[1,1],[2,1],[2,0]],
  [[0,1],[1,1],[2,1],[1,2],[1,0],[3,1]],
  [[0,1],[1,1],[2,1],[1,2],[3,1],[2,0]],
  [[0,0],[1,0],[2,0],[1,1],[1,2],[1,3]]
];
const norm = cells => {
  const xs = cells.map(c=>c[0]), ys = cells.map(c=>c[1]);
  const dx = Math.min(...xs), dy = Math.min(...ys);
  return cells.map(c=>[c[0]-dx, c[1]-dy]).sort((a,b)=>a[0]-b[0]||a[1]-b[1])
    .map(c=>c.join(',')).join(';');
};
const SYMS = [
  ([x,y])=>[x,y], ([x,y])=>[-x,y], ([x,y])=>[x,-y], ([x,y])=>[-x,-y],
  ([x,y])=>[y,x], ([x,y])=>[-y,x], ([x,y])=>[y,-x], ([x,y])=>[-y,-x]
];
const canon = cells => SYMS.map(f => norm(cells.map(c => f(c)))).sort()[0];
const NETS_SET = new Set(NETS_11.map(canon));

/* ---------- helper SVG ---------- */
function netSVG(cells, s, labels, stroke){
  s = s || 26; stroke = stroke || '#3b82f6';
  const xs = cells.map(c=>c[0]), ys = cells.map(c=>c[1]);
  const dx = Math.min(...xs), dy = Math.min(...ys);
  const W = (Math.max(...xs)-dx+1)*s, H = (Math.max(...ys)-dy+1)*s;
  let r = '<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">';
  cells.forEach((c,i)=>{
    const x = (c[0]-dx)*s, y = (c[1]-dy)*s;
    r += '<rect x="'+x+'" y="'+y+'" width="'+s+'" height="'+s+'" fill="#dbeafe" stroke="'+stroke+'" stroke-width="2"/>';
    if (labels && labels[i])
      r += '<text x="'+(x+s/2)+'" y="'+(y+s/2)+'" text-anchor="middle" dominant-baseline="central" font-weight="bold" font-size="'+(s*0.55)+'" fill="#1e3a8a">'+labels[i]+'</text>';
  });
  return r + '</svg>';
}
function shapeSVG(shapes, u){
  u = u || 16;
  let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  shapes.forEach(sh=>{
    if(sh.r){ const [x,y,w,h]=sh.r; minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x+w);maxY=Math.max(maxY,y+h); }
    else { sh.t.forEach((v,i)=>{ if(i%2===0){minX=Math.min(minX,v);maxX=Math.max(maxX,v);} else {minY=Math.min(minY,v);maxY=Math.max(maxY,v);} }); }
  });
  const W=(maxX-minX)*u, H=(maxY-minY)*u;
  let r='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">';
  shapes.forEach(sh=>{
    if(sh.r){ const [x,y,w,h]=sh.r;
      r+='<rect x="'+((x-minX)*u)+'" y="'+((y-minY)*u)+'" width="'+(w*u)+'" height="'+(h*u)+'" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>';
    } else { const p=sh.t.map((v,i)=> i%2===0 ? (v-minX)*u : (v-minY)*u);
      r+='<polygon points="'+p.join(',')+'" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>';
    }
  });
  return r+'</svg>';
}
/* jaring balok / prisma / limas untuk Tebak Jaring */
const SVG_BALOK = shapeSVG([
  {r:[0,0,4,3]}, {r:[0,-2,4,2]}, {r:[0,3,4,2]}, {r:[4,0,2,3]}, {r:[-2,0,2,3]}, {r:[0,-5,4,3]}
]);
const SVG_PRISMA = shapeSVG([
  {r:[0,0,3,4]}, {r:[3,0,3,4]}, {r:[6,0,3,4]},
  {t:[3,0, 6,0, 4.5,-2.6]}, {t:[3,4, 6,4, 4.5,6.6]}
]);
const SVG_LIMAS = shapeSVG([
  {r:[0,0,3,3]},
  {t:[0,0, 3,0, 1.5,-2.6]}, {t:[0,3, 3,3, 1.5,5.6]},
  {t:[3,0, 3,3, 5.6,1.5]}, {t:[0,0, 0,3, -2.6,1.5]}
]);

/* ================= TAHAP 1 : prediksi ================= */
const P1_NETS = [
  { v:'a', cells:[[0,1],[1,1],[2,1],[3,1],[1,2],[1,0]] },                       // cross, valid
  { v:'b', cells:[[0,2],[1,2],[0,3],[1,1],[0,4],[1,0]] },                       // 2-2-2, valid
  { v:'c', cells:[[0,0],[1,0],[2,0],[3,0],[4,0],[2,1]] },                       // deret 5 + 1, INVALID
  { v:'d', cells:[[0,1],[1,1],[2,1],[1,2],[1,0],[3,1]] }                        // 1-4-1, valid
];
$('#pred1box').innerHTML = P1_NETS.map(n =>
  '<label class="opt"><input type="radio" name="p1" value="'+n.v+'">' +
  '<span class="big">'+n.v.toUpperCase()+'</span>'+netSVG(n.cells, 24)+'</label>'
).join('');
Lab.wireOpts($('#pred1box'));

$('#btnPrediksi').addEventListener('click', ()=>{
  const p1 = document.querySelector('input[name=p1]:checked');
  const p2 = document.querySelector('input[name=p2]:checked');
  if(!p1 || !p2){ alert('Isi kedua dugaan dulu ya.'); return; }
  S.pred1 = p1.value; S.pred2 = p2.value; lab.save();
  lab.unlock(2); lab.unlock(3); lab.gotoTahap(2);
});

/* ================= TAHAP 2 : eksperimen ================= */
let mode = 'a', sc = null, net = null, curSolid = 'kubus';
const SOLIDS = {
  kubus:  { kind:'kubus',  d:{s:3},       color:0x38bdf8, label:'kubus (s = 3)', R:20 },
  balok:  { kind:'balok',  d:{p:4,l:3,t:2}, color:0x34d399, label:'balok (4 × 3 × 2)', R:24 },
  prisma: { kind:'prisma', d:{s:3,L:4},    color:0xf5a623, label:'prisma segitiga (s = 3, L = 4)', R:24 },
  limas:  { kind:'limas',  d:{s:3,h:3},    color:0xa78bfa, label:'limas segiempat (s = 3, t = 3)', R:20 }
};
function showSolid(key2){
  curSolid = key2;
  const cfg = SOLIDS[key2];
  if(!sc){ sc = Lab.createScene($('#c3d')); sc.loop(); sc.ctl.auto = true; }
  sc.clear();
  net = Lab.buildNet(cfg.kind, cfg.d, { color: cfg.color });
  sc.world.add(net.group);
  const v = +$('#foldRange').value;
  net.setFold(v/100);
  $('#foldPct').textContent = v + '%';
  $('#solidName').textContent = cfg.label;
  sc.setCam(0.7, 1.02, cfg.R, 1.5);
}
$$('#solidPills .pill').forEach(p => p.addEventListener('click', ()=>{
  $$('#solidPills .pill').forEach(x=>x.classList.remove('active'));
  p.classList.add('active');
  showSolid(p.dataset.s);
}));
$('#foldRange').addEventListener('input', e=>{
  const v = +e.target.value;
  $('#foldPct').textContent = v + '%';
  if(net) net.setFold(v/100);
});
$('#btnADone').addEventListener('click', ()=>{
  S.doneA = true; lab.save(); checkExpDone(); setMode('b');
  $('#btnADone').textContent = '✓ Paham! Lanjut ke misi B →';
});

/* ---- misi B : 11 jaring ---- */
const picked = new Set(), found = new Set(JSON.parse(JSON.stringify(S.foundNets||[])));
const gridEl = $('#netGrid');
for(let y=0;y<4;y++) for(let x=0;x<4;x++){
  const b = document.createElement('button');
  b.className = 'net-cell'; b.dataset.xy = x+','+y; b.textContent = '·';
  b.addEventListener('click', ()=>{
    const k = b.dataset.xy;
    if(picked.has(k)){ picked.delete(k); b.classList.remove('on'); b.textContent='·'; }
    else { picked.add(k); b.classList.add('on'); b.textContent='■'; }
  });
  gridEl.appendChild(b);
}
$('#btnClearNet').addEventListener('click', ()=>{
  picked.clear();
  $$('#netGrid .net-cell').forEach(b=>{ b.classList.remove('on'); b.textContent='·'; });
  $('#evalNet').style.display = 'none';
});
function connected(cells){
  const set = new Set(cells.map(c=>c.join(',')));
  const seen = new Set([cells[0].join(',')]);
  const q = [cells[0]];
  while(q.length){
    const [x,y] = q.shift();
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const k = (x+dx)+','+(y+dy);
      if(set.has(k) && !seen.has(k)){ seen.add(k); q.push([x+dx,y+dy]); }
    }
  }
  return seen.size === cells.length;
}
function renderFound(){
  $('#foundChip').textContent = found.size + ' / 11';
  $('#gallery').innerHTML = [...found].map((c,i)=>
    '<div class="found">'+netSVG(JSON.parse('['+c.split(';').map(p=>'['+p+']').join(',')+']'), 16)+'<small>#'+(i+1)+'</small></div>'
  ).join('');
}
function showEvalNet(ok, t, x){
  const box = $('#evalNet');
  box.style.display = ''; box.classList.toggle('ok', ok);
  $('#evalNetT').textContent = t; $('#evalNetX').textContent = x;
}
$('#btnCheckNet').addEventListener('click', ()=>{
  const cells = [...picked].map(s=>s.split(',').map(Number));
  if(cells.length !== 6){ showEvalNet(false,'Belum 6 petak.', 'Pilih tepat 6 petak yang saling menempel (sekarang '+cells.length+').'); return; }
  if(!connected(cells)){ showEvalNet(false,'Tidak tersambung.', 'Semua petak harus saling menempel sisi-penuh.'); return; }
  const c = canon(cells);
  if(found.has(c)){ showEvalNet(false,'Sudah ditemukan!', 'Jaring ini sudah ada di galerimu. Cari yang lain.'); return; }
  if(NETS_SET.has(c)){
    found.add(c); S.foundNets = [...found]; lab.save();
    renderFound();
    $('#btnClearNet').click();
    showEvalNet(true,'🎉 Jaring kubus ditemukan!', 'Luar biasa! Lihat galerimu — tinggal '+(11-found.size)+' lagi.');
    checkExpDone();
  } else {
    showEvalNet(false,'Bukan jaring kubus.', 'Rangkaian ini tidak bisa dilipat menjadi kubus tanpa overlap. Coba susunan lain!');
  }
});
renderFound();

/* ---- misi C : tebak jaring ---- */
const ROUNDS = [
  { svg: netSVG([[0,1],[1,1],[2,1],[3,1],[1,2],[1,0]], 26), answer:'kubus' },
  { svg: SVG_BALOK,  answer:'balok' },
  { svg: SVG_PRISMA, answer:'prisma' },
  { svg: SVG_LIMAS,  answer:'limas' }
].sort(()=>Math.random()-0.5);
let round = +(S.round||0), roundScore = +(S.roundScore||0), guessing = true;
function showRound(){
  $('#roundChip').textContent = 'Ronde ' + Math.min(round+1,4) + ' / 4';
  if(round >= 4){
    $('#guessSvg').innerHTML = '<p><b>Selesai!</b> Skor tebak jaringmu: <b>'+roundScore+' / 4</b> 🎯</p>';
    $('#guessOpts').style.display = 'none'; $('#btnGuess').style.display = 'none';
    S.doneC = true; lab.save(); checkExpDone();
    return;
  }
  $('#guessSvg').innerHTML = ROUNDS[round].svg;
  document.querySelectorAll('input[name=g]').forEach(r=>{ r.checked=false; r.closest('.opt').classList.remove('sel'); });
  $('#evalGuess').style.display = 'none';
  $('#btnGuess').textContent = 'Kunci jawaban'; guessing = true;
}
$('#btnGuess').addEventListener('click', ()=>{
  if(guessing){
    const sel = document.querySelector('input[name=g]:checked');
    if(!sel){ alert('Pilih dulu jawabanmu.'); return; }
    const ok = sel.value === ROUNDS[round].answer;
    if(ok) roundScore++;
    const box = $('#evalGuess');
    box.style.display = ''; box.classList.toggle('ok', ok);
    $('#evalGuessT').textContent = ok ? '🎯 Benar!' : '💡 Belum tepat.';
    $('#evalGuessX').textContent = ok ? 'Itu jaring-jaring '+ROUNDS[round].answer+'.'
      : 'Itu jaring-jaring '+ROUNDS[round].answer+'. Perhatikan bentuk petaknya!';
    $('#btnGuess').textContent = round < 3 ? 'Ronde berikutnya →' : 'Lihat hasil →';
    guessing = false;
  } else {
    round++; S.round = round; S.roundScore = roundScore; lab.save(); showRound();
  }
});
showRound();

/* ---- ganti mode ---- */
function setMode(m){
  mode = m;
  $$('#expPills .pill').forEach(p=>p.classList.toggle('active', p.dataset.e===m));
  $('#panelA').style.display = m==='a' ? '' : 'none';
  $('#panelB').style.display = m==='b' ? '' : 'none';
  $('#panelC').style.display = m==='c' ? '' : 'none';
  const wrap = $('#canvasWrap');
  wrap.style.display = m==='a' ? '' : 'none';
  $('#tahap2 .lab-grid').style.gridTemplateColumns = m==='a' ? '' : '1fr';
  $('#canvasTag').textContent = m==='a' ? 'Lipat & buka 3D' : m==='b' ? 'Misi 11 jaring' : 'Tebak jaring';
  if(m==='a' && !sc) showSolid(curSolid);
  setTimeout(()=>{ if(sc) sc.resize(); }, 60);
}
$$('#expPills .pill').forEach(p=>p.addEventListener('click',()=>setMode(p.dataset.e)));
function checkExpDone(){
  const ok = S.doneA && found.size >= 5 && S.doneC;
  $('#btnExpDone').disabled = !ok;
  $('#expHint').textContent = ok ? 'Semua misi selesai. Lanjut!'
    : 'Selesaikan ketiga misi (A: tekan "Saya paham", B: temukan ≥5 jaring (kamu: '+found.size+'), C: 4 ronde) untuk membuka Tahap 3.';
}
checkExpDone();
$('#btnExpDone').addEventListener('click', ()=>{ lab.unlock(4); lab.gotoTahap(3); });

/* ================= TAHAP 3 : simpulkan ================= */
function renderVs(el){
  if(!el) return;
  el.innerHTML =
    vsRow('Dugaan 1 — yang bukan jaring', (S.pred1||'?').toUpperCase(), 'C', S.pred1==='c') +
    vsRow('Dugaan 2 — banyak jaring kubus', S.pred2||'?', '11', S.pred2==='11') +
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
$('#q1svg').innerHTML = netSVG([[1,1],[1,2],[2,1],[1,0],[0,1],[1,3]], 30, ['1','2','3','4','5','6']);
const KUNCI = { '1':{v:'4'}, '2':{v:'b'}, '3':{v:'b'} };
$$('[data-check]').forEach(btn=>btn.addEventListener('click', ()=>{
  const n = btn.dataset.check, k = KUNCI[n], fb = $('#fb-q'+n);
  let val;
  if(n==='1') val = $('#q1').value.trim();
  else { const r = document.querySelector('input[name=rq'+n+']:checked'); val = r ? r.value : ''; }
  const ok = val === k.v;
  fb.className = 'fb show '+(ok?'ok':'no');
  fb.textContent = ok ? '✓ Benar! Hebat.'
    : n==='1' ? '✗ Belum tepat. Bayangkan dilipat: sisi 2 (utara) berhadapan dengan sisi…'
    : n==='2' ? '✗ Belum tepat. Balok punya 3 pasang sisi kongruen.'
    : '✗ Belum tepat. Ingat susunan jaring limas di eksperimen A.';
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
$('#refTeks').addEventListener('input', ()=>lab.save());
$('#btnFinish').addEventListener('click', ()=>{
  S.refTeks = $('#refTeks').value;
  if((S.refTeks||'').trim().length < 20){ alert('Tulis simpulanmu dulu ya, minimal satu-dua kalimat.'); return; }
  S.finished = true; lab.save();
  $('#finishSum').innerHTML =
    vsRow('Dugaan 1 — yang bukan jaring', (S.pred1||'?').toUpperCase(), 'C', S.pred1==='c') +
    vsRow('Dugaan 2 — banyak jaring', S.pred2||'?', '11', S.pred2==='11') +
    '<div class="kv"><span>Jaring kubus ditemukan</span><b>'+found.size+' / 11</b></div>' +
    '<div class="kv"><span>Skor tebak jaring</span><b>'+roundScore+' / 4</b></div>';
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
  renderFound();
  setMode('a');   // siapkan eksperimen A (scene 3D) sejak awal
})();
wireCek('cek1','6','fb-cek1','Tepat! Kubus punya 6 sisi kongruen.');
wireCek('cek2','benar','fb-cek2','Tepat! Itulah mengapa misimu menemukan 11.');
})();
