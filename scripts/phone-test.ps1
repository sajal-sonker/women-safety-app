param([string]$DeviceId='', [switch]$Install)
$ErrorActionPreference='Stop'
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$adbCommand=Get-Command adb -ErrorAction SilentlyContinue
if($adbCommand){$adbPath=$adbCommand.Source}
elseif($env:ANDROID_HOME -and (Test-Path -LiteralPath (Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe'))){$adbPath=Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe'}
elseif(Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe')){$adbPath=Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'}
else{throw 'Install Android platform-tools or set ANDROID_HOME.'}
$devices=@(& $adbPath devices | Select-Object -Skip 1 | Where-Object {$_ -match '^\S+\s+device$'} | ForEach-Object {($_ -split '\s+')[0]})
if(!$DeviceId){if($devices.Count -ne 1){throw 'Connect and authorize exactly one USB phone, or pass -DeviceId from adb devices.'};$DeviceId=$devices[0]}
if($DeviceId -notin $devices){throw 'Selected phone is not connected/authorized. Accept its USB debugging prompt.'}
foreach($port in @(4001,9099)){
 & $adbPath -s $DeviceId reverse "tcp:$port" "tcp:$port"
 if($LASTEXITCODE -ne 0){throw "Could not map local test port $port"}
}
if($Install){
 $apk=Join-Path $repoRoot 'apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk'
 if(!(Test-Path -LiteralPath $apk)){throw 'Build the demo APK with -PapiBaseUrl=http://127.0.0.1:4001 first.'}
 & $adbPath -s $DeviceId install -r $apk
 if($LASTEXITCODE -ne 0){throw 'APK installation failed.'}
}
Write-Output 'USB API/Auth mappings ready. Keep local Auth/API/worker running and open SurakshaAI Demo. Receiver: Contacts > Inbox in the same app; browser is optional.'
Write-Output 'Use only simulated alerts. Do not dial112 or send real emergency messages during testing.'
