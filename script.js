const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 838;
const gameScreen = document.getElementById('gameScreen');

function fitToScreen() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / DESIGN_WIDTH, vh / DESIGN_HEIGHT);
  gameScreen.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', fitToScreen);
window.addEventListener('orientationchange', fitToScreen);
fitToScreen();

/* ---------- Schmiede / Forge system ----------
   8 Raritätsstufen. Der Amboss startet auf Level 1: nur Grau ist
   möglich. Jedes Amboss-Level schaltet ab einer Schwelle eine kleine,
   anfangs winzige Chance auf die naechsthoehere Stufe frei. Um den
   fehlenden Zugriff auf hoehere Stufen am Anfang auszugleichen, rollen
   graue Gegenstaende auf niedrigem Amboss-Level deutlich bessere Werte.
   Jeder geschmiedete Gegenstand bekommt einen zufaelligen Wert innerhalb
   einer Spanne, ist also nie exakt gleich. */

const RARITIES = [
  { key: 'grau', name: 'Grau', color: '#9aa0a6', unlock: 1, weight: 1000, mult: 1.0 },
  { key: 'gruen', name: 'Grün', color: '#3ddc72', unlock: 2, weight: 220, mult: 1.35 },
  { key: 'blau', name: 'Blau', color: '#3fa9f5', unlock: 4, weight: 90, mult: 1.8 },
  { key: 'lila', name: 'Lila', color: '#a35cf0', unlock: 6, weight: 30, mult: 2.4 },
  { key: 'gold', name: 'Gold', color: '#f0c14b', unlock: 9, weight: 10, mult: 3.2 },
  { key: 'mystisch', name: 'Mystisch', color: '#ff4fa3', unlock: 12, weight: 3, mult: 4.2 },
  { key: 'goettlich', name: 'Göttlich', color: '#ff5a3c', unlock: 16, weight: 1, mult: 5.6 },
  { key: 'himmlisch', name: 'Himmlisch', color: 'linear-gradient(90deg,#ff5a3c,#f0c14b,#3ddc72,#3fa9f5,#a35cf0)', unlock: 20, weight: 0.3, mult: 7.5 },
];

// Welchen Slot ein Item betrifft und welchen Grundwert es traegt.
// Zwei Slots rechts oben (Fluegel) und drei weitere (Geheimer Stein, Edelstein,
// Unbekannt) sind bewusst nicht ueber die Schmiede erreichbar (gesperrt).
const SLOT_TYPES = [
  { id: 'cap', name: 'Kappe', stat: 'HP', base: 40 },
  { id: 'helmet', name: 'Helm', stat: 'DEF', base: 8 },
  { id: 'gauntlet', name: 'Handschuh', stat: 'ATK', base: 8 },
  { id: 'robe', name: 'Robe', stat: 'HP', base: 40 },
  { id: 'ring', name: 'Ring', stat: 'CTA', base: 0.12 },
  { id: 'pants', name: 'Hose', stat: 'DEF', base: 8 },
  { id: 'star', name: 'Amulett', stat: 'Crit', base: 0.12 },
  { id: 'boots', name: 'Schuhe', stat: 'SPD', base: 4 },
  { id: 'sword', name: 'Schwert', stat: 'ATK', base: 10 },
  { id: 'dragon', name: 'Gefährte', stat: 'CMB', base: 0.15 },
];
const PCT_STATS = ['CMB', 'CTA', 'Crit', 'ER', 'Betaeubung'];

const state = {
  anvilLevel: 1,
  equipment: {}, // slotId -> { rarity, statValue } | nicht gesetzt = leer
  lastCrafted: null, // { slot, rarity, statValue }
};

function formatStatValue(statKey, value) {
  return PCT_STATS.includes(statKey) ? value.toFixed(1).replace('.', ',') + '%' : Math.round(value);
}

