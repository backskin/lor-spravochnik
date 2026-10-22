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
  function tnLine(t){
    var meta = [RX[t[2]], t[3] ? "в перечне ЖНВЛП" : "", t[4] && t[4][0]].filter(Boolean).join(" · ");
    return '<li><b>' + esc(t[0]) + "</b>" + (meta ? "<small>" + esc(meta) + "</small>" : "") + "</li>";
  }
  function card(k, limit){
    var e = data.inn[k], list = e.tn, n = list.length, cut = limit && n > limit ? list.slice(0, limit) : list;
    return '<div class="tn-card"><h5>' + esc(e.n) + ' <span class="tn-cnt">— ' + n + " " + plural(n, "торговое название", "торговых названия", "торговых названий") + "</span></h5>"
      + '<ul class="tn-list">' + cut.map(tnLine).join("") + "</ul>"
      + (cut.length < n ? '<button class="tn-more" type="button" data-inn="' + esc(k) + '">Показать все ' + n + "</button>" : "")
      + '<p class="tn-note">ГРЛС от ' + esc(data.date.split("-").reverse().join(".")) + ". Порядок — по числу действующих регистраций, это не данные о продажах. "
      + "В выгрузке реестра нет лекарственной формы: в списке могут быть и кремы, и спреи, и таблетки с этим веществом — форму проверяйте в инструкции.</p></div>";
  }
  function plural(n, a, b, c){ var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }
  /* поиск в обе стороны: торговое название -> состав, вещество -> торговые названия */
  function search(q){
    q = low(q).trim(); if(q.length < 2) return {inn:[], tn:[]};
    var inns = Object.keys(data.inn).filter(function(k){ return k.indexOf(q) >= 0; })
      .sort(function(a, b){ return (a.indexOf(q) - b.indexOf(q)) || (a.length - b.length); }).slice(0, 15);
    var tns = data.all.filter(function(x){ return x.l.indexOf(q) >= 0; })
      .sort(function(a, b){ return (a.l.indexOf(q) - b.l.indexOf(q)) || (b.t[1] - a.t[1]) || a.l.localeCompare(b.l); }).slice(0, 40);
    return {inn:inns, tn:tns};
  }
  window.GRLS = {load:load, findInn:findInn, card:card, search:search, esc:esc, get data(){ return data; }};
})();
