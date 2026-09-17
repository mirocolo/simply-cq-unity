#!/usr/bin/env bash
# 一次跑完所有无头检查：四层编译 + Domain 逻辑用例。
# 这两件事必须一起跑 —— 桩编译不覆盖 Tools/DomainCheck，单跑会漏。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "########## 1/2 四层编译检查（含 Unity 桩）##########"
bash "$ROOT/Tools/run-compile-check.sh"

echo
echo "########## 2/2 Domain 无头用例 ##########"
bash "$ROOT/Tools/run-domain-check.sh"
