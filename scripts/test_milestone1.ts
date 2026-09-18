import { GameWorld } from '../src/domain/GameWorld';
import { MAP_DEFINITIONS } from '../src/domain/definitions/maps';
import { ENHANCEABLE_SLOTS, getActiveResonance } from '../src/domain/definitions/enhancement';
import { DropSystem } from '../src/domain/DropSystem';

console.log('=== [Milestone 1 Verification Test Starting] ===\n');

// 1. 测试全部 10 大位面数据完整性与连通性
console.log('1. 验证 0~9 阶 10 大位面完整性与传送拓扑...');
const world = new GameWorld();
const allMaps = Object.values(MAP_DEFINITIONS);
if (allMaps.length !== 10) {
  throw new Error(`预期 10 个位面，实际加载: ${allMaps.length}`);
}

for (const m of allMaps) {
  if (m.width !== 36 || m.height !== 36) {
    throw new Error(`位面 ${m.id} 尺寸异常: ${m.width}x${m.height}`);
  }
  if (!m.theme || !m.spawns || m.spawns.length === 0) {
    throw new Error(`位面 ${m.id} 缺少主题或刷新规则！`);
  }
  console.log(`  ✓ 位面 [${m.name}] (阶数:${m.tier}) 校验通过, 刷新规则数: ${m.spawns.length}, 传送门数: ${m.portals.length}`);
}

// 2. 测试位面门槛阻挡与跨界传送
console.log('\n2. 测试传送门封印阻挡与准入鉴权...');
const biqiPortals = world.currentMap.portals;
if (biqiPortals.length === 0) {
  throw new Error('比奇荒原未配置前往沃玛神殿的传送门！');
}
const toWoomaPortal = biqiPortals[0];
const checkInitial = world.mapManager.canEnterPortal(
  toWoomaPortal, 
  world.player.stats.level, 
  world.player.stats.ascensionTier || 0
);
if (checkInitial.allowed) {
  throw new Error('新手 1级 0转 应当被沃玛神殿位面封印阻挡！');
}
console.log(`  ✓ 阻挡成功: ${checkInitial.reason}`);

// 提升玩家等级与转阶后重试
world.player.stats.level = 25;
world.player.stats.ascensionTier = 1;
const checkPassed = world.mapManager.canEnterPortal(toWoomaPortal, 25, 1);
if (!checkPassed.allowed) {
  throw new Error('满足 1转 Lv.25 应当允许进入沃玛神殿！');
}
console.log('  ✓ 鉴权通过: 满足 1转 Lv.25 准入沃玛神殿！');

// 实际跨图并验证怪群刷新与玩家出生点
const switched = world.switchMap('map_wooma_1', toWoomaPortal.targetPos);
if (!switched || world.currentMap.id !== 'map_wooma_1') {
  throw new Error('位面切换失败！');
}
if (world.player.gridPos.x !== toWoomaPortal.targetPos.x || world.player.gridPos.y !== toWoomaPortal.targetPos.y) {
  throw new Error('玩家跨图后网格坐标未对齐目标出生点！');
}
if (world.monsters.length === 0) {
  throw new Error('跨图后沃玛神殿怪物群落未生成！');
}
console.log(`  ✓ 成功踏入【${world.currentMap.name}】，刷新怪物数: ${world.monsters.length}`);

// 3. 测试装备部位强化与零损换装继承
console.log('\n3. 测试装备部位强化系统与零损继承...');
// 给予充足金币与材料
world.player.stats.gold = 50000000;
const ironOre = DropSystem.createItemInstance('mat_iron_ore', 1, 500);
const pureIron = DropSystem.createItemInstance('mat_pure_iron', 2, 200);
const godStone = DropSystem.createItemInstance('mat_god_stone', 3, 50);
if (ironOre) world.addItemToInventory(ironOre);
if (pureIron) world.addItemToInventory(pureIron);
if (godStone) world.addItemToInventory(godStone);

console.log(`  初始黑铁矿石: ${world.getMaterialCount('mat_iron_ore')}, 纯黑玄铁: ${world.getMaterialCount('mat_pure_iron')}`);

const initPower = world.player.stats.combatPower;
// 强化武器部位到 +3 (100% 成功率)
world.enhanceSlot('weapon');
world.enhanceSlot('weapon');
world.enhanceSlot('weapon');

if (world.slotEnhancements['weapon'] !== 3) {
  throw new Error(`武器部位强化预期 +3，实际: ${world.slotEnhancements['weapon']}`);
}
if (world.player.stats.combatPower <= initPower) {
  throw new Error('强化武器后人物战力未提升！');
}
console.log(`  ✓ 武器部位淬炼至 +3，战力提升: ${initPower} -> ${world.player.stats.combatPower}`);

// 验证更换武器后强化属性 100% 完美继承
const newSword = DropSystem.createItemInstance('w_caijue', 3);
if (!newSword) throw new Error('创建裁决之杖失败');
const powerBeforeSwap = world.player.stats.combatPower;
world.equipItem(newSword);
if (world.slotEnhancements['weapon'] !== 3) {
  throw new Error('换装后部位强化等级遗失！部位强化必须绑定于栏位槽位！');
}
console.log(`  ✓ 零损换装成功！换上【${newSword.name}】后，槽位强化仍完美维持 +3！`);

// 4. 测试全身强化共鸣机制 (全槽位 +7 流光共鸣)
console.log('\n4. 测试全套部位强化共鸣加成...');
for (const s of ENHANCEABLE_SLOTS) {
  world.slotEnhancements[s] = 7;
}
world.recalculatePlayerStats();
const res7 = getActiveResonance(world.slotEnhancements);
if (!res7 || res7.reqLevel !== 7) {
  throw new Error('全身强化 +7 预期激活【流光护体】共鸣！');
}
console.log(`  ✓ 全身强化+7 共鸣已激活: ${res7.title} (${res7.desc})`);

// 5. 测试背包 40/40 防爆仓防卡死回归
console.log('\n5. 防卡死回归验证：满包 (40/40) 状态下的矿石材料与装备吞吐...');
while (world.inventory.length < 40) {
  const junk = DropSystem.createItemInstance('w_bronze_sword', 0);
  if (junk) world.addItemToInventory(junk);
}
if (world.inventory.length !== 40) {
  throw new Error(`背包容量未达到 40，当前: ${world.inventory.length}`);
}

// 尝试拾取堆叠矿石：应直接堆叠合并，不被满包拦截
const moreOre = DropSystem.createItemInstance('mat_iron_ore', 1, 20);
const beforeOreCount = world.getMaterialCount('mat_iron_ore');
if (moreOre) {
  const added = world.addItemToInventory(moreOre);
  if (!added || world.getMaterialCount('mat_iron_ore') !== beforeOreCount + 20) {
    throw new Error('满包时可堆叠强化矿石材料未能正确堆叠！');
  }
}
console.log('  ✓ 满包状态下强化材料完美堆叠，未发生卡死！');

console.log('\n=== [Milestone 1 全部测试项 100% 校验通过！] ===');
