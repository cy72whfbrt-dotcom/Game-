// Teil 05z-stil-ki-bilder.php: Stil: Oberfläche aus KI-Bildern (bilder/ui_*.webp, werkzeuge/ui_bilder_schneiden.py) – nur Aussehen, Zahlen/Texte bleiben Code
    <style>
/* =====================================================================
   KI-BILDER (Alexander 7.10.: „alles mit KI-Bildern, sieht besser aus“) – überschreibt das gezeichnete Aussehen.
   Rahmen/Knöpfe dehnen sich per border-image (Ecken fest, Mitte gedehnt); Symbole als Hintergrund, das SVG-<use> bleibt (Karte/Tests).

   GRUNDFORM FENSTER (EINE für alle – neue Fenster nur daraus bauen, nichts Eigenes zeichnen):
     .ki-fenster   Fenster-Rahmen ui_rahmen + dunkler Grund (schon dran: .panel, .hh, .lvlup-card, .marker-sheet, #citySheet)
     .phead        Kopfzeile: Wappen/Symbol · Überzeile (.overline) + Titel (.ptitle) · rotes X (.btn-x); darunter die Trennlinie ui_linie
     .tabs > .tab  Reiter ui_reiter, aktiv (.active) ui_reiter_an · Unter-Reiter/Wahl (.p5-chip, .seg button): ui_k_chip, aktiv ui_k_gold
     .ki-karte     Listen-Karte ui_karte (Zeile/Kasten im Fenster), .ki-karte--an hervorgehoben ui_karte_an (abholbar/fertig)
                   (schon dran: KI_KARTE unten – .quest, .ach, .logRow, .stat, .inbox-row, …)
     Knöpfe        .btn--primary Gold (gedrückt ui_k_gold_an) · .btn--secondary Dunkel · .btn--danger Rot · :disabled Grau · .chip Schildchen
     Kacheln       [data-r="grau|gruen|blau|lila|gold|rot"] ui_kachel_* · .tile.empty ui_platz
     Hinweis       .anleitung ui_hinweis (Rolle links) · .notice wie Listen-Karte
     Balken        .pass-bar/.ach-sum-bar/.ki-balken Rahmen ui_balken (Füllung <i> bleibt Code)
     Symbole       automatisch: <svg class="icon"><use href="#i-…"> → bilder/ui_sym_*.webp (Liste unten)
   ===================================================================== */
:root{
  --ui-rund:url(bilder/ui_rund.webp); --ui-rund-an:url(bilder/ui_rund_an.webp);
}
/* Symbol-Bild statt SVG-Zeichnung: das <svg class="icon"> bleibt (Größe, Platz), nur seine Linien verschwinden */
.ki-sym > use,.nav-btn > .icon > use,.mapctl button > .icon > use,.btn-x > .icon:has(> use[href="#i-close"]) > use{display:none}

