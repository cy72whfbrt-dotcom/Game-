// ===== Teil 08-stadt.js: Stadt und Gebäude, Burg, Aussehen, Helden, Stadtansicht, Stufenaufstieg =====
// ===== CAPITAL / CITY (step 1: buildings can be built and upgraded, effects come later) =====
var CITY_BUILDINGS = [
    { id: 'academy',  name: 'Labor',         icon: 'flask',   x: 215, y: 430, roof: '#2f4f86', dome: true,
      desc: 'Hier wird alles geforscht: Wirtschaft (auch Tempel), Militär und Erkundung (auch Späher und Wachturm) – eine Forschung gleichzeitig, jede kostet Rohstoffe und Zeit. Jede Stufe erlaubt weitere Forschung und lässt deine Truppen 2 % schneller laufen.' },
    { id: 'forge',    name: 'Schmiede',      icon: 'weapon',  x: 785, y: 430, roof: '#4a4a52', chimney: true,
      desc: 'Wähle oben die Art und dann ein Ausrüstungsteil aus deinem Besitz, um es mit Sternen zu verbessern: jeder Stern +20 % Wirkung des Teils. Jede Stufe erlaubt einen Stern mehr.' },
    { id: 'hospital', name: 'Krankenhaus',   icon: 'plus',    x: 215, y: 670, roof: '#e8e2d2', cross: true,
      desc: 'Von deinen Gefallenen (Angriff oder Verteidigung) kommen Verwundete hierher statt zu sterben (5 % pro Stufe, bis 60 %). Heile sie gegen Münzen – sie gehen in die Hauptstadt.' },
    { id: 'wall',     name: 'Mauer',         icon: 'defense', x: 715, y: 815, roof: '#6b6456', gate: true,
      desc: 'Stärkt die Verteidigung aller deiner Basen: +2 % pro Stufe (Stufe 25: +50 %). Beispiel: 10 Mio. Verteidigung und Mauer Stufe 5 ergeben 11 Mio.' },
    { id: 'heroes',   name: 'Heldenhalle',   icon: 'profile', x: 285, y: 815, roof: '#7a2e2a',
      desc: 'Hier leben deine Helden: mit Splittern freischalten, Sterne aufwerten, Fähigkeiten wählen. Ein Held führt einen Angriff oder eine Armee. Jede Stufe gibt allen Helden +' + HERO_HALL_GEF + ' % Gefolge.' },
    { id: 'embassy',  name: 'Botschaft',     icon: 'bund',
      desc: 'Das Bündnis-Gebäude: je Stufe mehr Platz für Verstärkung von Mitgliedern, größere Rallys (mehr Truppen dürfen beitreten) und mehr Bündnis-Hilfen (Mitglieder tippen „Helfen“ – dein Bau oder deine Forschung geht schneller). Dazu laufen Hilfe und Rally-Truppen schneller, Geschenke sind größer. Ab Burg-Stufe 5.' },
    { id: 'market',   name: 'Markt',         icon: 'market',
      desc: 'Tausche Holz, Stein und Eisen gegen Münzen – oder kaufe Rohstoffe, die dir fehlen. Mit Gebühr (sinkt mit jeder Stufe) und Tageslimit. Ab Burg-Stufe 4.' },
    // Rohstoffe kommen aus der Stadt (Alexander 2.10.): je ein Gebäude in der Stadt (seit 4.10. innerhalb der Mauer), dazu die Felder draußen zum Sammeln
    { id: 'lumber',   name: 'Holzfäller',    icon: 'wood',
      desc: 'Fällt Holz in deiner Stadt – jede Stunde, auch wenn du nicht spielst. Jede Stufe bringt mehr. Holz brauchst du für die Burg, Gebäude und Forschung.' },
    { id: 'quarry',   name: 'Steinbruch',    icon: 'stone',
      desc: 'Bricht Stein in deiner Stadt – jede Stunde, auch wenn du nicht spielst. Jede Stufe bringt mehr. Stein brauchst du vor allem für Burg, Mauer und Gebäude.' },
    { id: 'mine',     name: 'Eisenmine',     icon: 'iron',
      desc: 'Fördert Eisen in deiner Stadt – jede Stunde, auch wenn du nicht spielst. Jede Stufe bringt mehr. Eisen brauchst du für die Burg, Gebäude und Forschung.' }
];
// Beute (Alexander 4.10.) – gleich für alle. Die Burg schützt von jedem Rohstoff (Gold, Holz, Stein, Eisen) einen Teil.
// Fällt eine Basis (Turm): der Sieger bekommt NUR Gold (ein kleiner Teil über dem Schutz). Die Hauptstadt fällt nie: gewinnt der
// Angreifer, bekommt er von JEDEM Rohstoff einen kleinen Teil über dem Schutz (HAUPT_BEUTE) und die Hauptstadt brennt (nur zu
// sehen). Gewinnt der Verteidiger, bekommt der Angreifer nichts. Rohstoffe gibt es nur aus der Hauptstadt.
const HAUPT_BEUTE = .1;                              // Hauptstadt: 10 % von jedem Rohstoff über dem Schutz – klein, damit man oft angreifen muss
const schutzVon = who => AUF ? AUF.burgSchutz(who) : 0;
function plunderOf(who, capital) {                  // { loot (Gold), roh: {h, s, e} (nur Hauptstadt), safe }
    const have = Math.max(0, who === 'player' ? coins : botCoins[who] || 0), safe = schutzVon(who);
    if (capital) { const r = AUF ? AUF.rohVon(who) : null, roh = { h: 0, s: 0, e: 0 };
        if (r) for (const x of ['h', 's', 'e']) roh[x] = Math.floor(Math.max(0, (r[x] || 0) - safe) * HAUPT_BEUTE);
        return { loot: Math.floor(Math.max(0, have - safe) * HAUPT_BEUTE), roh, safe }; }   // (safe: der Burg-Schutz je Rohstoff – so steht er im Bericht)
    return { loot: 0, safe: Math.min(have, safe) };   // Beute (Gold, Holz, Stein, Eisen) gibt es NUR an der Hauptstadt (Alexander 4.10.)
}
function plunderMove(from, to, loot, roh) {         // Gold (und bei der Hauptstadt Holz, Stein, Eisen) wechselt den Besitzer
    if (loot > 0) { if (from === 'player') coins -= loot; else botCoins[from] = Math.max(0, (botCoins[from] || 0) - loot);
        if (to === 'player') coins += loot; else if (to) botCoins[to] = (botCoins[to] || 0) + loot; }
    if (roh && AUF && (roh.h || roh.s || roh.e)) { AUF.rohDazu(from, { h: -roh.h, s: -roh.s, e: -roh.e }); if (to) AUF.rohDazu(to, roh); }
}
const beuteText = p => p ? [p.loot ? fmtCompact(p.loot) + ' Gold' : '', ...(p.roh ? [['h', 'Holz'], ['s', 'Stein'], ['e', 'Eisen']].filter(([x]) => p.roh[x] > 0).map(([x, n]) => fmtCompact(p.roh[x]) + ' ' + n) : [])].filter(Boolean).join(', ') : '';
// die Hauptstadt brennt nach einem verlorenen Kampf (nur zu sehen) – Welt-Teil openWaterBrand: { Basis: brennt bis }
const BRAND_MS = 30 * 60000;
var brand = (() => { try { const v = JSON.parse(store.get('openWaterBrand')); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } })();
function brandSetzen(id) { const now = Date.now(); for (const k in brand) if (brand[k] < now) delete brand[k]; brand[id] = now + BRAND_MS; store.set('openWaterBrand', JSON.stringify(brand)); requestRender(); }
const brennt = id => (brand[id] || 0) > Date.now();
var CITY_MAX_LEVEL = 25, CITY_GEMS_PER_MIN = 1;
function cityMaxLevel(id) { return id === 'forge' ? STAR_MAX : id === 'hospital' ? 40 : CITY_MAX_LEVEL; }   // (die Burg: 25, siehe aufbau.js)   // the Schmiede stops at the star maximum, the Krankenhaus goes on to 40 (room for huge armies)
var cityState = null;
function loadCity() {
    if (cityState) return cityState;
    try { cityState = JSON.parse(store.get('openWaterCity')) || null; } catch (e) { cityState = null; }
    if (!cityState || !cityState.levels) cityState = { levels: {}, builds: [] };
    for (const b of CITY_BUILDINGS) if (typeof cityState.levels[b.id] !== 'number') cityState.levels[b.id] = 0;
    if (!(cityState.levels.keep >= 1)) cityState.levels.keep = 1;                                  // Paket D: Burg-Stufe (alte Spielstände: 1)
    if (!cityState.fo || typeof cityState.fo !== 'object') cityState.fo = {}; delete cityState.tier; delete cityState.tierBez;   // Forschung (Truppen-Stufen gibt es nicht mehr)
    cityBuildsFix(cityState);
    if (typeof cityState.wounded !== 'number') cityState.wounded = 0;
    cityState.levels.forge = Math.min(cityState.levels.forge, cityMaxLevel('forge'));   // the Schmiede ends at the star maximum
    return cityState;
}
function cityBuildsFix(c) {                       // one builder (c.build) → a list of builds (c.builds); a running build keeps going. Also for everyone else's city
    if (!Array.isArray(c.builds)) c.builds = c.build ? [c.build] : []; delete c.build;
    if (typeof c.builder2 !== 'boolean') c.builder2 = false;
    if (typeof CITY_BUILDINGS !== 'undefined' && CITY_BUILDINGS) c.builds = c.builds.filter(b => b && (b.id === 'keep' ? b.to <= 25 : CITY_BUILDINGS.some(d => d.id === b.id) && b.to <= cityMaxLevel(b.id))).slice(0, c.builder2 ? 2 : 1);   // (die Burg baut auch ein Bauarbeiter)   // (a removed building, a Schmiede above the star maximum)
    for (const b of c.builds) cityClampBuild(b, Date.now());
    return c;
}
var CITY_BUILDER2_GEMS = 500;                     // the second builder: bought once, for good
const citySlots = c => c.builder2 ? 2 : 1;
const cityBuildOf = (c, id) => c.builds.find(b => b.id === id) || null;
function saveCity() { store.set('openWaterCity', JSON.stringify(cityState)); }
const KEEP_DEF = { id: 'keep', name: 'Burg', icon: 'castle' };   // die Burg als „Gebäude“ (Bauarbeiter, Bauzeit) – Paket D
function cityDef(id) { return id === 'keep' ? KEEP_DEF : CITY_BUILDINGS.find(b => b.id === id); }
function cityCost(id, level) {                    // coins to go from `level` to level + 1
    if (id === 'keep') return niceRound(2000 * Math.pow(1.85, level - 1));   // Burg-Stufe (dazu Rohstoffe: aufbau.js)
    return niceRound(500 * Math.pow(1.9, level));
}
function cityTimeRoh(id, level) {                 // build time for level -> level + 1 – auch der Weltrechner prüft damit (Hauptbuch)
    // fast at first (20 s … 1,5 h up to level 12), then +20 % per level, never more than 7 days - like the big strategy games
    return id === 'keep' ? (AUF ? AUF.burgZeitRoh(level) : 60 * Math.pow(1.55, level - 1)) : Math.min(7 * 86400, level <= 12 ? 20 * Math.pow(1.6, level) : 20 * Math.pow(1.6, 12) * Math.pow(1.2, level - 12));   // die Burg: eigene, längere Zeiten
}
function cityTimeSec(id, level) {
    return Math.round(cityTimeRoh(id, level));
}
function cityClampBuild(b, now) {                 // a build started under the old, far too long times ends by the new rule at the latest
    if (b && b.endsAt - (b.startedAt || now) > cityTimeSec(b.id, b.to - 1) * 1000) b.endsAt = Math.min(b.endsAt, (b.startedAt || now) + cityTimeSec(b.id, b.to - 1) * 1000);
}
function fmtDuration(sec) {
    return fmtDHMS(sec);
}
function cityBlocker(id) {                        // why this building can't be upgraded right now (or null)
    const c = loadCity(), lvl = id === 'keep' ? c.levels.keep || 1 : c.levels[id];
    if (lvl >= (id === 'keep' ? 25 : cityMaxLevel(id))) return 'Maximale Stufe erreicht.';
    if (cityBuildOf(c, id)) return 'Wird gerade gebaut.';
    if (AUF && id !== 'keep') { const B = AUF.burgStufe('player');                 // Paket D: höchstens bis zur Burg-Stufe, neue Gebäude erst ab einer Burg-Stufe
        if (!lvl && AUF.BAU_AB_BURG[id] > B) return 'Braucht Burg-Stufe ' + AUF.BAU_AB_BURG[id] + ' (jetzt ' + B + ').';
        if (lvl >= AUF.stadtCap('player', id)) return 'Erst die Burg aufwerten – Gebäude gehen höchstens bis zur Burg-Stufe (' + B + ').'; }
    if (c.builds.length >= citySlots(c)) return c.builder2 ? 'Beide Bauarbeiter sind beschäftigt.' : 'Der Bauarbeiter ist beschäftigt (' + cityDef(c.builds[0].id).name + '). Ein zweiter kostet ' + CITY_BUILDER2_GEMS + ' Gems.';
    return null;
}
function cityStartBuild(id) {
    const c = loadCity(), lvl = id === 'keep' ? c.levels.keep || 1 : c.levels[id];
    if (cityBlocker(id)) return;
    const k = AUF ? AUF.stadtKosten(id, lvl) : { c: cityCost(id, lvl) };          // Münzen + Holz, Stein, Eisen
    if (AUF ? !AUF.zahlen('player', k) : coins < k.c) { flashHint('Nicht genug Münzen oder Rohstoffe für ' + cityDef(id).name + ' Stufe ' + (lvl + 1) + '.', 2500); return; }
    if (!AUF) coins -= k.c;
    c.builds.push({ id, to: lvl + 1, startedAt: Date.now(), endsAt: Date.now() + cityTimeSec(id, lvl) * 1000 });
    saveCity(); saveGame(); updateHud(); sfx('upgrade');
    renderCitySheet(); updateCityBuilder();
}
function citySpeedCost(id) {
    const c = loadCity(), b = cityBuildOf(c, id); if (!b) return 0;
    return Math.max(1, Math.ceil((b.endsAt - Date.now()) / 60000) * CITY_GEMS_PER_MIN);
}
function cityFinishBuild(announce, id) {
    const c = loadCity(), b = cityBuildOf(c, id); if (!b) return;
    const def = cityDef(b.id);
    c.levels[b.id] = b.to;
    const to = b.to; c.builds = c.builds.filter(x => x !== b);
    saveCity();
    if (announce) flashHint(def.name + ' ist fertig – jetzt ' + (b.id === 'keep' ? 'Burg-Stufe ' : 'Stufe ') + to + '.', 3000);
    if (cityOpenId) renderCitySheet();
    updateCityBuilder();
}
function cityTick() {
    const c = loadCity();
    for (const b of c.builds.slice()) if (Date.now() >= b.endsAt) cityFinishBuild(true, b.id);
    if (AUF) AUF.spielerTakt();                                                     // Forschung fertig?
    if (!document.getElementById('cityView').hidden) { updateCityBuilder(); if (cityOpenId) renderCitySheetTimer(); }
}
setInterval(cityTick, 1000);

