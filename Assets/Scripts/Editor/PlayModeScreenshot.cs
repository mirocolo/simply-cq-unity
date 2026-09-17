using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace SimplyCQ.EditorTools
{
    /// <summary>
    /// 批处理下真的进一次 Play 模式并截一张图 —— 用来验证「画面真的出来了」，
    /// 而不只是「编译过了」。
    ///
    /// 用法（注意不要加 -quit，脚本自己会 Exit）：
    ///   Unity -batchmode -projectPath . \
    ///         -executeMethod SimplyCQ.EditorTools.PlayModeScreenshot.Begin
    ///
    /// 为什么用 SessionState：进入 Play 模式会触发程序集重载，普通静态变量会被清掉，
    /// SessionState 是 Unity 专门给这种「跨重载传状态」用的。
    /// </summary>
    public static class PlayModeScreenshot
    {
        private const string PendingKey = "SimplyCQ.ScreenshotPending";
        private const string OutputFile = "LocalTools/screenshot.png";
        private const int WarmupFrames = 120;     // 等世界建好、怪走两步
        private const int MaxFrames = 3000;       // 兜底，别把批处理挂死

        private static int _frames;

        private const string ScenePath = "Assets/Scenes/GameM1.unity";

        public static void Begin()
        {
            // 批处理启动时 Unity 打开的是空场景，得先把我们的场景装上，否则连 Main Camera 都没有
            if (!File.Exists(ScenePath))
            {
                SceneSetup.CreateM1Scene();
            }
            else if (SceneManager.GetActiveScene().path != ScenePath)
            {
                EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            }

            SessionState.SetBool(PendingKey, true);
            Hook();
            EditorApplication.isPlaying = true;
        }

        [InitializeOnLoadMethod]
        private static void OnLoad()
        {
            if (SessionState.GetBool(PendingKey, false)) Hook();
        }

        private static void Hook()
        {
            _frames = 0;
            EditorApplication.update -= Tick;
            EditorApplication.update += Tick;
        }

        private static void Tick()
        {
            if (!SessionState.GetBool(PendingKey, false))
            {
                EditorApplication.update -= Tick;
                return;
            }
            if (!EditorApplication.isPlaying) return;

            _frames++;
            if (_frames < WarmupFrames)
            {
                if (_frames > MaxFrames) { EditorApplication.update -= Tick; EditorApplication.Exit(2); }
                return;
            }

            EditorApplication.update -= Tick;
            SessionState.SetBool(PendingKey, false);

            try
            {
                int bytes = Capture();
                Debug.Log("[SimplyCQ] 截图已保存 " + OutputFile + "（" + bytes + " 字节，第 " + _frames + " 帧）");
                EditorApplication.Exit(bytes > 0 ? 0 : 3);
            }
            catch (Exception ex)
            {
                Debug.LogError("[SimplyCQ] 截图失败: " + ex);
                EditorApplication.Exit(1);
            }
        }

        private static int Capture()
        {
            const int W = 1280;
            const int H = 720;

            Camera cam = Camera.main;
            if (cam == null) throw new Exception("场景里没有 Main Camera");

            RenderTexture rt = new RenderTexture(W, H, 24);
            RenderTexture previous = cam.targetTexture;
            cam.targetTexture = rt;
            cam.Render();
            cam.targetTexture = previous;

            RenderTexture.active = rt;
            Texture2D tex = new Texture2D(W, H, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0f, 0f, W, H), 0, 0);
            tex.Apply();
            RenderTexture.active = null;

            byte[] png = tex.EncodeToPNG();
            string path = Path.Combine(Directory.GetCurrentDirectory(), OutputFile);
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllBytes(path, png);

            UnityEngine.Object.DestroyImmediate(tex);
            UnityEngine.Object.DestroyImmediate(rt);
            return png.Length;
        }
    }
}
