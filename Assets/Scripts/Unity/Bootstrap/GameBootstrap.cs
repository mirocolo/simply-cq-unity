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
        private LootLabelOverlay _lootLabels;
        private CombatFxPool _fxPool;
        private SkillBarUi _skillBar;
        private CameraRig _cameraRig;
        private PlayerInputSource _input;
        private InventoryUi _inventoryUi;
        private ShopUi _shopUi;
        private TeleportUi _teleportUi;
        private AudioDirector _audio;
        /// <summary>上一帧开着的面板数，用来在"开/关面板"的那一刻各响一声。</summary>
        private int _openPanels;
        private Camera _camera;

        private GUIStyle _hudStyle;
        private GUIStyle _debugStyle;
        private GUIStyle _warnStyle;

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
        private bool _attackHeld;
        private int _skillQueued = -1;

        // 输入诊断：窗口没拿到焦点时，所有操作都会像坏了一样
        private float _lastActivityAt = -1f;
        private string _lastActivity = "";

        // 调试：命令行 -autoshot <秒> -> 到时截整屏（含 IMGUI）再退出
        private float _autoShotAt = -1f;
        private bool _autoShotDone;
        private float _quitAt = -1f;

        // 调试：命令行 -selftest <秒> -> 在真实运行的游戏里跑一遍战斗/拾取/穿装
        private float _selfTestAt = -1f;
        private bool _selfTestDone;

        // 调试：命令行 -demoloot <秒> -> 在玩家旁边撒几件掉落物（验证地面名字显示）
        private float _demoLootAt = -1f;
        private bool _demoLootDone;

        // 调试：命令行 -demoshop <秒> -> 站到商人旁边并打开商店面板（验证界面）
        private float _demoShopAt = -1f;
        private bool _demoShopDone;

        public World World { get { return _simulation != null ? _simulation.World : null; } }

        private void Awake()
        {
            Application.targetFrameRate = 60;

            _database = GameDatabase.LoadFromStreamingAssets(MapFile, MonsterFile, BalanceFile);
            BalanceDto balance = _database.Balance;

            _tickRate = balance.tickPerSecond;
            _tickDuration = 1f / _tickRate;

            _simulation = _database.CreateSimulation((uint)balance.worldSeed);

            Entity player = _database.CreatePlayer();
            player.Pos = _simulation.World.Map.Spawn;
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

            _tilePool = new TileViewPool(groundRoot, _simulation.World.Map, _projection,
                balance.tileWidthPx, balance.tileHeightPx, balance.pixelsPerUnit);

            _entityViews = new EntityViewRegistry(entityRoot, _projection, _simulation.World,
                balance.characterWidthPx, balance.characterHeightPx, balance.pixelsPerUnit, _tickRate);

            _floatingText = new FloatingTextOverlay(_entityViews, _camera, _simulation.World, _database.Items);
            _lootLabels = new LootLabelOverlay(_simulation.World, _entityViews, _database.Items, _camera);
            _fxPool = new CombatFxPool(entityRoot, _projection, _simulation.World, _entityViews);
            _skillBar = new SkillBarUi();
            _skillBar.TickRate = _tickRate;

            _cameraRig = new CameraRig(_camera, _entityViews.GetTransform(player.Id),
                _projection.MapWorldRect(_simulation.World.Map.Width, _simulation.World.Map.Height),
                balance.cameraSmoothTime);

            if (_database.Items == null || _database.Items.Count == 0)
                Debug.LogError("[SimplyCQ] items.json 一件物品都没读到 —— 捡东西和穿装备都会失效！");

            // 换图（走到传送点 / 跨图读档）统一走这个事件，见 OnMapChanged。
            // 订阅必须排在「放 NPC」和「读档」之前 —— 跨图读档会触发换图，
            // 那条路径也要能重新绑地表、重算相机边界、补新图的 NPC。
            _simulation.Bus.Subscribe<MapChanged>(OnMapChanged);

            _database.SpawnNpcs(_simulation.World);
            if (SaveService.HasSave())
            {
                SaveData saved = SaveService.Load(SaveService.DefaultPath);
                if (saved != null && SaveService.Apply(saved, _simulation.World, _database.Items, _database))
                    Debug.Log("[SimplyCQ] 已读取存档（" + saved.SavedAt + "）" + saved.MapId
                        + " Lv" + saved.Level + " 金币 " + saved.Gold);
            }

            // 读档可能把人挪到很远的地方（甚至换图），相机直接咬合过去，别飞
            _cameraRig.Snap();

            _input = new PlayerInputSource();
            _inventoryUi = new InventoryUi(_simulation.World, _database.Items, _database.Shop);
            _inventoryUi.TickRate = _tickRate;   // 必须在这之后赋值，否则 Awake 直接 NRE
            _shopUi = new ShopUi(_simulation.World, _database.Items, _database.Shop);
            _teleportUi = new TeleportUi(_simulation.World, _database);
            _audio = new AudioDirector(_simulation.World, _projection, _camera);

            ParseCommandLine();

#if ENABLE_LEGACY_INPUT_MANAGER
            Debug.Log("[SimplyCQ] 输入：旧输入（Input Manager）已编入本次构建 ✓  窗口焦点=" + Application.isFocused);
#else
            Debug.LogError("[SimplyCQ] 输入：旧输入【没有】编进本次构建 —— 键盘和鼠标都会完全没反应！" +
                           "请把 Project Settings > Player > Other Settings 的 Active Input Handling 改成 Both 后重新打包。");
#endif

            if (LogDataSummary)
            {
                CombatTuning t = _database.Tuning;
                Debug.Log(string.Format(
                    "[SimplyCQ] 起始地图「{0}」{1}x{2}  共 {3} 张图  怪物 {4} 种  刷怪区 {5}  tick {6}Hz  攻击间隔 {7} tick  升级曲线 {8}*Lv^{9}",
                    _simulation.World.Map.Name, _simulation.World.Map.Width, _simulation.World.Map.Height,
                    _database.MapCount, _database.MonsterKindCount, _simulation.World.Map.Spawners.Count, _tickRate,
                    t.PlayerAttackInterval, t.ExpCurveBase, t.ExpCurvePow));
            }
        }

        /// <summary>
        /// 换图后的表现层收尾。走到传送点、跨图读档都会走到这里。
        ///
        /// 实体视图不用管：旧图的怪/NPC/掉落物在 World.ChangeMap 里被 Despawn，
        /// EntityViewRegistry 收到 EntityRemoved 会自己销毁；新图的实体 Spawn 时也会自己建视图。
        /// 玩家视图不会被销毁，所以相机手里的 target Transform 一直有效。
        /// </summary>
        private void OnMapChanged(MapChanged evt)
        {
            World world = _simulation.World;

            _tilePool.Rebind(world.Map);
            _cameraRig.SetBounds(_projection.MapWorldRect(world.Map.Width, world.Map.Height));
            _cameraRig.Snap();

            _floatingText.Clear();
            _fxPool.Clear();

            // 上一张图的 NPC 已经被 ChangeMap 清掉，这里补新图的
            _database.SpawnNpcs(world);

            Debug.Log("[SimplyCQ] 换图：" + evt.FromMapId + " -> " + evt.ToMapId
                + "（" + world.Map.Name + " " + world.Map.Width + "x" + world.Map.Height + "）");
        }

        private void Update()
        {
            if (_simulation == null) return;

            UiScale.Refresh();

            float dt = Time.deltaTime;
            float instantFps = 1f / Mathf.Max(dt, 1e-4f);
            _fps = _fps <= 0f ? instantFps : Mathf.Lerp(_fps, instantFps, 0.1f);

            // 输入按帧采样：GetKeyDown 只在一帧为真，塞进 10Hz 的 tick 循环里大部分都会被丢掉
            Entity player = _simulation.World.Player;

            if (_input.ReadQuit()) QuitGame();

            string activity;
            if (_input.TryReadActivity(out activity))
            {
                _lastActivityAt = Time.timeSinceLevelLoad;
                _lastActivity = activity;
            }

            UpdateAutoShot();

            if (_selfTestAt > 0f && !_selfTestDone && Time.timeSinceLevelLoad >= _selfTestAt)
            {
                _selfTestDone = true;
                RunSelfTest();
            }

            if (_demoLootAt > 0f && !_demoLootDone && Time.timeSinceLevelLoad >= _demoLootAt)
            {
                _demoLootDone = true;
                SpawnDemoLoot();
            }

            if (_demoShopAt > 0f && !_demoShopDone && Time.timeSinceLevelLoad >= _demoShopAt)
            {
                _demoShopDone = true;
                PrepareDemoShop();
            }

            if (_input.ReadInteractKey()) ToggleNpcPanel();

            int audioKey = _input.ReadAudioToggle();
            if (audioKey == 1) Debug.Log("[SimplyCQ] 音效：" + (_audio.ToggleMute() ? "已静音" : "已打开"));
            else if (audioKey == 2) Debug.Log("[SimplyCQ] 音效音量 " + Mathf.RoundToInt(_audio.AdjustVolume(-0.1f) * 100f) + "%");
            else if (audioKey == 3) Debug.Log("[SimplyCQ] 音效音量 " + Mathf.RoundToInt(_audio.AdjustVolume(0.1f) * 100f) + "%");

            int saveLoad = _input.ReadSaveLoad();
            if (saveLoad == 1) SaveService.Save(_simulation.World, _database.Balance.worldSeed, SaveService.DefaultPath);
            else if (saveLoad == 2)
            {
                SaveData loaded = SaveService.Load(SaveService.DefaultPath);
                if (loaded != null && SaveService.Apply(loaded, _simulation.World, _database.Items, _database))
                    Debug.Log("[SimplyCQ] 读档成功 Lv" + loaded.Level);
            }

            int toggle = _input.ReadPanelToggle();
            if (toggle == 1)
            {
                _inventoryUi.ToggleBag();
                Debug.Log("[SimplyCQ] 收到按键：背包 = " + _inventoryUi.BagOpen);
            }
            else if (toggle == 2)
            {
                _inventoryUi.ToggleChar();
                Debug.Log("[SimplyCQ] 收到按键：角色面板 = " + _inventoryUi.CharOpen);
            }

            // 鼠标在面板上时，左键是"点物品"而不是"挥砍"
            Dir attackDir;
            if (player != null && !AnyPanelConsumesMouse()
                && _input.TryReadAttack(player.Facing, out attackDir))
            {
                _attackQueued = true;
                _attackDir = attackDir;
            }

            // 按住空格/左键 = 持续普攻，由攻击间隔节流（这样攻速才有感觉）
            _attackHeld = player != null && !AnyPanelConsumesMouse() && _input.IsAttackHeld();
            if (_attackHeld) _attackDir = player.Facing;

            int skillSlot = _input.ReadSkillSlot();
            if (skillSlot >= 0) _skillQueued = skillSlot;

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
            _fxPool.Tick(dt);
            _floatingText.Tick(dt);
            _audio.Tick(dt);
            PlayPanelSound();

            _secondTimer += dt;
            if (_secondTimer >= 1f)
            {
                _ticksPerSecondDisplay = _ticksThisSecond;
                _ticksThisSecond = 0;
                _secondTimer = 0f;
            }
        }

        private void ParseCommandLine()
        {
            string[] args = System.Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
            {
                float seconds;
                if (args[i] == "-autoshot" && float.TryParse(args[i + 1], out seconds)) _autoShotAt = seconds;
                if (args[i] == "-selftest" && float.TryParse(args[i + 1], out seconds)) _selfTestAt = seconds;
                if (args[i] == "-demoloot" && float.TryParse(args[i + 1], out seconds)) _demoLootAt = seconds;
                if (args[i] == "-demoshop" && float.TryParse(args[i + 1], out seconds)) _demoShopAt = seconds;
            }
        }

        private void UpdateAutoShot()
        {
            float now = Time.timeSinceLevelLoad;

            if (_autoShotAt > 0f && !_autoShotDone && now >= _autoShotAt)
            {
                _autoShotDone = true;

                // 把关键数字打进日志：出问题时不用猜
                Transform pv = _simulation.World.Player != null
                    ? _entityViews.GetTransform(_simulation.World.Player.Id) : null;
                Vector3 pw = pv != null ? pv.position : Vector3.zero;
                Vector3 ps = _camera != null ? _camera.WorldToScreenPoint(pw) : Vector3.zero;
                Debug.Log(string.Format(
                    "[SimplyCQ] 诊断 Screen={0}x{1} aspect={2:0.000} UI缩放={3:0.0} cam={4} ortho={5:0.00} 玩家世界={6} 玩家屏幕={7} 可见格={8} 视图={9}",
                    Screen.width, Screen.height, _camera != null ? _camera.aspect : -1f, UiScale.Scale,
                    _camera != null ? _camera.transform.position : Vector3.zero,
                    _camera != null ? _camera.orthographicSize : -1f,
                    pw, ps, _tilePool.VisibleCount, _entityViews.ViewCount));

                string file = System.IO.Path.Combine(Application.persistentDataPath, "shot.png");
                ScreenCapture.CaptureScreenshot(file);
                Debug.Log("[SimplyCQ] 整屏截图（含 IMGUI）写入 " + file);
                _quitAt = now + 1.5f;
            }

            if (_quitAt > 0f && now >= _quitAt) Application.Quit();
        }

        /// <summary>
        /// 在"真的跑起来的游戏里"跑一遍核心操作：穿装、打怪、捡金币。
        /// 它验证的是编译进包里的这份代码 + 真实场景里的对象，而不仅仅是 Domain 逻辑。
        /// </summary>
        private void RunSelfTest()
        {
            Debug.Log("[SimplyCQ] ===== 运行时自检开始 =====");
            int fail = 0;

            World world = _simulation.World;
            Entity p = world.Player;
            if (p == null) { Debug.LogError("[SimplyCQ] 自检失败：没有玩家实体"); return; }

            // 1) 背包与穿装
            if (p.Bag == null || p.Bag.UsedSlots == 0) { fail++; Debug.LogError("[SimplyCQ] 自检失败：背包是空的"); }
            else Debug.Log("[SimplyCQ] 自检 ok：背包里有 " + p.Bag.UsedSlots + " 格东西");

            int before = p.MinDc;
            int idx = p.Bag.IndexOf("wp_wood");
            if (idx < 0) { fail++; Debug.LogError("[SimplyCQ] 自检失败：背包里找不到 wp_wood"); }
            else if (!ItemSystem.Equip(world, p, idx, _database.Items)) { fail++; Debug.LogError("[SimplyCQ] 自检失败：穿木剑失败"); }
            else if (p.MinDc <= before) { fail++; Debug.LogError("[SimplyCQ] 自检失败：穿上木剑攻击力没变"); }
            else Debug.Log("[SimplyCQ] 自检 ok：穿木剑后攻击力 " + before + " -> " + p.MinDc);

            // 2) 打怪
            Entity mon = _database.CreateMonster("mon_hen");
            if (mon == null) { fail++; Debug.LogError("[SimplyCQ] 自检失败：造不出 mon_hen"); }
            else
            {
                mon.Pos = world.FindFreeTileNear(new TilePos(p.Pos.X + 1, p.Pos.Y), 6);
                mon.HomePos = mon.Pos;
                mon.Aggressive = false;
                mon.MoveSpeed = 9999;                 // 别跑，方便断言
                world.Spawn(mon);
                p.Facing = DirHelper.FromDelta(mon.Pos.X - p.Pos.X, mon.Pos.Y - p.Pos.Y, p.Facing);

                int hpBefore = mon.Hp;
                List<Intent> acts = new List<Intent>();
                for (int i = 0; i < 40 && mon.IsAlive; i++)
                {
                    acts.Clear();
                    acts.Add(Intent.Attack(p.Id, p.Facing));
                    world.Step(acts);
                    p.AttackCooldown = 0;
                }
                if (mon.Hp >= hpBefore) { fail++; Debug.LogError("[SimplyCQ] 自检失败：攻击没有造成伤害"); }
                else Debug.Log("[SimplyCQ] 自检 ok：攻击生效，怪血量 " + hpBefore + " -> " + mon.Hp + (mon.IsAlive ? "（还活着）" : "（已击杀）"));
            }

            // 3) 捡金币
            int goldBefore = p.Gold;
            Entity coin = new Entity();
            coin.Kind = EntityKind.GroundItem;
            coin.DefId = "gold";
            coin.SpriteId = "gold";
            coin.Name = "金币";
            coin.BlocksTile = false;
            coin.Gold = 7;
            coin.Count = 7;
            coin.LifetimeTicks = 0;
            coin.Pos = p.Pos;
            coin.HomePos = p.Pos;
            world.Spawn(coin);
            world.Step(new List<Intent>());
            if (p.Gold <= goldBefore) { fail++; Debug.LogError("[SimplyCQ] 自检失败：金币没捡起来（" + goldBefore + " -> " + p.Gold + "）"); }
            else Debug.Log("[SimplyCQ] 自检 ok：捡到金币 " + goldBefore + " -> " + p.Gold);

            // 3b) 捡物品（不只是金币）—— 物品要查物品表、要过负重，是另一条路
            if (_database.Items != null && _database.Items.Get("mat_hide") != null)
            {
                Entity drop = new Entity();
                drop.Kind = EntityKind.GroundItem;
                drop.DefId = "mat_hide";
                drop.SpriteId = "mat_hide";
                drop.Name = "兽皮";
                drop.BlocksTile = false;
                drop.Count = 1;
                drop.LifetimeTicks = 0;
                drop.Pos = p.Pos;
                drop.HomePos = p.Pos;
                world.Spawn(drop);
                world.Step(new List<Intent>());

                if (p.Bag.IndexOf("mat_hide") < 0)
                {
                    fail++;
                    Debug.LogError("[SimplyCQ] 自检失败：踩到物品没捡起来（背包 "
                        + p.Bag.UsedSlots + "/" + Inventory.SlotCount + " 格）");
                }
                else
                {
                    Debug.Log("[SimplyCQ] 自检 ok：踩到物品进背包了（背包 "
                        + p.Bag.UsedSlots + "/" + Inventory.SlotCount + " 格）");
                }
            }

            // 4) 走一遍界面真正用的 Intent 通道（点背包 = 排一个 Intent 丢给 Simulation）
            int clothIdx = p.Bag.IndexOf("ar_cloth");
            if (clothIdx < 0) Debug.Log("[SimplyCQ] 自检跳过：背包里没有 ar_cloth");
            else
            {
                List<Intent> uiActs = new List<Intent>();
                uiActs.Add(Intent.BagAction(p.Id, IntentKind.EquipItem, clothIdx));
                world.Step(uiActs);
                if (p.Gear.Get(EquipSlot.Armour) == null) { fail++; Debug.LogError("[SimplyCQ] 自检失败：Intent 通道穿衣服没生效"); }
                else Debug.Log("[SimplyCQ] 自检 ok：Intent 通道穿戴生效，防御 " + p.Ac);
            }

            // 5) 战士技能：按等级自动学 + 能放出来
            if (_database.Skills != null && _database.Skills.Get("sk_slash") != null)
            {
                world.Step(new List<Intent>());   // 触发自动学

                SkillDef slash = _database.Skills.Get("sk_slash");
                if (!p.LearnedSkills.Contains("sk_slash"))
                {
                    fail++;
                    Debug.LogError("[SimplyCQ] 自检失败：1 级没学会攻杀剑术");
                }
                else
                {
                    Debug.Log("[SimplyCQ] 自检 ok：已学 " + p.LearnedSkills.Count + " 个技能，命中 +" + p.HitBonus);

                    p.Mp = p.MaxMp;
                    int mpBeforeSkill = p.Mp;
                    List<Intent> castActs = new List<Intent>();
                    castActs.Add(Intent.BagAction(p.Id, IntentKind.CastSkill, 0));
                    world.Step(castActs);

                    if (SkillSystem.CooldownLeft(p, slash.Id) <= 0)
                    {
                        fail++;
                        Debug.LogError("[SimplyCQ] 自检失败：放了技能但没进冷却");
                    }
                    else
                    {
                        Debug.Log("[SimplyCQ] 自检 ok：技能可释放，扣蓝 " + (mpBeforeSkill - p.Mp) + "，冷却 "
                            + SkillSystem.CooldownLeft(p, slash.Id) + " tick");

                        // 刀光特效：验证"事件 -> 特效池 -> 真的生成了对象"这条链路
                        if (_fxPool != null && _fxPool.ActiveCount > 0)
                            Debug.Log("[SimplyCQ] 自检 ok：技能生成了刀光特效（" + _fxPool.ActiveCount + " 个）");
                        else
                        {
                            fail++;
                            Debug.LogError("[SimplyCQ] 自检失败：技能没有产生刀光特效");
                        }
                    }
                }
            }

            Debug.Log("[SimplyCQ] ===== 运行时自检结束，失败 " + fail + " 项 =====");
        }

        /// <summary>往玩家周围放几件掉落物，用来肉眼/截图检查"地面掉落物名字"是否正常。</summary>
        private void SpawnDemoLoot()
        {
            World world = _simulation.World;
            Entity p = world.Player;
            if (p == null) return;

            string[] ids = { "wp_long", "pot_hp_m", "mat_fang", "gold" };
            int[] golds = { 0, 0, 0, 42 };

            for (int i = 0; i < ids.Length; i++)
            {
                bool up = i < 2;
                int dx = (i % 2 == 0) ? 1 : -1;
                TilePos near = new TilePos(p.Pos.X + dx, p.Pos.Y + (up ? -1 : 1));
                TilePos at = world.FindFreeGroundTileNear(near, 6);

                ItemDef def = _database.Items != null ? _database.Items.Get(ids[i]) : null;
                Entity loot = new Entity();
                loot.Kind = EntityKind.GroundItem;
                loot.DefId = ids[i];
                loot.SpriteId = def != null ? def.SpriteId : ids[i];
                loot.Name = golds[i] > 0 ? "金币" : (def != null ? def.Name : ids[i]);
                loot.BlocksTile = false;
                loot.Gold = golds[i];
                loot.Count = golds[i] > 0 ? golds[i] : 1;
                loot.LifetimeTicks = 0;
                loot.Pos = at;
                loot.HomePos = at;
                world.Spawn(loot);
            }

            Debug.Log("[SimplyCQ] 已放置 " + ids.Length + " 件演示掉落物，用来检查地面名字");
        }

        /// <summary>
        /// E 键：按【身边这个 NPC 会什么】决定开哪个面板。
        /// 传送员优先 —— 一个 NPC 两样都会时，先给传送菜单（去别处比买东西更少见）。
        /// 附近没有 NPC 时不弹任何东西（不然按 E 会莫名闪一下商店）。
        /// </summary>
        private void ToggleNpcPanel()
        {
            World world = _simulation != null ? _simulation.World : null;
            Entity p = world != null ? world.Player : null;
            if (p == null) return;

            if (TeleportSystem.NearestTeleporter(world, p) != null)
            {
                _shopUi.Close();
                _teleportUi.Toggle();
                return;
            }

            if (ShopSystem.NearestMerchant(world, p) != null)
            {
                _teleportUi.Close();
                _shopUi.Toggle();
            }
        }

        /// <summary>
        /// 面板开/关各响一声。用"开着的面板数变了"来判断，而不是在 I/C/E 三个按键处各写一次 ——
        /// 这样走远自动关商店、传送成功后自动关菜单，也会正确出声。
        /// </summary>
        private void PlayPanelSound()
        {
            int now = (_inventoryUi.BagOpen ? 1 : 0) + (_inventoryUi.CharOpen ? 1 : 0)
                    + (_shopUi.IsOpen ? 1 : 0) + (_teleportUi.IsOpen ? 1 : 0);
            if (now > _openPanels) _audio.Play(SfxId.PanelOpen);
            else if (now < _openPanels) _audio.Play(SfxId.PanelClose);
            _openPanels = now;
        }

        /// <summary>鼠标正压在某个面板上时，左键是"点面板"而不是"挥砍"。</summary>
        private bool AnyPanelConsumesMouse()
        {
            return _inventoryUi.ConsumesMouse || _shopUi.ConsumesMouse || _teleportUi.ConsumesMouse;
        }

        /// <summary>把玩家挪到商人旁边并打开商店面板，用来截图检查界面。</summary>
        private void PrepareDemoShop()
        {
            World world = _simulation.World;
            Entity p = world.Player;
            if (p == null) return;

            Entity merchant = ShopSystem.NearestMerchant(world, p);
            if (merchant == null)
            {
                foreach (Entity e in world.SnapshotEntities())
                {
                    if (e.Shop == null) continue;
                    merchant = e;
                    break;
                }
            }

            if (merchant != null)
            {
                TilePos at = world.FindFreeTileNear(new TilePos(merchant.Pos.X - 1, merchant.Pos.Y), 6);
                world.PlaceEntity(p, at);
                p.HomePos = at;
                Debug.Log("[SimplyCQ] 演示：已站到 " + merchant.Name + " @ " + merchant.Pos + " 旁边");
            }

            if (!_shopUi.IsOpen) _shopUi.Toggle();
        }

        private void QuitGame()
        {
            SaveService.Save(_simulation.World, _database.Balance.worldSeed, SaveService.DefaultPath);
            if (_audio != null) { _audio.Dispose(); _audio = null; }
            Debug.Log("[SimplyCQ] 退出（已自动存档）");
#if UNITY_EDITOR
            UnityEditor.EditorApplication.isPlaying = false;
#else
            Application.Quit();
#endif
        }

        private void StepOnce()
        {
            Entity player = _simulation.World.Player;
            _intents.Clear();

            if (player != null && player.IsAlive)
            {
                Dir moveDir;
                if (_input.TryReadMove(out moveDir)) _intents.Add(Intent.Move(player.Id, moveDir));

                if (_attackQueued || _attackHeld)
                {
                    _attackQueued = false;
                    _intents.Add(Intent.Attack(player.Id, _attackDir));
                }

                if (_skillQueued >= 0)
                {
                    _intents.Add(Intent.BagAction(player.Id, IntentKind.CastSkill, _skillQueued));
                    _skillQueued = -1;
                }
            }
            else
            {
                _attackQueued = false;
                _skillQueued = -1;
            }

            _inventoryUi.DrainInto(_intents);
            _shopUi.DrainInto(_intents);
            _teleportUi.DrainInto(_intents);
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
                _hudStyle.fontSize = UiScale.Font(14);
                _hudStyle.normal.textColor = Color.white;

                _debugStyle = new GUIStyle(GUI.skin.label);
                _debugStyle.fontSize = UiScale.Font(14);
                _debugStyle.normal.textColor = UiColor.Srgb(0.85f, 0.90f, 0.95f);

                _warnStyle = new GUIStyle(GUI.skin.label);
                _warnStyle.fontSize = UiScale.Font(14);
            }

            World world = _simulation.World;

            if (ShowDebugOverlay)
            {
                string line1 = string.Format("tick {0}   逻辑 {1}/s   FPS {2:0}   实体 {3}（视图 {4}）  可见格 {5}  地面物 {6}",
                    world.Tick, _ticksPerSecondDisplay, _fps, world.EntityCount,
                    _entityViews.ViewCount, _tilePool.VisibleCount, world.GroundItemCount);

                string line2 = world.Player != null
                    ? string.Format("玩家 {0}  朝向 {1}  位置 {2}  地图 {3}  飘字 {4}",
                        world.Player.Name, world.Player.Facing, world.Player.Pos,
                        world.Map.Name + "(" + world.Map.Id + ")", _floatingText.Count)
                    : "玩家 -";

                const string line3 = "WASD 走路 · 按住空格/左键 持续普攻 · 1~3 战士技能 · I 背包 · C 角色 · E 商店 · F5 存档 · F9 读档 · 走到传送点自动换图 · Esc 退出";

                GUI.Label(UiScale.R(10f, 8f, 1000f, 22f), line1, _debugStyle);
                GUI.Label(UiScale.R(10f, 28f, 1000f, 22f), line2, _debugStyle);
                GUI.Label(UiScale.R(10f, 48f, 1000f, 22f), line3, _debugStyle);

                // 输入 / 焦点状态放右上角，别挡住左边的面板
                Rect inputRect = new Rect(Screen.width - UiScale.Px(620f), UiScale.Px(8f), UiScale.Px(610f), UiScale.Px(22f));
                if (!Application.isFocused)
                {
                    _warnStyle.normal.textColor = UiColor.Srgb(1f, 0.45f, 0.4f);
                    GUI.Label(inputRect, "⚠ 游戏窗口没有焦点！先用鼠标点一下窗口（或 Cmd+Tab 切过来），否则键盘鼠标都不会有反应", _warnStyle);
                }
                else if (_lastActivityAt <= 0f)
                {
                    _warnStyle.normal.textColor = UiColor.Srgb(1f, 0.85f, 0.4f);
                    GUI.Label(inputRect, "窗口已有焦点，还没收到按键（WASD 走路 · 空格攻击 · I 背包 · Esc 退出）", _warnStyle);
                }
                else
                {
                    GUI.Label(inputRect, "输入正常（最近：" + _lastActivity + "）  WASD 走路 · 空格攻击 · I 背包 · Esc 退出", _debugStyle);
                }
            }

            _lootLabels.Draw();   // 地面掉落物的名字，先画再让面板盖住
            DrawHud(world);
            _inventoryUi.Draw();
            _shopUi.Draw();
            _teleportUi.Draw();
            _skillBar.Draw(world.Player, _database.Skills);
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
                UiColor.Srgb(0.16f, 0.05f, 0.05f, 0.85f),
                UiColor.Srgb(0.80f, 0.19f, 0.16f, 0.95f),
                "HP " + p.Hp + " / " + p.MaxHp);

            y += h + 4f;
            DrawBar(x, y, w, h,
                p.ExpToNextLevel > 0 ? p.Exp / (float)p.ExpToNextLevel : 0f,
                UiColor.Srgb(0.05f, 0.10f, 0.16f, 0.85f),
                UiColor.Srgb(0.25f, 0.55f, 0.90f, 0.95f),
                "EXP " + p.Exp + " / " + p.ExpToNextLevel);

            y += h + 6f;
            string status = "Lv." + p.Level + "    金币 " + p.Gold + "    攻 " + p.MinDc + "-" + p.MaxDc + "    防 " + p.Ac;
            if (!p.IsAlive) status += "    （死亡，等待复活…）";
            status += "    音效 " + _audio.StatusText + "（M 静音）";
            GUI.Label(UiScale.R(x, y, 640f, 20f), status, _hudStyle);
        }

        private void DrawBar(float x, float y, float w, float h, float percent, Color back, Color fill, string text)
        {
            float pct = Mathf.Clamp01(percent);

            GUI.color = back;
            GUI.DrawTexture(UiScale.R(x, y, w, h), Texture2D.whiteTexture);
            GUI.color = fill;
            GUI.DrawTexture(UiScale.R(x, y, w * pct, h), Texture2D.whiteTexture);
            GUI.color = Color.white;

            GUI.Label(UiScale.R(x + 6f, y, w, h), text, _hudStyle);
        }
    }
}
