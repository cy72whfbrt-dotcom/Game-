// Teil 10c2-tutorial.js: Tutorial für neue Spieler (Burg 1 → 3) im echten Spiel: dunkel mit Loch, Finger, Berater, Knöpfe kommen nach und nach
// ===== TUTORIAL (Alexander 10.10., Drehbuch scratchpad/tutorial/DREHBUCH.md) =====
// Ein neuer Spieler sieht zuerst fast nichts: oben Münzen, unten keine Knöpfe. Jeder Schritt zeigt mit dem Finger auf ein ECHTES
// Element (Knopf, Gebäude-Schild in der Stadt, Basis auf der Karte); nur dort nimmt das Dunkel Tipps an. Was ein Schritt braucht,
// kommt mit „Neu: …“ dazu (body.tz-<teil> blendet aus, Stil in 02). Bündnis, Events, Teleport … erst nach dem Tutorial, nach Burg-Stufe.
// Stand im Spielstand (openWaterTutorial, geht mit dem Profil): { s Schritt, frei [Teile], t0 Start des Schritts, z1/z2 Ziel-Basen,
// g Geschenke gegeben, fertig, alles (übersprungen: alles sichtbar) }. Alte Spielstände ohne diesen Wert sehen alles wie bisher.
// Geschenke über die normalen Wege (gibBelohnung, Abholfach) – das Hauptbuch hat dafür Spielraum (10d3 hbNeu: fr.bm, fr.s1).
// Bilder: Finger (einstieg_finger), Berater (einstieg_berater) und Banner (banner_neu) sind noch Platzhalter (Stil 02).
const TUT_TEILE = ['stadt', 'roh', 'kampf', 'events', 'truppen', 'shop', 'profil', 'rucksack', 'aufgaben', 'karte', 'gems', 'shopmehr', 'bund', 'rang', 'events2', 'welt'];
const TUT_NAME = { stadt: 'Stadt', roh: 'Rohstoffe', kampf: 'Kampf', events: 'Abholen', truppen: 'Truppen', shop: 'Shop', profil: 'Profil', rucksack: 'Rucksack',
    aufgaben: 'Aufgaben', bund: 'Bündnis', rang: 'Rangliste', events2: 'Events', welt: 'Teleport und Thron' };
const TUT_ICON = { stadt: 'castle', roh: 'wood', kampf: 'battlelog', events: 'shop', truppen: 'troops', shop: 'shop', profil: 'profile', rucksack: 'crate', aufgaben: 'flag', bund: 'bund', rang: 'crown', events2: 'event', welt: 'send' };
const TUT_ENDE = ['karte', 'gems', 'shopmehr'];                  // dazu am Ende des Tutorials
const TUT_BURG = { bund: 4, rang: 4, events2: 5, welt: 6 };      // danach: ab dieser Burg-Stufe (Vorgabe-Tabelle design_einstieg.md, an die echten Gebäude angepasst)
var tut = (() => { try { const v = JSON.parse(store.get('openWaterTutorial')); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } })();
const tutFrisch = () => playerLvl <= 1 && (loadCity().levels.keep || 1) <= 1 && CITY_BUILDINGS.every(b => !loadCity().levels[b.id]);
if (!tut && !SYSTEM && (window.__OW ? __OW.neu || tutFrisch() : !window.__owOhneTutorial && tutFrisch()))   // auch offline (Vorschau); Test-Vorschauen schalten es ab
    tut = { s: 0, frei: [], g: {}, t0: Date.now(), neu: true };   // (ganz neu – auch wenn er vor dem ersten Speichern neu lädt)
if (tut && tut.s > 0 && !tut.w) tut.w = 1;                       // (Stände von vor dem Willkommen: nicht noch mal begrüßen)
function tutLaeuft() { return !!(tut && tut.neu && !tut.fertig); }
function tutSpeichern() { store.set('openWaterTutorial', JSON.stringify(tut)); }
const tutTat = {};                                               // was im laufenden Schritt passiert ist (Angriff, Kiste, „Weiter“)
const $t = id => document.getElementById(id);
const tutSicht = el => el && el.getClientRects().length && el.getBoundingClientRect().width > 0 ? el : null;
const tutStufe = id => id === 'keep' ? loadCity().levels.keep || 1 : loadCity().levels[id] || 0;
const tutBaut = id => !!cityBuildOf(loadCity(), id);