// --- view ---
var cityDrag = null, cityOpenId = null, cityRaf = 0, cityHitRects = [];
const cityView = document.getElementById('cityView'), cityCanvas = document.getElementById('cityCanvas'), cityCtx = cityCanvas.getContext('2d');
// ===== ENTERING AND LEAVING: like the big strategy games - the map dives into your capital, you pass through the
// clouds and come out above your town; leaving, the town falls away below the clouds and the map opens up again.
const cloudFx = document.createElement('canvas');
cloudFx.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:60;pointer-events:none;display:none';
document.body.appendChild(cloudFx);
const CLOUD_PUFFS = (() => { const r = mulberry32(31), out = []; for (let i = 0; i < 22; i++) { const a = r() * Math.PI * 2; out.push({ a, d: .15 + r() * .55, s: .28 + r() * .32, sh: .82 + r() * .14 }); } return out; })();
let cloudAnim = null, cityMapReturn = null, cityBusy = false, cloudCover = 0;   // cloudCover: wie dicht die Wolken gerade sind (ab .95 alles weiß – dahinter muss nichts gezeichnet werden)
// Die Wolken sind weiche Verläufe ohne Kanten: sie werden in halber Auflösung gemalt (CLOUD_RES Bildpunkte pro Bildschirm-
// Punkt) und vom Browser hochgezogen – sieht gleich aus, kostet am Handy aber nur einen Bruchteil (vorher ~22 bildschirmgroße
// Verläufe in voller Auflösung pro Bild, und dahinter liefen Stadt und Karte weiter).
const CLOUD_RES = .5;
function cloudsRun(dur, c0, c1, then) {                                   // cover goes c0 → c1 (0 = clear sky, 1 = inside the cloud)
    cloudAnim = { t0: performance.now(), dur, c0, c1, then }; cloudFx.style.display = 'block';
    const step = now => {
        const a = cloudAnim; if (!a) return;
        const q = Math.min(1, (now - a.t0) / a.dur), e = q < .5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2, c = a.c0 + (a.c1 - a.c0) * e;
        cloudCover = c;
        const dpr3 = CLOUD_RES, W = window.innerWidth, H = window.innerHeight;
        if (cloudFx.width !== Math.round(W * dpr3) || cloudFx.height !== Math.round(H * dpr3)) { cloudFx.width = Math.round(W * dpr3); cloudFx.height = Math.round(H * dpr3); }
        const g = cloudFx.getContext('2d'); g.setTransform(dpr3, 0, 0, dpr3, 0, 0); g.clearRect(0, 0, W, H);
        const R = Math.hypot(W, H);
        if (c > .6) { g.fillStyle = 'rgba(236,240,244,' + Math.min(1, (c - .6) / .35) + ')'; g.fillRect(0, 0, W, H); }   // deep inside: white-out
        for (const p of CLOUD_PUFFS) {                                     // puffs drift in from the edges as the cover grows, part again as it falls
            const dist = (p.d + (1 - c) * .9) * R * .6, x = W / 2 + Math.cos(p.a) * dist, y = H / 2 + Math.sin(p.a) * dist * .75, rad = p.s * R * (.55 + c * .5);
            const gr = g.createRadialGradient(x - rad * .2, y - rad * .25, rad * .05, x, y, rad);
            const al = Math.min(1, c * 1.6);
            gr.addColorStop(0, 'rgba(255,255,255,' + al + ')'); gr.addColorStop(.55, 'rgba(' + Math.round(235 * p.sh) + ',' + Math.round(240 * p.sh) + ',' + Math.round(246 * p.sh) + ',' + (al * .85) + ')'); gr.addColorStop(1, 'rgba(220,228,236,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
        }
        if (q < 1) requestAnimationFrame(step);
        else { const t = a.then; cloudAnim = null; if (c1 <= 0) { cloudFx.style.display = 'none'; cloudCover = 0; } if (t) t(); }
    };
    requestAnimationFrame(step);
}
function cityShow() {
    loadCity();
    document.getElementById('cityName').textContent = (profileName.value || 'Deine') + (profileName.value ? 's Hauptstadt' : ' Hauptstadt');
    cityView.hidden = false; stadtLeiste(true);
    cityOpenId = null; cityRingZu(); document.getElementById('citySheet').hidden = true;
    updateCityBuilder();
    cancelAnimationFrame(cityRaf); cityRaf = requestAnimationFrame(cityFrame);
}
function openCity() {
    if (cityBusy || !cityView.hidden) return;
    closeAllPopups();
    const home = islandById[playerIslandId];
    cityMapReturn = { zoom: mapState.zoom, x: (viewW / 2 - mapState.offsetX) / mapState.zoom, y: (viewH / 2 - mapState.offsetY) / mapState.zoom };   // where the map was, to go back there
    if (!home) { cityShow(); return; }
    cityBusy = true;
    flyTo(home.x, home.y, { zoom: maxZoom, ms: 650 });                      // 1) the map dives towards your capital
    setTimeout(() => cloudsRun(420, 0, 1, () => {                            // 2) into the clouds …
        cityShow(); if (cityCam) cityCam.anim = { from: .35, t0: performance.now(), dur: 900 };   // 3) … the town comes up from below
        else cityPendingAnim = true;
        cloudsRun(750, 1, 0, () => { cityBusy = false; });
    }), 300);
}
let cityPendingAnim = false;
function closeCity() {
    if (cityView.hidden) return false;
    if (cityBusy) return true;
    cityBusy = true; cityOpenId = null; cityRingZu(); document.getElementById('citySheet').hidden = true;
    if (cityCam) cityCam.anim = { from: 1, to: .3, t0: performance.now(), dur: 520 };   // the town falls away …
    cloudsRun(480, 0, 1, () => {                                              // … into the clouds …
        cityView.hidden = true; stadtLeiste(false); cancelAnimationFrame(cityRaf); cityLagenFrei();
        const home = islandById[playerIslandId], back = cityMapReturn || { zoom: mapState.zoom, x: (viewW / 2 - mapState.offsetX) / mapState.zoom, y: (viewH / 2 - mapState.offsetY) / mapState.zoom };
        cityMapReturn = null;
        if (home) flyTo(home.x, home.y, { zoom: maxZoom, instant: true });
        flyTo(back.x, back.y, { zoom: back.zoom, ms: 900 });                // … and the map opens up again where it was
        cloudsRun(700, 1, 0, () => { cityBusy = false; });
    });
    return true;
}
let cityB2Armed = 0;                              // the buy button asks once more before 500 gems go
function updateCityBuilder() {
    const c = loadCity(), el = document.getElementById('cityBuilder'), now = Date.now();
    liveHtml(el, [0, 1].map(i => { const b = c.builds[i];          // (jede Sekunde: neu geschrieben wird nur, was sich ändert – die Restzeit zählt von selbst)
        if (b) return '<button type="button" class="cb-slot is-busy" data-cb-open="' + b.id + '">' + icon('hourglass') + '<span>' + cityDef(b.id).name + '</span><b>' + uhrHtml(b.endsAt) + '</b></button>';
        if (i === 0 || c.builder2) return '<span class="cb-slot">' + icon('check') + '<span>' + (c.builder2 ? (i + 1) + '. Bauarbeiter frei' : 'Bauarbeiter frei') + '</span></span>';
        return '<button type="button" class="cb-slot cb-buy' + (cityB2Armed > now ? ' is-armed' : '') + '" data-cb-buy>' + icon('plus') + '<span>' + (cityB2Armed > now ? 'Wirklich kaufen?' : '2. Bauarbeiter') + '</span><b>' + icon('gem') + CITY_BUILDER2_GEMS + '</b></button>';
    }).join(''));
}
function cityBuyBuilder2() {
    const c = loadCity(); if (c.builder2) return;
    if (gems < CITY_BUILDER2_GEMS) { flashHint('Zu wenig Gems – der zweite Bauarbeiter kostet ' + CITY_BUILDER2_GEMS + ' Gems.', 2500); return; }
    if (cityB2Armed < Date.now()) { cityB2Armed = Date.now() + 4000; updateCityBuilder(); return; }
    if (cityB2Armed - Date.now() > 3550) return;                  // ein Doppel-Tipp ist keine Bestätigung (500 Gems)
    gems -= CITY_BUILDER2_GEMS; c.builder2 = true; cityB2Armed = 0; saveCity(); saveGame(); updateHud(); sfx('upgrade');
    flashHint('Dein zweiter Bauarbeiter ist da – jetzt bauen zwei Gebäude gleichzeitig.', 3000);
    updateCityBuilder(); if (cityOpenId) renderCitySheet();
}
document.getElementById('cityBuilder').addEventListener('click', e => {
    if (e.target.closest('[data-cb-buy]')) return cityBuyBuilder2();
    const o = e.target.closest('[data-cb-open]'); if (o) { cityOpenId = o.dataset.cbOpen === 'keep' ? '_keep' : o.dataset.cbOpen; cityPage = 'bau'; cityFocus(cityOpenId); renderCitySheet(); }   // opens that building's sheet (die Burg: ihr Fenster)
});
const cityBauId = id => id === '_keep' ? 'keep' : id;   // das Burg-Fenster heißt '_keep', ihr Ausbau 'keep'
function renderCitySheetTimer() {
    const c = loadCity(), b = cityBuildOf(c, cityBauId(cityOpenId));
    if (!b) return;
    const el = document.querySelector('#cityBNote .city-progress i'); if (!el) return renderCitySheet();
    const tot = b.endsAt - b.startedAt, done = Date.now() - b.startedAt;
    el.style.setProperty('--p', Math.min(100, done / tot * 100) + '%');
    document.querySelector('#cityBNoteTime').textContent = fmtDuration((b.endsAt - Date.now()) / 1000);
    setBtnLabel(document.getElementById('citySpeedBtn'), 'Fertig für ' + citySpeedCost(b.id) + ' Gems');
    document.getElementById('citySpeedBtn').disabled = gems < citySpeedCost(b.id);
}
// ===== DEINE BURG (tap the castle in the city): upgrade it, pick a skin, switch on a Friedensschild =====
var SKIN_DEFS = {
    standard: { id: 'standard', name: 'Standard', cost: 0, stone: null, roof: null },
    winter:   { id: 'winter',   name: 'Winterburg',     cost: 200, stone: ['#f6f9fd', '#cfd9e5', '#8797ab'], roof: ['#ffffff', '#c8dbef', '#6f86a3'] },
    wald:     { id: 'wald',     name: 'Waldfestung',    cost: 200, stone: ['#d9dcc3', '#a4aa86', '#63694b'], roof: ['#86b86f', '#3f7a3a', '#1f3d1c'] },
    schatten: { id: 'schatten', name: 'Schattenfeste',  cost: 300, stone: ['#8a8698', '#5d5868', '#2e2b36'], roof: ['#a585cf', '#5b2c6f', '#2a1033'] },
    gold:     { id: 'gold',     name: 'Goldene Feste',  cost: 500, stone: ['#f6e7c1', '#d6ba7f', '#8e6d35'], roof: ['#fff1b8', '#e2b54a', '#7a5414'] }
};
function loadSkins() { let v; try { v = JSON.parse(store.get('openWaterSkins')); } catch (e) {} return Object.assign({ own: ['standard'], active: 'standard' }, v || {}); }
function activeSkin() { const v = loadSkins(), d = SKIN_DEFS[v.active]; return d && d.stone ? d : null; }
function shieldStock() { let v; try { v = JSON.parse(store.get('openWaterShieldStock')); } catch (e) {} return Object.assign({ 2: 0, 8: 0, 24: 0 }, v || {}); }
function renderKeepSheet() { return AUF.renderKeep(); }   // die Burg-Stufe (aufbau.js)
// ===== AUSSEHEN: every look in one place - Wappen, Rahmen, Titel, Basis-Skin (+ Ring), Marsch-Skin. Only to buy (Gems or Thron-Punkte) or a title from the middle =====
var lkTab = 'frame';
function lkPrice(d) { if (d.buy === 'pass') return '<span class="lk-cost">' + icon('crown') + 'Saison-Pass</span>'; return d.tp ? '<span class="lk-cost' + ((throneState.pts || 0) < d.tp ? ' is-bad' : '') + '">' + icon('crown') + fmtNum(d.tp) + '</span>' : '<span class="lk-cost' + (gems < d.gems ? ' is-bad' : '') + '">' + icon('gem') + fmtNum(d.gems) + '</span>'; }
function lkCard(kind, d, prev, has, on, label) {     // one look: preview, name, and Angelegt / Anlegen / price
    return '<button type="button" class="skin-card lk-card' + (on ? ' on' : '') + (has ? '' : ' is-shop') + '" data-lk="' + kind + ':' + d.id + '">' + prev + (label === false ? '' : '<b>' + (label || d.name) + '</b>') +
        '<small>' + (on ? icon('check') + 'Angelegt' : has ? 'Anlegen' : lkPrice(d)) + '</small></button>';
}
function lkDef(kind, id) {
    if (kind === 'frame') return FRAMES.find(f => f.id === id); if (kind === 'title') return TITLES_P.find(t => t.id === id); if (kind === 'march') return MARCH_SKINS.find(m => m.id === id);
    if (kind === 'style') return BAUSTILE[id] ? Object.assign({ id, name: BAUSTILE[id] }, BAUSTIL_PRICE[id]) : null;
    if (kind === 'color') { const d = SKIN_DEFS[id]; return d ? { id, name: d.name, gems: d.cost } : null; } return null;
}
function lkHas(kind, id) { const d = lkDef(kind, id); if (!d) return false;
    if (kind === 'frame') return lookOwns('frames', d); if (kind === 'title') return lookOwns('titles', d); if (kind === 'march') return d.gems === 0 || (look.marchs || []).includes(id);
    if (kind === 'style') return loadBaustil().own.includes(id); return loadSkins().own.includes(id); }
function lkUse(kind, id) {                            // put on something you own
    if (kind === 'frame' || kind === 'title' || kind === 'march') { look[kind] = id; saveLook(); }
    else if (kind === 'style') { const v = loadBaustil(); v.style = id; store.set('openWaterBaustil', JSON.stringify(v)); }
    else if (kind === 'color') { const sk = loadSkins(); sk.active = id; store.set('openWaterSkins', JSON.stringify(sk)); BUILDING_SPRITES.clear(); }
    renderLook(); if (cityOpenId === '_keep') renderKeepSheet(); requestRender();
}
function lkBuy(kind, id) {                            // Gems or Thron-Punkte; bought = put on at once
    const d = lkDef(kind, id); if (!d) return;
    if (lkHas(kind, id)) { lkUse(kind, id); return; }
    if (d.buy === 'pass') { flashHint('„' + d.name + '“ gibt es nur im Saison-Pass (Premium-Reihe) – unter „Events“.', 3000); return; }
    const cost = d.tp || d.gems || 0;
    if (d.tp ? (throneState.pts || 0) < cost : gems < cost) { flashHint('Zu wenig ' + (d.tp ? 'Thron-Punkte' : 'Gems') + ' – „' + d.name + '“ kostet ' + fmtNum(cost) + '.', 2500); return; }
    if (d.tp) { throneState.pts -= cost; saveThrone(); } else gems -= cost;
    if (d.buy === 'throne') throneGive('player', 'look');                   // Thronhüter + Thron-Rahmen come together
    else if (kind === 'frame' || kind === 'title' || kind === 'march') { const k = kind + 's'; look[k] = [...new Set([...(look[k] || []), id])]; saveLook(); }
    else if (kind === 'style') { const v = loadBaustil(); v.own = [...new Set([...v.own, id])]; store.set('openWaterBaustil', JSON.stringify(v)); }
    else { const sk = loadSkins(); sk.own = [...new Set([...sk.own, id])]; store.set('openWaterSkins', JSON.stringify(sk)); }
    if (d.buy !== 'throne') lkUse(kind, id); else renderLook();
    updateHud(); saveGame(); sfx('coin'); flashHint('„' + d.name + '“ gekauft und angelegt.', 2500);
}
function renderLookTop() {                            // what you wear now + what you can pay with
    const el = document.getElementById('lkTop'); if (!el || document.getElementById('lookSheet').hidden) return;
    const fr = playerFrame(), mt = titleOf('player'), rl = rulerOwner() === 'player';
    liveHtml(el, '<span class="frame-ring lk-me" data-frame="' + fr + '"><img alt="" src="' + crestDataUrl(48) + '"></span>' +
        '<span class="lk-me-t"><b>' + escapeHtml(profileName.value || 'Du') + '</b><small>' + escapeHtml(playerTitle()) + (rl ? ' · Herrscher der Meere' : mt ? ' · ' + mt.name : '') + '</small></span>' +
        '<span class="lk-pay"><span class="pill pill--gem">' + icon('gem') + '<b>' + fmtCompact(Math.floor(gems)) + '</b></span><span class="pill pill--throne">' + icon('crown') + '<b>' + fmtCompact(throneState.pts || 0) + '</b></span></span>');
}
function lkMarchPrev() {                              // the march cards: a little column with your flag and the trail
    for (const cv of document.querySelectorAll('[data-march-prev]')) { const g = cv.getContext('2d'), sk = MARCH_SKINS.find(m => m.id === cv.dataset.marchPrev), K = cv.width / 110, W = 110, y = 38;   // drawn on a 110 x 55 grid
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(K, 0, 0, K, 0, 0);
        const tip = W - 22, at = d => ({ x: tip - 60 + d, y });
        g.strokeStyle = 'rgba(228,200,134,.4)'; g.lineWidth = 1.5; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(4, y); g.lineTo(W - 4, y); g.stroke(); g.setLineDash([]);
        marchTrail(g, at, 60, sk, 900, 1);
        for (let i = 0; i < 4; i++) { const x = tip - 13 - Math.floor(i / 2) * 8.5, yy = y + (i % 2 ? 3.4 : -3.4);
            g.fillStyle = '#1a1d24'; g.fillRect(x - 1.7, yy - 3.4, 3.4, 6); g.fillStyle = '#ff8d82'; g.fillRect(x + .8, yy - 2.8, 1.8, 3.6);
            g.fillStyle = '#aab2bc'; g.beginPath(); g.arc(x, yy - 4.7, 1.6, 0, Math.PI * 2); g.fill(); }
        g.beginPath(); g.arc(tip, y, 7.5, 0, Math.PI * 2); g.fillStyle = '#141820'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#ff8d82'; g.stroke(); drawGlyph(g, 'attack', tip, y, 10, '#ff8d82');
        marchFlag(g, tip, y, sk, 'player'); }
}
function renderLookSheet(live) {                     // live = jede Sekunde aus liveTick: der Wappen-Editor bleibt, wie er ist
    const sh = document.getElementById('lookSheet'); if (!sh || sh.hidden) return;
    const top = sh.scrollTop; renderLookTop();
    if (live && lkTab === 'crest') return;
    for (const b of document.querySelectorAll('#lkTabs [data-lk-tab]')) { const on = b.dataset.lkTab === lkTab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    document.getElementById('crestPage').hidden = lkTab !== 'crest';
    const el = document.getElementById('lkPane'); el.hidden = lkTab === 'crest'; let h = '';
    if (lkTab === 'crest') { if (!live) renderCrestEditor(); }
    else if (lkTab === 'frame') { const fr = playerFrame(), img = '<img alt="" src="' + crestDataUrl(36) + '">';
        h = '<div class="skin-grid lk-grid">' + FRAMES.map(f => lkCard('frame', f, '<span class="frame-ring lk-frame" data-frame="' + f.id + '">' + img + '</span>', lkHas('frame', f.id), f.id === fr)).join('') + '</div>' +
            '<small class="keep-note">Dein Rahmen um Wappen und Profil – so sehen dich alle in der Rangliste. Der Thron-Rahmen kommt mit dem Titel „Thronhüter“.</small>'; }
    else if (lkTab === 'title') { const cur = playerTitle(), mt = titleOf('player'), rl = rulerOwner() === 'player', own = TITLES_P.filter(t => lkHas('title', t.id)), buy = TITLES_P.filter(t => !lkHas('title', t.id));
        h = '<div class="keep-h">Titel aus der Mitte</div><div class="lk-mid' + (rl ? ' is-ruler' : mt ? (mt.good ? ' is-good' : ' is-bad') : '') + '">' + icon('crown') + '<span><b>' + (rl ? 'Herrscher der Meere' : mt ? mt.name : 'Gerade keiner') + '</b><small>' +
                (rl ? 'Solange du den Mega-Tempel hältst · Ring Blutrot-Gold' : mt ? mt.desc + ' · gilt bis zum nächsten Herrscher' : 'Titel aus der Mitte vergibt der Herrscher – sie kommen und gehen.') + '</small></span></div>' +
            '<div class="keep-h">Deine Titel</div><div class="look-titles">' + own.map(t => '<button type="button" class="look-title' + (t.name === cur ? ' on' : '') + '" data-lk="title:' + t.id + '">' + (t.name === cur ? icon('check') : '') + t.name + '</button>').join('') + '</div>' +
            (buy.length ? '<div class="keep-h">Zu kaufen</div><div class="skin-grid lk-grid lk-grid--t">' + buy.map(t => lkCard('title', t, '<span class="lk-plate">' + t.name + '</span>', false, false, false)).join('') + '</div>' : '') +
            '<small class="keep-note">Dein Titel steht im Profil und in der Rangliste.</small>'; }
    else if (lkTab === 'base') { const bs = loadBaustil(), sk = loadSkins();
        h = '<div class="keep-h">Baustil</div><div class="skin-grid lk-grid">' + Object.keys(BAUSTILE).map(k => lkCard('style', lkDef('style', k), '<canvas data-bk-prev="' + k + '" width="120" height="132"></canvas>', lkHas('style', k), bs.style === k)).join('') + '</div>' +
            '<small class="keep-note">Gilt für alle deine Basen. Die Stufe zeigt der Stein, dich zeigen Dach und Fahne mit deinem Wappen.</small>' +
            '<div class="keep-h">Hauptstadt</div><div class="keep-shields lk-cap">' + [['huegel', 'Auf Sockel'], ['wasser', 'Wasserschloss']].map(([k, n]) => '<button type="button" class="btn btn--' + (bs.cap === k ? 'primary' : 'secondary') + ' btn--sm" data-lk-cap="' + k + '">' + n + '</button>').join('') + '</div>' +
            '<div class="keep-h">Farbe der Hauptstadt</div><div class="skin-grid lk-grid">' + Object.keys(SKIN_DEFS).map(k => lkCard('color', lkDef('color', k), '<canvas data-skin-prev="' + k + '" width="120" height="132"></canvas>', sk.own.includes(k), sk.active === k)).join('') + '</div>' +
            '<div class="keep-h">Ring um deine Basen</div>' + ringCardsHtml(RING_SKINS, true) +
            '<div class="ring-legend"><span><i style="--c:#ffd05a"></i>Gold · guter Titel</span><span><i style="--c:#e13030"></i>Rot · Straf-Titel</span><span><i class="blood" style="--c:#eb3c32"></i>Blutrot-Gold · Herrscher</span></div>' +
            '<small class="keep-note">Ein Titel aus der Mitte geht vor, solange er gilt.' + ({ ruler: ' Du trägst gerade Blutrot-Gold.', good: ' Du trägst gerade Gold.', bad: ' Du trägst gerade Rot.' }[(ringStatusByOwner().get('player') || {}).k] || '') + '</small>'; }
    else if (lkTab === 'march') { const cur = marchSkinOf('player').id;
        h = '<div class="skin-grid lk-grid lk-grid--m">' + MARCH_SKINS.map(m => lkCard('march', m, '<canvas data-march-prev="' + m.id + '" width="308" height="154"></canvas>', lkHas('march', m.id), m.id === cur)).join('') + '</div>' +
            '<small class="keep-note">So ziehen deine Truppen über die Karte: die Fahne mit deinem Wappen vorneweg, dahinter die Spur.</small>'; }
    if (!liveHtml(el, h) && live) return;                // live und nichts geändert: die Vorschau-Bilder bleiben stehen
    if (lkTab === 'base') { bkPreviews(); const tier = towerTier(islandLevels[playerIslandId] || 1);
        for (const cv of el.querySelectorAll('[data-skin-prev]')) { const g = cv.getContext('2d'), d = SKIN_DEFS[cv.dataset.skinPrev];
            g.setTransform(1.75, 0, 0, 1.75, 60, 90); g.lineJoin = 'round'; paintTowerTier(g, 'player', true, true, tier, d.stone ? d : null); } }
    if (lkTab === 'march') lkMarchPrev();
    sh.scrollTop = top;
}
function openLookSheet(tab) { lookMigrate(); if (tab) lkTab = tab; const sh = document.getElementById('lookSheet'); sh.hidden = false; renderLookSheet(); sh.scrollTop = 0; }
function closeLookSheet() { document.getElementById('lookSheet').hidden = true; renderCrestCard(); if (cityOpenId === '_keep') renderKeepSheet(); }
document.getElementById('lookSheet').addEventListener('click', e => {
    if (e.target.closest('[data-lk-close]')) return closeLookSheet();
    const t = e.target.closest('[data-lk-tab]'); if (t) { lkTab = t.dataset.lkTab; renderLookSheet(); return; }
    const cp = e.target.closest('[data-lk-cap]'); if (cp) { const v = loadBaustil(); v.cap = cp.dataset.lkCap; store.set('openWaterBaustil', JSON.stringify(v)); renderLookSheet(); requestRender(); return; }
    const c = e.target.closest('[data-lk]'); if (!c) return; const [kind, id] = c.dataset.lk.split(':');
    lkHas(kind, id) ? lkUse(kind, id) : lkBuy(kind, id);
});
setTimeout(lookMigrate, 0);                             // after the whole script: the old rank / Erfolg looks become owned
// ===== Aussehen wie in den großen Aufbau-Spielen (Rise of Kingdoms, Alexander 4.10.): Gebäude antippen → runde Knöpfe
// am Gebäude; das Fenster zeigt das Gebäude als Bild, die Voraussetzungen mit Haken/Kreuz und „hast / brauchst“.
// Nur die Anzeige – Kosten, Zeiten und Regeln sind dieselben wie vorher. =====
var cityPage = 'bau', cityRingId = null;
function cityNutz(id, lvl) {                       // die eigene Seite eines Gebäudes (Forschen, Heilen …) → [Name, Zeichen] oder null
    if (id === 'academy') return lvl || loadCity().foRun ? ['Forschen', 'flask'] : null;
    if (id === 'heroes') return ['Helden', 'profile'];
    if (!lvl) return null;
    return { forge: ['Schmieden', 'weapon'], hospital: ['Heilen', 'plus'], market: ['Handeln', 'market'], embassy: ['Verstärkung', 'bund'] }[id] || null;
}
function cityBildSpr(id, lvl) {                    // dasselbe Bild wie in der Stadt
    if (id === 'keep') return citySprite('keep', Math.min(4, Math.floor((lvl || 1) / 5)));
    const t = cityTierOf(lvl);
    if (id === 'wall') return citySprite('gatehouse', t);
    return t ? citySprite(id, t, id === 'heroes' ? Math.ceil(HEROES.filter(h => heroOwned('player', h.id)).length / HEROES.length * 3) : '') : citySprite('ghost', 0, id);
}
function cityBildSetzen(id, lvl) {                 // das Gebäude-Bild oben links im Fenster (nur neu gemalt, wenn sich die Stufe ändert)
    const el = document.getElementById('cityBIcon'), s = cityBildSpr(id, lvl), key = id + ':' + (id === 'keep' ? Math.floor((lvl || 1) / 5) : cityTierOf(lvl)) + ':' + s.c.width;
    if (el.dataset.bild === key && el.firstChild && el.firstChild.tagName === 'CANVAS') return;
    el.dataset.bild = key; el._lh = undefined;
    const N = 192, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d'), f = Math.min(N / s.c.width, N / s.c.height) * 1.08, w = s.c.width * f, h = s.c.height * f;
    g.imageSmoothingQuality = 'high'; g.drawImage(s.c, (N - w) / 2, Math.min(N - h, (N - h) / 2 + N * .04), w, h);
    el.replaceChildren(cv);
}
function anfZeile(ok, ic, txt, val) {              // eine Voraussetzung: Zeichen, Text, (hast / brauchst), Haken oder Kreuz
    const [n, k] = Array.isArray(ic) ? ic : [ic];
    return '<div class="anf' + (ok ? ' is-ok' : ' is-bad') + '">' + icon(n, k) + '<span>' + txt + '</span>' + (val ? '<b>' + val + '</b>' : '') + '<i>' + icon(ok ? 'check' : 'close') + '</i></div>';
}
function anfKosten(k) {                            // Münzen und Rohstoffe: hast / brauchst
    if (!k) return ''; const r = AUF ? AUF.rohVon('player') || {} : {}, out = [];
    if (k.c) out.push(anfZeile(coins >= k.c, ['coin', 'icon--coin'], 'Münzen', fmtCompact(Math.floor(coins)) + ' / ' + fmtCompact(k.c)));
    if (AUF) for (const x of ['h', 's', 'e']) if (k[x]) out.push(anfZeile((r[x] || 0) >= k[x], [AUF.ROH_DEF[x].icon, 'roh-' + x], AUF.ROH_DEF[x].name, fmtCompact(Math.floor(r[x] || 0)) + ' / ' + fmtCompact(k[x])));
    return out.join('');
}
function cityAnfHtml(id, lvl, k) {                 // Voraussetzungen für die nächste Stufe (Burg, Bauarbeiter, Münzen, Rohstoffe)
    const c = loadCity(), rows = [];
    if (AUF && id !== 'keep') { const B = AUF.burgStufe('player'), need = !lvl ? AUF.BAU_AB_BURG[id] || 0 : B >= AUF.BURG_MAX ? 0 : lvl + 1;
        if (need > 1) rows.push(anfZeile(B >= need, 'castle', 'Burg Stufe ' + need)); }
    const frei = c.builds.length < citySlots(c);
    rows.push(anfZeile(frei, 'upgrade', frei ? 'Bauarbeiter frei' : 'Bauarbeiter beschäftigt (' + cityDef(c.builds[0].id).name + ')'));
    return '<div class="anf-h">Voraussetzungen</div><div class="anf-list">' + rows.join('') + anfKosten(k) + '</div>';
}
function citySeite(id, lvl) {                      // Reiter oben (Aufwerten | Forschen …) und welche Teile das Fenster zeigt
    const sh = document.getElementById('citySheet'), tabs = document.getElementById('cityTabs'), n = id === '_keep' ? null : cityNutz(id, lvl);
    if (!n) cityPage = 'bau';
    sh.classList.toggle('cs-nutz', !!n && cityPage === 'nutz'); sh.classList.toggle('cs-bau', !!n && cityPage === 'bau');
    tabs.hidden = !n;
    if (n) liveHtml(tabs, '<button type="button" data-cpage="bau"' + (cityPage === 'bau' ? ' class="on"' : '') + '>' + icon('upgrade') + 'Aufwerten</button><button type="button" data-cpage="nutz"' + (cityPage === 'nutz' ? ' class="on"' : '') + '>' + icon(n[1]) + n[0] + '</button>');
}
document.getElementById('cityTabs').addEventListener('click', e => { const b = e.target.closest('[data-cpage]'); if (b) { cityPage = b.dataset.cpage; renderCitySheet(); document.getElementById('citySheet').scrollTop = 0; } });
function renderCitySheet() {                       // (läuft auch jede Sekunde aus liveTick: geschrieben wird nur, was sich ändert)
    if (cityOpenId === 'keep') cityOpenId = '_keep';
    const id = cityOpenId; if (!id) return;
    cityRingZu();
    if (id === '_keep') { citySeite(id, 0); return renderKeepSheet(); }
    const c = loadCity(), def = cityDef(id), lvl = c.levels[id], max = lvl >= cityMaxLevel(id);
    document.getElementById('citySheet').hidden = false;
    citySeite(id, lvl);
    cityBildSetzen(id, lvl);
    setText(document.getElementById('cityBOver'), 'Gebäude');
    setText(document.getElementById('cityBName'), def.name);
    setText(document.getElementById('cityBLevel'), max ? 'Stufe ' + lvl + ' · höchste Stufe' : lvl ? 'Stufe ' + lvl + ' → ' + (lvl + 1) : 'Noch nicht gebaut');
    setText(document.getElementById('cityBDesc'), def.desc);
    const note = document.getElementById('cityBNote'), up = document.getElementById('cityUpgradeBtn'), sp = document.getElementById('citySpeedBtn');
    const bld = cityBuildOf(c, id), building = !!bld, blocker = cityBlocker(id);
    let cls, nh;
    if (building) { cls = 'notice notice--gold';
        nh = icon('hourglass') + '<span style="flex:1">Ausbau auf Stufe ' + bld.to + ' · noch <b id="cityBNoteTime"></b><div class="city-progress" style="margin-top:6px"><i></i></div>' + (typeof bundHilfeKnopf === 'function' ? bundHilfeKnopf('bau', id, bld.to, bld.endsAt) : '') + '</span>'; }
    else { cls = 'notice city-wirkung'; nh = icon('info') + '<span>' + cityEffectText(id, lvl) + '</span>'; }
    if (note.className !== cls) note.className = cls;
    liveHtml(note, nh);
    const cost = !max ? cityCost(id, lvl) : 0, kost = !max ? (AUF ? AUF.stadtKosten(id, lvl) : { c: cost }) : null;
    liveHtml(document.getElementById('cityBStats'), !max && !building ? cityAnfHtml(id, lvl, kost) : '');
    setBtnLabel(up, max ? 'Höchste Stufe' : lvl ? 'Aufwerten' : 'Bauen');
    setText(document.getElementById('cityUpTime'), max ? '' : fmtDuration(cityTimeSec(id, lvl)));
    up.disabled = !!blocker || (AUF ? !AUF.kannZahlen('player', kost) : coins < cost);
    up.title = blocker || '';
    up.style.display = building ? 'none' : '';
    sp.style.display = building ? '' : 'none';
    if (building) renderCitySheetTimer();
    liveHtml(document.getElementById('cityBExtra'), cityExtraHtml(id, lvl));
}
// ---- die runden Knöpfe am angetippten Gebäude ----
function cityRingAuf(id) {
    const c = loadCity(), bid = cityBauId(id), lvl = bid === 'keep' ? c.levels.keep || 1 : c.levels[bid] || 0, n = id === '_keep' ? null : cityNutz(id, lvl), bau = cityBuildOf(c, bid);
    const max = bid === 'keep' ? lvl >= (AUF ? AUF.BURG_MAX : 25) : lvl >= cityMaxLevel(bid);
    const k = [];
    k.push(['bau', bau ? 'gem' : 'upgrade', bau ? 'Beschleunigen' : max ? 'Info' : lvl ? 'Aufwerten' : 'Bauen']);
    if (n) k.push(['nutz', n[1], n[0]]);
    cityRingId = id; cityOpenId = null; document.getElementById('citySheet').hidden = true;
    const el = document.getElementById('cityRing');
    el.innerHTML = k.map(([p, ic, t], i) => { const o = i - (k.length - 1) / 2;                 // im Bogen unter dem Gebäude
        return '<button type="button" class="cr-btn" data-cring="' + p + '" style="--x:' + Math.round(o * 92) + 'px;--y:' + Math.round(62 - o * o * 14) + 'px;--d:' + i * 40 + 'ms">' + icon(ic) + '<small>' + t + '</small></button>'; }).join('');
    el.hidden = false; el.style.visibility = 'hidden';                         // (cityFrame setzt die Stelle)
}
function cityRingZu() { cityRingId = null; const el = document.getElementById('cityRing'); if (el && !el.hidden) el.hidden = true; }
document.getElementById('cityRing').addEventListener('click', e => {
    const b = e.target.closest('[data-cring]'); if (!b || !cityRingId) return;
    cityPage = b.dataset.cring; cityOpenId = cityRingId; cityRingZu(); renderCitySheet(); document.getElementById('citySheet').scrollTop = 0;
});
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
        || (typeof bund !== 'undefined' && bund && Array.isArray(bund.r) && bund.r.some(r => !r.startet && mine(r.by) && heroIn(r.held, r.held2, id)));   // führt eine Rally, die noch sammelt
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
function hhGrid() {
    const H = loadHeroes(), list = HEROES.slice().sort((a, b) => (H[b.id].own - H[a.id].own) || b.r - a.r || H[b.id].q - H[a.id].q);
    return '<div class="hh-head"><div class="emblem emblem--gold">' + icon('profile') + '</div><div class="phead-text"><div class="overline">Heldenhalle</div><h2>Helden</h2></div><button class="btn-x" type="button" data-hh-close aria-label="Schließen">' + icon('close') + '</button></div>' +
        '<div class="hh-count">' + HEROES.filter(h => H[h.id].own).length + ' / ' + HEROES.length + ' freigeschaltet · Splitter gibt es von Bossen, für Aufgaben und als Heldenkisten im Shop</div>' +
        '<div class="hh-cards">' + list.map(h => { const s = H[h.id], need = s.own ? heroStepCost(h, s.q) : HERO_UNLOCK[h.r], rd = RARITY_DEFS[h.r];
            return '<button type="button" class="hh-card' + (s.own ? '' : ' is-locked') + '" data-hh="' + h.id + '" style="--rc:' + rd.color + ';--c:' + h.color + '">' +
                '<span class="hh-art">' + heroImg(h.id) + '</span>' + (heroCanDo('player', h.id) ? '<span class="hh-dot"></span>' : '') + (s.own ? '' : '<span class="hh-lk">Gesperrt</span>') +
                '<span class="hh-foot"><b>' + h.name + '</b><small>' + h.role + '</small>' + (s.own ? hhStars(s.q) : '<span class="hh-frag"><i style="width:' + Math.min(100, Math.round(s.sh / need * 100)) + '%"></i></span><small>' + s.sh + ' / ' + need + '</small>') + '</span></button>'; }).join('') + '</div>' + hhPairs();
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
            (maxed ? '<div class="hh-qinfo"><span>5 Sterne – ganz oben</span><b>' + s.sh + ' Splitter übrig</b></div>' : '<div class="hh-qinfo"><span>Nächstes Viertel · Stern ' + (full + 1) + '</span><b>' + s.sh + ' / ' + need + '</b></div><div class="hh-bar"><i style="width:' + Math.min(100, Math.round(s.sh / need * 100)) + '%"></i></div>')
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
                    (s.own ? '<p class="hh-hint">Jeder halbe Stern gibt 1 Punkt – bei 5 Sternen 10. Das reicht für 2 Fähigkeiten auf Stufe 5. Bisher ' + heroPoints(s) + ' von 10.</p><button type="button" class="hh-reset" data-hh-reset' + (spent ? '' : ' disabled') + '>Fähigkeiten zurücksetzen · ' + HERO_RESET_GEMS + ' Gems</button>' : '') + '</div>' +
                '<div class="hh-blk"><h3>Werte · wenn ' + h.name + ' mitkämpft</h3><div class="hh-vals"><div><span>Angriff</span><b>+' + st.atk + ' %</b></div><div><span>Verteidigung</span><b>+' + st.def + ' %</b></div><div><span>Tempo</span><b>+' + st.spd + ' %</b></div><div><span>Gefolge</span><b>+' + fmtCompact(st.gef) + '</b></div></div>' +
                    '<p class="hh-hint">Verteidigung: weniger eigene Verluste. Gefolge: so viele Truppen kämpfen zusätzlich mit (höchstens so viele, wie der Held anführt) – wächst mit Sternen, deiner Stufe und der Heldenhalle.</p></div>' +
            '</div></div>' +
        '<div class="hh-actions">' + (maxed ? '<button class="hh-go" type="button" disabled>5 Sterne erreicht</button>'
            : '<button class="hh-go" type="button" data-hh-up' + (s.sh >= need ? '' : ' disabled') + '><span class="hh-i">' + (s.own ? icon('star') : '+') + '</span>' + (s.own ? 'Aufwerten · ¼ Stern' + (s.q % 2 ? ' + 1 Fähigkeitspunkt' : '') : 'Freischalten') + '<small>' + s.sh + ' / ' + need + ' Splitter</small></button>') + '</div>';
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
    if (e.target.closest('[data-hh-back]')) { hhCur = null; renderHeroHall(); el.scrollTop = 0; return; }
    const c = e.target.closest('[data-hh]'); if (c) { hhCur = c.dataset.hh; renderHeroHall(); el.scrollTop = 0; return; }
    if (!hhCur) return; const h = heroById(hhCur), s = heroSt('player', hhCur);
    const sk = e.target.closest('[data-hh-sk]:not([disabled])');
    if (sk) { if (heroDoSkill('player', hhCur, +sk.dataset.hhSk)) { sfx('upgrade'); flashHint(h.sk[+sk.dataset.hhSk][0] + ' ist jetzt auf Stufe ' + s.sk[+sk.dataset.hhSk] + '.', 2000); } return renderHeroHall(); }
    if (e.target.closest('[data-hh-reset]:not([disabled])')) {
        if (gems < HERO_RESET_GEMS) { flashHint('Zu wenig Gems – Zurücksetzen kostet ' + HERO_RESET_GEMS + '.', 2500); return; }
        gems -= HERO_RESET_GEMS; s.sk = [0, 0, 0, 0]; saveHeroes(); updateHud(); saveGame(); flashHint('Fähigkeiten von ' + h.name + ' zurückgesetzt – ' + heroPoints(s) + ' Punkte frei.', 2500); return renderHeroHall(); }
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
// ---- building effects ----
function academyLevel() { return loadCity().levels.academy || 0; }
function forgeLevel() { return loadCity().levels.forge || 0; }
function hospitalLevel() { return loadCity().levels.hospital || 0; }
function hospitalPct() { return Math.min(60, hospitalLevel() * 5) + (AUF ? AUF.lazarettPlus('player') : 0); }   // (+ Forschung Krankenhaus)
function hospitalCapacity() { const l = hospitalLevel(); return l ? Math.round(1e6 * Math.pow(1.6, l - 1)) : 0; }
const HEAL_COIN_PER_TROOP = 0.1;
function hospitalTake(fallen, pct) {              // Krankenhaus: part of your fallen (attack won or lost, or defending) are only wounded → how many
    if (!hospitalLevel() || fallen <= 0) return 0;
    const c = loadCity(), room = Math.max(0, hospitalCapacity() - c.wounded), w = Math.min(room, Math.floor(fallen * (pct ?? hospitalPct()) / 100));
    if (w > 0) { c.wounded += w; saveCity(); }
    return w;
}
function starGemCost(stars) { return 20 * (stars + 1); }
function cityEffectText(id, lvl) {
    if (AUF && ['academy', 'embassy', 'market', 'lumber', 'quarry', 'mine'].includes(id)) return AUF.effektText(id, lvl);   // Paket D (aufbau.js), Rohstoff-Gebäude
    if (id === 'wall') return lvl ? 'Jetzt: +' + (lvl * 2) + ' % Verteidigung auf allen Basen.' + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: +' + ((lvl + 1) * 2) + ' %.' : '') : 'Baue die Mauer für mehr Verteidigung auf allen Basen.';
    if (id === 'academy') return 'Jetzt: Truppen laufen +' + (lvl * 2) + ' % schneller.' + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: +' + ((lvl + 1) * 2) + ' %.' : '');
    if (id === 'forge') return lvl ? 'Bis zu ' + Math.min(STAR_MAX, lvl) + (Math.min(STAR_MAX, lvl) === 1 ? ' Stern' : ' Sterne') + ' pro Ausrüstungsteil.' + (lvl < STAR_MAX ? ' Nächste Stufe: ' + (lvl + 1) + ' Sterne.' : '') : 'Baue die Schmiede, um Sterne zu setzen.';
    if (id === 'heroes') { const n = HEROES.filter(h => heroOwned('player', h.id)).length; return (lvl ? 'Jetzt: +' + lvl * HERO_HALL_GEF + ' % Gefolge für alle Helden.' : 'Noch kein Bonus aufs Gefolge.') + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: +' + (lvl + 1) * HERO_HALL_GEF + ' %.' : '') + ' ' + n + ' von ' + HEROES.length + ' Helden freigeschaltet.'; }
    if (id === 'hospital') return lvl ? hospitalPct() + ' % der Gefallenen kommen ins Krankenhaus · Platz für ' + fmtCompact(hospitalCapacity()) + (lvl < cityMaxLevel('hospital') ? ' · Nächste Stufe: ' + Math.min(60, (lvl + 1) * 5) + ' %, Platz für ' + fmtCompact(Math.round(1e6 * Math.pow(1.6, lvl))) : '') : 'Baue das Krankenhaus, um Verwundete zu retten.';
    return '';
}
function cityExtraHtml(id, lvl) {
    if (AUF && ['academy', 'market'].includes(id)) return AUF.extraHtml(id, lvl);   // Forschung, Markt (aufbau.js)
    if (id === 'heroes') { const up = HEROES.filter(h => heroCanDo('player', h.id)).length;   // the way into the hero screen
        return '<button type="button" class="btn btn--primary btn--grow hh-open" data-hero-open>' + icon('profile') + '<span>Helden öffnen</span>' + (up ? '<em class="hh-badge">' + up + '</em>' : '') + '</button>'; }
    if (id === 'embassy' && lvl && typeof verstHtml === 'function') return verstHtml();   // Botschaft: Verstärkung (buendnis.js)
    if (id === 'forge' && lvl) {                   // pick a slot, then any piece you own in it - equipped or in the chest
        const slots = Object.keys(EQUIPMENT_DEFS), cap = Math.min(STAR_MAX, lvl);
        const items = Object.values(inventory).filter(it => it.slot === forgeSlot)
            .sort((a, b) => (equippedItems[b.slot] === b.id) - (equippedItems[a.slot] === a.id) || b.rarity - a.rarity || (b.stars || 0) - (a.stars || 0));
        return '<div class="seg forge-tabs">' + slots.map(sl => '<button type="button" data-forge-slot="' + sl + '"' + (sl === forgeSlot ? ' class="on"' : '') + '>' + icon(EQUIPMENT_DEFS[sl].icon) + EQUIPMENT_DEFS[sl].name + '</button>').join('') + '</div>' +
            '<div class="forge-list">' + (items.length ? items.map(item => {
                const st = item.stars || 0, rd = RARITY_DEFS[item.rarity], cost = starGemCost(st), on = equippedItems[item.slot] === item.id;
                return '<div class="forge-row">' + icon(EQUIPMENT_DEFS[item.slot].icon) + '<span><b class="rar-text" data-r="' + rd.key + '">' + rd.label + ' · Stufe ' + (item.level || 1) + (on ? ' <em class="forge-on">angelegt</em>' : '') + '</b>' +
                    '<small class="starbar">' + icon('star').repeat(st) + '<i>' + icon('star').repeat(Math.max(0, cap - st)) + '</i></small></span>' +
                    (st >= cap ? '<em>' + (st >= STAR_MAX ? 'max.' : 'Schmiede ausbauen') + '</em>' : '<button type="button" class="btn btn--secondary btn--sm" data-star="' + item.id + '"' + (gems < cost ? ' disabled' : '') + '>+1 Stern · ' + cost + ' Gems</button>') + '</div>';
            }).join('') : '<div class="forge-row is-empty">' + icon(EQUIPMENT_DEFS[forgeSlot].icon) + '<span>Keine ' + EQUIPMENT_DEFS[forgeSlot].name + ' im Besitz – Kisten gibt es im Shop.</span></div>') + '</div>';
    }
    if (id === 'hospital' && lvl) {
        const w = loadCity().wounded, cost = Math.ceil(w * HEAL_COIN_PER_TROOP);
        return '<div class="forge-list"><div class="forge-row">' + icon('plus') + '<span><b>Verwundete</b><small>' + fmtNum(w) + ' / ' + fmtCompact(hospitalCapacity()) + '</small></span>' +
            (w > 0 ? '<button type="button" class="btn btn--primary btn--sm" data-heal' + (coins < cost ? ' disabled' : '') + '>Heilen · ' + fmtCompact(cost) + ' Münzen</button>' : '<em>leer</em>') + '</div></div>';
    }
    return '';
}
var forgeSlot = 'weapon';
document.getElementById('citySheet').addEventListener('click', e => {
    const fs = e.target.closest('[data-forge-slot]'); if (fs) { forgeSlot = fs.dataset.forgeSlot; renderCitySheet(); return; }
    if (e.target.closest('[data-hero-open]')) { openHeroHall(); return; }
    const st = e.target.closest('[data-star]'), hl = e.target.closest('[data-heal]');
    if (st) { const item = inventory[st.dataset.star]; if (!item) return;
        const s0 = item.stars || 0, cost = starGemCost(s0);
        if (s0 >= Math.min(STAR_MAX, forgeLevel()) || gems < cost) return;
        gems -= cost; item.stars = s0 + 1; saveGame(); saveProgression(); updateHud();
        flashHint(EQUIPMENT_DEFS[item.slot].name + ' hat jetzt ' + item.stars + (item.stars === 1 ? ' Stern' : ' Sterne') + ' (+' + item.stars * STAR_PCT + ' % Wirkung).', 2500); renderCitySheet(); }
    else if (hl) { const c = loadCity(), w = c.wounded, cost = Math.ceil(w * HEAL_COIN_PER_TROOP);
        if (!w || coins < cost) return;
        coins -= cost; c.wounded = 0; saveCity(); statBump('healed', w);
        const base = rewardBaseId(); if (base !== null) eigeneTruppenDazu(base, w, 'heil');
        saveGame(); updateHud(); flashHint(fmtNum(w) + ' Truppen geheilt – sie sind in deiner Hauptstadt.', 3000); renderCitySheet(); }
});
document.getElementById('cityBtn').addEventListener('click', openCity);
document.getElementById('cityNavBtn').addEventListener('click', () => { if (!cityView.hidden) { closeAllPopups(); closeCity(); } else openCity(); });   // in der Stadt: zurück zur Karte (wie in Rise of Kingdoms)
// Auch in der Stadt bleiben die obere Leiste (Münzen, Gems, Truppen, Rohstoffe) und die untere Knopf-Leiste – überall gleich (Alexander 4.10.)
function stadtLeiste(an) {
    document.body.classList.toggle('in-stadt', an);
    const b = document.getElementById('cityNavBtn'), l = b.querySelector('.nav-l'), u = b.querySelector('use');
    if (l) l.textContent = an ? 'Karte' : 'Stadt'; if (u) u.setAttribute('href', an ? '#i-flag' : '#i-castle'); b.classList.toggle('active', an);
}
// Hauptstadt verlegen (teleport): pick one of your own bases, the capital status and its garrison move there.
var teleportMode = false, teleportBis = 0;   // (bleibt nur 20 s scharf – danach kostet ein Tipp auf eine Basis keine Gems mehr aus Versehen)
const TELEPORT_GEMS = 50;
document.getElementById('teleportBtn').addEventListener('click', () => {
    if (gems < TELEPORT_GEMS) { flashHint('Zum Verlegen brauchst du ' + TELEPORT_GEMS + ' Gems.', 3000); return; }
    if (![...ownedIslands].some(id => id !== playerIslandId && islandById[id] && islandById[id].type === 'tower')) { flashHint('Du brauchst noch einen zweiten Turm, um die Hauptstadt zu verlegen – Tempel und Tore zählen nicht.', 3500); return; }
    closeIslandPopup(); teleportMode = true; teleportBis = Date.now() + 20000; requestRender();
    flashHint('Tippe einen deiner Türme an – die Hauptstadt zieht dorthin (' + TELEPORT_GEMS + ' Gems). Woanders tippen bricht ab.', 5000);
});
function teleportCapital(toId) {
    const from = playerIslandId, to = islandById[toId];
    if (!to || !ownedIslands.has(toId) || toId === from || to.type !== 'tower' || gems < TELEPORT_GEMS) return false;   // a tower - never a gate, a temple or the throne
    if (window.WELT && pendingAttacks.some(a => a.targetId === toId)) { flashHint('Dorthin geht es gerade nicht: ein Angriff läuft auf diese Basis.', 3000); return null; }   // (der Weltrechner lehnt es genauso ab – sonst wären die Gems weg)
    gems -= TELEPORT_GEMS;
    islandTroops[toId] = (islandTroops[toId] || 0) + (islandTroops[from] || 0); islandTroops[from] = 0;   // the garrison moves along
    playerIslandId = toId; store.set('openWaterPlayerIslandId', playerIslandId); statBump('teleports');
    alsBefehl('hauptstadt', { insel: toId });
    revealAround(to.x, to.y, REVEAL_BASE, true);
    flushBannerSprites();
    saveGame(); saveProgression(); updateHud();
    spawnBattleFx(toId, true, 'Hauptstadt', 'hierher verlegt');
    flashHint('Die Hauptstadt ist umgezogen – deine Truppen sind mitgekommen.', 3500);
    return true;
}
document.getElementById('cityCloseBtn').addEventListener('click', closeCity);
document.getElementById('cityInfoBtn').addEventListener('click', e => { const s = document.getElementById('citySheet'); s.classList.toggle('zeig-info'); e.currentTarget.classList.toggle('on', s.classList.contains('zeig-info')); });   // Beschreibung nur auf Tipp (weniger Text)
document.getElementById('citySheetClose').addEventListener('click', () => { cityOpenId = null; document.getElementById('citySheet').hidden = true; });
document.getElementById('cityUpgradeBtn').addEventListener('click', () => {
    if (cityOpenId === '_keep' && AUF) { cityStartBuild('keep'); return; }        // die Burg-Stufe (Bauzeit, Münzen + Rohstoffe) ist die EINE Stufe der Hauptstadt
    if (cityOpenId) cityStartBuild(cityOpenId); });
document.getElementById('citySpeedBtn').addEventListener('click', () => {
    const id = cityBauId(cityOpenId), cost = citySpeedCost(id); if (!cost || gems < cost) return;
    gems -= cost; saveGame(); updateHud(); cityFinishBuild(true, id);
});
// ===== THE CITY, ISOMETRIC =====
// Your capital like in the big mobile strategy games: a walled town seen from above at an angle, every building on
// its own lot and growing with its level, the keep in the middle, fields, woods, a river and a windmill outside,
// people walking the streets. Drag to move, pinch or wheel to zoom, tap a building to open it.
// World: 640 × 640 units (a tile is 10), the same isometric projection as the buildings on the map.
const CW = 640, CC = 320;                                                   // world size and centre
const CITY_WALL = { a: 150, b: 490 };                                       // the curtain wall (square, world units)
// Die Stadt im Raster (Alexander 2.10.: „innen Base neu“): 12 Bauplätze rund um den Burgplatz (4 × 4, die Mitte ist die Burg),
// Straßen dazwischen wie ein „#“, vorn das Tor mit der Hauptstraße. Draußen: Wald (Holzfäller), Berge (Steinbruch),
// ein Hügel (Eisenmine), Felder, ein Fluss und die Mühle.
const CITY_LOTS = {                                                          // building lots (ground centre, world units)
    lumber: [206, 206], academy: [282, 206], heroes: [358, 206], quarry: [434, 206],
    forge: [206, 282],
    embassy: [206, 358],
    hospital: [282, 434], market: [358, 434], mine: [434, 434],
    wall: [320, 490]                                                         // Rohstoffe: in der Base (Alexander 4.10.)
};
const CITY_DRAUSSEN = new Set();
const CITY_KEEP_AT = [320, 320];
const cIso = (x, y) => [(x - y) * .866, (x + y) * .5];                    // world → screen units (before zoom)
let cityCam = null, cityPointers = new Map(), cityGesture = null, CITY_GROUND = null, CITY_WALLS = null, CITY_SPRITES = new Map();
let CITY_BG_COL = '#4f8237';
const CITY_BAKE = 2.5;                                                         // ground canvas pixels per screen unit
const CITY_BOUNDS = { x0: -CW * .866 - 40, x1: CW * .866 + 40, y0: -130, y1: CW + 80 };   // screen units covered by the ground

function cityTexture(seed, base, spots, n, size) {   // small tileable noise texture for grass / cobbles / fields
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), r = mulberry32(seed);
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    for (let i = 0; i < n; i++) { g.fillStyle = spots[Math.floor(r() * spots.length)]; const x = r() * size, y = r() * size, w = 1 + r() * 3;
        for (const dx of [0, -size, size]) for (const dy of [0, -size, size]) g.fillRect(x + dx, y + dy, w, w * (.6 + r())); }
    return c;
}
// a world-space polygon on the ground, drawn in screen units
function cityGroundPoly(g, pts, fill, stroke, lw) {
    g.beginPath(); pts.forEach((q, i) => { const [sx, sy] = cIso(q[0], q[1]); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1; g.stroke(); }
}
const cityRect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function cityStrip(g, pts, w, fill) {                                        // a street along world points: flat quads on the ground (iso-correct)
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L * w / 2, ny = (x1 - x0) / L * w / 2;
        const ex = (x1 - x0) / L * w * .25, ey = (y1 - y0) / L * w * .25;    // a little overlap: no seams at the bends
        cityGroundPoly(g, [[x0 + nx - ex, y0 + ny - ey], [x1 + nx + ex, y1 + ny + ey], [x1 - nx + ex, y1 - ny + ey], [x0 - nx - ex, y0 - ny - ey]], fill); }
}
// a small painter: iso kit on a scaled context, anchored at the ground point (ax, ay) of the canvas
const CITY_INK = 'rgba(52,38,24,.42)';                                      // softer outlines than on the map: the town is seen up close
function cityPainter(g, scale, ax, ay) { g.setTransform(scale, 0, 0, scale, ax, ay); g.lineJoin = 'round'; return isoKit(g, 0, CITY_INK); }
function cityZiegel(K, a0, a1, b0, b1, n, col) {                            // Ziegel-Reihen: n Linien zwischen Traufe (a0→a1) und First (b0→b1)
    const g = K.g; if (!g) return; g.save(); g.strokeStyle = col; g.lineWidth = .45;
    for (let i = 1; i < n; i++) { const t = i / n; g.beginPath(); g.moveTo(a0[0] + (b0[0] - a0[0]) * t, a0[1] + (b0[1] - a0[1]) * t); g.lineTo(a1[0] + (b1[0] - a1[0]) * t, a1[1] + (b1[1] - a1[1]) * t); g.stroke(); }
    g.restore();
}
function cityKante(K, p, q, col, w) { const g = K.g; if (!g) return; g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); g.restore(); }
function cityGable(K, x0, x1, y0, y1, z, h, col) {                           // pitched roof, ridge along x
    const yc = (y0 + y1) / 2, n = Math.max(3, Math.round(h / 1.8));
    K.poly([K.P(x0, y1, z), K.P(x1, y1, z), K.P(x1, yc, z + h), K.P(x0, yc, z + h)], shade(col, .95));
    K.poly([K.P(x1, y0, z), K.P(x1, y1, z), K.P(x1, yc, z + h)], shade(col, .7));
    K.poly([K.P(x0, y0, z), K.P(x1, y0, z), K.P(x1, yc, z + h), K.P(x0, yc, z + h)], shade(col, 1.15), .6);   // back slope peeks over the ridge line
    K.poly([K.P(x0, y1, z), K.P(x1, y1, z), K.P(x1, yc, z + h), K.P(x0, yc, z + h)], shade(col, .95));
    cityZiegel(K, K.P(x0, y1, z), K.P(x1, y1, z), K.P(x0, yc, z + h), K.P(x1, yc, z + h), n, shade(col, .74));
    cityKante(K, K.P(x0, yc, z + h), K.P(x1, yc, z + h), shade(col, 1.35), .9); cityKante(K, K.P(x0, y1, z), K.P(x1, y1, z), shade(col, .5), 1);
}
function cityGableY(K, x0, x1, y0, y1, z, h, col) {                          // pitched roof, ridge along y
    const xc = (x0 + x1) / 2, n = Math.max(3, Math.round(h / 1.8));
    K.poly([K.P(x0, y0, z), K.P(xc, y0, z + h), K.P(xc, y1, z + h), K.P(x0, y1, z)], shade(col, 1.12), .6);
    K.poly([K.P(x1, y0, z), K.P(x1, y1, z), K.P(xc, y1, z + h), K.P(xc, y0, z + h)], shade(col, .72));
    K.poly([K.P(x0, y1, z), K.P(x1, y1, z), K.P(xc, y1, z + h)], shade(col, .92));
    cityZiegel(K, K.P(x0, y0, z), K.P(x0, y1, z), K.P(xc, y0, z + h), K.P(xc, y1, z + h), n, shade(col, .85));
    cityZiegel(K, K.P(x1, y0, z), K.P(x1, y1, z), K.P(xc, y0, z + h), K.P(xc, y1, z + h), n, shade(col, .55));
    cityKante(K, K.P(xc, y0, z + h), K.P(xc, y1, z + h), shade(col, 1.35), .9);
}
function cityWindows(K, x0, x1, y, z, n, lit) {                              // a row of windows on the front (y) face
    for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + .5) / n, [a, b] = K.P(x, y, z);
        K.poly([[a - 1, b], [a + 1, b - .6], [a + 1, b - 3.6], [a - 1, b - 3]], lit ? '#f2c46a' : '#2b2520', .4); }
}
function cityWindowsR(K, x, y0, y1, z, n) {                                   // on the right (x) face
    for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * (i + .5) / n, [a, b] = K.P(x, y, z);
        K.poly([[a - 1, b - .6], [a + 1, b], [a + 1, b - 3], [a - 1, b - 3.6]], '#2b2520', .4); }
}
function cityDoor(K, x, y, h) { const [a, b] = K.P(x, y, 0); K.poly([[a - 2, b + 1], [a + 2, b + 1 - 1.2], [a + 2, b - h], [a, b - h - 1.4], [a - 2, b - h + 1.2]], '#3a2616', .6); }
function cityBanner(K, x, y, z, col) { const [a, b] = K.P(x, y, z); K.poly([[a - 1.6, b], [a + 1.6, b - .9], [a + 1.6, b + 7], [a, b + 9], [a - 1.6, b + 8]], col, .5); }
function cityPlinth(K, r, h, col) { K.box(-r, r, -r, r, 0, h, col || '#a89f8c', .8); }

