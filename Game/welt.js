// ===== welt.js – die EINE Welt für alle =====
// Läuft nach bots.js und vor spiel.js.
// - Die Welt liegt auf dem Server in "neutraler" Form: jeder echte Spieler heißt dort u<id> (wie ein Mitspieler).
//   Für dich wird u<deine id> in die Form umgerechnet, die das Spiel kennt ('player', fehlende Felder, ownedIslands …).
// - Andere echte Spieler erscheinen als Einträge in BOT_DEFS (mensch: true) – ohne Computer-Gehirn.
// - Genau EIN Spieler ist "Weltrechner": sein Spiel rechnet die Welt (Mitspieler, Märsche, Kämpfe …) und schickt sie
//   alle 2 s an den Server. Alle anderen sind "Zuschauer" ihrer Welt: sie holen sie alle 2 s, ihre Befehle gehen an den
//   Weltrechner, ihre Münzen/Gems/EP … kommen als Nachrichten zurück.
(function () {
    'use strict';
    const OW = window.__OW || {}, S = window.__owSpeicher;
    const ICH = 'u' + OW.uid;
    const WELT_VERSION = '7';                // wie WORLD_VERSION in spiel.js (7: Karte 17 × 17, Paket C)
    const SYSTEM = !!OW.system;              // der Weltrechner auf dem Server (weltrechner/start.js): hat keine eigenen Basen
    const P = s => { try { return s == null ? null : JSON.parse(s); } catch (e) { return null; } };
    const J = v => JSON.stringify(v);
    const istObjekt = v => v !== null && typeof v === 'object' && !Array.isArray(v);

    // ===== Nur Änderungen schicken („Flicken“) =====
    // Große Welt-Teile (Mitspieler, Insel-Stufen, Besitz …) ändern sich alle 2 s nur an wenigen Stellen. Statt des ganzen
    // Teils geht nur der Unterschied über die Leitung: s = neue/geänderte Einträge, w = weggefallene, d = eine Ebene tiefer
    // nur die geänderten Felder (z. B. bei einem Mitspieler nur sein Zähler, nicht sein ganzer Datensatz).
    function flickenBauen(alt, neu) {
        if (!istObjekt(alt) || !istObjekt(neu)) return null;
        const s = {}, w = [], d = {}; let n = 0;
        for (const k in neu) {
            const b = neu[k];
            if (!(k in alt)) { s[k] = b; n++; continue; }
            const a = alt[k]; if (a === b) continue;
            if (istObjekt(a) && istObjekt(b)) {
                const ss = {}, ww = []; let m = 0;
                for (const kk in b) if (!(kk in a) || J(a[kk]) !== J(b[kk])) { ss[kk] = b[kk]; m++; }
                for (const kk in a) if (!(kk in b)) { ww.push(kk); m++; }
                if (m) { d[k] = ww.length ? { s: ss, w: ww } : { s: ss }; n++; }
            } else if (J(a) !== J(b)) { s[k] = b; n++; }
        }
        for (const k in alt) if (!(k in neu)) { w.push(k); n++; }
        const f = {}; if (Object.keys(s).length) f.s = s; if (w.length) f.w = w; if (Object.keys(d).length) f.d = d;
        return f;
    }
    function flickenAnwenden(obj, f) {
        if (!istObjekt(obj) || !istObjekt(f)) return false;
        for (const k in f.s || {}) obj[k] = f.s[k];
        for (const k of f.w || []) delete obj[k];
        for (const k in f.d || {}) { const z = obj[k], sub = f.d[k]; if (!istObjekt(z)) return false; for (const kk in sub.s || {}) z[kk] = sub.s[kk]; for (const kk of sub.w || []) delete z[kk]; }
        return true;
    }
    const gesendet = {};   // (Weltrechner) Stand jedes Teils, wie ihn der Server zuletzt sicher bekommen hat
    const neutral = {};    // (Spieler) die Welt-Teile in neutraler Form – auf sie werden die Flicken gesetzt

    const W = window.WELT = {
        ich: ICH, uid: OW.uid, system: SYSTEM,
        rechner: true,                    // (Spieler) läuft der Weltrechner auf dem Server gerade?
        leiter: !!OW.leiter,              // rechne ich gerade die Welt?
        version: OW.welt ? OW.welt.version : 0,
        weltZeit: OW.welt ? OW.welt.welt_zeit : 0,
        menschen: {},                     // u<id> → { id, name, online, profil }
        spielerSeit: 0,
        befehle: [],                      // warten auf den nächsten Puls
        ereignisseRaus: [],               // (Weltrechner) Nachrichten an andere Spieler
        sichtRaus: {},                    // (Weltrechner, 3B) neue Sicht je Spieler: uid → Bitfeld (base64) – nur für den Server
        sichtV: typeof OW.sicht_v === 'number' ? OW.sicht_v : -1,   // (Spieler, 3B) Stand der Sicht, die ich habe
        beiNachricht: [],                 // spiel.js hängt sich hier ein
        flickenBauen, flickenAnwenden,    // (auch für Tests)
        istMensch: id => !!(id && W.menschen[id]),
        name: id => (W.menschen[id] || {}).name
    };

    // ===================================================================================================
    // 1) Umrechnen: neutral (alle Menschen als u<id>) ↔ für dich ('player')
    // ===================================================================================================
    // d = 'c': neutral → Client (ICH wird 'player'), d = 'w': Client → neutral ('player' wird ICH)
    function tausch(d) { const von = d === 'c' ? ICH : 'player', zu = d === 'c' ? 'player' : ICH; return x => x === von ? zu : x; }
    function schluesselTausch(o, d) { if (!o || typeof o !== 'object') return o; const von = d === 'c' ? ICH : 'player', zu = d === 'c' ? 'player' : ICH; if (von in o) { o[zu] = o[von]; delete o[von]; } return o; }

    const UMRECHNEN = {
        openWaterPendingAttacks(v, d) { for (const a of v || []) { if (d === 'c') { if (a.attackerBotId === ICH) a.attackerBotId = null; } else if (!a.attackerBotId) a.attackerBotId = ICH; } return v; },
        openWaterPendingSends(v, d) { for (const a of v || []) { if (d === 'c') { if (a.senderBotId === ICH) a.senderBotId = null; } else if (!a.senderBotId) a.senderBotId = ICH; } return v; },
        openWaterTitles(v, d) { if (!v) return v; const t = tausch(d); v.ruler = t(v.ruler); for (const k in v.by || {}) v.by[k] = t(v.by[k]); return v; },
        openWaterThrone(v, d) { if (!v) return v; v.ruler = tausch(d)(v.ruler); schluesselTausch(v.week, d); return v; },
        openWaterTourney(v, d) {
            if (!v) return v; const t = tausch(d);
            schluesselTausch(v.pts, d); schluesselTausch(v.by, d); schluesselTausch(v.kb, d);
            if (v.champ) v.champ.who = t(v.champ.who);
            for (const h of v.hist || []) h.who = t(h.who);
            if (v.last) for (const e of v.last.top || []) e[0] = t(e[0]);
            return v;
        },
        openWaterBounty(v, d) { if (v) v.ruler = tausch(d)(v.ruler); return v; },
        openWaterFields(v, d) { const t = tausch(d); for (const k in v || {}) if (v[k] && v[k].occ) v[k].occ.who = t(v[k].occ.who); return v; },
        openWaterFieldMarches(v, d) { const t = tausch(d); for (const m of v || []) m.who = t(m.who); return v; },
        openWaterBarbMarches(v, d) { const t = tausch(d); for (const m of v || []) m.who = t(m.who); return v; },
        openWaterBarbWho(v, d) { return schluesselTausch(v, d); },
        openWaterDayBoss(v, d) { if (v) schluesselTausch(v.dmg, d); return v; },
        openWaterEvents(v, d) {   // Events: Punkte der Invasion, Schaden und Angriffe beim Drachen, Punkte im Wochen-Event
            if (!v) return v;
            if (v.inv) { schluesselTausch(v.inv.pts, d); schluesselTausch(v.inv.wehr, d); }
            if (v.dr) { schluesselTausch(v.dr.dmg, d); schluesselTausch(v.dr.hits, d); }
            if (v.wo) { schluesselTausch(v.wo.pts, d); schluesselTausch(v.wo.kb, d); if (v.wo.last) { const t = tausch(d); for (const e of v.wo.last.top || []) e[0] = t(e[0]); } }   // Wochen-Event (Mo–Fr)
            return v;
        },
        openWaterArmies(v, d) {
            if (!v) return v; const t = tausch(d);
            for (const a of v.armies || []) { if (d === 'c') { if (a.who === ICH) delete a.who; } else if (!a.who) a.who = ICH; }
            for (const j of v.joins || []) j.who = t(j.who);
            if (d === 'c') v.raids = (v.raids || []).filter(r => !r.tOwner || r.tOwner === ICH);
            else for (const r of v.raids || []) if (!r.tOwner) r.tOwner = ICH;
            return v;
        },
        openWaterBuendnisse(v, d) {          // Bündnisse (buendnis.js): Anführer, Mitglieder, Anfragen, Signale, Geschenke, Rallys
            if (!v) return v; const t = tausch(d);
            for (const id in v.b || {}) { const a = v.b[id]; if (!a) continue; a.anf = t(a.anf); a.mit = (a.mit || []).map(t);
                for (const q of a.anfragen || []) q.w = t(q.w); for (const s of a.sig || []) s.w = t(s.w);
                if (a.gesch) { schluesselTausch(a.gesch.n, d); schluesselTausch(a.gesch.k, d); } }
            for (const r of v.r || []) { r.by = t(r.by); for (const j of r.j || []) j.w = t(j.w); }
            return v;
        },
        openWaterHaendler(v, d) {            // wandernder Händler (haendler.js): wer was gekauft hat, wessen Sammel-Beschleuniger läuft
            if (!v) return v; const t = tausch(d);
            schluesselTausch(v.kauf, d); schluesselTausch(v.boost, d); for (const x of v.log || []) x.w = t(x.w);
            return v;
        },
        openWaterBotState(v, d) {
            const t = tausch(d);
            for (const id in v || {}) { const b = v[id]; if (!b) continue; schluesselTausch(b.grudge, d); schluesselTausch(b.annoy, d); if (b.vendetta) b.vendetta.who = t(b.vendetta.who); }
            return v;
        }
    };

    // Neutral → Client: alle Welt-Teile (oder nur die genannten) in die Daten des Spiels schreiben
    // teile: { schluessel: string } in neutraler Form
    function weltZuClient(teile) {
        const geaendert = new Set();
        for (const k in teile) {
            if (k === 'openWaterBotOwnedIslands') continue;          // unten zusammen mit den eigenen Basen
            if (k === 'openWaterBotState') continue;                 // unten (Profile der Menschen, Hauptstadt)
            if (k === 'openWaterBotCoins') continue;
            let v = P(teile[k]);
            if (UMRECHNEN[k] && v) v = UMRECHNEN[k](v, 'c');
            if (k === 'openWaterThrone' && v) { const m = P(S.daten.openWaterThroneMein) || {}; v.pts = m.pts || 0; v.earned = m.earned || 0; }
            if (k === 'openWaterTourney' && v && v.last) { const m = P(S.daten.openWaterTourMein) || {}; v.last.me = m.key === v.last.key ? m.me || null : null; v.last.seen = m.key === v.last.key ? !!m.seen : !v.last.me; }
            S.roh(k, v === null ? teile[k] : J(v)); geaendert.add(k);
        }
        if ('openWaterBotOwnedIslands' in teile) {
            const alle = P(teile.openWaterBotOwnedIslands) || {};
            S.roh('openWaterOwnedIslands', J(alle[ICH] || [])); delete alle[ICH];
            S.roh('openWaterBotOwnedIslands', J(alle)); geaendert.add('openWaterOwnedIslands'); geaendert.add('openWaterBotOwnedIslands');
        }
        if ('openWaterBotState' in teile) {
            const bs = UMRECHNEN.openWaterBotState(P(teile.openWaterBotState) || {}, 'c');
            if (bs[ICH] && bs[ICH].capital != null) { S.roh('openWaterPlayerIslandId', String(bs[ICH].capital)); geaendert.add('openWaterPlayerIslandId'); }
            delete bs[ICH];
            for (const id in W.menschen) if (id !== ICH) bs[id] = profilZuBot(W.menschen[id].profil, bs[id]);
            S.roh('openWaterBotState', J(bs)); geaendert.add('openWaterBotState');
        }
        if ('openWaterBotCoins' in teile) {
            const bc = P(teile.openWaterBotCoins) || {}; delete bc[ICH];
            for (const id in W.menschen) if (id !== ICH && W.menschen[id].profil) bc[id] = Math.max(0, Math.min(1e15, +W.menschen[id].profil.coins || 0));
            S.roh('openWaterBotCoins', J(bc)); geaendert.add('openWaterBotCoins');
        }
        S.roh('openWaterWorldVersion', WELT_VERSION);
        return geaendert;
    }

    // Client → neutral: nur der Weltrechner. schluessel: geänderte Client-Schlüssel
    function clientZuWelt(schluessel) {
        const raus = {}, d = S.daten;
        const ks = new Set(schluessel);
        if (ks.has('openWaterOwnedIslands')) ks.add('openWaterBotOwnedIslands');
        if (ks.has('openWaterPlayerIslandId')) ks.add('openWaterBotState');
        for (const k of ks) {
            if (k === 'openWaterOwnedIslands' || k === 'openWaterPlayerIslandId' || k === 'openWaterWorldVersion') continue;
            if (!(k in d)) continue;
            let v = P(d[k]);
            if (SYSTEM && (k === 'openWaterBotOwnedIslands' || k === 'openWaterBotState' || k === 'openWaterBotCoins')) { v = v || {}; if (k === 'openWaterBotState') v = UMRECHNEN.openWaterBotState(v, 'w'); delete v[ICH]; }   // der Weltrechner selbst ist kein Mitspieler
            else if (k === 'openWaterBotOwnedIslands') { v = v || {}; v[ICH] = P(d.openWaterOwnedIslands) || []; }
            else if (k === 'openWaterBotState') { v = UMRECHNEN.openWaterBotState(v || {}, 'w'); v[ICH] = profilZuBot(meinProfil(), v[ICH]); v[ICH].capital = parseInt(d.openWaterPlayerIslandId, 10); }
            else if (k === 'openWaterBotCoins') { v = v || {}; v[ICH] = parseFloat(d.openWaterCoins) || 0; }
            else if (k === 'openWaterThrone' && v) { delete v.pts; delete v.earned; v = UMRECHNEN[k](v, 'w'); }
            else if (k === 'openWaterTourney' && v) { if (v.last) { delete v.last.me; delete v.last.seen; } v = UMRECHNEN[k](v, 'w'); }
            else if (k === 'openWaterPendingRetreats') {   // deine Rückzüge (die der anderen laufen als "Senden zurück")
                v = (v || []).map(r => Object.assign({}, r, { owner: ICH }));
            }
            else if (UMRECHNEN[k] && v) v = UMRECHNEN[k](v, 'w');
            raus[k] = v === null ? d[k] : J(v);
        }
        return raus;
    }
    // Rückzüge anderer Spieler (neutral: owner = u<id>) → für dich: "Senden zurück" dieses Spielers
    function rueckzuegeZuClient(teile) {
        if (!('openWaterPendingRetreats' in teile)) return;
        const alle = P(teile.openWaterPendingRetreats) || [], meine = [], fremd = [];
        for (const r of alle) { if (!r.owner || r.owner === ICH) { const c = Object.assign({}, r); delete c.owner; meine.push(c); } else fremd.push({ fromId: r.fromId, toId: r.toId, troops: r.troops, startedAt: r.startedAt, resolveAt: r.resolveAt, senderBotId: r.owner, back: true }); }
        teile.openWaterPendingRetreats = J(meine);
        if (fremd.length) { const s = P(teile.openWaterPendingSends || S.daten.openWaterPendingSends) || []; teile.openWaterPendingSends = J(s.concat(fremd)); }
    }

    // ===================================================================================================
    // 2) Profil: was die anderen von dir brauchen (Kampfwerte, Aussehen) – und daraus ein Mitspieler-Datensatz
    // ===================================================================================================
    function meinProfil() {
        const d = S.daten, inv = P(d.openWaterInventory) || {}, eq = P(d.openWaterEquippedItems) || {}, city = P(d.openWaterCity) || {}, look = P(d.openWaterLook) || {};
        const gear = {};
        for (const slot of ['weapon', 'armor', 'shield', 'boots']) { const it = eq[slot] && inv[eq[slot]]; gear[slot] = it ? { r: it.rarity, lvl: it.level, st: it.stars || 0 } : null; }
        const thr = P(d.openWaterThrone) || {};
        return {
            name: d.openWaterPlayerName || OW.name, lvl: parseInt(d.openWaterLevel, 10) || 1,
            skills: P(d.openWaterSkills) || {}, gear, city: { levels: city.levels || {} }, wounded: city.wounded || 0,
            hs: P(d.openWaterHeroes2) || {}, shieldUntil: parseFloat(d.openWaterShield) || 0,
            fo: city.fo || {}, tier: city.tier || 1, tierBez: city.tierBez || 1, res: P(d.openWaterRes) || null,   // Paket D: Forschung, Truppen-Stufe, Rohstoffe (Burg-Stufe steht in city.levels.keep)
            neuBis: typeof neulingBis === 'function' ? neulingBis() : 0,
            look: { ring: look.ring || null, rings: look.rings || [], march: look.march || null, marchs: look.marchs || [], frame: look.frame || null, title: look.title || null, throne: !!(look.bought && look.bought.throne) },
            stats: P(d.openWaterStats) || {}, earned: thr.earned || 0, coins: parseFloat(d.openWaterCoins) || 0, gems: parseFloat(d.openWaterGems) || 0,   // (Gems sieht nur der Weltrechner – 3B: Hauptbuch)
            crest: P(d.openWaterCrest), baustil: P(d.openWaterBaustil)
        };
    }
    W.meinProfil = meinProfil;
    // Mitspieler-Datensatz für einen echten Spieler: Kampfwerte aus seinem Profil, Welt-Felder (Hauptstadt, Groll …) bleiben.
    // 3B: Beim Weltrechner (id gegeben) hält W.klemmen (spiel.js, Hauptbuch) Stufe, Skills, Ausrüstung, Helden, Stadt,
    // Forschung und Truppen-Stufe gegen das, was er wirklich haben kann. Zuschauer übernehmen diese Werte aus der Welt
    // (Merker hbK) – ein gefälschtes Profil zeigt bei den anderen also auch nichts.
    function profilZuBot(p, alt, id) {
        const b = profilZuBotRoh(p, alt);
        if (SYSTEM && id && typeof W.klemmen === 'function') { try { W.klemmen(id, b, p || {}, alt); } catch (e) { console.warn('Hauptbuch:', e); } }
        else if (alt && alt.hbK) { b.hbK = 1; for (const k of ['lvl', 'skills', 'gear', 'city', 'hs', 'shieldUntil']) if (alt[k] !== undefined) b[k] = alt[k]; }
        return b;
    }
    function profilZuBotRoh(p, alt) {
        const b = Object.assign({ lvl: 1, xp: 0, sp: 0, gems: 0, salvage: 0, tp: 0, pts: 0 }, alt || {});
        p = p || {};
        b.mensch = 1; b.v2 = 1; b.lookMig = 1; b.ringMig = 1;
        b.lvl = p.lvl || b.lvl || 1;
        b.skills = Object.assign({ troops: 0, attack: 0, defense: 0, speed: 0, attackGold: 0, defenseGold: 0 }, p.skills || {});
        b.equip = { weapon: 0, armor: 0, shield: 0, boots: 0 };
        b.gear = Object.assign({ weapon: null, armor: null, shield: null, boots: null }, p.gear || {});
        if (!b.spare) { b.spare = {}; for (const k of ['weapon', 'armor', 'shield', 'boots']) b.spare[k] = [0, 0, 0, 0, 0, 0]; }
        b.city = { levels: Object.assign({}, (b.city && b.city.levels) || {}, (p.city && p.city.levels) || {}), builds: [], builder2: false,
            fo: Object.assign({}, p.fo || (alt && alt.city && alt.city.fo) || {}), tier: p.tier || (alt && alt.city && alt.city.tier) || 1, tierBez: p.tierBez || 1 };   // Paket D (aufbau.js prüft: Stufe nur so hoch, wie Burg und Forschung erlauben)
        if (p.res && typeof p.res === 'object') { b.res = {}; for (const k of ['h', 's', 'e']) { const x = +p.res[k]; b.res[k] = Number.isFinite(x) && x > 0 ? Math.min(1e15, x) : 0; } }   // Rohstoffe (wie die Münzen: der Weltrechner rechnet von da weiter)
        b.wounded = p.wounded || 0;
        if (p.hs) b.hs = p.hs; else if (!b.hs) b.hs = {};
        // Schild und Anfängerschutz kommen vom Handy – darum mit Grenzen: Anfängerschutz kann nur kürzer werden (nie neu
        // anfangen), höchstens 48 h; ein Schild, der beim Angreifen gefallen ist, gilt erst wieder, wenn ein neuer kommt
        const jetzt = Date.now(), ps = Math.min(+p.shieldUntil || 0, jetzt + 8 * 86400000);
        b.shields = { 2: 0, 8: 0, 24: 0 }; b.shieldUntil = alt && alt.schildAlt && ps <= alt.schildAlt ? 0 : ps;
        b.neuBis = Math.max(0, Math.min(+p.neuBis || 0, jetzt + 48 * 3600000, alt && alt.neuBis !== undefined ? +alt.neuBis || 0 : Infinity));
        const lk = p.look || {};
        b.ring = lk.ring || null; b.rings = lk.rings || []; b.march = lk.march || null; b.marchs = lk.marchs || [];
        b.frames = lk.frame ? [lk.frame] : []; b.titles = lk.title ? [lk.title] : []; b.throneLook = lk.throne ? 1 : 0;
        b.lookFrame = lk.frame || null; b.lookTitle = lk.title || null;
        const st = p.stats || {};
        b.stats = Object.assign({}, b.stats || {}, { caps: st.captures || 0, pvp: st.pvpWins || 0, defs: st.defends || 0, bosses: st.bosses || 0, tpEarned: p.earned || 0 });
        b.achLook = b.achLook || []; b.goals = b.goals || {};
        return b;
    }
    W.profilZuBot = profilZuBot;

    // ===================================================================================================
    // 3) Beim Laden: Welt einsetzen, andere Spieler als Mitspieler eintragen
    // ===================================================================================================
    function menschenAktualisieren(liste) {
        for (const s of liste || []) {
            const id = 'u' + s.id, m = W.menschen[id] || (W.menschen[id] = { id, uid: s.id });
            m.name = s.name; m.online = s.online;
            if (typeof BOT_DEFS !== 'undefined') { const bd = BOT_DEFS.find(b => b.id === id); if (bd && bd.mensch) bd.name = s.name; }   // neuer Name sichtbar
            if (s.profil) { m.profil = s.profil; m.profilNeu = true; }
            if (s.profil_zeit > W.spielerSeit) W.spielerSeit = s.profil_zeit;
        }
    }
    menschenAktualisieren(OW.spieler);
    // alle anderen echten Spieler, die schon Basen haben (oder jemals hatten), als Mitspieler-Einträge
    function menschEintragen(id) {
        if (id === ICH || typeof BOT_DEFS === 'undefined' || BOT_DEFS.some(b => b.id === id)) return false;
        const m = W.menschen[id];
        BOT_DEFS.push({ id, name: (m && m.name) || 'Spieler', color: 'hsl(' + ((parseInt(id.slice(1), 10) * 47) % 360) + ',70%,45%)', style: 'balanced', mensch: true });
        return true;
    }
    W.menschEintragen = menschEintragen;
    for (const id in W.menschen) menschEintragen(id);
    for (const k of S.WELT) S.roh(k, null);   // Welt-Teile aus einem alten eigenen Spielstand zählen nicht – es gibt nur die EINE Welt
    if (OW.welt && OW.welt.version > 0) {
        for (const k in OW.welt.setzen) { const v = P(OW.welt.setzen[k]); if (istObjekt(v)) neutral[k] = v; }
        const teile = Object.assign({}, OW.welt.setzen);
        rueckzuegeZuClient(teile);
        weltZuClient(teile);
    } else {
        S.roh('openWaterWorldVersion', WELT_VERSION);   // eine ganz neue Welt: das Spiel baut sie gleich, der Weltrechner schickt sie
        W.neueWelt = true;
    }
    delete OW.welt;

    // Thron/Turnier: dein privater Teil (Thron-Punkte im Geldbeutel, dein Turnier-Ergebnis) wird abgespalten
    S.beimSetzen = function (k) {
        if (k === 'openWaterThrone') { const v = P(S.daten[k]); if (v) S.privat('openWaterThroneMein', J({ pts: v.pts || 0, earned: v.earned || 0 })); }
        if (k === 'openWaterTourney') { const v = P(S.daten[k]); if (v && v.last) S.privat('openWaterTourMein', J({ key: v.last.key, me: v.last.me || null, seen: !!v.last.seen })); }
    };

    // ===================================================================================================
    // 4) Puls: alle 2 s mit dem Server reden
    // ===================================================================================================
    const PULS_MS = 2000;
    let pulsLaeuft = false, letztesProfil = '', profilAt = 0, pulsStart = 0, gleichNochmal = false;
    const basis = {};   // (Weltrechner) Stand der Mitspieler-Töpfe der anderen Menschen beim letzten Puls → Unterschiede = Nachrichten

    function topf(id) {
        const b = typeof botState !== 'undefined' && botState && botState[id];
        const sh = {}; if (b && b.hs) for (const h in b.hs) sh[h] = b.hs[h].sh || 0;
        const res = b && b.res ? { h: b.res.h || 0, s: b.res.s || 0, e: b.res.e || 0 } : null;   // Paket D: Holz, Stein, Eisen (null: noch keine – 3B: sonst kämen die Start-Rohstoffe doppelt an)
        return { coins: (typeof botCoins !== 'undefined' && botCoins[id]) || 0, gems: b ? b.gems || 0 : 0, tp: b ? b.tp || 0 : 0, xp: b ? b.xpNeu || 0 : 0, wounded: b ? b.wounded || 0 : 0, sh, res, stats: b ? Object.assign({}, b.stats || {}) : {} };
    }
    // (Weltrechner) was hat sich bei den anderen Menschen getan? → Nachrichten
    function deltasSammeln() {
        for (const id in W.menschen) {
            if (id === ICH || !botById(id)) continue;
            const jetzt = topf(id), alt = basis[id];
            if (!alt) { basis[id] = jetzt; continue; }
            const e = {};
            for (const k of ['coins', 'gems', 'tp', 'xp', 'wounded']) { const dd = jetzt[k] - alt[k]; if (Math.abs(dd) > 1e-9) e[k] = dd; }
            const sh = {}; for (const h in jetzt.sh) { const dd = jetzt.sh[h] - (alt.sh[h] || 0); if (dd) sh[h] = dd; } if (Object.keys(sh).length) e.sh = sh;
            const rs = {}; if (jetzt.res && alt.res) for (const k of ['h', 's', 'e']) { const dd = Math.round(jetzt.res[k] - alt.res[k]); if (dd) rs[k] = dd; } if (Object.keys(rs).length) e.res = rs;   // Rohstoffe
            const st = {}; for (const k in jetzt.stats) { const dd = (jetzt.stats[k] || 0) - (alt.stats[k] || 0); if (typeof dd === 'number' && dd > 0 && k !== 'tpEarned') st[k] = dd; } if (Object.keys(st).length) e.stats = st;
            if (botState[id] && botState[id].xpNeu) botState[id].xpNeu = 0;
            jetzt.xp = 0;
            basis[id] = jetzt;
            // Online: sofort. Offline: sammeln und höchstens alle 5 Minuten als EINE Nachricht ablegen (sonst läge für jeden
            // abwesenden Spieler alle 2 s ein Eintrag in der Datenbank – nach 8 Stunden ~14.000)
            if (Object.keys(e).length) deltaMerken(id, e);
            if (!offen[id] && botState[id] && botState[id].dOffen && botState[id].dOffen.e) offen[id] = botState[id].dOffen;   // nach einem Neustart
            const o = offen[id];
            if (o && (W.menschen[id].online || Date.now() - o.seit > 300000)) { delete offen[id]; if (botState[id]) delete botState[id].dOffen; W.ereignisseRaus.push({ an: parseInt(id.slice(1), 10), e: Object.assign({ art: 'delta' }, o.e) }); }
        }
    }
    // (Weltrechner) gesammelte Änderungen für Spieler, die gerade nicht online sind. Liegen auch in botState[id].dOffen
    // (nur der Weltrechner sieht das), damit bei einem Neustart des Weltrechners nichts verloren geht
    const offen = {};
    function deltaMerken(id, e) {
        if (!offen[id] && botState[id] && botState[id].dOffen && botState[id].dOffen.e) offen[id] = botState[id].dOffen;
        const o = offen[id] || (offen[id] = { seit: Date.now(), e: {} }), z = o.e;
        for (const k of ['coins', 'gems', 'tp', 'xp', 'wounded']) if (e[k]) z[k] = (z[k] || 0) + e[k];
        for (const g of ['sh', 'stats', 'res']) if (e[g]) { const t = z[g] || (z[g] = {}); for (const k in e[g]) t[k] = (t[k] || 0) + e[g][k]; }
        if (botState[id]) botState[id].dOffen = o;
    }
    function botById(id) { return typeof BOT_DEFS !== 'undefined' && BOT_DEFS.find(b => b.id === id); }
    W.nachricht = function (uid, e) { if (('u' + uid) === ICH) { for (const f of W.beiNachricht) try { f(e); } catch (x) { console.warn(x); } } else W.ereignisseRaus.push({ an: uid, e }); };

    function packen(text) { try { if (window.fflate) return window.fflate.gzipSync(window.fflate.strToU8(text), { level: 6 }); } catch (e) {} return null; }

    async function puls() {
        if (pulsLaeuft || S.gestoppt) return;
        pulsLaeuft = true; pulsStart = Date.now();
        const anfrage = { aktion: 'puls', token: S.token, seit: W.version, spieler_seit: W.spielerSeit };
        if (!SYSTEM) anfrage.sicht_v = W.sichtV;                              // 3B: welche Sicht (Nebel auf dem Server) ich schon habe
        else if (Object.keys(W.sichtRaus).length) { anfrage.sicht = W.sichtRaus; W.sichtRaus = {}; }   // (Weltrechner) neue Sicht einzelner Spieler
        try {
            const jetzt = Date.now();
            if (!SYSTEM && jetzt - profilAt > 10000) { const pr = J(meinProfil()); if (pr !== letztesProfil) { anfrage.profil = pr; letztesProfil = pr; } profilAt = jetzt; }
            if (W.befehle.length) anfrage.befehle = W.befehle.splice(0, 30);   // der Server nimmt höchstens 30 pro Puls – der Rest gleich im nächsten
            let gesendetKs = null;
            if (W.leiter) {
                if (typeof window.__weltVorPuls === 'function') window.__weltVorPuls();   // spiel.js: alles in die Daten schreiben
                deltasSammeln();
                const ks = Array.from(S.weltGeaendert); S.weltGeaendert.clear();
                anfrage.welt = { setzen: ks.length ? clientZuWelt(ks) : {}, loeschen: [], welt_zeit: jetzt };
                // große Teile nur als Änderung, wenn das deutlich kleiner ist (Stand erst nach gutem Puls übernehmen)
                anfrage.neuGesendet = {};
                for (const k in anfrage.welt.setzen) {
                    const neu = P(anfrage.welt.setzen[k]); if (!istObjekt(neu)) { delete gesendet[k]; continue; }
                    anfrage.neuGesendet[k] = neu;
                    if (!gesendet[k] || anfrage.welt.setzen[k].length < 3000) continue;
                    const f = J(flickenBauen(gesendet[k], neu));
                    if (f.length < anfrage.welt.setzen[k].length * .6) { (anfrage.welt.flicken || (anfrage.welt.flicken = {}))[k] = f; delete anfrage.welt.setzen[k]; }
                }
                if (ks.length) gesendetKs = ks;
                if (W.ereignisseRaus.length) anfrage.ereignisse = W.ereignisseRaus.splice(0);
            }
            const neuGesendet = anfrage.neuGesendet; delete anfrage.neuGesendet;
            const text = J(anfrage), gz = packen(text);
            const kopf = { 'X-Open-Water': '1', 'Content-Type': 'application/octet-stream' }; if (gz) kopf['X-Gepackt'] = '1';
            const r = await fetch('server.php', { method: 'POST', headers: kopf, body: gz || text, credentials: 'same-origin', cache: 'no-store' });
            if (r.status === 409 || r.status === 401 || r.status === 503) { if (SYSTEM && window.__weltrechnerEnde) window.__weltrechnerEnde(r.status); else S.rauswurf(r.status); return; }
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const a = await r.json();
            if (neuGesendet) Object.assign(gesendet, neuGesendet);   // der Server hat sie: ab jetzt nur noch Änderungen dazu
            for (const k of a.welt_voll || []) { delete gesendet[k]; S.weltGeaendert.add(k === 'openWaterBotOwnedIslands' ? 'openWaterOwnedIslands' : k); }   // Flicken passte nicht: nächstes Mal ganz
            antwortVerarbeiten(a, anfrage);
        } catch (e) {
            // nichts verloren: Befehle/Welt-Teile/Nachrichten beim nächsten Mal nochmal
            if (anfrage.befehle) W.befehle.unshift(...anfrage.befehle);
            if (anfrage.welt) for (const k of Object.keys(Object.assign({}, anfrage.welt.setzen, anfrage.welt.flicken))) S.weltGeaendert.add(k === 'openWaterBotOwnedIslands' ? 'openWaterOwnedIslands' : k);
            if (anfrage.ereignisse) W.ereignisseRaus.unshift(...anfrage.ereignisse);
            if (anfrage.sicht) W.sichtRaus = Object.assign(anfrage.sicht, W.sichtRaus);
            if (anfrage.profil) letztesProfil = '';
            console.warn('Welt-Puls:', e);
        } finally {
            pulsLaeuft = false;
            if (gleichNochmal) { gleichNochmal = false; setTimeout(puls, 60); }   // (Weltrechner) Befehle ausgeführt: Ergebnis gleich speichern, nicht erst in 2 s
            else if (W.befehle.length && !S.gestoppt) setTimeout(puls, 150);   // noch Befehle übrig (z. B. Mehrfachangriff auf 100 Ziele): gleich weiter
        }
    }

    function antwortVerarbeiten(a, anfrage) {
        W.pulse = (W.pulse || 0) + 1; W.nachrichtenOffen = (a.ereignisse || []).length >= 200;   // (spiel.js: Begrüßung erst, wenn alles da ist)
        if (typeof a.sicht_v === 'number') W.sichtV = a.sicht_v;
        if (a.spieler) {
            const vorher = new Set(Object.keys(W.menschen));
            menschenAktualisieren(a.spieler);
            for (const id in W.menschen) if (!vorher.has(id) && menschEintragen(id) && window.__weltNeuerMensch) window.__weltNeuerMensch(id);
            // neue Profile anderer Menschen: ihren Mitspieler-Datensatz und ihren Münz-Spiegel auffrischen
            for (const id in W.menschen) {
                const m = W.menschen[id]; if (!m.profilNeu || id === ICH) continue; m.profilNeu = false;
                if (typeof botState !== 'undefined' && botState && botState[id]) Object.assign(botState[id], profilZuBot(m.profil, botState[id], id));
                if (typeof botCoins !== 'undefined' && m.profil) { let c = Math.max(0, Math.min(1e15, +m.profil.coins || 0)); if (SYSTEM && typeof W.kontoMuenzen === 'function') c = Math.min(c, W.kontoMuenzen(id)); botCoins[id] = c; }   // (3B: nie mehr, als sein Konto hergibt)
                if (W.leiter) basis[id] = topf(id);
            }
        }
        const warLeiter = W.leiter;
        W.leiter = !!a.leiter;
        const rechnerVorher = W.rechner; W.rechner = SYSTEM || a.rechner !== false;
        if (W.rechner !== rechnerVorher && window.__weltRechnerStatus) window.__weltRechnerStatus(W.rechner);
        // Welt übernehmen (Zuschauer, oder gerade eben Weltrechner geworden)
        const w = a.welt || {};
        for (const k in w.setzen || {}) { const v = P(w.setzen[k]); if (istObjekt(v)) neutral[k] = v; else delete neutral[k]; }
        for (const k of w.loeschen || []) delete neutral[k];
        let fehlt = false;
        for (const k in w.flicken || {}) {   // nur Änderungen: auf den eigenen Stand setzen, dann wie ein ganzer Teil weiter
            const o = neutral[k]; let ok = !!o;
            for (const t of w.flicken[k]) if (ok) ok = flickenAnwenden(o, P(t));
            if (ok) (w.setzen || (w.setzen = {}))[k] = J(o); else { delete neutral[k]; fehlt = true; }
        }
        // (passte etwas nicht zusammen: diesmal nichts übernehmen und beim nächsten Puls die ganze Welt holen)
        if (!fehlt && (w.setzen && Object.keys(w.setzen).length || (w.loeschen && w.loeschen.length))) {
            const teile = Object.assign({}, w.setzen);
            rueckzuegeZuClient(teile);
            const ks = weltZuClient(teile);
            for (const k of w.loeschen || []) { S.roh(k, null); ks.add(k); }
            if (window.__weltLaden) window.__weltLaden(Array.from(ks));
        }
        if (typeof w.version === 'number') W.version = fehlt ? 0 : w.version;
        if (w.welt_zeit) W.weltZeit = w.welt_zeit;
        if (typeof a.zeit === 'number' && a.zeit > 0) W.uhrVersatz = a.zeit * 1000 - Date.now();   // Server-Uhr minus Handy-Uhr (Tag und Nacht)
        if (W.leiter && !warLeiter && window.__weltLeiterWechsel) window.__weltLeiterWechsel(true, a.neu_leiter, w.welt_zeit);
        if (!W.leiter && warLeiter && window.__weltLeiterWechsel) window.__weltLeiterWechsel(false);
        if (W.leiter && W.version === 0 && W.neueWelt) { W.neueWelt = false; for (const k of S.WELT) if (k in S.daten) S.weltGeaendert.add(k); }   // ganz neue Welt: alles schicken
        // Befehle der anderen ausführen (nur Weltrechner)
        if (W.leiter && (a.befehle || []).length) gleichNochmal = true;
        for (const b of a.befehle || []) if (window.__weltBefehl) try { window.__weltBefehl('u' + b.von, b.b); } catch (e) { console.warn('Befehl', b, e); }
        // Nachrichten an mich
        for (const e of a.ereignisse || []) for (const f of W.beiNachricht) try { f(e); } catch (x) { console.warn(x); }
    }

    // Befehl an den Weltrechner (bin ich es selbst, führt spiel.js ihn direkt aus)
    W.befehl = function (art, daten) {
        try { if (!SYSTEM && window.__owSofort) window.__owSofort(false); } catch (e) {}   // erst den eigenen Stand (bezahlte Münzen) sichern, dann der Befehl
        W.befehle.push(Object.assign({ art, at: Date.now() }, daten || {})); setTimeout(puls, 150);
        if (!W.leiter) { setTimeout(puls, 1100); setTimeout(puls, 2000); }   // das Ergebnis vom Weltrechner bald abholen (nicht erst mit dem nächsten 2-s-Puls)
    };

    W.start = function () {
        puls(); setInterval(puls, PULS_MS); document.addEventListener('visibilitychange', () => { if (!document.hidden) puls(); });
        // (Weltrechner) alle 0,3 s kurz nachsehen, ob Befehle da sind – dann sofort rechnen, statt bis zum nächsten Puls zu warten
        if (SYSTEM) setInterval(async () => {
            if (pulsLaeuft || S.gestoppt || !W.leiter || Date.now() - pulsStart < 300) return;
            try { const r = await fetch('server.php', { method: 'POST', headers: { 'X-Open-Water': '1', 'Content-Type': 'application/json' }, body: J({ aktion: 'befehle_da' }), credentials: 'same-origin', cache: 'no-store' });
                if (r.ok && (await r.json()).da) puls(); } catch (e) {}
        }, 300);
    };
})();
