// Teil 04-stand-stadt.js: Mitspieler: Stand, Stadt, Lazarett, Helden, Ausrüstung, Einkauf
// Bots play by exactly the player's rules: XP and levels (1 skill point per level into the same 6 skills), a city
// with the same 9 buildings they build themselves (same coins, same build times, one builder), a Krankenhaus with
// room for a limited number of wounded that they heal for coins, the same 14 heroes (shards, stars, skills, one per attack),
// gear from crates (combine 3 → 1, salvage for points, level up, stars in the Schmiede) and bases upgraded
// as far as their coins allow. Nothing is derived from their level any more.
// ==============================================================================================================
// 5) STAND, STADT, LAZARETT, HELDEN, AUSRÜSTUNG, EINKAUF – dieselben Regeln wie deine
// ==============================================================================================================
var botState = null;

function loadBotState() {
    if (botState) return botState;
    try { botState = JSON.parse(store.get('openWaterBotState')) || {}; } catch (e) { botState = {}; }
    for (const bot of BOT_DEFS) {
        const b = botState[bot.id] = Object.assign({ lvl: 1, xp: 0, sp: 0, gems: 0, salvage: 0 }, botState[bot.id] || {});
        b.skills = Object.assign({ troops: 0, attack: 0, defense: 0, speed: 0, attackGold: 0, defenseGold: 0 }, b.skills || {});
        b.equip = Object.assign({ weapon: 0, armor: 0, shield: 0, boots: 0 }, b.equip || {});
        if (!b.v2 && !b.items) { b.items = {}; for (const k of Object.keys(EQUIPMENT_DEFS)) b.items[k] = RARITY_DEFS.map(() => 0); }
        if (!b.v2) botMigrateV2(bot, b);
        if (!b.city || typeof b.city !== 'object') b.city = { levels: {}, builds: [], builder2: false };   // (Zuschauer: von anderen kommt nur die Burg-Stufe)
        b.city.levels = Object.assign(Object.fromEntries(BOT_BUILDINGS.map(k => [k, 0])), b.city.levels || {}); cityBuildsFix(b.city);   // one build → a list (a second builder can be bought, like yours)
        if (!b.hs) b.hs = typeof fremdGeheim === 'function' && fremdGeheim() ? {} : heroConvert(b.heroes, b.city.levels.heroes || 0); heroFix(b.hs); delete b.heroes;   // the old 3 heroes → stars, like yours (+ the same starter shards) – Zuschauer: fremde Helden kennt er nicht (keine Start-Helden vortäuschen)
        if (!(b.wounded >= 0)) b.wounded = 0;
        b.shields = Object.assign({ 2: 0, 8: 0, 24: 0 }, b.shields || {}); if (!(b.shieldUntil > 0)) b.shieldUntil = 0;
        if (!b.achLook) { const st = b.stats || {}, cm = Math.min(...BOT_BUILDINGS.filter(k => !BOT_MIN_AUSNAHME.includes(k)).map(k => b.city.levels[k] || 0));   // Erfolge give no titles any more: the ones reached so far stay
            b.achLook = Object.entries({ cap100: (st.caps || 0) >= 100, cap1000: (st.caps || 0) >= 1000, def25: (st.defs || 0) >= 25, boss1: (st.bosses || 0) >= 1, emma10: (st.pvp || 0) >= 10, city5: cm >= 5, throne: !!st.ruled }).filter(e => e[1]).map(e => e[0]); }
        if (!b.goals) b.goals = {};                                   // Erfolge already collected (gems)
        if (AUF) AUF.botStadtFix(b);                                  // Burg, Forschung, Truppen-Stufe, Rohstoffe (aufbau.js)
    }
    return botState;
}