// tiers: 0 = empty lot, 1 = lvl 1-4, 2 = 5-14, 3 = 15+
const cityTierOf = lvl => !lvl ? 0 : lvl >= 15 ? 3 : lvl >= 5 ? 2 : 1;
const CITY_PAINT = {
    plot(K) {                                                                // fenced building site
        K.poly([K.P(-20, -20, 0), K.P(20, -20, 0), K.P(20, 20, 0), K.P(-20, 20, 0)], '#9c8058', .6);
        for (let i = -20; i <= 20; i += 5) { K.box(i - .6, i + .6, 19.4, 20.6, 0, 3.5, '#6b4a2c', .4); K.box(19.4, 20.6, i - .6, i + .6, 0, 3.5, '#6b4a2c', .4); }
        K.box(-20, 20, 19.7, 20.3, 2.4, 3, '#7d5834', .3); K.box(19.7, 20.3, -20, 20, 2.4, 3, '#7d5834', .3);
        for (let i = 0; i < 3; i++) K.box(-12, 2, -8 + i * 3.2, -5.6 + i * 3.2, 0, 2.4, i % 2 ? '#a0783f' : '#8a6634', .4);   // timber
        for (const [x, y] of [[8, -8], [11, -3], [6, -2]]) K.box(x, x + 4, y, y + 4, 0, 3, '#9d9585', .4);                   // stones
        K.box(12, 13, 10, 11, 0, 12, '#6b4a2c', .4); K.box(8, 17, 10.4, 10.9, 9, 14, '#e6d8b4', .4);                         // sign
    },
    keep(K, t) {                                                             // deine Burg: Ringmauer mit Ecktürmen, Halle, Bergfried, Torhaus – wächst mit der Burg-Stufe (0–4)
        const st = STONE, roof = '#3a78c8', gold = '#e2b043', w = 28, z0 = 4, wh = z0 + 12 + t * 2, h = z0 + 28 + t * 5;
        K.box(-36, 36, -36, 36, 0, 2.2, '#9d9585', .7); K.box(-33, 33, -33, 33, 2.2, z0, '#b8b0a0', .6);          // Sockel in zwei Stufen
        const turm = (x, y, big) => { const r = big ? 7 : 6, th = wh + 8 + (big ? 3 : 0); K.cyl(x, y, r, z0, th, st, .8); K.cyl(x, y, r + .9, th, th + 2, shade(st, 1.06), .6);
            K.cone(x, y, r + 1.6, th + 2, 11 + t * 1.5, t >= 3 && big ? gold : roof); const [a, b] = K.P(x, y, th + 15 + t * 1.5); K.flag(a, b, BAND.player, true); };
        K.box(-w, w, -w, -w + 3, z0, wh, shade(st, .92), .7); K.box(-w, -w + 3, -w, w, z0, wh, shade(st, .92), .7);   // hinten: Mauern + Turm
        turm(-w, -w, false);
        K.box(-24, -13, -10, 16, z0, z0 + 14, '#ebe4d4', .8); cityGableY(K, -25, -12, -11, 17, z0 + 14, 9, roof); cityWindows(K, -22, -15, 16, z0 + 10, 2, true);   // die Halle links
        if (t >= 1) { K.box(6, 21, -24, -13, z0, z0 + 12, '#ebe4d4', .7); cityGable(K, 5, 22, -25, -12, z0 + 12, 7, roof); cityWindows(K, 8, 19, -13, z0 + 9, 3, true); }   // die Kapelle rechts
        const dw = 9 + Math.min(t, 2);                                                                                  // der Bergfried
        K.box(-dw, dw, -dw + 2, dw + 2, z0, h, st, .9); K.merlons(-dw, dw, -dw + 2, dw + 2, h, st, 4);
        cityWindows(K, -dw + 3, dw - 3, dw + 2, h - 7, 3, true); cityWindows(K, -dw + 3, dw - 3, dw + 2, h - 17, 3, false); cityWindowsR(K, dw, -dw + 5, dw - 1, h - 7, 3);
        cityBanner(K, -dw + 3.5, dw + 2.2, h - 21, '#2b5d9b'); cityBanner(K, dw - 3.5, dw + 2.2, h - 21, '#2b5d9b');
        if (t >= 2) { const h2 = h + 9 + t * 2; K.box(-6, 6, -4, 8, h, h2, st, .8); K.merlons(-6, 6, -4, 8, h2, st, 3); K.pyramid(0, 2, 7.6, h2 + 1.8, 13, t >= 4 ? gold : roof); }
        else K.pyramid(0, 2, dw + 1.4, h + 1.8, 13, roof);
        if (t >= 3) { K.cyl(dw, -dw + 2, 3.4, h - 6, h + 8, st, .6); K.cone(dw, -dw + 2, 4.4, h + 8, 8, gold); }
        turm(w, -w, false); turm(-w, w, false);
        K.box(w - 3, w, -w, w, z0, wh, st, .7); K.box(-w, w, w - 3, w, z0, wh, st, .7); K.merlons(-w, w, -w, w, wh, st, 8);   // vorn: Mauern, Torhaus, großer Eckturm
        K.box(-8, 8, w - 6, w + 3, z0, wh + 7, shade(st, 1.03), .8); K.merlons(-8, 8, w - 6, w + 3, wh + 7, st, 3);
        const [gx, gy] = K.P(0, w + 3, z0); K.poly([[gx - 5, gy + 2.9], [gx + 5, gy - 2.9], [gx + 5, gy - 12], [gx, gy - 16], [gx - 5, gy - 9]], '#241810', .7);
        for (const dx of [-2.5, 0, 2.5]) { const [p1, p2] = K.P(dx, w + 3.05, z0 + .5), [q1, q2] = K.P(dx, w + 3.05, z0 + 10.5 - Math.abs(dx)); cityKante(K, [p1, p2], [q1, q2], 'rgba(120,110,95,.75)', .6); }   // Fallgatter
        cityBanner(K, -5.5, w + 3.2, wh + 4, '#2b5d9b'); cityBanner(K, 5.5, w + 3.2, wh + 4, '#2b5d9b');
        turm(w, w, true);
    },
    academy(K, t) {
        cityPlinth(K, 21, 2);
        K.box(-16, 14, -11, 11, 2, 15, '#efe7d4', .8); cityGable(K, -17, 15, -12, 12, 15, 9, '#2f4f86'); cityWindows(K, -14, 12, 11, 12, 5, false);
        for (const x of [-12, -6, 0, 6, 12]) K.cyl(x, 14, 1.3, 2, 14, '#f3ecdc', .5, true);
        K.box(-16, 14, 13, 15, 14, 15.5, '#f3ecdc', .5);
        if (t >= 2) { K.cyl(10, -4, 6.5, 15, 25, '#e6dcc6', .7); K.dome(10, -4, 7, 25, 9, '#6f9bd8'); }
        if (t >= 3) { K.box(-20, -12, -18, -8, 2, 22, '#e6dcc6', .7); K.pyramid(-16, -13, 5, 22, 8, '#2f4f86'); cityBanner(K, -14, 11.2, 14, '#2f4f86'); cityBanner(K, 12, 11.2, 14, '#2f4f86'); }
    },
    forge(K, t) {
        cityPlinth(K, 21, 2, '#8e8676');
        K.box(-15, 13, -10, 10, 2, 13, '#d9ccb2', .8); cityGable(K, -16, 14, -11, 11, 13, 8, '#3c3c44'); cityWindows(K, -12, 10, 10, 10, 3, true);
        K.box(-12, -6, -8, -2, 2, 30, '#6b6456', .7);                                                                   // chimney
        const [fx, fy] = K.P(4, 10, 2); K.poly([[fx - 3, fy + 1.7], [fx + 3, fy - 1.7], [fx + 3, fy - 7], [fx - 3, fy - 3.6]], '#ff8c2a', .6);   // furnace glow
        K.box(14, 18, 12, 15, 2, 5, '#3a3a40', .5); K.box(15, 17, 12.8, 14.2, 5, 6, '#2c2c30', .4);                      // anvil
        if (t >= 2) { K.box(2, 18, -18, -8, 2, 10, '#cfc2a8', .7); cityGable(K, 1, 19, -19, -7, 10, 6, '#4a4a52'); }
        if (t >= 3) { K.box(10, 15, -2, 3, 2, 26, '#6b6456', .7); cityBanner(K, -10, 10.2, 12, '#4a4a52'); }
    },
    hospital(K, t) {
        cityPlinth(K, 21, 2);
        K.box(-15, 13, -10, 10, 2, 13, '#fbf7ee', .8); cityGable(K, -16, 14, -11, 11, 13, 8, '#b33a2e'); cityWindows(K, -12, 10, 10, 9, 4, false);
        const [cx, cy] = K.P(-1, 10, 11); g2Cross(K.poly, cx, cy);
        K.pyramid(14, 14, 5, 2, 8, '#e8e2d2');
        if (t >= 2) { K.pyramid(-15, 15, 5, 2, 8, '#e8e2d2'); K.box(-18, -8, -19, -12, 2, 9, '#f3eee2', .7); cityGable(K, -19, -7, -20, -11, 9, 5, '#b33a2e'); }
        if (t >= 3) { for (const [x, y] of [[4, 17], [9, 17]]) { const [a, b] = K.P(x, y, 2); K.poly([[a - 2, b], [a, b - 1], [a + 2, b], [a, b + 1]], '#6aa84f', .3); } cityBanner(K, 12, 10.2, 12, '#c0392b'); }
    },
    heroes(K, t) {
        cityPlinth(K, 21, 2);
        K.box(-17, 15, -12, 8, 2, 16, '#efe6d2', .8); cityGable(K, -18, 16, -13, 9, 16, 12, '#7a2e2a'); cityWindows(K, -14, 12, 8, 13, 5, true);
        if (t >= 2) { K.box(-6, 4, -6, 2, 16, 30, '#e6dcc6', .7); K.pyramid(-1, -2, 6, 30, 10, '#7a2e2a'); }
        const on = Math.ceil(HEROES.filter(h => heroOwned('player', h.id)).length / HEROES.length * 3);   // a lit statue for every third of the heroes
        [0, 1, 2].forEach(i => { const x = -10 + i * 10; K.box(x - 2, x + 2, 13, 17, 2, 5, '#8a7f68', .5); K.cyl(x, 15, 1.4, 5, 10, i < on ? '#d9b454' : '#9a927f', .4); });
        cityBanner(K, -15, 8.2, 14, '#7a2e2a'); cityBanner(K, 13, 8.2, 14, '#7a2e2a'); if (t >= 3) cityBanner(K, -1, 2.2, 26, '#e4c886');
    },
    gatehouse(K, t) {                                                       // the gate in the front wall = the Mauer building
        if (!t) { K.box(-14, -8, -4, 4, 0, 14, '#8a6440', .6); K.box(8, 14, -4, 4, 0, 14, '#8a6440', .6); K.box(-14, 14, -4, 4, 14, 17, '#6b4a2c', .6);
            const [a, b] = K.P(0, 4, 0); K.poly([[a - 7, b + 4], [a + 7, b - 4], [a + 7, b - 16], [a - 7, b - 8]], '#5a3d24', .6); return; }
        const s = STONE, h = [0, 20, 25, 28][t], roof = t >= 3 ? '#d9a93f' : t >= 2 ? '#2f5e9a' : '#8a3a2a';
        K.box(-12, 12, -6, 6, 0, h, s, .8); K.merlons(-12, 12, -6, 6, h, s, 4);
        const [a, b] = K.P(0, 6, 0); K.poly([[a - 6, b + 3.5], [a + 6, b - 3.5], [a + 6, b - 13], [a, b - 17], [a - 6, b - 9.5]], '#1b140e', .7);      // archway
        K.poly([[a - 5, b - 9], [a + 5, b - 14.5], [a + 5, b - 12], [a - 5, b - 6.5]], 'rgba(60,54,44,.8)', .4);                                   // portcullis bar
        for (const x of [-15, 15]) { K.cyl(x, 0, 7, 0, h + 6, s, .8); K.cone(x, 0, 8.5, h + 6, 10 + t * 2, roof); const [fa, fb] = K.P(x, 0, h + 16 + t * 2); K.flag(fa, fb, BAND.player, true); }
        if (t >= 2) { cityBanner(K, -6, 6.2, h - 3, '#2b5d9b'); cityBanner(K, 6, 6.2, h - 3, '#2b5d9b'); }
    },
    lumber(K, t) {                                                          // Holzfäller: Hütte, Stämme, Sägebock, Bäume drumherum
        K.box(-16, 0, -14, -2, 0, 9, '#9a7448', .7); cityGable(K, -17, 1, -15, -1, 9, 6, '#3f6b33'); cityDoor(K, -8, -2, 6); cityWindows(K, -14, -10, -2, 7, 1, false);
        for (let i = 0; i < 2 + t; i++) for (let j = 0; j < 3 - (i % 2); j++) K.box(2 + j * 4.2 + (i % 2) * 2.1, 5.6 + j * 4.2 + (i % 2) * 2.1, 2, 16, i * 3, i * 3 + 3, j % 2 ? '#a0783f' : '#8a6634', .4);   // Stammstapel
        K.box(-12, -2, 6, 8, 0, 4, '#6b4a2c', .4); K.box(-11, -10, 6, 8, 4, 6, '#6b4a2c', .3); K.box(-4, -3, 6, 8, 4, 6, '#6b4a2c', .3);   // Sägebock
        for (const [x, y, h] of [[17, -14, 18], [12, -18, 14], [-19, 12, 16], [19, 15, 13]].slice(0, 2 + t)) { K.cyl(x, y, 1.1, 0, h * .45, '#5a3d24', .4); K.cone(x, y, 5, h * .35, h * .8, '#2f6a2a'); }
    },
    quarry(K, t) {                                                          // Steinbruch: grauer Fels, Quader, ein Holzkran
        K.pyramid(-6, -6, 13, 0, 14 + t * 4, '#8f8a80'); K.pyramid(4, -12, 8, 0, 9 + t * 2, '#a39e93');
        for (const [x, y] of [[8, 6], [13, 9], [10, 13], [3, 12]].slice(0, 2 + t)) K.box(x - 2.4, x + 2.4, y - 2.4, y + 2.4, 0, 4.2, '#bdb6a8', .5);
        K.box(13, 14.2, -4, -2.8, 0, 22, '#6b4a2c', .4); K.box(5, 14.2, -3.9, -2.9, 20, 21.2, '#6b4a2c', .4);   // Kran
        const [a, b] = K.P(6, -3.4, 20); K.poly([[a - .3, b], [a + .3, b], [a + .3, b + 10], [a - .3, b + 10]], '#3a2616', .2);
        if (t >= 2) { K.box(-18, -10, 8, 16, 0, 6, '#9a7448', .5); cityGable(K, -19, -9, 7, 17, 6, 4, '#7a6a52'); }
    },
    mine(K, t) {                                                            // Eisenmine: dunkler Berg mit Stollen, Schienen und Lore
        K.pyramid(-4, -6, 16, 0, 20 + t * 4, '#6e6a63'); K.pyramid(8, -14, 9, 0, 12 + t * 2, '#7d786f');
        const [a, b] = K.P(-4, 8, 0); K.poly([[a - 5, b], [a + 5, b - 2.8], [a + 5, b - 11], [a, b - 14], [a - 5, b - 9]], '#1d1a17', .5);   // Stollen
        K.box(-10, 2, 8.5, 9.5, 0, 12, '#6b4a2c', .4);
        K.box(-6, -2, 9, 22, 0, .6, '#5a5550', .2); K.box(-5.6, -2.4, 15, 19, .6, 4.4, '#7a4a2a', .5); K.box(-5.4, -2.6, 15.2, 18.8, 4.4, 5.6, '#3b3b40', .3);   // Schienen, Lore mit Erz
        if (t >= 2) { K.box(10, 18, 6, 14, 0, 7, '#9a7448', .5); cityGable(K, 9, 19, 5, 15, 7, 4, '#4a4a52'); cityWindows(K, 11, 17, 14, 5, 2, true); }
    },
    embassy(K, t) {                                                         // Botschaft: helles Haus mit Säulen und vielen Fahnen (das Bündnis)
        cityPlinth(K, 21, 2, '#b8b0a0');
        K.box(-15, 13, -10, 10, 2, 14, '#f1ead8', .8); cityGable(K, -16, 14, -11, 11, 14, 8, '#2e6b5a'); cityWindows(K, -12, 10, 10, 11, 4, false);
        for (const x of [-10, -4, 2, 8]) K.cyl(x, 13, 1.2, 2, 13, '#f6f0e2', .5, true);
        K.box(-15, 13, 12, 14, 13, 14.5, '#f6f0e2', .5);
        const cols = ['#2e6b5a', '#c0392b', '#d9a93f', '#2f5e9a', '#7a2e8a'];
        for (let i = 0; i < Math.min(5, 2 + t); i++) { const [a, b] = K.P(-16 + i * 7, 17, 2); K.poly([[a - .4, b], [a + .4, b - .3], [a + .4, b - 16], [a - .4, b - 15.7]], '#6b4a2c', .3); K.poly([[a + .4, b - 16], [a + 6, b - 17], [a + 6, b - 12], [a + .4, b - 11]], cols[i], .3); }
        if (t >= 2) { K.cyl(10, -4, 5.5, 14, 22, '#e9e1cc', .7); K.dome(10, -4, 6, 22, 7, '#3f8a73'); }
    },
    market(K, t) {                                                          // Markt: Stände unter bunten Dächern, Säcke, Fässer, ein Kontor
        K.poly([K.P(-21, -21, 0), K.P(21, -21, 0), K.P(21, 21, 0), K.P(-21, 21, 0)], '#c2b08c', .5);
        K.box(-18, -2, -18, -4, 0, 11, '#e2d3b0', .7); cityGable(K, -19, -1, -19, -3, 11, 6, '#b5651d'); cityWindows(K, -15, -5, -4, 8, 2, false);
        const st = [[8, -10, '#c0392b'], [12, 6, '#2f6fa8'], [-6, 10, '#d9a93f'], [-14, 4, '#6aa84f']].slice(0, 2 + Math.min(2, t));
        for (const [x, y, col] of st) { for (const [dx, dy] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) K.box(x + dx - .4, x + dx + .4, y + dy - .4, y + dy + .4, 0, 7, '#6b4a2c', .3);
            K.box(x - 4, x + 4, y - 3, y + 3, 0, 3, '#8a6440', .4); K.box(x - 2, x, y - 1, y + 1, 3, 4.5, '#e8c547', .3); cityGable(K, x - 5, x + 5, y - 4, y + 4, 7, 3, col); }
        for (const [x, y] of [[16, 16], [18, 12], [-16, 16]]) K.cyl(x, y, 1.8, 0, 4, '#8a6440', .4);
        if (t >= 3) { K.box(-2, 4, 14, 19, 0, 4, '#9c7e4c', .4); cityBanner(K, -10, -3.8, 9, '#b5651d'); }
    },
};
function g2Cross(poly, x, y) { poly([[x - 1.2, y - 4], [x + 1.2, y - 4], [x + 1.2, y - 1.2], [x + 4, y - 1.2], [x + 4, y + 1.2], [x + 1.2, y + 1.2], [x + 1.2, y + 4], [x - 1.2, y + 4], [x - 1.2, y + 1.2], [x - 4, y + 1.2], [x - 4, y - 1.2], [x - 1.2, y - 1.2]], '#c0392b', .4); }

