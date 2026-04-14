const MAP_W = 30;
const MAP_H = 18;
const MAX_ROUNDS = 15;

const TERRAIN_COST = { plain: 1, mountain: 2, forest: 2, river: 3, city: 1 };
const UNIT_TYPES = {
  infantry: { name: '步兵', speed: 4, coef: { plain: 1, mountain: 0.9, forest: 1, river: 0.4, siege: 1.3 } },
  cavalry: { name: '骑兵', speed: 7, coef: { plain: 1.8, mountain: 0.7, forest: 1, river: 0.2, siege: 1 } },
  archer: { name: '弓兵', speed: 4, ranged: true, coef: { plain: 0.5, mountain: 0.7, forest: 0.5, river: 0.5, siege: 1.5 } },
  catapult: { name: '投石车', speed: 2, ranged: true, coef: { plain: 0.8, mountain: 0.6, forest: 0.3, river: 0.6, siege: 3 } }
};

const game = {
  map: [],
  cities: [],
  factions: [],
  armies: [],
  round: 1,
  phase: 'prep',
  prepOrder: [],
  actionOrder: [],
  currentFactionIndex: 0,
  selected: null,
  winner: null
};

const ui = {};

function init() {
  bindUI();
  createSaveSlots();
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

  document.getElementById('newGameBtn').onclick = startScenario;
  document.getElementById('loadMenuBtn').onclick = () => appendLog('请使用右上角读档功能。');
  document.getElementById('exitBtn').onclick = () => appendLog('浏览器原型无法直接退出。');

  document.getElementById('incomeBtn').onclick = collectIncome;
  document.getElementById('recruitBtn').onclick = recruitAtSelectedCity;
  document.getElementById('endPrepBtn').onclick = endFactionTurn;
  document.getElementById('moveBtn').onclick = moveArmy;
  document.getElementById('attackBtn').onclick = fieldBattle;
  document.getElementById('siegeBtn').onclick = siegeBattle;
  document.getElementById('endActionBtn').onclick = endFactionTurn;

  document.getElementById('saveBtn').onclick = () => saveGame(1);
  document.getElementById('loadBtn').onclick = () => loadGame(1);
}

function startScenario() {
  buildMap();
  setupFactions();
  setupCitiesAndArmies();
  game.round = 1;
  game.phase = 'prep';
  recalcOrders();
  game.currentFactionIndex = 0;
  game.winner = null;
  ui.menu.classList.remove('active');
  ui.game.classList.add('active');
  renderMap();
  updatePanels();
  appendLog('剧本开始：三国争衡。准备阶段开始。');
}

function buildMap() {
  const map = [];
  for (let y = 0; y < MAP_H; y++) {
    const row = [];
    for (let x = 0; x < MAP_W; x++) {
      let terrain = 'plain';
      if (y < 3 && x > 20) terrain = 'forest';
      if (y > 11 && x < 8) terrain = 'mountain';
      if (x > 12 && x < 16) terrain = 'river';
      if (y > 8 && y < 12 && x > 22) terrain = 'forest';
      row.push({ x, y, terrain, cityId: null });
    }
    map.push(row);
  }
  game.map = map;
}

function setupFactions() {
  game.factions = [
    { id: 'wei', name: '魏', color: 'red', money: 12000, capitals: ['洛阳'], generalCount: 6, alive: true },
    { id: 'shu', name: '蜀', color: 'green', money: 12000, capitals: ['成都'], generalCount: 6, alive: true },
    { id: 'wu', name: '吴', color: 'blue', money: 12000, capitals: ['建业'], generalCount: 6, alive: true }
  ];
}

