// ===== Teil 10-start.js: Fenster-Start, Ladebild, Musik, Einstellungen, Live-Anzeige, Verbindung zur Welt (Weltrechner-Befehle, Schummel-Schutz) =====
// ===== UI boot (design-spec §4.4): constants into the markup, shop odds,
// HUD shortcuts, first-launch toast, player plate =====
for (const el of document.querySelectorAll('[data-const]'))
    el.textContent = fmtNum({ CRATE_GEM_COST, MULTI_ATTACK_GEM_COST, RECALL_GEM_COST }[el.dataset.const]);
document.getElementById('shopOdds').innerHTML = RARITY_DEFS.map((rd, i) => RARITY_DROP_WEIGHTS[i] > 0 ?
    '<span class="chip chip--rar" data-r="' + rd.key + '">' + rd.label + ' ' + RARITY_DROP_WEIGHTS[i].toLocaleString('de-DE') + ' %</span>' : '').join('') +
    '<span class="chip chip--rar">' + RARITY_DEFS[4].label + ' + ' + RARITY_DEFS[5].label + ': nur durch Zusammenlegen</span>';
// HUD shortcuts only ever open (the nav buttons toggle)
document.getElementById('hudPlayer').addEventListener('click', () => { if (!isPanelOpen(profilePopup)) profileBtn.click(); });
try {
    if (!store.get('openWaterTutorialSeen')) {
        afterSplash(() => flashHint(TUTORIAL_HINT, 7000));
        store.set('openWaterTutorialSeen', '1');
    }
} catch (e) {}
updateHudPlayer();

// Renders whichever screen (menu or the upgrade preview) is
// currently active - never performs any game action itself.
// Temples/Mega-Tempel get their own name instead of "Turm #N" -
// regular towers keep the numbering players already know.
function islandTitle(island) {
    const boss = bossAt(island.id); if (boss) return boss.name;
    if (island.type === 'megaTemple') return 'Mega-Tempel';
    if (island.guardian) return 'Wächter-Tempel';
    if (island.type === 'temple') return 'Tempel';
    if (island.type === 'gate') return island.gateKind === 'throne' ? 'Thron-Tor' : island.gateKind === 'guardian' ? 'Wächter-Tor' : 'Grenztor';
    if (island.id === playerIslandId) return 'Hauptstadt';
    for (const bot of BOT_DEFS) if (botCapitalOf(bot.id) === island.id) return 'Hauptstadt von ' + bot.name;
    return 'Turm #' + (island.id + 1);
}

function gateControlsHtml(gate) {
    const cfg = gateSettings(gate);
    return '<div class="gate-ctl"><div class="gate-row"><span class="stat-l">' + icon('coin') + 'Maut pro Truppe</span><div class="seg">' +
        GATE_TOLLS.map(v => '<button type="button" data-toll="' + v + '" class="' + (cfg.toll === v ? 'is-on' : '') + '">' + (v ? v.toLocaleString('de-DE') : 'frei') + '</button>').join('') + '</div></div>' +
        '<button type="button" data-gate-toggle class="btn ' + (cfg.closed ? 'btn--primary' : 'btn--secondary') + ' btn--grow">' + icon('lock') + '<span>' + (cfg.closed ? 'Tor öffnen' : 'Tor schließen') + '</span></button>' +
        '<p class="gate-note">' + (cfg.closed ? 'Geschlossen: niemand sonst kommt über die Brücke – nur wer das Tor erobert.' : 'Offen: andere zahlen die Maut an dich – höchstens 1 Mio. Münzen pro Marsch.') + '</p></div>';
}
popupStats.addEventListener('click', e => {
    const isl = islandById[popupIslandId]; if (!isl || isl.type !== 'gate' || !ownedIslands.has(isl.id)) return;
    const t = e.target.closest('[data-toll]'), tg = e.target.closest('[data-gate-toggle]');
    if (t) { setGateSettings(isl.id, { toll: +t.dataset.toll }); alsBefehl('tor', { tor: isl.id, patch: { toll: +t.dataset.toll } }); flashHint('Maut: ' + (+t.dataset.toll ? (+t.dataset.toll).toLocaleString('de-DE') + ' Münzen pro Truppe' : 'frei') + '.', 2200); }
    else if (tg) { const c = !gateSettings(isl).closed; setGateSettings(isl.id, { closed: c }); alsBefehl('tor', { tor: isl.id, patch: { closed: c } }); flashHint(c ? 'Tor geschlossen.' : 'Tor geöffnet.', 2000); }
    else return;
    openIslandPopup(isl); requestRender();
});
function ringNotice(isl) {                         // whose ring is it: a title from the middle or a bought Ring-Skin
    if (isl.type !== 'tower') return '';
    const o = islandOwnerOf(isl.id), st = o ? ringStatusByOwner().get(o) : null; if (!st) return '';
    const me = o === 'player', n = me ? '' : escapeHtml(botById[o].name), t = titleOf(o);
    const txt = st.k === 'ruler' ? (me ? 'Blutrot-goldener Ring: Du bist Herrscher der Meere – er bleibt, solange du den Mega-Tempel hältst.' : 'Blutrot-goldener Ring: ' + n + ' ist Herrscher der Meere.')
        : st.k === 'good' ? (me ? 'Goldring: Du trägst den Titel „' + t.name + '“ – solange du ihn behältst.' : 'Goldring: ' + n + ' trägt den Titel „' + t.name + '“ aus der Mitte.')
        : st.k === 'bad' ? (me ? 'Roter Ring: Du trägst den Straf-Titel „' + t.name + '“ – solange er gilt.' : 'Roter Ring: ' + n + ' trägt den Straf-Titel „' + t.name + '“.')
        : (me ? 'Ring „' + st.name + '“ – wechseln unter „Aussehen“.' : 'Ring „' + st.name + '“.');
    return '<div class="notice' + (st.k === 'bad' ? ' notice--warn' : st.k === 'skin' ? '' : ' notice--gold') + '">' + icon(st.k === 'ruler' ? 'crown' : st.k === 'bad' ? 'losses' : 'star') + '<span>' + txt + '</span></div>';
}
function throneNotice(island) {                   // your own throne or Wächter-Tempel: points and fire at a glance
    if (island.type === 'megaTemple') { const sh = throneShooters().length;
        return '<div class="notice ' + (sh ? 'notice--warn' : 'notice--gold') + '">' + icon('crown') + '<span>+' + throneIncome('player') + ' Thron-Punkte alle 3 Min. · ' +
            (sh ? sh + (sh === 1 ? ' Wächter-Tempel feuert' : ' Wächter-Tempel feuern') + ' in <b data-throne-fire>' + fmtClock((throneState.nextFire - Date.now()) / 1000) + '</b> (je ' + THRONE_FIRE_PCT + ' % der Truppen hier)' : 'alle Wächter-Tempel gehören dir – kein Beschuss') + '</span></div>'; }
    if (island.guardian) return '<div class="notice notice--gold">' + icon('crown') + '<span>+' + THRONE_PTS_GUARD + ' Thron-Punkte alle 3 Min. ' + (rulerOwner() === 'player' ? 'Dieser Tempel feuert nicht auf deinen Thron.' : 'Hältst du den Thron, feuert er nicht auf dich.') + '</span></div>';
    return '';
}
function templeBonusLine(island) {
    const mult = templeBaseMult(island) * templeHoldMultiplier(island.id) * shrineMult('player');
    const heldSince = templeHoldSince[island.id];
    const heldMin = heldSince ? Math.floor((Date.now() - heldSince) / 60000) : 0;
    return '<div class="notice notice--gold">' + icon('gem') + '<span>+' +
        fmtNum(TEMPLE_GEMS_PER_TICK * mult * 3600000 / productionTickMs()) + ' Gems pro Stunde · +' +
        fmtNum(TEMPLE_COIN_BONUS_PER_TICK * mult) + ' Münzen · +' + fmtNum(TEMPLE_TROOP_BONUS_PER_TICK * mult) + ' Truppen pro Tick' +
        (heldSince ? ' · gehalten seit ' + heldMin + ' Min. (×' +
            templeHoldMultiplier(island.id).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ')' : '') + '</span></div>';
}

const popupEmblem = document.getElementById('popupEmblem');
const popupLevel = document.getElementById('popupLevel');
const popupOverline = document.getElementById('popupOverline');
const popupSub = document.getElementById('popupSub');
const popupActions = document.getElementById('popupActions');
const upgradeCostLabel = document.getElementById('upgradeCostLabel');

// Presentation rewrite (design-spec §4.5). Which buttons show, when
// they are disabled, and what is visible without scouting (fog of
// war) are exactly the old rules.
// Koordinaten like in the big strategy games: X and Y from 0 to 1200 across the world, the Mega-Tempel at X 600 · Y 600
function coordText(x, y) { const k = (GRID_HALF + .5) * HEX_SPACING, f = 1200 / (2 * k); return 'X ' + Math.round((x + k) * f) + ' · Y ' + Math.round((y + k) * f); }
function renderPopup() {
    const island = islandById[popupIslandId];
    if (!island) return;
    hideAllButtons();
    const isOwned = ownedIslands.has(island.id);
    const owner = islandOwnerOf(island.id);
    const ownerBot = owner && owner !== 'player' ? botById[owner] : null;
    const isTemple = island.type === 'temple' || island.type === 'megaTemple';
    const level = islandLevels[island.id] || 1;
    const kind = isOwned ? 'player' : ownerBot ? 'enemy' : 'neutral';
    const sep = '<span class="sep"></span>';
    const isBoss = !!bossAt(island.id);
    let subH = '';                                   // (Kopfzeile und Werte: jede Sekunde neu gerechnet aus liveTick, geschrieben nur bei einer Änderung)
    popupEmblem.className = 'emblem emblem--' + (isBoss ? 'enemy' : kind);
    popupEmblem.querySelector('use').setAttribute('href', '#i-' + (isBoss ? 'attack' : isTemple ? 'temple' : isOwned ? 'profile' : ownerBot ? 'bot' : 'question'));
    if (owner && !isBoss) { popupEmblem.dataset.profile = owner; popupEmblem.setAttribute('role', 'button'); popupEmblem.title = 'Profil ansehen'; }   // das Viereck antippen → Profil (mit Bündnis)
    else { delete popupEmblem.dataset.profile; popupEmblem.removeAttribute('role'); popupEmblem.removeAttribute('title'); }
    popupLevel.textContent = anzeigeStufe(island.id);
    popupTitle.textContent = islandTitle(island);
    popupActions.hidden = true;
    document.getElementById('cityBtn').style.display = 'none';
    document.getElementById('teleportBtn').style.display = 'none';
    document.getElementById('titleBtn').style.display = island.type === 'megaTemple' ? 'inline-block' : 'none';
    if (popupView !== 'preview' && popupView !== 'send' && popupView !== 'recall') popupStats.dataset.preview = '';

    if (isOwned && popupView === 'recall') {
        renderRecallPreview(island);
        setBtnLabel(attackBtn, 'Sammeln');
        attackBtn.style.display = 'inline-block';
        attackBtn.disabled = gems < RECALL_GEM_COST;
        backBtn.style.display = 'inline-block';
    } else if (isOwned && popupView === 'send') {
        renderSendPreview(island);
        setBtnLabel(attackBtn, 'Senden');
        attackBtn.style.display = 'inline-block';
        attackBtn.disabled = (islandTroops[previewSourceId] || 0) <= 0;
        backBtn.style.display = 'inline-block';
    } else if (isOwned) {
        const troopsHere = islandTroops[island.id] || 0;
        subH = '<span class="dot dot--player"></span>' + whoLink('player', profileName.value || 'Du') +
            (island.id === playerIslandId ? sep + 'Heimat' : '');

        popupOverline.textContent = island.id === playerIslandId ? 'Deine Hauptstadt' + (brennt(island.id) ? ' · brennt' : '') : isTemple ? 'Dein Tempel' : island.type === 'gate' ? 'Dein Tor · Maut für dich' : 'Deine Basis';
        if (island.id === playerIslandId) { document.getElementById('cityBtn').style.display = 'inline-block'; document.getElementById('teleportBtn').style.display = 'inline-block'; }
        liveHtml(popupStats, '<div class="stat-grid">' +
            statTile('Truppen hier', 'troops', fmtTile(troopsHere)) +
            statTile('Verteidigung', 'defense', fmtTile(effectiveDefense(island))) +
            statTile('Münzen / s', 'coin', '+' + fmtNum(Math.round(coinsPerTick(level) * playerCoinMult() * 1000 / productionTickMs())), 'is-good') +
            statTile('Truppen / s', 'troops', '+' + fmtNum(Math.round(troopsPerTick(level) * playerTroopMult() * 1000 / productionTickMs())), 'is-good') + '</div>' +
            (island.type === 'gate' ? gateControlsHtml(island) : '') +
            (isTemple ? templeBonusLine(island) : '') + throneNotice(island) + midNotice(island) + ringNotice(island));
        liveHtml(upgradeCostLabel, level >= MAX_BASE_LEVEL ? 'Max. Stufe' : icon('coin', 'icon--coin') + fmtCompact(upgradeCost(level)));
        upgradeCostLabel.classList.toggle('is-bad', level < MAX_BASE_LEVEL && coins < upgradeCost(level));   // reichen die Münzen? (live: liveTick)
        popupActions.hidden = false;
        upgradeBtn.style.display = island.id === playerIslandId ? 'none' : 'inline-block';   // die Hauptstadt wächst nur mit der Burg (Stadt → Burg)
        sendBtn.style.display = 'inline-block';
        sendBtn.disabled = troopsHere <= 0 || ownedIslands.size <= 1;
        multiAttackBtn.style.display = 'inline-block';
        multiAttackBtn.disabled = troopsHere <= 0 || gems < MULTI_ATTACK_GEM_COST;
        recallBtn.style.display = 'inline-block';
        recallBtn.disabled = gems < RECALL_GEM_COST || ownedIslands.size <= 1;
    } else {
        const scouted = scoutedIslands.has(island.id), shieldOw = ownerBot && shieldCovers(island) && ownerShielded(ownerBot.id) ? ownerBot : null;
        if (popupView === 'preview' && shieldOw) popupView = 'menu';
        subH = '<span class="dot dot--' + (bossAt(island.id) ? 'enemy' : kind) + '"></span>' + (bossAt(island.id) ? 'Boss' : ownerBot ? '<span class="psub-who">' + whoLink(ownerBot.id, ownerBot.name) + ' · Stufe ' + loadBotState()[ownerBot.id].lvl + (botOnline(ownerBot, Date.now()) ? ' · online' : ' · offline') +
            (botBestRarity(ownerBot.id) >= 0 ? ' · <b style="color:' + RARITY_DEFS[botBestRarity(ownerBot.id)].color + ';font-weight:600">' + RARITY_DEFS[botBestRarity(ownerBot.id)].label + '</b>' : '') + '</span>' : 'Unbesetzt') +
            (scouted ? sep + '<span class="chip chip--scouted">' + icon('scout') + 'Gespäht</span>' : '');

        if (popupView === 'preview') {
            renderAttackPreview(island, scouted);
            setBtnLabel(attackBtn, 'Angreifen');
            attackBtn.style.display = 'inline-block';
            attackBtn.disabled = (previewSourceId !== null ? (islandTroops[previewSourceId] || 0) : 0) <= 0;
            backBtn.style.display = 'inline-block';
        } else {
            const scoutEnRoute = pendingScouts.some(s => !s.back && s.targetId === island.id);
            popupOverline.textContent = bossAt(island.id) ? 'Weltereignis · Boss' : ownerBot ? (isCapital(island.id) ? (brennt(island.id) ? 'Hauptstadt · brennt' : 'Feindliche Hauptstadt') : isTemple ? 'Feindlicher Tempel' : island.type === 'gate' ? 'Feindliches Tor' : 'Feindliche Basis') : (isTemple ? 'Tempel · unbesetzt' : island.type === 'gate' ? 'Tor · unbesetzt' : 'Neutrale Basis');
            liveHtml(popupStats, '<div class="stat-grid">' +
                statTile('Truppen', 'troops', scouted ? fmtTile(effectiveTroops(island)) : UNK, scouted && ownerBot ? 'is-enemy' : '') +
                statTile('Verteidigung', 'defense', scouted ? fmtTile(effectiveDefense(island)) : UNK) + '</div>' +
                (scouted ? '' : '<div class="notice">' + icon('scout') + '<span>Stärke unbekannt. Spähen deckt Truppen und Verteidigung auf.</span></div>') + midNotice(island) + ringNotice(island) +
                (isCapital(island.id) ? '<div class="notice notice--gold">' + icon('castle') + '<span>Fällt nie · Sieg = ' + Math.round(HAUPT_BEUTE * 100) + ' % Beute über dem Schutz' + (brennt(island.id) ? ' · brennt gerade' : '') + '</span></div>' : '') +
                (island.type === 'gate' && !ownerBot ? '<div class="notice notice--gold">' + icon('lock') + '<span>Tor: Unbesetzt ist es verschlossen – erobere es, um über die Brücke zu kommen. Wer es besitzt, geht kostenlos durch und bestimmt die Maut für alle anderen.</span></div>' : '') +
                (island.type === 'megaTemple' ? '<div class="notice">' + icon('rank') + '<span>' + (ownerBot ? escapeHtml(ownerBot.name) + ' verteilt die Titel (neu alle 3 Min.).' : 'Niemand verteilt gerade Titel.') + '</span><button type="button" class="btn btn--secondary btn--sm" data-view-titles>Titel ansehen</button></div>' : '') +
                (isTemple ? '<div class="notice notice--gold">' + icon('temple') + '<span>' + (island.type === 'megaTemple' ? 'Thron der Meere: wer ihn hält, trägt die Krone – +25 % Münzen und Truppen im ganzen Reich und alle 3 Min. ' + THRONE_PTS_MEGA + ' Thron-Punkte. Die Wächter-Tempel feuern auf ihn – nächster Beschuss in <b data-throne-fire>' + fmtClock((throneState.nextFire - Date.now()) / 1000) + '</b>.' : island.guardian ? 'Wächter-Tempel: 3-facher Tempel-Bonus und alle 3 Min. ' + THRONE_PTS_GUARD + ' Thron-Punkte. Gehört er nicht dem Herrscher, feuert er alle 3 Min. auf den Thron.' : 'Tempel: gibt Produktion, Gems und Münzen, sobald erobert.') + '</span></div>' : '') +
                (bossAt(island.id) ? '<div class="notice notice--gold">' + icon('shop') + '<span><b>Belohnung:</b> ' + RARITY_DEFS[WANDER_CRATE].label + ' Kiste + ' + WANDER_REWARD_GEMS + ' Gems · zieht weiter in <b data-boss-clock>' + fmtClock((bossAt(island.id).campUntil - Date.now()) / 1000) + '</b></span></div>' : '') +
                (scoutEnRoute ? '<div class="notice notice--warn">' + icon('hourglass') + '<span>Späher bereits unterwegs …</span></div>' : '') +
                (shieldOw ? '<div class="notice notice--gold">' + icon('shield') + '<span>Friedensschild – ' + escapeHtml(shieldOw.name) + ' ist noch ' + uhrHtml(ownerShieldUntil(shieldOw.id)) +
                    ' geschützt. Solange der Schild hält, kann niemand die Türme von ' + escapeHtml(shieldOw.name) + ' angreifen (Tore und Tempel schon) – Spähen geht.</span></div>' : ''));
            if (shieldOw) popupOverline.textContent = 'Friedensschild · unangreifbar';
            setBtnLabel(attackBtn, shieldOw ? 'Schild aktiv' : 'Angreifen');
            attackBtn.disabled = !!shieldOw;
            attackBtn.style.display = 'inline-block';   // (auch Hauptstädte – sie fallen nur nie)
            scoutBtn.style.display = 'inline-block';
            // Scouting is always allowed, even on an already-scouted
            // island (re-scout to refresh) - only block a second
            // scout while one is already en route to this target.
            setBtnLabel(scoutBtn, scouted ? (matchMedia('(max-width:359px)').matches ? 'Erneut' : 'Erneut spähen') : 'Spähen');
            scoutBtn.disabled = scoutEnRoute;
        }
    }
    if (popupView !== 'preview' && popupView !== 'send' && popupView !== 'recall') liveHtml(popupSub, subH + sep + '<span class="num coord">' + coordText(island.x, island.y) + '</span>');
    if (typeof bundInselfenster === 'function') bundInselfenster(island, popupView);               // Bündnis: Signale, Rally, Hilfe
    if (!isPanelOpen(popup)) {
        openPanel(popup);
        // camera framing (design-spec §6.6): after layout, so the sheet/popover size is known
        requestAnimationFrame(() => frameIslandInView(island));
    } else if (popupView !== popupFramedView) requestAnimationFrame(() => frameIslandInView(island));   // the preview sheet is taller: keep the target visible
    popupFramedView = popupView;
}

// Attack preview. Built ONCE per (target, source, scouted, bonus); later
// calls (the production tick re-renders every tick) only patch the
// numbers, so a finger dragging the slider is never interrupted.
function renderAttackPreview(island, scouted) {
    const sourceTroops = () => previewSourceId !== null ? (islandTroops[previewSourceId] || 0) : 0;
    const maxTroops = sourceTroops();
    // Defaults to sending everything, but the slider lets the player
    // hold part of the garrison back.
    if (previewAttackTroops === null || previewAttackTroops > maxTroops) previewAttackTroops = maxTroops;
    const atkPct = attackBonusPct();
    const source = islandById[previewSourceId];
    const key = island.id + ':' + previewSourceId + ':' + scouted + ':' + atkPct;
    popupOverline.textContent = 'Angriff vorbereiten';
    // source + march time live in the header subline (frees the body on short screens)
    popupSub.innerHTML = '<span id="previewToll" style="display:contents"></span>' + icon('defense') + '<span>Von ' + islandTitle(source) + '</span><span class="sep"></span>' +
        icon('hourglass') + '<span><span class="xs-hide">Marsch ca. </span><span class="num" id="previewMarch">' + fmtClock(travelDurationSeconds(source, island)) + '</span></span>';
    if (popupStats.dataset.preview !== key || !document.getElementById('attackTroopsSlider')) {
        popupStats.dataset.preview = key;
        popupStats.innerHTML =
            '<div class="versus">' +
                '<div class="force force--me"><span class="stat-l">' + icon('troops') + 'Angriff</span><b id="previewMyTroops"></b><small>' +
                    (atkPct > 0 ? '<span id="previewRawTroops"></span> + <span id="previewAtkBonus"></span> Schwert (+' + fmtNum(atkPct) + ' %)<span id="previewHeroBonus"></span><span id="previewTitleBonus"></span>' : 'aus ' + islandTitle(source) + '<span id="previewHeroBonus"></span><span id="previewTitleBonus"></span>') + '</small></div>' +
                '<div class="vs"><span>VS</span></div>' +
                '<div class="force force--foe"><span class="stat-l">Abwehr' + icon('defense') + '</span><b data-foe="total">?</b><small data-foe="sub">nicht gespäht</small></div>' +
            '</div>' +
            (scouted
                ? '<div><div class="balance" data-preview="balance"><i></i><b></b></div><div class="balance-note"><span>Kräfteverhältnis</span><span data-preview="verdict"></span></div></div>'
                : '<div class="notice">' + icon('scout') + '<span>Abwehr unbekannt: ohne Spähen ist der Ausgang ungewiss.</span></div>') +
            '<div class="field"><div class="field-top"><span class="field-l"><span class="sm-hide">Truppen </span>entsenden</span><span class="val"><input id="attackTroopsLabel" class="troop-in" inputmode="decimal" autocomplete="off" enterkeyhint="done" aria-label="Anzahl Truppen"> / <span data-preview="max"></span></span></div>' +
                '<input type="range" id="attackTroopsSlider" class="slider" min="0" max="' + SLIDER_STEPS + '" value="' + troopsToSlider(previewAttackTroops || 0, maxTroops) + '"' + (maxTroops <= 0 ? ' disabled' : '') + ' aria-label="Truppen entsenden">' +
                '<div class="seg" data-preview="quick"><button type="button" data-f=".25">25 %</button><button type="button" data-f=".5">50 %</button><button type="button" data-f=".75">75 %</button><button type="button" data-f="1">Alle</button></div></div>' +
            (heroSegHtml('data-hero', previewHero) ? '<div class="field"><div class="field-top"><span class="field-l">Held</span><span class="val" data-preview="herofx"></span></div><div class="seg hero-seg" data-preview="hero">' +
                heroSegHtml('data-hero', previewHero) + '</div><div class="seg hero-seg hero-seg2" data-preview="hero2"></div></div>' : '');
        const slider = document.getElementById('attackTroopsSlider');
        slider.addEventListener('input', () => {
            const mx = sourceTroops();
            previewAttackTroops = Math.min(mx, sliderToTroops(+slider.value, mx));
            previewFraction = +slider.value >= SLIDER_STEPS ? 1 : null;   // dragged to the end = "Alle" again
            patchAttackPreview();
        });
        bindTroopInput(document.getElementById('attackTroopsLabel'), sourceTroops, patchAttackPreview);
        const heroSeg = popupStats.querySelector('[data-preview="hero"]');
        if (heroSeg) heroSeg.addEventListener('click', e => { const bt = e.target.closest('[data-hero]'); if (!bt || bt.disabled) return; previewHero = bt.dataset.hero || null; if (previewHero === previewHero2 || !previewHero) previewHero2 = null; patchAttackPreview(); });
        const heroSeg2 = popupStats.querySelector('[data-preview="hero2"]');
        if (heroSeg2) heroSeg2.addEventListener('click', e => { const bt = e.target.closest('[data-hero2]'); if (!bt || bt.disabled) return; previewHero2 = bt.dataset.hero2 || null; patchAttackPreview(); });
        popupStats.querySelector('[data-preview="quick"]').addEventListener('click', (e) => {
            const f = parseFloat(e.target.closest('button') && e.target.closest('button').dataset.f);
            if (!f || slider.disabled) return;
            previewFraction = f;
            patchAttackPreview();
        });
    }
    patchAttackPreview();
}

