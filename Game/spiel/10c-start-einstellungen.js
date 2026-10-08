// Teil 10c-start-einstellungen.js: Ladebild, Musik, Einstellungen, Live-Anzeige
// ===== LOADING SCREEN =====
// Shown from the first paint (markup + CSS); the bar runs to ~72 % on its own while the
// world is generated, then finishes here and fades into the map (min. ~2 s on screen).
// ===== MUSIK: generated live with Web Audio - no files to load. A calm medieval piece in D minor: a low drone,
// a lute that picks the chords, a soft frame drum and now and then a flute over it, all in a little stone-hall reverb.
// Starts with the first tap (browsers only allow sound after one), remembers on/off.
const Music = (() => {
    // sound: 'all' (music + effects), 'sfx' (effects only), 'off'. Older saves only knew music on/off.
    let mode = store.get('openWaterSound') || 'all';
    let ac = null, master = null, fx = null, verb = null, timer = null, nextAt = 0, step = 0, bar = 0, on = mode === 'all';
    const BPM = 70, EIGHTH = 60 / BPM / 2;
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    // i - VII - VI - VII in D minor, then i - iv - VII - i (as MIDI notes: root, third, fifth, octave)
    const CHORDS = [[50, 53, 57, 62], [48, 52, 55, 60], [46, 50, 53, 58], [48, 52, 55, 60], [50, 53, 57, 62], [55, 58, 62, 67], [48, 52, 55, 60], [50, 53, 57, 62]];
    const PICK = [0, 2, 1, 3, 2, 1, 3, 2];                          // the lute's pattern over the four chord tones
    const FLUTE = [62, 64, 65, 67, 69, 72, 74];                      // D dorian-ish, high
    function impulse(sec) { const len = ac.sampleRate * sec, b = ac.createBuffer(2, len, ac.sampleRate);
        for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); } return b; }
    function init() {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
        fx = ac.createGain(); fx.gain.value = .8; fx.connect(ac.destination);
        verb = ac.createConvolver(); verb.buffer = impulse(2.6); const wet = ac.createGain(); wet.gain.value = .32; verb.connect(wet); wet.connect(master);
        fxVerb = ac.createConvolver(); fxVerb.buffer = impulse(1.4); const fxWet = ac.createGain(); fxWet.gain.value = .25; fxVerb.connect(fxWet); fxWet.connect(fx);
        // the drone: D and A, soft saws through a slowly breathing low-pass
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = .7;
        const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = .05; lfoG.gain.value = 140; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
        const dg = ac.createGain(); dg.gain.value = .05; lp.connect(dg); dg.connect(master); dg.connect(verb);
        for (const [m, det] of [[38, -4], [45, 3], [50, 0]]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det; o.connect(lp); o.start(); }
    }
    function out(node, dry, wetAmt) { const g = ac.createGain(); g.gain.value = dry; node.connect(g); g.connect(master); const w = ac.createGain(); w.gain.value = wetAmt; node.connect(w); w.connect(verb); }
    function lute(m, t, vel) {                                       // a plucked string: bright attack, fast decay
        const o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
        o.type = 'triangle'; o2.type = 'sawtooth'; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 1.002;
        f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(500, t + .5);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16 * vel, t + .008); g.gain.exponentialRampToValueAtTime(.0008, t + 1.6);
        const g2 = ac.createGain(); g2.gain.value = .25; o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); out(g, .9, .5);
        o.start(t); o2.start(t); o.stop(t + 1.7); o2.stop(t + 1.7);
    }
    function drum(t, vel) {                                          // frame drum: a low thump and a little skin noise
        const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + .25);
        g.gain.setValueAtTime(.32 * vel, t); g.gain.exponentialRampToValueAtTime(.001, t + .45); o.connect(g); out(g, .8, .25); o.start(t); o.stop(t + .5);
        const n = ac.createBufferSource(), nb = ac.createBuffer(1, ac.sampleRate * .15, ac.sampleRate), d = nb.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const nf = ac.createBiquadFilter(), ng = ac.createGain(); nf.type = 'bandpass'; nf.frequency.value = 900; ng.gain.value = .05 * vel;
        n.buffer = nb; n.connect(nf); nf.connect(ng); out(ng, .8, .3); n.start(t);
    }
    function flute(m, t, dur) {                                      // breathy sine with a slow vibrato
        const o = ac.createOscillator(), v = ac.createOscillator(), vg = ac.createGain(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = hz(m); v.frequency.value = 5; vg.gain.value = hz(m) * .006; v.connect(vg); vg.connect(o.frequency);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .12); g.gain.setValueAtTime(.07, t + dur - .15); g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g); out(g, .7, .7); o.start(t); v.start(t); o.stop(t + dur + .05); v.stop(t + dur + .05);
    }
    // ===== EFFECTS: short, muted sounds for what happens - built from the same simple parts as the music
    let fxVerb = null; const lastFx = {};
    function fo(node, dry, wetAmt) { const g = ac.createGain(); g.gain.value = dry; node.connect(g); g.connect(fx); if (wetAmt) { const w = ac.createGain(); w.gain.value = wetAmt; node.connect(w); w.connect(fxVerb); } }
    function tone(type, f, t, dur, vol, opt = {}) {
        const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
        if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + (opt.a || .01)); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
        let n = o; if (opt.lp) { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = opt.lp; o.connect(f2); n = f2; }
        n.connect(g); fo(g, 1, opt.wet || 0); o.start(t); o.stop(t + dur + .05);
    }
    function noise(t, dur, vol, type, freq, q) {
        const n = ac.createBufferSource(), nb = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = nb.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
        const f = ac.createBiquadFilter(), g = ac.createGain(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1; g.gain.value = vol;
        n.buffer = nb; n.connect(f); f.connect(g); fo(g, 1, .2); n.start(t);
    }
    function horn(t, notes, len, vol) {                           // a brass horn: two detuned saws through a warm filter, a little rise
        notes.forEach((m, i) => { const tt = t + i * len * .9;
            for (const [type, det] of [['sawtooth', -5], ['sawtooth', 6], ['square', 0]]) {
                const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = type; o.detune.value = det;
                o.frequency.setValueAtTime(hz(m) * .985, tt); o.frequency.linearRampToValueAtTime(hz(m), tt + .07);
                f.type = 'lowpass'; f.frequency.setValueAtTime(500, tt); f.frequency.linearRampToValueAtTime(1500, tt + .1); f.frequency.linearRampToValueAtTime(900, tt + len);
                g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(vol * (type === 'square' ? .35 : .5), tt + .06); g.gain.setValueAtTime(vol * .45, tt + len * .8); g.gain.linearRampToValueAtTime(0, tt + len);
                o.connect(f); f.connect(g); fo(g, 1, .5); o.start(tt); o.stop(tt + len + .05); } });
    }
    const FX = {
        attack: t => horn(t, [50, 57], .32, .09),                                       // troops march out: a short call
        send: t => { for (let i = 0; i < 3; i++) tone('sine', 110, t + i * .16, .18, .12, { to: 70 }); },   // marching drum
        scout: t => { tone('sine', 1300, t, .12, .03, { to: 1700 }); tone('sine', 1700, t + .1, .15, .025); },
        warn: t => horn(t, [45, 45, 48], .38, .12),                                     // someone marches on your base
        clash: t => { for (let i = 0; i < 4; i++) { const tt = t + i * (.18 + Math.random() * .12);
            for (const f of [2100, 3350, 5230]) tone('sine', f * (.95 + Math.random() * .1), tt, .25, .018, { wet: .4 }); noise(tt, .07, .06, 'highpass', 2500); } },
        victory: t => horn(t, [62, 66, 69, 74], .22, .1),                              // D major, up
        defeat: t => { tone('sine', 70, t, .7, .3, { to: 42 }); tone('sine', 70, t + .45, .8, .25, { to: 40 }); horn(t + .2, [53, 50], .45, .06); },
        event: t => horn(t, [45, 52, 57], .45, .11),
        crown: t => { horn(t, [62, 66, 69], .2, .1); horn(t + .62, [74], .9, .11); },
        upgrade: t => { noise(t, .06, .25, 'bandpass', 1800, 2); tone('sine', 160, t, .12, .2, { to: 90 }); noise(t + .22, .06, .2, 'bandpass', 2000, 2); tone('sine', 150, t + .22, .12, .16, { to: 85 }); },
        coin: t => { tone('sine', 1760, t, .18, .05, { wet: .3 }); tone('sine', 2350, t + .07, .25, .045, { wet: .3 }); },
        gem: t => { [2093, 2637, 3136].forEach((f, i) => tone('sine', f, t + i * .05, .3, .035, { wet: .5 })); },
        crate: t => { [587, 740, 880, 1175, 1480].forEach((f, i) => tone('triangle', f, t + i * .07, .5, .05, { wet: .6 })); noise(t, .35, .04, 'highpass', 6000); },
        click: t => noise(t, .025, .05, 'bandpass', 2600, 3),
        move: t => tone('sine', 520, t, .15, .03, { to: 700 }),
    };
    const GAP = { click: 60, coin: 90, clash: 900, warn: 6000, attack: 250, send: 250 };
    function play(name) {
        if (mode === 'off' || !FX[name]) return;
        const now = performance.now(); if (now - (lastFx[name] || 0) < (GAP[name] || 150)) return; lastFx[name] = now;
        if (!ac) init();
        if (ac.state === 'suspended') ac.resume();
        FX[name](ac.currentTime + .02);
    }
    window.__sfx = play;
    let phrase = null;
    function schedule() {
        while (nextAt < ac.currentTime + .4) {
            const chord = CHORDS[bar % CHORDS.length], t = nextAt, s8 = step % 8;
            if (!(s8 === 7 && Math.random() < .35)) lute(chord[PICK[s8]] + (s8 === 0 ? -12 : 0), t, s8 === 0 ? 1 : .55 + Math.random() * .3);
            if (s8 === 0 || (s8 === 4 && Math.random() < .7)) drum(t, s8 === 0 ? 1 : .6);
            if (s8 === 0 && bar % 16 >= 8) {                          // the flute joins every other section with a short phrase
                if (bar % 2 === 0) phrase = Array.from({ length: 3 }, () => FLUTE[Math.floor(Math.random() * FLUTE.length)]);
                if (phrase && Math.random() < .8) phrase.forEach((m, i) => flute(m, t + i * EIGHTH * 2, EIGHTH * 2.2));
            }
            nextAt += EIGHTH * (s8 % 2 ? .94 : 1.06); step++;         // a little swing, like a person playing
            if (step % 8 === 0) bar++;
        }
    }
    function fade(to, sec) { const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(to, t + sec); }
    function start() {
        if (!on) return;
        if (!ac) init();
        if (ac.state === 'suspended') ac.resume();
        if (!timer) { nextAt = ac.currentTime + .1; timer = setInterval(schedule, 100); }
        fade(.6, 2.5);
    }
    function stop() { if (!ac) return; fade(0, .6); clearInterval(timer); timer = null; if (mode === 'off') setTimeout(() => { if (!timer && ac && mode === 'off') ac.suspend(); }, 700); }
    function toggle() {                                            // three steps: music + effects → effects only → off (Profil → Einstellungen → Ton)
        mode = mode === 'all' ? 'sfx' : mode === 'sfx' ? 'off' : 'all'; store.set('openWaterSound', mode);
        on = mode === 'all'; on ? start() : stop();
        flashHint(mode === 'all' ? 'Musik und Effekte an' : mode === 'sfx' ? 'Nur Effekte – Musik aus' : 'Ton aus', 1800);
        if (mode !== 'off') { if (!ac) init(); if (ac.state === 'suspended') ac.resume(); }
    }
    document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) { clearInterval(timer); timer = null; ac.suspend(); } else if (on) start(); else if (mode !== 'off') ac.resume(); });
    const first = e => { window.removeEventListener('pointerdown', first, true); window.removeEventListener('keydown', first, true); start(); if (mode === 'sfx') { if (!ac) init(); ac.resume(); } };
    window.addEventListener('pointerdown', first, true); window.addEventListener('keydown', first, true);
    function setMode(m) { if (!['all', 'sfx', 'off'].includes(m) || m === mode) return; mode = m === 'all' ? 'off' : m === 'sfx' ? 'all' : 'sfx'; toggle(); }   // (Einstellungen) – über toggle, damit alles gleich bleibt
    return { toggle, start, stop, setMode, get on() { return on; }, get mode() { return mode; } };
})();

