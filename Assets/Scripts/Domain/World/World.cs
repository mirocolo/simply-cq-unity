using System;
using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 世界状态 = 唯一的真相来源。表现层只能读它 + 订阅它的事件。
    /// 存档 = 序列化这个对象（M3 做）。
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

        private readonly Dictionary<EntityId, Entity> _entities = new Dictionary<EntityId, Entity>();
        private readonly Dictionary<int, EntityId> _occupancy = new Dictionary<int, EntityId>();
        private int _nextId = 1;

        public World(GameMap map, uint seed, IEventBus events)
        {
            Map = map;
            Rng = new Rng(seed);
            Events = events != null ? events : new EventBus();
            Paths = new PathFinder(map);
        }

        public int EntityCount { get { return _entities.Count; } }
        public IEnumerable<Entity> Entities { get { return _entities.Values; } }

        public Entity Spawn(Entity e)
        {
            if (e == null) throw new ArgumentNullException("e");
            if (!Map.InBounds(e.Pos))
                throw new ArgumentOutOfRangeException("e", "实体出生点在map外: " + e.Pos);
            e.Id = new EntityId(_nextId++);
            _entities[e.Id] = e;
            _occupancy[Key(e.Pos)] = e.Id;
            Events.Publish(new EntitySpawned { Id = e.Id, Kind = e.Kind, DefId = e.DefId, Pos = e.Pos });
            return e;
        }

        public void Despawn(EntityId id)
        {
            Entity e;
            if (!_entities.TryGetValue(id, out e)) return;
            _entities.Remove(id);
            EntityId occupant;
            if (_occupancy.TryGetValue(Key(e.Pos), out occupant) && occupant == id)
                _occupancy.Remove(Key(e.Pos));
            if (Player != null && Player.Id == id) Player = null;
            Events.Publish(new EntityRemoved { Id = id, Kind = e.Kind });
        }

        public Entity Get(EntityId id)
        {
            Entity e;
            return _entities.TryGetValue(id, out e) ? e : null;
        }

        public bool TryGet(EntityId id, out Entity e) { return _entities.TryGetValue(id, out e); }

        public bool IsOccupied(TilePos p) { return _occupancy.ContainsKey(Key(p)); }

        public Entity EntityAt(TilePos p)
        {
            EntityId id;
            if (_occupancy.TryGetValue(Key(p), out id)) return Get(id);
            return null;
        }

        /// <summary>self 可以踩自己脚下的格子（用于寻路时忽略自身）。</summary>
        public bool CanWalk(TilePos p, Entity self)
        {
            if (!Map.IsWalkable(p)) return false;
            EntityId occupant;
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
            EntityId occupant;
            if (_occupancy.TryGetValue(Key(e.Pos), out occupant) && occupant == e.Id)
                _occupancy.Remove(Key(e.Pos));
            e.Pos = to;
            _occupancy[Key(to)] = e.Id;
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

        public void Step(IReadOnlyList<Intent> intents)
        {
            Tick++;
            for (int i = 0; i < Systems.Count; i++) Systems[i].Tick(this, intents);
        }

        private int Key(TilePos p)
        {
            // +1 偏移 + (Width+2) 步长，保证地图外的负坐标也不会撞 key
            return (p.Y + 1) * (Map.Width + 2) + (p.X + 1);
        }
    }
}
