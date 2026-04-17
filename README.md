# Infinity Multi-Game Platform

The centralized gateway for high-fidelity browser games.

## Phase 1: The Master Hub
- **Universal API Contract**: Standardized `/api/game/*` endpoints for state persistence.
- **Global Auth**: Unified player identity.
- **Local Deployment**: Full support for Ubuntu Server via `scripts/setup.sh`.

## Directory Structure
- `server.ts`: Node.js/Express Hub (Live Preview Backend).
- `python_hub/`: Python/Flask implementation for external deployment.
- `scripts/`: Automation and deployment scripts.
- `src/`: Frontend React application.
- `hub.db`: SQLite database for development.

## Getting Started (Local Development)
1. Install dependencies: `npm install`
2. Start the Hub: `npm run dev`
3. Access at `http://localhost:3000`

## Deployment (Ubuntu Server)
Run `bash scripts/setup.sh` to automate system updates, firewall config, and service creation.
