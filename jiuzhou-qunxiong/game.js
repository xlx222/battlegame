const MAP_W = 42;
const MAP_H = 24;
const MAX_ROUNDS = 15;
const CITY_SIZE = 2;
const CITY_MIN_GAP = 5;
const SLOT_COUNT = 20;

const TERRAIN_COST = { plain: 1, mountain: 2, forest: 2, river: 3, sea: 99, city: 1 };
const UNIT_TYPES = {
  infantry: { name: '步兵', speed: 4, coef: { plain: 1, mountain: 0.9, forest: 1, river: 0.4, sea: 0.1, siege: 1.3 } },
  cavalry: { name: '骑兵', speed: 7, coef: { plain: 1.8, mountain: 0.7, forest: 1, river: 0.2, sea: 0.1, siege: 1 } },
  archer: { name: '弓兵', speed: 4, ranged: true, coef: { plain: 0.5, mountain: 0.7, forest: 0.5, river: 0.5, sea: 0.1, siege: 1.5 } },
  catapult: { name: '投石车', speed: 2, ranged: true, coef: { plain: 0.8, mountain: 0.6, forest: 0.3, river: 0.6, sea: 0.1, siege: 3 } }
};

const NAME_POOL = ['赵云', '关羽', '张飞', '黄忠', '马超', '曹仁', '夏侯惇', '典韦', '周瑜', '陆逊', '甘宁', '太史慈', '吕蒙', '张辽', '徐晃', '许褚', '文丑', '颜良', '庞德', '姜维', '邓艾', '钟会', '凌统', '徐盛', '陈到', '王平', '文聘', '朱桓', '高顺', '华雄'];
const SKILL_POOL = ['强袭', '坚守', '激励', '火计', '统御', '奇谋', '筑垒', '疾驰', '洞察', '号令'];
const EQUIP_POOL = ['铁甲', '长枪', '良弓', '战马', '军旗', '皮甲', '重盾', '兵书', '宝刀', '投石器'];
const CITY_NAME_POOL = ['长安', '洛阳', '邺城', '许昌', '晋阳', '北平', '襄平', '成都', '汉中', '江州', '云南', '永安', '武都', '梓潼', '建业', '柴桑', '会稽', '庐江', '寿春', '长沙', '交州', '南海', '青州', '徐州', '兖州', '冀州', '凉州', '荆州', '扬州', '益州', '雍州', '幽州', '并州', '汝南', '陈留', '濮阳', '弘农', '上庸', '夷陵', '桂阳', '零陵', '合浦', '辽西', '武威', '酒泉', '朔方', '南阳'];

const game = {
  map: [],
  cities: [],
  factions: [],
  armies: [],
  scenarios: [],
  scenarioIndex: 0,
  round: 1,
  phase: 'prep',
  prepOrder: [],
  actionOrder: [],
  currentFactionIndex: 0,
  selected: null,
  winner: null,
  selectedSlot: 1
};

const ui = {};

function init() {
  bindUI();
  createSaveSlots();
  generateScenarios();
  populateScenarioSelect();
  populateSlotPicker();
}

function bindUI() {
  ui.menu = document.getElementById('menuScreen');
  ui.game = document.getElementById('gameScreen');
  ui.turnInfo = document.getElementById('turnInfo');
  ui.factionInfo = document.getElementById('factionInfo');
  ui.tileInfo = document.getElementById('tileInfo');
  ui.cityInfo = document.getElementById('cityInfo');
  ui.armyInfo = document.getElementById('armyInfo');
  ui.status = document.getElementById('statusLog');
  ui.map = document.getElementById('map');
  ui.cityRoster = document.getElementById('cityRoster');
  ui.armyRoster = document.getElementById('armyRoster');
  ui.scenarioSelect = document.getElementById('scenarioSelect');
  ui.slotPicker = document.getElementById('slotPicker');

  document.getElementById('newGameBtn').onclick = startScenario;
  document.getElementById('loadMenuBtn').onclick = () => loadGame(game.selectedSlot);
  document.getElementById('exitBtn').onclick = () => appendLog('浏览器原型无法直接退出。');

  document.getElementById('incomeBtn').onclick = collectIncome;
  document.getElementById('recruitBtn').onclick = recruitAtSelectedCity;
  document.getElementById('shopBtn').onclick = openShop;
  document.getElementById('hireBtn').onclick = hireGeneral;
  document.getElementById('castCitySkillBtn').onclick = castCitySkill;

  document.getElementById('endPrepBtn').onclick = endFactionTurn;
  document.getElementById('moveBtn').onclick = moveArmy;
  document.getElementById('attackBtn').onclick = fieldBattle;
  document.getElementById('siegeBtn').onclick = siegeBattle;
  document.getElementById('dispatchBtn').onclick = dispatchFromRoster;
  document.getElementById('castArmySkillBtn').onclick = castArmySkill;
  document.getElementById('endActionBtn').onclick = endFactionTurn;

  document.getElementById('saveBtn').onclick = () => saveGame(game.selectedSlot);
  document.getElementById('loadBtn').onclick = () => loadGame(game.selectedSlot);

  ui.scenarioSelect.onchange = () => {
    game.scenarioIndex = Number(ui.scenarioSelect.value);
  };
  ui.slotPicker.onchange = () => {
    game.selectedSlot = Number(ui.slotPicker.value);
  };
}

