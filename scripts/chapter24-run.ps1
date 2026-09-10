param([ValidateSet('chrome','firefox','webkit')][string[]]$Engines=@('chrome','firefox','webkit'))
$ErrorActionPreference='Stop'
if ($env:AUTH_BASE_URL -ne 'http://haldus.localhost:3108') { throw 'Set AUTH_BASE_URL to the dedicated local G03 test origin first.' }
if (-not (Test-Path -LiteralPath 'scripts/acceptance-g03-fixture.ts')) { throw 'Run from the broneering.info repository root.' }
if (Test-Path -LiteralPath 'output/playwright/acceptance-g03/fixture.json') { throw 'A shared G03 fixture already exists; finish and clean that run first.' }
$directory='output/playwright/chapter24'
New-Item -ItemType Directory -Force -Path $directory | Out-Null
foreach($engine in $Engines) {
 try {
  node --env-file=.env.local --import tsx scripts/acceptance-g03-fixture.ts variants
  if ($LASTEXITCODE -ne 0) { throw 'Fixture seed failed' }
  node --env-file=.env.local --import tsx scripts/chapter24-fixture.ts prepare
  if ($LASTEXITCODE -ne 0) { throw 'Chapter 24 preparation failed' }
  $fixture=Get-Content output/playwright/acceptance-g03/fixture.json -Raw | ConvertFrom-Json
  npx --yes --package @playwright/cli playwright-cli -s=chapter24 open http://haldus.localhost:3108 --browser $engine
  if ($LASTEXITCODE -ne 0) { throw 'Browser launch failed' }
  foreach($phase in @('public','concurrency','admin')) {
   $source=if($phase -eq 'concurrency'){'scripts/acceptance-g03-admin-concurrency.js'}else{"scripts/chapter24-$phase.js"}
   $script=(Get-Content $source -Raw).Replace('__ENGINE__',$engine).Replace('__DAY__',$fixture.day).Replace('__CLOSED_DAY__',$fixture.chapter24.closedDay).Replace('__PUBLIC_URL__',('http://'+$fixture.tenants[0].slug+'.localhost:3108')).Replace('__ARCHIVED_STAFF__',$fixture.tenants[0].staff[0]).Replace('__SERVICE__',$fixture.tenants[0].service)
   $script | Set-Content "$directory/$phase-run.js"
   npx --yes --package @playwright/cli playwright-cli -s=chapter24 run-code --filename "$directory/$phase-run.js" *> "$directory/$engine-$phase.log"
   if ($LASTEXITCODE -ne 0) { throw "$engine $phase process failed" }
   $line=Get-Content "$directory/$engine-$phase.log" | Where-Object { $_.StartsWith('{"engine"') } | Select-Object -First 1
   if (-not $line) { throw "$engine $phase did not produce a result; inspect its log" }
   $result=$line | ConvertFrom-Json
   if (-not $result.pass -or @($result.results | Where-Object { -not $_.pass }).Count -gt 0) { throw "$engine $phase assertions failed" }
   Write-Output "$engine $phase passed: $($result.results.Count) checks"
   if($phase -eq 'concurrency'){Copy-Item -LiteralPath "output/playwright/acceptance-g03/$engine-admin-conflict.png" -Destination "$directory/$engine-admin-conflict.png"}
  }
  node --env-file=.env.local --import tsx scripts/chapter24-fixture.ts proof $engine
  if ($LASTEXITCODE -ne 0) { throw "$engine database proof failed" }
 } finally {
  npx --yes --package @playwright/cli playwright-cli -s=chapter24 close
  if (Test-Path -LiteralPath 'output/playwright/acceptance-g03/fixture.json') {
   $fixture=Get-Content output/playwright/acceptance-g03/fixture.json -Raw | ConvertFrom-Json
   if ($fixture.chapter24) {
    node --env-file=.env.local --import tsx scripts/chapter24-fixture.ts before-cleanup
    if ($LASTEXITCODE -ne 0) { throw 'Chapter 24 cleanup preparation failed' }
   }
   node --env-file=.env.local --import tsx scripts/acceptance-g03-fixture.ts cleanup
   if ($LASTEXITCODE -ne 0) { throw 'Shared fixture cleanup failed' }
   Copy-Item -LiteralPath 'output/playwright/acceptance-g03/cleanup.json' -Destination "$directory/$engine-cleanup.json"
  }
 }
}