function computeStats() {
  const totals = { HP: 0, ATK: 0, DEF: 0, SPD: 0, CMB: 0, CTA: 0, Betaeubung: 0, ER: 0, Crit: 0 };
  SLOT_TYPES.forEach(slot => {
    const item = state.equipment[slot.id];
    if (item) totals[slot.stat] += item.statValue;
  });
  return totals;
}

function renderStats() {
  const totals = computeStats();
  Object.keys(totals).forEach(key => {
    const el = document.getElementById('stat-' + key);
    if (el) el.textContent = formatStatValue(key, totals[key]);
  });
}

function renderSlot(slotId) {
  const slotDef = SLOT_TYPES.find(s => s.id === slotId);
  const slotEl = document.getElementById('slot-' + slotId);
  if (!slotDef || !slotEl) return;
  const item = state.equipment[slotId];
  const lvlEl = slotEl.querySelector('.slot-lvl');
  if (item) {
    slotEl.classList.remove('empty');
    slotEl.classList.add('filled');
    slotEl.style.setProperty('--slot-glow', item.rarity.color.startsWith('linear') ? '#fff' : item.rarity.color);
    slotEl.style.borderColor = item.rarity.color.startsWith('linear') ? '#fff' : item.rarity.color;
    lvlEl.textContent = formatStatValue(slotDef.stat, item.statValue);
  } else {
    slotEl.classList.add('empty');
    slotEl.classList.remove('filled');
    slotEl.style.borderColor = '';
    lvlEl.textContent = 'Leer';
  }
}

function renderAllSlots() {
  SLOT_TYPES.forEach(s => renderSlot(s.id));
  renderStats();
}

const goldEl = document.getElementById('goldValue');
function getGold() { return parseInt(goldEl.textContent, 10); }
function spendGold(amount) {
  if (getGold() < amount) return false;
  goldEl.textContent = getGold() - amount;
  return true;
}

function upgradeCost(level) {
  return Math.round(200 * Math.pow(level, 1.4));
}
function craftCost(level) {
  return 80 + level * 15;
}

// Wie lange nach dem Freischalten braucht eine Stufe, bis sie ihre volle
// (immer noch kleine) Basis-Chance erreicht - macht den ersten Zugriff "ganz wenig".
function rampFactor(level, unlockLevel) {
  if (level < unlockLevel) return 0;
  if (unlockLevel <= 1) return 1; // Grau ist die Basisstufe, immer voll verfügbar
  // frisch freigeschaltete Stufen starten winzig und wachsen langsam über 10 Level
  return Math.min(1, (level - unlockLevel + 1) / 10) * 0.2;
}

function grauBonus(level) {
  // Ausgleich: je niedriger das Amboss-Level, desto staerker die grauen Werte.
  return Math.max(0, 1 - level / 15);
}

function getWeights(level) {
  return RARITIES.map(r => (level >= r.unlock ? r.weight * rampFactor(level, r.unlock) : 0));
}

function rollRarity(level) {
  const weights = getWeights(level);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < RARITIES.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return RARITIES[i];
  }
  return RARITIES[0];
}

function rollStat(rarity, level, slotDef) {
  const bonus = rarity.key === 'grau' ? grauBonus(level) : 0;
  const randomFactor = 0.9 + Math.random() * 0.2;
  const raw = slotDef.base * rarity.mult * (1 + bonus) * randomFactor;
  return PCT_STATS.includes(slotDef.stat) ? Math.round(raw * 10) / 10 : Math.round(raw);
}

function sellPrice(rarity) {
  return Math.round(18 * rarity.mult);
}

