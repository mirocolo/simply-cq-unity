namespace SimplyCQ.Domain
{
    /// <summary>
    /// 地图表。Domain 只认这个接口 —— 地图是来自 JSON、内置还是测试里手搓的，Domain 不关心。
    /// 和 IItemCatalog / ISkillCatalog 是同一种做法：数据怎么来，玩法逻辑都不用动。
    /// </summary>
    public interface IMapCatalog
    {
        /// <summary>按 id 取图；找不到返回 null（调用方负责给玩家反馈，不要静默失败）。</summary>
        GameMap GetMap(string mapId);
    }
}