// ---- Ziele: was der Finger zeigt (Element, Rechteck {r} oder {warte: Satz}) ----
function tutGeb(id, seite) {                                     // ein Gebäude: Stadt-Knopf → Schild → runder Knopf → Knopf im Fenster
    const key = id === 'keep' ? '_keep' : id;
    if (cityView.hidden) return $t('cityNavBtn');
    const sh = $t('citySheet');
    if (!sh.hidden) {
        if (cityOpenId !== key) return $t('citySheetClose');
        if (seite === 'nutz') return cityPage !== 'nutz' ? document.querySelector('#cityTabs [data-cpage="nutz"]') : document.querySelector('#citySheet .fo-go:not([disabled])') || 'weiter';
        return tutSicht($t('cityUpgradeBtn'));
    }
    if (cityRingId === key) return document.querySelector('#cityRing [data-cring="' + (seite || 'bau') + '"]');
    const n = cityNamen.find(x => x.id === key); if (n) return { r: n, fokus: () => cityFocus(key) };   // (Schild halb draußen/unter der Blase: Stadt neu ausrichten)
    cityFocus(key); return null;
}
function tutBauWarte(id) {                                       // ein Bau läuft: warten, mit Fortschritt
    const b = cityBuildOf(loadCity(), id) || {};
    return { warte: 'Kurz warten – der Bau läuft. Gleich fertig!', fort: b.endsAt ? (Date.now() - b.startedAt) / Math.max(1, b.endsAt - b.startedAt) : 0 };
}
function tutBau(id) { return tutBaut(id) ? tutBauWarte(id) : tutGeb(id); }   // bauen oder aufwerten; läuft der Bau: warten
function tutBesch(id) {                                          // ein laufender Bau: Beschleuniger benutzen
    if (isPanelOpen(beschPopup)) return document.querySelector('#beschPopup [data-besch-d]');
    if (!beschMinuten()) return tutBauWarte(id);
    const key = id === 'keep' ? '_keep' : id;
    if (!$t('citySheet').hidden && cityOpenId === key) return tutSicht($t('cityBeschBtn')) || tutBauWarte(id);
    return tutGeb(id);
}
function tutInsel(id) {                                          // eine Basis auf der Karte (die Kamera fliegt einmal hin)
    const i = islandById[id]; if (!i) return null;
    if (!cityView.hidden) return tutZurKarte();
    if (tutFlug !== tut.s) { tutFlug = tut.s; flyTo(i.x, i.y, { screenY: viewH * .42 }); }
    const r = Math.max(26, ISLAND_RADIUS * mapState.zoom * 1.2);
    return { r: { x: toSX(i.x) - r, y: toSY(i.y) - r, w: 2 * r, h: 2 * r }, fokus: () => flyTo(i.x, i.y, { screenY: viewH * .42 }) };
}
let tutFlug = -1;
const TUT_OHNE = { z1: 'Mehr Basen = mehr Truppen und mehr Gold pro Stunde. Sobald eine freie Basis in Reichweite ist, erobere sie – die Hauptstadt bleibt das Wichtigste.',
    z2: 'Bei jedem Angriff kannst du einen Helden mitschicken – er macht ihn stärker.' };
