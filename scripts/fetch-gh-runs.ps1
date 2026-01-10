$timeout = 600
$interval = 10
$elapsed = 0
while ($elapsed -lt $timeout) {
  $out = gh run list --limit 50 2>&1
  if ($LASTEXITCODE -ne 0) { Write-Host "gh run list failed, retrying in 5s"; Start-Sleep -Seconds 5; $elapsed += 5; continue }
  if ($out -match "\*") { Write-Host "Runs still in progress; sleeping $interval seconds"; Start-Sleep -Seconds $interval; $elapsed += $interval; continue }
  break
}
Write-Host "Final run list:"
$final = gh run list --limit 50 2>&1
Write-Host $final
$lines = $final -split "`n"
$ids = @()
foreach ($line in $lines) {
  if ($line -match '\b(\d{6,})\b') { $ids += $matches[1] }
}
$ids = $ids | Select-Object -Unique
if (-not $ids) { Write-Host "No run IDs found"; exit 0 }
foreach ($id in $ids) {
  Write-Host "Attempting to download logs for run $id..."
  gh run download $id --log --dir "logs-$id" 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "gh run download failed for $id; trying gh run view $id --log"
    gh run view $id --log 2>&1
  } else {
    Write-Host "Downloaded logs to logs-$id"
  }
}
