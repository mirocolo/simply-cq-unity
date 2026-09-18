<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
    <!-- 背包主面板容器 -->
    <div class="relative w-full max-w-2xl legend-box p-4 rounded-lg flex flex-col gap-3 animate-fadeIn text-zinc-200">
      <!-- 弹窗标题 -->
      <div class="flex items-center justify-between border-b border-legend-border pb-2">
        <div class="flex items-center gap-2">
          <span class="text-xl">🎒</span>
          <span class="text-base font-bold text-gold-gradient">随身包裹 ({{ inventory.length }} / 40)</span>
        </div>
        <button 
          @click="$emit('close')"
          class="text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-zinc-800 text-lg font-bold"
        >
          ✕
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- 左侧 2 列：40 格网格 (5行 x 8列) -->
        <div class="md:col-span-2 bg-zinc-950/90 p-3 rounded-lg border border-legend-border">
          <div class="grid grid-cols-8 gap-1.5">
            <div 
              v-for="index in 40" 
              :key="index"
              @click="handleSelect(inventory[index - 1])"
              class="relative w-12 h-12 bg-zinc-900 rounded border flex items-center justify-center cursor-pointer transition-all hover:scale-105"
              :class="getSlotClass(inventory[index - 1], selectedItem === inventory[index - 1])"
            >
              <!-- 物品图标 -->
              <span v-if="inventory[index - 1]" class="text-2xl">
                {{ inventory[index - 1].icon }}
              </span>

              <!-- 堆叠数量 (针对药水无限堆叠) -->
              <span 
                v-if="inventory[index - 1] && (inventory[index - 1].count || 1) > 1"
                class="absolute bottom-0.5 right-1 text-[10px] font-extrabold text-amber-300 bg-black/90 px-1 border border-amber-500/40 rounded shadow"
              >
                x{{ inventory[index - 1].count }}
              </span>

              <!-- 品质小标 -->
              <span 
                v-if="inventory[index - 1]"
                class="absolute top-0.5 left-0.5 text-[8px] font-bold px-0.5 rounded leading-none"
                :class="getQualityBadgeClass(inventory[index - 1].quality)"
              >
                {{ getQualityName(inventory[index - 1].quality) }}
              </span>

              <!-- 装备阶数小标 -->
              <span 
                v-if="inventory[index - 1] && inventory[index - 1].tier"
                class="absolute top-0.5 right-0.5 text-[8px] font-black text-amber-300 bg-black/90 px-0.5 rounded leading-none border border-amber-600/40 font-mono"
              >
                {{ inventory[index - 1].tier }}阶
              </span>
            </div>
          </div>
        </div>

        <!-- 右侧 1 列：物品详情与属性对比对比栏 -->
        <div class="bg-zinc-950/90 p-3 rounded-lg border border-legend-border flex flex-col justify-between">
          <div v-if="selectedItem" class="flex flex-col gap-2">
            <!-- 物品头部 -->
            <div class="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span class="text-3xl">{{ selectedItem.icon }}</span>
              <div class="flex flex-col">
                <div class="flex items-center gap-1 flex-wrap">
                  <span class="text-sm font-bold" :class="getQualityTextClass(selectedItem.quality)">
                    {{ selectedItem.name }}
                  </span>
                  <span v-if="selectedItem.tier" class="text-[9px] px-1 py-0.2 bg-amber-950/80 text-amber-300 border border-amber-600/40 rounded font-bold">
                    {{ selectedItem.tier }}阶
                  </span>
                  <span v-if="selectedItem.setName" class="text-[9px] px-1 py-0.2 bg-purple-950/80 text-purple-300 border border-purple-600/40 rounded font-bold">
                    {{ selectedItem.setName }}
                  </span>
                </div>
                <span class="text-[10px] text-zinc-400">
                  {{ selectedItem.type === 'potion' ? '消耗品' : `部位: ${getSlotName(selectedItem.slot)}` }}
                  (Lv.{{ selectedItem.levelReq }})
                </span>
                <span v-if="selectedItem.specialEffect" class="text-[10px] text-orange-400 font-bold flex items-center gap-1">
                  <span>✨</span>
                  <span>神技: {{ selectedItem.specialEffect }}</span>
                </span>
                <span v-if="selectedItem.type === 'equipment'" class="text-[11px] text-yellow-400 font-mono font-bold flex items-center gap-1">
                  <span>战力评分:</span>
                  <span class="text-amber-300 font-black">⚔️ {{ getItemPower(selectedItem) }}</span>
                </span>
              </div>
            </div>

            <!-- 属性列表与对比 -->
            <div class="flex flex-col gap-1 text-xs py-1">
              <div v-if="selectedItem.type === 'potion'" class="flex flex-col gap-1 text-emerald-400">
                <span v-if="selectedItem.recoverHp">恢复生命: +{{ selectedItem.recoverHp }}</span>
                <span v-if="selectedItem.recoverMp">恢复法力: +{{ selectedItem.recoverMp }}</span>
                <span class="text-amber-400 font-bold">📦 当前存量: {{ selectedItem.count || 1 }} 瓶 (同类无限堆叠)</span>
              </div>

              <template v-else>
                <div class="flex justify-between">
                  <span class="text-zinc-400">物理攻击:</span>
                  <span class="font-bold text-yellow-300">
                    {{ selectedItem.minDC }} - {{ selectedItem.maxDC }}
                    <span v-if="getDiffText('dc')" class="text-[10px] text-emerald-400 font-normal">
                      ({{ getDiffText('dc') }})
                    </span>
                  </span>
                </div>

                <div class="flex justify-between">
                  <span class="text-zinc-400">物理防御:</span>
                  <span class="font-bold text-emerald-300">
                    {{ selectedItem.minAC }} - {{ selectedItem.maxAC }}
                    <span v-if="getDiffText('ac')" class="text-[10px] text-emerald-400 font-normal">
                      ({{ getDiffText('ac') }})
                    </span>
                  </span>
                </div>

                <div v-if="selectedItem.maxHp > 0" class="flex justify-between">
                  <span class="text-zinc-400">生命加成:</span>
                  <span class="font-bold text-red-400">+{{ selectedItem.maxHp }}</span>
                </div>

                <div v-if="selectedItem.critBonus > 0" class="flex justify-between">
                  <span class="text-zinc-400">暴击率词条:</span>
                  <span class="font-bold text-rose-400">+{{ selectedItem.critBonus }}%</span>
                </div>

                <div v-if="selectedItem.hasteBonus > 0" class="flex justify-between">
                  <span class="text-zinc-400">攻速急速词条:</span>
                  <span class="font-bold text-cyan-400">+{{ selectedItem.hasteBonus }}</span>
                </div>

                <div v-if="selectedItem.lifestealBonus && selectedItem.lifestealBonus > 0" class="flex justify-between">
                  <span class="text-zinc-400">生命吸血词条:</span>
                  <span class="font-bold text-emerald-400">+{{ selectedItem.lifestealBonus }}%</span>
                </div>

                <div v-if="selectedItem.luck && selectedItem.luck > 0" class="flex justify-between">
                  <span class="text-zinc-400">永久幸运加成:</span>
                  <span class="font-bold text-amber-400">+{{ selectedItem.luck }} (气运极境)</span>
                </div>

                <div v-if="selectedItem.damageMultRatio && selectedItem.damageMultRatio > 0" class="flex justify-between">
                  <span class="text-zinc-400">终极倍攻乘数:</span>
                  <span class="font-bold text-orange-400">+{{ (selectedItem.damageMultRatio * 100).toFixed(0) }}% 独立增伤</span>
                </div>

                <div v-if="selectedItem.defenseIgnoreRate && selectedItem.defenseIgnoreRate > 0" class="flex justify-between">
                  <span class="text-zinc-400">神圣破甲穿透:</span>
                  <span class="font-bold text-sky-400">{{ (selectedItem.defenseIgnoreRate * 100).toFixed(0) }}% 忽视防御</span>
                </div>
              </template>

              <div class="text-[10px] text-zinc-500 italic mt-1 border-t border-zinc-900 pt-1">
                {{ selectedItem.desc }}
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex gap-2 mt-2">
              <button 
                @click="handleUse(selectedItem)"
                :disabled="selectedItem.type === 'equipment' && !canEquip(selectedItem)"
                class="flex-1 py-1.5 rounded text-xs font-bold transition-all shadow active:scale-95"
                :class="selectedItem.type === 'equipment' && !canEquip(selectedItem) 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700' 
                  : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'"
              >
                {{ getEquipBtnText(selectedItem) }}
              </button>
              <button 
                @click="handleDrop(selectedItem)"
                class="px-2.5 py-1.5 bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 rounded text-xs transition-all"
                title="丢弃"
              >
                丢弃
              </button>
            </div>
          </div>

          <!-- 未选中状态 -->
          <div v-else class="flex flex-col items-center justify-center h-full text-zinc-600 text-xs py-8">
            <span>👈 点击左侧物品查看详情与属性对比</span>
          </div>

          <!-- 估价 -->
          <div v-if="selectedItem" class="text-[10px] text-zinc-500 text-right mt-1">
            出售回收单价: 🪙 {{ selectedItem.price }}
          </div>
        </div>
      </div>

      <!-- 底部操作栏：一键穿戴、回收≤身上战力、回收白绿装 -->
      <div class="flex items-center justify-between border-t border-legend-border pt-2">
        <div class="flex flex-wrap gap-2">
          <button 
            @click="handleOneKeyEquipClick"
            class="px-3.5 py-2 bg-gradient-to-r from-amber-700 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 text-white font-bold rounded-lg text-xs shadow-gold-glow active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>⚡</span>
            <span>一键穿戴战力最高</span>
          </button>

          <button 
            @click="$emit('oneKeyRecycleWeaker')"
            class="px-3.5 py-2 bg-gradient-to-r from-red-800 to-amber-700 hover:from-red-700 hover:to-amber-600 text-white font-bold rounded-lg text-xs shadow active:scale-95 transition-all flex items-center gap-1"
            title="回收战力小于等于身上穿戴装备的同部位装备，妥善保留极品神装"
          >
            <span>♻️</span>
            <span>一键回收≤身上战力</span>
          </button>

          <button 
            @click="$emit('oneKeyRecycle')"
            class="px-3 py-2 bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-700 hover:to-teal-600 text-white font-bold rounded-lg text-xs shadow active:scale-95 transition-all flex items-center gap-1"
            title="一键熔炼背包内所有白色普通、绿色优秀品质装备"
          >
            <span>🧹</span>
            <span>回收白/绿装</span>
          </button>

          <button 
            @click="$emit('oneKeyRecycleBlue')"
            class="px-3 py-2 bg-gradient-to-r from-cyan-800 to-blue-700 hover:from-cyan-700 hover:to-blue-600 text-white font-bold rounded-lg text-xs shadow active:scale-95 transition-all flex items-center gap-1"
            title="一键熔炼背包内所有蓝色及以下品质装备(自动保护特戒与当前最优件)"
          >
            <span>💎</span>
            <span>回收≤蓝装</span>
          </button>
        </div>

        <span class="text-xs text-zinc-400 shrink-0">
          容量: {{ inventory.length }} / 40
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Entity, EquipSlot, ItemInstance, ItemQuality } from '../types/game';
import { StatCalculator } from '../domain/StatCalculator';

