param([switch]$CheckOnly,[switch]$PublishApk)
$ErrorActionPreference='Stop'
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tailscale=(Get-Command tailscale -ErrorAction SilentlyContinue).Source
if(!$tailscale){$tailscale=Join-Path $env:ProgramFiles 'Tailscale/tailscale.exe'}
if(!(Test-Path -LiteralPath $tailscale)){throw 'Install Tailscale on the PC, approve its Windows installer, then sign in.'}
$statusRaw=& $tailscale status --json
if($LASTEXITCODE -ne 0){throw 'Tailscale is unavailable. Start its Windows service and sign in.'}
$status=$statusRaw | ConvertFrom-Json
if($status.BackendState -ne 'Running'){throw 'Open Tailscale and sign in on this PC. Then connect both phones to the same personal tailnet.'}
$hostname=([string]$status.Self.DNSName).TrimEnd('.')
if($hostname -notmatch '^[a-z0-9][a-z0-9.-]*\.ts\.net$'){throw 'Enable MagicDNS in Tailscale so the PC has a .ts.net hostname.'}
$serveRaw=& $tailscale serve status --json
if($LASTEXITCODE -ne 0){throw 'Could not inspect existing private Serve configuration.'}
$serve=$serveRaw | ConvertFrom-Json
if($serve.AllowFunnel -and @($serve.AllowFunnel.PSObject.Properties | Where-Object {$_.Value -eq $true}).Count){throw 'Public Funnel is enabled. Disable it before sharing this demo; Auth emulator access must remain private.'}
$apiOrigin='https://'+$hostname
if($CheckOnly){Write-Output ('Tailscale connected. Private API origin: '+$apiOrigin);exit 0}
# Refuse to overwrite another service on our two ports.
$existingProxy=$serve.Web.($hostname+':443').Handlers.'/'.Proxy
if($serve.TCP.'443' -and $existingProxy -ne 'http://127.0.0.1:4001'){throw 'Port443 already serves another application; leave it unchanged and review the conflict.'}
if($serve.TCP.'9099' -and $serve.TCP.'9099'.TCPForward -ne '127.0.0.1:9099'){throw 'Port9099 already serves another application; leave it unchanged and review the conflict.'}
$ErrorActionPreference='Continue'
& $tailscale serve --bg --https=443 http://127.0.0.1:4001
if($LASTEXITCODE -ne 0){throw 'HTTPS Serve setup failed. Enable HTTPS certificates in Tailscale DNS settings, then retry.'}
& $tailscale serve --bg --tcp=9099 tcp://127.0.0.1:9099
if($LASTEXITCODE -ne 0){throw 'Private Auth forwarding failed. Do not publish the emulator using Funnel or router port forwarding.'}
$ErrorActionPreference='Stop'
if($PublishApk){
 $apk=Join-Path $repoRoot 'apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk'
 if(!(Test-Path -LiteralPath $apk)){throw 'Build the VPN-configured APK first.'}
 if($serve.TCP.'8443' -and $serve.Web.($hostname+':8443').Handlers.'/'.Proxy -ne 'http://127.0.0.1:4002'){throw 'Port8443 already serves another application; leave it unchanged and review the conflict.'}
 & $tailscale serve --bg --https=8443 http://127.0.0.1:4002
 if($LASTEXITCODE -ne 0){throw 'Private APK download sharing failed.'}
}
New-Item -ItemType Directory -Force -Path (Join-Path $repoRoot '.local') | Out-Null
$config=@{api_origin=$apiOrigin;auth_port=9099;apk_url=($apiOrigin+':8443/aegis-demo.apk');firebase_project='demo-surakshaai';private_only=$true}
[IO.File]::WriteAllText((Join-Path $repoRoot '.local/vpn.json'),($config | ConvertTo-Json),(New-Object Text.UTF8Encoding($false)))
Write-Output ('Private API: '+$apiOrigin)
if($PublishApk){Write-Output ('Private APK download: '+$config.apk_url)}
Write-Output 'Keep the PC and local services running, and Tailscale connected on both phones. No public Funnel was enabled.'
