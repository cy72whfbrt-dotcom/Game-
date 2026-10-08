// Teil 10d6-welt-nachrichten-start.js: Nachrichten vom Weltrechner, Kampfbericht, Willkommen, Start (im Block „if (window.WELT)“ aus 10d1 – nur zusammengesetzt gültig)

    // Nachrichten vom Weltrechner an mich: Münzen, Gems, EP, Thron-Punkte, Krankenhaus, Splitter, Zahlen
    const STAT_NAMEN = { caps: 'captures', pvp: 'pvpWins', defs: 'defends', bosses: 'bosses', temples: 'temples', scouts: 'scouts', tolls: 'tolls', tollCoins: 'tollCoins', armyWins: 'armyWins', healed: 'healed', barb: 'barb', dboss: 'dboss', throneMin: 'throneMin', heroFires: 'heroFires', drache: 'drache', inv: 'inv',
        lager: 'lager', qb: 'qb', qd: 'qd', qi: 'qi', invPkt: 'invPkt', qHilfe: 'qHilfe', qVerst: 'qVerst', qRally: 'qRally' };   // (Thron-Minuten und Helden-Zünder zählt der Weltrechner – vorher kamen sie nie an; die q…: für Tagesaufgaben und Saison-Pass, QUEST_STAT)
    WELT.beiNachricht.push(function (e) {
        if (!e || e.art !== 'delta') return;
        if (e.coins) coins = Math.max(0, coins + e.coins);
        if (e.gems) gems = Math.max(0, gems + e.gems);
        if (e.tp) { throneState.pts = Math.max(0, (throneState.pts || 0) + e.tp); if (e.tp > 0) throneState.earned = (throneState.earned || 0) + e.tp; saveThrone(); }
        if (e.xp > 0) addXp(e.xp);
        if (e.wounded) { const c = loadCity(); c.wounded = Math.max(0, (c.wounded || 0) + e.wounded); saveCity(); }
        if (e.sh) { const hs = loadHeroes(); for (const h in e.sh) if (hs[h]) hs[h].sh = Math.max(0, (hs[h].sh || 0) + e.sh[h]); saveHeroes(); }
        if (e.stats) for (const k in e.stats) if (STAT_NAMEN[k] && Number.isFinite(e.stats[k]) && e.stats[k] > 0 && e.stats[k] <= 1e6) { statBump(STAT_NAMEN[k], e.stats[k]); if (k === 'caps') questProgress('capture', e.stats[k]); }   // (Tagesaufgabe „Erobere …“ auch für echte Spieler)
        if (e.res && AUF) AUF.rohDazu('player', e.res);                          // Holz, Stein, Eisen (Produktion, Sammeln)
        updateHud(); saveGame(); saveProgression();
    });

    // Kampfbericht an einen anderen echten Spieler (vom Weltrechner): Kennungen neutral, er rechnet sie für sich um
    WELT.bericht = function (an, eintrag, hint) {
        if (!an || !botById[an] || !botById[an].mensch) return;
        const e = Object.assign({}, eintrag);
        if (!Number.isFinite(e.at)) e.at = Date.now();           // wann der Kampf war (der Weltrechner hat die Server-Uhr)
        for (const f of ['botId', 'defenderId', 'aWho', 'dWho']) if (e[f] !== undefined) e[f] = e[f] === null ? null : neutralId(e[f]);
        if (e.botName === undefined && e.botId) e.botName = (botById[lokalId(e.botId)] || {}).name;
        WELT.nachricht(parseInt(an.slice(1), 10), { art: 'bericht', eintrag: e, hint });
    };
    WELT.beiNachricht.push(function (e) {
        if (!e || e.art !== 'bericht' || !e.eintrag) return;
        const x = e.eintrag;
        for (const f of ['botId', 'defenderId', 'aWho', 'dWho']) if (x[f]) x[f] = lokalId(x[f]);
        if (x.defenderId === 'player') x.defenderId = null;
        addCombatLogEntry(x);
        if (e.hint) flashHint(e.hint, 5000);
        if (x.type === 'ausgespaeht') { sfx('warn'); return; }   // (kein Kampf: nur die Nachricht)
        if (x.type === 'field' && Math.abs(Date.now() - x.at) < 60000) feldKampfBild(x);   // Kampf am Feld: als Schlacht abspielen (nur frische)
        if (x.targetId !== undefined && islandById[x.targetId]) spawnBattleFx(x.targetId, x.type === 'attack' ? !!x.won : !x.won || !!x.capitalHolds, x.type === 'attack' ? (x.won ? 'Sieg' : 'Niederlage') : (x.won ? (x.capitalHolds ? 'Hauptstadt hält' : 'Basis verloren') : 'Verteidigt'), x.botName || x.defenderName || '');
        sfx(x.won === (x.type === 'attack') ? 'victory' : 'warn');
    });
    WELT.beiNachricht.push(function (e) { if (e && e.art === 'spaeh') spaehBericht(e); });   // Spähbericht vom Weltrechner (fremde Werte kennt nur er)
    WELT.beiNachricht.push(function (e) {             // Preis aus einem Event (Wochen-Event, Invasion, Drache): ins Abholfach, auch Kisten
        if (!e || e.art !== 'evPreis') return;
        const z = (v, max) => typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(max, Math.round(v)) : 0;
        const crate = Number.isInteger(e.crate) && e.crate >= 0 && e.crate <= 4 ? e.crate : -1, src = INBOX_SRC[e.src] ? e.src : 'woche', title = String(e.title || '').slice(0, 80);
        if (saisonTitel(e.titel)) saisonTitelGeben(e.titel);   // Saison-Platz (Ende einer Welt-Saison): der Saison-Rahmen, gleich angelegt (bis zum nächsten Saison-Ende)
        const k = typeof e.k === 'string' ? e.k.slice(0, 80) : undefined;   // (Stufe einer Event-Leiste: zeigt das Event-Fenster als „Abholen“)
        if (k && inboxList().some(x => x.k === k)) return;                     // (dieselbe Stufe nie zweimal im Fach)
        if (inboxAdd({ src, title, gems: z(e.gems, 5000), sh: z(e.sh, 100), crate, coins: z(e.coins, 1e12), tr: z(e.tr, 1e12), k }) || crate >= 0 || e.sh > 0 || e.tr > 0) { sfx('coin'); flashHint(title + ': dein Preis liegt unter Events → Belohnung.' + (saisonTitel(e.titel) && saisonRahmenFuer(saisonTitel(e.titel).platz) ? ' Neuer Rahmen: „' + saisonRahmenFuer(saisonTitel(e.titel).platz).name + '“ (bis zum nächsten Saison-Ende).' : ''), 6000); }
    });
    WELT.beiNachricht.push(function (e) {             // Nebel freischalten (vom Admin): die ganze Karte ist aufgedeckt
        if (!e || e.art !== 'nebel') return;
        revealAround(0, 0, FRAME_HALF * 1.5, false); flashHint('Der Nebel hat sich gelichtet – du siehst jetzt die ganze Karte.', 5000);
    });
    WELT.beiNachricht.push(function (e) {             // Geschenk (vom Admin): liegt im Abholfach, wird normal abgeholt
        if (!e || e.art !== 'geschenk') return;
        if (inboxAdd({ src: 'gift', title: 'Geschenk', gems: e.gems || 0, coins: e.coins || 0, sh: e.sh || 0, crate: Number.isInteger(e.crate) && e.crate >= 0 && e.crate <= 5 ? e.crate : -1, tr: e.tr || 0 })) flashHint('Ein Geschenk liegt für dich bereit – Events → Belohnung.', 4500);   // (Kiste nur 0–5: sonst bricht das Abholfach)
        else if (e.sh > 0 || e.crate >= 0 || e.tr > 0) flashHint('Ein Geschenk liegt für dich bereit – Events → Belohnung.', 4500);
    });
    // Willkommen: einmal den Namen wählen
    if (!window.__OW || !__OW.nameGewaehlt) afterSplash(() => setTimeout(willkommenFenster, 400));
    function willkommenFenster() {
        const v = document.createElement('div');
        v.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,20,36,.8);font-family:Georgia,serif';
        v.innerHTML = '<div style="max-width:380px;width:100%;background:#f6efe0;color:#2b2118;border:2px solid #c9a227;border-radius:14px;padding:22px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.6)">' +
            '<h2 style="margin:0 0 6px;color:#1d3b5c;font-size:24px">Willkommen!</h2><p style="margin:0 0 14px;font-size:16px">Willkommen auf den Inseln von Open Water. Wie willst du heißen?</p>' +
            '<input id="wkName" maxlength="20" style="width:100%;padding:11px;font-size:17px;background:#fff;color:#2b2118;border:1px solid #d8c9a6;border-radius:8px;box-sizing:border-box" placeholder="Dein Name">' +
            '<p class="wf" style="min-height:20px;margin:8px 0 0;color:#a33a2a;font-size:14px"></p>' +
            '<button type="button" style="margin-top:10px;width:100%;padding:12px;font-size:17px;font-family:inherit;border:0;border-radius:8px;cursor:pointer;background:linear-gradient(#c9a227,#a8831a);font-weight:bold">Los geht’s</button></div>';
        document.body.appendChild(v);
        const inp = v.querySelector('input'), msg = v.querySelector('.wf'), btn = v.querySelector('button');
        inp.value = (window.__OW && __OW.name) || store.get('openWaterPlayerName') || '';
        setTimeout(() => { inp.focus(); inp.select(); }, 50);
        const los = async () => {
            btn.disabled = true; msg.textContent = '';
            const r = await weltNameSetzen(inp.value);
            btn.disabled = false;
            if (!r.ok) { msg.textContent = r.grund; return; }
            v.remove(); flashHint('Willkommen, ' + r.name + '!', 3000);
        };
        btn.addEventListener('click', los);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') los(); });
    }
    WELT.beiNachricht.push(function (e) {             // Startschild (Platz mitten in fremdem Land)
        if (!e || e.art !== 'startschild' || !(e.bis > Date.now())) return;
        if (shieldUntil() < e.bis) { store.set('openWaterShield', String(e.bis)); shieldMemAt = 0; }
    });
    // Zuschauer: ein neuer Angriff auf eine deiner Basen → Warnung (wie beim Weltrechner)
    const gewarnt = new Set();
    const altLaden = window.__weltLaden;
    window.__weltLaden = function (keys) {
        altLaden(keys);
        if (!keys.includes('openWaterPendingAttacks')) return;
        if (gewarnt.size > 500) { const da = new Set(pendingAttacks.map(marchKeyOf)); for (const k of gewarnt) if (!da.has(k)) gewarnt.delete(k); }   // vorbei → vergessen
        for (const a of pendingAttacks) { const k = marchKeyOf(a); if (!a.attackerBotId || gewarnt.has(k)) continue; gewarnt.add(k);
            if (islandOwnerOf(a.targetId) === 'player') { sfx('warn'); flashHint((botById[a.attackerBotId] || {}).name + ' greift ' + islandTitle(islandById[a.targetId]) + ' an!', 4000); } }
    };

    if (store.get('openWaterNeulingBis') === null) {
        store.set('openWaterNeulingBis', String(Date.now() + NEULING_MS));
        afterSplash(() => setTimeout(() => flashHint('Anfängerschutz: 48 Stunden kann dich niemand angreifen und niemand ausspähen – bau dich in Ruhe auf. (Er endet früher, wenn du 100.000 Truppen hast oder einen echten Spieler angreifst.)', 9000), 4000));
    }
    // frisch beigetreten und nicht selbst Weltrechner: den Platz anmelden
    if (startplatzNeu && !WELT.leiter) WELT.befehl('beitreten', { insel: playerIslandId });
    // selbst Weltrechner und der Platz gehörte einem Mitspieler (Karte voll): übernehmen, mit Startschild
    if (startplatzNeu && WELT.leiter && startplatzAus && islandById[playerIslandId]) {
        clearIslandOwner(playerIslandId); ownedIslands.add(playerIslandId); islandLevels[playerIslandId] = 1; islandTroops[playerIslandId] = PLAYER_START_TROOPS;
        store.set('openWaterShield', String(Date.now() + 3600000)); shieldMemAt = 0; saveGame();
    }
    window.__weltRechnerStatus = rechnerStatus;
    WELT.start();
}
// Neue Welt-Daten (Puls) oder Münzen/Gems vom Weltrechner: offene Fenster gleich nachziehen (höchstens 1× pro Sekunde)
if (window.WELT && window.__weltLaden) {
    const vorLive = window.__weltLaden;
    window.__weltLaden = function (keys) { vorLive(keys); liveBald(); };
    WELT.beiNachricht.push(function (e) { if (e && (e.art === 'delta' || e.art === 'bericht' || e.art === 'geschenk')) liveBald(); });
}
