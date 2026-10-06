// Teil 01-kopf-grundwerte.php: PHP-Kopf (Login, Spielstand), <head>, Stil: Farben, Größen, Grundregeln, Kartenebenen
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
