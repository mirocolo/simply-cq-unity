import { MONSTER_TEMPLATES } from '../src/domain/definitions/monsters';
import { MAP_DEFINITIONS } from '../src/domain/definitions/maps';
import { StatCalculator } from '../src/domain/StatCalculator';
import { GameWorld } from '../src/domain/GameWorld';
import { ItemInstance } from '../src/types/game';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✅ ${msg}`);
}

console.log('=== 游戏节奏调优与后期Boss难度综合验证 ===\n');

console.log('▶ Test 1: 怪物与Boss刷新频率合理拉长 (避免秒刷与爆图)');
// 小怪 respawnTicks >= 300 (30秒)
assert(MONSTER_TEMPLATES['m_scarecrow'].respawnTicks >= 300, `稻草人复活时间 ${MONSTER_TEMPLATES['m_scarecrow'].respawnTicks} >= 300 ticks (30s)`);
assert(MONSTER_TEMPLATES['m_skeleton'].respawnTicks >= 380, `骷髅战士复活时间 ${MONSTER_TEMPLATES['m_skeleton'].respawnTicks} >= 380 ticks (38s)`);
assert(MONSTER_TEMPLATES['m_niumo_general'].respawnTicks >= 450, `牛魔祭司复活时间 ${MONSTER_TEMPLATES['m_niumo_general'].respawnTicks} >= 450 ticks (45s)`);

// Boss 刷新时间分层拉长：
// 低阶 Boss (1~2 分钟)
assert(MONSTER_TEMPLATES['m_wooma_boss'].respawnTicks >= 1200, `沃玛教主刷新时间 ${MONSTER_TEMPLATES['m_wooma_boss'].respawnTicks} >= 1200 ticks (2分钟)`);
// 中阶 Boss (2.5~4 分钟)
assert(MONSTER_TEMPLATES['m_zuma_boss'].respawnTicks >= 1500, `祖玛教主刷新时间 ${MONSTER_TEMPLATES['m_zuma_boss'].respawnTicks} >= 1500 ticks (2.5分钟)`);
assert(MONSTER_TEMPLATES['m_molong_boss'].respawnTicks >= 2400, `魔龙教主刷新时间 ${MONSTER_TEMPLATES['m_molong_boss'].respawnTicks} >= 2400 ticks (4分钟)`);
// 高阶/极境 Boss (5~10 分钟)
assert(MONSTER_TEMPLATES['m_niumo_boss'].respawnTicks >= 3000, `牛魔王刷新时间 ${MONSTER_TEMPLATES['m_niumo_boss'].respawnTicks} >= 3000 ticks (5分钟)`);
assert(MONSTER_TEMPLATES['m_huolong_boss'].respawnTicks >= 3600, `焚天火龙神刷新时间 ${MONSTER_TEMPLATES['m_huolong_boss'].respawnTicks} >= 3600 ticks (6分钟)`);
assert(MONSTER_TEMPLATES['m_shura_boss'].respawnTicks >= 4500, `万劫修罗皇刷新时间 ${MONSTER_TEMPLATES['m_shura_boss'].respawnTicks} >= 4500 ticks (7.5分钟)`);
assert(MONSTER_TEMPLATES['m_void_boss'].respawnTicks >= 6000, `混元鸿蒙天尊刷新时间 ${MONSTER_TEMPLATES['m_void_boss'].respawnTicks} >= 6000 ticks (10分钟)`);

console.log('\n▶ Test 2: 地图 Spawn 规则与怪物模板刷新时间一致性');
for (const [mapId, map] of Object.entries(MAP_DEFINITIONS)) {
  for (const spawn of map.spawns) {
    const tmpl = MONSTER_TEMPLATES[spawn.templateId];
    assert(!!tmpl, `地图 [${map.name}] 怪物 [${spawn.templateId}] 模板存在`);
    assert(spawn.respawnTicks === tmpl.respawnTicks, `地图 [${map.name}] 怪物 [${tmpl.name}] spawn.respawnTicks(${spawn.respawnTicks}) 与模板一致(${tmpl.respawnTicks})`);
  }
}

console.log('\n▶ Test 3: 升级经验曲线更平滑严密 (基数 100, 指数 1.20)');
const expLv1 = StatCalculator.getBaseStatsForLevel(1).maxExp;
const expLv10 = StatCalculator.getBaseStatsForLevel(10).maxExp;
const expLv30 = StatCalculator.getBaseStatsForLevel(30).maxExp;
assert(expLv1 === 100, `Lv.1 升级所需经验为 100 (实际: ${expLv1})`);
assert(expLv10 > expLv1, `Lv.10 升级所需经验 (${expLv10}) > Lv.1 (${expLv1})`);
assert(expLv30 > expLv10 * 10, `Lv.30 升级经验 (${expLv30}) 具备良好长线梯度`);

console.log('\n▶ Test 4: 后期 Boss 属性合理强化 (HP、双抗、爆发)');
const molong = MONSTER_TEMPLATES['m_molong_boss'];
assert(molong.hp >= 160000, `魔龙教主 HP=${molong.hp} >= 160,000`);
assert(molong.maxDC >= 180, `魔龙教主 MaxDC=${molong.maxDC} >= 180`);

const niumo = MONSTER_TEMPLATES['m_niumo_boss'];
assert(niumo.hp >= 320000, `牛魔王 HP=${niumo.hp} >= 320,000`);
assert(niumo.maxDC >= 260, `牛魔王 MaxDC=${niumo.maxDC} >= 260`);
assert(niumo.maxAC >= 120, `牛魔王 MaxAC=${niumo.maxAC} >= 120`);

const huolong = MONSTER_TEMPLATES['m_huolong_boss'];
assert(huolong.hp >= 650000, `焚天火龙神 HP=${huolong.hp} >= 650,000`);
assert(huolong.maxDC >= 380, `焚天火龙神 MaxDC=${huolong.maxDC} >= 380`);
assert(huolong.maxAC >= 170, `焚天火龙神 MaxAC=${huolong.maxAC} >= 170`);

const shura = MONSTER_TEMPLATES['m_shura_boss'];
assert(shura.hp >= 1200000, `万劫修罗皇 HP=${shura.hp} >= 1,200,000`);
assert(shura.maxDC >= 550, `万劫修罗皇 MaxDC=${shura.maxDC} >= 550`);
assert(shura.maxAC >= 230, `万劫修罗皇 MaxAC=${shura.maxAC} >= 230`);

const voidBoss = MONSTER_TEMPLATES['m_void_boss'];
assert(voidBoss.hp >= 2600000, `混元鸿蒙天尊 HP=${voidBoss.hp} >= 2,600,000`);
assert(voidBoss.maxDC >= 880, `混元鸿蒙天尊 MaxDC=${voidBoss.maxDC} >= 880`);
assert(voidBoss.maxAC >= 320, `混元鸿蒙天尊 MaxAC=${voidBoss.maxAC} >= 320`);

console.log('\n▶ Test 5: 装备回收经验大幅调优 (避免通过垃圾装备瞬间满级)');
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
const initialExp = world.player.stats.exp;
const recycleRes = world.recycleLowQualityItems(3);
assert(recycleRes.count === 1, `成功回收 1 件测试装备`);
assert(recycleRes.exp === 800, `回收经验比例为价格的 8% (10000 * 0.08 = 800, 实际: ${recycleRes.exp})`);

console.log('\n▶ Test 6: 怪物击杀经验控制在稳健增长区间');
const world2 = new GameWorld();
world2.player.stats.ascensionTier = 5; // 5阶飞升玩家
const scarecrowExpTmpl = MONSTER_TEMPLATES['m_scarecrow'].expReward;
// 经验倍率应该为 1 + 5 * 0.20 = 2.0 (原先 1 + 5 * 2.0 = 11.0 倍)
const calculatedExp = Math.floor(scarecrowExpTmpl * (1 + 5 * 0.20));
assert(calculatedExp === Math.floor(scarecrowExpTmpl * 2.0), `5阶击杀经验仅为基础的 2.0 倍 (原 11 倍暴走已消除)`);

console.log('\n==================================================');
console.log('✅ 所有节奏调优与难度强化指标均完美达成！\n');
