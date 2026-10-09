// Nur Ansicht: Beispiel-Daten im Aufbau des heutigen Kampfberichts (05d). Jedes Feld aus FELDER.md kommt vor.
const B = '../../Game/bilder/', f = n => Math.round(n).toLocaleString('de-DE');
const kurz = z => z >= 1e6 ? (z / 1e6).toFixed(1).replace('.', ',') + ' Mio' : z >= 1e4 ? Math.round(z / 1000) + 'k' : f(z);
const R = [['Gewöhnlich', '#a2a6ad'], ['Ungewöhnlich', '#5cbf62'], ['Selten', '#4f9ef2'], ['Episch', '#a970f2'], ['Legendär', '#eab24a'], ['Mythisch', '#ee5046']];
const GEAR = [['waffe', 'Waffe'], ['ruestung', 'Rüstung'], ['rundschild', 'Schild'], ['stiefel', 'Stiefel']];
const BSP = {
  sieg: { sieg: 1, band: 'SIEG', zeit: 'vor 12 min · Angriff', ziel: 'Burg von Graf Ulrich', von: 'Rally mit 2 Angreifern · von Deiner Hauptstadt', xy: 'X 412 · Y 238', brennt: 'Hauptstadt brennt',
    A: { titel: 'Angreifer · gemeinsam', start: 85000, gef: 3120, vw: 9480, fl: 0,
      gerettet: [['Held −8 %', 1010]],
      parts: [['Truppen (alle)', 85000, 'Du 60.000 · Sir Kai 25.000', 0], ['Fähigkeit Angriff', 9600, 'Stufe 8 · +16 %'], ['Held Ragna ★★★ & Ida', 14200, 'Angriff +12 % · Gefolge +4.000 · Sturmflut gezündet'],
        ['Titel Feldherr', 10880, 'Mega-Tempel · +10 %'], ['Forschung Angriff', 5984, '+5 % Kampfkraft']],
      spieler: [
        { name: 'Du (Alexander)', rolle: 'Anführer', kopf: 'ragna', lvl: 24, titel: 'Feldherr', n: 60000, eigen: 27800, gef: 2200, vw: 6700, fl: 0, anteil: .706,
          helden: [{ id: 'ragna', name: 'Ragna', r: 4, q: 3, txt: '<em>Sturmflut gezündet</em>', w: [['Angriff', '+12 %'], ['Verteidigung', '−8 % Verluste'], ['Gefolge', '+4.000 Truppen'], ['Tempo', '+10 %'], ['Sturmflut · Wut', 'Verteidigung −15 %'], ['Paar „Seewind“', '+5 % auf alle Heldenwerte']] },
                   { id: 'ida', name: 'Ida', r: 2, q: 2, txt: 'Zweitheld · Werte und passive Fähigkeiten zu 50 %', w: [['Angriff', '+2 %'], ['Tempo', '+6 %'], ['Pfadfinder', '+3 % Tempo']] }],
          gear: [[4, 12, 2], [3, 10, 1], [3, 9, 0], [2, 8, 0]], fa: 8, fv: 6, mauer: 12, kh: 10, hh: 8 },
        { name: 'Sir Kai', rolle: 'Rally-Mitglied', kopf: 'sigrun', lvl: 19, titel: '', n: 25000, eigen: 12864, gef: 920, vw: 2780, fl: 0, anteil: .294,
          helden: [{ id: 'sigrun', name: 'Sigrun', r: 3, q: 2, txt: 'Aktive Fähigkeit nicht gezündet', w: [['Angriff', '+9 %'], ['Gefolge', '+1.500 Truppen']] }, null],
          gear: [[2, 7, 0], null, [1, 5, 0], null], fa: 5, fv: 3, mauer: 8, kh: 7, hh: 4 }] },
    V: { titel: 'Verteidiger · Graf Ulrich + Verstärkung', start: 72000, gef: 18400, vw: 30150, fl: 0, gerettet: [],
      parts: [['Truppen (alle)', 72000, 'Graf Ulrich 60.000 · Baron Edo 12.000', 0], ['Grundverteidigung', 18000, 'Basis Stufe 9'], ['Rüstung', 4500, 'Ausrüstung'],
        ['Fähigkeit Verteidigung', 7200, 'Stufe 6 · +12 % der Truppen'], ['Mauer', 2970, 'Stadt · +10 %'], ['Titel Burgvogt', 2400, 'Mega-Tempel · +8 %'], ['Forschung Verteidigung', 3800, '+4 % auf Besatzung und Verteidigung'],
        ['Verstärkung: eigene Werte', 1900, 'jeder Helfer mit Fähigkeit, Titel, Forschung'], ['Otto (Verteidigungs-Held)', 6500, 'Mauer · Angriff +9 % der Besatzung · Gefolge +1.100'],
        ['Held Ragna & Ida', -14000, 'Verteidigung −15 % (Sturmflut)']],
      spieler: [
        { name: 'Graf Ulrich', rolle: 'Besitzer', kopf: 'otto', lvl: 21, titel: 'Burgvogt', n: 60000, eigen: 31370, gef: 15300, vw: 25100, fl: 0, roh: -1,
          helden: [{ id: 'otto', name: 'Otto', r: 2, q: 2, txt: 'Verteidigungs-Held · aus der Mauer', w: [['Angriff', '+9 %'], ['Verteidigung', '−5 % Verluste'], ['Gefolge', '+1.100 Truppen']] }, null],
          gear: [[3, 9, 1], [3, 11, 0], [2, 8, 0], [1, 6, 0]], fa: 4, fv: 6, mauer: 10, kh: 9, hh: 6 },
        { name: 'Baron Edo', rolle: 'Verstärkung', kopf: 'brunhild', lvl: 18, titel: '', n: 12000, eigen: 1900, gef: 3100, vw: 5050, fl: 0,
          helden: [{ id: 'brunhild', name: 'Brunhild', r: 4, q: 1, txt: 'Aktive Fähigkeit nicht gezündet', w: [['Verteidigung', '−6 % Verluste'], ['Gefolge', '+800 Truppen']] }, null],
          gear: [null, [2, 6, 0], [2, 7, 0], null], fa: 2, fv: 5, mauer: 7, kh: 6, hh: 3 }] },
    beute: { g: 412000, h: 96500, s: 88200, e: 41750 }, kill: 38500, schutz: [250000, 1000000],
    hinweise: [['ui_sym_verwundete', '6.700 deiner Verwundeten gehen ins Krankenhaus – heile sie in der Stadt'], ['ui_sym_verwundete', 'Graf Ulrich bringt 25.100 Verwundete ins Krankenhaus']],
    knopf: ['Nochmal angreifen', 'btn--danger btn--gefahr', 'i-attack'] },

  niederlage: { sieg: 0, band: 'NIEDERLAGE', zeit: 'vor 3 Std. · Verteidigung', ziel: 'Deine Hauptstadt', von: 'Herzogin Mara hat die Basis erobert', xy: 'X 120 · Y 377', brennt: 'Deine Hauptstadt brennt',
    A: { titel: 'Angreifer · Herzogin Mara', start: 120000, gef: 6900, vw: 14100, fl: 0, gerettet: [['Schild −20 %', 1700], ['Held −10 %', 860]],
      parts: [['Truppen', 120000, '', 0], ['Fähigkeit Angriff', 21600, 'Stufe 9 · +18 %'], ['Held Sigrun ★★★★', 26400, 'Angriff +15 % · Gefolge +8.400 · Klingensturm gezündet'],
        ['Titel Feldherr', 16800, 'Mega-Tempel · +10 %'], ['Forschung Angriff', 9240, '+5 % Kampfkraft']],
      spieler: [{ name: 'Herzogin Mara', rolle: 'Angreifer', kopf: 'sigrun', lvl: 27, titel: 'Feldherr', n: 120000, eigen: 74040, gef: 6900, vw: 14100, fl: 0, feind: 1,
        helden: [{ id: 'sigrun', name: 'Sigrun', r: 3, q: 4, txt: '<em>Klingensturm gezündet</em>', w: [['Angriff', '+15 %'], ['Verteidigung', '−10 % Verluste'], ['Gefolge', '+8.400 Truppen'], ['Tempo', '+8 %'], ['Klingensturm · Wut', 'Angriff +6 %']] },
                 { id: 'aldric', name: 'Aldric', r: 3, q: 2, txt: 'Zweitheld · Werte und passive Fähigkeiten zu 50 %', w: [['Angriff', '+4 %'], ['Mauerbrecher', 'Verteidigung −6 %']] }],
        gear: [[5, 14, 3], [4, 13, 2], [4, 12, 1], [3, 11, 1]], fa: 9, fv: 7, mauer: 15, kh: 14, hh: 11 }] },
    V: { titel: 'Verteidiger · Du', start: 64000, gef: 21800, vw: 33900, fl: 0, gerettet: [],
      parts: [['Truppen', 64000, '', 0], ['Grundverteidigung', 16000, 'Basis Stufe 8'], ['Rüstung', 3800, 'Ausrüstung'], ['Fähigkeit Verteidigung', 6400, 'Stufe 5 · +10 % der Truppen'],
        ['Mauer', 2620, 'Stadt · +10 %'], ['Forschung Verteidigung', 3700, '+4 % auf Besatzung und Verteidigung'], ['Bernhard (Verteidigungs-Held)', 5900, 'Mauer · Angriff +8 % der Besatzung · Gefolge +780'],
        ['Held Sigrun & Aldric', -10200, 'Verteidigung −6 % (Mauerbrecher)']],
      spieler: [{ name: 'Du (Alexander)', rolle: 'Besitzer', kopf: 'bernhard', lvl: 24, titel: '', n: 64000, eigen: 28220, gef: 21800, vw: 33900, fl: 0, roh: -1,
        helden: [{ id: 'bernhard', name: 'Bernhard', r: 2, q: 3, txt: 'Verteidigungs-Held · aus der Mauer', w: [['Angriff', '+8 %'], ['Verteidigung', '−7 % Verluste'], ['Gefolge', '+780 Truppen']] }, null],
        gear: [[4, 12, 2], [3, 10, 1], [3, 9, 0], [2, 8, 0]], fa: 8, fv: 5, mauer: 12, kh: 10, hh: 8 }] },
    beute: { g: 186000, h: 42300, s: 39800, e: 18600 }, kill: 0, schutz: [250000, 1000000],
    hinweise: [['ui_sym_verwundete', '33.900 Verwundete gehen ins Krankenhaus – heile sie in der Stadt'], ['ui_sym_verwundete', 'Herzogin Mara bringt 14.100 Verwundete ins Krankenhaus'], ['ui_sym_ziel', 'Gegner war doppelt so stark. Schild setzen oder Verstärkung aus dem Bündnis holen.']],
    knopf: ['Verwundete heilen', 'btn--primary btn--haupt', 'i-upgrade'] }
};
const a = new URLSearchParams(location.search).get('a') || 'sieg', d = BSP[a] || BSP.sieg;
document.querySelectorAll('#wahl a').forEach(x => x.classList.toggle('on', x.href.endsWith(a)));
document.getElementById('kbZeit').textContent = d.zeit;
const sum = S => S.parts.reduce((x, p) => x + p[1], 0), atk = sum(d.A), def = sum(d.V), ichA = d.sieg ? d.A : d.V;
const box = (h, sub, inh) => `<div class="kb-box"><div class="kb-h">${h}<small>${sub || ''}</small></div>${inh}</div>`;
const kachel = (img, z, r, extra) => `<div class="kb-k r-${r}${z < 0 ? ' minus' : ''}"><img src="${B}${img}.webp" alt="">${extra || ''}<b>${z < 0 ? '−' : '+'}${kurz(Math.abs(z))}</b></div>`;
const RC = ['grau', 'gruen', 'blau', 'lila', 'gold', 'rot'];
const karte = (p, feind) => `<div class="kb-seite${feind ? ' feind' : ''}"><div class="kb-kopf"><img class="h" src="${B}held_${p.kopf}_kopf.webp" alt=""><img class="w" src="${B}ui_wappen.webp" alt=""></div>
  <div class="kb-name">${p.name}</div><div class="kb-sub">Spieler-Stufe ${p.lvl}${p.titel ? ' · Titel ' + p.titel : ''}</div></div>`;
