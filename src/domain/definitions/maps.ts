import { MapDefinition, GridCoord } from '../../types/map';

function makeBorderObstacles(width: number, height: number): GridCoord[] {
  const list: GridCoord[] = [];
  for (let x = 0; x < width; x++) {
    list.push({ x, y: 0 });
    list.push({ x, y: height - 1 });
  }
  for (let y = 1; y < height - 1; y++) {
    list.push({ x: 0, y });
    list.push({ x: width - 1, y });
  }
  return list;
}

export const MAP_DEFINITIONS: Record<string, MapDefinition> = {
  'map_biqi_0': {
    id: 'map_biqi_0',
    name: '比奇荒原·银杏谷',
    tier: 0,
    recommendedLevel: 'Lv.1 ~ 25',
    width: 36,
    height: 36,
    desc: '初入江湖的试炼荒野，绿草茵茵，四处游荡着稻草人与骷髅盗贼。深处隐藏着矿区尸王。',
    theme: {
      primaryColor: '#1a1815',
      secondaryColor: '#161411',
      accentColor: '#2b2a22',
      wallBaseColor: '#29221b',
      wallTopColor: '#3a3026',
      wallBorderColor: '#1c1815',
      ambientLight: 'rgba(0, 0, 0, 0)',
      vignetteStrength: 0.15,
      groundDetailType: 'grass'
    },
    spawnPoint: { x: 18, y: 18 },
    safeZone: { center: { x: 18, y: 18 }, radius: 3 },
    fixedObstacles: [
      ...makeBorderObstacles(36, 36),
      { x: 10, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 11 },
      { x: 24, y: 22 }, { x: 25, y: 22 }, { x: 25, y: 23 },
      { x: 18, y: 14 }, { x: 19, y: 14 }
    ],
    portals: [
      {
        id: 'portal_biqi_to_wooma',
        name: '🌀 前往【沃玛神殿】',
        pos: { x: 33, y: 18 },
        targetMapId: 'map_wooma_1',
        targetPos: { x: 5, y: 18 },
        requiredTier: 1,
        requiredLevel: 25,
        beamColor: '#38bdf8'
      }
    ],
    spawns: [
      { templateId: 'm_scarecrow', count: 8, center: { x: 12, y: 12 }, radius: 6, respawnTicks: 30 },
      { templateId: 'm_cat', count: 8, center: { x: 24, y: 12 }, radius: 6, respawnTicks: 30 },
      { templateId: 'm_spider', count: 6, center: { x: 12, y: 24 }, radius: 6, respawnTicks: 35 },
      { templateId: 'm_skeleton', count: 6, center: { x: 24, y: 24 }, radius: 6, respawnTicks: 35 },
      { templateId: 'm_zombie', count: 1, center: { x: 28, y: 28 }, radius: 4, respawnTicks: 120, isGuaranteedBoss: true }
    ]
  },

  'map_wooma_1': {
    id: 'map_wooma_1',
    name: '沃玛神殿·幽冥回廊',
    tier: 1,
    recommendedLevel: 'Lv.25 ~ 35',
    width: 36,
    height: 36,
    desc: '上古沃玛教派祭祀圣殿，空气中流淌着幽蓝神焰，盘踞着狂暴的沃玛教众与极恶魔神。',
    theme: {
      primaryColor: '#0f172a',
      secondaryColor: '#0a0f1d',
      accentColor: '#1e293b',
      wallBaseColor: '#1e293b',
      wallTopColor: '#334155',
      wallBorderColor: '#0f172a',
      ambientLight: 'rgba(14, 116, 144, 0.08)',
      vignetteStrength: 0.35,
      groundDetailType: 'stone'
    },
    spawnPoint: { x: 5, y: 18 },
    safeZone: { center: { x: 5, y: 18 }, radius: 2 },
    fixedObstacles: [
      ...makeBorderObstacles(36, 36),
      { x: 14, y: 10 }, { x: 14, y: 11 }, { x: 14, y: 12 },
      { x: 22, y: 10 }, { x: 22, y: 11 }, { x: 22, y: 12 },
      { x: 14, y: 24 }, { x: 14, y: 25 }, { x: 14, y: 26 },
      { x: 22, y: 24 }, { x: 22, y: 25 }, { x: 22, y: 26 }
    ],
    portals: [
      {
        id: 'portal_wooma_to_biqi',
        name: '🌀 返回【比奇荒原】',
        pos: { x: 3, y: 18 },
        targetMapId: 'map_biqi_0',
        targetPos: { x: 31, y: 18 },
        requiredTier: 0,
        requiredLevel: 1,
        beamColor: '#94a3b8'
      },
      {
        id: 'portal_wooma_to_zuma',
        name: '🌀 前往【祖玛幽冥殿】',
        pos: { x: 33, y: 18 },
        targetMapId: 'map_zuma_2',
        targetPos: { x: 5, y: 18 },
        requiredTier: 2,
        requiredLevel: 32,
        beamColor: '#eab308'
      }
    ],
    spawns: [
      { templateId: 'm_skeleton', count: 8, center: { x: 12, y: 18 }, radius: 5, respawnTicks: 35 },
      { templateId: 'm_zombie', count: 8, center: { x: 18, y: 12 }, radius: 5, respawnTicks: 120 },
      { templateId: 'm_white_pig', count: 4, center: { x: 20, y: 24 }, radius: 4, respawnTicks: 120 },
      { templateId: 'm_wooma_boss', count: 1, center: { x: 28, y: 18 }, radius: 3, respawnTicks: 250, isGuaranteedBoss: true }
    ]
  },

  'map_zuma_2': {
    id: 'map_zuma_2',
    name: '祖玛幽冥殿·极道密室',
    tier: 2,
    recommendedLevel: 'Lv.32 ~ 38',
    width: 36,
    height: 36,
    desc: '黑曜玄石铸造的黄帝古墓，金漆符文封印着无尽的石像战将，中央盘踞着威震三界的祖玛教主。',
    theme: {
      primaryColor: '#1c1917',
      secondaryColor: '#141210',
      accentColor: '#78350f',
      wallBaseColor: '#451a03',
      wallTopColor: '#78350f',
      wallBorderColor: '#292524',
      ambientLight: 'rgba(217, 119, 6, 0.06)',
      vignetteStrength: 0.30,
      groundDetailType: 'stone'
    },
    spawnPoint: { x: 5, y: 18 },
    safeZone: { center: { x: 5, y: 18 }, radius: 2 },
    fixedObstacles: [
      ...makeBorderObstacles(36, 36),
      { x: 12, y: 12 }, { x: 13, y: 12 }, { x: 12, y: 13 },
      { x: 24, y: 12 }, { x: 23, y: 12 }, { x: 24, y: 13 },
      { x: 18, y: 18 }, { x: 18, y: 19 }
    ],
    portals: [
      {
        id: 'portal_zuma_to_wooma',
        name: '🌀 返回【沃玛神殿】',
        pos: { x: 3, y: 18 },
        targetMapId: 'map_wooma_1',
        targetPos: { x: 31, y: 18 },
        requiredTier: 1,
        requiredLevel: 25,
        beamColor: '#38bdf8'
      },
      {
        id: 'portal_zuma_to_redmoon',
        name: '🌀 前往【赤月血沼】',
        pos: { x: 33, y: 18 },
        targetMapId: 'map_redmoon_3',
        targetPos: { x: 5, y: 18 },
        requiredTier: 3,
        requiredLevel: 38,
        beamColor: '#ef4444'
      }
    ],
    spawns: [
      { templateId: 'm_zuma_statue', count: 10, center: { x: 14, y: 14 }, radius: 5, respawnTicks: 40 },
      { templateId: 'm_zuma_statue', count: 10, center: { x: 20, y: 24 }, radius: 5, respawnTicks: 40 },
      { templateId: 'm_white_pig', count: 4, center: { x: 22, y: 12 }, radius: 5, respawnTicks: 120 },
      { templateId: 'm_zuma_boss', count: 1, center: { x: 28, y: 18 }, radius: 3, respawnTicks: 300, isGuaranteedBoss: true }
    ]
  },

  'map_redmoon_3': {
    id: 'map_redmoon_3',
    name: '赤月血沼·恶魔巢穴',
    tier: 3,
    recommendedLevel: 'Lv.38 ~ 44',
    width: 36,
    height: 36,
    desc: '猩红毒血四溢的恶魔巢穴，万年剧毒沼泽中潜伏着无数巨型魔蛛，中央恶魔真身掌握着地裂神技。',
    theme: {
      primaryColor: '#260a0a',
      secondaryColor: '#1a0505',
      accentColor: '#7f1d1d',
      wallBaseColor: '#450a0a',
      wallTopColor: '#7f1d1d',
      wallBorderColor: '#1f0404',
      ambientLight: 'rgba(185, 28, 28, 0.12)',
      vignetteStrength: 0.45,
      groundDetailType: 'blood'
    },
    spawnPoint: { x: 5, y: 18 },
    safeZone: { center: { x: 5, y: 18 }, radius: 2 },
    fixedObstacles: [
      ...makeBorderObstacles(36, 36),
      { x: 10, y: 8 }, { x: 11, y: 8 }, { x: 25, y: 8 }, { x: 26, y: 8 },
      { x: 10, y: 28 }, { x: 11, y: 28 }, { x: 25, y: 28 }, { x: 26, y: 28 }
    ],
    portals: [
      {
        id: 'portal_redmoon_to_zuma',
        name: '🌀 返回【祖玛幽冥殿】',
        pos: { x: 3, y: 18 },
        targetMapId: 'map_zuma_2',
        targetPos: { x: 31, y: 18 },
        requiredTier: 2,
        requiredLevel: 32,
        beamColor: '#eab308'
      },
      {
        id: 'portal_redmoon_to_cangyue',
        name: '🌀 前往【苍月遗迹】',
        pos: { x: 33, y: 18 },
        targetMapId: 'map_cangyue_4',
        targetPos: { x: 5, y: 18 },
        requiredTier: 4,
        requiredLevel: 44,
        beamColor: '#0ea5e9'
      }
    ],
    spawns: [
      { templateId: 'm_zuma_statue', count: 8, center: { x: 14, y: 14 }, radius: 5, respawnTicks: 40 },
      { templateId: 'm_zuma_statue', count: 8, center: { x: 18, y: 24 }, radius: 5, respawnTicks: 40 },
      { templateId: 'm_white_pig', count: 6, center: { x: 20, y: 12 }, radius: 5, respawnTicks: 120 },
      { templateId: 'm_red_moon', count: 1, center: { x: 28, y: 18 }, radius: 3, respawnTicks: 300, isGuaranteedBoss: true }
    ]
  },

  'map_cangyue_4': {
    id: 'map_cangyue_4',
    name: '苍月遗迹·骨魔洞窟',
    tier: 4,
    recommendedLevel: 'Lv.44 ~ 50',
    width: 36,
    height: 36,
    desc: '海外孤岛上的千万载骨魔洞窟，海浪拍击与阴煞死气交织，镇守此地的是统御幽冥鬼卒的黄泉教主。',
    theme: {
      primaryColor: '#0c1a24',
      secondaryColor: '#071018',
      accentColor: '#1e3a5f',
      wallBaseColor: '#162e4a',
      wallTopColor: '#2b5278',
      wallBorderColor: '#0c1a24',
      ambientLight: 'rgba(2, 132, 199, 0.08)',
      vignetteStrength: 0.35,
      groundDetailType: 'stone'
    },
    spawnPoint: { x: 5, y: 18 },
    safeZone: { center: { x: 5, y: 18 }, radius: 2 },
    fixedObstacles: [
      ...makeBorderObstacles(36, 36),
      { x: 15, y: 15 }, { x: 16, y: 15 }, { x: 20, y: 20 }, { x: 21, y: 20 }
    ],
    portals: [
      {
        id: 'portal_cangyue_to_redmoon',
        name: '🌀 返回【赤月血沼】',
        pos: { x: 3, y: 18 },
        targetMapId: 'map_redmoon_3',
        targetPos: { x: 31, y: 18 },
        requiredTier: 3,
        requiredLevel: 38,
        beamColor: '#ef4444'
      },
      {
        id: 'portal_cangyue_to_molong',
        name: '🌀 前往【雷霆雪域】',
        pos: { x: 33, y: 18 },
        targetMapId: 'map_molong_5',
        targetPos: { x: 5, y: 18 },
        requiredTier: 5,
        requiredLevel: 50,
        beamColor: '#a855f7'
      }
    ],
    spawns: [
      { templateId: 'm_cangyue_skeleton', count: 10, center: { x: 14, y: 12 }, radius: 5, respawnTicks: 40 },
      { templateId: 'm_cangyue_skeleton', count: 10, center: { x: 18, y: 24 }, radius: 5, respawnTicks: 40 },
      { templateId: 'm_huangquan_boss', count: 1, center: { x: 28, y: 18 }, radius: 3, respawnTicks: 350, isGuaranteedBoss: true }
    ]
  },

  'map_molong_5': {
    id: 'map_molong_5',
    name: '雷霆雪域·魔龙魔窟',
    tier: 5,
    recommendedLevel: 'Lv.50 ~ 55',
    width: 36,
    height: 36,
    desc: '雷击焦土与刺骨飞雪交融的禁忌极境，紫电狂雷不断轰鸣，潜伏着毁天灭地的魔龙魔神。',
    theme: {
      primaryColor: '#181124',
      secondaryColor: '#110b1a',
      accentColor: '#581c87',
      wallBaseColor: '#3b0764',
      wallTopColor: '#6b21a8',
      wallBorderColor: '#1e0933',
      ambientLight: 'rgba(147, 51, 234, 0.10)',
      vignetteStrength: 0.40,
      groundDetailType: 'lava'
    },
    spawnPoint: { x: 5, y: 18 },
    safeZone: { center: { x: 5, y: 18 }, radius: 2 },
    fixedObstacles: [
      ...makeBorderObstacles(36, 36),
      { x: 18, y: 10 }, { x: 18, y: 11 }, { x: 18, y: 25 }, { x: 18, y: 26 }
    ],
    portals: [
      {
        id: 'portal_molong_to_cangyue',
        name: '🌀 返回【苍月遗迹】',
        pos: { x: 3, y: 18 },
        targetMapId: 'map_cangyue_4',
        targetPos: { x: 31, y: 18 },
        requiredTier: 4,
        requiredLevel: 44,
        beamColor: '#0ea5e9'
      },
      {
        id: 'portal_molong_to_niumo',
        name: '🌀 前往【九霄神殿】',
        pos: { x: 33, y: 18 },
        targetMapId: 'map_niumo_6',
        targetPos: { x: 5, y: 18 },
        requiredTier: 6,
        requiredLevel: 55,
        beamColor: '#f97316'
      }
    ],
    spawns: [
      { templateId: 'm_molong_blade', count: 10, center: { x: 14, y: 12 }, radius: 5, respawnTicks: 45 },
      { templateId: 'm_molong_blade', count: 10, center: { x: 20, y: 24 }, radius: 5, respawnTicks: 45 },
      { templateId: 'm_molong_boss', count: 1, center: { x: 28, y: 18 }, radius: 3, respawnTicks: 350, isGuaranteedBoss: true }
    ]
  },

  'map_niumo_6': {
    id: 'map_niumo_6',
    name: '九霄神殿·牛魔祭坛',
    tier: 6,
    recommendedLevel: 'Lv.55 ~ 60',
    width: 36,
    height: 36,
    desc: '上古九霄雷火铸就的巍峨神殿，断戟残垣中盘踞着牛魔禁卫，中央牛魔王手握破山神斧。',
    theme: {
      primaryColor: '#201205',
      secondaryColor: '#140b02',
      accentColor: '#9a3412',
      wallBaseColor: '#7c2d12',
      wallTopColor: '#c2410c',
      wallBorderColor: '#431407',
      ambientLight: 'rgba(234, 88, 12, 0.08)',
      vignetteStrength: 0.38,
      groundDetailType: 'stone'
    },
    spawnPoint: { x: 5, y: 18 },
    safeZone: { center: { x: 5, y: 18 }, radius: 2 },
    fixedObstacles: [
      ...makeBorderObstacles(36, 36),
      { x: 12, y: 18 }, { x: 24, y: 18 }
    ],
    portals: [
      {
        id: 'portal_niumo_to_molong',
        name: '🌀 返回【雷霆雪域】',
        pos: { x: 3, y: 18 },
        targetMapId: 'map_molong_5',
        targetPos: { x: 31, y: 18 },
        requiredTier: 5,
        requiredLevel: 50,
        beamColor: '#a855f7'
      },
      {
        id: 'portal_niumo_to_huolong',
        name: '🌀 前往【焚天魔域】',
        pos: { x: 33, y: 18 },
        targetMapId: 'map_huolong_7',
        targetPos: { x: 5, y: 18 },
        requiredTier: 7,
        requiredLevel: 60,
        beamColor: '#ef4444'
      }
    ],
    spawns: [
      { templateId: 'm_niumo_general', count: 10, center: { x: 14, y: 12 }, radius: 5, respawnTicks: 45 },
      { templateId: 'm_niumo_general', count: 10, center: { x: 20, y: 24 }, radius: 5, respawnTicks: 45 },
      { templateId: 'm_niumo_boss', count: 1, center: { x: 28, y: 18 }, radius: 3, respawnTicks: 400, isGuaranteedBoss: true }
    ]
  },

  'map_huolong_7': {
    id: 'map_huolong_7',
    name: '焚天魔域·火龙熔炉',
    tier: 7,
    recommendedLevel: 'Lv.60 ~ 65',
    width: 36,
    height: 36,
    desc: '炽热熔浆翻滚的焚天熔炉，赤金地火喷涌不息，焚天火龙神盘旋于熔岩神柱之上！',
    theme: {
      primaryColor: '#2a0a0a',
      secondaryColor: '#1c0505',
      accentColor: '#b91c1c',
      wallBaseColor: '#7f1d1d',
      wallTopColor: '#dc2626',
      wallBorderColor: '#450a0a',
      ambientLight: 'rgba(239, 68, 68, 0.12)',
      vignetteStrength: 0.45,
      groundDetailType: 'lava'
    },
    spawnPoint: { x: 5, y: 18 },
    safeZone: { center: { x: 5, y: 18 }, radius: 2 },
    fixedObstacles: [
      ...makeBorderObstacles(36, 36),
      { x: 15, y: 12 }, { x: 21, y: 12 }, { x: 15, y: 24 }, { x: 21, y: 24 }
    ],
    portals: [
      {
        id: 'portal_huolong_to_niumo',
        name: '🌀 返回【九霄神殿】',
        pos: { x: 3, y: 18 },
        targetMapId: 'map_niumo_6',
        targetPos: { x: 31, y: 18 },
        requiredTier: 6,
        requiredLevel: 55,
        beamColor: '#f97316'
      },
      {
        id: 'portal_huolong_to_shura',
        name: '🌀 前往【万劫修罗界】',
        pos: { x: 33, y: 18 },
        targetMapId: 'map_shura_8',
        targetPos: { x: 5, y: 18 },
        requiredTier: 8,
        requiredLevel: 65,
        beamColor: '#d946ef'
      }
    ],
    spawns: [
      { templateId: 'm_huolong_beast', count: 10, center: { x: 14, y: 12 }, radius: 5, respawnTicks: 50 },
      { templateId: 'm_huolong_beast', count: 10, center: { x: 20, y: 24 }, radius: 5, respawnTicks: 50 },
      { templateId: 'm_huolong_boss', count: 1, center: { x: 28, y: 18 }, radius: 3, respawnTicks: 450, isGuaranteedBoss: true }
    ]
  },

  'map_shura_8': {
    id: 'map_shura_8',
    name: '幽冥极境·万劫修罗界',
    tier: 8,
    recommendedLevel: 'Lv.65 ~ 70',
    width: 36,
    height: 36,
    desc: '万劫阴煞构筑的死绝位面，空间裂隙吞噬万物，修罗皇统御千万魔神镇守虚空关隘。',
    theme: {
      primaryColor: '#190a1f',
      secondaryColor: '#100514',
      accentColor: '#701a75',
      wallBaseColor: '#4a044e',
      wallTopColor: '#86198f',
      wallBorderColor: '#2e0238',
      ambientLight: 'rgba(217, 70, 239, 0.10)',
      vignetteStrength: 0.48,
      groundDetailType: 'void'
    },
    spawnPoint: { x: 5, y: 18 },
    safeZone: { center: { x: 5, y: 18 }, radius: 2 },
    fixedObstacles: [
      ...makeBorderObstacles(36, 36),
      { x: 18, y: 14 }, { x: 18, y: 22 }
    ],
    portals: [
      {
        id: 'portal_shura_to_huolong',
        name: '🌀 返回【焚天魔域】',
        pos: { x: 3, y: 18 },
        targetMapId: 'map_huolong_7',
        targetPos: { x: 31, y: 18 },
        requiredTier: 7,
        requiredLevel: 60,
        beamColor: '#ef4444'
      },
      {
        id: 'portal_shura_to_void',
        name: '🌀 踏入【鸿蒙虚空界】',
        pos: { x: 33, y: 18 },
        targetMapId: 'map_void_9',
        targetPos: { x: 5, y: 18 },
        requiredTier: 9,
        requiredLevel: 70,
        beamColor: '#facc15'
      }
    ],
    spawns: [
      { templateId: 'm_shura_warrior', count: 10, center: { x: 14, y: 12 }, radius: 5, respawnTicks: 50 },
      { templateId: 'm_shura_warrior', count: 10, center: { x: 20, y: 24 }, radius: 5, respawnTicks: 50 },
      { templateId: 'm_shura_boss', count: 1, center: { x: 28, y: 18 }, radius: 3, respawnTicks: 500, isGuaranteedBoss: true }
    ]
  },

  'map_void_9': {
    id: 'map_void_9',
    name: '混元天域·鸿蒙虚空界',
    tier: 9,
    recommendedLevel: 'Lv.70+',
    width: 36,
    height: 36,
    desc: '开天辟地之前的终极太虚神境，漫天星轨璀璨流转，鸿蒙神座上端坐着掌控万界法则的至尊天尊！',
    theme: {
      primaryColor: '#070514',
      secondaryColor: '#03020a',
      accentColor: '#312e81',
      wallBaseColor: '#1e1b4b',
      wallTopColor: '#3730a3',
      wallBorderColor: '#0f0e26',
      ambientLight: 'rgba(250, 204, 21, 0.08)',
      vignetteStrength: 0.50,
      groundDetailType: 'void'
    },
    spawnPoint: { x: 5, y: 18 },
    safeZone: { center: { x: 5, y: 18 }, radius: 2 },
    fixedObstacles: [
      ...makeBorderObstacles(36, 36),
      { x: 14, y: 14 }, { x: 22, y: 14 }, { x: 14, y: 22 }, { x: 22, y: 22 }
    ],
    portals: [
      {
        id: 'portal_void_to_shura',
        name: '🌀 返回【万劫修罗界】',
        pos: { x: 3, y: 18 },
        targetMapId: 'map_shura_8',
        targetPos: { x: 31, y: 18 },
        requiredTier: 8,
        requiredLevel: 65,
        beamColor: '#d946ef'
      }
    ],
    spawns: [
      { templateId: 'm_void_beast', count: 12, center: { x: 14, y: 12 }, radius: 5, respawnTicks: 50 },
      { templateId: 'm_void_beast', count: 12, center: { x: 20, y: 24 }, radius: 5, respawnTicks: 50 },
      { templateId: 'm_void_boss', count: 1, center: { x: 28, y: 18 }, radius: 3, respawnTicks: 600, isGuaranteedBoss: true }
    ]
  }
};
