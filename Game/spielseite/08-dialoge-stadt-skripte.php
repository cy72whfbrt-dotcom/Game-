// Teil 08-dialoge-stadt-skripte.php: Level-/Tages-/Belohnungs-Fenster, Hauptstadt, Heldenhalle, Insel-Fenster, Skripte

<!-- ============ LEVEL-UP MODAL ============ -->
<div id="levelUpModal" class="lvlup" role="dialog" aria-modal="true" aria-labelledby="levelUpTitle" hidden>
  <div class="lvlup-card">
    <div class="lvlup-badge"><b id="levelUpLevel">2</b></div>
    <div class="lvlup-over">Stufe erreicht</div>
    <h2 id="levelUpTitle" class="lvlup-title">Stufe 2</h2>
    <div id="levelUpSub" class="lvlup-sub"></div>
    <div class="lvlup-rule"></div>
    <div class="lvlup-label">Belohnungen</div>
    <ul id="levelUpRewards" class="lvlup-rewards"></ul>
    <div id="levelUpNext" class="lvlup-next"></div>
    <button id="levelUpBtn" class="btn btn--primary" type="button"><svg class="icon"><use href="#i-check"/></svg><span>Einsammeln</span></button>
  </div>
</div>

<!-- ============ DAILY REWARD MODAL ============ -->
<div id="welcomeModal" class="lvlup" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle" hidden>
  <div class="lvlup-card">
    <div class="lvlup-badge"><img id="welcomeCrest" class="welcome-crest" alt=""></div>
    <div class="lvlup-over">Willkommen zurück</div>
    <h2 id="welcomeTitle" class="lvlup-title">Schön, dass du da bist</h2>
    <div id="welcomeSub" class="lvlup-sub"></div>
    <div class="lvlup-rule"></div>
    <div class="lvlup-label">Während du weg warst</div>
    <ul id="welcomeList" class="lvlup-rewards"></ul>
    <button id="welcomeOkBtn" class="btn btn--primary" type="button"><svg class="icon"><use href="#i-check"/></svg><span>Weiter</span></button>
  </div>
</div>

<div id="dailyModal" class="lvlup" role="dialog" aria-modal="true" aria-labelledby="dailyModalTitle" hidden>
  <div class="lvlup-card">
    <div class="lvlup-badge"><svg class="icon" style="width:34px;height:34px;color:var(--gold-100)"><use href="#i-shop"/></svg></div>
    <div class="lvlup-over">Tägliche Belohnung</div>
    <h2 id="dailyModalTitle" class="lvlup-title">Tag 1</h2>
    <div id="dailyModalSub" class="lvlup-sub"></div>
    <div id="dailyModalDays" class="daily-days"></div>
    <div class="lvlup-rule"></div>
    <div class="lvlup-label" id="dailyModalLabel">Heute</div>
    <ul id="dailyModalRewards" class="lvlup-rewards"></ul>
    <button id="dailyModalBtn" class="btn btn--primary" type="button"><svg class="icon"><use href="#i-shop"/></svg><span>Abholen</span></button>
  </div>
</div>

<!-- ============ REWARD MODAL (boss etc.) ============ -->
<div id="titleModal" class="lvlup" role="dialog" aria-modal="true" aria-labelledby="titleModalTitle" hidden>
  <div class="lvlup-card title-card">
    <div class="lvlup-badge"><svg class="icon" style="width:34px;height:34px;color:var(--gold-100)"><use href="#i-temple"/></svg></div>
    <div class="lvlup-over">Mega-Tempel</div>
    <h2 id="titleModalTitle" class="lvlup-title">Titel</h2>
    <div id="titleModalSub" class="lvlup-sub"></div>
    <div class="lvlup-rule"></div>
    <div id="titleList" class="title-list"></div>
    <button id="titleModalBtn" class="btn btn--primary" type="button"><svg class="icon"><use href="#i-check"/></svg><span>Fertig</span></button>
  </div>
