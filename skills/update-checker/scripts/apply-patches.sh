#!/bin/bash
# apply-patches.sh — применяет патчи после обновления OpenClaw
# Запускать после каждого `npm i -g openclaw@latest`
#
# Выход: JSON { "applied": [...], "skipped": [...], "errors": [...] }

set -euo pipefail

OPENCLAW_DIR=$(npm root -g 2>/dev/null)/openclaw/dist
APPLIED=()
SKIPPED=()
ERRORS=()

# ─── Патч 1: contextWindow 1M для Anthropic Sonnet/Opus 4-6 ─────────────────
# Проблема: pi-ai v0.53.0 не содержит claude-sonnet-4-6 в каталоге,
#   forward-compat клонирует sonnet-4-5 (200k) вместо установки 1M.
# Фикс: добавить patch:{contextWindow:1e6} в cloneFirstTemplateModel вызовы
#   для Anthropic Sonnet 4-6 и Opus 4-6 forward-compat функций.
# Статус: ожидает официального релиза в npm-пакете.
PATCH1_NAME="contextWindow-1M-sonnet-opus-46"

patch_contextwindow() {
  local file="$1"
  
  # Проверяем нужен ли патч (если уже есть patch:{contextWindow:1e6} — пропускаем)
  if grep -q 'patch:{contextWindow:1e6}' "$file" 2>/dev/null; then
    return 2  # уже пропатчен
  fi
  
  # Проверяем что это правильный файл с нужными функциями
  if ! grep -q 'ANTHROPIC_SONNET_TEMPLATE_MODEL_IDS' "$file" 2>/dev/null; then
    return 3  # не тот файл
  fi

  python3 << PYEOF
import sys

filepath = '$file'
try:
    with open(filepath, 'r') as f:
        content = f.read()

    old_opus = '''templateIds.push(...ANTHROPIC_OPUS_TEMPLATE_MODEL_IDS);
\treturn cloneFirstTemplateModel({
\t\tnormalizedProvider,
\t\ttrimmedModelId,
\t\ttemplateIds,
\t\tmodelRegistry
\t});
}
function resolveAnthropicSonnet46ForwardCompatModel'''

    new_opus = '''templateIds.push(...ANTHROPIC_OPUS_TEMPLATE_MODEL_IDS);
\treturn cloneFirstTemplateModel({
\t\tnormalizedProvider,
\t\ttrimmedModelId,
\t\ttemplateIds,
\t\tmodelRegistry,
\t\tpatch:{contextWindow:1e6}
\t});
}
function resolveAnthropicSonnet46ForwardCompatModel'''

    old_sonnet = '''templateIds.push(...ANTHROPIC_SONNET_TEMPLATE_MODEL_IDS);
\treturn cloneFirstTemplateModel({
\t\tnormalizedProvider,
\t\ttrimmedModelId,
\t\ttemplateIds,
\t\tmodelRegistry
\t});'''

    new_sonnet = '''templateIds.push(...ANTHROPIC_SONNET_TEMPLATE_MODEL_IDS);
\treturn cloneFirstTemplateModel({
\t\tnormalizedProvider,
\t\ttrimmedModelId,
\t\ttemplateIds,
\t\tmodelRegistry,
\t\tpatch:{contextWindow:1e6}
\t});'''

    c1 = content.replace(old_opus, new_opus, 1)
    c2 = c1.replace(old_sonnet, new_sonnet, 1)

    if c2 == content:
        sys.exit(4)  # паттерн не найден — возможно версия уже исправлена официально

    with open(filepath, 'w') as f:
        f.write(c2)
    sys.exit(0)
except Exception as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
PYEOF
  return $?
}

# Ищем все bundle-файлы с forward-compat
if [ ! -d "$OPENCLAW_DIR" ]; then
  ERRORS+=("Директория openclaw не найдена: $OPENCLAW_DIR")
else
  BUNDLES=$(grep -rl 'ANTHROPIC_SONNET_TEMPLATE_MODEL_IDS' "$OPENCLAW_DIR"/*.js 2>/dev/null || true)
  
  if [ -z "$BUNDLES" ]; then
    # Патч не нужен — функция уже исправлена в официальном релизе
    SKIPPED+=("$PATCH1_NAME: официальный фикс уже в релизе")
  else
    PATCH1_DONE=false
    while IFS= read -r bundle; do
      patch_contextwindow "$bundle"
      code=$?
      case $code in
        0) APPLIED+=("$PATCH1_NAME: $bundle"); PATCH1_DONE=true ;;
        2) SKIPPED+=("$PATCH1_NAME: уже пропатчен ($bundle)"); PATCH1_DONE=true ;;
        3) ;;  # не тот файл, продолжаем
        4) SKIPPED+=("$PATCH1_NAME: паттерн не найден в $bundle — возможно официальный фикс уже вышел") ;;
        *) ERRORS+=("$PATCH1_NAME: ошибка в $bundle") ;;
      esac
    done <<< "$BUNDLES"
    
    if [ "$PATCH1_DONE" = false ] && [ ${#ERRORS[@]} -eq 0 ]; then
      SKIPPED+=("$PATCH1_NAME: официальный фикс уже в релизе")
    fi
  fi
fi

# ─── Вывод JSON ─────────────────────────────────────────────────────────────
python3 << PYEOF
import json
applied = $(printf '%s\n' "${APPLIED[@]+"${APPLIED[@]}"}" | python3 -c "import sys,json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))" 2>/dev/null || echo '[]')
skipped = $(printf '%s\n' "${SKIPPED[@]+"${SKIPPED[@]}"}" | python3 -c "import sys,json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))" 2>/dev/null || echo '[]')
errors  = $(printf '%s\n' "${ERRORS[@]+"${ERRORS[@]}"}"  | python3 -c "import sys,json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))" 2>/dev/null || echo '[]')
status = "error" if errors else ("applied" if applied else "skipped")
print(json.dumps({"status": status, "applied": applied, "skipped": skipped, "errors": errors}, indent=2))
PYEOF
