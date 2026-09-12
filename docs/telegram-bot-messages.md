# CSEC ASTU Telegram Bot — Message Templates & Formatting Guide

This document outlines the messaging design, formatting standards, and templates used by the **CSEC ASTU Telegram Bot Service** (`telegram_bot/`). Future maintainers should reference this document when adding new commands or modifying notification copy.

---

## 1. Telegram Formatting Standard: HTML

All outgoing messages sent via `send_telegram_message()` use **Telegram HTML formatting** (`parse_mode="HTML"`).

### Why HTML instead of MarkdownV2?
- **MarkdownV2**: Requires escaping almost all standard punctuation characters (`.`, `-`, `!`, `+`, `(`, `)`, `_`, `*`, `[`, `]`) with a backslash `\`. Missing a single escape causes Telegram to return a `400 Bad Request: can't parse entities` error and drop the message.
- **HTML**: Allows standard punctuation (including `+10 pts`, exclamation points, and hyphens) without escaping.

### Security & Sanitization Rule:
Whenever including dynamic user input (member full names, reason strings, task titles, or division names), **always wrap them in Python's standard `html.escape()`**:
```python
import html

name = html.escape(member.full_name)
reason = html.escape(event.reason or "")
```
This prevents malicious or accidental HTML injection (e.g. `<script>` or unmatched `<` brackets) from breaking Telegram's HTML parser.

### Supported HTML Tags in Telegram:
- `<b>Bold</b>` or `<strong>Bold</strong>`
- `<i>Italic</i>` or `<em>Italic</em>`
- `<code>Inline monospace code</code>` (great for points like `+15 pts`, commands like `/status`, or tokens)
- `<pre>Code block</pre>`
- `<a href="https://...">Clickable hyperlink</a>`

---

## 2. Interactive Chat Commands

These messages are returned in response to user commands sent directly inside the Telegram chat (`telegram_bot/app/services/bot.py` -> `handle_bot_command()`).

### `/help`
Sent when a user requests help or sends `/help`.
```html
🤖 <b>CSEC-ASTU Member Bot</b> 🚀
<i>Your companion for club duties, verified point alerts & recognition!</i>

📋 <b>Available Commands:</b>
• <code>/status</code> — Check if your Telegram is linked to your profile
• <code>/help</code> — Show this handy guide
• <code>/start &lt;token&gt;</code> — Link your account from the web dashboard

💡 <i>Need to connect? Tap <b>Connect Telegram</b> inside your web profile!</i>
```

---

### `/start <token>` (Handshake Success)
Sent when a member clicks the deep link from their web profile (`https://t.me/<bot>?start=<token>`) and clicks **START**.
```html
🎉 <b>You're In, {name}!</b> 🚀

🔗 Your Telegram is now securely linked to your <b>CSEC ASTU</b> profile.

✨ <b>What happens next?</b>
• 🏆 Instant alerts when your point claims are approved
• 🔥 Streak recognition & milestone celebrations
• 📢 Official club notices & governance alerts

Type <code>/status</code> anytime to check your connection!
```

---

### `/start <token>` (Invalid or Expired Token)
Sent if the token was already used, expired (10-minute TTL), or malformed.
```html
⏳ <b>Link Expired or Invalid</b>

Handshake tokens are one-time use and expire after 10 minutes for your security.

🔄 <b>How to fix:</b>
1. Head over to your profile on the web platform
2. Click <b>Re-link Account</b> to generate a fresh link
3. Tap the link to connect instantly!
```

---

### `/start` (Without Token)
- **If already linked:**
  ```html
  👋 <b>Welcome back, {name}!</b>

  You're already linked and receiving notifications.

  [HELP_TEXT]
  ```
- **If not linked yet:**
  ```html
  🤖 <b>Welcome to the CSEC ASTU Bot!</b> 🚀

  To link your Telegram account to your club profile:
  1. Open the <b>CSEC ASTU Web App</b>
  2. Go to <b>Profile</b> &rarr; <b>Telegram Notifications</b>
  3. Click <b>Connect Telegram</b> and tap the generated link!
  ```

---

### `/status`
- **If linked:**
  ```html
  ✅ <b>Account Linked & Active</b>

  👤 <b>Member:</b> {name}
  📱 <b>Username:</b> @{username}
  🛡️ <b>Status:</b> Receiving real-time club notifications

  <i>Keep building, hacking, and earning points!</i> ⚡
  ```
- **If not linked:**
  ```html
  ⚠️ <b>Account Not Linked</b>

  We couldn't find a CSEC ASTU member profile attached to this chat.

  👉 Open the <b>Web App</b> &rarr; <b>Profile</b> &rarr; click <b>Connect Telegram</b> to link your account!
  ```

