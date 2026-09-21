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