function populateSlotPicker() {
  ui.slotPicker.innerHTML = '';
  for (let i = 1; i <= SLOT_COUNT; i++) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `${i}`;
    ui.slotPicker.appendChild(option);
  }
  ui.slotPicker.value = String(game.selectedSlot);
}

function generateScenarios() {
  const factionTemplates = [
    ['魏', 'red'], ['蜀', 'green'], ['吴', 'blue'], ['汉', 'yellow'], ['燕', 'blue'], ['楚', 'green'], ['秦', 'red'], ['赵', 'yellow']
  ];
  game.scenarios = [];
  for (let i = 1; i <= 10; i++) {
    const pool = [...factionTemplates].sort(() => Math.random() - 0.5);
    const factions = pool.slice(0, 3).map((it, idx) => ({
      id: `f${idx}`,
      name: it[0],
      color: it[1],
      money: 12000,
      capitals: [],
      generalCount: 6,
      alive: true,
      skill: SKILL_POOL[Math.floor(Math.random() * SKILL_POOL.length)]
    }));
    game.scenarios.push({ name: `剧本${i}：群雄${Math.floor(100 + Math.random() * 900)}`, factions });
  }
}

function populateScenarioSelect() {
  ui.scenarioSelect.innerHTML = '';
  game.scenarios.forEach((sc, idx) => {
    const option = document.createElement('option');
    option.value = String(idx);
    option.textContent = sc.name;
    ui.scenarioSelect.appendChild(option);
  });
}

function startScenario() {
  const scenario = game.scenarios[game.scenarioIndex];
  buildMap();
  setupFactions(scenario);
  setupCitiesAndArmies();
  game.round = 1;
  game.phase = 'prep';
  recalcOrders();
  game.currentFactionIndex = 0;
  game.winner = null;
  game.selected = null;
  ui.status.innerHTML = '';
  ui.menu.classList.remove('active');
  ui.game.classList.add('active');
  renderMap();
  updatePanels();
  appendLog(`剧本开始：${scenario.name}。准备阶段开始。`);
}

function buildMap() {
  const map = [];
  for (let y = 0; y < MAP_H; y++) {
    const row = [];
    for (let x = 0; x < MAP_W; x++) {
      let terrain = 'plain';

      if (x < 7 && y > 5) terrain = 'mountain';
      if (x < 5 && y > 14) terrain = 'mountain';
      if (y < 5 && x > 29) terrain = 'forest';
      if (x > 28 && y > 11 && y < 19) terrain = 'forest';

      if ((x > 16 && x < 19) || (x > 20 && x < 22 && y > 5)) terrain = 'river';
      if (y > 13 && y < 16 && x > 7 && x < 27) terrain = 'river';

      if (x >= 37 || (x >= 34 && y > 19)) terrain = 'sea';
      if ((x > 31 && x < 36 && y > 18) || (x > 34 && y > 14 && y < 19)) terrain = 'sea';

      row.push({ x, y, terrain, cityId: null });
    }
    map.push(row);
  }
  game.map = map;
}

