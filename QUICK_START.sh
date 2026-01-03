#!/bin/bash

# Quick Start: Gemini → Firecrawl + Convex Migration
# Run this script to set up everything

set -e

echo "🚀 Scoutly Refactoring Quick Start"
echo "=================================="
echo ""

# Step 1: Install Convex
echo "📦 Installing Convex..."
npm install convex

echo "✅ Convex installed"
echo ""

# Step 2: Initialize Convex project
echo "🔧 Initializing Convex project..."
echo "Note: If prompted, choose 'Node.js' runtime"
npx convex init

echo "✅ Convex initialized"
echo ""

# Step 3: Create Convex directories
echo "📁 Creating Convex directories..."
mkdir -p convex/lib
mkdir -p convex/scrapers
mkdir -p convex/processors
mkdir -p convex/queries
mkdir -p convex/jobs

echo "✅ Directories created"
echo ""

# Step 4: Create .env.local
echo "🔑 Setting up environment variables..."
if [ ! -f .env.local ]; then
  cat > .env.local << 'EOF'
# Convex (created by npx convex init)
# VITE_CONVEX_URL=https://your-project.convex.cloud

# API Keys (get from respective services)
FIRECRAWL_API_KEY=your_firecrawl_key_here
HUNTER_API_KEY=your_hunter_key_here
CLEARBIT_API_KEY=your_clearbit_key_here
EOF
  echo "Created .env.local - fill in your API keys"
else
  echo ".env.local already exists"
fi
echo ""

# Step 5: Push schema
echo "📊 Pushing Convex schema to database..."
echo "This may take a minute..."
npx convex push

echo "✅ Schema deployed"
echo ""

# Step 6: Update package.json scripts
echo "📝 Updating package.json scripts..."
npm pkg set scripts.dev="convex dev & vite"
npm pkg set scripts.build="vite build"
npm pkg set scripts.preview="vite preview"
npm pkg set scripts.deploy="convex deploy && vite build"

echo "✅ Scripts updated"
echo ""

# Step 7: Instructions
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Fill in API keys in .env.local"
echo "2. Run: npm run dev"
echo "3. Visit: http://localhost:5173"
echo ""
echo "To deploy:"
echo "  npx convex deploy"
echo "  npm run build"
echo ""
echo "To test scrapers:"
echo "  Visit Convex dashboard and run fetchYCCompanies"
echo ""
echo "Full setup guide: MIGRATION_GUIDE.md"
echo "Analysis: REFACTOR_SUMMARY.md"
