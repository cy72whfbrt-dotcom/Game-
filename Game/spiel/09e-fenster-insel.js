// Teil 09e-fenster-insel.js: Fenster öffnen und schließen, Insel-Fenster, Mehrfach-Angriff
const popup = document.getElementById('islandPopup');
const popupTitle = document.getElementById('popupTitle');
const popupStats = document.getElementById('popupStats');
const upgradeBtn = document.getElementById('upgradeBtn');
const sendBtn = document.getElementById('sendBtn');
const attackBtn = document.getElementById('attackBtn');
const multiAttackBtn = document.getElementById('multiAttackBtn');
const recallBtn = document.getElementById('recallBtn');
const scoutBtn = document.getElementById('scoutBtn');
const backBtn = document.getElementById('backBtn');
const closeBtn = document.getElementById('closeBtn');
const multiAttackBar = document.getElementById('multiAttackBar');
const multiAttackLabel = document.getElementById('multiAttackLabel');
const multiAttackConfirmBtn = document.getElementById('multiAttackConfirmBtn');
const multiAttackCancelBtn = document.getElementById('multiAttackCancelBtn');
let popupIslandId = null;
// 'menu' lists the available actions for the tapped island; 'upgrade'
// and 'preview' (attack) are the preview+confirm screens.
let popupView = 'menu', popupFramedView = null;
let previewSourceId = null; // base picked for an attack awaiting confirmation
let previewAttackTroops = null; // how many of the source base's troops to send - adjustable via the slider, defaults to all of them
let previewFraction = 1;        // share of the garrison picked via "Alle"/25-75 % (follows the growing garrison); null after a manual slider drag
let previewShownAt = 0; // guards against a stray click landing on the
                         // confirm button the instant the preview opens

// the keyboard handler uses this: map shortcuts only fire while focus is on the page or the canvas
function isUiElement(target) {
  return !!(target && target.closest && target.closest(
    '#islandPopup,#bundPopup,#hud,#cornerButtons,#profilePopup,#rulerPopup,#rankPopup,#battleLogPopup,#goalsPopup,#shopPopup,#rucksackPopup,#chestItemPopup,#multiAttackBar,#mapControls,#uiScrim,#uiScrimTop,#midBar'));
}
const PANEL_NAV = { bundPopup: 'bundBtn', profilePopup: 'profileBtn', battleLogPopup: 'battleLogBtn', goalsPopup: 'goalsBtn', rucksackPopup: 'rucksackBtn', shopPopup: 'shopBtn' };   // das Dock zeigt, welches Fenster offen ist
function isPanelOpen(el) { return el.classList.contains('is-open'); }
function openPanel(el) { el.style.removeProperty('display'); el.classList.add('is-open'); syncPanelState(); }
function closePanel(el) { el.classList.remove('is-open'); syncPanelState(); }
function syncPanelState() {
  const open = [...document.querySelectorAll('.panel.is-open')];
  const sheet = open.some(p => p.classList.contains('panel--sheet'));
  const item = isPanelOpen(chestItemPopup);
  document.body.classList.toggle('has-panel', open.length > 0);
  document.body.classList.toggle('has-sheet', sheet);
  document.body.classList.toggle('has-item', item);
  document.getElementById('uiScrim').hidden = !sheet;
  document.getElementById('uiScrimTop').hidden = !item;
  for (const [pid, bid] of Object.entries(PANEL_NAV))
    document.getElementById(bid).classList.toggle('active', isPanelOpen(document.getElementById(pid)));
  if (open.length) dismissTutorialHint();
  requestRender();                       // selection ring / popover follow
}
function closeTopmostPanel() {           // scrim click + Escape
  if (closeWelcome()) { maybeShowDaily(); return; }
  if (closeLevelUpModal()) return;
  if (closeDailyModal()) return;                                                  // the modals lie above the full-screen sheets and the town
  if (!document.getElementById('rewardModal').hidden) { document.getElementById('rewardModalBtn').click(); return; }
  if (!document.getElementById('titleModal').hidden) { document.getElementById('titleModal').hidden = true; return; }
  if (!document.getElementById('lookSheet').hidden) return closeLookSheet();      // the full-screen sheets lie above everything else
  if (!document.getElementById('heroHall').hidden) return closeHeroHall();
  if (!barbSheetEl.hidden) return closeBarbSheet();
  if (fieldSheetId) return closeFieldSheet();
  if (!document.getElementById('armySheet').hidden) return closeArmySheet();
  if (!document.getElementById('markerSheet').hidden) return closeMarkerSheet();
  if (!document.getElementById('citySheet').hidden && !cityView.hidden) { document.getElementById('citySheetClose').click(); return; }
  if (closeCity()) return;
  if (isPanelOpen(chestItemPopup)) return chestItemCloseBtn.click();
  if (isPanelOpen(popup)) return closeBtn.click();
  for (const [pid, closeId] of [['bundPopup','bundCloseBtn'],['rulerPopup','rulerCloseBtn'],['rankPopup','rankCloseBtn'],['profilePopup','profileCloseBtn'],['battleLogPopup','battleLogCloseBtn'],['goalsPopup','goalsCloseBtn'],['shopPopup','shopCloseBtn'],['rucksackPopup','rucksackCloseBtn']])
    if (isPanelOpen(document.getElementById(pid))) return document.getElementById(closeId).click();
  if (multiAttackMode) return multiAttackCancelBtn.click();
}
document.getElementById('uiScrim').addEventListener('click', closeTopmostPanel);
document.getElementById('uiScrimTop').addEventListener('click', closeTopmostPanel);

