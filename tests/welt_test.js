// Tests für die Flicken (nur Änderungen schicken) in Game/welt.js und Syntax aller Spiel-Dateien.  Aufruf:  node tests/welt_test.js
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const G = path.join(__dirname, '..', 'Game');
let fehler = 0, n = 0;
const pruefe = (name, ok) => { n++; if (!ok) { fehler++; console.log('FEHLER: ' + name); } };

// 1) Jede Spiel-Datei ist gültiges JavaScript
for (const d of ['spiel.js', 'bots.js', 'welt.js', 'aufbau.js', 'buendnis.js', 'haendler.js', 'speichern.js', 'ladebildschirm.js', 'benachrichtigung.js', 'sw.js', 'weltrechner/start.js', 'weltrechner/push.js']) {
    try { execFileSync(process.execPath, ['--check', path.join(G, d)], { stdio: 'pipe' }); pruefe(d, true); } catch (e) { pruefe(d + ': ' + String(e.stderr).split('\n')[0], false); }
}

// 2) Flicken: bauen und wieder einsetzen ergibt genau den neuen Stand (2000 Zufallsfälle)
const src = fs.readFileSync(path.join(G, 'welt.js'), 'utf8');
const J = v => JSON.stringify(v), istObjekt = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const teil = src.slice(src.indexOf('    function flickenBauen'), src.indexOf('    const gesendet = {};'));
const { flickenBauen, flickenAnwenden } = new Function('J', 'istObjekt', teil + '; return { flickenBauen, flickenAnwenden };')(J, istObjekt);
let zufall = 12345; const r = () => (zufall = (zufall * 1103515245 + 12345) % 2147483648) / 2147483648;
const wert = t => { const x = r(); if (t > 1 || x < .4) return Math.floor(r() * 1000); if (x < .55) return 'w' + Math.floor(r() * 9); if (x < .65) return null; if (x < .75) return [1, 2, Math.floor(r() * 5)]; const o = {}; const m = Math.floor(r() * 5); for (let i = 0; i < m; i++) o['k' + Math.floor(r() * 8)] = wert(t + 1); return o; };
const welt = () => { const o = {}; const m = Math.floor(r() * 30); for (let i = 0; i < m; i++) o[String(Math.floor(r() * 50))] = wert(0); return o; };
const aendern = a => { const b = JSON.parse(J(a)); for (const k of Object.keys(b)) { const x = r(); if (x < .1) delete b[k]; else if (x < .3) b[k] = wert(0); else if (x < .4 && istObjekt(b[k])) { for (const kk of Object.keys(b[k])) if (r() < .5) delete b[k][kk]; b[k]['n' + Math.floor(r() * 3)] = wert(1); } } if (r() < .5) b['neu' + Math.floor(r() * 9)] = wert(0); return b; };
const sortiert = v => Array.isArray(v) ? v.map(sortiert) : istObjekt(v) ? Object.keys(v).sort().reduce((o, k) => (o[k] = sortiert(v[k]), o), {}) : v;
let gut = 0;
for (let i = 0; i < 2000; i++) {
    const a = welt(), b = aendern(a), f = JSON.parse(J(flickenBauen(a, b))), c = JSON.parse(J(a));
    if (flickenAnwenden(c, f) && J(sortiert(c)) === J(sortiert(b))) gut++;
    else if (gut + 1 === i + 1 - 0) { console.log('  Beispiel:', J(a), '→', J(b), 'Flicken', J(f), 'ergibt', J(c)); }
}
pruefe('Flicken hin und zurück (' + gut + ' von 2000)', gut === 2000);
pruefe('leere {} bleiben {}', (() => { const a = { x: {} }, b = { x: {}, y: {} }, c = JSON.parse(J(a)); flickenAnwenden(c, flickenBauen(a, b)); return J(c) === '{"x":{},"y":{}}'; })());
pruefe('Flicken auf fehlenden Eintrag wird erkannt', flickenAnwenden({ a: 1 }, { d: { z: { s: { x: 1 } } } }) === false);

