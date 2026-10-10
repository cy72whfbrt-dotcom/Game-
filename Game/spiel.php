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
    <link rel="preload" href="bilder/titel_hoch.jpg" as="image" media="(orientation: portrait)">
    <link rel="preload" href="bilder/titel_quer.jpg" as="image" media="(orientation: landscape)">
    <link rel="preload" href="schrift/cinzel.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="schrift/inter.woff2" as="font" type="font/woff2" crossorigin>
    <link href="schrift/schrift.css" rel="stylesheet">
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
/* der EINE Streifen unter der Werte-Zeile: alle Dauer-Hinweise (Wochen-Event, Kopfgeld, Thron, Händler, Saison), einzeilig –
   der dringendste sichtbar, der Rest als Zähler „+2“ (antippen klappt alle auf) */
.midbar{position:fixed;z-index:var(--z-hud);top:calc(var(--safe-t) + 14px + var(--hud-h));left:calc(var(--safe-l) + 70px);right:calc(var(--safe-r) + 64px);
  display:flex;align-items:flex-start;gap:var(--ab-1);pointer-events:none}   /* (rechts frei: das Schild „Rohstoffe“ unter dem Würfel) */
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
.mb-chip.is-warn{border-color:rgba(225,72,60,.6);background:linear-gradient(90deg,rgba(150,30,30,.75),rgba(20,12,12,.88));color:#ffd9d3} .mb-chip.is-warn > .icon:first-child{color:#ffb3aa}
.mb-chip > span{overflow:hidden;text-overflow:ellipsis}
.mb-chip .mb-hol{position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;background:#e5372c;border:1.5px solid #fff;box-shadow:0 0 4px rgba(229,55,44,.8)}   /* Event-Chip: im Event liegt eine Belohnung */
.mb-chip .mb-platz{flex:none;min-width:6.3ch;text-align:right} .mb-chip .mb-platz.is-leer{visibility:hidden}   /* Wochen-Event: feste Breite, auch ohne Rang */
@media (max-width:899px) and (min-height:501px){ .mb-chip.is-tour{flex:1 1 auto} .mb-chip .mb-platz.is-leer{display:none} }   /* Handy: der Chip füllt die Leiste – der Name bleibt ganz, der Rang kommt ohne Sprung */
.mb-chip::before{content:"";position:absolute;left:0;right:0;top:50%;height:var(--k-tipp);transform:translateY(-50%)}   /* Tippfläche 44 px */
.res{position:relative;flex:1 1 auto;min-width:0;height:100%;display:flex;align-items:center;justify-content:center;gap:var(--ab-1);padding:0 var(--ab-1)}
.res > .icon{width:16px;height:16px}
.res b{font:600 var(--fs-13)/1 var(--font-ui);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.res--coin > .icon{color:var(--res-coin)} .res--gem > .icon{color:var(--res-gem)} .res--troop > .icon{color:var(--res-troop)}
/* phone portrait: the dock already has Shop - the "+" would only squeeze the gem value into an ellipsis */
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){ .hud-werte,.nav,.mapctl,.toast,.mabar{background:var(--glass-strong)} }

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
  padding:0 calc(var(--safe-r) + 6px) var(--safe-bd) calc(var(--safe-l) + 6px);display:grid;grid-template-columns:repeat(6,1fr);
  background:linear-gradient(180deg,rgb(18,21,28),rgb(8,10,13));border-top:1px solid var(--line-2);box-shadow:0 -12px 30px rgba(0,0,0,.45)}
.nav::before{content:"";position:absolute;left:18%;right:18%;top:-1px;height:1px;background:linear-gradient(90deg,transparent,var(--gold-200),transparent)}
/* Leiste: 6 runde Knöpfe mit festen Plätzen (Karte/Stadt · Bündnis · Kampf · Events · Rucksack · Shop); das Profil öffnet das Spielerbild im HUD */
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
.mapctl button{width:44px;height:44px;display:grid;place-items:center;color:var(--tx-2)}
.mapctl button + button{border-top-color:rgba(255,255,255,.05)}
.mapctl button.on{color:var(--gold-100);background:rgba(214,170,90,.18)}
[data-frame="bronze"]{--fr1:#c9854f;--fr2:#7a4a26} [data-frame="silver"]{--fr1:#e8eef5;--fr2:#8a95a3} [data-frame="gold"]{--fr1:#ffd35a;--fr2:#a0701c}
[data-frame="platin"]{--fr1:#9fe3da;--fr2:#3f8c86} [data-frame="diamond"]{--fr1:#bfe6ff;--fr2:#3f86d8} [data-frame="master"]{--fr1:#d6a6ff;--fr2:#6a3fa0} [data-frame="legend"]{--fr1:#ffb04a;--fr2:#c0392b} [data-frame="saison"]{--fr1:#8ff5e6;--fr2:#5b3fc4}
[data-frame="conq"]{--fr1:#ff9a6a;--fr2:#8a2f1c} [data-frame="warlord"]{--fr1:#e0504a;--fr2:#3a0f12} [data-frame="wall"]{--fr1:#b8c4d4;--fr2:#4a5868} [data-frame="emma"]{--fr1:#b07ad8;--fr2:#24122e}
[data-frame="slayer"]{--fr1:#a6e05a;--fr2:#2f5a1c} [data-frame="builder"]{--fr1:#e2b27a;--fr2:#6a4422} [data-frame="king"]{--fr1:#ffd05a;--fr2:#a3161c}
[data-frame="sz1"]{--fr1:#fff0a8;--fr2:#d4202a} [data-frame="sz2"]{--fr1:#f2f6ff;--fr2:#2a5ad8} [data-frame="sz4"]{--fr1:#7ef0c8;--fr2:#1c6a8a} [data-frame="sz6"]{--fr1:#f0c87a;--fr2:#3a6a9a}
[data-frame="mgut"]{--fr1:#ffd05a;--fr2:#c08a1c} [data-frame="mstraf"]{--fr1:#ff5a4a;--fr2:#7a1010}   /* Rahmen aus der Mitte (Alexander 6.10.): wie die Ringe – Gold, Rot, Herrscher Blutrot-Gold */
#pAvatarRing[data-frame]{background:conic-gradient(from 200deg,var(--fr1),var(--fr2),var(--fr1),var(--fr2),var(--fr1));padding:3px;box-shadow:0 0 10px color-mix(in srgb,var(--fr1) 45%,transparent)}
#pAvatarRing[data-frame^="sz"],#pAvatarRing[data-frame="king"],#pAvatarRing[data-frame="mgut"],#pAvatarRing[data-frame="mstraf"],#pAvatarRing[data-frame="saison"],#pAvatarRing[data-frame="legend"],#pAvatarRing[data-frame="master"],#pAvatarRing[data-frame="diamond"]{animation:frame-glow 2.4s ease-in-out infinite alternate}
@keyframes frame-glow{from{box-shadow:0 0 6px color-mix(in srgb,var(--fr1) 35%,transparent)}to{box-shadow:0 0 16px color-mix(in srgb,var(--fr1) 75%,transparent)}}
.ptitle-tag{margin-top:4px;font:700 10px/1.2 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--gold-200)}
.troop-in{width:9.5em;max-width:46vw;height:30px;padding:0 8px;border:1px solid var(--line-2);border-radius:var(--r-xs);background:#12151b;color:var(--tx-1);font:700 var(--fs-13)/1 var(--font-ui);text-align:right;font-variant-numeric:tabular-nums}
.troop-in.is-bad{border-color:#e0685c;box-shadow:0 0 0 2px rgba(224,104,92,.25)} @media (pointer:coarse){ .troop-in{height:36px} }
.troop-in:focus{outline:none;border-color:var(--gold-300);box-shadow:0 0 0 2px rgba(214,170,90,.25)}
.pfoot[hidden]{display:none} #profileTabs.tabs{grid-template-columns:repeat(5,minmax(min-content,1fr))} #shopTabs.tabs{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr)}
.pill--throne .icon{color:#f2c75c} .psub .pill + .pill{margin-left:6px}
.throne-status{display:grid;gap:6px;padding:10px 12px;border:1px solid var(--line-2);border-radius:10px;
  background:radial-gradient(120% 90% at 50% 0%,rgba(242,199,92,.10),transparent 60%),rgba(255,255,255,.02)}
.throne-status .ts-row{display:flex;align-items:center;gap:8px;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-3)}
.throne-status .ts-row .icon{width:15px;height:15px;color:#f2c75c;flex:none}
.throne-status .ts-row b{margin-left:auto;color:var(--tx-1);font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
.throne-status .ts-row b.warn{color:#ff9d8f}
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
/* Pass-Leiste (7.10.): waagrecht wischen, je Stufe eine Spalte (oben Premium, Mitte Stufe, unten Frei), Belohnungs-Kacheln wie überall */
.pl{--plz:86px;position:relative;display:flex;gap:4px;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;padding:2px 2px 10px;scrollbar-width:thin}
.pl-namen{position:sticky;left:0;z-index:3;flex:none;width:20px;display:grid;grid-template-rows:var(--plz) 30px var(--plz);gap:6px;background:linear-gradient(90deg,#11141b 75%,transparent)}
.pl-namen span{writing-mode:vertical-rl;transform:rotate(180deg);display:flex;align-items:center;justify-content:flex-end;padding-bottom:4px;gap:4px;font:700 var(--fs-11)/1 var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--tx-3)}
.pl-namen span.is-p{color:#8ff5e6} .pl-namen .icon{width:11px;height:11px;transform:rotate(90deg)}
.pl-spalte{position:relative;flex:none;width:70px;display:grid;grid-template-rows:var(--plz) 30px var(--plz);gap:6px}
.pl-spalte::before{content:"";position:absolute;left:-4px;right:0;top:calc(var(--plz) + 19px);height:4px;background:rgba(255,255,255,.08);z-index:0}
.pl-spalte.is-on::before{background:linear-gradient(90deg,var(--gold-500),var(--gold-300))}
.pl-knoten{align-self:center;justify-self:center;position:relative;z-index:1;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font:800 var(--fs-12)/1 var(--font-ui);color:var(--tx-3);background:#1c1f27;border:2px solid var(--line-2);font-variant-numeric:tabular-nums}
.pl-spalte.is-on .pl-knoten{color:#2a1c08;border-color:#f2d27a;background:radial-gradient(circle at 35% 30%,#fff2c4,#d9a93f 60%,#8a6420)}
.pl-spalte.is-next .pl-knoten{border-color:var(--gold-300);color:var(--gold-100);box-shadow:0 0 0 3px rgba(242,210,122,.18)}
.pl-spalte.is-viertel .pl-knoten{width:34px;height:34px;border-width:3px}
.pl-zelle{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 4px;border:1px solid var(--line-1);border-radius:10px;background:rgba(255,255,255,.03);color:inherit;--bk:54px;cursor:default}
.pl-zelle.is-zwei{--bk:36px}
.pl-zelle.is-p{background:linear-gradient(180deg,rgba(91,63,196,.16),rgba(31,138,138,.08))}
.pl-zelle.is-lock{opacity:.6} .pl-zelle.is-closed{opacity:.5} .pl-zelle.is-got{opacity:.5}
.pl-zelle.is-ready{cursor:pointer;animation:pass-glow 1.6s ease-in-out infinite alternate}
@keyframes pass-glow{from{filter:drop-shadow(0 0 2px rgba(242,210,122,.25))}to{filter:drop-shadow(0 0 7px rgba(242,210,122,.6))}}
.pl-ok{position:absolute;top:5px;right:5px;z-index:2;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;background:#8fcf7a;color:#10200c} .pl-ok .icon{width:10px;height:10px}
.pl-ok.is-lock{background:rgba(0,0,0,.55);color:var(--tx-3)}
@media (max-width:899px) and (min-height:501px){   /* Handy: Pass enger, damit die Premium-Reihe ganz im Fenster steht (Spieltest 7.10.) */
  .pass-hero{padding:8px 10px;gap:5px} .pass-lvl{width:42px;height:42px} .pass-lvl b{font-size:17px}
  .pl{padding-bottom:4px} .pl-spalte,.pl-namen{gap:3px} .pl-spalte::before{top:calc(var(--plz) + 16px)} .pass-prem{padding:8px}
  #goalsPopup.panel--sheet:has([data-gpane="pass"]:not([hidden])){--sheet-max:calc(100dvh - var(--safe-t) - var(--hud-top-space) - var(--dock-h) - var(--safe-bd))} }   /* Pass: bis unter das HUD (wie der Shop) – kurze Handys (Foto 8.10.: Premium-Reihe halb weg) */
@media (max-width:899px) and (min-height:501px) and (max-height:700px){   /* ganz kurze Handys (SE): Pass-Kacheln kleiner, die Premium-Reihe bleibt ganz im Fenster */
  .pl{--plz:56px} .pl-zelle{--bk:34px;padding:3px} .pl-zelle.is-zwei{--bk:22px} #goalsPopup .pbody:has(#passPane){gap:6px;padding-top:8px}
  .pass-hero{padding:6px 10px} .pass-prem{padding:6px 8px;gap:8px} .pass-prem > .icon{display:none} }   /* 360×640: ohne Krone hat der Text Platz (Foto 8.10.) */
.pass-how-l{display:grid;gap:2px;margin-top:8px;padding:4px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.18)}
.pass-how-l div{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line-1);font:500 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-2)} .pass-how-l div:last-child{border-bottom:0}
.pass-how-l .icon{width:14px;height:14px;color:var(--gold-300);flex:none} .pass-how-l b{margin-left:auto;color:var(--gold-100);font-variant-numeric:tabular-nums}
.rp-pass{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--r-sm);border:1px solid var(--line-2);background:rgba(0,0,0,.2);font:500 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-2)}
.rp-pass .icon{width:15px;height:15px;color:var(--gold-300)} .rp-pass b{color:var(--gold-100)} .rp-pass em{margin-left:auto;font:700 var(--fs-11)/1 var(--font-ui);font-style:normal;padding:3px 8px;border-radius:var(--r-pill);border:1px solid rgba(143,245,230,.5);color:#bff8ef;background:rgba(31,138,138,.25)}
.rp-pass.is-prem{border-color:rgba(143,245,230,.3)} .rp-pass.is-prem .icon{color:#8ff5e6}
#goalsSub .pill .icon{color:var(--gold-300)} #goalsSub > .pill{flex:none}   /* „0 / 6 heute“ nie gekürzt (360 px) */
@media (max-width:380px){ #goalsSub{gap:4px} #goalsSub > .pill{padding:0 5px} #goalsSub > .pill + .pill{margin-left:0} }
.marker-sheet{position:fixed;z-index:45;left:50%;bottom:calc(var(--dock-h) + var(--safe-bd) + 14px);transform:translateX(-50%);width:min(360px,calc(100vw - 24px));padding:12px;border-radius:12px;
  background:var(--glass-strong,#141820);border:1px solid var(--line-3);box-shadow:var(--sh-2);font-family:var(--font-ui);display:flex;flex-direction:column;gap:8px}
.marker-sheet[hidden]{display:none}
.field-lines{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-3)} .field-lines b{color:var(--tx-1);text-align:right} .field-fort{grid-column:1/-1;display:grid;gap:3px} .field-fort small{text-align:right;font-variant-numeric:tabular-nums}
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
.ev-card.is-tour{border-color:rgba(176,120,255,.4);background:rgba(160,92,235,.08)} .ev-card.is-warn{border-color:rgba(225,72,60,.55);background:rgba(150,30,30,.12)}
.ev-card .barb-ct{flex-wrap:wrap;row-gap:2px} .ev-card .barb-ct > b{white-space:nowrap} .ev-card .barb-ct small{margin-left:auto;text-align:right} .ev-card .barb-ct small b{font-variant-numeric:tabular-nums;color:var(--tx-1)} .ev-rot{color:#ff8a7a} .ev-prizes3{grid-template-columns:repeat(3,minmax(0,1fr))}
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
/* Tutorial (10c2): dunkel mit Loch – vier Teile um das Loch fangen die Tipps, das Loch selbst lässt sie zum echten Element durch */
.tut{position:fixed;inset:0;z-index:59;pointer-events:none}   /* über Fenstern, Stadt und Heldenhalle (≤ 58), unter Belohnungs-Fenstern (60+) und dem Hinweis */
.tut[hidden]{display:none}
.tut-d{position:absolute;background:rgba(5,8,15,.7);pointer-events:auto}
.tut.is-frei .tut-d{background:none}   /* warten (Marsch, Bau): man sieht alles, tippen geht trotzdem nicht */
.tut-loch{position:absolute;border-radius:14px;pointer-events:none;box-shadow:0 0 0 3px rgba(242,214,138,.75),0 0 18px 6px rgba(242,214,138,.4);animation:tut-glanz 1.6s ease-in-out infinite}
.tut-sperre{position:absolute;pointer-events:auto}
@keyframes tut-glanz{50%{box-shadow:0 0 0 3px rgba(242,214,138,1),0 0 26px 10px rgba(242,214,138,.55)}}
/* Finger: Platzhalter, bis das KI-Bild einstieg_finger.webp kommt (zeigt nach oben aufs Loch) */
.tut-finger{position:absolute;width:54px;height:54px;pointer-events:none;animation:tut-tipp 1s ease-in-out infinite}
.tut-finger::before{content:"";position:absolute;left:18px;top:0;width:18px;height:34px;border-radius:9px 9px 4px 4px;background:linear-gradient(90deg,#f2d68a,#c99a3e);border:2px solid #5a3d0e}
.tut-finger::after{content:"";position:absolute;left:8px;top:26px;width:38px;height:26px;border-radius:10px 10px 14px 14px;background:linear-gradient(90deg,#f2d68a,#c99a3e);border:2px solid #5a3d0e}
.tut-finger.oben{transform:rotate(180deg);animation-name:tut-tipp2}
@keyframes tut-tipp{50%{translate:0 8px}} @keyframes tut-tipp2{50%{translate:0 -8px}}
/* Berater mit Sprechblase: Platzhalter-Kopf, bis einstieg_berater.webp kommt; nie über dem Loch (.oben) */
.tut-berater{position:absolute;left:calc(var(--safe-l,0px) + 8px);right:calc(var(--safe-r,0px) + 8px);bottom:calc(var(--dock-h,64px) + var(--safe-bd,0px) + 16px);max-width:440px;
  display:flex;align-items:flex-end;gap:6px;pointer-events:none}
.tut-berater.oben{bottom:auto;top:calc(var(--safe-t,0px) + var(--hud-top-space,64px) + 8px)}
.tut-figur{flex:none;width:64px;height:80px;border-radius:32px 32px 10px 10px;border:2px solid var(--gold-300);background:url(bilder/held_aldric_kopf.webp) center/cover,linear-gradient(#24365c,#0f1a2e)}
.tut-blase{flex:1;min-width:0;margin-bottom:18px;padding:9px 12px;border-radius:12px 12px 12px 2px;background:#f3e6c4;color:#24170a;box-shadow:0 3px 10px #000a;display:flex;flex-direction:column;gap:8px;pointer-events:auto}
.tut-blase p{margin:0;font:600 15px/1.3 Georgia,serif}
.tut-blase > .btn,.tut-frage{align-self:flex-end}
.tut-frage{display:flex;gap:8px} .tut-frage[hidden]{display:none}
.tut-weg{position:absolute;top:calc(var(--safe-t,0px) + var(--hud-top-space,64px) - 6px);right:calc(var(--safe-r,0px) + 8px);min-height:32px;padding:0 10px;border-radius:8px;
  border:1px solid var(--line-2);background:rgba(0,0,0,.6);color:var(--tx-2);font:600 12px var(--font-ui);pointer-events:auto}
.tut-weg[hidden]{display:none}
.tut-berater.oben ~ .tut-weg{top:auto;bottom:calc(var(--dock-h,64px) + var(--safe-bd,0px) + 16px)}   /* Berater oben: „Überspringen“ unten */
/* „Neu: …“ – Platzhalter, bis banner_neu.webp kommt */
.tut-banner{position:fixed;left:50%;top:calc(var(--safe-t,0px) + 96px);z-index:81;display:flex;align-items:center;gap:8px;padding:10px 26px;border-radius:6px;transform:translateX(-50%);
  background:linear-gradient(#e9c46d,#b8862c);color:#2a1a05;font:800 17px var(--font-display);white-space:nowrap;box-shadow:0 4px 18px #000c;pointer-events:none}
.tut-banner[hidden]{display:none} .tut-banner.an{animation:tut-banner 2.6s ease forwards}
@keyframes tut-banner{0%{opacity:0;transform:translateX(-50%) scale(.6)}12%{opacity:1;transform:translateX(-50%) scale(1.08)}20%,80%{opacity:1;transform:translateX(-50%) scale(1)}100%{opacity:0}}
/* Was ein neuer Spieler noch nicht hat, ist ganz weg (10c2 tutFrei: body.tz-<teil>) */
body.tz-stadt #cityNavBtn,body.tz-roh #hudRoh,body.tz-kampf #battleLogBtn,body.tz-events #goalsBtn,body.tz-truppen #hud .res--troop,body.tz-shop #shopBtn,
body.tz-profil #profileBtn,body.tz-rucksack #rucksackBtn,body.tz-aufgaben #goalsGruppen [data-ggrp="aufgaben"],body.tz-karte :is(#markerBtn,#armyBtn),
body.tz-gems #hud .res--gem,body.tz-shopmehr #shopTabs [data-stab]:not([data-stab="gems"]),body.tz-bund #bundBtn,body.tz-rang #tabBtnRank,
body.tz-events2 :is(#goalsGruppen [data-ggrp="pass"],#goalsGruppen [data-ggrp="ereignisse"],#goalsTabs [data-gtab="ach"],#midBar),
body.tz-welt :is(#teleportBtn,#titleBtn,#feldRing [data-fring="tp"]){display:none!important}
/* in der Stadt (Handy): der Hinweis erst unter der Bauarbeiter-Zeile – nie über ihren Knöpfen (--stadt-kopf: Unterkante, 08d stadtKopf) */
@media (max-width:899px),(max-height:500px){ body.in-stadt:not(.has-sheet) .toast{top:calc(var(--stadt-kopf,96px) + 10px)} }
@keyframes toast-in{from{opacity:0;translate:0 -6px}}
/* Feste Fußknöpfe (Burg/Gebäude „Bauen“, Held „Aufwerten“): bis an die Unterkante des Fensters – unter ihnen schaut kein Inhalt mehr
   hervor (sticky zählt ab dem Innenabstand); ein Schatten oben zeigt, dass darüber noch mehr kommt */
body.in-stadt #citySheet > .city-bfoot{bottom:-14px;box-shadow:0 -10px 14px -8px rgba(0,0,0,.6)}
#heroHall .hh-actions{bottom:calc(-16px - var(--safe-b));padding-bottom:calc(10px + var(--safe-b));background:linear-gradient(0deg,#07080b 70%,transparent)}
/* Desktop: das Gebäude-Fenster endet über der Leiste unten in der Mitte (sonst liegt der Bauen-Knopf darunter) */
@media (min-width:900px) and (min-height:501px){
  body.in-stadt #citySheet.city-sheet{bottom:104px;max-height:calc(100% - 104px - 84px);border-bottom:1px solid var(--line-2);border-radius:var(--r-lg)}
}
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
  body:has(#citySheet:not([hidden])) .toast.toast.toast{top:calc(var(--stadt-kopf,96px) + 6px);bottom:auto;z-index:calc(var(--z-sheet) + 1)}   /* oben über dem Fenster-Kopf, nie über Text oder Fußzeile (.toast dreifach: geht vor die allgemeine Fenster-Regel in 02) */
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
.ptitle:not(.ptitle--input){white-space:normal;overflow-wrap:break-word}   /* langer Titel („Hauptstadt von Yusuf_T“) bricht in die 2. Zeile statt „…“ */
.panel:has(#attackBtn.mit-zeit) .ptitle{white-space:nowrap}   /* Angriff vorbereiten: kompakt, eine Zeile (Handy ≤ 55 % hoch) */
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
.panel--island.ist-heiligtum{max-height:min(74dvh,calc(100dvh - var(--dock-h) - var(--safe-bd) - var(--safe-t) - var(--hud-top-space)))}   /* Thron/Tempel: der Erklär-Text ganz zu sehen */
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
.btn--sm::before{content:"";position:absolute;left:0;right:0;top:50%;height:var(--k-tipp);transform:translateY(-50%)}   /* Tippfläche 44 px (sichtbar 28/36) */
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
.cost--pt .icon{color:#5b3310}
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

.rar-text{color:color-mix(in srgb,var(--rc) 70%,#fff)}

/* =====================================================================
   STAT TILES / NOTICE / VERSUS / KV
   ===================================================================== */
.popup-stats{display:flex;flex-direction:column;gap:10px}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
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
.logRow .lt b{display:block;font:600 var(--fs-13)/1.25 var(--font-ui);color:var(--tx-1);overflow-wrap:break-word}   /* Abzeichen + Ort: lieber 2 Zeilen als „Hauptstadt von Yusu…“ */
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
.city-sheet::before{content:none}   /* Gebäude-Fenster: der Rahmen ist der eigene Rand – er scrollt nicht mit dem Inhalt (die Ecken bleiben in den Ecken) */
#citySheet{border-image:var(--frame) 20 / 20px stretch}   /* (#: das „border“ der Grundform weiter hinten setzt border-image sonst zurück) */
.panel--sheet{height:var(--sheet-max)}
body.in-stadt .hud,body.in-stadt .nav{z-index:52} body.in-stadt .panel{z-index:53}
body.in-stadt .city-head{padding-top:calc(var(--safe-t) + var(--hud-top-space) + 6px);background:linear-gradient(180deg,rgba(6,8,12,.75),rgba(6,8,12,.3) 70%,transparent)}
body.in-stadt .city-title,body.in-stadt #cityCloseBtn{display:none}
body.in-stadt .city-sheet{bottom:calc(var(--dock-h) + var(--safe-bd));padding-bottom:14px;max-height:calc(100% - var(--dock-h) - var(--safe-bd) - var(--safe-t) - var(--hud-top-space) - 60px)}
@media (min-width:900px) and (min-height:501px){ body.in-stadt .city-sheet{bottom:100px;max-height:calc(100% - 100px - var(--safe-t) - var(--hud-top-space) - 60px)} }   /* Desktop: die Leiste schwebt (bis ~92 px hoch) – das Fenster steht darüber */
.city-bdesc{display:none} .city-sheet.zeig-info .city-bdesc{display:block}
.city-info-btn.on{color:var(--gold-100);border-color:var(--line-3)}
.hh-pairs{padding:8px 0 4px;border-top:1px solid var(--line-2)} .hh-pairs h3{margin:6px 0;font:700 var(--fs-11)/1 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3)}
.hh-pair{display:flex;gap:10px;align-items:center;padding:8px;margin-top:6px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:#0005} .hh-pair.is-on{border-color:var(--gold-300);background:rgba(228,200,134,.08)}
.hh-pair-pics{display:flex;flex:none} .hh-pair-pics button{padding:0;border:0;background:none;cursor:pointer} .hh-pair-pics .hero-pic{display:block;width:44px;height:44px;border-radius:8px;border:1px solid var(--line-2)} .hh-pair-pics button+button{margin-left:-8px}
.hh-pair-pics button.is-locked .hero-pic{filter:grayscale(1) brightness(.5)}
.hh-pair-t{display:grid;gap:2px;min-width:0} .hh-pair-t b{font:700 var(--fs-13)/1.2 var(--font-ui);color:var(--gold-100)} .hh-pair-t small{font-size:11px;color:var(--tx-3)} .hh-pair-t em{font-style:italic;font-size:12px;color:var(--tx-2)}
.hh-story{margin:0;font-style:italic;font-size:var(--fs-13);line-height:1.45;color:var(--tx-2)}
.seg.hero-seg2{margin-top:6px} .hero-seg2-l{flex:1 1 100%;font-size:11px;color:var(--tx-3);padding:2px 2px 4px} .seg.hero-seg button.is-pair{box-shadow:inset 0 0 0 1px var(--gold-300)} .seg.hero-seg button.is-pair small{color:var(--gold-100)}
/* Mauer: Verteidigungs-Helden – Haupt- und Zweitheld als zwei Chips (wie im Angriffs-Fenster), die Auswahl klappt darunter auf */
.vh-box{padding:10px;border:1px solid var(--line-1);border-radius:10px;background:rgba(0,0,0,.18);display:flex;flex-direction:column;gap:6px} .vh-kopf{display:flex;align-items:center;gap:6px} .vh-kopf .icon{width:16px;height:16px}
.vh-stand{display:block;color:var(--tx-2)} .vh-zeile{display:flex;gap:6px}
.vh-chip{position:relative;flex:1 1 0;min-width:0;display:flex;align-items:center;gap:6px;min-height:var(--k-tipp,44px);padding:0 24px 0 8px;border-radius:var(--r-xs);background:var(--ink-3);border:1px solid var(--line-1);border-left:3px solid var(--hc,var(--line-1));color:var(--tx-1);text-align:left}
.vh-chip::after{content:"";position:absolute;right:10px;top:50%;width:6px;height:6px;margin-top:-5px;border-right:1.5px solid var(--tx-3);border-bottom:1.5px solid var(--tx-3);transform:rotate(45deg)}
.vh-chip.on{background:rgba(214,170,90,.12);border-color:var(--line-3);border-left-color:var(--hc,var(--line-3))} .vh-chip.on::after{margin-top:-1px;transform:rotate(-135deg)}
.vh-chip:disabled{opacity:.55} .vh-chip:disabled::after{display:none}
.vh-chip .hero-pic{width:26px;height:26px;flex:none;border-radius:5px;border:1px solid var(--hc)}
.vh-chip-t{display:flex;flex-direction:column;min-width:0} .vh-chip-t b{font:600 var(--fs-13)/1.15 var(--font-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vh-chip-t small{font:500 var(--fs-11)/1.2 var(--font-ui);color:var(--gold-200);white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .vh-chip-t small .icon{width:10px;height:10px;vertical-align:-1px}
.seg.hero-seg.vh-wahl{gap:6px;margin:0} .seg.hero-seg.vh-wahl button{flex:1 1 calc(50% - 6px);min-width:0;justify-content:flex-start;white-space:nowrap;overflow:hidden}   /* zwei je Zeile: nichts ragt rechts hinaus */
.vh-werte .logLine{gap:8px}
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
.hh-qstars i{width:14px;height:14px;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);background:conic-gradient(from 0deg at 50% 55%,var(--gold-200) 0 var(--f),#ffffff26 var(--f) 100%)}   /* Viertelstern als Tortenstück vom Kern aus, nicht als Streifen am Rand */
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
.is-armed:is(.hh-reset,.lk-card,[data-hchest],#citySpeedBtn){border-color:#f2a066;box-shadow:0 0 0 1px #f2a066 inset;background-color:rgba(222,115,56,.16)}
.is-armed:is(.lk-card) small{color:#f3e6c4}
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
.keep-h{margin:12px 0 6px;font:700 var(--fs-12)/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-2)}
.keep-note{display:block;margin-top:6px;color:var(--tx-2)}
.skin-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
.skin-card{display:grid;justify-items:center;gap:2px;padding:6px 4px 8px;border:1px solid var(--line-2);border-radius:8px;background:rgba(255,255,255,.03);color:var(--tx-1);cursor:pointer} .skin-card.on{border-color:var(--gold-300);box-shadow:0 0 0 1px var(--gold-300)}
.skin-card canvas{width:60px;height:66px} .skin-card small{display:inline-flex;align-items:center;gap:3px;color:var(--tx-2)} .skin-card .icon{width:12px;height:12px}
.lk-top{display:flex;align-items:center;gap:12px;padding:12px 2px 10px} .lk-me{width:58px;height:58px;flex:none;border-radius:50%;padding:6px;background:conic-gradient(from 200deg,var(--fr1),var(--fr2),var(--fr1),var(--fr2),var(--fr1))}
.lk-me img{display:block;width:100%;height:100%;border-radius:50%;background:#141a24;padding:3px} .lk-me-t{flex:1;min-width:0;display:grid;gap:3px} .lk-me-t b{font:700 var(--fs-14)/1.2 var(--font-ui);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lk-me-t small{font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--gold-100)} .lk-pay{display:flex;flex-direction:column;align-items:flex-end;gap:4px} .lk-pay .pill b{font-variant-numeric:tabular-nums}
#lkTabs.tabs{grid-template-columns:repeat(2,minmax(0,1fr))} .lk-tabs{position:sticky;top:calc(-8px - var(--safe-t));z-index:3;background:#0e0e11;border:1px solid var(--line-1);border-radius:8px 8px 0 0} .lk-pane{padding:12px 2px 8px} .lk-pane[hidden]{display:none}
.lk-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}
.lk-card{align-content:start;min-height:100px} .lk-card.is-shop{background:rgba(0,0,0,.28);border-style:dashed} .lk-card b{font:600 var(--fs-12)/1.2 var(--font-ui);text-align:center}
.lk-card.on small{color:var(--gold-100)} .lk-cost{display:inline-flex;align-items:center;gap:3px;font-weight:700;color:var(--gold-100);font-variant-numeric:tabular-nums} .lk-cost.is-bad{color:#e0685c}
.lk-frame{width:48px;height:48px;margin:4px 0 2px;border-radius:50%;padding:5px;background:conic-gradient(from 200deg,var(--fr1),var(--fr2),var(--fr1),var(--fr2),var(--fr1))} .lk-frame img{display:block;width:100%;height:100%;border-radius:50%;background:#141a24;padding:3px}
.lk-mid{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line-2);border-radius:10px;background:rgba(0,0,0,.22)} .lk-mid > .icon{width:22px;height:22px;flex:none;color:var(--tx-3)} .lk-mid > span:not(.frame-ring){display:grid;gap:2px} .lk-mid > .frame-ring{flex:none} .lk-mid small{color:var(--tx-2)}
.lk-mid.is-good{border-color:#ffd05a} .lk-mid.is-good > .icon{color:#ffd05a} .lk-mid.is-bad{border-color:#e13030} .lk-mid.is-bad > .icon{color:#e13030} .lk-mid.is-ruler{border-color:#eb3c32;box-shadow:inset 0 0 0 1px rgba(255,208,90,.5)} .lk-mid.is-ruler > .icon{color:#ffd05a}
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
/* Desktop: Kampfdetails als Fenster wie die anderen (Rahmen ui_rahmen, oben unter dem HUD wie die Seitenfenster, endet im Bild) – der Inhalt rollt im Fenster */
@media (min-width:760px){
  .kl-seite{background:rgba(5,6,8,.62);padding:0;overflow:hidden}
  .kl-seite > .kl-fenster{position:absolute;top:72px;left:50%;transform:translateX(-50%);width:min(600px,calc(100vw - 32px));max-height:calc(100dvh - 86px);display:flex;flex-direction:column;
    padding:14px 18px 16px;border:0;border-style:solid;border-image:url(bilder/ui_rahmen.webp) 44 / 16px stretch;background:var(--noise),var(--panel-bg);box-shadow:0 18px 50px #000c}
  .kl-seite > .kl-fenster > #klInhalt{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding-right:2px}
}
.kl-leer{width:48px;height:48px;flex:0 0 48px;display:grid;place-items:center;border-radius:8px;border:1.5px dashed var(--line-2);color:var(--tx-3);font:600 18px var(--font-display)}
.kl-keinheld b{color:var(--tx-2)}
.kl-rss{border-top:1px solid var(--line-1);margin-top:8px;padding-top:6px}
.kl-gruppe{display:flex;flex-direction:column;gap:6px;min-width:0}
.logList .kl-gruppe.kl-a .logSide .logSideLabel{color:#ff9f8f}
.logList .kl-gruppe.kl-v .logSide .logSideLabel{color:#9fc4ff}
.kl-null span{color:var(--tx-3)}
/* Kampfbericht neue Seite (05d kampfBerichtHtml, Entwurf werkzeuge/kampfbericht): Band, Seiten, Balken, Kampfkraft, Helden, Ausrüstung, Beute-Kacheln */
.kl-seite .logRow.kb-row{display:block;padding:0;border:0;min-height:0}
.kb{display:flex;flex-direction:column;gap:10px;padding-bottom:4px}
.kb-band{position:relative;height:104px;margin:-4px -6px 0;display:grid;place-items:center}
.kb-band::before{content:"";position:absolute;inset:-10px -20px;background:radial-gradient(closest-side,rgba(240,190,80,.45),transparent 75%)}
.kb.niederlage .kb-band::before{background:radial-gradient(closest-side,rgba(200,50,40,.45),transparent 75%)}
.kb-band img{position:absolute;height:104px;left:50%;transform:translateX(-50%)}
.kb-band b{position:relative;top:-6px;font:700 26px/1 var(--font-display,serif);letter-spacing:.06em;text-transform:uppercase;color:#fff4d6;text-shadow:0 2px 0 #4a2f08,0 0 10px rgba(0,0,0,.6)}
.kb.niederlage .kb-band b{color:#ffe1dc;text-shadow:0 2px 0 #3a0c0c,0 0 10px rgba(0,0,0,.6)}
.kb-ort{text-align:center;font:500 var(--fs-12,12px)/1.4 var(--font-ui);color:var(--tx-3);margin-top:-8px}
.kb-ort b{color:var(--tx-2)}
.kb-ort .mini{display:flex;gap:6px;justify-content:center;margin-top:6px}
.kb-brennt{margin:-4px auto 0;padding:3px 10px;border-radius:10px;background:rgba(200,60,40,.2);border:1px solid rgba(230,110,80,.5);color:#ffb9a6;font:700 var(--fs-12,12px) var(--font-ui)}
.kb-box{border:1px solid var(--line-1);border-radius:12px;background:rgba(255,255,255,.025);padding:10px 10px 8px}
.kb-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font:700 var(--fs-12,12px) var(--font-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--gold-300);margin-bottom:8px}
.kb-h small{text-transform:none;letter-spacing:0;color:var(--tx-3);font-weight:500;text-align:right}
.kb-h2{margin-bottom:5px;font-size:var(--fs-11,11px)}
.kb-kraft .bar{position:relative;height:16px;border-radius:8px;overflow:hidden;background:linear-gradient(90deg,#8f2a26,#d0504a);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
.kb-kraft .bar i{position:absolute;inset:0 auto 0 0;background:linear-gradient(#7fd47a,#3f9a45);border-right:2px solid #fff4d6}
.kb-kraft .txt{display:flex;justify-content:space-between;gap:10px;margin-top:5px;font:700 var(--fs-12,12px) var(--font-ui);color:var(--tx-1)}
.kb-kraft .txt small{display:block;font-weight:500;color:var(--tx-3);font-size:var(--fs-11,11px)}
.kb-kraft .txt span:last-child{text-align:right}
.kb-seiten{display:grid;grid-template-columns:minmax(0,1fr) 30px minmax(0,1fr);align-items:start}
.kb-vs{align-self:center;text-align:center;font:700 15px var(--font-display,serif);color:var(--gold-300)}
.kb-seite{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px 8px;border-radius:12px;border:1px solid var(--line-1);background:linear-gradient(180deg,rgba(70,110,180,.16),rgba(255,255,255,.02))}
.kb-seite.feind{background:linear-gradient(180deg,rgba(190,60,50,.18),rgba(255,255,255,.02))}
.kb-kopf{position:relative;width:64px;height:64px}
.kb-kopf .h{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #e4c886;box-shadow:0 3px 10px rgba(0,0,0,.6);background:#1b2638;font:700 22px var(--font-ui);color:#6a7282}
.kb-seite.feind .kb-kopf .h{border-color:#d98a7c}
.kb-kopf img.w{position:absolute;right:-10px;bottom:-6px;height:34px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.7))}
.kb-name{font:700 14px var(--font-display,serif);color:var(--gold-100);text-align:center;line-height:1.15;overflow-wrap:anywhere}
.kb-seite.feind .kb-name{color:#f2c6bc}
.kb-sub{font:500 var(--fs-11,11px) var(--font-ui);color:var(--tx-3);text-align:center}
.kb-reihe{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
.kb-bar{height:12px;border-radius:6px;overflow:hidden;display:flex;background:rgba(0,0,0,.5);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.kb-bar i{display:block;height:100%}
.kb-bar .ue{background:linear-gradient(#7fd47a,#3f9a45)} .kb-bar .vw{background:linear-gradient(#f1c35a,#b9821f)} .kb-bar .tot{background:linear-gradient(#e0605a,#8f2a26)} .kb-bar .fl{background:linear-gradient(#7fb0f0,#3f6fb9)}
.kb-zahl{display:grid;grid-template-columns:auto 1fr;gap:2px 6px;margin-top:6px;font:500 var(--fs-12,12px)/1.25 var(--font-ui);color:var(--tx-2)}
.kb-zahl b{text-align:right;font-weight:700;color:var(--tx-1);font-variant-numeric:tabular-nums}
.kb-zahl span::before{content:"";display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;background:var(--c,transparent)}
.kb-zahl .start{grid-column:1/-1;display:flex;justify-content:space-between;color:var(--tx-3);border-bottom:1px solid var(--line-1);padding-bottom:3px;margin-bottom:1px}
.kb-zahl .start span::before{display:none}
.kb-zahl .kb-ger{grid-column:1/-1;color:#9fd38a;font-size:var(--fs-11,11px);margin-top:3px} .kb-zahl .kb-ger::before{display:none}
.kb-tab{width:100%;border-collapse:collapse;font:500 var(--fs-12,12px)/1.25 var(--font-ui);color:var(--tx-2)}
.kb-tab td{padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:top}
.kb-tab td:last-child{text-align:right;font-weight:700;color:var(--tx-1);white-space:nowrap;padding-left:8px;font-variant-numeric:tabular-nums}
.kb-tab small{display:block;color:var(--tx-3);font-size:var(--fs-11,11px)}
.kb-tab .plus td:last-child{color:var(--good,#9fd38a)} .kb-tab .minus td:last-child{color:#ff9c8c} .kb-tab .davon td{color:var(--tx-3)}
.kb-tab .sum td{border-top:1px solid var(--line-2);border-bottom:0;font-weight:700;color:var(--tx-1);padding-top:6px}
.kb-tab .sum.vorn td:last-child{color:#8fe08a}
.kb-sh{display:flex;align-items:center;gap:6px;margin:10px 0 4px;font:700 var(--fs-12,12px) var(--font-display,serif);color:var(--gold-100)}
.kb-h + .kb-sh{margin-top:0}
.kb-sh.feind{color:#f2c6bc}
.kb-sh::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--line-2),transparent)}
.kb-held{--rc:#8a93a3;display:grid;grid-template-columns:52px minmax(0,1fr);gap:4px 10px;padding:8px;border-radius:10px;border:1px solid color-mix(in srgb,var(--rc) 60%,transparent);background:color-mix(in srgb,var(--rc) 8%,rgba(0,0,0,.25));margin-bottom:6px}
.kb-held > img{width:52px;height:52px;border-radius:10px;border:1.5px solid var(--rc);object-fit:cover;background:#1b2638}
.kb-held .n{font:700 13.5px var(--font-display,serif);color:var(--tx-1)}
.kb-held .n small{font:600 var(--fs-11,11px) var(--font-ui);color:var(--rc);margin-left:4px}
.kb-held .stern{color:#f3c64e;font:600 var(--fs-11,11px) var(--font-ui)}
.kb-held .s{font:500 var(--fs-11,11px)/1.3 var(--font-ui);color:var(--tx-3)}
.kb-held .s em{color:#ffcf6a;font-style:normal;font-weight:700}
.kb-held .w{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:4px}
.kb-held .w span{padding:2px 7px;border-radius:9px;background:rgba(255,255,255,.05);border:1px solid var(--line-1);font:600 var(--fs-11,11px) var(--font-ui);color:var(--tx-2)}
.kb-held .w span b{color:#9fd38a;margin-left:3px}
.kb-held.leer{--rc:#555c6a;opacity:.7}
.kb-held.leer .q{width:52px;height:52px;border-radius:10px;border:1.5px dashed #6a7282;display:grid;place-items:center;font:700 20px var(--font-ui);color:#6a7282}
.kb-gear{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.kb-gear .bk.kb-gleer > img{opacity:.25;filter:grayscale(1)} .kb-gear .bk.kb-gleer > b{color:var(--tx-3)}
.kb-st{position:absolute;top:4px;left:0;right:0;text-align:center;color:#f3c64e;font:700 9px/1 var(--font-ui);font-style:normal;letter-spacing:.5px;text-shadow:0 1px 2px #000}
.kb-meta{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px 10px;margin-top:8px;font:500 var(--fs-12,12px) var(--font-ui);color:var(--tx-3)}
.kb-meta b{color:var(--tx-1);float:right} .kb-meta.kb-keine{display:block;text-align:center}
.kb-sp{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:2px 8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font:500 var(--fs-12,12px) var(--font-ui);color:var(--tx-2)}
.kb-sp > .h,.kb-sp > .hero-pic{width:30px;height:30px;border-radius:50%;border:1.5px solid var(--gold-300);object-fit:cover;display:grid;place-items:center;background:#1b2638;color:#6a7282;font-weight:700}
.kb-sp b{color:var(--tx-1)} .kb-sp.ich b{color:var(--gold-100)}
.kb-sp small{display:block;color:var(--tx-3);font-size:var(--fs-11,11px)}
.kb-sp .z{text-align:right;font-weight:700;color:var(--tx-1)} .kb-sp .z small{color:#ff9c8c}
.kb-mehr{margin-top:6px;border:1px solid var(--line-1);border-radius:10px;padding:2px 8px 6px;background:rgba(0,0,0,.18)}
.kl-seite .kb details.kb-mehr > summary{display:flex!important;align-items:center;gap:6px;min-height:36px;cursor:pointer;font:700 var(--fs-12,12px) var(--font-ui);color:var(--gold-100);list-style:none}
.kb-mehr > summary::-webkit-details-marker{display:none}
.kb-beutebox .bk-raster{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.kb-beutebox .bk,.kb-gear .bk{width:100%;height:auto;aspect-ratio:1}
.kb-beutebox .bk > b,.kb-gear .bk > b{left:0;right:0;bottom:7%;text-align:center;font-size:var(--fs-12,12px)}
.kb-beutebox .bk-raster + .bk-raster,.kb-beutebox .kb-sh + .bk-raster{margin-top:8px}
.kb-extra{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0} .kb-extra small{font:600 var(--fs-11,11px) var(--font-ui);color:#cfe8c8}
.kb-schutz{margin-top:8px;display:flex;gap:6px;align-items:center;font:500 var(--fs-11,11px)/1.3 var(--font-ui);color:var(--tx-3)}
.kb-schutz img{width:22px;height:22px}
.kb-hin{display:flex;flex-direction:column;gap:6px}
.kb-hin > div{display:flex;gap:8px;align-items:center;font:500 var(--fs-12,12px)/1.3 var(--font-ui);color:var(--tx-2)}
.kb-hin img{width:26px;height:26px;flex:none}
.kb-knoepfe{display:flex;gap:8px;position:sticky;bottom:0;padding:8px 0 2px;background:linear-gradient(transparent,var(--ink-1,#12161f) 30%)}
.kb-knoepfe .btn{flex:1 1 0;min-width:0;justify-content:center}
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
.log-leer{padding:24px 16px;gap:10px} .log-leer img{width:180px;max-width:60%;height:auto;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))} .log-leer b{font:700 var(--fs-16,16px)/1.2 var(--font-display);color:var(--gold-100)} .log-leer .btn{margin-top:4px} .log-leer .btn .icon{color:inherit}
.empty-state b{font:600 var(--fs-13)/1.2 var(--font-display);letter-spacing:.04em;color:var(--tx-2)}
.tag{display:inline-flex;align-items:center;height:16px;padding:0 5px;margin-left:6px;border-radius:var(--r-xs);font:600 9.5px/1 var(--font-ui);letter-spacing:.08em;text-transform:uppercase;vertical-align:2px}
.tag--player{color:#cfe3ff;background:rgba(63,134,216,.2);border:1px solid rgba(140,192,255,.4)}
/* Rangliste sheet: rank, crest in its frame + level, name, value; top 3 gold/silver/bronze, your row blue (pinned in the foot when outside the list) */
#rankPopup{height:var(--sheet-max)}   /* steady: switching tabs never makes the sheet jump */
 #rankBody{gap:6px;padding:10px 10px 14px}
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
.ap-kopf{gap:4px;padding-bottom:4px} .popup-stats:has(> .ap-kopf){gap:8px} .ap-kopf .from-sel{height:40px;border:0;background:rgba(0,0,0,.3)}   /* (weniger Rahmen: Auswahl nur dunkler) */
.panel--island:has(.ap-kopf) .phead::after{display:none}   /* Angriff: keine Raute unter dem Titel (der Kopf hat schon seine Kante) */
/* Angriff kompakt: ANGRIFF | VS | ABWEHR – kleine Überschrift, Zahl, darunter EINE Zeile woraus (ganz beim Draufzeigen) */
.ap-kopf .versus{grid-template-columns:minmax(0,1fr) 20px minmax(0,1fr);gap:4px} .ap-kopf .vs{width:18px;height:18px} .ap-kopf .vs span{font-size:8px}
.ap-kopf .force{display:flex;flex-direction:column;justify-content:center;padding:6px 8px;border:0}
.ap-kopf .force b{margin-top:3px;font-size:var(--fs-17);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ap-kopf .force small,#popupStats .ap-kopf .force--foe small[data-foe="sub"]{margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ap-kopf .force--foe{align-items:flex-end} .ap-kopf .force--foe > *{max-width:100%} .ap-kopf .force--me .stat-l{justify-content:flex-start}
.ap-spaehen{position:relative;display:inline-flex;align-items:center;gap:4px;height:24px;margin-top:3px;padding:0 8px;border:1px solid var(--line-3);border-radius:var(--r-xs);background:rgba(214,170,90,.12);color:var(--gold-100);font:600 var(--fs-11)/1 var(--font-ui)}
.ap-spaehen::before{content:"";position:absolute;inset:-11px -4px} .ap-spaehen .icon{width:12px;height:12px} .ap-spaehen:disabled{opacity:.5}   /* (Tippfläche 44 px) */
.ap-bal{display:flex;align-items:center;gap:8px} .ap-bal .balance{flex:1 1 auto} .ap-bal .balance-note{margin:0;white-space:nowrap}   /* Balken + „Überlegen 190×“ in einer Zeile */
#previewToll{color:var(--gold-200)} #previewToll .icon{width:11px;height:11px;margin:0 3px 0 1px;vertical-align:-1px}   /* Maut/Tor in der Überzeile: keine zweite Kopfzeile */
/* Truppen: Schieber über die ganze Breite (Daumen), darunter 25/50/75/Alle und die Zahl */
.ap-truppen{display:flex;flex-direction:column;gap:2px}
.ap-regler{display:flex;align-items:center;justify-content:space-between;gap:8px} .ap-regler .seg{flex:none;grid-template-columns:repeat(4,42px);margin-top:0}
.ap-regler .val{display:flex;min-width:0}
.ap-truppen .troop-in{width:7.5em;max-width:40vw;height:36px;padding:0 6px;border:0;border-radius:var(--r-xs);background:rgba(0,0,0,.3);font-size:var(--fs-15)}
.ap-truppen .troop-in:focus{box-shadow:0 0 0 1px var(--gold-300)}
.btn-zeit{display:none} #attackBtn.mit-zeit .btn-zeit{display:inline-flex;align-items:center;gap:3px;margin-left:8px;font:600 var(--fs-12)/1 var(--font-ui);letter-spacing:0;text-transform:none;opacity:.9;font-variant-numeric:tabular-nums}
#attackBtn .btn-zeit .icon{width:12px;height:12px}   /* Marschzeit mit Sanduhr im Knopf (wie Rise of Kingdoms) */
/* Held + Zweitheld: zwei Chips in einer Zeile, antippen klappt die Auswahl darunter auf */
.ap-held{display:flex;flex-direction:column;gap:4px} .ap-held-zeile{display:flex;gap:6px}
.ap-hchip{position:relative;flex:1 1 0;min-width:0;display:flex;align-items:center;gap:6px;min-height:var(--k-tipp);padding:0 24px 0 8px;border-radius:var(--r-xs);background:var(--ink-3);border:1px solid var(--line-1);border-left:3px solid var(--hc,var(--line-1));color:var(--tx-1);text-align:left}
.ap-hchip::after{content:"";position:absolute;right:10px;top:50%;width:6px;height:6px;margin-top:-5px;border-right:1.5px solid var(--tx-3);border-bottom:1.5px solid var(--tx-3);transform:rotate(45deg)}
.ap-hchip.on{background:rgba(214,170,90,.12);border-color:var(--line-3);border-left-color:var(--hc,var(--line-3))} .ap-hchip.on::after{margin-top:-1px;transform:rotate(-135deg)}
.ap-hchip .hero-pic{width:26px;height:26px;flex:none;border-radius:5px;border:1px solid var(--hc)}
.ap-hchip-t{display:flex;flex-direction:column;min-width:0}
.ap-hchip-t b{font:600 var(--fs-13)/1.15 var(--font-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ap-hchip-t small{font:500 var(--fs-11)/1.2 var(--font-ui);color:var(--gold-200);white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .ap-hchip-t small .icon{width:10px;height:10px;vertical-align:-1px}
.ap-held .seg.hero-seg2{margin-top:0} .ap-held .hero-seg2-l{display:none}   /* („Zweitheld · 50 %“ steht im Chip) */
.ap-herofx{font:500 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .ap-herofx:empty{display:none}
.hero-seg.chips-quer{flex-wrap:nowrap;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;padding-bottom:2px}
.hero-seg.chips-quer::-webkit-scrollbar{display:none}
.hero-seg.chips-quer > button{flex:none;min-width:max-content;padding:0 12px}

/* ---------------- Einheitlichkeit (Designer-Gesamtblick 6.10., Regeln a1–a12) – gilt für alle Fenster ---------------- */
/* a1: Edelstein und Münze sind überall dasselbe Bild in derselben Farbe (auch auf Gold-Knöpfen, in Reitern, Chips, HUD) */
use[href="#i-gem"]{color:var(--res-gem)}
use[href="#i-coin"]{color:var(--res-coin)}
.icon:has(> use[href="#i-gem"]),.icon:has(> use[href="#i-coin"]){filter:drop-shadow(0 1px 0 rgba(0,0,0,.35))}
.btn:disabled .icon:has(> use[href="#i-gem"]),.btn:disabled .icon:has(> use[href="#i-coin"]){opacity:.75}
/* a2: Zahlen – rechtsbündig, gleich breite Ziffern; Plus grün, Minus/fehlt rot */
.zahl{font-variant-numeric:tabular-nums;font-weight:600;color:var(--tx-1);text-align:right;white-space:nowrap}
/* a4: Unter-Reiter (Chips) nie größer als die Hauptreiter darüber */
.tabs + .p5-chips .p5-chip{height:var(--k-chip);font-size:var(--fs-12)}
/* a5: Zeilen mit overflow:hidden – Platz für die Punkte über Ä/Ö/Ü */
.tab span{line-height:1.35;padding-top:1px}
.overline,.kl-seite .kl-kopf .overline{line-height:1.4}
.hud-me-text b,.rp-stat b,.act-s,.gslot small,.vh-chip-t small,.lk-me-t b,.ap-hchip-t b,.ap-hchip-t small,.slot-r,.lb-name small{line-height:1.35}
/* a11: Knopftext passt immer in den Knopf (kleine Knöpfe neben Text: nicht zusammendrücken) */
.btn--sm,.btn--chip{flex-shrink:0;min-width:max-content}
.btn:disabled{color:var(--tx-3)}
/* a12: Platzhalter in Eingabefeldern ruhig: normal, gedämpft, nicht größer als Text */
input::placeholder,textarea::placeholder{font-weight:400;font-size:min(1em,var(--fs-15));color:var(--tx-4);opacity:1;letter-spacing:normal}
/* Schriftstufen: lesbarer Kleintext mindestens --fs-11 (10/10,5 px gibt es nicht mehr; Plaketten/Stufenzahlen ausgenommen) */
.logGearMeta,.logSrc,.rp-gear small,.ghero small,.hh-foot small,.hh-skt small,.hh-steps span,.hud-me-text small,.auf-grid span,.fo-wirk span,.ptitle-tag{font-size:var(--fs-11)}

/* =====================================================================
   SLIDER  #attackTroopsSlider  (JS keeps --pct in sync)
   ===================================================================== */
.field-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:4px}
.field-l{font:600 var(--fs-10)/1 var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--tx-3)}
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
/* Shop-Schaufenster (6.10., Vorgabe design_shop.md, Layout A): Waren als Karten – die ganze Karte in der Farbe der Seltenheit
   (Verlauf, Rahmen, Leuchten), gezeichnete Truhe, Name groß, Inhalt eine Zeile, Preis-Knopf unten über die volle Breite
   (Gold = Edelsteine, Navy = Thron-Punkte). Die Epische Kiste groß über beide Spalten. Erklärungen hinter „i“. */
#shopPopup.panel--sheet{--sheet-max:calc(100dvh - var(--safe-t) - var(--hud-top-space) - var(--dock-h) - var(--safe-bd))}   /* (Handy: mehr Platz, damit alle Kisten ohne Scrollen passen) */
@media (max-width:899px) and (min-height:501px){ #shopPopup.panel--sheet:has([data-spane="markt"]:not([hidden])){--sheet-max:min(70dvh,calc(100dvh - var(--safe-t) - var(--hud-top-space) - var(--dock-h) - var(--safe-bd)))} }   /* Markt (kurz): so hoch wie die anderen Fenster, keine leere Fläche */
#shopPopup .phead{min-height:56px;padding-bottom:8px} #shopPopup .phead .overline{display:none} #shopPopup .emblem{width:38px;height:38px}
#shopPopup .phead-text{display:flex;align-items:center;gap:10px;min-width:0} #shopPopup .ptitle{margin:0;flex:none} #shopPopup .psub{min-width:0}
#shopPopup .psub small{display:none}   /* (nur Zahl + Zeichen – „Edelsteine“ steht im title) */
#shopPopup .pbody > .mail-pane:not([hidden]){display:grid;gap:10px;align-content:start}
#shopPopup .sect{min-height:28px} #shopPopup .sect-aside{gap:2px}
.shop-i{display:inline-grid;place-items:center;min-width:44px;min-height:44px;margin:-8px -10px -8px 0;padding:0;background:none;border:0;cursor:pointer}
.shop-i .icon{width:17px;height:17px;color:var(--gold-300)} .shop-i.on .icon{color:var(--gold-100)}
.shop-info{padding:8px 10px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--line-1)} .shop-info .mail-intro{margin:0} .shop-info .mail-intro + .mail-intro,.shop-info .odds + .mail-intro,.shop-info .throne-status + .mail-intro{margin-top:8px}
.shop-info .mail-intro b{color:var(--gold-100);font-weight:600} .shop-info .odds{margin-top:6px}
.waren{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px} .waren--3{grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:8px} .waren-teil{display:contents}
.ware{--c:var(--r-blau);--c1:#173459;--c2:#0c1626;--cr:#3b78bd;position:relative;display:flex;flex-direction:column;min-width:0;padding:8px 10px 0;overflow:hidden;text-align:center;border-radius:12px;
  background:radial-gradient(70% 55% at 50% 36%,color-mix(in srgb,var(--c) 45%,transparent),transparent 70%),linear-gradient(180deg,var(--c1),var(--c2));
  border:1.5px solid var(--cr);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 0 1px rgba(0,0,0,.45),0 6px 16px rgba(0,0,0,.55),0 0 18px -4px color-mix(in srgb,var(--c) 60%,transparent)}
.ware[data-r="grau"]{--c:var(--r-grau);--c1:#2a2e35;--c2:#14171c;--cr:#5b6069} .ware[data-r="gruen"]{--c:var(--r-gruen);--c1:#1d3a24;--c2:#0f1a13;--cr:#3f8a47}
.ware[data-r="lila"]{--c:var(--r-lila);--c1:#3a2160;--c2:#150c26;--cr:#8a57d1} .ware[data-r="gold"]{--c:var(--r-gold);--c1:#4a3613;--c2:#1a1308;--cr:#c29449}
.ware[data-r="navy"]{--c:#e4c886;--c1:#1b2638;--c2:#0d121c;--cr:var(--gold-500,#a27832)}
.ware-bild{position:relative;display:block;height:80px;flex:none} .ware-bild svg{display:block;width:100%;height:100%}
.ware-bild--ic{display:grid;place-items:center} .ware-bild--ic .icon{width:52px;height:52px;color:var(--c);filter:drop-shadow(0 0 8px color-mix(in srgb,var(--c) 70%,transparent))}
.ware-bild--ic i{position:absolute;left:50%;top:50%;transform:translate(-50%,-38%);font:800 15px/1 var(--font-ui);font-style:normal;color:#fff;text-shadow:0 1px 3px #000,0 0 6px #000}
.ware-txt{display:grid;gap:2px;min-width:0;margin-top:2px;flex:1 0 auto;align-content:start}   /* (Name in 2 Zeilen: die Preis-Leisten bleiben auf einer Höhe) */
.ware-name{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;font:600 15px/1.15 var(--font-display);color:var(--tx-1);text-shadow:0 1px 2px #000;overflow:hidden;hyphens:manual}   /* Cinzel ist breit: lieber 2 Zeilen („Ausrüstungs-|kiste“) als „…“ */
.ware-txt small{display:block;font:500 12px/1.3 var(--font-ui);color:var(--tx-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ware-txt small.ware-lang{white-space:normal;text-overflow:clip}   /* (Teleporter: Satz in 2–3 Zeilen statt „Hauptstadt an ei…“) */
.ware-preis{display:flex;align-items:center;justify-content:center;gap:6px;height:44px;margin:8px -10px 0;padding:0 6px;border:0;border-top:1px solid #f6e7bf;cursor:pointer;
  font:800 17px/1 var(--font-ui);color:#1d1406;background:linear-gradient(180deg,#f0dfb0 0%,#d4ad66 45%,#a27832 100%);box-shadow:inset 0 -3px 0 rgba(0,0,0,.25)}
.ware-preis .icon{width:16px;height:16px;color:var(--res-gem);filter:drop-shadow(0 0 1px rgba(0,0,0,.7))}
.ware-preis:active{transform:translateY(1px);filter:brightness(.92)}
.ware-preis.thron{border-top-color:#4a6aa0;color:#f0dfb0;background:linear-gradient(180deg,#2c4a7a,#1b2f52)} .ware-preis.thron .icon{color:var(--gold-200)}
.ware-preis:disabled{cursor:default;border-top-color:#4a4f58;color:#ff8d82;background:linear-gradient(180deg,#3a3f49,#23272e);box-shadow:none} .ware-preis:disabled .icon{filter:grayscale(.6)}
.ware-preis.is-armed{font-size:13px;color:#fff;background:linear-gradient(180deg,#f2a066,#b8562a)}
.band{position:absolute;top:12px;right:-31px;z-index:1;width:120px;text-align:center;transform:rotate(35deg);font:700 10px/19px var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:#1d1406;
  background:linear-gradient(180deg,#f0dfb0,#c29449);box-shadow:0 2px 6px rgba(0,0,0,.5)}
/* die große Karte: Truhe links (130 px), Name/Inhalt rechts, Knopf über die volle Breite; Strahlen + Glanzstreifen */
.ware--gross{grid-column:1/-1;display:grid;grid-template-columns:150px minmax(0,1fr);grid-template-rows:1fr auto;align-items:center;text-align:left}
.ware--gross .ware-bild{height:104px;margin:-4px 0 -2px}
.ware--gross .band{top:0;left:0;right:auto;width:auto;padding:0 12px;transform:none;border-radius:10px 0 10px 0}   /* gerades Band oben links: ganz lesbar */
.ware--gross .ware-bild::before{content:"";position:absolute;inset:-30px -10px;background:conic-gradient(from 0deg,transparent 0 8deg,rgba(169,112,242,.22) 8deg 14deg,transparent 14deg 30deg,rgba(169,112,242,.22) 30deg 36deg,transparent 36deg 52deg,rgba(169,112,242,.22) 52deg 58deg,transparent 58deg 74deg,rgba(169,112,242,.22) 74deg 80deg,transparent 80deg 96deg,rgba(169,112,242,.22) 96deg 102deg,transparent 102deg 120deg);
  -webkit-mask:radial-gradient(circle,#000 25%,transparent 68%);mask:radial-gradient(circle,#000 25%,transparent 68%);animation:ware-strahlen 40s linear infinite;pointer-events:none}
.ware--gross .ware-bild svg{position:relative}
.ware--gross .ware-name{font-size:19px} .ware--gross .ware-txt small{font-size:13px}
.ware--gross .ware-preis{grid-column:1/-1}
@keyframes ware-strahlen{to{transform:rotate(360deg)}}
.ware.glanz::after{content:"";position:absolute;top:-40%;bottom:-40%;left:-60%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.16),transparent);transform:skewX(-20deg);animation:ware-glanz 5s ease-in-out infinite;pointer-events:none}
@keyframes ware-glanz{0%,70%{left:-60%}100%{left:130%}}
@media (prefers-reduced-motion:reduce){.ware.glanz::after,.ware--gross .ware-bild::before{animation:none}}
.waren--3 .ware{padding:6px 6px 0} .waren--3 .ware-bild{height:64px} .waren--3 .ware-preis{margin:8px -6px 0;font-size:15px} .waren--3 .ware-name{font-size:14px} .waren--3 .ware-txt small{font-size:11px}
/* Shop sortiert (Test-Datei werkzeuge/thronevent): Zwischenüberschrift mit Trennlinie, gleich große Karten, Preis-Knöpfe unten */
.sort-kopf{display:flex;align-items:center;gap:8px;margin:12px 0 8px;font:700 11px/1 var(--font-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--gold-100)}
.sort-kopf::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(228,200,134,.45),transparent)}
.waren--3 .ware-name{font-size:12px;min-height:2.4em;display:flex;align-items:center;justify-content:center}
.ware .lim{font:600 10.5px/1.2 var(--font-ui);color:var(--tx-3)} .ware.leer{opacity:.5}
.ware .zeit{position:absolute;left:50%;bottom:2px;transform:translateX(-50%);font:800 12px/1 var(--font-ui);color:#fff;text-shadow:0 1px 2px #000,0 0 3px #000;white-space:nowrap}
.ware-knoepfe{display:flex;flex-direction:column;gap:4px;margin:6px -6px 0}
.ware-knoepfe .ware-preis{margin:0;height:32px;font-size:12.5px;gap:3px}
.ware-preis img{width:16px;height:16px;object-fit:contain}
.ware .pity{font:700 10.5px/1.2 var(--font-ui);color:#d9b8ff}
.ev-guthaben{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.28);border:1px solid rgba(228,200,134,.3)}
.ev-guthaben img{width:28px;height:28px} .ev-guthaben b{font:800 17px/1 var(--font-display);color:var(--gold-100)}
.ev-guthaben small{margin-left:auto;text-align:right;font:600 11px/1.3 var(--font-ui);color:var(--tx-3)} .ev-guthaben small b{font-size:12px}
.pill--em img{width:16px;height:16px}
main .besch-ic,.besch-ic{width:22px;height:22px;object-fit:contain} #beschInhalt .bk-mit{border:0;background:none;padding:0;cursor:pointer} #beschInhalt .btn--haupt{margin-top:10px;width:100%}
.ware-mehr{display:grid;gap:8px;align-content:stretch}
.ware-link{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 8px;border-radius:12px;border:1px dashed var(--line-3);background:rgba(0,0,0,.22);cursor:pointer;
  font:600 var(--fs-13) var(--font-ui);color:var(--gold-200)} .ware-link .icon{width:16px;height:16px;color:var(--gold-300)} .ware-link.on{color:var(--gold-100);border-style:solid}
.thron-zeile{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:0 12px;border-radius:10px;border:1px solid var(--line-2);background:rgba(0,0,0,.25);cursor:pointer;
  font:500 var(--fs-13) var(--font-ui);color:var(--tx-2);text-align:left}
.thron-zeile > .icon{width:16px;height:16px;flex:none;color:#f2c75c} .thron-zeile > span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .thron-zeile b{color:var(--tx-1);font-variant-numeric:tabular-nums}
.thron-zeile .tz-i{margin-left:4px;color:var(--gold-300)} .thron-zeile.on{border-color:var(--line-3)}
.odds{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
.odds .chip{height:20px;padding:0 6px;font-size:var(--fs-10)}
.odds .chip--rar{height:auto;min-height:20px;padding:4px 6px;line-height:1.3}   /* zweizeilig (Handy): Innenabstand oben/unten, nicht am Rand */
.hchest-res{display:grid;gap:6px;padding:10px 12px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--line-3)}
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
  body .toast.toast--oben{top:calc(var(--safe-t) + var(--hud-top-space));bottom:auto}   /* über einem offenen Fenster: oben (06d hintFrei) */
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
  #shopPopup.panel--sheet{--sheet-max:calc(100dvh - 72px - 104px);width:min(720px,calc(100vw - 28px))}   /* Shop: breit (4 Karten nebeneinander), endet über der Leiste */
  #shopPopup .waren:not(.waren--3){grid-template-columns:repeat(4,minmax(0,1fr))} #shopPopup .ware--gross{grid-column:span 2}
  #shopTabs .tab{font-size:13px}   /* (11 px war am Desktop zu klein) */
  body:has(#shopPopup.is-open) .mapctl{display:none}   /* der breite Shop deckt die Karten-Knöpfe ab: solange er offen ist, weg */
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
.ico-coin{color:var(--gold-300)} .ico-troops{color:#e8e2d2}
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
.daily-row{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 12px}   /* Abstand zum Kartenrand (Spieltest 7.10.: Text klebte links) */
.daily-row .daily-txt{flex:1;min-width:0}
.daily-row .daily-txt b{display:block;font:600 var(--fs-13)/1.3 var(--font-ui);color:var(--tx-1)}
.daily-row .daily-txt small{display:block;font:500 var(--fs-11)/1.35 var(--font-ui);color:var(--tx-3)}
.daily .daily-days{margin-top:0}
.daily-week{display:grid;gap:4px} .daily-week > div{display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--line-1);border-radius:8px;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
.daily-week b{min-width:42px;color:var(--tx-3);font-weight:600} .daily-week span{flex:1} .daily-week .icon{width:14px;height:14px;color:var(--gold-400)}
.daily-week .daily-bk{flex:1;justify-content:flex-start;--bk:34px;gap:4px} .daily-week .bk{flex:none}
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
   LOADING SCREEN: a painted dusk scene (castle on the cliff, fog, reflection), gold logo, thin gold bar
   ===================================================================== */
.splash{position:fixed;inset:0;z-index:200;overflow:hidden;background:#0b1430;color:var(--tx-1);
  display:flex;flex-direction:column;align-items:center;
  padding:calc(var(--safe-t) + 9vh) 24px calc(var(--safe-b) + 40px);transition:opacity .7s ease,visibility .7s}
.splash.is-leaving{opacity:0;visibility:hidden}
.splash.is-leaving .splash-bg{transform:scale(1.05)}
.splash-bg{position:absolute;inset:0;width:100%;height:100%;display:block;transition:transform 1.4s cubic-bezier(.2,.8,.2,1);animation:sp-zoom 12s ease-out both}
@keyframes sp-zoom{from{transform:scale(1.04)}to{transform:scale(1)}}
/* vignette + a darker bottom for the tip and the bar */
.splash-vig{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse 90% 80% at 50% 45%,transparent 55%,rgba(3,5,12,.65)),linear-gradient(180deg,rgba(3,5,12,.35),transparent 22%,transparent 68%,rgba(4,6,12,.8) 86%,#04060c)}
.splash-top,.splash-bottom{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center}
/* logo: embossed gold, "OPEN" small above "WATER" */
.splash-title{margin:0;display:flex;flex-direction:column;align-items:center;font:700 clamp(46px,13vw,58px)/.98 var(--font-display);letter-spacing:.06em;text-transform:uppercase;
  filter:drop-shadow(0 2px 0 #5a3f14) drop-shadow(0 4px 14px rgba(0,0,0,.75));animation:sp-rise 1.1s .15s cubic-bezier(.2,.8,.2,1) both}
.splash-title span{background-image:linear-gradient(180deg,#fff3cf 8%,#e4c886 45%,#a27832 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.splash-title span:first-child{font-size:.55em;letter-spacing:.34em;margin-right:-.34em}
.splash-sub{display:flex;align-items:center;gap:12px;margin-top:14px;font:700 13px/1 var(--font-ui);letter-spacing:.3em;text-transform:uppercase;color:#fff1d0;
  text-shadow:0 1px 3px #000,0 0 10px rgba(0,0,0,.7);animation:sp-rise 1.1s .3s cubic-bezier(.2,.8,.2,1) both}
.splash-top::before{content:"";position:absolute;inset:-40px -70px;z-index:-1;background:radial-gradient(ellipse 80% 75% at 40% 62%,rgba(6,10,28,.75),transparent 78%)}   /* Kontrast auf hellem Himmel */
.splash-sub span{width:34px;height:1px;background:linear-gradient(90deg,transparent,#d9b56a)}
.splash-sub span:last-child{transform:scaleX(-1)}
@keyframes sp-rise{from{opacity:0;transform:translateY(14px)}}
/* bottom: one tip line, status + percent, a thin gold bar */
.splash-bottom{margin-top:auto;width:min(560px,100%);animation:sp-rise 1s .45s ease-out both}
.splash-tipline{margin:0 0 14px;max-width:460px;min-height:2.7em;font:500 var(--fs-13)/1.35 var(--font-ui);color:#f4ecd8;text-shadow:0 1px 3px #000,0 0 8px rgba(0,0,0,.8);transition:opacity .35s}
.splash-tipline b{color:#d4ad66;font-weight:700}
.splash-tipline.is-swap{opacity:0}
.splash-meta{display:flex;justify-content:space-between;align-items:baseline;gap:12px;width:100%;margin-bottom:8px}
.splash-status{font:600 var(--fs-11)/1 var(--font-ui);letter-spacing:.18em;text-transform:uppercase;color:#e6d6b0;text-shadow:0 1px 4px rgba(0,0,0,.9)}
.splash-pct{font:700 var(--fs-12)/1 var(--font-ui);color:#f0d69a;font-variant-numeric:tabular-nums;letter-spacing:.04em;text-shadow:0 1px 4px rgba(0,0,0,.9)}
.splash-bar{position:relative;width:100%;height:4px;border-radius:2px;background:rgba(0,0,0,.5);box-shadow:0 0 0 1px rgba(212,173,102,.45)}   /* (Rand als Schatten: die Füllung hat die volle Breite der Spur → Prozent stimmt) */
.splash-bar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:2px;background:linear-gradient(90deg,#a27832,#e4c886 70%,#fff3cf);box-shadow:0 0 8px rgba(236,190,110,.6);
  animation:sp-load 6s cubic-bezier(.15,.75,.3,1) forwards}
.splash-bar i::after{content:"";position:absolute;right:-3px;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:#fff8e0;box-shadow:0 0 8px 2px rgba(255,214,140,.9)}
@keyframes sp-load{to{width:72%}}   /* (langsam auslaufend: der Balken steht nicht still, solange das Spiel noch lädt) */
.splash.is-done .splash-bar i{animation:none;width:100%;transition:width .6s ease-out}
/* desktop: logo top left like a poster, bar centred */
@media (min-width:900px) and (min-aspect-ratio:11/10){.splash{align-items:stretch;padding:15vh 4vw calc(var(--safe-b) + 56px)}.splash-top{align-items:flex-start;text-align:left}
  .splash-title{font-size:88px;align-items:flex-start}.splash-sub{margin-top:18px}.splash-bottom{align-self:center}.splash-tipline{font-size:15px}}
@media (max-height:500px){.splash{padding-top:calc(var(--safe-t) + 4vh);padding-bottom:calc(var(--safe-b) + 20px)}.splash-title{font-size:clamp(30px,9vh,48px)}.splash-sub{margin-top:8px}.splash-tipline{margin-bottom:8px}}
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
.city-title h2{margin:2px 0 0;font:700 var(--fs-18,18px)/1.1 var(--font-display);color:var(--gold-100);letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.city-builder{position:absolute;left:10px;top:calc(100% + 6px);display:flex;align-items:flex-start;gap:6px;z-index:2}   /* Bauarbeiter seitlich unter dem Kopf: Hammer, aufgeklappt die Liste */
body.has-panel .city-builder,.city:has(#citySheet:not([hidden])) .city-builder,body:has(#heroHall:not([hidden])) .city-builder{display:none}   /* nie über einem Fenster */
.cb-knopf{position:relative;width:48px;height:48px;border-radius:50%;border:2px solid var(--gold-300);background:rgba(10,10,14,.8);display:grid;place-items:center;cursor:pointer;padding:0;flex:none}
.cb-knopf>svg.icon{width:32px;height:32px;background:url(bilder/ui_sym_bauarbeiter.webp) center/contain no-repeat}
.cb-knopf>svg.icon>use{display:none}
.cb-knopf b{position:absolute;right:-6px;bottom:-4px;min-width:26px;padding:1px 4px;border-radius:var(--r-pill);background:#3a2a10;border:1px solid var(--gold-300);font:700 var(--fs-11)/1.2 var(--font-ui);color:var(--tx-2)}
.cb-knopf.is-frei b{background:#1f5a2a;color:#fff}
.cb-liste{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
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
  display:flex;flex-direction:column;gap:10px;animation:panel-in var(--dur-3) var(--ease-out);max-height:calc(100% - 90px);overflow-y:auto;overflow-x:hidden;touch-action:pan-y;overscroll-behavior:contain}
.city-sheet > *{min-width:0;max-width:100%}   /* nur senkrecht scrollen: nichts darf breiter sein als das Fenster */
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
.city-wisch{position:absolute;left:50%;top:37%;z-index:2;display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:var(--r-pill);background:rgba(6,8,12,.72);border:1px solid var(--line-2);color:var(--gold-100);font:600 var(--fs-14,14px)/1.2 var(--font-ui);white-space:nowrap;pointer-events:none;transform:translateX(-50%);animation:city-wisch 1.6s ease-in-out infinite}
.city-wisch[hidden]{display:none} .city-wisch-r{transform:scaleX(-1)}   /* Handy: beim ersten Betreten – die Stadt geht links und rechts weiter */
body:has(.panel.is-open,#citySheet:not([hidden]),#lookSheet:not([hidden]),#heroHall:not([hidden])) .city-wisch{display:none}   /* nie über einem offenen Fenster/Blatt */
@keyframes city-wisch{50%{transform:translateX(calc(-50% + 10px))}}
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
.city-lbl2{display:inline-flex;flex-direction:column;align-items:center;min-width:0} .city-warte{font:600 11px/1.2 var(--font-ui);letter-spacing:0;text-transform:none;opacity:.85} .city-warte:empty{display:none}   /* „Fehlt: …“ – darunter, wann es reicht */
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
.notice [data-view-titles]{flex:none;margin-left:auto}

.forge-list{display:flex;flex-direction:column;gap:6px}
.forge-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.forge-row > .icon{width:20px;height:20px;color:var(--gold-200);flex:none}
.forge-row > span{flex:1;min-width:0}
.forge-row b{display:block;font:700 var(--fs-13)/1.2 var(--font-ui)}
.forge-row small{display:block;font:600 var(--fs-13)/1.3 var(--font-ui);color:var(--gold-200);letter-spacing:.08em}
.forge-row em{font:600 var(--fs-11)/1 var(--font-ui);font-style:normal;color:var(--tx-3)}
.heal-row{flex-wrap:wrap} .heal-row > span{min-width:max-content} .heal-row small{white-space:nowrap} .heal-row .btn{margin-left:auto;max-width:100%}   /* Handy: „1.000 / 1.422“ in einer Zeile, der Knopf darf darunter */
.forge-row.is-empty{color:var(--tx-3);font:500 var(--fs-12)/1.3 var(--font-ui)}
.tile .stars{position:absolute;left:4px;right:24px;bottom:3px;display:flex;justify-content:flex-start;gap:0;color:#ffd76a;overflow:hidden}
.tile .stars .icon{width:9px;height:9px;filter:drop-shadow(0 0 1px #000)}
.starbar{display:flex!important;flex-wrap:wrap;gap:1px;margin-top:3px}
.starbar .icon{width:13px;height:13px;color:#ffd76a}
.starbar i{display:contents}
.starbar i .icon{color:rgba(255,255,255,.18)}
/* ===== AUFBAU (aufbau.js, Paket D): Rohstoffe im HUD, Kosten, Forschung, Markt, Truppen-Stufe ===== */
.roh-v{display:flex;align-items:center;gap:4px} .roh-v .icon{width:15px;height:15px}
.roh-h .icon,.icon.roh-h{color:#c08a4c} .roh-s .icon,.icon.roh-s{color:#aab3bd} .roh-e .icon,.icon.roh-e{color:#8fb6e0}
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
/* ===== Bündnis ohne Bündnis (blick-f): eine Startseite statt Reiter, Gründen als eigene Seite ===== */
#bundPopup.bd-ohne #bundTabs{display:none} #bundLive:empty{display:none} #bundLive:empty + #bundUnten{margin-top:0}
.bd-start{display:grid;gap:10px;padding:12px;border:1px solid rgba(214,170,90,.35);border-radius:var(--r-lg);background:radial-gradient(120% 90% at 0% 0%,rgba(214,170,90,.16),transparent 60%),rgba(0,0,0,.25)}
.bd-start-kopf{display:flex;align-items:center;gap:12px} .bd-start-kopf b{display:block;font:600 var(--fs-15)/1.2 var(--font-display);color:var(--gold-100)}
.bd-start-kopf small{display:block;margin-top:3px;font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
.bd-start-em{width:42px;height:42px;flex:none;display:grid;place-items:center;border-radius:12px;border:1px solid var(--gold-300);background:linear-gradient(160deg,#3a2c14,#16120b);color:var(--gold-100);box-shadow:0 2px 8px rgba(0,0,0,.45)} .bd-start-em .icon{width:22px;height:22px}
.bd-vorteile{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.bd-vorteile > div{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 4px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.25);text-align:center}
.bd-vorteile .icon{width:20px;height:20px;color:var(--gold-300)} .bd-vorteile b{font:600 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-1)} .bd-vorteile small{font:500 var(--fs-10)/1.3 var(--font-ui);color:var(--tx-3)}
.bd-gk{display:flex;align-items:center;gap:10px;width:100%;min-height:56px;padding:8px 12px;border:1px solid var(--gold-300);border-radius:var(--r-lg);background:linear-gradient(90deg,rgba(214,170,90,.18),rgba(0,0,0,.25));color:var(--tx-1);text-align:left;cursor:pointer}
.bd-gk:hover{background:linear-gradient(90deg,rgba(214,170,90,.28),rgba(0,0,0,.25))}
.bd-gk-ic{width:34px;height:34px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--gold-300);color:#1a1204} .bd-gk-ic .icon{width:18px;height:18px}
.bd-gk-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px} .bd-gk-t b{font:600 var(--fs-13)/1.2 var(--font-ui);color:var(--gold-100)} .bd-gk-t small{font:500 var(--fs-11)/1.3 var(--font-ui);color:var(--tx-3)}
.bd-gk .cost{flex:none;white-space:nowrap;font:600 var(--fs-12)/1 var(--font-ui);color:var(--tx-1)}
.bd-gf-kopf{display:flex;align-items:center;gap:10px} .bd-gf-kopf b{font:600 var(--fs-15)/1.2 var(--font-display);color:var(--gold-100)}
.bd-vorschau{padding:10px;border-radius:var(--r-sm);background:rgba(0,0,0,.25)} .bd-vorschau > div{min-width:0} .bd-vorschau b{overflow-wrap:anywhere}
.bd-tag::placeholder{text-transform:none;letter-spacing:normal}
#bdZeichen{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px;justify-items:center} #bdZeichen button{width:100%;max-width:44px;height:auto;aspect-ratio:1}
#bdFarben{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;justify-items:center} #bdFarben button{width:34px;height:34px}
.bd-gf-los{width:100%;min-height:48px;gap:8px;position:sticky;bottom:6px;z-index:1} .bd-gf-los .cost{margin-left:auto;display:inline-flex;align-items:center;gap:4px}   /* Handy: „Gründen“ bleibt unten im Fenster sichtbar */
/* ===== 11b F (P4): Stadt, Burg, Labor, Helden, Shop übersichtlich ===== */
/* Gebäude-Fenster: Haupt-Knopf fest unten (nie unter dem Falz); Burg: Voraussetzungen zuerst, dann der Schild-Kasten */
.city-sheet > .city-bfoot{order:5;position:sticky;bottom:0;z-index:3;margin:0 -14px;max-width:none;padding:10px 14px;background:var(--noise),var(--panel-bg);border-top:1px solid var(--line-1)}
.city-sheet.cs-keep > #cityBStats{order:1} .city-sheet.cs-keep > #cityBNote.city-wirkung{order:2} .city-sheet.cs-keep > #cityBExtra{order:3}   /* Burg: Schild-Kasten unter den Voraussetzungen – nie halb unter dem festen Knopf (Handy) */
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
/* ===== Stadt-Gebäude-Fenster wie in Rise of Kingdoms (6.10.): Bild + Stufe, Jetzt / Nächste Stufe, Voraussetzungen mit Sprung-Knopf ===== */
.city-blevel small{margin-left:4px;font:500 var(--fs-11,11px)/1.2 var(--font-ui);color:var(--tx-3);white-space:nowrap}
.city-bicon.is-zu canvas{filter:grayscale(.8) brightness(.8);opacity:.85}   /* noch nicht gebaut: das eigene Bild, ausgegraut */
.city-vgl{border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22);padding:4px 10px 6px}
.city-vgl .vgl-h,.city-vgl .vgl-z{display:grid;grid-template-columns:1fr minmax(64px,auto) minmax(64px,auto);gap:10px;align-items:baseline}
.city-vgl .is-max .vgl-h,.city-vgl .is-max .vgl-z{grid-template-columns:1fr auto}
.city-vgl .vgl-h{padding:4px 0 2px;font:700 var(--fs-10,10px)/1.35 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3)}
.city-vgl .vgl-h span:not(:first-child),.city-vgl .vgl-z b{text-align:right}
.city-vgl .vgl-z{padding:5px 0;border-top:1px solid var(--line-1)}
.city-vgl .vgl-z span{min-width:0;font:600 var(--fs-13)/1.3 var(--font-ui);color:var(--tx-2)}
.city-vgl .vgl-z b{font:700 var(--fs-13)/1.3 var(--font-ui);color:var(--tx-1);font-variant-numeric:tabular-nums;white-space:nowrap}
.city-vgl .vgl-z b.vgl-neu{color:var(--good)}
.anf.is-geh{grid-template-columns:22px 1fr auto auto;background:rgba(150,30,30,.16);border-color:rgba(255,120,100,.5)}
.anf.is-geh > span{color:var(--blood-300)} .anf.is-geh > .icon{color:var(--blood-300)}
.anf .anf-geh{min-height:36px;padding:0 10px;gap:4px;white-space:nowrap}
.anf .anf-geh::before{content:"";position:absolute;inset:-4px 0}   /* Tippfläche 44 px */
.anf .anf-geh{position:relative} .anf .anf-geh .icon{width:13px;height:13px}
body.in-stadt .midbar{visibility:hidden}   /* Karten-Hinweise (Events …) beim Überblenden nicht unter der Bauarbeiter-Zeile durchscheinen – hart getauscht */
/* Umlaut-Punkte über Großbuchstaben (Ä/Ö/Ü in Überschriften, Reitern, Versalien) nicht abschneiden: einzeilige Texte mit
   „…“ schneiden nur noch seitlich ab (overflow-x:clip), nach oben bleibt Platz – die Zeilenhöhe (oft 1) war kleiner als die Punkte hoch sind */
@supports (overflow:clip) {
  .tab span,.overline,.ptitle:not(.ptitle--input),.hh-head h2,.city-title h2,.act-t,.stat-l,.stat-v,.slot-r,.gslot small,.lb-name small,.hud-me-text b,.rp-stat b,.lk-me-t b,.kv b,.statRow b,.res b{overflow-x:clip;overflow-y:visible}
}
    </style>
    <style>
/* =====================================================================
   BELOHNUNGS-KACHELN (Alexander 7.10., Vorbild RoK): Kachel-Bild je Seltenheit (ui_kachel_*, --ki-kachel aus 05z), großes Symbol
   (bilder/beute_*.webp, kiste_*.webp), Menge unten rechts. Größe über --bk. Überall gleich: Fenster, Listen, Pass, Events, Berichte.
   ===================================================================== */
.bk{--ki-kachel:url(bilder/ui_kachel_grau.webp);position:relative;display:block;flex:none;width:var(--bk,60px);height:var(--bk,60px);margin:0;padding:0;border:0;list-style:none;
  background:var(--ki-kachel) center/100% 100% no-repeat;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
.bk[data-r="grau"]{--ki-kachel:url(bilder/ui_kachel_grau.webp)} .bk[data-r="gruen"]{--ki-kachel:url(bilder/ui_kachel_gruen.webp)} .bk[data-r="blau"]{--ki-kachel:url(bilder/ui_kachel_blau.webp)}
.bk[data-r="lila"]{--ki-kachel:url(bilder/ui_kachel_lila.webp)} .bk[data-r="gold"]{--ki-kachel:url(bilder/ui_kachel_gold.webp)} .bk[data-r="rot"]{--ki-kachel:url(bilder/ui_kachel_rot.webp)}
.bk > img{position:absolute;left:10%;top:9%;width:80%;height:80%;object-fit:contain;filter:drop-shadow(0 2px 2px rgba(0,0,0,.6));pointer-events:none}
.bk > img.bk-held{left:5%;top:5%;width:40%;height:40%;border-radius:50%;object-fit:cover;border:1.5px solid #f6e7bf;background:#1b2638;filter:none}
.bk > b{position:absolute;right:7%;bottom:5%;font:800 calc(var(--bk,60px) * .22)/1 var(--font-ui);color:#fff;font-variant-numeric:tabular-nums;white-space:nowrap;
  text-shadow:0 0 2px #000,0 1px 2px #000,1px 0 1px #000,-1px 0 1px #000,0 -1px 1px #000}
.bk > i.bk-zeit{position:absolute;left:6%;top:5%;font:800 calc(var(--bk,60px) * .17)/1 var(--font-ui);font-style:normal;color:#ffe7a8;white-space:nowrap;text-shadow:0 0 2px #000,0 1px 2px #000}   /* Beschleuniger: Dauer oben links */
.bk-raster{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
.bk-klein{--bk:40px;gap:4px} .bk-mini{--bk:32px;gap:3px;justify-content:flex-start}
.bk-mit{display:flex;flex-direction:column;align-items:center;gap:3px;width:calc(var(--bk,60px) + 16px)}
.bk-mit small{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font:600 10.5px/1.15 var(--font-ui);color:var(--tx-2);text-align:center;text-shadow:0 1px 2px #000}
/* Listen in den Fenstern (Tag, Stufe, Kriegsherr): Kacheln nebeneinander statt Zeilen */
.lvlup-rewards:has(> .bk){flex-direction:row;flex-wrap:wrap;justify-content:center;gap:8px}
.lvlup-rewards > li.bk{display:block;padding:0;border:0;border-radius:0;background:var(--ki-kachel) center/100% 100% no-repeat;--bk:58px}
/* Aufgaben, Abholfach, Events, Pass: kleine Kacheln in der Zeile */
.quest-rew:has(.bk){padding:0;border:0;background:none;gap:3px} .quest-rew .bk{--bk:38px}
.inbox-row .bk-raster{margin-top:4px}
#xpNext{display:flex;align-items:center;gap:8px;flex-wrap:wrap} .xp-next-bk{justify-content:flex-start;--bk:44px}
.daily-row .bk-raster{justify-content:flex-start;margin-top:4px}
.kl-rss .bk-raster{--bk:46px;justify-content:flex-start;margin:4px 0 2px} .kl-rss.bk-an > .kl-rss-zeilen{display:none}
.bk[data-minus]{filter:grayscale(.5) drop-shadow(0 2px 3px rgba(0,0,0,.5))} .bk[data-minus] > b{color:#ff8d82}

/* Rucksack (Dock): je Gegenstand eine Listen-Karte mit Kachel, Name und Knopf; Splitter als Kacheln mit Heldennamen */
#rucksackPopup .pbody{display:grid;gap:10px;align-content:start} .rk-emblem{width:78%;height:78%;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
.rk-inhalt{display:grid;gap:8px} .rk-liste{display:grid;gap:6px}
.rk-fach{display:flex;align-items:center;gap:10px;padding:6px 8px;--bk:52px}
.rk-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px} .rk-txt b{font:700 var(--fs-14,14px)/1.2 var(--font-ui);color:var(--tx-1)} .rk-txt small{font:500 12px/1.25 var(--font-ui);color:var(--tx-2)}
.rk-knopf{flex:none;min-width:96px;min-height:44px;gap:6px}
.rk-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px} .rk-tabs button{min-width:0;overflow:hidden;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-height:44px;padding:0 4px;font-size:12px} .rk-tabs .icon{width:14px;height:14px;flex:none} .rk-tabs small{color:var(--gold-200);font-size:10px}
@media (max-width:480px){.rk-tabs .icon{display:none} .rk-tabs button{padding:0 2px;font-size:11px}}
.rk-raster{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px;--bk:56px}   /* 4–5 Kacheln je Reihe */
.rk-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px;border:1px solid transparent;border-radius:10px;background:none;cursor:pointer;min-width:0}
.rk-item small{font:600 10px/1.15 var(--font-ui);color:var(--tx-2);text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rk-item.is-on{border-color:var(--gold-300);background:color-mix(in srgb,var(--gold-300) 14%,transparent)}
.rk-leer .btn{margin-top:6px}
@media (max-width:899px) and (min-height:501px){ #rucksackPopup .pbody{gap:8px} .rk-fach{--bk:46px;padding:4px 8px} .rk-liste{gap:4px} }   /* Handy: enger, damit die Splitter-Reihe ganz im Fenster steht */
.rk-splitter{--bk:56px;justify-content:flex-start;gap:8px} .rk-splitter .bk-mit{padding:0;border:0;background:none;cursor:pointer;min-height:44px}

/* ---- Belohnungs-Fenster: Kiste wackelt, geht auf, Strahlen drehen, Kacheln kommen nacheinander ---- */
.bf{position:fixed;inset:0;z-index:calc(var(--z-modal) + 2);display:flex;align-items:center;justify-content:center;padding:16px;
  background:radial-gradient(ellipse at 50% 42%,rgba(52,36,8,.6),rgba(3,4,8,.86));animation:fade-in var(--dur-3) var(--ease-out)}
.bf[hidden]{display:none}
.bf-karte{position:relative;width:min(380px,100%);max-height:calc(100dvh - 32px);overflow:auto;padding:30px 16px 16px;text-align:center;color:var(--tx-1);
  border:0;border-style:solid;border-image:url(bilder/ui_rahmen.webp) 44 fill / 16px stretch;animation:lvlup-in 420ms cubic-bezier(.2,1.4,.3,1)}
.bf-band{position:relative;margin:-14px -6px 4px;padding:10px 40px 14px;background:url(bilder/ui_band_gold.webp) center/100% 100% no-repeat}
.bf-band h2{margin:0;font:700 19px/1.15 var(--font-display);letter-spacing:.04em;color:#2a1904;text-shadow:0 1px 0 rgba(255,236,190,.55)}
.bf-unter{position:relative;z-index:1;font:500 var(--fs-12)/1.35 var(--font-ui);color:var(--tx-2);text-shadow:0 1px 3px #000;margin-bottom:4px}
.bf-buehne{position:relative;display:none;height:150px;margin:0 auto 6px;width:200px}
.bf.mit-kiste .bf-buehne{display:block}
.bf-strahlen{position:absolute;left:50%;top:50%;width:300px;height:300px;margin:-150px 0 0 -150px;background:url(bilder/ui_strahlen.webp) center/contain no-repeat;
  opacity:0;transform:scale(.4);pointer-events:none;-webkit-mask-image:radial-gradient(circle,#000 30%,transparent 68%);mask-image:radial-gradient(circle,#000 30%,transparent 68%)}
.bf.is-auf .bf-strahlen{opacity:.95;transform:scale(1);transition:opacity .3s,transform .4s cubic-bezier(.2,1.4,.3,1);animation:lvlup-spin 12s linear infinite}
.bf-kiste{position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px 0 0 -75px;object-fit:contain;filter:drop-shadow(0 6px 10px rgba(0,0,0,.6))}
.bf.is-wackeln .bf-kiste{animation:bf-wackeln .7s ease-in-out}
.bf.is-auf .bf-kiste{animation:bf-auf .35s cubic-bezier(.2,1.6,.4,1)}
.bf-anzahl{position:absolute;right:6px;bottom:8px;font:800 20px/1 var(--font-display);color:var(--gold-100);text-shadow:0 0 3px #000,0 2px 4px #000}
@keyframes bf-wackeln{0%,100%{transform:none}15%{transform:rotate(-6deg) scale(1.03)}30%{transform:rotate(6deg) scale(1.05)}45%{transform:rotate(-8deg) scale(1.07)}
  60%{transform:rotate(8deg) scale(1.09)}75%{transform:rotate(-4deg) scale(1.12)}90%{transform:scale(.94)}}
@keyframes bf-auf{from{transform:scale(1.25)}to{transform:none}}
.bf-inhalt{min-height:20px;margin:6px 0 12px}
.bf-inhalt .bk-raster{gap:8px 4px}
.bf-inhalt .bk-viele{--bk:50px}
.bf-inhalt .bk-mit{opacity:0;transform:scale(.3)}
.bf.is-auf .bf-inhalt .bk-mit{animation:bf-kachel .32s cubic-bezier(.2,1.5,.4,1) forwards;animation-delay:calc(var(--i) * 90ms + (var(--bf-warte, 0ms)))}
.bf.mit-kiste{--bf-warte:260ms}
.bf.is-fertig .bf-inhalt .bk-mit{animation:none;opacity:1;transform:none}
@keyframes bf-kachel{to{opacity:1;transform:none}}
.bf-ok{width:100%}
@media (prefers-reduced-motion:reduce){.bf-karte,.bf-strahlen,.bf-kiste,.bf-inhalt .bk-mit{animation:none!important;opacity:1;transform:none}}

/* ---- Shop: Kisten als Bild, Öffnen 1× / 10× ---- */
.ware-bild > img.kiste-bild{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,.55))}
.ware-preise{display:flex;margin:8px -10px 0}
.ware-preise > .ware-preis{flex:1 1 0;min-width:0;margin:0;gap:3px;padding:0 3px;font-size:15px} .ware-preise > .ware-preis .icon{width:13px;height:13px}
.ware-preise > .ware-preis + .ware-preis{border-left:1px solid rgba(0,0,0,.35)}
.ware-preis[data-x]::before{content:attr(data-x);font:800 12px/1 var(--font-ui);opacity:.85;margin-right:-2px}
.ware-preis .ware-x{font:800 12px/1 var(--font-ui);opacity:.85;margin-right:-2px}
    </style>
    <style>
/* =====================================================================
   KI-BILDER (Alexander 7.10.: „alles mit KI-Bildern, sieht besser aus“) – überschreibt das gezeichnete Aussehen.
   Rahmen/Knöpfe dehnen sich per border-image (Ecken fest, Mitte gedehnt); Symbole als Hintergrund, das SVG-<use> bleibt (Karte/Tests).

   GRUNDFORM FENSTER (EINE für alle – neue Fenster nur daraus bauen, nichts Eigenes zeichnen):
     .ki-fenster   Fenster-Rahmen ui_rahmen + dunkler Grund (schon dran: .panel, .hh, .lvlup-card, .marker-sheet, #citySheet)
     .phead        Kopfzeile: Wappen/Symbol · Überzeile (.overline) + Titel (.ptitle) · rotes X (.btn-x); darunter die Trennlinie ui_linie
     .tabs > .tab  Reiter ui_reiter, aktiv (.active) ui_reiter_an · Unter-Reiter/Wahl (.p5-chip, .seg button): ui_k_chip, aktiv ui_k_gold
     .ki-karte     Listen-Karte ui_karte (Zeile/Kasten im Fenster), .ki-karte--an hervorgehoben ui_karte_an (abholbar/fertig)
                   (schon dran: KI_KARTE unten – .quest, .ach, .logRow, .stat, .inbox-row, …)
     Knöpfe        .btn--primary Gold (gedrückt ui_k_gold_an) · .btn--secondary Dunkel · .btn--danger Rot · :disabled Grau · .chip Schildchen
     Kacheln       [data-r="grau|gruen|blau|lila|gold|rot"] ui_kachel_* · .tile.empty ui_platz
     Hinweis       .notice wie Listen-Karte (ui_hinweis ist frei – früher die Anleitung)
     Balken        .pass-bar/.ach-sum-bar/.ki-balken Rahmen ui_balken (Füllung <i> bleibt Code)
     Symbole       automatisch: <svg class="icon"><use href="#i-…"> → bilder/ui_sym_*.webp (Liste unten)
   ===================================================================== */
:root{
  --ui-rund:url(bilder/ui_rund.webp); --ui-rund-an:url(bilder/ui_rund_an.webp);
}
/* Ladebild: der dunkle Grund hinter dem Titel läuft rundum weich aus (closest-side: nie eine harte Kante am Kastenrand) */
.splash-top::before{inset:-70px -60px;background:radial-gradient(closest-side at 50% 55%,rgba(6,10,28,.72),rgba(6,10,28,.35) 60%,transparent)}
/* solange das Ladebild steht: HUD, Leiste und Kartenknöpfe gar nicht zeichnen – sonst lädt der Browser ihre Bilder vor dem Titelbild */
body:has(> #splash:not(.is-leaving)) :is(#hud,#cornerButtons,#mapControls,#midBar){display:none}
/* Symbol-Bild statt SVG-Zeichnung: das <svg class="icon"> bleibt (Größe, Platz), nur seine Linien verschwinden */
.ki-sym > use,.nav-btn > .icon > use,.mapctl button > .icon > use,.btn-x > .icon:has(> use[href="#i-close"]) > use{display:none}

/* ---------------- HUD oben ---------------- */
.hud-me .avatar-ring{overflow:visible}
.hud-me .avatar-ring::after{content:"";position:absolute;inset:-6px;background:url(bilder/ui_ring.webp) center/100% 100% no-repeat;pointer-events:none}
.hud-me .lvl{border:0;background:url(bilder/ui_stufe.webp) center/100% 100% no-repeat;box-shadow:none;min-width:19px;height:23px;right:-9px;bottom:-9px;padding:0 3px 3px;
  text-shadow:0 1px 2px #000}
/* EINE Reihe: Münzen · Edelsteine · Truppen · Holz · Stein · Eisen – kleine Kapseln (Symbol links, Zahl rechts, fmtHud höchstens 5 Zeichen) */
.hud-werte{background:none;border:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;gap:2px;padding:0;height:24px;margin-top:6px}
.hud{z-index:calc(var(--z-hud) + 1)}   /* die Tippflächen der Kapseln liegen über dem Streifen darunter */
.hud-werte .res-roh{display:contents}
.hud-werte .res{position:relative;flex:1 1 auto;min-width:max-content;height:24px;padding:0 3px 0 20px;gap:0;justify-content:center;border-style:solid;border-width:0;
  border-image:url(bilder/ui_kapsel.webp) 20 30 20 90 fill / 6px 6px 6px 21px stretch}
.hud-werte .res > .icon{position:absolute;left:1px;top:50%;width:19px;height:19px;margin-top:-10px}
.hud-werte .res b{overflow:visible;font:600 11px/1 var(--font-ui);letter-spacing:-.02em;color:var(--tx-1);text-shadow:0 1px 2px #000}
.hud-werte button.res::before{content:"";position:absolute;left:0;right:0;top:50%;height:var(--k-tipp);transform:translateY(-50%)}   /* Tippfläche 44 px */
#hudRoh.on [data-roh]{filter:brightness(1.1)}
.roh-blase{position:fixed;z-index:var(--z-toast);display:flex;flex-wrap:wrap;align-items:center;gap:2px 6px;max-width:240px;padding:6px 10px;
  font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-1);border-style:solid;border-width:0;border-image:url(bilder/ui_karte_an.webp) 24 fill / 8px stretch}
.roh-blase .icon{width:16px;height:16px} .roh-blase small{flex:1 1 100%;color:var(--gold-200);font-size:var(--fs-11)}
@media (min-width:900px) and (min-height:501px){ .hud-werte{flex:0 1 640px} .hud-werte .res{flex:0 0 84px;min-width:84px;padding-left:24px} .hud-werte .res b{font-size:13px;min-width:0;text-align:center} }   /* Desktop: gleich breite Kapseln (fmtHud ≤ 5 Zeichen), jede Zahl mittig (vorher 6,2em-Feld: Münzen links, Holz mittig) */
/* Event-Streifen: rotes Band statt lila Verlauf */
.mb-chip.is-tour{background:none;border-color:transparent;border-style:solid;border-width:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;
  padding:0 18px 0 16px;border-image:url(bilder/ui_band_rot.webp) 22 70 22 70 fill / 7px 22px 7px 22px stretch;color:#fff3e6}
.mb-chip.is-tour i{color:#ffe1c8}
.badge{border:0;background:url(bilder/ui_punkt.webp) center/100% 100% no-repeat;text-shadow:0 1px 1px rgba(0,0,0,.6)}

/* ---------------- Leiste unten (Dock) ---------------- */
.nav{background:#07090c;border-top:0;border-style:solid;border-width:0;border-image:url(bilder/ui_dock.webp) 30 60 30 60 fill / 9px 30px 6px 30px stretch}
.nav::before{display:none}
.nav-btn > .icon{border:0;border-radius:50%;padding:0;box-shadow:none;background:var(--ki-bild,none) center/60% auto no-repeat,var(--ui-rund) center/100% 100% no-repeat;transition:none}
.nav-btn.active > .icon,.nav-btn:hover > .icon{border:0;box-shadow:none;background:var(--ki-bild,none) center/62% auto no-repeat,var(--ui-rund-an) center/100% 100% no-repeat}
.nav{padding-bottom:var(--safe-bd)}   /* Beschriftung immer über der Home-Leiste des iPhones */
.nav-btn{gap:1px;justify-content:center} .nav-btn > .icon{width:44px;height:44px}
.nav-btn .nav-l{font-size:10px;color:var(--gold-100);text-shadow:0 1px 2px #000,0 0 4px #000}
@media (max-width:899px) and (min-height:501px){   /* Handy (Alexander 7.10.): Leiste niedriger, mit Abstand zum Rand – beide Endstücke ganz zu sehen –, Knöpfe enger und kleiner (Tippfläche ≥ 44 px) */
  :root{--dock-h:56px}
  .nav{left:calc(var(--safe-l) + 8px);right:calc(var(--safe-r) + 8px);bottom:var(--safe-bd);height:var(--dock-h);padding:0 24px;background:none;align-items:center;grid-template-columns:repeat(6,minmax(44px,56px));justify-content:center;column-gap:2px;
    border-image-width:7px 22px 5px 22px}
  /* Ring und Symbol als Hintergrund des Knopfs (nicht des SVG – Safari setzt ein SVG-Hintergrundbild nicht mittig); das SVG bleibt als Platzhalter */
  .nav{align-items:stretch}
  .nav-btn{--ki-gr:auto 20px;justify-content:flex-start;padding:7px 0 5px;background:var(--ki-bild,none) center 13px/var(--ki-gr) no-repeat,var(--ui-rund) center 7px/32px 32px no-repeat}   /* zwischen oberem und unterem Leistenrand */
  .nav-btn.active,.nav-btn:hover{background:var(--ki-bild,none) center 13px/var(--ki-gr) no-repeat,var(--ui-rund-an) center 7px/32px 32px no-repeat}
  .nav-btn > .icon,.nav-btn.active > .icon,.nav-btn:hover > .icon{width:32px;height:32px;background:none}
  #bundBtn,#goalsBtn{--ki-gr:22px auto}   /* breite Symbole: nach der Breite */
  .nav-btn .nav-l{font-size:9px;letter-spacing:0}   /* 6 Knöpfe: „Rucksack“ passt in seine Spalte */
  body::after{content:"";position:fixed;left:0;right:0;bottom:0;height:var(--safe-bd);z-index:var(--z-dock);background:#07090c;pointer-events:none}   /* die Home-Leiste des iPhones: dunkler Grund UNTER der Leiste */
}
@media (min-width:900px) and (min-height:501px){   /* Desktop: dieselbe schlanke Leiste (nur unten mittig statt am Rand) */
  .nav{padding:2px 30px 0;gap:4px;border:0;border-radius:0;box-shadow:none;background:none;-webkit-backdrop-filter:none;backdrop-filter:none;border-image-width:7px 22px 5px 22px}
  .nav-btn{width:60px;height:54px;gap:1px} .nav-btn > .icon{width:36px;height:36px}
  .nav-l{font:600 10px/1 var(--font-ui);letter-spacing:.04em;text-transform:uppercase}
}
#cityNavBtn{--ki-bild:url(bilder/ui_dock_burg.webp)} body.in-stadt #cityNavBtn{--ki-bild:url(bilder/ui_fahne.webp)}
#bundBtn{--ki-bild:url(bilder/ui_dock_bund.webp)} #battleLogBtn{--ki-bild:url(bilder/ui_dock_kampf.webp)}
#goalsBtn{--ki-bild:url(bilder/ui_dock_events.webp)} #rucksackBtn{--ki-bild:url(bilder/ui_dock_rucksack.webp)} #shopBtn{--ki-bild:url(bilder/ui_dock_shop.webp)} #profileBtn{--ki-bild:url(bilder/ui_dock_krone.webp)}

/* ---------------- Karten-Knöpfe ---------------- */
.mapctl{gap:6px;background:none;border:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
.mapctl button,.mapctl button + button{border:0;border-radius:50%;background:var(--ui-rund) center/100% 100% no-repeat}
.mapctl button:hover,.mapctl button:active,.mapctl button.on{background:var(--ui-rund-an) center/100% 100% no-repeat}
.mapctl .icon{width:30px;height:30px;background:var(--ki-bild) center/contain no-repeat}
#zoomInBtn{--ki-bild:url(bilder/ui_zoom_rein.webp)} #zoomOutBtn{--ki-bild:url(bilder/ui_zoom_raus.webp)} #homeBtn{--ki-bild:url(bilder/ui_kompass.webp)}
#markerBtn{--ki-bild:url(bilder/ui_fahne.webp)} #armyBtn{--ki-bild:url(bilder/ui_armee.webp)}
.mapctl button:disabled .icon{opacity:.45}

/* ---------------- Knöpfe (Schrift bleibt Code) ---------------- */
.btn--primary,.btn--secondary,.btn--danger,.btn:disabled{border-style:solid;border-color:transparent;box-shadow:none;background:none;border-width:0;
  border-image:var(--k-bild) 30 40 30 40 fill / 11px 14px 11px 14px stretch}
.btn--primary:not(.btn--sm):not(.btn--chip),.btn--secondary:not(.btn--sm):not(.btn--chip),.btn--danger:not(.btn--sm):not(.btn--chip){padding-left:18px;padding-right:18px}   /* Schrift nicht auf den Spitzen links/rechts */
.btn--primary{--k-bild:url(bilder/ui_k_gold.webp);color:#2a1904;text-shadow:0 1px 0 rgba(255,236,190,.5)}
.btn--primary:active{--k-bild:url(bilder/ui_k_gold_an.webp)}
.btn--secondary{--k-bild:url(bilder/ui_k_dunkel.webp)}
.btn--danger{--k-bild:url(bilder/ui_k_rot.webp)}
.btn:disabled{--k-bild:url(bilder/ui_k_grau.webp);color:var(--tx-3);text-shadow:0 1px 2px #000}
.btn--chip.btn--secondary,.btn--chip.btn--primary{border-image:var(--k-bild) 30 40 30 40 fill / 9px 12px 9px 12px stretch}
.chip:not(.chip--rar):not(.chip--scouted){border:0;background:none;border-style:solid;border-image:url(bilder/ui_k_chip.webp) 26 fill / 10px stretch}

/* ---------------- Grundform Fenster: Rahmen, Kopfzeile, Schließen, Reiter, Trennlinie ---------------- */
/* der Rahmen ist der eigene Rand jedes Fensters (nicht ein darübergelegtes ::before): immer sichtbar, egal welcher Reiter und wie geöffnet; der Inhalt liegt nie darunter */
.panel{border:solid transparent;border-width:12px 12px 8px;border-image:url(bilder/ui_rahmen.webp) 44 / 12px 12px 8px stretch;background-clip:border-box}
.panel::before{content:none} .panel .sheet-grab{display:none}   /* kein grauer Griff – der Rahmen ist überall gleich */
/* Fenster-Inhalt rollt weiter: unten läuft er weich aus (Hinweis „da kommt noch mehr“) statt hart am Rahmen abgeschnitten – am Ende keine Blende */
@property --pb-blende{syntax:"<length>";inherits:false;initial-value:0px}
.panel > .pbody{-webkit-mask-image:linear-gradient(180deg,#000 calc(100% - var(--pb-blende)),transparent);mask-image:linear-gradient(180deg,#000 calc(100% - var(--pb-blende)),transparent)}
@keyframes pb-blende{0%,94%{--pb-blende:30px} 100%{--pb-blende:0px}}
@supports (animation-timeline:scroll()){ .panel > .pbody{animation:pb-blende linear both;animation-timeline:scroll(self)} }
.hh::before{border:16px solid transparent;border-image:url(bilder/ui_rahmen.webp) 44 / 16px stretch}
.ki-fenster,.marker-sheet{border:0;border-style:solid;border-image:url(bilder/ui_rahmen.webp) 44 / 16px stretch;background:var(--noise),var(--panel-bg);border-radius:0}
.marker-sheet{padding:16px}
/* gleicher Innenabstand links und rechts: der Inhalt bleibt innerhalb des Rahmens (16 px Rand + 4 px Luft) */
.panel > :is(.phead,.pbody,.pfoot,.p5-chips){padding-left:8px;padding-right:8px} .hh{padding-left:20px;padding-right:20px}
#citySheet{border-style:solid;border-width:1px 1px 0;border-image:url(bilder/ui_rahmen.webp) 44 / 16px stretch;border-radius:0}
.phead::after{width:160px;height:10px;background:url(bilder/ui_linie.webp) center/100% 100% no-repeat}
.btn-x{border:0}
.btn-x > .icon:has(> use[href="#i-close"]){width:32px;height:32px;background:url(bilder/ui_zu.webp) center/contain no-repeat}   /* (nur „Schließen“ – andere runde Knöpfe wie „Info“ behalten ihr Zeichen) */
.btn-x:hover{border:0;filter:brightness(1.12)}
.tabs{background:none;border-bottom:0;gap:3px;padding:4px 4px 0}
.tab,.tab + .tab{box-shadow:none;border-style:solid;border-width:0;border-image:url(bilder/ui_reiter.webp) 30 40 14 40 fill / 10px 6px 5px 6px stretch}
.tab.active{background:none;border-image:url(bilder/ui_reiter_an.webp) 30 40 14 40 fill / 10px 6px 5px 6px stretch}
.tab.active::after,.tab.active::before{display:none}
@container tabs (max-width:420px){ .tab{font:600 10.5px/1 var(--font-ui);letter-spacing:0;padding:0 1px} }   /* Handy: schmale Schrift – „Einstellungen“, „Thron-Punkte“ passen ganz in den Reiter */
.sect::after{height:8px;background:url(bilder/ui_linie.webp) left center/auto 100% no-repeat;background-size:100% 100%}
/* ---------------- Symbole überall (HTML; die Karte zeichnet weiter aus den SVG-Pfaden, 01a glyph) ---------------- */
:where(svg.icon:has(> use[href="#i-castle"]),svg.icon:has(> use[href="#i-star"]),svg.icon:has(> use[href="#i-crown"]),svg.icon:has(> use[href="#i-rank"]),svg.icon:has(> use[href="#i-gear"]),svg.icon:has(> use[href="#i-goal"]),svg.icon:has(> use[href="#i-lock"]),svg.icon:has(> use[href="#i-check"]),svg.icon:has(> use[href="#i-attack"]),svg.icon:has(> use[href="#i-scout"]),svg.icon:has(> use[href="#i-recall"]),svg.icon:has(> use[href="#i-multiattack"]),svg.icon:has(> use[href="#i-tower"]),svg.icon:has(> use[href="#i-defense"]),svg.icon:has(> use[href="#i-losses"]),svg.icon:has(> use[href="#i-upgrade"]),svg.icon:has(> use[href="#i-hourglass"]),svg.icon:has(> use[href="#i-battlelog"]),svg.icon:has(> use[href="#i-bund"]),svg.icon:has(> use[href="#i-event"]),svg.icon:has(> use[href="#i-shop"]),svg.icon:has(> use[href="#i-flag"]),svg.icon:has(> use[href="#i-back"]),svg.icon:has(> use[href="#i-coin"]),svg.icon:has(> use[href="#i-gem"]),svg.icon:has(> use[href="#i-troops"]),svg.icon:has(> use[href="#i-wood"]),svg.icon:has(> use[href="#i-stone"]),svg.icon:has(> use[href="#i-iron"]),svg.icon:has(> use[href="#i-weapon"]),svg.icon:has(> use[href="#i-armor"]),svg.icon:has(> use[href="#i-shield"]),svg.icon:has(> use[href="#i-boots"]),svg.icon:has(> use[href="#i-points"])) > use{display:none}
:where(svg.icon:has(> use[href="#i-castle"]),svg.icon:has(> use[href="#i-star"]),svg.icon:has(> use[href="#i-crown"]),svg.icon:has(> use[href="#i-rank"]),svg.icon:has(> use[href="#i-gear"]),svg.icon:has(> use[href="#i-goal"]),svg.icon:has(> use[href="#i-lock"]),svg.icon:has(> use[href="#i-check"]),svg.icon:has(> use[href="#i-attack"]),svg.icon:has(> use[href="#i-scout"]),svg.icon:has(> use[href="#i-recall"]),svg.icon:has(> use[href="#i-multiattack"]),svg.icon:has(> use[href="#i-tower"]),svg.icon:has(> use[href="#i-defense"]),svg.icon:has(> use[href="#i-losses"]),svg.icon:has(> use[href="#i-upgrade"]),svg.icon:has(> use[href="#i-hourglass"]),svg.icon:has(> use[href="#i-battlelog"]),svg.icon:has(> use[href="#i-bund"]),svg.icon:has(> use[href="#i-event"]),svg.icon:has(> use[href="#i-shop"]),svg.icon:has(> use[href="#i-flag"]),svg.icon:has(> use[href="#i-back"]),svg.icon:has(> use[href="#i-coin"]),svg.icon:has(> use[href="#i-gem"]),svg.icon:has(> use[href="#i-troops"]),svg.icon:has(> use[href="#i-wood"]),svg.icon:has(> use[href="#i-stone"]),svg.icon:has(> use[href="#i-iron"]),svg.icon:has(> use[href="#i-weapon"]),svg.icon:has(> use[href="#i-armor"]),svg.icon:has(> use[href="#i-shield"]),svg.icon:has(> use[href="#i-boots"]),svg.icon:has(> use[href="#i-points"])){background:var(--ki-sym) center/contain no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.55))}
svg.icon:has(> use[href="#i-castle"]){--ki-sym:url(bilder/ui_sym_burg.webp)} svg.icon:has(> use[href="#i-star"]){--ki-sym:url(bilder/ui_sym_stern.webp)} svg.icon:has(> use[href="#i-crown"]){--ki-sym:url(bilder/ui_sym_krone.webp)} svg.icon:has(> use[href="#i-rank"]){--ki-sym:url(bilder/ui_sym_pokal.webp)} svg.icon:has(> use[href="#i-gear"]){--ki-sym:url(bilder/ui_sym_zahnrad.webp)} svg.icon:has(> use[href="#i-goal"]){--ki-sym:url(bilder/ui_sym_ziel.webp)} svg.icon:has(> use[href="#i-lock"]){--ki-sym:url(bilder/ui_sym_schloss.webp)} svg.icon:has(> use[href="#i-check"]){--ki-sym:url(bilder/ui_sym_haken.webp)} svg.icon:has(> use[href="#i-attack"]){--ki-sym:url(bilder/ui_sym_schwert.webp)} svg.icon:has(> use[href="#i-scout"]){--ki-sym:url(bilder/ui_sym_spaeher.webp)} svg.icon:has(> use[href="#i-recall"]){--ki-sym:url(bilder/ui_sym_rueckzug.webp)} svg.icon:has(> use[href="#i-multiattack"]){--ki-sym:url(bilder/ui_sym_pfeile.webp)} svg.icon:has(> use[href="#i-tower"]){--ki-sym:url(bilder/ui_sym_turm.webp)} svg.icon:has(> use[href="#i-defense"]){--ki-sym:url(bilder/ui_sym_turm.webp)} svg.icon:has(> use[href="#i-losses"]){--ki-sym:url(bilder/ui_sym_verluste.webp)} svg.icon:has(> use[href="#i-upgrade"]){--ki-sym:url(bilder/ui_sym_aufstieg.webp)} svg.icon:has(> use[href="#i-hourglass"]){--ki-sym:url(bilder/ui_sym_zeit.webp)} svg.icon:has(> use[href="#i-battlelog"]){--ki-sym:url(bilder/ui_sym_rolle.webp)} svg.icon:has(> use[href="#i-bund"]){--ki-sym:url(bilder/ui_dock_bund.webp)} svg.icon:has(> use[href="#i-event"]){--ki-sym:url(bilder/ui_dock_events.webp)} svg.icon:has(> use[href="#i-shop"]){--ki-sym:url(bilder/ui_dock_shop.webp)} svg.icon:has(> use[href="#i-flag"]){--ki-sym:url(bilder/ui_fahne.webp)} svg.icon:has(> use[href="#i-back"]){--ki-sym:url(bilder/ui_zurueck.webp)} svg.icon:has(> use[href="#i-coin"]){--ki-sym:url(bilder/ui_res_muenzen.webp)} svg.icon:has(> use[href="#i-gem"]){--ki-sym:url(bilder/ui_res_edelstein.webp)} svg.icon:has(> use[href="#i-troops"]){--ki-sym:url(bilder/ui_res_truppen.webp)} svg.icon:has(> use[href="#i-wood"]){--ki-sym:url(bilder/ui_res_holz.webp)} svg.icon:has(> use[href="#i-stone"]){--ki-sym:url(bilder/ui_res_stein.webp)} svg.icon:has(> use[href="#i-iron"]){--ki-sym:url(bilder/ui_res_eisen.webp)} svg.icon:has(> use[href="#i-weapon"]){--ki-sym:url(bilder/ui_sym_waffe.webp)} svg.icon:has(> use[href="#i-armor"]){--ki-sym:url(bilder/ui_sym_ruestung.webp)} svg.icon:has(> use[href="#i-shield"]){--ki-sym:url(bilder/ui_sym_schild.webp)} svg.icon:has(> use[href="#i-boots"]){--ki-sym:url(bilder/ui_sym_stiefel.webp)} svg.icon:has(> use[href="#i-points"]){--ki-sym:url(bilder/ui_res_punkte.webp)}

/* ---------------- Belohnungs-Kacheln je Seltenheit, leerer Platz ---------------- */
.tile[data-r],.item-icon[data-r]{border-color:transparent;box-shadow:none;background:var(--ki-kachel) center/100% 100% no-repeat}
.tile[data-r]::before{display:none} .tile[data-r] > .icon{color:#fff8ea;filter:drop-shadow(0 1px 2px rgba(0,0,0,.8))}
[data-r="grau"]{--ki-kachel:url(bilder/ui_kachel_grau.webp)} [data-r="gruen"]{--ki-kachel:url(bilder/ui_kachel_gruen.webp)} [data-r="blau"]{--ki-kachel:url(bilder/ui_kachel_blau.webp)}
[data-r="lila"]{--ki-kachel:url(bilder/ui_kachel_lila.webp)} [data-r="gold"]{--ki-kachel:url(bilder/ui_kachel_gold.webp)} [data-r="rot"]{--ki-kachel:url(bilder/ui_kachel_rot.webp)}
.tile.empty{border:0;background:url(bilder/ui_platz.webp) center/100% 100% no-repeat}

/* ---------------- Listen-Karten, Balken ---------------- */
.ach{border:0;border-style:solid;background:none;border-image:url(bilder/ui_karte.webp) 24 fill / 8px stretch}
.ach.is-ready{border-image:url(bilder/ui_karte_an.webp) 24 fill / 8px stretch}
.pass-bar,.ach-sum-bar{height:12px;padding:3px 11px;border-radius:0;background:none;border-style:solid;border-width:0;overflow:visible;
  border-image:url(bilder/ui_balken.webp) 12 40 12 40 fill / 5px 14px 5px 14px stretch} .pass-bar i,.ach-sum-bar i{border-radius:3px}

/* ---------------- Aufstieg: Strahlen, Wappen mit Krone, Lorbeer ---------------- */
.lvlup-card{border:0;border-style:solid;border-image:url(bilder/ui_rahmen.webp) 44 fill / 16px stretch;background:none}
.lvlup-card::before{background:url(bilder/ui_strahlen.webp) center/contain no-repeat;-webkit-mask-image:none;mask-image:none;opacity:.8}
.lvlup-badge{width:84px;height:96px;border:0;border-radius:0;box-shadow:none;background:url(bilder/ui_wappen.webp) center/contain no-repeat;padding-top:16px;isolation:isolate}
.lvlup-badge::after{content:"";position:absolute;inset:-6px -26px -10px;background:url(bilder/ui_lorbeer.webp) center/contain no-repeat;pointer-events:none;z-index:-1}
.lvlup-rule{height:10px;background:url(bilder/ui_linie.webp) center/100% 100% no-repeat}

/* ---------------- Listen-Karten in allen Fenstern (Shop, Events, Bündnis, Kampf, Berichte, Pass, Rangliste, Einstellungen, Gebäude) ---------------- */
:is(.ki-karte,.quest,.ach,.logRow,.stat,.force,.inbox-row,.barb-card,.rp-stat,.rp-bld,.rp-last,.rp-pass,.rp-bund,.pl-zelle,.pass-how-l,.ach-sum,.pass-hero,
  .pass-prem,.pass-old,.daily-row,.title-row,.forge-row,.fo-row,.fo-detail,.bd-zeile,.bd-form,.anf,.gate-ctl,.city-vgl,.shop-info,.skin-card,.crest-card,.statChip,.notice,
  .throne-status,.p5-naechste,.ach-done summary,.set-zeile,.barb-rank li,.marker-input,.troop-in,.from-sel,.ap-kopf,.ap-hchip,.inbox-empty,.empty-state,.lb-row,.rank-row,.p5-zeile,.lk-mid,.lk-card){border-radius:0!important;box-shadow:none;
  border-image:url(bilder/ui_karte.webp) 24 fill / 8px stretch!important}   /* (!important: Grundform gilt immer – auch gegen ältere „border:“-Kurzregeln mit #id) */
:is(.ki-karte--an,.ach.is-ready,.quest.is-done:not(.is-claimed),.pl-zelle.is-ready,.inbox-row.is-gold,.barb-rank li.me,.logRow.is-new,.ap-hchip.on,.bd-gk,.daily-day.is-today){border-image:url(bilder/ui_karte_an.webp) 24 fill / 8px stretch!important}
.set-zeile{padding:0 10px;margin-bottom:4px} .set-zeile:last-child{border-bottom:0}
/* Unter-Reiter und Wahl-Knöpfe: Schildchen, aktiv gold */
:is(.p5-chip,.seg:not(.hero-seg) > button,.look-title,.marker-presets button,.set-wahl button){border-radius:0!important;box-shadow:none;
  border-image:url(bilder/ui_k_chip.webp) 26 fill / 9px stretch!important}
#goalsTabs.p5-chips{gap:4px;padding-left:8px;padding-right:8px} #goalsTabs .p5-chip{padding:0 8px;gap:4px}   /* 5 Ereignis-Chips (mit Lager) passen auch ins schmale Desktop-Fenster */
:is(.p5-chip.active,.seg:not(.hero-seg) > button.on,.look-title.on,.marker-presets button.on,.set-wahl button.on){border-image:url(bilder/ui_k_gold.webp) 30 40 30 40 fill / 9px 12px 9px 12px stretch!important;color:#2a1904;text-shadow:0 1px 0 rgba(255,236,190,.5)}
:is(.seg:not(.hero-seg) > button):disabled{border-image:url(bilder/ui_k_grau.webp) 30 40 30 40 fill / 9px 12px 9px 12px stretch!important}
.ki-balken{border-style:solid;border-width:0;border-image:url(bilder/ui_balken.webp) 12 40 12 40 fill / 5px 14px 5px 14px stretch}
/* Wappen-Feld im Fenster-Kopf (.emblem): Item-Platz statt gezeichnetem Kasten; Stufe als Schildchen */
.emblem{border:0;border-radius:0;box-shadow:none;background:url(bilder/ui_platz.webp) center/100% 100% no-repeat}
:is(.emblem,.rp-crest,#pAvatarRing) .lvl{border:0;background:url(bilder/ui_stufe.webp) center/100% 100% no-repeat;box-shadow:none;height:22px;padding-bottom:3px;text-shadow:0 1px 2px #000}
.ap-spaehen{border-radius:0;background:none;border-image:url(bilder/ui_k_dunkel.webp) 30 40 30 40 fill / 8px 10px 8px 10px stretch!important}
/* Schieberegler: Spur im Balken-Rahmen, Knopf als Edelstein-Knopf */
.slider::-webkit-slider-runnable-track{height:12px;border:0;border-radius:0;border-style:solid;border-image:url(bilder/ui_balken.webp) 12 40 12 40 fill / 5px 14px 5px 14px stretch}
.slider::-webkit-slider-thumb{width:26px;height:26px;margin-top:-7px;border:0;border-radius:50%;background:url(bilder/ui_edelstein.webp) center/100% 100% no-repeat;box-shadow:none}
.slider::-moz-range-track{height:12px;border-radius:0;background:url(bilder/ui_balken.webp) center/100% 100% no-repeat}
.slider::-moz-range-thumb{width:26px;height:26px;border:0;background:url(bilder/ui_edelstein.webp) center/100% 100% no-repeat}
/* Shop-Angebote, tägliche Belohnung, Bündnis-Start: Rahmen der Listen-Karte um den eigenen (farbigen) Grund */
:is(.ware,.daily,.bd-start){border-radius:0!important;border-image:url(bilder/ui_karte.webp) 24 / 8px stretch!important}
.daily-day{border-radius:0!important;border-image:url(bilder/ui_platz.webp) 30 fill / 8px stretch!important}
:is(.pill,.ware-link){border-radius:0!important;background:none;border-image:url(bilder/ui_k_chip.webp) 26 fill / 9px stretch!important}
.ware-preis{border-radius:0!important;border-image:url(bilder/ui_k_dunkel.webp) 30 40 30 40 fill / 9px 12px 9px 12px stretch!important}
/* Preise überall gleich (Alexander 7.10.): helle Schrift, wenn es reicht – rot, wenn nicht (nie grau); eine Größe; volle Zahl mit Punkt */
.ware-preis,.ware-preis.thron{color:#fbeec9;font:800 15px/1 var(--font-ui);text-shadow:0 1px 2px #000;background:none}
.ware-preis.zu-teuer,.ware-preis:disabled{color:#ff8d82}
.ware-preis .icon{width:15px;height:15px}
.ware-preise > .ware-preis{flex-wrap:wrap;align-content:center;row-gap:2px;font-size:15px}   /* 1× / 10×: das Mal klein darüber, der Preis gleich groß wie überall */
.ware-preise > .ware-preis .ware-x,.ware-preis[data-x]::before{flex:1 0 100%;text-align:center;margin:0;font:700 10px/1 var(--font-ui);opacity:.8}
.ware .band{border-style:solid;border-width:0;background:none;border-image:url(bilder/ui_band_gold.webp) 30 70 30 70 fill / 6px 16px 6px 16px stretch;padding:0 16px}

/* ---------------- Symbole je Ort (dritte Lieferung): Basis-Knöpfe, Bauarbeiter, Fähigkeiten, Labor, Rangliste, Bündnis, Einstellungen ---------------- */
:is(#teleportBtn .act-ic > svg.icon,#sendBtn .act-ic > svg.icon,#recallBtn .act-ic > svg.icon,#titleBtn .act-ic > svg.icon,.cb-slot > svg.icon,#skillGrid svg.icon:has(> use[href="#i-attack"]),#skillGrid svg.icon:has(> use[href="#i-troops"]),#skillGrid svg.icon:has(> use[href="#i-defense"]),.fo-node-ic > svg.icon:has(> use[href="#i-coin"]),.fo-node-ic > svg.icon:has(> use[href="#i-crate"]),.fo-node-ic > svg.icon:has(> use[href="#i-castle"]),.fo-node-ic > svg.icon:has(> use[href="#i-send"]),.fo-node-ic > svg.icon:has(> use[href="#i-flag"]),.fo-node-ic > svg.icon:has(> use[href="#i-plus"]),.fo-node-ic > svg.icon:has(> use[href="#i-hourglass"]),[data-rtab="power"] > svg.icon,[data-rtab="caps"] > svg.icon,#profileKennung svg.icon:has(> use[href="#i-attack"]),.bd-rally svg.icon,.bd-hilfe-btn svg.icon,svg.icon:has(> use[href="#i-question"]),svg.icon:has(> use[href="#i-sound"]),svg.icon:has(> use[href="#i-sfx"]),svg.icon:has(> use[href="#i-send"]),svg.icon:has(> use[href="#i-temple"]),svg.icon:has(> use[href="#i-market"]),svg.icon:has(> use[href="#i-sell"])) > use{display:none}
:is(#teleportBtn .act-ic > svg.icon,#sendBtn .act-ic > svg.icon,#recallBtn .act-ic > svg.icon,#titleBtn .act-ic > svg.icon,.cb-slot > svg.icon,#skillGrid svg.icon:has(> use[href="#i-attack"]),#skillGrid svg.icon:has(> use[href="#i-troops"]),#skillGrid svg.icon:has(> use[href="#i-defense"]),.fo-node-ic > svg.icon:has(> use[href="#i-coin"]),.fo-node-ic > svg.icon:has(> use[href="#i-crate"]),.fo-node-ic > svg.icon:has(> use[href="#i-castle"]),.fo-node-ic > svg.icon:has(> use[href="#i-send"]),.fo-node-ic > svg.icon:has(> use[href="#i-flag"]),.fo-node-ic > svg.icon:has(> use[href="#i-plus"]),.fo-node-ic > svg.icon:has(> use[href="#i-hourglass"]),[data-rtab="power"] > svg.icon,[data-rtab="caps"] > svg.icon,#profileKennung svg.icon:has(> use[href="#i-attack"]),.bd-rally svg.icon,.bd-hilfe-btn svg.icon,svg.icon:has(> use[href="#i-question"]),svg.icon:has(> use[href="#i-sound"]),svg.icon:has(> use[href="#i-sfx"]),svg.icon:has(> use[href="#i-send"]),svg.icon:has(> use[href="#i-temple"]),svg.icon:has(> use[href="#i-market"]),svg.icon:has(> use[href="#i-sell"])){background:var(--ki-ort) center/contain no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.55))}
#teleportBtn .act-ic > svg.icon{--ki-ort:url(bilder/ui_sym_verlegen.webp)} #sendBtn .act-ic > svg.icon{--ki-ort:url(bilder/ui_sym_senden.webp)} #recallBtn .act-ic > svg.icon{--ki-ort:url(bilder/ui_sym_sammeln.webp)} #titleBtn .act-ic > svg.icon{--ki-ort:url(bilder/ui_sym_tempelbonus.webp)} .cb-slot > svg.icon{--ki-ort:url(bilder/ui_sym_bauarbeiter.webp)} #skillGrid svg.icon:has(> use[href="#i-attack"]){--ki-ort:url(bilder/ui_skill_angriff.webp)} #skillGrid svg.icon:has(> use[href="#i-troops"]){--ki-ort:url(bilder/ui_skill_truppen.webp)} #skillGrid svg.icon:has(> use[href="#i-defense"]){--ki-ort:url(bilder/ui_skill_verteidigung.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-coin"]){--ki-ort:url(bilder/ui_fo_ertrag.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-crate"]){--ki-ort:url(bilder/ui_fo_traglast.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-castle"]){--ki-ort:url(bilder/ui_fo_burgschutz.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-send"]){--ki-ort:url(bilder/ui_fo_marschtempo.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-flag"]){--ki-ort:url(bilder/ui_fo_kundschaft.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-plus"]){--ki-ort:url(bilder/ui_sym_verwundete.webp)} .fo-node-ic > svg.icon:has(> use[href="#i-hourglass"]){--ki-ort:url(bilder/ui_sym_sammeln.webp)} [data-rtab="power"] > svg.icon{--ki-ort:url(bilder/ui_sym_macht.webp)} [data-rtab="caps"] > svg.icon{--ki-ort:url(bilder/ui_sym_eroberung.webp)} #profileKennung svg.icon:has(> use[href="#i-attack"]){--ki-ort:url(bilder/ui_sym_macht.webp)} .bd-rally svg.icon{--ki-ort:url(bilder/ui_sym_rally.webp)} .bd-hilfe-btn svg.icon{--ki-ort:url(bilder/ui_sym_hilfe.webp)} svg.icon:has(> use[href="#i-question"]){--ki-ort:url(bilder/ui_set_hilfe.webp)} svg.icon:has(> use[href="#i-sound"]){--ki-ort:url(bilder/ui_set_ton.webp)} svg.icon:has(> use[href="#i-sfx"]){--ki-ort:url(bilder/ui_set_ton.webp)} svg.icon:has(> use[href="#i-send"]){--ki-ort:url(bilder/ui_sym_senden.webp)} svg.icon:has(> use[href="#i-temple"]){--ki-ort:url(bilder/ui_sym_tempelbonus.webp)} svg.icon:has(> use[href="#i-market"]){--ki-ort:url(bilder/ui_sym_markt.webp)} svg.icon:has(> use[href="#i-sell"]){--ki-ort:url(bilder/ui_sym_handeln.webp)}

/* ---------------- Rahmen um das Wappen: Saison-Rahmen und Neuling als Bild-Ring, Rang-Rahmen mit Rang-Abzeichen oben ---------------- */
:is(#pAvatarRing,.frame-ring,.lb-crest,.rp-crest,.hud-me .avatar-ring):is([data-frame="bronze"],[data-frame="sz1"],[data-frame="sz2"],[data-frame="sz4"],[data-frame="sz6"],[data-frame="mgut"],[data-frame="king"]){
  background:none!important;box-shadow:none!important;animation:none!important;position:relative;overflow:visible}
:is(#pAvatarRing,.frame-ring,.lb-crest,.rp-crest,.hud-me .avatar-ring)[data-frame]::after{content:"";position:absolute;pointer-events:none;background:var(--ki-rahmen,none) center/100% 100% no-repeat;inset:-12%}
:is(#pAvatarRing,.frame-ring,.lb-crest,.rp-crest)[data-frame]::before{content:"";position:absolute;pointer-events:none;z-index:1;left:50%;top:-22%;width:40%;aspect-ratio:3/4;transform:translateX(-50%);background:var(--ki-rang,none) center/contain no-repeat}
[data-frame="bronze"]{--ki-rahmen:url(bilder/ui_rahmen_neuling.webp)} [data-frame="sz1"]{--ki-rahmen:url(bilder/ui_rahmen_champion.webp)} [data-frame="sz2"]{--ki-rahmen:url(bilder/ui_rahmen_grossadmiral.webp)}
[data-frame="sz4"]{--ki-rahmen:url(bilder/ui_rahmen_admiral.webp)} [data-frame="sz6"]{--ki-rahmen:url(bilder/ui_rahmen_kapitaen.webp)} [data-frame="mgut"]{--ki-rahmen:url(bilder/ui_rahmen_mitte.webp)} [data-frame="king"]{--ki-rahmen:url(bilder/ui_herrscher_rahmen.webp)}
[data-frame="silver"]{--ki-rang:url(bilder/ui_rang_silberritter.webp)} [data-frame="gold"]{--ki-rang:url(bilder/ui_rang_goldfuerst.webp)} [data-frame="platin"]{--ki-rang:url(bilder/ui_rang_platingraf.webp)}
[data-frame="diamond"]{--ki-rang:url(bilder/ui_rang_diamantherzog.webp)} [data-frame="master"]{--ki-rang:url(bilder/ui_rang_meister.webp)} [data-frame="legend"]{--ki-rang:url(bilder/ui_rang_legende.webp)}

/* Tipp auf ein freies Feld der Karte (Merkliste 33): runde KI-Knöpfe im Bogen wie am Gebäude (.cr-btn), Stelle = Nadel auf der Karte */
.feld-ring{position:fixed;left:0;top:0;z-index:44;width:0;height:0;pointer-events:none}
.feld-ring[hidden]{display:none}
.feld-ring .cr-btn{border:0;border-radius:50%;background:var(--ui-rund) center/100% 100% no-repeat;box-shadow:0 4px 12px rgba(0,0,0,.5)}
.feld-ring .cr-btn.is-armed{background-image:var(--ui-rund-an)}
.feld-ring .fr-ic{width:34px;height:34px;background:var(--b) center/contain no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.55))}
.feld-ring .cr-btn small{font-size:11px;text-align:center}   /* „Hierher teleportieren?“ über dem Preis: 2 Zeilen, schmal */
.feld-ring .cr-btn small .icon{width:12px;height:12px;vertical-align:-2px}
/* ---------------- Basis-, Angriffs- und Grenztor-Fenster (8.10.): Werte als Bild + Zahl, runde Knöpfe, nichts überlappt ---------------- */
#islandPopup .ptitle{white-space:normal!important;overflow-wrap:anywhere}   /* „Hauptstadt von …“: lieber zwei Zeilen als abgeschnitten */
.emblem--bild{width:56px;height:56px;background:rgba(0,0,0,.3)} .emblem--bild > svg.icon{display:none}
.emblem--bild .bw-bild{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 3px 4px rgba(0,0,0,.55))}
.bw-werte{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 16px;padding:4px 0}
.bw-wert{display:inline-flex;align-items:center;gap:5px;min-width:0}
.bw-wert img{width:26px;height:26px;flex:none;object-fit:contain;filter:drop-shadow(0 1px 1px rgba(0,0,0,.6))}
.bw-wert b{font:600 16px/1.2 Georgia,serif;color:#eee6d4;white-space:nowrap;font-variant-numeric:tabular-nums}
.bw-wert.is-good b{color:var(--good)} .bw-wert.is-enemy b{color:#ff8d7e}
.tor-hinweis{min-height:40px;align-items:center;background:#1c212a;border:0;border-left:3px solid #d24c40;color:#c0b7a3;font-size:14px}
.tor-hinweis .icon{width:20px;height:20px;flex:none;color:#d24c40}
@keyframes tor-blink{0%,100%{background:#1c212a}40%{background:#4a1d19}} .tor-hinweis.blinkt{animation:tor-blink .5s 2}
.emblem--bild .bw-bild[src*="karte_tor"]{object-fit:cover;transform:scale(1.9)} .emblem--bild{overflow:hidden}
@media (min-width:900px) and (min-height:501px){ body:has(#islandPopup.is-open) .toast.toast{top:calc(var(--safe-t) + var(--hud-top-space));bottom:auto} }   /* Hinweise nie über den Fenster-Knöpfen */
/* runde Knöpfe: Symbol im goldenen Ring (ui_rund), kurzes Wort darunter, Preis klein */
#popupActions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 2px}
#popupActions > .act[style*="inline-block"],#popupActions > .act.act--haupt[style*="inline-block"]{display:flex!important}
#popupActions:not(.mehr-auf) > .act.act--mehr{display:none!important}
#popupActions > .act,#popupActions > .act.act--haupt{flex:0 0 calc((100% - 8px) / 5);max-width:76px;min-width:0;min-height:44px;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px;
  padding:0;border:0;border-radius:0;background:none;box-shadow:none;color:#c0b7a3}
#popupActions > .act > .act-ic,#popupActions > .act.act--haupt > .act-ic{width:52px;height:52px;flex:none;border:0;border-radius:50%;
  background:var(--sym,none) center/28px 28px no-repeat,url(bilder/ui_rund.webp) center/100% 100% no-repeat}
#popupActions > .act:not(:disabled):active > .act-ic{background:var(--sym,none) center/28px 28px no-repeat,url(bilder/ui_rund_an.webp) center/100% 100% no-repeat}
#popupActions > .act > .act-ic > svg.icon{display:none}
#popupActions > #mehrBtn > .act-ic > svg.icon{display:block;width:24px;height:24px;color:var(--gold-200)}
#popupActions > .act > .act-t,#popupActions > .act.act--haupt > .act-t{max-width:100%;font:500 11px/1.2 var(--font-ui);letter-spacing:0;text-transform:none;color:#c0b7a3;white-space:nowrap;overflow:visible}
#popupActions > .act > .act-s,#popupActions > .act.act--haupt > .act-s{max-width:100%;justify-content:center;flex-wrap:wrap;font-size:10px;line-height:1.2;color:var(--tx-3);white-space:normal;text-align:center}
#popupActions > .act.act--haupt > .act-s.is-bad,#popupActions > .act > .act-s.is-bad{color:#ff8d7e}
#cityBtn > .act-s,#sendBtn > .act-s,#titleBtn > .act-s{display:none}
#popupActions > .act:disabled{background:none} #popupActions > .act:disabled > .act-ic{filter:grayscale(1) brightness(.6)} #popupActions > .act:disabled > .act-t{color:var(--tx-4)}
#cityBtn{--sym:url(bilder/ui_sym_burg.webp)} #teleportBtn{--sym:url(bilder/ui_sym_verlegen.webp)} #schildBtn{--sym:url(bilder/ui_sym_friedensschild.webp)} #truppenBtn{--sym:url(bilder/beute_truppen.webp)}
#upgradeBtn{--sym:url(bilder/ui_sym_aufstieg.webp)} #sendBtn{--sym:url(bilder/ui_sym_senden.webp)} #recallBtn{--sym:url(bilder/ui_sym_sammeln.webp)} #multiAttackBtn{--sym:url(bilder/ui_sym_schwert.webp)}
#titleBtn{--sym:url(bilder/ui_sym_krone.webp)} #scoutBtn{--sym:url(bilder/ui_sym_spaeher.webp)} #attackBtn{--sym:url(bilder/ui_sym_schwert.webp)}
/* fremde Basis: Spähen + Angreifen als runde Knöpfe nebeneinander; grau = geht nicht (antippen sagt warum) */
.panel--island.fuss-rund .pfoot{justify-content:center;gap:28px;padding-top:6px}
.panel--island.fuss-rund .pfoot > .btn{flex:0 0 76px;height:auto;min-height:44px;flex-direction:column;gap:2px;padding:0!important;border-image:none;background:none;box-shadow:none;
  font:500 12px/1.2 var(--font-ui);letter-spacing:0;text-transform:none;color:#c0b7a3;text-shadow:none}
.panel--island.fuss-rund .pfoot > .btn > svg.icon{display:none}
.panel--island.fuss-rund .pfoot > .btn::before{content:"";position:static;display:block;width:52px;height:52px;border-radius:50%;inset:auto;
  background:var(--sym,none) center/28px 28px no-repeat,url(bilder/ui_rund.webp) center/100% 100% no-repeat}
.panel--island.fuss-rund .pfoot > .btn:not(:disabled):active::before{background:var(--sym,none) center/28px 28px no-repeat,url(bilder/ui_rund_an.webp) center/100% 100% no-repeat}
.panel--island.fuss-rund .pfoot > .btn:is(:disabled,.is-grau)::before{filter:grayscale(1) brightness(.6)} .panel--island.fuss-rund .pfoot > .btn:is(:disabled,.is-grau){color:#8b8373}
/* Angriff vorbereiten: Hauptheld groß, Zweitheld klein darunter | Startbasis, Angriff gegen Abwehr, Kräfte-Balken – dann Truppen, Leiste, goldener Knopf */
.ap-oben{display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px;align-items:start} .ap-oben--ohne{grid-template-columns:minmax(0,1fr)}
.ap-oben .ap-kopf{position:static;padding-bottom:0;border-bottom:0;background:none}
.ap-oben .versus{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px}
#popupStats .ap-oben .force small,#popupStats .ap-oben .force--foe small[data-foe="sub"]{white-space:normal;overflow:visible;text-overflow:clip;font-size:10px;line-height:1.2}
.ap-oben .ap-bal{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;min-width:0;gap:6px;padding-right:4px} .ap-oben .ap-bal .balance{min-width:30px} .ap-oben .ap-bal .balance-note{font-size:10px;gap:3px;margin:0}
#islandPopup .ap-oben .from-sel{font-size:12px;padding-left:6px;padding-right:22px}
.panel--island:has(.ap-oben){max-height:calc(100dvh - var(--dock-h) - var(--safe-bd) - var(--safe-t) - var(--hud-top-space) - 40px)}   /* Angriff: alles ohne Scrollen sichtbar; darüber Platz für einen Hinweis (2 Zeilen) */
body:has(#islandPopup.is-open) .toast.toast:not(:empty){display:-webkit-box;-webkit-line-clamp:2;max-height:calc(2.7em + 16px);overflow:clip;overflow-clip-margin:content-box}   /* bei offenem Fenster: höchstens 2 ganze Zeilen, dann „…“ */
@media (max-width:899px) and (max-height:700px){ .panel--island:has(.ap-oben) :is(.ap-leiste,.ap-herofx,#popupOverline){display:none}
  .panel--island:has(.ap-oben) .ptitle{font-size:15px;margin:0} #popupStats:has(.ap-oben){gap:4px} .panel--island:has(.ap-oben) .pfoot{padding-top:6px;padding-bottom:6px}
  .ap-oben .force{padding-top:4px!important;padding-bottom:4px!important}
  .panel--island:has(.ap-oben) .pbody{padding-top:6px;padding-bottom:4px} .panel--island:has(.ap-oben) .phead{padding-bottom:6px} .ap-truppen .slider{margin-top:0;margin-bottom:0} }   /* kleines Handy: Zeit steht im Knopf, Truppen im Feld, Kraft bei „Angriff“, Helden-Wirkung beim Draufzeigen */
@media (max-width:380px){ .ap-oben{grid-template-columns:76px minmax(0,1fr)} .ap-oben .ap-hchip.ap-hchip--gross{width:76px;height:94px} .ap-oben .ap-hchip.ap-hchip--klein{width:76px} }
.ap-held{display:flex;flex-direction:column;gap:4px}
.ap-hchip.ap-hchip--gross{flex:none;width:96px;height:118px;padding:0;flex-direction:column;justify-content:flex-end;align-items:stretch;overflow:hidden;
  border:3px solid transparent;border-image:url(bilder/ui_kachel_gold.webp) 30 fill / 3px stretch;background:#0f1217}
.ap-hchip.ap-hchip--gross::after{display:none}
.ap-hchip--gross .hero-pic{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;border:0;border-radius:0}
.ap-hchip--gross .ap-hchip-t{position:relative;padding:12px 4px 3px;background:linear-gradient(180deg,transparent,rgba(0,0,0,.85));align-items:center;text-align:center}
.ap-hchip-leer{position:absolute;inset:0;display:grid;place-items:center;color:var(--gold-200)} .ap-hchip-leer .icon{width:26px;height:26px}
.ap-hchip.ap-hchip--klein{flex:none;width:96px;min-height:44px;padding:2px 4px;gap:4px}
.ap-hchip.ap-hchip--klein::after{display:none}
.ap-hchip--klein .hero-pic{width:24px;height:24px}
.ap-hchip--klein .ap-hchip-leer{position:static;width:24px;flex:none} .ap-hchip--klein .ap-hchip-leer .icon{width:16px;height:16px}
.ap-hchip--klein .ap-hchip-t b,.ap-hchip--klein .ap-hchip-t small{white-space:normal;font-size:10px;line-height:1.15}
.ap-oben > .ap-held{grid-row:1} .ap-oben > .ap-kopf,.ap-oben > .ap-held-wahl{grid-column:2;grid-row:1;min-width:0}
.ap-oben--ohne > .ap-kopf{grid-column:1}
.ap-oben:has(.hero-seg:not([hidden])) > .ap-kopf,.ap-held-wahl:not(:has(.hero-seg:not([hidden]))){display:none}   /* Helden-Auswahl offen: sie steht neben dem Bild, Regler bleiben sichtbar */
.ap-held-wahl .seg.hero-seg{display:flex;flex-wrap:wrap;gap:4px;margin:0;max-height:160px;overflow-y:auto}
.ap-held-wahl .seg.hero-seg > button{flex:none;min-width:max-content;padding:0 10px} .ap-held-wahl .hero-seg2-l{display:none}   /* („Zweitheld · 50 %“ steht in der Kachel) */
#islandPopup .hero-seg button,#islandPopup .ap-truppen .seg button{min-height:44px;height:44px} .ap-truppen .slider{height:28px}
#islandPopup .from-sel{height:44px} #islandPopup .ap-spaehen{min-height:44px}
.ap-truppen{gap:4px}
.ap-truppen .ap-regler{justify-content:flex-start;gap:8px}
.ap-kachel{width:44px;height:44px;flex:none;display:grid;place-items:center;border:3px solid transparent;border-image:url(bilder/ui_kachel_gold.webp) 30 fill / 3px stretch}
.ap-kachel img{width:32px;height:32px;object-fit:contain}
.ap-truppen .val{align-items:center;gap:6px} .ap-truppen .troop-in{height:44px} .ap-max{font:600 15px/1 Georgia,serif;color:var(--tx-3);white-space:nowrap}
.ap-truppen .seg{grid-template-columns:repeat(4,minmax(0,1fr));margin-top:0}
.ap-leiste{display:flex;justify-content:space-around;gap:8px;padding:4px 0}
.ap-leiste span{display:inline-flex;align-items:center;gap:5px;min-width:0} .ap-leiste img{width:22px;height:22px;object-fit:contain;flex:none}
.ap-leiste b{font:600 15px/1.2 Georgia,serif;color:#eee6d4;white-space:nowrap}
#attackBtn.btn--gold:not(:disabled){border-image:url(bilder/ui_band_gold.webp) 30 70 30 70 fill / 8px 22px 8px 22px stretch;color:#1a1206;text-shadow:0 1px 0 rgba(255,236,190,.5);
  font:700 15px/1 Georgia,serif;letter-spacing:0;text-transform:none;padding:0 20px!important;min-height:52px}
#islandPopup .pfoot > #backBtn{flex:0 0 48px;min-width:48px;padding:0!important} #islandPopup .pfoot > #backBtn > span{display:none} #islandPopup .pfoot > #backBtn > .icon{display:block}
#attackBtn.btn--gold > svg.icon{display:none}
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
    <h1 class="splash-title"><span>Open</span> <span>Water</span></h1>
    <div class="splash-sub"><span></span>Erobere die Inseln<span></span></div>
  </div>
  <div class="splash-bottom">
    <p id="splashTipCard" class="splash-tipline"><b>Tipp:</b> <span id="splashTip" class="splash-tip">Späh eine Basis aus, bevor du angreifst – dann siehst du ihre Truppen.</span></p>
    <div class="splash-meta"><span id="splashStatus" class="splash-status">Welt wird erschaffen …</span><span id="splashPct" class="splash-pct">0 %</span></div>
    <div class="splash-bar"><i id="splashFill"></i></div>
  </div>
</div>
<script src="<?= skript('ladebildschirm') ?>"></script>
<canvas id="mapCanvas" aria-label="Weltkarte"></canvas>
<div id="mapVignette" aria-hidden="true"></div>

<!-- HUD: Spielerbild (antippen = Profil) + EINE Reihe Werte (Münzen, Edelsteine, Truppen, Holz, Stein, Eisen); Rohstoff antippen = Ertrag/Std. als Blase -->
<div id="hud" class="hud">
  <button id="hudPlayer" class="hud-me" type="button" title="Profil öffnen">
    <span class="avatar-ring avatar-ring--sm"><span class="avatar"><svg class="icon"><use href="#i-profile"/></svg></span><span id="hudLevel" class="lvl">1</span></span>
    <span class="hud-me-text"><b id="hudName">Du</b><small id="hudRankLine">Bronze</small></span>
  </button>
  <div class="hud-werte">
    <div class="res res--coin" title="Münzen"><svg class="icon"><use href="#i-coin"/></svg><b id="coinCount">0</b></div>
    <div class="res res--gem" title="Edelsteine"><svg class="icon"><use href="#i-gem"/></svg><b id="gemCount">0</b></div>
    <div class="res res--troop" title="Truppen"><svg class="icon"><use href="#i-troops"/></svg><b id="troopCount">0</b></div>
    <span id="hudRoh" class="res-roh" role="group" aria-label="Rohstoffe"><button class="res res--h" type="button" data-roh="h" title="Holz"><svg class="icon"><use href="#i-wood"/></svg><b data-r="h">0</b></button><button class="res res--s" type="button" data-roh="s" title="Stein"><svg class="icon"><use href="#i-stone"/></svg><b data-r="s">0</b></button><button class="res res--e" type="button" data-roh="e" title="Eisen"><svg class="icon"><use href="#i-iron"/></svg><b data-r="e">0</b></button></span>
  </div>
</div>
<div id="rohDrop" class="roh-blase" role="status" hidden></div>

<div id="midBar" class="midbar" hidden></div>

<!-- Navigation (die EINE Ordnung, Abschnitt 26): Karte/Stadt · Bündnis · Kampf · Events · Rucksack · Shop – runde Knöpfe; das Profil über das Spielerbild.
     phone = bottom dock, landscape phone = left rail, desktop = unten Mitte -->
<nav id="cornerButtons" class="nav" aria-label="Hauptmenü">
  <button id="cityNavBtn" class="nav-btn" type="button" title="Stadt: Burg, Gebäude, Forschung, Helden, Rohstoffe"><svg class="icon"><use href="#i-castle"/></svg><span class="nav-l">Stadt</span></button>
  <button id="bundBtn" class="nav-btn" type="button" title="Bündnis"><svg class="icon"><use href="#i-bund"/></svg><span class="nav-l">Bündnis</span><span id="bundBadge" class="badge" style="display:none">0</span></button>
  <button id="battleLogBtn" class="nav-btn" type="button" title="Kampf: Märsche und Berichte"><svg class="icon"><use href="#i-battlelog"/></svg><span class="nav-l">Kampf</span><span id="battleLogBadge" class="badge" style="display:none">0</span></button>
  <button id="goalsBtn" class="nav-btn" type="button" title="Events: Aufgaben, Belohnungen, Erfolge, Pass, Wochen-Event, Thron, Boss"><svg class="icon"><use href="#i-event"/></svg><span class="nav-l">Events</span><span id="goalsBadge" class="badge" style="display:none">0</span></button>
  <button id="rucksackBtn" class="nav-btn" type="button" title="Rucksack: Schilde, Teleporter, Splitter"><svg class="icon"><use href="#i-crate"/></svg><span class="nav-l">Rucksack</span></button>
  <button id="shopBtn" class="nav-btn" type="button" title="Shop: Kisten, Schilde, Teleporter, Thron, Händler, Markt"><svg class="icon"><use href="#i-shop"/></svg><span class="nav-l">Shop</span></button>
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
<div id="feldRing" class="feld-ring" hidden></div>
<div id="markerSheet" class="marker-sheet" hidden>
  <div class="marker-head"><b id="markerTitle">Wegmarke</b><button id="markerClose" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button></div>
  <div class="marker-presets" id="markerPresets"></div>
  <input id="markerText" class="marker-input" maxlength="24" placeholder="Eigener Text …" autocomplete="off">
  <div class="marker-colors" id="markerColors"></div>
  <div class="marker-actions"><button id="markerDelete" class="btn btn--ghost btn--sm" type="button">Entfernen</button><button id="markerSave" class="btn btn--primary btn--sm" type="button">Speichern</button></div>
</div>

<!-- Toast: text-only, JS writes textContent. Empty = hidden. -->
<div id="hint" class="toast" role="status" aria-live="polite"></div>
<!-- Tutorial für neue Spieler (10c2): Dunkel aus vier Teilen um das Loch (fangen die Tipps), Finger, Berater mit 1–2 Sätzen, „Überspringen“ fragt erst -->
<div id="tut" class="tut" hidden>
  <div class="tut-d" data-tut-d="o"></div><div class="tut-d" data-tut-d="u"></div><div class="tut-d" data-tut-d="l"></div><div class="tut-d" data-tut-d="r"></div>
  <div id="tutLoch" class="tut-loch" hidden></div><div id="tutSperre" class="tut-sperre" hidden></div>
  <div id="tutFinger" class="tut-finger" hidden></div>
  <div id="tutBerater" class="tut-berater"><div class="tut-figur"></div><div class="tut-blase"><p id="tutSatz"></p>
    <button id="tutWeiter" class="btn btn--primary btn--sm" type="button" hidden>Weiter</button>
    <span id="tutFrage" class="tut-frage" hidden><button id="tutJa" class="btn btn--secondary btn--sm" type="button">Überspringen</button><button id="tutNein" class="btn btn--primary btn--sm" type="button">Weiter lernen</button></span></div></div>
  <button id="tutWeg" class="tut-weg" type="button">Überspringen</button>
</div>
<div id="tutBanner" class="tut-banner" role="status" hidden></div>

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
#goalsGruppen.tabs{grid-template-columns:repeat(4,minmax(0,1fr))}
#profilePopup #profileTabs.tabs,#rankTabs.tabs{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:auto}   /* Breite nach dem Text: „Einstellungen“, „Thron-Punkte“ bekommen mehr Platz, stoßen nicht an den Rand */
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
/* Events (Blick 6.10.): am Handy passen alle 4 Ereignis-Chips (kurze Namen), Welt-Saison linksbündig, Preise gut lesbar */
@media (max-width:480px){ #goalsTabs{gap:6px;padding-inline:12px} #goalsTabs .p5-chip{padding:0 12px} }
/* Thron-Event (06c): Chip mit Punkt (grün = läuft) und Startzeit, Ablauf, Kuppel-Satz, Rang-Bänder, Herrscher-Fenster */
.p5-chip .ev-st{width:7px;height:7px;border-radius:50%;background:#5b6070;flex:none}
.p5-chip .ev-st.an{background:#5cdb6a;box-shadow:0 0 6px #5cdb6a}
.p5-chip small{font:600 9.5px/1 var(--font-ui);color:var(--tx-3);white-space:nowrap} .p5-chip small:empty{display:none}
.thron-ablauf{display:grid;grid-template-columns:5fr 1.3fr 2.6fr;gap:3px;margin:6px 0}
.thron-ablauf div{padding:5px 4px;border-radius:6px;background:rgba(255,255,255,.04);border:1px solid var(--line-1);text-align:center;font:600 10.5px/1.2 var(--font-ui);color:var(--tx-3)}
.thron-ablauf b{display:block;color:var(--tx-2);font-size:11px} .thron-ablauf div.jetzt{border-color:var(--gold-300);background:rgba(214,170,90,.14)} .thron-ablauf div.jetzt b{color:var(--gold-100)}
.kuppel-satz{display:flex;gap:8px;align-items:center;padding:6px 8px;margin:6px 0;border-radius:8px;background:rgba(90,160,255,.1);border:1px solid rgba(150,210,255,.35);font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
.thron-karte > .btn{width:100%;margin-top:8px}
.thron-kopf{display:block;width:100%;max-height:160px;object-fit:contain;margin:0 0 6px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.45))}
.thron-herr-zeile{display:flex;align-items:center;gap:10px;width:100%;margin:10px 0 0;padding:8px 10px;border-radius:10px;background:rgba(255,200,80,.12);border:1px solid rgba(255,210,110,.5);color:var(--tx-1);font:600 var(--fs-13)/1.25 var(--font-ui);text-align:left;cursor:pointer}
.thron-herr-zeile img{width:28px;height:28px} .thron-herr-zeile small{display:block;color:var(--tx-3);font-size:11px}
.rang{display:flex;flex-direction:column;gap:5px;margin-bottom:8px}
.rband{display:flex;align-items:center;gap:8px;height:30px;padding:0 10px;border-radius:6px 16px 16px 6px;font:800 13px var(--font-ui);color:#fff;text-shadow:0 1px 2px #000}
.rband.p1{background:linear-gradient(90deg,#b8861f,#f2cf6a 60%,transparent)} .rband.p2{background:linear-gradient(90deg,#7d8790,#d3dbe2 60%,transparent)}
.rband.p3{background:linear-gradient(90deg,#8a4f22,#d08a4f 60%,transparent)} .rband.p4{background:linear-gradient(90deg,#3d5a86,#6f93c8 60%,transparent)}
.rband.p5{background:linear-gradient(90deg,#4a4033,#7a6a52 60%,transparent)} .rband img{width:22px;height:22px} .rband span{margin-left:auto;font-size:11px;font-weight:600}
.herr-kopf{display:flex;gap:12px;align-items:center} .herr-kopf b{font:700 16px var(--font-display);color:var(--gold-100)} .herr-kopf small{display:block;color:var(--tx-3);font:500 11.5px/1.3 var(--font-ui)}
.herr-bild{position:relative;width:64px;height:64px;flex:none;border-radius:50%;background:#1b2638;box-shadow:0 0 14px 4px rgba(255,210,90,.8)}
.herr-bild img{position:absolute;inset:18%;width:64%;height:64%;border-radius:50%} .herr-bild .herr-rahmen{inset:-14%;width:128%;height:128%;border-radius:0}
/* Herrscher-Ansage (06c herrAnsage): großes Banner nach dem Thron-Event, einmal je Spieler */
.herr-ansage{position:fixed;inset:0;z-index:calc(var(--z-toast) + 1);display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(6,10,20,.72);animation:herrAnsageEin .5s ease-out}
.herr-ansage-karte{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;width:min(340px,100%);padding:56px 20px 20px;border-radius:18px;text-align:center;color:#fff3cf;
  background:radial-gradient(circle at 50% 30%,#5a3d12,#24170a 70%);border:3px solid #e8b94a;box-shadow:0 0 40px 8px rgba(255,200,80,.55)}
.herr-ansage-krone{position:absolute;top:-44px;width:96px;height:96px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.6))}
.herr-ansage .herr-bild{width:96px;height:96px}
.herr-ansage small{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#f3cf74}
.herr-ansage b{font-size:26px;line-height:1.15;word-break:break-word;text-shadow:0 2px 6px #000}
@keyframes herrAnsageEin{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
.herr-skin{width:72px;margin-left:auto;filter:drop-shadow(0 0 6px #ffd25a)}
.herr-angelegt{display:flex;gap:8px;align-items:center;margin-top:10px;padding:7px 9px;border-radius:8px;background:rgba(255,200,80,.12);border:1px solid rgba(255,210,110,.5);font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
.herr-angelegt .haken{display:grid;place-items:center;flex:none;width:20px;height:20px;border-radius:50%;background:#3f9b48;color:#fff;font-weight:800}
.herr-angelegt b{flex:none;margin-left:auto;padding:2px 8px;border-radius:6px;background:#3f9b48;color:#fff;font:700 11px var(--font-ui)}
.herr-titel{display:grid;grid-template-columns:30px 1fr auto;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line-1);font:600 var(--fs-13) var(--font-ui)}
.herr-titel img{width:30px;height:30px} .herr-titel small{display:block;color:#8fd67a;font-size:11px} .herr-titel small.boese{color:#ff8d82}
.herr-titel .wer{font-size:12px;color:var(--tx-2)} .herr-titel select,.herr-an select{max-width:150px;height:32px;border:1px solid var(--line-2);border-radius:var(--r-xs);background:rgba(0,0,0,.35);color:var(--tx-1);font:600 var(--fs-12) var(--font-ui)}
.herr-kisten{display:grid;grid-template-columns:repeat(3,1fr);gap:8px} .herr-kiste{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}
.herr-kiste small{font:500 10.5px/1.25 var(--font-ui);color:var(--tx-3)} .herr-an{display:flex;align-items:center;gap:8px;margin-top:10px;font:600 var(--fs-13) var(--font-ui);color:var(--tx-2)}
/* Events/Bündnis (Gesamt-Blick 6.10.): Bild-Banner je Ereignis mit Titel + Uhr darauf, lange Erklärungen hinter „i“, leere Zustände mit Bild + Knopf */
.ev-banner{position:relative;flex:none;height:96px;margin:0 0 10px;border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--line-2);background:#100b08}
.ev-banner .ev-bild{position:absolute;inset:0;width:100%;height:100%;display:block}
.ev-banner::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,6,4,.85) 0%,rgba(8,6,4,.55) 50%,rgba(8,6,4,0) 76%);pointer-events:none}
.ev-banner-t{position:absolute;left:12px;right:26%;bottom:10px;z-index:1;display:flex;flex-direction:column;gap:4px;text-shadow:0 1px 3px rgba(0,0,0,.9)}
.ev-banner-t > b{display:flex;align-items:center;gap:7px;font:600 16px/1.25 var(--font-display);color:var(--gold-100);letter-spacing:.02em}
.ev-banner-t > b .icon{width:18px;height:18px;flex:none;color:var(--gold-300)}
.ev-banner-t small{font:600 var(--fs-12)/1.35 var(--font-ui);color:var(--tx-1)} .ev-banner-t small b{font-variant-numeric:tabular-nums;color:var(--gold-200)}
.ev-card.ev-mit-bild{padding-top:0;overflow:hidden} .ev-card.ev-mit-bild > .ev-banner{margin:0 -10px 4px;border-radius:0;border:0;border-bottom:1px solid var(--line-1)}
.ev-info{margin:0} .ev-info summary > span{flex:1} .ev-info .mail-intro{margin:0 0 8px}
.bd-kurz{margin:0 0 4px;font:500 var(--fs-13)/1.4 var(--font-ui);color:var(--tx-2)}
.empty-state.ev-leer{padding:22px 16px;gap:8px;border:1px dashed var(--line-2);border-radius:10px;background:rgba(255,255,255,.02)}
.empty-state.ev-leer > .icon{width:40px;height:40px;color:var(--gold-300)} .empty-state.ev-leer > span{max-width:34ch}
.empty-state.ev-leer > b{font-size:var(--fs-15)} .empty-state.ev-leer .btn{margin-top:8px;max-width:100%}
/* Belohnungs-Leiste wie RoK (Merkliste 33): Balken mit Kisten an den Stufen – erreicht leuchtet („Abholen“), abgeholt = offene Kiste + Haken */
.evl{contain:inline-size;width:100%;overflow-x:auto;overscroll-behavior-x:contain;margin:2px -2px 6px;padding:4px 2px 2px;scrollbar-width:thin;
  position:sticky;top:0;z-index:2;background:rgb(16,19,25);box-shadow:0 6px 8px -4px rgba(0,0,0,.6)}   /* beim Blättern bleibt die Stufen-Leiste ganz oben stehen (Foto 8.10.: sonst halb verdeckt) */
.evl-bahn{position:relative;display:grid;grid-template-columns:repeat(var(--n),minmax(52px,1fr));min-width:calc(var(--n) * 52px)}
.evl-spur{position:absolute;left:0;right:0;top:20px;height:8px;border-radius:4px;background:rgba(0,0,0,.45);border:1px solid var(--line-2);overflow:hidden}
.evl-spur i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#a8831a,#f2c75c);box-shadow:0 0 8px rgba(242,199,92,.6)}
.evl-k{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0;border:0;background:none;color:var(--tx-3);font:700 10.5px/1.1 var(--font-ui);white-space:nowrap}
.evl-bild{position:relative;display:grid;place-items:center;width:46px;height:46px;border-radius:10px} .evl-bild img{width:44px;height:44px;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(0,0,0,.7))}
.evl-k.is-zu .evl-bild img{filter:grayscale(.85) brightness(.6)} .evl-k.is-zu{opacity:.85}
.evl-k.is-hol,.evl-k.is-bald{color:var(--gold-100);cursor:pointer} .evl-k.is-hol .evl-bild{background:radial-gradient(circle,rgba(255,214,110,.55),rgba(255,214,110,0) 70%);animation:evlGlueh 1.4s ease-in-out infinite}
.evl-k.is-ok{color:var(--tx-2)} .evl-haken{position:absolute;right:-4px;top:-4px;width:20px;height:20px} .evl-haken img{width:20px;height:20px;filter:none}
@keyframes evlGlueh{50%{transform:scale(1.08);box-shadow:0 0 14px rgba(255,214,110,.6)}}
@media (prefers-reduced-motion:reduce){.evl-k.is-hol .evl-bild{animation:none}}
.evl-zeilen{display:grid;gap:6px;margin-bottom:8px}
.evl-z{display:grid;grid-template-columns:minmax(64px,38%) 1fr auto;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--line-1);border-radius:var(--r-sm);background:rgba(0,0,0,.22)}
.evl-z > b{display:flex;flex-direction:column;gap:1px;font:700 var(--fs-12)/1.2 var(--font-ui);color:var(--tx-1)} .evl-z > b small{font:600 10.5px/1.2 var(--font-ui);color:var(--tx-3)}
.evl-z.is-hol{border-color:rgba(242,199,92,.7);background:linear-gradient(90deg,rgba(242,199,92,.16),rgba(0,0,0,.2));box-shadow:0 0 10px rgba(242,199,92,.25)}
.evl-z.is-ok{opacity:.8} .evl-z.is-zu .bk-raster{filter:saturate(.5) brightness(.8)}
.evl-st{display:flex;align-items:center;gap:4px;justify-content:flex-end;color:var(--tx-3)} .evl-st img{width:20px;height:20px} .evl-st small{font:600 11px/1 var(--font-ui)} .evl-st .icon{width:16px;height:16px}
/* Wochen-Event (Vorgabe werkzeuge/wochenevent): Chips mit Punkt (grün = läuft), Tag-Leiste Mo–Fr + Rangliste, Punkte-Regeln, Rang-Bänder, Podest */
.p5-chip .ev-st{width:7px;height:7px;border-radius:50%;background:#5b6070;flex:none} .p5-chip .ev-st.an{background:#5cdb6a;box-shadow:0 0 6px #5cdb6a}
.p5-chip small{font:600 10px/1 var(--font-ui);color:var(--tx-3);white-space:nowrap} .p5-chip.active small{color:inherit;opacity:.75}
.wo-tage{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:3px;margin:6px 0}
.wo-tage > button{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0;padding:5px 2px;border-radius:6px;background:rgba(255,255,255,.04);border:1px solid var(--line-1);font:600 10px/1.2 var(--font-ui);color:var(--tx-3);opacity:.6;cursor:pointer}
.wo-tage > button b{font-size:12px;color:var(--tx-2)} .wo-tage > button span{max-width:100%;white-space:normal;text-align:center;overflow-wrap:anywhere;line-height:1.1;font-size:9.5px} .wo-tage .icon{width:16px;height:16px}
.wo-tage > .jetzt{opacity:1;border-color:var(--gold-300);background:rgba(214,170,90,.16);color:var(--gold-100)} .wo-tage > .jetzt b{color:var(--gold-100)}
.wo-tage > .an{opacity:1;box-shadow:0 0 0 1px var(--gold-100) inset}
.wo-tage > .t-rang{opacity:1;border-color:rgba(214,170,90,.55);background:linear-gradient(180deg,rgba(214,170,90,.22),rgba(90,60,20,.25));color:var(--gold-100)}
.wo-tage .t-rang img{width:18px;height:18px;filter:drop-shadow(0 0 4px rgba(255,200,90,.6))}
.wo-meine{display:grid;grid-template-columns:1fr 1fr;gap:6px} .wo-meine > div{padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.25);border:1px solid var(--line-1);text-align:center;font:600 11px var(--font-ui);color:var(--tx-3)}
.wo-meine b{display:block;font:700 16px var(--font-display);color:var(--gold-100)}
.wo-pkt{display:flex;flex-direction:column;gap:4px} .wo-pkt div{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid var(--line-1);font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)}
.wo-pkt div b{margin-left:auto;color:var(--gold-100);white-space:nowrap} .wo-pkt .icon{width:16px;height:16px;flex:none}
.wo-satz{display:flex;gap:8px;align-items:center;margin-top:8px;padding:6px 8px;border-radius:8px;background:rgba(90,160,255,.1);border:1px solid rgba(150,210,255,.35);font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-2)} .wo-satz .icon{width:16px;height:16px;flex:none}
.wo-alle{width:100%;margin-top:6px}
.wo-preise{display:flex;flex-direction:column;gap:8px} .wo-rang{display:flex;flex-direction:column;gap:5px}
.wo-band{display:flex;align-items:center;gap:8px;height:30px;padding:0 10px;border-radius:6px 16px 16px 6px;font:800 13px var(--font-ui);color:#fff;text-shadow:0 1px 2px #000}
.wo-band.p1{background:linear-gradient(90deg,#b8861f,#f2cf6a 60%,transparent)} .wo-band.p2{background:linear-gradient(90deg,#7d8790,#d3dbe2 60%,transparent)} .wo-band.p3{background:linear-gradient(90deg,#8a4f22,#d08a4f 60%,transparent)}
.wo-band.p4{background:linear-gradient(90deg,#3d5a86,#6f93c8 60%,transparent)} .wo-band.p5{background:linear-gradient(90deg,#4a4033,#7a6a52 60%,transparent)}
.wo-band img{width:22px;height:22px} .wo-band span{margin-left:auto;font-size:11px;font-weight:600}
.wo-uhr{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:6px;padding:6px;border-radius:8px;background:rgba(0,0,0,.3);border:1px solid var(--line-1);font:600 11px var(--font-ui);color:var(--tx-2)}
.wo-uhr b{font:700 13px var(--font-ui);color:var(--gold-100)} .wo-uhr .icon{width:14px;height:14px}
.wo-um{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px;padding:3px;border-radius:10px;background:rgba(0,0,0,.35);border:1px solid var(--line-1)}
.wo-um button{padding:6px;border:0;border-radius:8px;background:none;text-align:center;font:700 12px var(--font-ui);color:var(--tx-3);cursor:pointer} .wo-um button.an{color:#2a1c06;background:linear-gradient(180deg,#f6dc8a,#c99a3a);box-shadow:0 1px 3px #000}
.wo-podest{display:grid;grid-template-columns:1fr 1.22fr 1fr;align-items:end;gap:6px;padding:14px 4px 0;background:radial-gradient(ellipse at 50% 30%,rgba(255,210,110,.18),transparent 70%)}
.wo-pod{display:flex;flex-direction:column;align-items:center;min-width:0;text-align:center} .wo-pod .wp{position:relative;width:62px;height:62px;border-radius:50%} .wo-pod.g .wp{width:82px;height:82px}
.wo-pod .wp > img{position:absolute;inset:9%;width:82%;height:82%;object-fit:contain} .wo-pod .wp > .lb{inset:-14% -18% auto;width:136%;height:90%;opacity:.95}
.wo-pod .wp i{position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);min-width:22px;height:22px;border-radius:11px;display:grid;place-items:center;font:800 12px var(--font-display);font-style:normal;color:#1b1205;box-shadow:0 1px 3px #000}
.wo-pod.g .wp{box-shadow:0 0 0 3px #f2cf6a,0 0 18px rgba(255,205,90,.7)} .wo-pod.s .wp{box-shadow:0 0 0 3px #cfd8e0,0 0 10px rgba(210,225,240,.45)} .wo-pod.b .wp{box-shadow:0 0 0 3px #c98447,0 0 10px rgba(210,130,70,.45)}
.wo-pod.g i{background:linear-gradient(#ffe9a0,#d4a23a)} .wo-pod.s i{background:linear-gradient(#f2f6fa,#a8b3bd)} .wo-pod.b i{background:linear-gradient(#f0b37a,#a3612c)}
.wo-pod .nm{margin-top:10px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:700 12.5px var(--font-ui);color:#fff} .wo-pod.g .nm{font-size:14px;color:var(--gold-100)} .wo-pod .nm .who-link{max-width:100%;overflow:hidden;text-overflow:ellipsis}
.wo-pod .bd{font:600 10px var(--font-ui);color:var(--tx-3)} .wo-pod .bd small{font:inherit;color:#8fb7e8} .wo-pod .pt{font:700 12px var(--font-display);color:var(--gold-100)}
.wo-pod .sockel{width:100%;margin-top:4px;border-radius:6px 6px 0 0;display:grid;place-items:center;font:800 20px var(--font-display);color:rgba(0,0,0,.45)}
.wo-pod.g .sockel{height:46px;background:linear-gradient(#f2cf6a,#8a6416)} .wo-pod.s .sockel{height:32px;background:linear-gradient(#d3dbe2,#6b747c)} .wo-pod.b .sockel{height:24px;background:linear-gradient(#d08a4f,#6e3b16)}
.wo-rl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px}
.wo-rl li{display:grid;grid-template-columns:28px 26px minmax(0,1fr) auto;align-items:center;gap:7px;height:34px;padding:0 10px 0 6px;border-radius:8px;background:rgba(255,255,255,.035);border:1px solid var(--line-1)}
.wo-rl li:nth-child(odd){background:rgba(255,255,255,.06)} .wo-rl em{font:700 13px var(--font-display);font-style:normal;color:var(--tx-3);text-align:center} .wo-rl li > img{width:24px;height:24px;object-fit:contain}
.wo-rl span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 12.5px var(--font-ui);color:var(--tx-1)} .wo-rl small{margin-left:4px;font:700 10px var(--font-ui);color:#8fb7e8}
.wo-rl b{font:700 12.5px var(--font-display);color:var(--gold-100);text-align:right;font-variant-numeric:tabular-nums}
.wo-rl li.me{background:linear-gradient(90deg,rgba(92,219,106,.25),rgba(92,219,106,.08));border-color:#5cdb6a}
.wo-ich{position:sticky;bottom:-1px;z-index:2;margin-top:6px;padding:6px 0 4px;background:linear-gradient(rgba(10,12,18,0),#0c0f16 35%)} .wo-ich li.me{height:40px;background:linear-gradient(90deg,#1f4a27,#14251a);box-shadow:0 -2px 10px rgba(0,0,0,.6)} .wo-ich em{color:#9ff0a8}
/* Barbaren-Lager: Tagesgrenze oben (Bild + Zahl + Balken) */
.lg-heute{display:grid;gap:6px;margin:6px 0;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.28);border:1px solid rgba(228,200,134,.3)}
.lg-titel{font:700 12px/1 var(--font-display);color:var(--gold-100);letter-spacing:.06em} .lg-titel small{font:600 11px var(--font-ui);color:var(--tx-3);letter-spacing:0;margin-left:6px}
.lg-grenze{display:flex;align-items:center;gap:8px} .lg-grenze .bk{--bk:30px;flex:none} .lg-grenze > span{flex:1;display:grid;gap:3px} .lg-grenze b{font:700 12.5px/1 var(--font-ui);color:#fff}
.lg-grenze i{display:block;height:6px;border-radius:3px;background:linear-gradient(90deg,#e4c886 var(--p),rgba(255,255,255,.12) var(--p))}
#eventBody > .btn[data-ev-hol]{width:100%;margin:0 0 8px}
/* Lebensbalken (Tagesboss): die Zahl nie halb abgeschnitten – Höhe wächst mit der Schrift */
.barb-hp{height:auto;min-height:20px} .barb-hp span{line-height:1.35;padding:2px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ev-saison{margin-top:12px}.ev-saison .field-lines b{text-align:left;justify-content:flex-start}
.lb-info summary{display:flex;align-items:center;gap:6px;min-height:44px;list-style:none;cursor:pointer;font:600 13px/1.2 var(--font-ui);color:var(--tx-2)} .lb-info summary::-webkit-details-marker{display:none}
.lb-info summary .icon{width:18px;height:18px;color:var(--gold-300)} .lb-info p{margin:0 0 8px}
.empty-state.lb-leer{flex-direction:row;align-items:center;gap:12px;padding:12px 14px;text-align:left;border:1px dashed var(--line-2);border-radius:10px} .lb-leer > span{display:flex;flex-direction:column;gap:2px} .lb-leer .icon{flex:none;width:26px;height:26px}
/* Heldenhalle (Blick 6.10.): genug Splitter → goldene Karte mit „Freischalten“, Stern in 4 Vierteln als Balken, am Desktop größere Karten */
.hh-card.is-ready{border-color:var(--gold-300);box-shadow:0 0 0 1px var(--gold-300),0 0 18px rgba(242,199,92,.45)} .hh-card.is-ready .hh-art{filter:grayscale(.35) brightness(.8)}
.hh-frei{display:inline-flex;align-items:center;gap:4px;margin-top:4px;padding:6px 10px;border-radius:var(--r-pill);background:linear-gradient(180deg,var(--gold-200),var(--gold-400));color:var(--tx-inv);font:800 11px/1 var(--font-ui);letter-spacing:.04em;text-transform:uppercase}
.hh-frei .icon{width:12px;height:12px}
.hh > .hh-zu-h{margin:12px auto 4px}
.hh-steps span{height:8px;padding:0;border:1px solid #ffffff14} .hh-steps span.on{background:var(--gold-300)}
@media (min-width:900px){ .hh-cards{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px} .hh-cards.hh-cards--zu{grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px}
  .hh-hero{grid-template-columns:minmax(0,1fr) 440px} }
/* Willkommen zurück (6.10.): Bezeichnung einzeilig („Ertrag pro Stunde“ brach in 3 Zeilen um), lange Zahlen rutschen darunter */
#welcomeModal .lvlup-rewards li{flex-wrap:wrap;row-gap:2px} #welcomeModal .lvlup-rewards li span{flex:1 0 auto;white-space:nowrap} #welcomeModal .lvlup-rewards li b{flex:1 1 auto}
/* Profil: Kopf in 3 Zeilen (Rang + Titel, Name, Stufe) */
.p5-kopfzeile{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 16px}
.p5-kopfzeile .ptitle-tag{position:relative;margin:0;white-space:nowrap}
.p5-kopfzeile .ptitle-tag:not(:empty)::before{content:"·";position:absolute;left:-10px;color:var(--tx-3)}   /* der Punkt steht in der Lücke: bricht der Titel um, schneidet der Rand ihn ab */
/* Profil-Kopf wie bei einem Herrscher: Name (Stift: antippen zum Ändern), darunter Macht und Spieler-Nummer */
.p5-name{display:flex;align-items:center;gap:4px;min-width:0;cursor:text}
.p5-name .ptitle--input{flex:1}
.p5-name .icon{flex:none;width:14px;height:14px;color:var(--tx-3)}
.p5-kennung{display:flex;flex-wrap:wrap;align-items:center;gap:2px 12px;margin:1px 0 3px;font:500 12px/1.3 var(--font-ui);color:var(--tx-2)}
.p5-kennung b{color:var(--gold-100);font-variant-numeric:tabular-nums}
.p5-kennung .icon{width:13px;height:13px;margin-right:4px;color:var(--gold-300);vertical-align:-2px}
@media (max-height:500px) and (orientation:landscape){ .p5-kennung{display:none} }   /* (quer: der Kopf bleibt kompakt) */
.p5-heimat{display:inline-flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums}
.p5-heimat .btn{min-height:36px}
/* Ausrüstung: leere Felder führen zur Ausrüstungskiste (Plus unten rechts) */
#chestEquippedGrid .tile.empty{cursor:pointer}
.tile.empty .p5-plus{position:absolute;right:4px;bottom:4px;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--gold-300);color:#1a1408}
.tile.empty .p5-plus .icon{width:12px;height:12px}
#chestEquippedGrid .slot-r:not([data-r]){color:var(--gold-200)}
.empty-state .btn{margin-top:6px}
/* Fähigkeiten: große runde Knoten mit Stufe, Name darunter (Linien wie gehabt durch die Mitten) */
#skillGrid.skillCross{width:min(100%,330px);aspect-ratio:auto;grid-template-rows:repeat(3,112px)}
#skillGrid .skillNode{width:66px;height:66px;border-radius:50%}
#skillGrid .skillNode .nIcon .icon{width:26px;height:26px}
#skillGrid .skillNode .nName{position:absolute;top:calc(100% + 5px);left:50%;width:104px;transform:translateX(-50%);font:600 11px/1.2 var(--font-ui);hyphens:manual;color:var(--tx-2);text-align:center}
#skillGrid .skillNode.selected .nName{color:var(--gold-100)}
#skillGrid .skillNode[data-level="0"]{filter:saturate(.35)}
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
.ap-regler .seg button::before{left:-3px;right:-3px}   /* Angriff 25 %…Alle: 42 px breit, die Tippfläche reicht in die Lücke (44 px) */
.panel--island .hero-seg.chips-quer{padding-block:4px}   /* (die Liste schiebt quer: die Tippfläche braucht Platz im Rahmen) */
.panel--island .pfoot .btn{min-height:var(--k-zweit)}
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
      <div class="overline p5-kopfzeile"><span>Rang <b id="profileRank">Bronze</b></span><span id="profileTitle" class="ptitle-tag"></span></div>
      <label class="p5-name"><input id="profileName" class="ptitle ptitle--input" type="text" maxlength="20" placeholder="Dein Name" autocomplete="off" spellcheck="false" aria-label="Dein Name (antippen zum Ändern)"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19l1-4L16 5l3 3L9 18zM14 7l3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></label>
      <div id="profileKennung" class="p5-kennung"></div>
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
      <!-- Aussehen: nur hier (Wappen, Rahmen, Titel) -->
      <button id="crestCard" class="crest-card" type="button" aria-label="Aussehen: Wappen, Rahmen">
        <canvas id="crestSmall" width="112" height="112"></canvas>
        <span id="lookNow" class="crest-card-t"><b>Aussehen</b><small>Wappen · Rahmen</small></span>
        <span class="crest-card-go">Ändern<svg class="icon"><use href="#i-upgrade"/></svg></span>
      </button>
      <!-- Rangliste: eigenes Fenster, hier nur der Weg dorthin -->
      <button id="tabBtnRank" class="p5-zeile" type="button"><svg class="icon"><use href="#i-rank"/></svg><span>Rangliste<small>Macht, Eroberungen, Hauptstadt, Titel, Thron-Punkte</small></span><svg class="icon p5-pfeil"><use href="#i-back"/></svg></button>
      <div class="sect"><h4>Reich</h4></div>
      <div class="stat-grid">
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-flag"/></svg>Basen</span><b class="stat-v" id="kBases">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-troops"/></svg>Truppen / Std.</span><b class="stat-v is-good" id="kTroopsRate">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-coin"/></svg>Münzen / Std.</span><b class="stat-v is-good" id="kCoinsRate">0</b></div>
        <div class="stat"><span class="stat-l"><svg class="icon"><use href="#i-rank"/></svg>Nächster Rang</span><b class="stat-v" id="profileNextRank">–</b></div>
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
          <label class="set-zeile"><span>Ein Händler ist da<small>Wandernder Händler auf der Karte</small></span><input type="checkbox" data-push-art="haendler"></label>
          <label class="set-zeile"><span>Thron-Event startet<small>Samstag eine Stunde vorher</small></span><input type="checkbox" data-push-art="thron"></label>
          <label class="set-zeile"><span>Tages-Kiste bereit<small>Wochen-Event: neue Kisten-Stufe erreicht</small></span><input type="checkbox" data-push-art="tageskiste"></label>
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
      <details class="set-hilfe p5-hilfe">
        <summary>Wo finde ich was?</summary>
        <p><b>Stadt</b> → Burg (deine Hauptstadt-Stufe), Gebäude, Holz/Stein/Eisen, Forschung, Krankenhaus, Helden.</p>
        <p><b>Bündnis</b> → zusammen mit anderen: Chat, Rally, Verstärkung, Bündnis-Hilfe, Tempel-Bonus.</p>
        <p><b>Kampf</b> → Unterwegs (deine Märsche) und Berichte.</p>
        <p><b>Events</b> → Aufgaben (Täglich, Erfolge), Abholen (Abholfach, tägliche Belohnung), Pass, Ereignisse (Wochen-Event Mo–Fr mit Rangliste, Barbaren-Lager).</p>
        <p><b>Shop</b> → Kisten, Friedensschilde, Event-Shop, Tempo, Händler, Markt.</p>
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

<!-- ============ HERRSCHER (Thron-Event, 06c renderHerr) ============ -->
<section id="herrPopup" class="panel panel--sheet" role="dialog" aria-labelledby="herrTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><svg class="icon"><use href="#i-crown"/></svg></div>
    <div class="phead-text"><div class="overline">Eine Woche lang</div><h3 id="herrTitle" class="ptitle">Herrscher</h3><div class="psub" id="herrSub"></div></div>
    <button id="herrCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div class="pbody" id="herrBody"></div>
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
     Ereignisse (Wochen-Event, Thron, Tagesboss + Barbaren-Lager) – alles nur hier ============ -->
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
    <button class="p5-chip" type="button" role="tab" data-gtab="tour" data-ggrp-von="ereignisse" hidden><i class="ev-st"></i><span>Woche</span><small hidden></small><span class="badge" data-gbadge="tour" style="display:none">!</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="thron" data-ggrp-von="ereignisse" hidden><i class="ev-st" data-ev-st="thron"></i><span>Thron</span><small data-ev-ab="thron">Sa 10</small><span class="badge" data-gbadge="thron" style="display:none">!</span></button>
    <button class="p5-chip" type="button" role="tab" data-gtab="lager" data-ggrp-von="ereignisse" hidden><i class="ev-st an"></i><span>Lager</span><small hidden></small><span class="badge" data-gbadge="lager" style="display:none">!</span></button>
  </div>
  <div class="pbody">
    <div class="mail-pane" data-gpane="daily">
      <div class="sect"><h4>Heutige Aufgaben</h4><span id="questReset" class="sect-aside quest-reset"></span></div>
      <div id="questList" class="quests"></div>
    </div>
    <div class="mail-pane" data-gpane="reward" hidden>
      <div class="sect"><h4>Zum Abholen</h4><span id="inboxAside" class="sect-aside"></span></div>
      <div id="inboxList" class="inbox"></div>
      <div class="sect"><h4>Tägliche Belohnung</h4></div>
      <div id="dailyCard" class="daily"></div>
      <div class="sect"><h4>Anmelde-Tage</h4><span class="sect-aside">verpasster Tag = Tag 1</span></div>
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

<!-- ============ SHOP (Dock): Kisten (Schlüssel/Edelsteine) · Event (Event-Münzen) · Tempo (Beschleuniger) · Schilde + Teleporter · Händler (nur wenn einer da ist) · Markt – alles Kaufen/Tauschen nur hier ============ -->
<section id="shopPopup" class="panel panel--sheet" role="dialog" aria-labelledby="shopTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><svg class="icon"><use href="#i-shop"/></svg></div>
    <div class="phead-text"><div class="overline">Kaufen &amp; Tauschen</div><h3 id="shopTitle" class="ptitle">Shop</h3>
      <div class="psub"><span class="pill pill--gem"><svg class="icon"><use href="#i-gem"/></svg><b id="shopGemCount">0</b><small>Edelsteine</small></span><span class="pill pill--em"><img src="bilder/beute_eventmuenze.webp" alt="" draggable="false"><b id="shopEmCount">0</b><small>Event-Münzen</small></span></div></div>
    <button id="shopCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div id="shopTabs" class="tabs mail-tabs" role="tablist">
    <button class="tab active" type="button" role="tab" data-stab="gems"><svg class="icon"><use href="#i-gem"/></svg><span>Kisten</span></button>
    <button class="tab" type="button" role="tab" data-stab="ev"><svg class="icon"><use href="#i-star"/></svg><span>Event</span></button>
    <button class="tab" type="button" role="tab" data-stab="tempo"><svg class="icon"><use href="#i-hourglass"/></svg><span>Tempo</span></button>
    <button class="tab" type="button" role="tab" data-stab="shield"><svg class="icon"><use href="#i-shield"/></svg><span>Schilde</span></button>
    <button class="tab" type="button" role="tab" data-stab="hd" hidden><svg class="icon"><use href="#i-coin"/></svg><span>Händler</span><span class="badge">!</span></button>
    <button class="tab" type="button" role="tab" data-stab="markt"><svg class="icon"><use href="#i-crate"/></svg><span>Markt</span></button>
  </div>
  <div class="pbody">
    <div class="mail-pane" data-spane="hd" hidden><div class="sect"><h4 id="hdTitle">Wandernder Händler</h4><span id="hdSub" class="sect-aside"></span></div><div id="hdLive" class="hd-live"></div></div>
    <div class="mail-pane" data-spane="markt" hidden><div id="shopMarkt" class="ev-body"></div></div>
    <div class="mail-pane" data-spane="shield" hidden>
      <div id="shieldState" class="notice"></div>
      <div class="sect"><h4>Kaufen</h4><span class="sect-aside">kommt in den Rucksack<button type="button" class="shop-i" data-sinfo="schild" aria-expanded="false" aria-label="Erklärung"><svg class="icon"><use href="#i-info"/></svg></button></span></div>
      <p class="mail-intro shop-info" data-sinfo-box="schild" hidden>Friedensschild: niemand kann deine Türme angreifen, solange er steht – Tore, Tempel und der Thron bleiben angreifbar. Greifst du selbst an, fällt der Schild sofort.</p>
      <div class="waren waren--3">
        <div class="ware ware--klein" data-r="blau"><span class="ware-bild ware-bild--ic"><svg class="icon"><use href="#i-shield"/></svg><i>2 h</i></span><span class="ware-txt"><b class="ware-name">Schild</b><small>2 Stunden</small></span>
          <button type="button" class="ware-preis" data-shield="2" aria-label="Schild 2 Std. kaufen"><svg class="icon"><use href="#i-gem"/></svg><b>80</b></button></div>
        <div class="ware ware--klein" data-r="blau"><span class="ware-bild ware-bild--ic"><svg class="icon"><use href="#i-shield"/></svg><i>8 h</i></span><span class="ware-txt"><b class="ware-name">Schild</b><small>8 Stunden</small></span>
          <button type="button" class="ware-preis" data-shield="8" aria-label="Schild 8 Std. kaufen"><svg class="icon"><use href="#i-gem"/></svg><b>300</b></button></div>
        <div class="ware ware--klein" data-r="blau"><span class="ware-bild ware-bild--ic"><svg class="icon"><use href="#i-shield"/></svg><i>24 h</i></span><span class="ware-txt"><b class="ware-name">Schild</b><small>24 Stunden</small></span>
          <button type="button" class="ware-preis" data-shield="24" aria-label="Schild 24 Std. kaufen"><svg class="icon"><use href="#i-gem"/></svg><b>700</b></button></div>
      </div>
      <div class="sect"><h4>Teleporter</h4><span class="sect-aside">kommt in den Rucksack</span></div>
      <div class="waren waren--3">
        <div class="ware ware--klein" data-r="lila"><span class="ware-bild"><img class="kiste-bild" src="bilder/ui_sym_verlegen.webp" alt="" draggable="false"></span><span class="ware-txt"><b class="ware-name">Teleporter</b><small class="ware-lang">Hauptstadt an eine freie Stelle</small></span>
          <button type="button" class="ware-preis" data-tele-kauf aria-label="Teleporter kaufen"><svg class="icon"><use href="#i-gem"/></svg><b>500</b></button></div>
      </div>
      <button type="button" class="ware-link" data-zum-rucksack><svg class="icon"><use href="#i-crate"/></svg><span id="shopRucksackN">Rucksack ›</span></button>
    </div>
    <div class="mail-pane" data-spane="gems">
      <!-- Kisten wie die Test-Datei (werkzeuge/thronevent ?a=shopkisten): Gruppen Ausrüstung · Helden · Schlüssel, je Kiste „1ד und „10ד (Schlüssel, sonst Edelsteine) -->
      <div class="sect"><h4>Kisten öffnen</h4><span class="sect-aside">mit Schlüssel oder Edelsteinen<button type="button" class="shop-i" data-sinfo="kiste" aria-expanded="false" aria-label="Chancen"><svg class="icon"><use href="#i-info"/></svg></button></span></div>
      <div class="shop-info" data-sinfo-box="kiste" hidden>
        <p class="mail-intro"><b>Ausrüstungs-Kiste:</b> ein zufälliges Teil (Waffe, Rüstung, Schild oder Stiefel).</p><div id="shopOdds" class="odds"><!-- JS fills from RARITY_DEFS + RARITY_DROP_WEIGHTS --></div>
        <p class="mail-intro"><b>Epische Ausrüstung:</b> Ungewöhnlich bis Episch – spätestens beim 20. Mal sicher Episch.</p><div id="shopOddsE" class="odds"></div>
        <p class="mail-intro"><b>Helden-Kisten:</b> Splitter für zufällige Helden; die epische spätestens beim 20. Mal für einen epischen Helden. Helden mit 5 Sternen fallen heraus.</p><div id="heroChestOdds" class="odds"></div>
      </div>
      <div id="shopKisten"></div>
      <button id="shopToEquipBtn" class="ware-link" type="button"><svg class="icon"><use href="#i-shield"/></svg><span>Inventar ›</span></button>
    </div>
    <div class="mail-pane" data-spane="ev" hidden><div id="shopEvent"></div></div>
    <div class="mail-pane" data-spane="tempo" hidden><div id="shopTempo"></div></div>
  </div>
</section>

<!-- ============ BESCHLEUNIGER benutzen (Bauen, Forschen): je Tipp einer, oder „Passend benutzen“ ============ -->
<section id="beschPopup" class="panel panel--sheet" role="dialog" aria-labelledby="beschTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><img class="rk-emblem" src="bilder/beute_beschleuniger_mittel.webp" alt="" draggable="false"></div>
    <div class="phead-text"><div class="overline">Bauen · Forschen</div><h3 id="beschTitle" class="ptitle">Beschleuniger</h3></div>
    <button id="beschCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div class="pbody"><div id="beschInhalt" class="rk-inhalt"></div></div>
</section>

<!-- ============ RUCKSACK (Dock): was du hast – Schilde (einsetzen), Teleporter (benutzen), Splitter je Held (nur Anzeige) ============ -->
<section id="rucksackPopup" class="panel panel--sheet" role="dialog" aria-labelledby="rucksackTitle">
  <span class="sheet-grab" aria-hidden="true"></span>
  <header class="phead">
    <div class="emblem emblem--gold"><img class="rk-emblem" src="bilder/ui_dock_rucksack.webp" alt="" draggable="false"></div>
    <div class="phead-text"><div class="overline">Deine Gegenstände</div><h3 id="rucksackTitle" class="ptitle">Rucksack</h3></div>
    <button id="rucksackCloseBtn" class="btn-x" type="button" aria-label="Schließen"><svg class="icon"><use href="#i-close"/></svg></button>
  </header>
  <div class="pbody">
    <div id="rkSchildStand" class="notice"></div>
    <div id="rkInhalt" class="rk-inhalt"></div>
  </div>
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
<style>
/* =====================================================================
   HELDEN (Merkliste 20, Alexander 7.10.: Helden-Fenster neu wie RoK): Raster aus Bild-Karten im Seltenheits-Rahmen (ui_kachel_*),
   Held groß auf einer Bühne mit Name, Sternen, Macht und den 4 Fähigkeiten als Kacheln; darunter Werte, Sterne, Fähigkeiten.
   Nur Aussehen – Zahlen und Knöpfe bleiben dieselben. Rahmen/Listen-Karten aus der Grundform (05z: .ki-karte, [data-r]).
   ===================================================================== */
/* Kopf-Chips (Marsch-Auswahl, Kampfbericht, Profil, Mauer, Kisten): Kopfbild auf dem Farbgrund der Seltenheit */
.hero-pic{object-fit:cover;object-position:50% 0;background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--hc,var(--rc,#8a8f99)) 60%,#20232a),#0b0c10 80%)}

/* ---------------- Raster: Bild-Karten ---------------- */
.hh-cards{grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px}
.hh-card{aspect-ratio:3/4.15;border-radius:9px;border-style:solid;border-width:0;border-color:transparent;background:#0b0c10;
  border-image:var(--ki-kachel) 24 fill / 9px stretch;box-shadow:0 4px 10px #0009;overflow:hidden}
.hh-card.is-locked{background:#0b0c10}
.hh-art{inset:5px 5px 0;top:5px;aspect-ratio:auto;bottom:0;-webkit-mask:linear-gradient(#000 70%,#0000 96%);mask:linear-gradient(#000 70%,#0000 96%)}
.hh-art .hero-pic{width:100%;height:100%;object-fit:cover;object-position:50% 0;background:none;border:0}
.hh-card.is-locked .hh-art{filter:grayscale(1) brightness(.5)}
.hh-foot{left:4px;right:4px;bottom:4px;padding:16px 3px 5px;border-radius:0 0 6px 6px;background:linear-gradient(0deg,#000 0%,#000d 55%,#0000)}
.hh-foot b{font:700 var(--fs-13)/1.1 var(--font-display);letter-spacing:.02em;color:#fff6e0}
.hh-foot small{color:#ffffffb0}
.hh-foot .hh-qstars i{width:12px;height:12px}
.hh-dot{left:8px;top:8px;z-index:1}
.hh-lk{right:7px;top:7px;z-index:1}
.hh-frei{box-sizing:border-box;max-width:100%;flex-wrap:wrap;justify-content:center;row-gap:2px;padding:5px 8px;gap:3px;font-size:9.5px;letter-spacing:0}   /* „Freischalten“ + Kosten passen ganz in die schmale Karte */
.hh-frei .icon{display:none}   /* (das Plus bräche in eine eigene Zeile) */
.hh-frei em{flex-basis:100%;font:700 9px/1 var(--font-ui);font-style:normal;text-transform:none;opacity:.8}
.hh-head [data-hh-back] > .icon{background-image:url(bilder/ui_zurueck.webp)}   /* Zurück statt Schließen-Bild (05z gibt jedem .btn-x das X) */
.hh-cards--zu{grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px}
.hh-cards--zu .hh-card{aspect-ratio:3/4;border-image:var(--ki-kachel) 24 fill / 7px stretch}
.hh-cards--zu .hh-foot{padding:10px 2px 4px}
@media (min-width:900px){ .hh-cards{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px} .hh-cards.hh-cards--zu{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px} }
.hh-pair-pics .hero-pic{--hc:var(--gold-300)}
.hero-pic.bd-hpic{width:18px;height:18px;margin:0 3px -4px 1px;border-radius:4px;border:1px solid var(--gold-300)}   /* Rally-Zeile: Kopf vor dem Namen */

/* ---------------- Ein Held: Bühne ---------------- */
.hh-hero{border:0;border-radius:12px;border-style:solid;border-image:url(bilder/ui_rahmen.webp) 44 / 14px stretch;
  background:radial-gradient(ellipse 70% 55% at 50% 40%,color-mix(in srgb,var(--rc) 45%,transparent),transparent 70%),linear-gradient(180deg,#1a1d24,#07080b 75%)}
.hh-stage{overflow:hidden;background:radial-gradient(ellipse 60% 45% at 55% 42%,color-mix(in srgb,var(--rc) 55%,transparent),transparent 72%)}
.hh-strahl{position:absolute;left:50%;top:6%;width:min(520px,110%);aspect-ratio:1;transform:translateX(-50%);background:url(bilder/ui_strahlen.webp) center/contain no-repeat;opacity:.35;mix-blend-mode:screen;pointer-events:none}
.hh-floor{left:14%;right:14%;bottom:118px;height:46px;background:radial-gradient(ellipse,color-mix(in srgb,var(--rc) 40%,#000c),transparent 70%)}
.hh-portrait{left:50%;bottom:112px;top:auto;transform:translateX(-50%);width:auto;height:calc(100% - 150px);max-height:470px;aspect-ratio:3/4;border:0;border-radius:0;box-shadow:none;background:none;
  object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 8px 18px #000c);-webkit-mask:linear-gradient(#000 82%,#0000);mask:linear-gradient(#000 82%,#0000)}
.hh-portrait.is-locked{filter:grayscale(.9) brightness(.55) drop-shadow(0 8px 18px #000c)}
.hh-id{max-width:46%}
.hh-gem{color:#fff;background:color-mix(in srgb,var(--rc) 70%,#000);padding:4px 8px 4px 6px;border-radius:3px;align-self:flex-start;box-shadow:0 1px 0 #ffffff30 inset}
.hh-gem::before{background:#fff;border-color:color-mix(in srgb,var(--rc) 40%,#000)}
.hh-nm{font-size:32px;color:#fff6e0;letter-spacing:.02em}
.hh-unten{position:absolute;left:0;right:0;bottom:0;z-index:2;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:10px 14px 12px;
  background:linear-gradient(0deg,#07080bee 40%,#07080b00)}
.hh-unten .hh-top{flex-direction:column;align-items:flex-start;gap:2px;padding:0;border:0}
.hh-unten h3{margin:0;font:700 var(--fs-11)/1 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3)}
.hh-skks{display:flex;gap:6px}
.hh-skk{position:relative;width:48px;height:48px;display:grid;place-items:center;font:700 20px/1 var(--font-display);color:#fff;text-shadow:0 1px 3px #000;
  border-style:solid;border-width:0;border-image:var(--ki-kachel) 24 fill / 8px stretch}
.hh-skk.act{border-image-source:url(bilder/ui_kachel_gold.webp)}
.hh-skk.is-null{filter:grayscale(.85) brightness(.7)}
.hh-skk i{position:absolute;right:-3px;bottom:-3px;min-width:17px;height:17px;padding:0 3px;border-radius:9px;background:#0b0c10;border:1px solid var(--gold-300);font:800 10px/15px var(--font-ui);font-style:normal;color:var(--gold-100);text-align:center}

/* ---------------- Ein Held: Werte als Kacheln, Fähigkeiten mit Kachel-Symbol ---------------- */
.hh-panel{background:linear-gradient(180deg,rgba(20,22,28,.94),rgba(10,11,14,.97))}
.hh-vals{grid-template-columns:repeat(2,1fr);gap:6px}
.hh-vals div{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:6px;padding:7px 9px;background:none}   /* Rahmen: Grundform .ki-karte (05z) */
.hh-vals b{font:700 var(--fs-13)/1 var(--font-ui);color:var(--gold-100)}
.hh-vi{width:28px;height:28px;display:grid;place-items:center;border-style:solid;border-width:0;border-image:var(--ki-kachel) 24 fill / 6px stretch}
.hh-vi .icon{width:16px;height:16px;color:#fff;filter:drop-shadow(0 1px 1px #000)}
.hh-hx{width:46px;height:46px;clip-path:none;background:none;border-style:solid;border-width:0;border-image:var(--ki-kachel) 24 fill / 8px stretch;text-shadow:0 1px 3px #000}
.hh-hx.act{border-image-source:url(bilder/ui_kachel_gold.webp);background:none;color:#fff}
.hh-sk{grid-template-columns:46px 1fr 32px}
@media (min-width:900px){ .hh-vals{grid-template-columns:repeat(4,1fr)} .hh-vals div{grid-template-columns:1fr;justify-items:center;text-align:center} }
@media (max-width:760px){
  .hh-stage{min-height:440px}
  .hh-portrait{left:62%;height:calc(100% - 128px);bottom:100px}
  .hh-floor{left:30%;right:0;bottom:100px}
  .hh-id{max-width:52%} .hh-nm{font-size:28px}
  .hh-unten{padding:8px 10px 10px} .hh-skk{width:42px;height:42px;font-size:18px}
}
</style>

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
  <div id="cityWisch" class="city-wisch" hidden><svg class="icon"><use href="#i-back"/></svg><span>Wischen – mehr Gebäude</span><svg class="icon city-wisch-r"><use href="#i-back"/></svg></div>
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
      <button id="cityUpgradeBtn" class="btn btn--primary btn--grow" type="button"><svg class="icon"><use href="#i-upgrade"/></svg><span class="city-lbl2"><span class="lbl">Aufwerten</span><small id="cityUpWarte" class="city-warte"></small></span><small id="cityUpTime" class="city-uptime"></small></button>
      <button id="citySpeedBtn" class="btn btn--secondary btn--grow" type="button" style="display:none"><svg class="icon"><use href="#i-gem"/></svg><span class="lbl">Beschleunigen</span></button>
      <button id="cityBeschBtn" class="btn btn--secondary" type="button" style="display:none" aria-label="Beschleuniger benutzen"><img class="besch-ic" src="bilder/beute_beschleuniger_mittel.webp" alt="" draggable="false"><span class="lbl">Beschleuniger</span></button>
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
    <div id="popupBund"></div>
    <div id="popupActions" class="actgrid">
      <button id="teleportBtn" class="act act--city" type="button" style="display:none"><span class="act-ic act-ic--city"><svg class="icon"><use href="#i-send"/></svg></span><span class="act-t">Teleportieren</span><span class="act-s">1 Teleporter</span></button>
      <button id="titleBtn" class="act act--city" type="button" style="display:none"><span class="act-ic act-ic--city"><svg class="icon"><use href="#i-temple"/></svg></span><span class="act-t">Titel</span><span class="act-s">Buffs und Strafen vergeben</span></button>
      <button id="cityBtn" class="act act--city" type="button" style="display:none"><span class="act-ic act-ic--city"><svg class="icon"><use href="#i-castle"/></svg></span><span class="act-t">Stadt betreten</span><span class="act-s">Hauptstadt ausbauen</span></button>
      <button id="upgradeBtn" class="act act--primary" type="button"><span class="act-ic"><svg class="icon"><use href="#i-upgrade"/></svg></span><span class="act-t">Aufwerten</span><span class="act-s" id="upgradeCostLabel">–</span></button>
      <button id="sendBtn" class="act" type="button"><span class="act-ic act-ic--send"><svg class="icon"><use href="#i-send"/></svg></span><span class="act-t">Senden</span><span class="act-s">Verstärken</span></button>
      <button id="multiAttackBtn" class="act" type="button"><span class="act-ic act-ic--attack"><svg class="icon"><use href="#i-multiattack"/></svg></span><span class="act-t">Mehrfach</span><span class="act-s"><svg class="icon icon--gem"><use href="#i-gem"/></svg><b data-const="MULTI_ATTACK_GEM_COST">5</b></span></button>
      <button id="recallBtn" class="act" type="button"><span class="act-ic act-ic--recall"><svg class="icon"><use href="#i-recall"/></svg></span><span class="act-t">Sammeln</span><span class="act-s"><svg class="icon icon--gem"><use href="#i-gem"/></svg><b data-const="RECALL_GEM_COST">1</b></span></button>
    </div>
  </div>
  <footer class="pfoot">
    <button id="backBtn" class="btn btn--secondary" type="button"><svg class="icon"><use href="#i-back"/></svg><span>Zurück</span></button>
    <button id="scoutBtn" class="btn btn--secondary btn--grow" type="button"><svg class="icon"><use href="#i-scout"/></svg><span class="lbl">Spähen</span></button>
    <button id="attackBtn" class="btn btn--danger btn--grow" type="button"><svg class="icon"><use href="#i-attack"/></svg><span class="lbl">Angreifen</span><span class="btn-zeit" id="attackZeit"></span></button>
  </footer>
</section>

    <script src="<?= skript('bots') ?>"></script>
    <script src="<?= skript('welt') ?>"></script>
    <script src="<?= skript('spiel') ?>"></script>
    <script src="<?= skript('aufbau') ?>"></script>
    <script src="<?= skript('buendnis') ?>"></script>
    <script src="<?= skript('haendler') ?>"></script>
    <script src="<?= skript('benachrichtigung') ?>"></script>
</body>
</html>