function renderChances() {
  const box = document.getElementById('forgeChances');
  const level = state.anvilLevel;
  const weights = getWeights(level);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  box.innerHTML = RARITIES.map((r, i) => {
    const unlocked = level >= r.unlock;
    const pct = unlocked ? ((weights[i] / total) * 100) : 0;
    const pctText = unlocked ? (pct < 0.1 ? '<0,1%' : pct.toFixed(1).replace('.', ',') + '%') : '';
    const swatchStyle = r.color.startsWith('linear') ? `background:${r.color}` : `background:${r.color}`;
    return `
      <div class="chance-row ${unlocked ? '' : 'locked'}">
        <span class="chance-swatch" style="${swatchStyle}"></span>
        <span class="chance-name">${r.name}</span>
        ${unlocked
          ? `<span class="chance-pct">${pctText}</span>`
          : `<span class="chance-lock">🔒 ab Amboss-Lvl ${r.unlock}</span>`}
      </div>`;
  }).join('');
}

function renderLevel() {
  document.getElementById('anvilLevel').textContent = state.anvilLevel;
  document.getElementById('anvilLevelInline').textContent = state.anvilLevel;
  document.getElementById('upgradeCostInline').textContent = upgradeCost(state.anvilLevel);
  document.getElementById('upgradeCost').innerHTML =
    `${upgradeCost(state.anvilLevel)} <svg class="mini-coin"><use href="icons.svg#coin"/></svg>`;
  renderChances();
}

// Amboss-Info (Level + Raritäts-Chancen) - eigenes Fenster, geöffnet über den Upgrade-Button.
const anvilInfoModal = document.getElementById('anvilInfoModal');
const anvilUpgradeBtn = document.getElementById('anvilUpgradeBtn');
anvilUpgradeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  anvilInfoModal.classList.add('open');
  renderLevel();
});
document.getElementById('anvilInfoClose').addEventListener('click', () => {
  anvilInfoModal.classList.remove('open');
});
anvilInfoModal.addEventListener('click', (e) => {
  if (e.target === anvilInfoModal) anvilInfoModal.classList.remove('open');
});

const upgradeConfirmBtn = document.getElementById('upgradeConfirmBtn');
function upgradeAnvil() {
  const cost = upgradeCost(state.anvilLevel);
  if (!spendGold(cost)) {
    upgradeConfirmBtn.classList.remove('insufficient');
    void upgradeConfirmBtn.offsetWidth;
    upgradeConfirmBtn.classList.add('insufficient');
    return;
  }
  state.anvilLevel += 1;
  renderLevel();
  anvilUpgradeBtn.classList.remove('flash');
  void anvilUpgradeBtn.offsetWidth;
  anvilUpgradeBtn.classList.add('flash');
}
upgradeConfirmBtn.addEventListener('click', upgradeAnvil);

// Schmiede-Ergebnis: zeigt AUSSCHLIESSLICH das gerade geschmiedete Teil,
// mittig, mit allen Werten und Ausruesten/Verkaufen - keine Level-/Chancen-Infos.
const forgeResult = document.getElementById('forgeResult');

