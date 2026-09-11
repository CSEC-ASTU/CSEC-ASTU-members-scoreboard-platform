# CSEC ASTU — Bot Integration Guide

> **Scope**: This document explains how `backend/` and `telegram_bot/` are designed to
> work together, what is already wired up, what is missing, and how to complete the
> integration end-to-end.

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Browser / Next.js Frontend            │
│                       (localhost:3000)                   │
└──────────────┬────────────────────────────┬─────────────┘
               │ REST (cookies/JWT)          │ REST
               ▼                            ▼
┌─────────────────────────┐    ┌────────────────────────────┐
│   Backend (FastAPI)     │    │   Telegram Bot (FastAPI)   │
│   localhost:8000        │    │   localhost:8001           │
│   backend/app/          │    │   telegram_bot/app/        │
└────────────┬────────────┘    └────────────┬───────────────┘
             │                              │
             │  POST /internal/notify       │
             │ ────────────────────────────►│  (NOT YET IMPLEMENTED)
             │  X-Internal-Secret: <secret> │
             │                              │
             └──────────┬───────────────────┘
                        │  shared read/write
                        ▼
              ┌──────────────────┐
              │   PostgreSQL DB  │
              │   (csec_astu)    │
              └──────────────────┘
                        ▲
                        │  webhook (HTTPS)
              ┌─────────┴────────┐
              │  Telegram Cloud  │
              │  api.telegram.org│
              └──────────────────┘
```

Both services connect to **the same PostgreSQL database**. They do not share any in-process
code — the bot has its own stripped-down model definitions that mirror the tables written
by the backend.

---

## 2. Services at a Glance

| | Backend | Telegram Bot |
|---|---|---|
| **Port** | `8000` | `8001` |
| **Root dir** | `backend/` | `telegram_bot/` |
| **Framework** | FastAPI + SQLAlchemy (async) | FastAPI + SQLAlchemy (async) |
| **Responsibilities** | Auth, members, points, tasks, divisions | Webhook handler, notifications, admin digest |
| **DB access** | Full write access | Read + write to `members`, `notifications` |
| **External calls IN** | None (it is the source of truth) | Telegram Cloud sends updates via webhook |
| **External calls OUT** | HTTP POST to bot `/internal/notify` *(planned)* | HTTP POST to `api.telegram.org` |

---

## 3. The Shared Database Tables

The bot's `telegram_bot/app/models.py` defines a **read model** subset of the same tables
that the backend owns:

| Table | Backend model | Bot model | Bot access |
|---|---|---|---|
| `members` | `backend/app/models/member.py` | `models.Member` | Read + write telegram columns |
| `notifications` | `backend/app/models/notification.py` | `models.Notification` | Insert new rows |
| `point_events` | `backend/app/models/point_event.py` | `models.PointEvent` | Read-only |
| `tasks` | `backend/app/models/task.py` | `models.Task` | Read-only |
| `divisions` | `backend/app/models/division.py` | `models.Division` | Read-only |

> **Important**: The bot never runs Alembic migrations. Schema is always owned by the
> backend. The bot connects to the same DB and reads/writes existing tables.

### Telegram-specific columns on `members`

```sql
telegram_username         VARCHAR(255)   -- set at import or by member self-update
telegram_chat_id          VARCHAR(255)   -- set by the bot when /start <token> completes
telegram_connect_token    VARCHAR(255)   -- one-time token issued by the backend
telegram_token_expires_at TIMESTAMPTZ   -- token expiry (10 min window)
```

---

## 4. Integration Points (Detailed)

### 4.1 Member Account Linking (Handshake)

This is how a member's Telegram account gets connected to their platform record.

**Intended flow** (partially implemented):

```
1. Member opens the web app → clicks "Connect Telegram"
2. Backend generates a random one-time token, stores it in:
      members.telegram_connect_token
      members.telegram_token_expires_at  (+10 min)
3. Frontend shows a deep link:  https://t.me/<BOT_USERNAME>?start=<token>
4. Member clicks the link → opens Telegram → bot receives /start <token>
5. Bot calls complete_handshake() in telegram_bot/app/services/bot.py:
      - Looks up member by telegram_connect_token
      - Checks expiry
      - Writes telegram_chat_id and telegram_username
      - Clears the token