function setupFactions(scenario) {
  game.factions = scenario.factions.map((f) => ({ ...f, capitals: [] }));
}

function distanceOk(x, y, placed) {
  for (const p of placed) {
    const dx = Math.abs(x - p.x);
    const dy = Math.abs(y - p.y);
    if (Math.max(dx, dy) < CITY_MIN_GAP) return false;
  }
  return true;
}

function randomGeneral() {
  const name = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)] + Math.floor(1 + Math.random() * 99);
  return {
    name,
    lead: 60 + Math.floor(Math.random() * 35),
    power: 55 + Math.floor(Math.random() * 40),
    politics: 45 + Math.floor(Math.random() * 45),
    speed: 3 + Math.floor(Math.random() * 5),
    skill: SKILL_POOL[Math.floor(Math.random() * SKILL_POOL.length)],
    passiveSkill: SKILL_POOL[Math.floor(Math.random() * SKILL_POOL.length)],
    equipment: []
  };
}

function randomShopItems() {
  return [...EQUIP_POOL].sort(() => Math.random() - 0.5).slice(0, 4).map((name) => ({
    name,
    price: 500 + Math.floor(Math.random() * 3500),
    bonus: 1 + Math.floor(Math.random() * 4)
  }));
}

function setupCitiesAndArmies() {
  const placed = [];
  const candidates = [];
  for (let y = 1; y < MAP_H - 2; y++) {
    for (let x = 1; x < MAP_W - 2; x++) {
      const tile = game.map[y][x];
      if (tile.terrain === 'sea' || tile.terrain === 'river' || tile.terrain === 'mountain') continue;
      if (game.map[y][x + 1].terrain === 'sea' || game.map[y + 1][x].terrain === 'sea' || game.map[y + 1][x + 1].terrain === 'sea') continue;
      candidates.push({ x, y });
    }
  }
  candidates.sort(() => Math.random() - 0.5);

  const cityTotal = 33;
  for (const c of candidates) {
    if (placed.length >= cityTotal) break;
    if (!distanceOk(c.x, c.y, placed)) continue;
    placed.push(c);
  }

  game.cities = placed.map((p, idx) => {
    const f = game.factions[idx % game.factions.length];
    const isCapital = idx < game.factions.length;
    if (isCapital) f.capitals = [CITY_NAME_POOL[idx]];
    return {
      id: idx,
      name: CITY_NAME_POOL[idx % CITY_NAME_POOL.length],
      x: p.x,
      y: p.y,
      owner: f.id,
      isCapital,
      development: isCapital ? 8 : 5,
      defense: isCapital ? 6 : 4,
      governorPolitics: 65 + Math.floor(Math.random() * 30),
      garrison: isCapital ? 9000 : 4600,
      besieged: false,
      characters: [randomGeneral(), randomGeneral()],
      shopItems: randomShopItems()
    };
  });

  for (const city of game.cities) {
    for (let yy = city.y; yy < city.y + CITY_SIZE; yy++) {
      for (let xx = city.x; xx < city.x + CITY_SIZE; xx++) {
        if (game.map[yy]?.[xx]) {
          game.map[yy][xx].terrain = 'city';
          game.map[yy][xx].cityId = city.id;
        }
      }
    }
  }

  game.armies = game.factions.map((f, idx) => {
    const cap = game.cities.find(c => c.owner === f.id && c.isCapital);
    const team = [randomGeneral(), randomGeneral(), randomGeneral()];
    return {
      id: `army_${f.id}`,
      faction: f.id,
      x: cap.x,
      y: cap.y,
      troops: 7000,
      unit: ['infantry', 'cavalry', 'archer'][idx % 3],
      morale: 1,
      acted: false,
      lockedAfterSiege: false,
      generals: team,
      skillUsedThisTurn: false
    };
  });
}

function recalcOrders() {
  game.prepOrder = [...game.factions]
    .filter(f => f.alive)
    .sort((a, b) => b.generalCount - a.generalCount || Math.random() - 0.5)
    .map(f => f.id);

  game.actionOrder = [...game.factions]
    .filter(f => f.alive)
    .sort((a, b) => countCities(b.id) - countCities(a.id) || Math.random() - 0.5)
    .map(f => f.id);
}

