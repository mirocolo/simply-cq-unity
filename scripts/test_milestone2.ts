import { GameWorld } from '../src/domain/GameWorld';
import { MONSTER_CODEX_DEFINITIONS } from '../src/domain/definitions/codex';
import { AFFIX_DEFINITIONS } from '../src/domain/definitions/affixes';
import { DropSystem } from '../src/domain/DropSystem';

// Node.js 环境模拟 localStorage
const storageMock: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => storageMock[k] || null,
  setItem: (k: string, v: string) => { storageMock[k] = v; },
  removeItem: (k: string) => { delete storageMock[k]; }
};

console.log('=== [Milestone 2 Verification Test Starting] ===\n');

// 1. 验证变异怪与词缀系统 (Mutation Affixes)
console.log('1. 验证变异怪物生成与词缀库...');
const world = new GameWorld();

// 刷新多张地图确保变异怪与盗宝地精生成
let foundMutated = false;
let foundGoblin = false;

for (let mapIdx = 0; mapIdx < 10; mapIdx++) {
  world.spawnMonstersForMap();
  for (const m of world.monsters) {
    if (m.affixes && m.affixes.length > 0) {
      foundMutated = true;
      const af = m.affixes[0];
      const def = AFFIX_DEFINITIONS[af];
      if (!def) throw new Error(`未知词缀: ${af}`);
      console.log(`  ✓ 检出变异怪物: [${m.name}] 词缀: ${def.title}, 光环色: ${m.color}`);
    }
    if (m.isGoblin || m.templateId === 'm_treasure_goblin') {
      foundGoblin = true;
      console.log(`  ✓ 检出盗宝地精: [${m.name}] 血量: ${m.stats.hp}, 攻速: ${m.stats.haste}`);
    }
  }
  if (foundMutated && foundGoblin) break;
}

if (!foundMutated) {
  throw new Error('经过多次位面刷新未检出变异怪！');
}
if (!foundGoblin) {
  throw new Error('经过多次位面刷新未检出盗宝地精！');
}

// 2. 验证盗宝地精受击喷金币与药水 (Goblin hit loot burst)
console.log('\n2. 验证盗宝地精受击大爆机制...');
const goblin = world.monsters.find(m => m.isGoblin || m.templateId === 'm_treasure_goblin')!;
const initialGold = world.player.stats.gold;
const initialGroundItems = world.groundItems.length;

// 模拟玩家攻击地精
(world as any).burstGoblinHitLoot(goblin);

if (world.player.stats.gold <= initialGold) {
  throw new Error('地精受击未增加玩家金币！');
}
console.log(`  ✓ 地精受击成功喷发金币！金币增加: ${world.player.stats.gold - initialGold}`);

// 3. 验证 Boss 限时破盾与瘫痪机制 (Boss Shield & Weaken Stun)
console.log('\n3. 验证首领神圣金身破盾与虚弱瘫痪机制...');
const testBoss = world.monsters.find(m => m.isBoss) || world.monsters[0];
testBoss.isBoss = true;
testBoss.stats.maxHp = 10000;
testBoss.stats.hp = 3500; // < 40%，触发护盾

// 执行一轮 tick 触发护盾
world.tick();

if (!testBoss.shieldHp || testBoss.shieldHp <= 0 || !testBoss.maxShieldHp) {
  throw new Error('首领生命低于 40% 未能正确开启玄金护盾！');
}
console.log(`  ✓ 首领成功凝聚玄金护盾: ${testBoss.shieldHp}/${testBoss.maxShieldHp}, 破盾倒计时: ${testBoss.shieldTicks} ticks`);

// 攻击首领击碎护盾
const shieldVal = testBoss.shieldHp;
(world as any).applyHitToEntity(world.player, testBoss, undefined, false);
console.log(`  ✓ 攻击首领，护盾吸收伤害后剩余: ${testBoss.shieldHp}`);

// 直接扣减至极低护盾模拟一击打穿破盾
testBoss.stats.dodgeRate = 0;
testBoss.shieldHp = 5;
(world as any).applyHitToEntity(world.player, testBoss, undefined, false);

if (!testBoss.isWeakened || (testBoss.weakenTicks || 0) <= 0) {
  throw new Error(`护盾击碎后首领未能进入虚弱瘫痪状态！shieldHp: ${testBoss.shieldHp}, isWeakened: ${testBoss.isWeakened}`);
}
console.log(`  ✓ 护盾完全击破！首领陷入虚弱瘫痪状态: isWeakened = ${testBoss.isWeakened}, weakenTicks = ${testBoss.weakenTicks}`);

// 4. 验证首领 AOE 预警圈与走位躲避机制 (Telegraphed AOE)
console.log('\n4. 验证首领 AOE 预警圈 (Telegraphed AOE) 与走位回避...');
world.autoConfig.enabled = false; // 暂停挂机以便手动测试几何判定
world.aoeWarnings = [];
world.player.gridPos = { x: 10, y: 10 };
world.player.stats.hp = 1000;
world.player.stats.maxHp = 1000;

// 在玩家脚下生成一个 15 ticks 预警圆
world.aoeWarnings.push({
  id: 'test_aoe_1',
  bossId: testBoss.id,
  skillName: '【狂雷轰顶】',
  center: { x: 10, y: 10 },
  radius: 2,
  currentTick: 13,
  durationTicks: 15,
  damage: 300,
  color: '#38bdf8'
});

// 让玩家走位离开预警圈 (走至 x: 14, y: 10, 距离 4 > 半径 2)
world.player.gridPos = { x: 14, y: 10 };
world.player.targetGridPos = null;
world.player.moveProgress = 0;
world.player.state = 'idle';

// Tick 2 次使 AOE 到期引爆
world.tick();
world.tick();

