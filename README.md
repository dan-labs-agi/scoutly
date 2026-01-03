# Scoutly - AI-Powered Startup Discovery Platform

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-blue?logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## Overview

Scoutly is an AI-powered startup discovery platform that helps job seekers and researchers find recently funded startups in real-time. Using Google's Gemini AI, Scoutly searches for and extracts information about newly funded startups across various domains, providing detailed insights into funding rounds, founders, investors, and contact information.

## Features

- 🔍 **AI-Powered Search**: Advanced Google Dork techniques combined with Gemini AI for deep web startup discovery
- 📊 **Real-time Data**: Focus on recently announced funding rounds (today, yesterday, week, month, quarter)
- 🎯 **Smart Filtering**: Filter startups by domain, funding stage, and date range
- ✉️ **Outreach Tools**: Generate personalized email templates for founder outreach
- 🎨 **Interactive UI**: Beautiful animated interface with GSAP-powered effects
- 📱 **Responsive Design**: Mobile-friendly layout for any device

## Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager
- Google Gemini API key

## Installation

1. **Clone the repository** (if applicable):
   ```bash
   git clone <repository-url>
   cd scoutly
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   
   Visit [http://localhost:5173](http://localhost:5173) to see the application.

## Configuration

### Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini API key for AI-powered search functionality

### API Integration

The application uses Google's Gemini API with the following configuration:
- Model: `gemini-3-pro-preview`
- Tools: Google Search integration
- System instructions for OSINT (Open Source Intelligence) data extraction

## Usage

1. **Search for Startups**:
   - Enter a domain or technology area in the search field (e.g., "AI Agents", "Crypto", "SaaS")
   - Or click on one of the suggested tags

2. **Browse Results**:
   - View startup cards with funding details, descriptions, and investor information
   - Filter results by date range and funding stage

3. **Outreach**:
   - Click on any startup card to view detailed information
   - Use the "Draft Outreach" button to generate a personalized email template
   - Connect with founders directly through provided contact information

## Project Structure

```
scoutly/
├── components/           # React UI components
│   ├── Dashboard.tsx     # Main dashboard with startup listings
│   ├── LandingPage.tsx   # Entry point with animated background
│   ├── StartupCard.tsx   # Individual startup display component
│   └── StartupModal.tsx  # Detailed startup information modal
├── services/             # API and business logic
│   └── geminiService.ts  # Gemini AI integration and search logic
├── utils/                # Utility functions
│   └── dateUtils.ts      # Date formatting and range calculations
├── types.ts              # TypeScript type definitions
├── App.tsx               # Main application router
├── index.html            # HTML template
├── index.tsx             # React root entry point
└── README.md             # This file
```

## Technologies Used

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **AI Integration**: Google Gemini API
- **Animations**: GSAP (GreenSock Animation Platform)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Search**: Google Search API integration

## API and Data Flow

1. User enters search query on the landing page
2. Dashboard component calls `fetchFundedStartups` function
3. Gemini service constructs Google Dork queries based on filters
4. AI processes search results and extracts structured data
5. Data is formatted according to the `Startup` interface
6. Results are displayed as interactive startup cards

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions about Scoutly, please open an issue in the repository.

## Acknowledgments

- Google Gemini API for AI-powered search capabilities
- React and Vite for the modern development experience
- GSAP for the beautiful animations
- Lucide React for the clean icon set

---

Made with ❤️ by Dan