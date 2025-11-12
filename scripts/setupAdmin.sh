#!/bin/bash

# Admin System Setup Script
# This script helps you set up the admin system for VuluGO

echo "🔧 VuluGO Admin System Setup"
echo "=============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js is installed: $(node --version)"
echo ""

# Check if firebase-admin is installed
if ! npm list firebase-admin &> /dev/null; then
    echo "📦 Installing firebase-admin..."
    npm install firebase-admin
    echo "✅ firebase-admin installed"
else
    echo "✅ firebase-admin is already installed"
fi
echo ""

# Check if service account key exists
if [ ! -f "serviceAccountKey.json" ]; then
    echo "⚠️  Service account key not found!"
    echo ""
    echo "To set up admin access, you need a Firebase service account key:"
    echo ""
    echo "1. Go to Firebase Console: https://console.firebase.google.com/"
    echo "2. Select your project"
    echo "3. Go to Project Settings > Service Accounts"
    echo "4. Click 'Generate New Private Key'"
    echo "5. Save the downloaded file as 'serviceAccountKey.json' in this directory"
    echo ""
    echo "After downloading the key, run this script again."
    exit 1
else
    echo "✅ Service account key found"
fi
echo ""

# Check if .gitignore includes serviceAccountKey.json
if ! grep -q "serviceAccountKey.json" .gitignore 2>/dev/null; then
    echo "🔒 Adding serviceAccountKey.json to .gitignore..."
    echo "serviceAccountKey.json" >> .gitignore
    echo "✅ Service account key secured in .gitignore"
else
    echo "✅ Service account key is already in .gitignore"
fi
echo ""

# Prompt for email to grant admin access
echo "👤 Grant Admin Access"
echo "--------------------"
read -p "Enter email address to grant admin access (or press Enter to skip): " email

if [ -z "$email" ]; then
    echo "⏭️  Skipping admin grant"
else
    read -p "Enter admin level (super/moderator/support) [default: super]: " level
    level=${level:-super}
    
    echo ""
    echo "🚀 Granting admin access to $email with level: $level"
    node scripts/setAdminClaim.js "$email" "$level"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Admin access granted successfully!"
        echo ""
        echo "⚠️  IMPORTANT: The user must sign out and sign back in for changes to take effect."
    else
        echo ""
        echo "❌ Failed to grant admin access"
        echo "Please check the error message above"
    fi
fi

echo ""
echo "=============================="
echo "✅ Admin System Setup Complete"
echo "=============================="
echo ""
echo "Next steps:"
echo "1. If you granted admin access, make sure the user signs out and back in"
echo "2. Deploy Firestore security rules: firebase deploy --only firestore:rules"
echo "3. Access the admin panel from the sidebar menu (shield icon)"
echo ""
echo "For more information, see ADMIN_SETUP.md"
echo ""