const TUT_ZWECK = { z1: 'Mehr Basen = mehr Truppen und mehr Gold pro Stunde.', z2: 'Ein Held macht deinen Angriff stärker.' };
const tutZurKarte = () => tutSicht($t('cityCloseBtn')) || $t('cityNavBtn');   // (Handy: der Stadt-Knopf unten heißt dann „Karte“)
function tutNeutral(ohne) {                                      // die nächste neutrale, sichtbare Basis (nicht die schon angegriffene)
    const h = islandById[playerIslandId], weg = new Set([ohne, ...pendingAttacks.filter(a => !a.attackerBotId).map(a => a.targetId)]);
    return (islands.filter(i => i.id !== playerIslandId && !weg.has(i.id) && !islandOwnerOf(i.id) && !bossAt(i.id) && i.type === 'tower' && islandSeen(i) && canReach(h.landmassId, i.landmassId))
        .sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0] || {}).id;
}
function tutAngriff(feld, held) {                                // Karte → Basis antippen → Angreifen → (Held wählen) → Losmarschieren; je Teilschritt ein eigener Satz mit Zähler
    if (tut[feld] === undefined || (!isPanelOpen(popup) && islandOwnerOf(tut[feld]))) { tut[feld] = tutNeutral(tut.z1); tutSpeichern(); }
    const id = tut[feld]; if (id === undefined) return { weiter: true, satz: TUT_OHNE[feld] };   // (keine Basis in Reichweite: nur erklären)
    const von = held ? 5 : 4, T = (n, ziel, satz) => ({ ziel, satz: n <= 2 ? TUT_ZWECK[feld] + ' ' + satz : satz, n, von });   // (am Anfang: wozu)
    if (!cityView.hidden) return T(1, tutZurKarte(), 'Geh zur Karte.');
    if (isPanelOpen(popup) && popupIslandId !== id) return T(2, $t('closeBtn'), 'Das ist die falsche Basis – schließ das Fenster.');
    if (isPanelOpen(popup)) {
        if (popupView !== 'preview') return T(3, tutSicht(attackBtn), 'Tipp auf „Angreifen“.');
        if (held && !previewHero) {
            const chip = tutSicht(document.querySelector('#islandPopup [data-hero]:not([data-hero=""]):not([disabled])'));
            if (chip) { const h = HEROES.find(x => x.id === chip.dataset.hero); return T(4, chip, 'Wähl ' + (h ? h.name : 'deinen Helden') + '.'); }
            const fd = tutSicht(document.querySelector('#islandPopup [data-held-auf="1"]'));
            if (fd) return T(4, fd, 'Tipp aufs Held-Feld.');
            return T(5, tutSicht(attackBtn), 'Gerade ist kein Held frei – marschier ohne Helden los!');   // (keine Helden-Chips: ehrlich sagen)
        }
        return T(von, tutSicht(attackBtn), 'Losmarschieren!');
    }
    return T(2, tutInsel(id), 'Tipp die leuchtende Basis.');
}
function tutLager() {                                           // das eigene Lager der Stufe 1 (09b barbNeulingLager) antippen → Angreifen
    if (!barbSheetEl.hidden && barbView && barbView.kind === 'camp') return document.querySelector('#barbSheet [data-bgo]:not([disabled])') || document.querySelector('#barbSheet [data-bclose]');
    const h = islandById[playerIslandId], c = barbState.camps.filter(x => x.fuer && barbFuerOk(x, 'player'))[0] || barbNearest();
    if (!c) return { weiter: true, satz: 'Barbaren-Lager bringen Münzen. Gerade ist keines in deiner Nähe – schau später auf der Karte.' };
    if (!cityView.hidden) return tutZurKarte();
    const hin = () => flyTo(c.x, c.y, { zoom: Math.max(mapState.zoom, .02), screenY: viewH * .42 });
    if (tutFlug !== tut.s) { tutFlug = tut.s; hin(); }
    const k = barbK(), p = barbScreen(c), r = Math.max(24, 22 * k); return { r: { x: p.x - r, y: p.y - r - 4 * k, w: 2 * r, h: 2 * r }, fokus: hin };
}
function tutMarschWarte() {                                      // Marsch zum Lager: warten, mit Fortschritt
    const m = barbMarches.find(x => x.who === 'player' && !x.back);
    return { warte: 'Kurz warten – deine Truppen marschieren. Gleich kommt der Kampf …', fort: m ? (Date.now() - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt) : 1 };
}
function tutFenster(panel, knopf) { return isPanelOpen(panel) ? null : $t(knopf); }   // Fenster zu: der Knopf, der es öffnet

