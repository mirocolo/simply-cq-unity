import { ArchetypeRating, TalentBranchId, TalentNodeDef } from '../../types/talent';

export const TALENT_DEFINITIONS: Record<string, TalentNodeDef> = {
  // === 1. 狂暴血战流 (Berserker) ===
  't_blood_thirst': {
    id: 't_blood_thirst',
    branch: 'berserker',
    name: '嗜血天性',
    tier: 1,
    maxRank: 5,
    icon: '🩸',
    desc: '淬炼修罗嗜血之魂，每次普通攻击与残影连击吸收伤害转化为自身生命。',
    reqBranchPoints: 0,
    statsPerRank: {
      lifestealRate: 0.02 // 每级 +2% 吸血，满级 +10%
    }
  },
  't_frenzy_haste': {
    id: 't_frenzy_haste',
    branch: 'berserker',
    name: '迅捷狂暴',
    tier: 2,
    maxRank: 5,
    icon: '⚡',
    desc: '狂怒催发肌肉极限，大幅提升出刀攻速与风雷残影连击转化率。',
    reqBranchPoints: 4,
    statsPerRank: {
      haste: 8 // 每级 +8 攻速，满级 +40 攻速
    }
  },
  't_blood_rage': {
    id: 't_blood_rage',
    branch: 'berserker',
    name: '修罗杀意',
    tier: 3,
    maxRank: 5,
    icon: '⚔️',
    desc: '战意凌霄，全面增幅自身最小与最大物理攻击力。',
    reqBranchPoints: 9,
    statsPerRank: {
      dcPercent: 0.08, // 每级 +8% 攻击力，满级 +40%
      minDC: 10,
      maxDC: 20
    }
  },
  't_undying_rage': {
    id: 't_undying_rage',
    branch: 'berserker',
    name: '不屈血怒',
    tier: 4,
    maxRank: 1,
    icon: '🔥',
    desc: '【流派神技】生命值每降低 10%，额外提升 4% 独立全局倍攻(至多 +36% 倍攻)！',
    reqBranchPoints: 14,
    statsPerRank: {
      damageMultRatio: 0.15
    },
    specialEffect: 'undying_rage'
  },
  't_phantom_mastery': {
    id: 't_phantom_mastery',
    branch: 'berserker',
    name: '万剑残影·极境',
    tier: 4,
    maxRank: 1,
    icon: '🌪️',
    desc: '【流派终极】风雷残影连斩额外追加 1 次追击！且残影伤害由 70% 提升至 100% 满额！',
    reqBranchPoints: 16,
    statsPerRank: {
      haste: 15
    },
    specialEffect: 'phantom_mastery'
  },

  // === 2. 烈火核爆流 (Fire Burst) ===
  't_deadly_crit': {
    id: 't_deadly_crit',
    branch: 'fire_burst',
    name: '绝命暴击',
    tier: 1,
    maxRank: 5,
    icon: '🎯',
    desc: '洞悉敌人死穴，精准打击要害，大幅提升全技能与普攻暴击几率。',
    reqBranchPoints: 0,
    statsPerRank: {
      critRate: 0.04 // 每级 +4% 暴击率，满级 +20%
    }
  },
  't_fire_amplification': {
    id: 't_fire_amplification',
    branch: 'fire_burst',
    name: '焚天暴伤',
    tier: 2,
    maxRank: 5,
    icon: '💥',
    desc: '引动九幽真火附魔兵刃，触发暴击时造成毁天灭地的乘倍暴击伤害！',
    reqBranchPoints: 4,
    statsPerRank: {
      critMult: 0.20 // 每级 +20% 暴击倍率，满级 +100%
    }
  },
  't_sunder_armor': {
    id: 't_sunder_armor',
    branch: 'fire_burst',
    name: '太虚破甲',
    tier: 3,
    maxRank: 5,
    icon: '🗡️',
    desc: '锋芒无匹，剑意穿透目标护甲，无视敌方百分比护甲防御。',
    reqBranchPoints: 9,
    statsPerRank: {
      defenseIgnoreRate: 0.08 // 每级 +8% 破甲，满级 +40%
    }
  },
  't_fire_mastery': {
    id: 't_fire_mastery',
    branch: 'fire_burst',
    name: '九阳真火',
    tier: 4,
    maxRank: 1,
    icon: '☀️',
    desc: '【流派神技】烈火剑法与逐日剑法伤害基础倍率额外提升 40%！',
    reqBranchPoints: 14,
    statsPerRank: {
      damageMultRatio: 0.15
    },
    specialEffect: 'fire_mastery'
  },
  't_nuclear_slash': {
    id: 't_nuclear_slash',
    branch: 'fire_burst',
    name: '天地同寿·核爆',
    tier: 4,
    maxRank: 1,
    icon: '☄️',
    desc: '【流派终极】烈火剑法与逐日剑法冷却时间缩短 30%！核爆出刀势不可挡！',
    reqBranchPoints: 16,
    statsPerRank: {
      critRate: 0.05,
      critMult: 0.40
    },
    specialEffect: 'nuclear_slash'
  },

  // === 3. 金刚反伤流 (Diamond Counter) ===
  't_iron_skin': {
    id: 't_iron_skin',
    branch: 'diamond_counter',
    name: '玄武气血',
    tier: 1,
    maxRank: 5,
    icon: '🛡️',
    desc: '修炼太古锻体真经，大幅提升气血生命上限，如深海渊渟岳峙。',
    reqBranchPoints: 0,
    statsPerRank: {
      maxHpPercent: 0.08, // 每级 +8% 生命上限，满级 +40%
      flatHp: 200
    }
  },
  't_diamond_armor': {
    id: 't_diamond_armor',
    branch: 'diamond_counter',
    name: '金刚不坏',
    tier: 2,
    maxRank: 5,
    icon: '🧱',
    desc: '肌骨化为玄金晶壁，大幅增强最小与最大物理防御力。',
    reqBranchPoints: 4,
    statsPerRank: {
      acPercent: 0.12, // 每级 +12% 防御，满级 +60%
      minAC: 8,
      maxAC: 16
    }
  },
  't_thorns_spikes': {
    id: 't_thorns_spikes',
    branch: 'diamond_counter',
    name: '荆棘龙鳞',
    tier: 3,
    maxRank: 5,
    icon: '🌵',
    desc: '龙鳞倒竖，受到任何怪物或首领打击时，向攻击者反震巨额真实伤害！',
    reqBranchPoints: 9,
    statsPerRank: {
      thornsRate: 0.10 // 每级 +10% 反伤，满级 +50% 反伤
    }
  },
  't_aegis_mastery': {
    id: 't_aegis_mastery',
    branch: 'diamond_counter',
    name: '太虚混元圣盾',
    tier: 4,
    maxRank: 1,
    icon: '✨',
    desc: '【流派神技】护体神盾持续时间延长 50%，反弹比例提升至 80%！',
    reqBranchPoints: 14,
    statsPerRank: {
      acPercent: 0.20
    },
    specialEffect: 'aegis_mastery'
  },
  't_vajra_domain': {
    id: 't_vajra_domain',
    branch: 'diamond_counter',
    name: '不动明王印',
    tier: 4,
    maxRank: 1,
    icon: '☸️',
    desc: '【流派终极】反弹伤害转化为对身周所有敌人的神圣冲击，反震敌人必定造成硬直！',
    reqBranchPoints: 16,
    statsPerRank: {
      thornsRate: 0.15,
      maxHpPercent: 0.15
    },
    specialEffect: 'vajra_domain'
  }
};

