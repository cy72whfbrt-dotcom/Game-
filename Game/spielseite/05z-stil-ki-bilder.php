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
.nav{background:#07090c;border-top:0;border-style:solid;border-width:0;border-image:url(bilder/ui_dock.webp) 30 60 30 60 fill / 10px 30px 8px 30px stretch}
.nav::before{display:none}
.nav-btn > .icon{border:0;padding:0;box-shadow:none;background:var(--ki-bild,none) center/60% auto no-repeat,var(--ui-rund) center/100% 100% no-repeat;transition:none}
.nav-btn.active > .icon,.nav-btn:hover > .icon{border:0;box-shadow:none;background:var(--ki-bild,none) center/62% auto no-repeat,var(--ui-rund-an) center/100% 100% no-repeat}
.nav-btn{gap:0} .nav-btn > .icon{width:44px;height:44px}
.nav-btn .nav-l{position:relative;margin-top:-11px;padding:2px 5px;border-radius:3px;background:rgba(8,10,14,.88);box-shadow:0 0 0 1px rgba(212,176,102,.35);color:var(--gold-100);text-shadow:0 1px 1px #000}   /* Beschriftung als Schildchen am Knopf, über dem Leisten-Rand */
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
.tab,.tab + .tab{box-shadow:none;border-style:solid;border-width:0;border-image:url(bilder/ui_reiter.webp) 30 40 14 40 fill / 10px 6px 5px 6px stretch}
.tab.active{background:none;border-image:url(bilder/ui_reiter_an.webp) 30 40 14 40 fill / 10px 6px 5px 6px stretch}
.tab.active::after,.tab.active::before{display:none}
@container tabs (max-width:420px){ .tab{font-size:9.5px;letter-spacing:0;padding:0 1px} }   /* Handy: „Einstellungen“ passt ganz in den Reiter */
.sect::after{height:8px;background:url(bilder/ui_linie.webp) left center/auto 100% no-repeat;background-size:100% 100%}
/* ---------------- Symbole überall (HTML; die Karte zeichnet weiter aus den SVG-Pfaden, 01a glyph) ---------------- */
:where(svg.icon:has(> use[href="#i-castle"]),svg.icon:has(> use[href="#i-star"]),svg.icon:has(> use[href="#i-crown"]),svg.icon:has(> use[href="#i-rank"]),svg.icon:has(> use[href="#i-gear"]),svg.icon:has(> use[href="#i-goal"]),svg.icon:has(> use[href="#i-lock"]),svg.icon:has(> use[href="#i-check"]),svg.icon:has(> use[href="#i-attack"]),svg.icon:has(> use[href="#i-scout"]),svg.icon:has(> use[href="#i-recall"]),svg.icon:has(> use[href="#i-multiattack"]),svg.icon:has(> use[href="#i-tower"]),svg.icon:has(> use[href="#i-defense"]),svg.icon:has(> use[href="#i-losses"]),svg.icon:has(> use[href="#i-upgrade"]),svg.icon:has(> use[href="#i-hourglass"]),svg.icon:has(> use[href="#i-battlelog"]),svg.icon:has(> use[href="#i-bund"]),svg.icon:has(> use[href="#i-event"]),svg.icon:has(> use[href="#i-shop"]),svg.icon:has(> use[href="#i-flag"]),svg.icon:has(> use[href="#i-back"])) > use{display:none}
:where(svg.icon:has(> use[href="#i-castle"]),svg.icon:has(> use[href="#i-star"]),svg.icon:has(> use[href="#i-crown"]),svg.icon:has(> use[href="#i-rank"]),svg.icon:has(> use[href="#i-gear"]),svg.icon:has(> use[href="#i-goal"]),svg.icon:has(> use[href="#i-lock"]),svg.icon:has(> use[href="#i-check"]),svg.icon:has(> use[href="#i-attack"]),svg.icon:has(> use[href="#i-scout"]),svg.icon:has(> use[href="#i-recall"]),svg.icon:has(> use[href="#i-multiattack"]),svg.icon:has(> use[href="#i-tower"]),svg.icon:has(> use[href="#i-defense"]),svg.icon:has(> use[href="#i-losses"]),svg.icon:has(> use[href="#i-upgrade"]),svg.icon:has(> use[href="#i-hourglass"]),svg.icon:has(> use[href="#i-battlelog"]),svg.icon:has(> use[href="#i-bund"]),svg.icon:has(> use[href="#i-event"]),svg.icon:has(> use[href="#i-shop"]),svg.icon:has(> use[href="#i-flag"]),svg.icon:has(> use[href="#i-back"])){background:var(--ki-sym) center/contain no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.55))}
svg.icon:has(> use[href="#i-castle"]){--ki-sym:url(bilder/ui_sym_burg.webp)} svg.icon:has(> use[href="#i-star"]){--ki-sym:url(bilder/ui_sym_stern.webp)} svg.icon:has(> use[href="#i-crown"]){--ki-sym:url(bilder/ui_sym_krone.webp)} svg.icon:has(> use[href="#i-rank"]){--ki-sym:url(bilder/ui_sym_pokal.webp)} svg.icon:has(> use[href="#i-gear"]){--ki-sym:url(bilder/ui_sym_zahnrad.webp)} svg.icon:has(> use[href="#i-goal"]){--ki-sym:url(bilder/ui_sym_ziel.webp)} svg.icon:has(> use[href="#i-lock"]){--ki-sym:url(bilder/ui_sym_schloss.webp)} svg.icon:has(> use[href="#i-check"]){--ki-sym:url(bilder/ui_sym_haken.webp)} svg.icon:has(> use[href="#i-attack"]){--ki-sym:url(bilder/ui_sym_schwert.webp)} svg.icon:has(> use[href="#i-scout"]){--ki-sym:url(bilder/ui_sym_spaeher.webp)} svg.icon:has(> use[href="#i-recall"]){--ki-sym:url(bilder/ui_sym_rueckzug.webp)} svg.icon:has(> use[href="#i-multiattack"]){--ki-sym:url(bilder/ui_sym_pfeile.webp)} svg.icon:has(> use[href="#i-tower"]){--ki-sym:url(bilder/ui_sym_turm.webp)} svg.icon:has(> use[href="#i-defense"]){--ki-sym:url(bilder/ui_sym_turm.webp)} svg.icon:has(> use[href="#i-losses"]){--ki-sym:url(bilder/ui_sym_verluste.webp)} svg.icon:has(> use[href="#i-upgrade"]){--ki-sym:url(bilder/ui_sym_aufstieg.webp)} svg.icon:has(> use[href="#i-hourglass"]){--ki-sym:url(bilder/ui_sym_zeit.webp)} svg.icon:has(> use[href="#i-battlelog"]){--ki-sym:url(bilder/ui_sym_rolle.webp)} svg.icon:has(> use[href="#i-bund"]){--ki-sym:url(bilder/ui_dock_bund.webp)} svg.icon:has(> use[href="#i-event"]){--ki-sym:url(bilder/ui_dock_events.webp)} svg.icon:has(> use[href="#i-shop"]){--ki-sym:url(bilder/ui_dock_shop.webp)} svg.icon:has(> use[href="#i-flag"]){--ki-sym:url(bilder/ui_fahne.webp)} svg.icon:has(> use[href="#i-back"]){--ki-sym:url(bilder/ui_zurueck.webp)}

