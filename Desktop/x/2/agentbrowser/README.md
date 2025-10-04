# AgentBrowser-Mobile

Agentic Browser for Mobile – EXPO SDK 54 + WebView + Playwright + Browser-Use driver + Nanobrain prompts

## Architecture

```
agentbrowser/
├─ apps/mobile/        # Expo SDK 54 React Native app
├─ apps/agent/         # Node 22 Fastify server (port 9223)
├─ packages/shared/    # Zod schemas
└─ scripts/build.sh    # One-command build
```

## Features

- **Mobile**: Expo SDK 54, WebView, TTS, Voice Recording, Camera PiP, Video Export
- **Agent**: Playwright browser automation, Fastify WS/HTTP, Nanobrain AI planner
- **Cross-platform**: Android (arm64-v8a, minSdk 26) & iOS (arm64, iOS 14+)
- **APK Size**: ≤ 20 MB
- **User-Agent**: `AgentBrowser-Mobile/1.0`

## Quick Start

```bash
# 1. Clone and setup
git clone <repo>
cd agentbrowser
cp .env.example .env
# Edit .env with your OpenAI API key

# 2. Build (one command)
./scripts/build.sh

# 3. Run Android
pnpm run:android

# 4. Run iOS
pnpm run:ios
```

## Development

```bash
# Install dependencies
pnpm install

# Build agent
cd apps/agent && pnpm build

# Run agent dev server
cd apps/agent && pnpm dev

# Run mobile (separate terminal)
cd apps/mobile && pnpm dev:android
cd apps/mobile && pnpm dev:ios
```

## EAS Build

```bash
# Development build
eas build --profile development --platform android
eas build --profile development --platform ios

# Preview build (APK/IPA)
eas build --profile preview --platform android
eas build --profile preview --platform ios

# Production build
eas build --profile production --platform all
```

## API

### POST /task
```json
{
  "prompt": "Search for cats on Google",
  "key": "sk-...",
  "voice": false
}
```

Response:
```json
{
  "taskId": "task_1234567890",
  "status": "pending"
}
```

### WS /stream
Streams base64 JPEG screenshots at 1 fps.

## Actions

- `click(x, y)`: Click at coordinates
- `type(text)`: Type text
- `scroll(dx, dy)`: Scroll
- `nav(url)`: Navigate
- `wait(ms)`: Wait

## License

MIT (Browser-Use driver), Apache-2.0 (Nanobrain prompts)
