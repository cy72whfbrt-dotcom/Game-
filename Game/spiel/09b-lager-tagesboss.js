// Teil 09b-lager-tagesboss.js: Barbaren-Lager und Tagesboss
// ===== BARBAREN-LAGER + TAGESBOSS: camps (Stufe 1-25) out on the land and one boss a day with a big pool of life for everyone.
// A camp of level N only after N-1 (level 1 always), 20 camp wins a day (reset at midnight) - the same for you and every other player.
const BARB_MAX_L = 25, BARB_DAY = 20, BARB_WANT = 110, DBOSS_HITS = 10, DBOSS_CAP = .05;   // camps on the map · a boss hit takes at most 5 % of its life
const barbTroopsOf = L => niceRound(500 * Math.pow(1.42, L - 1));                         // 7.10. (rokzahlen): 500 at 1, 1.400 at 4, 12.000 at 10, 2,3 Mio. at 25 – Stufe 1 ≈ 10 % der Start-Armee
const barbLootOf = L => niceRound(barbTroopsOf(L) * 20 + 5000 * L);                          // Münzen für einen Sieg (+ Angriff: Münzen je Krieger): 15.000 at 1, 290.000 at 10, 46 Mio. at 25
const barbTier = L => L >= 21 ? 4 : L >= 15 ? 3 : L >= 8 ? 2 : 1;                         // badge colour like the gear rarities
const DBOSS_KINDS = [{ k: 'kraken', name: 'Kraken Thalor', col: '#3fb0c4' }, { k: 'giant', name: 'Steinriese Gorm', col: '#b39b72' }, { k: 'dragon', name: 'Feuerdrache Ignar', col: '#ee6a34' }, { k: 'wraith', name: 'Nebelkönig Morvan', col: '#9d86ea' }];
// Tagesboss (Merkliste 33): JE Angriff die Belohnung seiner Schadens-Klasse (zweimal dieselbe = zweimal), fällt er: alle, die trafen, noch etwas
// Klassen als Anteil vom Boss-Leben (7.10.): ein Angriff nimmt höchstens 5 % (DBOSS_CAP) – so ist jede Klasse bei jedem Boss erreichbar
const DBOSS_KLASSEN = [{ bis: .0005, mh: 1, t: 'bis 0,05 %' }, { bis: .005, mh: 2, t: '0,05 – 0,5 %' }, { bis: .01, mh: 3, sh: 1, t: '0,5 – 1 %' },
    { bis: .025, gems: 5, sh: 1, th: 1, crate: 0, t: '1 – 2,5 %' }, { bis: Infinity, gems: 10, sh: 2, th: 2, crate: 1, t: 'über 2,5 %' }], DBOSS_FALL = { gems: 20, sh: 5 };
const evTagesEnde = () => Date.now() + msToMidnight();   // Tagesboss/Lager: bis Mitternacht nur im Event abholbar
const dbossKlasse = (dmg, max) => DBOSS_KLASSEN.findIndex(k => dmg <= k.bis * max + 1e-9);
function dbossKlasseZahlen(b, who, dmg) {           // (nur wer rechnet) ein Angriff: Zähler je Klasse, Belohnung ins Abholfach – Schlüssel je Angriff
    const i = dbossKlasse(dmg, b.max), kl = (b.kl || (b.kl = {}))[who] || (b.kl[who] = DBOSS_KLASSEN.map(() => 0)), n = kl.reduce((a, x) => a + x, 0);
    kl[i]++; evPreis(who, 'boss', b.name + ' · Klasse ' + (i + 1), DBOSS_KLASSEN[i], b.d + '|' + n, evTagesEnde()); return i;
}
// Barbaren-Lager (Merkliste 33): jede Stufe 1–25 bringt einmal am Tag eine Belohnung (jeden Tag neu)
function lagerPreis(L) {
    const gross = { 5: { gems: 10, crate: 0 }, 10: { gems: 20, crate: 1, sh: 5 }, 15: { gems: 30, crate: 2, sh: 10 }, 20: { gems: 50, crate: 2, sh: 15 }, 25: { gems: 100, crate: 3, sh: 30 } }[L];
    if (gross) return gross; if (L < 5) return { mh: 1 };
    const [m, t] = L < 10 ? [2, 1] : L < 15 ? [3, 2] : L < 20 ? [4, 3] : [6, 4], p = (L - 1) % 5 % 2 ? { th: t } : { mh: m };   // abwechselnd Münzen / Truppen
    if (L > 20) p.sh = 2; return p;
}
const LAGER_LEISTE = Array.from({ length: BARB_MAX_L }, (_, i) => Object.assign({ ab: i + 1 }, lagerPreis(i + 1)));
function lagerStufeZahlen(who, L) {                 // (nur wer rechnet) Lager Stufe L besiegt: heute zum ersten Mal → Belohnung
    const r = barbRec(who), bit = 1 << (L - 1); if (L < 1 || L > BARB_MAX_L || (r.s & bit)) return false;
    r.s = (r.s || 0) | bit; evPreis(who, 'lager', 'Barbaren-Lager Stufe ' + L, LAGER_LEISTE[L - 1], r.d + '|' + L, evTagesEnde()); return true;
}
const barbLoad = (k, d) => { try { return JSON.parse(store.get(k)) || d; } catch (e) { return d; } };
let barbState = barbLoad('openWaterBarb', { camps: [], n: 0, next: 0 }), barbMarches = barbLoad('openWaterBarbMarches', []), barbWho = barbLoad('openWaterBarbWho', {}), dayBoss = barbLoad('openWaterDayBoss', null), barbSaveAt = 0;
function saveBarb(now) { if (now && now - barbSaveAt < 5000) return; barbSaveAt = now || Date.now();
    store.set('openWaterBarb', JSON.stringify(barbState)); store.set('openWaterBarbMarches', JSON.stringify(barbMarches)); store.set('openWaterBarbWho', JSON.stringify(barbWho)); store.set('openWaterDayBoss', JSON.stringify(dayBoss)); }
