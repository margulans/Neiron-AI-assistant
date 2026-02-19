#!/usr/bin/env bash
# Автоматическое обновление OpenClaw до указанной (или последней) версии.
#
# Использование:
#   bash scripts/update-openclaw.sh          # обновить до latest
#   bash scripts/update-openclaw.sh 2026.2.17  # обновить до конкретной версии
#
# Что делает:
# 1. Проверяет чистоту рабочего дерева (untracked в .cursor/ — ОК)
# 2. Добавляет upstream remote (если нет)
# 3. Fetch upstream + tags
# 4. Merge tag v<version>
# 5. Разрешает конфликты в пользу upstream (--theirs)
# 6. pnpm install
# 7. Пишет результат

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

UPSTREAM_URL="https://github.com/openclaw/openclaw.git"

target_version="${1:-}"

current_version=$(node -p "require('./package.json').version" 2>/dev/null)
echo "Текущая версия: $current_version"

# --- Определить целевую версию ---
if [[ -z "$target_version" ]]; then
  target_version=$(npm view openclaw version --userconfig "$(mktemp)" 2>/dev/null)
  if [[ -z "$target_version" ]]; then
    echo "Ошибка: не удалось получить последнюю версию с npm" >&2
    exit 1
  fi
fi
echo "Целевая версия: $target_version"

if [[ "$current_version" == "$target_version" ]]; then
  echo "Уже на версии $current_version — обновление не требуется."
  exit 0
fi

# --- Проверить чистоту рабочего дерева (игнорируем .cursor/) ---
dirty_files=$(git status --porcelain | grep -v '^\?\? \.cursor/' | grep -v '^\?\? $' || true)
if [[ -n "$dirty_files" ]]; then
  echo "Ошибка: есть незакоммиченные изменения вне .cursor/:" >&2
  echo "$dirty_files" >&2
  echo "" >&2
  echo "Закоммить или stash перед обновлением." >&2
  exit 1
fi

# --- Убедиться что upstream настроен ---
if ! git remote get-url upstream &>/dev/null; then
  echo "Добавляю upstream remote..."
  git remote add upstream "$UPSTREAM_URL"
fi

# --- Fetch upstream ---
echo "Fetching upstream..."
git fetch upstream --tags --quiet

# --- Проверить наличие тега ---
tag="v$target_version"
if ! git rev-parse "$tag" &>/dev/null; then
  echo "Ошибка: тег $tag не найден в upstream" >&2
  echo "Доступные теги:" >&2
  git tag -l 'v2026.*' | tail -10 >&2
  exit 1
fi

# --- Merge ---
echo "Merging $tag..."
if git merge "$tag" --no-edit 2>/dev/null; then
  echo "Merge завершён без конфликтов."
else
  # Есть конфликты — разрешаем в пользу upstream
  echo "Конфликты обнаружены — разрешаю в пользу upstream..."

  conflicted=$(git diff --name-only --diff-filter=U)
  if [[ -z "$conflicted" ]]; then
    echo "Ошибка: merge не удался, но конфликтов нет" >&2
    git merge --abort 2>/dev/null || true
    exit 1
  fi

  for file in $conflicted; do
    # modify/delete: upstream удалил файл
    if ! git show "$tag:$file" &>/dev/null 2>&1; then
      echo "  rm $file (удалён в upstream)"
      git rm -f "$file" 2>/dev/null || true
    else
      echo "  theirs $file"
      git checkout --theirs "$file"
      git add "$file"
    fi
  done

  git commit --no-edit
  echo "Конфликты разрешены, merge завершён."
fi

# --- Установить зависимости ---
echo "Устанавливаю зависимости..."
if command -v pnpm &>/dev/null; then
  pnpm install
elif command -v npx &>/dev/null; then
  npx pnpm@10 install
else
  npm install
fi

# --- Результат ---
new_version=$(node -p "require('./package.json').version" 2>/dev/null)
echo ""
echo "=== Обновление завершено ==="
echo "Было:  $current_version"
echo "Стало: $new_version"
echo ""
echo "Следующий шаг: проверь работу и запуши (git push)."
