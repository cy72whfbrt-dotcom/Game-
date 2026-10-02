// ===== weltrechner/push.js – Handy-Benachrichtigungen (Web-Push) vom Weltrechner =====
// Der Weltrechner weiß als Einziger, wann ein echter Spieler (u<id>) angegriffen wird. Ist der Spieler gerade NICHT im
// Spiel, schickt er ihm eine Benachrichtigung aufs Handy („Deine Basis X wird angegriffen“, „Basis X verloren“,
// „Späher von Y unterwegs“) – auch wenn die App zu ist.
//
// Ganz ohne npm-Pakete, nur mit dem, was Node 22 mitbringt (crypto, fetch):
//   - Verschlüsseln der Nachricht nach RFC 8291 („aes128gcm“: ECDH P-256, HKDF-SHA-256, AES-128-GCM)
//   - Ausweis des Absenders nach RFC 8292 („VAPID“: ein JWT, unterschrieben mit ES256)
// Die Abos (Geräte der Spieler) und die VAPID-Schlüssel gibt server.php nur dem Weltrechner (Aktion push_abos, nur mit
// dem Weltrechner-Schlüssel). Der private Schlüssel steht nur in config.php auf dem Server – nie im Git.
// Nicht nerven: höchstens 1 Benachrichtigung pro Minute und Spieler, gleiche Meldungen werden zusammengefasst, und nur,
// wenn der Spieler gerade nicht online ist (im Spiel sieht er es ja selbst).
'use strict';
const crypto = require('crypto');

const b64 = buf => Buffer.from(buf).toString('base64url');
const unb64 = s => Buffer.from(String(s || ''), 'base64url');

// ===================================================================================================
// 1) Verschlüsseln (RFC 8291). test: { asPrivate, salt } nur für den Prüf-Test mit dem Beispiel aus dem RFC
// ===================================================================================================
function verschluesseln(klartext, p256dh, auth, test) {
    const uaPublic = unb64(p256dh), authSecret = unb64(auth);
    if (uaPublic.length !== 65 || uaPublic[0] !== 4 || authSecret.length !== 16) throw new Error('Abo-Schlüssel kaputt');
    const ecdh = crypto.createECDH('prime256v1');
    if (test && test.asPrivate) ecdh.setPrivateKey(unb64(test.asPrivate)); else ecdh.generateKeys();   // jedes Mal ein neues Einmal-Schlüsselpaar
    const asPublic = ecdh.getPublicKey();
    const ecdhSecret = ecdh.computeSecret(uaPublic);
    const salt = test && test.salt ? unb64(test.salt) : crypto.randomBytes(16);
    // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info" 0x00 ua_public as_public, 32)
    const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
    const ikm = Buffer.from(crypto.hkdfSync('sha256', ecdhSecret, authSecret, keyInfo, 32));
    const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
    const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
    // ein einziger Datensatz: Klartext + 0x02 (= letzter Datensatz, keine Polsterung)
    const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
    const geheim = Buffer.concat([c.update(Buffer.concat([Buffer.from(klartext), Buffer.from([2])])), c.final(), c.getAuthTag()]);
    // Kopf: salt (16) | Datensatzgröße (4, hier 4096) | Länge der Schlüssel-Kennung (1) | as_public (65)
    const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
    return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, geheim]);
}

