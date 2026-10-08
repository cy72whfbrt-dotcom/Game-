// Teil 07-fenster.php: Fenster: Profil, Kampfbericht, Herrscher, Bündnis, Rangliste, Events, Shop, Gegenstand

<style>
/* Fenster Events, Kampf, Bündnis, Profil: höchstens 4 Reiter, Unterreiter als Chips, Tippflächen mind. 44 px, nichts abgeschnitten */
#goalsGruppen.tabs{grid-template-columns:repeat(4,minmax(0,1fr))}
#profilePopup #profileTabs.tabs,#rankTabs.tabs{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:auto}   /* Breite nach dem Text: „Einstellungen“, „Thron-Punkte“ bekommen mehr Platz, stoßen nicht an den Rand */
#battleTabs.tabs{grid-template-columns:repeat(2,minmax(0,1fr))}
.p5-reiter .tab .badge{position:absolute;top:4px;right:8px}
@media (min-height:501px),(orientation:portrait){
  .p5-reiter .tab,#profilePopup #profileTabs .tab{min-height:48px;font-size:12px}
}
.p5-reiter .tab span,#profilePopup #profileTabs .tab span{text-overflow:clip}
.p5-chips{flex:none;display:flex;gap:8px;padding:8px 16px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--line-1);background:rgba(0,0,0,.12)}
.p5-chips::-webkit-scrollbar{display:none}
.p5-chips[hidden],.p5-chip[hidden]{display:none}
.p5-chip{position:relative;flex:none;display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:18px;border:1px solid var(--line-2);background:rgba(255,255,255,.03);
  color:var(--tx-2);font:600 13px/1 var(--font-ui);white-space:nowrap;cursor:pointer}
.p5-chip::before{content:"";position:absolute;left:0;right:0;top:-4px;bottom:-4px}   /* Tippfläche 44 px */
.p5-chip.active{color:var(--gold-100);border-color:var(--gold-300);background:rgba(214,170,90,.14)}
.p5-chip .badge{position:static}
#combatLogList > .logRow{cursor:pointer}
/* Events (Blick 6.10.): am Handy passen alle 4 Ereignis-Chips (kurze Namen), Welt-Saison linksbündig, Preise gut lesbar */
@media (max-width:480px){ #goalsTabs{gap:6px;padding-inline:12px} #goalsTabs .p5-chip{padding:0 12px} }
/* Events/Bündnis (Gesamt-Blick 6.10.): Bild-Banner je Ereignis mit Titel + Uhr darauf, lange Erklärungen hinter „i“, leere Zustände mit Bild + Knopf */
.ev-banner{position:relative;flex:none;height:96px;margin:0 0 10px;border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--line-2);background:#100b08}
.ev-banner .ev-bild{position:absolute;inset:0;width:100%;height:100%;display:block}
.ev-banner::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,6,4,.85) 0%,rgba(8,6,4,.55) 50%,rgba(8,6,4,0) 76%);pointer-events:none}
.ev-banner--tour::after{background:linear-gradient(90deg,rgba(18,10,30,.92) 0%,rgba(18,10,30,.75) 55%,rgba(18,10,30,0) 80%)}   /* Woche: Titel + Uhr nie auf Fahne/Schwertern */
.ev-banner-t{position:absolute;left:12px;right:26%;bottom:10px;z-index:1;display:flex;flex-direction:column;gap:4px;text-shadow:0 1px 3px rgba(0,0,0,.9)}
.ev-banner-t > b{display:flex;align-items:center;gap:7px;font:600 16px/1.25 var(--font-display);color:var(--gold-100);letter-spacing:.02em}
.ev-banner-t > b .icon{width:18px;height:18px;flex:none;color:var(--gold-300)}
.ev-banner-t small{font:600 var(--fs-12)/1.35 var(--font-ui);color:var(--tx-1)} .ev-banner-t small b{font-variant-numeric:tabular-nums;color:var(--gold-200)}
.ev-card.ev-mit-bild{padding-top:0;overflow:hidden} .ev-card.ev-mit-bild > .ev-banner{margin:0 -10px 4px;border-radius:0;border:0;border-bottom:1px solid var(--line-1)}
.ev-zeilen{display:grid;gap:8px} .ev-zeilen > div{display:flex;flex-direction:column;gap:2px} .ev-zeilen small{font:600 var(--fs-11)/1.3 var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--tx-3)}
.ev-zeilen span{font:600 var(--fs-13)/1.4 var(--font-ui);color:var(--tx-1)}
.ev-info{margin:0} .ev-info summary > span{flex:1} .ev-info .tour-rules{padding:2px 0 8px} .ev-info .mail-intro{margin:0 0 8px}
.bd-kurz{margin:0 0 4px;font:500 var(--fs-13)/1.4 var(--font-ui);color:var(--tx-2)}
.empty-state.ev-leer{padding:22px 16px;gap:8px;border:1px dashed var(--line-2);border-radius:10px;background:rgba(255,255,255,.02)}
.empty-state.ev-leer > .icon{width:40px;height:40px;color:var(--gold-300)} .empty-state.ev-leer > span{max-width:34ch}
.empty-state.ev-leer > b{font-size:var(--fs-15)} .empty-state.ev-leer .btn{margin-top:8px;max-width:100%}
/* Belohnungs-Leiste wie RoK (Merkliste 33): Balken mit Kisten an den Stufen – erreicht leuchtet („Abholen“), abgeholt = offene Kiste + Haken */
.evl{contain:inline-size;width:100%;overflow-x:auto;overscroll-behavior-x:contain;margin:2px -2px 6px;padding:4px 2px 2px;scrollbar-width:thin;
  position:sticky;top:0;z-index:2;background:rgb(16,19,25);box-shadow:0 6px 8px -4px rgba(0,0,0,.6)}   /* beim Blättern bleibt die Stufen-Leiste ganz oben stehen (Foto 8.10.: sonst halb verdeckt) */