function currentFactionId() {
  const order = game.phase === 'prep' ? game.prepOrder : game.actionOrder;
  return order[game.currentFactionIndex];
}

function updatePanels() {
  const cf = game.factions.find(f => f.id === currentFactionId());
  if (!cf) return;
  ui.turnInfo.innerHTML = `第 <b>${game.round}</b> / ${MAX_ROUNDS} 回合<br>阶段：<b>${game.phase === 'prep' ? '准备' : '行动'}</b><br>剧本：${game.scenarios[game.scenarioIndex].name}`;
  ui.factionInfo.innerHTML = `<b>${cf.name}</b><br>金钱：${cf.money}<br>城池：${countCities(cf.id)}<br>总兵：${totalTroops(cf.id)}<br>势力技能：${cf.skill}`;
  updateSelectionInfo();
}

function renderMap() {
  ui.map.innerHTML = '';
  ui.map.style.gridTemplateColumns = `repeat(${MAP_W}, 34px)`;
  ui.map.style.gridTemplateRows = `repeat(${MAP_H}, 34px)`;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const tile = game.map[y][x];
      const div = document.createElement('div');
      div.className = `tile ${tile.terrain}`;
      const city = tile.cityId != null ? game.cities[tile.cityId] : null;
      if (city && city.x === x && city.y === y) {
        div.innerHTML = `<span class="city-label">${city.name}<br>${getFaction(city.owner).name}</span>`;
      }
      const army = getArmyAt(x, y);
      if (army) div.classList.add(`faction-${getFaction(army.faction).color}`);
      if (game.selected && game.selected.x === x && game.selected.y === y) div.classList.add('selected');
      div.onclick = () => {
        game.selected = { x, y };
        renderMap();
        updateSelectionInfo();
      };
      ui.map.appendChild(div);
    }
  }
}

function updateSelectionInfo() {
  if (!game.selected) return;
  const { x, y } = game.selected;
  const tile = game.map[y][x];
  ui.tileInfo.innerHTML = `坐标(${x},${y})<br>地形：${terrainName(tile.terrain)}<br>移动消耗：${TERRAIN_COST[tile.terrain] || 1}`;
  const city = tile.cityId != null ? game.cities[tile.cityId] : null;
  const army = getArmyAt(x, y);
  ui.cityInfo.innerHTML = city
    ? `${city.name} (${getFaction(city.owner).name})<br>开发:${city.development} 防御:${city.defense}<br>驻军:${city.garrison}${city.isCapital ? '<br><b>首都</b>' : ''}`
    : '无城池';
  ui.armyInfo.innerHTML = army
    ? `${getFaction(army.faction).name}军<br>兵种:${UNIT_TYPES[army.unit].name}<br>兵力:${army.troops}<br>行动力:${armyMovePoints(army)}`
    : '无军团';
  renderCityRoster(city);
  renderArmyRoster(army);
}

function renderCityRoster(city) {
  if (!city) {
    ui.cityRoster.innerHTML = '无人物名录';
    return;
  }
  ui.cityRoster.innerHTML = city.characters.map((g, idx) => `
    <div class="roster-item">
      <b>${g.name}</b> 统:${g.lead} 武:${g.power} 政:${g.politics}<br>
      主动:${g.skill} / 被动:${g.passiveSkill}<br>
      装备:${g.equipment.length ? g.equipment.map(e => e.name).join('、') : '无'}<br>
      <button class="small-btn" data-equip="${idx}">配装</button>
      <button class="small-btn" data-skill="${idx}">发动技能</button>
    </div>
  `).join('');
  ui.cityRoster.querySelectorAll('[data-equip]').forEach(btn => {
    btn.onclick = () => equipCharacter(city, Number(btn.dataset.equip));
  });
  ui.cityRoster.querySelectorAll('[data-skill]').forEach(btn => {
    btn.onclick = () => triggerCharacterSkillInCity(city, Number(btn.dataset.skill));
  });
}

function renderArmyRoster(army) {
  if (!army) {
    ui.armyRoster.innerHTML = '无行动军团名录';
    return;
  }
  ui.armyRoster.innerHTML = army.generals.map((g, idx) => `
    <div class="roster-item">
      <b>${g.name}</b> 统:${g.lead} 武:${g.power}<br>
      技能:${g.skill}<br>
      <button class="small-btn" data-armyskill="${idx}">发动技能</button>
    </div>
  `).join('');
  ui.armyRoster.querySelectorAll('[data-armyskill]').forEach(btn => {
    btn.onclick = () => triggerCharacterSkillInArmy(army, Number(btn.dataset.armyskill));
  });
}

