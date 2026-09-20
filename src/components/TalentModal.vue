<template>
  <div @click.self="$emit('close')" role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
    <div class="relative w-full max-w-4xl max-h-[92vh] overflow-hidden legend-box p-5 rounded-lg flex flex-col gap-4 animate-fadeIn text-zinc-200 border border-amber-900/60 shadow-2xl">
      <!-- 顶部栏 -->
      <div class="flex items-center justify-between border-b border-amber-900/50 pb-3">
        <div class="flex items-center gap-3">
          <span class="text-3xl">⭐</span>
          <div>
            <div class="flex items-center gap-2.5">
              <span class="text-lg font-bold text-amber-300">战士变异·天赋星盘</span>
              <span class="text-xs px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 font-bold">
                三大流派
              </span>
            </div>
            <p class="text-xs text-zinc-400 mt-0.5">
              每升 1 级获得 1 点天赋点，自由分配三大变异流派，免费无损洗点！
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-zinc-800">
            <span class="text-xs text-zinc-400">可用点数</span>
            <span class="text-lg font-black" :class="availablePoints > 0 ? 'text-amber-300 animate-pulse' : 'text-zinc-500'">{{ availablePoints }}</span>
          </div>
          <button 
            @click="handleReset"
            class="px-3 py-1.5 rounded text-xs font-bold transition-all bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-300 border border-emerald-700/60"
            :class="totalAllocated <= 0 ? 'opacity-40 pointer-events-none' : ''"
          >
            🔄 免费洗点
          </button>
          <button 
            @click="$emit('close')"
            class="text-zinc-400 hover:text-white px-2.5 py-1 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 text-base font-bold transition-all"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- 主体区域 -->
      <div class="flex gap-4 overflow-hidden flex-1 min-h-0">
        <!-- 左侧：分支切换 + 天赋树 -->
        <div class="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 min-w-0">
          <!-- 分支 Tab -->
          <div class="flex bg-zinc-950/80 p-1 rounded-lg border border-zinc-800 gap-1">
            <button
              v-for="branch in branches"
              :key="branch.id"
              @click="activeBranch = branch.id"
              class="flex-1 px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1"
              :class="activeBranch === branch.id ? `${branch.activeClass} shadow` : 'text-zinc-400 hover:text-zinc-200'"
            >
              <span>{{ branch.icon }}</span>
              <span>{{ branch.name }}</span>
              <span class="text-[10px] opacity-70">({{ getBranchPoints(branch.id) }}点)</span>
            </button>
          </div>

          <!-- 分支描述 -->
          <div class="text-xs px-3 py-2 rounded-lg border" :class="currentBranchStyle.borderClass" :style="{ background: currentBranchStyle.bg }">
            <span class="font-bold" :style="{ color: currentBranchStyle.color }">{{ currentBranchInfo.name }}</span>
            <span class="text-zinc-400 ml-2">{{ currentBranchInfo.desc }}</span>
          </div>

          <!-- 天赋节点列表 -->
          <div class="flex flex-col gap-2">
            <div
              v-for="talent in currentBranchTalents"
              :key="talent.id"
              class="flex items-center gap-3 p-3 rounded-lg border transition-all"
              :class="getTalentCardClass(talent)"
            >
              <!-- 图标 -->
              <div class="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-900/80 border border-zinc-700/50 shrink-0">
                {{ talent.icon }}
              </div>

              <!-- 信息 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-sm" :class="getAllocation(talent.id) > 0 ? 'text-amber-200' : 'text-zinc-300'">{{ talent.name }}</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded font-mono" :class="getAllocation(talent.id) >= talent.maxRank ? 'bg-amber-600/30 text-amber-300 border border-amber-600/50' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'">
                    {{ getAllocation(talent.id) }}/{{ talent.maxRank }}
                  </span>
                  <span v-if="talent.specialEffect" class="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700/50 font-bold">
                    {{ talent.tier >= 4 ? '终极神技' : '流派神技' }}
                  </span>
                  <span v-if="talent.reqBranchPoints > 0" class="text-[10px] text-zinc-500">
                    需{{ talent.reqBranchPoints }}点
                  </span>
                </div>
                <p class="text-[11px] text-zinc-400 mt-0.5 leading-tight">{{ talent.desc }}</p>
                <!-- 当前等级属性加成展示 -->
                <div v-if="getAllocation(talent.id) > 0" class="flex flex-wrap gap-2 mt-1">
                  <span v-for="(val, key) in getTalentCurrentStats(talent)" :key="key" class="text-[10px] font-mono text-emerald-400">
                    {{ val }}
                  </span>
                </div>
              </div>

              <!-- 加点按钮 -->
              <button
                @click="handleAllocate(talent.id)"
                class="shrink-0 w-8 h-8 rounded-lg font-black text-lg transition-all flex items-center justify-center"
                :class="canAllocate(talent) ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg active:scale-90 cursor-pointer' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'"
                :disabled="!canAllocate(talent)"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <!-- 右侧：流派评定 + 六维雷达图 -->
        <div class="w-72 shrink-0 flex flex-col gap-3">
          <!-- 流派称号 -->
          <div class="text-center p-3 rounded-lg border border-amber-900/40 bg-gradient-to-b from-zinc-900/80 to-zinc-950">
            <div class="text-2xl mb-1">{{ rating.branch === 'berserker' ? '🔥' : rating.branch === 'fire_burst' ? '☄️' : rating.branch === 'diamond_counter' ? '🛡️' : '⚔️' }}</div>
            <div class="text-base font-black" :style="{ color: rating.color }">{{ rating.title }}</div>
            <p class="text-[11px] text-zinc-400 mt-1 leading-tight">{{ rating.desc }}</p>
          </div>

          <!-- 六维雷达图 (Canvas) -->
          <div class="flex-1 flex items-center justify-center bg-zinc-950/60 rounded-lg border border-zinc-800/60 p-2 min-h-[220px]">
            <canvas ref="radarCanvas" width="240" height="240" class="w-[240px] h-[240px]"></canvas>
          </div>

          <!-- 六维分数列表 -->
          <div class="grid grid-cols-3 gap-1.5">
            <div v-for="dim in radarDimensions" :key="dim.key" class="text-center bg-zinc-900/60 rounded p-1.5 border border-zinc-800/40">
              <div class="text-[10px] text-zinc-500">{{ dim.label }}</div>
              <div class="text-sm font-black" :style="{ color: dim.score >= 80 ? '#fbbf24' : dim.score >= 50 ? '#22d3ee' : '#a1a1aa' }">{{ dim.score }}</div>
            </div>
          </div>

          <!-- 总投入统计 -->
          <div class="text-center text-[11px] text-zinc-500 border-t border-zinc-800 pt-2">
            总投入 <span class="text-amber-300 font-bold">{{ totalAllocated }}</span> 点 | 
            等级 <span class="text-zinc-300 font-bold">{{ playerLevel }}</span> |
            可用 <span :class="availablePoints > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-500'">{{ availablePoints }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import type { TalentBranchId, TalentNodeDef, ArchetypeRating } from '../types/talent';
import { TALENT_DEFINITIONS, getTalentsByBranch, getArchetypeRating } from '../domain/definitions/talents';

const props = defineProps<{
  talentAllocations: Record<string, number>;
  playerLevel: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'allocate', talentId: string): void;
  (e: 'reset'): void;
}>();