// ---- die Schritte (Drehbuch) ----
const TUT = [
    { k: 'muenzen', satz: 'Das sind deine Münzen. Damit bezahlst du Forschung, Helden und vieles mehr.', ziel: () => ({ el: document.querySelector('#hud .res--coin') }) },
    { k: 'r_holz', neu: ['roh'], satz: 'Holz brauchst du für fast jedes Gebäude.', ziel: () => ({ el: document.querySelector('#hud .res--h') }) },
    { k: 'r_stein', satz: 'Stein macht deine Gebäude und die Burg größer.', ziel: () => ({ el: document.querySelector('#hud .res--s') }) },
    { k: 'r_eisen', satz: 'Eisen brauchst du für starke Gebäude und Forschung.', ziel: () => ({ el: document.querySelector('#hud .res--e') }) },
    { k: 'r_gems', zeig: 'gems', satz: 'Edelsteine sind selten und wertvoll. Damit geht alles schneller. Du bekommst sie später als Belohnung.', ziel: () => ({ el: document.querySelector('#hud .res--gem') }) },
    { k: 'holz', neu: ['stadt'], satz: 'Bau zuerst den Holzfäller. Er bringt dir jede Stunde Holz – ohne Holz kein Bauen.', vor: () => tutGeschenk('b', 'Geschenk für dich', [['besch', 2, { dauer: '1m' }]]),
      ziel: () => tutGeb('lumber'), fertig: () => tutStufe('lumber') > 0 || tutBaut('lumber') },
    { k: 'tempo', bleib: true, satz: 'Bauen braucht Zeit. Mit einem Beschleuniger ist es sofort fertig – probier es!', ziel: () => tutBesch('lumber'), fertig: () => tutStufe('lumber') > 0 },
    { k: 'stein', satz: 'Jetzt der Steinbruch. Er bringt jede Stunde Stein für größere Gebäude.', ziel: () => tutBau('quarry'), fertig: () => tutStufe('quarry') > 0 },
    { k: 'eisen', satz: 'Und die Eisenmine. Eisen brauchst du für Forschung und starke Gebäude.', ziel: () => tutBau('mine'), fertig: () => tutStufe('mine') > 0 },
    { k: 'burg2', satz: 'Die Burg ist das Herz deiner Hauptstadt. Jede Stufe bringt neue Gebäude – bau sie aus!', ziel: () => tutBau('keep'), fertig: () => tutStufe('keep') >= 2 },
    { k: 'karte', satz: 'Draußen auf der Karte warten neue Basen und Beute. Geh zur Karte!', ziel: tutZurKarte, fertig: () => cityView.hidden },
    { k: 'lager', satz: 'Draußen lagern Barbaren. Greif ihr Lager an – das bringt Münzen!', ziel: tutLager, fertig: () => barbMarches.some(m => m.who === 'player' && !m.back) || tutTat.lager },
    { k: 'marsch', satz: 'Kurz warten – deine Truppen marschieren. Gleich kommt der Kampf …', ziel: tutMarschWarte,
      fertig: () => combatLog.some(e => e.type !== 'ausgespaeht' && e.at >= tut.t0 - 2000) || rechnet() && !barbMarches.some(m => m.who === 'player' && !m.back) && Date.now() - tut.t0 > 3000 || Date.now() - tut.t0 > 300000 },
    { k: 'bericht', neu: ['kampf'], satz: 'Hier steht jeder Kampf: wer gewonnen hat und was du bekommst.',
      ziel: () => tutFenster(battleLogPopup, 'battleLogBtn') || document.querySelector('#battleTabs [data-ktab="berichte"]:not(.active)') || 'weiter' },
    { k: 'beute', neu: ['events'], satz: 'Deine Beute liegt im Abholfach. Hol sie ab!', fertig: () => !inboxFach().length,
      ziel: () => tutFenster(goalsPopup, 'goalsBtn') || (goalsTab !== 'reward' ? document.querySelector('[data-ggrp="abholen"]') : document.querySelector('#inboxList [data-inbox]')) },
    { k: 'basis', satz: 'Mehr Basen = mehr Truppen und mehr Gold pro Stunde. Erobere diese neutrale Basis!', ziel: () => tutAngriff('z1'), fertig: () => tutTat.angriff },
    { k: 'truppen', neu: ['truppen'], satz: 'Truppen wachsen von selbst – in jeder Basis, jede Stunde. Eine Kaserne brauchst du nicht.', ziel: () => ({ el: document.querySelector('#hud .res--troop') }) },
    { k: 'halle', satz: 'In der Heldenhalle leben deine Helden. Bau sie – Helden machen Angriffe stärker.', ziel: () => tutBau('heroes'), fertig: () => tutStufe('heroes') > 0 },
    { k: 'kiste', neu: ['shop'], satz: 'Zwei Schlüssel für dich! Öffne damit eine Helden-Kiste.', vor: () => tutGeschenk('k', 'Geschenk für dich', [['schluessel1', 2]]),
      ziel: () => tutFenster(shopPopup, 'shopBtn') || document.querySelector('#shopTabs [data-stab="gems"]:not(.active)') || (schluessel1 ? document.querySelector('[data-kiste="held"][data-anz="1"]') : 'weiter'),
      fertig: () => tutTat.kiste_held },
    { k: 'held', satz: 'Ein Held macht deinen Angriff stärker. Wähl einen Helden und greif an!', ziel: () => tutAngriff('z2', true), fertig: () => tutTat.heldAngriff || tutTat.ok },
    { k: 'gratis', satz: 'Im Shop gibt es alle 8 Stunden eine Kiste umsonst. Öffne sie!', fertig: () => gratisAb() > serverJetzt(),
      ziel: () => tutFenster(shopPopup, 'shopBtn') || document.querySelector('#shopTabs [data-stab="gems"]:not(.active)') || document.querySelector('#shopKisten [data-gratis]') },
    { k: 'ausruestung', bleib: true, satz: 'Öffne mit dem zweiten Schlüssel eine Ausrüstungs-Kiste. Ausrüstung macht deine Truppen stärker.', fertig: () => tutTat.kiste_aus || Object.keys(inventory).length > 0,
      ziel: () => tutFenster(shopPopup, 'shopBtn') || (schluessel1 ? document.querySelector('[data-kiste="aus"][data-anz="1"]') : 'weiter') },
    { k: 'anlegen', neu: ['profil'], satz: 'Leg die Ausrüstung an. Erst dann wirkt sie.', fertig: () => Object.values(equippedItems).some(Boolean),
      ziel: () => isPanelOpen(chestItemPopup) ? tutSicht(chestItemEquipBtn) : (isPanelOpen(profilePopup) ? null : tutSicht($t('profileBtn')) || $t('hudPlayer')) ||   // (Handy: Profil über das Spielerbild oben)
         (profilePopup.dataset.tab !== 'equip' ? $t('tabBtnEquip') : document.querySelector('#chestInventoryGrid .tile[data-id]')) },
    { k: 'rucksack', neu: ['rucksack'], satz: 'Im Rucksack liegen deine Sachen. Nimm den Beschleuniger mit in die Stadt.', fertig: () => !cityView.hidden || tutTat.ok,
      ziel: () => tutFenster(rucksackPopup, 'rucksackBtn') || document.querySelector('#rkInhalt [data-rk-stadt]') || document.querySelector('#rkInhalt [data-rk-tab="tempo"]:not(.on)') || 'weiter' },
    { k: 'burg3', satz: 'Burg 3! Jede Stufe bringt mehr Truppen und neue Gebäude.', fertig: () => tutStufe('keep') >= 3,   // (Desktop: der Rucksack lag sonst über dem Burg-Fenster)
      ziel: () => { if (isPanelOpen(rucksackPopup)) closePanel(rucksackPopup); return tutBaut('keep') ? tutBesch('keep') : tutGeb('keep'); } },
    { k: 'labor', satz: 'Im Labor forschst du – damit wird alles stärker. Bau es und starte eine Forschung.', fertig: () => !!loadCity().foRun || tutTat.ok,
      ziel: () => tutStufe('academy') ? tutGeb('academy', 'nutz') : tutBau('academy') },
    { k: 'aufgaben', neu: ['aufgaben'], satz: 'Jeden Tag gibt es neue Aufgaben mit Belohnung. Jetzt spielst du frei – viel Spaß!',
      ziel: () => tutFenster(goalsPopup, 'goalsBtn') || document.querySelector('[data-ggrp="aufgaben"]:not(.active)') || 'weiter' }
];