// The troop slider works in thousandths of what the base has (a range input can't hold 10 Trd. exactly), and the
// number next to it is a field: type 2500, 2,5 Mio, 3 Mrd … - both stay in step.
const SLIDER_STEPS = 1000;
function sliderToTroops(v, mx) { return Math.max(1, Math.round(mx * v / SLIDER_STEPS)); }
function troopsToSlider(n, mx) { return mx > 0 ? Math.max(0, Math.min(SLIDER_STEPS, Math.round((n || 0) / mx * SLIDER_STEPS))) : 0; }
function parseTroopInput(s) {
    s = String(s || '').trim().toLowerCase().replace(/\s+/g, '');
    const units = [['quadrilliarden', 1e27], ['quadrillionen', 1e24], ['quadrillion', 1e24], ['quadr', 1e24], ['trilliarden', 1e21], ['trilliarde', 1e21], ['trd', 1e21],
        ['trillionen', 1e18], ['trillion', 1e18], ['trill', 1e18], ['billiarden', 1e15], ['billiarde', 1e15], ['brd', 1e15], ['billionen', 1e12], ['billion', 1e12], ['bio', 1e12],
        ['milliarden', 1e9], ['milliarde', 1e9], ['mrd', 1e9], ['millionen', 1e6], ['million', 1e6], ['mio', 1e6], ['tausend', 1e3], ['tsd', 1e3], ['k', 1e3], ['m', 1e6]];
    let mult = 1; for (const [u, v] of units) { const i = s.lastIndexOf(u); if (i > 0 && /^\.?$/.test(s.slice(i + u.length))) { mult = v; s = s.slice(0, i); break; } }
    s = mult === 1 ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;                                   // letters left over: not a number
    const n = parseFloat(s); return isFinite(n) && n >= 0 ? Math.round(n * mult) : NaN;
}
function setTroopInput(el, n) { if (el && document.activeElement !== el) el.value = fmtNum(n); }   // never overwritten while you type
function bindTroopInput(el, maxFn, patch) {
    if (!el) return;
    el.addEventListener('focus', () => el.select());
    el.addEventListener('input', () => { const n = parseTroopInput(el.value), mx = maxFn(); el.classList.toggle('is-bad', !(n >= 1) && el.value.trim() !== ''); if (!(n >= 1) || mx <= 0) return;
        previewAttackTroops = Math.min(mx, n); previewFraction = n >= mx ? 1 : null; patch(); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') el.blur(); });
    el.addEventListener('blur', () => { el.classList.remove('is-bad'); patch(); });
}

// Sending troops to your own base: like the attack, pick how many go (slider or 25/50/75 % / Alle).
function renderSendPreview(island) {
    const source = islandById[previewSourceId];
    if (!source) return;
    popupOverline.textContent = 'Truppen senden';
    popupSub.innerHTML = icon('defense') + '<span>Von ' + islandTitle(source) + '</span><span class="sep"></span>' +
        icon('hourglass') + '<span><span class="xs-hide">Marsch ca. </span><span class="num">' + fmtClock(travelDurationSeconds(source, island)) + '</span></span>';
    const key = 'send:' + island.id + ':' + previewSourceId;
    if (popupStats.dataset.preview !== key || !document.getElementById('sendTroopsSlider')) {
        popupStats.dataset.preview = key;
        popupStats.innerHTML = '<div class="stat-grid">' +
                statTile('Hier jetzt', 'troops', '<span data-send="here"></span>') +
                statTile('Nach Ankunft', 'troops', '<span data-send="after"></span>', 'is-good') + '</div>' +
            '<div class="field"><div class="field-top"><span class="field-l"><span class="sm-hide">Truppen </span>senden</span><span class="val"><input data-send="n" class="troop-in" inputmode="decimal" autocomplete="off" enterkeyhint="done" aria-label="Anzahl Truppen"> / <span data-send="max"></span></span></div>' +
                '<input type="range" id="sendTroopsSlider" class="slider" min="0" max="' + SLIDER_STEPS + '" value="' + SLIDER_STEPS + '" aria-label="Truppen senden">' +
                '<div class="seg" data-send="quick"><button type="button" data-f=".25">25 %</button><button type="button" data-f=".5">50 %</button><button type="button" data-f=".75">75 %</button><button type="button" data-f="1">Alle</button></div></div>';
        const slider = document.getElementById('sendTroopsSlider');
        slider.addEventListener('input', () => {
            const mx = islandTroops[previewSourceId] || 0;
            previewAttackTroops = Math.min(mx, sliderToTroops(+slider.value, mx));
            previewFraction = +slider.value >= SLIDER_STEPS ? 1 : null;
            patchSendPreview();
        });
        bindTroopInput(popupStats.querySelector('[data-send="n"]'), () => islandTroops[previewSourceId] || 0, patchSendPreview);
        popupStats.querySelector('[data-send="quick"]').addEventListener('click', e => {
            const f = parseFloat(e.target.closest('button') && e.target.closest('button').dataset.f);
            if (!f || slider.disabled) return;
            previewFraction = f; patchSendPreview();
        });
    }
    patchSendPreview();
}
function patchSendPreview() {
    const slider = document.getElementById('sendTroopsSlider'), island = islandById[popupIslandId];
    if (!slider || !island) return;
    const mx = islandTroops[previewSourceId] || 0;
    slider.disabled = mx <= 0;
    if (previewFraction !== null && mx > 0) previewAttackTroops = Math.max(1, Math.round(mx * previewFraction));
    if (previewAttackTroops === null || previewAttackTroops > mx) previewAttackTroops = mx;
    if (mx > 0) slider.value = troopsToSlider(previewAttackTroops, mx);
    const n = Math.max(0, previewAttackTroops || 0), big = fmtNum;
    setTroopInput(popupStats.querySelector('[data-send="n"]'), n);
    popupStats.querySelector('[data-send="max"]').textContent = big(mx);
    popupStats.querySelector('[data-send="here"]').textContent = big(islandTroops[island.id] || 0);
    popupStats.querySelector('[data-send="after"]').textContent = big((islandTroops[island.id] || 0) + n);
    slider.style.setProperty('--pct', (mx > 1 ? (Math.max(1, n) - 1) / (mx - 1) * 100 : 100) + '%');
    for (const b of popupStats.querySelectorAll('[data-send="quick"] button'))
        b.classList.toggle('on', mx > 0 && (previewFraction !== null ? previewFraction === parseFloat(b.dataset.f) : Math.max(1, Math.round(mx * parseFloat(b.dataset.f))) === n));
}

// Writes the live numbers of the attack preview (own force, enemy force
// when scouted, slider range, ratio). Reads the current state every time.
function patchAttackPreview() {
    const slider = document.getElementById('attackTroopsSlider');
    const island = islandById[popupIslandId];
    if (!slider || !island) return;
    const maxTroops = previewSourceId !== null ? (islandTroops[previewSourceId] || 0) : 0;
    const scouted = scoutedIslands.has(island.id);
    slider.disabled = maxTroops <= 0;
    if (previewFraction !== null && maxTroops > 0) previewAttackTroops = Math.max(1, Math.round(maxTroops * previewFraction));
    if (maxTroops > 0) slider.value = troopsToSlider(previewAttackTroops, maxTroops);
    const shown = Math.max(0, previewAttackTroops || 0);
    if (previewHero && (!heroOwned('player', previewHero) || heroBusy('player', previewHero))) previewHero = null;
    for (const b of popupStats.querySelectorAll('[data-hero]')) { const id = b.dataset.hero; b.disabled = !!id && heroBusy('player', id); b.classList.toggle('on', (id || null) === previewHero); }
    previewHero2 = heroZweitOk('player', previewHero, previewHero2); liveHtml(popupStats.querySelector('[data-preview="hero2"]'), heroSeg2Html('data-hero2', previewHero, previewHero2));   // der Zweitheld
    const src0 = islandById[previewSourceId], px = previewHero && src0 ? heroPeek('player', previewHero, src0, island, shown, previewHero2) : null, hfx = popupStats.querySelector('[data-preview="herofx"]');   // what the hero does in THIS attack
    const hfl = x => x.lines.filter(l => l[0] !== 'Gefolge' && l[0] !== 'Tempo' && l[0].indexOf('Paar') !== 0).map(l => l[1]).join(', ');
    if (hfx) hfx.textContent = !px ? '' : heroStarTxt(px.q) + (px.fired ? ' · ' + px.skill + ' zündet' : '') + (px.pair ? ' · Paar +' + HERO_PAIR_BONUS + ' %' : px.h2 ? ' · + ' + heroById(px.h2.id).name : '') + ' · ' + hfl(px);
    if (hfx) hfx.title = !px ? '' : hfl(px) + (px.h2 ? ' · ' + heroById(px.h2.id).name + ' (' + Math.round(HERO_ZWEIT * 100) + ' %): ' + hfl(px.h2) : '');   // alles einzeln beim Draufzeigen
    const swordBonus = attackFlatBonus(shown), heroTroops = px ? Math.round(shown * px.atk / 100) + heroGefOf(px, shown) : 0, atkBonus = swordBonus + heroTroops;
    const mine = Math.round((shown + atkBonus) * titleMult('player', 'attack') * (AUF ? AUF.kampf('player', 'a') : 1));        // same maths as resolveAttack (+ Forschung)
    const bEl = popupStats.querySelector('#previewAtkBonus'); if (bEl) bEl.textContent = fmtNum(swordBonus);
    const hbEl = popupStats.querySelector('#previewHeroBonus'); if (hbEl) hbEl.textContent = heroTroops ? ' + ' + fmtNum(heroTroops) + ' ' + heroById(previewHero).name + (px && px.id2 ? ' & ' + heroById(px.id2).name : '') : '';
    const mitTitel = Math.round((shown + atkBonus) * titleMult('player', 'attack')), kv = mine - mitTitel;   // Paket D: Forschung getrennt zeigen
    const tv = mitTitel - Math.round(shown + atkBonus), tx = titleOf('player'), tbEl = popupStats.querySelector('#previewTitleBonus');
    if (tbEl) tbEl.textContent = (tv && tx ? (tv > 0 ? ' + ' : ' − ') + fmtNum(Math.abs(tv)) + ' Titel ' + tx.name : '') + (kv ? ' + ' + fmtNum(kv) + ' Forschung' : '');
    const src = islandById[previewSourceId], tEl = popupSub.querySelector('#previewToll'), mEl = popupSub.querySelector('#previewMarch');
    if (mEl && src) mEl.textContent = fmtClock(travelDurationSeconds(src, island) / (1 + (px ? px.spd : 0) / 100));   // the hero's Tempo
    if (tEl && src) { const hop = lastHop(src.landmassId, island.landmassId, 'player'), t = tollFor(hop[0], hop[1], shown, 'player', island.id, px ? px.toll : 0);
        tEl.innerHTML = t.closed ? '<span class="sep"></span>' + icon('lock') + '<span>Tor geschlossen</span>' : t.cost ? '<span class="sep"></span>' + icon('coin') + '<span>Maut <span class="num">' + fmtCompact(t.cost) + '</span></span>' : ''; }
    document.getElementById('previewMyTroops').textContent = fmtBig(mine);
    const raw = document.getElementById('previewRawTroops');
    if (raw) raw.textContent = fmtBig(shown);
    setTroopInput(document.getElementById('attackTroopsLabel'), shown);
    popupStats.querySelector('[data-preview="max"]').textContent = fmtBig(maxTroops);
    slider.style.setProperty('--pct', (maxTroops > 1 ? (Math.max(1, shown) - 1) / (maxTroops - 1) * 100 : 100) + '%');
    for (const b of popupStats.querySelectorAll('[data-preview="quick"] button'))
        b.classList.toggle('on', maxTroops > 0 && (previewFraction !== null
            ? previewFraction === parseFloat(b.dataset.f)
            : Math.max(1, Math.round(maxTroops * parseFloat(b.dataset.f))) === shown));
    if (scouted) {                                      // fog of war: enemy numbers and the ratio exist only when scouted
        const enemyTroops = effectiveTroops(island), enemyDefense = Math.round(effectiveDefense(island) * (1 - (px ? Math.min(90, px.def) : 0) / 100)), total = enemyTroops + enemyDefense;   // (Rammbock & Co. cut it)
        popupStats.querySelector('[data-foe="total"]').textContent = fmtNum(total);
        popupStats.querySelector('[data-foe="sub"]').innerHTML = fmtCompact(enemyTroops) + '<span class="xs-hide">\u00a0Truppen</span> +\u00a0' + fmtCompact(enemyDefense) + '\u00a0Vert.';
        const ratio = total > 0 ? mine / total : Infinity;
        popupStats.querySelector('[data-preview="balance"]').style.setProperty('--a', (mine + total > 0 ? Math.round(mine / (mine + total) * 100) : 50) + '%');
        popupStats.querySelector('[data-preview="verdict"]').innerHTML = (ratio > 1 ? 'Überlegen ' : 'Unterlegen ') +
            '<b class="' + (ratio > 1 ? '' : 'is-bad') + '">' + (isFinite(ratio) ? (ratio >= 1000 ? '> 999×' : ratio < 0.1 ? '< 0,1×' : ratio.toLocaleString('de-DE', { maximumFractionDigits: ratio < 10 ? 1 : 0 }) + '×') : '∞') + '</b>';
    }
}

// (Zuschauer) eben ausgebaute Stufen merken: bis der Weltrechner sie bestätigt, überschreibt die nächste Welt-Lieferung
// sie nicht wieder mit der alten Stufe (sonst springt die Anzeige zurück und man bezahlt dieselbe Stufe zweimal)
const wartendeAusbauten = new Map();   // Basis → { stufe, bis }
function ausbauMerken(id, stufe) { if (window.WELT && !WELT.leiter) wartendeAusbauten.set(id, { stufe, bis: Date.now() + 90000 }); }
function ausbauDrueber() {
    for (const [id, w] of wartendeAusbauten) {
        if ((islandLevels[id] || 1) >= w.stufe || Date.now() > w.bis || islandOwnerOf(id) !== 'player') wartendeAusbauten.delete(id);
        else islandLevels[id] = w.stufe;
    }
}

// One tap upgrades right away (no confirmation step); tapping again
// keeps levelling up as long as the coins last.
upgradeBtn.addEventListener('click', () => {
    if (popupIslandId === null) return;
    if (popupIslandId === playerIslandId) { closeIslandPopup(); openCity(); setTimeout(() => { cityOpenId = '_keep'; renderCitySheet(); }, 300); return; }   // Hauptstadt: nur über die Burg
    const level = islandLevels[popupIslandId] || 1;
    if (level >= MAX_BASE_LEVEL) { flashHint('Maximale Stufe ' + MAX_BASE_LEVEL + ' erreicht.', 2500); return; }
    const cost = upgradeCost(level);
    if (coins < cost) {
        flashHint('Nicht genug Münzen – benötigt ' + fmtCompact(cost) + '.', 2500);
        return;
    }
    coins -= cost;
    islandLevels[popupIslandId] = level + 1;
    ausbauMerken(popupIslandId, level + 1);
    if (!alsBefehl('ausbau', { insel: popupIslandId, stufe: level + 1 })) evPunkte('bau', 'player', 2 + level + 1);   // (sonst zählt es der Weltrechner)
    updateHud();
    saveGame();
    flashHint(islandTitle(islandById[popupIslandId]) + ' ist jetzt Stufe ' + (level + 1) + '.', 1800);
    sfx('upgrade');
    questProgress('upgrade', 1);
    popupView = 'menu';
    renderPopup();
});

multiAttackBtn.addEventListener('click', () => {
    if (popupIslandId === null) return;
    if ((islandTroops[popupIslandId] || 0) <= 0 || gems < MULTI_ATTACK_GEM_COST) return;
    const sourceId = popupIslandId;
    closeIslandPopup();
    startMultiAttack(sourceId);
});

function recallSources(targetId) {
    const target = islandById[targetId], sources = [];
    for (const id of ownedIslands) {
        if (id === targetId || (islandTroops[id] || 0) <= 0) continue;
        const isl = islandById[id];
        if (Math.hypot(isl.x - target.x, isl.y - target.y) <= RECALL_RADIUS) sources.push(id);
    }
    return sources;
}
// "Sammeln": first a preview - how many bases, how many troops, and which share of each garrison comes
function renderRecallPreview(island) {
    const sources = recallSources(island.id), total = sources.reduce((a, id) => a + (islandTroops[id] || 0), 0);
    const f = previewFraction || 1, come = sources.reduce((a, id) => a + Math.floor((islandTroops[id] || 0) * f), 0), big = fmtNum;
    popupOverline.textContent = 'Truppen sammeln';
    popupSub.innerHTML = icon('send') + '<span>' + (sources.length === 1 ? '1 Basis' : sources.length + ' Basen') + ' im Umkreis</span><span class="sep"></span>' + icon('gem') + '<span>' + RECALL_GEM_COST + ' Gem</span>';
    popupStats.dataset.preview = 'recall';
    popupStats.innerHTML = '<div class="stat-grid">' +
            statTile('Hier jetzt', 'troops', big(islandTroops[island.id] || 0)) +
            statTile('Nach Ankunft', 'troops', big((islandTroops[island.id] || 0) + come), 'is-good') + '</div>' +
        '<div class="field"><div class="field-top"><span class="field-l">Von jeder Basis</span><span class="val"><b>' + big(come) + '</b> / ' + big(total) + '</span></div>' +
            '<div class="seg" data-recall="quick">' + ['.25', '.5', '.75', '1'].map(v => '<button type="button" data-f="' + v + '"' + (+v === f ? ' class="on"' : '') + '>' + (v === '1' ? 'Alle' : Math.round(v * 100) + ' %') + '</button>').join('') + '</div></div>';
    popupStats.querySelector('[data-recall="quick"]').addEventListener('click', e => {
        const bt = e.target.closest('button[data-f]'); if (!bt) return;
        previewFraction = parseFloat(bt.dataset.f); renderPopup();
    });
    return sources;
}
recallBtn.addEventListener('click', () => {
    if (popupIslandId === null || gems < RECALL_GEM_COST) return;
    if (!recallSources(popupIslandId).length) { flashHint('Keine eigenen Basen mit Truppen im Umkreis gefunden.', 3000); return; }
    popupView = 'recall'; previewFraction = 1; previewShownAt = Date.now();
    renderPopup();
});
function confirmRecall() {
    const targetId = popupIslandId;
    if (targetId === null || gems < RECALL_GEM_COST) return;
    const sources = recallSources(targetId), f = previewFraction || 1;
    if (sources.length === 0) {
        flashHint('Keine eigenen Basen mit Truppen im Umkreis gefunden.', 3000);
        return;
    }

    if (!marschPlatz('player')) return;                                       // „Truppen sammeln“: zusammen EINE Aktion
    gems -= RECALL_GEM_COST;
    naechsteGruppe = 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    for (const sourceId of sources) launchSend(sourceId, targetId, null, Math.max(1, Math.floor((islandTroops[sourceId] || 0) * f)));
    naechsteGruppe = null;
    updateHud();
    saveGame();
    saveProgression();
    flashHint('Truppen aus ' + (sources.length === 1 ? '1 Basis' : sources.length + ' Basen') + ' im Umkreis werden zurückgerufen.', 3500);
    closeIslandPopup();
}

backBtn.addEventListener('click', () => {
    if (popupView === 'send') {                        // back to picking the destination
        const fromId = previewSourceId;
        closeIslandPopup();
        pendingSendFromId = fromId;
        flashHint('Wähle die Zielbasis für deine Truppen – tippe sie auf der Karte an.');
        return;
    }
    if (popupView === 'preview') {
        // Go back to blink-picking a different base
        const targetId = popupIslandId;
        previewSourceId = null;
        pendingAttackTargetId = targetId;
        closeIslandPopup();
        flashHint('Wähle die Basis, von der aus du angreifst – tippe sie auf der Karte an.');
        return;
    }
    popupView = 'menu';
    renderPopup();
});

attackBtn.addEventListener('click', () => {
    if (popupView === 'recall') { if (Date.now() - previewShownAt >= 350) confirmRecall(); return; }
    if (popupView === 'send') {
        if (Date.now() - previewShownAt < 350) return;
        const toId = popupIslandId, fromId = previewSourceId, available = islandTroops[fromId] || 0;
        if (toId === null || fromId === null || available <= 0) return;
        const picked = previewFraction !== null ? Math.round(available * previewFraction) : previewAttackTroops;
        launchSend(fromId, toId, null, Math.max(1, Math.min(picked || available, available)));
        closeIslandPopup();
        return;
    }
    if (popupView === 'preview') {
        // Ignore a click that arrives the instant the preview opened -
        // a real confirmation tap is a separate, deliberate action
        if (Date.now() - previewShownAt < 350) return;
        // Confirmed - send the troops marching, resolved later once
        // they arrive (see launchAttack/resolveAttack)
        const targetId = popupIslandId;
        const sourceId = previewSourceId;
        if (targetId === null || sourceId === null) return;
        const available = islandTroops[sourceId] || 0;
        if (available <= 0) return;
        const picked = previewFraction !== null ? Math.round(available * previewFraction) : previewAttackTroops;
        const troopsToSend = Math.max(1, Math.min(picked || available, available));

        nextAttackHero = previewHero; nextAttackHero2 = previewHero2;
        launchAttack(sourceId, targetId, null, troopsToSend);
        nextAttackHero = null; nextAttackHero2 = null;
        previewSourceId = null;
        closeIslandPopup();
        return;
    }

    // On the menu of a neutral island: close the popup, blink every
    // owned island, and wait for the player to tap the attack base.
    // Guard against a stray second click (double-tap/ghost-click)
    // landing here after the popup already closed from the first -
    // without this, popupIslandId is already null and this would
    // wrongly clear pendingAttackTargetId and show a stale hint.
    if (popupIslandId === null) return;
    { const ow = islandOwnerOf(popupIslandId); if (ow && ow !== 'player' && baseShieldedFor(popupIslandId, 'player')) { flashHint(shieldBlockText(ow), 4000); return; } }
    // pick the own base next to the target with the most troops (same region or one bridge away) - no hunting on the map
    const target = islandById[popupIslandId];
    let best = null;
    for (const id of ownedIslands) {
        const isl = islandById[id], t = islandTroops[id] || 0;
        if (t <= 0 || !canReach(isl.landmassId, target.landmassId)) continue;
        if (!best || t > (islandTroops[best] || 0)) best = id;
    }
    if (best === null) {
        const any = [...ownedIslands].some(id => canReach(islandById[id].landmassId, target.landmassId));
        flashHint(any ? 'Deine Basen neben diesem Gebiet haben keine Truppen – schicke erst Truppen dorthin (Senden).'
                      : 'Keine deiner Basen grenzt an dieses Gebiet. Erobere zuerst eine Basis oder ein Tor direkt daneben und schicke Truppen hin.', 5000);
        return;
    }
    {                                               // a shut gate in the way: go straight to the gate - taking it is the way through
        const hop = lastHop(islandById[best].landmassId, target.landmassId, 'player'), tl = tollFor(hop[0], hop[1], islandTroops[best] || 0, 'player', target.id);
        if (tl.closed && tl.gate && tl.gate.id !== target.id) {
            const ow = islandOwnerOf(tl.gate.id);
            flashHint((ow ? 'Das Tor davor ist zu (' + botById[ow].name + ')' : 'Das Tor davor ist verschlossen') + ' – erobere zuerst das Tor.', 5000);
            flyTo(tl.gate.x, tl.gate.y); openIslandPopup(tl.gate); return;
        }
    }
    previewSourceId = best;
    popupView = 'preview';
    previewShownAt = Date.now();
    previewFraction = 1;
    renderPopup();
});

scoutBtn.addEventListener('click', () => {
    if (popupIslandId === null) return;
    launchScout(popupIslandId);
    closeIslandPopup();
});

// "Truppen verschicken": close the popup, blink every OTHER owned
// island, and wait for the player to tap the destination.
sendBtn.addEventListener('click', () => {
    pendingSendFromId = popupIslandId;
    closeIslandPopup();
    flashHint('Wähle die Zielbasis für deine Truppen – tippe sie auf der Karte an.');
});

closeBtn.addEventListener('click', closeIslandPopup);

function fogPointAt(sx, sy) {                      // a fogged spot on land under the finger
    const w = screenToWorld(sx, sy);
    if (isCellOpen(w.x, w.y)) return null;
    const lm = landmasses.find(l => Math.hypot(w.x - l.x, w.y - l.y) <= l.shapeMaxR && pointInPolygon(w.x, w.y, l.shape));
    return lm ? { lm, x: w.x, y: w.y } : null;
}
function tapFog(f) {
    const lm = f.lm;
    if (pendingScouts.some(sc => sc.explore && sc.ex !== undefined && Math.hypot(sc.ex - f.x, sc.ey - f.y) < FOG_CELL * 1.6)) { flashHint('Ein Späher erkundet dieses Gebiet bereits.', 2500); return; }
    if (!isExplored(lm.id)) {
        const known = bridges.filter(br => (br.a === lm.id && isExplored(br.b)) || (br.b === lm.id && isExplored(br.a)));
        if (!known.length) { flashHint('Zu weit entfernt – erkunde zuerst die Gebiete davor.', 2500); return; }
        if (!known.some(br => landmassesConnected(br.a, br.b))) { flashHint('Das Tor ist noch verschlossen – dahinter kann noch niemand spähen.', 2800); return; }
    }
    let target = null, bd = Infinity;
    for (const i of islandsByLandmass[lm.id] || []) { const d = Math.hypot(i.x - f.x, i.y - f.y); if (d < bd) { bd = d; target = i; } }
    if (!target) return;
    const home = islandById[nearestOwnedIslandTo(target)];          // same source and route launchScout will use
    fogPrompt = { x: f.x, y: f.y, targetId: target.id, secs: home ? scoutSecs(home, target) : 0, at: performance.now() };
    requestRender();
}
function fogPromptHit(sx, sy) {                   // → 'go' (the button), 'off' (elsewhere)
    if (!fogPrompt || !fogPrompt.rect) return 'off';
    const r = fogPrompt.rect;
    return sx >= r.x - 6 && sx <= r.x + r.w + 6 && sy >= r.y - 6 && sy <= r.y + r.h + 6 ? 'go' : 'off';
}
function handleTap(screenX, screenY) {
    if (teleportMode && Date.now() > teleportBis) { teleportMode = false; requestRender(); }
    if (teleportMode) {
        teleportMode = false; requestRender();
        const isl = pickIslandAtScreen(screenX, screenY);
        if (isl && ownedIslands.has(isl.id) && isl.id !== playerIslandId && isl.type === 'tower') { if (teleportCapital(isl.id) === false) flashHint('Verlegen geht gerade nicht (genug Gems? frei?).', 2500); }
        else if (isl && ownedIslands.has(isl.id) && isl.id !== playerIslandId) flashHint('Die Hauptstadt kann nur in einen Turm ziehen – nicht in Tempel, Tore oder den Thron.', 3500);
        else flashHint('Verlegen abgebrochen.', 2000);
        return;
    }
    if (!multiAttackMode && armyHandleTap(screenX, screenY)) return;       // armies in the field: place, select, give orders
    if (markerMode) {                                                        // placing a Wegmarke
        setMarkerMode(false); const w = screenToWorld(screenX, screenY);
        openMarkerSheet({ id: null, x: w.x, y: w.y, text: MARKER_PRESETS[0], col: MARKER_COLORS[0] }); return;
    }
    { const mk = !multiAttackMode && markerAt(screenX, screenY); if (mk) { openMarkerSheet({ id: mk.id, x: mk.x, y: mk.y, text: mk.text, col: mk.col }); return; } }
    { const bb = !multiAttackMode && !pickIslandAtScreen(screenX, screenY) && barbAt(screenX, screenY); if (bb) { closeIslandPopup(); if (fieldSheetId) closeFieldSheet(); openBarbSheet(bb); return; } }
    if (barbView) closeBarbSheet();
    { const fd = !multiAttackMode && !pickIslandAtScreen(screenX, screenY) && fieldAt(screenX, screenY); if (fd) { closeIslandPopup(); openFieldSheet(fd); return; } }
    if (!multiAttackMode && typeof haendlerAt === 'function' && haendlerAt(screenX, screenY)) { closeIslandPopup(); if (fieldSheetId) closeFieldSheet(); haendlerOeffnen(); return; }   // Paket C: Händler-Karren
    if (fieldSheetId) closeFieldSheet();
    if (fogPrompt) {
        const hit = fogPromptHit(screenX, screenY), fp = fogPrompt; fogPrompt = null; requestRender();
        if (hit === 'go') { launchScout(fp.targetId, true, { x: fp.x, y: fp.y }); return; }
    }
    if (!multiAttackMode && collectPickupAt(screenX, screenY)) return;
    if (!multiAttackMode && marchTapAt(screenX, screenY)) return;
    const island = pickIslandAtScreen(screenX, screenY);
    if (!island && !multiAttackMode) { const fp = fogPointAt(screenX, screenY); if (fp) { tapFog(fp); return; } }
    if (!island) { if (isPanelOpen(popup) && !multiAttackMode) closeIslandPopup(); return; }

    if (multiAttackMode) {
        const source = islandById[multiAttackSourceId];
        if (ownedIslands.has(island.id)) {
            flashHint('Das ist bereits deine eigene Basis – wähle ein gegnerisches Ziel.', 2500);
            return; // never a valid attack target, source base included
        }
        if (!source || !canReach(source.landmassId, island.landmassId)) {
            flashHint(source ? noRouteHint(source.landmassId, island.landmassId) : 'Keine Brücke zu dieser Insel – sie kann nicht Ziel sein.', 3000);
            return;
        }
        const idx = multiAttackTargets.indexOf(island.id);
        if (idx === -1 && baseShieldedFor(island.id, 'player')) { flashHint(shieldBlockText(islandOwnerOf(island.id)), 3500); return; }
        if (idx === -1) {                                                    // a shut gate on the way: say so right away, not after "Angriffe starten"
            const hop = lastHop(source.landmassId, island.landmassId, 'player'), tl = tollFor(hop[0], hop[1], 1, 'player', island.id);
            if (tl.closed && tl.gate && tl.gate.id !== island.id) { const ow = islandOwnerOf(tl.gate.id);
                flashHint((ow ? 'Das Tor davor ist geschlossen (' + botById[ow].name + ')' : 'Das Tor davor ist verschlossen') + ' – erobere zuerst das Tor, dann kommst du durch.', 4000); return; }
        }
        if (idx !== -1) {
            multiAttackTargets.splice(idx, 1); // tap again to deselect
        } else {
            multiAttackTargets.push(island.id);
        }
        updateMultiAttackBar();
        return;
    }

    if (isPanelOpen(popup) && popupView === 'preview' && previewSourceId !== null && ownedIslands.has(island.id)) {   // switch the start base
        const target = islandById[popupIslandId];
        if (island.id === previewSourceId) return;
        if (!(islandTroops[island.id] > 0)) { flashHint('Diese Basis hat keine Truppen zum Angreifen.', 3000); return; }
        if (!canReach(island.landmassId, target.landmassId)) { flashHint(noRouteHint(island.landmassId, target.landmassId), 3500); return; }
        previewSourceId = island.id; previewFraction = 1; renderPopup(); return;
    }
    if (pendingAttackTargetId !== null) {
        const target = islandById[pendingAttackTargetId];
        pendingAttackTargetId = null;
        hintEl.textContent = defaultHint;

        if (ownedIslands.has(island.id) && target && (islandTroops[island.id] || 0) > 0) {
            // Crossing to a different landmass is only allowed over
            // a bridge - same-landmass attacks are always fine.
            if (!canReach(island.landmassId, target.landmassId)) {
                flashHint(noRouteHint(island.landmassId, target.landmassId), 3500);
                return;
            }
            // Show the comparison and wait for an explicit "Angreifen"
            // tap before anything actually happens
            previewSourceId = island.id;
            popupIslandId = target.id;
            popupView = 'preview';
            previewShownAt = Date.now();
            previewFraction = 1;
            renderPopup();
            return;
        }
        if (ownedIslands.has(island.id)) { flashHint('Diese Basis hat keine Truppen zum Angreifen.', 3000); return; }
        // Tapped something other than an owned island - just cancel
    }

    if (pendingSendFromId !== null) {
        const fromId = pendingSendFromId;
        pendingSendFromId = null;
        hintEl.textContent = defaultHint;

        if (ownedIslands.has(island.id) && island.id !== fromId && (islandTroops[fromId] || 0) > 0) {
            closeAllPopups();                                     // pick how many go, like for an attack
            previewSourceId = fromId; popupIslandId = island.id; popupView = 'send';
            previewFraction = 1; previewAttackTroops = null; previewShownAt = Date.now();
            renderPopup();
            return;
        }
        // Tapped the source again or a neutral island - just cancel
    }

    openIslandPopup(island);
}

// Canvas text: load Inter before the first banner sprites, rebuild sprites drawn with the fallback font (§1.1, §5.7)
try {
    document.fonts.load('600 11px Inter').catch(() => {});
    document.fonts.addEventListener('loadingdone', () => { flushBannerSprites(); requestRender(); });
} catch (e) {}
profileName.addEventListener('input', requestRender);   // own-base banners show the name (§6.4)

// ===== LOADING SCREEN =====
// Shown from the first paint (markup + CSS); the bar runs to ~72 % on its own while the
// world is generated, then finishes here and fades into the map (min. ~2 s on screen).
// ===== MUSIK: generated live with Web Audio - no files to load. A calm medieval piece in D minor: a low drone,
// a lute that picks the chords, a soft frame drum and now and then a flute over it, all in a little stone-hall reverb.
// Starts with the first tap (browsers only allow sound after one), remembers on/off.
const Music = (() => {
    // sound: 'all' (music + effects), 'sfx' (effects only), 'off'. Older saves only knew music on/off.
    let mode = store.get('openWaterSound') || 'all';
    let ac = null, master = null, fx = null, verb = null, timer = null, nextAt = 0, step = 0, bar = 0, on = mode === 'all';
    const BPM = 70, EIGHTH = 60 / BPM / 2;
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    // i - VII - VI - VII in D minor, then i - iv - VII - i (as MIDI notes: root, third, fifth, octave)
    const CHORDS = [[50, 53, 57, 62], [48, 52, 55, 60], [46, 50, 53, 58], [48, 52, 55, 60], [50, 53, 57, 62], [55, 58, 62, 67], [48, 52, 55, 60], [50, 53, 57, 62]];
    const PICK = [0, 2, 1, 3, 2, 1, 3, 2];                          // the lute's pattern over the four chord tones
    const FLUTE = [62, 64, 65, 67, 69, 72, 74];                      // D dorian-ish, high
    function impulse(sec) { const len = ac.sampleRate * sec, b = ac.createBuffer(2, len, ac.sampleRate);
        for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); } return b; }
    function init() {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
        fx = ac.createGain(); fx.gain.value = .8; fx.connect(ac.destination);
        verb = ac.createConvolver(); verb.buffer = impulse(2.6); const wet = ac.createGain(); wet.gain.value = .32; verb.connect(wet); wet.connect(master);
        fxVerb = ac.createConvolver(); fxVerb.buffer = impulse(1.4); const fxWet = ac.createGain(); fxWet.gain.value = .25; fxVerb.connect(fxWet); fxWet.connect(fx);
        // the drone: D and A, soft saws through a slowly breathing low-pass
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = .7;
        const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = .05; lfoG.gain.value = 140; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
        const dg = ac.createGain(); dg.gain.value = .05; lp.connect(dg); dg.connect(master); dg.connect(verb);
        for (const [m, det] of [[38, -4], [45, 3], [50, 0]]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det; o.connect(lp); o.start(); }
    }
    function out(node, dry, wetAmt) { const g = ac.createGain(); g.gain.value = dry; node.connect(g); g.connect(master); const w = ac.createGain(); w.gain.value = wetAmt; node.connect(w); w.connect(verb); }
    function lute(m, t, vel) {                                       // a plucked string: bright attack, fast decay
        const o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
        o.type = 'triangle'; o2.type = 'sawtooth'; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 1.002;
        f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(500, t + .5);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16 * vel, t + .008); g.gain.exponentialRampToValueAtTime(.0008, t + 1.6);
        const g2 = ac.createGain(); g2.gain.value = .25; o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); out(g, .9, .5);
        o.start(t); o2.start(t); o.stop(t + 1.7); o2.stop(t + 1.7);
    }
    function drum(t, vel) {                                          // frame drum: a low thump and a little skin noise
        const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + .25);
        g.gain.setValueAtTime(.32 * vel, t); g.gain.exponentialRampToValueAtTime(.001, t + .45); o.connect(g); out(g, .8, .25); o.start(t); o.stop(t + .5);
        const n = ac.createBufferSource(), nb = ac.createBuffer(1, ac.sampleRate * .15, ac.sampleRate), d = nb.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const nf = ac.createBiquadFilter(), ng = ac.createGain(); nf.type = 'bandpass'; nf.frequency.value = 900; ng.gain.value = .05 * vel;
        n.buffer = nb; n.connect(nf); nf.connect(ng); out(ng, .8, .3); n.start(t);
    }
    function flute(m, t, dur) {                                      // breathy sine with a slow vibrato
        const o = ac.createOscillator(), v = ac.createOscillator(), vg = ac.createGain(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = hz(m); v.frequency.value = 5; vg.gain.value = hz(m) * .006; v.connect(vg); vg.connect(o.frequency);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .12); g.gain.setValueAtTime(.07, t + dur - .15); g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g); out(g, .7, .7); o.start(t); v.start(t); o.stop(t + dur + .05); v.stop(t + dur + .05);
    }
    // ===== EFFECTS: short, muted sounds for what happens - built from the same simple parts as the music
    let fxVerb = null; const lastFx = {};
    function fo(node, dry, wetAmt) { const g = ac.createGain(); g.gain.value = dry; node.connect(g); g.connect(fx); if (wetAmt) { const w = ac.createGain(); w.gain.value = wetAmt; node.connect(w); w.connect(fxVerb); } }
    function tone(type, f, t, dur, vol, opt = {}) {
        const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
        if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + (opt.a || .01)); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
        let n = o; if (opt.lp) { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = opt.lp; o.connect(f2); n = f2; }
        n.connect(g); fo(g, 1, opt.wet || 0); o.start(t); o.stop(t + dur + .05);
    }
    function noise(t, dur, vol, type, freq, q) {
        const n = ac.createBufferSource(), nb = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = nb.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
        const f = ac.createBiquadFilter(), g = ac.createGain(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1; g.gain.value = vol;
        n.buffer = nb; n.connect(f); f.connect(g); fo(g, 1, .2); n.start(t);
    }
    function horn(t, notes, len, vol) {                           // a brass horn: two detuned saws through a warm filter, a little rise
        notes.forEach((m, i) => { const tt = t + i * len * .9;
            for (const [type, det] of [['sawtooth', -5], ['sawtooth', 6], ['square', 0]]) {
                const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = type; o.detune.value = det;
                o.frequency.setValueAtTime(hz(m) * .985, tt); o.frequency.linearRampToValueAtTime(hz(m), tt + .07);
                f.type = 'lowpass'; f.frequency.setValueAtTime(500, tt); f.frequency.linearRampToValueAtTime(1500, tt + .1); f.frequency.linearRampToValueAtTime(900, tt + len);
                g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(vol * (type === 'square' ? .35 : .5), tt + .06); g.gain.setValueAtTime(vol * .45, tt + len * .8); g.gain.linearRampToValueAtTime(0, tt + len);
                o.connect(f); f.connect(g); fo(g, 1, .5); o.start(tt); o.stop(tt + len + .05); } });
    }
    const FX = {
        attack: t => horn(t, [50, 57], .32, .09),                                       // troops march out: a short call
        send: t => { for (let i = 0; i < 3; i++) tone('sine', 110, t + i * .16, .18, .12, { to: 70 }); },   // marching drum
        scout: t => { tone('sine', 1300, t, .12, .03, { to: 1700 }); tone('sine', 1700, t + .1, .15, .025); },
        warn: t => horn(t, [45, 45, 48], .38, .12),                                     // someone marches on your base
        clash: t => { for (let i = 0; i < 4; i++) { const tt = t + i * (.18 + Math.random() * .12);
            for (const f of [2100, 3350, 5230]) tone('sine', f * (.95 + Math.random() * .1), tt, .25, .018, { wet: .4 }); noise(tt, .07, .06, 'highpass', 2500); } },
        victory: t => horn(t, [62, 66, 69, 74], .22, .1),                              // D major, up
        defeat: t => { tone('sine', 70, t, .7, .3, { to: 42 }); tone('sine', 70, t + .45, .8, .25, { to: 40 }); horn(t + .2, [53, 50], .45, .06); },
        event: t => horn(t, [45, 52, 57], .45, .11),
        crown: t => { horn(t, [62, 66, 69], .2, .1); horn(t + .62, [74], .9, .11); },
        upgrade: t => { noise(t, .06, .25, 'bandpass', 1800, 2); tone('sine', 160, t, .12, .2, { to: 90 }); noise(t + .22, .06, .2, 'bandpass', 2000, 2); tone('sine', 150, t + .22, .12, .16, { to: 85 }); },
        coin: t => { tone('sine', 1760, t, .18, .05, { wet: .3 }); tone('sine', 2350, t + .07, .25, .045, { wet: .3 }); },
        gem: t => { [2093, 2637, 3136].forEach((f, i) => tone('sine', f, t + i * .05, .3, .035, { wet: .5 })); },
        crate: t => { [587, 740, 880, 1175, 1480].forEach((f, i) => tone('triangle', f, t + i * .07, .5, .05, { wet: .6 })); noise(t, .35, .04, 'highpass', 6000); },
        click: t => noise(t, .025, .05, 'bandpass', 2600, 3),
        move: t => tone('sine', 520, t, .15, .03, { to: 700 }),
    };
    const GAP = { click: 60, coin: 90, clash: 900, warn: 6000, attack: 250, send: 250 };
    function play(name) {
        if (mode === 'off' || !FX[name]) return;
        const now = performance.now(); if (now - (lastFx[name] || 0) < (GAP[name] || 150)) return; lastFx[name] = now;
        if (!ac) init();
        if (ac.state === 'suspended') ac.resume();
        FX[name](ac.currentTime + .02);
    }
    window.__sfx = play;
    let phrase = null;
    function schedule() {
        while (nextAt < ac.currentTime + .4) {
            const chord = CHORDS[bar % CHORDS.length], t = nextAt, s8 = step % 8;
            if (!(s8 === 7 && Math.random() < .35)) lute(chord[PICK[s8]] + (s8 === 0 ? -12 : 0), t, s8 === 0 ? 1 : .55 + Math.random() * .3);
            if (s8 === 0 || (s8 === 4 && Math.random() < .7)) drum(t, s8 === 0 ? 1 : .6);
            if (s8 === 0 && bar % 16 >= 8) {                          // the flute joins every other section with a short phrase
                if (bar % 2 === 0) phrase = Array.from({ length: 3 }, () => FLUTE[Math.floor(Math.random() * FLUTE.length)]);
                if (phrase && Math.random() < .8) phrase.forEach((m, i) => flute(m, t + i * EIGHTH * 2, EIGHTH * 2.2));
            }
            nextAt += EIGHTH * (s8 % 2 ? .94 : 1.06); step++;         // a little swing, like a person playing
            if (step % 8 === 0) bar++;
        }
    }
    function fade(to, sec) { const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(to, t + sec); }
    function start() {
        if (!on) return;
        if (!ac) init();
        if (ac.state === 'suspended') ac.resume();
        if (!timer) { nextAt = ac.currentTime + .1; timer = setInterval(schedule, 100); }
        fade(.6, 2.5);
    }
    function stop() { if (!ac) return; fade(0, .6); clearInterval(timer); timer = null; if (mode === 'off') setTimeout(() => { if (!timer && ac && mode === 'off') ac.suspend(); }, 700); }
    function toggle() {                                            // three steps: music + effects → effects only → off (Profil → Einstellungen → Ton)
        mode = mode === 'all' ? 'sfx' : mode === 'sfx' ? 'off' : 'all'; store.set('openWaterSound', mode);
        on = mode === 'all'; on ? start() : stop();
        flashHint(mode === 'all' ? 'Musik und Effekte an' : mode === 'sfx' ? 'Nur Effekte – Musik aus' : 'Ton aus', 1800);
        if (mode !== 'off') { if (!ac) init(); if (ac.state === 'suspended') ac.resume(); }
    }
    document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) { clearInterval(timer); timer = null; ac.suspend(); } else if (on) start(); else if (mode !== 'off') ac.resume(); });
    const first = e => { window.removeEventListener('pointerdown', first, true); window.removeEventListener('keydown', first, true); start(); if (mode === 'sfx') { if (!ac) init(); ac.resume(); } };
    window.addEventListener('pointerdown', first, true); window.addEventListener('keydown', first, true);
    function setMode(m) { if (!['all', 'sfx', 'off'].includes(m) || m === mode) return; mode = m === 'all' ? 'off' : m === 'sfx' ? 'all' : 'sfx'; toggle(); }   // (Einstellungen) – über toggle, damit alles gleich bleibt
    return { toggle, start, stop, setMode, get on() { return on; }, get mode() { return mode; } };
})();

