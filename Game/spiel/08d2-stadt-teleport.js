// Teil 08d2-stadt-teleport.js: Hauptstadt teleportieren (Platz prüfen, verlegen, Teleporter)
// Hauptstadt-Fenster: „Teleportieren“ führt wie der Teleporter im Rucksack zur Auswahl auf der Karte (Verlegen in einen eigenen Turm
// für 50 Edelsteine gibt es nicht mehr – Alexander 8.10., auch nicht für Mitspieler: die teleportieren genauso, bots/05 botTeleportCapital).
document.getElementById('teleportBtn').addEventListener('click', () => {
    closeAllPopups(); if (!cityView.hidden) closeCity(); recenterOnHome(true);
    flashHint('Tippe auf eine freie Stelle der Karte, dann „Teleportieren“ – das kostet ' + (teleImRucksack() ? '1 Teleporter' : fmtNum(TP_GEMS) + ' Edelsteine') + '.', 5000);
});
// Teleportieren (Alexander 7.10., Merkliste 33): die Hauptstadt an eine freie Stelle der Karte – die Basis selbst zieht um (Truppen,
// Stufe, Stadt bleiben). Platz wie für eine Basis (nicht im Gebirge, nicht auf Toren, Feldern, Lagern, Tempeln, nicht in der Thron-Mitte),
// nur in Gebiete, die von der Hauptstadt über offene Pässe erreichbar sind (TELEPORT_NUR_OFFEN). Kostet 1 Teleporter aus dem Rucksack (im Shop
// 500 Edelsteine), sonst 500 Edelsteine; neue Spieler (Anfängerschutz) haben 1 Teleporter gratis, keine Abklingzeit; nicht, solange ein Marsch an der Hauptstadt hängt. Der Weltrechner entscheidet
// (Befehl teleport), verlegte Basen stehen im Welt-Teil openWaterInselOrt { id: [x, y, Gebiet] }. Mitspieler
// teleportieren nach denselben Regeln (bots/05 botTeleportCapital, im Weltrechner direkt im Takt).
const TP_GEMS = 500, TELEPORT_NUR_OFFEN = true, TP_ABSTAND = BASE_SPACING * .5;
let inselOrt = {};
for (const isl of islands) isl.ort0 = [isl.x, isl.y, isl.landmassId];
function inselOrtLaden() { try { inselOrt = JSON.parse(store.get('openWaterInselOrt')) || {}; } catch (e) { inselOrt = {}; } inselOrtAnwenden(); }
function inselOrtAnwenden() {                    // verlegte Basen an ihren Platz (und zurück, wenn der Eintrag fehlt – neue Saison)
    let neu = false;
    for (const isl of islands) {
        const e = inselOrt[isl.id], o = e && isl.type === 'tower' && Number.isFinite(e[0]) && Number.isFinite(e[1]) && landmasses[e[2]] ? e : isl.ort0;
        if (isl.x === o[0] && isl.y === o[1] && isl.landmassId === o[2]) continue;
        if (isl.landmassId !== o[2]) { const alt = islandsByLandmass[isl.landmassId] || [], k = alt.indexOf(isl); if (k >= 0) alt.splice(k, 1); (islandsByLandmass[o[2]] = islandsByLandmass[o[2]] || []).push(isl); }
        isl.x = o[0]; isl.y = o[1]; isl.landmassId = o[2]; neu = true;
        if (!SYSTEM && ownedIslands.has(isl.id)) revealAround(isl.x, isl.y, REVEAL_BASE, true);   // (Handy: um die eigene Basis ist kein Nebel)
        const lm = landmasses[o[2]]; if (lm.tier === 'guardian' || lm.tier === 'throne') midZoneIds.add(isl.id); else midZoneIds.delete(isl.id);
    }
    if (!neu) return;
    TERR.player.clear(); TERR.enemy.clear(); ownVer++; capitalCache = null; BG.valid = false;   // Gebiets-Flächen und Boden neu (die Basis steht woanders)
    if (typeof flushBannerSprites === 'function') flushBannerSprites();
    requestRender();
}
function tpGebiete(vonLm) {                      // die Gebiete, die man von vonLm aus über (offene) Pässe erreicht
    const da = new Set([vonLm]), q = [vonLm], now = Date.now();
    while (q.length) { const a = q.shift();
        for (const br of bridges) { const b = br.a === a ? br.b : br.b === a ? br.a : null;
            if (b === null || da.has(b) || (TELEPORT_NUR_OFFEN && now < passOpensAt(br))) continue; da.add(b); q.push(b); } }
    return da;
}
function tpMarschDa(cap) {                       // hängt ein Marsch an der Hauptstadt (hin, weg, Angriff darauf)?
    const an = m => m && [m.sourceId, m.targetId, m.fromId, m.toId, m.homeId].includes(cap);
    return pendingAttacks.some(an) || pendingSends.some(an) || pendingRetreats.some(an) || fieldMarches.some(an) || barbMarches.some(an) ||
        armies.some(a => a.mv && a.mv.to && a.mv.to.id === cap);
}
function tpGratis(who) {                         // neue Spieler (Anfängerschutz): einmal gratis
    if (who === 'player') return store.get('openWaterTpGratis') !== '1' && neulingBis() > Date.now();
    const b = loadBotState()[who]; return !!b && !b.tpGratis && botNeulingBis(who, b) > Date.now();
}
function tpPruefen(who, x, y) {                  // → null (geht) oder der Grund für den Spieler
    const cap = who === 'player' ? playerIslandId : botCapitalOf(who), c = islandById[cap];
    if (!c || c.type !== 'tower' || !Number.isFinite(x) || !Number.isFinite(y)) return 'Du hast keine Hauptstadt, die umziehen kann.';
    const lmId = gebietAn(x, y), lm = landmasses[lmId];
    if (!lm || Math.abs(x) > FRAME_HALF - 8000 || Math.abs(y) > FRAME_HALF - 8000) return 'Dort ist kein Land.';
    if (lm.tier === 'throne') return 'In die Thron-Mitte kann die Hauptstadt nicht ziehen.';
    if (Math.hypot(c.x - x, c.y - y) < TP_ABSTAND) return 'Deine Hauptstadt steht schon hier.';   // (kein Umzug an dieselbe Stelle – Teleporter/Edelsteine wären weg)
    if (grenzAbstand(x, y) < KETTE_FREI + BASE_SPACING * .45) return 'Zu nah am Gebirge – such dir einen Platz weiter drinnen.';
    for (const i of islandsByLandmass[lmId] || []) { if (i.id === cap) continue;
        const frei = i.bildR ? i.bildR / .35 * .55 : i.type === 'gate' ? BASE_SPACING * 1.1 : TP_ABSTAND;
        if (Math.hypot(i.x - x, i.y - y) < frei) return 'Zu nah an einer anderen Basis – dort ist kein Platz.'; }
    for (const g of gateSpots) if (g.lm === lmId && (Math.hypot(x - g.x, y - g.y) < BASE_SPACING * 1.1 || segDistW(x, y, g.x, g.y, g.ex, g.ey) < BASE_SPACING * .7)) return 'Zu nah am Pass – dort ist kein Platz.';
    for (const f of resFields) if (Math.hypot(f.x - x, f.y - y) < f.radius + TP_ABSTAND * .6) return 'Dort liegt ein Feld – such dir einen freien Platz.';
    for (const k of barbState.camps || []) if (Math.hypot(k.x - x, k.y - y) < TP_ABSTAND) return 'Dort lagern Barbaren – such dir einen freien Platz.';
    if (!tpGebiete(c.landmassId).has(lmId)) return 'Dorthin führt noch kein offener Pass.';
    if (tpMarschDa(cap)) return 'Erst wenn keine Märsche und kein Angriff mehr an deiner Hauptstadt hängen.';
    return null;
}
function tpVerlegen(who, x, y) {                 // (geprüft, bezahlt) die Hauptstadt steht jetzt bei x, y
    const cap = who === 'player' ? playerIslandId : botCapitalOf(who);
    inselOrt[cap] = [Math.round(x), Math.round(y), gebietAn(x, y)]; store.set('openWaterInselOrt', JSON.stringify(inselOrt)); inselOrtAnwenden();
    saveGame(); requestRender();
}
function teleportOrt(x, y) {                     // (Spieler) Tipp auf „Teleportieren“, schon bestätigt → true: unterwegs bzw. erledigt
    const f = tpPruefen('player', x, y); if (f) { flashHint(f, 3500); return false; }
    const gratis = tpGratis('player'), tele = !gratis && teleVorrat() > 0, k = gratis || tele ? 0 : TP_GEMS;   // zuerst der Gratis-Teleporter, dann gekaufte, sonst Edelsteine
    if (gems < k) { flashHint('Teleportieren kostet ' + fmtNum(TP_GEMS) + ' Edelsteine.', 3000); return false; }
    gems -= k; if (gratis) store.set('openWaterTpGratis', '1'); if (tele) store.set('openWaterTeleporter', String(teleVorrat() - 1));   // (gekaufter Teleporter: der Weltrechner bucht die 500 beim Kauf ausgegebenen Gems – wie beim Bezahlen hier)
    statBump('teleports'); saveGame(); saveProgression(); updateHud();
    if (alsBefehl('teleport', { x: Math.round(x), y: Math.round(y), gratis })) { flashHint('Die Hauptstadt zieht um …', 3000); return true; }   // (Zuschauer: der Weltrechner verlegt sie)
    tpVerlegen('player', x, y);
    spawnBattleFx(playerIslandId, true, 'Hauptstadt', 'hierher teleportiert');
    flashHint('Die Hauptstadt ist hierher teleportiert – deine Truppen sind mitgekommen.', 3500);
    return true;
}
inselOrtLaden();
document.getElementById('cityCloseBtn').addEventListener('click', closeCity);
document.getElementById('cityInfoBtn').addEventListener('click', e => { const s = document.getElementById('citySheet'); s.classList.toggle('zeig-info'); e.currentTarget.classList.toggle('on', s.classList.contains('zeig-info')); });   // Beschreibung nur auf Tipp (weniger Text)
document.getElementById('citySheetClose').addEventListener('click', () => { cityOpenId = null; document.getElementById('citySheet').hidden = true; });
document.getElementById('cityUpgradeBtn').addEventListener('click', () => {
    if (cityOpenId === '_keep' && AUF) { cityStartBuild('keep'); return; }        // die Burg-Stufe (Bauzeit, Münzen + Rohstoffe) ist die EINE Stufe der Hauptstadt
    if (cityOpenId) cityStartBuild(cityOpenId); });
document.getElementById('citySpeedBtn').addEventListener('click', e => {
    const id = cityBauId(cityOpenId), cost = citySpeedCost(id); if (!cost || gems < cost) return;
    if (!gemsWirklich('speed:' + id, cost, e.currentTarget)) return;
    gems -= cost; saveGame(); updateHud(); cityFinishBuild(true, id);
});
