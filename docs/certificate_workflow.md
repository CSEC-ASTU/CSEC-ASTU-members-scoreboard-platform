# Certificate Workflow & Automation Reference

> For the comprehensive production guide with Google Cloud setup and ready-to-deploy Google Apps Script code, see **[CERTIFICATE_WORKFLOW_AND_AUTOMATION_GUIDE.md](file:///d:/Full-Stack_Projects/csec-astu-platform/docs/CERTIFICATE_WORKFLOW_AND_AUTOMATION_GUIDE.md)**.

## Quick Summary

1. **What Is Already Live in Code**:
   * Cryptographic HMAC-SHA256 signing engine (`backend/app/services/certificates.py`).
   * Database storage supporting both **Club Members** and **External Participants** (`0007_outsider_certs` & `0008_perf_indexes`).
   * Notion-inspired Templates Gallery (`/templates`).
   * Dual-mode Batch Issuance Dialog with Canva variable mapping.
   * Public Verification portal (`/verify/certificate/[code]`).

2. **Required `.env` Variables**:
   * `FRONTEND_URL`
   * `JWT_SECRET_KEY`
   * `GOOGLE_SERVICE_ACCOUNT_FILE` / `GOOGLE_DRIVE_FOLDER_ID`
   * `GOOGLE_APPS_SCRIPT_WEBHOOK_URL` / `APPS_SCRIPT_SECRET_TOKEN`

3. **Email Delivery Script**:
   * Complete Google Apps Script webhook code provided in [Section 4 of CERTIFICATE_WORKFLOW_AND_AUTOMATION_GUIDE.md](file:///d:/Full-Stack_Projects/csec-astu-platform/docs/CERTIFICATE_WORKFLOW_AND_AUTOMATION_GUIDE.md#4-google-apps-script-email-queue-ready-to-deploy-code).
