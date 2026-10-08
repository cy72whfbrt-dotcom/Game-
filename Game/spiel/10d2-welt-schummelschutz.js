// Teil 10d2-welt-schummelschutz.js: Weltrechner: Schummel-Schutz (Konto, Spielraum, Ausbau/Truppen prüfen) (im Block „if (window.WELT)“ aus 10d1 – nur zusammengesetzt gültig)

    // ===== Schummel-Schutz (nur beim Weltrechner) =====
    // Münzen, Gems und Stufe eines Spielers rechnet noch sein eigenes Handy. Ein Schummler könnte also Befehle fälschen
    // („gib mir Truppen“, „Basis auf Stufe 99“), ohne zu bezahlen. Darum prüft der Weltrechner hier jeden Befehl:
    //   - Zahlen nur endlich und größer 0, mit Obergrenze; Kennungen nur Buchstaben/Ziffern; nur eigene Basen
    //   - Truppen-Geschenke nur so viel, wie die Quelle wirklich hergibt (Stufe, Thron-Shop, Krankenhaus, Fund, Admin-Geschenk)
    //   - Ausbau nur genau +1 Stufe und nur, wenn er die Münzen haben kann (eigenes „Konto“, siehe wacheSehen)
    //   - zu viele Befehle in kurzer Zeit → der Rest verfällt
    // Echte Spieler werden nie blockiert: passt etwas (noch) nicht, wartet der Befehl bis zu 60 s auf das nächste Profil
    // (das Handy schickt es alle 10 s). Was abgelehnt/gekappt wird oder auffällig springt, landet in WELT.warnungen →
    // weltrechner/start.js schreibt es in weltrechner/schummel.php → admin.php zeigt es unter „Auffälligkeiten“.
    WELT.warnungen = WELT.warnungen || [];
    const WACHE_WARTEN_MS = 60000, WACHE_MAX = 1e30;   // (wie der Server/Prüfer: Truppen dürfen nach langem Spielen riesig werden – Alexander 4.10.; vorher 1e15 = Angriffe/Senden über 1 Billiarde wurden still abgelehnt)
    const zahlOk = (v, max) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= (max || WACHE_MAX);
    const inselOk = v => Number.isInteger(v) && !!islandById[v];
    const kennungOk = v => typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(v);
    const nn = v => typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;      // nie negativ, nie kaputt
    const fz = n => fmtCompact(Math.round(n));
    function warnen(who, was, text, wert) {
        const uid = parseInt(String(who).slice(1), 10); if (!(uid > 0)) return;
        WELT.warnungen.push({ uid, was, text: String(text).slice(0, 300), wert: nn(wert), zeit: Date.now() });
        if (WELT.warnungen.length > 500) WELT.warnungen.splice(0, WELT.warnungen.length - 500);   // start.js holt sie alle 5 s ab
    }
    // Merkzettel je Spieler: im Arbeitsspeicher (wacheMem) und – was einen Neustart überleben muss – in der Welt (bs.wache)
    const wacheMem = {};
    const konto = () => ({ u: 0, vor: 0, vorT: 0 });   // u: so viel kann er höchstens haben · vor: gerade ausgegeben (sein Handy zeigt schon weniger)
    const wm = who => wacheMem[who] || (wacheMem[who] = { init: false, zeiten: {}, warte: { ausbau: [], truppen: [] }, c: konto(), w: konto(), g: konto(), rk: null, sr: [], ein: [], flug: [], lvlLog: [], lvl: 1, rEin: [], rsr: [] });
    function wd(who) {   // lv: bis zu welcher Stufe die Stufen-Truppen bezahlt sind, gTr/gC: Admin-Geschenke (Truppen/Münzen)
        const b = loadBotState()[who]; if (!b) return null;
        if (!b.wache || typeof b.wache !== 'object') b.wache = { lv: 0, gTr: 0, gC: 0 };
        return b.wache;
    }
    function zuOft(m, art, max, ms) {    // mehr als max-mal in ms? (dann zählt dieser nicht mit)
        const now = Date.now(), l = m.zeiten[art] || (m.zeiten[art] = []);
        while (l.length && now - l[0] > ms) l.shift();
        if (l.length >= max) return true;
        l.push(now); return false;
    }
    const profilVon = who => { const x = WELT.menschen[who]; return x && x.profil && typeof x.profil === 'object' ? x.profil : null; };
    const zahlOderNull = v => typeof v === 'number' && Number.isFinite(v) ? v : 0;
    // Das „Konto“ eines Spielers: wie viele Münzen (und Verwundete) KANN er höchstens haben – unabhängig von seinem Handy:
    //   + genau das, was der Weltrechner ihm schickt (Nachrichten „delta“: Produktion, Beute, Maut, Kämpfe, EP, Verwundete –
    //     mitgezählt in wacheDelta, bevor welt.js sie verschickt)
    //   + ein Spielraum pro Stunde für das, was nur sein Handy gibt (Stufen-Belohnung, Thron-Shop, Saison-Pass, Funde)
    //   + Admin-Geschenke (admin.php meldet sie dem Weltrechner als Gutschrift)
    // Zeigt sein Profil weniger, gilt das Profil (er hat ausgegeben – der Unterschied ist „Vorschuss“ für Befehle, die
    // gleich noch kommen). Zeigt es mehr, als möglich ist → Warnung, das Konto bleibt beim Möglichen.
    // Nachrichten können noch „unterwegs“ sein (sein Profil kennt sie noch nicht): bis zu ein paar Sekunden, und wenn er
    // offline ist, bis er wiederkommt (das erste Profil danach entsteht, bevor sein Handy sie abholt). Darum zählen
    // Nachrichten als unterwegs, bis danach zwei Profile von ihm kamen (m.flug, je Minute zusammengefasst).
    // EP kommen nur vom Weltrechner (Kämpfe): daraus folgt die höchste Stufe, die er haben kann (m.lvl).
    // Spielraum pro Stunde: Stufen-Münzen der letzten Stunde (+ nächste Stufe) und ein paar Stunden-Einnahmen (Saison-Pass zahlt
    // „eine Stunde Produktion“). Die Stunden-Einnahme ist GEMESSEN (was der Weltrechner ihm in der
    // letzten Stunde schickte) – nie aus seinen jetzigen Basis-Stufen, sonst würde ein erschlichener Ausbau den Spielraum
    // gleich weiter vergrößern. Am Anfang (noch keine Stunde gemessen) gilt die Produktion beim ersten Sehen (m.hp0).
    const FLUG_MS = 10000, FLUG_MAX_MS = 48 * 3600000;
    // Zwei Töpfe (Alexander 5.10.): Stufen-Münzen (sicher: die EP kommen vom Weltrechner) je Stunde – der feste Rest nur EINMAL
    // am Tag (vorher jede Stunde neu: ~8 Mio. Münzen am Tag „ohne Beleg“). Der Tages-Topf steht in der Welt (überlebt Neustarts).
    // Feste Größen × WIRTSCHAFT_KOSTEN (5.10., wie die Münzen/Truppen außerhalb der Produktion): Tages-Rest vorher 50.000, Thron-Shop/
    // Saison-Pass mindestens 5.000 Münzen bzw. 1.000 Truppen, Fund mindestens 100 Truppen – Münzen wirtM (6.10.: × MUENZ_FAKTOR)
    const SR_FIX = wirtM(50000), SR_STUNDE_MIN = wirtM(5000), TR_STUNDE_MIN = wirtK(1000), FUND_TR_MIN = wirtK(100);
    function spielraumTeile(who, m) {
        const L = Math.max(1, m.lvl), now = Date.now();
        let von = L; for (const x of m.lvlLog) if (x.l < von) von = x.l;
        let lv = 0; for (let l = Math.max(2, von); l <= L + 1 && l <= von + 300; l++) lv += levelRewardCoins(l);
        while (m.ein.length && now - m.ein[0].t > 3600000) m.ein.shift();
        const gemessen = m.ein.reduce((a, x) => a + x.n, 0), dauer = now - m.initT;
        const stunde = dauer >= 3600000 ? gemessen : Math.max(m.hp0, gemessen * 3600000 / Math.max(dauer, 600000));
        return { lv, fix: SR_FIX + 3 * Math.max(SR_STUNDE_MIN, stunde) + 3 * levelRewardCoins(L + 1) };
    }
    function spielraumTag(who) { const d = wd(who), t = todayKey(); if (!d) return null; if (d.srT !== t) { d.srT = t; d.srN = 0; } return d; }
    function spielraumNehmen(who, m, n) {           // n Münzen aus dem Spielraum: erst die Stufen-Münzen (Stunde), dann der Tages-Topf
        if (!(n > 0)) return; const now = Date.now(), { lv } = spielraumTeile(who, m);
        const a = Math.min(n, Math.max(0, lv - m.sr.reduce((s, x) => s + x.n, 0))); if (a > 0) m.sr.push({ t: now, n: a });
        const d = spielraumTag(who); if (d && n - a > 0) { d.srN = nn(d.srN) + n - a; saveBotState(); }
    }
    // Münzen, die auf einmal kommen dürfen: Saison-Pass (je Saison höchstens die Münz-Stufen beider Reihen), Tagesaufgaben (je Tag
    // ihre Münz-Stunden – der Topf füllt sich gleichmäßig nach, höchstens 2 Tage, weil sein Tag nicht der des Servers ist). Gemessen in
    // Stunden Ertrag.
    let passMuenzH = null;
    const AUF_MUENZ_H = 2 * QUEST_COIN_H.reduce((a, x) => a + x, 0);   // 6 Aufgaben: je 2 leicht/mittel/schwer
    function muenzGutscheine(who, mehr, d) {
        if (!d || !(mehr > 0)) return 0;
        if (passMuenzH === null) { passMuenzH = 0; for (let L = 1; L <= PASS_LVLS; L++) for (const pr of [false, true]) for (const r of passRewardAt(L, pr)) if (r.k === 'coins') passMuenzH += r.n || 1; }
        const now = Date.now(), h = Math.max(SR_STUNDE_MIN, nn(hourProduction(who).coins)) * 1.2, s = passNo(now);   // (+20 %: sein Handy rechnet mit eigenen Boni)
        if (d.pS !== s) { d.pS = s; d.pM = 0; }
        d.aM = Math.max(0, nn(d.aM) - AUF_MUENZ_H * Math.max(0, now - nn(d.aMt)) / 864e5); d.aMt = now;
        const passRest = Math.max(0, passMuenzH - nn(d.pM)), aufRest = Math.max(0, 2 * AUF_MUENZ_H - d.aM);
        const use = Math.min(mehr, (passRest + aufRest) * h); if (!(use > 0)) return 0;
        let r = use / h; const ausPass = Math.min(r, passRest); r -= ausPass; const ausAuf = Math.min(r, aufRest);
        d.pM = nn(d.pM) + ausPass; d.aM += ausAuf; saveBotState();
        return use;
    }
    function spielraumFrei(who, m) {
        const now = Date.now(); while (m.sr.length && now - m.sr[0].t > 3600000) m.sr.shift();
        const { lv, fix } = spielraumTeile(who, m), d = spielraumTag(who);
        return Math.max(0, lv - m.sr.reduce((a, x) => a + x.n, 0)) + Math.max(0, fix - (d ? nn(d.srN) : 0));
    }
    // (welt.js → Server) jede Nachricht „delta“ an einen Spieler mitzählen – genau das kommt bei ihm an
    // Unterwegs (m.flug): je Art (c Münzen, w Verwundete, g Gems, h/s/e Rohstoffe) P = dazu, M = weg
    const FLUG_K = ['c', 'w', 'g', 'h', 's', 'e'];
    function wacheDelta(who, e) {
        const m = wacheSehen(who); if (!m.init) return;
        const now = Date.now(), x = { c: zahlOderNull(e.coins), w: zahlOderNull(e.wounded), g: zahlOderNull(e.gems) };
        if (e.res && typeof e.res === 'object') for (const k of ROHK) x[k] = zahlOderNull(e.res[k]);   // Paket D: Rohstoffe wie die Münzen mitzählen
        m.c.u = Math.max(0, m.c.u + x.c); m.w.u = Math.max(0, m.w.u + x.w); m.g.u = Math.max(0, m.g.u + x.g);
        if (m.rk) for (const k of ROHK) if (x[k]) m.rk[k].u = Math.max(0, m.rk[k].u + x[k]);
        if (x.c > 0) { const t = now - now % 60000, l = m.ein[m.ein.length - 1]; if (l && l.t === t) l.n += x.c; else m.ein.push({ t, n: x.c }); }   // Einnahmen je Minute
        for (const k of ROHK) if (x[k] > 0) { const t = now - now % 60000, l = m.rEin[m.rEin.length - 1]; if (l && l.t === t) l[k] += x[k]; else m.rEin.push(Object.assign({ t, h: 0, s: 0, e: 0 }, { [k]: x[k] })); }
        if (FLUG_K.some(k => x[k])) { let f = m.flug[m.flug.length - 1]; if (!f || f.n || now - f.t > 60000) m.flug.push(f = { t: now, n: 0, P: {}, M: {} });
            for (const k of FLUG_K) if (x[k] > 0) f.P[k] = (f.P[k] || 0) + x[k]; else if (x[k] < 0) f.M[k] = (f.M[k] || 0) - x[k]; }
        m.xpRest += nn(e.xp);
        for (let i = 0; i < 1000 && m.xpRest >= xpNeededForLevel(m.lvl); i++) { m.xpRest -= xpNeededForLevel(m.lvl); m.lvl++; }
        const d = wd(who); if (d) d.lm = m.lvl;
        const hb = hbDa(who);                          // 3B: sichere Helden-Splitter fürs Hauptbuch
        if (hb && e.sh && typeof e.sh === 'object') for (const h in e.sh) if (zahlOk(e.sh[h], 1e6)) hb.shB += e.sh[h];
    }
    // (3B) andere Nachrichten des Weltrechners an ihn: Preise (Gems, Splitter, Kisten), Bündnis-Geschenke, Startschild
    function wacheNachricht(who, e) {
        const hb = hbDa(who); if (!hb) return;
        if (e.art === 'evPreis' || e.art === 'bundGeschenk') {
            if (zahlOk(e.gems, 1e7)) hb.gIn += e.gems;                         // liegt im Abholfach – kommt später in seinem Profil an
            if (zahlOk(e.sh, 1e6)) hb.shB += e.sh;
            if (Number.isInteger(e.crate) && e.crate >= 0 && e.crate <= 5) hbKisteDazu(hb, e.crate);
        }
        if (e.art === 'evPreis' && (zahlOk(e.coins, 1e15) || zahlOk(e.tr, 1e15))) { const d = wd(who); if (d) { if (zahlOk(e.coins, 1e15)) d.gC = nn(d.gC) + e.coins; if (zahlOk(e.tr, 1e15)) d.gTr = nn(d.gTr) + e.tr; } }   // Event-Leisten (Merkliste 33): Münzen/Truppen aus dem Abholfach – wie ein Geschenk gutgeschrieben (Abholen: Münzen im Profil, Truppen als Befehl „geschenk“)
        if (e.art === 'startschild' && zahlOk(e.bis, 1e15)) hb.schild = Math.max(nn(hb.schild), e.bis);
        if (e.art === 'haendlerWare') {                // beim Händler mit Münzen bezahlt: die Ware ist bezahlt (vorher verlangte das Hauptbuch sie nochmal in Gems)
            if (zahlOk(e.sh, 1e3)) hb.shB += e.sh;
            if (Number.isInteger(e.kiste) && e.kiste >= 0 && e.kiste <= 2) hbKisteDazu(hb, e.kiste);
            if (e.schild === 2) hb.fr.schild = nn(hb.fr.schild) + 2;
        }
        saveBotState();
    }
    if (Array.isArray(WELT.ereignisseRaus)) {        // (nur zuschauen – welt.js verschickt die Liste wie bisher)
        const raus = WELT.ereignisseRaus;
        raus.push = function (...xs) {
            for (const x of xs) try { if (x && x.e && x.an > 0) { if (x.e.art === 'delta') wacheDelta('u' + x.an, x.e); else wacheNachricht('u' + x.an, x.e); } } catch (e) { console.warn('Schummel-Schutz:', e); }
            return Array.prototype.push.apply(this, xs);
        };
    }
    // Ein Wert aus seinem neuen Profil gegen das Konto k halten (für Münzen und Verwundete gleich).
    // → wie viel MEHR das Profil zeigt, als möglich ist (vor Spielraum/Geschenk); 0 = in Ordnung
    function kontoProfil(k, pw, flugPlus, flugMinus, now) {
        const hi = k.u + flugMinus, lo = Math.max(0, k.u - flugPlus);   // hi: er kennt die Nachrichten unterwegs schon, lo: noch nicht
        if (pw > hi) { k.u = pw; return pw - hi; }
        if (pw < lo) { k.vor = (now - k.vorT < WACHE_WARTEN_MS ? k.vor : 0) + (lo - pw); k.vorT = now; k.u = pw + flugPlus; }
        return 0;                                       // dazwischen: unklar, wie viel unterwegs schon drin ist – das Konto bleibt
    }
    // Rohstoffe (Paket D, 3B): ein Konto je Rohstoff wie bei den Münzen = was der Weltrechner ihm geschickt hat. Mehr im Profil
    // (Markt-Kauf) geht nur im Spielraum pro Stunde (ROH_RAUM + ¼ Stunde seiner Einnahmen + Markt-Tageslimit), der Rest
    // ist auffällig und zählt nicht. Was sein Profil weniger zeigt, hat er ausgegeben (Topf hb.rA – bezahlt Burg, Gebäude,
    // Forschung, Truppen-Stufe im Hauptbuch).
    const ROHK = ['h', 's', 'e'];
    const ROH_RAUM = Math.max(10, Math.round(2000 * WIRTSCHAFT_KOSTEN * ROH_FAKTOR));   // (ein Bestand in RoK-Größe wie die Kosten: wieder 2.000; 10 gegen Rundungen)
    function rohWacheProfil(who, m, p, P, M, now) {
        if (!p || !p.res || typeof p.res !== 'object') return;
        m.rDeckel = null; m.rDeckelP = p;              // (die Grenze gilt für genau dieses Profil – auch wenn es nochmal angewendet wird)
        const hb = hbDa(who);
        if (!m.rk) { m.rk = {}; for (const k of ROHK) { m.rk[k] = konto(); m.rk[k].u = nn(p.res[k]); } return; }   // zum ersten Mal (und das Hauptbuch weiß noch nichts): geeicht
        while (m.rEin.length && now - m.rEin[0].t > 3600000) m.rEin.shift();
        while (m.rsr.length && now - m.rsr[0].t > 3600000) m.rsr.shift();
        let lim = 0, preis = 0; try { lim = AUF ? AUF.marktLimit(who) / AUF.MARKT_WERT : 0; preis = lim ? AUF.MARKT_WERT * (1 + AUF.marktGebuehr(AUF.marktStufe(who))) : 0; } catch (e) {}
        const d = wd(who), heute = todayKey(); if (d && (!d.rm || d.rm.t !== heute)) d.rm = { t: heute, n: 0 };   // Markt-Käufe heute (alle drei Rohstoffe zusammen, wie am Handy – überlebt Neustarts)
        for (const k of ROHK) {
            const pr = nn(p.res[k]), kk = m.rk[k]; let mehr = kontoProfil(kk, pr, P[k] || 0, M[k] || 0, now);
            if (kk.vor > 0) { if (hb) hb.rA[k] = nn(hb.rA[k]) + kk.vor; kk.vor = 0; }      // ausgegeben → Topf
            if (mehr <= 0) continue;
            const stunde = m.rEin.reduce((a, x) => a + x[k], 0), raum = Math.max(0, ROH_RAUM + .25 * Math.max(stunde, (m.rHp0 || {})[k] || 0) - m.rsr.reduce((a, x) => a + (x[k] || 0), 0));
            const nimm = Math.min(mehr, raum); if (nimm > 0) m.rsr.push({ t: now, [k]: nimm }); mehr -= nimm;
            if (mehr > 0 && d && hb && lim > d.rm.n) {     // Markt-Kauf: höchstens das Tageslimit – und die Münzen dafür werden abgebucht (vorher: jede Stunde neu und gratis)
                const markt = Math.min(mehr, Math.floor(lim - d.rm.n));
                if (markt > 0 && hbZahlen(who, hb, m, { c: Math.ceil(markt * preis) })) { d.rm.n += markt; mehr -= markt; saveBotState(); } }
            if (mehr >= 1) { kk.u = pr - mehr; warnen(who, 'rohstoffe', AUF.ROH_DEF[k].name + ' springt: das Handy sagt ' + fz(pr) + ', möglich wären höchstens ' + fz(pr - mehr) + '.', mehr);
                (m.rDeckel || (m.rDeckel = {}))[k] = pr - mehr; }   // (in der Welt nur, was möglich ist – hbKlemmen deckelt gleich – sonst holt ein anderer die erfundenen Rohstoffe als Beute)
        }
    }
    // Münzen, die er ausgegeben hat und die kein Befehl abgeholt hat (nach 60 s) → Topf hb.cA (bezahlt Bauen/Forschen im Hauptbuch)
    function vorAltern(who, m, now) { if (m.c.vor > 0 && now - m.c.vorT > WACHE_WARTEN_MS) { const hb = hbDa(who); if (hb) hb.cA = nn(hb.cA) + m.c.vor; m.c.vor = 0; } }
    // Nachrichten unterwegs (m.flug) zusammengezählt – für einen Neustart in der Welt gemerkt (bs.wache.fl, klein: nur die Summen)
    function flugSumme(m) { const P = {}, M = {}; for (const f of m.flug) { for (const k in f.P) P[k] = (P[k] || 0) + f.P[k]; for (const k in f.M) M[k] = (M[k] || 0) + f.M[k]; } return { P, M }; }
    function flugMerken(d, m) {
        const { P, M } = flugSumme(m), rund = o => { const r = {}; for (const k of FLUG_K) if (o[k] >= 1) r[k] = Math.round(o[k]); return r; }, p = rund(P), mm = rund(M);
        if (!Object.keys(p).length && !Object.keys(mm).length) { if (d.fl) delete d.fl; return; }
        const t = m.flug.reduce((a, f) => Math.min(a, f.t), Infinity);
        if (!d.fl || JSON.stringify(d.fl.P) !== JSON.stringify(p) || JSON.stringify(d.fl.M) !== JSON.stringify(mm)) d.fl = { t, P: p, M: mm };
    }
    function flugAus(fl, now) {                        // (nach dem Neustart) → ein Eintrag für m.flug – zählt wieder bis zwei Profile später
        if (!fl || typeof fl !== 'object') return null; const t = zahlOk(fl.t) && fl.t <= now ? fl.t : now, P = {}, M = {};
        if (now - t >= FLUG_MAX_MS) return null;
        for (const k of FLUG_K) { if (zahlOk((fl.P || {})[k], 1e15)) P[k] = fl.P[k]; if (zahlOk((fl.M || {})[k], 1e15)) M[k] = fl.M[k]; }
        return Object.keys(P).length || Object.keys(M).length ? { t, n: 0, P, M } : null;
    }
    function wacheSehen(who) {
        const m = wm(who), p = profilVon(who), b = loadBotState()[who]; if (!b) return m;
        const now = Date.now(), d = wd(who), hb = b.hb && b.hb.v === HB_V ? b.hb : null;
        if (!m.init) {                                 // zum ersten Mal gesehen (auch nach einem Neustart des Weltrechners)
            m.init = true; m.prof = p; m.initT = now;
            try { m.hp0 = nn(hourProduction(who).coins); } catch (e) { m.hp0 = 0; }
            // Was der Weltrechner schon über ihn weiß, steht in der Welt (bs.wache) – das zählt mehr als sein Profil in der
            // Datenbank (das hat ja sein Handy geschickt). Nur wer noch nie gesehen wurde, wird einmal am Profil „geeicht“.
            m.geeicht = Number.isFinite(d.u);
            const fl = m.geeicht ? flugAus(d.fl, now) : null, fP = fl ? fl.P : {}; if (fl) m.flug = [fl];   // Nachrichten, die vor dem Neustart noch unterwegs waren (sein Profil kennt sie evtl. noch nicht)
            m.c.u = p ? nn(p.coins) : nn(botCoins[who]); if (m.geeicht) m.c.u = Math.min(m.c.u + nn(fP.c), d.u) + m.hp0 * 0.25;   // (+ eine Viertelstunde: was zuletzt nicht mehr gespeichert wurde)
            m.w.u = p ? nn(p.wounded) : nn(b.wounded); if (Number.isFinite(d.w)) m.w.u = Math.min(m.w.u + nn(fP.w), d.w) + 1000;
            const gHb = !!(hb && Number.isFinite(hb.gU));   // 3B: Gems wie die Münzen (das Hauptbuch weiß es besser als das Profil)
            m.g.u = gHb ? hb.gU : p ? nn(p.gems) : 0; m.gGeeicht = gHb || !!(p && p.gems != null);
            if (m.geeicht && p && nn(p.coins) + nn(fP.c) < d.u) { m.c.vor = d.u - nn(fP.c) - nn(p.coins); m.c.vorT = now; }   // während der Weltrechner weg war ausgegeben: wie ein normaler Rückgang (bezahlt wartende Befehle – nie doppelt; was noch unterwegs ist, hat er nicht ausgegeben)
            m.lvl = Number.isFinite(d.lm) && d.lm >= 1 ? d.lm : Math.max(1, Math.floor(nn(p ? p.lvl : b.lvl) || 1));
            m.xpRest = xpNeededForLevel(m.lvl) - 1;    // wie voll sein Balken ist, weiß niemand: voll (großzügig)
            m.lvlLog = [{ t: now, l: m.lvl }];
            m.rEin = []; m.rk = null; try { m.rHp0 = AUF ? AUF.rohStunde(who) : null; } catch (e) { m.rHp0 = null; }
            if (hb && hb.rU) { m.rk = {}; for (const k of ROHK) { m.rk[k] = konto(); m.rk[k].u = nn(hb.rU[k]); } m.rkNeu = true; }   // (3B: was der Weltrechner weiß – gleich ab jetzt mitzählen; das Profil prüft hbKlemmen einmal dagegen)
            else if (p && p.res) rohWacheProfil(who, m, p, {}, {}, now);
        }
        m.flug = m.flug.filter(f => !(f.n >= 2 && now - f.t > FLUG_MS) && now - f.t < FLUG_MAX_MS);   // angekommen (zwei Profile später) oder uralt
        if (p && p !== m.prof && !m.geeicht) {         // noch nie gesehen: das erste frische Profil gilt (das in der Datenbank kann
            m.prof = p; m.geeicht = true;              // älter sein als sein Spielstand) – ab hier wird gezählt
            m.c.u = nn(p.coins); m.w.u = nn(p.wounded); const gNeu = !m.gGeeicht && p.gems != null; if (gNeu) { m.g.u = nn(p.gems); m.gGeeicht = true; }
            if (b.zEich) { m.eichT = nn((WELT.menschen[who] || {}).profilZeit); m.gEichT = m.eichT; delete b.zEich; }   // (nach dem Zurückspielen: Befehle von davor sind in diesem Profil schon bezahlt)
            for (const f of m.flug) { m.c.u += f.P.c || 0; m.w.u += f.P.w || 0; if (gNeu) m.g.u += f.P.g || 0; f.n++; }
            const pl = Math.max(1, Math.floor(nn(p.lvl) || 1)); if (pl > m.lvl) { m.lvl = pl; m.xpRest = xpNeededForLevel(pl) - 1; }
        }
        if (p && p !== m.prof) {                       // ein neues Profil von seinem Handy
            m.prof = p;
            const pl = Math.max(1, Math.floor(nn(p.lvl) || 1));
            if (pl > m.lvl + 1) warnen(who, 'stufe', 'Stufe springt: das Handy sagt Stufe ' + pl + ', mit seinen EP geht höchstens Stufe ' + m.lvl + '.', pl - m.lvl);
            // (3B: die Stufe kommt nur aus den EP, die der Weltrechner schickt – sein Balken gilt beim ersten Sehen als voll,
            //  darum ist m.lvl nie kleiner als die echte Stufe; ein Profil hebt sie nicht mehr an)
            m.lvlLog.push({ t: now, l: Math.min(pl, m.lvl) }); while (m.lvlLog.length > 1 && now - m.lvlLog[0].t > 3600000) m.lvlLog.shift();
            const P = {}, M = {}; for (const f of m.flug) { for (const k in f.P) P[k] = (P[k] || 0) + f.P[k]; for (const k in f.M) M[k] = (M[k] || 0) + f.M[k]; f.n++; }
            const cP = P.c || 0, cM = M.c || 0, wP = P.w || 0, wM = M.w || 0;
            // Münzen: mehr als möglich → erst ein Admin-Geschenk (sicher bekannt), dann der Spielraum, der Rest ist auffällig
            vorAltern(who, m, now);
            const pc = nn(p.coins); let mehr = kontoProfil(m.c, pc, cP, cM, now);
            if (mehr > 0) {
                const roh = mehr;
                if (d.gC > 0) { const g = Math.min(d.gC, mehr); d.gC -= g; mehr -= g; saveBotState(); }
                const nimm = Math.min(mehr, spielraumFrei(who, m)); spielraumNehmen(who, m, nimm); mehr -= nimm;
                if (mehr > 0) mehr -= muenzGutscheine(who, mehr, d);   // Saison-Pass und Thron-Shop zahlen Münzen auf einmal aus (z. B. „Alle abholen“)
                m.c.u = pc - mehr;
                if (mehr >= 1) warnen(who, 'muenzen', 'Münzen springen: +' + fz(roh) + ' mehr als erwartet, möglich wären höchstens +' + fz(roh - mehr) + '.', mehr);
            }
            // Verwundete (entstehen nur in Kämpfen, die der Weltrechner rechnet)
            const pw = nn(p.wounded), ew = m.w.u, wm2 = kontoProfil(m.w, pw, wP, wM, now);
            if (wm2 > 0) { m.w.u = ew;                  // mehr als möglich zählt NIE (vorher blieben bis 5 % je Profil stehen – das summierte sich)
                if (wm2 > ew * 0.05 + 1000) warnen(who, 'lazarett', 'Verwundete springen: das Handy sagt ' + fz(pw) + ', möglich wären höchstens ' + fz(ew + wM) + '.', wm2); }
            // 3B Gems: weniger → ausgegeben (Topf hb.gA). Mehr als möglich → erst sicher Geschicktes aus dem Abholfach (hb.gIn), dann
            // Stern-Rückgabe beim Verkaufen (hb.sternG), dann der Spielraum (Tagesbelohnung, Aufgaben, Erfolge, Pass, Funde – hb.fr.g).
            // Der Rest ist auffällig und zählt nicht (das Konto bleibt beim Möglichen).
            if (hb && p.gems != null) {                // (ein Profil ohne Gems – altes Handy – zählt hier nicht)
                hbFreiDazu(who, hb, now);
                const pg = nn(p.gems); let mg = kontoProfil(m.g, pg, P.g || 0, M.g || 0, now);
                m.gAus = m.g.vor > 0 ? m.g.vor : 0;   // (Gems, die er in DIESEM Profil ausgegeben hat – Beleg für eine Heldenkiste)
                if (m.g.vor > 0) { hb.gA = nn(hb.gA) + m.g.vor; m.g.vor = 0; }
                if (p.stW != null) hbSterne(who, hb, m, nn(p.stW));   // Sterne gekauft/verkauft (vor dem Prüfen der Gems: eine Rückgabe ist dann schon gedeckt)
                if (mg > 0) {
                    const roh = mg;
                    for (const q of ['gIn', 'sternG']) { const x = Math.min(mg, nn(hb[q])); hb[q] = nn(hb[q]) - x; mg -= x; }
                    mg -= hbSplitterGems(hb, p, mg);
                    { const x = Math.min(mg, nn(hb.fr.g)); hb.fr.g -= x; mg -= x; }
                    if (mg >= 1) { m.g.u = pg - mg; warnen(who, 'gems', 'Gems springen: +' + fz(roh) + ' mehr als erwartet, möglich wären höchstens +' + fz(roh - mg) + '.', mg); }
                }
            }
            rohWacheProfil(who, m, p, P, M, now);
        }
        if (m.geeicht) { d.u = Math.round(m.c.u); d.w = Math.round(m.w.u); flugMerken(d, m); }   // für den nächsten Start merken (geht mit der Welt mit)
        if (hb && m.gGeeicht && now - (m.hbMerkT || 0) > 60000) hbKontenMerken(hb, m, now);   // (3B: höchstens jede Minute – sonst ginge das Hauptbuch bei jedem Puls über die Leitung)
        d.lm = m.lvl;
        return m;
    }
    // aus dem Konto bezahlen (Vorschuss → Konto → Topf (3B) → Admin-Geschenk → Spielraum); false = reicht (noch) nicht
    function wacheBezahlen(who, m, kosten) {
        const now = Date.now(); vorAltern(who, m, now);
        const frei = spielraumFrei(who, m), d = wd(who), gesch = d ? nn(d.gC) : 0, hb = hbDa(who), topf = hb ? nn(hb.cA) : 0;
        if (m.c.vor + m.c.u + topf + frei + gesch < kosten) return false;
        let r = kosten, x;
        x = Math.min(r, m.c.vor); m.c.vor -= x; r -= x;
        x = Math.min(r, topf); if (x > 0) hb.cA = topf - x; r -= x;   // (erst, was er schon ausgegeben hat – dann sein Konto: sonst doppelt abgezogen)
        x = Math.min(r, m.c.u); m.c.u -= x; r -= x;
        x = Math.min(r, gesch); if (x > 0) { d.gC = Math.max(0, d.gC - x); saveBotState(); } r -= x;
        if (r > 0) spielraumNehmen(who, m, r);
        return true;
    }
    // Ausbau prüfen: 'ok' | 'warten' (Münzen noch nicht zu sehen) | 'nein'
    function ausbauPruefen(who, b, ende) {
        if (!inselOk(b.insel) || !Number.isInteger(b.stufe)) { warnen(who, 'kaputt', 'Ausbau mit kaputten Angaben (Basis ' + String(b.insel).slice(0, 20) + ', Stufe ' + String(b.stufe).slice(0, 20) + ').'); return 'nein'; }
        if (!gehoert(b.insel, who)) return 'nein';                         // gerade verloren – kommt vor, keine Warnung
        if (b.insel === botCapitalOf(who)) return 'nein';                  // die Hauptstadt wächst nur mit der Burg (alte Handys schicken das evtl. noch)
        const L = islandLevels[b.insel] || 1;
        if (L >= MAX_BASE_LEVEL) return 'nein';
        if (b.stufe <= L) return 'nein';                                   // doppelt geschickt – nichts zu tun
        if (b.stufe > L + 1) { warnen(who, 'ausbau', 'Ausbau springt: ' + islandTitle(islandById[b.insel]) + ' von Stufe ' + L + ' auf ' + b.stufe + ' – erlaubt ist nur +1.', b.stufe - L); return 'nein'; }
        const jetzt = Date.now(), damals = zahlOk(b.at) && b.at <= jetzt + 5000 && jetzt - b.at < 120000 && (!zahlOk(b._t) || Math.abs(b._t - b.at) < 30000) && evThemaAktivAm(b.at, 'bau');   // (_t: wann der Server ihn bekam – das Handy kann die Zeit nicht weit zurückdrehen)   // (Bauherr: bezahlt hat er den Preis von da – nie aus der Zukunft)
        if (b._nach) return 'ok';                                          // nach dem Zurückspielen nachgeholt: bezahlt hat er damals schon
        if (schonBezahlt(wacheSehen(who), b, false)) return 'ok';           // vor dem Eichen bezahlt (steckt schon im Konto)
        const m = wacheSehen(who), kosten = upgradeCostRoh(L) * (damals || evThemaAktiv('bau') ? .8 : 1);   // (der Rabatt nur EINMAL – vorher doppelt)
        if (wacheBezahlen(who, m, kosten)) return 'ok';
        return ende ? 'pleite' : 'warten';
    }
    // Truppen-Geschenk prüfen → wie viele er bekommt (0 = nichts), oder -1 = warten (z. B. Stufe/Profil noch nicht da)
    const TRUPPEN_QUELLEN = { stufe: 'Stufen-Belohnung', thron: 'Thron-Shop', heil: 'Krankenhaus', fund: 'Fund auf der Karte', geschenk: 'Admin-Geschenk', pass: 'Saison-Pass', aufgabe: 'Aufgaben-Bonus' };
    function truppenPruefen(who, b, ende) {
        const q = b.q, name = TRUPPEN_QUELLEN[q] || 'unbekannte Quelle';
        if (!zahlOk(b.n)) { warnen(who, 'truppen', 'Truppen-Geschenk mit kaputter Zahl (' + String(b.n).slice(0, 30) + ') – abgelehnt.'); return 0; }
        if (!TRUPPEN_QUELLEN[q]) { warnen(who, 'truppen', 'Truppen-Geschenk ohne gültige Quelle: ' + fz(b.n) + ' Truppen – abgelehnt.', b.n); return 0; }
        const m = wacheSehen(who), d = wd(who), now = Date.now(); if (!d) return 0;
        let n = b.n, erlaubt;
        if (q === 'stufe') {                           // jede Stufe zahlt genau einmal ihre Truppen (levelRewardTroops)
            if (!Number.isInteger(b.von) || !Number.isInteger(b.bis) || b.von < 0 || b.bis <= b.von || b.bis - b.von > 400) { warnen(who, 'truppen', 'Stufen-Belohnung mit kaputten Stufen – abgelehnt.'); return 0; }
            if (b.bis > m.lvl && !ende) return -1;     // seine EP sind evtl. noch unterwegs
            if (!d.lv) d.lv = Math.max(b.von, m.lvl - 3);   // zum ersten Mal: ein paar Stufen Spielraum nach hinten (seine Stufe rechnet der Weltrechner selbst – nie die vom Handy)
            const hoch = Math.min(b.bis, m.lvl), ab = Math.max(b.von, d.lv);
            erlaubt = 0; for (let l = ab + 1; l <= hoch; l++) erlaubt += levelRewardTroops(l);
            if (hoch > d.lv) { d.lv = hoch; saveBotState(); }
            if (b.bis > hoch) warnen(who, 'truppen', 'Stufen-Belohnung bis Stufe ' + b.bis + ', mit seinen EP geht höchstens Stufe ' + m.lvl + '.', b.bis - m.lvl);
        } else if (q === 'heil') {                     // Krankenhaus: höchstens so viele, wie verwundet sind
            if (now - m.w.vorT > WACHE_WARTEN_MS) m.w.vor = 0;
            erlaubt = (m.w.vor + m.w.u) * 1.02 + 10;
            if (n > erlaubt && !ende) return -1;
            const kosten = Math.ceil(Math.min(n, erlaubt) * HEAL_COIN_PER_TROOP);   // (Heilen kostet Münzen – wie am Handy; vorher nicht geprüft)
            if (kosten > 0 && !wacheBezahlen(who, m, kosten)) { if (!ende) return -1; warnen(who, 'truppen', 'Krankenhaus: ' + fz(n) + ' Truppen heilen ohne die ' + fz(kosten) + ' Münzen – abgelehnt.', kosten); return 0; }
            let r = Math.min(n, erlaubt), x = Math.min(r, m.w.vor); m.w.vor -= x; r -= x; m.w.u = Math.max(0, m.w.u - r);
        } else if (q === 'fund') {                     // Fund auf der Karte: höchstens 3 liegen herum, alle 20–45 s ein neuer
            if (zuOft(m, 'fund', 12, 600000)) { warnen(who, 'truppen', 'Zu viele Funde auf der Karte (über 12 in 10 Minuten) – abgelehnt.', b.n); return 0; }   // (echt: ~7 in 10 Min.)
            const heute = todayKey(); if (!d.fund || d.fund.t !== heute) d.fund = { t: heute, n: 0 };   // höchstens 300 am Tag (Alexander 5.10.: ~7 Std. ohne Pause – gegen ein Skript rund um die Uhr; überlebt Neustarts)
            if (d.fund.n >= 300) { if (d.fund.n === 300) warnen(who, 'truppen', 'Über 300 Funde auf der Karte an einem Tag – abgelehnt.', b.n); d.fund.n = 301; saveBotState(); return 0; }
            d.fund.n++; saveBotState();
            erlaubt = Math.max(FUND_TR_MIN, niceRound(stufenTruppenMass(Math.max(m.lvl, 2)) * 0.05)) * 1.05 + FUND_TR_MIN;
        } else if (q === 'pass') {                     // Saison-Pass: jede Stufe (Reihe) zahlt einmal je Saison ihre Truppen-Stunden – und nur so weit, wie man in der Zeit kommen kann
            const s = passNo(now), l = b.l, pr = b.p === 1 ? 1 : 0, ok = Number.isInteger(l) && l >= 1 && l <= PASS_LVLS && (b.s === s || b.s === s - 1);
            const r = ok ? passRewardAt(l, !!pr).find(x => x.k === 'tr') : null;
            if (!r) { warnen(who, 'truppen', 'Saison-Pass: Truppen für eine Stufe ohne Truppen – abgelehnt.', b.n); return 0; }
            const tage = (now - (PASS_EPOCH + (b.s - 1) * PASS_LEN)) / 864e5, bis = b.s < s ? PASS_LVLS : Math.min(PASS_LVLS, Math.ceil(PASS_LVLS * 2 * tage / 28) + 3);   // (wie das Hauptbuch: alles frühestens nach halber Saison)
            if (l > bis) { warnen(who, 'truppen', 'Saison-Pass: Stufe ' + l + ' schon nach ' + Math.floor(tage) + ' Tagen – abgelehnt.', b.n); return 0; }
            const P = d.pTr = d.pTr && typeof d.pTr === 'object' ? d.pTr : {}; for (const k in P) if (+k < s - 1) delete P[k];
            const schl = l + ':' + pr, L = P[b.s] = Array.isArray(P[b.s]) ? P[b.s] : [];
            if (L.includes(schl)) { warnen(who, 'truppen', 'Saison-Pass: Truppen von Stufe ' + l + ' schon abgeholt – abgelehnt.', b.n); return 0; }
            L.push(schl); saveBotState();
            erlaubt = 3 * Math.max(TR_STUNDE_MIN, hourProduction(who).troops * r.n) + TR_STUNDE_MIN;   // (×3 wie beim Thron-Shop)
        } else if (q === 'aufgabe') {                  // Tagesaufgaben (Bonus bei 3 erledigt): einmal am Tag – höchstens 2 in 24 Std. (sein Tag ist nicht der des Servers)
            const L = (Array.isArray(d.aufTr) ? d.aufTr : []).filter(t => now - t < 864e5);
            if (L.length >= 2) { warnen(who, 'truppen', 'Aufgaben-Bonus: über 2 Truppen-Belohnungen in 24 Std. – abgelehnt.', b.n); return 0; }
            d.aufTr = [...L, now]; saveBotState();
            erlaubt = 3 * Math.max(TR_STUNDE_MIN, hourProduction(who).troops * QUEST_BONUS3.tr) + TR_STUNDE_MIN;
        } else {                                    // Admin-Geschenk: nur so viel, wie der Admin geschickt hat
            if (n > nn(d.gTr) + 0.5 && !ende) return -1;
            erlaubt = nn(d.gTr); d.gTr = Math.max(0, nn(d.gTr) - Math.min(n, erlaubt)); saveBotState();
        }
        if (n > erlaubt) { warnen(who, 'truppen', name + ': ' + fz(n) + ' Truppen verlangt, erlaubt sind ' + fz(erlaubt) + ' – gekappt.', n - erlaubt); n = erlaubt; }
        return Math.max(0, Math.floor(n));
    }
    function truppenGeben(who, n) { const cap = botCapitalOf(who); if (n >= 1 && cap !== null && cap !== undefined) { islandTroops[cap] = (islandTroops[cap] || 0) + n; saveGame(); } }
    // Wartende Befehle (Ausbau/Truppen) der Reihe nach abarbeiten – nie überholen, sonst stimmen die Stufen nicht
    function wacheAbarbeiten(who) {
        const m = wm(who), now = Date.now();
        for (const art of ['ausbau', 'truppen']) {
            const l = m.warte[art];
            while (l.length) {
                const x = l[0], ende = now >= x.bis;
                if (art === 'ausbau') { const r = ausbauPruefen(who, x.b, ende); if (r === 'warten') break;
                    if (r === 'ok') { islandLevels[x.b.insel] = (islandLevels[x.b.insel] || 1) + 1; evPunkte('bau', who, 2 + islandLevels[x.b.insel]); saveGame(); requestRender(); befehlBezahlt(x.b); }
                    if (r === 'pleite') {                  // nach 60 s immer noch nicht bezahlbar: ablehnen – die weiteren Stufen dieser Basis auch
                        const L = islandLevels[x.b.insel] || 1, m2 = wacheSehen(who), weitere = l.filter((y, i) => i > 0 && y.b.insel === x.b.insel).length;
                        for (let i = l.length - 1; i > 0; i--) if (l[i].b.insel === x.b.insel) befehlFertig(l.splice(i, 1)[0]);
                        warnen(who, 'ausbau', 'Ausbau ohne Münzen: ' + islandTitle(islandById[x.b.insel]) + ' auf Stufe ' + (L + 1) + ' kostet ' + fz(upgradeCost(L)) + ', er kann höchstens ' + fz(m2.c.u + m2.c.vor + spielraumFrei(who, m2)) + ' haben – abgelehnt' + (weitere ? ' (und ' + weitere + ' weitere Stufen dieser Basis)' : '') + '.', upgradeCost(L));
                    } }
                else { const n = truppenPruefen(who, x.b, ende); if (n < 0) break; truppenGeben(who, n); if (n > 0) befehlBezahlt(x.b); }
                befehlFertig(l.shift());
            }
        }
    }
    // Wartende Befehle (Ausbau, Truppen – bis 60 s, bis sein Profil die Zahlung zeigt) gelten erst als erledigt, wenn sie entschieden
    // sind (welt.js quittiert sie erst dann – stürzt der Weltrechner vorher ab, kommen sie wieder und laufen dann). Angenommene
    // bezahlte Befehle meldet er dem Server (nur die holt das Zurückspielen nach).
    // Nach dem Zurückspielen wird sein Konto an einem neuen Profil geeicht – ein Befehl, den der Server VOR diesem Profil bekam, ist
    // darin schon bezahlt: nicht nochmal abbuchen. (_t: Server-Zeit des Befehls, 1 s Spielraum; gilt nur nach dem Zurückspielen –
    // sonst zählt wie immer der Rückgang im Profil)
    const schonBezahlt = (m, b, gems) => { const T = gems ? nn(m.gEichT) : nn(m.eichT); return !!(T && zahlOk(b._t) && b._t + 1000 <= T); };
    function befehlFertig(x) { if (x && x.wartet && x.b && x.b._id && WELT.befehlErledigt) WELT.befehlErledigt(x.b._id); }
    function befehlBezahlt(b) { if (b && b._id && WELT.befehlBezahlt) WELT.befehlBezahlt(b._id); }
    // (vor jedem Puls) alle echten Spieler ansehen, Wartendes erledigen
    function wacheRunde() {
        for (const id in WELT.menschen) { if (!botById[id] || !loadBotState()[id]) continue; wacheSehen(id); wacheAbarbeiten(id); }
        hbRunde(Date.now());
    }
