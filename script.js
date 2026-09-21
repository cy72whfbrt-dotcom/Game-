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

const state = {
  anvilLevel: 1,
};

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

function rollStat(rarity, level) {
  const base = 100;
  const bonus = rarity.key === 'grau' ? grauBonus(level) : 0;
  const randomFactor = 0.9 + Math.random() * 0.2;
  return Math.round(base * rarity.mult * (1 + bonus) * randomFactor);
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
  document.getElementById('upgradeCost').innerHTML =
    `${upgradeCost(state.anvilLevel)} <svg class="mini-coin"><use href="icons.svg#coin"/></svg>`;
  document.getElementById('craftCost').innerHTML =
    `${craftCost(state.anvilLevel)} <svg class="mini-coin"><use href="icons.svg#coin"/></svg>`;
  renderChances();
}

document.getElementById('upgradeBtn').addEventListener('click', () => {
  const cost = upgradeCost(state.anvilLevel);
  if (!spendGold(cost)) return;
  state.anvilLevel += 1;
  renderLevel();
});

document.getElementById('craftBtn').addEventListener('click', () => {
  const cost = craftCost(state.anvilLevel);
  if (!spendGold(cost)) return;
  const rarity = rollRarity(state.anvilLevel);
  const statValue = rollStat(rarity, state.anvilLevel);
  const result = document.getElementById('forgeResult');
  const swatchStyle = rarity.color.startsWith('linear') ? rarity.color : rarity.color;
  result.innerHTML = `
    <span class="forge-result-swatch" style="background:${swatchStyle}"></span>
    <span class="forge-result-text">
      <span class="forge-result-rarity" style="color:${rarity.color.startsWith('linear') ? '#fff' : rarity.color}">${rarity.name}</span>
      <span class="forge-result-stat">Wert: ${statValue}</span>
    </span>`;
});

const forgeModal = document.getElementById('forgeModal');
document.querySelector('.forge-hero')?.addEventListener('click', () => {
  forgeModal.classList.add('open');
  renderLevel();
});
document.getElementById('forgeClose').addEventListener('click', () => {
  forgeModal.classList.remove('open');
});
forgeModal.addEventListener('click', (e) => {
  if (e.target === forgeModal) forgeModal.classList.remove('open');
});

/* ---------- Abenteuer / Battle screen ----------
   Gegner laufen von rechts auf den Spieler zu. Antippen macht Schaden.
   Erreicht der Gegner den Spieler, greift er im Takt an. Bei Sieg gibt
   es Gold, die naechste (etwas staerkere) Welle startet automatisch. */

const ENEMY_NAMES = ['Schleim', 'Goblin', 'Wolf', 'Ork', 'Spinne'];

const battle = {
  wave: 1,
  playerHp: 5000,
  playerMaxHp: 5000,
  enemyHp: 0,
  enemyMaxHp: 0,
  approachTimer: null,
  attackTimer: null,
  enemyReachedPlayer: false,
};

const battleScreen = document.getElementById('battleScreen');
const battleStage = document.getElementById('battleStage');
const enemySide = document.getElementById('enemySide');
const enemySprite = document.getElementById('enemySprite');
const enemyNameEl = document.getElementById('enemyName');
const enemyHpFill = document.getElementById('enemyHpFill');
const enemyHpText = document.getElementById('enemyHpText');
const playerHpFill = document.getElementById('playerHpFill');
const playerHpText = document.getElementById('playerHpText');
const waveNumEl = document.getElementById('waveNum');

function enemyStatsForWave(wave) {
  const maxHp = Math.round(80 * Math.pow(1.18, wave - 1));
  const dmg = Math.round(60 * Math.pow(1.12, wave - 1));
  const reward = Math.round(15 * Math.pow(1.1, wave - 1));
  const name = ENEMY_NAMES[(wave - 1) % ENEMY_NAMES.length];
  const icon = wave % 2 === 0 ? 'goblin' : 'slime';
  return { maxHp, dmg, reward, name, icon };
}

