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
    desc: '凝聚真气挥砍，造成高额暴击伤害并附带破甲。',
    level: 1,
    proficiency: 0,
    maxProficiency: 150,
    damageMult: 1.6,
    cdTicks: 25, // 2.5秒冷却
    manaCost: 8,
    unlockLevel: 3,
    currentCdTicks: 0
  },
  'assassinate': {
    id: 'assassinate',
    name: '刺杀剑术',
    icon: '🗡️',
    desc: '剑气如刃，隔位穿透敌方防御，无视目标护甲！',
    level: 1,
    proficiency: 0,
    maxProficiency: 220,
    damageMult: 2.0,
    cdTicks: 35, // 3.5秒冷却
    manaCost: 15,
    unlockLevel: 8,
    currentCdTicks: 0
  },
  'shield_aegis': {
    id: 'shield_aegis',
    name: '护体神盾',
    icon: '🛡️',
    desc: '凝聚玄金罡气护体，5秒内受到的所有伤害大幅减免 40%，并将 25% 伤害反震攻击者！',
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
    desc: '召唤烈焰附着神兵，毁灭性爆发出超高倍率物理烈火伤害！',
    level: 1,
    proficiency: 0,
    maxProficiency: 300,
    damageMult: 2.8,
    cdTicks: 60, // 6.0秒大招
    manaCost: 45,
    unlockLevel: 28,
    currentCdTicks: 0
  },
  'heaven_splitter': {
    id: 'heaven_splitter',
    name: '开天斩',
    icon: '🌟',
    desc: '凝聚万钧天地之力化为开天金芒巨刃重劈，直线上造成大范围重斩并附带击退！',
    level: 1,
    proficiency: 0,
    maxProficiency: 320,
    damageMult: 2.6,
    cdTicks: 45, // 4.5秒冷却
    manaCost: 35,
    unlockLevel: 22,
    currentCdTicks: 0
  },
  'sun_slash': {
    id: 'sun_slash',
    name: '逐日剑法',
    icon: '☀️',
    desc: '战士终极必杀！化作烈阳极光贯穿全线，造成 3.8x 毁灭伤害，必定暴击并 100% 触发双重残影连击！',
    level: 1,
    proficiency: 0,
    maxProficiency: 450,
    damageMult: 3.8,
    cdTicks: 80, // 8.0秒终极神技
    manaCost: 60,
    unlockLevel: 35,
    currentCdTicks: 0
  }
};
