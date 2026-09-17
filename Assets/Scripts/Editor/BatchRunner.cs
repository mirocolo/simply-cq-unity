using UnityEditor;
using UnityEngine;

namespace SimplyCQ.EditorTools
{
    /// <summary>
    /// 一条命令跑完「建场景 + 冒烟自检」，失败时退出码为 1。
    ///
    /// Unity -batchmode -nographics -quit -projectPath . \
    ///       -executeMethod SimplyCQ.EditorTools.BatchRunner.RunAll -logFile /tmp/unity.log
    /// </summary>
    public static class BatchRunner
    {
        public static void RunAll()
        {
            Debug.Log("[SimplyCQ] === 批处理开始 ===");
            SceneSetup.CreateM1Scene();
            DomainSmokeTest.Run();
            Debug.Log("[SimplyCQ] === 批处理结束，失败项 " + DomainSmokeTest.FailureCount + " ===");
            EditorApplication.Exit(DomainSmokeTest.FailureCount == 0 ? 0 : 1);
        }
    }
}