// Panels are exclusive: opening one closes the others first, so no
// hidden panel keeps live state (e.g. an open attack preview) underneath.
function closeAllPopups() {
    closePanel(popup);
    { const bp = document.getElementById('bundPopup'); if (bp && isPanelOpen(bp)) document.getElementById('bundCloseBtn').click(); }   // (Bündnis, buendnis.js)
    popupStats.dataset.preview = '';
    popupIslandId = null;
    popupView = 'menu';
    previewSourceId = null;
    previewAttackTroops = null;
    closePanel(profilePopup);
    closePanel(battleLogPopup);
    clearInterval(battleLogRefreshTimer);
    closePanel(document.getElementById('goalsPopup'));
    closePanel(shopPopup);
    closePanel(document.getElementById('rucksackPopup'));
    closePanel(document.getElementById('rulerPopup'));
    closePanel(document.getElementById('rankPopup'));
    if (!document.getElementById('lookSheet').hidden) closeLookSheet();
    if (!document.getElementById('heroHall').hidden) closeHeroHall();
    if (!barbSheetEl.hidden) closeBarbSheet();
    if (fieldSheetId) closeFieldSheet();                                   // the small map sheets lie above the panels: never leave one on top of a new sheet or the town
    if (!document.getElementById('armySheet').hidden) closeArmySheet();
    if (!document.getElementById('markerSheet').hidden) closeMarkerSheet();
    closePanel(chestItemPopup);
    chestDetailItemId = null;
    chestSelectedIds.clear();
}

function openIslandPopup(island) {
    if (island && island.type === 'gate' && passOpensAt(bridgeOfGate(island)) > Date.now()) { flashHint('Der Pass ist noch verschlossen – er öffnet in ' + fmtPassWait(passOpensAt(bridgeOfGate(island)) - Date.now()) + '.', 3500); return; }   // (Pass mit Countdown: nur der Hinweis)
    if (island && !islandSeen(island) && islandOwnerOf(island.id) !== 'player') { flashHint('Dieses Gebiet liegt im Nebel – schick zuerst einen Späher.', 3000); return; }
    closeAllPopups();
    popupIslandId = island.id;
    popupView = 'menu';
    renderPopup();
}

function closeIslandPopup() {
    closePanel(popup);
    popupStats.dataset.preview = '';
    popupIslandId = null;
    popupView = 'menu';
    previewSourceId = null;
    previewAttackTroops = null;
}

function hideAllButtons() {
    upgradeBtn.style.display = 'none';
    sendBtn.style.display = 'none';
    attackBtn.style.display = 'none';
    multiAttackBtn.style.display = 'none';
    recallBtn.style.display = 'none';
    scoutBtn.style.display = 'none';
    backBtn.style.display = 'none';
}

// Multi-Angriff: pick one of YOUR OWN bases, then tap any number of
// enemy/neutral bases on the map to select them as targets, then
// confirm once to launch all of them at the same time (troops
// split evenly across the chosen targets). Costs 1 gem per use.
const MULTI_ATTACK_GEM_COST = 1;
// "Truppen sammeln": for 1 gem, pulls every OTHER owned base within
// this radius (world units) that still has troops back home to the
// tapped base in one go - each one marches individually via the
// normal launchSend (own travel time, no instant teleport).
const RECALL_RADIUS = 8000;
const RECALL_GEM_COST = 1;
let multiAttackMode = false;
let multiAttackSourceId = null;
let multiAttackTargets = [], multiAttackShare = 1;       // share of the base's troops that goes, split over the targets
let multiAttackHero = null, multiAttackHero2 = null;                               // a hero leads the first wave

function updateMultiAttackBar() {
    const n = multiAttackTargets.length, go = Math.floor((islandTroops[multiAttackSourceId] || 0) * multiAttackShare);
    setText(multiAttackLabel, n ? n + (n === 1 ? ' Ziel' : ' Ziele') + ' · je ' + fmtCompact(Math.floor(go / n)) + ' Truppen' : '0 Ziele ausgewählt · Basen antippen');   // (live: liveTick, die Truppen wachsen)
    for (const b of document.querySelectorAll('#multiAttackShare button')) b.classList.toggle('on', parseFloat(b.dataset.f) === multiAttackShare);
    const hb = document.getElementById('multiAttackHero');
    if (multiAttackHero && (!heroOwned('player', multiAttackHero) || heroBusy('player', multiAttackHero))) multiAttackHero = null;
    const seg = heroSegHtml('data-mhero', multiAttackHero); hb.hidden = !seg; liveHtml(hb, seg);
    const hb2 = document.getElementById('multiAttackHero2'); multiAttackHero2 = heroZweitOk('player', multiAttackHero, multiAttackHero2);   // der Zweitheld
    if (hb2) { const s2 = heroSeg2Html('data-mhero2', multiAttackHero, multiAttackHero2); hb2.hidden = !s2; liveHtml(hb2, s2); }
    multiAttackConfirmBtn.disabled = multiAttackTargets.length === 0;
}

