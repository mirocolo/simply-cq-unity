#!/usr/bin/env bash
# 无头跑 Domain 层自检（不需要打开 Unity）。
# 需要一个 .NET SDK：优先用仓库内的 LocalTools/dotnet，否则用 PATH 上的 dotnet。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOTNET="$ROOT/LocalTools/dotnet/dotnet"
if [[ ! -x "$DOTNET" ]]; then
  DOTNET="$(command -v dotnet || true)"
fi
if [[ -z "$DOTNET" || ! -x "$DOTNET" ]]; then
  echo "找不到 dotnet。装一个：brew install --cask dotnet-sdk  或 https://dotnet.microsoft.com/download" >&2
  exit 1
fi

export DOTNET_CLI_HOME="$ROOT/LocalTools/dotnet-home"
export NUGET_PACKAGES="$ROOT/LocalTools/nuget"
export DOTNET_NOLOGO=1
export DOTNET_CLI_TELEMETRY_OPTOUT=1

exec "$DOTNET" run --project "$ROOT/Tools/DomainCheck/DomainCheck.csproj" -v q --nologo
