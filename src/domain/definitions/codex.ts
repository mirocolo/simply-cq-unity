import { BountyTask, MonsterCodexDef } from '../../types/codex';

export const MONSTER_CODEX_DEFINITIONS: Record<string, MonsterCodexDef> = {
  // 0阶 比奇位面
  m_scarecrow: {
    templateId: 'm_scarecrow',
    name: '稻草人',
    title: '【草木皆兵】',
    tier: 0,
    isBoss: false,
    avatarIcon: '🌾',
    desc: '比奇荒原游荡的稻草魔物，受妖风侵染而成。',
    milestones: [
      { kills: 10, label: '初窥门径', maxHp: 50, minDC: 2, maxDC: 4 },
      { kills: 30, label: '秋风扫叶', maxHp: 120, minDC: 5, maxDC: 10 },
      { kills: 80, label: '斩草除根', maxHp: 300, minDC: 12, maxDC: 24, critRate: 0.01 }
    ]
  },
  m_cat: {
    templateId: 'm_cat',
    name: '钉耙猫',
    title: '【狸影狂爪】',
    tier: 0,
    isBoss: false,
    avatarIcon: '🐱',
    desc: '手持铁耙的直立猫妖，动作迅捷凶狠。',
    milestones: [
      { kills: 10, label: '狸奴无踪', minAC: 2, maxAC: 4, minDC: 3, maxDC: 6 },
      { kills: 30, label: '金爪裂石', minAC: 5, maxAC: 10, minDC: 8, maxDC: 16 },
      { kills: 80, label: '九命化煞', minAC: 12, maxAC: 24, minDC: 18, maxDC: 36, critRate: 0.01 }
    ]
  },
  m_spider: {
    templateId: 'm_spider',
    name: '毒蜘蛛',
    title: '【幽谷蛛网】',
    tier: 0,
    isBoss: false,
    avatarIcon: '🕷️',
    desc: '银杏谷幽林中的嗜毒斑斓巨蛛，吐丝缠敌并注入剧毒。',
    milestones: [
      { kills: 10, label: '破除蛛网', maxHp: 60, minDC: 3, maxDC: 5 },
      { kills: 30, label: '百毒不侵', maxHp: 150, minAC: 4, maxAC: 8, minDC: 6, maxDC: 12 },
      { kills: 80, label: '万毒噬心', maxHp: 350, minAC: 10, maxAC: 20, minDC: 15, maxDC: 30, critRate: 0.01 }
    ]
  },
  m_skeleton: {
    templateId: 'm_skeleton',
    name: '骷髅战士',
    title: '【枯骨生威】',
    tier: 0,
    isBoss: false,
    avatarIcon: '💀',
    desc: '常年埋于地底的白骨军卒，挥舞锈蚀铁斧。',
    milestones: [
      { kills: 10, label: '破骨断金', maxHp: 80, minAC: 3, maxAC: 6 },
      { kills: 30, label: '白骨如山', maxHp: 200, minAC: 8, maxAC: 16 },
      { kills: 80, label: '万劫不灭', maxHp: 500, minAC: 20, maxAC: 40, critRate: 0.01 }
    ]
  },
  m_zombie: {
    templateId: 'm_zombie',
    name: '矿区尸王',
    title: '【尸魄通玄】',
    tier: 0,
    isBoss: true,
    avatarIcon: '🧟',
    desc: '比奇矿洞深处苏醒的千年古尸，铁链缠身。',
    milestones: [
      { kills: 1, label: '镇尸伏魔', maxHp: 150, minDC: 8, maxDC: 16 },
      { kills: 3, label: '玄阴破罡', maxHp: 400, minDC: 20, maxDC: 40, minAC: 10, maxAC: 20 },
      { kills: 8, label: '九幽尸皇', maxHp: 1000, minDC: 50, maxDC: 100, critRate: 0.02 }
    ]
  },

  // 1阶 沃玛位面
  m_white_pig: {
    templateId: 'm_white_pig',
    name: '白野猪',
    title: '【狂暴战獠】',
    tier: 1,
    isBoss: false,
    avatarIcon: '🐗',
    desc: '上古异种红眸白獠巨猪，手持白骨巨流星锤，战力极强！',
    milestones: [
      { kills: 3, label: '野蛮冲锋', maxHp: 200, minDC: 10, maxDC: 20 },
      { kills: 10, label: '金刚獠牙', maxHp: 500, minDC: 25, maxDC: 50, minAC: 12, maxAC: 24 },
      { kills: 25, label: '不灭真魔', maxHp: 1200, minDC: 60, maxDC: 120, minAC: 25, maxAC: 50, critRate: 0.02 }
    ]
  },
  m_wooma_boss: {
    templateId: 'm_wooma_boss',
    name: '沃玛教主',
    title: '【雷霆万钧】',
    tier: 1,
    isBoss: true,
    avatarIcon: '⚡',
    desc: '沃玛神殿至尊，掌控九天狂雷与空间瞬移。',
    milestones: [
      { kills: 1, label: '破除雷障', minDC: 15, maxDC: 30, maxHp: 250 },
      { kills: 3, label: '神霄御雷', minDC: 40, maxDC: 80, maxHp: 600, critRate: 0.01 },
      { kills: 8, label: '雷神降世', minDC: 100, maxDC: 200, maxHp: 1500, critRate: 0.03 }
    ]
  },

  // 2阶 祖玛位面
  m_zuma_statue: {
    templateId: 'm_zuma_statue',
    name: '祖玛雕像',
    title: '【石化守卫】',
    tier: 2,
    isBoss: false,
    avatarIcon: '🗿',
    desc: '极道密室长眠的黑曜石像守卫，感应生人气息瞬间苏醒斩敌。',
    milestones: [
      { kills: 10, label: '石破天惊', minDC: 15, maxDC: 30, minAC: 8, maxAC: 16 },
      { kills: 30, label: '固若金汤', minDC: 35, maxDC: 70, minAC: 18, maxAC: 36 },
      { kills: 80, label: '万象石化', minDC: 80, maxDC: 160, minAC: 40, maxAC: 80, critRate: 0.01 }
    ]
  },
  m_zuma_boss: {
    templateId: 'm_zuma_boss',
    name: '祖玛教主',
    title: '【幽冥极焰】',
    tier: 2,
    isBoss: true,
    avatarIcon: '👹',
    desc: '极道密室魔尊，身负幽冥烈焰与万劫雕像军团。',
    milestones: [
      { kills: 1, label: '破除金身', minDC: 25, maxDC: 50, minAC: 15, maxAC: 30 },
      { kills: 3, label: '火炼金身', minDC: 60, maxDC: 120, minAC: 35, maxAC: 70 },
      { kills: 8, label: '幽冥主宰', minDC: 150, maxDC: 300, minAC: 80, maxAC: 160, critRate: 0.03 }
    ]
  },

  // 3阶 赤月位面
  m_red_moon: {
    templateId: 'm_red_moon',
    name: '赤月恶魔',
    title: '【血月吞天】',
    tier: 3,
    isBoss: true,
    avatarIcon: '🩸',
    desc: '沉睡于血沼深处的远古魔神，无尽全屏地刺穿刺。',
    milestones: [
      { kills: 1, label: '血月微光', maxHp: 500, minDC: 35, maxDC: 70 },
      { kills: 3, label: '逆血狂涛', maxHp: 1200, minDC: 90, maxDC: 180, critRate: 0.02 },
      { kills: 8, label: '血月噬魂', maxHp: 3000, minDC: 220, maxDC: 440, critRate: 0.04 }
    ]
  },

  // 4阶 苍月位面
  m_cangyue_skeleton: {
    templateId: 'm_cangyue_skeleton',
    name: '骨魔恶灵',
    title: '【阴煞骨魂】',
    tier: 4,
    isBoss: false,
    avatarIcon: '☠️',
    desc: '苍月海外洞窟常年吸纳阴煞海风聚成的恶灵，鬼影重重。',
    milestones: [
      { kills: 10, label: '断魂裂骨', minDC: 20, maxDC: 40, maxHp: 300 },
      { kills: 30, label: '九泉阴煞', minDC: 50, maxDC: 100, maxHp: 800 },
      { kills: 80, label: '森罗万象', minDC: 120, maxDC: 240, maxHp: 2000, critRate: 0.02 }
    ]
  },
  m_huangquan_boss: {
    templateId: 'm_huangquan_boss',
    name: '黄泉教主',
    title: '【黄泉摆渡】',
    tier: 4,
    isBoss: true,
    avatarIcon: '🌊',
    desc: '骨魔洞窟尽头的幽冥主宰，引渡忘川亡魂。',
    milestones: [
      { kills: 1, label: '踏破奈何', minDC: 50, maxDC: 100, minAC: 30, maxAC: 60 },
      { kills: 3, label: '黄泉引渡', minDC: 120, maxDC: 240, minAC: 70, maxAC: 140 },
      { kills: 8, label: '生死判官', minDC: 300, maxDC: 600, minAC: 160, maxAC: 320, critRate: 0.04 }
    ]
  },

  // 5阶 雷霆雪域魔龙位面
  m_molong_blade: {
    templateId: 'm_molong_blade',
    name: '魔龙战将',
    title: '【龙血战意】',
    tier: 5,
    isBoss: false,
    avatarIcon: '🐲',
    desc: '吸收远古真龙精血异变的狂暴战将，双刀披靡。',
    milestones: [
      { kills: 10, label: '破龙狂斩', minDC: 30, maxDC: 60, minAC: 15, maxAC: 30 },
      { kills: 30, label: '逆鳞护体', minDC: 70, maxDC: 140, minAC: 35, maxAC: 70 },
      { kills: 80, label: '万龙归真', minDC: 160, maxDC: 320, minAC: 80, maxAC: 160, critRate: 0.02 }
    ]
  },
  m_molong_boss: {
    templateId: 'm_molong_boss',
    name: '魔龙教主',
    title: '【太古龙皇】',
    tier: 5,
    isBoss: true,
    avatarIcon: '🐉',
    desc: '雪域深渊的远古极境真龙，龙炎焚尽诸天。',
    milestones: [
      { kills: 1, label: '龙鳞初破', minDC: 80, maxDC: 160, maxHp: 1000 },
      { kills: 3, label: '灭龙霸王', minDC: 200, maxDC: 400, maxHp: 2500, critRate: 0.02 },
      { kills: 8, label: '九天龙尊', minDC: 500, maxDC: 1000, maxHp: 6000, critRate: 0.05 }
    ]
  },

  // 6阶 九霄牛魔位面
  m_niumo_general: {
    templateId: 'm_niumo_general',
    name: '牛魔祭司',
    title: '【九霄狂蛮】',
    tier: 6,
    isBoss: false,
    avatarIcon: '👺',
    desc: '上古九霄神殿的萨满狂蛮法祭，御火雷降天诛。',
    milestones: [
      { kills: 10, label: '震山烈风', minDC: 40, maxDC: 80, maxHp: 500 },
      { kills: 30, label: '开山断岳', minDC: 90, maxDC: 180, maxHp: 1200 },
      { kills: 80, label: '狂蛮撼天', minDC: 200, maxDC: 400, maxHp: 3000, critRate: 0.02 }
    ]
  },
  m_niumo_boss: {
    templateId: 'm_niumo_boss',
    name: '牛魔王',
    title: '【至尊开天】',
    tier: 6,
    isBoss: true,
    avatarIcon: '👑',
    desc: '手握混铁开天破山斧的九霄至尊，威慑太古八荒。',
    milestones: [
      { kills: 1, label: '破山斩岳', minDC: 100, maxDC: 200, minAC: 60, maxAC: 120 },
      { kills: 3, label: '至尊狂斧', minDC: 250, maxDC: 500, minAC: 150, maxAC: 300, critRate: 0.03 },
      { kills: 8, label: '九天开辟', minDC: 600, maxDC: 1200, minAC: 350, maxAC: 700, critRate: 0.05 }
    ]
  },

  // 7阶 焚天火龙位面
  m_huolong_beast: {
    templateId: 'm_huolong_beast',
    name: '炎狱魔龙',
    title: '【焚世炎龙】',
    tier: 7,
    isBoss: false,
    avatarIcon: '🔥',
    desc: '生于地火熔炉极深处的炽焰巨龙，吐息如烈日灼空。',
    milestones: [
      { kills: 10, label: '赤火淬体', minDC: 50, maxDC: 100, minAC: 25, maxAC: 50 },
      { kills: 30, label: '红莲业火', minDC: 120, maxDC: 240, minAC: 60, maxAC: 120 },
      { kills: 80, label: '焚天烈炎', minDC: 280, maxDC: 560, minAC: 140, maxAC: 280, critRate: 0.03 }
    ]
  },
  m_huolong_boss: {
    templateId: 'm_huolong_boss',
    name: '焚天火龙神',
    title: '【灭世烈焰】',
    tier: 7,
    isBoss: true,
    avatarIcon: '🌋',
    desc: '熔岩之核诞生的太古神兽，引动地心烈火焚毁苍生。',
    milestones: [
      { kills: 1, label: '火海微光', maxHp: 1500, minDC: 120, maxDC: 240 },
      { kills: 3, label: '火龙破世', maxHp: 3500, minDC: 300, maxDC: 600, critRate: 0.03 },
      { kills: 8, label: '焚尽诸天', maxHp: 9000, minDC: 750, maxDC: 1500, critRate: 0.06 }
    ]
  },

  // 8阶 万劫修罗位面
  m_shura_warrior: {
    templateId: 'm_shura_warrior',
    name: '万劫修罗兵',
    title: '【修罗嗜血】',
    tier: 8,
    isBoss: false,
    avatarIcon: '🥷',
    desc: '来自幽冥血海的死战鬼卒，以战止战，永不知疲倦。',
    milestones: [
      { kills: 10, label: '杀戮修罗', minDC: 70, maxDC: 140, maxHp: 800 },
      { kills: 30, label: '血海不竭', minDC: 160, maxDC: 320, maxHp: 2000 },
      { kills: 80, label: '万劫成魔', minDC: 360, maxDC: 720, maxHp: 5000, critRate: 0.03 }
    ]
  },
  m_shura_boss: {
    templateId: 'm_shura_boss',
    name: '万劫修罗皇',
    title: '【幽冥极恶】',
    tier: 8,
    isBoss: true,
    avatarIcon: '💀',
    desc: '统御千万修罗神兵的绝世魔皇，身披万劫阴煞甲。',
    milestones: [
      { kills: 1, label: '踏入修罗', minDC: 160, maxDC: 320, minAC: 90, maxAC: 180 },
      { kills: 3, label: '极恶降世', minDC: 400, maxDC: 800, minAC: 220, maxAC: 440, critRate: 0.04 },
      { kills: 8, label: '万劫至尊', minDC: 1000, maxDC: 2000, minAC: 500, maxAC: 1000, critRate: 0.07 }
    ]
  },

  // 9阶 混沌鸿蒙虚空位面
  m_void_beast: {
    templateId: 'm_void_beast',
    name: '混沌虚空兽',
    title: '【太虚潜行】',
    tier: 9,
    isBoss: false,
    avatarIcon: '🌌',
    desc: '诞生于太虚裂缝深处的宇宙异兽，穿梭星轨与黑洞。',
    milestones: [
      { kills: 10, label: '虚空微芒', minDC: 100, maxDC: 200, minAC: 50, maxAC: 100 },
      { kills: 30, label: '星轨破灭', minDC: 240, maxDC: 480, minAC: 120, maxAC: 240 },
      { kills: 80, label: '混元一体', minDC: 550, maxDC: 1100, minAC: 280, maxAC: 560, critRate: 0.04 }
    ]
  },
  m_void_boss: {
    templateId: 'm_void_boss',
    name: '混元鸿蒙天尊',
    title: '【终极神道】',
    tier: 9,
    isBoss: true,
    avatarIcon: '⚡',
    desc: '执掌开天辟地混元母气的天道化身，大道极境主宰！',
    milestones: [
      { kills: 1, label: '窥见天道', minDC: 250, maxDC: 500, maxHp: 3000 },
      { kills: 3, label: '鸿蒙降世', minDC: 650, maxDC: 1300, maxHp: 8000, critRate: 0.05 },
      { kills: 8, label: '太上混元', minDC: 1600, maxDC: 3200, maxHp: 20000, critRate: 0.08 }
    ]
  },

  // 趣味打宝
  m_treasure_goblin: {
    templateId: 'm_treasure_goblin',
    name: '盗宝地精',
    title: '【财源滚滚】',
    tier: 1,
    isBoss: false,
    avatarIcon: '💰',
    desc: '背负沉重宝箱四处乱窜的矮小地精，受击狂爆宝物。',
    milestones: [
      { kills: 1, label: '初获横财', minDC: 10, maxDC: 20, maxHp: 200 },
      { kills: 3, label: '财运亨通', minDC: 30, maxDC: 60, maxHp: 600 },
      { kills: 8, label: '金玉满堂', minDC: 80, maxDC: 160, maxHp: 1600, critRate: 0.03 }
    ]
  }
};

