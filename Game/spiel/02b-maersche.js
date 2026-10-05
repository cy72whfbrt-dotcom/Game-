// Teil 02b-maersche.js: Märsche: Angriffe und Verlegen losschicken, Laufzeit, Zurückrufen, Beschleunigen
// Attacks and troop transfers now take real time to arrive, scaled
// by the distance between the two towers - the "Geschwindigkeit"
// skill (which also speeds up production) shortens the march.
const BASE_ATTACK_SPEED = 300; // world units per second - slow enough that speed upgrades are felt
const MIN_ATTACK_SECONDS = 6;
const MAX_ATTACK_SECONDS = 60;
// A lost attack isn't one-sided: the defender takes real casualties
// too (capped at the attacker's strength, so it can never go
// negative), and a small slice of the attacker's "dead" troops
// actually survives and marches back to the base it attacked from.
const RETREAT_RECOVERY_PCT = 20;

function attackSpeedMultiplier() {
    return 1 + Math.min(skills.speed || 0, SKILL_DEFS.speed.max) * 0.05;
}
function scoutSecs(from, to, botId) { return travelDurationSeconds(from, to, botId) / (AUF ? AUF.spaeherTempo(botId || 'player') : 1); }   // (+ Forschung Späher)   // a scout's walk, Späherturm included - the same for everyone
function travelDurationSeconds(source, target, botId) {   // everyone gets their own speed skill + Akademie, never under 3 s
    const pts = source.landmassId === target.landmassId ? [source, target] : marchPath(source, target);
    let distance = 0; for (let i = 1; i < pts.length; i++) distance += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const bt = typeof bundTempo === 'function' ? bundTempo(botId || 'player', target) : 1;      // Bündnis-Gebiet: 10 % schneller
    if (botId) return Math.max(3, Math.min(MAX_ATTACK_SECONDS, Math.max(MIN_ATTACK_SECONDS, distance / BASE_ATTACK_SPEED)) / botMarchMult(botId) / bt);   // their speed skill + Akademie, like yours
    const base = Math.min(MAX_ATTACK_SECONDS, Math.max(MIN_ATTACK_SECONDS, distance / BASE_ATTACK_SPEED));   // clamp first, so the speed skill and the Akademie also shorten long marches
    return Math.max(3, base / (attackSpeedMultiplier() * (1 + academyLevel() * 0.02) * (AUF ? AUF.marschTempo('player') : 1)) / bt);   // (+ Forschung Marschtempo)
}

let pendingAttacks;
try {
    pendingAttacks = JSON.parse(store.get('openWaterPendingAttacks')) || [];
} catch (e) {
    pendingAttacks = [];
}
let pendingSends;
try {
    pendingSends = JSON.parse(store.get('openWaterPendingSends')) || [];
} catch (e) {
    pendingSends = [];
}
let pendingScouts;
try {
    pendingScouts = JSON.parse(store.get('openWaterPendingScouts')) || [];
} catch (e) {
    pendingScouts = [];
}
let pendingRetreats;
try {
    pendingRetreats = JSON.parse(store.get('openWaterPendingRetreats')) || [];
} catch (e) {
    pendingRetreats = [];
}

// History of resolved attacks/transfers, newest first, capped
const COMBAT_LOG_LIMIT = 50;
let combatLog;
try {
    combatLog = JSON.parse(store.get('openWaterCombatLog')) || [];
} catch (e) {
    combatLog = [];
}
function addCombatLogEntry(entry) {
    // Zeit des Kampfes: ein Bericht vom Weltrechner bringt sie mit (kam er erst später an, z. B. nach der Nacht) – sonst jetzt
    const jetzt = Date.now();
    entry.at = Number.isFinite(entry.at) && entry.at > jetzt - 30 * 86400000 ? Math.min(entry.at, jetzt) : jetzt;
    entry.names = {};                                // names as they were then (a boss may camp there later)
    for (const k of ['targetId', 'sourceId', 'toId', 'fromId']) if (entry[k] !== undefined && islandById[entry[k]]) entry.names[entry[k]] = islandTitle(islandById[entry[k]]);
    let pos = 0; while (pos < combatLog.length && (combatLog[pos].at || 0) > entry.at) pos++;   // neueste zuerst, auch wenn Berichte spät ankommen
    combatLog.splice(pos, 0, entry);
    if (combatLog.length > COMBAT_LOG_LIMIT) combatLog.length = COMBAT_LOG_LIMIT;
    store.set('openWaterCombatLog', JSON.stringify(combatLog));
    // an open battle log shows the new entry right away
    const logPanel = document.getElementById('battleLogPopup');
    if (logPanel && logPanel.classList.contains('is-open')) refreshOpenCombatLog();
}

