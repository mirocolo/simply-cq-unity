/**
 * 装备满包、智能回收与防爆仓兜底系统 严密自动化回归测试
 */

import { GameWorld } from '../src/domain/GameWorld';
import { ItemInstance } from '../src/types/game';
import { ITEM_DEFINITIONS } from '../src/domain/definitions/items';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== 装备满包自动回收与防卡死拾取 综合测试 ===\n');

function makeTestItem(defId: string, instanceSuffix: string, tier = 0): ItemInstance {
  const def = ITEM_DEFINITIONS[defId];
  if (!def) throw new Error(`Unknown defId: ${defId}`);
  return {
    ...def,
    defId,
    instanceId: `${defId}_${instanceSuffix}_${Math.random()}`,
    tier: tier,
    quality: def.baseQuality,
    critBonus: def.critBonus || 0,
    hasteBonus: def.hasteBonus || 0,
    count: 1
  };
}

// ── Test 1: 背包满 40 件蓝装与跨阶装备时，addItemToInventory 自动腾挪 ──
console.log('▶ Test 1: 40 格全满蓝装与高阶装时，添加新装备自动腾挪入包');
{
  const world = new GameWorld();
  world.inventory = [];

  // 往背包塞满 40 件装备 (包含蓝装、高阶装备、多件重复部位)
  for (let i = 0; i < 40; i++) {
    const item = makeTestItem('w_bronze_sword', `bag_${i}`, Math.floor(i / 8));
    world.inventory.push(item);
  }
  assert(world.inventory.length === 40, `初始背包容量 = 40/40`);

  // 尝试放入一件更强的新装备
  const newItem = makeTestItem('w_zhanma', 'new_drop', 0);
  const success = world.addItemToInventory(newItem);

  assert(success === true, `背包 40 满格时 addItemToInventory 返回 true`);
  assert(world.inventory.length <= 40, `背包当前容量 ${world.inventory.length} <= 40，未爆仓溢出`);
  assert(world.inventory.some(it => it.defId === 'w_zhanma') || world.equipped['weapon']?.defId === 'w_zhanma', `新强力装备成功入包或直接换装穿上`);
}

// ── Test 2: recycleLowQualityItems 支持蓝装品质 ──
console.log('\n▶ Test 2: recycleLowQualityItems(2) 回收蓝装');
{
  const world = new GameWorld();
  world.inventory = [];

  // 放入 10 件蓝装 (quality = 2: 斩马刀 w_zhanma)
  for (let i = 0; i < 10; i++) {
    world.inventory.push(makeTestItem('w_zhanma', `blue_${i}`, 0));
  }
  assert(world.inventory.length === 10, '放入 10 件蓝装');

  // 调用 recycleLowQualityItems(1) -> 自动换上 1 把斩马刀，换下的旧青铜剑(白装)被回收
  const r1 = world.recycleLowQualityItems(1);
  assert(r1.count === 1, 'recycleLowQualityItems(1) 换装并回收换下的旧新手剑');
  assert(world.inventory.length === 9, '背包剩余 9 件未回收蓝装');

  // 调用 recycleLowQualityItems(2) -> 蓝装，回收剩余 9 件同战力冗余蓝装
  const r2 = world.recycleLowQualityItems(2);
  assert(r2.count === 9, `recycleLowQualityItems(2) 回收 ${r2.count} 件多余蓝装`);
  assert(world.equipped['weapon']?.defId === 'w_zhanma', '身上已成功装备斩马刀');
  assert(world.inventory.length === 0, `背包剩余 ${world.inventory.length} 件`);
}

// ── Test 3: 特戒绝对保护测试 ──
console.log('\n▶ Test 3: 特戒保护，绝不误熔');
{
  const world = new GameWorld();
  world.inventory = [];

  // 放入特戒
  const paralyzeRing = makeTestItem('r_mabi', 'paralyze_1');
  const reviveRing = makeTestItem('r_fuhuo', 'revive_1');
  world.inventory.push(paralyzeRing, reviveRing);

  // 塞满其他低阶装备至 40 件
  for (let i = 0; i < 38; i++) {
    world.inventory.push(makeTestItem('w_wood_sword', `trash_${i}`, 0));
  }
  assert(world.inventory.length === 40, '背包 40 件 (含麻痹与复活特戒)');

  // 执行紧急清理
  world.emergencyPruneInventory(5);

  const hasParalyze = world.inventory.some(it => it.defId === 'r_mabi') || world.equipped['special_paralyze']?.defId === 'r_mabi';
  const hasRevive = world.inventory.some(it => it.defId === 'r_fuhuo') || world.equipped['special_revive']?.defId === 'r_fuhuo';

  assert(hasParalyze, '麻痹特戒妥善保护(在身上或背包中)');
  assert(hasRevive, '复活特戒妥善保护(在身上或背包中)');
  assert(world.inventory.length <= 35, `清理后背包容量 ${world.inventory.length} <= 35，成功释放空间`);
}