function collectIncome() {
  if (game.phase !== 'prep') return appendLog('当前不是准备阶段。');
  const fid = currentFactionId();
  const faction = getFaction(fid);
  let income = 0;
  game.cities.filter(c => c.owner === fid).forEach(c => {
    let cityIncome = c.development * 200;
    if (c.besieged) cityIncome = Math.floor(cityIncome * 0.5);
    if (c.governorPolitics > 80) cityIncome = Math.floor(cityIncome * 1.2);
    income += cityIncome;
  });
  faction.money += income;
  appendLog(`${faction.name} 收入 +${income} 钱。`);
  updatePanels();
}

function recruitAtSelectedCity() {
  if (game.phase !== 'prep') return appendLog('当前不是准备阶段。');
  const city = getSelectedCityOwned();
  if (!city) return;
  const faction = getFaction(currentFactionId());
  const cost = 500;
  if (faction.money < cost) return appendLog('金钱不足。');
  const cap = city.development * 1000;
  if (city.garrison >= cap) return appendLog('该城驻军已达上限。');
  city.garrison = Math.min(cap, city.garrison + 1000);
  faction.money -= cost;
  appendLog(`${city.name} 征兵 +1000，花费 ${cost} 钱。`);
  updatePanels();
}

function openShop() {
  if (game.phase !== 'prep') return appendLog('商店仅准备阶段开放。');
  const city = getSelectedCityOwned();
  if (!city) return;
  const faction = getFaction(currentFactionId());
  const pick = city.shopItems[Math.floor(Math.random() * city.shopItems.length)];
  if (!pick) return appendLog('商店暂无货物。');
  if (faction.money < pick.price) return appendLog(`购买 ${pick.name} 需要 ${pick.price} 钱。`);
  if (!city.characters.length) return appendLog('该城无人可配装。');
  faction.money -= pick.price;
  city.characters[0].equipment.push(pick);
  appendLog(`${city.name} 商店购买 ${pick.name}，花费 ${pick.price}，已给 ${city.characters[0].name}。`);
  updatePanels();
}

function hireGeneral() {
  if (game.phase !== 'prep') return appendLog('招揽仅准备阶段可用。');
  const city = getSelectedCityOwned();
  if (!city) return;
  const faction = getFaction(currentFactionId());
  if (faction.money < 4000) return appendLog('金钱不足 4000，无法招揽。');
  faction.money -= 4000;
  const g = randomGeneral();
  city.characters.push(g);
  appendLog(`${city.name} 招揽成功：${g.name}（花费4000）。`);
  updatePanels();
}

function equipCharacter(city, index) {
  if (game.phase !== 'prep') return appendLog('仅准备阶段可配装。');
  const g = city.characters[index];
  if (!g) return;
  const item = city.shopItems[Math.floor(Math.random() * city.shopItems.length)];
  if (!item) return;
  g.equipment.push(item);
  appendLog(`${g.name} 配置装备：${item.name}。`);
  updateSelectionInfo();
}

function castCitySkill() {
  if (game.phase !== 'prep') return appendLog('当前不是准备阶段。');
  const city = getSelectedCityOwned();
  if (!city || !city.characters.length) return appendLog('该城无可发动技能武将。');
  triggerCharacterSkillInCity(city, 0);
}

function triggerCharacterSkillInCity(city, idx) {
  if (game.phase !== 'prep') return appendLog('当前不是准备阶段。');
  const g = city.characters[idx];
  if (!g) return;
  city.defense += 1;
  appendLog(`${city.name} 的 ${g.name} 发动【${g.skill}】，城防+1。`);
  updatePanels();
}

