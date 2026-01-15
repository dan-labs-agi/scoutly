# Agent8 - Prompt to n8n Workflow Builder

A platform that transforms natural language descriptions into executable n8n automation workflows.

## Quick Start

```bash
# Install dependencies
npm run setup

# Start development environment
npm run dev

# Start with Docker (includes n8n)
npm run docker:up
```

## Architecture

```
User → Frontend (React + React Flow)
     → Backend (Node.js + TypeScript)
     → OpenRouter (LLM)
     → MCP Wrapper (n8n MCP + Composio)
     → n8n Workflow
```

## Features

- **Natural Language Interface**: Describe automation in plain English
- **Intelligent Workflow Generation**: Automatic tool selection and workflow building
- **Visual Preview**: See your workflow before execution
- **Real-time Execution**: Monitor workflow runs with live logs
- **Multiple Integration Support**: n8n native nodes, Composio, HTTP requests

## Tech Stack

- **Frontend**: React, React Flow, WebSocket
- **Backend**: Node.js, TypeScript, Express/Fastify
- **LLM**: OpenRouter (Claude, GPT-4, etc.)
- **Automation**: n8n + n8n MCP
- **Integrations**: Composio, Firecrawl
- **Database**: PostgreSQL (optional for sessions)

## Environment Variables

See `frontend/.env.example` and `backend/.env.example`

## Development

```bash
# Backend only
npm run dev:backend

# Frontend only  
npm run dev:frontend

# Build for production
npm run build
```

## Docker Services

- `agent8-backend`: Main API server
- `agent8-frontend`: Frontend dev server
- `n8n`: Workflow automation engine
- `postgres`: Session storage (optional)
