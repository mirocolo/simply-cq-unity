<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
    <div class="relative w-full max-w-3xl max-h-[92vh] overflow-hidden legend-box p-5 rounded-lg flex flex-col gap-4 animate-fadeIn text-zinc-200 border border-amber-900/60 shadow-2xl">
      <!-- 弹窗标题 -->
      <div class="flex items-center justify-between border-b border-amber-900/50 pb-3">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">⚒️</span>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-amber-300">太古天工·装备部位强化</span>
              <span class="text-xs px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold">
                ✓ 零损换装·永久继承
              </span>
            </div>
            <p class="text-xs text-zinc-400 mt-0.5">
              熔炼黑铁矿石与天工神石淬炼八大部位，换装直接继承强化等级，激活全身流光共鸣！
            </p>
          </div>
        </div>
        <button 
          @click="$emit('close')"
          class="text-zinc-400 hover:text-white px-2.5 py-1 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 text-base font-bold transition-all"
        >
          ✕
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto max-h-[72vh] custom-scrollbar pr-1">
        <!-- 左侧 8 大部位选择器 (5列) -->
        <div class="md:col-span-5 flex flex-col gap-2">
          <div class="text-xs font-bold text-amber-400/90 mb-1 flex items-center justify-between">
            <span>【选择强化的装备部位】</span>
            <span class="text-[11px] text-zinc-500 font-mono">共鸣等级: +{{ minSlotLevel }}</span>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="slot in slotList"
              :key="slot.key"
              @click="selectedSlot = slot.key"
              class="p-2.5 rounded-lg border flex flex-col gap-1 cursor-pointer transition-all relative overflow-hidden"
              :class="selectedSlot === slot.key 
                ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/30 ring-1 ring-amber-500/50' 
                : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'"
            >
              <div class="flex items-center justify-between">
                <span class="text-xl">{{ slot.icon }}</span>
                <span 
                  class="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
                  :class="getLevelBadgeClass(getSlotLevel(slot.key))"
                >
                  +{{ getSlotLevel(slot.key) }}
                </span>
              </div>

              <div class="flex items-center justify-between mt-1">
                <span class="text-xs font-bold text-zinc-200">{{ slot.name }}</span>
                <span class="text-[10px] text-zinc-400 truncate max-w-[70px]">
                  {{ world.equipped[slot.key]?.name || '未穿戴' }}
                </span>
              </div>

              <!-- 选中小三角标志 -->
              <div 
                v-if="selectedSlot === slot.key"
                class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rotate-45"
              ></div>
            </div>
          </div>

          <!-- 全身强化共鸣达成进度 -->
          <div class="mt-3 p-3 rounded-lg bg-zinc-950/80 border border-amber-900/30 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-300">🌟 全身强化共鸣神威</span>
              <span class="text-[11px] font-mono text-zinc-400">最低部位等级: +{{ minSlotLevel }}</span>
            </div>

            <div class="flex flex-col gap-1.5 text-[11px]">
              <div 
                v-for="res in ENHANCEMENT_RESONANCES" 
                :key="res.reqLevel"
                class="flex items-center justify-between p-1.5 rounded border"
                :class="minSlotLevel >= res.reqLevel 
                  ? 'bg-amber-950/30 border-amber-600/50 text-amber-200 font-bold' 
                  : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500'"
              >
                <span>{{ res.title }}</span>
                <span class="text-[10px]">{{ minSlotLevel >= res.reqLevel ? '已激活' : `需全身+${res.reqLevel}` }}</span>
              </div>
            </div>

            <!-- 一键强化全身 (均衡共鸣) 按钮 -->
            <button
              @click="handleEnhanceAll"
              :disabled="!canEnhanceAny"
              class="w-full mt-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              :class="canEnhanceAny
                ? 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 text-zinc-950 shadow-md shadow-amber-950/60 animate-pulse cursor-pointer'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-60'"
              title="优先强化等级最低的部位，以最低消耗均衡冲刺全身共鸣等级"
            >
              <span>🌟</span>
              <span>一键强化全身 (均衡共鸣)</span>
            </button>
          </div>
        </div>

        <!-- 右侧：当前选中部位锻造面板 (7列) -->
        <div class="md:col-span-7 flex flex-col gap-3 bg-zinc-950/80 p-4 rounded-lg border border-amber-900/40 justify-between">
          <!-- 部位标题与当前属性 -->
          <div>
            <div class="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div class="flex items-center gap-2">
                <span class="text-2xl">{{ currentSlotInfo.icon }}</span>
                <div>
                  <div class="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <span>{{ currentSlotInfo.name }}部位</span>
                    <span 
                      class="text-xs font-mono px-2 py-0.5 rounded font-bold"
                      :class="getLevelBadgeClass(currentLevel)"
                    >
                      +{{ currentLevel }}
                    </span>
                  </div>
                  <div class="text-[11px] text-zinc-400 mt-0.5">
                    已装备: {{ world.equipped[selectedSlot]?.name || '未穿戴 (属性仍全局生效)' }}
                  </div>
                </div>
              </div>

              <div class="text-right">
                <span class="text-[10px] text-zinc-500 block">最高上限</span>
                <span class="text-xs font-bold text-zinc-300 font-mono">+15 极境</span>
              </div>
            </div>

            <!-- 属性提升预览 -->
            <div class="mt-3 p-3 rounded bg-zinc-900/70 border border-zinc-800/80 flex flex-col gap-2">
              <span class="text-xs font-bold text-amber-400/90">【部位属性加成】</span>

              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-zinc-500">当前属性: </span>
                  <span class="text-zinc-300 font-mono font-bold">{{ currentStatText }}</span>
                </div>
                <div>
                  <span class="text-zinc-500">强化后属性: </span>
                  <span class="text-emerald-400 font-mono font-bold">{{ nextStatText }}</span>
                </div>
              </div>
            </div>

            <!-- 消耗材料与金币 -->
            <div v-if="currentLevel < MAX_ENHANCE_LEVEL" class="mt-3 flex flex-col gap-2">
              <span class="text-xs font-bold text-amber-400/90">【强化所需消耗】</span>

              <div class="grid grid-cols-2 gap-2 text-xs">
                <!-- 金币 -->
                <div 
                  class="p-2 rounded bg-zinc-900/60 border flex items-center justify-between"
                  :class="hasEnoughGold ? 'border-zinc-800 text-zinc-200' : 'border-red-900/60 text-red-400'"
                >
                  <div class="flex items-center gap-1.5">
                    <span>🪙</span>
                    <span>金币</span>
                  </div>
                  <span class="font-mono font-bold">{{ currentCost.gold.toLocaleString() }}</span>
                </div>

                <!-- 黑铁矿石 -->
                <div 
                  v-if="currentCost.ironOre > 0"
                  class="p-2 rounded bg-zinc-900/60 border flex items-center justify-between"
                  :class="ironCount >= currentCost.ironOre ? 'border-zinc-800 text-zinc-200' : 'border-red-900/60 text-red-400'"
                >
                  <div class="flex items-center gap-1.5">
                    <span>🪨</span>
                    <span>黑铁矿石</span>
                  </div>
                  <span class="font-mono font-bold">{{ ironCount }} / {{ currentCost.ironOre }}</span>
                </div>

                <!-- 纯黑玄铁 -->
                <div 
                  v-if="currentCost.pureIron > 0"
                  class="p-2 rounded bg-zinc-900/60 border flex items-center justify-between"
                  :class="pureCount >= currentCost.pureIron ? 'border-zinc-800 text-zinc-200' : 'border-red-900/60 text-red-400'"
                >
                  <div class="flex items-center gap-1.5">
                    <span>⛏️</span>
                    <span>纯黑玄铁</span>
                  </div>
                  <span class="font-mono font-bold">{{ pureCount }} / {{ currentCost.pureIron }}</span>
                </div>

                <!-- 天工神石 -->
                <div 
                  v-if="currentCost.godStone > 0"
                  class="p-2 rounded bg-zinc-900/60 border flex items-center justify-between"
                  :class="godCount >= currentCost.godStone ? 'border-zinc-800 text-zinc-200' : 'border-red-900/60 text-red-400'"
                >
                  <div class="flex items-center gap-1.5">
                    <span>💎</span>
                    <span>天工神石</span>
                  </div>
                  <span class="font-mono font-bold">{{ godCount }} / {{ currentCost.godStone }}</span>
                </div>
              </div>

              <!-- 成功率与保底机制 -->
              <div class="mt-2 p-2.5 rounded bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <span class="text-zinc-400">成功概率:</span>
                  <span class="font-bold font-mono text-amber-300 text-sm">{{ successPercent }}%</span>
                  <span v-if="pityCount > 0" class="text-[11px] text-emerald-400 font-bold">
                    (含保底 +{{ pityCount * 5 }}%)
                  </span>
                </div>
                <span class="text-[10px] text-zinc-500">淬炼失败绝不掉级</span>
              </div>
            </div>

            <div v-else class="mt-4 p-4 rounded bg-amber-950/20 border border-amber-600/40 text-center">
              <span class="text-sm font-bold text-amber-300">👑 该部位已达强化顶峰 (+15)！</span>
            </div>
          </div>

          <!-- 底部动作按钮与操作反馈 -->
          <div class="flex flex-col gap-2 pt-2 border-t border-zinc-800/80">
            <div v-if="lastMessage" class="text-xs text-center font-bold" :class="lastSuccess ? 'text-emerald-400' : 'text-amber-400'">
              {{ lastMessage }}
            </div>

            <div v-if="currentLevel < MAX_ENHANCE_LEVEL" class="grid grid-cols-2 gap-2.5">
              <button
                @click="handleEnhance"
                :disabled="!canEnhance"
                class="py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5"
                :class="canEnhance 
                  ? 'bg-zinc-850 hover:bg-zinc-750 text-amber-300 border border-amber-600/50 shadow active:scale-98 cursor-pointer' 
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-60'"
              >
                <span>⚒️</span>
                <span>单次淬炼 (+{{ currentLevel }}➔+{{ currentLevel + 1 }})</span>
              </button>

              <button
                @click="handleEnhanceOneKey"
                :disabled="!canEnhance"
                class="py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5"
                :class="canEnhance 
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-zinc-950 shadow-lg hover:shadow-amber-500/20 active:scale-98 cursor-pointer' 
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-60'"
                title="连续自动淬火直到当前部位升级成功或材料金币耗尽"
              >
                <span>⚡</span>
                <span>一键淬炼此部位</span>
              </button>
            </div>

            <div class="text-[11px] text-zinc-500 text-center leading-relaxed">
              强化等级永久绑定于部位，随时更换新装备自动无损生效
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { GameWorld } from '../domain/GameWorld';
import { EquipSlot } from '../types/game';
import { 
  ENHANCEABLE_SLOTS, 
  ENHANCE_COSTS, 
  MAX_ENHANCE_LEVEL, 
  ENHANCEMENT_RESONANCES,
  getSlotEnhanceStats
} from '../domain/definitions/enhancement';

