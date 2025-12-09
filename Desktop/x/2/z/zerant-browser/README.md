# ⚡ ZERANT - AI Mobile Browser Agent

An intelligent mobile browser that understands natural language commands and autonomously browses the web.

![React Native](https://img.shields.io/badge/React%20Native-0.76-blue)
![Expo](https://img.shields.io/badge/Expo-52-white)
![Claude](https://img.shields.io/badge/Claude-3.5%20Sonnet-orange)
![Gemini](https://img.shields.io/badge/Gemini-2.0%20Flash-blue)

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

| Component | Technology |
|-----------|------------|
| **Frontend** | React Native + Expo |
| **Browser** | React Native WebView |
| **AI Providers** | Claude 3.5 Sonnet, OpenRouter, OpenAI GPT-4o, Gemini 2.0 |
| **Styling** | Custom dark theme |

### AI Provider Priority
Zerant automatically uses the first available provider:
1. 🌐 **OpenRouter** (access to 100+ models)
2. 🧠 **Claude 3.5 Sonnet** (most capable)
3. 🤖 **OpenAI GPT-4o** (versatile)
4. ✨ **Gemini 2.0 Flash** (fast)

## 📁 Project Structure

```
zerant-browser/
├── App.tsx                 # Main app
├── src/
│   ├── components/         # UI components
│   │   ├── Header.tsx
│   │   ├── ControlBar.tsx
│   │   ├── BrowserView.tsx
│   │   ├── ActionLog.tsx
│   │   └── StatusBadge.tsx
│   ├── agents/             # AI integrations
│   │   ├── ClaudeAgent.ts
│   │   └── GeminiAgent.ts
│   ├── browser/            # WebView control
│   │   └── InjectedAgent.ts
│   └── types/              # TypeScript types
│       └── index.ts
```

## 🎯 Demo Tasks

Try these commands in Agent Mode:

1. *"Search for weather in Bangalore"*
2. *"Click the first search result"*
3. *"Extract all links on this page"*
4. *"Fill the search box with 'AI news'"*

---

**Built with ❤️ for the future of browsing**

*Inspired by Perplexity Comet, BrowserOS, and Stagehand*