</div>
<div id="rewardModal" class="lvlup" role="dialog" aria-modal="true" aria-labelledby="rewardModalTitle" hidden>
  <div class="lvlup-card">
    <div class="lvlup-badge"><svg class="icon" style="width:34px;height:34px;color:var(--gold-100)"><use href="#i-attack"/></svg></div>
    <div class="lvlup-over">Weltereignis</div>
    <h2 id="rewardModalTitle" class="lvlup-title">Boss besiegt!</h2>
    <div id="rewardModalSub" class="lvlup-sub"></div>
    <div class="lvlup-rule"></div>
    <div class="lvlup-label">Belohnungen</div>
    <ul id="rewardModalRewards" class="lvlup-rewards"></ul>
    <button id="rewardModalBtn" class="btn btn--primary" type="button"><svg class="icon"><use href="#i-check"/></svg><span>Einsammeln</span></button>
  </div>
</div>

<!-- ============ CAPITAL / CITY VIEW ============ -->
<div id="cityView" class="city" hidden>
  <canvas id="cityCanvas" class="city-canvas" aria-label="Hauptstadt"></canvas>
  <div id="cityRing" class="city-ring" hidden></div>
  <header class="city-head">
    <div class="city-title"><div class="overline">Hauptstadt</div><h2 id="cityName">Deine Stadt</h2></div>
    <div id="cityBuilder" class="city-builder"></div>
    <button id="cityCloseBtn" class="btn btn--secondary btn--sm" type="button"><svg class="icon"><use href="#i-back"/></svg><span>Zur Karte</span></button>
  </header>
  <section id="citySheet" class="city-sheet" hidden>
    <div class="city-sheet-head">
      <div id="cityBIcon" class="city-bicon"></div>
      <div class="city-bmeta"><div id="cityBOver" class="overline">Gebäude</div><h3 id="cityBName">Burgfried</h3><div id="cityBLevel" class="city-blevel"></div></div>
      <button id="cityInfoBtn" class="btn-x city-info-btn" type="button" aria-label="Info"><svg class="icon"><use href="#i-info"/></svg></button>
      <button id="citySheetClose" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
    </div>
    <div id="cityTabs" class="seg city-tabs" hidden></div>
    <p id="cityBDesc" class="city-bdesc"></p>
    <div id="cityBNote" class="notice"></div>
    <div id="cityBStats" class="city-bstats"></div>
    <div id="cityBExtra"></div>
    <div class="city-bfoot">
      <button id="cityUpgradeBtn" class="btn btn--primary btn--grow" type="button"><svg class="icon"><use href="#i-upgrade"/></svg><span class="lbl">Aufwerten</span><small id="cityUpTime" class="city-uptime"></small></button>
      <button id="citySpeedBtn" class="btn btn--secondary btn--grow" type="button" style="display:none"><svg class="icon"><use href="#i-gem"/></svg><span class="lbl">Beschleunigen</span></button>
    </div>
  </section>
</div>

<!-- ============ HELDENHALLE: the heroes ============ -->
<section id="heroHall" class="hh" role="dialog" aria-label="Helden" hidden></section>
<section id="lookSheet" class="hh lk" role="dialog" aria-label="Aussehen" hidden>
  <div class="hh-head"><div class="emblem emblem--gold"><svg class="icon"><use href="#i-flag"/></svg></div><div class="phead-text"><div class="overline">Profil</div><h2>Aussehen</h2></div><button class="btn-x" type="button" data-lk-close aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button></div>
  <div id="lkTop" class="lk-top"></div>
  <div id="lkTabs" class="tabs lk-tabs" role="tablist">
    <button class="tab" type="button" role="tab" data-lk-tab="crest"><svg class="icon"><use href="#i-flag"/></svg><span>Wappen</span></button>
    <button class="tab" type="button" role="tab" data-lk-tab="frame"><svg class="icon"><use href="#i-star"/></svg><span>Rahmen</span></button>
    <button class="tab" type="button" role="tab" data-lk-tab="title"><svg class="icon"><use href="#i-crown"/></svg><span>Titel</span></button>
    <button class="tab" type="button" role="tab" data-lk-tab="base"><svg class="icon"><use href="#i-castle"/></svg><span>Basis</span></button>
    <button class="tab" type="button" role="tab" data-lk-tab="march"><svg class="icon"><use href="#i-troops"/></svg><span>Marsch</span></button>
  </div>
  <div id="crestPage" class="lk-pane" hidden>
    <div class="crest-ed">
      <canvas id="crestPreview" width="176" height="176" aria-label="Dein Wappen"></canvas>
      <div class="crest-opts" id="crestOpts"></div>
    </div>
    <small class="keep-note">Kostenlos. Dein Wappen weht auf allen deinen Basen, auf deiner Marschfahne und steht in der Rangliste.</small>
  </div>
  <div id="lkPane" class="lk-pane"></div>