// ===================================================================================================
// 2) VAPID (RFC 8292): JWT { aud: Herkunft des Push-Dienstes, exp, sub } mit ES256
// ===================================================================================================
function privaterSchluessel(pub, priv) {
    const p = unb64(pub), d = unb64(priv);
    if (p.length !== 65 || p[0] !== 4 || d.length < 30 || d.length > 32) throw new Error('VAPID-Schlüssel kaputt');
    const d32 = Buffer.concat([Buffer.alloc(32 - d.length), d]);
    return crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', x: b64(p.subarray(1, 33)), y: b64(p.subarray(33, 65)), d: b64(d32) }, format: 'jwk' });
}
function vapidJwt(aud, sub, schluessel, jetztSek) {
    const kopf = b64(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
    const inhalt = b64(JSON.stringify({ aud, exp: (jetztSek || Math.floor(Date.now() / 1000)) + 12 * 3600, sub }));
    const sig = crypto.sign('sha256', Buffer.from(kopf + '.' + inhalt), { key: schluessel, dsaEncoding: 'ieee-p1363' });   // ES256: r|s, je 32 Byte
    return kopf + '.' + inhalt + '.' + b64(sig);
}

// ===================================================================================================
// 3) Was gibt es zu melden? (läuft im Spiel des Weltrechners, alle paar Sekunden)
//    Vergleicht mit dem letzten Mal (window.__pushMerker): neue Angriffe und Späher auf Basen echter Spieler,
//    verlorene Basen. Beim allerersten Mal wird nur gemerkt (nach einem Neustart keine alten Meldungen).
// ===================================================================================================
const BEOBACHTER = `(function () {
    const M = WELT.menschen || {}, jetzt = Date.now();
    const mensch = id => typeof id === 'string' && /^u\\d+$/.test(id) && !!M[id];
    const name = id => (botById[id] || {}).name || 'Jemand';
    const titel = id => { try { return islandTitle(islandById[id]); } catch (e) { return 'eine Basis'; } };
    const alt = window.__pushMerker, neu = { angriffe: {}, spaeher: {}, besitz: {}, boss: [], sammler: {}, schild: {} }, raus = [];
    for (const a of pendingAttacks || []) {
        const o = islandOwnerOf(a.targetId); if (!mensch(o) || !a.attackerBotId || a.attackerBotId === o) continue;
        const k = a.attackerBotId + '>' + a.targetId + '@' + a.startedAt; neu.angriffe[k] = 1;
        if (alt && !alt.angriffe[k]) raus.push({ an: o, art: 'angriff', von: name(a.attackerBotId), basis: titel(a.targetId), ankunft: a.resolveAt });
    }
    for (const b in botIntelMem) { const mem = botIntelMem[b]; if (!mem) continue;
        for (const t in mem) { const it = mem[t]; if (!it || !it.pending || !(it.ready > jetzt)) continue;
            const o = islandOwnerOf(+t); if (!mensch(o) || o === b) continue;
            const k = b + '>' + t + '@' + it.ready; neu.spaeher[k] = 1;
            if (alt && !alt.spaeher[k]) raus.push({ an: o, art: 'spaeher', von: name(b), basis: titel(+t), ankunft: it.ready }); } }
    for (const id in botOwnedIslands) { if (!mensch(id)) continue; neu.besitz[id] = [...botOwnedIslands[id]];
        const vorher = alt && alt.besitz[id]; if (!vorher) continue; const jetztDa = botOwnedIslands[id];
        for (const i of vorher) if (!jetztDa.has(i)) { const o = islandOwnerOf(i); raus.push({ an: id, art: 'verloren', von: o && o !== id ? name(o) : null, basis: titel(i) }); } }
    // Boss / Wanderboss erschienen (an alle Menschen)
    try { const b = typeof loadBoss === 'function' ? (loadBoss(), bossState) : null, w = typeof loadWander === 'function' ? loadWander() : null;
        const bk = b && b.endsAt > jetzt ? 'b' + b.islandId + '@' + b.endsAt : null, wk = w && w.troops > 0 ? 'w' + w.endsAt : null;
        neu.boss = [bk, wk].filter(Boolean);
        if (alt && alt.boss) for (const [k, wer, wo] of [[bk, b && b.name, b && b.islandId], [wk, w && w.name, w && w.at]])
            if (k && !alt.boss.includes(k)) for (const id in M) raus.push({ an: id, art: 'boss', von: wer || 'Ein Boss', basis: titel(wo) }); } catch (e) {}
    // Sammler zurück (ein Rückmarsch vom Feld ist angekommen)
    try { for (const m of fieldMarches || []) if (m.back && mensch(m.who)) neu.sammler[m.who + '@' + m.startedAt + '>' + m.fieldId] = [m.load || 0, ((fieldById || {})[m.fieldId] || {}).kind || 'gold'];
        if (alt && alt.sammler) for (const k in alt.sammler) if (!neu.sammler[k] && alt.sammler[k][0] > 0) raus.push({ an: k.split('@')[0], art: 'sammler', menge: alt.sammler[k][0], was: alt.sammler[k][1] }); } catch (e) {}
    // Friedensschild läuft in der nächsten Stunde ab
    try { const bs = loadBotState(); for (const id in M) { const su = (bs[id] || {}).shieldUntil || 0; if (su > jetzt && su - jetzt <= 3600000) { const k = id + '@' + su; neu.schild[k] = 1;
        if (alt && alt.schild && !alt.schild[k]) raus.push({ an: id, art: 'schild', bis: su }); } } } catch (e) {}
    // Events (an alle echten Spieler): 10 Minuten vor der Barbaren-Invasion, und wenn der Drache erscheint – je einmal
    neu.ev = {}; const evAlt = alt && alt.ev || {};
    for (const k in evAlt) if (evAlt[k] > jetzt - 864e5) neu.ev[k] = evAlt[k];
    const ev = typeof evState !== 'undefined' && evState ? evState : {}, ip = ev.plan && ev.plan.inv, dr = ev.dr;
    if (ip && ip.start > jetzt && ip.start - jetzt <= 10 * 60000 && !neu.ev['i' + ip.start]) { neu.ev['i' + ip.start] = ip.start; if (alt) for (const id in M) if (mensch(id)) raus.push({ an: id, art: 'invasion', ankunft: ip.start }); }
    if (dr && dr.hp > 0 && !dr.paid && dr.start <= jetzt && dr.end > jetzt && !neu.ev['d' + dr.start]) { neu.ev['d' + dr.start] = dr.end; if (alt) for (const id in M) if (mensch(id)) raus.push({ an: id, art: 'drache', ankunft: dr.end, name: dr.name }); }
    // Ein wandernder Händler ist da (haendler.js) – an alle echten Spieler, einmal pro Besuch
    try { const hd = typeof hdState !== 'undefined' && hdState && hdState.h; if (hd && hd.start <= jetzt && hd.end > jetzt && !neu.ev['h' + hd.id]) { neu.ev['h' + hd.id] = hd.end;
        let wo = ''; try { wo = coordText(hd.x, hd.y); } catch (e) {} if (alt) for (const id in M) if (mensch(id)) raus.push({ an: id, art: 'haendler', von: hd.name, basis: wo, ankunft: hd.end }); } } catch (e) {}
    for (const e of (window.__bundPush || []).splice(0)) if (mensch(e.an) && alt) raus.push(e);   // Bündnis (buendnis.js): „Hilfe!“ eines Mitglieds, Rally gegen dich
    window.__pushMerker = neu;
    const online = {}; for (const id in M) online[id] = !!M[id].online;
    return JSON.stringify({ raus, online });
})()`;

// ===================================================================================================
// 4) Sammeln, zusammenfassen, senden
// ===================================================================================================
const PRO_SPIELER_MS = 60000;     // höchstens 1 Benachrichtigung pro Minute und Spieler
const SAMMELN_MS = 4000;          // kurz warten: eine Angriffswelle aus mehreren Basen wird EINE Nachricht
const ABOS_MS = 60000;            // Abo-Liste höchstens jede Minute neu vom Server holen
const ALT_MS = 10 * 60000;        // ältere Meldungen verfallen

function minuten(ms) { const m = Math.floor(ms / 60000); return m < 1 ? 'weniger als 1 Minute' : m === 1 ? '1 Minute' : m + ' Minuten'; }
// Aus den gesammelten Meldungen eines Spielers EINE Benachrichtigung bauen (kurz, deutsch, ohne Fachwörter)
function nachrichtBauen(liste, jetzt) {
    const angriffe = liste.filter(e => e.art === 'angriff'), verloren = liste.filter(e => e.art === 'verloren'), spaeher = liste.filter(e => e.art === 'spaeher');
    const teile = [];
    if (angriffe.length === 1) { const a = angriffe[0]; teile.push(a.von + ' greift deine Basis ' + a.basis + ' an (Ankunft in ' + minuten(a.ankunft - jetzt) + ').'); }
    else if (angriffe.length) { const erst = Math.min(...angriffe.map(a => a.ankunft)), wer = [...new Set(angriffe.map(a => a.von))];
        teile.push(angriffe.length + ' Angriffe auf deine Basen (' + wer.slice(0, 3).join(', ') + (wer.length > 3 ? ' …' : '') + '), der erste kommt in ' + minuten(erst - jetzt) + '.'); }
    if (verloren.length === 1) { const v = verloren[0]; teile.push('Basis ' + v.basis + ' verloren' + (v.von ? ' an ' + v.von : '') + '.'); }
    else if (verloren.length) teile.push(verloren.length + ' Basen verloren (' + verloren.slice(0, 3).map(v => v.basis).join(', ') + (verloren.length > 3 ? ' …' : '') + ').');
    if (spaeher.length === 1) teile.push('Ein Späher von ' + spaeher[0].von + ' ist unterwegs zu deiner Basis ' + spaeher[0].basis + '.');
    else if (spaeher.length) { const wer = [...new Set(spaeher.map(s => s.von))]; teile.push(spaeher.length + ' Späher sind unterwegs zu deinen Basen (' + wer.slice(0, 3).join(', ') + (wer.length > 3 ? ' …' : '') + ').'); }
    const boss = liste.filter(e => e.art === 'boss'), sammler = liste.filter(e => e.art === 'sammler'), schild = liste.filter(e => e.art === 'schild');
    if (boss.length) teile.push(boss.map(b => b.von + ' ist erschienen (' + b.basis + ').').join(' '));
    if (sammler.length) { const g = sammler.filter(x => x.was === 'gem').reduce((a, x) => a + x.menge, 0), c = sammler.filter(x => x.was !== 'gem').reduce((a, x) => a + x.menge, 0);
        teile.push('Deine Sammler sind zurück: ' + [c ? '+' + Math.round(c).toLocaleString('de-DE') + ' Münzen' : '', g ? '+' + Math.round(g).toLocaleString('de-DE') + ' Gems' : ''].filter(Boolean).join(', ') + '.'); }
    if (schild.length) teile.push('Dein Friedensschild läuft in ' + minuten(schild[0].bis - jetzt) + ' ab.');
    const invasion = liste.filter(e => e.art === 'invasion'), drache = liste.filter(e => e.art === 'drache');
    if (invasion.length) teile.push('Barbaren-Invasion beginnt in ' + minuten(Math.min(...invasion.map(e => e.ankunft)) - jetzt) + ' – stärke deine Basen!');
    if (drache.length) teile.push('Der Drache ist erschienen' + (drache[0].name ? ' (' + drache[0].name + ')' : '') + ' – greif ihn zusammen mit allen anderen an!');
    const haendler = liste.filter(e => e.art === 'haendler');
    if (haendler.length) teile.push('Ein Händler ist da: ' + haendler[0].von + (haendler[0].basis ? ' (' + haendler[0].basis + ')' : '') + ' – nur noch ' + minuten(haendler[0].ankunft - jetzt) + '.');
    const hilfe = liste.filter(e => e.art === 'hilfe'), rally = liste.filter(e => e.art === 'rally');
    if (rally.length) { const r = rally[0]; teile.push('Rally gegen deine Basis ' + r.basis + ': ' + r.von + ' sammelt Truppen' + (r.ankunft > jetzt ? ' (Start in ' + minuten(r.ankunft - jetzt) + ')' : '') + '.'); }
    if (hilfe.length === 1) teile.push('Bündnis: ' + hilfe[0].von + ' ruft um Hilfe – ' + hilfe[0].basis + ' wird angegriffen.');
    else if (hilfe.length) teile.push('Bündnis: ' + hilfe.length + '-mal Hilfe gerufen (' + [...new Set(hilfe.map(h => h.von))].slice(0, 3).join(', ') + ').');
    const titel = angriffe.length ? 'Angriff auf deine Basis!' : verloren.length ? 'Basis verloren' : rally.length ? 'Rally gegen dich!' : hilfe.length ? 'Dein Bündnis braucht Hilfe' : spaeher.length ? 'Späher unterwegs' : invasion.length ? 'Barbaren-Invasion' : drache.length ? 'Der Drache ist da' : boss.length ? 'Ein Boss ist erschienen' : schild.length ? 'Friedensschild' : haendler.length ? 'Ein Händler ist da' : 'Sammler zurück';
    return { titel, text: teile.join(' ').slice(0, 400), tag: 'open-water' };
}

// Der Melder: wird von start.js angelegt. holen = start.js-holen (mit Weltrechner-Schlüssel), log = Protokoll
function melder(holen, log) {
    const warte = new Map();       // uid → [{ art, …, zeit }]
    const zuletzt = new Map();     // uid → wann zuletzt gesendet
    let abos = null, abosZeit = 0, vapid = null, aus = false, jwtCache = new Map(), laeuft = false;
    const stat = { gesendet: 0, fehler: 0, weg: 0 };

    async function server(aktion, daten) {
        const r = await holen('server.php', { method: 'POST', headers: { 'X-Open-Water': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ aktion }, daten || {})) });
        if (!r.ok) throw new Error(aktion + ': HTTP ' + r.status);
        return r.json();
    }
    async function abosHolen() {
        if (abos && Date.now() - abosZeit < ABOS_MS) return;
        const a = await server('push_abos');
        abosZeit = Date.now();
        aus = !a.an;
        if (aus) { abos = []; vapid = null; return; }
        if (!vapid || vapid.pub !== a.public) { vapid = { pub: a.public, key: privaterSchluessel(a.public, a.private), sub: a.sub }; jwtCache = new Map(); }
        abos = a.abos || [];
    }
    function jwtFuer(endpoint) {
        const aud = new URL(endpoint).origin, c = jwtCache.get(aud);
        if (c && c.bis > Date.now()) return c.t;
        const t = vapidJwt(aud, vapid.sub, vapid.key);
        jwtCache.set(aud, { t, bis: Date.now() + 6 * 3600000 });   // gilt 12 Std., nach 6 Std. ein neues
        return t;
    }
    // an ein Gerät senden → 'ok' | 'weg' (Abo gibt es nicht mehr) | 'fehler'
    async function sendenAn(abo, daten) {
        const u = new URL(abo.endpoint);
        if (u.protocol !== 'https:') return 'fehler';
        const body = verschluesseln(JSON.stringify(daten), abo.p256dh, abo.auth);
        const r = await fetch(u.href, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), body,
            headers: { 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'aes128gcm', TTL: '900', Urgency: 'high',
                Authorization: 'vapid t=' + jwtFuer(abo.endpoint) + ', k=' + vapid.pub } });
        if (r.status === 404 || r.status === 410) return 'weg';
        if (r.status >= 200 && r.status < 300) return 'ok';
        log('Push: ' + u.host + ' sagt ' + r.status + ' ' + String(await r.text().catch(() => '')).slice(0, 200));
        return 'fehler';
    }

    // Jede Runde (alle 5 s aus start.js): neue Meldungen einsammeln und fällige senden
    async function runde(w) {
        if (laeuft) return; laeuft = true;
        try {
            const jetzt = Date.now();
            const r = JSON.parse(w.eval(BEOBACHTER));
            for (const e of r.raus) { const uid = parseInt(String(e.an).slice(1), 10); if (!(uid > 0) || r.online[e.an]) continue;
                e.zeit = jetzt; (warte.get(uid) || warte.set(uid, []).get(uid)).push(e); }
            for (const [uid, liste] of warte) {
                // online gekommen (sieht es im Spiel) oder alles veraltet → vergessen
                const frisch = liste.filter(e => jetzt - e.zeit < ALT_MS && !(e.art !== 'verloren' && e.art !== 'hilfe' && e.ankunft < jetzt));
                if (r.online['u' + uid] || !frisch.length) { warte.delete(uid); continue; }
                warte.set(uid, frisch);
                if (jetzt - Math.min(...frisch.map(e => e.zeit)) < SAMMELN_MS) continue;
                if (jetzt - (zuletzt.get(uid) || 0) < PRO_SPIELER_MS) continue;
                await abosHolen();
                const meine = abos.filter(a => a.uid === uid);
                warte.delete(uid);
                if (aus || !meine.length) continue;
                const nichtGewollt = meine[0].aus || [], gewollt = frisch.filter(e => !nichtGewollt.includes(e.art));   // Einstellungen: Arten, die er ausgeschaltet hat
                if (!gewollt.length) continue;
                zuletzt.set(uid, jetzt);
                const daten = nachrichtBauen(gewollt, jetzt), weg = [];
                for (const abo of meine.slice(0, 10)) {
                    let erg = 'fehler'; try { erg = await sendenAn(abo, daten); } catch (x) { log('Push-Fehler: ' + (x && x.message || x)); }
                    if (erg === 'ok') stat.gesendet++; else if (erg === 'weg') { weg.push(abo.id); stat.weg++; } else stat.fehler++;
                }
                if (weg.length) { abos = abos.filter(a => !weg.includes(a.id)); try { await server('push_weg', { ids: weg }); } catch (x) { log('Push: abgelaufene Abos nicht gelöscht (' + x.message + ')'); } }
            }
        } catch (e) { log('Push-Runde: ' + (e && e.message || e)); }
        finally { laeuft = false; }
    }
    return { runde, stat };
}

module.exports = { verschluesseln, vapidJwt, privaterSchluessel, nachrichtBauen, melder, BEOBACHTER };
