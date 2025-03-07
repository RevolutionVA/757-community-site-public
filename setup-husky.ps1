# Ensure the husky directory exists
if (-not (Test-Path ".husky")) {
    New-Item -ItemType Directory -Path ".husky" -Force
}

# Create the pre-commit hook
$preCommitContent = @"
#!/bin/sh
. "\$(dirname "\$0")/_/husky.sh"

# Run JSON validation
npm run validate
"@

$preCommitContent | Out-File -FilePath ".husky/pre-commit" -Encoding utf8

# Make the pre-commit hook executable (on Unix systems)
# This won't have an effect on Windows, but is included for completeness
if ($IsLinux -or $IsMacOS) {
    chmod +x .husky/pre-commit
}

Write-Host "Husky pre-commit hook has been set up successfully!" 