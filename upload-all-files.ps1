Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UPLOAD ALL PROJECT FILES TO GITHUB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will copy all files from your current project" -ForegroundColor Yellow
Write-Host "to the GitHub repository and push them to GitHub." -ForegroundColor Yellow
Write-Host ""
Write-Host "Repository: https://github.com/dsavio83/myclass.git" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to continue..."

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 1: Copying all project files..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Copy all files and folders
$sourcePath = "D:\Web Apps\learning-platform-content-browser\*"
$destinationPath = "C:\Users\Dominic\myclass\"

Write-Host "Copying from: $sourcePath" -ForegroundColor Gray
Write-Host "Copying to: $destinationPath" -ForegroundColor Gray

try {
    Copy-Item -Path $sourcePath -Destination $destinationPath -Recurse -Force
    Write-Host "✅ Files copied successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error copying files: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 2: Adding files to git..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Set-Location "C:\Users\Dominic\myclass"
git add .
Write-Host "✅ Files added to git!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 3: Committing files..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$commitMessage = @"
Upload complete learning platform project

- All frontend React components and context
- Complete backend Express.js server and APIs
- Database models and routes
- Styling and configuration files
- Performance optimizations included
- MongoDB Atlas cloud migration completed
"@

git commit -m $commitMessage
Write-Host "✅ Files committed!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 4: Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    git push origin main
    Write-Host "✅ Files pushed to GitHub!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error pushing to GitHub: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UPLOAD COMPLETE!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your complete project is now uploaded to:" -ForegroundColor Green
Write-Host "https://github.com/dsavio83/myclass.git" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now access all your files on GitHub!" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit..."