// sprite cache: every building at its tier, painted once at a fixed resolution
const CITY_SPR_SCALE = 5;
function citySprite(kind, tier, extraKey) {
    const key = kind + ':' + tier + ':' + (extraKey || '');
    let s = CITY_SPRITES.get(key); if (s) return s;
    const art = kind === 'ghost' ? extraKey : kind, w = 64, up = art === 'keep' ? 90 : 52, down = art === 'keep' ? 42 : 26;   // screen-unit box around the ground anchor
    const c = document.createElement('canvas'); c.width = w * 2 * CITY_SPR_SCALE; c.height = (up + down) * CITY_SPR_SCALE;
    const g = c.getContext('2d'), K = cityPainter(g, CITY_SPR_SCALE, w * CITY_SPR_SCALE, up * CITY_SPR_SCALE);
    if (kind === 'ghost') cityGhost(g, K, extraKey, c, w * CITY_SPR_SCALE, up * CITY_SPR_SCALE); else (CITY_PAINT[kind] || CITY_PAINT.plot)(K, tier);
    s = { c, w, up, down }; CITY_SPRITES.set(key, s); return s;
}

// ein leerer Bauplatz: Grundmauern, ein paar Balken und Steine, darüber das Gebäude ganz blass – wie ein Plan, was hier entsteht
function cityGhost(g, K, id, c, ax, ay) {
    if (!CITY_DRAUSSEN.has(id)) for (const [x0, x1, y0, y1] of [[-19, 19, -19, -16.5], [-19, -16.5, -16.5, 19], [16.5, 19, -16.5, 19], [-16.5, 16.5, 16.5, 19]]) K.box(x0, x1, y0, y1, 0, 2.2, '#bdb29c', .4);
    const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
    const og = o.getContext('2d'); (CITY_PAINT[id] || CITY_PAINT.plot)(cityPainter(og, CITY_SPR_SCALE, ax, ay), 1);
    og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'source-atop'; og.fillStyle = 'rgba(236,228,210,.6)'; og.fillRect(0, 0, o.width, o.height);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = .5; g.drawImage(o, 0, 0); g.restore();
    g.setTransform(CITY_SPR_SCALE, 0, 0, CITY_SPR_SCALE, ax, ay);
    K.box(9, 18, 13, 15.5, 0, 1.6, '#a0783f', .35); K.box(10, 17, 13.2, 15.3, 1.6, 3.1, '#8a6634', .35);   // Balken
    K.box(-18, -13, 12, 17, 0, 3, '#a59d8c', .35); K.box(-17, -14, 12.6, 15.6, 3, 5, '#b8b0a0', .35);   // Steine
}
// ---- Landschaft je nach Gegend der Hauptstadt (Grün, Sand, Schnee, Sumpf, Vulkan) – die Stadt selbst ist immer gepflegt ----
const CITY_PAL = {
    green:   { land: '#5e9142', spots: ['#6a9d4b', '#54853a', '#74a853', '#4c7a34'], grass: '#6ba64b', gspots: ['#78b156', '#5f9842', '#83ba60', '#679f47'],
               leaf: ['#2c6328', '#3b7a33', '#5a9a42'], pine: ['#1f4a26', '#2b5e31', '#3d7742'], rock: '#8e8a82', peak: '#f2f5f7', bank: '#b9a77a', pines: .4, wald: 1,
               field: ['#e0bf52', '#c9a23c', '#a9bb4c', '#d6c96a'], water: ['#2a6694', '#3f8cc0', '#9fd2ee'], bg: '#5e9142' },
    sand:    { palm: true, mesa: true, land: '#d2b97e', spots: ['#dcc58f', '#c7ad70', '#bfa864', '#b3a85e'], grass: '#86a84f', gspots: ['#92b35a', '#7a9c46', '#9cbb62', '#80a24b'],
               leaf: ['#3f6a26', '#548a32', '#74a344'], pine: ['#3f5a26', '#52702f', '#6b8a3c'], rock: '#c2905e', peak: null, bank: '#e6d39c', pines: .55, wald: .6,
               field: ['#d9b04a', '#c99c3a', '#b9ad5a', '#e0c56a'], water: ['#24708f', '#3a95b4', '#a6dcea'], bg: '#cdb378' },
    snow:    { land: '#e4eaef', spots: ['#eef2f5', '#d6dee5', '#f7f9fb', '#cfd9e1'], grass: '#dfe7ec', gspots: ['#e9eef2', '#d3dce3', '#f3f6f8', '#cbd5dd'],
               leaf: ['#3a5a4a', '#4c6e5d', '#6a8a7a'], pine: ['#284638', '#365a4a', '#4c7262'], rock: '#7e8792', peak: '#ffffff', bank: '#cdd7df', pines: .9, wald: 1, schnee: true,
               field: ['#e9eef1', '#dbe3e8', '#f2f5f7', '#d3dce2'], water: ['#4f7fa3', '#6f9ebf', '#d2e8f4'], bg: '#e4eaef' },
    swamp:   { land: '#577146', spots: ['#62804f', '#4c6640', '#6b8a55', '#465d3a'], grass: '#6c9150', gspots: ['#78a05a', '#628848', '#82aa62', '#6a8f4d'],
               leaf: ['#2c4a28', '#3c6034', '#55803f'], pine: ['#223d26', '#2f5132', '#406a42'], rock: '#727065', peak: null, bank: '#7c7a52', pines: .25, wald: 1.1,
               field: ['#9cab52', '#8a9a46', '#b0b862', '#7f9244'], water: ['#3a5a4c', '#4f7462', '#9fc0ae'], bg: '#577146' },
    volcano: { land: '#625953', spots: ['#6d635c', '#574f4a', '#776b62', '#4e4743'], grass: '#6e8e4a', gspots: ['#799a54', '#638443', '#84a35e', '#6a8a48'],
               leaf: ['#33462a', '#445c34', '#5e7a46'], pine: ['#2a3a26', '#384e32', '#4c6644'], rock: '#4f4743', peak: '#e0662e', bank: '#7a6a5e', pines: .5, wald: .5,
               field: ['#a58f5c', '#93804e', '#b29d66', '#8a7848'], water: ['#2c5a78', '#3f7898', '#8fbcd4'], bg: '#625953' }
};
function cityBio() { const lm = landmasses[(islandById[playerIslandId] || {}).landmassId] || {}; return lm.bio === 'ice' ? 'snow' : CITY_PAL[lm.bio] ? lm.bio : 'green'; }
// Bäume, Büsche, Felsen: in Bildschirm-Einheiten um den Fußpunkt (a, b) gemalt – im Boden-Bild und als Deko-Bild gleich
function cityTreeAt(g, a, b, r, pal, v) {             // ein Laubbaum: Krone aus Kugeln, oben links im Licht
    g.fillStyle = 'rgba(20,30,10,.26)'; g.beginPath(); g.ellipse(a + r * .55, b + r * .08, r * 1.2, r * .46, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5a3d24'; g.fillRect(a - r * .13, b - r * 1.05, r * .26, r * 1.05);
    const L = pal.leaf, f = v ? .9 : 1;
    for (const [dx, dy, rr, ci] of [[0, -1.5, 1, 0], [-.48, -1.72, .74, 1], [.45, -1.78, .7, 0], [.02, -2.22, .66, 1], [-.32, -2.2, .4, 2], [.1, -2.5, .3, 2], [-.6, -1.75, .3, 2]]) {
        g.fillStyle = L[ci]; g.beginPath(); g.arc(a + dx * r, b + dy * r * f, rr * r, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(15,35,12,.3)'; g.lineWidth = Math.max(.35, r * .07); g.beginPath(); g.arc(a, b - 1.5 * r * f, r, Math.PI * .08, Math.PI * .92); g.stroke();
    if (pal.schnee) { g.fillStyle = 'rgba(255,255,255,.85)'; for (const [dx, dy, rr] of [[-.3, -2.55, .42], [.25, -2.45, .3]]) { g.beginPath(); g.ellipse(a + dx * r, b + dy * r, rr * r, rr * r * .45, 0, 0, Math.PI * 2); g.fill(); } }
}
function cityPineAt(g, a, b, h, pal) {                // eine Tanne: drei Kegel übereinander, links hell, rechts dunkel
    g.fillStyle = 'rgba(20,30,10,.24)'; g.beginPath(); g.ellipse(a + h * .2, b + h * .03, h * .3, h * .11, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a3220'; g.fillRect(a - h * .035, b - h * .2, h * .07, h * .2);
    const P = pal.pine;
    for (let i = 0; i < 3; i++) { const y0 = b - h * (.14 + i * .23), w = h * (.3 - i * .075), top = y0 - h * (.44 - i * .06);
        g.fillStyle = P[1]; g.beginPath(); g.moveTo(a - w, y0); g.lineTo(a, top); g.lineTo(a + w, y0); g.quadraticCurveTo(a, y0 + h * .06, a - w, y0); g.fill();
        g.fillStyle = P[0]; g.beginPath(); g.moveTo(a, top); g.lineTo(a + w, y0); g.quadraticCurveTo(a + w * .5, y0 + h * .04, a + w * .05, y0 + h * .05); g.closePath(); g.fill();
        g.fillStyle = P[2]; g.beginPath(); g.moveTo(a, top); g.lineTo(a - w * .6, y0 - h * .015); g.lineTo(a - w * .2, y0 - h * .03); g.closePath(); g.fill();
        if (pal.schnee) { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(a, top); g.lineTo(a - w * .45, top + h * .2); g.lineTo(a + w * .3, top + h * .17); g.closePath(); g.fill(); } }
}
function cityPalmAt(g, a, b, h, pal) {                 // eine Palme: gebogener Stamm, sechs Wedel
    g.fillStyle = 'rgba(20,30,10,.22)'; g.beginPath(); g.ellipse(a + h * .3, b + h * .02, h * .3, h * .1, 0, 0, Math.PI * 2); g.fill();
    const tx = a + h * .16, ty = b - h; g.strokeStyle = '#8a6a44'; g.lineWidth = h * .07; g.lineCap = 'round'; g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo(a + h * .02, b - h * .6, tx, ty); g.stroke();
    g.strokeStyle = '#6b5032'; g.lineWidth = h * .015; for (let i = 1; i < 6; i++) { const t = i / 6, x = a + (tx - a) * t * t, y = b + (ty - b) * t; g.beginPath(); g.moveTo(x - h * .035, y); g.lineTo(x + h * .035, y - h * .01); g.stroke(); }
    for (let i = 0; i < 6; i++) { const an = -Math.PI / 2 + (i - 2.5) * .62, L = h * (.42 + (i % 2) * .08), ex = tx + Math.cos(an) * L, ey = ty + Math.sin(an) * L * .55 + L * .32;
        g.fillStyle = pal.leaf[i % 2 ? 1 : 2]; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(an) * L * .5 - Math.sin(an) * h * .08, ty + Math.sin(an) * L * .5 - h * .12, ex, ey);
        g.quadraticCurveTo(tx + Math.cos(an) * L * .5 + Math.sin(an) * h * .05, ty + Math.sin(an) * L * .5 - h * .02, tx, ty); g.fill(); }
    g.fillStyle = '#6b4a2c'; g.beginPath(); g.arc(tx, ty + h * .02, h * .045, 0, 7); g.fill();
}
function cityBushAt(g, a, b, r, pal) {
    g.fillStyle = 'rgba(20,30,10,.22)'; g.beginPath(); g.ellipse(a + r * .4, b + r * .05, r * 1.2, r * .45, 0, 0, Math.PI * 2); g.fill();
    for (const [dx, dy, rr, ci] of [[0, -.55, .8, 0], [-.55, -.45, .55, 1], [.5, -.5, .55, 0], [-.15, -.95, .5, 1], [-.35, -.95, .25, 2]]) { g.fillStyle = pal.leaf[ci]; g.beginPath(); g.arc(a + dx * r, b + dy * r, rr * r, 0, Math.PI * 2); g.fill(); }
    if (pal.schnee) { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(a - r * .1, b - r * 1.2, r * .5, r * .2, 0, 0, Math.PI * 2); g.fill(); }
}
function cityRockAt(g, a, b, r, col) {                 // ein Felsbrocken: links hell, rechts dunkel
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(a + r * .3, b + r * .1, r * 1.1, r * .4, 0, 0, Math.PI * 2); g.fill();
    const pts = [[-1, 0], [-.85, -.6], [-.3, -1], [.35, -.85], [.95, -.35], [1, 0]];
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(a + x * r, b + y * r) : g.moveTo(a + x * r, b + y * r)); g.closePath(); g.fillStyle = shade(col, .8); g.fill();
    g.beginPath(); g.moveTo(a - r, b); g.lineTo(a - .85 * r, b - .6 * r); g.lineTo(a - .3 * r, b - r); g.lineTo(a + .05 * r, b - .5 * r); g.lineTo(a - .1 * r, b); g.closePath(); g.fillStyle = shade(col, 1.12); g.fill();
    g.strokeStyle = 'rgba(40,34,28,.4)'; g.lineWidth = Math.max(.3, r * .06); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(a + x * r, b + y * r) : g.moveTo(a + x * r, b + y * r)); g.stroke();
}
// ein Berg: Grundriss aus 7 Ecken, Spitze etwas versetzt, jede Seite nach dem Licht (oben links) schattiert, oben Schnee
function cityMountain(g, K, cx, cy, r, h, pal, R) {
    const n = 7, base = [], ax = cx + (R() - .5) * r * .35, ay = cy + (R() - .5) * r * .35;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + R() * .45, rr = r * (.78 + R() * .35); base.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    const top = pal.mesa ? base.map(p => [ax + (p[0] - ax) * .45, ay + (p[1] - ay) * .45]) : null;
    const A = K.P(ax, ay, h), faces = base.map((p, i) => [p, base[(i + 1) % n], i]).sort((f, q) => (f[0][0] + f[0][1] + f[1][0] + f[1][1]) - (q[0][0] + q[0][1] + q[1][0] + q[1][1]));
    for (const [p, q, i] of faces) {
        if (top) { const t1 = K.P(top[i][0], top[i][1], h), t2 = K.P(top[(i + 1) % n][0], top[(i + 1) % n][1], h), P1 = K.P(p[0], p[1], 0), P2 = K.P(q[0], q[1], 0);
            const mx = (p[0] + q[0]) / 2 - ax, my = (p[1] + q[1]) / 2 - ay, L = Math.hypot(mx, my) || 1, lit = -(mx + my) / L / Math.SQRT2;
            K.poly([P1, P2, t2, t1], shade(pal.rock, .74 + lit * .3), .35);
            for (const f of [.33, .66]) cityKante(K, [P1[0] + (t1[0] - P1[0]) * f, P1[1] + (t1[1] - P1[1]) * f], [P2[0] + (t2[0] - P2[0]) * f, P2[1] + (t2[1] - P2[1]) * f], 'rgba(90,50,20,.25)', .8);
            continue; }
        const mx = (p[0] + q[0]) / 2 - ax, my = (p[1] + q[1]) / 2 - ay, L = Math.hypot(mx, my) || 1, lit = -(mx + my) / L / Math.SQRT2;   // +1 = zur Sonne
        const P1 = K.P(p[0], p[1], 0), P2 = K.P(q[0], q[1], 0), col = shade(pal.rock, .74 + lit * .3);
        K.poly([P1, P2, A], col, .35);
        const M = [(P1[0] + P2[0]) / 2 + (R() - .5) * r * .3, (P1[1] + P2[1]) / 2];                                   // ein Grat in der Mitte der Seite
        g.strokeStyle = 'rgba(255,255,255,' + (lit > 0 ? .1 : .04) + ')'; g.lineWidth = .7; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(M[0], M[1]); g.stroke();
        const low = (u, t) => [u[0] + (A[0] - u[0]) * t, u[1] + (A[1] - u[1]) * t];
        if (!pal.schnee) K.poly([P1, P2, low(P2, .3), low(P1, .3)], shade(pal.land, .78 + lit * .22), .2);   // grüner Fuß
        if (pal.peak) K.poly([low(P1, .68), low(P2, .68), A], shade(pal.peak, .86 + lit * .14), .25);   // Schnee (Vulkan: Glut)
    }
    if (top) K.poly(top.map(p => K.P(p[0], p[1], h)), shade(pal.rock, 1.1), .35);
}
function cityPaintGround() {
    const B = CITY_BAKE, c = document.createElement('canvas'), bio = cityBio(), pal = CITY_PAL[bio], R = mulberry32(4242);
    c.width = Math.ceil((CITY_BOUNDS.x1 - CITY_BOUNDS.x0) * B); c.height = Math.ceil((CITY_BOUNDS.y1 - CITY_BOUNDS.y0) * B);
    const g = c.getContext('2d'); g.setTransform(B, 0, 0, B, -CITY_BOUNDS.x0 * B, -CITY_BOUNDS.y0 * B); g.lineJoin = 'round';
    const pat = (seed, base, spots, n) => g.createPattern(cityTexture(seed, base, spots, n, 128), 'repeat');
    CITY_BG_COL = pal.bg;
    const land = pat(25, pal.land, pal.spots, 900), grass = pat(21, pal.grass, pal.gspots, 800);
    const cob = pat(23, pal.schnee ? '#c4c0b8' : '#b8a88a', ['#c7b798', '#a39374', '#d1c3a4', '#948466'], 900);
    const pave = pat(27, '#cfc4ab', ['#dad0b9', '#c1b59b', '#c8bca2', '#e0d7c2'], 600), dirt = pat(24, pal.schnee ? '#b8ad9a' : '#a68a5f', ['#b0946a', '#957a52', '#b89c72'], 600);
    const K = isoKit(g, 0, 'rgba(40,32,24,.35)');
    // 1) das Land überall, dazu große weiche Flecken (sonst sieht es aus wie ein Teppich)
    g.fillStyle = land; g.fillRect(CITY_BOUNDS.x0, CITY_BOUNDS.y0, CITY_BOUNDS.x1 - CITY_BOUNDS.x0, CITY_BOUNDS.y1 - CITY_BOUNDS.y0);
    for (let i = 0; i < 60; i++) { const [a, b] = cIso(-160 + R() * 960, -160 + R() * 960), r = 25 + R() * 70, hell = R() < .5;
        const gr = g.createRadialGradient(a, b, 0, a, b, r * 1.6); gr.addColorStop(0, hell ? 'rgba(255,248,200,.12)' : 'rgba(10,30,0,.13)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(a, b, r * 1.6, r, 0, 0, Math.PI * 2); g.fill(); }
    // Dünen (Sand) bzw. sanfte Wellen im Gras, Büschel und Blüten
    for (let i = 0; i < (bio === 'sand' ? 90 : 40); i++) { const [a, b] = cIso(-160 + R() * 960, -160 + R() * 960), w = 30 + R() * 60;
        g.strokeStyle = R() < .5 ? 'rgba(255,245,210,' + (bio === 'sand' ? .28 : .1) + ')' : 'rgba(60,40,10,' + (bio === 'sand' ? .16 : .07) + ')'; g.lineWidth = 2 + R() * 3;
        g.beginPath(); g.moveTo(a - w, b); g.quadraticCurveTo(a, b - w * (.15 + R() * .2), a + w, b + (R() - .5) * 8); g.stroke(); }
    for (let i = 0; i < 1400; i++) { const [a, b] = cIso(-160 + R() * 960, -160 + R() * 960), r2 = R();
        g.fillStyle = r2 < .45 ? shade(pal.spots[0], 1.12) : r2 < .9 ? shade(pal.spots[1], .82) : ['#f2e6a0', '#e8a0c0', '#ffffff', '#d0a0ff'][Math.floor(R() * 4)]; g.fillRect(a, b, r2 < .9 ? 1.6 + R() * 2 : 1, r2 < .9 ? .7 : 1); }
    // 2) der Fluss rechts an der Stadt vorbei (Ufer, tiefes Wasser, helle Mitte, Glitzern)
    const fluss = [[604, -190], [574, 30], [566, 170], [590, 320], [642, 452], [706, 566], [800, 700]].map(p => cIso(p[0], p[1]));
    const zug = (w, col) => { g.beginPath(); fluss.forEach((p, i) => { if (!i) g.moveTo(p[0], p[1]); else if (i < fluss.length - 1) g.quadraticCurveTo(p[0], p[1], (p[0] + fluss[i + 1][0]) / 2, (p[1] + fluss[i + 1][1]) / 2); else g.lineTo(p[0], p[1]); });
        g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.stroke(); };
    zug(54, shade(pal.land, .82)); zug(46, pal.bank); zug(38, pal.water[0]); zug(28, pal.water[1]); zug(10, 'rgba(255,255,255,.12)');
    for (let i = 0; i < 70; i++) { const k = Math.floor(R() * (fluss.length - 1)), t = R(), a = fluss[k][0] + (fluss[k + 1][0] - fluss[k][0]) * t + (R() - .5) * 22, b = fluss[k][1] + (fluss[k + 1][1] - fluss[k][1]) * t + (R() - .5) * 10;
        g.fillStyle = 'rgba(255,255,255,' + (.25 + R() * .35) + ')'; g.fillRect(a, b, 2 + R() * 5, .7); }
    // 3) Felder vorn links und rechts der Hauptstraße, mit Furchen und Hecken
    const feld = (x0, y0, x1, y1) => { const col = pal.field[Math.floor(R() * pal.field.length)], quer = R() < .5;
        cityGroundPoly(g, cityRect(x0 - 2, y0 - 2, x1 + 2, y1 + 2), shade(pal.leaf[0], 1.05)); cityGroundPoly(g, cityRect(x0, y0, x1, y1), col);
        g.strokeStyle = shade(col, .78); g.lineWidth = .7;
        for (let v = (quer ? y0 : x0) + 2.5; v < (quer ? y1 : x1); v += 3.4) { const [a, b] = cIso(quer ? x0 : v, quer ? v : y0), [a2, b2] = cIso(quer ? x1 : v, quer ? v : y1); g.beginPath(); g.moveTo(a, b); g.lineTo(a2, b2); g.stroke(); } };
    for (const f of [[176, 516, 238, 568], [246, 516, 304, 568], [176, 576, 238, 636], [246, 576, 304, 636], [338, 516, 404, 556], [338, 600, 420, 650], [176, 644, 304, 700]]) feld(...f);
    // 4) Wege draußen: die Hauptstraße vom Tor nach Süden, Pfade zu Holzfäller, Steinbruch und Eisenmine
    cityStrip(g, [[320, 492], [320, 600], [306, 700], [300, 780]], 22, 'rgba(92,78,56,.85)'); cityStrip(g, [[320, 492], [320, 600], [306, 700], [300, 780]], 17, dirt);
    cityStrip(g, [[320, 492], [320, 540]], 17, cob);
    // 5) Berge hinten, Wald links, hinten rechts, jenseits des Flusses und hinter den Feldern – in Tiefen-Reihenfolge gemalt
    const dinge = [];
    for (const [x, y, r, h] of [[110, 6, 62, 92], [232, -34, 58, 80], [36, 92, 54, 72], [-36, 178, 50, 62], [334, -62, 52, 70], [-96, 292, 46, 54], [432, -104, 50, 62], [-130, 410, 40, 44]])
        for (const [dx, dy, k] of [[0, 0, 1], [-r * .55, r * .25, .62], [r * .4, -r * .45, .7]]) dinge.push({ d: x + dx + y + dy, f: () => cityMountain(g, K, x + dx, y + dy, r * k, h * k * (.85 + R() * .3), pal, R) });
    for (const [x, y, r, h] of [[166, 24, 30, 34], [60, 160, 26, 26], [-60, 262, 24, 24], [300, 10, 26, 28]]) dinge.push({ d: x + y, f: () => cityMountain(g, K, x, y, r, h, pal, R) });   // Hügel davor
    const frei = (x, y) => {
        return !(x > 120 && x < 520 && y > 120 && y < 520) && !(x > 160 && x < 430 && y > 500 && y < 712) && !(x > 480 && y > 470 && x + y < 1110) && !(x > 548 && x < 668 && y < 470) && !(x > 610 && x < 740 && y > 420 && y < 640); };
    for (let i = 0, n = Math.round(420 * pal.wald); i < n; i++) {
        const x = -170 + R() * 980, y = -170 + R() * 980;
        if (!frei(x, y) || x + y < 60 && R() < .7) continue;
        const dicht = x < 130 || y < 130 || x > 640 || y > 690;
        if (!dicht && R() < .7) continue;
        const [a, b] = cIso(x, y), pine = R() < pal.pines, r = 4.2 + R() * 2.4;
        dinge.push({ d: x + y, f: pine ? (pal.palm ? () => cityPalmAt(g, a, b, r * 4.4, pal) : () => cityPineAt(g, a, b, r * 4.2, pal)) : () => cityTreeAt(g, a, b, r, pal, R() < .5) });
    }
    for (let i = 0; i < 50; i++) { const x = -60 + R() * 420, y = -100 + R() * 300; if (x + y > 300 || !frei(x, y)) continue; const [a, b] = cIso(x, y); dinge.push({ d: x + y, f: () => cityRockAt(g, a, b, 2 + R() * 3.5, pal.rock) }); }
    for (const [x, y] of [[420, 520], [494, 530], [478, 600], [436, 606], [404, 590]]) { const [a, b] = cIso(x, y); dinge.push({ d: x + y, f: () => cityRockAt(g, a, b, 3 + R() * 3, pal.rock) }); }
    dinge.sort((p, q) => p.d - q.d).forEach(t => t.f());
    // 6) in der Mauer: gepflegter Rasen, Straßen wie ein „#“ mit Randsteinen, der Burgplatz, gepflasterte Bauplätze
    cityGroundPoly(g, cityRect(CITY_WALL.a, CITY_WALL.a, CITY_WALL.b, CITY_WALL.b), grass);
    for (let i = 0; i < 260; i++) { const [a, b] = cIso(158 + R() * 324, 158 + R() * 324); g.fillStyle = R() < .5 ? 'rgba(255,255,220,.16)' : 'rgba(20,50,10,.14)'; g.fillRect(a, b, 1.6 + R() * 2.4, .7); }   // Grasbüschel
    const strassen = [[[244, 178], [244, 462]], [[396, 178], [396, 462]], [[178, 244], [462, 244]], [[178, 396], [462, 396]], [[320, 172], [320, 262]], [[172, 320], [262, 320]], [[378, 320], [468, 320]], [[320, 378], [320, 494]]];
    for (const p of strassen) cityStrip(g, p, 17, 'rgba(92,78,56,.85)');
    const kreis = (r, n) => { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([CC + Math.cos(a) * r, CC + Math.sin(a) * r]); } return pts; };
    cityGroundPoly(g, kreis(66, 44), 'rgba(92,78,56,.85)');
    for (const p of strassen) cityStrip(g, p, 13.5, cob);
    cityGroundPoly(g, kreis(64, 44), cob); cityGroundPoly(g, kreis(59, 44), pave); cityGroundPoly(g, kreis(53, 44), cob);   // der runde Burgplatz mit einem Ring heller Platten
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, [p1, p2] = cIso(CC + Math.cos(a) * 59, CC + Math.sin(a) * 59), [q1, q2] = cIso(CC + Math.cos(a) * 53, CC + Math.sin(a) * 53);
        g.strokeStyle = 'rgba(92,78,56,.45)'; g.lineWidth = .5; g.beginPath(); g.moveTo(p1, p2); g.lineTo(q1, q2); g.stroke(); }
    const rasen = pat(28, shade(pal.grass, 1.06), pal.gspots.map(x => shade(x, 1.05)), 700);
    for (const k of Object.keys(CITY_LOTS)) { if (k === 'wall' || CITY_DRAUSSEN.has(k)) continue; const [x, y] = CITY_LOTS[k];   // jeder Bauplatz: gepflegter Rasen mit Randsteinen
        cityGroundPoly(g, cityRect(x - 25.5, y - 25.5, x + 25.5, y + 25.5), 'rgba(120,108,86,.9)'); cityGroundPoly(g, cityRect(x - 24, y - 24, x + 24, y + 24), rasen);
        for (let i = 0; i < 30; i++) { const [a2, b2] = cIso(x - 22 + R() * 44, y - 22 + R() * 44); g.fillStyle = R() < .5 ? 'rgba(255,255,220,.18)' : 'rgba(20,50,10,.12)'; g.fillRect(a2, b2, 1.4 + R() * 2, .6); } }
    // Blumenbeete im Rasenstreifen an der Mauer
    const farben = pal.schnee ? ['#c0392b', '#ffffff'] : ['#e74c3c', '#f1c40f', '#ecf0f1', '#9b59b6', '#e67e22'];
    for (const [x, y, w, d] of [[186, 158, 40, 8], [262, 158, 40, 8], [338, 158, 40, 8], [414, 158, 40, 8], [158, 186, 8, 40], [158, 262, 8, 40], [158, 338, 8, 40], [158, 414, 8, 40]]) {
        cityGroundPoly(g, cityRect(x, y, x + w, y + d), '#6b4a2c'); for (let i = 0; i < w * d / 9; i++) { const [a, b] = cIso(x + 1 + R() * (w - 2), y + 1 + R() * (d - 2)); g.fillStyle = farben[Math.floor(R() * farben.length)]; g.beginPath(); g.arc(a, b, .9, 0, 7); g.fill(); } }
    CITY_GROUND_BIO = bio;
    return CITY_GROUND = c;
}
let CITY_GROUND_BIO = '';
// ---- Deko (eigene kleine Bilder, in Tiefen-Reihenfolge mit den Häusern): Brunnen, Bäume an der Mauer, Laternen, Statuen, Mühle, Hof ----
let CITY_DECO = null;
function cityDeco() {
    const bio = cityBio(); if (CITY_DECO && CITY_DECO.bio === bio) return CITY_DECO.list;
    const pal = CITY_PAL[bio], R = mulberry32(99), out = [];
    out.push({ at: [CC, 372], kind: 'fountain' }, { at: [266, 266], kind: 'tree', col: 'a' }, { at: [374, 266], kind: 'tree', col: 'b' }, { at: [266, 374], kind: 'statue' }, { at: [374, 374], kind: 'statue' });
    for (const y of [418, 450, 482]) out.push({ at: [310, y], kind: 'lamp' }, { at: [330, y], kind: 'lamp' });
    const strip = (fest, quer) => { for (let v = 182; v <= 460; v += 20) { if (Math.abs(v - 244) < 13 || Math.abs(v - 396) < 13 || Math.abs(v - 320) < (fest > 400 && !quer ? 24 : 13)) continue;
        const kind = R() < pal.pines ? 'pine' : R() < .3 ? 'bush' : 'tree', o = (R() - .5) * 4; out.push({ at: quer ? [fest + o, v] : [v, fest + o], kind, col: R() < .5 ? 'a' : 'b' }); } };
    strip(165, true); strip(165, false); strip(475, true); strip(475, false);
    out.push({ at: [560, 604], kind: 'mill' }, { at: [612, 566], kind: 'house' }, { at: [588, 540], kind: 'well' }, { at: [252, 652], kind: 'hay' }, { at: [214, 650], kind: 'hay' }, { at: [338, 612], kind: 'cart' });
    CITY_DECO = { bio, list: out }; return out;
}
function cityStaticSprite(kind, col) {
    const bio = cityBio(), key = 's:' + kind + (col || '') + ':' + bio; let s = CITY_SPRITES.get(key); if (s) return s;
    const pal = CITY_PAL[bio], w = 30, up = kind === 'mill' ? 62 : 50, down = 12, c = document.createElement('canvas'); c.width = w * 2 * CITY_SPR_SCALE; c.height = (up + down) * CITY_SPR_SCALE;
    const g = c.getContext('2d'), K = cityPainter(g, CITY_SPR_SCALE, w * CITY_SPR_SCALE, up * CITY_SPR_SCALE);
    if (kind === 'fountain') { K.cyl(0, 0, 10, 0, 3, '#c9c1ae', .6); K.cyl(0, 0, 8.6, 3, 3.3, pal.schnee ? '#cfe6f2' : '#4d9ad0', .3); K.cyl(0, 0, 1.8, 3, 10, '#d8d1c1', .5); K.cyl(0, 0, 4, 10, 11.2, '#c9c1ae', .5); K.cyl(0, 0, 1, 11.2, 14, '#d8d1c1', .4); }
    else if (kind === 'tree') cityTreeAt(g, 0, 0, 5.4, pal, col === 'b');
    else if (kind === 'pine') (pal.palm ? cityPalmAt : cityPineAt)(g, 0, 0, 22, pal);
    else if (kind === 'bush') cityBushAt(g, 0, 0, 4.2, pal);
    else if (kind === 'lamp') { K.box(-.5, .5, -.5, .5, 0, 12, '#3a3530', .3); K.box(-1.4, 1.4, -1.4, 1.4, 12, 14.6, '#f2d27a', .4); K.pyramid(0, 0, 1.8, 14.6, 2.2, '#3a3530'); }
    else if (kind === 'statue') { K.box(-4, 4, -4, 4, 0, 5, '#bdb3a0', .6); K.box(-3, 3, -3, 3, 5, 6, '#a89f8c', .5); K.cyl(0, 0, 1.6, 6, 13, '#9a8a5a', .5); K.dome(0, 0, 1.3, 13, 2.4, '#b39a5a');
        const [a, b] = K.P(0, 0, 11); K.poly([[a + 1, b], [a + 5, b - 6], [a + 5.6, b - 5.5], [a + 1.8, b + .5]], '#8a7a4a', .3); }
    else if (kind === 'well') { K.cyl(0, 0, 4, 0, 4, '#bdb3a0', .6); K.cyl(0, 0, 3, 3.6, 4, '#2a4a6a', .3, false); for (const x of [-3.5, 3.5]) K.box(x - .4, x + .4, -.4, .4, 4, 11, '#6b4a2c', .3); cityGable(K, -5, 5, -3, 3, 11, 3, '#8a3a2a'); }
    else if (kind === 'hay') { K.cyl(0, 0, 4.5, 0, 4, '#d9b85a', .4); K.cone(0, 0, 4.6, 4, 4, '#e2c46a'); }
    else if (kind === 'cart') { K.box(-5, 5, -2.5, 2.5, 2, 5, '#8a6440', .4); K.box(-4.5, 4.5, -2, 2, 5, 7, '#d9b85a', .3); for (const x of [-3, 3]) { const [a, b] = K.P(x, 2.6, 2); g.fillStyle = '#3a2616'; g.beginPath(); g.arc(a, b, 1.8, 0, 7); g.fill(); } }
    else if (kind === 'mill') { K.cyl(0, 0, 7, 0, 26, '#e3d7c0', .8); K.cone(0, 0, 8, 26, 10, '#8a3a2a'); cityDoor(K, 0, 7, 6); cityWindows(K, -2, 2, 7, 16, 1, false); }
    else { K.box(-9, 9, -6, 6, 0, 8, '#e9dfc8', .7); cityGable(K, -10, 10, -7, 7, 8, 6, '#8e3a2c'); cityWindows(K, -6, 6, 6, 5, 2, false); cityDoor(K, 5, 6, 5); K.box(11, 16, -4, 4, 0, 5, '#c9a86a', .5); K.box(-12, -10, -2, 2, 0, 3.5, '#8a6440', .3); }
    s = { c, w, up, down }; CITY_SPRITES.set(key, s); return s;
}

// ---- the curtain wall: its look follows the Mauer level (palisade → stone → high stone with blue, gold at 20+) ----
function cityPaintWalls(lvl) {
    const t = !lvl ? 0 : lvl >= 20 ? 3 : lvl >= 10 ? 2 : 1, key = 'walls' + t;
    if (CITY_WALLS && CITY_WALLS.key === key) return CITY_WALLS;
    const S = CITY_SPR_SCALE * .6, WB = { x0: -322, x1: 322, y0: 56, y1: 522 }, mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil((WB.x1 - WB.x0) * S); c.height = Math.ceil((WB.y1 - WB.y0) * S);
        const g = c.getContext('2d'); g.setTransform(S, 0, 0, S, -WB.x0 * S, -WB.y0 * S); g.lineJoin = 'round'; return { c, g }; };
    const back = mk(), front = mk(), A = CITY_WALL.a, Bw = CITY_WALL.b;
    const hgt = [9, 13, 17, 19][t], th = hgt + 7, col = t ? STONE : '#8a6440', roof = t >= 3 ? '#d9a93f' : t >= 2 ? '#2f5e9a' : '#8a3a2a';
    const seg = (K, x0, y0, x1, y1) => {                                    // a straight run of wall (along x or y)
        if (!t) { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 3.3); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n, hh = hgt + 1 + (i % 3 === 1 ? 1.4 : 0);   // Palisade: dicke Stämme mit Spitzen
            K.cyl(x, y, 1.85, 0, hh, i % 2 ? '#a07650' : '#8f6a44', .3, true); K.cone(x, y, 1.9, hh, 3, '#6b4a2c'); } return; }
        const along = x0 === x1 ? 'y' : 'x', a0 = Math.min(along === 'x' ? x0 : y0, along === 'x' ? x1 : y1), a1 = Math.max(along === 'x' ? x0 : y0, along === 'x' ? x1 : y1);
        if (along === 'x') { K.box(a0, a1, y0 - 3, y0 + 3, 0, hgt, col, .7); K.merlons(a0, a1, y0 - 3, y0 + 3, hgt, col, Math.round((a1 - a0) / 7)); }
        else { K.box(x0 - 3, x0 + 3, a0, a1, 0, hgt, col, .7); K.merlons(x0 - 3, x0 + 3, a0, a1, hgt, col, Math.round((a1 - a0) / 7)); }
    };
    const tower = (K, x, y, big) => { if (!t) { K.box(x - 4.5, x + 4.5, y - 4.5, y + 4.5, 0, hgt + 7, '#9a7046', .5); K.box(x - 6.5, x + 6.5, y - 6.5, y + 6.5, hgt + 7, hgt + 10, '#7a5232', .5);   // Holzturm mit Plattform
            K.pyramid(x, y, 7.2, hgt + 10, 8, '#8a3a2a'); const [a, b] = K.P(x, y, hgt + 19); K.flag(a, b, BAND.player, true); return; }
        const r = big ? 8 : 6.5; K.cyl(x, y, r, 0, th + (big ? 4 : 0), col, .8); K.cone(x, y, r + 1.5, th + (big ? 4 : 0), 9 + t * 2, roof);
        if (t >= 2) { const [a, b] = K.P(x, y, th + 12 + t * 2); K.flag(a, b, BAND.player, true); } };
    { const K = isoKit(back.g, 0, CITY_INK);                                          // back: the top corner, the two far runs and the side corners
        seg(K, A, A, Bw, A); seg(K, A, A, A, Bw); tower(K, A, A, true); tower(K, CC, A); tower(K, A, CC); tower(K, Bw, A, true); tower(K, A, Bw, true); }
    { const K = isoKit(front.g, 0, CITY_INK);                                         // front: the two near runs (with the gap for the gatehouse) and the bottom corner
        seg(K, Bw, A, Bw, Bw); seg(K, A, Bw, CC - 16, Bw); seg(K, CC + 16, Bw, Bw, Bw); tower(K, Bw, CC); tower(K, Bw, Bw, true); }
    return CITY_WALLS = { key, back: back.c, front: front.c, S, B: WB };
}

