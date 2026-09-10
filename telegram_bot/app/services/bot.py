"""Telegram Bot API + handshake + notifications (standalone service)."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models import (
    Division,
    Member,
    MemberRole,
    Notification,
    NotificationStatus,
    NotificationType,
    PointEvent,
    PointEventStatus,
    PointEventType,
    Task,
)

logger = logging.getLogger(__name__)

HELP_TEXT = (
    "CSEC ASTU bot commands:\n"
    "/start <token> — connect your account (use the link from the web app)\n"
    "/status — show whether your Telegram is linked\n"
    "/help — this message"
)


def normalize_username(raw: str) -> str:
    value = raw.strip()
    if value.startswith("@"):
        value = value[1:]
    return value.lower()


async def send_telegram_message(settings: Settings, chat_id: str, text: str) -> bool:
    if not settings.telegram_bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN not set; skipping send")
        return False
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                url,
                json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
            )
            if resp.status_code != 200:
                logger.warning("Telegram send failed: %s %s", resp.status_code, resp.text)
                return False
            return bool(resp.json().get("ok"))
    except Exception:
        logger.exception("Telegram send error")
        return False


async def complete_handshake(
    db: AsyncSession,
    *,
    token: str,
    chat_id: str,
    telegram_username: str | None,
) -> Member | None:
    result = await db.execute(select(Member).where(Member.telegram_connect_token == token))
    member = result.scalar_one_or_none()
    if member is None:
        return None
    expires = member.telegram_token_expires_at
    if expires is not None:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        if expires < datetime.now(UTC):
            member.telegram_connect_token = None
            member.telegram_token_expires_at = None
            await db.flush()
            return None

    member.telegram_chat_id = str(chat_id)
    member.telegram_connect_token = None
    member.telegram_token_expires_at = None
    if telegram_username:
        member.telegram_username = normalize_username(telegram_username)
    await db.flush()
    return member


def _compose_message(
    event: PointEvent, member: Member, task: Task | None
) -> tuple[NotificationType, str]:
    name = member.full_name.split()[0] if member.full_name else "there"
    reason = event.reason.strip()

    if event.event_type == PointEventType.NORMAL_WARNING:
        return NotificationType.NORMAL_WARNING, (
            f"Hi {name}, a standard warning has been logged on your CSEC ASTU record "
            f"({event.points_delta:+d} points).\n\nReason: {reason}\n\n"
            "This penalty has been recorded in the ledger. Please ensure you remain aligned with club responsibilities."
        )
    if event.event_type == PointEventType.YELLOW_WARNING:
        return NotificationType.YELLOW_WARNING, (
            f"Hi {name}, a yellow warning has been logged on your CSEC ASTU record "
            f"({event.points_delta:+d} points).\n\nReason: {reason}\n\n"
            "This is a course-correction notice. Continued issues can lead to a red warning. "
            "Reach out to your division head if you need clarity."
        )
    if event.event_type == PointEventType.RED_WARNING:
        return NotificationType.RED_WARNING, (
            f"Hi {name}, a red warning has been logged ({event.points_delta:+d} points).\n\n"
            f"Reason: {reason}\n\n"
            "This is a last-chance notice before possible role reassignment or layoff. "
            "Please speak with an officer promptly."
        )
    if event.event_type == PointEventType.LAYOFF:
        return NotificationType.LAYOFF, (
            f"Hi {name}, your membership status has been set to inactive "
            f"({event.points_delta:+d} ledger entry).\n\nReason: {reason}\n\n"
            "If you believe this needs review, contact the club president."
        )

    title = task.title if task else "contribution"
    category = (task.category if task else "") or ""
    if "streak" in title.lower() or "streak" in reason.lower():
        return NotificationType.STREAK, (
            f"Nice work, {name}! Streak bonus recorded ({event.points_delta:+d}): {title}.\n"
            "Keep the streak going."
        )
    text = (
        f"Well done, {name}! You earned {event.points_delta:+d} points for: {title}.\n{reason}"
    )
    if category:
        text += f"\nCategory: {category}"
    return NotificationType.MOTIVATIONAL, text


def should_notify_for_event(event: PointEvent, task: Task | None, settings: Settings) -> bool:
    if event.status != PointEventStatus.APPROVED:
        return False
    if event.event_type in {
        PointEventType.NORMAL_WARNING,
        PointEventType.YELLOW_WARNING,
        PointEventType.RED_WARNING,
        PointEventType.LAYOFF,
    }:
        return True
    if event.points_delta >= settings.telegram_motivational_min_points:
        return True
    if task and "streak" in (task.title or "").lower():
        return True
    if "streak" in (event.reason or "").lower() and event.points_delta > 0:
        return True
    return False


async def notify_for_point_event(
    db: AsyncSession, *, event_id: UUID, settings: Settings
) -> dict:
    event = await db.get(PointEvent, event_id)
    if event is None:
        return {"ok": False, "detail": "event not found"}

    task = await db.get(Task, event.task_id) if event.task_id else None
    if not should_notify_for_event(event, task, settings):
        return {"ok": True, "skipped": True, "reason": "not notifiable"}

    member = await db.get(Member, event.member_id)
    if member is None:
        return {"ok": False, "detail": "member not found"}

    ntype, text = _compose_message(event, member, task)
    status = NotificationStatus.SKIPPED_NO_CHAT_ID
    sent_at = None
    if member.telegram_chat_id:
        ok = await send_telegram_message(settings, member.telegram_chat_id, text)
        status = NotificationStatus.SENT if ok else NotificationStatus.FAILED
        if ok:
            sent_at = datetime.now(UTC)

    row = Notification(
        member_id=member.id,
        related_event_id=event.id,
        type=ntype,
        message_text=text,
        status=status,
        sent_at=sent_at,
    )
    db.add(row)
    await db.flush()
    return {
        "ok": True,
        "notification_id": str(row.id),
        "status": status.value,
    }


async def collect_telegram_gaps(db: AsyncSession) -> dict:
    active = await db.execute(
        select(Member).where(Member.is_active.is_(True), Member.google_id.is_not(None))
    )
    members = list(active.scalars())
    no_username: list[dict] = []
    pending_handshake: list[dict] = []
    failed_delivery: list[dict] = []

    div_ids = {m.division_id for m in members if m.division_id}
    divisions: dict[UUID, str] = {}
    if div_ids:
        rows = await db.execute(select(Division).where(Division.id.in_(div_ids)))
        divisions = {d.id: d.name for d in rows.scalars()}

    def brief(m: Member) -> dict:
        return {
            "member_id": str(m.id),
            "full_name": m.full_name,
            "email": m.email,
            "division_id": str(m.division_id) if m.division_id else None,
            "division_name": divisions.get(m.division_id) if m.division_id else None,
            "telegram_username": m.telegram_username,
        }

    fail_q = await db.execute(
        select(Notification.member_id)
        .where(Notification.status == NotificationStatus.FAILED)
        .distinct()
    )
    failed_ids = set(fail_q.scalars())

    for m in members:
        if not m.telegram_username:
            no_username.append(brief(m))
        elif not m.telegram_chat_id:
            pending_handshake.append(brief(m))
        if m.id in failed_ids:
            failed_delivery.append(brief(m))

    return {
        "no_username": no_username,
        "pending_handshake": pending_handshake,
        "failed_delivery": failed_delivery,
        "totals": {
            "no_username": len(no_username),
            "pending_handshake": len(pending_handshake),
            "failed_delivery": len(failed_delivery),
        },
    }


def format_admin_digest(report: dict) -> str:
    t = report["totals"]
    lines = [
        "CSEC ASTU — Telegram connection digest",
        "",
        f"No username set: {t['no_username']}",
        f"Username set, handshake incomplete: {t['pending_handshake']}",
        f"Recent delivery failures: {t['failed_delivery']}",
        "",
    ]

    def section(title: str, items: list[dict], limit: int = 15) -> None:
        lines.append(title)
        if not items:
            lines.append("  (none)")
        for row in items[:limit]:
            div = row.get("division_name") or "—"
            uname = f" @{row['telegram_username']}" if row.get("telegram_username") else ""
            lines.append(f"  • {row['full_name']}{uname} ({div})")
        if len(items) > limit:
            lines.append(f"  … and {len(items) - limit} more")
        lines.append("")

    section("Missing username:", report["no_username"])
    section("Pending handshake:", report["pending_handshake"])
    section("Failed delivery:", report["failed_delivery"])
    return "\n".join(lines).strip()


async def resolve_admin_chat_ids(db: AsyncSession, settings: Settings) -> list[str]:
    chats: list[str] = list(settings.telegram_admin_chat_ids)
    result = await db.execute(
        select(Member).where(
            Member.role.in_([MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT]),
            Member.is_active.is_(True),
            Member.telegram_chat_id.is_not(None),
        )
    )
    for m in result.scalars():
        if m.telegram_chat_id and m.telegram_chat_id not in chats:
            chats.append(m.telegram_chat_id)
    return chats


async def push_admin_digest(db: AsyncSession, *, settings: Settings) -> dict:
    report = await collect_telegram_gaps(db)
    text = format_admin_digest(report)
    chat_ids = await resolve_admin_chat_ids(db, settings)
    results = []
    for chat_id in chat_ids:
        ok = await send_telegram_message(settings, chat_id, text)
        results.append({"chat_id": chat_id, "sent": ok})

    presidents = await db.execute(
        select(Member)
        .where(Member.role == MemberRole.PRESIDENT, Member.is_active.is_(True))
        .limit(1)
    )
    president = presidents.scalar_one_or_none()
    if president:
        any_sent = any(r["sent"] for r in results)
        db.add(
            Notification(
                member_id=president.id,
                related_event_id=None,
                type=NotificationType.ADMIN_REPORT,
                message_text=text,
                status=(
                    NotificationStatus.SENT
                    if any_sent
                    else (
                        NotificationStatus.SKIPPED_NO_CHAT_ID
                        if not chat_ids
                        else NotificationStatus.FAILED
                    )
                ),
                sent_at=datetime.now(UTC) if any_sent else None,
            )
        )
        await db.flush()

    return {"report": report, "delivered_to": results, "admin_chat_count": len(chat_ids)}


async def handle_bot_command(
    db: AsyncSession,
    *,
    text: str,
    chat_id: str,
    from_user: dict,
) -> str:
    parts = text.strip().split(maxsplit=1)
    cmd = parts[0].split("@")[0].lower() if parts else ""
    arg = parts[1].strip() if len(parts) > 1 else ""

    if cmd == "/start":
        if arg:
            member = await complete_handshake(
                db,
                token=arg,
                chat_id=str(chat_id),
                telegram_username=from_user.get("username"),
            )
            if member:
                return (
                    f"Connected, {member.full_name}! You'll receive warnings and "
                    "recognition messages here. Use /status anytime."
                )
            return (
                "That connect link is invalid or expired. "
                "Open the web app → Connect Telegram and try again."
            )
        existing = await db.execute(select(Member).where(Member.telegram_chat_id == str(chat_id)))
        member = existing.scalar_one_or_none()
        if member:
            return f"You're already linked as {member.full_name}. {HELP_TEXT}"
        return (
            "Welcome to the CSEC ASTU bot.\n"
            "To link your account, use the Connect Telegram button in the web app."
        )

    if cmd == "/status":
        existing = await db.execute(select(Member).where(Member.telegram_chat_id == str(chat_id)))
        member = existing.scalar_one_or_none()
        if member:
            uname = f"@{member.telegram_username}" if member.telegram_username else "(none)"
            return f"Linked as {member.full_name} ({uname})."
        return "Not linked yet. Use Connect Telegram in the web app."

    if cmd == "/help":
        return HELP_TEXT

    return "Unknown command. Try /help."
