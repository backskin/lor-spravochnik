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
    return '<li><button class="tn-row" type="button" aria-expanded="false" data-inn="' + esc(k) + '" data-tn="' + esc(low(t[0])) + '"><b>' + esc(t[0]) + "</b>"
      + (meta ? "<small>" + esc(meta) + "</small>" : "") + "</button></li>";
  }
  function card(k, limit){
    var e = data.inn[k], list = e.tn, n = list.length, cut = limit && n > limit ? list.slice(0, limit) : list;
    return '<div class="tn-card"><h5>' + esc(e.n) + ' <span class="tn-cnt">— ' + n + " " + plural(n, "торговое название", "торговых названия", "торговых названий") + "</span></h5>"
      + '<ul class="tn-list">' + cut.map(function(t){ return tnLine(t, k); }).join("") + "</ul>"
      + (cut.length < n ? '<button class="tn-more" type="button" data-inn="' + esc(k) + '">Показать все ' + n + "</button>" : "")
      + '<p class="tn-note">ГРЛС от ' + esc(data.date.split("-").reverse().join(".")) + ". Порядок — по числу действующих регистраций, это не данные о продажах. "
      + "Нажмите на название: откроются лекарственные формы и дозировки, номера регистрационных удостоверений и фармакотерапевтическая группа.</p></div>";
  }
  /* формы, дозировки и номера РУ — data/grls-forms.json.gz, распаковывается в браузере при первом раскрытии */
  var forms = null, fwait = null;
  function loadForms(){
    if(forms) return Promise.resolve(forms);
    if(!fwait) fwait = fetch("data/grls-forms.json.gz").then(function(r){
      if(!r.ok) throw new Error(r.status);
      if(!window.DecompressionStream) throw new Error("old");
      return new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).json();
    }).then(function(d){ forms = d; return d; }, function(e){ fwait = null; throw e; });
    return fwait;
  }
  function detail(k, tn){
    var x = forms && forms.inn[k] && forms.inn[k][tn];
    if(!x) return '<p class="tn-note">В выгрузке реестра подробностей нет.</p>';
    var h = "";
    if(x[0].length) h += '<p class="tn-h">Формы и дозировки</p><ul class="tn-forms">' + x[0].map(function(f){ return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>";
    if(x[2]) h += '<p class="tn-h">Фармакотерапевтическая группа</p><p>' + esc(x[2]) + "</p>";
    if(x[1].length) h += '<p class="tn-h">Регистрационные удостоверения</p><p class="tn-regs">' + x[1].map(function(r){ return '<button type="button" class="tn-reg" data-reg="' + esc(r) + '">' + esc(r) + "</button>"; }).join(" ") + "</p>"
      + '<p class="tn-note">Инструкция — в карточке препарата на сайте ГРЛС. Нажатие на номер копирует его; на сайте вставьте номер в поле «Номер РУ».</p>'
      + '<p><a class="tn-ext" href="https://grls.rosminzdrav.ru/GRLS.aspx" target="_blank" rel="noopener">Открыть ГРЛС ↗</a></p>';
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