// ---- people: villagers on the streets ----
const CITY_PATHS = [
    [[CC, 600], [CC, 494], [CC, 380]], [[244, 244], [396, 244], [396, 396], [244, 396], [244, 244]],
    [[244, 178], [244, 462]], [[396, 462], [396, 178]], [[178, 244], [462, 244]], [[462, 396], [178, 396]], [[CC, 172], [CC, 260]], [[172, CC], [260, CC]]
];
let cityFolk = null;
function cityMakeFolk() {
    const rnd = mulberry32(7), cols = ['#8e3a2c', '#2f5e9a', '#6d8a4a', '#8a6440', '#c9a54e', '#5d4a7a', '#e9dfc8'];
    cityFolk = [];
    for (let i = 0; i < 40; i++) { const p = CITY_PATHS[i % CITY_PATHS.length];
        cityFolk.push({ p, t: rnd(), v: (.012 + rnd() * .018) * (rnd() < .5 ? -1 : 1), col: cols[Math.floor(rnd() * cols.length)], hat: rnd() < .4, cart: i % 11 === 5 }); }
}
function cityPathPoint(p, t) {                                              // a point along a polyline, t in 0..1
    let total = 0; const seg = []; for (let i = 1; i < p.length; i++) { const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); seg.push(l); total += l; }
    let d = ((t % 1) + 1) % 1 * total;
    for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const q = d / seg[i]; return [p[i][0] + (p[i + 1][0] - p[i][0]) * q, p[i][1] + (p[i + 1][1] - p[i][1]) * q]; } d -= seg[i]; }
    return p[p.length - 1];
}

