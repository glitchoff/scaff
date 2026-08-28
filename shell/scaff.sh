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
    local last="$(echo "$out" | tr -d '\r' | tac 2>/dev/null | while IFS= read -r l; do l="$(echo "$l" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^"//;s/"$//;s/^'\''//;s/'\''$//')"; [ -d "$l" ] && echo "$l" && break; done)"
    if [ -z "$last" ]; then last="$(echo "$out" | tail -n1 | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"; fi
    if [ -n "$last" ] && [ -d "$last" ]; then
      cd "$last" 2>/dev/null
      local run="$(echo "$out" | grep '__SCAFF_RUN__' | tail -n1 | sed 's/.*__SCAFF_RUN__//')"
      if [ -n "$run" ]; then
        echo "$out" | grep -v '__SCAFF_RUN__' | grep -v "^$last$" >&2
        echo "> $run" >&2; eval "$run"; return $?
      fi
      return 0
    fi
  fi
  echo "$out" | grep -v '__SCAFF_RUN__' | grep -v "^$last$"
  return $ec
}
