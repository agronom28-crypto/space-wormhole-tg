# 🌌 Space Wormhole Rush — Telegram Game

Telegram HTML5 arcade game: launch a comet, use planet gravity, hit the wormhole portal. Compete in chat leaderboards.

## Stack
- **Frontend**: Phaser 3 + Vite + TypeScript
- **Backend**: Django + DRF + PostgreSQL
- **Bot**: python-telegram-bot
- **Deploy**: Docker Compose + Nginx + HTTPS

## Quick Start

```bash
# Clone
git clone https://github.com/agronom28-crypto/space-wormhole-tg
cd space-wormhole-tg

# Backend
cd backend
cp .env.example .env  # fill BOT_TOKEN, DB credentials
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd ../frontend
npm install
npm run dev

# Or full stack with Docker
docker compose up --build
```

## Setup Telegram Bot
1. `/newbot` → BotFather → get token
2. `/setinline` → enable inline mode
3. `/newgame` → `space_wormhole_rush` → set your HTTPS game URL
4. Set token in `backend/.env`

## Architecture
```
User → Telegram → Bot → Game URL
  Game Frontend (Phaser3)
    ↓ POST /api/score/
  Django Backend
    ↓ setGameScore
  Telegram API
```