function startMultiAttack(sourceId) {
    multiAttackMode = true;
    multiAttackSourceId = sourceId;
    multiAttackTargets = []; multiAttackShare = 1; [multiAttackHero, multiAttackHero2] = heroLetzte();
    multiAttackBar.style.display = 'flex';
    document.body.classList.add('is-multi');
    updateMultiAttackBar();
    flashHint('Mehrfachangriff: Ziele antippen, dann „Angriffe starten“.');
}

function cancelMultiAttack() {
    multiAttackMode = false;
    multiAttackSourceId = null;
    multiAttackTargets = [];
    multiAttackBar.style.display = 'none';
    document.body.classList.remove('is-multi');
    hintEl.textContent = defaultHint; hintEl.classList.remove('toast--lang');
}

multiAttackCancelBtn.addEventListener('click', cancelMultiAttack);
document.getElementById('multiAttackHero').addEventListener('click', e => { const bt = e.target.closest('button[data-mhero]:not([disabled])'); if (!bt) return; multiAttackHero = bt.dataset.mhero || null; updateMultiAttackBar(); });
document.getElementById('multiAttackHero2').addEventListener('click', e => { const bt = e.target.closest('button[data-mhero2]:not([disabled])'); if (!bt) return; multiAttackHero2 = bt.dataset.mhero2 || null; updateMultiAttackBar(); });
document.getElementById('multiAttackShare').addEventListener('click', e => {
    const bt = e.target.closest('button[data-f]'); if (!bt) return;
    multiAttackShare = parseFloat(bt.dataset.f); updateMultiAttackBar();
});

multiAttackConfirmBtn.addEventListener('click', () => {
    const sourceId = multiAttackSourceId;
    const targets = multiAttackTargets.slice();
    if (sourceId === null || targets.length === 0) return;
    if (gems < MULTI_ATTACK_GEM_COST) {
        flashHint('Nicht genug Edelsteine für den Mehrfachangriff.', 3000);
        return;
    }
    const available = Math.floor((islandTroops[sourceId] || 0) * multiAttackShare);
    if (available < targets.length) {
        flashHint('Nicht genug Truppen, um so viele Ziele gleichzeitig anzugreifen.', 3000);
        return;
    }

    const perTarget = Math.floor(available / targets.length);
    let remainder = available - perTarget * targets.length, ok = 0;
    const failed = [], why = new Set();                                      // the reasons the refused launches had
    if (!marschPlatz('player')) return;                                       // ein Mehrfachangriff braucht EINEN freien Marsch-Platz
    naechsteGruppe = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    for (const targetId of targets) {
        let troopsForThis = perTarget;
        if (remainder > 0) { troopsForThis++; remainder--; }
        nextAttackHero = ok === 0 ? multiAttackHero : null; nextAttackHero2 = ok === 0 ? multiAttackHero2 : null;   // the heroes lead the first wave that goes out
        if (launchAttack(sourceId, targetId, null, troopsForThis)) { if (!ok) heroLetzteMerken(multiAttackHero, multiAttackHero2); ok++; }
        else { failed.push(targetId); why.add(baseShieldedFor(targetId, 'player') ? 'Friedensschild' : isCapital(targetId) ? 'inzwischen eine Hauptstadt' : 'Tor oder Maut'); }
        nextAttackHero = null; nextAttackHero2 = null;
    }
    naechsteGruppe = null;
    if (!ok) {                                                               // nothing went out: no gem spent, the selection stays so the player can fix it
        const only = failed.length === 1 && why.has('Friedensschild') ? shieldBlockText(islandOwnerOf(failed[0])) : null;
        flashHint(only || 'Kein Angriff gestartet – ' + (failed.length === 1 ? 'das Ziel ist' : 'die Ziele sind') + ' gerade nicht erreichbar (' + [...why].map(w => w === 'Tor oder Maut' ? 'geschlossenes Tor oder zu wenig Münzen für die Maut' : w).join(', ') + ').', 4500);
        return;
    }
    gems -= MULTI_ATTACK_GEM_COST;
    saveGame();
    saveProgression();
    updateHud();
    cancelMultiAttack();                                                     // (first: it resets the hint line)
    flashHint(failed.length ? ok + ' von ' + targets.length + ' Angriffen gestartet – ' + failed.length + ' kam' + (failed.length === 1 ? '' : 'en') + ' nicht durch (' + [...why].join(', ') + ').' : ok + ' Angriffe gleichzeitig gestartet.', 4000);
});

