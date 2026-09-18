export interface MonsterLootEntry {
  defId: string;
  chance: number; // 0 ~ 1, 例如 0.2 表示 20%
  minCount?: number;
  maxCount?: number;
}

export interface MonsterTemplate {
  templateId: string;
  name: string;
  level: number;
  hp: number;
  mp: number;
  minDC: number;
  maxDC: number;
  minAC: number;
  maxAC: number;
  critRate: number;
  haste: number;
  baseAttackInterval: number; // 默认 9 ticks (0.9s)
  goldDrop: [number, number]; // [min, max]
  expReward: number;
  isElite?: boolean;
  isBoss?: boolean;
  respawnTicks: number; // 死亡后复活延迟 (10 ticks = 1s)
  color: string;
  icon: string;
  lootTable: MonsterLootEntry[];
}

export const MONSTER_TEMPLATES: Record<string, MonsterTemplate> = {
  'm_scarecrow': {
    templateId: 'm_scarecrow',
    name: '稻草人',
    level: 2,
    hp: 50,
    mp: 0,
    minDC: 2,
    maxDC: 5,
    minAC: 1,
    maxAC: 2,
    critRate: 0.02,
    haste: 0,
    baseAttackInterval: 10,
    goldDrop: [10, 30],
    expReward: 15,
    respawnTicks: 150, // 降低小怪刷新频率 (15秒复活)
    color: '#a16207',
    icon: '🌾',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.8, minCount: 1, maxCount: 2 },
      { defId: 'w_wood_sword', chance: 0.45 },
      { defId: 'a_buyi', chance: 0.40 },
      { defId: 'h_qingtong', chance: 0.30 }
    ]
  },
  'm_cat': {
    templateId: 'm_cat',
    name: '钉耙猫',
    level: 5,
    hp: 90,
    mp: 0,
    minDC: 4,
    maxDC: 9,
    minAC: 2,
    maxAC: 3,
    critRate: 0.05,
    haste: 2,
    baseAttackInterval: 9,
    goldDrop: [25, 60],
    expReward: 35,
    respawnTicks: 180, // 降低小怪刷新频率 (18秒复活)
    color: '#ca8a04',
    icon: '🐱',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.8, minCount: 1, maxCount: 2 },
      { defId: 'w_bronze_sword', chance: 0.40 },
      { defId: 'h_qingtong', chance: 0.35 },
      { defId: 'b_tieshou', chance: 0.40 },
      { defId: 'r_gutong', chance: 0.40 }
    ]
  },
  'm_spider': {
    templateId: 'm_spider',
    name: '毒蜘蛛',
    level: 9,
    hp: 160,
    mp: 0,
    minDC: 7,
    maxDC: 15,
    minAC: 3,
    maxAC: 5,
    critRate: 0.08,
    haste: 5,
    baseAttackInterval: 8,
    goldDrop: [50, 120],
    expReward: 70,
    respawnTicks: 200, // 降低小怪刷新频率 (20秒复活)
    color: '#16a34a',
    icon: '🕷️',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.7, minCount: 1, maxCount: 2 },
      { defId: 'n_chuantong', chance: 0.35 },
      { defId: 'r_gutong', chance: 0.40 },
      { defId: 'w_bahuang', chance: 0.30 },
      { defId: 'a_qingkai', chance: 0.30 }
    ]
  },
  'm_skeleton': {
    templateId: 'm_skeleton',
    name: '骷髅战士',
    level: 15,
    hp: 350,
    mp: 0,
    minDC: 12,
    maxDC: 24,
    minAC: 5,
    maxAC: 9,
    critRate: 0.10,
    haste: 6,
    baseAttackInterval: 8,
    goldDrop: [120, 280],
    expReward: 160,
    respawnTicks: 220, // 降低小怪刷新频率 (22秒复活)
    color: '#94a3b8',
    icon: '💀',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.8, minCount: 2, maxCount: 4 },
      { defId: 'pot_mp_large', chance: 0.6, minCount: 1, maxCount: 3 },
      { defId: 'w_lingfeng', chance: 0.30 },
      { defId: 'a_qingkai', chance: 0.35 },
      { defId: 'b_jinshou', chance: 0.30 },
      { defId: 'h_daoshi', chance: 0.25 },
      { defId: 'n_kuangfeng', chance: 0.20 }
    ]
  },
  'm_zombie': {
    templateId: 'm_zombie',
    name: '矿区尸王',
    level: 22,
    hp: 750,
    mp: 0,
    minDC: 20,
    maxDC: 38,
    minAC: 8,
    maxAC: 14,
    critRate: 0.12,
    haste: 8,
    baseAttackInterval: 8,
    goldDrop: [250, 600],
    expReward: 350,
    respawnTicks: 240, // 降低小怪刷新频率 (24秒复活)
    color: '#7c3aed',
    icon: '🧟',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.9, minCount: 3, maxCount: 5 },
      { defId: 'w_zhanma', chance: 0.35 },
      { defId: 'n_kuangfeng', chance: 0.25 },
      { defId: 'r_shanhu', chance: 0.30 },
      { defId: 'a_zhongkai', chance: 0.30 }
    ]
  },
  'm_white_pig': {
    templateId: 'm_white_pig',
    name: '★ 白野猪(精英)',
    level: 30,
    hp: 2800, // 前期友好适度血量 (原 9500 -> 2800，动态随玩家等级成长)
    mp: 0,
    minDC: 18,
    maxDC: 32,
    minAC: 8,
    maxAC: 14,
    critRate: 0.12,
    haste: 6,
    baseAttackInterval: 8,
    goldDrop: [1200, 3000],
    expReward: 1600,
    isElite: true,
    respawnTicks: 90,
    color: '#e11d48',
    icon: '🐗',
    lootTable: [
      { defId: 'pot_sun', chance: 1.0, minCount: 3, maxCount: 6 },
      { defId: 'w_lianyu', chance: 0.40 }, // 沃玛套装神兵
      { defId: 'w_yinshe', chance: 0.35 },
      { defId: 'a_youling', chance: 0.30 },
      { defId: 'h_wooma', chance: 0.35 },
      { defId: 'n_youling', chance: 0.30 },
      { defId: 'b_yanluo', chance: 0.30 },
      { defId: 'r_hongbaoshi', chance: 0.30 }
    ]
  },
  'm_wooma_boss': {
    templateId: 'm_wooma_boss',
    name: '★★ 沃玛教主(首领)',
    level: 38,
    hp: 8800, // 前期友好血量 (原 45000 -> 8800，动态随成长提升)
    mp: 1000,
    minDC: 28,
    maxDC: 52,
    minAC: 15,
    maxAC: 25,
    critRate: 0.16,
    haste: 12,
    baseAttackInterval: 7,
    goldDrop: [5000, 15000],
    expReward: 6500,
    isBoss: true,
    respawnTicks: 160,
    color: '#dc2626',
    icon: '👹',
    lootTable: [
      { defId: 'pot_sun', chance: 1.0, minCount: 6, maxCount: 10 },
      { defId: 'pot_liaoshang', chance: 0.5, minCount: 1, maxCount: 3 },
      { defId: 'w_jingzhongyue', chance: 0.50 }, // 祖玛套装
      { defId: 'w_caijue', chance: 0.55 }, // 55% 爆裁决之杖！
      { defId: 'a_linghun', chance: 0.45 },
      { defId: 'a_zhanshen', chance: 0.48 },
      { defId: 'h_heitie', chance: 0.40 },
      { defId: 'n_lvse', chance: 0.40 },
      { defId: 'b_qishi', chance: 0.45 },
      { defId: 'r_liliang', chance: 0.50 },
      { defId: 'r_mabi', chance: 0.20 }, // 20% 爆麻痹戒指
      { defId: 'r_kuangfeng_ring', chance: 0.20 } // 20% 狂风特戒
    ]
  },
  'm_red_moon': {
    templateId: 'm_red_moon',
    name: '★★★ 赤月恶魔(神话)',
    level: 45,
    hp: 24000, // 前期友好神话Boss血量 (原 120000 -> 24000)
    mp: 3000,
    minDC: 42,
    maxDC: 75,
    minAC: 24,
    maxAC: 38,
    critRate: 0.22,
    haste: 16,
    baseAttackInterval: 6,
    goldDrop: [20000, 50000],
    expReward: 20000,
    isBoss: true,
    respawnTicks: 220,
    color: '#b91c1c',
    icon: '👿',
    lootTable: [
      { defId: 'pot_sun', chance: 1.0, minCount: 10, maxCount: 20 },
      { defId: 'pot_liaoshang', chance: 0.8, minCount: 3, maxCount: 6 },
      { defId: 'w_tulong', chance: 0.70 }, // 70% 爆烈焰屠龙！
      { defId: 'w_bazhe', chance: 0.50 }, // 霸者之刃
      { defId: 'a_shengzhan', chance: 0.75 }, // 圣战神铠
      { defId: 'h_shengzhan', chance: 0.60 },
      { defId: 'n_shengzhan', chance: 0.60 },
      { defId: 'b_shengzhan', chance: 0.65 },
      { defId: 'r_shengzhan', chance: 0.65 },
      { defId: 'r_mabi', chance: 0.35 }, // 35% 爆特戒麻痹
      { defId: 'r_fuhuo', chance: 0.30 }, // 30% 爆复活戒指！
      { defId: 'r_hushen', chance: 0.30 }, // 30% 爆护身戒指！
      { defId: 'r_xingyun', chance: 0.25 }, // 25% 幸运特戒！
      { defId: 'mat_pure_iron', chance: 0.8, minCount: 2, maxCount: 4 }
    ]
  },

  // 2阶 祖玛位面
  'm_zuma_statue': {
    templateId: 'm_zuma_statue',
    name: '祖玛雕像',
    level: 34,
    hp: 1200,
    mp: 0,
    minDC: 24,
    maxDC: 45,
    minAC: 12,
    maxAC: 20,
    critRate: 0.12,
    haste: 10,
    baseAttackInterval: 8,
    goldDrop: [800, 1800],
    expReward: 1200,
    respawnTicks: 180,
    color: '#d97706',
    icon: '🗿',
    lootTable: [
      { defId: 'pot_sun', chance: 0.8, minCount: 2, maxCount: 4 },
      { defId: 'mat_iron_ore', chance: 0.6, minCount: 1, maxCount: 3 },
      { defId: 'w_jingzhongyue', chance: 0.20 },
      { defId: 'h_heitie', chance: 0.20 }
    ]
  },
  'm_zuma_boss': {
    templateId: 'm_zuma_boss',
    name: '★★ 祖玛教主(首领)',
    level: 42,
    hp: 16000,
    mp: 2000,
    minDC: 38,
    maxDC: 68,
    minAC: 20,
    maxAC: 32,
    critRate: 0.18,
    haste: 14,
    baseAttackInterval: 7,
    goldDrop: [12000, 30000],
    expReward: 14000,
    isBoss: true,
    respawnTicks: 180,
    color: '#b45309',
    icon: '🐂',
    lootTable: [
      { defId: 'pot_sun', chance: 1.0, minCount: 6, maxCount: 12 },
      { defId: 'mat_iron_ore', chance: 0.9, minCount: 3, maxCount: 6 },
      { defId: 'mat_pure_iron', chance: 0.6, minCount: 1, maxCount: 3 },
      { defId: 'w_caijue', chance: 0.65 },
      { defId: 'a_zhanshen', chance: 0.55 },
      { defId: 'r_liliang', chance: 0.50 },
      { defId: 'r_mabi', chance: 0.25 },
      { defId: 'r_kuangfeng_ring', chance: 0.25 }
    ]
  },

  // 4阶 苍月骨魔位面
  'm_cangyue_skeleton': {
    templateId: 'm_cangyue_skeleton',
    name: '骨魔恶灵',
    level: 46,
    hp: 2200,
    mp: 0,
    minDC: 35,
    maxDC: 60,
    minAC: 16,
    maxAC: 26,
    critRate: 0.14,
    haste: 12,
    baseAttackInterval: 8,
    goldDrop: [1500, 3500],
    expReward: 2600,
    respawnTicks: 190,
    color: '#64748b',
    icon: '☠️',
    lootTable: [
      { defId: 'pot_sun', chance: 0.9, minCount: 3, maxCount: 6 },
      { defId: 'mat_pure_iron', chance: 0.5, minCount: 1, maxCount: 2 }
    ]
  },
  'm_huangquan_boss': {
    templateId: 'm_huangquan_boss',
    name: '★★★ 黄泉教主(魔王)',
    level: 50,
    hp: 36000,
    mp: 4000,
    minDC: 55,
    maxDC: 95,
    minAC: 28,
    maxAC: 44,
    critRate: 0.22,
    haste: 16,
    baseAttackInterval: 6,
    goldDrop: [30000, 70000],
    expReward: 35000,
    isBoss: true,
    respawnTicks: 220,
    color: '#0284c7',
    icon: '👻',
    lootTable: [
      { defId: 'pot_sun', chance: 1.0, minCount: 8, maxCount: 16 },
      { defId: 'pot_liaoshang', chance: 0.8, minCount: 2, maxCount: 4 },
      { defId: 'mat_pure_iron', chance: 0.9, minCount: 2, maxCount: 5 },
      { defId: 'mat_god_stone', chance: 0.3, minCount: 1, maxCount: 2 },
      { defId: 'w_tulong', chance: 0.50 },
      { defId: 'w_bazhe', chance: 0.40 },
      { defId: 'r_xingyun', chance: 0.30 }
    ]
  },

  // 5阶 雷霆雪域魔龙位面
  'm_molong_blade': {
    templateId: 'm_molong_blade',
    name: '魔龙战将',
    level: 53,
    hp: 4200,
    mp: 0,
    minDC: 50,
    maxDC: 85,
    minAC: 22,
    maxAC: 35,
    critRate: 0.16,
    haste: 14,
    baseAttackInterval: 7,
    goldDrop: [3000, 6500],
    expReward: 5000,
    respawnTicks: 200,
    color: '#7e22ce',
    icon: '🐲',
    lootTable: [
      { defId: 'pot_sun', chance: 1.0, minCount: 4, maxCount: 8 },
      { defId: 'mat_pure_iron', chance: 0.7, minCount: 1, maxCount: 3 }
    ]
  },
  'm_molong_boss': {
    templateId: 'm_molong_boss',
    name: '★★★ 魔龙教主(神兽)',
    level: 58,
    hp: 65000,
    mp: 6000,
    minDC: 75,
    maxDC: 130,
    minAC: 35,
    maxAC: 55,
    critRate: 0.25,
    haste: 18,
    baseAttackInterval: 6,
    goldDrop: [50000, 120000],
    expReward: 65000,
    isBoss: true,
    respawnTicks: 240,
    color: '#9333ea',
    icon: '🐉',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 1.0, minCount: 4, maxCount: 8 },
      { defId: 'mat_pure_iron', chance: 1.0, minCount: 3, maxCount: 6 },
      { defId: 'mat_god_stone', chance: 0.5, minCount: 1, maxCount: 3 },
      { defId: 'w_tulong', chance: 0.60 },
      { defId: 'r_hushen', chance: 0.35 },
      { defId: 'r_fuhuo', chance: 0.35 }
    ]
  },

  // 6阶 九霄牛魔位面
  'm_niumo_general': {
    templateId: 'm_niumo_general',
    name: '牛魔祭司',
    level: 57,
    hp: 7500,
    mp: 0,
    minDC: 70,
    maxDC: 120,
    minAC: 28,
    maxAC: 45,
    critRate: 0.18,
    haste: 15,
    baseAttackInterval: 7,
    goldDrop: [5000, 11000],
    expReward: 8500,
    respawnTicks: 200,
    color: '#ea580c',
    icon: '👺',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 0.8, minCount: 2, maxCount: 5 },
      { defId: 'mat_god_stone', chance: 0.4, minCount: 1, maxCount: 2 }
    ]
  },
  'm_niumo_boss': {
    templateId: 'm_niumo_boss',
    name: '★★★★ 牛魔王(至尊)',
    level: 64,
    hp: 110000,
    mp: 8000,
    minDC: 110,
    maxDC: 185,
    minAC: 45,
    maxAC: 70,
    critRate: 0.28,
    haste: 20,
    baseAttackInterval: 5,
    goldDrop: [80000, 200000],
    expReward: 120000,
    isBoss: true,
    respawnTicks: 250,
    color: '#c2410c',
    icon: '👑',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 1.0, minCount: 6, maxCount: 12 },
      { defId: 'mat_god_stone', chance: 0.8, minCount: 2, maxCount: 5 },
      { defId: 'r_mabi', chance: 0.40 },
      { defId: 'r_fuhuo', chance: 0.40 },
      { defId: 'r_xingyun', chance: 0.35 }
    ]
  },

  // 7阶 焚天火龙位面
  'm_huolong_beast': {
    templateId: 'm_huolong_beast',
    name: '炎狱魔龙',
    level: 66,
    hp: 13500,
    mp: 0,
    minDC: 100,
    maxDC: 170,
    minAC: 38,
    maxAC: 58,
    critRate: 0.20,
    haste: 16,
    baseAttackInterval: 7,
    goldDrop: [8000, 18000],
    expReward: 16000,
    respawnTicks: 210,
    color: '#ef4444',
    icon: '🔥',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 0.9, minCount: 3, maxCount: 6 },
      { defId: 'mat_god_stone', chance: 0.6, minCount: 1, maxCount: 3 }
    ]
  },
  'm_huolong_boss': {
    templateId: 'm_huolong_boss',
    name: '★★★★ 焚天火龙神(灭世)',
    level: 70,
    hp: 180000,
    mp: 12000,
    minDC: 150,
    maxDC: 260,
    minAC: 60,
    maxAC: 90,
    critRate: 0.30,
    haste: 22,
    baseAttackInterval: 5,
    goldDrop: [150000, 350000],
    expReward: 220000,
    isBoss: true,
    respawnTicks: 260,
    color: '#991b1b',
    icon: '🌋',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 1.0, minCount: 8, maxCount: 16 },
      { defId: 'mat_god_stone', chance: 1.0, minCount: 3, maxCount: 8 },
      { defId: 'r_mabi', chance: 0.45 },
      { defId: 'r_fuhuo', chance: 0.45 }
    ]
  },

  // 8阶 万劫修罗位面
  'm_shura_warrior': {
    templateId: 'm_shura_warrior',
    name: '万劫修罗兵',
    level: 72,
    hp: 24000,
    mp: 0,
    minDC: 140,
    maxDC: 240,
    minAC: 50,
    maxAC: 78,
    critRate: 0.22,
    haste: 18,
    baseAttackInterval: 6,
    goldDrop: [14000, 30000],
    expReward: 32000,
    respawnTicks: 220,
    color: '#831843',
    icon: '🥷',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 1.0, minCount: 4, maxCount: 8 },
      { defId: 'mat_god_stone', chance: 0.8, minCount: 2, maxCount: 4 }
    ]
  },
  'm_shura_boss': {
    templateId: 'm_shura_boss',
    name: '★★★★★ 万劫修罗皇(极恶)',
    level: 76,
    hp: 300000,
    mp: 20000,
    minDC: 220,
    maxDC: 380,
    minAC: 85,
    maxAC: 130,
    critRate: 0.35,
    haste: 25,
    baseAttackInterval: 5,
    goldDrop: [250000, 600000],
    expReward: 400000,
    isBoss: true,
    respawnTicks: 280,
    color: '#701a75',
    icon: '💀',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 1.0, minCount: 10, maxCount: 20 },
      { defId: 'mat_god_stone', chance: 1.0, minCount: 5, maxCount: 12 },
      { defId: 'r_mabi', chance: 0.50 },
      { defId: 'r_fuhuo', chance: 0.50 },
      { defId: 'r_hushen', chance: 0.50 }
    ]
  },

  // 9阶 混沌鸿蒙虚空位面
  'm_void_beast': {
    templateId: 'm_void_beast',
    name: '混沌虚空兽',
    level: 78,
    hp: 40000,
    mp: 0,
    minDC: 200,
    maxDC: 340,
    minAC: 70,
    maxAC: 105,
    critRate: 0.25,
    haste: 20,
    baseAttackInterval: 6,
    goldDrop: [25000, 55000],
    expReward: 60000,
    respawnTicks: 230,
    color: '#4c1d95',
    icon: '🌌',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 1.0, minCount: 5, maxCount: 10 },
      { defId: 'mat_god_stone', chance: 1.0, minCount: 3, maxCount: 6 }
    ]
  },
  'm_void_boss': {
    templateId: 'm_void_boss',
    name: '★★★★★★ 混元鸿蒙天尊(终极神道)',
    level: 85,
    hp: 600000,
    mp: 50000,
    minDC: 340,
    maxDC: 580,
    minAC: 120,
    maxAC: 180,
    critRate: 0.40,
    haste: 30,
    baseAttackInterval: 4,
    goldDrop: [500000, 1500000],
    expReward: 1000000,
    isBoss: true,
    respawnTicks: 300,
    color: '#facc15',
    icon: '⚡',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 1.0, minCount: 15, maxCount: 30 },
      { defId: 'mat_god_stone', chance: 1.0, minCount: 10, maxCount: 25 },
      { defId: 'r_mabi', chance: 0.60 },
      { defId: 'r_fuhuo', chance: 0.60 },
      { defId: 'r_hushen', chance: 0.60 },
      { defId: 'r_xingyun', chance: 0.60 }
    ]
  },
  'm_treasure_goblin': {
    templateId: 'm_treasure_goblin',
    name: '盗宝地精',
    level: 25,
    hp: 4000,
    mp: 0,
    minDC: 0,
    maxDC: 0,
    minAC: 6,
    maxAC: 12,
    critRate: 0,
    haste: 40,
    baseAttackInterval: 10,
    goldDrop: [50000, 150000],
    expReward: 6000,
    respawnTicks: 300,
    color: '#f59e0b',
    icon: '💰',
    lootTable: [
      { defId: 'pot_hp_large', chance: 1.0, minCount: 3, maxCount: 6 },
      { defId: 'pot_mp_large', chance: 1.0, minCount: 3, maxCount: 6 },
      { defId: 'mat_iron_ore', chance: 1.0, minCount: 8, maxCount: 16 },
      { defId: 'mat_pure_iron', chance: 0.8, minCount: 2, maxCount: 5 },
      { defId: 'mat_god_stone', chance: 0.35, minCount: 1, maxCount: 2 },
      { defId: 'pot_liaoshang', chance: 0.5, minCount: 1, maxCount: 2 }
    ]
  }
};
