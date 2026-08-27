function scaff {
    $shim = (Get-Command scaff.cmd -ErrorAction SilentlyContinue).Source
    if (-not $shim) { $shim = (Get-Command scaff -ErrorAction SilentlyContinue).Source }
    if (-not $shim) { Write-Error 'scaff not found'; return }
    $a = @($args)
    if ($a.Count -eq 0) { & $shim; return }
    $first = [string]$a[0]
    if ($first -in @('-list','-ls','-find','-f','-open','list','ls')) {
        $out = & $shim @a 2>$null
        $ec = $LASTEXITCODE
        $last = ($out | Select-Object -Last 1).ToString().Trim()
        if ($last -and (Test-Path $last -PathType Container)) { Set-Location -LiteralPath $last; $out | Write-Output; return }
        $out | Write-Output; return
    }
    if ($first.StartsWith('-')) { & $shim @a; return }
    $output = & $shim -path $first 2>$null
    if ($LASTEXITCODE -eq 0) { $dir = ($output | Select-Object -Last 1).ToString().Trim(); if ($dir -and (Test-Path $dir)) { Set-Location $dir; return } }
    $out2 = & $shim @a 2>$null
    $last2 = ($out2 | Select-Object -Last 1).ToString().Trim()
    if ($LASTEXITCODE -eq 0 -and (Test-Path $last2 -PathType Container)) { Set-Location $last2; $out2 | Write-Output; return }
    & $shim @a
}