const truppen = (S, t) => { const ue = S.start - S.gef - S.vw - S.fl, pc = x => (100 * x / S.start).toFixed(1) + '%';
  return `<div><div class="kb-h" style="margin-bottom:5px;font-size:11px">${t}</div><div class="kb-bar"><i class="ue" style="width:${pc(ue)}"></i><i class="vw" style="width:${pc(S.vw)}"></i><i class="tot" style="width:${pc(S.gef)}"></i></div>
  <div class="kb-zahl"><div class="start"><span style="--c:transparent">Start</span><b>${f(S.start)}</b></div>
  <span style="--c:#5fbf5a">Übrig</span><b>${f(ue)}</b><span style="--c:#e0a83a">Verwundet</span><b>${f(S.vw)}</b><span style="--c:#d0504a">Gefallen</span><b>${f(S.gef)}</b>
  <span style="--c:#4f8fe0">Geflohen</span><b>${f(S.fl)}</b>${S.gerettet.length ? `<span style="grid-column:1/-1;color:#9fd38a;font-size:11px;margin-top:3px">Verluste gerettet:</span>` : ""}${S.gerettet.map(g => `<span style="--c:#9fd38a">${g[0]}</span><b>+${f(g[1])}</b>`).join('')}</div></div>`; };
const kraft = (S, vorn) => `<table class="kb-tab">${S.parts.map(p => `<tr class="${p[3] === 0 ? '' : p[1] < 0 ? 'minus' : 'plus'}"><td>${p[0]}${p[2] ? '<small>' + p[2] + '</small>' : ''}</td><td>${p[3] === 0 ? '' : p[1] < 0 ? '−' : '+'}${f(Math.abs(p[1]))}</td></tr>`).join('')}
  <tr class="sum${vorn ? ' vorn' : ''}"><td>Gesamt</td><td>${f(sum(S))}</td></tr></table>`;
