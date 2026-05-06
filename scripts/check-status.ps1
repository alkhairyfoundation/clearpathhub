$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
}

Write-Host '=== CHECKING DATABASE & STORAGE ===' -ForegroundColor Cyan

# Check storage buckets
Write-Host '' 
Write-Host 'Storage Buckets:' -ForegroundColor Yellow

try {
    $buckets = Invoke-RestMethod -Uri 'https://ndfrozgfzohkoyepoein.supabase.co/storage/v1/bucket' -Method GET -Headers $headers
    if ($buckets) {
        foreach ($b in $buckets) {
            Write-Host "  [OK] $($b.id)" -ForegroundColor Green
        }
    } else {
        Write-Host '  No buckets found - need to create!' -ForegroundColor Red
    }
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
}

# Check key tables
Write-Host ''
Write-Host 'Key Tables:' -ForegroundColor Yellow

$tables = @('profiles', 'departments', 'classes', 'school_settings')
foreach ($t in $tables) {
    try {
        $r = Invoke-RestMethod -Uri "https://ndfrozgfzohkoyepoein.supabase.co/rest/v1/$t?select=count" -Method Get -Headers $headers
        $count = $r[0].count
        Write-Host "  [OK] $t ($count records)" -ForegroundColor Green
    } catch {
        Write-Host "  [MISSING] $t" -ForegroundColor Red
    }
}