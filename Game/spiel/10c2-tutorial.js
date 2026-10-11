// Teil 10c2-tutorial.js: Tutorial für neue Spieler (Burg 1 → 3) im echten Spiel: dunkel mit Loch, Finger, Berater, Knöpfe kommen nach und nach
// ===== TUTORIAL (Alexander 10.10., Drehbuch scratchpad/tutorial/DREHBUCH.md) =====
// Ein neuer Spieler sieht zuerst fast nichts: oben Münzen, unten keine Knöpfe. Jeder Schritt zeigt mit dem Finger auf ein ECHTES
// Element (Knopf, Gebäude-Schild in der Stadt, Basis auf der Karte); nur dort nimmt das Dunkel Tipps an. Was ein Schritt braucht,
// kommt mit „Neu: …“ dazu (body.tz-<teil> blendet aus, Stil in 02). Bündnis, Events, Teleport … erst nach dem Tutorial, nach Burg-Stufe.
// Stand im Spielstand (openWaterTutorial, geht mit dem Profil): { s Schritt, frei [Teile], t0 Start des Schritts, z1/z2 Ziel-Basen,
// g Geschenke gegeben, fertig, alles (übersprungen: alles sichtbar) }. Alte Spielstände ohne diesen Wert sehen alles wie bisher.
// Geschenke über die normalen Wege (gibBelohnung, Abholfach) – das Hauptbuch hat dafür Spielraum (10d3 hbNeu: fr.bm, fr.s1).
// Bilder: Finger (einstieg_finger), Berater (einstieg_berater) und Banner (banner_neu) sind noch Platzhalter (Stil 02).
const TUT_KNOPF = { stadt: 'cityNavBtn', kampf: 'battleLogBtn', events: 'goalsBtn', rucksack: 'rucksackBtn', shop: 'shopBtn', profil: 'profileBtn', bund: 'bundBtn' };   // Teile mit Knopf in der Leiste unten
const TUT_KAPSEL = { roh: '#hudRoh .res', truppen: '#hud .res--troop', gems: '#hud .res--gem' };
const TUT_TEILE = ['stadt', 'roh', 'kampf', 'events', 'truppen', 'shop', 'profil', 'rucksack', 'aufgaben', 'karte', 'gems', 'shopmehr', 'bund', 'rang', 'events2', 'welt'];
const TUT_NAME = { stadt: 'Stadt', roh: 'Rohstoffe', kampf: 'Kampf', events: 'Abholen', truppen: 'Truppen', shop: 'Shop', profil: 'Profil', rucksack: 'Rucksack',
    aufgaben: 'Aufgaben', bund: 'Bündnis', rang: 'Rangliste', events2: 'Events', welt: 'Teleport und Thron' };
const TUT_ICON = { stadt: 'castle', roh: 'wood', kampf: 'battlelog', events: 'shop', truppen: 'troops', shop: 'shop', profil: 'profile', rucksack: 'crate', aufgaben: 'flag', bund: 'bund', rang: 'crown', events2: 'event', welt: 'send' };
const TUT_GEMS = 100;                                           // Belohnung am Ende (Alexander 10.10.; Hauptbuch-Spielraum 10d3 hbNeu fr.g)
const TUT_ENDE = ['karte', 'gems', 'shopmehr'];                  // dazu am Ende des Tutorials
const TUT_BURG = { bund: 4, rang: 4, events2: 5, welt: 6 };      // danach: ab dieser Burg-Stufe (Vorgabe-Tabelle design_einstieg.md, an die echten Gebäude angepasst)
var tut = (() => { try { const v = JSON.parse(store.get('openWaterTutorial')); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } })();
const tutFrisch = () => playerLvl <= 1 && (loadCity().levels.keep || 1) <= 1 && CITY_BUILDINGS.every(b => !loadCity().levels[b.id]);
if (!tut && !SYSTEM && (window.__OW ? __OW.neu || tutFrisch() : !window.__owOhneTutorial && tutFrisch()))   // auch offline (Vorschau); Test-Vorschauen schalten es ab
    tut = { s: 0, frei: [], g: {}, t0: Date.now(), neu: true };   // (ganz neu – auch wenn er vor dem ersten Speichern neu lädt)
if (tut && tut.s > 0 && !tut.w) tut.w = 1;                       // (Stände von vor dem Willkommen: nicht noch mal begrüßen)
function tutLaeuft() { return !!(tut && tut.neu && !tut.fertig); }
function tutSpeichern() { try { tut.k = TUT[tut.s].k; } catch (e) {} store.set('openWaterTutorial', JSON.stringify(tut)); }   // (k: der Schritt beim Namen)
const tutTat = {};                                               // was im laufenden Schritt passiert ist (Angriff, Kiste, „Weiter“)
const $t = id => document.getElementById(id);
const tutSicht = el => el && el.getClientRects().length && el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden' ? el : null;
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
    const n = cityNamen.find(x => x.id === key); if (n) return { r: n, fokus: () => cityFocus(key), endY: tutStadtY(key) };   // (Schild halb draußen/unter der Blase: Stadt neu ausrichten)
    cityFocus(key); return { endY: tutStadtY(key) };              // (Stadt kommt noch: die Seite der Blase schon wählen)
}
function tutStadtY(key) {                                        // wo das Schild stehen wird, wenn die Kamera dort ist (Handy: die Stadt rollt kaum hoch und runter)
    const o = cityOrt(key); if (!o) return undefined;
    const z = cityCam ? cityCam.z : cityZMin(innerWidth, innerHeight), hh = innerHeight / 2 / z, y = Math.max(hh, Math.min(CITY_BILD_H - hh, o.y));
    return innerHeight / 2 + (o.sy - y) * z;
}
function tutBauWarte(id) {                                       // ein Bau läuft: warten, mit Fortschritt
    const b = cityBuildOf(loadCity(), id) || {};
    return { warte: 'Kurz warten – der Bau läuft. Gleich fertig!', fort: b.endsAt ? (Date.now() - b.startedAt) / Math.max(1, b.endsAt - b.startedAt) : 0 };
}
// Teilschritte: je Klick ein eigener Satz, Punkte zeigen, wo man ist (n von „von“)
const tutT = (n, von, ziel, satz) => ({ ziel, satz, n, von });
// Erklär-Teilschritt (Design tutorial3: „so liest du das“): Loch auf dem Kasten, „Weiter“ hakt ihn ab (tut.e), der Schritt läuft weiter
const tutGesehen = k => !!(tut.e && tut.e[k]);
const tutE = (k, ziel, satz, n, von) => tutGesehen(k) ? null : { ...tutT(n, von, ziel, satz), erkl: k };
const tutZahl = n => fmtNum(Math.round(n));
const tutUnd = l => l.length > 1 ? l.slice(0, -1).join(', ') + ' und ' + l[l.length - 1] : l[0] || '';
const tutKost = (id, L) => { const k = AUF ? AUF.stadtKosten(id, L === undefined ? tutStufe(id) : L) : { c: cityCost(id, tutStufe(id)) };   // „330 Münzen und 90 Holz“ (echte Kosten)
    return tutUnd([[k.c, 'Münzen'], [k.h, 'Holz'], [k.s, 'Stein'], [k.e, 'Eisen']].filter(x => x[0] > 0).map(x => tutZahl(x[0]) + ' ' + x[1])); };
const tutSek = n => n === 1 ? '1 Sekunde' : n + ' Sekunden';
const tutRest = id => { const b = cityBuildOf(loadCity(), id); return b ? Math.max(1, Math.ceil((b.endsAt - Date.now()) / 1000)) : 0; };
const tutDauer = sek => sek < 60 ? sek + ' Sekunden' : Math.round(sek / 60) === 1 ? '1 Minute' : Math.round(sek / 60) + ' Minuten';
const tutRoh = x => AUF ? Math.round(AUF.rohJeStunde(x, Math.max(1, tutStufe({ h: 'lumber', s: 'quarry', e: 'mine' }[x])))) : 0;   // Rohstoff pro Stunde (mit Gebäude Stufe 1)
const tutHeld = () => { const h = HEROES.find(x => heroOwned('player', x.id)); return h ? h.name : 'dein Held'; };
function tutBauT(id, t) {                                        // bauen/aufwerten: Stadt → Schild → Bauen → (läuft) warten; t: { stadt, schild, bauen, warte(Sek.) }
    if (tutBaut(id)) { let zg = t.zeig && [].concat(t.zeig() || []).filter(e => e && tutSicht(e)); if (zg && !zg.length) zg = null;   // (während des Wartens: im offenen Fenster etwas erklären, z. B. was Burg 2 freischaltet)
        return { ...tutBauWarte(id), satz: zg && t.zeigSatz ? t.zeigSatz : t.warte ? t.warte(tutRest(id)) : 'Noch ' + tutSek(tutRest(id)) + ' …', zeig: zg || null }; }
    const z = tutGeb(id);
    if (z === $t('cityNavBtn')) return tutT(1, 4, z, t.stadt || 'Tipp auf „Stadt“.');
    if (z === $t('citySheetClose')) return tutT(2, 4, z, 'Das ist das falsche Gebäude – schließ das Fenster.');
    if (z && z.dataset && z.dataset.cring) return tutT(3, 4, z, 'Tipp auf „' + ((z.querySelector('small') || {}).textContent || 'Bauen') + '“.');   // (runder Knopf: sein Wort; die Kosten stehen erst im Fenster)
    if (z && z.id === 'cityUpgradeBtn') return tutT(4, 4, z, t.bauen);
    return tutT(2, 4, z, t.schild);
}
function tutBeschT(id, satz) {                                   // ein Bau läuft: Beschleuniger drauf (Knopf → 1-Min.-Kachel)
    const z = tutBesch(id);
    if (z && z.warte) return { ...z, satz: 'Noch ' + tutSek(tutRest(id)) + ' …' };
    return isPanelOpen(beschPopup) ? tutT(2, 2, z, 'Tipp den Beschleuniger – sofort fertig!') : tutT(1, 2, z, satz);
}
function tutReihe(teile, von) {                                  // Knopf → Reiter → Ziel: das erste noch nicht erledigte Teil [Ziel oder null, Satz]
    const i = teile.findIndex(([z]) => z); if (i < 0) return { weiter: true };
    return tutT(i + 1, von || teile.length, teile[i][0], teile[i][1]);
}
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
    if (tutFlug !== tut.s) { tutFlug = tut.s; flyTo(i.x, i.y, { screenY: viewH * .38 }); }
    const r = Math.max(26, ISLAND_RADIUS * mapState.zoom * 1.2);
    return { r: { x: toSX(i.x) - r, y: toSY(i.y) - r, w: 2 * r, h: 2 * r }, rund: true, fokus: () => flyTo(i.x, i.y, { screenY: viewH * .38 }) };
}
let tutFlug = -1, tutRollt = -1;
function tutHeim(sofort) {                                       // Kamera nah auf die eigene Hauptstadt („deine Stadt“), über der Sprechblase
    const h = islandById[playerIslandId]; if (h) flyTo(h.x, h.y, { zoom: Math.min(maxZoom, viewH * .3 / BASIS_BREITE), screenY: viewH * .45, instant: !!sofort });   // (Desktop: die Burg ganz im Bild)
}
const TUT_OHNE = { z1: 'Gerade ist keine freie Basis nah genug. Merk dir: jede Basis bringt Münzen und Truppen, jede Stunde.',
    z2: 'Bei jedem Angriff kannst du einen Helden mitschicken – er macht ihn stärker.' };