/* ---------------- HUD oben ---------------- */
.hud-me .avatar-ring{overflow:visible}
.hud-me .avatar-ring::after{content:"";position:absolute;inset:-6px;background:url(bilder/ui_ring.webp) center/100% 100% no-repeat;pointer-events:none}
.hud-me .lvl{border:0;background:url(bilder/ui_stufe.webp) center/100% 100% no-repeat;box-shadow:none;min-width:19px;height:23px;right:-9px;bottom:-9px;padding:0 3px 3px;
  text-shadow:0 1px 2px #000}
/* EINE Reihe: Münzen · Edelsteine · Truppen · Holz · Stein · Eisen – kleine Kapseln (Symbol links, Zahl rechts, fmtHud höchstens 5 Zeichen) */
.hud-werte{background:none;border:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;gap:2px;padding:0;height:24px;margin-top:6px}
.hud{z-index:calc(var(--z-hud) + 1)}   /* die Tippflächen der Kapseln liegen über dem Streifen darunter */
.hud-werte .res-roh{display:contents}
.hud-werte .res{position:relative;flex:1 1 auto;min-width:max-content;height:24px;padding:0 3px 0 20px;gap:0;justify-content:center;border-style:solid;border-width:0;
  border-image:url(bilder/ui_kapsel.webp) 20 30 20 90 fill / 6px 6px 6px 21px stretch}
.hud-werte .res > .icon{position:absolute;left:1px;top:50%;width:19px;height:19px;margin-top:-10px}
.hud-werte .res b{overflow:visible;font:600 11px/1 var(--font-ui);letter-spacing:-.02em;color:var(--tx-1);text-shadow:0 1px 2px #000}
.hud-werte button.res::before{content:"";position:absolute;left:0;right:0;top:50%;height:var(--k-tipp);transform:translateY(-50%)}   /* Tippfläche 44 px */
#hudRoh.on [data-roh]{filter:brightness(1.1)}
.roh-blase{position:fixed;z-index:var(--z-toast);display:flex;flex-wrap:wrap;align-items:center;gap:2px 6px;max-width:240px;padding:6px 10px;
  font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-1);border-style:solid;border-width:0;border-image:url(bilder/ui_karte_an.webp) 24 fill / 8px stretch}
.roh-blase .icon{width:16px;height:16px} .roh-blase small{flex:1 1 100%;color:var(--gold-200);font-size:var(--fs-11)}
@media (min-width:900px) and (min-height:501px){ .hud-werte{flex:0 1 640px} .hud-werte .res{padding-left:24px} .hud-werte .res b{font-size:13px} }
/* Event-Streifen: rotes Band statt lila Verlauf */
.mb-chip.is-tour{background:none;border-color:transparent;border-style:solid;border-width:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;
  padding:0 18px 0 16px;border-image:url(bilder/ui_band_rot.webp) 22 70 22 70 fill / 7px 22px 7px 22px stretch;color:#fff3e6}
.mb-chip.is-tour i{color:#ffe1c8}
.badge{border:0;background:url(bilder/ui_punkt.webp) center/100% 100% no-repeat;text-shadow:0 1px 1px rgba(0,0,0,.6)}

/* ---------------- Leiste unten (Dock) ---------------- */
.nav{background:#07090c;border-top:0;border-style:solid;border-width:0;border-image:url(bilder/ui_dock.webp) 30 60 30 60 fill / 9px 30px 6px 30px stretch}
.nav::before{display:none}
.nav-btn > .icon{border:0;border-radius:50%;padding:0;box-shadow:none;background:var(--ki-bild,none) center/60% auto no-repeat,var(--ui-rund) center/100% 100% no-repeat;transition:none}
.nav-btn.active > .icon,.nav-btn:hover > .icon{border:0;box-shadow:none;background:var(--ki-bild,none) center/62% auto no-repeat,var(--ui-rund-an) center/100% 100% no-repeat}
.nav{padding-bottom:max(2px,calc(var(--safe-bd) - 18px))}   /* Knöpfe tiefer in die Leiste (der Home-Balken-Rand bleibt frei genug) */
.nav-btn{gap:1px;justify-content:flex-end;padding-bottom:6px} .nav-btn > .icon{width:44px;height:44px}
.nav-btn .nav-l{font-size:10px;color:var(--gold-100);text-shadow:0 1px 2px #000,0 0 4px #000}
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
.btn--primary:not(.btn--sm):not(.btn--chip),.btn--secondary:not(.btn--sm):not(.btn--chip),.btn--danger:not(.btn--sm):not(.btn--chip){padding-left:18px;padding-right:18px}   /* Schrift nicht auf den Spitzen links/rechts */
.btn--primary{--k-bild:url(bilder/ui_k_gold.webp);color:#2a1904;text-shadow:0 1px 0 rgba(255,236,190,.5)}
.btn--primary:active{--k-bild:url(bilder/ui_k_gold_an.webp)}
.btn--secondary{--k-bild:url(bilder/ui_k_dunkel.webp)}
.btn--danger{--k-bild:url(bilder/ui_k_rot.webp)}
.btn:disabled{--k-bild:url(bilder/ui_k_grau.webp);color:var(--tx-3);text-shadow:0 1px 2px #000}
.btn--chip.btn--secondary,.btn--chip.btn--primary{border-image:var(--k-bild) 30 40 30 40 fill / 9px 12px 9px 12px stretch}
.chip:not(.chip--rar):not(.chip--scouted){border:0;background:none;border-style:solid;border-image:url(bilder/ui_k_chip.webp) 26 fill / 10px stretch}

/* ---------------- Grundform Fenster: Rahmen, Kopfzeile, Schließen, Reiter, Trennlinie ---------------- */
.panel::before,.hh::before{border:16px solid transparent;border-image:url(bilder/ui_rahmen.webp) 44 / 16px stretch}
.ki-fenster,.marker-sheet{border:0;border-style:solid;border-image:url(bilder/ui_rahmen.webp) 44 / 16px stretch;background:var(--noise),var(--panel-bg);border-radius:0}
.marker-sheet{padding:16px}
/* gleicher Innenabstand links und rechts: der Inhalt bleibt innerhalb des Rahmens (16 px Rand + 4 px Luft) */
.panel > :is(.phead,.pbody,.pfoot,.p5-chips){padding-left:20px;padding-right:20px} .hh{padding-left:20px;padding-right:20px}
#citySheet{border-style:solid;border-width:1px 1px 0;border-image:url(bilder/ui_rahmen.webp) 44 / 16px stretch;border-radius:0}
.phead::after{width:160px;height:10px;background:url(bilder/ui_linie.webp) center/100% 100% no-repeat}
.btn-x{border:0}
.btn-x > .icon:has(> use[href="#i-close"]){width:32px;height:32px;background:url(bilder/ui_zu.webp) center/contain no-repeat}   /* (nur „Schließen“ – andere runde Knöpfe wie „Info“ behalten ihr Zeichen) */
.btn-x:hover{border:0;filter:brightness(1.12)}
.tabs{background:none;border-bottom:0;gap:3px;padding:4px 16px 0}
.tab,.tab + .tab{box-shadow:none;border-style:solid;border-width:0;border-image:url(bilder/ui_reiter.webp) 30 40 14 40 fill / 10px 6px 5px 6px stretch}
.tab.active{background:none;border-image:url(bilder/ui_reiter_an.webp) 30 40 14 40 fill / 10px 6px 5px 6px stretch}
.tab.active::after,.tab.active::before{display:none}
@container tabs (max-width:420px){ .tab{font:600 10.5px/1 var(--font-ui);letter-spacing:0;padding:0 1px} }   /* Handy: schmale Schrift – „Einstellungen“, „Thron-Punkte“ passen ganz in den Reiter */
.sect::after{height:8px;background:url(bilder/ui_linie.webp) left center/auto 100% no-repeat;background-size:100% 100%}
/* ---------------- Symbole überall (HTML; die Karte zeichnet weiter aus den SVG-Pfaden, 01a glyph) ---------------- */
:where(svg.icon:has(> use[href="#i-castle"]),svg.icon:has(> use[href="#i-star"]),svg.icon:has(> use[href="#i-crown"]),svg.icon:has(> use[href="#i-rank"]),svg.icon:has(> use[href="#i-gear"]),svg.icon:has(> use[href="#i-goal"]),svg.icon:has(> use[href="#i-lock"]),svg.icon:has(> use[href="#i-check"]),svg.icon:has(> use[href="#i-attack"]),svg.icon:has(> use[href="#i-scout"]),svg.icon:has(> use[href="#i-recall"]),svg.icon:has(> use[href="#i-multiattack"]),svg.icon:has(> use[href="#i-tower"]),svg.icon:has(> use[href="#i-defense"]),svg.icon:has(> use[href="#i-losses"]),svg.icon:has(> use[href="#i-upgrade"]),svg.icon:has(> use[href="#i-hourglass"]),svg.icon:has(> use[href="#i-battlelog"]),svg.icon:has(> use[href="#i-bund"]),svg.icon:has(> use[href="#i-event"]),svg.icon:has(> use[href="#i-shop"]),svg.icon:has(> use[href="#i-flag"]),svg.icon:has(> use[href="#i-back"]),svg.icon:has(> use[href="#i-coin"]),svg.icon:has(> use[href="#i-gem"]),svg.icon:has(> use[href="#i-troops"]),svg.icon:has(> use[href="#i-wood"]),svg.icon:has(> use[href="#i-stone"]),svg.icon:has(> use[href="#i-iron"]),svg.icon:has(> use[href="#i-weapon"]),svg.icon:has(> use[href="#i-armor"]),svg.icon:has(> use[href="#i-shield"]),svg.icon:has(> use[href="#i-boots"]),svg.icon:has(> use[href="#i-points"])) > use{display:none}
:where(svg.icon:has(> use[href="#i-castle"]),svg.icon:has(> use[href="#i-star"]),svg.icon:has(> use[href="#i-crown"]),svg.icon:has(> use[href="#i-rank"]),svg.icon:has(> use[href="#i-gear"]),svg.icon:has(> use[href="#i-goal"]),svg.icon:has(> use[href="#i-lock"]),svg.icon:has(> use[href="#i-check"]),svg.icon:has(> use[href="#i-attack"]),svg.icon:has(> use[href="#i-scout"]),svg.icon:has(> use[href="#i-recall"]),svg.icon:has(> use[href="#i-multiattack"]),svg.icon:has(> use[href="#i-tower"]),svg.icon:has(> use[href="#i-defense"]),svg.icon:has(> use[href="#i-losses"]),svg.icon:has(> use[href="#i-upgrade"]),svg.icon:has(> use[href="#i-hourglass"]),svg.icon:has(> use[href="#i-battlelog"]),svg.icon:has(> use[href="#i-bund"]),svg.icon:has(> use[href="#i-event"]),svg.icon:has(> use[href="#i-shop"]),svg.icon:has(> use[href="#i-flag"]),svg.icon:has(> use[href="#i-back"]),svg.icon:has(> use[href="#i-coin"]),svg.icon:has(> use[href="#i-gem"]),svg.icon:has(> use[href="#i-troops"]),svg.icon:has(> use[href="#i-wood"]),svg.icon:has(> use[href="#i-stone"]),svg.icon:has(> use[href="#i-iron"]),svg.icon:has(> use[href="#i-weapon"]),svg.icon:has(> use[href="#i-armor"]),svg.icon:has(> use[href="#i-shield"]),svg.icon:has(> use[href="#i-boots"]),svg.icon:has(> use[href="#i-points"])){background:var(--ki-sym) center/contain no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.55))}
svg.icon:has(> use[href="#i-castle"]){--ki-sym:url(bilder/ui_sym_burg.webp)} svg.icon:has(> use[href="#i-star"]){--ki-sym:url(bilder/ui_sym_stern.webp)} svg.icon:has(> use[href="#i-crown"]){--ki-sym:url(bilder/ui_sym_krone.webp)} svg.icon:has(> use[href="#i-rank"]){--ki-sym:url(bilder/ui_sym_pokal.webp)} svg.icon:has(> use[href="#i-gear"]){--ki-sym:url(bilder/ui_sym_zahnrad.webp)} svg.icon:has(> use[href="#i-goal"]){--ki-sym:url(bilder/ui_sym_ziel.webp)} svg.icon:has(> use[href="#i-lock"]){--ki-sym:url(bilder/ui_sym_schloss.webp)} svg.icon:has(> use[href="#i-check"]){--ki-sym:url(bilder/ui_sym_haken.webp)} svg.icon:has(> use[href="#i-attack"]){--ki-sym:url(bilder/ui_sym_schwert.webp)} svg.icon:has(> use[href="#i-scout"]){--ki-sym:url(bilder/ui_sym_spaeher.webp)} svg.icon:has(> use[href="#i-recall"]){--ki-sym:url(bilder/ui_sym_rueckzug.webp)} svg.icon:has(> use[href="#i-multiattack"]){--ki-sym:url(bilder/ui_sym_pfeile.webp)} svg.icon:has(> use[href="#i-tower"]){--ki-sym:url(bilder/ui_sym_turm.webp)} svg.icon:has(> use[href="#i-defense"]){--ki-sym:url(bilder/ui_sym_turm.webp)} svg.icon:has(> use[href="#i-losses"]){--ki-sym:url(bilder/ui_sym_verluste.webp)} svg.icon:has(> use[href="#i-upgrade"]){--ki-sym:url(bilder/ui_sym_aufstieg.webp)} svg.icon:has(> use[href="#i-hourglass"]){--ki-sym:url(bilder/ui_sym_zeit.webp)} svg.icon:has(> use[href="#i-battlelog"]){--ki-sym:url(bilder/ui_sym_rolle.webp)} svg.icon:has(> use[href="#i-bund"]){--ki-sym:url(bilder/ui_dock_bund.webp)} svg.icon:has(> use[href="#i-event"]){--ki-sym:url(bilder/ui_dock_events.webp)} svg.icon:has(> use[href="#i-shop"]){--ki-sym:url(bilder/ui_dock_shop.webp)} svg.icon:has(> use[href="#i-flag"]){--ki-sym:url(bilder/ui_fahne.webp)} svg.icon:has(> use[href="#i-back"]){--ki-sym:url(bilder/ui_zurueck.webp)} svg.icon:has(> use[href="#i-coin"]){--ki-sym:url(bilder/ui_res_muenzen.webp)} svg.icon:has(> use[href="#i-gem"]){--ki-sym:url(bilder/ui_res_edelstein.webp)} svg.icon:has(> use[href="#i-troops"]){--ki-sym:url(bilder/ui_res_truppen.webp)} svg.icon:has(> use[href="#i-wood"]){--ki-sym:url(bilder/ui_res_holz.webp)} svg.icon:has(> use[href="#i-stone"]){--ki-sym:url(bilder/ui_res_stein.webp)} svg.icon:has(> use[href="#i-iron"]){--ki-sym:url(bilder/ui_res_eisen.webp)} svg.icon:has(> use[href="#i-weapon"]){--ki-sym:url(bilder/ui_sym_waffe.webp)} svg.icon:has(> use[href="#i-armor"]){--ki-sym:url(bilder/ui_sym_ruestung.webp)} svg.icon:has(> use[href="#i-shield"]){--ki-sym:url(bilder/ui_sym_schild.webp)} svg.icon:has(> use[href="#i-boots"]){--ki-sym:url(bilder/ui_sym_stiefel.webp)} svg.icon:has(> use[href="#i-points"]){--ki-sym:url(bilder/ui_res_punkte.webp)}

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

/* ---------------- Listen-Karten in allen Fenstern (Shop, Events, Bündnis, Kampf, Berichte, Pass, Rangliste, Einstellungen, Gebäude) ---------------- */
:is(.ki-karte,.quest,.ach,.logRow,.stat,.force,.inbox-row,.barb-card,.rp-stat,.rp-bld,.rp-last,.rp-pass,.rp-bund,.chain,.tour-prize,.pass-cell,.pass-how-l,.ach-sum,.pass-hero,
  .pass-prem,.pass-old,.daily-row,.title-row,.forge-row,.fo-row,.fo-detail,.bd-zeile,.bd-form,.anf,.gate-ctl,.city-vgl,.shop-info,.skin-card,.crest-card,.statChip,.notice,
  .throne-status,.p5-naechste,.ach-done summary,.set-zeile,.barb-rank li,.marker-input,.troop-in,.from-sel,.ap-kopf,.ap-hchip,.inbox-empty,.empty-state,.lb-row,.rank-row){border-radius:0!important;box-shadow:none;
  border-image:url(bilder/ui_karte.webp) 24 fill / 8px stretch!important}   /* (!important: Grundform gilt immer – auch gegen ältere „border:“-Kurzregeln mit #id) */
:is(.ki-karte--an,.ach.is-ready,.quest.is-done:not(.is-claimed),.pass-cell.is-ready,.inbox-row.is-gold,.barb-rank li.me,.logRow.is-new,.ap-hchip.on,.bd-gk,.daily-day.is-today){border-image:url(bilder/ui_karte_an.webp) 24 fill / 8px stretch!important}
.set-zeile{padding:0 10px;margin-bottom:4px} .set-zeile:last-child{border-bottom:0}
/* Unter-Reiter und Wahl-Knöpfe: Schildchen, aktiv gold */
:is(.p5-chip,.seg:not(.hero-seg) > button,.look-title,.marker-presets button,.set-wahl button){border-radius:0!important;box-shadow:none;
  border-image:url(bilder/ui_k_chip.webp) 26 fill / 9px stretch!important}
:is(.p5-chip.active,.seg:not(.hero-seg) > button.on,.look-title.on,.marker-presets button.on,.set-wahl button.on){border-image:url(bilder/ui_k_gold.webp) 30 40 30 40 fill / 9px 12px 9px 12px stretch!important;color:#2a1904;text-shadow:0 1px 0 rgba(255,236,190,.5)}
:is(.seg:not(.hero-seg) > button):disabled{border-image:url(bilder/ui_k_grau.webp) 30 40 30 40 fill / 9px 12px 9px 12px stretch!important}
.ki-balken{border-style:solid;border-width:0;border-image:url(bilder/ui_balken.webp) 12 40 12 40 fill / 5px 14px 5px 14px stretch}
/* Wappen-Feld im Fenster-Kopf (.emblem): Item-Platz statt gezeichnetem Kasten; Stufe als Schildchen */
.emblem{border:0;border-radius:0;box-shadow:none;background:url(bilder/ui_platz.webp) center/100% 100% no-repeat}
:is(.emblem,.rp-crest,#pAvatarRing) .lvl{border:0;background:url(bilder/ui_stufe.webp) center/100% 100% no-repeat;box-shadow:none;height:22px;padding-bottom:3px;text-shadow:0 1px 2px #000}
.ap-spaehen{border-radius:0;background:none;border-image:url(bilder/ui_k_dunkel.webp) 30 40 30 40 fill / 8px 10px 8px 10px stretch!important}
/* Schieberegler: Spur im Balken-Rahmen, Knopf als Edelstein-Knopf */
.slider::-webkit-slider-runnable-track{height:12px;border:0;border-radius:0;border-style:solid;border-image:url(bilder/ui_balken.webp) 12 40 12 40 fill / 5px 14px 5px 14px stretch}
.slider::-webkit-slider-thumb{width:26px;height:26px;margin-top:-7px;border:0;border-radius:50%;background:url(bilder/ui_edelstein.webp) center/100% 100% no-repeat;box-shadow:none}
.slider::-moz-range-track{height:12px;border-radius:0;background:url(bilder/ui_balken.webp) center/100% 100% no-repeat}
.slider::-moz-range-thumb{width:26px;height:26px;border:0;background:url(bilder/ui_edelstein.webp) center/100% 100% no-repeat}
/* Shop-Angebote, tägliche Belohnung, Bündnis-Start: Rahmen der Listen-Karte um den eigenen (farbigen) Grund */
:is(.ware,.daily,.bd-start){border-radius:0!important;border-image:url(bilder/ui_karte.webp) 24 / 8px stretch!important}
.daily-day{border-radius:0!important;border-image:url(bilder/ui_platz.webp) 30 fill / 8px stretch!important}
:is(.pill,.ware-link){border-radius:0!important;background:none;border-image:url(bilder/ui_k_chip.webp) 26 fill / 9px stretch!important}
.ware-preis{border-radius:0!important;border-image:url(bilder/ui_k_dunkel.webp) 30 40 30 40 fill / 9px 12px 9px 12px stretch!important}
.ware .band{border-style:solid;border-width:0;background:none;border-image:url(bilder/ui_band_gold.webp) 30 70 30 70 fill / 6px 16px 6px 16px stretch;padding:0 16px}
    </style>
