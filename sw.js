/* Офлайн-режим: при установке скачивает все файлы справочника, дальше отдаёт их из кэша. Собрано tools/build_site.py. */
var CACHE = "lor-82c58b5c9bd7";
var FILES = ["./", "abscess-furunkul-nosa-karbunkul-nosa.html", "allergicheskii-rinit.html", "assets/app.js", "assets/data.js", "assets/grls.js", "assets/mkb.js", "assets/style.css", "assets/verify-18_2.js", "assets/verify-261_2.js", "assets/verify-306_3.js", "assets/verify-309_2.js", "assets/verify-311_2.js", "assets/verify-313_3.js", "assets/verify-314_3.js", "assets/verify-315_4.js", "assets/verify-518_3.js", "assets/verify-662_2.js", "assets/verify-663_2.js", "assets/verify-664_2.js", "assets/verify-683_2.js", "assets/verify-698_2.js", "assets/verify-724_2.js", "assets/verify-815_1.js", "assets/verify-890_1.js", "assets/verify-955_1.js", "assets/verify-956_1.js", "assets/verify-977_1.js", "bolezn-menera.html", "data/grls.json", "data/search.json", "gipertrofiya-adenoidov-gipertrofiya-nebnyh-mindalin.html", "hronicheskii-sinusit.html", "hronicheskii-srednii-otit.html", "hronicheskii-tonzillit.html", "img/18_2-p34.jpg", "img/261_2-p24.jpg", "img/261_2-p83.jpg", "img/306_3-p19.jpg", "img/306_3-p20.jpg", "img/306_3-p21.jpg", "img/309_2-p16.jpg", "img/309_2-p17.jpg", "img/309_2-p18.jpg", "img/311_2-p14.jpg", "img/311_2-p6.jpg", "img/313_3-p10.jpg", "img/313_3-p16.jpg", "img/313_3-p17.jpg", "img/313_3-p19.jpg", "img/313_3-p20.jpg", "img/313_3-p24.jpg", "img/314_3-p13.jpg", "img/314_3-p21.jpg", "img/314_3-p22.jpg", "img/314_3-p23.jpg", "img/314_3-p9.jpg", "img/315_4-p42.jpg", "img/315_4-p47.jpg", "img/518_3-p18.jpg", "img/518_3-p21.jpg", "img/518_3-p22.jpg", "img/518_3-p25.jpg", "img/518_3-p26.jpg", "img/518_3-p7.jpg", "img/518_3-p8.jpg", "img/518_3-p9.jpg", "img/662_2-p24.jpg", "img/663_2-p15.jpg", "img/663_2-p16.jpg", "img/664_2-p22.jpg", "img/683_2-p46.jpg", "img/724_2-p72.jpg", "img/724_2-p73.jpg", "img/724_2-p74.jpg", "img/724_2-p77.jpg", "img/815_1-p17.jpg", "img/815_1-p18.jpg", "img/815_1-p19.jpg", "img/890_1-p11.jpg", "img/890_1-p33.jpg", "img/890_1-p37.jpg", "img/955_1-p22.jpg", "img/956_1-p16.jpg", "img/956_1-p17.jpg", "img/956_1-p19.jpg", "img/977_1-p11.jpg", "img/977_1-p8.jpg", "index.html", "istochniki.html", "kak-polzovatsya.html", "mastoidit.html", "mkb.html", "naruzhnye-otity.html", "neirosensornaya-tugoukhost-u-vzroslykh.html", "nosovoe-krovotechenie.html", "obrazec-lechenie-ostryi-sinusit.html", "ostrye-respiratornye-virusnye-infektsii-orvi-u-vzroslykh.html", "ostryi-laringit.html", "ostryi-sinusit.html", "ostryi-tonzillit-faringit.html", "otit-srednii-ostryi.html", "otoskleroz.html", "paratonzillyarnyi-abscess.html", "pdf/abscess-furunkul-nosa-karbunkul-nosa.pdf", "pdf/allergicheskii-rinit.pdf", "pdf/bolezn-menera.pdf", "pdf/gipertrofiya-adenoidov-gipertrofiya-nebnyh-mindalin.pdf", "pdf/hronicheskii-sinusit.pdf", "pdf/hronicheskii-srednii-otit.pdf", "pdf/hronicheskii-tonzillit.pdf", "pdf/mastoidit.pdf", "pdf/mkb-10.pdf", "pdf/naruzhnye-otity.pdf", "pdf/neirosensornaya-tugoukhost-u-vzroslykh.pdf", "pdf/nosovoe-krovotechenie.pdf", "pdf/ostrye-respiratornye-virusnye-infektsii-orvi-u-vzroslykh.pdf", "pdf/ostryi-laringit.pdf", "pdf/ostryi-sinusit.pdf", "pdf/ostryi-tonzillit-faringit.pdf", "pdf/otit-srednii-ostryi.pdf", "pdf/otoskleroz.pdf", "pdf/paratonzillyarnyi-abscess.pdf", "pdf/polipoznyi-rinosinusit.pdf", "pdf/travma-nosa.pdf", "pdf/vse-razbory.pdf", "polipoznyi-rinosinusit.html", "preparaty.html", "travma-nosa.html", "icon-192.png", "icon-512.png", "manifest.webmanifest"];
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
/* Сначала сеть (чтобы при интернете всегда была свежая версия), без сети — сохранённая копия.
   Большие неизменные файлы (PDF, картинки страниц, реестр ГРЛС) — сразу из копии, чтобы не качать заново. */
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var u = new URL(e.request.url);
  if(u.origin !== location.origin) return;
  var heavy = /\.(pdf|jpg|png)$|grls\.json$/.test(u.pathname);
  if(heavy){
    e.respondWith(caches.match(e.request, {ignoreSearch:true}).then(function(r){ return r || fetch(e.request); }));
    return;
  }
  e.respondWith(fetch(e.request).then(function(r){
    if(r && r.ok){ var c = r.clone(); caches.open(CACHE).then(function(cache){ cache.put(e.request, c); }); }
    return r;
  }).catch(function(){
    return caches.match(e.request, {ignoreSearch:true}).then(function(r){ return r || caches.match("index.html"); });
  }));
});