const tutZurKarte = () => tutSicht($t('cityCloseBtn')) || $t('cityNavBtn');   // (Handy: der Stadt-Knopf unten heißt dann „Karte“)
function tutNeutral(ohne, von) {                                 // die nächste neutrale, sichtbare Basis (nicht die schon angegriffene), von „von“ aus (sonst der Hauptstadt)
    const h = islandById[von !== undefined ? von : playerIslandId], weg = new Set([ohne, ...pendingAttacks.filter(a => !a.attackerBotId).map(a => a.targetId)]);
    return (islands.filter(i => i.id !== playerIslandId && !weg.has(i.id) && !islandOwnerOf(i.id) && !bossAt(i.id) && i.type === 'tower' && islandSeen(i) && canReach(h.landmassId, i.landmassId))
        .sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0] || {}).id;
}
function tutAngriff(feld, held) {                                // Karte → Basis antippen → Angreifen → (Held wählen) → Losmarschieren; je Teilschritt ein eigener Satz mit Zähler
    if (tut[feld] === undefined || (!isPanelOpen(popup) && islandOwnerOf(tut[feld]))) { tut[feld] = tutNeutral(tut.z1, held && [...ownedIslands].includes(tut.z1) ? tut.z1 : undefined); tutSpeichern(); }   // (Held: nah an der eroberten Basis – dort stehen die Truppen)
    const id = tut[feld]; if (id === undefined) return { weiter: true, satz: TUT_OHNE[feld] };   // (keine Basis in Reichweite: nur erklären)
    const von = 5, T = (n, ziel, satz) => tutT(n, von, ziel, satz), H = tutHeld();
    const proStd = tutZahl(proStunde(coinsPerTick(islandLevels[id] || 1) * playerCoinMult()));
    if (!cityView.hidden) return T(1, tutZurKarte(), held ? (tutGesehen('halle') ? 'Nimm ' + H + ' gleich mit in einen Angriff – geh zur Karte.' : 'Dein erster Held ist ' + H + '. Nimm den Helden gleich mit in einen Angriff – geh zur Karte.') : 'Eine freie Basis bringt dir +' + proStd + ' Münzen pro Stunde. Geh zur Karte.');
    if (isPanelOpen(popup) && popupIslandId !== id) return T(2, $t('closeBtn'), 'Das ist die falsche Basis – schließ das Fenster.');
    if (isPanelOpen(popup)) {
        if (popupView !== 'preview') return T(3, tutSicht(attackBtn), held ? 'Tipp auf „Angreifen“.' : 'Freie Basen sind schwach bewacht – deine Truppen reichen. Tipp auf „Angreifen“.');
        if (held && !previewHero) {
            const chip = tutSicht(document.querySelector('#islandPopup [data-hero]:not([data-hero=""]):not([disabled])'));
            if (chip) { const h = HEROES.find(x => x.id === chip.dataset.hero); return T(4, chip, 'Wähl ' + (h ? h.name : H) + '.'); }
            const fd = tutSicht(document.querySelector('#islandPopup [data-held-auf="1"]'));
            if (fd) return T(4, fd, 'Tipp aufs Held-Feld und wähl ' + H + '.');
            return T(5, tutSicht(attackBtn), H + ' ist noch unterwegs – diesmal ziehst du ohne Helden los.');   // (keine Helden-Chips: ehrlich sagen)
        }
        if (!held) { const zt = (document.querySelector('#islandPopup [data-preview="zeit"]') || {}).textContent;
            const da = islandTroops[playerIslandId] || 0;   // (die Zahl im Fenster: alle Truppen der Hauptstadt – zum Lager ging nur ein Teil)
            const e = tutE('angriff', { els: [document.querySelector('#islandPopup .ap-truppen'), document.querySelector('#islandPopup .ap-leiste')] },
                (da ? 'In deiner Hauptstadt stehen ' + tutZahl(da) + ' Truppen. ' : '') + 'Mit dem Regler wählst du, wie viele mitgehen. Unten: Marschzeit' + (zt ? ' ' + zt : '') + ' und deine Angriffskraft.', 4, von); if (e) return e; }
        return T(von, tutSicht(attackBtn), held ? (previewHero ? (HEROES.find(x => x.id === previewHero) || {}).name || H : H) + ' führt an – marschier los!' : 'Alles bereit – marschier los!');
    }
    return T(2, tutInsel(id), held ? 'Tipp die nächste freie Basis – ' + H + ' kommt mit.' : 'Tipp die leuchtende Basis – sie gehört noch niemandem.');
}
function tutLager() {                                           // das eigene Lager der Stufe 1 (09b barbNeulingLager) antippen → Angreifen
    if (!cityView.hidden) return tutT(1, 2, tutZurKarte(), 'Tipp auf „Karte“.');   // (zuerst: ein Lager-Fenster unter der Stadt ist nicht zu sehen)
    if (!barbSheetEl.hidden && barbView && barbView.kind === 'camp') { const b = document.querySelector('#barbSheet [data-bgo]:not([disabled])');
        return b ? tutT(2, 2, b, 'Barbaren wehren sich – Verluste sind normal, die Beute lohnt sich. Tipp auf „Angreifen“!') : tutT(2, 2, document.querySelector('#barbSheet [data-bclose]'), 'Schließ das Fenster.'); }
    const c = barbState.camps.filter(x => x.fuer && barbFuerOk(x, 'player'))[0] || barbNearest();
    if (!c) return { weiter: true, satz: 'Barbaren-Lager bringen Münzen. Gerade ist keines in deiner Nähe – schau später auf der Karte.' };
    const h = islandById[playerIslandId], d = Math.hypot(c.x - h.x, c.y - h.y) || 1;   // Kamera: Hauptstadt und Lager zusammen im Bild (dazu ein paar Basen)
    const hin = () => flyTo((c.x + h.x) / 2, (c.y + h.y) / 2, { zoom: Math.min(maxZoom, Math.max(.008, .5 * Math.min(viewW, viewH * .55) / d)), screenY: viewH * .3 });   // (über der Blase unten)
    if (tutFlug !== tut.s) { tutFlug = tut.s; hin(); }
    const k = barbK(), p = barbScreen(c), r = Math.max(24, 22 * k);
    return tutT(1, 2, { r: { x: p.x - r, y: p.y - r - 4 * k, w: 2 * r, h: 2 * r }, rund: true, fokus: hin },
        'Siehst du das Lager? Nur ' + tutZahl(c.t || barbTroopsOf(c.L)) + ' Barbaren – und sie bewachen ' + tutZahl(lagerMuenzen(c.L)) + ' Münzen. Tipp drauf!');
}
function tutMarschWarte() {                                      // Marsch zum Lager: warten, mit Fortschritt
    const m = barbMarches.find(x => x.who === 'player' && !x.back);
    return { warte: m ? tutZahl(m.troops) + ' Truppen marschieren – das Schild über ihnen zeigt Zahl und Restzeit: noch ' + tutSek(Math.max(1, Math.ceil((m.resolveAt - Date.now()) / 1000))) + '.' : 'Gleich kommt der Kampf …',
        fort: m ? (Date.now() - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt) : 1 };
}
function tutFenster(panel, knopf) { return isPanelOpen(panel) ? null : $t(knopf); }   // Fenster zu: der Knopf, der es öffnet

