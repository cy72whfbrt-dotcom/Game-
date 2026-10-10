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
if (!tut && !SYSTEM && window.__OW && (__OW.neu || (playerLvl <= 1 && (loadCity().levels.keep || 1) <= 1 && CITY_BUILDINGS.every(b => !loadCity().levels[b.id]))))
    tut = { s: 0, frei: [], g: {}, t0: Date.now(), neu: true };   // (ganz neu – auch wenn er vor dem ersten Speichern neu lädt)
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
    const n = cityNamen.find(x => x.id === key); if (n) return { r: n };
    cityFocus(key); return null;
}
function tutBau(id, satzBau) {                                   // bauen oder aufwerten; läuft der Bau: warten (mit Beschleuniger, wenn einer da ist)
    if (tutBaut(id)) return satzBau || { warte: 'Der Bau läuft – gleich fertig.' };
    return tutGeb(id);
}
function tutBesch(id) {                                          // ein laufender Bau: Beschleuniger benutzen
    if (isPanelOpen(beschPopup)) return document.querySelector('#beschPopup [data-besch-d]');
    if (!beschMinuten()) return { warte: 'Der Bau läuft – gleich fertig.' };
    const key = id === 'keep' ? '_keep' : id;
    if (!$t('citySheet').hidden && cityOpenId === key) return tutSicht($t('cityBeschBtn')) || { warte: 'Der Bau läuft – gleich fertig.' };
    return tutGeb(id);
}
function tutInsel(id) {                                          // eine Basis auf der Karte (die Kamera fliegt einmal hin)
    const i = islandById[id]; if (!i) return null;
    if (!cityView.hidden) return tutZurKarte();
    if (tutFlug !== tut.s) { tutFlug = tut.s; flyTo(i.x, i.y); }
    const r = Math.max(26, ISLAND_RADIUS * mapState.zoom * 1.2);
    return { r: { x: toSX(i.x) - r, y: toSY(i.y) - r, w: 2 * r, h: 2 * r } };
}
let tutFlug = -1;
const tutZurKarte = () => tutSicht($t('cityCloseBtn')) || $t('cityNavBtn');   // (Handy: der Stadt-Knopf unten heißt dann „Karte“)
function tutNeutral(ohne) {                                      // die nächste neutrale, sichtbare Basis (nicht die schon angegriffene)
    const h = islandById[playerIslandId], weg = new Set([ohne, ...pendingAttacks.filter(a => !a.attackerBotId).map(a => a.targetId)]);
    return (islands.filter(i => i.id !== playerIslandId && !weg.has(i.id) && !islandOwnerOf(i.id) && !bossAt(i.id) && i.type === 'tower' && islandSeen(i) && canReach(h.landmassId, i.landmassId))
        .sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0] || {}).id;
}
function tutAngriff(feld, held) {                                // Basis antippen → Angreifen → (Held wählen) → Angreifen
    if (tut[feld] === undefined || (!isPanelOpen(popup) && islandOwnerOf(tut[feld]))) { tut[feld] = tutNeutral(tut.z1); tutSpeichern(); }
    const id = tut[feld]; if (id === undefined) return 'weiter';   // (keine Basis in Sicht: weiter)
    if (isPanelOpen(popup) && popupIslandId !== id) return $t('closeBtn');
    if (isPanelOpen(popup)) {
        if (held && popupView === 'preview' && !previewHero) return tutSicht(document.querySelector('#islandPopup [data-hero]:not([data-hero=""]):not([disabled])'))
            || document.querySelector('#islandPopup [data-held-auf="1"]') || tutSicht(attackBtn);   // Held-Feld öffnen → einen Helden wählen
        return tutSicht(attackBtn);
    }
    return tutInsel(id);
}
function tutFenster(panel, knopf) { return isPanelOpen(panel) ? null : $t(knopf); }   // Fenster zu: der Knopf, der es öffnet

