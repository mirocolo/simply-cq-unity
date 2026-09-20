import { SkillDef } from '../../types/game';

// 参考 Crystal / Mir2 经典战士技能
export const SKILL_DEFINITIONS: Record<string, SkillDef> = {
  'basic_slash': {
    id: 'basic_slash',
    name: '基础剑法',
    icon: '🗡️',
    desc: '被动提升物理命中与普攻伤害。随等级提高普攻伤害倍率。',
    level: 1,
    proficiency: 0,
    maxProficiency: 100,
    damageMult: 1.0,
    cdTicks: 0,
    manaCost: 0,
    unlockLevel: 1,
    currentCdTicks: 0
  },
  'power_slash': {
    id: 'power_slash',
    name: '攻杀剑术',
    icon: '⚡',
    desc: '凝聚真气挥砍，造成 2.2x 暴击伤害并附带深度破甲。',
    level: 1,
    proficiency: 0,
    maxProficiency: 150,
    damageMult: 2.2,
    cdTicks: 25, // 2.5秒冷却
    manaCost: 8,
    unlockLevel: 3,
    currentCdTicks: 0
  },
  'assassinate': {
    id: 'assassinate',
    name: '刺杀剑术',
    icon: '🗡️',
    desc: '剑气如刃，隔位穿透敌方防御，造成 2.8x 伤害且直接无视目标 45% 护甲！',
    level: 1,
    proficiency: 0,
    maxProficiency: 220,
    damageMult: 2.8,
    cdTicks: 35, // 3.5秒冷却
    manaCost: 15,
    unlockLevel: 8,
    currentCdTicks: 0
  },
  'shield_aegis': {
    id: 'shield_aegis',
    name: '护体神盾',
    icon: '🛡️',
    desc: '【常驻被动】常驻减免 15% 伤害，常驻罡气护盾(15%最大HP)，每秒回蓝 2.5%，受击恢复 25 MP。\n【主动过载】玄金罡气完全爆发，5秒内伤害减免提升至 45%，并反震 30% 伤害！',
    level: 1,
    proficiency: 0,
    maxProficiency: 200,
    damageMult: 1.0,
    cdTicks: 100, // 10.0秒冷却
    manaCost: 25,
    unlockLevel: 15,
    currentCdTicks: 0
  },
  'fire_slash': {
    id: 'fire_slash',
    name: '烈火剑法',
    icon: '🔥',
    desc: '召唤烈焰附着神兵，毁灭性爆发出 4.2x 极限烈火物理伤害！',
    level: 1,
    proficiency: 0,
    maxProficiency: 300,
    damageMult: 4.2,
    cdTicks: 60, // 6.0秒大招
    manaCost: 45,
    unlockLevel: 28,
    currentCdTicks: 0
  },
  'heaven_splitter': {
    id: 'heaven_splitter',
    name: '开天斩',
    icon: '🌟',
    desc: '凝聚万钧天地之力化为开天巨刃重劈，造成 3.8x 直线范围重斩，无视 55% 护甲并附带击退！',
    level: 1,
    proficiency: 0,
    maxProficiency: 320,
    damageMult: 3.8,
    cdTicks: 45, // 4.5秒冷却
    manaCost: 35,
    unlockLevel: 22,
    currentCdTicks: 0
  },
  'sun_slash': {
    id: 'sun_slash',
    name: '逐日剑法',
    icon: '☀️',
    desc: '战士终极必杀！化作烈阳极光贯穿全线，造成 5.5x 毁灭伤害，必定暴击并 100% 触发双重残影连击！',
    level: 1,
    proficiency: 0,
    maxProficiency: 450,
    damageMult: 5.5,
    cdTicks: 80, // 8.0秒终极神技
    manaCost: 60,
    unlockLevel: 35,
    currentCdTicks: 0
  }
};
