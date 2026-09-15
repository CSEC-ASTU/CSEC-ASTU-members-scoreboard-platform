# Infrastructure Optimization & Google Apps Script PDF Engine Guide

## Executive Overview

This document outlines the **four core infrastructure and automation actions** for running the CSEC-ASTU platform with **100% reliability at $0 cost** across:
1. **Render Free Tier Web Service** (512 MB RAM, shared vCPU, 15-minute idle sleep).
2. **Neon Serverless PostgreSQL Free Tier** (500 MB storage, **100 Compute Unit (CU) hours/month limit**, 5-minute auto-suspend).
3. **Google Apps Script & Drive Automation** (Headless PDF generation, cloud storage, and Gmail delivery).

---

## The 4 Core Engineering Actions for Tomorrow

```
+------------------------------------------------------------------------------------------------+
|                                    THE 4 CORE FIXES FOR TOMORROW                               |
+------------------------------------------------------------------------------------------------+
|  FIX 1: In-Memory /ping Route      --> Prevents Neon 100 CU-hr exhaustion (Separates DB from keep-alive) |
|  FIX 2: Render Pinger Setup        --> Pings /ping every 8m (0-second container cold starts 24/7)       |
|  FIX 3: Neon Connection Pooler     --> Switches DATABASE_URL to -pooler (Handles burst traffic spikes)   |
|  FIX 4: GAS PDF & Email Engine     --> Generates PDFs in Google Cloud (0 MB RAM used on Render)         |
+------------------------------------------------------------------------------------------------+
```

---

### Fix 1: The In-Memory `/ping` Endpoint (Preventing Neon Quota Exhaustion)

#### The Problem
- Neon's free tier gives you **100 Compute Unit (CU) hours per month**.
- There are **720 hours in a 30-day month**.
- Neon's serverless compute engine **auto-suspends after 5 minutes of idle time** (0 queries). This allows free-tier databases to stay active all month without exceeding 100 hours.
- **The Critical Bug**: Your existing `/api/v1/health` endpoint runs:
  ```python
  await db.execute(text("SELECT 1"))
  year = await get_current_academic_year(db)
  ```
  If your external pinger (UptimeRobot, Cron-job.org) hits `/api/v1/health` every 5–10 minutes, **Neon will never sleep**! It runs 24/7 (720 hours) and **burns out your entire monthly quota in 4 to 5 days**, locking your database.

#### The Solution
Add a lightweight, **zero-database** ping route directly to `backend/app/main.py`:
```python
@app.get("/ping", tags=["monitoring"])
def ping():
    """
    Lightweight in-memory keep-alive endpoint for Render.
    CRITICAL: Never inject a database session here.
    Keeps Render awake without consuming Neon CU-hours.
    """
    return {"status": "alive", "server": "csec-astu-backend"}
```

#### Why a 3-Second Database Wake-up is Ideal
- Your pinger hits `/ping` every 8 minutes $\rightarrow$ **Render stays warm 24/7 (0-second container cold start)**.
- When an attendee opens the site after hours of inactivity, Neon wakes from sleep in **1.5 to 3 seconds**.
- For campus use, a 2–3 second delay on the very first query is completely acceptable, while preserving 90%+ of your 100 CU-hour monthly allowance.

---

### Fix 2: Render Free Tier Keep-Alive Configuration

Because your pinger will now hit `https://csec-api.onrender.com/ping`:
1. **Target URL**: Update your pinger monitor to target `https://<your-render-url>/ping` instead of `/api/v1/health`.
2. **Interval**: Configure the pinger for **every 8 to 10 minutes** (Render sleeps after 15 minutes of inactivity).
3. **Resource Consumption**: The `/ping` endpoint consumes < 0.1% CPU and 0 MB extra RAM.
4. **Result**: Render never goes into its painful 50-second sleep cycle, keeping the API responsive around the clock.

---

### Fix 3: Neon Connection Pooling (`-pooler` Host String)

#### The Problem
Neon Free Tier allows a small number of direct connections (~20). If multiple users visit the site simultaneously, direct connections can become saturated.

#### The Solution
Ensure the `DATABASE_URL` environment variable on Render connects through **Neon’s built-in PgBouncer pooler**:
- **Direct connection string format (Avoid for production)**:
  `postgresql+asyncpg://user:pass@ep-cool-cloud-123456.us-east-2.aws.neon.tech/csec_db`
- **Pooled connection string format (Recommended)**:
  `postgresql+asyncpg://user:pass@ep-cool-cloud-123456-pooler.us-east-2.aws.neon.tech/csec_db?sslmode=require`

