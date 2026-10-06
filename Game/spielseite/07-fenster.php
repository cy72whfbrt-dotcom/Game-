// Teil 07-fenster.php: Fenster: Profil, Kampfbericht, Herrscher, Bündnis, Rangliste, Events, Shop, Gegenstand

<!-- ============ PROFILE ============ -->
<section id="profilePopup" class="panel panel--sheet" role="dialog" aria-labelledby="profileName" data-tab="info">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead phead--hero">
    <div id="pAvatarRing" class="avatar-ring"><span class="avatar"><svg class="icon"><use href="#i-profile"/></svg></span><span id="profileLevelBadge" class="lvl">1</span></div>
    <div class="phead-text">
      <div class="overline">Profil · Rang <b id="profileRank">Bronze</b></div>
      <input id="profileName" class="ptitle ptitle--input" type="text" maxlength="20" placeholder="Dein Name" autocomplete="off" spellcheck="false">
      <div class="xp"><span class="xp-l">Stufe <b id="xpLevelNum">1</b></span><div class="xp-track"><i id="xpFill" class="xpFill"></i></div><span id="xpNums" class="xp-n">0 / 50 XP</span></div>
      <div id="xpNext" class="xp-next"></div>
      <div id="profileTitle" class="ptitle-tag"></div>
    </div>
    <button id="profileCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="profileTabs" class="tabs" role="tablist">
    <button id="tabBtnInfo" class="tab active" type="button" role="tab"><svg class="icon"><use href="#i-profile"/></svg><span>Spieler</span></button>
    <button id="tabBtnEquip" class="tab" type="button" role="tab"><svg class="icon"><use href="#i-shield"/></svg><span>Ausrüstung</span></button>
    <button id="tabBtnSkills" class="tab" type="button" role="tab"><svg class="icon"><use href="#i-star"/></svg><span>Fähigkeiten</span></button>
    <button id="tabBtnRank" class="tab" type="button" role="tab"><svg class="icon"><use href="#i-rank"/></svg><span>Rangliste</span></button>
    <button id="tabBtnSet" class="tab" type="button" role="tab"><svg class="icon"><use href="#i-gear"/></svg><span>Einstellungen</span></button>
  </div>
  <div class="pbody">
    <div id="tabInfo" class="profileTabPanel active" role="tabpanel">
      <!-- Aussehen: nur hier (Wappen, Rahmen, Titel, Basis- und Marsch-Skins, Ringe) -->
      <button id="crestCard" class="crest-card" type="button" aria-label="Aussehen: Wappen, Rahmen, Titel, Skins, Ringe">
        <canvas id="crestSmall" width="112" height="112"></canvas>
        <span id="lookNow" class="crest-card-t"><b>Aussehen</b><small>Wappen, Rahmen, Titel, Skins, Ringe</small></span>
        <span class="crest-card-go">Ändern<svg class="icon"><use href="#i-upgrade"/></svg></span>
      </button>
      <div class="sect"><h4>Reich</h4></div>
      <div class="stat-grid stat-grid--3">
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-troops"/></svg>Truppen</span><b class="stat-v" id="kTroops">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-flag"/></svg>Basen</span><b class="stat-v" id="kBases">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-coin"/></svg>Münzen</span><b class="stat-v" id="kCoins">0</b></div>
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
      <div class="sect"><h4>Benachrichtigungen</h4></div>
      <div id="pushKarte" class="push-karte">
        <p id="pushText" class="push-text">Einen Moment …</p>
        <button id="pushKnopf" class="btn btn--secondary btn--sm" type="button" hidden></button>
        <div id="pushArten" class="set-liste" hidden>
          <label class="set-zeile"><span>Angriff auf deine Basis</span><input type="checkbox" data-push-art="angriff"></label>
          <label class="set-zeile"><span>Späher bei dir<small>unterwegs zu dir und „hat deine Basis ausgespäht“</small></span><input type="checkbox" data-push-art="spaeher"></label>
          <label class="set-zeile"><span>Basis verloren</span><input type="checkbox" data-push-art="verloren"></label>
          <label class="set-zeile"><span>Kriegsherr erschienen</span><input type="checkbox" data-push-art="boss"></label>
          <label class="set-zeile"><span>Sammler zurück</span><input type="checkbox" data-push-art="sammler"></label>
          <label class="set-zeile"><span>Friedensschild läuft ab</span><input type="checkbox" data-push-art="schild"></label>
          <label class="set-zeile"><span>Barbaren-Invasion beginnt<small>10 Minuten vorher</small></span><input type="checkbox" data-push-art="invasion"></label>
          <label class="set-zeile"><span>Der Drache ist erschienen<small>Sonntagabend</small></span><input type="checkbox" data-push-art="drache"></label>
          <label class="set-zeile"><span>Bündnis ruft um Hilfe</span><input type="checkbox" data-push-art="hilfe"></label>
          <label class="set-zeile"><span>Rally gegen dich</span><input type="checkbox" data-push-art="rally"></label>
          <label class="set-zeile"><span>Ein Händler ist da<small>Wandernder Händler auf der Karte</small></span><input type="checkbox" data-push-art="haendler"></label>
        </div>
      </div>
      <div class="sect"><h4>Ton</h4></div>
      <div id="setTon" class="set-wahl" role="radiogroup" aria-label="Ton">
        <button type="button" data-ton="all"><svg class="icon"><use href="#i-sound"/></svg>Musik + Effekte</button>
        <button type="button" data-ton="sfx"><svg class="icon"><use href="#i-sfx"/></svg>Nur Effekte</button>
        <button type="button" data-ton="off"><svg class="icon"><use href="#i-mute"/></svg>Aus</button>
      </div>
      <div class="sect"><h4>Grafik</h4></div>
      <div class="set-liste">
        <label class="set-zeile"><span>Akku sparen<small>Karte ruhiger, weniger Bilder pro Sekunde</small></span><input type="checkbox" id="setAkku"></label>
      </div>
      <div class="sect"><h4>Konto</h4></div>
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
      <div class="sect"><h4>Hilfe – wo finde ich was?</h4></div>
      <div class="set-hilfe">
        <p><b>Stadt</b> → Burg (deine Hauptstadt-Stufe), Gebäude, Holz/Stein/Eisen, Forschung, Krankenhaus, Helden.</p>
        <p><b>Bündnis</b> → zusammen mit anderen: Chat, Rally, Verstärkung, Bündnis-Hilfe, Tempel-Bonus.</p>
        <p><b>Kampf</b> → deine Märsche und alle Berichte.</p>
        <p><b>Events</b> → Aufgaben, Belohnungen, Erfolge, Pass, Wochen-Event, Invasion, Drache, Tagesboss und Lager.</p>
        <p><b>Shop</b> → Kisten, Friedensschilde, Thron-Shop, Händler, Markt.</p>
        <p><b>Profil</b> → Spieler, Aussehen, Ausrüstung, Fähigkeiten, Rangliste, Einstellungen.</p>
        <p><b>Karte</b> → Basis antippen: angreifen, Truppen senden, aufwerten. Felder: sammeln. Mitte: wer den Mega-Tempel hält, herrscht.</p>
      </div>
      <div class="set-knoepfe"><button id="anleitungNochmal" class="btn btn--secondary btn--sm" type="button">Anleitung noch mal</button></div>
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
  <div class="pbody">
    <div class="sect"><h4>Unterwegs</h4></div>
    <div id="activeMarches" class="logList"></div>
    <div class="sect"><h4>Kampflog</h4></div>
    <div id="combatLogList" class="logList"></div>
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
  <div class="pbody"><div id="bundOben"></div><div id="bundLive" class="bd-live"></div></div>
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
    <button class="tab" type="button" role="tab" data-rtab="titles"><svg class="icon"><use href="#i-crown"/></svg><span>Titel</span></button>
    <button class="tab" type="button" role="tab" data-rtab="week"><svg class="icon"><use href="#i-points"/></svg><span>Thron-Punkte</span></button>
  </div>
  <div class="pbody" id="rankBody"></div>
  <footer class="pfoot lb-foot" id="rankFoot"></footer>
