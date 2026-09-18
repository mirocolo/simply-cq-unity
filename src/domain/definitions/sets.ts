export interface SetBonus {
  count: number; // 需要激活的件数 (2, 4, 6)
  desc: string;
  dcMult?: number; // 基础物攻乘数加成
  acMult?: number; // 基础防御乘数加成
  hpMult?: number; // 生命上限乘数加成
  critRate?: number; // 暴击率加成
  lifestealRate?: number; // 额外生命吸血
  dodgeRate?: number; // 物理闪避率
  damageMultRatio?: number; // 额外倍攻独立乘数
  hasteBonus?: number; // 急速加成
  skillDamageBonus?: { skillId: string; bonusRatio: number }; // 技能专属增强
}

export interface SetDef {
  id: string;
  name: string;
  color: string;
  bonuses: SetBonus[];
}

export const SET_DEFINITIONS: Record<string, SetDef> = {
  'wooma': {
    id: 'wooma',
    name: '沃玛幽冥套',
    color: '#38bdf8',
    bonuses: [
      {
        count: 2,
        desc: '攻击力 +12%，生命吸血 +2%',
        dcMult: 0.12,
        lifestealRate: 0.02
      },
      {
        count: 4,
        desc: '物理闪避 +10%，受到攻击 20% 几率减伤 30%',
        dodgeRate: 0.10,
        hpMult: 0.15
      }
    ]
  },
  'zuma': {
    id: 'zuma',
    name: '祖玛龙魂套',
    color: '#a855f7',
    bonuses: [
      {
        count: 2,
        desc: '攻击力 +20%，暴击率 +8%',
        dcMult: 0.20,
        critRate: 0.08
      },
      {
        count: 4,
        desc: '【攻杀】与【刺杀】伤害大幅增强 40%',
        dcMult: 0.15,
        skillDamageBonus: { skillId: 'assassinate', bonusRatio: 0.40 }
      }
    ]
  },
  'shengzhan': {
    id: 'shengzhan',
    name: '圣战至尊套',
    color: '#f59e0b',
    bonuses: [
      {
        count: 2,
        desc: '攻击力 +25%，物理吸血 +3%',
        dcMult: 0.25,
        lifestealRate: 0.03
      },
      {
        count: 4,
        desc: '【烈火剑法】与【开天斩】伤害增强 50%',
        damageMultRatio: 0.10,
        skillDamageBonus: { skillId: 'fire_slash', bonusRatio: 0.50 }
      },
      {
        count: 6,
        desc: '激活【战神附体】：倍攻 +15%，急速 +25',
        damageMultRatio: 0.15,
        hasteBonus: 25
      }
    ]
  },
  'leiting': {
    id: 'leiting',
    name: '雷霆灭世套',
    color: '#eab308',
    bonuses: [
      {
        count: 2,
        desc: '攻击力 +35%，生命上限 +25%',
        dcMult: 0.35,
        hpMult: 0.25
      },
      {
        count: 4,
        desc: '稀有倍攻 +20%，暴击率 +15%',
        damageMultRatio: 0.20,
        critRate: 0.15
      },
      {
        count: 6,
        desc: '雷霆神威：【逐日剑法】伤害翻倍 (+100%)',
        damageMultRatio: 0.20,
        skillDamageBonus: { skillId: 'sun_slash', bonusRatio: 1.00 }
      }
    ]
  },
  'zhanshen': {
    id: 'zhanshen',
    name: '战神诛仙套',
    color: '#ef4444',
    bonuses: [
      {
        count: 2,
        desc: '攻击力 +50%，物理吸血 +5%',
        dcMult: 0.50,
        lifestealRate: 0.05
      },
      {
        count: 4,
        desc: '稀有倍攻 +30%，无视目标 30% 护甲',
        damageMultRatio: 0.30
      },
      {
        count: 6,
        desc: '诛仙剑阵：最终伤害 +30%，攻击触发双重烈焰冲击',
        damageMultRatio: 0.30,
        hasteBonus: 35
      }
    ]
  },
  'hongmeng': {
    id: 'hongmeng',
    name: '鸿蒙逆天套',
    color: '#ec4899',
    bonuses: [
      {
        count: 2,
        desc: '全属性 +80%，终极倍攻 +30%',
        dcMult: 0.80,
        damageMultRatio: 0.30
      },
      {
        count: 4,
        desc: '逆天神威：倍攻 +50%，100% 必定暴击',
        damageMultRatio: 0.50,
        critRate: 1.00
      },
      {
        count: 6,
        desc: '无极主宰：刀刀发挥极限攻击，神圣无视一切防御',
        damageMultRatio: 0.50,
        lifestealRate: 0.10
      }
    ]
  }
};