// ── Test 4: 连续拾取 100 件装备模拟挂机流程 ──
console.log('\n▶ Test 4: 模拟高频刷怪掉落连续拾取 100 件装备');
{
  const world = new GameWorld();
  world.inventory = [];

  const candidateDefs = [
    'w_wood_sword', 'w_bronze_sword', 'w_bahuang', 'w_lingfeng', 'w_zhanma',
    'a_buyi', 'a_qingkai', 'h_qingtong', 'b_tieshou', 'r_gutong'
  ];

  let pickupSuccessCount = 0;
  for (let i = 0; i < 100; i++) {
    const defId = candidateDefs[i % candidateDefs.length];
    const item = makeTestItem(defId, `drop_${i}`, 0);
    const ok = world.addItemToInventory(item);
    if (ok) pickupSuccessCount++;
  }

  assert(pickupSuccessCount === 100, `连续拾取 100 次全部成功 (${pickupSuccessCount}/100)`);
  assert(world.inventory.length <= world.getMaxInventorySlots(), `最终背包容量 ${world.inventory.length} <= ${world.getMaxInventorySlots()}`);
  assert(world.player.stats.gold > 0, `多次自动回收累计获得金币: ${world.player.stats.gold}`);
}

// ── Test 5: AutoPilot 自动拾取在背包满时的决策 ──
console.log('\n▶ Test 5: AutoPilot 在开启 autoRecycle 时背包满仍可主动寻路拾取');
{
  const world = new GameWorld();
  world.inventory = [];
  const maxSlots = world.getMaxInventorySlots();
  for (let i = 0; i < maxSlots; i++) {
    world.inventory.push(makeTestItem('w_bronze_sword', `full_${i}`, 0));
  }

  // 在距离玩家 2 格处生成一个掉落装备
  const groundItem = {
    id: 'ground_1',
    gridPos: { x: world.player.gridPos.x + 2, y: world.player.gridPos.y },
    item: makeTestItem('w_zhanma', 'ground_drop', 0),
    droppedTick: 1
  };

  const action = world.autoPilot.decide(
    world.player,
    [],
    [groundItem],
    world.inventory,
    world.skills,
    world.autoConfig,
    world.currentTick,
    () => true,
    undefined,
    undefined,
    maxSlots
  );

  assert(action.type === 'move', `AutoPilot 在背包满且开启 autoRecycle 时正确发起拾取移动 (action: ${action.type})`);
}

// ── Test 6: 背包格数随等级与飞升平滑扩容测试 ──
console.log('\n▶ Test 6: 背包格数随等级与境界突破平滑成长');
{
  const world = new GameWorld();

  // Lv.1 0阶
  world.player.stats.level = 1;
  world.player.stats.ascensionTier = 0;
  assert(world.getMaxInventorySlots() === 40, `Lv.1 基础 40 格 (实际 ${world.getMaxInventorySlots()})`);

  // Lv.10 0阶
  world.player.stats.level = 10;
  assert(world.getMaxInventorySlots() === 48, `Lv.10 扩充至 48 格 (实际 ${world.getMaxInventorySlots()})`);

  // Lv.20 1阶
  world.player.stats.level = 20;
  world.player.stats.ascensionTier = 1;
  assert(world.getMaxInventorySlots() === 56, `Lv.20 1阶 扩充至 56 格 (实际 ${world.getMaxInventorySlots()})`);

  // Lv.35 2阶
  world.player.stats.level = 35;
  world.player.stats.ascensionTier = 2;
  assert(world.getMaxInventorySlots() === 72, `Lv.35 2阶 扩充至 72 格 (实际 ${world.getMaxInventorySlots()})`);

  // Lv.60 6阶
  world.player.stats.level = 60;
  world.player.stats.ascensionTier = 6;
  assert(world.getMaxInventorySlots() === 96, `Lv.60 6阶 扩充至上限 96 格 (实际 ${world.getMaxInventorySlots()})`);

  // 升级时触发扩容飘字与日志
  world.player.stats.level = 9;
  world.player.stats.exp = world.player.stats.maxExp - 10;
  world.addExp(20);
  assert(world.player.stats.level === 10, '成功升至 Lv.10');
  assert(world.battleLogs.some(l => l.text.includes('【包裹扩容】')), '升级到 10 级时正确触发包裹扩容系统播报');
}

console.log(`\n${'='.repeat(50)}`);
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ 全部防爆仓防卡死测试通过！');
}
