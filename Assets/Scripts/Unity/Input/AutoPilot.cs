using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 挂机 AI：替玩家往意图列表里写东西，和手操共存 —— 这一 tick 你按了键就以你为准。
    ///
    /// 为什么它能这么薄：这个项目的 Domain 是纯 Intent 驱动的（走路/攻击/技能全是意图），
    /// 怪物的 AI 也是这么干的。所以挂机不需要碰任何玩法逻辑，
    /// 只需要"选目标 → 走一步 / 出手"，剩下的伤害、命中、掉落全部走原有通道。
    ///
    /// 第一版刻意保守：只守当前这张图，没怪可打就原地待机 ——
    /// 跨图巡逻等于让角色自己决定去哪送死，那个决定应该由人来做。
    /// </summary>
    public sealed class AutoPilot
    {
        /// <summary>找怪半径（切比雪夫格）。超出就当"周围没怪"，待机。</summary>
        public const int SearchRadius = 12;

        /// <summary>紧急血线：低于它只走位不攻击（喝药交给自动喝药，走位给自己喘息）。</summary>
        public const float EmergencyHpPct = 0.3f;

        public bool Enabled;

        /// <summary>这一 tick 产出的是不是移动 —— HUD 显示用。</summary>
        public bool LastActionWasMove { get; private set; }

        /// <summary>当前锁定的目标名（HUD 显示用），没有就是空。</summary>
        public string TargetName { get; private set; } = "";

        /// <summary>
        /// 产出挂机意图。manualActed = 这一 tick 玩家自己按了键（优先，挂机让位）。
        /// 返回是否产出了意图。
        /// </summary>
        public bool TryProduce(World world, Entity player, ISkillCatalog skills,
                               bool manualActed, List<Intent> outIntents)
        {
            TargetName = "";
            LastActionWasMove = false;
            if (!Enabled || manualActed) return false;
            if (world == null || player == null || !player.IsAlive) return false;

            Entity target = NearestMonster(world, player);
            if (target == null) return false;
            TargetName = target.Name;

            int dist = player.Pos.ChebyshevTo(target.Pos);
            float hpPct = player.MaxHp > 0 ? player.Hp / (float)player.MaxHp : 0f;

            // 紧急血线：贴脸就撤一步，别站着挨打等药生效
            if (hpPct < EmergencyHpPct && dist <= player.AttackRange)
            {
                Dir? fleeDir = StepDir(player.Pos, target.Pos, world, flee: true);
                if (fleeDir == null) return false;
                outIntents.Add(Intent.Move(player.Id, fleeDir.Value));
                LastActionWasMove = true;
                return true;
            }

            // 射程内：技能 1 好了先放，普攻照常（卡刀不浪费）
            if (dist <= player.AttackRange)
            {
                Dir? dir = StepDir(player.Pos, target.Pos, world);
                if (dir == null) return false;
                Dir attackDir = dir.Value;

                if (ReadySkillSlot(player, skills) >= 0)
                    outIntents.Add(Intent.BagAction(player.Id, IntentKind.CastSkill, 0));
                outIntents.Add(Intent.Attack(player.Id, attackDir));
                return true;
            }

            // 射程外：走一步
            Dir? step = StepDir(player.Pos, target.Pos, world);
            if (step == null) return false;
            outIntents.Add(Intent.Move(player.Id, step.Value));
            LastActionWasMove = true;
            return true;
        }

        /// <summary>半径内最近的活怪。</summary>
        private static Entity NearestMonster(World world, Entity player)
        {
            Entity best = null;
            int bestDist = int.MaxValue;
            foreach (Entity e in world.Entities)
            {
                if (e.Kind != EntityKind.Monster || !e.IsAlive) continue;
                int dist = player.Pos.ChebyshevTo(e.Pos);
                if (dist > SearchRadius) continue;
                if (dist < bestDist) { bestDist = dist; best = e; }
            }
            return best;
        }

        /// <summary>技能 1 冷却好且蓝够，返回它的快捷栏位；否则 -1。</summary>
        private static int ReadySkillSlot(Entity player, ISkillCatalog skills)
        {
            SkillDef def = SkillSystem.BarSkill(player, 0, skills);
            if (def == null) return -1;
            if (SkillSystem.CooldownLeft(player, def.Id) > 0) return -1;
            if (player.Mp < def.Mp) return -1;
            return 0;
        }

        /// <summary>朝目标走一步：主轴（差距大的那边）优先，走不通换副轴，再不通走斜线。</summary>
        private static Dir? StepDir(TilePos from, TilePos to, World world, bool flee = false)
        {
            int dx = to.X - from.X;
            int dy = to.Y - from.Y;
            if (flee) { dx = -dx; dy = -dy; }

            int sx = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
            int sy = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
            if (sx == 0 && sy == 0) return null;

            bool xFirst = Mathf.Abs(dx) >= Mathf.Abs(dy);
            Dir? primary = DirFrom(xFirst ? sx : 0, xFirst ? 0 : sy);
            Dir? secondary = DirFrom(xFirst ? 0 : sx, xFirst ? sy : 0);
            Dir? diagonal = DirFrom(sx, sy);

            if (CanStep(world, from, primary)) return primary.Value;
            if (CanStep(world, from, secondary)) return secondary.Value;
            if (CanStep(world, from, diagonal)) return diagonal.Value;

            // 全被堵死：交出主轴让移动系统去拒绝，总比站着卡死强
            return primary ?? secondary ?? Dir.Down;
        }

        private static bool CanStep(World world, TilePos from, Dir? dir)
        {
            if (dir == null) return false;
            TilePos to = from + DirHelper.Delta(dir.Value);
            return world.Map.IsWalkable(to) && !world.IsOccupied(to);
        }

        /// <summary>按符号组合挑一个方向；0,0 返回 None。</summary>
        private static Dir? DirFrom(int sx, int sy)
        {
            for (int d = 0; d < 8; d++)
            {
                Dir dir = (Dir)d;
                TilePos delta = DirHelper.Delta(dir);
                if (delta.X == sx && delta.Y == sy) return dir;
            }
            return null;
        }
    }
}