function dispatchFromRoster() {
  if (game.phase !== 'action') return appendLog('派出军团仅行动阶段可用。');
  const city = getSelectedCityOwned();
  if (!city || city.garrison < 1500) return appendLog('该城驻军不足1500。');
  const army = game.armies.find(a => a.faction === currentFactionId());
  if (!army) return appendLog('当前势力没有军团。');
  const send = Math.min(2500, city.garrison - 1000);
  city.garrison -= send;
  army.troops += send;
  army.x = city.x;
  army.y = city.y;
  appendLog(`${city.name} 派出 ${send} 兵补充军团。`);
  updatePanels();
}

function castArmySkill() {
  if (game.phase !== 'action') return appendLog('当前不是行动阶段。');
  const army = game.armies.find(a => a.faction === currentFactionId());
  if (!army) return appendLog('当前势力无军团。');
  triggerCharacterSkillInArmy(army, 0);
}

function triggerCharacterSkillInArmy(army, idx) {
  if (game.phase !== 'action') return appendLog('当前不是行动阶段。');
  if (army.skillUsedThisTurn) return appendLog('本军团本回合已发动过技能。');
  const g = army.generals[idx];
  if (!g) return;
  army.morale = Math.min(1.5, army.morale + 0.2);
  army.skillUsedThisTurn = true;
  appendLog(`${getFaction(army.faction).name}军 ${g.name} 发动【${g.skill}】，士气上升。`);
  updatePanels();
}

function getSelectedCityOwned() {
  if (!game.selected) {
    appendLog('请先选中己方城池。');
    return null;
  }
  const tile = game.map[game.selected.y][game.selected.x];
  if (tile.cityId == null) {
    appendLog('该地块没有城池。');
    return null;
  }
  const city = game.cities[tile.cityId];
  const fid = currentFactionId();
  if (city.owner !== fid) {
    appendLog('只能操作己方城池。');
    return null;
  }
  return city;
}

function moveArmy() {
  if (game.phase !== 'action') return appendLog('当前不是行动阶段。');
  const fid = currentFactionId();
  const army = game.armies.find(a => a.faction === fid);
  if (!army) return appendLog('当前势力无可用军团。');
  if (!game.selected) return appendLog('请先点击目标地块。');
  if (army.lockedAfterSiege) return appendLog('此军团本回合攻城后已无法再主动移动。');
  const targetTile = game.map[game.selected.y][game.selected.x];
  if (targetTile.terrain === 'sea') return appendLog('当前原型不支持入海移动。');
  const dist = Math.abs(game.selected.x - army.x) + Math.abs(game.selected.y - army.y);
  const cost = dist * (TERRAIN_COST[targetTile.terrain] || 1);
  const points = armyMovePoints(army);
  if (cost > points) return appendLog(`行动力不足。需要${cost}，可用${points}。`);
  army.x = game.selected.x;
  army.y = game.selected.y;
  army.acted = true;
  appendLog(`${getFaction(fid).name}军移动到 (${army.x},${army.y})。`);
  renderMap();
  updatePanels();
}

function fieldBattle() {
  if (game.phase !== 'action') return appendLog('当前不是行动阶段。');
  const atk = game.armies.find(a => a.faction === currentFactionId());
  if (!atk) return;
  const target = game.selected ? getArmyAt(game.selected.x, game.selected.y) : null;
  if (!target || target.faction === atk.faction) return appendLog('请选择相邻敌军。');
  if (Math.max(Math.abs(target.x - atk.x), Math.abs(target.y - atk.y)) > 1) return appendLog('野战需相邻（含斜角）。');

  const terrain = game.map[target.y][target.x].terrain;
  const atkPower = calcFieldPower(atk, terrain);
  const defPower = calcFieldPower(target, terrain);

  resolveBattleResult(atk, target, atkPower, defPower);
}

