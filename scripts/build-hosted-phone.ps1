param(
 [Parameter(Mandatory=$true)][string]$ApiBaseUrl,
 [Parameter(Mandatory=$true)][string]$FirebaseConfigPath
)
$ErrorActionPreference='Stop'
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$endpoint=$null
if(![Uri]::TryCreate($ApiBaseUrl,[UriKind]::Absolute,[ref]$endpoint) -or $endpoint.Scheme -ne 'https' -or $endpoint.UserInfo -or $endpoint.Query -or $endpoint.Fragment -or $endpoint.AbsolutePath -ne '/' -or $endpoint.Host -in @('localhost','127.0.0.1')){throw 'Use the public HTTPS API origin without a path or credentials.'}
$firebaseConfig=Get-Content -Raw -LiteralPath $FirebaseConfigPath | ConvertFrom-Json
if($firebaseConfig.type -eq 'service_account'){throw 'Use the public Android google-services.json, never an Admin service-account key.'}
if($firebaseConfig.project_info.project_id -ne 'aegis-8972f'){throw 'Expected Firebase project aegis-8972f.'}
$client=@($firebaseConfig.client | Where-Object {$_.client_info.android_client_info.package_name -eq 'com.surakshaai.pilot'})
if($client.Count -ne 1){throw 'Register the Android app com.surakshaai.pilot in Firebase and download its public google-services.json.'}
$publicApiKey=$client[0].api_key[0].current_key
$publicAppId=$client[0].client_info.mobilesdk_app_id
if(!$publicApiKey -or !$publicAppId){throw 'Firebase public Android app configuration is incomplete.'}
Push-Location (Join-Path $repoRoot 'apps/mobile/android')
try{
 # Public app identifiers are deliberately build parameters; no server secret enters the APK.
 $ErrorActionPreference='Continue'
 & ./gradlew.bat ':app:assemblePilot' "-PapiBaseUrl=$($endpoint.GetLeftPart([UriPartial]::Authority))" '-PfirebaseProjectId=aegis-8972f' "-PfirebaseApiKey=$publicApiKey" "-PfirebaseAppId=$publicAppId" '-PreactNativeArchitectures=arm64-v8a' '--console=plain'
 if($LASTEXITCODE -ne 0){throw 'Hosted pilot build failed.'}
 Write-Output 'Built apps/mobile/android/app/build/outputs/apk/pilot/app-pilot.apk. This is a separate pilot installation; no USB port mappings are needed after installation.'
}finally{Pop-Location}
