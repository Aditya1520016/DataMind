#!/bin/bash
# DataMind Enterprise - Full Project Startup Script
# Usage: bash start.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     DataMind Enterprise v3.0 - Startup      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Check Ollama ─────────────────────────────────────────────────
echo -e "${YELLOW}[1/4] Checking Ollama...${NC}"
if ! command -v ollama &>/dev/null; then
  echo -e "${RED}✗ Ollama not found. Install from https://ollama.com/download${NC}"
  exit 1
fi

if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
  echo -e "${YELLOW}  Starting Ollama server...${NC}"
  ollama serve &>/dev/null &
  sleep 2
fi

# Check for models
MODELS=$(curl -s http://localhost:11434/api/tags | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('models',[])))" 2>/dev/null || echo "0")
if [ "$MODELS" = "0" ]; then
  echo -e "${YELLOW}  No models found. Pulling llama3.2 (this may take a few minutes)...${NC}"
  ollama pull llama3.2
fi
echo -e "${GREEN}✓ Ollama ready${NC}"

# ── Backend ───────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/4] Setting up Python backend...${NC}"
cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
  echo -e "  Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

echo -e "  Installing dependencies..."
pip install -r requirements.txt -q

echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# ── Frontend ──────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[3/4] Setting up frontend...${NC}"
cd "../frontend"

if [ ! -d "node_modules" ]; then
  echo -e "  Installing npm packages..."
  npm install --silent
fi
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# ── Launch ────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[4/4] Launching services...${NC}"
echo ""

# Start backend in background
cd "../backend"
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID $BACKEND_PID) → http://localhost:8000${NC}"

sleep 1

# Start frontend in background
cd "../frontend"
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID $FRONTEND_PID) → http://localhost:3000${NC}"

echo ""
echo -e "${BLUE}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  DataMind Enterprise is running!${NC}"
echo ""
echo -e "  Frontend:  ${BLUE}http://localhost:3000${NC}"
echo -e "  Backend:   ${BLUE}http://localhost:8000${NC}"
echo -e "  API Docs:  ${BLUE}http://localhost:8000/docs${NC}"
echo -e "  Ollama:    ${BLUE}http://localhost:11434${NC}"
echo ""
echo -e "  Press ${RED}Ctrl+C${NC} to stop all services"
echo -e "${BLUE}══════════════════════════════════════════════${NC}"
echo ""

# Wait and cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping services...${NC}"
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  echo -e "${GREEN}Done. Goodbye!${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

wait
