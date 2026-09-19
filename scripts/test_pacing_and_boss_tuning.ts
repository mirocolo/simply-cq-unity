import { MONSTER_TEMPLATES } from '../src/domain/definitions/monsters';
import { MAP_DEFINITIONS } from '../src/domain/definitions/maps';
import { StatCalculator } from '../src/domain/StatCalculator';
import { GameWorld } from '../src/domain/GameWorld';
import { DropSystem } from '../src/domain/DropSystem';
import { ItemInstance } from '../src/types/game';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✅ ${msg}`);
}

console.log('=== 增加刷新频率与降低爆率 综合平衡验证 ===\n');

console.log('▶ Test 1: 怪物与Boss刷新频率合理加快 (快节奏战斗体验)');
// 小怪 respawnTicks: 10~16s (100~160 ticks)
assert(MONSTER_TEMPLATES['m_scarecrow'].respawnTicks <= 120, `稻草人复活时间 ${MONSTER_TEMPLATES['m_scarecrow'].respawnTicks} <= 120 ticks (10s~12s)`);
assert(MONSTER_TEMPLATES['m_skeleton'].respawnTicks <= 150, `骷髅战士复活时间 ${MONSTER_TEMPLATES['m_skeleton'].respawnTicks} <= 150 ticks (13s~15s)`);
assert(MONSTER_TEMPLATES['m_niumo_general'].respawnTicks <= 180, `牛魔祭司复活时间 ${MONSTER_TEMPLATES['m_niumo_general'].respawnTicks} <= 180 ticks (15s~18s)`);

// 精英怪与 Boss 刷新时间分层加快：
// 精英怪 (24秒)
assert(MONSTER_TEMPLATES['m_white_pig'].respawnTicks <= 250, `白野猪精英刷新时间 ${MONSTER_TEMPLATES['m_white_pig'].respawnTicks} <= 250 ticks (24s)`);
// 低阶 Boss (1分钟左右)
assert(MONSTER_TEMPLATES['m_wooma_boss'].respawnTicks <= 650, `沃玛教主刷新时间 ${MONSTER_TEMPLATES['m_wooma_boss'].respawnTicks} <= 650 ticks (1分钟)`);
// 中阶 Boss (1.25~1.67 分钟)
assert(MONSTER_TEMPLATES['m_zuma_boss'].respawnTicks <= 800, `祖玛教主刷新时间 ${MONSTER_TEMPLATES['m_zuma_boss'].respawnTicks} <= 800 ticks (1.25分钟)`);
assert(MONSTER_TEMPLATES['m_molong_boss'].respawnTicks <= 1100, `魔龙教主刷新时间 ${MONSTER_TEMPLATES['m_molong_boss'].respawnTicks} <= 1100 ticks (1.67分钟)`);
// 高阶/极境 Boss (2~3 分钟)
assert(MONSTER_TEMPLATES['m_niumo_boss'].respawnTicks <= 1300, `牛魔王刷新时间 ${MONSTER_TEMPLATES['m_niumo_boss'].respawnTicks} <= 1300 ticks (2分钟)`);
assert(MONSTER_TEMPLATES['m_huolong_boss'].respawnTicks <= 1500, `焚天火龙神刷新时间 ${MONSTER_TEMPLATES['m_huolong_boss'].respawnTicks} <= 1500 ticks (2.33分钟)`);
assert(MONSTER_TEMPLATES['m_shura_boss'].respawnTicks <= 1700, `万劫修罗皇刷新时间 ${MONSTER_TEMPLATES['m_shura_boss'].respawnTicks} <= 1700 ticks (2.67分钟)`);
assert(MONSTER_TEMPLATES['m_void_boss'].respawnTicks <= 1900, `混元鸿蒙天尊刷新时间 ${MONSTER_TEMPLATES['m_void_boss'].respawnTicks} <= 1900 ticks (3分钟)`);

console.log('\n▶ Test 2: 地图 Spawn 规则与怪物模板刷新时间全量一致性');
for (const [mapId, map] of Object.entries(MAP_DEFINITIONS)) {
  for (const spawn of map.spawns) {
    const tmpl = MONSTER_TEMPLATES[spawn.templateId];
    assert(!!tmpl, `地图 [${map.name}] 怪物 [${spawn.templateId}] 模板存在`);
    assert(spawn.respawnTicks === tmpl.respawnTicks, `地图 [${map.name}] 怪物 [${tmpl.name}] spawn.respawnTicks(${spawn.respawnTicks}) 与模板一致(${tmpl.respawnTicks})`);
  }
}

console.log('\n▶ Test 3: 降低爆率与品质稀有度合理控制 (避免装备泛滥，增加惊喜感)');
// 稻草人装备掉落率 <= 10%
const scarecrowSword = MONSTER_TEMPLATES['m_scarecrow'].lootTable.find(l => l.defId === 'w_wood_sword');
assert(!!scarecrowSword && scarecrowSword.chance <= 0.12, `普通怪武器掉落率 ${scarecrowSword?.chance} <= 12% (原 45%)`);

// 白野猪神兵掉落率 <= 15%
const whitePigLianyu = MONSTER_TEMPLATES['m_white_pig'].lootTable.find(l => l.defId === 'w_lianyu');
assert(!!whitePigLianyu && whitePigLianyu.chance <= 0.15, `精英怪神兵掉落率 ${whitePigLianyu?.chance} <= 15% (原 40%)`);

// 沃玛教主特戒掉落率 <= 8%
const woomaMabi = MONSTER_TEMPLATES['m_wooma_boss'].lootTable.find(l => l.defId === 'r_mabi');
assert(!!woomaMabi && woomaMabi.chance <= 0.08, `沃玛教主特戒掉落率 ${woomaMabi?.chance} <= 8% (原 20%)`);

// 赤月恶魔特戒掉落率 <= 10%
const redMoonMabi = MONSTER_TEMPLATES['m_red_moon'].lootTable.find(l => l.defId === 'r_mabi');
assert(!!redMoonMabi && redMoonMabi.chance <= 0.10, `赤月恶魔特戒掉落率 ${redMoonMabi?.chance} <= 10% (原 35%)`);

// 终极鸿蒙天尊特戒掉落率 <= 18%
const voidMabi = MONSTER_TEMPLATES['m_void_boss'].lootTable.find(l => l.defId === 'r_mabi');
assert(!!voidMabi && voidMabi.chance <= 0.18, `鸿蒙天尊特戒掉落率 ${voidMabi?.chance} <= 18% (原 60%)`);

// 品质分布控制统计验证 (Roll 10,000 次)
let bossOrangeCount = 0;
let normalPurpleCount = 0;
for (let i = 0; i < 10000; i++) {
  if (DropSystem.rollQuality(true, false) === 4) bossOrangeCount++;
  if (DropSystem.rollQuality(false, false) === 3) normalPurpleCount++;
}
const bossOrangeRate = bossOrangeCount / 10000;
const normalPurpleRate = normalPurpleCount / 10000;
assert(bossOrangeRate <= 0.22 && bossOrangeRate >= 0.14, `Boss 橙装暴击率在 14%~22% 稀有区间 (实际: ${(bossOrangeRate * 100).toFixed(1)}%)`);
assert(normalPurpleRate <= 0.02, `普通怪紫装掉落率 <= 2% 极稀有区间 (实际: ${(normalPurpleRate * 100).toFixed(2)}%)`);

console.log('\n▶ Test 4: 升级经验曲线平滑 (基数 100, 指数 1.20)');
const expLv1 = StatCalculator.getBaseStatsForLevel(1).maxExp;
const expLv10 = StatCalculator.getBaseStatsForLevel(10).maxExp;
const expLv30 = StatCalculator.getBaseStatsForLevel(30).maxExp;
assert(expLv1 === 100, `Lv.1 升级所需经验为 100 (实际: ${expLv1})`);
assert(expLv10 > expLv1, `Lv.10 升级所需经验 (${expLv10}) > Lv.1 (${expLv1})`);
assert(expLv30 > expLv10 * 10, `Lv.30 升级经验 (${expLv30}) 具备良好长线梯度`);

console.log('\n▶ Test 5: 后期 Boss 属性与难度保持');
const molong = MONSTER_TEMPLATES['m_molong_boss'];
assert(molong.hp >= 160000, `魔龙教主 HP=${molong.hp} >= 160,000`);
const voidBoss = MONSTER_TEMPLATES['m_void_boss'];
assert(voidBoss.hp >= 2600000, `混元鸿蒙天尊 HP=${voidBoss.hp} >= 2,600,000`);

console.log('\n▶ Test 6: 装备回收经验大幅调优');
const world = new GameWorld();
const testItem: ItemInstance = {
  instanceId: 'test_sword_recycle',
  defId: 'w_caijue',
  name: '裁决之杖',
  type: 'equipment',
  slot: 'weapon',
  levelReq: 35,
  tier: 1,
  quality: 3,
  stats: { minDC: 10, maxDC: 30 },
  price: 10000
};
world.inventory = [testItem];
const recycleRes = world.recycleLowQualityItems(3);
assert(recycleRes.count === 1, `成功回收 1 件测试装备`);
assert(recycleRes.exp === 800, `回收经验比例为价格的 8% (10000 * 0.08 = 800)`);

console.log('\n==================================================');
console.log('✅ 刷新频率加快与爆率合理降低指标全部通过！\n');
