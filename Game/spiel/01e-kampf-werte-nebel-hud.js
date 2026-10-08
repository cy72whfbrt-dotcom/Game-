// Teil 01e-kampf-werte-nebel-hud.js: Nebel (Daten), Kampfwerte (Angriff, Verteidigung, Mauer, Helden), Speichern, Produktion, Anzeige oben
// Nebel des Krieges: only explored islands are visible. Owning a base explores its island and
// every island bridged to it; a scout sent into the fog explores the island it reaches.
// The fog lifts in small sections (FOG_CELL squares): around every own base, and wherever a scout goes.
const FOG_CELL = 4000 * KARTE_MASSSTAB, REVEAL_BASE = 7000 * KARTE_MASSSTAB, REVEAL_SCOUT = 8000 * KARTE_MASSSTAB;
var fogCells = null, fogLmCount = {}, cellLm = null, fogFx = [], fogMaskDirty = true, fogPrompt = null;
function fogKey(cx, cy) { return cx + ',' + cy; }
function fogLandCells() {                        // key → landmass id for every cell that touches land
    if (cellLm) return cellLm;
    cellLm = {};
    for (const lm of landmasses) {
        lm.fogCells = [];
        const r = lm.shapeMaxR, x0 = Math.floor((lm.x - r) / FOG_CELL), x1 = Math.floor((lm.x + r) / FOG_CELL), y0 = Math.floor((lm.y - r) / FOG_CELL), y1 = Math.floor((lm.y + r) / FOG_CELL);
        for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
            const pts = [[.5, .5], [.1, .1], [.9, .1], [.1, .9], [.9, .9], [.5, .1], [.5, .9], [.1, .5], [.9, .5]];
            if (!pts.some(([fx, fy]) => pointInPolygon((cx + fx) * FOG_CELL, (cy + fy) * FOG_CELL, lm.shape))) continue;
            const k = fogKey(cx, cy); cellLm[k] = lm.id; lm.fogCells.push({ k, x: (cx + .5) * FOG_CELL, y: (cy + .5) * FOG_CELL });
        }
    }
    return cellLm;
}
function fogSet() {
    if (!fogCells) {
        try { fogCells = new Set(JSON.parse(store.get('openWaterFogCells')) || []); } catch (e) { fogCells = new Set(); }
        const cl = fogLandCells(); fogLmCount = {};
        for (const k of fogCells) { const id = cl[k]; if (id !== undefined) fogLmCount[id] = (fogLmCount[id] || 0) + 1; }
    }
    return fogCells;
}
function isCellOpen(x, y) { return fogSet().has(fogKey(Math.floor(x / FOG_CELL), Math.floor(y / FOG_CELL))); }
function islandSeen(isl) {                      // a base is visible when its spot is explored - a gate also from its bridge
    if (!(isCellOpen(isl.x, isl.y) || (isl.ends && isl.ends.some(e => isCellOpen(e[0], e[1]))))) return false;
    return !nebelVomServer() || truppenBekannt(isl);
}
// 3B – Nebel auf dem Server: fremde Truppenzahlen kommen nur für Inseln, die der Weltrechner dich sehen lässt. Fehlt die Zahl
// einer fremden Basis, liegt sie für dich (noch) im Nebel („?“) – auch wenn dein Handy das Feld schon aufgedeckt hat.
function nebelVomServer() { return !SYSTEM && !!window.WELT && !WELT.leiter && WELT.sichtV >= 0; }
function truppenBekannt(isl) { const ow = islandOwnerOf(isl.id); return !ow || ow === 'player' || Object.prototype.hasOwnProperty.call(islandTroops, isl.id); }
function isExplored(lmId) { fogSet(); return (fogLmCount[lmId] || 0) > 0; }             // any part of the island known
function revealAround(x, y, r, fade) {
    const set = fogSet(), cl = fogLandCells(), now = performance.now(), rr2 = r + FOG_CELL * .35;
    let changed = false;
    for (let cx = Math.floor((x - r) / FOG_CELL); cx <= Math.floor((x + r) / FOG_CELL); cx++)
        for (let cy = Math.floor((y - r) / FOG_CELL); cy <= Math.floor((y + r) / FOG_CELL); cy++) {
            const k = fogKey(cx, cy), id = cl[k];
            if (set.has(k)) continue;
            const mx = (cx + .5) * FOG_CELL, my = (cy + .5) * FOG_CELL;
            if (Math.abs(mx) > FRAME_HALF + FOG_CELL || Math.abs(my) > FRAME_HALF + FOG_CELL) continue;
            if (Math.hypot(mx - x, my - y) > rr2) continue;
            set.add(k); changed = true;
            if (id !== undefined) fogLmCount[id] = (fogLmCount[id] || 0) + 1;
            if (fade) fogFx.push({ k, x: mx, y: my, d: Math.hypot(mx - x, my - y), t: now });
        }
    if (changed) { fogMaskDirty = true; store.set('openWaterFogCells', JSON.stringify([...set])); if (typeof requestRender === 'function') requestRender(); }
    return changed;
}
const sichtVon = (i, weit) => Math.max(weit, i.startSicht || 0);   // ein Startplatz sieht bis zum Gebirge seines Gebiets
function exploreOwned() { for (const id of ownedIslands) { const i = islandById[id]; if (i) revealAround(i.x, i.y, sichtVon(i, REVEAL_BASE), false); } }
function effectiveTroops(island) {
    const boss = bossAt(island.id); if (boss) return boss.troops;
    const owner = islandOwnerOf(island.id);
    return owner ? (islandTroops[island.id] || 0) : island.neutralTroops;
}
function wallDefensePct() {                     // Mauer in the city: +2 % defense per level on every one of your bases
    try { return (loadCity().levels.wall || 0) * 2; } catch (e) { return 0; }   // (the city isn't set up yet during the very first boot steps)
}
function effectiveDefense(island) {
    const boss = bossAt(island.id); if (boss) return boss.defense;
    const owner = islandOwnerOf(island.id);
    if (!owner) return island.neutralDefense;
    const level = islandLevels[island.id] || 1;
    const garrison = islandTroops[island.id] || 0;   // Verteidigung skill: the garrison fights harder, +3 % of it per level (mirror of the sword)
    const sw = owner !== 'player' && fremdGeheim() ? spaehWerte(owner) : null;   // Zuschauer: fremde Werte aus dem letzten Spähbericht (sonst ohne Boni)
    const def = (owner === 'player' ? (defenseForLevel(level) + garrison * (skills.defense || 0) * SKILL_DEFS.defense.defPct / 100) * (1 + wallDefensePct() / 100)
                                    : sw ? (baseDefenseForLevel(level) * (1 + sw.ar / 100) + garrison * sw.dp / 100) * (1 + sw.wall * 2 / 100)
                                    : (baseDefenseForLevel(level) * (1 + (botMults(owner).armorPct || 0) / 100) + garrison * (botMults(owner).defensePct || 0) / 100) * (1 + botBld(owner, 'wall') * 2 / 100)) * titleMult(owner, 'defense');
    const kk = sw ? sw.kk : AUF ? AUF.kampf(owner, 'd') : 1;       // Truppen-Stufe + Forschung (Paket D): Besatzung UND Verteidigung zählen × Kampfkraft – das Mehr steckt hier
    const vp = typeof verstDefPlus !== 'undefined' && verstDefPlus[island.id] || 0;   // Verstärkung: jeder Helfer mit seinen eigenen Werten
    const vh = sw ? Math.round(garrison * sw.va / 100) + Math.min(sw.vg, garrison) : vhPlus(vhFx(owner), garrison);   // Verteidigungs-Helden aus der Mauer (Zuschauer: laut Spähbericht)
    return Math.max(0, Math.round(def * kk + garrison * (kk - 1) + vp + vh));
}
// Where every point of a fight comes from - for the battle report, line by line with its source.
function defenseParts(island) {
    const boss = bossAt(island.id); if (boss) return [['Verteidigung', boss.defense, 'Boss']];
    const owner = islandOwnerOf(island.id), L = islandLevels[island.id] || 1;
    if (!owner) return [['Verteidigung', island.neutralDefense, 'neutrale Basis']];
    const g = islandTroops[island.id] || 0, base = baseDefenseForLevel(L), out = [['Grundverteidigung', base, 'Basis Stufe ' + L]];
    let armor, skill, wallPct, sl;
    if (owner === 'player') { armor = defenseForLevel(L) - base; sl = skills.defense || 0; skill = g * sl * SKILL_DEFS.defense.defPct / 100; wallPct = wallDefensePct(); }
    else { const m = botMults(owner), b = loadBotState()[owner]; armor = base * (m.armorPct || 0) / 100; sl = b ? b.skills.defense : 0; skill = g * (m.defensePct || 0) / 100; wallPct = botBld(owner, 'wall') * 2; }
    if (armor) out.push(['Rüstung', Math.round(armor), 'Ausrüstung']);
    if (skill) out.push(['Fähigkeit Verteidigung', Math.round(skill), 'Stufe ' + sl + ' · +' + sl * SKILL_DEFS.defense.defPct + ' % der Truppen']);
    const sub = base + armor + skill;
    if (wallPct) out.push(['Mauer', Math.round(sub * wallPct / 100), 'Stadt · +' + wallPct + ' %']);
    const x = titleOf(owner); if (x && x.kind === 'defense') out.push(['Titel ' + x.name, Math.round(sub * (1 + wallPct / 100) * x.v), 'Mega-Tempel · ' + (x.v > 0 ? '+' : '−') + Math.round(Math.abs(x.v) * 100) + ' %']);
    const kk = AUF ? AUF.kampf(owner, 'd') : 1;
    if (kk !== 1) { const vor = out.reduce((a, q) => a + q[1], 0);
        out.push(['Forschung Verteidigung', Math.round((vor + g) * (kk - 1)), '+' + Math.round((kk - 1) * 100) + ' % auf Besatzung und Verteidigung']); }
    const vp = typeof verstDefPlus !== 'undefined' && Math.round(verstDefPlus[island.id] || 0);
    if (vp) out.push(['Verstärkung: eigene Werte', vp, 'jeder Helfer mit seiner Fähigkeit, seinem Titel und seiner Forschung']);
    const vx = owner === 'player' || !fremdGeheim() ? vhFx(owner) : null, vh = vhPlus(vx, g);   // Verteidigungs-Held aus der Mauer
    if (vh) out.push([vhName(vx), vh, 'Mauer · Angriff +' + heroNum(vx.atk) + ' % der Besatzung' + (heroGefOf(vx, g) ? ' · Gefolge +' + fmtCompact(heroGefOf(vx, g)) : '')]);
    out[0][1] += effectiveDefense(island) - out.reduce((a, q) => a + q[1], 0);        // rounding goes to the base line
    return out;
}
// what each side brought: level, title, the 4 equipped items, the hero who led (stars, rage, every bonus) and the city - kept with the report
function heroReportOf(hx) { return hx && hx.id ? { id: hx.id, q: hx.q, fired: !!hx.fired, skill: hx.skill || null, lines: hx.lines || [], pair: hx.pair || null, ...(hx.vh ? { vh: 1 } : {}), ...(hx.zweit ? { zweit: 1 } : {}),   // (vh: Verteidigungs-Held aus der Mauer)
    h2: hx.h2 ? { id: hx.h2.id, q: hx.h2.q, zweit: 1, lines: hx.h2.lines || [] } : null,
    extra: (hx.extra || []).map(e => ({ id: e.id, q: e.q, fired: !!e.fired, zweit: e.zweit ? 1 : 0, skill: e.skill || null, lines: e.lines || [] })) } : null; }
