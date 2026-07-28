[CmdletBinding()]
param(
  [string]$NodeHome,
  [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$requiredNodeVersion = "v20.20.2"
$requiredPnpmVersion = "9.12.3"

function Resolve-NodeHome {
  param([string]$ExplicitNodeHome)

  if ($ExplicitNodeHome) {
    return (Resolve-Path -LiteralPath $ExplicitNodeHome).Path
  }

  $repositoryParent = Split-Path -Parent $repositoryRoot
  $workspaceParent = Split-Path -Parent $repositoryParent
  $portableCandidates = @(
    (Join-Path $repositoryParent ".tools\node-v20.20.2-win-x64"),
    (Join-Path $workspaceParent ".tools\node-v20.20.2-win-x64")
  )

  foreach ($candidate in $portableCandidates) {
    if (Test-Path -LiteralPath (Join-Path $candidate "node.exe")) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $nodeCommand) {
    throw "Node.js was not found. Install Node $requiredNodeVersion or pass -NodeHome."
  }

  return Split-Path -Parent $nodeCommand.Source
}

function Invoke-Pnpm {
  param([string[]]$Arguments)

  & $script:PnpmCommand @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

$resolvedNodeHome = Resolve-NodeHome -ExplicitNodeHome $NodeHome
$nodeCommand = Join-Path $resolvedNodeHome "node.exe"
$corepackCommand = Join-Path $resolvedNodeHome "corepack.cmd"

if (-not (Test-Path -LiteralPath $nodeCommand)) {
  throw "node.exe was not found under $resolvedNodeHome"
}
if (-not (Test-Path -LiteralPath $corepackCommand)) {
  throw "corepack.cmd was not found under $resolvedNodeHome"
}

$nodeVersion = (& $nodeCommand --version).Trim()
if ($nodeVersion -ne $requiredNodeVersion) {
  throw "VehicleOS Windows verification requires Node $requiredNodeVersion; found $nodeVersion."
}

$temporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$shimDirectory = Join-Path $temporaryRoot "vehicleos-corepack-$([guid]::NewGuid().ToString('N'))"

try {
  New-Item -ItemType Directory -Path $shimDirectory | Out-Null
  & $corepackCommand enable --install-directory $shimDirectory
  if ($LASTEXITCODE -ne 0) {
    throw "Corepack could not create pnpm shims."
  }

  $script:PnpmCommand = Join-Path $shimDirectory "pnpm.cmd"
  $env:Path = "$shimDirectory;$resolvedNodeHome;$env:Path"
  $env:CI = "true"

  $pnpmVersion = (& $script:PnpmCommand --version).Trim()
  if ($pnpmVersion -ne $requiredPnpmVersion) {
    throw "VehicleOS verification requires pnpm $requiredPnpmVersion; found $pnpmVersion."
  }

  Push-Location $repositoryRoot
  try {
    Write-Host "VehicleOS Windows verification: Node $nodeVersion, pnpm $pnpmVersion"

    if (-not $SkipInstall) {
      Invoke-Pnpm -Arguments @("install", "--frozen-lockfile")
    }

    Invoke-Pnpm -Arguments @("docs:check-links")
    Invoke-Pnpm -Arguments @("test")
    Invoke-Pnpm -Arguments @("--filter", "@vehicleos/marketing", "build")
    Invoke-Pnpm -Arguments @("--filter", "@vehicleos/web", "build")
    Invoke-Pnpm -Arguments @("typecheck")

    Write-Host "VehicleOS Windows verification passed."
  } finally {
    Pop-Location
  }
} finally {
  $resolvedShimDirectory = [System.IO.Path]::GetFullPath($shimDirectory)
  if (
    (Test-Path -LiteralPath $resolvedShimDirectory) -and
    $resolvedShimDirectory.StartsWith($temporaryRoot, [System.StringComparison]::OrdinalIgnoreCase)
  ) {
    Remove-Item -LiteralPath $resolvedShimDirectory -Recurse -Force
  }
}
