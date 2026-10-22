/* Офлайн-режим. Собрано tools/build_site.py.
   При установке новой версии сохраняются страницы, стили, скрипты и данные (быстро, ~4 МБ); PDF и изображения страниц КР
   сохраняются при первом открытии. Все запросы идут сначала в сеть со сверкой (no-cache: неизменный файл — ответ 304),
   без сети отдаётся сохранённая копия. */
var CACHE = "lor-aa1c553f093b", MEDIA = "lor-media";
var FILES = ["./", "abscess-furunkul-nosa-karbunkul-nosa.html", "allergicheskii-rinit.html", "assets/app.js", "assets/data.js", "assets/grls.js", "assets/mkb.js", "assets/style.css", "assets/verify-18_2.js", "assets/verify-261_2.js", "assets/verify-306_3.js", "assets/verify-309_2.js", "assets/verify-311_2.js", "assets/verify-313_3.js", "assets/verify-314_3.js", "assets/verify-315_4.js", "assets/verify-518_3.js", "assets/verify-662_2.js", "assets/verify-663_2.js", "assets/verify-664_2.js", "assets/verify-683_2.js", "assets/verify-698_2.js", "assets/verify-724_2.js", "assets/verify-815_1.js", "assets/verify-890_1.js", "assets/verify-955_1.js", "assets/verify-956_1.js", "assets/verify-977_1.js", "bolezn-menera.html", "data/grls.json", "data/search.json", "gipertrofiya-adenoidov-gipertrofiya-nebnyh-mindalin.html", "hronicheskii-sinusit.html", "hronicheskii-srednii-otit.html", "hronicheskii-tonzillit.html", "index.html", "istochniki.html", "kak-polzovatsya.html", "mastoidit.html", "mkb.html", "naruzhnye-otity.html", "neirosensornaya-tugoukhost-u-vzroslykh.html", "nosovoe-krovotechenie.html", "obrazec-lechenie-ostryi-sinusit.html", "ostrye-respiratornye-virusnye-infektsii-orvi-u-vzroslykh.html", "ostryi-laringit.html", "ostryi-sinusit.html", "ostryi-tonzillit-faringit.html", "otit-srednii-ostryi.html", "otoskleroz.html", "paratonzillyarnyi-abscess.html", "polipoznyi-rinosinusit.html", "preparaty.html", "slovar.html", "travma-nosa.html", "icon-192.png", "icon-512.png", "manifest.webmanifest"];
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES.map(function(f){ return new Request(f, {cache:"reload"}); })); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE && k !== MEDIA; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var u = new URL(e.request.url);
  if(u.origin !== location.origin) return;
  var media = /\.(pdf|jpg)$/.test(u.pathname);
  e.respondWith(fetch(new Request(e.request.url, {cache:"no-cache", credentials:"same-origin"})).then(function(r){
    if(r && r.ok){ var c = r.clone(); caches.open(media ? MEDIA : CACHE).then(function(cache){ cache.put(e.request, c); }); }
    return r;
  }).catch(function(){
    return caches.match(e.request, {ignoreSearch:true}).then(function(r){ return r || caches.match("index.html"); });
  }));
});