// ---- die Schritte (Drehbuch scratchpad/design_tutorial2.md): Satz (auch als Funktion: Zahlen live aus dem Spiel), Ziel, fertig, freude (schwebt auf) ----
const tutBurgK = () => AUF ? AUF.stadtKosten('keep', 1) : {}, tutRohJetzt = x => tutZahl((AUF && AUF.rohVon('player') || {})[x] || 0);
const tutAngriffe = () => pendingAttacks.filter(a => !a.attackerBotId);   // eigene Angriffe: unterwegs oder im Kampf (fightEndsAt)
const tutUnterwegs = () => [...tutAngriffe(), ...pendingRetreats.filter(r => r.resolveAt > Date.now())];   // dazu Truppen auf dem Heimweg
const TUT = [
    { k: 'muenzen', nah: 1, satz: () => 'Das sind deine ' + tutZahl(Math.floor(coins)) + ' Münzen. Bald werden es viel mehr – du brauchst sie für Burg-Stufen, Forschung und Helden.', ziel: () => ({ el: document.querySelector('#hud .res--coin') }) },
    { k: 'r_holz', nah: 1, neu: ['roh'], satz: () => 'Holz ist dein wichtigstes Baumaterial – ' + tutRohJetzt('h') + ' hast du. Gleich baust du dir einen Holzfäller, dann kommt jede Stunde neues.', ziel: () => ({ el: document.querySelector('#hud .res--h') }) },
    { k: 'r_stein', nah: 1, satz: () => 'Stein und Eisen brauchst du für die Burg: Burg 2 kostet ' + tutZahl(tutBurgK().s || 0) + ' Stein und ' + tutZahl(tutBurgK().e || 0) + ' Eisen. Eisen ist am knappsten.',
      ziel: () => ({ els: [document.querySelector('#hud .res--s'), document.querySelector('#hud .res--e')] }) },
    { k: 'r_gems', nah: 1, zeig: 'gems', satz: () => 'Edelsteine sind das Seltenste im Spiel – ' + (gems >= 1 ? 'du hast ' + tutZahl(Math.floor(gems)) + '.' : 'du hast noch keine.') + (tut.belohnt ? '' : ' Am Ende des Rundgangs bekommst du welche.'),
      ziel: () => ({ el: document.querySelector('#hud .res--gem') }) },
    { k: 'holz', neu: ['stadt'], vor: () => tutGeschenk('b', 'Geschenk', [['besch', 2, { dauer: '1m' }]], tut.belohnt ? '' : 'Edelsteine gibt es am Ende – jetzt erst mal das hier:'), fertig: () => tutStufe('lumber') > 0 || tutBaut('lumber'),
      ziel: () => { const z = tutBauT('lumber', { stadt: 'Ohne Holz steht alles still. Tipp auf „Stadt“.', schild: 'Hier ist der Platz für den Holzfäller – tipp drauf.', bauen: 'Kostet nur ' + tutKost('lumber') + '. Tipp auf „Bauen“!' });
          if (!z || !z.von) return z;
          const e = z.ziel === $t('cityUpgradeBtn') && tutE('bauinfo', { els: [$t('cityBNote'), document.querySelector('#cityBStats .anf-list')] },
              'Oben steht, was der Bau bringt: +' + tutZahl(tutRoh('h')) + ' Holz pro Stunde. Unten die Kosten – grüner Haken heißt: du hast genug.', 4, 5);
          return e || { ...z, von: 5, n: z.n === 4 ? 5 : z.n }; } },   // (Stadt, Schild, runder Knopf, Erklärung, Bauen)
    { k: 'tempo', bleib: true, bau: 'lumber', fertig: () => tutStufe('lumber') > 0, freude: () => '+' + tutZahl(tutRoh('h')) + ' Holz pro Stunde',
      ziel: () => tutBeschT('lumber', tutDauer(tutRest('lumber')) + ' sind zu lang für einen Feldherrn! Nimm einen Beschleuniger – sofort fertig.') },
    { k: 'stein', bau: 'quarry', fertig: () => tutStufe('quarry') > 0, freude: () => '+' + tutZahl(tutRoh('s')) + ' Stein pro Stunde',
      ziel: () => tutBauT('quarry', { schild: 'Jetzt Stein: Bau den Steinbruch – ' + tutKost('quarry') + '.', bauen: 'Jetzt Stein: Bau den Steinbruch – ' + tutKost('quarry') + '.',
          warte: n => 'Noch ' + tutSek(n) + ' – dann bricht er jede Stunde ' + tutZahl(AUF ? AUF.rohJeStunde('s', 1) : 0) + ' Stein.' }) },
    { k: 'eisen', bau: 'mine', fertig: () => tutStufe('mine') > 0, freude: () => '+' + tutZahl(tutRoh('e')) + ' Eisen pro Stunde',
      ziel: () => tutBauT('mine', { schild: 'Fehlt nur noch Eisen: Bau die Eisenmine.', bauen: 'Die Eisenmine kostet ' + tutKost('mine') + '. Tipp auf „Bauen“!',
          warte: n => 'Noch ' + tutSek(n) + ' – dann laufen alle drei Rohstoffe von allein.' }) },
    { k: 'burg2', bau: '_keep', fertig: () => tutStufe('keep') >= 2, freude: () => 'Burg 2!', freudeBild: 'castle',
      ziel: () => tutBauT('keep', { schild: 'Die Burg bestimmt, wie hoch alles wachsen darf. Tipp auf die Burg.', bauen: tutKost('keep') + ' – du hast genug. Tipp auf „Aufwerten“!',
          zeig: () => { const l = document.querySelector('#citySheet:not([hidden]) .auf-frei'); return l && [l.previousElementSibling, l]; },   // (mit Überschrift)
          zeigSatz: 'Die Burg-Stufe ist die Grenze für alle Gebäude. Hier steht, was Burg 2 freischaltet.' }) },
    { k: 'karte', ruhe: 1500, satz: 'Deine Stadt steht. Jetzt raus aufs Meer – tipp auf „Karte“!', ziel: tutZurKarte, fertig: () => cityView.hidden },
    { k: 'lager', ziel: tutLager, fertig: () => barbMarches.some(m => m.who === 'player' && !m.back) || tutTat.lager },
    { k: 'marsch', ziel: tutMarschWarte,
      fertig: () => combatLog.some(e => e.type !== 'ausgespaeht' && e.at >= tut.t0 - 2000) || rechnet() && !barbMarches.some(m => m.who === 'player' && !m.back) && Date.now() - tut.t0 > 3000 || Date.now() - tut.t0 > 300000 },
    { k: 'bericht', neu: ['kampf'], ruhe: 2500, satz: () => (combatLog.some(e => e.type === 'barb' && e.won) ? 'Sieg! ' : '') + 'Im Bericht siehst du deine Verluste und die Beute.',
      ziel: () => { const kd = $t('klInhalt'), b = combatLog.filter(e => e.type === 'barb' && e.won).sort((x, y) => (y.at || 0) - (x.at || 0))[0];   // (Sieg: Verlust und Beute gleich nennen – sonst wirkt es wie eine Niederlage)
          const sieg = b ? 'Sieg! ' + (b.loss ? tutZahl(b.loss) + ' Truppen sind gefallen, aber ' : '') + (b.gold ? tutZahl(b.gold) + ' Münzen warten im Abholfach. ' : '') : '';
          if (kd && !kd.closest('.kl-seite').hidden) { const v = kd.querySelector('.logCompare') || kd;   // die Kampfdetails sind offen: was steht da?
              const g = kd.querySelector('.logRow details > :last-child') || kd.querySelector('.logGold') || v, sk = kd.closest('.kl-seite');   // (kleines Handy: hochrollen, bis unten Platz für Aldric ist – oben bleibt „Überspringen“ frei)
              if (tutRollt !== tut.s) { tutRollt = tut.s; const q = v.getBoundingClientRect(); if (g.getBoundingClientRect().bottom > innerHeight - 230) sk.scrollTop += Math.max(0, q.top - 110); }
              return tutT(4, 4, { els: [v, g] }, 'Oben du, darunter die Barbaren, ganz unten die Beute. Deine Basen ersetzen Gefallene: jede bringt stündlich neue Truppen.'); }
          return tutReihe([[tutFenster(battleLogPopup, 'battleLogBtn'), sieg + 'Tipp auf „Kampf“.'], [document.querySelector('#battleTabs [data-ktab="berichte"]:not(.active)'), 'Tipp auf „Berichte“.'],
              [tutSicht(combatLogListEl.querySelector('.logRow details > summary')), 'Das ist dein Kampfbericht. Tipp auf „Kampfdetails“ – da steht alles genau.']], 4); } },
    { k: 'beute', neu: ['events'], fertig: () => !inboxFach().length,
      satz: () => { const m = inboxFach().reduce((a, x) => a + (x.coins || 0), 0); return m ? tutZahl(m) + ' Münzen warten im Abholfach – dein erster Kriegsgewinn. Hol sie dir!' : 'Deine Beute liegt im Abholfach. Hol sie dir!'; },
      ziel: () => tutReihe([[tutFenster(goalsPopup, 'goalsBtn')], [goalsTab !== 'reward' ? document.querySelector('[data-ggrp="abholen"]') : null], [document.querySelector('#inboxList [data-inbox]')]]) },
    { k: 'basis', ziel: () => tutAngriff('z1'), fertig: () => tutTat.angriff },
    { k: 'truppen', neu: ['truppen'], satz: () => { const d = totalTroops(), u = tutUnterwegs().reduce((a, x) => a + (x.rawTroops || x.troops || 0), 0);   // (Kapsel oben = die in deinen Basen)
          return (u ? 'Du hast ' + tutZahl(d + u) + ' Truppen – ' + tutZahl(d) + ' in deinen Basen, ' + tutZahl(u) + ' unterwegs.' : 'Du hast ' + tutZahl(d) + ' Truppen in deinen Basen.') + ' Sie wachsen von allein – eine Kaserne brauchst du nicht.'; },
      ziel: () => { const u = tutAngriffe()[0], t = Date.now();     // (erst, wenn der Kampf um die Basis entschieden ist: dann stehen sie in deinen Basen)
          if (u && t - tut.t0 < 120000) return u.resolveAt > t ? { warte: 'Deine Truppen marschieren zur Basis – noch ' + tutSek(Math.max(1, Math.ceil((u.resolveAt - t) / 1000))) + '.', fort: (t - u.startedAt) / Math.max(1, u.resolveAt - u.startedAt) }
              : { warte: 'Deine Truppen kämpfen um die Basis …', fort: u.fightEndsAt ? (t - u.resolveAt) / Math.max(1, u.fightEndsAt - u.resolveAt) : .5 };
          return { el: document.querySelector('#hud .res--troop') }; } },
    { k: 'halle', bau: 'heroes', fertig: () => tutStufe('heroes') > 0, freude: () => 'Heldenhalle Stufe 1',
      ziel: () => tutBauT('heroes', { stadt: 'Helden führen deine Truppen und machen jeden Angriff stärker. Tipp auf „Stadt“.', schild: 'Bau die Heldenhalle – ' + tutKost('heroes') + '.', bauen: 'Bau die Heldenhalle – ' + tutKost('heroes') + '.',
          warte: n => 'Noch ' + tutSek(n) + ' – dann führen Helden deine Angriffe an und machen deine Truppen stärker.' }) },
    { k: 'helden', bleib: true, fertig: () => tutGesehen('halle') || !tutStufe('heroes') || !HEROES.some(h => heroOwned('player', h.id)),
      ziel: () => { const H = HEROES.find(h => heroOwned('player', h.id));
          if (!$t('heroHall').hidden) { const k = document.querySelector('#heroHall .hh-card[data-hh="' + H.id + '"]');
              return k ? tutE('halle', { el: k }, 'Das ist ' + H.name + '. Die Sterne zeigen, wie stark ein Held ist – Splitter aus Helden-Kisten bringen mehr.', 2, 2) : null; }   // (Karte kommt gleich)
          const z = tutGeb('heroes', 'nutz');
          if (z && z.dataset && (z.dataset.cring || z.dataset.cpage)) return tutT(1, 2, z, 'Fertig! Tipp auf „Helden“.');
          return tutT(1, 2, z, z === $t('cityNavBtn') ? 'Schau dir deine Helden an. Tipp auf „Stadt“.' : z === $t('citySheetClose') ? 'Schließ das Fenster.' : 'Tipp auf die Heldenhalle.'); } },
    { k: 'kiste', neu: ['shop'], satz: 'Öffne mit einem Schlüssel die Helden-Kiste.', vor: () => setTimeout(() => { if (tutLaeuft() && TUT[tut.s].k === 'kiste') tutGeschenk('k', 'Geschenk', [['schluessel1', 2]]); }, 1500), fertig: () => tutTat.kiste_held,   // (erst Aldrics Satz, dann das Geschenk)
      ziel: () => tutReihe([[tutFenster(shopPopup, 'shopBtn'), 'Zwei Schlüssel von mir! Tipp auf „Shop“.'], [document.querySelector('#shopTabs [data-stab="gems"]:not(.active)'), 'Tipp auf „Kisten“.'],
          [schluessel1 ? document.querySelector('[data-kiste="held"][data-anz="1"]') : null, 'Öffne mit einem Schlüssel die Helden-Kiste.']]) },
    { k: 'held', ziel: () => { const u = tutUnterwegs()[0];
          return u && Date.now() - tut.t0 < 120000 ? { warte: 'Deine Truppen sind noch unterwegs – noch ' + tutSek(Math.max(1, Math.ceil((u.resolveAt - Date.now()) / 1000))) + '.', fort: (Date.now() - u.startedAt) / Math.max(1, u.resolveAt - u.startedAt) } : tutAngriff('z2', true); }, fertig: () => tutTat.heldAngriff || tutTat.ok },
    { k: 'gratis', satz: 'Alle 8 Stunden schenkt dir der Shop eine Kiste – öffne sie!', fertig: () => gratisAb() > serverJetzt(),
      ziel: () => { const u = tutAngriffe()[0], t = Date.now();    // (erst, wenn der Angriff mit dem Helden entschieden ist und der Kampf auf der Karte vorbei – nicht mitten im Kampf ein neues Thema)
          if (!u && mapBattles.some(b => !b.done) && t - tut.t0 < 120000) return { warte: 'Dein Held kämpft um die Basis …', fort: .9 };
          if (u && t - tut.t0 < 120000) return u.resolveAt > t ? { warte: 'Deine Truppen marschieren mit dem Helden – noch ' + tutSek(Math.max(1, Math.ceil((u.resolveAt - t) / 1000))) + '.', fort: (t - u.startedAt) / Math.max(1, u.resolveAt - u.startedAt) }
              : { warte: 'Dein Held kämpft um die Basis …', fort: u.fightEndsAt ? (t - u.resolveAt) / Math.max(1, u.fightEndsAt - u.resolveAt) : .5 };
          return tutReihe([[tutFenster(shopPopup, 'shopBtn'), 'Alle 8 Stunden schenkt dir der Shop eine Kiste. Tipp auf „Shop“.'], [document.querySelector('#shopTabs [data-stab="gems"]:not(.active)'), 'Tipp auf „Kisten“.'],
          [document.querySelector('#shopKisten [data-gratis]'), 'Die erste Gratis-Kiste ist jetzt bereit – öffne sie!']]); } },
    { k: 'ausruestung', bleib: true, satz: 'Mit dem zweiten Schlüssel öffnest du die Ausrüstungs-Kiste.', fertig: () => tutTat.kiste_aus || Object.keys(inventory).length > 0,
      ziel: () => tutReihe([[tutFenster(shopPopup, 'shopBtn'), 'Tipp auf „Shop“.'],
          [schluessel1 ? document.querySelector('[data-kiste="aus"][data-anz="1"]') : null, 'Mit dem zweiten Schlüssel öffnest du die Ausrüstungs-Kiste. Ausrüstung macht dich stärker.']]) },
    { k: 'anlegen', neu: ['profil'], satz: 'Leg die Ausrüstung an – erst dann wirkt sie.', fertig: () => Object.values(equippedItems).some(Boolean), freude: () => 'Angelegt – jetzt wirkt sie!', freudeBild: 'weapon',
      ziel: () => { if (isPanelOpen(chestItemPopup)) { const b = chestItemStats.querySelector('b'), bonus = b && b.textContent.trim();   // (erste Zeile: was das Teil bringt)
              return tutT(3, 3, tutSicht(chestItemEquipBtn), (bonus ? 'Dieses Teil bringt dir ' + bonus + '. ' : '') + 'Tipp auf „Ausrüsten“.'); }
          if (!isPanelOpen(profilePopup)) { const pb = tutSicht($t('profileBtn')); return tutT(1, 3, pb || $t('hudPlayer'), 'Ausrüstung wirkt erst, wenn du sie anlegst. ' + (pb ? 'Tipp auf „Profil“.' : 'Tipp auf dein Wappen oben links.')); }   // (Handy: Profil über das Spielerbild oben)
          return profilePopup.dataset.tab !== 'equip' ? tutT(2, 3, $t('tabBtnEquip'), 'Tipp auf „Ausrüstung“.') : tutT(3, 3, document.querySelector('#chestInventoryGrid .tile[data-id]'), 'Tipp das neue Teil und dann „Ausrüsten“.'); } },
    { k: 'rucksack', neu: ['rucksack'], satz: 'Hier sammelt sich alles, was du gewinnst. Den Beschleuniger nimmst du mit in die Stadt.', fertig: () => !cityView.hidden || tutTat.ok,
      ziel: () => { if (!isPanelOpen(rucksackPopup)) return tutT(1, 2, $t('rucksackBtn'), 'Alles, was du gewinnst, landet im Rucksack. Tipp auf „Rucksack“.');   // (der Satz zum Inhalt erst, wenn er offen ist)
          const tab = document.querySelector('#rkInhalt [data-rk-tab="tempo"]:not(.on)'), z = document.querySelector('#rkInhalt [data-rk-stadt]') || tab;
          return tutT(2, 2, z || 'weiter', z === tab ? 'Hier sammelt sich alles, was du gewinnst. Tipp auf „' + tab.textContent.trim() + '“.' : 'Hier sammelt sich alles, was du gewinnst. Den Beschleuniger nimmst du mit in die Stadt.'); } },
    { k: 'burg3', bau: '_keep', fertig: () => tutStufe('keep') >= 3, freude: () => 'Burg 3! Gebäude jetzt bis Stufe 3', freudeBild: 'castle',   // (Desktop: der Rucksack lag sonst über dem Burg-Fenster)
      ziel: () => { if (isPanelOpen(rucksackPopup)) closePanel(rucksackPopup);
          return tutBaut('keep') ? tutBeschT('keep', 'Jetzt den Beschleuniger drauf – sofort fertig!')
              : tutBauT('keep', { schild: 'Burg 3 dauert ' + tutDauer(cityTimeSec('keep', tutStufe('keep'))) + '. Tipp auf die Burg und dann „Aufwerten“.', bauen: tutKost('keep').length <= 48 ? 'Burg 3: ' + tutKost('keep') + '. Tipp auf „Aufwerten“.' : 'Du hast alles. Tipp auf „Aufwerten“.' }); } },
    { k: 'labor', ruhe: 2000, fertig: () => !!loadCity().foRun || tutTat.ok,
      ziel: () => { if (!tutStufe('academy')) return tutBauT('academy', { schild: 'Im Labor wird alles stärker – für immer. Bau das Labor: ' + tutKost('academy') + '.', bauen: 'Im Labor wird alles stärker – für immer. Bau das Labor: ' + tutKost('academy') + '.',
              warte: n => 'Noch ' + tutSek(n) + ' – dann forschst du dort: jede Forschung macht dich für immer stärker.' });
          const z = tutGeb('academy', 'nutz'), zu = z === 'weiter' && tutSicht(document.querySelector('#citySheet .fo-go[disabled]'));
          if (zu) { const d = AUF.FORSCHUNG.find(x => x.id === zu.dataset.fo), k = d ? AUF.foKosten(d, AUF.foStufe('player', d.id) + 1) : {}, h = AUF.rohVon('player') || {};
              const rf = [['h', 'Holz', 'holz'], ['s', 'Stein', 'stein'], ['e', 'Eisen', 'eisen']].filter(([x]) => (k[x] || 0) > (h[x] || 0));
              if (rf.length && !tut.g.f) {                         // Burg 3 hat die Rohstoffe verbraucht: Aldric schenkt genau, was fehlt (einmal; Hauptbuch-Spielraum fr.r, 10d3)
                tutGeschenk('f', 'Geschenk', rf.map(([x, , a]) => [a, Math.ceil(k[x] - (h[x] || 0))]), 'Dir fehlt noch etwas – hier, von mir!'); return { warte: '…', fort: 1 }; }
              const fehlt = tutUnd(rf.map(([x, n]) => tutZahl(k[x] - (h[x] || 0)) + ' ' + n));   // (reicht es trotzdem nicht: ehrlich sagen, was fehlt, und weiter)
              return tutT(2, 2, { els: [document.querySelector('#citySheet .fo-detail .anf-list'), zu] }, (fehlt ? 'Für die erste Forschung fehlen noch ' + fehlt + '.' : 'Für die erste Forschung fehlt noch etwas.') + ' Deine Gebäude bringen jede Stunde neue – dann tippst du hier auf „Forschen“.'); }
          const f = z && z.dataset && AUF && AUF.FORSCHUNG.find(d => d.id === z.dataset.fo);
          return tutT(2, 2, z, f ? 'Starte die erste Forschung: „' + f.name + '“' + (f.pro ? ' – ' + f.txt(f.pro) + '.' : '.') : 'Starte die erste Forschung.'); } },
    { k: 'aufgaben', neu: ['aufgaben'], satz: 'Unter „Events“ findest du jeden Tag neue Aufgaben mit Belohnung. So wächst du am schnellsten.',
      ziel: () => { if (!isPanelOpen(goalsPopup)) return tutT(1, 3, $t('goalsBtn'), 'Unter „Events“ findest du jeden Tag neue Aufgaben mit Belohnung. Tipp auf „Events“.');
          const tab = document.querySelector('[data-ggrp="aufgaben"]:not(.active)'); if (tab) return tutT(2, 3, tab, 'Tipp auf „Aufgaben“ – so wächst du am schnellsten.');
          const ab = tutSicht(document.querySelector('#questList [data-quest]')), q = [...document.querySelectorAll('#questList .quest:not(.is-claimed)')].filter(tutSicht)   // (die mit dem vollsten Balken: da sieht man ihn)
              .map(x => [x, parseFloat((x.querySelector('.quest-bar i') || x).style.getPropertyValue('--p')) || 0]).sort((a, b) => b[1] - a[1]).map(x => x[0])[0];
          return ab ? tutT(3, 3, ab, 'Die hast du schon geschafft – hol dir die Belohnung!') : q ? tutT(3, 3, { el: q }, 'Der Balken zeigt, wie weit du bist. Rechts steht die Belohnung.') : 'weiter'; } }
];