function siegeBattle() {
  if (game.phase !== 'action') return appendLog('当前不是行动阶段。');
  const atk = game.armies.find(a => a.faction === currentFactionId());
  if (!atk || !game.selected) return appendLog('请选择目标城。');
  const tile = game.map[game.selected.y][game.selected.x];
  if (tile.cityId == null) return appendLog('目标不是城池。');
  const city = game.cities[tile.cityId];
  if (city.owner === atk.faction) return appendLog('不能攻打己方城池。');
  if (Math.max(Math.abs(city.x - atk.x), Math.abs(city.y - atk.y)) > 1) return appendLog('攻城需在相邻地块。');

  const atkPower = calcSiegePower(atk);
  const defGeneralCoef = 1.2;
  const cityDefenseCoef = 1 + city.defense * 0.1;
  const defPower = city.garrison * cityDefenseCoef * defGeneralCoef * 1.5;

  if (atkPower > defPower) {
    const oldOwner = city.owner;
    city.owner = atk.faction;
    city.garrison = Math.max(1500, Math.floor(atk.troops * 0.35));
    atk.troops = Math.max(1000, Math.floor(atk.troops * 0.7));
    city.defense = Math.floor(city.defense / 2);
    atk.lockedAfterSiege = true;
    appendLog(`${city.name} 被 ${getFaction(atk.faction).name} 攻占！原属 ${getFaction(oldOwner).name}。`);
    knockoutIfNoCities(oldOwner);
  } else {
    atk.troops = Math.max(1000, Math.floor(atk.troops * 0.8));
    retreat(atk, 1);
    appendLog(`${city.name} 守城成功，攻城军后退1格且本回合不能再次攻城。`);
    atk.lockedAfterSiege = true;
  }
  atk.acted = true;
  renderMap();
  updatePanels();
  checkVictory();
}

function calcFieldPower(army, terrain) {
  const unit = UNIT_TYPES[army.unit];
  const coef = unit.coef[terrain === 'city' ? 'plain' : terrain] || 1;
  const best = army.generals.reduce((m, g) => Math.max(m, 1 + g.lead / 100 + g.power / 300), 1);
  const morale = army.morale;
  return army.troops * coef * best * morale;
}

function calcSiegePower(army) {
  const unit = UNIT_TYPES[army.unit];
  const coef = unit.coef.siege;
  const g = army.generals[0];
  const generalCoef = 1 + g.lead / 100 + g.power / 300;
  return army.troops * coef * generalCoef * army.morale;
}

function resolveBattleResult(atk, def, atkPower, defPower) {
  if (atkPower >= defPower) {
    const atkLoss = Math.floor((defPower / atkPower) * def.troops * 0.25);
    const defLoss = Math.floor((atkPower / defPower) * atk.troops * 0.4);
    atk.troops = Math.max(500, atk.troops - atkLoss);
    def.troops = Math.max(0, def.troops - defLoss);
    atk.morale = 1.2;
    appendLog(`${getFaction(atk.faction).name} 野战胜利。敌军损失${defLoss}，己方损失${atkLoss}。`);
    retreat(def, 3);
  } else {
    const atkLoss = Math.floor((defPower / atkPower) * def.troops * 0.4);
    const defLoss = Math.floor((atkPower / defPower) * atk.troops * 0.25);
    atk.troops = Math.max(500, atk.troops - atkLoss);
    def.troops = Math.max(500, def.troops - defLoss);
    atk.morale = 0.8;
    appendLog(`${getFaction(atk.faction).name} 野战失败。己方损失${atkLoss}，敌军损失${defLoss}。`);
    retreat(atk, 3);
  }
  atk.acted = true;
  renderMap();
  updatePanels();
}

function retreat(army, steps) {
  army.x = Math.max(0, army.x - steps);
  army.y = Math.max(0, army.y - 1);
}

function endFactionTurn() {
  if (game.winner) return;
  triggerPassiveSkills();
  game.currentFactionIndex++;
  const order = game.phase === 'prep' ? game.prepOrder : game.actionOrder;
  if (game.currentFactionIndex >= order.length) {
    if (game.phase === 'prep') {
      game.phase = 'action';
      game.currentFactionIndex = 0;
      game.armies.forEach(a => { a.acted = false; a.lockedAfterSiege = false; a.morale = 1; a.skillUsedThisTurn = false; });
      appendLog('所有势力准备阶段完成，进入行动阶段。');
    } else {
      game.round++;
      if (game.round > MAX_ROUNDS) {
        determineRound15Victory();
        return;
      }
      game.phase = 'prep';
      recalcOrders();
      game.currentFactionIndex = 0;
      appendLog(`第 ${game.round} 回合开始。`);
    }
  }
  checkVictory();
  updatePanels();
}

function triggerPassiveSkills() {
  const fid = currentFactionId();
  const cities = game.cities.filter(c => c.owner === fid);
  for (const c of cities) {
    for (const g of c.characters) {
      if (g.passiveSkill === '洞察') c.development = Math.min(12, c.development + 1);
    }
  }
}

