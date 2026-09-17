using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 键盘 -> Intent。M1 只做移动，不做鼠标点地/点击攻击。
    /// 这里刻意先用旧 Input（零配置）。如果项目里 Active Input Handling 只开了新输入，
    /// 会打一条明确的警告，而不是崩掉。
    /// </summary>
    public sealed class PlayerInputSource
    {
        public bool Enabled = true;
        private bool _warned;

        public bool TryReadMove(out Dir dir)
        {
            dir = Dir.Down;
            if (!Enabled) return false;

#if ENABLE_LEGACY_INPUT_MANAGER
            float x = 0f;
            float y = 0f;
            if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) x -= 1f;
            if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) x += 1f;
            if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) y += 1f;
            if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) y -= 1f;

            if (x == 0f && y == 0f) return false;
            dir = DirHelper.FromWorldVector(x, y);
            return true;
#else
            if (!_warned)
            {
                _warned = true;
                Debug.LogWarning("[SimplyCQ] 当前 Active Input Handling 未启用旧输入，键盘读不到。" +
                                 "请到 Project Settings > Player > Other Settings 改成 Both 或 Input Manager (Old)。");
            }
            return false;
#endif
        }

        /// <summary>
        /// 攻击是「按下的那一瞬间」，而逻辑是 10Hz —— 必须在每帧采样（见 GameBootstrap），
        /// 不能在 tick 里采样，否则 60fps 下大部分按键会被丢掉。
        /// </summary>
        public bool TryReadAttack(Dir currentFacing, out Dir dir)
        {
            dir = currentFacing;
            if (!Enabled) return false;

#if ENABLE_LEGACY_INPUT_MANAGER
            bool pressed = Input.GetKeyDown(KeyCode.Space)
                        || Input.GetKeyDown(KeyCode.J)
                        || Input.GetMouseButtonDown(0);
            if (!pressed) return false;

            Dir move;
            if (TryReadMove(out move)) dir = move;   // 按着方向键打，就往那个方向打
            return true;
#else
            return false;
#endif
        }

        private Vector3 _lastMouse = new Vector3(-9999f, -9999f, 0f);

        /// <summary>Esc 退出。</summary>
        public bool ReadQuit()
        {
            if (!Enabled) return false;
#if ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetKeyDown(KeyCode.Escape);
#else
            return false;
#endif
        }

        /// <summary>
        /// 最近有没有收到任何输入（按键 / 鼠标键 / 鼠标移动）。
        /// 用来在屏幕上直接告诉玩家"窗口拿到焦点了没有" —— 没焦点的话所有操作都会像坏了一样。
        /// </summary>
        public bool TryReadActivity(out string what)
        {
            what = null;
            if (!Enabled) return false;
#if ENABLE_LEGACY_INPUT_MANAGER
            if (Input.anyKey) { what = "按键/鼠标键"; return true; }

            Vector3 m = Input.mousePosition;
            if (m.x != _lastMouse.x || m.y != _lastMouse.y)
            {
                _lastMouse = m;
                what = "鼠标移动";
                return true;
            }
            return false;
#else
            return false;
#endif
        }

        /// <summary>E：开关商店。</summary>
        public bool ReadShopToggle()
        {
            if (!Enabled) return false;
#if ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetKeyDown(KeyCode.E);
#else
            return false;
#endif
        }

        /// <summary>0 = 没按，1 = F5 存档，2 = F9 读档。</summary>
        public int ReadSaveLoad()
        {
            if (!Enabled) return 0;
#if ENABLE_LEGACY_INPUT_MANAGER
            if (Input.GetKeyDown(KeyCode.F5)) return 1;
            if (Input.GetKeyDown(KeyCode.F9)) return 2;
#endif
            return 0;
        }

        /// <summary>面板开关：1 = 背包，2 = 角色，0 = 没按。同样是"按下瞬间"，要按帧采样。</summary>
        public int ReadPanelToggle()
        {
            if (!Enabled) return 0;
#if ENABLE_LEGACY_INPUT_MANAGER
            if (Input.GetKeyDown(KeyCode.I) || Input.GetKeyDown(KeyCode.B)) return 1;
            if (Input.GetKeyDown(KeyCode.C)) return 2;
#endif
            return 0;
        }
    }
}