function renderForgeResult() {
  const crafted = state.lastCrafted;
  if (!crafted) {
    forgeResult.innerHTML = '<span class="forge-result-hint">Noch nichts geschmiedet.</span>';
    return;
  }
  const { slot, rarity, statValue } = crafted;
  const equipped = state.equipment[slot.id];
  const swatchColor = rarity.color.startsWith('linear') ? '#fff' : rarity.color;

  let compareHtml;
  if (!equipped) {
    compareHtml = '<span class="compare-new">Neu! Noch nichts in diesem Slot.</span>';
  } else if (statValue > equipped.statValue) {
    compareHtml = `<span class="compare-up">▲ besser (${formatStatValue(slot.stat, equipped.statValue)} getragen)</span>`;
  } else if (statValue < equipped.statValue) {
    compareHtml = `<span class="compare-down">▼ schwächer (${formatStatValue(slot.stat, equipped.statValue)} getragen)</span>`;
  } else {
    compareHtml = '<span>gleich stark wie getragenes Teil</span>';
  }

  forgeResult.innerHTML = `
    <span class="forge-result-close" id="forgeResultClose">&times;</span>
    <span class="forge-result-swatch" style="background:${swatchColor}">
      <svg class="slot-icon"><use href="icons.svg#${slot.id}"/></svg>
    </span>
    <span class="forge-result-text">
      <span class="forge-result-rarity" style="color:${swatchColor}">${rarity.name} · ${slot.name}</span>
      <span class="forge-result-stat">${slot.stat}: ${formatStatValue(slot.stat, statValue)}</span>
      <span class="forge-result-compare">${compareHtml}</span>
    </span>
    <div class="forge-result-actions">
      <button class="forge-equip-btn" id="equipBtn">Ausrüsten</button>
      <button class="forge-sell-btn" id="sellBtn">Verkaufen (+${sellPrice(rarity)} <svg class="mini-coin"><use href="icons.svg#coin"/></svg>)</button>
    </div>`;

  document.getElementById('forgeResultClose').addEventListener('click', () => {
    forgeModal.classList.remove('open');
  });
  document.getElementById('equipBtn').addEventListener('click', () => {
    state.equipment[slot.id] = { rarity, statValue };
    renderSlot(slot.id);
    renderStats();
    applyEquipmentToBattle();
    updatePlayerHpBar();
    state.lastCrafted = null;
    forgeModal.classList.remove('open');
  });
  document.getElementById('sellBtn').addEventListener('click', () => {
    goldEl.textContent = getGold() + sellPrice(rarity);
    state.lastCrafted = null;
    forgeModal.classList.remove('open');
  });
}

function craftItem() {
  const cost = craftCost(state.anvilLevel);
  if (!spendGold(cost)) return false;
  const rarity = rollRarity(state.anvilLevel);
  const slot = SLOT_TYPES[Math.floor(Math.random() * SLOT_TYPES.length)];
  const statValue = rollStat(rarity, state.anvilLevel, slot);
  state.lastCrafted = { slot, rarity, statValue };
  return true;
}

// Amboss antippen = sofort schmieden, Ergebnis wird direkt angezeigt.
const forgeModal = document.getElementById('forgeModal');
const forgeHero = document.querySelector('.forge-hero');
forgeHero?.addEventListener('click', () => {
  const crafted = craftItem();
  if (!crafted) {
    forgeHero.classList.remove('insufficient');
    void forgeHero.offsetWidth;
    forgeHero.classList.add('insufficient');
    return;
  }
  renderForgeResult();
  forgeModal.classList.add('open');
});
forgeModal.addEventListener('click', (e) => {
  if (e.target === forgeModal) forgeModal.classList.remove('open');
});

/* ---------- Abenteuer / Battle - Seite 2 ----------
   Gegner laufen automatisch von rechts auf den ganz links stehenden
   Spieler zu. Eine Welle kann 1-3 (dafuer schwaechere) Gegner haben,
   die gleichzeitig einlaufen und sich nebeneinander aufstellen. Sobald
   ein Gegner angekommen ist, ist er treffbar; der Spieler-Angriff
   trifft ALLE angekommenen Gegner gleichzeitig (Flaechenschaden), jeder
   angekommene Gegner greift zusaetzlich selbst im eigenen Takt an. HP
   und Angriff jedes Gegners stehen ueber ihm. Die Wellenstaerke steigt
   NICHT linear: mal ein kleiner Sprung nach oben, mal ein leichter
   Ruecksetzer - aber langfristig steigend. Bei Niederlage pausiert der
   Kampf mit einem Retry-Screen statt automatisch weiterzulaufen. Der
   Kampf laeuft ausserdem NUR, waehrend diese Seite tatsaechlich
   sichtbar ist (per Wisch-Geste erreichbar) - auf der Ausruestungs-
   Seite pausiert alles. */

const ENEMY_NAMES = ['Schleim', 'Goblin', 'Wolf', 'Ork', 'Spinne'];
const ENEMY_ICONS = ['slime', 'goblin'];

