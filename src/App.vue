<template>
  <div class="w-screen h-screen bg-legend-bg text-white overflow-hidden relative select-none">
    <!-- 2.5D 等轴测视口主画布 -->
    <GameCanvas 
      :world="world"
      :renderer="renderer"
      v-model:selectedTargetId="selectedTargetId"
    />

    <!-- 顶部 HUD (头像/血蓝/战力/地图/挂机状态) -->
    <GameHUD 
      :player="world.player"
      :selectedMonster="selectedMonster"
      :isAutoEnabled="world.autoConfig.enabled"
      @toggleAuto="toggleAutoPilot"
    />

    <!-- 战斗与掉落实时信息流 -->
    <BattleLogStream :logs="world.battleLogs" />

    <!-- 底部操作栏 (经验条/药水QW/技能1-4/弹窗快捷键) -->
    <BottomActionBar 
      :player="world.player"
      :skills="world.skills"
      :inventory="world.inventory"
      :isSoundOn="isSoundOn"
      @castSkill="handleCastSkill"
      @useHpPotion="handleUseHpPotion"
      @useMpPotion="handleUseMpPotion"
      @openModal="openModal"
      @toggleSound="toggleSound"
    />

    <!-- 模态弹窗：人物与装备纸娃娃 (C) -->
    <CharacterModal 
      v-if="activeModal === 'character'"
      :player="world.player"
      :equipped="world.equipped"
      @close="activeModal = null"
      @unequip="handleUnequip"
    />

    <!-- 模态弹窗：40格随身背包 (B) -->
    <InventoryModal 
      v-if="activeModal === 'inventory'"
      :inventory="world.inventory"
      :equipped="world.equipped"
      @close="activeModal = null"
      @useItem="handleUseItem"
      @dropItem="handleDropItem"
      @oneKeyEquip="handleOneKeyEquip"
      @oneKeyRecycle="handleOneKeyRecycle"
    />

    <!-- 模态弹窗：智能挂机与收益看板 (L) -->
    <AutoPilotModal 
      v-if="activeModal === 'autopilot'"
      :config="world.autoConfig"
      :stats="world.autoStats"
      @close="activeModal = null"
    />

    <!-- 模态弹窗：系统设置与存档 (O) -->
    <SettingsModal 
      v-if="activeModal === 'settings'"
      :isSoundOn="isSoundOn"
      :volume="soundVolume"
      @close="activeModal = null"
      @toggleSound="toggleSound"
      @setVolume="handleSetVolume"
      @reloadGame="handleReloadGame"
    />

    <!-- 模态弹窗：离线挂机收益结算 -->
    <OfflineRewardModal 
      v-if="offlineReward"
      :reward="offlineReward"
      @claim="handleClaimOfflineReward"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { GameWorld } from './domain/GameWorld';
import { IsometricRenderer } from './renderer/IsometricRenderer';
import { SoundEffects } from './renderer/SoundEffects';
import { StorageManager, OfflineReward } from './domain/StorageManager';
import { EquipSlot, ItemInstance, SkillDef } from './types/game';

import GameCanvas from './renderer/GameCanvas.vue';
import GameHUD from './components/GameHUD.vue';
import BottomActionBar from './components/BottomActionBar.vue';
import BattleLogStream from './components/BattleLogStream.vue';
import CharacterModal from './components/CharacterModal.vue';
import InventoryModal from './components/InventoryModal.vue';
import AutoPilotModal from './components/AutoPilotModal.vue';
import SettingsModal from './components/SettingsModal.vue';
import OfflineRewardModal from './components/OfflineRewardModal.vue';

// 实例化核心系统
const world = reactive(new GameWorld()) as GameWorld;
const renderer = new IsometricRenderer();
const sound = new SoundEffects();

const selectedTargetId = ref<string | null>(null);
const activeModal = ref<'character' | 'inventory' | 'autopilot' | 'settings' | null>(null);
const offlineReward = ref<OfflineReward | null>(null);

const isSoundOn = ref(true);
const soundVolume = ref(0.4);

let tickTimer: number | null = null;
let saveTimer: number | null = null;

// 绑定音效与刀光回调
world.onSound = (name) => {
  switch (name) {
    case 'swing': sound.playSwing(); break;
    case 'hit': sound.playHit(); break;
    case 'crit': sound.playCrit(); break;
    case 'fire': sound.playFire(); break;
    case 'coin': sound.playCoin(); break;
    case 'potion': sound.playPotion(); break;
    case 'levelup': sound.playLevelUp(); break;
  }
};

world.onSlashVFX = (gridPos, dir, isFire, haste) => {
  renderer.addSlashVFX(gridPos, dir, isFire, haste);
};

const selectedMonster = computed(() => {
  if (!selectedTargetId.value) return null;
  const m = world.monsters.find(it => it.id === selectedTargetId.value && it.state !== 'dead');
  return m || null;
});

const toggleAutoPilot = () => {
  world.autoConfig.enabled = !world.autoConfig.enabled;
  world.addBattleLog(
    world.autoConfig.enabled ? '【挂机】已开启自动寻路、索敌打怪与自动喝药' : '【挂机】已暂停自动挂机，交由手动控制',
    'system'
  );
};

const openModal = (name: string) => {
  activeModal.value = activeModal.value === name ? null : (name as any);
};

const handleUnequip = (slot: EquipSlot) => {
  world.unequipItem(slot);
};

const handleUseItem = (item: ItemInstance) => {
  world.useItem(item);
};

