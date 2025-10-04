# AgentBrowser Deployment Guide

## Table of Contents
1. [Local Development](#local-development)
2. [EAS Build (Cloud)](#eas-build-cloud)
3. [Local Build](#local-build)
4. [Production Server](#production-server)
5. [CI/CD](#cicd)

---

## Local Development

### Prerequisites
- Node.js 22+
- pnpm 9+
- Android Studio (Android) or Xcode (iOS)
- OpenAI API key

### Setup
```bash
# Clone repository
git clone <repo-url>
cd agentbrowser

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your API key

# Build agent
cd apps/agent && pnpm build && cd ../..

# Prebuild mobile
cd apps/mobile && pnpm prebuild && cd ../..
```

### Run Development
```bash
# Terminal 1: Agent server
cd apps/agent && pnpm dev

# Terminal 2: Mobile app
cd apps/mobile && pnpm dev:android  # or dev:ios
```

---

## EAS Build (Cloud)

### Setup EAS
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure project
cd apps/mobile
eas build:configure
```

### Build Profiles

#### Development Build
```bash
# Android
eas build --profile development --platform android

# iOS
eas build --profile development --platform ios

# Install on device
eas build:run --profile development --platform android
```

#### Preview Build (APK/IPA)
```bash
# Android APK
eas build --profile preview --platform android

# iOS IPA (TestFlight)
eas build --profile preview --platform ios

# Both platforms
eas build --profile preview --platform all
```

#### Production Build
```bash
# Production release
eas build --profile production --platform all

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

### EAS Configuration

**eas.json** (already configured):
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk",
        "ndk": "26.1.10909125"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Environment Variables in EAS
```bash
# Set secrets
eas secret:create --scope project --name EXPO_PUBLIC_LLM_KEY --value sk-...

# List secrets
eas secret:list

# Delete secret
eas secret:delete --name EXPO_PUBLIC_LLM_KEY
```

---

## Local Build

### Android APK

#### Debug Build
```bash
cd apps/mobile

# Build debug APK
npx expo run:android --variant debug

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

#### Release Build
```bash
# Generate keystore (first time only)
keytool -genkeypair -v -storetype PKCS12 \
  -keystore agentbrowser.keystore \
  -alias agentbrowser \
  -keyalg RSA -keysize 2048 -validity 10000

# Build release APK
npx expo run:android --variant release

# Sign APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore agentbrowser.keystore \
  android/app/build/outputs/apk/release/app-release-unsigned.apk \
  agentbrowser

# Align APK
zipalign -v 4 \
  android/app/build/outputs/apk/release/app-release-unsigned.apk \
  agentbrowser-v1.0.0.apk
```

### iOS IPA

#### Debug Build
```bash
cd apps/mobile

# Build for simulator
npx expo run:ios --configuration Debug

# Build for device (requires Apple Developer account)
npx expo run:ios --configuration Debug --device
```

#### Release Build
```bash
# Build release IPA
npx expo run:ios --configuration Release

# Archive (Xcode required)
xcodebuild -workspace ios/mobile.xcworkspace \
  -scheme mobile \
  -configuration Release \
  -archivePath build/mobile.xcarchive \
  archive

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/mobile.xcarchive \
  -exportPath build \
  -exportOptionsPlist exportOptions.plist
```

---

## Production Server

### Agent Server Deployment

#### Docker Deployment
```dockerfile
# Dockerfile
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/agent ./apps/agent
COPY packages/shared ./packages/shared

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build agent
RUN cd apps/agent && pnpm build

# Install Playwright
RUN cd apps/agent && npx playwright install-deps chromium
RUN cd apps/agent && npx playwright install chromium

EXPOSE 9223

CMD ["node", "apps/agent/dist/node/host.js"]
```

```bash
# Build Docker image
docker build -t agentbrowser-agent .

# Run container
docker run -d \
  -p 9223:9223 \
  -e LLM_KEY=sk-... \
  --name agentbrowser-agent \
  agentbrowser-agent
```

#### PM2 Deployment
```bash
# Install PM2
npm install -g pm2

# Start agent
cd apps/agent
pm2 start dist/node/host.js --name agentbrowser-agent

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup
```

#### Systemd Service
```ini
# /etc/systemd/system/agentbrowser.service
[Unit]
Description=AgentBrowser Agent Server
After=network.target

[Service]
Type=simple
User=agentbrowser
WorkingDirectory=/opt/agentbrowser/apps/agent
Environment="NODE_ENV=production"
Environment="LLM_KEY=sk-..."
ExecStart=/usr/bin/node dist/node/host.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable agentbrowser
sudo systemctl start agentbrowser
sudo systemctl status agentbrowser
```

### Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/agentbrowser
server {
    listen 80;
    server_name api.agentbrowser.com;

    location / {
        proxy_pass http://localhost:9223;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /stream {
        proxy_pass http://localhost:9223/stream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/agentbrowser /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Let's Encrypt
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.agentbrowser.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## CI/CD

### GitHub Actions

**.github/workflows/build.yml**:
```yaml
name: Build AgentBrowser

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-agent:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install
      - run: cd apps/agent && pnpm build
      - run: cd apps/agent && pnpm test

  build-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install
      - run: cd apps/mobile && npx expo prebuild --npm
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --profile preview --platform android --non-interactive
```

### GitLab CI

**.gitlab-ci.yml**:
```yaml
stages:
  - build
  - deploy

build-agent:
  stage: build
  image: node:22-alpine
  script:
    - npm install -g pnpm
    - pnpm install
    - cd apps/agent && pnpm build
  artifacts:
    paths:
      - apps/agent/dist

build-mobile:
  stage: build
  image: node:22-alpine
  script:
    - npm install -g pnpm eas-cli
    - pnpm install
    - cd apps/mobile
    - eas build --profile preview --platform android --non-interactive

deploy-agent:
  stage: deploy
  only:
    - main
  script:
    - docker build -t agentbrowser-agent .
    - docker push registry.example.com/agentbrowser-agent:latest
```

---

## Monitoring

### Health Checks
```bash
# Agent health
curl http://localhost:9223/health

# Expected response
{"status":"ok","timestamp":1234567890}
```

### Logging
```bash
# PM2 logs
pm2 logs agentbrowser-agent

# Docker logs
docker logs -f agentbrowser-agent

# Systemd logs
sudo journalctl -u agentbrowser -f
```

### Metrics
```javascript
// Add to apps/agent/src/node/host.ts
fastify.get('/metrics', async () => {
  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    tasks: tasks.size,
    timestamp: Date.now()
  };
});
```

---

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set strong CORS policies
- [ ] Rotate API keys regularly
- [ ] Enable rate limiting
- [ ] Use environment variables for secrets
- [ ] Keep dependencies updated
- [ ] Enable firewall rules
- [ ] Use secure WebSocket (wss://)
- [ ] Implement authentication
- [ ] Monitor for suspicious activity

---

## Performance Optimization

### Agent Server
- Use Redis for task queue
- Implement connection pooling
- Enable gzip compression
- Cache screenshots
- Use CDN for static assets

### Mobile App
- Enable Hermes engine
- Use ProGuard/R8 minification
- Optimize images
- Lazy load components
- Reduce bundle size

---

## Troubleshooting

### Build Fails
```bash
# Clear caches
pnpm store prune
cd apps/mobile && npx expo start -c
rm -rf node_modules && pnpm install
```

### Agent Won't Start
```bash
# Check port availability
lsof -i :9223

# Check Node version
node --version

# Reinstall Playwright
cd apps/agent && npx playwright install-deps chromium
```

### APK Too Large
- Remove unused dependencies
- Enable ProGuard
- Use arm64-v8a only
- Compress assets
- Remove debug symbols

---

## Support

- **Documentation**: See README.md and ARCHITECTURE.md
- **Issues**: GitHub Issues
- **Community**: Discord/Slack
- **Email**: support@agentbrowser.com
