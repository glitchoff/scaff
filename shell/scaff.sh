#!/usr/bin/env bash
scaff() {
  local first="$1"
  shift || true
  if [ -z "$first" ]; then command scaff; return $?; fi
  case "$first" in
    config|new|list|ls) command scaff "$first" "$@"; return $? ;;
    -list|-ls|-find|-f|-open|list|ls)
      local out; out="$(command scaff "$first" "$@" 2>/dev/null)"; local ec=$?
      local last="$(echo "$out" | tail -n1 | tr -d '\r')"
      if [ -d "$last" ]; then cd "$last" 2>/dev/null; echo "$out"; return 0; fi
      echo "$out"; return $ec ;;
    -*) command scaff "$first" "$@"; return $? ;;
  esac
  local dir; dir="$(command scaff -path "$first" 2>/dev/null)"
  if [ -n "$dir" ] && [ -d "$dir" ]; then cd "$dir" || return 1; return 0; fi
  dir="$(command scaff "$first" 2>/dev/null | tail -n1 | tr -d '\r')"
  if [ -n "$dir" ] && [ -d "$dir" ]; then cd "$dir" || return 1; echo "$dir"; return 0; fi
  command scaff "$first" "$@"
}
