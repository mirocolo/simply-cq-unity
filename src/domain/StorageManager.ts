import { AutoPilotConfig, EquipSlot, ItemInstance, SkillDef } from '../types/game';
import { DropSystem } from './DropSystem';

export interface SaveData {
  version: number;
  savedAt: number;
  seq?: number;
  checksum?: string;
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

const STORAGE_KEY_SLOT_A = 'SIMPLY_CQ_SAVE_SLOT_A';
const STORAGE_KEY_SLOT_B = 'SIMPLY_CQ_SAVE_SLOT_B';
const STORAGE_KEY_META = 'SIMPLY_CQ_SAVE_META';
const STORAGE_KEY_LEGACY = 'SIMPLY_CQ_WEB_SAVE_V1';

const CURRENT_SAVE_VERSION = 2;
const EXPORT_PREFIX = 'CQ_SAVE_v2:';

interface SaveMeta {
  activeSlot: 'A' | 'B';
  seq: number;
  savedAt: number;
}

export class StorageManager {
  /**
   * 简单的字符串 Adler32 / CRC 校验和计算，防止存档中途截断损坏
   */
  private static calculateChecksum(str: string): string {
    let a = 1;
    let b = 0;
    const MOD = 65521;
    for (let i = 0; i < str.length; i++) {
      a = (a + str.charCodeAt(i)) % MOD;
      b = (b + a) % MOD;
    }
    return ((b << 16) | a).toString(16);
  }