// ===== EINSTELLUNGEN (Profil → Einstellungen): Benachrichtigungen (benachrichtigung.js), Ton, Akku sparen, Konto, Hilfe =====
function einstellungenZeigen() {
    if (!isPanelOpen(profilePopup) || profilePopup.dataset.tab !== 'set') return;
    for (const b of document.querySelectorAll('#setTon [data-ton]')) { const on = b.dataset.ton === Music.mode; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
    document.getElementById('setAkku').checked = akkuSparen;
    setText(document.getElementById('setName'), profileName.value || '–');
    const nr = (window.__OW || {}).uid, nrEl = document.getElementById('setNr');
    setText(nrEl, String(nr || '')); nrEl.parentElement.style.display = nr ? '' : 'none';   // ohne Konto (Vorschau) keine leere Zeile „–“
    if (!window.__OW) setText(document.getElementById('pushText'), 'Benachrichtigungen gibt es nur nach der Anmeldung.');   // (benachrichtigung.js braucht den Server)
    setText(document.getElementById('setVersion'), spielVersion());
}
// Version: Zeit von spiel.js auf dem Server (window.__OW.version) – sonst aus der Skript-Adresse: spiel.js?v=<Zeit>
// oder verkleinert skript.php?d=spiel&v=<Anfang der sha1> (Vorschau: klein/spiel.js?v=<sha1>) → die ersten 7 Zeichen
function spielVersion() {
    const sc = [...document.scripts].find(s => /(^|\/)spiel\.js\?|[?&]d=spiel(&|$)/.test(s.src)), v = sc && /[?&]v=([0-9a-f]+)/.exec(sc.src);
    const t = +(window.__OW || {}).version || (v && /^\d{10}$/.test(v[1]) ? +v[1] : 0);
    return t ? new Date(t * 1000).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : v ? v[1].slice(0, 7) : '–';
}
document.querySelector('#tabSet .p5-sprung').addEventListener('click', e => { const b = e.target.closest('[data-sprung]'); if (!b) return;   // Sprung zu einer Gruppe
    const z = document.getElementById(b.dataset.sprung), pb = profilePopup.querySelector('.pbody'); if (z) pb.scrollTop += z.getBoundingClientRect().top - pb.getBoundingClientRect().top - 8; });
document.getElementById('setTon').addEventListener('click', e => { const b = e.target.closest('[data-ton]'); if (!b) return; Music.setMode(b.dataset.ton); einstellungenZeigen(); });
document.getElementById('setAkku').addEventListener('change', e => {
    akkuSparen = e.target.checked; store.set('openWaterAkku', akkuSparen ? '1' : '0'); onViewportResize();
    flashHint(akkuSparen ? 'Akku sparen: an' : 'Akku sparen: aus', 1500);
});
document.getElementById('setNameBtn').addEventListener('click', () => {   // der Name steht oben im Profil
    showProfileTab('info'); setTimeout(() => { profileName.focus(); profileName.select(); }, 50);
});
document.getElementById('setPwOffen').addEventListener('click', () => { const f = document.getElementById('setPwForm'); f.hidden = !f.hidden; if (!f.hidden) document.getElementById('setPwAlt').focus(); });
document.getElementById('setPwForm').addEventListener('submit', async e => {
    e.preventDefault();
    const alt = document.getElementById('setPwAlt'), neu = document.getElementById('setPwNeu'), neu2 = document.getElementById('setPwNeu2'), knopf = e.target.querySelector('button[type=submit]');
    if (neu.value.length < 10 || neu.value.length > 72) { flashHint('Das neue Passwort braucht 10 bis 72 Zeichen.', 3000); return; }
    if (neu.value !== neu2.value) { flashHint('Die beiden neuen Passwörter sind nicht gleich.', 3000); return; }   // (ein Tippfehler – und das Konto wäre weg)
    if (knopf.disabled) return; knopf.disabled = true;
    try {
        let geraet = '';                              // dieses Gerät behält seine Handy-Nachrichten (nur die anderen hören auf)
        try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); const sub = reg && reg.pushManager && await reg.pushManager.getSubscription(); if (sub) geraet = sub.endpoint; } catch (x) {}
        const r = await fetch('server.php', { method: 'POST', headers: { 'X-Open-Water': '1', 'Content-Type': 'application/json' }, credentials: 'same-origin', cache: 'no-store', body: JSON.stringify({ aktion: 'passwort', alt: alt.value, neu: neu.value, geraet }) });
        const a = await r.json();
        if (!a.ok) { flashHint(a.grund || 'Das hat nicht geklappt.', 3500); return; }
        alt.value = ''; neu.value = ''; neu2.value = ''; document.getElementById('setPwForm').hidden = true;
        flashHint('Passwort geändert. Andere Geräte sind jetzt abgemeldet.', 4000);
    } catch (x) { flashHint('Das hat nicht geklappt – bitte nochmal.', 3000); } finally { knopf.disabled = false; }
});
document.addEventListener('click', e => { const bt = e.target.closest && e.target.closest('button'); if (bt && !bt.disabled) sfx('click'); }, true);   // a soft wooden click on every button

