#!/usr/bin/env bash
# scaff — bash/zsh wrapper that cds into a resolved project.
#
# The scaff binary is a subprocess, so it cannot change your shell's working
# directory. Source this file to define a `scaff` function that intercepts
# project lookups and cds into the resolved path, delegating everything else
# (zone, list, open, path, --help, ...) to the real binary.
#
#   source ./scaff.sh
#   scaff my-project   # cds into the resolved project
#
# The default zone is "hot": `scaff zone add /path/to/projects` registers a
# zone named "hot", and project lookups prefer it.

scaff() {
  local first="$1"
  local control=(zone list open path go --version -v --help -h)
  local is_control=0
  local a

  for a in "${control[@]}"; do
    if [[ "$first" == "$a" ]]; then
      is_control=1
      break
    fi
  done

  if [[ -n "$first" ]] && [[ "$is_control" -eq 0 ]]; then
    local dir
    dir="$(command scaff path "$first" 2>/dev/null)"
    if [[ -n "$dir" ]] && [[ -d "$dir" ]]; then
      cd "$dir" || return 1
      return 0
    fi
    return 1
  fi

  command scaff "$@"
}