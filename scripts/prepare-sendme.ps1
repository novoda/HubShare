$ErrorActionPreference='Stop'
$target=((rustc -vV | Select-String '^host: ') -replace '^host: ','').Trim()
if ($target -notlike '*windows*') { throw 'Windows build required' }
cargo install sendme --version 0.37.1 --locked
if ($LASTEXITCODE -ne 0) { throw 'Sendme compilation failed' }
$source=Join-Path $env:USERPROFILE '.cargo\bin\sendme.exe'
if (-not (Test-Path $source)) { throw 'sendme.exe missing after cargo install' }
New-Item -ItemType Directory -Force 'src-tauri/binaries' | Out-Null
Copy-Item $source "src-tauri/binaries/sendme-$target.exe" -Force