window.addEventListener('pagehide', () => saveBarb()); document.addEventListener('visibilitychange', () => { if (document.hidden) saveBarb(); });
const barbCampById = id => barbState.camps.find(c => c.id === id);
function barbRec(who) { const r = barbWho[who] || (barbWho[who] = { b: 0, d: '', n: 0, h: 0, s: 0 }), d = todayKey(); if (r.d !== d) { r.d = d; r.n = 0; r.h = 0; r.s = 0; } return r; }   // b: best level beaten · n: camp wins today · h: boss hits today · s: Lager-Stufen heute (Bits, Belohnung)
const barbOut = (who, k) => barbMarches.filter(m => m.who === who && !m.back && m.k === (k || 'c')).length;
const barbLeft = who => Math.max(0, barbTagMax() - barbRec(who).n - barbOut(who));
const barbOpenFor = (who, L) => L <= barbRec(who).b + 1;
const barbPt = o => ({ id: 'barb' + (o.id || o.tid || 'b'), x: o.x, y: o.y, landmassId: o.lm, radius: ISLAND_RADIUS * .6 });
const barbFa = who => (1 + fieldAtkPct(who) / 100) * titleMult(who, 'attack') * (AUF ? AUF.kampf(who, 'a') : 1);
const BARB_LMS = landmasses.filter(l => l.zone <= 4);   // Zone 1–4 (die Mitte nicht)
const barbStufeZone = (z, r) => Math.min(BARB_MAX_L, 1 + (z - 1) * 6 + Math.floor(r() * (z === 4 ? 7 : 6)));   // Stufe nach der Zone (wie die Karten-Testdatei): 1–6 außen … 19–25 in Zone 4
function barbSpot(lm, r, edge) {                    // a free place on the land: clear of bases, fields, other camps and the boss (edge: room to the shore)
    const e = ISLAND_RADIUS * (edge || 1);
    for (let t = 0; t < 30; t++) {
        const x = lm.x + (r() * 2 - 1) * lm.shapeMaxR * .85, y = lm.y + (r() * 2 - 1) * lm.shapeMaxR * .85;
        if (!aufLand(lm, x, y) || [[e, 0], [-e, 0], [0, e], [0, -e]].some(([dx, dy]) => !aufLand(lm, x + dx, y + dy)) || (islandsByLandmass[lm.id] || []).some(i => Math.hypot(i.x - x, i.y - y) < ISLAND_RADIUS * 3)) continue;
        if (resFields.some(f => f.landmassId === lm.id && Math.hypot(f.x - x, f.y - y) < ISLAND_RADIUS * 2.2) || barbState.camps.some(c => Math.hypot(c.x - x, c.y - y) < ISLAND_RADIUS * 3)) continue;
        if (dayBoss && Math.hypot(dayBoss.x - x, dayBoss.y - y) < ISLAND_RADIUS * 5) continue;
        if (grenzAbstand(x, y) < KETTE_FREI) continue;                                // nicht ins Grenzgebirge
        return { x, y };
    }
    return null;
}
function barbSpawn() {                              // a third near you, 40 % near someone else, the rest anywhere – die Stufe kommt aus der Zone des Lagers
    const r = Math.random(), who = r < .3 ? 'player' : r < .7 ? BOT_DEFS[Math.floor(Math.random() * BOT_DEFS.length)].id : null, own = who && (who === 'player' ? ownedIslands : botOwnedIslands[who]);
    let lm = null;
    if (own && own.size) { const ids = [...own], b = islandById[ids[Math.floor(Math.random() * ids.length)]];
        if (b) { const rs = (reachableLandmassIds[b.landmassId] || [b.landmassId]).filter(l => l === b.landmassId || landmassesConnected(b.landmassId, l)); lm = landmasses[rs[Math.floor(Math.random() * rs.length)]]; } }
    if (!lm || lm.zone > 4) lm = BARB_LMS[Math.floor(Math.random() * BARB_LMS.length)];
    const p = barbSpot(lm, Math.random); if (!p) return false;
    const L = barbStufeZone(lm.zone, Math.random), t = barbTroopsOf(L); barbState.camps.push({ id: 'c' + (barbState.n++), x: Math.round(p.x), y: Math.round(p.y), lm: lm.id, L, t, max: t, until: Date.now() + (3 + Math.random() * 3) * 36e5 }); return true;   // moves on after 3-6 h
}
function dbossEnsure() {                            // today's boss: the kind turns every day, the place is the same for everyone today
    const d = todayKey(); if (dayBoss && dayBoss.d === d) return dayBoss;
    const now = new Date(), n = Math.round(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime() / 864e5), K = DBOSS_KINDS[n % DBOSS_KINDS.length], r = mulberry32(n * 7919 + 13);
    const lms = BARB_LMS.filter(l => l.ring <= 3); let p = null, lm = null;
    for (let t = 0; t < 20 && !p; t++) { lm = lms[Math.floor(r() * lms.length)]; p = barbSpot(lm, r, 3.5); }
    if (!p) p = { x: lm.x, y: lm.y };
    let pool = 0; for (const bot of BOT_DEFS) { let big = 0; for (const id of botOwnedIslands[bot.id] || []) big = Math.max(big, islandTroops[id] || 0); pool += big * .25 * DBOSS_HITS * barbFa(bot.id); }
    const hp = niceRound(Math.max(saisonAnfang() ? DBOSS_MIN_ANFANG : wirtK(5e7), pool * .8)), had = !!dayBoss;   // life: about 80 % of what everyone's strikes (× their Angriff) can take in a day - it falls in the evening
    dayBoss = { d, k: K.k, name: K.name, x: Math.round(p.x), y: Math.round(p.y), lm: lm.id, hp, max: hp, dmg: {}, fell: 0 };
    saveBarb(); if (had) flashHint('Neuer Tagesboss: ' + K.name + ' ist erschienen!', 5000);
    return dayBoss;
}
// Neue Welt-Saison (09f saisonAnfang): in den ersten 3 Tagen haben alle nur Start-Truppen – die Untergrenze so, dass 8 Spieler mit je
// 10 Angriffen aus einem Viertel ihrer Start-Truppen ihn schaffen (sonst 5e7 × WIRTSCHAFT_KOSTEN = 27.778). Start-Truppen 5.000
// (Alexander 6.10.) → 100.000 Leben (sonst fiele er am ersten Tag mit einem Angriff)
const DBOSS_MIN_ANFANG = 8 * DBOSS_HITS * PLAYER_START_TROOPS * .25;
const DBOSS_GONE = 5 * 60000;                          // a fallen boss leaves the map 5 min after it fell
let dbossOffen = '';                                // (Tagesboss: einmal am Tag seinen Platz aufdecken – er ist für alle angekündigt, wie Drache und Kriegsherr)
function dbossOnMap(now) { const b = dayBoss, da = b && b.d === todayKey() && (b.hp > 0 || (now || Date.now()) - (b.fell || 0) < DBOSS_GONE) ? b : null;
    if (da && !SYSTEM && dbossOffen !== da.d + ':' + da.x) { dbossOffen = da.d + ':' + da.x; try { revealAround(da.x, da.y, 3400, true); } catch (e) {} }
    return da; }   // today's boss while it stands (and a little after)   // today's boss while it stands (and a little after)