(function finishSplash() {
    const sp = document.getElementById('splash');
    if (!sp) return;
    const skip = navigator.webdriver && !window.__FORCE_SPLASH;          // automated tests
    if (skip) { if (window.__stopSplashScene) window.__stopSplashScene(); sp.remove(); splashDone(); return; }
    const statusEl = document.getElementById('splashStatus');   // (Tipps und Prozent laufen im eigenen Skript des Ladebilds)
    const steps = ['Welt wird erschaffen …', 'Inseln werden besiedelt …', 'Truppen werden gerüstet …', 'Bereit'];
    const wait = Math.max(0, 2600 - performance.now());
    steps.slice(1, 3).forEach((t, i) => setTimeout(() => { statusEl.textContent = t; }, wait * (i + 1) / 3));
    setTimeout(() => {
        const fill = document.getElementById('splashFill');
        fill.style.width = getComputedStyle(fill).width;             // freeze the CSS animation where it is …
        sp.classList.add('is-done');
        requestAnimationFrame(() => { fill.style.width = '100%'; }); // … and finish from there
        setTimeout(() => {
            statusEl.textContent = steps[3];                         // „Bereit“ erst, wenn der Balken voll ist
            sp.classList.add('is-leaving');
            splashDone();
            setTimeout(() => { if (window.__stopSplashScene) window.__stopSplashScene(); sp.remove(); }, 800);
        }, 900);
    }, wait);
})();

