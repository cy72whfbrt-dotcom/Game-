// Teil 10d4-welt-nebel-server.js: Weltrechner: Nebel und Sicht der echten Spieler (im Block „if (window.WELT)“ aus 10d1 – nur zusammengesetzt gültig)

    // ===== Nebel auf dem Server (3B) =====
    // Der Weltrechner führt für jeden echten Spieler die aufgedeckten Nebel-Felder (wie openWaterFogCells auf seinem Handy):
    // rund um jede Basis, die er hat oder hatte (Sichtweite mit Forschung Kundschaft), und wo seine Erkundungs-Späher laufen.
    // Daraus: welche Inseln er sieht (wie islandSeen) → als Bitfeld an den Server (WELT.sichtRaus → server.php ow_spieler.sicht).
    // Der Server schickt ihm dann Truppenzahlen nur dieser Inseln (und seiner eigenen).
    let nbIdx = null; const nbMem = {};
    function nbIndex() {                              // alle Felder, die für die Sicht zählen (Land, Inseln, Brücken-Enden) → Bit-Nummer
        if (nbIdx) return nbIdx;
        const keys = new Set(Object.keys(fogLandCells())), zelle = (x, y) => fogKey(Math.floor(x / FOG_CELL), Math.floor(y / FOG_CELL));
        let maxId = 0;
        for (const i of islands) { keys.add(zelle(i.x, i.y)); if (i.ends) for (const e of i.ends) keys.add(zelle(e[0], e[1])); if (i.id > maxId) maxId = i.id; }
        const liste = [...keys].sort();
        return nbIdx = { map: new Map(liste.map((k, i) => [k, i])), n: liste.length, maxId, sig: liste.length + '/' + maxId };
    }
    const bitsZu = u => { let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
    const bitHat = (u, i) => (u[i >> 3] >> (i & 7)) & 1, bitSetz = (u, i) => { u[i >> 3] |= 1 << (i & 7); };
    // aufgedeckte Felder fürs Hauptbuch: nur die Nummern der gesetzten Bits (Abstände, Basis 36) – viel kürzer als das ganze Bitfeld
    function nbPacken(u, n) { const t = []; let vor = -1; for (let i = 0; i < n; i++) if ((u[i >> 3] >> (i & 7)) & 1) { t.push((i - vor).toString(36)); vor = i; } return t.join('.'); }
    function nbAuspacken(s, n) { const u = new Uint8Array(Math.ceil(n / 8)); if (typeof s !== 'string' || !s) return u; let i = -1; for (const x of s.split('.')) { i += parseInt(x, 36); if (!(i >= 0 && i < n)) break; bitSetz(u, i); } return u; }
    function nbAufdecken(z, x, y, r) {                // wie revealAround
        const I = nbIndex(), rr2 = r + FOG_CELL * .35; let neu = false;
        for (let cx = Math.floor((x - r) / FOG_CELL); cx <= Math.floor((x + r) / FOG_CELL); cx++)
            for (let cy = Math.floor((y - r) / FOG_CELL); cy <= Math.floor((y + r) / FOG_CELL); cy++) {
                const i = I.map.get(fogKey(cx, cy)); if (i === undefined || bitHat(z.zellen, i)) continue;
                const mx = (cx + .5) * FOG_CELL, my = (cy + .5) * FOG_CELL;
                if (Math.abs(mx) > FRAME_HALF + FOG_CELL || Math.abs(my) > FRAME_HALF + FOG_CELL || Math.hypot(mx - x, my - y) > rr2) continue;
                bitSetz(z.zellen, i); neu = true;
            }
        return neu;
    }
    const nbOffen = (z, I, x, y) => { const i = I.map.get(fogKey(Math.floor(x / FOG_CELL), Math.floor(y / FOG_CELL))); return i !== undefined && bitHat(z.zellen, i) === 1; };
    function nbZ(who, hb) { const I = nbIndex(); return nbMem[who] || (nbMem[who] = { zellen: nbAuspacken(hb.nbSig === I.sig ? hb.nb : '', I.n), gesehen: new Set(), dirty: true, gesendet: null }); }
    function nbKennt(who, hb, lmId) {                 // kennt er dieses Gebiet (oder ein Nachbar-Gebiet über eine Brücke)?
        const z = nbZ(who, hb), I = nbIndex(), on = id => ((landmasses[id] || {}).fogCells || []).some(c => { const i = I.map.get(c.k); return i !== undefined && bitHat(z.zellen, i); });
        return !!hb.nbAlle || on(lmId) || bridges.some(br => (br.a === lmId && on(br.b)) || (br.b === lmId && on(br.a)));
    }
    function nebelRunde(who, hb, now) {
        const z = nbZ(who, hb), I = nbIndex(), own = botOwnedIslands[who], weit = REVEAL_BASE * (AUF ? AUF.nebelWeite(who) : 1);
        if (own) for (const id of own) if (!z.gesehen.has(id)) { z.gesehen.add(id); const i = islandById[id]; if (i && nbAufdecken(z, i.x, i.y, sichtVon(i, weit))) z.dirty = true; }
        if (hb.sp && hb.sp.length) hb.sp = hb.sp.filter(sc => {    // Erkundungs-Späher: unterwegs eine Gasse, am Ziel die Umgebung
            const h = islandById[sc[0]]; if (!h) return false;
            const L = Math.hypot(sc[1] - h.x, sc[2] - h.y) || 1, prog = Math.max(0, Math.min(1, (now - sc[3]) / Math.max(1, sc[4] - sc[3])));
            for (let d = sc[5] || 0; d <= L * prog; d += 2500) if (nbAufdecken(z, h.x + (sc[1] - h.x) * d / L, h.y + (sc[2] - h.y) * d / L, 3400)) z.dirty = true;
            sc[5] = Math.max(sc[5] || 0, Math.floor(L * prog / 2500) * 2500 + 2500);
            if (now < sc[4]) return true;
            if (nbAufdecken(z, sc[1], sc[2], REVEAL_SCOUT)) z.dirty = true; return false;
        });
        if (!z.dirty) return;
        z.dirty = false; hb.nb = nbPacken(z.zellen, I.n); hb.nbSig = I.sig; saveBotState();
        const s = new Uint8Array((I.maxId >> 3) + 1);
        for (const i of islands) if (hb.nbAlle || nbOffen(z, I, i.x, i.y) || (i.ends && i.ends.some(e => nbOffen(z, I, e[0], e[1])))) bitSetz(s, i.id);
        const b64 = bitsZu(s);
        if (b64 !== z.gesendet) { z.gesendet = b64; WELT.sichtRaus[parseInt(who.slice(1), 10)] = b64; }
    }
    // Späher an einer fremden Basis angekommen: der Bericht so, wie er gerade ist (Truppen, Verteidigung, Blick auf den Herrn) –
    // das Handy hat diese Werte nicht (server.php FREMD_OEFFENTLICH). Ein echter Spieler als Herr erfährt, dass er ausgespäht wurde.
    function spaehRunde(who, hb, now) {
        if (!hb.sb || !hb.sb.some(sc => now >= sc[1])) return;
        hb.sb = hb.sb.filter(sc => {
            if (now < sc[1]) return true;
            const t = islandById[sc[0]], ow = t && islandOwnerOf(t.id);
            const r = { art: 'spaeh', ziel: sc[0] };
            if (ow && ow !== who && neulingAktiv(ow)) { r.fehl = 1; WELT.nachricht(parseInt(who.slice(1), 10), r); return false; }   // inzwischen Anfängerschutz (neu angefangen, Saison): kein Bericht
            if (t) { r.troops = effectiveTroops(t); r.defense = effectiveDefense(t); r.verst = verst.l.reduce((s, v) => s + (v.t === t.id ? v.n : 0), 0); r.spy = ow && ow !== who ? spaeherBlick(ow, t) : null; if (ow && ow !== who) ausgespaeht(ow, who, t.id); }   // (verst: Verstärkung – eigene Zeile im Bericht)
            WELT.nachricht(parseInt(who.slice(1), 10), r); return false;
        });
        if (!hb.sb.length) delete hb.sb;
        saveBotState();
    }
    // Fremde Armeen und besetzte Felder, die er sieht (ihr Feld ist bei ihm aufgedeckt – wie am Handy isCellOpen): nur für die
    // schickt der Server Truppen und Helden (server.php marsch_welt). Geschickt wird nur, wenn sich die Liste ändert.
    function armeeSichtRunde(who, hb) {
        const z = nbZ(who, hb), I = nbIndex(), offen = (x, y) => !!hb.nbAlle || nbOffen(z, I, x, y), l = [];
        for (const a of armies) { if (armyWho(a) === who) continue; const p = armyPos(a); if (p && offen(p.x, p.y)) l.push(String(a.id)); }
        for (const f of resFields) { const st = fieldState[f.id]; if (st && st.occ && st.occ.who !== who && offen(f.x, f.y)) l.push(f.id); }
        const t = JSON.stringify(l.sort());
        if (t !== z.armGesendet) { z.armGesendet = t; WELT.armeeSichtRaus[parseInt(who.slice(1), 10)] = l; }
    }
    // (jeden Puls) Nebel, Abgelehntes nochmal prüfen, jede Minute die Truppen-Summen für die Rangliste
    let hbErst = true;
    // dasselbe (alte) Profil nochmal anwenden – nur fürs Hauptbuch. Was die Welt seitdem gerechnet hat (Rohstoffe, Verwundete,
    // Erfolge, Helden-Splitter: Ertrag, Beute, Kämpfe), bleibt: vorher sprang es auf die Profil-Werte zurück, und welt.js schickte
    // den Unterschied als Nachricht (Beute kam zurück – unbegrenzt Rohstoffe über Plündern; ehrlicher Ertrag ging verloren)
    function hbNochmal(who, b, p) {
        const welt = { res: b.res, wounded: b.wounded, stats: b.stats }, dazu = {}, hb = b.hb;
        for (const k in welt) if (welt[k] === undefined) delete welt[k];
        if (b.hs && hb && hb.hs) for (const h in b.hs) { const z = hb.hs[h]; if (b.hs[h] && z) dazu[h] = nn(b.hs[h].sh) - nn(z[2]); }   // Splitter, die die Welt seitdem gab
        Object.assign(b, WELT.profilZuBot(p, b, who), welt);
        if (b.hs) for (const h in dazu) if (b.hs[h] && dazu[h]) b.hs[h].sh = Math.max(0, nn(b.hs[h].sh) + dazu[h]);   // (auf das, was das Hauptbuch jetzt sagt)
    }
    function hbRunde(now) {
        if (!AUF) return;                              // (der allererste Puls kommt, bevor aufbau.js geladen ist)
        const bs = loadBotState();
        if (hbErst && SYSTEM) {                        // Weltrechner gestartet: alle bekannten echten Spieler einmal gegen ihr Hauptbuch klemmen
            hbErst = false;                            // (die Welt kam beim Laden roh aus den Profilen; jetzt ist auch aufbau.js da)
            for (const who in WELT.menschen) if (bs[who] && WELT.menschen[who].profil) try { Object.assign(bs[who], WELT.profilZuBot(WELT.menschen[who].profil, bs[who], who)); } catch (e) { console.warn('Hauptbuch:', e); }
        }
        for (const who in WELT.menschen) {
            const b = bs[who], hb = b && b.hb && b.hb.v === HB_V ? b.hb : null; if (!hb || !botById[who]) continue;
            try { nebelRunde(who, hb, now); armeeSichtRunde(who, hb); } catch (e) { console.warn('Nebel:', e); }
            try { spaehRunde(who, hb, now); } catch (e) { console.warn('Späher:', e); }
            const mm = wm(who); if (mm.hbOffen && now - nn(mm.hbPrT) > 10000) { const p = profilVon(who); if (p) hbNochmal(who, b, p); else mm.hbOffen = 0; }   // (Münzen/Gems kommen evtl. später)
        }
        if (now - hbTtT > 60000) {                     // Truppen-Summe je Herrscher (Spieler bekommen fremde Truppen nur, wo sie hinsehen dürfen)
            if (Math.floor(now / 600000) !== Math.floor(hbTtT / 600000)) for (const who in nbMem) { if (nbMem[who].gesendet) WELT.sichtRaus[parseInt(who.slice(1), 10)] = nbMem[who].gesendet; nbMem[who].armGesendet = null; }   // (alle 10 Min. die Sicht nochmal – falls ein Puls sie verloren hat; der Server ändert nur Neues)
            hbTtT = now;
            for (const bd of BOT_DEFS) { const b = bs[bd.id]; if (!b) continue; let n = 0; for (const id of botOwnedIslands[bd.id] || []) n += islandTroops[id] || 0;
                const r = n < 1000 ? Math.round(n) : Number(n.toPrecision(3)); if (b.tt !== r && Math.abs((b.tt || 0) - r) > r * .01) b.tt = r;
                let m = 0; try { m = powerOf(whoProfile(bd.id)); } catch (e) { m = 0; }      // Macht für Rangliste, Profil, Bündnis (die Handys kennen die Werte dafür nicht)
                const mr = m < 1000 ? Math.round(m) : Number(m.toPrecision(3)); if (b.macht !== mr && !(Math.abs((b.macht || 0) - mr) <= mr * .01)) b.macht = mr;   // (nur bei Änderung – sonst ein Flicken je Minute)
                const fp = AUF.foSumme(bd.id); if (b.foP !== fp) b.foP = fp; }   // Forschung zusammen (Rangliste „Hauptstadt“ – die Forschung selbst sehen andere erst im Spähbericht)
        }
    }