// ---- Geschenke: Bild + Zahl im Beute-Fenster (einmal je Schlüssel g) ----
function tutGeschenk(g, titel, liste) {
    if (tut.g[g]) return; tut.g[g] = 1; tutSpeichern();
    const aus = liste.map(([a, n, e]) => gibBelohnung(a, n, e)).filter(Boolean);
    saveGame(); saveProgression(); updateHud(); beuteFenster(titel, aus, {});
}

// ---- Freischalten: was fehlt, ist ganz weg (body.tz-<teil>) ----
function tutBurgFrei() { const B = AUF ? AUF.burgStufe('player') : 1; return Object.keys(TUT_BURG).filter(k => B >= TUT_BURG[k]); }
let tutFreiAlt = null;
function tutFrei() {
    const zeig = tutLaeuft() && tut.w && TUT[tut.s] && TUT[tut.s].zeig;   // (nur in diesem Schritt kurz zeigen, z. B. Edelsteine)
    const gesperrt = tut && tut.neu && !tut.alles, frei = gesperrt ? new Set([...tut.frei, ...(tut.fertig ? tutBurgFrei() : []), ...(zeig ? [zeig] : [])]) : null;
    for (const k of TUT_TEILE) document.body.classList.toggle('tz-' + k, !!gesperrt && !frei.has(k));
    if (!gesperrt) return;
    const neu = tutFreiAlt ? [...frei].filter(k => !tutFreiAlt.has(k) && TUT_NAME[k]) : [];
    tutFreiAlt = frei; if (neu.length) tutBanner(neu);
}
function tutBanner(teile) {                                      // „Neu: …“ (Platzhalter bis banner_neu.webp kommt)
    const b = $t('tutBanner'); if (!b) return;
    liveHtml(b, icon(TUT_ICON[teile[0]] || 'star') + '<span>Neu: ' + teile.map(k => TUT_NAME[k]).join(', ') + '</span>');
    b.hidden = false; b.classList.remove('an'); void b.offsetWidth; b.classList.add('an');
    clearTimeout(tutBanner.uhr); tutBanner.uhr = setTimeout(() => { b.hidden = true; }, 2600);
}