function updatePlayerHpBar() {
  const pct = Math.max(0, (battle.playerHp / battle.playerMaxHp) * 100);
  playerHpFill.style.width = pct + '%';
  playerHpText.textContent = `${Math.max(0, battle.playerHp)} / ${battle.playerMaxHp}`;
}
function updateEnemyHpBar() {
  const pct = Math.max(0, (battle.enemyHp / battle.enemyMaxHp) * 100);
  enemyHpFill.style.width = pct + '%';
  enemyHpText.textContent = `${Math.max(0, battle.enemyHp)} / ${battle.enemyMaxHp}`;
}

function spawnEnemy() {
  clearTimeout(battle.attackTimer);
  const stats = enemyStatsForWave(battle.wave);
  battle.enemyMaxHp = stats.maxHp;
  battle.enemyHp = stats.maxHp;
  battle.enemyReachedPlayer = false;
  battle.currentDmg = stats.dmg;
  battle.currentReward = stats.reward;
  enemyNameEl.textContent = stats.name;
  enemySprite.innerHTML = `<use href="icons.svg#${stats.icon}"/>`;
  waveNumEl.textContent = battle.wave;
  updateEnemyHpBar();

  enemySide.classList.remove('dying', 'approached');
  // Reflow erzwingen, damit die Anlauf-Transition sauber neu startet
  void enemySide.offsetWidth;
  requestAnimationFrame(() => {
    enemySide.classList.add('approached');
  });

  battle.approachTimer = setTimeout(() => {
    battle.enemyReachedPlayer = true;
    scheduleEnemyAttack();
  }, 2300);
}

function scheduleEnemyAttack() {
  if (!battle.enemyReachedPlayer || battle.enemyHp <= 0) return;
  battle.attackTimer = setTimeout(() => {
    if (battle.enemyHp <= 0) return;
    dealDamageToPlayer(battle.currentDmg);
    scheduleEnemyAttack();
  }, 1100);
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
  showFloatingText('-' + amount, rect.left - stageRect.left + 20, rect.top - stageRect.top, 'player-dmg');
  if (battle.playerHp <= 0) {
    clearTimeout(battle.attackTimer);
    showFloatingText('Niederlage!', stageRect.width / 2 - 30, stageRect.height / 2, 'player-dmg');
    setTimeout(() => {
      battle.playerHp = battle.playerMaxHp;
      updatePlayerHpBar();
    }, 900);
  }
}

function attackEnemy() {
  if (battle.enemyHp <= 0) return;
  const dmg = Math.round(35 + Math.random() * 25);
  battle.enemyHp -= dmg;
  updateEnemyHpBar();

  const rect = enemySide.getBoundingClientRect();
  const stageRect = battleStage.getBoundingClientRect();
  showFloatingText('-' + dmg, rect.left - stageRect.left + 15, rect.top - stageRect.top - 10, '');

  enemySide.classList.remove('hit');
  void enemySide.offsetWidth;
  enemySide.classList.add('hit');

  if (battle.enemyHp <= 0) {
    clearTimeout(battle.approachTimer);
    clearTimeout(battle.attackTimer);
    const reward = battle.currentReward;
    goldEl.textContent = getGold() + reward;
    const rp = document.createElement('span');
    rp.className = 'reward-popup';
    rp.textContent = `+${reward} Gold`;
    battleStage.appendChild(rp);
    setTimeout(() => rp.remove(), 900);

    enemySide.classList.add('dying');
    battle.wave += 1;
    setTimeout(spawnEnemy, 700);
  }
}

enemySide.addEventListener('click', attackEnemy);

document.getElementById('adventureBanner').addEventListener('click', () => {
  battleScreen.classList.add('open');
  updatePlayerHpBar();
  spawnEnemy();
});
document.getElementById('battleBack').addEventListener('click', () => {
  battleScreen.classList.remove('open');
  clearTimeout(battle.approachTimer);
  clearTimeout(battle.attackTimer);
});
