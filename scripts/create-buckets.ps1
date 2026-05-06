$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
    'Content-Type' = 'application/json'
}

$buckets = @(
    @{id='avatars'; name='avatars'; public=$true; file_size_limit=5242880; allowed_mime_types=@('image/jpeg','image/png','image/webp')},
    @{id='documents'; name='documents'; public=$true; file_size_limit=10485760; allowed_mime_types=@('application/pdf')},
    @{id='videos'; name='videos'; public=$true; file_size_limit=104857600; allowed_mime_types=@('video/mp4','video/webm')},
    @{id='homework'; name='homework'; public=$true; file_size_limit=20971520; allowed_mime_types=@('application/pdf','image/jpeg','image/png')},
    @{id='id-cards'; name='id-cards'; public=$true; file_size_limit=1048576; allowed_mime_types=@('image/jpeg','image/png')},
    @{id='lessons'; name='lessons'; public=$true; file_size_limit=52428800; allowed_mime_types=@('application/pdf','video/mp4','image/jpeg')}
)

Write-Host 'Creating Storage Buckets...' -ForegroundColor Cyan

foreach ($bucket in $buckets) {
    $body = $bucket | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Uri 'https://ndfrozgfzohkoyepoein.supabase.co/storage/v1/bucket' -Method POST -Headers $headers -Body $body
        Write-Host "  [OK] Created: $($bucket.id)" -ForegroundColor Green
    } catch {
        if ($_.Exception.Message -like '*already exists*') {
            Write-Host "  [SKIP] Already exists: $($bucket.id)" -ForegroundColor Yellow
        } else {
            Write-Host "  [ERROR] $($bucket.id): $_" -ForegroundColor Red
        }
    }
}

Write-Host ''
Write-Host 'Storage buckets ready!' -ForegroundColor Green