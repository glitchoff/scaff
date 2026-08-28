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

  local out ec last run
  out="$(command scaff "$first" "$@" 2>&1)"; ec=$?

  if [ "$ec" -eq 0 ]; then
    # find last line that is an existing directory (the resolved path)
    last="$(printf '%s\n' "$out" | tr -d '\r' | tac 2>/dev/null | while IFS= read -r l; do
      l="$(printf '%s\n' "$l" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^"//;s/"$//;s/^'\''//;s/'\''$//')"
      [ -d "$l" ] && printf '%s\n' "$l" && break
    done)"
    if [ -z "$last" ]; then
      last="$(printf '%s\n' "$out" | tail -n1 | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    fi

    if [ -n "$last" ] && [ -d "$last" ]; then
      cd "$last" 2>/dev/null
      # show banner/log lines (everything except marker and the path line)
      printf '%s\n' "$out" | grep -v '__SCAFF_RUN__' | grep -vx "$last" >&2
      run="$(printf '%s\n' "$out" | grep '__SCAFF_RUN__' | tail -n1 | sed 's/.*__SCAFF_RUN__//')"
      if [ -n "$run" ]; then
        printf '> %s\n' "$run" >&2
        eval "$run"; return $?
      fi
      return 0
    fi
  fi

  # failure or no cd: always surface output so the error is visible
  printf '%s\n' "$out" | grep -v '__SCAFF_RUN__' | grep -vx "$last"
  return "$ec"
}