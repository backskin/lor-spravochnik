/* ЛОР-справочник. Дизайн-система и сценарии — docs/ux.
   На каждой странице: шапка (название + поиск), содержимое, окно источника и окно «Спросить ИИ».
   Шапку и окна строит этот скрипт — так они одинаковые везде. */
(function(){
"use strict";
var L = window.LOR, B = document.body.dataset;
var $ = function(id){ return document.getElementById(id); };
var DOC = B.title ? {title:B.title, year:B.year, id:B.crid, rev:B.rev, group:B.group} : null;
var HOME = document.body.classList.contains("home");
var CRURL = "https://cr.minzdrav.gov.ru/view-cr/";

function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function low(s){ return String(s || "").toLowerCase().replace(/ё/g, "е"); }
function store(k, v){ try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){ return null; } }
function plural(n, a, b, c){ var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }
function secOf(el){ var s = el && el.closest("[data-sec]"); return s ? s.dataset.sec : ""; }
function row(href, title, sub, cls, attrs){
  return '<li><a class="row' + (cls ? " " + cls : "") + '" href="' + href + '"' + (attrs || "") + '><span class="rt">' + title
    + (sub ? '<span class="rs">' + sub + "</span>" : "") + "</span></a></li>";
}
/* «J30.1, J30.2, J30.3, J30.4» → «J30.1–J30.4» */
function codesShort(codes){
  var c = (codes || []).map(function(x){ return x[0]; });
  if(c.length <= 3) return c.join(", ");
  var rub = []; c.forEach(function(x){ var r = x.slice(0, 3); if(rub.indexOf(r) < 0) rub.push(r); });
  return rub.length === 1 ? c[0] + "–" + c[c.length - 1] : rub.join(", ");
}

/* ---------- тема: по системе, вручную — на главной ---------- */
var root = document.documentElement, th = store("lor-theme");
if(th) root.dataset.theme = th;
function isDark(){ return root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; }

/* ---------- шапка, окна, всплывающая подсказка ---------- */
document.body.insertAdjacentHTML("afterbegin",
  '<header class="top"><div class="top-in">'
  + '<button class="logo-btn" id="menuBtn" type="button" aria-label="Меню" aria-expanded="false" aria-controls="menu">'
  + '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path class="mb1" d="M4 5.75h17.5L19 8.25H4z"/><path class="mb2" d="M4 10.75h10.5L12 13.25H4z"/><path class="mb3" d="M4 15.75h14.5L16 18.25H4z"/></svg></button>'
  + (HOME ? "" : '<a class="home-btn" id="homeBtn" href="index.html" aria-label="Главная" title="Главная"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/></svg></a>')
  + '<div class="searchbox"><input id="q" type="search" placeholder="' + (B.page === "drugs" ? (innerWidth < 420 ? "Название или вещество" : "Торговое название или вещество") : (innerWidth < 420 ? "Поиск" : "Болезнь, код, препарат")) + '" autocomplete="off" enterkeyhint="search" aria-label="Поиск по справочнику"></div>'
  + '<button class="brand" id="qCancel" type="button" hidden style="color:var(--ac);font-weight:400">Отмена</button>'
  + '<button class="ask-btn" id="askBtn" type="button" aria-label="Спросить ИИ" title="Спросить ИИ"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.5-4.5"/></svg><span>ИИ</span></button>'
  + '</div></header><div class="offline-bar" role="status">Нет интернета — справочник работает, ссылки на сайты и ИИ недоступны</div>'
  + '<div class="results" id="results" hidden><div class="results-in" id="resIn"></div></div>');
document.body.insertAdjacentHTML("beforeend",
  '<div class="scrim" id="scrim"></div>'
  + '<aside class="sheet" id="pop" aria-label="Источник"></aside>'
  + '<aside class="sheet full" id="moreSheet" aria-label="Подробнее"></aside>'
  + '<aside class="sheet" id="ask" aria-label="Спросить ИИ"><div class="sheet-h"><h3>Спросить ИИ</h3><button class="x" data-close aria-label="Закрыть">✕</button></div>'
  + '<textarea id="askText" aria-label="Вопрос"></textarea>'
  + '<p class="fine" id="askCtx"></p>'
  + '<ul class="list" style="margin-top:12px">'
  + '<li id="shareLi" hidden><button class="row" id="goShare" type="button"><span class="rt">Поделиться вопросом<span class="rs">откроется меню телефона — выберите приложение DeepSeek или Алисы</span></span></button></li>'
  + '<li><a class="row ext" id="goYandex" href="https://alice.yandex.ru/" target="_blank" rel="noopener"><span class="rt">Спросить Алису<span class="rs">вопрос скопируется — в чате нажмите на поле и «Вставить»</span></span></a></li>'
  + '<li><a class="row ext" id="goDeepseek" href="https://chat.deepseek.com/" target="_blank" rel="noopener"><span class="rt">Спросить DeepSeek<span class="rs">вопрос скопируется — в чате нажмите на поле и «Вставить»</span></span></a></li>'
  + '<li><a class="row ext" id="goGoogle" href="https://www.google.com/" target="_blank" rel="noopener"><span class="rt">Спросить Google<span class="rs">вопрос подставится сам</span></span></a></li></ul>'
  + '<p class="fine" id="askMsg" hidden></p>'
  + '<p class="fine">Ответ ИИ — подсказка, а не источник. Проверяйте по тексту рекомендации.</p>'
  + '<details><summary>Полный текст, который получит ИИ</summary><pre id="promptPreview"></pre></details></aside>'
  + '<div class="toast" id="toast" role="status"></div>'
  + '<nav class="drawer" id="menu" aria-label="Меню" hidden>'
  + '<div class="drawer-h"><span class="drawer-t">ЛОР-справочник</span><button class="x" data-close aria-label="Закрыть">✕</button></div>'
  + '<ul class="list">'
  + row("index.html", "Главная", "все рекомендации по разделам")
  + row("preparaty.html", "Препараты и торговые названия", "Государственный реестр лекарственных средств")
  + row("mkb.html", "Коды МКБ-10 по разделам", "ЛОР-рубрики, нажатие копирует код")
  + row("slovar.html", "Словарь", "термины и сокращения из текста рекомендаций")
  + row("pdf/vse-razbory.pdf", "Все разборы одним PDF", "сохранить или распечатать", "ext", ' target="_blank" rel="noopener"')
  + row("kak-polzovatsya.html", "Как пользоваться", "")
  + row("istochniki.html", "Источники и проверка", "откуда данные и как они сверены")
  + "</ul>"
  + '<p class="drawer-l">Тема оформления</p><div class="tabs" id="themeSeg"><button data-th="light">Светлая</button><button data-th="">Как в системе</button><button data-th="dark">Тёмная</button></div>'
  + '<p class="drawer-l">Подсказки по справочнику</p><label class="switch"><span>Показывать подсказки при первом открытии</span><input type="checkbox" id="helpToggle"></label>'
  + '<ul class="list"><li><button class="row" id="helpReset"><span class="rt">Показать подсказки заново</span></button></li></ul>'
  + '<p class="drawer-l">Размер текста</p><div class="tabs" id="sizeSeg"><button data-k="0.9">Мельче</button><button data-k="1">Обычный</button><button data-k="1.12">Крупнее</button><button data-k="1.25">Крупный</button></div>'
  + "</nav>");

/* внизу каждой страницы, кроме главной (там свой блок) — откуда данные */
if(!HOME && B.page !== "sources"){
  var mainBox = document.querySelector(".page");
  if(mainBox) mainBox.insertAdjacentHTML("beforeend", '<footer class="site-foot"><a href="istochniki.html">Источники и проверка данных ›</a>'
    + "<span>Только клинические рекомендации Минздрава, ГРЛС и справочник МКБ-10. Не заменяет полный текст рекомендации.</span></footer>");
}
var scrim = $("scrim"), pop = $("pop"), ask = $("ask");
function openSheet(s){ closeSheets(); s.classList.add("on"); scrim.classList.add("on"); }
function closeSheets(){ pop.classList.remove("on"); ask.classList.remove("on"); $("moreSheet").classList.remove("on"); scrim.classList.remove("on"); closeMenu(); }
var menu = $("menu"), menuBtn = $("menuBtn");
function openMenu(){ menu.hidden = false; requestAnimationFrame(function(){ menu.classList.add("on"); }); scrim.classList.add("on"); menuBtn.setAttribute("aria-expanded", "true"); }
function closeMenu(){ if(!menu || menu.hidden) return; menu.classList.remove("on"); menuBtn.setAttribute("aria-expanded", "false"); setTimeout(function(){ if(!menu.classList.contains("on")) menu.hidden = true; }, 200); }
menuBtn.onclick = function(){ if(menu.classList.contains("on")){ closeMenu(); scrim.classList.remove("on"); } else openMenu(); };
/* тема: светлая / как в системе / тёмная */
function themeSync(){ var t = root.dataset.theme || ""; $("themeSeg").querySelectorAll("button").forEach(function(b){ b.type = "button"; b.setAttribute("aria-selected", String(b.dataset.th === t)); }); }
$("themeSeg").addEventListener("click", function(e){ var b = e.target.closest("button"); if(!b) return;
  if(b.dataset.th){ root.dataset.theme = b.dataset.th; store("lor-theme", b.dataset.th); } else { delete root.dataset.theme; store("lor-theme", ""); } themeSync(); });
themeSync();
/* размер текста: множитель шрифтовой шкалы, запоминается */
function sizeSync(){ var k = store("lor-k") || "1"; root.style.setProperty("--k", k); $("sizeSeg").querySelectorAll("button").forEach(function(b){ b.type = "button"; b.setAttribute("aria-selected", String(b.dataset.k === k)); }); }
$("sizeSeg").addEventListener("click", function(e){ var b = e.target.closest("button"); if(!b) return; store("lor-k", b.dataset.k); sizeSync(); });
sizeSync();
scrim.onclick = closeSheets;
document.addEventListener("click", function(e){ if(e.target.closest("[data-close]")) closeSheets(); });
function say(t){ var x = $("toast"); x.textContent = t; x.classList.add("on"); clearTimeout(say.t); say.t = setTimeout(function(){ x.classList.remove("on"); }, 1600); }
function copy(text, msg){
  try{ navigator.clipboard.writeText(text).then(function(){ say(msg); }, function(){ say(text); }); }catch(e){ say(text); }
}
function netState(){ document.body.classList.toggle("offline", !navigator.onLine); }
addEventListener("online", netState); addEventListener("offline", netState); netState();

/* ---------- главная: список болезней по разделам ---------- */
var home = $("home");
if(home){
  var h = "", core = L.groups.filter(function(g){ return !g.related; }), rel = L.groups.filter(function(g){ return g.related; });
  function fullRows(list){
    return list.map(function(d){ return row(CRURL + esc(d.cv), esc(d.name), "только текст на сайте Минздрава", "ext", ' target="_blank" rel="noopener"'); }).join("");
  }
  /* порядок по востребованности в амбулаторной ЛОР-практике; в разделе показываются первые пять */
  var TOP = {nose:["313_3","261_2","955_1","977_1","890_1","1082_1","913_1","956_1","756_1"],
             ear:["314_3","663_2","698_2","518_3","18_2","21_3","22_3","315_4","311_2","304_2","609_2"],
             throat:["306_3","683_2","662_2","664_2"], larynx:["309_2","352_3","305_2"],
             trauma:["815_1","812_1","813_1"], ari:["724_2","25_3","943_1"]};
  function rank(g, d){ var i = (TOP[g] || []).indexOf(d.cv); return i < 0 ? 99 : i; }
  function oneRow(d){ return d.href ? row(d.href, esc(d.name), esc(codesShort(d.codes))) : fullRows([d]); }
  core.forEach(function(g){
    var all = L.diseases.filter(function(d){ return d.g === g.id; }).sort(function(a, b){ return rank(g.id, a) - rank(g.id, b) || (b.href ? 1 : 0) - (a.href ? 1 : 0); });
    var top = all.slice(0, 5), more = all.slice(5).sort(function(a, b){ return (b.href ? 1 : 0) - (a.href ? 1 : 0); });
    h += '<section class="grp"><h2 class="gh">' + esc(g.title) + '</h2><ul class="list">' + top.map(oneRow).join("");
    if(more.length) h += '<li><button class="row toggle dim" aria-expanded="false"><span class="rt">Ещё ' + more.length + " "
      + plural(more.length, "рекомендация", "рекомендации", "рекомендаций") + "</span></button>"
      + '<ul class="list sublist" hidden>' + more.map(oneRow).join("") + "</ul></li>";
    h += "</ul></section>";
  });
  h += '<section class="grp"><h2 class="gh">Смежные специальности</h2><ul class="list">' + rel.map(function(g){
    var all = L.diseases.filter(function(d){ return d.g === g.id; });
    return '<li><button class="row toggle" aria-expanded="false"><span class="rt">' + esc(g.title.replace(/^Смежные: /, "").replace(/^./, function(c){ return c.toUpperCase(); }))
      + '<span class="rs">' + all.length + " " + plural(all.length, "рекомендация", "рекомендации", "рекомендаций") + "</span></span></button>"
      + '<ul class="list sublist" hidden>' + all.map(function(d){ return d.href ? row(d.href, esc(d.name), esc(codesShort(d.codes))) : row(CRURL + esc(d.cv), esc(d.name), "только текст на сайте Минздрава", "ext", ' target="_blank" rel="noopener"'); }).join("") + "</ul></li>";
  }).join("") + "</ul></section>";
  h = '<div class="grps">' + h + "</div>";
  home.innerHTML = h;
  home.addEventListener("click", function(e){
    var b = e.target.closest(".toggle"); if(!b) return;
    var open = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(open)); b.nextElementSibling.hidden = !open;
  });
  var ready = L.diseases.filter(function(d){ return d.href; }).length;
  $("stat").textContent = "Минздрав РФ, оториноларингология. Разобрано " + ready + " из " + L.diseases.length + " " + plural(L.diseases.length, "рекомендации", "рекомендаций", "рекомендаций")
    + ", список сверен " + L.updated.split("-").reverse().join(".");
}

