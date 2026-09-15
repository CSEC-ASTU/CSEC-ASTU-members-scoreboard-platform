# CSEC-ASTU Events & Certificate Engine — Luma-Embed & Smart Ingestion Architecture

## Executive Architecture & Philosophy

This architecture adopts a **pragmatic, production-grade hybrid model** specifically optimized for **zero infrastructure costs**, **100% server reliability on Render's Free Tier (512 MB RAM)**, and an **elite, professional student experience**.

```
[ 1. PUBLIC ANNOUNCEMENT & RSVP ]
   CSEC Telegram (5,000+ Subs)  --->  csec.astu.edu.et/events
                                            │
                                            ▼
                           In-Page Luma Overlay (Zero Redirect)
                           • Handled 100% on Luma's Edge CDN
                           • Apple / Google Wallet QR Passes
                           • Calendar invites & automated reminders
                           • Render Backend traffic: 0 requests (No crash risk)

[ 2. EVENT DAY: IN-LAB CHECK-IN ]
   ASTU Lab 508 Door  --->  Luma Organizer App (iOS/Android)
                            • Officers beep-scan QR tickets at the door
                            • Instant attendee verification
                            • Tracks "Checked In" vs "No Show"
                            • Render Backend traffic: 0 requests (No lag)

[ 3. POST-EVENT: SMART INGESTION & CERTIFICATE MINTING ]
   Officer exports Luma CSV  --->  CSEC Platform Certificate Hub
                                            │
                                            ▼
                           Auto-Identity & Variable Resolution
                           ├── Club Members: Auto-awards +20 Leaderboard Pts
                           ├── External Guests: Captures University / Affiliation
                           └── Canva Variables: Auto-mapped from Luma questions
                                            │
                                            ▼
                           1-Click Batch Mint & Google Apps Script Email
```

---

## Why This Hybrid Approach Wins

| Challenge | Full Custom Engine (Risky) | Luma-Embed + Smart Ingestion (Adopted) |
| :--- | :--- | :--- |
| **Telegram Channel Virality (1,000 clicks)** | High risk of Render 512 MB RAM crash or 502 Bad Gateway | 🛡️ **100% Crash-Proof**: Luma's global edge absorbs the entire spike. |
| **Lab Door In-App Browser Glitches** | Students struggle with Google OAuth in Telegram webviews | 📱 **Zero-Friction**: Students show their Apple Wallet / QR ticket at the door. |
| **Lab Door Scanning Speed** | Manual typing of emails on slow mobile connections | ⚡ **Sub-second Beep-Scan**: Officers use Luma's organizer scanner app. |
| **No-Show Filtering** | Hard to separate RSVPs from physical attendees | 🎯 **Automatic**: Luma CSV explicitly marks who actually walked into the lab. |
| **Member Points & Leaderboard** | Requires complex live backend endpoints | ✅ **1-Click Reconciliation**: Matches member emails and deposits points in bulk. |
| **Certificate Variable Mapping** | Manual spreadsheet formatting | ✅ **Zero-Config**: Maps Luma question columns to Canva variables automatically. |
| **Operational Budget** | $0 | **$0 Forever** |

---

## Part 1: The Public Events Showcase (`/events`)

The frontend lives on our Next.js platform at `csec.astu.edu.et/events`, matching our Notion-inspired dark-mode design system.

### 1. The Visual Layout
- **Header**: Minimalist page title (`Events & Workshops`), search bar, and division filter pills:
  - `All Events`, `Cybersecurity`, `Software Engineering`, `AI & Data Science`, `Competitive Programming`.
- **Tabs**: `Upcoming Events` (active registration) and `Past Events` (with gallery / recap links).
- **Event Card Anatomy**:
  - 16:9 banner image with subtle border glow.
  - Date ribbon (`OCT 18`, `2:00 PM EAT`).
  - Event title, division badge, and venue (`ASTU Main Campus, Lab 508`).
  - Access tag (`Public & Members` vs `Internal Lab`).
  - **Primary Action Button**: `Register for Event`.

### 2. The Luma In-Page Overlay Integration
Students **never leave `csec.astu.edu.et`**. Clicking `Register for Event` launches Luma’s official checkout overlay directly over the page:

