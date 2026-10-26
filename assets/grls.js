/* Торговые названия из ГРЛС (data/grls.json, собирается tools/build_grls.py из официальной выгрузки реестра).
   Данные грузятся только по требованию — страницы от них не тяжелеют. */
(function(){
  var data = null, wait = null;
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function low(s){ return String(s || "").toLowerCase().replace(/ё/g, "е"); }
  /* ключ действующего вещества: состав без порядка компонентов — «флутиказон+азеластин» = «азеластин+флутиказон» */
  function setKey(k){ return k.split("+").map(function(x){ return x.trim(); }).filter(Boolean).sort().join("+"); }
  function load(){
    if(data) return Promise.resolve(data);
    if(!wait) wait = fetch("data/grls.json").then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }).then(function(d){
      d.bySet = {}; d.all = [];
      Object.keys(d.inn).forEach(function(k){
        d.bySet[setKey(k)] = k;
        d.inn[k].tn.forEach(function(t){ d.all.push({tn:t[0], l:low(t[0]), inn:k, t:t}); });
      });
      data = d; return d;
    });
    return wait;
  }
  /* «Амоксициллин + клавулановая кислота внутрь³ (в начале еды)», «Азеластин и флутиказон», «Кромоглициевая кислота, спрей» */
  function keyOfName(name){
    var s = low(name).replace(/\(.*?\)/g, " ").replace(/[¹²³⁴⁵⁶]/g, "").replace(/,.*$/, "")
      .replace(/(^|\s)(внутрь|в\/в|в\/м|парентерально|спрей|капли|назальный|ушные|таблетки)(?=\s|$)/g, " ")
      .replace(/\s+и\s+|\s*\+\s*/g, "+").replace(/\s+/g, " ").trim();
    return setKey(s);
  }
  /* названия в КР, которые в ГРЛС записаны иначе */
  var ALIAS = {"флутиказона пропионат":"флутиказон"};
  function findInn(name){ var k = keyOfName(name); k = ALIAS[k] || k; return data && data.bySet[k] || null; }
  var RX = {otc:"без рецепта", rx:"по рецепту", mix:"есть формы и по рецепту, и без"};
  function tnLine(t, k){
    var meta = [RX[t[2]], t[3] ? "в перечне ЖНВЛП" : "", t[4] && t[4][0]].filter(Boolean).join(" · ");
    return '<li><button class="tn-row" type="button" aria-expanded="false" data-inn="' + esc(k) + '" data-tn="' + esc(low(t[0])) + '"><span class="tn-t"><b>' + esc(t[0]) + "</b>"
      + (meta ? "<small>" + esc(meta) + "</small>" : "") + "</span></button></li>";
  }
  function card(k, limit){
    var e = data.inn[k], list = e.tn, n = list.length, cut = limit && n > limit ? list.slice(0, limit) : list;
    return '<div class="tn-card"><h5><span class="tn-name">' + esc(e.n) + '</span> <span class="tn-cnt">' + n + " " + plural(n, "торговое название", "торговых названия", "торговых названий") + "</span></h5>"
      + '<ul class="tn-list">' + cut.map(function(t){ return tnLine(t, k); }).join("") + "</ul>"
      + (cut.length < n ? '<button class="tn-more" type="button" data-inn="' + esc(k) + '">Показать все ' + n + "</button>" : "")
      + '<p class="tn-note">ГРЛС от ' + esc(data.date.split("-").reverse().join(".")) + ". Порядок — по числу действующих регистраций, это не данные о продажах.</p></div>";
  }
  /* формы, дозировки и номера РУ — data/grls-forms.json.gz, распаковывается в браузере при первом раскрытии */
  var forms = null, fwait = null;
  function loadForms(){
    if(forms) return Promise.resolve(forms);
    if(!fwait) fwait = fetch("data/grls-forms.json.gz").then(function(r){
      if(!r.ok) throw new Error(r.status);
      if(!window.DecompressionStream) throw new Error("old");
      return new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).json();
    }).then(function(d){ forms = d; return loadInstr().then(function(){ return d; }); }, function(e){ fwait = null; throw e; });
    return fwait;
  }
  /* ссылки на карточки и инструкции ГРЛС по номеру РУ — data/grls-instr.json (tools/build_grls_instr.py); без файла просто не показываются */
  var instr = null;
  function loadInstr(){
    if(instr) return Promise.resolve(instr);
    var a = fetch("data/grls-instr.json").then(function(r){ return r.ok ? r.json() : {r:{}}; }, function(){ return {r:{}}; });
    /* состав со вспомогательными веществами — дословно из инструкции ГРЛС, по торговому названию */
    var b = fetch("data/grls-comp.json.gz").then(function(r){
      if(!r.ok || !window.DecompressionStream) return {c:{}};
      return new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).json();
    }, function(){ return {c:{}}; });
    return Promise.all([a, b]).then(function(x){ instr = x[0]; instr.comp = x[1].c || {}; return instr; });
  }
  function compBlock(k, tn){
    var c = instr && instr.comp[k + "|" + tn];
    if(!c) return "";
    var src = '<p class="tn-note">Из инструкции ГРЛС' + (c[1] ? " (" + esc(c[1]) + ")" : "") + "</p>";
    if(c[2] === "scan") return '<p class="tn-h">Состав</p><p class="tn-note">Инструкция в ГРЛС — скан, текст состава из неё не извлекается; откройте PDF по ссылке ниже.</p>';
    return '<p class="tn-h">Состав</p><div class="tn-comp">' + esc(c[3]) + "</div>" + src;
  }
  var GRLS = "https://grls.rosminzdrav.ru/";
  /* карточки ГРЛС адресуются по routingGuid; пока его нет — поиск реестра сразу по номеру удостоверения */
  function regSearch(r){
    return GRLS + "GRLS.aspx?RegNumber=" + encodeURIComponent(r) + "&MnnR=&lf=&TradeNmR=&OwnerName=&MnfOrg=&MnfOrgCountry=&isfs=0&regtype=1%2c2%2c3%2c4%2c5%2c6%2c7%2c8&pageSize=10&order=RegDate&orderType=desc&pageNum=1";
  }
  function regLine(r){
    var x = instr && instr.r[r];
    var h = '<li><button type="button" class="tn-reg" data-reg="' + esc(r) + '">' + esc(r) + "</button>";
    if(x){
      if(x[1]) h += ' <a class="tn-ext" href="' + esc(GRLS + x[1]) + '" target="_blank" rel="noopener">инструкция, PDF ↗</a>';
      h += ' <a class="tn-ext" href="' + esc(GRLS + "Grls_View_v2.aspx?routingGuid=" + x[0]) + '" target="_blank" rel="noopener">карточка ГРЛС ↗</a>';
    }
    return h + "</li>";
  }
  function detail(k, tn){
    var x = forms && forms.inn[k] && forms.inn[k][tn];
    if(!x) return '<p class="tn-note">В выгрузке реестра подробностей нет.</p>';
    var h = "";
    if(x[0].length) h += '<p class="tn-h">Формы и дозировки</p><ul class="tn-forms">' + x[0].map(function(f){ return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>";
    if(x[2]) h += '<p class="tn-h">Фармакотерапевтическая группа</p><p>' + esc(x[2]) + "</p>";
    h += compBlock(k, tn);
    if(x[1].length){
      var any = x[1].some(function(r){ return instr && instr.r[r]; });
      h += '<p class="tn-h">Регистрационные удостоверения и инструкции</p><ul class="tn-regs">' + x[1].map(regLine).join("") + "</ul>"
        + '<p class="tn-note">' + (any ? "Инструкции — официальные файлы ГРЛС (сайт открывается из России). " : "Инструкция — в карточке препарата на сайте ГРЛС. ")
        + "Нажатие на номер копирует его.</p>"
        + (any ? "" : '<p><a class="tn-ext" href="' + esc(regSearch(x[1][0])) + '" target="_blank" rel="noopener">Найти в ГРЛС по номеру ' + esc(x[1][0]) + " ↗</a></p>");
    }
    return h;
  }
  function plural(n, a, b, c){ var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }
  /* поиск в обе стороны: торговое название -> состав, вещество -> торговые названия */
  /* с начала слова: «отит» не должен находить «паротит» */
  function wpos(s, q){
    var i = s.indexOf(q);
    while(i > 0 && /[а-яa-z0-9]/.test(s.charAt(i - 1))) i = s.indexOf(q, i + 1);
    return i;
  }
  function search(q){
    q = low(q).trim(); if(q.length < 2) return {inn:[], tn:[]};
    var inns = Object.keys(data.inn).filter(function(k){ return wpos(k, q) >= 0; })
      .sort(function(a, b){ return (wpos(a, q) - wpos(b, q)) || (a.length - b.length); }).slice(0, 15);
    var tns = data.all.filter(function(x){ return wpos(x.l, q) >= 0; })
      .sort(function(a, b){ return (wpos(a.l, q) - wpos(b.l, q)) || (b.t[1] - a.t[1]) || a.l.localeCompare(b.l); }).slice(0, 40);
    return {inn:inns, tn:tns};
  }
  /* раскрытие торгового названия и копирование номера РУ — на любой странице, где есть карточка */
  document.addEventListener("click", function(e){
    var reg = e.target.closest(".tn-reg");
    if(reg){
      var done = function(){ reg.classList.add("copied"); setTimeout(function(){ reg.classList.remove("copied"); }, 1200); };
      if(navigator.clipboard) navigator.clipboard.writeText(reg.dataset.reg).then(done, function(){}); return;
    }
    var b = e.target.closest(".tn-row"); if(!b) return;
    var li = b.parentNode, box = li.querySelector(".tn-det");
    if(box){ box.remove(); b.setAttribute("aria-expanded", "false"); return; }
    box = document.createElement("div"); box.className = "tn-det"; box.textContent = "Загружаю…"; li.appendChild(box); b.setAttribute("aria-expanded", "true");
    loadForms().then(function(){ box.innerHTML = detail(b.dataset.inn, b.dataset.tn); },
      function(err){ box.textContent = err && err.message === "old" ? "Браузер не умеет распаковывать данные реестра — обновите его." : "Данные реестра не загрузились. Проверьте интернет."; });
  });
  window.GRLS = {load:load, findInn:findInn, card:card, search:search, esc:esc, loadForms:loadForms, get data(){ return data; }};
})();