// ---- Geschenke: Bild + Zahl im Beute-Fenster (einmal je Schlüssel g) ----
function tutGeschenk(g, titel, liste, unter) {
    if (tut.g[g]) return; tut.g[g] = 1; tutSpeichern();
    const aus = liste.map(([a, n, e]) => gibBelohnung(a, n, e)).filter(Boolean);
    saveGame(); saveProgression(); updateHud(); beuteFenster(titel, aus, unter ? { unter } : {});
}

// ---- Freischalten: was fehlt, ist ganz weg (body.tz-<teil>) ----
function tutBurgFrei() { const B = AUF ? AUF.burgStufe('player') : 1; return Object.keys(TUT_BURG).filter(k => B >= TUT_BURG[k]); }
let tutFreiAlt = null;
function tutFrei() {
    const zeig = tutLaeuft() && tut.w && TUT[tut.s] && TUT[tut.s].zeig;   // (nur in diesem Schritt kurz zeigen, z. B. Edelsteine)
    const gesperrt = tut && tut.neu && !tut.alles, frei = gesperrt ? new Set([...tut.frei, ...(tut.fertig ? tutBurgFrei() : []), ...(zeig ? [zeig] : [])]) : null;
    for (const k of TUT_TEILE) document.body.classList.toggle('tz-' + k, !!gesperrt && !frei.has(k));
    const leer = !!gesperrt && !Object.keys(TUT_KNOPF).some(k => frei.has(k)), bc = document.body.classList;   // noch kein Knopf frei: Leiste ganz weg
    if (bc.contains('tz-leiste') && !leer) tutRein($t('cornerButtons'));
    bc.toggle('tz-leiste', leer); bc.toggle('tut-schmal', tutLaeuft());   // im Tutorial: Leiste nur so breit wie ihre Knöpfe
    if (gesperrt) $t('cornerButtons').style.setProperty('--tut-n', Object.keys(TUT_KNOPF).filter(k => frei.has(k) && k !== 'profil').length || 1);
    if (!gesperrt) return;
    const neu = tutFreiAlt ? [...frei].filter(k => !tutFreiAlt.has(k) && TUT_NAME[k]) : [];
    tutFreiAlt = frei; if (!neu.length) return;
    if (tut.fertig) tutBanner(neu);                              // nach dem Tutorial (neue Burg-Stufe): „Neu: …“ oben
    for (const k of neu) {                                       // im Tutorial kein Banner: der Knopf fliegt ein, glüht und trägt „NEU“, bis er getippt wurde
        const b = $t(TUT_KNOPF[k]); if (b) { tutRein(b); b.classList.add('tut-neuer'); b.addEventListener('click', () => b.classList.remove('tut-neuer'), { once: true }); }
        if (TUT_KAPSEL[k]) for (const e of document.querySelectorAll(TUT_KAPSEL[k])) tutRein(e);   // neue Kapsel oben: fliegt an ihren Platz
    }
}
function tutRein(e) {                                            // neuer Knopf, neue Kapsel (oder die Leiste): kurz einblenden
    if (!e) return; e.classList.remove('tut-neu'); void e.offsetWidth; e.classList.add('tut-neu');
    setTimeout(() => e.classList.remove('tut-neu'), 700);
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
let tutUhr = 0, tutFrage = false, tutErkl = null;
const TUT_BALD = TUT.findIndex(x => x.k === 'kiste');           // ab hier braucht es die Bilder aus BILDER_BALD (ladebildschirm.js, gleich nach dem Ladebild)
const tutBilderDa = () => !window.__bilderVorab || __bilderVorab.baldFertig;
function tutWeiter() {                                           // nächster Schritt: aufräumen, Neues freischalten, vorher-Aktion
    tut.s++; tut.t0 = Date.now(); for (const k of Object.keys(tutTat)) delete tutTat[k];
    if (tut.s >= TUT.length) return tutEnde();
    tutStart();
}
function tutStart() {
    const S = TUT[tut.s];
    if (!S.bleib) { closeAllPopups(); closePanel(beschPopup); if (!cityView.hidden) { cityRingZu(); cityOpenId = null; $t('citySheet').hidden = true; }
        if (!$t('heroHall').hidden) closeHeroHall(); const kl = document.querySelector('.kl-seite'); if (kl) kl.hidden = true; }   // (Heldenhalle, Kampfdetails: eigene Seiten)
    for (const k of S.neu || []) if (!tut.frei.includes(k)) tut.frei.push(k);
    tutSpeichern(); tutFrei(); if (S.vor) S.vor();
}
function tutEnde() {
    tut.fertig = true; for (const k of TUT_ENDE) if (!tut.frei.includes(k)) tut.frei.push(k);
    tutSpeichern(); tutFrei(); tutZeigen(); closeAllPopups();
    if (!tut.belohnt) {                                          // die Belohnung nur beim ersten Mal: gleich abgeholt, als Bild + Zahl (Hauptbuch-Spielraum fr.g, 10d3)
        tut.belohnt = true; tutSpeichern(); inboxAdd({ src: 'gift', title: 'Tutorial geschafft', gems: TUT_GEMS, crate: 0 });
        const x = inboxList().find(e => e.title === 'Tutorial geschafft'), aus = [];
        if (x && inboxClaim(x.id, aus)) { sfx('coin'); beuteFenster('Geschafft!', aus, { kiste: kisteVonR(0), unter: 'Wie versprochen: ' + TUT_GEMS + ' Edelsteine' }); renderInbox(); updateGoalsBadge(); }
    }
    const name = (store.get('openWaterPlayerName') || '').trim(), danach = () => {   // Aldric zum Schluss, erst nach dem Geschenk-Fenster; dann die tägliche Belohnung
        if (tutPause()) return setTimeout(danach, 500);
        flashHint(tut.nochmal ? 'Tutorial geschafft. Viel Spaß!' : 'Gut gemacht' + (name ? ', ' + name : '') + '! Nächstes Ziel: Burg 4 – dann kommen Bündnis und Rangliste.', 6000);
        setTimeout(maybeShowDaily, 6300);                          // (die tägliche Belohnung erst danach: nicht unter dem Satz)
    };
    setTimeout(danach, 400);
}
function tutRoller(e) {                                         // der rollende Kasten um ein Element (Fenster-Inhalt)
    for (let x = e && e.parentElement; x && x !== document.body; x = x.parentElement) if (x.scrollHeight > x.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(x).overflowY)) return x;
    return null;
}
const TUT_KLEBT = '.city-bfoot, .fo-go, .hh-actions, .kb-knoepfe, .bd-gf-fuss, .wo-ich, .ap-kopf, .lk-tabs';   // feste Leisten (sticky) in rollenden Fenstern
function tutInsBild(da) {                                        // Kästen ins Bild rollen – zwischen die festen Leisten (Bauen, Forschen …), wischen geht im Dunkel nicht
    const sc = tutRoller(da[0]); if (!sc) return;
    const L = da.filter(e => getComputedStyle(e).position !== 'sticky'), q = (L.length ? L : da).map(e => e.getBoundingClientRect());
    const v = sc.getBoundingClientRect(); let fo = v.top, fu = v.bottom;
    for (const k of sc.querySelectorAll(TUT_KLEBT)) { if (L.some(e => e.contains(k) || k.contains(e)) || !tutSicht(k) || getComputedStyle(k).position !== 'sticky') continue;
        const b = k.getBoundingClientRect(); if (b.top > v.top + v.height / 2) fu = Math.min(fu, b.top); else fo = Math.max(fo, b.bottom); }
    const o = Math.min(...q.map(x => x.top)), u = Math.max(...q.map(x => x.bottom));
    const d = u - o > fu - fo ? o - fo - 8 : u > fu - 4 ? u - fu + 8 : o < fo + 4 ? o - fo - 8 : 0;
    if (d) sc.scrollTop += d;
}
function tutZiel(z) {                                            // → { rect, weiter, warte, fort, satz, teil, fokus }
    if (!z) return {};
    if (z.ziel !== undefined) return { ...tutZiel(z.ziel), satz: z.satz, teil: z.n + '/' + z.von, erkl: z.erkl };   // Teilschritt (Angriff): eigener Satz + Zähler
    if (z === 'weiter') return { weiter: true };
    if (z.weiter) return { weiter: true, satz: z.satz };
    if (z.warte) { if (z.zeig) tutInsBild(z.zeig); return { warte: z.warte, fort: z.fort, satz: z.satz, ...(z.zeig ? { rect: tutUmriss(z.zeig), zeigNur: true, el: z.zeig[0] } : {}) }; }   // (Warten: dabei etwas im Fenster zeigen)
    if (z.els) { const da = z.els.filter(e => e && tutSicht(e)); if (!da.length) return {};   // mehrere Kästen zusammen (nur zeigen)
        tutInsBild(da); const q = da.map(e => e.getBoundingClientRect());
        const l = Math.min(...q.map(x => x.left)), t = Math.min(...q.map(x => x.top));
        return { rect: { left: l, top: t, width: Math.max(...q.map(x => x.right)) - l, height: Math.max(...q.map(x => x.bottom)) - t }, nurZeigen: true, el: z.els.find(Boolean) }; }
    if (z.endY !== undefined && !z.r && !(z instanceof Element)) return { endY: z.endY };
    if (z.r) return { rect: { left: z.r.x, top: z.r.y, width: z.r.w, height: z.r.h }, fokus: z.fokus, rund: z.rund, endY: z.endY };
    const el = z.el || z; if (!(el instanceof Element) || !tutSicht(el)) return {};
    const q = el.getBoundingClientRect(), $tut = $t('tut'), h = (x, y) => { $tut.classList.add('durch'); const e = document.elementFromPoint(x, y); $tut.classList.remove('durch'); return e; };   // (nicht ausblenden: das startet das Einblenden der Blase neu)
    if (el.classList.contains('res') || el.classList.contains('nav-btn')) {   // Rohstoff oben / Knopf unten: nur Bild + Zahl bzw. Schrift (ein einzelner Knopf geht sonst über die ganze Leiste)
        const t = [...el.children].filter(tutSicht).map(x => x.getBoundingClientRect());
        if (t.length) { const l = Math.min(...t.map(x => x.left)), o = Math.min(...t.map(x => x.top)), r = Math.max(...t.map(x => x.right)), u = Math.max(...t.map(x => x.bottom));
            if (el.classList.contains('nav-btn')) { const d = Math.max(r - l, u - o), cx = (l + r) / 2, cy = (o + u) / 2;   // runder Knopf unten: rundes Loch (kein helles Rechteck über der Leiste)
                return { rect: { left: cx - d / 2, top: cy - d / 2, width: d, height: d }, rund: true, el }; }
            return { rect: { left: l, top: Math.min(o, q.top), width: r - l, height: Math.max(u, q.bottom) - Math.min(o, q.top) }, nurZeigen: !!z.el, el }; }
    }
    if (el.classList.contains('cr-btn')) { const w = el.querySelector('small'), b = w && tutSicht(w) ? w.getBoundingClientRect() : q;   // runder Knopf am Gebäude: mit seinem Wort darunter
        const l = Math.min(q.left, b.left), o = Math.min(q.top, b.top); return { rect: { left: l, top: o, width: Math.max(q.right, b.right) - l, height: Math.max(q.bottom, b.bottom) - o }, el }; }
    const mitte = h(q.left + q.width / 2, q.top + q.height / 2);   // verdeckt (Kopf/Leiste) oder halb draußen: in die Mitte der Liste rollen
    if (el.closest('.panel, .city-sheet') && !(mitte && (mitte === el || el.contains(mitte)))) { tutInsBild([el]); const m2 = el.getBoundingClientRect(), e2 = h(m2.left + m2.width / 2, m2.top + m2.height / 2);
        if (!(e2 && (e2 === el || el.contains(e2)))) el.scrollIntoView({ block: 'center' }); return { rect: el.getBoundingClientRect(), nurZeigen: !!z.el, el }; }
    return { rect: q, nurZeigen: !!z.el, el };
}
const TUT_LAGE = /^(transform|translate|scale|rotate|top|left|right|bottom|width|height|margin)/;   // Animationen, die ein Ziel verschieben
const tutFaehrt = el => !!document.getAnimations && document.getAnimations().some(a => { const t = a.effect && a.effect.target, z = t && a.effect.getComputedTiming();   // Ziel (oder sein Fenster) fährt noch ein
    return a.playState === 'running' && t && t.contains && t.contains(el) && isFinite(z.endTime) && !(z.progress >= .6) && a.effect.getKeyframes().some(k => Object.keys(k).some(n => TUT_LAGE.test(n))); });   // (ab 60 % steht es fast: Loch schon zeigen)
