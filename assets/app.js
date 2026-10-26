/* ЛОР-справочник. Дизайн-система и сценарии — docs/ux.
   Шапку строит assets/shell.js (первым тегом в <body>), окна и меню — этот скрипт, один раз.
   Переход между экранами справочника — без перезагрузки: подменяется только содержимое под шапкой (go() ниже),
   а всё, что относится к содержимому экрана, оживляет initPage(). Шапка, поиск, меню и окна не перерисовываются. */
(function(){
"use strict";
var L = window.LOR, B = document.body.dataset;
var $ = function(id){ return document.getElementById(id); };
var DOC = null, HOME = false, VER = null, TERMS = {}, tabbar = null, TABS = [], home = null, vlog = null, fixes = [];
/* B — живой dataset <body>: при переходе маршрутизатор переносит атрибуты нового экрана на тот же <body> */
function readPage(){
  DOC = B.title ? {title:B.title, year:B.year, id:B.crid, rev:B.rev, group:B.group} : null;
  HOME = document.body.classList.contains("home");
  VER = window.LOR_VERIFY || null; TERMS = (VER && VER.terms) || {};
}
var CRURL = "https://cr.minzdrav.gov.ru/view-cr/";
/* версия сайта (?v= у скриптов, ставит tools/build_site.py) — к ссылке на общий PDF, чтобы не открылась старая копия */
var SITEV = (((document.querySelector('script[src*="assets/app.js"]') || {}).src || "").split("?v=")[1] || ""); SITEV = SITEV ? "?v=" + SITEV : "";

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
/* шапку строит assets/shell.js (первым тегом в <body>) */

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
  + '<div class="drawer-top"><div class="drawer-brand"><span class="drawer-t">ЛОР-справочник</span><span class="drawer-sub">Клинические рекомендации Минздрава РФ</span></div><button class="x drawer-x" type="button" data-close aria-label="Закрыть меню">✕</button></div>'
  + '<ul class="list drawer-nav">'
  + row("index.html", "Главная", "все рекомендации по разделам")
  + row("uchebnik.html", "Учебник", "20 глав · анатомия, клиника и операции")
  + row("preparaty.html", "Препараты и торговые названия", "показания, противопоказания и реестр ГРЛС")
  + row("mkb.html", "Коды МКБ-10 по разделам", "ЛОР-рубрики, нажатие копирует код")
  + row("slovar.html", "Словарь", "термины и сокращения из текста рекомендаций")
  + row("pdf/vse-razbory.pdf" + SITEV, "Все разборы одним PDF", "сохранить или распечатать", "ext", ' target="_blank" rel="noopener"')
  + row("kak-polzovatsya.html", "Как пользоваться", "краткая справка по возможностям")
  + row("istochniki.html", "Источники и проверка", "откуда данные и как они сверены")
  + "</ul>"
  + '<div class="drawer-settings">'
  + '<div class="d-sec"><div class="d-sec-h"><span>Размер текста</span><span class="tsize-val" id="sizeVal">100%</span></div>'
  + '<div class="tsize-row">'
  + '<button class="tsize-b" id="sizeDown" type="button" aria-label="Уменьшить шрифт"><span class="tsize-aSm">А−</span><small>Мельче</small></button>'
  + '<input type="range" id="sizeRange" min="0.7" max="1.3" step="0.05" aria-label="Размер текста">'
  + '<button class="tsize-b" id="sizeUp" type="button" aria-label="Увеличить шрифт"><span class="tsize-aLg">А+</span><small>Крупнее</small></button>'
  + '</div></div>'
  + '<div class="d-sec"><div class="d-sec-h"><span>Тема оформления</span></div>'
  + '<div class="themes" id="themeSeg" role="group" aria-label="Тема оформления">'
  + '<button data-th="light"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg><span>Светлая</span></button>'
  + '<button data-th=""><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor"/></svg><span>Системная</span></button>'
  + '<button data-th="dark"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/></svg><span>Тёмная</span></button>'
  + '</div></div>'
  + '<div class="d-sec"><div class="d-sec-h"><span>Интерфейс и подсказки</span></div>'
  + '<label class="switch"><span>Плавные анимации интерфейса</span><input type="checkbox" id="animToggle" checked></label>'
  + '<label class="switch"><span>Показывать подсказки при первом открытии</span><input type="checkbox" id="helpToggle"></label>'
  + '<ul class="list drawer-reset-list"><li><button class="row" id="helpReset" type="button"><span class="rt">Показать подсказки заново</span></button></li></ul>'
  + '</div></div>'
  + "</nav>");

var scrim = $("scrim"), pop = $("pop"), ask = $("ask");
/* открытая шторка: страница под ней не прокручивается и не перезагружается жестом «потянуть вниз» (Chrome) */
function openSheet(s){ closeSheets(); s.classList.add("on"); scrim.classList.add("on"); root.classList.add("sheet-lock"); }
function closeSheets(){ pop.classList.remove("on"); ask.classList.remove("on"); $("askBtn").setAttribute("aria-expanded", "false"); $("moreSheet").classList.remove("on"); scrim.classList.remove("on"); root.classList.remove("sheet-lock"); closeMenu(); }
var menu = $("menu"), menuBtn = $("menuBtn");
/* пока меню открыто, страница под ним не прокручивается */
function lockPage(on){ root.classList.toggle("menu-lock", on); }
function openMenu(){ lockPage(true); menu.hidden = false; requestAnimationFrame(function(){ menu.classList.add("on"); }); scrim.classList.add("on"); menuBtn.setAttribute("aria-expanded", "true"); }
function closeMenu(){ if(!menu || menu.hidden) return; lockPage(false); menu.classList.remove("on"); menuBtn.setAttribute("aria-expanded", "false"); setTimeout(function(){ if(!menu.classList.contains("on")) menu.hidden = true; }, root.dataset.anim === "off" ? 0 : 200); }
menuBtn.onclick = function(){ if(menu.classList.contains("on")){ closeMenu(); scrim.classList.remove("on"); } else openMenu(); };
/* тема: светлая / как в системе / тёмная */
function themeSync(){ var t = root.dataset.theme || ""; $("themeSeg").querySelectorAll("button").forEach(function(b){ b.type = "button"; b.setAttribute("aria-selected", String(b.dataset.th === t)); }); }
$("themeSeg").addEventListener("click", function(e){ var b = e.target.closest("button"); if(!b) return;
  function apply(){ if(b.dataset.th){ root.dataset.theme = b.dataset.th; store("lor-theme", b.dataset.th); } else { delete root.dataset.theme; store("lor-theme", ""); } themeSync(); }
  /* смена темы — мягким перетеканием, где браузер это умеет */
  /* при открытом меню — без перетекания: снимок страницы рисовал шапку поверх меню (баг на телефоне 24.10.2026) */
  if(document.startViewTransition && !menu.classList.contains("on") && root.dataset.anim !== "off" && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(apply); else apply(); });
themeSync();
/* шторка выезжает снизу — и закрывается свайпом вниз (когда её содержимое прокручено к началу) */
document.querySelectorAll(".sheet").forEach(function(sh){
  var y0 = null, dy = 0;
  sh.addEventListener("touchstart", function(e){ y0 = sh.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; sh.style.transition = "none"; }, {passive: true});
  sh.addEventListener("touchmove", function(e){ if(y0 === null) return; dy = e.touches[0].clientY - y0;
    if(dy > 0){ sh.style.transform = "translateY(" + dy + "px)"; if(e.cancelable) e.preventDefault(); } else { y0 = null; sh.style.transform = ""; } }, {passive: false});
  sh.addEventListener("touchend", function(){ sh.style.transition = ""; sh.style.transform = ""; if(y0 !== null && dy > 80) closeSheets(); y0 = null; });
});
/* размер текста: плавный множитель шрифтовой шкалы от 0,7 до 1,3 — обычный ровно посередине, мельче нужнее, чем крупнее; применяется сразу и запоминается */
var sizeRange = $("sizeRange"), sizeVal = $("sizeVal");
function setK(k){ k = Math.min(1.3, Math.max(0.7, Math.round(k * 20) / 20)); root.style.setProperty("--k", k); sizeRange.value = k; if(sizeVal) sizeVal.textContent = Math.round(k * 100) + "%"; store("lor-k", String(k)); }
sizeRange.addEventListener("input", function(){ setK(+sizeRange.value); });
$("sizeDown").onclick = function(){ setK(+sizeRange.value - 0.05); };
$("sizeUp").onclick = function(){ setK(+sizeRange.value + 0.05); };
(function(){ var k = Math.min(1.3, Math.max(0.7, +(store("lor-k") || 1))); root.style.setProperty("--k", k); sizeRange.value = k; if(sizeVal) sizeVal.textContent = Math.round(k * 100) + "%"; })();
/* переключатель плавных анимаций интерфейса */
(function(){
  var animTg = $("animToggle");
  if(!animTg) return;
  var isOff = store("lor-anim") === "off";
  if(isOff) root.dataset.anim = "off"; else delete root.dataset.anim;
  animTg.checked = !isOff;
  animTg.addEventListener("change", function(){
    if(animTg.checked){ delete root.dataset.anim; store("lor-anim", "on"); }
    else { root.dataset.anim = "off"; store("lor-anim", "off"); }
  });
})();
scrim.onclick = closeSheets;
document.addEventListener("click", function(e){ if(e.target.closest("[data-close]")) closeSheets(); });
function say(t){ var x = $("toast"); x.textContent = t; x.classList.add("on"); clearTimeout(say.t); say.t = setTimeout(function(){ x.classList.remove("on"); }, 1600); }
function copy(text, msg){
  try{ navigator.clipboard.writeText(text).then(function(){ say(msg); }, function(){ say(text); }); }catch(e){ say(text); }
}
function netState(){ document.body.classList.toggle("offline", !navigator.onLine); }
addEventListener("online", netState); addEventListener("offline", netState); netState();


/* ---------- страница болезни: разделы ---------- */
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





addEventListener("hashchange", function(){ if(!tabbar) return; var id = location.hash.slice(1); if(TABS.indexOf(id) >= 0) showTab(id); else reveal(findEl(id)); });

/* коды МКБ: нажатие копирует код */
document.addEventListener("click", function(e){
  var r = e.target.closest("[data-code]"); if(!r) return;
  copy(r.dataset.code, "Скопировано: " + r.dataset.code);
});


/* ---------- вещество в тексте разбора: карточка ГРЛС в нижнем окне, оттуда — экран «Препараты» ---------- */
/* страница словаря для термина: каждая буква — своя страница, латиница — одна (tools/build_glossary.py) */
var GL_TR = {"а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"zh","з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"ts","ч":"ch","ш":"sh","щ":"sch","ъ":"tvz","ы":"yy","ь":"mz","э":"ee","ю":"yu","я":"ya"};
function glossaryHref(t){
  var ch = t.charAt(0).toLowerCase(), f = GL_TR[ch] ? "slovar-" + GL_TR[ch] : (/[a-z]/.test(ch) ? "slovar-lat" : "slovar-other");
  return f + ".html#" + encodeURIComponent(t);
}
function openDrug(name, shown, offl){
  var title = (shown || name).trim();
  pop.innerHTML = '<div class="sheet-h"><h3>' + esc(title.charAt(0).toUpperCase() + title.slice(1)) + '</h3><button class="x" data-close aria-label="Закрыть">✕</button></div>'
    /* пометка КР «#» (на странице — «off-label»): объяснение прямо в карточке препарата */
    + (offl ? '<p class="offl-note"><b>Off-label</b> — в этой рекомендации препарат применяется вне показаний инструкции. По тексту КР такое назначение «осуществляется по решению врачебной комиссии при условии подписанного информированного добровольного согласия».</p>' : '')
    + '<div class="tn-box">Загружаю реестр…</div>';
  openSheet(pop);
  GRLS.load().then(function(){
    var k = GRLS.findInn(name), box = pop.querySelector(".tn-box"); if(!box) return;
    box.innerHTML = k ? GRLS.card(k, 8) : "В действующих регистрациях ГРЛС это вещество не нашлось. Попробуйте поиск на странице «Препараты».";
    if(k) box.insertAdjacentHTML("afterend", '<ul class="list" style="margin-top:12px">' + row("preparaty.html#" + encodeURIComponent(k), "Открыть на экране «Препараты»", "все торговые названия, формы и дозировки, номера регистрационных удостоверений") + "</ul>");
  }, function(){ var box = pop.querySelector(".tn-box"); if(box) box.textContent = "Реестр не загрузился. Проверьте интернет."; });
}

document.addEventListener("click", function(e){
  var d = e.target.closest(".drug, .tn-more"); if(!d || !window.GRLS) return;
  e.preventDefault();
  if(d.classList.contains("tn-more")){ d.closest(".tn-box").innerHTML = GRLS.card(d.dataset.inn, 0); return; }
  /* везде одинаково — в тексте и в таблицах: карточка торговых названий в нижнем окне, таблица не раздвигается */
  var nx = d.nextElementSibling;
  openDrug(d.dataset.name, d.textContent, !!(nx && nx.classList.contains("offl")));
});

/* ---------- источник под пунктом: скрыт, включается в «Обзоре» ---------- */
var UUR = {A:"сильная рекомендация", B:"условная рекомендация", C:"слабая рекомендация"};
var UDD_DIAG = {"1":"систематические обзоры исследований с контролем референсным методом или систематический обзор РКИ с метаанализом","2":"отдельные исследования с контролем референсным методом или отдельные РКИ; систематические обзоры исследований любого дизайна, кроме РКИ, с метаанализом","3":"исследования без последовательного контроля референсным методом или с зависимым референсным методом; нерандомизированные сравнительные, в т.ч. когортные","4":"несравнительные исследования, описание клинического случая","5":"только обоснование механизма действия или мнение экспертов"};
var UDD = {"1":"систематические обзоры или метаанализы РКИ","2":"отдельные РКИ или обзоры исследований иного дизайна","3":"нерандомизированные сравнительные исследования","4":"несравнительные исследования, описания серий случаев","5":"механизм действия или мнение экспертов"};
function vOf(el){ return el && VER && VER.items[el.dataset.v] || null; }
function shortSec(loc){ var m = /^(\d+(?:\.\d+)*)/.exec(loc || ""); return m ? "раздел " + m[1] : ""; }
function vstatHtml(el){
  var v = vOf(el); if(!VER) return "";
  var h = '<p class="vstat">' + (v ? "Сверено с PDF рубрикатора " + esc(VER.checked) + (v.s === "fix" ? ", при сверке текст исправлен" : "") : "Не сверено с PDF — проверьте по тексту КР") + "</p>";
  var cite = "<cite>КР " + esc(VER.cv) + (v && v.sec ? ", раздел " + esc(v.sec) : "") + (v && v.page ? ", страница " + v.page : "") + "</cite>";
  if(v && v.img) h += v.img.map(function(pg){ return '<figure class="vimg"><a href="img/' + esc(VER.cv) + "-p" + pg + '.jpg" target="_blank" rel="noopener"><img src="img/' + esc(VER.cv) + "-p" + pg + '.jpg" alt="Страница ' + pg + ' PDF" loading="lazy"></a><figcaption>Страница ' + pg + " PDF рекомендации</figcaption></figure>"; }).join("");
  else if(v && v.q) h += '<blockquote class="vquote">' + esc(v.q) + cite + "</blockquote>";
  if(v && v.note && !v.img) h += '<p class="vnote">' + esc(v.note) + "</p>";
  return h;
}
/* название КР длиннее двух строк телефона («Агрессивные нефолликулярные лимфомы - диффузная …») — до первого тире, иначе по слову */
function shortName(n){
  if(n.length <= 80) return n;
  var m = n.match(/^(.{20,}?)\s[-–—]\s/);
  return m ? m[1] : n.slice(0, 77).replace(/\s\S*$/, "") + "…";
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
/* рисунок или блок-схема: нажатие открывает во весь экран целиком по ширине экрана */
/* закрывается кнопкой ✕, Escape, жестом «Назад» (history) и повторным нажатием — ревизия дизайна 26.10.2026, B2 */
var figOpen = null;
function figClose(fromPop){
  if(!figOpen) return;
  var fig = figOpen; figOpen = null;
  fig.classList.remove("fig-full"); document.documentElement.style.overflow = "";
  var x = fig.querySelector(".fig-x"); if(x) x.remove();
  var zb = fig.querySelector(".fig-zoom"); if(zb) zb.remove();
  if(fig._home){ fig._home.parentNode.replaceChild(fig, fig._home); fig._home = null; }
  var el = figEl(fig); if(el){ el.style.width = ""; el.style.height = ""; }
  if(!fromPop && history.state && history.state.fig) history.back();
}
document.addEventListener("click", function(e){
  if(e.target.closest(".fig-x")){ figClose(); return; }
  /* блоки схемы не нажимаются (просьба 26.10.2026): нажатие на схему только открывает её во весь экран */
  var ao = e.target.closest(".alg-open");  /* строка «Открыть схему целиком» открывает схему во весь экран */
  var f = ao ? ao.parentNode.querySelector(".fig-scroll") : e.target.closest(".fig-scroll");
  if(!f) return;
  var fig = f.closest(".fig") || f.parentNode;
  if(fig.classList.contains("fig-full")) return;  /* во весь экран касание не закрывает: им листают и масштабируют */
  /* во весь экран схема переносится прямо в <body>: внутри блоков страницы (анимации, contain) position:fixed
     отсчитывался от блока, и схема съезжала, открывая полосу шапки (жалоба 26.10.2026); при закрытии — на место */
  fig._home = document.createComment("fig"); fig.parentNode.replaceChild(fig._home, fig); document.body.appendChild(fig);
  fig.classList.add("fig-full"); figOpen = fig;
  document.documentElement.style.overflow = "hidden";
  fig.insertAdjacentHTML("afterbegin", '<button type="button" class="x fig-x" aria-label="Закрыть">✕</button>'
    + '<div class="fig-zoom"><button type="button" data-z="out" aria-label="Уменьшить">−</button><button type="button" data-z="fit">По ширине</button><button type="button" data-z="in" aria-label="Увеличить">+</button></div>');
  try{ history.pushState({fig: 1}, ""); }catch(err){}
  figZoom(fig, "fit");
});
/* масштаб во весь экран (врач: «схема нормально назад не зумится», 26.10.2026): открывается целиком по ширине экрана,
   дальше — щипок двумя пальцами или кнопки «−», «По ширине», «+»; масштабируется сам рисунок, а не страница */
function figEl(fig){ return fig.querySelector(".fig-scroll svg, .fig-scroll img"); }
function figNat(el){ return el.tagName === "IMG" ? (el.naturalWidth || el.width) : (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.width) || +el.getAttribute("width") || el.getBoundingClientRect().width; }
function figZoom(fig, how, ratio){
  var el = figEl(fig); if(!el) return;
  var nat = figNat(el), fit = Math.min(1, (fig.clientWidth - 32) / nat);
  var z = how === "fit" ? fit : how === "in" ? (fig._z || fit) * 1.4 : how === "out" ? (fig._z || fit) / 1.4 : (fig._z0 || fit) * ratio;
  z = Math.max(fit * 0.9, Math.min(3, z)); fig._z = z;
  el.style.width = Math.round(nat * z) + "px"; el.style.height = "auto";
  if(how === "fit"){ fig.scrollLeft = 0; fig.scrollTop = 0; }
}
document.addEventListener("click", function(e){
  var b = e.target.closest(".fig-zoom button"); if(b && figOpen) figZoom(figOpen, b.dataset.z);
});
document.addEventListener("touchstart", function(e){
  if(!figOpen || e.touches.length !== 2) return;
  var t = e.touches; figOpen._d0 = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); figOpen._z0 = figOpen._z;
}, {passive: true});
document.addEventListener("touchmove", function(e){
  if(!figOpen || e.touches.length !== 2 || !figOpen._d0) return;
  e.preventDefault();
  var t = e.touches; figZoom(figOpen, "pinch", Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) / figOpen._d0);
}, {passive: false});
document.addEventListener("touchend", function(e){ if(figOpen && e.touches.length < 2) figOpen._d0 = 0; });
addEventListener("popstate", function(){ figClose(true); });
/* алгоритм по шагам: «Да → шаг 4» прокручивает к шагу и подсвечивает его (в режиме «Все шаги») */
document.addEventListener("click", function(e){
  var b = e.target.closest(".as-go"); if(!b) return;
  var li = document.getElementById(b.dataset.to); if(!li) return;
  var fig = li.closest(".fig-alg");
  if(fig && fig._lorSyncStep) fig._lorSyncStep(+li.dataset.step || 1);
  li.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center"});
  li.classList.add("as-flash"); setTimeout(function(){ li.classList.remove("as-flash"); }, 1400);
});
document.addEventListener("click", function(e){
  var ev = e.target.closest(".ev");
  if(ev && DOC){ e.preventDefault(); openSource(ev.closest("[data-v]"), ev); return; }
  var term = e.target.closest(".term");
  if(term && TERMS[term.dataset.t]){
    var d = TERMS[term.dataset.t], key = term.dataset.t;
    var sec = /^\d/.test(d.sec) ? "раздел " + d.sec : "«" + d.sec + "»";
    pop.innerHTML = '<div class="sheet-h"><h3>' + esc(d.t) + '</h3><button class="x" data-close aria-label="Закрыть">✕</button></div>'
      + '<p class="term-def">' + esc(d.q) + "</p>"
      + (d.img ? '<figure class="gl-fig"><img src="' + esc(d.img.src) + '" alt="' + esc(d.img.caption) + '"><figcaption>' + esc(d.img.caption) + (d.img.star ? "*" : "")
          + '<span class="fig-src">Источник' + (d.img.star ? "*" : "") + ": " + esc(d.img.by) + "</span></figcaption></figure>" : "")
      + '<p class="vnote">' + (d.book ? "Не из клинических рекомендаций: пересказ по книге " + esc(d.book) + "."
          : "Дословно из КР «" + esc(d.kr || (DOC ? DOC.title : VER.cv)) + "», " + sec + (d.page ? ", страница " + d.page : "") + ".") + "</p>"
      + '<ul class="list" style="margin-top:12px">' + row(glossaryHref(key.replace(/^[ad]:/, "")), "Открыть в словаре", "все термины и сокращения рекомендаций") + "</ul>";
    openSheet(pop);
  }
});


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
  $("askMsg").hidden = true; refreshAsk(); openSheet(ask); $("askBtn").setAttribute("aria-expanded", "true");
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
    (d.tb || []).forEach(function(t){ t.l = low(t[2] + " " + t[1] + " " + t[4]); t.h = low(t[2]); });
    (d.gl || []).forEach(function(g){ g.h = low(g[0]); });
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
  var cnt = {};
  IDX.pages.forEach(function(p){
    var n = {};  /* до 4 совпадений на вкладку: иначе «Лечение» терялось за «Обзором» и «Клиникой» */
    p.i.forEach(function(it){ if(has(it.l, ws)){ cnt[p.s] = (cnt[p.s] || 0) + 1; if((n[it[1]] || 0) < 4 || has(low(it[2]), ws)){ n[it[1]] = (n[it[1]] || 0) + 1; out.push({p:p, it:it}); } } });
  });
  /* сначала «Лечение», потом «Обзор», потом остальное — порядок страниц сохраняется */
  var rank = {"Лечение":0, "Обзор":1};
  /* выше всего — пункты со страницы болезни, в названии которой есть искомое слово */
  function score(x){ var t = low(x.p.t), own = ws.some(function(alts){ return alts.some(function(w){ return atWord(t, w) >= 0; }); });
    /* страница, где слово встречается много раз, — о нём (12 упоминаний «репозиции» в «Травме носа» против одного в «Расщелине нёба») */
    return (own ? 0 : 10) - Math.min(cnt[x.p.s], 8) + (rank[x.it[1]] === undefined ? 2 : rank[x.it[1]]) / 10; }
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
    return d.href ? row(d.href, mark(d.name, ws), esc(codesShort(d.codes))) : row(CRURL + esc(d.cv), mark(shortName(d.name), ws), esc(codesShort(d.codes)) + " · только текст на сайте Минздрава", "ext", ' target="_blank" rel="noopener"');
  }).join("") + "</ul>"; }
  /* словарь: термин, в названии которого есть все слова запроса, — короткое определение сразу под заболеваниями */
  if(IDX && IDX.gl){
    var gl = IDX.gl.filter(function(g){ return has(g.h, ws); }).sort(function(a, b){ return a[0].length - b[0].length; }).slice(0, 4);
    if(gl.length){ total += gl.length; h += '<h2 class="gh">Словарь</h2><ul class="list">' + gl.map(function(g){
      var i = g[1].indexOf("#");
      return row(g[1].slice(0, i) + "#" + encodeURIComponent(g[1].slice(i + 1)), mark(g[0], ws), esc(snippet(g[2], ws, 120)));
    }).join("") + "</ul>"; }
  }
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
  /* одна строка на раздел страницы: «Отит средний острый — Лечение», лучший фрагмент и «ещё N совпадений» (ревизия дизайна 26.10.2026, п. 13) */
  var groups = [], gi = {};
  hits.forEach(function(x){ var k = x.p.s + "|" + x.it[1]; if(gi[k] === undefined){ gi[k] = groups.length; groups.push({p: x.p, sec: x.it[1], items: []}); } groups[gi[k]].items.push(x.it); });
  if(groups.length){ total += groups.length; h += '<h2 class="gh">Найдено в разборах' + (via ? " по действующему веществу «" + esc(via) + "»" : "") + "</h2><ul class=\"list\">" + groups.map(function(g){
    /* показываем пункт из раздела, в названии которого есть искомое слово, иначе тот, где слово стоит ближе к началу (о нём, а не упоминание) */
    function pos(x){ var l = low(x[3]), m = 1e9; [].concat.apply([], ws).forEach(function(w){ var i = atWord(l, w); if(i >= 0 && i < m) m = i; }); return m; }
    var it = g.items.filter(function(x){ return has(low(x[2]), ws); })[0]
      || g.items.slice().sort(function(a, b){ return pos(a) - pos(b); })[0], more = g.items.length - 1;
    return row(g.p.s + ".html#" + it[0], esc(g.p.t) + " — " + esc(g.sec.charAt(0).toUpperCase() + g.sec.slice(1)),
      (it[2] ? esc(it[2]) + ": " : "") + mark(snippet(it[3], ws), ws) + (more ? " · ещё " + more + " " + plural(more, "совпадение", "совпадения", "совпадений") : ""));
  }).join("") + "</ul>"; }
  /* учебник: подразделы глав — сначала те, в заголовке которых есть искомое слово */
  if(IDX && IDX.tb){
    var tb = IDX.tb.filter(function(t){ return has(t.l, ws); }).map(function(t, i){ return [t, i]; })
      .sort(function(a, b){ return (has(b[0].h, ws) ? 1 : 0) - (has(a[0].h, ws) ? 1 : 0) || a[1] - b[1]; }).map(function(x){ return x[0]; }).slice(0, 6);
    if(tb.length){ total += tb.length; h += '<h2 class="gh">Учебник</h2><ul class="list">' + tb.map(function(t){
      return row(t[0] + "#" + t[3], esc(t[1]) + " — " + mark(t[2], ws), mark(snippet(t[4], ws), ws));
    }).join("") + "</ul>"; }
  }
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
{
  qIn.addEventListener("input", function(){
    if(B.page === "drugs") return;
    clearTimeout(deb); deb = setTimeout(render, 120);
    if(qIn.value.trim().length >= 2){
      loadIndex().then(render, function(){ IDX = {pages:[], mkb:[]}; render(); });
      if(window.GRLS && qIn.value.trim().length >= 3) GRLS.load().then(render, function(){});
    }
  });
  qIn.addEventListener("focus", function(){ if(B.page !== "drugs" && qIn.value.trim().length >= 2) render(); });
  qIn.addEventListener("keydown", function(e){
    if(e.key === "Escape"){ qIn.value = ""; closeResults(); qIn.blur(); }
    if(e.key === "Enter" && B.page !== "drugs"){ e.preventDefault(); var a = resIn.querySelector("a.row"); if(a) a.click(); }
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
  if(e.key === "Escape"){ figClose(); closeSheets(); }
});

/* ---------- содержимое экрана: вызывается при загрузке и после каждого перехода без перезагрузки ---------- */
function initPage(){
readPage();
/* шапка общая для всех экранов: обновить то, что зависит от экрана */
var hb = $("homeBtn"); if(hb){ if(HOME) hb.setAttribute("aria-current", "page"); else hb.removeAttribute("aria-current"); }
$("q").placeholder = B.page === "drugs" ? (innerWidth < 480 ? "Препарат" : "Торговое название или вещество") : (innerWidth < 420 ? "Поиск" : "Болезнь, код, препарат");
/* внизу каждой страницы, кроме главной (там свой блок) — откуда данные */
if(!HOME && B.page !== "sources" && B.page !== "textbook"){  /* «Учебник» — не КР, подпись про источники к нему не относится */
  var mainBox = document.querySelector(".page");
  if(mainBox) mainBox.insertAdjacentHTML("beforeend", '<footer class="site-foot"><a href="istochniki.html">Источники и проверка данных ›</a>'
    + "<span>Только клинические рекомендации Минздрава, ГРЛС и справочник МКБ-10. Не заменяет полный текст рекомендации.</span></footer>");
}

/* ---------- Богатые многослойные анатомические и клинические иконки (48×48, адаптивная детализация .ico-det) ---------- */
var LOR_ICONS = {
  nose: '<path class="ico-fill-2" d="M8.5 21.5C8.5 17.2 12.6 15.8 17.5 17.6L18 29.2C13.4 30.8 8.5 27.8 8.5 21.5ZM39.5 21.5C39.5 17.2 35.4 15.8 30.5 17.6L30 29.2C34.6 30.8 39.5 27.8 39.5 21.5Z"/>'
    + '<path class="ico-fill-1" d="M13.5 11.2C13.5 7.4 18.5 6.8 22.5 10.2V14.2C18 14.2 13.5 13.4 13.5 11.2ZM34.5 11.2C34.5 7.4 29.5 6.8 25.5 10.2V14.2C30 14.2 34.5 13.4 34.5 11.2Z"/>'
    + '<path class="ico-fill-hi" d="M24 12C20.2 19 16.2 26.2 16.2 33.5C16.2 37.5 19.8 39.5 24 37.8C28.2 39.5 31.8 37.5 31.8 33.5C31.8 26.2 27.8 19 24 12Z"/>'
    + '<path class="ico-det" d="M13.5 11.2C13.5 7.4 18.5 6.8 22.2 10.2V14C18 14 13.5 13.4 13.5 11.2ZM34.5 11.2C34.5 7.4 29.5 6.8 25.8 10.2V14C30 14 34.5 13.4 34.5 11.2ZM16.8 18C12 16.5 8.5 18.2 8.5 22C8.5 27.5 12.8 30.2 16.8 29M31.2 18C36 16.5 39.5 18.2 39.5 22C39.5 27.5 35.2 30.2 31.2 29"/>'
    + '<path class="ico-det" d="M24 21.5C21.2 21.5 19.2 23.5 19.2 25.8M24 21.5C26.8 21.5 28.8 23.5 28.8 25.8M24 27.2C20.5 27.2 18.2 29.5 18.2 32.2M24 27.2C27.5 27.2 29.8 29.5 29.8 32.2"/>'
    + '<path class="ico-str" d="M21 8.5C21 17 14.5 24.5 14.5 32.8C14.5 36.8 18.2 39.2 21.5 37.2M27 8.5C27 17 33.5 24.5 33.5 32.8C33.5 36.8 29.8 39.2 26.5 37.2M20.5 36.8C22 38.6 26 38.6 27.5 36.8M24 9.5V36.5"/>',
  ear: '<path class="ico-fill-1" d="M9.5 19.5C9.5 11.2 15.8 6.8 22.8 8.8C28.2 10.3 30.5 16 28.2 22.2C26.4 26.8 24 29.2 22.6 34C21.5 37.8 18.5 40.2 14.8 39.4C11.8 38.8 10.8 35.8 12 33Z"/>'
    + '<circle class="ico-fill-hi" cx="35.5" cy="24.5" r="5.5"/>'
    + '<path class="ico-det" d="M24.2 25.2H30.8M31.8 21.2L29.8 29.2M35.5 24.5m-1.1 0a1.1 1.1 0 1 0 2.2 0a2.5 2.5 0 1 0 -5 0a4 4 0 1 0 8 0a5.3 5.3 0 0 0 -8.8 -3.8"/>'
    + '<path class="ico-str" d="M9.5 19.5C9.5 11.2 15.8 6.8 22.8 8.8C28.2 10.3 30.5 16 28.2 22.2C26.4 26.8 24 29.2 22.6 34C21.5 37.8 18.5 40.2 14.8 39.4C11.8 38.8 10.8 35.8 12 33"/>'
    + '<path class="ico-str" d="M14.2 18.8C14.8 13.8 19.2 11.8 22.8 13.8C25.5 15.4 25.8 19.5 23.5 22.8C21.5 25.5 19.5 27.2 19.2 30.8M13.2 24.2C15.4 24 16.8 25.8 15.2 27.8"/>',
  throat: '<path class="ico-fill-1" d="M6.5 23.5C9.5 11.8 17.2 8.8 24 8.8C30.8 8.8 38.5 11.8 41.5 23.5C39 35.2 32 40.2 24 40.2C16 40.2 9 35.2 6.5 23.5Z"/>'
    + '<ellipse class="ico-fill-hi" cx="14.2" cy="24.6" rx="3.4" ry="5.4"/><ellipse class="ico-fill-hi" cx="33.8" cy="24.6" rx="3.4" ry="5.4"/>'
    + '<path class="ico-fill-2" d="M10.5 34.5C14.5 29.5 19.8 29.2 24 31.2C28.2 29.2 33.5 29.5 37.5 34.5C34 38.5 29.2 40.2 24 40.2C18.8 40.2 14 38.5 10.5 34.5Z"/>'
    + '<path class="ico-det" d="M18.2 22.2C19.6 24.4 20.2 27 20 29.8M29.8 22.2C28.4 24.4 27.8 27 28 29.8M24 31.2V37.8M14.5 12.6C17.5 14 20.8 14.6 24 14.6C27.2 14.6 30.5 14 33.5 12.6"/>'
    + '<circle class="ico-det" cx="14.2" cy="22.8" r="0.7"/><circle class="ico-det" cx="15" cy="25.2" r="0.7"/><circle class="ico-det" cx="13.8" cy="27.2" r="0.7"/>'
    + '<circle class="ico-det" cx="33.8" cy="22.8" r="0.7"/><circle class="ico-det" cx="33" cy="25.2" r="0.7"/><circle class="ico-det" cx="34.2" cy="27.2" r="0.7"/>'
    + '<path class="ico-str" d="M6.5 23.5C9.5 11.8 17.2 8.8 24 8.8C30.8 8.8 38.5 11.8 41.5 23.5C39 35.2 32 40.2 24 40.2C16 40.2 9 35.2 6.5 23.5Z"/>'
    + '<path class="ico-str" d="M9.5 20.5C13.5 16 19.2 16.2 21.8 20.2L22.2 24.2C22.4 26.2 23.1 27.2 24 27.2C24.9 27.2 25.6 26.2 25.8 24.2L26.2 20.2C28.8 16.2 34.5 16 38.5 20.5"/>'
    + '<path class="ico-str" d="M13.5 19.2C16.2 19.8 17.8 22.2 17.5 25.2C17.2 27.8 15.5 29.8 13.2 30.2M34.5 19.2C31.8 19.8 30.2 22.2 30.5 25.2C30.8 27.8 32.5 29.8 34.8 30.2"/>'
    + '<path class="ico-str" d="M10.5 34.5C14.5 29.5 19.8 29.2 24 31.2C28.2 29.2 33.5 29.5 37.5 34.5"/>',
  larynx: '<path class="ico-fill-1" d="M11.5 14.5C11.5 12 16.5 11.5 20.5 14.2L24 16.8L27.5 14.2C31.5 11.5 36.5 12 36.5 14.5L35 28.5C34.2 32.5 29.5 35 24 35C18.5 35 13.8 32.5 13 28.5Z"/>'
    + '<path class="ico-fill-hi" d="M24 17.5L18.5 30.5H29.5Z"/>'
    + '<path class="ico-det" d="M17.5 37.2C21.5 38.4 26.5 38.4 30.5 37.2M17.5 40.5C21.5 41.7 26.5 41.7 30.5 40.5M24 17.5L16 28.5M24 17.5L32 28.5M8 19.5C6.5 22 6.5 25.5 8 28M40 19.5C41.5 22 41.5 25.5 40 28"/>'
    + '<path class="ico-str" d="M19.5 13.2C19.2 8.2 21.2 5.8 24 5.8C26.8 5.8 28.8 8.2 28.5 13.2"/>'
    + '<path class="ico-str" d="M11.5 14.5C11.5 12 16.5 11.5 20.5 14.2L24 16.8L27.5 14.2C31.5 11.5 36.5 12 36.5 14.5L35 28.5C34.2 32.5 29.5 35 24 35C18.5 35 13.8 32.5 13 28.5Z"/>'
    + '<path class="ico-str" d="M24 17.5L18.5 30.5M24 17.5L29.5 30.5M17.5 34.2V42M30.5 34.2V42"/>',
  trauma: '<path class="ico-fill-1" d="M24 6.5L38.5 12V24.5C38.5 33.2 32.2 39.5 24 42C15.8 39.5 9.5 33.2 9.5 24.5V12L24 6.5Z"/>'
    + '<path class="ico-fill-hi" d="M22 13H26V17H30V21H26V25H22V21H18V17H22Z"/>'
    + '<path class="ico-det" d="M18 27.5L21.5 32.5M26.5 27L30 32M13 14.5L24 10.2L35 14.5"/>'
    + '<path class="ico-str" d="M24 6.5L38.5 12V24.5C38.5 33.2 32.2 39.5 24 42C15.8 39.5 9.5 33.2 9.5 24.5V12L24 6.5Z"/>'
    + '<path class="ico-str" d="M14.5 31.5L20.5 28.5L23.5 33L28.5 27.5L33.5 30.5M24 14V24M19 19H29"/>',
  ari: '<circle class="ico-fill-1" cx="24" cy="24" r="15.5"/><circle class="ico-fill-2" cx="24" cy="24" r="9.5"/><circle class="ico-fill-hi" cx="24" cy="24" r="4.2"/>'
    + '<polygon class="ico-det" points="24,17.5 29.6,20.8 29.6,27.2 24,30.5 18.4,27.2 18.4,20.8"/>'
    + '<circle class="ico-str" cx="24" cy="24" r="9.5"/>'
    + '<path class="ico-str" d="M24 8.5V14.5M24 33.5V39.5M8.5 24H14.5M33.5 24H39.5M13 13L17.3 17.3M30.7 30.7L35 35M13 35L17.3 30.7M30.7 17.3L35 13"/>'
    + '<circle class="ico-str" cx="24" cy="7" r="1.8"/><circle class="ico-str" cx="24" cy="41" r="1.8"/><circle class="ico-str" cx="7" cy="24" r="1.8"/><circle class="ico-str" cx="41" cy="24" r="1.8"/>'
    + '<circle class="ico-str" cx="11.8" cy="11.8" r="1.8"/><circle class="ico-str" cx="36.2" cy="36.2" r="1.8"/><circle class="ico-str" cx="11.8" cy="36.2" r="1.8"/><circle class="ico-str" cx="36.2" cy="11.8" r="1.8"/>',
  related: '<path class="ico-fill-1" d="M11 10.5H27V20C27 24.8 23.4 28.5 19 28.5C14.6 28.5 11 24.8 11 20Z"/><circle class="ico-fill-hi" cx="35.5" cy="28.5" r="5.2"/>'
    + '<path class="ico-det" d="M16.5 17H21.5M19 14.5V19.5"/><circle class="ico-det" cx="35.5" cy="28.5" r="2"/>'
    + '<path class="ico-str" d="M13.5 9.5H10.5V19.5C10.5 24.5 14.3 28.5 19 28.5C23.7 28.5 27.5 24.5 27.5 19.5V9.5H24.5M19 28.5V33.5C19 37.8 22.5 41 26.8 41C31.2 41 35.5 37.8 35.5 33.5"/><circle class="ico-str" cx="35.5" cy="28.5" r="5.2"/>',
  textbook: '<path class="ico-fill-1" d="M7 11.5C11.5 9.5 18.5 10 24 13C29.5 10 36.5 9.5 41 11.5V36.5C36.5 34.5 29.5 35 24 38C18.5 35 11.5 34.5 7 36.5Z"/>'
    + '<circle class="ico-fill-hi" cx="15.5" cy="22.5" r="4"/><path class="ico-det" d="M28.5 18.5H36.5M28.5 23H36.5M28.5 27.5H34.5"/>'
    + '<path class="ico-str" d="M7 11.5C11.5 9.5 18.5 10 24 13C29.5 10 36.5 9.5 41 11.5V36.5C36.5 34.5 29.5 35 24 38C18.5 35 11.5 34.5 7 36.5ZM24 13V38"/>',
  drugs: '<rect class="ico-fill-1" x="8" y="15" width="32" height="18" rx="9" transform="rotate(-35 24 24)"/><path class="ico-fill-hi" d="M24 15L31.4 27.7A9 9 0 0 0 34.3 15.3A9 9 0 0 0 21.8 12.6Z"/>'
    + '<path class="ico-det" d="M16 26L20 23M32 14V20M29 17H35"/>'
    + '<rect class="ico-str" x="8" y="15" width="32" height="18" rx="9" transform="rotate(-35 24 24)"/><path class="ico-str" d="M18.8 16.6L29.2 31.4"/>',
  mkb: '<rect class="ico-fill-1" x="9" y="8" width="30" height="32" rx="4"/><path class="ico-fill-hi" d="M14 14H24V20H14Z"/>'
    + '<path class="ico-det" d="M14 25H34M14 30H28M14 35H24"/><path class="ico-str" d="M9 12A4 4 0 0 1 13 8H35A4 4 0 0 1 39 12V36A4 4 0 0 1 35 40H13A4 4 0 0 1 9 36ZM16 17H22M19 14V20"/>',
  glossary: '<rect class="ico-fill-1" x="10" y="7" width="28" height="34" rx="3.5"/><path class="ico-fill-hi" d="M16 14H32V22H16Z"/>'
    + '<path class="ico-det" d="M16 27H32M16 32H26"/><path class="ico-str" d="M10 10.5A3.5 3.5 0 0 1 13.5 7H34.5A3.5 3.5 0 0 1 38 10.5V37.5A3.5 3.5 0 0 1 34.5 41H13.5A3.5 3.5 0 0 1 10 37.5ZM18 21L21.5 13L25 21M19 19H24"/>'
};
function gicon(id){ return LOR_ICONS[id] ? '<span class="gh-ico-wrap" data-ico-type="' + id + '"><svg class="gh-ico" viewBox="0 0 48 48" aria-hidden="true">' + LOR_ICONS[id] + "</svg></span>" : ""; }

/* ---------- главная: интерактивное меню со сворачиваемыми разделами ---------- */
home = $("home");
if(home){
  var core = L.groups.filter(function(g){ return !g.related; }), rel = L.groups.filter(function(g){ return g.related; });
  function fullRows(list){
    return list.map(function(d){ return row(CRURL + esc(d.cv), esc(shortName(d.name)), esc(codesShort(d.codes)) + " · только текст на сайте Минздрава", "ext", ' target="_blank" rel="noopener"'); }).join("");
  }
  var TOP = {nose:["313_3","261_2","955_1","977_1","890_1","1082_1","913_1","956_1","756_1"],
             ear:["314_3","663_2","698_2","518_3","18_2","21_3","22_3","315_4","311_2","304_2","609_2"],
             throat:["306_3","683_2","662_2","664_2"], larynx:["309_2","352_3","305_2"],
             trauma:["815_1","812_1","813_1"], ari:["724_2","25_3","943_1"]};
  var SUB_PREV = {
    nose: "Острый и хронический синусит · Аллергический и вазомоторный ринит · Полипоз · Носовое кровотечение · Перегородка",
    ear: "Острый, хронический, наружный и грибковый отит · Нейросенсорная тугоухость · Болезнь Меньера · Отосклероз · Мастоидит",
    throat: "Острый тонзиллофарингит (ангина) · Хронический тонзиллит · Аденоиды и гипертрофия миндалин · Паратонзиллярный абсцесс",
    larynx: "Острый ларингит · Обструктивный ларингит (круп), эпиглоттит и стеноз гортани · Парезы и параличи гортани",
    trauma: "Травма носа и околоносовых пазух · Травма наружного и среднего уха · Травма гортани и трахеи",
    ari: "ОРВИ у взрослых · ОРВИ и фебрильная лихорадка у детей · Респираторно-синцитиальная инфекция"
  };
  function rank(g, d){ var i = (TOP[g] || []).indexOf(d.cv); return i < 0 ? 99 : i; }
  function oneRow(d){
    var sub = [codesShort(d.codes), d.age, d.y ? d.y + " г." : ""].filter(Boolean).join(" · ");
    return d.href ? row(d.href, esc(d.name), esc(sub)) : fullRows([d]);
  }

  /* Быстрая панель ключевых разделов справочника */
  var qnav = '<nav class="home-qnav" aria-label="Быстрый доступ к разделам справочника">'
    + '<a class="hq-card" href="uchebnik.html">' + gicon("textbook") + '<span class="hq-txt"><b>Учебник</b><small>20 глав · анатомия, клиника, операции</small></span></a>'
    + '<a class="hq-card" href="preparaty.html">' + gicon("drugs") + '<span class="hq-txt"><b>Препараты ГРЛС</b><small>показания, противопоказания, ТН</small></span></a>'
    + '<a class="hq-card" href="mkb.html">' + gicon("mkb") + '<span class="hq-txt"><b>Коды МКБ-10</b><small>ЛОР-рубрики в 1 касание</small></span></a>'
    + '<a class="hq-card" href="slovar.html">' + gicon("glossary") + '<span class="hq-txt"><b>Словарь КР</b><small>термины и сокращения</small></span></a>'
    + '</nav>';

  var h = qnav
    + '<div class="home-head-bar">'
    + '<div><h1 class="pt">Клинические рекомендации</h1><p class="home-sub">Выберите раздел, чтобы раскрыть список клинических рекомендаций</p></div>'
    + '<button type="button" class="home-exp-btn" id="toggleAllGrps" aria-pressed="false">Развернуть все</button>'
    + '</div><div class="grps">';

  var savedOpen = {};
  try{ savedOpen = JSON.parse(sessionStorage.getItem("lor-home-open") || "{}"); }catch(e){}

  core.forEach(function(g, idx){
    var all = L.diseases.filter(function(d){ return d.g === g.id; }).sort(function(a, b){ return rank(g.id, a) - rank(g.id, b) || (b.href ? 1 : 0) - (a.href ? 1 : 0); });
    var isOpen = !!savedOpen[g.id];
    h += '<section class="grp grp-card' + (isOpen ? ' is-open' : '') + '" data-sec-id="' + g.id + '" style="--stagger:' + idx + '">'
      + '<button type="button" class="grp-head" aria-expanded="' + String(isOpen) + '" data-grp-toggle="' + g.id + '">'
      + gicon(g.id)
      + '<span class="grp-title-box"><span class="grp-title">' + esc(g.title) + '</span>'
      + '<span class="grp-preview">' + esc(SUB_PREV[g.id] || "") + '</span></span>'
      + '<span class="grp-meta"><span class="grp-cnt">' + all.length + '</span><span class="grp-chev" aria-hidden="true">⌄</span></span>'
      + '</button>'
      + '<div class="grp-body"><div class="grp-body-in"><ul class="list">' + all.map(oneRow).join("") + '</ul></div></div>'
      + '</section>';
  });

  /* Смежные специальности — также раскрываемой карточкой со вложенными направлениями */
  var relTotal = 0, relReady = 0;
  rel.forEach(function(g){
    var ds = L.diseases.filter(function(d){ return d.g === g.id; });
    relTotal += ds.length;
    relReady += ds.filter(function(d){ return d.href; }).length;
  });
  var relOpen = !!savedOpen["related"];
  h += '<section class="grp grp-card grp-wide' + (relOpen ? ' is-open' : '') + '" data-sec-id="related" style="--stagger:6">'
    + '<button type="button" class="grp-head" aria-expanded="' + String(relOpen) + '" data-grp-toggle="related">'
    + gicon("related")
    + '<span class="grp-title-box"><span class="grp-title">Смежные специальности</span>'
    + '<span class="grp-preview">Онкология головы и шеи · ЧЛХ · Неврология · Инфекции · Пульмонология · Пищевод · Иммунология (' + relReady + ' с разбором, ' + (relTotal - relReady) + ' по ссылкам Минздрава)</span></span>'
    + '<span class="grp-meta"><span class="grp-cnt">' + relTotal + '</span><span class="grp-chev" aria-hidden="true">⌄</span></span>'
    + '</button>'
    + '<div class="grp-body"><div class="grp-body-in"><ul class="list rel-subgrid">' + rel.map(function(g){
      var all = L.diseases.filter(function(d){ return d.g === g.id; }).sort(function(a, b){ return (b.href ? 1 : 0) - (a.href ? 1 : 0); });
      var rCnt = all.filter(function(d){ return d.href; }).length;
      return '<li class="rel-item"><button class="row toggle" type="button" aria-expanded="false"><span class="rt">' + esc(g.title.replace(/^Смежные: /, "").replace(/^./, function(c){ return c.toUpperCase(); }))
        + '<span class="rs">' + all.length + " " + plural(all.length, "рекомендация", "рекомендации", "рекомендаций")
        + (rCnt ? " · разобрано на сайте: " + rCnt : " · ссылки на Минздрав") + "</span></span></button>"
        + '<ul class="list sublist" hidden>' + all.map(oneRow).join("") + "</ul></li>";
    }).join("") + '</ul></div></div></section>';

  h += "</div>";
  home.innerHTML = h;

  function syncAllBtn(){
    var cards = home.querySelectorAll(".grp-card");
    var allOpen = [].every.call(cards, function(c){ return c.classList.contains("is-open"); });
    var btn = $("toggleAllGrps");
    if(btn){
      btn.setAttribute("aria-pressed", String(allOpen));
      btn.textContent = allOpen ? "Свернуть все" : "Развернуть все";
    }
  }
  syncAllBtn();

  home.addEventListener("click", function(e){
    var expBtn = e.target.closest("#toggleAllGrps");
    if(expBtn){
      var cards = home.querySelectorAll(".grp-card");
      var wantOpen = expBtn.getAttribute("aria-pressed") !== "true";
      cards.forEach(function(c){
        var id = c.dataset.secId;
        c.classList.toggle("is-open", wantOpen);
        var hb = c.querySelector(".grp-head");
        if(hb) hb.setAttribute("aria-expanded", String(wantOpen));
        savedOpen[id] = wantOpen ? 1 : 0;
      });
      try{ sessionStorage.setItem("lor-home-open", JSON.stringify(savedOpen)); }catch(err){}
      syncAllBtn();
      return;
    }
    var gh = e.target.closest("[data-grp-toggle]");
    if(gh){
      var card = gh.closest(".grp-card"), id = gh.dataset.grpToggle;
      var open = !card.classList.contains("is-open");
      card.classList.toggle("is-open", open);
      gh.setAttribute("aria-expanded", String(open));
      savedOpen[id] = open ? 1 : 0;
      try{ sessionStorage.setItem("lor-home-open", JSON.stringify(savedOpen)); }catch(err){}
      syncAllBtn();
      return;
    }
    var b = e.target.closest(".toggle"); if(!b) return;
    var openSub = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(openSub)); b.nextElementSibling.hidden = !openSub;
  });

  var ready = L.diseases.filter(function(d){ return d.href; }).length;
  var statEl = $("stat");
  if(statEl) statEl.textContent = "Минздрав РФ, оториноларингология и смежные рубрики. Полностью разобрано на сайте: " + ready + " из " + L.diseases.length + " " + plural(L.diseases.length, "рекомендации", "рекомендаций", "рекомендаций")
    + " (все 33 профильные ЛОР-рекомендации + 18 смежных; остальные 46 смежных КР доступны по прямым ссылкам на рубрикатор Минздрава). Список сверен " + L.updated.split("-").reverse().join(".");
}

tabbar = $("tabbar"); TABS = tabbar ? Array.prototype.map.call(tabbar.querySelectorAll("[data-tab]"), function(b){ return b.dataset.tab; }) : [];
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
  else { var target = findEl(start); showTab(panelOf(target) || "over"); if(target) setTimeout(function(){ reveal(target); }, 60); }
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
  if(!p){ p = document.createElement("p"); p.className = "more-hint"; }
  (block.querySelector(".body") || block).appendChild(p);  /* всегда последним в блоке — не посреди «Лечения» перед алгоритмом (ревизия 26.10.2026, п. 7) */
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

/* торговые названия: название препарата в первой колонке таблицы нажимается */
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

document.querySelectorAll(".term").forEach(function(el){ if(!TERMS[el.dataset.t]) el.classList.remove("term"); });

/* журнал сверки — в блоке «Источник и актуальность» */
vlog = $("vlog");
if(VER && vlog){
  var tot = 0, none = 0; fixes = [];
  document.querySelectorAll("[data-v]").forEach(function(el){ tot++; var v = vOf(el); if(!v) none++; else if(v.s === "fix") fixes.push({el:el, v:v}); });
  vlog.innerHTML = "<p>" + esc(VER.checked) + ": каждый пункт страницы сверен с PDF «" + esc(VER.pdf) + "» из рубрикатора Минздрава (" + VER.pages + " с.). Пунктов: " + tot + "."
    + (fixes.length ? " При сверке исправлено: " + fixes.length + "." : "") + (none ? " Не сверено: " + none + "." : "") + "</p>"
    + '<p class="vlog-how">Цитаты вырезаны из текста PDF программой: если фрагмента нет в документе, страница не собирается. Цитата к пункту — по нажатию на строку источника под ним.</p>'
    + (fixes.length ? "<details><summary>Что исправлено при сверке</summary><ul class=\"list\">" + fixes.map(function(f, i){
        return '<li><button class="row" data-fix="' + i + '"><span class="rt">' + esc(textOf(f.el).slice(0, 90)) + "…" + (f.v.note ? '<span class="rs">' + esc(f.v.note) + "</span>" : "") + "</span></button></li>";
      }).join("") + "</ul></details>" : "");
  vlog.addEventListener("click", function(e){ var b = e.target.closest("[data-fix]"); if(b) reveal(fixes[+b.dataset.fix].el); });
}

window.LOR_ICONS = LOR_ICONS;  /* до вызова lorTextbook: значки разделов учебника берутся отсюда */
if(typeof lorTables === "function") lorTables();
if(typeof lorAlgorithms === "function") lorAlgorithms();
if(typeof lorTextbook === "function") lorTextbook();
window.lorIcon = gicon;
}