function checkVictory() {
  const alive = game.factions.filter(f => f.alive);
  if (alive.length === 1) {
    game.winner = alive[0].id;
    return appendLog(`【胜利】${alive[0].name} 消灭其他势力。`);
  }
  for (const f of alive) {
    const others = alive.filter(o => o.id !== f.id);
    const capturedAllCapitals = others.every(o => !game.cities.some(c => c.owner === o.id && c.isCapital));
    if (capturedAllCapitals) {
      game.winner = f.id;
      appendLog(`【首都胜利】${f.name} 已占领所有敌方首都！`);
      return;
    }
  }
}

function determineRound15Victory() {
  const ranking = [...game.factions].sort((a, b) => {
    const cityDiff = countCities(b.id) - countCities(a.id);
    if (cityDiff !== 0) return cityDiff;
    const troopDiff = totalTroops(b.id) - totalTroops(a.id);
    if (troopDiff !== 0) return troopDiff;
    return totalDevelopment(b.id) - totalDevelopment(a.id);
  });
  game.winner = ranking[0].id;
  appendLog(`【15回合结算】${ranking[0].name} 获胜！(城池/兵力/开发度比较)`);
  updatePanels();
}

function knockoutIfNoCities(fid) {
  if (countCities(fid) > 0) return;
  const faction = getFaction(fid);
  faction.alive = false;
  appendLog(`${faction.name} 失去全部城池，势力灭亡。`);
}

function createSaveSlots() {
  const container = document.getElementById('saveSlots');
  container.innerHTML = '';
  for (let i = 1; i <= SLOT_COUNT; i++) {
    const btn = document.createElement('button');
    btn.className = 'slot-btn';
    btn.textContent = `${i}`;
    btn.onclick = () => {
      game.selectedSlot = i;
      ui.slotPicker.value = String(i);
      saveGame(i);
    };
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      game.selectedSlot = i;
      ui.slotPicker.value = String(i);
      loadGame(i);
    };
    container.appendChild(btn);
  }
}

function saveGame(slot) {
  if (!game.factions.length) return appendLog('请先开始游戏再存档。');
  localStorage.setItem(`jqx_save_${slot}`, JSON.stringify(game));
  appendLog(`已保存到存档位 ${slot}。`);
}

function loadGame(slot) {
  const raw = localStorage.getItem(`jqx_save_${slot}`);
  if (!raw) return appendLog(`存档位 ${slot} 为空。`);
  const loaded = JSON.parse(raw);
  Object.assign(game, loaded);
  game.selectedSlot = slot;
  ui.slotPicker.value = String(slot);
  ui.scenarioSelect.value = String(game.scenarioIndex || 0);
  ui.menu.classList.remove('active');
  ui.game.classList.add('active');
  renderMap();
  updatePanels();
  appendLog(`已读取存档位 ${slot}。`);
}

function appendLog(msg) {
  const t = document.createElement('div');
  t.textContent = `- ${msg}`;
  ui.status.prepend(t);
}

function getArmyAt(x, y) {
  return game.armies.find(a => a.x === x && a.y === y && getFaction(a.faction)?.alive);
}
function getFaction(fid) { return game.factions.find(f => f.id === fid); }
function terrainName(t) {
  return { plain: '平原', mountain: '山地', forest: '森林', river: '河流', sea: '海洋', city: '城池' }[t] || t;
}
function armyMovePoints(army) {
  const base = UNIT_TYPES[army.unit].speed;
  const skillBonus = Math.floor((army.generals[0].speed || 0) / 3);
  return base + skillBonus;
}
function countCities(fid) { return game.cities.filter(c => c.owner === fid).length; }
function totalTroops(fid) {
  const cityTroops = game.cities.filter(c => c.owner === fid).reduce((s, c) => s + c.garrison, 0);
  const armyTroops = game.armies.filter(a => a.faction === fid).reduce((s, a) => s + a.troops, 0);
  return cityTroops + armyTroops;
}
function totalDevelopment(fid) {
  return game.cities.filter(c => c.owner === fid).reduce((s, c) => s + c.development, 0);
}

init();
