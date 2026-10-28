/* Офлайн-режим и быстрые переходы. Собрано tools/build_site.py (схема установки — по правке от 26.10.2026: ядро сразу, остальное в фоне).
   При установке новой версии сразу обновляется ядро (шапка, стили, скрипты, главные экраны),
   старый кэш мгновенно удаляется, страница один раз перезагружается, а остальные файлы
   докачиваются в фоне пачками для полного офлайн-режима. */
var CACHE = "lor-2c5a8c05732b", MEDIA = "lor-media";
var CORE = ["./", "index.html", "assets/style.css?v=2c5a8c05732b", "assets/shell.js?v=2c5a8c05732b", "assets/app.js?v=2c5a8c05732b", "assets/data.js?v=2c5a8c05732b", "assets/grls.js?v=2c5a8c05732b", "assets/mkb.js?v=2c5a8c05732b", "assets/style.css", "assets/shell.js", "assets/app.js", "assets/data.js", "assets/grls.js", "assets/mkb.js", "data/drug-info.json", "data/drug-picks.json", "assets/fonts/lora-cyr.woff2", "assets/fonts/lora-lat.woff2", "assets/fonts/lora-cyr-italic.woff2", "preparaty.html", "uchebnik.html", "mkb.html", "slovar.html", "istochniki.html", "naruzhnye-otity.html", "ostryi-sinusit.html", "otit-srednii-ostryi.html"];
var FILES = ["./", "abscess-furunkul-nosa-karbunkul-nosa.html", "allergicheskii-rinit.html", "anafilakticheskii-shok.html", "anomalii-zubochelyustnoi-sistemy.html", "assets/app.js", "assets/data.js", "assets/fonts/lora-cyr-italic.woff2", "assets/fonts/lora-cyr.woff2", "assets/fonts/lora-lat-italic.woff2", "assets/fonts/lora-lat.woff2", "assets/fonts/lora-latext-italic.woff2", "assets/fonts/lora-latext.woff2", "assets/fonts/OFL.txt", "assets/grls.js", "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/icon.svg", "assets/mkb.js", "assets/shell.js", "assets/style.css", "assets/tb-chapters.js", "assets/verify-1020_1.js", "assets/verify-1023_1.js", "assets/verify-1024_1.js", "assets/verify-1049_1.js", "assets/verify-1050_1.js", "assets/verify-1082_1.js", "assets/verify-116_2.js", "assets/verify-162_3.js", "assets/verify-164_2.js", "assets/verify-169_2.js", "assets/verify-18_2.js", "assets/verify-197_2.js", "assets/verify-21_3.js", "assets/verify-22_3.js", "assets/verify-249_2.js", "assets/verify-25_3.js", "assets/verify-260_3.js", "assets/verify-261_2.js", "assets/verify-263_2.js", "assets/verify-264_2.js", "assets/verify-267_2.js", "assets/verify-27_2.js", "assets/verify-295_4.js", "assets/verify-304_2.js", "assets/verify-305_2.js", "assets/verify-306_3.js", "assets/verify-309_2.js", "assets/verify-311_2.js", "assets/verify-313_3.js", "assets/verify-314_3.js", "assets/verify-315_4.js", "assets/verify-329_2.js", "assets/verify-332_2.js", "assets/verify-352_3.js", "assets/verify-359_3.js", "assets/verify-3_2.js", "assets/verify-402_2.js", "assets/verify-475_3.js", "assets/verify-492_2.js", "assets/verify-4_2.js", "assets/verify-518_3.js", "assets/verify-535_3.js", "assets/verify-553_2.js", "assets/verify-563_2.js", "assets/verify-58_2.js", "assets/verify-609_2.js", "assets/verify-632_2.js", "assets/verify-662_2.js", "assets/verify-663_2.js", "assets/verify-664_2.js", "assets/verify-66_4.js", "assets/verify-683_2.js", "assets/verify-687_3.js", "assets/verify-698_2.js", "assets/verify-710_2.js", "assets/verify-724_2.js", "assets/verify-734_2.js", "assets/verify-735_1.js", "assets/verify-736_2.js", "assets/verify-749_2.js", "assets/verify-74_2.js", "assets/verify-756_1.js", "assets/verify-75_2.js", "assets/verify-779_1.js", "assets/verify-810_1.js", "assets/verify-812_1.js", "assets/verify-813_1.js", "assets/verify-815_1.js", "assets/verify-821_1.js", "assets/verify-842_1.js", "assets/verify-848_1.js", "assets/verify-867_1.js", "assets/verify-871_1.js", "assets/verify-890_1.js", "assets/verify-895_1.js", "assets/verify-913_1.js", "assets/verify-931_1.js", "assets/verify-943_1.js", "assets/verify-955_1.js", "assets/verify-956_1.js", "assets/verify-977_1.js", "assets/verify-995_1.js", "assets/verify-997_1.js", "bolezn-menera.html", "bronkhialnaya-astma.html", "data/drug-info.json", "data/drug-picks.json", "data/grls-collect.js", "data/grls-forms.json.gz", "data/grls.json", "data/kr-regs.json", "data/search.json", "deformatsiya-peregorodki-nosa.html", "differentsirovannyi-rak-shchitovidnoi-zhelezy.html", "distoniya.html", "dobrokachestvennye-obrazovaniya-golovy-i-shei.html", "dobrokachestvennye-osteo-khondrogennye-opukholi-nosa.html", "gerb-u-detei.html", "gipertrofiya-adenoidov-gipertrofiya-nebnyh-mindalin.html", "golovnaya-bol-napryazheniya-u-detei.html", "golovnaya-bol-napryazheniya.html", "gribkovyi-otit.html", "gripp-u-detei.html", "gripp-u-vzroslykh.html", "hronicheskii-sinusit.html", "hronicheskii-srednii-otit.html", "hronicheskii-tonzillit.html", "img/audiograms.svg", "img/tympanograms.svg", "index.html", "inorodnoe-telo-v-pishchevaritelnom-trakte.html", "istochniki.html", "kak-polzovatsya.html", "khimicheskii-ozhog-pishchevoda.html", "khronicheskii-rinit.html", "kisty-chelyustno-litsevoi-oblasti-i-shei.html", "koklyush-u-detei.html", "kor.html", "koronavirusnaya-infektsiya-covid-19.html", "kranialnye-mononeiropatii.html", "krapivnitsa.html", "krup-epiglottit-otek-gortani.html", "malformaciya-krovenosnyh-sosudov-golovy-i-shei.html", "mastoidit.html", "medullyarnyi-rak-shchitovidnoi-zhelezy.html", "meningokokkovaya-infektsiya-u-detei.html", "meningokokkovaya-infektsiya-u-vzroslykh.html", "migren-u-detei.html", "migren.html", "mkb.html", "mnozhestvennye-perelomy-mozgovogo-i-litsevogo-cherepa.html", "naruzhnye-otity.html", "naruzhnyi-otit-u-detei.html", "nasledstvennyi-angiootek.html", "neirosensornaya-tugoukhost-u-detei.html", "neirosensornaya-tugoukhost-u-vzroslykh.html", "nosovoe-krovotechenie.html", "obrazec-lechenie-ostryi-sinusit.html", "odontogennyi-osteomielit-chelyusti.html", "opukholi-slyunnykh-zhelez-u-detei.html", "orvi-u-detei.html", "ostrye-respiratornye-virusnye-infektsii-orvi-u-vzroslykh.html", "ostryi-laringit.html", "ostryi-sinusit.html", "ostryi-tonzillit-faringit.html", "otit-srednii-ostryi.html", "otoskleroz.html", "ozhogi-dykhatelnykh-putei.html", "paratonzillyarnyi-abscess.html", "parezy-i-paralichi-gortani.html", "perelom-verhnei-chelyusti.html", "pervichnye-immunodefitsity-nedostatochnost-antitel.html", "polipoznyi-rinosinusit.html", "poterya-slukha-vyzvannaya-shumom.html", "preparaty.html", "prostoi-gerpes-u-vzroslykh.html", "rak-gortani.html", "rak-gortanoglotki.html", "rak-nosoglotki-u-detei.html", "rak-nosoglotki.html", "rak-polosti-nosa-i-pridatochnyh-pazukh.html", "rak-rotoglotki.html", "rak-shchitovidnoi-zhelezy-u-detei.html", "rasshchelina-verhnei-guby-i-neba.html", "rsv-infektsiya-u-detei.html", "sarkoidoz.html", "sifilis.html", "slovar-a.html", "slovar-b.html", "slovar-ch.html", "slovar-d.html", "slovar-e.html", "slovar-ee.html", "slovar-f.html", "slovar-g.html", "slovar-h.html", "slovar-i.html", "slovar-k.html", "slovar-l.html", "slovar-lat-a.html", "slovar-lat-b.html", "slovar-lat-c.html", "slovar-lat-d.html", "slovar-lat-e.html", "slovar-lat-f.html", "slovar-lat-g.html", "slovar-lat-h.html", "slovar-lat-i.html", "slovar-lat-k.html", "slovar-lat-l.html", "slovar-lat-m.html", "slovar-lat-n.html", "slovar-lat-o.html", "slovar-lat-p.html", "slovar-lat-q.html", "slovar-lat-r.html", "slovar-lat-s.html", "slovar-lat-t.html", "slovar-lat-u.html", "slovar-lat-v.html", "slovar-lat-w.html", "slovar-lat-z.html", "slovar-lat.html", "slovar-m.html", "slovar-n.html", "slovar-o.html", "slovar-other.html", "slovar-p.html", "slovar-r.html", "slovar-s.html", "slovar-sch.html", "slovar-sh.html", "slovar-t.html", "slovar-ts.html", "slovar-u.html", "slovar-v.html", "slovar-ya.html", "slovar-z.html", "slovar-zh.html", "slovar.html", "sotryasenie-golovnogo-mozga.html", "travma-gortani.html", "travma-nosa.html", "travma-ukha.html", "uchebnik-bolezni-glotki.html", "uchebnik-bolezni-gortani.html", "uchebnik-bolezni-naruzhnogo-ukha.html", "uchebnik-bolezni-polosti-nosa.html", "uchebnik-glotka-anatomiya.html", "uchebnik-glotka-gortan-metody.html", "uchebnik-gortan-anatomiya.html", "uchebnik-hronicheskii-otit-oslozhneniya.html", "uchebnik-nos-anatomiya.html", "uchebnik-nos-metody.html", "uchebnik-onp-anatomiya.html", "uchebnik-operacii-glotka-gortan.html", "uchebnik-operacii-nos.html", "uchebnik-operacii-ukho.html", "uchebnik-opukholi-glotki.html", "uchebnik-opukholi-gortani.html", "uchebnik-opukholi-nosa.html", "uchebnik-opukholi-ukha.html", "uchebnik-ostryi-otit-mastoidit.html", "uchebnik-povrezhdeniya-glotki.html", "uchebnik-povrezhdeniya-gortani.html", "uchebnik-sinusity.html", "uchebnik-travmy-nosa.html", "uchebnik-travmy-ukha.html", "uchebnik-tugoukhost-vnutrennee-ukho.html", "uchebnik-ukho-metody.html", "uchebnik-ukho-naruzhnoe-srednee.html", "uchebnik-ukho-vestibulyarnye-metody.html", "uchebnik-ukho-vnutrennee.html", "uchebnik.html", "virusnye-meningity-u-detei.html", "vospalitelnye-zabolevaniya-chelyustei-u-detei.html", "vrozhdennaya-tsitomegalovirusnaya-infektsiya.html", "zakladki-kr.html", "zakladki-uchebnik.html", "zlokachestvennye-novoobrazovaniya-guby.html", "zlokachestvennye-novoobrazovaniya-polosti-rta.html", "zlokachestvennye-opukholi-slyunnykh-zhelez.html", "icon-192.png", "icon-512.png", "icon.svg", "manifest.webmanifest"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(CORE.map(function(f){
        return fetch(new Request(f, {cache:"reload", credentials:"same-origin"})).then(function(r){
          if(r && r.ok) return c.put(f, r);
        }).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.filter(function(k){ return k !== CACHE && k !== MEDIA; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){
      return self.clients.claim();
    }).then(function(){
      /* Фоновая докачка остальных страниц без блокировки активации новой версии */
      caches.open(CACHE).then(function(c){
        FILES.forEach(function(f){
          c.match(f).then(function(hit){
            if(!hit){
              fetch(new Request(f, {cache:"reload", credentials:"same-origin"})).then(function(r){
                if(r && r.ok) c.put(f, r);
              }).catch(function(){});
            }
          });
        });
      });
    })
  );
});

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var u = new URL(e.request.url);
  if(u.origin !== location.origin) return;
  var media = /\.(pdf|jpg|gz)$/.test(u.pathname);
  var cleanUrl = u.origin + u.pathname;
  var net = fetch(new Request(e.request.url, {cache:"no-cache", credentials:"same-origin"})).then(function(r){
    if(r && r.ok){
      var c1 = r.clone(), c2 = r.clone();
      caches.open(media ? MEDIA : CACHE).then(function(cache){
        cache.put(e.request, c1);
        if(!media && u.search) cache.put(cleanUrl, c2);
      });
    }
    return r;
  });
  /* PDF — всегда свежие из сети (сохранённая копия только без интернета) */
  if(/\.pdf$/.test(u.pathname)){
    e.respondWith(net.catch(function(){ return caches.match(e.request, {ignoreSearch:true}).then(function(r){ return r || Response.error(); }); }));
    return;
  }
  /* Сначала проверяем точное совпадение URL (с учётом ?v=хэша), чтобы новые стили/скрипты никогда не брались из старого кэша */
  e.respondWith(caches.match(e.request).then(function(exactHit){
    if(exactHit){ e.waitUntil(net.catch(function(){})); return exactHit; }
    return caches.match(e.request, {ignoreSearch:true}).then(function(anyHit){
      if(anyHit && !u.search){ e.waitUntil(net.catch(function(){})); return anyHit; }
      return net.catch(function(){
        if(anyHit) return anyHit;
        return e.request.mode === "navigate" ? caches.match("index.html", {ignoreSearch:true}) : Response.error();
      });
    });
  }));
});
