# CSEC-ASTU Google Apps Script PDF Engine & Executive Email Dispatcher

This Google Apps Script Web App offloads 100% of certificate vector PDF generation, Drive archiving, and official executive email delivery to Google Cloud, keeping the Render free container within 512 MB RAM with $0 in infrastructure cost.

---

## Capabilities

1. **Vector Certificate Generation & Archiving**:
   - Clones your Master Google Slide template in Google Cloud.
   - Replaces placeholders (`{{FULL_NAME}}`, `{{EVENT_NAME}}`, `{{CERTIFICATE_ID}}`, `{{ISSUE_DATE}}`, `{{VERIFY_URL}}`, and dynamic custom tags).
   - Generates high-resolution vector PDFs and saves them directly to your Google Drive archive folder with public view permissions.
   - Sends a minimalist certificate delivery email with the PDF attached directly.

2. **Presidential / Executive Announcement Email Service**:
   - Allows club leadership (President only via the platform) to dispatch high-priority official club announcements directly through the club's Gmail account.
   - Styled with a modern, high-contrast, minimalist email template that renders across all email clients.
   - Supports targeted batches (All Members, Active Members Only, Officers Only, or by Division).
   - Dynamic greetings, customizable badge, call-to-action button, and executive sign-off.

---

## 3-Step Setup Instructions

### Step 1: Create Google Drive Assets
1. Open your club's official Google Drive.
2. **Master Google Slide Template**:
   - Create a Google Slide presentation (16:9 widescreen).
   - Set your certificate artwork (1920x1080) as the slide background.
   - Insert transparent text boxes with tags:
     - `{{FULL_NAME}}`
     - `{{EVENT_NAME}}`
     - `{{CERTIFICATE_ID}}`
     - `{{ISSUE_DATE}}`
     - `{{VERIFY_URL}}`
     - `{{TRACK}}`
     - `{{ORGANIZATION}}`
   - Copy the Slide ID from the browser URL: `docs.google.com/presentation/d/[SLIDE_ID]/edit`.
3. **Target Archive Folder**:
   - Create a Google Drive folder named `CSEC Certificates Archive`.
   - Copy the Folder ID from the URL: `drive.google.com/drive/folders/[FOLDER_ID]`.

---

### Step 2: Create & Deploy Google Apps Script
1. Open [script.google.com](https://script.google.com).
2. Click **New Project** and name it `CSEC-ASTU Cloud Engine`.
3. Paste the contents of `gas/Code.gs` into the project editor.
4. Go to **Project Settings** (gear icon) $\rightarrow$ **Script Properties**, and add:
   - `CSEC_APPS_SCRIPT_SECRET`: A secure random value of **24+ characters** (generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`). Put the same value in your backend's `APPS_SCRIPT_SECRET`.
   - `MASTER_SLIDE_ID`: Your Google Slide Template ID from Step 1.
   - `OUTPUT_DRIVE_FOLDER_ID`: Your Google Drive Folder ID from Step 1.
5. Click **Deploy** $\rightarrow$ **New Deployment**:
   - Select type: **Web App**.
   - Description: `Production Cloud Engine`.
   - Execute as: **Me** (your club's Google account / Gmail).
   - Who has access: **Anyone**.
   - Click **Deploy** and authorize permissions for Google Slides, Drive, and Gmail.
6. Copy the resulting **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 3: Configure Render / Local Environment
In your Render Dashboard (or local `backend/.env`), set:
```env
APPS_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/AKfycb.../exec
APPS_SCRIPT_SECRET=<same 24+ character secret from Script Properties>
```

---

## Testing

You can test the deployment anytime:
1. Open your Web App URL in any browser:
   It returns a JSON status report with remaining daily email quota.
2. In the Admin Dashboard (Officers tab), the President can send test or real announcements under **Official Communications**.
