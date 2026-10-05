// Absturz-/Neustart-/Zurückspielen-Test gegen den lokalen Test-Server (owtest). Spielt selbst "Weltrechner" per HTTP.
const { execSync } = require('child_process');
const zlib = require('zlib');
const { W, B, sql, php, warte, ok, ende, spielerId } = require('./gemeinsam');
const SID = spielerId('pruefer6');   // ein bestehender Test-Spieler
const KEY = php('echo weltrechner_schluessel();');
async function puls(token, seit, extra) {
  const r = await fetch(B + 'server.php', { method: 'POST', headers: { 'X-Open-Water': '1', 'X-Weltrechner': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ aktion: 'puls', token, seit, spieler_seit: 0 }, extra || {})) });
  let j = null; const t = await r.text(); try { j = JSON.parse(t); } catch (e) {}
  return { s: r.status, j, t: t.slice(0, 120) };
}
const info = () => { const [v, tok, bis] = sql('SELECT version, leiter_token, CAST(leiter_bis AS SIGNED) - UNIX_TIMESTAMP() FROM ow_welt_info').split('\t'); return { v: +v, tok, bis: +bis }; };
const zuf = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
(async () => {
  const ws = sql("SELECT wert FROM ow_spielstand WHERE spieler_id=0 AND schluessel='openWaterWorldStart'");
  const welt = { setzen: { openWaterWorldStart: ws }, loeschen: [], welt_zeit: Date.now() };
  // 1) der echte Weltrechner läuft: ein Fremder kommt nicht rein
  let i = info();
  let r = await puls(zuf().slice(0, 32), i.v, { welt });
  ok('fremder Weltrechner bei laufendem', r.s === 409, r.s + ' ' + r.t);
  ok('Version unverändert', info().v === i.v);
  // 2) Absturz mitten im Puls: hart beenden, Leitung läuft ab
  // nur den Weltrechner DIESER Gruppe (Ordner W/weltrechner), nie die der anderen Gruppen von server_tests.sh
  const eigene = php('echo implode(" ", wr_alle_pids());');
  ok('eigener Weltrechner gefunden', eigene !== '', W);
  if (eigene) execSync('kill -9 ' + eigene + ' || true');
  await warte(46500);   // (Leitung gilt LEITER_SEK = 45 s ab dem Ende des letzten Pulses)
  i = info();
  // 3) alter Stand (seit zu klein) darf nach Ablauf nicht übernehmen
  r = await puls(zuf().slice(0, 32), i.v - 1, { welt });
  ok('alter Stand nach Absturz abgelehnt', r.s === 409 && /veraltet/.test(r.t), r.s + ' ' + r.t);
  ok('Version unverändert', info().v === i.v);
  // 4) ganz oder gar nicht: Nachrichten-Tabelle weg → Welt, Quittung, Leitung bleiben wie vorher
  const cid = 'ab' + zuf();
  sql(`INSERT INTO ow_befehle (spieler_id, befehl, cid) VALUES (${SID}, '{\\"art\\":\\"test\\"}', '${cid}')`);
  const bid = +sql(`SELECT id FROM ow_befehle WHERE cid='${cid}'`);
  const mid = 'mm' + zuf();
  const A = zuf().slice(0, 32);
  const ereignisse = [{ an: SID, e: { art: 'delta', coins: 1 }, mid }];
  sql('RENAME TABLE ow_ereignisse TO ow_ereignisse_weg');
  r = await puls(A, i.v, { welt, quittung: [bid], ereignisse });
  sql('RENAME TABLE ow_ereignisse_weg TO ow_ereignisse');
  ok('Fehler beim Speichern = kein Erfolg', r.s === 500, r.s + ' ' + r.t);
  const i2 = info();
  ok('… Welt nicht geschrieben', i2.v === i.v, i.v + ' → ' + i2.v);
  ok('… Befehl nicht quittiert', sql(`SELECT fertig FROM ow_befehle WHERE id=${bid}`) === '0');
  ok('… kein Leiter geworden', i2.tok !== A);
  // 5) Wiederholung mit denselben Nummern: jetzt alles zusammen
  r = await puls(A, i.v, { welt, quittung: [bid], ereignisse });
  const i3 = info();
  ok('Wiederholung gelingt', r.s === 200 && r.j && r.j.leiter === true, r.s + ' ' + r.t);
  ok('… Welt geschrieben (Version +1)', i3.v === i.v + 1, i.v + ' → ' + i3.v);
  ok('… Befehl quittiert', sql(`SELECT fertig FROM ow_befehle WHERE id=${bid}`) === '1');
  ok('… Nachricht einmal da', sql(`SELECT COUNT(*) FROM ow_ereignisse WHERE mid='${mid}'`) === '1');
  ok('… quittierter Befehl kommt nicht wieder', !(r.j.befehle || []).some(b => b.id === bid));
  // 6) dieselbe Antwort ging verloren → nochmal dasselbe: nichts doppelt
  r = await puls(A, i3.v, { welt, quittung: [bid], ereignisse });
  ok('Doppelt geschickt: Nachricht trotzdem einmal', r.s === 200 && sql(`SELECT COUNT(*) FROM ow_ereignisse WHERE mid='${mid}'`) === '1');
  // 7) ein zweiter mit altem Stand während der neue leitet
  r = await puls(zuf().slice(0, 32), i.v, { welt });
  ok('zweiter Weltrechner (alter Stand) abgelehnt', r.s === 409, r.s + ' ' + r.t);
  // 8) Sicherung + Zurückspielen
  const n0 = +sql('SELECT COUNT(*) FROM ow_sicherungen');
  const sid = +php('echo lager()->sicherung_anlegen();');
  ok('Sicherung angelegt', sid > 0 && +sql('SELECT COUNT(*) FROM ow_sicherungen WHERE id = ' + sid) === 1 && +sql('SELECT COUNT(*) FROM ow_sicherungen') <= 48 && +sql('SELECT COUNT(*) FROM ow_sicherungen WHERE id <= ' + (sid - 48)) === 0);   // (Nummern können Lücken haben)
  let ver = null; try { ver = JSON.parse(zlib.gunzipSync(Buffer.from(sql(`SELECT HEX(daten) FROM ow_sicherungen WHERE id=${sid}`), 'hex')).toString()).version; } catch (e) { ver = 'unlesbar: ' + e.message; }
  ok('… mit Welt-Version', ver === info().v, ver + ' / ' + info().v);
  r = await puls(A, info().v, { welt });   // Leiter schreibt weiter (neuer als die Sicherung)
  const vVor = info().v;
  const zr = php(`echo lager()->sicherung_zurueck(${sid}) ? "ja" : "nein";`);
  const i4 = info();
  ok('Zurückspielen', zr === 'ja', zr);
  ok('… vorher den jetzigen Stand gesichert', +sql('SELECT MAX(id) FROM ow_sicherungen') > sid);
  ok('… neue, höhere Version', i4.v === vVor + 1, vVor + ' → ' + i4.v);
  ok('… Leitung frei', i4.tok === '' && i4.bis <= 0);
  r = await puls(A, vVor, { welt });
  ok('alter Weltrechner nach Zurückspielen abgelehnt', r.s === 409 && /veraltet/.test(r.t), r.s + ' ' + r.t);
  ok('… Version unverändert', info().v === i4.v);
  ok('… quittierter Befehl bleibt quittiert', sql(`SELECT fertig FROM ow_befehle WHERE id=${bid}`) === '1');
  // 9) kaputte Sicherung wird nie zurückgespielt
  sql("INSERT INTO ow_sicherungen (groesse, daten) VALUES (3, 'xyz')");
  const kid = +sql('SELECT MAX(id) FROM ow_sicherungen');
  const vK = info().v;
  ok('kaputte Sicherung abgelehnt', php(`echo lager()->sicherung_zurueck(${kid}) ? "ja" : "nein";`) === 'nein' && info().v === vK);
  sql(`DELETE FROM ow_sicherungen WHERE id=${kid}`);
  // 10) Feste Nummer: dieselbe Auszahlung nach dem Zurückspielen nochmal → einmal
  const B2 = zuf().slice(0, 32);
  r = await puls(B2, info().v, { welt, ereignisse });
  ok('neuer Weltrechner übernimmt mit neuestem Stand', r.s === 200 && r.j.leiter === true, r.s + ' ' + r.t);
  ok('… alte Auszahlung (gleiche Nummer) nicht doppelt', sql(`SELECT COUNT(*) FROM ow_ereignisse WHERE mid='${mid}'`) === '1');
  // 11) echten Weltrechner wieder starten (Neustart wie vom Admin, ohne 60 s warten)
  sql("UPDATE ow_welt_info SET leiter_bis = 0, leiter_token = ''");
  const st = php('echo wachhund_neustart();');
  await warte(15000);
  const h = JSON.parse(require('fs').readFileSync(W + '/weltrechner/herz.php', 'utf8').replace(/^<\?php[^\n]*\n?/, '').replace(/^.*?\{/, '{'));
  ok('Weltrechner neu gestartet', st === 'gestartet' && !h.ende, st);
  ok('… und ist der Leiter', info().tok !== '' && info().tok !== B2 && info().bis > 0);
  sql(`DELETE FROM ow_befehle WHERE id=${bid}`); sql(`DELETE FROM ow_ereignisse WHERE mid='${mid}'`);
  ende();
})().catch(e => { try { sql('RENAME TABLE ow_ereignisse_weg TO ow_ereignisse'); } catch (x) {} ok('Test lief durch', false, e.message); ende(); });
