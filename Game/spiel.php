<?php
// ===== spiel.php – die Spielseite (Aufbau + Aussehen). Nur angemeldet. =====
// Der Spielstand kommt gleich mit der Seite mit (aus der Datenbank), speichern.js schickt Änderungen zurück.
require __DIR__ . '/server.php';
$kopf = spielseite_vorbereiten();   // Login prüfen, Spielstand laden (sonst geht es zur Anmeldung)
if (!ini_get('zlib.output_compression') && function_exists('ob_gzhandler')) ob_start('ob_gzhandler');   // gepackt schicken, wenn der Browser es kann (die ganze Welt steht in der Seite)
?>
<!DOCTYPE html>
<html lang="de">
<head>
<?= $kopf ?>
<link rel="manifest" href="app/manifest.webmanifest">
<link rel="icon" href="app/logo.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="app/apple-touch-icon.png">
<meta name="theme-color" content="#0b2a4a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Open Water">
<meta name="apple-mobile-web-app-status-bar-style" content="black">

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Open Water</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
/* =====================================================================
   OPEN WATER - UI stylesheet (Obsidian & Gold, final)
   Replaces the entire old <style> block. Class-only component rules;
   ids are used ONLY for placement of unique elements. Never write
   id-scoped descendant rules (a popup id followed by "button" or ".row")
   again.
   ===================================================================== */