// troopsOverride lets the player send only part of a base's garrison
// (chosen via the attack preview's slider) instead of always
// marching out with everything - bots never pass this, so their
// attacks are unaffected and still commit their full garrison.
// Marsch-Plätze der Burg (Paket D): ist noch ein Platz frei? (für dich mit Hinweis) – grp: gehört zu einem Mehrfachangriff
function marschPlatz(who, grp, src) { if (!AUF || AUF.marschOk(who, grp, src)) return true; if (who === 'player' && !SYSTEM) flashHint(AUF.marschVoll('player'), 4000); return false; }
var naechsteGruppe = null;                                           // (Mehrfachangriff, „Truppen sammeln“: alle zusammen = EINE Aktion)
var mautZahler = null;                                              // (Rally: jeder zahlt die Maut für SEINE Truppen – siehe rallyMaut)
function launchAttack(sourceId, targetId, attackerBotId, troopsOverride, heldWunsch, held2Wunsch) {
    const source = islandById[sourceId];
    const target = islandById[targetId];
    const available = islandTroops[sourceId] || 0;
    const rawTroops = (troopsOverride !== undefined && troopsOverride !== null)
        ? Math.max(0, Math.min(troopsOverride, available))
        : available;
    if (!source || !target || rawTroops <= 0) return false;
    if (!attackerBotId && target.id === playerIslandId) return false;
    { const ow = islandOwnerOf(target.id); if (bundFreund(attackerBotId || 'player', ow)) { if (!attackerBotId) flashHint((botById[ow] || {}).name + ' ist in deinem Bündnis – Mitglieder greifen sich nicht an.', 3500); return false; } }   // Bündnis: gesperrt
    if (!attackerBotId && !islandSeen(target)) { flashHint('Dieses Ziel liegt im Nebel – schick zuerst einen Späher.', 3000); return false; }   // nichts im Nebel angreifen
    if (!attackerBotId) { const tw = islandOwnerOf(target.id); if (tw && botById[tw] && botById[tw].mensch) neulingEnde('Dein Anfängerschutz ist vorbei – du hast einen echten Spieler angegriffen.'); }
    const tOwner = islandOwnerOf(target.id);
    if (tOwner && tOwner !== (attackerBotId || 'player') && target.type === 'tower' && ownerShielded(tOwner)) { if (!attackerBotId) flashHint(shieldBlockText(tOwner), 4000); return false; }   // the Friedensschild
    // (Hauptstädte kann man angreifen – Alexander 4.10. –, aber nie erobern: siehe resolveAttack / capitalHolds)
    const grp = naechsteGruppe;
    if (!attackerBotId && !canReach(source.landmassId, target.landmassId, 'player')) {   // (wie beim Weltrechner)
        flashHint('Kein Weg nach ' + islandTitle(target) + ' – ein fremdes Tor liegt dazwischen. Erobere zuerst das Tor.', 5000); return false; }
    if (!marschPlatz(attackerBotId || 'player', grp, sourceId)) return false;   // alle Marsch-Plätze belegt (Burg-Stufe)
    if (!attackerBotId && !rechnet()) {                           // Zuschauer: der Weltrechner schickt die Truppen los
        const vh = lastHop(source.landmassId, target.landmassId, 'player'); if (!mautVorab(vh[0], vh[1], rawTroops, target.id)) return false;
        const vHeld = nextAttackHero && heroOwned('player', nextAttackHero) && !heroBusy('player', nextAttackHero) ? nextAttackHero : null, vHeld2 = heroZweitOk('player', vHeld, nextAttackHero2);
        WELT.befehl('angriff', { src: sourceId, ziel: targetId, n: rawTroops, held: vHeld, held2: vHeld2, grp: grp || undefined });
        islandTroops[sourceId] = available - rawTroops;
        { const t0 = Date.now(); vorlaeufigDazu('a', { sourceId, targetId, rawTroops, startedAt: t0, resolveAt: t0 + Math.max(3, travelDurationSeconds(source, target)) * 1000, attackerBotId: null, hero: vHeld, hero2: vHeld2, grp: grp || undefined }); }
        updateHud(); flashHint('Angriff unterwegs zu ' + islandTitle(target) + '.');
        dropShield('Dein Friedensschild ist gefallen, weil du angreifst.'); questProgress('attack', 1); sfx('attack');
        return true;
    }
    const mensch = attackerBotId && botById[attackerBotId] && botById[attackerBotId].mensch;   // ein echter Spieler (Befehl): sein gewählter Held, sonst keiner
    if (attackerBotId && window.WELT) { const tw = islandOwnerOf(target.id); if (tw === 'player' || (botById[tw] && botById[tw].mensch)) { const ab = loadBotState()[attackerBotId]; if (ab && ab.neuBis) { ab.neuBis = 0; saveBotState(); } } }   // greift einen echten Spieler an: Anfängerschutz weg
    if (attackerBotId && window.WELT && botById[attackerBotId] && botById[attackerBotId].mensch) { const ab = loadBotState()[attackerBotId]; if (ab && ab.shieldUntil > Date.now()) { ab.schildAlt = ab.shieldUntil; ab.shieldUntil = 0; if (ab.hb) ab.hb.schild = Math.min(+ab.hb.schild || 0, Date.now()); saveBotState(); } }   // ein echter Spieler greift an: sein Schild fällt (auch wenn sein Handy es nicht meldet) – auch im Hauptbuch, sonst käme er mit dem nächsten Profil gratis zurück
    const who = attackerBotId || 'player', botPair = attackerBotId && !mensch ? botPickHero(attackerBotId, source, target, rawTroops, true) : null;   // ein Mitspieler wählt Haupt- und Zweitheld
    const hero = mensch ? (heldWunsch && heroOwned(attackerBotId, heldWunsch) && !heroBusy(attackerBotId, heldWunsch) ? heldWunsch : null)
        : attackerBotId ? botPair[0] : nextAttackHero && heroOwned('player', nextAttackHero) && !heroBusy('player', nextAttackHero) ? nextAttackHero : null;
    const hero2 = heroZweitOk(who, hero, mensch ? held2Wunsch : attackerBotId ? botPair[1] : nextAttackHero2);   // Besitz und belegt geprüft (auch beim Weltrechner)
    const hop = lastHop(source.landmassId, target.landmassId, who), hp = hero && heroPeek(who, hero, source, target, rawTroops, hero2);
    if (!(mautZahler || payToll)(hop[0], hop[1], rawTroops, who, target.id, hp ? hp.toll : 0)) return false;

    islandTroops[sourceId] = available - rawTroops; // only the sent troops march out, the rest stay to defend
    const hx = hero ? heroLaunch(who, hero, source, target, rawTroops, hero2) : null;   // a full rage fires the hero's active skill in this fight
    const durationSec = Math.max(3, travelDurationSeconds(source, target, attackerBotId) / (1 + (hx ? hx.spd : 0) / 100));
    const startedAt = Date.now();
    // Snapshot every skill/equipment-derived combat bonus NOW, at
    // launch, not when the attack resolves on arrival (which can be
    // many seconds later) - otherwise leveling a skill while troops
    // are already marching would silently change the outcome of an
    // attack whose preview the player already confirmed. Bots get
    // exactly the same snapshot from their own skills, gear and hero.
    pendingAttacks.push({
        sourceId,
        targetId,
        rawTroops,
        startedAt,
        resolveAt: startedAt + durationSec * 1000,
        attackerBotId: attackerBotId || null,
        ...attackFields(who, source, target, rawTroops, hx),
        ...(grp ? { grp } : {})
    });
    updateHud();
    saveGame();
    saveProgression();
    if (!attackerBotId) flashHint('Angriff unterwegs zu ' + islandTitle(target) + ' · ca. ' + fmtClock(durationSec));
    if (!attackerBotId) dropShield('Dein Friedensschild ist gefallen, weil du angreifst.'); else botDropShield(attackerBotId);
    if (!attackerBotId) { questProgress('attack', 1); sfx('attack'); }
    else if (islandOwnerOf(target.id) === 'player') sfx('warn');      // someone marches on one of your bases
    renderActiveMarches();
    return true;
}

