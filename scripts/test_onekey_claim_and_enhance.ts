import { GameWorld } from '../src/domain/GameWorld';
import { MONSTER_CODEX_DEFINITIONS } from '../src/domain/definitions/codex';
import { ENHANCEABLE_SLOTS, MAX_ENHANCE_LEVEL } from '../src/domain/definitions/enhancement';
import { DropSystem } from '../src/domain/DropSystem';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERT FAILED] ${message}`);
  }
}

console.log('=== Starting Test: One-Key Claim & One-Key Enhance ===\n');

// -------------------------------------------------------------
// 1. Test Codex One-Key Claim (百妖封魔录一键参悟)
// -------------------------------------------------------------
console.log('1. Testing claimAllCodexRewards()...');
const world1 = new GameWorld();

// Simulate killing monsters across several templates
world1.monsterKills['m_scarecrow'] = 100; // meets kills 10 & 50 (2 milestones)
world1.monsterKills['m_cat'] = 100; // meets kills 10 & 50 (2 milestones)
world1.monsterKills['m_skeleton'] = 100; // meets kills 10 & 50 (2 milestones)
world1.monsterKills['m_zombie'] = 20; // meets boss kills 1, 5, 15 (3 milestones)

const initialBonus = world1.getCodexStatsBonus();
assert(initialBonus.maxHp === 0 && initialBonus.maxDC === 0, 'Initial codex bonus should be 0');

const codexResult = world1.claimAllCodexRewards();
console.log(`   Claimed ${codexResult.count} codex milestones. Stats gain: ${codexResult.statsGain}`);
assert(codexResult.count >= 6, `Expected at least 6 milestones claimed, got ${codexResult.count}`);

const afterBonus = world1.getCodexStatsBonus();
assert(afterBonus.maxHp > 0 || afterBonus.maxDC > 0, 'Codex stats bonus should increase after one-key claim');

// Second call should claim 0 since all eligible are already claimed
const secondCodexResult = world1.claimAllCodexRewards();
assert(secondCodexResult.count === 0, 'Subsequent claimAllCodexRewards should return count 0');
console.log('   ✓ Codex one-key claim passed successfully!\n');

// -------------------------------------------------------------
// 2. Test Bounty One-Key Claim (万象悬赏令一键交令)
// -------------------------------------------------------------
console.log('2. Testing claimAllBounties()...');
const world2 = new GameWorld();

// Ensure there are bounties
if (world2.activeBounties.length === 0) {
  world2.refreshBounties();
}

// Mark 2 bounties as completed
assert(world2.activeBounties.length >= 2, 'Should have at least 2 active bounties');
world2.activeBounties[0].completed = true;
world2.activeBounties[0].claimed = false;
world2.activeBounties[1].completed = true;
world2.activeBounties[1].claimed = false;

const expectedGold = world2.activeBounties[0].rewardGold + world2.activeBounties[1].rewardGold;
const initialGold = world2.player.stats.gold;

const bountyResult = world2.claimAllBounties();
console.log(`   Claimed ${bountyResult.count} bounties, Gold +${bountyResult.gold}, Iron +${bountyResult.iron}`);
assert(bountyResult.count === 2, `Expected 2 bounties claimed, got ${bountyResult.count}`);
assert(bountyResult.gold === expectedGold, `Expected gold ${expectedGold}, got ${bountyResult.gold}`);
assert(world2.player.stats.gold === initialGold + expectedGold, 'Player gold should reflect bounty rewards');
assert(world2.activeBounties[0].claimed && world2.activeBounties[1].claimed, 'Bounties should be marked as claimed');

// Calling again should return 0
const secondBountyResult = world2.claimAllBounties();
assert(secondBountyResult.count === 0, 'Second claimAllBounties should claim 0');
console.log('   ✓ Bounty one-key claim passed successfully!\n');

// -------------------------------------------------------------
// 3. Test Master One-Key Claim All (一键全部领取)
// -------------------------------------------------------------
console.log('3. Testing claimAllCodexAndBounties()...');
const world3 = new GameWorld();
world3.monsterKills['m_cat'] = 200;
if (world3.activeBounties[0]) {
  world3.activeBounties[0].completed = true;
  world3.activeBounties[0].claimed = false;
}

const masterResult = world3.claimAllCodexAndBounties();
console.log(`   Master Claim: ${masterResult.message}`);
assert(masterResult.codexCount > 0, 'Should have claimed codex milestones');
assert(masterResult.bountyCount > 0, 'Should have claimed bounty');
console.log('   ✓ Master one-key claim passed successfully!\n');

// -------------------------------------------------------------
// 4. Test Single Slot One-Key Enhance (当前部位一键冲级)
// -------------------------------------------------------------
console.log('4. Testing enhanceSlotOneKey()...');
const world4 = new GameWorld();

// Give player plenty of resources
world4.player.stats.gold = 5_000_000;
const oreItem = DropSystem.createItemInstance('mat_iron_ore', undefined, 200);
if (oreItem) world4.addItemToInventory(oreItem);
const pureIronItem = DropSystem.createItemInstance('mat_pure_iron', undefined, 200);
if (pureIronItem) world4.addItemToInventory(pureIronItem);
const godStoneItem = DropSystem.createItemInstance('mat_god_stone', undefined, 200);
if (godStoneItem) world4.addItemToInventory(godStoneItem);

const startWeaponLevel = world4.slotEnhancements['weapon'] || 0;
assert(startWeaponLevel === 0, 'Initial weapon level should be 0');

const weaponOneKey = world4.enhanceSlotOneKey('weapon', 30);
console.log(`   Weapon One-Key result: ${weaponOneKey.message} (Level: ${weaponOneKey.startLevel} -> ${weaponOneKey.newLevel})`);
assert(weaponOneKey.newLevel === 1, `Weapon should level up to +1, got +${weaponOneKey.newLevel}`);
assert(weaponOneKey.successCount === 1, 'Should have 1 success for single slot one-key');
assert(world4.slotEnhancements['weapon'] === 1, 'world4.slotEnhancements[weapon] must be 1');
console.log('   ✓ Single slot one-key enhance passed successfully!\n');

// -------------------------------------------------------------
// 5. Test Balanced Resonance One-Key Enhance (一键强化全身·均衡共鸣)
// -------------------------------------------------------------
console.log('5. Testing enhanceAllSlotsOneKey()...');
const world5 = new GameWorld();

// Give player huge amount of resources to test multi-slot balanced enhancement
world5.player.stats.gold = 20_000_000;
const ore5 = DropSystem.createItemInstance('mat_iron_ore', undefined, 500);
if (ore5) world5.addItemToInventory(ore5);
const pure5 = DropSystem.createItemInstance('mat_pure_iron', undefined, 500);
if (pure5) world5.addItemToInventory(pure5);
const god5 = DropSystem.createItemInstance('mat_god_stone', undefined, 500);
if (god5) world5.addItemToInventory(god5);

const initialCp = world5.player.stats.combatPower;

// Run whole-body balanced resonance enhancement with 50 tries
const allResult = world5.enhanceAllSlotsOneKey(60);
console.log(`   Enhance All result: ${allResult.message}`);
console.log(`   Min level before: ${allResult.minLevelBefore}, after: ${allResult.minLevelAfter}`);
console.log(`   Total successes: ${allResult.totalSuccess}, total fails: ${allResult.totalFails}`);

assert(allResult.totalSuccess > 0, 'Should have performed multiple successful enhancements');
assert(allResult.combatPowerDiff > 0, 'Combat power should increase significantly');

// Verify that all 8 slots are enhanced in a balanced manner
const slotLevels = ENHANCEABLE_SLOTS.map(s => world5.slotEnhancements[s] || 0);
const maxLvl = Math.max(...slotLevels);
const minLvl = Math.min(...slotLevels);
console.log(`   Slot levels across all 8 slots: [${slotLevels.join(', ')}]. Diff: ${maxLvl - minLvl}`);
// With balanced resonance algorithm, diff between max and min slot level should not exceed 1 (or 2 due to failure variance)
assert(maxLvl - minLvl <= 2, `Slot level difference should be balanced (<= 2), got max=${maxLvl}, min=${minLvl}`);

console.log('   ✓ Whole-set balanced resonance enhancement passed successfully!\n');

// -------------------------------------------------------------
// 6. Test Zero Resource Safety & Max Level Ceiling
// -------------------------------------------------------------
console.log('6. Testing resource exhaustion safety...');
const world6 = new GameWorld();
world6.player.stats.gold = 0; // No gold

const zeroGoldResult = world6.enhanceSlotOneKey('armor');
assert(zeroGoldResult.successCount === 0, 'Should not enhance with 0 gold');
assert((world6.slotEnhancements['armor'] || 0) === 0, 'Level should remain 0');

const zeroAll = world6.enhanceAllSlotsOneKey();
assert(zeroAll.totalSuccess === 0, 'Whole body enhance should terminate immediately when 0 gold');

// Test max level ceiling
for (const s of ENHANCEABLE_SLOTS) {
  world6.slotEnhancements[s] = MAX_ENHANCE_LEVEL;
}
world6.player.stats.gold = 100_000_000;
const maxResult = world6.enhanceAllSlotsOneKey();
assert(maxResult.totalSuccess === 0, 'Cannot enhance beyond max level +15');
console.log('   ✓ Zero resource safety and level cap checks passed!\n');

console.log('=== All One-Key Claim & Enhance Tests Passed Successfully! ===');
