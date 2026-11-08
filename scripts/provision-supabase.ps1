# Creates and links the hosted Supabase project in EU Central (Frankfurt).
# Run only after confirming the Supabase organization has capacity for another active
# free project, or after upgrading the organization.
#
#   npm run supabase:provision
#
# Secrets are written to .secrets/ (gitignored) and are never printed in full.

param(
  [string]$ProjectName = "RecallPilot App",
  [string]$OrgId = "trceitlzauyxsjmvweid",
  [string]$Region = "eu-central-1"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$secretsDir = Join-Path $root ".secrets"
New-Item -ItemType Directory -Force -Path $secretsDir | Out-Null

Write-Host "Checking Supabase CLI login..."
$orgs = supabase orgs list -o json | ConvertFrom-Json
if (-not $orgs) {
  throw "No Supabase organizations found. Run `supabase login` first."
}

$projects = supabase projects list -o json | ConvertFrom-Json
$existing = $projects | Where-Object { $_.name -eq $ProjectName }
if ($existing) {
  Write-Host "Project '$ProjectName' already exists: $($existing.id)"
  $ref = $existing.id
} else {
  $factory = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
  $bytes = New-Object byte[] 24
  $factory.GetBytes($bytes)
  $factory.Dispose()
  $password = [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=')
  Set-Content -LiteralPath (Join-Path $secretsDir "supabase-db-password.txt") -Value $password -NoNewline

  Write-Host "Creating '$ProjectName' in $Region..."
  $created = supabase projects create $ProjectName --org-id $OrgId --region $Region --db-password $password 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host $created
    throw "Project creation failed. If the organization is at its active free-project limit, pause/delete a project or upgrade, then rerun this script."
  }

  Write-Host "Waiting for the project to become healthy..."
  $deadline = (Get-Date).AddMinutes(10)
  do {
    Start-Sleep -Seconds 15
    $projects = supabase projects list -o json | ConvertFrom-Json
    $match = $projects | Where-Object { $_.name -eq $ProjectName }
    $ref = $match.id
    $status = $match.status
    Write-Host "  status: $status"
  } while ($status -ne "ACTIVE_HEALTHY" -and (Get-Date) -lt $deadline)

  if (-not $ref) { throw "Project reference not found after creation." }
  if ($status -ne "ACTIVE_HEALTHY") { throw "Project did not become healthy in time. Check the Supabase dashboard." }
}

$dbPasswordFile = Join-Path $secretsDir "supabase-db-password.txt"
$dbPassword = if (Test-Path -LiteralPath $dbPasswordFile) { Get-Content -LiteralPath $dbPasswordFile -Raw } else { "" }
if (-not $dbPassword) {
  Write-Host "Database password is not stored locally. Enter it to link and push migrations."
  $secure = Read-Host "Supabase database password" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

Write-Host "Linking project $ref..."
supabase link --project-ref $ref --password $dbPassword
if ($LASTEXITCODE -ne 0) { throw "supabase link failed." }

Write-Host "Pushing migrations..."
supabase db push --password $dbPassword --include-all
if ($LASTEXITCODE -ne 0) { throw "supabase db push failed." }

Write-Host "Reading API keys..."
$keys = supabase projects api-keys --project-ref $ref -o json | ConvertFrom-Json
$anon = ($keys | Where-Object { $_.name -eq "anon" -or $_.id -eq "anon" }).api_key
$service = ($keys | Where-Object { $_.name -eq "service_role" -or $_.id -eq "service_role" }).api_key
if (-not $anon) { $anon = ($keys | Where-Object { $_.type -eq "publishable" }).api_key }
if (-not $service) { $service = ($keys | Where-Object { $_.type -eq "secret" }).api_key }

$envFile = Join-Path $secretsDir "supabase.env"
@"
# Hosted Supabase settings. Merge into .env.local; do not commit.
AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://$ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon
SUPABASE_SERVICE_ROLE_KEY=$service
SUPABASE_PROJECT_REF=$ref
SUPABASE_DB_PASSWORD=$dbPassword
SUPABASE_STORAGE_BUCKET=imports
STORAGE_DRIVER=supabase
DATABASE_SSL=true
# Direct connection. Replace with the Supabase pooler URL for serverless web hosting.
DATABASE_URL=postgresql://postgres:$dbPassword@db.$ref.supabase.co:5432/postgres
"@ | Set-Content -LiteralPath $envFile -Encoding UTF8

Write-Host ""
Write-Host "Done. Project ref: $ref"
Write-Host "Settings written to $envFile (gitignored)."
Write-Host "Next: merge the settings into .env.local, set EMAIL_PROVIDER=resend and RESEND_API_KEY,"
Write-Host "then run: npm run typecheck; npm run test:db; npm run build"
