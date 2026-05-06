# ClearPath Edu Hub - Seed Admin User Script
# This script creates the admin user and other test users using Supabase REST API

$supabaseUrl = "https://ndfrozgfzohkoyepoein.supabase.co"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg"

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

$defaultPassword = "Admin@123"

# Create Admin User
Write-Host "Creating admin user..." -ForegroundColor Cyan
$adminBody = @{
    email = "admin@clearpatheduhub.com"
    password = $defaultPassword
    email_confirm = $true
    user_metadata = @{
        first_name = "System"
        last_name = "Administrator"
        role = "admin"
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users" -Method POST -Headers $headers -Body $adminBody
    Write-Host "Admin user created: $($response.id)" -ForegroundColor Green
    
    # Now create profile
    $profileBody = @{
        id = $response.id
        email = "admin@clearpatheduhub.com"
        first_name = "System"
        last_name = "Administrator"
        role = "admin"
        phone = "+1234567890"
    } | ConvertTo-Json
    
    $profileHeaders = $headers.Clone()
    $profileHeaders["Content-Type"] = "application/json"
    
    $profileResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/profiles" -Method POST -Headers $profileHeaders -Body $profileBody -ErrorAction SilentlyContinue
    Write-Host "Admin profile created" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "Admin user may already exist" -ForegroundColor Yellow
    } else {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

Write-Host "`nDefault admin credentials:" -ForegroundColor Cyan
Write-Host "Email: admin@clearpatheduhub.com" -ForegroundColor White
Write-Host "Password: $defaultPassword" -ForegroundColor White