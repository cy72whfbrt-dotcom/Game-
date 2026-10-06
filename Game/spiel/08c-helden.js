// Teil 08c-helden.js: Helden: Splitter, Freischalten, Sterne, Skillpunkte, Helden-Fenster
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
function heroOwned(who, id) { const s = heroSt(who, id); return !!(s && s.own); }
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
             gef: Math.round(5e4 * t.st * (1 + s.q * .15) * levelRewardTroops(L.lvl) / 2e6 * (1 + L.hall * HERO_HALL_GEF / 100)) };
}
function heroPower(who, id) { const h = heroById(id), s = heroSt(who, id); if (!h || !s || !s.own) return 0; return Math.round((4 + s.q) * HERO_TIER[h.r].st * 2500 + s.sk.reduce((a, v) => a + v, 0) * 1200); }
// what every skill does: [the fx it raises, the kind of fight it needs]
const HERO_EFF = { atk: ['atk', 'fight'], loss: ['loss', 'fight'], hosp: ['hosp', 'fight'], gold: ['gold', 'fight'], flee: ['flee', 'base'], ret: ['ret', 'base'], late: ['late', 'base'], defCut: ['def', 'base'],
    spd: ['spd', 'march'], toll: ['toll', 'march'], fieldSpd: ['spd', 'fieldMarch'], bridgeDef: ['def', 'bridge'], gateAtk: ['atk', 'gate'], siegeDef: ['def', 'siege'], siegeAtk: ['atk', 'siege'],
    strongAtk: ['atk', 'strong'], midAtk: ['atk', 'mid'], midLoss: ['loss', 'mid'], guardAtk: ['atk', 'guard'], rulerAtk: ['atk', 'ruler'], templeLoss: ['loss', 'temple'], templeGold: ['gold', 'temple'],
    templeAtk: ['atk', 'temple'], templeHosp: ['hosp', 'temple'], scoutAtk: ['atk', 'scouted'], neutralAtk: ['atk', 'neutral'], fieldAtk: ['atk', 'vsArmy'], fieldGold: ['gold', 'field'],
    fieldLoss: ['loss', 'field'], fieldDef: ['fdef', 'fdefending'], resAtk: ['atk', 'res'], gatherDef: ['fdef', 'gatherDef'], gatherSpd: ['gSpd', 'gather'], carry: ['carry', 'gather'], rage: [null, 'never'] };
const HERO_FX_TXT = { atk: v => '+' + v + ' % Angriff', loss: v => '−' + v + ' % Verluste', def: v => 'Verteidigung −' + v + ' %', hosp: v => '+' + v + ' % ins Krankenhaus', gold: v => '+' + v + ' % Gold',
    flee: v => '+' + v + ' % fliehen', ret: v => 'Rückzug +' + v + ' % Tempo', late: v => v + ' % später bemerkt', spd: v => '+' + v + ' % Tempo', toll: v => '−' + v + ' % Maut',
    fdef: v => '+' + v + ' % Verteidigung', gSpd: v => '+' + v + ' % Sammeln', carry: v => '+' + v + ' % Traglast' };