// ===== EINSTELLUNGEN (Profil → Einstellungen): Benachrichtigungen (benachrichtigung.js), Ton, Akku sparen, Konto, Hilfe =====
function einstellungenZeigen() {
    if (!isPanelOpen(profilePopup) || profilePopup.dataset.tab !== 'set') return;
    for (const b of document.querySelectorAll('#setTon [data-ton]')) { const on = b.dataset.ton === Music.mode; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
    document.getElementById('setAkku').checked = akkuSparen;
    setText(document.getElementById('setName'), profileName.value || '–');
    setText(document.getElementById('setNr'), String((window.__OW || {}).uid || '–'));
    const sc = document.querySelector('script[src*="spiel.js"]'), v = sc && /[?&]v=(\d+)/.exec(sc.src);
    setText(document.getElementById('setVersion'), v ? new Date(+v[1] * 1000).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–');
}
document.getElementById('setTon').addEventListener('click', e => { const b = e.target.closest('[data-ton]'); if (!b) return; Music.setMode(b.dataset.ton); einstellungenZeigen(); });
document.getElementById('setAkku').addEventListener('change', e => {
    akkuSparen = e.target.checked; store.set('openWaterAkku', akkuSparen ? '1' : '0'); onViewportResize();
    flashHint(akkuSparen ? 'Akku sparen: an' : 'Akku sparen: aus', 1500);
});
document.getElementById('setNameBtn').addEventListener('click', () => {   // der Name steht oben im Profil
    showProfileTab('info'); setTimeout(() => { profileName.focus(); profileName.select(); }, 50);
});
document.getElementById('setPwOffen').addEventListener('click', () => { const f = document.getElementById('setPwForm'); f.hidden = !f.hidden; if (!f.hidden) document.getElementById('setPwAlt').focus(); });
document.getElementById('setPwForm').addEventListener('submit', async e => {
    e.preventDefault();
    const alt = document.getElementById('setPwAlt'), neu = document.getElementById('setPwNeu'), neu2 = document.getElementById('setPwNeu2'), knopf = e.target.querySelector('button[type=submit]');
    if (neu.value.length < 10 || neu.value.length > 72) { flashHint('Das neue Passwort braucht 10 bis 72 Zeichen.', 3000); return; }
    if (neu.value !== neu2.value) { flashHint('Die beiden neuen Passwörter sind nicht gleich.', 3000); return; }   // (ein Tippfehler – und das Konto wäre weg)
    if (knopf.disabled) return; knopf.disabled = true;
    try {
        let geraet = '';                              // dieses Gerät behält seine Handy-Nachrichten (nur die anderen hören auf)
        try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); const sub = reg && reg.pushManager && await reg.pushManager.getSubscription(); if (sub) geraet = sub.endpoint; } catch (x) {}
        const r = await fetch('server.php', { method: 'POST', headers: { 'X-Open-Water': '1', 'Content-Type': 'application/json' }, credentials: 'same-origin', cache: 'no-store', body: JSON.stringify({ aktion: 'passwort', alt: alt.value, neu: neu.value, geraet }) });
        const a = await r.json();
        if (!a.ok) { flashHint(a.grund || 'Das hat nicht geklappt.', 3500); return; }
        alt.value = ''; neu.value = ''; neu2.value = ''; document.getElementById('setPwForm').hidden = true;
        flashHint('Passwort geändert. Andere Geräte sind jetzt abgemeldet.', 4000);
    } catch (x) { flashHint('Das hat nicht geklappt – bitte nochmal.', 3000); } finally { knopf.disabled = false; }
});
document.addEventListener('click', e => { const bt = e.target.closest && e.target.closest('button'); if (bt && !bt.disabled) sfx('click'); }, true);   // a soft wooden click on every button

(function finishSplash() {
    const sp = document.getElementById('splash');
    if (!sp) return;
    const skip = navigator.webdriver && !window.__FORCE_SPLASH;          // automated tests
    if (skip) { if (window.__stopSplashScene) window.__stopSplashScene(); sp.remove(); splashDone(); return; }
    const pctEl = document.getElementById('splashPct'), barEl = sp.querySelector('.splash-bar');
    (function pct() { if (!sp.isConnected) return; const f = document.getElementById('splashFill');
        const v = Math.min(100, Math.round(f.getBoundingClientRect().width / Math.max(1, barEl.clientWidth - 4) * 100)); pctEl.textContent = v + ' %'; requestAnimationFrame(pct); })();
    const statusEl = document.getElementById('splashStatus');   // (the tips rotate in the loading screen's own script)
    const steps = ['Welt wird erschaffen …', 'Inseln werden besiedelt …', 'Truppen werden gerüstet …', 'Bereit'];
    // Everything the map draws is painted once up front (every building, owner and size step), so nothing has to be
    // drawn for the first time while you play - no stutter when zooming or scrolling. Later: images and music too.
    const jobs = [], sizes = [16, 23, 32, 45, 64, 91, 128, 181];
    for (const size of sizes) for (const own of ['neutral', 'player', 'bot']) {
        for (let t = 0; t <= 4; t++) jobs.push(['tower', own, false, size, t]);
        jobs.push(['temple', own, false, size, 0], ['guardian', own, false, size, 0], ['mega', own, false, size, 0], ['gate', own, false, size, 0], ['gateShut', own, false, size, 0]);
    }
    for (const size of sizes) for (let t = 0; t <= 4; t++) jobs.push(['tower', 'player', true, size, t]);
    statusEl.textContent = 'Gebäude werden vorbereitet …';
    let ji = 0;
    (function work() {
        const until = performance.now() + 12;
        while (ji < jobs.length && performance.now() < until) { const j = jobs[ji++]; try { buildingSprite(j[0], j[1], j[2], j[3], j[4]); } catch (e) {} }
        if (ji < jobs.length) { statusEl.textContent = 'Gebäude werden vorbereitet … ' + Math.round(ji / jobs.length * 100) + ' %'; requestAnimationFrame(work); return; }
        finish();
    })();
    function finish() {
    const wait = Math.max(0, 2600 - performance.now());
    steps.slice(1, 3).forEach((t, i) => setTimeout(() => { statusEl.textContent = t; }, wait * (i + 1) / 3));
    setTimeout(() => {
        statusEl.textContent = steps[3];
        const fill = document.getElementById('splashFill');
        fill.style.width = getComputedStyle(fill).width;             // freeze the CSS animation where it is …
        sp.classList.add('is-done');
        requestAnimationFrame(() => { fill.style.width = '100%'; }); // … and finish from there
        setTimeout(() => {
            sp.classList.add('is-leaving');
            splashDone();
            setTimeout(() => { if (window.__stopSplashScene) window.__stopSplashScene(); sp.remove(); }, 800);
        }, 900);
    }, wait);
    }
})();

exploreOwned();                          // Nebel: the land around every own base is always known
renderActiveMarches();
if (bonusGrantedAtBoot) saveGame();      // a reload right after the first start must not lose the grant
updateZoomBounds(); clampCamera();
requestAnimationFrame(frame);

// Nichts markieren und kein Kopieren-Menü beim langen Drücken (außer in Eingabefeldern)
const feldErlaubt = t => t && t.closest && t.closest('input,textarea,select,[contenteditable]');
document.addEventListener('selectstart', e => { if (!feldErlaubt(e.target)) e.preventDefault(); });
document.addEventListener('contextmenu', e => { if (!feldErlaubt(e.target)) e.preventDefault(); });

// ===================================================================================================================
// ===== LIVE-ANZEIGE: was offen ist, zieht von selbst nach =====
// ===================================================================================================================
// Jede Sekunde – und gleich nach neuen Welt-Daten oder Münzen vom Server, aber höchstens 1× pro Sekunde – werden NUR die
// gerade sichtbaren Fenster neu gerechnet. liveHtml schreibt davon nur, was sich wirklich geändert hat (kein Flackern,
// Knöpfe bleiben antippbar, die Scroll-Position bleibt), die Restzeiten (uhrHtml) zählen von selbst herunter.
// Läuft eine Restzeit ab (z. B. der Friedensschild), stellt das Fenster beim nächsten Schritt um.
let liveZuletzt = 0, liveWartet = 0, liveTitelVer = -1, liveRangAt = 0, liveSkillSig = '', liveGemeldet = false;
function liveBald() {                                  // neue Daten: gleich nachziehen, aber höchstens 1× pro Sekunde
    if (liveWartet) return;
    liveWartet = setTimeout(() => { liveWartet = 0; liveTick(); }, Math.max(0, liveZuletzt + 1000 - Date.now()));
}
function liveTick() {
    if (SYSTEM || document.hidden) return;              // (der Weltrechner zeigt nichts an, ein Tab im Hintergrund auch nicht)
    liveZuletzt = Date.now();
    const offen = id => { const el = document.getElementById(id); return !!el && !el.hidden; };
    const teil = f => { try { f(); } catch (e) { if (!liveGemeldet) { liveGemeldet = true; console.warn('Live-Anzeige:', e); } } };
    if (!cityView.hidden && cityOpenId && offen('citySheet')) teil(renderCitySheet);                    // Burg / Gebäude: Schild, Kosten, Knopf
    if (isPanelOpen(popup) && popupIslandId !== null) teil(renderPopup);                                  // Inselfenster
    if (welcomeLive) teil(welcomeNachziehen);                                                               // Begrüßung
    if (isPanelOpen(profilePopup)) teil(() => {                                                             // Profil
        renderProfile(true);
        const tab = profilePopup.dataset.tab;
        if (tab === 'equip') renderEquipGrid();
        if (tab === 'skills') { const sig = skillPoints + JSON.stringify(skills); if (sig !== liveSkillSig) { liveSkillSig = sig; renderSkillGrid(); } }
    });
    if (isPanelOpen(shopPopup)) teil(renderShop);                                                         // Shop: Gems, Schild-Restzeit, Thron-Punkte
    if (isPanelOpen(goalsPopup) && goalsTab === 'reward') teil(renderInbox);                              // Events → Belohnung
    if (isPanelOpen(rankPopup) && liveZuletzt - liveRangAt >= 5000) { liveRangAt = liveZuletzt; teil(renderRankings); }   // Rangliste: alle 5 s reicht
    teil(heroHallLive);                                                                                     // Helden
    if (offen('lookSheet')) teil(() => renderLookSheet(true));                                             // Aussehen: Gems / Thron-Punkte
    if (fieldSheetId !== null && fieldById[fieldSheetId] && offen('fieldSheet')) teil(() => openFieldSheet(fieldById[fieldSheetId]));
    if (offen('barbSheet')) teil(barbSheetRefresh);
    if (armySheet && offen('armySheet')) teil(renderArmySheet);
    if (multiAttackMode) teil(updateMultiAttackBar);
    if (offen('titleModal') && titleVer !== liveTitelVer && !document.getElementById('titleList').contains(document.activeElement)) { liveTitelVer = titleVer; teil(renderTitleModal); }   // (nie mitten in einer Auswahl)
    teil(() => { if (liveUhren()) liveBald(); });     // alle Restzeiten weiter; ist eine abgelaufen, gleich noch einmal
}
setInterval(liveTick, 1000);

