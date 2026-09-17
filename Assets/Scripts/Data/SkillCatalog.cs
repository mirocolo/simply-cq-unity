using System.Collections.Generic;
using SimplyCQ.Domain;

namespace SimplyCQ.Data
{
    /// <summary>skills.json -> Domain 的 ISkillCatalog。字符串转枚举只在这里做一次。</summary>
    public sealed class SkillCatalog : ISkillCatalog
    {
        private readonly Dictionary<string, SkillDef> _byId = new Dictionary<string, SkillDef>();
        private readonly List<SkillDef> _all = new List<SkillDef>();

        public IEnumerable<SkillDef> All { get { return _all; } }
        public int Count { get { return _all.Count; } }

        public SkillDef Get(string skillId)
        {
            if (string.IsNullOrEmpty(skillId)) return null;
            SkillDef def;
            return _byId.TryGetValue(skillId, out def) ? def : null;
        }

        public void Add(SkillDto dto)
        {
            if (dto == null || string.IsNullOrEmpty(dto.id)) return;

            SkillDef def = new SkillDef();
            def.Id = dto.id;
            def.Name = string.IsNullOrEmpty(dto.name) ? dto.id : dto.name;
            def.ClassId = dto.classId;
            def.LearnLevel = dto.learnLevel > 0 ? dto.learnLevel : 1;
            def.Kind = string.Equals(dto.kind, "passive", System.StringComparison.OrdinalIgnoreCase)
                ? SkillKind.Passive : SkillKind.Active;
            def.Target = ParseTarget(dto.target);
            def.Mp = dto.mp < 0 ? 0 : dto.mp;
            def.CooldownTicks = dto.cooldownTicks > 0 ? dto.cooldownTicks : 1;
            def.Range = dto.range > 0 ? dto.range : 1;
            def.DamageCoeff = dto.damageCoeff > 0f ? dto.damageCoeff : 1f;
            def.BonusHit = dto.bonusHit;
            def.BonusMinDc = dto.bonusMinDc;
            def.BonusMaxDc = dto.bonusMaxDc;
            def.BonusAc = dto.bonusAc;
            def.Description = dto.desc;

            _byId[def.Id] = def;
            _all.Add(def);
        }

        public static SkillCatalog FromFile(SkillFile file)
        {
            SkillCatalog catalog = new SkillCatalog();
            if (file == null || file.skills == null) return catalog;
            for (int i = 0; i < file.skills.Length; i++) catalog.Add(file.skills[i]);
            return catalog;
        }

        private static SkillTarget ParseTarget(string s)
        {
            if (string.IsNullOrEmpty(s)) return SkillTarget.Single;
            switch (s.Trim().ToLowerInvariant())
            {
                case "line": return SkillTarget.Line;
                case "around": return SkillTarget.Around;
                default: return SkillTarget.Single;
            }
        }
    }
}
