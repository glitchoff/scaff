<#
scaff - PowerShell wrapper that cds into a resolved project.

The scaff binary is a subprocess, so it cannot change the current shell's
working directory. Dot-source this file to define a `scaff` function that
intercepts project lookups and cds into the resolved path, delegating
everything else (zone, list, open, path, --help, ...) to the real binary.

    . .\scaff.ps1
    scaff my-project   # cds into the resolved project

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
        $shim = (Get-Command scaff -CommandType Application,ExternalScript -ErrorAction SilentlyContinue).Source
    }
    if (-not $shim) {
        Write-Error 'scaff: binary not found on PATH. Install it with `pnpm i -g scaff-up` and re-run `scaff setup`.'
        return
    }

    $control = @('zone', 'list', 'open', 'path', '--version', '-v', '--help', '-h')

    if ($Arg0 -and ($control -notcontains $Arg0)) {
        $output = & $shim path $Arg0
        if ($LASTEXITCODE -eq 0) {
            $dir = ($output | Select-Object -Last 1).Trim()
            if ($dir) {
                Set-Location -LiteralPath $dir
                return
            }
        }
        return
    }

    & $shim @($Arg0) @Rest
}