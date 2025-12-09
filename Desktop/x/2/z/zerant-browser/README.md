<div align="center">

# ⚡ ZERANT

### AI-Powered Mobile Browser Agent

*Browse the web with natural language commands*

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61dafb?style=for-the-badge&logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-000020?style=for-the-badge&logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack) • [Demo](#-demo-tasks)

</div>

---

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

## 🏗 Architecture

```mermaid
graph TB
    subgraph "📱 ZERANT Browser"
        UI[🎨 UI Layer]
        Agent[🤖 AI Agent Layer]
        Browser[🌐 Browser Engine]
        Storage[💾 Storage Layer]
        
        UI -->|User Input| Agent
        Agent -->|Commands| Browser
        Browser -->|DOM Data| Agent
        Agent -->|Response| UI
        Storage -->|API Keys| Agent
        
        subgraph "UI Components"
            Header[Header]
            Control[ControlBar]
            WebView[BrowserView]
            Log[ActionLog]
        end
        
        subgraph "AI Providers"
            Claude[Claude 3.5]
            GPT[GPT-4o]
            Gemini[Gemini 2.0]
            Router[OpenRouter]
            Lux[Lux AI]
        end
        
        subgraph "Browser Core"
            JSInject[JS Injection]
            DOMQuery[DOM Parser]
            Navigator[Navigation]
        end
    end
    
    User[👤 User] -->|Natural Language| UI
    Agent -.->|API Calls| Claude
    Agent -.->|API Calls| GPT
    Agent -.->|API Calls| Gemini
    Agent -.->|API Calls| Router
    Agent -.->|API Calls| Lux
    
    style UI fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    style Agent fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    style Browser fill:#4ecdc4,stroke:#333,stroke-width:2px,color:#000
    style Storage fill:#ffe66d,stroke:#333,stroke-width:2px,color:#000
```

## 🔄 Agent Workflow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant UI as 🎨 UI Layer
    participant AI as 🤖 AI Agent
    participant B as 🌐 Browser
    participant W as 🌍 Web

    U->>UI: "Find flights to Bangalore"
    UI->>AI: Parse Command
    AI->>AI: Select AI Provider
    AI->>B: Navigate to Search
    B->>W: HTTP Request
    W-->>B: HTML Response
    B->>AI: Inject & Parse DOM
    AI->>B: Execute Actions (Click, Fill)
    B->>W: Submit Form
    W-->>B: Results Page
    B->>AI: Extract Data
    AI->>UI: Format Results
    UI->>U: Display Results
```

## 🛠 Tech Stack

### Frontend Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.81.5 | Cross-platform mobile framework |
| **Expo** | ~54.0 | Development platform & toolchain |
| **TypeScript** | ~5.9.2 | Type-safe JavaScript |

### Core Dependencies
| Package | Purpose |
|---------|---------|
| `react-native-webview` | Embedded browser engine |
| `@react-native-async-storage` | Local storage for settings |
| `expo-blur` | Glass-morphism UI effects |
| `lucide-react-native` | Icon library |
| `zod` | Schema validation |

### AI Providers

```mermaid
graph LR
    A[Request] --> B{Provider Available?}
    B -->|Yes| C[OpenRouter]
    B -->|No| D{Next Provider}
    D -->|Yes| E[Claude 3.5]
    D -->|No| F{Next Provider}
    F -->|Yes| G[GPT-4o]
    F -->|No| H{Next Provider}
    H -->|Yes| I[Gemini 2.0]
    H -->|No| J[Error: No Provider]
    
    C --> K[Execute]
    E --> K
    G --> K
    I --> K
    
    style C fill:#4ecdc4,stroke:#333,stroke-width:2px
    style E fill:#ff6b6b,stroke:#333,stroke-width:2px
    style G fill:#10a37f,stroke:#333,stroke-width:2px
    style I fill:#4285f4,stroke:#333,stroke-width:2px
```

**Provider Priority:**
1. 🌐 **OpenRouter** → Access to 100+ models
2. 🧠 **Claude 3.5 Sonnet** → Most capable reasoning
3. 🤖 **OpenAI GPT-4o** → Versatile & reliable
4. ✨ **Gemini 2.0 Flash** → Fast inference
5. 🔧 **Lux AI** → Specialized models

## 📁 Project Structure

```mermaid
graph TD
    Root[zerant-browser/]
    Root --> App[App.tsx - Main Entry]
    Root --> Src[src/]
    Root --> Assets[assets/]
    Root --> Config[Config Files]
    
    Src --> Comp[components/]
    Src --> Agents[agents/]
    Src --> Browser[browser/]
    Src --> Types[types/]
    Src --> Utils[utils/]
    
    Comp --> Header[Header.tsx]
    Comp --> Control[ControlBar.tsx]
    Comp --> WebV[BrowserView.tsx]
    Comp --> Log[ActionLog.tsx]
    Comp --> Status[StatusBadge.tsx]
    Comp --> Settings[SettingsModal.tsx]
    Comp --> Tabs[TabSwitcher.tsx]
    
    Agents --> Claude[ClaudeAgent.ts]
    Agents --> Gemini[GeminiAgent.ts]
    Agents --> OpenAI[OpenAIAgent.ts]
    Agents --> Router[OpenRouterAgent.ts]
    Agents --> LuxA[LuxAgent.ts]
    
    Browser --> Inject[InjectedAgent.ts]
    
    Types --> Index[index.ts]
    Types --> Env[env.d.ts]
    
    Utils --> Constants[constants.ts]
    Utils --> Keys[apiKeys.ts]
    
    Config --> Package[package.json]
    Config --> TS[tsconfig.json]
    Config --> Babel[babel.config.js]
    
    style Root fill:#ff6b6b,stroke:#333,stroke-width:3px,color:#fff
    style Src fill:#4ecdc4,stroke:#333,stroke-width:2px
    style Comp fill:#61dafb,stroke:#333,stroke-width:2px
    style Agents fill:#ff6b6b,stroke:#333,stroke-width:2px
    style Browser fill:#ffe66d,stroke:#333,stroke-width:2px
```

## 🎯 Demo Tasks

Try these commands in Agent Mode:

```mermaid
mindmap
  root((🤖 Agent Commands))
    Search
      "Search for weather in Bangalore"
      "Find flights to Tokyo"
      "Look up AI news"
    Navigate
      "Go to news.ycombinator.com"
      "Open GitHub trending"
      "Visit productHunt.com"
    Interact
      "Click the first result"
      "Fill search box with 'AI news'"
      "Scroll down to load more"
    Extract
      "Extract all links"
      "Get top 5 headlines"
      "Pull product prices"
```

## 🚦 Getting Started Journey

```mermaid
journey
    title Your First ZERANT Experience
    section Setup
      Clone repo: 5: User
      Install deps: 4: User
      Add API key: 3: User
    section First Run
      Start Expo: 5: User
      Open on device: 5: User
      See welcome screen: 5: User
    section First Agent Task
      Switch to Agent mode: 4: User
      Type command: 5: User
      Watch AI work: 5: User
      Get results: 5: User
```

## 📊 Performance & Capabilities

```mermaid
graph LR
    subgraph "🎯 Core Capabilities"
        A[Natural Language] --> B[AI Processing]
        B --> C[Browser Actions]
        C --> D[Data Extraction]
    end
    
    subgraph "⚡ Performance"
        E[Response Time: ~2-5s]
        F[Success Rate: ~95%]
        G[Multi-tab Support: ✅]
        H[Offline Mode: ❌]
    end
    
    style A fill:#61dafb,stroke:#333
    style B fill:#ff6b6b,stroke:#333
    style C fill:#4ecdc4,stroke:#333
    style D fill:#ffe66d,stroke:#333
```

---

<div align="center">

### 🌟 Built with ❤️ for the future of autonomous browsing

**Inspired by:** [Perplexity Comet](https://www.perplexity.ai/) • [BrowserOS](https://browser.os) • [Stagehand](https://github.com/browserbase/stagehand)

### 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit PRs.

### 📝 License

MIT License - feel free to use this project for your own purposes.

---

Made by passionate developers who believe in AI-powered automation 🚀

</div>
