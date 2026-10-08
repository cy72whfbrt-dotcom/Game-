// Teil 08a-stadt-bauen.js: Stadt: Gebäude bauen und ausbauen, Stadt betreten und verlassen
// ===== CAPITAL / CITY (step 1: buildings can be built and upgraded, effects come later) =====
var CITY_BUILDINGS = [
    { id: 'academy',  name: 'Labor',         icon: 'flask',   x: 215, y: 430, roof: '#2f4f86', dome: true,
      desc: 'Hier wird alles geforscht: Wirtschaft (auch Tempel), Militär und Erkundung (auch Späher) – eine Forschung gleichzeitig, jede kostet Rohstoffe und Zeit. Jede Stufe erlaubt weitere Forschung und lässt deine Truppen 2 % schneller laufen.' },
    { id: 'forge',    name: 'Schmiede',      icon: 'weapon',  x: 785, y: 430, roof: '#4a4a52', chimney: true,
      desc: 'Wähle oben die Art und dann ein Ausrüstungsteil aus deinem Besitz, um es mit Sternen zu verbessern: jeder Stern +20 % Wirkung des Teils. Jede Stufe erlaubt einen Stern mehr.' },
    { id: 'hospital', name: 'Krankenhaus',   icon: 'plus',    x: 215, y: 670, roof: '#e8e2d2', cross: true,
      desc: 'Von deinen Gefallenen (Angriff oder Verteidigung) kommen Verwundete hierher statt zu sterben (5 % pro Stufe, bis 60 % – mit Forschung mehr). Heile sie gegen Münzen – sie gehen in die Hauptstadt.' },
    { id: 'wall',     name: 'Mauer',         icon: 'defense', x: 715, y: 815, roof: '#6b6456', gate: true,
      desc: 'Stärkt die Verteidigung aller deiner Basen: +2 % pro Stufe (Stufe 25: +50 %). Beispiel: 10.000 Verteidigung und Mauer Stufe 5 ergeben 11.000.' },
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
// Fällt eine Basis (Turm): der Sieger bekommt KEINE Beute (Alexander 4.10. abends). Die Hauptstadt fällt nie: gewinnt der
// Angreifer, bekommt er von JEDEM Rohstoff einen kleinen Teil über dem Schutz (HAUPT_BEUTE) und die Hauptstadt brennt (nur zu
// sehen). Gewinnt der Verteidiger, bekommt der Angreifer nichts. Rohstoffe gibt es nur aus der Hauptstadt.
const HAUPT_BEUTE = .1;                              // Hauptstadt: 10 % von jedem Rohstoff über dem Schutz – klein, damit man oft angreifen muss
const schutzVon = who => AUF ? AUF.burgSchutz(who) : 0;   // Gold – Holz/Stein/Eisen × ROH_JE_MUENZE (6.10.: Rohstoffe und Münzen in RoK-Größe)
function plunderOf(who, capital) {                  // { loot (Gold), roh: {h, s, e} (nur Hauptstadt), safe }
    const have = Math.max(0, who === 'player' ? coins : botCoins[who] || 0), safe = schutzVon(who);
    if (capital) { const r = AUF ? AUF.rohVon(who) : null, roh = { h: 0, s: 0, e: 0 };
        if (r) for (const x of ['h', 's', 'e']) roh[x] = Math.floor(Math.max(0, (r[x] || 0) - safe * ROH_JE_MUENZE) * HAUPT_BEUTE);
        return { loot: Math.floor(Math.max(0, have - safe) * HAUPT_BEUTE), roh, safe }; }   // (safe: der Burg-Schutz für Gold – so steht er im Bericht, je Rohstoff × ROH_JE_MUENZE)
    return { loot: 0, safe: 0 };   // Beute (Gold, Holz, Stein, Eisen) gibt es NUR an der Hauptstadt (Alexander 4.10.)
}
function plunderMove(from, to, loot, roh) {         // Gold (und bei der Hauptstadt Holz, Stein, Eisen) wechselt den Besitzer
    if (loot > 0) { if (from === 'player') coins -= loot; else botCoins[from] = Math.max(0, (botCoins[from] || 0) - loot);
        if (to === 'player') coins += loot; else if (to) botCoins[to] = (botCoins[to] || 0) + loot; }
    if (roh && AUF && (roh.h || roh.s || roh.e)) { AUF.rohDazu(from, { h: -roh.h, s: -roh.s, e: -roh.e }); if (to) AUF.rohDazu(to, roh); }
}
const beuteText = p => p ? [p.loot ? fmtCompact(p.loot) + ' Münzen' : '', ...(p.roh ? [['h', 'Holz'], ['s', 'Stein'], ['e', 'Eisen']].filter(([x]) => p.roh[x] > 0).map(([x, n]) => fmtCompact(p.roh[x]) + ' ' + n) : [])].filter(Boolean).join(', ') : '';
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
// Burg-Tempo (Alexander 7.10., rokzahlen): Bauzeit der Burg je Schritt L → L + 1 in Sekunden. Anfang schnell (1 → 2: 10 s,
// Burg 10 am ersten Tag), ab 11 steil: Saison 1 ≈ Burg 16–18 (sehr aktiv), Burg 25 nach etwa 4 Saisons
// (Funktionen statt Konstanten: loadCity kürzt Bauten evtl. schon beim Laden früherer Teile)
function burgZeitTab(L) {
    const T = 86400, Z = [10, 60, 300, 900, 1800, 3600, 7200, 14400, 28800, 43200,   // 1 → 2 … 10 → 11
        T, 1.5 * T, 2 * T, 4 * T, 6 * T, 8 * T, 11 * T, 14 * T, 18 * T,                 // 11 → 12 … 19 → 20
        22 * T, 27 * T, 32 * T, 38 * T, 45 * T];                                         // 20 → 21 … 24 → 25
    return Z[Math.max(1, Math.min(Z.length, L | 0 || 1)) - 1];
}
// Grundwert der Burg-Kosten (Holz; Stein 0,8 ×, Eisen 0,5 ×, Münzen 2 × in wirtM): 1.000 · 1,75 je Stufe bis 10, danach × 1,6 – Burg 25 ≈ 110 Mio. Holz
function burgBasis(L) { return 1000 * Math.pow(1.75, Math.min(Math.max(1, L), 10) - 1) * Math.pow(1.6, Math.max(0, L - 10)); }
function stadtFaktor(L) { return L >= 25 ? Math.pow(1.15, L - 24) : 1; }   // (nur das Krankenhaus geht über 25: Burg 24 + 15 % je Stufe)
function cityCost(id, level) {                    // coins to go from `level` to level + 1 (Münzen: wirtM)
    if (id === 'keep') return niceRound(wirtM(2 * burgBasis(level)));   // Burg-Stufe (dazu Rohstoffe: aufbau.js)
    return niceRound(wirtM(.6 * burgBasis(Math.min(24, level)) * stadtFaktor(level)));   // Gebäude: 30 % der Burg derselben Stufe
}
function cityTimeRoh(id, level) {                 // build time for level -> level + 1 – auch der Weltrechner prüft damit (Hauptbuch)
    // Gebäude: 15 % der Burg-Zeit derselben Stufe (mind. 10 s; Krankenhaus über 25: + 10 % je Stufe), nie mehr als 7 Tage
    return id === 'keep' ? burgZeitTab(level) : Math.min(7 * 86400, Math.max(10, .15 * burgZeitTab(Math.min(24, level)) * (level >= 25 ? Math.pow(1.1, level - 24) : 1)));
}
function cityTimeSec(id, level) {
    return Math.round(cityTimeRoh(id, level));
}
function cityClampBuild(b, now) {                 // a build started under the old, far too long times ends by the new rule at the latest
    if (b && b.endsAt - (b.startedAt || now) > cityTimeSec(b.id, b.to - 1) * 1000) b.endsAt = Math.min(b.endsAt, (b.startedAt || now) + cityTimeSec(b.id, b.to - 1) * 1000);
}
function fmtDuration(sec) {                       // Bauzeiten kurz: Einheiten, die 0 sind, fallen weg (1 T statt 1 T 0 h 0 m 0 s)
    sec = Math.max(0, Math.ceil(sec));
    const t = [[Math.floor(sec / 86400), 'T'], [Math.floor(sec % 86400 / 3600), 'h'], [Math.floor(sec % 3600 / 60), 'm'], [sec % 60, 's']].filter(x => x[0]);
    return t.length ? t.map(x => x[0] + ' ' + x[1]).join(' ') : '0 s';
}
function cityBlocker(id) {                        // why this building can't be upgraded right now (or null)
    const c = loadCity(), lvl = id === 'keep' ? c.levels.keep || 1 : c.levels[id];
    if (lvl >= (id === 'keep' ? 25 : cityMaxLevel(id))) return 'Maximale Stufe erreicht.';
    if (cityBuildOf(c, id)) return 'Wird gerade gebaut.';
    if (AUF && id !== 'keep') { const B = AUF.burgStufe('player');                 // Paket D: höchstens bis zur Burg-Stufe, neue Gebäude erst ab einer Burg-Stufe
        if (!lvl && AUF.BAU_AB_BURG[id] > B) return 'Braucht Burg-Stufe ' + AUF.BAU_AB_BURG[id] + ' (jetzt ' + B + ').';
        if (lvl >= AUF.stadtCap('player', id)) return 'Erst die Burg aufwerten – Gebäude gehen höchstens bis zur Burg-Stufe (' + B + ').'; }
    if (c.builds.length >= citySlots(c)) return c.builder2 ? 'Beide Bauarbeiter sind beschäftigt.' : 'Der Bauarbeiter ist beschäftigt (' + cityDef(c.builds[0].id).name + '). Ein zweiter kostet ' + CITY_BUILDER2_GEMS + ' Edelsteine.';
    return null;
}
function cityStartBuild(id) {
    const c = loadCity(), lvl = id === 'keep' ? c.levels.keep || 1 : c.levels[id];
    if (cityBlocker(id)) return;
    const k = AUF ? AUF.stadtKosten(id, lvl) : { c: cityCost(id, lvl) };          // Münzen + Holz, Stein, Eisen
    if (AUF ? !AUF.zahlen('player', k) : coins < k.c) { flashHint('Nicht genug Münzen oder Rohstoffe für ' + cityDef(id).name + ' Stufe ' + (lvl + 1) + '.', 2500); return; }
    if (!AUF) coins -= k.c;
    c.builds.push({ id, to: lvl + 1, startedAt: Date.now(), endsAt: Date.now() + cityTimeSec(id, lvl) * 1000 });
    saveCity(); saveGame(); updateHud(); sfx('upgrade'); questProgress('bau', 1);   // (Tagesaufgabe + Saison-Pass)
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
    saveCity(); evPunkte('bau', 'player', 2 + to);   // Wochen-Event „Bauherr“ (wie eine Basis; beim Weltrechner zählt es das Hauptbuch)
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
cloudFx.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:19;pointer-events:none;display:none';
document.body.appendChild(cloudFx);
const CLOUD_PUFFS = (() => { const r = mulberry32(31), out = []; for (let i = 0; i < 22; i++) { const a = r() * Math.PI * 2; out.push({ a, d: .15 + r() * .55, s: .28 + r() * .32, sh: .93 + r() * .07 }); } return out; })();
let cloudAnim = null, cityMapReturn = null, cityBusy = false, cloudCover = 0;   // cloudCover: wie dicht die Wolken gerade sind (ab .95 alles weiß – dahinter muss nichts gezeichnet werden)
// Die Wolken sind weiche Verläufe ohne Kanten: sie werden in halber Auflösung gemalt (CLOUD_RES Bildpunkte pro Bildschirm-
// Punkt) und vom Browser hochgezogen – sieht gleich aus, kostet am Handy aber nur einen Bruchteil (vorher ~22 bildschirmgroße
// Verläufe in voller Auflösung pro Bild, und dahinter liefen Stadt und Karte weiter).
const CLOUD_RES = .5;
function cloudsRun(dur, c0, c1, then) {                                   // cover goes c0 → c1 (0 = clear sky, 1 = inside the cloud)
    cloudAnim = { t0: performance.now(), dur, c0, c1, then }; cloudFx.style.display = 'block';
    const step = now => {
        const a = cloudAnim; if (!a) return;
        const q = Math.max(0, Math.min(1, (now - a.t0) / a.dur)), e = q < .5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2, c = a.c0 + (a.c1 - a.c0) * e;   // (das erste Bild kann etwas vor t0 liegen)
        cloudCover = c;
        cloudFx.style.opacity = Math.min(.3, c * .86);                       // ein leichter, warmer Schleier (höchstens .3, auch wo Wolken übereinander liegen) – kein Milchglas, das wie „lädt“ wirkt
        const z = cityView.hidden ? 19 : 51; if (cloudFx.style.zIndex !== String(z)) cloudFx.style.zIndex = z;   // nie über den Leisten: unter HUD/Leiste der Karte (20/25), in der Stadt unter ihren (52)
        const dpr3 = CLOUD_RES, W = window.innerWidth, H = window.innerHeight;
        if (cloudFx.width !== Math.round(W * dpr3) || cloudFx.height !== Math.round(H * dpr3)) { cloudFx.width = Math.round(W * dpr3); cloudFx.height = Math.round(H * dpr3); }
        const g = cloudFx.getContext('2d'); g.setTransform(dpr3, 0, 0, dpr3, 0, 0); g.clearRect(0, 0, W, H);
        const R = Math.hypot(W, H);
        for (const p of CLOUD_PUFFS) {                                     // puffs drift in from the edges as the cover grows, part again as it falls
            const dist = (p.d + (1 - c) * .9) * R * .6, x = W / 2 + Math.cos(p.a) * dist, y = H / 2 + Math.sin(p.a) * dist * .75, rad = p.s * R * (.55 + c * .5);
            const gr = g.createRadialGradient(x - rad * .2, y - rad * .25, rad * .05, x, y, rad);
            gr.addColorStop(0, 'rgb(243,230,196)'); gr.addColorStop(.55, 'rgba(' + Math.round(243 * p.sh) + ',' + Math.round(230 * p.sh) + ',' + Math.round(196 * p.sh) + ',.85)'); gr.addColorStop(1, 'rgba(243,230,196,0)');
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
    updateCityBuilder(); cityWischZeigen();
    cancelAnimationFrame(cityRaf); cityRaf = requestAnimationFrame(cityFrame);
}
// Eintauchen wie bei RoK: die Kamera fliegt bis kurz vor die Hauptstadt (CITY_NAH × größter Zoom, die Basis noch klein),
// die Karte taucht noch ein Stück weiter (nur ein CSS-Zoom des Karten-Bilds, höchstens CITY_TAUCH – sonst wird das flache
// Basis-Symbol riesig und unscharf) und wird weich; schon bei ~40 % blendet die Stadt darüber und setzt sich aus der Nähe,
// dünne Wolken am Rand decken die Kanten. Beim Verlassen umgekehrt: die Stadt rückt näher und blendet aus, die Karte kommt
// aus der Nähe zurück auf ihre Höhe.
const CITY_TAUCH = 1.8, CITY_NAH = .4, CITY_TAUCH_MS = 700, CITY_BLENDE_AB = 280, CITY_BLENDE_MS = 320;
function karteTauchen(von, bis, ms, isl) {
    if (!canvas.animate || !isl) return null;
    canvas.style.transformOrigin = Math.round(toSX(isl.x)) + 'px ' + Math.round(toSY(isl.y)) + 'px';
    const weich = s => s > 1 ? 'blur(2px)' : 'blur(0px)';
    return canvas.animate([{ transform: 'scale(' + von + ')', filter: weich(von) }, { transform: 'scale(' + bis + ')', filter: weich(bis) }],
        { duration: ms, easing: von < bis ? 'cubic-bezier(.45,0,.75,.6)' : 'cubic-bezier(.15,.6,.35,1)', fill: 'forwards' });
}
function stadtBlende(von, bis, dann) {                                       // die Stadt über der Karte ein-/ausblenden
    if (!cityView.animate) { if (dann) dann(); return; }
    const a = cityView.animate([{ opacity: von }, { opacity: bis }], { duration: CITY_BLENDE_MS, easing: 'ease-out', fill: 'forwards' });
    a.onfinish = () => { a.cancel(); if (dann) dann(); };
}
function openCity(dann) {                                                   // dann: läuft, sobald die Stadt da ist (z. B. die Burg öffnen) – nicht nach fester Zeit
    if (typeof dann !== 'function') dann = null;
    if (!cityView.hidden && !cityBusy) { if (dann) dann(); return; }
    if (cityBusy || !cityView.hidden) return;
    closeAllPopups();
    const home = islandById[playerIslandId];
    cityMapReturn = { zoom: mapState.zoom, x: (viewW / 2 - mapState.offsetX) / mapState.zoom, y: (viewH / 2 - mapState.offsetY) / mapState.zoom };   // where the map was, to go back there
    if (!home) { cityShow(); if (dann) dann(); return; }
    cityBusy = true;
    flyTo(home.x, home.y, { zoom: maxZoom * CITY_NAH, ms: 650 });           // 1) the map flies to your capital …
    setTimeout(() => { const tauch = karteTauchen(1, CITY_TAUCH, CITY_TAUCH_MS, home);   // 2) … dives on a little, getting soft …
        let offen = 2; const fertig = () => { if (--offen === 0) cityBusy = false; };   // frei erst, wenn die Wolken weg sind UND die Karte nicht mehr eintaucht
        cloudsRun(240, 0, .35, () => cloudsRun(300, .35, 0, fertig));      // (nur Wolken am Rand, nie ganz weiß – ab dem Tipp nach 1,1 s ganz weg)
        setTimeout(() => { cityShow(); stadtBlende(0, 1); if (dann) dann();    // 3) … and the town fades in, settling from close by
            if (cityCam) cityCam.anim = { from: 1.18, t0: performance.now(), dur: 1100 }; else cityPendingAnim = true; }, CITY_BLENDE_AB);
        setTimeout(() => { if (tauch) tauch.cancel(); fertig(); }, CITY_TAUCH_MS); }, 560);
}
let cityPendingAnim = false;
function closeCity() {
    if (cityView.hidden) return false;
    if (cityBusy) return true;
    cityBusy = true; cityOpenId = null; cityRingZu(); document.getElementById('citySheet').hidden = true;
    const home = islandById[playerIslandId], back = cityMapReturn || { zoom: mapState.zoom, x: (viewW / 2 - mapState.offsetX) / mapState.zoom, y: (viewH / 2 - mapState.offsetY) / mapState.zoom };
    cityMapReturn = null;
    if (home) flyTo(home.x, home.y, { zoom: maxZoom * CITY_NAH, instant: true });   // unter der Stadt liegt die Karte schon über der Hauptstadt
    if (cityCam) cityCam.anim = { from: 1, to: 1.18, t0: performance.now(), dur: 650 };   // the town draws close as it fades …
    const auf = karteTauchen(CITY_TAUCH, 1, 650, home);                      // … the map comes back up from close by …
    cloudsRun(300, 0, .35, () => cloudsRun(500, .35, 0));
    let offen = 2; const fertig = () => { if (--offen === 0) cityBusy = false; };   // frei erst, wenn die Stadt weg ist UND die Karte zurückfliegt (unter Last kann das Ausblenden länger dauern)
    setTimeout(() => stadtBlende(1, 0, () => { cityView.hidden = true; stadtLeiste(false); cancelAnimationFrame(cityRaf); requestRender(); fertig(); }), 120);
    setTimeout(() => { if (auf) auf.cancel();
        flyTo(back.x, back.y, { zoom: back.zoom, ms: 900 });                // … and opens up again where it was
        fertig(); }, 650);
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
    stadtKopf();   // (zwei Zeilen Bauarbeiter: der Hinweis rückt mit)
}
function cityBuyBuilder2() {
    const c = loadCity(); if (c.builder2) return;
    if (gems < CITY_BUILDER2_GEMS) { flashHint('Zu wenig Edelsteine – der zweite Bauarbeiter kostet ' + CITY_BUILDER2_GEMS + ' Edelsteine.', 2500); return; }
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
    setBtnLabel(document.getElementById('citySpeedBtn'), (gemsArmed('speed:' + cityBauId(cityOpenId)) ? 'Wirklich? ' : 'Fertig für ') + citySpeedCost(b.id));   // (das Edelstein-Symbol steht schon vorn im Knopf)
    document.getElementById('citySpeedBtn').disabled = gems < citySpeedCost(b.id);
}
// Rohstoff-Liste oben (aufbau.js): ein Tipp woanders hin (z. B. ein Fenster öffnen) schließt sie – sie bleibt nicht über dem Fenster stehen
document.addEventListener('click', e => { const d = document.getElementById('rohDrop');
    if (d && !d.hidden && typeof rohUmschalten === 'function' && !e.target.closest('#hudRoh, #rohDrop')) rohUmschalten(false); }, true);
