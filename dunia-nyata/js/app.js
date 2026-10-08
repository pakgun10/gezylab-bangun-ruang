/* Lab Dunia Nyata — tenda pramuka, kemasan kue, tangki air (2D, SVG) */
(function(){
"use strict";
const { $, $$, initLab, vsRow } = Lab;

/* renderVs didefer agar aman saat deep-link #tahap=3/5 (initLab belum selesai) */
function _onTahap(n){
  setTimeout(()=>{
    if(n===3) renderVs($('#vsBox'));
    if(n===5){
      renderVs($('#refleksiVs'));
      if(S.stars) $$('#stars span').forEach(x=>x.classList.toggle('on', +x.dataset.s<=S.stars));
      if(S.refTeks) $('#refTeks').value = S.refTeks;
    }
  }, 0);
}
const lab = initLab('dunia-nyata', { onTahap:_onTahap });
const S = lab.S;

/* ---------- parse angka gaya Indonesia: "910.000"->910000, "13,8"->13.8 ---------- */
function parseNum(str){
  str = (str||'').trim().replace(/\s/g,'');
  if(!str) return NaN;
  if(/^\d{1,3}(\.\d{3})+$/.test(str)) str = str.replace(/\./g,'');
  else if(str.includes(',')) str = str.replace(/\./g,'').replace(',','.');
  return parseFloat(str);
}

/* ================= TAHAP 1 : prediksi ================= */
$('#btnPrediksi').addEventListener('click', ()=>{
  const p1 = document.querySelector('input[name=p1]:checked');
  const p2 = document.querySelector('input[name=p2]:checked');
  if(!p1 || !p2){ alert('Isi kedua dugaan dulu ya.'); return; }
  S.pred1 = p1.value; S.pred2 = p2.value; lab.save();
  lab.unlock(2); lab.gotoTahap(2);
});

/* ================= TAHAP 2 : studi kasus ================= */
const NSTEPS = 3;
const STEPS = {
  a1:{type:'radio', key:'prisma',
      ok:'🎯 Benar! Tenda ini prisma segitiga.',
      no:'💡 Belum tepat. Alas dan tutupnya segitiga, sisi tegaknya persegi panjang.'},
  a2:{type:'num', input:'in-a2', key:26, tol:0.01,
      ok:'🎯 Benar! 2×(½×3×2) + 2×(2,5×4) = 6 + 20 = 26 m².',
      no:'✗ Belum tepat. Hitung: 2×(½×3×2) + 2×(2,5×4).'},
  a3:{type:'num', input:'in-a3', key:910000, tol:1,
      ok:'🎯 Benar! 26 × Rp35.000 = Rp910.000.',
      no:'✗ Belum tepat. Kalikan luas kain dengan harga per m².'},
  b1:{type:'radio', key:'balok',
      ok:'🎯 Benar! Kotak kemasan berbentuk balok.',
      no:'💡 Belum tepat. Sisinya persegi panjang dengan 3 ukuran berbeda.'},
  b2:{type:'num', input:'in-b2', key:1300, tol:0.01,
      ok:'🎯 Benar! 2×(20×15 + 20×10 + 15×10) = 1.300 cm².',
      no:'✗ Belum tepat. Luas permukaan = 2×(p×l + p×t + l×t).'},
  b3:{type:'num', input:'in-b3', key:7, tol:0.01,
      ok:'🎯 Benar! 10.000 ÷ 1.300 = 7,69… → 7 kotak (dibulatkan ke bawah).',
      no:'✗ Belum tepat. Bagi, lalu bulatkan ke BAWAH.'},
  c1:{type:'radio', key:'tabung',
      ok:'🎯 Benar! Tangki air berbentuk tabung.',
      no:'💡 Belum tepat. Alasnya lingkaran, badannya melengkung.'},
  c2:{type:'num', input:'in-c2', key:942000, tol:1,
      ok:'🎯 Benar! 3,14 × 50² × 120 = 942.000 cm³ = 942 liter.',
      no:'✗ Belum tepat. Volume tabung = π × r² × t.'},
  c3:{type:'num', input:'in-c3', key:706.5, tol:0.1,
      ok:'🎯 Benar! ¾ × 942 = 706,5 liter.',
      no:'✗ Belum tepat. Kalikan 942 dengan ¾.'}
};
function stepBox(c,n){ return document.querySelector('.stepbox[data-case="'+c+'"][data-step="'+n+'"]'); }

function unlockNext(id){
  const c = id[0], n = parseInt(id.slice(1),10) + 1;
  const nx = stepBox(c,n);
  if(nx){
    nx.classList.remove('locked');
    nx.querySelectorAll('input,button').forEach(i=>{ i.disabled = false; });
  }
}
function casesDone(){ return ['a','b','c'].filter(c=>S['done'+c.toUpperCase()]).length; }
function checkExpDone(){
  const n = casesDone();
  $('#btnExpDone').disabled = n < 1;
  $('#expHint').textContent = n >= 1
    ? 'Bagus! '+n+' dari 3 kasus selesai. Lanjut ke Simpulan!'
    : 'Selesaikan minimal 1 studi kasus untuk membuka Tahap 3 — tapi tantang dirimu selesaikan ketiganya! 💪';
}
function refreshCase(c){
  let done = 0;
  for(let n=1;n<=NSTEPS;n++) if(S['s_'+c+n]) done++;
  $('#chip'+c.toUpperCase()).textContent = done+' / '+NSTEPS;
  S['done'+c.toUpperCase()] = (done===NSTEPS);
  lab.save();
  checkExpDone();
}
$$('[data-cek]').forEach(btn=>btn.addEventListener('click', ()=>{
  const id = btn.dataset.cek;                 // 'a1'
  const cfg = STEPS[id];
  const fb = $('#fb-'+id);
  let raw, ok;
  if(cfg.type==='radio'){
    const r = document.querySelector('input[name="'+id+'"]:checked');
    raw = r ? r.value : '';
    if(!raw){ alert('Pilih dulu jawabanmu.'); return; }
    ok = raw === cfg.key;
  } else {
    raw = $('#'+cfg.input).value.trim();
    if(!raw){ alert('Isi dulu jawabanmu.'); return; }
    const v = parseNum(raw);
    ok = !isNaN(v) && Math.abs(v - cfg.key) <= cfg.tol;
  }
  fb.className = 'fb show '+(ok?'ok':'no');
  fb.textContent = ok ? cfg.ok : cfg.no;
  if(ok){
    S['s_'+id] = true; S['v_'+id] = raw; lab.save();
    const box = btn.closest('.stepbox');
    box.classList.add('done'); box.classList.remove('locked');
    box.querySelectorAll('input,button').forEach(i=>{ i.disabled = true; });
    unlockNext(id);
    refreshCase(id[0]);
  }
}));

/* ---- ganti kasus ---- */
function setMode(m){
  ['a','b','c'].forEach(x=>{
    $('#panel'+x.toUpperCase()).style.display = x===m ? '' : 'none';
  });
  $$('#expPills .pill').forEach(p=>p.classList.toggle('active', p.dataset.e===m));
}
$$('#expPills .pill').forEach(p=>p.addEventListener('click',()=>setMode(p.dataset.e)));
checkExpDone();
$('#btnExpDone').addEventListener('click', ()=>{ lab.unlock(3); lab.gotoTahap(3); });

/* ================= TAHAP 3 : simpulkan ================= */
const P1TXT = { luas:'luas permukaan', volume:'volume' };
const P2TXT = { '5000':'5.000 cm³', '500000':'500.000 cm³', '5000000':'5.000.000 cm³' };
function renderVs(el){
  if(!el) return;
  el.innerHTML =
    vsRow('Dugaan 1 — kain tenda berkaitan dengan', P1TXT[S.pred1]||'?', 'luas permukaan', S.pred1==='luas') +
    vsRow('Dugaan 2 — 500 liter', P2TXT[S.pred2]||'?', '500.000 cm³', S.pred2==='500000') +
    '<div class="hint">Yang penting bukan benar tidaknya dugaan, melainkan <b>berani menduga lalu menguji</b> — itulah cara ilmuwan berpikir.</div>';
}
function wireCek(name, kunci, fbId, pesan){
  document.querySelectorAll('input[name="'+name+'"]').forEach(r=>r.addEventListener('change',()=>{
    const ok = r.value===kunci, fb = $('#'+fbId);
    fb.className = 'fb show '+(ok?'ok':'no');
    fb.textContent = ok ? '✓ '+pesan : '✗ Coba ingat lagi strategi 3 langkah.';
    fb.dataset.ok = ok?'1':'';
  }));
}
wireCek('cek1','salah','fb-cek1','Tepat! Daya tampung = isi = volume, bukan luas permukaan.');
wireCek('cek2','1000','fb-cek2','Tepat! 1 m³ = 1.000 liter.');
$('#btnCek').addEventListener('click', ()=>{
  const a = $('#fb-cek1').dataset.ok==='1', b = $('#fb-cek2').dataset.ok==='1';
  if(a&&b){ lab.unlock(4); lab.gotoTahap(4); }
  else alert('Jawab kedua cek pemahaman dengan benar dulu ya.');
});

/* ================= TAHAP 4 : latihan ================= */
const KUNCI = {
  '1':{ v:13.8, tol:0.1,  hint:'Luas kain = 2×(½×2×1,5) + 2×(1,8×3).' },
  '2':{ v:600,  tol:0.01, hint:'Luas permukaan kubus = 6 × s².' }
};
$$('[data-check]').forEach(btn=>btn.addEventListener('click', ()=>{
  const n = btn.dataset.check, fb = $('#fb-q'+n);
  let ok, raw;
  if(n==='3'){
    const r = document.querySelector('input[name=rq3]:checked');
    if(!r){ alert('Pilih dulu jawabanmu.'); return; }
    raw = r.value; ok = raw==='385';
  } else {
    raw = $('#q'+n).value.trim();
    if(!raw){ alert('Isi dulu jawabanmu.'); return; }
    const v = parseNum(raw);
    ok = !isNaN(v) && Math.abs(v - KUNCI[n].v) <= KUNCI[n].tol;
  }
  fb.className = 'fb show '+(ok?'ok':'no');
  fb.textContent = ok ? '✓ Benar! Hebat.'
    : '✗ Belum tepat. '+(n==='3' ? 'Hitung volume tabung (cm³) lalu bagi 1.000.' : KUNCI[n].hint);
  S['correct'+n] = ok; S['lat'+n] = raw; lab.save();
  const score = ['1','2','3'].filter(i=>S['correct'+i]).length;
  $('#scoreChip').textContent = score+' / 3';
  $('#btnLatDone').disabled = score < 2;
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
    vsRow('Dugaan 1 — kain tenda', P1TXT[S.pred1]||'?', 'luas permukaan', S.pred1==='luas') +
    vsRow('Dugaan 2 — 500 liter', P2TXT[S.pred2]||'?', '500.000 cm³', S.pred2==='500000') +
    '<div class="kv"><span>Studi kasus selesai</span><b>'+casesDone()+' / 3</b></div>' +
    '<div class="kv"><span>Skor latihan</span><b>'+score+' / 3</b></div>';
  $('#finishCard').style.display = '';
  lab.gotoTahap(5);
  $('#finishCard').scrollIntoView({behavior:'smooth'});
});

/* ================= restore ================= */
(function restore(){
  // kunci langkah 2-3 tiap kasus sejak awal
  ['a','b','c'].forEach(c=>{
    for(let n=2;n<=NSTEPS;n++){
      const box = stepBox(c,n);
      box.classList.add('locked');
      box.querySelectorAll('input,button').forEach(i=>{ i.disabled = true; });
    }
  });
  // pulihkan langkah yang sudah benar
  ['a','b','c'].forEach(c=>{
    for(let n=1;n<=NSTEPS;n++){
      const id = c+n, box = stepBox(c,n);
      if(S['s_'+id]){
        box.classList.add('done'); box.classList.remove('locked');
        box.querySelectorAll('input,button').forEach(i=>{ i.disabled = true; });
        const fb = $('#fb-'+id);
        fb.className = 'fb show ok'; fb.textContent = '✓ Benar.';
        const cfg = STEPS[id];
        if(cfg.type==='radio' && S['v_'+id]){
          const r = document.querySelector('input[name="'+id+'"][value="'+S['v_'+id]+'"]');
          if(r){ r.checked = true; r.closest('.opt').classList.add('sel'); }
        } else if(cfg.type==='num' && S['v_'+id]!==undefined){
          $('#'+cfg.input).value = S['v_'+id];
        }
        if(n < NSTEPS){
          const nx = stepBox(c, n+1);
          nx.classList.remove('locked');
          nx.querySelectorAll('input,button').forEach(i=>{ i.disabled = false; });
        }
      } else break;
    }
    refreshCase(c);
  });
  // prediksi
  if(S.pred1){ const r=document.querySelector('input[name=p1][value="'+S.pred1+'"]'); if(r){r.checked=true;r.closest('.opt').classList.add('sel');} }
  if(S.pred2){ const r=document.querySelector('input[name=p2][value="'+S.pred2+'"]'); if(r){r.checked=true;r.closest('.opt').classList.add('sel');} }
  if(S.pred1&&S.pred2) lab.unlock(2);
  if(casesDone()>=1) lab.unlock(3);
  // latihan
  ['1','2'].forEach(n=>{
    if(S['lat'+n]!==undefined) $('#q'+n).value = S['lat'+n];
    if(S['correct'+n]){
      const fb = $('#fb-q'+n);
      fb.className='fb show ok'; fb.textContent='✓ Benar! Hebat.';
    }
  });
  if(S['correct3']){
    const r=document.querySelector('input[name=rq3][value="'+S['lat3']+'"]');
    if(r){ r.checked=true; r.closest('.opt').classList.add('sel'); }
    const fb = $('#fb-q3');
    fb.className='fb show ok'; fb.textContent='✓ Benar! Hebat.';
  }
  const score = ['1','2','3'].filter(i=>S['correct'+i]).length;
  $('#scoreChip').textContent = score+' / 3';
  $('#btnLatDone').disabled = score < 2;
  if(S.stars) $$('#stars span').forEach(x=>x.classList.toggle('on', +x.dataset.s<=S.stars));
  // deep-link kasus: #kasus=b
  const mk = /kasus=([abc])/.exec(location.hash||'');
  if(mk) setMode(mk[1]);
})();
})();
