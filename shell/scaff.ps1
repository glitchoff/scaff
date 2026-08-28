function scaff {
    $shim = (Get-Command scaff.cmd -ErrorAction SilentlyContinue).Source
    if (-not $shim) { $shim = (Get-Command scaff -ErrorAction SilentlyContinue).Source }
    if (-not $shim) { Write-Error 'scaff not found'; return }
    $a = @($args)
    if ($a.Count -eq 0) { & $shim; return }
    $first = [string]$a[0]
    if ($first -in @('.','-list','-ls','-find','-f','-open','-add','-hot','-zone','-config','-setup','-update','-help','-version','-h','-v')) { & $shim @a; return }
    if ($first -in @('config','new','list','ls','create','help','version')) { & $shim @a; return }
    $prevEAP = $ErrorActionPreference; $ErrorActionPreference='SilentlyContinue'
    $raw = & $shim @a 2>&1; $ec = $LASTEXITCODE; $ErrorActionPreference=$prevEAP
    $out = @($raw | ForEach-Object { "$_" } | Out-String -Stream)
    if($out.Count -eq 0){ $out=@() }
    $clean = @($out | ForEach-Object { $_ -replace "`e\[[0-9;]*m","" })
    if ($ec -eq 0) {
        $candidate = $clean | Where-Object { $_ -match "^[A-Za-z]:\\" } | Select-Object -Last 1
        if(-not $candidate){ $candidate = $clean | Where-Object { $_ -match "^/"} | Select-Object -Last 1 }
        if($candidate){
            $t = $candidate.ToString().Trim().Trim('"').Trim("'")
            $t = $t -replace "`e\[[0-9;]*m",""
            $isDir = $false
            try{ $isDir = Test-Path -LiteralPath $t -PathType Container -ErrorAction SilentlyContinue }catch{}
            if(-not $isDir){ try{ $isDir = Test-Path $t -PathType Container -ErrorAction SilentlyContinue }catch{} }
            if($isDir -or ($t -match "^[A-Za-z]:\\")){
                try{
                    Set-Location -LiteralPath $t -ErrorAction SilentlyContinue
                    # always show banner/logs that shim emitted (stderr captured)
                    $pathLine = $t
                    $logs = @($out | Where-Object { $_ -notlike "*__SCAFF_RUN__*" -and $_.Trim() -ne $pathLine })
                    if($logs.Count -gt 0){ $logs | ForEach-Object { Write-Host $_ } }
                    # 1) marker from shim (preferred) 2) fallback read .scaff directly so cd-then-run works even if marker missed
                    $run = @($clean | Where-Object { $_ -like "*__SCAFF_RUN__*" }) | Select-Object -Last 1
                    $cmd = $null
                    if($run){ $cmd = ($run -replace ".*__SCAFF_RUN__","").Trim() }
                    else {
                        $scaffFile = Join-Path $t ".scaff"
                        if(Test-Path -LiteralPath $scaffFile){
                            try{
                                $j = Get-Content -LiteralPath $scaffFile -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
                                if($j.auto -and $j.command){ $cmd = $j.command.ToString().Trim() }
                            }catch{}
                        }
                    }
                    if($cmd){
                        Write-Host "> $cmd" -ForegroundColor DarkGray
                        Invoke-Expression $cmd
                    }
                    return
                } catch {}
            }
        }
    }
    if($ec -ne 0){
        # error case: project not found etc - show in red so user sees why cd didn't happen
        $out | Where-Object { $_ -notmatch "__SCAFF_RUN__" } | ForEach-Object { Write-Host $_ -ForegroundColor Red }
        $global:LASTEXITCODE=$ec
    } else {
        $out | Where-Object { $_ -notmatch "__SCAFF_RUN__" } | ForEach-Object { Write-Host $_ }
    }
}
