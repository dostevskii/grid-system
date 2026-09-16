Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Official, version-pinned binaries for Grid System. This script intentionally
# keeps its network inputs here so each asset can be reproduced and checked.
$root = Split-Path -Parent $PSScriptRoot
$fonts = Join-Path $root 'public/fonts'
$notices = Join-Path $root 'public/font-notices'
New-Item -ItemType Directory -Force -Path $fonts, $notices | Out-Null

function Get-File([string]$Uri, [string]$RelativePath, [bool]$IsFont = $true) {
  $destination = Join-Path $root $RelativePath
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
  Invoke-WebRequest -Uri $Uri -OutFile $destination -UseBasicParsing
  if ((Get-Item -LiteralPath $destination).Length -lt 64) { throw "Downloaded file is unexpectedly small: $Uri" }
  if ($IsFont) {
    $magic = [System.IO.File]::ReadAllBytes($destination)[0..3]
    if ([System.Text.Encoding]::ASCII.GetString($magic) -ne 'wOF2') { throw "Not a WOFF2 file: $Uri" }
  }
  return (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
}

$webfonts = @(
  @{ id = 'pretendard'; version = '1.3.9'; url = 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/woff2/PretendardVariable.woff2'; file = 'public/fonts/pretendard/PretendardVariable.woff2'; notice = 'https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/LICENSE'; noticeFile = 'public/font-notices/Pretendard-OFL-1.1.txt' },
  @{ id = 'wanted-sans'; version = '1.0.3'; url = 'https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/complete/woff2/WantedSansVariable.woff2'; file = 'public/fonts/wanted-sans/WantedSansVariable.woff2'; notice = 'https://raw.githubusercontent.com/wanteddev/wanted-sans/v1.0.3/OFL.txt'; noticeFile = 'public/font-notices/WantedSans-OFL-1.1.txt' },
  @{ id = 'yeolrin-gothic-light'; version = '1.0.0'; url = 'https://raw.githubusercontent.com/hyunbinseo/yeolrin/v1.0.0/YeolrinGothic-Light.woff2'; file = 'public/fonts/yeolrin/YeolrinGothic-Light.woff2' },
  @{ id = 'yeolrin-gothic-medium'; version = '1.0.0'; url = 'https://raw.githubusercontent.com/hyunbinseo/yeolrin/v1.0.0/YeolrinGothic-Medium.woff2'; file = 'public/fonts/yeolrin/YeolrinGothic-Medium.woff2' },
  @{ id = 'yeolrin-gothic-bold'; version = '1.0.0'; url = 'https://raw.githubusercontent.com/hyunbinseo/yeolrin/v1.0.0/YeolrinGothic-Bold.woff2'; file = 'public/fonts/yeolrin/YeolrinGothic-Bold.woff2' },
  @{ id = 'yeolrin-myeongjo-light'; version = '1.0.0'; url = 'https://raw.githubusercontent.com/hyunbinseo/yeolrin/v1.0.0/YeolrinMyeongjo-Light.woff2'; file = 'public/fonts/yeolrin/YeolrinMyeongjo-Light.woff2' },
  @{ id = 'yeolrin-myeongjo-medium'; version = '1.0.0'; url = 'https://raw.githubusercontent.com/hyunbinseo/yeolrin/v1.0.0/YeolrinMyeongjo-Medium.woff2'; file = 'public/fonts/yeolrin/YeolrinMyeongjo-Medium.woff2' },
  @{ id = 'yeolrin-myeongjo-bold'; version = '1.0.0'; url = 'https://raw.githubusercontent.com/hyunbinseo/yeolrin/v1.0.0/YeolrinMyeongjo-Bold.woff2'; file = 'public/fonts/yeolrin/YeolrinMyeongjo-Bold.woff2' }
)

$hashes = @()
foreach ($font in $webfonts) {
  $hashes += [pscustomobject]@{ id = $font.id; version = $font.version; path = $font.file; sha256 = Get-File $font.url $font.file }
  if ($font.ContainsKey('notice')) { Get-File $font.notice $font.noticeFile $false | Out-Null }
}

# Google Fonts' CSS endpoint returns official, browser-ready WOFF2 subset files.
# Keep the generated CSS beside the assets; it retains Unicode ranges and points
# only at locally hosted files.
$google = @{
  'libre-baskerville' = 'Libre+Baskerville:ital,wght@0,400;0,700;1,400';
  'eb-garamond' = 'EB+Garamond:ital,wght@0,400..800;1,400..800';
  'cormorant' = 'Cormorant:ital,wght@0,300..700;1,300..700';
  'inter' = 'Inter:opsz,wght@14..32,100..900';
  'montserrat' = 'Montserrat:ital,wght@0,100..900;1,100..900';
  'lato' = 'Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900';
  'oswald' = 'Oswald:wght@200..700';
  'outfit' = 'Outfit:wght@100..900';
}
$googleRepositoryDirectories = @{ 'libre-baskerville' = 'librebaskerville'; 'eb-garamond' = 'ebgaramond' }
foreach ($entry in $google.GetEnumerator()) {
  $id = $entry.Key
  $dir = Join-Path $fonts "google/$id"
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $cssUri = 'https://fonts.googleapis.com/css2?family=' + $entry.Value + '&display=swap'
  $css = (Invoke-WebRequest -Uri $cssUri -UseBasicParsing -UserAgent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36').Content
  $matches = [regex]::Matches($css, 'url\((https://[^)]+)\)')
  if ($matches.Count -eq 0) { throw "No WOFF2 assets returned for $id" }
  $index = 0
  foreach ($match in $matches) {
    $local = "public/fonts/google/$id/$id-$index.woff2"
    $hashes += [pscustomobject]@{ id = $id; version = 'Google Fonts CSS2 (2026-09-16)'; path = $local; sha256 = Get-File $match.Groups[1].Value $local }
    $css = $css.Replace($match.Groups[1].Value, "/fonts/google/$id/$id-$index.woff2")
    $index++
  }
  Set-Content -LiteralPath (Join-Path $dir "$id.css") -Value $css -NoNewline -Encoding utf8
  $repositoryDirectory = if ($googleRepositoryDirectories.ContainsKey($id)) { $googleRepositoryDirectories[$id] } else { $id }
  Get-File "https://raw.githubusercontent.com/google/fonts/main/ofl/$repositoryDirectory/OFL.txt" "public/font-notices/$id-OFL-1.1.txt" $false | Out-Null
}
$hashes | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $fonts 'ASSET-SHA256.json') -Encoding utf8
