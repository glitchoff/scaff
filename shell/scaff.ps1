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
        $last = ($clean | Select-Object -Last 1)
        if($last){
            $t=$last.ToString().Trim()
            # Remove quotes and ensure valid path chars
            if($t -and $t.Length -gt 2 -and $t -match "^[A-Za-z]:\\"){
                try{
                    if(Test-Path -LiteralPath $t -PathType Container -ErrorAction SilentlyContinue){ Set-Location -LiteralPath $t; return }
                } catch {}
            }
        }
    }
    # Print original output without extra error wrapping
    $out | ForEach-Object { Write-Host $_ }
    if($ec -ne 0){ $global:LASTEXITCODE=$ec }
}