*(Note the `-pooler` suffix in the host name. This handles hundreds of burst queries through connection pooling without exhausting Neon's limits).*

---

### Fix 4: Google Apps Script PDF Generation & Email Engine

#### Why Offload PDF Generation to Google Apps Script?
1. **Render Free Tier Protection**: Generating 50–100 high-res vector PDFs in Python on Render can easily exceed the **512 MB RAM limit**, triggering Render's **OOM Killer (`SIGKILL`)** and taking down your entire backend.
2. **Typography & Rendering Perfection**: Headless Linux servers often lack modern fonts. Google Slides renders typography, alignments, and vector elements flawlessly.
3. **Zero Storage Transit**: PDFs are saved directly into your official Google Drive certificate archive folder without downloading and re-uploading over HTTP.
4. **Native Deliverability**: Emails are sent using `GmailApp`, achieving near-perfect inbox deliverability without third-party email service fees.

#### The Canva $\rightarrow$ Google Slides $\rightarrow$ PDF Workflow
1. **Design Artwork in Canva**:
   - Design the certificate background with borders, CSEC logos, and official stamps.
   - Leave the dynamic text areas (Name, Track, Date, ID) blank.
   - Export as high-resolution PNG (1920x1080).
2. **Create Master Google Slide Template**:
   - In Google Drive, create a new 16:9 Google Slide presentation.
   - Set the Canva PNG as the slide background.
   - Insert transparent text boxes with standard placeholder tags:
     - `{{FULL_NAME}}`
     - `{{TRACK}}`
     - `{{ORGANIZATION}}`
     - `{{CERTIFICATE_ID}}`
     - `{{ISSUE_DATE}}`
     - `{{VERIFY_URL}}`
3. **Deploy Google Apps Script Web App**:
   - Create a Google Apps Script project bound to your Google Drive account.
   - Paste the production `Code.gs` script below and deploy as a **Web App** (`Anyone with link` access).

---

### Ready-to-Deploy Google Apps Script: `Code.gs`

```javascript
/**
 * CSEC-ASTU Universal Certificate PDF Generator & Email Dispatcher
 * Deployed as a Google Apps Script Web App
 */

// Configuration Constants
const SCRIPT_SECRET = "YOUR_SHARED_SECRET_KEY"; // Set matching CSEC_APPS_SCRIPT_SECRET
const MASTER_TEMPLATE_SLIDE_ID = "YOUR_GOOGLE_SLIDE_TEMPLATE_ID";
const OUTPUT_DRIVE_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID";

/**
 * HTTP POST Webhook Receiver
 * Expects JSON payload from FastAPI backend:
 * {
 *   "secret": "...",
 *   "event_name": "Hands-on Reverse Engineering 101",
 *   "attendees": [
 *     {
 *       "recipient_name": "Dawit Bekele",
 *       "recipient_email": "dawit@astu.edu.et",
 *       "certificate_code": "CSEC-2026-X89A",
 *       "issue_date": "October 18, 2026",
 *       "custom_attributes": { "TRACK": "Cybersecurity", "ORGANIZATION": "ASTU" }
 *     }
 *   ]
 * }
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 1. Security Authentication Check
    if (!data.secret || data.secret !== SCRIPT_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Unauthorized: Invalid or missing script secret"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const attendees = data.attendees || [];
    const eventName = data.event_name || "CSEC-ASTU Event";
    const masterSlide = DriveApp.getFileById(MASTER_TEMPLATE_SLIDE_ID);
    const outputFolder = DriveApp.getFolderById(OUTPUT_DRIVE_FOLDER_ID);
    const results = [];

    // 2. Process Certificate Batch
    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i];

      // A. Clone master slide template into target folder
      const tempSlideFile = masterSlide.makeCopy(`Cert_${attendee.certificate_code}`, outputFolder);
      const presentation = SlidesApp.openById(tempSlideFile.getId());
      const slide = presentation.getSlides()[0];

      // B. Replace standard tags
      slide.replaceAllText("{{FULL_NAME}}", attendee.recipient_name);
      slide.replaceAllText("{{EVENT_NAME}}", eventName);
      slide.replaceAllText("{{CERTIFICATE_ID}}", attendee.certificate_code);
      slide.replaceAllText("{{ISSUE_DATE}}", attendee.issue_date);
      slide.replaceAllText("{{VERIFY_URL}}", `https://csec.astu.edu.et/verify/certificate/${attendee.certificate_code}`);

      // C. Replace custom attributes (e.g. {{TRACK}}, {{ORGANIZATION}})
      if (attendee.custom_attributes) {
        for (const [key, value] of Object.entries(attendee.custom_attributes)) {
          slide.replaceAllText(`{{${key}}}`, String(value));
        }
      }

      presentation.saveAndClose();

      // D. Export as native high-resolution vector PDF
      const pdfBlob = tempSlideFile.getAs("application/pdf")
        .setName(`${attendee.recipient_name}_Certificate_${attendee.certificate_code}.pdf`);
      const finalPdfFile = outputFolder.createFile(pdfBlob);
      finalPdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      // E. Trash the temporary Google Slide copy (keeps Drive clean)
      tempSlideFile.setTrashed(true);

      const driveViewUrl = finalPdfFile.getUrl();
      const verifyUrl = `https://csec.astu.edu.et/verify/certificate/${attendee.certificate_code}`;

      // F. Send Branded Email with PDF Attachment
      sendCertificateEmail(attendee, eventName, pdfBlob, driveViewUrl, verifyUrl);

      results.push({
        certificate_code: attendee.certificate_code,
        recipient_email: attendee.recipient_email,
        pdf_drive_url: driveViewUrl,
        file_id: finalPdfFile.getId(),
        status: "sent"
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      total_processed: results.length,
      results: results
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Sends a Notion-styled HTML certificate delivery email
 */
function sendCertificateEmail(attendee, eventName, pdfBlob, driveUrl, verifyUrl) {
  const subject = `🎓 Official Certificate of Attendance: ${eventName} — CSEC-ASTU`;
  
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background-color: #0c0d0e; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1aa; font-weight: 600;">CSEC-ASTU Certification Authority</span>
        <h1 style="font-size: 24px; font-weight: 700; margin: 8px 0 0 0; color: #ffffff;">Certificate of Participation</h1>
      </div>
      
      <p style="font-size: 15px; line-height: 1.6; color: #d4d4d8;">Dear <strong>${attendee.recipient_name}</strong>,</p>
      
      <p style="font-size: 15px; line-height: 1.6; color: #d4d4d8;">
        Congratulations on successfully attending and participating in <strong>${eventName}</strong>. Your verified digital credential has been minted and archived in the official university registry.
      </p>

      <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <div style="font-size: 12px; color: #a1a1aa;">Credential ID</div>
        <div style="font-family: monospace; font-size: 16px; color: #38bdf8; font-weight: bold; margin-top: 4px;">${attendee.certificate_code}</div>
        <div style="font-size: 12px; color: #a1a1aa; margin-top: 12px;">Issue Date</div>
        <div style="font-size: 14px; color: #ffffff; margin-top: 2px;">${attendee.issue_date}</div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" style="background-color: #ffffff; color: #09090b; padding: 12px 24px; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 14px; display: inline-block; margin-right: 8px;">Verify Credential</a>
        <a href="${driveUrl}" style="background-color: #27272a; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 14px; display: inline-block;">View in Drive</a>
      </div>

      <p style="font-size: 13px; color: #71717a; text-align: center; margin-top: 32px;">
        Your high-resolution PDF certificate is also attached directly to this email.<br>
        Computer Science and Engineering Club — Adama Science and Technology University
      </p>
    </div>
  `;

  GmailApp.sendEmail(attendee.recipient_email, subject, "", {
    htmlBody: htmlBody,
    attachments: [pdfBlob],
    name: "CSEC-ASTU Credentials"
  });
}
```

---

### Google Apps Script Quotas & Performance
- **Execution Time Limit**: 6 minutes per script run.
- **Generation Speed**: ~2.5 seconds per vector PDF.
- **Single Batch Capacity**: **60 to 80 certificates per execution**.
- **Daily Email Allowances**:
  - Personal `@gmail.com`: **100 emails / day**.
  - Google Workspace (`@astu.edu.et`): **1,500 emails / day**.

---

## Action Plan for Tomorrow Morning

1. **Step 1: Add `/ping` in Backend** (`Fix 1`):
   - Add `@app.get("/ping")` to `main.py`.
   - Update Render pinger to call `https://<render-url>/ping` every 8 minutes.
2. **Step 2: Check Neon Pooled Host** (`Fix 3`):
   - Ensure Render's `DATABASE_URL` uses `-pooler`.
3. **Step 3: Setup Google Slide Template & GAS Script** (`Fix 4`):
   - Set up the Google Slide master template with `{{TAGS}}`.
   - Deploy `Code.gs` as a Web App and save the URL into Render's `APPS_SCRIPT_WEBHOOK_URL`.
4. **Step 4: Build `/events` Showcase Page & Smart Ingestion**:
   - Implement the Luma-embed showcase and 1-click batch issuance dialog.
