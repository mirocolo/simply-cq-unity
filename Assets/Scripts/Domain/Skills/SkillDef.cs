using System;
using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    public enum SkillKind { Passive = 0, Active = 1 }

    public enum SkillTarget
    {
        Single = 0,   // 身前一名敌人
        Line = 1,     // 面朝方向一条线
        Around = 2    // 以自己为中心
    }

    /// <summary>技能定义（数据表来）。</summary>
    public sealed class SkillDef
    {
        public string Id;
        public string Name;
        public string ClassId;          // warrior / mage / taoist
        public int LearnLevel = 1;
        public SkillKind Kind = SkillKind.Active;
        public SkillTarget Target = SkillTarget.Single;

        public int Mp;
        public int CooldownTicks = 20;
        public int Range = 1;
        public float DamageCoeff = 1f;

        // 被动技能的加成（学习时一次性加到基础属性上）
        public int BonusHit;
        public int BonusMinDc;
        public int BonusMaxDc;
        public int BonusAc;

        public string Description;
    }

    /// <summary>技能表。和物品表一样，Domain 只认接口。</summary>
    public interface ISkillCatalog
    {
        SkillDef Get(string skillId);
        IEnumerable<SkillDef> All { get; }
    }
}
