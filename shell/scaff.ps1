function scaff {
    $shim = (Get-Command scaff.cmd -ErrorAction SilentlyContinue).Source
    if (-not $shim) { $shim = (Get-Command scaff -ErrorAction SilentlyContinue).Source }
    if (-not $shim) { Write-Error 'scaff not found'; return }
    $a = @($args)
    if ($a.Count -eq 0) { & $shim; return }
    $first = [string]$a[0]
    if ($first -in @('-list','-ls','-find','-f','-open','-add','-hot','-zone','-config','-setup','-help','-version','-h','-v')) { & $shim @a; return }
    if ($first -in @('config','new','list','ls','create','help','version')) {
        $out = & $shim @a 2>$null; $ec=$LASTEXITCODE
        if ($ec -eq 0) { $last=($out | Select-Object -Last 1); if($last){ $t=$last.ToString().Trim(); if($t -and (Test-Path $t -PathType Container)){ Set-Location $t } } }
        $out | Write-Output; return
    }
    $out = & $shim @a 2>&1
    $ec = $LASTEXITCODE
    if ($ec -eq 0) { $last = ($out | Select-Object -Last 1); if($last){ $t=$last.ToString().Trim(); if($t -and (Test-Path $t -PathType Container)){ Set-Location $t; return } } }
    $out | Write-Output
}
