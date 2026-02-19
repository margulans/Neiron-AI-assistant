#!/usr/bin/env bash
# Проверка наличия новой версии OpenClaw.
# Сравнивает текущую установленную версию с последней на npm.
# При наличии апдейта — забирает changelog diff.
#
# Выход: JSON на stdout
#   {"status":"update-available","current":"X","latest":"Y","releases":N,"changelog":"..."}
#   {"status":"up-to-date","current":"X","latest":"X"}
#   {"status":"error","message":"..."}

set -euo pipefail

current=""

# Определить текущую версию — openclaw CLI
if command -v openclaw &>/dev/null; then
  current=$(openclaw --version 2>/dev/null | head -1 | grep -oE '[0-9]{4}\.[0-9]+\.[0-9]+' || true)
fi

# Фоллбэк — package.json
if [[ -z "$current" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
  pkg="$PROJECT_ROOT/package.json"
  if [[ -f "$pkg" ]]; then
    current=$(node -p "require('$pkg').version" 2>/dev/null || true)
  fi
fi

if [[ -z "$current" ]]; then
  echo '{"status":"error","message":"не удалось определить текущую версию"}'
  exit 0
fi

# Последняя версия на npm
latest=$(npm view openclaw version --userconfig "$(mktemp)" 2>/dev/null || true)
if [[ -z "$latest" ]]; then
  echo '{"status":"error","message":"не удалось получить последнюю версию с npm"}'
  exit 0
fi

if [[ "$current" == "$latest" ]]; then
  echo "{\"status\":\"up-to-date\",\"current\":\"$current\",\"latest\":\"$latest\"}"
  exit 0
fi

# Есть обновление — забираем changelog
changelog_url="https://raw.githubusercontent.com/openclaw/openclaw/main/CHANGELOG.md"
raw=$(curl -fsSL "$changelog_url" 2>/dev/null || true)

changelog=""
releases=0
breaking=""

if [[ -n "$raw" ]]; then
  # Сохраняем во временный файл — избегаем SIGPIPE в пайпах
  tmpfile=$(mktemp)
  echo "$raw" > "$tmpfile"

  # Секции между latest и current версиями
  changelog=$(awk "
    /^## $latest/ { found=1 }
    found { print }
    /^## $current/ { exit }
  " "$tmpfile" || true)

  # Считаем промежуточные релизы
  releases=$(grep -E "^## [0-9]{4}\." "$tmpfile" | awk "
    /^## $current/ { exit }
    { count++ }
    END { print count+0 }
  " || echo "0")

  # Breaking changes
  if [[ -n "$changelog" ]]; then
    breaking=$(echo "$changelog" | awk '
      /^### Breaking/ { found=1; next }
      /^### / { found=0 }
      /^## / { found=0 }
      found && NF { print }
    ' || true)
  fi

  rm -f "$tmpfile"
fi

# JSON-safe escape
escape_json() {
  python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo '""'
}

changelog_json=$(printf '%s' "$changelog" | escape_json)
breaking_json=$(printf '%s' "$breaking" | escape_json)

printf '{"status":"update-available","current":"%s","latest":"%s","releases":%s,"changelog":%s,"breaking":%s}\n' \
  "$current" "$latest" "$releases" "$changelog_json" "$breaking_json"
