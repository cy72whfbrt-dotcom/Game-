// Teil 08c-helden-fenster.js: Helden: Splitter, Freischalten, Sterne, Skillpunkte, Helden-Fenster
// ===== HELDEN: shards → unlock → quarter stars → skill points. A hero only works in the fight he leads - for you and everyone else =====
var heroState = null;                              // { id: { sh, q, own, sk: [4 levels], rage } } in openWaterHeroes2 (the old openWaterHeroes is only read to convert)
function heroFresh(h) { return { sh: HERO_START_SHARDS[h.r], q: 0, own: false, sk: [0, 0, 0, 0], rage: 0 }; }
function heroConvert(old, hall) {                   // old level + rarity → quarter stars, generously; Sigrun, Bernhard and Ida stay unlocked
    const out = {};
    for (const h of HEROES) out[h.id] = heroFresh(h);
    for (const id of ['sigrun', 'bernhard', 'ida']) { const o = old && old[id] || {}, lvl = Math.max(1, Math.min(o.lvl || 1, Math.max(1, hall * 2)));
        out[id] = { sh: 0, q: Math.min(HERO_MAXQ, Math.ceil(lvl / 3) + (o.rar || 0) * 2), own: true, sk: [0, 0, 0, 0], rage: 0 }; }
    return out;
}
function heroFix(set) { for (const h of HEROES) { const s = set[h.id] = Object.assign(heroFresh(h), set[h.id] || {}); if (!Array.isArray(s.sk) || s.sk.length !== 4) s.sk = [0, 0, 0, 0]; s.q = Math.max(0, Math.min(HERO_MAXQ, s.q | 0)); } return set; }
function loadHeroes() {
    if (heroState) return heroState;
    try { heroState = JSON.parse(store.get('openWaterHeroes2')) || null; } catch (e) { heroState = null; }
    if (!heroState) { let old = null; try { old = JSON.parse(store.get('openWaterHeroes')); } catch (e) { old = null; }
        heroState = heroConvert(old, cityLevelSafe('heroes')); heroFix(heroState); saveHeroes(); }
    return heroFix(heroState);
}
function saveHeroes() { store.set('openWaterHeroes2', JSON.stringify(heroState)); }
function heroById(id) { return HEROES.find(h => h.id === id) || null; }
function heroSt(who, id) { if (!heroById(id)) return null; if (who === 'player') return loadHeroes()[id]; const b = loadBotState()[who]; return b && b.hs ? b.hs[id] : null; }
function heroOwned(who, id) { const s = heroSt(who, id); return !!(s && s.own) && heroHalle(who); }
function heroHalle(who) { try { return heroLead(who).hall > 0; } catch (e) { return false; } }   // Helden erst mit gebauter Heldenhalle (Splitter sammeln geht vorher)
function heroSave(who) { if (who === 'player') saveHeroes(); else saveBotState(); }
const heroPoints = s => Math.floor(s.q / 2);                                       // 1 point per half star: 10 at five stars
const heroFree = s => Math.max(0, heroPoints(s) - s.sk.reduce((a, v) => a + v, 0));
const heroStepCost = (h, q) => Math.round(HERO_UNLOCK[h.r] / 4 * (1 + Math.floor(q / 4)));
const heroStarNum = q => (q >= 4 || !q ? Math.floor(q / 4) : '') + ['', '¼', '½', '¾'][q % 4];   // 2½
function heroStarTxt(q) { return heroStarNum(q) + (q && q <= 4 ? ' Stern' : ' Sterne'); }
const heroNum = v => (+v).toLocaleString('de-DE', { maximumFractionDigits: 1 });   // 2,4
function heroSkillVal(h, k, lv) { const t = HERO_TIER[h.r]; return Math.round((k ? t.p : t.a) * lv / 5 * 10) / 10; }
function heroLead(who) { return who === 'player' ? { lvl: playerLvl, hall: cityLevelSafe('heroes') } : { lvl: (loadBotState()[who] || {}).lvl || 1, hall: botBld(who, 'heroes') }; }
function heroStats(who, id, s) {                    // Angriff, Verteidigung (fewer losses), Tempo in % and the Gefolge: grow with rarity, stars, your level and the Heldenhalle
    const h = heroById(id); s = s || heroSt(who, id); if (!h || !s) return { atk: 0, def: 0, spd: 0, gef: 0 };
    const t = HERO_TIER[h.r], m = t.st * (1 + s.q / 4 * .15), L = heroLead(who);
    return { atk: Math.round(h.base[0] * m), def: Math.round(h.base[1] * m), spd: Math.round(h.base[2] * m),
             gef: Math.round(5e4 * t.st * (1 + s.q * .15) * stufenTruppenMass(L.lvl) / 2e6 * (1 + L.hall * HERO_HALL_GEF / 100)) };
}
function heroPower(who, id) { const h = heroById(id), s = heroSt(who, id); if (!h || !s || !s.own) return 0; return Math.round((4 + s.q) * HERO_TIER[h.r].st * 2500 + s.sk.reduce((a, v) => a + v, 0) * 1200); }
// what every skill does: [the fx it raises, the kind of fight it needs]
const HERO_EFF = { atk: ['atk', 'fight'], loss: ['loss', 'fight'], hosp: ['hosp', 'fight'], gold: ['gold', 'fight'], flee: ['flee', 'base'], ret: ['ret', 'base'], late: ['late', 'base'], defCut: ['def', 'base'],
    spd: ['spd', 'march'], toll: ['toll', 'march'], fieldSpd: ['spd', 'fieldMarch'], bridgeDef: ['def', 'bridge'], gateAtk: ['atk', 'gate'], siegeDef: ['def', 'siege'], siegeAtk: ['atk', 'siege'],
    strongAtk: ['atk', 'strong'], midAtk: ['atk', 'mid'], midLoss: ['loss', 'mid'], guardAtk: ['atk', 'guard'], rulerAtk: ['atk', 'ruler'], templeLoss: ['loss', 'temple'], templeGold: ['gold', 'temple'],
    templeAtk: ['atk', 'temple'], templeHosp: ['hosp', 'temple'], scoutAtk: ['atk', 'scouted'], neutralAtk: ['atk', 'neutral'], fieldAtk: ['atk', 'vsArmy'], fieldGold: ['gold', 'field'],
    fieldLoss: ['loss', 'field'], fieldDef: ['fdef', 'fdefending'], resAtk: ['atk', 'res'], gatherDef: ['fdef', 'gatherDef'], gatherSpd: ['gSpd', 'gather'], carry: ['carry', 'gather'], rage: [null, 'never'] };
