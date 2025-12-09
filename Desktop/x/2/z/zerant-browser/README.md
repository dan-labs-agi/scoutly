# ⚡ ZERANT - AI Mobile Browser Agent

An intelligent mobile browser that understands natural language commands and autonomously browses the web. Built with React Native and powered by multiple AI providers including Claude, GPT-4, Gemini, and OpenRouter.

![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61dafb?logo=react)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)
![Claude](https://img.shields.io/badge/Claude-3.5%20Sonnet-orange)
![Gemini](https://img.shields.io/badge/Gemini-2.0%20Flash-4285f4?logo=google)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

| Mode | Description |
|------|-------------|
| 🌐 **Browser Mode** | Traditional web browsing with search |
| 🤖 **Agent Mode** | Natural language commands + AI automation |

### Agent Actions
- **Click** - Click elements by selector or text
- **Fill** - Enter text in form fields
- **Navigate** - Go to URLs
- **Extract** - Pull data from pages
- **Scroll** - Scroll for more content
- **Observe** - Discover page elements

## 🚀 Quick Start

```bash
# Clone and install
cd zerant-browser
npm install

# Start Expo
npx expo start

# Run on device
# Press 'i' for iOS | 'a' for Android
```

## 🔑 API Keys

Create a `.env` file with at least ONE provider:

```env
# Choose one or more providers:

# Claude (Anthropic) - Recommended
ANTHROPIC_API_KEY=sk-ant-your-key

# OpenRouter - Access to 100+ models
OPENROUTER_API_KEY=sk-or-your-key

# OpenAI - GPT-4o, GPT-4-turbo
OPENAI_API_KEY=sk-your-key

# Gemini (Google)
GEMINI_API_KEY=your-key
```

Get your keys:
- **Claude**: https://console.anthropic.com
- **OpenRouter**: https://openrouter.ai/keys
- **OpenAI**: https://platform.openai.com/api-keys
- **Gemini**: https://ai.google.dev

## 📱 Usage

### Browser Mode
1. Type search query or URL
2. Press search button
3. Browse normally

### Agent Mode
1. Toggle to 🤖 Agent Mode
2. Type command: *"Find the cheapest flight to Bangalore"*
3. Press 🚀 to execute
4. Watch AI navigate and extract data

## 🛠 Tech Stack

### Frontend Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.81.5 | Cross-platform mobile framework |
| **Expo** | ~54.0.27 | Development platform & toolchain |
| **TypeScript** | ~5.9.2 | Type-safe JavaScript |
| **React** | 19.1.0 | UI component library |

### Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| **react-native-webview** | ^13.16.0 | Embedded browser engine |
| **@react-native-async-storage/async-storage** | ^2.2.0 | Local storage for settings & keys |
| **expo-blur** | ~15.0.8 | Glass-morphism UI effects |
| **lucide-react-native** | ^0.556.0 | Icon library |
| **react-native-svg** | ^15.15.1 | Vector graphics support |
| **zod** | ^4.1.13 | Schema validation |

### AI Providers & SDKs
| Provider | SDK | Model | Capabilities |
|----------|-----|-------|--------------|
| **Anthropic Claude** | @anthropic-ai/sdk ^0.71.2 | Claude 3.5 Sonnet | Vision, reasoning, function calling |
| **Google Gemini** | @google/generative-ai ^0.24.1 | Gemini 2.0 Flash | Fast inference, multimodal |
| **OpenAI** | Built-in fetch | GPT-4o, GPT-4-turbo | General purpose, versatile |
| **OpenRouter** | Built-in fetch | 100+ models | Model aggregation, fallback |
| **Lux AI** | Built-in fetch | Specialized models | Custom integrations |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ZERANT BROWSER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │   UI Layer    │  │  Agent Layer   │  │ Browser Core │  │
│  │               │  │                │  │              │  │
│  │ • Header      │  │ • ClaudeAgent  │  │ • WebView    │  │
│  │ • ControlBar  │  │ • GeminiAgent  │  │ • JS Inject  │  │
│  │ • StatusBadge │  │ • OpenAIAgent  │  │ • DOM Query  │  │
│  │ • ActionLog   │  │ • OpenRouter   │  │ • Navigation │  │
│  │ • Settings    │  │ • LuxAgent     │  │              │  │
│  └───────┬───────┘  └────────┬───────┘  └──────┬───────┘  │
│          │                   │                   │          │
│          └───────────────────┴───────────────────┘          │
│                              │                              │
│                    ┌─────────▼─────────┐                   │
│                    │  State Management  │                   │
│                    │  • AsyncStorage    │                   │
│                    │  • React Context   │                   │
│                    └────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Features

#### 1. **Multi-Provider AI System**
- Dynamic provider selection based on availability
- Fallback mechanism for reliability
- Unified agent interface for consistency

#### 2. **Browser Agent Integration**
- JavaScript injection for DOM manipulation
- Real-time element discovery
- Action execution pipeline (click, fill, navigate, extract)

#### 3. **Component-Based UI**
- Modular component architecture
- Reusable UI primitives
- Dark theme with glass-morphism effects

#### 4. **Type Safety**
- Full TypeScript coverage
- Zod schema validation
- Strongly typed agent responses

### AI Provider Priority
Zerant automatically uses the first available provider:
1. 🌐 **OpenRouter** (access to 100+ models) - `anthropic/claude-3.5-sonnet`
2. 🧠 **Claude 3.5 Sonnet** (most capable) - Direct API
3. 🤖 **OpenAI GPT-4o** (versatile) - Function calling
4. ✨ **Gemini 2.0 Flash** (fast) - Low latency
5. 🔧 **Lux AI** (specialized) - Custom models

## 📁 Project Structure

```
zerant-browser/
├── App.tsx                      # Main application entry point
├── index.ts                     # Expo entry point
├── app.json                     # Expo configuration
├── babel.config.js              # Babel transpiler config
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies & scripts
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
│
├── assets/                      # Static assets
│   ├── icon.png                 # App icon
│   ├── splash-icon.png          # Splash screen
│   ├── adaptive-icon.png        # Android adaptive icon
│   └── favicon.png              # Web favicon
│
└── src/
    ├── components/              # React Native components
    │   ├── index.ts             # Component exports
    │   ├── Header.tsx           # Top navigation bar
    │   ├── ControlBar.tsx       # Mode switcher & input
    │   ├── BrowserView.tsx      # WebView wrapper
    │   ├── ActionLog.tsx        # AI action history
    │   ├── StatusBadge.tsx      # Current status indicator
    │   ├── TabSwitcher.tsx      # Multi-tab support
    │   ├── SettingsModal.tsx    # API key management
    │   └── BottomToolbar.tsx    # Navigation controls
    │
    ├── agents/                  # AI provider integrations
    │   ├── index.ts             # Agent exports & types
    │   ├── ClaudeAgent.ts       # Anthropic Claude 3.5
    │   ├── GeminiAgent.ts       # Google Gemini 2.0
    │   ├── OpenAIAgent.ts       # OpenAI GPT-4o
    │   ├── OpenRouterAgent.ts   # OpenRouter proxy
    │   └── LuxAgent.ts          # Lux AI integration
    │
    ├── browser/                 # Browser engine logic
    │   └── InjectedAgent.ts     # JS injection for DOM control
    │
    ├── utils/                   # Utility functions
    │   ├── constants.ts         # App constants
    │   └── apiKeys.ts           # API key management
    │
    └── types/                   # TypeScript definitions
        ├── index.ts             # Shared types
        └── env.d.ts             # Environment types
```

## 🎯 Demo Tasks

Try these commands in Agent Mode:

1. *"Search for weather in Bangalore"*
2. *"Click the first search result"*
3. *"Extract all links on this page"*
4. *"Fill the search box with 'AI news'"*
5. *"Navigate to https://news.ycombinator.com and extract the top 5 stories"*
6. *"Scroll down to load more content"*

## 🔧 Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (macOS) or Android Emulator

### Environment Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your API keys to .env
```

### Running Locally
```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web browser
npm run web
```

### Building for Production
```bash
# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Perplexity Comet](https://www.perplexity.ai/)
- Built with concepts from [BrowserOS](https://browser.os)
- AI automation inspired by [Stagehand](https://github.com/browserbase/stagehand)

## 📧 Contact

For questions, issues, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ for the future of autonomous web browsing**