// Zurückrufen und Beschleunigen auch hier (wie Angriff/Senden): hin = Zurück + Schneller, heim = nur Schneller
function eigeneFeldBarb(who) { try { const w = who || 'player'; return barbMarches.filter(m => m.who === w).concat(fieldMarches.filter(m => m.who === w)); } catch (e) { return []; } }
const feldBarbMarsch = (who, key) => eigeneFeldBarb(who).find(m => marchKeyOf(m) === key);
function feldBarbSpeichern() { try { saveBarb(); saveFields(); } catch (e) {} }
function marschUmkehren(m, now) {                     // ein Marsch zu Lager/Boss/Drache/Armee/Feld kehrt um, wo er gerade ist – zurück so lange, wie er schon lief
    if (m.back) return false;
    const istBarb = barbMarches.includes(m), liste = istBarb ? barbMarches : fieldMarches, i = liste.indexOf(m); if (i < 0) return false;
    const home = islandById[m.homeId], ziel = istBarb ? barbPt(m) : fieldById[m.fieldId];
    const frac = Math.max(0, Math.min(1, (now - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt))), walked = Math.max(1000, Math.min(now, m.resolveAt) - m.startedAt);
    let hier = null; try { if (home && ziel) { const p = pathSoFar(home, ziel, frac); hier = p[p.length - 1]; } } catch (e) {}
    const lmH = hier && typeof landmassAtWorld === 'function' ? landmassAtWorld(hier.x, hier.y) : null;
    liste.splice(i, 1);
    const c = Object.assign({}, m, { startedAt: now, resolveAt: now + walked, back: true }); delete c.mid;
    if (istBarb) {
        if (m.k === 'b' && m.d === todayKey()) { const r = barbRec(m.who); r.h = Math.max(0, r.h - 1); }   // der Angriff zählt nicht (kam nie an) – nur für heute
        if (m.k === 'd') { const dr = drAktiv(); if (dr && dr.hits[m.who]) { dr.hits[m.who]--; evDirty = true; } }
        if (hier) { c.x = Math.round(hier.x); c.y = Math.round(hier.y); if (lmH) c.lm = lmH.id; }
    } else { c.load = 0; if (hier) { c.vx = Math.round(hier.x); c.vy = Math.round(hier.y); c.vlm = lmH ? lmH.id : (ziel && ziel.landmassId); } }
    liste.push(c); feldBarbSpeichern(); return true;
}
function barbMine() { try { return barbMarches.filter(m => m.who === 'player'); } catch (e) { return []; } }   // your columns (for the Kampf list - may run before this part loads)
const dbossKind = b => DBOSS_KINDS.find(K => K.k === b.k) || DBOSS_KINDS[0];
const dbossRanks = b => Object.entries(b.dmg || {}).sort((x, y) => y[1] - x[1]);
function barbSend(who, homeId, k, tid, troops, hero, hero2) {  // troops leave a base for a camp (k 'c'), the boss (k 'b'), the Drache (k 'd') or a Barbaren-Armee of the Invasion (k 'i') - a hero may lead them
    const home = islandById[homeId], dr = k === 'd' ? drAktiv() : null, ia = k === 'i' ? invArmee(tid) : null;
    const t = k === 'b' ? dbossEnsure() : k === 'd' ? dr : k === 'i' ? (ia && invTreffpunkt(ia, homeId, who)) : barbCampById(tid); troops = Math.floor(troops); if (!home || !t || troops < 1) return false;
    if (!marschPlatz(who)) return false;                                                      // Marsch-Plätze (Paket D)
    if (k === 'd' && (dr.hits[who] || 0) >= DR_HITS) return false;
    if (k === 'i') { t.name = 'Barbaren-Armee'; t.lm = t.lm !== undefined ? t.lm : ia.lm; }
    if (hero && (!heroOwned(who, hero) || heroBusy(who, hero))) hero = null; hero2 = heroZweitOk(who, hero, hero2); const mx = heroMarchFx(who, hero, false, hero2), now = Date.now();
    islandTroops[homeId] = Math.max(0, (islandTroops[homeId] || 0) - troops);
    barbMarches.push({ who, homeId, k, tid: k === 'b' || k === 'd' ? null : tid, d: k === 'b' ? t.d : k === 'd' ? t.start : null, L: t.L, name: t.name, x: Math.round(t.x), y: Math.round(t.y), lm: t.lm, troops, hero: hero || null, hero2, startedAt: now,
        resolveAt: now + travelDurationSeconds(home, barbPt(t), who === 'player' ? undefined : who) / (1 + (mx ? mx.spd : 0) / 100) * 1000, back: false });
    if (k === 'b') barbRec(who).h++;
    if (k === 'd') { dr.hits[who] = (dr.hits[who] || 0) + 1; evDirty = true; barbMarches[barbMarches.length - 1].voll = troops >= DR_ANTEIL * (evTruppenAlle(who) + troops); }   // (Drache: zählt als Treffer mit mind. 10 % aller Truppen)
    if (k !== 'c') goalBump(who, 'q' + k);                                                     // Tagesaufgaben + Saison-Pass: Angriff auf Tagesboss (qb), Drache (qd), Barbaren-Armee (qi)
    saveBarb(); if (who === 'player') { sfx('send'); updateHud(); saveGame(); } requestRender(); return true;
}
function barbHome(m, n, now) { if (n < 1) return; const home = islandById[m.homeId] || islandById[playerIslandId]; if (!home) return;   // the survivors walk home
    barbMarches.push({ who: m.who, homeId: m.homeId, k: m.k, tid: m.tid, d: m.d, L: m.L, name: m.name, x: m.x, y: m.y, lm: m.lm, troops: Math.floor(n), hero: m.hero, hero2: m.hero2 || null, startedAt: now, resolveAt: now + travelDurationSeconds(home, barbPt(m), m.who === 'player' ? undefined : m.who) * 1000, back: true }); }
