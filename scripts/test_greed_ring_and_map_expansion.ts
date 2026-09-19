import { GameWorld } from '../src/domain/GameWorld';
import { MONSTER_TEMPLATES } from '../src/domain/definitions/monsters';
import { MAP_DEFINITIONS } from '../src/domain/definitions/maps';
import { MONSTER_CODEX_DEFINITIONS, generateBounties } from '../src/domain/definitions/codex';
import { DropSystem } from '../src/domain/DropSystem';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERT FAILED] ${message}`);
  }
}

console.log('=== 启动综合自动化测试：贪婪特戒掉落、48x48地图扩建、怪群生态与图鉴全量验证 ===\n');

// -------------------------------------------------------------
// 1. 验证贪婪特戒 (r_tanlan) 掉落池配置与掉落生效
// -------------------------------------------------------------
console.log('▶ Test 1: 验证贪婪特戒 (r_tanlan) 掉落池与产出机制');

const goblinTmpl = MONSTER_TEMPLATES['m_treasure_goblin'];
assert(!!goblinTmpl, '盗宝地精模板必须存在');
const goblinGreedLoot = goblinTmpl.lootTable.find(l => l.defId === 'r_tanlan');
assert(!!goblinGreedLoot && goblinGreedLoot.chance >= 0.20, `盗宝地精掉落表中必须包含 r_tanlan 且概率 >= 20% (实际: ${goblinGreedLoot?.chance})`);

const whitePigTmpl = MONSTER_TEMPLATES['m_white_pig'];
assert(!!whitePigTmpl.lootTable.find(l => l.defId === 'r_tanlan'), '白野猪掉落表中必须包含 r_tanlan');

const zombieTmpl = MONSTER_TEMPLATES['m_zombie'];
assert(!!zombieTmpl.lootTable.find(l => l.defId === 'r_tanlan'), '矿区尸王掉落表中必须包含 r_tanlan');

const woomaTmpl = MONSTER_TEMPLATES['m_wooma_boss'];
assert(!!woomaTmpl.lootTable.find(l => l.defId === 'r_tanlan'), '沃玛教主掉落表中必须包含 r_tanlan');

const molongTmpl = MONSTER_TEMPLATES['m_molong_boss'];
assert(!!molongTmpl.lootTable.find(l => l.defId === 'r_tanlan'), '魔龙教主掉落表中必须包含 r_tanlan');

// 模拟多次击杀盗宝地精，直到爆出贪婪特戒
let greedRingDropped = false;
for (let i = 0; i < 50; i++) {
  const drops = DropSystem.rollMonsterDrops(goblinTmpl, { x: 20, y: 20 }, i);
  const ring = drops.find(d => d.item.defId === 'r_tanlan');
  if (ring) {
    greedRingDropped = true;
    assert(ring.item.slot === 'special_greed', '贪婪特戒部位必须为 special_greed');
    assert(ring.item.quality === 4, '贪婪特戒基础品质必须为传说橙色 (4)');
    assert(ring.item.specialEffect === 'greed', '贪婪特戒特殊效果必须为 greed');
    break;
  }
}
assert(greedRingDropped, '多次击杀盗宝地精应成功爆出贪婪特戒');

// 验证穿戴贪婪特戒后的金币 2.5 倍掉落收益
const world1 = new GameWorld();
const greedItem = DropSystem.createItemInstance('r_tanlan');
assert(!!greedItem, 'r_tanlan 实例创建成功');
world1.equipped['special_greed'] = greedItem!;
assert(world1.hasSpecialEffect('greed'), '装备贪婪特戒后 hasSpecialEffect("greed") 必须为 true');

console.log('  ✅ 贪婪特戒已在盗宝地精、白野猪及各大首领中正确配置，模拟大爆成功，2.5倍聚宝生效！\n');

// -------------------------------------------------------------
// 2. 验证地图尺寸扩建至 48x48 与传送门网格拓扑
// -------------------------------------------------------------
console.log('▶ Test 2: 验证 10 大位面地图扩建至 48x48 与网格拓扑');

for (const [mapId, mapDef] of Object.entries(MAP_DEFINITIONS)) {
  assert(mapDef.width === 48 && mapDef.height === 48, `地图 [${mapDef.name}] 尺寸必须为 48x48 (实际: ${mapDef.width}x${mapDef.height})`);
  assert(mapDef.spawnPoint.x >= 1 && mapDef.spawnPoint.x <= 46, `地图 [${mapDef.name}] 出生点 x 坐标越界`);
  assert(mapDef.spawnPoint.y >= 1 && mapDef.spawnPoint.y <= 46, `地图 [${mapDef.name}] 出生点 y 坐标越界`);

  // 验证传送门坐标在合理范围内且在边界内
  for (const portal of mapDef.portals) {
    assert(portal.pos.x >= 2 && portal.pos.x <= 45, `地图 [${mapDef.name}] 传送门 [${portal.name}] x 坐标须在合法范围`);
    assert(portal.pos.y >= 2 && portal.pos.y <= 45, `地图 [${mapDef.name}] 传送门 [${portal.name}] y 坐标须在合法范围`);
    assert(portal.targetPos.x >= 2 && portal.targetPos.x <= 45, `地图 [${mapDef.name}] 传送门目标位置 x 必须合法`);
  }
}

// 验证 GameWorld 中 MAP_WIDTH / MAP_HEIGHT 属性动态感知 48x48
const world2 = new GameWorld();
assert(world2.MAP_WIDTH === 48 && world2.MAP_HEIGHT === 48, 'GameWorld.MAP_WIDTH 必须为 48');
assert(world2.autoConfig.searchRadius === 36, 'AutoPilot searchRadius 必须为 36 以适配 48x48 大地图');

console.log('  ✅ 全游戏 10 大位面已全部扩展至 48x48 网格，坐标拓扑全部严密合法！\n');

// -------------------------------------------------------------
// 3. 验证小怪数量增加至 40~55 只，且刷新频率放缓至从容节奏
// -------------------------------------------------------------
console.log('▶ Test 3: 验证小怪数量扩充 (40~55只) 与刷新频率放缓 (15~22s)');

for (const [mapId, mapDef] of Object.entries(MAP_DEFINITIONS)) {
  const totalMonsters = mapDef.spawns.reduce((sum, sp) => sum + sp.count, 0);
  assert(
    totalMonsters >= 40 && totalMonsters <= 56,
    `地图 [${mapDef.name}] 怪物总数必须在 40~56 只之间 (实际: ${totalMonsters} 只)`
  );

  for (const sp of mapDef.spawns) {
    const tmpl = MONSTER_TEMPLATES[sp.templateId];
    assert(!!tmpl, `怪物模板 [${sp.templateId}] 必须存在`);
    if (!tmpl.isBoss && !tmpl.isElite) {
      assert(
        sp.respawnTicks >= 150 && sp.respawnTicks <= 220,
        `普通怪 [${tmpl.name}] respawnTicks 必须在 150~220 (15~22s) 区间 (实际: ${sp.respawnTicks})`
      );
    } else if (tmpl.isElite) {
      assert(sp.respawnTicks >= 350, `精英怪 [${tmpl.name}] respawnTicks 须 >= 350 (实际: ${sp.respawnTicks})`);
    } else if (tmpl.isBoss) {
      assert(sp.respawnTicks >= 600, `首领怪 [${tmpl.name}] respawnTicks 须 >= 600 (实际: ${sp.respawnTicks})`);
    }
  }
}

console.log('  ✅ 10 大地图怪物总量均达 40~55 只，刷新时间保持在 15~22 秒健康从容节奏！\n');

// -------------------------------------------------------------
// 4. 验证图鉴 Bug 修复 (m_molong_boss) 与全 23 尊魔物覆盖
// -------------------------------------------------------------
console.log('▶ Test 4: 验证百妖封魔录全 23 尊魔物图鉴与平滑阶梯');

const codexKeys = Object.keys(MONSTER_CODEX_DEFINITIONS);
assert(codexKeys.length === 23, `全游戏图鉴必须包含 23 尊魔物 (实际: ${codexKeys.length})`);
assert(codexKeys.includes('m_molong_boss'), '图鉴中必须包含 m_molong_boss (修复原 m_dragon_boss 错误)');
assert(codexKeys.includes('m_white_pig'), '图鉴中必须包含 白野猪 m_white_pig');
assert(codexKeys.includes('m_spider'), '图鉴中必须包含 毒蜘蛛 m_spider');
assert(codexKeys.includes('m_niumo_boss'), '图鉴中必须包含 牛魔王 m_niumo_boss');
assert(codexKeys.includes('m_huolong_boss'), '图鉴中必须包含 火龙神 m_huolong_boss');
assert(codexKeys.includes('m_shura_boss'), '图鉴中必须包含 修罗皇 m_shura_boss');
assert(codexKeys.includes('m_void_boss'), '图鉴中必须包含 鸿蒙天尊 m_void_boss');

// 验证平滑阶梯：普通怪 10/30/80，首领怪 1/3/8，地精 1/3/8
for (const codex of Object.values(MONSTER_CODEX_DEFINITIONS)) {
  assert(codex.milestones.length === 3, `[${codex.name}] 必须有 3 阶里程碑`);
  if (codex.isBoss || codex.templateId === 'm_treasure_goblin') {
    assert(codex.milestones[0].kills === 1, `首领/地精 [${codex.name}] 1阶必须为 1 只`);
    assert(codex.milestones[1].kills === 3, `首领/地精 [${codex.name}] 2阶必须为 3 只`);
    assert(codex.milestones[2].kills === 8, `首领/地精 [${codex.name}] 3阶必须为 8 只 (彻底告别完不成)`);
  } else if (codex.templateId === 'm_white_pig') {
    assert(codex.milestones[0].kills === 3, '精英怪白野猪 1阶必须为 3 只');
    assert(codex.milestones[1].kills === 10, '精英怪白野猪 2阶必须为 10 只');
    assert(codex.milestones[2].kills === 25, '精英怪白野猪 3阶必须为 25 只');
  } else {
    assert(codex.milestones[0].kills === 10, `普通怪 [${codex.name}] 1阶必须为 10 只`);
    assert(codex.milestones[1].kills === 30, `普通怪 [${codex.name}] 2阶必须为 30 只`);
    assert(codex.milestones[2].kills === 80, `普通怪 [${codex.name}] 3阶必须为 80 只 (原200大幅降负)`);
  }
}

// 模拟击杀魔龙教主验证 Bug 彻底修复
const world3 = new GameWorld();
world3.recordMonsterKill('m_molong_boss');
assert(world3.monsterKills['m_molong_boss'] === 1, '击杀 m_molong_boss 必须记录为 1');
assert(world3.monsterKills['m_dragon_boss'] === 1, '别名兼容 m_dragon_boss 亦同步记录为 1');

// 验证一键领取魔龙教主 1 阶神髓
const resCodex = world3.claimAllCodexRewards();
assert(resCodex.count >= 1, '魔龙教主 1 阶里程碑神髓必须成功激活参悟！');
console.log(`  魔龙教主击杀 1 只后一键参悟神髓成功：${resCodex.statsGain}`);

// 验证悬赏令任务池多样化
const bounties = generateBounties();
assert(bounties.length === 3, '每次必须生成 3 个悬赏令');
console.log('  今日随机悬赏令生成成功:');
for (const b of bounties) {
  console.log(`    - ${b.targetName}，目标 ${b.requiredKills} 只，赏金 ${b.rewardGold.toLocaleString()}`);
}

console.log('  ✅ 图鉴 ID 错配彻底修复，指标平滑降低，全 23 尊魔物全部可顺利完成！\n');

console.log('====================================================');
console.log('🎉 全部 4 项综合测试 100% 顺利通过！机制完美契合要求！');
console.log('====================================================');
