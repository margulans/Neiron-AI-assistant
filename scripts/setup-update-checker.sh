#!/usr/bin/env bash
# Установка/удаление ежедневной проверки обновлений OpenClaw через macOS launchd.
#
# Использование:
#   bash scripts/setup-update-checker.sh install   # активировать
#   bash scripts/setup-update-checker.sh uninstall  # деактивировать
#   bash scripts/setup-update-checker.sh status     # статус

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LABEL="ai.openclaw.update-checker"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
CHECK_SCRIPT="$PROJECT_DIR/scripts/check-openclaw-update.sh"
LOG_FILE="$HOME/Library/Logs/openclaw-update-checker.log"

action="${1:-status}"

install_checker() {
  chmod +x "$CHECK_SCRIPT"

  mkdir -p "$HOME/Library/LaunchAgents"
  mkdir -p "$(dirname "$LOG_FILE")"

  cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>

  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>bash</string>
    <string>$CHECK_SCRIPT</string>
  </array>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>10</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>

  <key>StandardOutPath</key>
  <string>$LOG_FILE</string>
  <key>StandardErrorPath</key>
  <string>$LOG_FILE</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:$HOME/Library/pnpm:$HOME/.local/bin</string>
  </dict>

  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
PLIST

  launchctl unload "$PLIST_PATH" 2>/dev/null || true
  launchctl load "$PLIST_PATH"

  echo "Проверка обновлений установлена."
  echo "  Расписание: ежедневно в 10:00"
  echo "  Лог: $LOG_FILE"
  echo "  Отчёт: $PROJECT_DIR/.cursor/update-report.md"
  echo ""
  echo "Для ручной проверки: bash scripts/check-openclaw-update.sh"
}

uninstall_checker() {
  if [[ -f "$PLIST_PATH" ]]; then
    launchctl unload "$PLIST_PATH" 2>/dev/null || true
    rm -f "$PLIST_PATH"
    echo "Проверка обновлений деактивирована."
  else
    echo "Не установлена."
  fi
}

show_status() {
  echo "=== OpenClaw Update Checker ==="
  if [[ -f "$PLIST_PATH" ]]; then
    echo "Статус: установлен"
    loaded=$(launchctl list 2>/dev/null | grep "$LABEL" || echo "")
    if [[ -n "$loaded" ]]; then
      echo "launchd: загружен"
    else
      echo "launchd: не загружен"
    fi
  else
    echo "Статус: не установлен"
  fi

  echo ""
  report="$PROJECT_DIR/.cursor/update-report.md"
  if [[ -f "$report" ]]; then
    echo "Последний отчёт:"
    head -10 "$report" | grep -E "^(status|current|latest|checked):" | sed 's/^/  /'
  else
    echo "Отчётов пока нет. Запусти: bash scripts/check-openclaw-update.sh"
  fi
}

case "$action" in
  install)  install_checker ;;
  uninstall) uninstall_checker ;;
  status)   show_status ;;
  *)
    echo "Использование: $0 {install|uninstall|status}"
    exit 1
    ;;
esac