// ---- camera ----
const CITY_VIEW = { x0: -420, x1: 420, y0: 0, y1: 650 };                    // what the camera may show (the town, the land around it)
function cityFitZoom(W, H) { return Math.min(W / (CITY_VIEW.x1 - CITY_VIEW.x0), H / (CITY_VIEW.y1 - CITY_VIEW.y0)); }
function cityClampCam(W, H) {
    const c = cityCam, zMin = Math.max(cityFitZoom(W, H) * .95, W / (CITY_BOUNDS.x1 - CITY_BOUNDS.x0 - 60), H / (CITY_BOUNDS.y1 - CITY_BOUNDS.y0 - 60)), zMax = 3;   // (nie weiter als das gemalte Land)
    c.z = Math.max(zMin, Math.min(zMax, c.z));
    const hw = W / 2 / c.z, hh = H / 2 / c.z, V = CITY_VIEW;                  // keep the town in view (centred when it is smaller than the screen)
    c.x = V.x1 - V.x0 <= 2 * hw ? (V.x0 + V.x1) / 2 : Math.max(V.x0 + hw, Math.min(V.x1 - hw, c.x));
    c.y = V.y1 - V.y0 <= 2 * hh ? (V.y0 + V.y1) / 2 : Math.max(V.y0 + hh, Math.min(V.y1 - hh, c.y));
}

