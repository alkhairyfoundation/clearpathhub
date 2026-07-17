param(
  [string]$Dir = "C:\Users\Hp\Documents\Abdut Tawwab\Website\eduhub\src",
  [string]$Pattern = "*.tsx"
)

$files = Get-ChildItem -Path $Dir -Filter $Pattern -Recurse
$totalFixes = 0
$fixedFiles = @()

function Write-Fix {
  param([string]$Path)
  Write-Host "FIXED: $Path"
}

foreach ($file in $files) {
  # Skip files that are already well-dark-mode
  if ($file.Name -eq 'DashboardLayout.tsx' -or $file.Name -eq 'MobileNav.tsx') { continue }

  $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
  $original = $content

  # TEXT COLOR FIXES: Add dark:text-* variants
  $replacements = @(
    # Gray/Slate scale
    @('text-slate-900', 'text-slate-900 dark:text-white'),
    @('text-gray-900', 'text-gray-900 dark:text-white'),
    @('text-slate-800', 'text-slate-800 dark:text-slate-200'),
    @('text-slate-700', 'text-slate-700 dark:text-slate-300'),
    @('text-slate-600', 'text-slate-600 dark:text-slate-400'),
    @('text-slate-500', 'text-slate-500 dark:text-slate-400'),
    @('text-slate-400', 'text-slate-400 dark:text-slate-500'),
    @('text-gray-500', 'text-gray-500 dark:text-slate-400'),
    @('text-gray-600', 'text-gray-600 dark:text-slate-400'),
    @('text-gray-700', 'text-gray-700 dark:text-slate-300'),
    @('text-gray-800', 'text-gray-800 dark:text-slate-200'),

    # Primary
    @('text-primary-600', 'text-primary-600 dark:text-primary-400'),
    @('text-primary-700', 'text-primary-700 dark:text-primary-300'),
    @('text-primary-800', 'text-primary-800 dark:text-primary-200'),

    # Emerald/Green
    @('text-emerald-600', 'text-emerald-600 dark:text-emerald-400'),
    @('text-emerald-700', 'text-emerald-700 dark:text-emerald-300'),
    @('text-emerald-800', 'text-emerald-800 dark:text-emerald-200'),
    @('text-green-600', 'text-green-600 dark:text-green-400'),
    @('text-green-700', 'text-green-700 dark:text-green-300'),

    # Red
    @('text-red-500', 'text-red-500 dark:text-red-400'),
    @('text-red-600', 'text-red-600 dark:text-red-400'),
    @('text-red-700', 'text-red-700 dark:text-red-400'),
    @('text-red-800', 'text-red-800 dark:text-red-300'),

    # Amber/Yellow
    @('text-amber-500', 'text-amber-500 dark:text-amber-400'),
    @('text-amber-600', 'text-amber-600 dark:text-amber-400'),
    @('text-amber-700', 'text-amber-700 dark:text-amber-300'),
    @('text-yellow-500', 'text-yellow-500 dark:text-yellow-400'),
    @('text-yellow-600', 'text-yellow-600 dark:text-yellow-400'),

    # Blue
    @('text-blue-500', 'text-blue-500 dark:text-blue-400'),
    @('text-blue-600', 'text-blue-600 dark:text-blue-400'),
    @('text-blue-700', 'text-blue-700 dark:text-blue-300'),

    # Purple
    @('text-purple-500', 'text-purple-500 dark:text-purple-400'),
    @('text-purple-600', 'text-purple-600 dark:text-purple-400'),

    # Other
    @('text-rose-500', 'text-rose-500 dark:text-rose-400'),
    @('text-rose-600', 'text-rose-600 dark:text-rose-400'),
    @('text-cyan-600', 'text-cyan-600 dark:text-cyan-400'),
    @('text-teal-600', 'text-teal-600 dark:text-teal-400'),
    @('text-orange-600', 'text-orange-600 dark:text-orange-400'),
    @('text-indigo-600', 'text-indigo-600 dark:text-indigo-400'),
    @('text-pink-600', 'text-pink-600 dark:text-pink-400')
  )

  foreach ($r in $replacements) {
    $old = $r[0]
    $new = $r[1]
    # Only replace if NOT already preceded by dark:
    $content = [regex]::Replace($content, "(?<!dark:)$([regex]::Escape($old))(?![\w-])", $new)
  }

  # BACKGROUND COLOR FIXES
  $bgReplacements = @(
    @('bg-white"', 'bg-white dark:bg-slate-800"'),
    @("bg-white'", "bg-white dark:bg-slate-800'"),
    @('bg-slate-50', 'bg-slate-50 dark:bg-slate-800'),
    @('bg-gray-50', 'bg-gray-50 dark:bg-slate-800'),
    @('bg-gray-100', 'bg-gray-100 dark:bg-slate-700'),
    @('bg-slate-100', 'bg-slate-100 dark:bg-slate-700'),
    @('bg-emerald-50', 'bg-emerald-50 dark:bg-emerald-900/20'),
    @('bg-emerald-100', 'bg-emerald-100 dark:bg-emerald-900/30'),
    @('bg-green-50', 'bg-green-50 dark:bg-green-900/20'),
    @('bg-green-100', 'bg-green-100 dark:bg-green-900/30'),
    @('bg-red-50', 'bg-red-50 dark:bg-red-900/20'),
    @('bg-red-100', 'bg-red-100 dark:bg-red-900/30'),
    @('bg-amber-50', 'bg-amber-50 dark:bg-amber-900/20'),
    @('bg-amber-100', 'bg-amber-100 dark:bg-amber-900/30'),
    @('bg-blue-50', 'bg-blue-50 dark:bg-blue-900/20'),
    @('bg-blue-100', 'bg-blue-100 dark:bg-blue-900/30'),
    @('bg-primary-50', 'bg-primary-50 dark:bg-primary-900/20'),
    @('bg-primary-100', 'bg-primary-100 dark:bg-primary-900/30'),
    @('bg-purple-50', 'bg-purple-50 dark:bg-purple-900/20'),
    @('bg-purple-100', 'bg-purple-100 dark:bg-purple-900/30'),
    @('bg-pink-50', 'bg-pink-50 dark:bg-pink-900/20'),
    @('bg-yellow-50', 'bg-yellow-50 dark:bg-yellow-900/20'),
    @('bg-orange-50', 'bg-orange-50 dark:bg-orange-900/20'),
    @('bg-cyan-50', 'bg-cyan-50 dark:bg-cyan-900/20'),
    @('bg-teal-50', 'bg-teal-50 dark:bg-teal-900/20'),
    @('bg-indigo-50', 'bg-indigo-50 dark:bg-indigo-900/20'),
    @('bg-rose-50', 'bg-rose-50 dark:bg-rose-900/20')
  )

  foreach ($r in $bgReplacements) {
    $old = $r[0]
    $new = $r[1]
    $content = [regex]::Replace($content, "(?<!dark:)$([regex]::Escape($old))(?![\w-])", $new)
  }

  # BORDER COLOR FIXES
  $borderReplacements = @(
    @('border-slate-200', 'border-slate-200 dark:border-slate-700'),
    @('border-slate-100', 'border-slate-100 dark:border-slate-700'),
    @('border-slate-300', 'border-slate-300 dark:border-slate-600'),
    @('border-slate-50', 'border-slate-50 dark:border-slate-700/50'),
    @('border-gray-200', 'border-gray-200 dark:border-slate-700'),
    @('border-gray-100', 'border-gray-100 dark:border-slate-700'),
    @('border-gray-300', 'border-gray-300 dark:border-slate-600'),
    @('border-red-200', 'border-red-200 dark:border-red-900/40'),
    @('border-green-200', 'border-green-200 dark:border-green-900/40'),
    @('border-emerald-200', 'border-emerald-200 dark:border-emerald-900/40'),
    @('border-amber-200', 'border-amber-200 dark:border-amber-900/40'),
    @('border-blue-200', 'border-blue-200 dark:border-blue-900/40'),
    @('border-primary-200', 'border-primary-200 dark:border-primary-900/40'),
    @('border-purple-200', 'border-purple-200 dark:border-purple-900/40')
  )

  foreach ($r in $borderReplacements) {
    $old = $r[0]
    $new = $r[1]
    $content = [regex]::Replace($content, "(?<!dark:)$([regex]::Escape($old))(?![\w-])", $new)
  }

  # DIVIDE COLOR
  $content = [regex]::Replace($content, '(?<!dark:)divide-slate-200(?![\w-])', 'divide-slate-200 dark:divide-slate-700')
  $content = [regex]::Replace($content, '(?<!dark:)divide-gray-200(?![\w-])', 'divide-gray-200 dark:divide-slate-700')

  # PLACEHOLDER
  $content = [regex]::Replace($content, '(?<!dark:)placeholder-slate-400(?![\w-])', 'placeholder-slate-400 dark:placeholder-slate-500')

  if ($content -ne $original) {
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
    $totalFixes++
    $fixedFiles += $file.FullName
    Write-Fix $file.FullName
  }
}

Write-Host "`nDone! Fixed $totalFixes files."