---

### Unknown Command Fallback
Sent when a user types unrecognized text or commands.
```html
🤔 <i>I didn't quite catch that command.</i>

Send <code>/help</code> to see everything I can do! 💡
```

---

## 3. Real-Time Ledger Notifications

These notifications are triggered by backend ledger events (`backend/app/services/telegram.py` -> `telegram_bot/app/services/bot.py` -> `_compose_message()`).

### Points Awarded (Claim Approved / Low-Stakes Low-Latency Auto-Approval)
```html
🏆 <b>Points Awarded!</b> ⚡

Way to go, <b>{name}</b>! Your claim has been verified and recorded on the ledger:

🎯 <b>Task:</b> {title}
💎 <b>Points:</b> <code>{sign_pts} pts</code>
🏷️ <b>Category:</b> {Category}
📝 <i>"{reason}"</i>

Check your updated score and rank on the club scoreboard! 🚀
```

---

### Streak Milestone Bonus
```html
🔥 <b>Streak Milestone Unlocked!</b> 🔥

Incredible consistency, <b>{name}</b>! You've been awarded a streak bonus:

⚡ <b>Achievement:</b> {title}
💎 <b>Bonus:</b> <code>{sign_pts} pts</code>

<i>Consistency is what makes great engineers. Keep the fire burning!</i> 🚀
```

---

### Disciplinary Warnings

#### 1. Standard / Normal Warning
```html
⚠️ <b>Notice: Standard Warning Logged</b>

Hi <b>{name}</b>, a standard penalty has been recorded on your CSEC ASTU ledger.

🔻 <b>Deduction:</b> <code>{sign_pts} pts</code>
📌 <b>Reason:</b> <i>{reason}</i>

Please ensure you stay aligned with your division commitments. Consistent participation is vital for all active club members.
```

#### 2. Yellow Flag Warning (Course Correction)
```html
🟡 <b>Official Warning: Yellow Flag</b>

Hi <b>{name}</b>, an official yellow warning has been issued on your record.

🔻 <b>Deduction:</b> <code>{sign_pts} pts</code>
📌 <b>Reason:</b> <i>{reason}</i>

⚠️ <i>This is a formal course-correction notice. Continued infractions may escalate to a Red Warning or role reassignment. Please contact your Division Head promptly.</i>
```

#### 3. Red Warning (Urgent / Final Notice)
```html
🚨 <b>URGENT: Red Warning Issued</b>

Hi <b>{name}</b>, a critical red warning has been placed on your account.

🔻 <b>Deduction:</b> <code>{sign_pts} pts</code>
📌 <b>Reason:</b> <i>{reason}</i>

🛑 <b>Action Required:</b> This is your final notice before official membership suspension or layoff. Please arrange an immediate meeting with club leadership.
```

---

### Membership Layoff / Inactivation
```html
🛑 <b>Membership Status Update: Inactive</b>

Hi <b>{name}</b>, your membership status in CSEC ASTU has been transitioned to <b>Inactive</b>.

📊 <b>Ledger Adjustment:</b> <code>{sign_pts} pts</code>
📌 <b>Reason:</b> <i>{reason}</i>

If you believe this status requires review or you have mitigating circumstances, please reach out directly to the Club President.
```

---

## 4. Admin Connection Digest

Sent periodically or on-demand to club leadership (President, Vice-President, or chat IDs in `TELEGRAM_ADMIN_CHAT_IDS`) via `/internal/admin-digest`:

```html
📊 <b>CSEC ASTU — Telegram Connection Digest</b>

• No username set: {count}
• Username set, handshake incomplete: {count}
• Recent delivery failures: {count}

<b>Missing username:</b>
  • Full Name (@username) (Division)

<b>Pending handshake:</b>
  • Full Name (@username) (Division)

<b>Failed delivery:</b>
  • Full Name (@username) (Division)
```

---

## 5. Maintenance Checklist for Developers

1. **Editing Templates**: All templates live in [`telegram_bot/app/services/bot.py`](file:///d:/Full-Stack_Projects/csec-astu-platform/telegram_bot/app/services/bot.py) under `HELP_TEXT`, `_compose_message()`, `handle_bot_command()`, and `format_admin_digest()`.
2. **Testing Changes**:
   * Run unit tests: `pytest` inside the `telegram_bot` directory.
   * Verify all dynamic inputs are passed through `html.escape()`.
3. **Deploying**:
   * Ensure `parse_mode: "HTML"` remains in `send_telegram_message()`.
   * Keep the Render webhook registered:  
     `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<BOT_DOMAIN>/webhook&secret_token=<SECRET>`
