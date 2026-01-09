param(
  [string]$Repo = "nayernfs-ui/DS-160",
  [string]$Branch = "chore/vercel-promote-hardening",
  [int]$IntervalSec = 60,
  [int]$MaxAttempts = 30,
  [int]$PerPage = 10
)

$headers = @{ "User-Agent" = "DS-160-CI-Poller" }

for ($i=1; $i -le $MaxAttempts; $i++) {
  $now = Get-Date -Format o
  Write-Output "[$now] Attempt $($i)/$($MaxAttempts): querying Actions runs..."
  $url = "https://api.github.com/repos/$Repo/actions/runs?branch=$Branch&per_page=$PerPage"
  try {
    $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -ErrorAction Stop
  } catch {
    Write-Output "[$now] Request failed: $_"
    Start-Sleep -Seconds $IntervalSec
    continue
  }
  $runs = $resp.workflow_runs
  if (-not $runs) {
    Write-Output "[$now] No workflow runs found."
  } else {
    $allSucceeded = $true
    foreach ($run in $runs) {
      $name = $run.name
      $status = $run.status
      $conclusion = $run.conclusion
      $id = $run.id
      $html = $run.html_url
      Write-Output "Run $($id): $($name) - status=$($status) conclusion=$($conclusion) url=$($html)"
      if ($status -ne 'completed' -or $conclusion -ne 'success') { $allSucceeded = $false }
    }
    if ($allSucceeded) {
      Write-Output "[$now] All observed workflow runs are completed and successful. Exiting."
      exit 0
    } else {
      Write-Output "[$now] Not all runs are successful yet. Sleeping $IntervalSec s."
    }
  }
  Start-Sleep -Seconds $IntervalSec
}
Write-Output "Exceeded max attempts ($MaxAttempts). Exiting with code 2."
exit 2