const props = defineProps<{
  inventory: ItemInstance[];
  equipped: Partial<Record<EquipSlot, ItemInstance>>;
  player?: Entity;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'useItem', item: ItemInstance): void;
  (e: 'dropItem', item: ItemInstance): void;
  (e: 'oneKeyEquip'): void;
  (e: 'oneKeyRecycle'): void;
  (e: 'oneKeyRecycleWeaker'): void;
  (e: 'oneKeyRecycleBlue'): void;
}>();

const getItemPower = (item?: ItemInstance | null) => {
  if (!item) return 0;
  return StatCalculator.getItemCombatPower(item);
};

const canEquip = (item?: ItemInstance | null): boolean => {
  if (!item || item.type !== 'equipment' || !item.slot) return false;
  if (!props.player) return true;
  const playerTier = props.player.stats.ascensionTier || 0;
  if (item.tier > playerTier) return false;
  if (item.tier > 0 && item.levelReq && item.levelReq > props.player.stats.level) return false;
  return true;
};

const getEquipBtnText = (item?: ItemInstance | null): string => {
  if (!item) return '';
  if (item.type === 'potion') return '使用药水';
  if (!props.player) return '穿戴装备';
  const playerTier = props.player.stats.ascensionTier || 0;
  if (item.tier > playerTier) return `需达到 [${item.tier}阶飞升]`;
  if (item.tier > 0 && item.levelReq && item.levelReq > props.player.stats.level) {
    return `需达 Lv.${item.levelReq}`;
  }
  return '穿戴装备';
};

