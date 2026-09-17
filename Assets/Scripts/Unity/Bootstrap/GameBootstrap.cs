using System.Collections.Generic;
using SimplyCQ.Data;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// M0+M1 的组装器：读数据 -> 建 World -> 建视图 -> 跑固定 tick 逻辑循环。
    /// 场景里只需要一个挂着它的 GameObject（菜单 SimplyCQ > 搭建 M1 场景 会自动建好）。
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
        private CameraRig _cameraRig;
        private PlayerInputSource _input;
        private Camera _camera;

        private readonly List<Intent> _intents = new List<Intent>();
        private float _accumulator;
        private float _tickDuration;
        private float _fps;
        private float _secondTimer;
        private int _ticksThisSecond;
        private int _ticksPerSecondDisplay;
        private int _tickRate;

        public World World { get { return _simulation != null ? _simulation.World : null; } }

        private void Awake()
        {
            Application.targetFrameRate = 60;

            _database = GameDatabase.LoadFromStreamingAssets(MapFile, MonsterFile, BalanceFile);
            BalanceDto balance = _database.Balance;

            _tickRate = balance.tickPerSecond;
            _tickDuration = 1f / _tickRate;

            _simulation = new Simulation(_database.Map, (uint)balance.worldSeed, _database.CreateMonster);

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

            _cameraRig = new CameraRig(_camera, _entityViews.GetTransform(player.Id),
                _projection.MapWorldRect(_database.Map.Width, _database.Map.Height), balance.cameraSmoothTime);

            _input = new PlayerInputSource();

            if (LogDataSummary)
            {
                Debug.Log(string.Format(
                    "[SimplyCQ] 地图「{0}」{1}x{2}  怪物种类 {3}  刷怪区 {4}  传送点 {5}  tick {6}Hz",
                    _database.Map.Name, _database.Map.Width, _database.Map.Height,
                    _database.MonsterKindCount, _database.Map.Spawners.Count, _database.Map.Portals.Count, _tickRate));
            }
        }

        private void Update()
        {
            if (_simulation == null) return;

            float dt = Time.deltaTime;
            float instantFps = 1f / Mathf.Max(dt, 1e-4f);
            _fps = _fps <= 0f ? instantFps : Mathf.Lerp(_fps, instantFps, 0.1f);

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
            if (player == null) return;

            _intents.Clear();
            Dir dir;
            if (_input.TryReadMove(out dir)) _intents.Add(Intent.Move(player.Id, dir));
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
            if (!ShowDebugOverlay || _simulation == null) return;

            World world = _simulation.World;
            GUIStyle style = new GUIStyle(GUI.skin.label);
            style.fontSize = 14;
            style.normal.textColor = Color.white;

            string line1 = string.Format("tick {0}   逻辑 {1}/s   FPS {2:0}   实体 {3}（视图 {4}）  可见格 {5}  池 {6}",
                world.Tick, _ticksPerSecondDisplay, _fps, world.EntityCount,
                _entityViews.ViewCount, _tilePool.VisibleCount, _tilePool.PooledCount);

            string line2 = world.Player != null
                ? string.Format("玩家 {0}  HP {1}/{2}  朝向 {3}  位置 {4}",
                    world.Player.Name, world.Player.Hp, world.Player.MaxHp, world.Player.Facing, world.Player.Pos)
                : "玩家 -";

            const string line3 = "WASD / 方向键 走路（M1 只有走路 + 怪物 AI，战斗在 M2）";

            GUI.Label(new Rect(10f, 8f, 1000f, 22f), line1, style);
            GUI.Label(new Rect(10f, 28f, 1000f, 22f), line2, style);
            GUI.Label(new Rect(10f, 48f, 1000f, 22f), line3, style);
        }
    }
}
