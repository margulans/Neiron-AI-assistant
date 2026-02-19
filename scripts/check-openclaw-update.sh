#!/usr/bin/env bash
# Проверка наличия новой версии OpenClaw.
# Сравнивает текущую версию (package.json) с последней на npm.
# При наличии апдейта — скачивает diff changelog и пишет отчёт.
#
# Выход: 0 = есть апдейт, 1 = нет апдейта, 2 = ошибка
# Отчёт: .cursor/update-report.md (перезаписывается)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$PROJECT_DIR/.cursor"
REPORT_FILE="$REPORT_DIR/update-report.md"

mkdir -p "$REPORT_DIR"

current_version=$(node -p "require('$PROJECT_DIR/package.json').version" 2>/dev/null)
if [[ -z "$current_version" ]]; then
  echo "Ошибка: не удалось прочитать текущую версию из package.json" >&2
  exit 2
fi

latest_version=$(npm view openclaw version --userconfig "$(mktemp)" 2>/dev/null)
if [[ -z "$latest_version" ]]; then
  echo "Ошибка: не удалось получить последнюю версию с npm" >&2
  exit 2
fi

echo "Текущая: $current_version"
echo "Последняя: $latest_version"

if [[ "$current_version" == "$latest_version" ]]; then
  cat > "$REPORT_FILE" <<EOF
---
status: up-to-date
current: $current_version
latest: $latest_version
checked: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
---

# OpenClaw — обновлений нет

Текущая версия **$current_version** — последняя стабильная.
EOF
  echo "Обновлений нет."
  exit 1
fi

# Есть новая версия — забираем changelog с GitHub
changelog_url="https://raw.githubusercontent.com/openclaw/openclaw/main/CHANGELOG.md"
changelog_raw=$(curl -fsSL "$changelog_url" 2>/dev/null || echo "")

new_changes=""
if [[ -n "$changelog_raw" ]]; then
  # Вытаскиваем секции changelog между текущей и последней версией.
  # Берём всё от "## $latest_version" до "## $current_version"
  new_changes=$(echo "$changelog_raw" | awk "
    /^## $latest_version/ { found=1 }
    found { print }
    /^## $current_version/ { exit }
  ")

  # Если exact match не сработал — берём всё до текущей версии
  if [[ -z "$new_changes" ]]; then
    new_changes=$(echo "$changelog_raw" | awk "
      /^## [0-9]/ { found=1 }
      found { print }
      /^## $current_version/ { exit }
    ")
  fi
fi

# Считаем промежуточные релизы
releases_between=""
if [[ -n "$changelog_raw" ]]; then
  releases_between=$(echo "$changelog_raw" | grep -E "^## [0-9]{4}\." | awk "
    /^## $current_version/ { exit }
    { print \$2 }
  " | head -20)
fi
release_count=$(echo "$releases_between" | grep -c . || echo "0")

cat > "$REPORT_FILE" <<EOF
---
status: update-available
current: $current_version
latest: $latest_version
releases_between: $release_count
checked: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
---

# OpenClaw — доступно обновление!

| | Версия |
|---|---|
| Текущая | **$current_version** |
| Последняя | **$latest_version** |
| Промежуточных релизов | **$release_count** |

## Что нового ($current_version → $latest_version)

$new_changes

---

**Для обновления** запусти \`bash scripts/update-openclaw.sh\` или скажи агенту «обнови openclaw».
EOF

echo ""
echo "=== Доступно обновление: $current_version → $latest_version ($release_count релизов) ==="
echo "Отчёт: $REPORT_FILE"
exit 0