let tutBaldUhr = 0;
let tutBaldUm = 0;
function tutBald(ms) {                                           // gleich noch mal nachsehen (nicht erst beim nächsten Takt; ein früherer Wunsch gewinnt)
    if (tutBaldUhr && tutBaldUm <= Date.now() + ms) return; clearTimeout(tutBaldUhr); tutBaldUm = Date.now() + ms;
    tutBaldUhr = setTimeout(() => { tutBaldUhr = 0; if (tutLaeuft()) tutZeigen(); }, ms);
}
const tutUmriss = l => { const q = l.map(e => e.getBoundingClientRect()), x = Math.min(...q.map(v => v.left)), y = Math.min(...q.map(v => v.top));   // mehrere Kästen → ein Rechteck
    return { left: x, top: y, width: Math.max(...q.map(v => v.right)) - x, height: Math.max(...q.map(v => v.bottom)) - y }; };
const tutDeckt = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;   // zwei Rechtecke {l,t,r,b} überlappen
const tutBox = e => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; };
let tutLetzt = null;                                             // das letzte Loch (dort schwebt die Freude auf)
function tutFreude(text, bau, bild) {                                  // Freude-Moment: Satz/Zahl steigt am Gebäude-Schild (sonst am letzten Ziel) auf, nie über der Blase
    if (!text) return; const d = document.createElement('div'), n = bau && cityNamen.find(x => x.id === bau), b = tutBox($t('tutBerater'));
    let x = n ? n.x + n.w / 2 : tutLetzt ? (tutLetzt.l + tutLetzt.r) / 2 : innerWidth / 2, y = n ? n.y : tutLetzt ? tutLetzt.t : innerHeight * .45;
    if (y < 90 || (x > b.l - 60 && x < b.r + 60 && y > b.t - 10 && y < b.b + 50)) { x = innerWidth / 2; y = innerHeight * .4; }
    d.className = 'tut-freude' + (bild ? ' gross' : ''); liveHtml(d, (bild ? icon(bild) : '') + '<span>' + escapeHtml(text) + '</span>');   // (Burg-Stufe: groß, mit Bild, länger)
    Object.assign(d.style, { left: Math.round(Math.min(innerWidth - 120, Math.max(120, x))) + 'px', top: Math.round(y) + 'px' });
    document.body.appendChild(d); setTimeout(() => d.remove(), bild ? 2300 : 1300);
}
let tutFokusVor = null, tutAlt = null, tutLochAn = false, tutFokusZeit = 0, tutFokusN = 0, tutOhneSeit = 0, tutSchrittAlt = -1, tutFokusAb = 0;
// Blase ruhig (Alexander 11.10.: „Texte hüpfen“): je Bildschirm-Lage eine feste Seite – Karte/Stadt, Heldenhalle, Kampfdetails: unten; offenes Fenster: oben,
// das Fenster rückt darunter (kürzer, sein Inhalt rollt). Die Seite wechselt nur, wenn die Blase sonst das Loch deckte; im Schritt wird sie nur größer, nie kleiner.
let tutSeg = { k: '' }, tutDa = false, tutBildAb = 0, tutTippZeit = 0, tutZielEl = null;
const tutKurz = new Set();                                       // Fenster, die gerade unter der Blase gekürzt sind
const TUT_SPERRE = 300;                                          // nach einem Tipp so lange kein neues Ziel (ein Doppeltipp springt nicht weiter)
const tutFensterOffen = () => [...document.querySelectorAll('.panel.is-open'), ...(!cityView.hidden && !$t('citySheet').hidden ? [$t('citySheet')] : []), ...(!barbSheetEl.hidden ? [barbSheetEl] : [])];
function tutLage() {                                             // Bildschirm-Lage: welt (Karte/Stadt), fenster, halle, kl (Kampfdetails)
    if (!$t('heroHall').hidden) return 'halle';
    const kl = document.querySelector('.kl-seite'); if (kl && !kl.hidden) return 'kl';
    return tutFensterOffen().length ? 'fenster' : 'welt';
}
function tutKuerzen(fe, frei) {                                  // offene Fenster beginnen erst unter der Blase (nie wieder länger, solange sie offen sind)
    for (const w of tutKurz) if (!fe.includes(w)) { w.style.removeProperty('max-height'); w.style.removeProperty('min-height'); tutKurz.delete(w); }
    for (const w of fe) { const q = w.getBoundingClientRect(), cap = Math.floor(q.bottom - frei);
        if (q.top < frei - 1 && cap > 120) { w.style.setProperty('max-height', cap + 'px', 'important'); w.style.setProperty('min-height', '0px', 'important'); tutKurz.add(w); } }
}
function tutZeigen() {
    const el = $t('tut'); if (!el) return;
    tutFrei();
    document.body.classList.toggle('tut-an', tutLaeuft());       // (normale Hinweise oben ruhen solange: nie über Sprechblase, „Überspringen“ oder einem Geschenk-Fenster)
    if (!tutLaeuft()) { el.hidden = true; tutDa = false; tutKuerzen([], 0); if (tutUhr) { clearInterval(tutUhr); tutUhr = setInterval(tutFrei, 5000); } return; }   // fertig: nur noch die Burg-Stufen freischalten
    if (tutWillkommen() || tutPause()) { el.hidden = true; tutDa = false; return; }
    const S = TUT[tut.s];
    let weiter = false; try { weiter = !!(tutTat.ok || (S.fertig && S.fertig())); } catch (e) {}
    if (weiter) { sfx('upgrade'); try { if (S.freude) tutFreude(S.freude(), S.bau, S.freudeBild); } catch (e) {} tutWeiter(); if (!tutLaeuft()) return; return tutZeigen(); }
    let z = {}; try { z = tutZiel(S.ziel()); } catch (e) {}
    if (tut.s >= TUT_BALD && !tutBilderDa() && Date.now() - tut.t0 < 20000) { tutBildAb = tutBildAb || Date.now(); z = { warte: Date.now() - tutBildAb < 1200 ? '…' : 'Einen Moment – gleich geht es weiter.', fort: 0 }; tutBald(200); } else tutBildAb = 0;   // (Helden-/Kisten-Bilder noch nicht entpackt: kurz warten statt ins Leere zeigen)
    el.hidden = false;
    const W = innerWidth, H = innerHeight, jetzt = Date.now(), be = $t('tutBerater');
    if (tutSchrittAlt !== tut.s) { tutSchrittAlt = tut.s; tutOhneSeit = jetzt; tutFokusN = 0; tutAlt = tutFokusVor = null; tutFokusAb = 0; }
    if (S.ruhe && jetzt - tut.t0 < S.ruhe) { el.hidden = true; tutDa = false; return; }   // erst das Spiel zeigen lassen (z. B. „Lager besiegt“), dann Aldric
    if (S.nah && tutFlug !== tut.s && cityView.hidden) { tutFlug = tut.s; tutHeim(); }
    el.classList.toggle('is-hell', !!(S.nah || z.nurZeigen || z.weiter || z.rund));   // (auch Karten-Ziele: Burg, Lager und Basen gut sichtbar)   // Erklär-Schritt (nur „Weiter“): heller (Handlung: etwas dunkler)
    const rv = z.zeigNur || z.nurZeigen && z.el && z.el.closest && z.el.closest('.panel, .city-sheet, .kl-seite, #heroHall') ? 12 : 8;   // Erklär-Loch im Fenster: oben/unten etwas mehr Rand (keine angeschnittene Zeile, nicht über die Zeile darüber)
    let r = z.rect ? { l: z.rect.left - 8, t: z.rect.top - rv, r: z.rect.left + z.rect.width + 8, b: z.rect.top + z.rect.height + rv } : null;
    // Blase: feste Seite je Lage (oben: unter „Überspringen“); beide Lagen einmal ausmessen (ganzes Rechteck mit Berater-Bild)
    const lage = tutLage(), fe = lage === 'fenster' ? tutFensterOffen() : [];
    if (tutSeg.k !== tut.s + '|' + lage) tutSeg = { k: tut.s + '|' + lage, oben: lage === 'fenster', t0: jetzt };
    be.classList.toggle('klein', lage === 'fenster');             // Fenster offen: kleine Blase
    be.style.top = ''; be.classList.remove('oben'); const bu = tutBox(be); be.classList.add('oben'); const bo = tutBox(be); be.classList.toggle('oben', tutSeg.oben);
    const deckt = q => tutDeckt(tutSeg.oben ? bo : bu, q), seite = q => { if (deckt(q) && !tutDeckt(tutSeg.oben ? bu : bo, q)) { tutSeg.oben = !tutSeg.oben; be.classList.toggle('oben', tutSeg.oben); } };
    if (z.endY !== undefined) seite({ l: 0, r: W, t: z.endY - 40, b: z.endY + 130 });   // Stadt-Schild (+ runde Knöpfe darunter): die Seite gleich passend wählen (nicht erst nach dem Hinfahren springen)
    const gleitet = z.el && z.el.closest && z.el.closest('#cityRing') && cityCam && cityCam.tx !== undefined;   // (die Stadt gleitet noch zum Gebäude – der runde Knopf wandert mit)
    if (r && !z.fokus && !tutLochAn && lage !== 'fenster' && !gleitet && !(z.el && tutFaehrt(z.el))) seite(r);   // (Ziel fährt noch ein: Seite schon jetzt, bevor die Blase sichtbar woanders steht)
    if (r && z.fokus) {                                          // Ziel auf Karte/Stadt: erst zeigen, wenn es ganz im Bild steht und die Kamera ruht – spätestens nach 1,2 s trotzdem
        const kopf = Math.max(...['hud', 'tutWeg'].map(id => { const x = $t(id); return x && tutSicht(x) ? x.getBoundingClientRect().bottom : 0; }));
        const nav = $t('cornerButtons'), fuss = nav && tutSicht(nav) ? nav.getBoundingClientRect().top : H;
        const still = !cameraFlight && !(cityCam && cityCam.tx !== undefined);   // Karte fliegt nicht, Stadt gleitet nicht
        const ruht = still && tutAlt && Math.abs(tutAlt.l - r.l) < 3 && Math.abs(tutAlt.t - r.t) < 3;
        const drin = r.l >= -6 && r.r <= W + 6 && r.t >= kopf && r.b <= fuss && !deckt(r);   // (Ziel selbst ganz im Bild; der Rand ums Loch wird unten nach innen geschoben)
        const fest = ruht && tutFokusVor && Math.abs(tutFokusVor.l - r.l) < 3 && Math.abs(tutFokusVor.t - r.t) < 3;   // Hinfahren ändert nichts (Bildrand): so zeigen
        tutAlt = r; if (!tutFokusAb) tutFokusAb = jetzt;
        if (!drin && !fest && (ruht || !tutFokusN) && tutFokusN < 4 && jetzt - tutFokusZeit > 900) { tutFokusZeit = jetzt; tutFokusN++; tutFokusVor = r; z.fokus(); tutAlt = null; }   // (gleich hin, sonst noch einmal – nach 4 Versuchen gilt es so)
        const sicht = r.r > 0 && r.l < W && r.b > kopf && r.t < fuss, lange = sicht && jetzt - tutFokusAb > 800;   // (nie lange ohne Loch: ein Spieler wartet sonst vor „nichts“)
        if (!lange && (jetzt - tutFokusZeit < 350 || !(drin && (ruht || tutLochAn)) && !(ruht && (tutFokusN >= 4 || fest)))) r = null;   // (erst ausrollen lassen; schon gezeigt und noch drin: kein Flackern)
    }
    if (r && (cityBusy || gleitet || z.el && tutFaehrt(z.el))) r = null;   // Stadt blendet um, Fenster fährt noch ein: erst danach das Loch (ein Tipp genau aufs Ziel geht trotzdem durch, s. u.)
    const innen = q => { const w = Math.min(q.r - q.l, W - 4), hh = Math.min(q.b - q.t, H - 4), l = Math.min(Math.max(2, q.l), W - 2 - w), t = Math.min(Math.max(2, q.t), H - 2 - hh); return { l, t, r: l + w, b: t + hh }; };
    if (r) r = innen(r);                                         // Loch nie über den Bildrand: nach innen schieben (vor der Seitenwahl – so wie es gezeigt wird)
    const fw = r && z.el && z.el.closest && z.el.closest('.panel, .city-sheet, #barbSheet');   // Ziel im Fenster: Loch nicht über den Fensterrand (nicht über Leiste oder Karte)
    if (fw) { const q = fw.getBoundingClientRect(); r = { ...r, t: Math.max(r.t, q.top), b: Math.min(r.b, q.bottom) }; if (r.b - r.t < 16) r = null; }
    if (r && lage === 'fenster' && deckt(r)) { const ob = bo.b + 2; if (z.rect && z.rect.top >= ob - 4) r.t = Math.max(r.t, ob); else r = null; }   // (Fenster rückt erst unter die Blase)
    if (r && jetzt - tutTippZeit < TUT_SPERRE) { r = null; tutBald(TUT_SPERRE + 20 - (jetzt - tutTippZeit)); }   // gerade getippt: das nächste Loch erst gleich (kein Doppeltipp hinein)
    if (!r && (cityBusy || z.el || z.fokus)) tutBald(80);
    if (r && lage !== 'fenster') seite(r);                       // das Loch nie unter der Blase: dann (für diesen Schritt) die andere Seite
    if (r || !z.fokus) tutFokusAb = 0;
    tutZielEl = !r && z.el && !z.nurZeigen && !z.zeigNur && !cityBusy ? z.el : null;
    tutLochAn = !!r; if (r) tutLetzt = r;
    if (r || z.weiter || z.nurZeigen) tutOhneSeit = jetzt;
    const not = !r && !z.weiter && !(z.warte && z.fort < 1) && jetzt - tutOhneSeit > 20000;   // hängt der Schritt ohne Ziel (nicht beim Warten mit Fortschritt): „Weiter“ als Notausgang
    const ok = !!(z.weiter || z.nurZeigen || not);
    el.classList.toggle('is-frei', !!z.warte);                   // warten (Marsch, Bau): nicht abdunkeln, nur nichts antippen
    const loch = r ? { l: Math.round(r.l), t: Math.round(r.t), r: Math.round(r.r), b: Math.round(r.b) } : { l: 0, t: H, r: 0, b: H };   // (ganze Pixel: die vier Teile stoßen ohne dunkle Naht aneinander)
    const teil = (n, l, t, w, h) => { const d = el.querySelector('[data-tut-d="' + n + '"]'), s = [l, t, w, h].map(v => Math.max(0, Math.round(v)) + 'px');
        if (d.dataset.s !== s.join()) { d.dataset.s = s.join(); Object.assign(d.style, { left: s[0], top: s[1], width: s[2], height: s[3] }); } };
    teil('o', 0, 0, W, loch.t); teil('u', 0, loch.b, W, H - loch.b); teil('l', 0, loch.t, loch.l, loch.b - loch.t); teil('r', loch.r, loch.t, W - loch.r, loch.b - loch.t);
    const sp = $t('tutSperre'), lo = $t('tutLoch'); sp.hidden = !(r && (z.nurZeigen || z.zeigNur)); lo.hidden = !r; lo.classList.toggle('rund', !!z.rund);   // Basis/Lager auf der Karte: rundes Loch   // nur gezeigt (Weiter-Knopf): das Loch nimmt keine Tipps
    const lk = r ? [loch.l, loch.t, loch.r, loch.b].map(Math.round).join() : '';   // neues Ziel: das Loch springt hin (kein Gleiten über die Seite) und zieht sich kurz zusammen
    if (lk && lo.dataset.k !== lk && !(lo.dataset.k || '').split(',').every((v, i) => Math.abs(v - lk.split(',')[i]) < 6)) { lo.classList.remove('neu'); void lo.offsetWidth; lo.classList.add('neu'); }
    lo.dataset.k = lk;
    for (const x of [sp, lo]) Object.assign(x.style, { left: loch.l + 'px', top: loch.t + 'px', width: loch.r - loch.l + 'px', height: loch.b - loch.t + 'px' });
    const satz = tutFrage ? 'Tutorial wirklich überspringen? Dann siehst du sofort alles.' : z.satz || z.warte || (typeof S.satz === 'function' ? S.satz() : S.satz) || '';
    setText($t('tutSatz'), satz);
    const key = tut.s + '|' + (z.teil || '') + '|' + !!z.warte + '|' + tutFrage;   // neuer Schritt/Teilschritt: nur der Text blendet weich über (nicht bei jeder Zahl, die sich ändert)
    if (be.dataset.k !== key) { be.dataset.k = key; const p = $t('tutSatz'); p.classList.remove('tausch'); void p.offsetWidth; p.classList.add('tausch'); }
    const leer = !tutSeg.da && !z.rect && !z.weiter && !z.warte && z.endY === undefined && !tutFrage && jetzt - tutSeg.t0 < 800;   // neue Lage, Ziel noch nicht da: Blase kurz noch nicht zeigen (sonst steht sie erst woanders)
    be.style.visibility = leer ? 'hidden' : ''; tutSeg.da = tutSeg.da || !leer; if (leer) { tutDa = false; tutBald(80); }
    const sk = String(tutSeg.oben);                              // die Blase selbst blendet nur ein, wenn sie neu kommt oder die Seite wechselt
    if (!leer && (!tutDa || be.dataset.lage !== sk)) { be.dataset.lage = sk; be.classList.remove('rein'); void be.offsetWidth; be.classList.add('rein'); }
    tutDa = !leer;
    const zl = $t('tutZaehler'); zl.hidden = tutFrage || !z.teil;   // Teilschritte als Punkte (aktiv Gold)
    if (z.teil && zl.dataset.teil !== z.teil) { zl.dataset.teil = z.teil; const [n, von] = z.teil.split('/').map(Number); liveHtml(zl, Array.from({ length: von }, (x, i) => '<i class="' + (i < n ? 'an' : '') + '"></i>').join('')); }
    const fb = $t('tutFort'); fb.hidden = tutFrage || z.fort === undefined; if (z.fort !== undefined) fb.firstChild.style.width = Math.round(100 * Math.min(1, Math.max(0, z.fort))) + '%';
    $t('tutWeiter').hidden = tutFrage || !ok; $t('tutFrage').hidden = !tutFrage; $t('tutWeg').hidden = tutFrage;
    if (!tutSeg.oben) { const b = tutBox(be), nav = $t('cornerButtons'), lim = (nav && tutSicht(nav) ? nav.getBoundingClientRect().top : H) - 8;   // langer Satz unten: nie über die Leiste (dann ausnahmsweise höher)
        if (b.b > lim) be.style.top = Math.round(b.t - (b.b - lim)) + 'px'; }
    const bb = tutBox(be), res = parseFloat(getComputedStyle(be).getPropertyValue('--tut-res')) || 0;   // Blase oben verankert, so hoch wie ihr Text: der Satz steht still, sie wächst nur nach unten
    tutKuerzen(fe, Math.max(bb.b, bb.t + res) + 6);              // (Fenster darunter: fester Platz für die Blase – kürzere/längere Sätze verschieben es nicht)
    const fi = $t('tutFinger'); fi.hidden = !r || z.nurZeigen || z.zeigNur; tutErkl = z.erkl || null;
    if (!fi.hidden) {                                            // Finger: im Fenster seitlich (über und unter Knöpfen stehen dort oft Zahlen), sonst von unten, notfalls von oben/der Seite – nie unter der Blase
        const cx = (loch.l + loch.r) / 2, cy = (loch.t + loch.b) / 2, fk = lk + '|' + W + 'x' + H + '|' + tutSeg.oben;
        if (fi.dataset.k !== fk) { fi.dataset.k = fk;                // (nur bei neuem Loch neu wählen)
            const imFenster = z.el && z.el.closest && z.el.closest('.panel, .city-sheet, .kl-seite, #heroHall');
            const wahl = { rechts: [loch.r - 4, cy - 27, loch.r + 58 < W], links: [loch.l - 50, cy - 27, loch.l - 58 > 0],
                unten: [Math.min(W - 56, Math.max(2, cx - 27)), loch.b - 14, loch.b + 60 < H - 70], oben: [Math.min(W - 56, Math.max(2, cx - 27)), loch.t - 40, loch.t > 60] };
            const reihe = (imFenster ? ['rechts', 'links', 'unten', 'oben'] : ['unten', 'oben', 'rechts', 'links']).filter(k => wahl[k][2] && !tutDeckt({ l: wahl[k][0], t: wahl[k][1], r: wahl[k][0] + 54, b: wahl[k][1] + 54 }, bb));
            const hs = z.rund && cityView.hidden && islandById[playerIslandId];   // Basis/Lager auf der Karte: Finger von der Seite weg von der eigenen Burg (nicht auf sie)
            if (hs) { const d = k => Math.hypot(wahl[k][0] + 27 - toSX(hs.x), wahl[k][1] + 27 - toSY(hs.y)); reihe.sort((a, b) => d(b) - d(a)); }
            const belegt = ([x, y]) => { if (!cityView.hidden && cityNamen.some(n => x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h)) return true;   // (Stadt: Schild-Namen frei)
                const e = document.elementFromPoint(x, y);   // steht dort etwas (Knopf, Bild, Zahl, Text)?
                return !!e && !e.closest('#tut') && (!!e.closest('button, img, svg, input, .bk, .chip, .lchip') || [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())); };
            const punkte = k => { const [x, y] = wahl[k]; return [[x + 27, y + 27], [x + 27, y + 10], [x + 27, y + 44], [x + 10, y + 27], [x + 44, y + 27]]; };
            el.classList.add('durch'); const k = reihe.find(q => !punkte(q).some(belegt)) || reihe[0] || 'unten'; el.classList.remove('durch');
            Object.assign(fi.style, { left: Math.round(wahl[k][0]) + 'px', top: Math.round(wahl[k][1]) + 'px' });
            for (const q of ['oben', 'rechts', 'links']) fi.classList.toggle(q, q === k); } }
}
// ---- Willkommen (vor Schritt 1): Titelbild, kurze Geschichte, ohne Server auch der Name ----
const TUT_NAME_MAX = 16;
function tutWillkommen() {                                       // true, solange das Willkommen offen ist
    const w = $t('tutWillkommen'); if (!w) return false;
    const an = tutLaeuft() && !tut.w; w.hidden = !an;
    if (an && !w.dataset.an) {
        w.dataset.an = '1'; tutHeim(true);                       // (dahinter wartet schon die eigene Stadt, groß)
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
$t('tutWeiter').addEventListener('click', () => { if (Date.now() - tutTippZeit < TUT_SPERRE) return; tutTippZeit = Date.now(); if (tutErkl) { (tut.e = tut.e || {})[tutErkl] = 1; tutSpeichern(); } else tutTat.ok = true; tutZeigen(); });   // Erklär-Teilschritt: abhaken, der Schritt läuft weiter
document.addEventListener('click', e => { if (!tutLaeuft()) return;   // nach jedem Tipp: das Loch ist verbraucht (kein zweiter Tipp ins alte Ziel), gleich das nächste
    const lo = $t('tutLoch'); if (!e.target.closest('#tut')) { tutTippZeit = Date.now(); tutZielEl = null; if (!lo.hidden) { $t('tutSperre').hidden = false; lo.hidden = true; $t('tutFinger').hidden = true; } }
    tutZeigen(); tutBald(30); });                                   // (gleich: ein neues Fenster bekommt die Blase im selben Bild, nicht ein Bild später)
new MutationObserver(rs => { if (tutLaeuft() && !$t('tut').hidden && rs.some(r => r.target.matches && r.target.matches('.panel, #citySheet, #barbSheet, .kl-seite, #heroHall'))) tutZeigen(); })   // Fenster geht auf/zu (auch ohne Tipp, z. B. nach dem Tippen auf die Karte): Blase im selben Bild an ihren Platz
    .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
$t('tut').addEventListener('click', e => {                        // Loch noch nicht da (Fenster fährt ein): ein Tipp genau aufs Ziel wirkt trotzdem
    const z = tutZielEl; if (!z || !z.isConnected || !e.target.closest('.tut-d, #tutSperre') || cityBusy || Date.now() - tutTippZeit < TUT_SPERRE || !tutSicht(z)) return;
    const q = z.getBoundingClientRect(); if (e.clientX >= q.left && e.clientX <= q.right && e.clientY >= q.top && e.clientY <= q.bottom) z.click(); });
$t('tutWeg').addEventListener('click', () => { tutFrage = true; tutZeigen(); });   // erst fragen (im Spiel, kein Browser-Fenster)
$t('tutNein').addEventListener('click', () => { tutFrage = false; tutZeigen(); });
$t('tutJa').addEventListener('click', () => {
    tutFrage = false; tut.fertig = true; tut.alles = true; tutSpeichern(); tutZeigen();
    flashHint('Tutorial übersprungen – jetzt siehst du alles.', 3500); setTimeout(maybeShowDaily, 1500);
});
$t('tutNochmal').addEventListener('click', () => {               // Profil → Einstellungen: von vorn (ohne Geschenke und Belohnung; Gebautes zählt gleich als erledigt)
    tut = { s: 0, frei: [], g: { b: 1, k: 1, f: 1 }, t0: Date.now(), neu: true, w: 1, belohnt: true, nochmal: true }; tutFreiAlt = null; tutFrage = false;   // (alle Geschenke schon gegeben – auch die Rohstoffe für die erste Forschung)
    for (const k of Object.keys(tutTat)) delete tutTat[k];
    if (tutUhr) { clearInterval(tutUhr); tutUhr = 0; }
    closeAllPopups(); tutStarten();
});
// was die Schritte mitbekommen müssen: Angriff (mit Held?), geöffnete Kisten
barbSend = (alt => function (who) { const r = alt.apply(this, arguments); if (r && who === 'player') tutTat.lager = true; return r; })(barbSend);   // (im Netz: der Befehl ans Lager)
alsBefehl = (alt => function (art) { const r = alt.apply(this, arguments); if (r && art === 'lager') tutTat.lager = true; return r; })(alsBefehl);
if (typeof questProgress === 'function') questProgress = (alt => function (t) { if (t === 'attack') { tutTat.angriff = true; if (nextAttackHero) tutTat.heldAngriff = true; } return alt.apply(this, arguments); })(questProgress);
kisteOeffnen = (alt => function (id) { const r = alt.apply(this, arguments); if (($t('beuteFenster') || {}).hidden === false) tutTat['kiste_' + id] = true; return r; })(kisteOeffnen);
if (tut && tut.k && TUT[tut.s] && TUT[tut.s].k !== tut.k) { const i = TUT.findIndex(x => x.k === tut.k); if (i >= 0) tut.s = i; }   // (Schritte dazu/weg: beim Namen weiter)
if (tut) { tutFrei(); afterSplash(() => setTimeout(tutStarten, 600)); }
