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
            BalanceAudit.Run();     // 数值审计的失败项也并进退出码

            int failed = DomainSmokeTest.FailureCount + BalanceAudit.FailureCount;
            Debug.Log("[SimplyCQ] === 批处理结束，失败项 " + failed + " ===");
            EditorApplication.Exit(failed == 0 ? 0 : 1);
        }
    }
}