const handleDropItem = (item: ItemInstance) => {
  const idx = world.inventory.indexOf(item);
  if (idx !== -1) {
    world.inventory.splice(idx, 1);
    world.addBattleLog(`丢弃了物品 [${item.name}]`, 'system');
  }
};

// 一键穿戴最强战力
const handleOneKeyEquip = () => {
  let equipCount = 0;
  // 遍历背包里的装备
  const equipItems = [...world.inventory.filter(i => i.type === 'equipment')];
  for (const item of equipItems) {
    if (!item.slot) continue;
    const currentEquip = world.equipped[item.slot];
    // 若空位，或新装备 maxDC+maxAC 更优
    if (!currentEquip || (item.maxDC + item.maxAC + item.hasteBonus > currentEquip.maxDC + currentEquip.maxAC + currentEquip.hasteBonus)) {
      world.equipItem(item);
      equipCount++;
    }
  }
  if (equipCount > 0) {
    sound.playLevelUp();
    world.addBattleLog(`【一键穿戴】成功更换了 ${equipCount} 件更强神装，战力飙升！`, 'system');
  } else {
    world.addBattleLog('【一键穿戴】当前已是最佳装备搭配！', 'system');
  }
};

// 一键回收
const handleOneKeyRecycle = () => {
  world.recycleLowQualityItems();
};

// 快捷喝药
const handleUseHpPotion = () => {
  const pot = world.inventory.find(i => i.type === 'potion' && (i.recoverHp || 0) > 0);
  if (pot) {
    world.useItem(pot);
  } else {
    world.addBattleLog('【提示】包裹中已无金创药！击杀怪物可快速获取。', 'system');
  }
};

const handleUseMpPotion = () => {
  const pot = world.inventory.find(i => i.type === 'potion' && (i.recoverMp || 0) > 0);
  if (pot) {
    world.useItem(pot);
  } else {
    world.addBattleLog('【提示】包裹中已无魔法药！', 'system');
  }
};

// 释放技能
const handleCastSkill = (skill: SkillDef) => {
  if (skill.currentCdTicks > 0) return;
  if (world.player.stats.mp < skill.manaCost) {
    world.addBattleLog('【法力不足】无法施展技能！', 'system');
    return;
  }

  // 若有锁定怪或寻找最近怪
  let target = selectedMonster.value;
  if (!target) {
    // 寻找最近的怪
    let minDist = 3;
    for (const m of world.monsters) {
      if (m.state === 'dead') continue;
      const d = Math.max(Math.abs(m.gridPos.x - world.player.gridPos.x), Math.abs(m.gridPos.y - world.player.gridPos.y));
      if (d < minDist) {
        minDist = d;
        target = m;
      }
    }
  }

  if (target) {
    world.autoPilot.recordManualAction();
    world.executeAttack(world.player, target, skill);
  }
};

// 音量控制
const toggleSound = () => {
  isSoundOn.value = sound.toggleSound();
};

const handleSetVolume = (vol: number) => {
  soundVolume.value = vol;
  sound.setVolume(vol);
};

const handleReloadGame = () => {
  world.load();
  activeModal.value = null;
};

const handleClaimOfflineReward = () => {
  if (offlineReward.value) {
    world.addExp(offlineReward.value.expGained);
    world.player.stats.gold += offlineReward.value.goldGained;
    for (const it of offlineReward.value.itemsGained) {
      if (world.inventory.length < 40) {
        world.inventory.push(it);
      }
    }
    sound.playLevelUp();
    world.addBattleLog(
      `【离线结算】获得挂机经验 +${offlineReward.value.expGained}，金币 +${offlineReward.value.goldGained}`,
      'system'
    );
    offlineReward.value = null;
  }
};

// 全局快捷键监听
const handleKeyDown = (e: KeyboardEvent) => {
  // 如果在输入框中不拦截
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  const key = e.key.toUpperCase();
  if (key === 'T') {
    toggleAutoPilot();
  } else if (key === 'B') {
    openModal('inventory');
  } else if (key === 'C') {
    openModal('character');
  } else if (key === 'L') {
    openModal('autopilot');
  } else if (key === 'O' || e.key === 'Escape') {
    if (activeModal.value) {
      activeModal.value = null;
    } else if (key === 'O') {
      openModal('settings');
    }
  } else if (key === 'Q') {
    handleUseHpPotion();
  } else if (key === 'W') {
    handleUseMpPotion();
  } else if (e.key >= '1' && e.key <= '4') {
    const idx = parseInt(e.key) - 1;
    if (world.skills[idx]) {
      handleCastSkill(world.skills[idx]);
    }
  } else if (e.code === 'Space') {
    // 空格手动普攻
    if (world.skills[0]) {
      handleCastSkill(world.skills[0]);
    }
  }
};

onMounted(() => {
  // 1. 尝试读档
  const hasLoaded = world.load();
  if (hasLoaded) {
    const saved = StorageManager.loadGame();
    if (saved) {
      const reward = StorageManager.calculateOfflineReward(saved.savedAt, world.player.stats.level);
      if (reward) {
        offlineReward.value = reward;
      }
    }
  }

  // 2. 启动世界逻辑 Tick 定时器 (100ms 一跳)
  tickTimer = window.setInterval(() => {
    world.tick();
  }, 100);

  // 3. 自动存档定时器 (每 10 秒自动存一次)
  saveTimer = window.setInterval(() => {
    world.save();
  }, 10000);

  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer);
  if (saveTimer) clearInterval(saveTimer);
  window.removeEventListener('keydown', handleKeyDown);
  world.save();
});
</script>
