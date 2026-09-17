using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 底部快捷栏（按键 1..6）。显示技能名、蓝耗、冷却倒计时。
    /// 冷却遮罩是"攻速/技能节奏"最直观的反馈。
    /// </summary>
    public sealed class SkillBarUi
    {
        private const float SlotW = 104f;
        private const float SlotH = 48f;
        private const float Gap = 6f;

        /// <summary>逻辑 tick 频率，用来把"剩余 tick"换算成秒。</summary>
        public float TickRate = 10f;

        private GUIStyle _name;
        private GUIStyle _cost;
        private GUIStyle _key;

        public void Draw(Entity player, ISkillCatalog skills)
        {
            if (player == null || skills == null) return;

            EnsureStyles();

            int slots = SkillSystem.BarSlots;
            float total = slots * SlotW + (slots - 1) * Gap;
            float x0 = (Screen.width / UiScale.Scale - total) * 0.5f;
            float y = (Screen.height / UiScale.Scale) - SlotH - 14f;

            for (int i = 0; i < slots; i++)
            {
                SkillDef def = SkillSystem.BarSkill(player, i, skills);
                Rect r = UiScale.R(x0 + i * (SlotW + Gap), y, SlotW, SlotH);

                Fill(r, def != null ? new Color(0.10f, 0.09f, 0.12f, 0.90f) : new Color(0.07f, 0.07f, 0.08f, 0.55f));
                Border(r, new Color(0.45f, 0.40f, 0.26f, 1f));

                if (def == null)
                {
                    GUI.Label(LRect(r, 8f, 14f, SlotW, 20f), "-- 未学 --", _cost);
                    GUI.Label(LRect(r, 6f, 2f, 16f, 18f), (i + 1).ToString(), _key);
                    continue;
                }

                int cooldown = SkillSystem.CooldownLeft(player, def.Id);
                bool enoughMp = player.Mp >= def.Mp;

                GUI.Label(LRect(r, 6f, 2f, 16f, 18f), (i + 1).ToString(), _key);
                GUI.Label(LRect(r, 20f, 4f, SlotW - 24f, 20f), def.Name, _name);
                GUI.Label(LRect(r, 20f, 24f, SlotW - 24f, 18f), def.Mp + " 蓝", enoughMp ? _cost : _key);

                if (cooldown > 0)
                {
                    float pct = Mathf.Clamp01(cooldown / (float)(def.CooldownTicks < 1 ? 1 : def.CooldownTicks));
                    Fill(new Rect(r.x, r.y, r.width * pct, r.height), new Color(0f, 0f, 0f, 0.60f));
                    GUI.Label(LRect(r, 20f, 24f, SlotW - 24f, 18f), (cooldown / TickRate).ToString("0.0") + "s", _name);
                }
                else if (!enoughMp)
                {
                    Fill(r, new Color(0.35f, 0.06f, 0.06f, 0.35f));
                }
            }
        }

        private static Rect LRect(Rect outer, float lx, float ly, float lw, float lh)
        {
            return new Rect(outer.x + UiScale.Px(lx), outer.y + UiScale.Px(ly), UiScale.Px(lw), UiScale.Px(lh));
        }

        private static void Fill(Rect r, Color c)
        {
            Color prev = GUI.color;
            GUI.color = c;
            GUI.DrawTexture(r, Texture2D.whiteTexture);
            GUI.color = prev;
        }

        private static void Border(Rect r, Color c)
        {
            Fill(new Rect(r.x, r.y, r.width, 1f), c);
            Fill(new Rect(r.x, r.yMax - 1f, r.width, 1f), c);
            Fill(new Rect(r.x, r.y, 1f, r.height), c);
            Fill(new Rect(r.xMax - 1f, r.y, 1f, r.height), c);
        }

        private void EnsureStyles()
        {
            if (_name != null) return;

            _name = new GUIStyle(GUI.skin.label);
            _name.fontSize = UiScale.Font(13);
            _name.normal.textColor = Color.white;

            _cost = new GUIStyle(GUI.skin.label);
            _cost.fontSize = UiScale.Font(12);
            _cost.normal.textColor = new Color(0.65f, 0.80f, 1f);

            _key = new GUIStyle(GUI.skin.label);
            _key.fontSize = UiScale.Font(12);
            _key.normal.textColor = new Color(1f, 0.88f, 0.45f);
        }
    }
}