function barbCrate(who, minR) {                     // a gear crate: yours into the inventory, theirs into their spares
    const r = Math.max(minR, pickRandomRarity());
    if (who === 'player') return grantFreeCrate(r);
    if (botById[who] && botById[who].mensch && window.WELT) { WELT.nachricht(parseInt(who.slice(1), 10), { art: 'evPreis', src: 'fight', title: 'Kiste aus dem Kampf', gems: 0, sh: 0, crate: minR }); return null; }   // ein echter Spieler: ins Abholfach (vorher ging sie verloren)
    const bs = loadBotState()[who], sp = bs && bs.spare && bs.spare[pickRandomSlot()]; if (sp) sp[r] = (sp[r] || 0) + 1; return null;
}
function barbFight(who, troops, hx, foes) {         // out in the open: (troops + Gefolge) × Angriff (+ hero) × title against the camp, your shield (+ hero) saves some
    const h = hx || HX0, fa = (1 + (fieldAtkPct(who) + h.atk) / 100) * titleMult(who, 'attack') * (AUF ? AUF.kampf(who, 'a') : 1), SA = (troops + heroGefOf(h, troops)) * fa, won = SA > foes;
    const sh = Math.min(90, fieldShield(who) + h.loss), loss = won ? Math.min(troops, Math.round(foes / fa * (1 - sh / 100))) : troops;
    return { won, SA: Math.round(SA), loss, kill: won ? foes : Math.min(foes, Math.round(SA)), gef: heroGefOf(h, troops), fa, sh };
}
function barbArrive(m, now) {
    const who = m.who, isP = who === 'player';
    if (m.back) {                                    // home again
        const own = isP ? ownedIslands : botOwnedIslands[who], baseId = own && own.has(m.homeId) ? m.homeId : isP ? rewardBaseId() : own && [...own][0];
        if (baseId !== undefined && baseId !== null) islandTroops[baseId] = (islandTroops[baseId] || 0) + m.troops;
        if (isP) { updateHud(); saveGame(); } return;
    }
    if (m.k === 'b') return dbossHit(m, now);
    if (m.k === 'i') return invTreffer(m, now);                                     // Events: Barbaren-Invasion, Drache
    if (m.k === 'd') return drTreffer(m, now);
    const c = barbCampById(m.tid), rec = barbRec(who);
    if (!c || rec.n >= barbTagMax()) { barbHome(m, m.troops, now); if (isP) flashHint(c ? 'Für heute genug Lager: ' + barbTagMax() + ' / ' + barbTagMax() + ' heute.' : 'Das Lager ist schon geräumt – deine Truppen kehren um.', 3500); return; }
    const hx = heroFieldFx(who, m.hero, {}, m.hero2), before = c.t, fb = barbFight(who, m.troops, hx, c.t), wounded = fieldHurt(who, fb.loss, hx), best0 = rec.b;   // the leader: a full rage fires now, every fight fills it
    let gold = 0, item = null, sh = null, shN = 1 + Math.floor(c.L / 5), kGold = 0;
    if (fb.won) {
        barbState.camps = barbState.camps.filter(x => x !== c); rec.n++; rec.b = Math.max(rec.b, c.L); goalBump(who, 'barb'); goalBump(who, 'lager'); lagerStufeZahlen(who, c.L);   // (lager: nur Lager – barb zählt auch Invasions-Armeen)
        kGold = Math.round(fb.kill * killGoldRate(who, hx)); gold = payGold(who, barbLootOf(c.L) + kGold);
        if (Math.random() < .1 + c.L * .015) item = isP ? (inboxAdd({ src: 'fight', crate: Math.floor(c.L / 8) }), { box: Math.floor(c.L / 8) }) : (barbCrate(who, Math.floor(c.L / 8)), { box: Math.floor(c.L / 8) });   // (für den Bericht)   // yours wait in the Abholfach
        if (Math.random() < .15 + c.L * .01) sh = isP ? (inboxAdd({ src: 'fight', sh: shN }), { name: '' }) : heroGrantShards(who, shN);
        barbHome(m, m.troops - fb.loss, now);
    } else c.t = Math.max(1, Math.round(c.t - fb.kill));
    evPunkte('krieg', who, fb.kill / WO_KILL_PER);                                // Krieger-Woche
    const mensch = !isP && window.WELT && botById[who] && botById[who].mensch;     // ein echter Spieler (Weltrechner): sein Bericht kommt als Nachricht
    if (!isP && !mensch) return;
    const it = item && item.box !== undefined ? 'Kiste (mind. ' + RARITY_DEFS[item.box].label + ')' : '';
    const barbE = { type: 'barb', L: c.L, won: fb.won, atk: fb.SA, def: before, left: fb.won ? 0 : c.t, kill: fb.kill, troops: m.troops, gef: fb.gef, shPct: fb.sh, loss: fb.loss, wounded, gold, kGold, crate: it, sh: sh ? shN + ' Helden-Splitter' : '',
        n: rec.n, open: Math.min(BARB_MAX_L, rec.b + 1), up: rec.b > best0 && rec.b < BARB_MAX_L, sourceId: m.homeId, attacker: 'Du', hA: heroTag(hx), hx: heroReportOf(hx) };
    if (mensch) { evBericht(who, barbE, fb.won ? 'Barbaren-Lager Stufe ' + c.L + ' besiegt: +' + fmtCompact(gold) + ' Münzen.' : 'Das Lager hat standgehalten – es hat jetzt noch ' + fmtCompact(c.t) + ' Krieger.'); return; }
    addCombatLogEntry(barbE);
    spawnBattleFx({ x: c.x, y: c.y }, fb.won, fb.won ? 'Lager besiegt' : 'Abgewehrt', fb.won ? 'Stufe ' + c.L + ' · ' + rec.n + ' / ' + barbTagMax() + ' heute' : '−' + fmtCompact(fb.loss) + ' Truppen');
    flashHint(fb.won ? 'Barbaren-Lager Stufe ' + c.L + ' besiegt: +' + fmtCompact(gold) + ' Münzen' + (it ? ', Kiste: ' + it : '') + (sh ? ', ' + shN + ' Splitter' : '') + ' – abholen unter Events.' : 'Das Lager hat standgehalten – es hat jetzt noch ' + fmtCompact(c.t) + ' Krieger.', 4500);
    updateHud(); saveGame(); saveProgression(); barbSheetRefresh();
}
function dbossHit(m, now) {                         // every attack takes life off the boss (at most 5 %); a quarter of those who struck fall (Krankenhaus as usual), the rest come home
    const b = dayBoss, who = m.who, isP = who === 'player';
    if (!b || b.d !== m.d || b.d !== todayKey() || b.hp <= 0) { barbHome(m, m.troops, now); if (isP) flashHint('Der Tagesboss ist schon gefallen – deine Truppen kehren um.', 3500); return; }
    const hx = heroFieldFx(who, m.hero, {}, m.hero2), h = hx || HX0, fa = (1 + (fieldAtkPct(who) + h.atk) / 100) * titleMult(who, 'attack') * (AUF ? AUF.kampf(who, 'a') : 1);
    const dmg = Math.max(1, Math.min(b.hp, Math.round((m.troops + heroGefOf(h, m.troops)) * fa), Math.round(b.max * DBOSS_CAP)));
    const used = Math.min(m.troops, dmg / fa), loss = Math.min(m.troops, Math.round(used * .25 * (1 - Math.min(90, fieldShield(who) + h.loss) / 100))), wounded = fieldHurt(who, loss, hx);   // a quarter of those who struck
    const hp0 = b.hp; b.hp -= dmg; b.dmg[who] = (b.dmg[who] || 0) + dmg; const kl = dbossKlasse(dmg, b.max); dbossKlasseZahlen(b, who, dmg); evPunkte('boss', who, 30 * dmg / (b.max * DBOSS_CAP));   // Boss-Jagd
    const gold = payGold(who, dmg * .3 * WIRTSCHAFT_KOSTEN * MUENZ_FAKTOR * (1 + h.gold / 100));   // (Gold je Schaden wie das Kampf-Gold)
    barbHome(m, m.troops - loss, now);
    if (isP) {
        const rk = dbossRanks(b), gef = heroGefOf(h, m.troops);
        addCombatLogEntry({ type: 'dboss', name: b.name, dmg, loss, wounded, gold, left: Math.max(0, b.hp), max: b.max, hp0, troops: m.troops, gef, atk: Math.round((m.troops + gef) * fa), capped: dmg >= Math.round(b.max * DBOSS_CAP),
            total: b.dmg.player, rank: rk.findIndex(e => e[0] === 'player') + 1, of: rk.length, hits: barbRec('player').h, sourceId: m.homeId, attacker: 'Du', hA: heroTag(hx), hx: heroReportOf(hx) });
        spawnBattleFx({ x: b.x, y: b.y }, true, 'Treffer', '−' + fmtCompact(dmg) + ' Leben');
        flashHint('Treffer bei ' + b.name + ': ' + fmtCompact(dmg) + ' Schaden (Klasse ' + (kl + 1) + '), +' + fmtCompact(gold) + ' Münzen – Belohnung unter Events.', 3500); updateHud(); saveGame();
    } else if (window.WELT && botById[who] && botById[who].mensch) {    // ein echter Spieler (Weltrechner): derselbe Bericht als Nachricht
        const rk = dbossRanks(b), gef = heroGefOf(h, m.troops);
        evBericht(who, { type: 'dboss', name: b.name, dmg, loss, wounded, gold, left: Math.max(0, b.hp), max: b.max, hp0, troops: m.troops, gef, atk: Math.round((m.troops + gef) * fa), capped: dmg >= Math.round(b.max * DBOSS_CAP),
            total: b.dmg[who], rank: rk.findIndex(e => e[0] === who) + 1, of: rk.length, hits: barbRec(who).h, sourceId: m.homeId, attacker: 'Du', hA: heroTag(hx), hx: heroReportOf(hx) },
            'Treffer bei ' + b.name + ': ' + fmtCompact(dmg) + ' Schaden (Klasse ' + (kl + 1) + '), +' + fmtCompact(gold) + ' Münzen – Belohnung unter Events.');
    }
    if (b.hp <= 0) { b.hp = 0; b.fell = now; dbossPayout(b); }
    if (isP || barbView && barbView.kind !== 'camp') barbSheetRefresh();
}
function dbossPayout(b) {                           // the boss falls: everyone who hit it gets the same prize (keine Platz-Preise mehr – Merkliste 33)
    const rk = dbossRanks(b), p = DBOSS_FALL, beute = { gems: p.gems, crate: '', sh: p.sh + ' Helden-Splitter' };
    rk.forEach(([who], i) => { goalBump(who, 'dboss'); evPreis(who, 'boss', b.name + ' gefallen', p, b.d + '|fall', evTagesEnde());
        const e = Object.assign({ type: 'dbossWin', name: b.name, rank: i + 1, of: rk.length, dmg: b.dmg[who] || 0 }, beute), t = b.name + ' ist gefallen! Deine Belohnung wartet im Tagesboss-Reiter.';
        if (who === 'player') { addCombatLogEntry(e); flashHint(t, 5000); }
        else if (botById[who] && botById[who].mensch) evBericht(who, e, t); });
    saveBotState();
    spawnBattleFx({ x: b.x, y: b.y }, true, b.name + ' gefallen', rk.length + ' Kämpfer belohnt');
    if (!b.dmg.player) flashHint(b.name + ' ist gefallen! ' + rk.length + ' Kämpfer werden belohnt.', 5000);
    saveBarb();
}
function barbTick() {
    const now = Date.now(), due = rechnet() ? barbMarches.filter(m => m.resolveAt <= now) : []; if (rechnet()) dbossEnsure();   // after midnight: the new boss first
    if (due.length) { barbMarches = barbMarches.filter(m => m.resolveAt > now); for (const m of due) barbArrive(m, now); saveBarb(); requestRender(); }
    if (now >= (barbState.next || 0) && rechnet()) {                 // new camps every 10 s (an empty map fills at once)
        barbState.next = now + 10000; let k = barbState.camps.length < BARB_WANT * .5 ? BARB_WANT : 2;
        if (barbState.camps.some(c => c.until < now)) { const aim = new Set(barbMarches.map(m => m.tid)); barbState.camps = barbState.camps.filter(c => !(c.until < now) || aim.has(c.id)); }   // old camps move on (unless someone is on the way)
        while (k-- > 0 && barbState.camps.length < BARB_WANT) barbSpawn();
        dbossEnsure(); saveBarb(now); requestRender();
    }
    for (const el of document.querySelectorAll('[data-bclock]')) el.textContent = fmtDHMS(msToMidnight() / 1000);
}
setInterval(barbTick, 1000);
// drawing: small tents with a level badge, the boss with its life bar, your columns like any march, the others' as thin lines
const barbPathMem = new WeakMap(), barbSprites = {};
function barbScreen(o) { const z = mapState.zoom; return { x: o.x * z + mapState.offsetX, y: o.y * z + mapState.offsetY }; }
const barbK = () => Math.max(.6, Math.min(2.2, mapState.zoom / .012));
function barbAt(sx, sy) {                           // → { kind: 'boss' } or { kind: 'camp', id } under a tap (or the Drache / a Barbaren-Armee)
    const ev = evAt(sx, sy); if (ev) return ev;
    const z = mapState.zoom, k = barbK(), b = dbossOnMap();
    if (b && z >= .0025 && isCellOpen(b.x, b.y)) { const s = barbScreen(b); if (Math.hypot(s.x - sx, s.y - sy - 10 * k) < Math.max(22, 26 * k)) return { kind: 'boss' }; }
    if (z < .004) return null;
    let best = null, bd = Math.max(16, 15 * k);
    for (const c of barbState.camps) { if (!isCellOpen(c.x, c.y)) continue; const s = barbScreen(c), d = Math.hypot(s.x - sx, s.y - sy + 4 * k); if (d < bd) { bd = d; best = c; } }
    return best ? { kind: 'camp', id: best.id } : null;
}
function barbAlong(pts, q) {                        // the point q (0-1) along a screen polyline
    let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(l); tot += l; }
    let d = tot * q; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const f = seg[i] ? Math.min(1, d / seg[i]) : 0; return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f }; } d -= seg[i]; }
    return pts[0];
}
function dbossSprite(kind, col) {                   // each boss drawn once into a small image
    if (barbSprites[kind]) return barbSprites[kind];
    const cv = document.createElement('canvas'); cv.width = cv.height = 120; const g = cv.getContext('2d'); g.translate(60, 70);
    const dark = '#1b1418', eye = kind === 'wraith' ? '#bff3ff' : '#ffd24a';
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 36, 40, 10, 0, 0, 7); g.fill();
    g.lineWidth = 2.5; g.strokeStyle = dark; g.fillStyle = col;
    if (kind === 'kraken') {                          // a dome head with tentacles curling out of the ground
        g.beginPath(); g.ellipse(0, -6, 24, 30, 0, Math.PI, 0); g.lineTo(24, 16); g.quadraticCurveTo(0, 26, -24, 16); g.closePath(); g.fill(); g.stroke();
        for (let i = -3; i <= 3; i++) { if (!i) continue; const s = Math.sign(i), a = Math.abs(i); g.beginPath(); g.moveTo(i * 6, 18); g.bezierCurveTo(i * 10, 34, s * (22 + a * 10), 38, s * (26 + a * 8), 20 - a * 6);   // tentacles curling out in front
            g.lineWidth = 7; g.strokeStyle = dark; g.stroke(); g.lineWidth = 4.5; g.strokeStyle = col; g.stroke(); }
        g.lineWidth = 2.5; g.strokeStyle = dark;
    } else if (kind === 'giant') {                    // a hulk of stone with fists
        g.beginPath(); g.moveTo(-30, 34); g.lineTo(-34, -6); g.lineTo(-18, -26); g.lineTo(18, -26); g.lineTo(34, -6); g.lineTo(30, 34); g.closePath(); g.fill(); g.stroke();
        for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 38, 18, 11, 0, 7); g.fill(); g.stroke(); }
        g.beginPath(); g.arc(0, -30, 14, 0, 7); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.moveTo(-14, -6); g.lineTo(-4, 8); g.lineTo(-12, 22); g.moveTo(12, 0); g.lineTo(20, 16); g.stroke();
    } else if (kind === 'dragon') {                   // wings up, a long neck and a horned head
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 50, -34); g.lineTo(s * 40, -8); g.lineTo(s * 52, -2); g.lineTo(s * 30, 14); g.closePath(); g.fillStyle = col; g.fill(); g.stroke(); }
        g.fillStyle = col; g.beginPath(); g.ellipse(0, 16, 20, 18, 0, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(-6, 4); g.quadraticCurveTo(-4, -22, 4, -34); g.lineTo(18, -30); g.lineTo(10, -22); g.quadraticCurveTo(6, -8, 8, 4); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#f2e6c8'; g.beginPath(); g.moveTo(2, -34); g.lineTo(-4, -44); g.lineTo(8, -35); g.fill();
    } else {                                          // a hooded shade in torn robes
        g.beginPath(); g.moveTo(0, -40); g.quadraticCurveTo(28, -34, 30, 34); g.lineTo(18, 26); g.lineTo(8, 36); g.lineTo(-4, 26); g.lineTo(-16, 36); g.lineTo(-30, 34); g.quadraticCurveTo(-28, -34, 0, -40); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = dark; g.beginPath(); g.ellipse(0, -18, 13, 15, 0, 0, 7); g.fill();
    }
    const ey = kind === 'dragon' ? -30 : kind === 'giant' ? -32 : kind === 'wraith' ? -18 : -4;   // glowing eyes: a soft halo, then the eye
    for (const s of kind === 'dragon' ? [1] : [-1, 1]) for (const [r, a] of [[6, .25], [2.8, 1]]) { g.globalAlpha = a; g.fillStyle = eye; g.beginPath(); g.arc((kind === 'dragon' ? 10 : 0) + s * 6, ey, r, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    return barbSprites[kind] = cv;
}
function drawBarb(now, wallNow) {
    const z = mapState.zoom; if (z < .0025) return;
    for (const m of barbMarches) {                   // the columns: yours like every march, the others' as thin lines in their colour
        const home = islandById[m.homeId]; if (!home) continue;
        const pt = barbPt(m);
        if (m.who === 'player') { m.back ? drawMarchLine('send', pt, home, m.startedAt, m.resolveAt, wallNow, null, marchKeyOf(m)) : drawMarchLine('attack', home, pt, m.startedAt, m.resolveAt, wallNow, null, marchKeyOf(m)); continue; }   // (antippen: Knöpfe wie jeder Marsch)
        if (z < .006 || (!isCellOpen(pt.x, pt.y) && !isCellOpen(home.x, home.y))) continue;
        let p = barbPathMem.get(m); if (!p) { p = m.back ? marchPath(pt, home) : marchPath(home, pt); barbPathMem.set(m, p); }
        const sp = p.map(q => ({ x: toSX(q.x), y: toSY(q.y) })); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const q of sp) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
        if (x1 < -20 || x0 > viewW + 20 || y1 < -20 || y0 > viewH + 20) continue;
        const col = (botById[m.who] || {}).color || '#c9423a', q = Math.max(0, Math.min(1, (wallNow - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt))), at = barbAlong(sp, q);
        setScreen(ctx); ctx.save(); ctx.globalAlpha = .55; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -(now / 50) % 22; ctx.lineWidth = 1.6; ctx.strokeStyle = col;
        ctx.beginPath(); ctx.moveTo(sp[0].x, sp[0].y); for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i].x, sp[i].y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.fillStyle = col; ctx.strokeStyle = 'rgba(8,9,12,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(at.x, at.y, 4, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
        liveAnimation = true;
    }
    setScreen(ctx);
    const k = barbK(), best = barbRec('player').b;
    if (z >= .004) for (const c of barbState.camps) {
        const x = c.x * z + mapState.offsetX, y = c.y * z + mapState.offsetY; if (x < -40 || x > viewW + 40 || y < -40 || y > viewH + 40 || !isCellOpen(c.x, c.y)) continue;
        const open = c.L <= best + 1, rd = RARITY_DEFS[barbTier(c.L)];
        if (KB.fertig && KB.img.barbaren) {                                 // Karte wie RoK: das KI-Bild (fest in der Welt, nie winzig), die Stufe daneben
            const im = KB.img.barbaren, w = Math.max(BARB_BREITE * z, 22), h = w * im.height / im.width;
            ctx.globalAlpha = open ? 1 : .6; ctx.drawImage(kbBild('barbaren', w * dpr), x - w / 2, y - h * .62, w, h); ctx.globalAlpha = 1;
            stufenZahl(x + w * .32, y - h * .5, c.L, true, open ? rd.color : '#6b6660'); continue; }
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (!open) ctx.globalAlpha = .6;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 5, 15, 5, 0, 0, 7); ctx.fill();
        for (const [dx, s, col] of [[-6, 1, '#8a5a33'], [6, .8, '#a0412e']]) {        // two hide tents
            ctx.fillStyle = col; ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(dx - 8 * s, 5); ctx.lineTo(dx, 5 - 13 * s); ctx.lineTo(dx + 8 * s, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1e140c'; ctx.beginPath(); ctx.moveTo(dx - 2 * s, 5); ctx.lineTo(dx, 5 - 6 * s); ctx.lineTo(dx + 2 * s, 5); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-6, -16); ctx.stroke();   // a skull pole with a rag
        ctx.fillStyle = '#b8342a'; ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(1, -14); ctx.lineTo(-6, -11); ctx.fill();
        ctx.fillStyle = '#ffae3a'; ctx.beginPath(); ctx.arc(0, 6, 1.8 + Math.sin(now / 160 + c.x) * .4, 0, 7); ctx.fill();   // the fire
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(11, -9, 6.5, 0, 7); ctx.fillStyle = 'rgba(14,12,16,.92)'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = open ? rd.color : '#6b6660'; ctx.stroke();
        ctx.fillStyle = open ? '#f4ecdc' : '#9a938a'; ctx.font = '800 7.5px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(c.L), 11, -8.6);
        ctx.restore();
    }
    const b = dbossOnMap(); if (!b || !isCellOpen(b.x, b.y)) return;
    const s = barbScreen(b), kb = Math.max(.55, Math.min(1.6, z / .02)); if (s.x < -120 || s.x > viewW + 120 || s.y < -120 || s.y > viewH + 120) return;
    const K = dbossKind(b), dead = b.hp <= 0, pulse = .5 + .5 * Math.sin(now / 420);
    if (!dead) { const R = 64 * kb, gr = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, R); gr.addColorStop(0, K.col + '66'); gr.addColorStop(1, K.col + '00'); ctx.globalAlpha = .6 + .4 * pulse; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    const im = dbossSprite(b.k, K.col), W = 84 * kb; ctx.save(); if (dead) { ctx.globalAlpha = .45; ctx.filter = 'grayscale(1)'; }
    ctx.drawImage(im, s.x - W / 2, s.y - W * 70 / 120 - (dead ? 0 : Math.sin(now / 600) * 2 * kb), W, W); ctx.restore();
    const bw = Math.max(70, 96 * kb), by = s.y + 26 * kb;                                    // name and life
    ctx.font = '700 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = dead ? b.name + ' · besiegt' : b.name, tw = ctx.measureText(label).width + 16;
    rr(ctx, s.x - tw / 2, by, tw, 18, 9); ctx.fillStyle = 'rgba(18,10,14,.9)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = K.col; ctx.stroke();
    ctx.fillStyle = '#fbeee4'; ctx.fillText(label, s.x, by + 9.5);
    if (!dead) { rr(ctx, s.x - bw / 2, by + 22, bw, 6, 3); ctx.fillStyle = 'rgba(10,8,10,.85)'; ctx.fill(); rr(ctx, s.x - bw / 2 + 1, by + 23, Math.max(2, (bw - 2) * b.hp / b.max), 4, 2); ctx.fillStyle = '#e0483a'; ctx.fill(); }
    liveAnimation = true;
}
// the sheet: a camp, the boss, or both at a glance (map button)
let barbView = null, barbShare = 'fit', barbHero = null, barbHero2 = null;
const barbSheetEl = document.getElementById('barbSheet');
function barbSource(pt, need, any) {                // your base for this march: the nearest one that has enough, else the one with the most
    let best = null, bs = -Infinity;
    for (const id of ownedIslands) { const isl = islandById[id], n = islandTroops[id] || 0; if (n < 1 || (!any && !canReach(isl.landmassId, pt.lm))) continue;
        const s = (n >= need ? 1e12 : n) - Math.hypot(isl.x - pt.x, isl.y - pt.y) / 1e3; if (s > bs) { bs = s; best = id; } }
    return best;
}
const barbShares = () => barbView && (barbView.kind === 'boss' || barbView.kind === 'drache') ? [['.1', '10 %'], ['.25', '25 %'], ['.5', '50 %'], ['1', 'Alle']] : [['fit', 'Passend'], ['.25', '25 %'], ['.5', '50 %'], ['1', 'Alle']];
const barbShareNow = () => barbShares().some(x => x[0] === barbShare) ? barbShare : barbShares()[1][0];
function barbShareOf(avail, need) { const sh = barbShareNow(); return Math.max(0, Math.min(avail, sh === 'fit' ? Math.ceil(need) : Math.floor(avail * +sh))); }
function barbAttackHtml(avail, need, src, lbl) {    // share, hero and the button
    const n = barbShareOf(avail, need);
    if (barbHero && (!heroOwned('player', barbHero) || heroBusy('player', barbHero))) barbHero = null; barbHero2 = heroZweitOk('player', barbHero, barbHero2);
    return '<div class="seg">' + barbShares().map(([v, t]) => '<button type="button" data-bs="' + v + '"' + (v === barbShareNow() ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>' +
        (heroSegHtml('data-bhero', barbHero) ? '<div class="seg hero-seg">' + heroSegHtml('data-bhero', barbHero) + '</div>' : '') +
        (heroSeg2Html('data-bhero2', barbHero, barbHero2) ? '<div class="seg hero-seg hero-seg2">' + heroSeg2Html('data-bhero2', barbHero, barbHero2) + '</div>' : '') +
        '<button class="btn btn--primary btn--sm" type="button" data-bgo' + (n < 1 ? ' disabled' : '') + '>' + icon('attack') + '<span>' + lbl + ' · ' + fmtCompact(n) + ' von ' + islandTitle(islandById[src]) + '</span></button>';
}
function barbSheetHtml() {
    const v = barbView, rec = barbRec('player'), head = (ic, t) => '<div class="marker-head"><b>' + icon(ic) + ' ' + t + '</b><button class="btn-x" type="button" data-bclose aria-label="Schließen">' + icon('close') + '</button></div>';
    if (v.kind === 'inv') return invSheetHtml(head);                                 // Events
    if (v.kind === 'drache') return drSheetHtml(head);
    const b = dbossEnsure(), mid = '<b data-bclock>' + fmtDHMS(msToMidnight() / 1000) + '</b>';
    if (v.kind === 'camp') {
        const c = barbCampById(v.id); if (!c) return head('attack', 'Barbaren-Lager') + '<div class="notice">' + icon('check') + '<span>Dieses Lager ist schon geräumt.</span></div>';
        const open = barbOpenFor('player', c.L), left = barbLeft('player'), need = c.t * 1.15 / barbFa('player'), src = barbSource(c, need), rd = RARITY_DEFS[barbTier(c.L)];
        return head('attack', 'Barbaren-Lager <span class="barb-lv" style="--bc:' + rd.color + '">Stufe ' + c.L + '</span>') +
            '<div class="field-lines"><span>Krieger</span><b>' + fmtNum(c.t) + (c.t < c.max ? ' <small>von ' + fmtCompact(c.max) + '</small>' : '') + '</b>' +
            '<span>Beute</span><b>' + fmtCompact(barbLootOf(c.L)) + ' Münzen</b><span>Mit Glück</span><b>Kiste · ' + (1 + Math.floor(c.L / 5)) + ' Splitter</b>' +
            '<span>Heute</span><b>' + rec.n + ' / ' + barbTagMax() + ' heute</b>' +
            '<span>Freigeschaltet</span><b>bis Stufe ' + Math.min(BARB_MAX_L, rec.b + 1) + '</b></div>' +
            (!open ? '<div class="notice">' + icon('lock') + '<span>Erst ein Lager der Stufe ' + (c.L - 1) + ' besiegen – dann ist Stufe ' + c.L + ' dran.</span></div>' :
             left <= 0 ? '<div class="notice notice--gold">' + icon('hourglass') + '<span>Für heute genug: ' + barbTagMax() + ' / ' + barbTagMax() + ' heute. Neue Lager in ' + mid + '.</span></div>' :
             src === null ? '<div class="notice">' + icon('lock') + '<span>Keine deiner Basen mit Truppen kommt hierher – wähle ein Lager näher an deinen Basen.</span></div>' :
             barbAttackHtml(islandTroops[src] || 0, need, src, 'Angreifen'));
    }
    const K = dbossKind(b), rk = dbossRanks(b), mine = rk.findIndex(e => e[0] === 'player'), dead = b.hp <= 0;
    const row = (e, i) => '<li' + (e[0] === 'player' ? ' class="me"' : '') + '><em>' + (i + 1) + '</em><span>' + escapeHtml(fieldWhoName(e[0])) + '</span><b>' + fmtCompact(e[1]) + '</b></li>';
    const bossHtml = head('crown', 'Tagesboss · ' + K.name) +
        '<div class="barb-hp"><i style="width:' + (b.hp / b.max * 100).toFixed(1) + '%"></i><span>' + (dead ? 'Besiegt' : fmtCompact(b.hp) + ' / ' + fmtCompact(b.max) + ' Leben') + '</span></div>' +
        '<div class="field-lines"><span>' + (dead ? 'Neuer Boss in' : 'Verschwindet in') + '</span>' + mid + '<span>Deine Angriffe</span><b>' + rec.h + ' / ' + dbossHitsMax() + ' heute</b>' +
        '<span>Dein Schaden</span><b>' + (mine >= 0 ? fmtCompact(rk[mine][1]) + ' · Platz ' + (mine + 1) : '–') + (barbOut('player', 'b') ? ' <small>· Angriff unterwegs</small>' : '') + '</b></div>' +
        (rk.length ? '<ol class="barb-rank">' + rk.slice(0, 5).map(row).join('') + (mine >= 5 ? row(rk[mine], mine) : '') + '</ol>' : '<div class="notice">' + icon('info') + '<span>Noch hat niemand angegriffen.</span></div>');
    const rules = '<div class="barb-note">Pro Angriff Münzen nach Schaden und die Belohnung seiner Schadens-Klasse (Events → Boss), ein Viertel der Kämpfer fällt, höchstens 5 % Leben pro Angriff. Fällt der Boss, bekommen alle, die getroffen haben, noch etwas dazu.</div>';
    if (v.kind === 'boss') {
        const src = barbSource(b, 1, true);
        return bossHtml + (dead ? '' : rec.h >= dbossHitsMax() ? '<div class="notice notice--gold">' + icon('hourglass') + '<span>Heute keine Angriffe mehr – morgen wieder.</span></div>' :
            src === null ? '<div class="notice">' + icon('lock') + '<span>Keine deiner Basen hat Truppen.</span></div>' : barbAttackHtml(islandTroops[src] || 0, (islandTroops[src] || 0) * .5, src, 'Angreifen')) + rules;
    }
    return bossHtml + rules;                          // (Tagesboss und Lager im Überblick: Events → Boss & Lager)
}
function barbNearest() {                            // the closest camp you may attack, the highest level first
    const home = islandById[rewardBaseId() ?? playerIslandId]; if (!home) return null; const best = barbRec('player').b;
    let pick = null, ps = -Infinity; for (const c of barbState.camps) { if (c.L > best + 1 || !isCellOpen(c.x, c.y)) continue; const s = c.L * 3 - Math.hypot(c.x - home.x, c.y - home.y) / 4000; if (s > ps) { ps = s; pick = c; } }
    return pick;
}
function openBarbSheet(v) { if (barbSheetEl.hidden) [barbHero, barbHero2] = heroLetzte(); barbView = v; liveHtml(barbSheetEl, barbSheetHtml()); barbSheetEl.hidden = false; }
function closeBarbSheet() { barbSheetEl.hidden = true; barbView = null; }
function barbSheetRefresh() { if (barbView && !barbSheetEl.hidden) liveHtml(barbSheetEl, barbSheetHtml()); }   // (auch jede Sekunde aus liveTick)
barbSheetEl.addEventListener('click', e => {
    if (!barbView) return;
    if (e.target.closest('[data-bclose]')) return closeBarbSheet();
    const sh = e.target.closest('[data-bs]'); if (sh) { barbShare = sh.dataset.bs; return barbSheetRefresh(); }
    const hh = e.target.closest('[data-bhero]:not([disabled])'); if (hh) { barbHero = hh.dataset.bhero || null; return barbSheetRefresh(); }
    const hh2 = e.target.closest('[data-bhero2]:not([disabled])'); if (hh2) { barbHero2 = hh2.dataset.bhero2 || null; return barbSheetRefresh(); }
    const go = e.target.closest('[data-bgoto]'); if (go) { const t = go.dataset.bgoto === 'boss' ? dbossOnMap() : barbNearest(); if (!t) { if (go.dataset.bgoto !== 'boss') flashHint('Kein Lager in erforschtem Gebiet – schick zuerst Späher in den Nebel.', 3500); return barbSheetRefresh(); }
        if (!isCellOpen(t.x, t.y)) { flashHint('Der Tagesboss steht im Nebel – erforsche zuerst das Gebiet.', 3500); return; }
        flyTo(t.x, t.y, { zoom: Math.max(mapState.zoom, .02), screenY: viewH * .2 }); return openBarbSheet(go.dataset.bgoto === 'boss' ? { kind: 'boss' } : { kind: 'camp', id: t.id }); }
    if (!e.target.closest('[data-bgo]')) return;
    if (!marschPlatz('player')) return;                                                        // Marsch-Plätze (Paket D)
    if (barbView.kind === 'drache') { const D = drAktiv(); if (!D || (D.hits.player || 0) >= DR_HITS) return barbSheetRefresh(); const src = barbSource(D, 1, true); if (src === null) return;
        const n = barbShareOf(islandTroops[src] || 0, (islandTroops[src] || 0) * .5); if (n < 1) return;
        if (alsBefehl('lager', { home: src, k: 'd', tid: null, n, held: barbHero, held2: barbHero2 })) { islandTroops[src] = Math.max(0, (islandTroops[src] || 0) - n); D.hits.player = (D.hits.player || 0) + 1; } else barbSend('player', src, 'd', null, n, barbHero, barbHero2);
        flashHint('Truppen unterwegs zum Drachen.', 2500); }
    else if (barbView.kind === 'inv') { const a = invArmee(barbView.id); if (!a) return barbSheetRefresh(); const need = a.t * 1.15 / barbFa('player'), src = barbSource(invPos(a), need); if (src === null || !invTreffpunkt(a, src, 'player')) return barbSheetRefresh();
        const n = barbShareOf(islandTroops[src] || 0, need); if (n < 1) return;
        if (alsBefehl('lager', { home: src, k: 'i', tid: a.id, n, held: barbHero, held2: barbHero2 })) islandTroops[src] = Math.max(0, (islandTroops[src] || 0) - n); else barbSend('player', src, 'i', a.id, n, barbHero, barbHero2);
        flashHint('Truppen unterwegs, um die Barbaren abzufangen.', 2500); }
    else if (barbView.kind === 'camp') { const c = barbCampById(barbView.id); if (!c || !barbOpenFor('player', c.L) || barbLeft('player') <= 0) return barbSheetRefresh();
        const need = c.t * 1.15 / barbFa('player'), src = barbSource(c, need); if (src === null) return; const n = barbShareOf(islandTroops[src] || 0, need); if (n < 1) return;
        if (alsBefehl('lager', { home: src, k: 'c', tid: c.id, n, held: barbHero, held2: barbHero2 })) islandTroops[src] = Math.max(0, (islandTroops[src] || 0) - n); else barbSend('player', src, 'c', c.id, n, barbHero, barbHero2); flashHint('Truppen unterwegs zum Barbaren-Lager (Stufe ' + c.L + ').', 2500); }
    else { const b = dbossEnsure(); if (b.hp <= 0 || barbRec('player').h >= dbossHitsMax()) return barbSheetRefresh(); const src = barbSource(b, 1, true); if (src === null) return;
        const n = barbShareOf(islandTroops[src] || 0, (islandTroops[src] || 0) * .5); if (n < 1) return; if (alsBefehl('lager', { home: src, k: 'b', tid: null, n, held: barbHero, held2: barbHero2 })) islandTroops[src] = Math.max(0, (islandTroops[src] || 0) - n); else barbSend('player', src, 'b', null, n, barbHero, barbHero2); flashHint('Truppen unterwegs zu ' + b.name + '.', 2500); }
    heroLetzteMerken(barbHero, barbHero2); barbHero = null; barbHero2 = null; closeBarbSheet();
});