</section>

<!-- ============ ISLAND / BASE POPUP ============ -->
<section id="islandPopup" class="panel panel--island" role="dialog" aria-labelledby="popupTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div id="popupEmblem" class="emblem emblem--neutral"><svg class="icon"><use href="#i-defense"/></svg><span id="popupLevel" class="lvl">1</span></div>
    <div class="phead-text">
      <div id="popupOverline" class="overline">Basis</div>
      <h3 id="popupTitle" class="ptitle">Turm</h3>
      <div id="popupSub" class="psub"></div>
    </div>
    <button id="closeBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div class="pbody">
    <div id="popupStats" class="popup-stats"></div>
    <div id="popupBund"></div>
    <div id="popupActions" class="actgrid">
      <button id="teleportBtn" class="act act--city" type="button" style="display:none"><span class="act-ic act-ic--city"><svg class="icon"><use href="#i-send"/></svg></span><span class="act-t">Hauptstadt verlegen</span><span class="act-s">in einen eigenen Turm · 50 Gems</span></button>
      <button id="titleBtn" class="act act--city" type="button" style="display:none"><span class="act-ic act-ic--city"><svg class="icon"><use href="#i-temple"/></svg></span><span class="act-t">Titel</span><span class="act-s">Buffs und Strafen vergeben</span></button>
      <button id="cityBtn" class="act act--city" type="button" style="display:none"><span class="act-ic act-ic--city"><svg class="icon"><use href="#i-castle"/></svg></span><span class="act-t">Stadt betreten</span><span class="act-s">Hauptstadt ausbauen</span></button>
      <button id="upgradeBtn" class="act act--primary" type="button"><span class="act-ic"><svg class="icon"><use href="#i-upgrade"/></svg></span><span class="act-t">Aufwerten</span><span class="act-s" id="upgradeCostLabel">–</span></button>
      <button id="sendBtn" class="act" type="button"><span class="act-ic act-ic--send"><svg class="icon"><use href="#i-send"/></svg></span><span class="act-t">Senden</span><span class="act-s">Verstärken</span></button>
      <button id="multiAttackBtn" class="act" type="button"><span class="act-ic act-ic--attack"><svg class="icon"><use href="#i-multiattack"/></svg></span><span class="act-t">Mehrfach</span><span class="act-s"><svg class="icon icon--gem"><use href="#i-gem"/></svg><b data-const="MULTI_ATTACK_GEM_COST">1</b> Gem</span></button>
      <button id="recallBtn" class="act" type="button"><span class="act-ic act-ic--recall"><svg class="icon"><use href="#i-recall"/></svg></span><span class="act-t">Sammeln</span><span class="act-s"><svg class="icon icon--gem"><use href="#i-gem"/></svg><b data-const="RECALL_GEM_COST">1</b> Gem</span></button>
    </div>
  </div>
  <footer class="pfoot">
    <button id="backBtn" class="btn btn--secondary" type="button"><svg class="icon"><use href="#i-back"/></svg><span>Zurück</span></button>
    <button id="scoutBtn" class="btn btn--secondary btn--grow" type="button"><svg class="icon"><use href="#i-scout"/></svg><span class="lbl">Spähen</span></button>
    <button id="attackBtn" class="btn btn--danger btn--grow" type="button"><svg class="icon"><use href="#i-attack"/></svg><span class="lbl">Angreifen</span></button>
  </footer>
</section>

    <script defer src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js" integrity="sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O" crossorigin="anonymous"></script><!-- 3D bases: deferred, so a slow or missing network never holds the game up -->
    <script defer src="baukunst.js?v=<?= v('baukunst.js') ?>"></script>
    <script src="bots.js?v=<?= v('bots.js') ?>"></script>
    <script src="welt.js?v=<?= v('welt.js') ?>"></script>
    <script src="spiel.js?v=<?= v('spiel.js') ?>"></script>
    <script src="aufbau.js?v=<?= v('aufbau.js') ?>"></script>
    <script src="buendnis.js?v=<?= v('buendnis.js') ?>"></script>
    <script src="haendler.js?v=<?= v('haendler.js') ?>"></script>
    <script src="benachrichtigung.js?v=<?= v('benachrichtigung.js') ?>"></script>
</body>
</html>