function fighterSnapshot(who, hx) {
    if (!who) return null;
    const slots = Object.keys(EQUIPMENT_DEFS);
    if (who === 'player') return { lvl: playerLvl, title: (titleOf('player') || {}).name || null,
        items: slots.map(k => { const it = equippedItems[k] && inventory[equippedItems[k]]; return it ? [k, it.rarity, it.level, it.stars || 0] : [k, -1, 0, 0]; }),
        heroes: [], hx: heroReportOf(hx),
        skills: [skills.attack || 0, skills.defense || 0], city: [cityLevelSafe('wall'), cityLevelSafe('hospital'), cityLevelSafe('heroes')] };
    const b = loadBotState()[who]; if (!b) return null;
    return { lvl: b.lvl, title: (titleOf(who) || {}).name || null,
        items: slots.map(k => { const it = botItem(b, k); return it ? [k, it.rarity, it.level, it.stars] : [k, -1, 0, 0]; }),
        heroes: [], hx: heroReportOf(hx),
        skills: [b.skills.attack || 0, b.skills.defense || 0], city: [botBld(who, 'wall'), botBld(who, 'hospital'), botBld(who, 'heroes')] };
}
function attackParts(who, raw, bonus, total, hero, a) {       // a = the attack: its launch-time skill share and level win over today's values
    const out = [], snap = a && a.skillBonus !== undefined;
    const sl = snap && a.skillLvl !== undefined ? a.skillLvl : who === 'player' ? skills.attack || 0 : (loadBotState()[who] || { skills: {} }).skills.attack || 0;
    const skill = Math.min(bonus, snap ? a.skillBonus : who === 'player' ? attackFlatBonus(raw) : Math.round(raw * sl * SKILL_DEFS.attack.atkPct / 100));
    if (skill) out.push(['Fähigkeit Angriff', skill, 'Stufe ' + sl + ' · +' + sl * SKILL_DEFS.attack.atkPct + ' %']);
    const hx = a && a.hx, hd = hx && heroById(hx.id);             // the hero's Angriff and Gefolge (a fired skill included)
    const h2n = hx && hx.id2 && heroById(hx.id2) ? ' & ' + heroById(hx.id2).name : '';   // der Zweitheld zählt mit
    if (bonus - skill) out.push([hd ? 'Held ' + hd.name + ' ' + heroStarTxt(hx.q) + h2n : 'Helden', bonus - skill, hd ? 'Angriff +' + Math.round(hx.atk) + ' %' + (heroGefOf(hx, raw) ? ' · Gefolge +' + fmtCompact(heroGefOf(hx, raw)) : '') + (hx.fired ? ' · ' + hx.skill + ' gezündet' : '') : '']);
    const kr = a && a.atkKraft ? a.atkKraft : 1, kv = kr !== 1 ? Math.round(total - total / kr) : 0;   // Forschung Angriff (Paket D)
    const tv = total - raw - bonus - kv, x = a && a.atkTitleKey !== undefined ? TITLES.find(q => q.key === a.atkTitleKey) : titleOf(who);   // the title it marched with
    if (tv) out.push(['Titel ' + (x ? x.name : ''), tv, 'Mega-Tempel · ' + (tv > 0 ? '+' : '−') + (x ? Math.round(Math.abs(x.v) * 100) : 25) + ' %']);
    if (kv) out.push(['Forschung Angriff', kv, '+' + Math.round((kr - 1) * 100) + ' % Kampfkraft']);
    return out;
}
// Rammbock, Sturmflut, Mauerbrecher: the target's defense counts less. Gemeinsam (Rally): jeder Held nur nach dem Stärke-Anteil
// SEINES Spielers (Anführer-Held × sein Anteil + Mitglieds-Helden × deren Anteil – Alexander: jeder Held zählt nur für seine Truppen)
function heroDefCut(a) {
    const c = h => h ? Math.min(90, h.def || 0) / 100 : 0;
    if (!a || !a.rally || !Array.isArray(a.rally.an) || !a.rally.an.some(x => x && x[0] !== a.rally.by)) return c(a && a.hx);
    const ganz = (a.rawTroops || 0) + (a.attackBonus || 0); if (!(ganz > 0)) return c(a.hx);
    const by = a.rally.by, k = {}, hx = {}; let andere = 0;
    for (const x of a.rally.an) if (x && x[0] !== by && x[3] != null) { const s = Math.max(0, x[2] + x[3]); k[x[0]] = (k[x[0]] || 0) + s; andere += s; if (x[4] && !hx[x[0]]) hx[x[0]] = x[4]; }
    let cut = c(a.hx) * Math.max(0, ganz - andere) / ganz;
    for (const w in k) cut += c(hx[w]) * k[w] / ganz;
    return Math.min(.9, cut);
}
function heroDefPart(parts, a, full) {
    const cut = Math.round(full * heroDefCut(a)); if (!cut) return parts;
    const hd = a.hx && heroById(a.hx.id), mit = a.rally && Array.isArray(a.rally.an) && a.rally.an.some(x => x && x[0] !== a.rally.by && x[4]);
    parts.push([hd ? 'Held ' + hd.name + (a.hx.id2 && heroById(a.hx.id2) ? ' & ' + heroById(a.hx.id2).name : '') + (mit ? ' + Helden der Verbündeten' : '') : 'Helden der Verbündeten', -cut,
        'Verteidigung −' + Math.round(heroDefCut(a) * 100) + ' %' + (mit ? ' (je Held nach Anteil seines Spielers)' : '')]); return parts;
}
function attackFields(who, src, target, raw, hx) {      // everything an attack takes along at launch (skills, gear, title, hero) - for you and for everyone else
    const bot = who !== 'player', sk = bot ? Math.round(raw * botMults(who).attackPct / 100) : attackFlatBonus(raw);
    const hb = hx ? Math.round(raw * hx.atk / 100) + heroGefOf(hx, raw) : 0;   // (der Helden-Anteil – fällt weg, wenn der Angreifer im Kampf schon 2 Helden hat)
    return { attackBonus: sk + hb, heldBonus: hb, skillBonus: sk, skillLvl: bot ? loadBotState()[who].skills.attack : skills.attack || 0,
        attackGoldRate: bot ? botGoldRate(who, 'attackGold') : (skills.attackGold || 0) * SKILL_DEFS.attackGold.rate, rewardGoldRate: killGoldRate(who, hx),
        shieldLossReductionPct: Math.min(90, (bot ? botMults(who).shield : shieldLossReductionPct()) + (hx ? hx.loss : 0)), botShield: bot,
        atkTitle: titleMult(who, 'attack'), atkTitleKey: (titleOf(who) || {}).key || null, hero: hx ? hx.id : null, hero2: hx && hx.id2 || null, hx: hx || null,
        atkKraft: AUF ? AUF.kampf(who, 'a') : 1, atkFo: AUF ? AUF.foWert(who, 'm_atk') : 0 };   // Forschung Angriff (Paket D)
}
// Removes an island from whichever owner (player or a bot) it
// currently belongs to, without touching its troops/level - used
// right before handing it to whoever just conquered it.
function clearIslandOwner(islandId) {
    ownedIslands.delete(islandId);
    for (const bot of BOT_DEFS) botOwnedIslands[bot.id].delete(islandId);
}