function botMigrateV2(bot, b) {                          // older saves: level-derived city/hero, coin gear, item counts → the real thing
    const idn = parseInt(bot.id.slice(3), 10) || 0, r = mulberry32(idn * 3301 + 17);
    const cl = Math.min(25, Math.floor(b.lvl / 2));
    b.city = { levels: {}, builds: [], builder2: false };
    for (const k of BOT_BUILDINGS) b.city.levels[k] = Math.max(0, Math.min(k === 'forge' ? STAR_MAX : 25, cl - Math.floor(r() * 3)));
    const hall = b.city.levels.heroes;
    b.heroes = {}; for (const h of ['sigrun', 'bernhard', 'ida']) b.heroes[h] = { lvl: Math.max(1, Math.min(50, hall * 2 - Math.floor(r() * 3))), xp: 0, rar: 0 };   // (turned into stars right after)
    let refund = 0; for (const k of Object.keys(b.equip)) { for (let l = 0; l < b.equip[k]; l++) refund += equipmentUpgradeCost(l); b.equip[k] = 0; }   // coin gear no longer exists for anyone
    if (refund && typeof botCoins !== 'undefined' && botCoins[bot.id] !== undefined) botCoins[bot.id] += refund;
    b.gear = {}; b.spare = {}; b.pts = 0;
    for (const k of Object.keys(EQUIPMENT_DEFS)) {
        const c = (b.items && b.items[k]) || RARITY_DEFS.map(() => 0); let best = -1;
        for (let q = c.length - 1; q >= 0; q--) if (c[q] > 0) { best = q; break; }
        b.gear[k] = best >= 0 ? { r: best, lvl: Math.min(ITEM_MAX_LEVEL, 1 + Math.floor((b.salvage || 0) / 12)), st: 0 } : null;
        b.spare[k] = c.slice(); if (best >= 0) b.spare[k][best]--;
    }
    delete b.items; b.items = null;
    const total = (b.skills.troops || 0) + (b.skills.attack || 0) + (b.skills.defense || 0);   // their points, re-spent over all 6 skills
    for (const k of BOT_SKILLS) b.skills[k] = 0;
    b.sp = (b.sp || 0) + total; botSpendSkills(bot, b);
    b.v2 = 1;
}

function botSpendSkills(bot, b) {
    const order = BOT_STYLES[bot.style].skills;
    for (let guard = 0; b.sp > 0 && guard < 10000; guard++) {
        const spent = BOT_SKILLS.reduce((a, k) => a + (b.skills[k] || 0), 0);
        let k = order[spent % order.length];
        if (SKILL_DEFS[k].max && b.skills[k] >= SKILL_DEFS[k].max) k = order.find(q => !(SKILL_DEFS[q].max && b.skills[q] >= SKILL_DEFS[q].max)) || BOT_SKILLS.find(q => !(SKILL_DEFS[q].max && b.skills[q] >= SKILL_DEFS[q].max));
        if (!k) break;                                                                  // alles voll: Punkte bleiben übrig
        b.skills[k] = (b.skills[k] || 0) + 1; b.sp--;
    }
}

// Bots change their state many times a second: write it out at most every few seconds, and when the page goes away.
var botSaveTimer = null;

function flushBotState() { if (botSaveTimer) { clearTimeout(botSaveTimer); botSaveTimer = null; } if (botState) store.set('openWaterBotState', JSON.stringify(botState)); }

function saveBotState() { if (!botSaveTimer) botSaveTimer = setTimeout(flushBotState, 4000); }

// ---- a bot's city ----
function botBld(botId, id) { const b = loadBotState()[botId]; return b ? (b.city.levels[id] || 0) : 0; }

function botCityFinish(bot, now) {                        // a build is done when its time is up - online or not, like yours
    const c = loadBotState()[bot.id].city, done = c.builds.filter(x => now >= x.endsAt); if (!done.length) return;
    for (const x of done) c.levels[x.id] = x.to; c.builds = c.builds.filter(x => now < x.endsAt); saveBotState();
}

const BOT_BUILD_PREF = {                                  // what each kind of player builds first (lower = sooner)
    raider:   { academy: 1.1, heroes: 1.2, forge: 1.4, hospital: 1.4, wall: 1.7, embassy: 2, market: 1.8 },
    builder:  { wall: 1, hospital: 1.2, forge: 1.5, heroes: 1.5, academy: 1.3, embassy: 1.8, market: 1.2 },
    templer:  { heroes: 1, wall: 1.2, hospital: 1.3, forge: 1.3, academy: 1.3, embassy: 1.4, market: 1.7 },
    balanced: { wall: 1.1, heroes: 1.2, hospital: 1.2, forge: 1.3, academy: 1.2, embassy: 1.7, market: 1.5 },
    veteran:  { academy: 1, heroes: 1.1, forge: 1.3, hospital: 1.3, wall: 1.8, embassy: 1.9, market: 1.5 }
};

