param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [Parameter(Mandatory = $true)]
  [string]$SupabaseAccessToken,

  [Parameter(Mandatory = $true)]
  [string]$ResendApiKey,

  [Parameter(Mandatory = $false)]
  [string]$RecruiterEmailFrom = "AGTA Management <noreply@athletesglobaltalentagency.com>",

  [Parameter(Mandatory = $false)]
  [string]$TestRecipient = ""
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

function Normalize-EnvValue {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  $v = $Value.Trim()
  if ($v.StartsWith('"') -and $v.EndsWith('"')) {
    $v = $v.Substring(1, $v.Length - 2)
  }
  return $v.TrimEnd('/')
}

Write-Host "[1/8] Checking prerequisites..." -ForegroundColor Cyan
Require-Command "supabase"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path ".\SETUP_RECRUITER_EMAIL_LOGS.sql")) {
  throw "Missing file: SETUP_RECRUITER_EMAIL_LOGS.sql"
}

if (-not (Test-Path ".\supabase\functions\recruiter-email-send\index.ts")) {
  throw "Missing file: supabase/functions/recruiter-email-send/index.ts"
}

Write-Host "[2/8] Authenticating Supabase CLI..." -ForegroundColor Cyan
$env:SUPABASE_ACCESS_TOKEN = $SupabaseAccessToken

Write-Host "[3/8] Linking project $ProjectRef..." -ForegroundColor Cyan
supabase link --project-ref $ProjectRef | Out-Host

Write-Host "[4/8] Creating migration from SETUP_RECRUITER_EMAIL_LOGS.sql..." -ForegroundColor Cyan
$migrationsDir = Join-Path $repoRoot "supabase\migrations"
if (-not (Test-Path $migrationsDir)) {
  New-Item -ItemType Directory -Path $migrationsDir | Out-Null
}

$ts = Get-Date -Format "yyyyMMddHHmmss"
$migrationPath = Join-Path $migrationsDir "${ts}_setup_recruiter_email_logs.sql"
Copy-Item ".\SETUP_RECRUITER_EMAIL_LOGS.sql" $migrationPath -Force
Write-Host "Created migration: $migrationPath" -ForegroundColor DarkGray

Write-Host "[5/8] Pushing database migration..." -ForegroundColor Cyan
supabase db push | Out-Host

Write-Host "[6/8] Deploying edge function recruiter-email-send..." -ForegroundColor Cyan
supabase functions deploy recruiter-email-send | Out-Host

Write-Host "[7/8] Setting function secrets..." -ForegroundColor Cyan
supabase secrets set RESEND_API_KEY="$ResendApiKey" RECRUITER_EMAIL_FROM="$RecruiterEmailFrom" | Out-Host

Write-Host "[8/8] Optional live test invoke..." -ForegroundColor Cyan
if ([string]::IsNullOrWhiteSpace($TestRecipient)) {
  Write-Host "Skipped test invoke (no -TestRecipient provided)." -ForegroundColor Yellow
} else {
  # Read anon key from .env for authenticated invoke.
  $envFile = Join-Path $repoRoot ".env"
  $supabaseAnonKey = ""
  $supabaseUrlFromEnv = ""

  if (Test-Path $envFile) {
    $lines = Get-Content $envFile
    foreach ($line in $lines) {
      if ($line -match '^VITE_SUPABASE_URL=(.+)$') { $supabaseUrlFromEnv = Normalize-EnvValue $Matches[1] }
      if ($line -match '^VITE_SUPABASE_ANON_KEY=(.+)$') { $supabaseAnonKey = Normalize-EnvValue $Matches[1] }
    }
  }

  if ([string]::IsNullOrWhiteSpace($supabaseAnonKey)) {
    Write-Host "Could not read VITE_SUPABASE_ANON_KEY from .env. Skipping live invoke." -ForegroundColor Yellow
  } else {
    $projectFunctionsUrl = "https://$ProjectRef.functions.supabase.co/recruiter-email-send"
    $apiFunctionsUrl = ""
    if (-not [string]::IsNullOrWhiteSpace($supabaseUrlFromEnv)) {
      $apiFunctionsUrl = "$supabaseUrlFromEnv/functions/v1/recruiter-email-send"
    } else {
      $apiFunctionsUrl = "https://$ProjectRef.supabase.co/functions/v1/recruiter-email-send"
    }

    $invokeCandidates = @($projectFunctionsUrl, $apiFunctionsUrl)

    $body = @{
      recruiter_id = 0
      to = $TestRecipient
      company = "AGTA Test"
      contact_name = "Test Contact"
      template = "onboarding"
    } | ConvertTo-Json -Depth 4

    $headers = @{
      "Authorization" = "Bearer $supabaseAnonKey"
      "apikey" = $supabaseAnonKey
      "Content-Type" = "application/json"
    }

    $success = $false
    foreach ($invokeUrl in $invokeCandidates) {
      try {
        Write-Host "Trying invoke URL: $invokeUrl" -ForegroundColor DarkGray
        $resp = Invoke-RestMethod -Method Post -Uri $invokeUrl -Headers $headers -Body $body
        Write-Host "Test invoke response:" -ForegroundColor Green
        $resp | ConvertTo-Json -Depth 5 | Out-Host
        $success = $true
        break
      } catch {
        Write-Host "Invoke failed on $invokeUrl: $($_.Exception.Message)" -ForegroundColor Yellow
      }
    }

    if (-not $success) {
      throw "Live invoke failed on all candidate URLs. Verify function deployment and project ref."
    }
  }
}

Write-Host "Done. Recruiter email pipeline is configured." -ForegroundColor Green
Write-Host "Next: open dashboard Recruteurs and send a template email to verify UI flow." -ForegroundColor Green
