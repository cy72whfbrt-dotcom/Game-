// Teil 04-stil-shop-handy.php: Stil: Schieber, Shop, Anordnung je Bildschirm, Level-Fenster, Funde auf der Karte

/* =====================================================================
   SLIDER  #attackTroopsSlider  (JS keeps --pct in sync)
   ===================================================================== */
.field-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:4px}
.field-l{font:600 var(--fs-10)/1 var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--tx-3)}
.from-sel{width:100%;min-width:0;height:38px;padding:0 10px;border:1px solid var(--line-2);border-radius:var(--r-xs);background:#12151b;color:var(--tx-1);font:600 16px/1 var(--font-ui);box-sizing:border-box;text-overflow:ellipsis}
.from-sel:focus{outline:none;border-color:var(--gold-300);box-shadow:0 0 0 2px rgba(214,170,90,.25)}
.val{font:500 var(--fs-12)/1 var(--font-ui);color:var(--tx-3);font-variant-numeric:tabular-nums;white-space:nowrap}
.val b{font:600 var(--fs-17)/1 var(--font-ui);color:var(--gold-100)}
.slider{--pct:100%;-webkit-appearance:none;appearance:none;display:block;width:100%;height:28px;margin:0;background:transparent;cursor:pointer;touch-action:pan-y}
.slider:focus-visible{box-shadow:none;outline:none}
.slider:focus-visible::-webkit-slider-thumb{box-shadow:var(--focus)}
.slider::-webkit-slider-runnable-track{height:6px;border-radius:3px;border:1px solid rgba(0,0,0,.6);
  background:linear-gradient(90deg,var(--gold-600),var(--gold-300)) 0 / var(--pct) 100% no-repeat,var(--ink-4);box-shadow:inset 0 1px 2px rgba(0,0,0,.6)}
.slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;margin-top:-8px;border-radius:50%;border:1px solid #2b1f0a;
  background:radial-gradient(circle at 50% 32%,#fbecc0 0,#d7ad5f 45%,#7d5a22 100%);box-shadow:0 0 0 3px rgba(214,170,90,.16),0 2px 5px rgba(0,0,0,.6)}
.slider::-moz-range-track{height:6px;border-radius:3px;background:var(--ink-4)}
.slider::-moz-range-progress{height:6px;border-radius:3px;background:linear-gradient(90deg,var(--gold-600),var(--gold-300))}
.slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;border:1px solid #2b1f0a;background:radial-gradient(circle at 50% 32%,#fbecc0 0,#d7ad5f 45%,#7d5a22 100%)}
.slider:disabled{opacity:.4;cursor:not-allowed}
.seg{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:4px}
.seg button{height:28px;border-radius:var(--r-xs);background:var(--ink-3);border:1px solid var(--line-1);font:600 var(--fs-11)/1 var(--font-ui);color:var(--tx-2);font-variant-numeric:tabular-nums}
@media (pointer:coarse){ .seg button{min-height:36px} .slider{height:40px} }
.seg button.on{color:var(--gold-100);border-color:var(--line-3);background:rgba(214,170,90,.12)}
.seg button:disabled{color:var(--tx-4)}

/* =====================================================================
   SHOP
   ===================================================================== */
/* Shop-Schaufenster (6.10., Vorgabe design_shop.md, Layout A): Waren als Karten – die ganze Karte in der Farbe der Seltenheit
   (Verlauf, Rahmen, Leuchten), gezeichnete Truhe, Name groß, Inhalt eine Zeile, Preis-Knopf unten über die volle Breite
   (Gold = Edelsteine, Navy = Thron-Punkte). Die Epische Kiste groß über beide Spalten. Erklärungen hinter „i“. */
#shopPopup.panel--sheet{--sheet-max:calc(100dvh - var(--safe-t) - var(--hud-top-space) - var(--dock-h) - var(--safe-bd))}   /* (Handy: mehr Platz, damit alle Kisten ohne Scrollen passen) */
@media (max-width:899px) and (min-height:501px){ #shopPopup.panel--sheet:has([data-spane="markt"]:not([hidden])){--sheet-max:min(70dvh,calc(100dvh - var(--safe-t) - var(--hud-top-space) - var(--dock-h) - var(--safe-bd)))} }   /* Markt (kurz): so hoch wie die anderen Fenster, keine leere Fläche */
#shopPopup .phead{min-height:56px;padding-bottom:8px} #shopPopup .phead .overline{display:none} #shopPopup .emblem{width:38px;height:38px}
#shopPopup .phead-text{display:flex;align-items:center;gap:10px;min-width:0} #shopPopup .ptitle{margin:0;flex:none} #shopPopup .psub{min-width:0}
#shopPopup .psub small{display:none}   /* (nur Zahl + Zeichen – „Edelsteine“ steht im title) */
#shopPopup .pbody > .mail-pane:not([hidden]){display:grid;gap:10px;align-content:start}
#shopPopup .sect{min-height:28px} #shopPopup .sect-aside{gap:2px}
.shop-i{display:inline-grid;place-items:center;min-width:44px;min-height:44px;margin:-8px -10px -8px 0;padding:0;background:none;border:0;cursor:pointer}
.shop-i .icon{width:17px;height:17px;color:var(--gold-300)} .shop-i.on .icon{color:var(--gold-100)}
.shop-info{padding:8px 10px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--line-1)} .shop-info .mail-intro{margin:0} .shop-info .mail-intro + .mail-intro,.shop-info .odds + .mail-intro,.shop-info .throne-status + .mail-intro{margin-top:8px}
.shop-info .mail-intro b{color:var(--gold-100);font-weight:600} .shop-info .odds{margin-top:6px}
.waren{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px} .waren--3{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px} .waren-teil{display:contents}
.ware{--c:var(--r-blau);--c1:#173459;--c2:#0c1626;--cr:#3b78bd;position:relative;display:flex;flex-direction:column;min-width:0;padding:8px 10px 0;overflow:hidden;text-align:center;border-radius:12px;
  background:radial-gradient(70% 55% at 50% 36%,color-mix(in srgb,var(--c) 45%,transparent),transparent 70%),linear-gradient(180deg,var(--c1),var(--c2));
  border:1.5px solid var(--cr);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 0 1px rgba(0,0,0,.45),0 6px 16px rgba(0,0,0,.55),0 0 18px -4px color-mix(in srgb,var(--c) 60%,transparent)}
.ware[data-r="grau"]{--c:var(--r-grau);--c1:#2a2e35;--c2:#14171c;--cr:#5b6069} .ware[data-r="gruen"]{--c:var(--r-gruen);--c1:#1d3a24;--c2:#0f1a13;--cr:#3f8a47}
.ware[data-r="lila"]{--c:var(--r-lila);--c1:#3a2160;--c2:#150c26;--cr:#8a57d1} .ware[data-r="gold"]{--c:var(--r-gold);--c1:#4a3613;--c2:#1a1308;--cr:#c29449}
.ware[data-r="navy"]{--c:#e4c886;--c1:#1b2638;--c2:#0d121c;--cr:var(--gold-500,#a27832)}
.ware-bild{position:relative;display:block;height:80px;flex:none} .ware-bild svg{display:block;width:100%;height:100%}
.ware-bild--ic{display:grid;place-items:center} .ware-bild--ic .icon{width:52px;height:52px;color:var(--c);filter:drop-shadow(0 0 8px color-mix(in srgb,var(--c) 70%,transparent))}
.ware-bild--ic i{position:absolute;left:50%;top:50%;transform:translate(-50%,-38%);font:800 15px/1 var(--font-ui);font-style:normal;color:#fff;text-shadow:0 1px 3px #000,0 0 6px #000}
.ware-txt{display:grid;gap:2px;min-width:0;margin-top:2px;flex:1 0 auto;align-content:start}   /* (Name in 2 Zeilen: die Preis-Leisten bleiben auf einer Höhe) */
.ware-name{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;font:600 15px/1.15 var(--font-display);color:var(--tx-1);text-shadow:0 1px 2px #000;overflow:hidden;hyphens:manual}   /* Cinzel ist breit: lieber 2 Zeilen („Ausrüstungs-|kiste“) als „…“ */
.ware-txt small{display:block;font:500 12px/1.3 var(--font-ui);color:var(--tx-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ware-txt small.ware-lang{white-space:normal;text-overflow:clip}   /* (Teleporter: Satz in 2–3 Zeilen statt „Hauptstadt an ei…“) */
.ware-preis{display:flex;align-items:center;justify-content:center;gap:6px;height:44px;margin:8px -10px 0;padding:0 6px;border:0;border-top:1px solid #f6e7bf;cursor:pointer;
  font:800 17px/1 var(--font-ui);color:#1d1406;background:linear-gradient(180deg,#f0dfb0 0%,#d4ad66 45%,#a27832 100%);box-shadow:inset 0 -3px 0 rgba(0,0,0,.25)}
.ware-preis .icon{width:16px;height:16px;color:var(--res-gem);filter:drop-shadow(0 0 1px rgba(0,0,0,.7))}
.ware-preis:active{transform:translateY(1px);filter:brightness(.92)}
.ware-preis.thron{border-top-color:#4a6aa0;color:#f0dfb0;background:linear-gradient(180deg,#2c4a7a,#1b2f52)} .ware-preis.thron .icon{color:var(--gold-200)}
.ware-preis:disabled{cursor:default;border-top-color:#4a4f58;color:#ff8d82;background:linear-gradient(180deg,#3a3f49,#23272e);box-shadow:none} .ware-preis:disabled .icon{filter:grayscale(.6)}
.ware-preis.is-armed{font-size:13px;color:#fff;background:linear-gradient(180deg,#f2a066,#b8562a)}
.band{position:absolute;top:12px;right:-31px;z-index:1;width:120px;text-align:center;transform:rotate(35deg);font:700 10px/19px var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:#1d1406;
  background:linear-gradient(180deg,#f0dfb0,#c29449);box-shadow:0 2px 6px rgba(0,0,0,.5)}
/* die große Karte: Truhe links (130 px), Name/Inhalt rechts, Knopf über die volle Breite; Strahlen + Glanzstreifen */
.ware--gross{grid-column:1/-1;display:grid;grid-template-columns:150px minmax(0,1fr);grid-template-rows:1fr auto;align-items:center;text-align:left}
.ware--gross .ware-bild{height:104px;margin:-4px 0 -2px}
.ware--gross .band{top:0;left:0;right:auto;width:auto;padding:0 12px;transform:none;border-radius:10px 0 10px 0}   /* gerades Band oben links: ganz lesbar */
.ware--gross .ware-bild::before{content:"";position:absolute;inset:-30px -10px;background:conic-gradient(from 0deg,transparent 0 8deg,rgba(169,112,242,.22) 8deg 14deg,transparent 14deg 30deg,rgba(169,112,242,.22) 30deg 36deg,transparent 36deg 52deg,rgba(169,112,242,.22) 52deg 58deg,transparent 58deg 74deg,rgba(169,112,242,.22) 74deg 80deg,transparent 80deg 96deg,rgba(169,112,242,.22) 96deg 102deg,transparent 102deg 120deg);
  -webkit-mask:radial-gradient(circle,#000 25%,transparent 68%);mask:radial-gradient(circle,#000 25%,transparent 68%);animation:ware-strahlen 40s linear infinite;pointer-events:none}
.ware--gross .ware-bild svg{position:relative}
.ware--gross .ware-name{font-size:19px} .ware--gross .ware-txt small{font-size:13px}
.ware--gross .ware-preis{grid-column:1/-1}
@keyframes ware-strahlen{to{transform:rotate(360deg)}}
.ware.glanz::after{content:"";position:absolute;top:-40%;bottom:-40%;left:-60%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.16),transparent);transform:skewX(-20deg);animation:ware-glanz 5s ease-in-out infinite;pointer-events:none}
@keyframes ware-glanz{0%,70%{left:-60%}100%{left:130%}}
@media (prefers-reduced-motion:reduce){.ware.glanz::after,.ware--gross .ware-bild::before{animation:none}}
.waren--3 .ware{padding:6px 6px 0} .waren--3 .ware-bild{height:64px} .waren--3 .ware-preis{margin:8px -6px 0;font-size:15px} .waren--3 .ware-name{font-size:14px} .waren--3 .ware-txt small{font-size:11px}
/* Shop sortiert (Test-Datei werkzeuge/thronevent): Zwischenüberschrift mit Trennlinie, gleich große Karten, Preis-Knöpfe unten */
.sort-kopf{display:flex;align-items:center;gap:8px;margin:12px 0 8px;font:700 11px/1 var(--font-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--gold-100)}
.sort-kopf::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(228,200,134,.45),transparent)}
.waren--3 .ware-name{font-size:12px;min-height:2.4em;display:flex;align-items:center;justify-content:center}
.ware .lim{font:600 10.5px/1.2 var(--font-ui);color:var(--tx-3)} .ware.leer{opacity:.5}
.ware .zeit{position:absolute;left:50%;bottom:2px;transform:translateX(-50%);font:800 12px/1 var(--font-ui);color:#fff;text-shadow:0 1px 2px #000,0 0 3px #000;white-space:nowrap}
.ware-knoepfe{display:flex;flex-direction:column;gap:4px;margin:6px -6px 0}
.ware-knoepfe .ware-preis{margin:0;height:32px;font-size:12.5px;gap:3px}
.ware-preis img{width:16px;height:16px;object-fit:contain}
.ware .pity{font:700 10.5px/1.2 var(--font-ui);color:#d9b8ff}
.ev-guthaben{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.28);border:1px solid rgba(228,200,134,.3)}
.ev-guthaben img{width:28px;height:28px} .ev-guthaben b{font:800 17px/1 var(--font-display);color:var(--gold-100)}
.ev-guthaben small{margin-left:auto;text-align:right;font:600 11px/1.3 var(--font-ui);color:var(--tx-3)} .ev-guthaben small b{font-size:12px}
.pill--em img{width:16px;height:16px}
main .besch-ic,.besch-ic{width:22px;height:22px;object-fit:contain} #beschInhalt .bk-mit{border:0;background:none;padding:0;cursor:pointer} #beschInhalt .btn--haupt{margin-top:10px;width:100%}
.ware-mehr{display:grid;gap:8px;align-content:stretch}
.ware-link{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 8px;border-radius:12px;border:1px dashed var(--line-3);background:rgba(0,0,0,.22);cursor:pointer;
  font:600 var(--fs-13) var(--font-ui);color:var(--gold-200)} .ware-link .icon{width:16px;height:16px;color:var(--gold-300)} .ware-link.on{color:var(--gold-100);border-style:solid}
.thron-zeile{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:0 12px;border-radius:10px;border:1px solid var(--line-2);background:rgba(0,0,0,.25);cursor:pointer;
  font:500 var(--fs-13) var(--font-ui);color:var(--tx-2);text-align:left}
.thron-zeile > .icon{width:16px;height:16px;flex:none;color:#f2c75c} .thron-zeile > span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .thron-zeile b{color:var(--tx-1);font-variant-numeric:tabular-nums}
.thron-zeile .tz-i{margin-left:4px;color:var(--gold-300)} .thron-zeile.on{border-color:var(--line-3)}
.odds{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
.odds .chip{height:20px;padding:0 6px;font-size:var(--fs-10)}
.odds .chip--rar{height:auto;min-height:20px;padding:4px 6px;line-height:1.3}   /* zweizeilig (Handy): Innenabstand oben/unten, nicht am Rand */
.hchest-res{display:grid;gap:6px;padding:10px 12px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--line-3)}
.hchest-res .btn{justify-self:start}
.inbox{display:grid;gap:6px;margin-bottom:6px} .inbox-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--line-2)}
.inbox-row.is-gold{border-color:color-mix(in srgb,var(--gold-300) 55%,transparent)} .inbox-row>.icon{width:22px;height:22px;color:var(--gold-200);justify-self:center}
.inbox-row b{display:block;font:600 var(--fs-12)/1.3 var(--font-ui);color:var(--gold-100)} .inbox-row small{display:block;color:var(--tx-3);font-size:var(--fs-11);line-height:1.35}
.inbox-empty{padding:10px 12px;border-radius:var(--r-sm);border:1px dashed var(--line-2);color:var(--tx-3);font-size:var(--fs-12);line-height:1.4} .inbox-all{justify-self:end}
.loot{align-items:center;gap:12px;padding:10px 12px;border-radius:var(--r-sm);border:1px solid color-mix(in srgb,var(--rc,var(--line-2)) 60%,transparent);
  background:radial-gradient(80% 120% at 0% 50%,color-mix(in srgb,var(--rc,transparent) 16%,transparent),transparent 70%),rgba(0,0,0,.2);animation:panel-in var(--dur-3) var(--ease-out)}
.loot[style*="block"]{display:flex!important}
.loot .tile{width:48px;flex:none;cursor:default}
.loot b{display:block;font:600 var(--fs-13)/1.2 var(--font-display);letter-spacing:.04em;color:var(--tx-1)}
.loot small{display:block;margin-top:2px;font:500 var(--fs-11)/1.2 var(--font-ui);color:var(--tx-3)}

/* =====================================================================
   RESPONSIVE PLACEMENT
   ===================================================================== */
@media (max-width:359px){
  :root{--hud-h:28px;--tile:52px}
  .hud{gap:4px}
  .res{gap:4px;padding:0 5px 0 4px}
  .res b{font-size:var(--fs-12);letter-spacing:-.01em}
  .res > .icon{width:16px;height:16px}
  .btn{padding:0 10px;letter-spacing:.02em}
  .selbar .btn .icon{display:none}
  .pfoot > .btn--secondary:has(> .icon + span):not(.btn--grow) > .icon{display:none}   /* secondary footer buttons keep their label, drop the icon */
  .pfoot > .btn--secondary:not(.btn--grow){flex:none;min-width:max-content}
  .ptitle--input{font-size:var(--fs-15);letter-spacing:0}
  .tile .selectDot{width:20px;height:20px}
  .tile .selectDot::after{width:12px;height:12px}
  .tile .lvl{height:13px;min-width:15px;line-height:11px;font-size:9px}
  .statChip span{font-size:9px}
  .logSide{padding:6px}
  .logLine span:first-child{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bonus-row{gap:4px}
}
/* short or narrow screens: the attack preview fits without scrolling */
@media (max-height:480px),(max-width:360px){
  .force{padding:8px}
  .force b{font-size:var(--fs-15)}
  .force small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sm-hide{display:none}   /* "Truppen entsenden" -> "Entsenden" */
}
@media (max-width:360px){
  .xs-hide{display:none}   /* "81 Truppen + 72 Vert." -> "81 + 72 Vert.", "Marsch ca. 0:25" -> "0:25" */
  .seg{margin-top:2px}
}
@media (max-height:700px) and (orientation:portrait){
  .panel--island .pbody{gap:10px;padding:12px}
  .panel--island .stat{padding:6px 8px}
  .panel--island .stat-v{font-size:14px;margin-top:4px}
}
/* tablet portrait */
@media (min-width:600px) and (max-width:899px) and (min-height:501px){
  .panel--sheet,.panel--island,.panel--item{left:50%;right:auto;width:560px;transform:translateX(-50%)}
}
/* phone landscape: rail left, panels become right side panels */
@media (max-height:500px) and (orientation:landscape){
  :root{--hud-top-space:44px}
  .nav{top:0;bottom:0;left:0;right:auto;width:calc(var(--rail-w) + var(--safe-l));height:auto;padding:calc(var(--safe-t) + 6px) 0 calc(var(--safe-b) + 6px) var(--safe-l);
    grid-template-columns:1fr;grid-auto-rows:1fr;border-top:0;border-right:1px solid var(--line-2);box-shadow:12px 0 30px rgba(0,0,0,.45)}
  .nav::before{display:none}
  .nav-btn.active::after{top:50%;left:0;width:2px;height:28px;transform:translateY(-50%);background:linear-gradient(180deg,transparent,var(--gold-300),transparent)}
  .nav-btn .badge{top:calc(50% - 24px)}
  .hud{left:calc(var(--rail-w) + var(--safe-l) + 10px);right:auto;width:auto;max-width:calc(100vw - var(--rail-w) - 40px)}
  .midbar{left:calc(var(--rail-w) + var(--safe-l) + 70px);right:auto;max-width:calc(100vw - var(--rail-w) - 90px)} body.has-panel .midbar{display:none}
  body.has-panel .hud{max-width:calc(100vw - var(--rail-w) - var(--safe-l) - min(380px,50vw) - var(--safe-r) - 36px)}
  .res{flex:0 0 auto;max-width:none;padding:0 var(--ab-2)}   /* pills size to their value: no ellipsis on "999,9 Tsd." */
  .res b{min-width:max-content}
  .mapctl{bottom:calc(var(--safe-b) + 10px)}
  .anleitung{left:calc(var(--rail-w) + var(--safe-l) + 10px);bottom:calc(var(--safe-b) + 10px)}   /* neben der Leiste, nie darüber */
  .mabar{left:calc(var(--rail-w) + var(--safe-l) + 10px);bottom:calc(var(--safe-b) + 10px);right:calc(var(--safe-r) + 60px)}
  body.is-multi .mapctl{display:flex;bottom:calc(var(--safe-b) + 10px)}
  .toast{left:calc(50% + var(--rail-w) / 2)}
  body.has-panel .toast{left:calc(var(--rail-w) + var(--safe-l) + (100vw - var(--rail-w) - var(--safe-l) - min(380px,50vw) - var(--safe-r) - 8px) / 2);
    max-width:calc(100vw - var(--rail-w) - var(--safe-l) - min(380px,50vw) - var(--safe-r) - 32px)}
  .panel--sheet,.panel--island,.panel--item{top:8px;bottom:8px;right:calc(var(--safe-r) + 8px);left:auto;width:min(380px,50vw);max-height:none;border-radius:var(--r-xs)}
  .panel--sheet{--sheet-max:calc(100dvh - 16px)}
  .panel--island{top:auto;max-height:calc(100dvh - var(--safe-t) - var(--safe-b) - 16px)}   /* hugs its content: no empty band above the footer */
  .sheet-grab{display:none}
  .panel .sheet-grab + .phead{padding-top:10px}
  body.has-panel .mapctl{display:flex;right:calc(min(380px,50vw) + var(--safe-r) + 16px)}   /* left of the side panel, never under it */
  /* profile: compact hero + one-row tabs so the body keeps ~250px */
  .panel .sheet-grab + .phead--hero{padding-top:6px;padding-bottom:6px}
  .phead--hero .overline{display:none}
  .phead--hero .avatar-ring{width:36px;height:36px}
  .phead--hero .avatar .icon{width:18px;height:18px}
  .phead--hero .avatar-ring .lvl{min-width:16px;height:16px;font-size:9px;right:-5px;bottom:-5px}
  .phead--hero .ptitle{margin:0 0 1px}
  .phead--hero .xp{margin-top:2px}
  .tabs .tab{flex-direction:row;height:30px;font-size:11px}
  .tabs .tab .icon{display:none}
  #profileFoot{padding:5px 14px 6px}
  #profileFoot .btn{height:30px}
  /* attack preview: fits without scrolling */
  .panel--island .pbody{gap:8px;padding-top:10px;padding-bottom:10px}
}
/* desktop */
@media (min-width:900px) and (min-height:501px){
  :root{--hud-h:34px;--tile:56px}
  .hud{top:14px;left:14px;right:auto;gap:0;padding:0;align-items:center;background:var(--glass);border:1px solid var(--line-2);border-radius:var(--r-sm);box-shadow:var(--sh-2);
    -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
  .midbar{top:72px;left:14px;right:auto;max-width:min(560px,calc(100vw - 460px))}
  .hud-me{flex-direction:row;width:auto;align-items:center;gap:12px;height:48px;padding:0 14px 0 8px;border-right:1px solid var(--line-1);text-align:left}
  .hud-me .avatar-ring--sm{width:34px;height:34px}
  .hud-me .avatar-ring--sm .avatar .icon{width:17px;height:17px}
  .hud-me-text{max-width:none;text-align:left}
  .hud-me-text small{display:block}
  .hud-werte{flex:none;height:auto;padding:0;background:none;border:0;border-radius:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
  .hud-me:hover{background:rgba(255,255,255,.03)}
  .hud-me-text b{display:block;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 13px/1.1 var(--font-display);color:var(--gold-100);letter-spacing:.04em}
  .hud-me-text small{display:block;font:500 10.5px/1.2 var(--font-ui);color:var(--tx-3);margin-top:2px}
  .res{flex:0 0 auto;max-width:none;min-width:112px;height:48px;background:none;border:0;border-radius:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;padding:0 14px;gap:8px}
  .res + .res{border-left:1px solid var(--line-1)}
  .res b{font-size:var(--fs-15);min-width:6.2em}   /* room for "999,9 Tsd.": the frame never jumps when a value changes length */
  .res > .icon{width:20px;height:20px}
  /* Leiste unten Mitte (gleiche Reihenfolge wie am Handy); mit offenem Fenster rechts mittig über der freien Karte */
  .nav{left:50%;right:auto;top:auto;bottom:14px;height:auto;transform:translateX(-50%);padding:6px 10px;display:flex;gap:6px;background:var(--glass);border:1px solid var(--line-2);border-radius:var(--r-lg);box-shadow:var(--sh-2);
    -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
  body.has-sheet .nav{left:calc(50% - 209px)}
  .nav::before{display:none}
  .nav-btn{width:72px;gap:4px}
  .nav-l{font:600 12px/1 var(--font-display);letter-spacing:.04em;text-transform:none}
  .mapctl{bottom:18px;right:18px}
  body.has-panel .mapctl{display:flex}
  body.has-sheet .mapctl{right:432px}
  .mabar{left:50%;right:auto;bottom:104px;transform:translateX(-50%);width:min(560px,calc(100vw - 40px))}
  body.is-multi .mapctl{display:flex;bottom:18px}
  .toast{top:auto;bottom:104px;max-width:min(640px,calc(100vw - 40px))}   /* über der Leiste */
  body.has-sheet .toast{left:calc(50% - 209px);max-width:min(640px,calc(100vw - 458px))}   /* centred in the map area left of the drawer */
  body.is-multi .toast{bottom:170px}
  body .toast.toast--oben{top:calc(var(--safe-t) + var(--hud-top-space));bottom:auto}   /* über einem offenen Fenster: oben (06d hintFrei) */
  .scrim{display:none!important}
  .sheet-grab{display:none}
  .panel .sheet-grab + .phead{padding-top:10px}
  /* island popup = popover anchored next to the base (JS writes --ax/--ay/--py) */
  .panel--island{left:var(--ax,50%);top:var(--ay,90px);right:auto;bottom:auto;width:360px;max-height:min(calc(100dvh - 100px),var(--amax,100dvh));border-radius:var(--r-xs);z-index:var(--z-popover)}
  .panel--island::after{content:"";position:absolute;left:-7px;top:var(--py,60px);width:12px;height:12px;transform:rotate(45deg);background:#12161d;border-left:1px solid var(--line-3);border-bottom:1px solid var(--line-3)}
  .panel--island .pfoot .btn{padding:0 12px}
  .panel--island .from-sel{font-size:var(--fs-15)}   /* „Hauptstadt · 100 Tsd. · 0:21 · reicht“ passt in die 360px-Karte (16px nur am Handy: iOS zoomt sonst) */
  #popupSub .xs-hide{display:none}   /* 360px-Karte: „Von Hauptstadt“ ganz, die Sanduhr sagt „Marsch“ */
  body.in-stadt .city-head{padding-top:72px}   /* Bauarbeiter-Zeile unter dem HUD-Streifen (oben 14 + 48 hoch) */   /* two grow buttons side by side: "Neu spähen" fits the 360px popover */
  .panel--island.is-left::after{left:auto;right:-7px;border-left:0;border-bottom:0;border-right:1px solid var(--line-3);border-top:1px solid var(--line-3)}
  /* profile / battle log / goals / shop = right drawer under the nav */
  .panel--sheet{--sheet-max:calc(100dvh - 86px);top:72px;bottom:auto;right:14px;left:auto;width:404px;border-radius:var(--r-xs)}
  #shopPopup.panel--sheet{--sheet-max:calc(100dvh - 72px - 104px);width:min(720px,calc(100vw - 28px))}   /* Shop: breit (4 Karten nebeneinander), endet über der Leiste */
  #shopPopup .waren:not(.waren--3){grid-template-columns:repeat(4,minmax(0,1fr))} #shopPopup .ware--gross{grid-column:span 2}
  #shopTabs .tab{font-size:13px}   /* (11 px war am Desktop zu klein) */
  body:has(#shopPopup.is-open) .mapctl{display:none}   /* der breite Shop deckt die Karten-Knöpfe ab: solange er offen ist, weg */
  /* item detail = card left of the drawer */
  .panel--item{top:72px;right:432px;left:auto;bottom:auto;width:320px;max-height:calc(100dvh - 86px);border-radius:var(--r-xs)}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:1ms!important;animation-iteration-count:1!important;transition-duration:1ms!important}
}

/* rarity mapping - LAST, (0,2,0) so it beats every component default */
:is(.tile,.item-icon,.chip,.slot-r,.rar-text,.loot)[data-r="grau"]{--rc:var(--r-grau)}
:is(.tile,.item-icon,.chip,.slot-r,.rar-text,.loot)[data-r="gruen"]{--rc:var(--r-gruen)}
:is(.tile,.item-icon,.chip,.slot-r,.rar-text,.loot)[data-r="blau"]{--rc:var(--r-blau)}
:is(.tile,.item-icon,.chip,.slot-r,.rar-text,.loot)[data-r="lila"]{--rc:var(--r-lila)}
:is(.tile,.item-icon,.chip,.slot-r,.rar-text,.loot)[data-r="gold"]{--rc:var(--r-gold)}
:is(.tile,.item-icon,.chip,.slot-r,.rar-text,.loot)[data-r="rot"]{--rc:var(--r-rot)}

/* =====================================================================
   LEVEL-UP MODAL + MAP PICKUPS
   ===================================================================== */
.lvlup{position:fixed;inset:0;z-index:var(--z-modal);display:flex;align-items:center;justify-content:center;padding:24px;
  background:radial-gradient(ellipse at 50% 45%,rgba(40,28,8,.55),rgba(3,4,8,.82));animation:fade-in var(--dur-3) var(--ease-out)}
.lvlup[hidden]{display:none}
.lvlup-card{position:relative;width:min(340px,100%);padding:26px 22px 18px;text-align:center;color:var(--tx-1);
  background:var(--noise),var(--panel-bg);border:1px solid var(--line-3);border-radius:var(--r-lg);
  box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 60px rgba(214,170,90,.28),var(--sh-3);animation:lvlup-in 520ms cubic-bezier(.2,1.4,.3,1)}
@keyframes lvlup-in{from{opacity:0;transform:scale(.82)}}
.lvlup-card::before{content:"";position:absolute;left:50%;top:-46px;width:220px;height:220px;margin-left:-110px;pointer-events:none;
  background:conic-gradient(from 0deg,transparent 0 8%,rgba(236,208,138,.20) 10% 12%,transparent 14% 33%,rgba(236,208,138,.16) 35% 37%,transparent 39% 58%,
  rgba(236,208,138,.20) 60% 62%,transparent 64% 83%,rgba(236,208,138,.16) 85% 87%,transparent 89%);
  -webkit-mask-image:radial-gradient(circle,#000 20%,transparent 70%);mask-image:radial-gradient(circle,#000 20%,transparent 70%);animation:lvlup-spin 14s linear infinite}
@keyframes lvlup-spin{to{transform:rotate(1turn)}}
.lvlup-badge{position:relative;width:74px;height:74px;margin:-4px auto 10px;display:grid;place-items:center;border-radius:50%;
  background:radial-gradient(circle at 50% 35%,#3a2c14,#16110a 70%);border:2px solid var(--gold-300);box-shadow:var(--glow-gold),inset 0 0 18px rgba(0,0,0,.6)}
.lvlup-badge b{font:700 30px/1 var(--font-display);color:var(--gold-100);text-shadow:0 0 12px rgba(236,208,138,.55)}
.lvlup-over{font:600 var(--fs-11)/1.3 var(--font-ui);letter-spacing:.28em;text-transform:uppercase;color:var(--gold-300)}
.lvlup-title{margin:4px 0 2px;font:700 26px/1.15 var(--font-display);letter-spacing:.04em;color:var(--gold-100)}
.lvlup-sub{font:500 var(--fs-12)/1.4 var(--font-ui);color:var(--tx-3);min-height:1.4em}
.lvlup-rule{height:1px;margin:14px 0 12px;background:linear-gradient(90deg,transparent,var(--line-3),transparent)}
.lvlup-label{font:600 var(--fs-11)/1.3 var(--font-ui);letter-spacing:.2em;text-transform:uppercase;color:var(--tx-3);margin-bottom:8px}
.lvlup-rewards{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:6px}
.lvlup-rewards li{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--line-2);border-radius:var(--r-sm);
  background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(0,0,0,.18));opacity:0;animation:lvlup-row 380ms var(--ease-out) forwards}
.lvlup-rewards li .icon{width:20px;height:20px;flex:none}
.lvlup-rewards li span{flex:1;text-align:left;color:var(--tx-2);font:500 var(--fs-13)/1.2 var(--font-ui)}
.lvlup-rewards li b{font:700 var(--fs-15)/1.2 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums}
@keyframes lvlup-row{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.lvlup-next{font:500 var(--fs-11)/1.4 var(--font-ui);color:var(--tx-3);margin-bottom:14px}
.lvlup-next b{color:var(--tx-2);font-weight:600}
.lvlup .btn{width:100%}
.xp-next{margin-top:4px;font:500 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3)}
.xp-next b{color:var(--tx-2);font-weight:600}
.ico-coin{color:var(--gold-300)} .ico-troops{color:#e8e2d2}
@media (prefers-reduced-motion:reduce){.lvlup-card,.lvlup-card::before,.lvlup-rewards li{animation:none;opacity:1}}

/* ---- daily reward + quests ---- */
.daily{display:flex;flex-direction:column;gap:10px;padding:12px;border:1px solid var(--line-2);border-radius:var(--r-sm);
  background:linear-gradient(180deg,rgba(236,208,138,.07),rgba(0,0,0,.2))}
.daily-days{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:12px}
.daily-day{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0 5px;border:1px solid var(--line-1);
  border-radius:var(--r-xs);background:rgba(0,0,0,.25);font:600 var(--fs-10,10px)/1 var(--font-ui);color:var(--tx-3);letter-spacing:.04em}
.daily-day .icon{width:16px;height:16px;color:var(--tx-3)}
.daily-day.is-done{border-color:var(--line-2);color:var(--tx-2)} .daily-day.is-done .icon{color:var(--gold-400)}
.daily-day.is-done::after{content:"";position:absolute;right:3px;top:3px;width:5px;height:5px;border-radius:50%;background:#5cbf62}
.daily-day.is-today{border-color:var(--gold-300);color:var(--gold-100);box-shadow:var(--glow-gold)} .daily-day.is-today .icon{color:var(--gold-200)}
.daily-day.is-big .icon{color:var(--r-lila)}
.daily-row{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 12px}   /* Abstand zum Kartenrand (Spieltest 7.10.: Text klebte links) */
.daily-row .daily-txt{flex:1;min-width:0}
.daily-row .daily-txt b{display:block;font:600 var(--fs-13)/1.3 var(--font-ui);color:var(--tx-1)}
.daily-row .daily-txt small{display:block;font:500 var(--fs-11)/1.35 var(--font-ui);color:var(--tx-3)}
.daily .daily-days{margin-top:0}
.daily-week{display:grid;gap:4px} .daily-week > div{display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--line-1);border-radius:8px;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
.daily-week b{min-width:42px;color:var(--tx-3);font-weight:600} .daily-week span{flex:1} .daily-week .icon{width:14px;height:14px;color:var(--gold-400)}
.daily-week .is-today{border-color:var(--gold-300);color:var(--tx-1)} .daily-week .is-today b{color:var(--gold-100)} .daily-week .is-done{opacity:.55}
.quests{display:flex;flex-direction:column;gap:8px}
.quest{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.quest.is-done{border-color:var(--line-3);background:linear-gradient(90deg,rgba(236,208,138,.10),rgba(0,0,0,.2))}
.quest.is-claimed{opacity:.55}
.quest > .icon{width:22px;height:22px;flex:none;color:var(--gold-300)}
.quest-main{flex:1;min-width:0}
.quest-main b{display:block;font:600 var(--fs-13)/1.3 var(--font-ui);color:var(--tx-1)}
.quest-bar{display:flex;align-items:center;gap:8px;margin-top:5px}
.quest-bar i{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;position:relative}
.quest-bar i::after{content:"";position:absolute;inset:0;width:var(--p,0%);background:linear-gradient(90deg,var(--gold-500),var(--gold-200))}
.quest-bar span{font:600 var(--fs-11)/1 var(--font-ui);color:var(--tx-3);font-variant-numeric:tabular-nums}
.quest-side{display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex:none}
.quest-rew{display:inline-flex;align-items:center;gap:4px;font:700 var(--fs-12)/1 var(--font-ui);color:#9fe0ff}
.quest-rew .icon{width:13px;height:13px}
.quest-rew.is-gold{color:var(--gold-200)}
.quest-reset{font:500 var(--fs-11)/1 var(--font-ui);color:var(--tx-3)}
.daily-day span{white-space:nowrap} .daily-day i{font-style:normal}
@media (max-width:359px){.daily-day i{display:none}}
.quest-ok{font:600 var(--fs-11)/1 var(--font-ui);color:#5cbf62;letter-spacing:.06em;text-transform:uppercase}