function botCityBuild(bot, now) {                         // one builder (two once bought): start the next building if the coins are there
    const b = loadBotState()[bot.id], c = b.city;
    for (const x of c.builds.slice()) {                   // a person with gems finishes the last few minutes now and then
        const mins = Math.ceil((x.endsAt - now) / 60000);
        if (mins > 0 && mins <= 30 && b.gems >= mins * 4 && b.gems - mins >= TELEPORT_GEMS && Math.random() < .15) { b.gems -= mins; x.endsAt = now; botCityFinish(bot, now); }
    }
    if (c.builds.length >= citySlots(c)) return;
    const pref = BOT_BUILD_PREF[bot.style] || BOT_BUILD_PREF.balanced; let best = null, bs = Infinity;
    for (const k of BOT_BUILDINGS) {
        const lv = c.levels[k] || 0; if (lv >= (AUF ? AUF.stadtCap(bot.id, k) : cityMaxLevel(k)) || c.builds.some(x => x.id === k)) continue;   // (höchstens bis zur Burg-Stufe, wie bei dir)
        if (!lv && AUF && AUF.BAU_AB_BURG[k] > AUF.burgStufe(bot.id)) continue;                                 // Wachturm, Markt, Botschaft erst ab einer Burg-Stufe
        const s = (lv + 1) * (pref[k] || 1.5) * (.9 + Math.random() * .2); if (s < bs) { bs = s; best = k; }
    }
    if (AUF && (c.levels.keep || 1) < AUF.BURG_MAX && !c.builds.some(x => x.id === 'keep')) { const s = AUF.botBurgWert(bot, b) * (.9 + Math.random() * .2); if (s < bs) { bs = s; best = 'keep'; } }   // die Burg: sobald Gebäude an sie stoßen
    if (!best) return;
    const lv = best === 'keep' ? c.levels.keep || 1 : c.levels[best] || 0, k = AUF ? AUF.stadtKosten(best, lv) : { c: cityCost(best, lv) };
    if ((botCoins[bot.id] || 0) * (botStyle(bot).build || .5) < k.c) return;   // keeps half for troops and bases (a Schatzmeister less, a Bettler more)
    if (AUF && !AUF.kannZahlen(bot.id, k)) { if (Math.random() < .25) AUF.botMarkt(bot, k); return; }      // Rohstoffe fehlen: sammeln, Markt – später wieder
    if (AUF) AUF.zahlen(bot.id, k); else botCoins[bot.id] -= k.c;
    c.builds.push({ id: best, to: lv + 1, startedAt: now, endsAt: now + cityTimeSec(best, lv) * 1000 }); saveBotState();
}

// ---- the bot's Krankenhaus ----
function botHospitalPct(botId) { return Math.min(60, 5 * botBld(botId, 'hospital')) + (AUF ? AUF.lazarettPlus(botId) : 0); }   // (+ Forschung Krankenhaus)

function botHospitalCapacity(botId) { return hospitalPlatz(botBld(botId, 'hospital')); }   // (wie deins)

function botHospitalTake(botId, fallen, pct) {
    const b = loadBotState()[botId]; if (!b || fallen <= 0 || !botBld(botId, 'hospital')) return 0;
    const w = Math.min(Math.max(0, botHospitalCapacity(botId) - b.wounded), Math.floor(fallen * (pct ?? botHospitalPct(botId)) / 100));
    if (w > 0) { b.wounded += w; saveBotState(); }
    return w;
}

function botHeal(bot) {                                   // heals everyone at once for coins, like your Krankenhaus - when it can afford it
    const b = loadBotState()[bot.id]; if (!(b.wounded > 0)) return;
    const cost = Math.ceil(b.wounded * HEAL_COIN_PER_TROOP), cap = botCapitalOf(bot.id);
    if (cap === null || cap === undefined || (botCoins[bot.id] || 0) < cost * 2) return;
    botCoins[bot.id] -= cost; islandTroops[cap] = (islandTroops[cap] || 0) + b.wounded; botStat(bot.id, 'healed', b.wounded); b.wounded = 0; saveBotState();
}

// ---- the bot's heroes: the same 20 as yours - the same shards, quarter stars, skill points and rage ----