if (world.player.stats.hp < 1000) {
  throw new Error('玩家已走位撤出预警圈，却仍然受到了 AOE 轰击伤害！');
}
console.log('  ✓ 手操走位闪避成功！玩家离开预警圈后未受任何伤害');

// 再次测试若未避让的情况
world.player.gridPos = { x: 14, y: 10 };
world.player.targetGridPos = null;
world.player.moveProgress = 0;
world.player.state = 'idle';
world.aoeWarnings.push({
  id: 'test_aoe_2',
  bossId: testBoss.id,
  skillName: '【九霄天劫】',
  center: { x: 14, y: 10 },
  radius: 2,
  currentTick: 14,
  durationTicks: 15,
  damage: 250,
  color: '#a855f7'
});
world.tick(); // 引爆

if (world.player.stats.hp >= 1000) {
  throw new Error(`玩家留在预警圈内，却未受到 AOE 轰击伤害！hp: ${world.player.stats.hp}`);
}
console.log(`  ✓ 预警命中结算正确！玩家留在圈内承受伤害，剩余生命: ${world.player.stats.hp}/1000`);

// 恢复挂机并测试挂机 AI 自动躲避红圈
world.autoConfig.enabled = true;
world.aoeWarnings.push({
  id: 'test_aoe_auto',
  bossId: testBoss.id,
  skillName: '【地刺翻涌】',
  center: { ...world.player.gridPos },
  radius: 2,
  currentTick: 5,
  durationTicks: 15,
  damage: 200
});
const autoDecision = (world as any).autoPilot.decide(
  world.player,
  world.monsters,
  world.groundItems,
  world.inventory,
  world.skills,
  world.autoConfig,
  world.currentTick,
  world.isWalkable,
  world.currentMap.portals,
  world.aoeWarnings
);
if (autoDecision.type === 'move' && autoDecision.targetPos) {
  console.log(`  ✓ 挂机 AI 极速响应！检测到危险红圈，自动决策紧急规避至 (${autoDecision.targetPos.x}, ${autoDecision.targetPos.y})！`);
}

// 5. 验证百妖封魔录成就累计与全属性永久加成 (Monster Codex)
console.log('\n5. 验证百妖封魔录成就与永久属性提升...');
world.recalculatePlayerStats();
const prevDC = world.player.stats.maxDC;
const prevHp = world.player.stats.maxHp;

// 模拟击杀稻草人 200 只
world.monsterKills['m_scarecrow'] = 250;

// 激活阶位 1、2、3
const claimRes1 = world.claimCodexReward('m_scarecrow', 0);
const claimRes2 = world.claimCodexReward('m_scarecrow', 1);
const claimRes3 = world.claimCodexReward('m_scarecrow', 2);

if (!claimRes1 || !claimRes2 || !claimRes3) {
  throw new Error('封魔录达成阶位领取失败！');
}

const bonus = world.getCodexStatsBonus();
console.log(`  ✓ 封魔录里程碑达成！累积全属性永久加成: 生命+${bonus.maxHp}, 攻击+${bonus.minDC}-${bonus.maxDC}, 暴击+${bonus.critRate * 100}%`);

if (world.player.stats.maxDC <= prevDC || world.player.stats.maxHp <= prevHp) {
  throw new Error('封魔录属性加成未正确生效到玩家 EntityStats！');
}
console.log(`  ✓ 玩家属性同步突破！攻击力: ${prevDC} -> ${world.player.stats.maxDC}, 生命: ${prevHp} -> ${world.player.stats.maxHp}`);

// 6. 验证万象悬赏令委派与奖励发放 (Bounties)
console.log('\n6. 验证万象悬赏令委派与完成领奖...');
world.refreshBounties();
if (world.activeBounties.length !== 3) {
  throw new Error(`悬赏令数量异常，预期 3 条，实际: ${world.activeBounties.length}`);
}

const firstBounty = world.activeBounties[0];
console.log(`  ✓ 当前委派: [${firstBounty.targetName}], 需讨伐: ${firstBounty.requiredKills} 只`);

// 推进击杀数直至完成
for (let i = 0; i < firstBounty.requiredKills; i++) {
  world.recordMonsterKill(firstBounty.templateId);
}

if (!firstBounty.completed) {
  throw new Error('悬赏任务目标击杀数已满，但状态未标记为 completed！');
}

const oreBefore = world.getMaterialCount('mat_iron_ore');
const goldBefore = world.player.stats.gold;
const claimBountyRes = world.claimBounty(firstBounty.id);

if (!claimBountyRes || !firstBounty.claimed) {
  throw new Error('悬赏任务领奖失败！');
}
const oreAfter = world.getMaterialCount('mat_iron_ore');
const goldAfter = world.player.stats.gold;

console.log(`  ✓ 悬赏令成功交令！获得金币: +${goldAfter - goldBefore}, 黑铁矿石: +${oreAfter - oreBefore}`);

// 7. 验证存储与加载 (Persistence)
console.log('\n7. 验证封魔录与悬赏令存档与读档...');
world.save();
const loadedSuccess = world.load();
if (!loadedSuccess) {
  throw new Error('存档读取失败！');
}
if ((world.monsterKills['m_scarecrow'] || 0) < 200) {
  throw new Error('读档后 monsterKills 计数丢失！');
}
if (!world.codexClaimedTiers['m_scarecrow'] || world.codexClaimedTiers['m_scarecrow'].length !== 3) {
  throw new Error('读档后 codexClaimedTiers 里程碑丢失！');
}
console.log('  ✓ 存档与读档全部正确还原！百妖封魔录与悬赏令数据完美闭环！');

console.log('\n=== [Milestone 2 All Verification Passed Successfully!] ===');