/* ---------- переходы без перезагрузки ---------- */
/* Ссылка на страницу справочника: страница берётся из кэша (service worker), из неё в документ переносится только
   содержимое <body> (без шапки, меню и окон, которые уже есть), атрибуты <body>, заголовок и стили страницы;
   скрипты страницы выполняются, общие (shell, data, grls, app) — нет. Если что-то пошло не так — обычный переход. */
var KEEP = {"top":1, "results":1, "scrim":1, "pop":1, "moreSheet":1, "ask":1, "toast":1, "menu":1};
var SHARED = /assets\/(shell|data|grls|app)\.js/;
var pageAbort = null;
window.lorPageSignal = function(){ return pageAbort ? pageAbort.signal : undefined; };
function isKept(el){ return el.id && KEEP[el.id] || el.classList && (el.classList.contains("top") || el.classList.contains("offline-bar")); }
function runScripts(list){
  return list.reduce(function(chain, sc){
    return chain.then(function(){
      return new Promise(function(done){
        var n = document.createElement("script");
        if(sc.src){ n.src = sc.src; n.onload = n.onerror = function(){ done(); }; document.body.appendChild(n); }
        else { n.textContent = sc.text; document.body.appendChild(n); done(); }
      });
    });
  }, Promise.resolve());
}
function swap(html, url){
  var doc = new DOMParser().parseFromString(html, "text/html");
  if(!doc.body || !doc.querySelector("main")) throw new Error("не страница справочника");
  if(pageAbort) pageAbort.abort();
  pageAbort = window.AbortController ? new AbortController() : null;
  closeSheets(); closeResults(); qIn.blur();
  document.querySelectorAll(".help-ring, .help-box").forEach(function(x){ x.remove(); });
  /* стили страницы из <head> (например, у словаря и «Препаратов») */
  document.querySelectorAll("head style[data-page]").forEach(function(x){ x.remove(); });
  doc.querySelectorAll("head style").forEach(function(st){ if(/@view-transition/.test(st.textContent)) return; var n = document.createElement("style"); n.dataset.page = "1"; n.textContent = st.textContent; document.head.appendChild(n); });
  /* атрибуты <body> */
  Array.prototype.slice.call(document.body.attributes).forEach(function(a){ if(a.name === "class" || a.name.indexOf("data-") === 0) document.body.removeAttribute(a.name); });
  Array.prototype.slice.call(doc.body.attributes).forEach(function(a){ document.body.setAttribute(a.name, a.value); });
  netState();
  /* содержимое */
  Array.prototype.slice.call(document.body.children).forEach(function(el){ if(!isKept(el)) el.remove(); });
  var scripts = [], anchorEl = $("results").nextSibling;
  Array.prototype.slice.call(doc.body.childNodes).forEach(function(n){
    if(n.nodeType === 1 && n.tagName === "SCRIPT"){
      var src = n.getAttribute("src");
      if(src && SHARED.test(src)) return;
      if(!src && (/serviceWorker/.test(n.textContent) || n.type === "speculationrules")) return;
      scripts.push({src: src ? new URL(src, url).href : "", text: n.textContent});
      return;
    }
    document.body.insertBefore(document.importNode(n, true), anchorEl);
  });
  document.title = doc.title;
  window.LOR_VERIFY = null;
  return runScripts(scripts.filter(function(x){ return x.src; })).then(function(){
    initPage();
    return runScripts(scripts.filter(function(x){ return !x.src; }));
  }).then(function(){ if(window.lorTour) window.lorTour(); });
}
var navSeq = 0;
function go(url, push){
  var u = new URL(url, location.href), my = ++navSeq;
  if(push) history.pushState({lor:1}, "", u.href);  /* адрес меняется сразу: «назад» работает даже во время загрузки */
  return fetch(u.href.split("#")[0]).then(function(r){ if(!r.ok) throw new Error(r.status); return r.text(); }).then(function(html){
    if(my !== navSeq) return;  /* пока грузилось, нажали другую ссылку — этот ответ уже не нужен */
    var run = function(){
      var p = swap(html, u.href);
      if(!u.hash) window.scrollTo(0, 0);
      return p;
    };
    if(document.startViewTransition && document.visibilityState === "visible" && root.dataset.anim !== "off") document.startViewTransition(run);
    else run();
  }).catch(function(){ if(my === navSeq) location.href = u.href; });
}
document.addEventListener("click", function(e){
  if(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  var a = e.target.closest("a[href]"); if(!a) return;
  if((a.target && a.target !== "_self") || a.hasAttribute("download") || a.classList.contains("ext")) return;
  var u = new URL(a.getAttribute("href"), location.href);
  if(u.origin !== location.origin || !/\.html$|\/$/.test(u.pathname)) return;
  if(u.pathname === location.pathname && u.search === location.search) return;  /* якорь на этой же странице — как обычно */
  e.preventDefault();
  go(u.href, true);
});
addEventListener("popstate", function(){ go(location.href, false); });
try{ history.replaceState({lor:1}, "", location.href); }catch(err){}

pageAbort = window.AbortController ? new AbortController() : null;
initPage();
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
    {id:"menu", sel:"#menuBtn", text:"Кнопка с тремя полосками открывает меню: главная страница, препараты, коды МКБ-10, все разборы в PDF, источники, тема оформления и размер текста."},
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
      pad = 0;  /* рамка по краю элемента, не поверх соседнего текста (ревизия 26.10.2026, B8) */
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
  function start(){
    close(); queue = []; i = 0;
    B = document.body.dataset; home = document.body.classList.contains("home"); tabs = document.getElementById("tabbar");
    if(off) return;
    setTimeout(function(){ build(); if(queue.length){ document.addEventListener("keydown", onKey); show(); } }, 500);
  }
  window.lorTour = start;
  addEventListener("load", start);
  addEventListener("resize", function(){ if(box) show(); });
})();

