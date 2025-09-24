@echo off
echo 🚀 Starting PetHub Backend Deployment to Vercel...

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Check if user is logged in to Vercel
vercel whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 🔐 Please login to Vercel:
    vercel login
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Generate Prisma client
echo 🔧 Generating Prisma client...
npx prisma generate

REM Build the project
echo 🏗️ Building project...
npm run build

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
vercel --prod

echo ✅ Deployment complete!
echo 📝 Don't forget to:
echo    1. Set environment variables in Vercel dashboard
echo    2. Run database migrations: npx prisma migrate deploy
echo    3. Update frontend API URL
echo    4. Test all API endpoints

pause
