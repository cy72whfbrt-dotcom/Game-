// Admin-Bereich (Server): freischalten mit Passwort, Rückfrage vor dem Zurückspielen einer Sicherung,
// „Weiterspielen“-Knopf auf der Startseite, keine Skript-/CSP-Fehler.
const G = require('./gemeinsam');
const { B, ok, ende, NUR_UMGEBUNG } = G;
const NAME = process.env.OW_ADMIN_NAME, APW = process.env.OW_ADMIN_PW;
let b;
(async () => {
  if (!NAME || !APW) { ok('OW_ADMIN_NAME / OW_ADMIN_PW gesetzt', false); ende(); return; }
  b = await G.browser();
  const p = await (await b.newContext()).newPage(); const f = [];
  p.on('console', m => { if (m.type() === 'error' && !NUR_UMGEBUNG.test(m.text())) f.push(m.text().slice(0, 150)); }); p.on('pageerror', e => f.push(e.message));
  await p.goto(B); await p.fill('[name=name]', NAME); await p.fill('[name=pw]', APW);
  await Promise.all([p.waitForURL(/spiel\.php/, { timeout: 30000 }), p.click('button[type=submit]')]);
  await p.goto(B + 'admin.php'); const h1 = await p.textContent('h1');
  ok('Admin erst freischalten', /freischalten/i.test(h1), h1);
  await p.fill('#pw', APW); await Promise.all([p.waitForNavigation(), p.click('button[type=submit]')]);
  const h2 = await p.textContent('h1');
  ok('… danach Admin-Seite', h2.trim() === 'Admin', h2);
  let gefragt = null; p.on('dialog', d => { gefragt = d.message().slice(0, 40); d.dismiss(); });
  const fr = await p.$('form[data-frage] button'); if (fr) { await fr.click(); await p.waitForTimeout(800); }
  ok('Rückfrage beim Zurückspielen', !fr || !!gefragt, fr ? gefragt : 'keine Sicherungs-Liste');
  await p.goto(B); const k = await p.$('form[data-laedt] button');
  ok('Weiterspielen-Knopf da', !!k);
  ok('keine Skript-/CSP-Fehler', !f.length, f.join(' | '));
  ende(); await b.close();
})().catch(async e => { ok('Test lief durch', false, e.message); ende(); if (b) await b.close(); });