// ---- Anzeige: Dunkel mit Loch (vier Teile drumherum fangen die Tipps), Finger, Berater ----
const TUT_PAUSE = ['levelUpModal', 'rewardModal', 'dailyModal', 'welcomeModal', 'beuteFenster'];
const tutPause = () => !!$t('wkName') || TUT_PAUSE.some(id => { const m = $t(id); return m && !m.hidden; });   // ein Belohnungs-Fenster geht vor
let tutUhr = 0, tutFrage = false;
function tutWeiter() {                                           // nächster Schritt: aufräumen, Neues freischalten, vorher-Aktion
    tut.s++; tut.t0 = Date.now(); for (const k of Object.keys(tutTat)) delete tutTat[k];
    if (tut.s >= TUT.length) return tutEnde();
    tutStart();
}
function tutStart() {
    const S = TUT[tut.s];
    if (!S.bleib) { closeAllPopups(); closePanel(beschPopup); if (!cityView.hidden) { cityRingZu(); cityOpenId = null; $t('citySheet').hidden = true; } }
    for (const k of S.neu || []) if (!tut.frei.includes(k)) tut.frei.push(k);
    tutSpeichern(); tutFrei(); if (S.vor) S.vor();
}
function tutEnde() {
    tut.fertig = true; for (const k of TUT_ENDE) if (!tut.frei.includes(k)) tut.frei.push(k);
    tutSpeichern(); tutFrei(); tutZeigen(); closeAllPopups();
    if (!tut.belohnt) { tut.belohnt = true; tutSpeichern(); inboxAdd({ src: 'gift', title: 'Tutorial geschafft', gems: 10, crate: 0 }); }   // (die Belohnung nur beim ersten Mal)
    flashHint(tut.nochmal ? 'Tutorial geschafft. Viel Spaß!' : 'Geschafft! Unter „Events“ → Abholen wartet deine Belohnung. Viel Spaß!', 6000);
    setTimeout(maybeShowDaily, 1500);                            // jetzt erst die tägliche Belohnung
}
const TUT_ETAPPE = [['Bauen', 'muenzen'], ['Karte', 'karte'], ['Angriff', 'basis'], ['Helden', 'halle'], ['Ausrüstung', 'gratis']];   // Fortschrittsband oben: ab welchem Schritt
function tutEtappe() { let e = 0; TUT_ETAPPE.forEach(([, k], i) => { if (TUT.findIndex(x => x.k === k) <= tut.s) e = i; }); return e; }
function tutZiel(z) {                                            // → { rect, weiter, warte, fort, satz, teil, fokus }
    if (!z) return {};
    if (z.ziel !== undefined) return { ...tutZiel(z.ziel), satz: z.satz, teil: z.n + '/' + z.von };   // Teilschritt (Angriff): eigener Satz + Zähler
    if (z === 'weiter') return { weiter: true };
    if (z.weiter) return { weiter: true, satz: z.satz };
    if (z.warte) return { warte: z.warte, fort: z.fort };
    if (z.r) return { rect: { left: z.r.x, top: z.r.y, width: z.r.w, height: z.r.h }, fokus: z.fokus };
    const el = z.el || z; if (!(el instanceof Element) || !tutSicht(el)) return {};
    const q = el.getBoundingClientRect(), $tut = $t('tut'), h = (x, y) => { $tut.hidden = true; const e = document.elementFromPoint(x, y); $tut.hidden = false; return e; };
    if (el.classList.contains('res')) {                          // Rohstoff oben: nur Bild + Zahl (Handy: die Kapsel geht sonst über die ganze Breite)
        const t = [...el.children].filter(tutSicht).map(x => x.getBoundingClientRect());
        if (t.length) { const l = Math.min(...t.map(x => x.left)), o = Math.min(...t.map(x => x.top)), r = Math.max(...t.map(x => x.right)), u = Math.max(...t.map(x => x.bottom));
            return { rect: { left: l, top: Math.min(o, q.top), width: r - l, height: Math.max(u, q.bottom) - Math.min(o, q.top) }, nurZeigen: !!z.el }; }
    }
    const mitte = h(q.left + q.width / 2, q.top + q.height / 2);   // verdeckt (Kopf/Leiste) oder halb draußen: in die Mitte der Liste rollen
    if (el.closest('.panel, .city-sheet') && !(mitte && (mitte === el || el.contains(mitte)))) { el.scrollIntoView({ block: 'center' }); return { rect: el.getBoundingClientRect(), nurZeigen: !!z.el }; }
    return { rect: q, nurZeigen: !!z.el };
}
const tutDeckt = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;   // zwei Rechtecke {l,t,r,b} überlappen
const tutBox = e => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; };
let tutAlt = null, tutLochAn = false, tutFokusZeit = 0, tutFokusN = 0, tutOhneSeit = 0, tutSchrittAlt = -1;
function tutZeigen() {
    const el = $t('tut'); if (!el) return;
    tutFrei();
    document.body.classList.toggle('tut-an', tutLaeuft() && !tutPause());   // (normale Hinweise oben ruhen solange: nie über Sprechblase oder „Überspringen“)
    if (!tutLaeuft()) { el.hidden = true; if (tutUhr) { clearInterval(tutUhr); tutUhr = setInterval(tutFrei, 5000); } return; }   // fertig: nur noch die Burg-Stufen freischalten
    if (tutWillkommen()) { el.hidden = true; return; }
    if (tutPause()) { el.hidden = true; return; }
    const S = TUT[tut.s];
    let weiter = false; try { weiter = !!(tutTat.ok || (S.fertig && S.fertig())); } catch (e) {}
    if (weiter) { sfx('upgrade'); tutWeiter(); if (!tutLaeuft()) return; return tutZeigen(); }
    let z = {}; try { z = tutZiel(S.ziel()); } catch (e) {}
    el.hidden = false;
    const W = innerWidth, H = innerHeight, jetzt = Date.now(), be = $t('tutBerater');
    if (tutSchrittAlt !== tut.s) { tutSchrittAlt = tut.s; tutOhneSeit = jetzt; tutFokusN = 0; tutAlt = null; }
    // Band oben: 5 Etappen, die aktuelle hervorgehoben
    const et = tutEtappe(), band = $t('tutBand'), bandHtml = TUT_ETAPPE.map(([n], i) => '<span class="' + (i < et ? 'ok' : i === et ? 'an' : '') + '">' + n + '</span>').join('');
    if (band.dataset.e !== String(et)) { band.dataset.e = String(et); liveHtml(band, bandHtml); }
    let r = z.rect ? { l: z.rect.left - 8, t: z.rect.top - 8, r: z.rect.left + z.rect.width + 8, b: z.rect.top + z.rect.height + 8 } : null;
    // Blase: die Seite nehmen, die das Loch nicht überdeckt (ganzes Rechteck mit Berater-Bild, nicht nur die Mitte)
    be.classList.remove('oben'); const bu = tutBox(be); be.classList.add('oben'); const bo = tutBox(be);
    let oben = !!r && (r.t + r.b) / 2 > H * .5;
    if (r && tutDeckt(oben ? bo : bu, r) && !tutDeckt(oben ? bu : bo, r)) oben = !oben;
    be.classList.toggle('oben', oben);
    if (r && z.fokus) {                                          // Ziel auf Karte/Stadt: erst zeigen, wenn es ganz im Bild steht und die Kamera ruht
        const kopf = Math.max(...['hud', 'tutBand', 'tutWeg'].map(id => { const x = $t(id); return x && tutSicht(x) ? x.getBoundingClientRect().bottom : 0; }));
        const nav = $t('cornerButtons'), fuss = nav && tutSicht(nav) ? nav.getBoundingClientRect().top : H;
        const ruht = !cameraFlight && tutAlt && Math.abs(tutAlt.l - r.l) < 2 && Math.abs(tutAlt.t - r.t) < 2;
        const drin = r.l >= 24 && r.r <= W - 24 && r.t >= kopf + 24 && r.b <= fuss - 24 && !tutDeckt(oben ? bo : bu, r);
        tutAlt = r;
        if (!drin && ruht && tutFokusN < 4 && jetzt - tutFokusZeit > 1500) { tutFokusZeit = jetzt; tutFokusN++; z.fokus(); }   // (noch einmal hin – nach 4 Versuchen gilt es so)
        if (jetzt - tutFokusZeit < 1200 || !(drin && (ruht || tutLochAn)) && !(ruht && tutFokusN >= 4)) r = null;   // (nach dem Hinfliegen erst ausrollen lassen)   // (schon gezeigt und noch drin: kein Flackern bei kleinen Bewegungen)
    }
    tutLochAn = !!r;
    if (r) {                                                     // Loch nie über den Bildrand: nach innen schieben
        const w = Math.min(r.r - r.l, W - 4), hh = Math.min(r.b - r.t, H - 4);
        const l = Math.min(Math.max(2, r.l), W - 2 - w), t = Math.min(Math.max(2, r.t), H - 2 - hh); r = { l, t, r: l + w, b: t + hh };
    }
    if (r || z.weiter || z.nurZeigen) tutOhneSeit = jetzt;
    const not = !r && !z.weiter && !(z.warte && z.fort < 1) && jetzt - tutOhneSeit > 20000;   // hängt der Schritt ohne Ziel (nicht beim Warten mit Fortschritt): „Weiter“ als Notausgang
    const ok = !!(z.weiter || z.nurZeigen || not);
    el.classList.toggle('is-frei', !!z.warte);                   // warten (Marsch, Bau): nicht abdunkeln, nur nichts antippen
    const loch = r || { l: 0, t: H, r: 0, b: H };
    const teil = (n, l, t, w, h) => { const d = el.querySelector('[data-tut-d="' + n + '"]'), s = [l, t, w, h].map(v => Math.max(0, Math.round(v)) + 'px');
        if (d.dataset.s !== s.join()) { d.dataset.s = s.join(); Object.assign(d.style, { left: s[0], top: s[1], width: s[2], height: s[3] }); } };
    teil('o', 0, 0, W, loch.t); teil('u', 0, loch.b, W, H - loch.b); teil('l', 0, loch.t, loch.l, loch.b - loch.t); teil('r', loch.r, loch.t, W - loch.r, loch.b - loch.t);
    const sp = $t('tutSperre'), lo = $t('tutLoch'); sp.hidden = !(r && z.nurZeigen); lo.hidden = !r;   // nur gezeigt (Weiter-Knopf): das Loch nimmt keine Tipps
    for (const x of [sp, lo]) Object.assign(x.style, { left: loch.l + 'px', top: loch.t + 'px', width: loch.r - loch.l + 'px', height: loch.b - loch.t + 'px' });
    const fi = $t('tutFinger'); fi.hidden = !r || z.nurZeigen;
    if (!fi.hidden) { const cx = (loch.l + loch.r) / 2, unten = loch.b + 60 < H - 70; Object.assign(fi.style, { left: Math.round(Math.min(W - 56, Math.max(2, cx - 27))) + 'px', top: Math.round(unten ? loch.b - 14 : loch.t - 40) + 'px' }); fi.classList.toggle('oben', !unten); }
    const satz = tutFrage ? 'Tutorial wirklich überspringen? Dann siehst du sofort alles.' : z.warte || z.satz || S.satz;
    if ($t('tutSatz').textContent !== satz) { setText($t('tutSatz'), satz); be.classList.remove('rein'); void be.offsetWidth; be.classList.add('rein'); }   // neuer Satz: Blase blendet weich ein
    const zl = $t('tutZaehler'); zl.hidden = tutFrage || !z.teil; if (z.teil) setText(zl, z.teil);
    const fb = $t('tutFort'); fb.hidden = tutFrage || z.fort === undefined; if (z.fort !== undefined) fb.firstChild.style.width = Math.round(100 * Math.min(1, Math.max(0, z.fort))) + '%';
    $t('tutWeiter').hidden = tutFrage || !ok; $t('tutFrage').hidden = !tutFrage; $t('tutWeg').hidden = tutFrage;
}
// ---- Willkommen (vor Schritt 1): Titelbild, kurze Geschichte, ohne Server auch der Name ----
const TUT_NAME_MAX = 16;
function tutWillkommen() {                                       // true, solange das Willkommen offen ist
    const w = $t('tutWillkommen'); if (!w) return false;
    const an = tutLaeuft() && !tut.w; w.hidden = !an;
    if (an && !w.dataset.an) {
        w.dataset.an = '1';
        const mitName = !window.__OW;                            // mit Server kommt der Name aus der Anmeldung
        $t('twNameZeile').hidden = !mitName;
        if (mitName) $t('twName').value = (store.get('openWaterPlayerName') || 'Kapitän ' + (100 + Math.floor(Math.random() * 900))).slice(0, TUT_NAME_MAX);
    }
    return an;
}
$t('twLos').addEventListener('click', () => {
    if (!$t('twNameZeile').hidden) {
        const n = $t('twName').value.replace(/\s+/g, ' ').slice(0, TUT_NAME_MAX).trim();
        if (!n) { setText($t('twFehler'), 'Bitte gib einen Namen ein.'); return; }
        store.set('openWaterPlayerName', n); profileName.value = n; try { updateHudPlayer(); } catch (e) {}
    }
    tut.w = 1; tutSpeichern(); sfx('upgrade'); tutStarten();
});
$t('twName').addEventListener('keydown', e => { if (e.key === 'Enter') $t('twLos').click(); });
function tutStarten() {
    if (!tut) return;
    if (tutLaeuft() && tut.w && !tut.g.s0 && tut.s === 0) { tut.g.s0 = 1; tutStart(); }   // ganz am Anfang (nach dem Willkommen)
    tutZeigen(); if (!tutUhr) tutUhr = setInterval(tutLaeuft() ? tutZeigen : tutFrei, tutLaeuft() ? 250 : 5000);
}
$t('tutWeiter').addEventListener('click', () => { tutTat.ok = true; tutZeigen(); });
$t('tutWeg').addEventListener('click', () => { tutFrage = true; tutZeigen(); });   // erst fragen (im Spiel, kein Browser-Fenster)
$t('tutNein').addEventListener('click', () => { tutFrage = false; tutZeigen(); });
$t('tutJa').addEventListener('click', () => {
    tutFrage = false; tut.fertig = true; tut.alles = true; tutSpeichern(); tutZeigen();
    flashHint('Tutorial übersprungen – jetzt siehst du alles.', 3500); setTimeout(maybeShowDaily, 1500);
});
$t('tutNochmal').addEventListener('click', () => {               // Profil → Einstellungen: von vorn (ohne Geschenke und Belohnung; Gebautes zählt gleich als erledigt)
    tut = { s: 0, frei: [], g: { b: 1, k: 1 }, t0: Date.now(), neu: true, w: 1, belohnt: true, nochmal: true }; tutFreiAlt = null; tutFrage = false;
    for (const k of Object.keys(tutTat)) delete tutTat[k];
    if (tutUhr) { clearInterval(tutUhr); tutUhr = 0; }
    closeAllPopups(); tutStarten();
});
// was die Schritte mitbekommen müssen: Angriff (mit Held?), geöffnete Kisten
barbSend = (alt => function (who) { const r = alt.apply(this, arguments); if (r && who === 'player') tutTat.lager = true; return r; })(barbSend);   // (im Netz: der Befehl ans Lager)
alsBefehl = (alt => function (art) { const r = alt.apply(this, arguments); if (r && art === 'lager') tutTat.lager = true; return r; })(alsBefehl);
if (typeof questProgress === 'function') questProgress = (alt => function (t) { if (t === 'attack') { tutTat.angriff = true; if (nextAttackHero) tutTat.heldAngriff = true; } return alt.apply(this, arguments); })(questProgress);
kisteOeffnen = (alt => function (id) { const r = alt.apply(this, arguments); if (($t('beuteFenster') || {}).hidden === false) tutTat['kiste_' + id] = true; return r; })(kisteOeffnen);
if (tut) { tutFrei(); afterSplash(() => setTimeout(tutStarten, 600)); }
