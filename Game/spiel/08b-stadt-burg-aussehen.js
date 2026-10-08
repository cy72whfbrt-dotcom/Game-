// Teil 08b-stadt-burg-aussehen.js: Burg (Ausbau, Friedensschild) und Fenster Aussehen
// ===== DEINE BURG (tap the castle in the city): upgrade it, switch on a Friedensschild =====
function shieldStock() { let v; try { v = JSON.parse(store.get('openWaterShieldStock')); } catch (e) {} return Object.assign({ 2: 0, 8: 0, 24: 0 }, v || {}); }
function renderKeepSheet() { AUF.renderKeep(); const f = cityFehlt('keep'); if (f) setBtnLabel(document.getElementById('cityUpgradeBtn'), f); cityWarteSetzen(f && 'keep'); }   // die Burg-Stufe (aufbau.js)
function cityFehltListe(id) {                      // was zum Bezahlen fehlt: [[Menge, Name], …]
    if (!AUF || cityBlocker(id)) return [];
    const c = loadCity(), k = AUF.stadtKosten(id, id === 'keep' ? AUF.burgStufe('player') : c.levels[id] || 0), r = AUF.rohVon('player') || {};
    return (k.c > coins ? [[k.c - coins, 'Münzen']] : []).concat(['h', 's', 'e'].filter(x => k[x] > (r[x] || 0)).map(x => [k[x] - (r[x] || 0), AUF.ROH_DEF[x].name]));
}
function cityFehlt(id) {                           // fehlt nur etwas zum Bezahlen: der Knopf sagt, was („Fehlt: 2.000 Holz“, mehreres: „Fehlt: Holz, Stein, Eisen“)
    const f = cityFehltListe(id);
    return f.length > 1 ? 'Fehlt: ' + f.map(x => x[1]).join(', ') : f.length ? 'Fehlt: ' + fmtCompact(Math.ceil(f[0][0])) + ' ' + f[0][1] : '';
}
function cityWarte(id) {                           // wann es reicht, beim jetzigen Ertrag pro Stunde („in ~7 Min.“; mehreres: das, was am längsten dauert) – nur Anzeige
    const f = id ? cityFehltListe(id) : []; if (!f.length) return '';
    const rs = AUF.rohStunde('player'), je = { Münzen: proStunde(totalCoinProductionPerTick()) };
    for (const x of ['h', 's', 'e']) je[AUF.ROH_DEF[x].name] = rs[x];
    const sec = f.reduce((m, x) => Math.max(m, je[x[1]] > 0 ? x[0] / je[x[1]] * 3600 : Infinity), 0);
    if (!Number.isFinite(sec)) return '';           // (kein Ertrag: keine Zeit)
    return 'in ~' + (sec < 3600 ? Math.max(1, Math.ceil(sec / 60)) + ' Min.' : sec < 172800 ? Math.ceil(sec / 3600) + ' Std.' : Math.ceil(sec / 86400) + ' Tagen');
}
function cityWarteSetzen(id) { setText(document.getElementById('cityUpWarte'), cityWarte(id)); }   // die kleine Zeile unter „Fehlt: …“
// ===== AUSSEHEN: Wappen und Rahmen (= Titel, 05a RAHMEN) – nichts zu kaufen (Basis- und Marsch-Skins gibt es nicht mehr, Alexander 7.10.) =====
var lkTab = 'frame';
function lkPrice(d) { return d.platz ? '<span class="lk-cost">' + icon('crown') + rahmenPlatzText(d) + '</span>' : ''; }   // woher ein Rahmen kommt
function lkCard(kind, d, prev, has, on, label) {     // one look: preview, name, and Angelegt / Anlegen / price
    return '<button type="button" class="skin-card lk-card' + (on ? ' on' : '') + (has ? '' : ' is-shop') + '" data-lk="' + kind + ':' + d.id + '">' + prev + (label === false ? '' : '<b>' + (label || d.name) + '</b>') +
        '<small>' + (on ? icon('check') + 'Angelegt' : has ? 'Anlegen' : lkPrice(d)) + '</small></button>';
}
function lkDef(kind, id) { return kind === 'frame' ? rahmenDef(id) : null; }
function lkHas(kind, id) { const d = lkDef(kind, id); return !!d && rahmenHat('player', d); }
function lkUse(kind, id) { look.frame = id; saveLook(); renderLook(); requestRender(); }   // anlegen, was du hast
function lkBuy(kind, id) {                            // Rahmen gibt es nicht zu kaufen (Alexander 6.10.): nur der Hinweis, woher
    const d = lkDef(kind, id); if (!d) return;
    if (lkHas(kind, id)) { lkUse(kind, id); return; }
    flashHint('„' + d.name + '“ ' + (d.platz ? 'bekommen am Saison-Ende die Spieler auf ' + rahmenPlatzText(d) + ' – bis zum nächsten Saison-Ende.' : 'gibt es nicht mehr – Rahmen gibt es am Saison-Ende und in der Mitte.'), 3500);
}
function renderLookTop() {                            // what you wear now + what you can pay with
    const el = document.getElementById('lkTop'); if (!el || document.getElementById('lookSheet').hidden) return;
    liveHtml(el, '<span class="frame-ring lk-me" data-frame="' + playerFrame() + '"><img alt="" src="' + crestDataUrl(48) + '"></span>' +
        '<span class="lk-me-t"><b>' + escapeHtml(profileName.value || 'Du') + '</b><small>' + escapeHtml(playerTitle()) + '</small></span>' +
        '<span class="lk-pay"><span class="pill pill--gem">' + icon('gem') + '<b>' + fmtHud(Math.floor(gems)) + '</b></span><span class="pill pill--throne">' + icon('crown') + '<b>' + fmtCompact(throneState.pts || 0) + '</b></span></span>');
}
function renderLookSheet(live) {                     // live = jede Sekunde aus liveTick: der Wappen-Editor bleibt, wie er ist
    const sh = document.getElementById('lookSheet'); if (!sh || sh.hidden) return;
    const top = sh.scrollTop; renderLookTop();
    if (live && lkTab === 'crest') return;
    for (const b of document.querySelectorAll('#lkTabs [data-lk-tab]')) { const on = b.dataset.lkTab === lkTab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    document.getElementById('crestPage').hidden = lkTab !== 'crest';
    const el = document.getElementById('lkPane'); el.hidden = lkTab === 'crest'; let h = '';
    if (lkTab === 'crest') { if (!live) renderCrestEditor(); }
    else if (lkTab === 'frame') {                     // Rahmen = Titel (Alexander 6.10.): deine Rahmen zum Anlegen, die Saison-Rahmen, der aus der Mitte
        const img = '<img alt="" src="' + crestDataUrl(36) + '">', an = rahmenDef(look.frame) && lkHas('frame', look.frame) ? look.frame : 'bronze', mt = titleOf('player'), rl = rulerOwner() === 'player';
        const ring = id => '<span class="frame-ring lk-frame" data-frame="' + id + '">' + img + '</span>', card = r => lkCard('frame', r, ring(r.id), lkHas('frame', r.id), r.id === an);
        const sz = RAHMEN.filter(r => r.platz), dein = RAHMEN.filter(r => !r.platz && lkHas('frame', r.id));
        h = '<div class="skin-grid lk-grid">' + dein.map(card).join('') + '</div>' +
            '<div id="lkTitel" class="keep-h">Saison-Rahmen</div><div class="skin-grid lk-grid">' + sz.map(card).join('') + '</div>' +
            '<div class="keep-h">Aus der Mitte</div><div class="lk-mid' + (rl ? ' is-ruler' : mt ? (mt.good ? ' is-good' : ' is-bad') : '') + '">' + ring(rl ? 'king' : mt ? (mt.good ? 'mgut' : 'mstraf') : 'bronze') + '<span><b>' + (rl ? 'Herrscher der Meere' : mt ? mt.name : 'Gerade keiner') + '</b><small>' +
                (rl ? 'Solange du den Mega-Tempel hältst · geht vor' : mt ? mt.desc + ' · geht vor, bis zum nächsten Herrscher' : 'Den Rahmen aus der Mitte vergibt der Herrscher – er kommt und geht.') + '</small></span></div>' +
            '<small class="keep-note">Titel und Rahmen sind eins: so sehen dich alle in Profil und Rangliste. Rahmen gibt es nicht zu kaufen – Saison-Rahmen bekommen die besten 10 am Saison-Ende (bis zum nächsten), dazu die aus der Mitte.</small>'; }
    if (!liveHtml(el, h) && live) return;                // live und nichts geändert: die Vorschau-Bilder bleiben stehen
    sh.scrollTop = top;
}
function openLookSheet(tab) {                         // tab 'title': Titel = Rahmen (Alexander 6.10.) – Reiter „Rahmen“, zu den Saison-Rahmen rollen
    lookMigrate(); if (tab) lkTab = tab === 'title' ? 'frame' : tab; const sh = document.getElementById('lookSheet'); sh.hidden = false; renderLookSheet(); sh.scrollTop = 0;
    const ti = tab === 'title' && document.getElementById('lkTitel'); if (ti) sh.scrollTop = ti.getBoundingClientRect().top - sh.getBoundingClientRect().top - document.getElementById('lkTabs').offsetHeight - 8;
}
function closeLookSheet() { document.getElementById('lookSheet').hidden = true; renderCrestCard(); if (cityOpenId === '_keep') renderKeepSheet(); }
document.getElementById('lookSheet').addEventListener('click', e => {
    if (e.target.closest('[data-lk-close]')) return closeLookSheet();
    const t = e.target.closest('[data-lk-tab]'); if (t) { lkTab = t.dataset.lkTab; renderLookSheet(); return; }
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
    if (id === 'heroes') return lvl ? ['Helden', 'profile'] : null;   // erst gebaut: vorher keine Reiter (nur „Bauen“)
    if (!lvl) return null;
    return { forge: ['Schmieden', 'weapon'], hospital: ['Heilen', 'plus'], market: ['Handeln', 'market'], embassy: ['Verstärkung', 'bund'], wall: ['Helden', 'defense'] }[id] || null;   // (Mauer: die Verteidigungs-Helden)
}
function cityBildSetzen(id, lvl) {                 // das Gebäude-Bild oben links im Fenster: sein Ausschnitt aus dem Stadtbild (noch nicht gebaut: ausgegraut)
    const el = document.getElementById('cityBIcon'), im = cityBild(), o = cityOrt(id === 'keep' ? '_keep' : id), key = id + ':' + (im ? 'bild' : 'leer');
    el.classList.toggle('is-zu', id !== 'keep' && !lvl);
    if (el.dataset.bild === key && el.firstChild && el.firstChild.tagName === 'CANVAS') return;
    el.dataset.bild = key; el._lh = undefined;
    const N = 192, cv = document.createElement('canvas'); cv.width = cv.height = N;
    if (im && o) { const a = Math.max(o.w, o.h), x = Math.max(0, Math.min(CITY_BILD_W - a, o.x - a / 2)), y = Math.max(0, Math.min(CITY_BILD_H - a, o.y - a / 2));
        const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, x, y, a, a, 0, 0, N, N); }
    el.replaceChildren(cv);
}
function anfZeile(ok, ic, txt, val, geh) {         // eine Voraussetzung: Zeichen, Text, (hast / brauchst), Haken oder Kreuz – geh [Fenster, Knopf]: fehlt ein Gebäude, springt der Knopf dorthin
    const [n, k] = Array.isArray(ic) ? ic : [ic], zu = geh && !ok;
    return '<div class="anf' + (ok ? ' is-ok' : ' is-bad') + (zu ? ' is-geh' : '') + '">' + icon(n, k) + '<span>' + txt + '</span>' + (val ? '<b>' + val + '</b>' : '') +
        (zu ? '<button type="button" class="btn btn--secondary btn--sm anf-geh" data-anf-geh="' + geh[0] + '">' + geh[1] + icon('send') + '</button>' : '<i>' + icon(ok ? 'check' : 'close') + '</i>') + '</div>';
}
function anfKosten(k) {                            // Münzen und Rohstoffe: hast / brauchst (beide gleich geschrieben: „998.912 / 1.900“, nie „998,9 Tsd. / 1.900“)
    if (!k) return ''; const r = AUF ? AUF.rohVon('player') || {} : {}, out = [];
    if (k.c) out.push(anfZeile(coins >= k.c, ['coin', 'icon--coin'], 'Münzen', fmtNum(Math.floor(coins)) + ' / ' + fmtNum(k.c)));
    if (AUF) for (const x of ['h', 's', 'e']) if (k[x]) out.push(anfZeile((r[x] || 0) >= k[x], [AUF.ROH_DEF[x].icon, 'roh-' + x], AUF.ROH_DEF[x].name, fmtNum(Math.floor(r[x] || 0)) + ' / ' + fmtNum(k[x])));
    return out.join('');
}
function cityAnfHtml(id, lvl, k) {                 // Voraussetzungen für die nächste Stufe (Burg, Bauarbeiter, Münzen, Rohstoffe)
    const c = loadCity(), rows = [];
    if (AUF && id !== 'keep') { const B = AUF.burgStufe('player'), need = !lvl ? AUF.BAU_AB_BURG[id] || 0 : B >= AUF.BURG_MAX ? 0 : lvl + 1;
        if (need > 1) rows.push(anfZeile(B >= need, 'castle', 'Burg Stufe ' + need, B < need ? 'jetzt ' + B : '', ['_keep', 'Zur Burg'])); }
    const frei = c.builds.length < citySlots(c);
    rows.push(anfZeile(frei, 'upgrade', frei ? 'Bauarbeiter frei' : 'Bauarbeiter beschäftigt (' + cityDef(c.builds[0].id).name + ')'));
    return '<div class="anf-h">Voraussetzungen</div><div class="anf-list">' + rows.join('') + anfKosten(k) + '</div>';
}
function cityBurgFehlt(id, lvl) {                 // reicht die Burg-Stufe nicht: der Knopf sagt es („Burg Stufe 5 nötig“) statt nur grau zu sein
    if (!AUF || id === 'keep') return ''; const B = AUF.burgStufe('player'), need = !lvl ? AUF.BAU_AB_BURG[id] || 0 : lvl + 1;
    return B < need && !cityBuildOf(loadCity(), id) ? 'Burg Stufe ' + need + ' nötig' : '';
}
function cityVglHtml(id, lvl, max) {               // Jetzt / Nächste Stufe (wie die Gebäude-Fenster in Rise of Kingdoms) – je Wert eine Zeile
    const z = cityVergleich(id, lvl); if (!z || !z.length) return '';
    return '<div class="vgl' + (max ? ' is-max' : '') + '"><div class="vgl-h"><span></span><span>Jetzt</span>' + (max ? '' : '<span>Stufe ' + (lvl + 1) + '</span>') + '</div>' +
        z.map(([n, a, b]) => '<div class="vgl-z"><span>' + n + '</span><b>' + a + '</b>' + (max ? '' : '<b class="vgl-neu">' + b + '</b>') + '</div>').join('') + '</div>';
}
const cityStufeHtml = (lvl, max, von) => max ? 'Stufe ' + lvl + ' · höchste Stufe' : 'Stufe ' + lvl + ' → ' + (lvl + 1) + ' <small>von ' + von + '</small>';
function citySeite(id, lvl) {                      // Reiter oben (Aufwerten | Forschen …) und welche Teile das Fenster zeigt
    const sh = document.getElementById('citySheet'), tabs = document.getElementById('cityTabs'), n = id === '_keep' ? null : cityNutz(id, lvl);
    if (!n) cityPage = 'bau';
    sh.classList.toggle('cs-keep', id === '_keep');                           // (Burg: Schild-Kasten unter die Voraussetzungen)
    sh.classList.toggle('cs-nutz', !!n && cityPage === 'nutz'); sh.classList.toggle('cs-bau', !!n && cityPage === 'bau');
    tabs.hidden = !n;
    if (n) liveHtml(tabs, '<button type="button" data-cpage="bau"' + (cityPage === 'bau' ? ' class="on"' : '') + '>' + icon('upgrade') + 'Aufwerten</button><button type="button" data-cpage="nutz"' + (cityPage === 'nutz' ? ' class="on"' : '') + '>' + icon(n[1]) + n[0] + (id === 'heroes' ? cityHeldenBadge() : '') + '</button>');
}
document.getElementById('citySheet').addEventListener('click', e => { const g = e.target.closest('[data-anf-geh]'); if (!g) return;   // „Zur Burg“: das fehlende Gebäude öffnen
    cityPage = 'bau'; cityOpenId = g.dataset.anfGeh; cityFocus(cityOpenId); renderCitySheet(); document.getElementById('citySheet').scrollTop = 0; });
document.getElementById('cityTabs').addEventListener('click', e => { const b = e.target.closest('[data-cpage]'); if (!b) return;
    if (cityHeldenDirekt(cityOpenId, b.dataset.cpage)) return;
    cityPage = b.dataset.cpage; renderCitySheet(); document.getElementById('citySheet').scrollTop = 0; });
function cityHeldenDirekt(id, page) {             // Heldenhalle „Helden“ (Reiter oder runder Knopf): gleich die Helden – keine Seite, auf der nur „Helden öffnen“ steht
    if (id !== 'heroes' || page !== 'nutz') return false;
    cityPage = 'bau'; openHeroHall(); return true;
}
const cityHeldenBadge = () => { const up = HEROES.filter(h => heroCanDo('player', h.id)).length; return up ? '<em class="hh-badge">' + up + '</em>' : ''; };   // wie viele Helden etwas zu tun haben
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
    liveHtml(document.getElementById('cityBLevel'), lvl ? cityStufeHtml(lvl, max, cityMaxLevel(id)) : 'Noch nicht gebaut');
    setText(document.getElementById('cityBDesc'), def.desc.replace(/Burg-Stufe (\d+)/g, 'Burg-\u2060Stufe\u00a0$1'));   // („ab Burg-Stufe 4“ bricht nie am Bindestrich um)
    const note = document.getElementById('cityBNote'), up = document.getElementById('cityUpgradeBtn'), sp = document.getElementById('citySpeedBtn');
    const bld = cityBuildOf(c, id), building = !!bld, blocker = cityBlocker(id);
    let cls, nh;
    if (building) { cls = 'notice notice--gold';
        nh = icon('hourglass') + '<span style="flex:1">Ausbau auf Stufe ' + bld.to + ' · noch <b id="cityBNoteTime"></b><div class="city-progress" style="margin-top:6px"><i></i></div>' + (typeof bundHilfeKnopf === 'function' ? bundHilfeKnopf('bau', id, bld.to, bld.endsAt) : '') + '</span>'; }
    else { nh = cityVglHtml(id, lvl, max); cls = nh ? 'city-vgl' : 'notice city-wirkung'; if (!nh) nh = icon('info') + '<span>' + cityEffectText(id, lvl) + '</span>'; }
    if (note.className !== cls) note.className = cls;
    liveHtml(note, nh);
    const cost = !max ? cityCost(id, lvl) : 0, kost = !max ? (AUF ? AUF.stadtKosten(id, lvl) : { c: cost }) : null;
    liveHtml(document.getElementById('cityBStats'), !max && !building ? cityAnfHtml(id, lvl, kost) : '');
    const fehlt = !max && !building && !cityBurgFehlt(id, lvl) && cityFehlt(id);
    setBtnLabel(up, max ? 'Höchste Stufe' : (!building && (cityBurgFehlt(id, lvl) || fehlt)) || (lvl ? 'Aufwerten' : 'Bauen'));
    cityWarteSetzen(fehlt && id);
    setText(document.getElementById('cityUpTime'), max ? '' : fmtDuration(cityTimeSec(id, lvl)));
    up.disabled = !!blocker || (AUF ? !AUF.kannZahlen('player', kost) : coins < cost);
    up.title = blocker || '';
    up.style.display = building ? 'none' : '';
    sp.style.display = building ? '' : 'none';
    document.getElementById('cityBeschBtn').style.display = building && beschMinuten() > 0 ? '' : 'none';   // Beschleuniger aus dem Rucksack (06g)
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
    if (cityHeldenDirekt(cityRingId, b.dataset.cring)) return cityRingZu();
    cityPage = b.dataset.cring; cityOpenId = cityRingId; cityRingZu(); renderCitySheet(); document.getElementById('citySheet').scrollTop = 0;
});
