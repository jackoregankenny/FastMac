#!/bin/bash

# FastMac Development Tool Installer - Startup Script
# This script sets up and runs the Flask web application

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting FastMac Development Tool Installer${NC}"

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This application is designed for macOS${NC}"
    exit 1
fi

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is required but not installed${NC}"
    echo -e "${YELLOW}Please install Python 3 first:${NC}"
    echo "brew install python"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${YELLOW}🔧 Activating virtual environment...${NC}"
source venv/bin/activate

# Install/upgrade pip
pip install --upgrade pip

# Install requirements
if [ -f "requirements.txt" ]; then
    echo -e "${YELLOW}📋 Installing Python dependencies...${NC}"
    pip install -r requirements.txt
else
    echo -e "${YELLOW}📋 Installing Flask...${NC}"
    pip install Flask
fi

# Run the Flask application
echo -e "${GREEN}✅ Starting Flask application...${NC}"
echo -e "${YELLOW}🌐 Open your browser to: http://127.0.0.1:5000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

python run.py 