6. Bot replies: "Connected, <name>! ..."
```

**What is implemented:**
- ✅ DB columns exist (`telegram_connect_token`, `telegram_chat_id`, etc.)
- ✅ Bot-side handshake logic: `complete_handshake()` in `telegram_bot/app/services/bot.py`
- ✅ Bot webhook receiver: `POST /webhook` in `telegram_bot/app/routers/api.py`
- ✅ `/start`, `/status`, `/help` command handlers

**What is missing:**
- ❌ Backend endpoint to **generate** the connect token (`POST /api/v1/auth/telegram/connect`)
- ❌ Frontend "Connect Telegram" button that calls it and shows the deep link

---

### 4.2 Point Event Notifications (Backend → Bot)

When a point event is approved (by an officer or auto-approved), the member should
receive a Telegram message.

**Intended flow:**

```
1. Officer approves a point event via:
      PATCH /api/v1/point-events/{id}/approve
2. Backend calls:
      POST http://localhost:8001/internal/notify
      Body:   { "point_event_id": "<uuid>" }
      Header: X-Internal-Secret: <shared secret>
3. Bot receives the call → notify_for_point_event()
      - Loads the PointEvent, Member, Task from the shared DB
      - Decides if it's worth notifying:
            * Warnings (normal/yellow/red/layoff) → always notify
            * Motivational → only if points_delta >= TELEGRAM_MOTIVATIONAL_MIN_POINTS (default 40)
            * Streak → always notify
      - Calls send_telegram_message() → Telegram Cloud → member's chat
      - Inserts a row in notifications table (SENT / FAILED / SKIPPED_NO_CHAT_ID)
4. Bot returns { "ok": true, "notification_id": "...", "status": "..." }
```

**What is implemented:**
- ✅ Bot endpoint: `POST /internal/notify` in `telegram_bot/app/routers/api.py`
- ✅ Notification logic: `notify_for_point_event()` in `telegram_bot/app/services/bot.py`
- ✅ Message composer: `_compose_message()` — per-event-type message templates
- ✅ Notification threshold logic: `should_notify_for_event()`
- ✅ `notifications` table exists (backend schema, bot reads/writes it)

**What is missing:**
- ❌ Backend config field for `TELEGRAM_BOT_URL` (e.g. `http://localhost:8001`)
- ❌ Backend config field for `INTERNAL_API_SECRET` (shared with the bot)
- ❌ HTTP call from the backend after a point event resolves to `APPROVED`

The exact places in the backend where this call must be inserted:

| File | Function | Trigger |
|---|---|---|
| `backend/app/api/v1/routers/point_events.py` | `approve_event()` | Officer manually approves |
| `backend/app/api/v1/routers/point_events.py` | `create_point_event()` | Auto-approved claim or officer event |
| `backend/app/api/v1/routers/point_events.py` | `bulk_approve()` | Bulk approval (per succeeded event) |
| `backend/app/api/v1/routers/point_events.py` | `batch_officer_events()` | Batch officer events |

---

### 4.3 Admin Digest (Scheduled or Manual)

Officers/presidents can trigger an admin digest report about Telegram connection gaps.

**Intended flow:**

```
POST /internal/admin-digest  (called by a cron job or admin action)
  → collect_telegram_gaps()
        - members with no telegram_username set
        - members with username set but telegram_chat_id still NULL (handshake pending)
        - members with at least one FAILED notification delivery
  → format_admin_digest()   — plain-text summary
  → sends to all president/VP telegram_chat_ids + TELEGRAM_ADMIN_CHAT_IDS list
  → inserts a Notification row (type: ADMIN_REPORT)
```

**What is implemented:**
- ✅ Bot endpoint: `POST /internal/admin-digest` in `telegram_bot/app/routers/api.py`
- ✅ Full digest logic: `push_admin_digest()`, `collect_telegram_gaps()`, `format_admin_digest()`

**What is missing:**
- ❌ Cron job or admin UI to trigger this automatically (e.g., weekly)

---

## 5. Security Model

The two services communicate over HTTP using a **shared internal secret**.

```
Backend  ─── POST /internal/notify ──►  Bot
              Header: X-Internal-Secret: <INTERNAL_API_SECRET>
```

| Security layer | Mechanism |
|---|---|
| Backend → Bot calls | `X-Internal-Secret` header checked by `require_internal_secret` dependency |
| Telegram → Bot webhook | `X-Telegram-Bot-Api-Secret-Token` header, set when registering the webhook |
| Frontend → Backend | HttpOnly JWT cookies (access + refresh) |

