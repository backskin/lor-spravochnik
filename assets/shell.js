/* Шапка справочника — строится сразу после <body>, до первой отрисовки страницы: при переходе между экранами
   шапка, поиск и кнопки не пропадают и не сдвигают содержимое. Тема и размер текста применяются тут же — без вспышки.
   Подключается первым тегом в <body>; остальное поведение — assets/app.js. */
(function(){
  var B = document.body.dataset, HOME = document.body.classList.contains("home"), root = document.documentElement;
  try{
    var th = localStorage.getItem("lor-theme"); if(th) root.dataset.theme = th;
    var k = localStorage.getItem("lor-k"); if(k) root.style.setProperty("--k", k);
  }catch(e){}
  if(document.getElementById("q")) return;
  document.body.insertAdjacentHTML("afterbegin",
  '<header class="top"><div class="top-in">'
  + '<button class="logo-btn" id="menuBtn" type="button" aria-label="Меню" aria-expanded="false" aria-controls="menu">'
  + '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4.5 7h15M4.5 12h15M4.5 17h15"/></svg></button>'
  + ('<a class="home-btn" id="homeBtn" href="index.html" aria-label="Главная" title="Главная"' + (HOME ? ' aria-current="page"' : "") + '><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/></svg></a>')
  + '<div class="searchbox"><input id="q" type="search" placeholder="' + (B.page === "drugs" ? (innerWidth < 420 ? "Название или вещество" : "Торговое название или вещество") : (innerWidth < 420 ? "Поиск" : "Болезнь, код, препарат")) + '" autocomplete="off" enterkeyhint="search" aria-label="Поиск по справочнику"></div>'
  + '<button class="brand" id="qCancel" type="button" hidden style="color:var(--ac);font-weight:400">Отмена</button>'
  + '<button class="ask-btn" id="askBtn" type="button" aria-expanded="false" aria-controls="ask" aria-label="Спросить ИИ" title="Спросить ИИ"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.5-4.5"/></svg><span>ИИ</span></button>'
  + '</div></header><div class="offline-bar" role="status">Нет интернета — справочник работает, ссылки на сайты и ИИ недоступны</div>'
  + '<div class="results" id="results" hidden><div class="results-in" id="resIn"></div></div>');
})();
