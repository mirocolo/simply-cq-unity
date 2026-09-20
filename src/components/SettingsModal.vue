<template>
  <div @click.self="$emit('close')" role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
    <div class="relative w-full max-w-md legend-box p-4 rounded-lg flex flex-col gap-3 animate-fadeIn text-zinc-200">
      <!-- 标题 -->
      <div class="flex items-center justify-between border-b border-legend-border pb-2">
        <div class="flex items-center gap-2">
          <span class="text-xl">⚙️</span>
          <span class="text-base font-bold text-gold-gradient">系统设置与存档管理</span>
        </div>
        <button 
          @click="$emit('close')"
          class="text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-zinc-800 text-lg font-bold"
        >
          ✕
        </button>
      </div>

      <!-- 音效控制 -->
      <div class="bg-zinc-950/90 p-3 rounded-lg border border-legend-border flex flex-col gap-2 text-xs">
        <span class="font-bold text-amber-300">🔊 游戏拟真音效</span>
        <div class="flex items-center justify-between">
          <span class="text-zinc-300">音效开关:</span>
          <button 
            @click="$emit('toggleSound')"
            class="px-3 py-1 rounded font-bold text-xs border"
            :class="isSoundOn ? 'bg-amber-700/60 border-amber-500 text-amber-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400'"
          >
            {{ isSoundOn ? '已开启' : '已静音' }}
          </button>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-zinc-300">主音量:</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05"
            :value="volume"
            @input="$emit('setVolume', Number(($event.target as HTMLInputElement).value))"
            class="w-32 accent-amber-500"
          />
        </div>
      </div>

      <!-- 存档导出与导入 -->
      <div class="bg-zinc-950/90 p-3 rounded-lg border border-legend-border flex flex-col gap-2 text-xs">
        <span class="font-bold text-amber-300">💾 本地存档导出与备份</span>
        <p class="text-[10px] text-zinc-500 leading-normal">
          游戏会自动保存在浏览器本地（LocalStorage），可随时导出备份 JSON 换电脑无缝继续游玩。
        </p>

        <div class="flex gap-2">
          <button 
            @click="handleExport"
            class="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded font-bold text-xs text-zinc-200"
          >
            复制存档代码
          </button>
          <button 
            @click="handleImport"
            class="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded font-bold text-xs text-zinc-200"
          >
            导入存档代码
          </button>
        </div>
        <span v-if="tipMsg" class="text-[11px] text-emerald-400 text-center font-bold">{{ tipMsg }}</span>
      </div>

      <!-- 危险区域：重置游戏 -->
      <div class="bg-red-950/20 p-3 rounded-lg border border-red-900/60 flex items-center justify-between text-xs">
        <div class="flex flex-col">
          <span class="font-bold text-red-400">重置当前游戏</span>
          <span class="text-[10px] text-zinc-500">清空所有角色数据与背包，重新开始</span>
        </div>
        <button 
          @click="handleReset"
          class="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded font-bold text-xs transition-all active:scale-95"
        >
          清档重玩
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { StorageManager } from '../domain/StorageManager';

defineProps<{
  isSoundOn: boolean;
  volume: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'toggleSound'): void;
  (e: 'setVolume', vol: number): void;
  (e: 'reloadGame'): void;
}>();

const tipMsg = ref('');

const handleExport = () => {
  const json = StorageManager.exportSave();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(json);
    tipMsg.value = '✓ 存档已成功复制到剪贴板！';
  } else {
    tipMsg.value = '已导出至控制台日志';
    console.log(json);
  }
  setTimeout(() => tipMsg.value = '', 3000);
};

const handleImport = () => {
  const code = prompt('请粘贴存档代码（支持 Base64 或 JSON 文本）：');
  if (code) {
    const res = StorageManager.importSave(code);
    if (res.success) {
      alert(res.message);
      emit('reloadGame');
    } else {
      alert(res.message);
    }
  }
};

const handleReset = () => {
  if (confirm('确定要清空所有数据重新开始吗？此操作无法撤销！')) {
    StorageManager.clearSave();
    window.location.reload();
  }
};
</script>
