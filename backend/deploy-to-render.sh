#!/bin/bash

echo "🚀 Deploying PetHub Backend to Render..."
echo

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

echo "✅ Backend directory validated"
echo

# Run the setup script
echo "📋 Running Render setup..."
node render-setup.js
echo

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Error: Git is not installed or not in PATH"
    exit 1
fi

echo "✅ Git is available"
echo

# Check git status
echo "📊 Checking git status..."
git status
echo

# Add all changes
echo "📝 Adding changes to git..."
git add .
echo

# Commit changes
echo "💾 Committing changes..."
git commit -m "Prepare backend for Render deployment"
echo

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push
echo

echo "🎉 Backend is ready for Render deployment!"
echo
echo "📋 Next steps:"
echo "1. Go to https://render.com"
echo "2. Create a new Web Service"
echo "3. Connect your GitHub repository"
echo "4. Set Root Directory to \"backend\""
echo "5. Use Build Command: \"npm install && npx prisma generate && npm run build\""
echo "6. Use Start Command: \"npm start\""
echo "7. Add environment variables from env.example"
echo "8. Deploy and test!"
echo