/* ---------------- Belohnungs-Kacheln je Seltenheit, leerer Platz ---------------- */
.tile[data-r],.item-icon[data-r]{border-color:transparent;box-shadow:none;background:var(--ki-kachel) center/100% 100% no-repeat}
.tile[data-r]::before{display:none} .tile[data-r] > .icon{color:#fff8ea;filter:drop-shadow(0 1px 2px rgba(0,0,0,.8))}
[data-r="grau"]{--ki-kachel:url(bilder/ui_kachel_grau.webp)} [data-r="gruen"]{--ki-kachel:url(bilder/ui_kachel_gruen.webp)} [data-r="blau"]{--ki-kachel:url(bilder/ui_kachel_blau.webp)}
[data-r="lila"]{--ki-kachel:url(bilder/ui_kachel_lila.webp)} [data-r="gold"]{--ki-kachel:url(bilder/ui_kachel_gold.webp)} [data-r="rot"]{--ki-kachel:url(bilder/ui_kachel_rot.webp)}
.tile.empty{border:0;background:url(bilder/ui_platz.webp) center/100% 100% no-repeat}

/* ---------------- Listen-Karten, Hinweisbox (Anleitung), Balken ---------------- */
.ach{border:0;border-style:solid;background:none;border-image:url(bilder/ui_karte.webp) 24 fill / 8px stretch}
.ach.is-ready{border-image:url(bilder/ui_karte_an.webp) 24 fill / 8px stretch}
.anleitung{border:0;border-style:solid;background:none;-webkit-backdrop-filter:none;backdrop-filter:none;padding-left:18px;
  border-image:url(bilder/ui_hinweis.webp) 30 20 30 80 fill / 10px 7px 10px 20px stretch}
.pass-bar,.ach-sum-bar{height:12px;padding:3px 11px;border-radius:0;background:none;border-style:solid;border-width:0;overflow:visible;
  border-image:url(bilder/ui_balken.webp) 12 40 12 40 fill / 5px 14px 5px 14px stretch} .pass-bar i,.ach-sum-bar i{border-radius:3px}

/* ---------------- Aufstieg: Strahlen, Wappen mit Krone, Lorbeer ---------------- */
.lvlup-card{border:0;border-style:solid;border-image:url(bilder/ui_rahmen.webp) 44 fill / 16px stretch;background:none}
.lvlup-card::before{background:url(bilder/ui_strahlen.webp) center/contain no-repeat;-webkit-mask-image:none;mask-image:none;opacity:.8}
.lvlup-badge{width:84px;height:96px;border:0;border-radius:0;box-shadow:none;background:url(bilder/ui_wappen.webp) center/contain no-repeat;padding-top:16px;isolation:isolate}
.lvlup-badge::after{content:"";position:absolute;inset:-6px -26px -10px;background:url(bilder/ui_lorbeer.webp) center/contain no-repeat;pointer-events:none;z-index:-1}
.lvlup-rule{height:10px;background:url(bilder/ui_linie.webp) center/100% 100% no-repeat}
    </style>