> **Never commit either `.env` file or the actual secrets to git.** Both are gitignored.

---

## 6. Environment Configuration

### `telegram_bot/.env` — create from `.env.example`

```ini
APP_ENV=development
DEBUG=true
PORT=8001

DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/csec_astu

TELEGRAM_BOT_TOKEN=<from BotFather>
TELEGRAM_BOT_USERNAME=<your_bot_username_without_@>
TELEGRAM_WEBHOOK_SECRET=<long-random-string>

INTERNAL_API_SECRET=<must-match-backend>

TELEGRAM_MOTIVATIONAL_MIN_POINTS=40
TELEGRAM_ADMIN_CHAT_IDS=[]
```

### `backend/.env` — additions needed

```ini
# Add these two new fields (they don't exist yet in config.py):
TELEGRAM_BOT_URL=http://localhost:8001
INTERNAL_API_SECRET=<must-match-bot>
```

> `TELEGRAM_BOT_URL` and `INTERNAL_API_SECRET` do not yet exist in
> `backend/app/config.py` — they must be added to the `Settings` class.

---

## 7. Running Both Services Locally

```powershell
# Terminal 1 — Backend (already running)
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Telegram Bot (not yet started)
cd telegram_bot
uvicorn app.main:app --reload --port 8001
```

To receive webhook events from Telegram in development, expose the bot via **ngrok**:

```bash
ngrok http 8001
# Copy the HTTPS forwarding URL, e.g. https://abc123.ngrok-free.app
```

Then register the webhook with Telegram (one-time setup):

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://abc123.ngrok-free.app/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"
  }'
```

Confirm it's set:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

---

## 8. What Needs to Be Built — Checklist

### Backend (`backend/`)

- [ ] Add `telegram_bot_url: str = ""` and `internal_api_secret: str = ""` to `backend/app/config.py`
- [ ] Add both to `backend/.env.example`
- [ ] Create a `notify_bot(event_id, settings)` async helper that fires `POST <TELEGRAM_BOT_URL>/internal/notify` in the background (use `asyncio.create_task` to avoid blocking the response)
- [ ] Call `notify_bot` after every approval path:
  - `approve_event()` router
  - `create_point_event()` router (auto-approve branch)
  - `bulk_approve()` router (once per `succeeded` event)
  - `batch_officer_events()` router
- [ ] Add `POST /api/v1/auth/telegram/connect` endpoint:
  - Requires auth cookie
  - Generates `secrets.token_urlsafe(32)`
  - Sets `member.telegram_connect_token` and `member.telegram_token_expires_at` (+10 min)
  - Returns `{ "link": "https://t.me/<BOT_USERNAME>?start=<token>" }`

### Bot (`telegram_bot/`)

- [ ] Create `telegram_bot/.env` from `.env.example` and fill in all values

### Frontend (`frontend/`)

- [ ] Add a "Connect Telegram" button to the member profile or settings page
- [ ] On click: call `POST /api/v1/auth/telegram/connect`, then open the returned `link` in a new tab

### Infrastructure

- [ ] Register the Telegram webhook (see §7)
- [ ] Ensure `INTERNAL_API_SECRET` is **identical** in both `backend/.env` and `telegram_bot/.env`
- [ ] (Optional) Set a weekly cron to `POST http://localhost:8001/internal/admin-digest`

---

## 9. Notification Types Reference

| `event_type` | Notified? | `NotificationType` written |
|---|---|---|
| `normal_warning` | ✅ Always | `NORMAL_WARNING` |
| `yellow_warning` | ✅ Always | `YELLOW_WARNING` |
| `red_warning` | ✅ Always | `RED_WARNING` |
| `layoff` | ✅ Always | `LAYOFF` |
| `claim` / `manual_adjustment` with "streak" | ✅ Always | `STREAK` |
| `claim` / `manual_adjustment` ≥ 40 pts | ✅ Yes | `MOTIVATIONAL` |
| `claim` / `manual_adjustment` < 40 pts | ❌ Skipped | — |

Threshold is controlled by `TELEGRAM_MOTIVATIONAL_MIN_POINTS` in `telegram_bot/.env`
(default `40`).

---

## 10. Health Checks

```bash
# Backend
curl http://localhost:8000/api/v1/health
# → { "status": "ok" }

# Bot
curl http://localhost:8001/health
# → { "status": "ok", "service": "telegram_bot" }
```

Use these to confirm both services are up before testing end-to-end flows.