const HERO_FX_TXT = { atk: v => '+' + v + ' % Angriff', loss: v => '−' + v + ' % Verluste', def: v => 'Verteidigung −' + v + ' %', hosp: v => '+' + v + ' % ins Krankenhaus', gold: v => '+' + v + ' % Münzen',
    flee: v => '+' + v + ' % fliehen', ret: v => 'Rückzug +' + v + ' % Tempo', late: v => v + ' % später bemerkt', spd: v => '+' + v + ' % Tempo', toll: v => '−' + v + ' % Maut',
    fdef: v => '+' + v + ' % Verteidigung', gSpd: v => '+' + v + ' % Sammeln', carry: v => '+' + v + ' % Traglast' };
function heroGefOf(hx, n) { return hx ? Math.min(hx.gef || 0, Math.max(0, n)) : 0; }   // Gefolge: never more than the troops the hero leads (no 1-troop marches with a big following)
const HX0 = { atk: 0, loss: 0, def: 0, hosp: 0, gold: 0, flee: 0, ret: 0, late: 0, spd: 0, toll: 0, fdef: 0, gSpd: 0, carry: 0, gef: 0 };
function heroFx(who, id, ctx, fired, s, mul) {      // → the hero's numbers for this fight or march, with a line for the report per value that counts (mul: der Zweitheld zählt halb)
    const h = heroById(id); s = s || heroSt(who, id); if (!h || !s || !s.own || !heroHalle(who)) return null;
    const st0 = heroStats(who, id, s), m = mul || 1, st = m === 1 ? st0 : { atk: Math.round(st0.atk * m), def: Math.round(st0.def * m), spd: Math.round(st0.spd * m), gef: Math.round(st0.gef * m) };
    const fx = Object.assign({ id, q: s.q, fired: !!fired, lines: [] }, HX0);
    if (ctx.fight) { fx.atk += st.atk; fx.loss += st.def; fx.gef = st.gef;
        if (st.atk) fx.lines.push(['Angriff', '+' + st.atk + ' %']); if (st.def) fx.lines.push(['Verteidigung', '−' + st.def + ' % Verluste']); if (st.gef) fx.lines.push(['Gefolge', '+' + fmtNum(st.gef) + ' Truppen']); }
    if (ctx.march && st.spd) { fx.spd += st.spd; fx.lines.push(['Tempo', '+' + st.spd + ' %']); }
    h.sk.forEach((x, k) => { const lv = s.sk[k] || 0; if (!lv || (k === 0 && !fired)) return;
        const e = HERO_EFF[x[2]]; if (!e || !e[0] || !ctx[e[1]]) return;
        const v = Math.round(heroSkillVal(h, k, lv) * m * 10) / 10; fx[e[0]] += v; fx.lines.push([x[0] + (k ? '' : ' · Wut'), HERO_FX_TXT[e[0]](heroNum(v))]); });
    if (fired) fx.skill = h.sk[0][0];
    fx.loss = Math.min(90, fx.loss); fx.def = Math.min(90, fx.def);
    return fx;
}
function heroBaseCtx(who, src, target, raw) {       // what kind of attack this is, for the skills that need one
    const ow = islandOwnerOf(target.id), temple = target.type === 'temple' || target.type === 'megaTemple' || !!target.guardian, gate = target.type === 'gate', lm = landmasses[target.landmassId];
    return { fight: 1, base: 1, march: 1, bridge: !!src && src.landmassId !== target.landmassId, gate, temple, siege: gate || temple, guard: !!target.guardian,
        mid: !!lm && lm.tier !== 'outer', ruler: !!ow && ow !== who && rulerOwner() === ow, neutral: !ow, strong: effectiveTroops(target) + effectiveDefense(target) > raw,
        scouted: who === 'player' ? scoutedIslands.has(target.id) : !!(typeof botIntel === 'function' && botById[who] && botIntel(botById[who], target.id)) };
}
const heroWouldFire = s => s.sk[0] > 0 && s.rage >= 100;
function heroDuo(who, fx, id2, ctx) {               // + der Zweitheld: Werte und passive Fähigkeiten zu 50 % (keine Wut), ein passendes Paar +10 % auf alles
    if (!fx || !id2 || id2 === fx.id) return fx;
    const f2 = heroFx(who, id2, ctx, false, null, HERO_ZWEIT); if (!f2) return fx;
    for (const k in HX0) fx[k] += f2[k];
    const p = heroPairOf(fx.id, id2), b = 1 + HERO_PAIR_BONUS / 100;
    if (p) for (const k in HX0) fx[k] = k === 'gef' ? Math.round(fx[k] * b) : Math.round(fx[k] * b * 10) / 10;
    fx.loss = Math.min(90, fx.loss); fx.def = Math.min(90, fx.def);
    fx.id2 = id2; fx.h2 = { id: id2, q: f2.q, lines: f2.lines };
    if (p) { fx.pair = p.name; fx.lines.push(['Paar „' + p.name + '“', '+' + HERO_PAIR_BONUS + ' % auf alle Heldenwerte']); }
    return fx;
}
function heroZweitOk(who, id, id2) { return id && id2 && id2 !== id && heroOwned(who, id2) && !heroBusy(who, id2) ? id2 : null; }   // der Zweitheld: nur mit Hauptheld, eigener, freier Held
function heroPeek(who, id, src, target, raw, id2) { const s = heroSt(who, id); if (!s || !heroOwned(who, id)) return null; const ctx = heroBaseCtx(who, src, target, raw); return heroDuo(who, heroFx(who, id, ctx, heroWouldFire(s), s), id2, ctx); }
function heroLaunch(who, id, src, target, raw, id2) {   // the hero marches off: a full rage fires the active skill in this fight
    const s = heroSt(who, id); if (!s || !heroOwned(who, id)) return null;
    const fired = heroWouldFire(s); if (fired) { s.rage = 0; heroSave(who); goalBump(who, 'heroFires'); }
    const ctx = heroBaseCtx(who, src, target, raw); return heroDuo(who, heroFx(who, id, ctx, fired, s), id2, ctx);
}
function heroWutZurueck(who, hx) {                  // der Held hat nicht gekämpft (zurückgerufen, abgeprallt, 2. Welle ohne Helden): seine Wut kommt zurück
    if (!hx || !hx.fired || !hx.id) return; const s = heroSt(who, hx.id); if (s && s.own) { s.rage = Math.max(s.rage || 0, 100); heroSave(who); }
}
function heroRageUp(who, id) { const h = heroById(id), s = heroSt(who, id); if (!h || !s || !s.own) return;
    const bl = h.sk.findIndex(x => x[2] === 'rage'), fast = bl >= 0 && s.sk[bl] ? heroSkillVal(h, bl, s.sk[bl]) : 0;
    s.rage = Math.min(100, (s.rage || 0) + HERO_RAGE * (1 + fast / 100)); heroSave(who); }
