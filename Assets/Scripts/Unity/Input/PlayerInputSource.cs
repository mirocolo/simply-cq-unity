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
    }
}