const activeBranch = ref<TalentBranchId>('berserker');
const radarCanvas = ref<HTMLCanvasElement | null>(null);

const branches = [
  { id: 'berserker' as TalentBranchId, name: '狂暴血战流', icon: '🔥', activeClass: 'bg-red-700 text-white', desc: '极限攻速吸血，低血怒爆独立倍攻，残影追风连斩不灭战魔！' },
  { id: 'fire_burst' as TalentBranchId, name: '烈火核爆流', icon: '☄️', activeClass: 'bg-orange-700 text-white', desc: '极致暴击率×暴击伤害，破甲真伤，烈火逐日一刀核爆秒杀！' },
  { id: 'diamond_counter' as TalentBranchId, name: '金刚反伤流', icon: '🛡️', activeClass: 'bg-yellow-700 text-white', desc: '巍峨气血铜墙铁壁，荆棘龙鳞反震真伤，不动明王领域裂天！' }
];

const currentBranchInfo = computed(() => branches.find(b => b.id === activeBranch.value)!);

const currentBranchStyle = computed(() => {
  const m: Record<string, { bg: string; color: string; borderClass: string }> = {
    berserker: { bg: 'rgba(127,29,29,0.15)', color: '#fca5a5', borderClass: 'border-red-900/40' },
    fire_burst: { bg: 'rgba(124,45,18,0.15)', color: '#fdba74', borderClass: 'border-orange-900/40' },
    diamond_counter: { bg: 'rgba(113,63,18,0.15)', color: '#fde047', borderClass: 'border-yellow-900/40' }
  };
  return m[activeBranch.value];
});

const currentBranchTalents = computed(() => getTalentsByBranch(activeBranch.value));

const totalAllocated = computed(() => 
  Object.values(props.talentAllocations).reduce((s, n) => s + (n || 0), 0)
);

const availablePoints = computed(() => 
  Math.max(0, (props.playerLevel - 1) - totalAllocated.value)
);

const rating = computed<ArchetypeRating>(() => getArchetypeRating(props.talentAllocations));

