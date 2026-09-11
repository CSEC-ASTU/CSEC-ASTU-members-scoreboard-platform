"""Development polling runner for CSEC ASTU Telegram Bot.

Runs getUpdates in a loop to process messages directly on localhost
without requiring ngrok or public webhook infrastructure.
"""

from __future__ import annotations

import asyncio
import logging

import httpx

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.services.bot import handle_bot_command, send_telegram_message

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("telegram_poll")


async def run_poll() -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        logger.error("TELEGRAM_BOT_TOKEN is not set in telegram_bot/.env")
        return

    logger.info(
        "Initializing Telegram polling mode for bot: @%s",
        settings.telegram_bot_username or "unknown",
    )

    # Clear any previous webhook to allow getUpdates
    async with httpx.AsyncClient(timeout=15.0) as client:
        del_resp = await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/deleteWebhook"
        )
        logger.info("deleteWebhook response: %s", del_resp.json().get("description", "ok"))

    logger.info("Bot is listening for messages! Click Start or send commands in Telegram.")

    offset: int | None = None
    async with httpx.AsyncClient(timeout=35.0) as client:
        while True:
            try:
                params: dict[str, int] = {"timeout": 25}
                if offset is not None:
                    params["offset"] = offset

                resp = await client.get(
                    f"https://api.telegram.org/bot{settings.telegram_bot_token}/getUpdates",
                    params=params,
                )
                if resp.status_code != 200:
                    logger.warning("getUpdates returned status %d: %s", resp.status_code, resp.text)
                    await asyncio.sleep(2)
                    continue

                payload = resp.json()
                updates = payload.get("result") or []
                for update in updates:
                    offset = update["update_id"] + 1
                    logger.info("Processing update: %s", update)
                    message = update.get("message") or update.get("edited_message")
                    if not message:
                        logger.info("Update had no message (event type: %s)", list(update.keys()))
                        continue

                    text = (message.get("text") or "").strip()
                    chat = message.get("chat") or {}
                    chat_id = chat.get("id")
                    from_user = message.get("from") or {}

                    if not text or chat_id is None:
                        logger.info("Message had no text or chat_id: %s", message)
                        continue

                    logger.info("Received message '%s' from chat %s (user: %s)", text, chat_id, from_user.get("username"))
                    async with AsyncSessionLocal() as db:
                        reply = await handle_bot_command(
                            db, text=text, chat_id=str(chat_id), from_user=from_user
                        )
                        await db.commit()
                    sent_ok = await send_telegram_message(settings, str(chat_id), reply)
                    logger.info("Sent reply to chat %s (ok=%s): %s", chat_id, sent_ok, reply[:60])
            except asyncio.CancelledError:
                logger.info("Polling stopped.")
                break
            except Exception as exc:
                logger.warning("Polling error: %s", exc)
                await asyncio.sleep(2)


if __name__ == "__main__":
    try:
        asyncio.run(run_poll())
    except KeyboardInterrupt:
        logger.info("Exiting on Ctrl+C")
