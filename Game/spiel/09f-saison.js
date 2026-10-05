// Teil 09f-saison.js: Welt-Saison: Server-Reset alle 8 Wochen
// ===== WELT-SAISON: Server-Reset alle 8 Wochen (Alexander 5.10.) =====
// Welt-Teil openWaterSaison = { nr, start, ende, bald (Ankündigung verschickt), jetzt (Admin-Knopf), last: { nr, top: [[wer, Macht]] } }.
// Wer rechnet (der Weltrechner – in der Vorschau das eigene Gerät), beginnt zum Termin die neue Saison: Sonntag 18 Uhr (vor dem
// Drachen um 19 Uhr), 8 Wochen nach dem Start. Vorher immer eine Sicherung der Welt beim Server (welt.js sicherungBitte → server.php).
// 3 Tage vorher eine Nachricht an alle echten Spieler, im Spiel ein Countdown (Leiste unter dem HUD, Events-Fenster).
// Ende: die besten 10 nach Macht (wie die Rangliste) bekommen Gems ins Abholfach und einen Saison-Titel für immer.
// Bleibt: die ganze Hauptstadt (Burg, Gebäude, Forschung), Helden, Ausrüstung, Gems, Holz/Stein/Eisen, alles Gekaufte.
// Weg: alle Basen, alle Truppen (Start mit PLAYER_START_TROOPS wie ein neuer Spieler), Münzen (0 wie ein neuer Spieler), Stufe (→ 1,
// damit alle Fähigkeitspunkte), Bündnisse, Märsche, Rallys, Verstärkungen, Armeen, Felder, Nebel, Kampfberichte. Die Hauptstadt zieht
// auf einen freien Zufallsplatz am Rand (wie der Startplatz eines neuen Spielers). Mitspieler genau wie echte Spieler.
// Der eigene Spielstand eines echten Spielers übernimmt den Reset über die Nachricht „saison“ (unten) → Neuladen → 01-grundlagen.js.
const SAISON_WOCHEN = 8, SAISON_STUNDE = 18, SAISON_BALD_MS = 3 * 864e5;
const SAISON_PREISE = [3000, 2000, 1500, 500, 500, 500, 500, 500, 500, 500];   // Gems für Platz 1–10 (Vorschlag, LIESMICH)
var saison = null, saisonSichT = 0;
function saisonLaden() { try { saison = JSON.parse(store.get('openWaterSaison')) || null; } catch (e) { saison = null; } if (saison && !(saison.nr > 0 && saison.ende > 0)) saison = null; return saison; }
function saisonSpeichern() { store.set('openWaterSaison', JSON.stringify(saison)); }
saisonLaden();
function saisonEnde(ab) {                             // der Sonntag 18 Uhr, 8 Wochen nach ab (Sommer-/Winterzeit: bis 2 Std. Spielraum)
    const ziel = ab + SAISON_WOCHEN * 7 * 864e5, d = new Date(ziel); d.setHours(SAISON_STUNDE, 0, 0, 0);
    for (let i = 0; i < 8 && (d.getDay() !== 0 || d.getTime() < ziel - 2 * 3600000); i++) { d.setDate(d.getDate() + 1); d.setHours(SAISON_STUNDE, 0, 0, 0); }
    return d.getTime();
}
function saisonJetzt() {                              // Admin-Knopf: die neue Saison gleich beginnen (mit Sicherung vorher)
    if (!saison) saisonTakt(); if (!saison) return;
    saison.jetzt = Date.now(); saisonSpeichern(); console.warn('Welt-Saison ' + saison.nr + ': Neustart vom Admin angefordert');
    saisonTakt();
}
function saisonTakt() {                               // (nur wer rechnet) Termin anlegen, ankündigen, zum Termin: Sicherung → neue Saison
    if (!rechnet()) return;
    const now = Date.now();
    if (!saison) { saison = { nr: 1, start: now, ende: saisonEnde(now) }; saisonSpeichern(); return; }
    if (!saison.bald && now >= saison.ende - SAISON_BALD_MS && now < saison.ende) { saison.bald = 1; saisonSpeichern(); saisonAnkuendigen(); }
    if (now < saison.ende && !saison.jetzt) return;
    if (window.WELT) {                                 // erst die Sicherung beim Server – ohne sie keine neue Saison
        if (!WELT.sicherungId) { if (!WELT.sicherungBitte && now - saisonSichT > 60000) { saisonSichT = now; WELT.sicherungBitte = 'saison ' + saison.nr; console.warn('Welt-Saison ' + saison.nr + ' endet – Sicherung der Welt angefragt'); } return; }
        console.warn('Welt-Saison ' + saison.nr + ': Sicherung ' + WELT.sicherungId + ' angelegt – die neue Saison beginnt'); WELT.sicherungId = 0;
    }
    saisonNeu(now);
}
setInterval(saisonTakt, 5000);
const saisonBaldText = ende => 'In 3 Tagen beginnt eine neue Welt-Saison (' + evWann(ende) + ' Uhr). Deine Hauptstadt mit Burg, Gebäuden, Forschung, Helden, Ausrüstung, Gems und Rohstoffen bleibt – Basen, Truppen, Münzen, Stufe und Bündnisse fangen neu an. Die besten 10 bekommen Gems und einen Titel für immer.';
function saisonAnkuendigen() {
    if (window.WELT) { for (const id in WELT.menschen) { const uid = parseInt(id.slice(1), 10); if (uid > 0) WELT.nachricht(uid, { art: 'saisonBald', nr: saison.nr, ende: saison.ende }, 'saisonBald|' + saison.nr); } }
    else afterSplash(() => flashHint(saisonBaldText(saison.ende), 9000));
}
function saisonTop() {                                // die besten 10 nach Macht (wie die Rangliste) → [[wer, Macht]]
    const l = [], bs = loadBotState();
    for (const w of (SYSTEM || window.WELT ? [] : ['player']).concat(BOT_DEFS.map(b => b.id).filter(id => bs[id]))) { let v = 0; try { v = powerOf(whoProfile(w)); } catch (e) { v = 0; } if (v > 0) l.push([w, v]); }
    return l.sort((a, b) => b[1] - a[1]).slice(0, SAISON_PREISE.length);
}
function saisonNeu(now) {
    const alt = saison.nr, nr = alt + 1, top = saisonTop();
    console.warn('Welt-Saison ' + alt + ' zu Ende – Saison ' + nr + ' beginnt (Top 10: ' + top.map(([w]) => (botById[w] || {}).name || w).join(', ') + ')');
    // 1) Preise: Gems ins Abholfach (Mitspieler direkt) und der Saison-Titel – feste Nummer je Saison (nie doppelt)
    top.forEach(([w], i) => evPreis(w, 'saison', 'Welt-Saison ' + alt + ' · Platz ' + (i + 1), { gems: SAISON_PREISE[i], titel: 's' + alt + 'p' + (i + 1) }, alt));
    // 2) echte Spieler: was die Welt ihnen noch schuldet, geht jetzt raus (vor der Nachricht „saison“ – sein Handy verbucht es noch in der alten Saison)
    const menschen = window.WELT ? Object.keys(WELT.menschen).filter(id => id !== WELT.ich && parseInt(id.slice(1), 10) > 0) : [];
    for (const id of menschen) try { WELT.deltaJetzt(id); } catch (e) { console.warn('Saison:', e); }
    // 3) die Welt neu
    saisonWelt(now);
    // 4) echte Spieler: Konto beim Weltrechner zurücksetzen, die Nachricht „saison“ (sein Handy übernimmt den Reset und lädt neu)
    for (const id of menschen) { try { WELT.saisonKonto(id); } catch (e) { console.warn('Saison:', e); } WELT.nachricht(parseInt(id.slice(1), 10), { art: 'saison', nr, alt, neuBis: (loadBotState()[id] || {}).neuBis || 0 }, 'saison|' + nr); try { WELT.deltaBasis(id); } catch (e) {} }
    saison = { nr, start: now, ende: saisonEnde(now), last: { nr: alt, top: top.map(([w, v]) => [neutralId(w), Math.round(v)]) } }; saisonSpeichern();
    window.__prVorher = null;                          // (Prüfer im Weltrechner: die Welt ist gewollt so viel kleiner – neue Grundlinie)
    if (!window.WELT && !SYSTEM) {                     // (Vorschau, allein) dein Spielstand übernimmt den Reset beim Neuladen wie am Handy
        store.set('openWaterSaisonNeu', String(nr)); try { saveGameNow(); saveProgressionNow(); flushBotState(); } catch (e) {}
        flashHint('Eine neue Welt-Saison beginnt – das Spiel lädt neu …', 4000); setTimeout(() => location.reload(), 600);
    }
}
function saisonWelt(now) {                            // alles Weltliche zurück, die Hauptstädte auf neue Plätze
    const bs = loadBotState(), wer = (SYSTEM || window.WELT ? [] : ['player']).concat(BOT_DEFS.map(b => b.id).filter(id => bs[id]));
    const hatte = wer.filter(w => (w === 'player' ? ownedIslands : botOwnedIslands[w] || new Set()).size > 0);   // wer gerade Basen hat, bekommt eine Hauptstadt (die anderen wie bisher: Neustart der Mitspieler)
    // Märsche, Späher, Armeen, Felder, Barbaren-Märsche, Verstärkungen, Rallys, Bündnisse – mit allen Truppen darin
    pendingAttacks = []; pendingSends = []; pendingRetreats = []; pendingScouts = [];
    fieldState = {}; fieldMarches = []; barbMarches = []; armies = []; armyJoins = []; armyRaids = [];
    if (evState.inv && Array.isArray(evState.inv.armies)) evState.inv.armies = [];
    if (typeof bundSaisonNeu === 'function') bundSaisonNeu();
    // die Karte: jede Basis wieder neutral, mit ihrer erzeugten Besatzung und Stufe
    ownedIslands.clear(); for (const w in botOwnedIslands) botOwnedIslands[w].clear();
    islandLevels = {}; for (const isl of islands) if (isl.neutralLevel > 1) islandLevels[isl.id] = isl.neutralLevel;
    islandTroops = {}; neutralTroopOverrides = {}; for (const isl of islands) if (isl.nt0 !== undefined) isl.neutralTroops = isl.nt0;
    templeHoldSince = {}; scoutedIslands.clear(); gateCfg = {}; store.set('openWaterGateCfg', '{}');
    titleState = { ruler: null, by: {} }; saveTitles(); bountyState = { ruler: null, gems: 0, coins: 0, since: now }; saveBounty();
    hauptVor = {}; store.set('openWaterHauptVor', '{}'); brand = {}; store.set('openWaterBrand', '{}'); store.set('openWaterWorldStart', String(now));
    for (const o of [battleHeat, baseFought, ownerLoss, botTooStrongMem, botIntelMem, botAct, botKenntMem, botKenntBasen, botEvacuated, botLossMem, botLmShareMem]) for (const k of Object.keys(o)) delete o[k];   // was die Mitspieler über die alte Karte wussten
    // Hauptstädte: je ein freier Turm am äußeren Rand, auf der Landmasse mit den wenigsten Nachbarn (wie freierStartplatz), zufällig
    const frei = islands.filter(i => i.type === 'tower' && landmasses[i.landmassId].tier === 'outer' && !bossAt(i.id)), proLm = {}, belegt = new Set();
    for (let i = hatte.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [hatte[i], hatte[j]] = [hatte[j], hatte[i]]; }
    for (const w of hatte) {
        const offen = frei.filter(i => !belegt.has(i.id)); if (!offen.length) break;
        let min = Infinity; for (const i of offen) min = Math.min(min, proLm[i.landmassId] || 0);
        const beste = offen.filter(i => (proLm[i.landmassId] || 0) === min), start = beste.filter(i => i.startSlot), l = start.length ? start : beste, z = l[Math.floor(Math.random() * l.length)];
        belegt.add(z.id); proLm[z.landmassId] = (proLm[z.landmassId] || 0) + 1;
        islandLevels[z.id] = 1; islandTroops[z.id] = PLAYER_START_TROOPS;   // (die Stufe der Hauptstadt folgt gleich wieder der Burg – aufbau.js)
        if (w === 'player') { ownedIslands.add(z.id); playerIslandId = z.id; store.set('openWaterPlayerIslandId', String(z.id)); }
        else { botOwnedIslands[w].add(z.id); bs[w].capital = z.id; bs[w].capMovedAt = now; bs[w].neuBis = now + NEULING_MS; }   // 48 Std. Anfängerschutz wie ein neuer Spieler (Alexander 5.10.)
    }
    if (hatte.includes('player')) store.set('openWaterSaisonSchutz', String(now + NEULING_MS));   // (Vorschau: dein Anfängerschutz – übernimmt das Laden)
    // Spieler und Mitspieler: Stufe 1, keine Fähigkeitspunkte, keine Münzen, keine Verwundeten, keine alten Pläne
    for (const w of wer) { if (w === 'player') continue; const b = bs[w];
        b.lvl = 1; b.xp = 0; b.sp = 0; b.xpNeu = 0; for (const k in b.skills || {}) b.skills[k] = 0; b.wounded = 0; b.tt = 0; botCoins[w] = 0;
        b.rally = null; b.capWish = null; b.outAt = 0; b.vendetta = null; b.grudge = {}; b.annoy = {}; b.fails = {}; delete b.kennt; delete b.plan; }
    capitalCache = null; ownVer++;
    saveGameNow(); flushBotState(); saveProgressionNow(); saveFields(); saveBarb(); saveArmies(); saveEv();
    requestRender();
}
// ---- was man sieht: der Countdown (Leiste unter dem HUD in den letzten 3 Tagen, Karte oben im Events-Fenster) ----
function saisonChip(now) {
    const S = saison; if (!S || now >= S.ende || S.ende - now > SAISON_BALD_MS) return null;
    return [1, '<button type="button" class="mb-chip is-warn" data-mb="ev-boss">' + icon('crown') + '<span>Neue Saison in</span><i data-ev-bis="' + S.ende + '"></i></button>'];
}
function saisonKarte() {
    const S = saison; if (!S) return '';
    const now = Date.now(), bald = S.ende - now <= SAISON_BALD_MS;
    const preise = 'Platz 1: ' + fmtNum(SAISON_PREISE[0]) + ' · 2: ' + fmtNum(SAISON_PREISE[1]) + ' · 3: ' + fmtNum(SAISON_PREISE[2]) + ' · 4–10: ' + fmtNum(SAISON_PREISE[3]) + ' Gems + Saison-Titel für immer';
    const last = S.last && S.last.top && S.last.top.length ? '<div class="lb-gap">Saison ' + S.last.nr + ' · Top 10</div>' + evRangHtml(S.last.top.map(([w, v]) => [lokalId(w), v]), v => fmtCompact(v)) : '';
    return evKarte('crown', 'Welt-Saison ' + S.nr, now < S.ende ? 'Neue Saison in ' + evUhr(S.ende) : 'Die neue Saison beginnt gleich …',
        '<div class="field-lines"><span>Neustart</span><b>' + evWann(S.ende) + ' Uhr</b><span>Bleibt</span><b>Hauptstadt (Burg, Gebäude, Forschung), Helden, Ausrüstung, Gems, Holz/Stein/Eisen, Gekauftes</b>' +
        '<span>Neu</span><b>Basen, Truppen, Münzen, Stufe, Bündnisse – die Hauptstadt zieht an einen neuen Platz am Rand</b><span>Preise</span><b>Die besten 10 nach Macht: ' + preise + '</b></div>', bald ? 'is-warn' : '') + last;
}
// ---- (Handy) Nachrichten vom Weltrechner: Ankündigung, neue Saison ----
if (window.WELT && !SYSTEM) {
    WELT.beiNachricht.push(function (e) { if (e && e.art === 'saisonBald' && e.ende > Date.now()) afterSplash(() => setTimeout(() => flashHint(saisonBaldText(e.ende), 9000), 2500)); });
    WELT.beiNachricht.push(function (e) {
        if (!e || e.art !== 'saison' || !(e.nr > 0) || e.nr <= (parseInt(store.get('openWaterSaisonMein'), 10) || 1)) return;   // (schon übernommen)
        WELT.saisonHalt = true; store.set('openWaterSaisonNeu', String(e.nr));                // → nach dem Neuladen übernimmt 01-grundlagen.js den Reset
        if (e.neuBis > Date.now()) store.set('openWaterSaisonSchutz', String(Math.min(e.neuBis, Date.now() + NEULING_MS)));   // Anfängerschutz (die Zeit sagt der Weltrechner)
        flashHint('Eine neue Welt-Saison beginnt – das Spiel lädt neu …', 4000); setTimeout(() => location.reload(), 1500);
    });
}
// (Handy) die Welt ist wieder in einer älteren Saison als dein Spielstand (Sicherung zurückgespielt – das kann nur der Server):
// neu laden, 01-grundlagen.js holt den Stand von vor dem Reset zurück
function saisonWeltZurueck() {
    if (SYSTEM || !window.WELT || !saison || WELT.saisonHalt || (parseInt(store.get('openWaterSaisonMein'), 10) || 1) <= saison.nr) return;
    WELT.saisonHalt = true; flashHint('Die Welt wurde auf einen früheren Stand zurückgesetzt – das Spiel lädt neu …', 5000); setTimeout(() => location.reload(), 1500);
}
if (saisonZurueckGeladen) afterSplash(() => setTimeout(() => flashHint('Die Welt wurde auf einen früheren Stand zurückgesetzt (Saison ' + saisonZurueckGeladen + ') – dein Spielstand passt wieder dazu.', 8000), 1500));
if (saisonNeuGeladen) afterSplash(() => setTimeout(() => flashHint('Welt-Saison ' + saisonNeuGeladen + ' hat begonnen! Deine Hauptstadt steht an einem neuen Platz am Rand – Burg, Gebäude, Forschung, Helden, Ausrüstung, Gems und Rohstoffe sind geblieben.', 9000), 1500));
