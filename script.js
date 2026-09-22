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
  { key: 'grau', name: 'Grau', color: '#9aa3c0', unlock: 1, weight: 1000, mult: 1.0 },
  { key: 'gruen', name: 'Grün', color: '#22c55e', unlock: 2, weight: 220, mult: 1.35 },
  { key: 'blau', name: 'Blau', color: '#2f9dff', unlock: 4, weight: 90, mult: 1.8 },
  { key: 'lila', name: 'Lila', color: '#9b5cf6', unlock: 6, weight: 30, mult: 2.4 },
  { key: 'gold', name: 'Gold', color: '#ffab2e', unlock: 9, weight: 10, mult: 3.2 },
  { key: 'mystisch', name: 'Mystisch', color: '#ff5c9d', unlock: 12, weight: 3, mult: 4.2 },
  { key: 'goettlich', name: 'Göttlich', color: '#ff5a4a', unlock: 16, weight: 1, mult: 5.6 },
  { key: 'himmlisch', name: 'Himmlisch', color: 'linear-gradient(90deg,#ff5a4a,#ffab2e,#22c55e,#2f9dff,#9b5cf6)', unlock: 20, weight: 0.3, mult: 7.5 },
];

// Welchen Slot ein Item betrifft und welchen Grundwert es traegt.
// Zwei Slots rechts oben (Fluegel) und drei weitere (Geheimer Stein, Edelstein,
// Unbekannt) sind bewusst nicht ueber die Schmiede erreichbar (gesperrt).
// Alle 14 Slots sind freigeschaltet und ueber die Schmiede erreichbar.
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
  { id: 'wingstar', name: 'Flügel', stat: 'SPD', base: 4 },
  { id: 'scroll', name: 'Geheimer Stein', stat: 'ER', base: 0.1 },
  { id: 'gem', name: 'Edelstein', stat: 'Crit', base: 0.12 },
  { id: 'question', name: 'Mysteriöses Relikt', stat: 'Betaeubung', base: 0.08 },
];
const PCT_STATS = ['CMB', 'CTA', 'Crit', 'ER', 'Betaeubung'];

// Fluegel (wingstar) sind exklusiv - sie kommen NIE aus dem normalen Amboss,
// nur als Boss-Sieg-Belohnung. Die normale Schmiede waehlt ihren Slot nur
// aus dieser gefilterten Liste.
const FORGE_SLOT_TYPES = SLOT_TYPES.filter(s => s.id !== 'wingstar');

const state = {
  anvilLevel: 1,
  equipment: {}, // slotId -> { rarity, statValue } | nicht gesetzt = leer
  lastCrafted: null, // { slot, rarity, statValue }
};

function formatStatValue(statKey, value) {
  return PCT_STATS.includes(statKey) ? value.toFixed(1).replace('.', ',') + '%' : Math.round(value);
}

// Grundwerte: das hat man schon ohne jede Ausruestung. Die Schmiede-Teile
// zaehlen immer oben drauf - der angezeigte Wert ist Grundwert + Ausruestung,
// und genau dieser Gesamtwert ist es auch, der im Kampf zaehlt.
const BASE_STATS = { HP: 100, ATK: 10, DEF: 0, SPD: 0, CMB: 0, CTA: 0, Betaeubung: 0, ER: 0, Crit: 0 };

function computeStats() {
  const totals = { ...BASE_STATS };
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

  // Fluegel-exklusiv: "+N" Verstaerkungs-Badge auf der Slot-Kachel.
  if (slotId === 'wingstar') {
    const badgeEl = document.getElementById('wingstarEnhanceBadge');
    if (badgeEl) {
      const level = item && item.enhanceLevel ? item.enhanceLevel : 0;
      if (level > 0) {
        badgeEl.textContent = '+' + level;
        badgeEl.classList.add('show');
      } else {
        badgeEl.textContent = '';
        badgeEl.classList.remove('show');
      }
    }
  }
}

function renderAllSlots() {
  SLOT_TYPES.forEach(s => renderSlot(s.id));
  renderStats();
  updateCharacterFx();
}

