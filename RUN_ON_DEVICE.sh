#!/bin/bash

# Agora Testing on Real Device - Quick Start Script
# This script helps you run the app on a physical iPhone

echo "🚀 VULU - Run on Real Device for Agora Testing"
echo "=============================================="
echo ""
echo "📱 Make sure your iPhone is:"
echo "   1. Connected via USB cable"
echo "   2. Unlocked"
echo "   3. Trusted (check iPhone notification)"
echo ""
echo "Press ENTER to continue..."
read

cd "$(dirname "$0")"

echo ""
echo "🔍 Checking for connected devices..."
xcrun xctrace list devices 2>&1 | grep -E "iPhone|iPad" | grep -v "Simulator"

echo ""
echo "🏗️  Building and installing on device..."
echo ""

npx expo run:ios --device

echo ""
echo "✅ App should now be running on your iPhone!"
echo ""
echo "💡 If you see errors:"
echo "   - Make sure device is unlocked"
echo "   - Trust the Mac on your iPhone"  
echo "   - Check USB cable is data-capable"
echo ""