cityCanvas.addEventListener('pointerdown', e => {
    if (e.isPrimary) { cityPointers.clear(); cityGesture = null; }             // a new first finger: whatever was left over from before is gone
    try { cityCanvas.setPointerCapture(e.pointerId); } catch (err) {}
    cityPointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (cityCam) cityCam.tx = cityCam.ty = undefined;
    if (cityPointers.size === 1) cityDrag = { x: e.clientX, y: e.clientY, cx: cityCam && cityCam.x, cy: cityCam && cityCam.y, moved: false };
    else if (cityPointers.size === 2) { const [a, b] = [...cityPointers.values()]; cityGesture = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cityCam.z }; if (cityDrag) cityDrag.moved = true; }
});
cityCanvas.addEventListener('pointermove', e => {
    if (!cityPointers.has(e.pointerId) || !cityCam) return;
    cityPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (cityPointers.size >= 2 && cityGesture) { const [a, b] = [...cityPointers.values()]; cityCam.z = cityGesture.z * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, cityGesture.d); return; }
    if (!cityDrag) return;
    const dx = e.clientX - cityDrag.x, dy = e.clientY - cityDrag.y;
    if (Math.hypot(dx, dy) > 8) cityDrag.moved = true;
    if (cityDrag.moved) { cityCam.x = cityDrag.cx - dx / cityCam.z; cityCam.y = cityDrag.cy - dy / cityCam.z; }
});
const cityPointerEnd = e => { cityPointers.delete(e.pointerId); if (cityPointers.size < 2) cityGesture = null;
    if (!cityPointers.size) setTimeout(() => { cityDrag = null; }, 0);
    else if (cityPointers.size === 1 && cityCam) { const [p] = [...cityPointers.values()]; cityDrag = { x: p.x, y: p.y, cx: cityCam.x, cy: cityCam.y, moved: true }; } };