// ---- die Schritte (Drehbuch) ----
const TUT = [
    { k: 'roh', neu: ['stadt', 'roh'], satz: 'Oben siehst du Münzen, Holz, Stein und Eisen. Damit baust du alles.', ziel: () => ({ el: document.querySelector('#hud .hud-werte') }) },
    { k: 'holz', satz: 'Bau zuerst den Holzfäller – er bringt jede Stunde Holz.', vor: () => tutGeschenk('b', 'Geschenk für dich', [['besch', 2, { dauer: '1m' }]]),
      ziel: () => tutGeb('lumber'), fertig: () => tutStufe('lumber') > 0 || tutBaut('lumber') },
    { k: 'tempo', bleib: true, satz: 'Mit einem Beschleuniger ist der Bau sofort fertig. Probier es!', ziel: () => tutBesch('lumber'), fertig: () => tutStufe('lumber') > 0 },
    { k: 'stein', satz: 'Jetzt der Steinbruch – für Stein.', ziel: () => tutBau('quarry'), fertig: () => tutStufe('quarry') > 0 },
    { k: 'eisen', satz: 'Und die Eisenmine – für Eisen.', ziel: () => tutBau('mine'), fertig: () => tutStufe('mine') > 0 },
    { k: 'burg2', satz: 'Deine Hauptstadt nimmst du immer mit – sie ist das Wichtigste. Bau die Burg aus!', ziel: () => tutBau('keep'), fertig: () => tutStufe('keep') >= 2 },
    { k: 'karte', satz: 'Draußen auf der Karte warten neue Basen.', ziel: tutZurKarte, fertig: () => cityView.hidden },
    { k: 'angriff', satz: 'Mehr Basen = mehr Truppen und mehr Gold pro Stunde. Greif diese neutrale Basis an!', ziel: () => tutAngriff('z1'), fertig: () => tutTat.angriff || tutTat.ok },
    { k: 'marsch', satz: 'Deine Truppen marschieren. Gleich kommt der Kampf …', ziel: () => ({ warte: 'Deine Truppen marschieren. Gleich kommt der Kampf …' }),
      fertig: () => combatLog.some(e => e.type !== 'ausgespaeht' && e.at >= tut.t0 - 2000) || Date.now() - tut.t0 > 300000 },
    { k: 'bericht', neu: ['kampf'], satz: 'Hier steht jeder Kampf: wer gewonnen hat und was du bekommst.',
      ziel: () => tutFenster(battleLogPopup, 'battleLogBtn') || document.querySelector('#battleTabs [data-ktab="berichte"]:not(.active)') || 'weiter' },
    { k: 'beute', neu: ['events'], satz: 'Deine Beute liegt im Abholfach. Hol sie ab!', fertig: () => !inboxFach().some(x => x.src === 'fight'),
      ziel: () => tutFenster(goalsPopup, 'goalsBtn') || (goalsTab !== 'reward' ? document.querySelector('[data-ggrp="abholen"]') : document.querySelector('#inboxList [data-inbox]')) },
    { k: 'truppen', neu: ['truppen'], satz: 'Truppen wachsen von selbst – in jeder Basis, jede Stunde. Eine Kaserne brauchst du nicht.', ziel: () => ({ el: document.querySelector('#hud .res--troop') }) },
    { k: 'halle', satz: 'In der Heldenhalle leben deine Helden. Bau sie!', ziel: () => tutBau('heroes'), fertig: () => tutStufe('heroes') > 0 },
    { k: 'kiste', neu: ['shop'], satz: 'Zwei Schlüssel für dich! Öffne damit eine Helden-Kiste.', vor: () => tutGeschenk('k', 'Geschenk für dich', [['schluessel1', 2]]),
      ziel: () => tutFenster(shopPopup, 'shopBtn') || document.querySelector('#shopTabs [data-stab="gems"]:not(.active)') || document.querySelector('[data-kiste="held"][data-anz="1"]'),
      fertig: () => tutTat.kiste_held },
    { k: 'held', satz: 'Ein Held macht deinen Angriff stärker. Wähl einen Helden und greif an!', ziel: () => tutAngriff('z2', true), fertig: () => tutTat.heldAngriff || tutTat.ok },
    { k: 'gratis', satz: 'Im Shop gibt es alle 8 Stunden eine Kiste umsonst. Öffne sie!', fertig: () => gratisAb() > serverJetzt(),
      ziel: () => tutFenster(shopPopup, 'shopBtn') || document.querySelector('#shopTabs [data-stab="gems"]:not(.active)') || document.querySelector('#shopKisten [data-gratis]') },
    { k: 'ausruestung', bleib: true, satz: 'Mit dem zweiten Schlüssel: eine Ausrüstungs-Kiste.', fertig: () => tutTat.kiste_aus || Object.keys(inventory).length > 0,
      ziel: () => tutFenster(shopPopup, 'shopBtn') || document.querySelector('[data-kiste="aus"][data-anz="1"]') },
    { k: 'anlegen', neu: ['profil'], satz: 'Ausrüstung macht deine Truppen stärker. Leg sie an!', fertig: () => Object.values(equippedItems).some(Boolean),
      ziel: () => isPanelOpen(chestItemPopup) ? tutSicht(chestItemEquipBtn) : (isPanelOpen(profilePopup) ? null : tutSicht($t('profileBtn')) || $t('hudPlayer')) ||   // (Handy: Profil über das Spielerbild oben)
         (profilePopup.dataset.tab !== 'equip' ? $t('tabBtnEquip') : document.querySelector('#chestInventoryGrid .tile[data-id]')) },
    { k: 'rucksack', neu: ['rucksack'], satz: 'Im Rucksack liegen deine Sachen. Nimm den Beschleuniger mit in die Stadt.', fertig: () => !cityView.hidden || tutTat.ok,
      ziel: () => tutFenster(rucksackPopup, 'rucksackBtn') || document.querySelector('#rkInhalt [data-rk-stadt]') || document.querySelector('#rkInhalt [data-rk-tab="tempo"]:not(.on)') || 'weiter' },
    { k: 'burg3', satz: 'Burg 3! Jede Stufe bringt mehr Truppen und neue Gebäude.', ziel: () => tutBaut('keep') ? tutBesch('keep') : tutGeb('keep'), fertig: () => tutStufe('keep') >= 3 },
    { k: 'labor', satz: 'Im Labor forschst du – damit wird alles stärker. Bau es und starte eine Forschung.', fertig: () => !!loadCity().foRun || tutTat.ok,
      ziel: () => tutStufe('academy') ? tutGeb('academy', 'nutz') : tutBau('academy') },
    { k: 'aufgaben', neu: ['aufgaben'], satz: 'Jeden Tag gibt es neue Aufgaben mit Belohnung. Jetzt spielst du frei – Bündnis und Events kommen bald!',
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
    const gesperrt = tut && tut.neu && !tut.alles, frei = gesperrt ? new Set([...tut.frei, ...(tut.fertig ? tutBurgFrei() : [])]) : null;
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
    inboxAdd({ src: 'gift', title: 'Tutorial geschafft', gems: 10, crate: 0 });
    flashHint('Geschafft! Unter „Events“ → Abholen wartet deine Belohnung. Viel Spaß!', 6000);
    setTimeout(maybeShowDaily, 1500);                            // jetzt erst die tägliche Belohnung
}
function tutZiel(z) {                                            // → { rect, weiter, warte }
    if (!z) return {};
    if (z === 'weiter') return { weiter: true };
    if (z.warte) return { warte: z.warte };
    if (z.r) return { rect: { left: z.r.x, top: z.r.y, width: z.r.w, height: z.r.h } };
    const el = z.el || z; if (!(el instanceof Element) || !tutSicht(el)) return {};
    const q = el.getBoundingClientRect(), $tut = $t('tut'), h = (x, y) => { $tut.hidden = true; const e = document.elementFromPoint(x, y); $tut.hidden = false; return e; };
    const mitte = h(q.left + q.width / 2, q.top + q.height / 2);   // verdeckt (Kopf/Leiste) oder halb draußen: in die Mitte der Liste rollen
    if (el.closest('.panel, .city-sheet') && !(mitte && (mitte === el || el.contains(mitte)))) { el.scrollIntoView({ block: 'center' }); return { rect: el.getBoundingClientRect(), nurZeigen: !!z.el }; }
    return { rect: q, nurZeigen: !!z.el };
}
function tutZeigen() {
    const el = $t('tut'); if (!el) return;
    tutFrei();
    if (!tutLaeuft()) { el.hidden = true; if (tutUhr) { clearInterval(tutUhr); tutUhr = setInterval(tutFrei, 5000); } return; }   // fertig: nur noch die Burg-Stufen freischalten
    if (tutPause()) { el.hidden = true; return; }
    const S = TUT[tut.s];
    let weiter = false; try { weiter = !!(S.fertig ? S.fertig() : tutTat.ok); } catch (e) {}
    if (weiter) { sfx('upgrade'); tutWeiter(); if (!tutLaeuft()) return; return tutZeigen(); }
    let z = {}; try { z = tutZiel(S.ziel()); } catch (e) {}
    el.hidden = false;
    const W = innerWidth, H = innerHeight, r = z.rect, ok = !!(z.weiter || z.nurZeigen);
    el.classList.toggle('is-frei', !!z.warte);                   // warten (Marsch, Bau): nicht abdunkeln, nur nichts antippen
    const loch = r ? { l: Math.max(0, r.left - 8), t: Math.max(0, r.top - 8), r: Math.min(W, r.left + r.width + 8), b: Math.min(H, r.top + r.height + 8) } : { l: 0, t: H, r: 0, b: H };
    const teil = (n, l, t, w, h) => { const d = el.querySelector('[data-tut-d="' + n + '"]'), s = [l, t, w, h].map(v => Math.max(0, Math.round(v)) + 'px');
        if (d.dataset.s !== s.join()) { d.dataset.s = s.join(); Object.assign(d.style, { left: s[0], top: s[1], width: s[2], height: s[3] }); } };
    teil('o', 0, 0, W, loch.t); teil('u', 0, loch.b, W, H - loch.b); teil('l', 0, loch.t, loch.l, loch.b - loch.t); teil('r', loch.r, loch.t, W - loch.r, loch.b - loch.t);
    const sp = $t('tutSperre'), lo = $t('tutLoch'); sp.hidden = !(r && z.nurZeigen); lo.hidden = !r;   // nur gezeigt (Weiter-Knopf): das Loch nimmt keine Tipps
    for (const x of [sp, lo]) Object.assign(x.style, { left: loch.l + 'px', top: loch.t + 'px', width: loch.r - loch.l + 'px', height: loch.b - loch.t + 'px' });
    const fi = $t('tutFinger'); fi.hidden = !r || z.nurZeigen;
    if (!fi.hidden) { const cx = (loch.l + loch.r) / 2, unten = loch.b + 60 < H - 70; Object.assign(fi.style, { left: Math.round(cx - 27) + 'px', top: Math.round(unten ? loch.b - 14 : loch.t - 40) + 'px' }); fi.classList.toggle('oben', !unten); }
    const be = $t('tutBerater');
    be.classList.toggle('oben', !!r && (loch.t + loch.b) / 2 > H * .5);       // nie über dem Loch
    setText($t('tutSatz'), tutFrage ? 'Tutorial wirklich überspringen? Dann siehst du sofort alles.' : z.warte || S.satz);
    $t('tutWeiter').hidden = tutFrage || !ok; $t('tutFrage').hidden = !tutFrage; $t('tutWeg').hidden = tutFrage;
}
function tutStarten() {
    if (!tut) return;
    if (tutLaeuft() && !tut.frei.length && tut.s === 0) tutStart();   // ganz am Anfang: „Neu: Stadt, Rohstoffe“
    tutZeigen(); if (!tutUhr) tutUhr = setInterval(tutLaeuft() ? tutZeigen : tutFrei, tutLaeuft() ? 250 : 5000);
}
$t('tutWeiter').addEventListener('click', () => { tutTat.ok = true; tutZeigen(); });
$t('tutWeg').addEventListener('click', () => { tutFrage = true; tutZeigen(); });   // erst fragen (im Spiel, kein Browser-Fenster)
$t('tutNein').addEventListener('click', () => { tutFrage = false; tutZeigen(); });
$t('tutJa').addEventListener('click', () => {
    tutFrage = false; tut.fertig = true; tut.alles = true; tutSpeichern(); tutZeigen();
    flashHint('Tutorial übersprungen – jetzt siehst du alles.', 3500); setTimeout(maybeShowDaily, 1500);
});
// was die Schritte mitbekommen müssen: Angriff (mit Held?), geöffnete Kisten
if (typeof questProgress === 'function') questProgress = (alt => function (t) { if (t === 'attack') { tutTat.angriff = true; if (nextAttackHero) tutTat.heldAngriff = true; } return alt.apply(this, arguments); })(questProgress);
kisteOeffnen = (alt => function (id) { const r = alt.apply(this, arguments); if (($t('beuteFenster') || {}).hidden === false) tutTat['kiste_' + id] = true; return r; })(kisteOeffnen);
if (tut) { tutFrei(); afterSplash(() => setTimeout(tutStarten, 600)); }
