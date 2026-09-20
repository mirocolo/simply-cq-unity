import { ItemDef } from "../../../types/game";

export const DEFS: Record<string, ItemDef> = {
  // ======= 强化锻造矿石 (Materials) =======
  'mat_iron_ore': {
    id: 'mat_iron_ore',
    name: '黑铁矿石',
    type: 'material',
    tier: 0,
    baseQuality: 1, // 优秀(绿)
    minDC: 0,
    maxDC: 0,
    minAC: 0,
    maxAC: 0,
    maxHp: 0,
    maxMp: 0,
    levelReq: 1,
    price: 300,
    icon: '🪨',
    desc: '地底深处开采出的玄黑铁矿，蕴含地心磁力，用于装备部位 +1~+5 强化。'
  },
  'mat_pure_iron': {
    id: 'mat_pure_iron',
    name: '纯黑玄铁',
    type: 'material',
    tier: 2,
    baseQuality: 3, // 史诗(紫)
    minDC: 0,
    maxDC: 0,
    minAC: 0,
    maxAC: 0,
    maxHp: 0,
    maxMp: 0,
    levelReq: 30,
    price: 1500,
    icon: '💎',
    desc: '千锤百炼凝练而成的纯黑天外玄铁，流淌幽暗精魄，用于装备部位 +6~+10 进阶强化。'
  },
  'mat_god_stone': {
    id: 'mat_god_stone',
    name: '天工神石',
    type: 'material',
    tier: 5,
    baseQuality: 4, // 传说(橙)
    minDC: 0,
    maxDC: 0,
    minAC: 0,
    maxAC: 0,
    maxHp: 0,
    maxMp: 0,
    levelReq: 50,
    price: 8000,
    icon: '🔮',
    desc: '九天陨落的上古神工造化之石，可沟通造化引雷粹火，用于装备部位 +11~+15 极境强化！'
  },

  'mat_reforge_stone': {
    id: 'mat_reforge_stone',
    name: '乾坤洗炼石',
    type: 'material',
    tier: 2,
    baseQuality: 3, // 史诗(紫)
    minDC: 0,
    maxDC: 0,
    minAC: 0,
    maxAC: 0,
    maxHp: 0,
    maxMp: 0,
    levelReq: 1,
    price: 12000,
    icon: '💠',
    desc: '【夺天地造化奇石】用于重构与洗炼装备附带的彩色随机词条，追求极致攻击、致命暴伤与神圣破甲！'
  }
};
