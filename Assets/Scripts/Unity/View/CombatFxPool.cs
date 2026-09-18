using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 战斗特效：普攻/技能时在攻击者身前放一道旋转的刀光，短促放大再淡出。
    /// 之前普攻"没有动作"，就是因为逻辑扣了血但屏幕上什么都没发生。
    /// </summary>
    public sealed class CombatFxPool
    {
        private sealed class Fx
        {
            public GameObject Go;
            public SpriteRenderer Renderer;
            public float Age;
            public float Life;
            public float Scale;
            public bool Active;
        }

        private const int SlashWidthPx = 64;
        private const int SlashHeightPx = 22;

        private readonly Transform _root;
        private readonly Projection _projection;
        private readonly World _world;
        private readonly EntityViewRegistry _views;
        private readonly List<Fx> _pool = new List<Fx>();
        private Sprite _slash;

        public CombatFxPool(Transform root, Projection projection, World world, EntityViewRegistry views)
        {
            _root = root;
            _projection = projection;
            _world = world;
            _views = views;

            world.Events.Subscribe<AttackSwing>(OnSwing);
            world.Events.Subscribe<SkillCast>(OnSkillCast);
        }

        private void OnSwing(AttackSwing evt)
        {
            Spawn(evt.Actor, evt.Dir, 0.16f, 0.85f, 1f);
        }

        private void OnSkillCast(SkillCast evt)
        {
            Spawn(evt.Caster, evt.Dir, 0.28f, 1.05f, 1.5f);
        }

        private void Spawn(ActorId actor, Dir dir, float life, float distanceTiles, float scale)
        {
            Transform t = _views.GetTransform(actor);
            if (t == null) return;

            Vector3 dirWorld = new Vector3(DirHelper.Dx(dir), -DirHelper.Dy(dir), 0f);
            if (dirWorld.sqrMagnitude < 0.01f) return;
            dirWorld.Normalize();

            Fx fx = Rent();
            fx.Age = 0f;
            fx.Life = life;
            fx.Scale = scale;
            fx.Active = true;

            fx.Go.transform.position = t.position + dirWorld * (_projection.TileW * distanceTiles);
            float angle = Mathf.Atan2(dirWorld.y, dirWorld.x) * Mathf.Rad2Deg;
            fx.Go.transform.localRotation = Quaternion.Euler(0f, 0f, angle);
            fx.Go.transform.localScale = new Vector3(scale, scale, 1f);
            fx.Renderer.enabled = true;
            fx.Renderer.sprite = _slash != null ? _slash : (_slash = PlaceholderArt.Slash(SlashWidthPx, SlashHeightPx, 32f));
            fx.Renderer.color = Color.white;
        }

        private Fx Rent()
        {
            for (int i = 0; i < _pool.Count; i++)
                if (!_pool[i].Active) return _pool[i];

            Fx created = new Fx();
            created.Go = new GameObject("fx_slash");
            created.Go.transform.SetParent(_root, false);
            created.Renderer = created.Go.AddComponent<SpriteRenderer>();
            created.Renderer.sortingOrder = 30000;   // 永远盖在角色上面
            created.Renderer.enabled = false;
            _pool.Add(created);
            return created;
        }

        public int ActiveCount
        {
            get
            {
                int n = 0;
                for (int i = 0; i < _pool.Count; i++) if (_pool[i].Active) n++;
                return n;
            }
        }

        /// <summary>换图时关掉所有活跃特效 —— 它们停在上一张图的世界坐标上。</summary>
        public void Clear()
        {
            for (int i = 0; i < _pool.Count; i++)
            {
                if (!_pool[i].Active) continue;
                _pool[i].Active = false;
                _pool[i].Renderer.enabled = false;
            }
        }

        public void Tick(float dt)
        {
            for (int i = 0; i < _pool.Count; i++)
            {
                Fx fx = _pool[i];
                if (!fx.Active) continue;

                fx.Age += dt;
                if (fx.Age >= fx.Life)
                {
                    fx.Active = false;
                    fx.Renderer.enabled = false;
                    continue;
                }

                float k = fx.Age / fx.Life;
                float scale = fx.Scale * (1f + k * 0.6f);
                fx.Go.transform.localScale = new Vector3(scale, scale, 1f);

                Color c = fx.Renderer.color;
                c.a = 1f - k;
                fx.Renderer.color = c;
            }
        }
    }
}