const held = h => h ? `<div class="kb-held" style="--rc:${R[h.r][1]}"><img src="${B}held_${h.id}_kopf.webp" alt=""><div><div class="n">${h.name}<small>${R[h.r][0]}</small></div>
  <div class="stern">${'★'.repeat(h.q)}<span style="opacity:.25">${'★'.repeat(5 - h.q)}</span></div><div class="s">${h.txt}</div></div>
  <div class="w">${h.w.map(x => `<span>${x[0]}<b>${x[1]}</b></span>`).join('')}</div></div>` : `<div class="kb-held leer"><div class="q">?</div><div><div class="n">Kein Zweitheld</div><div class="s">Platz frei</div></div></div>`;
const gear = p => `<div class="kb-gear">${GEAR.map(([img, n], i) => { const g = p.gear[i];
  return g ? `<div class="kb-k r-${RC[g[0]]}"><img src="${B}beute_${img}.webp" alt="">${g[2] ? `<span class="st">${'★'.repeat(g[2])}</span>` : ''}<b>Stufe ${g[1]}</b></div>`
           : `<div class="kb-k leer"><img src="${B}beute_${img}.webp" alt=""><b style="color:var(--tx-3)">leer</b></div>`; }).join('')}</div>
  <div class="kb-meta"><span>Fähigkeit Angriff<b>${p.fa}</b></span><span>Fähigkeit Verteidigung<b>${p.fv}</b></span><span>Mauer<b>${p.mauer}</b></span><span>Krankenhaus<b>${p.kh}</b></span><span>Heldenhalle<b>${p.hh}</b></span><span>Titel<b>${p.titel || '–'}</b></span></div>`;
