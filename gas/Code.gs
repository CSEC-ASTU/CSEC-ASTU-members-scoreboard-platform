/**
 * CSEC-ASTU Universal Certificate PDF Generator & Email Dispatcher
 * Deployed as a Google Apps Script Web App.
 *
 * Designed for 100% reliability and $0 infrastructure cost:
 * - Offloads vector PDF generation from Render 512MB RAM container to Google Cloud.
 * - Saves PDFs directly to official Google Drive archives.
 * - Sends branded certificate emails with Drive links and PDF attachments via Gmail.
 */

// Configuration (Apps Script Project Settings -> Script Properties). There are deliberately
// NO fallback values: this file is public, so a fallback secret would let anyone send email
// from the club's Gmail. Without CSEC_APPS_SCRIPT_SECRET every request is rejected.
const PROPS = PropertiesService.getScriptProperties();
const SCRIPT_SECRET = PROPS.getProperty("CSEC_APPS_SCRIPT_SECRET") || "";
const MASTER_TEMPLATE_SLIDE_ID = PROPS.getProperty("MASTER_SLIDE_ID") || "";
const OUTPUT_DRIVE_FOLDER_ID = PROPS.getProperty("OUTPUT_DRIVE_FOLDER_ID") || "";
const MIN_SECRET_LENGTH = 24;

function isSecretConfigured() {
  return SCRIPT_SECRET.length >= MIN_SECRET_LENGTH;
}

/** Constant-time comparison so the secret can't be recovered from response timing. */
function secretsMatch(provided, expected) {
  if (typeof provided !== "string" || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/**
 * HTTP GET Webhook Health Check
 * Allows testing the deployed Web App URL directly in any web browser.
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "alive",
    service: "CSEC-ASTU Certificate & PDF Engine",
    version: "2.0",
    configured: {
      has_secret: isSecretConfigured(),
      has_slide_template: !!MASTER_TEMPLATE_SLIDE_ID,
      has_output_folder: !!OUTPUT_DRIVE_FOLDER_ID
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

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

    // 1. Security Authentication Check (refuse everything until a real secret is configured)
    if (!isSecretConfigured()) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Not configured: set the CSEC_APPS_SCRIPT_SECRET script property (24+ random characters)"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    if (!secretsMatch(data.secret, SCRIPT_SECRET)) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Unauthorized: Invalid or missing script secret"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const attendees = data.attendees || [];
    const eventName = data.event_name || "CSEC-ASTU Event";
    const templateId = data.template_slide_id || MASTER_TEMPLATE_SLIDE_ID;

    let masterSlide = null;
    let outputFolder = null;

    try {
      masterSlide = DriveApp.getFileById(templateId);
    } catch (slideErr) {
      Logger.log("Warning: Could not open template slide ID: " + templateId);
    }

    try {
      outputFolder = DriveApp.getFolderById(OUTPUT_DRIVE_FOLDER_ID);
    } catch (folderErr) {
      outputFolder = DriveApp.getRootFolder();
    }

    const results = [];

    // 2. Process Certificate Batch
    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i];
      let pdfBlob = null;
      let driveViewUrl = attendee.drive_view_link || "";
      let fileId = "";

      // A. Generate PDF if master slide is available
      if (masterSlide && outputFolder) {
        try {
          const tempSlideFile = masterSlide.makeCopy(`Cert_${attendee.certificate_code}`, outputFolder);
          const presentation = SlidesApp.openById(tempSlideFile.getId());
          const slide = presentation.getSlides()[0];

          // Standard tags
          slide.replaceAllText("{{FULL_NAME}}", attendee.recipient_name);
          slide.replaceAllText("{{EVENT_NAME}}", eventName);
          slide.replaceAllText("{{CERTIFICATE_ID}}", attendee.certificate_code);
          slide.replaceAllText("{{ISSUE_DATE}}", attendee.issue_date);
          slide.replaceAllText("{{VERIFY_URL}}", `https://csec.astu.edu.et/verify/certificate/${attendee.certificate_code}`);

          // Custom attributes (e.g. {{TRACK}}, {{ORGANIZATION}})
          if (attendee.custom_attributes) {
            for (const [key, value] of Object.entries(attendee.custom_attributes)) {
              slide.replaceAllText(`{{${key}}}`, String(value));
              slide.replaceAllText(`{{${key.toUpperCase()}}}`, String(value));
            }
          }

          presentation.saveAndClose();

          // Export as native vector PDF
          pdfBlob = tempSlideFile.getAs("application/pdf")
            .setName(`${attendee.recipient_name}_Certificate_${attendee.certificate_code}.pdf`);
          const finalPdfFile = outputFolder.createFile(pdfBlob);
          finalPdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

          driveViewUrl = finalPdfFile.getUrl();
          fileId = finalPdfFile.getId();

          // Trash temporary slide copy to keep Drive clean
          tempSlideFile.setTrashed(true);
        } catch (renderErr) {
          Logger.log("PDF render error for " + attendee.certificate_code + ": " + renderErr);
        }
      }

      const verifyUrl = `https://csec.astu.edu.et/verify/certificate/${attendee.certificate_code}`;

      // B. Send Branded Email via GmailApp
      if (attendee.recipient_email && attendee.recipient_email.includes("@")) {
        try {
          sendCertificateEmail(attendee, eventName, pdfBlob, driveViewUrl, verifyUrl);
        } catch (emailErr) {
          Logger.log("Email dispatch error for " + attendee.recipient_email + ": " + emailErr);
        }
      }

      results.push({
        certificate_code: attendee.certificate_code,
        recipient_email: attendee.recipient_email,
        pdf_drive_url: driveViewUrl,
        file_id: fileId,
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
        ${driveUrl ? `<a href="${driveUrl}" style="background-color: #27272a; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 14px; display: inline-block;">View in Drive</a>` : ''}
      </div>

      <p style="font-size: 13px; color: #71717a; text-align: center; margin-top: 32px;">
        ${pdfBlob ? 'Your high-resolution PDF certificate is also attached directly to this email.<br>' : ''}
        Computer Science and Engineering Club — Adama Science and Technology University
      </p>
    </div>
  `;

  const emailOptions = {
    htmlBody: htmlBody,
    name: "CSEC-ASTU Credentials"
  };

  if (pdfBlob) {
    emailOptions.attachments = [pdfBlob];
  }

  GmailApp.sendEmail(attendee.recipient_email, subject, "", emailOptions);
}
