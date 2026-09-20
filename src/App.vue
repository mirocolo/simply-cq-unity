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
      :currentMapName="world.currentMap.name"
      :uiTick="uiTick"
      @toggleAuto="toggleAutoPilot"
    />

    <!-- 底部经典传奇青铜石雕主控制台 (红蓝太极双血球/嵌入式聊天框/药水/技能/功能按钮) -->
    <BottomActionBar 
      :player="world.player"
      :skills="world.skills"
      :inventory="world.inventory"
      :logs="world.battleLogs"
      :isSoundOn="isSoundOn"
      :uiTick="uiTick"
      @castSkill="handleCastSkill"
      @useHpPotion="handleUseHpPotion"
      @useMpPotion="handleUseMpPotion"
      @openModal="openModal"
      @toggleSound="toggleSound"
    />

    <!-- 模态弹窗：人物与装备纸娃娃 (C) -->
    <Transition name="modal">
      <CharacterModal 
        v-if="activeModal === 'character'"
        :player="world.player"
        :equipped="world.equipped"
        @close="activeModal = null"
        @unequip="handleUnequip"
        @ascend="handleAscend"
        @openSpecialRing="openModal('special_ring')"
        @oneKeyEquip="handleOneKeyEquip"
      />
    </Transition>

    <!-- 模态弹窗：至尊六大特戒神殿 (R) -->
    <Transition name="modal">
      <SpecialRingModal 
        v-if="activeModal === 'special_ring'"
        :player="world.player"
        :equipped="world.equipped"
        :inventory="world.inventory"
        @close="activeModal = null"
        @equip="handleEquipSpecialRing"
        @unequip="handleUnequip"
        @oneKeyEquip="handleOneKeyEquip"
      />
    </Transition>

    <!-- 模态弹窗：40格随身包裹 (B) -->
    <Transition name="modal">
      <InventoryModal 
        v-if="activeModal === 'inventory'"
        :player="world.player"
        :inventory="world.inventory"
        :equipped="world.equipped"
        @close="activeModal = null"
        @useItem="handleUseItem"
        @dropItem="handleDropItem"
        @oneKeyEquip="handleOneKeyEquip"
        @oneKeyRecycle="handleOneKeyRecycle"
        @oneKeyRecycleWeaker="handleOneKeyRecycleWeaker"
        @oneKeyRecycleBlue="handleOneKeyRecycleBlue"
      />
    </Transition>

    <!-- 模态弹窗：智能挂机与收益看板 (L) -->
    <Transition name="modal">
      <AutoPilotModal 
        v-if="activeModal === 'autopilot'"
        :config="world.autoConfig"
        :stats="world.autoStats"
        @close="activeModal = null"
      />
    </Transition>

    <!-- 模态弹窗：系统设置与存档 (O) -->
    <Transition name="modal">
      <SettingsModal 
        v-if="activeModal === 'settings'"
        :isSoundOn="isSoundOn"
        :volume="soundVolume"
        @close="activeModal = null"
        @toggleSound="toggleSound"
        @setVolume="handleSetVolume"
        @reloadGame="handleReloadGame"
      />
    </Transition>

    <!-- 模态弹窗：九州十界万象星图 (M) -->
    <Transition name="modal">
      <WorldMapModal 
        v-if="activeModal === 'world_map'"
        :world="world"
        :currentTick="world.currentTick"
        @close="activeModal = null"
        @fastTravel="handleFastTravel"
      />
    </Transition>

    <!-- 模态弹窗：装备部位强化 (U) -->
    <Transition name="modal">
      <EnhanceModal 
        v-if="activeModal === 'enhance'"
        :world="world"
        @close="activeModal = null"
      />
    </Transition>

    <!-- 模态弹窗：百妖封魔录与万象悬赏令 (K) -->
    <Transition name="modal">
      <MonsterCodexModal 
        v-if="activeModal === 'codex'"
        :world="world"
        :uiTick="uiTick"
        @close="activeModal = null"
        @claim="syncUI"
      />
    </Transition>

    <!-- 模态弹窗：战士天赋星盘 (N) -->
    <Transition name="modal">
      <TalentModal 
        v-if="activeModal === 'talent'"
        :talentAllocations="world.talentAllocations"
        :playerLevel="world.player.stats.level"
        @close="activeModal = null"
        @allocate="handleAllocateTalent"
        @reset="handleResetTalents"
      />
    </Transition>

    <!-- 模态弹窗：离线挂机收益结算 -->
    <Transition name="modal">
      <OfflineRewardModal 
        v-if="offlineReward"
        :reward="offlineReward"
        @claim="handleClaimOfflineReward"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, triggerRef, markRaw, computed, onMounted, onUnmounted } from 'vue';
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
import SpecialRingModal from './components/SpecialRingModal.vue';
import WorldMapModal from './components/WorldMapModal.vue';
import EnhanceModal from './components/EnhanceModal.vue';
import MonsterCodexModal from './components/MonsterCodexModal.vue';
import TalentModal from './components/TalentModal.vue';

