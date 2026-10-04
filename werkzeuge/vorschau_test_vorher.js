// ===== TEST-MODUS, Teil 1 – NUR für die Vorschau (werkzeuge/vorschau_bauen.php … test), läuft VOR bots.js =====
// Eine eigene, frische Testwelt für jede neue Vorschau-Version (alte Spielstände im Browser passen nicht zu neuen Regeln) und
// nur EIN Mitspieler auf der ganzen Karte – damit man in Ruhe mit den Werten probieren kann (Alexander 4.10.).
window.TEST_EIN_BOT = true;
(function () {
    var V = 'TESTWELT_VERSION';
    try {
        if (localStorage.getItem('owTestWelt') !== V) {
            Object.keys(localStorage).forEach(function (k) { if (k.indexOf('openWater') === 0) localStorage.removeItem(k); });
            localStorage.setItem('owTestWelt', V);
        }
    } catch (e) {}
})();