// ===================================================================================================================
// ===== DIE EINE WELT: Verbindung zu welt.js =====
// ===================================================================================================================
if (window.WELT) {
    const PJ = k => { try { return JSON.parse(store.get(k)); } catch (e) { return null; } };
    // (Zuschauer) neue Welt-Teile vom Server → in die laufenden Spiel-Variablen übernehmen
    window.__weltLaden = function (keys) {
        const k = new Set(keys);
        if (k.has('openWaterPlayerIslandId')) { const v = parseInt(store.get('openWaterPlayerIslandId'), 10); if (!Number.isNaN(v) && islandById[v]) { playerIslandId = v; capitalCache = null; } }
        if (k.has('openWaterOwnedIslands')) { const neu = new Set(PJ('openWaterOwnedIslands') || []); for (const id of [...ownedIslands]) if (!neu.has(id)) ownedIslands.delete(id); for (const id of neu) ownedIslands.add(id); }
        if (k.has('openWaterBotOwnedIslands')) {
            const r = PJ('openWaterBotOwnedIslands') || {};
            for (const bot of BOT_DEFS) { const set = botOwnedIslands[bot.id] || (botOwnedIslands[bot.id] = new BotBaseSet(bot.id)); const neu = new Set(r[bot.id] || []); for (const id of [...set]) if (!neu.has(id)) set.delete(id); }
            for (const bot of BOT_DEFS) for (const id of r[bot.id] || []) botOwnedIslands[bot.id].add(id);
        }
        if (k.has('openWaterIslandLevels')) { islandLevels = PJ('openWaterIslandLevels') || {}; for (const isl of islands) if (isl.neutralLevel > 1 && islandLevels[isl.id] === undefined) islandLevels[isl.id] = isl.neutralLevel; ausbauDrueber(); }
        if (k.has('openWaterIslandTroops')) islandTroops = PJ('openWaterIslandTroops') || {};
        if (k.has('openWaterNeutralTroopOverrides')) { neutralTroopOverrides = PJ('openWaterNeutralTroopOverrides') || {}; for (const id in neutralTroopOverrides) if (islandById[id]) islandById[id].neutralTroops = neutralTroopOverrides[id]; }
        if (k.has('openWaterTempleHoldSince')) templeHoldSince = PJ('openWaterTempleHoldSince') || {};
        if (k.has('openWaterGateCfg')) gateCfg = null;
        if (k.has('openWaterPendingAttacks')) pendingAttacks = PJ('openWaterPendingAttacks') || [];
        if (k.has('openWaterPendingSends')) pendingSends = PJ('openWaterPendingSends') || [];
        if (k.has('openWaterPendingRetreats')) pendingRetreats = PJ('openWaterPendingRetreats') || [];
        if (k.has('openWaterTitles')) { titleState = PJ('openWaterTitles'); titleVer++; ringMemo = null; }
        if (k.has('openWaterThrone')) throneState = PJ('openWaterThrone') || { pts: 0 };
        if (k.has('openWaterBounty')) bountyState = PJ('openWaterBounty') || { ruler: null, gems: 0, coins: 0 };
        if (k.has('openWaterWander') || k.has('openWaterWanderNext')) { wander = undefined; loadWander(); }
        if (k.has('openWaterFields')) fieldState = PJ('openWaterFields') || {};
        if (k.has('openWaterFieldMarches')) fieldMarches = PJ('openWaterFieldMarches') || [];
        if (k.has('openWaterBarb')) barbState = PJ('openWaterBarb') || { camps: [], n: 0, next: 0 };
        if (k.has('openWaterBarbMarches')) barbMarches = PJ('openWaterBarbMarches') || [];
        if (k.has('openWaterPendingAttacks') || k.has('openWaterPendingSends') || k.has('openWaterPendingRetreats') || k.has('openWaterBarbMarches') || k.has('openWaterFieldMarches')) { vorlaeufigDrueber(); schnellerDrueber(); }
        if (k.has('openWaterBarbWho')) barbWho = PJ('openWaterBarbWho') || {};
        if (k.has('openWaterDayBoss')) dayBoss = PJ('openWaterDayBoss');
        if (k.has('openWaterEvents')) evState = PJ('openWaterEvents') || {};
        if (k.has('openWaterArmies')) { const a = PJ('openWaterArmies') || {}; armies = a.armies || []; armyJoins = a.joins || []; armyRaids = a.raids || []; }
        if (k.has('openWaterBotState')) { if (botSaveTimer) { clearTimeout(botSaveTimer); botSaveTimer = null; } botState = null; loadBotState(); }
        if (k.has('openWaterBotCoins')) { botCoins = PJ('openWaterBotCoins') || {}; for (const bot of BOT_DEFS) if (!botCoins[bot.id]) botCoins[bot.id] = 0; }
        ownVer++; capitalCache = null;
        try { refreshTerritory(); } catch (e) {}
        if (!isPanelOpen(battleLogPopup)) renderActiveMarches();
        updateHud(); requestRender();
        if (isPanelOpen(popup)) renderPopup();
    };
    // (Weltrechner) vor dem Puls: alles, was noch in einem Speicher-Timer wartet, jetzt in die Daten schreiben
    window.__weltVorPuls = function () {
        try { saveGameNow(); } catch (e) {}
        try { flushBotState(); } catch (e) {}
        try { saveProgressionNow(); } catch (e) {}
        try { saveThrone(); saveBounty(); } catch (e) {}
        try { if (titleState) store.set('openWaterTitles', JSON.stringify(titleState)); } catch (e) {}
        try { if (wander !== undefined) saveWander(); } catch (e) {}
        try { saveFields(); saveBarb(); saveArmies(); if (evDirty) saveEv(); } catch (e) {}
        try { wacheRunde(); } catch (e) { console.warn('Schummel-Schutz:', e); }   // (unten) Konten der Spieler + wartende Befehle
    };
    // Weltrechner geworden / nicht mehr
    window.__weltLeiterWechsel = function (an, neu, weltZeit) {
        if (an) {
            if (weltZeit && Date.now() - weltZeit > 60000) weltNachholen(weltZeit);   // niemand hat gerechnet: nachholen
            nextProductionTickAt = Date.now() + productionTickMs();
        } else WELT.version = 0;                       // die Welt beim nächsten Puls ganz neu holen (meine Rechnung zählt nicht mehr)
    };
    // ein neuer echter Spieler ist dazugekommen
    window.__weltNeuerMensch = function (id) {
        const bd = BOT_DEFS.find(b => b.id === id); if (!bd) return;
        botById[id] = bd;
        if (!botOwnedIslands[id]) botOwnedIslands[id] = new BotBaseSet(id);
        if (!botCoins[id]) botCoins[id] = 0;
        const bs = loadBotState(); bs[id] = WELT.profilZuBot(WELT.menschen[id] && WELT.menschen[id].profil, bs[id], id);   // (Weltrechner: gegen das Hauptbuch geklemmt – 3B)
        capitalCache = null; requestRender();
    };
    // (Weltrechner) Befehle der anderen Spieler ausführen
    const gehoert = (id, who) => islandOwnerOf(id) === who;
    function nichtLos(who, grp, src, was, grund) {   // ein Befehl ging nicht los: dem Spieler sagen, warum (Marsch-Plätze, sonst Weg/Maut/Schild)
        if (typeof bundMelden !== 'function') return;
        bundMelden(who, was + ' ist nicht losgegangen – ' + (grund ? grund + '. Deine Truppen bleiben, wo sie sind.' : AUF && !AUF.marschOk(who, grp, src) ? AUF.marschVoll(who) : 'kein Weg frei (Tor zu, Maut zu teuer, Friedensschild oder zu wenig Truppen). Deine Truppen bleiben, wo sie sind.'));
    }
    const marschVon = (who, key) => pendingAttacks.find(x => x.attackerBotId === who && marchKeyOf(x) === key) || pendingSends.find(x => x.senderBotId === who && marchKeyOf(x) === key) || feldBarbMarsch(who, key);

    // ===== Schummel-Schutz (nur beim Weltrechner) =====
    // Münzen, Gems und Stufe eines Spielers rechnet noch sein eigenes Handy. Ein Schummler könnte also Befehle fälschen
    // („gib mir Truppen“, „Basis auf Stufe 99“), ohne zu bezahlen. Darum prüft der Weltrechner hier jeden Befehl:
    //   - Zahlen nur endlich und größer 0, mit Obergrenze; Kennungen nur Buchstaben/Ziffern; nur eigene Basen
    //   - Truppen-Geschenke nur so viel, wie die Quelle wirklich hergibt (Stufe, Thron-Shop, Krankenhaus, Fund, Admin-Geschenk)
    //   - Ausbau nur genau +1 Stufe und nur, wenn er die Münzen haben kann (eigenes „Konto“, siehe wacheSehen)
    //   - zu viele Befehle in kurzer Zeit → der Rest verfällt
    // Echte Spieler werden nie blockiert: passt etwas (noch) nicht, wartet der Befehl bis zu 60 s auf das nächste Profil
    // (das Handy schickt es alle 10 s). Was abgelehnt/gekappt wird oder auffällig springt, landet in WELT.warnungen →
    // weltrechner/start.js schreibt es in weltrechner/schummel.php → admin.php zeigt es unter „Auffälligkeiten“.
    WELT.warnungen = WELT.warnungen || [];
    const WACHE_WARTEN_MS = 60000, WACHE_MAX = 1e30;   // (wie der Server/Prüfer: Truppen dürfen nach langem Spielen riesig werden – Alexander 4.10.; vorher 1e15 = Angriffe/Senden über 1 Billiarde wurden still abgelehnt)
    const zahlOk = (v, max) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= (max || WACHE_MAX);
    const inselOk = v => Number.isInteger(v) && !!islandById[v];
    const kennungOk = v => typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(v);
    const nn = v => typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;      // nie negativ, nie kaputt
    const fz = n => fmtCompact(Math.round(n));
    function warnen(who, was, text, wert) {
        const uid = parseInt(String(who).slice(1), 10); if (!(uid > 0)) return;
        WELT.warnungen.push({ uid, was, text: String(text).slice(0, 300), wert: nn(wert), zeit: Date.now() });
        if (WELT.warnungen.length > 500) WELT.warnungen.splice(0, WELT.warnungen.length - 500);   // start.js holt sie alle 5 s ab
    }
    // Merkzettel je Spieler: im Arbeitsspeicher (wacheMem) und – was einen Neustart überleben muss – in der Welt (bs.wache)
    const wacheMem = {};
    const konto = () => ({ u: 0, vor: 0, vorT: 0 });   // u: so viel kann er höchstens haben · vor: gerade ausgegeben (sein Handy zeigt schon weniger)
    const wm = who => wacheMem[who] || (wacheMem[who] = { init: false, zeiten: {}, warte: { ausbau: [], truppen: [] }, c: konto(), w: konto(), g: konto(), rk: null, sr: [], ein: [], flug: [], lvlLog: [], lvl: 1, rEin: [], rsr: [] });
    function wd(who) {   // lv: bis zu welcher Stufe die Stufen-Truppen bezahlt sind, tk: Thron-Truppen gekauft, gTr/gC: Admin-Geschenke (Truppen/Münzen)
        const b = loadBotState()[who]; if (!b) return null;
        if (!b.wache || typeof b.wache !== 'object') b.wache = { lv: 0, tk: 0, gTr: 0, gC: 0 };
        return b.wache;
    }
    function zuOft(m, art, max, ms) {    // mehr als max-mal in ms? (dann zählt dieser nicht mit)
        const now = Date.now(), l = m.zeiten[art] || (m.zeiten[art] = []);
        while (l.length && now - l[0] > ms) l.shift();
        if (l.length >= max) return true;
        l.push(now); return false;
    }
    const profilVon = who => { const x = WELT.menschen[who]; return x && x.profil && typeof x.profil === 'object' ? x.profil : null; };
    const zahlOderNull = v => typeof v === 'number' && Number.isFinite(v) ? v : 0;
    // Das „Konto“ eines Spielers: wie viele Münzen (und Verwundete) KANN er höchstens haben – unabhängig von seinem Handy:
    //   + genau das, was der Weltrechner ihm schickt (Nachrichten „delta“: Produktion, Beute, Maut, Kämpfe, EP, Verwundete –
    //     mitgezählt in wacheDelta, bevor welt.js sie verschickt)
    //   + ein Spielraum pro Stunde für das, was nur sein Handy gibt (Stufen-Belohnung, Thron-Shop, Saison-Pass, Funde)
    //   + Admin-Geschenke (admin.php meldet sie dem Weltrechner als Gutschrift)
    // Zeigt sein Profil weniger, gilt das Profil (er hat ausgegeben – der Unterschied ist „Vorschuss“ für Befehle, die
    // gleich noch kommen). Zeigt es mehr, als möglich ist → Warnung, das Konto bleibt beim Möglichen.
    // Nachrichten können noch „unterwegs“ sein (sein Profil kennt sie noch nicht): bis zu ein paar Sekunden, und wenn er
    // offline ist, bis er wiederkommt (das erste Profil danach entsteht, bevor sein Handy sie abholt). Darum zählen
    // Nachrichten als unterwegs, bis danach zwei Profile von ihm kamen (m.flug, je Minute zusammengefasst).
    // EP kommen nur vom Weltrechner (Kämpfe): daraus folgt die höchste Stufe, die er haben kann (m.lvl).
    // Spielraum pro Stunde: Stufen-Münzen der letzten Stunde (+ nächste Stufe) und ein paar Stunden-Einnahmen (Thron-Shop,
    // Saison-Pass zahlen „eine Stunde Produktion“). Die Stunden-Einnahme ist GEMESSEN (was der Weltrechner ihm in der
    // letzten Stunde schickte) – nie aus seinen jetzigen Basis-Stufen, sonst würde ein erschlichener Ausbau den Spielraum
    // gleich weiter vergrößern. Am Anfang (noch keine Stunde gemessen) gilt die Produktion beim ersten Sehen (m.hp0).
    const FLUG_MS = 10000, FLUG_MAX_MS = 48 * 3600000;
    // Zwei Töpfe (Alexander 5.10.): Stufen-Münzen (sicher: die EP kommen vom Weltrechner) je Stunde – der feste Rest nur EINMAL
    // am Tag (vorher jede Stunde neu: ~8 Mio. Münzen am Tag „ohne Beleg“). Der Tages-Topf steht in der Welt (überlebt Neustarts).
    function spielraumTeile(who, m) {
        const L = Math.max(1, m.lvl), now = Date.now();
        let von = L; for (const x of m.lvlLog) if (x.l < von) von = x.l;
        let lv = 0; for (let l = Math.max(2, von); l <= L + 1 && l <= von + 300; l++) lv += levelRewardCoins(l);
        while (m.ein.length && now - m.ein[0].t > 3600000) m.ein.shift();
        const gemessen = m.ein.reduce((a, x) => a + x.n, 0), dauer = now - m.initT;
        const stunde = dauer >= 3600000 ? gemessen : Math.max(m.hp0, gemessen * 3600000 / Math.max(dauer, 600000));
        return { lv, fix: 50000 + 3 * Math.max(5000, stunde) + 3 * levelRewardCoins(L + 1) };
    }
    function spielraumTag(who) { const d = wd(who), t = todayKey(); if (!d) return null; if (d.srT !== t) { d.srT = t; d.srN = 0; } return d; }
    function spielraumNehmen(who, m, n) {           // n Münzen aus dem Spielraum: erst die Stufen-Münzen (Stunde), dann der Tages-Topf
        if (!(n > 0)) return; const now = Date.now(), { lv } = spielraumTeile(who, m);
        const a = Math.min(n, Math.max(0, lv - m.sr.reduce((s, x) => s + x.n, 0))); if (a > 0) m.sr.push({ t: now, n: a });
        const d = spielraumTag(who); if (d && n - a > 0) { d.srN = nn(d.srN) + n - a; saveBotState(); }
    }
    // Münzen, die auf einmal kommen dürfen: Saison-Pass (je Saison höchstens die Münz-Stufen beider Reihen) und Thron-Shop
    // (so viele Käufe, wie seine Thron-Punkte hergeben – die zählt der Weltrechner selbst). Gemessen in Stunden Ertrag.
    let passMuenzH = null;
    function muenzGutscheine(who, mehr, d) {
        if (!d || !(mehr > 0)) return 0;
        if (passMuenzH === null) { passMuenzH = 0; for (let L = 1; L <= PASS_LVLS; L++) for (const pr of [false, true]) { const r = passRewardAt(L, pr); if (r.k === 'coins') passMuenzH += r.n || 1; } }
        const h = Math.max(5000, nn(hourProduction(who).coins)) * 1.2, s = passNo(Date.now());   // (+20 %: sein Handy rechnet mit eigenen Boni)
        if (d.pS !== s) { d.pS = s; d.pM = 0; }
        const passRest = Math.max(0, passMuenzH - nn(d.pM)), thronRest = Math.max(0, Math.floor(throneEarnedOf(who) / 150) + 3 - nn(d.tC));
        const use = Math.min(mehr, (passRest + thronRest) * h); if (!(use > 0)) return 0;
        const ausPass = Math.min(use / h, passRest); d.pM = nn(d.pM) + ausPass; d.tC = nn(d.tC) + (use / h - ausPass); saveBotState();
        return use;
    }
    function spielraumFrei(who, m) {
        const now = Date.now(); while (m.sr.length && now - m.sr[0].t > 3600000) m.sr.shift();
        const { lv, fix } = spielraumTeile(who, m), d = spielraumTag(who);
        return Math.max(0, lv - m.sr.reduce((a, x) => a + x.n, 0)) + Math.max(0, fix - (d ? nn(d.srN) : 0));
    }
    // (welt.js → Server) jede Nachricht „delta“ an einen Spieler mitzählen – genau das kommt bei ihm an
    // Unterwegs (m.flug): je Art (c Münzen, w Verwundete, g Gems, h/s/e Rohstoffe) P = dazu, M = weg
    const FLUG_K = ['c', 'w', 'g', 'h', 's', 'e'];
    function wacheDelta(who, e) {
        const m = wacheSehen(who); if (!m.init) return;
        const now = Date.now(), x = { c: zahlOderNull(e.coins), w: zahlOderNull(e.wounded), g: zahlOderNull(e.gems) };
        if (e.res && typeof e.res === 'object') for (const k of ROHK) x[k] = zahlOderNull(e.res[k]);   // Paket D: Rohstoffe wie die Münzen mitzählen
        m.c.u = Math.max(0, m.c.u + x.c); m.w.u = Math.max(0, m.w.u + x.w); m.g.u = Math.max(0, m.g.u + x.g);
        if (m.rk) for (const k of ROHK) if (x[k]) m.rk[k].u = Math.max(0, m.rk[k].u + x[k]);
        if (x.c > 0) { const t = now - now % 60000, l = m.ein[m.ein.length - 1]; if (l && l.t === t) l.n += x.c; else m.ein.push({ t, n: x.c }); }   // Einnahmen je Minute
        for (const k of ROHK) if (x[k] > 0) { const t = now - now % 60000, l = m.rEin[m.rEin.length - 1]; if (l && l.t === t) l[k] += x[k]; else m.rEin.push(Object.assign({ t, h: 0, s: 0, e: 0 }, { [k]: x[k] })); }
        if (FLUG_K.some(k => x[k])) { let f = m.flug[m.flug.length - 1]; if (!f || f.n || now - f.t > 60000) m.flug.push(f = { t: now, n: 0, P: {}, M: {} });
            for (const k of FLUG_K) if (x[k] > 0) f.P[k] = (f.P[k] || 0) + x[k]; else if (x[k] < 0) f.M[k] = (f.M[k] || 0) - x[k]; }
        m.xpRest += nn(e.xp);
        for (let i = 0; i < 1000 && m.xpRest >= xpNeededForLevel(m.lvl); i++) { m.xpRest -= xpNeededForLevel(m.lvl); m.lvl++; }
        const d = wd(who); if (d) d.lm = m.lvl;
        const hb = hbDa(who);                          // 3B: sichere Helden-Splitter fürs Hauptbuch
        if (hb && e.sh && typeof e.sh === 'object') for (const h in e.sh) if (zahlOk(e.sh[h], 1e6)) hb.shB += e.sh[h];
    }
    // (3B) andere Nachrichten des Weltrechners an ihn: Preise (Gems, Splitter, Kisten), Bündnis-Geschenke, Startschild
    function wacheNachricht(who, e) {
        const hb = hbDa(who); if (!hb) return;
        if (e.art === 'evPreis' || e.art === 'bundGeschenk') {
            if (zahlOk(e.gems, 1e7)) hb.gIn += e.gems;                         // liegt im Abholfach – kommt später in seinem Profil an
            if (zahlOk(e.sh, 1e6)) hb.shB += e.sh;
            if (Number.isInteger(e.crate) && e.crate >= 0 && e.crate <= 5) hbKisteDazu(hb, e.crate);
        }
        if (e.art === 'startschild' && zahlOk(e.bis, 1e15)) hb.schild = Math.max(nn(hb.schild), e.bis);
        if (e.art === 'haendlerWare') {                // beim Händler mit Münzen bezahlt: die Ware ist bezahlt (vorher verlangte das Hauptbuch sie nochmal in Gems)
            if (zahlOk(e.sh, 1e3)) hb.shB += e.sh;
            if (Number.isInteger(e.kiste) && e.kiste >= 0 && e.kiste <= 2) hbKisteDazu(hb, e.kiste);
            if (e.schild === 2) hb.fr.schild = nn(hb.fr.schild) + 2;
        }
        saveBotState();
    }
    if (Array.isArray(WELT.ereignisseRaus)) {        // (nur zuschauen – welt.js verschickt die Liste wie bisher)
        const raus = WELT.ereignisseRaus;
        raus.push = function (...xs) {
            for (const x of xs) try { if (x && x.e && x.an > 0) { if (x.e.art === 'delta') wacheDelta('u' + x.an, x.e); else wacheNachricht('u' + x.an, x.e); } } catch (e) { console.warn('Schummel-Schutz:', e); }
            return Array.prototype.push.apply(this, xs);
        };
    }
    // Ein Wert aus seinem neuen Profil gegen das Konto k halten (für Münzen und Verwundete gleich).
    // → wie viel MEHR das Profil zeigt, als möglich ist (vor Spielraum/Geschenk); 0 = in Ordnung
    function kontoProfil(k, pw, flugPlus, flugMinus, now) {
        const hi = k.u + flugMinus, lo = Math.max(0, k.u - flugPlus);   // hi: er kennt die Nachrichten unterwegs schon, lo: noch nicht
        if (pw > hi) { k.u = pw; return pw - hi; }
        if (pw < lo) { k.vor = (now - k.vorT < WACHE_WARTEN_MS ? k.vor : 0) + (lo - pw); k.vorT = now; k.u = pw + flugPlus; }
        return 0;                                       // dazwischen: unklar, wie viel unterwegs schon drin ist – das Konto bleibt
    }
    // Rohstoffe (Paket D, 3B): ein Konto je Rohstoff wie bei den Münzen = was der Weltrechner ihm geschickt hat. Mehr im Profil
    // (Markt-Kauf) geht nur im Spielraum pro Stunde (2.000 + ¼ Stunde seiner Einnahmen + Markt-Tageslimit), der Rest
    // ist auffällig und zählt nicht. Was sein Profil weniger zeigt, hat er ausgegeben (Topf hb.rA – bezahlt Burg, Gebäude,
    // Forschung, Truppen-Stufe im Hauptbuch).
    const ROHK = ['h', 's', 'e'];
    function rohWacheProfil(who, m, p, P, M, now) {
        if (!p || !p.res || typeof p.res !== 'object') return;
        m.rDeckel = null; m.rDeckelP = p;              // (die Grenze gilt für genau dieses Profil – auch wenn es nochmal angewendet wird)
        const hb = hbDa(who);
        if (!m.rk) { m.rk = {}; for (const k of ROHK) { m.rk[k] = konto(); m.rk[k].u = nn(p.res[k]); } return; }   // zum ersten Mal (und das Hauptbuch weiß noch nichts): geeicht
        while (m.rEin.length && now - m.rEin[0].t > 3600000) m.rEin.shift();
        while (m.rsr.length && now - m.rsr[0].t > 3600000) m.rsr.shift();
        let lim = 0, preis = 0; try { lim = AUF ? AUF.marktLimit(who) / AUF.MARKT_WERT : 0; preis = lim ? AUF.MARKT_WERT * (1 + AUF.marktGebuehr(AUF.marktStufe(who))) : 0; } catch (e) {}
        const d = wd(who), heute = todayKey(); if (d && (!d.rm || d.rm.t !== heute)) d.rm = { t: heute, n: 0 };   // Markt-Käufe heute (alle drei Rohstoffe zusammen, wie am Handy – überlebt Neustarts)
        for (const k of ROHK) {
            const pr = nn(p.res[k]), kk = m.rk[k]; let mehr = kontoProfil(kk, pr, P[k] || 0, M[k] || 0, now);
            if (kk.vor > 0) { if (hb) hb.rA[k] = nn(hb.rA[k]) + kk.vor; kk.vor = 0; }      // ausgegeben → Topf
            if (mehr <= 0) continue;
            const stunde = m.rEin.reduce((a, x) => a + x[k], 0), raum = Math.max(0, 2000 + .25 * Math.max(stunde, (m.rHp0 || {})[k] || 0) - m.rsr.reduce((a, x) => a + (x[k] || 0), 0));
            const nimm = Math.min(mehr, raum); if (nimm > 0) m.rsr.push({ t: now, [k]: nimm }); mehr -= nimm;
            if (mehr > 0 && d && hb && lim > d.rm.n) {     // Markt-Kauf: höchstens das Tageslimit – und die Münzen dafür werden abgebucht (vorher: jede Stunde neu und gratis)
                const markt = Math.min(mehr, Math.floor(lim - d.rm.n));
                if (markt > 0 && hbZahlen(who, hb, m, { c: Math.ceil(markt * preis) })) { d.rm.n += markt; mehr -= markt; saveBotState(); } }
            if (mehr >= 1) { kk.u = pr - mehr; warnen(who, 'rohstoffe', AUF.ROH_DEF[k].name + ' springt: das Handy sagt ' + fz(pr) + ', möglich wären höchstens ' + fz(pr - mehr) + '.', mehr);
                (m.rDeckel || (m.rDeckel = {}))[k] = pr - mehr; }   // (in der Welt nur, was möglich ist – hbKlemmen deckelt gleich – sonst holt ein anderer die erfundenen Rohstoffe als Beute)
        }
    }
    // Münzen, die er ausgegeben hat und die kein Befehl abgeholt hat (nach 60 s) → Topf hb.cA (bezahlt Bauen/Forschen im Hauptbuch)
    function vorAltern(who, m, now) { if (m.c.vor > 0 && now - m.c.vorT > WACHE_WARTEN_MS) { const hb = hbDa(who); if (hb) hb.cA = nn(hb.cA) + m.c.vor; m.c.vor = 0; } }
    // Nachrichten unterwegs (m.flug) zusammengezählt – für einen Neustart in der Welt gemerkt (bs.wache.fl, klein: nur die Summen)
    function flugSumme(m) { const P = {}, M = {}; for (const f of m.flug) { for (const k in f.P) P[k] = (P[k] || 0) + f.P[k]; for (const k in f.M) M[k] = (M[k] || 0) + f.M[k]; } return { P, M }; }
    function flugMerken(d, m) {
        const { P, M } = flugSumme(m), rund = o => { const r = {}; for (const k of FLUG_K) if (o[k] >= 1) r[k] = Math.round(o[k]); return r; }, p = rund(P), mm = rund(M);
        if (!Object.keys(p).length && !Object.keys(mm).length) { if (d.fl) delete d.fl; return; }
        const t = m.flug.reduce((a, f) => Math.min(a, f.t), Infinity);
        if (!d.fl || JSON.stringify(d.fl.P) !== JSON.stringify(p) || JSON.stringify(d.fl.M) !== JSON.stringify(mm)) d.fl = { t, P: p, M: mm };
    }
    function flugAus(fl, now) {                        // (nach dem Neustart) → ein Eintrag für m.flug – zählt wieder bis zwei Profile später
        if (!fl || typeof fl !== 'object') return null; const t = zahlOk(fl.t) && fl.t <= now ? fl.t : now, P = {}, M = {};
        if (now - t >= FLUG_MAX_MS) return null;
        for (const k of FLUG_K) { if (zahlOk((fl.P || {})[k], 1e15)) P[k] = fl.P[k]; if (zahlOk((fl.M || {})[k], 1e15)) M[k] = fl.M[k]; }
        return Object.keys(P).length || Object.keys(M).length ? { t, n: 0, P, M } : null;
    }
    function wacheSehen(who) {
        const m = wm(who), p = profilVon(who), b = loadBotState()[who]; if (!b) return m;
        const now = Date.now(), d = wd(who), hb = b.hb && b.hb.v === HB_V ? b.hb : null;
        if (!m.init) {                                 // zum ersten Mal gesehen (auch nach einem Neustart des Weltrechners)
            m.init = true; m.prof = p; m.initT = now;
            try { m.hp0 = nn(hourProduction(who).coins); } catch (e) { m.hp0 = 0; }
            // Was der Weltrechner schon über ihn weiß, steht in der Welt (bs.wache) – das zählt mehr als sein Profil in der
            // Datenbank (das hat ja sein Handy geschickt). Nur wer noch nie gesehen wurde, wird einmal am Profil „geeicht“.
            m.geeicht = Number.isFinite(d.u);
            const fl = m.geeicht ? flugAus(d.fl, now) : null, fP = fl ? fl.P : {}; if (fl) m.flug = [fl];   // Nachrichten, die vor dem Neustart noch unterwegs waren (sein Profil kennt sie evtl. noch nicht)
            m.c.u = p ? nn(p.coins) : nn(botCoins[who]); if (m.geeicht) m.c.u = Math.min(m.c.u + nn(fP.c), d.u) + m.hp0 * 0.25;   // (+ eine Viertelstunde: was zuletzt nicht mehr gespeichert wurde)
            m.w.u = p ? nn(p.wounded) : nn(b.wounded); if (Number.isFinite(d.w)) m.w.u = Math.min(m.w.u + nn(fP.w), d.w) + 1000;
            const gHb = !!(hb && Number.isFinite(hb.gU));   // 3B: Gems wie die Münzen (das Hauptbuch weiß es besser als das Profil)
            m.g.u = gHb ? hb.gU : p ? nn(p.gems) : 0; m.gGeeicht = gHb || !!(p && p.gems != null);
            if (m.geeicht && p && nn(p.coins) + nn(fP.c) < d.u) { m.c.vor = d.u - nn(fP.c) - nn(p.coins); m.c.vorT = now; }   // während der Weltrechner weg war ausgegeben: wie ein normaler Rückgang (bezahlt wartende Befehle – nie doppelt; was noch unterwegs ist, hat er nicht ausgegeben)
            m.lvl = Number.isFinite(d.lm) && d.lm >= 1 ? d.lm : Math.max(1, Math.floor(nn(p ? p.lvl : b.lvl) || 1));
            m.xpRest = xpNeededForLevel(m.lvl) - 1;    // wie voll sein Balken ist, weiß niemand: voll (großzügig)
            m.lvlLog = [{ t: now, l: m.lvl }];
            m.rEin = []; m.rk = null; try { m.rHp0 = AUF ? AUF.rohStunde(who) : null; } catch (e) { m.rHp0 = null; }
            if (hb && hb.rU) { m.rk = {}; for (const k of ROHK) { m.rk[k] = konto(); m.rk[k].u = nn(hb.rU[k]); } m.rkNeu = true; }   // (3B: was der Weltrechner weiß – gleich ab jetzt mitzählen; das Profil prüft hbKlemmen einmal dagegen)
            else if (p && p.res) rohWacheProfil(who, m, p, {}, {}, now);
        }
        m.flug = m.flug.filter(f => !(f.n >= 2 && now - f.t > FLUG_MS) && now - f.t < FLUG_MAX_MS);   // angekommen (zwei Profile später) oder uralt
        if (p && p !== m.prof && !m.geeicht) {         // noch nie gesehen: das erste frische Profil gilt (das in der Datenbank kann
            m.prof = p; m.geeicht = true;              // älter sein als sein Spielstand) – ab hier wird gezählt
            m.c.u = nn(p.coins); m.w.u = nn(p.wounded); const gNeu = !m.gGeeicht && p.gems != null; if (gNeu) { m.g.u = nn(p.gems); m.gGeeicht = true; }
            if (b.zEich) { m.eichT = nn((WELT.menschen[who] || {}).profilZeit); m.gEichT = m.eichT; delete b.zEich; }   // (nach dem Zurückspielen: Befehle von davor sind in diesem Profil schon bezahlt)
            for (const f of m.flug) { m.c.u += f.P.c || 0; m.w.u += f.P.w || 0; if (gNeu) m.g.u += f.P.g || 0; f.n++; }
            const pl = Math.max(1, Math.floor(nn(p.lvl) || 1)); if (pl > m.lvl) { m.lvl = pl; m.xpRest = xpNeededForLevel(pl) - 1; }
        }
        if (p && p !== m.prof) {                       // ein neues Profil von seinem Handy
            m.prof = p;
            const pl = Math.max(1, Math.floor(nn(p.lvl) || 1));
            if (pl > m.lvl + 1) warnen(who, 'stufe', 'Stufe springt: das Handy sagt Stufe ' + pl + ', mit seinen EP geht höchstens Stufe ' + m.lvl + '.', pl - m.lvl);
            // (3B: die Stufe kommt nur aus den EP, die der Weltrechner schickt – sein Balken gilt beim ersten Sehen als voll,
            //  darum ist m.lvl nie kleiner als die echte Stufe; ein Profil hebt sie nicht mehr an)
            m.lvlLog.push({ t: now, l: Math.min(pl, m.lvl) }); while (m.lvlLog.length > 1 && now - m.lvlLog[0].t > 3600000) m.lvlLog.shift();
            const P = {}, M = {}; for (const f of m.flug) { for (const k in f.P) P[k] = (P[k] || 0) + f.P[k]; for (const k in f.M) M[k] = (M[k] || 0) + f.M[k]; f.n++; }
            const cP = P.c || 0, cM = M.c || 0, wP = P.w || 0, wM = M.w || 0;
            // Münzen: mehr als möglich → erst ein Admin-Geschenk (sicher bekannt), dann der Spielraum, der Rest ist auffällig
            vorAltern(who, m, now);
            const pc = nn(p.coins); let mehr = kontoProfil(m.c, pc, cP, cM, now);
            if (mehr > 0) {
                const roh = mehr;
                if (d.gC > 0) { const g = Math.min(d.gC, mehr); d.gC -= g; mehr -= g; saveBotState(); }
                const nimm = Math.min(mehr, spielraumFrei(who, m)); spielraumNehmen(who, m, nimm); mehr -= nimm;
                if (mehr > 0) mehr -= muenzGutscheine(who, mehr, d);   // Saison-Pass und Thron-Shop zahlen Münzen auf einmal aus (z. B. „Alle abholen“)
                m.c.u = pc - mehr;
                if (mehr >= 1) warnen(who, 'muenzen', 'Münzen springen: +' + fz(roh) + ' mehr als erwartet, möglich wären höchstens +' + fz(roh - mehr) + '.', mehr);
            }
            // Verwundete (entstehen nur in Kämpfen, die der Weltrechner rechnet)
            const pw = nn(p.wounded), ew = m.w.u, wm2 = kontoProfil(m.w, pw, wP, wM, now);
            if (wm2 > 0) { m.w.u = ew;                  // mehr als möglich zählt NIE (vorher blieben bis 5 % je Profil stehen – das summierte sich)
                if (wm2 > ew * 0.05 + 1000) warnen(who, 'lazarett', 'Verwundete springen: das Handy sagt ' + fz(pw) + ', möglich wären höchstens ' + fz(ew + wM) + '.', wm2); }
            // 3B Gems: weniger → ausgegeben (Topf hb.gA). Mehr als möglich → erst sicher Geschicktes aus dem Abholfach (hb.gIn), dann
            // Stern-Rückgabe beim Verkaufen (hb.sternG), dann der Spielraum (Tagesbelohnung, Aufgaben, Erfolge, Pass, Funde – hb.fr.g).
            // Der Rest ist auffällig und zählt nicht (das Konto bleibt beim Möglichen).
            if (hb && p.gems != null) {                // (ein Profil ohne Gems – altes Handy – zählt hier nicht)
                hbFreiDazu(who, hb, now);
                const pg = nn(p.gems); let mg = kontoProfil(m.g, pg, P.g || 0, M.g || 0, now);
                m.gAus = m.g.vor > 0 ? m.g.vor : 0;   // (Gems, die er in DIESEM Profil ausgegeben hat – Beleg für eine Heldenkiste)
                if (m.g.vor > 0) { hb.gA = nn(hb.gA) + m.g.vor; m.g.vor = 0; }
                if (p.stW != null) hbSterne(who, hb, m, nn(p.stW));   // Sterne gekauft/verkauft (vor dem Prüfen der Gems: eine Rückgabe ist dann schon gedeckt)
                if (mg > 0) {
                    const roh = mg;
                    for (const q of ['gIn', 'sternG']) { const x = Math.min(mg, nn(hb[q])); hb[q] = nn(hb[q]) - x; mg -= x; }
                    mg -= hbSplitterGems(hb, p, mg);
                    { const x = Math.min(mg, nn(hb.fr.g)); hb.fr.g -= x; mg -= x; }
                    if (mg >= 1) { m.g.u = pg - mg; warnen(who, 'gems', 'Gems springen: +' + fz(roh) + ' mehr als erwartet, möglich wären höchstens +' + fz(roh - mg) + '.', mg); }
                }
            }
            rohWacheProfil(who, m, p, P, M, now);
        }
        if (m.geeicht) { d.u = Math.round(m.c.u); d.w = Math.round(m.w.u); flugMerken(d, m); }   // für den nächsten Start merken (geht mit der Welt mit)
        if (hb && m.gGeeicht && now - (m.hbMerkT || 0) > 60000) hbKontenMerken(hb, m, now);   // (3B: höchstens jede Minute – sonst ginge das Hauptbuch bei jedem Puls über die Leitung)
        d.lm = m.lvl;
        return m;
    }
    // aus dem Konto bezahlen (Vorschuss → Konto → Topf (3B) → Admin-Geschenk → Spielraum); false = reicht (noch) nicht
    function wacheBezahlen(who, m, kosten) {
        const now = Date.now(); vorAltern(who, m, now);
        const frei = spielraumFrei(who, m), d = wd(who), gesch = d ? nn(d.gC) : 0, hb = hbDa(who), topf = hb ? nn(hb.cA) : 0;
        if (m.c.vor + m.c.u + topf + frei + gesch < kosten) return false;
        let r = kosten, x;
        x = Math.min(r, m.c.vor); m.c.vor -= x; r -= x;
        x = Math.min(r, topf); if (x > 0) hb.cA = topf - x; r -= x;   // (erst, was er schon ausgegeben hat – dann sein Konto: sonst doppelt abgezogen)
        x = Math.min(r, m.c.u); m.c.u -= x; r -= x;
        x = Math.min(r, gesch); if (x > 0) { d.gC = Math.max(0, d.gC - x); saveBotState(); } r -= x;
        if (r > 0) spielraumNehmen(who, m, r);
        return true;
    }
    // Ausbau prüfen: 'ok' | 'warten' (Münzen noch nicht zu sehen) | 'nein'
    function ausbauPruefen(who, b, ende) {
        if (!inselOk(b.insel) || !Number.isInteger(b.stufe)) { warnen(who, 'kaputt', 'Ausbau mit kaputten Angaben (Basis ' + String(b.insel).slice(0, 20) + ', Stufe ' + String(b.stufe).slice(0, 20) + ').'); return 'nein'; }
        if (!gehoert(b.insel, who)) return 'nein';                         // gerade verloren – kommt vor, keine Warnung
        if (b.insel === botCapitalOf(who)) return 'nein';                  // die Hauptstadt wächst nur mit der Burg (alte Handys schicken das evtl. noch)
        const L = islandLevels[b.insel] || 1;
        if (L >= MAX_BASE_LEVEL) return 'nein';
        if (b.stufe <= L) return 'nein';                                   // doppelt geschickt – nichts zu tun
        if (b.stufe > L + 1) { warnen(who, 'ausbau', 'Ausbau springt: ' + islandTitle(islandById[b.insel]) + ' von Stufe ' + L + ' auf ' + b.stufe + ' – erlaubt ist nur +1.', b.stufe - L); return 'nein'; }
        const jetzt = Date.now(), damals = zahlOk(b.at) && b.at <= jetzt + 5000 && jetzt - b.at < 120000 && (!zahlOk(b._t) || Math.abs(b._t - b.at) < 30000) && evThemaAktivAm(b.at, 'bau');   // (_t: wann der Server ihn bekam – das Handy kann die Zeit nicht weit zurückdrehen)   // (Bauherr: bezahlt hat er den Preis von da – nie aus der Zukunft)
        if (b._nach) return 'ok';                                          // nach dem Zurückspielen nachgeholt: bezahlt hat er damals schon
        if (schonBezahlt(wacheSehen(who), b, false)) return 'ok';           // vor dem Eichen bezahlt (steckt schon im Konto)
        const m = wacheSehen(who), kosten = upgradeCostRoh(L) * (damals || evThemaAktiv('bau') ? .8 : 1);   // (der Rabatt nur EINMAL – vorher doppelt)
        if (wacheBezahlen(who, m, kosten)) return 'ok';
        return ende ? 'pleite' : 'warten';
    }
    // Truppen-Geschenk prüfen → wie viele er bekommt (0 = nichts), oder -1 = warten (z. B. Stufe/Profil noch nicht da)
    const TRUPPEN_QUELLEN = { stufe: 'Stufen-Belohnung', thron: 'Thron-Shop', heil: 'Krankenhaus', fund: 'Fund auf der Karte', geschenk: 'Admin-Geschenk' };
    function truppenPruefen(who, b, ende) {
        const q = b.q, name = TRUPPEN_QUELLEN[q] || 'unbekannte Quelle';
        if (!zahlOk(b.n)) { warnen(who, 'truppen', 'Truppen-Geschenk mit kaputter Zahl (' + String(b.n).slice(0, 30) + ') – abgelehnt.'); return 0; }
        if (!TRUPPEN_QUELLEN[q]) { warnen(who, 'truppen', 'Truppen-Geschenk ohne gültige Quelle: ' + fz(b.n) + ' Truppen – abgelehnt.', b.n); return 0; }
        const m = wacheSehen(who), d = wd(who), now = Date.now(); if (!d) return 0;
        let n = b.n, erlaubt;
        if (q === 'stufe') {                           // jede Stufe zahlt genau einmal ihre Truppen (levelRewardTroops)
            if (!Number.isInteger(b.von) || !Number.isInteger(b.bis) || b.von < 0 || b.bis <= b.von || b.bis - b.von > 400) { warnen(who, 'truppen', 'Stufen-Belohnung mit kaputten Stufen – abgelehnt.'); return 0; }
            if (b.bis > m.lvl && !ende) return -1;     // seine EP sind evtl. noch unterwegs
            if (!d.lv) d.lv = Math.max(b.von, m.lvl - 3);   // zum ersten Mal: ein paar Stufen Spielraum nach hinten (seine Stufe rechnet der Weltrechner selbst – nie die vom Handy)
            const hoch = Math.min(b.bis, m.lvl), ab = Math.max(b.von, d.lv);
            erlaubt = 0; for (let l = ab + 1; l <= hoch; l++) erlaubt += levelRewardTroops(l);
            if (hoch > d.lv) { d.lv = hoch; saveBotState(); }
            if (b.bis > hoch) warnen(who, 'truppen', 'Stufen-Belohnung bis Stufe ' + b.bis + ', mit seinen EP geht höchstens Stufe ' + m.lvl + '.', b.bis - m.lvl);
        } else if (q === 'thron') {                    // Thron-Shop: eine Stunde Truppenproduktion, je 200 Thron-Punkte
            const kaeufe = Math.floor(throneEarnedOf(who) / 200) + 5;
            if (d.tk + 1 > kaeufe) { if (!ende) return -1; warnen(who, 'truppen', 'Thron-Shop: ' + (d.tk + 1) + '. Truppen-Kauf, mit seinen Thron-Punkten gehen höchstens ' + kaeufe + ' – abgelehnt.', b.n); return 0; }
            d.tk++; saveBotState();
            erlaubt = 3 * Math.max(1000, hourProduction(who).troops) + 1000;   // ×3: sein Handy rechnet die Produktion mit eigenen Boni etwas anders
        } else if (q === 'heil') {                     // Krankenhaus: höchstens so viele, wie verwundet sind
            if (now - m.w.vorT > WACHE_WARTEN_MS) m.w.vor = 0;
            erlaubt = (m.w.vor + m.w.u) * 1.02 + 10;
            if (n > erlaubt && !ende) return -1;
            const kosten = Math.ceil(Math.min(n, erlaubt) * HEAL_COIN_PER_TROOP);   // (Heilen kostet Münzen – wie am Handy; vorher nicht geprüft)
            if (kosten > 0 && !wacheBezahlen(who, m, kosten)) { if (!ende) return -1; warnen(who, 'truppen', 'Krankenhaus: ' + fz(n) + ' Truppen heilen ohne die ' + fz(kosten) + ' Münzen – abgelehnt.', kosten); return 0; }
            let r = Math.min(n, erlaubt), x = Math.min(r, m.w.vor); m.w.vor -= x; r -= x; m.w.u = Math.max(0, m.w.u - r);
        } else if (q === 'fund') {                     // Fund auf der Karte: höchstens 3 liegen herum, alle 20–45 s ein neuer
            if (zuOft(m, 'fund', 12, 600000)) { warnen(who, 'truppen', 'Zu viele Funde auf der Karte (über 12 in 10 Minuten) – abgelehnt.', b.n); return 0; }   // (echt: ~7 in 10 Min.)
            const heute = todayKey(); if (!d.fund || d.fund.t !== heute) d.fund = { t: heute, n: 0 };   // höchstens 300 am Tag (Alexander 5.10.: ~7 Std. ohne Pause – gegen ein Skript rund um die Uhr; überlebt Neustarts)
            if (d.fund.n >= 300) { if (d.fund.n === 300) warnen(who, 'truppen', 'Über 300 Funde auf der Karte an einem Tag – abgelehnt.', b.n); d.fund.n = 301; saveBotState(); return 0; }
            d.fund.n++; saveBotState();
            erlaubt = Math.max(100, niceRound(levelRewardTroops(Math.max(m.lvl, 2)) * 0.05)) * 1.05 + 10;
        } else {                                       // Admin-Geschenk: nur so viel, wie der Admin geschickt hat
            if (n > nn(d.gTr) + 0.5 && !ende) return -1;
            erlaubt = nn(d.gTr); d.gTr = Math.max(0, nn(d.gTr) - Math.min(n, erlaubt)); saveBotState();
        }
        if (n > erlaubt) { warnen(who, 'truppen', name + ': ' + fz(n) + ' Truppen verlangt, erlaubt sind ' + fz(erlaubt) + ' – gekappt.', n - erlaubt); n = erlaubt; }
        return Math.max(0, Math.floor(n));
    }
    function truppenGeben(who, n) { const cap = botCapitalOf(who); if (n >= 1 && cap !== null && cap !== undefined) { islandTroops[cap] = (islandTroops[cap] || 0) + n; saveGame(); } }
    // Wartende Befehle (Ausbau/Truppen) der Reihe nach abarbeiten – nie überholen, sonst stimmen die Stufen nicht
    function wacheAbarbeiten(who) {
        const m = wm(who), now = Date.now();
        for (const art of ['ausbau', 'truppen']) {
            const l = m.warte[art];
            while (l.length) {
                const x = l[0], ende = now >= x.bis;
                if (art === 'ausbau') { const r = ausbauPruefen(who, x.b, ende); if (r === 'warten') break;
                    if (r === 'ok') { islandLevels[x.b.insel] = (islandLevels[x.b.insel] || 1) + 1; evPunkte('bau', who, 2 + islandLevels[x.b.insel]); saveGame(); requestRender(); befehlBezahlt(x.b); }
                    if (r === 'pleite') {                  // nach 60 s immer noch nicht bezahlbar: ablehnen – die weiteren Stufen dieser Basis auch
                        const L = islandLevels[x.b.insel] || 1, m2 = wacheSehen(who), weitere = l.filter((y, i) => i > 0 && y.b.insel === x.b.insel).length;
                        for (let i = l.length - 1; i > 0; i--) if (l[i].b.insel === x.b.insel) befehlFertig(l.splice(i, 1)[0]);
                        warnen(who, 'ausbau', 'Ausbau ohne Münzen: ' + islandTitle(islandById[x.b.insel]) + ' auf Stufe ' + (L + 1) + ' kostet ' + fz(upgradeCost(L)) + ', er kann höchstens ' + fz(m2.c.u + m2.c.vor + spielraumFrei(who, m2)) + ' haben – abgelehnt' + (weitere ? ' (und ' + weitere + ' weitere Stufen dieser Basis)' : '') + '.', upgradeCost(L));
                    } }
                else { const n = truppenPruefen(who, x.b, ende); if (n < 0) break; truppenGeben(who, n); if (n > 0) befehlBezahlt(x.b); }
                befehlFertig(l.shift());
            }
        }
    }
    // Wartende Befehle (Ausbau, Truppen – bis 60 s, bis sein Profil die Zahlung zeigt) gelten erst als erledigt, wenn sie entschieden
    // sind (welt.js quittiert sie erst dann – stürzt der Weltrechner vorher ab, kommen sie wieder und laufen dann). Angenommene
    // bezahlte Befehle meldet er dem Server (nur die holt das Zurückspielen nach).
    // Nach dem Zurückspielen wird sein Konto an einem neuen Profil geeicht – ein Befehl, den der Server VOR diesem Profil bekam, ist
    // darin schon bezahlt: nicht nochmal abbuchen. (_t: Server-Zeit des Befehls, 1 s Spielraum; gilt nur nach dem Zurückspielen –
    // sonst zählt wie immer der Rückgang im Profil)
    const schonBezahlt = (m, b, gems) => { const T = gems ? nn(m.gEichT) : nn(m.eichT); return !!(T && zahlOk(b._t) && b._t + 1000 <= T); };
    function befehlFertig(x) { if (x && x.wartet && x.b && x.b._id && WELT.befehlErledigt) WELT.befehlErledigt(x.b._id); }
    function befehlBezahlt(b) { if (b && b._id && WELT.befehlBezahlt) WELT.befehlBezahlt(b._id); }
    // (vor jedem Puls) alle echten Spieler ansehen, Wartendes erledigen
    function wacheRunde() {
        for (const id in WELT.menschen) { if (!botById[id] || !loadBotState()[id]) continue; wacheSehen(id); wacheAbarbeiten(id); }
        hbRunde(Date.now());
    }

    // ===== HAUPTBUCH (3B): das Konto eines echten Spielers liegt beim Weltrechner =====
    // Das Handy rechnet weiter (Münzen, Gems, Stadt, Ausrüstung …), aber was die WELT benutzt (Kampf, Marsch-Plätze, Truppen-
    // Stufe, Forschung, Helden, Schild), kommt aus diesem Hauptbuch – nicht aus dem rohen Profil. Gespeichert in
    // botState[u<id>].hb (geht mit der Welt mit, Spieler bekommen es nie: server.php NUR_WELTRECHNER).
    // Sichere Quellen zählt der Weltrechner selbst (EP, Kampf-Beute, Preise, Splitter, Kisten aus Nachrichten, Admin-Geschenke).
    // Was nur das Handy gibt (Tagesbelohnung, Aufgaben, Erfolge, Funde, Pass), kommt als Spielraum pro Tag dazu (HB_TAG).
    // Jede Neuerung im Profil wird nach festen Regeln angenommen – oder nicht:
    //   Burg/Gebäude: +1 Stufe nach der anderen, frühestens nach der Bauzeit,
    //     schneller nur mit Gems (1 je Minute); Kosten (Münzen, Holz, Stein, Eisen) aus Konto + Topf des Ausgegebenen
    //   Forschung: wie Gebäude, eine nach der anderen, Labor/Vorgänger wie im Spiel
    //   Ausrüstung: Seltenheit/Stufe nur so hoch, wie er (statistisch) Kisten geöffnet haben kann; Sterne bis zur Schmiede-Stufe,
    //     jeder Stern kostet Gems
    //   Helden: Freischalten + Sterne kosten Splitter – nie mehr, als er bekommen haben kann
    //   Stufe = aus seinen EP (Weltrechner), Fähigkeiten = 1 Punkt je Stufe · Friedensschild nur gekauft (Gems) oder geschenkt
    // Abgelehntes zählt nicht (die Welt nimmt das zuletzt Angenommene) und wartet: steht es nach 2 Min. immer noch im Profil,
    // gibt es eine Auffälligkeit (warnen → Admin-Seite). So bekommen echte Spieler keine Fehlalarme, wenn Gems/Münzen erst
    // einen Puls später im Konto stehen.
    const HB_V = 1, HB_WARTEN_MS = 120000, TAG = 864e5;
    // Burg neu (4.10.: 1–60 Tage, teurer): eine Woche lang gelten für die Burg auch noch die alten (kürzeren, billigeren) Werte –
    // wer beim Hochladen gerade nach den alten Regeln baute, bekommt sonst einen falschen Alarm
    const BURG_ALT_BIS = Date.UTC(2026, 9, 14);
    const burgZeitAlt = L => Math.min(7 * 86400, L <= 14 ? 60 * Math.pow(1.55, L - 1) : 60 * Math.pow(1.55, 13) * Math.pow(1.25, L - 14));
    function burgKostenAlt(L) { const b = 1000 * Math.pow(1.72, L - 1), n = AUF ? AUF.stadtKosten('keep', L) : {};
        const a = { c: niceRound(2000 * Math.pow(1.85, L - 1)), h: niceRound(b), s: L >= 2 ? niceRound(b * .8) : 0, e: L >= 5 ? niceRound(b * .4) : 0 };
        for (const x of ['c', 'h', 's', 'e']) a[x] = Math.min(a[x], n[x] === undefined ? a[x] : n[x]); return a; }
    const HB_SLOTS = Object.keys(EQUIPMENT_DEFS);
    const HB_TAG = {                                  // Spielraum pro Tag – je Quelle die Grenze aus dem Spiel
        g: 25 + 40 + 150 / 7,                         // Gems: Tagesbelohnung (höchstens 25), 3 Aufgaben + Bonus (40), Wochenkette (150 / 7 Tage)
        k: 3 + 1 + 3 / 7 + 1 / 7,                     // Kisten: Tagesbelohnung (bis 3), Aufgaben-Bonus, Wochenkette (3), epische Tageskiste
        kg: (3 * 27 + 27) / 7,                        // davon „mind. Episch“ (Wochenkette, Tag 7) als sicherer Kisten-Wert (Episch = 27)
        sh: HERO_SHARDS_DAY + HERO_SHARDS_CHAIN / 7   // Splitter: Aufgaben-Bonus, Wochenkette
    };
    const HB_ONLINE_STUNDE_G = 40;                    // Karten-Funde: 1–3 Gems, alle 20–45 s einer, 15 % davon Gems – nur solange er online ist
    const HB_KAPPE_TAGE = 14;                         // so viele Tage Spielraum sammeln sich höchstens an
    const HB_SH_GEMS = Math.min(...HERO_CHESTS.map(c => c.gems / (c.sh * c.n)));   // Gems je Splitter über die beste Heldenkiste
    const hbDa = who => { const b = loadBotState()[who]; return b && b.hb && b.hb.v === HB_V ? b.hb : null; };
    const hbStufe = who => { const m = wm(who); if (m.init) return Math.max(1, m.lvl); const d = wd(who); return d && d.lm >= 1 ? d.lm : 1; };
    const hbBauten = () => ['keep', ...CITY_BUILDINGS.map(d => d.id)];          // die Burg zuerst (sie schaltet die anderen frei)
    const hbMax = id => id === 'keep' ? (AUF ? AUF.BURG_MAX : 25) : cityMaxLevel(id);
    let hbAch = null, hbPassTopf = null, hbE0 = null, hbTtT = 0;
    const HB_ACH = () => hbAch !== null ? hbAch : (hbAch = ACHIEVEMENTS.reduce((a, x) => a + (x.gems || 0), 0));
    function hbPass() {                               // was der Saison-Pass (frei + Premium) höchstens gibt
        if (hbPassTopf) return hbPassTopf; const t = { g: 0, k: 0, kg: 0, sh: 0, schild: 0 };
        for (let L = 1; L <= PASS_LVLS; L++) for (const prem of [false, true]) { const r = passRewardAt(L, prem), n = r.n || 1;
            if (r.k === 'gems') t.g += n; else if (r.k === 'crate') t.k += n; else if (r.k === 'royal') { t.k += n; t.kg += 27 * n; }
            else if (r.k === 'shards') t.sh += n; else if (r.k === 'shield') t.schild += n; else if (r.k === 'frame' || r.k === 'march') t.g += PASS_OWNED_GEMS; }
        return hbPassTopf = t;
    }
    // Helden: „Splitter-Wert“ = unverbrauchte Splitter + was Freischalten und Sterne gekostet haben
    const hbHeldZeile = s => [s && s.own ? 1 : 0, Math.min(HERO_MAXQ, Math.floor(nn(s && s.q))), Math.floor(nn(s && s.sh)), ...[0, 1, 2, 3].map(i => Math.min(5, Math.floor(nn(s && s.sk && s.sk[i]))))];
    const hbHeldObj = z => ({ own: !!z[0], q: z[1], sh: z[2], sk: z.slice(3, 7) });
    function hbHeldWert(id, z) { const h = heroById(id); if (!h || !z) return 0; let v = z[2]; if (z[0]) { v += HERO_UNLOCK[h.r]; for (let i = 0; i < z[1]; i++) v += heroStepCost(h, i); } return v; }
    const hbHeldenWert = hs => HEROES.reduce((a, h) => a + hbHeldWert(h.id, hs[h.id]), 0);
    function hbHeldenStart() { const s = heroFix(heroConvert(null, 0)), o = {}; for (const h of HEROES) o[h.id] = hbHeldZeile(s[h.id]); return o; }
    const hbE0f = () => hbE0 !== null ? hbE0 : (hbE0 = hbHeldenWert(hbHeldenStart()));
    // Ausrüstung: Kisten-Wert je Platz (Seltenheit r zählt 3^r – 3 gleiche ergeben eine höhere). Aus N Kisten kommen je Platz im
    // Schnitt 0,855 (¼ Chance auf diesen Platz × Ø 3,42), Streuung 3,08 je Kiste. Erlaubt: Schnitt + 3-fache Streuung + ein
    // glückliches Lila. Gold braucht so etwa 20 Kisten (im Schnitt 95), Rot etwa 150. Sichere „mind. Episch“-Kisten
    // (Preise, Wochenkette) zählen extra (hb.kG).
    const kWert = r => Math.pow(3, r);
    const hbKistenGrenze = N => N >= 1 ? 0.855 * N + 3 * 3.08 * Math.sqrt(N) + 27 : 0;
    const hbKistenGesamt = N => N >= 1 ? 3.42 * N + 3 * 5.4 * Math.sqrt(N) + 27 : 0;   // alle 4 Plätze zusammen (Ø 3,42 je Kiste, Streuung 5,4) – das glückliche Lila nur einmal
    const hbPunkteGrenze = N => 25.6 * N + 300;      // Stufen-Punkte (aus verkauften Teilen): Ø 12,8 je Kiste, doppelt + Start
    const hbLvlPunkte = l => 2.5 * l * (l - 1);       // Stufe 1 → l kostet 5 + 10 + … Punkte
    const hbItemWert = z => (z[0] * ITEM_MAX_LEVEL + z[1]) * (1 + z[2] * STAR_PCT / 100);
    // Alle Helden voll (5 Sterne): neue Splitter kommen als Gems (06-alltag.js: 20 je Splitter – Abholfach, Aufgaben, Wochenkette,
    // Pass). → so viele Gems, wie seine unverbrauchten Splitter (sicher hb.shB, Spielraum hb.fr.sh) hergeben; die sind dann weg.
    // (Gilt auch, wenn erst sein Profil die Helden voll zeigt: mehr als 20 Gems je echtem Splitter gibt es so nie – Splitter kosten mehr.)
    const HB_VOLL_G = 20;
    function hbSplitterGems(hb, p, mg) {
        if (!(mg > 0)) return 0;
        const voll = z => !!(z && z[0] && z[1] >= HERO_MAXQ), alle = f => HEROES.every(h => voll(f(h.id)));
        if (!alle(id => hb.hs[id]) && !(p && p.hs && typeof p.hs === 'object' && alle(id => p.hs[id] ? hbHeldZeile(p.hs[id]) : null))) return 0;
        const frei = Math.max(0, nn(hb.shB) - (hbHeldenWert(hb.hs) - hbE0f())), fr = Math.max(0, nn(hb.fr.sh));
        const x = Math.min(mg, HB_VOLL_G * (frei + fr)); if (!(x > 0)) return 0;
        let sh = x / HB_VOLL_G; const a = Math.min(sh, fr); hb.fr.sh = nn(hb.fr.sh) - a; sh -= a; hb.shB = nn(hb.shB) - sh;
        return x;
    }
    function hbKisteDazu(hb, minR) { hb.kN = nn(hb.kN) + 1; if (minR >= 3) hb.kG = nn(hb.kG) + kWert(minR); }
    function hbNeu(who, now, p, frisch) {
        const hb = { v: HB_V, t0: frisch ? now : 0, st: {}, fo: {}, foT: frisch ? now : 0, tb: 1, gear: {}, kN: 0, kG: 0, hs: hbHeldenStart(), shB: 0,
            gA: 0, cA: 0, rA: { h: 0, s: 0, e: 0 }, gIn: 0, sternG: 0, fr: { g: 10, k: 1, kg: 0, sh: 0, schild: 0 }, frT: frisch ? now : 0, ach: 0, lvG: 1, pass: 0, passF: 0,
            schild: 0, w: {}, sp: [] };                // (fr am Anfang: die Anleitung gibt einmal 10 Gems + 1 Kiste)
        for (const id of hbBauten()) hb.st[id] = [id === 'keep' ? 1 : 0, hb.t0];
        for (const s of HB_SLOTS) hb.gear[s] = [];
        if (!frisch && p) {                            // ein Spielstand von vor 3B: einmal so übernehmen, wie sein Handy es sagt
            const pl = (p.city && p.city.levels) || {};
            for (const id of hbBauten()) hb.st[id][0] = Math.max(id === 'keep' ? 1 : 0, Math.min(hbMax(id), Math.floor(nn(pl[id]))));
            if (AUF) for (const d of AUF.FORSCHUNG) { const v = Math.min(d.max, Math.floor(nn((p.fo || {})[d.id]))); if (v > 0) hb.fo[d.id] = v; }
            for (const s of HB_SLOTS) { const g = p.gear && p.gear[s]; if (g) hb.gear[s] = [[Math.min(5, g.r | 0), Math.max(1, Math.min(ITEM_MAX_LEVEL, g.lvl | 0)), Math.min(STAR_MAX, g.st | 0)]]; }
            if (p.hs && typeof p.hs === 'object') { for (const h of HEROES) if (p.hs[h.id]) hb.hs[h.id] = hbHeldZeile(p.hs[h.id]); hb.shB = Math.max(0, hbHeldenWert(hb.hs) - hbE0f()); }
            hb.schild = nn(p.shieldUntil);
        }
        return hb;
    }
    // Spielraum wächst mit der Zeit (je Quelle die Tages-Grenze), dazu Erfolge, Stufen-Gems und der Saison-Pass
    function hbKontenMerken(hb, m, now) { m.hbMerkT = now; hb.gU = Math.round(m.g.u); if (m.rk) hb.rU = { h: Math.round(m.rk.h.u), s: Math.round(m.rk.s.u), e: Math.round(m.rk.e.u) }; saveBotState(); }   // (für einen Neustart)
    // Thron-Shop (06-alltag.js THRONE_OFFERS): jede Ausrüstungskiste 60 Punkte, jede Königliche (mind. Episch) 400. Großzügig: seine
    // Thron-Punkte (zählt der Weltrechner selbst) zählen für beides – sonst gibt eine gekaufte Kiste einen falschen Alarm
    const hbThronPreis = (id, sonst) => { const o = typeof THRONE_OFFERS !== 'undefined' && THRONE_OFFERS.find(x => x.id === id); return o && o.cost > 0 ? o.cost : sonst; };
    function hbThronKisten(hb, E) {
        const d = nn(E) - nn(hb.thK); if (!(d > 0)) return; hb.thK = nn(E);
        hb.fr.k = nn(hb.fr.k) + d / hbThronPreis('crate', 60); hb.fr.kg = nn(hb.fr.kg) + kWert(3) * d / hbThronPreis('royal', 400);
    }
    function hbFreiDazu(who, hb, now) {
        try { hbThronKisten(hb, throneEarnedOf(who)); } catch (e) {}   // (bei jedem Profil – eine gerade gekaufte Kiste soll nicht 5 Min. warten)
        const dt =Math.min(HB_KAPPE_TAGE * TAG, now - nn(hb.frT)); if (dt < 300000) return; hb.frT = now;   // (in 5-Minuten-Schritten: das Hauptbuch ändert sich nicht bei jedem Profil)
        const f = hb.fr, on = !!(WELT.menschen[who] && WELT.menschen[who].online), t = dt / TAG;
        const dazu = (k, v, kappe) => { const vorher = nn(f[k]); f[k] = Math.max(vorher, Math.min(vorher + v, kappe)); };
        const heute = todayKey(); if (!hb.gOn || hb.gOn.t !== heute) hb.gOn = { t: heute, n: 0 };   // Karten-Funde höchstens ~7 Std. am Tag (wie die Truppen-Funde: 300 am Tag – gegen ein Skript rund um die Uhr)
        const onG = on ? Math.max(0, Math.min(HB_ONLINE_STUNDE_G * Math.min(dt, 600000) / 36e5, 7 * HB_ONLINE_STUNDE_G - hb.gOn.n)) : 0; hb.gOn.n += onG;
        dazu('g', HB_TAG.g * t + onG, HB_KAPPE_TAGE * (HB_TAG.g + 8 * HB_ONLINE_STUNDE_G));   // Karten-Funde nur für die Zeit, die er wirklich da war (online kommt alle 5 Min. ein Profil – nie die Tage dazwischen)
        dazu('k', HB_TAG.k * t, HB_KAPPE_TAGE * HB_TAG.k); dazu('kg', HB_TAG.kg * t, HB_KAPPE_TAGE * HB_TAG.kg); dazu('sh', HB_TAG.sh * t, HB_KAPPE_TAGE * HB_TAG.sh);
        const L = hbStufe(who), alter = hb.t0 ? (now - hb.t0) / TAG : 999;
        const ach = HB_ACH() * Math.min(1, alter / 30 + (L - 1) / 100);                   // Erfolge: nach und nach (30 Tage bzw. Stufe 100)
        if (ach > nn(hb.ach)) { f.g = nn(f.g) + ach - nn(hb.ach); hb.ach = ach; }
        for (let l = Math.max(1, hb.lvG | 0) + 1; l <= L && l < 5000; l++) f.g = nn(f.g) + levelRewardGems(l);   // Stufen-Gems (EP sind sicher)
        if (L > (hb.lvG | 0)) hb.lvG = L;
        const n = passNo(now); if (hb.pass !== n) { hb.pass = n; hb.passF = 0; }             // Saison-Pass: nach und nach in einer halben Saison (ab Saison-Beginn bzw. ab seinem Start)
        const frac = Math.min(1, 2 * Math.max(0, now - Math.max(PASS_EPOCH + (n - 1) * PASS_LEN, nn(hb.t0))) / PASS_LEN);
        if (frac > nn(hb.passF)) { const T = hbPass(), d = frac - nn(hb.passF); hb.passF = frac; for (const k of ['g', 'k', 'kg', 'sh', 'schild']) f[k] = nn(f[k]) + T[k] * d; }
    }
    // Kosten {c, g, h, s, e}: aus Topf (ausgegeben), Konto und Spielraum – alles oder nichts
    function hbVorrat(who, hb, m, k) {
        if (k === 'c') { vorAltern(who, m, Date.now()); const d = wd(who); return m.c.vor + m.c.u + nn(hb.cA) + spielraumFrei(who, m) + (d ? nn(d.gC) : 0); }
        if (k === 'g') return nn(hb.gA) + nn(hb.gIn) + m.g.u + nn(hb.fr.g);    // (gIn: sicher geschickt – evtl. schon abgeholt und gleich ausgegeben)
        return nn(hb.rA[k]) + (m.rk ? m.rk[k].u : 0);
    }
    function hbZahlen(who, hb, m, kosten) {
        const ks = Object.keys(kosten).filter(k => kosten[k] > 0);
        if (ks.some(k => hbVorrat(who, hb, m, k) < kosten[k] - 1e-6)) return false;
        for (const k of ks) {
            let r = kosten[k], x;
            if (k === 'c') { vorAltern(who, m, Date.now());   // wie bei Gems: zuerst, was er dafür schon ausgegeben hat (Vorschuss, dann Topf) – nie zweimal vom Konto
                x = Math.min(r, m.c.vor); m.c.vor -= x; r -= x; x = Math.min(r, nn(hb.cA)); hb.cA = nn(hb.cA) - x; r -= x; if (r > 0) wacheBezahlen(who, m, r); continue; }
            if (k === 'g') { for (const q of ['gA', 'gIn']) { x = Math.min(r, nn(hb[q])); hb[q] = nn(hb[q]) - x; r -= x; } x = Math.min(r, m.g.u); m.g.u -= x; r -= x; hb.fr.g = Math.max(0, nn(hb.fr.g) - r); continue; }
            x = Math.min(r, nn(hb.rA[k])); hb.rA[k] = nn(hb.rA[k]) - x; r -= x; if (m.rk) m.rk[k].u = Math.max(0, m.rk[k].u - r);
        }
        return true;
    }
    // abgelehnt: erst nach 2 Min. (immer noch im Profil) eine Auffälligkeit – einmal
    function hbWarte(who, hb, key, now, text, wert) {
        const w = hb.w || (hb.w = {}); wm(who).hbOffen = 1;
        if (!w[key]) w[key] = now; else if (w[key] > 0 && now - w[key] > HB_WARTEN_MS) { warnen(who, 'hauptbuch', text, wert); w[key] = -1; }
    }
    const hbGut = (hb, key) => { if (hb.w && hb.w[key]) delete hb.w[key]; };
    // Burg/Gebäude: eine Stufe weiter → 'ok' | 'nein' (Regel) | 'geld' (Bauzeit-Gems, Münzen oder Rohstoffe reichen nicht)
    function hbStadtSchritt(who, hb, m, id, now) {
        const [L, T] = hb.st[id], B = hb.st.keep[0];
        if (L + 1 > hbMax(id)) return 'nein';
        if (id !== 'keep' && AUF) { if (!L && AUF.BAU_AB_BURG[id] > B) return 'nein'; if (L + 1 > (B >= AUF.BURG_MAX ? hbMax(id) : Math.min(hbMax(id), B))) return 'nein'; }
        const alt = id === 'keep' && now < BURG_ALT_BIS, zeit = alt ? Math.min(cityTimeRoh(id, L), burgZeitAlt(L)) : cityTimeRoh(id, L);   // (Übergang: eine Burg, die noch nach den alten Regeln gebaut wurde)
        // Bauzeit zählt erst ab Baubeginn: nie vor dem letzten Profil, das dieses Gebäude ohne Bau zeigte (hb.ruhe), und nie vor dem Ende
        // des letzten Baus dieses Bauarbeiters (hb.bu – 1 bzw. 2 Bauarbeiter). Vorher zählte Leerlauf mit (10 Tage still = 10 Tage Bauzeit gratis).
        const pl = (hb.b2 ? 2 : 1), bu = hb.bu || (hb.bu = [0, 0]), i = pl > 1 && bu[1] < bu[0] ? 1 : 0, start = Math.max(T, nn((hb.ruhe || {})[id]), nn(bu[i]));
        const hk = 'bau:' + id + ':' + (L + 1), hilfe = Math.min(nn((hb.hilfe || {})[hk]), zeit * 1000), need = zeit * 1000 - hilfe, fehlt = need - (now - start) - 60000;   // (Bündnis-Hilfe macht den Bau kürzer)
        const g = fehlt > 0 ? Math.ceil(fehlt / 60000) * CITY_GEMS_PER_MIN : 0;
        const k = Object.assign({}, alt ? burgKostenAlt(L) : AUF ? AUF.stadtKosten(id, L) : { c: cityCost(id, L) }); if (g) k.g = g;
        if (!hbZahlen(who, hb, m, k)) return 'geld';
        hb.st[id] = [L + 1, g ? now : Math.min(now, start + need)];   // (fertig spätestens jetzt – die nächste Stufe zählt ab da)
        bu[i] = hb.st[id][1];                                          // (dieser Bauarbeiter ist ab da wieder frei)
        if (hb.hilfe) delete hb.hilfe[hk];
        return 'ok';
    }
    function hbFoSchritt(who, hb, m, d, now) {
        const L = (hb.fo[d.id] | 0) + 1;
        if (L > d.max || (hb.st.academy || [0])[0] < AUF.foAkaFuer(d, L)) return 'nein';
        if (d.vor && !((hb.fo[d.vor] | 0) >= 1)) return 'nein';
        const hk = 'fo:' + d.id + ':' + L, need = AUF.foZeitRoh(d, L) * 1000 - Math.min(nn((hb.hilfe || {})[hk]), AUF.foZeitRoh(d, L) * 1000), T = Math.max(nn(hb.foT), nn(hb.foRuhe)), fehlt = need - (now - T) - 60000;   // (Bündnis-Hilfe macht die Forschung kürzer · nie vor dem letzten Profil mit freiem Labor)
        const g = fehlt > 0 ? Math.ceil(fehlt / 60000) * CITY_GEMS_PER_MIN : 0;
        const k = Object.assign({}, AUF.foKosten(d, L)); if (g) k.g = g;
        if (!hbZahlen(who, hb, m, k)) return 'geld';
        hb.fo[d.id] = L; hb.foT = g ? now : Math.min(now, T + need);    // eine Forschung gleichzeitig: die nächste zählt ab da
        if (hb.hilfe) delete hb.hilfe[hk];
        return 'ok';
    }
    // Sterne (alle Teile, angelegt oder nicht – Profil stW = Gems in allen Sternen): ein Kauf wird aus den ausgegebenen Gems bezahlt
    // und als Rücklage gemerkt (hb.sternRes); beim Verkaufen geht die Rücklage in hb.sternG – das deckt die zurückgegebenen Gems.
    // Anlegen/Ablegen ändert stW nicht. Vorher sah das Hauptbuch nur Sterne angelegter Teile: Verkauf eines Teils aus der Truhe
    // galt als „Gems springen“ (falscher Alarm, und die Gems fehlten beim Weltrechner).
    function hbSterne(who, hb, m, T) {
        if (!Number.isFinite(hb.stW)) { hb.stW = T; hb.sternRes = Math.min(T, 20000); hb.sternG = 0; return; }   // erstes Mal: was es schon gibt, gilt (wie beim ersten Sehen des Hauptbuchs – gekappt)
        const d = T - hb.stW;
        if (d > 0) { const x = Math.min(d, nn(hb.gA)); hb.gA = nn(hb.gA) - x; let rest = d - x; if (rest > 0 && hbZahlen(who, hb, m, { g: rest })) rest = 0;
            hb.sternRes = nn(hb.sternRes) + d - rest; hb.stW += d - rest; }   // (nicht Bezahltes zählt nicht – wird es verkauft, gibt es nichts zurück)
        else if (d < 0) { const y = Math.min(-d, nn(hb.sternRes)); hb.sternRes = nn(hb.sternRes) - y; hb.sternG = nn(hb.sternG) + y; hb.stW = T; }
    }
    // ein neuer Gegenstand in Platz s (z = [Seltenheit, Stufe, Sterne]) → '' (angenommen) oder warum nicht
    function hbGearNeu(who, hb, m, s, z, forge) {
        if (z[2] > forge) return 'die Schmiede (Stufe ' + forge + ') erlaubt höchstens ' + forge + ' Sterne';
        const A = hb.gear[s], N = nn(hb.kN), wert = kWert(z[0]), kG = nn(hb.kG) + nn(hb.fr.kg);   // sichere „mind. Episch“-Kisten: geschickte (kG) und aus Wochenkette/Pass/Thron-Shop (fr.kg – vorher nie benutzt)
        const gesamt = HB_SLOTS.reduce((a, x) => a + Math.max(x === s ? wert : 0, ...(hb.gear[x] || []).map(b => kWert(b[0])), 0), 0);   // bester Kisten-Wert je Platz, zusammen
        const punkte = HB_SLOTS.reduce((a, x) => { const l = (hb.gear[x] || []).reduce((y, b) => Math.max(y, b[1]), x === s ? z[1] : 1); return a + hbLvlPunkte(l); }, 0);
        let n = 0; const mehr = () => n < 10 ? 1 : Math.ceil(n * .1);
        while (n < 20000 && (wert > hbKistenGrenze(N + n) + kG || gesamt > hbKistenGesamt(N + n) + kG || punkte > hbPunkteGrenze(N + n))) n += mehr();
        if (n >= 20000) return 'unmöglich viele Kisten';
        const basis = A.filter(a => a[0] === z[0] && a[1] <= z[1]).reduce((x, a) => Math.max(x, a[2]), 0);   // (derselbe Gegenstand, nur höher)
        let sternG = 0; for (let i = basis; i < z[2]; i++) sternG += starGemCost(i);
        if (Number.isFinite(hb.stW)) { if (10 * z[2] * (z[2] + 1) > hb.stW + 1e-6) return 'die Sterne sind nicht bezahlt'; sternG = 0; }   // (neues Handy: Sterne zahlt hbSterne – nicht doppelt)
        const freiK = Math.min(n, Math.floor(nn(hb.fr.k))), gems = (n - freiK) * CRATE_GEM_COST + sternG;
        if (gems > 0 && !hbZahlen(who, hb, m, { g: gems })) return n > freiK ? 'dafür hätte er ' + (N + n > 1 ? 'etwa ' + Math.round(N + n) : 'eine') + ' Kisten öffnen müssen, ' + fz(gems) + ' Gems fehlen' : 'die Sterne kosten ' + sternG + ' Gems';
        hb.fr.k = nn(hb.fr.k) - freiK; hb.kN = N + n; hb.sternG = nn(hb.sternG) + sternG;
        const ueber = Math.max(wert - hbKistenGrenze(hb.kN), gesamt - hbKistenGesamt(hb.kN)); if (ueber > 0) { const x = Math.min(ueber, Math.max(0, nn(hb.fr.kg))); hb.fr.kg = nn(hb.fr.kg) - x; hb.kG = Math.max(0, nn(hb.kG) - (ueber - x)); }   // die sichere Kiste ist verbraucht (zuerst aus fr.kg)
        A.push(z);
        for (let i = A.length - 1; i >= 0; i--) if (A.some((b, j) => j !== i && b[0] === A[i][0] && b[1] >= A[i][1] && b[2] >= A[i][2] && (b[1] > A[i][1] || b[2] > A[i][2] || j < i))) A.splice(i, 1);
        A.sort((a, b) => hbItemWert(b) - hbItemWert(a)); if (A.length > 4) A.length = 4;
        return '';
    }
    // alle Neuerungen eines Profils gegen das Hauptbuch prüfen (und das Angenommene bezahlen)
    function hbPruefen(who, hb, p, m, now, schildAlt) {
        const mm = wm(who); mm.hbOffen = 0; mm.hbPrT = now;
        hbFreiDazu(who, hb, now);
        const pl = (p.city && p.city.levels) || {}, will = id => Math.min(hbMax(id), Math.floor(nn(pl[id])));
        for (let runde = 0, weiter = true; weiter && runde < 80; runde++) { weiter = false;
            for (const id of hbBauten()) if (will(id) > hb.st[id][0] && hbStadtSchritt(who, hb, m, id, now) === 'ok') weiter = true; }
        if (p.city && Array.isArray(p.city.bau)) {                    // (neue Handys schicken mit, was gerade gebaut wird)
            if (p.city.b2) hb.b2 = 1;
            const lauf = p.city.bau.slice(0, hb.b2 ? 2 : 1), ruhe = hb.ruhe || (hb.ruhe = {});
            for (const id of hbBauten()) if (!lauf.includes(id) && will(id) <= hb.st[id][0]) ruhe[id] = now;   // frei und nichts offen: ein neuer Bau beginnt frühestens jetzt
            if (!p.city.foLauf && AUF && AUF.FORSCHUNG.every(d => Math.min(d.max, Math.floor(nn((p.fo || {})[d.id]))) <= (hb.fo[d.id] | 0))) hb.foRuhe = now;
        }
        for (const id of hbBauten()) { if (will(id) <= hb.st[id][0]) { hbGut(hb, 'stadt:' + id); continue; }
            hbWarte(who, hb, 'stadt:' + id, now, (cityDef(id) || {}).name + ': das Handy sagt Stufe ' + will(id) + ', möglich ist Stufe ' + hb.st[id][0] + ' (Bauzeit, Kosten oder Burg-Stufe passen nicht).', will(id) - hb.st[id][0]); }
        if (AUF) {                                     // Forschung: die billigste zuerst, so lange etwas weitergeht
            const pf = p.fo || {}, offen = () => AUF.FORSCHUNG.filter(d => Math.min(d.max, Math.floor(nn(pf[d.id]))) > (hb.fo[d.id] | 0));
            for (let runde = 0, weiter = true; weiter && runde < 80; runde++) { weiter = false;
                for (const d of offen().sort((a, b) => AUF.foKosten(a, (hb.fo[a.id] | 0) + 1).c - AUF.foKosten(b, (hb.fo[b.id] | 0) + 1).c)) if (hbFoSchritt(who, hb, m, d, now) === 'ok') { weiter = true; break; } }
            for (const d of AUF.FORSCHUNG) { const w = Math.min(d.max, Math.floor(nn(pf[d.id]))); if (w <= (hb.fo[d.id] | 0)) { hbGut(hb, 'fo:' + d.id); continue; }
                hbWarte(who, hb, 'fo:' + d.id, now, 'Forschung ' + d.name + ': das Handy sagt Stufe ' + w + ', möglich ist ' + (hb.fo[d.id] | 0) + ' (Zeit, Kosten oder Labor passen nicht).', w - (hb.fo[d.id] | 0)); }
        }
        const forge = Math.min(STAR_MAX, (hb.st.forge || [0])[0]);
        for (const s of HB_SLOTS) {                    // Ausrüstung
            const g = p.gear && p.gear[s]; if (!g) { hbGut(hb, 'gear:' + s); continue; }
            const z = [Math.max(0, Math.min(5, g.r | 0)), Math.max(1, Math.min(ITEM_MAX_LEVEL, g.lvl | 0 || 1)), Math.max(0, Math.min(STAR_MAX, g.st | 0))], A = hb.gear[s] || (hb.gear[s] = []);
            if (A.some(a => a[0] === z[0] && a[1] >= z[1] && a[2] >= z[2])) { hbGut(hb, 'gear:' + s); continue; }
            const grund = hbGearNeu(who, hb, m, s, z, forge);
            if (grund) hbWarte(who, hb, 'gear:' + s, now, EQUIPMENT_DEFS[s].name + ' ' + RARITY_DEFS[z[0]].label + ' Stufe ' + z[1] + (z[2] ? ' mit ' + z[2] + ' Sternen' : '') + ': ' + grund + '.', z[0] + 1);
            else hbGut(hb, 'gear:' + s);
        }
        hbHeldenPruefen(who, hb, m, p, now);
        hbSchildPruefen(who, hb, m, p, now, schildAlt);
    }
    // Helden: Splitter-Wert aller Helden höchstens so viel, wie er an Splittern bekommen haben kann (sicher + Spielraum + Heldenkisten)
    function hbHeldenPruefen(who, hb, m, p, now) {
        if (!p.hs || typeof p.hs !== 'object') return;
        const E0 = hbE0f(), neu = {};
        for (const h of HEROES) { const z = p.hs[h.id] ? hbHeldZeile(p.hs[h.id]) : hb.hs[h.id]; if (!z) continue;
            const pts = z[0] ? Math.floor(z[1] / 2) : 0, sum = z[3] + z[4] + z[5] + z[6];   // Fähigkeiten: 1 Punkt je halbem Stern
            if (sum > pts) for (let i = 3; i < 7; i++) z[i] = Math.floor(z[i] * pts / sum);
            const a = hb.hs[h.id];                          // eine Fähigkeit weniger als vorher = zurückgesetzt: kostet HERO_RESET_GEMS (vorher gratis)
            if (a && [3, 4, 5, 6].some(i => z[i] < (a[i] | 0)) && !hbZahlen(who, hb, m, { g: HERO_RESET_GEMS })) {
                for (let i = 3; i < 7; i++) z[i] = a[i] | 0; hbWarte(who, hb, 'heldReset:' + h.id, now, h.name + ': Fähigkeiten zurückgesetzt ohne die ' + HERO_RESET_GEMS + ' Gems – es gelten die alten.', HERO_RESET_GEMS); }
            neu[h.id] = z; }
        const gleich = (a, b) => !!a && !!b && a.every((v, i) => v === b[i]);
        const geaendert = HEROES.filter(h => neu[h.id] && !gleich(neu[h.id], hb.hs[h.id])); if (!geaendert.length) { hbGut(hb, 'helden'); return; }
        const wert = hs => hbHeldenWert(hs) - E0;
        let bedarf = wert(neu) - nn(hb.shB); const shVor = nn(hb.shB); let gBez = 0;
        if (bedarf > 0) { const aus = Math.min(bedarf, nn(hb.fr.sh)); hb.fr.sh = nn(hb.fr.sh) - aus; hb.shB = nn(hb.shB) + aus; bedarf -= aus;
            if (bedarf > 0 && hbZahlen(who, hb, m, { g: Math.ceil(bedarf * HB_SH_GEMS) })) { hb.shB += bedarf; gBez = Math.ceil(bedarf * HB_SH_GEMS); } }
        if (hb.shB > shVor) { const L = (hb.shKauf || []).filter(x => now - x.t < KISTE_FRIST); L.push({ sh: hb.shB - shVor, gd: nn(m.gAus), g: gBez, t: now }); m.gAus = 0; hb.shKauf = L.slice(-20); hbKisteFrei(who, hb, now); }   // Splitter + Gems aus DEMSELBEN Profil: Beleg für eine Heldenkiste
        if (wert(neu) <= nn(hb.shB) + 1e-6) { hb.hs = Object.assign({}, hb.hs, neu); hbGut(hb, 'helden'); return; }
        let jetzt = Object.assign({}, hb.hs);          // sonst Held für Held, die billigsten Änderungen zuerst
        const zu = [];
        for (const h of geaendert.sort((a, b) => (hbHeldWert(a.id, neu[a.id]) - hbHeldWert(a.id, hb.hs[a.id])) - (hbHeldWert(b.id, neu[b.id]) - hbHeldWert(b.id, hb.hs[b.id])))) {
            const v = Object.assign({}, jetzt, { [h.id]: neu[h.id] }); if (wert(v) <= nn(hb.shB) + 1e-6) jetzt = v; else zu.push(h.name); }
        hb.hs = jetzt;
        if (zu.length) hbWarte(who, hb, 'helden', now, 'Helden: ' + zu.join(', ') + ' – dafür reichen seine Splitter nicht (' + fz(wert(neu)) + ' verlangt, möglich ' + fz(nn(hb.shB)) + ').', wert(neu) - nn(hb.shB));
    }
    // Friedensschild: länger nur, wenn er ihn gekauft (Gems, 24 Std. = 300) oder geschenkt bekommen haben kann (Pass, Startschild)
    function hbSchildPruefen(who, hb, m, p, now, schildAlt) {
        if (schildAlt && nn(p.shieldUntil) <= schildAlt) { hbGut(hb, 'schild'); return; }   // sein Handy meldet noch den Schild, den die Welt fallen ließ: gilt nicht (welt.js), kostet nichts
        const S = Math.min(nn(p.shieldUntil), now + 8 * TAG);
        if (S <= nn(hb.schild) + 60000) { if (S < nn(hb.schild)) hb.schild = S; hbGut(hb, 'schild'); return; }   // (gefallen oder kürzer: gilt)
        const stunden = (S - Math.max(now, nn(hb.schild))) / 36e5, frei = Math.min(stunden, nn(hb.fr.schild)), g = Math.ceil((stunden - frei) * SHIELD_PRICES[24] / 24 - 1e-9);
        if (g > 0 && !hbZahlen(who, hb, m, { g })) { hbWarte(who, hb, 'schild', now, 'Friedensschild bis ' + new Date(S).toLocaleString('de-DE') + ' – den kann er nicht gekauft haben (' + g + ' Gems fehlen).', stunden); return; }
        hb.fr.schild = nn(hb.fr.schild) - frei; hb.schild = S; hbGut(hb, 'schild');
    }
    // was die Welt von ihm benutzt: aus dem Hauptbuch (nie mehr als das Profil sagt)
    function hbSchreiben(who, hb, b, p, alt) {
        const L = hbStufe(who), now = Date.now();
        b.lvl = Math.max(1, Math.min(Math.floor(nn(p.lvl)) || 1, L));
        const sk = {}; let sum = 0;
        for (const k of Object.keys(SKILL_DEFS)) { sk[k] = Math.max(0, Math.min(SKILL_DEFS[k].max || 50, Math.floor(nn((p.skills || {})[k])))); sum += sk[k]; }
        const maxP = Math.max(0, L - 1) + 2;          // 1 Fähigkeits-Punkt je Stufe
        if (sum > maxP) { for (const k in sk) sk[k] = Math.floor(sk[k] * maxP / sum); hbWarte(who, hb, 'skills', now, 'Fähigkeiten: ' + sum + ' Punkte verteilt, mit Stufe ' + L + ' gehen höchstens ' + maxP + '.', sum - maxP); } else hbGut(hb, 'skills');
        if (hb.sk && Object.keys(sk).some(k => sk[k] < (hb.sk[k] | 0))) {   // ein Punkt weniger als vorher = zurückgesetzt: kostet SKILL_RESET_GEMS (vorher nicht geprüft – umverteilen vor jedem Kampf gratis)
            if (hbZahlen(who, hb, wacheSehen(who), { g: SKILL_RESET_GEMS })) hbGut(hb, 'skillReset');
            else { for (const k in sk) sk[k] = hb.sk[k] | 0; hbWarte(who, hb, 'skillReset', now, 'Fähigkeiten zurückgesetzt ohne die ' + SKILL_RESET_GEMS + ' Gems – es gelten die alten.', SKILL_RESET_GEMS); } }
        hb.sk = Object.assign({}, sk);
        b.skills = sk;
        const pl = (p.city && p.city.levels) || {}, lv = {};
        for (const id of hbBauten()) lv[id] = Math.max(0, Math.min(Math.floor(nn(pl[id])), hb.st[id][0])); if (!(lv.keep >= 1)) lv.keep = 1;
        const fo = {}; if (AUF) for (const d of AUF.FORSCHUNG) { const v = Math.min(Math.floor(nn((p.fo || {})[d.id])), hb.fo[d.id] | 0); if (v > 0) fo[d.id] = v; }
        b.city = Object.assign({}, b.city, { levels: lv, fo }); delete b.city.tier; delete b.city.tierBez;
        b.gear = {};
        for (const s of HB_SLOTS) { const g = p.gear && p.gear[s], A = hb.gear[s] || [];
            if (g && A.some(a => a[0] === (g.r | 0) && a[1] >= (g.lvl | 0) && a[2] >= (g.st | 0))) b.gear[s] = { r: g.r | 0, lvl: Math.max(1, g.lvl | 0), st: g.st | 0 };
            else b.gear[s] = g && A.length ? { r: A[0][0], lvl: A[0][1], st: A[0][2] } : null; }
        const hs = {};
        for (const h of HEROES) { const z = hb.hs[h.id]; if (!z) continue; const o = hbHeldObj(z), a = alt && alt.hs && alt.hs[h.id];
            o.rage = Math.max(0, Math.min(100, nn(a && a.rage))); hs[h.id] = o; }    // (die Wut rechnet nur der Weltrechner)
        b.hs = hs;
        if (nn(b.shieldUntil) > nn(hb.schild)) b.shieldUntil = nn(hb.schild);
        b.hbK = 1;
    }
    // Rohstoffe und Verwundete aus seinem Profil nie über sein Konto (+ was er an Abzügen noch nicht kennt) – immer, nicht nur nach
    // einem Sprung im neuen Profil (z. B. nach einem Neustart des Weltrechners kam das gespeicherte Profil sonst ungeprüft in die Welt)
    function hbKontoDeckel(m, b, p) {
        const { M } = flugSumme(m);
        if (m.rk && b.res && p.res && typeof p.res === 'object') for (const k of ROHK) { const max = Math.floor(m.rk[k].u + (M[k] || 0)) + 1; if (nn(b.res[k]) > max) b.res[k] = max; }
        if (m.geeicht) { const max = Math.floor(m.w.u + (M.w || 0)) + 1; if (nn(b.wounded) > max) b.wounded = max; }
    }
    // (welt.js profilZuBot, nur beim Weltrechner) ein Profil kommt an → Hauptbuch prüfen, Mitspieler-Datensatz klemmen
    function hbKlemmen(who, b, p, alt) {
        if (!AUF) { if (alt && alt.hbK) for (const k of ['lvl', 'skills', 'gear', 'city', 'hs', 'shieldUntil', 'hbK']) if (alt[k] !== undefined) b[k] = alt[k]; return; }   // (aufbau.js noch nicht geladen: die Welt-Werte bleiben)
        const now = Date.now();
        let hb = alt && alt.hb && alt.hb.v === HB_V ? alt.hb : b.hb && b.hb.v === HB_V ? b.hb : null;
        if (!hb) {
            const frisch = !(alt && alt.city);         // ganz neu (noch nie in der Welt) → alles bei Null, sonst einmal aus dem Profil
            hb = hbNeu(who, now, p, frisch);
            if (frisch) { b.wache = Object.assign({ lv: 0, tk: 0, gTr: 0, gC: 0 }, b.wache || {}, { u: 0, w: 0, lm: 1 }); hb.gU = 0; hb.rU = AUF ? Object.assign({}, AUF.ROH_START) : { h: 0, s: 0, e: 0 }; }
        }
        b.hb = hb; if (alt && alt !== b) alt.hb = hb;
        if (b.zProfil && p && Object.keys(p).length) { hbAusProfil(who, hb, p, now); delete b.zProfil; if (alt) delete alt.zProfil; }   // (nach dem Zurückspielen, einmal)
        const m = wacheSehen(who);
        if (m.rkNeu) { m.rkNeu = false; if (p === m.prof && m.rDeckelP !== p && p.res) { const { P, M } = flugSumme(m); rohWacheProfil(who, m, p, P, M, now); } }   // (nach einem Neustart: das Profil einmal gegen das gemerkte Konto prüfen – vorher kam es ungeprüft in die Welt)
        if (m.init) hbKontoDeckel(m, b, p);           // (vor dem Prüfen: das bezahlt aus dem Konto)
        hbPruefen(who, hb, p, m, now, b.schildAlt);
        if (m.rDeckel && m.rDeckelP === p && b.res) for (const k in m.rDeckel) if (nn(b.res[k]) > m.rDeckel[k]) b.res[k] = m.rDeckel[k];   // Rohstoff-Sprung: die Welt bekommt nur das Mögliche – auch wenn dasselbe Profil nach 10 s nochmal angewendet wird (wartet etwas im Hauptbuch; vorher kam das erfundene Holz dann doch in die Welt und schaukelte sich hoch)
        hbSchreiben(who, hb, b, p, alt);
        if (m.init && m.gGeeicht && now - (m.hbMerkT || 0) > 60000) hbKontenMerken(hb, m, now);
        const d = b.wache; if (m.init && m.geeicht && d) d.u = Math.round(m.c.u);
        saveBotState();                                // (das Hauptbuch geht mit der Welt mit)
    }
    WELT.klemmen = hbKlemmen;
    // Nach dem Zurückspielen einer Sicherung (server.php: ow_welt_info.zurueck) ist die Welt – mit dem Hauptbuch – wieder alt, die
    // Spielstände der Spieler nicht (was sie seitdem verdient und gebaut haben, behalten sie). Damit beides zusammenpasst, gleicht der
    // Weltrechner EINMAL je Spieler an: Münzen, Verwundete, Gems, Rohstoffe und Stufe werden am nächsten Profil neu geeicht; Stadt,
    // Forschung, Truppen-Stufe, Ausrüstung, Helden und Schild aus dem Profil übernommen (gekappt wie beim ersten Sehen, nie weniger
    // als das Hauptbuch schon hatte). Sonst hielte der Schummel-Schutz ehrlich Verdientes für gefälscht und die Welt nähme alte Werte.
    function hbAusProfil(who, hb, p, now) {
        const n = hbNeu(who, now, p, false);
        for (const id of hbBauten()) if (n.st[id][0] > hb.st[id][0]) hb.st[id] = [n.st[id][0], now];
        for (const k in n.fo) if (n.fo[k] > (hb.fo[k] | 0)) hb.fo[k] = n.fo[k];
        if (n.tb > hb.tb) hb.tb = n.tb;
        for (const s of HB_SLOTS) for (const z of n.gear[s]) { const A = hb.gear[s] || (hb.gear[s] = []); if (!A.some(a => a[0] === z[0] && a[1] >= z[1] && a[2] >= z[2])) A.push(z); }
        for (const h of HEROES) if (n.hs[h.id] && hbHeldWert(h.id, n.hs[h.id]) > hbHeldWert(h.id, hb.hs[h.id])) hb.hs[h.id] = n.hs[h.id];
        hb.shB = Math.max(nn(hb.shB), hbHeldenWert(hb.hs) - hbE0f());
        hb.schild = Math.max(nn(hb.schild), nn(n.schild));
        if (p.stW != null && Number.isFinite(hb.stW)) { const T = nn(p.stW); if (T > hb.stW) hb.sternRes = nn(hb.sternRes) + T - hb.stW; hb.stW = T; hb.sternRes = Math.min(nn(hb.sternRes), T); }   // (Sterne seit der Sicherung: schon bezahlt)
    }
    {   const Z = SYSTEM && window.__OW ? +window.__OW.zurueck || 0 : 0;
        if (Z) { const bs = loadBotState(); let n = 0;
            for (const id in bs) { const b = bs[id]; if (!b || !b.mensch || nn(b.zT) >= Z) continue;
                b.zT = Z; b.zProfil = 1; b.zEich = 1; n++;
                if (b.wache) { delete b.wache.u; delete b.wache.w; delete b.wache.lm; delete b.wache.fl; }   // → am nächsten Profil neu eichen
                if (b.hb) { delete b.hb.gU; delete b.hb.rU; } }
            if (n) { saveBotState(); console.log('Zurückgespielt: Hauptbuch von ' + n + ' Spielern wird an ihre Spielstände angeglichen'); } }
    }
    WELT.kontoMuenzen = who => { const m = wacheSehen(who); return m.init ? m.c.u + m.c.vor : 0; };   // (noch nie gesehen: jetzt ansehen – nie ungeprüft das Profil; ohne Mitspieler-Datensatz hat er keine Münzen in der Welt)
    WELT.hauptbuch = who => hbDa(who);                // (für Tests und die Admin-Ansicht)

    // ===== Nebel auf dem Server (3B) =====
    // Der Weltrechner führt für jeden echten Spieler die aufgedeckten Nebel-Felder (wie openWaterFogCells auf seinem Handy):
    // rund um jede Basis, die er hat oder hatte (Sichtweite mit Forschung Kundschaft), und wo seine Erkundungs-Späher laufen.
    // Daraus: welche Inseln er sieht (wie islandSeen) → als Bitfeld an den Server (WELT.sichtRaus → server.php ow_spieler.sicht).
    // Der Server schickt ihm dann Truppenzahlen nur dieser Inseln (und seiner eigenen).
    let nbIdx = null; const nbMem = {};
    function nbIndex() {                              // alle Felder, die für die Sicht zählen (Land, Inseln, Brücken-Enden) → Bit-Nummer
        if (nbIdx) return nbIdx;
        const keys = new Set(Object.keys(fogLandCells())), zelle = (x, y) => fogKey(Math.floor(x / FOG_CELL), Math.floor(y / FOG_CELL));
        let maxId = 0;
        for (const i of islands) { keys.add(zelle(i.x, i.y)); if (i.ends) for (const e of i.ends) keys.add(zelle(e[0], e[1])); if (i.id > maxId) maxId = i.id; }
        const liste = [...keys].sort();
        return nbIdx = { map: new Map(liste.map((k, i) => [k, i])), n: liste.length, maxId, sig: liste.length + '/' + maxId };
    }
    const bitsZu = u => { let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
    const bitHat = (u, i) => (u[i >> 3] >> (i & 7)) & 1, bitSetz = (u, i) => { u[i >> 3] |= 1 << (i & 7); };
    // aufgedeckte Felder fürs Hauptbuch: nur die Nummern der gesetzten Bits (Abstände, Basis 36) – viel kürzer als das ganze Bitfeld
    function nbPacken(u, n) { const t = []; let vor = -1; for (let i = 0; i < n; i++) if ((u[i >> 3] >> (i & 7)) & 1) { t.push((i - vor).toString(36)); vor = i; } return t.join('.'); }
    function nbAuspacken(s, n) { const u = new Uint8Array(Math.ceil(n / 8)); if (typeof s !== 'string' || !s) return u; let i = -1; for (const x of s.split('.')) { i += parseInt(x, 36); if (!(i >= 0 && i < n)) break; bitSetz(u, i); } return u; }
    function nbAufdecken(z, x, y, r) {                // wie revealAround
        const I = nbIndex(), rr2 = r + FOG_CELL * .35; let neu = false;
        for (let cx = Math.floor((x - r) / FOG_CELL); cx <= Math.floor((x + r) / FOG_CELL); cx++)
            for (let cy = Math.floor((y - r) / FOG_CELL); cy <= Math.floor((y + r) / FOG_CELL); cy++) {
                const i = I.map.get(fogKey(cx, cy)); if (i === undefined || bitHat(z.zellen, i)) continue;
                const mx = (cx + .5) * FOG_CELL, my = (cy + .5) * FOG_CELL;
                if (Math.abs(mx) > FRAME_HALF + FOG_CELL || Math.abs(my) > FRAME_HALF + FOG_CELL || Math.hypot(mx - x, my - y) > rr2) continue;
                bitSetz(z.zellen, i); neu = true;
            }
        return neu;
    }
    const nbOffen = (z, I, x, y) => { const i = I.map.get(fogKey(Math.floor(x / FOG_CELL), Math.floor(y / FOG_CELL))); return i !== undefined && bitHat(z.zellen, i) === 1; };
    function nbZ(who, hb) { const I = nbIndex(); return nbMem[who] || (nbMem[who] = { zellen: nbAuspacken(hb.nbSig === I.sig ? hb.nb : '', I.n), gesehen: new Set(), dirty: true, gesendet: null }); }
    function nbKennt(who, hb, lmId) {                 // kennt er dieses Gebiet (oder ein Nachbar-Gebiet über eine Brücke)?
        const z = nbZ(who, hb), I = nbIndex(), on = id => ((landmasses[id] || {}).fogCells || []).some(c => { const i = I.map.get(c.k); return i !== undefined && bitHat(z.zellen, i); });
        return !!hb.nbAlle || on(lmId) || bridges.some(br => (br.a === lmId && on(br.b)) || (br.b === lmId && on(br.a)));
    }
    function nebelRunde(who, hb, now) {
        const z = nbZ(who, hb), I = nbIndex(), own = botOwnedIslands[who], weit = REVEAL_BASE * (AUF ? AUF.nebelWeite(who) : 1);
        if (own) for (const id of own) if (!z.gesehen.has(id)) { z.gesehen.add(id); const i = islandById[id]; if (i && nbAufdecken(z, i.x, i.y, weit)) z.dirty = true; }
        if (hb.sp && hb.sp.length) hb.sp = hb.sp.filter(sc => {    // Erkundungs-Späher: unterwegs eine Gasse, am Ziel die Umgebung
            const h = islandById[sc[0]]; if (!h) return false;
            const L = Math.hypot(sc[1] - h.x, sc[2] - h.y) || 1, prog = Math.max(0, Math.min(1, (now - sc[3]) / Math.max(1, sc[4] - sc[3])));
            for (let d = sc[5] || 0; d <= L * prog; d += 2500) if (nbAufdecken(z, h.x + (sc[1] - h.x) * d / L, h.y + (sc[2] - h.y) * d / L, 3400)) z.dirty = true;
            sc[5] = Math.max(sc[5] || 0, Math.floor(L * prog / 2500) * 2500 + 2500);
            if (now < sc[4]) return true;
            if (nbAufdecken(z, sc[1], sc[2], REVEAL_SCOUT)) z.dirty = true; return false;
        });
        if (!z.dirty) return;
        z.dirty = false; hb.nb = nbPacken(z.zellen, I.n); hb.nbSig = I.sig; saveBotState();
        const s = new Uint8Array((I.maxId >> 3) + 1);
        for (const i of islands) if (hb.nbAlle || nbOffen(z, I, i.x, i.y) || (i.ends && i.ends.some(e => nbOffen(z, I, e[0], e[1])))) bitSetz(s, i.id);
        const b64 = bitsZu(s);
        if (b64 !== z.gesendet) { z.gesendet = b64; WELT.sichtRaus[parseInt(who.slice(1), 10)] = b64; }
    }
    // Späher an einer fremden Basis angekommen: der Bericht so, wie er gerade ist (Truppen, Verteidigung, Blick auf den Herrn) –
    // das Handy hat diese Werte nicht (server.php FREMD_OEFFENTLICH)
    function spaehRunde(who, hb, now) {
        if (!hb.sb || !hb.sb.some(sc => now >= sc[1])) return;
        hb.sb = hb.sb.filter(sc => {
            if (now < sc[1]) return true;
            const t = islandById[sc[0]], ow = t && islandOwnerOf(t.id);
            const r = { art: 'spaeh', ziel: sc[0] };
            if (t) { r.troops = effectiveTroops(t); r.defense = effectiveDefense(t); r.spy = ow && ow !== who ? spaeherBlick(ow) : null; }
            WELT.nachricht(parseInt(who.slice(1), 10), r); return false;
        });
        if (!hb.sb.length) delete hb.sb;
        saveBotState();
    }
    // Fremde Armeen und besetzte Felder, die er sieht (ihr Feld ist bei ihm aufgedeckt – wie am Handy isCellOpen): nur für die
    // schickt der Server Truppen und Helden (server.php marsch_welt). Geschickt wird nur, wenn sich die Liste ändert.
    function armeeSichtRunde(who, hb) {
        const z = nbZ(who, hb), I = nbIndex(), offen = (x, y) => !!hb.nbAlle || nbOffen(z, I, x, y), l = [];
        for (const a of armies) { if (armyWho(a) === who) continue; const p = armyPos(a); if (p && offen(p.x, p.y)) l.push(String(a.id)); }
        for (const f of resFields) { const st = fieldState[f.id]; if (st && st.occ && st.occ.who !== who && offen(f.x, f.y)) l.push(f.id); }
        const t = JSON.stringify(l.sort());
        if (t !== z.armGesendet) { z.armGesendet = t; WELT.armeeSichtRaus[parseInt(who.slice(1), 10)] = l; }
    }
    // (jeden Puls) Nebel, Abgelehntes nochmal prüfen, jede Minute die Truppen-Summen für die Rangliste
    let hbErst = true;
    // dasselbe (alte) Profil nochmal anwenden – nur fürs Hauptbuch. Was die Welt seitdem gerechnet hat (Rohstoffe, Verwundete,
    // Erfolge, Helden-Splitter: Ertrag, Beute, Kämpfe), bleibt: vorher sprang es auf die Profil-Werte zurück, und welt.js schickte
    // den Unterschied als Nachricht (Beute kam zurück – unbegrenzt Rohstoffe über Plündern; ehrlicher Ertrag ging verloren)
    function hbNochmal(who, b, p) {
        const welt = { res: b.res, wounded: b.wounded, stats: b.stats }, dazu = {}, hb = b.hb;
        for (const k in welt) if (welt[k] === undefined) delete welt[k];
        if (b.hs && hb && hb.hs) for (const h in b.hs) { const z = hb.hs[h]; if (b.hs[h] && z) dazu[h] = nn(b.hs[h].sh) - nn(z[2]); }   // Splitter, die die Welt seitdem gab
        Object.assign(b, WELT.profilZuBot(p, b, who), welt);
        if (b.hs) for (const h in dazu) if (b.hs[h] && dazu[h]) b.hs[h].sh = Math.max(0, nn(b.hs[h].sh) + dazu[h]);   // (auf das, was das Hauptbuch jetzt sagt)
    }
    function hbRunde(now) {
        if (!AUF) return;                              // (der allererste Puls kommt, bevor aufbau.js geladen ist)
        const bs = loadBotState();
        if (hbErst && SYSTEM) {                        // Weltrechner gestartet: alle bekannten echten Spieler einmal gegen ihr Hauptbuch klemmen
            hbErst = false;                            // (die Welt kam beim Laden roh aus den Profilen; jetzt ist auch aufbau.js da)
            for (const who in WELT.menschen) if (bs[who] && WELT.menschen[who].profil) try { Object.assign(bs[who], WELT.profilZuBot(WELT.menschen[who].profil, bs[who], who)); } catch (e) { console.warn('Hauptbuch:', e); }
        }
        for (const who in WELT.menschen) {
            const b = bs[who], hb = b && b.hb && b.hb.v === HB_V ? b.hb : null; if (!hb || !botById[who]) continue;
            try { nebelRunde(who, hb, now); armeeSichtRunde(who, hb); } catch (e) { console.warn('Nebel:', e); }
            try { spaehRunde(who, hb, now); } catch (e) { console.warn('Späher:', e); }
            const mm = wm(who); if (mm.hbOffen && now - nn(mm.hbPrT) > 10000) { const p = profilVon(who); if (p) hbNochmal(who, b, p); else mm.hbOffen = 0; }   // (Münzen/Gems kommen evtl. später)
        }
        if (now - hbTtT > 60000) {                     // Truppen-Summe je Herrscher (Spieler bekommen fremde Truppen nur, wo sie hinsehen dürfen)
            if (Math.floor(now / 600000) !== Math.floor(hbTtT / 600000)) for (const who in nbMem) { if (nbMem[who].gesendet) WELT.sichtRaus[parseInt(who.slice(1), 10)] = nbMem[who].gesendet; nbMem[who].armGesendet = null; }   // (alle 10 Min. die Sicht nochmal – falls ein Puls sie verloren hat; der Server ändert nur Neues)
            hbTtT = now;
            for (const bd of BOT_DEFS) { const b = bs[bd.id]; if (!b) continue; let n = 0; for (const id of botOwnedIslands[bd.id] || []) n += islandTroops[id] || 0;
                const r = n < 1000 ? Math.round(n) : Number(n.toPrecision(3)); if (b.tt !== r && Math.abs((b.tt || 0) - r) > r * .01) b.tt = r;
                let m = 0; try { m = powerOf(whoProfile(bd.id)); } catch (e) { m = 0; }      // Macht für Rangliste, Profil, Bündnis (die Handys kennen die Werte dafür nicht)
                const mr = m < 1000 ? Math.round(m) : Number(m.toPrecision(3)); if (b.macht !== mr && !(Math.abs((b.macht || 0) - mr) <= mr * .01)) b.macht = mr; }   // (nur bei Änderung – sonst ein Flicken je Minute)
        }
    }
    // Ziel einer Armee/Ort einer neuen Armee: nur echte Orte (Basis, Feld, Armee, Punkt auf Land)
    function punktOk(p) {
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > FRAME_HALF || Math.abs(p.y) > FRAME_HALF) return false;
        const lm = landmasses.find(l => l.id === p.lm); return !!lm && Math.hypot(p.x - lm.x, p.y - lm.y) <= lm.shapeMaxR * 1.2;
    }
    function zielPruefen(t) {
        if (!t || typeof t !== 'object') return null;
        if (t.kind === 'base' || t.kind === 'home') { const i = Number.isInteger(t.id) ? islandById[t.id] : null; return i ? { kind: t.kind, id: i.id, x: i.x, y: i.y, lm: i.landmassId } : null; }
        if (t.kind === 'field') { const f = (typeof t.id === 'number' || typeof t.id === 'string') ? fieldById[t.id] : null; return f ? { kind: 'field', id: f.id, x: f.x, y: f.y, lm: f.landmassId } : null; }
        if (t.kind === 'army') { const a = kennungOk(t.id) ? armyById(t.id) : null; return a ? Object.assign({ kind: 'army', id: a.id }, armyPosXY(a)) : null; }
        if (t.kind === 'point') return punktOk(t) ? { kind: 'point', x: t.x, y: t.y, lm: t.lm } : null;
        return null;
    }
    const heldOk = h => kennungOk(h) ? h : null;
    const truppenVon = (id, n) => zahlOk(n) ? Math.floor(Math.min(n, islandTroops[id] || 0)) : 0;   // nie mehr, als die Basis hat
    // Wege wie auf dem Handy (dort prüft das Spiel sie in den Fenstern): Brücken, Pässe, fremde Tore – nie mehr nur „vertrauen“
    const wegOk = (who, vonLm, nachLm) => vonLm === nachLm || canReach(vonLm, nachLm, who);
    // Mehrfachangriff / „Truppen sammeln“ (grp): zusammen EIN Marsch-Platz – kostet 1 Gem (wie am Handy, vorher hier gratis).
    // Gehört der Marsch zu einer schon laufenden Gruppe, ist sie bezahlt. Sonst ohne Gem: ein normaler Marsch (eigener Platz).
    function gruppeBezahlt(who, grp, src, nach) {
        if (!kennungOk(grp)) return null;
        if (AUF && AUF.gruppeLaeuft && AUF.gruppeLaeuft(who, grp, src)) {
            if (nach === undefined || pendingSends.some(s => werIstWer(s.senderBotId) === who && s.grp === grp && !s.back && s.toId === nach)) return grp;   // (sammeln: alle zur SELBEN Basis)
            return null; }
        const hb = hbDa(who); if (!hb) return grp;                        // (noch kein Hauptbuch: wie bisher)
        if (hbZahlen(who, hb, wacheSehen(who), { g: MULTI_ATTACK_GEM_COST })) { saveBotState(); return grp; }
        warnen(who, 'gems', (src !== undefined ? 'Mehrfachangriff' : 'Truppen sammeln') + ' ohne den Gem dafür – zählt als normaler Marsch.', 1); return null;
    }
    const werIstWer = x => x || 'player';
    const BEFEHLE = {
        angriff(who, b) {
            if (!inselOk(b.src) || !inselOk(b.ziel) || !zahlOk(b.n) || b.n < 1) { warnen(who, 'kaputt', 'Angriff mit kaputten Angaben – abgelehnt.'); return; }
            if (islandOwnerOf(b.ziel) === who) { warnen(who, 'kaputt', 'Angriff auf die eigene Basis – abgelehnt.'); return; }   // (brachte sonst Gratis-EP)
            if (!gehoert(b.src, who)) return;
            if (!wegOk(who, islandById[b.src].landmassId, islandById[b.ziel].landmassId)) { warnen(who, 'weg', 'Angriff ohne Weg dorthin (Brücke/Tor) – abgelehnt.'); nichtLos(who, null, b.src, 'Angriff auf ' + islandTitle(islandById[b.ziel]), 'kein Weg – ein fremdes Tor liegt dazwischen'); return; }
            b.n = Math.floor(b.n);
            naechsteGruppe = gruppeBezahlt(who, b.grp, b.src);                // Mehrfachangriff = ein Marsch-Platz (nur vom selben Ort, nur kurz nacheinander)
            const grpA = naechsteGruppe; let okA = false;
            try { okA = launchAttack(b.src, b.ziel, who, b.n, heldOk(b.held), heldOk(b.held2)); } finally { naechsteGruppe = null; }
            if (!okA) nichtLos(who, grpA, b.src, 'Angriff auf ' + islandTitle(islandById[b.ziel]));   // (vorher: still verworfen – auf dem Handy verschwand der Marsch einfach)
        },
        senden(who, b) {
            if (!inselOk(b.von) || !inselOk(b.nach) || !zahlOk(b.n) || b.n < 1) { warnen(who, 'kaputt', 'Senden mit kaputten Angaben – abgelehnt.'); return; }
            if (!gehoert(b.von, who) || !gehoert(b.nach, who)) return;
            if (!wegOk(who, islandById[b.von].landmassId, islandById[b.nach].landmassId)) { warnen(who, 'weg', 'Senden ohne Weg dorthin (Brücke/Tor) – abgelehnt.'); nichtLos(who, null, undefined, 'Truppen nach ' + islandTitle(islandById[b.nach]), 'kein Weg – ein fremdes Tor liegt dazwischen'); return; }
            b.n = Math.floor(b.n);
            const vI = islandById[b.von], nI = islandById[b.nach];               // („Truppen sammeln“: nur aus dem Umkreis, wie am Handy)
            naechsteGruppe = Math.hypot(vI.x - nI.x, vI.y - nI.y) <= RECALL_RADIUS ? gruppeBezahlt(who, b.grp, undefined, b.nach) : null;
            const grpS = naechsteGruppe, kS = pendingSends.length;
            try { launchSend(b.von, b.nach, who, b.n); } finally { naechsteGruppe = null; }
            if (pendingSends.length === kS) nichtLos(who, grpS, undefined, 'Truppen nach ' + islandTitle(islandById[b.nach]));
        },
        zurueck(who, b) {                             // umkehren: wie bei dir, nur als "Marsch zurück" dieses Spielers
            if (!kennungOk(b.key)) return;
            const m = marschVon(who, b.key); if (!m || m.fightEndsAt || m.rally || m.back) return;   // (eine Rally gehört allen, die mitmachen; wer schon heimgeht, kehrt nicht nochmal um)
            if (!pendingAttacks.includes(m) && !pendingSends.includes(m)) { marschUmkehren(m, Date.now()); requestRender(); return; }   // Lager, Boss, Drache, Invasion, Sammler
            const now = Date.now(), fromId = m.sourceId ?? m.fromId, toId = m.targetId ?? m.toId, troops = m.rawTroops ?? m.troops;
            if (pendingAttacks.includes(m)) heroWutZurueck(who, m.hx);   // (nicht gekämpft: die Wut bleibt)
            (pendingAttacks.includes(m) ? pendingAttacks : pendingSends).splice((pendingAttacks.includes(m) ? pendingAttacks : pendingSends).indexOf(m), 1);
            const home = gehoert(fromId, who) ? fromId : botCapitalOf(who);
            pendingSends.push({ fromId: toId, toId: home, troops, startedAt: now, resolveAt: now + Math.max(1000, Math.min(now, m.resolveAt) - m.startedAt), senderBotId: who, back: true });
            saveGame(); saveProgression(); requestRender();
        },
        schneller(who, b) {                           // die Gems zahlt er auf seinem Handy – 3B: das Hauptbuch zieht sie ab (kann er sie haben?)
            if (!Array.isArray(b.keys)) return;
            if (zuOft(wm(who), 'schneller', 60, 60000)) { warnen(who, 'schneller', 'Beschleunigen über 60-mal pro Minute – der Rest verfällt.'); return; }
            const now = Date.now(), keys = [...new Set(b.keys.filter(kennungOk))].slice(0, 200), ms = [];
            for (const key of keys) { const m = marschVon(who, key); if (!m || m.fightEndsAt || m.resolveAt - now < 1500) continue; ms.push(m); }
            const kosten = ms.reduce((a, m) => a + speedUpCost(m), 0), hb = hbDa(who);
            if (hb && kosten > 0 && !b._nach && !schonBezahlt(wacheSehen(who), b, true) && !hbZahlen(who, hb, wacheSehen(who), { g: kosten })) { warnen(who, 'gems', 'Beschleunigen für ' + kosten + ' Gems – so viele kann er nicht haben. Abgelehnt.', kosten); return; }
            for (const m of ms) { const rem = m.resolveAt - now;
                const pr = Math.max(0, Math.min(.99, (now - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt))); m.resolveAt = now + rem / 2; m.startedAt = m.resolveAt - (rem / 2) / (1 - pr); }
            saveProgression(); feldBarbSpeichern(); if (ms.length) befehlBezahlt(b);
        },
        spaehen(who, b) {                             // 3B: Erkundungs-Späher – der Weltrechner deckt seinen Nebel (auf dem Server) mit auf
            const hb = hbDa(who); if (!hb || !inselOk(b.ziel)) return;
            if (zuOft(wm(who), 'spaehen', 120, 3600000)) { warnen(who, 'spaehen', 'Über 120 Späher in einer Stunde – abgelehnt.'); return; }
            const t = islandById[b.ziel], pt = { x: Number.isFinite(b.ex) ? b.ex : t.x, y: Number.isFinite(b.ey) ? b.ey : t.y, lm: t.landmassId };
            if (b.blick) {                            // Späher zu einer fremden Basis: bei Ankunft schreibt der Weltrechner den Bericht (nur er kennt die Werte des Herrn)
                const ow = islandOwnerOf(t.id); if (!ow || ow === who || bossAt(t.id)) return;
                let h = null, hd = Infinity; for (const id of botOwnedIslands[who] || []) { const i = islandById[id]; if (!i) continue; const d = Math.hypot(i.x - t.x, i.y - t.y); if (d < hd) { hd = d; h = i; } }
                if (!h || !spaeherWeg(h.landmassId, t.landmassId, who)) return;
                if (!nbKennt(who, hb, t.landmassId)) { warnen(who, 'spaehen', 'Späher zu einer Basis, die er nicht kennen kann – abgelehnt.'); return; }
                const now = Date.now(); hb.sb = (hb.sb || []).slice(-20); hb.sb.push([t.id, now + scoutSecs(h, t, who) * 1000]); saveBotState(); return;
            }
            if (!punktOk(pt)) { warnen(who, 'kaputt', 'Späher mit kaputtem Ziel – abgelehnt.'); return; }
            let home = null, bd = Infinity; for (const id of botOwnedIslands[who] || []) { const i = islandById[id]; if (!i) continue; const d = Math.hypot(i.x - t.x, i.y - t.y); if (d < bd) { bd = d; home = i; } }
            if (!home || !spaeherWeg(home.landmassId, t.landmassId, who)) return;                 // (wie auf dem Handy: von der nächsten eigenen Basis, nicht durch zu Tore)
            if (!nbKennt(who, hb, t.landmassId)) { warnen(who, 'spaehen', 'Späher in ein Gebiet, das er nicht kennen kann – abgelehnt.'); return; }
            const now = Date.now(); hb.sp = (hb.sp || []).slice(-40); hb.sp.push([home.id, Math.round(pt.x), Math.round(pt.y), now, now + scoutSecs(home, t, who) * 1000, 0]); saveBotState();
        },
        ausbau(who, b) {                              // die Münzen zahlt er selbst – der Weltrechner prüft, ob er sie haben kann
            const m = wm(who);
            if (zuOft(m, 'ausbau', 60, 10000)) { warnen(who, 'ausbau', 'Ausbau über 60-mal in 10 s – der Rest verfällt.'); return; }
            const x = { b, bis: Date.now() + WACHE_WARTEN_MS }; m.warte.ausbau.push(x); wacheAbarbeiten(who);
            if (m.warte.ausbau.includes(x)) { x.wartet = true; return 'wartet'; }   // (noch nicht entschieden: welt.js quittiert ihn noch nicht)
        },
        hauptstadt(who, b) {
            if (!inselOk(b.insel)) return;
            const to = islandById[b.insel], bs = loadBotState()[who]; if (!to || to.type !== 'tower' || !gehoert(b.insel, who) || !bs) return;
            if (zuOft(wm(who), 'hauptstadt', 20, 3600000)) { warnen(who, 'hauptstadt', 'Hauptstadt über 20-mal in einer Stunde verlegt – abgelehnt.'); return; }
            if (pendingAttacks.some(a => a.targetId === b.insel)) return;   // nicht in eine Basis, auf die gerade ein Angriff läuft (wie bei den Mitspielern)
            const hb = hbDa(who); if (hb && !b._nach && !schonBezahlt(wacheSehen(who), b, true) && !hbZahlen(who, hb, wacheSehen(who), { g: TELEPORT_GEMS })) { warnen(who, 'gems', 'Hauptstadt verlegen für ' + TELEPORT_GEMS + ' Gems – so viele kann er nicht haben. Abgelehnt.', TELEPORT_GEMS); return; }
            const from = botCapitalOf(who); if (from !== null && from !== undefined && from !== b.insel) { islandTroops[b.insel] = (islandTroops[b.insel] || 0) + (islandTroops[from] || 0); islandTroops[from] = 0; }
            bs.capital = b.insel; capitalCache = null; saveBotState(); saveGame(); requestRender(); befehlBezahlt(b);
        },
        truppen(who, b) {                             // geschenkte Truppen (Stufe, Thron-Shop, Krankenhaus, Fund, Admin) → Hauptstadt
            const x = { b, bis: Date.now() + WACHE_WARTEN_MS }, l = wm(who).warte.truppen; l.push(x); wacheAbarbeiten(who);
            if (l.includes(x)) { x.wartet = true; return 'wartet'; }
        },
        tor(who, b) {
            if (!inselOk(b.tor) || islandById[b.tor].type !== 'gate' || !gehoert(b.tor, who) || !b.patch || typeof b.patch !== 'object') return;
            const patch = {};
            if (b.patch.toll !== undefined) { if (!GATE_TOLLS.includes(b.patch.toll)) { warnen(who, 'kaputt', 'Tor-Maut mit ungültigem Wert (' + String(b.patch.toll).slice(0, 20) + ') – abgelehnt.'); return; } patch.toll = b.patch.toll; }
            if (b.patch.closed !== undefined) patch.closed = b.patch.closed === true;
            if (Object.keys(patch).length) setGateSettings(b.tor, patch);
        },
        titel(who, b) {
            if (rulerOwner() !== who || !TITLES.some(x => x.key === b.key)) return;
            const wem = b.wem ? (kennungOk(b.wem) ? lokalId(b.wem) : null) : null;
            if (b.wem && (!wem || !botById[wem] || wem === who)) return;   // (sich selbst keinen Titel)
            giveTitle(b.key, wem);
        },
        feld(who, b) {
            const f = (typeof b.feld === 'number' || typeof b.feld === 'string') ? resFields.find(x => x.id === b.feld) : null;
            if (!f || !inselOk(b.home) || !gehoert(b.home, who)) return;
            if (!wegOk(who, islandById[b.home].landmassId, f.landmassId)) { warnen(who, 'weg', 'Sammeln ohne Weg dorthin – abgelehnt.'); return; }
            const st = fieldInfo(f); if (st.left <= 0 && !(st.occ && st.occ.who === who)) return;   // leer (wächst nach): nichts zu holen
            const n = truppenVon(b.home, b.n); if (n >= 1) fieldSend(who, b.home, b.feld, n, heldOk(b.held), heldOk(b.held2));
        },
        feldHeim(who, b) { const f = resFields.find(x => x.id === b.feld), st = f && fieldInfo(f); if (st && st.occ && st.occ.who === who) { fieldGoHome(f, st, Date.now()); saveFields(); } },
        lager(who, b) {
            if (!inselOk(b.home) || !gehoert(b.home, who) || !['c', 'b', 'i', 'd'].includes(b.k)) return;
            if (b.k === 'i' || b.k === 'd') {                // Events: eine Barbaren-Armee abfangen / den Drachen angreifen
                if (zuOft(wm(who), 'event', 40, 3600000)) { warnen(who, 'lager', 'Über 40 Event-Angriffe in einer Stunde – abgelehnt.'); return; }
                if (b.k === 'i' && (!kennungOk(b.tid) || !invArmee(b.tid))) return;
                if (b.k === 'i' && !wegOk(who, islandById[b.home].landmassId, invPos(invArmee(b.tid)).lm)) { warnen(who, 'weg', 'Abfangen ohne Weg dorthin – abgelehnt.'); return; }
                if (b.k === 'd') { const D = drAktiv(); if (!D) return; if ((D.hits[who] || 0) >= DR_HITS) { warnen(who, 'lager', 'Mehr als ' + DR_HITS + ' Angriffe auf den Drachen – abgelehnt.'); return; } }
                const n = truppenVon(b.home, b.n); if (n >= 1) barbSend(who, b.home, b.k, b.k === 'i' ? b.tid : null, n, heldOk(b.held), heldOk(b.held2)); return;
            }
            // Tagesgrenzen wie auf dem Handy (Boss 10 Angriffe, Lager 20 pro Tag) – auch, was gerade unterwegs ist, zählt mit
            // (Boss: der Zähler steigt schon beim Losschicken; Lager: beim Sieg – darum zählen dort die unterwegs mit, wie barbLeft)
            if (b.k === 'b' ? barbRec(who).h >= dbossHitsMax() : barbLeft(who) <= 0) { warnen(who, 'lager', 'Tagesgrenze für ' + (b.k === 'b' ? 'den Boss' : 'Lager') + ' überschritten – abgelehnt.'); return; }
            if (b.k === 'c') { const c = barbCampById(b.tid); if (!c || !barbOpenFor(who, c.L)) return;   // nur Lager, die schon freigespielt sind
                if (!wegOk(who, islandById[b.home].landmassId, c.lm)) { warnen(who, 'weg', 'Lager-Angriff ohne Weg dorthin – abgelehnt.'); return; } }
            const n = truppenVon(b.home, b.n); if (n >= 1) barbSend(who, b.home, b.k, b.k === 'c' ? b.tid : null, n, heldOk(b.held), heldOk(b.held2));
        },
        armee(who, b) {
            if (b.op === 'neu') {
                if (!b.pt || !punktOk(b.pt) || !Array.isArray(b.quellen)) return;
                const q = b.quellen.slice(0, 10).filter(id => inselOk(id) && gehoert(id, who) && wegOk(who, islandById[id].landmassId, b.pt.lm));
                const anteil = zahlOk(b.anteil, 1) ? b.anteil : .5;
                if (q.length) armyCreate({ x: b.pt.x, y: b.pt.y, lm: b.pt.lm }, q, anteil, who); return;
            }
            const a = kennungOk(b.id) ? armyById(b.id) : null; if (!a || armyWho(a) !== who) return;
            if (b.op === 'dazu' && inselOk(b.quelle) && gehoert(b.quelle, who) && wegOk(who, islandById[b.quelle].landmassId, armyPosXY(a).lm)) {   // (wo sie jetzt ist – unterwegs nicht mehr a.lm)
                const n = truppenVon(b.quelle, b.n); if (n >= 1) armySendFrom(a, b.quelle, n); }
            if (b.op === 'ziehen') { const t = zielPruefen(b.ziel); if (t) armyMove(a, t); }
            if (b.op === 'held') armySetHeroes(a, heldOk(b.held), heldOk(b.held2));   // Haupt- und Zweitheld: nur eigene, freie (armySetHeroes prüft)
            saveArmies(); requestRender();
        },
        beitreten(who, b) {                           // ein neuer Spieler braucht seinen Platz auf der Karte
            if (!botOwnedIslands[who]) window.__weltNeuerMensch(who);
            if (botOwnedIslands[who] && botOwnedIslands[who].size) return;      // hat schon einen
            let isl = inselOk(b.insel) ? islandById[b.insel] : null, aus = null;
            if (isl && landmasses[isl.landmassId].tier !== 'outer') isl = null;   // Start nur am äußeren Rand (nicht in der Mitte oder bei den Wächtern)
            if (!isl || isl.type !== 'tower' || islandOwnerOf(isl.id)) {
                const besitz = { player: [...ownedIslands] }; for (const bot of BOT_DEFS) besitz[bot.id] = [...(botOwnedIslands[bot.id] || [])];
                const p = freierStartplatz(besitz); isl = p.insel; aus = p.aus || null;
            }
            if (!isl || (islandOwnerOf(isl.id) && !aus)) return;
            if (aus) { clearIslandOwner(isl.id); WELT.nachricht(parseInt(who.slice(1), 10), { art: 'startschild', bis: Date.now() + 3600000 }); }   // mitten in fremdem Land: 1 Stunde Frieden zum Ankommen (wie bei den Mitspielern)
            botOwnedIslands[who].add(isl.id); islandLevels[isl.id] = 1; islandTroops[isl.id] = PLAYER_START_TROOPS;
            const bs = loadBotState(); bs[who] = WELT.profilZuBot(WELT.menschen[who] && WELT.menschen[who].profil, bs[who], who); bs[who].capital = isl.id;
            if (!(bs[who].neuBis > Date.now())) bs[who].neuBis = Date.now() + NEULING_MS;          // Anfängerschutz ab der ersten Sekunde
            capitalCache = null; saveGame(); saveBotState(); requestRender();
        }
    };
    // Vom Admin (kommt nur von admin.php – der Server legt es unter Spieler 0 ab): Geschenk an einen Bot oder alle Bots,
    // oder die Gutschrift für ein Geschenk an einen echten Spieler (damit der Schummel-Schutz es beim Abholen durchlässt)
    function adminBefehl(b) {
        if (!b || b.art !== 'admin') return;
        if (b.was === 'gutschrift') {
            const who = 'u' + parseInt(b.an, 10); if (!(parseInt(b.an, 10) > 0)) return;
            if (!botById[who]) { WELT.menschEintragen(who); window.__weltNeuerMensch(who); }
            const d = wd(who); if (!d) return;
            d.gTr = nn(d.gTr) + (zahlOk(b.tr) ? b.tr : 0); d.gC = nn(d.gC) + (zahlOk(b.coins) ? b.coins : 0);
            const hb = hbDa(who); if (hb) {             // 3B: Gems, Splitter und Kiste kennt jetzt auch das Hauptbuch
                if (zahlOk(b.gems, 1e9)) hb.gIn = nn(hb.gIn) + b.gems; if (zahlOk(b.sh, 1e6)) hb.shB = nn(hb.shB) + b.sh;
                if (Number.isInteger(b.crate) && b.crate >= 0 && b.crate <= 5) hbKisteDazu(hb, b.crate); }
            saveBotState(); return;
        }
        if (b.was === 'nebel') {                       // 3B: Nebel freischalten (admin.php) – auch auf dem Server die ganze Karte
            const bs = loadBotState();
            for (const who in WELT.menschen) { if (b.an !== 'alle' && who !== 'u' + parseInt(b.an, 10)) continue; const hb = hbDa(who); if (!hb) continue; hb.nbAlle = 1; if (nbMem[who]) nbMem[who].dirty = true; }
            saveBotState(); return;
        }
        if (b.was !== 'geschenk_bot') return;
        const bs = loadBotState(), ziele = BOT_DEFS.filter(d => !d.mensch && (b.bot === 'alle' || d.id === b.bot));
        for (const d of ziele) { const st = bs[d.id]; if (!st) continue;
            if (b.gems > 0) st.gems = (st.gems || 0) + Math.round(b.gems);
            if (b.coins > 0) botCoins[d.id] = (botCoins[d.id] || 0) + Math.round(b.coins);
            if (b.sh > 0) try { heroGrantShards(d.id, Math.round(b.sh)); } catch (e) {}
            if (b.tr > 0) { const c = botCapitalOf(d.id); if (c !== null && c !== undefined) islandTroops[c] = (islandTroops[c] || 0) + Math.round(b.tr); }
            if (b.crate >= 0 && st.spare) { const k = pickRandomSlot(); if (st.spare[k]) st.spare[k][Math.max(b.crate, pickRandomRarity())]++; }   // wie eine Kiste: der Bot legt sie selbst an
        }
        saveBotState(); saveGame(); requestRender();
    }
    window.__weltBefehl = function (who, b) {
        if (who === 'u0') return adminBefehl(b);
        if (!b || typeof b !== 'object' || !Object.prototype.hasOwnProperty.call(BEFEHLE, b.art)) return;
        const f = BEFEHLE[b.art];
        if (!botById[who]) { WELT.menschEintragen(who); window.__weltNeuerMensch(who); }
        if (!botById[who]) return;
        if (zuOft(wm(who), 'alle', 600, 60000)) { warnen(who, 'flut', 'Über 600 Befehle in einer Minute – der Rest verfällt.'); return; }
        return f(who, b);                              // ('wartet': noch nicht entschieden – siehe befehlFertig)
    };
    WELT.BEFEHLE = BEFEHLE;
    // für buendnis.js: Münzen prüfen (ohne abzuziehen – das geht als Nachricht „−Münzen“), Gutschrift für Geschenke, Warnungen
    // Bündnis-Geschenk für eine große Kiste (buendnis.js op 'kiste'): nur für eine ECHTE Heldenkiste. Beleg = EIN Profil-Schritt, in
    // dem mindestens so viele Helden-Splitter neu dazukamen (ohne bekannte Quelle – nur Heldenkisten machen aus Gems Splitter) UND
    // mindestens so viele Gems weg sind, wie genau diese Kiste hat (Kauf am Handy: Gems weg und Splitter da im selben Augenblick).
    // Jeder Beleg zählt nur einmal (Splitter und Gems werden verbraucht), höchstens 10 Min. vorher oder nachher; der Rest des
    // Preises, den die Splitter nicht schon gekostet haben, wird im Hauptbuch abgebucht. Ein Schild oder anderer Gem-Kauf hat keine
    // Splitter, Splitter ohne Gems (Aufgaben, Pass) haben keine Ausgabe – beides ist nie ein Beleg. Befehl und Profil kommen in
    // beliebiger Reihenfolge – ein Befehl ohne Beleg wartet (und verfällt nach 10 Min.).
    const KISTE_FRIST = 600000;
    function hbKisteFrei(who, hb, now) {
        const L = (hb.kisteOffen || []).filter(k => now - k.t < KISTE_FRIST), B = (hb.shKauf || []).filter(x => now - x.t < KISTE_FRIST);
        let n = 0; const bleibt = [];
        for (const k of L) {
            const x = B.find(y => y.sh >= k.sh - 1e-6 && nn(y.gd) >= k.g - 1e-6); if (!x) { bleibt.push(k); continue; }   // kein passender Beleg (noch nicht)
            const anteil = x.sh > 0 ? Math.min(1, k.sh / x.sh) : 0, gSchon = nn(x.g) * anteil, fehlt = Math.max(0, Math.round(k.g - gSchon));
            if (fehlt > 0 && !hbZahlen(who, hb, wacheSehen(who), { g: fehlt })) { bleibt.push(k); continue; }
            x.sh -= k.sh; x.gd = nn(x.gd) - k.g; x.g = nn(x.g) - gSchon; n++;
        }
        hb.kisteOffen = bleibt; hb.shKauf = B.filter(y => y.sh > 1e-6 && nn(y.gd) > 1e-6);
        for (let i = 0; i < n; i++) if (typeof bundGeschenk === 'function') bundGeschenk(who, 'kiste');
    }
    WELT.kisteGekauft = function (who, c) {
        const hb = hbDa(who); if (!hb || !c || !(c.gems > 0)) return;
        const L = hb.kisteOffen || (hb.kisteOffen = []); L.push({ g: c.gems, sh: c.sh * c.n, t: Date.now() }); if (L.length > 5) L.shift();
        hbKisteFrei(who, hb, Date.now()); saveBotState();
    };
    WELT.wache = {
        kann(who, kosten) { const m = wacheSehen(who), d = wd(who), hb = hbDa(who); vorAltern(who, m, Date.now()); return m.c.vor + m.c.u + (hb ? nn(hb.cA) : 0) + spielraumFrei(who, m) + (d ? nn(d.gC) : 0) >= kosten; },
        gutschrift(who, c, tr) { const d = wd(who); if (!d) return; d.gC = nn(d.gC) + nn(c); d.gTr = nn(d.gTr) + nn(tr); saveBotState(); },
        hilfe(who, key, ms) { const hb = hbDa(who); if (!hb || !(ms > 0)) return; const H = hb.hilfe || (hb.hilfe = {}); H[key] = nn(H[key]) + ms;   // Bündnis-Hilfe: so viel schneller darf dieser Bau / diese Forschung fertig sein
            const ks = Object.keys(H); if (ks.length > 40) delete H[ks[0]]; saveBotState(); },
        warnen, zuOft: (who, art, max, ms) => zuOft(wm(who), art, max, ms)
    };

    // Nachrichten vom Weltrechner an mich: Münzen, Gems, EP, Thron-Punkte, Krankenhaus, Splitter, Zahlen
    const STAT_NAMEN = { caps: 'captures', pvp: 'pvpWins', defs: 'defends', bosses: 'bosses', temples: 'temples', scouts: 'scouts', tolls: 'tolls', tollCoins: 'tollCoins', armyWins: 'armyWins', healed: 'healed', barb: 'barb', dboss: 'dboss', throneMin: 'throneMin', heroFires: 'heroFires' };   // (Thron-Minuten und Helden-Zünder zählt der Weltrechner – vorher kamen sie nie an)
    WELT.beiNachricht.push(function (e) {
        if (!e || e.art !== 'delta') return;
        if (e.coins) coins = Math.max(0, coins + e.coins);
        if (e.gems) gems = Math.max(0, gems + e.gems);
        if (e.tp) { throneState.pts = Math.max(0, (throneState.pts || 0) + e.tp); if (e.tp > 0) throneState.earned = (throneState.earned || 0) + e.tp; saveThrone(); }
        if (e.xp > 0) addXp(e.xp);
        if (e.wounded) { const c = loadCity(); c.wounded = Math.max(0, (c.wounded || 0) + e.wounded); saveCity(); }
        if (e.sh) { const hs = loadHeroes(); for (const h in e.sh) if (hs[h]) hs[h].sh = Math.max(0, (hs[h].sh || 0) + e.sh[h]); saveHeroes(); }
        if (e.stats) for (const k in e.stats) if (STAT_NAMEN[k] && Number.isFinite(e.stats[k]) && e.stats[k] > 0 && e.stats[k] <= 1e6) { statBump(STAT_NAMEN[k], e.stats[k]); if (k === 'caps') questProgress('capture', e.stats[k]); }   // (Tagesaufgabe „Erobere …“ auch für echte Spieler)
        if (e.res && AUF) AUF.rohDazu('player', e.res);                          // Holz, Stein, Eisen (Produktion, Sammeln)
        updateHud(); saveGame(); saveProgression();
    });

    // Kampfbericht an einen anderen echten Spieler (vom Weltrechner): Kennungen neutral, er rechnet sie für sich um
    WELT.bericht = function (an, eintrag, hint) {
        if (!an || !botById[an] || !botById[an].mensch) return;
        const e = Object.assign({}, eintrag);
        if (!Number.isFinite(e.at)) e.at = Date.now();           // wann der Kampf war (der Weltrechner hat die Server-Uhr)
        for (const f of ['botId', 'defenderId']) if (e[f] !== undefined) e[f] = e[f] === null ? null : neutralId(e[f]);
        if (e.botName === undefined && e.botId) e.botName = (botById[lokalId(e.botId)] || {}).name;
        WELT.nachricht(parseInt(an.slice(1), 10), { art: 'bericht', eintrag: e, hint });
    };
    WELT.beiNachricht.push(function (e) {
        if (!e || e.art !== 'bericht' || !e.eintrag) return;
        const x = e.eintrag;
        for (const f of ['botId', 'defenderId']) if (x[f]) x[f] = lokalId(x[f]);
        if (x.defenderId === 'player') x.defenderId = null;
        addCombatLogEntry(x);
        if (e.hint) flashHint(e.hint, 5000);
        if (x.targetId !== undefined && islandById[x.targetId]) spawnBattleFx(x.targetId, x.type === 'attack' ? !!x.won : !x.won || !!x.capitalHolds, x.type === 'attack' ? (x.won ? 'Sieg' : 'Niederlage') : (x.won ? (x.capitalHolds ? 'Hauptstadt hält' : 'Basis verloren') : 'Verteidigt'), x.botName || x.defenderName || '');
        sfx(x.won === (x.type === 'attack') ? 'victory' : 'warn');
    });
    WELT.beiNachricht.push(function (e) { if (e && e.art === 'spaeh') spaehBericht(e); });   // Spähbericht vom Weltrechner (fremde Werte kennt nur er)
    WELT.beiNachricht.push(function (e) {             // Preis aus einem Event (Wochen-Event, Invasion, Drache): ins Abholfach, auch Kisten
        if (!e || e.art !== 'evPreis') return;
        const z = (v, max) => typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(max, Math.round(v)) : 0;
        const crate = Number.isInteger(e.crate) && e.crate >= 0 && e.crate <= 4 ? e.crate : -1, src = INBOX_SRC[e.src] ? e.src : 'woche', title = String(e.title || '').slice(0, 80);
        if (inboxAdd({ src, title, gems: z(e.gems, 5000), sh: z(e.sh, 100), crate }) || crate >= 0 || e.sh > 0) { sfx('coin'); flashHint(title + ': dein Preis liegt unter Events → Belohnung.', 5000); }
    });
    WELT.beiNachricht.push(function (e) {             // Nebel freischalten (vom Admin): die ganze Karte ist aufgedeckt
        if (!e || e.art !== 'nebel') return;
        revealAround(0, 0, FRAME_HALF * 1.5, false); flashHint('Der Nebel hat sich gelichtet – du siehst jetzt die ganze Karte.', 5000);
    });
    WELT.beiNachricht.push(function (e) {             // Geschenk (vom Admin): liegt im Abholfach, wird normal abgeholt
        if (!e || e.art !== 'geschenk') return;
        if (inboxAdd({ src: 'gift', title: 'Geschenk', gems: e.gems || 0, coins: e.coins || 0, sh: e.sh || 0, crate: Number.isInteger(e.crate) && e.crate >= 0 && e.crate <= 5 ? e.crate : -1, tr: e.tr || 0 })) flashHint('Ein Geschenk liegt für dich bereit – Events → Belohnung.', 4500);   // (Kiste nur 0–5: sonst bricht das Abholfach)
        else if (e.sh > 0 || e.crate >= 0 || e.tr > 0) flashHint('Ein Geschenk liegt für dich bereit – Events → Belohnung.', 4500);
    });
    // Willkommen: einmal den Namen wählen
    if (!window.__OW || !__OW.nameGewaehlt) afterSplash(() => setTimeout(willkommenFenster, 400));
    function willkommenFenster() {
        const v = document.createElement('div');
        v.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,20,36,.8);font-family:Georgia,serif';
        v.innerHTML = '<div style="max-width:380px;width:100%;background:#f6efe0;color:#2b2118;border:2px solid #c9a227;border-radius:14px;padding:22px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.6)">' +
            '<h2 style="margin:0 0 6px;color:#1d3b5c;font-size:24px">Willkommen!</h2><p style="margin:0 0 14px;font-size:16px">Willkommen auf den Inseln von Open Water. Wie willst du heißen?</p>' +
            '<input id="wkName" maxlength="20" style="width:100%;padding:11px;font-size:17px;background:#fff;color:#2b2118;border:1px solid #d8c9a6;border-radius:8px;box-sizing:border-box" placeholder="Dein Name">' +
            '<p class="wf" style="min-height:20px;margin:8px 0 0;color:#a33a2a;font-size:14px"></p>' +
            '<button type="button" style="margin-top:10px;width:100%;padding:12px;font-size:17px;font-family:inherit;border:0;border-radius:8px;cursor:pointer;background:linear-gradient(#c9a227,#a8831a);font-weight:bold">Los geht’s</button></div>';
        document.body.appendChild(v);
        const inp = v.querySelector('input'), msg = v.querySelector('.wf'), btn = v.querySelector('button');
        inp.value = (window.__OW && __OW.name) || store.get('openWaterPlayerName') || '';
        setTimeout(() => { inp.focus(); inp.select(); }, 50);
        const los = async () => {
            btn.disabled = true; msg.textContent = '';
            const r = await weltNameSetzen(inp.value);
            btn.disabled = false;
            if (!r.ok) { msg.textContent = r.grund; return; }
            v.remove(); flashHint('Willkommen, ' + r.name + '!', 3000);
        };
        btn.addEventListener('click', los);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') los(); });
    }
    WELT.beiNachricht.push(function (e) {             // Startschild (Platz mitten in fremdem Land)
        if (!e || e.art !== 'startschild' || !(e.bis > Date.now())) return;
        if (shieldUntil() < e.bis) { store.set('openWaterShield', String(e.bis)); shieldMemAt = 0; }
    });
    // Zuschauer: ein neuer Angriff auf eine deiner Basen → Warnung (wie beim Weltrechner)
    const gewarnt = new Set();
    const altLaden = window.__weltLaden;
    window.__weltLaden = function (keys) {
        altLaden(keys);
        if (!keys.includes('openWaterPendingAttacks')) return;
        if (gewarnt.size > 500) { const da = new Set(pendingAttacks.map(marchKeyOf)); for (const k of gewarnt) if (!da.has(k)) gewarnt.delete(k); }   // vorbei → vergessen
        for (const a of pendingAttacks) { const k = marchKeyOf(a); if (!a.attackerBotId || gewarnt.has(k)) continue; gewarnt.add(k);
            if (islandOwnerOf(a.targetId) === 'player') { sfx('warn'); flashHint((botById[a.attackerBotId] || {}).name + ' greift ' + islandTitle(islandById[a.targetId]) + ' an!', 4000); } }
    };

    if (store.get('openWaterNeulingBis') === null) {
        store.set('openWaterNeulingBis', String(Date.now() + NEULING_MS));
        afterSplash(() => setTimeout(() => flashHint('Anfängerschutz: 48 Stunden kann dich niemand angreifen – bau dich in Ruhe auf. (Er endet früher, wenn dein Reich 50 Mio. Macht hat oder du einen echten Spieler angreifst.)', 9000), 4000));
    }
    // frisch beigetreten und nicht selbst Weltrechner: den Platz anmelden
    if (startplatzNeu && !WELT.leiter) WELT.befehl('beitreten', { insel: playerIslandId });
    // selbst Weltrechner und der Platz gehörte einem Mitspieler (Karte voll): übernehmen, mit Startschild
    if (startplatzNeu && WELT.leiter && startplatzAus && islandById[playerIslandId]) {
        clearIslandOwner(playerIslandId); ownedIslands.add(playerIslandId); islandLevels[playerIslandId] = 1; islandTroops[playerIslandId] = PLAYER_START_TROOPS;
        store.set('openWaterShield', String(Date.now() + 3600000)); shieldMemAt = 0; saveGame();
    }
    // Läuft der Weltrechner auf dem Server gerade nicht (Neustart nach einem Hänger)? Dann wartet die Welt – das zeigen wir
    // allen, statt dass Befehle scheinbar nichts tun. Kommt er zurück, geht es von selbst weiter.
    let rechnerWeg = null;
    window.__weltRechnerStatus = function (laeuft) {
        if (SYSTEM) return;
        if (!laeuft && !rechnerWeg) {
            rechnerWeg = document.createElement('div');
            rechnerWeg.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,6,8,.72);font-family:Georgia,serif';
            rechnerWeg.innerHTML = '<div style="max-width:340px;background:#f6efe0;color:#2b2118;border:2px solid #c9a227;border-radius:14px;padding:20px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.6)">' +
                '<h2 style="margin:0 0 6px;color:#1d3b5c;font-size:21px">Verbindung wird wiederhergestellt …</h2><p style="margin:0;font-size:15px">Die Welt ist gleich wieder da. Es geht nichts verloren.</p></div>';
            document.body.appendChild(rechnerWeg);
        } else if (laeuft && rechnerWeg) { rechnerWeg.remove(); rechnerWeg = null; }
    };
    WELT.start();
}
// Neue Welt-Daten (Puls) oder Münzen/Gems vom Weltrechner: offene Fenster gleich nachziehen (höchstens 1× pro Sekunde)
if (window.WELT && window.__weltLaden) {
    const vorLive = window.__weltLaden;
    window.__weltLaden = function (keys) { vorLive(keys); liveBald(); };
    WELT.beiNachricht.push(function (e) { if (e && (e.art === 'delta' || e.art === 'bericht' || e.art === 'geschenk')) liveBald(); });
}
