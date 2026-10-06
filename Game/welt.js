// ===== welt.js – die EINE Welt für alle =====
// Läuft nach bots.js und vor spiel.js.
// - Die Welt liegt auf dem Server in "neutraler" Form: jeder echte Spieler heißt dort u<id> (wie ein Mitspieler).
//   Für dich wird u<deine id> in die Form umgerechnet, die das Spiel kennt ('player', fehlende Felder, ownedIslands …).
// - Andere echte Spieler erscheinen als Einträge in BOT_DEFS (mensch: true) – ohne Computer-Gehirn.
// - Die Welt rechnet NUR der Weltrechner auf dem Server (weltrechner/start.js, Mitspieler, Märsche, Kämpfe …) und schickt
//   sie alle 2 s an den Server. Jeder Spieler ist "Zuschauer": sie holen sie alle 2 s, ihre Befehle gehen an den
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
    const neutral = {};    // (Spieler) die Welt-Teile in neutraler Form – auf sie werden die Flicken gesetzt (der Weltrechner bekommt
                           //  nie Flicken: er behält diese zweite Kopie der ganzen Welt nicht – viel Speicher)

    const W = window.WELT = {
        ich: ICH, uid: OW.uid, system: SYSTEM,
        rechner: true,                    // (Spieler) läuft der Weltrechner auf dem Server gerade?
        leiter: !!OW.leiter,              // rechne ich gerade die Welt?
        version: OW.welt ? OW.welt.version : 0,
        weltZeit: OW.welt ? OW.welt.welt_zeit : 0,
        menschen: {},                     // u<id> → { id, name, online, profil }
        spielerSeit: 0,
        befehle: [],                      // warten auf den nächsten Puls
        befehlFertig: new Set(),          // (Weltrechner) ausgeführte Befehle (Nummern), noch nicht quittiert – mit dem nächsten Puls
        befehlWartet: new Set(),          // (Weltrechner) angenommen, aber noch nicht entschieden (Ausbau/Truppen warten aufs Profil) – nicht quittieren, nicht nochmal ausführen
        befehlOk: new Set(),              // (Weltrechner) bezahlte Befehle, die angenommen wurden (Server: ok – nur die holt ein Zurückspielen nach)
        befehleSpaeter: [],               // (Spieler) vom Server nicht angenommen (z. B. Stau) – in ein paar Sekunden nochmal
        ereignisFertig: (() => { try { const a = JSON.parse(S.daten.openWaterEreignisFertig || '[]'); return Array.isArray(a) ? a.filter(Number.isInteger).slice(-500) : []; } catch (e) { return []; } })(),   // (Spieler) die zuletzt verbuchten Nachrichten (stehen im eigenen Spielstand)
        ereignisseRaus: [],               // (Weltrechner) Nachrichten an andere Spieler
        sichtRaus: {},                    // (Weltrechner, 3B) neue Sicht je Spieler: uid → Bitfeld (base64) – nur für den Server
        armeeSichtRaus: {},               // (Weltrechner) fremde Armeen/besetzte Felder, die er sieht: uid → [Kennungen] – nur für den Server
        sichtV: typeof OW.sicht_v === 'number' ? OW.sicht_v : -1,   // (Spieler, 3B) Stand der Sicht, die ich habe
        beiNachricht: [],                 // spiel.js hängt sich hier ein
        flickenBauen, flickenAnwenden,    // (auch für Tests)
        name: id => (W.menschen[id] || {}).name
    };
    // Ausgang (Spieler): jeder Befehl steht im eigenen Spielstand, bis der Server ihn angenommen hat – in DERSELBEN Sicherung
    // wie das, was das Handy dafür bezahlt hat (Münzen, Gems). Absturz, Akku leer, Neuladen vor dem Senden: nach dem Laden geht er
    // mit derselben Nummer nochmal raus (der Server legt ihn nie doppelt ab). Bezahlte Befehle bis 50 Min. (der Server behält
    // erledigte Befehle 1 Std. – länger nie, sonst könnte ein schon erledigter neu angelegt werden), alle anderen 5 Min.
    const BEZAHLT = ['ausbau', 'hauptstadt', 'schneller', 'truppen'];   // (wie BEFEHLE_BEZAHLT in server.php)
    const befehlFrisch = b => Date.now() - (b.at || 0) < (BEZAHLT.includes(b.art) ? 50 : 5) * 60000;
    W.ausgang = (() => { if (SYSTEM) return []; try { const a = JSON.parse(S.daten.openWaterBefehlAus || '[]');
        return Array.isArray(a) ? a.filter(b => b && typeof b.cid === 'string' && typeof b.art === 'string' && befehlFrisch(b)).slice(-200) : []; } catch (e) { return []; } })();
    W.befehle.push(...W.ausgang);
    function ausgangSichern() { if (!SYSTEM) S.privat('openWaterBefehlAus', J(W.ausgang)); }

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
        openWaterBuendnisse(v, d) {          // Bündnisse (buendnis.js): Anführer, Mitglieder, Anfragen, Einladungen, Signale, Geschenke, Rallys
            if (!v) return v; const t = tausch(d);
            for (const id in v.b || {}) { const a = v.b[id]; if (!a) continue; a.anf = t(a.anf); a.mit = (a.mit || []).map(t);
                for (const q of a.anfragen || []) q.w = t(q.w); for (const q of a.einl || []) q.w = t(q.w); for (const s of a.sig || []) s.w = t(s.w);
                for (const h of a.hilfe || []) { h.w = t(h.w); h.von = (h.von || []).map(t); }   // Bündnis-Hilfe (Botschaft)
                if (a.gesch) { schluesselTausch(a.gesch.n, d); schluesselTausch(a.gesch.k, d); } }
            for (const r of v.r || []) { r.by = t(r.by); for (const j of r.j || []) j.w = t(j.w); }
            return v;
        },
        openWaterBundChat(v, d) { if (v) { const t = tausch(d); for (const id in v) { const c = v[id]; if (!c) continue; c.mit = (c.mit || []).map(t); for (const x of c.l || []) x.w = t(x.w); } } return v; },   // Bündnis-Chat: wer schreibt, wer liest
        openWaterVerstaerkung(v, d) { if (v) { const t = tausch(d); for (const x of v.l || []) x.w = t(x.w); } return v; },   // Verstärkung (Botschaft): wessen Truppen
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
            for (const id in W.menschen) if (id !== ICH && !(SYSTEM && bs[id])) {   // (Weltrechner: die Welt-Werte sind schon geprüft – nie roh aus dem Profil)
                bs[id] = profilZuBot(W.menschen[id].profil, bs[id]);
                if (SYSTEM) bs[id].hbRoh = 1;          // nicht in der gespeicherten Welt (z. B. Neustart kurz nach dem Beitritt): das Hauptbuch fängt an wie bei einem neuen Spieler
            }
            S.roh('openWaterBotState', J(bs)); geaendert.add('openWaterBotState');
        }
        if ('openWaterBotCoins' in teile) {
            const bc = P(teile.openWaterBotCoins) || {}; delete bc[ICH];
            if (!SYSTEM) for (const id in W.menschen) if (id !== ICH && W.menschen[id].profil) bc[id] = Math.max(0, Math.min(1e15, +W.menschen[id].profil.coins || 0));   // (Weltrechner: die Welt-Münzen sind schon gedeckelt)
            S.roh('openWaterBotCoins', J(bc)); geaendert.add('openWaterBotCoins');
        }
        S.roh('openWaterWorldVersion', WELT_VERSION);
        return geaendert;
    }

    // Client → neutral: nur der Weltrechner. schluessel: geänderte Client-Schlüssel
    // objekte (wenn gegeben): bekommt je Teil das Objekt, aus dem der Text entstand (spart das erneute Lesen des Textes je Puls)
    function clientZuWelt(schluessel, objekte) {
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
            else if (k === 'openWaterPendingRetreats') {   // deine Rückzüge (die der anderen laufen als "Senden zurück")
                v = (v || []).map(r => Object.assign({}, r, { owner: ICH }));
            }
            else if (UMRECHNEN[k] && v) v = UMRECHNEN[k](v, 'w');
            raus[k] = v === null ? d[k] : J(v);
            if (objekte && istObjekt(v)) { for (const kk in v) if (v[kk] === undefined) delete v[kk]; objekte[k] = v; }   // (wie der Text: ohne undefined)
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
        let stW = 0; for (const k in inv) { const st = Math.max(0, Math.min(5, (inv[k] && inv[k].stars) | 0)); stW += 10 * st * (st + 1); }   // Gems in allen Sternen (angelegt oder nicht): je Stern 20·(n+1) wie starGemCost
        const thr = P(d.openWaterThrone) || {}, bl = (city.builds || []).filter(b => b && b.id).slice(0, 2);
        return {
            name: d.openWaterPlayerName || OW.name, lvl: parseInt(d.openWaterLevel, 10) || 1,
            skills: P(d.openWaterSkills) || {}, gear, stW, city: { levels: city.levels || {}, bau: bl.map(b => b.id), bauBis: bl.map(b => +b.endsAt || 0), b2: !!city.builder2, foLauf: city.foRun ? city.foRun.id : null, foBis: city.foRun ? +city.foRun.endsAt || 0 : 0 }, wounded: city.wounded || 0,   // (bauBis/foBis: Push „Bau fertig“ / „Forschung fertig“, wenn das Handy zu ist)
            hs: P(d.openWaterHeroes2) || {}, shieldUntil: parseFloat(d.openWaterShield) || 0,
            fo: city.fo || {}, res: P(d.openWaterRes) || null,   // Paket D: Forschung, Rohstoffe (Burg-Stufe steht in city.levels.keep)
            neuBis: typeof neulingBis === 'function' ? neulingBis() : 0,
            look: { ring: look.ring || null, rings: look.rings || [], march: look.march || null, marchs: look.marchs || [], frame: look.frame || null, title: look.title || null, throne: !!(look.bought && look.bought.throne) },
            saison: parseInt(d.openWaterSaisonMein, 10) || 1,   // Welt-Saison dieses Spielstands (ein Profil von vor dem Reset zählt nicht)
            stats: P(d.openWaterStats) || {}, earned: thr.earned || 0, coins: parseFloat(d.openWaterCoins) || 0, gems: parseFloat(d.openWaterGems) || 0,   // (Gems sieht nur der Weltrechner – 3B: Hauptbuch)
            crest: P(d.openWaterCrest), baustil: P(d.openWaterBaustil)
        };
    }
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
            fo: Object.assign({}, p.fo || (alt && alt.city && alt.city.fo) || {}) };   // Paket D (das Hauptbuch prüft: Stufe nur so hoch, wie Burg und Labor erlauben)
        if (p.res && typeof p.res === 'object') { b.res = {}; for (const k of ['h', 's', 'e']) { const x = +p.res[k]; b.res[k] = Number.isFinite(x) && x > 0 ? Math.min(1e15, x) : 0; } }   // Rohstoffe (wie die Münzen: der Weltrechner rechnet von da weiter)
        b.wounded = p.wounded || 0;
        if (p.hs) b.hs = p.hs; else if (!b.hs) b.hs = {};
        // Schild und Anfängerschutz kommen vom Handy – darum mit Grenzen: Anfängerschutz kann nur kürzer werden (nie neu
        // anfangen), höchstens 48 h; ein Schild, der beim Angreifen gefallen ist, gilt erst wieder, wenn ein neuer kommt
        const jetzt = Date.now(), ps = Math.min(+p.shieldUntil || 0, jetzt + 8 * 86400000);
        b.shields = { 2: 0, 8: 0, 24: 0 }; b.shieldUntil = alt && alt.schildAlt && Math.abs(ps - alt.schildAlt) < 60000 ? 0 : ps;   // nur genau der gefallene Schild bleibt aus – ein neu eingeschalteter gilt (auch kürzer)
        b.neuBis = Math.max(0, Math.min(+p.neuBis || 0, jetzt + 48 * 3600000, alt && alt.neuBis !== undefined ? +alt.neuBis || 0 : Infinity));
        const lk = p.look || {};
        b.ring = lk.ring || null; b.rings = lk.rings || []; b.march = lk.march || null; b.marchs = lk.marchs || [];
        b.frames = lk.frame ? [lk.frame] : []; b.titles = lk.title ? [lk.title] : []; b.throneLook = lk.throne ? 1 : 0;
        b.lookFrame = lk.frame || null; b.lookTitle = lk.title || null;
        const st = p.stats || {};
        b.stats = Object.assign({}, b.stats || {}, { caps: st.captures || 0, pvp: st.pvpWins || 0, defs: st.defends || 0, bosses: st.bosses || 0,
            tpEarned: SYSTEM ? ((alt && alt.stats && alt.stats.tpEarned) || (b.stats && b.stats.tpEarned) || 0) : p.earned || 0 });   // (der Weltrechner zählt die Thron-Punkte selbst – nie, was das Handy behauptet)
        b.achLook = b.achLook || []; b.goals = b.goals || {};
        return b;
    }
    W.profilZuBot = profilZuBot;

    // ===================================================================================================
    // 3) Beim Laden: Welt einsetzen, andere Spieler als Mitspieler eintragen
    // ===================================================================================================
    // Welt-Saison (09f-saison.js): ein Profil aus einer älteren Saison (sein Handy hat den Reset noch nicht übernommen) zählt nicht
    function saisonNr() { const t = S.daten.openWaterSaison || (OW.welt && OW.welt.setzen && OW.welt.setzen.openWaterSaison); const v = P(t); return v && v.nr > 0 ? v.nr : 1; }
    function menschenAktualisieren(liste) {
        const nr = saisonNr();
        for (const s of liste || []) {
            const id = 'u' + s.id, m = W.menschen[id] || (W.menschen[id] = { id, uid: s.id });
            m.name = s.name; m.online = s.online;
            if (typeof BOT_DEFS !== 'undefined') { const bd = BOT_DEFS.find(b => b.id === id); if (bd && bd.mensch) bd.name = s.name; }   // neuer Name sichtbar
            if (s.profil && (+s.profil.saison || 1) >= nr && !(m.profil && (s.profil_zeit || 0) <= (m.profilZeit || 0))) { m.profil = s.profil; m.profilNeu = true; m.profilZeit = s.profil_zeit || 0; }   // (profilZeit: wann der Server es bekam – Hauptbuch: was war da schon bezahlt?)
            if (s.profil_zeit > W.spielerSeit) W.spielerSeit = s.profil_zeit;
        }
        // (der Server schickt Profile mit 5 s Überlappung – ein schon übernommenes kommt also nochmal: dann nicht nochmal einsetzen)
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
        if (!SYSTEM) for (const k in OW.welt.setzen) { const v = P(OW.welt.setzen[k]); if (istObjekt(v)) neutral[k] = v; }
        const teile = Object.assign({}, OW.welt.setzen);
        rueckzuegeZuClient(teile);
        weltZuClient(teile);
    } else {
        S.roh('openWaterWorldVersion', WELT_VERSION);   // eine ganz neue Welt: das Spiel baut sie gleich, der Weltrechner schickt sie
        W.neueWelt = true;
    }
    delete OW.welt;

    // Thron: dein privater Teil (Thron-Punkte im Geldbeutel) wird abgespalten
    S.beimSetzen = function (k) {
        if (k === 'openWaterThrone') { const v = P(S.daten[k]); if (v) S.privat('openWaterThroneMein', J({ pts: v.pts || 0, earned: v.earned || 0 })); }
    };

    // ===================================================================================================
    // 4) Puls: alle 2 s mit dem Server reden
    // ===================================================================================================
    const PULS_MS = 2000;
    let pulsLaeuft = false, letztesProfil = '', profilAt = 0, pulsStart = 0, gleichNochmal = false, pulsFehler = false, spielerAlleAt = 0;
    // (Weltrechner) Office-Server überlastet (6.10.): nach einem langsamen Puls (über 8 s) eine Pause (halbe Puls-Dauer, höchstens
    // 20 s) bevor der nächste regelmäßige kommt – neue Befehle der Spieler holt er trotzdem sofort ab
    let pulsDauer = 0, ruheBis = 0;
    const basis = {};   // (Weltrechner) Stand der Mitspieler-Töpfe der anderen Menschen beim letzten Puls → Unterschiede = Nachrichten

    function topf(id) {
        const b = typeof botState !== 'undefined' && botState && botState[id];
        const sh = {}; if (b && b.hs) for (const h in b.hs) sh[h] = b.hs[h].sh || 0;
        const res = b && b.res ? { h: b.res.h || 0, s: b.res.s || 0, e: b.res.e || 0 } : null;   // Paket D: Holz, Stein, Eisen (null: noch keine – 3B: sonst kämen die Start-Rohstoffe doppelt an)
        return { coins: (typeof botCoins !== 'undefined' && botCoins[id]) || 0, gems: b ? b.gems || 0 : 0, tp: b ? b.tp || 0 : 0, xp: b ? b.xpNeu || 0 : 0, wounded: b ? b.wounded || 0 : 0, sh, res, stats: b ? Object.assign({}, b.stats || {}) : {} };
    }
    // (Weltrechner) was hat sich bei den anderen Menschen getan? → Nachrichten
    function deltasSammeln() {
        for (const id in W.menschen) deltaEinen(id);
    }
    function deltaEinen(id) {
        {
            if (id === ICH || !botById(id)) return;
            const jetzt = topf(id), alt = basis[id];
            if (!alt) { basis[id] = jetzt; return; }
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
    // (Weltrechner, neue Welt-Saison) alles, was ihm die Welt noch schuldet, jetzt als Nachricht – vor der Nachricht „saison“
    W.deltaJetzt = function (id) {
        if (!W.menschen[id] || !botById(id)) return;
        deltaEinen(id);
        const o = offen[id] || (botState[id] && botState[id].dOffen && botState[id].dOffen.e ? botState[id].dOffen : null);
        delete offen[id]; if (botState[id]) delete botState[id].dOffen;
        if (o && o.e && Object.keys(o.e).length) W.ereignisseRaus.push({ an: parseInt(id.slice(1), 10), e: Object.assign({ art: 'delta' }, o.e) });
    };
    W.deltaBasis = function (id) { if (botById(id)) basis[id] = topf(id); };   // (nach dem Reset: Münzen 0 ist keine Nachricht „−Münzen“)
    // schl: ein fester Schlüssel (z. B. 'woche|<Woche>') → feste Nummer: zahlt der Weltrechner nach Neustart/Zurückspielen dieselbe
    // Auszahlung nochmal, legt der Server sie kein zweites Mal ab (eindeutig je Spieler und Nummer)
    W.nachricht = function (uid, e, schl) { if (('u' + uid) === ICH) { for (const f of W.beiNachricht) try { f(e); } catch (x) { console.warn(x); } } else W.ereignisseRaus.push(schl ? { an: uid, e, mid: festeNummer(schl + '|' + uid) } : { an: uid, e }); };
    function festeNummer(t) { let a = 0x811c9dc5, b = 0x9e3779b9; for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = Math.imul(b ^ c, 2246822519) >>> 0; b = (b ^ (b >>> 13)) >>> 0; }
        return 'F' + a.toString(36).padStart(7, '0') + b.toString(36).padStart(7, '0') + (t.length % 1296).toString(36).padStart(2, '0'); }   // (17 Zeichen aus dem Schlüssel)

    function neueNummer() { let t = ''; const z = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; const r = new Uint32Array(16); (window.crypto || crypto).getRandomValues(r); for (const x of r) t += z[x % z.length]; return t; }   // für Befehle und Nachrichten (genau einmal)
    function packen(text) { try { if (window.fflate) return window.fflate.gzipSync(window.fflate.strToU8(text), { level: SYSTEM ? 1 : 6 }); } catch (e) {} return null; }   // (Weltrechner: Stufe 1 – viel weniger Rechenzeit, die Leitung zum Server ist lokal)

    async function puls() {
        if (pulsLaeuft || S.gestoppt || W.saisonHalt) return;
        pulsLaeuft = true; pulsStart = Date.now(); pulsFehler = false;
        let neuGesendet = null;
        const anfrage = { aktion: 'puls', token: S.token, seit: W.version, spieler_seit: W.spielerSeit };
        if (!SYSTEM) anfrage.sicht_v = W.sichtV;                              // 3B: welche Sicht (Nebel auf dem Server) ich schon habe
        { const alle = pulsStart - spielerAlleAt > 10000; anfrage.spieler_alle = alle ? 1 : 0; if (alle) spielerAlleAt = pulsStart; }   // ganze Spieler-Liste (Namen, online) nur alle 10 s, sonst nur Änderungen (auch der Weltrechner, 6.10.)
        if (SYSTEM) { if (Object.keys(W.sichtRaus).length) { anfrage.sicht = W.sichtRaus; W.sichtRaus = {}; }   // (Weltrechner) neue Sicht einzelner Spieler
            if (Object.keys(W.armeeSichtRaus).length) { anfrage.armee_sicht = W.armeeSichtRaus; W.armeeSichtRaus = {}; }
            if (W.sicherungBitte) anfrage.sicherung = 1; }   // (Welt-Saison: vor dem Reset eine Sicherung der Welt beim Server)
        try {
            const jetzt = Date.now();
            if (!SYSTEM && jetzt - profilAt > 10000) { const pr = J(meinProfil()); if (pr !== letztesProfil) { anfrage.profil = pr; letztesProfil = pr; } profilAt = jetzt; }
            if (W.befehleSpaeter.length && jetzt - (W.spaeterT || 0) > 5000) { W.spaeterT = jetzt; W.befehle.push(...W.befehleSpaeter.splice(0).filter(befehlFrisch)); }
            if (W.befehle.length) anfrage.befehle = W.befehle.splice(0, 30);   // der Server nimmt höchstens 30 pro Puls – der Rest gleich im nächsten
            if (W.leiter) {
                deltasSammeln();                                                       // erst die Nachrichten (ändert dOffen) …
                if (typeof window.__weltVorPuls === 'function') window.__weltVorPuls();   // … dann alles in die Daten schreiben (dOffen im selben Stand)
                const ks = Array.from(S.weltGeaendert); S.weltGeaendert.clear();
                const objekte = {};
                anfrage.welt = { setzen: ks.length ? clientZuWelt(ks, objekte) : {}, loeschen: [], welt_zeit: jetzt };
                // große Teile nur als Änderung, wenn das deutlich kleiner ist (Stand erst nach gutem Puls übernehmen)
                anfrage.neuGesendet = {};
                for (const k in anfrage.welt.setzen) {
                    const neu = objekte[k]; if (!istObjekt(neu)) { delete gesendet[k]; continue; }
                    anfrage.neuGesendet[k] = neu;
                    if (!gesendet[k] || anfrage.welt.setzen[k].length < 3000) continue;
                    const f = J(flickenBauen(gesendet[k], neu));
                    if (f.length < anfrage.welt.setzen[k].length * .6) { (anfrage.welt.flicken || (anfrage.welt.flicken = {}))[k] = f; delete anfrage.welt.setzen[k]; }
                }
                if (W.ereignisseRaus.length) anfrage.ereignisse = W.ereignisseRaus.splice(0).map(x => { if (!x.mid) x.mid = neueNummer(); return x; });   // (eine Wiederholung behält ihre Nummer)
                anfrage.quittung = Array.from(W.befehlFertig);               // diese Befehle stecken jetzt in der Welt, die ich schicke
                if (W.befehlOk.size) anfrage.bezahlt_ok = Array.from(W.befehlOk);
            }
            neuGesendet = anfrage.neuGesendet; delete anfrage.neuGesendet;
            const text = J(anfrage), gz = packen(text);
            const kopf = { 'X-Open-Water': '1', 'Content-Type': 'application/octet-stream' }; if (gz) kopf['X-Gepackt'] = '1';
            const r = await fetch('server.php', { method: 'POST', headers: kopf, body: gz || text, credentials: 'same-origin', cache: 'no-store' });
            if (r.status === 409 || r.status === 401 || r.status === 503) {   /* 503 = nur Wartung; ein Serverfehler ist 500 und wird wiederholt */ if (SYSTEM && window.__weltrechnerEnde) window.__weltrechnerEnde(r.status); else S.rauswurf(r.status); return; }
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const a = await r.json();
            if (neuGesendet) Object.assign(gesendet, neuGesendet);   // der Server hat sie: ab jetzt nur noch Änderungen dazu
            if (anfrage.befehle) {                                   // nur, was der Server angenommen hat, ist aus dem Ausgang raus – der Rest kommt gleich nochmal
                const da = new Set(Array.isArray(a.befehle_ok) ? a.befehle_ok : anfrage.befehle.map(b => b.cid));
                if (W.ausgang.length) { W.ausgang = W.ausgang.filter(b => !da.has(b.cid)); ausgangSichern(); }
                const nicht = anfrage.befehle.filter(b => b.cid && !da.has(b.cid) && befehlFrisch(b)); if (nicht.length) W.befehleSpaeter.push(...nicht);
            }
            if (!a.quittung_offen) { for (const id of anfrage.quittung || []) W.befehlFertig.delete(id); for (const id of anfrage.bezahlt_ok || []) W.befehlOk.delete(id); }   // quittiert: kommt nicht mehr (sonst beim nächsten Puls nochmal)
            for (const k of a.welt_voll || []) { delete gesendet[k]; S.weltGeaendert.add(k === 'openWaterBotOwnedIslands' ? 'openWaterOwnedIslands' : k); }   // Flicken passte nicht: nächstes Mal ganz
            if (anfrage.sicherung && typeof a.sicherung === 'number') { W.sicherungBitte = null; if (a.sicherung > 0) W.sicherungId = a.sicherung; }   // (0: nicht geklappt – spiel.js fragt später nochmal)
            antwortVerarbeiten(a, anfrage);
            if (anfrage.profil && a && a.profil_ok === false) letztesProfil = '';   // (vom Server abgelehnt – zu schnell: beim nächsten Mal nochmal schicken)
        } catch (e) {
            // nichts verloren: Befehle/Welt-Teile/Nachrichten beim nächsten Mal nochmal (mit derselben Nummer – der Server legt
            // nichts doppelt ab). Alte Befehle nicht mehr (bezahlte nach 50 Min., andere nach 5 Min.: die Lage hat sich geändert).
            if (anfrage.befehle) W.befehle.unshift(...anfrage.befehle.filter(befehlFrisch));
            if (W.ausgang.length && W.ausgang.some(b => !befehlFrisch(b))) { W.ausgang = W.ausgang.filter(befehlFrisch); ausgangSichern(); }
            if (neuGesendet) for (const k in neuGesendet) delete gesendet[k];   // ob der Server sie hat, ist unklar: nächstes Mal ganz statt als Änderung
            if (anfrage.welt) for (const k of Object.keys(Object.assign({}, anfrage.welt.setzen, anfrage.welt.flicken))) S.weltGeaendert.add(k === 'openWaterBotOwnedIslands' ? 'openWaterOwnedIslands' : k);
            if (anfrage.ereignisse) W.ereignisseRaus.unshift(...anfrage.ereignisse);
            if (anfrage.sicht) W.sichtRaus = Object.assign(anfrage.sicht, W.sichtRaus);
            if (anfrage.armee_sicht) W.armeeSichtRaus = Object.assign(anfrage.armee_sicht, W.armeeSichtRaus);
            if (anfrage.profil) letztesProfil = '';
            console.warn('Welt-Puls:', e); pulsFehler = true;
        } finally {
            pulsLaeuft = false;
            if (SYSTEM) { pulsDauer = Date.now() - pulsStart; ruheBis = pulsDauer > 8000 ? Date.now() + Math.min(20000, pulsDauer / 2) : 0; }
            if (gleichNochmal) { gleichNochmal = false; setTimeout(puls, 60); }   // (Weltrechner) Befehle ausgeführt: Ergebnis gleich speichern, nicht erst in 2 s
            else if (W.befehle.length && !S.gestoppt && !pulsFehler) setTimeout(puls, 150);   // noch Befehle übrig (z. B. Mehrfachangriff auf 100 Ziele): gleich weiter – nach einem Fehler nicht (sonst ~7 Anfragen/s im Funkloch)
        }
    }

    function antwortVerarbeiten(a, anfrage) {
        W.pulse = (W.pulse || 0) + 1;
        if (SYSTEM) W.befehleGezaehlt = (W.befehleGezaehlt || 0) + (a.befehle || []).length;   // (für den Herzschlag, start.js)
        if (typeof a.sicht_v === 'number') W.sichtV = a.sicht_v;
        if (a.spieler) {
            const vorher = new Set(Object.keys(W.menschen));
            menschenAktualisieren(a.spieler);
            for (const id in W.menschen) if (!vorher.has(id) && menschEintragen(id) && window.__weltNeuerMensch) window.__weltNeuerMensch(id);
            // neue Profile anderer Menschen: ihren Mitspieler-Datensatz und ihren Münz-Spiegel auffrischen
            for (const id in W.menschen) {
                const m = W.menschen[id]; if (!m.profilNeu || id === ICH) continue; m.profilNeu = false;
                if (W.leiter) deltaEinen(id);   // was seit dem Puls-Start dazukam (Beute, Ertrag …), erst als Nachricht verbuchen – sonst überschreibt es das Profil
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
        if (!SYSTEM) for (const k in w.setzen || {}) { const v = P(w.setzen[k]); if (istObjekt(v)) neutral[k] = v; else delete neutral[k]; }
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
        for (const b of a.befehle || []) {
            if (b.id && (W.befehlFertig.has(b.id) || W.befehlWartet.has(b.id))) continue;   // schon ausgeführt (noch nicht quittiert) oder wartet – nicht nochmal
            if (W.leiter) gleichNochmal = true;                      // (nur wenn wirklich ein neuer Befehl ausgeführt wird – wartende lösten sonst ~16 Pulse/s aus)
            let r; if (window.__weltBefehl) try { r = window.__weltBefehl('u' + b.von, b.b); } catch (e) { console.warn('Befehl', b, e); }
            if (b.id) { if (r === 'wartet') W.befehlWartet.add(b.id); else W.befehlFertig.add(b.id); }
        }
        // Nachrichten an mich – jede genau einmal: die Nummern der verbuchten stehen im eigenen Spielstand und gehen mit der
        // nächsten Sicherung (zusammen mit Münzen, Gems … aus denselben Nachrichten) zum Server, erst dann gelten sie als abgeholt
        // Welt-Saison: nach der Nachricht „saison“ nichts mehr verbuchen – die Seite lädt gleich neu und übernimmt den Reset; was danach
        // kam (Ertrag der neuen Saison), kommt beim nächsten Laden nochmal (noch nicht verbucht)
        W.nachrichtenVoll = (a.ereignisse || []).length >= 200;   // (Server gibt höchstens 200 – es warten noch mehr; 09f-saison.js saisonNachholen)
        const fertig = new Set(W.ereignisFertig); let neu = false;
        for (const e of W.saisonHalt ? [] : a.ereignisse || []) {
            const id = e && e._eid; if (id && fertig.has(id)) continue;
            if (e) delete e._eid;
            for (const f of W.beiNachricht) try { f(e); } catch (x) { console.warn(x); }
            if (id) { fertig.add(id); W.ereignisFertig.push(id); neu = true; }
            if (e && e.art === 'saison' && W.saisonHalt) break;
        }
        if (neu) { if (window.__weltSpeicherJetzt) window.__weltSpeicherJetzt(); W.ereignisFertig = W.ereignisFertig.slice(-500); S.privat('openWaterEreignisFertig', J(W.ereignisFertig)); }
    }

    W.befehlErledigt = id => { if (W.befehlWartet.delete(id)) W.befehlFertig.add(id); };   // (spiel.js: ein wartender Befehl ist entschieden)
    W.befehlBezahlt = id => { W.befehlOk.add(id); };
    // Befehl an den Weltrechner (bin ich es selbst, führt spiel.js ihn direkt aus)
    W.befehl = function (art, daten) {
        const b = Object.assign({ art, at: Date.now(), cid: neueNummer() }, daten || {});
        W.befehle.push(b);
        if (!SYSTEM) { W.ausgang.push(b); if (W.ausgang.length > 200) W.ausgang.splice(0, W.ausgang.length - 200); ausgangSichern(); }
        try { if (!SYSTEM && window.__owSofort) window.__owSofort(false); } catch (e) {}   // bezahlte Münzen/Gems + Befehl im Ausgang: eine Sicherung
        setTimeout(puls, 150);
        if (!W.leiter) { setTimeout(puls, 1100); setTimeout(puls, 2000); }   // das Ergebnis vom Weltrechner bald abholen (nicht erst mit dem nächsten 2-s-Puls)
    };

    W.start = function () {
        // erst, wenn alle Skripte da sind (bündnis.js, haendler.js, aufbau.js hängen sich an die Nachrichten) – sonst gingen die
        // Nachrichten des ersten Pulses verloren
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', W.start, { once: true }); return; }
        puls(); setInterval(() => { if (!SYSTEM || Date.now() >= ruheBis) puls(); }, PULS_MS); document.addEventListener('visibilitychange', () => { if (!document.hidden) puls(); });
        // (Weltrechner) jede Sekunde kurz nachsehen, ob Befehle da sind – dann sofort rechnen, statt bis zum nächsten Puls zu warten
        // (vorher alle 0,3 s: auf dem geteilten Server zu viele Anfragen; ein Befehl kommt so höchstens ~0,7 s später an).
        // Immer nur EINE Nachfrage gleichzeitig (6.10.: bei Last dauerte sie 20–30 s und es liefen bis zu 30 nebeneinander), und nach
        // einem langsamen Puls nur alle 5 s.
        let nachfrage = false, nachfrageAt = 0;
        if (SYSTEM) setInterval(async () => {
            if (nachfrage || pulsLaeuft || S.gestoppt || !W.leiter || Date.now() - pulsStart < 300 || (pulsDauer > 8000 && Date.now() - nachfrageAt < 5000)) return;
            nachfrage = true; nachfrageAt = Date.now();
            try { const r = await fetch('server.php', { method: 'POST', headers: { 'X-Open-Water': '1', 'Content-Type': 'application/json' }, body: J({ aktion: 'befehle_da' }), credentials: 'same-origin', cache: 'no-store' });
                if (r.ok && (await r.json()).offen > W.befehlFertig.size + W.befehlWartet.size) puls(); } catch (e) {}   // mehr offen, als ich schon ausgeführt habe (oder warten lasse)
            finally { nachfrage = false; }
        }, 1000);
    };
})();
