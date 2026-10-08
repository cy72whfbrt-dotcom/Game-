// Teil 10d1-welt-verbindung.js: Die eine Welt: Verbindung zu welt.js, Zuschauer übernehmen Welt-Teile, Späher anderer Spieler
// ===================================================================================================================
// ===== DIE EINE WELT: Verbindung zu welt.js =====
// ===================================================================================================================
// Läuft der Weltrechner auf dem Server gerade nicht (Neustart nach einem Hänger)? Dann wartet die Welt – das zeigen wir
// allen, statt dass Befehle scheinbar nichts tun. Kommt er zurück, geht es von selbst weiter. Erst nach 20 s ohne ihn: bei
// Last beim Hoster dauert ein Puls des Weltrechners 15–30 s – das ist kein Hänger.
let rechnerWeg = null, rechnerWegUhr = null;
const RECHNER_WEG_MS = 20000;
function rechnerStatus(laeuft) {   // (welt.js meldet jede Änderung von „rechner“)
    if (SYSTEM) return;
    if (laeuft) { clearTimeout(rechnerWegUhr); rechnerWegUhr = null; if (rechnerWeg) { rechnerWeg.remove(); rechnerWeg = null; } return; }
    if (rechnerWeg || rechnerWegUhr) return;
    rechnerWegUhr = setTimeout(function () {
        rechnerWegUhr = null;
        rechnerWeg = document.createElement('div');
        rechnerWeg.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,6,8,.72);font-family:Georgia,serif';
        rechnerWeg.innerHTML = '<div style="max-width:340px;background:#f6efe0;color:#2b2118;border:2px solid #c9a227;border-radius:14px;padding:20px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.6)">' +
            '<h2 style="margin:0 0 6px;color:#1d3b5c;font-size:21px">Verbindung wird wiederhergestellt …</h2><p style="margin:0;font-size:15px">Die Welt ist gleich wieder da. Es geht nichts verloren.</p></div>';
        document.body.appendChild(rechnerWeg);
    }, RECHNER_WEG_MS);
}
if (window.WELT) {
    const PJ = k => { try { return JSON.parse(store.get(k)); } catch (e) { return null; } };
    // (Zuschauer) neue Welt-Teile vom Server → in die laufenden Spiel-Variablen übernehmen
    window.__weltLaden = function (keys) {
        const k = new Set(keys);
        if (k.has('openWaterPlayerIslandId')) { const v = parseInt(store.get('openWaterPlayerIslandId'), 10); if (!Number.isNaN(v) && islandById[v]) { playerIslandId = v; capitalCache = null; } }
        if (k.has('openWaterOwnedIslands')) { const neu = new Set(PJ('openWaterOwnedIslands') || []); for (const id of [...ownedIslands]) if (!neu.has(id)) ownedIslands.delete(id); for (const id of neu) ownedIslands.add(id); }
        if (k.has('openWaterBotOwnedIslands')) {
            const r = PJ('openWaterBotOwnedIslands') || {};
            for (const bot of BOT_DEFS) { const set = botOwnedIslands[bot.id] || (botOwnedIslands[bot.id] = new BotBaseSet(bot.id)); const neu = new Set(r[bot.id] || []); for (const id of [...set]) if (!neu.has(id)) set.delete(id); }
            for (const bot of BOT_DEFS) for (const id of r[bot.id] || []) botOwnedIslands[bot.id].add(id);
        }
        if (k.has('openWaterIslandLevels')) { islandLevels = PJ('openWaterIslandLevels') || {}; for (const isl of islands) if (isl.neutralLevel > 1 && islandLevels[isl.id] === undefined) islandLevels[isl.id] = isl.neutralLevel; ausbauDrueber(); }
        if (k.has('openWaterIslandTroops')) islandTroops = PJ('openWaterIslandTroops') || {};
        if (k.has('openWaterNeutralTroopOverrides')) { neutralTroopOverrides = PJ('openWaterNeutralTroopOverrides') || {}; for (const isl of islands) if (!(isl.id in neutralTroopOverrides) && isl.nt0 !== undefined) isl.neutralTroops = isl.nt0;   // (neue Welt-Saison: wieder die erzeugte Besatzung)
            for (const id in neutralTroopOverrides) if (islandById[id]) islandById[id].neutralTroops = neutralTroopOverrides[id]; }
        if (k.has('openWaterInselOrt')) inselOrtLaden();   // (teleportierte Hauptstädte)
        if (k.has('openWaterTempleHoldSince')) templeHoldSince = PJ('openWaterTempleHoldSince') || {};
        if (k.has('openWaterGateCfg')) gateCfg = null;
        if (k.has('openWaterPendingAttacks')) pendingAttacks = PJ('openWaterPendingAttacks') || [];
        if (k.has('openWaterPendingSends')) pendingSends = PJ('openWaterPendingSends') || [];
        if (k.has('openWaterPendingRetreats')) pendingRetreats = PJ('openWaterPendingRetreats') || [];
        if (k.has('openWaterTitles')) { titleState = PJ('openWaterTitles'); titleVer++; ringMemo = null; }
        if (k.has('openWaterThrone')) throneState = PJ('openWaterThrone') || { pts: 0 };
        if (k.has('openWaterBounty')) bountyState = PJ('openWaterBounty') || { ruler: null, gems: 0, coins: 0 };
        if (k.has('openWaterWander') || k.has('openWaterWanderNext')) { wander = undefined; loadWander(); }
        if (k.has('openWaterFields')) fieldState = PJ('openWaterFields') || {};
        if (k.has('openWaterFieldMarches')) fieldMarches = PJ('openWaterFieldMarches') || [];
        if (k.has('openWaterBarb')) barbState = PJ('openWaterBarb') || { camps: [], n: 0, next: 0 };
        if (k.has('openWaterBarbMarches')) barbMarches = PJ('openWaterBarbMarches') || [];
        if (k.has('openWaterPendingAttacks') || k.has('openWaterPendingSends') || k.has('openWaterPendingRetreats') || k.has('openWaterBarbMarches') || k.has('openWaterFieldMarches')) { vorlaeufigDrueber(); schnellerDrueber(); }
        if (k.has('openWaterBarbWho')) barbWho = PJ('openWaterBarbWho') || {};
        if (k.has('openWaterDayBoss')) dayBoss = PJ('openWaterDayBoss');
        if (k.has('openWaterEvents')) evState = PJ('openWaterEvents') || {};
        if (k.has('openWaterSaison')) { saisonLaden(); saisonWeltZurueck(); }   // Welt-Saison: Termin, Countdown (ältere Saison: Sicherung zurückgespielt → neu laden)
        if (k.has('openWaterArmies')) { const a = PJ('openWaterArmies') || {}; armies = a.armies || []; armyJoins = a.joins || []; armyRaids = a.raids || []; }
        if (k.has('openWaterBotState')) { if (botSaveTimer) { clearTimeout(botSaveTimer); botSaveTimer = null; } botState = null; loadBotState(); }
        if (k.has('openWaterBotCoins')) { botCoins = PJ('openWaterBotCoins') || {}; for (const bot of BOT_DEFS) if (!botCoins[bot.id]) botCoins[bot.id] = 0; }
        ownVer++; capitalCache = null;
        try { refreshTerritory(); } catch (e) {}
        if (!isPanelOpen(battleLogPopup)) renderActiveMarches();
        updateHud(); requestRender();
        if (isPanelOpen(popup)) renderPopup();
    };
    // (Weltrechner) vor dem Puls: alles, was noch in einem Speicher-Timer wartet, jetzt in die Daten schreiben
    window.__weltVorPuls = function () {
        try { saveGameNow(); } catch (e) {}
        try { flushBotState(); } catch (e) {}
        try { saveProgressionNow(); } catch (e) {}
        try { saveThrone(); saveBounty(); } catch (e) {}
        try { if (titleState) store.set('openWaterTitles', JSON.stringify(titleState)); } catch (e) {}
        try { if (wander !== undefined) saveWander(); } catch (e) {}
        try { saveFields(); saveBarb(); saveArmies(); if (evDirty) saveEv(); } catch (e) {}
        try { wacheRunde(); } catch (e) { console.warn('Schummel-Schutz:', e); }   // (unten) Konten der Spieler + wartende Befehle
    };
    // Weltrechner geworden / nicht mehr
    window.__weltLeiterWechsel = function (an, neu, weltZeit) {
        if (an) {
            if (weltZeit && Date.now() - weltZeit > 60000) weltNachholen(weltZeit);   // niemand hat gerechnet: nachholen
            nextProductionTickAt = Date.now() + productionTickMs();
        } else WELT.version = 0;                       // die Welt beim nächsten Puls ganz neu holen (meine Rechnung zählt nicht mehr)
    };
    // ein neuer echter Spieler ist dazugekommen
    window.__weltNeuerMensch = function (id) {
        const bd = BOT_DEFS.find(b => b.id === id); if (!bd) return;
        botById[id] = bd;
        if (!botOwnedIslands[id]) botOwnedIslands[id] = new BotBaseSet(id);
        if (!botCoins[id]) botCoins[id] = 0;
        const bs = loadBotState(); bs[id] = WELT.profilZuBot(WELT.menschen[id] && WELT.menschen[id].profil, bs[id], id);   // (Weltrechner: gegen das Hauptbuch geklemmt – 3B)
        capitalCache = null; requestRender();
    };
    // (Weltrechner) Befehle der anderen Spieler ausführen
    const gehoert = (id, who) => islandOwnerOf(id) === who;
    function nichtLos(who, grp, src, was, grund) {   // ein Befehl ging nicht los: dem Spieler sagen, warum (Marsch-Plätze, sonst Weg/Maut/Schild)
        if (typeof bundMelden !== 'function') return;
        bundMelden(who, was + ' ist nicht losgegangen – ' + (grund ? grund + '. Deine Truppen bleiben, wo sie sind.' : AUF && !AUF.marschOk(who, grp, src) ? AUF.marschVoll(who) : 'kein Weg frei (Tor zu, Maut zu teuer, Friedensschild oder zu wenig Truppen). Deine Truppen bleiben, wo sie sind.'));
    }
    const marschVon = (who, key) => pendingAttacks.find(x => x.attackerBotId === who && marchKeyOf(x) === key) || pendingSends.find(x => x.senderBotId === who && marchKeyOf(x) === key) || feldBarbMarsch(who, key);
    // Sein Späher (Kennung vom Handy) wie ein Marsch: hb.sb [Ziel, an, Kennung, los] (Bericht), hb.sp [Heim, x, y, los, an, Weg, Kennung] (Erkundung).
    // setz(): die neue Zeit zurückschreiben (Schneller), weg(): umkehren – er bringt keinen Bericht und deckt nichts mehr auf (Zurück)
    function spaeherVon(who, key) {
        const hb = hbDa(who); if (!hb) return null;
        const sb = (hb.sb || []).find(x => x[2] === key), l = sb ? 'sb' : 'sp', e = sb || (hb.sp || []).find(x => x[6] === key); if (!e) return null;
        const an = sb ? 1 : 4;
        return { startedAt: nn(e[3]) || Date.now(), resolveAt: e[an],
            setz() { e[an] = Math.round(this.resolveAt); e[3] = Math.round(this.startedAt); saveBotState(); },
            weg() { hb[l] = hb[l].filter(x => x !== e); saveBotState(); } };
    }