.evl-bahn{position:relative;display:grid;grid-template-columns:repeat(var(--n),minmax(52px,1fr));min-width:calc(var(--n) * 52px)}
.evl-spur{position:absolute;left:0;right:0;top:20px;height:8px;border-radius:4px;background:rgba(0,0,0,.45);border:1px solid var(--line-2);overflow:hidden}
.evl-spur i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#a8831a,#f2c75c);box-shadow:0 0 8px rgba(242,199,92,.6)}
.evl-k{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0;border:0;background:none;color:var(--tx-3);font:700 10.5px/1.1 var(--font-ui);white-space:nowrap}
.evl-bild{position:relative;display:grid;place-items:center;width:46px;height:46px;border-radius:10px} .evl-bild img{width:44px;height:44px;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(0,0,0,.7))}
.evl-k.is-ding .evl-bild{background:rgba(10,8,6,.75);border:1px solid var(--line-2)} .evl-k.is-ding .evl-bild img{width:32px;height:32px}
.evl-k.is-zu .evl-bild img{filter:grayscale(.85) brightness(.6)} .evl-k.is-zu{opacity:.85}
.evl-k.is-hol,.evl-k.is-bald{color:var(--gold-100);cursor:pointer} .evl-k.is-hol .evl-bild{background:radial-gradient(circle,rgba(255,214,110,.55),rgba(255,214,110,0) 70%);animation:evlGlueh 1.4s ease-in-out infinite}
.evl-k.is-ok{color:var(--tx-2)} .evl-haken{position:absolute;right:-4px;top:-4px;width:20px;height:20px} .evl-haken img{width:20px;height:20px;filter:none}
@keyframes evlGlueh{50%{transform:scale(1.08);box-shadow:0 0 14px rgba(255,214,110,.6)}}
@media (prefers-reduced-motion:reduce){.evl-k.is-hol .evl-bild{animation:none}}
.evl-zeilen{display:grid;gap:6px;margin-bottom:8px}
.evl-z{display:grid;grid-template-columns:minmax(64px,38%) 1fr auto;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.evl-z > b{display:flex;flex-direction:column;gap:1px;font:700 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-1)} .evl-z > b small{font:600 10.5px/1.2 var(--font-ui);color:var(--tx-3)}
.evl-z.is-hol{border-color:rgba(242,199,92,.7);background:linear-gradient(90deg,rgba(242,199,92,.16),rgba(0,0,0,.2));box-shadow:0 0 10px rgba(242,199,92,.25)}
.evl-z.is-ok{opacity:.8} .evl-z.is-zu .bk-raster{filter:saturate(.5) brightness(.8)}
.evl-st{display:flex;align-items:center;gap:4px;justify-content:flex-end;color:var(--tx-3)} .evl-st img{width:20px;height:20px} .evl-st small{font:600 11px/1 var(--font-ui)} .evl-st .icon{width:16px;height:16px}
.evk-n{min-width:30px;font:800 var(--fs-15)/1 var(--font-display);color:var(--gold-100)}
#eventBody > .btn[data-ev-hol]{width:100%;margin:0 0 8px}
/* Lebensbalken (Tagesboss/Drache): die Zahl nie halb abgeschnitten – Höhe wächst mit der Schrift */
.barb-hp{height:auto;min-height:20px} .barb-hp span{line-height:1.35;padding:2px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ev-saison{margin-top:12px}.ev-saison .field-lines b{text-align:left;justify-content:flex-start}
.tour-prize{gap:4px;padding:9px 4px} .tour-prize b{font-size:var(--fs-13)} .tour-prize span{font-size:12px} .tour-prize .icon{width:14px;height:14px} .tour-prize em{font-size:10px}
.lb-info summary{display:flex;align-items:center;gap:6px;min-height:44px;list-style:none;cursor:pointer;font:600 13px/1.2 var(--font-ui);color:var(--tx-2)} .lb-info summary::-webkit-details-marker{display:none}
.lb-info summary .icon{width:18px;height:18px;color:var(--gold-300)} .lb-info p{margin:0 0 8px}
.empty-state.lb-leer{flex-direction:row;align-items:center;gap:12px;padding:12px 14px;text-align:left;border:1px dashed var(--line-2);border-radius:10px} .lb-leer > span{display:flex;flex-direction:column;gap:2px} .lb-leer .icon{flex:none;width:26px;height:26px}
/* Heldenhalle (Blick 6.10.): genug Splitter → goldene Karte mit „Freischalten“, Stern in 4 Vierteln als Balken, am Desktop größere Karten */
.hh-card.is-ready{border-color:var(--gold-300);box-shadow:0 0 0 1px var(--gold-300),0 0 18px rgba(242,199,92,.45)} .hh-card.is-ready .hh-art{filter:grayscale(.35) brightness(.8)}
.hh-frei{display:inline-flex;align-items:center;gap:4px;margin-top:4px;padding:6px 10px;border-radius:var(--r-pill);background:linear-gradient(180deg,var(--gold-200),var(--gold-400));color:var(--tx-inv);font:800 11px/1 var(--font-ui);letter-spacing:.04em;text-transform:uppercase}
.hh-frei .icon{width:12px;height:12px}
.hh > .hh-zu-h{margin:12px auto 4px}
.hh-steps span{height:8px;padding:0;border:1px solid #ffffff14} .hh-steps span.on{background:var(--gold-300)}
@media (min-width:900px){ .hh-cards{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px} .hh-cards.hh-cards--zu{grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px}
  .hh-hero{grid-template-columns:minmax(0,1fr) 440px} }
/* Willkommen zurück (6.10.): Bezeichnung einzeilig („Ertrag pro Stunde“ brach in 3 Zeilen um), lange Zahlen rutschen darunter */
#welcomeModal .lvlup-rewards li{flex-wrap:wrap;row-gap:2px} #welcomeModal .lvlup-rewards li span{flex:1 0 auto;white-space:nowrap} #welcomeModal .lvlup-rewards li b{flex:1 1 auto}
/* Profil: Kopf in 3 Zeilen (Rang + Titel, Name, Stufe) */
.p5-kopfzeile{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 16px}
.p5-kopfzeile .ptitle-tag{position:relative;margin:0;white-space:nowrap}
.p5-kopfzeile .ptitle-tag:not(:empty)::before{content:"·";position:absolute;left:-10px;color:var(--tx-3)}   /* der Punkt steht in der Lücke: bricht der Titel um, schneidet der Rand ihn ab */
/* Profil-Kopf wie bei einem Herrscher: Name (Stift: antippen zum Ändern), darunter Macht und Spieler-Nummer */
.p5-name{display:flex;align-items:center;gap:4px;min-width:0;cursor:text}
.p5-name .ptitle--input{flex:1}
.p5-name .icon{flex:none;width:14px;height:14px;color:var(--tx-3)}
.p5-kennung{display:flex;flex-wrap:wrap;align-items:center;gap:2px 12px;margin:1px 0 3px;font:500 12px/1.3 var(--font-ui);color:var(--tx-2)}
.p5-kennung b{color:var(--gold-100);font-variant-numeric:tabular-nums}
.p5-kennung .icon{width:13px;height:13px;margin-right:4px;color:var(--gold-300);vertical-align:-2px}
@media (max-height:500px) and (orientation:landscape){ .p5-kennung{display:none} }   /* (quer: der Kopf bleibt kompakt) */
.p5-heimat{display:inline-flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums}
.p5-heimat .btn{min-height:36px}
/* Ausrüstung: leere Felder führen zur Ausrüstungskiste (Plus unten rechts) */
#chestEquippedGrid .tile.empty{cursor:pointer}
.tile.empty .p5-plus{position:absolute;right:4px;bottom:4px;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--gold-300);color:#1a1408}
.tile.empty .p5-plus .icon{width:12px;height:12px}
#chestEquippedGrid .slot-r:not([data-r]){color:var(--gold-200)}
.empty-state .btn{margin-top:6px}
/* Fähigkeiten: große runde Knoten mit Stufe, Name darunter (Linien wie gehabt durch die Mitten) */
#skillGrid.skillCross{width:min(100%,330px);aspect-ratio:auto;grid-template-rows:repeat(3,112px)}
#skillGrid .skillNode{width:66px;height:66px;border-radius:50%}
#skillGrid .skillNode .nIcon .icon{width:26px;height:26px}
#skillGrid .skillNode .nName{position:absolute;top:calc(100% + 5px);left:50%;width:104px;transform:translateX(-50%);font:600 11px/1.2 var(--font-ui);hyphens:manual;color:var(--tx-2);text-align:center}
#skillGrid .skillNode.selected .nName{color:var(--gold-100)}
#skillGrid .skillNode[data-level="0"]{filter:saturate(.35)}
.p5-naechste{margin:0 0 8px;padding:8px 12px;border:1px solid var(--line-1);border-radius:8px;font-size:13px;color:var(--tx-2)}
.p5-zeile{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;margin:0 0 8px;padding:8px 12px;border:1px solid var(--line-2);border-radius:10px;
  background:rgba(255,255,255,.03);color:var(--tx-1);font:600 15px/1.2 var(--font-ui);text-align:left;cursor:pointer}
.p5-zeile > span{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.p5-zeile small{font:400 13px/1.3 var(--font-ui);color:var(--tx-3)}
.p5-zeile .icon{flex:none;width:20px;height:20px;color:var(--gold-300)}
.p5-zeile .p5-pfeil{width:16px;height:16px;transform:scaleX(-1);color:var(--tx-3)}
/* Einstellungen: Sprung-Leiste und Gruppen */
.p5-sprung{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
.p5-sprung button{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px;border:1px solid var(--line-2);border-radius:22px;background:rgba(255,255,255,.03);
  color:var(--tx-1);font:600 13px/1 var(--font-ui);cursor:pointer}
.p5-sprung .icon{width:16px;height:16px;color:var(--gold-300)}
.p5-gruppe{margin:12px 0 4px;font:700 11px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--gold-200)}
.p5-gruppe:first-child{margin-top:4px}
#tabSet .set-zeile{min-height:44px}
#tabSet .set-zeile input{width:24px;height:24px}
#tabSet .set-knoepfe .btn,#tabSet .set-ab .btn,#tabSet .set-pw .btn,#pushKnopf{min-height:44px}
.p5-hilfe summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font:600 13px/1.2 var(--font-ui);color:var(--tx-1)}
.p5-hilfe p{font-size:13px}
/* Bündnis ohne Bündnis: Gründen unter der Liste */
#bundUnten:not(:empty){margin-top:16px}
.p5-gruenden{width:100%;min-height:44px;gap:8px}
.p5-gruenden .cost{margin-left:auto;display:inline-flex;align-items:center;gap:4px}
/* Spieltest: Tippflächen mind. 44 px (sichtbar kleiner), nichts abgeschnitten */
button.rp-bund{position:relative} button.rp-bund::before{content:"";position:absolute;left:0;right:0;top:50%;height:var(--k-tipp);transform:translateY(-50%)}
.rp-bund.is-leer{font-size:var(--fs-11)} .rp-bund.is-leer > span{white-space:normal}   /* „Kein Bündnis – jetzt eins suchen“ ganz, notfalls in zwei Zeilen */
.panel--island .seg button{position:relative;min-height:36px}
.panel--island .seg button::before{content:"";position:absolute;left:-1px;right:-1px;top:-5px;bottom:-5px}   /* (ab der Innenkante: 1 px Rand dazu) */
.ap-regler .seg button::before{left:-3px;right:-3px}   /* Angriff 25 %…Alle: 42 px breit, die Tippfläche reicht in die Lücke (44 px) */
.panel--island .hero-seg.chips-quer{padding-block:4px}   /* (die Liste schiebt quer: die Tippfläche braucht Platz im Rahmen) */
.panel--island .pfoot .btn{min-height:var(--k-zweit)}
.from-sel{padding:0 6px 0 10px;font-weight:500}   /* („· reicht“ dahinter passt auch noch) */
.mact button{position:relative} .logRow .mact button,.march-all .mact button{min-height:36px} .mact button::before{content:"";position:absolute;left:-1px;right:-1px;top:-5px;bottom:-5px}
@media (pointer:coarse){ .mapctl button{width:44px;height:44px} .ap-kopf .from-sel{height:44px} }
</style>

<!-- ============ PROFILE ============ -->
<section id="profilePopup" class="panel panel--sheet" role="dialog" aria-labelledby="profileName" data-tab="info">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead phead--hero">
    <div id="pAvatarRing" class="avatar-ring"><span class="avatar"><svg class="icon"><use href="#i-profile"/></svg></span><span id="profileLevelBadge" class="lvl">1</span></div>
    <div class="phead-text">
      <div class="overline p5-kopfzeile"><span>Rang <b id="profileRank">Bronze</b></span><span id="profileTitle" class="ptitle-tag"></span></div>
      <label class="p5-name"><input id="profileName" class="ptitle ptitle--input" type="text" maxlength="20" placeholder="Dein Name" autocomplete="off" spellcheck="false" aria-label="Dein Name (antippen zum Ändern)"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19l1-4L16 5l3 3L9 18zM14 7l3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></label>
      <div id="profileKennung" class="p5-kennung"></div>
      <div class="xp"><span class="xp-l">Stufe <b id="xpLevelNum">1</b></span><div class="xp-track"><i id="xpFill" class="xpFill"></i></div><span id="xpNums" class="xp-n">0 / 50 XP</span></div>
      <div id="profileBund"></div>
    </div>
    <button id="profileCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="profileTabs" class="tabs" role="tablist">
    <button id="tabBtnInfo" class="tab active" type="button" role="tab"><svg class="icon"><use href="#i-profile"/></svg><span>Spieler</span></button>
    <button id="tabBtnEquip" class="tab" type="button" role="tab"><svg class="icon"><use href="#i-shield"/></svg><span>Ausrüstung</span></button>
    <button id="tabBtnSkills" class="tab" type="button" role="tab"><svg class="icon"><use href="#i-star"/></svg><span>Fähigkeiten</span></button>
    <button id="tabBtnSet" class="tab" type="button" role="tab"><svg class="icon"><use href="#i-gear"/></svg><span>Einstellungen</span></button>
  </div>
  <div class="pbody">
    <div id="tabInfo" class="profileTabPanel active" role="tabpanel">
      <div id="xpNext" class="xp-next p5-naechste"></div>
      <!-- Aussehen: nur hier (Wappen, Rahmen, Titel) -->
      <button id="crestCard" class="crest-card" type="button" aria-label="Aussehen: Wappen, Rahmen">
        <canvas id="crestSmall" width="112" height="112"></canvas>
        <span id="lookNow" class="crest-card-t"><b>Aussehen</b><small>Wappen · Rahmen</small></span>
        <span class="crest-card-go">Ändern<svg class="icon"><use href="#i-upgrade"/></svg></span>
      </button>
      <!-- Rangliste: eigenes Fenster, hier nur der Weg dorthin -->
      <button id="tabBtnRank" class="p5-zeile" type="button"><svg class="icon"><use href="#i-rank"/></svg><span>Rangliste<small>Macht, Eroberungen, Hauptstadt, Titel, Thron-Punkte</small></span><svg class="icon p5-pfeil"><use href="#i-back"/></svg></button>
      <div class="sect"><h4>Reich</h4></div>
      <div class="stat-grid">
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-flag"/></svg>Basen</span><b class="stat-v" id="kBases">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-troops"/></svg>Truppen / Std.</span><b class="stat-v is-good" id="kTroopsRate">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-coin"/></svg>Münzen / Std.</span><b class="stat-v is-good" id="kCoinsRate">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-rank"/></svg>Nächster Rang</span><b class="stat-v" id="profileNextRank">–</b></div>
      </div>
      <div class="sect"><h4>Übersicht</h4></div>
      <div id="profileStats" class="kv"></div>
    </div>

    <div id="tabEquip" class="profileTabPanel" role="tabpanel">
      <div id="equipStats" class="bonus-row"></div>
      <div class="sect"><h4>Ausgerüstet</h4></div>
      <div id="chestEquippedGrid" class="slots"></div>
      <div class="sect">
        <h4 id="chestInventoryLabel">Inventar</h4>
        <div class="sect-aside">
          <span class="pill pill--points" title="Aufwertungspunkte"><svg class="icon"><use href="#i-points"/></svg><b id="chestPointsValue">0</b><small>Punkte</small></span>
        </div>
      </div>
      <div id="chestInventoryGrid" class="tiles"></div>
    </div>

    <div id="tabSkills" class="profileTabPanel" role="tabpanel">
      <div id="skillPointsLine" class="pointsline"></div>
      <div id="skillDetail" class="skillDetail"></div>
      <div id="skillGrid" class="skillCross"></div>
    </div>

    <!-- EINSTELLUNGEN (nur hier): Benachrichtigungen (benachrichtigung.js), Ton, Grafik, Konto, Hilfe -->
    <div id="tabSet" class="profileTabPanel" role="tabpanel">
      <nav class="p5-sprung" aria-label="Einstellungen">
        <button type="button" data-sprung="setBen"><svg class="icon"><use href="#i-flag"/></svg>Benachrichtigungen</button><button type="button" data-sprung="setTonGrafik"><svg class="icon"><use href="#i-sound"/></svg>Ton &amp; Grafik</button><button type="button" data-sprung="setKonto"><svg class="icon"><use href="#i-profile"/></svg>Konto</button><button type="button" data-sprung="setHilfe"><svg class="icon"><use href="#i-info"/></svg>Hilfe</button>
      </nav>
      <div class="sect" id="setBen"><h4>Benachrichtigungen</h4></div>
      <div id="pushKarte" class="push-karte">
        <p id="pushText" class="push-text">Einen Moment …</p>
        <button id="pushKnopf" class="btn btn--secondary btn--sm" type="button" hidden></button>
        <div id="pushArten" class="set-liste" hidden>
          <div class="p5-gruppe">Angriff</div>
          <label class="set-zeile"><span>Angriff auf deine Basis</span><input type="checkbox" data-push-art="angriff"></label>
          <label class="set-zeile"><span>Späher bei dir<small>unterwegs zu dir und „hat deine Basis ausgespäht“</small></span><input type="checkbox" data-push-art="spaeher"></label>
          <label class="set-zeile"><span>Basis verloren</span><input type="checkbox" data-push-art="verloren"></label>
          <label class="set-zeile"><span>Friedensschild läuft ab</span><input type="checkbox" data-push-art="schild"></label>
          <label class="set-zeile"><span>Rally gegen dich</span><input type="checkbox" data-push-art="rally"></label>
          <div class="p5-gruppe">Bündnis</div>
          <label class="set-zeile"><span>Bündnis ruft um Hilfe</span><input type="checkbox" data-push-art="hilfe"></label>
          <div class="p5-gruppe">Events</div>
          <label class="set-zeile"><span>Kriegsherr erschienen</span><input type="checkbox" data-push-art="boss"></label>
          <label class="set-zeile"><span>Barbaren-Invasion beginnt<small>10 Minuten vorher</small></span><input type="checkbox" data-push-art="invasion"></label>
          <label class="set-zeile"><span>Der Drache ist erschienen<small>Sonntagabend</small></span><input type="checkbox" data-push-art="drache"></label>
          <label class="set-zeile"><span>Ein Händler ist da<small>Wandernder Händler auf der Karte</small></span><input type="checkbox" data-push-art="haendler"></label>
          <div class="p5-gruppe">Stadt</div>
          <label class="set-zeile"><span>Sammler zurück</span><input type="checkbox" data-push-art="sammler"></label>
          <label class="set-zeile"><span>Bau fertig<small>Gebäude und Burg in deiner Stadt</small></span><input type="checkbox" data-push-art="bau"></label>
          <label class="set-zeile"><span>Forschung fertig<small>Labor ist wieder frei</small></span><input type="checkbox" data-push-art="forschung"></label>
        </div>
      </div>
      <div class="sect" id="setTonGrafik"><h4>Ton &amp; Grafik</h4></div>
      <div id="setTon" class="set-wahl" role="radiogroup" aria-label="Ton">
        <button type="button" data-ton="all"><svg class="icon"><use href="#i-sound"/></svg>Musik + Effekte</button>
        <button type="button" data-ton="sfx"><svg class="icon"><use href="#i-sfx"/></svg>Nur Effekte</button>
        <button type="button" data-ton="off"><svg class="icon"><use href="#i-mute"/></svg>Aus</button>
      </div>
      <div class="set-liste">
        <label class="set-zeile"><span>Akku sparen<small>Karte ruhiger, weniger Bilder pro Sekunde</small></span><input type="checkbox" id="setAkku"></label>
      </div>
      <div class="sect" id="setKonto"><h4>Konto</h4></div>
      <div class="kv"><div><span>Name</span><b id="setName"></b></div><div><span>Spieler-Nummer</span><b id="setNr"></b></div></div>
      <div class="set-knoepfe"><button id="setNameBtn" class="btn btn--secondary btn--sm" type="button">Name ändern</button>
        <button id="setPwOffen" class="btn btn--secondary btn--sm" type="button">Passwort ändern</button></div>
      <form id="setPwForm" class="set-pw" hidden autocomplete="on">
        <input id="setPwAlt" type="password" autocomplete="current-password" placeholder="Altes Passwort" maxlength="200">
        <input id="setPwNeu" type="password" autocomplete="new-password" placeholder="Neues Passwort (10–72 Zeichen)" maxlength="72">
        <input id="setPwNeu2" type="password" autocomplete="new-password" placeholder="Neues Passwort wiederholen" maxlength="72">
        <button class="btn btn--primary btn--sm" type="submit">Speichern</button>
        <small>Danach bist du auf allen anderen Geräten abgemeldet.</small>
      </form>
      <form action="index.php?aus=1" method="post" class="set-ab"><button class="btn btn--secondary btn--sm" type="submit">Abmelden</button></form>
      <div class="sect" id="setHilfe"><h4>Hilfe</h4></div>
      <div class="set-knoepfe"><button id="anleitungNochmal" class="btn btn--secondary btn--sm" type="button">Anleitung noch mal</button></div>
      <details class="set-hilfe p5-hilfe">
        <summary>Wo finde ich was?</summary>
        <p><b>Stadt</b> → Burg (deine Hauptstadt-Stufe), Gebäude, Holz/Stein/Eisen, Forschung, Krankenhaus, Helden.</p>
        <p><b>Bündnis</b> → zusammen mit anderen: Chat, Rally, Verstärkung, Bündnis-Hilfe, Tempel-Bonus.</p>
        <p><b>Kampf</b> → Unterwegs (deine Märsche) und Berichte.</p>
        <p><b>Events</b> → Aufgaben (Täglich, Erfolge), Abholen (Abholfach, tägliche Belohnung), Pass, Ereignisse (Wochen-Event, Invasion, Drache, Tagesboss und Lager).</p>
        <p><b>Shop</b> → Kisten, Friedensschilde, Thron-Shop, Händler, Markt.</p>
        <p><b>Profil</b> → Spieler (Aussehen, Rangliste), Ausrüstung, Fähigkeiten, Einstellungen.</p>
        <p><b>Karte</b> → Basis antippen: angreifen, Truppen senden, aufwerten. Felder: sammeln. Mitte: wer den Mega-Tempel hält, herrscht.</p>
      </details>
      <div class="sect"><h4>Info</h4></div>
      <div class="kv"><div><span>Version</span><b id="setVersion"></b></div></div>
    </div>

  </div>
  <footer id="profileFoot" class="pfoot">
    <div id="chestSelectionBar" class="selbar">
      <div class="label" id="chestSelectionLabel"></div>
      <div class="row">
        <button id="chestSelectCombineBtn" class="btn btn--secondary btn--sm" type="button"><svg class="icon"><use href="#i-combine"/></svg><span>Kombinieren</span></button>
        <button id="chestSelectSellBtn" class="btn btn--danger btn--sm" type="button"><svg class="icon"><use href="#i-sell"/></svg><span>Verkaufen</span></button>
      </div>
    </div>
  </footer>
</section>

<!-- ============ BATTLE LOG ============ -->
<section id="battleLogPopup" class="panel panel--sheet" role="dialog" aria-labelledby="battleLogTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><svg class="icon"><use href="#i-battlelog"/></svg></div>
    <div class="phead-text"><div class="overline">Angriffe &amp; Berichte</div><h3 id="battleLogTitle" class="ptitle">Kampf</h3></div>
    <button id="battleLogCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="battleTabs" class="tabs p5-reiter" role="tablist">
    <button class="tab active" type="button" role="tab" data-ktab="unterwegs"><svg class="icon"><use href="#i-hourglass"/></svg><span>Unterwegs</span><span class="badge" id="battleTabBadge" style="display:none">0</span></button>
    <button class="tab" type="button" role="tab" data-ktab="berichte"><svg class="icon"><use href="#i-battlelog"/></svg><span>Berichte</span></button>
  </div>
  <div class="pbody">
    <div id="activeMarches" class="logList" data-kpane="unterwegs"></div>
    <div id="combatLogList" class="logList" data-kpane="berichte" hidden></div>
  </div>
</section>

<!-- ============ RULER ============ -->
<section id="rulerPopup" class="panel panel--sheet" role="dialog" aria-labelledby="rulerName">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div id="rulerCrest" class="rp-crest"><span class="rp-crest-in"><img alt=""></span><span class="lvl" id="rulerLvl">1</span></div>
    <div class="phead-text"><div class="overline" id="rulerOver">Profil</div><h3 id="rulerName" class="ptitle">–</h3><div class="psub" id="rulerSub"></div></div>
    <button id="rulerCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div class="pbody" id="rulerBody"></div>
</section>

<!-- ============ BÜNDNIS (Dock, buendnis.js) ============ -->
<section id="bundPopup" class="panel panel--sheet" role="dialog" aria-labelledby="bundTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div id="bundEmblem" class="emblem emblem--gold"><svg class="icon"><use href="#i-bund"/></svg></div>
    <div class="phead-text"><div class="overline">Bündnis</div><h3 id="bundTitle" class="ptitle">Bündnis</h3><div class="psub" id="bundSub"></div></div>
    <button id="bundCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="bundTabs" class="tabs" role="tablist">
    <button class="tab active" type="button" role="tab" data-btab="info"><svg class="icon"><use href="#i-bund"/></svg><span>Übersicht</span></button>
    <button class="tab" type="button" role="tab" data-btab="sig"><svg class="icon"><use href="#i-flag"/></svg><span>Chat</span></button>
    <button class="tab" type="button" role="tab" data-btab="rally"><svg class="icon"><use href="#i-troops"/></svg><span>Rally</span></button>
    <button class="tab" type="button" role="tab" data-btab="suchen"><svg class="icon"><use href="#i-scout"/></svg><span>Suchen</span></button>
  </div>
  <div class="pbody"><div id="bundOben"></div><div id="bundLive" class="bd-live"></div><div id="bundUnten"></div></div>
</section>

<!-- ============ RANGLISTE (Profil → Rangliste) ============ -->
<section id="rankPopup" class="panel panel--sheet" role="dialog" aria-labelledby="rankTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><svg class="icon"><use href="#i-rank"/></svg></div>
    <div class="phead-text"><div class="overline">Rangliste</div><h3 id="rankTitle" class="ptitle">Macht</h3><div class="psub" id="rankSub"></div></div>
    <button id="rankCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="rankTabs" class="tabs" role="tablist">
    <button class="tab active" type="button" role="tab" data-rtab="power"><svg class="icon"><use href="#i-attack"/></svg><span>Macht</span></button>
    <button class="tab" type="button" role="tab" data-rtab="caps"><svg class="icon"><use href="#i-flag"/></svg><span>Eroberungen</span></button>
    <button class="tab" type="button" role="tab" data-rtab="burg"><svg class="icon"><use href="#i-castle"/></svg><span>Hauptstadt</span></button>
    <button class="tab" type="button" role="tab" data-rtab="titles"><svg class="icon"><use href="#i-crown"/></svg><span>Titel</span></button>
    <button class="tab" type="button" role="tab" data-rtab="week"><svg class="icon"><use href="#i-points"/></svg><span>Thron-Punkte</span></button>
  </div>
  <div class="pbody" id="rankBody"></div>
  <footer class="pfoot lb-foot" id="rankFoot"></footer>
</section>

<!-- ============ EVENTS (Dock): 4 Reiter Aufgaben (Täglich, Erfolge) · Abholen (Abholfach + tägliche Belohnung) · Pass ·
     Ereignisse (Wochen-Event, Invasion, Drache, Tagesboss + Barbaren-Lager) – alles nur hier ============ -->
<section id="goalsPopup" class="panel panel--sheet" role="dialog" aria-labelledby="goalsTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><svg class="icon"><use href="#i-event"/></svg></div>
    <div class="phead-text"><div class="overline">Aufgaben &amp; Ereignisse</div><h3 id="goalsTitle" class="ptitle">Events</h3><div class="psub" id="goalsSub"></div></div>
    <button id="goalsCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="goalsGruppen" class="tabs mail-tabs p5-reiter" role="tablist">
    <button class="tab active" type="button" role="tab" data-ggrp="aufgaben"><svg class="icon"><use href="#i-flag"/></svg><span>Aufgaben</span><span class="badge" data-ggbadge="aufgaben" style="display:none">0</span></button>
    <button class="tab" type="button" role="tab" data-ggrp="abholen"><svg class="icon"><use href="#i-shop"/></svg><span>Abholen</span><span class="badge" data-ggbadge="abholen" style="display:none">0</span></button>
    <button class="tab" type="button" role="tab" data-ggrp="pass"><svg class="icon"><use href="#i-crown"/></svg><span>Pass</span><span class="badge" data-ggbadge="pass" style="display:none">0</span></button>
    <button class="tab" type="button" role="tab" data-ggrp="ereignisse"><svg class="icon"><use href="#i-event"/></svg><span>Ereignisse</span><span class="badge" data-ggbadge="ereignisse" style="display:none">!</span></button>
  </div>
  <!-- Unterreiter als Chips: nur die der offenen Gruppe sind sichtbar -->
  <div id="goalsTabs" class="p5-chips" role="tablist">
    <button class="p5-chip active" type="button" role="tab" data-gtab="daily" data-ggrp-von="aufgaben"><span>Täglich</span><span class="badge" data-gbadge="daily" style="display:none">0</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="ach" data-ggrp-von="aufgaben"><span>Erfolge</span><span class="badge" data-gbadge="ach" style="display:none">0</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="reward" data-ggrp-von="abholen" hidden><span>Belohnung</span><span class="badge" data-gbadge="reward" style="display:none">0</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="pass" data-ggrp-von="pass" hidden><span>Pass</span><span class="badge" data-gbadge="pass" style="display:none">0</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="tour" data-ggrp-von="ereignisse" hidden><span>Woche</span><span class="badge" data-gbadge="tour" style="display:none">!</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="inv" data-ggrp-von="ereignisse" hidden><span>Invasion</span><span class="badge" data-gbadge="inv" style="display:none">!</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="drache" data-ggrp-von="ereignisse" hidden><span>Drache</span><span class="badge" data-gbadge="drache" style="display:none">!</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="boss" data-ggrp-von="ereignisse" hidden><span>Boss</span><span class="badge" data-gbadge="boss" style="display:none">!</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="lager" data-ggrp-von="ereignisse" hidden><span>Lager</span><span class="badge" data-gbadge="lager" style="display:none">!</span></button>
  </div>
  <div class="pbody">
    <div class="mail-pane" data-gpane="daily">
      <div class="sect"><h4>Heutige Aufgaben</h4><span id="questReset" class="sect-aside quest-reset"></span></div>
      <div id="questList" class="quests"></div>
      <div class="sect"><h4>Wochenkette</h4></div>
      <div id="chainCard" class="chain"></div>
    </div>
    <div class="mail-pane" data-gpane="reward" hidden>
      <div class="sect"><h4>Zum Abholen</h4><span id="inboxAside" class="sect-aside"></span></div>
      <div id="inboxList" class="inbox"></div>
      <div class="sect"><h4>Tägliche Belohnung</h4></div>
      <div id="dailyCard" class="daily"></div>
      <div class="sect"><h4>Die Woche</h4><span class="sect-aside">verpasster Tag = Tag 1</span></div>
      <div id="dailyWeek" class="daily-week"></div>
    </div>
    <div class="mail-pane" data-gpane="ach" hidden>
      <div id="achSummary" class="ach-sum"></div>
      <div id="achList" class="ach-list"></div>
    </div>
    <div class="mail-pane" data-gpane="pass" hidden>
      <div id="passPane" class="pass"></div>
    </div>
    <div class="mail-pane" data-gpane="ev" hidden><div id="eventBody" class="ev-body"></div></div>
  </div>
</section>

<!-- ============ SHOP (Dock): Kisten (Schlüssel/Edelsteine) · Event (Event-Münzen) · Tempo (Beschleuniger) · Schilde + Teleporter · Händler (nur wenn einer da ist) · Markt – alles Kaufen/Tauschen nur hier ============ -->
<section id="shopPopup" class="panel panel--sheet" role="dialog" aria-labelledby="shopTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><svg class="icon"><use href="#i-shop"/></svg></div>
    <div class="phead-text"><div class="overline">Kaufen &amp; Tauschen</div><h3 id="shopTitle" class="ptitle">Shop</h3>
      <div class="psub"><span class="pill pill--gem"><svg class="icon"><use href="#i-gem"/></svg><b id="shopGemCount">0</b><small>Edelsteine</small></span><span class="pill pill--em"><img src="bilder/beute_eventmuenze.webp" alt="" draggable="false"><b id="shopEmCount">0</b><small>Event-Münzen</small></span></div></div>
    <button id="shopCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="shopTabs" class="tabs mail-tabs" role="tablist">
    <button class="tab active" type="button" role="tab" data-stab="gems"><svg class="icon"><use href="#i-gem"/></svg><span>Kisten</span></button>
    <button class="tab" type="button" role="tab" data-stab="ev"><svg class="icon"><use href="#i-star"/></svg><span>Event</span></button>
    <button class="tab" type="button" role="tab" data-stab="tempo"><svg class="icon"><use href="#i-hourglass"/></svg><span>Tempo</span></button>
    <button class="tab" type="button" role="tab" data-stab="shield"><svg class="icon"><use href="#i-shield"/></svg><span>Schilde</span></button>
    <button class="tab" type="button" role="tab" data-stab="hd" hidden><svg class="icon"><use href="#i-coin"/></svg><span>Händler</span><span class="badge">!</span></button>
    <button class="tab" type="button" role="tab" data-stab="markt"><svg class="icon"><use href="#i-crate"/></svg><span>Markt</span></button>
  </div>
  <div class="pbody">
    <div class="mail-pane" data-spane="throne" hidden><div id="throneShop"></div></div>
    <div class="mail-pane" data-spane="hd" hidden><div class="sect"><h4 id="hdTitle">Wandernder Händler</h4><span id="hdSub" class="sect-aside"></span></div><div id="hdLive" class="hd-live"></div></div>
    <div class="mail-pane" data-spane="markt" hidden><div id="shopMarkt" class="ev-body"></div></div>
    <div class="mail-pane" data-spane="shield" hidden>
      <div id="shieldState" class="notice"></div>
      <div class="sect"><h4>Kaufen</h4><span class="sect-aside">kommt in den Rucksack<button type="button" class="shop-i" data-sinfo="schild" aria-expanded="false" aria-label="Erklärung"><svg class="icon"><use href="#i-info"/></svg></button></span></div>
      <p class="mail-intro shop-info" data-sinfo-box="schild" hidden>Friedensschild: niemand kann deine Türme angreifen, solange er steht – Tore, Tempel und der Thron bleiben angreifbar. Greifst du selbst an, fällt der Schild sofort.</p>
      <div class="waren waren--3">
        <div class="ware ware--klein" data-r="blau"><span class="ware-bild ware-bild--ic"><svg class="icon"><use href="#i-shield"/></svg><i>2 h</i></span><span class="ware-txt"><b class="ware-name">Schild</b><small>2 Stunden</small></span>
          <button type="button" class="ware-preis" data-shield="2" aria-label="Schild 2 Std. kaufen"><svg class="icon"><use href="#i-gem"/></svg><b>80</b></button></div>
        <div class="ware ware--klein" data-r="blau"><span class="ware-bild ware-bild--ic"><svg class="icon"><use href="#i-shield"/></svg><i>8 h</i></span><span class="ware-txt"><b class="ware-name">Schild</b><small>8 Stunden</small></span>
          <button type="button" class="ware-preis" data-shield="8" aria-label="Schild 8 Std. kaufen"><svg class="icon"><use href="#i-gem"/></svg><b>300</b></button></div>
        <div class="ware ware--klein" data-r="blau"><span class="ware-bild ware-bild--ic"><svg class="icon"><use href="#i-shield"/></svg><i>24 h</i></span><span class="ware-txt"><b class="ware-name">Schild</b><small>24 Stunden</small></span>
          <button type="button" class="ware-preis" data-shield="24" aria-label="Schild 24 Std. kaufen"><svg class="icon"><use href="#i-gem"/></svg><b>700</b></button></div>
      </div>
      <div class="sect"><h4>Teleporter</h4><span class="sect-aside">kommt in den Rucksack</span></div>
      <div class="waren waren--3">
        <div class="ware ware--klein" data-r="lila"><span class="ware-bild"><img class="kiste-bild" src="bilder/ui_sym_verlegen.webp" alt="" draggable="false"></span><span class="ware-txt"><b class="ware-name">Teleporter</b><small class="ware-lang">Hauptstadt an eine freie Stelle</small></span>
          <button type="button" class="ware-preis" data-tele-kauf aria-label="Teleporter kaufen"><svg class="icon"><use href="#i-gem"/></svg><b>500</b></button></div>
      </div>
      <button type="button" class="ware-link" data-zum-rucksack><svg class="icon"><use href="#i-crate"/></svg><span id="shopRucksackN">Rucksack ›</span></button>
    </div>
    <div class="mail-pane" data-spane="gems">
      <!-- Kisten wie die Test-Datei (werkzeuge/thronevent ?a=shopkisten): Gruppen Ausrüstung · Helden · Schlüssel, je Kiste „1ד und „10ד (Schlüssel, sonst Edelsteine) -->
      <div class="sect"><h4>Kisten öffnen</h4><span class="sect-aside">mit Schlüssel oder Edelsteinen<button type="button" class="shop-i" data-sinfo="kiste" aria-expanded="false" aria-label="Chancen"><svg class="icon"><use href="#i-info"/></svg></button></span></div>
      <div class="shop-info" data-sinfo-box="kiste" hidden>
        <p class="mail-intro"><b>Ausrüstungs-Kiste:</b> ein zufälliges Teil (Waffe, Rüstung, Schild oder Stiefel).</p><div id="shopOdds" class="odds"><!-- JS fills from RARITY_DEFS + RARITY_DROP_WEIGHTS --></div>
        <p class="mail-intro"><b>Epische Ausrüstung:</b> Ungewöhnlich bis Episch – spätestens beim 20. Mal sicher Episch.</p><div id="shopOddsE" class="odds"></div>
        <p class="mail-intro"><b>Helden-Kisten:</b> Splitter für zufällige Helden; die epische spätestens beim 20. Mal für einen epischen Helden. Helden mit 5 Sternen fallen heraus.</p><div id="heroChestOdds" class="odds"></div>
      </div>
      <div id="shopKisten"></div>
      <button id="shopToEquipBtn" class="ware-link" type="button"><svg class="icon"><use href="#i-shield"/></svg><span>Inventar ›</span></button>
    </div>
    <div class="mail-pane" data-spane="ev" hidden><div id="shopEvent"></div></div>
    <div class="mail-pane" data-spane="tempo" hidden><div id="shopTempo"></div></div>
  </div>
</section>

<!-- ============ BESCHLEUNIGER benutzen (Bauen, Forschen): je Tipp einer, oder „Passend benutzen“ ============ -->
<section id="beschPopup" class="panel panel--sheet" role="dialog" aria-labelledby="beschTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><img class="rk-emblem" src="bilder/beute_beschleuniger_mittel.webp" alt="" draggable="false"></div>
    <div class="phead-text"><div class="overline">Bauen · Forschen</div><h3 id="beschTitle" class="ptitle">Beschleuniger</h3></div>
    <button id="beschCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div class="pbody"><div id="beschInhalt" class="rk-inhalt"></div></div>
</section>

<!-- ============ RUCKSACK (Dock): was du hast – Schilde (einsetzen), Teleporter (benutzen), Splitter je Held (nur Anzeige) ============ -->
<section id="rucksackPopup" class="panel panel--sheet" role="dialog" aria-labelledby="rucksackTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><img class="rk-emblem" src="bilder/ui_dock_rucksack.webp" alt="" draggable="false"></div>
    <div class="phead-text"><div class="overline">Deine Gegenstände</div><h3 id="rucksackTitle" class="ptitle">Rucksack</h3></div>
    <button id="rucksackCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div class="pbody">
    <div id="rkSchildStand" class="notice"></div>
    <div id="rkInhalt" class="rk-inhalt"></div>
  </div>
</section>

<!-- ============ ITEM DETAIL (nested over profile) ============ -->
<section id="chestItemPopup" class="panel panel--item" role="dialog" aria-labelledby="chestItemTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div id="chestItemIconBig" class="item-icon" data-r="grau"></div>
    <div class="phead-text">
      <div id="chestItemOverline" class="overline">Gewöhnlich</div>
      <h3 id="chestItemTitle" class="ptitle">Ausrüstung</h3>
      <div id="chestItemSub" class="psub"></div>
    </div>
    <button id="chestItemCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div class="pbody"><div id="chestItemStats" class="kv"></div></div>
  <footer class="pfoot pfoot--wrap">
    <button id="chestItemUpgradeBtn" class="btn btn--primary btn--full" type="button"><svg class="icon"><use href="#i-upgrade"/></svg><span class="lbl">Verbessern</span><span class="cost cost--pt"><svg class="icon"><use href="#i-points"/></svg><b>0</b></span></button>
    <button id="chestItemEquipBtn" class="btn btn--secondary btn--grow" type="button"><svg class="icon"><use href="#i-check"/></svg><span>Ausrüsten</span></button>
    <button id="chestItemUnequipBtn" class="btn btn--secondary btn--grow" type="button" style="display:none"><span>Ablegen</span></button>
    <button id="chestItemSellBtn" class="btn btn--danger-outline btn--grow" type="button"><svg class="icon"><use href="#i-sell"/></svg><span>Verkaufen</span></button>
  </footer>
</section>
