using System.IO;
using SimplyCQ.Unity;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace SimplyCQ.EditorTools
{
    /// <summary>
    /// 一键把 M1 场景搭好，不用手动拖任何东西。
    /// 场景里只有两样东西：一个正交相机 + 一个挂着 GameBootstrap 的 GameObject，
    /// 其余（地图、怪、相机跟随、HUD）全是运行时按数据生成的。
    /// </summary>
    public static class SceneSetup
    {
        private const string ScenesFolder = "Assets/Scenes";
        private const string ScenePath = ScenesFolder + "/GameM1.unity";

        [MenuItem("SimplyCQ/① 搭建 M1 场景（并设为启动场景）", false, 10)]
        public static void CreateM1Scene()
        {
            if (File.Exists(ScenePath))
            {
                bool overwrite = EditorUtility.DisplayDialog(
                    "场景已存在",
                    ScenePath + " 已经存在，要覆盖它吗？",
                    "覆盖", "取消");
                if (!overwrite) return;
            }

            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            GameObject camGo = new GameObject("Main Camera");
            camGo.tag = "MainCamera";
            Camera cam = camGo.AddComponent<Camera>();
            cam.orthographic = true;
            cam.orthographicSize = 7.5f;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.04f, 0.05f, 0.07f);
            cam.transform.position = new Vector3(0f, 0f, -10f);
            camGo.AddComponent<AudioListener>();

            GameObject bootGo = new GameObject("CQ.Bootstrap");
            bootGo.AddComponent<GameBootstrap>();

            if (!Directory.Exists(ScenesFolder)) Directory.CreateDirectory(ScenesFolder);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AddToBuildSettings(ScenePath);
            AssetDatabase.Refresh();

            Debug.Log("[SimplyCQ] M1 场景已生成：" + ScenePath + "  →  直接点 Play。");
        }

        [MenuItem("SimplyCQ/② 打开 M1 场景", false, 11)]
        public static void OpenM1Scene()
        {
            if (!File.Exists(ScenePath))
            {
                Debug.LogWarning("[SimplyCQ] 还没有场景，先用菜单「① 搭建 M1 场景」。");
                return;
            }
            EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
        }

        [MenuItem("SimplyCQ/③ 打开数据文件夹（StreamingAssets）", false, 12)]
        public static void RevealDataFolder()
        {
            string path = Path.Combine(Application.streamingAssetsPath, "Data");
            if (!Directory.Exists(path)) Directory.CreateDirectory(path);
            EditorUtility.RevealInFinder(path);
        }

        private static void AddToBuildSettings(string path)
        {
            EditorBuildSettingsScene[] old = EditorBuildSettings.scenes;
            for (int i = 0; i < old.Length; i++)
            {
                if (old[i].path == path)
                {
                    old[i].enabled = true;
                    EditorBuildSettings.scenes = old;
                    return;
                }
            }
            EditorBuildSettingsScene[] next = new EditorBuildSettingsScene[old.Length + 1];
            System.Array.Copy(old, next, old.Length);
            next[old.Length] = new EditorBuildSettingsScene(path, true);
            EditorBuildSettings.scenes = next;
        }
    }
}