// 3) Hauptbuch (10d3-welt-hauptbuch.js): Splitter → Gems (alle Helden voll), Wochenketten-/Pass-Kisten (fr.kg)
{
    const s10 = fs.readdirSync(path.join(G, 'spiel')).filter(f => f.startsWith('10d')).sort().map(f => fs.readFileSync(path.join(G, 'spiel', f), 'utf8')).join(''), stueck = (a, b) => { const i = s10.indexOf(a), j = s10.indexOf(b, i); if (i < 0 || j < 0) throw new Error('nicht gefunden: ' + a); return s10.slice(i, j); };
    const code = stueck('    const kWert', '    function hbKisteDazu') + stueck('    function hbGearNeu', '    // alle Neuerungen eines Profils');
    const nn = v => (typeof v === 'number' && Number.isFinite(v) ? v : 0), WERT = { a: 0 };
    const H = new Function('nn', 'HEROES', 'HERO_MAXQ', 'hbHeldZeile', 'hbHeldenWert', 'hbE0f', 'HB_SLOTS', 'starGemCost', 'CRATE_GEM_COST', 'hbZahlen', 'fz', 'STAR_PCT', 'ITEM_MAX_LEVEL',
        code + '; return { hbSplitterGems, hbGearNeu };')(nn, [{ id: 'a', r: 1 }], 20, z => [z.own ? 1 : 0, z.q | 0, z.sh | 0, 0, 0, 0, 0], () => WERT.a, () => 10,
        ['weapon', 'armor', 'shield', 'boots'], () => 50, 100, () => false, String, 5, 30);
    const hbLeer = () => ({ kN: 0, kG: 0, fr: { k: 0, kg: 0, sh: 0 }, gear: { weapon: [], armor: [], shield: [], boots: [] }, hs: { a: [1, 20, 0, 0, 0, 0, 0] }, shB: 0 });
    let hb = hbLeer();
    pruefe('Hauptbuch: Episches Teil ohne sichere Kiste und ohne Gems wird abgelehnt', H.hbGearNeu('u1', hb, {}, 'weapon', [3, 1, 0], 5) !== '');
    hb = hbLeer(); hb.fr.kg = 27;
    pruefe('Hauptbuch: Episches Teil aus Wochenkette/Pass (fr.kg) wird angenommen', H.hbGearNeu('u1', hb, {}, 'weapon', [3, 1, 0], 5) === '' && hb.fr.kg === 0 && hb.kG === 0);
    pruefe('Hauptbuch: Thron-Shop-Kisten sind raus (Thron-Event 8.10.)', !/hbThronKisten|THRONE_OFFERS/.test(s10));
    hb = hbLeer(); WERT.a = 100; hb.shB = 95; hb.fr.sh = 2;   // Helden voll (Wert 100, Start 10): 5 unverbrauchte Splitter + 2 aus dem Spielraum
    pruefe('Hauptbuch: Splitter → Gems bei vollen Helden (20 je Splitter, verbraucht)', H.hbSplitterGems(hb, null, 100) === 100 && hb.fr.sh === 0 && hb.shB === 92);
    pruefe('Hauptbuch: … höchstens so viele, wie Splitter da sind', H.hbSplitterGems(hb, null, 1000) === 40 && hb.shB === 90);
    hb = hbLeer(); hb.hs.a = [1, 12, 0, 0, 0, 0, 0]; hb.shB = 95;
    pruefe('Hauptbuch: Helden nicht voll → keine Gems aus Splittern', H.hbSplitterGems(hb, { hs: { a: { own: true, q: 12 } } }, 100) === 0);
    pruefe('Hauptbuch: … außer sein Profil zeigt sie gerade voll', H.hbSplitterGems(hb, { hs: { a: { own: true, q: 20 } } }, 100) === 100);
    // Event-Shop (9.10.): Woche ab Montag 0 Uhr Berlin; mehr als das Limit je Ware oder zusammen → nicht bezahlt + gemeldet
    {
        const s6g = fs.readFileSync(path.join(G, 'spiel', '06g-shop-gegenstaende.js'), 'utf8'), wo = s6g.slice(s6g.indexOf('const EV_BERLIN'), s6g.indexOf('const EV_EM_WOCHE'));
        const WA = [{ id: 'tele', name: 'Teleporter', em: 1000, lim: 1 }, { id: 's1', name: 'Schlüssel', em: 200, lim: 10 }], gemeldet = [];
        const E = new Function('nn', 'fz', 'EV_WAREN', 'EV_EM_WOCHE', 'hbWarte', 'hbGut', wo + stueck('    function hbEvShop', '    // abgelehnt') + '; return { hbEvShop, evWocheAb, evWocheEnde };')(
            nn, String, WA, () => 3000, (w, hb, k, now, t) => gemeldet.push(t), (hb, k) => gemeldet.push('gut'));
        const mo = Date.UTC(2026, 9, 11, 22, 30), so = Date.UTC(2026, 9, 11, 21, 30);   // Mo 12.10. 0:30 Berlin (Sommerzeit) / So 23:30 Berlin
        pruefe('Event-Shop: Woche wechselt Montag 0 Uhr Berlin', E.evWocheAb(mo) === Date.UTC(2026, 9, 12) && E.evWocheAb(so) === Date.UTC(2026, 9, 5) && E.evWocheEnde(so) === Date.UTC(2026, 9, 11, 22));
        const hb = {};
        pruefe('Event-Shop: im Limit wird alles bezahlt', E.hbEvShop('u1', hb, { evs: { w: E.evWocheAb(mo), n: { tele: 1, s1: 5 } } }, 2000, mo) === 2000 && gemeldet.pop() === 'gut');
        pruefe('Event-Shop: über dem Limit (Ware + Woche) nur der Rest bezahlt und gemeldet', E.hbEvShop('u1', hb, { evs: { w: E.evWocheAb(mo), n: { tele: 2, s1: 5 } } }, 2000, mo) === 1000 && /Teleporter 2\/1.*4000 Event-Münzen/.test(gemeldet.pop()));
        pruefe('Event-Shop: neue Woche → wieder frei', E.hbEvShop('u1', hb, { evs: { w: E.evWocheAb(mo + 7 * 864e5), n: { tele: 1 } } }, 1000, mo + 7 * 864e5) === 1000 && gemeldet.pop() === 'gut');
    }
    // Bündnis-Geschenk für eine Heldenkiste (9.10.): Gems und Splitter kommen unter Last in GETRENNTEN Profilen → trotzdem genau ein Geschenk
    {
        const F = 600000, geschenkt = [];
        const K = new Function('nn', 'KISTE_FRIST', 'WACHE_WARTEN_MS', 'hbZahlen', 'wacheSehen', 'bundGeschenk', stueck('    function gAusMerken', '    // Rohstoffe') +
            stueck('    // Beleg für eine Heldenkiste', '    // Helden: Splitter') + stueck('    function hbKisteFrei', '    WELT.kisteGekauft') + '; return { gAusMerken, hbBelegNeu, hbBelegGems };')(
            nn, F, 60000, () => true, () => ({}), w => geschenkt.push(w));
        const schritt = (hb, m, now, gems, sh) => { m.g.vor = gems; K.gAusMerken(m, now); K.hbBelegGems('u1', hb, m, now); m.g.vor = 0; if (sh) K.hbBelegNeu('u1', hb, m, sh, 0, now); };
        let hb = { kisteOffen: [{ g: 500, sh: 20, t: 1000 }] }, m = { g: {} };
        schritt(hb, m, 1000, 500, 0); schritt(hb, m, 6000, 0, 20);
        pruefe('Heldenkiste: erst Gems, dann Splitter (zwei Profile) → Geschenk', geschenkt.length === 1 && !hb.kisteOffen.length && !(m.gAus > 0));
        hb = { kisteOffen: [{ g: 500, sh: 20, t: 1000 }] }; m = { g: {} };
        schritt(hb, m, 1000, 0, 20); schritt(hb, m, 6000, 300, 0); schritt(hb, m, 9000, 200, 0);
        pruefe('Heldenkiste: erst Splitter, dann Gems in Teilen → Geschenk', geschenkt.length === 2 && !hb.kisteOffen.length);
        hb = { kisteOffen: [{ g: 500, sh: 20, t: 1000 }] }; m = { g: {} };
        schritt(hb, m, 1000, 0, 20); schritt(hb, m, 1000 + 60001, 500, 0);
        pruefe('Heldenkiste: Splitter und Gems Gems mehr als 60 s nach den Splittern → kein Geschenk', geschenkt.length === 2);
        hb = { kisteOffen: [{ g: 500, sh: 20, t: 1000 }, { g: 500, sh: 20, t: 1000 }] }; m = { g: {} };
        schritt(hb, m, 1000, 0, 20); schritt(hb, m, 2000, 500, 0); schritt(hb, m, 3000, 0, 0);
        pruefe('Heldenkiste: ein Kauf, zwei Befehle → nur ein Geschenk (Gems zählen einmal)', geschenkt.length === 3 && hb.kisteOffen.length === 1);
    }
    // Münz-Spielraum (Wirtschaft 5.10.): der feste Tages-Rest und die Mindest-Stunde × WIRTSCHAFT_KOSTEN (vorher 50.000 + 3 × 5.000),
    // Münzen seit 6.10. dazu × MUENZ_FAKTOR (wirtM); Truppen wirtK
    const WK = 1 / 1800, wirtK = n => Math.max(1, Math.round(n * WK)), wirtM = n => Math.max(1, Math.round(n * WK * 1000));
    const S = new Function('levelRewardCoins', 'wirtK', 'wirtM', stueck('    const SR_FIX', '    function spielraumTag') + '; return { spielraumTeile, TR_STUNDE_MIN, FUND_TR_MIN };')(() => 0, wirtK, wirtM);
    const t = S.spielraumTeile('u1', { lvl: 1, lvlLog: [], ein: [], hp0: 0, initT: Date.now() - 2 * 3600000 });
    pruefe('Hauptbuch: fester Münz-Spielraum in Münzen × 1.000 (27.778 + 3 × 2.778 statt 65.000 vor dem 5.10.)', t.fix === 27778 + 3 * 2778 && t.lv === 0);
    pruefe('Hauptbuch: Mindest-Truppen (Fund 100) × WIRTSCHAFT_KOSTEN, nie unter 1', S.TR_STUNDE_MIN === 1 && S.FUND_TR_MIN === 1);
    const mgMit = c => new Function('PASS_LVLS', 'passRewardAt', 'SR_STUNDE_MIN', 'nn', 'hourProduction', 'passNo', 'saveBotState', 'QUEST_COIN_H',
        stueck('    let passMuenzH', '    function spielraumFrei') + '; return muenzGutscheine;')(0, null, 3, x => +x || 0, () => ({ coins: c }), () => 7, () => {}, [1, 2, 3]);
    const MG = mgMit(20000), h12 = 20000 * 1.2;
    // Tagesaufgaben (7.10.): 6 Aufgaben je 1/2/3 Stunden Münzen = 12 Stunden am Tag, der Topf hält höchstens 2 Tage und füllt sich gleichmäßig nach
    const dA = { pS: 7, pM: 0 };
    pruefe('Hauptbuch: Aufgaben-Münzen – 2 Tage (24 Stunden) gedeckt, mehr nicht', MG('u1', 24 * h12, dA) === 24 * h12 && MG('u1', h12, dA) < h12 * 1e-3);
    dA.aMt -= 864e5 / 2;
    pruefe('Hauptbuch: … nach einem halben Tag wieder 6 Stunden', Math.abs(MG('u1', 10 * h12, dA) - 6 * h12) < h12 * 1e-3);
    // Truppen aus Saison-Pass und Aufgaben-Bonus (7.10.): je Stufe/Reihe einmal je Saison, nur so weit, wie man in der Zeit kommen kann; Bonus höchstens 2 in 24 Std.
    const s6b = fs.readFileSync(path.join(G, 'spiel', '06b-pass-anleitung.js'), 'utf8'), pr = new Function('PASS_LVLS', s6b.slice(s6b.indexOf('function passRewardAt'), s6b.indexOf('const passMuenzen')) + 'return passRewardAt;')(100);
    const warn = [], dW = {}, EP = Date.UTC(2026, 0, 5), LEN = 28 * 864e5, s = Math.floor((Date.now() - EP) / LEN) + 1, tage = (Date.now() - (EP + (s - 1) * LEN)) / 864e5;
    const TP = new Function('zahlOk', 'warnen', 'fz', 'wacheSehen', 'wd', 'TR_STUNDE_MIN', 'hourProduction', 'saveBotState', 'passNo', 'PASS_LVLS', 'passRewardAt', 'PASS_EPOCH', 'PASS_LEN', 'QUEST_BONUS3',
        stueck('    const TRUPPEN_QUELLEN', '    function truppenGeben') + 'return truppenPruefen;')(Number.isFinite, (w, a, t) => warn.push(t), String, () => ({}), () => dW, 1, () => ({ troops: 100 }), () => {},
        () => s, 100, pr, EP, LEN, { n: 3, tr: 2 });
    const bisL = Math.min(100, Math.ceil(100 * 2 * tage / 28) + 3), L2 = 2;   // Stufe 2: frei 2 Std. Truppen
    pruefe('Hauptbuch: Pass-Truppen Stufe 2 (2 Std.) angenommen – ein zweites Mal nicht', TP('u1', { q: 'pass', n: 200, s, l: L2, p: 0 }) === 200 && TP('u1', { q: 'pass', n: 200, s, l: L2, p: 0 }) === 0 && warn.length === 1);
    pruefe('Hauptbuch: Pass-Truppen für eine Stufe ohne Truppen / zu früh abgelehnt', TP('u1', { q: 'pass', n: 50, s, l: 3, p: 0 }) === 0 && (bisL >= 100 || TP('u1', { q: 'pass', n: 50, s, l: 98, p: 0 }) === 0));
    pruefe('Hauptbuch: Pass-Truppen (Premium Stufe 2: 6 Std.) – mehr als das 3-Fache wird gekappt', TP('u1', { q: 'pass', n: 1e6, s, l: 2, p: 1 }) === 3 * 600 + 1);
    pruefe('Hauptbuch: Aufgaben-Bonus (2 Std. Truppen) – höchstens 2 in 24 Std.', TP('u1', { q: 'aufgabe', n: 200 }) === 200 && TP('u1', { q: 'aufgabe', n: 200 }) === 200 && TP('u1', { q: 'aufgabe', n: 200 }) === 0);
}

