// Teil 07x-stil-helden.php: Stil: Helden mit KI-Bildern (bilder/held_*.webp) – Heldenhalle wie RoK/Call of Dragons, Kopf-Chips überall
<style>
/* =====================================================================
   HELDEN (Merkliste 20, Alexander 7.10.: Helden-Fenster neu wie RoK): Raster aus Bild-Karten im Seltenheits-Rahmen (ui_kachel_*),
   Held groß auf einer Bühne mit Name, Sternen, Macht und den 4 Fähigkeiten als Kacheln; darunter Werte, Sterne, Fähigkeiten.
   Nur Aussehen – Zahlen und Knöpfe bleiben dieselben. Rahmen/Listen-Karten aus der Grundform (05z: .ki-karte, [data-r]).
   ===================================================================== */
/* Kopf-Chips (Marsch-Auswahl, Kampfbericht, Profil, Mauer, Kisten): Kopfbild auf dem Farbgrund der Seltenheit */
.hero-pic{object-fit:cover;object-position:50% 0;background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--hc,var(--rc,#8a8f99)) 60%,#20232a),#0b0c10 80%)}

/* ---------------- Raster: Bild-Karten ---------------- */
.hh-cards{grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px}
.hh-card{aspect-ratio:3/4.15;border-radius:9px;border-style:solid;border-width:0;border-color:transparent;background:#0b0c10;
  border-image:var(--ki-kachel) 24 fill / 9px stretch;box-shadow:0 4px 10px #0009;overflow:hidden}
.hh-card.is-locked{background:#0b0c10}
.hh-art{inset:5px 5px 0;top:5px;aspect-ratio:auto;bottom:0;-webkit-mask:linear-gradient(#000 70%,#0000 96%);mask:linear-gradient(#000 70%,#0000 96%)}
.hh-art .hero-pic{width:100%;height:100%;object-fit:cover;object-position:50% 0;background:none;border:0}
.hh-card.is-locked .hh-art{filter:grayscale(1) brightness(.5)}
.hh-foot{left:4px;right:4px;bottom:4px;padding:16px 3px 5px;border-radius:0 0 6px 6px;background:linear-gradient(0deg,#000 0%,#000d 55%,#0000)}
.hh-foot b{font:700 var(--fs-13)/1.1 var(--font-display);letter-spacing:.02em;color:#fff6e0}
.hh-foot small{color:#ffffffb0}
.hh-foot .hh-qstars i{width:12px;height:12px}
.hh-dot{left:8px;top:8px;z-index:1}
.hh-lk{right:7px;top:7px;z-index:1}
.hh-frei{max-width:100%;padding:5px 7px;gap:3px;font-size:9.5px;letter-spacing:0}   /* „Freischalten“ passt ganz in die schmale Karte */
.hh-head [data-hh-back] > .icon{background-image:url(bilder/ui_zurueck.webp)}   /* Zurück statt Schließen-Bild (05z gibt jedem .btn-x das X) */
.hh-cards--zu{grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px}
.hh-cards--zu .hh-card{aspect-ratio:3/4;border-image:var(--ki-kachel) 24 fill / 7px stretch}
.hh-cards--zu .hh-foot{padding:10px 2px 4px}
@media (min-width:900px){ .hh-cards{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px} .hh-cards.hh-cards--zu{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px} }
.hh-pair-pics .hero-pic{--hc:var(--gold-300)}
.hero-pic.bd-hpic{width:18px;height:18px;margin:0 3px -4px 1px;border-radius:4px;border:1px solid var(--gold-300)}   /* Rally-Zeile: Kopf vor dem Namen */

/* ---------------- Ein Held: Bühne ---------------- */
.hh-hero{border:0;border-radius:12px;border-style:solid;border-image:url(bilder/ui_rahmen.webp) 44 / 14px stretch;
  background:radial-gradient(ellipse 70% 55% at 50% 40%,color-mix(in srgb,var(--rc) 45%,transparent),transparent 70%),linear-gradient(180deg,#1a1d24,#07080b 75%)}
.hh-stage{overflow:hidden;background:radial-gradient(ellipse 60% 45% at 55% 42%,color-mix(in srgb,var(--rc) 55%,transparent),transparent 72%)}
.hh-strahl{position:absolute;left:50%;top:6%;width:min(520px,110%);aspect-ratio:1;transform:translateX(-50%);background:url(bilder/ui_strahlen.webp) center/contain no-repeat;opacity:.35;mix-blend-mode:screen;pointer-events:none}
.hh-floor{left:14%;right:14%;bottom:118px;height:46px;background:radial-gradient(ellipse,color-mix(in srgb,var(--rc) 40%,#000c),transparent 70%)}
.hh-portrait{left:50%;bottom:112px;top:auto;transform:translateX(-50%);width:auto;height:calc(100% - 150px);max-height:470px;aspect-ratio:3/4;border:0;border-radius:0;box-shadow:none;background:none;
  object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 8px 18px #000c);-webkit-mask:linear-gradient(#000 82%,#0000);mask:linear-gradient(#000 82%,#0000)}
.hh-portrait.is-locked{filter:grayscale(.9) brightness(.55) drop-shadow(0 8px 18px #000c)}
.hh-id{max-width:46%}
.hh-gem{color:#fff;background:color-mix(in srgb,var(--rc) 70%,#000);padding:4px 8px 4px 6px;border-radius:3px;align-self:flex-start;box-shadow:0 1px 0 #ffffff30 inset}
.hh-gem::before{background:#fff;border-color:color-mix(in srgb,var(--rc) 40%,#000)}
.hh-nm{font-size:32px;color:#fff6e0;letter-spacing:.02em}
.hh-unten{position:absolute;left:0;right:0;bottom:0;z-index:2;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:10px 14px 12px;
  background:linear-gradient(0deg,#07080bee 40%,#07080b00)}
.hh-unten .hh-top{flex-direction:column;align-items:flex-start;gap:2px;padding:0;border:0}
.hh-unten h3{margin:0;font:700 var(--fs-11)/1 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3)}
.hh-skks{display:flex;gap:6px}
.hh-skk{position:relative;width:48px;height:48px;display:grid;place-items:center;font:700 20px/1 var(--font-display);color:#fff;text-shadow:0 1px 3px #000;
  border-style:solid;border-width:0;border-image:var(--ki-kachel) 24 fill / 8px stretch}
.hh-skk.act{border-image-source:url(bilder/ui_kachel_gold.webp)}
.hh-skk.is-null{filter:grayscale(.85) brightness(.7)}
.hh-skk i{position:absolute;right:-3px;bottom:-3px;min-width:17px;height:17px;padding:0 3px;border-radius:9px;background:#0b0c10;border:1px solid var(--gold-300);font:800 10px/15px var(--font-ui);font-style:normal;color:var(--gold-100);text-align:center}

/* ---------------- Ein Held: Werte als Kacheln, Fähigkeiten mit Kachel-Symbol ---------------- */
.hh-panel{background:linear-gradient(180deg,rgba(20,22,28,.94),rgba(10,11,14,.97))}
.hh-vals{grid-template-columns:repeat(2,1fr);gap:6px}
.hh-vals div{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:6px;padding:7px 9px;background:none}   /* Rahmen: Grundform .ki-karte (05z) */
.hh-vals b{font:700 var(--fs-13)/1 var(--font-ui);color:var(--gold-100)}
.hh-vi{width:28px;height:28px;display:grid;place-items:center;border-style:solid;border-width:0;border-image:var(--ki-kachel) 24 fill / 6px stretch}
.hh-vi .icon{width:16px;height:16px;color:#fff;filter:drop-shadow(0 1px 1px #000)}
.hh-hx{width:46px;height:46px;clip-path:none;background:none;border-style:solid;border-width:0;border-image:var(--ki-kachel) 24 fill / 8px stretch;text-shadow:0 1px 3px #000}
.hh-hx.act{border-image-source:url(bilder/ui_kachel_gold.webp);background:none;color:#fff}
.hh-sk{grid-template-columns:46px 1fr 32px}
@media (min-width:900px){ .hh-vals{grid-template-columns:repeat(4,1fr)} .hh-vals div{grid-template-columns:1fr;justify-items:center;text-align:center} }
@media (max-width:760px){
  .hh-stage{min-height:440px}
  .hh-portrait{left:62%;height:calc(100% - 128px);bottom:100px}
  .hh-floor{left:30%;right:0;bottom:100px}
  .hh-id{max-width:52%} .hh-nm{font-size:28px}
  .hh-unten{padding:8px 10px 10px} .hh-skk{width:42px;height:42px;font-size:18px}
}
</style>
