// Teil 05z-stil-ki-bilder.php: Stil: Oberfläche aus KI-Bildern (bilder/ui_*.webp, werkzeuge/ui_bilder_schneiden.py) – nur Aussehen, Zahlen/Texte bleiben Code
    <style>
/* =====================================================================
   KI-BILDER (Alexander 7.10.: „alles mit KI-Bildern, sieht besser aus“) – überschreibt das gezeichnete Aussehen.
   Rahmen/Knöpfe dehnen sich per border-image (Ecken fest, Mitte gedehnt); Symbole als Hintergrund, das SVG-<use> bleibt (Karte/Tests).
   ===================================================================== */
:root{
  --ui-rund:url(bilder/ui_rund.webp); --ui-rund-an:url(bilder/ui_rund_an.webp);
}
/* Symbol-Bild statt SVG-Zeichnung: das <svg class="icon"> bleibt (Größe, Platz), nur seine Linien verschwinden */
.ki-sym > use,.nav-btn > .icon > use,.mapctl button > .icon > use,.btn-x > .icon > use{display:none}

/* ---------------- HUD oben ---------------- */
.hud-me .avatar-ring{overflow:visible}
.hud-me .avatar-ring::after{content:"";position:absolute;inset:-6px;background:url(bilder/ui_ring.webp) center/100% 100% no-repeat;pointer-events:none}
.hud-me .lvl{border:0;background:url(bilder/ui_stufe.webp) center/100% 100% no-repeat;box-shadow:none;min-width:19px;height:23px;right:-9px;bottom:-9px;padding:0 3px 3px;
  text-shadow:0 1px 2px #000}
.hud-werte{background:none;border:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;gap:2px;padding:0}
.hud-werte > .res{height:26px;padding:0 6px 0 34px;justify-content:flex-start;border-style:solid;border-width:0;
  border-image:url(bilder/ui_kapsel.webp) 20 30 20 90 fill / 7px 10px 7px 30px stretch}
.hud-werte > .res > .icon{position:absolute;left:4px;top:50%;width:18px;height:18px;margin-top:-9px;filter:drop-shadow(0 1px 1px #000)}
.hud-werte > .res b{color:var(--tx-1);text-shadow:0 1px 2px #000}
.hud > .res--roh{border:0;border-radius:0;background:url(bilder/ui_kasten.webp) center/100% 100% no-repeat;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
.hud > .res--roh > .icon{width:18px;height:18px}
@media (min-width:900px) and (min-height:501px){ .hud > .res--roh{width:auto;padding:0 10px;border-style:solid;border-width:0;background:none;
  border-image:url(bilder/ui_kasten.webp) 26 fill / 9px stretch} }
/* Event-Streifen: rotes Band statt lila Verlauf */
.mb-chip.is-tour{background:none;border-color:transparent;border-style:solid;border-width:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;
  padding:0 18px 0 16px;border-image:url(bilder/ui_band_rot.webp) 22 70 22 70 fill / 7px 22px 7px 22px stretch;color:#fff3e6}
.mb-chip.is-tour i{color:#ffe1c8}
.badge{border:0;background:url(bilder/ui_punkt.webp) center/100% 100% no-repeat;text-shadow:0 1px 1px rgba(0,0,0,.6)}

/* ---------------- Leiste unten (Dock) ---------------- */
.nav{background:#07090c;border-top:0;border-style:solid;border-width:0;border-image:url(bilder/ui_dock.webp) 30 60 30 60 fill / 14px 30px 14px 30px stretch}
.nav::before{display:none}
.nav-btn > .icon{border:0;padding:0;box-shadow:none;background:var(--ki-bild,none) center/60% auto no-repeat,var(--ui-rund) center/100% 100% no-repeat;transition:none}
.nav-btn.active > .icon,.nav-btn:hover > .icon{border:0;box-shadow:none;background:var(--ki-bild,none) center/62% auto no-repeat,var(--ui-rund-an) center/100% 100% no-repeat}
.nav-btn .nav-l{text-shadow:0 1px 2px #000}
#cityNavBtn{--ki-bild:url(bilder/ui_dock_burg.webp)} body.in-stadt #cityNavBtn{--ki-bild:url(bilder/ui_fahne.webp)}
#bundBtn{--ki-bild:url(bilder/ui_dock_bund.webp)} #battleLogBtn{--ki-bild:url(bilder/ui_dock_kampf.webp)}
#goalsBtn{--ki-bild:url(bilder/ui_dock_events.webp)} #shopBtn{--ki-bild:url(bilder/ui_dock_shop.webp)} #profileBtn{--ki-bild:url(bilder/ui_dock_krone.webp)}

/* ---------------- Karten-Knöpfe ---------------- */
.mapctl{gap:6px;background:none;border:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
.mapctl button,.mapctl button + button{border:0;border-radius:50%;background:var(--ui-rund) center/100% 100% no-repeat}
.mapctl button:hover,.mapctl button:active,.mapctl button.on{background:var(--ui-rund-an) center/100% 100% no-repeat}
.mapctl .icon{width:30px;height:30px;background:var(--ki-bild) center/contain no-repeat}
#zoomInBtn{--ki-bild:url(bilder/ui_zoom_rein.webp)} #zoomOutBtn{--ki-bild:url(bilder/ui_zoom_raus.webp)} #homeBtn{--ki-bild:url(bilder/ui_kompass.webp)}
#markerBtn{--ki-bild:url(bilder/ui_fahne.webp)} #armyBtn{--ki-bild:url(bilder/ui_armee.webp)}
.mapctl button:disabled .icon{opacity:.45}

/* ---------------- Knöpfe (Schrift bleibt Code) ---------------- */
.btn--primary,.btn--secondary,.btn--danger,.btn:disabled{border-style:solid;border-color:transparent;box-shadow:none;background:none;border-width:0;
  border-image:var(--k-bild) 30 40 30 40 fill / 11px 14px 11px 14px stretch}
.btn--primary{--k-bild:url(bilder/ui_k_gold.webp);color:#2a1904;text-shadow:0 1px 0 rgba(255,236,190,.5)}
.btn--primary:active{--k-bild:url(bilder/ui_k_gold_an.webp)}
.btn--secondary{--k-bild:url(bilder/ui_k_dunkel.webp)}
.btn--danger{--k-bild:url(bilder/ui_k_rot.webp)}
.btn:disabled{--k-bild:url(bilder/ui_k_grau.webp);color:#d8d4cc;text-shadow:0 1px 1px #000}
.btn--chip.btn--secondary,.btn--chip.btn--primary{border-image:var(--k-bild) 30 40 30 40 fill / 9px 12px 9px 12px stretch}
.chip:not(.chip--rar):not(.chip--scouted){border:0;background:none;border-style:solid;border-image:url(bilder/ui_k_chip.webp) 26 fill / 10px stretch}

/* ---------------- Fenster: Rahmen, Schließen, Reiter, Trennlinie ---------------- */
.panel::before{border:16px solid transparent;border-image:url(bilder/ui_rahmen.webp) 44 / 16px stretch}
.phead::after{width:160px;height:10px;background:url(bilder/ui_linie.webp) center/100% 100% no-repeat}
.btn-x{border:0}
.btn-x > .icon{width:32px;height:32px;background:url(bilder/ui_zu.webp) center/contain no-repeat}
.btn-x:hover{border:0;filter:brightness(1.12)}
.tabs{background:none;border-bottom:0;gap:3px;padding:4px 4px 0}
.tab,.tab + .tab{box-shadow:none;border-style:solid;border-width:0;border-image:url(bilder/ui_reiter.webp) 30 40 14 40 fill / 10px 8px 5px 8px stretch}
.tab.active{background:none;border-image:url(bilder/ui_reiter_an.webp) 30 40 14 40 fill / 10px 8px 5px 8px stretch}
.tab.active::after,.tab.active::before{display:none}
.sect::after{height:8px;background:url(bilder/ui_linie.webp) left center/auto 100% no-repeat;background-size:100% 100%}
    </style>
