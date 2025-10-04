#!/bin/bash

echo "🔍 Verifying AgentBrowser setup..."
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 22 ]; then
  echo "✅ Node.js $NODE_VERSION (required: 22+)"
else
  echo "❌ Node.js $NODE_VERSION (required: 22+)"
  exit 1
fi

# Check pnpm
echo "📦 Checking pnpm..."
if command -v pnpm &> /dev/null; then
  PNPM_VERSION=$(pnpm --version)
  echo "✅ pnpm $PNPM_VERSION"
else
  echo "❌ pnpm not found. Install: npm install -g pnpm"
  exit 1
fi

# Check project structure
echo ""
echo "📁 Checking project structure..."
REQUIRED_FILES=(
  "package.json"
  "pnpm-workspace.yaml"
  "apps/mobile/package.json"
  "apps/mobile/App.tsx"
  "apps/agent/package.json"
  "apps/agent/src/node/host.ts"
  "packages/shared/src/index.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file missing"
    exit 1
  fi
done

# Check TypeScript files compile
echo ""
echo "🔧 Checking TypeScript syntax..."
cd apps/agent
if npx tsc --noEmit; then
  echo "✅ Agent TypeScript valid"
else
  echo "❌ Agent TypeScript errors"
  exit 1
fi
cd ../..

# Check environment
echo ""
echo "🔐 Checking environment..."
if [ -f ".env" ]; then
  echo "✅ .env file exists"
  if grep -q "LLM_KEY=" .env; then
    echo "✅ LLM_KEY configured"
  else
    echo "⚠️  LLM_KEY not set in .env"
  fi
else
  echo "⚠️  .env file not found (copy from .env.example)"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Verification complete!"
echo ""
echo "Next steps:"
echo "  1. pnpm install"
echo "  2. cd apps/agent && pnpm build"
echo "  3. cd apps/mobile && pnpm prebuild"
echo "  4. pnpm run:android (or run:ios)"
echo ""
echo "Or use one-command build:"
echo "  ./scripts/build.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