function botPickHero(botId, src, target, raw, paar) { return paar ? heroPickPair(botId, src, target, raw) : heroPickBest(botId, src, target, raw); }   // the free hero who does the most in this attack (paar: [Haupt-, Zweitheld], wie du)
function botGatherHeroes(botId) {                         // Sammel-Helden (Fenn, Otto, Pia …): der erste freie, dazu sein Partner oder ein zweiter Sammler
    const ok = h => heroOwned(botId, h.id) && !heroBusy(botId, h.id);
    const list = HEROES.filter(h => ok(h) && h.sk.some((x, k) => k && (x[2] === 'carry' || x[2] === 'gatherSpd' || x[2] === 'gatherDef') && heroSt(botId, h.id).sk[k])); if (!list.length) return [null, null];
    const p = heroPartner(list[0].id); return [list[0].id, p && ok(heroById(p.id)) ? p.id : list[1] ? list[1].id : null];
}

function botHeroAtk(botId) { let m = 0; for (const h of HEROES) if (heroOwned(botId, h.id) && !heroBusy(botId, h.id)) m = Math.max(m, heroStats(botId, h.id).atk); return m; }   // what the best free hero adds

const BOT_HERO_LIKES = { raider: ['atk', 'strongAtk', 'neutralAtk', 'fieldAtk', 'gateAtk'], builder: ['loss', 'hosp', 'flee', 'gold', 'carry'], templer: ['templeAtk', 'templeLoss', 'midAtk', 'guardAtk', 'siegeAtk'],
    balanced: ['atk', 'loss'], veteran: ['atk', 'loss', 'rage', 'spd'] };

function botHeroCare(bot) {                               // like a player in the Heldenhalle: the day's shards, unlock, quarter stars, points into what suits their style
    const b = loadBotState()[bot.id], day = todayKey(); if (!b || !b.hs) return;
    if (b.hsDay !== day) { const first = !b.hsDay; b.hsDay = day;               // the daily tasks' shards - on the days they play enough to finish them
        if (!first && Math.random() < Math.min(.95, (BOT_STYLES[bot.style].act || .6) + .2)) { heroGrantShards(bot.id, HERO_SHARDS_DAY); b.hsDays = (b.hsDays || 0) + 1; if (b.hsDays % 7 === 0) heroGrantShards(bot.id, HERO_SHARDS_CHAIN); } }
    if (b.hcDay !== day && (b.hcDay = day) && Math.random() < .3) {               // a hero chest from the shop now and then (at most one a day), only from gems they can spare - like the player
        const c = [...HERO_CHESTS].reverse().find(x => b.gems >= x.gems * 3 + TELEPORT_GEMS); if (c && heroChestOpen(bot.id, c).length) { b.gems -= c.gems; b.hcN = (b.hcN || 0) + 1; } }
    const like = botHeroLikes(bot), rank = t => { const i = like.indexOf(t); return i < 0 ? 99 : i; }, now = Date.now();
    for (const h of HEROES) {
        const s = b.hs[h.id]; if (!s) continue;
        if (!s.own) heroDoUnlock(bot.id, h.id);
        for (let n = 0; n < HERO_MAXQ && s.own && heroDoStep(bot.id, h.id); n++);
        const pr = q => rank(h.sk[q][2]), best = [1, 2, 3].sort((x, y) => pr(x) - pr(y))[0];
        if (s.own && pr(best) < 99 && !s.sk[best] && [1, 2, 3].some(q => s.sk[q] && pr(q) > pr(best)) && now - ((b.hsReset || {})[h.id] || 0) > 7 * 86400000
            && b.gems >= HERO_RESET_GEMS * 3 && b.gems - HERO_RESET_GEMS >= TELEPORT_GEMS && Math.random() < .3) {   // the points sit in the wrong passive for what they do now (the middle, the ruler): reset for gems, like yours
            b.gems -= HERO_RESET_GEMS; s.sk = [0, 0, 0, 0]; (b.hsReset || (b.hsReset = {}))[h.id] = now; botStat(bot.id, 'heroResets'); }
        for (let n = 0; n < 10 && s.own && heroFree(s) > 0; n++) {             // the active skill first, then the passive that suits them best
            let k = s.sk[0] < 5 ? 0 : -1;
            if (k < 0) { const opts = [1, 2, 3].filter(q => s.sk[q] < 5).sort((x, y) => pr(x) - pr(y)); if (!opts.length) break; k = opts[0]; }
            if (!heroDoSkill(bot.id, h.id, k)) break;
        }
    }
}
function botHeroLikes(bot) {                              // what their heroes should be good at: the moment first (the middle when they hold part of it, the ruler with a bounty on him), then their style
    const r = rulerOwner(), mid = [...botOwnedIslands[bot.id] || []].some(id => midZoneIds.has(id));
    return [...(r && r !== bot.id && bountyGems() >= 300 ? ['rulerAtk'] : []), ...(mid ? ['midAtk', 'guardAtk', 'midLoss', 'templeAtk'] : []), ...(BOT_HERO_LIKES[bot.style] || [])];
}

