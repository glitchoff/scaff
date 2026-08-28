function scaff {
    $shim = (Get-Command scaff.cmd -ErrorAction SilentlyContinue).Source
    if (-not $shim) { $shim = (Get-Command scaff -ErrorAction SilentlyContinue).Source }
    if (-not $shim) { Write-Error 'scaff not found'; return }
    $a = @($args)
    if ($a.Count -eq 0) { & $shim; return }
    $first = [string]$a[0]
    if ($first -in @('.','-list','-ls','-find','-f','-open','-add','-hot','-zone','-config','-setup','-update','-help','-version','-h','-v')) { & $shim @a; return }
    if ($first -in @('config','new','list','ls','create','help','version')) { & $shim @a; return }
    # Capture output but suppress NativeCommandError wrapping - use cmd /c to avoid PowerShell error stream
    $out = & $shim @a 2>&1 | Out-String -Stream
    $ec = $LASTEXITCODE
    # Strip ANSI codes for path detection
    $clean = $out | ForEach-Object { $_ -replace "`e\[[0-9;]*m","" }
    if ($ec -eq 0) {
        # Find last line that looks like a path (stdout path is always last, but stderr logs may be merged via 2>&1)
        $candidate = $null
        for($i=$clean.Count-1; $i -ge 0; $i--){
            $t=$clean[$i].ToString().Trim().Trim('"').Trim("'")
            if($t -and $t.Length -gt 2 -and $t -match "^[A-Za-z]:\\"){
                if(Test-Path -LiteralPath $t -PathType Container -ErrorAction SilentlyContinue){ $candidate=$t; break }
            }
            if($t -and $t -match "^/[^ ]+" -and (Test-Path -LiteralPath $t -PathType Container -ErrorAction SilentlyContinue)){ $candidate=$t; break }
        }
        if($candidate){ try{ Set-Location -LiteralPath $candidate; return } catch {} }
    }
    # Print original output without extra error wrapping
    $out | ForEach-Object { Write-Host $_ }
    if($ec -ne 0){ $global:LASTEXITCODE=$ec }
}
