using System;
using System.Collections.Generic;
using System.IO;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Data
{
    /// <summary>
    /// 存档 / 读档。JSON 明文，方便手改也方便排查。
    /// 只恢复玩家（属性 / 位置 / 背包 / 装备）；怪和地面掉落物重进重新生成。
    /// </summary>
    public static class SaveService
    {
        private const string FileName = "save1.json";

        public static string DefaultPath
        {
            get { return Path.Combine(Application.persistentDataPath, FileName); }
        }

        public static bool HasSave() { return File.Exists(DefaultPath); }

        // ------------------------------------------------------------------ 存

        public static SaveData Capture(World world, int seed)
        {
            SaveData data = new SaveData();
            data.Version = SaveData.Version1;
            data.Seed = seed;
            data.SavedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

            Entity p = world != null ? world.Player : null;
            if (p == null) return data;

            data.MapId = world.Map != null ? world.Map.Id : "";
            data.Level = p.Level;
            data.Exp = p.Exp;
            data.ExpToNextLevel = p.ExpToNextLevel;
            data.Gold = p.Gold;
            data.Hp = p.Hp;
            data.MaxHp = p.MaxHp;
            data.BaseMinDc = p.BaseMinDc;
            data.BaseMaxDc = p.BaseMaxDc;
            data.BaseAc = p.BaseAc;
            data.BaseMaxHp = p.BaseMaxHp;
            data.X = p.Pos.X;
            data.Y = p.Pos.Y;

            if (p.Bag != null)
            {
                for (int i = 0; i < Inventory.SlotCount; i++)
                {
                    ItemInstance s = p.Bag.At(i);
                    data.BagIds[i] = s != null ? s.DefId : "";
                    data.BagCounts[i] = s != null ? s.Count : 0;
                }
            }

            if (p.Gear != null)
            {
                for (int i = 0; i < ItemDef.SlotCount; i++)
                {
                    ItemInstance worn = p.Gear.Get((EquipSlot)i);
                    data.GearIds[i] = worn != null ? worn.DefId : "";
                    data.GearCounts[i] = worn != null ? worn.Count : 0;
                }
            }

            return data;
        }

        public static bool Save(World world, int seed, string path)
        {
            try
            {
                SaveData data = Capture(world, seed);
                string dir = Path.GetDirectoryName(path);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir)) Directory.CreateDirectory(dir);
                File.WriteAllText(path, JsonUtility.ToJson(data, true));
                Debug.Log("[SimplyCQ] 已存档 -> " + path);
                return true;
            }
            catch (Exception ex)
            {
                Debug.LogError("[SimplyCQ] 存档失败：" + ex.Message);
                return false;
            }
        }

        // ------------------------------------------------------------------ 读

        public static SaveData Load(string path)
        {
            try
            {
                if (!File.Exists(path)) return null;
                SaveData data = JsonUtility.FromJson<SaveData>(File.ReadAllText(path));
                if (data == null) return null;
                if (data.Version > SaveData.Version1)
                {
                    Debug.LogError("[SimplyCQ] 存档版本(" + data.Version + ")比程序还新，已忽略");
                    return null;
                }
                return data;
            }
            catch (Exception ex)
            {
                Debug.LogError("[SimplyCQ] 读档失败：" + ex.Message);
                return null;
            }
        }

        // ------------------------------------------------------------------ 应用

        /// <summary>
        /// 把存档应用到当前 World。maps 传了就支持跨图读档（存档里记着 MapId）；
        /// 不传则只会把玩家放在当前地图上（旧的三参调用行为不变）。
        /// </summary>
        public static bool Apply(SaveData data, World world, IItemCatalog catalog, IMapCatalog maps = null)
        {
            if (data == null || world == null) return false;

            Entity p = world.Player;
            if (p == null || p.Bag == null || p.Gear == null) return false;

            p.Level = data.Level > 0 ? data.Level : 1;
            p.Exp = data.Exp;
            p.ExpToNextLevel = data.ExpToNextLevel > 0 ? data.ExpToNextLevel : 1;
            p.Gold = data.Gold;
            p.BaseMinDc = data.BaseMinDc;
            p.BaseMaxDc = data.BaseMaxDc;
            p.BaseAc = data.BaseAc;
            p.BaseMaxHp = data.BaseMaxHp > 0 ? data.BaseMaxHp : 1;

            // 背包：物品表里查不到的条目直接丢掉，别把坏数据带进游戏
            for (int i = 0; i < Inventory.SlotCount; i++) p.Bag.Slots[i] = null;
            if (data.BagIds != null)
            {
                for (int i = 0; i < Inventory.SlotCount && i < data.BagIds.Length; i++)
                {
                    string id = data.BagIds[i];
                    if (string.IsNullOrEmpty(id)) continue;
                    if (catalog != null && catalog.Get(id) == null)
                    {
                        Debug.LogWarning("[SimplyCQ] 存档里的物品 items.json 已经没有了：" + id);
                        continue;
                    }
                    int count = (data.BagCounts != null && i < data.BagCounts.Length && data.BagCounts[i] > 0) ? data.BagCounts[i] : 1;
                    p.Bag.Slots[i] = new ItemInstance(id, count);
                }
            }

            for (int i = 0; i < ItemDef.SlotCount; i++) p.Gear.Set((EquipSlot)i, null);
            if (data.GearIds != null)
            {
                for (int i = 1; i < ItemDef.SlotCount && i < data.GearIds.Length; i++)
                {
                    string id = data.GearIds[i];
                    if (string.IsNullOrEmpty(id)) continue;
                    if (catalog != null && catalog.Get(id) == null) continue;
                    p.Gear.Set((EquipSlot)i, new ItemInstance(id, 1));
                }
            }

            StatCalculator.Apply(p, catalog);

            p.Hp = data.Hp > 0 ? data.Hp : p.MaxHp;
            if (p.Hp > p.MaxHp) p.Hp = p.MaxHp;

            TilePos at = new TilePos(data.X, data.Y);

            // 存档在别的地图：先换图，再把玩家放过去。
            // 换图的落点/占位/事件都由 ChangeMap 负责，这里不要再 PlaceEntity 一次 ——
            // 否则会以「当前图」的规则把落点改掉，还多发一次 EntityTeleported。
            GameMap target = null;
            if (maps != null && !string.IsNullOrEmpty(data.MapId) && data.MapId != world.Map.Id)
            {
                target = maps.GetMap(data.MapId);
                if (target == null)
                    Debug.LogWarning("[SimplyCQ] 存档记录的地图已不存在：" + data.MapId + "，留在当前地图");
            }

            if (target != null)
            {
                if (!target.IsWalkable(at)) at = target.FindNearestWalkable(at, 16);
                world.ChangeMap(target, at);
                return true;
            }

            if (!world.Map.IsWalkable(at)) at = world.FindFreeTileNear(world.Map.Spawn, 12);
            if (world.IsOccupied(at))
            {
                Entity blocker = world.EntityAt(at);
                if (blocker != null && blocker.Id != p.Id) at = world.FindFreeTileNear(at, 10);
            }
            world.PlaceEntity(p, at);
            return true;
        }
    }
}
