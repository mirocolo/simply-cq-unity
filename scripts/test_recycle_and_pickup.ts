import { GameWorld } from '../src/domain/GameWorld';
import { ItemInstance, EquipSlot } from '../src/types/game';
import { StatCalculator } from '../src/domain/StatCalculator';

function createDummyEquip(
  id: string,
  name: string,
  slot: EquipSlot,
  tier: number,
  quality: number,
  minDC: number,
  maxDC: number,
  levelReq = 1,
  specialEffect?: string
): ItemInstance {
  return {
    instanceId: `test_${id}_${Date.now()}_${Math.random()}`,
    defId: id,
    name,
    type: 'equipment',
    slot,
    quality,
    tier,
    icon: '⚔️',
    price: 100 * (tier + 1),
    desc: '测试装备',
    minDC,
    maxDC,
    minAC: 5,
    maxAC: 10,
    maxHp: 50,
    critBonus: 0,
    hasteBonus: 0,
    levelReq,
    specialEffect
  };
}

function runTests() {
  console.log('=== 开始一键回收与满包防卡死全链路自动化测试 ===\n');

  // -------------------------------------------------------------
  // Test 1: 单槽位多件次级提升装备回收（防止囤积）
  // -------------------------------------------------------------
  console.log('[Test 1] 验证单槽位多件次级提升装备回收...');
  {
    const world = new GameWorld();
    world.inventory = [];
    // 身上穿戴战力较低的武器 (DC 5~10)
    world.equipped.weapon = createDummyEquip('wood_sword', '木剑', 'weapon', 0, 0, 5, 10);

    // 背包放入 10 把不同品质且战力都高于木剑的武器 (DC 15~20 到 90~100)
    for (let i = 1; i <= 10; i++) {
      world.inventory.push(createDummyEquip(`sword_${i}`, `宝剑${i}`, 'weapon', 0, 1, 10 + i * 5, 15 + i * 5));
    }

    const result = world.recycleWeakerOrEqualItems();
    console.log(`  -> 回收了 ${result.count} 件，获得金币 ${result.gold}，经验 ${result.exp}`);

    if (result.count !== 9) {
      throw new Error(`Test 1 失败：预期回收 9 件，实际回收 ${result.count} 件！`);
    }
    if (world.inventory.length !== 1) {
      throw new Error(`Test 1 失败：背包应该只保留 1 件最强武器，实际有 ${world.inventory.length} 件！`);
    }
    if (world.inventory[0].name !== '宝剑10') {
      throw new Error(`Test 1 失败：保留的不是最强武器，实际保留了 ${world.inventory[0].name}！`);
    }
    console.log('  ✓ Test 1 通过：成功熔炼 9 件次级备用武器，仅保留最优 1 件！\n');
  }

  // -------------------------------------------------------------
  // Test 2: 双槽位（手镯/戒指）智能保留与回收
  // -------------------------------------------------------------
  console.log('[Test 2] 验证双槽位手镯/戒指仅保留至多 2 件最优备选...');
  {
    const world = new GameWorld();
    world.inventory = [];
    // 身上佩戴 2 个手镯：bracelet_l 战力高，bracelet_r 战力低
    world.equipped.bracelet_l = createDummyEquip('b_l', '金手镯', 'bracelet_l', 0, 1, 20, 30);
    world.equipped.bracelet_r = createDummyEquip('b_r', '铁手镯', 'bracelet_r', 0, 0, 5, 10);

    // 背包放入 5 个手镯
    // 手镯1 (DC 50~60): 比两个都强
    // 手镯2 (DC 35~45): 比铁手镯强，比手镯1弱
    // 手镯3 (DC 15~20): 比铁手镯强，但弱于手镯1和手镯2
    // 手镯4 (DC 2~5): 弱于身上的铁手镯
    world.inventory.push(createDummyEquip('b1', '沃玛手镯1', 'bracelet_l', 1, 2, 50, 60));
    world.inventory.push(createDummyEquip('b2', '沃玛手镯2', 'bracelet_r', 1, 2, 35, 45));
    world.inventory.push(createDummyEquip('b3', '沃玛手镯3', 'bracelet_l', 1, 1, 15, 20));
    world.inventory.push(createDummyEquip('b4', '生锈手镯', 'bracelet_r', 0, 0, 2, 5));

    const res = world.recycleWeakerOrEqualItems();
    console.log(`  -> 回收了 ${res.count} 件，背包剩余 ${world.inventory.length} 件`);

    if (world.inventory.length !== 2) {
      throw new Error(`Test 2 失败：预期双槽位保留 2 件提升装备，实际保留 ${world.inventory.length} 件！`);
    }
    const names = world.inventory.map(i => i.name);
    if (!names.includes('沃玛手镯1') || !names.includes('沃玛手镯2')) {
      throw new Error(`Test 2 失败：保留的装备不正确: ${names.join(', ')}`);
    }
    console.log('  ✓ Test 2 通过：双槽位精确保留 2 件最优替换神装，次级装备已顺利熔炼！\n');
  }

  // -------------------------------------------------------------
  // Test 3: 特戒与橙色传说装备绝对豁免保护
  // -------------------------------------------------------------
  console.log('[Test 3] 验证特戒与橙色传说装备绝不误熔...');
  {
    const world = new GameWorld();
    world.inventory = [];
    world.equipped.special_paralyze = undefined;

    const paralyzeRing = createDummyEquip('paralyze', '麻痹特戒', 'special_paralyze', 0, 3, 0, 0, 1, 'paralyze');
    const dragonBlade = createDummyEquip('blade_orange', '屠龙宝刀', 'weapon', 3, 4, 150, 300); // 橙装 quality 4
    const weakTrash = createDummyEquip('trash_sword', '粗糙木剑', 'weapon', 0, 0, 1, 2);

    world.inventory.push(paralyzeRing);
    world.inventory.push(dragonBlade);
    world.inventory.push(weakTrash);

    world.recycleWeakerOrEqualItems();
    world.recycleLowQualityItems();

    if (!world.inventory.find(i => i.name === '麻痹特戒')) {
      throw new Error('Test 3 失败：麻痹特戒被误熔！');
    }
    if (!world.inventory.find(i => i.name === '屠龙宝刀')) {
      throw new Error('Test 3 失败：橙色传说屠龙宝刀被误熔！');
    }
    if (world.inventory.find(i => i.name === '粗糙木剑')) {
      throw new Error('Test 3 失败：粗糙木剑未被熔炼！');
    }
    console.log('  ✓ Test 3 通过：特戒与橙色传说装备 100% 豁免保护，低品质垃圾装备被精确熔炼！\n');
  }

  // -------------------------------------------------------------
  // Test 4: 40/40 满包拾取紧急腾挪与智能换装 (彻底杜绝卡死)
  // -------------------------------------------------------------
  console.log('[Test 4] 验证 40/40 满包拾取自动触发紧急腾挪，不卡死...');
  {
    const world = new GameWorld();
    world.inventory = [];
    world.equipped.weapon = createDummyEquip('eq_w', '青铜剑', 'weapon', 0, 1, 15, 20);

    // 把背包塞满 40 件次级武器与铠甲 (40/40)
    for (let i = 0; i < 20; i++) {
      world.inventory.push(createDummyEquip(`sub_w_${i}`, `次级剑${i}`, 'weapon', 0, 1, 10, 12));
    }
    for (let i = 0; i < 20; i++) {
      world.inventory.push(createDummyEquip(`sub_a_${i}`, `次级甲${i}`, 'armor', 0, 0, 1, 2));
    }

    if (world.inventory.length !== 40) {
      throw new Error('Test 4 初始化错误：背包未达到 40 格');
    }

    // 地面掉落一把极品裁决之杖 (DC 200~350, 需2阶飞升驾驭)
    world.player.stats.ascensionTier = 2;
    const godWeapon = createDummyEquip('god_sword', '裁决之杖', 'weapon', 2, 3, 200, 350);
    world.groundItems.push({
      gridPos: { ...world.player.gridPos },
      item: godWeapon
    });

    console.log('  -> 满包状态下执行 checkPlayerLootPickup()...');
    world['checkPlayerLootPickup']();

    // 检查地面物品是否被成功拾取
    if (world.groundItems.length !== 0) {
      throw new Error('Test 4 失败：地面掉落物未能拾取，依然卡在地上！');
    }

    // 检查是否自动穿上了极品裁决之杖
    if (world.equipped.weapon?.name !== '裁决之杖') {
      throw new Error(`Test 4 失败：未自动穿戴极品神装！当前武器: ${world.equipped.weapon?.name}`);
    }

    // 检查背包容量是否已大幅降低（冗余次级装被熔炼）
    console.log(`  -> 拾取与紧急腾挪后背包数量: ${world.inventory.length} / 40`);
    if (world.inventory.length >= 40) {
      throw new Error('Test 4 失败：背包依然为 40/40，紧急腾挪未能释放空间！');
    }

    console.log('  ✓ Test 4 通过：40/40 满包成功自动腾挪，极品裁决秒穿戴，背包恢复充裕空间！\n');
  }

  // -------------------------------------------------------------
  // Test 5: 挂机 AI 满包防卡死寻路测试 (AutoPilot)
  // -------------------------------------------------------------
  console.log('[Test 5] 验证挂机 AI 在满包且无法吸附时绝不抽搐卡死...');
  {
    const world = new GameWorld();
    world.autoConfig.enabled = true;
    world.autoConfig.autoPickup = true;
    world.player.gridPos = { x: 10, y: 10 };

    // 制造 40 件无法回收的极品/特戒把背包填死 (40/40)
    world.inventory = [];
    for (let i = 0; i < 40; i++) {
      world.inventory.push(createDummyEquip(`legend_${i}`, `传说戒指${i}`, 'ring_l', 5, 4, 100, 200));
    }

    // 地面在相邻格 (10, 11) 有一件掉落物 (dist = 1)
    world.groundItems = [{
      gridPos: { x: 10, y: 11 },
      item: createDummyEquip('drop_w', '普通刀', 'weapon', 0, 0, 5, 5)
    }];

    // 周围有怪在 (10, 14)
    world.monsters = [{
      id: 'm1',
      name: '白野猪',
      type: 'monster',
      gridPos: { x: 10, y: 14 },
      targetGridPos: null,
      moveProgress: 0,
      dir: 'down',
      state: 'idle',
      stats: {
        level: 20,
        hp: 1000,
        maxHp: 1000,
        mp: 100,
        maxMp: 100,
        minDC: 20,
        maxDC: 30,
        minAC: 10,
        maxAC: 15,
        combatPower: 500,
        critRate: 0.1,
        dodgeRate: 0.05,
        haste: 0,
        lifesteal: 0,
        expReward: 100,
        goldReward: 50
      },
      skills: [],
      lastAttackTick: 0
    }];

    const action = world.autoPilot.decide(
      world.player,
      world.monsters,
      world.groundItems,
      world.inventory,
      world.skills,
      world.autoConfig,
      world.currentTick,
      world.isWalkable
    );

    console.log(`  -> 决策动作: type=${action.type}, targetPos=${JSON.stringify(action.targetPos)}`);

    // 验证挂机没有选择走向地面不可拾取的物品 (10, 11)
    if (action.type === 'move' && action.targetPos?.x === 10 && action.targetPos?.y === 11) {
      throw new Error('Test 5 失败：挂机依然在向不可拾取的地面物品寻路，会导致来回抽搐卡死！');
    }

    console.log('  ✓ Test 5 通过：满包时挂机 AI 自动跳过不可拾取的地面物品，正常寻路打怪！\n');
  }

  // -------------------------------------------------------------
  // Test 6: 双槽位满包换装绝不吞装测试 (optimizeDualSlots)
  // -------------------------------------------------------------
  console.log('[Test 6] 验证 40/40 满包下一键换装双槽位绝不吞装...');
  {
    const world = new GameWorld();
    world.inventory = [];
    world.player.stats.ascensionTier = 1;
    // 身上有2个戒指
    const oldRing1 = createDummyEquip('old_r1', '旧戒指1', 'ring_l', 0, 1, 10, 20);
    const oldRing2 = createDummyEquip('old_r2', '旧戒指2', 'ring_r', 0, 1, 10, 20);
    world.equipped.ring_l = oldRing1;
    world.equipped.ring_r = oldRing2;

    // 背包塞满 40 件，其中包含 2 件更强戒指
    const newRing1 = createDummyEquip('new_r1', '新神戒1', 'ring_l', 1, 3, 100, 150);
    const newRing2 = createDummyEquip('new_r2', '新神戒2', 'ring_r', 1, 3, 100, 150);
    world.inventory.push(newRing1);
    world.inventory.push(newRing2);

    for (let i = 0; i < 38; i++) {
      world.inventory.push(createDummyEquip(`filler_${i}`, `填充物${i}`, 'helmet', 0, 1, 5, 5));
    }

    if (world.inventory.length !== 40) {
      throw new Error('Test 6 初始化错误：背包数量不为 40');
    }

    const replaced = world.oneKeyEquipBest();
    console.log(`  -> 一键穿戴成功更换件数: ${replaced}`);

    if (world.equipped.ring_l?.name !== '新神戒1' && world.equipped.ring_l?.name !== '新神戒2') {
      throw new Error('Test 6 失败：新神戒1未能穿戴！');
    }
    if (world.equipped.ring_r?.name !== '新神戒1' && world.equipped.ring_r?.name !== '新神戒2') {
      throw new Error('Test 6 失败：新神戒2未能穿戴！');
    }

    // 验证旧戒指是否安全回到了背包，没有被吞
    const old1InBag = world.inventory.some(i => i.name === '旧戒指1');
    const old2InBag = world.inventory.some(i => i.name === '旧戒指2');
    if (!old1InBag || !old2InBag) {
      throw new Error('Test 6 失败：旧戒指在满包换装时被吞掉了！');
    }
    if (world.inventory.length !== 40) {
      throw new Error(`Test 6 失败：背包总数发生异常变动: ${world.inventory.length}`);
    }

    console.log('  ✓ Test 6 通过：40/40 满包状态下一键换装双槽位顺利完成，旧装备 100% 完整保留无丢失！\n');
  }

  console.log('====================================================');
  console.log('🎉 全部 6 项核心测试用例 100% 顺利通过！机制坚如磐石！');
  console.log('====================================================');
}

runTests();
