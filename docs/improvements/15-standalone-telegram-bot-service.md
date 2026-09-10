# 15 — Standalone Telegram Bot Service & Push Notification Engine

**Source:** Telegram Bot Architecture (`telegram_bot/`) merged from `feat/telegram_bot`  
**Decision:** Decoupled FastAPI microservice running on port 8001 sharing the PostgreSQL database with the core backend.

## Why

Member engagement, urgent warning deliveries, and executive accountability require direct, out-of-band communication. In university engineering clubs, students rarely monitor email or internal web dashboards continuously, but actively use Telegram daily. Decoupling the Telegram bot into its own dedicated service ensures that slow third-party Telegram Bot API network calls do not block or degrade high-throughput core web transactions.

## Architecture & Responsibilities

```
+-----------------------------------------------------------------------------------------+
|                                    NEON POSTGRESQL                                      |
|          (members, point_events, notifications, tasks, divisions, audit_logs)          |
+------------------------------------+----------------------------------------------------+
                                     | Shared Database Connection
                                     v
+-----------------------------+               +-----------------------------------------+
|     FastAPI Core Backend    |               |       Telegram Bot Microservice         |
|         (Port 8000)         |               |               (Port 8001)               |
+-----------------------------+               +-----------------------------------------+
| - Member & Task Management  |               | - /start <token> Handshake Engine       |
| - Claims & Approvals        |  HTTP POST    | - Inbound Webhook Command Router        |
| - Batch Operations & Export | ------------> | - Event Notification Push Dispatcher    |
| - Session Code Attendance   | (X-Internal)  | - Disciplinary & Milestone Copy Engine  |
+-----------------------------+               | - Admin Gap Digest Generator            |
                                              +--------------------+--------------------+
                                                                   | Telegram Bot API
                                                                   v
                                                      +-------------------------+
                                                      |   TELEGRAM BOT API      |
                                                      |  (@BotFather / Users)   |
                                                      +-------------------------+
```

## API Surface

| Endpoint | Method | Authentication | Purpose |
|---|:---:|---|---|
| `/health` | `GET` | None | Service liveness & orchestration health probe |
| `/webhook` | `POST` | `X-Telegram-Bot-Api-Secret-Token` | Inbound Telegram updates (`/start`, `/status`, `/help`) |
| `/internal/notify` | `POST` | `X-Internal-Secret` | Event push notification dispatcher called on point ledger writes |
| `/internal/admin-digest` | `POST` | `X-Internal-Secret` | Compiles member linking gaps and pushes report to admin chat IDs |

## Handshake Flow (`/start <token>`)

1. Member clicks "Connect Telegram" in the web application profile.
2. Web backend generates an expiring, cryptographically secure `telegram_connect_token` (`Member.telegram_connect_token`).
3. Member is redirected to the bot with deep-link: `t.me/<bot_username>?start=<token>`.
4. Bot receives webhook update, validates token against database, sets `telegram_chat_id` and normalized `telegram_username`, invalidates the token, and sends a confirmation greeting.

## Push Notification Coverage

- **Disciplinary Warnings:**
  - `Normal Warning (-15 pts)`: Logged infraction penalty copy.
  - `Yellow Warning (-25 pts)`: Formal course-correction notice.
  - `Red Warning (-50 pts)`: Urgent last-chance dismissal notice.
  - `Layoff`: Membership deactivation notification.
- **Milestones & Motivation:**
  - High-impact contributions ($\ge 40$ points).
  - Streak bonuses and special achievements.
