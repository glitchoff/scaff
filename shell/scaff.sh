#!/usr/bin/env bash
scaff() {
  local first="$1"
  shift || true
  if [ -z "$first" ]; then command scaff; return $?; fi
  case "$first" in
    -list|-ls|-find|-f|-open|-add|-hot|-zone|-config|-setup|-help|-version|-h|-v) command scaff "$first" "$@"; return $? ;;
  esac
  case "$first" in
    config|new|list|ls|create|help|version)
      local out; out="$(command scaff "$first" "$@" 2>&1)"; local ec=$?
      local last="$(echo "$out" | tail -n1 | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
      if [ -d "$last" ]; then cd "$last" 2>/dev/null; fi
      printf "%s\n" "$out"; return $ec ;;
  esac
  local out; out="$(command scaff "$first" "$@" 2>&1)"; local ec=$?
  local last="$(echo "$out" | tail -n1 | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  if [ $ec -eq 0 ] && [ -d "$last" ]; then cd "$last" 2>/dev/null; return 0; fi
  printf "%s\n" "$out"; return $ec
}