const props = defineProps<{
  world: GameWorld;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const selectedSlot = ref<EquipSlot>('weapon');
const lastMessage = ref<string>('');
const lastSuccess = ref<boolean>(false);

const slotList: { key: EquipSlot; name: string; icon: string }[] = [
  { key: 'weapon', name: '武器', icon: '⚔️' },
  { key: 'armor', name: '衣服', icon: '🥋' },
  { key: 'helmet', name: '头盔', icon: '🪖' },
  { key: 'necklace', name: '项链', icon: '📿' },
  { key: 'bracelet_l', name: '左手镯', icon: '🛡️' },
  { key: 'bracelet_r', name: '右手镯', icon: '🛡️' },
  { key: 'ring_l', name: '左戒指', icon: '💍' },
  { key: 'ring_r', name: '右戒指', icon: '💍' }
];

const currentSlotInfo = computed(() => {
  return slotList.find(s => s.key === selectedSlot.value) || slotList[0];
});

function getSlotLevel(slot: EquipSlot): number {
  return props.world.slotEnhancements[slot] || 0;
}

const currentLevel = computed(() => {
  return getSlotLevel(selectedSlot.value);
});

const minSlotLevel = computed(() => {
  const lvls = ENHANCEABLE_SLOTS.map(s => props.world.slotEnhancements[s] || 0);
  return Math.min(...lvls);
});

const currentCost = computed(() => {
  return ENHANCE_COSTS[currentLevel.value] || { gold: 0, ironOre: 0, pureIron: 0, godStone: 0, baseSuccessRate: 1 };
});

const ironCount = computed(() => props.world.getMaterialCount('mat_iron_ore'));
const pureCount = computed(() => props.world.getMaterialCount('mat_pure_iron'));
const godCount = computed(() => props.world.getMaterialCount('mat_god_stone'));
const hasEnoughGold = computed(() => props.world.player.stats.gold >= currentCost.value.gold);

const pityCount = computed(() => {
  return props.world.slotEnhancePity[selectedSlot.value] || 0;
});

const successPercent = computed(() => {
  const base = currentCost.value.baseSuccessRate;
  const pity = pityCount.value * 0.05;
  return Math.min(100, Math.round((base + pity) * 100));
});

const canEnhance = computed(() => {
  if (currentLevel.value >= MAX_ENHANCE_LEVEL) return false;
  if (!hasEnoughGold.value) return false;
  if (currentCost.value.ironOre > 0 && ironCount.value < currentCost.value.ironOre) return false;
  if (currentCost.value.pureIron > 0 && pureCount.value < currentCost.value.pureIron) return false;
  if (currentCost.value.godStone > 0 && godCount.value < currentCost.value.godStone) return false;
  return true;
});

const canEnhanceAny = computed(() => {
  return ENHANCEABLE_SLOTS.some(slot => props.world.canAffordEnhance(slot).can);
});

const currentStatText = computed(() => {
  if (currentLevel.value <= 0) return '无加成';
  const cur = getSlotEnhanceStats(selectedSlot.value, currentLevel.value);
  return formatStats(cur);
});

const nextStatText = computed(() => {
  if (currentLevel.value >= MAX_ENHANCE_LEVEL) return '已满级';
  const nxt = getSlotEnhanceStats(selectedSlot.value, currentLevel.value + 1);
  return formatStats(nxt);
});

function formatStats(st: ReturnType<typeof getSlotEnhanceStats>): string {
  const parts: string[] = [];
  if (st.minDC > 0 || st.maxDC > 0) parts.push(`攻击 +${st.minDC}~${st.maxDC}`);
  if (st.minAC > 0 || st.maxAC > 0) parts.push(`防御 +${st.minAC}~${st.maxAC}`);
  if (st.maxHp > 0) parts.push(`生命 +${st.maxHp}`);
  if (st.critBonus) parts.push(`暴击 +${st.critBonus}%`);
  return parts.join(' | ') || '无加成';
}

function handleEnhance() {
  const res = props.world.enhanceSlot(selectedSlot.value);
  lastMessage.value = res.message;
  lastSuccess.value = res.success;
}

function handleEnhanceOneKey() {
  const res = props.world.enhanceSlotOneKey(selectedSlot.value);
  lastMessage.value = res.message;
  lastSuccess.value = res.successCount > 0;
}

function handleEnhanceAll() {
  const res = props.world.enhanceAllSlotsOneKey();
  lastMessage.value = res.message;
  lastSuccess.value = res.totalSuccess > 0;
}

function getLevelBadgeClass(level: number): string {
  if (level <= 0) return 'bg-zinc-800 text-zinc-400';
  if (level <= 3) return 'bg-zinc-800 text-zinc-200';
  if (level <= 6) return 'bg-sky-950 text-sky-300 border border-sky-600/50';
  if (level <= 9) return 'bg-purple-950 text-purple-300 border border-purple-600/50';
  if (level <= 12) return 'bg-amber-950 text-amber-300 border border-amber-600/50';
  return 'bg-rose-950 text-rose-300 border border-rose-600/50 animate-pulse';
}
</script>

<style scoped>
.legend-box {
  background: radial-gradient(circle at 50% 0%, #1c1511 0%, #0d0b0a 100%);
}
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.4);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #78350f;
  border-radius: 3px;
}
</style>