const radarDimensions = computed(() => {
  const s = rating.value.scores;
  return [
    { key: 'attack', label: '攻击', score: s.attack },
    { key: 'survivability', label: '生存', score: s.survivability },
    { key: 'haste', label: '攻速', score: s.haste },
    { key: 'crit', label: '暴击', score: s.crit },
    { key: 'sustain', label: '续航', score: s.sustain },
    { key: 'counter', label: '反伤', score: s.counter },
  ];
});

function getAllocation(id: string): number {
  return props.talentAllocations[id] || 0;
}

function getBranchPoints(branch: TalentBranchId): number {
  let pts = 0;
  for (const [id, rank] of Object.entries(props.talentAllocations)) {
    const d = TALENT_DEFINITIONS[id];
    if (d && d.branch === branch) pts += rank;
  }
  return pts;
}

function canAllocate(talent: TalentNodeDef): boolean {
  if (availablePoints.value <= 0) return false;
  if (getAllocation(talent.id) >= talent.maxRank) return false;
  if (talent.reqBranchPoints > 0 && getBranchPoints(talent.branch) < talent.reqBranchPoints) return false;
  return true;
}

function getTalentCurrentStats(talent: TalentNodeDef): string[] {
  const rank = getAllocation(talent.id);
  if (rank <= 0) return [];
  const s = talent.statsPerRank;
  const result: string[] = [];
  if (s.lifestealRate) result.push(`吸血+${(s.lifestealRate * rank * 100).toFixed(0)}%`);
  if (s.haste) result.push(`攻速+${s.haste * rank}`);
  if (s.dcPercent) result.push(`攻击+${(s.dcPercent * rank * 100).toFixed(0)}%`);
  if (s.minDC) result.push(`物攻+${s.minDC * rank}-${(s.maxDC || 0) * rank}`);
  if (s.critRate) result.push(`暴击+${(s.critRate * rank * 100).toFixed(0)}%`);
  if (s.critMult) result.push(`暴伤+${(s.critMult * rank * 100).toFixed(0)}%`);
  if (s.defenseIgnoreRate) result.push(`破甲+${(s.defenseIgnoreRate * rank * 100).toFixed(0)}%`);
  if (s.maxHpPercent) result.push(`生命+${(s.maxHpPercent * rank * 100).toFixed(0)}%`);
  if (s.flatHp) result.push(`血量+${s.flatHp * rank}`);
  if (s.acPercent) result.push(`防御+${(s.acPercent * rank * 100).toFixed(0)}%`);
  if (s.minAC) result.push(`物防+${s.minAC * rank}-${(s.maxAC || 0) * rank}`);
  if (s.thornsRate) result.push(`反伤+${(s.thornsRate * rank * 100).toFixed(0)}%`);
  if (s.damageMultRatio) result.push(`倍攻+${(s.damageMultRatio * rank * 100).toFixed(0)}%`);
  return result;
}

function getTalentCardClass(talent: TalentNodeDef): string {
  const rank = getAllocation(talent.id);
  if (rank >= talent.maxRank) return 'bg-amber-950/30 border-amber-700/50';
  if (rank > 0) return 'bg-zinc-900/60 border-zinc-700/40';
  if (canAllocate(talent)) return 'bg-zinc-900/40 border-zinc-700/30 hover:border-amber-700/40';
  return 'bg-zinc-950/40 border-zinc-800/30 opacity-60';
}

function handleAllocate(talentId: string) {
  emit('allocate', talentId);
}

function handleReset() {
  if (totalAllocated.value > 0) {
    emit('reset');
  }
}

// 六维雷达图绘制
function drawRadarChart() {
  const canvas = radarCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = 240, H = 240;
  const cx = W / 2, cy = H / 2;
  const R = 95;
  const labels = ['攻击', '生存', '攻速', '暴击', '续航', '反伤'];
  const scores = [
    rating.value.scores.attack,
    rating.value.scores.survivability,
    rating.value.scores.haste,
    rating.value.scores.crit,
    rating.value.scores.sustain,
    rating.value.scores.counter,
  ];
  const n = 6;

  ctx.clearRect(0, 0, W, H);

  // 背景六边形网格
  for (let ring = 1; ring <= 4; ring++) {
    const r = (R * ring) / 4;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 轴线
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 数据区域
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    const r = (R * scores[idx]) / 100;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = `${rating.value.color}22`;
  ctx.fill();
  ctx.strokeStyle = rating.value.color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 数据顶点光点
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (R * scores[i]) / 100;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = rating.value.color;
    ctx.fill();
  }

  // 标签
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#a1a1aa';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const lr = R + 16;
    const x = cx + lr * Math.cos(angle);
    const y = cy + lr * Math.sin(angle);
    ctx.fillText(labels[i], x, y);
  }
}

watch(() => [props.talentAllocations, activeBranch.value], () => {
  nextTick(drawRadarChart);
}, { deep: true });

onMounted(() => {
  nextTick(drawRadarChart);
});
</script>
