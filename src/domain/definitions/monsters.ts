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
    respawnTicks: 150, // 15秒复活 (从容怪群节奏)
    color: '#a16207',
    icon: '🌾',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.35, minCount: 1, maxCount: 1 },
      { defId: 'w_wood_sword', chance: 0.10 },
      { defId: 'a_buyi', chance: 0.08 },
      { defId: 'h_qingtong', chance: 0.06 }
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
    respawnTicks: 150, // 15秒复活
    color: '#ca8a04',
    icon: '🐱',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.35, minCount: 1, maxCount: 1 },
      { defId: 'w_bronze_sword', chance: 0.09 },
      { defId: 'h_qingtong', chance: 0.08 },
      { defId: 'b_tieshou', chance: 0.08 },
      { defId: 'r_gutong', chance: 0.08 },
      { defId: 'r_tanlan', chance: 0.01 } // 1% 极小概率爆贪婪特戒
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
    respawnTicks: 160, // 16秒复活
    color: '#16a34a',
    icon: '🕷️',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.35, minCount: 1, maxCount: 1 },
      { defId: 'n_chuantong', chance: 0.08 },
      { defId: 'r_gutong', chance: 0.08 },
      { defId: 'w_bahuang', chance: 0.08 },
      { defId: 'a_qingkai', chance: 0.07 }
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
    respawnTicks: 160, // 16秒复活
    color: '#94a3b8',
    icon: '💀',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.35, minCount: 1, maxCount: 2 },
      { defId: 'pot_mp_large', chance: 0.25, minCount: 1, maxCount: 1 },
      { defId: 'w_lingfeng', chance: 0.08 },
      { defId: 'a_qingkai', chance: 0.08 },
      { defId: 'b_jinshou', chance: 0.07 },
      { defId: 'h_daoshi', chance: 0.06 },
      { defId: 'n_kuangfeng', chance: 0.05 },
      { defId: 'r_tanlan', chance: 0.01 } // 1% 极小概率爆贪婪特戒
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
    isBoss: true,
    respawnTicks: 600, // 60秒刷新
    color: '#7c3aed',
    icon: '🧟',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.45, minCount: 1, maxCount: 3 },
      { defId: 'w_zhanma', chance: 0.12 },
      { defId: 'n_kuangfeng', chance: 0.08 },
      { defId: 'r_shanhu', chance: 0.09 },
      { defId: 'a_zhongkai', chance: 0.09 },
      { defId: 'r_tanlan', chance: 0.08 } // 8% 爆出贪婪特戒
    ]
  },
  'm_white_pig': {
    templateId: 'm_white_pig',
    name: '★ 白野猪(精英)',
    level: 30,
    hp: 18000, // 提升血量 (原 3500 -> 18000)
    mp: 0,
    minDC: 24,
    maxDC: 42,
    minAC: 12,
    maxAC: 20,
    critRate: 0.12,
    haste: 6,
    baseAttackInterval: 8,
    goldDrop: [2500, 6000],
    expReward: 1200,
    isElite: true,
    respawnTicks: 400, // 40秒复活 (精英怪)
    color: '#e11d48',
    icon: '🐗',
    lootTable: [
      { defId: 'pot_sun', chance: 0.45, minCount: 1, maxCount: 3 },
      { defId: 'pot_blessing_oil', chance: 0.15 }, // 掉落祝福油
      { defId: 'mat_reforge_stone', chance: 0.12 }, // 掉落洗炼石
      { defId: 'w_lianyu', chance: 0.14 }, // 沃玛神兵
      { defId: 'w_yinshe', chance: 0.12 },
      { defId: 'a_youling', chance: 0.10 },
      { defId: 'h_wooma', chance: 0.10 },
      { defId: 'n_youling', chance: 0.10 },
      { defId: 'b_yanluo', chance: 0.10 },
      { defId: 'r_hongbaoshi', chance: 0.10 },
      { defId: 'r_tanlan', chance: 0.10 } // 10% 爆出贪婪特戒
    ]
  },
  'm_wooma_boss': {
    templateId: 'm_wooma_boss',
    name: '★★ 沃玛教主(首领)',
    level: 38,
    hp: 65000, // 提升血量 (原 12000 -> 65000)
    mp: 1000,
    minDC: 38,
    maxDC: 68,
    minAC: 20,
    maxAC: 32,
    critRate: 0.16,
    haste: 10,
    baseAttackInterval: 8, // 0.8秒一击，稳健有力
    goldDrop: [8000, 20000],
    expReward: 4800,
    isBoss: true,
    respawnTicks: 750, // 75秒刷新一次
    color: '#dc2626',
    icon: '👹',
    lootTable: [
      { defId: 'pot_sun', chance: 0.60, minCount: 2, maxCount: 4 },
      { defId: 'pot_liaoshang', chance: 0.25, minCount: 1, maxCount: 2 },
      { defId: 'pot_blessing_oil', chance: 0.35, minCount: 1, maxCount: 2 },
      { defId: 'mat_reforge_stone', chance: 0.25, minCount: 1, maxCount: 2 },
      { defId: 'w_jingzhongyue', chance: 0.18 },
      { defId: 'w_caijue', chance: 0.18 },
      { defId: 'a_linghun', chance: 0.15 },
      { defId: 'a_zhanshen', chance: 0.15 },
      { defId: 'h_heitie', chance: 0.12 },
      { defId: 'n_lvse', chance: 0.12 },
      { defId: 'b_qishi', chance: 0.14 },
      { defId: 'r_liliang', chance: 0.15 },
      { defId: 'r_mabi', chance: 0.06 },
      { defId: 'r_kuangfeng_ring', chance: 0.06 },
      { defId: 'r_tanlan', chance: 0.08 } // 8% 爆贪婪特戒
    ]
  },
  'm_red_moon': {
    templateId: 'm_red_moon',
    name: '★★★ 赤月恶魔(神话)',
    level: 45,
    hp: 450000, // 大幅提升血量 (原 36000 -> 450000)
    mp: 3000,
    minDC: 55,
    maxDC: 95,
    minAC: 35,
    maxAC: 55,
    critRate: 0.22,
    haste: 12,
    baseAttackInterval: 8,
    goldDrop: [35000, 80000],
    expReward: 15000,
    isBoss: true,
    respawnTicks: 800, // 80秒刷新一次
    color: '#b91c1c',
    icon: '👿',
    lootTable: [
      { defId: 'pot_sun', chance: 0.60, minCount: 3, maxCount: 6 },
      { defId: 'pot_liaoshang', chance: 0.40, minCount: 1, maxCount: 3 },
      { defId: 'pot_blessing_oil', chance: 0.50, minCount: 1, maxCount: 3 },
      { defId: 'mat_reforge_stone', chance: 0.40, minCount: 1, maxCount: 3 },
      { defId: 'w_tulong', chance: 0.22 },
      { defId: 'w_bazhe', chance: 0.18 },
      { defId: 'a_shengzhan', chance: 0.22 },
      { defId: 'h_shengzhan', chance: 0.18 },
      { defId: 'n_shengzhan', chance: 0.18 },
      { defId: 'b_shengzhan', chance: 0.18 },
      { defId: 'r_shengzhan', chance: 0.18 },
      { defId: 'r_mabi', chance: 0.08 },
      { defId: 'r_fuhuo', chance: 0.08 },
      { defId: 'r_hushen', chance: 0.08 },
      { defId: 'r_xingyun', chance: 0.07 },
      { defId: 'r_tanlan', chance: 0.10 }, // 10% 爆贪婪特戒
      { defId: 'mat_pure_iron', chance: 0.35, minCount: 1, maxCount: 2 }
    ]
  },

  // 2阶 祖玛位面
  'm_zuma_statue': {
    templateId: 'm_zuma_statue',
    name: '祖玛雕像',
    level: 34,
    hp: 4500,
    mp: 0,
    minDC: 28,
    maxDC: 48,
    minAC: 16,
    maxAC: 26,
    critRate: 0.12,
    haste: 10,
    baseAttackInterval: 8,
    goldDrop: [800, 1800],
    expReward: 600,
    respawnTicks: 180, // 18秒复活
    color: '#d97706',
    icon: '🗿',
    lootTable: [
      { defId: 'pot_sun', chance: 0.30, minCount: 1, maxCount: 2 },
      { defId: 'mat_iron_ore', chance: 0.25, minCount: 1, maxCount: 2 },
      { defId: 'pot_blessing_oil', chance: 0.08 },
      { defId: 'mat_reforge_stone', chance: 0.08 },
      { defId: 'w_jingzhongyue', chance: 0.06 },
      { defId: 'h_heitie', chance: 0.06 }
    ]
  },
  'm_zuma_boss': {
    templateId: 'm_zuma_boss',
    name: '★★ 祖玛教主(首领)',
    level: 42,
    hp: 180000,
    mp: 2000,
    minDC: 48,
    maxDC: 82,
    minAC: 28,
    maxAC: 44,
    critRate: 0.18,
    haste: 14,
    baseAttackInterval: 7,
    goldDrop: [15000, 35000],
    expReward: 8000,
    isBoss: true,
    respawnTicks: 800, // 80秒刷新
    color: '#b45309',
    icon: '🐂',
    lootTable: [
      { defId: 'pot_sun', chance: 0.60, minCount: 2, maxCount: 5 },
      { defId: 'pot_liaoshang', chance: 0.30, minCount: 1, maxCount: 2 },
      { defId: 'pot_blessing_oil', chance: 0.40, minCount: 1, maxCount: 2 },
      { defId: 'mat_reforge_stone', chance: 0.30, minCount: 1, maxCount: 2 },
      { defId: 'mat_iron_ore', chance: 0.45, minCount: 1, maxCount: 3 },
      { defId: 'mat_pure_iron', chance: 0.25, minCount: 1, maxCount: 2 },
      { defId: 'w_caijue', chance: 0.20 },
      { defId: 'a_zhanshen', chance: 0.16 },
      { defId: 'r_liliang', chance: 0.15 },
      { defId: 'r_mabi', chance: 0.07 },
      { defId: 'r_kuangfeng_ring', chance: 0.07 },
      { defId: 'r_tanlan', chance: 0.10 } // 10% 爆贪婪特戒
    ]
  },

  // 4阶 苍月骨魔位面
  'm_cangyue_skeleton': {
    templateId: 'm_cangyue_skeleton',
    name: '骨魔恶灵',
    level: 46,
    hp: 9000,
    mp: 0,
    minDC: 42,
    maxDC: 72,
    minAC: 22,
    maxAC: 34,
    critRate: 0.14,
    haste: 12,
    baseAttackInterval: 8,
    goldDrop: [1800, 4200],
    expReward: 1200,
    respawnTicks: 180, // 18秒复活
    color: '#64748b',
    icon: '☠️',
    lootTable: [
      { defId: 'pot_sun', chance: 0.35, minCount: 1, maxCount: 2 },
      { defId: 'pot_blessing_oil', chance: 0.10 },
      { defId: 'mat_reforge_stone', chance: 0.10 },
      { defId: 'mat_pure_iron', chance: 0.20, minCount: 1, maxCount: 1 }
    ]
  },
  'm_huangquan_boss': {
    templateId: 'm_huangquan_boss',
    name: '★★★ 黄泉教主(魔王)',
    level: 50,
    hp: 750000,
    mp: 4000,
    minDC: 75,
    maxDC: 125,
    minAC: 38,
    maxAC: 58,
    critRate: 0.22,
    haste: 16,
    baseAttackInterval: 6,
    goldDrop: [35000, 85000],
    expReward: 18000,
    isBoss: true,
    respawnTicks: 900, // 90秒刷新
    color: '#0284c7',
    icon: '👻',
    lootTable: [
      { defId: 'pot_sun', chance: 0.60, minCount: 2, maxCount: 5 },
      { defId: 'pot_liaoshang', chance: 0.40, minCount: 1, maxCount: 3 },
      { defId: 'pot_blessing_oil', chance: 0.50, minCount: 1, maxCount: 3 },
      { defId: 'mat_reforge_stone', chance: 0.40, minCount: 1, maxCount: 3 },
      { defId: 'mat_pure_iron', chance: 0.40, minCount: 1, maxCount: 2 },
      { defId: 'mat_god_stone', chance: 0.18, minCount: 1, maxCount: 1 },
      { defId: 'w_tulong', chance: 0.18 },
      { defId: 'w_bazhe', chance: 0.15 },
      { defId: 'r_xingyun', chance: 0.08 },
      { defId: 'r_tanlan', chance: 0.12 } // 12% 爆贪婪特戒
    ]
  },

  // 5阶 雷霆雪域魔龙位面
  'm_molong_blade': {
    templateId: 'm_molong_blade',
    name: '魔龙战将',
    level: 53,
    hp: 18000,
    mp: 0,
    minDC: 60,
    maxDC: 100,
    minAC: 30,
    maxAC: 46,
    critRate: 0.16,
    haste: 14,
    baseAttackInterval: 7,
    goldDrop: [3500, 8000],
    expReward: 2200,
    respawnTicks: 200, // 20秒复活
    color: '#7e22ce',
    icon: '🐲',
    lootTable: [
      { defId: 'pot_sun', chance: 0.35, minCount: 1, maxCount: 3 },
      { defId: 'pot_blessing_oil', chance: 0.12 },
      { defId: 'mat_reforge_stone', chance: 0.12 },
      { defId: 'mat_pure_iron', chance: 0.25, minCount: 1, maxCount: 1 }
    ]
  },
  'm_molong_boss': {
    templateId: 'm_molong_boss',
    name: '★★★ 魔龙教主(神兽)',
    level: 58,
    hp: 1600000,
    mp: 6000,
    minDC: 120,
    maxDC: 195,
    minAC: 60,
    maxAC: 90,
    critRate: 0.25,
    haste: 18,
    baseAttackInterval: 6,
    goldDrop: [60000, 150000],
    expReward: 32000,
    isBoss: true,
    respawnTicks: 1000, // 100秒刷新一次
    color: '#9333ea',
    icon: '🐉',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 0.50, minCount: 2, maxCount: 4 },
      { defId: 'pot_blessing_oil', chance: 0.60, minCount: 2, maxCount: 4 },
      { defId: 'mat_reforge_stone', chance: 0.50, minCount: 2, maxCount: 4 },
      { defId: 'mat_pure_iron', chance: 0.45, minCount: 1, maxCount: 3 },
      { defId: 'mat_god_stone', chance: 0.25, minCount: 1, maxCount: 2 },
      { defId: 'w_tulong', chance: 0.20 },
      { defId: 'r_hushen', chance: 0.09 },
      { defId: 'r_fuhuo', chance: 0.09 },
      { defId: 'r_tanlan', chance: 0.12 } // 12% 爆贪婪特戒
    ]
  },

  // 6阶 九霄牛魔位面
  'm_niumo_general': {
    templateId: 'm_niumo_general',
    name: '牛魔祭司',
    level: 57,
    hp: 32000,
    mp: 0,
    minDC: 85,
    maxDC: 140,
    minAC: 40,
    maxAC: 60,
    critRate: 0.18,
    haste: 15,
    baseAttackInterval: 7,
    goldDrop: [6000, 14000],
    expReward: 3600,
    respawnTicks: 200, // 20秒复活
    color: '#ea580c',
    icon: '👺',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 0.35, minCount: 1, maxCount: 2 },
      { defId: 'pot_blessing_oil', chance: 0.15 },
      { defId: 'mat_reforge_stone', chance: 0.15 },
      { defId: 'mat_god_stone', chance: 0.20, minCount: 1, maxCount: 1 }
    ]
  },
  'm_niumo_boss': {
    templateId: 'm_niumo_boss',
    name: '★★★★ 牛魔王(至尊)',
    level: 64,
    hp: 3500000,
    mp: 8000,
    minDC: 175,
    maxDC: 280,
    minAC: 90,
    maxAC: 135,
    critRate: 0.28,
    haste: 20,
    baseAttackInterval: 5,
    goldDrop: [90000, 240000],
    expReward: 48000,
    isBoss: true,
    respawnTicks: 1100, // 110秒刷新一次
    color: '#c2410c',
    icon: '👑',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 0.55, minCount: 2, maxCount: 5 },
      { defId: 'pot_blessing_oil', chance: 0.65, minCount: 2, maxCount: 5 },
      { defId: 'mat_reforge_stone', chance: 0.55, minCount: 2, maxCount: 4 },
      { defId: 'mat_god_stone', chance: 0.30, minCount: 1, maxCount: 2 },
      { defId: 'r_mabi', chance: 0.10 },
      { defId: 'r_fuhuo', chance: 0.10 },
      { defId: 'r_xingyun', chance: 0.09 },
      { defId: 'r_tanlan', chance: 0.12 } // 12% 爆贪婪特戒
    ]
  },

  // 7阶 焚天火龙位面
  'm_huolong_beast': {
    templateId: 'm_huolong_beast',
    name: '炎狱魔龙',
    level: 66,
    hp: 65000,
    mp: 0,
    minDC: 120,
    maxDC: 195,
    minAC: 50,
    maxAC: 75,
    critRate: 0.20,
    haste: 16,
    baseAttackInterval: 7,
    goldDrop: [10000, 22000],
    expReward: 6500,
    respawnTicks: 220, // 22秒复活
    color: '#ef4444',
    icon: '🔥',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 0.35, minCount: 1, maxCount: 2 },
      { defId: 'pot_blessing_oil', chance: 0.18 },
      { defId: 'mat_reforge_stone', chance: 0.18 },
      { defId: 'mat_god_stone', chance: 0.25, minCount: 1, maxCount: 1 }
    ]
  },
  'm_huolong_boss': {
    templateId: 'm_huolong_boss',
    name: '★★★★ 焚天火龙神(灭世)',
    level: 70,
    hp: 7200000,
    mp: 12000,
    minDC: 260,
    maxDC: 420,
    minAC: 135,
    maxAC: 190,
    critRate: 0.30,
    haste: 22,
    baseAttackInterval: 5,
    goldDrop: [180000, 420000],
    expReward: 80000,
    isBoss: true,
    respawnTicks: 1200, // 120秒刷新一次
    color: '#991b1b',
    icon: '🌋',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 0.60, minCount: 3, maxCount: 6 },
      { defId: 'pot_blessing_oil', chance: 0.70, minCount: 3, maxCount: 6 },
      { defId: 'mat_reforge_stone', chance: 0.60, minCount: 3, maxCount: 5 },
      { defId: 'pot_super_blessing_oil', chance: 0.15 },
      { defId: 'mat_god_stone', chance: 0.35, minCount: 1, maxCount: 3 },
      { defId: 'r_mabi', chance: 0.12 },
      { defId: 'r_fuhuo', chance: 0.12 },
      { defId: 'r_tanlan', chance: 0.14 } // 14% 爆贪婪特戒
    ]
  },

  // 8阶 万劫修罗位面
  'm_shura_warrior': {
    templateId: 'm_shura_warrior',
    name: '万劫修罗兵',
    level: 72,
    hp: 120000,
    mp: 0,
    minDC: 160,
    maxDC: 270,
    minAC: 65,
    maxAC: 95,
    critRate: 0.22,
    haste: 18,
    baseAttackInterval: 6,
    goldDrop: [16000, 36000],
    expReward: 12000,
    respawnTicks: 220, // 22秒复活
    color: '#831843',
    icon: '🥷',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 0.40, minCount: 1, maxCount: 2 },
      { defId: 'pot_blessing_oil', chance: 0.20 },
      { defId: 'mat_reforge_stone', chance: 0.20 },
      { defId: 'mat_god_stone', chance: 0.28, minCount: 1, maxCount: 1 }
    ]
  },
  'm_shura_boss': {
    templateId: 'm_shura_boss',
    name: '★★★★★ 万劫修罗皇(极恶)',
    level: 76,
    hp: 15000000,
    mp: 20000,
    minDC: 380,
    maxDC: 600,
    minAC: 180,
    maxAC: 250,
    critRate: 0.35,
    haste: 25,
    baseAttackInterval: 5,
    goldDrop: [300000, 750000],
    expReward: 130000,
    isBoss: true,
    respawnTicks: 1200, // 120秒刷新一次
    color: '#701a75',
    icon: '💀',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 0.60, minCount: 3, maxCount: 8 },
      { defId: 'pot_blessing_oil', chance: 0.75, minCount: 3, maxCount: 6 },
      { defId: 'mat_reforge_stone', chance: 0.65, minCount: 3, maxCount: 6 },
      { defId: 'pot_super_blessing_oil', chance: 0.25 },
      { defId: 'mat_god_stone', chance: 0.45, minCount: 2, maxCount: 4 },
      { defId: 'r_mabi', chance: 0.13 },
      { defId: 'r_fuhuo', chance: 0.13 },
      { defId: 'r_hushen', chance: 0.13 },
      { defId: 'r_tanlan', chance: 0.14 } // 14% 爆贪婪特戒
    ]
  },

  // 9阶 混沌鸿蒙虚空位面
  'm_void_beast': {
    templateId: 'm_void_beast',
    name: '混沌虚空兽',
    level: 78,
    hp: 250000,
    mp: 0,
    minDC: 230,
    maxDC: 380,
    minAC: 85,
    maxAC: 125,
    critRate: 0.25,
    haste: 20,
    baseAttackInterval: 6,
    goldDrop: [30000, 70000],
    expReward: 22000,
    respawnTicks: 220, // 22秒复活
    color: '#4c1d95',
    icon: '🌌',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 0.45, minCount: 1, maxCount: 2 },
      { defId: 'pot_blessing_oil', chance: 0.25 },
      { defId: 'mat_reforge_stone', chance: 0.25 },
      { defId: 'mat_god_stone', chance: 0.35, minCount: 1, maxCount: 2 }
    ]
  },
  'm_void_boss': {
    templateId: 'm_void_boss',
    name: '★★★★★★ 混元鸿蒙天尊(终极神道)',
    level: 85,
    hp: 28000000,
    mp: 50000,
    minDC: 600,
    maxDC: 960,
    minAC: 250,
    maxAC: 360,
    critRate: 0.40,
    haste: 30,
    baseAttackInterval: 4,
    goldDrop: [600000, 1800000],
    expReward: 280000,
    isBoss: true,
    respawnTicks: 1200, // 120秒刷新一次
    color: '#facc15',
    icon: '⚡',
    lootTable: [
      { defId: 'pot_liaoshang', chance: 0.65, minCount: 4, maxCount: 10 },
      { defId: 'pot_blessing_oil', chance: 0.85, minCount: 4, maxCount: 8 },
      { defId: 'mat_reforge_stone', chance: 0.75, minCount: 4, maxCount: 8 },
      { defId: 'pot_super_blessing_oil', chance: 0.40 },
      { defId: 'mat_god_stone', chance: 0.50, minCount: 2, maxCount: 6 },
      { defId: 'r_mabi', chance: 0.15 },
      { defId: 'r_fuhuo', chance: 0.15 },
      { defId: 'r_hushen', chance: 0.15 },
      { defId: 'r_xingyun', chance: 0.15 },
      { defId: 'r_tanlan', chance: 0.15 } // 15% 爆贪婪特戒
    ]
  },
  'm_treasure_goblin': {
    templateId: 'm_treasure_goblin',
    name: '盗宝地精',
    level: 25,
    hp: 15000,
    mp: 0,
    minDC: 0,
    maxDC: 0,
    minAC: 10,
    maxAC: 18,
    critRate: 0,
    haste: 40,
    baseAttackInterval: 10,
    goldDrop: [80000, 250000],
    expReward: 3500,
    respawnTicks: 450, // 45秒刷新一次 (聚宝偶遇)
    color: '#f59e0b',
    icon: '💰',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.50, minCount: 1, maxCount: 3 },
      { defId: 'pot_mp_large', chance: 0.50, minCount: 1, maxCount: 3 },
      { defId: 'mat_iron_ore', chance: 0.50, minCount: 3, maxCount: 6 },
      { defId: 'mat_pure_iron', chance: 0.35, minCount: 1, maxCount: 2 },
      { defId: 'mat_god_stone', chance: 0.20, minCount: 1, maxCount: 1 },
      { defId: 'pot_liaoshang', chance: 0.35, minCount: 1, maxCount: 2 },
      { defId: 'pot_blessing_oil', chance: 0.40, minCount: 1, maxCount: 2 },
      { defId: 'mat_reforge_stone', chance: 0.35, minCount: 1, maxCount: 2 },
      { defId: 'r_tanlan', chance: 0.25 } // 25% 聚宝核心高爆贪婪特戒！
    ]
  }
};
