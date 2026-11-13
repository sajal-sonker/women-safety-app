$ErrorActionPreference='Stop'
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$configPath=Join-Path $repoRoot '.local/vpn.json'
if(!(Test-Path -LiteralPath $configPath)){throw 'Run scripts/setup-private-vpn.ps1 after Tailscale sign-in first.'}
$config=Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
$origin=[Uri]$config.api_origin
if($config.private_only -ne $true -or $origin.Scheme -ne 'https' -or $origin.Host -notmatch '^[a-z0-9][a-z0-9.-]*\.ts\.net$' -or $origin.UserInfo -or $origin.Query -or $origin.Fragment -or $origin.AbsolutePath -ne '/'){throw 'Expected this PC private HTTPS Tailscale origin.'}
Push-Location (Join-Path $repoRoot 'apps/mobile/android')
try{
 $ErrorActionPreference='Continue'
 & ./gradlew.bat ':app:assembleDemo' "-PapiBaseUrl=$($config.api_origin)" '-PfirebaseProjectId=demo-surakshaai' '-PreactNativeArchitectures=arm64-v8a' '--console=plain'
 if($LASTEXITCODE -ne 0){throw 'VPN-configured Demo APK build failed.'}
 Write-Output 'Aegis Demo built for the private PC endpoint. Publish only this APK using setup-private-vpn.ps1 -PublishApk, then install it on both phones.'
}finally{Pop-Location}