exploreOwned();                          // Nebel: the land around every own base is always known
renderActiveMarches();
if (bonusGrantedAtBoot) saveGame();      // a reload right after the first start must not lose the grant
updateZoomBounds(); clampCamera();
requestAnimationFrame(frame);

// Nichts markieren und kein Kopieren-Menü beim langen Drücken (außer in Eingabefeldern)
const feldErlaubt = t => t && t.closest && t.closest('input,textarea,select,[contenteditable]');
document.addEventListener('selectstart', e => { if (!feldErlaubt(e.target)) e.preventDefault(); });
document.addEventListener('contextmenu', e => { if (!feldErlaubt(e.target)) e.preventDefault(); });

// ===================================================================================================================
// ===== LIVE-ANZEIGE: was offen ist, zieht von selbst nach =====
// ===================================================================================================================
// Jede Sekunde – und gleich nach neuen Welt-Daten oder Münzen vom Server, aber höchstens 1× pro Sekunde – werden NUR die
// gerade sichtbaren Fenster neu gerechnet. liveHtml schreibt davon nur, was sich wirklich geändert hat (kein Flackern,
// Knöpfe bleiben antippbar, die Scroll-Position bleibt), die Restzeiten (uhrHtml) zählen von selbst herunter.
// Läuft eine Restzeit ab (z. B. der Friedensschild), stellt das Fenster beim nächsten Schritt um.
let liveZuletzt = 0, liveWartet = 0, liveTitelVer = -1, liveRangAt = 0, liveSkillSig = '', liveGemeldet = false;
function liveBald() {                                  // neue Daten: gleich nachziehen, aber höchstens 1× pro Sekunde
    if (liveWartet) return;
    liveWartet = setTimeout(() => { liveWartet = 0; liveTick(); }, Math.max(0, liveZuletzt + 1000 - Date.now()));
}
function liveTick() {
    if (SYSTEM || document.hidden) return;              // (der Weltrechner zeigt nichts an, ein Tab im Hintergrund auch nicht)
    liveZuletzt = Date.now();
    const offen = id => { const el = document.getElementById(id); return !!el && !el.hidden; };
    const teil = f => { try { f(); } catch (e) { if (!liveGemeldet) { liveGemeldet = true; console.warn('Live-Anzeige:', e); } } };
    if (!cityView.hidden && cityOpenId && offen('citySheet')) teil(renderCitySheet);                    // Burg / Gebäude: Schild, Kosten, Knopf
    if (isPanelOpen(popup) && popupIslandId !== null) teil(renderPopup);                                  // Inselfenster
    if (welcomeLive) teil(welcomeNachziehen);                                                               // Begrüßung
    if (isPanelOpen(profilePopup)) teil(() => {                                                             // Profil
        renderProfile(true);
        const tab = profilePopup.dataset.tab;
        if (tab === 'equip') renderEquipGrid();
        if (tab === 'skills') { const sig = skillPoints + JSON.stringify(skills); if (sig !== liveSkillSig) { liveSkillSig = sig; renderSkillGrid(); } }
    });
    if (isPanelOpen(shopPopup)) teil(renderShop);                                                         // Shop: Gems, Schild-Restzeit, Thron-Punkte
    teil(renderRucksack);                                                                                   // Rucksack: Schild-Restzeit, Vorrat, Splitter
    if (isPanelOpen(goalsPopup) && goalsTab === 'reward') teil(renderInbox);                              // Events → Belohnung
    if (isPanelOpen(rankPopup) && liveZuletzt - liveRangAt >= 5000) { liveRangAt = liveZuletzt; teil(renderRankings); }   // Rangliste: alle 5 s reicht
    teil(heroHallLive);                                                                                     // Helden
    if (offen('lookSheet')) teil(() => renderLookSheet(true));                                             // Aussehen: Gems / Thron-Punkte
    if (fieldSheetId !== null && fieldById[fieldSheetId] && offen('fieldSheet')) teil(() => openFieldSheet(fieldById[fieldSheetId]));
    if (offen('barbSheet')) teil(barbSheetRefresh);
    if (armySheet && offen('armySheet')) teil(renderArmySheet);
    if (multiAttackMode) teil(updateMultiAttackBar);
    if (offen('titleModal') && titleVer !== liveTitelVer && !document.getElementById('titleList').contains(document.activeElement)) { liveTitelVer = titleVer; teil(renderTitleModal); }   // (nie mitten in einer Auswahl)
    teil(() => { if (liveUhren()) liveBald(); });     // alle Restzeiten weiter; ist eine abgelaufen, gleich noch einmal
}
setInterval(liveTick, 1000);

