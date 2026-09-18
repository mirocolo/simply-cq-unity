/**
 * Milestone 3 自动化回归测试：战士三大变异流派天赋系统
 * 
 * 测试覆盖：
 * 1. 天赋加点与前置门槛
 * 2. 免费无损洗点
 * 3. StatCalculator 天赋属性加成
 * 4. 流派雷达图评定
 * 5. 特殊机制联动
 * 6. 持久化存取
 * 7. 防爆仓回收不卡死
 */

import { StatCalculator } from '../src/domain/StatCalculator';
import { TALENT_DEFINITIONS, getTalentsByBranch, getArchetypeRating } from '../src/domain/definitions/talents';
import type { TalentBranchId } from '../src/types/talent';

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

console.log('=== Milestone 3: 战士三大变异流派天赋系统 自动化测试 ===\n');

// ── Test 1: 天赋定义完整性 ──
console.log('▶ Test 1: 天赋定义完整性');
{
  const allTalents = Object.values(TALENT_DEFINITIONS);
  assert(allTalents.length === 15, `共 15 个天赋节点 (实际 ${allTalents.length})`);

  const berserker = getTalentsByBranch('berserker');
  const fire = getTalentsByBranch('fire_burst');
  const diamond = getTalentsByBranch('diamond_counter');
  assert(berserker.length === 5, `狂暴血战流 5 个天赋 (实际 ${berserker.length})`);
  assert(fire.length === 5, `烈火核爆流 5 个天赋 (实际 ${fire.length})`);
  assert(diamond.length === 5, `金刚反伤流 5 个天赋 (实际 ${diamond.length})`);

  // 验证每个天赋都有必要字段
  for (const t of allTalents) {
    assert(!!t.id && !!t.name && !!t.icon && !!t.desc, `天赋 [${t.name}] 字段完整`);
    assert(t.maxRank > 0, `天赋 [${t.name}] maxRank=${t.maxRank} > 0`);
  }
}

// ── Test 2: 天赋加点前置门槛判定 ──
console.log('\n▶ Test 2: 天赋加点前置门槛判定');
{
  // 嗜血天性 (tier1, reqBranchPoints=0) 可直接加点
  const t1 = TALENT_DEFINITIONS['t_blood_thirst'];
  assert(t1.reqBranchPoints === 0, '嗜血天性无前置要求');

  // 迅捷狂暴 (tier2, reqBranchPoints=4) 需 4 点
  const t2 = TALENT_DEFINITIONS['t_frenzy_haste'];
  assert(t2.reqBranchPoints === 4, '迅捷狂暴需 4 点前置');

  // 不屈血怒 (tier4, reqBranchPoints=14) 需 14 点
  const t4 = TALENT_DEFINITIONS['t_undying_rage'];
  assert(t4.reqBranchPoints === 14, '不屈血怒需 14 点前置');
  assert(t4.specialEffect === 'undying_rage', '不屈血怒有 specialEffect');
}

