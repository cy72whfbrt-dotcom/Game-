// Teil 02-stil-hud-fenster.php: Stil: HUD, Navigation, Kartenknöpfe, Hinweis, Mehrfach-Angriff, Fenster-Rahmen

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
.mb-chip.is-drache{border-color:rgba(255,140,70,.6);background:linear-gradient(90deg,rgba(170,50,20,.78),rgba(22,10,8,.88))} .mb-chip.is-drache .icon{color:#ffc46a} .mb-chip.is-drache i{color:#ffd9c0}
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
.anleitung{position:fixed;z-index:var(--z-toast);left:calc(var(--safe-l,0px) + 10px);right:calc(var(--safe-r,0px) + 66px);bottom:calc(var(--dock-h,64px) + var(--safe-bd,0px) + 14px);
  max-width:420px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:6px 8px;padding:6px 6px 6px 10px;   /* Schritt · Text · × in einer Zeile (Text ganz, höchstens 4 Zeilen), Knöpfe darunter; rechts 10 px Luft zu den Kartenknöpfen */
  background:var(--glass);border:1px solid var(--gold-300);border-radius:var(--r-sm);box-shadow:var(--sh-2);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.anleitung[hidden]{display:none}
.anleitung-n{width:min-content;font:700 10px/1.15 var(--font-ui);color:var(--gold-200);text-align:center}   /* „Schritt“ über „1/7“: schmal */
.anleitung-t{font:500 var(--fs-12)/1.3 var(--font-ui);color:var(--tx-1)}   /* immer ganz lesbar, kein „…“ (Spieltest 7.10.) */
#anleitungWeg{position:relative;width:32px;height:32px;align-self:center} #anleitungWeg::before{content:"";position:absolute;inset:-7px}   /* (sichtbar 32 px, Tippfläche 44 px – ab der Innenkante: 1 px Rand dazu) */
/* Handy: mit offenem Basis-Fenster oben unter dem HUD statt direkt über dem Fenster – dort steht die Basis (inselMittig) */
@media (max-width:899px) and (min-height:501px){ body:has(#islandPopup.is-open) .anleitung{top:calc(var(--safe-t) + var(--hud-top-space));bottom:auto!important}
  body:has(#islandPopup.is-open):has(#anleitung:not([hidden])) .toast{top:calc(var(--safe-t) + var(--hud-top-space) + var(--anl-h,64px) + 8px)} }   /* der Hinweis (z. B. „Der Drache ist erschienen“) dann darunter, nie hinter der Anleitung (--anl-h: 06b) */
.anleitung-k{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px}
.anleitung-ok{grid-column:1/-1;justify-self:end}
body.has-sheet .anleitung:not(.is-events){display:none}   /* (Schritt 6 „Abholen“ bleibt im Events-Fenster sichtbar: 06b) */
body:has(#feldRing:not([hidden])) .anleitung{display:none}   /* (Feld-Menü auf der Karte offen: Anleitung kurz weg) */
/* Anleitung: der nächste nötige Knopf pulsiert (06b anleitungZeigen setzt body[data-anl-puls]) */
@keyframes anl-puls{0%,100%{box-shadow:0 0 0 0 rgba(240,200,110,.85)}60%{box-shadow:0 0 0 9px rgba(240,200,110,0)}}
body[data-anl-puls="heim"] #homeBtn,body[data-anl-puls="knoepfe"] :is(#mapControls button,#hudRoh),
body[data-anl-puls="angriff"] #attackBtn,body[data-anl-puls="aufwerten"] #upgradeBtn,
body[data-anl-puls="stadt"] #cityNavBtn > .icon,body[data-anl-puls="stadtfenster"] #cityBtn,body[data-anl-puls="bauen"] #cityUpgradeBtn,
body[data-anl-puls="sammeln"] #fieldSheet [data-fsend],body[data-anl-puls="events"] #goalsBtn > .icon,
body[data-anl-puls="abholen"] #goalsPopup :is([data-daily],[data-quest],[data-bonus3],[data-bonus],[data-chain],[data-inbox],[data-inbox-all],[data-ach],[data-ach-all],[data-pass-l],[data-pass-all],[data-pass-old]):not(:disabled)
  {animation:anl-puls 1.4s ease-out infinite}
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
  body:has(#citySheet:not([hidden])) .toast.toast.toast{top:auto;bottom:calc(var(--dock-h) + var(--safe-bd) + 104px)}   /* (.toast dreifach: geht vor die allgemeine Fenster-Regel in 02) */
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
.panel--item{left:var(--safe-l);right:var(--safe-r);bottom:calc(var(--dock-h) + var(--safe-bd));z-index:var(--z-modal);
  max-height:min(70dvh,calc(100dvh - var(--dock-h) - var(--safe-bd) - var(--safe-t) - var(--hud-top-space)));border-radius:var(--r-lg) var(--r-lg) 0 0}
.panel .sheet-grab + .phead{padding-top:4px}
@media (max-width:899px),(max-height:500px){ body.has-sheet .mabar{display:none!important} }
body.has-panel .mapctl{display:none}