:root{
  color-scheme: dark;
  /* ---- surfaces (obsidian ink) ---- */
  --ink-0:#050608; --ink-1:#0a0c10; --ink-2:#0f1217; --ink-3:#151920; --ink-4:#1c212a; --ink-5:#272d38;
  --glass:rgba(10,12,16,.82);
  --glass-strong:rgba(10,12,16,.92);
  --scrim:rgba(3,4,7,.58);
  --panel-bg:radial-gradient(140% 70% at 50% 0%,rgba(214,170,90,.075),transparent 55%),linear-gradient(180deg,#141820 0%,#0c0f14 100%);
  --tile-bg:linear-gradient(180deg,#191d25,#0d1015);
  --well:rgba(255,255,255,.022);
  /* ---- gold metal (brand accent: progress, level, primary action) ---- */
  --gold-100:#f0dfb0; --gold-200:#e4c886; --gold-300:#d4ad66; --gold-400:#c29449;
  --gold-500:#a27832; --gold-600:#795823;
  /* ---- ember + blood (warning / hostile / destructive) ---- */
  --ember-300:#f2a066;
  --blood-300:#f08a7e; --blood-400:#d24c40;
  --good:#9fd38a;
  /* ---- text (warm parchment) ---- */
  --tx-1:#eee6d4; --tx-2:#c0b7a3; --tx-3:#8b8373; --tx-4:#5c564b; --tx-inv:#1d1406;
  /* ---- hairlines (every border is a gold-tinted hairline) ---- */
  --line-1:rgba(212,176,102,.14); --line-2:rgba(212,176,102,.30); --line-3:rgba(228,200,134,.62);
  /* ---- factions (identical on map + UI): player blue, bots red, neutral grey ---- */
  --f-player:#3f86d8; --f-player-hi:#8cc0ff;
  --f-enemy:#c9423a;  --f-enemy-hi:#ff8d82;  --f-enemy-lo:#52150f;
  --f-neutral:#80848c;
  --f-multi:#b98cf0;
  /* ---- rarity (keys = RARITY_DEFS[].key) ---- */
  --r-grau:#a2a6ad; --r-gruen:#5cbf62; --r-blau:#4f9ef2; --r-lila:#a970f2; --r-gold:#eab24a; --r-rot:#ee5046;
  /* ---- resources (upgrade points have their OWN colour + icon) ---- */
  --res-coin:#e3b65a; --res-gem:#6ccbee; --res-troop:#e2d6bd; --res-point:#d98a4a;
  /* ---- type ---- */
  --font-display:'Cinzel','Trajan Pro',Georgia,serif;
  --font-ui:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  /* Schriftstufen (Design 11b F): 11 Kleingedrucktes · 13 Text · 15 Werte/Knopftext · 17 Fenstertitel · 22 Zahl-Held. 9.5/10 gibt es nicht mehr (= 11) */
  --fs-9:11px; --fs-10:11px; --fs-11:11px; --fs-12:12px; --fs-13:13px; --fs-15:15px; --fs-17:17px; --fs-22:22px;
  --track-caps:.1em; --track-display:.05em;
  /* ---- radii: small, carved - never bubbly ---- */
  --r-xs:2px; --r-sm:3px; --r-lg:6px; --r-pill:999px;
  /* ---- elevation: soft ambient only, NO hard offset shadows, NO gloss ---- */
  --hi-inset:inset 0 1px 0 rgba(255,240,205,.06);
  --sh-1:var(--hi-inset),0 2px 6px rgba(0,0,0,.45);
  --sh-2:var(--hi-inset),0 10px 28px rgba(0,0,0,.55);
  --sh-3:var(--hi-inset),0 22px 60px rgba(0,0,0,.66),0 0 0 1px rgba(0,0,0,.6);
  --glow-gold:0 0 0 1px rgba(228,200,134,.45),0 0 16px rgba(214,170,90,.22);
  --focus:0 0 0 2px var(--ink-1),0 0 0 4px var(--gold-300);
  /* ---- Abstände (Design 11b F): nur 4 / 8 / 12 / 16 – Fensterrand 16, Kartenabstand 8, Abschnitt 16 ---- */
  --ab-1:4px; --ab-2:8px; --ab-3:12px; --ab-4:16px;
  /* ---- Knopf-Arten: Haupt (gold, 1 pro Fenster, unten fest) · Zweit (dunkel) · Gefahr (rot) · Chip (sichtbar 36, Tippfläche 44) · Rund (Leiste) ---- */
  --k-haupt:48px; --k-zweit:44px; --k-gefahr:48px; --k-chip:36px; --k-tipp:44px; --k-rund:48px;
  /* ---- component sizes ---- */
  --hud-h:32px; --btn-h:34px; --btn-h-sm:28px; --dock-h:58px; --rail-w:64px; --tile:58px; --hud-top-space:46px;
  --icon:18px;
  /* ---- motion ---- */
  --ease-out:cubic-bezier(.2,.8,.2,1);
  --dur-1:120ms; --dur-2:200ms; --dur-3:320ms;
  /* ---- safe areas (viewport meta already has viewport-fit=cover) ---- */
  --safe-t:env(safe-area-inset-top,0px); --safe-r:env(safe-area-inset-right,0px);
  --safe-b:env(safe-area-inset-bottom,0px); --dock-off:0px; --safe-bd:max(0px, calc(var(--safe-b) - var(--dock-off)));   /* safe-bd: what is left of the home-bar space inside the page (iOS app: the strip below the page counts) */ --safe-l:env(safe-area-inset-left,0px);
  /* ---- stacking ---- */
  --z-map:0; --z-vignette:1; --z-hud:20; --z-mapctl:21; --z-mabar:22; --z-scrim:23; --z-dock:25;
  --z-popover:30; --z-sheet:40; --z-scrim-top:55; --z-modal:60; --z-toast:80;
  /* ---- ornaments (inline SVG) ---- */
  --frame:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60' fill='none'%3E%3Crect x='.5' y='.5' width='59' height='59' stroke='%23c9a45c' stroke-opacity='.34'/%3E%3Cg stroke='%23e4c886' stroke-opacity='.95'%3E%3Cpath d='M.5 16V.5H16M44 .5h15.5V16M59.5 44v15.5H44M16 59.5H.5V44'/%3E%3C/g%3E%3Cg stroke='%23c9a45c' stroke-opacity='.55'%3E%3Cpath d='M4.5 11V4.5H11M49 4.5h6.5V11M55.5 49v6.5H49M11 55.5H4.5V49'/%3E%3C/g%3E%3Cg fill='%23e4c886'%3E%3Cpath d='M8.5 6.6l1.9 1.9-1.9 1.9-1.9-1.9zM51.5 6.6l1.9 1.9-1.9 1.9-1.9-1.9zM51.5 49.6l1.9 1.9-1.9 1.9-1.9-1.9zM8.5 49.6l1.9 1.9-1.9 1.9-1.9-1.9z'/%3E%3C/g%3E%3C/svg%3E");
  --crest:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='12' viewBox='0 0 120 12' fill='none'%3E%3Cpath d='M4 6h40M76 6h40' stroke='%23c9a45c' stroke-opacity='.55'/%3E%3Cpath d='M47 6l5-3M47 6l5 3M73 6l-5-3M73 6l-5 3' stroke='%23e4c886' stroke-opacity='.85'/%3E%3Cpath d='M60 1l5 5-5 5-5-5z' fill='%230c0f14' stroke='%23e4c886'/%3E%3Ccircle cx='60' cy='6' r='1.4' fill='%23f0dfb0'/%3E%3C/svg%3E");
  --noise:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 .92 0 0 0 0 .78 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  --tick:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231d1406' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E");
}
@media (pointer:coarse){ :root{ --btn-h:44px; --btn-h-sm:36px; } }   /* Handy: nichts unter 44 px Tippfläche (kleine Knöpfe über .btn--chip) */
/* Handy hochkant: HUD-Block = Spielerbild + Werte-Zeile + EIN Streifen (78 px), Leiste mit runden Knöpfen (66 px) */
@media (max-width:899px) and (min-height:501px){ :root{ --hud-top-space:78px; --dock-h:66px; } }

/* ---------------- base ---------------- */
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;height:100%;overflow:hidden;background:var(--ink-0);color:var(--tx-1);
  font:400 var(--fs-13)/1.4 var(--font-ui);-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;
  overscroll-behavior:none;touch-action:manipulation}
body{position:fixed;inset:0;height:100dvh}
html{background:rgb(8,10,13)}   /* iPhone app: iOS shows only this colour below the page - the same as the bottom of the dock, so it looks like part of it */
/* Nichts markieren/kopieren (langes Drücken öffnet kein „Kopieren / Nachschlagen“) – nur Eingabefelder bleiben normal */
body,body *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
input,textarea,select,[contenteditable]{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}
button,input{font:inherit;color:inherit}
button{background:none;border:0;padding:0;cursor:pointer;-webkit-user-select:none;user-select:none}
button:focus-visible,input:focus-visible,[tabindex]:focus-visible{outline:none;box-shadow:var(--focus)}
[hidden]{display:none!important}
b,strong{font-weight:600}
.icon{width:var(--icon);height:var(--icon);flex:none;display:inline-block;vertical-align:middle;overflow:visible}
.icon use{pointer-events:none}
.icon--gem{color:var(--res-gem)} .icon--coin{color:var(--res-coin)}
.num{font-variant-numeric:tabular-nums}

/* ---------------- Design-Bausteine (11b F): Knopf-Arten, Fenster-Gerüst – andere Teile bauen darauf ---------------- */
.btn--haupt{height:var(--k-haupt);font-size:var(--fs-15)}                 /* mit .btn--primary: der eine goldene Knopf unten im Fenster */
.btn--zweit{height:var(--k-zweit)}                                         /* mit .btn--secondary */
.btn--gefahr{height:var(--k-gefahr);font-size:var(--fs-15)}               /* mit .btn--danger: Angreifen */
.btn--chip{height:var(--k-chip);padding:0 var(--ab-3);font-size:var(--fs-13);border-radius:var(--r-pill)}
.btn--chip::before,.tipp44::before{content:"";position:absolute;left:0;right:0;top:50%;height:var(--k-tipp);transform:translateY(-50%)}   /* Tippfläche 44 px */
.tipp44{position:relative}
.btn-rund{position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:2px;min-width:var(--k-rund);color:var(--tx-2);font:600 var(--fs-11)/1 var(--font-ui)}
.btn-rund > .icon{width:var(--k-rund);height:var(--k-rund);padding:13px;border-radius:50%;border:1px solid var(--line-2);color:var(--gold-200);
  background:radial-gradient(circle at 50% 30%,#232833,#0e1116);box-shadow:var(--sh-1)}
/* Fenster: feste Kopfzeile · scrollender Mittelteil mit Schatten-Hinweis · feste Fußzeile mit dem Haupt-Knopf
   (.panel > .phead / .pbody / .pfoot – oder für eigene Fenster .fenster > .fenster-kopf / .fenster-mitte / .fenster-fuss) */
.fenster{display:flex;flex-direction:column;min-height:0;max-height:var(--fenster-max,70dvh)}
.fenster-kopf,.fenster-fuss{flex:none}
.fenster-mitte{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.fenster-fuss{display:flex;gap:var(--ab-2);align-items:center;padding:var(--ab-3) var(--ab-4);border-top:1px solid var(--line-1)}
.fenster-mitte,.scroll-schatten,.pbody{   /* Schatten oben/unten nur, solange es dort weitergeht (Hintergrund wandert mit, Schatten bleibt) */
  background:linear-gradient(rgb(16,19,25) 30%,rgba(16,19,25,0)) top/100% 24px no-repeat local,
             linear-gradient(rgba(12,15,20,0),rgb(12,15,20) 70%) bottom/100% 24px no-repeat local,
             radial-gradient(farthest-side at 50% 0,rgba(0,0,0,.55),transparent) top/100% 10px no-repeat scroll,
             radial-gradient(farthest-side at 50% 100%,rgba(0,0,0,.6),transparent) bottom/100% 12px no-repeat scroll}

/* ---------------- map layers ---------------- */
#mapCanvas{position:fixed;inset:0;width:100vw;height:100dvh;display:block;touch-action:none;cursor:grab;z-index:var(--z-map)}
#mapCanvas.is-dragging{cursor:grabbing}
#mapCanvas.is-hover{cursor:pointer}
#mapVignette{position:fixed;inset:0;z-index:var(--z-vignette);pointer-events:none;
  background:linear-gradient(180deg,rgba(3,5,9,.45) 0,rgba(3,5,9,0) 70px),
             radial-gradient(ellipse at 50% 50%,rgba(2,4,8,0) 55%,rgba(2,4,8,.5) 100%)}

/* =====================================================================
   HUD
   ===================================================================== */
/* HUD wie Million Lords: links das Spielerbild (antippen = Profil, Name klein darunter), rechts davon EINE Zeile Werte ohne Kästen, ganz rechts der runde Rohstoff-Knopf */
.hud{position:fixed;z-index:var(--z-hud);top:calc(var(--safe-t) + 8px);left:calc(var(--safe-l) + 10px);right:calc(var(--safe-r) + 10px);
  display:flex;gap:var(--ab-2);align-items:flex-start;pointer-events:none}
.hud > *{pointer-events:auto}
.hud-me{display:flex;flex-direction:column;align-items:center;gap:3px;flex:none;width:52px}
.hud-me .avatar-ring--sm{width:44px;height:44px}
.hud-me .avatar-ring--sm .avatar .icon{width:22px;height:22px}
.hud-me-text{display:block;max-width:56px;text-align:center}
.hud-me-text b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 var(--fs-11)/1.1 var(--font-ui);color:var(--gold-100);text-shadow:0 1px 2px #000}
.hud-me-text small{display:none}
body:has(#profilePopup.is-open) .hud-me .avatar-ring{box-shadow:0 0 0 2px var(--gold-200),0 0 12px rgba(214,170,90,.5)}
.hud-werte{flex:1 1 auto;min-width:0;height:var(--hud-h);display:flex;align-items:center;padding:0 var(--ab-1);
  background:var(--glass);border:1px solid var(--line-2);border-radius:var(--r-pill);box-shadow:var(--sh-1);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
/* der EINE Streifen unter der Werte-Zeile: alle Dauer-Hinweise (Wochen-Event, Kopfgeld, Thron, Invasion, Drache, Händler, Saison), einzeilig –
   der dringendste sichtbar, der Rest als Zähler „+2“ (antippen klappt alle auf) */
.midbar{position:fixed;z-index:var(--z-hud);top:calc(var(--safe-t) + 14px + var(--hud-h));left:calc(var(--safe-l) + 70px);right:calc(var(--safe-r) + 10px);
  display:flex;align-items:flex-start;gap:var(--ab-1);pointer-events:none}
.midbar.offen{flex-direction:column}
.midbar[hidden]{display:none} .midbar > *{pointer-events:auto}
.mb-mehr{position:relative;flex:none;min-width:34px;height:26px;padding:0 8px;border-radius:var(--r-pill);background:var(--glass-strong);border:1px solid var(--line-3);
  font:700 var(--fs-11)/1 var(--font-ui);color:var(--gold-100)}
.mb-mehr::before{content:"";position:absolute;left:-4px;right:-4px;top:50%;height:var(--k-tipp);transform:translateY(-50%)}   /* Tippfläche 44 px */
.midbar.offen .mb-mehr{order:-1}
.mb-chip{position:relative;display:flex;align-items:center;gap:6px;min-width:0;max-width:100%;height:26px;padding:0 10px 0 7px;border-radius:var(--r-pill);background:var(--glass);border:1px solid var(--line-2);box-shadow:var(--sh-1);
  font:600 11px/1 var(--font-ui);color:var(--tx-2);white-space:nowrap;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.mb-chip .icon{width:14px;height:14px;flex:none;color:var(--gold-200)} .mb-chip .icon.mb-gem{width:12px;height:12px;margin-left:-3px;color:var(--res-gem)}
.mb-chip b{color:var(--tx-1);font-variant-numeric:tabular-nums} .mb-chip i{font-style:normal;color:var(--tx-3);font-variant-numeric:tabular-nums}
.mb-chip.is-tour{border-color:rgba(176,120,255,.55);background:linear-gradient(90deg,rgba(110,55,190,.7),rgba(16,12,24,.85))} .mb-chip.is-tour .icon{color:#f2c75c} .mb-chip.is-tour i{color:#d9c6ff}
.mb-chip.is-drache{border-color:rgba(255,140,70,.6);background:linear-gradient(90deg,rgba(170,50,20,.78),rgba(22,10,8,.88))} .mb-chip.is-drache .icon{color:#ffc46a} .mb-chip.is-drache i{color:#ffd9c0}
.mb-chip.is-warn{border-color:rgba(225,72,60,.6);background:linear-gradient(90deg,rgba(150,30,30,.75),rgba(20,12,12,.88));color:#ffd9d3} .mb-chip.is-warn > .icon:first-child{color:#ffb3aa}
.mb-chip > span{overflow:hidden;text-overflow:ellipsis}
.mb-chip::before{content:"";position:absolute;left:0;right:0;top:50%;height:var(--k-tipp);transform:translateY(-50%)}   /* Tippfläche 44 px */
.res{position:relative;flex:1 1 auto;min-width:0;height:100%;display:flex;align-items:center;justify-content:center;gap:var(--ab-1);padding:0 var(--ab-1)}
.res > .icon{width:16px;height:16px}
/* der Rohstoff-Knopf: rund, oben rechts (Tippfläche 44 px) */
.hud > .res--roh{flex:none;width:var(--hud-h);height:var(--hud-h);padding:0;justify-content:center;border-radius:50%;
  background:var(--glass);border:1px solid var(--line-2);box-shadow:var(--sh-1);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.hud > .res--roh::before{content:"";position:absolute;inset:-7px}   /* (flex-basis auto: freier Platz geht an den längeren Wert – „100 Mrd.“ statt „100 Mr…“) */
.res b{font:600 var(--fs-13)/1 var(--font-ui);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.res--coin > .icon{color:var(--res-coin)} .res--gem > .icon{color:var(--res-gem)} .res--troop > .icon{color:var(--res-troop)}
/* phone portrait: the dock already has Shop - the "+" would only squeeze the gem value into an ellipsis */
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){ .hud-werte,.res--roh,.nav,.mapctl,.toast,.mabar{background:var(--glass-strong)} }

/* avatar ring (profile header + desktop HUD). --progress (0-100) is written by renderProfile */
.avatar-ring{--progress:0;position:relative;flex:none;width:48px;height:48px;border-radius:50%;padding:2px;
  background:conic-gradient(var(--gold-300) calc(var(--progress) * 1%),rgba(212,176,102,.16) 0)}
.avatar{width:100%;height:100%;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 30%,#23426e,#0e1d33);box-shadow:inset 0 0 0 2px var(--ink-1)}
.avatar .icon{width:24px;height:24px;color:#cfe3ff}
.avatar-ring .lvl{right:-4px;bottom:-4px}
.avatar-ring--sm{width:34px;height:34px}
.avatar-ring--sm .avatar .icon{width:17px;height:17px}
.avatar-ring--sm .lvl{min-width:16px;height:16px;font-size:9px;right:-5px;bottom:-5px}

/* level chip: gold, everywhere */
.lvl{position:absolute;right:-6px;bottom:-6px;min-width:19px;height:19px;padding:0 4px;display:grid;place-items:center;border-radius:var(--r-xs);
  background:linear-gradient(180deg,#1d1a12,#0c0b08);border:1px solid var(--gold-300);color:var(--gold-100);
  font:700 10px/1 var(--font-ui);font-variant-numeric:tabular-nums;box-shadow:0 2px 4px rgba(0,0,0,.5)}

/* =====================================================================
   NAVIGATION  #cornerButtons  (phone = bottom dock)
   ===================================================================== */
.nav{position:fixed;z-index:var(--z-dock);left:0;right:0;bottom:0;height:calc(var(--dock-h) + var(--safe-bd));
  padding:0 calc(var(--safe-r) + 6px) var(--safe-bd) calc(var(--safe-l) + 6px);display:grid;grid-template-columns:repeat(5,1fr);
  background:linear-gradient(180deg,rgb(18,21,28),rgb(8,10,13));border-top:1px solid var(--line-2);box-shadow:0 -12px 30px rgba(0,0,0,.45)}
.nav::before{content:"";position:absolute;left:18%;right:18%;top:-1px;height:1px;background:linear-gradient(90deg,transparent,var(--gold-200),transparent)}
/* Leiste: 5 runde Knöpfe mit festen Plätzen (Karte/Stadt · Bündnis · Kampf · Events · Shop); das Profil öffnet das Spielerbild im HUD */
.nav-btn{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:0;color:var(--tx-2);transition:color var(--dur-1)}
.nav-btn > .icon{width:var(--k-rund);height:var(--k-rund);padding:13px;border-radius:50%;border:1px solid var(--line-2);color:var(--gold-200);
  background:radial-gradient(circle at 50% 30%,#232833,#0e1116);box-shadow:var(--sh-1);transition:border-color var(--dur-1),box-shadow var(--dur-1)}
.nav-l{font:600 var(--fs-11)/1 var(--font-ui);letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
#profileBtn{display:none}   /* nur noch über das Spielerbild (#hudPlayer) – der Knopf bleibt für die Fenster-Logik */
.nav-btn:hover{color:var(--tx-1)}
.nav-btn:hover > .icon{border-color:var(--line-3)}
.nav-btn.active{color:var(--gold-100)}
.nav-btn.active > .icon{color:var(--gold-100);border-color:var(--gold-300);background:radial-gradient(circle at 50% 30%,#4a3a1c,#1a140a);box-shadow:0 0 12px rgba(214,170,90,.45)}
.badge{position:absolute;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--blood-400);border:1.5px solid var(--ink-1);
  color:#fff;font:700 9.5px/13px var(--font-ui);text-align:center;font-variant-numeric:tabular-nums;pointer-events:none}
.nav-btn .badge{top:2px;left:calc(50% + 12px)}

/* =====================================================================
   MAP CONTROLS
   ===================================================================== */
.mapctl{position:fixed;z-index:var(--z-mapctl);right:calc(var(--safe-r) + 10px);bottom:calc(var(--dock-h) + var(--safe-bd) + 14px);
  display:flex;flex-direction:column;background:rgba(14,16,22,.52);border:1px solid rgba(214,170,90,.16);border-radius:var(--r-sm);box-shadow:var(--sh-1);
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.mapctl button{width:34px;height:34px;display:grid;place-items:center;color:var(--tx-2)}
.mapctl button + button{border-top-color:rgba(255,255,255,.05)}
.mapctl button.on{color:var(--gold-100);background:rgba(214,170,90,.18)}
[data-frame="bronze"]{--fr1:#c9854f;--fr2:#7a4a26} [data-frame="silver"]{--fr1:#e8eef5;--fr2:#8a95a3} [data-frame="gold"]{--fr1:#ffd35a;--fr2:#a0701c}
[data-frame="platin"]{--fr1:#9fe3da;--fr2:#3f8c86} [data-frame="diamond"]{--fr1:#bfe6ff;--fr2:#3f86d8} [data-frame="master"]{--fr1:#d6a6ff;--fr2:#6a3fa0} [data-frame="legend"]{--fr1:#ffb04a;--fr2:#c0392b} [data-frame="throne"]{--fr1:#f7d77c;--fr2:#7a1420} [data-frame="saison"]{--fr1:#8ff5e6;--fr2:#5b3fc4}
[data-frame="conq"]{--fr1:#ff9a6a;--fr2:#8a2f1c} [data-frame="warlord"]{--fr1:#e0504a;--fr2:#3a0f12} [data-frame="wall"]{--fr1:#b8c4d4;--fr2:#4a5868} [data-frame="emma"]{--fr1:#b07ad8;--fr2:#24122e}
[data-frame="slayer"]{--fr1:#a6e05a;--fr2:#2f5a1c} [data-frame="builder"]{--fr1:#e2b27a;--fr2:#6a4422} [data-frame="king"]{--fr1:#ffd05a;--fr2:#a3161c}
[data-frame="sz1"]{--fr1:#fff0a8;--fr2:#d4202a} [data-frame="sz2"]{--fr1:#f2f6ff;--fr2:#2a5ad8} [data-frame="sz4"]{--fr1:#7ef0c8;--fr2:#1c6a8a} [data-frame="sz6"]{--fr1:#f0c87a;--fr2:#3a6a9a}
[data-frame="mgut"]{--fr1:#ffd05a;--fr2:#c08a1c} [data-frame="mstraf"]{--fr1:#ff5a4a;--fr2:#7a1010}   /* Rahmen aus der Mitte (Alexander 6.10.): wie die Ringe – Gold, Rot, Herrscher Blutrot-Gold */
#pAvatarRing[data-frame]{background:conic-gradient(from 200deg,var(--fr1),var(--fr2),var(--fr1),var(--fr2),var(--fr1));padding:3px;box-shadow:0 0 10px color-mix(in srgb,var(--fr1) 45%,transparent)}
#pAvatarRing[data-frame^="sz"],#pAvatarRing[data-frame="king"],#pAvatarRing[data-frame="mgut"],#pAvatarRing[data-frame="mstraf"],#pAvatarRing[data-frame="saison"],#pAvatarRing[data-frame="throne"],#pAvatarRing[data-frame="legend"],#pAvatarRing[data-frame="master"],#pAvatarRing[data-frame="diamond"]{animation:frame-glow 2.4s ease-in-out infinite alternate}
@keyframes frame-glow{from{box-shadow:0 0 6px color-mix(in srgb,var(--fr1) 35%,transparent)}to{box-shadow:0 0 16px color-mix(in srgb,var(--fr1) 75%,transparent)}}
.ptitle-tag{margin-top:4px;font:700 10px/1.2 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--gold-200)}
.troop-in{width:9.5em;max-width:46vw;height:30px;padding:0 8px;border:1px solid var(--line-2);border-radius:var(--r-xs);background:#12151b;color:var(--tx-1);font:700 var(--fs-13)/1 var(--font-ui);text-align:right;font-variant-numeric:tabular-nums}
.troop-in.is-bad{border-color:#e0685c;box-shadow:0 0 0 2px rgba(224,104,92,.25)} @media (pointer:coarse){ .troop-in{height:36px} }
.troop-in:focus{outline:none;border-color:var(--gold-300);box-shadow:0 0 0 2px rgba(214,170,90,.25)}
.look-title .icon{width:10px;height:10px}
.look-titles{display:flex;flex-wrap:wrap;gap:6px}
.look-title{display:inline-flex;align-items:center;gap:4px;min-height:34px;padding:6px 12px;border-radius:999px;border:1px solid var(--line-2);background:rgba(255,255,255,.03);color:var(--tx-1);font:600 var(--fs-12)/1 var(--font-ui)}
.look-title.on{border-color:var(--gold-300);background:rgba(214,170,90,.16);color:var(--gold-100)} .look-title:disabled{opacity:.4}
.pfoot[hidden]{display:none} #profileTabs.tabs{grid-template-columns:repeat(5,minmax(min-content,1fr))} #shopTabs.tabs{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr)}
.pill--throne .icon{color:#f2c75c} .psub .pill + .pill{margin-left:6px}
.throne-status{display:grid;gap:6px;padding:10px 12px;border:1px solid var(--line-2);border-radius:10px;
  background:radial-gradient(120% 90% at 50% 0%,rgba(242,199,92,.10),transparent 60%),rgba(255,255,255,.02)}
.throne-status .ts-row{display:flex;align-items:center;gap:8px;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-3)}
.throne-status .ts-row .icon{width:15px;height:15px;color:#f2c75c;flex:none}
.throne-status .ts-row b{margin-left:auto;color:var(--tx-1);font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
.throne-status .ts-row b.warn{color:#ff9d8f}
.throne-list{display:grid;gap:6px}
.throne-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line-1);border-radius:10px;background:rgba(0,0,0,.22)}
.throne-row .tr-ic{width:38px;height:38px;flex:none;display:grid;place-items:center;border-radius:8px;border:1px solid var(--line-2);background:var(--tile-bg)}
.throne-row .tr-ic .icon{width:20px;height:20px;color:var(--gold-200)} .throne-row .tr-ic .ico-coin{color:var(--res-coin)} .throne-row .tr-ic .ico-gem{color:var(--res-gem)} .throne-row .tr-ic .ico-troops{color:var(--res-troop)}
.throne-row.is-special{border-color:rgba(242,199,92,.45);background:radial-gradient(100% 140% at 0% 50%,rgba(242,199,92,.12),transparent 70%),rgba(0,0,0,.22)}
.throne-row .tr-t{flex:1;min-width:0} .throne-row .tr-t b{display:block;font:600 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-1)}
.throne-row .tr-t small{display:block;margin-top:2px;font:500 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3)}
.throne-row .btn{flex:none;min-width:78px} .throne-row .btn .icon{color:#f2c75c}
.tour-rules b{color:var(--tx-1);font-weight:700} .tour-rules span span{display:block} .tour-rules{display:grid;gap:5px} .tour-rules span{display:flex;align-items:center;gap:8px;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)} .tour-rules .icon{width:15px;height:15px;flex:none;color:#c9a2ff}
.tour-prizes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
.tour-prize{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 3px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22);text-align:center;min-width:0}
.tour-prize b{font:700 var(--fs-12)/1.1 var(--font-display);color:var(--gold-100)} .tour-prize span{display:flex;align-items:center;gap:3px;font:600 10.5px/1.1 var(--font-ui);color:var(--tx-2);white-space:nowrap}
.tour-prize .icon{width:11px;height:11px;flex:none;color:var(--res-gem)} .tour-prize span + span .icon{color:#c9a2ff}
.tour-prize em{font:700 9px/1.1 var(--font-ui);font-style:normal;letter-spacing:.06em;text-transform:uppercase;color:#e6d8ff}
.tour-prize.is-1{border-color:rgba(242,199,92,.5);background:linear-gradient(180deg,rgba(160,92,235,.25),rgba(242,199,92,.08))}
.mail-tabs .tab .badge{position:absolute;top:4px;right:8px}
.mail-pane[hidden]{display:none} .mail-pane{display:grid;gap:10px}
.mail-intro{font:500 var(--fs-12)/1.4 var(--font-ui);color:var(--tx-3)}
.welcome-crest{width:44px;height:44px;display:block}
#welcomeModal .lvlup-rewards li b{white-space:normal;text-align:right;min-width:0}
#welcomeModal .btn + .btn{margin-top:8px}
.rp-crest{width:52px;height:52px;border-radius:50%;padding:3px;flex:none;background:conic-gradient(from 200deg,var(--fr1,#b08d57),var(--fr2,#6b5433),var(--fr1,#b08d57),var(--fr2,#6b5433),var(--fr1,#b08d57));box-shadow:0 0 10px color-mix(in srgb,var(--fr1,#b08d57) 40%,transparent);position:relative}
.rp-crest-in{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 50% 30%,#2a2f3a,#12151c)} .rp-crest img{width:34px;height:34px}
.rp-crest .lvl{position:absolute;right:-4px;bottom:-4px}
.rp-online{display:inline-flex;align-items:center;gap:5px;font:600 var(--fs-11)/1 var(--font-ui);color:var(--tx-3)} .rp-online i{width:7px;height:7px;border-radius:50%;background:#5b6070}
.rp-online.on{color:#8fcf7a} .rp-online.on i{background:#6fd36a;box-shadow:0 0 6px #6fd36a}
.rp-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.rp-stat{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;border:1px solid var(--line-1);border-radius:10px;background:rgba(255,255,255,.02);min-width:0}
.rp-stat small{font:600 9px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3)} .rp-stat b{font:600 var(--fs-13)/1.1 var(--font-ui);color:var(--tx-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.rp-last{font:500 var(--fs-12)/1.4 var(--font-ui);color:var(--tx-2);padding:8px 10px;border-radius:10px;border:1px solid var(--line-1);background:rgba(255,255,255,.02)}
.rp-gear{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px} .rp-gear .gslot .tile{cursor:default}
.rp-gear small{font:500 10px/1.4 var(--font-ui);padding-top:1px;color:var(--tx-3);text-align:center}
.rp-heroes{display:grid;gap:6px}
.rp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 14px}
.rp-blds{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.rp-bld{display:grid;justify-items:center;gap:4px;padding:8px 4px 6px;border:1px solid var(--line-1);border-radius:10px;background:rgba(0,0,0,.22)}
.rp-bld-ic{position:relative;width:34px;height:34px;display:grid;place-items:center;border-radius:8px;border:1px solid var(--line-2);background:var(--tile-bg)} .rp-bld-ic .icon{width:18px;height:18px;color:var(--gold-200)}
.rp-bld-ic b{position:absolute;right:-7px;bottom:-6px;min-width:18px;height:16px;padding:0 3px;border-radius:5px;background:#1b1f27;border:1px solid var(--line-2);font:700 10px/14px var(--font-ui);color:var(--tx-1);text-align:center}
.rp-bld small{font:500 var(--fs-11)/1.2 var(--font-ui);color:var(--tx-3);text-align:center} .rp-bld.is-zero{opacity:.5}
.rp-grid > div{display:flex;justify-content:space-between;gap:8px;font:500 var(--fs-12)/1.6 var(--font-ui);color:var(--tx-2);border-bottom:1px solid var(--line-1)} .rp-grid b{color:var(--tx-1);font-variant-numeric:tabular-nums}
.rp-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px} .rp-actions .btn{justify-content:center}
.who-link{background:none;border:0;padding:6px 2px;margin:-6px -2px;font:inherit;color:inherit;text-decoration:underline;text-decoration-color:color-mix(in srgb,currentColor 40%,transparent);text-underline-offset:3px;cursor:pointer}
.chain{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:10px;border:1px solid var(--line-1);background:rgba(255,255,255,.02)}
.chain-links{display:grid;grid-template-columns:repeat(7,1fr) 1.3fr;gap:5px;align-items:center}
.chain-link{height:30px;border-radius:8px;display:grid;place-items:center;border:1px solid var(--line-2);background:rgba(0,0,0,.2);font:700 var(--fs-12)/1 var(--font-ui);color:var(--tx-3)}
.chain-link.on{border-color:#8fcf7a;background:rgba(143,207,122,.16);color:#8fcf7a} .chain-link .icon{width:14px;height:14px}
.chain-chest{height:38px;border-radius:10px;display:grid;place-items:center;border:1px solid var(--line-2);color:var(--tx-3);background:radial-gradient(circle at 50% 30%,rgba(255,255,255,.06),rgba(0,0,0,.2))}
.chain-chest .icon{width:20px;height:20px} .chain-chest.on{color:#2a1c08;border-color:#f2d27a;background:radial-gradient(circle at 35% 30%,#fff2c4,#d9a93f 60%,#8a6420);box-shadow:0 0 14px rgba(242,210,122,.45)}
.ach-sum{display:flex;flex-direction:column;gap:6px;font:500 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-2)} .ach-sum b{color:var(--tx-1)}
.ach-sum-bar,.ach-bar{display:block;height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
.ach-sum-bar i,.ach-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--gold-500),var(--gold-200))}
.ach-list{display:flex;flex-direction:column;gap:8px}
.ach{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border-radius:10px;border:1px solid var(--line-1);background:rgba(255,255,255,.02)}
.ach-medal{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:#7d7566;background:radial-gradient(circle at 35% 30%,#4a463f,#24221e);border:2px solid #5a554b}
.ach-medal .icon{width:20px;height:20px}
.ach.is-ready .ach-medal,.ach.is-got .ach-medal{color:#2a1c08;background:radial-gradient(circle at 35% 30%,#fff2c4,#d9a93f 60%,#8a6420);border-color:#f2d27a;box-shadow:0 0 12px rgba(242,210,122,.35)}
.ach.is-ready{border-color:rgba(242,210,122,.55)}
.ach-t{display:flex;flex-direction:column;gap:3px;min-width:0} .ach-t b{font:700 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-1)} .ach-t small{font:500 var(--fs-11)/1.25 var(--font-ui);color:var(--tx-3)}
.ach-n{font-variant-numeric:tabular-nums}
.ach-claim{display:inline-flex;align-items:center;gap:4px;padding:8px 10px;border-radius:8px;border:1px solid var(--gold-300);background:rgba(214,170,90,.16);color:var(--gold-100);font:700 var(--fs-12)/1 var(--font-ui)}
.ach-claim:disabled{opacity:.4;border-color:var(--line-2);background:none;color:var(--tx-3)} .ach-claim .icon{width:14px;height:14px}
.ach-claim.done{border:0;background:none;color:#8fcf7a}
/* Ziele: tasks + Erfolge in one sheet */
.ach-sum{padding:10px 12px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.ach-sum-t{display:flex;align-items:center;justify-content:space-between;gap:8px} .ach-sum-gem{display:inline-flex;align-items:center;gap:4px;color:#9fe0ff;font-weight:700} .ach-sum-gem .icon{width:13px;height:13px}
.ach-list > .sect{margin-top:6px} .ach-list > .sect .btn{order:7} .ach-list > .sect .sect-aside{font:600 var(--fs-11)/1 var(--font-ui);color:var(--tx-3)}
.ach.is-ready .ach-claim{border-color:var(--gold-200);background:linear-gradient(180deg,var(--gold-200),var(--gold-400));color:#2a1c08;box-shadow:0 0 10px rgba(242,210,122,.3)}
.ach-t b{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ach-tier{display:inline-flex;gap:3px} .ach-tier em{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.14)}
.ach-tier em.on{background:var(--gold-300)} .ach-tier em.cur{background:none;box-shadow:inset 0 0 0 1.5px var(--gold-300)}
.ach.is-got{opacity:.7} .ach.is-got .ach-medal{box-shadow:none}
.ach-done{margin-top:6px} .ach-done > .ach-list{margin-top:8px}
.ach-done summary{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(255,255,255,.02);cursor:pointer;list-style:none;
  font:600 var(--fs-12)/1 var(--font-display);letter-spacing:.08em;color:var(--gold-100)}
.ach-done summary::-webkit-details-marker{display:none}
.ach-done summary em{font:700 var(--fs-11)/1 var(--font-ui);font-style:normal;color:var(--tx-3)} .ach-done summary .icon{width:14px;height:14px;margin-left:auto;color:var(--tx-3);transform:rotate(180deg);transition:transform var(--dur-1)}
.ach-done[open] summary .icon{transform:none}
/* Saison-Pass (Events → Pass): head card, premium offer, the track of 40 levels (free | level | premium) */
.pass{display:grid;gap:10px}
.pass-hero{display:grid;gap:8px;padding:12px;border-radius:12px;border:1px solid rgba(242,210,122,.35);background:radial-gradient(120% 140% at 0% 0%,rgba(242,199,92,.14),transparent 60%),rgba(0,0,0,.24)}
.pass-hero.is-prem{border-color:rgba(143,245,230,.45);background:radial-gradient(120% 140% at 0% 0%,rgba(143,245,230,.14),transparent 60%),radial-gradient(100% 120% at 100% 100%,rgba(91,63,196,.18),transparent 60%),rgba(0,0,0,.24)}
.pass-top{display:flex;align-items:center;gap:12px}
.pass-lvl{width:52px;height:52px;flex:none;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#2a1c08;background:radial-gradient(circle at 35% 30%,#fff2c4,#d9a93f 60%,#8a6420);border:2px solid #f2d27a;box-shadow:0 0 14px rgba(242,210,122,.35)}
.pass-lvl small{font:700 9px/1 var(--font-ui);letter-spacing:.06em;text-transform:uppercase} .pass-lvl b{font:800 20px/1 var(--font-display)}
.pass-ht{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px} .pass-ht b{font:700 var(--fs-16,16px)/1.1 var(--font-display);color:var(--gold-100)} .pass-ht small{font:500 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-3);font-variant-numeric:tabular-nums}
.pass-tag{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:var(--r-pill);border:1px solid rgba(143,245,230,.5);color:#bff8ef;font:700 var(--fs-11)/1 var(--font-ui);background:rgba(31,138,138,.25)} .pass-tag .icon{width:12px;height:12px}
.pass-bar{height:8px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden} .pass-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--gold-500),var(--gold-200));transition:width var(--dur-2,.3s)}
.pass-bar-t{display:flex;justify-content:space-between;gap:8px;font:600 var(--fs-11)/1 var(--font-ui);color:var(--tx-3);font-variant-numeric:tabular-nums} .pass-bar-t span:first-child{color:var(--tx-2)}
.pass-prem,.pass-old{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;border:1px solid rgba(143,245,230,.3);background:linear-gradient(100deg,rgba(91,63,196,.16),rgba(31,138,138,.1))}
.pass-prem > .icon,.pass-old > .icon{width:22px;height:22px;flex:none;color:#8ff5e6} .pass-old{border-color:rgba(242,210,122,.4);background:rgba(214,170,90,.08)} .pass-old > .icon{color:var(--gold-300)}
.pass-prem > span,.pass-old > span{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px} .pass-prem b,.pass-old b{font:700 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-1)}
.pass-prem small,.pass-old small{font:500 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3);font-variant-numeric:tabular-nums} .pass-prem .btn{flex:none;gap:4px}
.pass-all{width:100%;justify-content:center}
.pass-track{display:grid;gap:6px;position:relative}
.pass-head{display:grid;grid-template-columns:minmax(0,1fr) 34px minmax(0,1fr);gap:6px;font:700 var(--fs-11)/1 var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--tx-3);text-align:center}
.pass-head span{display:inline-flex;align-items:center;justify-content:center;gap:4px} .pass-head .icon{width:11px;height:11px} .pass-head span:last-child{color:#8ff5e6}
.pass-row{display:grid;grid-template-columns:minmax(0,1fr) 34px minmax(0,1fr);gap:6px;align-items:stretch;position:relative}
.pass-row::before{content:"";position:absolute;left:50%;top:-6px;bottom:0;width:4px;margin-left:-2px;background:rgba(255,255,255,.08);z-index:0}
.pass-row.is-on::before{background:linear-gradient(180deg,var(--gold-300),var(--gold-500))}
.pass-row:first-child::before{top:50%}
.pass-node{align-self:center;justify-self:center;position:relative;z-index:1;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font:800 var(--fs-12)/1 var(--font-ui);color:var(--tx-3);background:#1c1f27;border:2px solid var(--line-2)}
.pass-row.is-on .pass-node{color:#2a1c08;border-color:#f2d27a;background:radial-gradient(circle at 35% 30%,#fff2c4,#d9a93f 60%,#8a6420)}
.pass-row.is-next .pass-node{border-color:var(--gold-300);color:var(--gold-100);box-shadow:0 0 0 3px rgba(242,210,122,.15)}
.pass-cell{position:relative;display:flex;align-items:center;gap:8px;min-height:50px;padding:6px 8px;border-radius:10px;border:1px solid var(--line-1);background:rgba(255,255,255,.025);text-align:left;color:var(--tx-2)}
.pass-cell.is-p{background:linear-gradient(100deg,rgba(91,63,196,.12),rgba(31,138,138,.08));border-color:rgba(143,245,230,.18)}
.pass-cell.is-lock{opacity:.55} .pass-cell.is-closed{opacity:.5}
.pass-cell.is-ready{border-color:var(--gold-200);background:radial-gradient(120% 140% at 0% 50%,rgba(242,199,92,.22),transparent 70%),rgba(0,0,0,.2);box-shadow:0 0 10px rgba(242,210,122,.28);cursor:pointer;animation:pass-glow 1.6s ease-in-out infinite alternate}
@keyframes pass-glow{from{box-shadow:0 0 4px rgba(242,210,122,.2)}to{box-shadow:0 0 12px rgba(242,210,122,.45)}}
.pass-cell.is-got{opacity:.6}
.pass-cell.is-special:not(.is-got){border-color:rgba(143,245,230,.55)}
.pc-ic{width:28px;height:28px;flex:none;display:grid;place-items:center;border-radius:8px;background:var(--tile-bg,rgba(0,0,0,.25));border:1px solid var(--line-2)}
.pc-ic .icon{width:16px;height:16px;color:var(--gold-200)} .pc-ic .ico-coin{color:var(--res-coin)} .pc-ic .ico-gem{color:var(--res-gem)} .pc-ic .ico-tp{color:#f2c75c} .pc-ic .ico-shard{color:#d6a6ff} .pc-ic .ico-royal{color:#ffb04a}
.pc-ic.is-look{width:32px;height:32px;border:0;background:none}
.pc-frame{display:block;width:30px;height:30px;border-radius:50%;padding:3px;background:conic-gradient(from 200deg,var(--fr1),var(--fr2),var(--fr1),var(--fr2),var(--fr1))} .pc-frame img{display:block;width:100%;height:100%;border-radius:50%}
.pc-flag{position:relative;width:30px;height:22px;display:block} .pc-flag::before{content:"";position:absolute;left:3px;top:1px;width:2px;height:21px;background:#d9d2c0;border-radius:1px}
.pc-flag::after{content:"";position:absolute;left:5px;top:2px;width:20px;height:12px;background:var(--c);clip-path:polygon(0 0,100% 0,78% 50%,100% 100%,0 100%);box-shadow:0 0 8px var(--t)}
.pc-t{min-width:0;display:flex;flex-direction:column;gap:2px} .pc-t b{font:700 var(--fs-13)/1.1 var(--font-ui);color:var(--tx-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc-t small{font:500 10px/1.15 var(--font-ui);color:var(--tx-3);overflow:hidden;text-overflow:ellipsis}
.pc-ok{position:absolute;top:4px;right:5px;width:15px;height:15px;border-radius:50%;display:grid;place-items:center;background:#8fcf7a;color:#10200c} .pc-ok .icon{width:10px;height:10px}
.pc-ok.is-lock{background:rgba(0,0,0,.45);color:var(--tx-3)}
.pass-how-l{display:grid;gap:2px;margin-top:8px;padding:4px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.18)}
.pass-how-l div{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line-1);font:500 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-2)} .pass-how-l div:last-child{border-bottom:0}
.pass-how-l .icon{width:14px;height:14px;color:var(--gold-300);flex:none} .pass-how-l b{margin-left:auto;color:var(--gold-100);font-variant-numeric:tabular-nums}
.rp-pass{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--r-sm);border:1px solid var(--line-2);background:rgba(0,0,0,.2);font:500 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-2)}
.rp-pass .icon{width:15px;height:15px;color:var(--gold-300)} .rp-pass b{color:var(--gold-100)} .rp-pass em{margin-left:auto;font:700 var(--fs-11)/1 var(--font-ui);font-style:normal;padding:3px 8px;border-radius:var(--r-pill);border:1px solid rgba(143,245,230,.5);color:#bff8ef;background:rgba(31,138,138,.25)}
.rp-pass.is-prem{border-color:rgba(143,245,230,.3)} .rp-pass.is-prem .icon{color:#8ff5e6}
#goalsSub .pill .icon{color:var(--gold-300)}
.marker-sheet{position:fixed;z-index:45;left:50%;bottom:calc(var(--dock-h) + var(--safe-bd) + 14px);transform:translateX(-50%);width:min(360px,calc(100vw - 24px));padding:12px;border-radius:12px;
  background:var(--glass-strong,#141820);border:1px solid var(--line-3);box-shadow:var(--sh-2);font-family:var(--font-ui);display:flex;flex-direction:column;gap:8px}
.marker-sheet[hidden]{display:none}
.field-lines{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-3)} .field-lines b{color:var(--tx-1);text-align:right}
.field-sheet .marker-head b{display:inline-flex;align-items:center;gap:6px} .field-sheet .marker-head .icon{width:16px;height:16px} .field-sheet .btn{justify-content:center}
.barb-sheet{max-height:calc(100vh - var(--dock-h) - var(--safe-bd) - 120px);overflow-y:auto} .field-lines small{color:var(--tx-3);font-weight:500}
.barb-lv{padding:2px 7px;border-radius:999px;border:1px solid var(--bc);color:var(--bc);font:700 var(--fs-11)/1.2 var(--font-ui)}
.barb-hp{position:relative;height:18px;border-radius:9px;background:var(--well,rgba(0,0,0,.35));border:1px solid var(--line-2);overflow:hidden}
.barb-hp i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#7a1a16,#d8453a)} .barb-hp span{position:relative;display:block;text-align:center;font:700 var(--fs-11)/17px var(--font-ui);color:var(--tx-1);text-shadow:0 1px 2px rgba(0,0,0,.8);font-variant-numeric:tabular-nums}
.barb-rank{list-style:none;margin:0;padding:0;display:grid;gap:3px}
.barb-rank li{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:var(--r-xs);background:rgba(255,255,255,.03);border:1px solid var(--line-1);font:500 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-2)}
.barb-rank li em{width:16px;font-style:normal;font-weight:700;color:var(--gold-300);text-align:center} .barb-rank li:nth-child(-n+3) em{color:var(--gold-100)} .barb-rank li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.barb-rank li b{color:var(--tx-1);font-variant-numeric:tabular-nums} .barb-rank li.me{border-color:var(--line-3);background:rgba(214,170,90,.1)}
.barb-note{font:500 var(--fs-11)/1.35 var(--font-ui);color:var(--tx-3)}
/* Ereignisse (Paket B) */
.ev-body{display:flex;flex-direction:column;gap:8px}
.ev-card .field-lines b{display:flex;align-items:center;justify-content:flex-end;gap:5px;flex-wrap:wrap} .ev-card .field-lines .icon{width:13px;height:13px;color:var(--gold-300)}
.ev-card.is-tour{border-color:rgba(176,120,255,.4);background:rgba(160,92,235,.08)} .ev-card.is-warn{border-color:rgba(225,72,60,.55);background:rgba(150,30,30,.12)} .ev-card.is-drache{border-color:rgba(255,140,70,.55);background:rgba(170,60,20,.12)}
.ev-card .barb-ct{flex-wrap:wrap;row-gap:2px} .ev-card .barb-ct > b{white-space:nowrap} .ev-card .barb-ct small{margin-left:auto;text-align:right} .ev-card .barb-ct small b{font-variant-numeric:tabular-nums;color:var(--tx-1)} .ev-rot{color:#ff8a7a} .ev-prizes3{grid-template-columns:repeat(3,minmax(0,1fr))}
.ev-plan b{display:flex;align-items:center;justify-content:flex-end;gap:5px} .ev-plan .icon{width:13px;height:13px;color:#c9a2ff}
.barb-rank .who-link{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;text-align:left}
.barb-card{display:flex;flex-direction:column;gap:6px;padding:9px 10px;border-radius:var(--r-sm);background:rgba(255,255,255,.03);border:1px solid var(--line-1)}
.barb-ct{display:flex;align-items:baseline;justify-content:space-between;gap:8px} .barb-ct b{display:inline-flex;align-items:center;gap:6px;font:700 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-1)} .barb-ct .icon{width:15px;height:15px;color:var(--gold-300)} .barb-ct small{font:600 var(--fs-11)/1 var(--font-ui);color:var(--gold-200)}
.logGear{margin-top:8px;padding-top:8px;border-top:1px solid var(--line-1);display:grid;gap:6px}
.logGearHead{font:600 var(--fs-11)/1.2 var(--font-ui);color:var(--tx-2)}
.logGearItems{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
.gslot{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0} .gslot .tile{cursor:default;width:100%} .gslot .tile .lvl{font-size:9px}
.gslot small{font:500 9px/1.1 var(--font-ui);color:var(--tx-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.logGearHeroes{display:grid;gap:4px} .ghero{display:flex;align-items:center;gap:6px;font:500 var(--fs-11)/1.2 var(--font-ui);color:var(--tx-2)}
.ghero .hero-pic{width:44px;height:44px;flex:none;border-radius:8px;border:2px solid var(--hc,var(--line-2));box-shadow:0 2px 6px #0008} .ghero b{display:block;color:var(--tx-1);font-weight:600} .ghero small{color:var(--tx-3);font-size:10px}
.logGearMeta{font:500 10px/1.35 var(--font-ui);color:var(--tx-3)}
.logLine.buff.malus span:last-child{color:#ff8d82}
.logSrc{display:block;font:500 10px/1.25 var(--font-ui);color:var(--tx-3);letter-spacing:0;text-transform:none}
.army-hint{font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-3)} .army-inc{font-style:normal;color:#8cc0ff;font-weight:600}
.army-btns{display:grid;grid-template-columns:1fr 1fr;gap:6px} .army-btns .btn{justify-content:center}
.marker-head{display:flex;align-items:center;justify-content:space-between;color:var(--tx-1)}
.marker-presets{display:flex;flex-wrap:wrap;gap:6px}
.marker-presets button{padding:6px 10px;border-radius:999px;border:1px solid var(--line-2);background:rgba(255,255,255,.04);color:var(--tx-1);font:600 var(--fs-12)/1 var(--font-ui)}
.marker-presets button.on{border-color:var(--gold-300);background:rgba(214,170,90,.16)}
.marker-input{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid var(--line-2);background:rgba(0,0,0,.25);color:var(--tx-1);font:500 var(--fs-13)/1.2 var(--font-ui)}
.marker-colors{display:flex;gap:8px}
.marker-colors button{width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.25)}
.marker-colors button.on{border-color:#fff;box-shadow:0 0 0 2px rgba(214,170,90,.7)}
.marker-actions{display:flex;justify-content:space-between;gap:8px}
.mapctl button:hover{color:var(--gold-100);background:rgba(255,255,255,.03)}
.mapctl button:active{background:rgba(214,170,90,.12)}
.mapctl button:disabled{color:var(--tx-4);cursor:default}
.mapctl button + button{border-top:1px solid var(--line-1)}
.mapctl .icon{width:18px;height:18px}
@media (pointer:coarse){
  /* bigger finger targets, same visuals */
  .btn-x,.mapctl button{position:relative}
  .btn-x::before{content:"";position:absolute;inset:-6px}
  .mapctl button::before{content:"";position:absolute;inset:0 -4px}
  .mapctl button:first-child::before{top:-4px} .mapctl button:last-child::before{bottom:-4px}
}
body.is-multi .mapctl{display:none}   /* phones: pinch still works; desktop/landscape re-enable below */

/* =====================================================================
   TOAST  #hint  (textContent only; empty = hidden)
   ===================================================================== */
.toast{position:fixed;z-index:var(--z-toast);left:50%;transform:translateX(-50%);top:calc(var(--safe-t) + var(--hud-top-space));
  width:max-content;max-width:min(calc(100vw - 32px),440px);padding:7px 12px 7px 26px;pointer-events:none;
  background:var(--glass);border:1px solid var(--line-2);border-radius:var(--r-sm);box-shadow:var(--sh-2);
  font:500 var(--fs-12)/1.35 var(--font-ui);color:var(--tx-1);text-align:left;white-space:normal;overflow-wrap:anywhere;
  display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);animation:toast-in var(--dur-2) var(--ease-out)}
.toast::before{content:"";position:absolute;left:11px;top:50%;width:6px;height:6px;margin-top:-3px;transform:rotate(45deg);background:var(--gold-300);box-shadow:0 0 6px rgba(214,170,90,.6)}
.toast:empty{display:none}
.toast--lang{display:block;-webkit-line-clamp:none}   /* langer Hinweis (Saison): ganz lesbar, Umbruch statt „…“ */
.anleitung{position:fixed;z-index:var(--z-toast);left:calc(var(--safe-l,0px) + 10px);right:calc(var(--safe-r,0px) + 58px);bottom:calc(var(--dock-h,64px) + var(--safe-bd,0px) + 14px);
  max-width:420px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px 10px;padding:10px 8px 10px 12px;   /* Schritt · Text · × in einer Zeile, Knöpfe darunter */
  background:var(--glass);border:1px solid var(--gold-300);border-radius:var(--r-sm);box-shadow:var(--sh-2);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.anleitung[hidden]{display:none}
.anleitung-n{font:600 var(--fs-11)/1 var(--font-ui);color:var(--gold-100);letter-spacing:.06em;white-space:nowrap}
.anleitung-t{font:500 var(--fs-13)/1.35 var(--font-ui);color:var(--tx-1)}
.anleitung-k{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px}
.anleitung-ok{grid-column:1/-1;justify-self:end}
body.has-sheet .anleitung{display:none}
/* Anleitung: der nächste nötige Knopf pulsiert (06b anleitungZeigen setzt body[data-anl-puls]) */
@keyframes anl-puls{0%,100%{box-shadow:0 0 0 0 rgba(240,200,110,.85)}60%{box-shadow:0 0 0 9px rgba(240,200,110,0)}}
body[data-anl-puls="heim"] #homeBtn,body[data-anl-puls="knoepfe"] :is(#mapControls button,#hudRoh),
body[data-anl-puls="angriff"] #attackBtn,body[data-anl-puls="aufwerten"] #upgradeBtn,
body[data-anl-puls="stadt"] #cityNavBtn > .icon,body[data-anl-puls="stadtfenster"] #cityBtn,body[data-anl-puls="bauen"] #cityUpgradeBtn,
body[data-anl-puls="sammeln"] #fieldSheet [data-fsend],body[data-anl-puls="events"] #goalsBtn > .icon,
body[data-anl-puls="abholen"] #goalsPopup :is([data-daily],[data-quest],[data-bonus],[data-chain],[data-inbox],[data-inbox-all],[data-ach],[data-ach-all],[data-pass-l],[data-pass-all],[data-pass-old]):not(:disabled)
  {animation:anl-puls 1.4s ease-out infinite}
/* in der Stadt (Handy): der Hinweis erst unter der Bauarbeiter-Zeile – nie über ihren Knöpfen (--stadt-kopf: Unterkante, 08d stadtKopf) */
@media (max-width:899px),(max-height:500px){ body.in-stadt:not(.has-sheet) .toast{top:calc(var(--stadt-kopf,96px) + 10px)} }
@keyframes toast-in{from{opacity:0;translate:0 -6px}}
/* Handy: der Hinweis bleibt oben unter dem HUD (über der Karte, die Fenster sind höchstens 70 % hoch) – nie über Fenster-Kopf/Fuß oder den
   Zoom-Knöpfen; reicht ein Fenster doch so hoch, liegt der Hinweis dahinter */
@media (max-width:899px) and (min-height:501px){
  body.has-sheet .toast{z-index:calc(var(--z-sheet) - 1);box-shadow:var(--sh-2),0 0 0 1px rgba(0,0,0,.35)}
  body.has-sheet .toast--lang{display:none}   /* ein langer Hinweis würde das Fenster verdecken (die Saison steht dort ohnehin: Events → Boss & Lager) */
}
/* Hinweise (Toast) nie über Kopf oder Fußzeile dieser Fenster */
body:has(#heroHall:not([hidden])) .toast{top:auto;bottom:calc(var(--safe-b) + 96px)}
@media (min-width:900px) and (min-height:501px){ body:has(#citySheet:not([hidden])) .toast.toast.toast{top:calc(var(--safe-t) + var(--hud-top-space));bottom:auto} }   /* Desktop: die Leiste steht unten in der Mitte, das Burg-Fenster reicht bis dort – der Hinweis oben statt über der Fußzeile */
@media (max-width:899px),(max-height:500px){
  body:has(#shopPopup.is-open) .toast.toast.toast,body:has(#citySheet:not([hidden])) .toast.toast.toast{top:auto;bottom:calc(var(--dock-h) + var(--safe-bd) + 104px)}   /* (.toast dreifach: geht vor die allgemeine Fenster-Regel in 02) */
}

/* =====================================================================
   MULTI-ATTACK BAR  (JS: style.display = 'flex' | 'none')
   ===================================================================== */
.mabar{position:fixed;z-index:var(--z-mabar);left:calc(var(--safe-l) + 10px);right:calc(var(--safe-r) + 10px);bottom:calc(var(--dock-h) + var(--safe-bd) + 12px);
  display:none;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 10px;min-height:52px;padding:8px 8px 8px 12px;
  background:var(--glass);border:1px solid var(--line-2);border-radius:var(--r-sm);box-shadow:var(--sh-2);font-family:var(--font-ui);
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.mabar::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:2px;background:var(--f-multi)}
.mabar-l{flex:1 1 180px;display:flex;align-items:center;gap:8px;min-width:0}
.mabar-l .icon{width:18px;height:18px;color:var(--f-multi)}
.mabar .label{font:600 var(--fs-12)/1.25 var(--font-ui);color:var(--tx-1);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.mabar .row{display:flex;gap:6px;flex:none;margin-left:auto}
.mabar-seg{flex:1 1 200px;margin-top:0}

/* =====================================================================
   SCRIM
   ===================================================================== */
.scrim{position:fixed;inset:0;z-index:var(--z-scrim);background:var(--scrim);animation:fade-in var(--dur-2) var(--ease-out)}
.scrim--top{z-index:var(--z-scrim-top)}
@keyframes fade-in{from{opacity:0}}

/* =====================================================================
   PANEL (every popup) = frame + header + scrolling body + footer
   Visibility: JS toggles class .is-open via openPanel()/closePanel().
   ===================================================================== */
.panel{position:fixed;display:none;flex-direction:column;min-height:0;color:var(--tx-1);
  background:var(--noise),var(--panel-bg);box-shadow:var(--sh-3);border-radius:var(--r-xs)}
.panel.is-open{display:flex;animation:panel-in var(--dur-3) var(--ease-out)}
@keyframes panel-in{from{opacity:0;translate:0 14px}}
.panel::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:3;border:20px solid transparent;border-image:var(--frame) 20 / 20px stretch}
.sheet-grab{display:block;width:36px;height:4px;border-radius:2px;background:rgba(228,200,134,.28);margin:7px auto 0;flex:none}

.phead{position:relative;flex:none;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 12px 12px 14px;border-bottom:1px solid var(--line-1)}
.phead::after{content:"";position:absolute;left:50%;bottom:-6px;width:96px;height:12px;transform:translateX(-50%);background:var(--crest) center/contain no-repeat;pointer-events:none}
.phead-text{min-width:0}
.overline{font:600 var(--fs-10)/1.3 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.overline b{color:var(--gold-200);font-weight:600}
.ptitle{display:block;margin:3px 0 2px;font:600 var(--fs-17)/1.15 var(--font-display);letter-spacing:var(--track-display);color:var(--gold-100);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ptitle--input{width:100%;min-width:0;padding:1px 4px;margin-left:-4px;background:transparent;border:1px solid transparent;border-radius:var(--r-xs);outline:none}
.ptitle--input:hover{border-color:var(--line-1)}
.ptitle--input:focus{border-color:var(--line-3);background:rgba(0,0,0,.25);box-shadow:none}
.ptitle--input::placeholder{color:var(--gold-100);opacity:.6}
.psub{display:flex;align-items:center;gap:6px;min-width:0;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2);white-space:nowrap;overflow:hidden}
.psub .icon{width:13px;height:13px;color:var(--tx-3)}
.psub .sep{width:3px;height:3px;border-radius:50%;background:var(--tx-4);flex:none}
.psub > span:last-child{flex:none}   /* the march time never gets cut, the name truncates instead */
.psub > span:not(:last-child):not(.sep){min-width:0;overflow:hidden;text-overflow:ellipsis}
.psub > .psub-who{flex:0 1 auto;white-space:nowrap}
.psub:has(> .chip--scouted){flex-wrap:wrap;row-gap:3px}   /* fremde Basis: lieber zweite Zeile als „GES…“ oder „Kevin_93 · S…“ */
.dot{width:7px;height:7px;border-radius:50%;flex:none;box-shadow:0 0 0 2px rgba(0,0,0,.35)}
.dot--player{background:var(--f-player)} .dot--enemy{background:var(--f-enemy)} .dot--neutral{background:var(--f-neutral)}
.btn-x{width:var(--k-tipp);height:var(--k-tipp);display:grid;place-items:center;align-self:start;border-radius:var(--r-sm);color:var(--tx-2);border:1px solid transparent;transition:color var(--dur-1),border-color var(--dur-1)}
.btn-x .icon{width:16px;height:16px}
.btn-x:hover{color:var(--gold-100);border-color:var(--line-2)}

/* emblem = base crest in a header (faction tinted) */
.emblem{position:relative;width:44px;height:44px;display:grid;place-items:center;border-radius:var(--r-sm);
  background:radial-gradient(circle at 50% 35%,var(--em-lo2,#2b2f37),var(--em-lo,#15171b));border:1px solid var(--em-line,var(--line-2));
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06)}
.emblem .icon{width:24px;height:24px;color:var(--em-hi,var(--tx-1))}
.emblem--player{--em-lo:#0a1628;--em-lo2:#18365f;--em-line:rgba(140,192,255,.55);--em-hi:#c7e0ff}
.emblem--enemy{--em-lo:#1c0907;--em-lo2:#4a1511;--em-line:rgba(255,141,130,.55);--em-hi:#ffb3aa}
.emblem--neutral{--em-lo:#16171a;--em-lo2:#2e3036;--em-line:rgba(198,201,207,.35);--em-hi:#d7d9de}
.emblem--gold{--em-lo:#1a140a;--em-lo2:#3a2c14;--em-line:var(--line-3);--em-hi:var(--gold-200)}

.pbody{position:relative;flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
  padding:14px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin;scrollbar-color:var(--ink-5) transparent;
  /* top 10px fade: scrolled content dissolves before it reaches the header crest (.phead::after hangs 6px into the body) */
  -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 10px);mask-image:linear-gradient(180deg,transparent 0,#000 10px)}   /* unten: Schatten-Hinweis (01 .pbody) */
.pfoot{position:relative;flex:none;display:flex;gap:8px;align-items:center;padding:10px 14px 12px;border-top:1px solid var(--line-1);
  background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.3))}
.pfoot--wrap{flex-wrap:wrap}
.pfoot:not(:has(> :not([style*="display: none"]):not([hidden]))){display:none}

/* ---- panel placement: PHONE PORTRAIT (default) ---- */
/* Handy: ein Fenster ist höchstens 70 % hoch – die Karte bleibt oben sichtbar (Insel/Angriff 62 %) */
.panel--sheet{--sheet-max:min(70dvh,calc(100dvh - var(--safe-t) - var(--hud-top-space) - var(--dock-h) - var(--safe-bd)));
  left:var(--safe-l);right:var(--safe-r);top:auto;bottom:calc(var(--dock-h) + var(--safe-bd));max-height:var(--sheet-max);
  z-index:var(--z-sheet);border-radius:var(--r-lg) var(--r-lg) 0 0}   /* bottom-anchored, hugs its content up to the HUD */
#profilePopup{min-height:min(680px,var(--sheet-max))}   /* stable height: switching tabs never makes the sheet jump */
#battleLogPopup.has-entries{height:var(--sheet-max)}    /* live rows come and go every second: keep it steady once it has any */
.panel--island{left:var(--safe-l);right:var(--safe-r);bottom:calc(var(--dock-h) + var(--safe-bd));z-index:var(--z-sheet);
  max-height:min(62dvh,calc(100dvh - var(--dock-h) - var(--safe-bd) - var(--safe-t) - var(--hud-top-space)));border-radius:var(--r-lg) var(--r-lg) 0 0}
.panel--item{left:var(--safe-l);right:var(--safe-r);bottom:calc(var(--dock-h) + var(--safe-bd));z-index:var(--z-modal);
  max-height:min(70dvh,calc(100dvh - var(--dock-h) - var(--safe-bd) - var(--safe-t) - var(--hud-top-space)));border-radius:var(--r-lg) var(--r-lg) 0 0}
.panel .sheet-grab + .phead{padding-top:4px}
@media (max-width:899px),(max-height:500px){ body.has-sheet .mabar{display:none!important} }
body.has-panel .mapctl{display:none}

/* =====================================================================
   BUTTONS  (one system; variants by class only)
   ===================================================================== */
.btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:0;height:var(--btn-h);padding:0 14px;
  border-radius:var(--r-sm);border:1px solid transparent;font:600 var(--fs-12)/1 var(--font-ui);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;
  transition:filter var(--dur-1),transform var(--dur-1),border-color var(--dur-1),background-color var(--dur-1)}
.btn[style*="inline-block"]{display:inline-flex!important}   /* JS shows buttons with style.display='inline-block' */
.btn > span{overflow:hidden;text-overflow:ellipsis;line-height:1.4}   /* room for umlaut dots above uppercase caps (Ä/Ö/Ü) under overflow:hidden */
.btn .icon{width:16px;height:16px}
.btn:active{transform:translateY(1px)}
.btn--grow{flex:1 1 0}
.btn--full{flex:1 1 100%}
.btn--sm{height:var(--btn-h-sm);padding:0 10px;font-size:var(--fs-11);gap:6px}
.btn--sm .icon{width:14px;height:14px}
.btn--primary{color:var(--tx-inv);text-shadow:0 1px 0 rgba(255,238,200,.35);border-color:#f1d898;
  background:linear-gradient(180deg,#ecd08a 0%,#cfa458 45%,#a67b34 100%);box-shadow:inset 0 1px 0 rgba(255,248,222,.7),inset 0 -1px 0 rgba(90,60,15,.55),0 2px 10px rgba(0,0,0,.45)}
.btn--secondary{color:var(--gold-100);border-color:var(--line-2);background:linear-gradient(180deg,#1d222c,#12151b);box-shadow:var(--hi-inset),0 2px 8px rgba(0,0,0,.35)}
.btn--danger{color:#ffe8e2;border-color:#d6645a;text-shadow:0 1px 0 rgba(0,0,0,.35);
  background:linear-gradient(180deg,#b93a30 0%,#8c2720 55%,#6c1d17 100%);box-shadow:inset 0 1px 0 rgba(255,200,190,.35),inset 0 -1px 0 rgba(40,5,3,.6),0 2px 10px rgba(0,0,0,.45)}
.btn--danger-outline{color:var(--blood-300);border-color:rgba(214,100,90,.55);background:rgba(168,52,43,.1)}
.btn--ghost{color:var(--tx-2)}
@media (hover:hover){
  .btn--primary:hover{filter:brightness(1.07)}
  .btn--danger:hover{filter:brightness(1.1)}
  .btn--secondary:hover{border-color:var(--line-3)}
  .btn--danger-outline:hover{background:rgba(168,52,43,.18)}
  .btn--ghost:hover{color:var(--gold-100);background:rgba(255,255,255,.03)}
}
.btn:disabled,.act:disabled{color:var(--tx-4);text-shadow:none;background:var(--ink-3);border-color:var(--line-1);box-shadow:none;cursor:not-allowed;filter:none;transform:none}
.btn:disabled .icon,.act:disabled .icon{opacity:.6}
.cost{display:inline-flex;align-items:center;gap:3px;height:18px;padding:0 5px;border-radius:var(--r-xs);background:rgba(0,0,0,.22);
  font:700 10.5px/1 var(--font-ui);letter-spacing:0;font-variant-numeric:tabular-nums;text-transform:none}
.cost .icon{width:12px;height:12px}
.cost--gem .icon{color:var(--res-gem)} .cost--pt .icon{color:#5b3310}
.btn--secondary .cost{background:rgba(255,255,255,.05);color:var(--tx-1)}
.btn--secondary .cost--pt .icon{color:var(--res-point)}
.btn:disabled .cost{background:rgba(255,255,255,.03)}

/* action tiles (own-base menu) */
.actgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.act{display:grid;grid-template-columns:30px minmax(0,1fr);grid-template-rows:auto auto;column-gap:9px;row-gap:2px;align-items:center;text-align:left;
  min-height:48px;padding:7px 10px 7px 8px;border-radius:var(--r-sm);border:1px solid var(--line-1);background:linear-gradient(180deg,#1b2029,#12151b);box-shadow:var(--hi-inset)}
.act[style*="inline-block"]{display:grid!important}
.act-ic{grid-row:1 / span 2;width:30px;height:30px;display:grid;place-items:center;border-radius:var(--r-xs);background:rgba(0,0,0,.28);border:1px solid var(--line-1);color:var(--gold-300)}
.act-ic .icon{width:17px;height:17px}
.act-ic--send{color:var(--f-player-hi)} .act-ic--attack{color:var(--f-multi)} .act-ic--recall{color:var(--ember-300)}
.act-t{font:600 var(--fs-12)/1.3 var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--tx-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.act-s{display:flex;align-items:center;gap:3px;font:500 var(--fs-11)/1.1 var(--font-ui);color:var(--tx-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.act-s .icon{width:12px;height:12px}
.act-s.is-bad{color:#ff8d7e}   /* Aufwerten: die Münzen reichen (noch) nicht – färbt sich live um */
.act--primary{border-color:var(--line-3)}
@media (hover:hover){ .act:not(:disabled):hover{border-color:var(--line-2);background:linear-gradient(180deg,#20262f,#151920)} }
.act:not(:disabled):active{transform:translateY(1px)}

/* =====================================================================
   CHIPS / PILLS / TAGS
   ===================================================================== */
.chip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 8px;border-radius:var(--r-xs);background:rgba(255,255,255,.03);border:1px solid var(--line-1);
  font:600 var(--fs-11)/1 var(--font-ui);color:var(--tx-2);white-space:nowrap}
.chip .icon{width:13px;height:13px}
.chip--scouted{color:var(--gold-200);border-color:var(--line-2);height:18px;padding:0 6px;font-size:var(--fs-10);letter-spacing:.06em;text-transform:uppercase}
.chip--rar{height:auto;min-height:24px;max-width:100%;white-space:normal;line-height:1.4;padding-block:5px;--rc:var(--r-grau);color:color-mix(in srgb,var(--rc) 55%,#fff);border-color:color-mix(in srgb,var(--rc) 55%,transparent);background:color-mix(in srgb,var(--rc) 12%,transparent)}
.pill{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:var(--r-pill);border:1px solid var(--line-2);background:rgba(0,0,0,.25);
  font:600 var(--fs-12)/1 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums;white-space:nowrap}
.pill small{font:500 var(--fs-11)/1 var(--font-ui);color:var(--tx-3)}
.pill .icon{width:14px;height:14px}
.pill--points .icon{color:var(--res-point)} .pill--gem .icon{color:var(--res-gem)}
.unk{display:inline-flex;align-items:center;gap:4px;height:18px;padding:0 6px;border-radius:var(--r-xs);background:rgba(255,255,255,.04);border:1px dashed var(--line-2);
  font:600 var(--fs-10)/1 var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--tx-3)}
.unk .icon{width:11px;height:11px}

.rar-text{color:color-mix(in srgb,var(--rc) 70%,#fff)}

/* =====================================================================
   STAT TILES / NOTICE / VERSUS / KV
   ===================================================================== */
.popup-stats{display:flex;flex-direction:column;gap:10px}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.stat-grid--3{grid-template-columns:repeat(auto-fit,minmax(128px,1fr))}
.stat{min-width:0;padding:8px 10px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--line-1)}
.stat-l{display:flex;align-items:center;gap:5px;font:600 var(--fs-10)/1.3 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stat-l .icon{width:12px;height:12px;flex:none}
.stat-v{display:block;margin-top:5px;font:600 var(--fs-15)/1.1 var(--font-ui);font-variant-numeric:tabular-nums;color:var(--tx-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stat-v small{font-size:var(--fs-11);font-weight:500;color:var(--tx-3);margin-left:3px}
.stat-v.is-enemy{color:var(--f-enemy-hi)} .stat-v.is-good{color:var(--good)} .stat-v.is-gold{color:var(--gold-100)}
.notice{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:var(--r-sm);border:1px solid var(--line-2);background:rgba(214,170,90,.06);
  font:500 var(--fs-12)/1.35 var(--font-ui);color:var(--tx-2)}
.notice > .icon{width:17px;height:17px;color:var(--gold-300)}
.notice--gold{color:var(--gold-100)}
.notice--warn{border-color:rgba(242,160,102,.4);background:rgba(222,115,56,.08)} .notice--warn > .icon{color:var(--ember-300)}
.versus{display:grid;grid-template-columns:minmax(0,1fr) 28px minmax(0,1fr);align-items:stretch;gap:6px}
.force{min-width:0;padding:8px 10px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--line-1)}
.force--me{box-shadow:inset 2px 0 0 var(--f-player)}
.force--foe{box-shadow:inset -2px 0 0 var(--f-enemy);text-align:right}
.force .stat-l{justify-content:inherit}
.force--foe .stat-l{justify-content:flex-end}
.force b{display:block;margin-top:5px;font:600 var(--fs-17)/1 var(--font-ui);font-variant-numeric:tabular-nums}
.force small{display:block;margin-top:4px;font:500 var(--fs-11)/1.25 var(--font-ui);color:var(--tx-3)}
.vs{align-self:center;justify-self:center;width:24px;height:24px;display:grid;place-items:center;transform:rotate(45deg);border:1px solid var(--line-3);background:var(--ink-2)}
.vs span{transform:rotate(-45deg);font:600 9px/1 var(--font-display);color:var(--gold-200);letter-spacing:.04em}
.balance{position:relative;display:flex;height:6px;border-radius:3px;overflow:hidden;background:var(--f-enemy-lo)}
.balance i{display:block;height:100%;width:var(--a,50%);background:linear-gradient(90deg,#1e4e8c,var(--f-player));transition:width var(--dur-2) var(--ease-out)}
.balance b{display:block;flex:1;background:linear-gradient(90deg,var(--f-enemy),#7a221b)}
.balance::after{content:"";position:absolute;left:var(--a,50%);top:-2px;bottom:-2px;width:2px;margin-left:-1px;background:var(--gold-100);box-shadow:0 0 6px var(--gold-300)}
.balance-note{display:flex;justify-content:space-between;gap:8px;margin-top:5px;font:500 var(--fs-11)/1.2 var(--font-ui);color:var(--tx-3)}
.balance-note b{color:var(--good)} .balance-note b.is-bad{color:var(--blood-300)}
.kv{display:flex;flex-direction:column}
.kv > *,.statRow{display:flex;justify-content:space-between;align-items:center;gap:10px;min-height:34px;border-bottom:1px solid var(--line-1);font:500 var(--fs-12)/1.25 var(--font-ui);color:var(--tx-2)}
.kv > :last-child{border-bottom:0}
.kv b,.statRow b{font:600 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums;text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kv b.up{color:var(--good)} .kv b.down{color:var(--blood-300)}
.kv span{display:flex;align-items:center;gap:6px;min-width:0}
.kv span .icon{width:13px;height:13px;color:var(--tx-3)}

/* =====================================================================
   SECTION HEADINGS
   ===================================================================== */
.sect{display:flex;align-items:center;gap:8px;min-height:18px}
.sect::before{content:"";width:5px;height:5px;transform:rotate(45deg);border:1px solid var(--gold-300);flex:none}
.sect h4{margin:0;font:600 var(--fs-12)/1 var(--font-display);letter-spacing:.08em;color:var(--gold-100);white-space:nowrap}
.sect::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--line-2),transparent);order:5;min-width:12px}
.sect-aside{order:6;display:inline-flex;align-items:center;gap:6px} .sect > span.sect-aside{font:500 var(--fs-11)/1 var(--font-ui);color:var(--tx-3)}   /* Randnotiz wie „Neu um …“ (nicht größer als der Rest) */
/* Handy-Benachrichtigungen im Profil (benachrichtigung.js) */
.push-karte{display:flex;flex-direction:column;gap:8px}
.set-liste{display:flex;flex-direction:column}
.set-liste[hidden],.set-pw[hidden]{display:none}
.set-zeile{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:40px;border-bottom:1px solid var(--line-1);font:500 var(--fs-13)/1.25 var(--font-ui);color:var(--tx-1);cursor:pointer}
.set-zeile:last-child{border-bottom:0}
.set-zeile span{display:flex;flex-direction:column;gap:2px}
.set-zeile small{font-size:var(--fs-11);color:var(--tx-3)}
.set-zeile input{width:22px;height:22px;accent-color:var(--gold-300);flex:0 0 auto}
.set-wahl{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.set-wahl button{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:transparent;color:var(--tx-2);font:500 var(--fs-11)/1.2 var(--font-ui)}
.set-wahl button .icon{width:18px;height:18px}
.set-wahl button.on{border-color:var(--gold-300);color:var(--gold-100);background:rgba(214,170,90,.12)}
.set-knoepfe{display:flex;gap:8px;flex-wrap:wrap}
.set-pw{display:flex;flex-direction:column;gap:6px}
.set-pw input{height:38px;padding:0 10px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:#fff;color:#2b2118;font-size:16px}
.set-pw small{color:var(--tx-3);font-size:var(--fs-11)}
.set-ab{margin:0}
.set-hilfe p{margin:0 0 6px;font:400 var(--fs-12)/1.4 var(--font-ui);color:var(--tx-2)}
.push-karte[hidden],.push-karte .btn[hidden]{display:none}
.push-text{margin:0;font-size:var(--fs-13);line-height:1.45;color:var(--tx-2)}
.push-karte .btn{align-self:flex-start}

/* =====================================================================
   TABS  #profileTabs (class .active is toggled by showProfileTab)
   ===================================================================== */
.tabs{container:tabs / inline-size;position:relative;flex:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-bottom:1px solid var(--line-1);background:rgba(0,0,0,.18)}
.tab{position:relative;height:42px;display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;padding:0 4px;color:var(--tx-3);
  font:600 11px/1 var(--font-display);letter-spacing:.06em;transition:color var(--dur-1)}
.tab .icon{width:15px;height:15px}
.tab span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tab:hover{color:var(--tx-1)}
.tab.active{color:var(--gold-100);background:linear-gradient(180deg,transparent,rgba(214,170,90,.08))}
.tab.active .icon{color:var(--gold-300)}
.tab.active::after{content:"";position:absolute;left:14%;right:14%;bottom:-1px;height:2px;background:linear-gradient(90deg,transparent,var(--gold-300) 20%,var(--gold-300) 80%,transparent)}
.tab.active::before{content:"";position:absolute;left:50%;bottom:-4px;width:6px;height:6px;margin-left:-3px;transform:rotate(45deg);background:var(--gold-200);box-shadow:0 0 6px rgba(228,200,134,.8)}
.tab + .tab{box-shadow:-1px 0 0 var(--line-1)}
@container tabs (max-width:420px){ .tab{flex-direction:column;gap:5px;height:50px;font-size:10.5px;letter-spacing:0;padding:0 2px} .tab .icon{width:16px;height:16px} }
.profileTabPanel{display:none;flex-direction:column;gap:12px}
.profileTabPanel.active{display:flex}

/* profile hero header */
.phead--hero{grid-template-columns:auto minmax(0,1fr) auto;padding-bottom:14px}
.xp{display:flex;align-items:center;gap:8px;margin-top:6px;min-width:0}
.xp-l{font:600 var(--fs-10)/1 var(--font-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--tx-3);white-space:nowrap}
.xp-l b{color:var(--gold-100)}
.xp-track{flex:1;min-width:40px;height:4px;border-radius:2px;background:var(--ink-4);overflow:hidden;box-shadow:inset 0 1px 1px rgba(0,0,0,.6)}
.xp-track i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--gold-600),var(--gold-200));transition:width var(--dur-3) var(--ease-out)}
.xp-n{font:500 var(--fs-10)/1 var(--font-ui);color:var(--tx-3);font-variant-numeric:tabular-nums;white-space:nowrap}

/* =====================================================================
   EQUIPMENT: bonus chips, slots, rarity tiles, selection bar
   ===================================================================== */
.bonus-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.statChip{display:flex;flex-direction:column;align-items:center;min-width:0;padding:7px 4px 6px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--line-1);text-align:center}
.statChip .icon{width:14px;height:14px;color:var(--gold-300)}
.statChip b{display:block;margin-top:4px;font:600 var(--fs-13)/1 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums}
.statChip b.good{color:var(--good)}
.statChip span{display:block;max-width:100%;margin-top:3px;font:500 var(--fs-10)/1.25 var(--font-ui);color:var(--tx-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.slots{display:grid;grid-template-columns:repeat(4,minmax(0,76px));justify-content:space-between;gap:8px}
.slot{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}
.slot .tile{width:100%}
.slot-l{font:600 9px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3);white-space:nowrap}
.slot-r{font:500 var(--fs-10)/1 var(--font-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;color:color-mix(in srgb,var(--rc,var(--tx-3)) 70%,#fff)}

.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--tile),1fr));gap:6px}
.tile{--rc:var(--r-grau);position:relative;aspect-ratio:1;min-width:0;min-height:0;width:100%;height:auto;display:grid;place-items:center;border-radius:var(--r-sm);cursor:pointer;
  background:radial-gradient(110% 80% at 50% 115%,color-mix(in srgb,var(--rc) 42%,transparent) 0,transparent 62%),var(--tile-bg);
  border:1px solid color-mix(in srgb,var(--rc) 62%,transparent);box-shadow:inset 0 0 0 1px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.05);transition:border-color var(--dur-1),transform var(--dur-1)}
.tile > .icon{width:44%;height:auto;aspect-ratio:1;translate:0 2px;color:color-mix(in srgb,var(--rc) 45%,#fff);filter:drop-shadow(0 1px 0 rgba(0,0,0,.6))}
.tile[data-r="gold"],.tile[data-r="rot"]{box-shadow:inset 0 0 0 1px rgba(0,0,0,.55),inset 0 0 0 2px color-mix(in srgb,var(--rc) 30%,transparent),0 0 12px color-mix(in srgb,var(--rc) 22%,transparent)}
.tile::before{content:"";position:absolute;left:5px;top:5px;width:5px;height:5px;transform:rotate(45deg);background:var(--rc);box-shadow:0 0 5px var(--rc)}
.tile:active{transform:scale(.97)}
@media (hover:hover){ .tile:hover{border-color:color-mix(in srgb,var(--rc) 90%,#fff)} }
.tile.empty{--rc:#3a3f49;cursor:default;background:repeating-linear-gradient(135deg,rgba(255,255,255,.015) 0 6px,transparent 6px 12px),#0d1015;border:1px dashed rgba(212,176,102,.22)}
.tile.empty::before{display:none}
.tile.empty > .icon{color:var(--tx-4);opacity:.7;filter:none}
.tile .lvl{position:absolute;right:3px;bottom:3px;left:auto;top:auto;min-width:16px;height:14px;padding:0 3px;border-radius:var(--r-xs);
  background:rgba(5,6,8,.78);border:1px solid color-mix(in srgb,var(--rc) 45%,transparent);box-shadow:none;
  font:700 9.5px/12px var(--font-ui);color:var(--tx-1);text-align:center;font-variant-numeric:tabular-nums;display:block}
.tile .check{position:absolute;right:-5px;top:-5px;width:17px;height:17px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(180deg,#e9cb86,#a67b34);border:1px solid var(--ink-1);color:var(--tx-inv)}
.tile .check .icon{width:10px;height:10px}
.tile .selectDot{position:absolute;top:0;right:0;width:22px;height:22px;display:grid;place-items:center;border-radius:var(--r-xs);pointer-events:none}   /* hit-tested by the tile's click handler: Chrome's touch adjustment would otherwise snap centre taps onto this small target */
.tile .selectDot::after{content:"";width:13px;height:13px;border-radius:var(--r-xs);border:1px solid rgba(238,230,212,.45);background:rgba(5,6,8,.55);opacity:0;transition:opacity var(--dur-1)}
.tile .selectDot.checked::after{background:var(--gold-300) var(--tick) center/10px no-repeat;border-color:var(--gold-100)}
/* the empty box only shows once something is selected, on hover or on keyboard focus - the glyph stays clear otherwise */
.has-selection .tile .selectDot::after,.tile:hover .selectDot::after,.tile:focus-visible .selectDot::after,.tile .selectDot:focus-visible::after,.tile .selectDot.checked::after{opacity:1}
@media (pointer:coarse){ .tile .selectDot::after{opacity:.5} }
.tile:focus-visible{outline:none;box-shadow:var(--focus)}
.tile.is-selected{outline:1px solid var(--gold-200);outline-offset:1px}
.item-icon{--rc:var(--r-grau);position:relative;width:48px;height:48px;border-radius:var(--r-sm);display:grid;place-items:center;
  background:radial-gradient(110% 80% at 50% 115%,color-mix(in srgb,var(--rc) 48%,transparent),transparent 62%),var(--tile-bg);border:1px solid color-mix(in srgb,var(--rc) 70%,transparent)}
.item-icon .icon{width:26px;height:26px;color:color-mix(in srgb,var(--rc) 45%,#fff)}
.selbar{display:flex;flex:1;min-width:0;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 10px}
.selbar[style*="block"]{display:flex!important}   /* JS writes style.display='block' - keep the flex layout */
.selbar .label{flex:1 1 110px;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2);min-width:0}
.selbar .label b{color:var(--gold-100)}
.selbar .label.is-prompt{color:var(--tx-3)}
@media (max-width:359px),(max-height:700px){ .selbar .label.is-prompt{display:none!important} }   /* short screens: the inventory needs the row */
.selbar .row{display:flex;gap:6px;margin-left:auto;flex:none}
#profilePopup:not([data-tab="equip"]) #profileFoot{display:none}

/* =====================================================================
   SKILLS
   ===================================================================== */
.pointsline{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--r-sm);background:rgba(214,170,90,.06);border:1px solid var(--line-2);font:500 var(--fs-12)/1 var(--font-ui);color:var(--tx-2)}
.pointsline .icon{width:16px;height:16px;color:var(--gold-300)}
.skill-reset{display:inline-flex;align-items:center;gap:4px;margin-left:8px;padding:5px 9px;border-radius:999px;border:1px solid var(--line-2);background:rgba(255,255,255,.04);color:var(--tx-2);font:600 var(--fs-11)/1 var(--font-ui);white-space:nowrap}
.skill-reset .icon{width:13px;height:13px} .skill-reset.is-armed{border-color:#f2a066;color:#f3e6c4;background:rgba(222,115,56,.16)}
.pointsline b{margin-left:auto;font:600 var(--fs-15)/1 var(--font-ui);color:var(--gold-100);font-variant-numeric:tabular-nums}
.skillDetail{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--line-1)}
.skillDetail .icon-box{width:44px;height:44px;display:grid;place-items:center;border-radius:var(--r-sm);background:var(--tile-bg);border:1px solid var(--line-2);color:var(--sk,var(--gold-200))}
.skillDetail .icon-box .icon{width:24px;height:24px}
.skillDetail .info{min-width:0;font:500 var(--fs-12)/1.35 var(--font-ui);color:var(--tx-2)}
.skillDetail .info b{display:block;margin-bottom:2px;font:600 var(--fs-13)/1.2 var(--font-display);letter-spacing:.04em;color:var(--gold-100)}
.skillCross{position:relative;width:min(100%,272px);aspect-ratio:1;margin:4px auto 0;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);place-items:center;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300' preserveAspectRatio='none'%3E%3Cpath d='M150 50V150M50 150H250M50 150V250M250 150V250' stroke='%23d4ad66' stroke-opacity='.35' stroke-width='1' vector-effect='non-scaling-stroke' fill='none'/%3E%3C/svg%3E") center/100% 100% no-repeat}
.skillNode{--sk:var(--tx-1);position:relative;width:62px;height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:var(--r-sm);
  background:radial-gradient(90% 70% at 50% 110%,color-mix(in srgb,var(--sk) 22%,transparent),transparent 65%),var(--tile-bg);border:1px solid var(--line-2);box-shadow:var(--sh-1);transition:border-color var(--dur-1)}
.skillNode .nIcon{display:grid;place-items:center;color:var(--sk)}
.skillNode .nIcon .icon{width:24px;height:24px}
.skillNode .nLevel{font:700 var(--fs-10)/1 var(--font-ui);color:var(--tx-2);font-variant-numeric:tabular-nums}
.skillNode[data-level="0"] .nIcon{opacity:.45}
.skillNode.selected{border-color:var(--gold-200);box-shadow:var(--glow-gold)}
:is(.skillNode,.skillDetail)[data-skill="speed"]{--sk:var(--tx-1)} :is(.skillNode,.skillDetail)[data-skill="troops"]{--sk:var(--res-troop)}
:is(.skillNode,.skillDetail)[data-skill="defense"]{--sk:var(--f-player-hi)} :is(.skillNode,.skillDetail)[data-skill="attack"]{--sk:var(--blood-300)}
:is(.skillNode,.skillDetail)[data-skill="attackGold"],:is(.skillNode,.skillDetail)[data-skill="defenseGold"]{--sk:var(--gold-300)}

/* =====================================================================
   LIST ROWS  (.logList .logRow  - battle log)
   ===================================================================== */
.logList{display:flex;flex-direction:column}
.logRow{--lc:var(--line-2);position:relative;display:grid;grid-template-columns:28px minmax(0,1fr) auto;column-gap:10px;align-items:center;min-height:46px;padding:6px 4px 6px 10px;border-bottom:1px solid var(--line-1)}
.logRow::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:2px;background:var(--lc)}
.logRow .li{width:28px;height:28px;display:grid;place-items:center;border-radius:var(--r-xs);background:rgba(255,255,255,.03);border:1px solid var(--line-1)}
.logRow .li .icon{width:16px;height:16px;color:var(--lc)}
.logRow .lt{min-width:0}
.logRow .lt b{display:block;font:600 var(--fs-13)/1.25 var(--font-ui);color:var(--tx-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.logRow .lt small{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;margin-top:2px;font:500 var(--fs-11)/1.25 var(--font-ui);color:var(--tx-3);white-space:normal;overflow:hidden;overflow-wrap:anywhere}
.logRow .lt small.logOrt{display:flex;align-items:center;gap:8px;-webkit-line-clamp:unset;font-variant-numeric:tabular-nums}
.logRow .lt small.logOrt .btn{min-height:22px;padding:0 8px;font-size:10px}
#popupEmblem[data-profile]{cursor:pointer}
.rp-bund{display:flex;align-items:center;gap:6px;width:fit-content;max-width:100%;margin-top:5px;padding:3px 9px 3px 3px;border:1px solid var(--line-1);border-radius:999px;background:rgba(0,0,0,.22);font:600 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-1);text-align:left;cursor:pointer}
.rp-bund > span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} .rp-bund .bd-wappen{width:20px;height:20px;border-radius:6px} .rp-bund .bd-wappen .icon{width:12px;height:12px}
#rulerSub{flex-wrap:wrap;row-gap:0} .rp-bundzeile{flex:1 0 100%;min-width:0} .rp-bund.is-leer{color:var(--tx-2);padding-left:9px} span.rp-bund{cursor:default} .rp-bund > .icon{width:14px;height:14px} .bd-zeile.is-ziel{outline:2px solid var(--gold-300);outline-offset:2px;border-radius:10px}
.logRow .lv{font:600 var(--fs-12)/1 var(--font-ui);color:var(--tx-2);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.seg.hero-seg{display:flex;flex-wrap:wrap} .seg.hero-seg button{flex:1 1 28%;display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:0 6px;border-left:3px solid var(--hc,var(--line-1))} .seg.hero-seg button small{color:var(--gold-200);font-size:10px} .seg.hero-seg button:disabled{opacity:.4} .seg.hero-seg .hero-pic{width:22px;height:22px;flex:none;border-radius:5px;border:1px solid var(--hc)} .seg.hero-seg button small{white-space:nowrap}
.logHero{padding:6px 0;border-top:1px solid var(--line-1)} .logHeroFire{font-style:normal;color:var(--gold-200);font-weight:700}
/* Heldenhalle: grid of tall rarity cards → one hero (figure left, info right; stacked on phones) */
.hh{position:fixed;inset:0;z-index:58;overflow-y:auto;overscroll-behavior:contain;background:var(--noise),radial-gradient(circle at 50% 0,#1d1a14,#07080b 70%);color:var(--tx-1);padding:calc(var(--safe-t) + 8px) 12px calc(var(--safe-b) + 16px);animation:fade-in var(--dur-2) var(--ease-out)}
.hh[hidden]{display:none}
.hh > *{max-width:980px;margin-left:auto;margin-right:auto}
.hh-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:6px 2px 12px;border-bottom:1px solid var(--line-1)}
.hh-head h2{margin:3px 0 2px;font:600 var(--fs-17)/1.15 var(--font-display);letter-spacing:var(--track-display);color:var(--gold-100);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Alle Fenster gleich (Alexander 4.10., wie in Rise of Kingdoms): derselbe Rahmen, Kopf (Zeichen · Überzeile · Titel · ×), Hintergrund, Höhe */
.hh{background:var(--noise),var(--panel-bg)}
.hh::before,.city-sheet::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:3;border:20px solid transparent;border-image:var(--frame) 20 / 20px stretch}
.city-sheet::before{position:absolute}
.panel--sheet{height:var(--sheet-max)}
body.in-stadt .hud,body.in-stadt .nav{z-index:52} body.in-stadt .panel{z-index:53} body.in-stadt .roh-drop{z-index:54}
body.in-stadt .city-head{padding-top:calc(var(--safe-t) + var(--hud-top-space) + 6px);background:linear-gradient(180deg,rgba(6,8,12,.75),rgba(6,8,12,.3) 70%,transparent)}
body.in-stadt .city-title,body.in-stadt #cityCloseBtn{display:none}
body.in-stadt .city-sheet{bottom:calc(var(--dock-h) + var(--safe-bd));padding-bottom:14px;max-height:calc(100% - var(--dock-h) - var(--safe-bd) - var(--safe-t) - var(--hud-top-space) - 60px)}
.city-bdesc{display:none} .city-sheet.zeig-info .city-bdesc{display:block}
.city-info-btn.on{color:var(--gold-100);border-color:var(--line-3)}
.hh-pairs{padding:8px 0 4px;border-top:1px solid var(--line-2)} .hh-pairs h3{margin:6px 0;font:700 var(--fs-11)/1 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3)}
.hh-pair{display:flex;gap:10px;align-items:center;padding:8px;margin-top:6px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:#0005} .hh-pair.is-on{border-color:var(--gold-300);background:rgba(228,200,134,.08)}
.hh-pair-pics{display:flex;flex:none} .hh-pair-pics button{padding:0;border:0;background:none;cursor:pointer} .hh-pair-pics .hero-pic{display:block;width:44px;height:44px;border-radius:8px;border:1px solid var(--line-2)} .hh-pair-pics button+button{margin-left:-8px}
.hh-pair-pics button.is-locked .hero-pic{filter:grayscale(1) brightness(.5)}
.hh-pair-t{display:grid;gap:2px;min-width:0} .hh-pair-t b{font:700 var(--fs-13)/1.2 var(--font-ui);color:var(--gold-100)} .hh-pair-t small{font-size:11px;color:var(--tx-3)} .hh-pair-t em{font-style:italic;font-size:12px;color:var(--tx-2)}
.hh-story{margin:0;font-style:italic;font-size:var(--fs-13);line-height:1.45;color:var(--tx-2)}
.seg.hero-seg2{margin-top:6px} .hero-seg2-l{flex:1 1 100%;font-size:11px;color:var(--tx-3);padding:2px 2px 4px} .seg.hero-seg button.is-pair{box-shadow:inset 0 0 0 1px var(--gold-300)} .seg.hero-seg button.is-pair small{color:var(--gold-100)}
.hh-count{padding:8px 0;font:500 var(--fs-12)/1.4 var(--font-ui);color:var(--tx-3);text-align:center}
.hh-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:10px;padding:4px 0 8px}
.hh-card{position:relative;aspect-ratio:3/4.3;border-radius:var(--r-lg);overflow:hidden;cursor:pointer;border:2px solid var(--rc);background:linear-gradient(170deg,var(--rc) 0%,#0b0c10 78%);padding:0;color:var(--tx-1);font:inherit;box-shadow:0 4px 10px #0008;transition:transform var(--dur-1) ease}
.hh-card:active{transform:scale(.98)}
.hh-card.is-locked{background:linear-gradient(170deg,color-mix(in srgb,var(--rc) 35%,#0b0c10) 0%,#0b0c10 78%)}
.hh-art{position:absolute;left:0;right:0;top:0;aspect-ratio:1;-webkit-mask:linear-gradient(#000 62%,#0000);mask:linear-gradient(#000 62%,#0000)} .hh-art .hero-pic{display:block;width:100%;height:100%}
.hh-card.is-locked .hh-art{filter:grayscale(1) brightness(.45)}
.hh-lk{position:absolute;right:5px;top:5px;font:700 9px/1 var(--font-ui);letter-spacing:.06em;text-transform:uppercase;background:#000c;border:1px solid var(--rc);border-radius:var(--r-pill);padding:3px 6px}
.hh-dot{position:absolute;left:6px;top:6px;width:11px;height:11px;border-radius:50%;background:#e33;border:2px solid #000}
.hh-foot{position:absolute;left:0;right:0;bottom:0;padding:6px 4px 7px;background:linear-gradient(0deg,#000e,#0000);text-align:center;display:grid;gap:1px;justify-items:center}
.hh-foot b{font:700 var(--fs-13)/1.1 var(--font-ui);text-shadow:0 1px 2px #000}
.hh-foot small{font-size:10px;color:#ffffffaa}
.hh-frag{display:block;width:80%;height:6px;border-radius:3px;background:#0009;overflow:hidden;margin-top:3px} .hh-frag i{display:block;height:100%;background:var(--gold-300)}
.hh-qstars{display:inline-flex;gap:3px;align-items:center}
.hh-qstars i{width:14px;height:14px;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);background:linear-gradient(90deg,var(--gold-200) 0 var(--f),#ffffff26 var(--f) 100%)}
.hh-hero{position:relative;display:grid;grid-template-columns:1fr 320px;margin-top:10px;border:1px solid var(--line-2);border-radius:var(--r-lg);overflow:hidden;background:radial-gradient(circle at 35% 40%,var(--glow),#0a0b0e 65%)}
.hh-stage{position:sticky;top:0;align-self:start;height:min(560px,calc(100vh - 140px));min-height:440px}
.hh-id{position:absolute;left:14px;top:12px;display:flex;flex-direction:column;gap:4px;z-index:2;text-shadow:0 1px 3px #000}
.hh-gem{display:inline-flex;align-items:center;gap:6px;font:800 11px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--rc)}
.hh-gem::before{content:"";width:11px;height:11px;transform:rotate(45deg);background:var(--rc);border:2px solid #000}
.hh-nm{font:700 30px/1 var(--font-display);text-shadow:0 3px 10px #000}
.hh-ttl{font:500 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-2)}
.hh-id .hh-qstars i{width:22px;height:22px}
.hh-floor{position:absolute;left:10%;right:10%;bottom:14px;height:40px;border-radius:50%;background:radial-gradient(ellipse,#000a,transparent 70%)}
.hh-portrait{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);width:min(300px,76%);aspect-ratio:1;border-radius:18px;border:2px solid var(--rc);box-shadow:0 0 0 4px #0007,0 12px 44px var(--glow);z-index:0}
.hh-portrait.is-locked{filter:grayscale(.85) brightness(.6)}
.hh-panel{background:linear-gradient(180deg,rgba(20,22,28,.9),rgba(12,13,17,.95));border-left:1px solid var(--line-2)}
.hh-blk{padding:12px 14px;border-bottom:1px solid var(--line-1)}
.hh-blk h3{margin:0 0 8px;font:700 var(--fs-11)/1 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3)}
.hh-top{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}
.hh-pow{font:700 22px/1 var(--font-display);color:var(--gold-200)}
.hh-role{font-size:var(--fs-12);color:var(--tx-3)} .hh-role em{font-style:normal;color:var(--ember-300)}
.hh-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:8px}
.hh-steps span{font-size:10.5px;text-align:center;padding:4px 2px;border-radius:var(--r-sm);background:#0006;color:var(--tx-3)}
.hh-steps span.on{background:rgba(228,200,134,.15);color:var(--gold-200)}
.hh-qinfo{display:flex;justify-content:space-between;gap:8px;font-size:var(--fs-12);color:var(--tx-3);margin-top:8px;font-variant-numeric:tabular-nums} .hh-qinfo b{color:var(--tx-1);white-space:nowrap}
.hh-bar{height:9px;border-radius:5px;background:#0008;overflow:hidden;margin-top:4px;border:1px solid #ffffff14}
.hh-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--gold-500),var(--gold-200))}
.hh-bar.hh-rage i{background:linear-gradient(90deg,#8a2a1a,#f08a4a)}
.hh-skh{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px} .hh-skh h3{margin:0}
.hh-pts{font:800 11px/1 var(--font-ui);color:var(--tx-inv);background:var(--gold-200);border-radius:var(--r-pill);padding:4px 9px}
.hh-pts.off{background:#0006;color:var(--tx-3);border:1px solid var(--line-2)}
.hh-sklist{display:flex;flex-direction:column;gap:8px}
.hh-sk{display:grid;grid-template-columns:40px 1fr 32px;gap:10px;align-items:center;background:#0005;border:1px solid var(--line-1);border-radius:var(--r-lg);padding:8px}
.hh-sk.is-locked{opacity:.5}
.hh-hx{width:40px;height:46px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);display:grid;place-items:center;font:700 17px/1 var(--font-display);color:#fff;background:linear-gradient(180deg,var(--sc),#0009)}
.hh-hx.act{background:linear-gradient(180deg,#ffd76a,#c9771f);color:#2a1a05}
.hh-skt{min-width:0} .hh-skt b{font-size:var(--fs-13)}
.hh-skt small{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--tx-3)}
.hh-skt p{margin:3px 0 4px;font-size:var(--fs-12);color:var(--tx-2);line-height:1.4} .hh-skt .hh-max{font-size:11px;color:var(--tx-4);margin-top:0}
.hh-pips{display:flex;gap:3px} .hh-pips i{width:8px;height:8px;border-radius:50%;background:#ffffff25} .hh-pips i.on{background:var(--gold-200)}
.hh-plus{width:32px;height:32px;border-radius:var(--r-lg);border:1px solid #8a6414;background:linear-gradient(180deg,#fff0b8,#e6b340);color:#1b1400;font:900 18px/1 var(--font-ui);cursor:pointer;box-shadow:inset 0 -2px 0 #a8791c,0 2px 0 #5e4410}
.hh-plus:active{transform:translateY(1px)} .hh-plus:disabled{filter:grayscale(1);opacity:.35;box-shadow:none;cursor:default}
.hh-hint{margin:8px 0 0;font-size:11.5px;line-height:1.45;color:var(--tx-3)}
.hh-reset{margin-top:8px;width:100%;font:700 var(--fs-12)/1 var(--font-ui);color:var(--tx-1);background:var(--ink-4);border:1px solid var(--line-2);border-radius:var(--r-lg);padding:9px;cursor:pointer} .hh-reset:disabled{opacity:.4;cursor:default}
/* Gems-Käufe ab 500: „Wirklich? N Gems“ (gemsWirklich) */
.is-armed:is(.hh-reset,.lk-card,.ring-card,[data-hchest],#citySpeedBtn){border-color:#f2a066;box-shadow:0 0 0 1px #f2a066 inset;background-color:rgba(222,115,56,.16)}
.is-armed:is(.lk-card,.ring-card) small{color:#f3e6c4}
.hh-swap{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px;font-size:var(--fs-12);color:var(--tx-3)} .hh-swap label{display:flex;flex-wrap:wrap;align-items:center;gap:6px;flex:1 1 180px}
.hh-swap select{font:600 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-1);background:var(--ink-4);border:1px solid var(--line-2);border-radius:var(--r-md,8px);padding:6px 8px;max-width:100%}
.hh-swap-go{font:700 var(--fs-12)/1 var(--font-ui);color:var(--tx-1);background:var(--ink-4);border:1px solid var(--gold-300);border-radius:var(--r-lg);padding:9px 12px;cursor:pointer}
.hh-vals{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.hh-vals div{display:flex;justify-content:space-between;gap:8px;background:#0006;border-radius:var(--r-sm);padding:6px 8px;font-size:12.5px;white-space:nowrap} .hh-vals span{color:var(--tx-3)}
.hh-actions{position:sticky;bottom:0;padding:10px 0 0;background:linear-gradient(0deg,#07080b 60%,transparent)}
.hh-go{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px;font:800 14px/1.1 var(--font-ui);color:#1b1400;border:1px solid #8a6414;border-radius:10px;cursor:pointer;
  background:linear-gradient(180deg,#fff0b8 0%,#f5cf62 45%,#d9a02a 100%);box-shadow:inset 0 1px 0 #fffbe6,inset 0 -3px 0 #a8791c,0 3px 0 #5e4410,0 6px 14px #0008}
.hh-go:active{transform:translateY(2px)} .hh-go:disabled{filter:grayscale(.8) brightness(.7);cursor:default;transform:none}
.hh-go small{font-weight:800;font-size:10.5px;background:#5e441022;border:1px solid #8a641455;border-radius:var(--r-pill);padding:2px 8px;color:#5a4000}
.hh-i{width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:#5e4410;color:#ffe08a}
.hh-steps .icon,.seg.hero-seg small .icon{width:10px;height:10px;vertical-align:-1px;margin-right:1px} .hh-i .icon{width:15px;height:15px}
.hh-open{width:100%} .hh-badge{min-width:20px;height:20px;margin-left:4px;border-radius:10px;background:#e33;color:#fff;font:800 11px/20px var(--font-ui);font-style:normal;text-align:center;padding:0 5px;text-shadow:none}
@media (max-width:760px){.hh-hero{grid-template-columns:1fr} .hh-panel{border-left:0;border-top:1px solid var(--line-2)} .hh-stage{position:relative;height:auto;min-height:330px} .hh-stage{min-height:360px} .hh-portrait{width:240px;bottom:14px}}
.crest-card{display:grid;grid-template-columns:56px 1fr auto;gap:12px;align-items:center;width:100%;padding:10px 12px;margin:4px 0 8px;border:1px solid var(--line-2);border-radius:8px;background:rgba(255,255,255,.03);color:var(--tx-1);text-align:left;cursor:pointer}
.crest-card:hover{border-color:var(--gold-300)} #crestSmall{width:56px;height:56px} .crest-card-t{display:grid;gap:2px} .crest-card-t small{color:var(--tx-2)}
.crest-card-go{display:inline-flex;align-items:center;gap:6px;font:600 var(--fs-12)/1 var(--font-ui);color:var(--gold-300)} .crest-card-go .icon{width:14px;height:14px}
.crest-ed{display:grid;grid-template-columns:88px 1fr;gap:12px;align-items:start;margin-bottom:6px} #crestPreview{width:88px;height:88px}
.crest-opts{display:grid;gap:6px} .crest-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap} .crest-row>span{width:84px;font-size:var(--fs-12);color:var(--tx-2)}
.crest-row button{width:30px;height:30px;padding:0;border-radius:6px;border:1px solid var(--line-2);background:rgba(255,255,255,.04);display:grid;place-items:center;cursor:pointer}
.crest-row button.on{border-color:var(--gold-300);box-shadow:0 0 0 1px var(--gold-300)} .crest-row button canvas{width:22px;height:22px} .crest-row .sw{width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,.5)}
.avatar img{width:78%;height:78%;object-fit:contain}
.forge-tabs{display:flex;flex-wrap:wrap;margin:8px 0} .forge-tabs button{display:inline-flex;align-items:center;gap:4px} .forge-tabs .icon{width:14px;height:14px} .forge-on{font-style:normal;font-size:var(--fs-12);color:var(--gold-300)}
.keep-h{margin:12px 0 6px;font:700 var(--fs-12)/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-2)} .keep-shields{display:grid;grid-template-columns:repeat(3,1fr);gap:6px} .keep-shields .btn{justify-content:center;gap:4px}
.keep-note{display:block;margin-top:6px;color:var(--tx-2)} .ring-legend{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:var(--fs-12);color:var(--tx-2)} .ring-legend i{display:inline-block;width:12px;height:12px;border-radius:50%;border:3px solid var(--c);margin-right:5px;vertical-align:-2px} .ring-legend i.blood{box-shadow:0 0 0 2px #ffd05a} .ring-legend{margin-top:8px} .ring-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px;margin-top:6px}
.ring-card{display:grid;justify-items:center;gap:3px;padding:8px 4px;border:1px solid var(--line-2);border-radius:8px;background:rgba(255,255,255,.03);color:var(--tx-1);cursor:pointer;font-size:var(--fs-12)} .ring-card.on{border-color:var(--gold-300);box-shadow:0 0 0 1px var(--gold-300)}
.ring-card small{display:inline-flex;align-items:center;gap:3px;color:var(--tx-2)} .ring-card .icon{width:12px;height:12px}
.ring-prev{width:30px;height:30px;border-radius:50%;border:4px solid var(--c);box-shadow:0 0 0 2px rgba(10,8,4,.55),0 0 0 4px var(--c2)} .ring-prev.is-none{border:2px dashed var(--line-3);box-shadow:none}
.skin-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
.skin-card{display:grid;justify-items:center;gap:2px;padding:6px 4px 8px;border:1px solid var(--line-2);border-radius:8px;background:rgba(255,255,255,.03);color:var(--tx-1);cursor:pointer} .skin-card.on{border-color:var(--gold-300);box-shadow:0 0 0 1px var(--gold-300)}
.skin-card canvas{width:60px;height:66px} .skin-card small{display:inline-flex;align-items:center;gap:3px;color:var(--tx-2)} .skin-card .icon{width:12px;height:12px}
.lk-top{display:flex;align-items:center;gap:12px;padding:12px 2px 10px} .lk-me{width:58px;height:58px;flex:none;border-radius:50%;padding:6px;background:conic-gradient(from 200deg,var(--fr1),var(--fr2),var(--fr1),var(--fr2),var(--fr1))}
.lk-me img{display:block;width:100%;height:100%;border-radius:50%;background:#141a24;padding:3px} .lk-me-t{flex:1;min-width:0;display:grid;gap:3px} .lk-me-t b{font:700 var(--fs-14)/1.2 var(--font-ui);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lk-me-t small{font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--gold-100)} .lk-pay{display:flex;flex-direction:column;align-items:flex-end;gap:4px} .lk-pay .pill b{font-variant-numeric:tabular-nums}
#lkTabs.tabs{grid-template-columns:repeat(4,minmax(0,1fr))} .lk-tabs{position:sticky;top:calc(-8px - var(--safe-t));z-index:3;background:#0e0e11;border:1px solid var(--line-1);border-radius:8px 8px 0 0} .lk-pane{padding:12px 2px 8px} .lk-pane[hidden]{display:none}
.lk-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))} .lk-grid--m{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))} .lk-grid--m canvas{width:140px;height:70px}
.lk-card{align-content:start;min-height:100px} .lk-card.is-shop{background:rgba(0,0,0,.28);border-style:dashed} .lk-card b{font:600 var(--fs-12)/1.2 var(--font-ui);text-align:center}
.lk-card.on small{color:var(--gold-100)} .lk-cost{display:inline-flex;align-items:center;gap:3px;font-weight:700;color:var(--gold-100);font-variant-numeric:tabular-nums} .lk-cost.is-bad{color:#e0685c}
.lk-frame{width:48px;height:48px;margin:4px 0 2px;border-radius:50%;padding:5px;background:conic-gradient(from 200deg,var(--fr1),var(--fr2),var(--fr1),var(--fr2),var(--fr1))} .lk-frame img{display:block;width:100%;height:100%;border-radius:50%;background:#141a24;padding:3px}
.lk-grid--t .lk-card{min-height:0} .lk-plate{display:grid;place-items:center;width:100%;min-height:40px;padding:4px 6px;border-radius:4px;border:1px solid var(--line-3);background:linear-gradient(180deg,#2a2419,#15120d);font:600 var(--fs-12)/1.15 var(--font-display);color:var(--gold-100);text-align:center}
.lk-mid{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line-2);border-radius:10px;background:rgba(0,0,0,.22)} .lk-mid > .icon{width:22px;height:22px;flex:none;color:var(--tx-3)} .lk-mid > span:not(.frame-ring){display:grid;gap:2px} .lk-mid > .frame-ring{flex:none} .lk-mid small{color:var(--tx-2)}
.lk-mid.is-good{border-color:#ffd05a} .lk-mid.is-good > .icon{color:#ffd05a} .lk-mid.is-bad{border-color:#e13030} .lk-mid.is-bad > .icon{color:#e13030} .lk-mid.is-ruler{border-color:#eb3c32;box-shadow:inset 0 0 0 1px rgba(255,208,90,.5)} .lk-mid.is-ruler > .icon{color:#ffd05a}
.lk-cap{grid-template-columns:repeat(2,1fr)} .ring-card.is-shop{background:rgba(0,0,0,.28);border-style:dashed} .lk .look-titles .look-title .icon{width:12px;height:12px}
.logWounded,.logRetreat.logWounded{color:#f2c94c;font-weight:600}
.logCasualty.wounded span,.logCasualty.wounded span:last-child{color:#f2c94c}
.march-all{display:flex;justify-content:flex-end;padding:2px 4px 6px}
.march-all .mact{display:flex} .logRow .mact,.march-all .mact{grid-column:2/4;display:flex;gap:6px;justify-content:flex-end;margin-top:4px}
.logRow .mact button,.march-all .mact button{display:inline-flex;align-items:center;gap:4px;min-height:30px;padding:0 10px;border-radius:6px;border:1px solid var(--line-2);background:rgba(255,255,255,.04);color:var(--tx-1);font:600 var(--fs-12)/1 var(--font-ui);cursor:pointer}
.logRow .mact button:hover,.march-all .mact button:hover{border-color:var(--gold-300)} .logRow .mact .icon,.march-all .mact .icon{width:14px;height:14px}
.logList .logRow{margin:0 0 6px;border:1px solid var(--line-1);border-radius:10px;padding:8px 10px 8px 12px;overflow:hidden;
  background:linear-gradient(90deg,color-mix(in srgb,var(--lc) 12%,transparent),rgba(255,255,255,.015) 45%)}
.logList .logRow::before{top:0;bottom:0;width:3px}
.logList .logRow .li{border-radius:50%;background:color-mix(in srgb,var(--lc) 14%,transparent);border-color:color-mix(in srgb,var(--lc) 45%,transparent)}
.lbadge{display:inline-block;margin-right:6px;padding:2px 7px;border-radius:999px;font:700 9.5px/1.3 var(--font-ui);letter-spacing:.08em;text-transform:uppercase;vertical-align:1px;
  color:var(--lc);background:color-mix(in srgb,var(--lc) 16%,transparent);border:1px solid color-mix(in srgb,var(--lc) 45%,transparent)}
.lbadge--win{--lc:#8fcf7a} .lbadge--loss{--lc:var(--blood-300)} .lbadge--scout{--lc:var(--gold-300)} .lbadge--send{--lc:var(--f-player-hi)} .lbadge--retreat{--lc:var(--ember-300)}
.logList .logRow summary{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;border:1px solid var(--line-2);background:rgba(255,255,255,.03)}
.logList .logRow summary::after{content:"";width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translateY(-2px);transition:transform .2s}
.logList .logRow details[open] summary::after{transform:rotate(225deg) translate(-1px,-1px)}
.logBal{margin:8px 0 4px}
.logBalBar{position:relative;height:8px;border-radius:4px;overflow:hidden;background:linear-gradient(90deg,#7a2a22,#b3453a)}
.logBalBar i{position:absolute;inset:0 auto 0 0;width:var(--a);background:linear-gradient(90deg,#3f7f3a,#8fcf7a);box-shadow:2px 0 0 rgba(255,240,200,.85)}
.logBal--def .logBalBar{background:linear-gradient(90deg,#3f7f3a,#8fcf7a)} .logBal--def .logBalBar i{background:linear-gradient(90deg,#7a2a22,#b3453a)}
.logBalTxt{display:flex;justify-content:space-between;gap:8px;margin-top:4px;font:600 var(--fs-11)/1.2 var(--font-ui);color:var(--tx-2);font-variant-numeric:tabular-nums}
.logBalTxt span{display:inline-flex;align-items:center;gap:4px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .logBalTxt .icon{width:12px;height:12px;flex:none}
.logList .logSide{border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(0,0,0,.12))}
.logList .logSide:first-child .logSideLabel{color:#ff9f8f} .logList .logSide:last-child .logSideLabel{color:#9fc4ff}
.logRow.win{--lc:#8fcf7a} .logRow.loss{--lc:var(--blood-300)} .logRow.send{--lc:var(--f-player-hi)} .logRow.scout{--lc:var(--gold-300)} .logRow.retreat{--lc:var(--ember-300)} .logRow.attack{--lc:var(--f-enemy-hi)}
.logRow details{grid-column:1 / -1;margin-top:6px}
.logRow > .logBal{grid-column:1 / -1;margin:6px 0 0}
.lchips{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.lchip{display:inline-flex;align-items:center;gap:4px;min-height:22px;padding:2px 8px;border-radius:6px;border:1px solid var(--line-1);background:rgba(255,255,255,.04);
  font:600 var(--fs-11)/1.2 var(--font-ui);color:var(--tx-2);font-variant-numeric:tabular-nums}
.lchip .icon{width:12px;height:12px;flex:none;opacity:.9}
.lchip--gut{color:#a6dc8f;border-color:rgba(143,207,122,.35);background:rgba(143,207,122,.08)}
.lchip--schlecht{color:#f0a196;border-color:rgba(214,92,76,.35);background:rgba(214,92,76,.08)}
.lchip--warn{color:#f1c27a;border-color:rgba(232,170,80,.35);background:rgba(232,170,80,.08)}
.logRow summary{list-style:none;cursor:pointer;font:600 var(--fs-10)/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--gold-300);padding:4px 0}
.logRow summary::-webkit-details-marker{display:none}
.logCompare{display:grid;grid-template-columns:1fr 20px 1fr;gap:6px;margin-top:6px}
/* Kampfbericht neuer Aufbau (Fenster je Spieler, eigene Seite) */
#combatLogList .logRow summary{cursor:pointer}
#combatLogList .logRow summary::after,#combatLogList .logRow details[open] summary::after{transform:rotate(-45deg) translate(-1px,0)!important}
#combatLogList .logRow details > :not(summary){display:none!important}
.kl-seite{position:fixed;inset:0;z-index:2147483000;overflow-y:auto;-webkit-overflow-scrolling:touch;background:var(--ink-1);padding:calc(env(safe-area-inset-top,0px) + 10px) 12px calc(env(safe-area-inset-bottom,0px) + 24px)}
.kl-seite[hidden]{display:none!important}
.kl-seite .kl-kopf{display:flex;align-items:center;gap:10px;max-width:560px;margin:0 auto 10px}
.kl-seite .kl-kopf .kl-txt{flex:1;min-width:0}
.kl-seite .kl-kopf .overline{font:600 10px/1.2 var(--font-ui);letter-spacing:.16em;text-transform:uppercase;color:var(--tx-3)}
.kl-seite .kl-kopf h3{margin:2px 0 0;font:600 18px/1.2 var(--font-display);color:var(--gold-100)}
.kl-seite .kl-zurueck{display:inline-flex;align-items:center;gap:6px;cursor:pointer;margin:0 auto 10px}
.kl-seite .kl-zurueck .icon{width:16px;height:16px}
.kl-seite .logList{max-width:560px;margin:0 auto}
.kl-seite .logRow details > summary{display:none!important}
.kl-seite .logRow details{margin-top:10px}
.kl-seite .logRow .logOrt button{display:none}
.kl-seite .logCompare{grid-template-columns:minmax(0,1fr)!important;gap:4px}
.kl-seite .logVsDivider{display:flex;align-items:center;gap:8px}
.kl-seite .logVsDivider::before,.kl-seite .logVsDivider::after{content:"";flex:1;height:1px;background:var(--line-1)}
.kl-leer{width:48px;height:48px;flex:0 0 48px;display:grid;place-items:center;border-radius:8px;border:1.5px dashed var(--line-2);color:var(--tx-3);font:600 18px var(--font-display)}
.kl-keinheld b{color:var(--tx-2)}
.kl-rss{border-top:1px solid var(--line-1);margin-top:8px;padding-top:6px}
.kl-gruppe{display:flex;flex-direction:column;gap:6px;min-width:0}
.logList .kl-gruppe.kl-a .logSide .logSideLabel{color:#ff9f8f}
.logList .kl-gruppe.kl-v .logSide .logSideLabel{color:#9fc4ff}
.kl-null span{color:var(--tx-3)}
.kl-alt span:last-child{color:#f1c27a}   /* Spähbericht älter als 30 Min. */
.logHero .ghero > span > small{display:block;min-height:2.7em}
.logBalTxt{gap:10px}
.logBalTxt span{min-width:0;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
.logBalTxt span:last-child{text-align:right;justify-content:flex-end}
.logSide{padding:6px 8px;border-radius:var(--r-xs);background:var(--well);border:1px solid var(--line-1)}
.logSideLabel{font:600 var(--fs-10)/1.2 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3);margin-bottom:4px}
.logLine,.logSum,.logCasualty{display:flex;justify-content:space-between;gap:6px;font:500 var(--fs-11)/1.6 var(--font-ui);color:var(--tx-2);font-variant-numeric:tabular-nums}
.logLine.buff span:last-child{color:var(--good)}
.logLine span:first-child,.logSum span:first-child,.logCasualty span:first-child{font-variant-numeric:normal}   /* Inter's tnum widens the hyphen in "Angriff-Buff" */
.logSum{border-top:1px solid var(--line-1);margin-top:2px;padding-top:2px;font-weight:600;color:var(--tx-1)}
.logSum.advantage span:last-child{color:var(--good)}
.logCasualty span:last-child{color:var(--blood-300)}
.logVsDivider{align-self:center;text-align:center;font:600 9px/1 var(--font-display);color:var(--gold-200)}
@media (max-width:520px){                                               /* phones: attacker above, defender below - room for every line */
  .logCompare{grid-template-columns:minmax(0,1fr);gap:4px}
  .logVsDivider{display:flex;align-items:center;gap:8px;font-size:9px} .logVsDivider::before,.logVsDivider::after{content:"";flex:1;height:1px;background:var(--line-1)}
  .logGearItems{grid-template-columns:repeat(4,48px) !important;justify-content:start}
}
.logGold,.logRetreat{margin-top:6px;font:500 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3)}
.logEmpty,.empty-state{display:flex;flex-direction:column;align-items:center;gap:6px;padding:18px 12px;text-align:center;font:500 var(--fs-12)/1.4 var(--font-ui);color:var(--tx-3)}
.empty-state .icon{width:30px;height:30px;color:var(--gold-500)}
.logEmpty .icon{width:22px;height:22px;color:var(--gold-500)}
.empty-state b{font:600 var(--fs-13)/1.2 var(--font-display);letter-spacing:.04em;color:var(--tx-2)}
.tag{display:inline-flex;align-items:center;height:16px;padding:0 5px;margin-left:6px;border-radius:var(--r-xs);font:600 9.5px/1 var(--font-ui);letter-spacing:.08em;text-transform:uppercase;vertical-align:2px}
.tag--player{color:#cfe3ff;background:rgba(63,134,216,.2);border:1px solid rgba(140,192,255,.4)}
/* Rangliste sheet: rank, crest in its frame + level, name, value; top 3 gold/silver/bronze, your row blue (pinned in the foot when outside the list) */
#rankPopup{height:var(--sheet-max)}   /* steady: switching tabs never makes the sheet jump */
 #rankTabs.tabs{grid-template-columns:repeat(5,minmax(0,1fr))} #rankBody{gap:6px;padding:10px 10px 14px}
.lb-row{--acc:transparent;display:grid;grid-template-columns:30px 40px minmax(0,1fr) auto;gap:10px;align-items:center;min-height:54px;padding:6px 10px 6px 6px;border-radius:var(--r-sm);
  border:1px solid var(--line-1);background:rgba(255,255,255,.025);box-shadow:inset 3px 0 0 var(--acc);cursor:pointer;text-align:left;color:inherit}
.lb-row:hover{background-color:rgba(255,255,255,.05)} .lb-row:active{transform:scale(.995)}
.lb-row.is-1{--acc:#f2c75c;--med:linear-gradient(180deg,#ffe28a,#c9922e);background:linear-gradient(90deg,rgba(242,199,92,.16),rgba(242,199,92,.02) 70%);border-color:rgba(242,199,92,.35)}
.lb-row.is-2{--acc:#d2d8e0;--med:linear-gradient(180deg,#f1f4f8,#9aa3ae);background:linear-gradient(90deg,rgba(210,216,224,.11),rgba(210,216,224,.02) 70%);border-color:rgba(210,216,224,.25)}
.lb-row.is-3{--acc:#c88a55;--med:linear-gradient(180deg,#f0b27d,#9a5a2c);background:linear-gradient(90deg,rgba(200,138,85,.13),rgba(200,138,85,.02) 70%);border-color:rgba(200,138,85,.3)}
.lb-row.isMe{--acc:var(--f-player);background:linear-gradient(90deg,#284670,#161b24);border-color:rgba(140,192,255,.45)}
.lb-pos{font:700 var(--fs-13)/1 var(--font-display);color:var(--tx-3);text-align:center;font-variant-numeric:tabular-nums}
.lb-row.is-1 .lb-pos,.lb-row.is-2 .lb-pos,.lb-row.is-3 .lb-pos{width:26px;height:26px;margin:0 auto;display:grid;place-items:center;border-radius:50%;background:var(--med);color:#1a1204;font-size:13px;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 1px 3px rgba(0,0,0,.5)}
.lb-row.isMe .lb-pos{color:#cfe3ff}
.lb-crest{position:relative;width:40px;height:40px;border-radius:50%;padding:2px;background:conic-gradient(from 200deg,var(--fr1,#b08d57),var(--fr2,#6b5433),var(--fr1,#b08d57),var(--fr2,#6b5433),var(--fr1,#b08d57));box-shadow:0 0 7px color-mix(in srgb,var(--fr1,#b08d57) 35%,transparent)}
.lb-crest-in{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 50% 30%,#2a2f3a,#12151c)} .lb-crest img{width:24px;height:24px;display:block}
.lb-crest .lvl{right:-7px;bottom:-5px;min-width:18px;height:17px;font-size:9.5px}
.lb-name{display:flex;flex-direction:column;gap:3px;min-width:0}
.lb-name b{display:flex;align-items:center;min-width:0;font:600 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-1);white-space:nowrap}
.lb-name b span:first-child{overflow:hidden;text-overflow:ellipsis} .lb-name .tag{flex:none}
.lb-name small{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 9.5px/1.3 var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--gold-300)}
.lb-name small i{font-style:normal;color:var(--tx-3);letter-spacing:.02em;text-transform:none;font-size:10.5px}
.lb-t{display:inline-block;padding:1px 5px;border-radius:var(--r-xs);border:1px solid rgba(242,199,92,.4);color:var(--gold-100);background:rgba(242,199,92,.1)}
.lb-t.is-bad{border-color:rgba(225,72,60,.5);color:#ffb3aa;background:rgba(225,48,48,.12)} .lb-t.is-ruler{border-color:rgba(255,208,90,.6);color:#ffe7a8;background:linear-gradient(90deg,rgba(200,40,40,.45),rgba(255,208,90,.2))}
.lb-val{display:flex;flex-direction:column;align-items:flex-end;gap:3px;text-align:right}
.lb-val b{font:700 var(--fs-15)/1 var(--font-display);color:var(--gold-100);font-variant-numeric:tabular-nums;white-space:nowrap}
.lb-val small{font:600 9px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3)}
.lb-gap{display:flex;align-items:center;gap:8px;margin-top:4px;font:600 9.5px/1 var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--tx-3)}
.lb-gap::before,.lb-gap::after{content:"";flex:1;height:1px;background:var(--line-1)}
.lb-foot{flex-direction:column;align-items:stretch;gap:6px;padding:8px 10px 10px} .lb-foot .lb-row{min-height:50px}
/* Basis- und Angriffsfenster (11b F, P3): Untertitel zweizeilig, eine Spähen-Kachel, ein Haupt-Knopf, feste Kopfzeile im Angriff */
#popupSub.psub--zwei{flex-wrap:wrap;row-gap:4px;white-space:normal}
#popupSub.psub--zwei > .psub-ort{flex:1 0 100%;min-width:0}
#popupSub.psub--zwei > .psub-who{flex:1 1 0;min-width:0;white-space:normal;overflow:visible}
#popupSub.psub--zwei > .sep:has(+ .chip--scouted){display:none}   /* „Gespäht“ steht in der zweiten Zeile: ohne Punkt davor */
.spaeh-kachel{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;min-height:56px;padding:8px 12px;text-align:left;cursor:pointer;
  border:1px dashed var(--line-3);border-radius:var(--r-sm);background:rgba(0,0,0,.22);color:var(--tx-1);font:inherit}
.spaeh-kachel > .icon{width:20px;height:20px;color:var(--gold-300)}
.spaeh-kachel b{display:block;font:600 var(--fs-13)/1.25 var(--font-ui)}
.spaeh-kachel small{display:block;margin-top:2px;font:500 var(--fs-11)/1.25 var(--font-ui);color:var(--gold-200)}
.spaeh-kachel-w{display:flex;align-items:center;gap:4px;font:600 var(--fs-15)/1 var(--font-ui);color:var(--tx-3)} .spaeh-kachel-w .icon{width:14px;height:14px} .spaeh-kachel-w .icon:not(:first-child){margin-left:8px}
.spaeh-kachel:disabled{cursor:default;border-style:solid;border-color:var(--line-1)} .spaeh-kachel:disabled small{color:var(--tx-3)}
@media (hover:hover){ .spaeh-kachel:not(:disabled):hover{border-color:var(--gold-300)} }
.spaeh-kachel:not(:disabled):active{transform:translateY(1px)}
#popupActions{display:flex;flex-wrap:wrap;gap:8px}
#popupActions > .act{flex:1 1 0;min-width:0;min-height:44px;grid-template-columns:1fr;grid-template-rows:auto auto auto;justify-items:center;row-gap:4px;padding:8px 4px;text-align:center}
#popupActions > .act > .act-ic{grid-row:auto;width:28px;height:28px}
#popupActions > .act > .act-t{max-width:100%;font-size:var(--fs-12);letter-spacing:0;text-transform:none;white-space:normal;line-height:1.2}
#popupActions > .act > .act-s{max-width:100%;justify-content:center}
#popupActions > #sendBtn{order:1} #popupActions > #recallBtn{order:2} #popupActions > #multiAttackBtn{order:3} #popupActions > #teleportBtn{order:4} #popupActions > #titleBtn{order:5}
#popupActions > .act.act--haupt{order:0;flex:1 0 100%;min-height:48px;grid-template-columns:30px minmax(0,1fr);grid-template-rows:auto auto;justify-items:start;column-gap:12px;padding:8px 16px;text-align:left;
  color:var(--tx-inv);border-color:#f1d898;background:linear-gradient(180deg,#e9cb86,#b98a3e)}
#popupActions > .act.act--haupt > .act-ic{grid-row:1 / span 2;background:rgba(0,0,0,.18);border-color:rgba(0,0,0,.25);color:#2a1a05}
#popupActions > .act.act--haupt > .act-t{font-size:var(--fs-13);color:#2a1a05;white-space:nowrap}
#popupActions > .act.act--haupt > .act-s{justify-content:flex-start;color:#4a3410}
#popupActions > .act.act--haupt > .act-s.is-bad{color:#8a1c12}
#popupActions > .act.act--haupt:disabled{background:var(--ink-3);border-color:var(--line-1)}
#popupActions > .act.act--haupt:disabled > .act-t,#popupActions > .act.act--haupt:disabled > .act-s{color:var(--tx-4)}
.ap-kopf{position:sticky;top:-14px;z-index:2;display:flex;flex-direction:column;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--line-1);background:#11151c;
  box-shadow:-14px 0 0 #11151c,14px 0 0 #11151c,0 -14px 0 #11151c,-14px -14px 0 #11151c,14px -14px 0 #11151c}   /* (Schatten statt Rand: deckt den Innenabstand, ohne waagrecht zu scrollen) */
.ap-kopf .force{padding:8px 10px} .ap-kopf .force b{font-size:var(--fs-15)} .ap-kopf .from-sel{height:40px}
#popupStats .force--foe small[data-foe="sub"]{white-space:normal}
.ap-truppen .troop-in{width:7.5em;max-width:40vw;height:32px;padding:0 4px;border:0;border-bottom:1px dashed var(--line-3);border-radius:0;background:transparent;font-size:var(--fs-15)}
.ap-truppen .troop-in:focus{border-bottom-style:solid;box-shadow:none}
.ap-truppen .field-top{align-items:center}
.hero-seg.chips-quer{flex-wrap:nowrap;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;padding-bottom:2px}
.hero-seg.chips-quer::-webkit-scrollbar{display:none}
.hero-seg.chips-quer > button{flex:none;min-width:max-content;padding:0 12px}

/* =====================================================================
   SLIDER  #attackTroopsSlider  (JS keeps --pct in sync)
   ===================================================================== */
.field-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:4px}
.field-l{font:600 var(--fs-10)/1 var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--tx-3)}
.from-field{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px;min-width:0}   /* Angriff: Startbasis wählen (Handy: groß genug zum Tippen, 16px – iOS zoomt nicht) */
.from-sel{width:100%;min-width:0;height:38px;padding:0 10px;border:1px solid var(--line-2);border-radius:var(--r-xs);background:#12151b;color:var(--tx-1);font:600 16px/1 var(--font-ui);box-sizing:border-box;text-overflow:ellipsis}
.from-sel:focus{outline:none;border-color:var(--gold-300);box-shadow:0 0 0 2px rgba(214,170,90,.25)}
.val{font:500 var(--fs-12)/1 var(--font-ui);color:var(--tx-3);font-variant-numeric:tabular-nums;white-space:nowrap}
.val b{font:600 var(--fs-17)/1 var(--font-ui);color:var(--gold-100)}
.slider{--pct:100%;-webkit-appearance:none;appearance:none;display:block;width:100%;height:28px;margin:0;background:transparent;cursor:pointer;touch-action:pan-y}
.slider:focus-visible{box-shadow:none;outline:none}
.slider:focus-visible::-webkit-slider-thumb{box-shadow:var(--focus)}
.slider::-webkit-slider-runnable-track{height:6px;border-radius:3px;border:1px solid rgba(0,0,0,.6);
  background:linear-gradient(90deg,var(--gold-600),var(--gold-300)) 0 / var(--pct) 100% no-repeat,var(--ink-4);box-shadow:inset 0 1px 2px rgba(0,0,0,.6)}
.slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;margin-top:-8px;border-radius:50%;border:1px solid #2b1f0a;
  background:radial-gradient(circle at 50% 32%,#fbecc0 0,#d7ad5f 45%,#7d5a22 100%);box-shadow:0 0 0 3px rgba(214,170,90,.16),0 2px 5px rgba(0,0,0,.6)}
.slider::-moz-range-track{height:6px;border-radius:3px;background:var(--ink-4)}
.slider::-moz-range-progress{height:6px;border-radius:3px;background:linear-gradient(90deg,var(--gold-600),var(--gold-300))}
.slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;border:1px solid #2b1f0a;background:radial-gradient(circle at 50% 32%,#fbecc0 0,#d7ad5f 45%,#7d5a22 100%)}
.slider:disabled{opacity:.4;cursor:not-allowed}
.seg{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:4px}
.seg button{height:28px;border-radius:var(--r-xs);background:var(--ink-3);border:1px solid var(--line-1);font:600 var(--fs-11)/1 var(--font-ui);color:var(--tx-2);font-variant-numeric:tabular-nums}
@media (pointer:coarse){ .seg button{min-height:36px} .slider{height:40px} }
.seg button.on{color:var(--gold-100);border-color:var(--line-3);background:rgba(214,170,90,.12)}
.seg button:disabled{color:var(--tx-4)}

/* =====================================================================
   SHOP
   ===================================================================== */
.offer{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;padding:12px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--line-2)}
.offer-art{width:64px;height:64px;display:grid;place-items:center;border-radius:var(--r-sm);border:1px solid var(--line-3);
  background:radial-gradient(90% 70% at 50% 110%,rgba(234,178,74,.35),transparent 65%),var(--tile-bg);box-shadow:0 0 14px rgba(234,178,74,.15)}
.offer-art .icon{width:34px;height:34px;color:var(--gold-200)}
.offer-text h4{margin:0 0 4px;font:600 var(--fs-13)/1.2 var(--font-display);letter-spacing:.05em;color:var(--gold-100)}
.offer-text p{margin:0;font:500 var(--fs-12)/1.4 var(--font-ui);color:var(--tx-3)}
.odds{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
.shield-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px} .shield-opts .btn{min-height:52px;flex-direction:column;justify-content:center;gap:4px;padding:6px 4px}
.odds .chip{height:20px;padding:0 6px;font-size:var(--fs-10)}
.odds .chip--rar{height:auto;min-height:20px;padding:4px 6px;line-height:1.3}   /* zweizeilig (Handy): Innenabstand oben/unten, nicht am Rand */
.hchest-opts{grid-template-columns:1fr} .hchest-opts .btn{min-height:46px;flex-direction:row;justify-content:space-between;gap:8px;padding:6px 10px;text-align:left}
.hchest-opts .btn .hc-t{display:grid;gap:2px} .hchest-opts .btn small{font:500 var(--fs-10)/1.2 var(--font-ui);color:var(--tx-3);letter-spacing:0;text-transform:none}
.hchest-res{display:grid;gap:6px;padding:10px 12px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--line-3)} .hchest-h{font:600 var(--fs-13)/1.2 var(--font-display);color:var(--gold-100)}
.hchest-row{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:10px;padding:6px 8px;border-radius:var(--r-sm);border:1px solid color-mix(in srgb,var(--rc) 55%,transparent);background:rgba(0,0,0,.2)}
.hchest-row .hchest-pic{width:44px;height:44px;border-radius:8px} .hchest-row span{display:grid;gap:2px} .hchest-row small{font-size:var(--fs-10)} .hchest-row i{font-style:normal;font-weight:700;color:var(--gold-100);font-size:var(--fs-12);text-align:right}
.hchest-res .btn{justify-self:start}
.inbox{display:grid;gap:6px;margin-bottom:6px} .inbox-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--line-2)}
.inbox-row.is-gold{border-color:color-mix(in srgb,var(--gold-300) 55%,transparent)} .inbox-row>.icon{width:22px;height:22px;color:var(--gold-200);justify-self:center}
.inbox-row b{display:block;font:600 var(--fs-12)/1.3 var(--font-ui);color:var(--gold-100)} .inbox-row small{display:block;color:var(--tx-3);font-size:var(--fs-11);line-height:1.35}
.inbox-empty{padding:10px 12px;border-radius:var(--r-sm);border:1px dashed var(--line-2);color:var(--tx-3);font-size:var(--fs-12);line-height:1.4} .inbox-all{justify-self:end}
.loot{align-items:center;gap:12px;padding:10px 12px;border-radius:var(--r-sm);border:1px solid color-mix(in srgb,var(--rc,var(--line-2)) 60%,transparent);
  background:radial-gradient(80% 120% at 0% 50%,color-mix(in srgb,var(--rc,transparent) 16%,transparent),transparent 70%),rgba(0,0,0,.2);animation:panel-in var(--dur-3) var(--ease-out)}
.loot[style*="block"]{display:flex!important}
.loot .tile{width:48px;flex:none;cursor:default}
.loot b{display:block;font:600 var(--fs-13)/1.2 var(--font-display);letter-spacing:.04em;color:var(--tx-1)}
.loot small{display:block;margin-top:2px;font:500 var(--fs-11)/1.2 var(--font-ui);color:var(--tx-3)}

/* =====================================================================
   RESPONSIVE PLACEMENT
   ===================================================================== */
@media (max-width:359px){
  :root{--hud-h:28px;--tile:52px}
  .hud{gap:4px}
  .res{gap:4px;padding:0 5px 0 4px}
  .res b{font-size:var(--fs-12);letter-spacing:-.01em}
  .res > .icon{width:16px;height:16px}
  .btn{padding:0 10px;letter-spacing:.02em}
  .selbar .btn .icon{display:none}
  .pfoot > .btn--secondary:has(> .icon + span):not(.btn--grow) > .icon{display:none}   /* secondary footer buttons keep their label, drop the icon */
  .pfoot > .btn--secondary:not(.btn--grow){flex:none;min-width:max-content}
  .ptitle--input{font-size:var(--fs-15);letter-spacing:0}
  .tile .selectDot{width:20px;height:20px}
  .tile .selectDot::after{width:12px;height:12px}
  .tile .lvl{height:13px;min-width:15px;line-height:11px;font-size:9px}
  .statChip span{font-size:9px}
  .logSide{padding:6px}
  .logLine span:first-child{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bonus-row{gap:4px}
}
/* short or narrow screens: the attack preview fits without scrolling */
@media (max-height:480px),(max-width:360px){
  .force{padding:8px}
  .force b{font-size:var(--fs-15)}
  .force small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sm-hide{display:none}   /* "Truppen entsenden" -> "Entsenden" */
}
@media (max-width:360px){
  .xs-hide{display:none}   /* "81 Truppen + 72 Vert." -> "81 + 72 Vert.", "Marsch ca. 0:25" -> "0:25" */
  .seg{margin-top:2px}
}
@media (max-height:700px) and (orientation:portrait){
  .panel--island .pbody{gap:10px;padding:12px}
  .panel--island .stat{padding:6px 8px}
  .panel--island .stat-v{font-size:14px;margin-top:4px}
}
/* tablet portrait */
@media (min-width:600px) and (max-width:899px) and (min-height:501px){
  .panel--sheet,.panel--island,.panel--item{left:50%;right:auto;width:560px;transform:translateX(-50%)}
}
/* phone landscape: rail left, panels become right side panels */
@media (max-height:500px) and (orientation:landscape){
  :root{--hud-top-space:44px}
  .nav{top:0;bottom:0;left:0;right:auto;width:calc(var(--rail-w) + var(--safe-l));height:auto;padding:calc(var(--safe-t) + 6px) 0 calc(var(--safe-b) + 6px) var(--safe-l);
    grid-template-columns:1fr;grid-auto-rows:1fr;border-top:0;border-right:1px solid var(--line-2);box-shadow:12px 0 30px rgba(0,0,0,.45)}
  .nav::before{display:none}
  .nav-btn.active::after{top:50%;left:0;width:2px;height:28px;transform:translateY(-50%);background:linear-gradient(180deg,transparent,var(--gold-300),transparent)}
  .nav-btn .badge{top:calc(50% - 24px)}
  .hud{left:calc(var(--rail-w) + var(--safe-l) + 10px);right:auto;width:auto;max-width:calc(100vw - var(--rail-w) - 40px)}
  .midbar{left:calc(var(--rail-w) + var(--safe-l) + 70px);right:auto;max-width:calc(100vw - var(--rail-w) - 90px)} body.has-panel .midbar{display:none}
  body.has-panel .hud{max-width:calc(100vw - var(--rail-w) - var(--safe-l) - min(380px,50vw) - var(--safe-r) - 36px)}
  .res{flex:0 0 auto;max-width:none;padding:0 var(--ab-2)}   /* pills size to their value: no ellipsis on "999,9 Tsd." */
  .res b{min-width:max-content}
  .mapctl{bottom:calc(var(--safe-b) + 10px)}
  .anleitung{left:calc(var(--rail-w) + var(--safe-l) + 10px);bottom:calc(var(--safe-b) + 10px)}   /* neben der Leiste, nie darüber */
  .mabar{left:calc(var(--rail-w) + var(--safe-l) + 10px);bottom:calc(var(--safe-b) + 10px);right:calc(var(--safe-r) + 60px)}
  body.is-multi .mapctl{display:flex;bottom:calc(var(--safe-b) + 10px)}
  .toast{left:calc(50% + var(--rail-w) / 2)}
  body.has-panel .toast{left:calc(var(--rail-w) + var(--safe-l) + (100vw - var(--rail-w) - var(--safe-l) - min(380px,50vw) - var(--safe-r) - 8px) / 2);
    max-width:calc(100vw - var(--rail-w) - var(--safe-l) - min(380px,50vw) - var(--safe-r) - 32px)}
  .panel--sheet,.panel--island,.panel--item{top:8px;bottom:8px;right:calc(var(--safe-r) + 8px);left:auto;width:min(380px,50vw);max-height:none;border-radius:var(--r-xs)}
  .panel--sheet{--sheet-max:calc(100dvh - 16px)}
  .panel--island{top:auto;max-height:calc(100dvh - var(--safe-t) - var(--safe-b) - 16px)}   /* hugs its content: no empty band above the footer */
  .sheet-grab{display:none}
  .panel .sheet-grab + .phead{padding-top:10px}
  body.has-panel .mapctl{display:flex;right:calc(min(380px,50vw) + var(--safe-r) + 16px)}   /* left of the side panel, never under it */
  /* profile: compact hero + one-row tabs so the body keeps ~250px */
  .panel .sheet-grab + .phead--hero{padding-top:6px;padding-bottom:6px}
  .phead--hero .overline{display:none}
  .phead--hero .avatar-ring{width:36px;height:36px}
  .phead--hero .avatar .icon{width:18px;height:18px}
  .phead--hero .avatar-ring .lvl{min-width:16px;height:16px;font-size:9px;right:-5px;bottom:-5px}
  .phead--hero .ptitle{margin:0 0 1px}
  .phead--hero .xp{margin-top:2px}
  .tabs .tab{flex-direction:row;height:30px;font-size:11px}
  .tabs .tab .icon{display:none}
  #profileFoot{padding:5px 14px 6px}
  #profileFoot .btn{height:30px}
  /* attack preview: fits without scrolling */
  .panel--island .pbody{gap:8px;padding-top:10px;padding-bottom:10px}
}
/* desktop */
@media (min-width:900px) and (min-height:501px){
  :root{--hud-h:34px;--tile:56px}
  .hud{top:14px;left:14px;right:auto;gap:0;padding:0;align-items:center;background:var(--glass);border:1px solid var(--line-2);border-radius:var(--r-sm);box-shadow:var(--sh-2);
    -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
  .midbar{top:72px;left:14px;right:auto;max-width:min(560px,calc(100vw - 460px))}
  .hud-me{flex-direction:row;width:auto;align-items:center;gap:12px;height:48px;padding:0 14px 0 8px;border-right:1px solid var(--line-1);text-align:left}
  .hud-me .avatar-ring--sm{width:34px;height:34px}
  .hud-me .avatar-ring--sm .avatar .icon{width:17px;height:17px}
  .hud-me-text{max-width:none;text-align:left}
  .hud-me-text small{display:block}
  .hud-werte{flex:none;height:auto;padding:0;background:none;border:0;border-radius:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
  .hud > .res--roh{width:auto;height:48px;padding:0 14px;border:0;border-left:1px solid var(--line-1);border-radius:0;background:none;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
  .hud-me:hover{background:rgba(255,255,255,.03)}
  .hud-me-text b{display:block;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 13px/1.1 var(--font-display);color:var(--gold-100);letter-spacing:.04em}
  .hud-me-text small{display:block;font:500 10.5px/1.2 var(--font-ui);color:var(--tx-3);margin-top:2px}
  .res{flex:0 0 auto;max-width:none;min-width:112px;height:48px;background:none;border:0;border-radius:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;padding:0 14px;gap:8px}
  .res + .res{border-left:1px solid var(--line-1)}
  .res b{font-size:var(--fs-15);min-width:6.2em}   /* room for "999,9 Tsd.": the frame never jumps when a value changes length */
  .res > .icon{width:20px;height:20px}
  /* Leiste unten Mitte (gleiche Reihenfolge wie am Handy); mit offenem Fenster rechts mittig über der freien Karte */
  .nav{left:50%;right:auto;top:auto;bottom:14px;height:auto;transform:translateX(-50%);padding:6px 10px;display:flex;gap:6px;background:var(--glass);border:1px solid var(--line-2);border-radius:var(--r-lg);box-shadow:var(--sh-2);
    -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
  body.has-sheet .nav{left:calc(50% - 209px)}
  .nav::before{display:none}
  .nav-btn{width:72px;gap:4px}
  .nav-l{font:600 12px/1 var(--font-display);letter-spacing:.04em;text-transform:none}
  .mapctl{bottom:18px;right:18px}
  body.has-panel .mapctl{display:flex}
  body.has-sheet .mapctl{right:432px}
  .mabar{left:50%;right:auto;bottom:104px;transform:translateX(-50%);width:min(560px,calc(100vw - 40px))}
  body.is-multi .mapctl{display:flex;bottom:18px}
  .toast{top:auto;bottom:104px;max-width:min(640px,calc(100vw - 40px))}   /* über der Leiste */
  body.has-sheet .toast{left:calc(50% - 209px);max-width:min(640px,calc(100vw - 458px))}   /* centred in the map area left of the drawer */
  body.is-multi .toast{bottom:170px}
  .scrim{display:none!important}
  .sheet-grab{display:none}
  .panel .sheet-grab + .phead{padding-top:10px}
  /* island popup = popover anchored next to the base (JS writes --ax/--ay/--py) */
  .panel--island{left:var(--ax,50%);top:var(--ay,90px);right:auto;bottom:auto;width:360px;max-height:min(calc(100dvh - 100px),var(--amax,100dvh));border-radius:var(--r-xs);z-index:var(--z-popover)}
  .panel--island::after{content:"";position:absolute;left:-7px;top:var(--py,60px);width:12px;height:12px;transform:rotate(45deg);background:#12161d;border-left:1px solid var(--line-3);border-bottom:1px solid var(--line-3)}
  .panel--island .pfoot .btn{padding:0 12px}
  .panel--island .from-sel{font-size:var(--fs-15)}   /* „Hauptstadt · 100 Tsd. · 0:21 · reicht“ passt in die 360px-Karte (16px nur am Handy: iOS zoomt sonst) */
  #popupSub .xs-hide{display:none}   /* 360px-Karte: „Von Hauptstadt“ ganz, die Sanduhr sagt „Marsch“ */
  body.in-stadt .city-head{padding-top:72px}   /* Bauarbeiter-Zeile unter dem HUD-Streifen (oben 14 + 48 hoch) */   /* two grow buttons side by side: "Neu spähen" fits the 360px popover */
  .panel--island.is-left::after{left:auto;right:-7px;border-left:0;border-bottom:0;border-right:1px solid var(--line-3);border-top:1px solid var(--line-3)}
  /* profile / battle log / goals / shop = right drawer under the nav */
  .panel--sheet{--sheet-max:calc(100dvh - 86px);top:72px;bottom:auto;right:14px;left:auto;width:404px;border-radius:var(--r-xs)}
  /* item detail = card left of the drawer */
  .panel--item{top:72px;right:432px;left:auto;bottom:auto;width:320px;max-height:calc(100dvh - 86px);border-radius:var(--r-xs)}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:1ms!important;animation-iteration-count:1!important;transition-duration:1ms!important}
}

/* rarity mapping - LAST, (0,2,0) so it beats every component default */
:is(.tile,.item-icon,.chip,.slot-r,.rar-text,.loot)[data-r="grau"]{--rc:var(--r-grau)}
:is(.tile,.item-icon,.chip,.slot-r,.rar-text,.loot)[data-r="gruen"]{--rc:var(--r-gruen)}
:is(.tile,.item-icon,.chip,.slot-r,.rar-text,.loot)[data-r="blau"]{--rc:var(--r-blau)}
:is(.tile,.item-icon,.chip,.slot-r,.rar-text,.loot)[data-r="lila"]{--rc:var(--r-lila)}
:is(.tile,.item-icon,.chip,.slot-r,.rar-text,.loot)[data-r="gold"]{--rc:var(--r-gold)}
:is(.tile,.item-icon,.chip,.slot-r,.rar-text,.loot)[data-r="rot"]{--rc:var(--r-rot)}

/* =====================================================================
   LEVEL-UP MODAL + MAP PICKUPS
   ===================================================================== */
.lvlup{position:fixed;inset:0;z-index:var(--z-modal);display:flex;align-items:center;justify-content:center;padding:24px;
  background:radial-gradient(ellipse at 50% 45%,rgba(40,28,8,.55),rgba(3,4,8,.82));animation:fade-in var(--dur-3) var(--ease-out)}
.lvlup[hidden]{display:none}
.lvlup-card{position:relative;width:min(340px,100%);padding:26px 22px 18px;text-align:center;color:var(--tx-1);
  background:var(--noise),var(--panel-bg);border:1px solid var(--line-3);border-radius:var(--r-lg);
  box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 60px rgba(214,170,90,.28),var(--sh-3);animation:lvlup-in 520ms cubic-bezier(.2,1.4,.3,1)}
@keyframes lvlup-in{from{opacity:0;transform:scale(.82)}}
.lvlup-card::before{content:"";position:absolute;left:50%;top:-46px;width:220px;height:220px;margin-left:-110px;pointer-events:none;
  background:conic-gradient(from 0deg,transparent 0 8%,rgba(236,208,138,.20) 10% 12%,transparent 14% 33%,rgba(236,208,138,.16) 35% 37%,transparent 39% 58%,
  rgba(236,208,138,.20) 60% 62%,transparent 64% 83%,rgba(236,208,138,.16) 85% 87%,transparent 89%);
  -webkit-mask-image:radial-gradient(circle,#000 20%,transparent 70%);mask-image:radial-gradient(circle,#000 20%,transparent 70%);animation:lvlup-spin 14s linear infinite}
@keyframes lvlup-spin{to{transform:rotate(1turn)}}
.lvlup-badge{position:relative;width:74px;height:74px;margin:-4px auto 10px;display:grid;place-items:center;border-radius:50%;
  background:radial-gradient(circle at 50% 35%,#3a2c14,#16110a 70%);border:2px solid var(--gold-300);box-shadow:var(--glow-gold),inset 0 0 18px rgba(0,0,0,.6)}
.lvlup-badge b{font:700 30px/1 var(--font-display);color:var(--gold-100);text-shadow:0 0 12px rgba(236,208,138,.55)}
.lvlup-over{font:600 var(--fs-11)/1.3 var(--font-ui);letter-spacing:.28em;text-transform:uppercase;color:var(--gold-300)}
.lvlup-title{margin:4px 0 2px;font:700 26px/1.15 var(--font-display);letter-spacing:.04em;color:var(--gold-100)}
.lvlup-sub{font:500 var(--fs-12)/1.4 var(--font-ui);color:var(--tx-3);min-height:1.4em}
.lvlup-rule{height:1px;margin:14px 0 12px;background:linear-gradient(90deg,transparent,var(--line-3),transparent)}
.lvlup-label{font:600 var(--fs-11)/1.3 var(--font-ui);letter-spacing:.2em;text-transform:uppercase;color:var(--tx-3);margin-bottom:8px}
.lvlup-rewards{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:6px}
.lvlup-rewards li{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--line-2);border-radius:var(--r-sm);
  background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(0,0,0,.18));opacity:0;animation:lvlup-row 380ms var(--ease-out) forwards}
.lvlup-rewards li .icon{width:20px;height:20px;flex:none}
.lvlup-rewards li span{flex:1;text-align:left;color:var(--tx-2);font:500 var(--fs-13)/1.2 var(--font-ui)}
.lvlup-rewards li b{font:700 var(--fs-15)/1.2 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums}
@keyframes lvlup-row{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.lvlup-next{font:500 var(--fs-11)/1.4 var(--font-ui);color:var(--tx-3);margin-bottom:14px}
.lvlup-next b{color:var(--tx-2);font-weight:600}
.lvlup .btn{width:100%}
.xp-next{margin-top:4px;font:500 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3)}
.xp-next b{color:var(--tx-2);font-weight:600}
.ico-coin{color:var(--gold-300)} .ico-gem{color:#7fd3ff} .ico-troops{color:#e8e2d2}
@media (prefers-reduced-motion:reduce){.lvlup-card,.lvlup-card::before,.lvlup-rewards li{animation:none;opacity:1}}

/* ---- daily reward + quests ---- */
.daily{display:flex;flex-direction:column;gap:10px;padding:12px;border:1px solid var(--line-2);border-radius:var(--r-sm);
  background:linear-gradient(180deg,rgba(236,208,138,.07),rgba(0,0,0,.2))}
.daily-days{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:12px}
.daily-day{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0 5px;border:1px solid var(--line-1);
  border-radius:var(--r-xs);background:rgba(0,0,0,.25);font:600 var(--fs-10,10px)/1 var(--font-ui);color:var(--tx-3);letter-spacing:.04em}
.daily-day .icon{width:16px;height:16px;color:var(--tx-3)}
.daily-day.is-done{border-color:var(--line-2);color:var(--tx-2)} .daily-day.is-done .icon{color:var(--gold-400)}
.daily-day.is-done::after{content:"";position:absolute;right:3px;top:3px;width:5px;height:5px;border-radius:50%;background:#5cbf62}
.daily-day.is-today{border-color:var(--gold-300);color:var(--gold-100);box-shadow:var(--glow-gold)} .daily-day.is-today .icon{color:var(--gold-200)}
.daily-day.is-big .icon{color:var(--r-lila)}
.daily-row{display:flex;align-items:center;gap:10px}
.daily-row .daily-txt{flex:1;min-width:0}
.daily-row .daily-txt b{display:block;font:600 var(--fs-13)/1.3 var(--font-ui);color:var(--tx-1)}
.daily-row .daily-txt small{display:block;font:500 var(--fs-11)/1.35 var(--font-ui);color:var(--tx-3)}
.daily .daily-days{margin-top:0}
.daily-week{display:grid;gap:4px} .daily-week > div{display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--line-1);border-radius:8px;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
.daily-week b{min-width:42px;color:var(--tx-3);font-weight:600} .daily-week span{flex:1} .daily-week .icon{width:14px;height:14px;color:var(--gold-400)}
.daily-week .is-today{border-color:var(--gold-300);color:var(--tx-1)} .daily-week .is-today b{color:var(--gold-100)} .daily-week .is-done{opacity:.55}
.quests{display:flex;flex-direction:column;gap:8px}
.quest{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.quest.is-done{border-color:var(--line-3);background:linear-gradient(90deg,rgba(236,208,138,.10),rgba(0,0,0,.2))}
.quest.is-claimed{opacity:.55}
.quest > .icon{width:22px;height:22px;flex:none;color:var(--gold-300)}
.quest-main{flex:1;min-width:0}
.quest-main b{display:block;font:600 var(--fs-13)/1.3 var(--font-ui);color:var(--tx-1)}
.quest-bar{display:flex;align-items:center;gap:8px;margin-top:5px}
.quest-bar i{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;position:relative}
.quest-bar i::after{content:"";position:absolute;inset:0;width:var(--p,0%);background:linear-gradient(90deg,var(--gold-500),var(--gold-200))}
.quest-bar span{font:600 var(--fs-11)/1 var(--font-ui);color:var(--tx-3);font-variant-numeric:tabular-nums}
.quest-side{display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex:none}
.quest-rew{display:inline-flex;align-items:center;gap:4px;font:700 var(--fs-12)/1 var(--font-ui);color:#9fe0ff}
.quest-rew .icon{width:13px;height:13px}
.quest-rew.is-gold{color:var(--gold-200)}
.quest-reset{font:500 var(--fs-11)/1 var(--font-ui);color:var(--tx-3)}
.daily-day span{white-space:nowrap} .daily-day i{font-style:normal}
@media (max-width:359px){.daily-day i{display:none}}
.quest-ok{font:600 var(--fs-11)/1 var(--font-ui);color:#5cbf62;letter-spacing:.06em;text-transform:uppercase}

/* =====================================================================
   LOADING SCREEN: sea, an island with a castle, sky by the real time of day, tips with pictures
   ===================================================================== */
.splash{position:fixed;inset:0;z-index:200;overflow:hidden;background:#081c2e;color:var(--tx-1);
  display:flex;flex-direction:column;justify-content:flex-start;align-items:center;
  padding:calc(var(--safe-t) + 7vh) 16px calc(var(--safe-b) + 5vh);transition:opacity .7s ease,visibility .7s}
.splash.is-leaving{opacity:0;visibility:hidden}
.splash.is-leaving .splash-bg{transform:scale(1.05)}
.splash-bg{position:absolute;inset:0;width:100%;height:100%;display:block;transition:transform 1.4s cubic-bezier(.2,.8,.2,1);animation:sp-zoom 12s ease-out both}
@keyframes sp-zoom{from{transform:scale(1.06)}to{transform:scale(1)}}
.splash-vig{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at 50% 50%,transparent 45%,rgba(0,0,0,.35) 80%,rgba(0,0,0,.6)),linear-gradient(180deg,rgba(0,0,0,.35),transparent 26%,transparent 62%,rgba(0,0,0,.55))}
.splash-top,.splash-bottom{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center}
.splash-title{position:relative;margin:0;font:700 clamp(38px,11vw,88px)/1 var(--font-display);letter-spacing:.07em;text-transform:uppercase;   /* engraved gold with a light sweep */
  background-image:linear-gradient(100deg,#8a5d22 0%,#e9c77e 22%,#fff6dc 30%,#e9c77e 38%,#b07b30 60%,#f3dca0 80%,#8a5d22 100%);background-size:250% 100%;
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 rgba(0,0,0,.6)) drop-shadow(0 0 18px rgba(0,0,0,.45));animation:sp-rise 1.1s .15s cubic-bezier(.2,.8,.2,1) both,sp-shine 4.5s 1s ease-in-out infinite}
.splash-sub{display:flex;align-items:center;gap:12px;margin-top:12px;font:600 var(--fs-13)/1 var(--font-ui);letter-spacing:.34em;text-transform:uppercase;color:#f0d6a0;
  text-shadow:0 1px 8px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.9);animation:sp-rise 1.1s .3s cubic-bezier(.2,.8,.2,1) both}
.splash-sub span{width:34px;height:1px;background:linear-gradient(90deg,transparent,#d9b56a)}
.splash-sub span:last-child{transform:scaleX(-1)}
@keyframes sp-rise{from{opacity:0;transform:translateY(14px)}}
@keyframes sp-shine{0%{background-position:100% 0}60%,100%{background-position:0 0}}
.splash-bottom{margin-top:auto}
/* tip card: a small drawn picture + the tip */
.splash-tipcard{display:flex;align-items:center;gap:12px;width:100%;min-height:76px;padding:10px 12px;text-align:left;border-radius:12px;
  background:linear-gradient(180deg,rgba(14,16,22,.82),rgba(8,9,13,.9));border:1px solid rgba(217,181,106,.4);box-shadow:0 8px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,236,190,.08)}
.splash-tippic{flex:none;width:56px;height:56px;border-radius:10px;display:grid;place-items:center;color:#e4c886;
  background:radial-gradient(circle at 50% 35%,rgba(214,170,90,.2),rgba(0,0,0,.35) 75%);border:1px solid rgba(217,181,106,.35);transition:opacity .35s,transform .35s}
.splash-tippic svg{width:46px;height:46px}
.splash-tiptxt{display:grid;gap:4px;min-width:0;transition:opacity .35s}
.splash-tiptxt b{font:700 var(--fs-10)/1 var(--font-ui);letter-spacing:.2em;text-transform:uppercase;color:#d4ad66}
.splash-tip{font:500 var(--fs-13)/1.35 var(--font-ui);color:#e6dcc4}
.splash-tipcard.is-swap .splash-tippic{opacity:0;transform:scale(.85)} .splash-tipcard.is-swap .splash-tiptxt{opacity:0}
/* ornate loading bar */
.splash-barwrap{display:flex;align-items:center;width:100%;gap:0}
.splash-cap{flex:none;width:12px;height:12px;transform:rotate(45deg);border:1.5px solid #d9b56a;background:#1a1208;box-shadow:0 0 10px rgba(236,190,110,.5)}
.splash-barwrap .splash-bar{flex:1;height:10px;border-radius:0;margin:0 -2px;padding:2px;background:linear-gradient(180deg,#0b0806,#1a130b);
  border:1.5px solid #b98f47;box-shadow:inset 0 0 6px rgba(0,0,0,.9),0 0 22px rgba(0,0,0,.7)}
.splash-barwrap .splash-bar i{inset:2px auto 2px 2px;height:auto;max-width:calc(100% - 4px);background:linear-gradient(180deg,#fff0c4,#e3b35c 45%,#9a651f)}
.splash-barwrap .splash-bar i::before{content:"";position:absolute;right:-6px;top:50%;width:14px;height:14px;margin-top:-7px;border-radius:50%;
  background:radial-gradient(circle,#fff8e0,rgba(255,200,110,.6) 40%,transparent 70%)}
.splash-meta{display:flex;justify-content:space-between;width:100%;padding:0 4px}
.splash-pct{font:700 var(--fs-12)/1 var(--font-ui);color:#f0d69a;font-variant-numeric:tabular-nums;letter-spacing:.06em;text-shadow:0 1px 4px rgba(0,0,0,.9)}
.splash-bottom{width:min(440px,100%);gap:12px;animation:sp-rise 1s .45s ease-out both}
.splash-bar{position:relative;width:100%;height:6px;border-radius:3px;background:rgba(0,0,0,.55);border:1px solid rgba(217,181,106,.45);overflow:hidden;
  box-shadow:0 0 18px rgba(0,0,0,.6)}
.splash-bar i{position:absolute;inset:0;width:0;background:linear-gradient(90deg,#8a5d22,#e7c173 70%,#fff3cf);box-shadow:0 0 12px rgba(236,190,110,.7);
  animation:sp-load 1.8s cubic-bezier(.3,.7,.3,1) forwards}
.splash-bar i::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);
  transform:translateX(-100%);animation:sp-sheen 1.3s linear infinite}
@keyframes sp-load{to{width:72%}}
@keyframes sp-sheen{to{transform:translateX(100%)}}
.splash.is-done .splash-bar i{animation:none;width:100%;transition:width .6s ease-out}
.splash-status{font:600 var(--fs-11)/1 var(--font-ui);letter-spacing:.22em;text-transform:uppercase;color:#cbb994;text-shadow:0 1px 4px rgba(0,0,0,.9)}
/* dark halo behind the title keeps it readable over a bright day sky */
.splash-top::before{content:"";position:absolute;inset:-30px -80px;z-index:-1;background:radial-gradient(ellipse at center,rgba(2,3,8,.42),transparent 70%)}
@media (min-width:700px){.splash-tip{font-size:14px}}
@media (max-height:500px){.splash{padding-top:calc(var(--safe-t) + 3vh);padding-bottom:calc(var(--safe-b) + 3vh)}.splash-title{font-size:clamp(30px,8vh,56px)}.splash-sub{margin-top:6px}.splash-tipcard{min-height:0;padding:6px 10px}.splash-tippic{width:40px;height:40px}.splash-tippic svg{width:32px;height:32px}}
@media (prefers-reduced-motion:reduce){.splash *,.splash-bg{animation:none!important;transition:none!important}.splash-bar i{width:72%}}

/* =====================================================================
   CAPITAL / CITY VIEW
   ===================================================================== */
.act--city{grid-column:1/-1;border-color:var(--line-3);background:linear-gradient(180deg,rgba(236,208,138,.12),rgba(0,0,0,.2))}
.act-ic--city{color:var(--gold-200)}
.city{position:fixed;inset:0;z-index:50;background:#0b1a2b;animation:fade-in var(--dur-3) var(--ease-out)}
.city[hidden]{display:none}
.city-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.city-head{position:absolute;left:0;right:0;top:0;display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:calc(var(--safe-t) + 10px) 12px 10px;
  background:linear-gradient(180deg,rgba(6,8,12,.92),rgba(6,8,12,.55) 70%,transparent)}
.city-title{flex:1;min-width:0}
@media (max-width:599px){.city-builder{flex-basis:100%;justify-content:center}.cb-slot{padding:6px 9px}}
.city-title h2{margin:2px 0 0;font:700 var(--fs-18,18px)/1.1 var(--font-display);color:var(--gold-100);letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.city-builder{order:3;display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.cb-slot{display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--line-2);border-radius:var(--r-pill);background:rgba(10,10,14,.75);
  font:600 var(--fs-11)/1 var(--font-ui);color:var(--tx-2);white-space:nowrap;min-width:0}
button.cb-slot{cursor:pointer;-webkit-tap-highlight-color:transparent}
.cb-slot>span{overflow:hidden;text-overflow:ellipsis}
.cb-slot .icon{width:14px;height:14px;flex:none;color:var(--gold-300)}
.cb-slot b{display:flex;align-items:center;gap:3px;color:var(--gold-100);font-variant-numeric:tabular-nums}
.cb-slot.is-busy{border-color:color-mix(in srgb,var(--gold-300) 45%,transparent)}
.cb-buy{border-style:dashed;color:var(--gold-100)}
.cb-buy.is-armed{border-style:solid;border-color:var(--gold-300);background:color-mix(in srgb,var(--gold-300) 22%,rgba(10,10,14,.8))}
.city-sheet{position:absolute;left:0;right:0;bottom:0;max-width:520px;margin:0 auto;padding:14px 14px calc(var(--safe-b) + 14px);
  background:var(--noise),var(--panel-bg);border:1px solid var(--line-2);border-bottom:0;border-radius:var(--r-lg) var(--r-lg) 0 0;box-shadow:var(--sh-3);
  display:flex;flex-direction:column;gap:10px;animation:panel-in var(--dur-3) var(--ease-out);max-height:calc(100% - 90px);overflow-y:auto;overscroll-behavior:contain}
.city-sheet[hidden]{display:none}
.city-sheet-head{display:flex;align-items:center;gap:12px}
.city-bicon{width:48px;height:48px;flex:none;display:grid;place-items:center;border-radius:var(--r-sm);border:1px solid var(--line-3);
  background:radial-gradient(circle at 50% 35%,#3a2c14,#16110a 75%);box-shadow:var(--glow-gold)}
.city-bicon .icon{width:26px;height:26px;color:var(--gold-100)}
.city-bmeta{flex:1;min-width:0}
.city-bmeta h3{margin:2px 0;font:700 var(--fs-18,18px)/1.1 var(--font-display);color:var(--gold-100)}
.city-blevel{font:600 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2);text-wrap:balance}
.city-bdesc{margin:0;font:500 var(--fs-13)/1.45 var(--font-ui);color:var(--tx-2)}
.city-bstats{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.city-bstats > div{padding:8px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.city-bstats span{display:block;font:600 var(--fs-10,10px)/1.2 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3)}
.city-bstats b{display:flex;align-items:center;gap:5px;margin-top:3px;font:700 var(--fs-15)/1.2 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums}
.city-bstats b .icon{width:14px;height:14px}
.city-bstats b.is-bad{color:#ff8d7e}
.city-bfoot{display:flex;gap:8px}
.city-progress{height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
.city-progress i{display:block;height:100%;width:var(--p,0%);background:linear-gradient(90deg,var(--gold-500),var(--gold-200))}
/* Stadt im Stil von Rise of Kingdoms (Alexander 4.10.): runde Knöpfe am Gebäude, Bild, Voraussetzungen, Forschungs-Baum */
.city-ring{position:absolute;left:0;top:0;z-index:2;width:0;height:0;pointer-events:none}
.city-ring[hidden]{display:none}
.cr-btn{position:absolute;left:0;top:0;width:58px;height:58px;margin:-29px 0 0 -29px;transform:translate(var(--x),var(--y));pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent;
  display:grid;place-items:center;border-radius:50%;border:2px solid var(--gold-300);background:radial-gradient(circle at 50% 30%,#4a3a1c,#17120a 72%);
  box-shadow:0 4px 12px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,236,190,.35);animation:cr-pop .28s var(--ease-out) both;animation-delay:var(--d,0ms)}
.cr-btn .icon{width:26px;height:26px;color:var(--gold-100)}
.cr-btn small{position:absolute;top:calc(100% + 3px);left:50%;transform:translateX(-50%);padding:2px 7px;border-radius:var(--r-pill);background:rgba(10,8,6,.86);border:1px solid var(--line-2);
  font:700 10px/1.2 var(--font-ui);color:var(--gold-100);white-space:nowrap}
.cr-btn:active{transform:translate(var(--x),var(--y)) scale(.92)}
@keyframes cr-pop{from{opacity:0;transform:translate(0,0) scale(.4)}to{opacity:1;transform:translate(var(--x),var(--y)) scale(1)}}
.city-bicon:has(canvas){width:88px;height:88px;border-radius:var(--r-md,12px);background:radial-gradient(circle at 50% 60%,#3b4a2c,#141a10 78%);overflow:hidden}
.city-bicon canvas{width:100%;height:100%;display:block}
.city-tabs{grid-template-columns:1fr 1fr;margin:0}
.city-tabs button{height:34px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:var(--fs-12)}
.city-tabs button .icon{width:15px;height:15px}
.city-sheet.cs-nutz #cityBDesc,.city-sheet.cs-nutz #cityBNote,.city-sheet.cs-nutz #cityBStats,.city-sheet.cs-nutz .city-bfoot,.city-sheet.cs-bau #cityBExtra{display:none}
.city-bstats:has(.anf-list){display:block}
.city-bstats .anf-list{padding:0;border:0;background:none}
.city-bstats > .anf-h{padding:0;border:0;background:none;display:block}
.city-bstats .anf > span{display:block;margin:0;letter-spacing:0;text-transform:none;font:600 var(--fs-13)/1.25 var(--font-ui);color:var(--tx-1)}
.city-bstats .anf > b{display:block;margin:0;font:700 var(--fs-13)/1.2 var(--font-ui)}
.anf-h{margin:2px 0 6px;font:700 var(--fs-10,10px)/1.2 var(--font-ui);letter-spacing:.16em;text-transform:uppercase;color:var(--tx-3)}
.anf-list{display:flex;flex-direction:column;gap:4px}
.anf{display:grid;grid-template-columns:22px 1fr auto 22px;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.anf > .icon{width:18px;height:18px;color:var(--gold-200)}
.anf > span{min-width:0;font:600 var(--fs-13)/1.25 var(--font-ui);color:var(--tx-1)}
.anf > b{font:700 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums;white-space:nowrap}
.anf > i{display:grid;place-items:center;width:20px;height:20px;border-radius:50%}
.anf > i .icon{width:12px;height:12px}
.anf.is-ok > i{background:#3f8f3a;color:#eaffe4} .anf.is-bad > i{background:#b2392b;color:#ffe6e1}
.anf.is-bad > b{color:#ff8d7e} .anf.is-bad{border-color:rgba(255,120,100,.35)}
.anf .icon.icon--coin,.anf > .icon[data-i="coin"]{color:#e8b64a}
.city-uptime{display:inline-flex;align-items:center;margin-left:8px;padding:2px 7px;border-radius:var(--r-pill);background:rgba(0,0,0,.28);font:700 11px/1.2 var(--font-ui);letter-spacing:0;text-transform:none;font-variant-numeric:tabular-nums}
.city-uptime:empty{display:none}
.fo-baum{display:flex;gap:22px;overflow-x:auto;padding:4px 2px 10px;overscroll-behavior-x:contain;scrollbar-width:thin}
.fo-spalte{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;flex:none}
.fo-spalte + .fo-spalte::before{content:"";position:absolute;left:-22px;top:calc(50% + 9px);width:22px;height:2px;background:linear-gradient(90deg,var(--gold-500),var(--gold-300));opacity:.7}
.fo-spalte.is-zu + .fo-spalte::before,.fo-spalte.is-zu::before{opacity:.25}
.fo-aka{font:700 10px/1.2 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3);white-space:nowrap}
.fo-node{width:98px;padding:8px 6px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;border:1px solid var(--line-2);border-radius:var(--r-sm);
  background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(0,0,0,.25));color:var(--tx-1);cursor:pointer;-webkit-tap-highlight-color:transparent}
.fo-node b{font:700 11px/1.15 var(--font-ui);text-align:center;min-height:2.3em;display:flex;align-items:center}
.fo-node small{font:700 10px/1 var(--font-ui);color:var(--gold-200);font-variant-numeric:tabular-nums}
.fo-node-ic{display:grid;place-items:center;width:40px;height:40px;flex:none;border-radius:50%;border:1px solid var(--line-3);background:radial-gradient(circle at 50% 35%,#3a2c14,#16110a 75%)}
.fo-node-ic .icon{width:22px;height:22px;color:var(--gold-100)}
.fo-bar{display:block;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,.1);overflow:hidden}
.fo-bar i{display:block;height:100%;width:var(--p,0%);background:linear-gradient(90deg,var(--gold-500),var(--gold-200))}
.fo-node.is-lock{opacity:.5} .fo-node.is-lock .fo-node-ic .icon{color:var(--tx-3)}
.fo-node.is-max{border-color:var(--gold-300)} .fo-node.is-max .fo-bar i{background:linear-gradient(90deg,#3f8f3a,#8fd38a)}
.fo-node.is-run{border-color:var(--gold-200);animation:fo-puls 1.6s ease-in-out infinite}
.fo-node.is-sel{border-color:var(--gold-100);box-shadow:0 0 0 2px rgba(240,223,176,.35),var(--glow-gold)}
@keyframes fo-puls{50%{box-shadow:0 0 12px rgba(236,208,138,.55)}}
.fo-go{margin-top:8px}
.bd-hilfe-btn{margin-top:8px} .bd-hilfe-st{display:flex;align-items:center;gap:6px;margin-top:6px;font:600 var(--fs-11)/1.3 var(--font-ui);color:var(--gold-100)} .bd-hilfe-st .icon,.bd-hilfe-btn .icon{width:14px;height:14px}
.fo-detail{display:flex;flex-direction:column;gap:8px;margin-top:4px;padding:10px;border:1px solid var(--line-2);border-radius:var(--r-md,12px);background:rgba(0,0,0,.25)}
.fo-dh{display:flex;align-items:center;gap:10px} .fo-dh b{display:block;font:700 var(--fs-15)/1.2 var(--font-display);color:var(--gold-100)} .fo-dh small{font:600 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3)}
.fo-wirk{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.fo-wirk > div{padding:7px 9px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.2);min-width:0}
.fo-wirk span{display:block;font:700 10px/1.2 var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--tx-3)}
.fo-wirk b{display:block;margin-top:3px;font:600 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-1)}
.fo-wirk > div + div b{color:#9fd28a}


.gate-ctl .btn{flex:none}
.gate-ctl{display:flex;flex-direction:column;gap:8px;margin-top:10px;padding:10px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.gate-row{display:flex;flex-direction:column;gap:6px}
.gate-ctl .seg{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-top:0}
.gate-ctl .seg button{height:32px;border:1px solid var(--line-2);border-radius:var(--r-xs);background:rgba(255,255,255,.04);color:var(--tx-2);font:700 var(--fs-12)/1 var(--font-ui)}
.gate-ctl .seg button.is-on{border-color:var(--gold-300);background:linear-gradient(180deg,rgba(236,208,138,.28),rgba(236,208,138,.08));color:var(--gold-100)}
.gate-note{margin:0;font:500 var(--fs-12)/1.4 var(--font-ui);color:var(--tx-3)}
.title-card{max-width:440px;width:100%}
.title-list{display:flex;flex-direction:column;gap:6px;max-height:52vh;overflow:auto;text-align:left}
.title-row{display:grid;grid-template-columns:1fr auto;gap:6px 10px;align-items:center;padding:8px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.title-row b{font:700 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-1)}
.title-row small{display:block;font:600 var(--fs-11)/1.3 var(--font-ui)}
.title-row.is-good small{color:#8fd38a} .title-row.is-bad small{color:#ff9d90}
.title-row .holder.is-me{color:var(--f-player-hi)}
.notice [data-view-titles]{flex:none;margin-left:auto}
.title-row select{max-width:150px;height:32px;border:1px solid var(--line-2);border-radius:var(--r-xs);background:#15171c;color:var(--tx-1);font:600 var(--fs-12)/1 var(--font-ui);padding:0 6px}
.title-row .holder{font:600 var(--fs-12)/1.2 var(--font-ui);color:var(--gold-100)}

.forge-list{display:flex;flex-direction:column;gap:6px}
.forge-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.forge-row > .icon{width:20px;height:20px;color:var(--gold-200);flex:none}
.forge-row > span{flex:1;min-width:0}
.forge-row b{display:block;font:700 var(--fs-13)/1.2 var(--font-ui)}
.forge-row small{display:block;font:600 var(--fs-13)/1.3 var(--font-ui);color:var(--gold-200);letter-spacing:.08em}
.forge-row em{font:600 var(--fs-11)/1 var(--font-ui);font-style:normal;color:var(--tx-3)}
.forge-row.is-empty{color:var(--tx-3);font:500 var(--fs-12)/1.3 var(--font-ui)}
.tile .stars{position:absolute;left:4px;right:24px;bottom:3px;display:flex;justify-content:flex-start;gap:0;color:#ffd76a;overflow:hidden}
.tile .stars .icon{width:9px;height:9px;filter:drop-shadow(0 0 1px #000)}
.starbar{display:flex!important;flex-wrap:wrap;gap:1px;margin-top:3px}
.starbar .icon{width:13px;height:13px;color:#ffd76a}
.starbar i{display:contents}
.starbar i .icon{color:rgba(255,255,255,.18)}
/* ===== AUFBAU (aufbau.js, Paket D): Rohstoffe im HUD, Kosten, Forschung, Markt, Truppen-Stufe ===== */
.res--roh{flex:0 0 auto;max-width:none;cursor:pointer;color:var(--tx-1);padding:0 8px}
.res--roh > .icon{color:#d9b27a}
.res--roh.on{border-color:var(--line-3);background:rgba(214,170,90,.16)}
.roh-mini{display:none;align-items:center;gap:10px}
.roh-v{display:flex;align-items:center;gap:4px} .roh-v .icon{width:15px;height:15px}
.roh-h .icon,.icon.roh-h{color:#c08a4c} .roh-s .icon,.icon.roh-s{color:#aab3bd} .roh-e .icon,.icon.roh-e{color:#8fb6e0}
.roh-drop{position:fixed;z-index:calc(var(--z-hud) + 1);top:calc(var(--safe-t) + 14px + var(--hud-h));right:calc(var(--safe-r) + 10px);width:min(300px,calc(100vw - 20px));padding:10px 12px;border-radius:var(--r-sm);
  background:var(--glass);border:1px solid var(--line-2);box-shadow:var(--sh-2);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.roh-drop[hidden]{display:none}
.roh-row{display:grid;grid-template-columns:22px 1fr auto;grid-template-rows:auto auto;column-gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line-1)}
.roh-row .icon{width:20px;height:20px;grid-row:1 / 3} .roh-row span{font:600 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-2)}
.roh-row b{font:700 var(--fs-15)/1.2 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums;text-align:right}
.roh-row small{grid-column:2 / 4;font:600 var(--fs-11)/1.2 var(--font-ui);color:#9fd28a;text-align:right}
.roh-hint{display:block;margin-top:8px;font:500 var(--fs-11)/1.35 var(--font-ui);color:var(--tx-3)}
.city-bstats b .kost{display:inline-flex;align-items:center;gap:3px;margin:0 10px 0 0;white-space:nowrap;letter-spacing:0;text-transform:none;font:700 var(--fs-15)/1.2 var(--font-ui);color:var(--tx-1)}
.city-bstats b{flex-wrap:wrap}
.kost.is-bad,.city-bstats b .kost.is-bad{color:#ff8d7e}.kost--h .icon{color:#c08a4c} .kost--s .icon{color:#aab3bd} .kost--e .icon{color:#8fb6e0}
.auf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.auf-grid > div{padding:7px 8px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.auf-grid span{display:block;font:600 10px/1.2 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3)}
.auf-grid b{display:block;margin-top:3px;font:700 var(--fs-12)/1.25 var(--font-ui);color:var(--tx-1)}
.auf-frei{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.auf-frei li{display:flex;align-items:center;gap:6px;font:600 var(--fs-13)/1.3 var(--font-ui);color:var(--tx-1)} .auf-frei .icon{width:14px;height:14px;color:#9fd28a;flex:none}
.fo-tabs{grid-template-columns:repeat(3,1fr);margin:10px 0 8px}
.fo-list{display:flex;flex-direction:column;gap:6px}
.fo-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:8px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.fo-row > .icon{width:20px;height:20px;color:var(--gold-200);flex:none}
.fo-row .fo-t{flex:1;min-width:0}
.fo-row b{display:block;font:700 var(--fs-13)/1.25 var(--font-ui);color:var(--tx-1)} .fo-row b em{font-style:normal;color:var(--gold-200);font-weight:600}
.fo-row small{display:block;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
.fo-row > em{font:600 var(--fs-11)/1 var(--font-ui);font-style:normal;color:var(--tx-3)}
.fo-row.is-max{opacity:.75} .fo-row.is-run{border-color:var(--line-3);background:rgba(214,170,90,.1)}
.fo-row .btn .icon{width:13px;height:13px}
.fo-lauf{margin-top:8px;align-items:center;gap:10px}
@media (min-width:900px) and (min-height:501px){ .res--roh{min-width:0;padding:0 14px} .roh-drop{top:72px;left:14px;right:auto} }
@media (min-width:1560px) and (min-height:501px){ .roh-mini{display:flex} }   /* nur bei viel Platz die drei Zahlen im HUD (sonst stößt es an die Leiste rechts) */
/* ===== HÄNDLER (haendler.js) ===== */
.mb-chip.is-hd{border-color:rgba(242,199,92,.6);background:linear-gradient(90deg,rgba(120,80,20,.8),rgba(20,14,6,.88))} .mb-chip.is-hd .icon{color:#f2c75c} .mb-chip.is-hd i{color:#f6e2b0}
.hd-live{display:grid;gap:8px} .hd-info{display:flex;align-items:center;gap:6px;margin:0;color:var(--tx-3);font-size:var(--fs-12);line-height:1.4} .hd-info .icon{width:14px;height:14px;flex:none;color:var(--gold-300)}
.hd-ok{display:flex;align-items:center;gap:4px;color:#8fd18f;font:600 var(--fs-12)/1 var(--font-ui)} .hd-ok .icon{width:13px;height:13px}
.hd-log{margin:0;padding-left:18px;color:var(--tx-2);font-size:var(--fs-12);line-height:1.5} .hd-live > .btn{justify-self:start}
.hd-live .inbox-row .btn .icon{width:13px;height:13px;margin-right:3px;vertical-align:-2px;color:#8a5a12}

/* ===== BÜNDNIS (buendnis.js) ===== */
#bundPopup{height:var(--sheet-max)} #bundTabs.tabs{grid-template-columns:repeat(4,minmax(0,1fr))}
.mapctl button{position:relative}
.emblem.bd-em{background:var(--bf);color:#fff;border-color:rgba(255,255,255,.35)}
#bundOben:empty{display:none} .bd-live{display:flex;flex-direction:column;gap:12px}
.bd-wappen{width:30px;height:30px;flex:none;display:grid;place-items:center;border-radius:8px;background:var(--bf);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25),0 2px 4px rgba(0,0,0,.4)}
.bd-wappen .icon{width:17px;height:17px} .bd-wappen--gross{width:46px;height:46px;border-radius:12px} .bd-wappen--gross .icon{width:26px;height:26px}
.bd-kopf{display:flex;align-items:center;gap:12px} .bd-kopf b{display:block;font:600 var(--fs-15)/1.2 var(--font-display);color:var(--gold-100)}
.bd-kopf small{display:block;margin-top:3px;font:500 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3)}
.bd-liste{display:grid;gap:6px}
.bd-zeile{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-height:48px;padding:6px 8px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.bd-zeile.is-me{border-color:rgba(140,192,255,.45);background:linear-gradient(90deg,#284670,#161b24)}
.bd-name{flex:1;min-width:120px;display:flex;flex-direction:column;gap:2px;font:600 var(--fs-13)/1.2 var(--font-ui);color:var(--tx-1)}
.bd-name .who-link{align-self:flex-start;text-align:left;font:inherit} .bd-name small{font:500 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3)} .bd-name em{font-style:normal;color:var(--gold-200)}
.bd-dot{width:8px;height:8px;border-radius:50%;background:#555;flex:none} .bd-dot.on{background:#4cd07d;box-shadow:0 0 6px #4cd07d}
.bd-sic{width:30px;height:30px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--sf,#555);color:#fff} .bd-sic .icon{width:16px;height:16px}
.bd-chat{display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow-y:auto;padding:4px 2px;margin-bottom:10px}
.bd-cz{align-self:flex-start;max-width:88%;padding:7px 10px;border:1px solid var(--line-1);border-radius:12px 12px 12px 4px;background:rgba(255,255,255,.04);line-height:1.35;overflow-wrap:anywhere}
.bd-cz b{font-weight:700}.bd-cz small{display:block;opacity:.6;font-size:11px;margin-top:2px}.bd-cz .btn{margin-left:4px;vertical-align:middle}
.bd-cz.is-me{align-self:flex-end;border-radius:12px 12px 4px 12px;background:linear-gradient(90deg,#284670,#1c2b44);border-color:rgba(140,192,255,.45)}
.bd-cz.is-sys{align-self:center;max-width:96%;background:none;border-style:dashed;font-size:13px;opacity:.85;text-align:center}
.bd-cz.is-hilfe{border-color:rgba(231,76,60,.65)}
.bd-ck{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0}.bd-ck>span{width:100%;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.7}
.bd-rally .bd-sic{background:var(--gold-300);color:#1a1204} .bd-rally.is-feind{border-color:rgba(231,76,60,.45)} .bd-rally.is-feind .bd-sic{background:#e74c3c;color:#fff}
.bd-rally-mit{flex-basis:100%;display:flex;flex-direction:column;gap:2px;padding:4px 0 0 44px}.bd-rally-mit small{font:500 var(--fs-12)/1.35 var(--font-ui);color:var(--tx-2);font-variant-numeric:tabular-nums}
.bd-knoepfe{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.bd-log{display:grid;gap:2px} .bd-log div{display:flex;justify-content:space-between;gap:10px;padding:5px 2px;border-bottom:1px solid var(--line-1);font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
.bd-log div:last-child{border-bottom:0} .bd-log small{flex:none;color:var(--tx-3)}
.bd-form{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;padding:10px;margin-bottom:12px;border:1px solid var(--line-2);border-radius:var(--r-lg);background:rgba(0,0,0,.22)}
.bd-form input:not([type=checkbox]),.bd-form select{width:100%;height:40px;padding:0 10px;border:1px solid var(--line-2);border-radius:var(--r-xs);background:#12151b;color:var(--tx-1);font:600 16px/1 var(--font-ui);box-sizing:border-box}
.bd-form input:focus,.bd-form select:focus{outline:none;border-color:var(--gold-300)} .bd-tag{text-transform:uppercase;letter-spacing:.15em}
.bd-farben,.bd-zeichen{display:flex;flex-wrap:wrap;gap:6px}
.bd-farben button{width:30px;height:30px;border-radius:50%;background:var(--bf);border:2px solid transparent} .bd-farben button.on{border-color:#fff;box-shadow:0 0 0 2px var(--gold-300)}
.bd-zeichen button{width:38px;height:38px;display:grid;place-items:center;border-radius:8px;border:1px solid var(--line-2);color:var(--tx-2)} .bd-zeichen button.on{border-color:var(--gold-300);color:var(--gold-100);background:rgba(214,170,90,.16)}
.bd-zeichen .icon{width:20px;height:20px}
.bd-fehler{margin:0;min-height:16px;color:#ff9d8f;font:500 var(--fs-12)/1.3 var(--font-ui)} .bd-fehler:empty{display:none}
.bd-feld{display:grid;gap:5px;min-width:0} .bd-wahl .sect h4{white-space:normal;line-height:1.3;min-width:0} .bd-feld > span{font:600 var(--fs-10)/1.3 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3)}   /* Handy: langer Titel bricht um, nichts ragt aus der Box */
.bd-info{margin:0;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
#popupBund:empty{display:none} #popupBund{display:flex;flex-direction:column;gap:8px}
.bd-insel{display:flex;flex-wrap:wrap;align-items:center;gap:6px} .bd-insel .btn .icon{width:14px;height:14px}
.bd-insel-l{display:inline-flex;align-items:center;gap:5px;margin-right:2px;font:600 var(--fs-10)/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--gold-200)} .bd-insel-l .icon{width:13px;height:13px}
/* ===== 11b F (P4): Stadt, Burg, Labor, Helden, Shop übersichtlich ===== */
/* Gebäude-Fenster: Haupt-Knopf fest unten (nie unter dem Falz); Burg: Voraussetzungen und Wirkung zuerst, Schild-Kasten unten */
.city-sheet > .city-bfoot{order:5;position:sticky;bottom:0;z-index:3;margin:0 -14px;padding:10px 14px;background:var(--noise),var(--panel-bg);border-top:1px solid var(--line-1)}
.city-sheet.cs-keep > #cityBNote.city-wirkung{order:4}
.city-bfoot .btn{min-height:48px}
.city-sheet .fo-go{position:sticky;bottom:0;z-index:3;width:100%;min-height:48px;box-shadow:0 0 0 10px #15161b}   /* Forschen: bleibt sichtbar, solange die Forschung offen ist */
.anf.is-bad > i{visibility:hidden}   /* fehlt etwas: die rote Zahl reicht, der Knopf sagt „Fehlt: …“ */
#citySheet .btn-x,.hh .btn-x{width:44px;height:44px}
.city-tabs button,.city-sheet .seg button,.gate-ctl .seg button{min-height:44px}
button.cb-slot{position:relative} button.cb-slot::before{content:"";position:absolute;left:0;right:0;top:50%;height:var(--k-tipp);transform:translateY(-50%)}   /* Tippfläche 44 px, der Streifen bleibt schmal */
/* Heldenhalle: Reiter Helden | Paare, gesperrte Helden kleiner darunter */
.hh-seiten{grid-template-columns:1fr 1fr;margin-top:12px}
.hh-seiten button{min-height:44px;font-size:var(--fs-13)}
.hh-zu-h{margin:12px 0 4px;font:700 var(--fs-11)/1.2 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3)}
.hh-cards--zu{grid-template-columns:repeat(auto-fill,minmax(82px,1fr));gap:8px}
.hh-cards--zu .hh-card{aspect-ratio:3/4;border-width:1px}
.hh-cards--zu .hh-foot{padding:4px 2px 5px} .hh-cards--zu .hh-foot b{font-size:var(--fs-12,12px)} .hh-cards--zu .hh-foot > small:first-of-type{display:none}
.hh-cards--zu .hh-lk{font-size:8px;padding:2px 4px;right:3px;top:3px}
.hh-plus{width:44px;height:44px}
/* Shop: Kaufknöpfe zuerst, Chancen hinter „i“; Preis groß im Knopf */
.odds-mehr{margin-top:8px} .odds-mehr > summary{display:inline-flex;align-items:center;gap:6px;min-height:44px;cursor:pointer;list-style:none;font:600 var(--fs-13)/1 var(--font-ui);color:var(--tx-2)}
.odds-mehr > summary::-webkit-details-marker{display:none} .odds-mehr > summary .icon{width:16px;height:16px;color:var(--gold-300)} .odds-mehr[open] > summary{color:var(--gold-100)}
.odds-mehr .odds{margin-top:0}
.hchest-opts .btn{min-height:48px} .hchest-opts .cost b{font-size:var(--fs-15,15px)}
    </style>
</head>
<body>
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
<symbol id="i-coin" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0z" fill="currentColor" stroke="none"/><path d="M5.7 12a6.3 6.3 0 1 0 12.6 0a6.3 6.3 0 1 0 -12.6 0z" stroke="#000" stroke-width="1.2" opacity="0.32"/><path d="M12 8.3l1.15 2.55L15.7 12l-2.55 1.15L12 15.7l-1.15-2.55L8.3 12l2.55-1.15z" fill="#000" stroke="none" opacity="0.3"/><path d="M6.1 8.8A7 7 0 0 1 9.5 5.4" stroke="#fff" stroke-width="1.3" opacity="0.6"/></g></symbol>
<symbol id="i-gem" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7.2 4h9.6l4.7 5.4L12 20.6 2.5 9.4z" fill="currentColor" stroke="none"/><path d="M2.5 9.4h19M7.2 4l2.5 5.4L12 20.6l2.3-11.2L16.8 4" stroke="#000" stroke-width="1" opacity="0.32"/><path d="M9.7 9.4 12 4.3l2.3 5.1" stroke="#000" stroke-width="1" opacity="0.22"/><path d="M4.9 9 7.5 5.4" stroke="#fff" stroke-width="1.2" opacity="0.75"/></g></symbol>
<symbol id="i-troops" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l3 .45 9.1 9.1-2.55 2.55L4.45 7z" fill="currentColor" stroke="none" opacity="0.18"/><path d="M4 4l3 .45 9.1 9.1-2.55 2.55L4.45 7z"/><path d="M12.4 17.6l5.2-5.2M16.3 16.3l3.7 3.7"/><path d="M20 4l-3 .45-9.1 9.1 2.55 2.55L19.55 7z" fill="currentColor" stroke="none" opacity="0.18"/><path d="M20 4l-3 .45-9.1 9.1 2.55 2.55L19.55 7z"/><path d="M11.6 17.6l-5.2-5.2M7.7 16.3 4 20"/></g></symbol>
<symbol id="i-attack" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.8 4.2l-.8 3-8.4 8.4-2.2-2.2L16.8 5z" fill="currentColor" stroke="none" opacity="0.18"/><path d="M19.8 4.2l-.8 3-8.4 8.4-2.2-2.2L16.8 5z"/><path d="M6.6 12.4l5 5"/><path d="M8.4 15.6 5 19"/><path d="M3.3 19.6a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0z" fill="currentColor" stroke="none"/><path d="M12.5 21.2c4.6-.6 8.1-4.1 8.7-8.7" opacity="0.7"/><path d="M16.6 21.6c2.4-1 4.1-2.7 5-5" opacity="0.4"/></g></symbol>
<symbol id="i-profile" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11.2a7 7 0 0 1 14 0v6l-2.7 2.8H7.7L5 17.2z" fill="currentColor" stroke="none" opacity="0.14"/><path d="M5 11.2a7 7 0 0 1 14 0v6l-2.7 2.8H7.7L5 17.2z"/><path d="M7.6 12.4h8.8"/><path d="M12 12.4v7.4"/><path d="M12 4.3v5" opacity="0.55"/><path d="M8.6 15.6h.01M15.4 15.6h.01" stroke-width="2"/></g></symbol>
<symbol id="i-bot" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 12.2a5.8 5.8 0 0 1 11.6 0v5.2l-2.3 2.6h-7l-2.3-2.6z" fill="currentColor" stroke="none" opacity="0.14"/><path d="M6.2 12.2a5.8 5.8 0 0 1 11.6 0v5.2l-2.3 2.6h-7l-2.3-2.6z"/><path d="M6.6 9.6C4.3 9.2 3 7.2 3.3 4.4c1 1.8 2.5 2.7 4.6 2.9"/><path d="M17.4 9.6c2.3-.4 3.6-2.4 3.3-5.2-1 1.8-2.5 2.7-4.6 2.9"/><path d="M8.7 13.4h6.6M12 13.4v6.3"/></g></symbol>
<symbol id="i-battlelog" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5.2h10v13.6H7z" fill="currentColor" stroke="none" opacity="0.12"/><path d="M7 5.2v13.6M17 5.2v13.6"/><path d="M4.3 5.2h15.4M4.3 18.8h15.4" stroke-width="2"/><path d="M9.6 9.2h4.8M9.6 12h4.8M9.6 14.8h3" opacity="0.7"/></g></symbol>
<symbol id="i-shop" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11h17v8.5h-17z" fill="currentColor" stroke="none" opacity="0.14"/><path d="M4 11V9a4.5 4.5 0 0 1 4.5-4.5h7A4.5 4.5 0 0 1 20 9v2"/><path d="M3.5 11h17v8.5h-17z"/><path d="M8 4.8v14.7M16 4.8v14.7" opacity="0.5"/><path d="M10.4 9.6h3.2v4h-3.2z" fill="currentColor" stroke="none"/></g></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2l7.3 2.5v5.6c0 4.6-3 8-7.3 9.6-4.3-1.6-7.3-5-7.3-9.6V5.7z" fill="currentColor" stroke="none" opacity="0.14"/><path d="M12 3.2l7.3 2.5v5.6c0 4.6-3 8-7.3 9.6-4.3-1.6-7.3-5-7.3-9.6V5.7z"/><path d="M12 6.4v11.8M8 10.2h8" opacity="0.6"/></g></symbol>
<symbol id="i-boots" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.2 3.5h5.3v8.6l4.6 2a2.8 2.8 0 0 1 1.7 2.6v2.8H6.6z" fill="currentColor" stroke="none" opacity="0.14"/><path d="M8.2 3.5h5.3v8.6l4.6 2a2.8 2.8 0 0 1 1.7 2.6v2.8H6.6z"/><path d="M6.9 16.9h12.9" opacity="0.6"/><path d="M8 6.6h5.5" opacity="0.6"/></g></symbol>
<symbol id="i-weapon" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.8 4.2l-.8 3-8.4 8.4-2.2-2.2L16.8 5z" fill="currentColor" stroke="none" opacity="0.18"/><path d="M19.8 4.2l-.8 3-8.4 8.4-2.2-2.2L16.8 5z"/><path d="M6.6 12.4l5 5"/><path d="M8.4 15.6 5 19"/><path d="M3.3 19.6a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0z" fill="currentColor" stroke="none"/><path d="M17.6 6.4l-7 7" stroke-width="1" opacity="0.45"/></g></symbol>
<symbol id="i-armor" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 3.8 4 6v5.2l2.2 1.4V20h11.6v-7.4L20 11.2V6l-4.5-2.2c-.7 1.7-2 2.6-3.5 2.6s-2.8-.9-3.5-2.6z" fill="currentColor" stroke="none" opacity="0.14"/><path d="M8.5 3.8 4 6v5.2l2.2 1.4V20h11.6v-7.4L20 11.2V6l-4.5-2.2c-.7 1.7-2 2.6-3.5 2.6s-2.8-.9-3.5-2.6z"/><path d="M12 6.4V20" opacity="0.5"/><path d="M8.2 12.3c1.3.9 2.5 1.3 3.8 1.3s2.5-.4 3.8-1.3" opacity="0.6"/></g></symbol>
<symbol id="i-temple" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.2 12 4l9 5.2z" fill="currentColor" stroke="none" opacity="0.2"/><path d="M3 9.2 12 4l9 5.2z"/><path d="M6 11.4v6.8M10 11.4v6.8M14 11.4v6.8M18 11.4v6.8"/><path d="M3.5 18.7h17M2.5 21h19"/></g></symbol>
<symbol id="i-level" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 17 3 8l5 3.8L12 5.5l4 6.3L21 8l-1.2 9z" fill="currentColor" stroke="none" opacity="0.16"/><path d="M4.2 17 3 8l5 3.8L12 5.5l4 6.3L21 8l-1.2 9z"/><path d="M4.5 20h15"/><path d="M10.9 13.3a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0z" fill="currentColor" stroke="none"/></g></symbol>
<symbol id="i-defense" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 20V10h13v10" fill="currentColor" stroke="none" opacity="0.14"/><path d="M5.5 20V10h13v10"/><path d="M4.5 10V5.5h2.8v2h2.4v-2h4.6v2h2.4v-2h2.8V10z"/><path d="M10.5 20v-3.5a1.5 1.5 0 0 1 3 0V20"/><path d="M3.5 20h17"/></g></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke-width="1.7"/></g></symbol>
<symbol id="i-upgrade" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 12.5 12 7l5.5 5.5"/><path d="M6.5 18 12 12.5l5.5 5.5" opacity="0.55"/></g></symbol>
<symbol id="i-scout" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0z"/><path d="M10.8 12a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0z" fill="currentColor" stroke="none"/></g></symbol>
<symbol id="i-send" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h14.5"/><path d="M15 8.4l4.6 3.6-4.6 3.6z" fill="currentColor"/><path d="M3 8.8l2.6 3.2L3 15.2M6.2 8.8l2.6 3.2-2.6 3.2" opacity="0.65"/></g></symbol>
<symbol id="i-multiattack" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 11.5 5M7.5 5h4v4"/><path d="M8 16.5 15.5 9M11.5 9h4v4"/><path d="M12 20.5 19.5 13M15.5 13h4v4"/></g></symbol>
<symbol id="i-recall" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5.5 5 10l4.5 4.5"/><path d="M5 10h9.5a5 5 0 0 1 0 10H11"/></g></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8l2 7.2 7.2 2-7.2 2-2 7.2-2-7.2-7.2-2 7.2-2z" fill="currentColor" stroke="none" opacity="0.14"/><path d="M12 2.8l2 7.2 7.2 2-7.2 2-2 7.2-2-7.2-7.2-2 7.2-2z"/><path d="M10.7 12a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0z" fill="currentColor" stroke="none"/></g></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="1.9"/></g></symbol>
<symbol id="i-lock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11h10a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 7 11z" fill="currentColor" stroke="none" opacity="0.14"/><path d="M7 11h10a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 7 11z"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/><path d="M10.8 14.6a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0z" fill="currentColor" stroke="none"/><path d="M12 15.2v2.2"/></g></symbol>
<symbol id="i-back" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6 8.5 12l6 6"/></g></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v13M5.5 12h13"/></g></symbol>
<symbol id="i-minus" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 12h13"/></g></symbol>
<symbol id="i-castle" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20.5V9h3v2h2.5V9h5v2H17V9h3v11.5z" fill="currentColor" stroke="none" opacity="0.16"/><path d="M4 20.5V9h3v2h2.5V9h5v2H17V9h3v11.5z"/><path d="M4 6.5V9M20 6.5V9M12 3.5v5.5"/><path d="M12 3.5l3 1.2-3 1.2" fill="currentColor"/><path d="M9.8 20.5v-3.3a2.2 2.2 0 0 1 4.4 0v3.3"/><path d="M3 20.5h18"/></g></symbol>
<symbol id="i-home" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12a7 7 0 1 0 14 0a7 7 0 1 0 -14 0z"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><path d="M10.4 12a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0z" fill="currentColor" stroke="none"/></g></symbol>
<symbol id="i-sound" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fill-opacity=".18"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></g></symbol>
<symbol id="i-sfx" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fill-opacity=".18"/><path d="M15.5 9.5a3.2 3.2 0 0 1 0 5"/><path d="M19 7v3M17.5 8.5h3" /></g></symbol>
<symbol id="i-mute" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fill-opacity=".18"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></g></symbol>
<symbol id="i-hourglass" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M8 3.5c0 4.2 4 5.3 4 8.5s-4 4.3-4 8.5M16 3.5c0 4.2-4 5.3-4 8.5s4 4.3 4 8.5"/><path d="M9.5 18.8 12 16.2l2.5 2.6z" fill="currentColor" stroke="none"/></g></symbol>
<symbol id="i-points" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5h15.5V10c-1.9 0-3 .8-3.4 2.5H9.4C8.8 10.6 6.8 9.6 3 7.5z" fill="currentColor" stroke="none" opacity="0.2"/><path d="M3 7.5h15.5V10c-1.9 0-3 .8-3.4 2.5H9.4C8.8 10.6 6.8 9.6 3 7.5z"/><path d="M10.2 12.5v3.2M14.3 12.5v3.2"/><path d="M8.2 15.7h8.1l1.6 3.8H6.6z"/><path d="M18.5 7.5h2.5" opacity="0.6"/></g></symbol>
<symbol id="i-combine" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v4.2c0 2.8 6 3.8 6 7.6V20M18 4v4.2c0 2.8-6 3.8-6 7.6"/><path d="M9 17.3l3 3 3-3"/></g></symbol>
<symbol id="i-sell" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4.5h6l-1.6 3h-2.8z"/><path d="M10.6 7.5C6.8 9 5 12.2 5 15.2 5 18.4 7.6 20 12 20s7-1.6 7-4.8c0-3-1.8-6.2-5.6-7.7" fill="currentColor" stroke="none" opacity="0.14"/><path d="M10.6 7.5C6.8 9 5 12.2 5 15.2 5 18.4 7.6 20 12 20s7-1.6 7-4.8c0-3-1.8-6.2-5.6-7.7"/><path d="M12 11.5l1.2 2.3 2.3 1.2-2.3 1.2L12 18.5l-1.2-2.3-2.3-1.2 2.3-1.2z" fill="currentColor" stroke="none" opacity="0.8"/></g></symbol>
<symbol id="i-losses" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.8c-4 0-7 2.9-7 6.8 0 2.2 1 3.9 2.6 5v3.9h8.8v-3.9c1.6-1.1 2.6-2.8 2.6-5 0-3.9-3-6.8-7-6.8z" fill="currentColor" stroke="none" opacity="0.14"/><path d="M12 3.8c-4 0-7 2.9-7 6.8 0 2.2 1 3.9 2.6 5v3.9h8.8v-3.9c1.6-1.1 2.6-2.8 2.6-5 0-3.9-3-6.8-7-6.8z"/><path d="M7.7 11a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0z" fill="currentColor" stroke="none"/><path d="M13.1 11a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0z" fill="currentColor" stroke="none"/><path d="M10.3 19.5v-2.2M13.7 19.5v-2.2" opacity="0.7"/></g></symbol>
<symbol id="i-question" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.2 9.2a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2.1v.6"/><path d="M11 17.6a1 1 0 1 0 2 0a1 1 0 1 0 -2 0z" fill="currentColor" stroke="none"/></g></symbol>
<symbol id="i-crown" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17.5 3 7.5l5 4 4-6.5 4 6.5 5-4-1 10z" fill="currentColor" stroke="none" opacity="0.18"/><path d="M4 17.5 3 7.5l5 4 4-6.5 4 6.5 5-4-1 10z"/><path d="M4.5 20.5h15"/></g></symbol>
<symbol id="i-rank" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5.5a4 4 0 0 1-8 0z" fill="currentColor" stroke="none" opacity="0.14"/><path d="M8 4h8v5.5a4 4 0 0 1-8 0z"/><path d="M8 6H5.2a3 3 0 0 0 3 3.6M16 6h2.8a3 3 0 0 1-3 3.6"/><path d="M12 13.5v3.5"/><path d="M8.5 20.5h7l-.8-3.5H9.3z"/></g></symbol>
<symbol id="i-event" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5h16v13.5H4z" fill="currentColor" stroke="none" opacity="0.14"/><path d="M4 6.5h16v13.5H4z"/><path d="M4 10.5h16M8.5 4v4M15.5 4v4"/><path d="M12 12.6l1.1 2.2 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.6 2.4-.3z" fill="currentColor" stroke="none"/></g></symbol>
<symbol id="i-flag" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V3.5"/><path d="M6 4.5h12l-2.8 3.8L18 12H6" fill="currentColor" stroke="none" opacity="0.16"/><path d="M6 4.5h12l-2.8 3.8L18 12H6"/></g></symbol>
<symbol id="i-goal" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5" fill="currentColor" fill-opacity=".16"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 12l6.5-6.5M16 5.5h2.5V8"/></g></symbol>
<symbol id="i-gear" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33a1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></g></symbol>
<symbol id="i-bund" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3.6l5 1.7v3.9c0 3.2-2 5.5-5 6.6-3-1.1-5-3.4-5-6.6V5.3z" fill="currentColor" stroke="none" opacity="0.16"/><path d="M9 3.6l5 1.7v3.9c0 3.2-2 5.5-5 6.6-3-1.1-5-3.4-5-6.6V5.3z"/><path d="M16.2 7.4l3.8 1.3v3.9c0 3.2-2 5.5-5 6.6-1.8-.7-3.2-1.7-4-3.1"/></g></symbol>
<symbol id="i-wood" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15.5h11a2.5 2.5 0 0 0 0-5H4a2.5 2.5 0 0 0 0 5z" fill="currentColor" stroke="none" opacity="0.25"/><path d="M4 15.5h11M4 10.5h11M4 10.5a2.5 2.5 0 0 0 0 5"/><path d="M15 10.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 1 1 0-5z"/><path d="M8 20h11M8 15.5a2.25 2.25 0 0 0 0 4.5M19 15.5a2.25 2.25 0 1 1 0 4.5"/><path d="M8 6h9M8 6a2.2 2.2 0 0 0 0 4.4M17 6a2.2 2.2 0 1 1 0 4.4"/></g></symbol>
<symbol id="i-stone" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19l2.5-7 5-2 3.5 3 1 6z" fill="currentColor" stroke="none" opacity="0.25"/><path d="M3 19l2.5-7 5-2 3.5 3 1 6z"/><path d="M13 13l3.5-4.5 4 2 .5 8.5h-6"/><path d="M8 7.5l2-3.5 3.5 1.5L13 9"/></g></symbol>
<symbol id="i-iron" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 17.5l2.5-6h12l2.5 6z" fill="currentColor" stroke="none" opacity="0.3"/><path d="M3.5 17.5l2.5-6h12l2.5 6z"/><path d="M7.5 11.5l1.8-4.5h5.4l1.8 4.5"/><path d="M8.5 14.5h7" opacity="0.6"/></g></symbol>
<symbol id="i-crate" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5l8-4 8 4v8l-8 4-8-4z" fill="currentColor" stroke="none" opacity="0.22"/><path d="M4 8.5l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8.5l8 4 8-4M12 12.5v8"/><path d="M8 6.5l8 4" opacity="0.6"/></g></symbol>
<symbol id="i-flask" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3.5h5M10.5 3.5v5.2L5.2 17.6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.8-2.9L13.5 8.7V3.5"/><path d="M7.6 14.5h8.8l2.4 3.1a2 2 0 0 1-1.8 2.9H7a2 2 0 0 1-1.8-2.9z" fill="currentColor" stroke="none" opacity="0.35"/><path d="M10 17h.01M13.5 16.2h.01"/></g></symbol>
<symbol id="i-tower" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21l1-11h6l1 11z" fill="currentColor" stroke="none" opacity="0.25"/><path d="M8 21l1-11h6l1 11z"/><path d="M7 10h10V6.5h-2v1.5h-2V6.5h-2V8H9V6.5H7z"/><path d="M12 3v3.5M12 3l3 1-3 1" /><path d="M11 14h2"/></g></symbol>
<symbol id="i-market" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5l1.5-5h13L20 9.5z" fill="currentColor" stroke="none" opacity="0.3"/><path d="M4 9.5l1.5-5h13L20 9.5z"/><path d="M4 9.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M5.5 11.5v8.5h13v-8.5"/><path d="M10 20v-4.5h4V20"/></g></symbol>
<symbol id="i-info" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0z"/><path d="M12 11v5.5"/><path d="M10.9 7.9a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0z" fill="currentColor" stroke="none"/></g></symbol>
</svg>

<!-- ============ LOADING SCREEN ============ -->
<div id="splash" class="splash" role="status" aria-label="Spiel lädt">
  <canvas id="splashCanvas" class="splash-bg" aria-hidden="true"></canvas>
  <div class="splash-vig" aria-hidden="true"></div>
  <div class="splash-top">
    <h1 class="splash-title">Open Water</h1>
    <div class="splash-sub"><span></span>Erobere die Inseln<span></span></div>
  </div>
  <div class="splash-bottom">
    <div id="splashTipCard" class="splash-tipcard"><div id="splashTipPic" class="splash-tippic" aria-hidden="true"></div><div class="splash-tiptxt"><b>Tipp</b><span id="splashTip" class="splash-tip">Späh eine Basis aus, bevor du angreifst – dann siehst du ihre Truppen.</span></div></div>
    <div class="splash-barwrap"><span class="splash-cap"></span><div class="splash-bar"><i id="splashFill"></i></div><span class="splash-cap"></span></div>
    <div class="splash-meta"><span id="splashStatus" class="splash-status">Welt wird erschaffen …</span><span id="splashPct" class="splash-pct">0 %</span></div>
  </div>
</div>
<script src="<?= skript('ladebildschirm') ?>"></script>
<canvas id="mapCanvas" aria-label="Weltkarte"></canvas>
<div id="mapVignette" aria-hidden="true"></div>

<!-- HUD: Spielerbild (antippen = Profil) + eine Werte-Zeile + runder Rohstoff-Knopf; Desktop = ein Rahmen mit Namensschild -->
<div id="hud" class="hud">
  <button id="hudPlayer" class="hud-me" type="button" title="Profil öffnen">
    <span class="avatar-ring avatar-ring--sm"><span class="avatar"><svg class="icon"><use href="#i-profile"/></svg></span><span id="hudLevel" class="lvl">1</span></span>
    <span class="hud-me-text"><b id="hudName">Du</b><small id="hudRankLine">Bronze</small></span>
  </button>
  <div class="hud-werte">
    <div class="res res--coin" title="Münzen"><svg class="icon"><use href="#i-coin"/></svg><b id="coinCount">0</b></div>
    <div class="res res--gem" title="Edelsteine"><svg class="icon"><use href="#i-gem"/></svg><b id="gemCount">0</b></div>
    <div class="res res--troop" title="Truppen"><svg class="icon"><use href="#i-troops"/></svg><b id="troopCount">0</b></div>
  </div>
  <button id="hudRoh" class="res res--roh" type="button" title="Rohstoffe" aria-label="Rohstoffe"><svg class="icon"><use href="#i-crate"/></svg><span class="roh-mini"><span class="roh-v roh-h"><svg class="icon"><use href="#i-wood"/></svg><b data-r="h">0</b></span><span class="roh-v roh-s"><svg class="icon"><use href="#i-stone"/></svg><b data-r="s">0</b></span><span class="roh-v roh-e"><svg class="icon"><use href="#i-iron"/></svg><b data-r="e">0</b></span></span></button>
</div>
<div id="rohDrop" class="roh-drop" hidden></div>

<div id="midBar" class="midbar" hidden></div>

<!-- Navigation (die EINE Ordnung, Abschnitt 26): Karte/Stadt · Bündnis · Kampf · Events · Shop – runde Knöpfe; das Profil über das Spielerbild.
     phone = bottom dock, landscape phone = left rail, desktop = unten Mitte -->
<nav id="cornerButtons" class="nav" aria-label="Hauptmenü">
  <button id="cityNavBtn" class="nav-btn" type="button" title="Stadt: Burg, Gebäude, Forschung, Helden, Rohstoffe"><svg class="icon"><use href="#i-castle"/></svg><span class="nav-l">Stadt</span></button>
  <button id="bundBtn" class="nav-btn" type="button" title="Bündnis"><svg class="icon"><use href="#i-bund"/></svg><span class="nav-l">Bündnis</span><span id="bundBadge" class="badge" style="display:none">0</span></button>
  <button id="battleLogBtn" class="nav-btn" type="button" title="Kampf: Märsche und Berichte"><svg class="icon"><use href="#i-battlelog"/></svg><span class="nav-l">Kampf</span><span id="battleLogBadge" class="badge" style="display:none">0</span></button>
  <button id="goalsBtn" class="nav-btn" type="button" title="Events: Aufgaben, Belohnungen, Erfolge, Pass, Wochen-Event, Invasion, Drache, Boss"><svg class="icon"><use href="#i-event"/></svg><span class="nav-l">Events</span><span id="goalsBadge" class="badge" style="display:none">0</span></button>
  <button id="shopBtn" class="nav-btn" type="button" title="Shop: Kisten, Schilde, Thron, Händler, Markt"><svg class="icon"><use href="#i-shop"/></svg><span class="nav-l">Shop</span></button>
  <button id="profileBtn" class="nav-btn" type="button" title="Profil: Spieler, Ausrüstung, Fähigkeiten, Rangliste, Einstellungen"><svg class="icon"><use href="#i-profile"/></svg><span class="nav-l">Profil</span></button>
</nav>

<!-- Map controls: nur Kartensachen -->
<div id="mapControls" class="mapctl" role="group" aria-label="Kartensteuerung">
  <button id="zoomInBtn" type="button" aria-label="Hineinzoomen"><svg class="icon"><use href="#i-plus"/></svg></button>
  <button id="zoomOutBtn" type="button" aria-label="Herauszoomen"><svg class="icon"><use href="#i-minus"/></svg></button>
  <button id="homeBtn" type="button" aria-label="Zur Heimat"><svg class="icon"><use href="#i-home"/></svg></button>
  <button id="markerBtn" type="button" aria-label="Wegmarke setzen"><svg class="icon"><use href="#i-flag"/></svg></button>
  <button id="armyBtn" type="button" aria-label="Armee aufstellen"><svg class="icon"><use href="#i-troops"/></svg></button>
</div>
<div id="armySheet" class="marker-sheet field-sheet" hidden></div>
<div id="fieldSheet" class="marker-sheet field-sheet" hidden></div>
<div id="barbSheet" class="marker-sheet field-sheet barb-sheet" hidden></div>
<div id="markerSheet" class="marker-sheet" hidden>
  <div class="marker-head"><b id="markerTitle">Wegmarke</b><button id="markerClose" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button></div>
  <div class="marker-presets" id="markerPresets"></div>
  <input id="markerText" class="marker-input" maxlength="24" placeholder="Eigener Text …" autocomplete="off">
  <div class="marker-colors" id="markerColors"></div>
  <div class="marker-actions"><button id="markerDelete" class="btn btn--ghost btn--sm" type="button">Entfernen</button><button id="markerSave" class="btn btn--primary btn--sm" type="button">Speichern</button></div>
</div>

<!-- Toast: text-only, JS writes textContent. Empty = hidden. -->
<div id="hint" class="toast" role="status" aria-live="polite"></div>
<div id="anleitung" class="anleitung" role="status" hidden><span id="anleitungSchritt" class="anleitung-n"></span><span id="anleitungText" class="anleitung-t"></span><button id="anleitungWeg" class="btn-x" type="button" aria-label="Anleitung überspringen"><svg class="icon"><use href="#i-close"/></svg></button>
  <span id="anleitungFrage" class="anleitung-k" hidden><button id="anleitungJa" class="btn btn--secondary btn--sm" type="button">Überspringen</button><button id="anleitungNein" class="btn btn--primary btn--sm" type="button">Weiter lernen</button></span>
  <button id="anleitungOk" class="btn btn--primary btn--sm anleitung-ok" type="button" hidden>Verstanden</button></div>

<!-- Multi-attack floating bar (JS sets style.display='flex') -->
<div id="multiAttackBar" class="mabar">
  <div class="mabar-l"><svg class="icon"><use href="#i-multiattack"/></svg><span class="label" id="multiAttackLabel">0 Ziele ausgewählt</span></div>
  <div class="seg mabar-seg" id="multiAttackShare"><button type="button" data-f=".25">25 %</button><button type="button" data-f=".5">50 %</button><button type="button" data-f=".75">75 %</button><button type="button" data-f="1" class="on">Alle</button></div>
  <div class="seg mabar-seg hero-seg" id="multiAttackHero" hidden></div>
  <div class="seg mabar-seg hero-seg hero-seg2" id="multiAttackHero2" hidden></div>
  <div class="row">
    <button id="multiAttackCancelBtn" class="btn btn--ghost btn--sm" type="button">Abbrechen</button>
    <button id="multiAttackConfirmBtn" class="btn btn--danger btn--sm" type="button"><svg class="icon"><use href="#i-attack"/></svg><span class="lbl">Angriffe starten</span></button>
  </div>
</div>

<!-- Scrims (new). uiScrim = under sheets (z 23), uiScrimTop = under the nested item sheet on phones (z 55) -->
<div id="uiScrim" class="scrim" hidden></div>
<div id="uiScrimTop" class="scrim scrim--top" hidden></div>

<style>
/* Fenster Events, Kampf, Bündnis, Profil: höchstens 4 Reiter, Unterreiter als Chips, Tippflächen mind. 44 px, nichts abgeschnitten */
#goalsGruppen.tabs,#profilePopup #profileTabs.tabs{grid-template-columns:repeat(4,minmax(0,1fr))}
#battleTabs.tabs{grid-template-columns:repeat(2,minmax(0,1fr))}
.p5-reiter .tab .badge{position:absolute;top:4px;right:8px}
@media (min-height:501px),(orientation:portrait){
  .p5-reiter .tab,#profilePopup #profileTabs .tab{min-height:48px;font-size:12px}
}
.p5-reiter .tab span,#profilePopup #profileTabs .tab span{text-overflow:clip}
.p5-chips{flex:none;display:flex;gap:8px;padding:8px 16px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--line-1);background:rgba(0,0,0,.12)}
.p5-chips::-webkit-scrollbar{display:none}
.p5-chips[hidden],.p5-chip[hidden]{display:none}
.p5-chip{position:relative;flex:none;display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:18px;border:1px solid var(--line-2);background:rgba(255,255,255,.03);
  color:var(--tx-2);font:600 13px/1 var(--font-ui);white-space:nowrap;cursor:pointer}
.p5-chip::before{content:"";position:absolute;left:0;right:0;top:-4px;bottom:-4px}   /* Tippfläche 44 px */
.p5-chip.active{color:var(--gold-100);border-color:var(--gold-300);background:rgba(214,170,90,.14)}
.p5-chip .badge{position:static}
#combatLogList > .logRow{cursor:pointer}
/* Profil: Kopf in 3 Zeilen (Rang + Titel, Name, Stufe) */
.p5-kopfzeile{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 16px}
.p5-kopfzeile .ptitle-tag{position:relative;margin:0;white-space:nowrap}
.p5-kopfzeile .ptitle-tag:not(:empty)::before{content:"·";position:absolute;left:-10px;color:var(--tx-3)}   /* der Punkt steht in der Lücke: bricht der Titel um, schneidet der Rand ihn ab */
.p5-naechste{margin:0 0 8px;padding:8px 12px;border:1px solid var(--line-1);border-radius:8px;font-size:13px;color:var(--tx-2)}
.p5-zeile{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;margin:0 0 8px;padding:8px 12px;border:1px solid var(--line-2);border-radius:10px;
  background:rgba(255,255,255,.03);color:var(--tx-1);font:600 15px/1.2 var(--font-ui);text-align:left;cursor:pointer}
.p5-zeile > span{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.p5-zeile small{font:400 13px/1.3 var(--font-ui);color:var(--tx-3)}
.p5-zeile .icon{flex:none;width:20px;height:20px;color:var(--gold-300)}
.p5-zeile .p5-pfeil{width:16px;height:16px;transform:scaleX(-1);color:var(--tx-3)}
/* Einstellungen: Sprung-Leiste und Gruppen */
.p5-sprung{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
.p5-sprung button{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px;border:1px solid var(--line-2);border-radius:22px;background:rgba(255,255,255,.03);
  color:var(--tx-1);font:600 13px/1 var(--font-ui);cursor:pointer}
.p5-sprung .icon{width:16px;height:16px;color:var(--gold-300)}
.p5-gruppe{margin:12px 0 4px;font:700 11px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--gold-200)}
.p5-gruppe:first-child{margin-top:4px}
#tabSet .set-zeile{min-height:44px}
#tabSet .set-zeile input{width:24px;height:24px}
#tabSet .set-knoepfe .btn,#tabSet .set-ab .btn,#tabSet .set-pw .btn,#pushKnopf{min-height:44px}
.p5-hilfe summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font:600 13px/1.2 var(--font-ui);color:var(--tx-1)}
.p5-hilfe p{font-size:13px}
/* Bündnis ohne Bündnis: Gründen unter der Liste */
#bundUnten:not(:empty){margin-top:16px}
.p5-gruenden{width:100%;min-height:44px;gap:8px}
.p5-gruenden .cost{margin-left:auto;display:inline-flex;align-items:center;gap:4px}
/* Spieltest: Tippflächen mind. 44 px (sichtbar kleiner), nichts abgeschnitten */
button.rp-bund{position:relative} button.rp-bund::before{content:"";position:absolute;left:0;right:0;top:50%;height:var(--k-tipp);transform:translateY(-50%)}
.rp-bund.is-leer{font-size:var(--fs-11)} .rp-bund.is-leer > span{white-space:normal}   /* „Kein Bündnis – jetzt eins suchen“ ganz, notfalls in zwei Zeilen */
.panel--island .seg button{position:relative;min-height:36px}
.panel--island .seg button::before{content:"";position:absolute;left:-1px;right:-1px;top:-5px;bottom:-5px}   /* (ab der Innenkante: 1 px Rand dazu) */
.panel--island .hero-seg.chips-quer{padding-block:4px}   /* (die Liste schiebt quer: die Tippfläche braucht Platz im Rahmen) */
.panel--island .pfoot .btn{min-height:var(--k-zweit)}
.from-field{grid-template-columns:minmax(0,1fr);gap:4px}   /* Startbasis: Name, Truppen und Marschzeit ganz zu lesen */
.from-sel{padding:0 6px 0 10px;font-weight:500}   /* („· reicht“ dahinter passt auch noch) */
.mact button{position:relative} .logRow .mact button,.march-all .mact button{min-height:36px} .mact button::before{content:"";position:absolute;left:-1px;right:-1px;top:-5px;bottom:-5px}
@media (pointer:coarse){ .mapctl button{width:44px;height:44px} .ap-kopf .from-sel{height:44px} }
</style>

<!-- ============ PROFILE ============ -->
<section id="profilePopup" class="panel panel--sheet" role="dialog" aria-labelledby="profileName" data-tab="info">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead phead--hero">
    <div id="pAvatarRing" class="avatar-ring"><span class="avatar"><svg class="icon"><use href="#i-profile"/></svg></span><span id="profileLevelBadge" class="lvl">1</span></div>
    <div class="phead-text">
      <div class="overline p5-kopfzeile"><span>Profil · Rang <b id="profileRank">Bronze</b></span><span id="profileTitle" class="ptitle-tag"></span></div>
      <input id="profileName" class="ptitle ptitle--input" type="text" maxlength="20" placeholder="Dein Name" autocomplete="off" spellcheck="false">
      <div class="xp"><span class="xp-l">Stufe <b id="xpLevelNum">1</b></span><div class="xp-track"><i id="xpFill" class="xpFill"></i></div><span id="xpNums" class="xp-n">0 / 50 XP</span></div>
      <div id="profileBund"></div>
    </div>
    <button id="profileCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="profileTabs" class="tabs" role="tablist">
    <button id="tabBtnInfo" class="tab active" type="button" role="tab"><svg class="icon"><use href="#i-profile"/></svg><span>Spieler</span></button>
    <button id="tabBtnEquip" class="tab" type="button" role="tab"><svg class="icon"><use href="#i-shield"/></svg><span>Ausrüstung</span></button>
    <button id="tabBtnSkills" class="tab" type="button" role="tab"><svg class="icon"><use href="#i-star"/></svg><span>Fähigkeiten</span></button>
    <button id="tabBtnSet" class="tab" type="button" role="tab"><svg class="icon"><use href="#i-gear"/></svg><span>Einstellungen</span></button>
  </div>
  <div class="pbody">
    <div id="tabInfo" class="profileTabPanel active" role="tabpanel">
      <div id="xpNext" class="xp-next p5-naechste"></div>
      <!-- Aussehen: nur hier (Wappen, Rahmen, Titel, Basis- und Marsch-Skins, Ringe) -->
      <button id="crestCard" class="crest-card" type="button" aria-label="Aussehen: Wappen, Rahmen, Skins, Ringe">
        <canvas id="crestSmall" width="112" height="112"></canvas>
        <span id="lookNow" class="crest-card-t"><b>Aussehen</b><small>Wappen, Rahmen, Skins, Ringe</small></span>
        <span class="crest-card-go">Ändern<svg class="icon"><use href="#i-upgrade"/></svg></span>
      </button>
      <!-- Rangliste: eigenes Fenster, hier nur der Weg dorthin -->
      <button id="tabBtnRank" class="p5-zeile" type="button"><svg class="icon"><use href="#i-rank"/></svg><span>Rangliste<small>Macht, Eroberungen, Hauptstadt, Titel, Thron-Punkte</small></span><svg class="icon p5-pfeil"><use href="#i-back"/></svg></button>
      <div class="sect"><h4>Reich</h4></div>
      <div class="stat-grid">
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-flag"/></svg>Basen</span><b class="stat-v" id="kBases">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-troops"/></svg>Truppen / Std.</span><b class="stat-v is-good" id="kTroopsRate">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-coin"/></svg>Münzen / Std.</span><b class="stat-v is-good" id="kCoinsRate">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-home"/></svg>Weltanteil</span><b class="stat-v" id="profileProgress">0%</b></div>
      </div>
      <div class="sect"><h4>Übersicht</h4></div>
      <div id="profileStats" class="kv"></div>
    </div>

    <div id="tabEquip" class="profileTabPanel" role="tabpanel">
      <div id="equipStats" class="bonus-row"></div>
      <div class="sect"><h4>Ausgerüstet</h4></div>
      <div id="chestEquippedGrid" class="slots"></div>
      <div class="sect">
        <h4 id="chestInventoryLabel">Inventar</h4>
        <div class="sect-aside">
          <span class="pill pill--points" title="Aufwertungspunkte"><svg class="icon"><use href="#i-points"/></svg><b id="chestPointsValue">0</b><small>Punkte</small></span>
        </div>
      </div>
      <div id="chestInventoryGrid" class="tiles"></div>
    </div>

    <div id="tabSkills" class="profileTabPanel" role="tabpanel">
      <div id="skillPointsLine" class="pointsline"></div>
      <div id="skillDetail" class="skillDetail"></div>
      <div id="skillGrid" class="skillCross"></div>
    </div>

    <!-- EINSTELLUNGEN (nur hier): Benachrichtigungen (benachrichtigung.js), Ton, Grafik, Konto, Hilfe -->
    <div id="tabSet" class="profileTabPanel" role="tabpanel">
      <nav class="p5-sprung" aria-label="Einstellungen">
        <button type="button" data-sprung="setBen"><svg class="icon"><use href="#i-flag"/></svg>Benachrichtigungen</button><button type="button" data-sprung="setTonGrafik"><svg class="icon"><use href="#i-sound"/></svg>Ton &amp; Grafik</button><button type="button" data-sprung="setKonto"><svg class="icon"><use href="#i-profile"/></svg>Konto</button><button type="button" data-sprung="setHilfe"><svg class="icon"><use href="#i-info"/></svg>Hilfe</button>
      </nav>
      <div class="sect" id="setBen"><h4>Benachrichtigungen</h4></div>
      <div id="pushKarte" class="push-karte">
        <p id="pushText" class="push-text">Einen Moment …</p>
        <button id="pushKnopf" class="btn btn--secondary btn--sm" type="button" hidden></button>
        <div id="pushArten" class="set-liste" hidden>
          <div class="p5-gruppe">Angriff</div>
          <label class="set-zeile"><span>Angriff auf deine Basis</span><input type="checkbox" data-push-art="angriff"></label>
          <label class="set-zeile"><span>Späher bei dir<small>unterwegs zu dir und „hat deine Basis ausgespäht“</small></span><input type="checkbox" data-push-art="spaeher"></label>
          <label class="set-zeile"><span>Basis verloren</span><input type="checkbox" data-push-art="verloren"></label>
          <label class="set-zeile"><span>Friedensschild läuft ab</span><input type="checkbox" data-push-art="schild"></label>
          <label class="set-zeile"><span>Rally gegen dich</span><input type="checkbox" data-push-art="rally"></label>
          <div class="p5-gruppe">Bündnis</div>
          <label class="set-zeile"><span>Bündnis ruft um Hilfe</span><input type="checkbox" data-push-art="hilfe"></label>
          <div class="p5-gruppe">Events</div>
          <label class="set-zeile"><span>Kriegsherr erschienen</span><input type="checkbox" data-push-art="boss"></label>
          <label class="set-zeile"><span>Barbaren-Invasion beginnt<small>10 Minuten vorher</small></span><input type="checkbox" data-push-art="invasion"></label>
          <label class="set-zeile"><span>Der Drache ist erschienen<small>Sonntagabend</small></span><input type="checkbox" data-push-art="drache"></label>
          <label class="set-zeile"><span>Ein Händler ist da<small>Wandernder Händler auf der Karte</small></span><input type="checkbox" data-push-art="haendler"></label>
          <div class="p5-gruppe">Stadt</div>
          <label class="set-zeile"><span>Sammler zurück</span><input type="checkbox" data-push-art="sammler"></label>
          <label class="set-zeile"><span>Bau fertig<small>Gebäude und Burg in deiner Stadt</small></span><input type="checkbox" data-push-art="bau"></label>
          <label class="set-zeile"><span>Forschung fertig<small>Labor ist wieder frei</small></span><input type="checkbox" data-push-art="forschung"></label>
        </div>
      </div>
      <div class="sect" id="setTonGrafik"><h4>Ton &amp; Grafik</h4></div>
      <div id="setTon" class="set-wahl" role="radiogroup" aria-label="Ton">
        <button type="button" data-ton="all"><svg class="icon"><use href="#i-sound"/></svg>Musik + Effekte</button>
        <button type="button" data-ton="sfx"><svg class="icon"><use href="#i-sfx"/></svg>Nur Effekte</button>
        <button type="button" data-ton="off"><svg class="icon"><use href="#i-mute"/></svg>Aus</button>
      </div>
      <div class="set-liste">
        <label class="set-zeile"><span>Akku sparen<small>Karte ruhiger, weniger Bilder pro Sekunde</small></span><input type="checkbox" id="setAkku"></label>
      </div>
      <div class="sect" id="setKonto"><h4>Konto</h4></div>
      <div class="kv"><div><span>Name</span><b id="setName"></b></div><div><span>Spieler-Nummer</span><b id="setNr"></b></div></div>
      <div class="set-knoepfe"><button id="setNameBtn" class="btn btn--secondary btn--sm" type="button">Name ändern</button>
        <button id="setPwOffen" class="btn btn--secondary btn--sm" type="button">Passwort ändern</button></div>
      <form id="setPwForm" class="set-pw" hidden autocomplete="on">
        <input id="setPwAlt" type="password" autocomplete="current-password" placeholder="Altes Passwort" maxlength="200">
        <input id="setPwNeu" type="password" autocomplete="new-password" placeholder="Neues Passwort (10–72 Zeichen)" maxlength="72">
        <input id="setPwNeu2" type="password" autocomplete="new-password" placeholder="Neues Passwort wiederholen" maxlength="72">
        <button class="btn btn--primary btn--sm" type="submit">Speichern</button>
        <small>Danach bist du auf allen anderen Geräten abgemeldet.</small>
      </form>
      <form action="index.php?aus=1" method="post" class="set-ab"><button class="btn btn--secondary btn--sm" type="submit">Abmelden</button></form>
      <div class="sect" id="setHilfe"><h4>Hilfe</h4></div>
      <div class="set-knoepfe"><button id="anleitungNochmal" class="btn btn--secondary btn--sm" type="button">Anleitung noch mal</button></div>
      <details class="set-hilfe p5-hilfe">
        <summary>Wo finde ich was?</summary>
        <p><b>Stadt</b> → Burg (deine Hauptstadt-Stufe), Gebäude, Holz/Stein/Eisen, Forschung, Krankenhaus, Helden.</p>
        <p><b>Bündnis</b> → zusammen mit anderen: Chat, Rally, Verstärkung, Bündnis-Hilfe, Tempel-Bonus.</p>
        <p><b>Kampf</b> → Unterwegs (deine Märsche) und Berichte.</p>
        <p><b>Events</b> → Aufgaben (Täglich, Erfolge), Abholen (Abholfach, tägliche Belohnung), Pass, Ereignisse (Wochen-Event, Invasion, Drache, Tagesboss und Lager).</p>
        <p><b>Shop</b> → Kisten, Friedensschilde, Thron-Shop, Händler, Markt.</p>
        <p><b>Profil</b> → Spieler (Aussehen, Rangliste), Ausrüstung, Fähigkeiten, Einstellungen.</p>
        <p><b>Karte</b> → Basis antippen: angreifen, Truppen senden, aufwerten. Felder: sammeln. Mitte: wer den Mega-Tempel hält, herrscht.</p>
      </details>
      <div class="sect"><h4>Info</h4></div>
      <div class="kv"><div><span>Version</span><b id="setVersion"></b></div></div>
    </div>

  </div>
  <footer id="profileFoot" class="pfoot">
    <div id="chestSelectionBar" class="selbar">
      <div class="label" id="chestSelectionLabel"></div>
      <div class="row">
        <button id="chestSelectCombineBtn" class="btn btn--secondary btn--sm" type="button"><svg class="icon"><use href="#i-combine"/></svg><span>Kombinieren</span></button>
        <button id="chestSelectSellBtn" class="btn btn--danger btn--sm" type="button"><svg class="icon"><use href="#i-sell"/></svg><span>Verkaufen</span></button>
      </div>
    </div>
  </footer>
</section>

<!-- ============ BATTLE LOG ============ -->
<section id="battleLogPopup" class="panel panel--sheet" role="dialog" aria-labelledby="battleLogTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><svg class="icon"><use href="#i-battlelog"/></svg></div>
    <div class="phead-text"><div class="overline">Angriffe &amp; Berichte</div><h3 id="battleLogTitle" class="ptitle">Kampf</h3></div>
    <button id="battleLogCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="battleTabs" class="tabs p5-reiter" role="tablist">
    <button class="tab active" type="button" role="tab" data-ktab="unterwegs"><svg class="icon"><use href="#i-hourglass"/></svg><span>Unterwegs</span><span class="badge" id="battleTabBadge" style="display:none">0</span></button>
    <button class="tab" type="button" role="tab" data-ktab="berichte"><svg class="icon"><use href="#i-battlelog"/></svg><span>Berichte</span></button>
  </div>
  <div class="pbody">
    <div id="activeMarches" class="logList" data-kpane="unterwegs"></div>
    <div id="combatLogList" class="logList" data-kpane="berichte" hidden></div>
  </div>
</section>

<!-- ============ RULER ============ -->
<section id="rulerPopup" class="panel panel--sheet" role="dialog" aria-labelledby="rulerName">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div id="rulerCrest" class="rp-crest"><span class="rp-crest-in"><img alt=""></span><span class="lvl" id="rulerLvl">1</span></div>
    <div class="phead-text"><div class="overline" id="rulerOver">Profil</div><h3 id="rulerName" class="ptitle">–</h3><div class="psub" id="rulerSub"></div></div>
    <button id="rulerCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div class="pbody" id="rulerBody"></div>
</section>

<!-- ============ BÜNDNIS (Dock, buendnis.js) ============ -->
<section id="bundPopup" class="panel panel--sheet" role="dialog" aria-labelledby="bundTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div id="bundEmblem" class="emblem emblem--gold"><svg class="icon"><use href="#i-bund"/></svg></div>
    <div class="phead-text"><div class="overline">Bündnis</div><h3 id="bundTitle" class="ptitle">Bündnis</h3><div class="psub" id="bundSub"></div></div>
    <button id="bundCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="bundTabs" class="tabs" role="tablist">
    <button class="tab active" type="button" role="tab" data-btab="info"><svg class="icon"><use href="#i-bund"/></svg><span>Übersicht</span></button>
    <button class="tab" type="button" role="tab" data-btab="sig"><svg class="icon"><use href="#i-flag"/></svg><span>Chat</span></button>
    <button class="tab" type="button" role="tab" data-btab="rally"><svg class="icon"><use href="#i-troops"/></svg><span>Rally</span></button>
    <button class="tab" type="button" role="tab" data-btab="suchen"><svg class="icon"><use href="#i-scout"/></svg><span>Suchen</span></button>
  </div>
  <div class="pbody"><div id="bundOben"></div><div id="bundLive" class="bd-live"></div><div id="bundUnten"></div></div>
</section>

<!-- ============ RANGLISTE (Profil → Rangliste) ============ -->
<section id="rankPopup" class="panel panel--sheet" role="dialog" aria-labelledby="rankTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><svg class="icon"><use href="#i-rank"/></svg></div>
    <div class="phead-text"><div class="overline">Rangliste</div><h3 id="rankTitle" class="ptitle">Macht</h3><div class="psub" id="rankSub"></div></div>
    <button id="rankCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="rankTabs" class="tabs" role="tablist">
    <button class="tab active" type="button" role="tab" data-rtab="power"><svg class="icon"><use href="#i-attack"/></svg><span>Macht</span></button>
    <button class="tab" type="button" role="tab" data-rtab="caps"><svg class="icon"><use href="#i-flag"/></svg><span>Eroberungen</span></button>
    <button class="tab" type="button" role="tab" data-rtab="burg"><svg class="icon"><use href="#i-castle"/></svg><span>Hauptstadt</span></button>
    <button class="tab" type="button" role="tab" data-rtab="titles"><svg class="icon"><use href="#i-crown"/></svg><span>Titel</span></button>
    <button class="tab" type="button" role="tab" data-rtab="week"><svg class="icon"><use href="#i-points"/></svg><span>Thron-Punkte</span></button>
  </div>
  <div class="pbody" id="rankBody"></div>
  <footer class="pfoot lb-foot" id="rankFoot"></footer>
</section>

<!-- ============ EVENTS (Dock): 4 Reiter Aufgaben (Täglich, Erfolge) · Abholen (Abholfach + tägliche Belohnung) · Pass ·
     Ereignisse (Wochen-Event, Invasion, Drache, Tagesboss + Barbaren-Lager) – alles nur hier ============ -->
<section id="goalsPopup" class="panel panel--sheet" role="dialog" aria-labelledby="goalsTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><svg class="icon"><use href="#i-event"/></svg></div>
    <div class="phead-text"><div class="overline">Aufgaben &amp; Ereignisse</div><h3 id="goalsTitle" class="ptitle">Events</h3><div class="psub" id="goalsSub"></div></div>
    <button id="goalsCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="goalsGruppen" class="tabs mail-tabs p5-reiter" role="tablist">
    <button class="tab active" type="button" role="tab" data-ggrp="aufgaben"><svg class="icon"><use href="#i-flag"/></svg><span>Aufgaben</span><span class="badge" data-ggbadge="aufgaben" style="display:none">0</span></button>
    <button class="tab" type="button" role="tab" data-ggrp="abholen"><svg class="icon"><use href="#i-shop"/></svg><span>Abholen</span><span class="badge" data-ggbadge="abholen" style="display:none">0</span></button>
    <button class="tab" type="button" role="tab" data-ggrp="pass"><svg class="icon"><use href="#i-crown"/></svg><span>Pass</span><span class="badge" data-ggbadge="pass" style="display:none">0</span></button>
    <button class="tab" type="button" role="tab" data-ggrp="ereignisse"><svg class="icon"><use href="#i-event"/></svg><span>Ereignisse</span><span class="badge" data-ggbadge="ereignisse" style="display:none">!</span></button>
  </div>
  <!-- Unterreiter als Chips: nur die der offenen Gruppe sind sichtbar -->
  <div id="goalsTabs" class="p5-chips" role="tablist">
    <button class="p5-chip active" type="button" role="tab" data-gtab="daily" data-ggrp-von="aufgaben"><span>Täglich</span><span class="badge" data-gbadge="daily" style="display:none">0</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="ach" data-ggrp-von="aufgaben"><span>Erfolge</span><span class="badge" data-gbadge="ach" style="display:none">0</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="reward" data-ggrp-von="abholen" hidden><span>Belohnung</span><span class="badge" data-gbadge="reward" style="display:none">0</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="pass" data-ggrp-von="pass" hidden><span>Pass</span><span class="badge" data-gbadge="pass" style="display:none">0</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="tour" data-ggrp-von="ereignisse" hidden><span>Wochen-Event</span><span class="badge" data-gbadge="tour" style="display:none">!</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="inv" data-ggrp-von="ereignisse" hidden><span>Invasion</span><span class="badge" data-gbadge="inv" style="display:none">!</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="drache" data-ggrp-von="ereignisse" hidden><span>Drache</span><span class="badge" data-gbadge="drache" style="display:none">!</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="boss" data-ggrp-von="ereignisse" hidden><span>Boss &amp; Lager</span></button>
  </div>
  <div class="pbody">
    <div class="mail-pane" data-gpane="daily">
      <div class="sect"><h4>Heutige Aufgaben</h4><span id="questReset" class="sect-aside quest-reset"></span></div>
      <div id="questList" class="quests"></div>
      <div class="sect"><h4>Wochenkette</h4></div>
      <div id="chainCard" class="chain"></div>
    </div>
    <div class="mail-pane" data-gpane="reward" hidden>
      <div class="sect"><h4>Zum Abholen</h4><span id="inboxAside" class="sect-aside"></span></div>
      <div id="inboxList" class="inbox"></div>
      <div class="sect"><h4>Tägliche Belohnung</h4></div>
      <div id="dailyCard" class="daily"></div>
      <div class="sect"><h4>Die Woche</h4><span class="sect-aside">verpasster Tag = Tag 1</span></div>
      <div id="dailyWeek" class="daily-week"></div>
    </div>
    <div class="mail-pane" data-gpane="ach" hidden>
      <div id="achSummary" class="ach-sum"></div>
      <div id="achList" class="ach-list"></div>
    </div>
    <div class="mail-pane" data-gpane="pass" hidden>
      <div id="passPane" class="pass"></div>
    </div>
    <div class="mail-pane" data-gpane="ev" hidden><div id="eventBody" class="ev-body"></div></div>
  </div>
</section>

<!-- ============ SHOP (Dock): Kisten · Schilde · Thron · Händler (nur wenn einer da ist) · Markt – alles Kaufen/Tauschen nur hier ============ -->
<section id="shopPopup" class="panel panel--sheet" role="dialog" aria-labelledby="shopTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><svg class="icon"><use href="#i-shop"/></svg></div>
    <div class="phead-text"><div class="overline">Kaufen &amp; Tauschen</div><h3 id="shopTitle" class="ptitle">Shop</h3>
      <div class="psub"><span class="pill pill--gem"><svg class="icon"><use href="#i-gem"/></svg><b id="shopGemCount">0</b><small>Edelsteine</small></span><span class="pill pill--throne"><svg class="icon"><use href="#i-crown"/></svg><b id="shopThroneCount">0</b><small>Thron</small></span></div></div>
    <button id="shopCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="shopTabs" class="tabs mail-tabs" role="tablist">
    <button class="tab active" type="button" role="tab" data-stab="gems"><svg class="icon"><use href="#i-gem"/></svg><span>Kisten</span></button>
    <button class="tab" type="button" role="tab" data-stab="shield"><svg class="icon"><use href="#i-shield"/></svg><span>Schilde</span></button>
    <button class="tab" type="button" role="tab" data-stab="throne"><svg class="icon"><use href="#i-crown"/></svg><span>Thron</span></button>
    <button class="tab" type="button" role="tab" data-stab="hd" hidden><svg class="icon"><use href="#i-coin"/></svg><span>Händler</span><span class="badge">!</span></button>
    <button class="tab" type="button" role="tab" data-stab="markt"><svg class="icon"><use href="#i-crate"/></svg><span>Markt</span></button>
  </div>
  <div class="pbody">
    <div class="mail-pane" data-spane="throne" hidden><div id="throneShop"></div></div>
    <div class="mail-pane" data-spane="hd" hidden><div class="sect"><h4 id="hdTitle">Wandernder Händler</h4><span id="hdSub" class="sect-aside"></span></div><div id="hdLive" class="hd-live"></div></div>
    <div class="mail-pane" data-spane="markt" hidden><div id="shopMarkt" class="ev-body"></div></div>
    <div class="mail-pane" data-spane="shield" hidden>
      <p class="mail-intro">Friedensschild: niemand kann deine Türme angreifen, solange er steht – Tore, Tempel und der Thron bleiben angreifbar. Greifst du selbst an, fällt der Schild sofort.</p>
      <div id="shieldState" class="notice"></div>
      <div class="sect"><h4>Kaufen</h4><span class="sect-aside">kommt in den Vorrat</span></div>
      <div class="shield-opts">
        <button type="button" class="btn btn--secondary" data-shield="2"><span>2 Std.</span><span class="cost cost--gem"><svg class="icon"><use href="#i-gem"/></svg><b>40</b></span></button>
        <button type="button" class="btn btn--secondary" data-shield="8"><span>8 Std.</span><span class="cost cost--gem"><svg class="icon"><use href="#i-gem"/></svg><b>120</b></span></button>
        <button type="button" class="btn btn--secondary" data-shield="24"><span>24 Std.</span><span class="cost cost--gem"><svg class="icon"><use href="#i-gem"/></svg><b>300</b></span></button>
      </div>
      <div class="sect"><h4>Einschalten</h4><span class="sect-aside">aus dem Vorrat</span></div>
      <div id="shieldUse" class="shield-opts"></div>
    </div>
    <div class="mail-pane" data-spane="gems">
    <article class="offer">
      <div class="offer-art"><svg class="icon"><use href="#i-shop"/></svg></div>
      <div class="offer-text">
        <h4>Ausrüstungskiste</h4>
        <p>Enthält ein zufälliges Ausrüstungsteil (Waffe, Rüstung, Schild oder Stiefel) in einer von sechs Seltenheiten.</p>
        <details class="odds-mehr"><summary><svg class="icon"><use href="#i-info"/></svg>Chancen</summary><div id="shopOdds" class="odds"><!-- JS fills from RARITY_DEFS + RARITY_DROP_WEIGHTS --></div></details>
      </div>
    </article>
    <div id="shopCrateResult" class="loot" style="display:none"></div>
    <article class="offer">
      <div class="offer-art"><svg class="icon"><use href="#i-crown"/></svg></div>
      <div class="offer-text">
        <h4>Heldenkisten</h4>
        <p>Splitter für zufällige Helden – je gewöhnlicher, desto öfter. Damit schaltest du Helden frei und wertest sie um Viertel-Sterne auf.</p>
        <div id="heroChestOpts" class="shield-opts hchest-opts"></div>
        <details class="odds-mehr"><summary><svg class="icon"><use href="#i-info"/></svg>Chancen</summary><div id="heroChestOdds" class="odds"></div></details>
      </div>
    </article>
    <div id="shopHeroResult" class="hchest-res" hidden></div>
    </div>
  </div>
  <footer class="pfoot" id="shopFoot">
    <button id="shopToEquipBtn" class="btn btn--secondary" type="button"><svg class="icon"><use href="#i-shield"/></svg><span>Ausrüstung</span></button>
    <button id="shopOpenCrateBtn" class="btn btn--primary btn--grow" type="button"><span class="lbl">Kiste öffnen</span><span class="cost cost--gem"><svg class="icon"><use href="#i-gem"/></svg><b data-const="CRATE_GEM_COST">150</b></span></button>
  </footer>
</section>

<!-- ============ ITEM DETAIL (nested over profile) ============ -->
<section id="chestItemPopup" class="panel panel--item" role="dialog" aria-labelledby="chestItemTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div id="chestItemIconBig" class="item-icon" data-r="grau"></div>
    <div class="phead-text">
      <div id="chestItemOverline" class="overline">Gewöhnlich</div>
      <h3 id="chestItemTitle" class="ptitle">Ausrüstung</h3>
      <div id="chestItemSub" class="psub"></div>
    </div>
    <button id="chestItemCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div class="pbody"><div id="chestItemStats" class="kv"></div></div>
  <footer class="pfoot pfoot--wrap">
    <button id="chestItemUpgradeBtn" class="btn btn--primary btn--full" type="button"><svg class="icon"><use href="#i-upgrade"/></svg><span class="lbl">Verbessern</span><span class="cost cost--pt"><svg class="icon"><use href="#i-points"/></svg><b>0</b></span></button>
    <button id="chestItemEquipBtn" class="btn btn--secondary btn--grow" type="button"><svg class="icon"><use href="#i-check"/></svg><span>Ausrüsten</span></button>
    <button id="chestItemUnequipBtn" class="btn btn--secondary btn--grow" type="button" style="display:none"><span>Ablegen</span></button>
    <button id="chestItemSellBtn" class="btn btn--danger-outline btn--grow" type="button"><svg class="icon"><use href="#i-sell"/></svg><span>Verkaufen</span></button>
  </footer>
</section>

<!-- ============ LEVEL-UP MODAL ============ -->
<div id="levelUpModal" class="lvlup" role="dialog" aria-modal="true" aria-labelledby="levelUpTitle" hidden>
  <div class="lvlup-card">
    <div class="lvlup-badge"><b id="levelUpLevel">2</b></div>
    <div class="lvlup-over">Stufe erreicht</div>
    <h2 id="levelUpTitle" class="lvlup-title">Stufe 2</h2>
    <div id="levelUpSub" class="lvlup-sub"></div>
    <div class="lvlup-rule"></div>
    <div class="lvlup-label">Belohnungen</div>
    <ul id="levelUpRewards" class="lvlup-rewards"></ul>
    <div id="levelUpNext" class="lvlup-next"></div>
    <button id="levelUpBtn" class="btn btn--primary" type="button"><svg class="icon"><use href="#i-check"/></svg><span>Einsammeln</span></button>
  </div>
</div>

<!-- ============ DAILY REWARD MODAL ============ -->
<div id="welcomeModal" class="lvlup" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle" hidden>
  <div class="lvlup-card">
    <div class="lvlup-badge"><img id="welcomeCrest" class="welcome-crest" alt=""></div>
    <div class="lvlup-over">Willkommen zurück</div>
    <h2 id="welcomeTitle" class="lvlup-title">Schön, dass du da bist</h2>
    <div id="welcomeSub" class="lvlup-sub"></div>
    <div class="lvlup-rule"></div>
    <div class="lvlup-label">Während du weg warst</div>
    <ul id="welcomeList" class="lvlup-rewards"></ul>
    <button id="welcomeOkBtn" class="btn btn--primary" type="button"><svg class="icon"><use href="#i-check"/></svg><span>Weiter</span></button>
  </div>
</div>

<div id="dailyModal" class="lvlup" role="dialog" aria-modal="true" aria-labelledby="dailyModalTitle" hidden>
  <div class="lvlup-card">
    <div class="lvlup-badge"><svg class="icon" style="width:34px;height:34px;color:var(--gold-100)"><use href="#i-shop"/></svg></div>
    <div class="lvlup-over">Tägliche Belohnung</div>
    <h2 id="dailyModalTitle" class="lvlup-title">Tag 1</h2>
    <div id="dailyModalSub" class="lvlup-sub"></div>
    <div id="dailyModalDays" class="daily-days"></div>
    <div class="lvlup-rule"></div>
    <div class="lvlup-label" id="dailyModalLabel">Heute</div>
    <ul id="dailyModalRewards" class="lvlup-rewards"></ul>
    <button id="dailyModalBtn" class="btn btn--primary" type="button"><svg class="icon"><use href="#i-shop"/></svg><span>Abholen</span></button>
  </div>
</div>

<!-- ============ REWARD MODAL (boss etc.) ============ -->
<div id="titleModal" class="lvlup" role="dialog" aria-modal="true" aria-labelledby="titleModalTitle" hidden>
  <div class="lvlup-card title-card">
    <div class="lvlup-badge"><svg class="icon" style="width:34px;height:34px;color:var(--gold-100)"><use href="#i-temple"/></svg></div>
    <div class="lvlup-over">Mega-Tempel</div>
    <h2 id="titleModalTitle" class="lvlup-title">Titel</h2>
    <div id="titleModalSub" class="lvlup-sub"></div>
    <div class="lvlup-rule"></div>
    <div id="titleList" class="title-list"></div>
    <button id="titleModalBtn" class="btn btn--primary" type="button"><svg class="icon"><use href="#i-check"/></svg><span>Fertig</span></button>
  </div>
</div>
<div id="rewardModal" class="lvlup" role="dialog" aria-modal="true" aria-labelledby="rewardModalTitle" hidden>
  <div class="lvlup-card">
    <div class="lvlup-badge"><svg class="icon" style="width:34px;height:34px;color:var(--gold-100)"><use href="#i-attack"/></svg></div>
    <div class="lvlup-over">Weltereignis</div>
    <h2 id="rewardModalTitle" class="lvlup-title">Boss besiegt!</h2>
    <div id="rewardModalSub" class="lvlup-sub"></div>
    <div class="lvlup-rule"></div>
    <div class="lvlup-label">Belohnungen</div>
    <ul id="rewardModalRewards" class="lvlup-rewards"></ul>
    <button id="rewardModalBtn" class="btn btn--primary" type="button"><svg class="icon"><use href="#i-check"/></svg><span>Einsammeln</span></button>
  </div>
</div>

<!-- ============ CAPITAL / CITY VIEW ============ -->
<div id="cityView" class="city" hidden>
  <canvas id="cityCanvas" class="city-canvas" aria-label="Hauptstadt"></canvas>
  <div id="cityRing" class="city-ring" hidden></div>
  <header class="city-head">
    <div class="city-title"><div class="overline">Hauptstadt</div><h2 id="cityName">Deine Stadt</h2></div>
    <div id="cityBuilder" class="city-builder"></div>
    <button id="cityCloseBtn" class="btn btn--secondary btn--sm" type="button"><svg class="icon"><use href="#i-back"/></svg><span>Zur Karte</span></button>
  </header>
  <section id="citySheet" class="city-sheet" hidden>
    <div class="city-sheet-head">
      <div id="cityBIcon" class="city-bicon"></div>
      <div class="city-bmeta"><div id="cityBOver" class="overline">Gebäude</div><h3 id="cityBName">Burgfried</h3><div id="cityBLevel" class="city-blevel"></div></div>
      <button id="cityInfoBtn" class="btn-x city-info-btn" type="button" aria-label="Info"><svg class="icon"><use href="#i-info"/></svg></button>
      <button id="citySheetClose" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
    </div>
    <div id="cityTabs" class="seg city-tabs" hidden></div>
    <p id="cityBDesc" class="city-bdesc"></p>
    <div id="cityBNote" class="notice"></div>
    <div id="cityBStats" class="city-bstats"></div>
    <div id="cityBExtra"></div>
    <div class="city-bfoot">
      <button id="cityUpgradeBtn" class="btn btn--primary btn--grow" type="button"><svg class="icon"><use href="#i-upgrade"/></svg><span class="lbl">Aufwerten</span><small id="cityUpTime" class="city-uptime"></small></button>
      <button id="citySpeedBtn" class="btn btn--secondary btn--grow" type="button" style="display:none"><svg class="icon"><use href="#i-gem"/></svg><span class="lbl">Beschleunigen</span></button>
    </div>
  </section>
</div>

<!-- ============ HELDENHALLE: the heroes ============ -->
<section id="heroHall" class="hh" role="dialog" aria-label="Helden" hidden></section>
<section id="lookSheet" class="hh lk" role="dialog" aria-label="Aussehen" hidden>
  <div class="hh-head"><div class="emblem emblem--gold"><svg class="icon"><use href="#i-flag"/></svg></div><div class="phead-text"><div class="overline">Profil</div><h2>Aussehen</h2></div><button class="btn-x" type="button" data-lk-close aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button></div>
  <div id="lkTop" class="lk-top"></div>
  <div id="lkTabs" class="tabs lk-tabs" role="tablist">
    <button class="tab" type="button" role="tab" data-lk-tab="crest"><svg class="icon"><use href="#i-flag"/></svg><span>Wappen</span></button>
    <button class="tab" type="button" role="tab" data-lk-tab="frame"><svg class="icon"><use href="#i-star"/></svg><span>Rahmen</span></button>
    <button class="tab" type="button" role="tab" data-lk-tab="base"><svg class="icon"><use href="#i-castle"/></svg><span>Basis</span></button>
    <button class="tab" type="button" role="tab" data-lk-tab="march"><svg class="icon"><use href="#i-troops"/></svg><span>Marsch</span></button>
  </div>
  <div id="crestPage" class="lk-pane" hidden>
    <div class="crest-ed">
      <canvas id="crestPreview" width="176" height="176" aria-label="Dein Wappen"></canvas>
      <div class="crest-opts" id="crestOpts"></div>
    </div>
    <small class="keep-note">Kostenlos. Dein Wappen weht auf allen deinen Basen, auf deiner Marschfahne und steht in der Rangliste.</small>
  </div>
  <div id="lkPane" class="lk-pane"></div>
</section>

<!-- ============ ISLAND / BASE POPUP ============ -->
<section id="islandPopup" class="panel panel--island" role="dialog" aria-labelledby="popupTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div id="popupEmblem" class="emblem emblem--neutral"><svg class="icon"><use href="#i-defense"/></svg><span id="popupLevel" class="lvl">1</span></div>
    <div class="phead-text">
      <div id="popupOverline" class="overline">Basis</div>
      <h3 id="popupTitle" class="ptitle">Turm</h3>
      <div id="popupSub" class="psub"></div>
    </div>
    <button id="closeBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div class="pbody">
    <div id="popupStats" class="popup-stats"></div>
    <div id="popupAnleitung" class="notice notice--gold" hidden><svg class="icon"><use href="#i-info"/></svg><span>Hier stehen deine Truppen. Mit ihnen greifst du an und sammelst.</span></div>
    <div id="popupBund"></div>
    <div id="popupActions" class="actgrid">
      <button id="teleportBtn" class="act act--city" type="button" style="display:none"><span class="act-ic act-ic--city"><svg class="icon"><use href="#i-send"/></svg></span><span class="act-t">Hauptstadt verlegen</span><span class="act-s">in einen eigenen Turm · <svg class="icon icon--gem"><use href="#i-gem"/></svg>50</span></button>
      <button id="titleBtn" class="act act--city" type="button" style="display:none"><span class="act-ic act-ic--city"><svg class="icon"><use href="#i-temple"/></svg></span><span class="act-t">Titel</span><span class="act-s">Buffs und Strafen vergeben</span></button>
      <button id="cityBtn" class="act act--city" type="button" style="display:none"><span class="act-ic act-ic--city"><svg class="icon"><use href="#i-castle"/></svg></span><span class="act-t">Stadt betreten</span><span class="act-s">Hauptstadt ausbauen</span></button>
      <button id="upgradeBtn" class="act act--primary" type="button"><span class="act-ic"><svg class="icon"><use href="#i-upgrade"/></svg></span><span class="act-t">Aufwerten</span><span class="act-s" id="upgradeCostLabel">–</span></button>
      <button id="sendBtn" class="act" type="button"><span class="act-ic act-ic--send"><svg class="icon"><use href="#i-send"/></svg></span><span class="act-t">Senden</span><span class="act-s">Verstärken</span></button>
      <button id="multiAttackBtn" class="act" type="button"><span class="act-ic act-ic--attack"><svg class="icon"><use href="#i-multiattack"/></svg></span><span class="act-t">Mehrfach</span><span class="act-s"><svg class="icon icon--gem"><use href="#i-gem"/></svg><b data-const="MULTI_ATTACK_GEM_COST">1</b></span></button>
      <button id="recallBtn" class="act" type="button"><span class="act-ic act-ic--recall"><svg class="icon"><use href="#i-recall"/></svg></span><span class="act-t">Sammeln</span><span class="act-s"><svg class="icon icon--gem"><use href="#i-gem"/></svg><b data-const="RECALL_GEM_COST">1</b></span></button>
    </div>
  </div>
  <footer class="pfoot">
    <button id="backBtn" class="btn btn--secondary" type="button"><svg class="icon"><use href="#i-back"/></svg><span>Zurück</span></button>
    <button id="scoutBtn" class="btn btn--secondary btn--grow" type="button"><svg class="icon"><use href="#i-scout"/></svg><span class="lbl">Spähen</span></button>
    <button id="attackBtn" class="btn btn--danger btn--grow" type="button"><svg class="icon"><use href="#i-attack"/></svg><span class="lbl">Angreifen</span></button>
  </footer>
</section>

    <!-- 3D-Basen (three.js + baukunst.js): lädt spiel.js erst nach dem ersten Bild der Karte (dreiDLaden) – sie bremsen den Start nicht -->
    <div id="spaeterLaden" hidden data-three="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js" data-sri="sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O" data-baukunst="<?= skript('baukunst') ?>"></div>
    <script src="<?= skript('bots') ?>"></script>
    <script src="<?= skript('welt') ?>"></script>
    <script src="<?= skript('spiel') ?>"></script>
    <script src="<?= skript('aufbau') ?>"></script>
    <script src="<?= skript('buendnis') ?>"></script>
    <script src="<?= skript('haendler') ?>"></script>
    <script src="<?= skript('benachrichtigung') ?>"></script>
</body>
</html>
