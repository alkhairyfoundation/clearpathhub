$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg'
    'Content-Type' = 'application/json'
}

$buckets = @('avatars', 'documents', 'homework', 'id-cards', 'lessons', 'videos')

Write-Host 'Creating Storage Policies...' -ForegroundColor Cyan

foreach ($bucket in $buckets) {
    # Policy 1: Allow public read
    $readPolicy = @{
        name = "$bucket-public-read"
        description = "Allow public read access to $bucket"
        bucket_id = $bucket
        operation = 'SELECT'
    }
    
    try {
        $r = Invoke-RestMethod -Uri "https://ndfrozgfzohkoyepoein.supabase.co/storage/v1/policy" -Method POST -Headers $headers -Body ($readPolicy | ConvertTo-Json)
        Write-Host "  [OK] $bucket read policy" -ForegroundColor Green
    } catch {
        if ($_.Exception.Message -like '*duplicate*') {
            Write-Host "  [SKIP] $bucket read policy exists" -ForegroundColor Yellow
        } else {
            Write-Host "  [ERROR] $bucket read: $($_.Exception.Message.Substring(0,50))" -ForegroundColor Red
        }
    }
    
    # Policy 2: Allow authenticated upload
    $insertPolicy = @{
        name = "$bucket-auth-upload"
        description = "Allow authenticated users to upload to $bucket"
        bucket_id = $bucket
        operation = 'INSERT'
    }
    
    try {
        $r = Invoke-RestMethod -Uri "https://ndfrozgfzohkoyepoein.supabase.co/storage/v1/policy" -Method POST -Headers $headers -Body ($insertPolicy | ConvertTo-Json)
        Write-Host "  [OK] $bucket insert policy" -ForegroundColor Green
    } catch {
        if ($_.Exception.Message -like '*duplicate*') {
            Write-Host "  [SKIP] $bucket insert policy exists" -ForegroundColor Yellow
        } else {
            Write-Host "  [ERROR] $bucket insert: $($_.Exception.Message.Substring(0,50))" -ForegroundColor Red
        }
    }
    
    # Policy 3: Allow owner delete
    $deletePolicy = @{
        name = "$bucket-owner-delete"
        description = "Allow owner to delete from $bucket"
        bucket_id = $bucket
        operation = 'DELETE'
    }
    
    try {
        $r = Invoke-RestMethod -Uri "https://ndfrozgfzohkoyepoein.supabase.co/storage/v1/policy" -Method POST -Headers $headers -Body ($deletePolicy | ConvertTo-Json)
        Write-Host "  [OK] $bucket delete policy" -ForegroundColor Green
    } catch {
        if ($_.Exception.Message -like '*duplicate*') {
            Write-Host "  [SKIP] $bucket delete policy exists" -ForegroundColor Yellow
        } else {
            Write-Host "  [ERROR] $bucket delete: $($_.Exception.Message.Substring(0,50))" -ForegroundColor Red
        }
    }
}

Write-Host ''
Write-Host 'Storage policies created!' -ForegroundColor Green