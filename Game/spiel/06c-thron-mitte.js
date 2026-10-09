// Teil 06c-thron-mitte.js: Thron-Event (Kuppel, Rangpunkte, Wachtürme, Auswertung, Herrscher), die Mitte, Kopfgeld auf den Halter
// ===== THRON-EVENT (Alexander 8.10.): Sa 10 – So 22 Uhr Kampf um den Königsthron. Sonst liegt je eine Kuppel über dem Thron und den
// 4 Wachtürmen – niemand kann sie angreifen. Im Event gibt es alle 3 Min. Rangpunkte: wer den Thron hält 30, je Wachturm 15, wer Truppen
// als Verstärkung im Thron des Verbündeten hat 15. Alle 10 Min. schießt jeder Wachturm, der nicht zum Bündnis des Halters gehört, 2 % der
// Truppen im Thron ab (Getroffene ins Krankenhaus, wie überall). Die Rangpunkte starten jedes Event bei 0; So 22 Uhr Auswertung (nur der
// Weltrechner): Preise ins Abholfach, Platz 1 ist eine Woche Herrscher (Skin, Rahmen, Titel vergeben, Kisten verschicken).
const THRONE_TICK_MS = 3 * 60000, THRONE_PTS_MEGA = 30, THRONE_PTS_VERST = 15, THRONE_PTS_GUARD = 15, THRONE_FIRE_MS = 10 * 60000, THRONE_FIRE_PCT = 2;
const THRON_TAG = 6, THRON_AB_H = 10, THRON_BIS_H = 22, THRON_TEILNAHME = 500;
const guardianTempleIds = islands.filter(i => i.guardian).map(i => i.id), kuppelIds = new Set([megaTempleId, ...guardianTempleIds]);
// Preise nach Platz (Test-Datei werkzeuge/thronevent): mh = Stunden Münzen (evStunden), b = Gegenstände [Art, Menge, Extra] (gibBelohnung)
const THRON_PREISE = [
    { bis: 1, k: 'p1', name: 'Platz 1', bild: 'ui_rang_legende', zusatz: 'Herrscher', r: 'gold', mh: 12, b: [['eventMuenzen', 3000], ['holz', 600000], ['besch', 1, { dauer: '24h' }], ['schluessel2', 3]] },
    { bis: 2, k: 'p2', name: 'Platz 2', bild: 'ui_rang_diamantherzog', r: 'lila', mh: 8, b: [['eventMuenzen', 2200], ['holz', 400000], ['besch', 1, { dauer: '24h' }], ['schluessel2', 2]] },
    { bis: 3, k: 'p3', name: 'Platz 3', bild: 'ui_rang_goldfuerst', r: 'lila', mh: 6, b: [['eventMuenzen', 1700], ['holz', 300000], ['besch', 1, { dauer: '8h' }], ['schluessel2', 1]] },
    { bis: 8, k: 'p4', name: 'Platz 4–8', bild: 'ui_rang_platingraf', r: 'blau', mh: 4, b: [['eventMuenzen', 1000], ['holz', 150000], ['besch', 1, { dauer: '8h' }], ['schluessel1', 5]] },
    { bis: Infinity, ab: THRON_TEILNAHME, k: 'p5', name: 'Teilnahme', bild: 'ui_rang_neuling', zusatz: 'ab ' + THRON_TEILNAHME + ' Punkten', r: 'gruen', mh: 1, b: [['eventMuenzen', 300], ['besch', 1, { dauer: '1h' }], ['schluessel1', 1]] }
];
const thronPreisFuer = (platz, pts) => THRON_PREISE.find(x => platz <= x.bis && !(pts < (x.ab || 0))) || null;
// Kisten, die der Herrscher verschenkt (nicht an sich selbst; der Rest verfällt beim nächsten Thron-Event): crate = Seltenheit mindestens
const HERR_KISTEN = { episch: { n: 2, crate: 3, name: 'Epische Kiste', r: 'lila' }, gross: { n: 5, crate: 2, name: 'Große Kiste', r: 'blau' }, aus: { n: 10, crate: 1, name: 'Kiste', r: 'gruen' } };
const HERR_TITEL_FARBE = { feldherr: '#b3332b', burgvogt: '#2f5fa8', schatz: '#b88a1c', narr: '#7b3fa0' };
function thronFenster(now) {                          // das laufende oder nächste Thron-Event { start, end } (Ortszeit wie alle Events)
    const s = new Date(now); s.setDate(s.getDate() - (s.getDay() + 7 - THRON_TAG) % 7); s.setHours(THRON_AB_H, 0, 0, 0);
    const e = new Date(s); e.setDate(e.getDate() + 1); e.setHours(THRON_BIS_H, 0, 0, 0);
    if (e.getTime() <= now) { s.setDate(s.getDate() + 7); e.setDate(e.getDate() + 7); }
    return { start: s.getTime(), end: e.getTime() };
}
function thronLaeuft(now) { now = now || Date.now(); return thronFenster(now).start <= now; }
function thronKuppel(id, now) { return kuppelIds.has(id) && !thronLaeuft(now); }   // Thron und Wachtürme außerhalb des Events: nicht angreifbar
function thronKuppelText() { return 'Über Thron und Wachtürmen liegt eine Kuppel – angreifen geht erst im Thron-Event (Sa 10 – So 22 Uhr), noch ' + fmtPassWait(thronFenster(Date.now()).start - Date.now()) + '.'; }
function thronHalter() { return megaTempleId === undefined ? null : islandOwnerOf(megaTempleId); }
var throneState = (() => { try { return JSON.parse(store.get('openWaterThrone')) || null; } catch (e) { return null; } })() || {};
(() => { const now = Date.now(), ts = throneState; ts.week = ts.week || {}; delete ts.pts;   // (week: Rangpunkte des laufenden bzw. letzten Events)
    if (!(ts.nextPts > now)) ts.nextPts = now + THRONE_TICK_MS; if (!(ts.nextFire > now)) ts.nextFire = now + THRONE_FIRE_MS; })();
