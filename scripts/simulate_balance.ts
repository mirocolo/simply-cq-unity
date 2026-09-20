import { GameWorld } from '../src/domain/GameWorld';
import { PRNG } from '../src/utils/PRNG';
import assert from 'assert';

console.log('=== 开始《极简传奇》无头挂机数值与成长曲线自动化仿真 ===\n');

const prng = new PRNG(20260920);
const world = new GameWorld();

// 开启自动挂机
world.autoConfig.enabled = true;
world.autoConfig.autoHpPotion = true;
world.autoConfig.autoMpPotion = true;
world.autoConfig.autoSkill = true;
world.autoConfig.autoPickup = true;
world.autoConfig.autoRecycleWeaker = true;

const simulationTicks = 3000; // 模拟 3000 ticks (相当于 300 秒 / 5 分钟高频挂机实测)
const milestones: { tick: number; level: number; gold: number; kills: number }[] = [];
let lastRecordedLevel = 1;

console.log(`▶ 开始以 10000x 速度无头仿真运行 ${simulationTicks} Ticks...`);
const startTime = performance.now();

for (let tick = 1; tick <= simulationTicks; tick++) {
  world.tick();

  const currentLevel = world.player.stats.level;
  if (currentLevel > lastRecordedLevel) {
    milestones.push({
      tick,
      level: currentLevel,
      gold: world.player.stats.gold,
      kills: world.autoStats.killCount
    });
    lastRecordedLevel = currentLevel;
  }

  // 模拟挂机时每 100 ticks (10s) 执行一次一键穿戴与一键强化
  if (tick % 100 === 0) {
    world.oneKeyEquipBest();
    world.recycleWeakerOrEqualItems();
    world.enhanceAllSlotsOneKey(5);
  }
}

const simElapsed = performance.now() - startTime;

console.log(`\n🎉 仿真完成！实际计算耗时: ${simElapsed.toFixed(2)} ms`);
console.log(`--------------------------------------------------`);
console.log(`📊 最终角色状态:`);
console.log(`   等级: Lv.${world.player.stats.level} (境界: ${world.player.stats.ascensionTier || 0}阶)`);
console.log(`   生命值: ${world.player.stats.hp} / ${world.player.stats.maxHp}`);
console.log(`   物理攻击: ${world.player.stats.minDC} ~ ${world.player.stats.maxDC}
   物理防御: ${world.player.stats.minAC} ~ ${world.player.stats.maxAC}`);
console.log(`   综合战力: ${world.player.stats.combatPower.toLocaleString()}`);
console.log(`   累计击杀魔物: ${world.autoStats.killCount} 只`);
console.log(`   累计获取金币: ${world.autoStats.goldGained.toLocaleString()}`);
console.log(`   累计获得经验: ${world.autoStats.expGained.toLocaleString()}`);
console.log(`   蓝装掉落: ${world.autoStats.blueDrops} 件, 紫装: ${world.autoStats.purpleDrops} 件, 橙装: ${world.autoStats.orangeDrops} 件`);
console.log(`--------------------------------------------------`);

console.log(`\n📈 升级里程碑时间线:`);
for (const m of milestones.slice(0, 10)) {
  console.log(`   [Tick ${m.tick.toString().padStart(4, ' ')} | ${(m.tick * 0.1).toFixed(1)}s] 升至 Lv.${m.level.toString().padStart(2, ' ')} | 击杀: ${m.kills} 只 | 金币: ${m.gold}`);
}

// 核心数值健康度断言
assert(world.player.stats.level > 1, '挂机 3000 ticks 角色必须有等级成长');
assert(world.autoStats.killCount > 20, '挂机必须击杀怪物并顺利吸附战利品');
assert(world.player.stats.hp > 0, '在自动喝药保护下，初始挂机绝不暴毙');
assert(world.player.stats.combatPower > 300, '穿装与强化后战力必须有显著提升');

console.log('\n=== 无头挂机数值与成长曲线自动化仿真全部通过 ===');