// "Truppen verschicken": same travel time as an attack, but a blue
// march to one of the player's OWN towers that just merges in.
function launchSend(fromId, toId, senderBotId, amount) {       // amount: how many go (default: all of them)
    const source = islandById[fromId];
    const target = islandById[toId];
    const available = islandTroops[fromId] || 0;
    const rawTroops = amount > 0 ? Math.min(Math.round(amount), available) : available;
    if (!source || !target || rawTroops <= 0) return;
    const grp = naechsteGruppe;
    if (!senderBotId && !canReach(source.landmassId, target.landmassId, 'player')) {   // (wie beim Weltrechner: ein fremdes Tor dazwischen – vorher schickte das Handy los, der Weltrechner lehnte still ab)
        flashHint('Kein Weg nach ' + islandTitle(target) + ' – ein fremdes Tor liegt dazwischen. Erobere das Tor (oder eins deines Bündnisses), dann geht es.', 5000); return; }
    if (!marschPlatz(senderBotId || 'player', grp)) return;          // Marsch-Plätze (Paket D)
    if (!senderBotId && !rechnet()) {                             // Zuschauer: der Weltrechner schickt sie los
        const vh = lastHop(source.landmassId, target.landmassId, 'player'); if (!mautVorab(vh[0], vh[1], rawTroops)) return;
        WELT.befehl('senden', { von: fromId, nach: toId, n: rawTroops, grp: grp || undefined });
        islandTroops[fromId] = available - rawTroops;
        { const t0 = Date.now(); vorlaeufigDazu('s', { fromId, toId, troops: rawTroops, startedAt: t0, resolveAt: t0 + travelDurationSeconds(source, target) * 1000, senderBotId: null, grp: grp || undefined }); } questProgress('send', 1); sfx('send'); updateHud();
        flashHint('Truppen unterwegs zu ' + islandTitle(target) + '.'); return;
    }
    const hop = lastHop(source.landmassId, target.landmassId, senderBotId || 'player');
    if (!payToll(hop[0], hop[1], rawTroops, senderBotId || 'player')) return;

    islandTroops[fromId] = available - rawTroops; // troops march out, the rest stays
    const durationSec = travelDurationSeconds(source, target, senderBotId);
    const startedAt = Date.now();
    pendingSends.push({
        fromId,
        toId,
        troops: rawTroops,
        startedAt,
        resolveAt: startedAt + durationSec * 1000,
        senderBotId: senderBotId || null,
        ...(grp ? { grp } : {})
    });
    if (!senderBotId) { questProgress('send', 1); sfx('send'); }
    updateHud();
    saveGame();
    saveProgression();
    if (!senderBotId) {
        flashHint('Truppen unterwegs zu ' + islandTitle(target) + ' · ca. ' + fmtClock(durationSec));
        renderActiveMarches();
    }
}