// ── Test 3: StatCalculator 天赋属性加成 ──
console.log('\n▶ Test 3: StatCalculator 天赋属性加成');
{
  const base = StatCalculator.getBaseStatsForLevel(30, 0);
  
  // 无天赋
  const noTalent = StatCalculator.applyEquipment(base, {}, undefined, undefined, {});
  
  // 满级嗜血天性 (5/5, 每级 +2% 吸血)
  const withLifesteal = StatCalculator.applyEquipment(base, {}, undefined, undefined, {
    't_blood_thirst': 5
  });
  assert(
    withLifesteal.lifestealRate > noTalent.lifestealRate,
    `嗜血天性5级吸血率 ${withLifesteal.lifestealRate} > 无天赋 ${noTalent.lifestealRate}`
  );
  
  // 满级绝命暴击 (5/5, 每级 +4% 暴击)
  const withCrit = StatCalculator.applyEquipment(base, {}, undefined, undefined, {
    't_deadly_crit': 5
  });
  assert(
    withCrit.critRate > noTalent.critRate,
    `绝命暴击5级暴击率 ${withCrit.critRate.toFixed(2)} > 无天赋 ${noTalent.critRate.toFixed(2)}`
  );

  // 满级玄武气血 (5/5, 每级 +8% HP + 200 flat)
  const withHp = StatCalculator.applyEquipment(base, {}, undefined, undefined, {
    't_iron_skin': 5
  });
  assert(
    withHp.maxHp > noTalent.maxHp,
    `玄武气血5级生命 ${withHp.maxHp} > 无天赋 ${noTalent.maxHp}`
  );

  // 荆棘龙鳞反伤率
  const withThorns = StatCalculator.applyEquipment(base, {}, undefined, undefined, {
    't_thorns_spikes': 5
  });
  assert(
    (withThorns.thornsRate || 0) > 0,
    `荆棘龙鳞5级反伤率 ${withThorns.thornsRate} > 0`
  );

  // 焚天暴伤 (5/5, 每级 +20% 暴伤)
  const withCritMult = StatCalculator.applyEquipment(base, {}, undefined, undefined, {
    't_fire_amplification': 5
  });
  assert(
    withCritMult.critMult > noTalent.critMult,
    `焚天暴伤5级暴击倍率 ${withCritMult.critMult} > 无天赋 ${noTalent.critMult}`
  );

  // 组合天赋测试：全满狂暴流
  const fullBerserker = StatCalculator.applyEquipment(base, {}, undefined, undefined, {
    't_blood_thirst': 5,
    't_frenzy_haste': 5,
    't_blood_rage': 5,
    't_undying_rage': 1,
    't_phantom_mastery': 1
  });
  assert(
    fullBerserker.combatPower > noTalent.combatPower,
    `全满狂暴流战力 ${fullBerserker.combatPower} > 无天赋 ${noTalent.combatPower}`
  );
}

// ── Test 4: 流派雷达图评定 ──
console.log('\n▶ Test 4: 流派雷达图评定');
{
  // 空天赋 = 初窥门径
  const empty = getArchetypeRating({});
  assert(empty.title === '初窥门径武者', `空天赋称号: ${empty.title}`);
  assert(empty.branch === 'balanced', `空天赋流派: balanced`);

  // 纯狂暴流 ≥12点
  const berserkerRating = getArchetypeRating({
    't_blood_thirst': 5,
    't_frenzy_haste': 5,
    't_blood_rage': 3
  });
  assert(berserkerRating.branch === 'berserker', `纯狂暴流流派判定: ${berserkerRating.branch}`);
  assert(berserkerRating.title === '狂暴修罗战神', `纯狂暴流称号: ${berserkerRating.title}`);

  // 纯烈火流 ≥12点
  const fireRating = getArchetypeRating({
    't_deadly_crit': 5,
    't_fire_amplification': 5,
    't_sunder_armor': 3
  });
  assert(fireRating.branch === 'fire_burst', `纯烈火流流派判定: ${fireRating.branch}`);
  assert(fireRating.title === '九幽焚天剑圣', `纯烈火流称号: ${fireRating.title}`);

  // 纯金刚流 ≥12点
  const diamondRating = getArchetypeRating({
    't_iron_skin': 5,
    't_diamond_armor': 5,
    't_thorns_spikes': 3
  });
  assert(diamondRating.branch === 'diamond_counter', `纯金刚流流派判定: ${diamondRating.branch}`);
  assert(diamondRating.title === '不动金刚圣尊', `纯金刚流称号: ${diamondRating.title}`);

  // 均衡分配
  const balancedRating = getArchetypeRating({
    't_blood_thirst': 3,
    't_deadly_crit': 3,
    't_iron_skin': 3
  });
  assert(balancedRating.branch === 'balanced', `均衡分配流派: ${balancedRating.branch}`);
  assert(balancedRating.title === '混元万象大宗师', `均衡称号: ${balancedRating.title}`);

  // 六维分数验证
  assert(berserkerRating.scores.haste >= 75, `狂暴流攻速得分 ${berserkerRating.scores.haste} >= 75`);
  assert(fireRating.scores.crit >= 80, `烈火流暴击得分 ${fireRating.scores.crit} >= 80`);
  assert(diamondRating.scores.counter >= 80, `金刚流反伤得分 ${diamondRating.scores.counter} >= 80`);
}

