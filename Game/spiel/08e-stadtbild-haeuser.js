// Teil 08e-stadtbild-haeuser.js: Stadtansicht als KI-Bild: Gebäude-Orte, Kamera, Wischen/Zoomen, Tippen
// ===== DIE STADT ALS BILD (Alexander 7.10.: „KI-Bilder statt Code“) =====
// Die ganze Hauptstadt ist EIN gemaltes Bild (bilder/stadt_gross.webp, 1536 × 1024): Burg, Labor, Krankenhaus, Markt, Heldenhalle,
// Botschaft, Schmiede, Holzfäller, Steinbruch, Eisenmine und die Mauer ringsum. Das Bild füllt den Bildschirm (Handy hoch: breiter
// als der Bildschirm – wischen), Finger/Mausrad zoomen. Über jedem Gebäude ein Schild „Name / Stufe N“ (08f), Tippen öffnet es.
const CITY_BILD_W = 1536, CITY_BILD_H = 1024;
// Gebäude im Bild (Prozent): [Mitte x, Mitte y, Breite, Höhe, Schild y] – die Mitte trifft das Gebäude, das Schild sitzt darunter
const CITY_ORTE = {
    _keep:    [49, 21, 34, 36, 31],
    academy:  [16, 18, 22, 24, 27],
    forge:    [87, 24, 23, 21, 32],
    hospital: [17, 45, 22, 23, 53],
    wall:     [40, 43, 16, 14, 47],
    heroes:   [70, 47, 17, 25, 57],
    embassy:  [89, 50, 18, 25, 59],
    market:   [43, 59, 22, 16, 66],
    lumber:   [15, 73, 25, 18, 80],
    quarry:   [40, 84, 29, 22, 86],
    mine:     [85, 82, 23, 28, 86]
};
const cityOrt = id => { const o = CITY_ORTE[id]; return o && { x: o[0] / 100 * CITY_BILD_W, y: o[1] / 100 * CITY_BILD_H, w: o[2] / 100 * CITY_BILD_W, h: o[3] / 100 * CITY_BILD_H, sy: o[4] / 100 * CITY_BILD_H }; };
let cityCam = null, cityPointers = new Map(), cityGesture = null;
const CITY_BILD = { img: null, laedt: false };
function cityBild() {                                                        // das Stadtbild – lädt beim ersten Mal
    if (!CITY_BILD.laedt) { CITY_BILD.laedt = true; const im = new Image();
        im.onload = () => { if (!im.naturalWidth) return; CITY_BILD.img = im; cityFrame.drawn = 0; if (cityOpenId && !document.getElementById('citySheet').hidden) renderCitySheet(); };
        im.src = 'bilder/stadt_gross.webp'; }
    return CITY_BILD.img;
}

// ---- Kamera: Bild-Punkte; das Bild deckt immer den ganzen Bildschirm (auch hinter HUD und Leiste) ----
const cityZMin = (W, H) => Math.max(W / CITY_BILD_W, H / CITY_BILD_H);
function cityStartZoom(W, H) { return cityZMin(W, H); }
function cityClampCam(W, H) {
    const c = cityCam, zMin = cityZMin(W, H);
    c.z = Math.max(zMin, Math.min(Math.max(1.6, zMin * 2.5), c.z));
    const hw = W / 2 / c.z, hh = H / 2 / c.z;
    c.x = Math.max(hw, Math.min(CITY_BILD_W - hw, c.x)); c.y = Math.max(hh, Math.min(CITY_BILD_H - hh, c.y));
}
function cityFocus(id, now) {                                               // die Kamera gleitet (oder springt) zum Gebäude
    const o = cityOrt(id); if (!o || !cityCam) return;
    cityCam.tx = o.x; cityCam.ty = o.y;
    if (now) { cityCam.x = cityCam.tx; cityCam.y = cityCam.ty; cityCam.tx = cityCam.ty = undefined; }
}
// Handy hoch: das Bild ist breiter als der Bildschirm (Heldenhalle, Botschaft … liegen rechts) – beim ersten Betreten kurz „‹ Wischen ›“
let cityWischGezeigt = false;
function cityWischZeigen() {
    const el = document.getElementById('cityWisch'); if (!el || cityWischGezeigt || cityZMin(innerWidth, innerHeight) * CITY_BILD_W < innerWidth * 1.15) return;
    cityWischGezeigt = true; el.hidden = false; setTimeout(cityWischWeg, 6000);
}
function cityWischWeg() { const el = document.getElementById('cityWisch'); if (el) el.hidden = true; }

// ---- wischen, mit zwei Fingern oder dem Mausrad zoomen, tippen ----
cityCanvas.addEventListener('pointerdown', e => {
    cityWischWeg();
    if (e.isPrimary) { cityPointers.clear(); cityGesture = null; }             // ein neuer erster Finger: Reste von vorher sind weg
    try { cityCanvas.setPointerCapture(e.pointerId); } catch (err) {}
    cityPointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (cityCam) cityCam.tx = cityCam.ty = undefined;
    if (cityPointers.size === 1) cityDrag = { x: e.clientX, y: e.clientY, cx: cityCam && cityCam.x, cy: cityCam && cityCam.y, moved: false };
    else if (cityPointers.size === 2) { const [a, b] = [...cityPointers.values()]; cityGesture = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cityCam.z }; if (cityDrag) cityDrag.moved = true; }
});
cityCanvas.addEventListener('pointermove', e => {
    if (!cityPointers.has(e.pointerId) || !cityCam) return;
    cityPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (cityPointers.size >= 2 && cityGesture) { const [a, b] = [...cityPointers.values()]; cityCam.z = cityGesture.z * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, cityGesture.d); return; }
    if (!cityDrag) return;
    const dx = e.clientX - cityDrag.x, dy = e.clientY - cityDrag.y;
    if (Math.hypot(dx, dy) > 8) cityDrag.moved = true;
    if (cityDrag.moved) { cityCam.x = cityDrag.cx - dx / cityCam.z; cityCam.y = cityDrag.cy - dy / cityCam.z; }
});
const cityPointerEnd = e => { cityPointers.delete(e.pointerId); if (cityPointers.size < 2) cityGesture = null;
    if (!cityPointers.size) setTimeout(() => { cityDrag = null; }, 0);
    else if (cityPointers.size === 1 && cityCam) { const [p] = [...cityPointers.values()]; cityDrag = { x: p.x, y: p.y, cx: cityCam.x, cy: cityCam.y, moved: true }; } };
cityCanvas.addEventListener('pointerup', cityPointerEnd);
cityCanvas.addEventListener('pointercancel', cityPointerEnd);
cityCanvas.addEventListener('wheel', e => { if (!cityCam) return; e.preventDefault(); cityCam.z *= Math.exp(-e.deltaY * .0015); }, { passive: false });
cityCanvas.addEventListener('click', e => {
    if (cityDrag && cityDrag.moved) return;       // das war Wischen, kein Tippen
    const r = cityCanvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const hits = cityHitRects.filter(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const hit = hits.sort((a, b) => Math.hypot(a.cx - x, a.cy - y) - Math.hypot(b.cx - x, b.cy - y))[0];   // Schild oder Gebäude am nächsten am Finger
    if (hit && hit.id !== cityRingId) { cityFocus(hit.id); cityRingAuf(hit.id); }   // erst die runden Knöpfe am Gebäude (wie in Rise of Kingdoms)
    else { cityRingZu(); cityOpenId = null; document.getElementById('citySheet').hidden = true; }
    cityFrame.drawn = 0;
});
