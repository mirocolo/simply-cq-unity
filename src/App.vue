<template>
  <div class="w-screen h-screen bg-legend-bg text-white overflow-hidden relative select-none font-serif">
    <!-- 2.5D 等轴测视口主画布 -->
    <GameCanvas 
      :world="world"
      :renderer="renderer"
      v-model:selectedTargetId="selectedTargetId"
    />

    <!-- 顶部 HUD (头像/血蓝/战力/右上角青铜罗盘小地图/挂机状态) -->
    <GameHUD 
      :player="world.player"
      :monsters="world.monsters"
      :selectedMonster="selectedMonster"
      :isAutoEnabled="world.autoConfig.enabled"
      @toggleAuto="toggleAutoPilot"
    />

    <!-- 底部经典传奇青铜石雕主控制台 (红蓝太极双血球/嵌入式聊天框/药水/技能/功能按钮) -->
    <BottomActionBar 
      :player="world.player"
      :skills="world.skills"
      :inventory="world.inventory"
      :logs="world.battleLogs"
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

    <!-- 模态弹窗：40格随身包裹 (B) -->
    <InventoryModal 
      v-if="activeModal === 'inventory'"
      :inventory="world.inventory"
      :equipped="world.equipped"
      @close="activeModal = null"
      @useItem="handleUseItem"
      @dropItem="handleDropItem"
      @oneKeyEquip="handleOneKeyEquip"
      @oneKeyRecycle="handleOneKeyRecycle"
      @oneKeyRecycleWeaker="handleOneKeyRecycleWeaker"
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
import CharacterModal from './components/CharacterModal.vue';
import InventoryModal from './components/InventoryModal.vue';
import AutoPilotModal from './components/AutoPilotModal.vue';
import SettingsModal from './components/SettingsModal.vue';
import OfflineRewardModal from './components/OfflineRewardModal.vue';

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

world.onSound = (name) => {
  switch (name) {
    case 'swing': sound.playSwing(); break;
    case 'hit': sound.playHit(); break;
    case 'crit': sound.playCrit(); break;
    case 'fire': sound.playFire(); break;
    case 'phantom': sound.playPhantom(); break;
    case 'coin': sound.playCoin(); break;
    case 'potion': sound.playPotion(); break;
    case 'levelup': sound.playLevelUp(); break;
  }
};

world.onSlashVFX = (gridPos, dir, isFire, haste, isPhantom) => {
  renderer.addSlashVFX(gridPos, dir, isFire, haste, isPhantom);
};

const selectedMonster = computed(() => {
  if (!selectedTargetId.value) return null;
  const m = world.monsters.find(it => it.id === selectedTargetId.value && it.state !== 'dead');
  return m || null;
});

const toggleAutoPilot = () => {
  world.autoConfig.enabled = !world.autoConfig.enabled;
  world.addBattleLog(
    world.autoConfig.enabled ? '【挂机】开启自动寻路打怪、顺劈割草与自动喝药' : '【挂机】暂停自动挂机，交由手动控制',
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

const handleOneKeyEquip = () => {
  world.oneKeyEquipBest();
};

const handleOneKeyRecycle = () => {
  world.recycleLowQualityItems();
};

const handleOneKeyRecycleWeaker = () => {
  world.recycleWeakerOrEqualItems();
};

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

const handleCastSkill = (skill: SkillDef) => {
  if (world.player.stats.level < skill.unlockLevel) {
    world.addBattleLog(`【技能未解锁】需要人物等级达到 Lv.${skill.unlockLevel}！`, 'system');
    return;
  }
  if (skill.currentCdTicks > 0) return;
  if (world.player.stats.mp < skill.manaCost) {
    world.addBattleLog('【法力不足】无法施展技能！', 'system');
    return;
  }

  // 护体神盾为自身增益罡气，无需选中目标即可施展
  if (skill.id === 'shield_aegis') {
    world.autoPilot.recordManualAction();
    world.executeAttack(world.player, world.player, skill);
    return;
  }

  let target = selectedMonster.value;
  if (!target) {
    const searchRange = skill.id === 'sun_slash' ? 5 : (skill.id === 'heaven_splitter' ? 4 : 3);
    let minDist = searchRange;
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
  } else {
    world.addBattleLog('【提示】前方暂无有效攻击目标！', 'system');
  }
};

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
      world.addItemToInventory(it);
    }
    sound.playLevelUp();
    world.addBattleLog(
      `【离线结算】获得挂机经验 +${offlineReward.value.expGained}，金币 +${offlineReward.value.goldGained}`,
      'system'
    );
    offlineReward.value = null;
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
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
  } else if (e.key >= '1' && e.key <= '7') {
    const idx = parseInt(e.key) - 1;
    if (world.skills[idx]) {
      handleCastSkill(world.skills[idx]);
    }
  } else if (e.code === 'Space') {
    if (world.skills[0]) {
      handleCastSkill(world.skills[0]);
    }
  }
};

onMounted(() => {
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

  tickTimer = window.setInterval(() => {
    world.tick();
  }, 100);

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
