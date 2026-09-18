using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 底部快捷栏（按键 1..6）。显示技能名、蓝耗、冷却倒计时。
    /// 冷却遮罩是"攻速/技能节奏"最直观的反馈。
    ///
    /// 不是面板（没有标题栏、不能拖），但配色和字号走同一套 <see cref="UiSkin"/>。
    /// </summary>
    public sealed class SkillBarUi
    {
        private const float SlotW = 104f;
        private const float SlotH = 48f;
        private const float Gap = 6f;

        /// <summary>逻辑 tick 频率，用来把"剩余 tick"换算成秒。</summary>
        public float TickRate = 10f;

        public void Draw(Entity player, ISkillCatalog skills)
        {
            if (player == null || skills == null) return;

            int slots = SkillSystem.BarSlots;
            float total = slots * SlotW + (slots - 1) * Gap;
            float x0 = (Screen.width / UiScale.Scale - total) * 0.5f;
            float y = (Screen.height / UiScale.Scale) - SlotH - 14f;

            for (int i = 0; i < slots; i++)
            {
                SkillDef def = SkillSystem.BarSkill(player, i, skills);
                Rect r = UiScale.R(x0 + i * (SlotW + Gap), y, SlotW, SlotH);

                UiSkin.Cell(r, def != null);

                if (def == null)
                {
                    GUI.Label(UiSkin.LRect(r, 8f, 14f, SlotW, 20f), "-- 未学 --", UiSkin.Styles.Small);
                    GUI.Label(UiSkin.LRect(r, 6f, 2f, 16f, 18f), (i + 1).ToString(), UiSkin.Styles.Value);
                    continue;
                }

                int cooldown = SkillSystem.CooldownLeft(player, def.Id);
                bool enoughMp = player.Mp >= def.Mp;

                GUI.Label(UiSkin.LRect(r, 6f, 2f, 16f, 18f), (i + 1).ToString(), UiSkin.Styles.Value);
                GUI.Label(UiSkin.LRect(r, 20f, 4f, SlotW - 24f, 20f), def.Name, UiSkin.Styles.Label);
                GUI.Label(UiSkin.LRect(r, 20f, 24f, SlotW - 24f, 18f), def.Mp + " 蓝",
                    enoughMp ? UiSkin.Styles.Group : UiSkin.Styles.Bad);

                if (cooldown > 0)
                {
                    float pct = Mathf.Clamp01(cooldown / (float)(def.CooldownTicks < 1 ? 1 : def.CooldownTicks));
                    UiSkin.Fill(new Rect(r.x, r.y, r.width * pct, r.height), new Color(0f, 0f, 0f, 0.60f));
                    GUI.Label(UiSkin.LRect(r, 20f, 24f, SlotW - 24f, 18f),
                        (cooldown / TickRate).ToString("0.0") + "s", UiSkin.Styles.Bar);
                }
                else if (!enoughMp)
                {
                    // 蓝不够：整格压一层暗红，不用读字就知道放不了
                    UiSkin.Fill(r, new Color(0.35f, 0.06f, 0.06f, 0.35f));
                }
            }
        }
    }
}
