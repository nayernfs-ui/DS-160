# Push changes to main branch
cd d:\DS-160
git add public/js/script.js test-toggle-local.js
git commit -m "fix: centralized radio toggle handler for all form toggles"
git push origin main
Write-Host "✓ Changes pushed to main branch"