cityCanvas.addEventListener('pointerup', cityPointerEnd);
cityCanvas.addEventListener('pointercancel', cityPointerEnd);
cityCanvas.addEventListener('wheel', e => { if (!cityCam) return; e.preventDefault(); cityCam.z *= Math.exp(-e.deltaY * .0015); }, { passive: false });
cityCanvas.addEventListener('click', e => {
    if (cityDrag && cityDrag.moved) return;       // that was a swipe, not a tap
    const r = cityCanvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const hits = cityHitRects.filter(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const hit = hits.sort((a, b) => Math.hypot(a.cx - x, a.cy - y) - Math.hypot(b.cx - x, b.cy - y))[0];   // the building closest to the finger
    if (hit && hit.id !== cityRingId) { cityFocus(hit.id); cityRingAuf(hit.id); }   // erst die runden Knöpfe am Gebäude (wie in Rise of Kingdoms)
    else { cityRingZu(); cityOpenId = null; document.getElementById('citySheet').hidden = true; }
});

function cityLotOf(id) { return id === '_keep' ? CITY_KEEP_AT : CITY_LOTS[id]; }
function cityFocus(id, now) {                                             // glide (or jump) the camera to a building
    const at = cityLotOf(id); if (!at || !cityCam) return;
    const [x, y] = cIso(at[0], at[1]); cityCam.tx = x; cityCam.ty = y - 14;
    if (now) { cityCam.x = cityCam.tx; cityCam.y = cityCam.ty; cityCam.tx = cityCam.ty = undefined; }
}
// ---- fertige Bild-Lagen für die Stadt (siehe cityFrame): unten = Boden + hintere Mauer + Schatten, oben = vordere Mauer, licht = Licht + Rand ----
const CITY_LAGEN = { letzt: '', letztZ: 0, key: '', lichtKey: '', unten: null, oben: null, licht: null };
function cityLage(name, W, H, dpr2, paint) {
    const c = CITY_LAGEN[name] || (CITY_LAGEN[name] = document.createElement('canvas')), w = Math.round(W * dpr2), h = Math.round(H * dpr2);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.setTransform(dpr2, 0, 0, dpr2, 0, 0); g.imageSmoothingQuality = 'high'; paint(g);
}
function cityLagenFrei() {                                                   // the town is closed: give the memory back
    for (const n of ['unten', 'oben', 'licht']) if (CITY_LAGEN[n]) { CITY_LAGEN[n].width = CITY_LAGEN[n].height = 0; CITY_LAGEN[n] = null; }
    CITY_LAGEN.key = CITY_LAGEN.lichtKey = CITY_LAGEN.letzt = ''; CITY_LAGEN.letztZ = 0;
}
function cityUnten(g, W, H, Z, ox, oy, walls, list, toS) {                   // background, ground, back walls and the soft shadows of all houses
    const wb = CITY_BOUNDS;
    g.fillStyle = CITY_BG_COL; g.fillRect(0, 0, W, H);
    g.drawImage(CITY_GROUND || cityPaintGround(), wb.x0 * Z + ox, wb.y0 * Z + oy, (wb.x1 - wb.x0) * Z, (wb.y1 - wb.y0) * Z);
    const mb = walls.B; g.drawImage(walls.back, mb.x0 * Z + ox, mb.y0 * Z + oy, (mb.x1 - mb.x0) * Z, (mb.y1 - mb.y0) * Z);
    for (const it of list) { const [sx, sy] = toS(it.x, it.y), r = (it.keep ? 46 : it.deco ? 14 : it.ghost ? 18 : 28) * Z, shx = sx + r * .35, shy = sy + r * .12;   // soft shadow falling to the lower right (sun top left)
        const sg = g.createRadialGradient(shx, shy, r * .1, shx, shy, r * 1.1); sg.addColorStop(0, 'rgba(20,30,10,.32)'); sg.addColorStop(1, 'rgba(20,30,10,0)');
        g.fillStyle = sg; g.beginPath(); g.ellipse(shx, shy, r * 1.1, r * .55, 0, 0, Math.PI * 2); g.fill(); }
}
function cityOben(g, Z, ox, oy, walls) { const mb = walls.B; g.drawImage(walls.front, mb.x0 * Z + ox, mb.y0 * Z + oy, (mb.x1 - mb.x0) * Z, (mb.y1 - mb.y0) * Z); }
// a house picture: painted large once (CITY_SPR_SCALE), shrunk to the current zoom once more and kept - then every
// frame is a 1:1 copy instead of shrinking the big picture again (the same look, a fraction of the work)
const CITY_SPR_FERTIG = new WeakMap();
function citySprDraw(g, s, dx, dy, k, dpr2, zStill) {
    if (!zStill) { g.drawImage(s.c, dx, dy, s.c.width * k, s.c.height * k); return; }
    const f = k * dpr2; let m = CITY_SPR_FERTIG.get(s);
    if (!m || m.f !== f) { const c = m ? m.c : document.createElement('canvas'); c.width = Math.ceil(s.c.width * f); c.height = Math.ceil(s.c.height * f);
        const cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.setTransform(f, 0, 0, f, 0, 0); cg.drawImage(s.c, 0, 0); m = { f, c }; CITY_SPR_FERTIG.set(s, m); }
    g.drawImage(m.c, dx, dy, m.c.width / dpr2, m.c.height / dpr2);
}
// ---- one frame ----
function cityFrame(now) {
    if (cityView.hidden) return;
    // Handy schonen: steht alles still (kein Finger, keine Kamerafahrt, keine Wolken), reichen 30 Bilder pro Sekunde – die
    // Leute gehen langsam, man sieht keinen Unterschied. Ganz in den Wolken (alles weiß) wird die Stadt gar nicht gezeichnet.
    const bewegt = !!(cityDrag || cityGesture || cloudAnim || !cityCam || cityCam.anim || cityCam.tx !== undefined);
    if ((!bewegt && now - (cityFrame.drawn || 0) < 30) || (cloudCover >= .95 && CITY_GROUND)) { cityRaf = requestAnimationFrame(cityFrame); return; }   // (beim allerersten Mal wird unter den Wolken schon gemalt)
    cityFrame.drawn = now;
    const dpr2 = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight;
    if (cityCanvas.width !== Math.round(W * dpr2) || cityCanvas.height !== Math.round(H * dpr2)) { cityCanvas.width = Math.round(W * dpr2); cityCanvas.height = Math.round(H * dpr2); }
    if (!cityCam) { const [kx, ky] = cIso(CC, CC); cityCam = { x: kx, y: ky + 6, z: Math.max(cityFitZoom(W, H), Math.min(2.2, W / 385)) };
        if (cityPendingAnim) { cityCam.anim = { from: .35, t0: now, dur: 900 }; cityPendingAnim = false; } }
    let animZ = 1;
    if (cityCam.anim) { const a = cityCam.anim, q = Math.min(1, (now - a.t0) / a.dur), e = 1 - Math.pow(1 - q, 3), to = a.to ?? 1;
        animZ = a.from + (to - a.from) * e; if (q >= 1 && to === 1) cityCam.anim = null; }
    const sheetH = cityOpenId && !document.getElementById('citySheet').hidden ? Math.min(380, H * .46) : 0;
    if (cityCam.tx !== undefined && !cityDrag) { const f = Math.min(1, .16); cityCam.x += (cityCam.tx - cityCam.x) * f; cityCam.y += (cityCam.ty - cityCam.y) * f;
        if (Math.hypot(cityCam.tx - cityCam.x, cityCam.ty - cityCam.y) < .3) cityCam.tx = cityCam.ty = undefined; }
    cityClampCam(W, H - sheetH * .6);
    const g = cityCtx, c = loadCity(), Z = cityCam.z * animZ;
    if (!CITY_GROUND || CITY_GROUND_BIO !== cityBio()) cityPaintGround();   // (neu, wenn die Hauptstadt in eine andere Gegend zieht)
    const ox = W / 2 - cityCam.x * Z, oy = (H - sheetH * .6) / 2 - cityCam.y * Z;
    const toS = (x, y, z) => { const [sx, sy] = cIso(x, y); return [sx * Z + ox, (sy - (z || 0)) * Z + oy]; };
    // ground and walls (back half), then buildings and people in depth order, then the front walls
    const wlvl = c.levels.wall || 0, walls = cityPaintWalls(wlvl);
    const items = [];
    const lvlKeep = c.levels.keep || 1;                                                // Paket D: die Burg wächst mit der Burg-Stufe (alle 5 Stufen ein Stück)
    items.push({ id: '_keep', x: CITY_KEEP_AT[0], y: CITY_KEEP_AT[1], spr: citySprite('keep', Math.min(4, Math.floor(lvlKeep / 5))), name: 'Burg', lvl: lvlKeep, keep: true });
    for (const b of CITY_BUILDINGS) { const at = CITY_LOTS[b.id]; if (!at) continue;
        const lvl = c.levels[b.id] || 0, tier = cityTierOf(lvl);
        if (b.id === 'wall') { items.push({ id: 'wall', x: at[0], y: at[1], spr: citySprite('gatehouse', tier), name: b.name, lvl, b, gate: true }); continue; }
        items.push({ id: b.id, x: at[0], y: at[1], spr: tier ? citySprite(b.id, tier, b.id === 'heroes' ? Math.ceil(HEROES.filter(h => heroOwned('player', h.id)).length / HEROES.length * 3) : '') : citySprite('ghost', 0, b.id), name: b.name, lvl, b, ghost: !tier }); }
    for (const s of cityDeco()) items.push({ x: s.at[0], y: s.at[1], spr: cityStaticSprite(s.kind, s.col), deco: s.kind });
    const hour = new Date().getHours() + new Date().getMinutes() / 60;             // evening and night: torches, lit windows
    const night = hour >= 20 || hour < 5.5 ? 1 : hour >= 18 ? (hour - 18) / 2 : hour < 7 ? (7 - hour) / 1.5 : 0;
    if (c.levels.hospital) for (let i = 0; i < 2; i++) { const [hx, hy] = CITY_LOTS.hospital, a = now / 5200 + i * Math.PI;   // healers going round the tents
        items.push({ x: hx + Math.cos(a) * 22, y: hy + 10 + Math.sin(a) * 12, healer: true }); }
    { const [gx, gy] = CITY_LOTS.wall; for (const dx of [-14, 14]) items.push({ x: gx + dx * .55, y: gy + 12, soldier: true, guard: true }); }   // guards at the gate
    if (!cityFolk) cityMakeFolk();
    const dt = Math.min(.1, (now - (cityFrame.last || now)) / 1000); cityFrame.last = now;
    for (const f of cityFolk) { f.t += f.v * dt * (f.cart ? .5 : 1); const [x, y] = cityPathPoint(f.p, f.t); items.push({ x, y, folk: f }); }
    items.sort((p, q) => (p.x + p.y) - (q.x + q.y));
    // Boden, hintere Mauer und die weichen Schatten der Häuser ändern sich nur mit der Kamera. Steht sie still, liegen sie
    // fertig in einem Bild (CITY_LAGEN, wird einmal gemalt) – das spart pro Bild das teure Verkleinern der großen Boden- und
    // Mauerbilder und ~20 Farbverläufe. Bewegt sich die Kamera, wird wie bisher direkt gezeichnet (genau gleich).
    const LG = CITY_LAGEN, lkey = [W, H, dpr2, Z, ox, oy, walls.key, CITY_GROUND_BIO].join(','), still = lkey === LG.letzt, zStill = Z === LG.letztZ;
    LG.letzt = lkey; LG.letztZ = Z;
    const mitSchatten = items.filter(it => it.spr && (!it.deco || ['fountain', 'mill', 'house', 'well', 'statue'].includes(it.deco)));   // (Bäume, Büsche, Laternen haben ihren eigenen Schatten)
    if (still) {
        if (LG.key !== lkey) { cityLage('unten', W, H, dpr2, gg => cityUnten(gg, W, H, Z, ox, oy, walls, mitSchatten, toS)); cityLage('oben', W, H, dpr2, gg => cityOben(gg, Z, ox, oy, walls)); LG.key = lkey; }
        g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(LG.unten, 0, 0);
    }
    g.setTransform(dpr2, 0, 0, dpr2, 0, 0); g.imageSmoothingQuality = zStill ? 'high' : 'low';   // (nur während des kurzen Hinein-/Herauszoomens unter den Wolken: einfacher verkleinern)
    if (!still) cityUnten(g, W, H, Z, ox, oy, walls, mitSchatten, toS);
    g.imageSmoothingQuality = 'high';
    cityHitRects = [];
    const plates = [];
    for (const it of items) {
        const [sx, sy] = toS(it.x, it.y);
        if (it.guard) continue;                                              // (the gate guards stand in front of the wall: drawn after it)
        if (it.folk || it.soldier || it.healer) {                            // a person: body, head, a little bob
            const k = Math.max(.7, Z * .55), bob = it.guard ? 0 : Math.abs(Math.sin(now / 150 + it.x)) * k * .6;
            if (it.healer) { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx, sy, 1.6 * k, .7 * k, 0, 0, Math.PI * 2); g.fill();
                g.fillStyle = '#f3efe6'; g.fillRect(sx - 1 * k, sy - 3.8 * k - bob, 2 * k, 3.4 * k); g.fillStyle = '#c0392b'; g.fillRect(sx - .3 * k, sy - 3.4 * k - bob, .6 * k, 1.6 * k);
                g.fillStyle = '#e8c9a0'; g.beginPath(); g.arc(sx, sy - 4.6 * k - bob, .85 * k, 0, 7); g.fill(); g.fillStyle = '#f3efe6'; g.fillRect(sx - 1 * k, sy - 5.5 * k - bob, 2 * k, .6 * k); continue; }
            g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx, sy, 1.6 * k, .7 * k, 0, 0, Math.PI * 2); g.fill();
            if (it.folk && it.folk.cart) { g.fillStyle = '#7a5a36'; g.fillRect(sx - 3 * k, sy - 3.4 * k, 6 * k, 2.6 * k); g.fillStyle = '#3a2616'; g.beginPath(); g.arc(sx - 2 * k, sy - .6 * k, .9 * k, 0, 7); g.arc(sx + 2 * k, sy - .6 * k, .9 * k, 0, 7); g.fill(); continue; }
            g.fillStyle = it.soldier ? '#8a8f99' : it.folk.col; g.fillRect(sx - .9 * k, sy - 3.6 * k - bob, 1.8 * k, 3 * k);
            g.fillStyle = '#e8c9a0'; g.beginPath(); g.arc(sx, sy - 4.4 * k - bob, .85 * k, 0, 7); g.fill();
            if (it.soldier) { g.strokeStyle = '#5a4a3a'; g.lineWidth = .35 * k; g.beginPath(); g.moveTo(sx + 1.2 * k, sy - bob); g.lineTo(sx + 1.2 * k, sy - 7 * k - bob); g.stroke(); }
            else if (it.folk.hat) { g.fillStyle = '#5a3d24'; g.fillRect(sx - 1.1 * k, sy - 5.3 * k - bob, 2.2 * k, .6 * k); }
            continue;
        }
        const s = it.spr, k = Z / CITY_SPR_SCALE, dx = sx - s.w * Z, dy = sy - s.up * Z;
        if (it.id && (cityOpenId === it.id || cityRingId === it.id)) {      // selected: a golden ring on the ground
            g.save(); g.strokeStyle = 'rgba(255,220,140,.95)'; g.lineWidth = 2; g.setLineDash([6, 4]); g.lineDashOffset = -now / 40;
            g.beginPath(); const r = (it.keep ? 40 : 26) * Z; g.ellipse(sx, sy, r * .866 * 1.4, r * .5 * 1.4, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
        citySprDraw(g, s, dx, dy, k, dpr2, zStill);                         // (the soft shadow underneath is part of cityUnten)
        if (it.deco === 'mill') {                                           // turning sails
            const [hx, hy] = toS(it.x + 5, it.y + 5, 22), L = 17 * Z, a0 = now / 1400;
            g.save(); g.strokeStyle = '#5a3d24'; g.lineWidth = Math.max(1, Z * .8); g.fillStyle = 'rgba(240,232,212,.92)';
            for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 2, ex = hx + Math.cos(a) * L, ey = hy + Math.sin(a) * L * .9;
                g.beginPath(); g.moveTo(hx, hy); g.lineTo(ex, ey); g.stroke();
                const px = -Math.sin(a) * 3.2 * Z, py = Math.cos(a) * 3.2 * Z * .9;
                g.beginPath(); g.moveTo(hx + (ex - hx) * .25, hy + (ey - hy) * .25); g.lineTo(ex, ey); g.lineTo(ex + px, ey + py); g.lineTo(hx + (ex - hx) * .25 + px, hy + (ey - hy) * .25 + py); g.closePath(); g.fill(); g.stroke(); }
            g.restore(); }
        if (it.id === 'forge' && it.lvl) for (let i = 0; i < 5; i++) {       // chimney smoke
            const t = ((now / 1800) + i / 5) % 1, [cx2, cy2] = toS(it.x - 9, it.y - 5, 31);
            g.fillStyle = 'rgba(120,120,120,' + (.5 * (1 - t)) + ')'; g.beginPath(); g.arc(cx2 + t * 8 * Z, cy2 - t * 26 * Z, (1.5 + t * 4) * Z, 0, 7); g.fill(); }
        if (it.id === 'forge' && it.lvl) { const [ax, ay] = toS(it.x + 16, it.y + 13, 6);            // sparks off the anvil
            for (let i = 0; i < 7; i++) { const t = ((now / 700) + i / 7) % 1, an = -Math.PI / 2 + (i - 3) * .35; if (t > .8) continue;
                g.fillStyle = 'rgba(255,' + Math.round(200 - t * 120) + ',60,' + (1 - t) + ')'; g.fillRect(ax + Math.cos(an) * t * 12 * Z, ay + Math.sin(an) * t * 10 * Z + t * t * 8 * Z, Math.max(1, Z * .6), Math.max(1, Z * .6)); } }
        if (it.deco === 'fountain') { const [fx, fy] = toS(it.x, it.y, 10); g.strokeStyle = 'rgba(190,230,250,.8)'; g.lineWidth = Math.max(1, Z * .5);
            for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + now / 2000, r = 6 * Z; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + Math.cos(a) * r * .6, fy - 3 * Z, fx + Math.cos(a) * r, fy + Math.sin(a) * r * .5 + 7 * Z); g.stroke(); } }
        if (!it.id) continue;
        const building = !!cityBuildOf(c, it.id === '_keep' ? 'keep' : it.id);
        if (building) {                                                      // scaffolding + a bouncing hammer
            g.save(); g.strokeStyle = '#8a6a44'; g.lineWidth = Math.max(1.2, Z * .7);
            for (const [px, py] of [[-18, 18], [18, 18], [18, -18], [-18, -18]]) { const [a, b] = toS(it.x + px, it.y + py), [, b2] = toS(it.x + px, it.y + py, 24); g.beginPath(); g.moveTo(a, b); g.lineTo(a, b2); g.stroke(); }
            for (const zz of [8, 16, 24]) { g.beginPath(); [[-18, 18], [18, 18], [18, -18]].forEach((q, i) => { const [a, b] = toS(it.x + q[0], it.y + q[1], zz); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); }
            g.restore();
            const [hx, hy] = toS(it.x, it.y, 34); drawGlyph(g, 'upgrade', hx, hy - Math.abs(Math.sin(now / 180)) * 8, Math.max(16, 9 * Z), '#ffd98a');
            liveAnimation = true;
        }
        const hw = (it.keep ? 40 : 30) * Z, top = sy - (it.keep ? 70 : 38) * Z;
        cityHitRects.push({ id: it.id, x: sx - hw, y: top, w: hw * 2, h: sy + 14 * Z - top, cx: sx, cy: sy - (it.keep ? 30 : 16) * Z, depth: it.x + it.y });
        if (it.id === cityRingId) { const el = document.getElementById('cityRing'), tf = 'translate(' + Math.round(sx) + 'px,' + Math.round(sy + (it.keep ? 4 : 0) * Z) + 'px)';   // die runden Knöpfe folgen dem Gebäude
            if (el.style.transform !== tf) el.style.transform = tf; if (el.style.visibility) el.style.visibility = ''; }
        plates.push({ it, sx, sy, building, ghost: it.ghost });
    }
    if (still) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(LG.oben, 0, 0); g.setTransform(dpr2, 0, 0, dpr2, 0, 0); } else { g.imageSmoothingQuality = zStill ? 'high' : 'low'; cityOben(g, Z, ox, oy, walls); g.imageSmoothingQuality = 'high'; }
    // the gatehouse sits in the front wall: drawn over it
    const gate = items.find(i => i.gate);
    if (gate) { const [sx, sy] = toS(gate.x, gate.y), s = gate.spr, k = Z / CITY_SPR_SCALE; citySprDraw(g, s, sx - s.w * Z, sy - s.up * Z, k, dpr2, zStill); }
    for (const it of items) if (it.guard) {                                  // two guards with spears at the gate
        const [sx, sy] = toS(it.x, it.y), k = Math.max(.7, Z * .55);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx, sy, 1.6 * k, .7 * k, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#6f7682'; g.fillRect(sx - 1 * k, sy - 3.8 * k, 2 * k, 3.2 * k); g.fillStyle = '#2b5d9b'; g.fillRect(sx - 1 * k, sy - 2.6 * k, 2 * k, 1 * k);
        g.fillStyle = '#e8c9a0'; g.beginPath(); g.arc(sx, sy - 4.6 * k, .85 * k, 0, 7); g.fill(); g.fillStyle = '#8a8f99'; g.beginPath(); g.arc(sx, sy - 4.9 * k, .9 * k, Math.PI, 0); g.fill();
        g.strokeStyle = '#5a4a3a'; g.lineWidth = .35 * k; g.beginPath(); g.moveTo(sx + 1.3 * k, sy); g.lineTo(sx + 1.3 * k, sy - 8 * k); g.stroke();
        g.fillStyle = '#c9c1ae'; g.beginPath(); g.moveTo(sx + 1.3 * k, sy - 9.2 * k); g.lineTo(sx + 1.8 * k, sy - 8 * k); g.lineTo(sx + .8 * k, sy - 8 * k); g.closePath(); g.fill(); }
    // birds now and then
    const bt = (now / 22000) % 1; if (bt < .45) { const x0 = W * (bt / .45) * 1.2 - W * .1, y0 = H * .22; g.strokeStyle = 'rgba(30,30,30,.55)'; g.lineWidth = 1;
        for (const [dx, dy] of [[0, 0], [-10, 6], [-18, -4], [-26, 10]]) { const f = Math.sin(now / 120 + dx) * 2; g.beginPath(); g.moveTo(x0 + dx - 4, y0 + dy - f); g.lineTo(x0 + dx, y0 + dy + 1); g.lineTo(x0 + dx + 4, y0 + dy - f); g.stroke(); } }
    if (night > 0) {                                                        // dusk and night: darker, torches glow at the gate, the keep, the square and along the main street
        g.fillStyle = 'rgba(12,20,48,' + (.5 * night) + ')'; g.fillRect(0, 0, W, H);
        g.save(); g.globalCompositeOperation = 'lighter';
        const torches = [[CC - 12, CITY_WALL.b + 2, 14], [CC + 12, CITY_WALL.b + 2, 14], [CC - 30, CC + 30, 20], [CC + 30, CC + 30, 20], [CC, 371, 12]];
        for (const y of [418, 450, 482]) torches.push([310, y, 13.5], [330, y, 13.5]);                       // die Laternen an der Hauptstraße
        for (const [x, y] of [[244, 244], [396, 244], [244, 396], [396, 396]]) torches.push([x, y, 6]);
        for (const [x, y, z] of torches) { const [tx, ty] = toS(x, y, z), fl = .85 + .15 * Math.sin(now / 90 + x * 3.1) * Math.sin(now / 130 + y), r = 16 * Z * fl;
            const tg = g.createRadialGradient(tx, ty, 0, tx, ty, r); tg.addColorStop(0, 'rgba(255,190,90,' + (.55 * night) + ')'); tg.addColorStop(1, 'rgba(255,140,40,0)');
            g.fillStyle = tg; g.beginPath(); g.arc(tx, ty, r, 0, 7); g.fill();
            g.fillStyle = 'rgba(255,230,160,' + (.9 * night) + ')'; g.beginPath(); g.arc(tx, ty - Z * .6, Math.max(1, Z * .7), 0, 7); g.fill(); }
        g.restore();
    }
    // warm afternoon light from the top left, a soft vignette around the edges
    if (night < 1) { const nq = Math.round(night * 50) / 50, lk = [W, H, dpr2, nq].join(',');   // (both lie ready in one picture: two full-screen gradients cost more than one picture)
      if (CITY_LAGEN.lichtKey !== lk) { cityLage('licht', W, H, dpr2, gg => {
          const lg = gg.createLinearGradient(0, 0, W, H); lg.addColorStop(0, 'rgba(255,214,150,' + (.13 * (1 - nq)) + ')'); lg.addColorStop(.55, 'rgba(255,214,150,0)'); lg.addColorStop(1, 'rgba(40,60,90,.12)');
          gg.fillStyle = lg; gg.fillRect(0, 0, W, H);
          const vg = gg.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .45, W / 2, H / 2, Math.hypot(W, H) * .62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,16,8,.38)');
          gg.fillStyle = vg; gg.fillRect(0, 0, W, H); }); CITY_LAGEN.lichtKey = lk; }
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(CITY_LAGEN.licht, 0, 0); g.setTransform(dpr2, 0, 0, dpr2, 0, 0); }
    // name plates last
    const rund = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
    for (const { it, sx, sy, building, ghost } of plates) {
        if (ghost && !building && Z >= .8) {                                 // leerer Platz: ein schwebendes Zeichen – „+“ = hier bauen, Schloss = braucht eine höhere Burg
            const zu = !!(AUF && AUF.BAU_AB_BURG[it.id] > AUF.burgStufe('player')), r = Math.max(9, Math.min(14, 5.5 * Z));
            const [bx, by0] = toS(it.x, it.y, 34), by = by0 + Math.sin(now / 430 + it.x) * 1.8;
            g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(bx + 1.5, by + r + 2, r * .8, r * .3, 0, 0, 7); g.fill();
            const bg = g.createLinearGradient(0, by - r, 0, by + r); bg.addColorStop(0, zu ? '#5d5a55' : '#ffe08a'); bg.addColorStop(1, zu ? '#2e2c29' : '#c98f22');
            g.fillStyle = bg; g.strokeStyle = zu ? 'rgba(200,190,170,.7)' : '#fff1c4'; g.lineWidth = 1.5; g.beginPath(); g.arc(bx, by, r, 0, 7); g.fill(); g.stroke();
            drawGlyph(g, zu ? 'lock' : 'plus', bx, by, r * 1.25, zu ? '#e6dccb' : '#4a2c08');
        }
        if (Z < .8 && !building) {                                           // weit weg: nur die Stufe
            if (!it.lvl) continue; const r2 = 7.5, [bx, by] = [sx, sy + 4 * Z + r2]; g.font = '800 10px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillStyle = it.keep ? '#c98f22' : '#2f6fb8'; g.strokeStyle = 'rgba(255,236,190,.9)'; g.lineWidth = 1.2; g.beginPath(); g.arc(bx, by, r2, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.fillText(String(it.lvl), bx, by + .5); continue; }
        const wnd = it.id === 'hospital' ? c.wounded : 0, name = it.name + (wnd ? ' · ' + fmtCompact(wnd) + ' verw.' : ''), lv = it.lvl ? String(it.lvl) : '';
        const fs = Math.max(9.5, Math.min(12.5, 4.6 * Z)), h2 = fs + 7; g.font = '700 ' + fs + 'px Inter, system-ui, sans-serif';
        const tw = g.measureText(name).width, lw = lv ? Math.max(h2 + 2, g.measureText(lv).width + 12) : 0, W2 = tw + 16 + (lv ? lw - 4 : 0), x0 = sx - W2 / 2, py = sy + (it.keep ? 12 : 7) * Z;
        g.fillStyle = ghost ? 'rgba(18,16,12,.58)' : 'rgba(18,16,12,.84)'; g.strokeStyle = building ? '#ffd98a' : ghost ? 'rgba(228,200,134,.35)' : 'rgba(228,200,134,.7)'; g.lineWidth = 1;
        rund(x0, py, W2, h2, h2 / 2); g.fill(); g.stroke();
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (lv) { const lg2 = g.createLinearGradient(0, py, 0, py + h2); lg2.addColorStop(0, it.keep ? '#e7b84a' : '#4f8ad0'); lg2.addColorStop(1, it.keep ? '#9a6a16' : '#2a5794');   // die Stufe als Abzeichen
            g.fillStyle = lg2; g.strokeStyle = 'rgba(255,236,190,.85)'; rund(x0, py, lw, h2, h2 / 2); g.fill(); g.stroke();
            g.fillStyle = '#fff'; g.fillText(lv, x0 + lw / 2, py + h2 / 2 + .5); }
        g.fillStyle = ghost ? '#d6cab0' : '#f6ead0'; g.fillText(name, lv ? x0 + lw + (W2 - lw) / 2 - 2 : sx, py + h2 / 2 + .5);
        const fs8 = h2 - 7;
        if (building) { const b2 = cityBuildOf(c, it.id === '_keep' ? 'keep' : it.id), tl = fmtClock((b2.endsAt - Date.now()) / 1000); g.font = '700 ' + (fs8 - 1) + 'px Inter, system-ui, sans-serif';
            const w2 = g.measureText(tl).width + 26, yy = py + h2 + 3; g.fillStyle = 'rgba(20,6,5,.92)'; g.strokeStyle = 'rgba(255,110,80,.9)';
            g.beginPath(); g.roundRect ? g.roundRect(sx - w2 / 2, yy, w2, fs + 6, 4) : g.rect(sx - w2 / 2, yy, w2, fs + 6); g.fill(); g.stroke();
            drawGlyph(g, 'hourglass', sx - w2 / 2 + 10, yy + (fs + 6) / 2, fs - 1, '#ffb3a0'); g.fillStyle = '#ffe2d8'; g.fillText(tl, sx + 6, yy + (fs + 6) / 2 + .5); }
    }
    cityRaf = requestAnimationFrame(cityFrame);
}

// ===== LEVEL-UP MODAL =====
var levelUpShown = null;            // { from, to, coins, troops, gems, points } currently on screen / queued
var levelUpTimer = null;
function levelRewardText(level) {
    const g = levelRewardGems(level);
    return '<b>' + fmtCompact(levelRewardCoins(level)) + '</b> Münzen · <b>' + fmtCompact(levelRewardTroops(level)) + '</b> Truppen' +
        (g ? ' · <b>' + g + '</b> Gems' : '');
}
function queueLevelUpModal(from, to, r) {
    if (levelUpShown) {                 // several level-ups before the player taps: merge into one window
        levelUpShown.to = to;
        for (const k of ['coins', 'troops', 'gems', 'points']) levelUpShown[k] += r[k];
    } else {
        levelUpShown = { from, to, ...r };
    }
    clearTimeout(levelUpTimer);
    levelUpTimer = setTimeout(renderLevelUpModal, 1600);  // after the battle flash / "Sieg!" has played
}
function renderLevelUpModal() {
    const s = levelUpShown; if (!s) return;
    if (!document.getElementById('dailyModal').hidden || !document.getElementById('rewardModal').hidden || bossRewardPending || (typeof mapBattles !== 'undefined' && mapBattles.length)) { levelUpTimer = setTimeout(renderLevelUpModal, 500); return; }   // one window at a time
    const m = document.getElementById('levelUpModal');
    document.getElementById('levelUpLevel').textContent = s.to;
    document.getElementById('levelUpTitle').textContent = 'Stufe ' + s.to;
    const n = s.to - s.from;
    document.getElementById('levelUpSub').textContent = n > 1 ? 'Stufe ' + s.from + ' → ' + s.to + ' · ' + n + ' Aufstiege' : 'Du bist aufgestiegen!';
    const row = (ic, label, val) => '<li>' + icon(ic, 'ico-' + ic) + '<span>' + label + '</span><b>+' + val + '</b></li>';
    let html = '';
    if (s.coins) html += row('coin', 'Münzen', fmtNum(s.coins));
    if (s.troops) html += row('troops', 'Truppen (Heimat)', fmtNum(s.troops));
    if (s.gems) html += row('gem', 'Gems', fmtNum(s.gems));
    html += row('points', s.points === 1 ? 'Skillpunkt' : 'Skillpunkte', fmtNum(s.points));
    const list = document.getElementById('levelUpRewards');
    list.innerHTML = html;
    [...list.children].forEach((li, i) => { li.style.animationDelay = (180 + i * 110) + 'ms'; });
    document.getElementById('levelUpNext').innerHTML = 'Nächste Stufe ' + (s.to + 1) + ': ' + levelRewardText(s.to + 1);
    if (m.hidden) { m.hidden = false; dismissTutorialHint && dismissTutorialHint(); }
    updateHud();
}
function closeLevelUpModal() {
    const m = document.getElementById('levelUpModal');
    if (m.hidden) return false;
    m.hidden = true;
    levelUpShown = null;
    updateHud();
    if (isPanelOpen(profilePopup)) renderProfile();
    return true;
}
document.getElementById('levelUpBtn').addEventListener('click', closeLevelUpModal);
document.getElementById('levelUpModal').addEventListener('click', e => { if (e.target.id === 'levelUpModal') closeLevelUpModal(); });
