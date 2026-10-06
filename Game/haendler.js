// ===== haendler.js – Wandernde Händler (Paket C) =====
// Ab und zu (alle 2–4 Std. für 30–60 Min.) steht irgendwo auf der Karte ein Händler-Karren. Ort, Zeit und Angebot bestimmt
// NUR der Weltrechner (Welt-Schlüssel openWaterHaendler). Antippen öffnet sein Angebot: 3–4 Waren aus HD_WAREN, bezahlt
// mit Münzen (nie Gems, keine Gold-Kisten – die Wirtschaft bleibt langsam). Jede Ware 1× pro Spieler und Besuch.
// Kauf = Befehl „haendler“ an den Weltrechner: er prüft Ware, Besuch, Preis und die Münzen (Schummel-Schutz WELT.wache wie
// beim Bündnis-Gründen), zieht die Münzen ab (kommt als „−Münzen“ beim Spieler an) und legt die Ware ins Abholfach
// (Nachricht „haendlerWare“). Der Sammel-Beschleuniger wirkt sofort in der Welt (hdState.boost). Mitspieler kaufen auch,
// nach denselben Regeln und Preisen.
// Welt-Schlüssel: { n: nächster Besuch, h: { id, name, x, y, lm, start, end, waren: ['sh', …] } | null,
//                   kauf: { wer: ['sh', …] } (dieser Besuch), boost: { wer: bis }, log: [{ w, k, at }] }
// Geladen nach spiel.js und buendnis.js (auch beim Weltrechner: wachhund.php / start.js erlauben die Datei).

var HD_TEST = null;   // NUR für Tests in einer lokalen Kopie: Zeitpunkt, an dem der nächste Händler erscheint – im echten Spiel immer null
const HD = {
    PAUSE_MIN: 2 * 3600000, PAUSE_MAX: 4 * 3600000,          // zwischen zwei Besuchen
    DAUER_MIN: 30 * 60000, DAUER_MAX: 60 * 60000,            // so lange bleibt er
    ERSTER_MIN: 15 * 60000, ERSTER_MAX: 45 * 60000,          // in einer ganz neuen Welt
    BOOST_MS: 2 * 3600000, BOOST: 1.3,                       // Sammel-Beschleuniger: 2 Std. 30 % schneller sammeln
    BOT_CHANCE: .03,                                         // je 5 s: so wahrscheinlich kauft ein Mitspieler (≈ 15 pro Besuch)
    PREIS_SPIELRAUM: 1.25,                                   // so viel teurer als angezeigt darf es beim Weltrechner sein
    PREIS_STUNDE_MAX: 2e6                                    // Preise wachsen mit der Stunden-Produktion, aber höchstens bis zu dieser
};
const HD_NAMEN = ['Ottokar der Krämer', 'Mira mit dem Karren', 'Bertram aus dem Süden', 'Liesel die Händlerin', 'Hakon der Fernreisende', 'Zora vom Markt', 'Anselm der Tuchhändler', 'Greta mit dem Esel'];
// Preis = Faktor × Stunden-Produktion an Münzen (mindestens min, Stunde zählt höchstens 2 Mio.) – für Anfänger und Große „maßvoll“.
// Wirtschaft 5.10.: Preise sind Kosten – × WIRTSCHAFT_KOSTEN wie vorher; die Stunden-Produktion ist × WIRTSCHAFT_ERTRAG, zählt also
// × Kosten ÷ Ertrag (= doppelt), min und die Grenze × WIRTSCHAFT_KOSTEN – als Münzen wirtM (6.10.: × MUENZ_FAKTOR)
const HD_WAREN = {
    sh:      { name: '3 Helden-Splitter', text: 'Für einen zufälligen Helden.', ic: 'star', f: 2, min: 20000 },
    kiste:   { name: 'Blaue Ausrüstungskiste', text: 'Ein Ausrüstungsteil, genau Selten (blau).', ic: 'shop', f: 3, min: 30000 },
    sammeln: { name: 'Sammel-Beschleuniger', text: '2 Std. lang sammeln alle deine Sammler 30 % schneller (wirkt sofort).', ic: 'hourglass', f: 1, min: 10000 },
    schild:  { name: 'Friedensschild 2 Std.', text: 'Kommt in deinen Schild-Vorrat (Shop → Schilde).', ic: 'shield', f: 2, min: 20000 },
    truppen: { name: 'Söldner', text: 'So viele Truppen, wie dein Reich in einer Stunde ausbildet.', ic: 'troops', f: 1.5, min: 15000 }
};
var hdState = (() => { try { return JSON.parse(store.get('openWaterHaendler')) || null; } catch (e) { return null; } })() || {};
function hdSpeichern() { if (rechnet()) store.set('openWaterHaendler', JSON.stringify(hdState)); requestRender(); }
function hdDa(now) { const h = hdState.h; return h && h.start <= (now || Date.now()) && h.end > (now || Date.now()) ? h : null; }
function hdPreis(who, k) { const w = HD_WAREN[k]; if (!w) return Infinity; let c = 0; try { c = (hourProduction(who).coins || 0) * WIRTSCHAFT_KOSTEN / WIRTSCHAFT_ERTRAG; } catch (e) {}
    return niceRoundW(Math.max(wirtM(w.min), w.f * Math.min(c, wirtM(HD.PREIS_STUNDE_MAX)))); }
