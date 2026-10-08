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
    const alt = islandById[playerIslandId], ax = alt.x, ay = alt.y;
    tpVerlegen('player', x, y);
    teleportFx(playerIslandId, ax, ay);
    flashHint('Die Hauptstadt ist hierher teleportiert – deine Truppen sind mitgekommen.', 3500);
    return true;
}
// Teleport-Effekt (FX_MS): goldene Lichtsäule von oben auf den neuen Platz, Staub/Funken am Boden, die alte Stelle verblasst;
// das Band „Hauptstadt – hierher teleportiert“ steht die ganze Zeit. Ruhig gezeichnet (kaum Bewegung, spart Akku).
// Bild: bilder/karte_lichtsaeule.webp (Alexanders KI-Bild) – fehlt es, ui_strahlen.webp als Ersatz.
const TP_SAEULE = { bild: null, ersatz: false };
function tpSaeuleBild() {
    if (TP_SAEULE.laedt) return TP_SAEULE.bild; TP_SAEULE.laedt = true;
    const im = new Image();
    im.onload = () => { TP_SAEULE.bild = im; requestRender(); };
    im.onerror = () => { if (TP_SAEULE.ersatz) return; TP_SAEULE.ersatz = true; im.src = 'bilder/ui_strahlen.webp'; };
    im.src = 'bilder/karte_lichtsaeule.webp';
    return null;
}
function teleportFx(cap, ax, ay) {
    const isl = islandById[cap]; if (!isl) return;
    sfx('move'); tpSaeuleBild();
    const funken = []; for (let i = 0; i < 10; i++) funken.push({ a: i / 10 * Math.PI * 2 + Math.random() * .4, d: 18 + Math.random() * 26 });
    battleFx.push({ tp: 1, x: isl.x, y: isl.y, ax, ay, good: true, label: 'Hauptstadt', sub: 'hierher teleportiert', born: performance.now(), funken, stack: 0 });
    if (battleFx.length > 12) battleFx.shift();
    requestRender();
}
function tpBandOrt(f, sx, sy, saeule) {        // → [x, sy] für mzErgebnisBand: Band (samt Unterzeile) auf keinem Basisschild, nicht auf der Säule, im Bild
    const bw = Math.min(viewW >= 700 ? 300 : 230, viewW * .6), im = mzBild('marsch_band_sieg'), bh = im ? bw * im.height / im.width : 60, hb = bh + 22, z = mapState.zoom;
    const an = document.getElementById('anleitung'), ar = an && !an.hidden ? an.getBoundingClientRect() : null;
    const oben = 110, unten = Math.min(viewH - 70, ar && ar.height ? ar.top - 6 : viewH);   // (nicht unter der Leiste oben / unten, nicht unter der Anleitung)
    const schilde = islands.filter(i => i.type === 'tower' && islandOwnerOf(i.id) && Math.abs(toSX(i.x) - sx) < viewW && Math.abs(toSY(i.y) - sy) < viewH).map(i => schildRect(i, z));
    const xs = [sx, sx - bw * .6, sx + bw * .6].map(v => Math.max(bw / 2 + 4, Math.min(viewW - bw / 2 - 4, v))), ys = [];
    for (let d = 0; d < 400; d += 12) ys.push(sy + 130 + d, sy - saeule - hb / 2 - 10 - d);   // erst unter der Basis, dann über der Säule, dann weiter weg
    for (let d = 0; d < saeule; d += 12) ys.push(sy - 90 - d);              // zuletzt vor der Säule (nie auf einem Schild)
    const rect = (x, y) => ({ x: x - bw / 2, y: y - bh / 2, w: bw, h: hb });
    const passt = (x, y) => { const r = rect(x, y); return r.y >= oben && r.y + hb <= unten && !schilde.some(q => overlap(q, r) > 0); };
    let wo = null; for (const y of ys) { for (const x of xs) if (passt(x, y)) { wo = [x, y]; break; } if (wo) break; }
    wo = wo || [xs[0], sy + 130];
    f.bandRect = rect(wo[0], wo[1]);
    return [wo[0], wo[1] + 70 + bh / 2];                                   // (mzErgebnisBand setzt die Mitte 70 + bh/2 über sy)
}
function tpFxZeichnen(f, ms, sx, sy) {           // (aus drawBattleFx, Bildschirm-Koordinaten)
    const s = mzS(), k = ms / FX_MS, rein = Math.min(1, ms / 300), raus = k > .8 ? 1 - (k - .8) / .2 : 1;
    const ox = f.ax * mapState.zoom + mapState.offsetX, oy = f.ay * mapState.zoom + mapState.offsetY;
    if (ms < 1200) {                               // alte Stelle: Schimmer, der verblasst
        const a = 1 - ms / 1200, R = 34 * s, g = ctx.createRadialGradient(ox, oy, 0, ox, oy, R);
        g.addColorStop(0, 'rgba(255,226,150,' + .55 * a + ')'); g.addColorStop(1, 'rgba(255,226,150,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ox, oy, R, R * .55, 0, 0, Math.PI * 2); ctx.fill();
    }
    const a = rein * raus, im = tpSaeuleBild();
    if (im && !TP_SAEULE.ersatz) {                 // KI-Bild: Bodenkreis (unten, ~88 % der Höhe) auf den Platz, Säule kommt von oben herab
        const w = 120 * s, h = w * im.height / im.width, oben = sy - h * .88, sicht = Math.min(1, ms / 260);
        ctx.globalAlpha = a; ctx.drawImage(im, 0, im.height * (1 - sicht), im.width, im.height * sicht, sx - w / 2, oben + h * (1 - sicht), w, h * sicht);
        ctx.globalCompositeOperation = 'lighter';
    } else {                                       // Ersatz: Lichtband + ui_strahlen
        const w = 70 * s, oben = Math.max(0, sy - 320 * s), h = (sy - oben) * Math.min(1, ms / 260);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * .9;
        const g = ctx.createLinearGradient(sx - w / 2, 0, sx + w / 2, 0);
        g.addColorStop(0, 'rgba(255,200,90,0)'); g.addColorStop(.5, 'rgba(255,236,170,.85)'); g.addColorStop(1, 'rgba(255,200,90,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - w / 2, oben, w, h);
        if (im) ctx.drawImage(im, sx - w * .9, sy - w * 1.2, w * 1.8, w * 1.8);
    }
    ctx.globalAlpha = a;                           // Boden: Lichtkreis, Staub, Funken
    const R = 46 * s, g2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
    g2.addColorStop(0, 'rgba(255,240,190,.8)'); g2.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(sx, sy, R, R * .5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    for (const p of f.funken) { const px = sx + Math.cos(p.a) * p.d * s, py = sy + Math.sin(p.a) * p.d * s * .45 - k * 10 * s;
        ctx.fillStyle = 'rgba(255,230,160,' + a * .9 + ')'; ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
        ctx.fillStyle = 'rgba(150,130,100,' + a * .25 + ')'; ctx.beginPath(); ctx.arc(px, py + 4 * s, 7 * s, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const B = tpBandOrt(f, sx, sy, im && !TP_SAEULE.ersatz ? 120 * s * im.height / im.width * .88 : 200 * s);
    mzErgebnisBand(f, ms > FX_MS - 150 ? (FX_MS - ms) / 150 : 1, 1, B[0], B[1]);   // Band: von Anfang bis Ende lesbar
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
