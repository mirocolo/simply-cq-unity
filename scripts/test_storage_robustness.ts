import { StorageManager } from '../src/domain/StorageManager';
import assert from 'assert';

console.log('=== 开始存储双槽容灾与迁移管线测试 ===\n');

// 模拟浏览器的 LocalStorage
const memoryStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => memoryStorage[k] || null,
  setItem: (k: string, v: string) => { memoryStorage[k] = v; },
  removeItem: (k: string) => { delete memoryStorage[k]; },
  clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
};

// 1. 测试基础双槽交替保存 (Ping-Pong Save)
const baseSaveData = {
  player: {
    level: 15,
    ascensionTier: 1,
    hp: 500,
    mp: 200,
    exp: 15000,
    gold: 888888
  },
  equipped: {},
  inventory: [{ id: 'test_item_1', defId: 'w_bronze_sword', name: '青铜剑', type: 'equipment' as const, quality: 1 as const, slot: 'weapon' as const }],
  autoConfig: { enabled: true, autoHpPotion: true, autoPotionHpPercent: 70, autoMpPotion: true, autoPotionMpPercent: 30, autoSkill: true, autoPickup: true, autoRecycleWeaker: true, autoRecycleMaxQuality: 2, searchRadius: 36, progressionMode: false }
};

// 第一次保存 (应写入槽位 B，因默认初始指针为 A)
StorageManager.saveGame(baseSaveData);
const meta1 = JSON.parse(memoryStorage['SIMPLY_CQ_SAVE_META']);
assert.strictEqual(meta1.activeSlot, 'B');
assert.strictEqual(meta1.seq, 1);
console.log('✅ 第 1 次写入槽位 B，序列号 seq = 1 通过');

// 第二次保存 (应写入槽位 A)
baseSaveData.player.gold += 10000;
StorageManager.saveGame(baseSaveData);
const meta2 = JSON.parse(memoryStorage['SIMPLY_CQ_SAVE_META']);
assert.strictEqual(meta2.activeSlot, 'A');
assert.strictEqual(meta2.seq, 2);
console.log('✅ 第 2 次写入槽位 A，序列号 seq = 2 通过');

// 2. 测试双槽读取：应读取最新序列号 (Slot A, seq=2, gold=898888)
const loaded = StorageManager.loadGame();
assert(loaded !== null);
assert.strictEqual(loaded.seq, 2);
assert.strictEqual(loaded.player.gold, 898888);
console.log('✅ 双槽读取优先加载最高序列号槽位成功');

// 3. 测试容灾降级：人为破坏槽位 A（模拟写入断电或 JSON 损坏）
memoryStorage['SIMPLY_CQ_SAVE_SLOT_A'] = '{ "corrupted_incomplete_json": ';
const fallbackLoaded = StorageManager.loadGame();
assert(fallbackLoaded !== null);
assert.strictEqual(fallbackLoaded.seq, 1); // 自动回退到 Slot B
assert.strictEqual(fallbackLoaded.player.gold, 888888);
console.log('✅ 槽位 A 损坏时，自动容灾回退至健康槽位 B 成功');

// 4. 测试 Schema 迁移管线 (v1 升级到 v2，自动防御性补齐缺失字段)
const legacyV1Data = {
  version: 1,
  savedAt: 1600000000,
  player: { level: 25, hp: 800, mp: 300, exp: 50000, gold: null }, // gold 为 null
  inventory: [{ defId: 'pot_hp_large', count: 10 }],
  // 缺失 slotEnhancements, codexClaimedTiers, talentAllocations
};
const migrated = StorageManager.migrateSaveData(legacyV1Data);
assert.strictEqual(migrated.version, 2);
assert.strictEqual(migrated.player.gold, 0); // null 修复为 0
assert.deepStrictEqual(migrated.slotEnhancements, {});
assert.deepStrictEqual(migrated.talentAllocations, {});
assert.deepStrictEqual(migrated.codexClaimedTiers, {});
console.log('✅ Schema 版本迁移管线 (v1 -> v2) 自动修复与默认值填充成功');

// 5. 测试 Base64 导出与导入完整回环 (Round-trip)
const exportedString = StorageManager.exportSave();
assert(exportedString.startsWith('CQ_SAVE_v2:'), '导出格式必须以 CQ_SAVE_v2: 为前缀');
console.log('✅ Base64 导出成功，前缀与长度合规');

// 清空当前存储，导入备份文本
(globalThis as any).localStorage.clear();
const importRes = StorageManager.importSave(exportedString);
assert(importRes.success, '导入必须成功');
const reloaded = StorageManager.loadGame();
assert(reloaded !== null);
assert.strictEqual(reloaded.player.level, 15);
assert.strictEqual(reloaded.player.gold, 888888);
console.log('✅ Base64 存档导入并恢复状态成功');

// 6. 测试非法文本导入拦截保护
const invalidRes = StorageManager.importSave('INVALID_RANDOM_TEXT_NOT_A_SAVE');
assert(!invalidRes.success, '非法存档代码必须被拦截');
console.log('✅ 非法代码拦截保护通过:', invalidRes.message);

console.log('\n=== 存储双槽容灾与迁移管线全部通过 ===');
