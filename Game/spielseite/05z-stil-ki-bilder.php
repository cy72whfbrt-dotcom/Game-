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
/* Ladebild: der dunkle Grund hinter dem Titel läuft rundum weich aus (closest-side: nie eine harte Kante am Kastenrand) */
.splash-top::before{inset:-70px -60px;background:radial-gradient(closest-side at 50% 55%,rgba(6,10,28,.72),rgba(6,10,28,.35) 60%,transparent)}
/* solange das Ladebild steht: HUD, Leiste und Kartenknöpfe gar nicht zeichnen – sonst lädt der Browser ihre Bilder vor dem Titelbild */
body:has(> #splash:not(.is-leaving)) :is(#hud,#cornerButtons,#mapControls,#midBar){display:none}
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
@media (min-width:900px) and (min-height:501px){ .hud-werte{flex:0 1 640px} .hud-werte .res{flex:0 0 84px;min-width:84px;padding-left:24px} .hud-werte .res b{font-size:13px;min-width:0;text-align:center} }   /* Desktop: gleich breite Kapseln (fmtHud ≤ 5 Zeichen), jede Zahl mittig (vorher 6,2em-Feld: Münzen links, Holz mittig) */
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
.nav{padding-bottom:var(--safe-bd)}   /* Beschriftung immer über der Home-Leiste des iPhones */
.nav-btn{gap:1px;justify-content:center} .nav-btn > .icon{width:44px;height:44px}
.nav-btn .nav-l{font-size:10px;color:var(--gold-100);text-shadow:0 1px 2px #000,0 0 4px #000}
@media (max-width:899px) and (min-height:501px){   /* Handy (Alexander 7.10.): Leiste niedriger, mit Abstand zum Rand – beide Endstücke ganz zu sehen –, Knöpfe enger und kleiner (Tippfläche ≥ 44 px) */
  :root{--dock-h:56px}
  .nav{left:calc(var(--safe-l) + 8px);right:calc(var(--safe-r) + 8px);bottom:var(--safe-bd);height:var(--dock-h);padding:0 24px;background:none;align-items:center;grid-template-columns:repeat(6,minmax(44px,56px));justify-content:center;column-gap:2px;
    border-image-width:7px 22px 5px 22px}
  /* Ring und Symbol als Hintergrund des Knopfs (nicht des SVG – Safari setzt ein SVG-Hintergrundbild nicht mittig); das SVG bleibt als Platzhalter */
  .nav{align-items:stretch}
  .nav-btn{--ki-gr:auto 20px;justify-content:flex-start;padding:7px 0 5px;background:var(--ki-bild,none) center 13px/var(--ki-gr) no-repeat,var(--ui-rund) center 7px/32px 32px no-repeat}   /* zwischen oberem und unterem Leistenrand */
  .nav-btn.active,.nav-btn:hover{background:var(--ki-bild,none) center 13px/var(--ki-gr) no-repeat,var(--ui-rund-an) center 7px/32px 32px no-repeat}
  .nav-btn > .icon,.nav-btn.active > .icon,.nav-btn:hover > .icon{width:32px;height:32px;background:none}
  #bundBtn,#goalsBtn{--ki-gr:22px auto}   /* breite Symbole: nach der Breite */
  .nav-btn .nav-l{font-size:9px;letter-spacing:0}   /* 6 Knöpfe: „Rucksack“ passt in seine Spalte */
  body::after{content:"";position:fixed;left:0;right:0;bottom:0;height:var(--safe-bd);z-index:var(--z-dock);background:#07090c;pointer-events:none}   /* die Home-Leiste des iPhones: dunkler Grund UNTER der Leiste */
}
@media (min-width:900px) and (min-height:501px){   /* Desktop: dieselbe schlanke Leiste (nur unten mittig statt am Rand) */
  .nav{padding:2px 30px 0;gap:4px;border:0;border-radius:0;box-shadow:none;background:none;-webkit-backdrop-filter:none;backdrop-filter:none;border-image-width:7px 22px 5px 22px}
  .nav-btn{width:60px;height:54px;gap:1px} .nav-btn > .icon{width:36px;height:36px}
  .nav-l{font:600 10px/1 var(--font-ui);letter-spacing:.04em;text-transform:uppercase}
}
#cityNavBtn{--ki-bild:url(bilder/ui_dock_burg.webp)} body.in-stadt #cityNavBtn{--ki-bild:url(bilder/ui_fahne.webp)}
#bundBtn{--ki-bild:url(bilder/ui_dock_bund.webp)} #battleLogBtn{--ki-bild:url(bilder/ui_dock_kampf.webp)}
#goalsBtn{--ki-bild:url(bilder/ui_dock_events.webp)} #rucksackBtn{--ki-bild:url(bilder/ui_dock_rucksack.webp)} #shopBtn{--ki-bild:url(bilder/ui_dock_shop.webp)} #profileBtn{--ki-bild:url(bilder/ui_dock_krone.webp)}

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
/* der Rahmen ist der eigene Rand jedes Fensters (nicht ein darübergelegtes ::before): immer sichtbar, egal welcher Reiter und wie geöffnet; der Inhalt liegt nie darunter */
.panel{border:solid transparent;border-width:12px 12px 8px;border-image:url(bilder/ui_rahmen.webp) 44 / 12px 12px 8px stretch;background-clip:border-box}
.panel::before{content:none} .panel .sheet-grab{display:none}   /* kein grauer Griff – der Rahmen ist überall gleich */
/* Fenster-Inhalt rollt weiter: unten läuft er weich aus (Hinweis „da kommt noch mehr“) statt hart am Rahmen abgeschnitten – am Ende keine Blende */
@property --pb-blende{syntax:"<length>";inherits:false;initial-value:0px}
.panel > .pbody{-webkit-mask-image:linear-gradient(180deg,#000 calc(100% - var(--pb-blende)),transparent);mask-image:linear-gradient(180deg,#000 calc(100% - var(--pb-blende)),transparent)}
@keyframes pb-blende{0%,94%{--pb-blende:30px} 100%{--pb-blende:0px}}
@supports (animation-timeline:scroll()){ .panel > .pbody{animation:pb-blende linear both;animation-timeline:scroll(self)} }
.hh::before{border:16px solid transparent;border-image:url(bilder/ui_rahmen.webp) 44 / 16px stretch}
.ki-fenster,.marker-sheet{border:0;border-style:solid;border-image:url(bilder/ui_rahmen.webp) 44 / 16px stretch;background:var(--noise),var(--panel-bg);border-radius:0}
.marker-sheet{padding:16px}
/* gleicher Innenabstand links und rechts: der Inhalt bleibt innerhalb des Rahmens (16 px Rand + 4 px Luft) */
.panel > :is(.phead,.pbody,.pfoot,.p5-chips){padding-left:8px;padding-right:8px} .hh{padding-left:20px;padding-right:20px}
#citySheet{border-style:solid;border-width:1px 1px 0;border-image:url(bilder/ui_rahmen.webp) 44 / 16px stretch;border-radius:0}
.phead::after{width:160px;height:10px;background:url(bilder/ui_linie.webp) center/100% 100% no-repeat}
.btn-x{border:0}
.btn-x > .icon:has(> use[href="#i-close"]){width:32px;height:32px;background:url(bilder/ui_zu.webp) center/contain no-repeat}   /* (nur „Schließen“ – andere runde Knöpfe wie „Info“ behalten ihr Zeichen) */
.btn-x:hover{border:0;filter:brightness(1.12)}
.tabs{background:none;border-bottom:0;gap:3px;padding:4px 4px 0}
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
:is(.ki-karte,.quest,.ach,.logRow,.stat,.force,.inbox-row,.barb-card,.rp-stat,.rp-bld,.rp-last,.rp-pass,.rp-bund,.pl-zelle,.pass-how-l,.ach-sum,.pass-hero,
  .pass-prem,.pass-old,.daily-row,.title-row,.forge-row,.fo-row,.fo-detail,.bd-zeile,.bd-form,.anf,.gate-ctl,.city-vgl,.shop-info,.skin-card,.crest-card,.statChip,.notice,
  .throne-status,.p5-naechste,.ach-done summary,.set-zeile,.barb-rank li,.marker-input,.troop-in,.from-sel,.ap-kopf,.ap-hchip,.inbox-empty,.empty-state,.lb-row,.rank-row,.p5-zeile,.lk-mid,.lk-card){border-radius:0!important;box-shadow:none;
  border-image:url(bilder/ui_karte.webp) 24 fill / 8px stretch!important}   /* (!important: Grundform gilt immer – auch gegen ältere „border:“-Kurzregeln mit #id) */
:is(.ki-karte--an,.ach.is-ready,.quest.is-done:not(.is-claimed),.pl-zelle.is-ready,.inbox-row.is-gold,.barb-rank li.me,.logRow.is-new,.ap-hchip.on,.bd-gk,.daily-day.is-today){border-image:url(bilder/ui_karte_an.webp) 24 fill / 8px stretch!important}
.set-zeile{padding:0 10px;margin-bottom:4px} .set-zeile:last-child{border-bottom:0}
/* Unter-Reiter und Wahl-Knöpfe: Schildchen, aktiv gold */
:is(.p5-chip,.seg:not(.hero-seg) > button,.look-title,.marker-presets button,.set-wahl button){border-radius:0!important;box-shadow:none;
  border-image:url(bilder/ui_k_chip.webp) 26 fill / 9px stretch!important}
#goalsTabs.p5-chips{gap:4px;padding-left:8px;padding-right:8px} #goalsTabs .p5-chip{padding:0 8px;gap:4px}   /* 5 Ereignis-Chips (mit Lager) passen auch ins schmale Desktop-Fenster */
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
/* Preise überall gleich (Alexander 7.10.): helle Schrift, wenn es reicht – rot, wenn nicht (nie grau); eine Größe; volle Zahl mit Punkt */
.ware-preis,.ware-preis.thron{color:#fbeec9;font:800 15px/1 var(--font-ui);text-shadow:0 1px 2px #000;background:none}
.ware-preis.zu-teuer,.ware-preis:disabled{color:#ff8d82}
.ware-preis .icon{width:15px;height:15px}
.ware-preise > .ware-preis{flex-wrap:wrap;align-content:center;row-gap:2px;font-size:15px}   /* 1× / 10×: das Mal klein darüber, der Preis gleich groß wie überall */
.ware-preise > .ware-preis .ware-x,.ware-preis[data-x]::before{flex:1 0 100%;text-align:center;margin:0;font:700 10px/1 var(--font-ui);opacity:.8}
.ware .band{border-style:solid;border-width:0;background:none;border-image:url(bilder/ui_band_gold.webp) 30 70 30 70 fill / 6px 16px 6px 16px stretch;padding:0 16px}

/* ---------------- Symbole je Ort (dritte Lieferung): Basis-Knöpfe, Bauarbeiter, Fähigkeiten, Labor, Rangliste, Bündnis, Einstellungen ---------------- */
:is(#teleportBtn .act-ic > svg.icon,#sendBtn .act-ic > svg.icon,#recallBtn .act-ic > svg.icon,#titleBtn .act-ic > svg.icon,.cb-slot > svg.icon,#skillGrid svg.icon:has(> use[href="#i-attack"]),#skillGrid svg.icon:has(> use[href="#i-troops"]),#skillGrid svg.icon:has(> use[href="#i-defense"]),.fo-node-ic > svg.icon:has(> use[href="#i-coin"]),.fo-node-ic > svg.icon:has(> use[href="#i-crate"]),.fo-node-ic > svg.icon:has(> use[href="#i-castle"]),.fo-node-ic > svg.icon:has(> use[href="#i-send"]),.fo-node-ic > svg.icon:has(> use[href="#i-flag"]),.fo-node-ic > svg.icon:has(> use[href="#i-plus"]),.fo-node-ic > svg.icon:has(> use[href="#i-hourglass"]),[data-rtab="power"] > svg.icon,[data-rtab="caps"] > svg.icon,#profileKennung svg.icon:has(> use[href="#i-attack"]),.bd-rally svg.icon,.bd-hilfe-btn svg.icon,svg.icon:has(> use[href="#i-question"]),svg.icon:has(> use[href="#i-sound"]),svg.icon:has(> use[href="#i-sfx"]),svg.icon:has(> use[href="#i-send"]),svg.icon:has(> use[href="#i-temple"]),svg.icon:has(> use[href="#i-market"]),svg.icon:has(> use[href="#i-sell"])) > use{display:none}
:is(#teleportBtn .act-ic > svg.icon,#sendBtn .act-ic > svg.icon,#recallBtn .act-ic > svg.icon,#titleBtn .act-ic > svg.icon,.cb-slot > svg.icon,#skillGrid svg.icon:has(> use[href="#i-attack"]),#skillGrid svg.icon:has(> use[href="#i-troops"]),#skillGrid svg.icon:has(> use[href="#i-defense"]),.fo-node-ic > svg.icon:has(> use[href="#i-coin"]),.fo-node-ic > svg.icon:has(> use[href="#i-crate"]),.fo-node-ic > svg.icon:has(> use[href="#i-castle"]),.fo-node-ic > svg.icon:has(> use[href="#i-send"]),.fo-node-ic > svg.icon:has(> use[href="#i-flag"]),.fo-node-ic > svg.icon:has(> use[href="#i-plus"]),.fo-node-ic > svg.icon:has(> use[href="#i-hourglass"]),[data-rtab="power"] > svg.icon,[data-rtab="caps"] > svg.icon,#profileKennung svg.icon:has(> use[href="#i-attack"]),.bd-rally svg.icon,.bd-hilfe-btn svg.icon,svg.icon:has(> use[href="#i-question"]),svg.icon:has(> use[href="#i-sound"]),svg.icon:has(> use[href="#i-sfx"]),svg.icon:has(> use[href="#i-send"]),svg.icon:has(> use[href="#i-temple"]),svg.icon:has(> use[href="#i-market"]),svg.icon:has(> use[href="#i-sell"])){background:var(--ki-ort) center/contain no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.55))}
#teleportBtn .act-ic > svg.icon{--ki-ort:url(bilder/ui_sym_verlegen.webp)} #sendBtn .act-ic > svg.icon{--ki-ort:url(bilder/ui_sym_senden.webp)} #recallBtn .act-ic > svg.icon{--ki-ort:url(bilder/ui_sym_sammeln.webp)} #titleBtn .act-ic > svg.icon{--ki-ort:url(bilder/ui_sym_tempelbonus.webp)} .cb-slot > svg.icon{--ki-ort:url(bilder/ui_sym_bauarbeiter.webp)} #skillGrid svg.icon:has(> use[href="#i-attack"]){--ki-ort:url(bilder/ui_skill_angriff.webp)} #skillGrid svg.icon:has(> use[href="#i-troops"]){--ki-ort:url(bilder/ui_skill_truppen.webp)} #skillGrid svg.icon:has(> use[href="#i-defense"]){--ki-ort:url(bilder/ui_skill_verteidigung.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-coin"]){--ki-ort:url(bilder/ui_fo_ertrag.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-crate"]){--ki-ort:url(bilder/ui_fo_traglast.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-castle"]){--ki-ort:url(bilder/ui_fo_burgschutz.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-send"]){--ki-ort:url(bilder/ui_fo_marschtempo.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-flag"]){--ki-ort:url(bilder/ui_fo_kundschaft.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-plus"]){--ki-ort:url(bilder/ui_sym_verwundete.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-hourglass"]){--ki-ort:url(bilder/ui_sym_sammeln.webp)} [data-rtab="power"] > svg.icon{--ki-ort:url(bilder/ui_sym_macht.webp)} [data-rtab="caps"] > svg.icon{--ki-ort:url(bilder/ui_sym_eroberung.webp)} #profileKennung svg.icon:has(> use[href="#i-attack"]){--ki-ort:url(bilder/ui_sym_macht.webp)} .bd-rally svg.icon{--ki-ort:url(bilder/ui_sym_rally.webp)} .bd-hilfe-btn svg.icon{--ki-ort:url(bilder/ui_sym_hilfe.webp)} svg.icon:has(> use[href="#i-question"]){--ki-ort:url(bilder/ui_set_hilfe.webp)} svg.icon:has(> use[href="#i-sound"]){--ki-ort:url(bilder/ui_set_ton.webp)} svg.icon:has(> use[href="#i-sfx"]){--ki-ort:url(bilder/ui_set_ton.webp)} svg.icon:has(> use[href="#i-send"]){--ki-ort:url(bilder/ui_sym_senden.webp)} svg.icon:has(> use[href="#i-temple"]){--ki-ort:url(bilder/ui_sym_tempelbonus.webp)} svg.icon:has(> use[href="#i-market"]){--ki-ort:url(bilder/ui_sym_markt.webp)} svg.icon:has(> use[href="#i-sell"]){--ki-ort:url(bilder/ui_sym_handeln.webp)}

/* ---------------- Rahmen um das Wappen: Saison-Rahmen und Neuling als Bild-Ring, Rang-Rahmen mit Rang-Abzeichen oben ---------------- */
:is(#pAvatarRing,.frame-ring,.lb-crest,.rp-crest,.hud-me .avatar-ring):is([data-frame="bronze"],[data-frame="sz1"],[data-frame="sz2"],[data-frame="sz4"],[data-frame="sz6"],[data-frame="mgut"],[data-frame="king"]){
  background:none!important;box-shadow:none!important;animation:none!important;position:relative;overflow:visible}
:is(#pAvatarRing,.frame-ring,.lb-crest,.rp-crest,.hud-me .avatar-ring)[data-frame]::after{content:"";position:absolute;pointer-events:none;background:var(--ki-rahmen,none) center/100% 100% no-repeat;inset:-12%}
:is(#pAvatarRing,.frame-ring,.lb-crest,.rp-crest)[data-frame]::before{content:"";position:absolute;pointer-events:none;z-index:1;left:50%;top:-22%;width:40%;aspect-ratio:3/4;transform:translateX(-50%);background:var(--ki-rang,none) center/contain no-repeat}
[data-frame="bronze"]{--ki-rahmen:url(bilder/ui_rahmen_neuling.webp)} [data-frame="sz1"]{--ki-rahmen:url(bilder/ui_rahmen_champion.webp)} [data-frame="sz2"]{--ki-rahmen:url(bilder/ui_rahmen_grossadmiral.webp)}
[data-frame="sz4"]{--ki-rahmen:url(bilder/ui_rahmen_admiral.webp)} [data-frame="sz6"]{--ki-rahmen:url(bilder/ui_rahmen_kapitaen.webp)} [data-frame="mgut"]{--ki-rahmen:url(bilder/ui_rahmen_mitte.webp)} [data-frame="king"]{--ki-rahmen:url(bilder/ui_herrscher_rahmen.webp)}
[data-frame="silver"]{--ki-rang:url(bilder/ui_rang_silberritter.webp)} [data-frame="gold"]{--ki-rang:url(bilder/ui_rang_goldfuerst.webp)} [data-frame="platin"]{--ki-rang:url(bilder/ui_rang_platingraf.webp)}
[data-frame="diamond"]{--ki-rang:url(bilder/ui_rang_diamantherzog.webp)} [data-frame="master"]{--ki-rang:url(bilder/ui_rang_meister.webp)} [data-frame="legend"]{--ki-rang:url(bilder/ui_rang_legende.webp)}

/* Tipp auf ein freies Feld der Karte (Merkliste 33): runde KI-Knöpfe im Bogen wie am Gebäude (.cr-btn), Stelle = Nadel auf der Karte */
.feld-ring{position:fixed;left:0;top:0;z-index:44;width:0;height:0;pointer-events:none}
.feld-ring[hidden]{display:none}
.feld-ring .cr-btn{border:0;border-radius:50%;background:var(--ui-rund) center/100% 100% no-repeat;box-shadow:0 4px 12px rgba(0,0,0,.5)}
.feld-ring .cr-btn.is-armed{background-image:var(--ui-rund-an)}
.feld-ring .fr-ic{width:34px;height:34px;background:var(--b) center/contain no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.55))}
.feld-ring .cr-btn small{font-size:11px;text-align:center}   /* „Hierher teleportieren?“ über dem Preis: 2 Zeilen, schmal */
.feld-ring .cr-btn small .icon{width:12px;height:12px;vertical-align:-2px}
/* ---------------- Basis-, Angriffs- und Grenztor-Fenster (8.10.): Werte als Bild + Zahl, runde Knöpfe, nichts überlappt ---------------- */
#islandPopup .ptitle{white-space:normal!important;overflow-wrap:anywhere}   /* „Hauptstadt von …“: lieber zwei Zeilen als abgeschnitten */
.emblem--bild{width:56px;height:56px;background:rgba(0,0,0,.3)} .emblem--bild > svg.icon{display:none}
.emblem--bild .bw-bild{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 3px 4px rgba(0,0,0,.55))}
.bw-werte{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 16px;padding:4px 0}
.bw-wert{display:inline-flex;align-items:center;gap:5px;min-width:0}
.bw-wert img{width:26px;height:26px;flex:none;object-fit:contain;filter:drop-shadow(0 1px 1px rgba(0,0,0,.6))}
.bw-wert b{font:600 16px/1.2 Georgia,serif;color:#eee6d4;white-space:nowrap;font-variant-numeric:tabular-nums}
.bw-wert.is-good b{color:var(--good)} .bw-wert.is-enemy b{color:#ff8d7e}
.tor-hinweis{min-height:40px;align-items:center;background:#1c212a;border:0;border-left:3px solid #d24c40;color:#c0b7a3;font-size:14px}
.tor-hinweis .icon{width:20px;height:20px;flex:none;color:#d24c40}
@keyframes tor-blink{0%,100%{background:#1c212a}40%{background:#4a1d19}} .tor-hinweis.blinkt{animation:tor-blink .5s 2}
.emblem--bild .bw-bild[src*="karte_tor"]{object-fit:cover;transform:scale(1.9)} .emblem--bild{overflow:hidden}
@media (min-width:900px) and (min-height:501px){ body:has(#islandPopup.is-open) .toast.toast{top:calc(var(--safe-t) + var(--hud-top-space));bottom:auto} }   /* Hinweise nie über den Fenster-Knöpfen */
/* runde Knöpfe: Symbol im goldenen Ring (ui_rund), kurzes Wort darunter, Preis klein */
#popupActions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 2px}
#popupActions > .act[style*="inline-block"],#popupActions > .act.act--haupt[style*="inline-block"]{display:flex!important}
#popupActions:not(.mehr-auf) > .act.act--mehr{display:none!important}
#popupActions > .act,#popupActions > .act.act--haupt{flex:0 0 calc((100% - 8px) / 5);max-width:76px;min-width:0;min-height:44px;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px;
  padding:0;border:0;border-radius:0;background:none;box-shadow:none;color:#c0b7a3}
#popupActions > .act > .act-ic,#popupActions > .act.act--haupt > .act-ic{width:52px;height:52px;flex:none;border:0;border-radius:50%;
  background:var(--sym,none) center/28px 28px no-repeat,url(bilder/ui_rund.webp) center/100% 100% no-repeat}
#popupActions > .act:not(:disabled):active > .act-ic{background:var(--sym,none) center/28px 28px no-repeat,url(bilder/ui_rund_an.webp) center/100% 100% no-repeat}
#popupActions > .act > .act-ic > svg.icon{display:none}
#popupActions > #mehrBtn > .act-ic > svg.icon{display:block;width:24px;height:24px;color:var(--gold-200)}
#popupActions > .act > .act-t,#popupActions > .act.act--haupt > .act-t{max-width:100%;font:500 11px/1.2 var(--font-ui);letter-spacing:0;text-transform:none;color:#c0b7a3;white-space:nowrap;overflow:visible}
#popupActions > .act > .act-s,#popupActions > .act.act--haupt > .act-s{max-width:100%;justify-content:center;flex-wrap:wrap;font-size:10px;line-height:1.2;color:var(--tx-3);white-space:normal;text-align:center}
#popupActions > .act.act--haupt > .act-s.is-bad,#popupActions > .act > .act-s.is-bad{color:#ff8d7e}
#cityBtn > .act-s,#sendBtn > .act-s,#titleBtn > .act-s{display:none}
#popupActions > .act:disabled{background:none} #popupActions > .act:disabled > .act-ic{filter:grayscale(1) brightness(.6)} #popupActions > .act:disabled > .act-t{color:var(--tx-4)}
#cityBtn{--sym:url(bilder/ui_sym_burg.webp)} #teleportBtn{--sym:url(bilder/ui_sym_verlegen.webp)} #schildBtn{--sym:url(bilder/ui_sym_friedensschild.webp)} #truppenBtn{--sym:url(bilder/beute_truppen.webp)}
#upgradeBtn{--sym:url(bilder/ui_sym_aufstieg.webp)} #sendBtn{--sym:url(bilder/ui_sym_senden.webp)} #recallBtn{--sym:url(bilder/ui_sym_sammeln.webp)} #multiAttackBtn{--sym:url(bilder/ui_sym_schwert.webp)}
#titleBtn{--sym:url(bilder/ui_sym_krone.webp)} #scoutBtn{--sym:url(bilder/ui_sym_spaeher.webp)} #attackBtn{--sym:url(bilder/ui_sym_schwert.webp)}
/* fremde Basis: Spähen + Angreifen als runde Knöpfe nebeneinander; grau = geht nicht (antippen sagt warum) */
.panel--island.fuss-rund .pfoot{justify-content:center;gap:28px;padding-top:6px}
.panel--island.fuss-rund .pfoot > .btn{flex:0 0 76px;height:auto;min-height:44px;flex-direction:column;gap:2px;padding:0!important;border-image:none;background:none;box-shadow:none;
  font:500 12px/1.2 var(--font-ui);letter-spacing:0;text-transform:none;color:#c0b7a3;text-shadow:none}
.panel--island.fuss-rund .pfoot > .btn > svg.icon{display:none}
.panel--island.fuss-rund .pfoot > .btn::before{content:"";position:static;display:block;width:52px;height:52px;border-radius:50%;inset:auto;
  background:var(--sym,none) center/28px 28px no-repeat,url(bilder/ui_rund.webp) center/100% 100% no-repeat}
.panel--island.fuss-rund .pfoot > .btn:not(:disabled):active::before{background:var(--sym,none) center/28px 28px no-repeat,url(bilder/ui_rund_an.webp) center/100% 100% no-repeat}
.panel--island.fuss-rund .pfoot > .btn:is(:disabled,.is-grau)::before{filter:grayscale(1) brightness(.6)} .panel--island.fuss-rund .pfoot > .btn:is(:disabled,.is-grau){color:#8b8373}
/* Angriff vorbereiten: Hauptheld groß, Zweitheld klein darunter | Startbasis, Angriff gegen Abwehr, Kräfte-Balken – dann Truppen, Leiste, goldener Knopf */
.ap-oben{display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px;align-items:start} .ap-oben--ohne{grid-template-columns:minmax(0,1fr)}
.ap-oben .ap-kopf{position:static;padding-bottom:0;border-bottom:0;background:none}
.ap-oben .versus{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px}
#popupStats .ap-oben .force small,#popupStats .ap-oben .force--foe small[data-foe="sub"]{white-space:normal;overflow:visible;text-overflow:clip;font-size:10px;line-height:1.2}
.ap-oben .ap-bal{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;min-width:0;gap:6px;padding-right:4px} .ap-oben .ap-bal .balance{min-width:30px} .ap-oben .ap-bal .balance-note{font-size:10px;gap:3px;margin:0}
#islandPopup .ap-oben .from-sel{font-size:12px;padding-left:6px;padding-right:22px}
.panel--island:has(.ap-oben){max-height:calc(100dvh - var(--dock-h) - var(--safe-bd) - var(--safe-t) - var(--hud-top-space) - 40px)}   /* Angriff: alles ohne Scrollen sichtbar; darüber Platz für einen Hinweis (2 Zeilen) */
body:has(#islandPopup.is-open) .toast.toast:not(:empty){display:-webkit-box;-webkit-line-clamp:2;max-height:calc(2.7em + 16px);overflow:clip;overflow-clip-margin:content-box}   /* bei offenem Fenster: höchstens 2 ganze Zeilen, dann „…“ */
@media (max-width:899px) and (max-height:700px){ .panel--island:has(.ap-oben) :is(.ap-leiste,.ap-herofx,#popupOverline){display:none}
  .panel--island:has(.ap-oben) .ptitle{font-size:15px;margin:0} #popupStats:has(.ap-oben){gap:4px} .panel--island:has(.ap-oben) .pfoot{padding-top:6px;padding-bottom:6px}
  .ap-oben .force{padding-top:4px!important;padding-bottom:4px!important}
  .panel--island:has(.ap-oben) .pbody{padding-top:6px;padding-bottom:4px} .panel--island:has(.ap-oben) .phead{padding-bottom:6px} .ap-truppen .slider{margin-top:0;margin-bottom:0} }   /* kleines Handy: Zeit steht im Knopf, Truppen im Feld, Kraft bei „Angriff“, Helden-Wirkung beim Draufzeigen */
@media (max-width:380px){ .ap-oben{grid-template-columns:76px minmax(0,1fr)} .ap-oben .ap-hchip.ap-hchip--gross{width:76px;height:94px} .ap-oben .ap-hchip.ap-hchip--klein{width:76px} }
.ap-held{display:flex;flex-direction:column;gap:4px}
.ap-hchip.ap-hchip--gross{flex:none;width:96px;height:118px;padding:0;flex-direction:column;justify-content:flex-end;align-items:stretch;overflow:hidden;
  border:3px solid transparent;border-image:url(bilder/ui_kachel_gold.webp) 30 fill / 3px stretch;background:#0f1217}
.ap-hchip.ap-hchip--gross::after{display:none}
.ap-hchip--gross .hero-pic{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;border:0;border-radius:0}
.ap-hchip--gross .ap-hchip-t{position:relative;padding:12px 4px 3px;background:linear-gradient(180deg,transparent,rgba(0,0,0,.85));align-items:center;text-align:center}
.ap-hchip-leer{position:absolute;inset:0;display:grid;place-items:center;color:var(--gold-200)} .ap-hchip-leer .icon{width:26px;height:26px}
.ap-hchip.ap-hchip--klein{flex:none;width:96px;min-height:44px;padding:2px 4px;gap:4px}
.ap-hchip.ap-hchip--klein::after{display:none}
.ap-hchip--klein .hero-pic{width:24px;height:24px}
.ap-hchip--klein .ap-hchip-leer{position:static;width:24px;flex:none} .ap-hchip--klein .ap-hchip-leer .icon{width:16px;height:16px}
.ap-hchip--klein .ap-hchip-t b,.ap-hchip--klein .ap-hchip-t small{white-space:normal;font-size:10px;line-height:1.15}
.ap-oben > .ap-held{grid-row:1} .ap-oben > .ap-kopf,.ap-oben > .ap-held-wahl{grid-column:2;grid-row:1;min-width:0}
.ap-oben--ohne > .ap-kopf{grid-column:1}
.ap-oben:has(.hero-seg:not([hidden])) > .ap-kopf,.ap-held-wahl:not(:has(.hero-seg:not([hidden]))){display:none}   /* Helden-Auswahl offen: sie steht neben dem Bild, Regler bleiben sichtbar */
.ap-held-wahl .seg.hero-seg{display:flex;flex-wrap:wrap;gap:4px;margin:0;max-height:160px;overflow-y:auto}
.ap-held-wahl .seg.hero-seg > button{flex:none;min-width:max-content;padding:0 10px} .ap-held-wahl .hero-seg2-l{display:none}   /* („Zweitheld · 50 %“ steht in der Kachel) */
#islandPopup .hero-seg button,#islandPopup .ap-truppen .seg button{min-height:44px;height:44px} .ap-truppen .slider{height:28px}
#islandPopup .from-sel{height:44px} #islandPopup .ap-spaehen{min-height:44px}
.ap-truppen{gap:4px}
.ap-truppen .ap-regler{justify-content:flex-start;gap:8px}
.ap-kachel{width:44px;height:44px;flex:none;display:grid;place-items:center;border:3px solid transparent;border-image:url(bilder/ui_kachel_gold.webp) 30 fill / 3px stretch}
.ap-kachel img{width:32px;height:32px;object-fit:contain}
.ap-truppen .val{align-items:center;gap:6px} .ap-truppen .troop-in{height:44px} .ap-max{font:600 15px/1 Georgia,serif;color:var(--tx-3);white-space:nowrap}
.ap-truppen .seg{grid-template-columns:repeat(4,minmax(0,1fr));margin-top:0}
.ap-leiste{display:flex;justify-content:space-around;gap:8px;padding:4px 0}
.ap-leiste span{display:inline-flex;align-items:center;gap:5px;min-width:0} .ap-leiste img{width:22px;height:22px;object-fit:contain;flex:none}
.ap-leiste b{font:600 15px/1.2 Georgia,serif;color:#eee6d4;white-space:nowrap}
#attackBtn.btn--gold:not(:disabled){border-image:url(bilder/ui_band_gold.webp) 30 70 30 70 fill / 8px 22px 8px 22px stretch;color:#1a1206;text-shadow:0 1px 0 rgba(255,236,190,.5);
  font:700 15px/1 Georgia,serif;letter-spacing:0;text-transform:none;padding:0 20px!important;min-height:52px}
#islandPopup .pfoot > #backBtn{flex:0 0 48px;min-width:48px;padding:0!important} #islandPopup .pfoot > #backBtn > span{display:none} #islandPopup .pfoot > #backBtn > .icon{display:block}
#attackBtn.btn--gold > svg.icon{display:none}
    </style>
