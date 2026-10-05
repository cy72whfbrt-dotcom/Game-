// Teil 03-mitspieler.js: Bündnis: was Mitspieler im Bündnis tun
// ==============================================================================================================
// 5) MITSPIELER – gründen, beitreten, Signale senden und mit Taten beantworten, Rallys starten und mitmachen
// ==============================================================================================================
const BUND_NAMEN = ['Sturmbund', 'Nordwacht', 'Eisenkrone', 'Seewoelfe', 'Drachenhort', 'Goldene Flotte', 'Schwarze Segel', 'Rote Rose', 'Bernsteinbund', 'Silberne Hand',
    'Wellenreiter', 'Graue Garde', 'Feuerkreis', 'Sternenwacht', 'Klippenbund', 'Tiefe See', 'Morgenrot', 'Wolfsrudel', 'Inselherren', 'Sturmflut', 'Kronenwacht', 'Nebelbund',
    'Donnerbucht', 'Salzkrieger', 'Leuchtturm', 'Ankerbund', 'Gezeiten', 'Brandungsrat', 'Kaperbund', 'Nordlicht Pakt'];
const bundMem = { chatAt: {}, chatQ: [], botNext: {}, sigGemacht: new Set(), sigGeschickt: new Set(), rallyGemacht: new Set(), rallySagt: {}, rallyWeg: {}, ziel: {}, hilfeSig: {}, runde: 0, rallyRunde: {}, rallySeh: 0, sigSeh: 0 };
const bundWegMem = new Map();                                  // gibt es einen Weg (über eigene Tore)? – je Runde gemerkt
function bundWeg(a, b, w, n) {                                 // Weg da, letztes Tor offen und die Maut bezahlbar? (wie botCanCross, aber je Runde gemerkt)
    if (a === b) return true; const k = a + '>' + b + ':' + w; let h = bundWegMem.get(k);
    if (h === undefined) { const r = routeFor(a, b, w); h = r ? (r.length > 1 ? [r[r.length - 2], r[r.length - 1]] : [a, a]) : null; bundWegMem.set(k, h); }
    if (!h) return false; const t = tollFor(h[0], h[1], n || 1, w); return !t.closed && (botCoins[w] || 0) >= t.cost;
}
function bundZielVon(botId) { const z = bundMem.ziel[botId]; return z && Date.now() < z.until ? z.t : null; }   // (bots.js: ein Signal „Angriff auf X“ zieht sie dorthin)
function bundEinzelgaenger(bot) { return mulberry32((parseInt(bot.id.slice(3), 10) || 0) * 7717 + 3)() < .22; }   // manche spielen lieber allein
function bundBotBereit(bot, now) { return !bot.mensch && botOnline(bot, now) && now >= (bundMem.botNext[bot.id] || 0) && botOwnedIslands[bot.id] && botOwnedIslands[bot.id].size > 0; }
function bundBotGetippt(bot, now) { bundMem.botNext[bot.id] = now + (botStyle(bot).tapMs || 5000) * (.8 + Math.random() * .8); }
function bundTagFuer(name) {
    const w = name.split(' '), roh = (w.length > 1 ? w.map(x => x[0]).join('') + w[w.length - 1].slice(1, 3) : name.slice(0, 3)).toUpperCase().replace(/[^A-Z]/g, '');
    for (let L = 3; L <= 4; L++) for (let i = 0; i < 26; i++) { const t = (roh.slice(0, L - 1) + (i ? String.fromCharCode(64 + i) : roh[L - 1] || 'X')).slice(0, L);
        if (BUND_TAG_RE.test(t) && !Object.values(bund.b).some(b => b.tag === t)) return t; }
    return null;
}
function bundMitspielerRunde(now) {                              // alle 15 s: gründen, beitreten, Anfragen beantworten
    const bots = BOT_DEFS.filter(b => !b.mensch && botOwnedIslands[b.id] && botOwnedIslands[b.id].size);
    // a) Anfragen: ein Mitspieler als Anführer entscheidet nach Macht und Nähe
    for (const id in bund.b) {
        const a = bund.b[id], chef = botById[a.anf]; if (!chef || chef.mensch || !botOnline(chef, now)) continue;
        for (const q of (a.anfragen || []).slice()) {
            if (now - q.at < 20000) continue;
            const m = bundMitte(a), c = islandById[bundCap(q.w)], nah = m && c ? Math.hypot(c.x - m.x, c.y - m.y) < FRAME_HALF * .45 : false;
            const schnitt = bundMacht(a) / Math.max(1, a.mit.length);
            if (a.mit.length >= BUND.MAX) {                                  // voll: tauschen nur gegen das schwächste Mitspieler-Mitglied, wenn der Bewerber viel stärker ist
                const schwach = a.mit.filter(w => w !== a.anf && botById[w] && !botById[w].mensch).sort((x, y) => staerke(x) - staerke(y))[0];
                const tausch = schwach && !bundVon(q.w) && staerke(q.w) > staerke(schwach) * 1.5;
                bundOp(a.anf, tausch ? { op: 'anfrage', w: q.w, ja: true, raus: schwach } : { op: 'anfrage', w: q.w, ja: false }); continue;
            }
            const ja = !bundVon(q.w) && (staerke(q.w) >= schnitt * .25 || nah);
            bundOp(a.anf, { op: 'anfrage', w: q.w, ja });
        }
        if (botOwnedIslands[a.anf] && !botOwnedIslands[a.anf].size && a.mit.length > 1) { const neu = a.mit.filter(w => w !== a.anf).sort((x, y) => staerke(y) - staerke(x))[0]; a.anf = neu; bundLog(a, bundName(neu) + ' führt jetzt das Bündnis.'); bundSpeichern(); }
    }
    // b) gründen: etwa ein Bündnis pro 6 Mitspieler (höchstens 5 Mitglieder – sonst blieben die meisten allein), in verschiedenen Gegenden
    const zahl = Object.values(bund.b).filter(a => botById[a.anf] && !botById[a.anf].mensch).length;
    if (zahl < Math.ceil(bots.length / 6) && Math.random() < .5) {
        const mitten = Object.values(bund.b).map(bundMitte).filter(Boolean);
        const kand = bots.filter(b => !bundVon(b.id) && !bundEinzelgaenger(b) && botOnline(b, now) && botOwnedIslands[b.id].size >= 4 && (botCoins[b.id] || 0) >= BUND.KOSTEN * 1.5 && b.style !== 'builder')
            .filter(b => { const c = islandById[botCapitalOf(b.id)]; return c && mitten.every(m => Math.hypot(c.x - m.x, c.y - m.y) > FRAME_HALF * .35); })
            .sort((x, y) => botOwnedIslands[y.id].size - botOwnedIslands[x.id].size).slice(0, 5);
        const g = kand[Math.floor(Math.random() * kand.length)];
        if (g) { const frei = BUND_NAMEN.filter(n => !Object.values(bund.b).some(b => b.name === n)), name = frei[Math.floor(Math.random() * frei.length)], tag = name && bundTagFuer(name);
            if (name && tag) { const used = new Set(Object.values(bund.b).map(b => b.farbe)), f = BUND.FARBEN.findIndex((_, i) => !used.has(i));
                bundOp(g.id, { op: 'gruenden', name, tag, farbe: f >= 0 ? f : Math.floor(Math.random() * BUND.FARBEN.length), zeichen: Math.floor(Math.random() * BUND.ZEICHEN.length), offen: Math.random() < .6 }); } }
    }
    // c) beitreten: ein paar Mitspieler ohne Bündnis schauen sich um – das nächste passende Bündnis (Nähe vor Macht, ähnlicher Stil hilft)
    const ohne = bots.filter(b => !bundVon(b.id) && !bundEinzelgaenger(b) && bundBotBereit(b, now) && Math.random() < .15).slice(0, 6);
    for (const bot of ohne) {
        const c = islandById[botCapitalOf(bot.id)]; if (!c) continue;
        let best = null;
        for (const id in bund.b) { const a = bund.b[id]; if ((a.anfragen || []).some(q => q.w === bot.id)) continue;
            if (a.mit.length >= BUND.MAX && !(staerke(bot.id) > Math.min(...a.mit.filter(w => w !== a.anf).map(staerke)) * 1.5)) continue;   // voll: nur wenn sie viel stärker sind als das schwächste Mitglied
            const m = bundMitte(a); if (!m) continue; const d = Math.hypot(c.x - m.x, c.y - m.y); if (d > FRAME_HALF * .6) continue;
            const stil = a.mit.filter(w => botById[w] && botById[w].style === bot.style).length / a.mit.length;
            const s = d / FRAME_HALF - stil * .15 - Math.min(.2, bundMacht(a) / Math.max(1, staerke(bot.id)) * .01) + a.mit.length * .01;
            if (!best || s < best.s) best = { s, a }; }
        if (best) { bundOp(bot.id, { op: 'beitreten', aid: best.a.id }); bundBotGetippt(bot, now); }
    }
    // Verstärkung: nicht mehr im selben Bündnis → heim; Mitspieler holen ihre heim, wenn dort 30 Min. kein Angriff mehr lief
    verstPruefen();
    for (const v of verst.l.slice()) { const bot = botById[v.w]; if (!bot || bot.mensch) continue;
        if (bundUnterAngriff(v.t)) { v.ruhe = now; continue; }
        if (now - (v.ruhe || v.at) > 30 * 60000 && Math.random() < .3) verstHeim(v, ''); }
    // d) Was echte Spieler als Anführer auch können – Mitspieler als Anführer tun es selten und nachvollziehbar (gleiche Befehle):
    //    Mitglieder entfernen, die seit einem Tag keine Basis mehr haben · das Amt dem viel stärkeren Mitspieler übergeben ·
    //    fast voll → nur noch auf Anfrage, wieder Platz → offen
    for (const id in bund.b) {
        const a = bund.b[id]; if (!a) continue;
        const leer = a.leer || (a.leer = {});
        for (const w of a.mit) { if (botOwnedIslands[w] && botOwnedIslands[w].size) delete leer[w]; else if (!leer[w]) leer[w] = now; }
        const chef = botById[a.anf]; if (!chef || chef.mensch || !botOnline(chef, now)) continue;
        const weg = a.mit.find(w => w !== a.anf && leer[w] && now - leer[w] > 24 * 3600000);
        if (weg && Math.random() < .5) { bundOp(a.anf, { op: 'rauswerfen', w: weg }); continue; }
        const st = a.mit.filter(w => w !== a.anf && botById[w] && !botById[w].mensch && botOwnedIslands[w] && botOwnedIslands[w].size).sort((x, y) => staerke(y) - staerke(x))[0];
        if (st && staerke(a.anf) * 3 < staerke(st) && Math.random() < .05) { bundOp(a.anf, { op: 'anfuehrer', w: st }); continue; }
        if (a.offen && a.mit.length >= BUND.MAX - 1 && Math.random() < .2) bundOp(a.anf, { op: 'offen', offen: false });
        else if (!a.offen && a.mit.length <= Math.floor(BUND.MAX / 2) && Math.random() < .2) bundOp(a.anf, { op: 'offen', offen: true });
    }
    // e) wechseln (wie ein Spieler: austreten, dann beitreten): ein Mitspieler, dessen Hauptstadt inzwischen weit weg vom Bündnis liegt
    //    (umgezogen, Gebiet verloren), geht zu einem offenen Bündnis mit Platz in seiner Nähe – frühestens 12 Std. nach dem Beitritt,
    //    nie der Anführer
    for (const bot of bots.filter(b => bundVon(b.id) && bundBotBereit(b, now) && Math.random() < .05).slice(0, 3)) {
        const a = bundVon(bot.id); if (!a || a.anf === bot.id || now - ((a.dabei && a.dabei[bot.id]) || 0) < 12 * 3600000) continue;
        const c = islandById[botCapitalOf(bot.id)], m = bundMitte(a); if (!c || !m || Math.hypot(c.x - m.x, c.y - m.y) < FRAME_HALF * .8) continue;
        let best = null;
        for (const x in bund.b) { const z = bund.b[x]; if (z === a || !z.offen || z.mit.length >= BUND.MAX) continue; const mz = bundMitte(z); if (!mz) continue;
            const d = Math.hypot(c.x - mz.x, c.y - mz.y); if (d < FRAME_HALF * .5 && (!best || d < best.d)) best = { z, d }; }
        if (best && !bundOp(bot.id, { op: 'verlassen' })) { bundOp(bot.id, { op: 'beitreten', aid: best.z.id }); bundBotGetippt(bot, now); }
    }
    // f) einladen (nur der Anführer, wie bei dir): ein Mitspieler als Anführer lädt ab und zu jemanden ohne Bündnis aus der Nähe
    //    ein – Mitspieler wie echte Spieler
    for (const id in bund.b) {
        const a = bund.b[id], chef = botById[a.anf]; if (!chef || chef.mensch || !botOnline(chef, now) || a.mit.length >= BUND.MAX || Math.random() > .1) continue;
        const m = bundMitte(a); if (!m) continue;
        let best = null;
        for (const w of BOT_DEFS.map(x => x.id).concat(['player'])) {
            if (w === a.anf || bundVon(w) || !bundBasen(w).size || (a.einl || []).some(q => q.w === w)) continue;
            if (botById[w] && !botById[w].mensch && bundEinzelgaenger(botById[w])) continue;
            const c = islandById[bundCap(w)]; if (!c) continue; const d = Math.hypot(c.x - m.x, c.y - m.y); if (d > FRAME_HALF * .45) continue;
            if (!best || d < best.d) best = { w, d }; }
        if (best) bundOp(a.anf, { op: 'einladen', w: best.w });
    }
    // g) eingeladen: ein Mitspieler entscheidet wie beim Beitreten (nicht allein bleiben wollen, Nähe) – nach etwas Bedenkzeit
    for (const bot of bots) {
        if (bundVon(bot.id) || !botOnline(bot, now)) continue;
        for (const a of bundEinladungen(bot.id)) { const q = a.einl.find(x => x.w === bot.id); if (!q || now - q.at < 30000) continue;
            const c = islandById[botCapitalOf(bot.id)], m = bundMitte(a), nah = c && m && Math.hypot(c.x - m.x, c.y - m.y) < FRAME_HALF * .6;
            const ja = !bundEinzelgaenger(bot) && nah && a.mit.length < BUND.MAX;
            bundOp(bot.id, { op: 'einladungAntwort', aid: a.id, ja }); if (ja) { bundBotGetippt(bot, now); break; } }
    }
    // h) näher ans Bündnis: ein Mitspieler verlegt seine Hauptstadt (wie du: auf einen EIGENEN Turm, 50 Gems) auf den Turm,
    //    der seinen Bündnis-Mitgliedern am nächsten ist – nur wenn das deutlich näher ist, und nicht öfter als sonst
    for (const bot of bots.filter(b => bundVon(b.id) && botOnline(b, now) && Math.random() < .05).slice(0, 3)) {
        const a = bundVon(bot.id), st = loadBotState()[bot.id]; if (!a || !st || (st.gems || 0) < TELEPORT_GEMS || now - (st.capMovedAt || 0) < BOT_CAP_COOLDOWN) continue;
        const andere = a.mit.filter(w => w !== bot.id).map(w => islandById[bundCap(w)]).filter(Boolean); if (!andere.length) continue;
        const VOR = .3;                                                // (Alexander 4.10.: Bündnisse ziehen nach und nach in die Mitte – der Treffpunkt liegt ein Stück näher am Thron (0,0) als die Mitglieder)
        const mx = andere.reduce((s2, c) => s2 + c.x, 0) / andere.length * (1 - VOR), my = andere.reduce((s2, c) => s2 + c.y, 0) / andere.length * (1 - VOR);
        const cap = islandById[botCapitalOf(bot.id)]; if (!cap) continue; const dJetzt = Math.hypot(cap.x - mx, cap.y - my);
        let best = null;
        for (const id of botOwnedIslands[bot.id]) { const t = islandById[id]; if (!t || t.type !== 'tower' || !botCapitalMoveOk(bot.id, id)) continue;
            const d = Math.hypot(t.x - mx, t.y - my); if (!best || d < best.d) best = { id, d }; }
        if (best && best.d < dJetzt * .6 && dJetzt - best.d > FRAME_HALF * .15 && botTeleportCapital(bot, best.id)) {
            bundLog(a, bundName(bot.id) + ' hat die Hauptstadt näher ans Bündnis verlegt.'); bundSpeichern(); bundBotGetippt(bot, now); }
    }
}
// Signale der Mitglieder: angegriffen und allein zu schwach → „Hilfe!“ – auch für echte Spieler (Alexander 5.10.: die
// Verbündeten helfen ihnen ohne Knopfdruck, ob sie gerade online sind oder nicht)
function bundMitspielerSignale(now) {
    for (const id in bund.b) {
        const a = bund.b[id];
        for (const w of a.mit) {
            const bot = botById[w]; if (!bot || (!bot.mensch && !botOnline(bot, now)) || now - (bundMem.hilfeSig[w] || 0) < 4 * 60000) continue;   // höchstens alle 4 Min. ein Hilferuf
            for (const t of botThreatened(w)) {
                const k = w + ':' + t, last = bundMem.hilfeSig[k] || ((a.sig || []).find(s => s.w === w && s.z === t && s.art === 'hilfe') || {}).at; if (last && now - last < 5 * 60000) continue;
                const g = bundUnterAngriff(t); if (!g || g.at - now < 8000) continue;
                const isl = islandById[t], def = effectiveTroops(isl) + effectiveDefense(isl);
                if (def >= g.str * 1.1) continue;                   // (auch die Hauptstadt – Alexander 5.10.: alle Basen gleich)
                if (!isCapital(t) && (islandLevels[t] || 1) < 5 && (islandTroops[t] || 0) < whoTroops(w) * .05 && isl.type === 'tower') continue;   // nur für Basen, um die es sich lohnt (die Hauptstadt immer)
                if (bot.mensch && !verstStufe(w)) {                     // echter Spieler ohne Botschaft: keiner kann helfen – kein Signal, nur die Meldung an ihn
                    if (bundEinmal('hb|' + w)) bundMelden(w, 'Deine Verbündeten können dir nicht helfen: du hast noch keine Botschaft (ab Burg-Stufe 5).');
                    break; }
                if (!bundSignal(a, w, 'hilfe', t)) { bundMem.hilfeSig[k] = bundMem.hilfeSig[w] = now; bundSpeichern(); }
                break;
            }
        }
    }
    for (const k in bundMem.hilfeSig) if (now - bundMem.hilfeSig[k] > 10 * 60000) delete bundMem.hilfeSig[k];
}
// Mitspieler antworten im Chat – kurz danach, wie ein Mensch, und nur, was sie dann auch tun
function bundChatAntworten(a, who, k) {
    const now = Date.now(), on = a.mit.filter(w => w !== who && botById[w] && !botById[w].mensch && botOnline(botById[w], now));
    const spaeter = (w, kk, z, tat) => bundMem.chatQ.push({ at: now + 3000 + Math.random() * 15000, aid: a.id, w, k: kk, z: z === undefined ? null : z, tat });
    const c = bundChat[a.id], geteilt = c && c.l.slice().reverse().find(x => x.k === 'teilen' && now - x.at < 10 * 60000);
    if (k === 'angriff') {
        const z = geteilt ? geteilt.z : null;
        if (z === null) { if (on[0]) spaeter(on[0], 'wo'); return; }   // noch kein Ziel geteilt: „Wo?“
        for (const w of on.slice(0, 4)) { const ok = !bundZielOk(w, z) && botFreeSlots(botById[w]) > 0 && !(botById[w].style === 'builder' && Math.random() < .6);
            spaeter(w, ok ? (Math.random() < .5 ? 'ja' : 'dabei') : (Math.random() < .5 ? 'nein' : 'spaeter'), null, ok ? { ziel: z } : null); }
    } else if (k === 'rally' || k === 'rallyBitte') {
        // läuft schon eine Rally des Bündnisses: wer kann, kommt dazu (das Mitmachen selbst macht bundMitspielerRally)
        const lauf = k === 'rally' && bund.r.some(r => r.aid === a.id && now < r.los - 5000);
        if (lauf) { for (const w of on.slice(0, 4)) spaeter(w, botFreeSlots(botById[w]) > 0 ? 'dabei' : 'nein'); return; }
        // sonst: einer startet sie auf das geteilte Ziel – wer es erreicht und Truppen hat. „Ja“ heißt: er startet sie wirklich.
        const z = geteilt ? geteilt.z : null;
        if (z === null) { if (on[0]) spaeter(on[0], 'wo'); return; }   // noch kein Ziel geteilt
        let wer = null, plan = null;
        for (const w of on) { if (bund.r.some(r => r.by === w) || botFreeSlots(botById[w]) <= 0 || bundZielOk(w, z)) continue;
            const p = bundRallyFuer(w, z, now); if (p) { wer = w; plan = p; break; } }
        if (!wer) {                                                    // keiner von ihnen kommt ans Ziel (Tor zu) – beitreten geht aber immer: „Starte du“, wenn du hinkommst
            const T = islandById[z], weg = w => [...(w === 'player' ? ownedIslands : botOwnedIslands[w] || [])].some(id => islandById[id] && routeFor(islandById[id].landmassId, T.landmassId, w));
            if (weg(who) && !bundZielOk(who, z)) { for (const w of on.slice(0, 4)) if (botFreeSlots(botById[w]) > 0) spaeter(w, w === on[0] ? 'machdu' : 'dabei'); }
            else if (on[0]) spaeter(on[0], 'keinweg');
            return; }
        spaeter(wer, 'starte', null, { rally: plan });
        for (const w of on.filter(x => x !== wer).slice(0, 3)) if (botFreeSlots(botById[w]) > 0) spaeter(w, 'dabei');
    } else if (k === 'online') { for (const w of on.slice(0, 4)) spaeter(w, 'binon'); }
    else if (k === 'wann') { if (on[0]) spaeter(on[0], Math.random() < .7 ? 'jetzt' : 'spaeter'); }
    else if (k === 'wo') {                                         // ein Mitspieler mit einem Ziel teilt es
        for (const w of on) { const zi = bundMem.ziel[w]; if (zi && now < zi.until) { spaeter(w, 'teilen', zi.t); break; } }
    }
}
function bundChatTakt(now) {                                      // (Weltrechner) fällige Antworten der Mitspieler schreiben
    if (!bundMem.chatQ.length) return;
    const bleibt = [];
    for (const q of bundMem.chatQ) {
        if (now < q.at) { bleibt.push(q); continue; }
        const a = bund.b[q.aid]; if (!a || !a.mit.includes(q.w)) continue;
        if (q.k === 'teilen') { bundOp(q.w, { op: 'chat', k: 'teilen', z: q.z }); continue; }
        if (q.tat && q.tat.rally) {                                   // „Ja, ich starte die Rally!“ – und er tut es (sonst sagt er, dass es nicht geht)
            if (bund.r.some(r => r.by === q.w) || bundRallyFuer(q.w, q.tat.rally.ziel, now) === null) { bundChatDazu(a, q.w, 'nein'); continue; }   // (geht inzwischen nicht mehr)
            bundChatDazu(a, q.w, 'starte');
            if (bundRallyStart(a, q.w, q.tat.rally)) bundChatDazu(a, q.w, 'nein'); else bundSpeichern();   // (bundRallyStart schreibt „hat eine Rally gestartet“ dazu)
            continue;
        }
        bundChatDazu(a, q.w, q.k, q.z);
        if (q.tat && q.tat.ziel !== undefined) bundMem.ziel[q.w] = { t: q.tat.ziel, until: now + 10 * 60000 };   // „Ja“ heißt: sie greifen das geteilte Ziel an
    }
    bundMem.chatQ = bleibt;
}
// Antworten mit Taten: Hilfe schicken, mit angreifen, zur Rally kommen
function bundMitspielerAntworten(now) {
    for (const id in bund.b) {
        const a = bund.b[id];
        for (const s of a.sig || []) {
            if (now - s.at > 3 * 60000) continue;
            if (s.art === 'hilfe' || s.art === 'verteidigen') {
                const g = bundUnterAngriff(s.z); if (!g) continue;
                const isl = islandById[s.z], ow = islandOwnerOf(s.z), kommt = pendingSends.filter(x => x.toId === s.z && !x.back && x.resolveAt < g.at).reduce((n, x) => n + x.troops, 0);
                let fehlt = g.str * 1.2 - (effectiveTroops(isl) + effectiveDefense(isl) + kommt); if (fehlt <= 0) continue;
                if (!verstStufe(ow) || verstFrei(ow) < 1) {                // ohne Botschaft (oder voll) kann keiner helfen – sag es dem Spieler einmal, statt still nichts
                    if (bundEinmal('hb|' + ow)) bundMelden(ow, 'Deine Verbündeten können dir nicht helfen: ' + (verstStufe(ow) ? 'deine Botschaft ist voll' : 'du hast noch keine Botschaft (ab Burg-Stufe 5)') + '.');
                    continue; }
                let offen = false;                                          // (ein Helfer kann später noch: gerade nicht bereit / kein Marsch-Platz)
                for (const w of a.mit) {
                    const bot = botById[w], key = s.id + ':' + w; if (fehlt <= 0) break;
                    if (!bot || bot.mensch || w === ow || bundMem.sigGemacht.has(key)) continue;
                    if (!bundBotBereit(bot, now) || botFreeSlots(bot) <= 0) { if (botOnline(bot, now)) offen = true; continue; }
                    bundMem.sigGemacht.add(key);                            // (geschickt oder kommt nicht rechtzeitig: dieser Helfer ist für das Signal fertig)
                    const thr = botThreatened(w); let best = null;
                    for (const sid of botOwnedIslands[w]) { if (thr.has(sid) || sid === megaTempleId) continue; const n = Math.floor((islandTroops[sid] || 0) * .5); if (n < 1000) continue;
                        const src = islandById[sid]; if (!bundWeg(src.landmassId, isl.landmassId, w, n)) continue;
                        const eta = travelDurationSeconds(src, isl, w) * 1000; if (now + eta > g.at - 1500) continue;
                        if (!best || n > best.n) best = { id: sid, n }; }
                    if (!best) continue;
                    const give = Math.min(best.n, Math.ceil(fehlt));
                    if (!bundHilfe(w, best.id, s.z, give)) { fehlt -= give; bundMem.sigGeschickt.add(s.id); bundBotGetippt(bot, now); bundMem.chatQ.push({ at: now + 1500 + Math.random() * 4000, aid: a.id, w, k: 'unterwegs', z: null }); }
                }
                if (!offen && fehlt > 0 && !bundMem.sigGeschickt.has(s.id) && bundEinmal('kh|' + ow + '|' + s.z)) bundMelden(ow, 'Keiner deiner Verbündeten kommt rechtzeitig an.');
            } else if (s.art === 'angriff') {
                for (const w of a.mit) { const bot = botById[w]; if (!bot || bot.mensch || w === s.w || bundMem.sigGemacht.has(s.id + ':' + w)) continue;
                    bundMem.sigGemacht.add(s.id + ':' + w);
                    if (bot.style === 'builder' && Math.random() < .6) continue;                      // nicht jeder zieht mit
                    bundMem.ziel[w] = { t: s.z, until: now + 10 * 60000 }; }
            }
        }
    }
    if (bundMem.sigGemacht.size > 5000) { bundMem.sigGemacht.clear(); bundMem.sigGeschickt.clear(); }
}
function bundMitspielerRally(now) {
    // a) mitmachen: wer einen Weg hat, schickt einen guten Teil einer großen Basis (zu spät am Sammelpunkt → folgt direkt zum Ziel)
    for (const r of bund.r) {
        const a = bund.b[r.aid]; if (!a || now > r.los - 4000) continue;
        const at = islandById[r.at];
        for (const w of a.mit) {
            const bot = botById[w], key = r.id + ':' + w; if (!bot || bot.mensch || w === r.by || bundMem.rallyGemacht.has(key) || r.j.some(j => j.w === w) || !bundBotBereit(bot, now) || botFreeSlots(bot) <= 0) continue;
            const zielOw = islandOwnerOf(r.t); if (zielOw && (bundVerbuendet(w, zielOw) || zielOw === w)) continue;
            const thr = botThreatened(w); let best = null;
            for (const sid of botOwnedIslands[w]) { if (thr.has(sid) || sid === megaTempleId || sid === r.at) continue; const n = Math.floor((islandTroops[sid] || 0) * (botStyle(bot).commit || .7) * .8); if (n < 1000) continue;
                const src = islandById[sid];                                // (Tore egal beim Beitreten)
                if (!best || n > best.n) best = { id: sid, n }; }
            bundMem.rallyGemacht.add(key);
            // (Rally eines echten Spielers: die Mitspieler sagen im Chat, ob sie kommen – vorher kam einfach keiner, ohne ein Wort)
            const sagen = k2 => { if (botById[r.by] && botById[r.by].mensch && (bundMem.rallySagt[r.id] = (bundMem.rallySagt[r.id] || 0) + 1) <= 4)
                bundMem.chatQ.push({ at: now + 2000 + Math.random() * 6000, aid: a.id, w, k: k2, z: null }); };
            if (!best) continue;                                            // (keine Basis mit genug Truppen)
            if (bot.style === 'builder' && Math.random() < .5) { sagen('nein'); continue; }
            const k0 = pendingSends.length;
            const hp = botPickHero(w, islandById[best.id], islandById[r.t], best.n, true);   // (seine Helden kommen mit – wie bei jedem seiner Angriffe)
            if (!bundRallyDazu(a, w, { rid: r.id, von: best.id, n: best.n, held: hp[0], held2: hp[1] })) { bundBotGetippt(bot, now); bundSpeichern(); sagen('unterwegs');
                const m = pendingSends.length > k0 ? pendingSends[pendingSends.length - 1] : null, st = loadBotState()[w];   // zu spät für den Start? mit Gems beschleunigen (wie du: halbiert die Zeit, 1 Gem pro Minute)
                for (let i = 0; m && st && i < 4 && m.resolveAt > r.los - 2000; i++) { const c = speedUpCost(m); if ((st.gems || 0) < c * 2) break;
                    st.gems -= c; const rem = m.resolveAt - now, pr = Math.max(0, Math.min(.99, (now - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt))); m.resolveAt = now + rem / 2; m.startedAt = m.resolveAt - (rem / 2) / (1 - pr); }
                if (m && st) saveBotState(); }
        }
    }
    if (bundMem.rallyGemacht.size > 5000) { bundMem.rallyGemacht.clear(); bundMem.rallySagt = {}; }
    // b) starten: ein großes Ziel in Reichweite, das einer allein nicht schafft, das Bündnis zusammen aber schon
    for (const id in bund.b) {
        const a = bund.b[id]; if (a.mit.length < 2 || now < (bundMem.rallyRunde[id] || 0)) continue;
        bundMem.rallyRunde[id] = now + 45000 + Math.random() * 45000;
        if (bund.r.filter(r => r.aid === id).length >= 2) continue;
        const starter = a.mit.map(w => botById[w]).filter(b => b && !b.mensch && !bund.r.some(r => r.by === b.id) && bundBotBereit(b, now) && b.style !== 'builder')
            .sort((x, y) => staerke(y.id) - staerke(x.id))[0];
        if (!starter) continue;
        const plan = bundRallyPlan(a, starter, now); if (!plan) continue;
        if (!bundRallyStart(a, starter.id, plan)) { bundSignal(a, starter.id, 'angriff', plan.ziel); bundBotGetippt(starter, now); bundSpeichern(); }
    }
}
// Eine Rally auf ein bestimmtes Ziel (Chat: „machst du eine Rally?“): die stärkste freie Basis mit Weg dorthin → Plan oder null
function bundRallyFuer(w, z, now) {
    const T = islandById[z], thr = botThreatened(w); if (!T) return null; let best = null;
    for (const id of botOwnedIslands[w] || []) { if (thr.has(id) || id === megaTempleId) continue;
        const n = Math.floor((islandTroops[id] || 0) * .8), I = islandById[id]; if (n < 5000 || !I) continue;
        if (!routeFor(I.landmassId, T.landmassId, w) || !bundWeg(I.landmassId, T.landmassId, w, n)) continue;
        if (!best || n > best.n) best = { basis: id, ziel: z, min: 3, n }; }
    return best;
}
function bundRallyPlan(a, bot, now) {                            // → { basis, ziel, min, n } oder null
    const own = [...botOwnedIslands[bot.id]], thr = botThreatened(bot.id);
    const quellen = own.filter(id => !thr.has(id) && id !== megaTempleId && (islandTroops[id] || 0) > 5000).sort((x, y) => (islandTroops[y] || 0) - (islandTroops[x] || 0)).slice(0, 3);
    if (!quellen.length) return null;
    const kennt = botKennt(bot.id), atk = botAtkFactor(bot, true);
    // was das Bündnis in ~3 Minuten zum Sammelpunkt bringen kann (grob: die halbe Besatzung der großen Basen in der Nähe)
    const kraft = at => { let s = (islandTroops[at] || 0) * .9; const A = islandById[at];
        for (const w of a.mit) { if (w === bot.id) continue; const top = [...bundBasen(w)].sort((x, y) => (islandTroops[y] || 0) - (islandTroops[x] || 0)).slice(0, 4);
            for (const id of top) { const I = islandById[id]; if ((I.landmassId === A.landmassId || landmassesConnected(I.landmassId, A.landmassId)) && travelDurationSeconds(I, A, w === 'player' ? undefined : w) < 150) s += (islandTroops[id] || 0) * .4; } }
        return s; };
    let best = null, gespaeht = false;
    for (const at of quellen) {
        const A = islandById[at], k = kraft(at), allein = (islandTroops[at] || 0) * .95 * atk;
        for (const lm of reachableLandmassIds[A.landmassId] || []) {
            if (!kennt.has(lm) || !landmassesConnected(A.landmassId, lm)) continue;
            for (const t of islandsByLandmass[lm] || []) {
                const ow = islandOwnerOf(t.id); if (!ow || bundZielOk(bot.id, t.id)) continue;
                const it = botIntel(bot, t.id);
                if (!it) { if (!gespaeht && !botScouting(bot, t.id) && (t.type !== 'tower' || (islandLevels[t.id] || 1) >= 5) && Math.random() < .2) { gespaeht = true; botLearn(bot.id, t.id, now + scoutSecs(A, t, bot.id) * 1000, A.landmassId); } continue; }   // erst spähen (einer pro Runde)
                const s = it.s; if (s < allein * .9 || s > k * atk * .85) continue;                // allein zu schwer, gemeinsam machbar
                const reiz = (t.id === megaTempleId ? .2 : t.type === 'temple' ? .5 : 1) * (botById[ow] && botById[ow].mensch ? .7 : 1) * (1 + landmasses[t.landmassId].ring * .15) * Math.hypot(t.x - A.x, t.y - A.y);
                if (!best || reiz < best.reiz) best = { reiz, at, ziel: t.id };
            }
        }
    }
    if (!best) return null;
    return { basis: best.at, ziel: best.ziel, min: Math.random() < .5 ? 3 : 5, n: Math.floor((islandTroops[best.at] || 0) * .9) };
}
// (Weltrechner) jede Sekunde: Rallys losschicken, alte Signale weg, die Mitspieler handeln lassen
function bundTakt() {
    if (!window.WELT || !WELT.leiter) return;
    const now = Date.now(); let geaendert = false;
    for (const r of bund.r.slice()) if (now >= r.los) try { bundRallyLos(r); } catch (e) { bund.r = bund.r.filter(x => x !== r); console.warn('Rally:', e); }   // (eine kaputte Rally hält den Takt nicht an)
    try { bundChatTakt(now); } catch (e) { if (!bundTakt.chatGewarnt) { bundTakt.chatGewarnt = true; console.warn('Bündnis-Chat:', e); } }
    for (const id in bund.b) { const a = bund.b[id], vor = (a.sig || []).length; a.sig = (a.sig || []).filter(s => now - s.at < 30 * 60000); if (a.sig.length !== vor) geaendert = true;
        const q = (a.anfragen || []).length; a.anfragen = (a.anfragen || []).filter(x => now - x.at < 24 * 3600000 && !bundVon(x.w)); if (a.anfragen.length !== q) geaendert = true;
        const e = (a.einl || []).length; a.einl = (a.einl || []).filter(x => now - x.at < BUND_EINL_MS && !bundVon(x.w) && botById[x.w]); if (a.einl.length !== e) geaendert = true;
        if (!a.mit.length) { delete bund.b[id]; geaendert = true; } else if (!a.mit.includes(a.anf)) { a.anf = a.mit[0]; geaendert = true; } }
    if (geaendert) bundSpeichern();
    try {
        bundWegMem.clear();
        if (now - bundMem.sigSeh > 2500) { bundMem.sigSeh = now; bundMitspielerSignale(now); bundMitspielerAntworten(now); }
        if (now - bundMem.rallySeh > 4000) { bundMem.rallySeh = now; bundMitspielerRally(now); }
        if (now - bundMem.runde > 15000) { bundMem.runde = now; bundMitspielerRunde(now); bundHilfeTakt(now); }
    } catch (e) { if (!bundTakt.gewarnt) { bundTakt.gewarnt = true; console.warn('Bündnisse:', e); } }
}
setInterval(bundTakt, 1000);