// Many things change many times a second (150 rivals): the save is written at most once a second, and when the page goes away.
var saveGameTimer = null;
function saveGame() { if (!saveGameTimer) saveGameTimer = setTimeout(saveGameNow, 1000); }
window.addEventListener('pagehide', () => { if (saveGameTimer) saveGameNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && saveGameTimer) saveGameNow(); });
function saveGameNow() {
    clearTimeout(saveGameTimer); saveGameTimer = null;
    store.set('openWaterOwnedIslands', JSON.stringify([...ownedIslands]));
    store.set('openWaterIslandLevels', JSON.stringify(islandLevels));
    store.set('openWaterIslandTroops', JSON.stringify(islandTroops));
    store.set('openWaterCoins', String(coins));
    store.set('openWaterGems', String(gems));
    store.set('openWaterTempleHoldSince', JSON.stringify(templeHoldSince));
    store.set('openWaterScoutedIslands', JSON.stringify([...scoutedIslands]));
    store.set('openWaterNeutralTroopOverrides', JSON.stringify(neutralTroopOverrides));
    const botOwnedForSave = {};
    for (const bot of BOT_DEFS) botOwnedForSave[bot.id] = [...botOwnedIslands[bot.id]];
    store.set('openWaterBotOwnedIslands', JSON.stringify(botOwnedForSave));
    store.set('openWaterBotCoins', JSON.stringify(botCoins));
}