/* на телефоне заголовки колонок скрыты: каждой ячейке — подпись её колонки, иначе «++» или «1 / 0 / −1» непонятно к чему относятся.
   Вызывается из initPage() на каждом экране */
function lorTables(){
  document.querySelectorAll("table").forEach(function(t){
    var ths = t.querySelectorAll("thead th"); if(ths.length < 2) return;
    var names = [].map.call(ths, function(th){ var c = th.cloneNode(true); c.querySelectorAll("small,sup").forEach(function(x){ x.remove(); }); return c.textContent.replace(/\s+/g, " ").trim(); });
    /* подпись, повторяющая заголовок таблицы, не нужна: «Показания к тонзиллэктомии:» под каждой строкой — шум */
    var wrap = t.closest(".tbl-wrap"), prev = wrap && wrap.previousElementSibling, title = "";
    if(prev && /^H[34]$/.test(prev.tagName)){ var c = prev.cloneNode(true); c.querySelectorAll("small").forEach(function(x){ x.remove(); }); title = c.textContent.replace(/\s+/g, " ").trim().toLowerCase(); }
    names = names.map(function(n){ return n.toLowerCase() === title ? "" : n; });
    t.classList.add("lbl");
    /* 4+ колонки и длинный текст в ячейках — карточками (класс stack) */
    var tds = t.querySelectorAll("tbody td:not([colspan])"), len = 0;
    [].forEach.call(tds, function(td){ len += td.textContent.trim().length; });
    if(names.length >= 4 && tds.length && len / tds.length > 22 && !t.classList.contains("cmp")) t.classList.add("stack");
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
}

/* Интерактивный навигатор по клиническим алгоритмам:
   Позволяет переключать 3 режима («По шагам», «Все шаги», «Схема-граф»),
   вести врача по веткам алгоритма с историей выбора («Назад», «Сначала»)
   и синхронизирует выбранный шаг с карточками и узлами SVG-схемы. */
function lorAlgorithms(){
  var savedMode = "wiz";
  try{ savedMode = localStorage.getItem("lor-alg-mode") || "wiz"; }catch(e){}
  if(["wiz","steps","graph"].indexOf(savedMode) < 0) savedMode = "wiz";

  var TYPE_LABELS = {
    "as-start": "Начало алгоритма",
    "as-step": "Действие врача",
    "as-q": "Клиническая развилка · Вопрос",
    "as-warn": "Особое внимание",
    "as-end": "Завершение · Тактика"
  };

  document.querySelectorAll("figure.fig-alg").forEach(function(fig){
    if(fig.dataset.algReady) return;
    /* Для тривиальных (формальных) схем 3 вкладки («По шагам / Все шаги / Схема-граф») не создаются:
       в разметке уже показан краткий клинический пересказ и свёрнутый спойлер с оригинальной схемой */
    if(fig.dataset.trivial === "1" || fig.classList.contains("fig-alg-trivial")){
      fig.dataset.algReady = "1";
      return;
    }
    var ol = fig.querySelector("ol.alg-steps");
    if(!ol) return;
    var items = [].slice.call(ol.querySelectorAll(":scope > li"));
    if(!items.length) return;
    fig.dataset.algReady = "1";

    /* Собираем карту шагов из <ol class="alg-steps"> */
    var stepsMap = {}, idToNum = {};
    items.forEach(function(li, idx){
      var num = +(li.dataset.step || (idx + 1));
      li.dataset.step = String(num);
      var cls = (li.className.match(/as-(?:start|step|q|warn|end)/) || ["as-step"])[0];
      var tEl = li.querySelector(".as-t"), cEl = li.querySelector(".as-card");
      /* в режиме «По шагам» — литературная карточка ситуации с вопросом (verify/alg/<код>.cards.json), иначе текст блока схемы */
      var textHtml = cEl ? cEl.innerHTML : (tEl ? tEl.innerHTML : "");
      var textPlain = tEl ? tEl.textContent.replace(/\s+/g, " ").trim() : "";
      var btns = [].map.call(li.querySelectorAll(".as-go"), function(b){
        return {
          toId: b.dataset.to,
          label: b.textContent.replace(/\s+/g, " ").trim(),
          cls: b.classList.contains("as-yes") ? "as-yes" : (b.classList.contains("as-no") ? "as-no" : "")
        };
      });
      stepsMap[num] = {num: num, id: li.id, cls: cls, html: textHtml, plain: textPlain, btns: btns, li: li};
      if(li.id) idToNum[li.id] = num;
    });

    /* Строим панель переключения режимов и контейнер пошагового мастера */
    var toolbar = document.createElement("div");
    toolbar.className = "alg-toolbar";
    toolbar.innerHTML = '<div class="alg-modes" role="tablist" aria-label="Режим просмотра алгоритма">'
      + '<button type="button" role="tab" data-amode="wiz" aria-selected="true">По шагам</button>'
      + '<button type="button" role="tab" data-amode="steps" aria-selected="false">Все (' + items.length + ')</button>'
      + '<button type="button" role="tab" data-amode="graph" aria-selected="false">Схема</button>'
      + '</div>';

    var wiz = document.createElement("div");
    wiz.className = "alg-wiz";

    ol.parentNode.insertBefore(toolbar, ol);
    ol.parentNode.insertBefore(wiz, ol);

    var historyTrail = [1];
    var curStep = 1;

    function syncHighlight(num){
      items.forEach(function(li){
        li.classList.toggle("as-active", +li.dataset.step === num);
      });
      fig.querySelectorAll(".fc-n[data-step]").forEach(function(n){
        n.classList.toggle("fc-active", +n.dataset.step === num);
      });
      fig.querySelectorAll(".fc-e[data-from]").forEach(function(e){
        var isAct = +e.dataset.from === num || +e.dataset.to === num;
        e.classList.toggle("fc-active-edge", isAct);
        if(e.hasAttribute("marker-end")){
          e.setAttribute("marker-end", isAct ? "url(#fc-arr-act)" : "url(#fc-arr)");
        }
      });
    }

    function renderWiz(){
      var st = stepsMap[curStep] || stepsMap[1];
      if(!st) return;
      syncHighlight(st.num);

      /* Хлебные крошки пройденных шагов */
      var trailHtml = '<div class="aw-trail" aria-label="Пройденные шаги">';
      historyTrail.forEach(function(n, idx){
        var s = stepsMap[n]; if(!s) return;
        var shortTxt = s.plain.length > 26 ? s.plain.slice(0, 24).replace(/\s\S*$/, "") + "…" : s.plain;
        if(idx > 0) trailHtml += '<span class="aw-sep" aria-hidden="true">→</span>';
        trailHtml += '<button type="button" class="aw-crumb' + (idx === historyTrail.length - 1 ? ' aw-crumb-cur' : '') + '" data-tidx="' + idx + '" title="Шаг ' + n + ': ' + s.plain.replace(/"/g, "&quot;") + '">'
          + '<span>Шаг ' + n + '</span>' + (historyTrail.length <= 4 ? ' · <span>' + shortTxt + '</span>' : '') + '</button>';
      });
      trailHtml += '</div>';

      /* Кнопки перехода из текущего шага */
      var actHtml = "";
      if(st.btns.length){
        actHtml = '<div class="aw-actions">';
        st.btns.forEach(function(b){
          var targetNum = idToNum[b.toId] || 1;
          var targetStep = stepsMap[targetNum];
          var mainLbl = b.label.replace(/\s*→\s*шаг\s*\d+$/i, "").replace(/\s*\(шаг\s*\d+\)\s*→$/i, "").trim();
          /* у ответа-варианта подпись уже говорит сама за себя; «Шаг N: …» — только под безымянным «Далее» */
          var subTxt = targetStep && /^Далее$/i.test(mainLbl) ? ("Шаг " + targetNum + ": " + targetStep.plain) : "";
          actHtml += '<button type="button" class="aw-btn ' + b.cls + '" data-gonum="' + targetNum + '">'
            + '<span><span class="aw-btn-main">' + mainLbl + '</span>'
            + (subTxt ? '<span class="aw-btn-sub">' + subTxt + '</span>' : '')
            + '</span><span class="aw-btn-arr" aria-hidden="true">→</span></button>';
        });
        actHtml += '</div>';
      } else {
        actHtml = '<div class="aw-done"><span>✓ Конечная точка маршрута достигнута. Вы можете вернуться на шаг назад или начать алгоритм сначала.</span></div>';
      }

      /* Навигация: Назад / Сначала / Показать на схеме */
      var navHtml = '<div class="aw-nav">'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
        + '<button type="button" class="aw-nav-btn" data-aw="prev"' + (historyTrail.length <= 1 ? ' disabled' : '') + '>← Назад</button>'
        + '<button type="button" class="aw-nav-btn" data-aw="reset"' + (historyTrail.length <= 1 && curStep === 1 ? ' disabled' : '') + '>↺ Сначала</button>'
        + '</div>'
        + '<button type="button" class="aw-nav-btn" data-aw="tograph">Показать на схеме ›</button>'
        + '</div>';

      wiz.innerHTML = trailHtml
        + '<div class="aw-card ' + st.cls + '">'
        + '<div class="aw-head"><span class="aw-badge">Шаг ' + st.num + ' из ' + items.length + ' · ' + (TYPE_LABELS[st.cls] || "Шаг") + '</span></div>'
        + '<div class="aw-body">' + st.html + '</div>'
        + actHtml
        + navHtml
        + '</div>';
    }

    function setMode(m, save){
      fig.dataset.mode = m;
      toolbar.querySelectorAll("[data-amode]").forEach(function(b){
        b.setAttribute("aria-selected", String(b.dataset.amode === m));
      });
      if(save){
        try{ localStorage.setItem("lor-alg-mode", m); }catch(e){}
      }
      renderWiz();
    }

    toolbar.addEventListener("click", function(e){
      var b = e.target.closest("[data-amode]"); if(!b) return;
      setMode(b.dataset.amode, true);
    });

    wiz.addEventListener("click", function(e){
      var goBtn = e.target.closest("[data-gonum]");
      if(goBtn){
        var nextNum = +goBtn.dataset.gonum;
        if(stepsMap[nextNum]){
          curStep = nextNum;
          historyTrail.push(nextNum);
          renderWiz();
        }
        return;
      }
      var crumb = e.target.closest("[data-tidx]");
      if(crumb){
        var tidx = +crumb.dataset.tidx;
        historyTrail = historyTrail.slice(0, tidx + 1);
        curStep = historyTrail[historyTrail.length - 1];
        renderWiz();
        return;
      }
      var navBtn = e.target.closest("[data-aw]");
      if(navBtn){
        var act = navBtn.dataset.aw;
        if(act === "prev" && historyTrail.length > 1){
          historyTrail.pop();
          curStep = historyTrail[historyTrail.length - 1];
          renderWiz();
        } else if(act === "reset"){
          historyTrail = [1];
          curStep = 1;
          renderWiz();
        } else if(act === "tograph"){
          setMode("graph", false);
        }
      }
    });

    /* Клик по кружку с номером шага в режиме «Все шаги» открывает этот шаг в интерактивном мастере */
    ol.addEventListener("click", function(e){
      var numBadge = e.target.closest(".as-n");
      if(numBadge){
        var li = numBadge.closest("li");
        if(li && li.dataset.step){
          curStep = +li.dataset.step;
          if(historyTrail[historyTrail.length - 1] !== curStep) historyTrail.push(curStep);
          setMode("wiz", false);
        }
      }
    });

    fig._lorGoStep = function(stepNum, switchToWiz){
      if(!stepsMap[stepNum]) return;
      curStep = stepNum;
      if(historyTrail[historyTrail.length - 1] !== stepNum) historyTrail.push(stepNum);
      if(switchToWiz) setMode("wiz", false);
      else renderWiz();
    };
    fig._lorSyncStep = function(stepNum){
      if(!stepsMap[stepNum]) return;
      curStep = stepNum;
      if(historyTrail[historyTrail.length - 1] !== stepNum) historyTrail.push(stepNum);
      renderWiz();
    };

    setMode(savedMode, false);
  });
}

/* ---------- Учебник: витрина глав (uchebnik.html) и современная верстка всех 17 глав (uchebnik-*.html) ---------- */
function lorTextbook(){
  var ICONS = window.LOR_ICONS || {};
  document.querySelectorAll("[data-ico]").forEach(function(el){
    var id = el.dataset.ico;
    if(id && ICONS[id] && !el.querySelector("svg")){
      el.dataset.icoType = id;
      el.innerHTML = '<svg class="gh-ico" viewBox="0 0 48 48" aria-hidden="true">' + ICONS[id] + '</svg>';
    }
  });

  var filters = document.getElementById("tbFilters");
  if(filters && !filters.dataset.ready){
    filters.dataset.ready = "1";
    filters.addEventListener("click", function(e){
      var b = e.target.closest("[data-tbf],[data-tb-filter]");
      if(!b) return;
      var f = b.dataset.tbf || b.dataset.tbFilter;
      filters.querySelectorAll("[data-tbf],[data-tb-filter]").forEach(function(btn){
        btn.setAttribute("aria-selected", String(btn === b));
      });
      document.querySelectorAll(".tb-grp[data-tb-grp],.tb-grp[data-tb-cat]").forEach(function(grp){
        var c = grp.dataset.tbGrp || grp.dataset.tbCat;
        grp.hidden = !(f === "all" || c === f);
      });
    });
  }

  /* Если открыта одна из 17 глав учебника — преобразуем плоский текст в удобные карточки разделов с оглавлением и навигацией */
  if(document.body.dataset.page !== "textbook" || document.body.classList.contains("tb-hub")) return;
  var main = document.querySelector("main.page");
  var bodyEl = main && main.querySelector(".tb-body");
  if(!main || !bodyEl || main.dataset.tbReady) return;
  main.dataset.tbReady = "1";

  var TB_CHAPTERS = [
    {href:"uchebnik-nos-anatomiya.html", num:"01", title:"Анатомия носа", cat:"nose", catTitle:"Нос и околоносовые пазухи", badge:"Анатомия"},
    {href:"uchebnik-onp-anatomiya.html", num:"02", title:"Анатомия и физиология околоносовых пазух", cat:"nose", catTitle:"Нос и околоносовые пазухи", badge:"Анатомия"},
    {href:"uchebnik-nos-metody.html", num:"03", title:"Методы исследования носа и околоносовых пазух", cat:"nose", catTitle:"Нос и околоносовые пазухи", badge:"Диагностика"},
    {href:"uchebnik-bolezni-polosti-nosa.html", num:"04", title:"Заболевания полости носа", cat:"nose", catTitle:"Нос и околоносовые пазухи", badge:"Клиника"},
    {href:"uchebnik-sinusity.html", num:"05", title:"Синуситы", cat:"nose", catTitle:"Нос и околоносовые пазухи", badge:"Клиника"},
    {href:"uchebnik-ukho-naruzhnoe-srednee.html", num:"06", title:"Наружное и среднее ухо", cat:"ear", catTitle:"Ухо и слуховой анализатор", badge:"Анатомия"},
    {href:"uchebnik-ukho-vnutrennee.html", num:"07", title:"Внутреннее ухо", cat:"ear", catTitle:"Ухо и слуховой анализатор", badge:"Анатомия"},
    {href:"uchebnik-ukho-metody.html", num:"08", title:"Методы исследования уха и слуха", cat:"ear", catTitle:"Ухо и слуховой анализатор", badge:"Диагностика"},
    {href:"uchebnik-bolezni-naruzhnogo-ukha.html", num:"09", title:"Заболевания наружного уха", cat:"ear", catTitle:"Ухо и слуховой анализатор", badge:"Клиника"},
    {href:"uchebnik-ostryi-otit-mastoidit.html", num:"10", title:"Острый и экссудативный средний отит, мастоидит", cat:"ear", catTitle:"Ухо и слуховой анализатор", badge:"Клиника"},
    {href:"uchebnik-hronicheskii-otit-oslozhneniya.html", num:"11", title:"Хронический гнойный средний отит и отогенные осложнения", cat:"ear", catTitle:"Ухо и слуховой анализатор", badge:"Клиника"},
    {href:"uchebnik-tugoukhost-vnutrennee-ukho.html", num:"12", title:"Тугоухость и заболевания внутреннего уха", cat:"ear", catTitle:"Ухо и слуховой анализатор", badge:"Клиника"},
    {href:"uchebnik-glotka-anatomiya.html", num:"13", title:"Анатомия и физиология глотки", cat:"throat", catTitle:"Глотка и лимфоэпителиальное кольцо", badge:"Анатомия"},
    {href:"uchebnik-bolezni-glotki.html", num:"14", title:"Ангины, тонзиллит и фарингит", cat:"throat", catTitle:"Глотка и лимфоэпителиальное кольцо", badge:"Клиника"},
    {href:"uchebnik-gortan-anatomiya.html", num:"15", title:"Анатомия и физиология гортани", cat:"larynx", catTitle:"Гортань, трахея и голосообразование", badge:"Анатомия"},
    {href:"uchebnik-glotka-gortan-metody.html", num:"16", title:"Методы исследования глотки и гортани", cat:"larynx", catTitle:"Гортань, трахея и голосообразование", badge:"Диагностика"},
    {href:"uchebnik-bolezni-gortani.html", num:"17", title:"Заболевания гортани", cat:"larynx", catTitle:"Гортань, трахея и голосообразование", badge:"Клиника"}
  ];

  var fname = (location.pathname.split("/").pop() || "");
  var curIdx = 0;
  TB_CHAPTERS.forEach(function(ch, idx){ if(ch.href === fname) curIdx = idx; });
  var cur = TB_CHAPTERS[curIdx] || TB_CHAPTERS[0];

  /* Верхняя панель навигации по учебнику */
  var h1 = main.querySelector("h1");
  var srcP = main.querySelector(".tb-src");
  var bar = document.createElement("div");
  bar.className = "tb-ch-bar";
  var selOpts = TB_CHAPTERS.map(function(ch, i){
    return '<option value="' + ch.href + '"' + (i === curIdx ? ' selected' : '') + '>' + ch.num + '. ' + ch.title + ' (' + ch.catTitle + ')</option>';
  }).join("");
  bar.innerHTML = '<div class="tb-ch-bar-left">'
    + '<a class="tb-back-btn" href="uchebnik.html">← Все главы учебника</a>'
    + '<span class="tb-ch-meta"><span class="tb-badge">' + cur.badge + '</span><span>Глава ' + cur.num + ' из 17 · ' + cur.catTitle + '</span></span>'
    + '</div>'
    + '<label class="tb-ch-jump"><span>Быстрый переход:</span><select class="tb-ch-sel" aria-label="Выберите главу учебника">' + selOpts + '</select></label>';

  var hero = document.createElement("header");
  hero.className = "tb-ch-hero";
  var icoHtml = window.lorIcon ? window.lorIcon(cur.cat) : "";
  var heroTitleWrap = document.createElement("div");
  heroTitleWrap.className = "tb-ch-hero-in";
  if(icoHtml){
    var icoBox = document.createElement("div");
    icoBox.innerHTML = icoHtml;
    if(icoBox.firstChild) hero.appendChild(icoBox.firstChild);
  }
  if(h1){
    main.insertBefore(bar, h1);
    main.insertBefore(hero, h1);
    heroTitleWrap.appendChild(h1);
  }
  if(srcP) heroTitleWrap.appendChild(srcP);
  hero.appendChild(heroTitleWrap);

  bar.querySelector(".tb-ch-sel").addEventListener("change", function(){
    if(this.value) location.href = this.value;
  });

  /* Оборачиваем каждый раздел <h2> + его абзацы в аккуратную карточку .tb-sec */
  var h2s = [].slice.call(bodyEl.querySelectorAll(":scope > h2"));
  var secList = [];
  h2s.forEach(function(h2, idx){
    var secNum = (idx + 1 < 10 ? "0" : "") + (idx + 1);
    var secId = h2.id || ("r" + (idx + 1));
    h2.removeAttribute("id");
    var sec = document.createElement("section");
    sec.className = "tb-sec";
    sec.id = secId;

    var head = document.createElement("div");
    head.className = "tb-sec-head";
    var numBadge = document.createElement("span");
    numBadge.className = "tb-sec-num";
    numBadge.textContent = secNum;
    head.appendChild(numBadge);

    var content = document.createElement("div");
    content.className = "tb-sec-content";

    bodyEl.insertBefore(sec, h2);
    head.appendChild(h2);
    sec.appendChild(head);
    sec.appendChild(content);

    var next = sec.nextSibling;
    while(next && !(next.nodeType === 1 && next.tagName === "H2")){
      var moveNode = next;
      next = next.nextSibling;
      content.appendChild(moveNode);
    }
    secList.push({id: secId, num: secNum, title: h2.textContent.trim()});
  });

  /* Встроенное оглавление главы + боковое оглавление на широком экране */
  if(secList.length > 1){
    var inlineToc = document.createElement("nav");
    inlineToc.className = "tb-inline-toc";
    inlineToc.setAttribute("aria-label", "Содержание главы");
    inlineToc.innerHTML = '<div class="tb-itoc-head">Содержание главы (' + secList.length + ' ' + (secList.length < 5 ? 'раздела' : 'разделов') + ')</div>'
      + '<div class="tb-itoc-grid">'
      + secList.map(function(s){
        return '<a class="tb-itoc-link" href="#' + s.id + '"><span class="tb-itoc-n">' + s.num + '</span><span>' + s.title + '</span></a>';
      }).join("")
      + '</div>';
    main.insertBefore(inlineToc, bodyEl);
  }

  /* Листалка Предыдущая / Следующая глава и плашка связанных КР */
  var prev = curIdx > 0 ? TB_CHAPTERS[curIdx - 1] : null;
  var nextCh = curIdx < TB_CHAPTERS.length - 1 ? TB_CHAPTERS[curIdx + 1] : null;
  var navFoot = document.createElement("nav");
  navFoot.className = "tb-prevnext";
  navFoot.setAttribute("aria-label", "Переход между главами учебника");
  navFoot.innerHTML = (prev
      ? '<a class="tb-pn-card tb-pn-prev" href="' + prev.href + '"><span class="tb-pn-dir">← Предыдущая глава (' + prev.num + ')</span><b>' + prev.title + '</b><small>' + prev.catTitle + '</small></a>'
      : '<a class="tb-pn-card tb-pn-prev" href="uchebnik.html"><span class="tb-pn-dir">← К оглавлению</span><b>Все 17 глав учебника</b><small>Выбор раздела по органам</small></a>')
    + (nextCh
      ? '<a class="tb-pn-card tb-pn-next" href="' + nextCh.href + '"><span class="tb-pn-dir">Следующая глава (' + nextCh.num + ') →</span><b>' + nextCh.title + '</b><small>' + nextCh.catTitle + '</small></a>'
      : '<a class="tb-pn-card tb-pn-next" href="uchebnik.html"><span class="tb-pn-dir">К оглавлению →</span><b>Все 17 глав учебника</b><small>Выбор раздела по органам</small></a>');
  var noteEl = main.querySelector(".tb-note");
  if(noteEl) main.insertBefore(navFoot, noteEl);
  else main.appendChild(navFoot);
}




/* Словарь: буквы и «← / →» меняют экран без новой записи в истории — «Назад» выходит из словаря туда,
   откуда в него пришли, а не перебирает пролистанные буквы (просьба 26.10.2026) */
document.addEventListener("click", function(e){
  if(document.body.dataset.page !== "glossary") return;
  var a = e.target.closest(".gl-strip a, .gl-pn a");
  if(!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
  var href = a.getAttribute("href");
  if(!href || !/^slovar/.test(href)) return;
  e.preventDefault();
  location.replace(href);
});