// ===== MARCH ORDERS: recall a column on the way, or speed it up with gems =====
const marchKeyOf = m => m.mid || (m.mid = (m.startedAt || 0) + '-' + (m.sourceId ?? m.fromId ?? m.homeId) + '-' + (m.targetId ?? m.toId ?? m.fieldId ?? m.tid ?? m.k));   // (auch Lager/Boss/Drache und Sammler)   // fixed once, so speeding up keeps it
function pathSoFar(src, tgt, frac) {                // the stretch of the route already walked, from the start to where the column is now
    const pts = marchPath(src, tgt); let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    let left = total * frac; const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        if (left >= d) { out.push(pts[i]); left -= d; continue; }
        const q = d ? left / d : 0; out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * q, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * q }); break; }
    return out;
}
function recallMarch(key) {                          // an attack or a send turns round where it is and walks home
    const now = Date.now();
    const sc = pendingScouts.find(x => marchKeyOf(x) === key);                // ein Späher kehrt um (ohne Bericht)
    if (sc) { if (sc.back) return; pendingScouts = pendingScouts.filter(x => x !== sc); spaeherHeim(sc, now - sc.startedAt);   // kehrt um: zurück so lange, wie er schon unterwegs war
        saveProgression(); renderActiveMarches(); requestRender(); flashHint('Dein Späher kehrt um.', 2500); return; }
    const fm = feldBarbMarsch('player', key);                                  // Lager, Boss, Drache, Invasion, Sammler
    if (fm) { if (fm.back) return;
        if (!alsBefehl('zurueck', { key })) { marschUmkehren(fm, now); updateHud(); saveGame(); }
        renderActiveMarches(); requestRender(); flashHint('Deine Truppen kehren um.', 3000); return; }
    if (!rechnet()) {                                 // Zuschauer: der Weltrechner lässt sie umkehren
        const m = pendingAttacks.find(x => marchKeyOf(x) === key) || pendingSends.find(x => marchKeyOf(x) === key);
        if (m && m.fightEndsAt) { flashHint('Die Truppen kämpfen schon – zu spät zum Zurückrufen.', 3000); return; }
        if (m && m.rally) { flashHint('Eine Rally gehört allen, die mitmachen – sie kann nicht zurückgerufen werden.', 3500); return; }
        if (m && m.vorlaeufig) { flashHint('Einen Moment – der Marsch läuft gerade los.', 1500); return; }
        if (m) { WELT.befehl('zurueck', { key }); flashHint('Deine Truppen kehren um.', 3000); }
        return;
    }
    for (const [list, kind] of [[pendingAttacks, 'attack'], [pendingSends, 'send']]) {
        const m = list.find(x => marchKeyOf(x) === key); if (!m) continue;
        if (m.fightEndsAt) { flashHint('Die Truppen kämpfen schon – zu spät zum Zurückrufen.', 3000); return; }
        const fromId = m.sourceId ?? m.fromId, toId = m.targetId ?? m.toId, troops = m.rawTroops ?? m.troops;
        const src = islandById[fromId], tgt = islandById[toId];
        const frac = Math.max(0, Math.min(1, (now - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt)));
        if (kind === 'attack') heroWutZurueck('player', m.hx);   // (nicht gekämpft: die Wut bleibt)
        list.splice(list.indexOf(m), 1);
        const walked = Math.max(1000, (Math.min(now, m.resolveAt) - m.startedAt));   // (wer vor dem Ziel gewartet hat, läuft nur den Weg zurück)
        const home = ownedIslands.has(fromId) ? fromId : rewardBaseId();
        pendingRetreats.push({ fromId: toId, toId: home, troops, startedAt: now, resolveAt: now + walked, path: home === fromId ? pathSoFar(src, tgt, frac).reverse() : null });
        flashHint(fmtNum(troops) + ' Truppen kehren um – zurück in ' + fmtClock(Math.ceil(walked / 1000)) + '.', 3500);
        saveGame(); saveProgression(); renderActiveMarches(); requestRender(); return;
    }
}
// (Zuschauer) eben beschleunigte Märsche merken: bis der Weltrechner es übernommen hat, setzt die nächste Welt-Lieferung
// sie nicht wieder auf die alte Zeit zurück (sonst springt der Marsch zurück und wieder vor)
const wartendSchneller = new Map();                 // Marsch-Kennung → { resolveAt, startedAt, bis }
function schnellerMerken(m) { if (window.WELT && !rechnet()) wartendSchneller.set(marchKeyOf(m), { resolveAt: m.resolveAt, startedAt: m.startedAt, bis: Date.now() + 10000 }); }
function schnellerDrueber() {
    if (!wartendSchneller.size) return;
    const now = Date.now();
    for (const [k, w] of wartendSchneller) {
        const m = pendingAttacks.find(x => marchKeyOf(x) === k) || pendingSends.find(x => marchKeyOf(x) === k) || pendingRetreats.find(x => marchKeyOf(x) === k) || feldBarbMarsch('player', k);
        if (!m || now > w.bis || m.resolveAt <= w.resolveAt + 1500) { wartendSchneller.delete(k); continue; }   // der Weltrechner hat es (oder es ist vorbei)
        m.resolveAt = w.resolveAt; m.startedAt = w.startedAt;
    }
}
// (Zuschauer) Losgeschickt → der Marsch steht SOFORT auf der Karte (vorläufig), bis der echte vom Weltrechner kommt
// (sonst sähe man ihn erst ~1 s später loslaufen). Spätestens nach 10 s verschwindet ein vorläufiger ohne echten.
const vorlaeufigeMaersche = [];                      // { art: 'a' | 's', m, bis }
function vorlaeufigDazu(art, m) {
    m.vorlaeufig = true; vorlaeufigeMaersche.push({ art, m, bis: Date.now() + 10000 });
    (art === 'a' ? pendingAttacks : pendingSends).push(m); renderActiveMarches(); requestRender();
}
function vorlaeufigDrueber() {
    if (!vorlaeufigeMaersche.length) return;
    const now = Date.now(), vergeben = new Set();
    for (let i = vorlaeufigeMaersche.length - 1; i >= 0; i--) {
        const v = vorlaeufigeMaersche[i], liste = v.art === 'a' ? pendingAttacks : pendingSends, m = v.m;
        const von = v.art === 'a' ? 'sourceId' : 'fromId', nach = v.art === 'a' ? 'targetId' : 'toId', wer = v.art === 'a' ? 'attackerBotId' : 'senderBotId';
        const echt = liste.find(x => !x.vorlaeufig && !vergeben.has(x) && !x[wer] && x[von] === m[von] && x[nach] === m[nach] && x.startedAt >= m.startedAt - 3000);
        if (echt || now > v.bis) { if (echt) vergeben.add(echt); vorlaeufigeMaersche.splice(i, 1); const j = liste.indexOf(m); if (j >= 0) liste.splice(j, 1); continue; }
        if (!liste.includes(m)) liste.push(m);
    }
}
function speedUpCost(m) { return Math.max(1, Math.ceil((m.resolveAt - Date.now()) / 60000)); }   // 1 gem per minute still to go
let speedUpZuletzt = 0;                               // (ein Doppel-Tipp beschleunigt nicht zweimal)
function speedUpMarch(key, btn) {                    // halves the time still to go; the column keeps its place on the road
    const now = Date.now(); if (now - speedUpZuletzt < 600) return; speedUpZuletzt = now;
    const sc = pendingScouts.find(x => marchKeyOf(x) === key);                // ein Späher (nur deiner – kein Befehl an den Weltrechner nötig)
    if (sc) { const rem = sc.resolveAt - now; if (rem < 1500) return; const cost = speedUpCost(sc); if (gems < cost) { flashHint('Zu wenig Gems – Beschleunigen kostet ' + cost + '.', 3000); return; }
        if (!gemsWirklich('marsch:' + key, cost, btn)) return;
        gems -= cost; const p = Math.max(0, Math.min(.99, (now - sc.startedAt) / Math.max(1, sc.resolveAt - sc.startedAt)));
        sc.resolveAt = now + rem / 2; sc.startedAt = sc.resolveAt - (rem / 2) / (1 - p);
        flashHint('Späher beschleunigt – noch ' + fmtClock(Math.ceil(rem / 2000)) + '.', 2500); updateHud(); saveGame(); saveProgression(); renderActiveMarches(); requestRender(); return; }
    for (const list of [pendingAttacks, pendingSends, pendingRetreats, eigeneFeldBarb()]) {
        const m = list.find(x => marchKeyOf(x) === key); if (!m) continue;
        if (m.fightEndsAt) return;
        if (m.vorlaeufig) { flashHint('Einen Moment – der Marsch läuft gerade los.', 1500); return; }
        const rem = m.resolveAt - now; if (rem < 1500) return;
        const cost = speedUpCost(m); if (gems < cost) { flashHint('Zu wenig Gems – Beschleunigen kostet ' + cost + '.', 3000); return; }
        if (!gemsWirklich('marsch:' + key, cost, btn)) return;
        gems -= cost;
        alsBefehl('schneller', { keys: [key] });
        const p = Math.max(0, Math.min(.99, (now - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt)));
        m.resolveAt = now + rem / 2; m.startedAt = m.resolveAt - (rem / 2) / (1 - p); schnellerMerken(m);
        flashHint('Beschleunigt – noch ' + fmtClock(Math.ceil(rem / 2000)) + '.', 2500);
        feldBarbSpeichern(); updateHud(); saveGame(); saveProgression(); renderActiveMarches(); requestRender(); return;
    }
}
// "Alle schneller": halves the time left of every own column on the road at once (same price as one by one)
function speedableMarches() {
    const now = Date.now();
    return [...pendingAttacks.filter(a => !a.attackerBotId), ...pendingSends.filter(x => !x.senderBotId), ...pendingRetreats, ...eigeneFeldBarb()].filter(m => !m.fightEndsAt && !m.vorlaeufig && m.resolveAt - now >= 1500);
}
function speedUpAll(btn) {
    if (Date.now() - speedUpZuletzt < 600) return; speedUpZuletzt = Date.now();
    const list = speedableMarches(); if (!list.length) return;
    const cost = list.reduce((a, m) => a + speedUpCost(m), 0);
    if (gems < cost) { flashHint('Zu wenig Gems – alle beschleunigen kostet ' + fmtNum(cost) + '.', 3000); return; }
    if (!gemsWirklich('marschAlle', cost, btn)) return;
    gems -= cost; const now = Date.now();
    alsBefehl('schneller', { keys: list.map(marchKeyOf) });
    for (const m of list) { const rem = m.resolveAt - now, pr = Math.max(0, Math.min(.99, (now - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt)));
        m.resolveAt = now + rem / 2; m.startedAt = m.resolveAt - (rem / 2) / (1 - pr); schnellerMerken(m); }
    flashHint(list.length + (list.length === 1 ? ' Marsch' : ' Märsche') + ' beschleunigt – Restzeit halbiert.', 2500);
    feldBarbSpeichern(); updateHud(); saveGame(); saveProgression(); renderActiveMarches(); requestRender();
}
function marchButtons(m, canRecall) {
    const k = marchKeyOf(m);
    return '<span class="mact">' + (canRecall ? '<button type="button" data-mact="recall" data-k="' + k + '" title="Zurückrufen">' + icon('recall') + 'Zurück</button>' : '') +
        (gemsArmed('marsch:' + k) ? '<button type="button" class="is-armed" data-mact="speed" data-k="' + k + '" title="Restzeit halbieren">Wirklich? ' + icon('gem') + fmtNum(speedUpCost(m))   // Nachfrage ab 500 Gems übersteht das Neuzeichnen
            : '<button type="button" data-mact="speed" data-k="' + k + '" title="Restzeit halbieren">' + icon('hourglass') + 'Schneller · <b>' + speedUpCost(m) + '</b>' + icon('gem')) + '</button></span>';
}