// 核心性能架构改造：将底层游戏世界与渲染器通过 markRaw 剥离 Vue 深度响应式 Proxy 监听
// 消除 48x48 矩阵与全图怪群高频 Tick 的无谓拦截，使用 shallowRef + triggerRef 维持原生速度
const rawWorld = markRaw(new GameWorld());
const world = shallowRef(rawWorld);
const renderer = markRaw(new IsometricRenderer());
const sound = markRaw(new SoundEffects());

const uiTick = ref(0);
const syncUI = () => {
  uiTick.value++;
  triggerRef(world);
};

const selectedTargetId = ref<string | null>(null);
const activeModal = ref<'character' | 'inventory' | 'autopilot' | 'settings' | 'special_ring' | 'world_map' | 'enhance' | 'codex' | 'talent' | null>(null);
const offlineReward = ref<OfflineReward | null>(null);

const isSoundOn = ref(true);
const soundVolume = ref(0.4);

let tickTimer: number | null = null;
let saveTimer: number | null = null;

rawWorld.onSound = (name) => {
  switch (name) {
    case 'swing': sound.playSwing(); break;
    case 'hit': sound.playHit(); break;
    case 'crit': sound.playCrit(); break;
    case 'fire': sound.playFire(); break;
    case 'phantom': sound.playPhantom(); break;
    case 'paralyze': sound.playParalyze(); break;
    case 'revive': sound.playRevive(); break;
    case 'coin': sound.playCoin(); break;
    case 'potion': sound.playPotion(); break;
    case 'levelup': sound.playLevelUp(); break;
  }
};

rawWorld.onSlashVFX = (gridPos, dir, isFire, haste, isPhantom) => {
  renderer.addSlashVFX(gridPos, dir, isFire, haste, isPhantom);
};

const selectedMonster = computed(() => {
  const w = world.value;
  if (!selectedTargetId.value) return null;
  const m = w.monsters.find(it => it.id === selectedTargetId.value && it.state !== 'dead');
  return m || null;
});

const toggleAutoPilot = () => {
  rawWorld.autoConfig.enabled = !rawWorld.autoConfig.enabled;
  rawWorld.addBattleLog(
    rawWorld.autoConfig.enabled ? '【挂机】开启自动寻路打怪、顺劈割草与自动喝药' : '【挂机】暂停自动挂机，交由手动控制',
    'system'
  );
  syncUI();
};

const openModal = (name: string) => {
  activeModal.value = activeModal.value === name ? null : (name as any);
};

const handleUnequip = (slot: EquipSlot) => {
  rawWorld.unequipItem(slot);
  syncUI();
};

const handleEquipSpecialRing = (item: ItemInstance) => {
  rawWorld.equipItem(item);
  sound.playLevelUp();
  syncUI();
};

const handleAscend = () => {
  rawWorld.ascend();
  syncUI();
};

const handleUseItem = (item: ItemInstance) => {
  rawWorld.useItem(item);
  syncUI();
};

const handleDropItem = (item: ItemInstance) => {
  const idx = rawWorld.inventory.indexOf(item);
  if (idx !== -1) {
    rawWorld.inventory.splice(idx, 1);
    rawWorld.addBattleLog(`丢弃了物品 [${item.name}]`, 'system');
    syncUI();
  }
};

const handleOneKeyEquip = () => {
  rawWorld.oneKeyEquipBest();
  syncUI();
};

const handleOneKeyRecycle = () => {
  rawWorld.recycleLowQualityItems();
  syncUI();
};

const handleOneKeyRecycleWeaker = () => {
  rawWorld.recycleWeakerOrEqualItems();
  syncUI();
};

const handleOneKeyRecycleBlue = () => {
  rawWorld.recycleLowQualityItems(2);
  syncUI();
};

const handleUseHpPotion = () => {
  const pot = rawWorld.inventory.find(i => i.type === 'potion' && (i.recoverHp || 0) > 0);
  if (pot) {
    rawWorld.useItem(pot);
    syncUI();
  } else {
    rawWorld.addBattleLog('【提示】包裹中已无金创药！击杀怪物可快速获取。', 'system');
  }
};

