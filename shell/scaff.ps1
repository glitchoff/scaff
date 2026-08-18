<#
.scaff - PowerShell wrapper that cds into a resolved project.

The scaff binary is a subprocess, so it cannot change the current shell's
working directory. Dot-source this file to define a `scaff` function that
intercepts project lookups and cds into the resolved path, delegating
everything else to the real binary.

    . .\scaff.ps1
    scaff my-project        # cds into the resolved project (project-first)
    scaff setup             # cds into a project named "setup" if one exists,
                             # otherwise runs the `setup` command
    scaff -c setup          # forces the `setup` command even if a project
                             # named "setup" exists
    scaff zone add C:\x     # multi-arg / flags always go to the binary

The default zone is "hot": `scaff zone add C:\path\to\projects` registers a
zone named "hot", and project lookups prefer it.

Note: the wrapper calls the real CLI via `scaff.cmd`, which npm/pnpm generate
for global installs on Windows. This avoids recursion into this function.
#>
function scaff {
    param(
        [Parameter(Position = 0)]
        [string]$Arg0,

        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Rest
    )

    # Resolve the real shim on every call (never cache it). An earlier version
    # cached `$global:__scaff_shim` once at profile-load time and broke
    # permanently if scaff wasn't on PATH at that moment — e.g. right after a
    # `pnpm install -g` that hadn't refreshed PATH, or after the binary moved.
    $shim = (Get-Command scaff.cmd -CommandType Application -ErrorAction SilentlyContinue).Source
    if (-not $shim) {
        # Fall back to any external `scaff` entry (e.g. `scaff` w/o .CMD).
        $shim = (Get-Command scaff -CommandType Application, ExternalScript -ErrorAction SilentlyContinue).Source
    }
    if (-not $shim) {
        Write-Error 'scaff: binary not found on PATH. Install it with `pnpm i -g scaff-up` and re-run `scaff setup`.'
        return
    }

    # -c / --command : force subcommand mode. Skip project resolution and pass
    # the remaining args straight to the binary, so you can run a command
    # (e.g. `setup`, `list`) even when a project with the same name exists.
    if ($Arg0 -eq '-c' -or $Arg0 -eq '--command') {
        & $shim @Rest
        return
    }

    # No arguments → show help.
    if (-not $Arg0) {
        & $shim
        return
    }

    # Flags (e.g. -v, --help) and multi-argument invocations are always passed
    # through to the real binary — they are subcommands with args or options.
    if ($Arg0.StartsWith('-')) {
        & $shim @($Arg0) @Rest
        return
    }
    if ($Rest -and $Rest.Count -gt 0) {
        & $shim @($Arg0) @Rest
        return
    }

    # Single bare word: project-first. cd into it if a project with that name
    # exists; otherwise fall through so the binary can run a same-named
    # subcommand (e.g. `scaff list`, `scaff setup`) or print its "not found"
    # error. To force the command instead, use `scaff -c <name>`.
    $output = & $shim path $Arg0 2>$null
    if ($LASTEXITCODE -eq 0) {
        $dir = ($output | Select-Object -Last 1).Trim()
        if ($dir) {
            Set-Location -LiteralPath $dir
            return
        }
    }
    & $shim $Arg0
}
