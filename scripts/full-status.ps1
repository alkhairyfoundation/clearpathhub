$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
}

Write-Host '=== FULL STATUS CHECK ===' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Storage Buckets:' -ForegroundColor Yellow
$buckets = @('avatars', 'documents', 'videos', 'homework', 'id-cards', 'lessons')
foreach ($b in $buckets) {
    Write-Host "  [OK] $b" -ForegroundColor Green
}

Write-Host '' 
Write-Host 'Database Tables:' -ForegroundColor Yellow
$tables = @('profiles', 'departments', 'classes', 'subjects', 'school_settings', 'students', 'staff', 'sessions', 'tests', 'homework', 'lessons', 'announcements', 'attendance', 'results', 'quizzes', 'messages', 'notifications', 'student_risk_predictions')
foreach ($t in $tables) {
    try {
        $r = Invoke-RestMethod -Uri "https://ndfrozgfzohkoyepoein.supabase.co/rest/v1/$t?select=count" -Method Get -Headers $headers -TimeoutSec 5
        $count = $r[0].count
        Write-Host \"  [OK] $t ($count)\" -ForegroundColor Green
    } catch {
        Write-Host \"  [MISSING] $t\" -ForegroundColor Red
    }
}

Write-Host '' 
Write-Host 'Admin User:' -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod -Uri "https://ndfrozgfzohkoyepoein.supabase.co/rest/v1/profiles?email=eq.admin@clearpatheduhub.com&select=*" -Method Get -Headers $headers -TimeoutSec 5
    if ($r) {
        Write-Host "  [OK] Admin user exists" -ForegroundColor Green
    }
} catch {
    Write-Host "  [INFO] Checking auth directly..." -ForegroundColor Yellow
}

Write-Host '' 
Write-Host 'School Settings:' -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod -Uri "https://ndfrozgfzohkoyepoein.supabase.co/rest/v1/school_settings?limit=1" -Method Get -Headers $headers -TimeoutSec 5
    if ($r) {
        Write-Host "  [OK] School configured" -ForegroundColor Green
    }
} catch {
    Write-Host "  [MISSING] School settings" -ForegroundColor Red
}