// ---- the bot's gear: one worn item per slot, spares for combining, points for levels, stars ----
function botItem(b, slot) { const g = b.gear && b.gear[slot]; return g ? { rarity: g.r, level: g.lvl, stars: g.st || 0 } : null; }

function botGearPct(b, slot) { const g = b.gear && b.gear[slot]; return g ? itemScore({ rarity: g.r, level: g.lvl }) * RARITY_PCT_PER_SCORE * (1 + (g.st || 0) * STAR_PCT / 100) : 0; }

function botMults(botId) {
    const b = loadBotState()[botId]; if (!b) return { troops: 1, coins: 1, armorPct: 0, defensePct: 0, attackPct: 0, shield: 0 };
    const bp = typeof bundProdMult === 'function' ? bundProdMult(botId) : 1;     // Tempel-Bonus des Bündnisses
    return { troops: (1 + (b.skills.troops * SKILL_DEFS.troops.pct + botGearPct(b, 'weapon')) / 100) * titleMult(botId, 'troops') * bp,
             coins: (1 + botGearPct(b, 'boots') / 100) * titleMult(botId, 'coins') * bp * (AUF ? AUF.ertrag(botId) : 1),   // (+ Forschung Ertrag)
             armorPct: botGearPct(b, 'armor'),                                         // Rüstung: +% base defense, same rule as the player
             defensePct: b.skills.defense * SKILL_DEFS.defense.defPct,
             attackPct: b.skills.attack * SKILL_DEFS.attack.atkPct,
             shield: Math.min(90, botGearPct(b, 'shield')) };
}

function botGoldRate(botId, skill) { const b = loadBotState()[botId]; return b ? (b.skills[skill] || 0) * SKILL_DEFS[skill].rate : 0; }

function botAtkFactor(bot, noHero) {                      // what the bot expects its next attack to hit with (skill, its best free hero, title)
    return (1 + (botMults(bot.id).attackPct + (noHero ? 0 : botHeroAtk(bot.id))) / 100) * titleMult(bot.id, 'attack') * (AUF ? AUF.kampf(bot.id, 'a') : 1);   // (+ Truppen-Stufe, Forschung)
}

function botTickMs(botId) { const b = loadBotState()[botId]; return Math.max(400, 1000 - Math.min(b.skills.speed || 0, SKILL_DEFS.speed.max) * SKILL_DEFS.speed.msPerLevel); }

function botMarchMult(botId) { const b = loadBotState()[botId]; return (1 + Math.min(b.skills.speed || 0, SKILL_DEFS.speed.max) * 0.05) * (1 + botBld(botId, 'academy') * 0.02) * (AUF ? AUF.marschTempo(botId) : 1); }   // (+ Forschung Marschtempo)

function botBestRarity(botId) {
    const b = loadBotState()[botId]; let best = -1;
    for (const k of Object.keys(EQUIPMENT_DEFS)) { const it = botItem(b, k); if (it && it.rarity > best) best = it.rarity; }
    return best;
}

function addBotXp(botId, amount, gegner, eigene) {
    const b = loadBotState()[botId]; if (!b) return;
    amount = kampfEp(amount, b.lvl, gegner, eigene);                                                  // höchstens ¼ Stufe pro Kampf (wie bei dir)
    if (botById[botId] && botById[botId].mensch) { b.xpNeu = (b.xpNeu || 0) + amount; return; }   // echter Spieler: die EP gehen als Nachricht zu ihm
    b.xp += amount;
    while (b.xp >= xpNeededForLevel(b.lvl)) { b.xp -= xpNeededForLevel(b.lvl); b.lvl++; b.sp++; b.gems += 3; }
    botSpendSkills(botById[botId], b);
    saveBotState();
}

