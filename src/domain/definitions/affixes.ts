import { AffixDef, MonsterAffixType } from '../../types/affix';

export const AFFIX_DEFINITIONS: Record<MonsterAffixType, AffixDef> = {
  berserk: {
    type: 'berserk',
    name: '狂暴',
    title: '【狂暴迅捷】',
    desc: '攻速大幅飙升 +50%，移速 +30%，攻击力提升 25%',
    auraColor: '#ef4444',
    dcMult: 0.25,
    hasteBonus: 50,
    speedBonus: 0.12
  },
  thorns: {
    type: 'thorns',
    name: '反伤',
    title: '【荆棘反伤】',
    desc: '受击向攻击者反弹 25% 的真实伤害',
    auraColor: '#10b981',
    thornsRate: 0.25
  },
  frost: {
    type: 'frost',
    name: '冰霜',
    title: '【极寒冰霜】',
    desc: '击中目标使其陷入刺骨冰霜，攻速与移速降低 35%',
    auraColor: '#38bdf8'
  },
  shielded: {
    type: 'shielded',
    name: '金身',
    title: '【神圣金身】',
    desc: '开局自带相当于生命上限 30% 的神圣玄金护盾',
    auraColor: '#facc15'
  },
  vampiric: {
    type: 'vampiric',
    name: '嗜血',
    title: '【嗜血撕咬】',
    desc: '造成伤害的 35% 转化为自身血量回复',
    auraColor: '#dc2626',
    lifestealRate: 0.35
  },
  teleport: {
    type: 'teleport',
    name: '闪烁',
    title: '【虚空闪烁】',
    desc: '生命低于 50% 时随机虚空瞬移拉开距离并清除负面',
    auraColor: '#a855f7'
  },
  treasure_goblin: {
    type: 'treasure_goblin',
    name: '盗宝',
    title: '【盗宝地精】',
    desc: '乱窜逃跑不还手，被打狂爆金币与大药水，击杀大爆强化矿石与神装！',
    auraColor: '#f59e0b',
    speedBonus: 0.18
  }
};

export const MUTABLE_AFFIX_TYPES: MonsterAffixType[] = [
  'berserk',
  'thorns',
  'frost',
  'shielded',
  'vampiric',
  'teleport'
];