function heroGefOf(hx, n) { return hx ? Math.min(hx.gef || 0, Math.max(0, n)) : 0; }   // Gefolge: never more than the troops the hero leads (no 1-troop marches with a big following)
const HX0 = { atk: 0, loss: 0, def: 0, hosp: 0, gold: 0, flee: 0, ret: 0, late: 0, spd: 0, toll: 0, fdef: 0, gSpd: 0, carry: 0, gef: 0 };
function heroFx(who, id, ctx, fired, s, mul) {      // → the hero's numbers for this fight or march, with a line for the report per value that counts (mul: der Zweitheld zählt halb)
    const h = heroById(id); s = s || heroSt(who, id); if (!h || !s || !s.own) return null;
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
function heroPeek(who, id, src, target, raw, id2) { const s = heroSt(who, id); if (!s || !s.own) return null; const ctx = heroBaseCtx(who, src, target, raw); return heroDuo(who, heroFx(who, id, ctx, heroWouldFire(s), s), id2, ctx); }
function heroLaunch(who, id, src, target, raw, id2) {   // the hero marches off: a full rage fires the active skill in this fight
    const s = heroSt(who, id); if (!s || !s.own) return null;
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
    const s = id && heroSt(who, id); if (!s || !s.own) return null;
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
function heroDoUnlock(who, id) { const h = heroById(id), s = heroSt(who, id); if (!h || !s || s.own || s.sh < HERO_UNLOCK[h.r]) return false; s.sh -= HERO_UNLOCK[h.r]; s.own = true; s.q = 0; heroSave(who); return true; }
function heroDoStep(who, id) { const h = heroById(id), s = heroSt(who, id); if (!h || !s || !s.own || s.q >= HERO_MAXQ) return false; const c = heroStepCost(h, s.q); if (s.sh < c) return false; s.sh -= c; s.q++; heroSave(who); return true; }
function heroDoSwap(who, from, to, n) {              // übrige Splitter eines Helden mit 5 Sternen → Splitter für einen anderen (1:1, nicht für einen mit 5 Sternen)
    const a = heroSt(who, from), b = heroSt(who, to); n = Math.floor(n);
    if (!a || !b || from === to || !a.own || a.q < HERO_MAXQ || (b.own && b.q >= HERO_MAXQ) || !(n > 0) || n > a.sh) return false;
    a.sh -= n; b.sh += n; heroSave(who); return true;
}
function heroDoSkill(who, id, k) { const s = heroSt(who, id); if (!s || !s.own || !heroFree(s) || s.sk[k] >= 5) return false; s.sk[k]++; heroSave(who); return true; }
function heroCanDo(who, id) { const h = heroById(id), s = heroSt(who, id); if (!h || !s) return false; return s.own ? heroFree(s) > 0 || (s.q < HERO_MAXQ && s.sh >= heroStepCost(h, s.q)) : s.sh >= HERO_UNLOCK[h.r]; }
function heroTag(hx) { if (!hx) return ''; const h = heroById(hx.id), h2 = hx.id2 && heroById(hx.id2); return h ? h.name + ' ' + heroStarTxt(hx.q) + (h2 ? ' & ' + h2.name + (hx.pair ? ' (Paar)' : '') : '') + (hx.fired ? ' · ' + hx.skill + ' gezündet' : '') : ''; }   // one line for the short reports
var previewHero = null, nextAttackHero = null, previewHero2 = null, nextAttackHero2 = null;
// ---- the Heldenhalle screen: a grid of tall rarity cards → one hero with figure, stars, skills and values ----
let hhCur = null;
const hhStars = q => '<span class="hh-qstars">' + [0, 1, 2, 3, 4].map(k => '<i style="--f:' + (k < Math.floor(q / 4) ? 100 : k === Math.floor(q / 4) ? q % 4 * 25 : 0) + '%"></i>').join('') + '</span>';
// ---- hero portraits: one painted SVG bust per hero from a few looks, turned once into a data URL (each <img> is its own document, so the ids never clash) ----
const HERO_LOOK = {   // f woman · age 0-2 · sk skin · ey eyes · hs hair · bd beard · hat · arm armour · wp weapon behind · fr item in front · mk mark
    brunhild: { f: 1, sk: '#f1d0b2', ey: '#4a86c0', hs: 'braids', hat: 'wing', arm: 'mail', wp: 'spear', fr: 'shield' },
    ragna:    { f: 1, age: 1, sk: '#eccaa9', ey: '#2f98a8', hs: 'long', hat: 'crown', arm: 'robe', wp: 'trident', fr: 'pearls' },
    sigrun:   { f: 1, sk: '#c68b5e', ey: '#5a3a1e', hs: 'pony', hat: 'band', arm: 'leather', wp: 'sword', mk: 'scar', br: 1 },
    aldric:   { age: 1, sk: '#d9a982', ey: '#5a4632', hs: 'short', bd: 'full', hat: 'helm', arm: 'plate', wp: 'hammer' },
    kasimir:  { age: 2, sk: '#dfb592', ey: '#4a3a5a', hs: 'long', bd: 'goatee', hat: 'broken', arm: 'royal', wp: 'scepter', gr: '#8a8a90' },
    yrsa:     { f: 1, sk: '#e8c3a2', ey: '#3f9a52', hs: 'long', hat: 'hood', arm: 'robe', wp: 'staff', fr: 'gem', mk: 'rune' },
    ida:      { f: 1, sk: '#f3d4b8', ey: '#5a9a4a', hs: 'pony', hat: 'feather', arm: 'leather', wp: 'walk', mk: 'freckles' },
    bernhard: { age: 2, sk: '#e9c3a1', ey: '#4a5a7a', hs: 'fringe', bd: 'mous', arm: 'coat', mk: 'glasses', fr: 'cross', gr: '#b8b8b8' },
    mira:     { f: 1, sk: '#8d5a3a', ey: '#c09040', hs: 'long', hat: 'hoodd', arm: 'leather', wp: 'bow' },
    nora:     { f: 1, sk: '#ebc19e', ey: '#3a7a9a', hs: 'braids', hat: 'pelt', arm: 'fur', wp: 'spear2' },
    fenn:     { sk: '#e3b48b', ey: '#4a8a5a', hs: 'messy', bd: 'stub', hat: 'bandana', arm: 'vest', wp: 'pick', fr: 'nugget', mk: 'freckles' },
    otto:     { age: 1, fat: 1, sk: '#ecb793', ey: '#5a4a2a', hs: 'fringe', bd: 'walrus', hat: 'cap', arm: 'merchant', fr: 'coin' },
    greta:    { f: 1, age: 2, sk: '#e7c5a9', ey: '#6a8a4a', hs: 'bun', hat: 'scarf', arm: 'shawl', fr: 'herbs', gr: '#d8d8cc' },
    hagen:    { sk: '#c58c6c', ey: '#5a4632', hs: 'bald', bd: 'full', arm: 'mail', wp: 'axe', mk: 'patch', br: 1 },
    wolfram:  { age: 2, sk: '#dcb090', ey: '#5a6a7a', hs: 'short', bd: 'full', hat: 'helm', arm: 'plate', wp: 'sword', mk: 'scar', br: 1 },
    thora:    { f: 1, sk: '#e6be98', ey: '#3a7aa8', hs: 'braids', hat: 'band', arm: 'leather', wp: 'spear2', br: 1 },
    eskil:    { age: 1, sk: '#e0b896', ey: '#7a5aa8', hs: 'long', bd: 'goatee', hat: 'hood', arm: 'robe', wp: 'hammer', fr: 'gem', mk: 'rune' },
    lene:     { f: 1, sk: '#d8a47c', ey: '#2f8a8a', hs: 'bun', hat: 'scarf', arm: 'vest', wp: 'walk', mk: 'freckles' },
    bruno:    { fat: 1, sk: '#d49a74', ey: '#4a3a2a', hs: 'messy', bd: 'walrus', hat: 'pelt', arm: 'fur', wp: 'axe' },
    pia:      { f: 1, sk: '#a8704a', ey: '#2a7a9a', hs: 'pony', hat: 'bandana', arm: 'vest', fr: 'pearls' }
};
const heroPicCache = {};
function heroPic(id) { return heroPicCache[id] || (heroPicCache[id] = 'data:image/svg+xml,' + encodeURIComponent(heroSvg(id))); }
function heroImg(id, cls) { const h = heroById(id); return h ? '<img class="hero-pic' + (cls ? ' ' + cls : '') + '" src="' + heroPic(id) + '" alt="' + h.name + '" draggable="false">' : ''; }
function heroSvg(id) {
    const h = heroById(id), L = HERO_LOOK[id] || {}, rc = RARITY_DEFS[h.r].color, hx = c => c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c, sd = (c, f) => shade(hx(c), f);
    const f = L.f, w = f ? 12.6 : 13.6 + (L.fat ? 1.4 : 0), jw = f ? 7.6 : L.fat ? 12.5 : 10.4, cy = f ? 63 : 65, lx = 50 - w, rx = 50 + w, n = v => Math.round(v * 10) / 10;
    const hair = hx(L.gr || h.hair), hd = sd(hair, .55), sk = L.sk, skd = sd(sk, .72), c1 = h.color, c2 = h.c2, gold = 'url(#gd)', metal = 'url(#mt)', ink = '#1c120c';
    const P = (d, fl, x) => '<path d="' + d + '" fill="' + fl + '"' + (x || '') + '/>', S = (d, st, sw, x) => P(d, 'none', ' stroke="' + st + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"' + (x || '')),
        C = (x, y, r, fl, e) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fl + '"' + (e || '') + '/>', E = (x, y, a, b, fl, e) => '<ellipse cx="' + x + '" cy="' + y + '" rx="' + a + '" ry="' + b + '" fill="' + fl + '"' + (e || '') + '/>',
        op = o => ' opacity="' + o + '"', G = (id, st, a) => '<linearGradient id="' + id + '" ' + (a || 'x1="0" y1="0" x2="0" y2="1"') + '>' + st.map((c, i) => '<stop offset="' + i / (st.length - 1) + '" stop-color="' + c + '"/>').join('') + '</linearGradient>';
    const face = 'M' + lx + ',42C' + lx + ',29 ' + n(50 - w * .55) + ',22.5 50,22.5C' + n(50 + w * .55) + ',22.5 ' + rx + ',29 ' + rx + ',42C' + rx + ',52 ' + n(50 + jw) + ',' + (cy - 5) + ' 50,' + cy + 'C' + n(50 - jw) + ',' + (cy - 5) + ' ' + lx + ',52 ' + lx + ',42Z';
    const bw = L.fat ? 2 : 0, body = 'M2,101C4,86 ' + (18 - bw) + ',77 35,73.5Q50,78 65,73.5C' + (82 + bw) + ',77 96,86 98,101Z';
    let o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>' +
        '<radialGradient id="bg" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="' + sd(rc, 1.25) + '"/><stop offset=".45" stop-color="' + sd(rc, .5) + '"/><stop offset="1" stop-color="#07080c"/></radialGradient>' +
        '<radialGradient id="sk" cx=".4" cy=".36" r=".75"><stop offset="0" stop-color="' + sd(sk, 1.12) + '"/><stop offset=".55" stop-color="' + sk + '"/><stop offset="1" stop-color="' + skd + '"/></radialGradient>' +
        G('hr', [sd(hair, 1.35), hair, hd]) + G('sh', [skd + '00', skd + '00', sd(sk, .45) + '88'], 'x1="0" y1="0" x2="1" y2=".2"') + G('ar', [sd(c1, 1.45), c1, sd(c1, .45)]) + G('cl', [sd(c2, 1.5), c2, sd(c2, .5)]) +
        G('mt', ['#fbfdff', '#b9c2cc', '#59616b', '#a9b2bc'], 'x1="0" y1="0" x2=".4" y2="1"') + G('gd', ['#fff0b0', '#e6b440', '#8a5a14'], 'x1="0" y1="0" x2=".3" y2="1"') + G('wd', ['#9a6a3a', '#5a3a1e']) +
        G('rim', [rc + '00', rc + '00', sd(rc, 1.6)], 'x1="0" y1="0" x2="1" y2=".3"') + G('vg', ['#0000', '#0000', '#000a']) +
        '<clipPath id="fc"><path d="' + face + '"/></clipPath><pattern id="ml" width="2.4" height="2" patternUnits="userSpaceOnUse"><path d="M0,1a1.2,1 0 0 0 2.4,0" fill="none" stroke="#1a1d22" stroke-width=".45" opacity=".6"/></pattern></defs>' +
        '<rect width="100" height="100" fill="url(#bg)"/>' + S('M8,6L40,50M92,4L60,50M50,0V40', sd(rc, 1.5), 6, op(.07)) + E(50, 40, 30, 30, sd(rc, 1.4), op(.18));
    // weapon behind the shoulders
    const wp = L.wp;
    if (wp === 'sword') o += P('M83,80L81.5,14L84,6L86.5,14L85,80Z', metal) + S('M84,12V78', '#fff', .5, op(.7));
    if (wp === 'spear' || wp === 'spear2') o += S('M84,100L86,18', 'url(#wd)', 2.6) + P('M86,4Q90.5,12 87.2,22L84.6,22Q82,12 86,4Z', metal) + (wp === 'spear2' ? S('M85.5,24L81,32M85.5,24L90,31', '#e8e2d0', .9) : P('M83.4,22h5v2.4h-5z', gold));
    if (wp === 'trident') o += S('M84,100V20', gold, 2.6) + S('M77,22Q84,26 91,22M77,22V10M84,24V4M91,22V10', gold, 2) + P('M75.6,11L77,5L78.4,11ZM82.6,6L84,0L85.4,6ZM89.6,11L91,5L92.4,11Z', gold);
    if (wp === 'hammer') o += S('M72,100L86,24', 'url(#wd)', 2.8) + P('M77,14L95,19L92.6,29L74.6,24Z', metal) + P('M83,19l5,1.3l-1.3,5l-5,-1.3z', sd(c1, 1.2));
    if (wp === 'axe') o += S('M70,100L84,20', 'url(#wd)', 2.8) + P('M82,16C92,12 99,20 97,32C92,28 88,28 83,30Z', metal) + S('M83,17L81.6,31', '#2a2d33', 1.4);
    if (wp === 'scepter') o += S('M82,100L85,26', gold, 2.2) + C(85.3, 21, 4.6, gold) + C(85.3, 21, 2.2, '#c02a3a') + C(84, 19.6, .9, '#fff', op(.8));
    if (wp === 'staff') o += E(84, 14, 9, 9, '#8f8', op(.25)) + S('M82,100L84,20', 'url(#wd)', 2.6) + S('M84,21Q79,14 84,8Q89,14 84,21', 'url(#wd)', 1.6) + C(84, 14, 3, '#7af09a') + C(83, 13, 1, '#fff');
    if (wp === 'walk') o += S('M85,100L83,14', 'url(#wd)', 2.4) + S('M83,18q4,1 5,5M83,18q3,4 1,8', '#d84a3a', 1.2);
    if (wp === 'pick') o += S('M72,100L84,24', 'url(#wd)', 2.6) + P('M70,22Q84,12 99,26Q85,20 70,24Z', metal);
    if (wp === 'bow') o += S('M16,96Q-2,50 22,8', 'url(#wd)', 2.8) + S('M16,96L22,8', '#e8e0c8', .5) + S('M78,76L86,18M82,76L91,20M86,78L95,24', 'url(#wd)', 1.2) + P('M84,20l2,-6l2,6l-2,-1.5zM89,22l2,-6l2,6l-2,-1.5zM93.4,26l2,-6l2,6l-2,-1.5z', '#e8e2d0');
    // hair and hoods behind the head
    const long = L.hs === 'long' || L.hs === 'braids', hood = L.hat === 'hood' || L.hat === 'hoodd', hc = L.hat === 'hoodd' ? '#2a3020' : c2;
    if (long && !hood) o += P('M' + (lx - 3) + ',40C' + (lx - 6) + ',22 42,15 50,15C58,15 ' + (rx + 6) + ',22 ' + (rx + 3) + ',40C' + (rx + 4) + ',56 ' + (rx + (L.hs === 'long' ? 8 : 3)) + ',70 ' + (rx + 5) + ',' + (L.hs === 'long' ? 84 : 72) + 'L' + (lx - 5) + ',' + (L.hs === 'long' ? 84 : 72) + 'C' + (lx - (L.hs === 'long' ? 8 : 3)) + ',70 ' + (lx - 4) + ',56 ' + (lx - 3) + ',40Z', hd);
    if (hood) o += P('M' + (lx - 9) + ',86C' + (lx - 12) + ',50 ' + (lx - 8) + ',14 50,12C' + (rx + 8) + ',14 ' + (rx + 12) + ',50 ' + (rx + 9) + ',86Z', 'url(#cl)') + (L.hs === 'long' ? P('M' + (lx - 1) + ',36C' + (lx - 4) + ',52 ' + (lx - 3) + ',66 ' + (lx + 2) + ',76L' + (lx + 6) + ',74C' + (lx + 2) + ',60 ' + (lx + 1) + ',46 ' + (lx + 3) + ',36Z', 'url(#hr)') : '');
    if (L.hat === 'pelt') o += P('M' + (lx - 8) + ',84C' + (lx - 12) + ',50 ' + (lx - 6) + ',16 50,14C' + (rx + 6) + ',16 ' + (rx + 12) + ',50 ' + (rx + 8) + ',84Z', '#6a6258');
    if (L.hs === 'pony') o += P('M' + (rx - 2) + ',26C' + (rx + 10) + ',24 ' + (rx + 12) + ',44 ' + (rx + 7) + ',60C' + (rx + 5) + ',50 ' + (rx + 3) + ',40 ' + (rx - 3) + ',34Z', 'url(#hr)');
                // body: armour, robe or coat
    o += P(body, 'url(#ar)'); const arm = L.arm;
    if (arm === 'mail') o += P(body, 'url(#mt)', op(.9)) + P(body, 'url(#ml)') + P('M2,101C4,90 12,82 22,79L30,101Z', 'url(#ar)') + P('M98,101C96,90 88,82 78,79L70,101Z', 'url(#ar)') + (id === 'brunhild' ? P('M28,76Q50,86 72,76Q66,72 50,74Q34,72 28,76Z', '#d8cdb8') + S('M30,77q3,3 6,1M38,79q3,3 6,1M48,80q3,2 5,0M56,79q3,3 6,0M64,77q3,3 5,0', '#8a7a64', .6) : S('M24,78L70,101', '#4a3322', 4) + C(40, 85.5, 1.6, gold));
    if (arm === 'plate') o += P('M2,101C3,86 12,78 26,76C34,76 38,82 36,92L30,101Z', metal) + P('M98,101C97,86 88,78 74,76C66,76 62,82 64,92L70,101Z', metal) + P('M40,78L60,78L58,101L42,101Z', 'url(#ar)') + S('M50,79V101', sd(c1, 1.5), .8) + C(22, 84, .9, '#333') + C(78, 84, .9, '#333');
    if (arm === 'robe') o += P('M38,74L50,92L62,74L65,75L50,98L35,75Z', gold) + S('M8,92Q30,86 36,101M92,92Q70,86 64,101', sd(c1, .5), .8, op(.6));
    if (arm === 'leather') o += P('M2,101C4,86 18,77 35,73.5L40,80Q22,84 14,101Z', 'url(#cl)') + P('M98,101C96,86 82,77 65,73.5L60,80Q78,84 86,101Z', 'url(#cl)') + S('M34,76L64,101', '#3a2616', 3.2) + P('M44,83h4.4v4h-4.4z', gold, ' transform="rotate(40 46 85)"');
    if (arm === 'royal') o += P('M22,78Q50,92 78,78Q84,84 82,90Q50,102 18,90Q16,84 22,78Z', '#f4f0e6') + [28, 38, 50, 62, 72].map((x, i) => P('M' + x + ',' + (86 + (i % 2) * 3) + 'l.8,2.4h-1.6z', '#1a1a1a')).join('') + S('M34,92Q50,99 66,92', gold, 1.2) + C(50, 97, 2.2, gold);
    if (arm === 'coat') o += P('M36,74L50,84L64,74L60,101L40,101Z', '#ece6da') + P('M36,74L46,90L42,101L28,101Z', sd(c1, .7)) + P('M64,74L54,90L58,101L72,101Z', sd(c1, .7)) + C(48, 94, .8, gold) + C(52, 94, .8, gold);
    if (arm === 'fur') o += P('M4,101C6,86 16,76 34,72Q50,82 66,72C84,76 94,86 96,101Q88,90 80,94Q72,86 64,92Q56,86 50,92Q44,86 36,92Q28,86 20,94Q12,90 4,101Z', '#7a6a58') + S('M14,90l3,-4M24,86l2,-5M76,86l-2,-5M86,90l-3,-4M40,86l1,-5M60,86l-1,-5', '#b8a890', .8);
    if (arm === 'vest') o += P('M38,74L50,82L62,74L60,101L40,101Z', '#e8dcc4') + P('M36,74L47,86L44,101L30,101Z', '#6a4a2a') + P('M64,74L53,86L56,101L70,101Z', '#6a4a2a') + P('M42,74Q50,82 58,74L54,80Q50,84 46,80Z', '#c04a2a');
    if (arm === 'merchant') o += P('M4,101C6,84 20,74 36,72Q50,80 64,72C80,74 94,84 96,101Q84,86 70,84Q60,90 50,90Q40,90 30,84Q16,86 4,101Z', '#6a4a30') + S('M30,86Q50,100 70,86', gold, 1.4) + C(50, 94, 3, gold);
    if (arm === 'shawl') o += P('M6,101C8,86 20,76 36,72Q50,80 64,72C80,76 92,86 94,101Q72,86 50,101Q28,86 6,101Z', '#6a5a3a') + S('M18,92l3,3M26,88l3,3M74,88l-3,3M82,92l-3,3', '#8a7a5a', .8);
    o += S(body, 'url(#rim)', 1.4);
    // neck, ears, face
    o += P('M' + (50 - jw * .62) + ',56L' + (50 - jw * .6) + ',74Q50,79 ' + (50 + jw * .6) + ',74L' + (50 + jw * .62) + ',56Z', skd) + P('M' + (50 - jw * .6) + ',62Q50,70 ' + (50 + jw * .6) + ',62L' + (50 + jw * .6) + ',58L' + (50 - jw * .6) + ',58Z', sd(sk, .55), op(.6));
    if (!hood && L.hat !== 'scarf' && L.hat !== 'pelt') o += E(lx + .3, 45, 2.4, 4.2, skd) + E(rx - .3, 45, 2.4, 4.2, skd) + E(lx + .6, 45, 1, 2.4, sd(sk, .5), op(.6));
    const ey = 44, eL = 44.2, eR = 55.8, ang = L.br ? 1.2 : 0;
    o += P(face, 'url(#sk)') + S(face, 'url(#rim)', .9, op(.8)) + '<g clip-path="url(#fc)">' + P(face, 'url(#sh)') + E(50, 25, 16, 5, sd(sk, .5), op(.3)) + E(43, 33, 5, 3, '#fff', op(.14)) + E(42.5, 52, 3.4, 2.2, '#e0706a', op(f ? .3 : .16)) + E(57.5, 52, 3.4, 2.2, '#e0706a', op(f ? .3 : .16)) +
        (L.bd === 'stub' || L.bd === 'full' ? P('M' + lx + ',48Q50,58 ' + rx + ',48V70H' + lx + 'Z', hd, op(.28)) : '') + E(50, cy + 1, 9, 3, sd(sk, .5), op(.3)) + '</g>';
    // eyes, brows, nose, mouth
    [eL, eR].forEach((x, i) => { const s = i ? 1 : -1, almond = 'M' + (x - 3.1) + ',' + ey + 'Q' + x + ',' + (ey - 2.7) + ' ' + (x + 3.1) + ',' + ey + 'Q' + x + ',' + (ey + 2.1) + ' ' + (x - 3.1) + ',' + ey + 'Z';
        if (L.mk === 'patch' && !i) { o += P('M' + (x - 3.8) + ',' + (ey - 3) + 'Q' + x + ',' + (ey - 4.2) + ' ' + (x + 3.8) + ',' + (ey - 3) + 'Q' + (x + 3.4) + ',' + (ey + 3.6) + ' ' + x + ',' + (ey + 3.2) + 'Q' + (x - 3.6) + ',' + (ey + 3) + ' ' + (x - 3.8) + ',' + (ey - 3) + 'Z', '#161616') + S('M' + (x - 3.4) + ',' + (ey - 2.6) + 'L' + (lx - 1) + ',' + (ey - 6) + 'M' + (x + 3.4) + ',' + (ey - 2.6) + 'L' + (rx + 1) + ',' + (ey - 7.5), '#161616', .7); return; }
        o += '<clipPath id="e' + i + '"><path d="' + almond + '"/></clipPath>' + P(almond, '#f4ede4') + '<g clip-path="url(#e' + i + ')">' + C(x, ey - .1, 1.6, L.ey) + C(x, ey - .1, 1.6, 'none', ' stroke="' + sd(L.ey, .5) + '" stroke-width=".4"') + C(x, ey - .1, .78, '#0c0806') + C(x - .6, ey - .8, .5, '#fff') + P('M' + (x - 4) + ',' + (ey - 3) + 'H' + (x + 4) + 'V' + (ey - 1) + 'H' + (x - 4) + 'Z', sd(sk, .4), op(.35)) + '</g>' +
            S('M' + (x - 3.3) + ',' + (ey + .2) + 'Q' + x + ',' + (ey - 2.9) + ' ' + (x + 3.3) + ',' + (ey + .1) + (f ? 'l' + s * .9 + ',-.9' : ''), ink, f ? 1.05 : .8) + S('M' + (x - 2.6) + ',' + (ey - 2) + 'Q' + x + ',' + (ey - 3.9) + ' ' + (x + 2.6) + ',' + (ey - 2), sd(sk, .5), .45, op(.55)) +
            (L.age ? S('M' + (x - 2.4) + ',' + (ey + 2) + 'Q' + x + ',' + (ey + 3.1) + ' ' + (x + 2.4) + ',' + (ey + 2), sd(sk, .55), .4, op(.6)) + S('M' + (x + s * 3.8) + ',' + (ey - .8) + 'l' + s * 1.6 + ',-.8M' + (x + s * 3.8) + ',' + (ey + .4) + 'l' + s * 1.6 + ',.5', sd(sk, .55), .35, op(.6)) : '') +
            S('M' + (x - s * 3.6) + ',' + (ey - 4.2 - (L.age > 1 ? 0 : .4)) + 'Q' + (x + s * .4) + ',' + (ey - 6.8) + ' ' + (x + s * 3.4) + ',' + (ey - 4.6 + ang), L.age > 1 ? hair : sd(hair, .7), f ? .9 : 1.5); });
    o += S('M50.8,45.5L51,51', '#fff', 1.1, op(.2)) + S('M49.2,47Q48,51 47.3,52.2Q48.8,53.8 50,53.3Q51.2,53.8 52.7,52.2', sd(sk, .5), .75, op(.75)) + E(48.3, 52.6, .7, .4, sd(sk, .4), op(.6)) + E(51.7, 52.6, .7, .4, sd(sk, .4), op(.6));
    const lip = f ? '#b8505a' : sd(sk, .72), my = 57.6;
    o += P('M45.8,' + my + 'Q48,' + (my - 1.4) + ' 50,' + (my - .6) + 'Q52,' + (my - 1.4) + ' 54.2,' + my + 'Q50,' + (my + .5) + ' 45.8,' + my + 'Z', sd(lip, .85)) + P('M46.4,' + (my + .2) + 'Q50,' + (my + 3) + ' 53.6,' + (my + .2) + 'Q50,' + (my + .9) + ' 46.4,' + (my + .2) + 'Z', lip) + S('M45.8,' + my + 'Q50,' + (my + .6) + ' 54.2,' + my, sd(lip, .5), .6) + E(50, my + 1.9, 1.6, .5, '#fff', op(f ? .25 : .1));
    if (L.age > 1) o += S('M45,50Q43.6,54 44.8,57.6M55,50Q56.4,54 55.2,57.6M44,33.5Q50,32.4 56,33.5M45,31Q50,30 55,31', sd(sk, .6), .45, op(.55));
    if (L.mk === 'scar') o += S('M57.5,48L61,55', '#8a4a3a', .9, op(.8)) + S('M58,49.6l1.6,-.6M59,51.8l1.6,-.6M60,54l1.4,-.6', '#8a4a3a', .45);
    if (L.mk === 'freckles') o += [[42, 49], [44, 50.4], [41.4, 51.2], [58, 49], [56, 50.4], [58.6, 51.2], [47.6, 48.2], [52.4, 48.2]].map(p => C(p[0], p[1], .4, sd(sk, .6), op(.8))).join('');
    if (L.mk === 'rune') o += S('M50,33v4.4M48.2,34.4l1.8,1.8l1.8,-1.8', '#6af09a', .7) + C(50, 35, 3, '#6af09a', op(.15));
    if (L.mk === 'glasses') o += C(eL, ey, 3.6, '#bfe4ff', op(.18)) + C(eR, ey, 3.6, '#bfe4ff', op(.18)) + C(eL, ey, 3.6, 'none', ' stroke="#b89a4a" stroke-width=".7"') + C(eR, ey, 3.6, 'none', ' stroke="#b89a4a" stroke-width=".7"') + S('M47.8,43.4Q50,42.2 52.2,43.4M' + (eL - 3.6) + ',43.4L' + (lx + .4) + ',42.6M' + (eR + 3.6) + ',43.4L' + (rx - .4) + ',42.6', '#b89a4a', .6);
    // beards
    const bd = L.bd, mus = 'M44.4,58.6Q46,54.4 50,55.8Q54,54.4 55.6,58.6Q53,56.8 50,57.2Q47,56.8 44.4,58.6Z';
    if (bd === 'full') o += P('M' + lx + ',44C' + lx + ',58 42,' + (cy + 6) + ' 50,' + (cy + 7) + 'C58,' + (cy + 6) + ' ' + rx + ',58 ' + rx + ',44C' + (rx - 1.4) + ',52 57,53.6 55.6,57Q55,61.4 50,61.6Q45,61.4 44.4,57C43,53.6 ' + (lx + 1.4) + ',52 ' + lx + ',44Z', 'url(#hr)') + S('M44,62q2,4 3,6M50,63v6M56,62q-2,4 -3,6M' + (lx + 3) + ',54q2,5 5,8M' + (rx - 3) + ',54q-2,5 -5,8', hd, .5, op(.6)) + P(mus, 'url(#hr)');
    if (bd === 'goatee') o += P(mus, 'url(#hr)') + P('M46.6,60.8Q50,62.4 53.4,60.8L52,' + (cy + 5) + 'Q50,' + (cy + 8) + ' 48,' + (cy + 5) + 'Z', 'url(#hr)');
    if (bd === 'mous') o += P(mus, 'url(#hr)');
    if (bd === 'walrus') o += P('M42,61Q43,54 50,55.2Q57,54 58,61Q55,57.6 50,58Q45,57.6 42,61Z', 'url(#hr)') + S('M46,57l-1,2M54,57l1,2M50,56.4v1.6', hd, .4);
    // hair in front
    const hs = L.hs, cap = 'M' + (lx - 1.4) + ',45C' + (lx - 2) + ',27 42,19.5 50,19.5C58,19.5 ' + (rx + 2) + ',27 ' + (rx + 1.4) + ',45';
    if (hs === 'long' || hs === 'braids' || hs === 'pony' || hs === 'bun') o += P(cap + 'C' + (rx - .4) + ',36 ' + (rx - 4) + ',30 53,28.4Q47,31.6 ' + (lx + 2.6) + ',36C' + (lx + 1.4) + ',39 ' + (lx + .6) + ',42 ' + (lx - 1.4) + ',45Z', 'url(#hr)') + S('M50,20Q47,24 45,30M52,21Q56,24 60,28M46,21Q40,24 ' + (lx + 1) + ',34', hd, .5, op(.5)) +
        (hs === 'long' && !hood ? P('M' + (lx - 1.4) + ',42C' + (lx - 3) + ',54 ' + (lx - 2) + ',64 ' + (lx + 2) + ',74L' + (lx + 4) + ',66C' + (lx + 1) + ',58 ' + (lx + .4) + ',50 ' + (lx + 1) + ',42Z', 'url(#hr)') + P('M' + (rx + 1.4) + ',42C' + (rx + 3) + ',54 ' + (rx + 2) + ',64 ' + (rx - 2) + ',74L' + (rx - 4) + ',66C' + (rx - 1) + ',58 ' + (rx - .4) + ',50 ' + (rx - 1) + ',42Z', 'url(#hr)') : '');
    if (hs === 'braids') [lx - .5, rx + .5].forEach(x => { for (let k = 0; k < 6; k++) o += E(x, 48 + k * 5, 2.8 - k * .15, 3, 'url(#hr)') + S('M' + (x - 2) + ',' + (48 + k * 5) + 'q2,2 4,-.4', hd, .45); o += P('M' + (x - 1.6) + ',77l1.6,5l1.6,-5z', 'url(#hr)') + P('M' + (x - 2) + ',75.6h4v1.6h-4z', id === 'nora' ? '#6a4a2a' : gold); });
    if (hs === 'short') o += P(cap + 'C' + rx + ',38 ' + (rx - 2) + ',31 56,30Q50,31.6 44,30C' + (lx + 2) + ',31 ' + lx + ',38 ' + (lx - 1.4) + ',45Z', 'url(#hr)');
    if (hs === 'messy') o += P(cap + 'L' + (rx - 1) + ',38L' + (rx - 4) + ',34L57,34L55,30L51,33L47,29.6L44,33L41,31L' + (lx + 2) + ',36L' + (lx + 1) + ',40Z', 'url(#hr)');
    if (hs === 'fringe') o += P('M' + (lx - 1.6) + ',47C' + (lx - 2.4) + ',38 ' + (lx - 1) + ',32 ' + (lx + 3) + ',29C' + (lx + 2) + ',34 ' + (lx + 1.4) + ',40 ' + (lx + 1) + ',46Z', 'url(#hr)') + P('M' + (rx + 1.6) + ',47C' + (rx + 2.4) + ',38 ' + (rx + 1) + ',32 ' + (rx - 3) + ',29C' + (rx - 2) + ',34 ' + (rx - 1.4) + ',40 ' + (rx - 1) + ',46Z', 'url(#hr)') + E(45, 26, 4, 2, '#fff', op(.18));
    if (hs === 'bald') o += E(44, 27, 4.4, 2.4, '#fff', op(.2)) + P('M' + (lx - .4) + ',47C' + (lx - 1) + ',38 ' + (lx + 1) + ',33 ' + (lx + 3) + ',31L' + (lx + 2) + ',44Z', hd, op(.4)) + P('M' + (rx + .4) + ',47C' + (rx + 1) + ',38 ' + (rx - 1) + ',33 ' + (rx - 3) + ',31L' + (rx - 2) + ',44Z', hd, op(.4));
    // headgear
    const hat = L.hat, dome = 'M' + (lx - 2) + ',36C' + (lx - 2) + ',19 42,13 50,13C58,13 ' + (rx + 2) + ',19 ' + (rx + 2) + ',36Q50,31 ' + (lx - 2) + ',36Z';
    if (hat === 'wing') o += [-1, 1].map(s => P('M' + (50 + s * (w + 1)) + ',30C' + (50 + s * (w + 9)) + ',28 ' + (50 + s * (w + 15)) + ',16 ' + (50 + s * (w + 13)) + ',3C' + (50 + s * (w + 10)) + ',12 ' + (50 + s * (w + 6)) + ',15 ' + (50 + s * (w - 1)) + ',20Z', '#f4f1ea') + S('M' + (50 + s * (w + 2)) + ',27q' + s * 6 + ',-3 ' + s * 9 + ',-14M' + (50 + s * (w + 1)) + ',23q' + s * 5 + ',-3 ' + s * 8 + ',-12', '#a8a498', .5)).join('') + P(dome, metal) + P('M' + (lx - 2.4) + ',36Q50,30.6 ' + (rx + 2.4) + ',36L' + (rx + 2.2) + ',32.6Q50,27 ' + (lx - 2.2) + ',32.6Z', gold) + S('M50,14V30', '#fff', .7, op(.6));
    if (hat === 'helm') o += P(dome, metal) + P('M' + (lx - 9) + ',35Q50,27 ' + (rx + 9) + ',35Q' + (rx + 6) + ',39.4 50,37.6Q' + (lx - 6) + ',39.4 ' + (lx - 9) + ',35Z', metal) + S('M' + (lx - 8.6) + ',35.2Q50,39 ' + (rx + 8.6) + ',35.2', '#3a3f46', .6) + C(41, 31, .6, '#333') + C(50, 30, .6, '#333') + C(59, 31, .6, '#333') + S('M47,15Q44,22 44,29', '#fff', .8, op(.5));
    if (hat === 'crown') o += P('M' + (lx + .4) + ',31L' + (lx - 1) + ',15L42,24L45.4,11L50,22L54.6,11L58,24L' + (rx + 1) + ',15L' + (rx - .4) + ',31Q50,28 ' + (lx + .4) + ',31Z', gold) + C(lx - 1, 14.4, 1.4, '#f4f0ff') + C(45.4, 10.4, 1.4, '#f4f0ff') + C(54.6, 10.4, 1.4, '#f4f0ff') + C(rx + 1, 14.4, 1.4, '#f4f0ff') + C(50, 26.4, 2, '#2fb0d0') + C(49.4, 25.8, .6, '#fff');
    if (hat === 'broken') o += '<g transform="rotate(-9 50 26)">' + P('M' + (lx + 1) + ',31L' + lx + ',17L43,24L46,15L48,21L50,18L52.4,24L' + (rx + 1) + ',15L' + (rx - .4) + ',31Q50,28 ' + (lx + 1) + ',31Z', 'url(#gd)', op(.85)) + S('M48,21L50,18L52.4,24', '#5a3a10', .5) + C(44, 28.4, 1.3, '#8a2a4a') + C(56, 28.4, 1.3, '#8a2a4a') + '</g>';
    if (hood) o += S('M' + (lx - 1) + ',66C' + (lx - 4) + ',40 ' + (lx - 1) + ',21 50,19.6C' + (rx + 1) + ',21 ' + (rx + 4) + ',40 ' + (rx + 1) + ',66', sd(hc, 1.3), 4.4) + S('M' + (lx - 3.2) + ',66C' + (lx - 6) + ',40 ' + (lx - 3) + ',18 50,16.8', sd(hc, .6), 1, op(.6)) +
        (hat === 'hood' ? S('M' + (lx + 1) + ',33Q50,25 ' + (rx - 1) + ',33', gold, 1.2) + C(50, 28.4, 1.5, '#6af09a') : P('M' + lx + ',40Q50,26 ' + rx + ',40L' + rx + ',30Q50,20 ' + lx + ',30Z', '#000', op(.35)));
    if (hat === 'band') o += S('M' + (lx - .6) + ',33Q50,26.6 ' + (rx + .6) + ',33', '#b8282a', 2) + P('M' + (rx + .4) + ',32q5,1 7,6q-4,-2 -7,-3z', '#b8282a');
    if (hat === 'feather') o += P('M' + (rx - 1) + ',28C' + (rx + 8) + ',18 ' + (rx + 16) + ',10 ' + (rx + 20) + ',3C' + (rx + 14) + ',16 ' + (rx + 8) + ',24 ' + (rx + 1) + ',31Z', '#d84a3a') + S('M' + (rx) + ',29.4C' + (rx + 8) + ',20 ' + (rx + 14) + ',12 ' + (rx + 19) + ',4', '#f4e0c0', .5) +
        P('M' + (lx - 3) + ',32C' + (lx - 1) + ',17 ' + (rx - 2) + ',13 ' + (rx + 3) + ',26Q' + (rx + 5) + ',32 ' + (rx + 3) + ',32Q50,26.6 ' + (lx - 3) + ',32Z', 'url(#ar)') + S('M' + (lx - 2.6) + ',32Q50,27 ' + (rx + 3) + ',32', '#3a2616', 1.6);
    if (hat === 'pelt') o += P('M' + (lx - 3) + ',44C' + (lx - 5) + ',24 42,12 50,12C58,12 ' + (rx + 5) + ',24 ' + (rx + 3) + ',44Q' + (rx - 1) + ',32 50,30.6Q' + (lx + 1) + ',32 ' + (lx - 3) + ',44Z', '#7a7064') + P('M' + (lx - 1) + ',22L' + (lx - 2) + ',8L' + (lx + 7) + ',16ZM' + (rx + 1) + ',22L' + (rx + 2) + ',8L' + (rx - 7) + ',16Z', '#5a5248') + P('M42,26Q50,19 58,26Q55,33 50,34Q45,33 42,26Z', '#8a8072') + E(50, 32, 2, 1.3, '#1a1a1a') + E(44.4, 24.4, 1, .6, '#e8c040') + E(55.6, 24.4, 1, .6, '#e8c040') + S('M' + (lx - 2) + ',30q2,-3 4,-2M' + (rx + 2) + ',30q-2,-3 -4,-2M46,16q4,-2 8,0', '#b0a898', .6);
    if (hat === 'scarf') o += P('M' + (lx - 2.4) + ',60C' + (lx - 5) + ',40 ' + (lx - 2) + ',15 50,15C' + (rx + 2) + ',15 ' + (rx + 5) + ',40 ' + (rx + 2.4) + ',60Q' + (rx - 2) + ',52 ' + (rx - 1) + ',42C' + (rx - 1) + ',32 ' + (rx - 5) + ',28 50,28C' + (lx + 5) + ',28 ' + (lx + 1) + ',32 ' + (lx + 1) + ',42Q' + (lx + 2) + ',52 ' + (lx - 2.4) + ',60Z', 'url(#ar)') +
        P('M' + (lx + 1) + ',37C' + (lx + 2) + ',31 44,29 50,28.6C56,29 ' + (rx - 2) + ',31 ' + (rx - 1) + ',37Q50,30.6 ' + (lx + 1) + ',37Z', 'url(#hr)') + [[40, 21], [50, 18.6], [60, 21], [36, 30], [64, 30], [45, 24], [55, 24]].map(p => C(p[0], p[1], .9, '#f4e6c8', op(.7))).join('') + P('M' + (lx + 3) + ',60Q50,66 ' + (rx - 3) + ',60L' + (rx - 5) + ',70Q50,74 ' + (lx + 5) + ',70Z', 'url(#ar)');
    if (hat === 'cap') o += P('M' + (lx - 4) + ',30C' + (lx - 6) + ',16 ' + (rx + 8) + ',10 ' + (rx + 7) + ',26Q' + (rx + 4) + ',31 ' + (rx + 1) + ',30Q50,26 ' + (lx - 4) + ',30Z', '#8e2c2c') + E(46, 19, 7, 3, '#fff', op(.15)) + S('M' + (lx - 3.6) + ',30Q50,25.4 ' + (rx + 1) + ',30', gold, 1.6) + P('M' + (rx - 2) + ',22c6,-10 12,-12 16,-12c-4,4 -8,10 -14,15z', '#f4efe2');
    if (hat === 'bandana') o += P('M' + (lx - 1.6) + ',35C' + (lx - 1) + ',24 44,19.4 50,19.4C56,19.4 ' + (rx + 1) + ',24 ' + (rx + 1.6) + ',35Q50,29 ' + (lx - 1.6) + ',35Z', '#3a6a9a') + [[44, 25], [52, 23], [58, 28], [40, 31]].map(p => C(p[0], p[1], .8, '#e8f0ff', op(.8))).join('') + P('M' + (rx + 1) + ',33l6,2l-2,5z', '#3a6a9a');
    // what the hero carries in front
    const fr = L.fr;
    if (fr === 'shield') o += C(16, 90, 19, 'url(#gd)') + C(16, 90, 16.6, 'url(#ar)') + S('M16,74V106M0,90H32', '#f0e6d0', 2.6, op(.8)) + C(16, 90, 5, metal) + C(14.6, 88.6, 1.4, '#fff', op(.8)) + C(16, 90, 19, 'none', ' stroke="url(#rim)" stroke-width="1"');
    if (fr === 'pearls') o += [...Array(11)].map((_, i) => { const a = Math.PI * (.12 + i * .076); return C(n(50 - Math.cos(a) * 11), n(71 + Math.sin(a) * 7), 1.1, '#f6f2ff') + C(n(49.7 - Math.cos(a) * 11), n(70.6 + Math.sin(a) * 7), .35, '#fff'); }).join('') + P('M50,79l3,4l-3,4l-3,-4z', '#2fb0d0');
    if (fr === 'gem') o += S('M40,74Q50,86 60,74', gold, .7) + C(50, 84, 6, '#6af09a', op(.25)) + P('M50,79l3.4,4.6l-3.4,4.6l-3.4,-4.6z', '#3ad07a') + P('M50,79l1.6,4.6l-1.6,1.2z', '#dfffe8', op(.7));
    if (fr === 'cross') o += C(32, 88, 5.4, '#f4f0e8') + P('M31,84h2v3h3v2h-3v3h-2v-3h-3v-2h3z', '#c82a2a');
    if (fr === 'coin') o += C(82, 88, 9.4, 'url(#gd)') + C(82, 88, 7, 'none', ' stroke="#8a5a14" stroke-width=".8"') + P('M78,91l-1,-6l2.6,2.4l2.4,-4l2.4,4l2.6,-2.4l-1,6z', '#8a5a14', op(.8)) + E(79, 84, 2.4, 1.2, '#fff', op(.5));
    if (fr === 'herbs') o += S('M76,101L82,80M80,101L88,82M84,101L92,86', '#4a6a2a', 1) + [[82, 80], [88, 82], [92, 86], [79, 86], [86, 88], [90, 93]].map((p, i) => P('M' + p[0] + ',' + p[1] + 'q' + (i % 2 ? 4 : -4) + ',-2 ' + (i % 2 ? 2 : -2) + ',-6q-3,2 -2,6z', i % 3 ? '#6aa04a' : '#9ac86a')).join('') + C(88, 80, 1.2, '#c06ac0') + C(91, 84, 1, '#f0e060') + S('M77,96l6,1', '#c8a060', 1.4);
    if (fr === 'nugget') o += P('M76,92l4,-6l7,-1l5,4l-1,6l-7,3l-6,-1z', 'url(#gd)') + P('M80,86l3,3l4,-4', '#fff8c0', op(.6));
    return o + '<rect width="100" height="100" fill="url(#vg)"/></svg>';
}
var hhSeite = 'helden';                               // Reiter der Heldenhalle: Helden | Paare
function hhGrid() {
    const H = loadHeroes(), list = HEROES.slice().sort((a, b) => (H[b.id].own - H[a.id].own) || b.r - a.r || H[b.id].q - H[a.id].q), zu = list.filter(h => !H[h.id].own);
    const karte = h => { const s = H[h.id], need = s.own ? heroStepCost(h, s.q) : HERO_UNLOCK[h.r], rd = RARITY_DEFS[h.r];
        return '<button type="button" class="hh-card' + (s.own ? '' : ' is-locked') + '" data-hh="' + h.id + '" style="--rc:' + rd.color + ';--c:' + h.color + '">' +
            '<span class="hh-art">' + heroImg(h.id) + '</span>' + (heroCanDo('player', h.id) ? '<span class="hh-dot"></span>' : '') + (s.own ? '' : '<span class="hh-lk">Gesperrt</span>') +
            '<span class="hh-foot"><b>' + h.name + '</b><small>' + h.role + '</small>' + (s.own ? hhStars(s.q) : '<span class="hh-frag"><i style="width:' + Math.min(100, Math.round(s.sh / need * 100)) + '%"></i></span><small>' + s.sh + ' / ' + need + '</small>') + '</span></button>'; };
    return '<div class="hh-head"><div class="emblem emblem--gold">' + icon('profile') + '</div><div class="phead-text"><div class="overline">Heldenhalle</div><h2>Helden</h2></div><button class="btn-x" type="button" data-hh-close aria-label="Schließen">' + icon('close') + '</button></div>' +
        '<div class="seg hh-seiten">' + [['helden', 'Helden'], ['paare', 'Paare']].map(([k, t]) => '<button type="button" data-hh-seite="' + k + '"' + (hhSeite === k ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>' +
        (hhSeite === 'paare' ? hhPairs() :
        '<div class="hh-count">' + (list.length - zu.length) + ' / ' + HEROES.length + ' freigeschaltet · Splitter gibt es von Bossen, für Aufgaben und als Heldenkisten im Shop</div>' +
        '<div class="hh-cards">' + list.filter(h => H[h.id].own).map(karte).join('') + '</div>' +
        (zu.length ? '<div class="hh-zu-h">' + zu.length + ' gesperrt</div><div class="hh-cards hh-cards--zu">' + zu.map(karte).join('') + '</div>' : ''));   // gesperrte kleiner darunter
}
function hhPairs() {                                  // Paket E: die passenden Paare – zusammen in einem Marsch +10 % auf alle Heldenwerte
    const H = loadHeroes();
    return '<div class="hh-pairs"><h3>Paare</h3><p class="hh-hint">Ein Marsch kann zwei Helden haben: den Haupthelden und einen Zweithelden. Der Zweitheld gibt seine Werte und passiven Fähigkeiten zu ' + Math.round(HERO_ZWEIT * 100) +
        ' %, die Wut-Fähigkeit zündet nur beim Haupthelden. Ziehen zwei Helden eines Paars zusammen los: +' + HERO_PAIR_BONUS + ' % auf alle Heldenwerte. Jeder Held kann nur in einem Marsch sein.</p>' +
        HERO_PAIRS.map(p => { const both = H[p.a].own && H[p.b].own, A = heroById(p.a), B = heroById(p.b);
            return '<div class="hh-pair' + (both ? ' is-on' : '') + '"><span class="hh-pair-pics"><button type="button" data-hh="' + p.a + '" class="' + (H[p.a].own ? '' : 'is-locked') + '">' + heroImg(p.a) + '</button><button type="button" data-hh="' + p.b + '" class="' + (H[p.b].own ? '' : 'is-locked') + '">' + heroImg(p.b) + '</button></span>' +
                '<span class="hh-pair-t"><b>' + p.name + '</b><small>' + A.name + ' & ' + B.name + (both ? ' · bereit' : ' · noch nicht beide freigeschaltet') + '</small><em>' + p.story + '</em></span></div>'; }).join('') + '</div>';
}
function hhHero(id) {
    const h = heroById(id), s = heroSt('player', id), rd = RARITY_DEFS[h.r], st = heroStats('player', id), full = Math.floor(s.q / 4), part = s.q % 4, busy = s.own && heroBusy('player', id);
    const need = s.own ? heroStepCost(h, s.q) : HERO_UNLOCK[h.r], maxed = s.own && s.q >= HERO_MAXQ, free = heroFree(s);
    const stars = s.own ? '<div class="hh-steps">' + ['¼', '½', '¾', icon('star')].map((t, k) => '<span' + (k < part ? ' class="on"' : '') + '>' + t + '</span>').join('') + '</div>' +
            (maxed ? '<div class="hh-qinfo"><span>5 Sterne – ganz oben</span><b>' + s.sh + ' Splitter übrig</b></div>' + hhSwapHtml(id, s) : '<div class="hh-qinfo"><span>Nächstes Viertel · Stern ' + (full + 1) + '</span><b>' + s.sh + ' / ' + need + '</b></div><div class="hh-bar"><i style="width:' + Math.min(100, Math.round(s.sh / need * 100)) + '%"></i></div>')
        : '<div class="hh-qinfo"><span>Freischalten</span><b>' + s.sh + ' / ' + need + '</b></div><div class="hh-bar"><i style="width:' + Math.min(100, Math.round(s.sh / need * 100)) + '%"></i></div><div class="hh-qinfo"><span>Startet danach mit 0 Sternen.</span></div>';
    const skills = h.sk.map((x, k) => { const lv = s.sk[k], max = heroSkillVal(h, k, 5);
        return '<div class="hh-sk' + (s.own ? '' : ' is-locked') + '"><span class="hh-hx' + (k ? '' : ' act') + '" style="--sc:' + h.color + '">' + x[0][0] + '</span><div class="hh-skt"><b>' + x[0] + '</b><small>' + (k ? 'Passiv' : 'Aktiv · bei voller Wut') + ' · Stufe ' + lv + '/5</small>' +
            '<p>' + (lv ? x[1].replace('{v}', heroNum(heroSkillVal(h, k, lv))) : 'Stufe 1: ' + x[1].replace('{v}', heroNum(heroSkillVal(h, k, 1)))) + '</p>' + (lv < 5 ? '<p class="hh-max">Stufe 5: ' + x[1].replace('{v}', heroNum(max)) + '</p>' : '') +
            (s.own ? '<span class="hh-pips">' + [1, 2, 3, 4, 5].map(q => '<i' + (q <= lv ? ' class="on"' : '') + '></i>').join('') + '</span>' : '') + '</div>' +
            (s.own && lv < 5 ? '<button type="button" class="hh-plus" data-hh-sk="' + k + '"' + (free ? '' : ' disabled') + ' aria-label="' + x[0] + ' verbessern">+</button>' : '<span></span>') + '</div>'; }).join('');
    const spent = s.sk.reduce((a, v) => a + v, 0);
    return '<div class="hh-head"><button class="btn-x" type="button" data-hh-back aria-label="Zurück">' + icon('back') + '</button><h2>' + h.name + '</h2><button class="btn-x" type="button" data-hh-close aria-label="Schließen">' + icon('close') + '</button></div>' +
        '<div class="hh-hero" style="--glow:' + h.color + '88;--rc:' + rd.color + '">' +
            '<div class="hh-stage"><div class="hh-id"><span class="hh-gem">' + rd.label + '</span><span class="hh-nm">' + h.name + '</span><span class="hh-ttl">' + h.title + ' · ' + h.role + '</span>' + hhStars(s.q) + '</div>' +
                '<div class="hh-floor"></div>' + heroImg(id, 'hh-portrait' + (s.own ? '' : ' is-locked')) + '</div>' +
            '<div class="hh-panel">' + (h.story ? '<div class="hh-blk"><h3>Geschichte</h3><p class="hh-story">' + h.story + '</p></div>' : '') + hhPartnerBlk(id) +
                '<div class="hh-blk hh-top"><div><h3>Macht</h3><b class="hh-pow">' + (s.own ? fmtNum(heroPower('player', id)) : 'Gesperrt') + '</b></div><div class="hh-role">' + (busy ? '<em>unterwegs</em>' : s.own ? 'bereit' : '') + '</div></div>' +
                '<div class="hh-blk"><h3>Sterne</h3>' + hhStars(s.q) + stars + '</div>' +
                (s.own ? '<div class="hh-blk"><h3>Wut</h3><div class="hh-qinfo"><span>' + (s.sk[0] ? (s.rage >= 100 ? 'Voll – ' + h.sk[0][0] + ' zündet im nächsten Kampf' : '+' + HERO_RAGE + ' % pro Kampf, den ' + h.name + ' führt') : 'Erst mit ' + h.sk[0][0] + ' auf Stufe 1') + '</span><b>' + Math.round(s.rage || 0) + ' %</b></div><div class="hh-bar hh-rage"><i style="width:' + Math.round(s.rage || 0) + '%"></i></div></div>' : '') +
                '<div class="hh-blk"><div class="hh-skh"><h3>Fähigkeiten</h3>' + (s.own ? '<span class="hh-pts">' + free + (free === 1 ? ' Punkt' : ' Punkte') + ' frei</span>' : '<span class="hh-pts off">nach dem Freischalten</span>') + '</div><div class="hh-sklist">' + skills + '</div>' +
                    (s.own ? '<p class="hh-hint">Jeder halbe Stern gibt 1 Punkt – bei 5 Sternen 10. Das reicht für 2 Fähigkeiten auf Stufe 5. Bisher ' + heroPoints(s) + ' von 10.</p><button type="button" class="hh-reset" data-hh-reset' + (spent ? '' : ' disabled') + '>' + (gemsArmed('hhreset:' + id) ? 'Wirklich? ' + icon('gem') + HERO_RESET_GEMS : 'Fähigkeiten zurücksetzen · ' + icon('gem') + HERO_RESET_GEMS) + '</button>' : '') + '</div>' +
                '<div class="hh-blk"><h3>Werte · wenn ' + h.name + ' mitkämpft</h3><div class="hh-vals"><div><span>Angriff</span><b>+' + st.atk + ' %</b></div><div><span>Verteidigung</span><b>+' + st.def + ' %</b></div><div><span>Tempo</span><b>+' + st.spd + ' %</b></div><div><span>Gefolge</span><b>+' + fmtCompact(st.gef) + '</b></div></div>' +
                    '<p class="hh-hint">Verteidigung: weniger eigene Verluste. Gefolge: so viele Truppen kämpfen zusätzlich mit (höchstens so viele, wie der Held anführt) – wächst mit Sternen, deiner Stufe und der Heldenhalle.</p></div>' +
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
    return '<div class="hh-blk"><h3>Paar · ' + pp.pair.name + '</h3><div class="hh-pair' + (own && heroOwned('player', id) ? ' is-on' : '') + '"><span class="hh-pair-pics"><button type="button" data-hh="' + pp.id + '" class="' + (own ? '' : 'is-locked') + '">' + heroImg(pp.id) + '</button></span>' +
        '<span class="hh-pair-t"><b>mit ' + o.name + '</b><small>' + o.title + (own ? '' : ' · gesperrt') + ' · zusammen +' + HERO_PAIR_BONUS + ' %</small><em>' + pp.pair.story + '</em></span></div></div>';
}
function renderHeroHall() { const el = document.getElementById('heroHall'); if (el.hidden) return; const top = el.scrollTop; if (liveHtml(el, hhCur ? hhHero(hhCur) : hhGrid())) el.scrollTop = top; }
function heroHallLive() {                            // (liveTick) neue Splitter, Wut, Stufe, „unterwegs“: nur bei einer Änderung neu zeichnen
    const el = document.getElementById('heroHall'); if (el.hidden) return;
    const sig = JSON.stringify(loadHeroes()) + '|' + hhCur + '|' + playerLvl + '|' + cityLevelSafe('heroes') + '|' + HEROES.map(h => heroBusy('player', h.id) ? 1 : 0).join('');
    if (sig !== el._sig) { el._sig = sig; renderHeroHall(); }
}
function openHeroHall(id) { const el = document.getElementById('heroHall'); hhCur = id || null; el.hidden = false; renderHeroHall(); el.scrollTop = 0; }
function closeHeroHall() { document.getElementById('heroHall').hidden = true; hhCur = null; if (!document.getElementById('citySheet').hidden) renderCitySheet(); }
document.getElementById('heroHall').addEventListener('click', e => {
    const el = document.getElementById('heroHall');
    if (e.target.closest('[data-hh-close]')) return closeHeroHall();
    const sei = e.target.closest('[data-hh-seite]'); if (sei) { hhSeite = sei.dataset.hhSeite; renderHeroHall(); el.scrollTop = 0; return; }
    if (e.target.closest('[data-hh-back]')) { hhCur = null; renderHeroHall(); el.scrollTop = 0; return; }
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
