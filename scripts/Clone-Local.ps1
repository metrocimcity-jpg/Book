<#
.SYNOPSIS
  Clone Book (and optionally other Metropolitan CIM repos) onto this machine.

.PARAMETER Root
  Parent folder for clones. Default matches the local library layout: D:\@LIB

.PARAMETER All
  Also clone the other public Metropolitan CIM repositories next to Book.

.PARAMETER Repo
  Extra repository names under github.com/metrocimcity-jpg to clone.
#>
[CmdletBinding()]
param(
    [string] $Root = 'D:\@LIB',
    [switch] $All,
    [string[]] $Repo = @()
)

$ErrorActionPreference = 'Stop'

$owner = 'metrocimcity-jpg'
$core = @('Book')
$siblings = @(
    'MetroCIM',
    'MetroBI',
    'Web',
    'City',
    'PyroBIM',
    'Alita',
    'Atlas',
    'CircoBIM',
    'PowerBIM',
    'Graph',
    'COBieAutomation',
    'RevitAddins'
)

$names = [System.Collections.Generic.List[string]]::new()
foreach ($name in $core) { [void]$names.Add($name) }
if ($All) {
    foreach ($name in $siblings) { [void]$names.Add($name) }
}
foreach ($name in $Repo) {
    if (-not [string]::IsNullOrWhiteSpace($name)) {
        [void]$names.Add($name.Trim())
    }
}

$unique = [System.Collections.Generic.List[string]]::new()
$seen = @{}
foreach ($name in $names) {
    if (-not $seen.ContainsKey($name)) {
        $seen[$name] = $true
        [void]$unique.Add($name)
    }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'git is not on PATH. Install Git for Windows first.'
}

New-Item -ItemType Directory -Force -Path $Root | Out-Null
$Root = (Resolve-Path $Root).Path

foreach ($name in $unique) {
    $dest = Join-Path $Root $name
    $url = "https://github.com/$owner/$name.git"

    if (Test-Path (Join-Path $dest '.git')) {
        Write-Host "Updating $name in $dest"
        git -C $dest pull --ff-only
        if ($LASTEXITCODE -ne 0) { throw "git pull failed for $name" }
        continue
    }

    if (Test-Path $dest) {
        throw "Refusing to clone $name: $dest exists and is not a git repo."
    }

    Write-Host "Cloning $url -> $dest"
    git clone $url $dest
    if ($LASTEXITCODE -ne 0) { throw "git clone failed for $name" }
}

Write-Host "Local clones are under $Root"
Write-Host "Book: $(Join-Path $Root 'Book')"
