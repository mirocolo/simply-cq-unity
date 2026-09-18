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
    manaCost: 15,
    unlockLevel: 7,
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
    cdTicks: 40, // 4.0秒冷却
    manaCost: 30,
    unlockLevel: 19,
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
    cdTicks: 70, // 7.0秒大招
    manaCost: 65,
    unlockLevel: 35,
    currentCdTicks: 0
  }
};
