# AgentBrowser-Mobile Architecture

## Overview

AgentBrowser-Mobile is a production-ready agentic browser for mobile devices, combining Expo SDK 54, Playwright browser automation, and AI-powered task execution.

## Technology Stack

### Mobile App (apps/mobile/)
- **Framework**: Expo SDK 54 + React Native 0.76.1
- **Language**: TypeScript 5.5
- **Key Dependencies**:
  - `expo-webview@~13.12.0` - WebView component
  - `expo-speech@~12.0.0` - Text-to-speech
  - `expo-av@~15.0.0` - Audio recording
  - `expo-camera@~16.0.0` - Camera for PiP
  - `expo-video@~2.0.0` - Video export (720×1280, 30fps, H.264)
  - `expo-file-system@~18.0.0` - File operations
  - `expo-sharing@~12.0.0` - Share functionality

### Agent Server (apps/agent/)
- **Runtime**: Node.js 22 ESM
- **Framework**: Fastify 4 (WS + HTTP)
- **Port**: 9223
- **Key Dependencies**:
  - `playwright@^1.44.0` - Browser automation
  - `@fastify/websocket@^10.0.1` - WebSocket support
  - `@fastify/cors@^9.0.1` - CORS handling
  - `openai@^4.67.3` - LLM integration
  - `sharp@^0.33.5` - Image processing

### Shared Package (packages/shared/)
- **Purpose**: Type-safe schemas with Zod
- **Exports**: TaskRequest, TaskResponse, Action, StreamMessage schemas

## Data Flow

```
Mobile App (WebView)
    ↓ HTTP POST /task
Agent Server (Fastify)
    ↓ Plan with LLM
Planner (Nanobrain)
    ↓ Generate Actions
Browser Driver (Playwright)
    ↓ Execute Actions
    ↓ WS /stream
Mobile App (Screenshot Updates)
```

## Communication Protocol

### REST API

**POST /task**
```typescript
Request: {
  prompt: string;
  key?: string;      // OpenAI API key
  voice?: boolean;   // Voice command flag
}

Response: {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}
```

### WebSocket

**WS /stream**
```typescript
Message: {
  type: 'screenshot' | 'action' | 'status';
  data: any;
}
```

## Action Types

```typescript
type Action =
  | { type: 'click'; x: number; y: number }
  | { type: 'type'; text: string }
  | { type: 'scroll'; dx: number; dy: number }
  | { type: 'nav'; url: string }
  | { type: 'wait'; ms: number };
```

## AI Planning

### Planner (Nanobrain-inspired)
- **Model**: GPT-4o-mini (default) or Ollama phi3:3b
- **Context**: Sliding window (8K tokens)
- **Memory**: Scratchpad per task
- **Prompts**: Apache-2.0 licensed patterns

### Action Parsing
1. LLM generates function calls as text
2. Regex parser extracts actions
3. Actions queued for execution
4. Driver executes sequentially

## Browser Automation

### Playwright Driver
- **Viewport**: 720×1280 (mobile portrait)
- **Headless**: true
- **Screenshot**: JPEG 50% quality
- **DOM**: Max 32KB HTML string
- **Fallback**: Selector → XPath → Vision bbox

## Mobile Features

### WebView Integration
- Custom User-Agent: `AgentBrowser-Mobile/1.0`
- JavaScript enabled
- DOM storage enabled
- Full-screen rendering

### Voice Commands
1. Record 10s WAV audio
2. Convert to base64
3. POST to /task with voice=true
4. LLM transcribes and executes

### Video Recording
- **Duration**: 15 seconds
- **Resolution**: 720×1280
- **FPS**: 30
- **Codec**: H.264 (libx264)
- **Bitrate**: 1.5 Mbps
- **PiP**: Face camera overlay
- **Export**: Save to gallery + share

## Build Configuration

### Android
- **minSdk**: 26 (Android 8.0)
- **Architecture**: arm64-v8a only
- **Target APK Size**: ≤ 20 MB
- **Permissions**: CAMERA, RECORD_AUDIO, WRITE_EXTERNAL_STORAGE

### iOS
- **Deployment Target**: 14.0
- **Architecture**: arm64 only
- **Permissions**: Camera, Microphone (via Info.plist)

### EAS Build Profiles
- **development**: Dev client with debugging
- **preview**: APK/IPA for testing
- **production**: Optimized release builds

## Security Considerations

1. **API Keys**: Environment variables only
2. **CORS**: Restricted to localhost:8081
3. **WebSocket**: Local connections only
4. **Permissions**: Explicit user consent required

## Performance Optimizations

1. **Screenshot Compression**: JPEG 50% quality
2. **DOM Truncation**: 32KB limit
3. **Memory Management**: Sliding window context
4. **APK Size**: arm64-only, no x86_64
5. **Video Encoding**: Hardware acceleration where available

## Development Workflow

```bash
# Terminal 1: Agent server
cd apps/agent && pnpm dev

# Terminal 2: Mobile app
cd apps/mobile && pnpm dev:android
```

## Production Deployment

```bash
# One-command build
./scripts/build.sh

# Run on device
pnpm run:android  # or pnpm run:ios

# EAS Cloud Build
eas build --profile production --platform all
```

## Extensibility

### Adding New Actions
1. Update `ActionSchema` in `packages/shared/src/index.ts`
2. Add case in `BrowserDriver.execute()`
3. Update `Planner.parseActions()`
4. Document in `PLANNER_PROMPT`

### Custom LLM Providers
1. Implement provider in `apps/agent/src/brain/`
2. Add provider selection logic in `Planner`
3. Update environment variables

### Mobile UI Enhancements
1. Modify `apps/mobile/App.tsx`
2. Add new Expo modules to `package.json`
3. Update `app.json` plugins array
4. Rebuild with `expo prebuild`

## Troubleshooting

### Common Issues

**WebSocket connection failed**
- Ensure agent server is running on port 9223
- Check firewall settings
- Verify localhost connectivity

**Playwright browser launch failed**
- Install system dependencies: `npx playwright install-deps`
- Check Node.js version (requires 22+)

**Expo build errors**
- Clear cache: `expo start -c`
- Reinstall: `rm -rf node_modules && pnpm install`
- Rebuild: `expo prebuild --clean`

**APK size > 20 MB**
- Verify arm64-v8a only in `eas.json`
- Remove unused assets
- Enable ProGuard/R8 minification

## License

MIT License with attribution to Browser-Use (MIT) and Nanobrain (Apache-2.0).
