function scaff {
    $shim = (Get-Command scaff.cmd -ErrorAction SilentlyContinue).Source
    if (-not $shim) { $shim = (Get-Command scaff -ErrorAction SilentlyContinue).Source }
    if (-not $shim) { Write-Error 'scaff not found'; return }

    $a = @($args)
    if ($a.Count -eq 0) { & $shim; return }
    $first = [string]$a[0]

    # Pass through: commands that must NOT cd or run anything (already handled by the CLI itself)
    if ($first -in @('.','-list','-ls','-find','-f','-open','-add','-hot','-zone','-config','-setup','-update','-help','-version','-h','-v')) { & $shim @a; return }
    if ($first -in @('config','new','list','ls','create','help','version')) { & $shim @a; return }

    # Capture stdout + stderr as plain strings. Native stderr arrives as ErrorRecord;
    # normalize to message text so Write-Host never prints the "scaff.CMD :" wrapper noise.
    $raw = & $shim @a 2>&1
    $ec  = $LASTEXITCODE
    $out = @()
    foreach ($x in $raw) {
        if ($x -is [System.Management.Automation.ErrorRecord]) {
            $out += [string]$x.Exception.Message
        } else {
            $out += [string]$x
        }
    }
    $clean = @($out | ForEach-Object { $_ -replace "`e\[[0-9;]*m","" })

    # Find the resolved project path line (stdout) — last line starting with a drive or /.
    $candidate = $null
    if ($ec -eq 0) {
        $candidate = $clean | Where-Object { $_ -match "^[A-Za-z]:\\" } | Select-Object -Last 1
        if (-not $candidate) { $candidate = $clean | Where-Object { $_ -match "^/" } | Select-Object -Last 1 }
    }

    if ($candidate) {
        $t = $candidate.ToString().Trim().Trim('"').Trim("'")
        $t = $t -replace "`e\[[0-9;]*m",""
        $isDir = $false
        try { $isDir = Test-Path -LiteralPath $t -PathType Container -ErrorAction SilentlyContinue } catch {}
        if (-not $isDir) { try { $isDir = Test-Path $t -PathType Container -ErrorAction SilentlyContinue } catch {} }

        if ($isDir -or ($t -match "^[A-Za-z]:\\")) {
            try {
                Set-Location -LiteralPath $t -ErrorAction SilentlyContinue
                $pathLine = $t
                # Show any banner/log lines the CLI emitted (stderr), hiding the path line itself.
                $logs = @($out | Where-Object { $_ -notlike "*__SCAFF_RUN__*" -and $_.Trim() -ne $pathLine })
                if ($logs.Count -gt 0) { $logs | ForEach-Object { Write-Host $_ } }

                # Command to run after cd: 1) __SCAFF_RUN__ marker, 2) fallback: read .scaff directly.
                $run  = @($clean | Where-Object { $_ -like "*__SCAFF_RUN__*" }) | Select-Object -Last 1
                $cmd  = $null
                if ($run) { $cmd = ($run -replace ".*__SCAFF_RUN__","").Trim() }
                else {
                    $scaffFile = Join-Path $t ".scaff"
                    if (Test-Path -LiteralPath $scaffFile) {
                        try {
                            $j = Get-Content -LiteralPath $scaffFile -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
                            if ($j.auto -and $j.command) { $cmd = $j.command.ToString().Trim() }
                        } catch {}
                    }
                }
                if ($cmd) {
                    Write-Host "> $cmd" -ForegroundColor DarkGray
                    Invoke-Expression $cmd
                }
                return
            } catch {}
        }
    }

    # Failure (non-zero exit, no cd): show the CLI's error message in red so it's visible.
    if ($ec -ne 0) {
        $out | Where-Object { $_ -notlike "*__SCAFF_RUN__*" } | ForEach-Object { Write-Host $_ -ForegroundColor Red }
        $global:LASTEXITCODE = $ec
    } else {
        $out | Where-Object { $_ -notlike "*__SCAFF_RUN__*" } | ForEach-Object { Write-Host $_ }
    }
}