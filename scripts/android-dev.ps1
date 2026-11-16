# Windows'ta dev build (Expo dev client) derler ve bağlı telefona kurar.
# Kullanım (C:\lf-wt içinde):  powershell -ExecutionPolicy Bypass -File scripts\android-dev.ps1
# Neden gerekli: `expo run:android` bu PC'de "SDK location not found" ile CONFIGURING'de düşüyor
# (ANDROID_HOME yok, Gradle JDK 8 buluyor) ve CMake yolu Windows'un 260 karakter sınırını aşıyor.
param([switch]$NoPrebuild, [switch]$NoSuffix)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

if (-not $NoPrebuild) {
  Copy-Item package.json "$env:TEMP\package.json.bak" -Force
  npx.cmd expo prebuild --platform android --clean --no-install
  # prebuild package.json'daki scriptleri `expo run:*` yapar; geri al.
  Copy-Item "$env:TEMP\package.json.bak" package.json -Force
}

# sdk.dir (prebuild --clean siler)
$sdk = $env:ANDROID_HOME -replace '\\', '/'
Set-Content -Path android\local.properties -Value "sdk.dir=$sdk" -Encoding ascii

# CMake çıktısını kısa yola al (260 karakter sınırı). Dev build ayrı paket adıyla (com.meikai.homezy.dev) kurulur, telefondaki mağaza sürümü ve verisi bozulmaz.
$gradle = 'android\app\build.gradle'
$text = Get-Content $gradle -Raw
if ($text -notmatch 'buildStagingDirectory') {
  $text = $text -replace '(?m)^android \{', "android {`n    externalNativeBuild { cmake { buildStagingDirectory = file(`"C:/cx`") } }"
}
if (-not $NoSuffix -and $text -notmatch 'applicationIdSuffix') {
  $text = $text -replace '(?m)^(\s*)debug \{\r?\n(\s*)signingConfig', "`$1debug {`n`$2applicationIdSuffix '.dev'`n`$2signingConfig"
}
[System.IO.File]::WriteAllText((Resolve-Path $gradle), $text, (New-Object System.Text.UTF8Encoding($false)))

Push-Location android
.\gradlew.bat app:installDebug -PreactNativeArchitectures=arm64-v8a
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { Write-Host "DERLEME BASARISIZ (kod $code)" -ForegroundColor Red; exit $code }

Write-Host "`nKuruldu. Simdi Metro'yu baslat:  npx expo start --dev-client --clear" -ForegroundColor Green
Write-Host "Telefonda: adb reverse tcp:8081 tcp:8081" -ForegroundColor Green
