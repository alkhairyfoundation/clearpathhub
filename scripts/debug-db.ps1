$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
}

Write-Host '=== Checking Tables ===' -ForegroundColor Cyan

try {
    $r = Invoke-RestMethod -Uri 'https://ndfrozgfzohkoyepoein.supabase.co/rest/v1/information_schema.tables?table_schema=eq.public&select=table_name' -Method Get -Headers $headers -TimeoutSec 10
    Write-Host "Found $($r.Count) tables:"
    foreach ($t in $r) {
        Write-Host "  - $($t.table_name)"
    }
} catch {
    Write-Host "Error: $_"
}

Write-Host ''
Write-Host '=== Checking auth.users ===' -ForegroundColor Cyan
try {
    $users = Invoke-RestMethod -Uri 'https://ndfrozgfzohkoyepoein.supabase.co/rest/v1/users?select=id,email' -Method Get -Headers $headers
    Write-Host "Found $($users.Count) users:"
    foreach ($u in $users) {
        Write-Host "  - $($u.email)"
    }
} catch {
    Write-Host "Error checking users: $_"
}