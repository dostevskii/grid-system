param([switch]$Create)

$ErrorActionPreference = 'Stop'
$projectName = 'grid-system'
if (-not $env:CLOUDFLARE_API_TOKEN -or -not $env:CLOUDFLARE_ACCOUNT_ID) {
  throw 'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set in the process environment. Never put credentials in the repository.'
}
$cfHeaders = @{ Authorization = "Bearer $env:CLOUDFLARE_API_TOKEN" }
$projectUri = "https://api.cloudflare.com/client/v4/accounts/$env:CLOUDFLARE_ACCOUNT_ID/pages/projects/$projectName"
if ($Create) {
  $repoInfo = gh api repos/dostevskii/grid-system | ConvertFrom-Json
  if (-not $repoInfo.private -or $repoInfo.full_name -ne 'dostevskii/grid-system') {
    throw 'The expected private GitHub repository was not verified.'
  }
  $payload = @{
    name = $projectName
    production_branch = 'main'
    build_config = @{ build_command = 'npm run build'; destination_dir = 'dist'; root_dir = '/'; build_caching = $true }
    deployment_configs = @{
      production = @{ env_vars = @{ NODE_VERSION = @{ type = 'plain_text'; value = '22.15.0' } } }
      preview = @{ env_vars = @{ NODE_VERSION = @{ type = 'plain_text'; value = '22.15.0' } } }
    }
    source = @{
      type = 'github'
      config = @{
        owner = 'dostevskii'; owner_id = [string]$repoInfo.owner.id
        repo_name = 'grid-system'; repo_id = [string]$repoInfo.id
        production_branch = 'main'; production_deployments_enabled = $true
        preview_deployment_setting = 'none'; pr_comments_enabled = $false
      }
    }
  }
  try {
    $created = Invoke-RestMethod -Method Post -Uri ($projectUri -replace '/grid-system$', '') -Headers $cfHeaders -ContentType 'application/json' -Body ($payload | ConvertTo-Json -Depth 12)
    if (-not $created.success) { throw 'Cloudflare did not confirm project creation.' }
    [pscustomobject]@{ Name = $created.result.name; Domain = $created.result.subdomain; Source = $created.result.source.type; Created = $true }
  } catch {
    if ($_.ErrorDetails.Message) { Write-Output $_.ErrorDetails.Message }
    throw 'Pages Git integration creation failed; check the reported error and repository access. Credentials were not logged.'
  }
} else {
  $project = Invoke-RestMethod -Uri $projectUri -Headers $cfHeaders
  $deployments = Invoke-RestMethod -Uri "$projectUri/deployments" -Headers $cfHeaders
  [pscustomobject]@{ Name = $project.result.name; Domain = $project.result.subdomain; Source = $project.result.source.type }
  $deployments.result | Select-Object -First 3 id, environment, url, @{Name='Status';Expression={$_.latest_stage.status}}, @{Name='Stage';Expression={$_.latest_stage.name}}, @{Name='Commit';Expression={$_.deployment_trigger.metadata.commit_hash}}
}
