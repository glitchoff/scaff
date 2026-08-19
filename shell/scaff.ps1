<#
.scaff - PowerShell wrapper that cds into a resolved project.

The scaff binary is a subprocess, so it cannot change the current shell's
working directory. Dot-source this file to define a `scaff` function that
intercepts project lookups and cds into the resolved path, delegating
everything else to the real binary.

All commands are '-' prefixed. A bare token is always a project, so there is
no ambiguity and no escape hatch needed.

    . .\scaff.ps1
    scaff my-app            # cds into the primary-zone project (project-first)
    scaff work:my-app       # cds into a project in a specific zone
    scaff -setup            # runs the setup command
    scaff -zone add C:\x    # anything starting with '-' goes to the binary

Note: the wrapper uses the automatic `$args` variable (not a param block) so
that arguments starting with `-` (e.g. `-setup`) are captured literally
instead of being bound as PowerShell parameters. It calls the real CLI via
`scaff.cmd`, which npm/pnpm generate for global installs on Windows.
#>
function scaff {
    # Resolve the real shim on every call (never cache it).
    $shim = (Get-Command scaff.cmd -CommandType Application -ErrorAction SilentlyContinue).Source
    if (-not $shim) {
        $shim = (Get-Command scaff -CommandType Application, ExternalScript -ErrorAction SilentlyContinue).Source
    }
    if (-not $shim) {
        Write-Error 'scaff: binary not found on PATH. Install it with `pnpm i -g scaff-up` and re-run `scaff -setup`.'
        return
    }

    $a = @($args)

    # No arguments → show help.
    if ($a.Count -eq 0) {
        & $shim
        return
    }

    $first = [string]$a[0]

    # Anything starting with '-' is a command → pass straight to the binary.
    if ($first.StartsWith('-')) {
        & $shim @a
        return
    }

    # A bare token is a project (name or zone:name). Resolve it via -path and
    # cd into it. If it does not resolve, fall through so the binary prints
    # its "not found" error.
    $output = & $shim -path $first 2>$null
    if ($LASTEXITCODE -eq 0) {
        $dir = ($output | Select-Object -Last 1).Trim()
        if ($dir) {
            Set-Location -LiteralPath $dir
            return
        }
    }
    & $shim $first
}