// Buff-Glow: leuchtende Fluegel hinter dem Charakter, sichtbar sobald ein
// Fluegel-Item (wingstar) ausgeruestet ist. Farbe kommt von der Raritaet des
// getragenen Teils ('himmlisch' hat einen linear-gradient()-String statt
// Hex-Farbe als color -> eigene CSS-Klasse mit vordefiniertem Regenbogen-
// Gradient statt dem per --fx-color gesetzten Inline-Wert). Groesse/
// Intensitaet skaliert leicht mit enhanceLevel, gecappt bei +30% (Level 10+).
function updateCharacterFx() {
  const characterFx = document.getElementById('characterFx');
  if (!characterFx) return;
  const item = state.equipment.wingstar;
  if (!item) {
    characterFx.classList.remove('active', 'fx-rainbow');
    characterFx.style.removeProperty('--fx-color');
    characterFx.style.removeProperty('--fx-scale');
    return;
  }
  const color = item.rarity.color;
  const isGradient = color.startsWith('linear');
  characterFx.classList.toggle('fx-rainbow', isGradient);
  if (isGradient) {
    characterFx.style.removeProperty('--fx-color');
  } else {
    characterFx.style.setProperty('--fx-color', color);
  }
  const cappedLevel = Math.min(item.enhanceLevel || 0, 10);
  const scale = 1 + (cappedLevel / 10) * 0.3; // max +30% Groesse/Glow-Radius
  characterFx.style.setProperty('--fx-scale', scale.toFixed(3));
  characterFx.classList.add('active');
}

// Slot antippen -> zeigt Name, Rarität und Wert des getragenen Teils
// (oder "leer"), mit der Moeglichkeit es wieder abzulegen.
const slotInfoModal = document.getElementById('slotInfoModal');
const slotInfoContent = document.getElementById('slotInfoContent');

function showSlotInfo(slotId) {
  const slotDef = SLOT_TYPES.find(s => s.id === slotId);
  if (!slotDef) return;
  const item = state.equipment[slotId];

  if (!item) {
    slotInfoContent.innerHTML = `
      <span class="forge-result-close" id="slotInfoClose">&times;</span>
      <span class="forge-result-swatch" style="background:#3a3226">
        <svg class="slot-icon"><use href="icons.svg#${slotId}"/></svg>
      </span>
      <span class="forge-result-text">
        <span class="forge-result-rarity" style="color:#c9bb9a">${slotDef.name}</span>
        <span class="forge-result-stat">Leer</span>
        <span class="forge-result-compare">Beim Amboss schmieden, um dieses Teil zu füllen.</span>
      </span>`;
  } else {
    const swatchColor = item.rarity.color.startsWith('linear') ? '#fff' : item.rarity.color;
    const isWingstar = slotId === 'wingstar';
    const level = item.enhanceLevel || 0;
    const enhanceHtml = isWingstar ? (() => {
      const goldCost = wingstarEnhanceGoldCost(level);
      const oreCost = wingstarEnhanceOreCost(level);
      const canAfford = getGold() >= goldCost && getOre() >= oreCost;
      return `
      <button class="slot-enhance-btn${canAfford ? '' : ' disabled'}" id="wingstarEnhanceBtn">
        <span>Verstärken${level > 0 ? ' (+' + level + ')' : ''}</span>
        <span class="forge-cost">
          ${goldCost} <svg class="mini-coin"><use href="icons.svg#coin"/></svg>
          ${oreCost} <svg class="mini-coin"><use href="icons.svg#ore"/></svg>
        </span>
      </button>`;
    })() : '';
    slotInfoContent.innerHTML = `
      <span class="forge-result-close" id="slotInfoClose">&times;</span>
      <span class="forge-result-swatch" style="background:${swatchColor}">
        <svg class="slot-icon"><use href="icons.svg#${slotId}"/></svg>
      </span>
      <span class="forge-result-text">
        <span class="forge-result-rarity" style="color:${swatchColor}">${item.rarity.name} · ${slotDef.name}</span>
        <span class="forge-result-stat">${slotDef.stat}: ${formatStatValue(slotDef.stat, item.statValue)}</span>
      </span>
      ${enhanceHtml}
      <div class="forge-result-actions">
        <button class="forge-sell-btn" id="slotUnequipBtn">Ablegen</button>
      </div>`;
  }

  document.getElementById('slotInfoClose').addEventListener('click', () => {
    slotInfoModal.classList.remove('open');
  });
  const unequipBtn = document.getElementById('slotUnequipBtn');
  if (unequipBtn) {
    unequipBtn.addEventListener('click', () => {
      delete state.equipment[slotId];
      renderSlot(slotId);
      renderStats();
      updateCharacterFx();
      slotInfoModal.classList.remove('open');
    });
  }
  const enhanceBtn = document.getElementById('wingstarEnhanceBtn');
  if (enhanceBtn) {
    enhanceBtn.addEventListener('click', () => {
      const ok = enhanceWingstar();
      if (!ok) {
        enhanceBtn.classList.remove('insufficient');
        void enhanceBtn.offsetWidth;
        enhanceBtn.classList.add('insufficient');
        return;
      }
      showSlotInfo(slotId); // Panel mit neuem Wert/Kosten neu aufbauen
    });
  }

  slotInfoModal.classList.add('open');
}

