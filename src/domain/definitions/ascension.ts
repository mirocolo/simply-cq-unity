export interface AscensionDef {
  tier: number; // 1 ~ 9
  requiredLevel: number;
  title: string;
  mapName: string;
  statMultiplier: number; // 基础全属性提升比例
  luckBonus: number; // 累加永久幸运
  damageMultRatio: number; // 稀有倍攻乘数 (0.15 = +15%)
  defenseIgnoreRate: number; // 破甲无视防御率
  phantomExtraHits: number; // 额外残影段数
  lifestealBonus: number; // 额外吸血率
  critRateBonus: number; // 额外暴击率
  critMultBonus: number; // 额外暴击伤害
  desc: string;
  awakenedSkillId?: string;
  awakenedSkillName?: string;
  awakenedSkillDesc?: string;
}

export const ASCENSION_DEFINITIONS: Record<number, AscensionDef> = {
  1: {
    tier: 1,
    requiredLevel: 25,
    title: '筑基·修罗武者',
    mapName: '【一阶·修罗古洞】',
    statMultiplier: 0.20,
    luckBonus: 1, // 永久幸运 +1 (开启运9之路)
    damageMultRatio: 0,
    defenseIgnoreRate: 0,
    phantomExtraHits: 0,
    lifestealBonus: 0.01,
    critRateBonus: 0.03,
    critMultBonus: 0.10,
    desc: '突破凡胎肉身，气血翻涌！永久获得幸运+1，普攻觉醒扇形顺劈剑气！',
    awakenedSkillId: 'basic_slash',
    awakenedSkillName: '神威无影斩',
    awakenedSkillDesc: '普攻附带弧形灵力剑气，每次出刀自然顺劈身前周围怪物！'
  },
  2: {
    tier: 2,
    requiredLevel: 32,
    title: '金丹·破阵霸主',
    mapName: '【二阶·封魔殿堂】',
    statMultiplier: 0.40,
    luckBonus: 0,
    damageMultRatio: 0,
    defenseIgnoreRate: 0.15, // 破防 15%
    phantomExtraHits: 0,
    lifestealBonus: 0.01,
    critRateBonus: 0.05,
    critMultBonus: 0.20,
    desc: '金丹初成，刀罡破阵！获得 15% 物理破甲，攻杀剑术觉醒附带重伤撕裂！',
    awakenedSkillId: 'power_slash',
    awakenedSkillName: '破天裂地斩',
    awakenedSkillDesc: '强力破甲重击，降低目标 40% 防御并附加 5 秒重伤流血！'
  },
  3: {
    tier: 3,
    requiredLevel: 38,
    title: '元婴·通天战尊',
    mapName: '【三阶·沃玛魔窟】',
    statMultiplier: 0.65,
    luckBonus: 0,
    damageMultRatio: 0.15, // 首次解锁倍攻 +15%
    defenseIgnoreRate: 0.25,
    phantomExtraHits: 0,
    lifestealBonus: 0.02,
    critRateBonus: 0.08,
    critMultBonus: 0.30,
    desc: '元婴凝结，神力贯体！首次解锁稀有【倍攻 +15%】，刺杀剑术隔位必暴击！',
    awakenedSkillId: 'assassinate',
    awakenedSkillName: '幽冥绝影刺',
    awakenedSkillDesc: '隔位刺杀必定暴击，剑气穿透延长至 2 格无视护甲防御！'
  },
  4: {
    tier: 4,
    requiredLevel: 44,
    title: '化神·灭世修罗',
    mapName: '【四阶·赤月老巢】',
    statMultiplier: 0.90,
    luckBonus: 0,
    damageMultRatio: 0.25, // 倍攻 +25%
    defenseIgnoreRate: 0.35,
    phantomExtraHits: 0,
    lifestealBonus: 0.02,
    critRateBonus: 0.10,
    critMultBonus: 0.40,
    desc: '修罗现世，血海滔天！倍攻提升至 +25%，护体神盾觉醒太虚罡气！',
    awakenedSkillId: 'shield_aegis',
    awakenedSkillName: '太虚混元罡气',
    awakenedSkillDesc: '减伤提升至 55%，反震提升至 60%，每秒释放金色反震神圣波！'
  },
  5: {
    tier: 5,
    requiredLevel: 50,
    title: '合道·乾坤天尊',
    mapName: '【五阶·苍月秘境】',
    statMultiplier: 1.20,
    luckBonus: 2, // 累加幸运 +2 (总 Luck 达 3+)
    damageMultRatio: 0.35, // 倍攻 +35%
    defenseIgnoreRate: 0.45,
    phantomExtraHits: 0,
    lifestealBonus: 0.03,
    critRateBonus: 0.12,
    critMultBonus: 0.50,
    desc: '乾坤合道，天道眷顾！额外永久幸运+2（直奔运9），开天斩觉醒 5 格贯穿震慑！',
    awakenedSkillId: 'heaven_splitter',
    awakenedSkillName: '混沌鸿蒙辟地',
    awakenedSkillDesc: '开天巨刃暴增至 5 格直线贯穿，强行击退怪物并造成击晕！'
  },
  6: {
    tier: 6,
    requiredLevel: 55,
    title: '地仙·九霄战狂',
    mapName: '【六阶·牛魔神庙】',
    statMultiplier: 1.60,
    luckBonus: 0,
    damageMultRatio: 0.45, // 倍攻 +45%
    defenseIgnoreRate: 0.55,
    phantomExtraHits: 1, // 额外残影段数 +1！
    lifestealBonus: 0.03,
    critRateBonus: 0.15,
    critMultBonus: 0.60,
    desc: '地仙飞升，残影如雷！风雷残影连击多追加 1 段！烈火剑法觉醒传说【双烈火】！',
    awakenedSkillId: 'fire_slash',
    awakenedSkillName: '九幽双重真火',
    awakenedSkillDesc: '一刀斩出两道连续爆裂真火（双烈火），并在地面留下持续燃烧的火海！'
  },
  7: {
    tier: 7,
    requiredLevel: 60,
    title: '玄仙·焚天圣皇',
    mapName: '【七阶·火龙魔窟】',
    statMultiplier: 2.10,
    luckBonus: 0,
    damageMultRatio: 0.60, // 倍攻 +60%
    defenseIgnoreRate: 0.70,
    phantomExtraHits: 1,
    lifestealBonus: 0.04,
    critRateBonus: 0.18,
    critMultBonus: 0.70,
    desc: '焚天圣皇，傲视寰宇！倍攻狂飙至 +60%，逐日剑法觉醒十阳灭天极光！',
    awakenedSkillId: 'sun_slash',
    awakenedSkillName: '十阳连珠·逐日灭天',
    awakenedSkillDesc: '烈阳贯穿全屏，残影追击由 2 段暴增至 4 段，瞬间五重斩灭世！'
  },
  8: {
    tier: 8,
    requiredLevel: 65,
    title: '金仙·万劫至尊',
    mapName: '【八阶·修罗神殿】',
    statMultiplier: 2.70,
    luckBonus: 3, // 累加幸运 +3 (天然运6+)
    damageMultRatio: 0.80, // 倍攻 +80%
    defenseIgnoreRate: 0.85,
    phantomExtraHits: 2,
    lifestealBonus: 0.05,
    critRateBonus: 0.20,
    critMultBonus: 0.80,
    desc: '万劫不灭，金仙永存！倍攻提升至 +80%，全技能冷却缩减 20%，永久幸运+3！'
  },
  9: {
    tier: 9,
    requiredLevel: 70,
    title: '混元·无极天帝',
    mapName: '【九阶·鸿蒙仙境】',
    statMultiplier: 3.50,
    luckBonus: 3,
    damageMultRatio: 1.00, // 终极双倍伤害 (+100% 倍攻)
    defenseIgnoreRate: 1.00, // 100% 真实无视防御
    phantomExtraHits: 2,
    lifestealBonus: 0.06,
    critRateBonus: 0.25,
    critMultBonus: 1.00,
    desc: '至高混元天帝！终极【倍攻 +100%】伤害翻倍，100% 真实无视一切防御护甲！'
  }
};
