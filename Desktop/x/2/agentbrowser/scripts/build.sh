#!/bin/bash
set -e

echo "🚀 Building AgentBrowser..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build agent
echo "🔧 Building agent..."
cd apps/agent && pnpm build && cd ../..

# Prebuild mobile
echo "📱 Prebuilding mobile..."
cd apps/mobile && pnpm prebuild && cd ../..

echo "✅ Build complete!"
echo ""
echo "Run commands:"
echo "  Android: pnpm run:android"
echo "  iOS:     pnpm run:ios"