// Online in sessions, like people: everyone has their own day (asleep for about 7 hours, now and then up at night)
// and within the day comes and goes in 20-minute stretches at their own times - not all on the same clock.
function botOnline(bot, now) {
    if (bot.mensch) return !!(window.WELT && WELT.menschen[bot.id] && WELT.menschen[bot.id].online);   // echte Spieler: wirklich online?
    const h = botState && botState[bot.id] && botState[bot.id].handy;              // nach einer Angriffs-Meldung kurz in die App geschaut (botHandy)
    if (h && h.bis > 0 && now >= h.r && now < h.bis) return true;
    return botOnlinePlan(bot, now);
}
function botOnlinePlan(bot, now) {                                                // ihr gewohnter Tag (ohne Handy-Meldung)
    const st = BOT_STYLES[bot.style]; if (st.act >= 1) return true;
    const idn = parseInt(bot.id.slice(3), 10) || 0, hour = (now / 3600000 + (idn * 7.37) % 24) % 24;
    if (hour < 7) return mulberry32(Math.floor(now / 1200000) * 31 + idn * 977)() < .06;
    const off = (idn * 104729) % 1200000, blk = Math.floor((now + off) / 1200000), r = mulberry32(blk * 131 + idn * 7919)();
    return r < Math.min(.97, st.act * 1.15);
}

// Ring-Skins: about a third of them like a ring round their bases - always the same favourite, bought with gems or Thron-Punkte like the player
function botRingFav(botId) { const idn = parseInt(botId.slice(3), 10) || 0, r = mulberry32(idn * 613 + 29); return r() < .3 ? RING_SKINS[Math.floor(r() * RING_SKINS.length)] : null; }
function botRings(bot, b) {
    if (!b.ringMig) { let L = 0; for (const id of botOwnedIslands[bot.id] || []) L = Math.max(L, islandLevels[id] || 1);   // what they wore by level stays theirs as a skin (as for the player)
        b.rings = [...new Set([...(b.rings || []), ...(L >= 10 ? ['bronze'] : []), ...(L >= 25 ? ['silver'] : [])])]; b.ringMig = 1; }
    const fav = botRingFav(bot.id); if (!fav) return;
    if (fav.gems && !b.rings.includes(fav.id) && b.gems >= fav.gems * 2 && b.gems - fav.gems >= TELEPORT_GEMS) { b.gems -= fav.gems; b.rings.push(fav.id); }
    const wear = b.rings.includes(fav.id) ? fav.id : b.rings[b.rings.length - 1] || '';   // the favourite, until then the best they have
    if ((b.ring || '') !== wear) { b.ring = wear; ringVer++; requestRender(); }
}

function botShop(bot) {                                  // gems and points spent the way a player would: heroes, stars, crates, gear
    botThroneShop(bot.id);
    const b = loadBotState()[bot.id], slots = Object.keys(EQUIPMENT_DEFS);
    botRings(bot, b);
    botLookShop(bot, b);                                 // frame, title, Marsch-Skin
    botPassCare(bot, b);                                 // Saison-Pass: premium (some), rewards as they climb
    botHeroCare(bot);                                    // shards → unlock, stars, skill points
    const starCap = Math.min(STAR_MAX, botBld(bot.id, 'forge'));   // one star per visit on the best-worn piece
    for (const k of slots.filter(q => b.gear[q]).sort((x, y) => botGearPct(b, y) - botGearPct(b, x))) {   // the strongest piece first
        const g = b.gear[k]; if ((g.st || 0) < starCap && b.gems >= starGemCost(g.st || 0) * 1.5 && b.gems - starGemCost(g.st || 0) >= TELEPORT_GEMS) { b.gems -= starGemCost(g.st || 0); g.st = (g.st || 0) + 1; break; } }
    const user = botShieldUser(bot), want = user ? { 8: bot.style === 'builder' ? 2 : 1, 2: 1 } : { 2: bot.style === 'raider' ? 0 : 1 };   // a small stock of shields
    for (const h of [8, 2]) while ((b.shields[h] || 0) < (want[h] || 0) && b.gems >= SHIELD_PRICES[h] * 1.25 && b.gems - SHIELD_PRICES[h] >= TELEPORT_GEMS) { b.gems -= SHIELD_PRICES[h]; b.shields[h]++; }
    if (!b.city.builder2 && b.gems >= CITY_BUILDER2_GEMS * 1.5 && b.gems - CITY_BUILDER2_GEMS >= TELEPORT_GEMS + 100) { b.gems -= CITY_BUILDER2_GEMS; b.city.builder2 = true; }   // rich enough: the second builder, for good
    const reserve = TELEPORT_GEMS + Object.entries(want).reduce((s2, [h, n]) => s2 + Math.max(0, n - (b.shields[h] || 0)) * SHIELD_PRICES[h], 0);   // (and 50 for a capital move)
    for (let n = 0; n < 10 && b.gems - reserve >= CRATE_GEM_COST; n++) {   // crates: random slot + rarity
        b.gems -= CRATE_GEM_COST; b.spare[pickRandomSlot()][pickRandomRarity()]++;
    }
    for (const k of slots) {
        const c = b.spare[k];
        for (let r = 0; r < c.length - 1; r++) while (c[r] >= COMBINE_COUNT) { c[r] -= COMBINE_COUNT; c[r + 1]++; }   // 3 of a kind → 1 of the next
        let top = -1; for (let r = c.length - 1; r >= 0; r--) if (c[r] > 0) { top = r; break; }
        const worn = b.gear[k];
        const pctOf = (r, lvl, st) => itemScore({ rarity: r, level: lvl }) * RARITY_PCT_PER_SCORE * (1 + (st || 0) * STAR_PCT / 100);
        if (top >= 0 && (!worn || (top > worn.r && pctOf(top, 1, 0) > pctOf(worn.r, worn.lvl, worn.st)))) {   // really better: wear it, the old one is salvaged for points
            if (worn) { b.pts += itemScore({ rarity: worn.r, level: worn.lvl }); b.gems = (b.gems || 0) + starRefund({ stars: worn.st || 0 }); }   // (die Gems der Sterne zurück – wie bei dir beim Zerlegen)
            b.gear[k] = { r: top, lvl: 1, st: 0 }; c[top]--;
        }
        const w = b.gear[k]; if (w) for (let r = 0; r < Math.max(0, w.r - 1); r++) if (c[r] > 0) { b.pts += c[r] * itemScore({ rarity: r, level: 1 }); c[r] = 0; }   // far below: salvage
    }
    for (let guard = 0; guard < 60; guard++) {             // level up the lowest worn piece with the points
        let lo = null; for (const k of slots) { const g = b.gear[k]; if (g && g.lvl < ITEM_MAX_LEVEL && (!lo || g.lvl < lo.lvl)) lo = g; }
        if (!lo || b.pts < lo.lvl * 5) break; b.pts -= lo.lvl * 5; lo.lvl++;
    }
    saveBotState();
}

