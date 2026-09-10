# CSEC ASTU Telegram Bot (standalone service)

Runs separately from the FastAPI backend. Shares the same Postgres database for
`members` / `point_events` / `notifications`, and owns all Telegram Bot API traffic.

## Endpoints

| Path | Auth | Purpose |
|---|---|---|
| `GET /health` | none | Liveness |
| `POST /webhook` | `X-Telegram-Bot-Api-Secret-Token` | Telegram updates (`/start`, `/status`, `/help`) |
| `POST /internal/notify` | `X-Internal-Secret` | Backend asks bot to notify for a `point_event_id` |
| `POST /internal/admin-digest` | `X-Internal-Secret` | Push missing-handshake digest to admin chats |

## Run

```bash
cd telegram_bot
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# set DATABASE_URL (same as backend), TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME,
# TELEGRAM_WEBHOOK_SECRET, INTERNAL_API_SECRET

uvicorn app.main:app --reload --port 8001
```

## Register Telegram webhook

Point Telegram at **this** service (not the backend):

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://<bot-public-host>/webhook\",\"secret_token\":\"$TELEGRAM_WEBHOOK_SECRET\"}"
```

For local testing, expose port 8001 with ngrok/cloudflared.

## Backend wiring

The main API keeps member-facing routes (`POST /api/v1/members/me/telegram`, admin report)
and calls this service over HTTP when a ledger event should notify someone.
See `docs/improvements/09-telegram-phase2.md`.
