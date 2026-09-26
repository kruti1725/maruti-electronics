#!/bin/bash
echo "========================================================"
echo "  Starting Kruti Electronics TV Repair Management System"
echo "========================================================"
echo ""

if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js is not installed!"
    echo "Please download and install Node.js from https://nodejs.org"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing required dependencies... Please wait."
    npm install
fi

echo ""
echo "[INFO] Starting Kruti Electronics Server at http://localhost:3000 ..."
echo "[INFO] Press Ctrl+C in this window anytime to stop the server."
echo ""
npm run dev