const battle = {
  wave: 1,
  playerHp: 500,
  playerMaxHp: 500,
  playerDmg: 15,
  difficulty: 1,
  enemies: [], // { hp, maxHp, dmg, reward, name, icon, el, hpFillEl, hpTextEl, reached, attackTimer }
  playerAttackTimer: null,
  defeated: false,
  started: false, // erste Welle wurde schon gespawnt
  active: false,  // Seite gerade sichtbar -> Timer laufen
};

const battleStage = document.getElementById('battleStage');
const enemyQueue = document.getElementById('enemyQueue');
const playerHpFill = document.getElementById('playerHpFill');
const playerHpText = document.getElementById('playerHpText');
const waveNumEl = document.getElementById('waveNum');
const defeatOverlay = document.getElementById('defeatOverlay');

// Nicht-lineare Wellenstaerke: die Basisschwierigkeit schwankt bei jedem
// Aufruf zufaellig (mal rauf, mal etwas runter), bleibt aber nie unter
// einer langsam steigenden Untergrenze - so bleibt der Trend aufwaerts,
// ohne dass jede Welle staerker als die vorherige sein muss.
function nextDifficulty(wave) {
  const swing = 0.75 + Math.random() * 0.7; // 0.75x bis 1.45x
  const floor = 1 + (wave - 1) * 0.1;
  battle.difficulty = Math.max(battle.difficulty * swing, floor);
  return battle.difficulty;
}

function rollEnemyCount() {
  const r = Math.random();
  if (r < 0.5) return 1;
  if (r < 0.82) return 2;
  return 3;
}

function buildWave(wave) {
  const diff = nextDifficulty(wave);
  const count = rollEnemyCount();
  const groupHp = 70 * diff;
  const groupDmg = 16 * diff;
  const groupReward = 14 * diff;
  const enemies = [];
  for (let i = 0; i < count; i++) {
    const variance = 0.85 + Math.random() * 0.3;
    enemies.push({
      hp: Math.max(20, Math.round((groupHp / count) * variance)),
      maxHp: 0, // wird unten gesetzt
      dmg: Math.max(4, Math.round((groupDmg / count) * variance)),
      reward: Math.max(3, Math.round((groupReward / count) * variance)),
      name: ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)],
      icon: ENEMY_ICONS[Math.floor(Math.random() * ENEMY_ICONS.length)],
    });
  }
  enemies.forEach(e => { e.maxHp = e.hp; });
  return enemies;
}

function updatePlayerHpBar() {
  const pct = Math.max(0, (battle.playerHp / battle.playerMaxHp) * 100);
  playerHpFill.style.width = pct + '%';
  playerHpText.textContent = `${Math.max(0, Math.round(battle.playerHp))} / ${Math.round(battle.playerMaxHp)}`;
}
function updateEnemyHpBar(enemy) {
  const pct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
  enemy.hpFillEl.style.width = pct + '%';
  enemy.hpTextEl.textContent = `${Math.max(0, enemy.hp)} / ${enemy.maxHp}`;
}

function createEnemyEl(enemy, stopPct) {
  const el = document.createElement('div');
  el.className = 'enemy-unit';
  el.style.setProperty('--stop', stopPct + '%');
  el.innerHTML = `
    <span class="enemy-name">${enemy.name}</span>
    <span class="enemy-stat-line">
      <span class="enemy-stat-hp">♥ ${enemy.hp}</span>
      <span class="enemy-stat-atk">⚔ ${enemy.dmg}</span>
    </span>
    <div class="hp-bar enemy-hp-bar">
      <div class="hp-fill"></div>
      <span class="hp-text">${enemy.hp} / ${enemy.maxHp}</span>
    </div>
    <svg class="enemy-sprite" viewBox="0 0 80 90"><use href="icons.svg#${enemy.icon}"/></svg>`;
  enemyQueue.appendChild(el);
  enemy.el = el;
  enemy.hpFillEl = el.querySelector('.hp-fill');
  enemy.hpTextEl = el.querySelector('.hp-text');
  enemy.atkEl = el.querySelector('.enemy-stat-atk');
  return el;
}

