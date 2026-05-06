$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
    'Content-Type' = 'application/json'
}

# Create admin profile
$body = '{
    "id": "00ec7539-113e-49c1-b022-ff696fdd9283",
    "email": "admin@clearpatheduhub.com",
    "first_name": "System",
    "last_name": "Administrator",
    "role": "admin",
    "phone": "+1234567890"
}'

try {
    $r = Invoke-RestMethod -Uri 'https://ndfrozgfzohkoyepoein.supabase.co/rest/v1/profiles' -Method POST -Headers $headers -Body $body
    Write-Host 'Admin profile created successfully!' -ForegroundColor Green
} catch {
    if ($_.Exception.Message -like '*duplicate*') {
        Write-Host 'Profile already exists - this is OK!' -ForegroundColor Yellow
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Check if admin exists
$r2 = Invoke-RestMethod -Uri 'https://ndfrozgfzohkoyepoein.supabase.co/rest/v1/profiles?email=eq.admin@clearpatheduhub.com' -Method GET -Headers $headers
if ($r2) {
    Write-Host ''
    Write-Host 'Admin user found in database!' -ForegroundColor Green
    Write-Host "  Email: $($r2[0].email)" -ForegroundColor White
    Write-Host "  Role: $($r2[0].role)" -ForegroundColor White
    Write-Host "  Name: $($r2[0].first_name) $($r2[0].last_name)" -ForegroundColor White
} else {
    Write-Host 'No admin user found' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '=====================================' -ForegroundColor Cyan
Write-Host 'DEFAULT LOGIN CREDENTIALS:' -ForegroundColor Cyan
Write-Host '=====================================' -ForegroundColor Cyan
Write-Host 'URL: http://localhost:3000/login' -ForegroundColor White
Write-Host 'Email: admin@clearpatheduhub.com' -ForegroundColor White
Write-Host 'Password: Admin@123' -ForegroundColor White