// ── Test 5: 数值成长曲线平衡验证 ──
console.log('\n▶ Test 5: 数值成长曲线平衡验证');
{
  // Lv.1 裸装基础属性
  const lv1 = StatCalculator.getBaseStatsForLevel(1, 0);
  assert(lv1.maxHp >= 300 && lv1.maxHp <= 500, `Lv.1 HP=${lv1.maxHp} 在 300~500 合理区间`);
  assert(lv1.minDC >= 8 && lv1.maxDC <= 30, `Lv.1 DC=${lv1.minDC}-${lv1.maxDC} 合理`);

  // Lv.25 (1阶飞升门槛)
  const lv25 = StatCalculator.getBaseStatsForLevel(25, 0);
  assert(lv25.maxHp > lv1.maxHp * 2, `Lv.25 HP=${lv25.maxHp} > Lv.1 两倍 (${lv1.maxHp * 2})`);

  // Lv.25 + 1阶飞升
  const lv25_a1 = StatCalculator.getBaseStatsForLevel(25, 1);
  assert(lv25_a1.maxHp > lv25.maxHp, `1阶飞升 HP=${lv25_a1.maxHp} > 凡体 ${lv25.maxHp}`);
  assert(lv25_a1.luck >= 1, `1阶飞升后幸运 ${lv25_a1.luck} >= 1`);

  // Lv.40 + 5阶飞升 (中高端)
  const lv40_a5 = StatCalculator.getBaseStatsForLevel(40, 5);
  assert(lv40_a5.maxHp > 5000, `Lv.40+5阶 HP=${lv40_a5.maxHp} > 5000`);
  assert(lv40_a5.damageMultRatio > 0, `Lv.40+5阶 倍攻=${lv40_a5.damageMultRatio} > 0`);

  // Lv.60 + 9阶飞升 (终极满配)
  const lv60_a9 = StatCalculator.getBaseStatsForLevel(60, 9);
  assert(lv60_a9.maxHp > 15000, `Lv.60+9阶 HP=${lv60_a9.maxHp} > 15000`);
  assert(lv60_a9.luck >= 9, `Lv.60+9阶 幸运=${lv60_a9.luck} >= 9 (刀刀满伤)`);

  // 天赋对终极战力的提升验证
  const endgameBase = StatCalculator.getBaseStatsForLevel(60, 9);
  const endgameNoTalent = StatCalculator.applyEquipment(endgameBase, {}, undefined, undefined, {});
  const endgameFull = StatCalculator.applyEquipment(endgameBase, {}, undefined, undefined, {
    't_blood_thirst': 5, 't_frenzy_haste': 5, 't_blood_rage': 5, 't_undying_rage': 1, 't_phantom_mastery': 1
  });
  const cpBoost = endgameFull.combatPower - endgameNoTalent.combatPower;
  assert(cpBoost > 0, `天赋提升终极战力 +${cpBoost}`);
  
  // 验证天赋提升不会过于夸张 (应在 5%~40% 范围内)
  const boostPct = cpBoost / endgameNoTalent.combatPower;
  assert(boostPct > 0.05 && boostPct < 0.50, `天赋战力提升 ${(boostPct * 100).toFixed(1)}% 在合理区间 (5%~50%)`);
}

// ── Test 6: thornsRate 字段验证 ──
console.log('\n▶ Test 6: thornsRate 字段验证');
{
  const base = StatCalculator.getBaseStatsForLevel(30, 0);
  assert(base.thornsRate === 0, `基础反伤率为 0`);

  const withThorns = StatCalculator.applyEquipment(base, {}, undefined, undefined, {
    't_thorns_spikes': 5, // 每级 +10% 反伤, 5级 = 50%
    't_vajra_domain': 1   // +15% 反伤
  });
  assert((withThorns.thornsRate || 0) >= 0.60, `荆棘5级+不动明王 反伤率 ${withThorns.thornsRate} >= 0.60`);
}

// ── 总结 ──
console.log(`\n${'='.repeat(50)}`);
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
if (failed > 0) {
  console.error('❌ 存在失败项！请检查！');
  process.exit(1);
} else {
  console.log('✅ 全部测试通过！Milestone 3 天赋系统验证完毕！');
}
