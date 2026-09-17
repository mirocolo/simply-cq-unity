using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace SimplyCQ.EditorTools
{
    /// <summary>
    /// 「我到底该点哪儿」的一键入口。
    /// 打开工程后 Scene 视图里只有一个相机和一个空物体是正常的 ——
    /// 地图、怪、玩家全是 Play 之后运行时生成的，所以必须真的进 Play 才看得到东西。
    /// </summary>
    public static class QuickStart
    {
        private const string ScenePath = "Assets/Scenes/GameM1.unity";

        [MenuItem("SimplyCQ/▶ 一键开始（打开场景并 Play）", false, 0)]
        public static void PlayNow()
        {
            if (!File.Exists(ScenePath))
            {
                Debug.Log("[SimplyCQ] 场景不存在，先自动生成一个。");
                SceneSetup.CreateM1Scene();
            }

            if (SceneManager.GetActiveScene().path != ScenePath)
            {
                EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            }

            EditorApplication.isPlaying = true;
            Debug.Log("[SimplyCQ] 已进入 Play。Game 视图里应该能看到：绿色草原 + 红色玩家 + 会追你的狼。");
        }

        [MenuItem("SimplyCQ/ℹ 操作说明", false, 1)]
        public static void ShowHelp()
        {
            Debug.Log(
                "[SimplyCQ] 操作：WASD / 方向键 走路（8 方向，一格一格）。\n" +
                "[SimplyCQ] 界面：左上角是调试信息（tick / FPS / 实体数 / 可见格数）。\n" +
                "[SimplyCQ] 场景视图里只有相机和一个空物体是正常的 —— 世界是运行时按 JSON 数据生成的。\n" +
                "[SimplyCQ] 战斗还没做（M2），现在只有走路 + 怪物 AI。");
        }
    }
}