function hdGekauft(who, k) { const l = (hdState.kauf || {})[who]; return !!l && l.includes(k); }
function hdSammeln(who) { const b = hdState.boost && hdState.boost[who]; return b && b > Date.now() ? HD.BOOST : 1; }   // (fieldTick in spiel.js)
const hdWerName = w => w === 'player' ? 'Du' : (botById[w] || {}).name || 'Jemand';

// ---- Weltrechner: kommen, gehen, Mitspieler kaufen ----
function hdOrt() {                                    // ein freier Platz in einer bewohnten Region (nicht Mitte/Wächter)
    const besetzt = []; for (const b of BOT_DEFS) for (const id of botOwnedIslands[b.id] || []) besetzt.push(id);
    for (let v = 0; v < 30; v++) {
        const isl = besetzt.length ? islandById[besetzt[Math.floor(Math.random() * besetzt.length)]] : islands[Math.floor(Math.random() * islands.length)];
        const lm = isl && landmasses[isl.landmassId]; if (!lm || lm.tier !== 'outer') continue;
        const p = dekoPlaetze(lm, 1, Math.floor(Math.random() * 1e6), 1500)[0];
        if (p && !(typeof resFields !== 'undefined' && resFields.some(f => Math.hypot(f.x - p[0], f.y - p[1]) < 2500))) return { x: Math.round(p[0]), y: Math.round(p[1]), lm: lm.id };
    }
    return null;
}
function hdTakt() {
    if (!rechnet()) return;
    const now = Date.now(); let ch = false;
    if (!hdState.n) { hdState.n = now + HD.ERSTER_MIN + Math.random() * (HD.ERSTER_MAX - HD.ERSTER_MIN); ch = true; }
    if (HD_TEST && !hdState.h && hdState.n > HD_TEST) { hdState.n = HD_TEST; ch = true; }
    const h = hdState.h;
    if (h && now >= h.end) { hdState.h = null; hdState.kauf = {}; hdState.n = now + HD.PAUSE_MIN + Math.random() * (HD.PAUSE_MAX - HD.PAUSE_MIN); ch = true; }
    else if (!h && now >= hdState.n) {
        const o = hdOrt();
        if (!o) hdState.n = now + 10 * 60000;                                    // (kein Platz gefunden: später nochmal)
        else { const alle = Object.keys(HD_WAREN).sort(() => Math.random() - .5), n = Math.random() < .5 ? 3 : 4;
            hdState.h = { id: 'h' + now.toString(36), name: HD_NAMEN[Math.floor(Math.random() * HD_NAMEN.length)], x: o.x, y: o.y, lm: o.lm, start: now,
                end: now + HD.DAUER_MIN + Math.random() * (HD.DAUER_MAX - HD.DAUER_MIN), waren: alle.slice(0, n) };
            hdState.kauf = {}; }
        ch = true;
    }
    for (const w in hdState.boost || {}) if (!(hdState.boost[w] > now)) { delete hdState.boost[w]; ch = true; }
    const da = hdDa(now);
    if (da && Math.random() < HD.BOT_CHANCE) {                                  // ein Mitspieler kauft (gleiche Regeln, gleiche Preise)
        const k = da.waren[Math.floor(Math.random() * da.waren.length)];
        const kand = BOT_DEFS.filter(b => !b.mensch && (botOwnedIslands[b.id] || []).size > 0 && !hdGekauft(b.id, k) && (botCoins[b.id] || 0) >= hdPreis(b.id, k) * 1.2);   // (wer es sich leisten kann – mit Reserve)
        const b = kand[Math.floor(Math.random() * kand.length)];
        if (b && !hdKaufen(b.id, k)) ch = true;
    }
    if (ch) hdSpeichern();
}
// Söldner: eine Stunde Truppen-Ausbildung, mindestens 1.000 × WIRTSCHAFT_KOSTEN (5.10.: wie alle Truppen außerhalb der Produktion)
const hdSoeldner = who => Math.round(Math.max(Math.max(1, Math.round(1000 * WIRTSCHAFT_KOSTEN)), hourProduction(who).troops));
function hdKaufen(who, k) {                           // (Weltrechner) bezahlen + Ware geben → '' oder der Grund
    const h = hdDa(); if (!h) return 'Der Händler ist schon weitergezogen';
    if (!h.waren.includes(k)) return 'Diese Ware hat der Händler nicht';
    if (hdGekauft(who, k)) return 'Diese Ware hast du schon gekauft';
    const preis = hdPreis(who, k), bd = botById[who];
    if ((botCoins[who] || 0) < preis) return 'Zu wenig Münzen (' + fmtNum(preis) + ')';
    if (bd && bd.mensch && WELT.wache && !WELT.wache.kann(who, preis)) return 'Zu wenig Münzen (' + fmtNum(preis) + ')';
    botCoins[who] -= preis;                                                      // (echte Spieler: geht als Nachricht „−Münzen“ an ihr Handy)
    (hdState.kauf || (hdState.kauf = {}))[who] = (hdState.kauf[who] || []).concat(k);
    hdState.log = [{ w: who, k, at: Date.now() }].concat(hdState.log || []).slice(0, 12);
    const w = HD_WAREN[k], titel = 'Händler: ' + w.name;
    if (k === 'sammeln') { (hdState.boost || (hdState.boost = {}))[who] = Math.max(Date.now(), hdState.boost[who] || 0) + HD.BOOST_MS; }
    if (bd && bd.mensch && window.WELT) {
        const tr = k === 'truppen' ? hdSoeldner(who) : 0;
        if (tr && WELT.wache) WELT.wache.gutschrift(who, 0, tr);                // (damit der Schummel-Schutz das Abholen durchlässt)
        WELT.nachricht(parseInt(who.slice(1), 10), { art: 'haendlerWare', title: titel, sh: k === 'sh' ? 3 : 0, kiste: k === 'kiste' ? 2 : -1, tr, schild: k === 'schild' ? 2 : 0,
            text: k === 'sammeln' ? 'Sammel-Beschleuniger gekauft – 2 Std. sammelst du 30 % schneller.' : 'Gekauft: ' + w.name + ' – liegt unter Events → Belohnung.' });
    } else if (bd) {                                                             // Mitspieler: direkt
        const bs = loadBotState()[who];
        if (k === 'sh') heroGrantShards(who, 3);
        if (k === 'kiste' && bs && bs.spare) { const sp = bs.spare[pickRandomSlot()]; if (sp) sp[2] = (sp[2] || 0) + 1; }
        if (k === 'schild' && bs) { bs.shields = bs.shields || {}; bs.shields[2] = (bs.shields[2] || 0) + 1; }
        if (k === 'truppen') { const cap = botCapitalOf(who); if (cap != null) islandTroops[cap] = (islandTroops[cap] || 0) + hdSoeldner(who); }
        saveBotState();
    }
    saveGame(); return '';
}
setInterval(() => { try { hdTakt(); } catch (e) { console.warn('Händler:', e); } }, 5000);

