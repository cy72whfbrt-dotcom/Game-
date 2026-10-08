// Teil 03d-karte-ebenen-tagnacht.js: Karte zeichnen (drawMap: Reihenfolge der Ebenen) und Tag und Nacht
function ownerKeyOf(isl) { const o = islandOwnerOf(isl.id); return o === 'player' ? 'player' : o ? 'bot' : 'neutral'; }
function visibleIslands(view) {
  const out = [];
  for (const lm of landmasses) {
    if (lm.bbox.r < view.l || lm.bbox.l > view.r || lm.bbox.b < view.t || lm.bbox.t > view.b) continue;
    if (!isExplored(lm.id)) continue;                                              // under the fog
    for (const isl of islandsByLandmass[lm.id] || []) {
      if (!islandSeen(isl)) continue;
      const pad = isl.radius * 2.2;
      if (isl.x + pad < view.l || isl.x - pad > view.r || isl.y + pad < view.t || isl.y - pad > view.b) continue;
      out.push(isl);
    }
  }
  return out;
}


// ===== TAG UND NACHT (Paket C) – nur Optik, keine Spielwirkung =====
// Die Karte folgt der Uhrzeit in Berlin – nach der Uhr des Servers (welt.js merkt sich den Unterschied zur Handy-Uhr:
// WELT.uhrVersatz; geht das Handy falsch, zählt die Server-Uhr). Sonnenauf-/-untergang nach der Jahreszeit (grob für
// Berlin). Am Tag nichts, abends Abendrot, nachts dunkler (eine Fläche, „multiplizieren“) mit Lichtern an Basen und
// Burgen und leuchtender Lava; morgens Morgenrot. Billig: Werte nur alle 20 s neu, Leucht-Bilder fertig gemalt, kein
// eigenes Neuzeichnen (die Karte malt in Ruhe ohnehin jede Sekunde), mit „Akku sparen“ weniger Lichter.
const TN = { at: 0, v: null, fmt: null, glow: {} };
function serverJetzt() { const v = window.WELT && WELT.uhrVersatz; return Date.now() + (Math.abs(v) > 90000 ? v : 0); }
function berlinZeit(t) {                            // → { h: Stunde mit Bruchteil, doy: Tag im Jahr, utc: Stunden vor UTC }
  const d = new Date(t);
  try { const f = TN.fmt || (TN.fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hourCycle: 'h23', hour: 'numeric', minute: 'numeric', month: 'numeric', day: 'numeric' }));
    const p = {}; for (const x of f.formatToParts(d)) p[x.type] = parseInt(x.value, 10);
    const h = p.hour + p.minute / 60; return { h, doy: (p.month - 1) * 30.44 + p.day, utc: ((Math.round(h - d.getUTCHours() - d.getUTCMinutes() / 60) % 24) + 24) % 24 }; }
  catch (e) { return { h: d.getHours() + d.getMinutes() / 60, doy: d.getMonth() * 30.44 + d.getDate(), utc: 1 }; }
}
function tagLicht() {                               // → { n: Nacht 0…1, r: Morgen-/Abendrot 0…1, farbe (zum Multiplizieren), licht: Lampen 0…1 }
  const now = performance.now(), test = window.__testStunde;
  if (TN.v && now - TN.at < 20000 && test === undefined) return TN.v;
  const b = berlinZeit(serverJetzt()), h = typeof test === 'number' ? test : b.h;
  const mittag = 12.2 + (b.utc === 2 ? 1 : 0), halb = (12.2 + 4.6 * Math.cos(2 * Math.PI * (b.doy - 172) / 365)) / 2;   // Sommer ~16,8 Std. Tag, Winter ~7,6
  const nach = h < mittag ? mittag - halb - h : h - mittag - halb;                // Stunden nach Sonnenuntergang / vor Sonnenaufgang (< 0: Tag)
  const s = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const n = s((nach + .25) / 1.5), r = Math.max(0, 1 - Math.abs(nach + .15) / 1.1) * (1 - n * .7);
  const mix = (a, c, t) => a.map((v, i) => v + (c[i] - v) * t);
  const col = mix(mix([255, 255, 255], [255, 192, 148], r), [72, 88, 148], n);
  TN.v = { n, r, licht: s((nach + .1) / .8), farbe: 'rgb(' + col.map(Math.round).join(',') + ')' }; TN.at = now;
  return TN.v;
}
function tnGlow(art) {                              // fertiges Leucht-Bild (warm: Fenster, fackel: Fackeln)
  if (TN.glow[art]) return TN.glow[art];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (art === 'fackel') { gr.addColorStop(0, 'rgba(255,245,200,1)'); gr.addColorStop(.25, 'rgba(255,190,90,.8)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); }
  else { gr.addColorStop(0, 'rgba(255,214,140,.75)'); gr.addColorStop(.5, 'rgba(255,170,80,.28)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); }
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (TN.glow[art] = c);
}
function drawNacht(vis, z, view) {                  // nach den Gebäuden, vor den Namensschildern (die bleiben gut lesbar)
  const L = tagLicht(); if (L.n < .02 && L.r < .02) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = L.farbe; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (L.licht > .03) {
    setScreen(ctx); ctx.globalCompositeOperation = 'lighter';
    let rest = akkuSparen ? 160 : 1400;                                           // höchstens so viele Lichter pro Bild
    const warm = tnGlow('warm'), fackel = tnGlow('fackel');                      // (Lava gibt es seit der Karte wie RoK nicht mehr)
    for (const isl of vis) {                                                      // Fenster und Fackeln an Basen, Burgen und Tempeln
      if (rest <= 0) break;
      const ow = islandOwnerOf(isl.id); if (!ow && isl.type === 'tower') continue;                     // leere Basen bleiben dunkel
      const size = 2 * isl.radius * z * 1.5 * (isl.type === 'tower' ? 1 : 1.3), x = toSX(isl.x), y = toSY(isl.y);
      if (x < -size * 2 || x > viewW + size * 2 || y < -size * 2 || y > viewH + size * 2) continue;
      rest--; ctx.globalAlpha = L.licht * (ow ? 1 : .6);
      const R = Math.max(4, size * .75); ctx.drawImage(warm, x - R, y - size * .2 - R, R * 2, R * 2);
      if (size >= 18 && !akkuSparen) { const f = Math.max(3, size * .16);                             // zwei Fackeln am Tor
        for (const dx of [-.4, .4]) ctx.drawImage(fackel, x + dx * size - f, y + size * .08 - f, f * 2, f * 2); }
    }
  }
  ctx.restore();
}
function drawMap() {
  const now = performance.now(), wallNow = Date.now();
  const z = mapState.zoom;                                                       // viewW/viewH are owned by sizeBackingStore() (§6)
  const view = { l: -mapState.offsetX / z, t: -mapState.offsetY / z, r: (viewW - mapState.offsetX) / z, b: (viewH - mapState.offsetY) / z };
  const viewPad = { l: view.l - ISLAND_RADIUS * 2, t: view.t - ISLAND_RADIUS * 2, r: view.r + ISLAND_RADIUS * 2, b: view.b + ISLAND_RADIUS * 2 };
  liveAnimation = false; marchTokens = [];
  const shake = mapBattleShake(now); if (shake) { mapState.offsetX += shake.x; mapState.offsetY += shake.y; }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const dirty = ownershipDelta();                                                 // what a capture can have changed
  refreshTerritory();                                                            // rebuild only chunks whose ownership changed
  if (dirty && BG.valid) for (const d of dirty) repaintBackgroundRect(d);        // partial repaints, clipped (no full re-render)
  drawBackground();                                                              // 1-4: sea, land, bridges, territory
  drawToreImNebel(view, z);                                                      // (unerforschte Pass-Tore: Lücke in der Kette nicht leer, Nebel darüber)
  drawFog(view, now);
  drawWorldFrame();                                                            // Nebel des Krieges over unexplored islands
  drawUebersichtZeichen(z);                                                      // ganz weit: Pass-Punkte, Zonen-Nummern, Thron und Tempel (wie die Karten-Testdatei)
  const vis = visibleIslands(viewPad);
  drawRings(vis, z, now);                                                        // 5
  for (const a of pendingAttacks) { if (a.attackerBotId && islandOwnerOf(a.targetId) !== 'player' && !mzWartetBeiMir(a, wallNow)) continue;   // fog of war (unchanged; wer an deinem Kampf wartet, steht sichtbar davor)
    if (a.fightEndsAt) continue;                                                                                     // the fight is on - the battle shows it
    drawMarchLine(a.attackerBotId ? 'incoming' : 'attack', islandById[a.sourceId], islandById[a.targetId], a.startedAt, a.resolveAt, wallNow, null, a.attackerBotId ? null : marchKeyOf(a), a.attackerBotId || 'player', a); }
  for (const s of pendingSends) {
    if (s.senderBotId) {                                                     // fremde Märsche: nur Bündnis-Mitglieder, die zu DIR kommen (Rally, Hilfe, Verstärkung) – sonst Nebel wie bisher
      if (!bundFreund(s.senderBotId, 'player') || (!s.back && islandOwnerOf(s.toId) !== 'player')) continue;   // (auch ihre Rückwege nach Hause – z. B. nach einer gemeinsamen Rally)
      drawMarchLine(s.back ? 'retreat' : 'send', islandById[s.fromId], islandById[s.toId], s.startedAt, s.resolveAt, wallNow, null, null, s.senderBotId, s); continue; }
    drawMarchLine('send', islandById[s.fromId], islandById[s.toId], s.startedAt, s.resolveAt, wallNow, null, marchKeyOf(s)); }
  for (const s of pendingScouts) drawMarchLine('scout', islandById[s.sourceId], islandById[s.targetId], s.startedAt, s.resolveAt, wallNow, null, marchKeyOf(s));   // (antippen: Zurück/Schneller wie jeder Marsch)
  for (const s of botScoutsOnMap) drawMarchLine('enemyScout', islandById[s.sourceId], islandById[s.targetId], s.startedAt, s.resolveAt, wallNow);   // a bot's scout coming to look at you
  for (const r of pendingRetreats) drawMarchLine('retreat', islandById[r.fromId], islandById[r.toId], r.startedAt, r.resolveAt, wallNow, r.path, marchKeyOf(r));   // 6
  setScreen(ctx);
  if (typeof bundKarteUnten === 'function') bundKarteUnten(vis, z);                                                    // Bündnis-Gebiet: zart in der Bündnisfarbe
  drawBaseAuras(vis, z, now);                                                                                          // level + title auras under the towers
  drawThronePlaza(z, now);                                                                                             // the Thronplatz around the Mega-Tempel
  drawResFields(now, wallNow);                                                                                          // gold mines and gem veins
  drawBarb(now, wallNow); drawEvents(now, wallNow);                                                                                               // Barbaren-Lager, the Tagesboss and the columns on their way
  drawArmies(now, wallNow);                                                                                             // your armies out in the open
  for (const isl of vis.slice().sort((a, b) => a.y - b.y)) drawBuilding(isl, ownerKeyOf(isl), z);                    // 7
  drawThroneFx(z, now);
  drawBaseSparks(vis, z, now);
  drawBasisSchilder(vis, z);                                                                                           // Namensschilder der Basen: über Kuppel und Funken (immer lesbar)
  drawWander(now);                                                                                                     // the Kriegsherr and his host
  drawNacht(vis, z, viewPad);                                                                                          // Paket C: Abendrot, Nacht, Lichter
  if (typeof drawHaendler === 'function') drawHaendler();                                                              // Paket C: der Karren des wandernden Händlers (haendler.js)
  const plates = layoutBanners(vis, z, isPanelOpen(popup) ? popupIslandId : null);
  drawMarchTokens();                                                                                                   // 8 tokens (clear of the plates)
  paintBanners(plates);                                                                                                // 9 nameplates on top
  drawArmyCamps(now);                                                                                                  // armies camping in the field
  drawRulerCrowns(plates);
  drawDragonName(wallNow);                                                                                             // Drachen-Name über der Thron-Kuppel
  drawTitleBadges(z, now);                                                                                             // crown on the ruler's plates
  drawWander(now, true);
  drawMarchChips();                                                                                                    // 10 countdown chips
  drawMarchButtons();
  drawPasses(view, now);                                                                                               // chained, time-locked bridges
  drawPickups(now);                                                                                                    // 11 mini-event pickups
  drawHeimWappen(z);                                                                                                   // ganz draußen: Wappen an der Hauptstadt, über allem
  drawMapBattles(now);                                                                                                 // fights playing out at the bases
  drawThroneShots(now);                                                                                                // the Wächter-Tempel firing on the throne
  drawMarkers();                                                                                                       // your own Wegmarken
  feldRingFrame();                                                                                                     // Tipp auf freies Feld: Nadel + Knöpfe
  if (typeof bundKarteOben === 'function') bundKarteOben(z, now);                                                      // Bündnis: Signale und Rally-Fahnen
  drawBattleFx(now);                                                                                                   // 13 battle flashes + "Sieg!"
  if (shake) { mapState.offsetX -= shake.x; mapState.offsetY -= shake.y; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

