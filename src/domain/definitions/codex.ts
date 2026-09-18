import { BountyTask, MonsterCodexDef } from '../../types/codex';

export const MONSTER_CODEX_DEFINITIONS: Record<string, MonsterCodexDef> = {
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
      { kills: 50, label: '秋风扫叶', maxHp: 120, minDC: 5, maxDC: 10 },
      { kills: 200, label: '斩草除根', maxHp: 300, minDC: 12, maxDC: 24, critRate: 0.01 }
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
      { kills: 50, label: '金爪裂石', minAC: 5, maxAC: 10, minDC: 8, maxDC: 16 },
      { kills: 200, label: '九命化煞', minAC: 12, maxAC: 24, minDC: 18, maxDC: 36, critRate: 0.01 }
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
      { kills: 50, label: '白骨如山', maxHp: 200, minAC: 8, maxAC: 16 },
      { kills: 200, label: '万劫不灭', maxHp: 500, minAC: 20, maxAC: 40, critRate: 0.01 }
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
      { kills: 5, label: '玄阴破罡', maxHp: 400, minDC: 20, maxDC: 40, minAC: 10, maxAC: 20 },
      { kills: 15, label: '九幽尸皇', maxHp: 1000, minDC: 50, maxDC: 100, critRate: 0.02 }
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
      { kills: 5, label: '神霄御雷', minDC: 40, maxDC: 80, maxHp: 600, critRate: 0.01 },
      { kills: 15, label: '雷神降世', minDC: 100, maxDC: 200, maxHp: 1500, critRate: 0.03 }
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
      { kills: 5, label: '火炼金身', minDC: 60, maxDC: 120, minAC: 35, maxAC: 70 },
      { kills: 15, label: '幽冥主宰', minDC: 150, maxDC: 300, minAC: 80, maxAC: 160, critRate: 0.03 }
    ]
  },
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
      { kills: 5, label: '逆血狂涛', maxHp: 1200, minDC: 90, maxDC: 180, critRate: 0.02 },
      { kills: 15, label: '血月噬魂', maxHp: 3000, minDC: 220, maxDC: 440, critRate: 0.04 }
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
      { kills: 5, label: '黄泉引渡', minDC: 120, maxDC: 240, minAC: 70, maxAC: 140 },
      { kills: 15, label: '生死判官', minDC: 300, maxDC: 600, minAC: 160, maxAC: 320, critRate: 0.04 }
    ]
  },
  m_dragon_boss: {
    templateId: 'm_dragon_boss',
    name: '魔龙教主',
    title: '【太古龙皇】',
    tier: 5,
    isBoss: true,
    avatarIcon: '🐲',
    desc: '雪域深渊的远古极境真龙，龙炎焚尽诸天。',
    milestones: [
      { kills: 1, label: '龙鳞初破', minDC: 80, maxDC: 160, maxHp: 1000 },
      { kills: 5, label: '灭龙霸王', minDC: 200, maxDC: 400, maxHp: 2500, critRate: 0.02 },
      { kills: 15, label: '九天龙尊', minDC: 500, maxDC: 1000, maxHp: 6000, critRate: 0.05 }
    ]
  },
  m_treasure_goblin: {
    templateId: 'm_treasure_goblin',
    name: '盗宝地精',
    title: '【财源滚滚】',
    tier: 1,
    isBoss: false,
    avatarIcon: '💰',
    desc: '背负沉重宝箱四处乱窜的矮小地精，受击狂爆宝物。',
    milestones: [
      { kills: 3, label: '初获横财', minDC: 10, maxDC: 20, maxHp: 200 },
      { kills: 15, label: '财运亨通', minDC: 30, maxDC: 60, maxHp: 600 },
      { kills: 50, label: '金玉满堂', minDC: 80, maxDC: 160, maxHp: 1600, critRate: 0.03 }
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
      requiredKills: 20,
      rewardGold: 100000,
      rewardIronOre: 15,
      rewardPureIron: 2,
      rewardGodStone: 0
    },
    {
      templateId: 'm_cat',
      targetName: '除灭【钉耙猫】',
      targetIcon: '🐱',
      requiredKills: 20,
      rewardGold: 120000,
      rewardIronOre: 18,
      rewardPureIron: 3,
      rewardGodStone: 0
    },
    {
      templateId: 'm_skeleton',
      targetName: '清剿【骷髅战士】',
      targetIcon: '💀',
      requiredKills: 25,
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