// ---- Befehl „haendler“ (Weltrechner prüft alles) ----
if (window.WELT) {
    WELT.BEFEHLE.haendler = function (who, b) {
        if (WELT.wache && WELT.wache.zuOft(who, 'haendler', 12, 60000)) { WELT.wache.warnen(who, 'flut', 'Über 12 Händler-Käufe in einer Minute – der Rest verfällt.'); return; }
        hdBefehl(who, b, 0);
    };
    // (Münzen eben erst bekommen? Sein Profil kommt alle 10 s – dann bis zu 4-mal 5 s später nochmal versuchen, wie beim Ausbau)
    function hdBefehl(who, b, versuch) {
        const k = b && typeof b.ware === 'string' && Object.prototype.hasOwnProperty.call(HD_WAREN, b.ware) ? b.ware : null;
        const sag = text => WELT.nachricht(parseInt(who.slice(1), 10), { art: 'haendlerWare', title: 'Händler', sh: 0, kiste: -1, tr: 0, schild: 0, text });
        if (!k || typeof b.id !== 'string') { if (WELT.wache) WELT.wache.warnen(who, 'kaputt', 'Händler-Kauf mit kaputten Angaben – abgelehnt.'); return; }
        const h = hdDa(); if (!h || h.id !== b.id) return sag('Der Händler ist schon weitergezogen.');
        const preis = hdPreis(who, k);
        if (typeof b.preis === 'number' && Number.isFinite(b.preis) && preis > b.preis * HD.PREIS_SPIELRAUM) return sag('Der Preis hat sich geändert (jetzt ' + fmtNum(preis) + ' Münzen) – nichts gekauft.');
        const why = hdKaufen(who, k);
        if (why && why.startsWith('Zu wenig') && versuch < 4) { setTimeout(() => { try { hdBefehl(who, b, versuch + 1); } catch (e) { console.warn('Händler:', e); } }, 5000); return; }
        if (why) sag(why + ' – nichts gekauft.'); else hdSpeichern();
    }
    // (Spieler) die Ware kommt ins Abholfach
    WELT.beiNachricht.push(function (e) {
        if (!e || e.art !== 'haendlerWare') return;
        const z = (v, max) => typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(max, Math.round(v)) : 0;
        const kiste = e.kiste === 0 || e.kiste === 1 || e.kiste === 2 ? e.kiste : -1, schild = e.schild === 2 ? 2 : 0;
        if (z(e.sh, 10) || kiste >= 0 || z(e.tr, 1e13) || schild) inboxAdd({ src: 'haendler', title: String(e.title || 'Händler').slice(0, 80), sh: z(e.sh, 10), kiste, tr: z(e.tr, 1e13), schild });
        hdWarte.clear(); if (typeof e.text === 'string') flashHint(e.text.slice(0, 200), 4500);
        if (hdOffen()) hdRender();
    });
    const vorher = window.__weltLaden;
    window.__weltLaden = function (keys) {
        if (vorher) vorher(keys);
        if (!keys.includes('openWaterHaendler')) return;
        const alt = hdState.h && hdState.h.id;
        try { hdState = JSON.parse(store.get('openWaterHaendler')) || {}; } catch (e) { hdState = {}; }
        if (hdState.h && hdState.h.id !== alt && hdDa() && !SYSTEM) afterSplash(() => flashHint('Ein Händler ist da: ' + hdState.h.name + ' – nur kurz! (Shop → Händler)', 5000));
        if (hdOffen()) hdRender();
        requestRender();
    };
}