function botConsiderUpgrade(bot) {
    const owned = [...botOwnedIslands[bot.id]];
    if (owned.length === 0) return;
    const st = botStyle(bot);
    // bases like a person builds them: the cheapest step that's worth it comes first, so the whole empire grows,
    // not just two show-off bases. Throne, gates, Wächter, temples and the capital count extra.
    const cap = botCapitalOf(bot.id);
    const weight = id => { const isl = islandById[id]; return isl.type === 'megaTemple' ? .2 : isl.type === 'gate' || isl.guardian ? .4 : isl.type === 'temple' ? .5 : id === cap ? .6 : 1; };
    const cand = [];
    for (const id of owned) { if (id === cap) continue; const lvl = islandLevels[id] || 1; if (lvl < MAX_BASE_LEVEL) cand.push({ id, cost: upgradeCost(lvl), sc: upgradeCost(lvl) * weight(id) }); }   // (die Hauptstadt wächst mit der Burg, nicht mit Münzen)
    cand.sort((x, y) => x.sc - y.sc);
    let budget = botCoins[bot.id] * st.spend, did = 0;
    for (const c of cand) {
        if (did >= 25 || c.cost > budget) break;
        budget -= c.cost; botCoins[bot.id] -= c.cost; islandLevels[c.id] = (islandLevels[c.id] || 1) + 1; did++; evPunkte('bau', bot.id, 2 + islandLevels[c.id]);   // (Wochen-Event Bauherr)
    }
    if (did) saveGame();
}

