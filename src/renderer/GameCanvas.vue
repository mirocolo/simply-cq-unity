<template>
  <div ref="containerRef" class="w-full h-full relative overflow-hidden select-none cursor-crosshair">
    <canvas 
      ref="canvasRef" 
      @pointerdown="handleCanvasClick"
      class="block w-full h-full"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { GameWorld } from '../domain/GameWorld';
import { IsometricRenderer } from './IsometricRenderer';
import { PathFinder } from '../domain/PathFinder';

const props = defineProps<{
  world: GameWorld;
  renderer: IsometricRenderer;
  selectedTargetId: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:selectedTargetId', id: string | null): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

let animationId: number | null = null;

const handleResize = () => {
  if (!canvasRef.value || !containerRef.value) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = containerRef.value.getBoundingClientRect();
  canvasRef.value.width = rect.width * dpr;
  canvasRef.value.height = rect.height * dpr;
};

const handleCanvasClick = (event: MouseEvent) => {
  if (!canvasRef.value || !containerRef.value) return;
  props.world.autoPilot.recordManualAction();

  const rect = canvasRef.value.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const clickX = (event.clientX - rect.left) * dpr;
  const clickY = (event.clientY - rect.top) * dpr;

  // 计算相机偏移 (直接使用渲染器平滑跟随后的实际屏幕相机坐标，保证点击拾取与画面完全一致)
  const camPos = props.renderer.getCamPos();
  const camX = camPos.x;
  const camY = camPos.y;
  const p = props.world.player;

  // 检查是否点中了某个活着的怪物
  let clickedMonsterId: string | null = null;
  for (const m of props.world.monsters) {
    if (m.state === 'dead') continue;
    const mScr = props.renderer.gridToScreen(m.gridPos.x, m.gridPos.y);
    const dist = Math.hypot(clickX - (mScr.x - camX), clickY - (mScr.y - camY - 20));
    if (dist < 32) {
      clickedMonsterId = m.id;
      break;
    }
  }

  if (clickedMonsterId) {
    emit('update:selectedTargetId', clickedMonsterId);
    const targetMonster = props.world.monsters.find(m => m.id === clickedMonsterId);
    if (targetMonster) {
      const dist = PathFinder.chebyshevDistance(p.gridPos, targetMonster.gridPos);
      if (dist <= 1) {
        props.world.executeAttack(p, targetMonster);
      } else {
        const path = PathFinder.findPath(p.gridPos, targetMonster.gridPos, props.world.isWalkable, 120);
        if (path.length > 0) {
          p.direction = PathFinder.getDirection(p.gridPos, path[0]);
          p.targetGridPos = { ...path[0] };
          p.moveProgress = 0;
          p.state = 'walking';
        }
      }
    }
    return;
  }

  // 否则点地走位
  emit('update:selectedTargetId', null);
  const targetGrid = props.renderer.screenToGrid(clickX, clickY, camX, camY);
  if (props.world.isWalkable(targetGrid.x, targetGrid.y)) {
    const path = PathFinder.findPath(p.gridPos, targetGrid, props.world.isWalkable, 200);
    if (path.length > 0) {
      p.direction = PathFinder.getDirection(p.gridPos, path[0]);
      p.targetGridPos = { ...path[0] };
      p.moveProgress = 0;
      p.state = 'walking';
    }
  }
};

const renderLoop = () => {
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d');
    if (ctx) {
      props.renderer.render(
        ctx,
        props.world,
        canvasRef.value.width,
        canvasRef.value.height,
        props.selectedTargetId
      );
    }
  }
  animationId = requestAnimationFrame(renderLoop);
};

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
  animationId = requestAnimationFrame(renderLoop);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});
</script>
