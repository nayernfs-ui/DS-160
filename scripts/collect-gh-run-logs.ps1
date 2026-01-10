$final = gh run list --limit 50 2>&1
Write-Host "Run list:"
Write-Host $final
$lines = $final -split "`n"
$ids = @()
foreach ($line in $lines) {
  if ($line -match '\b(\d{6,})\b') { $ids += $matches[1] }
}
$ids = $ids | Select-Object -Unique
if (-not $ids) { Write-Host "No run IDs found"; exit 0 }
foreach ($id in $ids) {
  Write-Host "\n==== Collecting run $id ===="
  $logfile = "logs-$id.txt"
  Write-Host "Saving console log to $logfile"
  gh run view $id --log > $logfile 2>&1
  if ($LASTEXITCODE -ne 0) { Write-Host "gh run view failed for $id (exit $LASTEXITCODE)" } else { Write-Host "Saved console log: $logfile" }

  $artdir = "artifacts-$id"
  Write-Host "Downloading artifacts (if any) to $artdir"
  gh run download $id -D $artdir 2>&1
  if ($LASTEXITCODE -ne 0) { Write-Host "No artifacts or download failed for $id" } else { Write-Host "Downloaded artifacts to $artdir" }
}
Write-Host "Done."