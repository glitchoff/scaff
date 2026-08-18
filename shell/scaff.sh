#!/usr/bin/env bash
# scaff — bash/zsh wrapper that cds into a resolved project.
#
# The scaff binary is a subprocess, so it cannot change your shell's working
# directory. Source this file to define a `scaff` function that intercepts
# project lookups and cds into the resolved path, delegating everything else
# to the real binary.
#
#   source ./scaff.sh
#   scaff my-project        # cds into the resolved project (project-first)
#   scaff setup             # cds into a project named "setup" if one exists,
#                           # otherwise runs the `setup` command
#   scaff -c setup          # forces the `setup` command even if a project
#                           # named "setup" exists
#   scaff zone add /path    # multi-arg / flags always go to the binary
#
# The default zone is "hot": `scaff zone add /path/to/projects` registers a
# zone named "hot", and project lookups prefer it.

scaff() {
  local first="$1"
  shift || true

  # -c / --command : force subcommand mode. Skip project resolution and pass
  # the remaining args straight to the binary, so you can run a command
  # (e.g. `setup`, `list`) even when a project with the same name exists.
  if [ "$first" = "-c" ] || [ "$first" = "--command" ]; then
    command scaff "$@"
    return $?
  fi

  # No arguments → show help.
  if [ -z "$first" ]; then
    command scaff
    return $?
  fi

  # Flags (e.g. -v, --help) and multi-argument invocations are always passed
  # through to the real binary — they are subcommands with args or options.
  case "$first" in
    -*) command scaff "$first" "$@"; return $? ;;
  esac
  if [ "$#" -gt 0 ]; then
    command scaff "$first" "$@"
    return $?
  fi

  # Single bare word: project-first. cd into it if a project with that name
  # exists; otherwise fall through so the binary can run a same-named
  # subcommand (e.g. `scaff list`, `scaff setup`) or print its "not found"
  # error. To force the command instead, use `scaff -c <name>`.
  local dir
  dir="$(command scaff path "$first" 2>/dev/null)"
  if [ -n "$dir" ] && [ -d "$dir" ]; then
    cd "$dir" || return 1
    return 0
  fi
  command scaff "$first"
}