function setupCitiesAndArmies() {
  const defs = [
    ['长安', 8, 6, 'wei', true], ['洛阳', 13, 6, 'wei', true], ['邺城', 16, 3, 'wei', false], ['许昌', 15, 7, 'wei', false],
    ['晋阳', 10, 3, 'wei', false], ['北平', 20, 2, 'wei', false], ['襄平', 24, 1, 'wei', false],
    ['成都', 5, 11, 'shu', true], ['汉中', 8, 9, 'shu', false], ['江州', 8, 12, 'shu', false], ['云南', 3, 14, 'shu', false],
    ['永安', 10, 11, 'shu', false], ['武都', 7, 8, 'shu', false], ['梓潼', 6, 10, 'shu', false],
    ['建业', 21, 10, 'wu', true], ['柴桑', 18, 10, 'wu', false], ['会稽', 23, 13, 'wu', false], ['庐江', 17, 8, 'wu', false],
    ['寿春', 18, 6, 'wu', false], ['长沙', 16, 12, 'wu', false], ['交州', 19, 15, 'wu', false], ['南海', 22, 15, 'wu', false]
  ];

  game.cities = defs.map((d, i) => ({
    id: i,
    name: d[0], x: d[1], y: d[2], owner: d[3], isCapital: d[4],
    development: d[4] ? 8 : 5,
    defense: d[4] ? 6 : 4,
    governorPolitics: 65 + Math.floor(Math.random() * 30),
    garrison: d[4] ? 8000 : 4500,
    besieged: false
  }));

  for (const city of game.cities) {
    for (let yy = city.y; yy < city.y + 2; yy++) {
      for (let xx = city.x; xx < city.x + 2; xx++) {
        if (game.map[yy]?.[xx]) {
          game.map[yy][xx].terrain = 'city';
          game.map[yy][xx].cityId = city.id;
        }
      }
    }
  }

  game.armies = game.factions.map((f, idx) => {
    const cap = game.cities.find(c => c.owner === f.id && c.isCapital);
    return {
      id: `army_${f.id}`,
      faction: f.id,
      x: cap.x,
      y: cap.y,
      troops: 7000,
      unit: idx === 0 ? 'infantry' : (idx === 1 ? 'cavalry' : 'archer'),
      morale: 1,
      acted: false,
      lockedAfterSiege: false,
      generals: [{ name: `${f.name}主将`, lead: 78 + idx * 3, power: 80 + idx * 2, politics: 70, speed: 4 + idx }]
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
  ui.turnInfo.innerHTML = `第 <b>${game.round}</b> / ${MAX_ROUNDS} 回合<br>阶段：<b>${game.phase === 'prep' ? '准备' : '行动'}</b>`;
  ui.factionInfo.innerHTML = `<b>${cf.name}</b><br>金钱：${cf.money}<br>城池：${countCities(cf.id)}<br>总兵：${totalTroops(cf.id)}`;
  updateSelectionInfo();
}

function renderMap() {
  ui.map.innerHTML = '';
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
  const capitalOwned = game.cities.some(c => c.owner === fid && c.isCapital);
  if (!capitalOwned) income = Math.floor(income * 0.8);
  faction.money += income;
  appendLog(`${faction.name} 收入 +${income} 钱。`);
  updatePanels();
}

function recruitAtSelectedCity() {
  if (game.phase !== 'prep') return appendLog('当前不是准备阶段。');
  if (!game.selected) return appendLog('请先选中己方城池。');
  const tile = game.map[game.selected.y][game.selected.x];
  if (tile.cityId == null) return appendLog('该地块没有城池。');
  const city = game.cities[tile.cityId];
  const fid = currentFactionId();
  if (city.owner !== fid) return appendLog('只能在己方城池征兵。');
  const faction = getFaction(fid);
  const cost = 500;
  if (faction.money < cost) return appendLog('金钱不足。');
  const cap = city.development * 1000;
  if (city.garrison >= cap) return appendLog('该城驻军已达上限。');
  city.garrison = Math.min(cap, city.garrison + 1000);
  faction.money -= cost;
  appendLog(`${city.name} 征兵 +1000，花费 ${cost} 钱。`);
  updatePanels();
  renderMap();
}

function moveArmy() {
  if (game.phase !== 'action') return appendLog('当前不是行动阶段。');
  const fid = currentFactionId();
  const army = game.armies.find(a => a.faction === fid);
  if (!army) return appendLog('当前势力无可用军团。');
  if (!game.selected) return appendLog('请先点击目标地块。');
  if (army.lockedAfterSiege) return appendLog('此军团本回合攻城后已无法再主动移动。');
  const dist = Math.abs(game.selected.x - army.x) + Math.abs(game.selected.y - army.y);
  const targetTile = game.map[game.selected.y][game.selected.x];
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

  resolveBattleResult(atk, target, atkPower, defPower, false);
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
    retreat( atk, 1);
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
  game.currentFactionIndex++;
  const order = game.phase === 'prep' ? game.prepOrder : game.actionOrder;
  if (game.currentFactionIndex >= order.length) {
    if (game.phase === 'prep') {
      game.phase = 'action';
      game.currentFactionIndex = 0;
      game.armies.forEach(a => { a.acted = false; a.lockedAfterSiege = false; a.morale = 1; });
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
  for (let i = 1; i <= 20; i++) {
    const btn = document.createElement('button');
    btn.className = 'slot-btn';
    btn.textContent = `${i}`;
    btn.onclick = () => saveGame(i);
    btn.oncontextmenu = (e) => {
      e.preventDefault();
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
  return game.armies.find(a => a.x === x && a.y === y && getFaction(a.faction).alive);
}
function getFaction(fid) { return game.factions.find(f => f.id === fid); }
function terrainName(t) {
  return { plain: '平原', mountain: '山地', forest: '森林', river: '河流', city: '城池' }[t] || t;
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