// ---- Karte: der Karren (auch im Nebel sichtbar), antippen öffnet das Angebot ----
function hdBild(h, z) { return { x: toSX(h.x), y: toSY(h.y), s: Math.max(20, Math.min(110, 1500 * z)) }; }
function drawHaendler() {
    const h = hdDa(); if (!h || SYSTEM) return;
    const z = mapState.zoom, { x, y, s } = hdBild(h, z);
    if (x < -s * 2 || x > viewW + s * 2 || y < -s * 2 || y > viewH + s * 2) return;
    setScreen(ctx); ctx.save(); ctx.translate(x, y); const u = s / 40;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 12 * u, 24 * u, 6 * u, 0, 0, Math.PI * 2); ctx.fill();          // Schatten
    ctx.strokeStyle = 'rgba(242,199,92,.85)'; ctx.lineWidth = Math.max(1.5, 1.6 * u); ctx.setLineDash([4 * u, 3 * u]);                // goldener Kreis: hier ist er
    ctx.beginPath(); ctx.ellipse(0, 8 * u, 30 * u, 11 * u, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#5b3a1e'; ctx.fillRect(-20 * u, -2 * u, 34 * u, 10 * u);                                                       // Wagenkasten
    ctx.fillStyle = '#7a5130'; ctx.fillRect(-20 * u, -2 * u, 34 * u, 3 * u);
    ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 1.2 * u; ctx.beginPath(); ctx.moveTo(14 * u, 5 * u); ctx.lineTo(26 * u, 8 * u); ctx.stroke();   // Deichsel
    const plane = (c1, c2) => { ctx.beginPath(); ctx.moveTo(-21 * u, -2 * u); ctx.bezierCurveTo(-21 * u, -24 * u, 15 * u, -24 * u, 15 * u, -2 * u); ctx.closePath();
        const g = ctx.createLinearGradient(-20 * u, 0, 15 * u, 0); for (let i = 0; i < 6; i++) { g.addColorStop(i / 6, i % 2 ? c2 : c1); g.addColorStop((i + 1) / 6 - .001, i % 2 ? c2 : c1); } ctx.fillStyle = g; ctx.fill(); };
    plane('#c8423a', '#efe2c4');                                                                                                     // gestreifte Plane
    ctx.strokeStyle = 'rgba(40,20,10,.7)'; ctx.lineWidth = 1 * u; ctx.stroke();
    for (const wx of [-13, 7]) { ctx.fillStyle = '#2b1a0d'; ctx.beginPath(); ctx.arc(wx * u, 9 * u, 5.2 * u, 0, Math.PI * 2); ctx.fill();   // Räder
        ctx.strokeStyle = '#b08a5a'; ctx.lineWidth = 1.1 * u; ctx.beginPath(); ctx.arc(wx * u, 9 * u, 3.8 * u, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx * u - 3.8 * u, 9 * u); ctx.lineTo(wx * u + 3.8 * u, 9 * u); ctx.moveTo(wx * u, 5.2 * u); ctx.lineTo(wx * u, 12.8 * u); ctx.stroke(); }
    ctx.fillStyle = '#f2c75c'; ctx.beginPath(); ctx.arc(-2 * u, -14 * u, 4 * u, 0, Math.PI * 2); ctx.fill();                          // Münze auf der Plane
    ctx.fillStyle = '#8a5a12'; ctx.font = 'bold ' + Math.round(5 * u) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('¤', -2 * u, -13.6 * u);
    const L = typeof tagLicht === 'function' ? tagLicht() : null;                                                                    // nachts brennt die Laterne
    if (L && L.licht > .03) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.licht; const f = 10 * u; ctx.drawImage(tnGlow('fackel'), 18 * u - f, -6 * u - f, f * 2, f * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    if (s >= 30) { const t = 'Händler'; ctx.font = '600 ' + Math.max(10, Math.round(5.5 * u)) + 'px system-ui, sans-serif'; const tw = ctx.measureText(t).width + 12;   // Schild darunter
        ctx.fillStyle = 'rgba(16,12,6,.82)'; ctx.fillRect(-tw / 2, 17 * u, tw, Math.max(14, 8 * u)); ctx.fillStyle = '#f2dca4'; ctx.fillText(t, 0, 17 * u + Math.max(7, 4 * u)); }
    ctx.restore();
}
function haendlerAt(sx, sy) { const h = hdDa(); if (!h) return null; const { x, y, s } = hdBild(h, mapState.zoom); return Math.hypot(sx - x, sy - (y - s * .1)) < Math.max(24, s * .75) ? h : null; }

// ---- Shop → Händler (der Reiter erscheint nur, solange ein Händler da ist) ----
const hdBody = document.getElementById('hdLive'), hdWarte = new Map();   // hdWarte: eben gekauft (Ware → Zeit), bis die Welt es bestätigt
function hdOffen() { return !!hdBody && typeof shopPopup !== 'undefined' && isPanelOpen(shopPopup) && shopTab === 'hd'; }
function haendlerOeffnen() { if (!hdBody || SYSTEM) return; openShop('hd'); }
function hdRender() {
    if (!hdOffen()) return;
    const h = hdDa(), now = Date.now();
    setText(document.getElementById('hdTitle'), h ? h.name : 'Wandernder Händler');
    setText(document.getElementById('hdSub'), h ? 'zieht weiter in ' + fmtDHMS((h.end - now) / 1000) : '');
    if (!h) { liveHtml(hdBody, '<div class="inbox-empty">Der Händler ist weitergezogen. Er kommt alle paar Stunden wieder – mal hier, mal dort auf der Karte.</div>'); return; }
    for (const [k, t] of hdWarte) if (now - t > 35000 || hdGekauft('player', k)) hdWarte.delete(k);
    const rows = h.waren.map(k => { const w = HD_WAREN[k], p = hdPreis('player', k), hat = hdGekauft('player', k), wart = hdWarte.has(k);
        const knopf = hat ? '<span class="hd-ok">' + icon('check') + 'Gekauft</span>' : wart ? '<span class="hd-ok">…</span>'
            : '<button class="btn btn--primary btn--sm" type="button" data-hd-kauf="' + k + '"' + (coins < p ? ' disabled' : '') + '><span>' + icon('coin') + fmtCompact(p) + '</span></button>';
        return '<div class="inbox-row is-gold">' + icon(w.ic) + '<div><b>' + w.name + '</b><small>' + w.text + '</small></div>' + knopf + '</div>'; }).join('');
    const bo = hdState.boost && hdState.boost.player > now ? '<p class="hd-info">' + icon('hourglass') + 'Sammel-Beschleuniger aktiv: noch ' + fmtDHMS((hdState.boost.player - now) / 1000) + '</p>' : '';
    const log = (hdState.log || []).filter(x => x.at >= h.start).slice(0, 5).map(x => '<li>' + escapeHtml(hdWerName(x.w)) + ' · ' + (HD_WAREN[x.k] || {}).name + '</li>').join('');
    liveHtml(hdBody, '<p class="hd-info">Jede Ware gibt es für dich einmal. Bezahlt wird mit Münzen, die Ware liegt danach unter Events → Belohnung.</p>' +
        '<div class="inbox">' + rows + '</div>' + bo + (log ? '<div class="sect"><h4>Zuletzt gekauft</h4></div><ul class="hd-log">' + log + '</ul>' : '') +
        '<button class="btn btn--secondary btn--sm" type="button" data-hd-hin><span>Zum Karren</span></button>');
}
if (hdBody) {
    hdBody.addEventListener('click', e => {
        const kb = e.target.closest('[data-hd-kauf]'), hin = e.target.closest('[data-hd-hin]');
        if (hin) { const h = hdDa(); closePanel(shopPopup); if (h) flyTo(h.x, h.y, { zoom: Math.max(mapState.zoom, .02) }); return; }
        if (!kb || kb.disabled) return;
        const k = kb.dataset.hdKauf, h = hdDa(); if (!h || !HD_WAREN[k] || hdGekauft('player', k)) return;
        const p = hdPreis('player', k); if (coins < p) { flashHint('Zu wenig Münzen – ' + HD_WAREN[k].name + ' kostet ' + fmtNum(p) + '.', 3000); return; }
        if (alsBefehl('haendler', { ware: k, id: h.id, preis: p })) { hdWarte.set(k, Date.now()); sfx('coin'); flashHint('Kauf geschickt: ' + HD_WAREN[k].name + ' …', 2500); hdRender(); }   // (der Weltrechner verkauft)
    });
}
// Hinweis unter dem HUD (renderMidBar in spiel.js holt ihn, wenn nichts Dringenderes ansteht): „Händler da · 41 m 12 s“ – antippen öffnet Shop → Händler
function haendlerChip(now) { const h = hdDa(now); return h && !SYSTEM ? '<button type="button" class="mb-chip is-hd" data-hd-chip>' + icon('coin') + '<span>Händler da</span><i data-ev-bis="' + Math.round(h.end) + '"></i></button>' : ''; }
{ const mb = document.getElementById('midBar'); if (mb) mb.addEventListener('click', e => { if (!e.target.closest('[data-hd-chip]')) return; const h = hdDa(); if (!h) return;
    haendlerOeffnen(); }); }