</section>

<!-- ============ EVENTS (Dock): oben Aufgaben (Täglich, Belohnung + Abholfach, Erfolge, Pass), unten Ereignisse
     (Wochen-Event, Invasion, Drache, Tagesboss + Barbaren-Lager) – alles nur hier ============ -->
<section id="goalsPopup" class="panel panel--sheet" role="dialog" aria-labelledby="goalsTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><svg class="icon"><use href="#i-event"/></svg></div>
    <div class="phead-text"><div class="overline">Aufgaben &amp; Ereignisse</div><h3 id="goalsTitle" class="ptitle">Events</h3><div class="psub" id="goalsSub"></div></div>
    <button id="goalsCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="goalsTabs" class="tabs mail-tabs" role="tablist">
    <button class="tab active" type="button" role="tab" data-gtab="daily"><svg class="icon"><use href="#i-flag"/></svg><span>Täglich</span><span class="badge" data-gbadge="daily" style="display:none">0</span></button>
    <button class="tab" type="button" role="tab" data-gtab="reward"><svg class="icon"><use href="#i-shop"/></svg><span>Belohnung</span><span class="badge" data-gbadge="reward" style="display:none">0</span></button>
    <button class="tab" type="button" role="tab" data-gtab="ach"><svg class="icon"><use href="#i-star"/></svg><span>Erfolge</span><span class="badge" data-gbadge="ach" style="display:none">0</span></button>
    <button class="tab" type="button" role="tab" data-gtab="pass"><svg class="icon"><use href="#i-crown"/></svg><span>Pass</span><span class="badge" data-gbadge="pass" style="display:none">0</span></button>
    <button class="tab" type="button" role="tab" data-gtab="tour"><svg class="icon"><use href="#i-rank"/></svg><span>Wochen-Event</span><span class="badge" data-gbadge="tour" style="display:none">!</span></button>
    <button class="tab" type="button" role="tab" data-gtab="inv"><svg class="icon"><use href="#i-defense"/></svg><span>Invasion</span><span class="badge" data-gbadge="inv" style="display:none">!</span></button>
    <button class="tab" type="button" role="tab" data-gtab="drache"><svg class="icon"><use href="#i-attack"/></svg><span>Drache</span><span class="badge" data-gbadge="drache" style="display:none">!</span></button>
    <button class="tab" type="button" role="tab" data-gtab="boss"><svg class="icon"><use href="#i-event"/></svg><span>Boss &amp; Lager</span></button>
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
        <div id="shopOdds" class="odds"><!-- JS fills from RARITY_DEFS + RARITY_DROP_WEIGHTS --></div>
      </div>
    </article>
    <div id="shopCrateResult" class="loot" style="display:none"></div>
    <article class="offer">
      <div class="offer-art"><svg class="icon"><use href="#i-crown"/></svg></div>
      <div class="offer-text">
        <h4>Heldenkisten</h4>
        <p>Splitter für zufällige Helden – je gewöhnlicher, desto öfter. Damit schaltest du Helden frei und wertest sie um Viertel-Sterne auf.</p>
        <div id="heroChestOdds" class="odds"></div>
        <div id="heroChestOpts" class="shield-opts hchest-opts"></div>
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
