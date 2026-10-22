/* Офлайн-режим: при установке скачивает все файлы справочника, дальше отдаёт их из кэша. Собрано tools/build_site.py. */
var CACHE = "lor-4b412a6de1d8";
var FILES = ["./", "allergicheskii-rinit.html", "assets/app.js", "assets/data.js", "assets/grls.js", "assets/mkb.js", "assets/style.css", "assets/verify-261_2.js", "assets/verify-306_3.js", "assets/verify-309_2.js", "assets/verify-313_3.js", "assets/verify-314_3.js", "assets/verify-662_2.js", "assets/verify-663_2.js", "assets/verify-664_2.js", "assets/verify-683_2.js", "assets/verify-698_2.js", "assets/verify-815_1.js", "assets/verify-955_1.js", "assets/verify-977_1.js", "data/grls.json", "data/search.json", "gipertrofiya-adenoidov-gipertrofiya-nebnyh-mindalin.html", "hronicheskii-sinusit.html", "hronicheskii-srednii-otit.html", "hronicheskii-tonzillit.html", "img/261_2-p24.jpg", "img/261_2-p83.jpg", "img/306_3-p19.jpg", "img/306_3-p20.jpg", "img/306_3-p21.jpg", "img/309_2-p16.jpg", "img/309_2-p17.jpg", "img/309_2-p18.jpg", "img/313_3-p10.jpg", "img/313_3-p19.jpg", "img/313_3-p20.jpg", "img/313_3-p24.jpg", "img/314_3-p13.jpg", "img/314_3-p21.jpg", "img/314_3-p22.jpg", "img/314_3-p23.jpg", "img/314_3-p9.jpg", "img/662_2-p24.jpg", "img/663_2-p15.jpg", "img/663_2-p16.jpg", "img/664_2-p22.jpg", "img/683_2-p46.jpg", "img/815_1-p17.jpg", "img/815_1-p18.jpg", "img/815_1-p19.jpg", "img/955_1-p22.jpg", "img/977_1-p11.jpg", "img/977_1-p8.jpg", "index.html", "istochniki.html", "kak-polzovatsya.html", "mkb.html", "naruzhnye-otity.html", "nosovoe-krovotechenie.html", "ostryi-laringit.html", "ostryi-sinusit.html", "ostryi-tonzillit-faringit.html", "otit-srednii-ostryi.html", "paratonzillyarnyi-abscess.html", "pdf/allergicheskii-rinit.pdf", "pdf/gipertrofiya-adenoidov-gipertrofiya-nebnyh-mindalin.pdf", "pdf/hronicheskii-sinusit.pdf", "pdf/hronicheskii-srednii-otit.pdf", "pdf/hronicheskii-tonzillit.pdf", "pdf/mkb-10.pdf", "pdf/naruzhnye-otity.pdf", "pdf/nosovoe-krovotechenie.pdf", "pdf/ostryi-laringit.pdf", "pdf/ostryi-sinusit.pdf", "pdf/ostryi-tonzillit-faringit.pdf", "pdf/otit-srednii-ostryi.pdf", "pdf/paratonzillyarnyi-abscess.pdf", "pdf/travma-nosa.pdf", "pdf/vse-razbory.pdf", "preparaty.html", "travma-nosa.html", "icon-192.png", "icon-512.png", "manifest.webmanifest"];
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, {ignoreSearch:true}).then(function(r){
    return r || fetch(e.request).catch(function(){ return caches.match("index.html"); });
  }));
});
