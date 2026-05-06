$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
}

Write-Host 'Testing direct table access...' -ForegroundColor Cyan

# Try profiles table directly
try {
    $r = Invoke-RestMethod -Uri 'https://ndfrozgfzohkoyepoein.supabase.co/rest/v1/profiles?limit=1' -Method Get -Headers $headers
    Write-Host '[OK] profiles table accessible' -ForegroundColor Green
} catch {
    Write-Host \"[ERROR] profiles: $($_.Exception.Message)\" -ForegroundColor Red
}

# Try departments
try {
    $r = Invoke-RestMethod -Uri 'https://ndfrozgfzohkoyepoein.supabase.co/rest/v1/departments?limit=1' -Method Get -Headers $headers
    Write-Host '[OK] departments table accessible' -ForegroundColor Green
} catch {
    Write-Host \"[ERROR] departments: $($_.Exception.Message)\" -ForegroundColor Red
}

# Try school_settings
try {
    $r = Invoke-RestMethod -Uri 'https://ndfrozgfzohkoyepoein.supabase.co/rest/v1/school_settings?limit=1' -Method Get -Headers $headers
    Write-Host '[OK] school_settings table accessible' -ForegroundColor Green
} catch {
    Write-Host \"[ERROR] school_settings: $($_.Exception.Message)\" -ForegroundColor Red
}

# Try classes
try {
    $r = Invoke-RestMethod -Uri 'https://ndfrozgfzohkoyepoein.supabase.co/rest/v1/classes?limit=1' -Method Get -Headers $headers
    Write-Host '[OK] classes table accessible' -ForegroundColor Green
} catch {
    Write-Host \"[ERROR] classes: $($_.Exception.Message)\" -ForegroundColor Red
}

# Check auth.users
try {
    $r = Invoke-RestMethod -Uri 'https://ndfrozgfzohkoyepoein.supabase.co/auth/v1/users' -Method Get -Headers $headers
    Write-Host '[OK] auth.users accessible' -ForegroundColor Green
    Write-Host \"  Users: $($r.Count)\"
} catch {
    Write-Host \"[ERROR] auth.users: $($_.Exception.Message)\" -ForegroundColor Red
}