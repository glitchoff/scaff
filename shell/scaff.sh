#!/usr/bin/env bash
# scaff — bash/zsh wrapper that cds into a resolved project.
#
# The scaff binary is a subprocess, so it cannot change your shell's working
# directory. Source this file to define a `scaff` function that intercepts
# project lookups and cds into the resolved path, delegating everything else
# to the real binary.
#
# All commands are '-' prefixed. A bare token is always a project, so there is
# no ambiguity and no escape hatch needed.
#
#   source ./scaff.sh
#   scaff my-app            # cds into the primary-zone project (project-first)
#   scaff work:my-app       # cds into a project in a specific zone
#   scaff -setup            # runs the setup command
#   scaff -zone add /path   # anything starting with '-' goes to the binary

scaff() {
  local first="$1"
  shift || true

  # No arguments → show help.
  if [ -z "$first" ]; then
    command scaff
    return $?
  fi

  # Anything starting with '-' is a command → pass straight to the binary.
  case "$first" in
    -*) command scaff "$first" "$@"; return $? ;;
  esac

  # A bare token is a project (name or zone:name). Resolve it via -path and cd
  # into it. If it does not resolve, fall through so the binary prints its
  # "not found" error.
  local dir
  dir="$(command scaff -path "$first" 2>/dev/null)"
  if [ -n "$dir" ] && [ -d "$dir" ]; then
    cd "$dir" || return 1
    return 0
  fi
  command scaff "$first"
}