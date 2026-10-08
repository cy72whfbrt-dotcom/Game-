// Teil 10b-fenster-insel-knoepfe.js: Insel-Fenster: Ausbau merken, Zurückrufen, Nebel antippen, Tippen auf die Karte
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
    if (popupIslandId === playerIslandId) { closeIslandPopup(); openCity(() => { cityOpenId = '_keep'; cityPage = 'bau'; renderCitySheet(); }); return; }   // Hauptstadt: nur über die Burg (erst, wenn die Stadt da ist – sonst schließt cityShow das Fenster wieder)
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
    if (!alsBefehl('ausbau', { insel: popupIslandId, stufe: level + 1 })) evPunkte('bau', 'player', WO_PKT.bauStufe * (level + 1));   // (sonst zählt es der Weltrechner)
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
    popupSub.innerHTML = icon('send') + '<span>' + (sources.length === 1 ? '1 Basis' : sources.length + ' Basen') + ' im Umkreis</span><span class="sep"></span>' + icon('gem') + '<span>' + RECALL_GEM_COST + ' Edelstein</span>';
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

// Angriff: eigene Basen mit Truppen, die hinkommen – die nächste (kürzester Weg) zuerst
function angriffQuellen(target) {
    return [...ownedIslands].filter(id => id !== target.id && islandById[id] && (islandTroops[id] || 0) > 0 && canReach(islandById[id].landmassId, target.landmassId))
        .map(id => ({ id, weg: marschStrecke(islandById[id], target) })).sort((a, b) => a.weg - b.weg).map(x => x.id);
}
// Reicht eine Basis mit allen Truppen (ohne Held) gegen das gespähte Ziel? – gerechnet wie die Vorschau (Schwert, Titel, Forschung)
function angriffReicht(id, target) {
    const t = islandTroops[id] || 0, mine = (t + attackFlatBonus(t)) * titleMult('player', 'attack') * (AUF ? AUF.kampf('player', 'a') : 1);
    return mine > effectiveTroops(target) + effectiveDefense(target);
}
// Vorausgewählt: die nächste Basis mit genug Truppen; reicht keine, die mit den meisten (bei Gleichstand die nächste).
// Nicht gespäht (Stärke unbekannt): die nächste mit Truppen.
function angriffStart(target) {
    const q = angriffQuellen(target); if (!q.length) return null;
    if (!scoutedIslands.has(target.id)) return q[0];
    const genug = q.find(id => angriffReicht(id, target)); if (genug !== undefined) return genug;
    return q.reduce((b, id) => (islandTroops[id] || 0) > (islandTroops[b] || 0) ? id : b, q[0]);
}
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
        if (launchAttack(sourceId, targetId, null, troopsToSend)) heroLetzteMerken(previewHero, previewHero2);
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
    // Startbasis: die nächste eigene Basis mit genug Truppen (siehe angriffStart) – im Angriffsfenster änderbar
    const target = islandById[popupIslandId];
    const best = angriffStart(target);
    if (best === null) {
        if (attackBtn.classList.contains('is-grau')) { const z = popupStats.querySelector('.tor-hinweis'); if (z) { z.classList.remove('blinkt'); void z.offsetWidth; z.classList.add('blinkt'); } return; }   // der Grund steht schon im Fenster: die Zeile blinkt, kein Hinweis darüber
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
    if (feldRing) { feldRingZu(); return; }                                 // daneben tippen schließt das Feld-Menü
    const blattOffen = !!armySheet || !document.getElementById('markerSheet').hidden || !!fieldSheetId || !!barbView || isPanelOpen(popup);
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
    if (!island) { if (isPanelOpen(popup) && !multiAttackMode) closeIslandPopup(); else if (!multiAttackMode && !blattOffen && !markerMode) feldRingAuf(screenX, screenY); return; }   // freies Feld: Teleport, Markierung, Truppen

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
        hintEl.textContent = defaultHint; hintEl.classList.remove('toast--lang');

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
        hintEl.textContent = defaultHint; hintEl.classList.remove('toast--lang');

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