```tsx
// frontend/app/events/components/luma-register-button.tsx
'use client';

import Script from 'next/script';

interface LumaRegisterButtonProps {
  lumaEventId: string; // e.g. "evt-xxxxxxxx"
  label?: string;
}

export function LumaRegisterButton({ lumaEventId, label = "Register for Event" }: LumaRegisterButtonProps) {
  return (
    <>
      <Script 
        src="https://embed.lu.ma/checkout-button.js" 
        strategy="lazyOnload" 
      />
      <a
        href={`https://lu.ma/event/${lumaEventId}`}
        className="luma-checkout--button inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 active:scale-95 shadow-md"
        data-luma-action="checkout"
        data-luma-event-id={lumaEventId}
      >
        {label}
      </a>
    </>
  );
}
```

---

## Part 2: Event Day — Physical Check-In via Luma Organizer

1. **At the Door**:
   - The lab officer downloads the free **Luma Organizer App** on iOS or Android.
   - When attendees arrive at Lab 508, they present their ticket QR code (from Apple Wallet, Google Wallet, or their confirmation email).
   - The officer scans the ticket in < 1 second.
2. **In Luma Dashboard**:
   - Each registered student transitions from `Registered` to `Checked In`.
   - RSVPs who did not show up remain marked as `Registered` (No-shows).

---

## Part 3: Post-Event — The Smart Ingestion & Certificate Hub

When the event concludes, the officer performs a **single, 60-second action** on the CSEC Platform:

### Step 1: Export from Luma
- Officer opens Luma $\rightarrow$ Guests $\rightarrow$ Filters by `Checked In` $\rightarrow$ Clicks `Export CSV`.

### Step 2: Drop into CSEC Platform (`/templates` or `/admin/events`)
- Officer clicks **"Import Luma Attendance"** inside the Certificate Issuance Hub.
- Drops the `.csv` file.

```
+-----------------------------------------------------------------------------------------+
|  Import Luma Event Attendance                                               [X] Close   |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  Event: Hands-on Reverse Engineering 101          Template: 2026 Bootcamp Award        |
|  Source: luma_attendees_oct18.csv                 Total Rows: 84 verified attendees     |
|                                                                                         |
|  1. Column Mapping (Auto-Detected)                                                      |
|     * Full Name    <--- Luma Column: "Name"                                             |
|     * Email        <--- Luma Column: "Email"                                            |
|     * {{TRACK}}    <--- Luma Question: "Which track are you attending?" (Cybersecurity) |
|     * {{UNIVERSITY}}<-- Luma Question: "Your University / Organization" (ASTU)          |
|                                                                                         |
|  2. Identity Resolution Summary                                                         |
|     * 52 Active CSEC-ASTU Members Detected (Award +20 Points each: [X] Enable)         |
|     * 32 External Participants Detected (Tag: Non-Member ASTU / Other Universities)     |
|     * 0 Duplicates / Errors                                                             |
|                                                                                         |
|  3. Action Confirmation                                                                 |
|     [x] Deposit +20 Leaderboard Points to 52 Members                                    |
|     [x] Mint 84 Verified Digital Certificates                                           |
|     [x] Dispatch to Google Apps Script Email Queue (Auto-send PDF)                      |
|                                                                                         |
|                                       [ Cancel ]   [ Mint & Award Points (84) ]         |
+-----------------------------------------------------------------------------------------+
```

### Step 3: Automated Backend Execution
When the officer confirms:
1. **Member Points**:
   - For all 52 recognized members, the backend creates a `PointEvent` record:
     - `member_id = member.id`
     - `points = event.points_reward` (e.g. +20)
     - `category = 'lab_attendance'`
     - `description = 'Attended Hands-on Reverse Engineering 101'`
2. **Universal Certificate Issuance**:
   - Calls the `issue_certificates` engine we built in `0007_outsider_certs`:
     - Active members $\rightarrow$ linked to `member_id` (appears on their `/profile`).
     - External participants $\rightarrow$ saved with `is_external=True`, `recipient_name`, `recipient_email`, and custom attributes (`UNIVERSITY`, `TRACK`).
3. **Email Queue Dispatch**:
   - Hands the roster off to Google Apps Script (`Code.gs`) to send the official branded certificate emails with Drive links.

---

## Part 4: Database Model & Alembic Migration (`0009_create_events`)

To support storing events and linking them to Luma and certificate templates:

### Model Specification: `backend/app/models/event.py`
```python
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=False)
    cover_image_url = Column(String(512), nullable=True)

    # Luma Integration
    luma_url = Column(String(512), nullable=True)          # https://lu.ma/re-101
    luma_event_id = Column(String(128), nullable=True)     # evt-xxxxxxxxx

    # Scope & Metadata
    event_type = Column(String(32), default="external", nullable=False) # 'internal' | 'external'
    division_id = Column(Integer, ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True, index=True)
    points_reward = Column(Integer, default=20, nullable=False)
    
    # Schedule & Venue
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    location_name = Column(String(255), nullable=False, default="ASTU Main Campus")
    
    # Linked Certificate Template
    certificate_template_id = Column(Integer, ForeignKey("certificate_templates.id", ondelete="SET NULL"), nullable=True)
    
    # Status
    is_published = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    division = relationship("Division", backref="events")
    certificate_template = relationship("CertificateTemplate", backref="events")
```

---

## Part 5: Step-by-Step Implementation Roadmap (For Tomorrow)

### Phase 1: Database & Backend (Morning)
1. **Model & Migration**:
   - Create `backend/app/models/event.py`.
   - Run Alembic migration `0009_create_events` (ensuring revision ID `<= 32` characters).
2. **Pydantic Schemas & Router**:
   - `backend/app/schemas/events.py` (`EventCreate`, `EventUpdate`, `EventResponse`, `LumaIngestPayload`).
   - `backend/app/api/v1/routers/events.py`:
     - `GET /api/v1/events` (public upcoming/past list).
     - `POST /api/v1/events` (officer create event).
     - `POST /api/v1/events/{id}/ingest-luma-csv` (smart attendance & point processor).
3. **Automated Pytest Suite**:
   - Test CSV parser, member identity matcher, and point awarding.

### Phase 2: Frontend Events Showcase (Afternoon)
1. **Public Events Hub**:
   - Build `frontend/app/events/page.tsx` with filter pills and upcoming/past tabs.
   - Build `frontend/app/events/components/event-card.tsx` with Luma checkout overlay button.
2. **Officer Event Management**:
   - Add "Create Event" dialog (paste Luma URL + select Division & Certificate Template).
3. **Smart Ingestion Modal in Certificate Hub**:
   - Add "Import Luma CSV" tab in `IssueCertificatesDialog`.
   - Preview detected members vs external guests before minting.
   - 1-Click execute: mint certificates + award leaderboard points.

---

## Summary of Benefits

- **Zero Risk of Crashes**: Free Render tier handles zero traffic spikes from Telegram.
- **Fastest Implementation**: Done in 1 day instead of 5 days of custom auth/checkin edge cases.
- **Flawless Real-World UX**: QR tickets on phones at the lab door, automated points for members, and verified digital certificates emailed to everyone.