function saveThrone() { store.set('openWaterThrone', JSON.stringify(throneState)); }
function thronPunkte(who) { const ts = throneState; return ts.ev && ts.ev === thronFenster(Date.now()).start || ts.aus === ts.ev ? Math.floor((ts.week || {})[who] || 0) : 0; }
function throneEarnedOf(who, bs) {                    // alle Thron-Punkte, die jemand je bekommen hat (Saison-Rangliste, Erfolge)
    return Math.floor(who === 'player' ? throneState.earned || 0 : (((bs || loadBotState())[who] || {}).stats || {}).tpEarned || 0); }
function throneHelfer() { const hd = thronHalter();   // wer Verstärkung im Thron stehen hat (Bündnis, Botschaft) – nur beim verbündeten Halter
    return typeof verst === 'undefined' || !hd ? new Set() : new Set(verst.l.filter(v => v.t === megaTempleId && v.n >= 1 && bundVerbuendet(v.w, hd)).map(v => v.w)); }
function throneIncome(who) { return (thronHalter() === who ? THRONE_PTS_MEGA : 0) + (throneHelfer().has(who) ? THRONE_PTS_VERST : 0) + guardianTempleIds.filter(g => islandOwnerOf(g) === who).length * THRONE_PTS_GUARD; }
function throneShooters() { const hd = thronHalter();   // Wachtürme, die schießen: nie die eigenen oder die des Bündnisses (freie schießen auch)
    return hd ? guardianTempleIds.filter(g => { const o = islandOwnerOf(g); return !(o && (o === hd || bundVerbuendet(o, hd))); }) : []; }