function resolveSend(send) {
    const target = islandById[send.toId];
    if (!target) return;
    if ((send.rally || send.hilfe || send.verst) && typeof bundSendAnkunft === 'function' && bundSendAnkunft(send)) return;   // Bündnis: zur Rally oder als Hilfe zu einem Mitglied
    const sender = send.senderBotId || 'player';
    if (islandOwnerOf(send.toId) !== sender) {       // the base fell while they marched: they turn round instead of joining the enemy
        const home = islandOwnerOf(send.fromId) === sender ? send.fromId : sender === 'player' ? rewardBaseId() : [...(botOwnedIslands[sender] || [])][0];
        if (home !== null && home !== undefined && islandById[home]) {
            const startedAt = Date.now(), dur = travelDurationSeconds(target, islandById[home], send.senderBotId);
            if (sender === 'player') {
                pendingRetreats.push({ fromId: send.toId, toId: home, troops: send.troops, startedAt, resolveAt: startedAt + dur * 1000 });
                flashHint(islandTitle(target) + ' ist schon gefallen – deine ' + fmtNum(send.troops) + ' Truppen kehren nach ' + islandTitle(islandById[home]) + ' zurück.', 5000);
                renderActiveMarches();
            } else if (botById[sender] && botById[sender].mensch && !send.back) {   // ein echter Spieler (Weltrechner): sichtbar zurück + Bescheid (vorher still heimgebucht – sah aus wie „abgebrochen“)
                pendingSends.push({ fromId: send.toId, toId: home, troops: send.troops, startedAt, resolveAt: startedAt + dur * 1000, senderBotId: sender, back: true });
                if (typeof bundMelden === 'function') bundMelden(sender, islandTitle(target) + ' ist gefallen, bevor deine Truppen ankamen – ' + fmtNum(send.troops) + ' Truppen kehren nach ' + islandTitle(islandById[home]) + ' zurück.');
            } else islandTroops[home] = (islandTroops[home] || 0) + send.troops;
        }
        saveGame(); saveProgression(); return;
    }
    islandTroops[send.toId] = (islandTroops[send.toId] || 0) + send.troops;
    updateHud();
    saveGame();
    // Persists the now-shorter pendingSends array too - without this
    // the just-resolved send reloads from localStorage on next page
    // load (resolveAt already in the past) and gets applied a
    // second time, duping the arrived troops.
    saveProgression();
    // A bot reinforcing its own base internally is never shown to
    // the player - same reasoning as bot-vs-neutral attacks.
    if (send.senderBotId) return;
    addCombatLogEntry({
        type: 'send',
        fromId: send.fromId,
        toId: send.toId,
        troops: send.troops
    });
    flashHint(fmtNum(send.troops) + ' Truppen bei ' + islandTitle(target) + ' angekommen.', 3000);
}

