"""Telegram Bot API + handshake + notifications (standalone service)."""

from __future__ import annotations

import html
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
    "🤖 <b>CSEC-ASTU Member Bot</b> 🚀\n"
    "<i>Your companion for club duties, verified point alerts & recognition!</i>\n\n"
    "📋 <b>Available Commands:</b>\n"
    "• <code>/status</code> — Check if your Telegram is linked to your profile\n"
    "• <code>/help</code> — Show this handy guide\n"
    "• <code>/start &lt;token&gt;</code> — Link your account from the web dashboard\n\n"
    "💡 <i>Need to connect? Tap <b>Connect Telegram</b> inside your web profile!</i>"
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
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
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
    raw_name = member.full_name.split()[0] if member.full_name else "there"
    name = html.escape(raw_name)
    reason = html.escape((event.reason or "").strip())
    sign_pts = f"{event.points_delta:+d}"

    if event.event_type == PointEventType.NORMAL_WARNING:
        return NotificationType.NORMAL_WARNING, (
            f"⚠️ <b>Notice: Standard Warning Logged</b>\n\n"
            f"Hi <b>{name}</b>, a standard penalty has been recorded on your CSEC ASTU ledger.\n\n"
            f"🔻 <b>Deduction:</b> <code>{sign_pts} pts</code>\n"
            f"📌 <b>Reason:</b> <i>{reason}</i>\n\n"
            "Please ensure you stay aligned with your division commitments. "
            "Consistent participation is vital for all active club members."
        )
    if event.event_type == PointEventType.YELLOW_WARNING:
        return NotificationType.YELLOW_WARNING, (
            f"🟡 <b>Official Warning: Yellow Flag</b>\n\n"
            f"Hi <b>{name}</b>, an official yellow warning has been issued on your record.\n\n"
            f"🔻 <b>Deduction:</b> <code>{sign_pts} pts</code>\n"
            f"📌 <b>Reason:</b> <i>{reason}</i>\n\n"
            "⚠️ <i>This is a formal course-correction notice. Continued infractions may escalate to a Red Warning "
            "or role reassignment. Please contact your Division Head promptly.</i>"
        )
    if event.event_type == PointEventType.RED_WARNING:
        return NotificationType.RED_WARNING, (
            f"🚨 <b>URGENT: Red Warning Issued</b>\n\n"
            f"Hi <b>{name}</b>, a critical red warning has been placed on your account.\n\n"
            f"🔻 <b>Deduction:</b> <code>{sign_pts} pts</code>\n"
            f"📌 <b>Reason:</b> <i>{reason}</i>\n\n"
            "🛑 <b>Action Required:</b> This is your final notice before official membership suspension or layoff. "
            "Please arrange an immediate meeting with club leadership."
        )
    if event.event_type == PointEventType.LAYOFF:
        return NotificationType.LAYOFF, (
            f"🛑 <b>Membership Status Update: Inactive</b>\n\n"
            f"Hi <b>{name}</b>, your membership status in CSEC ASTU has been transitioned to <b>Inactive</b>.\n\n"
            f"📊 <b>Ledger Adjustment:</b> <code>{sign_pts} pts</code>\n"
            f"📌 <b>Reason:</b> <i>{reason}</i>\n\n"
            "If you believe this status requires review or you have mitigating circumstances, "
            "please reach out directly to the Club President."
        )

    raw_title = task.title if task else "contribution"
    title = html.escape(raw_title)
    category = html.escape((task.category if task else "") or "")

    if "streak" in title.lower() or "streak" in reason.lower():
        return NotificationType.STREAK, (
            f"🔥 <b>Streak Milestone Unlocked!</b> 🔥\n\n"
            f"Incredible consistency, <b>{name}</b>! You've been awarded a streak bonus:\n\n"
            f"⚡ <b>Achievement:</b> {title}\n"
            f"💎 <b>Bonus:</b> <code>{sign_pts} pts</code>\n\n"
            "<i>Consistency is what makes great engineers. Keep the fire burning!</i> 🚀"
        )

    cat_line = f"\n🏷️ <b>Category:</b> {category.replace('_', ' ').title()}" if category else ""
    reason_line = f"\n📝 <i>\"{reason}\"</i>" if reason else ""

    text = (
        f"🏆 <b>Points Awarded!</b> ⚡\n\n"
        f"Way to go, <b>{name}</b>! Your claim has been verified and recorded on the ledger:\n\n"
        f"🎯 <b>Task:</b> {title}\n"
        f"💎 <b>Points:</b> <code>{sign_pts} pts</code>"
        f"{cat_line}"
        f"{reason_line}\n\n"
        "Check your updated score and rank on the club scoreboard! 🚀"
    )
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
        "📊 <b>CSEC ASTU — Telegram Connection Digest</b>",
        "",
        f"• No username set: {t['no_username']}",
        f"• Username set, handshake incomplete: {t['pending_handshake']}",
        f"• Recent delivery failures: {t['failed_delivery']}",
        "",
    ]

    def section(title: str, items: list[dict], limit: int = 15) -> None:
        lines.append(f"<b>{title}</b>")
        if not items:
            lines.append("  <i>(none)</i>")
        for row in items[:limit]:
            div = html.escape(row.get("division_name") or "—")
            uname = f" @{html.escape(row['telegram_username'])}" if row.get("telegram_username") else ""
            full_name = html.escape(row["full_name"])
            lines.append(f"  • {full_name}{uname} ({div})")
        if len(items) > limit:
            lines.append(f"  <i>… and {len(items) - limit} more</i>")
        lines.append("")

    section("Missing username:", report["no_username"])
    section("Pending handshake:", report["pending_handshake"])
    section("Failed delivery:", report["failed_delivery"])
    return "\n".join(lines).strip()