const coinCountEl = document.getElementById('coinCount');
const gemCountEl = document.getElementById('gemCount');
const troopCountEl = document.getElementById('troopCount');
function totalTroops() {
    let sum = 0;
    for (const ownedId of ownedIslands) sum += islandTroops[ownedId] || 0;
    return sum;
}
// The same multipliers runProductionTick uses (equipment/skills, ruler bonus, titles)
function cityLevelSafe(id) { try { return loadCity().levels[id] || 0; } catch (e) { return 0; } }   // (the city isn't set up during the first boot steps)
function playerCoinMult() { return coinProductionMultiplier() * (rulerOwner() === 'player' ? RULER_BONUS : 1) * titleMult('player', 'coins') * bundProdFaktor('player') * (AUF ? AUF.ertrag('player') : 1); }
function bundProdFaktor(who) { return typeof bundProdMult === 'function' ? bundProdMult(who) : 1; }   // Tempel-Bonus des Bündnisses
function playerTroopMult() { return troopProductionMultiplier() * (rulerOwner() === 'player' ? RULER_BONUS : 1) * titleMult('player', 'troops') * bundProdFaktor('player'); }
function totalTroopProductionPerTick() {
    let sum = 0; const m = playerTroopMult();
    for (const ownedId of ownedIslands) {
        sum += troopsPerTick(islandLevels[ownedId] || 1) * m;
        const isl = islandById[ownedId];
        if (isl && (isl.type === 'temple' || isl.type === 'megaTemple')) sum += TEMPLE_TROOP_BONUS_PER_TICK * templeBaseMult(isl) * templeHoldMultiplier(ownedId) * shrineMult('player');
    }
    return sum;
}
function shrineMult(who) { return 1 + (AUF ? AUF.tempelPlus(who) : 0); }   // Forschung „Tempel“ im Labor (früher der Tempelschrein)
function totalCoinProductionPerTick() {
    let sum = 0; const m = playerCoinMult();
    for (const ownedId of ownedIslands) {
        sum += coinsPerTick(islandLevels[ownedId] || 1) * m;
        const isl = islandById[ownedId];
        if (isl && (isl.type === 'temple' || isl.type === 'megaTemple')) sum += TEMPLE_COIN_BONUS_PER_TICK * templeBaseMult(isl) * templeHoldMultiplier(ownedId) * shrineMult('player');
    }
    return sum;
}
// Ertrag pro Stunde (Alexander 5.10.: überall „pro Stunde“ wie Million Lords): je Tick × Ticks in einer Stunde (Tick-Länge mit
// der Fähigkeit „Geschwindigkeit“); unter 100 mit einer, unter 1 mit zwei Nachkommastellen, damit kleine Werte nicht als 0
// erscheinen (nur die Burg: 0,04 Holz pro Stunde)
const proStunde = (jeTick, ms) => jeTick * 3600000 / (ms || productionTickMs());
const NF_1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }), NF_2 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
function fmtStunde(n) { const a = Math.abs(n); return a >= 100 ? fmtNum(Math.round(n)) : a >= 1 ? NF_1.format(Math.round(n * 10) / 10) : NF_2.format(Math.round(n * 100) / 100); }
function setText(el, v) { v = String(v); if (el && el.textContent !== v) el.textContent = v; }        // DOM writes only on a change: an equal write still costs a layout
function setShown(el, on) { const d = on ? 'block' : 'none'; if (el && el.style.display !== d) el.style.display = d; }
function updateHud() {
    const troops = totalTroops();
    setText(coinCountEl, fmtHud(Math.floor(coins)));
    const tc = fmtNum(Math.floor(coins)) + ' Münzen', tg = fmtNum(Math.floor(gems)) + ' Edelsteine', tt = fmtNum(troops) + ' Truppen';
    if (coinCountEl.parentNode.title !== tc) coinCountEl.parentNode.title = tc;
    setText(gemCountEl, fmtHud(Math.floor(gems)));
    if (gemCountEl.parentNode.title !== tg) gemCountEl.parentNode.title = tg;
    setText(troopCountEl, fmtHud(troops));
    if (troopCountEl.parentNode.title !== tt) troopCountEl.parentNode.title = tt;
    if (AUF) AUF.hud();                                                       // Holz, Stein, Eisen (aufbau.js)
    requestRender();   // HUD changes coincide with state changes -> the map may need a redraw
}
// Player plate (#hudPlayer, Handy + Desktop: antippen = Profil). Called at boot, from the 1s
// interval and from renderProfile(). It reads playerLvl, profileName
// and RANK_TIERS, which are declared further down, so it must never
// run before the script has passed those lines.
function updateHudPlayer() {
    setText(document.getElementById('hudName'), profileName.value || 'Du');
    setText(document.getElementById('hudLevel'), playerLvl);
    setText(document.getElementById('hudRankLine'), rulerOwner() === 'player' ? 'Herrscher der Meere' : 'Rang ' + currentRank());
}
updateHud();