// Big targets (gates, temples, Wächter, the throne) need more than one garrison: pull troops together first.
// Too strong for the armies at hand: pull troops from the bot's other bases into one staging base, strike later.
// ==============================================================================================================
//    Truppen zusammenziehen, Hauptstadt
// ==============================================================================================================
function botRally(bot, target, atId, need, maxHelpers) {
    if (pendingSends.some(sd => sd.senderBotId === bot.id && !sd.back)) return false;
    const at = islandById[atId], helpers = [];
    let pool = (islandTroops[atId] || 0) * .95;
    const thr = botThreatened(bot.id), own = [...botOwnedIslands[bot.id]].filter(id => id !== atId && id !== megaTempleId && !thr.has(id) && (islandTroops[id] || 0) > BOT_MIN_GARRISON_TO_ATTACK)
        .map(id => ({ id, isl: islandById[id] })).filter(h => h.isl.landmassId === at.landmassId || landmassesConnected(h.isl.landmassId, at.landmassId))
        .sort((u, v) => (islandTroops[v.id] || 0) - (islandTroops[u.id] || 0));
    const most = Math.max(maxHelpers ?? 8, BOT_STYLES[bot.style].gather || 8);
    for (const h of own) { if (pool >= need * 1.3 || helpers.length >= most) break; helpers.push(h.id); pool += (islandTroops[h.id] || 0) * .95; }
    if (pool < need * 1.1 || !helpers.length) return false;
    botActOf(bot.id).plan = { kind: 'send', t: atId, steps: helpers.map(id => ({ from: id })), until: Date.now() + 120000 };
    botPlanStep(bot);
    loadBotState()[bot.id].rally = { t: target.id, at: atId, until: Date.now() + 6 * 60000 };
    return true;
}

function botGather(bot) {
    if (pendingSends.some(s => s.senderBotId === bot.id && !s.back)) return false;
    const st = botStyle(bot), thr = botThreatened(bot.id), owned = [...botOwnedIslands[bot.id]].filter(id => !thr.has(id)), atk = botAtkFactor(bot, true), kennt = botKennt(bot.id);
    let plan = null;
    for (const sourceId of botSampleSources(owned)) {
        const source = islandById[sourceId];
        for (const lmId of reachableLandmassIds[source.landmassId]) {
            if (!landmassesConnected(source.landmassId, lmId) || !kennt.has(lmId)) continue;   // (Nebel)
            for (const target of islandsByLandmass[lmId] || []) {
                if (botOwnedIslands[bot.id].has(target.id) || isCapital(target.id) || baseShieldedFor(target.id, bot.id) || bundFreund(bot.id, islandOwnerOf(target.id))) continue;
                if (!(target.type === 'gate' || target.type === 'temple' || target.type === 'megaTemple')) continue;
                const need = (effectiveTroops(target) + effectiveDefense(target)) * st.margin / atk;
                const helpers = owned.filter(id => id !== sourceId && islandById[id].landmassId === source.landmassId && (islandTroops[id] || 0) > BOT_MIN_GARRISON_TO_ATTACK);
                const pool = (islandTroops[sourceId] || 0) + helpers.reduce((a, id) => a + (islandTroops[id] || 0) * .8, 0);
                if (pool < need) continue;
                const d = Math.hypot(target.x - source.x, target.y - source.y) * (target.type === 'megaTemple' ? .3 : target.guardian ? .5 : 1);
                if (!plan || d < plan.d) plan = { d, sourceId, helpers };
            }
        }
    }
    if (!plan) return false;
    for (const id of plan.helpers.sort((a, c) => (islandTroops[c] || 0) - (islandTroops[a] || 0)).slice(0, 1)) launchSend(id, plan.sourceId, bot.id);
    return true;
}

function botCapitalOf(botId) {                  // each bot's main base: its strongest tower at first - later moved like yours (botConsiderCapital)
    const b = loadBotState()[botId], own = botOwnedIslands[botId];
    if (!own || !own.size) return null;
    if (b.capital === undefined || b.capital === null || !own.has(b.capital) || islandById[b.capital].type !== 'tower') {   // die Hauptstadt ist immer ein Turm – nie ein Tor oder Tempel (wie bei dir)
        let best = null; for (const id of own) { const isl = islandById[id]; if (isl.type !== 'tower') continue;
            if (best === null || (islandLevels[id] || 1) > (islandLevels[best] || 1)) best = id; }
        if (best === null) return [...own][0];                              // gar kein Turm: heim zu irgendeiner eigenen Basis (Truppen gehen nie verloren) – als Hauptstadt zählt sie nicht (isCapital)
        b.capital = best; saveBotState(); capitalCache = null;
    }
    return b.capital;
}

function botSampleSources(owned, n) {                    // a person looks at their big armies and a few others, not at all 500 bases
    const [top, extra] = n || [10, 8], arr = [...owned], rich = arr.sort((a, c) => (islandTroops[c] || 0) - (islandTroops[a] || 0)).slice(0, top);
    for (let i = 0; i < extra && arr.length > top; i++) rich.push(arr[top + Math.floor(Math.random() * (arr.length - top))]);
    return [...new Set(rich)];
}

