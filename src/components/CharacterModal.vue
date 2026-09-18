<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
    <!-- 人物主面板容器 -->
    <div class="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto legend-box p-4 rounded-lg flex flex-col gap-3 animate-fadeIn text-zinc-200 custom-scrollbar">
      <!-- 弹窗标题 -->
      <div class="flex items-center justify-between border-b border-legend-border pb-2">
        <div class="flex items-center gap-2">
          <span class="text-xl">👤</span>
          <span class="text-base font-bold text-gold-gradient">人物属性与装备</span>
        </div>
        <button 
          @click="$emit('close')"
          class="text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-zinc-800 text-lg font-bold"
        >
          ✕
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 左半部：经典纸娃娃装备位 -->
        <div class="bg-zinc-950/80 p-3 rounded-lg border border-legend-border flex flex-col justify-between">
          <div class="text-center text-xs font-bold text-amber-400/90 mb-2">
            【{{ currentAscensionTitle }} · 战神之躯】
          </div>

          <div class="grid grid-cols-3 gap-2 items-center">
            <!-- 左侧 4 槽位 -->
            <div class="flex flex-col gap-2">
              <div 
                v-for="slotKey in leftSlots" 
                :key="slotKey.key"
                @click="handleSlotClick(slotKey.key)"
                class="relative w-14 h-14 bg-zinc-900 rounded border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105"
                :class="getSlotBorderClass(equipped[slotKey.key])"
                :title="getSlotTitle(slotKey.key)"
              >
                <span class="text-2xl">{{ equipped[slotKey.key]?.icon || slotKey.placeholder }}</span>
                <span class="text-[9px] text-zinc-400">{{ slotKey.name }}</span>
                <span 
                  v-if="equipped[slotKey.key]"
                  class="absolute -bottom-1 -right-1 text-[9px] px-1 rounded bg-black/80 font-bold"
                  :class="getQualityTextClass(equipped[slotKey.key]!.quality)"
                >
                  {{ equipped[slotKey.key]?.name.slice(0, 2) }}
                </span>
              </div>
            </div>

            <!-- 中央人物形象投影 -->
            <div class="flex flex-col items-center justify-center py-2">
              <div class="relative w-20 h-28 bg-gradient-to-b from-amber-950/20 to-black rounded-full border border-legend-border flex items-center justify-center shadow-gold-glow">
                <span class="text-5xl">🛡️</span>
              </div>
              <span class="mt-2 text-xs font-bold text-amber-300">Lv.{{ player.stats.level }} 战士</span>
              <span class="text-[10px] text-amber-500/90 font-mono">{{ currentAscensionTitle }}</span>
            </div>

            <!-- 右侧 4 槽位 -->
            <div class="flex flex-col gap-2 items-end">
              <div 
                v-for="slotKey in rightSlots" 
                :key="slotKey.key"
                @click="handleSlotClick(slotKey.key)"
                class="relative w-14 h-14 bg-zinc-900 rounded border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105"
                :class="getSlotBorderClass(equipped[slotKey.key])"
                :title="getSlotTitle(slotKey.key)"
              >
                <span class="text-2xl">{{ equipped[slotKey.key]?.icon || slotKey.placeholder }}</span>
                <span class="text-[9px] text-zinc-400">{{ slotKey.name }}</span>
                <span 
                  v-if="equipped[slotKey.key]"
                  class="absolute -bottom-1 -right-1 text-[9px] px-1 rounded bg-black/80 font-bold"
                  :class="getQualityTextClass(equipped[slotKey.key]!.quality)"
                >
                  {{ equipped[slotKey.key]?.name.slice(0, 2) }}
                </span>
              </div>
            </div>
          </div>

          <div class="text-[10px] text-zinc-500 text-center mt-2">
            点击已穿戴装备可直接卸下退回背包
          </div>
        </div>

        <!-- 右半部：数值、飞升与战力汇总明细 -->
        <div class="bg-zinc-950/80 p-4 rounded-lg border border-legend-border flex flex-col gap-2.5">
          <!-- 战力大字标题 -->
          <div class="bg-amber-950/30 border border-amber-900/60 p-2.5 rounded-lg flex items-center justify-between shadow-inner">
            <span class="text-xs text-amber-200 font-bold">综合战斗力</span>
            <span class="text-gold-gradient text-2xl font-black tracking-wider text-gold-glow">
              {{ player.stats.combatPower.toLocaleString() }}
            </span>
          </div>

          <!-- 飞升位面与突破横幅 -->
          <div class="bg-gradient-to-r from-amber-950/60 via-yellow-950/30 to-black p-2.5 rounded-lg border border-amber-600/50 flex items-center justify-between shadow-md">
            <div class="flex flex-col">
              <div class="flex items-center gap-1.5">
                <span class="text-amber-400 text-sm">🌌</span>
                <span class="text-xs font-bold text-amber-200">飞升境界:</span>
                <span class="font-black text-xs text-gold-gradient">{{ currentAscensionTitle }}</span>
              </div>
              <span class="text-[10px] text-zinc-400 mt-0.5">
                当前位面: <span class="text-amber-300 font-bold">{{ currentMapName }}</span>
              </span>
            </div>

            <!-- 飞升突破按钮 -->
            <button 
              v-if="nextAscension"
              @click="$emit('ascend')"
              :disabled="player.stats.level < nextAscension.requiredLevel"
              class="px-2.5 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 shadow"
              :class="player.stats.level >= nextAscension.requiredLevel 
                ? 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white shadow-gold-glow animate-pulse cursor-pointer' 
                : 'bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-800'"
            >
              <span>⚡</span>
              <span>{{ player.stats.level >= nextAscension.requiredLevel ? '飞升突破!' : `Lv.${nextAscension.requiredLevel} 突破` }}</span>
            </button>
            <div v-else class="text-[10px] text-amber-300 font-bold px-2 py-1 bg-amber-950/60 rounded border border-amber-600/40">
              九转大圆满 👑
            </div>
          </div>

          <!-- 详细数值列表 -->
          <div class="flex flex-col gap-1.5 text-xs divide-y divide-zinc-800/80">
            <div class="flex justify-between py-1">
              <span class="text-zinc-400">生命上限 (HP):</span>
              <span class="font-bold text-red-400">{{ player.stats.hp }} / {{ player.stats.maxHp }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-zinc-400">魔法上限 (MP):</span>
              <span class="font-bold text-blue-400">{{ player.stats.mp }} / {{ player.stats.maxMp }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-zinc-400">物理攻击 (DC):</span>
              <span class="font-bold text-yellow-400">{{ player.stats.minDC }} - {{ player.stats.maxDC }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-zinc-400">物理防御 (AC):</span>
              <span class="font-bold text-emerald-400">{{ player.stats.minAC }} - {{ player.stats.maxAC }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-zinc-400">暴击率 (Crit):</span>
              <span class="font-bold text-rose-400">{{ (player.stats.critRate * 100).toFixed(1) }}%</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-zinc-400">暴击伤害 (Crit Dmg):</span>
              <span class="font-bold text-rose-400">{{ (player.stats.critMult * 100).toFixed(0) }}%</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-zinc-400">生命吸血 (Lifesteal):</span>
              <span class="font-bold text-emerald-400">{{ (player.stats.lifestealRate * 100).toFixed(1) }}% (伤害回血)</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-zinc-400">攻速急速 (Haste):</span>
              <span class="font-bold text-cyan-400">
                +{{ player.stats.haste }} ({{ (player.stats.effectiveAttackInterval * 0.1).toFixed(2) }}s/刀{{ player.stats.haste >= 34 ? ' · 极速MAX' : '' }})
              </span>
            </div>
            <!-- 气运极境 (运9极境判定) -->
            <div class="flex justify-between py-1" :class="(player.stats.luck || 0) >= 9 ? 'bg-amber-950/40 px-1.5 rounded border border-amber-500/50' : ''">
              <span class="text-zinc-400 flex items-center gap-1">
                <span>🍀</span>
                <span>气运极境 (Luck):</span>
              </span>
              <span class="font-bold font-mono" :class="(player.stats.luck || 0) >= 9 ? 'text-amber-300 font-black text-gold-glow' : 'text-yellow-300'">
                +{{ player.stats.luck || 0 }} {{ (player.stats.luck || 0) >= 9 ? '【运9极境·刀刀真神伤】' : `(${Math.min(100, (player.stats.luck || 0) * 10)}% 几率极值)` }}
              </span>
            </div>
            <!-- 终极倍攻乘数 -->
            <div v-if="player.stats.damageMultRatio" class="flex justify-between py-1 bg-orange-950/30 px-1.5 rounded border border-orange-600/40">
              <span class="text-orange-300 font-bold flex items-center gap-1">
                <span>💥</span>
                <span>终极倍攻加成:</span>
              </span>
              <span class="font-black text-orange-400 font-mono">
                +{{ ((player.stats.damageMultRatio || 0) * 100).toFixed(0) }}% 独立增伤
              </span>
            </div>
            <!-- 神圣破甲穿透 -->
            <div v-if="player.stats.defenseIgnoreRate" class="flex justify-between py-1 bg-sky-950/30 px-1.5 rounded border border-sky-600/40">
              <span class="text-sky-300 font-bold flex items-center gap-1">
                <span>⚔️</span>
                <span>神圣破甲穿透:</span>
              </span>
              <span class="font-black text-sky-400 font-mono">
                {{ ((player.stats.defenseIgnoreRate || 0) * 100).toFixed(0) }}% 忽视防御
              </span>
            </div>
            <!-- 攻速溢出转化为风雷残影连击 -->
            <div v-if="player.stats.haste > 34" class="flex justify-between py-1 bg-gradient-to-r from-amber-950/60 to-yellow-900/30 px-1.5 rounded border border-amber-500/50">
              <span class="text-amber-300 font-bold flex items-center gap-1">
                <span>⚡</span>
                <span>风雷残影连击:</span>
              </span>
              <span class="font-black text-amber-400 font-mono">
                {{ (player.stats.phantomStrikeRate * 100).toFixed(1) }}% <span class="text-[10px] text-zinc-400">(溢出+{{ player.stats.haste - 34 }})</span>
              </span>
            </div>
          </div>

          <!-- 套装神力羁绊卡片 -->
          <div v-if="activeSets.length > 0" class="bg-gradient-to-r from-purple-950/50 via-zinc-950 to-black p-2.5 rounded-lg border border-purple-600/50 flex flex-col gap-1.5 shadow-md">
            <div class="flex items-center justify-between text-xs font-bold text-purple-300">
              <span class="flex items-center gap-1">
                <span>👑</span>
                <span>套装神力羁绊</span>
              </span>
              <span class="text-purple-200 font-mono text-[11px]">{{ activeSets.length }} 套激活</span>
            </div>
            <div class="flex flex-col gap-1 text-[10px]">
              <div v-for="item in activeSets" :key="item.set.id" class="bg-black/60 p-1.5 rounded border border-purple-900/40">
                <div class="flex justify-between text-purple-200 font-bold">
                  <span>{{ item.set.name }}</span>
                  <span class="text-amber-400 font-mono">{{ item.count }} 件已穿戴</span>
                </div>
                <div v-for="bonus in item.activeBonuses" :key="bonus.count" class="text-emerald-400 text-[9px] mt-0.5">
                  ✓ [{{ bonus.count }}件套] {{ bonus.desc }}
                </div>
              </div>
            </div>
          </div>

          <!-- 等级境界里程碑特权卡片 -->
          <div class="bg-gradient-to-r from-amber-950/50 via-yellow-950/30 to-black p-2.5 rounded-lg border border-amber-600/40 flex flex-col gap-1.5 shadow-md">
            <div class="flex items-center justify-between text-xs font-bold text-amber-300">
              <span class="flex items-center gap-1">
                <span>🎖️</span>
                <span>等级境界特权</span>
              </span>
              <span class="text-gold-gradient font-black text-sm">【{{ currentMilestone.title }}】</span>
            </div>
            <div class="text-[10px] text-zinc-300 grid grid-cols-3 gap-1 pt-1 border-t border-amber-900/40 text-center font-mono">
              <span class="bg-black/60 p-1 rounded border border-zinc-800">急速 +{{ currentMilestone.haste }}</span>
              <span class="bg-black/60 p-1 rounded border border-zinc-800">暴击 +{{ (currentMilestone.critRate * 100).toFixed(0) }}%</span>
              <span class="bg-black/60 p-1 rounded border border-zinc-800">闪避 +{{ (currentMilestone.dodgeRate * 100).toFixed(0) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Entity, EquipSlot, ItemInstance, ItemQuality } from '../types/game';
import { StatCalculator } from '../domain/StatCalculator';
import { ASCENSION_DEFINITIONS } from '../domain/definitions/ascension';

const props = defineProps<{
  player: Entity;
  equipped: Partial<Record<EquipSlot, ItemInstance>>;
}>();

const currentTier = computed(() => props.player.stats.ascensionTier || 0);

const currentAscensionTitle = computed(() => {
  if (currentTier.value === 0) return '凡体·未飞升';
  return ASCENSION_DEFINITIONS[currentTier.value]?.title || `${currentTier.value}转修士`;
});

const currentMapName = computed(() => {
  if (currentTier.value === 0) return '【比奇省·祖玛神殿】';
  return ASCENSION_DEFINITIONS[currentTier.value]?.mapName || '上界神域';
});

const nextAscension = computed(() => {
  return ASCENSION_DEFINITIONS[currentTier.value + 1] || null;
});

const activeSets = computed(() => {
  return StatCalculator.getActiveSets(props.equipped);
});

const currentMilestone = computed(() => {
  return StatCalculator.getLevelMilestone(props.player.stats.level);
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'unequip', slot: EquipSlot): void;
  (e: 'ascend'): void;
}>();

const leftSlots: { key: EquipSlot; name: string; placeholder: string }[] = [
  { key: 'weapon', name: '武器', placeholder: '🗡️' },
  { key: 'necklace', name: '项链', placeholder: '📿' },
  { key: 'bracelet_l', name: '左手镯', placeholder: '⭕' },
  { key: 'ring_l', name: '左戒指', placeholder: '💍' },
];

const rightSlots: { key: EquipSlot; name: string; placeholder: string }[] = [
  { key: 'helmet', name: '头盔', placeholder: '🪖' },
  { key: 'armor', name: '重甲', placeholder: '🥋' },
  { key: 'bracelet_r', name: '右手镯', placeholder: '⭕' },
  { key: 'ring_r', name: '右戒指', placeholder: '💍' },
];

const handleSlotClick = (slot: EquipSlot) => {
  if (props.equipped[slot]) {
    emit('unequip', slot);
  }
};

const getSlotBorderClass = (item?: ItemInstance) => {
  if (!item) return 'border-zinc-800 hover:border-zinc-600';
  switch (item.quality) {
    case 4: return 'border-orange-500 shadow-orange-glow';
    case 3: return 'border-purple-500 shadow-purple-glow';
    case 2: return 'border-blue-500 shadow-blue-glow';
    case 1: return 'border-green-500';
    default: return 'border-slate-400';
  }
};

const getQualityTextClass = (quality: ItemQuality) => {
  switch (quality) {
    case 4: return 'text-orange-400';
    case 3: return 'text-purple-400';
    case 2: return 'text-blue-400';
    case 1: return 'text-green-400';
    default: return 'text-slate-300';
  }
};

const getSlotTitle = (slot: EquipSlot) => {
  const item = props.equipped[slot];
  if (!item) return '空槽位';
  return `${item.name} (点击卸下)`;
};
</script>
