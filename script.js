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
  pets: [], // { rarity } - aus dem Boss-Kampf, besetzen den Begleiter-Halbkreis
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

// Kraft: ein einziger Gesamtwert aus allen Stats, gewichtet nach grobem
// Kampfwert - gibt auf einen Blick her, wie stark die aktuelle Ausruestung
// insgesamt ist. Jedes ausgeruestete Teil traegt ueber seinen Stat bei.
const POWER_WEIGHTS = { HP: 0.4, ATK: 5, DEF: 4, SPD: 6, Crit: 8, CMB: 6, CTA: 6, Betaeubung: 6, ER: 5 };
function computePower(totals) {
  return Math.round(Object.keys(POWER_WEIGHTS).reduce((sum, key) => sum + totals[key] * POWER_WEIGHTS[key], 0));
}

function renderPower(totals) {
  const powerEl = document.getElementById('powerValue');
  if (!powerEl) return;
  const power = computePower(totals);
  if (powerEl.textContent === String(power)) return;
  powerEl.textContent = power;
  powerEl.classList.remove('bump');
  void powerEl.offsetWidth;
  powerEl.classList.add('bump');
}

function renderStats() {
  const totals = computeStats();
  renderPower(totals);
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

// Begleiter-Halbkreis im Kampf: die ersten (bis zu) 5 eingesammelten Pets
// besetzen die Plaetze, in der Farbe ihrer Raritaet. Rest bleibt gesperrt.
function renderCompanionRing() {
  const slots = document.querySelectorAll('#companionRing .companion-slot');
  slots.forEach((slot, i) => {
    const pet = state.pets[i];
    if (pet) {
      const color = pet.rarity.color.startsWith('linear') ? '#fff' : pet.rarity.color;
      slot.classList.add('filled');
      slot.style.setProperty('--pet-color', color);
      slot.innerHTML = '<svg class="companion-pet-icon"><use href="icons.svg#bat"/></svg>';
    } else {
      slot.classList.remove('filled');
      slot.style.removeProperty('--pet-color');
      slot.innerHTML = '<svg class="companion-lock"><use href="icons.svg#question"/></svg>';
    }
  });
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
      applyEquipmentToBattle();
      updatePlayerHpBar();
      updatePlayerShieldBar();
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
  applyEquipmentToBattle();
  updatePlayerHpBar();
  updatePlayerShieldBar();
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
    applyEquipmentToBattle();
    updatePlayerHpBar();
    updatePlayerShieldBar();
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

/* ---------- Welle-Kampf - Seite 2 ----------
   Der Spieler steht fest links, Gegner laufen von rechts heran und
   stellen sich nebeneinander auf. Eine Welle kann 1-3 (dafuer schwaechere)
   Gegner haben, die gleichzeitig einlaufen. Sobald ein Gegner angekommen
   ist, ist er treffbar; der Spieler-Angriff trifft ALLE angekommenen
   Gegner gleichzeitig (Flaechenschaden), jeder angekommene Gegner greift
   zusaetzlich selbst im eigenen Takt an. Bei Niederlage pausiert der Kampf
   mit einem Retry-Screen statt automatisch weiterzulaufen. Der Kampf laeuft
   ausserdem NUR, waehrend diese Seite tatsaechlich sichtbar ist (per
   Wisch-Geste erreichbar) - auf der Ausruestungs-Seite pausiert alles. */

const ENEMY_TYPES = [
  { name: 'Schleim', icon: 'slime' },
  { name: 'Goblin', icon: 'goblin' },
  { name: 'Wolf', icon: 'wolf' },
  { name: 'Ork', icon: 'ork' },
  { name: 'Spinne', icon: 'spinne' },
];

const battle = {
  wave: 1,
  playerHp: 100,
  playerMaxHp: 100,
  playerDmg: 10,
  playerShield: 0,
  playerMaxShield: 0,
  difficulty: 1,
  enemies: [], // { hp, maxHp, dmg, reward, name, icon, el, hpFillEl, hpTextEl, reached, attackTimer }
  playerAttackTimer: null,
  petAttackTimer: null, // Gefaehrte (dragon) - eigener, unabhaengiger Angriffstakt
  petHelpersTimer: null, // Boss-Kampf-Pets im Begleiter-Halbkreis - eigener Takt
  defeated: false,
  started: false, // erste Welle wurde schon gespawnt
  active: false,  // Seite gerade sichtbar -> Timer laufen
};

const battleStage = document.getElementById('battleStage');
const enemyQueue = document.getElementById('enemyQueue');
const playerHpFill = document.getElementById('playerHpFill');
const playerHpText = document.getElementById('playerHpText');
const playerShieldBar = document.getElementById('playerShieldBar');
const playerShieldFill = document.getElementById('playerShieldFill');
const playerShieldText = document.getElementById('playerShieldText');
const waveNumEl = document.getElementById('waveNum');
const waveEntryNumEl = document.getElementById('waveEntryNum');
const defeatOverlay = document.getElementById('defeatOverlay');
const battlePlayerSprite = document.getElementById('battlePlayerSprite');
const playerWeapon = document.getElementById('playerWeapon');

// Angriffs-Animation: die Spielfigur lunged leicht nach vorn, und falls ein
// Schwert ausgeruestet ist, schwingt es sichtbar mit. Rein visuell, laeuft
// bei jedem gelandeten Spieler-Treffer.
function playPlayerAttackAnim() {
  battlePlayerSprite.classList.remove('attack-lunge');
  void battlePlayerSprite.offsetWidth;
  battlePlayerSprite.classList.add('attack-lunge');

  if (state.equipment.sword) {
    playerWeapon.classList.remove('swinging');
    void playerWeapon.offsetWidth;
    playerWeapon.classList.add('swinging');
  }
}

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
  // Abgestimmt auf die Grundwerte HP 100 / Angriff 10: aehnliche
  // Treffer-Anzahl wie vorher, nur auf die kleinere Basis skaliert.
  const groupHp = 45 * diff;
  const groupDmg = 3 * diff;
  const groupReward = 14 * diff;
  const enemies = [];
  for (let i = 0; i < count; i++) {
    const variance = 0.85 + Math.random() * 0.3;
    const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    enemies.push({
      hp: Math.max(8, Math.round((groupHp / count) * variance)),
      maxHp: 0, // wird unten gesetzt
      dmg: Math.max(2, Math.round((groupDmg / count) * variance)),
      reward: Math.max(3, Math.round((groupReward / count) * variance)),
      name: type.name,
      icon: type.icon,
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
function updatePlayerShieldBar() {
  if (battle.playerMaxShield <= 0) {
    playerShieldBar.classList.add('empty-shield');
    return;
  }
  playerShieldBar.classList.remove('empty-shield');
  const pct = Math.max(0, (battle.playerShield / battle.playerMaxShield) * 100);
  playerShieldFill.style.width = pct + '%';
  playerShieldText.textContent = `${Math.max(0, Math.round(battle.playerShield))} / ${Math.round(battle.playerMaxShield)}`;
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
    <div class="fighter-card">
      <span class="enemy-name">${enemy.name}</span>
      <span class="enemy-stat-line">
        <span class="enemy-stat-hp">♥ ${enemy.hp}</span>
        <span class="enemy-stat-atk">⚔ ${enemy.dmg}</span>
      </span>
      <div class="hp-bar enemy-hp-bar">
        <div class="hp-fill"></div>
        <span class="hp-text">${enemy.hp} / ${enemy.maxHp}</span>
      </div>
    </div>
    <svg class="enemy-sprite" viewBox="0 0 80 90"><use href="icons.svg#${enemy.icon}"/></svg>`;
  enemyQueue.appendChild(el);
  enemy.el = el;
  enemy.hpFillEl = el.querySelector('.hp-fill');
  enemy.hpTextEl = el.querySelector('.hp-text');
  return el;
}

const enemiesLeftLabel = document.getElementById('enemiesLeftLabel');
function updateEnemiesLeftLabel() {
  const n = battle.enemies.length;
  enemiesLeftLabel.textContent = n === 1 ? '1 Gegner' : `${n} Gegner`;
}

// Alle Gegner einer Welle laufen gleichzeitig ein und stellen sich
// nebeneinander auf (nicht hintereinander in einer Warteschlange), mit
// deutlichem Abstand zum links verankerten Spieler.
const QUEUE_STOPS = [58, 34, 10];

function spawnWave() {
  clearTimeout(battle.playerAttackTimer);
  enemyQueue.innerHTML = '';
  waveNumEl.textContent = battle.wave;
  if (waveEntryNumEl) waveEntryNumEl.textContent = battle.wave;
  battle.defeated = false;
  defeatOverlay.classList.remove('open');

  const list = buildWave(battle.wave);
  battle.enemies = list;
  list.forEach((enemy, i) => {
    createEnemyEl(enemy, QUEUE_STOPS[Math.min(i, QUEUE_STOPS.length - 1)]);
  });
  updateEnemiesLeftLabel();

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
  if (battle.active) schedulePetAttack();
  if (battle.active) schedulePetHelpersAttack();
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

// Gefaehrte (dragon-Slot): aktiver Kampf-Begleiter statt passivem Statwert.
// Eigener, unabhaengiger Timer/Rhythmus (~2500ms), komplett getrennt vom
// Spieler-Angriffstakt (schedulePlayerAttack, 800ms). Laeuft NUR wenn ein
// Gefaehrte ausgeruestet ist UND der Kampf gerade aktiv/sichtbar ist.
function schedulePetAttack() {
  clearTimeout(battle.petAttackTimer);
  battle.petAttackTimer = null;
  if (battle.defeated || !battle.active || !state.equipment.dragon) return;
  battle.petAttackTimer = setTimeout(() => {
    if (battle.defeated || !battle.active || !state.equipment.dragon) return;
    attackAllEnemiesWithPet();
    schedulePetAttack();
  }, 2500);
}

// Boss-Kampf-Pets im Begleiter-Halbkreis: gleiches Prinzip wie der Gefaehrte
// oben, aber eigener Takt (~3000ms) und eigene Bedingung (state.pets statt
// state.equipment.dragon) - laeuft nur wenn mindestens ein Pet eingesammelt
// wurde.
function schedulePetHelpersAttack() {
  clearTimeout(battle.petHelpersTimer);
  battle.petHelpersTimer = null;
  if (battle.defeated || !battle.active || state.pets.length === 0) return;
  battle.petHelpersTimer = setTimeout(() => {
    if (battle.defeated || !battle.active || state.pets.length === 0) return;
    attackAllEnemiesWithPetHelpers();
    schedulePetHelpersAttack();
  }, 3000);
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

// Verteidigung ist ein Schild-Pool (blau): er faengt Schaden zuerst ab.
// Erst wenn der Schild leer ist, geht der restliche Schaden auf die HP (gruen).
function dealDamageToPlayer(rawAmount) {
  let remaining = Math.round(rawAmount);
  const rect = document.querySelector('.player-anchor').getBoundingClientRect();
  const stageRect = battleStage.getBoundingClientRect();

  if (battle.playerShield > 0) {
    const absorbed = Math.min(battle.playerShield, remaining);
    battle.playerShield -= absorbed;
    remaining -= absorbed;
    updatePlayerShieldBar();
    showFloatingText('-' + absorbed, rect.left - stageRect.left + 16, rect.top - stageRect.top - 12, 'shield-dmg');
  }

  if (remaining > 0) {
    battle.playerHp = Math.max(0, battle.playerHp - remaining);
    updatePlayerHpBar();
    showFloatingText('-' + remaining, rect.left - stageRect.left + 16, rect.top - stageRect.top, 'player-dmg');
  }

  if (battle.playerHp <= 0 && !battle.defeated) {
    battle.defeated = true;
    battle.enemies.forEach(e => clearTimeout(e.attackTimer));
    clearTimeout(battle.playerAttackTimer);
    defeatOverlay.classList.add('open');
  }
}

function resolveDeadEnemies(dead) {
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
    updateEnemiesLeftLabel();
    setTimeout(() => enemy.el.remove(), 400);
  });

  if (dead.length > 0 && battle.enemies.length === 0) {
    clearTimeout(battle.playerAttackTimer);
    clearTimeout(battle.petAttackTimer);
    clearTimeout(battle.petHelpersTimer);
    battle.wave += 1;
    // Jede neue Welle: volle HP und Schild.
    battle.playerHp = battle.playerMaxHp;
    battle.playerShield = battle.playerMaxShield;
    updatePlayerHpBar();
    updatePlayerShieldBar();
    setTimeout(spawnWave, 700);
  }
}

// Trifft ALLE angekommenen Gegner gleichzeitig mit einem Angriff.
function attackAllEnemies() {
  if (battle.defeated) return;
  const targets = battle.enemies.filter(e => e.reached && e.hp > 0);
  if (targets.length === 0) return;

  playPlayerAttackAnim();
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

  resolveDeadEnemies(dead);
}

// Gefaehrte (dragon): eigener Flaechenschaden-Angriff auf ALLE angekommenen
// Gegner. Schadensformel: playerDmg * (CMB-Statwert / 100). Eigene, visuell
// unterscheidbare Floating-Number (Drachen-Icon-Praefix + eigene Farbe).
function attackAllEnemiesWithPet() {
  if (battle.defeated) return;
  const item = state.equipment.dragon;
  if (!item) return;
  const targets = battle.enemies.filter(e => e.reached && e.hp > 0);
  if (targets.length === 0) return;

  const dmg = Math.max(1, Math.round(battle.playerDmg * (item.statValue / 100)));
  const stageRect = battleStage.getBoundingClientRect();
  const dead = [];
  targets.forEach(enemy => {
    enemy.hp -= dmg;
    updateEnemyHpBar(enemy);

    const rect = enemy.el.getBoundingClientRect();
    showFloatingText('🐉-' + dmg, rect.left - stageRect.left + 10, rect.top - stageRect.top - 8, 'shield-dmg');

    enemy.el.classList.remove('hit');
    void enemy.el.offsetWidth;
    enemy.el.classList.add('hit');

    if (enemy.hp <= 0) dead.push(enemy);
  });

  resolveDeadEnemies(dead);
}

// Boss-Kampf-Pets: Flaechenschaden anteilig zu ihrer Raritaet (staerkere
// Pets tragen mehr bei), ausgeloest von schedulePetHelpersAttack(). Eigene
// Floating-Number (Pfoten-Praefix) statt der Drachen-/Spielerzahl.
function attackAllEnemiesWithPetHelpers() {
  if (battle.defeated) return;
  if (state.pets.length === 0) return;
  const targets = battle.enemies.filter(e => e.reached && e.hp > 0);
  if (targets.length === 0) return;

  const petPower = state.pets.reduce((sum, pet) => sum + pet.rarity.mult, 0);
  const dmg = Math.max(1, Math.round(battle.playerDmg * petPower * 0.06));
  const stageRect = battleStage.getBoundingClientRect();
  const dead = [];
  targets.forEach(enemy => {
    enemy.hp -= dmg;
    updateEnemyHpBar(enemy);

    const rect = enemy.el.getBoundingClientRect();
    showFloatingText('🐾-' + dmg, rect.left - stageRect.left + 10, rect.top - stageRect.top - 8, 'shield-dmg');

    enemy.el.classList.remove('hit');
    void enemy.el.offsetWidth;
    enemy.el.classList.add('hit');

    if (enemy.hp <= 0) dead.push(enemy);
  });

  resolveDeadEnemies(dead);
}

document.getElementById('defeatRetryBtn').addEventListener('click', () => {
  battle.playerHp = battle.playerMaxHp;
  battle.playerShield = battle.playerMaxShield;
  updatePlayerHpBar();
  updatePlayerShieldBar();
  battle.defeated = false;
  defeatOverlay.classList.remove('open');
  battle.enemies.forEach(enemy => {
    if (enemy.reached) scheduleEnemyAttack(enemy);
  });
  schedulePlayerAttack();
  schedulePetAttack();
  schedulePetHelpersAttack();
});

// Der angezeigte Gesamtwert (Grundwert + Ausruestung) ist 1:1 das, was im
// Kampf zaehlt - keine versteckte Umrechnung. Verteidigung ist dabei ein
// Schild-Pool (blau), der Schaden zuerst abfaengt, bevor die HP (gruen)
// dran glauben.
function applyEquipmentToBattle() {
  const totals = computeStats();
  battle.playerMaxHp = totals.HP;
  battle.playerDmg = totals.ATK;
  battle.playerMaxShield = totals.DEF;
  if (battle.playerHp > battle.playerMaxHp || battle.playerHp === undefined) {
    battle.playerHp = battle.playerMaxHp;
  }
  if (battle.playerShield === undefined || battle.playerShield > battle.playerMaxShield) {
    battle.playerShield = battle.playerMaxShield;
  }
}

// Der Kampf laeuft komplett automatisch (kein Antippen des Gegners noetig),
// aber NUR solange die Kampf-Seite tatsaechlich sichtbar/offen ist.
applyEquipmentToBattle();
battle.playerHp = battle.playerMaxHp;
battle.playerShield = battle.playerMaxShield;
updatePlayerHpBar();
updatePlayerShieldBar();

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
  schedulePetAttack();
  schedulePetHelpersAttack();
}

function pauseBattle() {
  if (!battle.active) return;
  battle.active = false;
  clearTimeout(battle.playerAttackTimer);
  clearTimeout(battle.petAttackTimer);
  battle.petAttackTimer = null;
  clearTimeout(battle.petHelpersTimer);
  battle.petHelpersTimer = null;
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
// auf den Kampf-Einstieg scrollt als Komfort-Abkuerzung ebenfalls dorthin.
const pagesTrack = document.getElementById('pagesTrack');
document.getElementById('battleEntry').addEventListener('click', () => {
  pagesTrack.scrollTo({ left: DESIGN_WIDTH, behavior: 'smooth' });
});

// Begleiter-Ring: leere Plaetze sind gesperrt bis ein Pet aus dem
// Boss-Kampf sie besetzt. Ein Antippen zeigt je nach Zustand einen Hinweis
// oder den Namen des Pets.
document.querySelectorAll('#companionRing .companion-slot').forEach((slot, i) => {
  slot.addEventListener('click', (e) => {
    e.stopPropagation();
    slot.classList.remove('locked-tap');
    void slot.offsetWidth;
    slot.classList.add('locked-tap');
    setTimeout(() => slot.classList.remove('locked-tap'), 400);

    const rect = slot.getBoundingClientRect();
    const stageRect = battleStage.getBoundingClientRect();
    const pet = state.pets[i];
    const label = pet ? `${pet.rarity.name}-Pet · hilft im Kampf` : 'Bald verfügbar';
    showFloatingText(label, rect.left - stageRect.left + 12, rect.top - stageRect.top - 6, 'shield-dmg');
  });
});

/* ---------- Boss-Kampf: Kampagnen-Modus ----------
   Eigenstaendiges Modal mit einem einzelnen, starken Gegner - komplett
   unabhaengig von der Welle. Sieg belohnt ein Pet in einer der
   Schmiede-Raritaeten (Grau bis Himmlisch), das anschliessend einen der
   5 Begleiter-Plaetze im Kampf besetzt und dort passiv mithilft
   (attackAllEnemiesWithPetHelpers, siehe oben). Nutzt die aktuellen
   Spieler-Werte aus battle.playerMaxHp/playerDmg/playerMaxShield, die
   applyEquipmentToBattle() stets aktuell haelt. */

const BOSS_FIGHT_NAMES = ['Schattendrache', 'Abgrundfürst', 'Klingentitan', 'Aschekoloss'];

const bossFight = {
  active: false, // Modal gerade offen -> Timer laufen
  bossesWon: 0,
  bossHp: 0, bossMaxHp: 0, bossDmg: 0, bossName: '???',
  playerHp: 0, playerMaxHp: 0, playerShield: 0, playerMaxShield: 0,
  playerAttackTimer: null, bossAttackTimer: null, introTimer: null,
  defeated: false, victorious: false,
};

const bossModal = document.getElementById('bossModal');
const bossFightName = document.getElementById('bossFightName');
const bossFightHpFill = document.getElementById('bossFightHpFill');
const bossFightHpText = document.getElementById('bossFightHpText');
const bossFightPlayerHpFill = document.getElementById('bossFightPlayerHpFill');
const bossFightPlayerHpText = document.getElementById('bossFightPlayerHpText');
const bossFightShieldBar = document.getElementById('bossFightShieldBar');
const bossFightShieldFill = document.getElementById('bossFightShieldFill');
const bossFightShieldText = document.getElementById('bossFightShieldText');
const bossFightDefeatOverlay = document.getElementById('bossFightDefeatOverlay');
const bossFightVictoryOverlay = document.getElementById('bossFightVictoryOverlay');
const bossPetSwatch = document.getElementById('bossPetSwatch');
const bossPetName = document.getElementById('bossPetName');

function updateBossFightPlayerHpBar() {
  const pct = Math.max(0, (bossFight.playerHp / bossFight.playerMaxHp) * 100);
  bossFightPlayerHpFill.style.width = pct + '%';
  bossFightPlayerHpText.textContent = `${Math.max(0, Math.round(bossFight.playerHp))} / ${Math.round(bossFight.playerMaxHp)}`;
}
function updateBossFightShieldBar() {
  if (bossFight.playerMaxShield <= 0) {
    bossFightShieldBar.classList.add('empty-shield');
    return;
  }
  bossFightShieldBar.classList.remove('empty-shield');
  const pct = Math.max(0, (bossFight.playerShield / bossFight.playerMaxShield) * 100);
  bossFightShieldFill.style.width = pct + '%';
  bossFightShieldText.textContent = `${Math.max(0, Math.round(bossFight.playerShield))} / ${Math.round(bossFight.playerMaxShield)}`;
}
function updateBossFightHpBar() {
  const pct = Math.max(0, (bossFight.bossHp / bossFight.bossMaxHp) * 100);
  bossFightHpFill.style.width = pct + '%';
  bossFightHpText.textContent = `${Math.max(0, Math.round(bossFight.bossHp))} / ${Math.round(bossFight.bossMaxHp)}`;
}

// Boss-Werte wachsen leicht mit jedem Sieg (bossesWon), damit der
// Kampagnen-Modus auch nach mehreren Durchlaeufen noch fordert.
function rollBossFightStats() {
  const hpMult = 15 + Math.random() * 5 + bossFight.bossesWon * 1.5;
  const dmgMult = 5 + Math.random() * 3 + bossFight.bossesWon * 0.6;
  return {
    bossMaxHp: Math.max(300, Math.round(battle.playerMaxHp * 0.45 * hpMult)),
    bossDmg: Math.max(15, Math.round(battle.playerDmg * 0.3 * dmgMult)),
  };
}

function spawnBossFight() {
  clearTimeout(bossFight.playerAttackTimer);
  clearTimeout(bossFight.bossAttackTimer);
  clearTimeout(bossFight.introTimer);
  bossFight.defeated = false;
  bossFight.victorious = false;
  bossFightDefeatOverlay.classList.remove('open');
  bossFightVictoryOverlay.classList.remove('open');

  bossFight.playerMaxHp = battle.playerMaxHp;
  bossFight.playerMaxShield = battle.playerMaxShield;
  bossFight.playerHp = bossFight.playerMaxHp;
  bossFight.playerShield = bossFight.playerMaxShield;
  updateBossFightPlayerHpBar();
  updateBossFightShieldBar();

  const { bossMaxHp, bossDmg } = rollBossFightStats();
  bossFight.bossMaxHp = bossMaxHp;
  bossFight.bossHp = bossMaxHp;
  bossFight.bossDmg = bossDmg;
  bossFight.bossName = BOSS_FIGHT_NAMES[Math.floor(Math.random() * BOSS_FIGHT_NAMES.length)];
  bossFightName.textContent = bossFight.bossName;
  updateBossFightHpBar();

  bossFight.introTimer = setTimeout(() => {
    if (bossFight.defeated || bossFight.victorious || !bossFight.active) return;
    scheduleBossFightAttack();
  }, 900);
  schedulePlayerAttackBossFight();
}

function scheduleBossFightAttack() {
  if (bossFight.defeated || bossFight.victorious || !bossFight.active) return;
  bossFight.bossAttackTimer = setTimeout(() => {
    if (bossFight.defeated || bossFight.victorious || !bossFight.active) return;
    dealDamageToBossFightPlayer(bossFight.bossDmg);
    scheduleBossFightAttack();
  }, 1300);
}

function schedulePlayerAttackBossFight() {
  if (bossFight.defeated || bossFight.victorious || !bossFight.active) return;
  bossFight.playerAttackTimer = setTimeout(() => {
    if (bossFight.defeated || bossFight.victorious || !bossFight.active) return;
    attackBossFight();
    schedulePlayerAttackBossFight();
  }, 800);
}

function dealDamageToBossFightPlayer(rawAmount) {
  let remaining = Math.round(rawAmount);
  if (bossFight.playerShield > 0) {
    const absorbed = Math.min(bossFight.playerShield, remaining);
    bossFight.playerShield -= absorbed;
    remaining -= absorbed;
    updateBossFightShieldBar();
  }
  if (remaining > 0) {
    bossFight.playerHp = Math.max(0, bossFight.playerHp - remaining);
    updateBossFightPlayerHpBar();
  }
  if (bossFight.playerHp <= 0 && !bossFight.defeated) {
    bossFight.defeated = true;
    clearTimeout(bossFight.bossAttackTimer);
    clearTimeout(bossFight.playerAttackTimer);
    bossFightDefeatOverlay.classList.add('open');
  }
}

let pendingPetRarity = null;

function showBossFightVictory() {
  pendingPetRarity = rollRarity(Math.max(state.anvilLevel, 1 + bossFight.bossesWon));
  bossPetSwatch.style.background = pendingPetRarity.color;
  bossPetName.textContent = pendingPetRarity.name + '-Pet';
  bossFightVictoryOverlay.classList.add('open');
}

function attackBossFight() {
  if (bossFight.defeated || bossFight.victorious || bossFight.bossHp <= 0) return;
  const dmg = Math.round(battle.playerDmg * (0.85 + Math.random() * 0.3));
  bossFight.bossHp -= dmg;
  updateBossFightHpBar();
  if (bossFight.bossHp <= 0) {
    bossFight.bossHp = 0;
    updateBossFightHpBar();
    bossFight.victorious = true;
    bossFight.bossesWon += 1;
    clearTimeout(bossFight.bossAttackTimer);
    clearTimeout(bossFight.playerAttackTimer);
    setTimeout(showBossFightVictory, 350);
  }
}

function openBossFight() {
  bossModal.classList.add('open');
  bossFight.active = true;
  spawnBossFight();
}
function closeBossFight() {
  bossModal.classList.remove('open');
  bossFight.active = false;
  clearTimeout(bossFight.playerAttackTimer);
  clearTimeout(bossFight.bossAttackTimer);
  clearTimeout(bossFight.introTimer);
}

document.getElementById('bossEntryBtn').addEventListener('click', openBossFight);
document.getElementById('bossModalClose').addEventListener('click', closeBossFight);
bossModal.addEventListener('click', (e) => { if (e.target === bossModal) closeBossFight(); });

document.getElementById('bossFightRetryBtn').addEventListener('click', () => {
  bossFight.playerHp = bossFight.playerMaxHp;
  bossFight.playerShield = bossFight.playerMaxShield;
  updateBossFightPlayerHpBar();
  updateBossFightShieldBar();
  bossFight.bossHp = bossFight.bossMaxHp;
  updateBossFightHpBar();
  bossFight.defeated = false;
  bossFightDefeatOverlay.classList.remove('open');
  scheduleBossFightAttack();
  schedulePlayerAttackBossFight();
});

document.getElementById('bossFightCollectBtn').addEventListener('click', () => {
  if (pendingPetRarity) {
    state.pets.push({ rarity: pendingPetRarity });
    renderCompanionRing();
    if (battle.active) schedulePetHelpersAttack();
    pendingPetRarity = null;
  }
  bossFightVictoryOverlay.classList.remove('open');
  spawnBossFight();
});

// Start: keine Ausruestung, alle Werte auf 0 - erst Schmieden + Ausruesten baut die Werte auf.
renderAllSlots();
renderCompanionRing();
