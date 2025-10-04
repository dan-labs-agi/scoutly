# AgentBrowser-Mobile Quick Start

## Prerequisites

- Node.js 22+
- pnpm 9+
- Android Studio (for Android) or Xcode (for iOS)
- OpenAI API key

## Installation (5 minutes)

```bash
# 1. Navigate to project
cd agentbrowser

# 2. Setup environment
cp .env.example .env
# Edit .env and add your OpenAI API key:
# EXPO_PUBLIC_LLM_KEY=sk-...
# LLM_KEY=sk-...

# 3. Install dependencies
pnpm install

# 4. Build agent
cd apps/agent && pnpm build && cd ../..

# 5. Prebuild mobile (generates native projects)
cd apps/mobile && pnpm prebuild && cd ../..
```

## Run Development (2 terminals)

### Terminal 1: Agent Server
```bash
cd apps/agent
pnpm dev
# Server starts on http://localhost:9223
```

### Terminal 2: Mobile App

**Android:**
```bash
cd apps/mobile
pnpm dev:android
# Opens Android emulator or connected device
```

**iOS:**
```bash
cd apps/mobile
pnpm dev:ios
# Opens iOS simulator
```

## Usage

1. **Launch App**: Mobile app opens with WebView
2. **Enter Task**: Type prompt in input field (e.g., "Search for cats on Google")
3. **Execute**: Tap "Execute" button
4. **Watch**: Agent executes actions in WebView
5. **Voice**: Tap "Voice" to record 10s voice command

## Example Tasks

```
"Go to google.com and search for weather"
"Navigate to amazon.com and search for laptops"
"Open youtube.com and search for cooking videos"
"Go to wikipedia.org and search for artificial intelligence"
```

## Build Production APK/IPA

### Local Build
```bash
# Android APK
cd apps/mobile
npx expo run:android --variant release

# iOS IPA (requires Mac)
npx expo run:ios --configuration Release
```

### EAS Cloud Build
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build Android APK
eas build --profile preview --platform android

# Build iOS IPA
eas build --profile preview --platform ios

# Build both
eas build --profile production --platform all
```

## Troubleshooting

### Agent server won't start
```bash
# Check Node version
node --version  # Should be 22+

# Reinstall dependencies
cd apps/agent
rm -rf node_modules
pnpm install
```

### Mobile app build fails
```bash
# Clear Expo cache
cd apps/mobile
npx expo start -c

# Clean prebuild
npx expo prebuild --clean

# Reinstall
rm -rf node_modules
pnpm install
```

### WebSocket connection fails
```bash
# Ensure agent is running
curl http://localhost:9223/health

# Check firewall
# Allow port 9223 in firewall settings

# For Android emulator, use 10.0.2.2 instead of localhost
# Edit App.tsx: const WS_URL = 'ws://10.0.2.2:9223/stream';
```

### Playwright browser fails
```bash
# Install system dependencies
cd apps/agent
npx playwright install-deps chromium
npx playwright install chromium
```

## Project Structure

```
agentbrowser/
├── apps/
│   ├── mobile/          # Expo React Native app
│   │   ├── App.tsx      # Main entry point
│   │   ├── app.json     # Expo config
│   │   └── eas.json     # EAS Build config
│   └── agent/           # Node.js Fastify server
│       └── src/
│           ├── node/    # Fastify host
│           ├── driver/  # Playwright browser
│           └── brain/   # AI planner
├── packages/
│   └── shared/          # Zod schemas
└── scripts/
    └── build.sh         # One-command build
```

## Next Steps

1. **Customize Prompts**: Edit `apps/agent/src/brain/prompts.ts`
2. **Add Actions**: Extend `ActionSchema` in `packages/shared/src/index.ts`
3. **UI Enhancements**: Modify `apps/mobile/App.tsx`
4. **Deploy**: Use EAS Build for production releases

## Support

- **Documentation**: See `ARCHITECTURE.md` for detailed architecture
- **Issues**: Check GitHub issues
- **License**: MIT (see `LICENSE`)

## Performance Tips

- Use WiFi for faster WebSocket streaming
- Close background apps for better performance
- Enable hardware acceleration in Android settings
- Use physical device for best experience (emulators are slower)

## Security Notes

- Never commit `.env` file with API keys
- Use environment variables for sensitive data
- Restrict CORS origins in production
- Enable HTTPS for production deployments