// Fluegel-exklusives Verstaerkungs-System: jede Stufe kostet mehr Gold UND
// Erze (beide Kosten wachsen exponentiell) und hebt den Statwert um ~12%.
function wingstarEnhanceGoldCost(level) {
  return Math.round(80 * Math.pow(1.35, level));
}
function wingstarEnhanceOreCost(level) {
  return Math.round(5 * Math.pow(1.25, level));
}

function enhanceWingstar() {
  const item = state.equipment['wingstar'];
  if (!item) return false;
  const level = item.enhanceLevel || 0;
  const goldCost = wingstarEnhanceGoldCost(level);
  const oreCost = wingstarEnhanceOreCost(level);
  if (getGold() < goldCost || getOre() < oreCost) return false;
  spendGold(goldCost);
  spendOre(oreCost);
  item.enhanceLevel = level + 1;
  const slotDef = SLOT_TYPES.find(s => s.id === 'wingstar');
  const raw = item.statValue * 1.12;
  item.statValue = PCT_STATS.includes(slotDef.stat)
    ? Math.round(raw * 10) / 10
    : Math.max(item.statValue + 1, Math.round(raw));
  renderSlot('wingstar');
  renderStats();
  updateCharacterFx();
  return true;
}

SLOT_TYPES.forEach(slot => {
  const el = document.getElementById('slot-' + slot.id);
  el?.addEventListener('click', () => showSlotInfo(slot.id));
});
slotInfoModal.addEventListener('click', (e) => {
  if (e.target === slotInfoModal) slotInfoModal.classList.remove('open');
});

const goldEl = document.getElementById('goldValue');
function getGold() { return parseInt(goldEl.textContent, 10); }
function spendGold(amount) {
  if (getGold() < amount) return false;
  goldEl.textContent = getGold() - amount;
  return true;
}

// Edelsteine (oben in der Top-Bar) und Erze (dritte Waehrung, kommt ueber
// Boss-Belohnungen) - gleiches simples Text-basiertes Muster wie Gold.
const gemsEl = document.getElementById('gemsValue');
function getGems() { return parseInt(gemsEl.textContent, 10); }
function addGems(amount) { gemsEl.textContent = getGems() + amount; }

const oreEl = document.getElementById('oreValue');
function getOre() { return parseInt(oreEl.textContent, 10); }
function addOre(amount) { oreEl.textContent = getOre() + amount; }
function spendOre(amount) {
  if (getOre() < amount) return false;
  oreEl.textContent = getOre() - amount;
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
    state.equipment[slot.id] = { rarity, statValue, enhanceLevel: 0 };
    renderSlot(slot.id);
    renderStats();
    updateCharacterFx();
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
  const slot = FORGE_SLOT_TYPES[Math.floor(Math.random() * FORGE_SLOT_TYPES.length)];
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


// Start: keine Ausruestung, alle Werte auf 0 - erst Schmieden + Ausruesten baut die Werte auf.
renderAllSlots();
