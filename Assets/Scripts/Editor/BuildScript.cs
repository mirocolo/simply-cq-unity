using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace SimplyCQ.EditorTools
{
    /// <summary>
    /// 打包一个可以双击运行的 macOS 版本。
    /// 只是把 GameM1 场景打进包 —— 世界仍然是运行时按 StreamingAssets 里的 JSON 生成的。
    /// </summary>
    public static class BuildScript
    {
        private const string ScenePath = "Assets/Scenes/GameM1.unity";
        private const string OutputPath = "Builds/mac/simply-cq.app";

        [MenuItem("SimplyCQ/构建 macOS 可执行版", false, 60)]
        public static void BuildMacMenu()
        {
            BuildOnce();
        }

        /// <summary>命令行入口，失败时退出码 1。</summary>
        public static void BuildMacBatch()
        {
            EditorApplication.Exit(BuildOnce());
        }

        private static int BuildOnce()
        {
            if (!File.Exists(ScenePath))
            {
                Debug.LogError("[SimplyCQ] 找不到场景 " + ScenePath + "，先跑一次「一键开始」。");
                return 1;
            }

            string dir = Path.GetDirectoryName(OutputPath);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

            BuildPlayerOptions options = new BuildPlayerOptions();
            options.scenes = new string[] { ScenePath };
            options.locationPathName = OutputPath;
            options.target = BuildTarget.StandaloneOSX;
            options.options = BuildOptions.None;

            BuildReport report = BuildPipeline.BuildPlayer(options);
            BuildSummary summary = report.summary;

            if (summary.result == BuildResult.Succeeded)
            {
                Debug.Log(string.Format("[SimplyCQ] 构建成功 {0}  大小 {1} MB  用时 {2:0}s",
                    OutputPath, summary.totalSize / 1024UL / 1024UL, summary.totalTime.TotalSeconds));
                return 0;
            }

            Debug.LogError("[SimplyCQ] 构建失败: " + summary.result + "  错误数 " + summary.totalErrors);
            return 1;
        }
    }
}
