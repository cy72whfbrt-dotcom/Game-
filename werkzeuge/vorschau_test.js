// ===== TEST-MODUS – NUR für die Vorschau-Datei (werkzeuge/vorschau_bauen.php … test), NIE im echten Spiel =====
// Kein Nebel, alle Basen gespäht; du und alle Mitspieler habt fast unbegrenzt Münzen, Gems, Rohstoffe, Splitter und
// Truppen (wird alle 10 s wieder aufgefüllt) – damit man alles Neue gleich ausprobieren kann.
// Events zum Ansehen: der Drache ist gleich da (3 Std.), die Barbaren-Invasion beginnt 1 Minute nach dem Laden (1 Std.).
EV_TEST = { dr: Date.now() + 5000, inv: Date.now() + 60000 };
(function () {
    'use strict';
    const VIEL = 1e13, ROH = ['h', 's', 'e'];
    function auffuellen() {
        try {
            coins = Math.max(coins, VIEL); gems = Math.max(gems, 1e7);
            if (typeof AUF !== 'undefined' && AUF) { const r = AUF.rohVon('player'); if (r) { for (const k of ROH) r[k] = Math.max(r[k] || 0, VIEL); AUF.rohSpeichern(); } }
            for (const id of ownedIslands) islandTroops[id] = Math.max(islandTroops[id] || 0, 1e11);
            const hs = loadHeroes(); for (const id in hs) if (hs[id]) hs[id].sh = Math.max(hs[id].sh || 0, 5000); saveHeroes();
            const bs = loadBotState();
            for (const b of BOT_DEFS) {
                botCoins[b.id] = Math.max(botCoins[b.id] || 0, VIEL);
                const s = bs[b.id]; if (!s) continue;
                s.gems = Math.max(s.gems || 0, 1e7);
                if (s.hs) for (const id in s.hs) if (s.hs[id]) s.hs[id].sh = Math.max(s.hs[id].sh || 0, 5000);
                if (typeof AUF !== 'undefined' && AUF) { const r = AUF.rohVon(b.id); if (r) for (const k of ROH) r[k] = Math.max(r[k] || 0, VIEL); }
                const cap = botCapitalOf(b.id); if (cap !== null && cap !== undefined) islandTroops[cap] = Math.max(islandTroops[cap] || 0, 1e11);
            }
            saveBotState(); saveGame(); saveProgression(); updateHud();
        } catch (e) { console.warn('Test-Modus:', e); }
    }
    function botNahHolen() {                                       // (Test-Welt mit EINEM Mitspieler) er wohnt in deiner Gegend, damit du ihn ohne Tore erreichst
        try {
            if (!window.TEST_EIN_BOT || BOT_DEFS.length !== 1) return;
            const id = BOT_DEFS[0].id, cap = botCapitalOf(id), mein = islandById[playerIslandId]; if (!mein) return;
            if (cap !== null && islandById[cap] && canReach(mein.landmassId, islandById[cap].landmassId, 'player')) return;
            const frei = islands.filter(i => i.type === 'tower' && !islandOwnerOf(i.id) && i.id !== playerIslandId && canReach(mein.landmassId, i.landmassId, 'player'))
                .sort((a, b) => Math.abs(Math.hypot(a.x - mein.x, a.y - mein.y) - 2500) - Math.abs(Math.hypot(b.x - mein.x, b.y - mein.y) - 2500))[0];
            if (!frei) return;
            for (const x of [...botOwnedIslands[id]]) botOwnedIslands[id].delete(x);
            botOwnedIslands[id].add(frei.id); loadBotState()[id].capital = frei.id; islandTroops[frei.id] = 1e11;
            saveBotState(); saveGame(); saveProgression(); requestRender();
        } catch (e) { console.warn('Test-Modus:', e); }
    }
    function nebelWeg() {
        try { revealAround(0, 0, FRAME_HALF * 1.5, false); for (const i of islands) scoutedIslands.add(i.id); saveProgression(); requestRender(); } catch (e) { console.warn('Test-Modus:', e); }
    }
    window.addEventListener('load', () => setTimeout(() => {
        botNahHolen(); nebelWeg(); auffuellen(); setInterval(auffuellen, 10000);
        flashHint('TEST-MODUS: nur EIN Mitspieler (' + BOT_DEFS.map(b => b.name).join(', ') + ') in deiner Nähe, kein Nebel – du und er habt fast unbegrenzt Münzen, Gems, Rohstoffe, Splitter und Truppen.', 8000);
    }, 4000));
})();
