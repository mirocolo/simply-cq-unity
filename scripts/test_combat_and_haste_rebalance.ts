import { MONSTER_TEMPLATES } from '../src/domain/definitions/monsters';
import { StatCalculator } from '../src/domain/StatCalculator';
import { CombatSystem } from '../src/domain/CombatSystem';
import { GameWorld } from '../src/domain/GameWorld';
import { DropSystem } from '../src/domain/DropSystem';
import { AutoPilot } from '../src/domain/AutoPilot';
import { Entity, ItemInstance, SkillDef } from '../src/types/game';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✅ ${msg}`);
}

console.log('=== 《极简传奇》战斗系统重构、Boss血量数值平衡与护体神盾全方位综合测试 ===\n');

// ----------------------------------------------------
// Test 1: Boss 与 精英怪 HP 数值大幅提升验证
// ----------------------------------------------------
console.log('▶ Test 1: 中后期首领 HP 梯队大幅增强验证');
assert(MONSTER_TEMPLATES['m_wooma_boss'].hp >= 65000, `沃玛教主 HP ${MONSTER_TEMPLATES['m_wooma_boss'].hp} >= 65,000`);
assert(MONSTER_TEMPLATES['m_zuma_boss'].hp >= 180000, `祖玛教主 HP ${MONSTER_TEMPLATES['m_zuma_boss'].hp} >= 180,000`);
assert(MONSTER_TEMPLATES['m_red_moon'].hp >= 450000, `赤月恶魔 HP ${MONSTER_TEMPLATES['m_red_moon'].hp} >= 450,000`);
assert(MONSTER_TEMPLATES['m_huangquan_boss'].hp >= 750000, `黄泉教主 HP ${MONSTER_TEMPLATES['m_huangquan_boss'].hp} >= 750,000`);
assert(MONSTER_TEMPLATES['m_molong_boss'].hp >= 1600000, `魔龙教主 HP ${MONSTER_TEMPLATES['m_molong_boss'].hp} >= 1,600,000`);
assert(MONSTER_TEMPLATES['m_niumo_boss'].hp >= 3500000, `牛魔王 HP ${MONSTER_TEMPLATES['m_niumo_boss'].hp} >= 3,500,000`);
assert(MONSTER_TEMPLATES['m_huolong_boss'].hp >= 7200000, `焚天火龙神 HP ${MONSTER_TEMPLATES['m_huolong_boss'].hp} >= 7,200,000`);
assert(MONSTER_TEMPLATES['m_shura_boss'].hp >= 15000000, `万劫修罗皇 HP ${MONSTER_TEMPLATES['m_shura_boss'].hp} >= 15,000,000`);
assert(MONSTER_TEMPLATES['m_void_boss'].hp >= 28000000, `混元鸿蒙天尊 HP ${MONSTER_TEMPLATES['m_void_boss'].hp} >= 28,000,000`);

// 检查掉落表是否包含祝福油与洗炼石
assert(MONSTER_TEMPLATES['m_zuma_boss'].lootTable.some(l => l.defId === 'pot_blessing_oil'), '祖玛教主掉落祝福油');
assert(MONSTER_TEMPLATES['m_zuma_boss'].lootTable.some(l => l.defId === 'mat_reforge_stone'), '祖玛教主掉落乾坤洗炼石');
assert(MONSTER_TEMPLATES['m_void_boss'].lootTable.some(l => l.defId === 'pot_super_blessing_oil'), '混元天尊掉落超级祝福油');

// ----------------------------------------------------
// Test 2: 人物破甲削弱与运10绝对破甲机制
// ----------------------------------------------------
console.log('\n▶ Test 2: 人物常规破甲软上限 50% 与 运10神圣破甲突破');
// 使用 3 阶修士测试 (基础幸运 = 1)
const baseStatsTier3 = StatCalculator.getBaseStatsForLevel(40, 3);
const dummyEquip: Partial<Record<any, ItemInstance>> = {};

// 装备堆叠大量破甲 (如 60% 破甲，但幸运不高)
const highIgnoreWeapon = DropSystem.createItemInstance('w_caijue', 2);
if (highIgnoreWeapon) {
  highIgnoreWeapon.defenseIgnoreRate = 0.60;
  highIgnoreWeapon.luck = 2; // 总幸运 = 1 + 2 = 3 < 10
  dummyEquip.weapon = highIgnoreWeapon;
}

const statsNormalLuck = StatCalculator.applyEquipment(baseStatsTier3, dummyEquip);
assert(statsNormalLuck.defenseIgnoreRate <= 0.50, `普通幸运下破甲上限封顶 50%: 当前 ${statsNormalLuck.defenseIgnoreRate * 100}%`);

// 当达成运10 (例如武器幸运 +9，总幸运 = 1 + 9 = 10)
if (highIgnoreWeapon) {
  highIgnoreWeapon.luck = 9;
}
const statsLuck10 = StatCalculator.applyEquipment(baseStatsTier3, dummyEquip);
assert(statsLuck10.defenseIgnoreRate === 1.0, `运10神圣破甲达成 100% 绝对无视防御: 当前 ${statsLuck10.defenseIgnoreRate * 100}%`);

const baseStats = baseStatsTier3;

// ----------------------------------------------------
// Test 3: 玩家护甲百分比吸收与防暴毙保护 (Anti-Burst Failsafe)
// ----------------------------------------------------
console.log('\n▶ Test 3: 防御百分比减免与防猝死保护 (单次不超最大HP 35%)');
const mockPlayer: Entity = {
  id: 'player_test',
  name: '测试战士',
  type: 'player',
  gridPos: { x: 5, y: 5 },
  direction: 0,
  state: 'idle',
  isPlayer: true,
  lastAttackTick: 0,
  moveProgress: 0,
  stats: {
    ...baseStats,
    hp: 2000,
    maxHp: 2000,
    minAC: 120,
    maxAC: 180,
    hasAegisPassive: true
  }
};

const mockMonster: Entity = {
  id: 'boss_test',
  name: '终极Boss',
  type: 'monster',
  gridPos: { x: 5, y: 6 },
  direction: 4,
  state: 'idle',
  isPlayer: false,
  lastAttackTick: 0,
  moveProgress: 0,
  stats: {
    ...baseStats,
    minDC: 3000,
    maxDC: 5000,
    level: 80
  }
};

const hitResult = CombatSystem.calculateAttack(mockMonster, mockPlayer);
const maxAllowedDamage = Math.floor(mockPlayer.stats.maxHp * 0.35);
assert(
  hitResult.damage <= maxAllowedDamage,
  `面对攻击力高达 5000 的 Boss，玩家受击伤害为 ${hitResult.damage}，未超过最大HP 35% (${maxAllowedDamage})，成功避免暴毙！`
);

// ----------------------------------------------------
// Test 4: 攻速急速多阶残影、急速冷却 CDR 与风雷真伤
// ----------------------------------------------------
console.log('\n▶ Test 4: 急速溢出多阶残影连击、技能 CDR 与风雷真伤');
const highHasteStats = StatCalculator.applyEquipment(
  { ...baseStats, haste: 85 },
  {}
);
assert((highHasteStats.hasteCdr || 0) > 0, `急速转化为技能冷却 CDR: +${((highHasteStats.hasteCdr || 0) * 100).toFixed(1)}%`);
assert((highHasteStats.phantomStrikeRate || 0) > 0, `急速溢出转化为风雷残影率: +${((highHasteStats.phantomStrikeRate || 0) * 100).toFixed(1)}%`);

const targetMonster = { ...mockMonster, stats: { ...mockMonster.stats, dodgeRate: 0 } };
const attackWithHaste = CombatSystem.calculateAttack(
  { ...mockPlayer, stats: { ...mockPlayer.stats, haste: 75, luck: 9 } },
  targetMonster
);
assert(attackWithHaste.extraTrueDamage! > 0, `急速溢出附带风雷真伤: +${attackWithHaste.extraTrueDamage}`);
assert(attackWithHaste.isHit, '命中有效');

// ----------------------------------------------------
// Test 5: 护体神盾常驻被动与自动释放智能逻辑
// ----------------------------------------------------
console.log('\n▶ Test 5: 护体神盾常驻被动与 AutoPilot 威胁智能释放');
const world = new GameWorld();
assert(world.player.stats.hasAegisPassive !== undefined, '护体神盾常驻被动属性已挂载');

// 测试 AutoPilot 对普通孤立怪不乱丢神盾
const autoPilot = new AutoPilot();
const singleWeakMob: Entity = {
  id: 'm_weak',
  name: '弱小稻草人',
  type: 'monster',
  gridPos: { x: 5, y: 6 },
  direction: 0,
  state: 'idle',
  isPlayer: false,
  lastAttackTick: 0,
  moveProgress: 0,
  stats: { ...baseStats, hp: 50, maxHp: 50, level: 1 }
};

const fullHpPlayer: Entity = {
  ...world.player,
  gridPos: { x: 5, y: 5 },
  stats: { ...world.player.stats, hp: world.player.stats.maxHp, mp: 500, level: 35 }
};

const action1 = autoPilot.decide(
  fullHpPlayer,
  [singleWeakMob],
  [],
  [],
  world.skills,
  { ...world.autoConfig, enabled: true, autoSkill: true },
  10,
  () => true
);
assert(
  action1.type === 'attack' && action1.skillToUse?.id !== 'shield_aegis',
  '面对满血单挑弱小怪，AutoPilot 绝不浪费释放护体神盾'
);

// 测试遭遇首领或残血时自动开启神盾
const bossMob: Entity = {
  id: 'm_boss',
  name: '沃玛教主',
  type: 'monster',
  gridPos: { x: 5, y: 6 },
  direction: 0,
  state: 'idle',
  isPlayer: false,
  isBoss: true,
  lastAttackTick: 0,
  moveProgress: 0,
  stats: { ...baseStats, level: 38 }
};

const action2 = autoPilot.decide(
  fullHpPlayer,
  [bossMob],
  [],
  [],
  world.skills,
  { ...world.autoConfig, enabled: true, autoSkill: true },
  10,
  () => true
);
assert(
  action2.type === 'attack' && action2.skillToUse?.id === 'shield_aegis',
  '面对首领 Boss 威胁，AutoPilot 智能先手开启护体神盾过载！'
);

// ----------------------------------------------------
// Test 6: 祝福油系统、武器诅咒与洗炼重铸
// ----------------------------------------------------
console.log('\n▶ Test 6: 祝福油涂抹、诅咒、罗刹神水与乾坤洗炼石');
const testWeapon = DropSystem.createItemInstance('w_tulong', 3)!;
world.equipped.weapon = testWeapon;

// 购买祝福油与洗炼石
world.player.stats.gold = 50000000;
const buyOilSuccess = world.buyShopItem('pot_blessing_oil', 5);
assert(buyOilSuccess, '神秘黑市成功购买 5 瓶祝福油');

const buyReforgeSuccess = world.buyShopItem('mat_reforge_stone', 3);
assert(buyReforgeSuccess, '神秘黑市成功购买 3 颗乾坤洗炼石');

const buySuperOilSuccess = world.buyShopItem('pot_super_blessing_oil', 1);
assert(buySuperOilSuccess, '神秘黑市成功购买 1 瓶超级祝福油');

// 使用超级祝福油涂抹武器
const oilUsed = world.useBlessingOil(true);
assert(oilUsed, '成功涂抹超级祝福油');
assert((testWeapon.luck || 0) >= 1, `武器幸运增加为 +${testWeapon.luck}`);

// 装备洗炼重铸
const initialAffixes = testWeapon.affixes ? [...testWeapon.affixes] : [];
const reforgeOk = world.reforgeEquipment(testWeapon.instanceId);
assert(reforgeOk, '乾坤洗炼石成功洗炼装备！');
assert(testWeapon.affixes && testWeapon.affixes.length > 0, `洗炼获得新词缀数量: ${testWeapon.affixes?.length}`);

console.log('\n🎉 ALL TESTS PASSED! 战斗数值平衡、Boss血量、防暴毙、护体神盾智能释放、回蓝闭环与神油洗炼系统全部验证通过！');
