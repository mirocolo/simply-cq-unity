using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>摇掉落表。纯函数 + 注入 Rng，所以可复现、可无头测。</summary>
    public static class DropRoller
    {
        public static void Roll(List<ItemDrop> table, Rng rng, List<ItemDropResult> outResults)
        {
            if (outResults == null) return;
            outResults.Clear();
            if (table == null || rng == null) return;

            for (int i = 0; i < table.Count; i++)
            {
                ItemDrop d = table[i];
                if (d == null || string.IsNullOrEmpty(d.ItemId)) continue;
                if (!rng.Chance(d.Chance)) continue;

                int count = rng.Range(d.Min, d.Max);
                if (count <= 0) continue;

                ItemDropResult r = new ItemDropResult();
                r.ItemId = d.ItemId;
                r.Count = count;
                outResults.Add(r);
            }
        }
    }
}
