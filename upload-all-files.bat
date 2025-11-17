@echo off
echo ========================================
echo UPLOAD ALL PROJECT FILES TO GITHUB
echo ========================================
echo.
echo This script will copy all files from your current project
echo to the GitHub repository and push them to GitHub.
echo.
echo Make sure your GitHub repository is at:
echo https://github.com/dsavio83/myclass.git
echo.
pause

echo.
echo ========================================
echo STEP 1: Copying all project files...
echo ========================================

REM Copy all files and folders (except node_modules, .git, etc.)
xcopy /E /I /Y "D:\Web Apps\learning-platform-content-browser\*" "C:\Users\Dominic\myclass\"

echo.
echo Files copied successfully!
echo.

echo ========================================
echo STEP 2: Adding files to git...
echo ========================================

cd /d "C:\Users\Dominic\myclass"
git add .

echo.
echo ========================================
echo STEP 3: Committing files...
echo ========================================

git commit -m "Upload complete learning platform project

- All frontend React components and context
- Complete backend Express.js server and APIs
- Database models and routes
- Styling and configuration files
- Performance optimizations included
- MongoDB Atlas cloud migration completed"

echo.
echo ========================================
echo STEP 4: Pushing to GitHub...
echo ========================================

git push origin main

echo.
echo ========================================
echo UPLOAD COMPLETE!
echo ========================================
echo.
echo Your complete project is now uploaded to:
echo https://github.com/dsavio83/myclass.git
echo.
echo You can now access all your files on GitHub.
echo.
pause