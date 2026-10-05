// Teil 10a-inselfenster-vorschau.js: Fenster-Start, Insel-Fenster: Inhalt, Angriffs- und Sende-Vorschau, Truppen-Regler
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

