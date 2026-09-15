# CSEC-ASTU Google Apps Script PDF Engine & Email Dispatcher

This Google Apps Script Web App offloads 100% of certificate PDF generation and Gmail delivery to Google Cloud, keeping the Render free tier container within 512 MB RAM and utilizing $0 in infrastructure.

---

## 3-Step Setup Instructions

### Step 1: Create Google Drive Assets
1. Open your club's Google Drive account.
2. **Master Google Slide Template**:
   - Create a Google Slide (16:9).
   - Set your Canva exported certificate artwork (1920x1080 PNG) as the slide background.
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
2. Click **New Project** and name it `CSEC-ASTU Certificate Engine`.
3. Paste the contents of `gas/Code.gs` into `Code.gs`.
4. In **Project Settings** $\rightarrow$ **Script Properties**, add:
   - `CSEC_APPS_SCRIPT_SECRET`: Any strong secret token (e.g. `csec-gas-secret-xxxx`).
   - `MASTER_SLIDE_ID`: Your Google Slide Template ID from Step 1.
   - `OUTPUT_DRIVE_FOLDER_ID`: Your Google Drive Folder ID from Step 1.
5. Click **Deploy** $\rightarrow$ **New Deployment**:
   - Select type: **Web App**.
   - Description: `Production Certificate Dispatcher`.
   - Execute as: **Me** (`your-email@astu.edu.et` or personal Gmail).
   - Who has access: **Anyone**.
   - Click **Deploy** and authorize permissions.
6. Copy the **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 3: Configure Render / Local Environment
In your Render Dashboard (or local `backend/.env`), add:
```env
APPS_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/AKfycb.../exec
APPS_SCRIPT_SECRET=csec-gas-secret-xxxx
```

When certificates are minted on `/templates` or attendance is ingested from Luma, the backend will automatically call Google Apps Script to:
1. Render high-res vector PDFs in Google Slides.
2. Archive the PDF to your Google Drive folder.
3. Deliver the branded email with the PDF attached directly to the recipient's inbox.
