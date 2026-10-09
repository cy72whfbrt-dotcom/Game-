// Teil 10d5-welt-befehle.js: Weltrechner: Befehle der Spieler (BEFEHLE), Admin-Geschenke, Bündnis-Kisten (im Block „if (window.WELT)“ aus 10d1 – nur zusammengesetzt gültig)
    // Ziel einer Armee/Ort einer neuen Armee: nur echte Orte (Basis, Feld, Armee, Punkt auf Land)
    function punktOk(p) {
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > FRAME_HALF || Math.abs(p.y) > FRAME_HALF) return false;
        const lm = landmasses.find(l => l.id === p.lm); return !!lm && Math.hypot(p.x - lm.x, p.y - lm.y) <= lm.shapeMaxR * 1.2;
    }
    function zielPruefen(t) {
        if (!t || typeof t !== 'object') return null;
        if (t.kind === 'base' || t.kind === 'home') { const i = Number.isInteger(t.id) ? islandById[t.id] : null; return i ? { kind: t.kind, id: i.id, x: i.x, y: i.y, lm: i.landmassId } : null; }
        if (t.kind === 'field') { const f = (typeof t.id === 'number' || typeof t.id === 'string') ? fieldById[t.id] : null; return f ? { kind: 'field', id: f.id, x: f.x, y: f.y, lm: f.landmassId } : null; }
        if (t.kind === 'army') { const a = kennungOk(t.id) ? armyById(t.id) : null; return a ? Object.assign({ kind: 'army', id: a.id }, armyPosXY(a)) : null; }
        if (t.kind === 'point') return punktOk(t) ? { kind: 'point', x: t.x, y: t.y, lm: t.lm } : null;
        return null;
    }
    const heldOk = h => kennungOk(h) ? h : null;
    const truppenVon = (id, n) => zahlOk(n) ? Math.floor(Math.min(n, islandTroops[id] || 0)) : 0;   // nie mehr, als die Basis hat
    // Wege wie auf dem Handy (dort prüft das Spiel sie in den Fenstern): Brücken, Pässe, fremde Tore – nie mehr nur „vertrauen“
    const wegOk = (who, vonLm, nachLm) => vonLm === nachLm || canReach(vonLm, nachLm, who);
    // Mehrfachangriff (höchstens MULTI_ATTACK_MAX Ziele, MULTI_ATTACK_GEM_COST Gems) / „Truppen sammeln“ (RECALL_GEM_COST) (grp): zusammen EIN Marsch-Platz (wie am Handy).
    // Gehört der Marsch zu einer schon laufenden Gruppe, ist sie bezahlt. Sonst ohne Gem: ein normaler Marsch (eigener Platz).
    function gruppeBezahlt(who, grp, src, nach) {
        if (!kennungOk(grp)) return null;
        if (AUF && AUF.gruppeLaeuft && AUF.gruppeLaeuft(who, grp, src)) {
            if (src !== undefined && pendingAttacks.filter(a => werIstWer(a.attackerBotId) === who && a.grp === grp).length >= MULTI_ATTACK_MAX) return null;   // (11. Ziel: normaler Marsch)
            if (nach === undefined || pendingSends.some(s => werIstWer(s.senderBotId) === who && s.grp === grp && !s.back && s.toId === nach)) return grp;   // (sammeln: alle zur SELBEN Basis)
            return null; }
        const hb = hbDa(who); if (!hb) return grp;                        // (noch kein Hauptbuch: wie bisher)
        if (hbZahlen(who, hb, wacheSehen(who), { g: src !== undefined ? MULTI_ATTACK_GEM_COST : RECALL_GEM_COST })) { saveBotState(); return grp; }
        warnen(who, 'gems', (src !== undefined ? 'Mehrfachangriff' : 'Truppen sammeln') + ' ohne die Gems dafür – zählt als normaler Marsch.', 1); return null;
    }
    const werIstWer = x => x || 'player';
    const BEFEHLE = {
        angriff(who, b) {
            if (!inselOk(b.src) || !inselOk(b.ziel) || !zahlOk(b.n) || b.n < 1) { warnen(who, 'kaputt', 'Angriff mit kaputten Angaben – abgelehnt.'); return; }
            if (islandOwnerOf(b.ziel) === who) { warnen(who, 'kaputt', 'Angriff auf die eigene Basis – abgelehnt.'); return; }   // (brachte sonst Gratis-EP)
            if (!gehoert(b.src, who)) return;
            if (!wegOk(who, islandById[b.src].landmassId, islandById[b.ziel].landmassId)) { warnen(who, 'weg', 'Angriff ohne Weg dorthin (Brücke/Tor) – abgelehnt.'); nichtLos(who, null, b.src, 'Angriff auf ' + islandTitle(islandById[b.ziel]), 'kein Weg – ein fremdes Tor liegt dazwischen'); return; }
            b.n = Math.floor(b.n);
            naechsteGruppe = gruppeBezahlt(who, b.grp, b.src);                // Mehrfachangriff = ein Marsch-Platz (nur vom selben Ort, nur kurz nacheinander)
            const grpA = naechsteGruppe; let okA = false;
            try { okA = launchAttack(b.src, b.ziel, who, b.n, heldOk(b.held), heldOk(b.held2)); } finally { naechsteGruppe = null; }
            if (!okA) nichtLos(who, grpA, b.src, 'Angriff auf ' + islandTitle(islandById[b.ziel]));   // (vorher: still verworfen – auf dem Handy verschwand der Marsch einfach)
        },
        senden(who, b) {
            if (!inselOk(b.von) || !inselOk(b.nach) || !zahlOk(b.n) || b.n < 1) { warnen(who, 'kaputt', 'Senden mit kaputten Angaben – abgelehnt.'); return; }
            if (!gehoert(b.von, who) || !gehoert(b.nach, who)) return;
            if (!wegOk(who, islandById[b.von].landmassId, islandById[b.nach].landmassId)) { warnen(who, 'weg', 'Senden ohne Weg dorthin (Brücke/Tor) – abgelehnt.'); nichtLos(who, null, undefined, 'Truppen nach ' + islandTitle(islandById[b.nach]), 'kein Weg – ein fremdes Tor liegt dazwischen'); return; }
            b.n = Math.floor(b.n);
            const vI = islandById[b.von], nI = islandById[b.nach];               // („Truppen sammeln“: nur aus dem Umkreis, wie am Handy)
            naechsteGruppe = Math.hypot(vI.x - nI.x, vI.y - nI.y) <= RECALL_RADIUS ? gruppeBezahlt(who, b.grp, undefined, b.nach) : null;
            const grpS = naechsteGruppe, kS = pendingSends.length;
            try { launchSend(b.von, b.nach, who, b.n); } finally { naechsteGruppe = null; }
            if (pendingSends.length === kS) nichtLos(who, grpS, undefined, 'Truppen nach ' + islandTitle(islandById[b.nach]));
        },
        zurueck(who, b) {                             // umkehren: wie bei dir, nur als "Marsch zurück" dieses Spielers
            if (!kennungOk(b.key)) return;
            const m = marschVon(who, b.key); if (!m) { const sp = spaeherVon(who, b.key); if (sp) sp.weg(); return; }   // (sein Späher kehrt um)
            if (m.fightEndsAt || m.rally || m.back) return;   // (eine Rally gehört allen, die mitmachen; wer schon heimgeht, kehrt nicht nochmal um)
            if (!pendingAttacks.includes(m) && !pendingSends.includes(m)) { marschUmkehren(m, Date.now()); requestRender(); return; }   // Lager, Boss, Sammler
            const now = Date.now(), fromId = m.sourceId ?? m.fromId, toId = m.targetId ?? m.toId, troops = m.rawTroops ?? m.troops;
            if (pendingAttacks.includes(m)) heroWutZurueck(who, m.hx);   // (nicht gekämpft: die Wut bleibt)
            (pendingAttacks.includes(m) ? pendingAttacks : pendingSends).splice((pendingAttacks.includes(m) ? pendingAttacks : pendingSends).indexOf(m), 1);
            const home = gehoert(fromId, who) ? fromId : botCapitalOf(who); if (home === null || home === undefined) return;   // (keine Basis mehr: weiterlaufen statt Truppen verlieren)
            pendingSends.push({ fromId: toId, toId: home, troops, startedAt: now, resolveAt: now + Math.max(1000, Math.min(now, m.resolveAt) - m.startedAt), senderBotId: who, back: true });
            saveGame(); saveProgression(); requestRender();
        },
        schneller(who, b) {                           // die Gems zahlt er auf seinem Handy – 3B: das Hauptbuch zieht sie ab (kann er sie haben?)
            if (!Array.isArray(b.keys)) return;
            if (zuOft(wm(who), 'schneller', 60, 60000)) { warnen(who, 'schneller', 'Beschleunigen über 60-mal pro Minute – der Rest verfällt.'); return; }
            const now = Date.now(), keys = [...new Set(b.keys.filter(kennungOk))].slice(0, 200), ms = [];
            for (const key of keys) { const m = marschVon(who, key) || spaeherVon(who, key); if (!m || m.fightEndsAt || m.resolveAt - now < 1500) continue; ms.push(m); }   // (auch seine Späher)
            const kosten = ms.reduce((a, m) => a + speedUpCost(m), 0), hb = hbDa(who);
            if (hb && kosten > 0 && !b._nach && !schonBezahlt(wacheSehen(who), b, true) && !hbZahlen(who, hb, wacheSehen(who), { g: kosten })) { warnen(who, 'gems', 'Beschleunigen für ' + kosten + ' Gems – so viele kann er nicht haben. Abgelehnt.', kosten); return; }
            for (const m of ms) { const rem = m.resolveAt - now;
                const pr = Math.max(0, Math.min(.99, (now - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt))); m.resolveAt = now + rem / 2; m.startedAt = m.resolveAt - (rem / 2) / (1 - pr); if (m.setz) m.setz(); }
            saveProgression(); feldBarbSpeichern(); if (ms.length) befehlBezahlt(b);
        },
        spaehen(who, b) {                             // 3B: Erkundungs-Späher – der Weltrechner deckt seinen Nebel (auf dem Server) mit auf
            const nein = () => { if (b.blick && inselOk(b.ziel)) WELT.nachricht(parseInt(who.slice(1), 10), { art: 'spaeh', ziel: b.ziel, fehl: 1 }); };   // (Spähbericht abgelehnt: das Handy wartet sonst für immer)
            const hb = hbDa(who); if (!hb || !inselOk(b.ziel)) return nein();
            if (zuOft(wm(who), 'spaehen', 120, 3600000)) { warnen(who, 'spaehen', 'Über 120 Späher in einer Stunde – abgelehnt.'); return nein(); }
            const t = islandById[b.ziel], pt = { x: Number.isFinite(b.ex) ? b.ex : t.x, y: Number.isFinite(b.ey) ? b.ey : t.y, lm: t.landmassId };
            if (b.blick) {                            // Späher zu einer fremden Basis: bei Ankunft schreibt der Weltrechner den Bericht (nur er kennt die Werte des Herrn)
                const ow = islandOwnerOf(t.id); if (!ow || ow === who || bossAt(t.id) || neulingAktiv(ow)) return nein();   // (Anfängerschutz: niemand späht Neulinge aus)
                let h = null, hd = Infinity; for (const id of botOwnedIslands[who] || []) { const i = islandById[id]; if (!i) continue; const d = Math.hypot(i.x - t.x, i.y - t.y); if (d < hd) { hd = d; h = i; } }
                if (!h || !spaeherWeg(h.landmassId, t.landmassId, who)) return nein();
                if (!nbKennt(who, hb, t.landmassId)) { warnen(who, 'spaehen', 'Späher zu einer Basis, die er nicht kennen kann – abgelehnt.'); return nein(); }
                const now = Date.now(); hb.sb = (hb.sb || []).slice(-20); hb.sb.push([t.id, now + scoutSecs(h, t, who) * 1000, kennungOk(b.key) ? b.key : 0, now]); saveBotState(); return;   // (Kennung: Zurück/Schneller vom Handy)
            }
            if (!punktOk(pt)) { warnen(who, 'kaputt', 'Späher mit kaputtem Ziel – abgelehnt.'); return; }
            let home = null, bd = Infinity; for (const id of botOwnedIslands[who] || []) { const i = islandById[id]; if (!i) continue; const d = Math.hypot(i.x - t.x, i.y - t.y); if (d < bd) { bd = d; home = i; } }
            if (!home || !spaeherWeg(home.landmassId, t.landmassId, who)) return;                 // (wie auf dem Handy: von der nächsten eigenen Basis, nicht durch zu Tore)
            if (!nbKennt(who, hb, t.landmassId)) { warnen(who, 'spaehen', 'Späher in ein Gebiet, das er nicht kennen kann – abgelehnt.'); return; }
            const now = Date.now(); hb.sp = (hb.sp || []).slice(-40); hb.sp.push([home.id, Math.round(pt.x), Math.round(pt.y), now, now + scoutSecs(home, t, who) * 1000, 0, kennungOk(b.key) ? b.key : 0]); saveBotState();
        },
        ausbau(who, b) {                              // die Münzen zahlt er selbst – der Weltrechner prüft, ob er sie haben kann
            const m = wm(who);
            if (zuOft(m, 'ausbau', 60, 10000)) { warnen(who, 'ausbau', 'Ausbau über 60-mal in 10 s – der Rest verfällt.'); return; }
            const x = { b, bis: Date.now() + WACHE_WARTEN_MS }; m.warte.ausbau.push(x); wacheAbarbeiten(who);
            if (m.warte.ausbau.includes(x)) { x.wartet = true; return 'wartet'; }   // (noch nicht entschieden: welt.js quittiert ihn noch nicht)
        },
        teleport(who, b) {                            // Hauptstadt an eine freie Stelle (08d tpPruefen) – nur echte Spieler
            const bs = loadBotState()[who]; if (!bs || !bs.mensch || typeof b.x !== 'number' || typeof b.y !== 'number') return;
            if (zuOft(wm(who), 'teleport', 20, 3600000)) { warnen(who, 'teleport', 'Über 20-mal in einer Stunde teleportiert – abgelehnt.'); return; }
            if (tpPruefen(who, b.x, b.y)) return;           // (kein Platz, Pass zu, Marsch unterwegs – das Handy prüft dasselbe; ein Wettlauf ist kein Schummeln)
            if (b.gratis === true) { if (!tpGratis(who)) { warnen(who, 'teleport', 'Gratis-Teleport verlangt, steht ihm nicht (mehr) zu – abgelehnt.'); return; } bs.tpGratis = 1; }
            else { const hb = hbDa(who); if (hb && !b._nach && !schonBezahlt(wacheSehen(who), b, true) && !hbZahlen(who, hb, wacheSehen(who), { g: TP_GEMS })) { warnen(who, 'gems', 'Teleport für ' + TP_GEMS + ' Gems – so viele kann er nicht haben. Abgelehnt.', TP_GEMS); return; } }
            tpVerlegen(who, b.x, b.y); saveBotState(); befehlBezahlt(b);
        },
        truppen(who, b) {                             // geschenkte Truppen (Stufe, Thron-Shop, Krankenhaus, Fund, Admin) → Hauptstadt
            const x = { b, bis: Date.now() + WACHE_WARTEN_MS }, l = wm(who).warte.truppen; l.push(x); wacheAbarbeiten(who);
            if (l.includes(x)) { x.wartet = true; return 'wartet'; }
        },
        tor(who, b) {
            if (!inselOk(b.tor) || islandById[b.tor].type !== 'gate' || !gehoert(b.tor, who) || !b.patch || typeof b.patch !== 'object') return;
            const patch = {};
            if (b.patch.toll !== undefined) { if (!GATE_TOLLS.includes(b.patch.toll)) { warnen(who, 'kaputt', 'Tor-Maut mit ungültigem Wert (' + String(b.patch.toll).slice(0, 20) + ') – abgelehnt.'); return; } patch.toll = b.patch.toll; }
            if (b.patch.closed !== undefined) patch.closed = b.patch.closed === true;
            if (Object.keys(patch).length) setGateSettings(b.tor, patch);
        },
        titel(who, b) {
            if (rulerOwner() !== who || !TITLES.some(x => x.key === b.key)) return;
            const wem = b.wem ? (kennungOk(b.wem) ? lokalId(b.wem) : null) : null;
            if (b.wem && (!wem || !botById[wem] || wem === who)) return;   // (sich selbst keinen Titel)
            giveTitle(b.key, wem);
        },
        thronKiste(who, b) {                          // der Herrscher verschenkt eine Kiste (06c herrKiste prüft: Herrscher, noch da, nicht an sich selbst)
            const an = kennungOk(b.wem) ? lokalId(b.wem) : null;
            herrKiste(who, typeof b.kiste === 'string' ? b.kiste : '', an);   // (keine mehr da / kein Herrscher mehr: ein Wettlauf, kein Schummeln)
        },
        feld(who, b) {
            const f = (typeof b.feld === 'number' || typeof b.feld === 'string') ? resFields.find(x => x.id === b.feld) : null;
            if (!f || !inselOk(b.home) || !gehoert(b.home, who)) return;
            if (!wegOk(who, islandById[b.home].landmassId, f.landmassId)) { warnen(who, 'weg', 'Sammeln ohne Weg dorthin – abgelehnt.'); return; }
            const st = fieldInfo(f); if (st.left <= 0 && !(st.occ && st.occ.who === who)) return;   // leer (wächst nach): nichts zu holen
            const n = truppenVon(b.home, b.n); if (n >= 1) fieldSend(who, b.home, b.feld, n, heldOk(b.held), heldOk(b.held2));
        },
        feldHeim(who, b) { const f = resFields.find(x => x.id === b.feld), st = f && fieldInfo(f); if (st && st.occ && st.occ.who === who) { fieldGoHome(f, st, Date.now()); saveFields(); } },
        lager(who, b) {
            if (!inselOk(b.home) || !gehoert(b.home, who) || !['c', 'b'].includes(b.k)) return;
            // Tagesgrenzen wie auf dem Handy (Boss 10 Angriffe, Lager 20 pro Tag) – auch, was gerade unterwegs ist, zählt mit
            // (Boss: der Zähler steigt schon beim Losschicken; Lager: beim Sieg – darum zählen dort die unterwegs mit, wie barbLeft)
            if (b.k === 'b' ? barbRec(who).h >= dbossHitsMax() : barbLeft(who) <= 0) { warnen(who, 'lager', 'Tagesgrenze für ' + (b.k === 'b' ? 'den Boss' : 'Lager') + ' überschritten – abgelehnt.'); return; }
            if (b.k === 'c') { const c = barbCampById(b.tid); if (!c || !barbOpenFor(who, c.L)) return;   // nur Lager, die schon freigespielt sind
                if (!wegOk(who, islandById[b.home].landmassId, c.lm)) { warnen(who, 'weg', 'Lager-Angriff ohne Weg dorthin – abgelehnt.'); return; } }
            const n = truppenVon(b.home, b.n); if (n >= 1) barbSend(who, b.home, b.k, b.k === 'c' ? b.tid : null, n, heldOk(b.held), heldOk(b.held2));
        },
        armee(who, b) {
            if (b.op === 'neu') {
                if (!b.pt || !punktOk(b.pt) || !Array.isArray(b.quellen)) return;
                const q = b.quellen.slice(0, 10).filter(id => inselOk(id) && gehoert(id, who) && wegOk(who, islandById[id].landmassId, b.pt.lm));
                const anteil = zahlOk(b.anteil, 1) ? b.anteil : .5;
                if (q.length) armyCreate({ x: b.pt.x, y: b.pt.y, lm: b.pt.lm }, q, anteil, who); return;
            }
            const a = kennungOk(b.id) ? armyById(b.id) : null; if (!a || armyWho(a) !== who) return;
            if (b.op === 'dazu' && inselOk(b.quelle) && gehoert(b.quelle, who) && wegOk(who, islandById[b.quelle].landmassId, armyPosXY(a).lm)) {   // (wo sie jetzt ist – unterwegs nicht mehr a.lm)
                const n = truppenVon(b.quelle, b.n); if (n >= 1) armySendFrom(a, b.quelle, n); }
            if (b.op === 'ziehen') { const t = zielPruefen(b.ziel); if (t) armyMove(a, t); }
            if (b.op === 'held') armySetHeroes(a, heldOk(b.held), heldOk(b.held2));   // Haupt- und Zweitheld: nur eigene, freie (armySetHeroes prüft)
            saveArmies(); requestRender();
        },
        vheld(who, b) {                               // Verteidigungs-Helden in der Mauer: nur eigene Helden, Zweitheld erst ab Mauer 5 (vhSetzen prüft)
            if (zuOft(wm(who), 'vheld', 60, 60000)) { warnen(who, 'vheld', 'Verteidigungs-Helden über 60-mal pro Minute geändert – der Rest verfällt.'); return; }
            const h1 = b.h1 ? heldOk(b.h1) : null, h2 = b.h2 ? heldOk(b.h2) : null;
            if ((b.h1 && !h1) || (b.h2 && !h2) || !vhSetzen(who, h1, h2)) warnen(who, 'vheld', 'Verteidigungs-Held, den er nicht hat (oder Zweitheld unter Mauer ' + VH_ZWEIT_MAUER + ') – abgelehnt.');
        },
        beitreten(who, b) {                           // ein neuer Spieler braucht seinen Platz auf der Karte
            if (!botOwnedIslands[who]) window.__weltNeuerMensch(who);
            if (botOwnedIslands[who] && botOwnedIslands[who].size) return;      // hat schon einen
            let isl = inselOk(b.insel) ? islandById[b.insel] : null, aus = null;
            if (isl && landmasses[isl.landmassId].tier !== 'outer') isl = null;   // Start nur am äußeren Rand (nicht in der Mitte oder bei den Wächtern)
            if (!isl || isl.type !== 'tower' || islandOwnerOf(isl.id)) {
                const besitz = { player: [...ownedIslands] }; for (const bot of BOT_DEFS) besitz[bot.id] = [...(botOwnedIslands[bot.id] || [])];
                const p = freierStartplatz(besitz); isl = p.insel; aus = p.aus || null;
            }
            if (!isl || (islandOwnerOf(isl.id) && !aus)) return;
            if (aus) { clearIslandOwner(isl.id); WELT.nachricht(parseInt(who.slice(1), 10), { art: 'startschild', bis: Date.now() + 3600000 }); }   // mitten in fremdem Land: 1 Stunde Frieden zum Ankommen (wie bei den Mitspielern)
            botOwnedIslands[who].add(isl.id); islandLevels[isl.id] = 1; islandTroops[isl.id] = PLAYER_START_TROOPS;
            const bs = loadBotState(); bs[who] = WELT.profilZuBot(WELT.menschen[who] && WELT.menschen[who].profil, bs[who], who); bs[who].capital = isl.id;
            if (!(bs[who].neuBis > Date.now())) bs[who].neuBis = Date.now() + NEULING_MS;          // Anfängerschutz ab der ersten Sekunde
            capitalCache = null; saveGame(); saveBotState(); requestRender();
        }
    };
    // Vom Admin (kommt nur von admin.php – der Server legt es unter Spieler 0 ab): Geschenk an einen Bot oder alle Bots,
    // oder die Gutschrift für ein Geschenk an einen echten Spieler (damit der Schummel-Schutz es beim Abholen durchlässt)
    function adminBefehl(b) {
        if (!b || b.art !== 'admin') return;
        if (b.was === 'gutschrift') {
            const who = 'u' + parseInt(b.an, 10); if (!(parseInt(b.an, 10) > 0)) return;
            if (!botById[who]) { WELT.menschEintragen(who); window.__weltNeuerMensch(who); }
            const d = wd(who); if (!d) return;
            d.gTr = nn(d.gTr) + (zahlOk(b.tr) ? b.tr : 0); d.gC = nn(d.gC) + (zahlOk(b.coins) ? b.coins : 0);
            const hb = hbDa(who); if (hb) {             // 3B: Gems, Splitter und Kiste kennt jetzt auch das Hauptbuch
                if (zahlOk(b.gems, 1e9)) hb.gIn = nn(hb.gIn) + b.gems; if (zahlOk(b.sh, 1e6)) hb.shB = nn(hb.shB) + b.sh;
                if (Number.isInteger(b.crate) && b.crate >= 0 && b.crate <= 5) hbKisteDazu(hb, b.crate); }
            saveBotState(); return;
        }
        if (b.was === 'nebel') {                       // 3B: Nebel freischalten (admin.php) – auch auf dem Server die ganze Karte
            const bs = loadBotState();
            for (const who in WELT.menschen) { if (b.an !== 'alle' && who !== 'u' + parseInt(b.an, 10)) continue; const hb = hbDa(who); if (!hb) continue; hb.nbAlle = 1; if (nbMem[who]) nbMem[who].dirty = true; }
            saveBotState(); return;
        }
        if (b.was === 'saison') { saisonJetzt(); return; }   // Admin-Knopf „Neue Saison jetzt“ (mit Rückfrage): erst die Sicherung, dann der Reset (09f-saison.js)
        if (b.was !== 'geschenk_bot') return;
        const bs = loadBotState(), ziele = BOT_DEFS.filter(d => !d.mensch && (b.bot === 'alle' || d.id === b.bot));
        for (const d of ziele) { const st = bs[d.id]; if (!st) continue;
            if (b.gems > 0) st.gems = (st.gems || 0) + Math.round(b.gems);
            if (b.coins > 0) botCoins[d.id] = (botCoins[d.id] || 0) + Math.round(b.coins);
            if (b.sh > 0) try { heroGrantShards(d.id, Math.round(b.sh)); } catch (e) {}
            if (b.tr > 0) { const c = botCapitalOf(d.id); if (c !== null && c !== undefined) islandTroops[c] = (islandTroops[c] || 0) + Math.round(b.tr); }
            if (b.crate >= 0 && st.spare) { const k = pickRandomSlot(); if (st.spare[k]) st.spare[k][Math.max(b.crate, pickRandomRarity())]++; }   // wie eine Kiste: der Bot legt sie selbst an
        }
        saveBotState(); saveGame(); requestRender();
    }
    window.__weltBefehl = function (who, b) {
        if (who === 'u0') return adminBefehl(b);
        if (!b || typeof b !== 'object' || !Object.prototype.hasOwnProperty.call(BEFEHLE, b.art)) return;
        if (saison && saison.nr > 1 && ((zahlOk(b._t) && b._t < saison.start) || (zahlOk(b.at) && b.at < saison.start - 600000))) return;   // ein Befehl aus der alten Welt-Saison (vor dem Reset gekommen oder gegeben) – gilt nicht mehr
        const f = BEFEHLE[b.art];
        if (!botById[who]) { WELT.menschEintragen(who); window.__weltNeuerMensch(who); }
        if (!botById[who]) return;
        if (zuOft(wm(who), 'alle', 600, 60000)) { warnen(who, 'flut', 'Über 600 Befehle in einer Minute – der Rest verfällt.'); return; }
        return f(who, b);                              // ('wartet': noch nicht entschieden – siehe befehlFertig)
    };
    WELT.BEFEHLE = BEFEHLE;
    // für buendnis.js: Münzen prüfen (ohne abzuziehen – das geht als Nachricht „−Münzen“), Gutschrift für Geschenke, Warnungen
    // Bündnis-Geschenk für eine große Kiste (buendnis.js op 'kiste'): nur für eine ECHTE Heldenkiste. Beleg = EIN Profil-Schritt, in
    // dem mindestens so viele Helden-Splitter neu dazukamen (ohne bekannte Quelle – nur Heldenkisten machen aus Gems Splitter) UND
    // mindestens so viele Gems weg sind, wie genau diese Kiste hat (Kauf am Handy: Gems weg und Splitter da im selben Augenblick).
    // Jeder Beleg zählt nur einmal (Splitter und Gems werden verbraucht), höchstens 10 Min. vorher oder nachher; der Rest des
    // Preises, den die Splitter nicht schon gekostet haben, wird im Hauptbuch abgebucht. Ein Schild oder anderer Gem-Kauf hat keine
    // Splitter, Splitter ohne Gems (Aufgaben, Pass) haben keine Ausgabe – beides ist nie ein Beleg. Befehl und Profil kommen in
    // beliebiger Reihenfolge – ein Befehl ohne Beleg wartet (und verfällt nach 10 Min.).
    const KISTE_FRIST = 600000;
    function hbKisteFrei(who, hb, now) {
        const L = (hb.kisteOffen || []).filter(k => now - k.t < KISTE_FRIST), B = (hb.shKauf || []).filter(x => now - x.t < KISTE_FRIST);
        let n = 0; const bleibt = [];
        for (const k of L) {
            const x = B.find(y => y.sh >= k.sh - 1e-6 && nn(y.gd) >= k.g - 1e-6); if (!x) { bleibt.push(k); continue; }   // kein passender Beleg (noch nicht)
            const anteil = x.sh > 0 ? Math.min(1, k.sh / x.sh) : 0, gSchon = nn(x.g) * anteil, fehlt = Math.max(0, Math.round(k.g - gSchon));
            if (fehlt > 0 && !hbZahlen(who, hb, wacheSehen(who), { g: fehlt })) { bleibt.push(k); continue; }
            x.sh -= k.sh; x.gd = nn(x.gd) - k.g; x.g = nn(x.g) - gSchon; n++;
        }
        hb.kisteOffen = bleibt; hb.shKauf = B.filter(y => y.sh > 1e-6 && nn(y.gd) > 1e-6);
        for (let i = 0; i < n; i++) if (typeof bundGeschenk === 'function') bundGeschenk(who, 'kiste');
    }
    WELT.kisteGekauft = function (who, c) {
        const hb = hbDa(who); if (!hb || !c || !(c.gems > 0)) return;
        const L = hb.kisteOffen || (hb.kisteOffen = []); L.push({ g: c.gems, sh: c.sh * c.n, t: Date.now() }); if (L.length > 5) L.shift();
        hbKisteFrei(who, hb, Date.now()); saveBotState();
    };
    WELT.wache = {
        kann(who, kosten) { const m = wacheSehen(who), d = wd(who), hb = hbDa(who); vorAltern(who, m, Date.now()); return m.c.vor + m.c.u + (hb ? nn(hb.cA) : 0) + spielraumFrei(who, m) + (d ? nn(d.gC) : 0) >= kosten; },
        gutschrift(who, c, tr) { const d = wd(who); if (!d) return; d.gC = nn(d.gC) + nn(c); d.gTr = nn(d.gTr) + nn(tr); saveBotState(); },
        hilfe(who, key, ms) { const hb = hbDa(who); if (!hb || !(ms > 0)) return; const H = hb.hilfe || (hb.hilfe = {}); H[key] = nn(H[key]) + ms;   // Bündnis-Hilfe: so viel schneller darf dieser Bau / diese Forschung fertig sein
            const ks = Object.keys(H); if (ks.length > 40) delete H[ks[0]]; saveBotState(); },
        warnen, zuOft: (who, art, max, ms) => zuOft(wm(who), art, max, ms)
    };