// 4) Welt-Saison (09f-saison.js): der Termin ist immer ein Sonntag 18 Uhr deutscher Zeit, 8 Wochen nach dem Start (auch über
//    Sommer-/Winterzeit, egal in welcher Zeitzone der Server läuft)
{
    const s9 = fs.readFileSync(path.join(G, 'spiel', '09f-saison.js'), 'utf8'), i = s9.indexOf('const BERLIN'), j = s9.indexOf('function saisonJetzt', i);
    const saisonEnde = new Function('SAISON_WOCHEN', 'SAISON_STUNDE', s9.slice(i, j) + '; return saisonEnde;')(8, 18);
    let gut = true;
    const B = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    for (const ab of ['2026-10-06T10:00:00Z', '2026-10-04T16:00:03Z', '2026-02-01T17:00:00Z', '2026-08-02T16:00:00Z', '2026-12-31T23:59:00Z', '2027-03-28T16:30:00Z']) {
        const t = new Date(ab).getTime(), e = new Date(saisonEnde(t)), tage = (e - t) / 864e5;
        if (B.format(e) !== 'So., 18:00' || tage < 55.9 || tage > 63) { gut = false; console.log('  Saison ab', ab, '→', e.toISOString(), B.format(e)); }
    }
    pruefe('Welt-Saison: Termin Sonntag 18 Uhr deutscher Zeit, 8 Wochen nach dem Start', gut);
    const w = fs.readFileSync(path.join(G, 'welt.js'), 'utf8');
    pruefe('Welt-Saison: welt.js nimmt nur Profile der laufenden Saison', /\(\+s\.profil\.saison \|\| 1\) >= nr/.test(w) && /saison: parseInt\(d\.openWaterSaisonMein/.test(w));
}

// 5) Push „Bau fertig“ / „Forschung fertig“ (weltrechner/push.js): Zeiten aus dem Profil, je einmal, beim ersten Blick nur merken
{
    const { BEOBACHTER, nachrichtBauen } = require(path.join(G, 'weltrechner', 'push.js')), jetzt = Date.now();
    const M = { u7: { online: false, profil: { city: { levels: { academy: 4, keep: 3 }, bau: ['academy', 'keep'], bauBis: [jetzt - 60000, jetzt + 3600000], foLauf: 'w_prod', foBis: jetzt - 1000 }, fo: { w_prod: 2 } } } };
    const win = {}, defs = { academy: { name: 'Labor' }, keep: { name: 'Burg' } };
    const lauf = () => JSON.parse(new Function('window', 'WELT', 'botById', 'cityDef', 'AUF', 'pendingAttacks', 'botIntelMem', 'botOwnedIslands', 'return ' + BEOBACHTER)(win, { menschen: M }, {}, id => defs[id], { FORSCHUNG: [{ id: 'w_prod', name: 'Ertrag' }] }, [], {}, {})).raus;
    pruefe('Push Bau/Forschung: beim ersten Blick nur merken', lauf().length === 0);
    M.u7.profil.city.bauBis[0] = jetzt - 30000; win.__pushMerker.ev = {};   // (nach einem Neustart wäre alles schon gemerkt – hier frisch)
    const r = lauf(), bau = r.filter(e => e.art === 'bau'), fo = r.filter(e => e.art === 'forschung');
    pruefe('Push Bau fertig: nur der fertige Bau (Labor 5), nicht die laufende Burg', bau.length === 1 && bau[0].name === 'Labor' && bau[0].stufe === 5 && bau[0].an === 'u7');
    pruefe('Push Forschung fertig: Ertrag Stufe 3', fo.length === 1 && fo[0].name === 'Ertrag' && fo[0].stufe === 3);
    pruefe('Push Bau/Forschung: kommt nur einmal', lauf().length === 0);
    const n = nachrichtBauen(bau.concat(fo), jetzt);
    pruefe('Push-Text Bau/Forschung', n.titel === 'Bau fertig' && /Fertig gebaut: Labor Stufe 5\./.test(n.text) && /Fertig erforscht: Ertrag Stufe 3/.test(n.text));
    const sm = nachrichtBauen([{ art: 'sammler', menge: 4000, was: 'holz' }, { art: 'sammler', menge: 500, was: 'gold' }, { art: 'sammler', menge: 1000, was: 'holz' }, { art: 'sammler', menge: 3, was: 'gem' }, { art: 'sammler', menge: 200, was: 'eisen' }], jetzt).text;
    pruefe('Push Sammler: je Art richtig benannt (Holz ist keine Münze)', sm === 'Deine Sammler sind zurück: +500 Münzen, +3 Edelsteine, +5.000 Holz, +200 Eisen.');
    M.u7.profil.city.bauBis[0] = jetzt - 20 * 60000; win.__pushMerker.ev = {};
    pruefe('Push Bau fertig: über 10 Min. alt → keine Meldung mehr', !lauf().some(e => e.art === 'bau'));
    const s10 = fs.readdirSync(path.join(G, 'spiel')).filter(f => f.startsWith('10d')).sort().map(f => fs.readFileSync(path.join(G, 'spiel', f), 'utf8')).join(''), schritt = s10.slice(s10.indexOf('function hbStadtSchritt'), s10.indexOf('function hbFoSchritt'));
    pruefe('Bauherr: echte Spieler bekommen beim Weltrechner Punkte für Stadt-Gebäude', /evPunkte\('bau', who, WO_PKT\.bauStufe \* \(L \+ 1\)/.test(schritt));
    pruefe('Welt-Profil schickt Bau- und Forschungs-Ende mit', /bauBis: bl\.map/.test(fs.readFileSync(path.join(G, 'welt.js'), 'utf8')));
}
// 6) Burg fair (Alexander 6.10. A): beim Reset Handy (aufbau.js burgFair) und Hauptbuch des Weltrechners (09f burgFairWer → hb.st/hb.fo)
// gleich – das Handy meldet danach nie mehr als das Hauptbuch erlaubt (kein Fehlalarm); die alten Burg-Bauzeiten enden mit dem Reset
{
    const a = fs.readFileSync(path.join(G, 'aufbau.js'), 'utf8'), s9 = fs.readFileSync(path.join(G, 'spiel', '09f-saison.js'), 'utf8'), s10 = fs.readdirSync(path.join(G, 'spiel')).filter(f => f.startsWith('10d')).sort().map(f => fs.readFileSync(path.join(G, 'spiel', f), 'utf8')).join('');
    const stueck = (q, von, bis) => { const i = q.indexOf(von), j = q.indexOf(bis, i); if (i < 0 || j < 0) throw new Error('Stück fehlt: ' + von); return q.slice(i, j); };
    const AUF = new Function('cityMaxLevel', 'BURG_MAX', stueck(a, 'function stadtCapB', 'function stadtCap(') + stueck(a, 'const FO_AESTE', 'function foStufe') + 'return { burgFair };')(id => id === 'forge' ? 5 : id === 'hospital' ? 40 : 25, 25);
    const burgFairWer = new Function('AUF', stueck(s9, 'function burgFairWer', '\n}\n') + '\n}\nreturn burgFairWer;')(AUF);
    const T = 1000, lv = { keep: 6, academy: 5, lumber: 6, wall: 3, market: 2 }, fo = { w_prod: 3, m_atk: 2, x_nebel: 1 };
    const welt = { city: { levels: Object.assign({}, lv), fo: Object.assign({}, fo) }, hb: { st: { keep: [6, T], academy: [5, T], lumber: [6, T], wall: [3, T], market: [2, T], forge: [0, T] }, fo: Object.assign({}, fo) } };
    const handy = { levels: Object.assign({}, lv), fo: Object.assign({}, fo), builds: [{ id: 'keep', to: 7 }], foRun: { id: 'x_nebel', to: 2 } };
    burgFairWer(welt, 4); AUF.burgFair(handy, 4);
    const st = welt.hb.st, ids = Object.keys(st);
    pruefe('Burg fair: Hauptbuch Burg 6 → 4, Labor 5 → 4, Holzfäller 6 → 4, Mauer/Markt bleiben', st.keep[0] === 4 && st.academy[0] === 4 && st.lumber[0] === 4 && st.wall[0] === 3 && st.market[0] === 2 && st.keep[1] === T);
    pruefe('Burg fair: Hauptbuch-Forschung bis Labor 4 (Ertrag 2, Angriff 2, Kundschaft weg)', JSON.stringify(welt.hb.fo) === '{"w_prod":2,"m_atk":2}' && JSON.stringify(welt.city.fo) === JSON.stringify(welt.hb.fo));
    pruefe('Burg fair: Handy meldet nichts über dem Hauptbuch (kein Fehlalarm)', ids.every(id => (handy.levels[id] || 0) <= st[id][0]) && Object.keys(handy.fo).every(k => handy.fo[k] <= (welt.hb.fo[k] | 0)) && !handy.builds.length && !handy.foRun);
    const alt = new Function('saison', stueck(s10, 'const BURG_ALT_BIS', '\n') + '\nreturn burgAlt;'), t = Date.UTC(2026, 9, 10);
    pruefe('Burg fair: alte Burg-Bauzeiten gelten bis 14.10. – nach dem Reset mit Burg fair nicht mehr', alt({ nr: 1 })(t) && !alt({ nr: 2, burgFair: 2 })(t) && /const alt = id === 'keep' && burgAlt\(now\)/.test(s10));
    pruefe('Saison-Reset: keine Thron-Punkte-Kappe mehr (Thron-Shop raus, 8.10.)', !/hbThronReset|SAISON_TP_MAX/.test(s10));
    pruefe('Einmalige Ausnahme im Hauptbuch: Edelsteine 1.000, Holz/Stein/Eisen 0 (wie das Handy)', /if \(hb\) \{ hb\.gU = SAISON_AUSNAHME_GEMS; hb\.rU = \{ h: 0, s: 0, e: 0 \}/.test(s10) && /WELT\.saisonKonto\(id, f, B\)/.test(s9) && /if \(B\) saisonAusnahme\(\);/.test(s9));
    pruefe('Burg fair: saisonWelt für alle Mitspieler und echten Spieler, nur beim ersten Reset (saison.burgFair)', /if \(B > 0 && AUF\) burgFairWer\(b, B\)/.test(s9) && /B = burgFair === nr \? BURG_FAIR : 0/.test(s9) && /wirtAb, burgFair, last/.test(s9));
}

// 7) Rahmen (Endprüfung 6.10.): nach einem Neustart kommt zuerst ein altes Profil (ohne look.frames/titles) – das Hauptbuch merkt
// sich die Rahmen erst am ersten neuen Profil (vorher blieben gekaufte Rahmen für immer leer), danach kommt keiner mehr dazu
{
    const w = fs.readFileSync(path.join(G, 'welt.js'), 'utf8'), s10 = fs.readdirSync(path.join(G, 'spiel')).filter(f => f.startsWith('10d')).sort().map(f => fs.readFileSync(path.join(G, 'spiel', f), 'utf8')).join('');
    const stueck = (q, von, bis) => { const i = q.indexOf(von), j = q.indexOf(bis, i); if (i < 0 || j < 0) throw new Error('Stück fehlt: ' + von); return q.slice(i, j); };
    const roh = new Function('SYSTEM', stueck(w, 'function profilZuBotRoh', '    W.profilZuBot =') + 'return profilZuBotRoh;')(true);
    const hbRahmen = new Function(stueck(s10, 'function hbRahmen', '    // Nach dem Zurückspielen') + 'return hbRahmen;')();
    const hb = {}, p1 = { look: { frame: 'gold', title: 'conq' } }, b1 = roh(p1, null); hbRahmen(hb, b1, p1); const lk1 = hb.lk;
    const p2 = { look: { frame: 'gold', frames: ['gold'], titles: ['conq'] } }, b2 = roh(p2, b1); hbRahmen(hb, b2, p2);
    const p3 = { look: { frame: 'legend', frames: ['gold', 'legend'], titles: ['conq', 'king'] } }, b3 = roh(p3, b2); hbRahmen(hb, b3, p3);
    pruefe('Rahmen: altes Profil zuerst (wie bisher: der angelegte), noch nichts gemerkt', J(b1.frames) === '["gold"]' && J(b1.titles) === '["conq"]' && !lk1);
    pruefe('Rahmen: … dann das neue Profil – gekaufte Rahmen/Titel bleiben sichtbar', J(b2.frames) === '["gold"]' && J(b2.titles) === '["conq"]' && hb.lk && J(hb.lk.f) === '["gold"]');
    pruefe('Rahmen: … danach kommen erfundene nicht dazu', J(b3.frames) === '["gold"]' && J(b3.titles) === '["conq"]');
}

console.log(fehler ? fehler + ' von ' + n + ' Tests FEHLGESCHLAGEN' : 'Alle ' + n + ' Spiel-Tests bestanden.');
process.exit(fehler ? 1 : 0);
