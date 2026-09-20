import { PathFinder } from '../src/domain/PathFinder';
import assert from 'assert';

console.log('=== 开始 A* 寻路二叉堆与性能测试 ===\n');

// 构建一个 36x36 带有复杂障碍物迷宫的测试地图
const mapWidth = 36;
const mapHeight = 36;
const obstacles = new Set<string>();

// 增加多道阻挡墙，留出狭窄通道
for (let y = 5; y <= 25; y++) {
  if (y !== 12 && y !== 18) obstacles.add(`10,${y}`);
  if (y !== 8 && y !== 22) obstacles.add(`20,${y}`);
}

const isWalkable = (x: number, y: number): boolean => {
  if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) return false;
  return !obstacles.has(`${x},${y}`);
};

// 1. 正确性测试：直线畅通寻路
const p1 = PathFinder.findPath({ x: 2, y: 2 }, { x: 8, y: 2 }, isWalkable);
assert(p1.length > 0, '直线寻路应成功');
assert.strictEqual(p1[p1.length - 1].x, 8);
assert.strictEqual(p1[p1.length - 1].y, 2);
console.log('✅ 直线寻路正确性通过，步数:', p1.length);

// 2. 正确性测试：穿越障碍物通道
const p2 = PathFinder.findPath({ x: 2, y: 15 }, { x: 30, y: 15 }, isWalkable, 800);
assert(p2.length > 0, '绕障碍物寻路应成功');
assert.strictEqual(p2[p2.length - 1].x, 30);
assert.strictEqual(p2[p2.length - 1].y, 15);
// 验证沿途每一个点必须可行走
for (const step of p2) {
  assert(isWalkable(step.x, step.y), `路径点 (${step.x},${step.y}) 必须可行走`);
}
console.log('✅ 障碍物绕行寻路正确性通过，步数:', p2.length);

// 3. 正确性测试：完全封闭孤岛不可达目标
for (let dx = -1; dx <= 1; dx++) {
  for (let dy = -1; dy <= 1; dy++) {
    if (dx !== 0 || dy !== 0) obstacles.add(`${33 + dx},${33 + dy}`);
  }
}
const p3 = PathFinder.findPath({ x: 2, y: 2 }, { x: 33, y: 33 }, isWalkable);
assert.strictEqual(p3.length, 0, '封闭不可达目标应返回空数组');
console.log('✅ 封闭不可达判定正确通过');

// 4. 正确性测试：起点即终点
const p4 = PathFinder.findPath({ x: 5, y: 5 }, { x: 5, y: 5 }, isWalkable);
assert.strictEqual(p4.length, 0, '起点等于终点应返回空');
console.log('✅ 原地判定正确通过');

// 5. 性能基准：连续执行 10,000 次复杂迷宫寻路，计算总耗时与每次平均微秒
console.log('\n▶ 正在压测 10,000 次跨障碍 A* 寻路...');
const start = performance.now();
const runs = 10000;
for (let i = 0; i < runs; i++) {
  const startX = 2 + (i % 6);
  const startY = 2 + (i % 20);
  const goalX = 25 + (i % 8);
  const goalY = 5 + (i % 25);
  PathFinder.findPath({ x: startX, y: startY }, { x: goalX, y: goalY }, isWalkable, 300);
}
const elapsed = performance.now() - start;
const avgMicroseconds = (elapsed / runs) * 1000;

console.log(`\n🎉 10,000 次 A* 寻路总耗时: ${elapsed.toFixed(2)} ms`);
console.log(`⚡ 单次寻路平均耗时: ${avgMicroseconds.toFixed(2)} μs (微秒)`);
assert(avgMicroseconds < 150, '单次寻路平均耗时应远低于 150 微秒');

console.log('\n=== A* 寻路二叉堆与性能测试全部通过 ===');