/**
 * 随机生成 3 条当前可用悬赏令任务
 */
export function generateBounties(): BountyTask[] {
  const pool = [
    {
      templateId: 'm_scarecrow',
      targetName: '消灭【稻草人】',
      targetIcon: '🌾',
      requiredKills: 15,
      rewardGold: 100000,
      rewardIronOre: 15,
      rewardPureIron: 2,
      rewardGodStone: 0
    },
    {
      templateId: 'm_cat',
      targetName: '除灭【钉耙猫】',
      targetIcon: '🐱',
      requiredKills: 15,
      rewardGold: 120000,
      rewardIronOre: 18,
      rewardPureIron: 3,
      rewardGodStone: 0
    },
    {
      templateId: 'm_spider',
      targetName: '诛杀【毒蜘蛛】',
      targetIcon: '🕷️',
      requiredKills: 15,
      rewardGold: 150000,
      rewardIronOre: 20,
      rewardPureIron: 4,
      rewardGodStone: 0
    },
    {
      templateId: 'm_skeleton',
      targetName: '清剿【骷髅战士】',
      targetIcon: '💀',
      requiredKills: 20,
      rewardGold: 200000,
      rewardIronOre: 25,
      rewardPureIron: 5,
      rewardGodStone: 0
    },
    {
      templateId: 'm_zombie',
      targetName: '镇压【矿区尸王】',
      targetIcon: '🧟',
      requiredKills: 1,
      rewardGold: 500000,
      rewardIronOre: 35,
      rewardPureIron: 8,
      rewardGodStone: 1
    },
    {
      templateId: 'm_white_pig',
      targetName: '伏击【白野猪】',
      targetIcon: '🐗',
      requiredKills: 2,
      rewardGold: 650000,
      rewardIronOre: 40,
      rewardPureIron: 10,
      rewardGodStone: 1
    },
    {
      templateId: 'm_wooma_boss',
      targetName: '讨伐【沃玛教主】',
      targetIcon: '⚡',
      requiredKills: 1,
      rewardGold: 1000000,
      rewardIronOre: 50,
      rewardPureIron: 15,
      rewardGodStone: 2
    },
    {
      templateId: 'm_zuma_statue',
      targetName: '摧毁【祖玛雕像】',
      targetIcon: '🗿',
      requiredKills: 18,
      rewardGold: 800000,
      rewardIronOre: 35,
      rewardPureIron: 12,
      rewardGodStone: 2
    },
    {
      templateId: 'm_zuma_boss',
      targetName: '诛灭【祖玛教主】',
      targetIcon: '🐂',
      requiredKills: 1,
      rewardGold: 1500000,
      rewardIronOre: 60,
      rewardPureIron: 20,
      rewardGodStone: 3
    },
    {
      templateId: 'm_molong_boss',
      targetName: '镇伏【魔龙教主】',
      targetIcon: '🐉',
      requiredKills: 1,
      rewardGold: 2000000,
      rewardIronOre: 80,
      rewardPureIron: 30,
      rewardGodStone: 5
    },
    {
      templateId: 'm_treasure_goblin',
      targetName: '擒获【盗宝地精】',
      targetIcon: '💰',
      requiredKills: 1,
      rewardGold: 800000,
      rewardIronOre: 40,
      rewardPureIron: 12,
      rewardGodStone: 2
    }
  ];

  // 随机挑选 3 个不重复的任务
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3).map((item, idx) => ({
    id: `bounty_${Date.now()}_${idx}`,
    templateId: item.templateId,
    targetName: item.targetName,
    targetIcon: item.targetIcon,
    requiredKills: item.requiredKills,
    currentKills: 0,
    rewardGold: item.rewardGold,
    rewardIronOre: item.rewardIronOre,
    rewardPureIron: item.rewardPureIron,
    rewardGodStone: item.rewardGodStone,
    completed: false,
    claimed: false
  }));
}