/**
 * 获取三大分支的所有天赋列表
 */
export function getTalentsByBranch(branch: TalentBranchId): TalentNodeDef[] {
  return Object.values(TALENT_DEFINITIONS)
    .filter(t => t.branch === branch)
    .sort((a, b) => a.tier - b.tier);
}

/**
 * 评估当前玩家加点的流派归属与六维雷达图得分 (0~100)
 */
export function getArchetypeRating(allocations: Record<string, number>): ArchetypeRating {
  let bPts = 0;
  let fPts = 0;
  let dPts = 0;

  for (const [id, rank] of Object.entries(allocations)) {
    if (!rank || rank <= 0) continue;
    const def = TALENT_DEFINITIONS[id];
    if (!def) continue;
    if (def.branch === 'berserker') bPts += rank;
    else if (def.branch === 'fire_burst') fPts += rank;
    else if (def.branch === 'diamond_counter') dPts += rank;
  }

  const total = bPts + fPts + dPts;

  // 六维基础得分计算 (基准 25 分，加点赋能提升)
  const attack = Math.min(100, Math.floor(25 + fPts * 3.8 + bPts * 2.0));
  const survivability = Math.min(100, Math.floor(25 + dPts * 4.2 + bPts * 1.5));
  const haste = Math.min(100, Math.floor(20 + bPts * 4.5));
  const crit = Math.min(100, Math.floor(20 + fPts * 4.8));
  const sustain = Math.min(100, Math.floor(20 + bPts * 4.2 + dPts * 1.5));
  const counter = Math.min(100, Math.floor(15 + dPts * 5.2));

  // 流派判定
  if (bPts >= 12 && bPts >= fPts * 1.3 && bPts >= dPts * 1.3) {
    return {
      title: '狂暴修罗战神',
      branch: 'berserker',
      color: '#dc2626',
      desc: '血煞如海，刀刀见影！极限攻速与浴血反扑，生命越低战意越盛的战场狂魔！',
      scores: { attack, survivability, haste, crit, sustain, counter }
    };
  }

  if (fPts >= 12 && fPts >= bPts * 1.3 && fPts >= dPts * 1.3) {
    return {
      title: '九幽焚天剑圣',
      branch: 'fire_burst',
      color: '#f97316',
      desc: '烈火破军，太虚崩灭！追求极致刀刀致命与极限破甲的一击必杀核爆巨擘！',
      scores: { attack, survivability, haste, crit, sustain, counter }
    };
  }

  if (dPts >= 12 && dPts >= bPts * 1.3 && dPts >= fPts * 1.3) {
    return {
      title: '不动金刚圣尊',
      branch: 'diamond_counter',
      color: '#eab308',
      desc: '气吞山河，金刚不败！巍峨气血坚逾精钢，敌狂任他狂，受击反震天崩地裂！',
      scores: { attack, survivability, haste, crit, sustain, counter }
    };
  }

  return {
    title: total > 8 ? '混元万象大宗师' : '初窥门径武者',
    branch: 'balanced',
    color: '#38bdf8',
    desc: '兼容并包，三系合一！攻守兼备，游刃于刀锋与铁壁之间的均衡大道！',
    scores: { attack, survivability, haste, crit, sustain, counter }
  };
}
