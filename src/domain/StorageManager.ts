import { AutoPilotConfig, EquipSlot, ItemInstance, SkillDef } from '../types/game';
import { DropSystem } from './DropSystem';

export interface SaveData {
  version: number;
  savedAt: number;
  player: {
    level: number;
    ascensionTier?: number;
    hp: number;
    mp: number;
    exp: number;
    gold: number;
  };
  equipped: Partial<Record<EquipSlot, ItemInstance>>;
  inventory: ItemInstance[];
  autoConfig: AutoPilotConfig;
  skills?: SkillDef[];
  slotEnhancements?: Partial<Record<EquipSlot, number>>;
  slotEnhancePity?: Partial<Record<EquipSlot, number>>;
  currentMapId?: string;
  unlockedMaps?: string[];
  monsterKills?: Record<string, number>;
  codexClaimedTiers?: Record<string, number[]>;
  activeBounties?: import('../types/codex').BountyTask[];
  talentAllocations?: Record<string, number>;
}

export interface OfflineReward {
  offlineSeconds: number;
  expGained: number;
  goldGained: number;
  itemsGained: ItemInstance[];
}

const STORAGE_KEY = 'SIMPLY_CQ_WEB_SAVE_V1';

export class StorageManager {
  /**
   * 保存游戏到 LocalStorage
   */
  static saveGame(data: Omit<SaveData, 'version' | 'savedAt'>): void {
    try {
      const fullData: SaveData = {
        version: 1,
        savedAt: Date.now(),
        ...data
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullData));
    } catch (e) {
      console.error('Failed to save game to localStorage', e);
    }
  }

  /**
   * 读取本地存档
   */
  static loadGame(): SaveData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SaveData;
    } catch (e) {
      console.error('Failed to load game from localStorage', e);
      return null;
    }
  }

  /**
   * 计算离线挂机收益 (最少 60 秒，上限 8 小时)
   */
  static calculateOfflineReward(savedAt: number, level: number): OfflineReward | null {
    const elapsedSeconds = Math.floor((Date.now() - savedAt) / 1000);
    if (elapsedSeconds < 60) return null; // 短离线不计算

    // 上限 8 小时 (28800 秒)
    const effectiveSeconds = Math.min(28800, elapsedSeconds);

    // 假设每 5 秒击杀一只适合等级的野怪
    const estimatedKills = Math.floor(effectiveSeconds / 5);
    const expGained = estimatedKills * (20 + level * 15);
    const goldGained = estimatedKills * (30 + level * 25);

    // 离线最多摇出 3 件过渡装备/药水 (品质封顶精良蓝)
    const itemsGained: ItemInstance[] = [];
    const dropPool = ['pot_hp_large', 'pot_mp_large', 'w_bahuang', 'w_lingfeng', 'a_qingkai', 'b_jinshou', 'r_shanhu'];

    for (let i = 0; i < Math.min(3, Math.floor(estimatedKills / 30)); i++) {
      const randDef = dropPool[Math.floor(Math.random() * dropPool.length)];
      const quality = Math.random() < 0.2 ? 2 : (Math.random() < 0.5 ? 1 : 0);
      const it = DropSystem.createItemInstance(randDef, quality);
      if (it) itemsGained.push(it);
    }

    return {
      offlineSeconds: effectiveSeconds,
      expGained,
      goldGained,
      itemsGained
    };
  }

  /**
   * 导出 JSON 存档
   */
  static exportSave(): string {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  /**
   * 导入 JSON 存档
   */
  static importSave(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.version) {
        localStorage.setItem(STORAGE_KEY, jsonStr);
        return true;
      }
    } catch (e) {
      console.error('Import save failed', e);
    }
    return false;
  }

  /**
   * 清除存档
   */
  static clearSave(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
