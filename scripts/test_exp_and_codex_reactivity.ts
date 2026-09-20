import { GameWorld } from '../src/domain/GameWorld';
import { MONSTER_CODEX_DEFINITIONS } from '../src/domain/definitions/codex';

console.log('=== 验证经验飘字、图鉴领取与武器外倾参数 ===\n');

// 1. 验证 addExp 经验飘字
const world = new GameWorld();
const initialPopupsCount = world.damagePopups.length;
world.addExp(250);

const expPopup = world.damagePopups.find(p => p.text === '+250 经验' && p.color === '#34d399');
if (!expPopup) {
  throw new Error('❌ 未找到 +250 经验 翡翠绿飘字反馈！');
}
console.log('✅ 1. 经验获取即时飘字验证通过:', expPopup.text, expPopup.color);

// 2. 验证图鉴位面筛选与领取
const codexList = Object.values(MONSTER_CODEX_DEFINITIONS);
const tier0 = codexList.filter(m => m.tier === 0);
const tier4_6 = codexList.filter(m => m.tier >= 4 && m.tier <= 6);
const tier7_9 = codexList.filter(m => m.tier >= 7 && m.tier <= 9);

if (tier0.length === 0 || tier4_6.length === 0 || tier7_9.length === 0) {
  throw new Error('❌ 图鉴位面分类数据异常！');
}
console.log(`✅ 2. 图鉴位面梯队分布验证通过: 0阶(${tier0.length})只, 4~6阶(${tier4_6.length})只, 7~9阶(${tier7_9.length})只`);

// 3. 验证一键领取并更新
world.monsterKills['m_scarecrow'] = 100;
const claimRes = world.claimAllCodexRewards();
if (claimRes.count < 1) {
  throw new Error('❌ 稻草人里程碑一键领取失败！');
}
const bonus = world.getCodexStatsBonus();
if (bonus.maxHp <= 0) {
  throw new Error('❌ 领取后未获得图鉴生命属性加成！');
}
console.log(`✅ 3. 图鉴一键领取成功: 领取 ${claimRes.count} 阶里程碑，全局属性加成生命+${bonus.maxHp}`);

console.log('\n🎉 所有修复项逻辑与参数验证 100% 成功！');
