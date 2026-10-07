// Teil 05y-stil-kisten.php: Stil: Belohnungs-Kacheln (wie RoK) und Belohnungs-Fenster mit Kisten-Animation (05e-belohnung.js)
    <style>
/* =====================================================================
   BELOHNUNGS-KACHELN (Alexander 7.10., Vorbild RoK): Kachel-Bild je Seltenheit (ui_kachel_*, --ki-kachel aus 05z), großes Symbol
   (bilder/beute_*.webp, kiste_*.webp), Menge unten rechts. Größe über --bk. Überall gleich: Fenster, Listen, Pass, Events, Berichte.
   ===================================================================== */
.bk{--ki-kachel:url(bilder/ui_kachel_grau.webp);position:relative;display:block;flex:none;width:var(--bk,60px);height:var(--bk,60px);margin:0;padding:0;border:0;list-style:none;
  background:var(--ki-kachel) center/100% 100% no-repeat;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
.bk[data-r="grau"]{--ki-kachel:url(bilder/ui_kachel_grau.webp)} .bk[data-r="gruen"]{--ki-kachel:url(bilder/ui_kachel_gruen.webp)} .bk[data-r="blau"]{--ki-kachel:url(bilder/ui_kachel_blau.webp)}
.bk[data-r="lila"]{--ki-kachel:url(bilder/ui_kachel_lila.webp)} .bk[data-r="gold"]{--ki-kachel:url(bilder/ui_kachel_gold.webp)} .bk[data-r="rot"]{--ki-kachel:url(bilder/ui_kachel_rot.webp)}
.bk > img{position:absolute;left:10%;top:9%;width:80%;height:80%;object-fit:contain;filter:drop-shadow(0 2px 2px rgba(0,0,0,.6));pointer-events:none}
.bk > img.bk-held{left:5%;top:5%;width:40%;height:40%;border-radius:50%;object-fit:cover;border:1.5px solid #f6e7bf;background:#1b2638;filter:none}
.bk > b{position:absolute;right:7%;bottom:5%;font:800 calc(var(--bk,60px) * .22)/1 var(--font-ui);color:#fff;font-variant-numeric:tabular-nums;white-space:nowrap;
  text-shadow:0 0 2px #000,0 1px 2px #000,1px 0 1px #000,-1px 0 1px #000,0 -1px 1px #000}
.bk-raster{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
.bk-klein{--bk:40px;gap:4px} .bk-mini{--bk:32px;gap:3px;justify-content:flex-start}
.bk-mit{display:flex;flex-direction:column;align-items:center;gap:3px;width:calc(var(--bk,60px) + 16px)}
.bk-mit small{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font:600 10.5px/1.15 var(--font-ui);color:var(--tx-2);text-align:center;text-shadow:0 1px 2px #000}
/* Listen in den Fenstern (Tag, Stufe, Kriegsherr): Kacheln nebeneinander statt Zeilen */
.lvlup-rewards:has(> .bk){flex-direction:row;flex-wrap:wrap;justify-content:center;gap:8px}
.lvlup-rewards > li.bk{display:block;padding:0;border:0;border-radius:0;background:var(--ki-kachel) center/100% 100% no-repeat;--bk:58px}
/* Aufgaben, Abholfach, Events, Pass: kleine Kacheln in der Zeile */
.quest-rew:has(.bk){padding:0;border:0;background:none;gap:3px} .quest-rew .bk{--bk:38px}
.inbox-row .bk-raster{margin-top:4px}
.tour-prize .bk-raster{--bk:32px;gap:2px;margin-top:3px} .tour-prize .bk{display:block}
.pc-ic.is-bk{width:36px;height:36px;border:0;background:none} .pc-ic.is-bk .bk{--bk:36px}
.daily-row .bk-raster{justify-content:flex-start;margin-top:4px}
.kl-rss .bk-raster{--bk:46px;justify-content:flex-start;margin:4px 0 2px} .kl-rss.bk-an > .kl-rss-zeilen{display:none}
.bk[data-minus]{filter:grayscale(.5) drop-shadow(0 2px 3px rgba(0,0,0,.5))} .bk[data-minus] > b{color:#ff8d82}

/* ---- Belohnungs-Fenster: Kiste wackelt, geht auf, Strahlen drehen, Kacheln kommen nacheinander ---- */
.bf{position:fixed;inset:0;z-index:calc(var(--z-modal) + 2);display:flex;align-items:center;justify-content:center;padding:16px;
  background:radial-gradient(ellipse at 50% 42%,rgba(52,36,8,.6),rgba(3,4,8,.86));animation:fade-in var(--dur-3) var(--ease-out)}
.bf[hidden]{display:none}
.bf-karte{position:relative;width:min(380px,100%);max-height:calc(100dvh - 32px);overflow:auto;padding:30px 16px 16px;text-align:center;color:var(--tx-1);
  border:0;border-style:solid;border-image:url(bilder/ui_rahmen.webp) 44 fill / 16px stretch;animation:lvlup-in 420ms cubic-bezier(.2,1.4,.3,1)}
.bf-band{position:relative;margin:-14px -6px 4px;padding:10px 40px 14px;background:url(bilder/ui_band_gold.webp) center/100% 100% no-repeat}
.bf-band h2{margin:0;font:700 19px/1.15 var(--font-display);letter-spacing:.04em;color:#2a1904;text-shadow:0 1px 0 rgba(255,236,190,.55)}
.bf-unter{font:500 var(--fs-12)/1.35 var(--font-ui);color:var(--tx-3);margin-bottom:4px}
.bf-buehne{position:relative;display:none;height:150px;margin:0 auto 6px;width:200px}
.bf.mit-kiste .bf-buehne{display:block}
.bf-strahlen{position:absolute;left:50%;top:50%;width:300px;height:300px;margin:-150px 0 0 -150px;background:url(bilder/ui_strahlen.webp) center/contain no-repeat;
  opacity:0;transform:scale(.4);pointer-events:none}
.bf.is-auf .bf-strahlen{opacity:.95;transform:scale(1);transition:opacity .3s,transform .4s cubic-bezier(.2,1.4,.3,1);animation:lvlup-spin 12s linear infinite}
.bf-kiste{position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px 0 0 -75px;object-fit:contain;filter:drop-shadow(0 6px 10px rgba(0,0,0,.6))}
.bf.is-wackeln .bf-kiste{animation:bf-wackeln .7s ease-in-out}
.bf.is-auf .bf-kiste{animation:bf-auf .35s cubic-bezier(.2,1.6,.4,1)}
.bf-anzahl{position:absolute;right:6px;bottom:8px;font:800 20px/1 var(--font-display);color:var(--gold-100);text-shadow:0 0 3px #000,0 2px 4px #000}
@keyframes bf-wackeln{0%,100%{transform:none}15%{transform:rotate(-6deg) scale(1.03)}30%{transform:rotate(6deg) scale(1.05)}45%{transform:rotate(-8deg) scale(1.07)}
  60%{transform:rotate(8deg) scale(1.09)}75%{transform:rotate(-4deg) scale(1.12)}90%{transform:scale(.94)}}
@keyframes bf-auf{from{transform:scale(1.25)}to{transform:none}}
.bf-inhalt{min-height:20px;margin:6px 0 12px}
.bf-inhalt .bk-raster{gap:8px 4px}
.bf-inhalt .bk-viele{--bk:50px}
.bf-inhalt .bk-mit{opacity:0;transform:scale(.3)}
.bf.is-auf .bf-inhalt .bk-mit{animation:bf-kachel .32s cubic-bezier(.2,1.5,.4,1) forwards;animation-delay:calc(var(--i) * 90ms + (var(--bf-warte, 0ms)))}
.bf.mit-kiste{--bf-warte:260ms}
.bf.is-fertig .bf-inhalt .bk-mit{animation:none;opacity:1;transform:none}
@keyframes bf-kachel{to{opacity:1;transform:none}}
.bf-ok{width:100%}
@media (prefers-reduced-motion:reduce){.bf-karte,.bf-strahlen,.bf-kiste,.bf-inhalt .bk-mit{animation:none!important;opacity:1;transform:none}}

/* ---- Shop: Kisten als Bild, Öffnen 1× / 10× ---- */
.ware-bild > img.kiste-bild{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,.55))}
.ware-preise{display:flex;margin:8px -10px 0}
.ware-preise > .ware-preis{flex:1 1 0;min-width:0;margin:0}
.ware-preise > .ware-preis + .ware-preis{border-left:1px solid rgba(0,0,0,.35)}
.ware-preis[data-x]::before{content:attr(data-x);font:800 12px/1 var(--font-ui);opacity:.85;margin-right:-2px}
.ware-preis .ware-x{font:800 12px/1 var(--font-ui);opacity:.85;margin-right:-2px}
    </style>
