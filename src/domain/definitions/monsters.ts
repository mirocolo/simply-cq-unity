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
    expReward: 8,
    respawnTicks: 300, // 30秒复活
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
    expReward: 18,
    respawnTicks: 320, // 32秒复活
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
    expReward: 35,
    respawnTicks: 350, // 35秒复活
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
    expReward: 80,
    respawnTicks: 380, // 38秒复活
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
    hp: 850,
    mp: 0,
    minDC: 20,
    maxDC: 38,
    minAC: 8,
    maxAC: 14,
    critRate: 0.12,
    haste: 8,
    baseAttackInterval: 8,
    goldDrop: [250, 600],
    expReward: 180,
    respawnTicks: 600, // 60秒复活
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
    hp: 3500,
    mp: 0,
    minDC: 20,
    maxDC: 36,
    minAC: 9,
    maxAC: 16,
    critRate: 0.12,
    haste: 6,
    baseAttackInterval: 8,
    goldDrop: [1200, 3000],
    expReward: 800,
    isElite: true,
    respawnTicks: 600, // 60秒复活 (精英稀有)
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
    hp: 12000,
    mp: 1000,
    minDC: 32,
    maxDC: 58,
    minAC: 16,
    maxAC: 26,
    critRate: 0.16,
    haste: 12,
    baseAttackInterval: 7,
    goldDrop: [5000, 15000],
    expReward: 3200,
    isBoss: true,
    respawnTicks: 1200, // 2分钟 (120秒) 刷新一次
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
    hp: 36000,
    mp: 3000,
    minDC: 48,
    maxDC: 85,
    minAC: 26,
    maxAC: 42,
    critRate: 0.22,
    haste: 16,
    baseAttackInterval: 6,
    goldDrop: [20000, 50000],
    expReward: 9800,
    isBoss: true,
    respawnTicks: 1800, // 3分钟 (180秒) 刷新一次
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
    expReward: 600,
    respawnTicks: 400, // 40秒复活
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
    hp: 22000,
    mp: 2000,
    minDC: 42,
    maxDC: 76,
    minAC: 24,
    maxAC: 38,
    critRate: 0.18,
    haste: 14,
    baseAttackInterval: 7,
    goldDrop: [12000, 30000],
    expReward: 6800,
    isBoss: true,
    respawnTicks: 1500, // 2.5分钟 (150秒) 刷新
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
    expReward: 1200,
    respawnTicks: 420, // 42秒复活
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
    hp: 58000,
    mp: 4000,
    minDC: 65,
    maxDC: 110,
    minAC: 32,
    maxAC: 50,
    critRate: 0.22,
    haste: 16,
    baseAttackInterval: 6,
    goldDrop: [30000, 70000],
    expReward: 16000,
    isBoss: true,
    respawnTicks: 2000, // 3.3分钟 (200秒) 刷新
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
    expReward: 2200,
    respawnTicks: 450, // 45秒复活
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
    hp: 160000, // 大幅提升后期Boss血量坦度 (原65000 -> 160000)
    mp: 6000,
    minDC: 110, // 提升攻击力 (原75 -> 110)
    maxDC: 180, // (原130 -> 180)
    minAC: 55,  // 强化防御 (原35 -> 55)
    maxAC: 80,  // (原55 -> 80)
    critRate: 0.25,
    haste: 18,
    baseAttackInterval: 6,
    goldDrop: [50000, 120000],
    expReward: 28000,
    isBoss: true,
    respawnTicks: 2400, // 4分钟 (240秒) 刷新一次
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
    expReward: 3600,
    respawnTicks: 450, // 45秒复活
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
    hp: 320000, // 提升血量 (原110000 -> 320000)
    mp: 8000,
    minDC: 160, // 提升攻击 (原110 -> 160)
    maxDC: 260, // (原185 -> 260)
    minAC: 80,  // 提升防御 (原45 -> 80)
    maxAC: 120, // (原70 -> 120)
    critRate: 0.28,
    haste: 20,
    baseAttackInterval: 5,
    goldDrop: [80000, 200000],
    expReward: 45000, // 控制经验膨胀 (原120000 -> 45000)
    isBoss: true,
    respawnTicks: 3000, // 5分钟 (300秒) 刷新一次
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
    expReward: 6500, // 控制经验 (原16000 -> 6500)
    respawnTicks: 480, // 48秒复活
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
    hp: 650000, // 大幅提升HP (原180000 -> 650000)
    mp: 12000,
    minDC: 240, // (原150 -> 240)
    maxDC: 380, // (原260 -> 380)
    minAC: 120, // (原60 -> 120)
    maxAC: 170, // (原90 -> 170)
    critRate: 0.30,
    haste: 22,
    baseAttackInterval: 5,
    goldDrop: [150000, 350000],
    expReward: 75000, // (原220000 -> 75000)
    isBoss: true,
    respawnTicks: 3600, // 6分钟 (360秒) 刷新一次
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
    expReward: 12000, // (原32000 -> 12000)
    respawnTicks: 500, // 50秒复活
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
    hp: 1200000, // 大幅提升HP (原300000 -> 1200000)
    mp: 20000,
    minDC: 350,  // (原220 -> 350)
    maxDC: 550,  // (原380 -> 550)
    minAC: 160,  // (原85 -> 160)
    maxAC: 230,  // (原130 -> 230)
    critRate: 0.35,
    haste: 25,
    baseAttackInterval: 5,
    goldDrop: [250000, 600000],
    expReward: 120000, // (原400000 -> 120000)
    isBoss: true,
    respawnTicks: 4500, // 7.5分钟 (450秒) 刷新一次
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
    expReward: 22000, // (原60000 -> 22000)
    respawnTicks: 520, // 52秒复活
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
    hp: 2600000, // 终极神级血量 (原600000 -> 2600000)
    mp: 50000,
    minDC: 550,  // (原340 -> 550)
    maxDC: 880,  // (原580 -> 880)
    minAC: 220,  // (原120 -> 220)
    maxAC: 320,  // (原180 -> 320)
    critRate: 0.40,
    haste: 30,
    baseAttackInterval: 4,
    goldDrop: [500000, 1500000],
    expReward: 250000, // (原1000000 -> 250000)
    isBoss: true,
    respawnTicks: 6000, // 10分钟 (600秒) 刷新一次
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
    expReward: 2500, // (原6000 -> 2500)
    respawnTicks: 1200, // 2分钟 (120秒) 刷新一次
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