const selectedItem = ref<ItemInstance | null>(props.inventory[0] || null);

const handleSelect = (item?: ItemInstance) => {
  if (item) selectedItem.value = item;
};

const handleUse = (item: ItemInstance) => {
  emit('useItem', item);
  setTimeout(() => {
    if (!props.inventory.some(i => i.instanceId === selectedItem.value?.instanceId)) {
      selectedItem.value = props.inventory[0] || null;
    }
  }, 50);
};

const handleDrop = (item: ItemInstance) => {
  emit('dropItem', item);
  setTimeout(() => {
    if (!props.inventory.some(i => i.instanceId === selectedItem.value?.instanceId)) {
      selectedItem.value = props.inventory[0] || null;
    }
  }, 50);
};

const handleOneKeyEquipClick = () => {
  emit('oneKeyEquip');
  setTimeout(() => {
    if (!props.inventory.some(i => i.instanceId === selectedItem.value?.instanceId)) {
      selectedItem.value = props.inventory[0] || null;
    }
  }, 50);
};

const getSlotClass = (item?: ItemInstance, isSelected = false) => {
  if (!item) return 'border-zinc-800/60 bg-zinc-900/40';
  let border = 'border-slate-500';
  if (item.quality === 1) border = 'border-green-600';
  if (item.quality === 2) border = 'border-blue-600 shadow-blue-glow';
  if (item.quality === 3) border = 'border-purple-600 shadow-purple-glow';
  if (item.quality === 4) border = 'border-orange-500 shadow-orange-glow';

  return `${border} ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
};

const getQualityTextClass = (q: ItemQuality) => {
  switch (q) {
    case 4: return 'text-orange-400 font-bold';
    case 3: return 'text-purple-400 font-bold';
    case 2: return 'text-blue-400 font-semibold';
    case 1: return 'text-green-400';
    default: return 'text-slate-300';
  }
};

const getQualityBadgeClass = (q: ItemQuality) => {
  switch (q) {
    case 4: return 'bg-orange-950 text-orange-400 border border-orange-600';
    case 3: return 'bg-purple-950 text-purple-400 border border-purple-600';
    case 2: return 'bg-blue-950 text-blue-400 border border-blue-600';
    case 1: return 'bg-green-950 text-green-400 border border-green-600';
    default: return 'bg-zinc-800 text-zinc-400';
  }
};

const getQualityName = (q: ItemQuality) => {
  return ['普', '优', '精', '史', '传'][q];
};

const getSlotName = (slot?: EquipSlot) => {
  if (!slot) return '饰品';
  const names: Record<EquipSlot, string> = {
    weapon: '武器',
    armor: '衣服',
    helmet: '头盔',
    necklace: '项链',
    bracelet_l: '手镯',
    bracelet_r: '手镯',
    ring_l: '戒指',
    ring_r: '戒指',
    special_paralyze: '麻痹特戒',
    special_revive: '复活特戒',
    special_protect: '护身特戒',
    special_wind: '狂风特戒',
    special_luck: '幸运特戒',
    special_greed: '贪婪特戒'
  };
  return names[slot] || '饰品';
};

const getDiffText = (type: 'dc' | 'ac') => {
  if (!selectedItem.value || !selectedItem.value.slot) return '';
  const currentEquipped = props.equipped[selectedItem.value.slot];
  if (!currentEquipped) return '+提升';

  if (type === 'dc') {
    const diffMax = selectedItem.value.maxDC - currentEquipped.maxDC;
    if (diffMax > 0) return `+${diffMax} 🔺`;
    if (diffMax < 0) return `${diffMax} 🔻`;
  }
  if (type === 'ac') {
    const diffMax = selectedItem.value.maxAC - currentEquipped.maxAC;
    if (diffMax > 0) return `+${diffMax} 🔺`;
    if (diffMax < 0) return `${diffMax} 🔻`;
  }
  return '';
};
</script>
