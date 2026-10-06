// Teil 05-stil-ladebild-stadt.php: Stil: Ladebildschirm, Hauptstadt, Aufbau, Händler, Bündnis (bis </style>)

/* =====================================================================
   LOADING SCREEN: sea, an island with a castle, sky by the real time of day, tips with pictures
   ===================================================================== */
.splash{position:fixed;inset:0;z-index:200;overflow:hidden;background:#081c2e;color:var(--tx-1);
  display:flex;flex-direction:column;justify-content:flex-start;align-items:center;
  padding:calc(var(--safe-t) + 7vh) 16px calc(var(--safe-b) + 5vh);transition:opacity .7s ease,visibility .7s}
.splash.is-leaving{opacity:0;visibility:hidden}
.splash.is-leaving .splash-bg{transform:scale(1.05)}
.splash-bg{position:absolute;inset:0;width:100%;height:100%;display:block;transition:transform 1.4s cubic-bezier(.2,.8,.2,1);animation:sp-zoom 12s ease-out both}
@keyframes sp-zoom{from{transform:scale(1.06)}to{transform:scale(1)}}
.splash-vig{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at 50% 50%,transparent 45%,rgba(0,0,0,.35) 80%,rgba(0,0,0,.6)),linear-gradient(180deg,rgba(0,0,0,.35),transparent 26%,transparent 62%,rgba(0,0,0,.55))}
.splash-top,.splash-bottom{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center}
.splash-title{position:relative;margin:0;font:700 clamp(38px,11vw,88px)/1 var(--font-display);letter-spacing:.07em;text-transform:uppercase;   /* engraved gold with a light sweep */
  background-image:linear-gradient(100deg,#8a5d22 0%,#e9c77e 22%,#fff6dc 30%,#e9c77e 38%,#b07b30 60%,#f3dca0 80%,#8a5d22 100%);background-size:250% 100%;
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 rgba(0,0,0,.6)) drop-shadow(0 0 18px rgba(0,0,0,.45));animation:sp-rise 1.1s .15s cubic-bezier(.2,.8,.2,1) both,sp-shine 4.5s 1s ease-in-out infinite}
.splash-sub{display:flex;align-items:center;gap:12px;margin-top:12px;font:600 var(--fs-13)/1 var(--font-ui);letter-spacing:.34em;text-transform:uppercase;color:#f0d6a0;
  text-shadow:0 1px 8px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.9);animation:sp-rise 1.1s .3s cubic-bezier(.2,.8,.2,1) both}