function hourProduction(who) {                       // was ein Reich in einer Stunde erzeugt (Belohnungen „N Std.“)
    if (who === 'player') { const k = 3600000 / productionTickMs(); return { coins: totalCoinProductionPerTick() * k, troops: totalTroopProductionPerTick() * k }; }
    const own = botOwnedIslands[who]; if (!own) return { coins: 0, troops: 0 };
    const bm = botMults(who), rb = rulerOwner() === who ? RULER_BONUS : 1, k = 3600000 / botTickMs(who); let c = 0, t = 0;
    for (const id of own) { const L = islandLevels[id] || 1; c += coinsPerTick(L) * rb * bm.coins; t += troopsPerTick(L) * rb * bm.troops;
        const isl = islandById[id];                    // Tempel wie bei dir (produceTicks)
        if (isl && (isl.type === 'temple' || isl.type === 'megaTemple')) { const mult = templeBaseMult(isl) * templeHoldMultiplier(id) * shrineMult(who); c += TEMPLE_COIN_BONUS_PER_TICK * mult; t += TEMPLE_TROOP_BONUS_PER_TICK * mult; } }
    return { coins: c * k, troops: t * k };
}
var throneShots = [];                                  // Geschosse über der Karte (unten gezeichnet)
function throneAward(silent, at) {                    // ein Takt Rangpunkte (at: wann – die Zeit, in der das Spiel zu war, wird nachgeholt)
    if (!thronLaeuft(at)) return;
    const ts = throneState, got = {};
    const add = (who, n) => { if (!who) return; got[who] = (got[who] || 0) + n; };
    add(thronHalter(), THRONE_PTS_MEGA); for (const g of guardianTempleIds) add(islandOwnerOf(g), THRONE_PTS_GUARD);
    for (const w of throneHelfer()) add(w, THRONE_PTS_VERST);
    goalBump(thronHalter(), 'throneMin', THRONE_TICK_MS / 60000);   // Minuten auf dem Thron (Erfolge, Aufgabe)
    bountyGrow();                                                                 // das Kopfgeld auf den Halter wächst
    for (const [who, n] of Object.entries(got)) {
        if (who === 'player') { ts.earned = (ts.earned || 0) + n; warStat('thronePts', n); }
        else { const b = loadBotState()[who]; if (!b) continue; b.stats = b.stats || {}; b.stats.tpEarned = (b.stats.tpEarned || 0) + n; }
        ts.week[who] = (ts.week[who] || 0) + n;
    }
    if (got.player && !silent) flashHint('+' + got.player + ' Thron-Punkte – ' + (thronHalter() === 'player' ? 'du hältst den Königsthron' : guardianTempleIds.some(g => islandOwnerOf(g) === 'player') ? 'du hältst einen Wachturm' : 'deine Verstärkung steht im Thron') + '.', 3500);
    saveBotState();
}
function throneVolley(times, silent) {                // times: mehrere Salven auf einmal (die Zeit, in der das Spiel zu war)
    times = times || 1;
    const holder = thronHalter(), shooters = throneShooters(); if (!holder || !shooters.length || !thronLaeuft()) return null;
    const g0 = islandTroops[megaTempleId] || 0;
    const loss = Math.floor(g0 * (1 - Math.pow(1 - THRONE_FIRE_PCT / 100, shooters.length * times)));
    const m = islandById[megaTempleId];
    if (!silent) { shooters.forEach((g, i) => throneShots.push({ from: islandById[g], to: m, delay: i * 140 })); requestRender(); }
    if (loss <= 0) return null;
    islandTroops[megaTempleId] = g0 - loss;
    let w = 0;
    if (holder === 'player') { w = hospitalTake(loss, 100); warStat('fallen', loss - w);   // die Getroffenen ins Krankenhaus, soweit Platz ist
        if (!silent) setTimeout(() => spawnBattleFx(megaTempleId, false, 'Beschuss', '−' + fmtCompact(loss) + ' Truppen'), 1100);
        const prev = combatLog[0], shotBy = shooters.map(g => { const o = islandOwnerOf(g); return o && o !== 'player' ? botById[o].name : 'unbesetzt'; });
        if (prev && prev.type === 'volley' && Date.now() - prev.at < 30 * 60000) {          // ein Bericht für mehrere Salven
            Object.assign(prev, { n: prev.n + times, hit: prev.hit + loss, wounded: prev.wounded + w, left: g0 - loss, shotBy, at: Date.now() });
            store.set('openWaterCombatLog', JSON.stringify(combatLog)); refreshOpenCombatLog();
        } else addCombatLogEntry({ type: 'volley', targetId: megaTempleId, n: times, before: g0, hit: loss, wounded: w, left: g0 - loss, shotBy });
        if (!silent) flashHint(shooters.length + (shooters.length === 1 ? ' Wachturm schießt' : ' Wachtürme schießen') + ' auf den Thron: ' + fmtCompact(loss) + ' Truppen getroffen' + (w ? ', ' + fmtCompact(w) + ' davon ins Krankenhaus.' : ' – kein Platz im Krankenhaus.') + ' Erobere die Wachtürme, dann schweigen sie.', 4500); }
    else botHospitalTake(holder, loss, 100);
    saveGame();
    return { loss, w };
}
function thronBeginn(ts, start, now) {                // ein neues Thron-Event: Rangpunkte bei 0, Kuppeln weg, übrige Herrscher-Kisten verfallen
    ts.ev = start; ts.week = {}; ts.kisten = null; ts.nextPts = now + THRONE_TICK_MS; ts.nextFire = now + THRONE_FIRE_MS; ts.halterSeit = now; ts.coTold = false;
    afterSplash(() => flashHint('Das Thron-Event beginnt: die Kuppeln sind weg – erobere Thron und Wachtürme bis So 22 Uhr!', 5000));
}
function thronAuswertung(ts, now) {                   // So 22 Uhr: Preise nach Platz, Platz 1 wird eine Woche Herrscher
    const rk = evRang(ts.week); ts.aus = ts.ev; ts.letzte = rk.slice(0, 10).map(([w, p]) => [w, Math.floor(p)]);
    rk.forEach(([who, p], i) => { const pr = thronPreisFuer(i + 1, p); if (pr) evPreis(who, 'thron', 'Thron-Event · ' + (pr.ab ? 'Teilnahme' : 'Platz ' + (i + 1)), pr, ts.ev); });
    const h = rk[0] && rk[0][0];
    ts.herr = h ? { who: h, seit: now, bis: thronFenster(now).end } : null;   // bis zur nächsten Auswertung
    ts.kisten = h ? Object.fromEntries(Object.entries(HERR_KISTEN).map(([k, x]) => [k, x.n])) : null; ts.kn = 0;
    const me = rk.findIndex(e => e[0] === 'player') + 1;
    if (me) afterSplash(() => flashHint('Thron-Event vorbei: du bist ' + (me === 1 ? 'Herrscher für eine Woche!' : 'auf Platz ' + me + '.') + ' Dein Preis liegt unter Events → Belohnung.', 6000));
}
function thronHerrscher(now) {                        // der Herrscher (Platz 1 des letzten Thron-Events) – eine Woche lang
    const h = typeof throneState !== 'undefined' && throneState && throneState.herr;
    return h && h.bis > (now || Date.now()) && (h.who === 'player' || botById[h.who]) ? h.who : null;
}
function herrKiste(von, art, an) {                    // der Herrscher verschenkt eine Kiste (Weltrechner bzw. Vorschau) → true, wenn verschickt
    const ts = throneState, x = HERR_KISTEN[art];
    if (!x || !von || thronHerrscher() !== von || !an || an === von || !(an === 'player' || botById[an]) || !ts.kisten || !(ts.kisten[art] > 0)) return false;
    ts.kisten[art]--; ts.kn = (ts.kn || 0) + 1;
    evPreis(an, 'thron', x.name + ' vom Herrscher ' + (von === 'player' ? profileName.value || 'Du' : botById[von].name), { crate: x.crate }, ts.ev + '|k' + ts.kn);
    saveThrone(); return true;
}
function herrKisteBot(now) {                          // ein Mitspieler als Herrscher: verschenkt seine Kisten nach und nach (Bündnis zuerst, dann die Stärksten)
    const h = thronHerrscher(now), ts = throneState; if (!h || h === 'player' || botById[h].mensch || !ts.kisten || Math.random() > .2) return;
    const art = ['episch', 'gross', 'aus'].find(k => ts.kisten[k] > 0); if (!art) return;
    const wer = ['player', ...BOT_DEFS.map(b => b.id)].filter(w => w !== h && (w === 'player' ? ownedIslands.size : (botOwnedIslands[w] || new Set()).size));
    const an = wer.filter(w => bundVerbuendet(w, h)).sort(() => Math.random() - .5)[0] || wer.sort((a, b) => thronPunkte(b) - thronPunkte(a))[0];
    if (an) herrKiste(h, art, an);
}
function herrKisteSenden(art, an) {                   // dein Knopf im Herrscher-Fenster
    if (!an) { flashHint('Wähle zuerst, wer die Kiste bekommt.', 2500); return; }
    if (rechnet()) { if (!herrKiste('player', art, an)) { flashHint('Diese Kiste hast du nicht mehr.', 2500); return; } }
    else { const k = throneState.kisten; if (!(k && k[art] > 0)) { flashHint('Diese Kiste hast du nicht mehr.', 2500); return; }
        alsBefehl('thronKiste', { kiste: art, wem: neutralId(an) }); k[art]--; }                // (Zuschauer: gleich zeigen, der Weltrechner verschickt; „kiste“, weil „art“ die Befehlsart ist)
    flashHint(HERR_KISTEN[art].name + ' an ' + fieldWhoName(an) + ' verschickt.', 3000); sfx('coin'); renderHerr();
}
function throneTick() {
    const now = Date.now(), ts = throneState; let dirty = false;
    herrAnsage(now);
    if (!rechnet()) { throneUhren(now, ts); midAnzeige(now); return; }
    const f = thronFenster(now), an = f.start <= now;
    if (an && ts.ev !== f.start) { thronBeginn(ts, f.start, now); dirty = true; }
    else if (!an && ts.ev && ts.aus !== ts.ev) { thronAuswertung(ts, now); dirty = true; }
    const r = thronHalter(); if ((ts.halter || null) !== (r || null)) { ts.halter = r || null; ts.halterSeit = now; ts.coTold = false; dirty = true; }
    if (an) {
        bountyCheck(r);                                                            // das Kopfgeld an den, der den Thron genommen hat
        if (!ts.coTold && coalitionOn(now)) { ts.coTold = true; dirty = true;      // alle anderen gehen auf den Thron los
            flashHint(r === 'player' ? 'Du hältst den Thron schon lange – die anderen verbünden sich gegen dich. Rechne mit Angriffen von allen Seiten!'
                : 'Die anderen verbünden sich gegen ' + botById[r].name + ' – der Thron wird von allen Seiten angegriffen.', 6000); }
        for (let n = 0; ts.nextPts <= now; n++) { ts.nextPts += THRONE_TICK_MS; dirty = true; if (n < 3) throneAward(); }   // ein gedrosselter Hintergrund-Tab holt etwas nach, nicht stundenlang
        for (let n = 0; ts.nextFire <= now; n++) { ts.nextFire += THRONE_FIRE_MS; dirty = true; if (n < 3) throneVolley(); }
    }
    herrKisteBot(now);
    midAnzeige(now);
    if (dirty) saveThrone();
    throneUhren(now, ts);
}
function throneUhren(now, ts) {
    const clock = ms => fmtClock(Math.max(0, ms) / 1000);
    for (const el of document.querySelectorAll('[data-throne-pts]')) el.textContent = clock(ts.nextPts - now);
    for (const el of document.querySelectorAll('[data-throne-fire]')) el.textContent = clock(ts.nextFire - now);
}
setInterval(throneTick, 1000);
// Herrscher-Ansage (Alexander 9.10.): nach der Auswertung (So 22 Uhr) einmal ein großes Banner mit Krone für jeden Spieler –
// bis 2 Tage danach. openWaterHerrGesehen = seit wann der angesagte Herrscher herrscht (geht mit dem Profil, nicht doppelt).
function herrAnsage(now) {
    const h = thronHerrscher(now), seit = h && throneState.herr.seit;
    if (SYSTEM || !splashFinished || !h || !(seit > now - 2 * 864e5) || +store.get('openWaterHerrGesehen') === seit || document.getElementById('herrAnsage')) return;
    store.set('openWaterHerrGesehen', String(seit));
    const ich = h === 'player', name = ich ? profileName.value || 'Du' : botById[h].name, el = document.createElement('div');
    el.id = 'herrAnsage'; el.className = 'herr-ansage'; el.setAttribute('role', 'dialog');
    el.innerHTML = '<div class="herr-ansage-karte"><img class="herr-ansage-krone" src="bilder/ui_sym_krone.webp" alt="">' +
        '<span class="herr-bild"><img src="' + crestDataUrl(96, h) + '" alt=""><img class="herr-rahmen" src="bilder/ui_herrscher_rahmen.webp" alt=""></span>' +
        '<small>Neuer Herrscher</small><b>' + escapeHtml(name) + '</b><span>' + (ich ? 'Du herrschst eine Woche über die Welt!' : 'herrscht eine Woche über die Welt.') + '</span>' +
        '<button type="button" class="btn btn--primary btn--sm">Weiter</button></div>';
    el.addEventListener('click', () => el.remove());
    document.body.appendChild(el); sfx('crate');
}
function drawThroneShots(now) {                        // leuchtende Geschosse im Bogen von jedem Wachturm zum Thron
    if (!throneShots || !throneShots.length) return;
    const z = mapState.zoom, DUR = 1100;
    for (const s of throneShots.slice()) {
        s.el = (s.el === undefined ? -s.delay : s.el + Math.min(50, now - s.last)); s.last = now;   // je Bild, damit ein langsames Bild den Flug nie überspringt
        const t = s.el / DUR; if (t > 1.5) { throneShots.splice(throneShots.indexOf(s), 1); continue; }
        liveAnimation = true; if (t < 0) continue;
        if (!isCellOpen(s.to.x, s.to.y)) continue;                                // der Thron liegt im Nebel
        const ax = toSX(s.from.x), ay = toSY(s.from.y) - 14, bx = toSX(s.to.x), by = toSY(s.to.y) - 10, d = Math.hypot(bx - ax, by - ay), lift = Math.min(160, d * .35);
        const at = q => { const u = 1 - q; return [u * u * ax + 2 * u * q * (ax + bx) / 2 + q * q * bx, u * u * ay + 2 * u * q * ((ay + by) / 2 - lift) + q * q * by]; };
        if (t <= 1) {
            const sc = Math.max(1, Math.min(1.6, z / .008));
            const [x, y] = at(t), gr = ctx.createRadialGradient(x, y, 0, x, y, 22 * sc);
            gr.addColorStop(0, 'rgba(255,190,90,.8)'); gr.addColorStop(.45, 'rgba(255,110,30,.35)'); gr.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 22 * sc, 0, Math.PI * 2); ctx.fill();
            for (let k = 9; k >= 0; k--) { const q = Math.max(0, t - k * .02), [px, py] = at(q), r = (k ? 5 - k * .42 : 6.5) * sc;   // ein brennender Schweif, dann der weißglühende Kern
                ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fillStyle = k ? 'rgba(255,' + (150 - k * 8) + ',50,' + (.85 - k * .08) + ')' : '#fff4d6'; ctx.fill(); }
        } else {                                         // Einschlag: ein schneller Ring am Thron
            const q = (t - 1) / .5, fl = ctx.createRadialGradient(bx, by, 0, bx, by, 30 * (1 - q * .4));
            fl.addColorStop(0, 'rgba(255,220,150,' + (.7 * (1 - q)) + ')'); fl.addColorStop(1, 'rgba(255,110,30,0)'); ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(bx, by, 30, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(bx, by, 8 + 34 * q, 0, Math.PI * 2); ctx.lineWidth = 3.5 * (1 - q); ctx.strokeStyle = 'rgba(255,160,70,' + (1 - q) + ')'; ctx.stroke();
        }
    }
}
const shopInfoAuf = new Set();                      // Shop: offene Erklärungen hinter „i“ (bleiben beim Neuzeichnen offen)
let shopTab = 'gems';
function showShopTab(t) {
    shopTab = t;
    for (const b of document.querySelectorAll('#shopTabs [data-stab]')) { const on = b.dataset.stab === t; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    for (const pn of document.querySelectorAll('#shopPopup [data-spane]')) pn.hidden = pn.dataset.spane !== t;
    renderShop();
}
document.getElementById('shopTabs').addEventListener('click', e => { const b = e.target.closest('[data-stab]'); if (b) showShopTab(b.dataset.stab); });
// ---- Events-Fenster, Chip „Thron“: Ablauf, Rangliste (live bzw. letztes Wochenende), Preise nach Platz, Herrscher ----
const thronKachel = (bild, r, txt) => '<span class="bk" data-r="' + r + '"><img src="bilder/' + bild + '.webp" alt="" draggable="false">' + (txt ? '<b>' + txt + '</b>' : '') + '</span>';
const BESCH_TXT = { '1m': '1 Min', '5m': '5 Min', '15m': '15 Min', '1h': '1 Std', '3h': '3 Std', '8h': '8 Std', '24h': '24 Std' };
function thronPreisKacheln(p) {                       // ein Preis als Kacheln (Bild + Zahl)
    const B = { eventMuenzen: 'beute_eventmuenze', holz: 'beute_holz', schluessel1: 'beute_schluessel', schluessel2: 'beute_schluessel_episch' };
    return thronKachel(B.eventMuenzen, p.r, fmtNum(p.b[0][1])) + thronKachel('beute_muenzen', p.r, p.mh + ' Std.') +
        p.b.slice(1).map(([a, n, x]) => a === 'besch' ? thronKachel(beschBild(x.dauer), p.r, BESCH_TXT[x.dauer]) : thronKachel(B[a], p.r, a === 'holz' ? fmtCompact(n) : fmtNum(n))).join('');
}
function evThronHtml() {
    const now = Date.now(), f = thronFenster(now), an = f.start <= now, ts = throneState, hd = thronHalter(), h = thronHerrscher(now);
    const live = an && ts.ev === f.start, list = live ? evRang(ts.week) : (ts.letzte || []), mi = list.findIndex(e => e[0] === 'player'), inc = throneIncome('player');
    const ablauf = '<div class="thron-ablauf"><div' + (an ? '' : ' class="jetzt"') + '><b>Mo – Fr</b>Wochen-Event</div><div><b>Fr</b>Auswertung</div><div' + (an ? ' class="jetzt"' : '') + '><b>Sa 10 – So 22</b>Thron-Event</div></div>';
    return '<div class="barb-card ev-card is-tour thron-karte"><img class="thron-kopf" src="bilder/thron_kopf.webp" alt=""><div class="barb-ct"><b>' + icon('crown') + ' Kampf um den Königsthron</b><small>' + (an ? 'Läuft · endet in ' + evUhr(f.end) : 'Beginnt ' + evWann(f.start) + ' · in ' + evUhr(f.start)) + '</small></div>' + ablauf +
        (an ? '<div class="field-lines"><span>Dein Platz</span><b>' + (mi >= 0 ? (mi + 1) + ' · ' + fmtNum(list[mi][1]) + ' Punkte' : '– · 0 Punkte') + '</b><span>Du hältst</span><b>' + (inc ? '+' + inc + ' alle 3 Min.' : 'nichts – erobere einen Turm') + '</b>' +
            '<span>Thron hält</span><b>' + (hd ? escapeHtml(fieldWhoName(hd)) : 'niemand') + '</b><span>Nächste Punkte</span><b data-throne-pts>' + fmtClock(Math.max(0, ts.nextPts - now) / 1000) + '</b></div>'
            : '<div class="kuppel-satz">' + icon('shield') + '<span>Bis Samstag 10 Uhr liegt über dem Thron und über jedem Wachturm eine Kuppel – niemand kann angreifen.</span></div>') +
        '<button class="btn btn--primary" type="button" data-thron-go><span>Zum Königsthron</span></button></div>' +
        (h ? '<button type="button" class="thron-herr-zeile" data-herr-auf>' + '<img src="bilder/ui_sym_krone.webp" alt=""><span>Herrscher: <b>' + escapeHtml(h === 'player' ? profileName.value || 'Du' : botById[h].name) + '</b><small>bis ' + evWann(ts.herr.bis) + '</small></span>' + '</button>' : '') +
        '<div class="lb-gap">' + (live ? 'Live · Top 10' : 'Letztes Wochenende · Top 10') + '</div>' + (list.length ? evRangHtml(list, p => fmtNum(Math.floor(p)) + ' P.') : '<div class="inbox-empty">Noch keine Punkte.</div>') +
        '<div class="lb-gap">Preise nach Platz · am Ende im Abholfach</div>' +
        THRON_PREISE.map(p => '<div class="rang"><div class="rband ' + p.k + '"><img src="bilder/' + p.bild + '.webp" alt="">' + p.name + (p.zusatz ? '<span>' + p.zusatz + '</span>' : '') + '</div><div class="bk-raster">' + thronPreisKacheln(p) + '</div></div>').join('') +
        '<details class="lb-info ev-info"><summary>' + icon('info') + '<span>So gibt es Punkte</span></summary><div class="tour-rules">' +
            '<span>' + icon('hourglass') + '<span><b>Sa 10 – So 22 Uhr Thron-Event.</b> Sonst liegt je eine Kuppel über Thron und Wachtürmen.</span></span>' +
            '<span>' + icon('crown') + '<span><b>Königsthron:</b> ' + THRONE_PTS_MEGA + ' Punkte alle 3 Min. für den Halter, Verbündete mit Truppen darin ' + THRONE_PTS_VERST + '.</span></span>' +
            '<span>' + icon('flag') + '<span><b>4 Wachtürme:</b> je ' + THRONE_PTS_GUARD + ' Punkte alle 3 Min. Wachtürme darf man verstärken.</span></span>' +
            '<span>' + icon('attack') + '<span>Wachtürme schießen alle 10 Min. ' + THRONE_FIRE_PCT + ' % auf den Thron – nie auf das eigene Bündnis.</span></span>' +
            '<span>' + icon('rank') + '<span>Punkte starten jedes Wochenende bei 0. Platz 1 wird <b>Herrscher</b> für 1 Woche.</span></span></div></details>';
}
document.getElementById('eventBody').addEventListener('click', e => {
    if (e.target.closest('[data-herr-auf]')) { openHerr(); return; }
    if (!e.target.closest('[data-thron-go]')) return;
    const m = islandById[megaTempleId]; if (!m) return; closeAllPopups(); flyTo(m.x, m.y, { zoom: clampZoom(viewW * .7 / HEILIGTUM_BREITE.megaTemple) }); setTimeout(() => openIslandPopup(m), 650);   // der ganze Thron im Bild (auch im Nebel, 03b)
});
// ---- Herrscher-Fenster: wer herrscht, Skin + Rahmen (automatisch), Titel, Kisten verschicken ----
const herrPopup = document.getElementById('herrPopup');
let herrAn = '';
function openHerr() { closeAllPopups(); renderHerr(); openPanel(herrPopup); }
function renderHerr() {
    const h = thronHerrscher(), ts = throneState, ich = h === 'player', t = loadTitles(), el = document.getElementById('herrBody'); if (!el) return;
    const name = w => w === 'player' ? profileName.value || 'Du' : w && botById[w] ? botById[w].name : '–';
    const leute = ['player', ...BOT_DEFS.map(b => b.id)].filter(w => w !== h && (w === 'player' ? ownedIslands.size : (botOwnedIslands[w] || new Set()).size));
    const opts = cur => '<option value="">– niemand –</option>' + leute.map(w => '<option value="' + w + '"' + (cur === w ? ' selected' : '') + '>' + escapeHtml(name(w)) + '</option>').join('');
    setText(document.getElementById('herrSub'), h ? 'bis ' + evWann(ts.herr.bis) : 'noch niemand');
    el.innerHTML = !h ? '<div class="inbox-empty">Noch kein Herrscher – wer beim Thron-Event (Sa 10 – So 22 Uhr) Platz 1 holt, herrscht eine Woche.</div>' :
        '<div class="herr-kopf"><span class="herr-bild"><img src="' + crestDataUrl(96, h) + '" alt=""><img class="herr-rahmen" src="bilder/ui_herrscher_rahmen.webp" alt=""></span>' +
            '<div><b>' + escapeHtml(name(h)) + '</b><small>Herrscher bis ' + evWann(ts.herr.bis) + ' · Skin „Herrscherburg“ · +' + Math.round((RULER_BONUS - 1) * 100) + ' % Münzen und Truppen</small></div>' +
            '<img class="herr-skin" src="bilder/skin_herrscherburg.webp" alt=""></div>' +
        '<div class="herr-angelegt"><span class="haken">✓</span><span>Skin und Rahmen werden automatisch angelegt, solange ' + (ich ? 'du' : 'der Herrscher') + ' herrscht.</span><b>Angelegt</b></div>' +
        '<div class="sect"><h4>Titel</h4><span class="sect-aside">' + (ich ? 'vergibst du' : 'vergibt der Herrscher') + '</span></div>' +
        TITLES.map(x => '<div class="herr-titel"><img src="bilder/ui_titel_' + (x.key === 'schatz' ? 'schatzmeister' : x.key) + '.webp" alt=""><div>' + x.name + '<small' + (x.good ? '' : ' class="boese"') + '>' + x.desc + '</small></div>' +
            (ich ? '<select data-herr-titel="' + x.key + '">' + opts(t.by[x.key]) + '</select>' : '<span class="wer">' + escapeHtml(t.by[x.key] ? name(t.by[x.key]) : '–') + '</span>') + '</div>').join('') +
        '<div class="sect"><h4>Kisten verschicken</h4><span class="sect-aside">nicht an sich selbst · Rest verfällt Sa 10 Uhr</span></div>' +
        '<div class="herr-kisten">' + Object.entries(HERR_KISTEN).map(([k, x]) => { const n = (ts.kisten || {})[k] || 0;
            return '<div class="herr-kiste"><span class="bk" data-r="' + x.r + '"><img src="bilder/' + (k === 'aus' ? 'kiste_ausruestung_zu' : 'kiste_' + k + '_zu') + '.webp" alt=""><b>' + n + '/' + x.n + '</b></span>' +
                '<small>' + x.name + '<br>1 Ausrüstung, mind. ' + RARITY_DEFS[x.crate].label + '</small>' + (ich ? '<button class="btn btn--primary btn--sm" type="button" data-herr-kiste="' + k + '"' + (n ? '' : ' disabled') + '><span>Schicken</span></button>' : '') + '</div>'; }).join('') + '</div>' +
        (ich ? '<label class="herr-an">An <select data-herr-an>' + opts(herrAn) + '</select></label>' : '');
}
herrPopup.addEventListener('change', e => {
    const an = e.target.closest('[data-herr-an]'); if (an) { herrAn = an.value; return; }
    const sel = e.target.closest('[data-herr-titel]'); if (!sel || thronHerrscher() !== 'player') return;
    giveTitle(sel.dataset.herrTitel, sel.value || null); alsBefehl('titel', { key: sel.dataset.herrTitel, wem: neutralId(sel.value || null) });
    const x = TITLES.find(q => q.key === sel.dataset.herrTitel); if (sel.value && !x.good && sel.value !== 'player') botGrudge(sel.value, 'player', 1);   // niemand wird gern Narr – das merkt man sich
    if (sel.value) flashHint(fieldWhoName(sel.value) + ' ist jetzt ' + x.name + ' (' + x.desc + ').', 3000);
    renderHerr();
});
herrPopup.addEventListener('click', e => { const b = e.target.closest('[data-herr-kiste]'); if (b && !b.disabled) herrKisteSenden(b.dataset.herrKiste, herrAn); });
document.getElementById('herrCloseBtn').addEventListener('click', () => closePanel(herrPopup));
// Gegenstände für einen Mitspieler (Preise, Pass): Event-Münzen, Schlüssel, Beschleuniger, Holz
function beuteBot(who, art, n, extra) {
    const b = loadBotState()[who]; if (!b || !(n > 0)) return;
    if (art === 'holz') { if (AUF) AUF.rohDazu(who, { h: n }); return; }
    if (art === 'besch') { const d = extra && BESCH_TXT[extra.dauer] ? extra.dauer : '1h'; b.besch = b.besch || {}; b.besch[d] = (b.besch[d] || 0) + n; return; }
    if (art === 'eventMuenzen' || art === 'schluessel1' || art === 'schluessel2') b[art] = (b[art] || 0) + n;
}

// ===== DIE MITTE: Thron, Wächter-Tempel und Tore
// Punkte für Kämpfe gibt es im Wochen-Event (Krieger-Tag, 09c): 1 je getötete gegnerische Truppe.
const midZoneIds = new Set(islands.filter(i => { const lm = landmasses[i.landmassId]; return i.type === 'megaTemple' || i.guardian || i.type === 'gate' && (i.gateKind === 'throne' || i.gateKind === 'guardian') || !!lm && (lm.tier === 'throne' || lm.tier === 'guardian'); }).map(i => i.id));
function midFight(tid, aWho, aKills, dWho, dKills, aTeile, dTeile) {     // nach jedem Kampf um eine Basis: Punkte für den Krieger-Tag (überall)
    // gemeinsam (Rally, Verstärkung): jeder nach seinem Anteil – aTeile/dTeile = [[wer, Anteil 0…1], …] (kampfTeile, verstAnteile)
    const geben = (wer, n, teile) => { if (Array.isArray(teile) && teile.length) { for (const [w, f] of teile) if (f > 0) evPunkte('krieg', w, n * f); } else evPunkte('krieg', wer, n); };
    geben(aWho, aKills, aTeile); geben(dWho, dKills, dTeile);
}
// ===== KOPFGELD AUF DEN HALTER: wer im Thron-Event den Thron hält, auf den wächst ein Kopfgeld (Edelsteine + Münzen, alle 3 Min. mit den
// Thron-Punkten). Wer ihm den Thron abnimmt, kassiert alles.
const BOUNTY_GEMS = 3, BOUNTY_GEMS_MAX = 1000, BOUNTY_COIN_H = .1, BOUNTY_COIN_MAX_H = 24;
var bountyState = (() => { try { return JSON.parse(store.get('openWaterBounty')) || null; } catch (e) { return null; } })() || { ruler: null, gems: 0, coins: 0 };
function saveBounty() { store.set('openWaterBounty', JSON.stringify(bountyState)); }
function bountyOf() { const r = thronHalter(); return r && bountyState.ruler === r ? { who: r, gems: Math.floor(bountyState.gems || 0), coins: Math.floor(bountyState.coins || 0) } : null; }
function bountyGems() { const b = bountyState; return b.ruler && b.ruler === thronHalter() ? b.gems || 0 : 0; }   // (the others ask this for every target - no allocation)
function bountyGrow() {
    const r = thronHalter(); bountyCheck(r); if (!r) return;
    const b = bountyState, hc = hourProduction(r).coins;
    b.gems = Math.min(BOUNTY_GEMS_MAX, (b.gems || 0) + BOUNTY_GEMS); b.coins = Math.min(Math.max(wirtM(1e4), hc * BOUNTY_COIN_MAX_H), (b.coins || 0) + Math.max(wirtM(500), hc * BOUNTY_COIN_H)); saveBounty();   // (Mindestwerte in Münzen: wirtM)
}
function bountyPay(who, g, c) {
    if (who !== 'player') { botBountyReward(who, g, c); return; }
    inboxAdd({ src: 'bounty', title: 'Kopfgeld', gems: g, coins: c });
}
function bountyCheck(r) {                             // a new ruler: whoever took the throne collects everything, the bounty starts again at 0
    const b = bountyState; r = r || null; if ((b.ruler || null) === r) return;
    const was = b.ruler, g = Math.floor(b.gems || 0), c = Math.floor(b.coins || 0);
    bountyState = { ruler: r, gems: 0, coins: 0, since: Date.now() }; saveBounty();
    if (!was || !r || !(g || c) || (was !== 'player' && !botById[was]) || (r !== 'player' && !botById[r])) return;
    bountyPay(r, g, c);
    const txt = r === 'player' ? 'Kopfgeld für den Sturz von ' + botById[was].name + ': ' + fmtNum(g) + ' Edelsteine und ' + fmtCompact(c) + ' Münzen – abholen unter Events → Belohnung!'
        : was === 'player' ? botById[r].name + ' hat das Kopfgeld auf dich kassiert: ' + fmtNum(g) + ' Edelsteine.' : g >= 100 ? botById[r].name + ' kassiert das Kopfgeld auf ' + botById[was].name + ': ' + fmtNum(g) + ' Edelsteine.' : '';
    if (txt) afterSplash(() => setTimeout(() => flashHint(txt, 5000), 4500));
    if (r === 'player') sfx('coin');
}
// ---- what you see: EIN Streifen unter dem HUD (der dringendste Hinweis, der Rest als „+2“ – antippen klappt alle auf), a card in the Thron tab, the Kopfgeld on the Mega-Tempel
const midBar = document.getElementById('midBar');
let midBarHtml = '', midBarAuf = false;
function renderMidBar() {
    const now = Date.now(), b = bountyOf(), chips = [];   // [Dringlichkeit, html]
    if (thronLaeuft(now)) { const p = thronPunkte('player');                     // Thron-Event (Sa 10 – So 22)
        chips.push([8, '<button type="button" class="mb-chip is-tour" data-mb="thron">' + icon('crown') + '<span>Thron-Event</span><b>' + fmtNum(p) + ' P.</b></button>']); }
    if (b && b.gems >= 5) chips.push([b.who === 'player' ? 1 : 7, '<button type="button" class="mb-chip' + (b.who === 'player' ? ' is-warn' : '') + '" data-mb="bounty">' + icon(b.who === 'player' ? 'losses' : 'coin') +
        '<span>' + (b.who === 'player' ? 'Kopfgeld auf dich' : 'Kopfgeld') + '</span><b>' + fmtNum(b.gems) + '</b>' + icon('gem', 'mb-gem') + '</button>']);
    chips.push(...evChips(now));                                                        // Wochen-Event, Welt-Saison (09c)
    if (typeof haendlerChip === 'function') { const hc = haendlerChip(now); if (hc) chips.push([6, hc]); }   // Paket C: ein Händler ist da
    chips.sort((x, y) => x[0] - y[0]);
    if (chips.length < 2) midBarAuf = false;
    const h = chips.length ? (midBarAuf ? chips.map(c => c[1]).join('') : chips[0][1]) + (chips.length > 1 ? '<button type="button" class="mb-mehr" data-mb="mehr" aria-label="' + (midBarAuf ? 'Weniger zeigen' : 'Alle Hinweise zeigen') + '">' + (midBarAuf ? '−' : '+' + (chips.length - 1)) + '</button>' : '') : '';
    if (h !== midBarHtml) { midBarHtml = h; midBar.innerHTML = h; midBar.hidden = !h; midBar.classList.toggle('offen', midBarAuf); }
    for (const el of midBar.querySelectorAll('[data-ev-bis]')) setText(el, fmtDHMS(Math.max(0, +el.dataset.evBis - now) / 1000));
}
midBar.addEventListener('click', e => { const c = e.target.closest('[data-mb]'); if (!c) return;
    if (c.dataset.mb === 'mehr') { midBarAuf = !midBarAuf; renderMidBar(); return; }
    midBarAuf = false;
    if (c.dataset.mb === 'woche') { openGoals('tour'); return; }
    if (c.dataset.mb === 'thron') { openGoals('thron'); return; }
    if (c.dataset.mb.startsWith('ev-')) { openGoals(c.dataset.mb.slice(3)); return; }
    const m = islandById[megaTempleId]; if (!m) return; closeAllPopups(); flyTo(m.x, m.y, { zoom: clampZoom(viewW * .7 / HEILIGTUM_BREITE.megaTemple) }); setTimeout(() => openIslandPopup(m), 650); });
function midAnzeige(now) {                            // jede Sekunde (auch bei Zuschauern): die Leiste unter dem HUD, das Wochen-Event im Events-Fenster
    renderMidBar();
    if (evOffen() && (goalsTab === 'tour' || goalsTab === 'thron') && now % 5000 < 1000) renderEvents();
    const st = goalsPopup.querySelector('[data-ev-st="thron"]'), an = thronLaeuft(now); if (st) st.classList.toggle('an', an);   // Chip „Thron“: grün = läuft
    setText(goalsPopup.querySelector('[data-ev-ab="thron"]'), an ? '' : 'Sa 10');
    if (isPanelOpen(herrPopup) && now % 5000 < 1000 && !herrPopup.contains(document.activeElement)) renderHerr();
}
function midNotice(island) {                          // das Kopfgeld auf dem Mega-Tempel
    const b = bountyOf(); let h = '';
    if (b && island.type === 'megaTemple') h += b.who === 'player' ? '<div class="notice notice--warn">' + icon('losses') + '<span><b>Kopfgeld auf dich: ' + fmtNum(b.gems) + ' Edelsteine + ' + fmtCompact(b.coins) + ' Münzen.</b> Wer dir den Thron abnimmt, kassiert alles – je länger du herrschst, desto mehr kommen.</span></div>'
        : '<div class="notice notice--gold">' + icon('coin') + '<span><b>Kopfgeld auf ' + escapeHtml(botById[b.who].name) + ': ' + fmtNum(b.gems) + ' Edelsteine + ' + fmtCompact(b.coins) + ' Münzen.</b> Nimm den Thron und kassiere alles.</span></div>';
    return h;
}