// Alle Gegner einer Welle laufen gleichzeitig ein und stellen sich
// nebeneinander auf (nicht hintereinander in einer Warteschlange).
const QUEUE_STOPS = [40, 22, 58];

function spawnWave() {
  clearTimeout(battle.playerAttackTimer);
  enemyQueue.innerHTML = '';
  waveNumEl.textContent = battle.wave;
  battle.defeated = false;
  defeatOverlay.classList.remove('open');

  const list = buildWave(battle.wave);
  battle.enemies = list;
  list.forEach((enemy, i) => {
    createEnemyEl(enemy, QUEUE_STOPS[Math.min(i, QUEUE_STOPS.length - 1)]);
  });

  requestAnimationFrame(() => {
    list.forEach(e => {
      void e.el.offsetWidth;
      e.el.classList.add('approached');
    });
  });

  // Sobald ein Gegner ankommt, ist er treffbar und greift selbst an.
  list.forEach(enemy => {
    enemy.arriveTimer = setTimeout(() => {
      if (battle.defeated || !battle.active) return;
      enemy.reached = true;
      scheduleEnemyAttack(enemy);
    }, 1900);
  });

  if (battle.active) schedulePlayerAttack();
}

function scheduleEnemyAttack(enemy) {
  if (battle.defeated || !battle.active || enemy.hp <= 0 || !battle.enemies.includes(enemy)) return;
  enemy.attackTimer = setTimeout(() => {
    if (battle.defeated || !battle.active || enemy.hp <= 0 || !battle.enemies.includes(enemy)) return;
    dealDamageToPlayer(enemy.dmg);
    scheduleEnemyAttack(enemy);
  }, 1100);
}

function schedulePlayerAttack() {
  if (battle.defeated || !battle.active) return;
  battle.playerAttackTimer = setTimeout(() => {
    if (battle.defeated || !battle.active) return;
    attackAllEnemies();
    schedulePlayerAttack();
  }, 800);
}

function showFloatingText(text, x, y, cls) {
  const el = document.createElement('span');
  el.className = 'dmg-popup' + (cls ? ' ' + cls : '');
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  battleStage.appendChild(el);
  setTimeout(() => el.remove(), 650);
}

function dealDamageToPlayer(amount) {
  battle.playerHp = Math.max(0, battle.playerHp - amount);
  updatePlayerHpBar();
  const rect = document.querySelector('.player-side').getBoundingClientRect();
  const stageRect = battleStage.getBoundingClientRect();
  showFloatingText('-' + amount, rect.left - stageRect.left + 16, rect.top - stageRect.top, 'player-dmg');

  if (battle.playerHp <= 0 && !battle.defeated) {
    battle.defeated = true;
    battle.enemies.forEach(e => clearTimeout(e.attackTimer));
    clearTimeout(battle.playerAttackTimer);
    defeatOverlay.classList.add('open');
  }
}