function heroFought(who, hx) { if (!hx || !hx.id) return; heroRageUp(who, hx.id); for (const e of hx.extra || []) heroRageUp(who, e.id); }   // every fight a hero leads fills his rage
function heroFieldFx(who, id, ctx, id2) {           // a fight out in the open: fires (and refills) the rage right away (nur beim Haupthelden)
    const s = id && heroSt(who, id); if (!s || !heroOwned(who, id)) return null;
    const fired = heroWouldFire(s); if (fired) { s.rage = 0; goalBump(who, 'heroFires'); }
    const c = Object.assign({ fight: 1, field: 1, vsArmy: 1 }, ctx, { fdefending: !!ctx.defending, gatherDef: !!(ctx.res && ctx.defending) });
    const fx = heroDuo(who, heroFx(who, id, c, fired, s), id2 && heroOwned(who, id2) ? id2 : null, c);
    heroRageUp(who, id); return fx;
}
function heroMarchFx(who, id, field, id2) { if (!id || !heroOwned(who, id)) return null; const c = { march: 1, fieldMarch: !!field }; return heroDuo(who, heroFx(who, id, c, false), id2 && heroOwned(who, id2) ? id2 : null, c); }   // walking only: Tempo and Maut
function heroGatherFx(o) { return o && o.hero && heroOwned(o.who, o.hero) ? heroDuo(o.who, heroFx(o.who, o.hero, { gather: 1 }, false), o.hero2 && heroOwned(o.who, o.hero2) ? o.hero2 : null, { gather: 1 }) : null; }
function heroOnField(who, id) { try { return fieldMarches.some(m => m.who === who && heroIn(m.hero, m.hero2, id)) || barbMarches.some(m => m.who === who && heroIn(m.hero, m.hero2, id)) || resFields.some(f => { const o = fieldState[f.id] && fieldState[f.id].occ; return !!o && o.who === who && heroIn(o.hero, o.hero2, id); }); } catch (e) { return false; } }
const heroIn = (hero, hero2, id) => hero === id || hero2 === id;
function heroBusy(who, id) {                        // one attack, army or field march per hero at a time (Haupt- oder Zweitheld)
    const mine = x => who === 'player' ? !x || x === 'player' : x === who;
    return pendingAttacks.some(a => mine(a.attackerBotId) && (heroIn(a.hero, a.hero2, id) || (a.hx && (a.hx.id2 === id || (a.hx.extra || []).some(e => e.id === id)))))
        || (typeof armies !== 'undefined' && armies.some(x => mine(x.who) && heroIn(x.hero, x.hero2, id))) || heroOnField(who, id)
        || (typeof bund !== 'undefined' && bund && Array.isArray(bund.r) && bund.r.some(r => !r.startet && (mine(r.by) && heroIn(r.held, r.held2, id) || Array.isArray(r.j) && r.j.some(j => j && mine(j.w) && heroIn(j.held, j.held2, id)))))   // führt eine Rally, die noch sammelt – oder ist als Mitglied dabei
        || pendingSends.some(s => s.rally && mine(s.senderBotId) && heroIn(s.held, s.held2, id))   // unterwegs zu einer Rally (auch als Nachzügler)
        || pendingAttacks.some(a => a.rally && Array.isArray(a.rally.an) && a.rally.an.some(x => x && x[4] && mine(x[0]) && (x[4].id === id || x[4].id2 === id || (x[4].extra || []).some(e => e.id === id))));   // kämpft noch in einem gemeinsamen Kampf mit
}
function heroPickBest(who, src, target, raw, main) {   // the free hero that does the most in this attack (the others use it, and so can you) · main: der Zweitheld dazu
    let best = null, bs = 0; const def = target ? effectiveDefense(target) : 0, ctx = target ? null : { fight: 1, field: 1, vsArmy: 1, march: 1 };
    for (const h of HEROES) { if (!heroOwned(who, h.id) || heroBusy(who, h.id) || h.id === main) continue;
        const fx = main ? (target ? heroPeek(who, main, src, target, raw, h.id) : heroDuo(who, heroFx(who, main, ctx, false), h.id, ctx))
            : target ? heroPeek(who, h.id, src, target, raw) : heroFx(who, h.id, ctx, false);
        const sc = raw * (fx.atk / 100) + heroGefOf(fx, raw) + def * (fx.def + fx.loss) / 100 + raw * fx.spd / 400 + 1;
        if (sc > bs) { bs = sc; best = h.id; } }
    return best;
}
function heroPickPair(who, src, target, raw) { const a = heroPickBest(who, src, target, raw); return [a, a ? heroPickBest(who, src, target, raw, a) : null]; }   // Haupt- und Zweitheld (passende Paare zählen von selbst mehr)
// shards, stars and points: the same steps for you and for everyone else
function heroGrantShards(who, n, id, minR) {        // n shards for one hero (a random one: the commoner the likelier, maxed ones left out; minR: only this rarity or rarer)
    const pool = HEROES.filter(h => { const s = heroSt(who, h.id); return s && !(s.own && s.q >= HERO_MAXQ) && h.r >= (minR || 0); }); if (!pool.length) return null;
    let h = id && heroById(id); if (!h) { const w = pool.map(x => 5 - x.r), tot = w.reduce((a, v) => a + v, 0); let r = Math.random() * tot; h = pool[pool.length - 1]; for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r < 0) { h = pool[i]; break; } } }
    const s = heroSt(who, h.id); s.sh += n; heroSave(who); return h;
}
function heroDoUnlock(who, id) { const h = heroById(id), s = heroSt(who, id); if (!h || !s || s.own || s.sh < HERO_UNLOCK[h.r] || !heroHalle(who)) return false; s.sh -= HERO_UNLOCK[h.r]; s.own = true; s.q = 0; heroSave(who); return true; }
function heroDoStep(who, id) { const h = heroById(id), s = heroSt(who, id); if (!h || !s || !heroOwned(who, id) || s.q >= HERO_MAXQ) return false; const c = heroStepCost(h, s.q); if (s.sh < c) return false; s.sh -= c; s.q++; heroSave(who); evPunkte('held', who, WO_PKT.held); return true; }   // (Wochen-Event Helden-Tag)
function heroDoSwap(who, from, to, n) {              // übrige Splitter eines Helden mit 5 Sternen → Splitter für einen anderen (1:1, nicht für einen mit 5 Sternen)
    const a = heroSt(who, from), b = heroSt(who, to); n = Math.floor(n);
    if (!a || !b || from === to || !a.own || a.q < HERO_MAXQ || (b.own && b.q >= HERO_MAXQ) || !(n > 0) || n > a.sh) return false;
    a.sh -= n; b.sh += n; heroSave(who); return true;
}
function heroDoSkill(who, id, k) { const s = heroSt(who, id); if (!s || !heroOwned(who, id) || !heroFree(s) || s.sk[k] >= 5) return false; s.sk[k]++; heroSave(who); return true; }
function heroCanDo(who, id) { const h = heroById(id), s = heroSt(who, id); if (!h || !s || !heroHalle(who)) return false; return s.own ? heroFree(s) > 0 || (s.q < HERO_MAXQ && s.sh >= heroStepCost(h, s.q)) : s.sh >= HERO_UNLOCK[h.r]; }
// ---- Verteidigungs-Helden (Mauer, 6.10.): in der Mauer eingetragen verteidigen sie JEDE eigene Basis – Hauptheld ab Mauer 1,
// Zweitheld ab Mauer 5 (zu 50 %). Gleiche Rechnung wie beim Angriff (Angriff, Verluste, Krankenhaus, Gold, Gefolge – ohne Wut).
// Wer gerade unterwegs ist (Angriff, Armee, Feld, Rally), verteidigt nicht; zurück → verteidigt wieder.
const VH_ZWEIT_MAUER = 5;
function vhSoll(who) {                              // [Haupt-, Zweitheld] wie eingetragen (dein Eintrag steht in der Stadt)
    let v = null; try { v = who === 'player' ? loadCity().vh : (loadBotState()[who] || {}).vh; } catch (e) { v = null; }
    return Array.isArray(v) ? [heroById(v[0]) ? v[0] : null, heroById(v[1]) ? v[1] : null] : [null, null];
}
function vhMauer(who) { return who === 'player' ? cityLevelSafe('wall') : botBld(who, 'wall'); }
function vhRechnen(who) {
    const [a, b] = vhSoll(who), L = vhMauer(who), ctx = { fight: 1 }, frei = id => id && heroOwned(who, id) && !heroBusy(who, id) ? id : null;
    const h1 = L >= 1 ? frei(a) : null, h2 = L >= VH_ZWEIT_MAUER && b !== a ? frei(b) : null;
    let fx = null;
    if (h1) fx = heroDuo(who, heroFx(who, h1, ctx, false), h2, ctx);
    else if (h2) { fx = heroFx(who, h2, ctx, false, null, HERO_ZWEIT); if (fx) fx.zweit = 1; }   // der Hauptheld ist unterwegs: der Zweitheld allein, zu 50 %
    if (fx) fx.vh = 1;
    return fx;
}
let vhMem = null;                                   // (effectiveDefense fragt sehr oft: je Sekunde und Marsch-Stand einmal rechnen)
function vhFx(who) {
    if (!who || !(who === 'player' || botById[who])) return null;
    try {
        const k = Math.floor(Date.now() / 1000) + '|' + pendingAttacks.length + '|' + pendingSends.length + '|' + armies.length;
        if (!vhMem || vhMem.k !== k) vhMem = { k, by: {} };
        return who in vhMem.by ? vhMem.by[who] : (vhMem.by[who] = vhRechnen(who));
    } catch (e) { return null; }                    // (die ersten Schritte beim Laden: Märsche und Stadt sind noch nicht da)
}
function vhPlus(fx, g) { return fx ? Math.round(g * fx.atk / 100) + heroGefOf(fx, g) : 0; }   // was die Helden der Besatzung dazugeben: Angriff % + Gefolge
function vhName(fx) { const h = heroById(fx.id), h2 = fx.id2 && heroById(fx.id2); return 'Held ' + (h ? h.name + ' ' + heroStarTxt(fx.q) : '') + (h2 ? ' & ' + h2.name : ''); }
function vhSetzen(who, h1, h2) {                    // eintragen (prüft: eigener Held, Mauer-Stufe) → true, wenn es gilt
    const L = vhMauer(who), ok = id => id && heroById(id) && heroOwned(who, id) ? id : null;
    const a = L >= 1 ? ok(h1) : null, b = a && L >= VH_ZWEIT_MAUER && h2 !== a ? ok(h2) : null;
    if ((h1 && !a) || (h2 && !b)) return false;
    if (who === 'player') { const c = loadCity(); c.vh = [a, b]; saveCity(); }
    else { const s = loadBotState()[who]; if (!s) return false; s.vh = [a, b]; saveBotState(); }
    vhMem = null; return true;
}
function vhBest(who, ohne) {                        // der beste eigene Held fürs Verteidigen (Mitspieler): Angriff + weniger Verluste + Krankenhaus
    let best = null, bs = -1;
    for (const h of HEROES) { if (h.id === ohne || !heroOwned(who, h.id)) continue; const f = heroFx(who, h.id, { fight: 1 }, false); if (!f) continue;
        const sc = f.atk + f.loss + f.hosp / 2 + heroPower(who, h.id) / 1e6; if (sc > bs) { bs = sc; best = h.id; } }
    return best;
}
function heroTag(hx) { if (!hx) return ''; const h = heroById(hx.id), h2 = hx.id2 && heroById(hx.id2); return h ? h.name + ' ' + heroStarTxt(hx.q) + (h2 ? ' & ' + h2.name + (hx.pair ? ' (Paar)' : '') : '') + (hx.fired ? ' · ' + hx.skill + ' gezündet' : '') : ''; }   // one line for the short reports
var previewHero = null, nextAttackHero = null, previewHero2 = null, nextAttackHero2 = null;
// ---- zuletzt geschickte Helden (Merkliste 18): stehen in der Stadt (Spielstand auf dem Server), jede Marsch-Auswahl beginnt mit ihnen ----
const HERO_LETZTE_MAX = 6;
function heroLetzteMerken(h1, h2) {                 // nach dem Losschicken: Haupt- und Zweitheld vorn in die Liste
    if (!heroById(h1)) return; const c = loadCity(), alt = Array.isArray(c.lh) ? c.lh : [];
    c.lh = [h1, h2].concat(alt).filter((x, i, l) => heroById(x) && l.indexOf(x) === i).slice(0, HERO_LETZTE_MAX); saveCity();
}
function heroLetzte() {                             // → [Haupt-, Zweitheld]: die ersten freien aus der Liste (der gerade Losgeschickte ist unterwegs)
    let l = []; try { l = loadCity().lh || []; } catch (e) { l = []; }
    const frei = l.filter(id => heroById(id) && heroOwned('player', id) && !heroBusy('player', id)), h1 = frei[0] || null;
    return [h1, heroZweitOk('player', h1, frei[1] || null)];
}
// ---- the Heldenhalle screen: a grid of tall rarity cards → one hero with figure, stars, skills and values ----
let hhCur = null;
const hhStars = q => '<span class="hh-qstars">' + [0, 1, 2, 3, 4].map(k => '<i style="--f:' + (k < Math.floor(q / 4) ? 100 : k === Math.floor(q / 4) ? q % 4 * 25 : 0) + '%"></i>').join('') + '</span>';
// ---- Heldenbilder (KI-Bilder, werkzeuge/helden_bilder_schneiden.py): Figur bilder/held_<id>.webp (3:4) für große Karten, Kopf bilder/held_<id>_kopf.webp für Chips ----
const heroPic = (id, gross) => 'bilder/held_' + id + (gross ? '' : '_kopf') + '.webp';
function heroImg(id, cls, gross) { const h = heroById(id); return h ? '<img class="hero-pic' + (cls ? ' ' + cls : '') + '" src="' + heroPic(id, gross) + '" alt="' + h.name + '" draggable="false">' : ''; }
var hhSeite = 'helden';                               // Reiter der Heldenhalle: Helden | Paare
function hhGrid() {
    const H = loadHeroes(), list = HEROES.slice().sort((a, b) => (H[b.id].own - H[a.id].own) || b.r - a.r || H[b.id].q - H[a.id].q);
    const bereit = list.filter(h => !H[h.id].own && heroCanDo('player', h.id)), zu = list.filter(h => !H[h.id].own && !bereit.includes(h));   // genug Splitter: oben zum Freischalten
    const karte = h => { const s = H[h.id], need = s.own ? heroStepCost(h, s.q) : HERO_UNLOCK[h.r], rd = RARITY_DEFS[h.r], frei = !s.own && bereit.includes(h);
        return '<button type="button" class="hh-card' + (s.own ? '' : frei ? ' is-ready' : ' is-locked') + '" data-hh="' + h.id + '" data-r="' + rd.key + '" style="--rc:' + rd.color + ';--c:' + h.color + '">' +
            '<span class="hh-art">' + heroImg(h.id, '', true) + '</span>' + (heroCanDo('player', h.id) && !frei ? '<span class="hh-dot"></span>' : '') + (s.own || frei ? '' : '<span class="hh-lk">Gesperrt</span>') +
            '<span class="hh-foot"><b>' + h.name + '</b><small>' + h.role + '</small>' + (s.own ? hhStars(s.q) : frei ? '<span class="hh-frei" data-hh-frei="' + h.id + '">' + icon('plus') + 'Freischalten<em>' + need + ' Splitter</em></span>'
                : '<span class="hh-frag"><i style="width:' + Math.min(100, Math.round(s.sh / need * 100)) + '%"></i></span><small>' + s.sh + ' / ' + need + '</small>') + '</span></button>'; };
    return '<div class="hh-head"><div class="emblem emblem--gold">' + icon('profile') + '</div><div class="phead-text"><div class="overline">Heldenhalle</div><h2>Helden</h2></div><button class="btn-x" type="button" data-hh-close aria-label="Schließen">' + icon('close') + '</button></div>' +
        '<div class="seg hh-seiten">' + [['helden', 'Helden'], ['paare', 'Paare']].map(([k, t]) => '<button type="button" data-hh-seite="' + k + '"' + (hhSeite === k ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>' +
        (hhSeite === 'paare' ? hhPairs() :
        '<div class="hh-count">' + (list.length - zu.length - bereit.length) + ' / ' + HEROES.length + ' freigeschaltet · Splitter gibt es von Bossen, für Aufgaben und als Heldenkisten im Shop</div>' +
        '<div class="hh-cards">' + bereit.concat(list.filter(h => H[h.id].own)).map(karte).join('') + '</div>' +
        (zu.length ? '<div class="hh-zu-h">' + zu.length + ' gesperrt</div><div class="hh-cards hh-cards--zu">' + zu.map(karte).join('') + '</div>' : ''));   // gesperrte kleiner darunter
}
function hhPairs() {                                  // Paket E: die passenden Paare – zusammen in einem Marsch +10 % auf alle Heldenwerte
    const H = loadHeroes();
    return '<div class="hh-pairs"><h3>Paare</h3><p class="hh-hint">Ein Marsch kann zwei Helden haben: den Haupthelden und einen Zweithelden. Der Zweitheld gibt seine Werte und passiven Fähigkeiten zu ' + Math.round(HERO_ZWEIT * 100) +
        ' %, die Wut-Fähigkeit zündet nur beim Haupthelden. Ziehen zwei Helden eines Paars zusammen los: +' + HERO_PAIR_BONUS + ' % auf alle Heldenwerte. Jeder Held kann nur in einem Marsch sein.</p>' +
        HERO_PAIRS.map(p => { const both = H[p.a].own && H[p.b].own, A = heroById(p.a), B = heroById(p.b);
            return '<div class="hh-pair ki-karte' + (both ? ' is-on ki-karte--an' : '') + '"><span class="hh-pair-pics"><button type="button" data-hh="' + p.a + '" class="' + (H[p.a].own ? '' : 'is-locked') + '">' + heroImg(p.a) + '</button><button type="button" data-hh="' + p.b + '" class="' + (H[p.b].own ? '' : 'is-locked') + '">' + heroImg(p.b) + '</button></span>' +
                '<span class="hh-pair-t"><b>' + p.name + '</b><small>' + A.name + ' & ' + B.name + (both ? ' · bereit' : ' · noch nicht beide freigeschaltet') + '</small><em>' + p.story + '</em></span></div>'; }).join('') + '</div>';
}
function hhHero(id) {
    const h = heroById(id), s = heroSt('player', id), rd = RARITY_DEFS[h.r], st = heroStats('player', id), full = Math.floor(s.q / 4), part = s.q % 4, busy = s.own && heroBusy('player', id);
    const need = s.own ? heroStepCost(h, s.q) : HERO_UNLOCK[h.r], maxed = s.own && s.q >= HERO_MAXQ, free = heroFree(s);
    const stars = s.own ? (maxed ? '<div class="hh-qinfo"><span>5 Sterne – ganz oben</span><b>' + s.sh + ' Splitter übrig</b></div>' + hhSwapHtml(id, s)   // (ein Stern = 4 Viertel: erst wie weit der Stern ist, dann die Splitter fürs nächste Viertel)
            : '<div class="hh-qinfo"><span>Stern ' + (full + 1) + '</span><b>' + part + ' von 4 Vierteln</b></div><div class="hh-steps">' + [0, 1, 2, 3].map(k => '<span' + (k < part ? ' class="on"' : '') + '></span>').join('') + '</div>' +
              '<div class="hh-qinfo"><span>Nächstes Viertel</span><b>' + s.sh + ' / ' + need + ' Splitter</b></div><div class="hh-bar"><i style="width:' + Math.min(100, Math.round(s.sh / need * 100)) + '%"></i></div>')
        : '<div class="hh-qinfo"><span>Freischalten</span><b>' + s.sh + ' / ' + need + '</b></div><div class="hh-bar"><i style="width:' + Math.min(100, Math.round(s.sh / need * 100)) + '%"></i></div><div class="hh-qinfo"><span>Startet danach mit 0 Sternen.</span></div>';
    const skills = h.sk.map((x, k) => { const lv = s.sk[k], max = heroSkillVal(h, k, 5);
        return '<div class="hh-sk ki-karte' + (s.own ? '' : ' is-locked') + '"><span class="hh-hx' + (k ? '' : ' act') + '" data-r="' + rd.key + '">' + x[0][0] + '</span><div class="hh-skt"><b>' + x[0] + '</b><small>' + (k ? 'Passiv' : 'Aktiv · bei voller Wut') + ' · Stufe ' + lv + '/5</small>' +
            '<p>' + (lv ? x[1].replace('{v}', heroNum(heroSkillVal(h, k, lv))) : 'Stufe 1: ' + x[1].replace('{v}', heroNum(heroSkillVal(h, k, 1)))) + '</p>' + (lv < 5 ? '<p class="hh-max">Stufe 5: ' + x[1].replace('{v}', heroNum(max)) + '</p>' : '') +
            (s.own ? '<span class="hh-pips">' + [1, 2, 3, 4, 5].map(q => '<i' + (q <= lv ? ' class="on"' : '') + '></i>').join('') + '</span>' : '') + '</div>' +
            (s.own && lv < 5 ? '<button type="button" class="hh-plus" data-hh-sk="' + k + '"' + (free ? '' : ' disabled') + ' aria-label="' + x[0] + ' verbessern">+</button>' : '<span></span>') + '</div>'; }).join('');
    const kacheln = h.sk.map((x, k) => '<span class="hh-skk' + (k ? '' : ' act') + (s.sk[k] ? '' : ' is-null') + '" data-r="' + rd.key + '" title="' + x[0] + '">' + x[0][0] + '<i>' + s.sk[k] + '</i></span>').join('');   // die 4 Fähigkeiten als Kacheln unter der Figur (wie RoK)
    const wert = (ic, t, v) => '<div class="ki-karte"><span class="hh-vi">' + icon(ic) + '</span><span>' + t + '</span><b>' + v + '</b></div>';
    const spent = s.sk.reduce((a, v) => a + v, 0);
    return '<div class="hh-head"><button class="btn-x" type="button" data-hh-back aria-label="Zurück">' + icon('back') + '</button><h2>' + h.name + '</h2><button class="btn-x" type="button" data-hh-close aria-label="Schließen">' + icon('close') + '</button></div>' +
        '<div class="hh-hero" data-r="' + rd.key + '" style="--glow:' + h.color + '88;--rc:' + rd.color + '">' +
            '<div class="hh-stage"><div class="hh-strahl"></div><div class="hh-floor"></div>' + heroImg(id, 'hh-portrait' + (s.own ? '' : ' is-locked'), true) +
                '<div class="hh-id"><span class="hh-gem">' + rd.label + '</span><span class="hh-nm">' + h.name + '</span><span class="hh-ttl">' + h.title + ' · ' + h.role + '</span>' + hhStars(s.q) + '</div>' +
                '<div class="hh-unten"><div class="hh-top">' + (s.own ? '<div><h3>Macht</h3><b class="hh-pow">' + fmtNum(heroPower('player', id)) + '</b></div>' : '<div></div>') +   // (gesperrt: keine Macht – der Kasten unten sagt „Freischalten“)
                    '<div class="hh-role">' + (busy ? '<em>unterwegs</em>' : s.own ? 'bereit' : '') + '</div></div>' +
                    '<div class="hh-skks">' + kacheln + '</div></div></div>' +
            '<div class="hh-panel">' +
                '<div class="hh-blk"><h3>Werte · wenn ' + h.name + ' mitkämpft</h3><div class="hh-vals">' + wert('attack', 'Angriff', '+' + st.atk + ' %') + wert('defense', 'Verteidigung', '+' + st.def + ' %') + wert('boots', 'Tempo', '+' + st.spd + ' %') + (st.gef > 0 ? wert('troops', 'Gefolge', '+' + fmtCompact(st.gef)) : '') + '</div>' +
                    '<p class="hh-hint">Verteidigung: weniger eigene Verluste. Gefolge: so viele Truppen kämpfen zusätzlich mit (höchstens so viele, wie der Held anführt) – wächst mit Sternen, deiner Stufe und der Heldenhalle.</p></div>' +
                '<div class="hh-blk"><h3>Sterne</h3>' + hhStars(s.q) + stars + '</div>' +
                '<div class="hh-blk"><div class="hh-skh"><h3>Fähigkeiten</h3>' + (s.own ? '<span class="hh-pts">' + free + (free === 1 ? ' Punkt' : ' Punkte') + ' frei</span>' : '<span class="hh-pts off">nach dem Freischalten</span>') + '</div><div class="hh-sklist">' + skills + '</div>' +
                    (s.own ? '<p class="hh-hint">Jeder halbe Stern gibt 1 Punkt – bei 5 Sternen 10. Das reicht für 2 Fähigkeiten auf Stufe 5. Bisher ' + heroPoints(s) + ' von 10.</p><button type="button" class="hh-reset" data-hh-reset' + (spent ? '' : ' disabled') + '>' + (gemsArmed('hhreset:' + id) ? 'Wirklich? ' + icon('gem') + HERO_RESET_GEMS : 'Fähigkeiten zurücksetzen · ' + icon('gem') + HERO_RESET_GEMS) + '</button>' : '') + '</div>' +
                (s.own ? '<div class="hh-blk"><h3>Wut</h3><div class="hh-qinfo"><span>' + (s.sk[0] ? (s.rage >= 100 ? 'Voll – ' + h.sk[0][0] + ' zündet im nächsten Kampf' : '+' + HERO_RAGE + ' % pro Kampf, den ' + h.name + ' führt') : 'Erst mit ' + h.sk[0][0] + ' auf Stufe 1') + '</span><b>' + Math.round(s.rage || 0) + ' %</b></div><div class="hh-bar hh-rage"><i style="width:' + Math.round(s.rage || 0) + '%"></i></div></div>' : '') +
                hhPartnerBlk(id) + (h.story ? '<div class="hh-blk"><h3>Geschichte</h3><p class="hh-story">' + h.story + '</p></div>' : '') +
            '</div></div>' +
        '<div class="hh-actions">' + (maxed ? '<button class="hh-go" type="button" disabled>5 Sterne erreicht</button>'
            : '<button class="hh-go" type="button" data-hh-up' + (s.sh >= need ? '' : ' disabled') + '><span class="hh-i">' + (s.own ? icon('star') : '+') + '</span>' + (s.own ? 'Aufwerten · ¼ Stern' + (s.q % 2 ? ' + 1 Fähigkeitspunkt' : '') : 'Freischalten') + '<small>' + s.sh + ' / ' + need + ' Splitter</small></button>') + '</div>';
}
function hhSwapHtml(id, s) {                          // übrige Splitter umtauschen: Ziel wählen, alle auf einmal (1:1)
    const ziele = HEROES.filter(x => { const t = heroSt('player', x.id); return x.id !== id && t && !(t.own && t.q >= HERO_MAXQ); }); if (!s.sh || !ziele.length) return '';
    return '<div class="hh-swap"><label>Umtauschen in Splitter für <select data-hh-swap-to>' + ziele.map(x => '<option value="' + x.id + '">' + x.name + '</option>').join('') + '</select></label>' +
        '<button type="button" class="hh-swap-go" data-hh-swap>' + s.sh + ' Splitter tauschen (1:1)</button></div>';
}
function hhPartnerBlk(id) {                           // sein Paar: Partner, Bonus, gemeinsame Geschichte
    const pp = heroPartner(id); if (!pp) return ''; const o = heroById(pp.id), own = heroOwned('player', pp.id);
    return '<div class="hh-blk"><h3>Paar · ' + pp.pair.name + '</h3><div class="hh-pair ki-karte' + (own && heroOwned('player', id) ? ' is-on ki-karte--an' : '') + '"><span class="hh-pair-pics"><button type="button" data-hh="' + pp.id + '" class="' + (own ? '' : 'is-locked') + '">' + heroImg(pp.id) + '</button></span>' +
        '<span class="hh-pair-t"><b>mit ' + o.name + '</b><small>' + o.title + (own ? '' : ' · gesperrt') + ' · zusammen +' + HERO_PAIR_BONUS + ' %</small><em>' + pp.pair.story + '</em></span></div></div>';
}
function renderHeroHall() { const el = document.getElementById('heroHall'); if (el.hidden) return; const top = el.scrollTop; if (!heroHalle('player')) return closeHeroHall(); if (liveHtml(el, hhCur ? hhHero(hhCur) : hhGrid())) el.scrollTop = top; }
function heroHallLive() {                            // (liveTick) neue Splitter, Wut, Stufe, „unterwegs“: nur bei einer Änderung neu zeichnen
    const el = document.getElementById('heroHall'); if (el.hidden) return;
    const sig = JSON.stringify(loadHeroes()) + '|' + hhCur + '|' + playerLvl + '|' + cityLevelSafe('heroes') + '|' + HEROES.map(h => heroBusy('player', h.id) ? 1 : 0).join('');
    if (sig !== el._sig) { el._sig = sig; renderHeroHall(); }
}
function openHeroHall(id) {                          // ohne gebaute Heldenhalle: gar nicht auf, nur der Hinweis (kein leeres Fenster)
    if (!heroHalle('player')) { flashHint('Baue zuerst die Heldenhalle in der Stadt.', 2500); return; }
    const el = document.getElementById('heroHall'); hhCur = id || null; el.hidden = false; renderHeroHall(); el.scrollTop = 0; }
function closeHeroHall() { document.getElementById('heroHall').hidden = true; hhCur = null; if (!document.getElementById('citySheet').hidden) renderCitySheet(); }
document.getElementById('heroHall').addEventListener('click', e => {
    const el = document.getElementById('heroHall');
    if (e.target.closest('[data-hh-close]')) return closeHeroHall();
    const sei = e.target.closest('[data-hh-seite]'); if (sei) { hhSeite = sei.dataset.hhSeite; renderHeroHall(); el.scrollTop = 0; return; }
    if (e.target.closest('[data-hh-back]')) { hhCur = null; renderHeroHall(); el.scrollTop = 0; return; }
    const fr = e.target.closest('[data-hh-frei]');            // „Freischalten“ auf der Karte: gleich freischalten (wie im Helden-Fenster)
    if (fr) { const h = heroById(fr.dataset.hhFrei); if (h && heroDoUnlock('player', h.id)) { sfx('upgrade'); flashHint(h.name + ' ist freigeschaltet!', 2500); } return renderHeroHall(); }
    const c = e.target.closest('[data-hh]'); if (c) { hhCur = c.dataset.hh; renderHeroHall(); el.scrollTop = 0; return; }
    if (!hhCur) return; const h = heroById(hhCur), s = heroSt('player', hhCur);
    const sk = e.target.closest('[data-hh-sk]:not([disabled])');
    if (sk) { if (heroDoSkill('player', hhCur, +sk.dataset.hhSk)) { sfx('upgrade'); flashHint(h.sk[+sk.dataset.hhSk][0] + ' ist jetzt auf Stufe ' + s.sk[+sk.dataset.hhSk] + '.', 2000); } return renderHeroHall(); }
    if (e.target.closest('[data-hh-reset]:not([disabled])')) {
        if (gems < HERO_RESET_GEMS) { flashHint('Zu wenig Edelsteine – Zurücksetzen kostet ' + HERO_RESET_GEMS + '.', 2500); return; }
        if (!gemsWirklich('hhreset:' + hhCur, HERO_RESET_GEMS, e.target.closest('[data-hh-reset]'), true)) return;
        gems -= HERO_RESET_GEMS; s.sk = [0, 0, 0, 0]; saveHeroes(); updateHud(); saveGame(); flashHint('Fähigkeiten von ' + h.name + ' zurückgesetzt – ' + heroPoints(s) + ' Punkte frei.', 2500); return renderHeroHall(); }
    if (e.target.closest('[data-hh-swap]')) { const sel = el.querySelector('[data-hh-swap-to]'), n = s.sh, to = sel && heroById(sel.value);
        if (to && heroDoSwap('player', hhCur, to.id, n)) { sfx('upgrade'); saveGame(); flashHint(n + ' Splitter von ' + h.name + ' sind jetzt Splitter für ' + to.name + '.', 3000); } return renderHeroHall(); }
    if (e.target.closest('[data-hh-up]:not([disabled])')) {
        const was = s.own;
        if (was ? heroDoStep('player', hhCur) : heroDoUnlock('player', hhCur)) { sfx('upgrade');
            flashHint(was ? h.name + ' hat jetzt ' + heroStarTxt(s.q) + (s.q % 2 ? '' : ' – 1 Fähigkeitspunkt dazu') + '.' : h.name + ' ist freigeschaltet!', 2500); }
        return renderHeroHall();
    }
});
function heroSegHtml(attr, cur) {                   // the hero choice for an attack, an army or a field march: the ones you have, with their stars
    const hs = HEROES.filter(h => heroOwned('player', h.id)).sort((a, b) => b.r - a.r || heroSt('player', b.id).q - heroSt('player', a.id).q); if (!hs.length) return '';
    return '<button type="button" ' + attr + '=""' + (!cur ? ' class="on"' : '') + '>Kein Held</button>' + hs.map(h => '<button type="button" ' + attr + '="' + h.id + '"' + (cur === h.id ? ' class="on"' : '') + (heroBusy('player', h.id) && cur !== h.id ? ' disabled' : '') +
        ' style="--hc:' + RARITY_DEFS[h.r].color + '">' + heroImg(h.id) + h.name + '<small>' + icon('star') + heroStarNum(heroSt('player', h.id).q) + '</small></button>').join('');
}
function heroSeg2Html(attr, main, cur) {            // der Zweitheld (Paket E): erst mit Hauptheld; der passende Partner steht vorn und ist markiert
    if (!main) return '';
    const hs = HEROES.filter(h => h.id !== main && heroOwned('player', h.id)).sort((a, b) => !!heroPairOf(main, b.id) - !!heroPairOf(main, a.id) || b.r - a.r || heroSt('player', b.id).q - heroSt('player', a.id).q); if (!hs.length) return '';
    return '<span class="hero-seg2-l">Zweitheld · ' + Math.round(HERO_ZWEIT * 100) + ' % der passiven Fähigkeiten</span><button type="button" ' + attr + '=""' + (!cur ? ' class="on"' : '') + '>Keiner</button>' + hs.map(h => { const p = heroPairOf(main, h.id);
        return '<button type="button" ' + attr + '="' + h.id + '" class="' + (cur === h.id ? 'on' : '') + (p ? ' is-pair' : '') + '"' + (heroBusy('player', h.id) && cur !== h.id ? ' disabled' : '') + (p ? ' title="Paar „' + p.name + '“: +' + HERO_PAIR_BONUS + ' %"' : '') +
            ' style="--hc:' + RARITY_DEFS[h.r].color + '">' + heroImg(h.id) + h.name + '<small>' + (p ? 'Paar +' + HERO_PAIR_BONUS + ' %' : icon('star') + heroStarNum(heroSt('player', h.id).q)) + '</small></button>'; }).join('');
}
function heroChipHtml(id, q) { const h = heroById(id); if (!h) return ''; const rd = RARITY_DEFS[h.r];   // profile + report: a hero with rarity and stars
    return '<span class="ghero" style="--hc:' + rd.color + '">' + heroImg(id) + '<span><b>' + h.name + ' <small>' + h.title + '</small></b><small>' + heroStarTxt(q) + ' · ' + rd.label + '</small></span></span>'; }
