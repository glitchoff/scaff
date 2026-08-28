#!/usr/bin/env bash
scaff() {
  local first="$1"
  shift || true
  if [ -z "$first" ]; then command scaff; return $?; fi
  case "$first" in
    .|-list|-ls|-find|-f|-open|-add|-hot|-zone|-config|-setup|-update|-help|-version|-h|-v) command scaff "$first" "$@"; return $? ;;
  esac
  case "$first" in
    config|new|list|ls|create|help|version)
      command scaff "$first" "$@"; return $? ;;
  esac
  local out; out="$(command scaff "$first" "$@" 2>&1)"; local ec=$?
  if [ $ec -eq 0 ]; then
    # find last line that is an existing directory (path is on stdout, logs now on stderr but still handle mixed)
    local last="$(echo "$out" | tr -d '\r' | tac 2>/dev/null | while IFS= read -r l; do l="$(echo "$l" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^"//;s/"$//;s/^'\''//;s/'\''$//')"; [ -d "$l" ] && echo "$l" && break; done)"
    if [ -z "$last" ]; then last="$(echo "$out" | tail -n1 | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"; fi
    if [ -n "$last" ] && [ -d "$last" ]; then cd "$last" 2>/dev/null; return 0; fi
  fi
  printf "%s\n" "$out"; return $ec
}
