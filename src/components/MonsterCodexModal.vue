<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
    <div class="relative w-full max-w-4xl max-h-[92vh] overflow-hidden legend-box p-5 rounded-lg flex flex-col gap-4 animate-fadeIn text-zinc-200 border border-amber-900/60 shadow-2xl">
      <!-- 弹窗顶部栏 -->
      <div class="flex items-center justify-between border-b border-amber-900/50 pb-3">
        <div class="flex items-center gap-3">
          <span class="text-3xl">📖</span>
          <div>
            <div class="flex items-center gap-2.5">
              <span class="text-lg font-bold text-amber-300">百妖封魔录 · 万象悬赏令</span>
              <span class="text-xs px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 font-bold">
                永久属性飞跃
              </span>
            </div>
            <p class="text-xs text-zinc-400 mt-0.5">
              斩妖除魔录真名，参悟魔物神髓得永久全属性加成，揭榜悬赏赢取海量玄金与天工神石！
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Tab 切换按钮 -->
          <div class="flex bg-zinc-950/80 p-1 rounded-lg border border-zinc-800">
            <button
              @click="activeTab = 'codex'"
              class="px-3 py-1 rounded text-xs font-bold transition-all"
              :class="activeTab === 'codex' ? 'bg-amber-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'"
            >
              📖 百妖封魔录
            </button>
            <button
              @click="activeTab = 'bounty'"
              class="px-3 py-1 rounded text-xs font-bold transition-all relative"
              :class="activeTab === 'bounty' ? 'bg-amber-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'"
            >
              📜 万象悬赏令
              <span 
                v-if="hasClaimableBounty" 
                class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"
              />
            </button>
          </div>

          <button 
            @click="$emit('close')"
            class="text-zinc-400 hover:text-white px-2.5 py-1 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 text-base font-bold transition-all"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- 全局封魔录永久累积属性栏 -->
      <div class="bg-amber-950/30 border border-amber-900/40 rounded-lg p-2.5 flex flex-wrap items-center justify-between text-xs gap-3">
        <div class="flex items-center gap-1 text-amber-300 font-bold">
          <span>✨ 全图鉴永久领悟加成：</span>
        </div>
        <div class="flex flex-wrap items-center gap-4 font-mono text-zinc-300">
          <span v-if="totalBonus.maxHp > 0" class="text-emerald-400 font-bold">生命上限 +{{ totalBonus.maxHp }}</span>
          <span v-if="totalBonus.maxDC > 0" class="text-amber-400 font-bold">攻击力 +{{ totalBonus.minDC }}-{{ totalBonus.maxDC }}</span>
          <span v-if="totalBonus.maxAC > 0" class="text-blue-400 font-bold">防御力 +{{ totalBonus.minAC }}-{{ totalBonus.maxAC }}</span>
          <span v-if="totalBonus.critRate > 0" class="text-red-400 font-bold">暴击率 +{{ (totalBonus.critRate * 100).toFixed(1) }}%</span>
          <span v-if="totalBonus.maxHp === 0 && totalBonus.maxDC === 0" class="text-zinc-500">
            暂未领悟魔物里程碑，快去击杀魔物参悟神髓！
          </span>
        </div>
        <div class="text-[11px] text-zinc-400">
          已参悟: <span class="font-bold text-amber-400">{{ totalClaimedCount }}</span> / {{ totalMilestoneCount }} 阶
        </div>
      </div>

      <!-- Tab 1: 百妖封魔录 -->
      <div v-if="activeTab === 'codex'" class="grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto max-h-[64vh] custom-scrollbar pr-1">
        <!-- 左侧魔物列表 (5列) -->
        <div class="md:col-span-5 flex flex-col gap-2">
          <div class="text-xs font-bold text-amber-400/90 mb-1 flex items-center justify-between">
            <span>【妖魔谱系】</span>
            <span class="text-[11px] text-zinc-500">共 {{ codexList.length }} 尊魔物</span>
          </div>

          <div class="flex flex-col gap-1.5 overflow-y-auto max-h-[56vh] custom-scrollbar pr-1">
            <div
              v-for="item in codexList"
              :key="item.templateId"
              @click="selectedId = item.templateId"
              class="p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all relative overflow-hidden"
              :class="selectedId === item.templateId 
                ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50 shadow-md shadow-amber-950/30' 
                : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'"
            >
              <div class="flex items-center gap-2.5">
                <span class="text-2xl">{{ item.avatarIcon }}</span>
                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-bold text-zinc-200">{{ item.name }}</span>
                    <span 
                      v-if="item.isBoss"
                      class="text-[10px] px-1 py-0.2 bg-red-950/80 border border-red-700 text-red-300 font-bold rounded"
                    >
                      首领
                    </span>
                  </div>
                  <span class="text-[11px] text-zinc-400">{{ item.title }}</span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-0.5">
                <span class="text-[11px] font-mono text-zinc-400">
                  讨伐: <strong class="text-amber-400">{{ getKills(item.templateId) }}</strong>
                </span>
                <span class="text-[10px] text-emerald-400 font-bold">
                  {{ getUnlockedCount(item.templateId) }}/{{ item.milestones.length }} 达成
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧当前魔物神髓与里程碑突破 (7列) -->
        <div class="md:col-span-7 flex flex-col gap-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4">
          <div v-if="currentCodex" class="flex flex-col gap-3">
            <!-- 头部魔物身份卡 -->
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-3xl shadow-inner">
                  {{ currentCodex.avatarIcon }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-bold text-amber-300">{{ currentCodex.name }}</h3>
                    <span class="text-xs text-amber-400 font-semibold">{{ currentCodex.title }}</span>
                    <span 
                      v-if="currentCodex.isBoss"
                      class="text-[11px] px-1.5 py-0.5 bg-red-950/80 border border-red-700 text-red-300 font-bold rounded"
                    >
                      位面霸主
                    </span>
                  </div>
                  <p class="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {{ currentCodex.desc }}
                  </p>
                </div>
              </div>

              <div class="text-right flex flex-col items-end">
                <span class="text-xs text-zinc-400">累计斩杀</span>
                <span class="font-mono text-xl font-bold text-amber-400">{{ getKills(currentCodex.templateId) }}</span>
              </div>
            </div>

            <!-- 参悟里程碑阶梯 (3 阶) -->
            <div class="flex flex-col gap-2.5">
              <div class="text-xs font-bold text-amber-400/90">【神髓参悟阶梯】</div>

              <div 
                v-for="(ms, idx) in currentCodex.milestones" 
                :key="idx"
                class="p-3 rounded-lg border flex flex-col gap-2 transition-all"
                :class="isClaimed(currentCodex.templateId, idx) 
                  ? 'bg-emerald-950/20 border-emerald-800/50' 
                  : (canClaim(currentCodex.templateId, idx) ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/40' : 'bg-zinc-900/60 border-zinc-800')"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      阶位 {{ idx + 1 }}
                    </span>
                    <span class="text-xs font-bold text-zinc-100">{{ ms.label }}</span>
                  </div>

                  <!-- 进度指示 -->
                  <span class="font-mono text-xs text-zinc-400">
                    {{ Math.min(getKills(currentCodex.templateId), ms.kills) }} / {{ ms.kills }}
                  </span>
                </div>

                <!-- 进度条 -->
                <div class="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    class="h-full transition-all duration-300"
                    :class="isClaimed(currentCodex.templateId, idx) ? 'bg-emerald-500' : 'bg-amber-500'"
                    :style="{ width: `${Math.min(100, (getKills(currentCodex.templateId) / ms.kills) * 100)}%` }"
                  />
                </div>

                <!-- 属性加成与领悟按钮 -->
                <div class="flex items-center justify-between pt-1">
                  <div class="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span v-if="ms.maxHp" class="text-emerald-400 font-bold">+{{ ms.maxHp }}生命</span>
                    <span v-if="ms.maxDC" class="text-amber-400 font-bold">+{{ ms.minDC }}-{{ ms.maxDC }}攻击</span>
                    <span v-if="ms.maxAC" class="text-blue-400 font-bold">+{{ ms.minAC }}-{{ ms.maxAC }}防御</span>
                    <span v-if="ms.critRate" class="text-red-400 font-bold">+{{ (ms.critRate * 100).toFixed(1) }}%暴击</span>
                  </div>

                  <div>
                    <span 
                      v-if="isClaimed(currentCodex.templateId, idx)"
                      class="text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold flex items-center gap-1"
                    >
                      ✓ 已参悟
                    </span>
                    <button
                      v-else-if="canClaim(currentCodex.templateId, idx)"
                      @click="claimMilestone(currentCodex.templateId, idx)"
                      class="text-[11px] px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-md shadow-amber-900/50 animate-pulse"
                    >
                      领悟真解
                    </button>
                    <span 
                      v-else
                      class="text-[11px] text-zinc-500"
                    >
                      还需讨伐 {{ ms.kills - getKills(currentCodex.templateId) }} 只
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: 万象悬赏令 -->
      <div v-else class="flex flex-col gap-4 overflow-y-auto max-h-[64vh] custom-scrollbar pr-1">
        <div class="flex items-center justify-between">
          <div class="text-xs text-zinc-400">
            每日完成除魔悬赏，可源源不断获得海量金币与强化所急需的【黑铁矿石】、【纯黑玄铁】与【天工神石】！
          </div>
          <button
            @click="refreshBounties"
            class="px-2.5 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 hover:text-white transition-all"
          >
            🔄 换一批悬赏
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            v-for="bounty in world.activeBounties"
            :key="bounty.id"
            class="p-4 rounded-lg border flex flex-col justify-between gap-3 relative overflow-hidden transition-all"
            :class="bounty.claimed 
              ? 'bg-zinc-950/40 border-zinc-800 opacity-75' 
              : (bounty.completed ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/50' : 'bg-zinc-950/80 border-zinc-800')"
          >
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-3xl">{{ bounty.targetIcon }}</span>
                  <div>
                    <h4 class="text-sm font-bold text-zinc-100">{{ bounty.targetName }}</h4>
                    <span class="text-[11px] text-zinc-400">讨伐除妖委派</span>
                  </div>
                </div>
              </div>

              <!-- 进度条 -->
              <div class="flex items-center justify-between text-xs mb-1 font-mono">
                <span class="text-zinc-400">任务进度</span>
                <span :class="bounty.completed ? 'text-emerald-400 font-bold' : 'text-amber-400'">
                  {{ Math.min(bounty.currentKills, bounty.requiredKills) }} / {{ bounty.requiredKills }}
                </span>
              </div>
              <div class="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mb-3">
                <div 
                  class="h-full transition-all duration-300"
                  :class="bounty.completed ? 'bg-emerald-500' : 'bg-amber-500'"
                  :style="{ width: `${Math.min(100, (bounty.currentKills / bounty.requiredKills) * 100)}%` }"
                />
              </div>

              <!-- 悬赏奖赏 -->
              <div class="bg-zinc-900/80 border border-zinc-800 rounded p-2 flex flex-col gap-1 text-[11px] font-mono">
                <div class="text-[11px] font-bold text-amber-400 mb-0.5">【完成赏赐】</div>
                <div class="flex items-center justify-between text-yellow-400">
                  <span>💰 赏赐金币:</span>
                  <span>+{{ bounty.rewardGold.toLocaleString() }}</span>
                </div>
                <div v-if="bounty.rewardIronOre > 0" class="flex items-center justify-between text-zinc-300">
                  <span>⛏️ 黑铁矿石:</span>
                  <span>+{{ bounty.rewardIronOre }} 个</span>
                </div>
                <div v-if="bounty.rewardPureIron > 0" class="flex items-center justify-between text-sky-300">
                  <span>💎 纯黑玄铁:</span>
                  <span>+{{ bounty.rewardPureIron }} 个</span>
                </div>
                <div v-if="bounty.rewardGodStone > 0" class="flex items-center justify-between text-purple-400 font-bold">
                  <span>🌌 天工神石:</span>
                  <span>+{{ bounty.rewardGodStone }} 个</span>
                </div>
              </div>
            </div>

            <!-- 按钮操作 -->
            <div>
              <button
                v-if="bounty.claimed"
                disabled
                class="w-full py-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-bold cursor-not-allowed"
              >
                ✓ 悬赏已领取
              </button>
              <button
                v-else-if="bounty.completed"
                @click="claimBounty(bounty.id)"
                class="w-full py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-950/60 animate-bounce"
              >
                交令领取丰厚赏赐！
              </button>
              <div 
                v-else
                class="text-center py-2 text-xs text-zinc-500 bg-zinc-900/40 rounded border border-zinc-800/50"
              >
                除妖进行中 (还需 {{ bounty.requiredKills - bounty.currentKills }} 只)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { GameWorld } from '../domain/GameWorld';
import { MONSTER_CODEX_DEFINITIONS } from '../domain/definitions/codex';
import { MonsterCodexDef } from '../types/codex';

const props = defineProps<{
  world: GameWorld;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const activeTab = ref<'codex' | 'bounty'>('codex');
const codexList = Object.values(MONSTER_CODEX_DEFINITIONS);
const selectedId = ref<string>(codexList[0]?.templateId || 'm_scarecrow');

const currentCodex = computed<MonsterCodexDef | undefined>(() => {
  return MONSTER_CODEX_DEFINITIONS[selectedId.value];
});

function getKills(templateId: string): number {
  return props.world.monsterKills[templateId] || 0;
}

function isClaimed(templateId: string, milestoneIdx: number): boolean {
  const claimedList = props.world.codexClaimedTiers[templateId];
  return claimedList ? claimedList.includes(milestoneIdx) : false;
}

function canClaim(templateId: string, milestoneIdx: number): boolean {
  if (isClaimed(templateId, milestoneIdx)) return false;
  const kills = getKills(templateId);
  const def = MONSTER_CODEX_DEFINITIONS[templateId];
  if (!def) return false;
  const ms = def.milestones[milestoneIdx];
  return ms ? kills >= ms.kills : false;
}

function getUnlockedCount(templateId: string): number {
  const list = props.world.codexClaimedTiers[templateId];
  return list ? list.length : 0;
}

const totalMilestoneCount = computed(() => {
  return codexList.reduce((acc, cur) => acc + cur.milestones.length, 0);
});

const totalClaimedCount = computed(() => {
  let count = 0;
  for (const tiers of Object.values(props.world.codexClaimedTiers)) {
    count += tiers.length;
  }
  return count;
});

const totalBonus = computed(() => {
  return props.world.getCodexStatsBonus();
});

const hasClaimableBounty = computed(() => {
  return props.world.activeBounties.some(b => b.completed && !b.claimed);
});

function claimMilestone(templateId: string, milestoneIdx: number) {
  props.world.claimCodexReward(templateId, milestoneIdx);
}

function claimBounty(bountyId: string) {
  props.world.claimBounty(bountyId);
}

function refreshBounties() {
  props.world.refreshBounties();
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key.toLowerCase() === 'k') {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(180, 83, 9, 0.5);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(180, 83, 9, 0.8);
}
</style>
