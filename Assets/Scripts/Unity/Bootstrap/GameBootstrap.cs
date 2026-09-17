using System.Collections.Generic;
using SimplyCQ.Data;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 组装器：读数据 -> 建 World -> 建视图 -> 跑固定 tick 逻辑循环 -> 画 HUD。
    /// 场景里只需要一个挂着它的 GameObject（菜单 SimplyCQ > 一键开始 会自动准备好）。
    /// </summary>
    public sealed class GameBootstrap : MonoBehaviour
    {
        [Header("数据文件（相对 StreamingAssets，不要带 Assets/StreamingAssets 前缀）")]
        public string MapFile = "Data/maps/map_grassland.json";
        public string MonsterFile = "Data/monsters.json";
        public string BalanceFile = "Data/balance.json";

        [Header("调试")]
        public bool ShowDebugOverlay = true;
        public bool LogDataSummary = true;

        private GameDatabase _database;
        private Simulation _simulation;
        private Projection _projection;
        private TileViewPool _tilePool;
        private EntityViewRegistry _entityViews;
        private FloatingTextOverlay _floatingText;
        private CameraRig _cameraRig;
        private PlayerInputSource _input;
        private Camera _camera;

        private GUIStyle _hudStyle;
        private GUIStyle _debugStyle;

        private readonly List<Intent> _intents = new List<Intent>();
        private float _accumulator;
        private float _tickDuration;
        private float _fps;
        private float _secondTimer;
        private int _ticksThisSecond;
        private int _ticksPerSecondDisplay;
        private int _tickRate;

        // 攻击是「按下的那一瞬间」，必须先按帧 latch 住，等 tick 再消费
        private bool _attackQueued;
        private Dir _attackDir;

        public World World { get { return _simulation != null ? _simulation.World : null; } }

        private void Awake()
        {
            Application.targetFrameRate = 60;

            _database = GameDatabase.LoadFromStreamingAssets(MapFile, MonsterFile, BalanceFile);
            BalanceDto balance = _database.Balance;

            _tickRate = balance.tickPerSecond;
            _tickDuration = 1f / _tickRate;

            _simulation = new Simulation(_database.Map, (uint)balance.worldSeed, _database.CreateMonster, _database.Tuning);

            Entity player = _database.CreatePlayer();
            player.Pos = _database.Map.Spawn;
            player.HomePos = player.Pos;
            _simulation.World.Spawn(player);
            _simulation.World.Player = player;

            _projection = new Projection(
                balance.tileWidthPx / (float)balance.pixelsPerUnit,
                balance.tileHeightPx / (float)balance.pixelsPerUnit);

            _camera = Camera.main;
            if (_camera == null)
            {
                GameObject camGo = new GameObject("Main Camera");
                camGo.tag = "MainCamera";
                _camera = camGo.AddComponent<Camera>();
                camGo.AddComponent<AudioListener>();
            }
            _camera.orthographic = true;
            _camera.orthographicSize = balance.visibleTilesVertically * _projection.TileH * 0.5f;
            _camera.clearFlags = CameraClearFlags.SolidColor;
            _camera.backgroundColor = new Color(0.04f, 0.05f, 0.07f);
            Vector3 startCenter = _projection.TileCenter(player.Pos);
            _camera.transform.position = new Vector3(startCenter.x, startCenter.y, -10f);

            Transform groundRoot = new GameObject("Ground").transform;
            groundRoot.SetParent(transform, false);
            Transform entityRoot = new GameObject("Entities").transform;
            entityRoot.SetParent(transform, false);

            _tilePool = new TileViewPool(groundRoot, _database.Map, _projection,
                balance.tileWidthPx, balance.tileHeightPx, balance.pixelsPerUnit);

            _entityViews = new EntityViewRegistry(entityRoot, _projection, _simulation.World,
                balance.characterWidthPx, balance.characterHeightPx, balance.pixelsPerUnit, _tickRate);

            _floatingText = new FloatingTextOverlay(_entityViews, _camera, _simulation.World);

            _cameraRig = new CameraRig(_camera, _entityViews.GetTransform(player.Id),
                _projection.MapWorldRect(_database.Map.Width, _database.Map.Height), balance.cameraSmoothTime);

            _input = new PlayerInputSource();

            if (LogDataSummary)
            {
                CombatTuning t = _database.Tuning;
                Debug.Log(string.Format(
                    "[SimplyCQ] 地图「{0}」{1}x{2}  怪物 {3} 种  刷怪区 {4}  tick {5}Hz  攻击间隔 {6} tick  升级曲线 {7}*Lv^{8}",
                    _database.Map.Name, _database.Map.Width, _database.Map.Height,
                    _database.MonsterKindCount, _database.Map.Spawners.Count, _tickRate,
                    t.PlayerAttackInterval, t.ExpCurveBase, t.ExpCurvePow));
            }
        }

        private void Update()
        {
            if (_simulation == null) return;

            float dt = Time.deltaTime;
            float instantFps = 1f / Mathf.Max(dt, 1e-4f);
            _fps = _fps <= 0f ? instantFps : Mathf.Lerp(_fps, instantFps, 0.1f);

            // 输入按帧采样：GetKeyDown 只在一帧为真，塞进 10Hz 的 tick 循环里大部分都会被丢掉
            Entity player = _simulation.World.Player;
            Dir attackDir;
            if (player != null && _input.TryReadAttack(player.Facing, out attackDir))
            {
                _attackQueued = true;
                _attackDir = attackDir;
            }

            _accumulator += dt;
            float maxBacklog = _tickDuration * 5f;
            if (_accumulator > maxBacklog) _accumulator = maxBacklog;

            int guard = 0;
            while (_accumulator >= _tickDuration && guard < 8)
            {
                _accumulator -= _tickDuration;
                guard++;
                StepOnce();
                _ticksThisSecond++;
            }

            _entityViews.Tick(dt);
            _floatingText.Tick(dt);

            _secondTimer += dt;
            if (_secondTimer >= 1f)
            {
                _ticksPerSecondDisplay = _ticksThisSecond;
                _ticksThisSecond = 0;
                _secondTimer = 0f;
            }
        }

        private void StepOnce()
        {
            Entity player = _simulation.World.Player;
            _intents.Clear();

            if (player != null && player.IsAlive)
            {
                Dir moveDir;
                if (_input.TryReadMove(out moveDir)) _intents.Add(Intent.Move(player.Id, moveDir));

                if (_attackQueued)
                {
                    _attackQueued = false;
                    _intents.Add(Intent.Attack(player.Id, _attackDir));
                }
            }
            else
            {
                _attackQueued = false;
            }

            _simulation.Step(_intents);
        }

        private void LateUpdate()
        {
            if (_simulation == null || _camera == null) return;

            _cameraRig.Update(Time.deltaTime);

            float halfHeight = _camera.orthographicSize;
            float halfWidth = halfHeight * _camera.aspect;
            _tilePool.Refresh(_camera.transform.position, halfWidth, halfHeight);
        }

        private void OnGUI()
        {
            if (_simulation == null) return;

            if (_hudStyle == null)
            {
                _hudStyle = new GUIStyle(GUI.skin.label);
                _hudStyle.fontSize = 14;
                _hudStyle.normal.textColor = Color.white;

                _debugStyle = new GUIStyle(GUI.skin.label);
                _debugStyle.fontSize = 14;
                _debugStyle.normal.textColor = new Color(0.85f, 0.90f, 0.95f);
            }

            World world = _simulation.World;

            if (ShowDebugOverlay)
            {
                string line1 = string.Format("tick {0}   逻辑 {1}/s   FPS {2:0}   实体 {3}（视图 {4}）  可见格 {5}  地面物 {6}",
                    world.Tick, _ticksPerSecondDisplay, _fps, world.EntityCount,
                    _entityViews.ViewCount, _tilePool.VisibleCount, world.GroundItemCount);

                string line2 = world.Player != null
                    ? string.Format("玩家 {0}  朝向 {1}  位置 {2}  飘字 {3}",
                        world.Player.Name, world.Player.Facing, world.Player.Pos, _floatingText.Count)
                    : "玩家 -";

                const string line3 = "WASD / 方向键 走路 · 空格 / J / 鼠标左键 攻击（M2 战斗）";

                GUI.Label(new Rect(10f, 8f, 1000f, 22f), line1, _debugStyle);
                GUI.Label(new Rect(10f, 28f, 1000f, 22f), line2, _debugStyle);
                GUI.Label(new Rect(10f, 48f, 1000f, 22f), line3, _debugStyle);
            }

            DrawHud(world);
            _floatingText.Draw();
        }

        private void DrawHud(World world)
        {
            Entity p = world.Player;
            if (p == null) return;

            const float x = 10f;
            const float w = 240f;
            const float h = 18f;
            float y = 78f;

            DrawBar(x, y, w, h,
                p.MaxHp > 0 ? p.Hp / (float)p.MaxHp : 0f,
                new Color(0.16f, 0.05f, 0.05f, 0.85f),
                new Color(0.80f, 0.19f, 0.16f, 0.95f),
                "HP " + p.Hp + " / " + p.MaxHp);

            y += h + 4f;
            DrawBar(x, y, w, h,
                p.ExpToNextLevel > 0 ? p.Exp / (float)p.ExpToNextLevel : 0f,
                new Color(0.05f, 0.10f, 0.16f, 0.85f),
                new Color(0.25f, 0.55f, 0.90f, 0.95f),
                "EXP " + p.Exp + " / " + p.ExpToNextLevel);

            y += h + 6f;
            string status = "Lv." + p.Level + "    金币 " + p.Gold + "    攻 " + p.MinDc + "-" + p.MaxDc + "    防 " + p.Ac;
            if (!p.IsAlive) status += "    （死亡，等待复活…）";
            GUI.Label(new Rect(x, y, 520f, 20f), status, _hudStyle);
        }

        private void DrawBar(float x, float y, float w, float h, float percent, Color back, Color fill, string text)
        {
            float pct = Mathf.Clamp01(percent);

            GUI.color = back;
            GUI.DrawTexture(new Rect(x, y, w, h), Texture2D.whiteTexture);
            GUI.color = fill;
            GUI.DrawTexture(new Rect(x, y, w * pct, h), Texture2D.whiteTexture);
            GUI.color = Color.white;

            GUI.Label(new Rect(x + 6f, y, w, h), text, _hudStyle);
        }
    }
}
