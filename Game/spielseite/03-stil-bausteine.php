// Teil 03-stil-bausteine.php: Stil: Knöpfe, Chips, Werte-Kacheln, Überschriften, Reiter, Ausrüstung, Skills, Listen

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
