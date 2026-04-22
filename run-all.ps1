$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
if (-not $root) {
  $root = (Get-Location).Path
}

function Start-ServiceWindow {
  param(
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][string]$WorkingDir,
    [Parameter(Mandatory=$true)][string]$Command
  )

  $escapedDir = $WorkingDir.Replace("'", "''")
  $escapedTitle = $Title.Replace("'", "''")
  $script = "Set-Location -LiteralPath '$escapedDir'; `$Host.UI.RawUI.WindowTitle='$escapedTitle'; $Command"

  Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-Command", $script) | Out-Null
}

function Wait-HttpOk {
  param(
    [Parameter(Mandatory=$true)][string]$Url,
    [int]$Seconds = 40
  )
  for ($i = 0; $i -lt $Seconds; $i++) {
    try {
      Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 2 -ErrorAction Stop | Out-Null
      return $true
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  return $false
}

function Test-RoutePresent {
  param(
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$true)][string]$Name
  )

  try {
    Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 3 -ErrorAction Stop | Out-Null
    Write-Host "$Name route reachable." -ForegroundColor Green
    return
  } catch {
    try {
      $status = $_.Exception.Response.StatusCode.value__
    } catch {
      $status = $null
    }

    if ($status -eq 401 -or $status -eq 403) {
      # Expected for protected routes without token.
      Write-Host "$Name route is present (auth required)." -ForegroundColor Green
      return
    }

    if ($status -eq 404) {
      Write-Host "$Name route returned 404. Backend may be running an older process. Restart backend." -ForegroundColor Yellow
      return
    }

    Write-Host "$Name route check failed: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

function Ensure-PortFree {
  param(
    [Parameter(Mandatory=$true)][int]$Port,
    [Parameter(Mandatory=$true)][string]$Name
  )

  $pids = @()
  try {
    $netstat = netstat -ano -p tcp 2>$null
    foreach ($line in $netstat) {
      if ($line -notmatch "LISTENING") { continue }
      $parts = $line -split "\s+" | Where-Object { $_ -ne "" }
      if ($parts.Count -lt 5) { continue }
      $local = $parts[1]
      $pid = $parts[-1]
      if ($local -match "[:\]]$Port$") {
        if ($pid -match "^\d+$") { $pids += [int]$pid }
      }
    }
  } catch {
    $pids = @()
  }

  $pids = $pids | Select-Object -Unique | Where-Object { $_ -and $_ -gt 0 }
  if (-not $pids -or $pids.Count -eq 0) {
    return
  }

  Write-Host ""
  Write-Host "$Name port $Port is already in use (PID(s): $($pids -join ', '))." -ForegroundColor Yellow
  $answer = Read-Host "Stop these process(es) to restart $Name? (Y/N)"
  if ($answer -notin @("Y", "y", "Yes", "YES")) {
    Write-Host "Keeping existing process. $Name may not start correctly." -ForegroundColor Yellow
    return
  }

  foreach ($pid in $pids) {
    try {
      Stop-Process -Id $pid -Force -ErrorAction Stop
      Write-Host "Stopped PID $pid on port $Port." -ForegroundColor Green
    } catch {
      Write-Host "Failed to stop PID $pid: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

Write-Host "Starting Predictive Maintenance services..." -ForegroundColor Cyan

$mlDir = Join-Path $root "ml-api"
$beDir = Join-Path $root "backend"
$feDir = Join-Path $root "frontend"

Ensure-PortFree -Port 8000 -Name "ML API"
Ensure-PortFree -Port 5000 -Name "Backend API"
Ensure-PortFree -Port 5173 -Name "Frontend (Vite)"

Start-ServiceWindow -Title "ML API" -WorkingDir $mlDir -Command ".\.venv\Scripts\python.exe app\main.py"
if (-not (Wait-HttpOk -Url "http://127.0.0.1:8000/health" -Seconds 25)) {
  Write-Host "ML API not ready yet (still starting). Continue anyway." -ForegroundColor Yellow
}

Start-ServiceWindow -Title "Backend API" -WorkingDir $beDir -Command "npm run dev"
if (-not (Wait-HttpOk -Url "http://127.0.0.1:5000/health" -Seconds 60)) {
  Write-Host "Backend failed to start on http://127.0.0.1:5000/health." -ForegroundColor Red
  Write-Host "Fix: open the 'Backend API' window, resolve errors, then re-run .\\run-all.ps1" -ForegroundColor Yellow
  return
}
Test-RoutePresent -Url "http://127.0.0.1:5000/api/users" -Name "Users API (/api/users)"
Test-RoutePresent -Url "http://127.0.0.1:5000/api/data" -Name "Data API (/api/data)"
Test-RoutePresent -Url "http://127.0.0.1:5000/api/model/status" -Name "Model API (/api/model/status)"
Test-RoutePresent -Url "http://127.0.0.1:5000/api/alerts/rules" -Name "Alerts API (/api/alerts/rules)"

Start-ServiceWindow -Title "Frontend" -WorkingDir $feDir -Command "npm run dev"

Write-Host "Started:" -ForegroundColor Green
Write-Host "  ML API:     http://127.0.0.1:8000/health"
Write-Host "  Backend:    http://127.0.0.1:5000/health"
Write-Host "  Frontend:   http://localhost:5173"
Write-Host ""
Write-Host "If signup/login shows ERR_CONNECTION_REFUSED:" -ForegroundColor Yellow
Write-Host "  1) Make sure Backend window shows 'Backend running on port 5000'"
Write-Host "  2) Restart frontend (Vite loads .env only on start)"
