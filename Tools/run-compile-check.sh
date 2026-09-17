#!/usr/bin/env bash
# 无头编译检查：用最小 UnityEngine/UnityEditor 桩，把 Domain + Data + Unity + Editor 四层一起编译。
# 不需要安装 Unity，用来抓拼写错误 / 重构残留 / 字段名写错。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOTNET="$ROOT/.tools/dotnet/dotnet"
if [[ ! -x "$DOTNET" ]]; then
  DOTNET="$(command -v dotnet || true)"
fi
if [[ -z "$DOTNET" || ! -x "$DOTNET" ]]; then
  echo "找不到 dotnet。装一个：brew install --cask dotnet-sdk  或 https://dotnet.microsoft.com/download" >&2
  exit 1
fi

export DOTNET_CLI_HOME="$ROOT/.tools/dotnet-home"
export NUGET_PACKAGES="$ROOT/.tools/nuget"
export DOTNET_NOLOGO=1
export DOTNET_CLI_TELEMETRY_OPTOUT=1

exec "$DOTNET" build "$ROOT/Tools/UnityCompileCheck/UnityCompileCheck.csproj" -v q --nologo