async def resolve_admin_chat_ids(db: AsyncSession, settings: Settings) -> list[str]:
    chats: list[str] = list(settings.telegram_admin_chat_ids)
    result = await db.execute(
        select(Member).where(
            Member.role.in_([MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT, MemberRole.DIVISION_HEAD]),
            Member.is_active.is_(True),
            Member.telegram_chat_id.is_not(None),
        )
    )
    for m in result.scalars():
        if m.telegram_chat_id and m.telegram_chat_id not in chats:
            chats.append(m.telegram_chat_id)
    return chats


async def push_weekly_digest(db: AsyncSession, *, settings: Settings, message_text: str) -> dict:
    chat_ids = await resolve_admin_chat_ids(db, settings)
    results = []
    for chat_id in chat_ids:
        ok = await send_telegram_message(settings, chat_id, message_text)
        results.append({"chat_id": chat_id, "sent": ok})
    return {"delivered_to": results, "officer_chat_count": len(chat_ids)}



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
                name = html.escape(member.full_name)
                return (
                    f"🎉 <b>You're In, {name}!</b> 🚀\n\n"
                    "🔗 Your Telegram is now securely linked to your <b>CSEC ASTU</b> profile.\n\n"
                    "✨ <b>What happens next?</b>\n"
                    "• 🏆 Instant alerts when your point claims are approved\n"
                    "• 🔥 Streak recognition & milestone celebrations\n"
                    "• 📢 Official club notices & governance alerts\n\n"
                    "Type <code>/status</code> anytime to check your connection!"
                )
            return (
                "⏳ <b>Link Expired or Invalid</b>\n\n"
                "Handshake tokens are one-time use and expire after 10 minutes for your security.\n\n"
                "🔄 <b>How to fix:</b>\n"
                "1. Head over to your profile on the web platform\n"
                "2. Click <b>Re-link Account</b> to generate a fresh link\n"
                "3. Tap the link to connect instantly!"
            )
        existing = await db.execute(select(Member).where(Member.telegram_chat_id == str(chat_id)))
        member = existing.scalar_one_or_none()
        if member:
            name = html.escape(member.full_name)
            return (
                f"👋 <b>Welcome back, {name}!</b>\n\n"
                "You're already linked and receiving notifications.\n\n"
                f"{HELP_TEXT}"
            )
        return (
            "🤖 <b>Welcome to the CSEC ASTU Bot!</b> 🚀\n\n"
            "To link your Telegram account to your club profile:\n"
            "1. Open the <b>CSEC ASTU Web App</b>\n"
            "2. Go to <b>Profile</b> &rarr; <b>Telegram Notifications</b>\n"
            "3. Click <b>Connect Telegram</b> and tap the generated link!"
        )

    if cmd == "/status":
        existing = await db.execute(select(Member).where(Member.telegram_chat_id == str(chat_id)))
        member = existing.scalar_one_or_none()
        if member:
            name = html.escape(member.full_name)
            uname = (
                f"@{html.escape(member.telegram_username)}"
                if member.telegram_username
                else "<i>(not set)</i>"
            )
            return (
                "✅ <b>Account Linked & Active</b>\n\n"
                f"👤 <b>Member:</b> {name}\n"
                f"📱 <b>Username:</b> {uname}\n"
                "🛡️ <b>Status:</b> Receiving real-time club notifications\n\n"
                "<i>Keep building, hacking, and earning points!</i> ⚡"
            )
        return (
            "⚠️ <b>Account Not Linked</b>\n\n"
            "We couldn't find a CSEC ASTU member profile attached to this chat.\n\n"
            "👉 Open the <b>Web App</b> &rarr; <b>Profile</b> &rarr; click <b>Connect Telegram</b> to link your account!"
        )

    if cmd == "/help":
        return HELP_TEXT

    return (
        "🤔 <i>I didn't quite catch that command.</i>\n\n"
        "Send <code>/help</code> to see everything I can do! 💡"
    )