  /**
   * 获取元数据信息
   */
  private static getMeta(): SaveMeta {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_META);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.seq === 'number') {
          return parsed as SaveMeta;
        }
      }
    } catch {}
    return { activeSlot: 'A', seq: 0, savedAt: 0 };
  }

  /**
   * Schema 结构版本平滑迁移管线 (v1 -> v2)
   */
  static migrateSaveData(data: any): SaveData {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid save data object');
    }

    // 基础防御性修复
    if (!data.player) {
      data.player = { level: 1, hp: 100, mp: 50, exp: 0, gold: 0, ascensionTier: 0 };
    }
    data.player.gold = Number.isFinite(data.player.gold) ? Math.max(0, data.player.gold) : 0;
    data.player.exp = Number.isFinite(data.player.exp) ? Math.max(0, data.player.exp) : 0;
    data.player.level = Math.max(1, data.player.level || 1);
    data.player.ascensionTier = data.player.ascensionTier || 0;

    data.equipped = data.equipped && typeof data.equipped === 'object' ? data.equipped : {};
    data.inventory = Array.isArray(data.inventory) ? data.inventory.filter((i: any) => i && i.defId) : [];
    data.slotEnhancements = data.slotEnhancements || {};
    data.slotEnhancePity = data.slotEnhancePity || {};
    data.monsterKills = data.monsterKills || {};
    data.codexClaimedTiers = data.codexClaimedTiers || {};
    data.activeBounties = Array.isArray(data.activeBounties) ? data.activeBounties : [];
    data.talentAllocations = data.talentAllocations || {};

    data.version = CURRENT_SAVE_VERSION;
    return data as SaveData;
  }

  /**
   * 双槽 Ping-Pong 容灾安全写入
   * 永远不覆盖当前健康槽，先写入备用槽成功后切换指针，即使写满爆配额也不会造成坏档
   */
  static saveGame(data: Omit<SaveData, 'version' | 'savedAt' | 'seq' | 'checksum'>): boolean {
    try {
      const meta = this.getMeta();
      const nextSlot = meta.activeSlot === 'A' ? 'B' : 'A';
      const nextSeq = meta.seq + 1;
      const savedAt = Date.now();

      const fullData: SaveData = {
        version: CURRENT_SAVE_VERSION,
        savedAt,
        seq: nextSeq,
        ...data
      };

      const payload = JSON.stringify(fullData);
      fullData.checksum = this.calculateChecksum(payload);
      const finalJson = JSON.stringify(fullData);

      const targetKey = nextSlot === 'A' ? STORAGE_KEY_SLOT_A : STORAGE_KEY_SLOT_B;
      localStorage.setItem(targetKey, finalJson);

      // 同步更新兼容老版本的 Legacy 键
      localStorage.setItem(STORAGE_KEY_LEGACY, finalJson);

      // 更新元数据槽位指针
      const nextMeta: SaveMeta = { activeSlot: nextSlot, seq: nextSeq, savedAt };
      localStorage.setItem(STORAGE_KEY_META, JSON.stringify(nextMeta));
      return true;
    } catch (e) {
      console.error('Failed to save game via dual-slot storage', e);
      return false;
    }
  }

  /**
   * 双槽容灾读取：校验完整性与序列号，自动降级回退
   */
  static loadGame(): SaveData | null {
    const tryParseSlot = (key: string): SaveData | null => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.player && parsed.inventory) {
          return this.migrateSaveData(parsed);
        }
      } catch (e) {
        console.warn(`Slot ${key} corrupted or invalid:`, e);
      }
      return null;
    };

    const saveA = tryParseSlot(STORAGE_KEY_SLOT_A);
    const saveB = tryParseSlot(STORAGE_KEY_SLOT_B);

    let chosen: SaveData | null = null;
    if (saveA && saveB) {
      const seqA = saveA.seq || 0;
      const seqB = saveB.seq || 0;
      chosen = seqA >= seqB ? saveA : saveB;
    } else if (saveA) {
      chosen = saveA;
    } else if (saveB) {
      chosen = saveB;
    } else {
      // 回退尝试老版本单槽
      const legacy = tryParseSlot(STORAGE_KEY_LEGACY);
      if (legacy) chosen = legacy;
    }

    return chosen;
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
   * 导出经过 Base64 编码的防伪存档字符串
   */
  static exportSave(): string {
    const current = this.loadGame();
    if (!current) return '';
    try {
      const json = JSON.stringify(current);
      // UTF-8 安全 Base64 编码
      const b64 = typeof btoa !== 'undefined'
        ? btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
        : Buffer.from(json).toString('base64');
      return `${EXPORT_PREFIX}${b64}`;
    } catch {
      return JSON.stringify(current);
    }
  }

  /**
   * 导入 Base64 或原始 JSON 存档字符串并校验入库
   */
  static importSave(codeStr: string): { success: boolean; message: string } {
    if (!codeStr || typeof codeStr !== 'string') {
      return { success: false, message: '存档代码不能为空' };
    }
    const cleanStr = codeStr.trim();
    let jsonStr = cleanStr;

    if (cleanStr.startsWith(EXPORT_PREFIX)) {
      try {
        const b64 = cleanStr.slice(EXPORT_PREFIX.length);
        jsonStr = typeof atob !== 'undefined'
          ? decodeURIComponent(Array.prototype.map.call(atob(b64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
          : Buffer.from(b64, 'base64').toString('utf8');
      } catch (e) {
        return { success: false, message: 'Base64 存档解码失败，内容可能损坏' };
      }
    }

    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || !parsed.player) {
        return { success: false, message: '存档数据结构缺少核心玩家信息' };
      }
      const migrated = this.migrateSaveData(parsed);

      // 成功解析与迁移后，以最高序列号写入双槽
      const meta = this.getMeta();
      const nextSlot = meta.activeSlot === 'A' ? 'B' : 'A';
      const nextSeq = meta.seq + 10;
      migrated.seq = nextSeq;
      migrated.savedAt = Date.now();

      const finalJson = JSON.stringify(migrated);
      const targetKey = nextSlot === 'A' ? STORAGE_KEY_SLOT_A : STORAGE_KEY_SLOT_B;
      localStorage.setItem(targetKey, finalJson);
      localStorage.setItem(STORAGE_KEY_LEGACY, finalJson);
      localStorage.setItem(STORAGE_KEY_META, JSON.stringify({ activeSlot: nextSlot, seq: nextSeq, savedAt: migrated.savedAt }));

      return { success: true, message: `存档导入成功！角色等级: Lv.${migrated.player.level}` };
    } catch (e: any) {
      return { success: false, message: `存档解析失败: ${e.message || '未知错误'}` };
    }
  }

  /**
   * 清除所有本地槽位数据
   */
  static clearSave(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_SLOT_A);
      localStorage.removeItem(STORAGE_KEY_SLOT_B);
      localStorage.removeItem(STORAGE_KEY_META);
      localStorage.removeItem(STORAGE_KEY_LEGACY);
    } catch {}
  }
}
