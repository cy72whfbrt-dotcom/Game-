// Teil 08d-gebaeude-wirkung.js: Wirkung der Gebäude (Labor, Schmiede, Lazarett), Stadt-Leiste, Hauptstadt verlegen
// ---- building effects ----
function academyLevel() { return loadCity().levels.academy || 0; }
function forgeLevel() { return loadCity().levels.forge || 0; }
function hospitalLevel() { return loadCity().levels.hospital || 0; }
function hospitalPct() { return Math.min(60, hospitalLevel() * 5) + (AUF ? AUF.lazarettPlus('player') : 0); }   // (+ Forschung Krankenhaus)
function hospitalPlatz(l) { return l ? wirtK(1e6 * Math.pow(1.6, l - 1)) : 0; }   // Platz für Verwundete bei Krankenhaus-Stufe l (für alle gleich, × WIRTSCHAFT_KOSTEN)
function hospitalCapacity() { return hospitalPlatz(hospitalLevel()); }
const HEAL_COIN_PER_TROOP = 0.1 * MUENZ_FAKTOR;   // 100 Münzen je Truppe (6.10.: Münzen × MUENZ_FAKTOR)
function hospitalTake(fallen, pct) {              // Krankenhaus: part of your fallen (attack won or lost, or defending) are only wounded → how many
    if (!hospitalLevel() || fallen <= 0) return 0;
    const c = loadCity(), room = Math.max(0, hospitalCapacity() - c.wounded), w = Math.min(room, Math.floor(fallen * (pct ?? hospitalPct()) / 100));
    if (w > 0) { c.wounded += w; saveCity(); }
    return w;
}
function starGemCost(stars) { return 20 * (stars + 1); }
function cityEffectText(id, lvl) { return cityEffectRoh(id, lvl).replace(/(\d) %/g, '$1\u00a0%'); }   // (Handy: „+3 %“ nie umbrechen)
function cityEffectRoh(id, lvl) {
    if (AUF && ['academy', 'embassy', 'market', 'lumber', 'quarry', 'mine'].includes(id)) return AUF.effektText(id, lvl);   // Paket D (aufbau.js), Rohstoff-Gebäude
    if (id === 'wall') return lvl ? 'Jetzt: +' + (lvl * 2) + ' % Verteidigung auf allen Basen.' + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: +' + ((lvl + 1) * 2) + ' %.' : '') : 'Baue die Mauer für mehr Verteidigung auf allen Basen.';
    if (id === 'academy') return 'Jetzt: Truppen laufen +' + (lvl * 2) + ' % schneller.' + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: +' + ((lvl + 1) * 2) + ' %.' : '');
    if (id === 'forge') return lvl ? 'Bis zu ' + Math.min(STAR_MAX, lvl) + (Math.min(STAR_MAX, lvl) === 1 ? ' Stern' : ' Sterne') + ' pro Ausrüstungsteil.' + (lvl < STAR_MAX ? ' Nächste Stufe: ' + (lvl + 1) + ' Sterne.' : '') : 'Baue die Schmiede, um Sterne zu setzen.';
    if (id === 'heroes') { const n = HEROES.filter(h => heroOwned('player', h.id)).length; return (lvl ? 'Jetzt: +' + lvl * HERO_HALL_GEF + ' % Gefolge für alle Helden.' : 'Noch kein Bonus aufs Gefolge.') + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: +' + (lvl + 1) * HERO_HALL_GEF + ' %.' : '') + ' ' + n + ' von ' + HEROES.length + ' Helden freigeschaltet.'; }
    if (id === 'hospital') return lvl ? hospitalPct() + ' % der Gefallenen kommen ins Krankenhaus · Platz für ' + fmtCompact(hospitalCapacity()) + (lvl < cityMaxLevel('hospital') ? ' · Nächste Stufe: ' + (Math.min(60, (lvl + 1) * 5) + (AUF ? AUF.lazarettPlus('player') : 0)) + ' %, Platz für ' + fmtCompact(hospitalPlatz(lvl + 1)) : '') : 'Baue das Krankenhaus, um Verwundete zu retten.';
    return '';
}
function cityVergleich(id, L) {                    // Gebäude-Fenster „Jetzt / Nächste Stufe“: [[Wert, jetzt, nächste Stufe], …] (noch nicht gebaut: jetzt „–“)
    const pr = v => '+' + v + '\u00a0%', z = (n, f) => [n, L ? f(L) : '–', f(L + 1)];
    if (id === 'wall') return [z('Verteidigung aller Basen', l => pr(l * 2))];
    if (id === 'academy') return [z('Marsch-Tempo', l => pr(l * 2)), z('Forschung', l => 'bis Stufe ' + l)];
    if (id === 'forge') return [z('Sterne je Ausrüstung', l => Math.min(STAR_MAX, l))];
    if (id === 'heroes') return [z('Gefolge aller Helden', l => pr(l * HERO_HALL_GEF))];
    if (id === 'hospital') return [z('Gefallene gerettet', l => (Math.min(60, l * 5) + (AUF ? AUF.lazarettPlus('player') : 0)) + '\u00a0%'), z('Platz', l => fmtCompact(hospitalPlatz(l)))];
    if (id === 'embassy' && typeof verstPlatzStufe === 'function') return [z('Verstärkung', l => fmtCompact(verstPlatzStufe('player', l))), z('Rally', l => '+' + fmtCompact(rallyPlatzStufe('player', l))), z('Bündnis-Hilfen', l => l + '×')];
    if (!AUF) return null;
    if (id === 'market') return [z('Gebühr', l => Math.round(AUF.marktGebuehr(l) * 100) + '\u00a0%')];
    const x = { lumber: 'h', quarry: 's', mine: 'e' }[id];
    return x ? [[AUF.ROH_DEF[x].name + ' pro Stunde', L ? AUF.rohStd(AUF.rohJeStunde(x, L)) : '–', AUF.rohStd(AUF.rohJeStunde(x, L + 1))]] : null;   // (ganze Zahlen; noch nicht gebaut: „–“ wie die anderen)
}
function cityExtraHtml(id, lvl) {
    if (AUF && ['academy', 'market'].includes(id)) return AUF.extraHtml(id, lvl);   // Forschung, Markt (aufbau.js)
    if (id === 'heroes') { const up = HEROES.filter(h => heroCanDo('player', h.id)).length;   // the way into the hero screen
        return (lvl ? '' : '<small class="keep-note">Deine Helden kannst du schon jetzt nutzen – die Halle gibt allen Helden Gefolge-Bonus.</small>') + '<button type="button" class="btn btn--' + (lvl ? 'primary' : 'secondary') + ' btn--grow hh-open" data-hero-open>' + icon('profile') + '<span>Helden öffnen</span>' + (up ? '<em class="hh-badge">' + up + '</em>' : '') + '</button>'; }
    if (id === 'embassy' && lvl && typeof verstHtml === 'function') return verstHtml();   // Botschaft: Verstärkung (buendnis.js)
    if (id === 'wall') return vhHtml(lvl);                                                 // Verteidigungs-Helden
    if (id === 'forge' && lvl) {                   // pick a slot, then any piece you own in it - equipped or in the chest
        const slots = Object.keys(EQUIPMENT_DEFS), cap = Math.min(STAR_MAX, lvl);
        const items = Object.values(inventory).filter(it => it.slot === forgeSlot)
            .sort((a, b) => (equippedItems[b.slot] === b.id) - (equippedItems[a.slot] === a.id) || b.rarity - a.rarity || (b.stars || 0) - (a.stars || 0));
        return '<div class="seg forge-tabs">' + slots.map(sl => '<button type="button" data-forge-slot="' + sl + '"' + (sl === forgeSlot ? ' class="on"' : '') + '>' + icon(EQUIPMENT_DEFS[sl].icon) + EQUIPMENT_DEFS[sl].name + '</button>').join('') + '</div>' +
            '<div class="forge-list">' + (items.length ? items.map(item => {
                const st = item.stars || 0, rd = RARITY_DEFS[item.rarity], cost = starGemCost(st), on = equippedItems[item.slot] === item.id;
                return '<div class="forge-row">' + icon(EQUIPMENT_DEFS[item.slot].icon) + '<span><b class="rar-text" data-r="' + rd.key + '">' + rd.label + ' · Stufe ' + (item.level || 1) + (on ? ' <em class="forge-on">angelegt</em>' : '') + '</b>' +
                    '<small class="starbar">' + icon('star').repeat(st) + '<i>' + icon('star').repeat(Math.max(0, cap - st)) + '</i></small></span>' +
                    (st >= cap ? '<em>' + (st >= STAR_MAX ? 'max.' : 'Schmiede ausbauen') + '</em>' : '<button type="button" class="btn btn--secondary btn--sm" data-star="' + item.id + '"' + (gems < cost ? ' disabled' : '') + '>+1 Stern · ' + icon('gem') + cost + '</button>') + '</div>';
            }).join('') : '<div class="forge-row is-empty">' + icon(EQUIPMENT_DEFS[forgeSlot].icon) + '<span>Keine ' + EQUIPMENT_DEFS[forgeSlot].name + ' im Besitz – Kisten gibt es im Shop.</span></div>') + '</div>';
    }
    if (id === 'hospital' && lvl) {
        const w = loadCity().wounded, cost = Math.ceil(w * HEAL_COIN_PER_TROOP);
        return '<div class="forge-list"><div class="forge-row">' + icon('plus') + '<span><b>Verwundete</b><small>' + fmtNum(w) + ' / ' + fmtCompact(hospitalCapacity()) + '</small></span>' +
            (w > 0 ? '<button type="button" class="btn btn--primary btn--sm" data-heal' + (coins < cost ? ' disabled' : '') + '>Heilen · ' + fmtCompact(cost) + ' Münzen</button>' : '<em>leer</em>') + '</div></div>';
    }
    return '';
}
// Mauer (Reiter „Helden“): zwei Chips Haupt- und Zweitheld wie im Angriffs-Fenster – antippen klappt die Auswahl darunter auf
var vhAuf = 0;                                     // aufgeklappt: 0 zu, 1 Hauptheld, 2 Zweitheld
function vhChip(k, id, unten, zu) {                // ein Chip: Bild, Name, darunter klein Sterne/Hinweis
    const h = id && heroById(id);
    return '<button type="button" class="vh-chip' + (vhAuf === k ? ' on' : '') + '" data-vh-auf="' + k + '" aria-expanded="' + (vhAuf === k) + '"' + (zu ? ' disabled' : '') +
        ' style="--hc:' + (h ? RARITY_DEFS[h.r].color : 'var(--line-1)') + '">' + (h ? heroImg(id) : '') + '<span class="vh-chip-t"><b>' + (h ? h.name : k === 1 ? 'Kein Held' : '+ Zweitheld') + '</b><small>' + unten + '</small></span></button>';
}
function vhHtml(lvl) {
    const [a, b] = vhSoll('player'), fx = vhFx('player'), hs = HEROES.filter(h => heroOwned('player', h.id)).sort((x, y) => y.r - x.r || heroSt('player', y.id).q - heroSt('player', x.id).q);
    const unten = id => heroBusy('player', id) ? 'unterwegs' : icon('star') + heroStarNum(heroSt('player', id).q);
    const liste = (k, cur, ohne) => '<div class="seg hero-seg vh-wahl"><button type="button" data-vh' + k + '=""' + (!cur ? ' class="on"' : '') + '>Keiner</button>' +
        hs.filter(h => h.id !== ohne).map(h => '<button type="button" data-vh' + k + '="' + h.id + '"' + (cur === h.id ? ' class="on"' : '') + ' style="--hc:' + RARITY_DEFS[h.r].color + '">' + heroImg(h.id) + h.name +
            '<small>' + unten(h.id) + '</small></button>').join('') + '</div>';
    const weg = [a, b].filter(id => id && heroBusy('player', id)).map(id => heroById(id).name);
    const stand = !lvl ? 'Baue die Mauer – dann verteidigt ein Held jede deiner Basen.' : !hs.length ? 'Du hast noch keinen Helden – schalte einen in der Heldenhalle frei.'
        : (fx ? 'Verteidigt jede deiner Basen.' : a ? 'Gerade verteidigt keiner.' : 'Trag einen Helden ein – er verteidigt jede deiner Basen.') +
          (weg.length ? ' ' + weg.join(' und ') + (weg.length > 1 ? ' sind' : ' ist') + ' unterwegs und verteidigt erst wieder, wenn ' + (weg.length > 1 ? 'sie' : 'er') + ' zurück ist.' : '');
    const zweitZu = lvl < VH_ZWEIT_MAUER || !a; if (zweitZu && vhAuf === 2) vhAuf = 0;
    // (Auswahl offen: die Werte-Zeilen ruhen – so passt das Fenster am Handy ohne Scrollen, Kopf bleibt sichtbar)
    const wert = l => l[0] === 'Angriff' ? ['Angriff der Verteidiger', l[1]] : l[0] === 'Verteidigung' ? ['Eigene Verluste', l[1].replace(' Verluste', '')] : l;
    return '<div class="vh-box" data-vh-box><div class="vh-kopf">' + icon('defense') + '<b>Verteidigungs-Helden</b></div><small class="vh-stand">' + stand + '</small>' +
        (lvl && hs.length ? '<div class="vh-zeile">' + vhChip(1, a, a ? 'Hauptheld · ' + unten(a) : 'Hauptheld wählen') +
            vhChip(2, b, lvl < VH_ZWEIT_MAUER ? 'ab Mauer ' + VH_ZWEIT_MAUER : !a ? 'erst Hauptheld' : (b ? 'Zweitheld · ' : 'Werte zu ') + Math.round(HERO_ZWEIT * 100) + ' %', zweitZu) + '</div>' +
            (vhAuf === 1 ? liste(1, a, null) : vhAuf === 2 ? liste(2, b, a) : '') : '') +
        (fx && !vhAuf ? '<div class="vh-werte">' + fx.lines.map(l => { const [t, v] = wert(l); return '<div class="logLine buff"><span>' + escapeHtml(t) + '</span><span>' + escapeHtml(v) + '</span></div>'; }).join('') + '</div>' : '') + '</div>';
}
function vhWaehlen(k, id) {                        // 1: Hauptheld, 2: Zweitheld (ohne Hauptheld kein Zweitheld – wie beim Angriff)
    const [a, b] = vhSoll('player'), h1 = k === 1 ? id || null : a, h2 = k === 2 ? id || null : (b === h1 ? null : b);
    const z = h1 && cityLevelSafe('wall') >= VH_ZWEIT_MAUER ? h2 : null;
    vhAuf = 0;
    if (!vhSetzen('player', h1, z)) return renderCitySheet();
    alsBefehl('vheld', { h1, h2: z });
    flashHint(h1 ? heroById(h1).name + (z ? ' und ' + heroById(z).name + ' verteidigen' : ' verteidigt') + ' jetzt jede deiner Basen.' : 'Kein Verteidigungs-Held mehr eingetragen.', 2500);
    renderCitySheet();
}
var forgeSlot = 'weapon';
document.getElementById('citySheet').addEventListener('click', e => {
    const fs = e.target.closest('[data-forge-slot]'); if (fs) { forgeSlot = fs.dataset.forgeSlot; renderCitySheet(); return; }
    if (e.target.closest('[data-hero-open]')) { openHeroHall(); return; }
    const va = e.target.closest('[data-vh-auf]'); if (va) { const n = +va.dataset.vhAuf; vhAuf = vhAuf === n ? 0 : n; renderCitySheet(); return; }
    const vh = e.target.closest('[data-vh1],[data-vh2]'); if (vh) { vhWaehlen(vh.hasAttribute('data-vh1') ? 1 : 2, vh.dataset.vh1 ?? vh.dataset.vh2); return; }
    const st = e.target.closest('[data-star]'), hl = e.target.closest('[data-heal]');
    if (st) { const item = inventory[st.dataset.star]; if (!item) return;
        const s0 = item.stars || 0, cost = starGemCost(s0);
        if (s0 >= Math.min(STAR_MAX, forgeLevel()) || gems < cost) return;
        gems -= cost; item.stars = s0 + 1; saveGame(); saveProgression(); updateHud();
        flashHint(EQUIPMENT_DEFS[item.slot].name + ' hat jetzt ' + item.stars + (item.stars === 1 ? ' Stern' : ' Sterne') + ' (+' + item.stars * STAR_PCT + ' % Wirkung).', 2500); renderCitySheet(); }
    else if (hl) { const c = loadCity(), w = c.wounded, cost = Math.ceil(w * HEAL_COIN_PER_TROOP);
        if (!w || coins < cost) return;
        coins -= cost; c.wounded = 0; saveCity(); statBump('healed', w);
        const base = rewardBaseId(); if (base !== null) eigeneTruppenDazu(base, w, 'heil');
        saveGame(); updateHud(); flashHint(fmtNum(w) + ' Truppen geheilt – sie sind in deiner Hauptstadt.', 3000); renderCitySheet(); }
});
document.getElementById('cityBtn').addEventListener('click', openCity);
document.getElementById('cityNavBtn').addEventListener('click', () => { if (!cityView.hidden) { closeAllPopups(); closeCity(); } else openCity(); });   // in der Stadt: zurück zur Karte (wie in Rise of Kingdoms)
// Auch in der Stadt bleiben die obere Leiste (Münzen, Gems, Truppen, Rohstoffe) und die untere Knopf-Leiste – überall gleich (Alexander 4.10.)
function stadtLeiste(an) {
    document.body.classList.toggle('in-stadt', an);
    stadtKopf();
    const b = document.getElementById('cityNavBtn'), l = b.querySelector('.nav-l'), u = b.querySelector('use');
    if (l) l.textContent = an ? 'Karte' : 'Stadt'; if (u) u.setAttribute('href', an ? '#i-flag' : '#i-castle'); b.classList.toggle('active', an);
}
function stadtKopf() {                          // Unterkante der Bauarbeiter-Zeile → der Hinweis (Handy) liegt darunter
    if (!document.body.classList.contains('in-stadt')) return;
    const u = Math.round(document.querySelector('.city-head').getBoundingClientRect().bottom);
    if (u > 0 && u !== stadtKopfU) { stadtKopfU = u; document.body.style.setProperty('--stadt-kopf', u + 'px'); }
}
var stadtKopfU = 0;
// Hauptstadt verlegen (teleport): pick one of your own bases, the capital status and its garrison move there.
var teleportMode = false, teleportBis = 0;   // (bleibt nur 20 s scharf – danach kostet ein Tipp auf eine Basis keine Gems mehr aus Versehen)
const TELEPORT_GEMS = 50;
document.getElementById('teleportBtn').addEventListener('click', () => {
    if (gems < TELEPORT_GEMS) { flashHint('Zum Verlegen brauchst du ' + TELEPORT_GEMS + ' Edelsteine.', 3000); return; }
    if (![...ownedIslands].some(id => id !== playerIslandId && islandById[id] && islandById[id].type === 'tower')) { flashHint('Du brauchst noch einen zweiten Turm, um die Hauptstadt zu verlegen – Tempel und Tore zählen nicht.', 3500); return; }
    closeIslandPopup(); teleportMode = true; teleportBis = Date.now() + 20000; requestRender();
    flashHint('Tippe einen deiner Türme an – die Hauptstadt zieht dorthin (' + TELEPORT_GEMS + ' Edelsteine). Woanders tippen bricht ab.', 5000);
});
function teleportCapital(toId) {
    const from = playerIslandId, to = islandById[toId];
    if (!to || !ownedIslands.has(toId) || toId === from || to.type !== 'tower' || gems < TELEPORT_GEMS) return false;   // a tower - never a gate, a temple or the throne
    if (window.WELT && pendingAttacks.some(a => a.targetId === toId)) { flashHint('Dorthin geht es gerade nicht: ein Angriff läuft auf diese Basis.', 3000); return null; }   // (der Weltrechner lehnt es genauso ab – sonst wären die Gems weg)
    gems -= TELEPORT_GEMS;
    islandTroops[toId] = (islandTroops[toId] || 0) + (islandTroops[from] || 0); islandTroops[from] = 0;   // the garrison moves along
    playerIslandId = toId; store.set('openWaterPlayerIslandId', playerIslandId); statBump('teleports');
    alsBefehl('hauptstadt', { insel: toId });
    revealAround(to.x, to.y, REVEAL_BASE, true);
    flushBannerSprites();
    saveGame(); saveProgression(); updateHud();
    spawnBattleFx(toId, true, 'Hauptstadt', 'hierher verlegt');
    flashHint('Die Hauptstadt ist umgezogen – deine Truppen sind mitgekommen.', 3500);
    return true;
}
// Teleportieren (Alexander 7.10., Merkliste 33): die Hauptstadt an eine freie Stelle der Karte – die Basis selbst zieht um (Truppen,
// Stufe, Stadt bleiben). Platz wie für eine Basis (nicht im Gebirge, nicht auf Toren, Feldern, Lagern, Tempeln, nicht in der Thron-Mitte),
// nur in Gebiete, die von der Hauptstadt über offene Pässe erreichbar sind (TELEPORT_NUR_OFFEN). Immer 500 Edelsteine, neue Spieler
// (Anfängerschutz) einmal gratis, keine Abklingzeit; nicht, solange ein Marsch an der Hauptstadt hängt. Der Weltrechner entscheidet
// (Befehl teleport), verlegte Basen stehen im Welt-Teil openWaterInselOrt { id: [x, y, Gebiet] } – Mitspieler teleportieren nicht.
const TP_GEMS = 500, TELEPORT_NUR_OFFEN = true, TP_ABSTAND = BASE_SPACING * .5;
let inselOrt = {};
for (const isl of islands) isl.ort0 = [isl.x, isl.y, isl.landmassId];
function inselOrtLaden() { try { inselOrt = JSON.parse(store.get('openWaterInselOrt')) || {}; } catch (e) { inselOrt = {}; } inselOrtAnwenden(); }
function inselOrtAnwenden() {                    // verlegte Basen an ihren Platz (und zurück, wenn der Eintrag fehlt – neue Saison)
    let neu = false;
    for (const isl of islands) {
        const e = inselOrt[isl.id], o = e && isl.type === 'tower' && Number.isFinite(e[0]) && Number.isFinite(e[1]) && landmasses[e[2]] ? e : isl.ort0;
        if (isl.x === o[0] && isl.y === o[1] && isl.landmassId === o[2]) continue;
        if (isl.landmassId !== o[2]) { const alt = islandsByLandmass[isl.landmassId] || [], k = alt.indexOf(isl); if (k >= 0) alt.splice(k, 1); (islandsByLandmass[o[2]] = islandsByLandmass[o[2]] || []).push(isl); }
        isl.x = o[0]; isl.y = o[1]; isl.landmassId = o[2]; neu = true;
        const lm = landmasses[o[2]]; if (lm.tier === 'guardian' || lm.tier === 'throne') midZoneIds.add(isl.id); else midZoneIds.delete(isl.id);
    }
    if (!neu) return;
    TERR.player.clear(); TERR.enemy.clear(); ownVer++; capitalCache = null; BG.valid = false;   // Gebiets-Flächen und Boden neu (die Basis steht woanders)
    if (typeof flushBannerSprites === 'function') flushBannerSprites();
    requestRender();
}
function tpGebiete(vonLm) {                      // die Gebiete, die man von vonLm aus über (offene) Pässe erreicht
    const da = new Set([vonLm]), q = [vonLm], now = Date.now();
    while (q.length) { const a = q.shift();
        for (const br of bridges) { const b = br.a === a ? br.b : br.b === a ? br.a : null;
            if (b === null || da.has(b) || (TELEPORT_NUR_OFFEN && now < passOpensAt(br))) continue; da.add(b); q.push(b); } }
    return da;
}
function tpMarschDa(cap) {                       // hängt ein Marsch an der Hauptstadt (hin, weg, Angriff darauf)?
    const an = m => m && [m.sourceId, m.targetId, m.fromId, m.toId, m.homeId].includes(cap);
    return pendingAttacks.some(an) || pendingSends.some(an) || pendingRetreats.some(an) || fieldMarches.some(an) || barbMarches.some(an) ||
        armies.some(a => a.mv && a.mv.to && a.mv.to.id === cap);
}
function tpGratis(who) {                         // neue Spieler (Anfängerschutz): einmal gratis
    if (who === 'player') return store.get('openWaterTpGratis') !== '1' && neulingBis() > Date.now();
    const b = loadBotState()[who]; return !!b && !b.tpGratis && botNeulingBis(who, b) > Date.now();
}
function tpPruefen(who, x, y) {                  // → null (geht) oder der Grund für den Spieler
    const cap = who === 'player' ? playerIslandId : botCapitalOf(who), c = islandById[cap];
    if (!c || c.type !== 'tower' || !Number.isFinite(x) || !Number.isFinite(y)) return 'Du hast keine Hauptstadt, die umziehen kann.';
    const lmId = gebietAn(x, y), lm = landmasses[lmId];
    if (!lm || Math.abs(x) > FRAME_HALF - 8000 || Math.abs(y) > FRAME_HALF - 8000) return 'Dort ist kein Land.';
    if (lm.tier === 'throne') return 'In die Thron-Mitte kann die Hauptstadt nicht ziehen.';
    if (grenzAbstand(x, y) < KETTE_FREI + BASE_SPACING * .45) return 'Zu nah am Gebirge – such dir einen Platz weiter drinnen.';
    for (const i of islandsByLandmass[lmId] || []) { if (i.id === cap) continue;
        const frei = i.bildR ? i.bildR / .35 * .55 : i.type === 'gate' ? BASE_SPACING * 1.1 : TP_ABSTAND;
        if (Math.hypot(i.x - x, i.y - y) < frei) return 'Zu nah an einer anderen Basis – dort ist kein Platz.'; }
    for (const g of gateSpots) if (g.lm === lmId && (Math.hypot(x - g.x, y - g.y) < BASE_SPACING * 1.1 || segDistW(x, y, g.x, g.y, g.ex, g.ey) < BASE_SPACING * .7)) return 'Zu nah am Pass – dort ist kein Platz.';
    for (const f of resFields) if (Math.hypot(f.x - x, f.y - y) < f.radius + TP_ABSTAND * .6) return 'Dort liegt ein Feld – such dir einen freien Platz.';
    for (const k of barbState.camps || []) if (Math.hypot(k.x - x, k.y - y) < TP_ABSTAND) return 'Dort lagern Barbaren – such dir einen freien Platz.';
    if (!tpGebiete(c.landmassId).has(lmId)) return 'Dorthin führt noch kein offener Pass.';
    if (tpMarschDa(cap)) return 'Erst wenn keine Märsche und kein Angriff mehr an deiner Hauptstadt hängen.';
    return null;
}
function tpVerlegen(who, x, y) {                 // (geprüft, bezahlt) die Hauptstadt steht jetzt bei x, y
    const cap = who === 'player' ? playerIslandId : botCapitalOf(who), c = islandById[cap];
    inselOrt[cap] = [Math.round(x), Math.round(y), gebietAn(x, y)]; store.set('openWaterInselOrt', JSON.stringify(inselOrt)); inselOrtAnwenden();
    if (who === 'player') { statBump('teleports'); revealAround(c.x, c.y, REVEAL_BASE, true); saveProgression(); }
    saveGame(); requestRender();
}
function teleportOrt(x, y) {                     // (Spieler) Tipp auf „Teleportieren“, schon bestätigt → true: unterwegs bzw. erledigt
    const f = tpPruefen('player', x, y); if (f) { flashHint(f, 3500); return false; }
    const gratis = tpGratis('player'), k = gratis ? 0 : TP_GEMS;
    if (gems < k) { flashHint('Teleportieren kostet ' + fmtNum(TP_GEMS) + ' Edelsteine.', 3000); return false; }
    gems -= k; if (gratis) store.set('openWaterTpGratis', '1');
    saveGame(); saveProgression(); updateHud();
    if (alsBefehl('teleport', { x: Math.round(x), y: Math.round(y), gratis })) { flashHint('Die Hauptstadt zieht um …', 3000); return true; }   // (Zuschauer: der Weltrechner verlegt sie)
    tpVerlegen('player', x, y);
    spawnBattleFx(playerIslandId, true, 'Hauptstadt', 'hierher teleportiert');
    flashHint('Die Hauptstadt ist hierher teleportiert – deine Truppen sind mitgekommen.', 3500);
    return true;
}
inselOrtLaden();
document.getElementById('cityCloseBtn').addEventListener('click', closeCity);
document.getElementById('cityInfoBtn').addEventListener('click', e => { const s = document.getElementById('citySheet'); s.classList.toggle('zeig-info'); e.currentTarget.classList.toggle('on', s.classList.contains('zeig-info')); });   // Beschreibung nur auf Tipp (weniger Text)
document.getElementById('citySheetClose').addEventListener('click', () => { cityOpenId = null; document.getElementById('citySheet').hidden = true; });
document.getElementById('cityUpgradeBtn').addEventListener('click', () => {
    if (cityOpenId === '_keep' && AUF) { cityStartBuild('keep'); return; }        // die Burg-Stufe (Bauzeit, Münzen + Rohstoffe) ist die EINE Stufe der Hauptstadt
    if (cityOpenId) cityStartBuild(cityOpenId); });
document.getElementById('citySpeedBtn').addEventListener('click', e => {
    const id = cityBauId(cityOpenId), cost = citySpeedCost(id); if (!cost || gems < cost) return;
    if (!gemsWirklich('speed:' + id, cost, e.currentTarget)) return;
    gems -= cost; saveGame(); updateHud(); cityFinishBuild(true, id);
});
