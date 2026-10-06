// Teil 07-fenster.php: Fenster: Profil, Kampfbericht, Herrscher, Bündnis, Rangliste, Events, Shop, Gegenstand

<style>
/* Fenster Events, Kampf, Bündnis, Profil: höchstens 4 Reiter, Unterreiter als Chips, Tippflächen mind. 44 px, nichts abgeschnitten */
#goalsGruppen.tabs,#profilePopup #profileTabs.tabs{grid-template-columns:repeat(4,minmax(0,1fr))}
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
.p5-kurz{display:none}
@media (max-width:480px){ #goalsTabs{gap:6px;padding-inline:12px} #goalsTabs .p5-chip{padding:0 12px} #goalsTabs .p5-lang{display:none} #goalsTabs .p5-kurz{display:inline} }
.ev-saison{margin-top:12px} .ev-saison .field-lines b{text-align:left;justify-content:flex-start}
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
/* Profil: Kopf in 3 Zeilen (Rang + Titel, Name, Stufe) */
.p5-kopfzeile{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 16px}
.p5-kopfzeile .ptitle-tag{position:relative;margin:0;white-space:nowrap}
.p5-kopfzeile .ptitle-tag:not(:empty)::before{content:"·";position:absolute;left:-10px;color:var(--tx-3)}   /* der Punkt steht in der Lücke: bricht der Titel um, schneidet der Rand ihn ab */
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
.panel--island .hero-seg.chips-quer{padding-block:4px}   /* (die Liste schiebt quer: die Tippfläche braucht Platz im Rahmen) */
.panel--island .pfoot .btn{min-height:var(--k-zweit)}
.from-field{grid-template-columns:minmax(0,1fr);gap:4px}   /* Startbasis: Name, Truppen und Marschzeit ganz zu lesen */
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
      <div class="overline p5-kopfzeile"><span>Profil · Rang <b id="profileRank">Bronze</b></span><span id="profileTitle" class="ptitle-tag"></span></div>
      <input id="profileName" class="ptitle ptitle--input" type="text" maxlength="20" placeholder="Dein Name" autocomplete="off" spellcheck="false">
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
      <!-- Aussehen: nur hier (Wappen, Rahmen, Titel, Basis- und Marsch-Skins, Ringe) -->
      <button id="crestCard" class="crest-card" type="button" aria-label="Aussehen: Wappen, Rahmen, Titel, Skins, Ringe">
        <canvas id="crestSmall" width="112" height="112"></canvas>
        <span id="lookNow" class="crest-card-t"><b>Aussehen</b><small>Wappen, Rahmen, Titel, Skins, Ringe</small></span>
        <span class="crest-card-go">Ändern<svg class="icon"><use href="#i-upgrade"/></svg></span>
      </button>
      <!-- Rangliste: eigenes Fenster, hier nur der Weg dorthin -->
      <button id="tabBtnRank" class="p5-zeile" type="button"><svg class="icon"><use href="#i-rank"/></svg><span>Rangliste<small>Macht, Eroberungen, Hauptstadt, Titel, Thron-Punkte</small></span><svg class="icon p5-pfeil"><use href="#i-back"/></svg></button>
      <div class="sect"><h4>Reich</h4></div>
      <div class="stat-grid">
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-flag"/></svg>Basen</span><b class="stat-v" id="kBases">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-troops"/></svg>Truppen / Std.</span><b class="stat-v is-good" id="kTroopsRate">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-coin"/></svg>Münzen / Std.</span><b class="stat-v is-good" id="kCoinsRate">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-home"/></svg>Weltanteil</span><b class="stat-v" id="profileProgress">0%</b></div>
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
    <button class="p5-chip" type="button" role="tab" data-gtab="tour" data-ggrp-von="ereignisse" hidden><span class="p5-lang">Wochen-Event</span><span class="p5-kurz">Woche</span><span class="badge" data-gbadge="tour" style="display:none">!</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="inv" data-ggrp-von="ereignisse" hidden><span>Invasion</span><span class="badge" data-gbadge="inv" style="display:none">!</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="drache" data-ggrp-von="ereignisse" hidden><span>Drache</span><span class="badge" data-gbadge="drache" style="display:none">!</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="boss" data-ggrp-von="ereignisse" hidden><span class="p5-lang">Boss &amp; Lager</span><span class="p5-kurz">Boss</span></button>
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

<!-- ============ SHOP (Dock): Kisten · Schilde · Thron · Händler (nur wenn einer da ist) · Markt – alles Kaufen/Tauschen nur hier ============ -->
<section id="shopPopup" class="panel panel--sheet" role="dialog" aria-labelledby="shopTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><svg class="icon"><use href="#i-shop"/></svg></div>
    <div class="phead-text"><div class="overline">Kaufen &amp; Tauschen</div><h3 id="shopTitle" class="ptitle">Shop</h3>
      <div class="psub"><span class="pill pill--gem"><svg class="icon"><use href="#i-gem"/></svg><b id="shopGemCount">0</b><small>Edelsteine</small></span><span class="pill pill--throne"><svg class="icon"><use href="#i-crown"/></svg><b id="shopThroneCount">0</b><small>Thron</small></span></div></div>
    <button id="shopCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="shopTabs" class="tabs mail-tabs" role="tablist">
    <button class="tab active" type="button" role="tab" data-stab="gems"><svg class="icon"><use href="#i-gem"/></svg><span>Kisten</span></button>
    <button class="tab" type="button" role="tab" data-stab="shield"><svg class="icon"><use href="#i-shield"/></svg><span>Schilde</span></button>
    <button class="tab" type="button" role="tab" data-stab="throne"><svg class="icon"><use href="#i-crown"/></svg><span>Thron</span></button>
    <button class="tab" type="button" role="tab" data-stab="hd" hidden><svg class="icon"><use href="#i-coin"/></svg><span>Händler</span><span class="badge">!</span></button>
    <button class="tab" type="button" role="tab" data-stab="markt"><svg class="icon"><use href="#i-crate"/></svg><span>Markt</span></button>
  </div>
  <div class="pbody">
    <div class="mail-pane" data-spane="throne" hidden><div id="throneShop"></div></div>
    <div class="mail-pane" data-spane="hd" hidden><div class="sect"><h4 id="hdTitle">Wandernder Händler</h4><span id="hdSub" class="sect-aside"></span></div><div id="hdLive" class="hd-live"></div></div>
    <div class="mail-pane" data-spane="markt" hidden><div id="shopMarkt" class="ev-body"></div></div>
    <div class="mail-pane" data-spane="shield" hidden>
      <p class="mail-intro">Friedensschild: niemand kann deine Türme angreifen, solange er steht – Tore, Tempel und der Thron bleiben angreifbar. Greifst du selbst an, fällt der Schild sofort.</p>
      <div id="shieldState" class="notice"></div>
      <div class="sect"><h4>Kaufen</h4><span class="sect-aside">kommt in den Vorrat</span></div>
      <div class="shield-opts">
        <button type="button" class="btn btn--secondary" data-shield="2"><span>2 Std.</span><span class="cost cost--gem"><svg class="icon"><use href="#i-gem"/></svg><b>40</b></span></button>
        <button type="button" class="btn btn--secondary" data-shield="8"><span>8 Std.</span><span class="cost cost--gem"><svg class="icon"><use href="#i-gem"/></svg><b>120</b></span></button>
        <button type="button" class="btn btn--secondary" data-shield="24"><span>24 Std.</span><span class="cost cost--gem"><svg class="icon"><use href="#i-gem"/></svg><b>300</b></span></button>
      </div>
      <div class="sect"><h4>Einschalten</h4><span class="sect-aside">aus dem Vorrat</span></div>
      <div id="shieldUse" class="shield-opts"></div>
    </div>
    <div class="mail-pane" data-spane="gems">
    <article class="offer">
      <div class="offer-art"><svg class="icon"><use href="#i-shop"/></svg></div>
      <div class="offer-text">
        <h4>Ausrüstungskiste</h4>
        <p>Enthält ein zufälliges Ausrüstungsteil (Waffe, Rüstung, Schild oder Stiefel) in einer von sechs Seltenheiten.</p>
        <details class="odds-mehr"><summary><svg class="icon"><use href="#i-info"/></svg>Chancen</summary><div id="shopOdds" class="odds"><!-- JS fills from RARITY_DEFS + RARITY_DROP_WEIGHTS --></div></details>
      </div>
    </article>
    <div id="shopCrateResult" class="loot" style="display:none"></div>
    <article class="offer">
      <div class="offer-art"><svg class="icon"><use href="#i-crown"/></svg></div>
      <div class="offer-text">
        <h4>Heldenkisten</h4>
        <p>Splitter für zufällige Helden – je gewöhnlicher, desto öfter. Damit schaltest du Helden frei und wertest sie um Viertel-Sterne auf.</p>
        <div id="heroChestOpts" class="shield-opts hchest-opts"></div>
        <details class="odds-mehr"><summary><svg class="icon"><use href="#i-info"/></svg>Chancen</summary><div id="heroChestOdds" class="odds"></div></details>
      </div>
    </article>
    <div id="shopHeroResult" class="hchest-res" hidden></div>
    </div>
  </div>
  <footer class="pfoot" id="shopFoot">
    <button id="shopToEquipBtn" class="btn btn--secondary" type="button"><svg class="icon"><use href="#i-shield"/></svg><span>Ausrüstung</span></button>
    <button id="shopOpenCrateBtn" class="btn btn--primary btn--grow" type="button"><span class="lbl">Kiste öffnen</span><span class="cost cost--gem"><svg class="icon"><use href="#i-gem"/></svg><b data-const="CRATE_GEM_COST">150</b></span></button>
  </footer>
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