// Trifft ALLE angekommenen Gegner gleichzeitig mit einem Angriff.
function attackAllEnemies() {
  if (battle.defeated) return;
  const targets = battle.enemies.filter(e => e.reached && e.hp > 0);
  if (targets.length === 0) return;

  const stageRect = battleStage.getBoundingClientRect();
  const dead = [];
  targets.forEach(enemy => {
    const dmg = Math.round(battle.playerDmg * (0.85 + Math.random() * 0.3));
    enemy.hp -= dmg;
    updateEnemyHpBar(enemy);

    const rect = enemy.el.getBoundingClientRect();
    showFloatingText('-' + dmg, rect.left - stageRect.left + 10, rect.top - stageRect.top - 8, '');

    enemy.el.classList.remove('hit');
    void enemy.el.offsetWidth;
    enemy.el.classList.add('hit');

    if (enemy.hp <= 0) dead.push(enemy);
  });

  dead.forEach(enemy => {
    clearTimeout(enemy.attackTimer);
    clearTimeout(enemy.arriveTimer);
    const reward = enemy.reward;
    goldEl.textContent = getGold() + reward;
    const rp = document.createElement('span');
    rp.className = 'reward-popup';
    rp.textContent = `+${reward} Gold`;
    battleStage.appendChild(rp);
    setTimeout(() => rp.remove(), 900);

    enemy.el.classList.add('dying');
    battle.enemies = battle.enemies.filter(e => e !== enemy);
    setTimeout(() => enemy.el.remove(), 400);
  });

  if (dead.length > 0 && battle.enemies.length === 0) {
    clearTimeout(battle.playerAttackTimer);
    battle.wave += 1;
    battle.playerHp = battle.playerMaxHp; // jede neue Welle: volle HP
    updatePlayerHpBar();
    setTimeout(spawnWave, 700);
  }
}

document.getElementById('defeatRetryBtn').addEventListener('click', () => {
  battle.playerHp = battle.playerMaxHp;
  updatePlayerHpBar();
  battle.defeated = false;
  defeatOverlay.classList.remove('open');
  battle.enemies.forEach(enemy => {
    if (enemy.reached) scheduleEnemyAttack(enemy);
  });
  schedulePlayerAttack();
});

// Spieler-HP und -Schaden im Kampf ergeben sich aus der Ausruestung
// (HP/ATK-Stats) - ohne Gear ist man schwach, jedes Teil zaehlt spuerbar.
function applyEquipmentToBattle() {
  const totals = computeStats();
  battle.playerMaxHp = 500 + totals.HP * 5;
  battle.playerDmg = 15 + totals.ATK * 1.2;
  if (battle.playerHp > battle.playerMaxHp || battle.playerHp === undefined) {
    battle.playerHp = battle.playerMaxHp;
  }
}

// Der Kampf laeuft komplett automatisch (kein Antippen des Gegners noetig),
// aber NUR solange die Kampf-Seite tatsaechlich sichtbar/offen ist.
applyEquipmentToBattle();
battle.playerHp = battle.playerMaxHp;
updatePlayerHpBar();

function resumeBattle() {
  if (battle.active) return;
  battle.active = true;
  if (!battle.started) {
    battle.started = true;
    spawnWave();
    return;
  }
  if (battle.defeated) return; // wartet auf "Erneut versuchen"
  battle.enemies.forEach(enemy => {
    if (enemy.reached) scheduleEnemyAttack(enemy);
  });
  schedulePlayerAttack();
}

function pauseBattle() {
  if (!battle.active) return;
  battle.active = false;
  clearTimeout(battle.playerAttackTimer);
  battle.enemies.forEach(enemy => clearTimeout(enemy.attackTimer));
}

const pageBattleEl = document.getElementById('pageBattle');
const battleVisibilityObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
      resumeBattle();
    } else {
      pauseBattle();
    }
  });
}, { root: document.getElementById('pagesTrack'), threshold: [0, 0.6, 1] });
battleVisibilityObserver.observe(pageBattleEl);

// Wischen zwischen Ausruestungs-Seite (1) und Kampf-Seite (2). Ein Klick
// auf den Abenteuer-Banner scrollt als Komfort-Abkuerzung ebenfalls dorthin.
const pagesTrack = document.getElementById('pagesTrack');
document.getElementById('adventureBanner').addEventListener('click', () => {
  pagesTrack.scrollTo({ left: DESIGN_WIDTH, behavior: 'smooth' });
});

// Start: keine Ausruestung, alle Werte auf 0 - erst Schmieden + Ausruesten baut die Werte auf.
renderAllSlots();