const alle = [...d.A.spieler.map(p => [p, 1]), ...d.V.spieler.map(p => [p, 0])];
const feindVon = (p, angr) => d.sieg ? !angr : angr;
const zeile = (p, angr) => `<div class="kb-sp"><img src="${B}held_${p.kopf}_kopf.webp" alt=""><div><b>${p.name}</b><small>${p.rolle} · ${f(p.n)} Truppen · eigene Werte +${f(p.eigen)}${angr && d.sieg && p.anteil ? ' · Beute-Anteil ' + Math.round(p.anteil * 100) + ' %' : ''}</small></div>
  <div class="z">${f(p.n - p.gef - p.vw - p.fl)}<small>−${f(p.gef)} / ${f(p.vw)} verw.${p.fl ? ' / ' + f(p.fl) + ' gefl.' : ''}</small></div></div>`;
const roh = [['muenzen', 'g', 'gold'], ['holz', 'h', 'blau'], ['stein', 's', 'blau'], ['eisen', 'e', 'lila']];
const kb = document.getElementById('kb');
kb.className = 'kb ' + (d.sieg ? 'sieg' : 'niederlage');
kb.innerHTML =
  `<div class="kb-band" style="--glow:${d.sieg ? 'rgba(240,190,80,.45)' : 'rgba(200,50,40,.45)'}"><img src="${B}marsch_band_${d.sieg ? 'sieg' : 'niederlage'}.webp" alt=""><b>${d.band}</b></div>
  <div class="kb-ort"><b>${d.ziel}</b> · ${d.xy}<br>${d.von}<div class="mini" style="margin-top:6px"><button>Zeigen</button><button>Im Bündnis teilen</button></div></div>
  ${d.brennt ? `<div class="kb-brennt">${d.brennt}</div>` : ''}
  ${box('Kräfte', 'wer war stärker', `<div class="kb-kraft"><div class="bar"><i style="width:${(100 * atk / (atk + def)).toFixed(0)}%"></i></div>
    <div class="txt"><span>${d.A.spieler.map(p => p.name).join(' + ')}<small>Angriff</small>${f(atk)}</span><span>${d.V.spieler.map(p => p.name).join(' + ')}<small>Verteidigung</small>${f(def)}</span></div></div>`)}
  <div class="kb-seiten">${karte(d.A.spieler[0], !d.sieg)}<div class="kb-vs">VS</div>${karte(d.V.spieler[0], d.sieg)}</div>
  ${box('Truppen', 'Verwundete gehen ins Lazarett', `<div class="kb-reihe">${truppen(d.A, 'Angreifer')}${truppen(d.V, 'Verteidiger')}</div>`)}
  ${(d.A.spieler.length > 1 || d.V.spieler.length > 1) ? box('Jeder Spieler', 'übrig · gefallen / verwundet', `<div class="kb-sh">${d.A.titel}</div>${d.A.spieler.map(p => zeile(p, 1)).join('')}<div class="kb-sh feind">${d.V.titel}</div>${d.V.spieler.map(p => zeile(p, 0)).join('')}`) : ''}
  ${box('Kampfkraft', 'jeder Bonus mit Quelle', `<div class="kb-sh">${d.A.titel}</div>${kraft(d.A, atk >= def)}<div class="kb-sh feind">${d.V.titel}</div>${kraft(d.V, def > atk)}`)}
  ${box('Helden', 'Hauptheld · Zweitheld', alle.map(([p, an]) => `<div class="kb-sh${feindVon(p, an) ? ' feind' : ''}">${p.name} · ${p.rolle}</div>${p.helden.map(held).join('')}`).join(''))}
  ${box('Ausrüstung & Stadt', 'Stufe · Sterne · Seltenheit', alle.map(([p, an]) => `<div class="kb-sh${feindVon(p, an) ? ' feind' : ''}">${p.name} · Spieler-Stufe ${p.lvl}</div>${gear(p)}`).join(''))}
  ${box(d.sieg ? 'Beute' : 'Geraubt', d.sieg ? 'kommt mit dem Marsch heim' : 'vom Gegner mitgenommen', `<div class="kb-beute">${roh.map(([i, k, r]) => kachel('beute_' + i, (d.sieg ? 1 : -1) * d.beute[k], r)).join('')}${d.kill ? kachel('beute_muenzen', d.kill, 'gruen').replace('<b>', '<span class="st" style="position:absolute;top:3px;left:0;right:0;text-align:center;font:700 9px var(--font-ui);color:#cfe8c8">für Kills</span><b>') : ''}</div>
    ${d.sieg ? `<div class="kb-sh feind" style="margin-top:10px">Verlust ${d.V.spieler[0].name}</div><div class="kb-beute">${roh.map(([i, k, r]) => kachel('beute_' + i, -d.beute[k], r)).join('')}</div>` : ''}
    <div class="kb-schutz"><img src="${B}ui_fo_burgschutz.webp" alt="">Burg schützt ${f(d.schutz[0])} Münzen · ${f(d.schutz[1])} je Rohstoff</div>`)}
  ${box('Hinweise', '', `<div class="kb-hin">${d.hinweise.map(h => `<div><img src="${B}${h[0]}.webp" alt="">${h[1]}</div>`).join('')}</div>`)}
  <div class="kb-knoepfe"><button class="btn btn--secondary btn--haupt" type="button">Teilen</button>
    <button class="btn ${d.knopf[1]}" type="button"><svg class="icon"><use href="#${d.knopf[2]}"/></svg>${d.knopf[0]}</button></div>`;