const handleUseMpPotion = () => {
  const pot = rawWorld.inventory.find(i => i.type === 'potion' && (i.recoverMp || 0) > 0);
  if (pot) {
    rawWorld.useItem(pot);
    syncUI();
  } else {
    rawWorld.addBattleLog('【提示】包裹中已无魔法药！', 'system');
  }
};

const handleCastSkill = (skill: SkillDef) => {
  if (rawWorld.player.stats.level < skill.unlockLevel) {
    rawWorld.addBattleLog(`【技能未解锁】需要人物等级达到 Lv.${skill.unlockLevel}！`, 'system');
    return;
  }
  if (skill.currentCdTicks > 0) return;
  if (rawWorld.player.stats.mp < skill.manaCost) {
    rawWorld.addBattleLog('【法力不足】无法施展技能！', 'system');
    return;
  }

  // 护体神盾为自身增益罡气，无需选中目标即可施展
  if (skill.id === 'shield_aegis') {
    rawWorld.autoPilot.recordManualAction();
    rawWorld.executeAttack(rawWorld.player, rawWorld.player, skill);
    syncUI();
    return;
  }

  let target = selectedMonster.value;
  if (!target) {
    const searchRange = skill.id === 'sun_slash' ? 5 : (skill.id === 'heaven_splitter' ? 4 : 3);
    let minDist = searchRange;
    for (const m of rawWorld.monsters) {
      if (m.state === 'dead') continue;
      const d = Math.max(Math.abs(m.gridPos.x - rawWorld.player.gridPos.x), Math.abs(m.gridPos.y - rawWorld.player.gridPos.y));
      if (d < minDist) {
        minDist = d;
        target = m;
      }
    }
  }

  if (target) {
    rawWorld.autoPilot.recordManualAction();
    rawWorld.executeAttack(rawWorld.player, target, skill);
    syncUI();
  } else {
    rawWorld.addBattleLog('【提示】前方暂无有效攻击目标！', 'system');
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
  rawWorld.load();
  activeModal.value = null;
  syncUI();
};

const handleClaimOfflineReward = () => {
  if (offlineReward.value) {
    rawWorld.addExp(offlineReward.value.expGained);
    rawWorld.player.stats.gold += offlineReward.value.goldGained;
    for (const it of offlineReward.value.itemsGained) {
      rawWorld.addItemToInventory(it);
    }
    sound.playLevelUp();
    rawWorld.addBattleLog(
      `【离线结算】获得挂机经验 +${offlineReward.value.expGained}，金币 +${offlineReward.value.goldGained}`,
      'system'
    );
    offlineReward.value = null;
    syncUI();
  }
};

const handleFastTravel = (mapId: string) => {
  const res = rawWorld.fastTravelToMap(mapId);
  if (res.success) {
    activeModal.value = null;
  }
  syncUI();
};

const handleAllocateTalent = (talentId: string) => {
  rawWorld.allocateTalent(talentId);
  syncUI();
};

const handleResetTalents = () => {
  rawWorld.resetTalents();
  syncUI();
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
  } else if (key === 'R') {
    openModal('special_ring');
  } else if (key === 'M') {
    openModal('world_map');
  } else if (key === 'U') {
    openModal('enhance');
  } else if (key === 'K') {
    openModal('codex');
  } else if (key === 'N') {
    openModal('talent');
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
    if (rawWorld.skills[idx]) {
      handleCastSkill(rawWorld.skills[idx]);
    }
  } else if (e.code === 'Space') {
    if (rawWorld.skills[0]) {
      handleCastSkill(rawWorld.skills[0]);
    }
  }
};

onMounted(() => {
  const hasLoaded = rawWorld.load();
  if (hasLoaded) {
    const saved = StorageManager.loadGame();
    if (saved) {
      const reward = StorageManager.calculateOfflineReward(saved.savedAt, rawWorld.player.stats.level);
      if (reward) {
        offlineReward.value = reward;
      }
    }
  }

  tickTimer = window.setInterval(() => {
    rawWorld.tick();
    uiTick.value++;
    triggerRef(world);
  }, 100);

  saveTimer = window.setInterval(() => {
    rawWorld.save();
  }, 10000);

  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer);
  if (saveTimer) clearInterval(saveTimer);
  window.removeEventListener('keydown', handleKeyDown);
  rawWorld.save();
  sound.dispose();
});
</script>