/* ---------- страница болезни: разделы ---------- */
var tabbar = $("tabbar"), TABS = tabbar ? Array.prototype.map.call(tabbar.querySelectorAll("[data-tab]"), function(b){ return b.dataset.tab; }) : [];
function showTab(id){
  if(TABS.indexOf(id) < 0) return;
  tabbar.querySelectorAll("[data-tab]").forEach(function(b){ b.setAttribute("aria-selected", String(b.dataset.tab === id)); });
  document.querySelectorAll("[data-panel]").forEach(function(p){ p.hidden = p.dataset.panel !== id; });
  document.querySelectorAll(".toc [data-totab]").forEach(function(a){ a.classList.toggle("on", a.dataset.totab === id); });
  document.querySelectorAll(".toc [data-tosec]").forEach(function(a){ var s = $(a.dataset.tosec); a.hidden = !s || panelOf(s) !== id; });
}
function findEl(id){ return id ? (document.getElementById(id) || document.querySelector('[data-v="' + id.replace(/"/g, "") + '"]')) : null; }
function panelOf(el){ var p = el && el.closest("[data-panel]"); return p ? p.dataset.panel : null; }
/* «Подробнее»: редкие детали блока (класс more) открываются отдельным экраном, в карточке их нет */
function openMore(block, focus){
  var sh = $("moreSheet"), h2 = block.querySelector("h2");
  var h = '<div class="sheet-h"><h3>Подробнее' + (h2 ? ": " + esc(h2.textContent.trim().toLowerCase()) : "") + '</h3><button class="x" data-close aria-label="Закрыть">✕</button></div><div class="more-body body"></div>';
  sh.innerHTML = h;
  var box = sh.querySelector(".more-body");
  block.querySelectorAll(".more").forEach(function(m){
    if(m.parentNode.closest(".more")) return;
    var c = m.cloneNode(true); c.classList.remove("more");
    c.querySelectorAll("[id]").forEach(function(x){ x.removeAttribute("id"); }); c.removeAttribute("id");
    box.appendChild(c);
  });
  openSheet(sh); sh.scrollTop = 0;
  if(focus){ var v = focus.dataset && focus.dataset.v, t = v ? box.querySelector('[data-v="' + v + '"]') : null;
    if(t) requestAnimationFrame(function(){ t.scrollIntoView({block:"center"}); t.classList.remove("flash"); void t.offsetWidth; t.classList.add("flash"); }); }
}
function setOpen(block, open){ if(open) openMore(block); }
/* показать пункт: открыть его раздел, вкладку «взрослые/дети», скрытые подробности — и подсветить */
function reveal(el){
  if(!el) return;
  var pn = panelOf(el); if(pn) showTab(pn);
  if(el.closest(".more")){ openMore(el.closest(".block"), el.closest("[data-v]") || el); return; }
  var tp = el.closest(".tabpanel"); if(tp && tp.hidden){ var tb = document.querySelector('.tabs button[data-tab="' + tp.id.slice(4) + '"]'); if(tb) tb.click(); }
  requestAnimationFrame(function(){
    el.scrollIntoView({block:"center"});
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  });
}
if(tabbar){
  tabbar.addEventListener("click", function(e){
    var b = e.target.closest("[data-tab]"); if(!b) return;
    showTab(b.dataset.tab);
    try{ history.replaceState(null, "", "#" + b.dataset.tab); }catch(err){}
    /* новая вкладка открывается с начала: экран возвращается к заголовку разбора (панель вкладок «липкая», её offsetTop не годится) */
    var h1 = document.querySelector("main h1"), hd = document.querySelector(".top, header.app, body > header");
    var y = (h1 ? h1.getBoundingClientRect().top + window.scrollY : 0) - (hd ? hd.offsetHeight : 56) - 8;
    if(window.scrollY > y) window.scrollTo(0, Math.max(0, y));
  });
  var start = (location.hash || "#over").slice(1);
  if(TABS.indexOf(start) >= 0) showTab(start);
  else { var target = findEl(start); showTab(panelOf(target) || "over"); if(target) addEventListener("load", function(){ reveal(target); }); }
  addEventListener("hashchange", function(){ var id = location.hash.slice(1); if(TABS.indexOf(id) >= 0) showTab(id); else reveal(findEl(id)); });
}

/* оглавление: разделы и подзаголовки; на компьютере стоит слева, на телефоне не показывается */
if(tabbar){
  var toc = document.createElement("nav"); toc.className = "toc"; toc.setAttribute("aria-label", "Оглавление");
  var th = "";
  tabbar.querySelectorAll("[data-tab]").forEach(function(b){
    th += '<a class="toc-tab" href="#' + b.dataset.tab + '" data-totab="' + b.dataset.tab + '">' + esc(b.textContent) + "</a>";
    document.querySelectorAll('[data-panel="' + b.dataset.tab + '"]').forEach(function(sec){
      var h2 = sec.querySelector("h2"); if(!h2) return;
      if(!sec.id) sec.id = "s-" + Math.random().toString(36).slice(2, 7);
      th += '<a class="toc-sub" href="#' + sec.id + '" data-tosec="' + sec.id + '">' + esc(h2.textContent.trim()) + "</a>";
      sec.querySelectorAll(".body > h3, .body > .more > h3").forEach(function(h3){
        if(!h3.id) h3.id = "h-" + Math.random().toString(36).slice(2, 7);
        th += '<a class="toc-sub toc-h3" href="#' + h3.id + '" data-tosec="' + h3.id + '">' + esc(h3.firstChild ? h3.firstChild.textContent.trim() : h3.textContent.trim()) + "</a>";
      });
    });
  });
  toc.innerHTML = th;
  var mainEl = document.querySelector("main"); mainEl.parentNode.insertBefore(toc, mainEl);
  toc.addEventListener("click", function(e){
    var a = e.target.closest("a"); if(!a) return; e.preventDefault();
    if(a.dataset.totab){ showTab(a.dataset.totab); window.scrollTo(0, 0); try{ history.replaceState(null, "", "#" + a.dataset.totab); }catch(err){} }
    else { var sec = $(a.dataset.tosec); showTab(panelOf(sec)); if(sec.closest(".more")){ openMore(sec.closest(".block")); return; } sec.scrollIntoView({block:"start"}); }
  });  showTab(tabbar.querySelector('[aria-selected="true"]').dataset.tab);
}

/* источник по каждому блоку: номера разделов КР, из которых взяты пункты, и ссылка на официальный текст */
if(DOC){
  document.querySelectorAll("main section.block, main section.summary").forEach(function(sec){
    if(sec.classList.contains("b-src")) return;
    var secs = [];
    sec.querySelectorAll(".ev[data-loc]").forEach(function(ev){ var m = /^(\d+(?:\.\d+)*)/.exec(ev.dataset.loc || ""); if(m && secs.indexOf(m[1]) < 0) secs.push(m[1]); });
    if(!secs.length && window.LOR_VERIFY) sec.querySelectorAll("[data-v]").forEach(function(el){ var v = LOR_VERIFY.items[el.dataset.v]; var m = v && /^(\d+(?:\.\d+)*)/.exec(v.sec || ""); if(m && secs.indexOf(m[1]) < 0) secs.push(m[1]); });
    secs.sort(function(a, b){ var x = a.split(".").map(Number), y = b.split(".").map(Number); for(var i = 0; i < 4; i++){ if((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; });
    var line = document.createElement("p"); line.className = "src-of";
    line.innerHTML = "Источник: клинические рекомендации «" + esc(DOC.title) + "» (" + esc(DOC.year) + ")"
      + (secs.length ? ", " + (secs.length > 1 ? "разделы " : "раздел ") + esc(secs.slice(0, 6).join(", ")) + (secs.length > 6 ? " и др." : "") : "")
      + ' · <a href="' + CRURL + esc(DOC.id) + '" target="_blank" rel="noopener">текст на сайте Минздрава ↗</a>';
    sec.appendChild(line);
  });
}

/* подробности блока: одна кнопка в конце, открывает отдельный экран */
document.querySelectorAll(".block").forEach(function(block){
  var n = Array.prototype.filter.call(block.querySelectorAll(".more"), function(m){ return !m.parentNode.closest(".more"); }).length; if(!n) return;
  var p = block.querySelector(".more-hint");
  if(!p){ p = document.createElement("p"); p.className = "more-hint"; (block.querySelector(".body") || block).appendChild(p); }
  p.innerHTML = '<button class="more-btn" type="button">Подробнее <span class="chev" aria-hidden="true">›</span></button>';
  p.querySelector("button").onclick = function(){ openMore(block); };
});

/* «взрослые / дети» внутри блока */
document.querySelectorAll(".tabs button").forEach(function(b){
  b.type = "button";
  b.onclick = function(){
    b.parentNode.querySelectorAll("button").forEach(function(x){ x.setAttribute("aria-selected", String(x === b)); $("tab-" + x.dataset.tab).hidden = x !== b; });
  };
});

/* коды МКБ: нажатие копирует код */
document.addEventListener("click", function(e){
  var r = e.target.closest("[data-code]"); if(!r) return;
  copy(r.dataset.code, "Скопировано: " + r.dataset.code);
});

/* таблицы: подписи колонок для телефона (строка таблицы становится карточкой) */
document.querySelectorAll("main table").forEach(function(t){
  var hs = Array.prototype.map.call(t.querySelectorAll("thead th"), function(th){ return th.textContent.trim(); });
  if(!hs.length) return;
  if(!/^(Препарат|Признак|Показатель|Показание|Форма|Шкала|Баллы|Код|Ступень|Возраст|Шок|Степень|Основание|Заболевание|Возбудитель|Синдром|Стадия)/.test(hs[0])) t.classList.add("cmp");
  if(hs.length >= 3) t.classList.add("lbl");
  t.querySelectorAll("tbody tr").forEach(function(tr){
    Array.prototype.forEach.call(tr.cells, function(td, i){ if(!td.hasAttribute("colspan") && hs[i]) td.dataset.label = hs[i]; });
  });
});

/* ---------- вещество в тексте разбора: карточка ГРЛС в нижнем окне, оттуда — экран «Препараты» ---------- */
function openDrug(name, shown){
  var title = (shown || name).trim();
  pop.innerHTML = '<div class="sheet-h"><h3>' + esc(title.charAt(0).toUpperCase() + title.slice(1)) + '</h3><button class="x" data-close aria-label="Закрыть">✕</button></div><div class="tn-box">Загружаю реестр…</div>';
  openSheet(pop);
  GRLS.load().then(function(){
    var k = GRLS.findInn(name), box = pop.querySelector(".tn-box"); if(!box) return;
    box.innerHTML = k ? GRLS.card(k, 8) : "В действующих регистрациях ГРЛС это вещество не нашлось. Попробуйте поиск на странице «Препараты».";
    if(k) box.insertAdjacentHTML("afterend", '<ul class="list" style="margin-top:12px">' + row("preparaty.html#" + encodeURIComponent(k), "Открыть на экране «Препараты»", "все торговые названия, формы и дозировки, номера регистрационных удостоверений") + "</ul>");
  }, function(){ var box = pop.querySelector(".tn-box"); if(box) box.textContent = "Реестр не загрузился. Проверьте интернет."; });
}

/* ---------- торговые названия: название препарата в таблице раскрывает список ГРЛС под строкой ---------- */
if(window.GRLS) document.querySelectorAll("main table").forEach(function(t){
  var h = t.querySelector("thead th"); if(!h || !/^Препарат/.test(h.textContent.trim())) return;
  t.querySelectorAll("tbody tr").forEach(function(tr){
    var td = tr.cells[0]; if(!td || td.hasAttribute("colspan")) return;
    var first = td.firstChild; if(!first || first.nodeType !== 3) return;
    var name = first.textContent.trim(); if(!name) return;
    var s = document.createElement("span"); s.className = "drug"; s.setAttribute("role", "button"); s.tabIndex = 0;
    s.dataset.name = name; s.title = "Торговые названия"; s.textContent = first.textContent;
    td.replaceChild(s, first);
  });
});
document.addEventListener("click", function(e){
  var d = e.target.closest(".drug, .tn-more"); if(!d || !window.GRLS) return;
  e.preventDefault();
  if(d.classList.contains("tn-more")){ d.closest(".tn-box").innerHTML = GRLS.card(d.dataset.inn, 0); return; }
  var td = d.closest("td");
  if(!td){ openDrug(d.dataset.name, d.textContent); return; }
  var box = td.querySelector(".tn-box");
  if(box){ box.remove(); return; }
  box = document.createElement("div"); box.className = "tn-box"; box.textContent = "Загружаю реестр…"; td.appendChild(box);
  GRLS.load().then(function(){
    var k = GRLS.findInn(d.dataset.name);
    box.innerHTML = k ? GRLS.card(k, 8) : "В действующих регистрациях ГРЛС это вещество не нашлось. Попробуйте поиск на странице «Препараты».";
  }, function(){ box.textContent = "Реестр не загрузился. Проверьте интернет."; });
});

/* ---------- источник под пунктом: скрыт, включается в «Обзоре» ---------- */
var VER = window.LOR_VERIFY || null, TERMS = (VER && VER.terms) || {};
var UUR = {A:"сильная рекомендация", B:"условная рекомендация", C:"слабая рекомендация"};
var UDD_DIAG = {"1":"систематические обзоры исследований с контролем референсным методом или систематический обзор РКИ с метаанализом","2":"отдельные исследования с контролем референсным методом или отдельные РКИ; систематические обзоры исследований любого дизайна, кроме РКИ, с метаанализом","3":"исследования без последовательного контроля референсным методом или с зависимым референсным методом; нерандомизированные сравнительные, в т.ч. когортные","4":"несравнительные исследования, описание клинического случая","5":"только обоснование механизма действия или мнение экспертов"};
var UDD = {"1":"систематические обзоры или метаанализы РКИ","2":"отдельные РКИ или обзоры исследований иного дизайна","3":"нерандомизированные сравнительные исследования","4":"несравнительные исследования, описания серий случаев","5":"механизм действия или мнение экспертов"};
function vOf(el){ return el && VER && VER.items[el.dataset.v] || null; }
function shortSec(loc){ var m = /^(\d+(?:\.\d+)*)/.exec(loc || ""); return m ? "раздел " + m[1] : ""; }
(function(){
  var on = store("lor-src") === "1" || store("lor-lvl") === "1", t = $("srcToggle");
  document.body.classList.toggle("src-on", on);
  if(!t) return;
  t.checked = on;
  t.addEventListener("change", function(){ document.body.classList.toggle("src-on", t.checked); store("lor-src", t.checked ? "1" : "0"); store("lor-lvl", "0"); });
})();
if(DOC){
  document.querySelectorAll(".ev").forEach(function(ev){
    var v = vOf(ev.closest("[data-v]")), loc = shortSec(ev.dataset.loc || (v && v.sec));
    ev.type = "button";
    ev.textContent = [loc, ev.dataset.uur ? "УУР " + ev.dataset.uur + ", УДД " + ev.dataset.udd : ""].filter(Boolean).join(" · ") + " ›";
  });
}
function vstatHtml(el){
  var v = vOf(el); if(!VER) return "";
  var h = '<p class="vstat">' + (v ? "Сверено с PDF рубрикатора " + esc(VER.checked) + (v.s === "fix" ? ", при сверке текст исправлен" : "") : "Не сверено с PDF — проверьте по тексту КР") + "</p>";
  var cite = "<cite>КР " + esc(VER.cv) + (v && v.sec ? ", раздел " + esc(v.sec) : "") + (v && v.page ? ", страница " + v.page : "") + "</cite>";
  if(v && v.img) h += v.img.map(function(pg){ return '<figure class="vimg"><a href="img/' + esc(VER.cv) + "-p" + pg + '.jpg" target="_blank" rel="noopener"><img src="img/' + esc(VER.cv) + "-p" + pg + '.jpg" alt="Страница ' + pg + ' PDF" loading="lazy"></a><figcaption>Страница ' + pg + " PDF рекомендации</figcaption></figure>"; }).join("");
  else if(v && v.q) h += '<blockquote class="vquote">' + esc(v.q) + cite + "</blockquote>";
  if(v && v.note && !v.img) h += '<p class="vnote">' + esc(v.note) + "</p>";
  return h;
}
function textOf(host){
  var p = host && (host.querySelector(":scope > p") || host);
  if(!p) return "";
  var c = p.cloneNode(true); c.querySelectorAll(".ev, .tn-box").forEach(function(x){ x.remove(); });
  return c.textContent.replace(/\s+/g, " ").trim();
}
function openSource(host, ev){
  var v = vOf(host), loc = (ev && ev.dataset.loc) || (v && v.sec) || "";
  var h = '<div class="sheet-h"><h3>Источник</h3><button class="x" data-close aria-label="Закрыть">✕</button></div>'
    + '<div class="kv"><span>Рекомендация</span><span>«' + esc(DOC.title) + "», " + esc(DOC.year) + "</span></div>"
    + (loc ? '<div class="kv"><span>Где в тексте</span><span>' + esc(loc) + "</span></div>" : "");
  if(ev && ev.dataset.uur) h += '<div class="kv"><span>Уровень убедительности (УУР) ' + esc(ev.dataset.uur) + "</span><span>" + UUR[ev.dataset.uur] + "</span></div>"
    + '<div class="kv"><span>Уровень достоверности доказательств (УДД) ' + esc(ev.dataset.udd) + "</span><span>" + (ev.dataset.scale === "diag" ? UDD_DIAG : UDD)[ev.dataset.udd] + "</span></div>";
  h += vstatHtml(host) + '<ul class="list" style="margin-top:12px">'
    + row(CRURL + esc(DOC.id), "Текст рекомендации на сайте Минздрава", "", "ext", ' target="_blank" rel="noopener"')
    + '<li><button class="row" id="askFrom"><span class="rt">Спросить ИИ об этом пункте</span></button></li></ul>';
  pop.innerHTML = h; openSheet(pop);
  $("askFrom").onclick = function(){ openAsk("", textOf(host), secOf(host)); };
}
document.addEventListener("click", function(e){
  var ev = e.target.closest(".ev");
  if(ev && DOC){ e.preventDefault(); openSource(ev.closest("[data-v]"), ev); return; }
  var term = e.target.closest(".term");
  if(term && TERMS[term.dataset.t]){
    var d = TERMS[term.dataset.t], key = term.dataset.t;
    var sec = /^\d/.test(d.sec) ? "раздел " + d.sec : "«" + d.sec + "»";
    pop.innerHTML = '<div class="sheet-h"><h3>' + esc(d.t) + '</h3><button class="x" data-close aria-label="Закрыть">✕</button></div>'
      + '<p class="term-def">' + esc(d.q) + "</p>"
      + '<p class="vnote">Дословно из КР «' + esc(DOC ? DOC.title : VER.cv) + "», " + sec + ", страница " + d.page + ".</p>"
      + '<ul class="list" style="margin-top:12px">' + row("slovar.html#" + encodeURIComponent(key.replace(/^[ad]:/, "")), "Открыть в словаре", "все термины и сокращения рекомендаций") + "</ul>";
    openSheet(pop);
  }
});
document.querySelectorAll(".term").forEach(function(el){ if(!TERMS[el.dataset.t]) el.classList.remove("term"); });

/* журнал сверки — в блоке «Источник и актуальность» */
var vlog = $("vlog");
if(VER && vlog){
  var tot = 0, none = 0, fixes = [];
  document.querySelectorAll("[data-v]").forEach(function(el){ tot++; var v = vOf(el); if(!v) none++; else if(v.s === "fix") fixes.push({el:el, v:v}); });
  vlog.innerHTML = "<p>" + esc(VER.checked) + ": каждый пункт страницы сверен с PDF «" + esc(VER.pdf) + "» из рубрикатора Минздрава (" + VER.pages + " с.). Пунктов: " + tot + "."
    + (fixes.length ? " При сверке исправлено: " + fixes.length + "." : "") + (none ? " Не сверено: " + none + "." : "") + "</p>"
    + '<p class="vlog-how">Цитаты вырезаны из текста PDF программой: если фрагмента нет в документе, страница не собирается. Цитата к пункту — по нажатию на строку источника под ним.</p>'
    + (fixes.length ? "<details><summary>Что исправлено при сверке</summary><ul class=\"list\">" + fixes.map(function(f, i){
        return '<li><button class="row" data-fix="' + i + '"><span class="rt">' + esc(textOf(f.el).slice(0, 90)) + "…" + (f.v.note ? '<span class="rs">' + esc(f.v.note) + "</span>" : "") + "</span></button></li>";
      }).join("") + "</ul></details>" : "");
  vlog.addEventListener("click", function(e){ var b = e.target.closest("[data-fix]"); if(b) reveal(fixes[+b.dataset.fix].el); });
}

/* ---------- Спросить ИИ ---------- */
var ASK_EXAMPLES = [
"Какой антибиотик при остром синусите, если у пациента аллергия на пенициллин?",
"Через сколько дней ждать эффекта от антибиотика при остром синусите и что делать, если его нет?",
"Когда при остром синусите нужна КТ околоносовых пазух?",
"Можно ли назначать назальные глюкокортикоиды при остром синусите у ребёнка 6 лет?",
"Чем отличить вирусный риносинусит от бактериального на приёме?",
"Сколько дней можно применять сосудосуживающие капли и чем грозит долгий приём?",
"Какие показания к пункции верхнечелюстной пазухи по клиническим рекомендациям?",
"Когда при остром среднем отите у ребёнка можно не назначать антибиотик и наблюдать?",
"Какая доза амоксициллина при остром среднем отите у ребёнка?",
"Когда показан парацентез при остром среднем отите?",
"Какие ушные капли нельзя закапывать при перфорации барабанной перепонки?",
"Через какое время после острого среднего отита проверять слух и как?",
"Что делать, если после острого среднего отита сохраняется экссудат в барабанной полости?",
"Как по шкале McIsaac решить, назначать ли антибиотик при тонзиллофарингите?",
"Когда нужен экспресс-тест на стрептококк группы А при боли в горле?",
"Сколько дней длится курс антибиотика при стрептококковом тонзиллите?",
"Какой антибиотик при стрептококковом тонзиллите, если аллергия на бета-лактамы?",
"Какие показания к тонзиллэктомии при хроническом тонзиллите?",
"Как отличить паратонзиллярный абсцесс от паратонзиллита и когда вскрывать?",
"Какие ушные капли первым выбором при остром бактериальном наружном отите?",
"Когда при наружном отите нужны системные антибиотики?",
"Какие признаки злокачественного наружного отита и что обследовать?",
"Как лечить отомикоз и сколько длится курс?",
"Как удалить серную пробку и когда промывание противопоказано?",
"Какой назальный гормон можно ребёнку 3 лет с аллергическим ринитом?",
"Что назначить при аллергическом рините на 2-й ступени лечения?",
"Как оценить контроль аллергического ринита по визуальной аналоговой шкале?",
"Можно ли лечить аллергический ринит у беременной и какие препараты безопаснее?",
"Когда направлять пациента с аллергическим ринитом к аллергологу на АСИТ?",
"Нужно ли определять общий IgE при аллергическом рините?",
"Какой антигистаминный препарат можно ребёнку 1 года?",
"Как отличить медикаментозный ринит и как его лечить?",
"Какие показания к септопластике при искривлении перегородки носа?",
"Как остановить носовое кровотечение на приёме и когда госпитализировать?",
"Какая тактика при подозрении на перелом костей носа?",
"Когда при полипозном риносинусите показаны биологические препараты?",
"Какие препараты при обострении хронического синусита?",
"Какие показания к аденотомии у ребёнка?",
"Как лечить острый ларингит у взрослого и когда нужен голосовой покой?",
"Какие признаки стеноза гортани у ребёнка требуют срочной госпитализации?",
"Как вести внезапную сенсоневральную тугоухость в первые сутки?",
"Какие обследования при подозрении на болезнь Меньера?",
"Как провести пробу Дикса–Холлпайка и маневр Эпли при ДППГ?",
"Когда при снижении слуха нужна тимпанометрия, а когда аудиометрия?",
"Как читать тимпанограмму типа B и C?",
"Какие признаки отосклероза на аудиограмме?",
"Когда при мастоидите нужна операция?",
"Какие препараты при ОРВИ у взрослых действительно рекомендованы?",
"Чем опасна шейная лимфаденопатия и когда исключать опухоль?",
"Когда пациента с охриплостью нужно направить к онкологу?"
];
var askText = $("askText"), ctxFrag = "", ctxSec = "", example = "";
/* текст для ИИ: роль, требования к ответу и то, что справочник уже знает (рекомендация, коды МКБ, раздел, главное) */
function cut(t, n){ t = t.replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
/* текст пункта со вложенными списками: «Подпись: пункт; пункт; пункт» */
function flatText(el){
  var c = el.cloneNode(true);
  c.querySelectorAll(".ev, .tn-box").forEach(function(x){ x.remove(); });
  c.querySelectorAll(".enum-h").forEach(function(x){ x.insertAdjacentText("beforebegin", " "); x.insertAdjacentText("beforeend", ": "); });
  c.querySelectorAll("li").forEach(function(x){ x.insertAdjacentText("beforeend", " "); });
  c.querySelectorAll("ol, ul").forEach(function(x){ x.insertAdjacentText("beforebegin", " "); });
  return c.textContent.replace(/\s+/g, " ").replace(/:\s*:/g, ":").trim();
}
function pageContext(full){
  if(!DOC) return "";
  var d = L.diseases.filter(function(x){ return x.cv === DOC.id; })[0], lines = [];
  lines.push("Рекомендация, которую я сейчас читаю: «" + DOC.title + "», версия " + DOC.year + " года (рубрикатор Минздрава, " + DOC.id + ").");
  if(d && d.codes && d.codes.length) lines.push("Коды МКБ-10: " + d.codes.slice(0, 8).map(function(c){ return c[0] + " " + c[1]; }).join("; ") + (d.codes.length > 8 ? " и другие" : "") + ".");
  if(!full) return lines.join("\n");
  var tab = tabbar && tabbar.querySelector('[aria-selected="true"]');
  if(tab) lines.push("Раздел: «" + tab.textContent.trim() + "»" + (ctxSec && ctxSec !== tab.textContent.trim() ? ", блок «" + ctxSec + "»" : "") + ".");
  var sum = Array.prototype.map.call(document.querySelectorAll(".summary > ul > li"), function(li){ return "— " + cut(flatText(li), 300); });
  if(sum.length) lines.push("Основные положения этой рекомендации:\n" + sum.join("\n"));
  var other = L.diseases.filter(function(x){ return x.href && x.cv !== DOC.id; }).map(function(x){ return "«" + x.name + "» (" + x.cv + ")"; });
  if(other.length) lines.push("Другие действующие КР по ЛОР, которые тоже можно использовать: " + other.join(", ") + ".");
  return lines.join("\n");
}
var RULES = "Как отвечать:\n"
  + "— опирайся на любые действующие клинические рекомендации Минздрава РФ, относящиеся к вопросу, а не только на ту, что я читаю; если ответ есть в другой рекомендации, назови её;\n"
  + "— к каждому утверждению укажи рекомендацию, год её версии и раздел, для рекомендаций также уровень убедительности (УУР) и уровень достоверности доказательств (УДД);\n"
  + "— препараты называй по международному непатентованному названию, дозы давай так, как они указаны в рекомендации;\n"
  + "— если ни в одной российской рекомендации ответа нет, так и напиши и ничего не додумывай;\n"
  + "— зарубежные руководства (EPOS, AAO-HNS и другие) упоминай только отдельно, с пометкой, что это не российские рекомендации.";
function buildPrompt(short){
  var q = askText.value.trim() || example;
  var ask = q || "поясни этот пункт подробнее и проверь, соответствует ли он действующей версии рекомендации.";
  /* для Google — одна строка: адрес страницы с вопросом ограничен по длине */
  if(short) return "Ответь по действующим клиническим рекомендациям Минздрава РФ (любым, относящимся к вопросу), с указанием рекомендации, года и раздела; препараты по МНН; не додумывай. "
    + (DOC ? "Я читаю КР «" + DOC.title + "» (" + DOC.id + "). " : "") + (ctxFrag ? "Пункт: «" + cut(ctxFrag, 200) + "». " : "") + "Вопрос: " + ask;
  var p = "Я врач-оториноларинголог, работаю в России. Ответь на вопрос по действующим клиническим рекомендациям Минздрава РФ (cr.minzdrav.gov.ru).\n\n" + RULES;
  var ctx = pageContext(true);
  if(ctx) p += "\n\nКонтекст (это не ограничивает ответ):\n" + ctx;
  if(ctxFrag) p += "\n\nВопрос касается пункта: «" + cut(ctxFrag, 600) + "»";
  return p + "\n\nВопрос: " + ask;
}
function refreshAsk(){
  var p = buildPrompt();
  $("promptPreview").textContent = p;
  /* Google принимает вопрос в адресе страницы, а длина адреса ограничена — ему уходит короткий вариант */
  $("goGoogle").href = "https://www.google.com/search?udm=50&q=" + encodeURIComponent(buildPrompt(true));
  $("askCtx").textContent = ctxFrag ? "К вопросу приложен пункт: «" + (ctxFrag.length > 160 ? ctxFrag.slice(0, 160) + "…" : ctxFrag) + "»" : (DOC ? "ИИ попросим отвечать по рекомендации «" + DOC.title + "»." : "ИИ попросим отвечать только по клиническим рекомендациям Минздрава.");
}
function openAsk(q, frag, sec){
  ctxFrag = frag || ""; ctxSec = sec || ""; askText.value = q || "";
  /* пример вопроса: на странице болезни — про эту болезнь, на остальных — из общего списка */
  var pool = DOC ? [
    "Когда при заболевании «" + DOC.title + "» показана госпитализация?",
    "Какой антибиотик выбрать при заболевании «" + DOC.title + "», если у пациента аллергия на пенициллины?",
    "Как лечить заболевание «" + DOC.title + "» у беременной?",
    "Какие дозы препаратов рекомендованы детям при заболевании «" + DOC.title + "»?",
    "С чем нужно дифференцировать заболевание «" + DOC.title + "»?",
    "Какие обследования обязательны при заболевании «" + DOC.title + "»?"
  ] : ASK_EXAMPLES;
  example = ctxFrag ? "" : pool[Math.floor(Math.random() * pool.length)] || "";
  askText.placeholder = example ? "Например: " + example : "Ваш вопрос об этом пункте (можно оставить пустым)";
  $("askMsg").hidden = true; refreshAsk(); openSheet(ask);
}
askText.addEventListener("input", refreshAsk);
$("askBtn").onclick = function(){ openAsk("", "", ""); };
/* Алиса и DeepSeek не принимают вопрос в ссылке: копируем его, чат открывается в новой вкладке */
function copyAndGo(name){
  var m = $("askMsg"); m.hidden = false;
  m.textContent = "Вопрос скопирован. В чате " + name + " нажмите на поле ввода и выберите «Вставить».";
  try{ navigator.clipboard.writeText(buildPrompt()).catch(function(){ m.textContent = "Скопировать не получилось: откройте «Полный текст» ниже и скопируйте его вручную."; }); }catch(err){}
}
$("goYandex").addEventListener("click", function(){ copyAndGo("Алисы"); });
$("goDeepseek").addEventListener("click", function(){ copyAndGo("DeepSeek"); });
/* на телефоне вопрос уходит через системное меню «Поделиться» прямо в приложение ИИ, без копирования;
   на компьютере строку не показываем: там это меню бесполезно */
var MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && matchMedia("(pointer:coarse)").matches);
if(navigator.share && MOBILE){
  $("shareLi").hidden = false;
  $("goShare").addEventListener("click", function(){
    navigator.share({ text: buildPrompt() }).catch(function(err){
      if(err && err.name === "AbortError") return;
      copyAndGo("ИИ");
    });
  });
}

/* ---------- поиск: болезни, текст разборов, препараты (ГРЛС), коды МКБ ---------- */
var qIn = $("q"), res = $("results"), resIn = $("resIn"), cancel = $("qCancel");
var IDX = null, idxWait = null;
function loadIndex(){
  if(IDX) return Promise.resolve(IDX);
  if(!idxWait) idxWait = fetch("data/search.json").then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }).then(function(d){
    d.pages.forEach(function(p){ p.i.forEach(function(it){ it.l = low(it[3] + " " + it[2] + " " + p.t + " " + it[1]); }); });
    d.mkb.forEach(function(m){ m.l = low(m[0] + " " + m[1] + " " + m[2]); });
    IDX = d; return d;
  });
  return idxWait;
}
/* грубая морфология: «амоксициллина», «амоксициллином» → «амоксициллин» */
function stem(w){ return w.length > 6 ? w.slice(0, -2) : w.length > 4 ? w.slice(0, -1) : w; }
/* служебные слова не ищем; «ребёнок» и «дети» — одно и то же */
var STOP = {"у":1,"в":1,"во":1,"и":1,"при":1,"на":1,"с":1,"со":1,"для":1,"по":1,"от":1,"до":1,"к":1,"о":1,"об":1,"не":1,"или":1,"как":1,"что":1,"код":1,"коды":1,"кода":1,"мкб":1,"мкб-10":1};
var SYN = [["ребен", "дет", "детск"], ["взросл"]];
function words(q){
  return low(q).split(/[\s,.;:!?()«»"]+/).filter(function(w){ return w && !STOP[w]; }).map(function(w){
    var st = stem(w);
    for(var i = 0; i < SYN.length; i++) if(SYN[i].some(function(x){ return st.indexOf(x) === 0; })) return SYN[i];
    return [st];
  });
}
/* слово ищем с начала слова: «ларингит» не должен находиться внутри «оториноларинголог» */
function atWord(l, w){
  var i = l.indexOf(w);
  while(i > 0 && /[а-яa-z0-9]/.test(l.charAt(i - 1))) i = l.indexOf(w, i + 1);
  return i;
}
function has(l, ws){ return ws.every(function(alts){ return alts.some(function(w){ return atWord(l, w) >= 0; }); }); }
function mark(text, ws){
  var s = esc(text); ws = [].concat.apply([], ws);
  ws.forEach(function(w){ if(w.length > 1) s = s.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[а-яёa-z]*)", "gi"), "<mark>$1</mark>"); });
  return s;
}
function snippet(text, ws, n){
  var l = low(text), i = -1; n = n || 140;
  [].concat.apply([], ws).some(function(w){ i = l.indexOf(w); return i >= 0; });
  if(i < 0 || text.length <= n) return text.slice(0, n) + (text.length > n ? "…" : "");
  var from = Math.max(0, i - 40);
  return (from ? "…" : "") + text.slice(from, from + n) + (text.length > from + n ? "…" : "");
}
function textHits(ws){
  var out = [];
  if(!IDX) return out;
  IDX.pages.forEach(function(p){
    var n = 0;
    p.i.forEach(function(it){ if(n < 4 && has(it.l, ws)){ n++; out.push({p:p, it:it}); } });
  });
  /* сначала «Лечение», потом «Обзор», потом остальное — порядок страниц сохраняется */
  var rank = {"Лечение":0, "Обзор":1};
  /* выше всего — пункты со страницы болезни, в названии которой есть искомое слово */
  function score(x){ var t = low(x.p.t), own = ws.some(function(alts){ return alts.some(function(w){ return atWord(t, w) >= 0; }); });
    return (own ? 0 : 10) + (rank[x.it[1]] === undefined ? 2 : rank[x.it[1]]); }
  return out.map(function(x, i){ return [x, i]; }).sort(function(a, b){ return score(a[0]) - score(b[0]) || a[1] - b[1]; })
    .map(function(x){ return x[0]; }).slice(0, 24);
}
function render(){
  var q = qIn.value.trim();
  if(q.length < 2){ closeResults(); return; }
  var ws = words(q), h = "", total = 0;
  /* болезни */
  var dz = L.diseases.filter(function(d){ return has(low(d.name + " " + (d.age || "") + " " + (d.codes || []).map(function(c){ return c[0] + " " + c[1]; }).join(" ")), ws); })
    .sort(function(a, b){ return (b.href ? 1 : 0) - (a.href ? 1 : 0); }).slice(0, 8);
  if(dz.length){ total += dz.length; h += '<h2 class="gh">Заболевания</h2><ul class="list">' + dz.map(function(d){
    return d.href ? row(d.href, mark(d.name, ws), esc(codesShort(d.codes))) : row(CRURL + esc(d.cv), mark(d.name, ws), esc(codesShort(d.codes)) + " · только текст на сайте Минздрава", "ext", ' target="_blank" rel="noopener"');
  }).join("") + "</ul>"; }
  /* препараты из ГРЛС: вещество или торговое название */
  var drugWords = [];
  if(window.GRLS && GRLS.data && q.length >= 3){
    var r = GRLS.search(q), d = GRLS.data, seen = {}, rows = [];
    r.inn.slice(0, 3).forEach(function(k){ seen[k] = 1; rows.push(row("preparaty.html#" + encodeURIComponent(k), mark(d.inn[k].n, ws), d.inn[k].tn.length + " " + plural(d.inn[k].tn.length, "торговое название", "торговых названия", "торговых названий") + " в ГРЛС", "", ' data-drug="' + esc(k) + '"')); });
    r.tn.forEach(function(x){
      if(rows.length >= 5 || seen[x.inn]) return; seen[x.inn] = 1;
      rows.push(row("preparaty.html#" + encodeURIComponent(x.inn), mark(x.tn, ws), "действующее вещество — " + esc(d.inn[x.inn].n), "", ' data-drug="' + esc(x.inn) + '"'));
      drugWords.push(d.inn[x.inn].n);
    });
    if(rows.length){ total += rows.length; h += '<h2 class="gh">Лекарственные препараты (ГРЛС)</h2><ul class="list">' + rows.join("") + "</ul>"; }
  }
  /* текст разборов; если искали торговое название — ищем его действующее вещество */
  var hits = textHits(ws), via = "";
  if(!hits.length && drugWords.length){ var w2 = words(drugWords[0].split(/\s+/)[0]); hits = textHits(w2); if(hits.length){ via = drugWords[0]; ws = ws.concat(w2); } }
  if(hits.length){ total += hits.length; h += '<h2 class="gh">Найдено в разборах' + (via ? " по действующему веществу «" + esc(via) + "»" : "") + "</h2><ul class=\"list\">" + hits.map(function(x){
    return row(x.p.s + ".html#" + x.it[0], esc(x.p.t) + ", " + esc(x.it[1].toLowerCase()), (x.it[2] ? esc(x.it[2]) + ": " : "") + mark(snippet(x.it[3], ws), ws));
  }).join("") + "</ul>"; }
  /* коды МКБ */
  if(IDX){
    var ql = low(q), mk = IDX.mkb.filter(function(m){ return low(m[0]).indexOf(ql) === 0 || has(m.l, ws); }).slice(0, 8);
    if(mk.length){ total += mk.length; h += '<h2 class="gh">Коды МКБ-10</h2><div class="mkb-list">' + mk.map(function(m){
      return '<button class="mkb-row" data-code="' + esc(m[0].replace(/[*†]/g, "")) + '"><code>' + esc(m[0]) + "</code><span>" + mark(m[1], ws) + "</span></button>";
    }).join("") + "</div>"; }
  }
  if(!IDX) h += '<p class="empty">Загружаю текст разборов…</p>';
  else if(!total) h += '<p class="empty">По запросу «' + esc(q) + "» ничего не нашлось. Проверьте написание или напишите начало слова.</p>";
  h += '<ul class="list" style="margin-top:24px"><li><button class="row" id="askQ"><span class="rt">Спросить ИИ: «' + esc(q) + "»</span></button></li></ul>";
  resIn.innerHTML = h; res.hidden = false; cancel.hidden = false; $("askBtn").hidden = true; document.body.classList.add("searching");
  $("askQ").onclick = function(){ openAsk(q, "", ""); };
}
function closeResults(){ res.hidden = true; cancel.hidden = true; $("askBtn").hidden = false; document.body.classList.remove("searching"); }
var deb;
if(B.page !== "drugs"){
  qIn.addEventListener("input", function(){
    clearTimeout(deb); deb = setTimeout(render, 120);
    if(qIn.value.trim().length >= 2){
      loadIndex().then(render, function(){ IDX = {pages:[], mkb:[]}; render(); });
      if(window.GRLS && qIn.value.trim().length >= 3) GRLS.load().then(render, function(){});
    }
  });
  qIn.addEventListener("focus", function(){ if(qIn.value.trim().length >= 2) render(); });
  qIn.addEventListener("keydown", function(e){
    if(e.key === "Escape"){ qIn.value = ""; closeResults(); qIn.blur(); }
    if(e.key === "Enter"){ e.preventDefault(); var a = resIn.querySelector("a.row"); if(a) a.click(); }
  });
  cancel.onclick = function(){ qIn.value = ""; closeResults(); };
  /* переход к пункту на этой же странице — закрыть результаты и показать пункт */
  resIn.addEventListener("click", function(e){
    var a = e.target.closest("a.row"); if(!a) return;
    var m = /^([\w-]+)\.html#(.+)$/.exec(a.getAttribute("href"));
    if(m && DOC && location.pathname.split("/").pop() === m[1] + ".html"){ e.preventDefault(); closeResults(); qIn.blur(); try{ history.replaceState(null, "", "#" + m[2]); }catch(err){} reveal(findEl(m[2])); }
    else closeResults();
  });
}
document.addEventListener("keydown", function(e){
  var tag = document.activeElement.tagName;
  if((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "л")){ e.preventDefault(); qIn.focus(); qIn.select(); }
  if(e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA"){ e.preventDefault(); qIn.focus(); }
  if(e.key === "Escape") closeSheets();
});
})();


/* подсказки по справочнику: при первом открытии страницы подсвечивают элемент и объясняют его; показанные запоминаются */
(function(){
  function get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} try{ document.cookie = k + "=" + v + "; max-age=31536000; path=/; SameSite=Lax"; }catch(e){} }
  var off = get("lor-help-off") === "1";
  var seen = {}; try{ seen = JSON.parse(get("lor-help-seen") || "{}"); }catch(e){}
  var tg = document.getElementById("helpToggle"), rs = document.getElementById("helpReset");
  if(tg){ tg.checked = !off; tg.onchange = function(){ off = !tg.checked; set("lor-help-off", off ? "1" : "0"); }; }
  if(rs) rs.onclick = function(){ seen = {}; set("lor-help-seen", "{}"); off = false; set("lor-help-off", "0"); if(tg) tg.checked = true; location.reload(); };
  var B = document.body.dataset, home = document.body.classList.contains("home"), tabs = document.getElementById("tabbar");
  var wide = matchMedia("(min-width:1024px)").matches;
  var STEPS = [
    {id:"menu", sel:"#menuBtn", text:"Знак «ЛОР» открывает меню: главная страница, препараты, коды МКБ-10, все разборы в PDF, источники, тема оформления и размер текста."},
    {id:"home", sel:"#homeBtn", text:"Этой кнопкой можно сразу вернуться на главную страницу."},
    {id:"search", sel:".searchbox", text:"Поиск по всем разборам: название болезни, код МКБ-10, действующее вещество или торговое название. Можно писать несколько слов, например «синусит амоксициллин дети»."},
    {id:"ai", sel:"#askBtn", text:"Вопрос искусственному интеллекту — Алисе, DeepSeek или Google. Со страницы болезни к вопросу автоматически добавляются название рекомендации, коды МКБ-10 и основные положения."},
    {id:"groups", sel:"#home .grp", when:function(){ return home; }, text:"В каждом разделе показаны пять самых востребованных рекомендаций. Остальные открываются строкой «Ещё…» в конце раздела."},
    {id:"tabs", sel:"#tabbar", when:function(){ return !!tabs; }, text:"Разбор разделён на четыре вкладки: обзор, клиническая картина, диагностика и лечение."},
    {id:"toc", sel:".toc", when:function(){ return !!tabs && wide; }, text:"Оглавление текущей вкладки: нажатие переводит к нужному подразделу."},
    {id:"srcof", sel:"main .src-of", when:function(){ return !!tabs; }, text:"Под каждым разделом указано, из какой рекомендации и из каких её разделов взят текст, со ссылкой на официальный документ."},
    {id:"more", sel:".more-btn", when:function(){ return !!tabs; }, text:"Редкие подробности свёрнуты. Эта строка их раскрывает."},
    {id:"drug", sel:".drug", when:function(){ return !!tabs; }, text:"Название препарата нажимается: под ним откроются торговые названия из Государственного реестра лекарственных средств."},
    {id:"drugsearch", sel:".searchbox", when:function(){ return B.page === "drugs"; }, text:"На этой странице поиск ищет по реестру: торговое название покажет действующее вещество, а вещество — все торговые названия."}
  ];
  var queue = [], i = 0, box, ring;
  function visible(el){ var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest("[hidden]"); }
  function build(){
    STEPS.forEach(function(st){
      if(seen[st.id] || (st.when && !st.when())) return;
      if(st.id === "drugsearch" || (B.page === "drugs" && st.id === "search")){ if(st.id === "search") return; }
      var el = document.querySelector(st.sel); if(el && visible(el)) queue.push({st:st, el:el});
    });
  }
  function close(){ if(ring) ring.remove(); if(box) box.remove(); ring = box = null; document.removeEventListener("keydown", onKey); }
  function onKey(e){ if(e.key === "Escape") finish(); }
  function finish(){ queue.slice(i).forEach(function(q){ seen[q.st.id] = 1; }); set("lor-help-seen", JSON.stringify(seen)); close(); }
  function show(){
    if(i >= queue.length || off){ close(); return; }
    var q = queue[i]; seen[q.st.id] = 1; set("lor-help-seen", JSON.stringify(seen));
    var tall = q.el.getBoundingClientRect().height > innerHeight * 0.4;
    q.el.scrollIntoView({block: tall ? "start" : "center"});
    if(tall) window.scrollBy(0, -80);
    requestAnimationFrame(function(){
      var r = q.el.getBoundingClientRect(), pad = 6;
      if(!ring){ ring = document.createElement("div"); ring.className = "help-ring"; document.body.appendChild(ring); ring.onclick = next; }
      ring.style.cssText = "top:" + (r.top - pad) + "px;left:" + (r.left - pad) + "px;width:" + (r.width + pad * 2) + "px;height:" + (r.height + pad * 2) + "px";
      if(!box){ box = document.createElement("div"); box.className = "help-box"; box.setAttribute("role", "dialog"); document.body.appendChild(box); }
      box.innerHTML = '<p class="help-t"></p><div class="help-a"><label class="help-off"><input type="checkbox" id="helpOffNow"> Больше не показывать подсказки</label>'
        + '<button type="button" class="help-next">' + (i + 1 < queue.length ? "Далее" : "Понятно") + "</button></div>"
        + '<p class="help-n">' + (i + 1) + " из " + queue.length + "</p>";
      box.querySelector(".help-t").textContent = q.st.text;
      box.querySelector(".help-next").onclick = next;
      box.querySelector("#helpOffNow").onchange = function(){ off = this.checked; set("lor-help-off", off ? "1" : "0"); if(tg) tg.checked = !off; if(off) finish(); };
      var bw = Math.min(360, innerWidth - 32), below = r.bottom + 12 + 160 < innerHeight;
      box.style.width = bw + "px";
      box.style.left = Math.max(16, Math.min(r.left, innerWidth - bw - 16)) + "px";
      var r2 = q.el.getBoundingClientRect(), tall2 = r2.height > innerHeight * 0.4;
      box.style.top = (tall2 ? innerHeight - box.offsetHeight - 16 : below ? r.bottom + 12 : Math.max(16, r.top - 12 - box.offsetHeight)) + "px";
      box.querySelector(".help-next").focus();
    });
  }
  function next(){ i++; show(); }
  addEventListener("load", function(){
    if(off) return;
    setTimeout(function(){ build(); if(queue.length){ document.addEventListener("keydown", onKey); show(); } }, 500);
  });
  addEventListener("resize", function(){ if(box) show(); });
})();

/* на телефоне заголовки колонок скрыты: каждой ячейке — подпись её колонки, иначе «++» или «1 / 0 / −1» непонятно к чему относятся */
(function(){
  document.querySelectorAll("table").forEach(function(t){
    var ths = t.querySelectorAll("thead th"); if(ths.length < 2) return;
    var names = [].map.call(ths, function(th){ var c = th.cloneNode(true); c.querySelectorAll("small,sup").forEach(function(x){ x.remove(); }); return c.textContent.replace(/\s+/g, " ").trim(); });
    /* подпись, повторяющая заголовок таблицы, не нужна: «Показания к тонзиллэктомии:» под каждой строкой — шум */
    var wrap = t.closest(".tbl-wrap"), prev = wrap && wrap.previousElementSibling, title = "";
    if(prev && /^H[34]$/.test(prev.tagName)){ var c = prev.cloneNode(true); c.querySelectorAll("small").forEach(function(x){ x.remove(); }); title = c.textContent.replace(/\s+/g, " ").trim().toLowerCase(); }
    names = names.map(function(n){ return n.toLowerCase() === title ? "" : n; });
    t.classList.add("lbl");
    /* колонка из коротких значений («с 1 года», «с 18 лет») — не переносить: иначе «с 18 / лет» */
    var rows = t.querySelectorAll("tbody tr");
    names.forEach(function(_, ci){
      var cells = [].map.call(rows, function(tr){ return tr.children[ci]; }).filter(function(td){ return td && !td.hasAttribute("colspan"); });
      if(cells.length && cells.every(function(td){ return td.textContent.trim().length <= 12; })) cells.forEach(function(td){ td.classList.add("nw"); });
    });
    t.querySelectorAll("tbody tr").forEach(function(tr){
      var i = 0;
      [].forEach.call(tr.children, function(td){
        if(td.hasAttribute("colspan")){ i += +td.getAttribute("colspan"); return; }
        if(names[i] && !td.dataset.label) td.dataset.label = names[i];
        i++;
      });
    });
  });
})();