.splash-sub span{width:34px;height:1px;background:linear-gradient(90deg,transparent,#d9b56a)}
.splash-sub span:last-child{transform:scaleX(-1)}
@keyframes sp-rise{from{opacity:0;transform:translateY(14px)}}
@keyframes sp-shine{0%{background-position:100% 0}60%,100%{background-position:0 0}}
.splash-bottom{margin-top:auto}
/* tip card: a small drawn picture + the tip */
.splash-tipcard{display:flex;align-items:center;gap:12px;width:100%;min-height:76px;padding:10px 12px;text-align:left;border-radius:12px;
  background:linear-gradient(180deg,rgba(14,16,22,.82),rgba(8,9,13,.9));border:1px solid rgba(217,181,106,.4);box-shadow:0 8px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,236,190,.08)}
.splash-tippic{flex:none;width:56px;height:56px;border-radius:10px;display:grid;place-items:center;color:#e4c886;
  background:radial-gradient(circle at 50% 35%,rgba(214,170,90,.2),rgba(0,0,0,.35) 75%);border:1px solid rgba(217,181,106,.35);transition:opacity .35s,transform .35s}
.splash-tippic svg{width:46px;height:46px}
.splash-tiptxt{display:grid;gap:4px;min-width:0;transition:opacity .35s}
.splash-tiptxt b{font:700 var(--fs-10)/1 var(--font-ui);letter-spacing:.2em;text-transform:uppercase;color:#d4ad66}
.splash-tip{font:500 var(--fs-13)/1.35 var(--font-ui);color:#e6dcc4}
.splash-tipcard.is-swap .splash-tippic{opacity:0;transform:scale(.85)} .splash-tipcard.is-swap .splash-tiptxt{opacity:0}
/* ornate loading bar */
.splash-barwrap{display:flex;align-items:center;width:100%;gap:0}
.splash-cap{flex:none;width:12px;height:12px;transform:rotate(45deg);border:1.5px solid #d9b56a;background:#1a1208;box-shadow:0 0 10px rgba(236,190,110,.5)}
.splash-barwrap .splash-bar{flex:1;height:10px;border-radius:0;margin:0 -2px;padding:2px;background:linear-gradient(180deg,#0b0806,#1a130b);
  border:1.5px solid #b98f47;box-shadow:inset 0 0 6px rgba(0,0,0,.9),0 0 22px rgba(0,0,0,.7)}
.splash-barwrap .splash-bar i{inset:2px auto 2px 2px;height:auto;max-width:calc(100% - 4px);background:linear-gradient(180deg,#fff0c4,#e3b35c 45%,#9a651f)}
.splash-barwrap .splash-bar i::before{content:"";position:absolute;right:-6px;top:50%;width:14px;height:14px;margin-top:-7px;border-radius:50%;
  background:radial-gradient(circle,#fff8e0,rgba(255,200,110,.6) 40%,transparent 70%)}
.splash-meta{display:flex;justify-content:space-between;width:100%;padding:0 4px}
.splash-pct{font:700 var(--fs-12)/1 var(--font-ui);color:#f0d69a;font-variant-numeric:tabular-nums;letter-spacing:.06em;text-shadow:0 1px 4px rgba(0,0,0,.9)}
.splash-bottom{width:min(440px,100%);gap:12px;animation:sp-rise 1s .45s ease-out both}
.splash-bar{position:relative;width:100%;height:6px;border-radius:3px;background:rgba(0,0,0,.55);border:1px solid rgba(217,181,106,.45);overflow:hidden;
  box-shadow:0 0 18px rgba(0,0,0,.6)}
.splash-bar i{position:absolute;inset:0;width:0;background:linear-gradient(90deg,#8a5d22,#e7c173 70%,#fff3cf);box-shadow:0 0 12px rgba(236,190,110,.7);
  animation:sp-load 1.8s cubic-bezier(.3,.7,.3,1) forwards}
.splash-bar i::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);
  transform:translateX(-100%);animation:sp-sheen 1.3s linear infinite}
@keyframes sp-load{to{width:72%}}
@keyframes sp-sheen{to{transform:translateX(100%)}}
.splash.is-done .splash-bar i{animation:none;width:100%;transition:width .6s ease-out}
.splash-status{font:600 var(--fs-11)/1 var(--font-ui);letter-spacing:.22em;text-transform:uppercase;color:#cbb994;text-shadow:0 1px 4px rgba(0,0,0,.9)}
/* dark halo behind the title keeps it readable over a bright day sky */
.splash-top::before{content:"";position:absolute;inset:-30px -80px;z-index:-1;background:radial-gradient(ellipse at center,rgba(2,3,8,.42),transparent 70%)}
@media (min-width:700px){.splash-tip{font-size:14px}}
@media (max-height:500px){.splash{padding-top:calc(var(--safe-t) + 3vh);padding-bottom:calc(var(--safe-b) + 3vh)}.splash-title{font-size:clamp(30px,8vh,56px)}.splash-sub{margin-top:6px}.splash-tipcard{min-height:0;padding:6px 10px}.splash-tippic{width:40px;height:40px}.splash-tippic svg{width:32px;height:32px}}
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
  display:flex;flex-direction:column;gap:10px;animation:panel-in var(--dur-3) var(--ease-out);max-height:calc(100% - 90px);overflow-y:auto;overscroll-behavior:contain}
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
.forge-row.is-empty{color:var(--tx-3);font:500 var(--fs-12)/1.3 var(--font-ui)}
.tile .stars{position:absolute;left:4px;right:24px;bottom:3px;display:flex;justify-content:flex-start;gap:0;color:#ffd76a;overflow:hidden}
.tile .stars .icon{width:9px;height:9px;filter:drop-shadow(0 0 1px #000)}
.starbar{display:flex!important;flex-wrap:wrap;gap:1px;margin-top:3px}
.starbar .icon{width:13px;height:13px;color:#ffd76a}
.starbar i{display:contents}
.starbar i .icon{color:rgba(255,255,255,.18)}
/* ===== AUFBAU (aufbau.js, Paket D): Rohstoffe im HUD, Kosten, Forschung, Markt, Truppen-Stufe ===== */
.res--roh{flex:0 0 auto;max-width:none;cursor:pointer;color:var(--tx-1);padding:0 8px}
.res--roh > .icon{color:#d9b27a}
.res--roh.on{border-color:var(--line-3);background:rgba(214,170,90,.16)}
.roh-mini{display:none;align-items:center;gap:10px}
.roh-v{display:flex;align-items:center;gap:4px} .roh-v .icon{width:15px;height:15px}
.roh-h .icon,.icon.roh-h{color:#c08a4c} .roh-s .icon,.icon.roh-s{color:#aab3bd} .roh-e .icon,.icon.roh-e{color:#8fb6e0}
.roh-drop{position:fixed;z-index:calc(var(--z-hud) + 1);top:calc(var(--safe-t) + 14px + var(--hud-h));right:calc(var(--safe-r) + 10px);width:min(300px,calc(100vw - 20px));padding:10px 12px;border-radius:var(--r-sm);
  background:var(--glass);border:1px solid var(--line-2);box-shadow:var(--sh-2);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.roh-drop[hidden]{display:none}
.roh-row{display:grid;grid-template-columns:22px 1fr auto;grid-template-rows:auto auto;column-gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line-1)}
.roh-row .icon{width:20px;height:20px;grid-row:1 / 3} .roh-row span{font:600 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-2)}
.roh-row b{font:700 var(--fs-15)/1.2 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums;text-align:right}
.roh-row small{grid-column:2 / 4;font:600 var(--fs-11)/1.2 var(--font-ui);color:#9fd28a;text-align:right}
.roh-hint{display:block;margin-top:8px;font:500 var(--fs-11)/1.35 var(--font-ui);color:var(--tx-3)}
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
@media (min-width:900px) and (min-height:501px){ .res--roh{min-width:0;padding:0 14px} .roh-drop{top:72px;left:14px;right:auto} }
@media (min-width:1560px) and (min-height:501px){ .roh-mini{display:flex} }   /* nur bei viel Platz die drei Zahlen im HUD (sonst stößt es an die Leiste rechts) */
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
.bd-gf-los{width:100%;min-height:48px;gap:8px} .bd-gf-los .cost{margin-left:auto;display:inline-flex;align-items:center;gap:4px}
/* ===== 11b F (P4): Stadt, Burg, Labor, Helden, Shop übersichtlich ===== */
/* Gebäude-Fenster: Haupt-Knopf fest unten (nie unter dem Falz); Burg: Voraussetzungen und Wirkung zuerst, Schild-Kasten unten */
.city-sheet > .city-bfoot{order:5;position:sticky;bottom:0;z-index:3;margin:0 -14px;padding:10px 14px;background:var(--noise),var(--panel-bg);border-top:1px solid var(--line-1)}
.city-sheet.cs-keep > #cityBNote.city-wirkung{order:4}
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
/* Umlaut-Punkte über Großbuchstaben (Ä/Ö/Ü in Überschriften, Reitern, Versalien) nicht abschneiden: einzeilige Texte mit
   „…“ schneiden nur noch seitlich ab (overflow-x:clip), nach oben bleibt Platz – die Zeilenhöhe (oft 1) war kleiner als die Punkte hoch sind */
@supports (overflow:clip) {
  .tab span,.overline,.ptitle:not(.ptitle--input),.hh-head h2,.city-title h2,.act-t,.stat-l,.stat-v,.slot-r,.gslot small,.lb-name small,.hud-me-text b,.rp-stat b,.pc-t b,.lk-me-t b,.kv b,.statRow b,.res b{overflow-x:clip;overflow-y:visible}
}
    </style>
