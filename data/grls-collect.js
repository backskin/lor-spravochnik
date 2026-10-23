/* Сбор ссылок на инструкции и состава из ГРЛС — выполняется на странице https://grls.rosminzdrav.ru/GRLS.aspx
   (расширение Claude in Chrome). Результаты сохраняются в localStorage, переживают перезагрузку вкладки. */
(function(){
  function save(){ try{ localStorage.setItem('kr_res', JSON.stringify(window.__res)); localStorage.setItem('kr_comp', JSON.stringify(window.__comp)); }catch(e){ window.__saveErr = String(e); } }
  try{ window.__res = JSON.parse(localStorage.getItem('kr_res') || '{}'); window.__comp = JSON.parse(localStorage.getItem('kr_comp') || '{}'); }catch(e){ window.__res = {}; window.__comp = {}; }
  window.__log = window.__log || [];
  clearInterval(window.__saver); window.__saver = setInterval(save, 5000);
  window.krSave = save;

  window.grlsSearch = async function(field, val, size){
    const f = document.forms[0], fd = new FormData(f);
    fd.set(field, val); fd.set('ctl00$plate$txtRecordOnPageCount', String(size || 10)); fd.set('ctl00$plate$bSeek', 'Найти');
    const t = await (await fetch(location.pathname, {method:'POST', body:new URLSearchParams(fd), credentials:'include'})).text();
    const doc = new DOMParser().parseFromString(t, 'text/html');
    return {rows: [...doc.querySelectorAll('tr[onclick]')].map(tr => ({g:(tr.getAttribute('onclick').match(/[0-9a-f-]{36}/) || [])[0], c:[...tr.cells].map(td => td.textContent.replace(/\s+/g, ' ').trim())}))};
  };
  async function instrOf(reg, g){
    const t = await (await fetch('/Grls_View_v2.aspx?routingGuid=' + g, {credentials:'include'})).text();
    const id = (t.match(/id="ctl00_plate_hfIdReg" value="(\d+)"/) || [])[1];
    if (!id) return {id:null, i:[]};
    const j = await (await fetch('/GRLS_View_V2.aspx/AddInstrImg', {method:'POST', headers:{'Content-Type':'application/json; charset=utf-8'}, credentials:'include', body:JSON.stringify({regNumber:reg, idReg:id})})).json();
    const d = JSON.parse(j.d), imgs = [];
    (d.Sources || []).forEach(s => (s.Instructions || []).forEach(ins => (ins.Images || []).forEach(im => imgs.push([im.Url, im.Label]))));
    return {id, i:imgs};
  }
  window.grlsRun = async function(batch){
    window.__busy = true;
    for (const it of batch){
      if (window.__stop) break;
      let rows;
      try { rows = (await grlsSearch('ctl00$plate$txtMNN', it.n, 500)).rows; } catch(e){ __log.push(['search-err', it.n]); continue; }
      const want = new Set(it.regs), hits = rows.filter(r => want.has(r.c[6]) && !__res[r.c[6]]);
      let i = 0;
      async function worker(){ while (i < hits.length){ const r = hits[i++], reg = r.c[6];
        try { const x = await instrOf(reg, r.g); __res[reg] = {g:r.g, id:x.id, k:it.k, tn:r.c[1], i:x.i}; } catch(e){ __res[reg] = {g:r.g, k:it.k, tn:r.c[1], err:String(e).slice(0, 60)}; } } }
      await Promise.all([worker(), worker(), worker()]);
      __log.push(['ok', it.n, rows.length, hits.length]);
    }
    save(); window.__busy = false;
  };
  /* добор по номеру РУ — для комбинаций, которые поиск по МНН не находит */
  window.grlsByReg = async function(items){
    window.__rbusy = true;
    for (const it of items) for (const reg of it.regs){
      if (window.__stop) break;
      if (__res[reg]) continue;
      try {
        const r = (await grlsSearch('ctl00$plate$txtRegNm', reg, 20)).rows.find(r => r.c[6] === reg);
        if (!r){ __res[reg] = {k:it.k, miss:true}; continue; }
        const x = await instrOf(reg, r.g); __res[reg] = {g:r.g, id:x.id, k:it.k, tn:r.c[1], i:x.i};
      } catch(e){ __res[reg] = {k:it.k, err:String(e).slice(0, 60)}; }
    }
    save(); window.__rbusy = false;
  };

  /* состав: без регулярных выражений с возвратами — текст PDF бывает с огромными пробелами */
  window.compOf = function(t){
    t = t.replace(/­/g, '').replace(/[ \t ]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n');
    let s = t.search(/(^|\n)(СОСТАВ|Состав)( на [^\n:]{1,40})? ?[:\n]/);
    if (s >= 0){
      const part = t.slice(s, s + 3000), e = part.slice(1).search(/\n(Описание|ОПИСАНИЕ|Лекарственная форма|ЛЕКАРСТВЕННАЯ ФОРМА|Фармакотерапевтическая группа|ФАРМАКОТЕРАПЕВТИЧЕСКАЯ ГРУППА|Характеристика|ХАРАКТЕРИСТИКА)[ :.\n]/);
      if (e > 0) return {kind:'instr', text: part.slice(0, e + 1).trim().slice(0, 1800)};
    }
    /* общая характеристика (ОХЛП): «2. Качественный и количественный состав» + «6.1. Перечень вспомогательных веществ» */
    s = t.search(/(^|\n)2\.? ?(КАЧЕСТВЕННЫЙ И КОЛИЧЕСТВЕННЫЙ СОСТАВ|Качественный и количественный состав)/);
    if (s >= 0){
      const part = t.slice(s, s + 2500), e = part.slice(1).search(/\n3\.? ?(ЛЕКАРСТВЕННАЯ ФОРМА|Лекарственная форма)/);
      if (e > 0){
        let text = part.slice(0, e + 1).trim();
        const s6 = t.search(/(^|\n)6\.1\.? ?(ПЕРЕЧЕНЬ ВСПОМОГАТЕЛЬНЫХ ВЕЩЕСТВ|Перечень вспомогательных веществ)/);
        if (s6 >= 0){ const p6 = t.slice(s6, s6 + 1500), e6 = p6.slice(1).search(/\n6\.2/); if (e6 > 0) text += '\n' + p6.slice(0, e6 + 1).trim(); }
        return {kind:'smpc', text: text.slice(0, 2400)};
      }
    }
    s = t.search(/Препарат[^\n]{0,80}содержит|Действующим(и)? веществ(ом|ами) (является|являются)/);
    if (s >= 0){
      const part = t.slice(s, s + 2200), e = part.search(/\n(Внешний вид|Держатель|Как выглядит|Описание)/);
      if (e > 0) return {kind:'leaflet', text: part.slice(0, e).trim().slice(0, 1800)};
    }
    /* листок-вкладыш ЕАЭС: «6. Содержимое упаковки и прочие сведения» */
    s = t.search(/(^|\n)6\.? ?(СОДЕРЖИМОЕ УПАКОВКИ|Содержимое упаковки)/);
    if (s >= 0){
      const part = t.slice(s, s + 2500), e = part.search(/\n(Внешний вид|Держатель|Как выглядит)/);
      if (e > 0) return {kind:'leaflet', text: part.slice(0, e).trim().slice(0, 1800)};
    }
    return null;
  };
  window.pdfText = async function(p, maxPages){
    const doc = await pdfjsLib.getDocument({url:'/' + p.replace(/\\/g, '/').replace(/^\//, ''), isEvalSupported:false}).promise;
    let t = '';
    for (let i = 1; i <= Math.min(doc.numPages, maxPages || 14); i++){
      const c = await (await doc.getPage(i)).getTextContent();
      t += c.items.map(x => x.str + (x.hasEOL ? '\n' : '')).join('') + '\n';
      await new Promise(r => setTimeout(r, 0));
    }
    doc.destroy(); return t;
  };
  window.compRun = async function(){
    window.__cbusy = true;
    const byTn = {};
    for (const [reg, x] of Object.entries(__res)){
      if (!x.i || !x.i.length) continue;
      const key = x.k + '|' + (x.tn || '').toLowerCase(), last = x.i[x.i.length - 1];
      const date = (last[0].match(/\d{4}\\\d{2}\\\d{2}/) || [''])[0];
      if (!byTn[key] || date > byTn[key].date) byTn[key] = {reg, path:last[0], label:last[1], date};
    }
    const todo = Object.entries(byTn).filter(([k]) => !__comp[k]);
    window.__ctotal = todo.length;
    for (const [key, v] of todo){
      if (window.__stop) break;
      try {
        const t = await pdfText(v.path, 14);
        if (t.replace(/\s/g, '').length < 200){ __comp[key] = {reg:v.reg, label:v.label, scan:true}; continue; }
        const c = compOf(t);
        __comp[key] = c ? {reg:v.reg, label:v.label, kind:c.kind, text:c.text} : {reg:v.reg, label:v.label, none:true};
      } catch(e){ __comp[key] = {reg:v.reg, err:String(e).slice(0, 60)}; }
    }
    save(); window.__cbusy = false;
  };
  window.krStat = function(){ const v = Object.values(__res), c = Object.values(__comp);
    return {busy:!!window.__busy, rbusy:!!window.__rbusy, cbusy:!!window.__cbusy, log:__log.length, res:v.length, withInstr:v.filter(x => x.i && x.i.length).length, miss:v.filter(x => x.miss).length, err:v.filter(x => x.err).length,
      ctotal:window.__ctotal, comp:c.length, text:c.filter(x => x.text).length, scan:c.filter(x => x.scan).length, none:c.filter(x => x.none).length, cerr:c.filter(x => x.err).length, saveErr:window.__saveErr}; };
})();
'collector ready';