// Equipment: bought with coins, each level grants a small permanent
// global bonus. Skills: bought with skill points earned by capturing
// towers, same idea, separate currency.
const EQUIPMENT_DEFS = {
  weapon: { icon: 'weapon', name: 'Waffe',   desc: 'Truppenproduktion', pct: 2 },
  armor:  { icon: 'armor',  name: 'Rüstung', desc: 'Verteidigung aller Basen', pct: 2 },
  shield: { icon: 'shield', name: 'Schild',  desc: 'weniger Truppenverlust bei Sieg', pct: 2 },
  boots:  { icon: 'boots',  name: 'Stiefel', desc: 'Münzproduktion', pct: 2 }
};
const SKILL_DEFS = {
  speed:       { icon: 'hourglass', name: 'Geschwindigkeit',    desc: 'schnellere Produktion und Märsche', msPerLevel: 40, max: 10 },
  troops:      { icon: 'troops',    name: 'Truppenherstellung', desc: 'Truppenproduktion', pct: 3, max: 50 },
  defense:     { icon: 'defense',   name: 'Verteidigung',       desc: 'jede Basis verteidigt mit mehr Truppen', defPct: 3, max: 50 },
  defenseGold: { icon: 'shield',    name: 'Verteidigung: Münzen', desc: 'Münzen für getötete Truppen', rate: 0.3 * WIRTSCHAFT_KOSTEN * MUENZ_FAKTOR, max: 50 },
  attack:      { icon: 'attack',    name: 'Angriff',            desc: 'mehr Truppen bei jedem Angriff', atkPct: 3, max: 50 },
  attackGold:  { icon: 'sell',      name: 'Angriff: Münzen',    desc: 'Münzen für getötete Truppen', rate: 0.3 * WIRTSCHAFT_KOSTEN * MUENZ_FAKTOR, max: 50 }
};   // (Gold je Truppe × WIRTSCHAFT_KOSTEN × MUENZ_FAKTOR wie alle Münzen außerhalb der Produktion: je Stufe ~0,17 Münzen je Kill)
const EQUIPMENT_BASE_COST = 100;

