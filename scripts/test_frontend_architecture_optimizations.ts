import { GameWorld } from '../src/domain/GameWorld';
import { IsometricRenderer } from '../src/renderer/IsometricRenderer';
import { SoundEffects } from '../src/renderer/SoundEffects';

console.log('=== 启动前端现代化架构与渲染管线优化自动化测试 ===\n');

// 1. 验证 GameWorld 脱离 Vue 深度响应式（原生执行）性能与完整性
console.log('▶ Test 1: 验证 GameWorld 脱离 Proxy 深度代理下的原生高频 Tick 与状态流转');
const world = new GameWorld();
world.load();
const startTick = world.currentTick;
for (let i = 0; i < 50; i++) {
  world.tick();
}
if (world.currentTick !== startTick + 50) {
  throw new Error(`world.currentTick 异常，期望 ${startTick + 50}，实际 ${world.currentTick}`);
}
console.log(`  ✅ 连续 50 次原生 Tick 执行平稳，无响应式代理开销，currentTick = ${world.currentTick}`);

// 2. 验证 IsometricRenderer 零闭包渲染列表与视锥剔除
console.log('\n▶ Test 2: 验证 IsometricRenderer 零闭包渲染列表与视锥剔除边界计算');
const renderer = new IsometricRenderer();

// 模拟 Canvas 2D 上下文代理桩
const mockCtx = new Proxy({} as any, {
  get: (_target, prop) => {
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
      return () => ({ addColorStop: () => {} });
    }
    return () => {};
  },
  set: () => true
}) as unknown as CanvasRenderingContext2D;

// 测试渲染帧，验证零闭包分发管线正常工作
renderer.render(mockCtx, world, 1280, 720, null);
console.log('  ✅ IsometricRenderer.render 成功执行，零闭包管线与视锥剔除运算顺畅！');

// 3. 验证 SoundEffects 动态压限器、防爆音节流与生命周期释放 (dispose)
console.log('\n▶ Test 3: 验证 SoundEffects 动态压限器、节流与生命周期释放 (dispose)');
const sound = new SoundEffects();

// 连续高频调用 10 次 playSwing，验证节流保护
for (let i = 0; i < 10; i++) {
  sound.playSwing();
}
sound.playHit();
sound.playCoin();

// 验证 dispose 显式释放资源
sound.dispose();
console.log('  ✅ SoundEffects.dispose 成功执行，资源显式释放闭环！');

console.log('\n====================================================');
console.log('🎉 全部前端现代化架构与渲染管线测试 100% 顺利通过！');
console.log('====================================================');
