// Teil 05-stil-ladebild-stadt.php: Stil: Ladebildschirm, Hauptstadt, Aufbau, Händler, Bündnis (bis </style>)

/* =====================================================================
   LOADING SCREEN: a painted dusk scene (castle on the cliff, fog, reflection), gold logo, thin gold bar
   ===================================================================== */
.splash{position:fixed;inset:0;z-index:200;overflow:hidden;background:#0b1430;color:var(--tx-1);
  display:flex;flex-direction:column;align-items:center;
  padding:calc(var(--safe-t) + 9vh) 24px calc(var(--safe-b) + 40px);transition:opacity .7s ease,visibility .7s}
.splash.is-leaving{opacity:0;visibility:hidden}
.splash.is-leaving .splash-bg{transform:scale(1.05)}
.splash-bg{position:absolute;inset:0;width:100%;height:100%;display:block;transition:transform 1.4s cubic-bezier(.2,.8,.2,1);animation:sp-zoom 12s ease-out both}
@keyframes sp-zoom{from{transform:scale(1.04)}to{transform:scale(1)}}
/* vignette + a darker bottom for the tip and the bar */
.splash-vig{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse 90% 80% at 50% 45%,transparent 55%,rgba(3,5,12,.65)),linear-gradient(180deg,rgba(3,5,12,.35),transparent 22%,transparent 68%,rgba(4,6,12,.8) 86%,#04060c)}
.splash-top,.splash-bottom{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center}
/* logo: embossed gold, "OPEN" small above "WATER" */
.splash-title{margin:0;display:flex;flex-direction:column;align-items:center;font:700 clamp(46px,13vw,58px)/.98 var(--font-display);letter-spacing:.06em;text-transform:uppercase;
  filter:drop-shadow(0 2px 0 #5a3f14) drop-shadow(0 4px 14px rgba(0,0,0,.75));animation:sp-rise 1.1s .15s cubic-bezier(.2,.8,.2,1) both}
.splash-title span{background-image:linear-gradient(180deg,#fff3cf 8%,#e4c886 45%,#a27832 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.splash-title span:first-child{font-size:.55em;letter-spacing:.34em;margin-right:-.34em}
.splash-sub{display:flex;align-items:center;gap:12px;margin-top:14px;font:700 13px/1 var(--font-ui);letter-spacing:.3em;text-transform:uppercase;color:#fff1d0;
  text-shadow:0 1px 3px #000,0 0 10px rgba(0,0,0,.7);animation:sp-rise 1.1s .3s cubic-bezier(.2,.8,.2,1) both}
.splash-top::before{content:"";position:absolute;inset:-40px -70px;z-index:-1;background:radial-gradient(ellipse 80% 75% at 40% 62%,rgba(6,10,28,.75),transparent 78%)}   /* Kontrast auf hellem Himmel */
.splash-sub span{width:34px;height:1px;background:linear-gradient(90deg,transparent,#d9b56a)}
.splash-sub span:last-child{transform:scaleX(-1)}
@keyframes sp-rise{from{opacity:0;transform:translateY(14px)}}
/* bottom: one tip line, status + percent, a thin gold bar */
.splash-bottom{margin-top:auto;width:min(560px,100%);animation:sp-rise 1s .45s ease-out both}
.splash-tipline{margin:0 0 14px;max-width:460px;min-height:2.7em;font:500 var(--fs-13)/1.35 var(--font-ui);color:#f4ecd8;text-shadow:0 1px 3px #000,0 0 8px rgba(0,0,0,.8);transition:opacity .35s}
.splash-tipline b{color:#d4ad66;font-weight:700}
.splash-tipline.is-swap{opacity:0}
.splash-meta{display:flex;justify-content:space-between;align-items:baseline;gap:12px;width:100%;margin-bottom:8px}
.splash-status{font:600 var(--fs-11)/1 var(--font-ui);letter-spacing:.18em;text-transform:uppercase;color:#e6d6b0;text-shadow:0 1px 4px rgba(0,0,0,.9)}
.splash-pct{font:700 var(--fs-12)/1 var(--font-ui);color:#f0d69a;font-variant-numeric:tabular-nums;letter-spacing:.04em;text-shadow:0 1px 4px rgba(0,0,0,.9)}
.splash-bar{position:relative;width:100%;height:4px;border-radius:2px;background:rgba(0,0,0,.5);box-shadow:0 0 0 1px rgba(212,173,102,.45)}   /* (Rand als Schatten: die Füllung hat die volle Breite der Spur → Prozent stimmt) */
.splash-bar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:2px;background:linear-gradient(90deg,#a27832,#e4c886 70%,#fff3cf);box-shadow:0 0 8px rgba(236,190,110,.6);
  animation:sp-load 6s cubic-bezier(.15,.75,.3,1) forwards}
.splash-bar i::after{content:"";position:absolute;right:-3px;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:#fff8e0;box-shadow:0 0 8px 2px rgba(255,214,140,.9)}
@keyframes sp-load{to{width:72%}}   /* (langsam auslaufend: der Balken steht nicht still, solange das Spiel noch lädt) */
.splash.is-done .splash-bar i{animation:none;width:100%;transition:width .6s ease-out}
/* desktop: logo top left like a poster, bar centred */
@media (min-width:900px) and (min-aspect-ratio:11/10){.splash{align-items:stretch;padding:15vh 4vw calc(var(--safe-b) + 56px)}.splash-top{align-items:flex-start;text-align:left}
  .splash-title{font-size:88px;align-items:flex-start}.splash-sub{margin-top:18px}.splash-bottom{align-self:center}.splash-tipline{font-size:15px}}
@media (max-height:500px){.splash{padding-top:calc(var(--safe-t) + 4vh);padding-bottom:calc(var(--safe-b) + 20px)}.splash-title{font-size:clamp(30px,9vh,48px)}.splash-sub{margin-top:8px}.splash-tipline{margin-bottom:8px}}
@media (prefers-reduced-motion:reduce){.splash *,.splash-bg{animation:none!important;transition:none!important}.splash-bar i{width:72%}}

/* =====================================================================
   CAPITAL / CITY VIEW
   ===================================================================== */
.act--city{grid-column:1/-1;border-color:var(--line-3);background:linear-gradient(180deg,rgba(236,208,138,.12),rgba(0,0,0,.2))}
.act-ic--city{color:var(--gold-200)}
.city{position:fixed;inset:0;z-index:50;background:#0b1a2b;animation:fade-in var(--dur-3) var(--ease-out)}
.city[hidden]{display:none}
.city-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.city-head{position:absolute;left:0;right:0;top:0;display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:calc(var(--safe-t) + 10px) 12px 10px;
  background:linear-gradient(180deg,rgba(6,8,12,.92),rgba(6,8,12,.55) 70%,transparent)}
.city-title{flex:1;min-width:0}
@media (max-width:599px){.city-builder{flex-basis:100%;justify-content:center}.cb-slot{padding:6px 9px}}
.city-title h2{margin:2px 0 0;font:700 var(--fs-18,18px)/1.1 var(--font-display);color:var(--gold-100);letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.city-builder{order:3;display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.cb-slot{display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--line-2);border-radius:var(--r-pill);background:rgba(10,10,14,.75);
  font:600 var(--fs-11)/1 var(--font-ui);color:var(--tx-2);white-space:nowrap;min-width:0}
button.cb-slot{cursor:pointer;-webkit-tap-highlight-color:transparent}
.cb-slot>span{overflow:hidden;text-overflow:ellipsis}
.cb-slot .icon{width:14px;height:14px;flex:none;color:var(--gold-300)}
.cb-slot b{display:flex;align-items:center;gap:3px;color:var(--gold-100);font-variant-numeric:tabular-nums}
.cb-slot.is-busy{border-color:color-mix(in srgb,var(--gold-300) 45%,transparent)}
.cb-buy{border-style:dashed;color:var(--gold-100)}
.cb-buy.is-armed{border-style:solid;border-color:var(--gold-300);background:color-mix(in srgb,var(--gold-300) 22%,rgba(10,10,14,.8))}
.city-sheet{position:absolute;left:0;right:0;bottom:0;max-width:520px;margin:0 auto;padding:14px 14px calc(var(--safe-b) + 14px);
  background:var(--noise),var(--panel-bg);border:1px solid var(--line-2);border-bottom:0;border-radius:var(--r-lg) var(--r-lg) 0 0;box-shadow:var(--sh-3);
  display:flex;flex-direction:column;gap:10px;animation:panel-in var(--dur-3) var(--ease-out);max-height:calc(100% - 90px);overflow-y:auto;overflow-x:hidden;touch-action:pan-y;overscroll-behavior:contain}
.city-sheet > *{min-width:0;max-width:100%}   /* nur senkrecht scrollen: nichts darf breiter sein als das Fenster */
.city-sheet[hidden]{display:none}
.city-sheet-head{display:flex;align-items:center;gap:12px}
.city-bicon{width:48px;height:48px;flex:none;display:grid;place-items:center;border-radius:var(--r-sm);border:1px solid var(--line-3);
  background:radial-gradient(circle at 50% 35%,#3a2c14,#16110a 75%);box-shadow:var(--glow-gold)}
.city-bicon .icon{width:26px;height:26px;color:var(--gold-100)}
.city-bmeta{flex:1;min-width:0}
.city-bmeta h3{margin:2px 0;font:700 var(--fs-18,18px)/1.1 var(--font-display);color:var(--gold-100)}
.city-blevel{font:600 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2);text-wrap:balance}
.city-bdesc{margin:0;font:500 var(--fs-13)/1.45 var(--font-ui);color:var(--tx-2)}
.city-bstats{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.city-bstats > div{padding:8px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.city-bstats span{display:block;font:600 var(--fs-10,10px)/1.2 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3)}
.city-bstats b{display:flex;align-items:center;gap:5px;margin-top:3px;font:700 var(--fs-15)/1.2 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums}
.city-bstats b .icon{width:14px;height:14px}
.city-bstats b.is-bad{color:#ff8d7e}
.city-bfoot{display:flex;gap:8px}
.city-progress{height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
.city-progress i{display:block;height:100%;width:var(--p,0%);background:linear-gradient(90deg,var(--gold-500),var(--gold-200))}
/* Stadt im Stil von Rise of Kingdoms (Alexander 4.10.): runde Knöpfe am Gebäude, Bild, Voraussetzungen, Forschungs-Baum */
.city-wisch{position:absolute;left:50%;top:37%;z-index:2;display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:var(--r-pill);background:rgba(6,8,12,.72);border:1px solid var(--line-2);color:var(--gold-100);font:600 var(--fs-14,14px)/1.2 var(--font-ui);white-space:nowrap;pointer-events:none;transform:translateX(-50%);animation:city-wisch 1.6s ease-in-out infinite}
.city-wisch[hidden]{display:none} .city-wisch-r{transform:scaleX(-1)}   /* Handy: beim ersten Betreten – die Stadt geht links und rechts weiter */
@keyframes city-wisch{50%{transform:translateX(calc(-50% + 10px))}}
.city-ring{position:absolute;left:0;top:0;z-index:2;width:0;height:0;pointer-events:none}
.city-ring[hidden]{display:none}
.cr-btn{position:absolute;left:0;top:0;width:58px;height:58px;margin:-29px 0 0 -29px;transform:translate(var(--x),var(--y));pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent;
  display:grid;place-items:center;border-radius:50%;border:2px solid var(--gold-300);background:radial-gradient(circle at 50% 30%,#4a3a1c,#17120a 72%);
  box-shadow:0 4px 12px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,236,190,.35);animation:cr-pop .28s var(--ease-out) both;animation-delay:var(--d,0ms)}
.cr-btn .icon{width:26px;height:26px;color:var(--gold-100)}
.cr-btn small{position:absolute;top:calc(100% + 3px);left:50%;transform:translateX(-50%);padding:2px 7px;border-radius:var(--r-pill);background:rgba(10,8,6,.86);border:1px solid var(--line-2);
  font:700 10px/1.2 var(--font-ui);color:var(--gold-100);white-space:nowrap}
.cr-btn:active{transform:translate(var(--x),var(--y)) scale(.92)}
@keyframes cr-pop{from{opacity:0;transform:translate(0,0) scale(.4)}to{opacity:1;transform:translate(var(--x),var(--y)) scale(1)}}
.city-bicon:has(canvas){width:88px;height:88px;border-radius:var(--r-md,12px);background:radial-gradient(circle at 50% 60%,#3b4a2c,#141a10 78%);overflow:hidden}
.city-bicon canvas{width:100%;height:100%;display:block}
.city-tabs{grid-template-columns:1fr 1fr;margin:0}
.city-tabs button{height:34px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:var(--fs-12)}
.city-tabs button .icon{width:15px;height:15px}
.city-sheet.cs-nutz #cityBDesc,.city-sheet.cs-nutz #cityBNote,.city-sheet.cs-nutz #cityBStats,.city-sheet.cs-nutz .city-bfoot,.city-sheet.cs-bau #cityBExtra{display:none}
.city-bstats:has(.anf-list){display:block}
.city-bstats .anf-list{padding:0;border:0;background:none}
.city-bstats > .anf-h{padding:0;border:0;background:none;display:block}
.city-bstats .anf > span{display:block;margin:0;letter-spacing:0;text-transform:none;font:600 var(--fs-13)/1.25 var(--font-ui);color:var(--tx-1)}
.city-bstats .anf > b{display:block;margin:0;font:700 var(--fs-13)/1.2 var(--font-ui)}
.anf-h{margin:2px 0 6px;font:700 var(--fs-10,10px)/1.2 var(--font-ui);letter-spacing:.16em;text-transform:uppercase;color:var(--tx-3)}
.anf-list{display:flex;flex-direction:column;gap:4px}
.anf{display:grid;grid-template-columns:22px 1fr auto 22px;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.anf > .icon{width:18px;height:18px;color:var(--gold-200)}
.anf > span{min-width:0;font:600 var(--fs-13)/1.25 var(--font-ui);color:var(--tx-1)}
.anf > b{font:700 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums;white-space:nowrap}
.anf > i{display:grid;place-items:center;width:20px;height:20px;border-radius:50%}
.anf > i .icon{width:12px;height:12px}
.anf.is-ok > i{background:#3f8f3a;color:#eaffe4} .anf.is-bad > i{background:#b2392b;color:#ffe6e1}
.anf.is-bad > b{color:#ff8d7e} .anf.is-bad{border-color:rgba(255,120,100,.35)}
.anf .icon.icon--coin,.anf > .icon[data-i="coin"]{color:#e8b64a}
.city-uptime{display:inline-flex;align-items:center;margin-left:8px;padding:2px 7px;border-radius:var(--r-pill);background:rgba(0,0,0,.28);font:700 11px/1.2 var(--font-ui);letter-spacing:0;text-transform:none;font-variant-numeric:tabular-nums}
.city-uptime:empty{display:none}
.city-lbl2{display:inline-flex;flex-direction:column;align-items:center;min-width:0} .city-warte{font:600 11px/1.2 var(--font-ui);letter-spacing:0;text-transform:none;opacity:.85} .city-warte:empty{display:none}   /* „Fehlt: …“ – darunter, wann es reicht */
.fo-baum{display:flex;gap:22px;overflow-x:auto;padding:4px 2px 10px;overscroll-behavior-x:contain;scrollbar-width:thin}
.fo-spalte{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;flex:none}
.fo-spalte + .fo-spalte::before{content:"";position:absolute;left:-22px;top:calc(50% + 9px);width:22px;height:2px;background:linear-gradient(90deg,var(--gold-500),var(--gold-300));opacity:.7}
.fo-spalte.is-zu + .fo-spalte::before,.fo-spalte.is-zu::before{opacity:.25}
.fo-aka{font:700 10px/1.2 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3);white-space:nowrap}
.fo-node{width:98px;padding:8px 6px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;border:1px solid var(--line-2);border-radius:var(--r-sm);
  background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(0,0,0,.25));color:var(--tx-1);cursor:pointer;-webkit-tap-highlight-color:transparent}
.fo-node b{font:700 11px/1.15 var(--font-ui);text-align:center;min-height:2.3em;display:flex;align-items:center}
.fo-node small{font:700 10px/1 var(--font-ui);color:var(--gold-200);font-variant-numeric:tabular-nums}
.fo-node-ic{display:grid;place-items:center;width:40px;height:40px;flex:none;border-radius:50%;border:1px solid var(--line-3);background:radial-gradient(circle at 50% 35%,#3a2c14,#16110a 75%)}
.fo-node-ic .icon{width:22px;height:22px;color:var(--gold-100)}
.fo-bar{display:block;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,.1);overflow:hidden}
.fo-bar i{display:block;height:100%;width:var(--p,0%);background:linear-gradient(90deg,var(--gold-500),var(--gold-200))}
.fo-node.is-lock{opacity:.5} .fo-node.is-lock .fo-node-ic .icon{color:var(--tx-3)}
.fo-node.is-max{border-color:var(--gold-300)} .fo-node.is-max .fo-bar i{background:linear-gradient(90deg,#3f8f3a,#8fd38a)}
.fo-node.is-run{border-color:var(--gold-200);animation:fo-puls 1.6s ease-in-out infinite}
.fo-node.is-sel{border-color:var(--gold-100);box-shadow:0 0 0 2px rgba(240,223,176,.35),var(--glow-gold)}
@keyframes fo-puls{50%{box-shadow:0 0 12px rgba(236,208,138,.55)}}
.fo-go{margin-top:8px}
.bd-hilfe-btn{margin-top:8px} .bd-hilfe-st{display:flex;align-items:center;gap:6px;margin-top:6px;font:600 var(--fs-11)/1.3 var(--font-ui);color:var(--gold-100)} .bd-hilfe-st .icon,.bd-hilfe-btn .icon{width:14px;height:14px}
.fo-detail{display:flex;flex-direction:column;gap:8px;margin-top:4px;padding:10px;border:1px solid var(--line-2);border-radius:var(--r-md,12px);background:rgba(0,0,0,.25)}
.fo-dh{display:flex;align-items:center;gap:10px} .fo-dh b{display:block;font:700 var(--fs-15)/1.2 var(--font-display);color:var(--gold-100)} .fo-dh small{font:600 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3)}
.fo-wirk{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.fo-wirk > div{padding:7px 9px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.2);min-width:0}
.fo-wirk span{display:block;font:700 10px/1.2 var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--tx-3)}
.fo-wirk b{display:block;margin-top:3px;font:600 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-1)}
.fo-wirk > div + div b{color:#9fd28a}


.gate-ctl .btn{flex:none}
.gate-ctl{display:flex;flex-direction:column;gap:8px;margin-top:10px;padding:10px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.gate-row{display:flex;flex-direction:column;gap:6px}
.gate-ctl .seg{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-top:0}
.gate-ctl .seg button{height:32px;border:1px solid var(--line-2);border-radius:var(--r-xs);background:rgba(255,255,255,.04);color:var(--tx-2);font:700 var(--fs-12)/1 var(--font-ui)}
.gate-ctl .seg button.is-on{border-color:var(--gold-300);background:linear-gradient(180deg,rgba(236,208,138,.28),rgba(236,208,138,.08));color:var(--gold-100)}
.gate-note{margin:0;font:500 var(--fs-12)/1.4 var(--font-ui);color:var(--tx-3)}
.title-card{max-width:440px;width:100%}
.title-list{display:flex;flex-direction:column;gap:6px;max-height:52vh;overflow:auto;text-align:left}
.title-row{display:grid;grid-template-columns:1fr auto;gap:6px 10px;align-items:center;padding:8px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.title-row b{font:700 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-1)}
.title-row small{display:block;font:600 var(--fs-11)/1.3 var(--font-ui)}
.title-row.is-good small{color:#8fd38a} .title-row.is-bad small{color:#ff9d90}
.title-row .holder.is-me{color:var(--f-player-hi)}
.notice [data-view-titles]{flex:none;margin-left:auto}
.title-row select{max-width:150px;height:32px;border:1px solid var(--line-2);border-radius:var(--r-xs);background:#15171c;color:var(--tx-1);font:600 var(--fs-12)/1 var(--font-ui);padding:0 6px}
.title-row .holder{font:600 var(--fs-12)/1.2 var(--font-ui);color:var(--gold-100)}

.forge-list{display:flex;flex-direction:column;gap:6px}
.forge-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.forge-row > .icon{width:20px;height:20px;color:var(--gold-200);flex:none}
.forge-row > span{flex:1;min-width:0}
.forge-row b{display:block;font:700 var(--fs-13)/1.2 var(--font-ui)}
.forge-row small{display:block;font:600 var(--fs-13)/1.3 var(--font-ui);color:var(--gold-200);letter-spacing:.08em}
.forge-row em{font:600 var(--fs-11)/1 var(--font-ui);font-style:normal;color:var(--tx-3)}
.heal-row{flex-wrap:wrap} .heal-row > span{min-width:max-content} .heal-row small{white-space:nowrap} .heal-row .btn{margin-left:auto;max-width:100%}   /* Handy: „1.000 / 1.422“ in einer Zeile, der Knopf darf darunter */
.forge-row.is-empty{color:var(--tx-3);font:500 var(--fs-12)/1.3 var(--font-ui)}
.tile .stars{position:absolute;left:4px;right:24px;bottom:3px;display:flex;justify-content:flex-start;gap:0;color:#ffd76a;overflow:hidden}
.tile .stars .icon{width:9px;height:9px;filter:drop-shadow(0 0 1px #000)}
.starbar{display:flex!important;flex-wrap:wrap;gap:1px;margin-top:3px}
.starbar .icon{width:13px;height:13px;color:#ffd76a}
.starbar i{display:contents}
.starbar i .icon{color:rgba(255,255,255,.18)}
/* ===== AUFBAU (aufbau.js, Paket D): Rohstoffe im HUD, Kosten, Forschung, Markt, Truppen-Stufe ===== */
.roh-v{display:flex;align-items:center;gap:4px} .roh-v .icon{width:15px;height:15px}
.roh-h .icon,.icon.roh-h{color:#c08a4c} .roh-s .icon,.icon.roh-s{color:#aab3bd} .roh-e .icon,.icon.roh-e{color:#8fb6e0}
.city-bstats b .kost{display:inline-flex;align-items:center;gap:3px;margin:0 10px 0 0;white-space:nowrap;letter-spacing:0;text-transform:none;font:700 var(--fs-15)/1.2 var(--font-ui);color:var(--tx-1)}
.city-bstats b{flex-wrap:wrap}
.kost.is-bad,.city-bstats b .kost.is-bad{color:#ff8d7e}.kost--h .icon{color:#c08a4c} .kost--s .icon{color:#aab3bd} .kost--e .icon{color:#8fb6e0}
.auf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.auf-grid > div{padding:7px 8px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.auf-grid span{display:block;font:600 10px/1.2 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3)}
.auf-grid b{display:block;margin-top:3px;font:700 var(--fs-12)/1.25 var(--font-ui);color:var(--tx-1)}
.auf-frei{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.auf-frei li{display:flex;align-items:center;gap:6px;font:600 var(--fs-13)/1.3 var(--font-ui);color:var(--tx-1)} .auf-frei .icon{width:14px;height:14px;color:#9fd28a;flex:none}
.fo-tabs{grid-template-columns:repeat(3,1fr);margin:10px 0 8px}
.fo-list{display:flex;flex-direction:column;gap:6px}
.fo-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:8px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.fo-row > .icon{width:20px;height:20px;color:var(--gold-200);flex:none}
.fo-row .fo-t{flex:1;min-width:0}
.fo-row b{display:block;font:700 var(--fs-13)/1.25 var(--font-ui);color:var(--tx-1)} .fo-row b em{font-style:normal;color:var(--gold-200);font-weight:600}
.fo-row small{display:block;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
.fo-row > em{font:600 var(--fs-11)/1 var(--font-ui);font-style:normal;color:var(--tx-3)}
.fo-row.is-max{opacity:.75} .fo-row.is-run{border-color:var(--line-3);background:rgba(214,170,90,.1)}
.fo-row .btn .icon{width:13px;height:13px}
.fo-lauf{margin-top:8px;align-items:center;gap:10px}
/* ===== HÄNDLER (haendler.js) ===== */
.mb-chip.is-hd{border-color:rgba(242,199,92,.6);background:linear-gradient(90deg,rgba(120,80,20,.8),rgba(20,14,6,.88))} .mb-chip.is-hd .icon{color:#f2c75c} .mb-chip.is-hd i{color:#f6e2b0}
.hd-live{display:grid;gap:8px} .hd-info{display:flex;align-items:center;gap:6px;margin:0;color:var(--tx-3);font-size:var(--fs-12);line-height:1.4} .hd-info .icon{width:14px;height:14px;flex:none;color:var(--gold-300)}
.hd-ok{display:flex;align-items:center;gap:4px;color:#8fd18f;font:600 var(--fs-12)/1 var(--font-ui)} .hd-ok .icon{width:13px;height:13px}
.hd-log{margin:0;padding-left:18px;color:var(--tx-2);font-size:var(--fs-12);line-height:1.5} .hd-live > .btn{justify-self:start}
.hd-live .inbox-row .btn .icon{width:13px;height:13px;margin-right:3px;vertical-align:-2px;color:#8a5a12}

/* ===== BÜNDNIS (buendnis.js) ===== */
#bundPopup{height:var(--sheet-max)} #bundTabs.tabs{grid-template-columns:repeat(4,minmax(0,1fr))}
.mapctl button{position:relative}
.emblem.bd-em{background:var(--bf);color:#fff;border-color:rgba(255,255,255,.35)}
#bundOben:empty{display:none} .bd-live{display:flex;flex-direction:column;gap:12px}
.bd-wappen{width:30px;height:30px;flex:none;display:grid;place-items:center;border-radius:8px;background:var(--bf);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25),0 2px 4px rgba(0,0,0,.4)}
.bd-wappen .icon{width:17px;height:17px} .bd-wappen--gross{width:46px;height:46px;border-radius:12px} .bd-wappen--gross .icon{width:26px;height:26px}
.bd-kopf{display:flex;align-items:center;gap:12px} .bd-kopf b{display:block;font:600 var(--fs-15)/1.2 var(--font-display);color:var(--gold-100)}
.bd-kopf small{display:block;margin-top:3px;font:500 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3)}
.bd-liste{display:grid;gap:6px}
.bd-zeile{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-height:48px;padding:6px 8px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.bd-zeile.is-me{border-color:rgba(140,192,255,.45);background:linear-gradient(90deg,#284670,#161b24)}
.bd-name{flex:1;min-width:120px;display:flex;flex-direction:column;gap:2px;font:600 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-1)}
.bd-name .who-link{align-self:flex-start;text-align:left;font:inherit} .bd-name small{font:500 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3)} .bd-name em{font-style:normal;color:var(--gold-200)}
.bd-dot{width:8px;height:8px;border-radius:50%;background:#555;flex:none} .bd-dot.on{background:#4cd07d;box-shadow:0 0 6px #4cd07d}
.bd-sic{width:30px;height:30px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--sf,#555);color:#fff} .bd-sic .icon{width:16px;height:16px}
.bd-chat{display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow-y:auto;padding:4px 2px;margin-bottom:10px}
.bd-cz{align-self:flex-start;max-width:88%;padding:7px 10px;border:1px solid var(--line-1);border-radius:12px 12px 12px 4px;background:rgba(255,255,255,.04);line-height:1.35;overflow-wrap:anywhere}
.bd-cz b{font-weight:700}.bd-cz small{display:block;opacity:.6;font-size:11px;margin-top:2px}.bd-cz .btn{margin-left:4px;vertical-align:middle}
.bd-cz.is-me{align-self:flex-end;border-radius:12px 12px 4px 12px;background:linear-gradient(90deg,#284670,#1c2b44);border-color:rgba(140,192,255,.45)}
.bd-cz.is-sys{align-self:center;max-width:96%;background:none;border-style:dashed;font-size:13px;opacity:.85;text-align:center}
.bd-cz.is-hilfe{border-color:rgba(231,76,60,.65)}
.bd-ck{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0}.bd-ck>span{width:100%;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.7}
.bd-rally .bd-sic{background:var(--gold-300);color:#1a1204} .bd-rally.is-feind{border-color:rgba(231,76,60,.45)} .bd-rally.is-feind .bd-sic{background:#e74c3c;color:#fff}
.bd-rally-mit{flex-basis:100%;display:flex;flex-direction:column;gap:2px;padding:4px 0 0 44px}.bd-rally-mit small{font:500 var(--fs-12)/1.35 var(--font-ui);color:var(--tx-2);font-variant-numeric:tabular-nums}
.bd-knoepfe{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.bd-log{display:grid;gap:2px} .bd-log div{display:flex;justify-content:space-between;gap:10px;padding:5px 2px;border-bottom:1px solid var(--line-1);font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
.bd-log div:last-child{border-bottom:0} .bd-log small{flex:none;color:var(--tx-3)}
.bd-form{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;padding:10px;margin-bottom:12px;border:1px solid var(--line-2);border-radius:var(--r-lg);background:rgba(0,0,0,.22)}
.bd-form input:not([type=checkbox]),.bd-form select{width:100%;height:40px;padding:0 10px;border:1px solid var(--line-2);border-radius:var(--r-xs);background:#12151b;color:var(--tx-1);font:600 16px/1 var(--font-ui);box-sizing:border-box}
.bd-form input:focus,.bd-form select:focus{outline:none;border-color:var(--gold-300)} .bd-tag{text-transform:uppercase;letter-spacing:.15em}
.bd-farben,.bd-zeichen{display:flex;flex-wrap:wrap;gap:6px}
.bd-farben button{width:30px;height:30px;border-radius:50%;background:var(--bf);border:2px solid transparent} .bd-farben button.on{border-color:#fff;box-shadow:0 0 0 2px var(--gold-300)}
.bd-zeichen button{width:38px;height:38px;display:grid;place-items:center;border-radius:8px;border:1px solid var(--line-2);color:var(--tx-2)} .bd-zeichen button.on{border-color:var(--gold-300);color:var(--gold-100);background:rgba(214,170,90,.16)}
.bd-zeichen .icon{width:20px;height:20px}
.bd-fehler{margin:0;min-height:16px;color:#ff9d8f;font:500 var(--fs-12)/1.3 var(--font-ui)} .bd-fehler:empty{display:none}
.bd-feld{display:grid;gap:5px;min-width:0} .bd-wahl .sect h4{white-space:normal;line-height:1.3;min-width:0} .bd-feld > span{font:600 var(--fs-10)/1.3 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3)}   /* Handy: langer Titel bricht um, nichts ragt aus der Box */
.bd-info{margin:0;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
#popupBund:empty{display:none} #popupBund{display:flex;flex-direction:column;gap:8px}
.bd-insel{display:flex;flex-wrap:wrap;align-items:center;gap:6px} .bd-insel .btn .icon{width:14px;height:14px}
.bd-insel-l{display:inline-flex;align-items:center;gap:5px;margin-right:2px;font:600 var(--fs-10)/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--gold-200)} .bd-insel-l .icon{width:13px;height:13px}
/* ===== Bündnis ohne Bündnis (blick-f): eine Startseite statt Reiter, Gründen als eigene Seite ===== */
#bundPopup.bd-ohne #bundTabs{display:none} #bundLive:empty{display:none} #bundLive:empty + #bundUnten{margin-top:0}
.bd-start{display:grid;gap:10px;padding:12px;border:1px solid rgba(214,170,90,.35);border-radius:var(--r-lg);background:radial-gradient(120% 90% at 0% 0%,rgba(214,170,90,.16),transparent 60%),rgba(0,0,0,.25)}
.bd-start-kopf{display:flex;align-items:center;gap:12px} .bd-start-kopf b{display:block;font:600 var(--fs-15)/1.2 var(--font-display);color:var(--gold-100)}
.bd-start-kopf small{display:block;margin-top:3px;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
.bd-start-em{width:42px;height:42px;flex:none;display:grid;place-items:center;border-radius:12px;border:1px solid var(--gold-300);background:linear-gradient(160deg,#3a2c14,#16120b);color:var(--gold-100);box-shadow:0 2px 8px rgba(0,0,0,.45)} .bd-start-em .icon{width:22px;height:22px}
.bd-vorteile{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.bd-vorteile > div{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 4px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.25);text-align:center}
.bd-vorteile .icon{width:20px;height:20px;color:var(--gold-300)} .bd-vorteile b{font:600 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-1)} .bd-vorteile small{font:500 var(--fs-10)/1.3 var(--font-ui);color:var(--tx-3)}
.bd-gk{display:flex;align-items:center;gap:10px;width:100%;min-height:56px;padding:8px 12px;border:1px solid var(--gold-300);border-radius:var(--r-lg);background:linear-gradient(90deg,rgba(214,170,90,.18),rgba(0,0,0,.25));color:var(--tx-1);text-align:left;cursor:pointer}
.bd-gk:hover{background:linear-gradient(90deg,rgba(214,170,90,.28),rgba(0,0,0,.25))}
.bd-gk-ic{width:34px;height:34px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--gold-300);color:#1a1204} .bd-gk-ic .icon{width:18px;height:18px}
.bd-gk-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px} .bd-gk-t b{font:600 var(--fs-13)/1.2 var(--font-ui);color:var(--gold-100)} .bd-gk-t small{font:500 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3)}
.bd-gk .cost{flex:none;white-space:nowrap;font:600 var(--fs-12)/1 var(--font-ui);color:var(--tx-1)}
.bd-gf-kopf{display:flex;align-items:center;gap:10px} .bd-gf-kopf b{font:600 var(--fs-15)/1.2 var(--font-display);color:var(--gold-100)}
.bd-vorschau{padding:10px;border-radius:var(--r-sm);background:rgba(0,0,0,.25)} .bd-vorschau > div{min-width:0} .bd-vorschau b{overflow-wrap:anywhere}
.bd-tag::placeholder{text-transform:none;letter-spacing:normal}
#bdZeichen{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px;justify-items:center} #bdZeichen button{width:100%;max-width:44px;height:auto;aspect-ratio:1}
#bdFarben{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;justify-items:center} #bdFarben button{width:34px;height:34px}
.bd-gf-los{width:100%;min-height:48px;gap:8px;position:sticky;bottom:6px;z-index:1} .bd-gf-los .cost{margin-left:auto;display:inline-flex;align-items:center;gap:4px}   /* Handy: „Gründen“ bleibt unten im Fenster sichtbar */
/* ===== 11b F (P4): Stadt, Burg, Labor, Helden, Shop übersichtlich ===== */
/* Gebäude-Fenster: Haupt-Knopf fest unten (nie unter dem Falz); Burg: Voraussetzungen zuerst, dann der Schild-Kasten */
.city-sheet > .city-bfoot{order:5;position:sticky;bottom:0;z-index:3;margin:0 -14px;padding:10px 14px;background:var(--noise),var(--panel-bg);border-top:1px solid var(--line-1)}
.city-sheet.cs-keep > #cityBStats{order:1} .city-sheet.cs-keep > #cityBNote.city-wirkung{order:2} .city-sheet.cs-keep > #cityBExtra{order:3}   /* Burg: Schild-Kasten unter den Voraussetzungen – nie halb unter dem festen Knopf (Handy) */
.city-bfoot .btn{min-height:48px}
.city-sheet .fo-go{position:sticky;bottom:0;z-index:3;width:100%;min-height:48px;box-shadow:0 0 0 10px #15161b}   /* Forschen: bleibt sichtbar, solange die Forschung offen ist */
.anf.is-bad > i{visibility:hidden}   /* fehlt etwas: die rote Zahl reicht, der Knopf sagt „Fehlt: …“ */
#citySheet .btn-x,.hh .btn-x{width:44px;height:44px}
.city-tabs button,.city-sheet .seg button,.gate-ctl .seg button{min-height:44px}
button.cb-slot{position:relative} button.cb-slot::before{content:"";position:absolute;left:0;right:0;top:50%;height:var(--k-tipp);transform:translateY(-50%)}   /* Tippfläche 44 px, der Streifen bleibt schmal */
/* Heldenhalle: Reiter Helden | Paare, gesperrte Helden kleiner darunter */
.hh-seiten{grid-template-columns:1fr 1fr;margin-top:12px}
.hh-seiten button{min-height:44px;font-size:var(--fs-13)}
.hh-zu-h{margin:12px 0 4px;font:700 var(--fs-11)/1.2 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3)}
.hh-cards--zu{grid-template-columns:repeat(auto-fill,minmax(82px,1fr));gap:8px}
.hh-cards--zu .hh-card{aspect-ratio:3/4;border-width:1px}
.hh-cards--zu .hh-foot{padding:4px 2px 5px} .hh-cards--zu .hh-foot b{font-size:var(--fs-12,12px)} .hh-cards--zu .hh-foot > small:first-of-type{display:none}
.hh-cards--zu .hh-lk{font-size:8px;padding:2px 4px;right:3px;top:3px}
.hh-plus{width:44px;height:44px}
/* ===== Stadt-Gebäude-Fenster wie in Rise of Kingdoms (6.10.): Bild + Stufe, Jetzt / Nächste Stufe, Voraussetzungen mit Sprung-Knopf ===== */
.city-blevel small{margin-left:4px;font:500 var(--fs-11,11px)/1.2 var(--font-ui);color:var(--tx-3);white-space:nowrap}
.city-bicon.is-zu canvas{filter:grayscale(.8) brightness(.8);opacity:.85}   /* noch nicht gebaut: das eigene Bild, ausgegraut */
.city-vgl{border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22);padding:4px 10px 6px}
.city-vgl .vgl-h,.city-vgl .vgl-z{display:grid;grid-template-columns:1fr minmax(64px,auto) minmax(64px,auto);gap:10px;align-items:baseline}
.city-vgl .is-max .vgl-h,.city-vgl .is-max .vgl-z{grid-template-columns:1fr auto}
.city-vgl .vgl-h{padding:4px 0 2px;font:700 var(--fs-10,10px)/1.35 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3)}
.city-vgl .vgl-h span:not(:first-child),.city-vgl .vgl-z b{text-align:right}
.city-vgl .vgl-z{padding:5px 0;border-top:1px solid var(--line-1)}
.city-vgl .vgl-z span{min-width:0;font:600 var(--fs-13)/1.3 var(--font-ui);color:var(--tx-2)}
.city-vgl .vgl-z b{font:700 var(--fs-13)/1.3 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums;white-space:nowrap}
.city-vgl .vgl-z b.vgl-neu{color:var(--good)}
.anf.is-geh{grid-template-columns:22px 1fr auto auto;background:rgba(150,30,30,.16);border-color:rgba(255,120,100,.5)}
.anf.is-geh > span{color:var(--blood-300)} .anf.is-geh > .icon{color:var(--blood-300)}
.anf .anf-geh{min-height:36px;padding:0 10px;gap:4px;white-space:nowrap}
.anf .anf-geh::before{content:"";position:absolute;inset:-4px 0}   /* Tippfläche 44 px */
.anf .anf-geh{position:relative} .anf .anf-geh .icon{width:13px;height:13px}
body.in-stadt .midbar{visibility:hidden}   /* Karten-Hinweise (Invasion …) beim Überblenden nicht unter der Bauarbeiter-Zeile durchscheinen – hart getauscht */
/* Umlaut-Punkte über Großbuchstaben (Ä/Ö/Ü in Überschriften, Reitern, Versalien) nicht abschneiden: einzeilige Texte mit
   „…“ schneiden nur noch seitlich ab (overflow-x:clip), nach oben bleibt Platz – die Zeilenhöhe (oft 1) war kleiner als die Punkte hoch sind */
@supports (overflow:clip) {
  .tab span,.overline,.ptitle:not(.ptitle--input),.hh-head h2,.city-title h2,.act-t,.stat-l,.stat-v,.slot-r,.gslot small,.lb-name small,.hud-me-text b,.rp-stat b,.lk-me-t b,.kv b,.statRow b,.res b{overflow-x:clip;overflow-y:visible}
}
    </style>
