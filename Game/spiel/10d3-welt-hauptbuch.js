// Teil 10d3-welt-hauptbuch.js: Weltrechner: Hauptbuch der echten Spieler, Saison-Konto (im Block „if (window.WELT)“ aus 10d1 – nur zusammengesetzt gültig)

    // ===== HAUPTBUCH (3B): das Konto eines echten Spielers liegt beim Weltrechner =====
    // Das Handy rechnet weiter (Münzen, Gems, Stadt, Ausrüstung …), aber was die WELT benutzt (Kampf, Marsch-Plätze, Truppen-
    // Stufe, Forschung, Helden, Schild), kommt aus diesem Hauptbuch – nicht aus dem rohen Profil. Gespeichert in
    // botState[u<id>].hb (geht mit der Welt mit, Spieler bekommen es nie: server.php NUR_WELTRECHNER).
    // Sichere Quellen zählt der Weltrechner selbst (EP, Kampf-Beute, Preise, Splitter, Kisten aus Nachrichten, Admin-Geschenke).
    // Was nur das Handy gibt (Tagesbelohnung, Aufgaben, Erfolge, Funde, Pass), kommt als Spielraum pro Tag dazu (HB_TAG).
    // Jede Neuerung im Profil wird nach festen Regeln angenommen – oder nicht:
    //   Burg/Gebäude: +1 Stufe nach der anderen, frühestens nach der Bauzeit,
    //     schneller nur mit Gems (1 je Minute); Kosten (Münzen, Holz, Stein, Eisen) aus Konto + Topf des Ausgegebenen
    //   Forschung: wie Gebäude, eine nach der anderen, Labor/Vorgänger wie im Spiel
    //   Ausrüstung: Seltenheit/Stufe nur so hoch, wie er (statistisch) Kisten geöffnet haben kann; Sterne bis zur Schmiede-Stufe,
    //     jeder Stern kostet Gems
    //   Helden: Freischalten + Sterne kosten Splitter – nie mehr, als er bekommen haben kann
    //   Stufe = aus seinen EP (Weltrechner), Fähigkeiten = 1 Punkt je Stufe · Friedensschild nur gekauft (Gems) oder geschenkt
    // Abgelehntes zählt nicht (die Welt nimmt das zuletzt Angenommene) und wartet: steht es nach 2 Min. immer noch im Profil,
    // gibt es eine Auffälligkeit (warnen → Admin-Seite). So bekommen echte Spieler keine Fehlalarme, wenn Gems/Münzen erst
    // einen Puls später im Konto stehen.
    const HB_V = 1, HB_WARTEN_MS = 120000, TAG = 864e5;
    // Burg neu (4.10., seit 7.10. Tabelle burgZeitTab): eine Woche lang gelten für die Burg auch noch die alten (kürzeren, billigeren) Werte –
    // wer beim Hochladen gerade nach den alten Regeln baute, bekommt sonst einen falschen Alarm. Nach „Burg fair“ (09f saison.burgFair:
    // alle Burgen höchstens Stufe 4, laufende Burg-Bauten abgebrochen) baut niemand mehr nach den alten Regeln – dann nicht mehr
    const BURG_ALT_BIS = Date.UTC(2026, 9, 14), burgAlt = now => now < BURG_ALT_BIS && !(saison && saison.burgFair > 0);
    const burgZeitAlt = L => Math.min(7 * 86400, L <= 14 ? 60 * Math.pow(1.55, L - 1) : 60 * Math.pow(1.55, 13) * Math.pow(1.25, L - 14));
    function burgKostenAlt(L) { const b = 1000 * Math.pow(1.72, L - 1), n = AUF ? AUF.stadtKosten('keep', L) : {};
        const a = { c: niceRound(2000 * Math.pow(1.85, L - 1)), h: niceRound(b), s: L >= 2 ? niceRound(b * .8) : 0, e: L >= 5 ? niceRound(b * .4) : 0 };
        for (const x of ['c', 'h', 's', 'e']) a[x] = Math.min(a[x], n[x] === undefined ? a[x] : n[x]); return a; }
    const HB_SLOTS = Object.keys(EQUIPMENT_DEFS);
    const HB_TAG = {                                  // Spielraum pro Tag – je Quelle die Grenze aus dem Spiel
        g: 25 + questGemsTag() + 3 * 10,              // Gems: Tagesbelohnung (höchstens 25), 6 Aufgaben + Bonus (60), Gratis-Kiste (3× höchstens 10, 06g) – Event-Preise kommen als Nachricht (gIn)
        k: 3 + 1 + 1 / 7,                             // Kisten: Tagesbelohnung (bis 3), Aufgaben-Bonus, epische Tageskiste
        kg: 27 / 7,                                   // davon „mind. Episch“ (Tag 7) als sicherer Kisten-Wert (Episch = 27)
        sh: HERO_SHARDS_DAY,                          // Splitter: Aufgaben-Bonus
        em: 65, s1: 4.5 + 3, s2: 1.5, bm: 1000 + 3 * 5            // Gegenstände (05e): Event-Münzen nur aus dem Saison-Pass (Premium Stufe 6/18/42/54/66/78 je 150 = 900 je Pass; × HB_KAPPE_TAGE 14 = ein ganzer Pass – Event-Preise kommen als Nachricht, ggIn), Schlüssel (Lager 3 + 1 am Tag, Tages-Kisten), Beschleuniger-Minuten (Tages-Kisten 740); Gratis-Kiste (06g): je 8 Std. 1 Schlüssel oder 5 Min
    };
    const HB_ONLINE_STUNDE_G = 40;                    // Karten-Funde: 1–3 Gems, alle 20–45 s einer, 15 % davon Gems – nur solange er online ist
    const HB_KAPPE_TAGE = 14;                         // so viele Tage Spielraum sammeln sich höchstens an
    const HB_SH_GEMS = Math.min(...HERO_CHESTS.map(c => c.gems / (c.sh * c.n)));   // Gems je Splitter über die beste Heldenkiste
    const hbDa = who => { const b = loadBotState()[who]; return b && b.hb && b.hb.v === HB_V ? b.hb : null; };
    const hbStufe = who => { const m = wm(who); if (m.init) return Math.max(1, m.lvl); const d = wd(who); return d && d.lm >= 1 ? d.lm : 1; };
    const hbBauten = () => ['keep', ...CITY_BUILDINGS.map(d => d.id)];          // die Burg zuerst (sie schaltet die anderen frei)
    const hbMax = id => id === 'keep' ? (AUF ? AUF.BURG_MAX : 25) : cityMaxLevel(id);
    let hbAch = null, hbPassTopf = null, hbE0 = null, hbTtT = 0;
    const HB_ACH = () => hbAch !== null ? hbAch : (hbAch = ACHIEVEMENTS.reduce((a, x) => a + (x.gems || 0), 0));
    function hbPass() {                               // was der Saison-Pass (frei + Premium) höchstens gibt
        if (hbPassTopf) return hbPassTopf; const t = { g: 0, k: 0, kg: 0, sh: 0, schild: 0 };
        for (let L = 1; L <= PASS_LVLS; L++) for (const prem of [false, true]) for (const r of passRewardAt(L, prem)) { const n = r.n || 1;   // (Truppen prüft truppenPruefen)
            if (r.k === 'gems') t.g += n; else if (r.k === 'crate') t.k += n; else if (r.k === 'royal') { t.k += n; t.kg += 27 * n; }
            else if (r.k === 'shards') t.sh += n; else if (r.k === 'shield') t.schild += n; }
        return hbPassTopf = t;
    }
    // Helden: „Splitter-Wert“ = unverbrauchte Splitter + was Freischalten und Sterne gekostet haben
    const hbHeldZeile = s => [s && s.own ? 1 : 0, Math.min(HERO_MAXQ, Math.floor(nn(s && s.q))), Math.floor(nn(s && s.sh)), ...[0, 1, 2, 3].map(i => Math.min(5, Math.floor(nn(s && s.sk && s.sk[i]))))];
    const hbHeldObj = z => ({ own: !!z[0], q: z[1], sh: z[2], sk: z.slice(3, 7) });
    function hbHeldWert(id, z) { const h = heroById(id); if (!h || !z) return 0; let v = z[2]; if (z[0]) { v += HERO_UNLOCK[h.r]; for (let i = 0; i < z[1]; i++) v += heroStepCost(h, i); } return v; }
    const hbHeldenWert = hs => HEROES.reduce((a, h) => a + hbHeldWert(h.id, hs[h.id]), 0);
    function hbHeldenStart() { const s = heroFix(heroConvert(null, 0)), o = {}; for (const h of HEROES) o[h.id] = hbHeldZeile(s[h.id]); return o; }
    const hbE0f = () => hbE0 !== null ? hbE0 : (hbE0 = hbHeldenWert(hbHeldenStart()));
    // Ausrüstung: Kisten-Wert je Platz (Seltenheit r zählt 3^r – 3 gleiche ergeben eine höhere). Aus N Kisten kommen je Platz im
    // Schnitt 0,855 (¼ Chance auf diesen Platz × Ø 3,42), Streuung 3,08 je Kiste. Erlaubt: Schnitt + 3-fache Streuung + ein
    // glückliches Lila. Gold braucht so etwa 20 Kisten (im Schnitt 95), Rot etwa 150. Sichere „mind. Episch“-Kisten
    // (Event-Preise, Pass/Thron-Shop) zählen extra (hb.kG, hb.fr.kg).
    const kWert = r => Math.pow(3, r);
    const hbKistenGrenze = N => N >= 1 ? 0.855 * N + 3 * 3.08 * Math.sqrt(N) + 27 : 0;
    const hbKistenGesamt = N => N >= 1 ? 3.42 * N + 3 * 5.4 * Math.sqrt(N) + 27 : 0;   // alle 4 Plätze zusammen (Ø 3,42 je Kiste, Streuung 5,4) – das glückliche Lila nur einmal
    const hbPunkteGrenze = N => 35.6 * N + 300;      // Stufen-Punkte (aus verkauften Teilen): Ø 17,8 je Kiste (Zerlegen 5 + Wert, 7.10.), doppelt + Start
    const hbLvlPunkte = l => 2.5 * l * (l - 1);       // Stufe 1 → l kostet 5 + 10 + … Punkte
    const hbItemWert = z => (z[0] * ITEM_MAX_LEVEL + z[1]) * (1 + z[2] * STAR_PCT / 100);
    // Alle Helden voll (5 Sterne): neue Splitter kommen als Gems (06a-aufgaben.js, 06b-pass-anleitung.js: 20 je Splitter – Abholfach, Aufgaben, Wochenkette,
    // Pass). → so viele Gems, wie seine unverbrauchten Splitter (sicher hb.shB, Spielraum hb.fr.sh) hergeben; die sind dann weg.
    // (Gilt auch, wenn erst sein Profil die Helden voll zeigt: mehr als 20 Gems je echtem Splitter gibt es so nie – Splitter kosten mehr.)
    const HB_VOLL_G = 20;
    function hbSplitterGems(hb, p, mg) {
        if (!(mg > 0)) return 0;
        const voll = z => !!(z && z[0] && z[1] >= HERO_MAXQ), alle = f => HEROES.every(h => voll(f(h.id)));
        if (!alle(id => hb.hs[id]) && !(p && p.hs && typeof p.hs === 'object' && alle(id => p.hs[id] ? hbHeldZeile(p.hs[id]) : null))) return 0;
        const frei = Math.max(0, nn(hb.shB) - (hbHeldenWert(hb.hs) - hbE0f())), fr = Math.max(0, nn(hb.fr.sh));
        const x = Math.min(mg, HB_VOLL_G * (frei + fr)); if (!(x > 0)) return 0;
        let sh = x / HB_VOLL_G; const a = Math.min(sh, fr); hb.fr.sh = nn(hb.fr.sh) - a; sh -= a; hb.shB = nn(hb.shB) - sh;
        return x;
    }
    function hbKisteDazu(hb, minR) { hb.kN = nn(hb.kN) + 1; if (minR >= 3) hb.kG = nn(hb.kG) + kWert(minR); }
    function hbNeu(who, now, p, frisch) {
        const hb = { v: HB_V, t0: frisch ? now : 0, st: {}, fo: {}, foT: frisch ? now : 0, tb: 1, gear: {}, kN: 0, kG: 0, hs: hbHeldenStart(), shB: 0,
            gA: 0, cA: 0, rA: { h: 0, s: 0, e: 0 }, gIn: 0, sternG: 0, fr: { g: 10, k: 1, kg: 0, sh: 0, schild: 0, bm: 2, s1: 2 }, frT: frisch ? now : 0, thK: frisch ? 0 : undefined, ach: 0, lvG: 1, pass: 0, passF: 0,
            schild: 0, w: {}, sp: [] };                // (fr am Anfang: das Tutorial gibt einmal 10 Gems + 1 Kiste, 2 Beschleuniger-Minuten, 2 Schlüssel – 10c2)
        for (const id of hbBauten()) hb.st[id] = [id === 'keep' ? 1 : 0, hb.t0];
        for (const s of HB_SLOTS) hb.gear[s] = [];
        if (!frisch && p) {                            // ein Spielstand von vor 3B: einmal so übernehmen, wie sein Handy es sagt
            const pl = (p.city && p.city.levels) || {};
            for (const id of hbBauten()) hb.st[id][0] = Math.max(id === 'keep' ? 1 : 0, Math.min(hbMax(id), Math.floor(nn(pl[id]))));
            if (AUF) for (const d of AUF.FORSCHUNG) { const v = Math.min(d.max, Math.floor(nn((p.fo || {})[d.id]))); if (v > 0) hb.fo[d.id] = v; }
            for (const s of HB_SLOTS) { const g = p.gear && p.gear[s]; if (g) hb.gear[s] = [[Math.min(5, g.r | 0), Math.max(1, Math.min(ITEM_MAX_LEVEL, g.lvl | 0)), Math.min(STAR_MAX, g.st | 0)]]; }
            if (p.hs && typeof p.hs === 'object') { for (const h of HEROES) if (p.hs[h.id]) hb.hs[h.id] = hbHeldZeile(p.hs[h.id]); hb.shB = Math.max(0, hbHeldenWert(hb.hs) - hbE0f()); }
            hb.schild = nn(p.shieldUntil);
        }
        return hb;
    }
    // Spielraum wächst mit der Zeit (je Quelle die Tages-Grenze), dazu Erfolge, Stufen-Gems und der Saison-Pass
    function hbKontenMerken(hb, m, now) { m.hbMerkT = now; hb.gU = Math.round(m.g.u); if (m.rk) hb.rU = { h: Math.round(m.rk.h.u), s: Math.round(m.rk.s.u), e: Math.round(m.rk.e.u) }; saveBotState(); }   // (für einen Neustart)
    function hbFreiDazu(who, hb, now) {
        const dt =Math.min(HB_KAPPE_TAGE * TAG, now - nn(hb.frT)); if (dt < 300000) return; hb.frT = now;   // (in 5-Minuten-Schritten: das Hauptbuch ändert sich nicht bei jedem Profil)
        const f = hb.fr, on = !!(WELT.menschen[who] && WELT.menschen[who].online), t = dt / TAG;
        const dazu = (k, v, kappe) => { const vorher = nn(f[k]); f[k] = Math.max(vorher, Math.min(vorher + v, kappe)); };
        const heute = todayKey(); if (!hb.gOn || hb.gOn.t !== heute) hb.gOn = { t: heute, n: 0 };   // Karten-Funde höchstens ~7 Std. am Tag (wie die Truppen-Funde: 300 am Tag – gegen ein Skript rund um die Uhr)
        const onG = on ? Math.max(0, Math.min(HB_ONLINE_STUNDE_G * Math.min(dt, 600000) / 36e5, 7 * HB_ONLINE_STUNDE_G - hb.gOn.n)) : 0; hb.gOn.n += onG;
        dazu('g', HB_TAG.g * t + onG, HB_KAPPE_TAGE * (HB_TAG.g + 8 * HB_ONLINE_STUNDE_G));   // Karten-Funde nur für die Zeit, die er wirklich da war (online kommt alle 5 Min. ein Profil – nie die Tage dazwischen)
        for (const k of ['em', 's1', 's2', 'bm']) dazu(k, HB_TAG[k] * t, HB_KAPPE_TAGE * HB_TAG[k]);
        dazu('k', HB_TAG.k * t, HB_KAPPE_TAGE * HB_TAG.k); dazu('kg', HB_TAG.kg * t, HB_KAPPE_TAGE * HB_TAG.kg); dazu('sh', HB_TAG.sh * t, HB_KAPPE_TAGE * HB_TAG.sh);
        const L = hbStufe(who), alter = hb.t0 ? (now - hb.t0) / TAG : 999;
        const ach = HB_ACH() * Math.min(1, alter / 30 + (L - 1) / 100);                   // Erfolge: nach und nach (30 Tage bzw. Stufe 100)
        if (ach > nn(hb.ach)) { f.g = nn(f.g) + ach - nn(hb.ach); hb.ach = ach; }
        for (let l = Math.max(1, hb.lvG | 0) + 1; l <= L && l < 5000; l++) f.g = nn(f.g) + levelRewardGems(l);   // Stufen-Gems (EP sind sicher)
        if (L > (hb.lvG | 0)) hb.lvG = L;
        const n = passNo(now); if (hb.pass !== n) { hb.pass = n; hb.passF = 0; }             // Saison-Pass: nach und nach in einer halben Saison (ab Saison-Beginn bzw. ab seinem Start)
        const frac = Math.min(1, 2 * Math.max(0, now - Math.max(PASS_EPOCH + (n - 1) * PASS_LEN, nn(hb.t0), nn(hb.passAb))) / PASS_LEN);   // (passAb: Saison-Reset – der Pass fängt neu an)
        if (frac > nn(hb.passF)) { const T = hbPass(), d = frac - nn(hb.passF); hb.passF = frac; for (const k of ['g', 'k', 'kg', 'sh', 'schild']) f[k] = nn(f[k]) + T[k] * d; }
    }
    // Kosten {c, g, h, s, e}: aus Topf (ausgegeben), Konto und Spielraum – alles oder nichts
    function hbVorrat(who, hb, m, k) {
        if (k === 'c') { vorAltern(who, m, Date.now()); const d = wd(who); return m.c.vor + m.c.u + nn(hb.cA) + spielraumFrei(who, m) + (d ? nn(d.gC) : 0); }
        if (k === 'g') return nn(hb.gA) + nn(hb.gIn) + m.g.u + nn(hb.fr.g);    // (gIn: sicher geschickt – evtl. schon abgeholt und gleich ausgegeben)
        return nn(hb.rA[k]) + (m.rk ? m.rk[k].u : 0);
    }
    function hbZahlen(who, hb, m, kosten) {
        const ks = Object.keys(kosten).filter(k => kosten[k] > 0);
        if (ks.some(k => hbVorrat(who, hb, m, k) < kosten[k] - 1e-6)) return false;
        for (const k of ks) {
            let r = kosten[k], x;
            if (k === 'c') { vorAltern(who, m, Date.now());   // wie bei Gems: zuerst, was er dafür schon ausgegeben hat (Vorschuss, dann Topf) – nie zweimal vom Konto
                x = Math.min(r, m.c.vor); m.c.vor -= x; r -= x; x = Math.min(r, nn(hb.cA)); hb.cA = nn(hb.cA) - x; r -= x; if (r > 0) wacheBezahlen(who, m, r); continue; }
            if (k === 'g') { for (const q of ['gA', 'gIn']) { x = Math.min(r, nn(hb[q])); hb[q] = nn(hb[q]) - x; r -= x; } x = Math.min(r, m.g.u); m.g.u -= x; r -= x; hb.fr.g = Math.max(0, nn(hb.fr.g) - r); continue; }
            x = Math.min(r, nn(hb.rA[k])); hb.rA[k] = nn(hb.rA[k]) - x; r -= x; if (m.rk) m.rk[k].u = Math.max(0, m.rk[k].u - r);
        }
        return true;
    }
    // fehlende Bau-/Forschungszeit (ms): zuerst aus benutzten Beschleunigern (hb.bMin, Minuten), der Rest kostet Gems → [Gems, Beschleuniger-Minuten]
    function hbTempo(hb, fehlt) {
        let min = fehlt > 0 ? Math.ceil(fehlt / 60000) : 0; const bx = Math.min(min, Math.floor(nn(hb.bMin))); min -= bx;
        return [min * CITY_GEMS_PER_MIN, bx];
    }
    // Gegenstände (05e, Profil gg: Event-Münzen em, Schlüssel s1/s2, Beschleuniger-Minuten bm). Weniger = benutzt: Schlüssel öffnen Kisten
    // (Ausrüstung oder Helden – beides gutgeschrieben), Beschleuniger kürzen Bauten/Forschung (hb.bMin), Event-Münzen zählen halb als
    // ausgegebene Gems (Event-Shop ≈ 2× Edelstein-Preis: so bezahlt das Hauptbuch Schild, Teleporter und Schlüssel daraus).
    // Mehr = geschickt (hb.ggIn aus Nachrichten) → Spielraum (hb.fr) → mit Gems gekauft; der Rest ist auffällig und zählt nicht.
    const HB_G_JE_BM = Math.min(...BESCH_DAUERN.map(d => BESCH_PREIS[d][0] / BESCH_MIN[d]));   // Gems je Beschleuniger-Minute (bester Shop-Preis)
    const HB_GG = { em: 0, s1: SCHLUESSEL_PREIS[1][0], s2: SCHLUESSEL_PREIS[2][0], bm: HB_G_JE_BM }, HB_GG_NAME = { em: 'Event-Münzen', s1: 'Schlüssel', s2: 'Epische Schlüssel', bm: 'Beschleuniger-Minuten' };
    function hbGegenst(who, hb, p, m, now) {
        const q = p && p.gg; if (!q || typeof q !== 'object') return;
        const gg = hb.gg; if (!gg) { hb.gg = { em: nn(q.em), s1: nn(q.s1), s2: nn(q.s2), bm: nn(q.bm) }; return; }   // erstes Mal: gilt, was er hat
        const ein = hb.ggIn || (hb.ggIn = {}), f = hb.fr, heldSh = c => (HERO_CHESTS.find(x => x.id === c) || { sh: 0 }).sh;
        for (const k in HB_GG) {
            const d = nn(q[k]) - nn(gg[k]); if (!(d < 0)) continue; const n = -d; gg[k] = nn(q[k]);
            if (k === 's1') { f.k = nn(f.k) + n; f.sh = nn(f.sh) + n * heldSh('hc1'); }
            else if (k === 's2') { f.k = nn(f.k) + n; f.kg = nn(f.kg) + n * kWert(3); f.sh = nn(f.sh) + n * heldSh('hcE'); }
            else if (k === 'em') hb.gA = nn(hb.gA) + hbEvShop(who, hb, p, n, now) / 2;
            else hb.bMin = nn(hb.bMin) + n;
        }
        for (const k in HB_GG) {
            let d = nn(q[k]) - nn(gg[k]); if (!(d > 0)) { hbGut(hb, 'gg:' + k); continue; } const roh = d;
            for (const t of [ein, f]) { const x = Math.min(d, nn(t[k])); t[k] = nn(t[k]) - x; d -= x; }
            if (d > 0 && HB_GG[k] > 0 && hbZahlen(who, hb, m, { g: d * HB_GG[k] })) d = 0;
            if (d >= 1) { gg[k] = nn(q[k]) - d; hbWarte(who, hb, 'gg:' + k, now, HB_GG_NAME[k] + ': +' + fz(roh) + ' im Handy, möglich wären höchstens +' + fz(roh - d) + '.', d); }
            else { gg[k] = nn(q[k]); hbGut(hb, 'gg:' + k); }
        }
    }
    // Event-Shop (Alexander 9.10.): je Woche (ab Montag 0 Uhr Berlin, Server-Zeit) höchstens das Limit je Ware (Profil evs) und
    // zusammen höchstens EV_EM_WOCHE Event-Münzen. Mehr wird nicht bezahlt (→ die Waren zählen nicht) und gemeldet.
    // → wie viele der n ausgegebenen Event-Münzen zählen
    function hbEvShop(who, hb, p, n, now) {
        const w = evWocheAb(now); let e = hb.evw; if (!e || e.w !== w) e = hb.evw = { w, em: 0 };
        const frei = Math.max(0, EV_EM_WOCHE() - e.em), gilt = Math.min(n, frei); e.em += n;
        const q = p && p.evs, zuviel = [];
        if (q && typeof q === 'object' && q.n && typeof q.n === 'object' && evWocheAb(nn(q.w) || now) === w)
            for (const o of EV_WAREN) if (nn(q.n[o.id]) > o.lim) zuviel.push(o.name + (o.zeit ? ' ' + o.zeit : '') + ' ' + fz(nn(q.n[o.id])) + '/' + o.lim);
        if (e.em > EV_EM_WOCHE()) zuviel.push(fz(e.em) + ' Event-Münzen ausgegeben, höchstens ' + fz(EV_EM_WOCHE()));
        if (zuviel.length) hbWarte(who, hb, 'evshop', now, 'Event-Shop über dem Wochen-Limit: ' + zuviel.join(', ') + '.', n - gilt); else hbGut(hb, 'evshop');
        return gilt;
    }
    // abgelehnt: erst nach 2 Min. (immer noch im Profil) eine Auffälligkeit – einmal
    function hbWarte(who, hb, key, now, text, wert) {
        const w = hb.w || (hb.w = {}); wm(who).hbOffen = 1;
        if (!w[key]) w[key] = now; else if (w[key] > 0 && now - w[key] > HB_WARTEN_MS) { warnen(who, 'hauptbuch', text, wert); w[key] = -1; }
    }
    const hbGut = (hb, key) => { if (hb.w && hb.w[key]) delete hb.w[key]; };
    // Burg/Gebäude: eine Stufe weiter → 'ok' | 'nein' (Regel) | 'geld' (Bauzeit-Gems, Münzen oder Rohstoffe reichen nicht)
    function hbStadtSchritt(who, hb, m, id, now) {
        const [L, T] = hb.st[id], B = hb.st.keep[0];
        if (L + 1 > hbMax(id)) return 'nein';
        if (id !== 'keep' && AUF) { if (!L && AUF.BAU_AB_BURG[id] > B) return 'nein'; if (L + 1 > (B >= AUF.BURG_MAX ? hbMax(id) : Math.min(hbMax(id), B))) return 'nein'; }
        const alt = id === 'keep' && burgAlt(now), zeit = alt ? Math.min(cityTimeRoh(id, L), burgZeitAlt(L)) : cityTimeRoh(id, L);   // (Übergang: eine Burg, die noch nach den alten Regeln gebaut wurde)
        // Bauzeit zählt erst ab Baubeginn: nie vor dem letzten Profil, das dieses Gebäude ohne Bau zeigte (hb.ruhe), und nie vor dem Ende
        // des letzten Baus dieses Bauarbeiters (hb.bu – 1 bzw. 2 Bauarbeiter). Vorher zählte Leerlauf mit (10 Tage still = 10 Tage Bauzeit gratis).
        const pl = (hb.b2 ? 2 : 1), bu = hb.bu || (hb.bu = [0, 0]), i = pl > 1 && bu[1] < bu[0] ? 1 : 0, start = Math.max(T, nn((hb.ruhe || {})[id]), nn(bu[i]));
        const hk = 'bau:' + id + ':' + (L + 1), hilfe = Math.min(nn((hb.hilfe || {})[hk]), zeit * 1000), need = zeit * 1000 - hilfe, fehlt = need - (now - start) - 60000;   // (Bündnis-Hilfe macht den Bau kürzer)
        const [g, bx] = hbTempo(hb, fehlt);
        const k = Object.assign({}, alt ? burgKostenAlt(L) : AUF ? AUF.stadtKosten(id, L) : { c: cityCost(id, L) }); if (g) k.g = g;
        if (!hbZahlen(who, hb, m, k)) return 'geld';
        hb.bMin = nn(hb.bMin) - bx;
        hb.st[id] = [L + 1, g || bx ? now : Math.min(now, start + need)];   // (fertig spätestens jetzt – die nächste Stufe zählt ab da)
        bu[i] = hb.st[id][1];                                          // (dieser Bauarbeiter ist ab da wieder frei)
        if (hb.hilfe) delete hb.hilfe[hk];
        evPunkte('bau', who, WO_PKT.bauStufe * (L + 1) + (g ? WO_PKT.bauMin * g / CITY_GEMS_PER_MIN + WO_PKT.bauGem * g : 0));   // Wochen-Event „Bauherr“: Stufe, beschleunigte Minuten, Edelsteine
        return 'ok';
    }
    function hbFoSchritt(who, hb, m, d, now) {
        const L = (hb.fo[d.id] | 0) + 1;
        if (L > d.max || (hb.st.academy || [0])[0] < AUF.foAkaFuer(d, L)) return 'nein';
        if (d.vor && !((hb.fo[d.vor] | 0) >= 1)) return 'nein';
        const hk = 'fo:' + d.id + ':' + L, need = AUF.foZeitRoh(d, L) * 1000 - Math.min(nn((hb.hilfe || {})[hk]), AUF.foZeitRoh(d, L) * 1000), T = Math.max(nn(hb.foT), nn(hb.foRuhe)), fehlt = need - (now - T) - 60000;   // (Bündnis-Hilfe macht die Forschung kürzer · nie vor dem letzten Profil mit freiem Labor)
        const [g, bx] = hbTempo(hb, fehlt);
        const k = Object.assign({}, AUF.foKosten(d, L)); if (g) k.g = g;
        if (!hbZahlen(who, hb, m, k)) return 'geld';
        hb.bMin = nn(hb.bMin) - bx;
        hb.fo[d.id] = L; hb.foT = g || bx ? now : Math.min(now, T + need);    // eine Forschung gleichzeitig: die nächste zählt ab da
        if (hb.hilfe) delete hb.hilfe[hk];
        if (g) evPunkte('bau', who, WO_PKT.bauMin * g / CITY_GEMS_PER_MIN + WO_PKT.bauGem * g);   // Wochen-Event „Bauherr“: beschleunigte Forschung
        return 'ok';
    }
    // Sterne (alle Teile, angelegt oder nicht – Profil stW = Gems in allen Sternen): ein Kauf wird aus den ausgegebenen Gems bezahlt
    // und als Rücklage gemerkt (hb.sternRes); beim Verkaufen geht die Rücklage in hb.sternG – das deckt die zurückgegebenen Gems.
    // Anlegen/Ablegen ändert stW nicht. Vorher sah das Hauptbuch nur Sterne angelegter Teile: Verkauf eines Teils aus der Truhe
    // galt als „Gems springen“ (falscher Alarm, und die Gems fehlten beim Weltrechner).
    function hbSterne(who, hb, m, T) {
        if (!Number.isFinite(hb.stW)) { hb.stW = T; hb.sternRes = Math.min(T, 20000); hb.sternG = 0; return; }   // erstes Mal: was es schon gibt, gilt (wie beim ersten Sehen des Hauptbuchs – gekappt)
        const d = T - hb.stW;
        if (d > 0) { const x = Math.min(d, nn(hb.gA)); hb.gA = nn(hb.gA) - x; let rest = d - x; if (rest > 0 && hbZahlen(who, hb, m, { g: rest })) rest = 0;
            hb.sternRes = nn(hb.sternRes) + d - rest; hb.stW += d - rest; if (d > rest) evPunkte('held', who, WO_PKT.schmiede); }   // (Helden-Tag: Ausrüstung verbessert)   // (nicht Bezahltes zählt nicht – wird es verkauft, gibt es nichts zurück)
        else if (d < 0) { const y = Math.min(-d, nn(hb.sternRes)); hb.sternRes = nn(hb.sternRes) - y; hb.sternG = nn(hb.sternG) + y; hb.stW = T; }
    }
    // ein neuer Gegenstand in Platz s (z = [Seltenheit, Stufe, Sterne]) → '' (angenommen) oder warum nicht
    function hbGearNeu(who, hb, m, s, z, forge) {
        if (z[2] > forge) return 'die Schmiede (Stufe ' + forge + ') erlaubt höchstens ' + forge + ' Sterne';
        const A = hb.gear[s], N = nn(hb.kN), wert = kWert(z[0]), kG = nn(hb.kG) + nn(hb.fr.kg);   // sichere „mind. Episch“-Kisten: geschickte (kG) und aus Pass/Thron-Shop (fr.kg – vorher nie benutzt)
        const gesamt = HB_SLOTS.reduce((a, x) => a + Math.max(x === s ? wert : 0, ...(hb.gear[x] || []).map(b => kWert(b[0])), 0), 0);   // bester Kisten-Wert je Platz, zusammen
        const punkte = HB_SLOTS.reduce((a, x) => { const l = (hb.gear[x] || []).reduce((y, b) => Math.max(y, b[1]), x === s ? z[1] : 1); return a + hbLvlPunkte(l); }, 0);
        let n = 0; const mehr = () => n < 10 ? 1 : Math.ceil(n * .1);
        while (n < 20000 && (wert > hbKistenGrenze(N + n) + kG || gesamt > hbKistenGesamt(N + n) + kG || punkte > hbPunkteGrenze(N + n))) n += mehr();
        if (n >= 20000) return 'unmöglich viele Kisten';
        const basis = A.filter(a => a[0] === z[0] && a[1] <= z[1]).reduce((x, a) => Math.max(x, a[2]), 0);   // (derselbe Gegenstand, nur höher)
        let sternG = 0; for (let i = basis; i < z[2]; i++) sternG += starGemCost(i);
        if (Number.isFinite(hb.stW)) { if (10 * z[2] * (z[2] + 1) > hb.stW + 1e-6) return 'die Sterne sind nicht bezahlt'; sternG = 0; }   // (neues Handy: Sterne zahlt hbSterne – nicht doppelt)
        const freiK = Math.min(n, Math.floor(nn(hb.fr.k))), gems = (n - freiK) * CRATE_GEM_COST + sternG;
        if (gems > 0 && !hbZahlen(who, hb, m, { g: gems })) return n > freiK ? 'dafür hätte er ' + (N + n > 1 ? 'etwa ' + Math.round(N + n) : 'eine') + ' Kisten öffnen müssen, ' + fz(gems) + ' Gems fehlen' : 'die Sterne kosten ' + sternG + ' Gems';
        hb.fr.k = nn(hb.fr.k) - freiK; hb.kN = N + n; if (n > 0) evPunkte('held', who, WO_PKT.kiste * n); hb.sternG = nn(hb.sternG) + sternG;   // (Helden-Tag: geöffnete Kisten)
        const ueber = Math.max(wert - hbKistenGrenze(hb.kN), gesamt - hbKistenGesamt(hb.kN)); if (ueber > 0) { const x = Math.min(ueber, Math.max(0, nn(hb.fr.kg))); hb.fr.kg = nn(hb.fr.kg) - x; hb.kG = Math.max(0, nn(hb.kG) - (ueber - x)); }   // die sichere Kiste ist verbraucht (zuerst aus fr.kg)
        A.push(z);
        for (let i = A.length - 1; i >= 0; i--) if (A.some((b, j) => j !== i && b[0] === A[i][0] && b[1] >= A[i][1] && b[2] >= A[i][2] && (b[1] > A[i][1] || b[2] > A[i][2] || j < i))) A.splice(i, 1);
        A.sort((a, b) => hbItemWert(b) - hbItemWert(a)); if (A.length > 4) A.length = 4;
        return '';
    }
    // alle Neuerungen eines Profils gegen das Hauptbuch prüfen (und das Angenommene bezahlen)
    function hbPruefen(who, hb, p, m, now, schildAlt) {
        const mm = wm(who); mm.hbOffen = 0; mm.hbPrT = now;
        hbFreiDazu(who, hb, now);
        hbGegenst(who, hb, p, m, now);                 // (vor den Bauten: benutzte Beschleuniger kürzen deren Bauzeit)
        const pl = (p.city && p.city.levels) || {}, will = id => Math.min(hbMax(id), Math.floor(nn(pl[id])));
        for (let runde = 0, weiter = true; weiter && runde < 80; runde++) { weiter = false;
            for (const id of hbBauten()) if (will(id) > hb.st[id][0] && hbStadtSchritt(who, hb, m, id, now) === 'ok') weiter = true; }
        if (p.city && Array.isArray(p.city.bau)) {                    // (neue Handys schicken mit, was gerade gebaut wird)
            if (p.city.b2) hb.b2 = 1;
            const lauf = p.city.bau.slice(0, hb.b2 ? 2 : 1), ruhe = hb.ruhe || (hb.ruhe = {});
            for (const id of hbBauten()) if (!lauf.includes(id) && will(id) <= hb.st[id][0]) ruhe[id] = now;   // frei und nichts offen: ein neuer Bau beginnt frühestens jetzt
            if (!p.city.foLauf && AUF && AUF.FORSCHUNG.every(d => Math.min(d.max, Math.floor(nn((p.fo || {})[d.id]))) <= (hb.fo[d.id] | 0))) hb.foRuhe = now;
        }
        for (const id of hbBauten()) { if (will(id) <= hb.st[id][0]) { hbGut(hb, 'stadt:' + id); continue; }
            hbWarte(who, hb, 'stadt:' + id, now, (cityDef(id) || {}).name + ': das Handy sagt Stufe ' + will(id) + ', möglich ist Stufe ' + hb.st[id][0] + ' (Bauzeit, Kosten oder Burg-Stufe passen nicht).', will(id) - hb.st[id][0]); }
        if (AUF) {                                     // Forschung: die billigste zuerst, so lange etwas weitergeht
            const pf = p.fo || {}, offen = () => AUF.FORSCHUNG.filter(d => Math.min(d.max, Math.floor(nn(pf[d.id]))) > (hb.fo[d.id] | 0));
            for (let runde = 0, weiter = true; weiter && runde < 80; runde++) { weiter = false;
                for (const d of offen().sort((a, b) => AUF.foKosten(a, (hb.fo[a.id] | 0) + 1).c - AUF.foKosten(b, (hb.fo[b.id] | 0) + 1).c)) if (hbFoSchritt(who, hb, m, d, now) === 'ok') { weiter = true; break; } }
            for (const d of AUF.FORSCHUNG) { const w = Math.min(d.max, Math.floor(nn(pf[d.id]))); if (w <= (hb.fo[d.id] | 0)) { hbGut(hb, 'fo:' + d.id); continue; }
                hbWarte(who, hb, 'fo:' + d.id, now, 'Forschung ' + d.name + ': das Handy sagt Stufe ' + w + ', möglich ist ' + (hb.fo[d.id] | 0) + ' (Zeit, Kosten oder Labor passen nicht).', w - (hb.fo[d.id] | 0)); }
        }
        const forge = Math.min(STAR_MAX, (hb.st.forge || [0])[0]);
        for (const s of HB_SLOTS) {                    // Ausrüstung
            const g = p.gear && p.gear[s]; if (!g) { hbGut(hb, 'gear:' + s); continue; }
            const z = [Math.max(0, Math.min(5, g.r | 0)), Math.max(1, Math.min(ITEM_MAX_LEVEL, g.lvl | 0 || 1)), Math.max(0, Math.min(STAR_MAX, g.st | 0))], A = hb.gear[s] || (hb.gear[s] = []);
            if (A.some(a => a[0] === z[0] && a[1] >= z[1] && a[2] >= z[2])) { hbGut(hb, 'gear:' + s); continue; }
            const grund = hbGearNeu(who, hb, m, s, z, forge);
            if (grund) hbWarte(who, hb, 'gear:' + s, now, EQUIPMENT_DEFS[s].name + ' ' + RARITY_DEFS[z[0]].label + ' Stufe ' + z[1] + (z[2] ? ' mit ' + z[2] + ' Sternen' : '') + ': ' + grund + '.', z[0] + 1);
            else hbGut(hb, 'gear:' + s);
        }
        hbHeldenPruefen(who, hb, m, p, now);
        hbSchildPruefen(who, hb, m, p, now, schildAlt);
    }
    // Beleg für eine Heldenkiste: neue Splitter + die dazu ausgegebenen Gems. Ohne Gems (noch nicht im Profil) wartet der Beleg
    // (warte), hbBelegGems trägt sie bis 60 s nach (auch in Teilen) – Gems und Splitter zählen je nur einmal.
    function hbBelegNeu(who, hb, m, sh, g, now) {
        const L = (hb.shKauf || []).filter(x => now - x.t < KISTE_FRIST), gd = nn(m.gAus);
        L.push(gd > 1e-6 ? { sh, gd, g, t: now } : { sh, gd: 0, g, t: now, warte: 1 }); m.gAus = 0; hb.shKauf = L.slice(-20); hbKisteFrei(who, hb, now);
    }
    function hbBelegGems(who, hb, m, now) {
        if (!(nn(m.gAus) > 1e-6)) return;
        const x = (hb.shKauf || []).filter(y => y.warte && now - y.t < WACHE_WARTEN_MS).pop(); if (!x) return;
        x.gd = nn(x.gd) + nn(m.gAus); m.gAus = 0; hbKisteFrei(who, hb, now);
    }
    // Helden: Splitter-Wert aller Helden höchstens so viel, wie er an Splittern bekommen haben kann (sicher + Spielraum + Heldenkisten)
    function hbHeldenPruefen(who, hb, m, p, now) {
        if (!p.hs || typeof p.hs !== 'object') return;
        const E0 = hbE0f(), neu = {};
        for (const h of HEROES) { const z = p.hs[h.id] ? hbHeldZeile(p.hs[h.id]) : hb.hs[h.id]; if (!z) continue;
            const pts = z[0] ? Math.floor(z[1] / 2) : 0, sum = z[3] + z[4] + z[5] + z[6];   // Fähigkeiten: 1 Punkt je halbem Stern
            if (sum > pts) for (let i = 3; i < 7; i++) z[i] = Math.floor(z[i] * pts / sum);
            const a = hb.hs[h.id];                          // eine Fähigkeit weniger als vorher = zurückgesetzt: kostet HERO_RESET_GEMS (vorher gratis)
            if (a && [3, 4, 5, 6].some(i => z[i] < (a[i] | 0)) && !hbZahlen(who, hb, m, { g: HERO_RESET_GEMS })) {
                for (let i = 3; i < 7; i++) z[i] = a[i] | 0; hbWarte(who, hb, 'heldReset:' + h.id, now, h.name + ': Fähigkeiten zurückgesetzt ohne die ' + HERO_RESET_GEMS + ' Gems – es gelten die alten.', HERO_RESET_GEMS); }
            neu[h.id] = z; }
        const gleich = (a, b) => !!a && !!b && a.every((v, i) => v === b[i]);
        const geaendert = HEROES.filter(h => neu[h.id] && !gleich(neu[h.id], hb.hs[h.id])); if (!geaendert.length) { hbGut(hb, 'helden'); return; }
        const wert = hs => hbHeldenWert(hs) - E0;
        let bedarf = wert(neu) - nn(hb.shB); const shVor = nn(hb.shB); let gBez = 0;
        if (bedarf > 0) { const aus = Math.min(bedarf, nn(hb.fr.sh)); hb.fr.sh = nn(hb.fr.sh) - aus; hb.shB = nn(hb.shB) + aus; bedarf -= aus;
            if (bedarf > 0 && hbZahlen(who, hb, m, { g: Math.ceil(bedarf * HB_SH_GEMS) })) { hb.shB += bedarf; gBez = Math.ceil(bedarf * HB_SH_GEMS); } }
        if (hb.shB > shVor) hbBelegNeu(who, hb, m, hb.shB - shVor, gBez, now);
        if (wert(neu) <= nn(hb.shB) + 1e-6) { hbHeldPunkte(who, hb.hs, neu); hb.hs = Object.assign({}, hb.hs, neu); hbGut(hb, 'helden'); return; }
        let jetzt = Object.assign({}, hb.hs);          // sonst Held für Held, die billigsten Änderungen zuerst
        const zu = [];
        for (const h of geaendert.sort((a, b) => (hbHeldWert(a.id, neu[a.id]) - hbHeldWert(a.id, hb.hs[a.id])) - (hbHeldWert(b.id, neu[b.id]) - hbHeldWert(b.id, hb.hs[b.id])))) {
            const v = Object.assign({}, jetzt, { [h.id]: neu[h.id] }); if (wert(v) <= nn(hb.shB) + 1e-6) jetzt = v; else zu.push(h.name); }
        hbHeldPunkte(who, hb.hs, jetzt); hb.hs = jetzt;
        if (zu.length) hbWarte(who, hb, 'helden', now, 'Helden: ' + zu.join(', ') + ' – dafür reichen seine Splitter nicht (' + fz(wert(neu)) + ' verlangt, möglich ' + fz(nn(hb.shB)) + ').', wert(neu) - nn(hb.shB));
    }
    function hbHeldPunkte(who, alt, neu) {           // Wochen-Event „Helden-Tag“: jede neue Helden-Stufe (Stern) zählt
        let n = 0; for (const id in neu) n += Math.max(0, nn((neu[id] || [])[1]) - nn((alt[id] || [])[1]));
        if (n > 0) evPunkte('held', who, WO_PKT.held * n);
    }
    // Friedensschild: länger nur, wenn er ihn gekauft (Gems, 24 Std. = SHIELD_PRICES[24]) oder geschenkt bekommen haben kann (Pass, Startschild)
    function hbSchildPruefen(who, hb, m, p, now, schildAlt) {
        if (schildAlt && nn(p.shieldUntil) <= schildAlt) { hbGut(hb, 'schild'); return; }   // sein Handy meldet noch den Schild, den die Welt fallen ließ: gilt nicht (welt.js), kostet nichts
        const S = Math.min(nn(p.shieldUntil), now + 8 * TAG);
        if (S <= nn(hb.schild) + 60000) { if (S < nn(hb.schild)) hb.schild = S; hbGut(hb, 'schild'); return; }   // (gefallen oder kürzer: gilt)
        const stunden = (S - Math.max(now, nn(hb.schild))) / 36e5, frei = Math.min(stunden, nn(hb.fr.schild)), g = Math.ceil((stunden - frei) * SHIELD_PRICES[24] / 24 - 1e-9);
        if (g > 0 && !hbZahlen(who, hb, m, { g })) { hbWarte(who, hb, 'schild', now, 'Friedensschild bis ' + new Date(S).toLocaleString('de-DE') + ' – den kann er nicht gekauft haben (' + g + ' Gems fehlen).', stunden); return; }
        hb.fr.schild = nn(hb.fr.schild) - frei; hb.schild = S; hbGut(hb, 'schild');
    }
    // was die Welt von ihm benutzt: aus dem Hauptbuch (nie mehr als das Profil sagt)
    function hbSchreiben(who, hb, b, p, alt) {
        const L = hbStufe(who), now = Date.now();
        b.lvl = Math.max(1, Math.min(Math.floor(nn(p.lvl)) || 1, L));
        const sk = {}; let sum = 0;
        for (const k of Object.keys(SKILL_DEFS)) { sk[k] = Math.max(0, Math.min(SKILL_DEFS[k].max || 50, Math.floor(nn((p.skills || {})[k])))); sum += sk[k]; }
        const maxP = Math.max(0, L - 1) + 2;          // 1 Fähigkeits-Punkt je Stufe
        if (sum > maxP) { for (const k in sk) sk[k] = Math.floor(sk[k] * maxP / sum); hbWarte(who, hb, 'skills', now, 'Fähigkeiten: ' + sum + ' Punkte verteilt, mit Stufe ' + L + ' gehen höchstens ' + maxP + '.', sum - maxP); } else hbGut(hb, 'skills');
        if (hb.sk && Object.keys(sk).some(k => sk[k] < (hb.sk[k] | 0))) {   // ein Punkt weniger als vorher = zurückgesetzt: kostet SKILL_RESET_GEMS (vorher nicht geprüft – umverteilen vor jedem Kampf gratis)
            if (hbZahlen(who, hb, wacheSehen(who), { g: SKILL_RESET_GEMS })) hbGut(hb, 'skillReset');
            else { for (const k in sk) sk[k] = hb.sk[k] | 0; hbWarte(who, hb, 'skillReset', now, 'Fähigkeiten zurückgesetzt ohne die ' + SKILL_RESET_GEMS + ' Gems – es gelten die alten.', SKILL_RESET_GEMS); } }
        hb.sk = Object.assign({}, sk);
        b.skills = sk;
        const pl = (p.city && p.city.levels) || {}, lv = {};
        for (const id of hbBauten()) lv[id] = Math.max(0, Math.min(Math.floor(nn(pl[id])), hb.st[id][0])); if (!(lv.keep >= 1)) lv.keep = 1;
        const fo = {}; if (AUF) for (const d of AUF.FORSCHUNG) { const v = Math.min(Math.floor(nn((p.fo || {})[d.id])), hb.fo[d.id] | 0); if (v > 0) fo[d.id] = v; }
        b.city = Object.assign({}, b.city, { levels: lv, fo }); delete b.city.tier; delete b.city.tierBez;
        b.gear = {};
        for (const s of HB_SLOTS) { const g = p.gear && p.gear[s], A = hb.gear[s] || [];
            if (g && A.some(a => a[0] === (g.r | 0) && a[1] >= (g.lvl | 0) && a[2] >= (g.st | 0))) b.gear[s] = { r: g.r | 0, lvl: Math.max(1, g.lvl | 0), st: g.st | 0 };
            else b.gear[s] = g && A.length ? { r: A[0][0], lvl: A[0][1], st: A[0][2] } : null; }
        const hs = {};
        for (const h of HEROES) { const z = hb.hs[h.id]; if (!z) continue; const o = hbHeldObj(z), a = alt && alt.hs && alt.hs[h.id];
            o.rage = Math.max(0, Math.min(100, nn(a && a.rage))); hs[h.id] = o; }    // (die Wut rechnet nur der Weltrechner)
        b.hs = hs;
        if (nn(b.shieldUntil) > nn(hb.schild)) b.shieldUntil = nn(hb.schild);
        b.hbK = 1;
    }
    // Rohstoffe und Verwundete aus seinem Profil nie über sein Konto (+ was er an Abzügen noch nicht kennt) – immer, nicht nur nach
    // einem Sprung im neuen Profil (z. B. nach einem Neustart des Weltrechners kam das gespeicherte Profil sonst ungeprüft in die Welt)
    function hbKontoDeckel(m, b, p) {
        const { M } = flugSumme(m);
        if (m.rk && b.res && p.res && typeof p.res === 'object') for (const k of ROHK) { const max = Math.floor(m.rk[k].u + (M[k] || 0)) + 1; if (nn(b.res[k]) > max) b.res[k] = max; }
        if (m.geeicht) { const max = Math.floor(m.w.u + (M.w || 0)) + 1; if (nn(b.wounded) > max) b.wounded = max; }
    }
    // (welt.js profilZuBot, nur beim Weltrechner) ein Profil kommt an → Hauptbuch prüfen, Mitspieler-Datensatz klemmen
    function hbKlemmen(who, b, p, alt) {
        if (!AUF) { if (alt && alt.hbK) for (const k of ['lvl', 'skills', 'gear', 'city', 'hs', 'shieldUntil', 'frames', 'titles', 'hbK']) if (alt[k] !== undefined) b[k] = alt[k]; return; }   // (aufbau.js noch nicht geladen: die Welt-Werte bleiben)
        const now = Date.now();
        let hb = alt && alt.hb && alt.hb.v === HB_V ? alt.hb : b.hb && b.hb.v === HB_V ? b.hb : null;
        if (!hb) {
            // ganz neu (noch nie in der Welt) → alles bei Null, sonst einmal aus dem Profil (Spielstand von vor 3B). Kannte ihn die
            // gespeicherte Welt beim Neustart nicht (nur ein leerer Eintrag aus loadBotState ohne mensch, oder welt.js hbRoh: roh aus
            // dem Profil), zählt er als neu – sonst brächte ein gefälschtes Profil seine Werte in die Welt
            const frisch = !(alt && alt.city) || (!alt.zProfil && (!alt.mensch || !!alt.hbRoh));   // (nach dem Zurückspielen: angleichen wie bisher)
            hb = hbNeu(who, now, p, frisch); if (frisch) hb.lk = { f: [], t: [], th: 0 };   // (ganz neu: keine alten Rahmen)
            if (frisch) { b.wache = Object.assign({ lv: 0, gTr: 0, gC: 0 }, b.wache || {}, { u: 0, w: 0, lm: 1 }); hb.gU = 0; hb.rU = AUF ? Object.assign({}, AUF.ROH_START) : { h: 0, s: 0, e: 0 };
                if (alt) alt.wache = b.wache; delete wacheMem[who]; }   // (wacheSehen liest den Eintrag in der Welt – und darf sich vorher nicht schon am Profil geeicht haben)
        }
        b.hb = hb; if (alt && alt !== b) alt.hb = hb;
        delete b.hbRoh; if (alt) delete alt.hbRoh;
        if (b.zProfil && p && Object.keys(p).length) { hbAusProfil(who, hb, p, now); delete b.zProfil; if (alt) delete alt.zProfil; }   // (nach dem Zurückspielen, einmal)
        const m = wacheSehen(who);
        if (m.rkNeu) { m.rkNeu = false; if (p === m.prof && m.rDeckelP !== p && p.res) { const { P, M } = flugSumme(m); rohWacheProfil(who, m, p, P, M, now); } }   // (nach einem Neustart: das Profil einmal gegen das gemerkte Konto prüfen – vorher kam es ungeprüft in die Welt)
        if (m.init) hbKontoDeckel(m, b, p);           // (vor dem Prüfen: das bezahlt aus dem Konto)
        hbPruefen(who, hb, p, m, now, b.schildAlt);
        if (m.rDeckel && m.rDeckelP === p && b.res) for (const k in m.rDeckel) if (nn(b.res[k]) > m.rDeckel[k]) b.res[k] = m.rDeckel[k];   // Rohstoff-Sprung: die Welt bekommt nur das Mögliche – auch wenn dasselbe Profil nach 10 s nochmal angewendet wird (wartet etwas im Hauptbuch; vorher kam das erfundene Holz dann doch in die Welt und schaukelte sich hoch)
        hbSchreiben(who, hb, b, p, alt);
        hbRahmen(hb, b, p);
        if (m.init && m.gGeeicht && now - (m.hbMerkT || 0) > 60000) hbKontenMerken(hb, m, now);
        const d = b.wache; if (m.init && m.geeicht && d) d.u = Math.round(m.c.u);
        saveBotState();                                // (das Hauptbuch geht mit der Welt mit)
    }
    WELT.klemmen = hbKlemmen;
    // Rahmen (Alexander 6.10.): nicht mehr zu kaufen – was er bis jetzt hatte, merkt sich das Hauptbuch einmal (neu: nichts), danach
    // kommt aus dem Profil keiner mehr dazu. Saison-Rahmen und die aus der Mitte führt die Welt selbst (05a rahmenHat / rahmenVon).
    // (Saisonkrone: gab es bis 7.10. im Saison-Pass – wer sie hat, behält sie, darum erlaubt)
    // Gemerkt wird erst am ersten Profil mit look.frames (nach dem Neustart kommen zuerst alte Profile ohne die Listen – sonst blieben
    // gekaufte Rahmen für immer leer); bis dahin wie vorher der angelegte (welt.js profilZuBotRoh)
    function hbRahmen(hb, b, p) {
        if (!hb.lk && Array.isArray(((p || {}).look || {}).frames)) hb.lk = { f: (b.frames || []).slice(0, 60), t: (b.titles || []).slice(0, 60) };
        if (!hb.lk) return;
        b.frames = (b.frames || []).filter(x => x === 'saison' || hb.lk.f.includes(x)); b.titles = (b.titles || []).filter(x => hb.lk.t.includes(x));
    }
    // Nach dem Zurückspielen einer Sicherung (server.php: ow_welt_info.zurueck) ist die Welt – mit dem Hauptbuch – wieder alt, die
    // Spielstände der Spieler nicht (was sie seitdem verdient und gebaut haben, behalten sie). Damit beides zusammenpasst, gleicht der
    // Weltrechner EINMAL je Spieler an: Münzen, Verwundete, Gems, Rohstoffe und Stufe werden am nächsten Profil neu geeicht; Stadt,
    // Forschung, Truppen-Stufe, Ausrüstung, Helden und Schild aus dem Profil übernommen (gekappt wie beim ersten Sehen, nie weniger
    // als das Hauptbuch schon hatte). Sonst hielte der Schummel-Schutz ehrlich Verdientes für gefälscht und die Welt nähme alte Werte.
    function hbAusProfil(who, hb, p, now) {
        const n = hbNeu(who, now, p, false);
        for (const id of hbBauten()) if (n.st[id][0] > hb.st[id][0]) hb.st[id] = [n.st[id][0], now];
        for (const k in n.fo) if (n.fo[k] > (hb.fo[k] | 0)) hb.fo[k] = n.fo[k];
        if (n.tb > hb.tb) hb.tb = n.tb;
        for (const s of HB_SLOTS) for (const z of n.gear[s]) { const A = hb.gear[s] || (hb.gear[s] = []); if (!A.some(a => a[0] === z[0] && a[1] >= z[1] && a[2] >= z[2])) A.push(z); }
        for (const h of HEROES) if (n.hs[h.id] && hbHeldWert(h.id, n.hs[h.id]) > hbHeldWert(h.id, hb.hs[h.id])) hb.hs[h.id] = n.hs[h.id];
        hb.shB = Math.max(nn(hb.shB), hbHeldenWert(hb.hs) - hbE0f());
        hb.schild = Math.max(nn(hb.schild), nn(n.schild));
        if (p.stW != null && Number.isFinite(hb.stW)) { const T = nn(p.stW); if (T > hb.stW) hb.sternRes = nn(hb.sternRes) + T - hb.stW; hb.stW = T; hb.sternRes = Math.min(nn(hb.sternRes), T); }   // (Sterne seit der Sicherung: schon bezahlt)
    }
    {   const Z = SYSTEM && window.__OW ? +window.__OW.zurueck || 0 : 0;
        if (Z) { const bs = loadBotState(); let n = 0;
            const leerOk = Date.now() - Z < 15 * 60000;   // ein leerer Eintrag (nach der Sicherung beigetreten) nur gleich nach dem Zurückspielen – später fehlt er wegen eines Neustarts: neu
            for (const id in bs) { const b = bs[id]; if (!b || !((b.mensch && !b.hbRoh) || (leerOk && BOT_DEFS.some(x => x.id === id && x.mensch))) || nn(b.zT) >= Z) continue;
                b.zT = Z; b.zProfil = 1; b.zEich = 1; n++;
                if (b.wache) { delete b.wache.u; delete b.wache.w; delete b.wache.lm; delete b.wache.fl; }   // → am nächsten Profil neu eichen
                if (b.hb) { delete b.hb.gU; delete b.hb.rU; } }
            if (n) { saveBotState(); console.log('Zurückgespielt: Hauptbuch von ' + n + ' Spielern wird an ihre Spielstände angeglichen'); } }
    }
    WELT.kontoMuenzen = who => { const m = wacheSehen(who); return m.init ? m.c.u + m.c.vor : 0; };   // (noch nie gesehen: jetzt ansehen – nie ungeprüft das Profil; ohne Mitspieler-Datensatz hat er keine Münzen in der Welt)
    WELT.hauptbuch = who => hbDa(who);                // (für Tests und die Admin-Ansicht)
    // Neue Welt-Saison (09f-saison.js saisonNeu): sein Konto passend zurücksetzen – Stufe 1 (EP neu, Stufen-Truppen/-Gems wieder ab
    // Stufe 1, Fähigkeiten 0 ohne Rücksetz-Gems), Münzen PLAYER_START_COINS (wie sein Handy), keine Verwundeten, Nebel neu. Bleibt: Stadt, Forschung, Ausrüstung,
    // Helden, Schild, Gems und Rohstoffe (Konten, Topf des Ausgegebenen – ein laufender Bau ist schon bezahlt). Sein altes Profil
    // zählt nicht mehr (welt.js: erst das Profil der neuen Saison) – so gibt es keine Fehlalarme, wenn sein Handy später kommt.
    // f < 1: erster Reset nach der Umstellung auf „pro Stunde“ – die Münz-Töpfe des Ausgegebenen (Münzen, Admin-Münzen) werden
    // umgerechnet (abgerundet). Holz/Stein/Eisen bleiben unverändert wie am Handy (6.10.: wieder RoK-Größe).
    // B: einmalige Ausnahme (Alexander 6.10.) – Edelsteine genau SAISON_AUSNAHME_GEMS, Holz/Stein/Eisen 0, die Töpfe des Ausgegebenen
    // leer (Abholfach hb.gIn bleibt).
    WELT.saisonKonto = function (who, f, B) {
        const b = loadBotState()[who]; if (!b) return;
        const m = wacheMem[who], hb = hbDa(who), d = wd(who), x = WELT.menschen[who];
        if (m) { for (const art in m.warte) for (const x of m.warte[art]) befehlFertig(x);   // (wartende Befehle der alten Welt: erledigt)
            if (m.init && hb) { if (m.gGeeicht) hb.gU = Math.round(m.g.u); if (m.rk) hb.rU = { h: Math.round(m.rk.h.u), s: Math.round(m.rk.s.u), e: Math.round(m.rk.e.u) }; } }
        delete wacheMem[who]; delete nbMem[who];      // (beim nächsten Ansehen neu – aus den Werten unten)
        if (d) { d.u = PLAYER_START_COINS; d.w = 0; d.lm = 1; d.lv = 1; delete d.fl; delete d.pTr; }   // (pTr: sein Saison-Pass fängt neu an – Truppen-Stufen wieder abholbar)
        if (hb) { hb.sk = {}; hb.lvG = 1; hb.nb = ''; hb.sp = []; delete hb.nbAlle; hb.w = {}; hb.passF = 0; hb.passAb = Date.now(); }
        if (f > 0 && f < 1) {
            if (hb) hb.cA = Math.floor(nn(hb.cA) * f);   // (Holz/Stein/Eisen bleiben – auch ihre Töpfe rU/rA, 6.10.)
            if (d) d.gC = Math.floor(nn(d.gC) * f);
        }
        if (B > 0) {                                   // einmalige Ausnahme (Alexander 6.10.): wie sein Handy beim Neuladen
            if (hb) { hb.gU = SAISON_AUSNAHME_GEMS; hb.rU = { h: 0, s: 0, e: 0 }; hb.rA = { h: 0, s: 0, e: 0 }; hb.gA = 0; hb.cA = 0; }
            if (d) d.gC = 0;
            if (b.res) b.res = Object.assign(b.res, { h: 0, s: 0, e: 0 });
        }
        if (x) { x.profil = null; x.profilNeu = false; }
        saveBotState();
    };
