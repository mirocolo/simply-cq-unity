using System;
using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 世界状态 = 唯一的真相来源。表现层只能读它 + 订阅它的事件。
    /// 存档 = 序列化这个对象（M3 做）。
    ///
    /// 有两张空间索引：
    ///   _occupancy  —— 会挡路的实体（玩家/怪/NPC），一格一个，寻路和碰撞看它
    ///   _groundItems—— 不挡路的掉落物（金币），可以和角色同格，踩上去就捡
    /// </summary>
    public sealed class World
    {
        public readonly GameMap Map;
        public readonly Rng Rng;
        public readonly IEventBus Events;
        public readonly PathFinder Paths;
        public readonly List<ISystem> Systems = new List<ISystem>();

        public long Tick;
        public Entity Player;

        private readonly Dictionary<ActorId, Entity> _entities = new Dictionary<ActorId, Entity>();
        private readonly Dictionary<int, ActorId> _occupancy = new Dictionary<int, ActorId>();
        private readonly Dictionary<int, ActorId> _groundItems = new Dictionary<int, ActorId>();
        private readonly List<Entity> _scratch = new List<Entity>(256);
        private int _nextId = 1;

        public World(GameMap map, uint seed, IEventBus events)
        {
            Map = map;
            Rng = new Rng(seed);
            Events = events != null ? events : new EventBus();
            Paths = new PathFinder(map);
        }

        public int EntityCount { get { return _entities.Count; } }
        public int GroundItemCount { get { return _groundItems.Count; } }
        public IEnumerable<Entity> Entities { get { return _entities.Values; } }

        public Entity Spawn(Entity e)
        {
            if (e == null) throw new ArgumentNullException("e");
            if (!Map.InBounds(e.Pos))
                throw new ArgumentOutOfRangeException("e", "实体出生点在map外: " + e.Pos);

            e.Id = new ActorId(_nextId++);
            _entities[e.Id] = e;
            Track(e);
            Events.Publish(new EntitySpawned { Id = e.Id, Kind = e.Kind, DefId = e.DefId, Pos = e.Pos });
            return e;
        }

        public void Despawn(ActorId id)
        {
            Entity e;
            if (!_entities.TryGetValue(id, out e)) return;

            _entities.Remove(id);
            Untrack(e);
            if (Player != null && Player.Id == id) Player = null;
            Events.Publish(new EntityRemoved { Id = id, Kind = e.Kind });
        }

        public Entity Get(ActorId id)
        {
            Entity e;
            return _entities.TryGetValue(id, out e) ? e : null;
        }

        public bool TryGet(ActorId id, out Entity e) { return _entities.TryGetValue(id, out e); }

        /// <summary>是不是有「会挡路的东西」站在这一格。</summary>
        public bool IsOccupied(TilePos p) { return _occupancy.ContainsKey(Key(p)); }

        /// <summary>挡路的那个实体（掉落物不算）。</summary>
        public Entity EntityAt(TilePos p)
        {
            ActorId id;
            if (_occupancy.TryGetValue(Key(p), out id)) return Get(id);
            return null;
        }

        /// <summary>这一格有没有掉落物。</summary>
        public Entity GroundItemAt(TilePos p)
        {
            ActorId id;
            if (_groundItems.TryGetValue(Key(p), out id)) return Get(id);
            return null;
        }

        /// <summary>self 可以踩自己脚下的格子（寻路时用来忽略自身）。</summary>
        public bool CanWalk(TilePos p, Entity self)
        {
            if (!Map.IsWalkable(p)) return false;
            ActorId occupant;
            if (_occupancy.TryGetValue(Key(p), out occupant))
                return self != null && occupant == self.Id;
            return true;
        }

        public void MoveEntity(Entity e, Dir dir)
        {
            TilePos from = e.Pos;
            TilePos to = from + DirHelper.Delta(dir);
            Teleport(e, to);
            e.Facing = dir;
            Events.Publish(new EntityMoved { Id = e.Id, From = from, To = to, Facing = dir });
        }

        /// <summary>只改位置，不改朝向，不发 EntityMoved。</summary>
        public void Teleport(Entity e, TilePos to)
        {
            Untrack(e);
            e.Pos = to;
            Track(e);
        }

        /// <summary>把实体放到目标点（会发事件，供视图直接把位置咬合过去）。</summary>
        public void PlaceEntity(Entity e, TilePos to)
        {
            Teleport(e, to);
            Events.Publish(new EntityTeleported { Id = e.Id, To = to });
        }

        public TilePos FindFreeTileNear(TilePos origin, int maxRadius)
        {
            if (Map.IsWalkable(origin) && !IsOccupied(origin)) return origin;
            for (int r = 1; r <= maxRadius; r++)
            {
                for (int dy = -r; dy <= r; dy++)
                {
                    for (int dx = -r; dx <= r; dx++)
                    {
                        if (Math.Abs(dx) != r && Math.Abs(dy) != r) continue;
                        TilePos p = new TilePos(origin.X + dx, origin.Y + dy);
                        if (Map.IsWalkable(p) && !IsOccupied(p)) return p;
                    }
                }
            }
            return origin;
        }

        /// <summary>
        /// 遍历用的快照。系统里如果要在遍历过程中 Spawn/Despawn（掉落、拾取都会），
        /// 必须遍历这个而不是 Entities —— 否则会在枚举 Dictionary 时改集合，直接抛异常。
        /// 复用同一个 buffer，所以不要嵌套调用。
        /// </summary>
        public List<Entity> SnapshotEntities()
        {
            _scratch.Clear();
            _scratch.AddRange(_entities.Values);
            return _scratch;
        }

        /// <summary>
        /// 找一个「没挡路 + 没掉落物」的格子，用来把战利品散开，
        /// 否则一次掉三件东西会互相覆盖（一格只挂得下一个掉落物）。
        /// </summary>
        public TilePos FindFreeGroundTileNear(TilePos origin, int maxRadius)
        {
            if (Map.IsWalkable(origin) && !IsOccupied(origin) && GroundItemAt(origin) == null) return origin;
            for (int r = 1; r <= maxRadius; r++)
            {
                for (int dy = -r; dy <= r; dy++)
                {
                    for (int dx = -r; dx <= r; dx++)
                    {
                        if (Math.Abs(dx) != r && Math.Abs(dy) != r) continue;
                        TilePos p = new TilePos(origin.X + dx, origin.Y + dy);
                        if (!Map.IsWalkable(p)) continue;
                        if (IsOccupied(p)) continue;
                        if (GroundItemAt(p) != null) continue;
                        return p;
                    }
                }
            }
            return origin;
        }

        public void Step(IReadOnlyList<Intent> intents)
        {
            Tick++;
            for (int i = 0; i < Systems.Count; i++) Systems[i].Tick(this, intents);
        }

        private void Track(Entity e)
        {
            if (e.BlocksTile) _occupancy[Key(e.Pos)] = e.Id;
            else _groundItems[Key(e.Pos)] = e.Id;
        }

        private void Untrack(Entity e)
        {
            ActorId id;
            if (_occupancy.TryGetValue(Key(e.Pos), out id) && id == e.Id) _occupancy.Remove(Key(e.Pos));
            if (_groundItems.TryGetValue(Key(e.Pos), out id) && id == e.Id) _groundItems.Remove(Key(e.Pos));
        }

        private int Key(TilePos p)
        {
            // +1 偏移 + (Width+2) 步长，保证地图外的负坐标也不会撞 key
            return (p.Y + 1) * (Map.Width + 2) + (p.X + 1);
        }
    }
}
