/**
 * CSEC-ASTU Universal Cloud Engine: Certificate PDF Renderer & Official Email Dispatcher
 * Deployed as a Google Apps Script Web App.
 *
 * Designed for 100% reliability and $0 infrastructure cost:
 * - Offloads vector PDF generation from Render containers to Google Cloud.
 * - Archives certificates directly into official Google Drive folders.
 * - Sends branded certificate delivery emails with PDF attachments via Gmail.
 * - Provides an executive email service for Presidential announcements & club notices.
 */

// Configuration (Apps Script Project Settings -> Script Properties).
// Mandatory security: without CSEC_APPS_SCRIPT_SECRET every request is rejected.
const DEFAULT_SECRET = "7JXc8SUcAeaD9TeOepvjZ0soYBNK8EEUGjaQj9OvsNw";
const DEFAULT_FOLDER_ID = "14bh4PCT977S3_CvQs5yC1D2mHkvGI9fWWXHuBNjza8G2mxSjjd1zm07tqopBFYWdSzSl-GQa";

const PROPS = PropertiesService.getScriptProperties();
const SCRIPT_SECRET = PROPS.getProperty("CSEC_APPS_SCRIPT_SECRET") || DEFAULT_SECRET;
const MASTER_TEMPLATE_SLIDE_ID = PROPS.getProperty("MASTER_SLIDE_ID") || "";
const OUTPUT_DRIVE_FOLDER_ID = PROPS.getProperty("OUTPUT_DRIVE_FOLDER_ID") || DEFAULT_FOLDER_ID;
const MIN_SECRET_LENGTH = 24;

/**
 * One-Click Setup: Run this function in script.google.com to permanently save
 * your Script Properties into your Google Cloud project settings.
 */
function setupScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("CSEC_APPS_SCRIPT_SECRET", DEFAULT_SECRET);
  props.setProperty("OUTPUT_DRIVE_FOLDER_ID", DEFAULT_FOLDER_ID);
  Logger.log("Script Properties successfully saved! Secret: " + DEFAULT_SECRET);
}

function isSecretConfigured() {
  return SCRIPT_SECRET.length >= MIN_SECRET_LENGTH;
}

/** Constant-time comparison to prevent timing attacks. */
function secretsMatch(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** Helper to escape HTML characters in templates. */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * HTTP GET Webhook Health Check
 * Allows testing the deployed Web App URL directly in any web browser.
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "alive",
    service: "CSEC-ASTU Certificate & Executive Email Engine",
    version: "3.0",
    configured: {
      has_secret: isSecretConfigured(),
      has_slide_template: !!MASTER_TEMPLATE_SLIDE_ID,
      has_output_folder: !!OUTPUT_DRIVE_FOLDER_ID,
      quota_remaining_daily_emails: MailApp.getRemainingDailyQuota()
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * HTTP POST Webhook Receiver
 * Dispatches to either Certificate Generation or Presidential Email Service based on action.
 */
function doPost(e) {
  const startTime = new Date().getTime();
  
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "Empty request payload" }, 400);
    }

    const data = JSON.parse(e.postData.contents);

    // 1. Security Authentication Check
    if (!isSecretConfigured()) {
      return jsonResponse({
        status: "error",
        message: "Server not configured: set CSEC_APPS_SCRIPT_SECRET script property (24+ characters)"
      });
    }
    if (!secretsMatch(data.secret, SCRIPT_SECRET)) {
      return jsonResponse({
        status: "error",
        message: "Unauthorized: Invalid or missing script secret"
      });
    }

    const action = data.action || (data.attendees ? "generate_certificates" : "send_announcement");

    // 2. Action Router
    if (action === "generate_certificates") {
      return handleCertificateGeneration(data, startTime);
    } else if (action === "send_announcement" || action === "send_presidential_email") {
      return handlePresidentialAnnouncement(data, startTime);
    } else if (action === "upload_file" || action === "upload_profile_picture") {
      return handleFileUpload(data);
    } else if (action === "test_connection") {
      return jsonResponse({
        status: "success",
        message: "Connection verified successfully.",
        quota_remaining: MailApp.getRemainingDailyQuota()
      });
    } else {
      return jsonResponse({
        status: "error",
        message: "Unknown action specified: " + action
      });
    }

  } catch (err) {
    Logger.log("Fatal doPost Error: " + err);
    return jsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

/**
 * -----------------------------------------------------------------------------
 * 1. CERTIFICATE GENERATION & DELIVERY PIPELINE
 * -----------------------------------------------------------------------------
 */
function handleCertificateGeneration(data, startTime) {
  const attendees = data.attendees || [];
  const eventName = data.event_name || "CSEC-ASTU Event";
  let templateId = data.template_slide_id || MASTER_TEMPLATE_SLIDE_ID;
  const folderId = data.output_folder_id || OUTPUT_DRIVE_FOLDER_ID;

  // If a full Google Drive or Slides URL was passed, extract the alphanumeric file ID
  if (templateId) {
    const urlMatch = String(templateId).match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
      templateId = urlMatch[1];
    }
  }

  let masterSlide = null;
  let outputFolder = null;

  try {
    if (folderId) outputFolder = DriveApp.getFolderById(folderId);
  } catch (folderErr) {
    Logger.log("Warning: Target folder unreachable (" + folderId + "): " + folderErr);
    outputFolder = DriveApp.getRootFolder();
  }

  const slideErrorDetails = [];
  try {
    if (templateId) {
      let candidate = null;
      try {
        candidate = DriveApp.getFileById(templateId);
      } catch (getErr) {
        slideErrorDetails.push("DriveApp.getFileById failed: " + getErr.toString());
      }

      if (candidate) {
        masterSlide = convertPptxToGoogleSlide(candidate, outputFolder, slideErrorDetails);
      }
    }
  } catch (slideErr) {
    slideErrorDetails.push("General slide error: " + slideErr.toString());
    Logger.log("Warning: Template slide unreachable (" + templateId + "): " + slideErr);
  }

  if (!masterSlide) {
    const detailMsg = slideErrorDetails.length > 0 ? (" Details: " + slideErrorDetails.join(" | ")) : "";
    const errorMsg = templateId
      ? `Template slide could not be loaded or converted (ID: "${templateId}"). The template must be a valid Google Slides presentation.${detailMsg}`
      : "No template_slide_id was provided. A valid Google Slides template is required.";
    Logger.log("Fatal Certificate Generation Error: " + errorMsg);
    return jsonResponse({
      status: "error",
      message: errorMsg,
      results: []
    });
  }

  const results = [];
  const MAX_RUNTIME_MS = 270000; // 4.5 minutes safety threshold (GAS limit is 6 mins)

  for (let i = 0; i < attendees.length; i++) {
    // Timeout safeguard
    if (new Date().getTime() - startTime > MAX_RUNTIME_MS) {
      Logger.log("Execution time limit reached. Returning partial results.");
      break;
    }

    const attendee = attendees[i];
    let pdfBlob = null;
    let driveViewUrl = attendee.drive_view_link || "";
    let fileId = "";
    let slideUrl = "";
    let slideId = "";
    let emailSent = false;
    let renderError = null;

    if (outputFolder) {
      try {
        const copyTitle = `Cert_${attendee.certificate_code}_${attendee.recipient_name}`;
        const tempSlideFile = masterSlide.makeCopy(copyTitle, outputFolder);
        const presentation = SlidesApp.openById(tempSlideFile.getId());

        // Comprehensive multi-pattern placeholder replacer across all slides
        function replaceTag(key, value) {
          if (value === undefined || value === null) value = "";
          const strVal = String(value);
          presentation.replaceAllText("{{" + key + "}}", strVal);
          presentation.replaceAllText("{{" + key.toUpperCase() + "}}", strVal);
          presentation.replaceAllText("{" + key + "}", strVal);
          presentation.replaceAllText("{" + key.toUpperCase() + "}", strVal);
          presentation.replaceAllText("[" + key + "]", strVal);
        }

        // Standard recipient tags
        const fullName = attendee.recipient_name || "Member";
        replaceTag("FULL_NAME", fullName);
        replaceTag("FULL NAME", fullName);
        replaceTag("FULLNAME", fullName);
        replaceTag("STUDENT_NAME", fullName);
        replaceTag("NAME", fullName);
        replaceTag("recipient_name", fullName);
        replaceTag("Recipient Name", fullName);

        // Event headline tags
        replaceTag("EVENT_NAME", eventName);
        replaceTag("EVENT NAME", eventName);
        replaceTag("EVENT", eventName);
        replaceTag("event_name", eventName);
        replaceTag("CERT_TITLE", eventName);

        // Credential identification tags
        const certCode = attendee.certificate_code || "";
        replaceTag("CERTIFICATE_ID", certCode);
        replaceTag("CERTIFICATE ID", certCode);
        replaceTag("CERT_ID", certCode);
        replaceTag("CERT_CODE", certCode);
        replaceTag("CREDENTIAL_ID", certCode);
        replaceTag("ID", certCode);

        // Issue date tags
        const issueDate = attendee.issue_date || "";
        replaceTag("ISSUE_DATE", issueDate);
        replaceTag("ISSUE DATE", issueDate);
        replaceTag("DATE", issueDate);
        replaceTag("issue_date", issueDate);

        // Cryptographic verification link tags
        const verifyLink = `https://csec.astu.edu.et/verify/certificate/${certCode}`;
        replaceTag("VERIFY_URL", verifyLink);
        replaceTag("VERIFY URL", verifyLink);
        replaceTag("VERIFICATION_URL", verifyLink);
        replaceTag("URL", verifyLink);

        // Custom event & member attributes (e.g. TRACK, ROLE, ORGANIZATION, STUDENT_ID)
        if (attendee.custom_attributes && typeof attendee.custom_attributes === "object") {
          for (const [key, value] of Object.entries(attendee.custom_attributes)) {
            replaceTag(key, value);
            replaceTag(key.replace(/_/g, " "), value);
            replaceTag(key.toUpperCase().replace(/_/g, " "), value);
          }
        }

        presentation.saveAndClose();
        pdfBlob = tempSlideFile.getAs("application/pdf")
          .setName(`${attendee.recipient_name}_Certificate_${attendee.certificate_code}.pdf`);

        const finalPdfFile = outputFolder.createFile(pdfBlob);
        finalPdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        driveViewUrl = finalPdfFile.getUrl();
        fileId = finalPdfFile.getId();

        // Retain populated presentation slide in Google Drive with public link
        try {
          tempSlideFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          slideUrl = tempSlideFile.getUrl();
          slideId = tempSlideFile.getId();
        } catch (_) {}

      } catch (err) {
        renderError = err.toString();
        Logger.log("Template population error for " + attendee.certificate_code + ": " + err);
      }
    }

    const verifyUrl = `https://csec.astu.edu.et/verify/certificate/${attendee.certificate_code}`;

    // Send Minimalist Certificate Email via Gmail (only if email notifications enabled and PDF rendered)
    const shouldSendEmail = data.send_email_notifications !== false;
    if (shouldSendEmail && pdfBlob && attendee.recipient_email && attendee.recipient_email.includes("@")) {
      try {
        sendCertificateEmail(attendee, eventName, pdfBlob, driveViewUrl, verifyUrl);
        emailSent = true;
      } catch (emailErr) {
        Logger.log("Email dispatch failed for " + attendee.recipient_email + ": " + emailErr);
      }
    }

    results.push({
      certificate_code: attendee.certificate_code,
      recipient_email: attendee.recipient_email,
      pdf_drive_url: driveViewUrl,
      slide_drive_url: slideUrl,
      file_id: fileId,
      slide_file_id: slideId,
      email_sent: emailSent,
      error: renderError,
      status: renderError ? "failed" : "sent"
    });

    // Pacing to avoid hitting burst rate limits
    Utilities.sleep(120);
  }

  const successCount = results.filter(r => !r.error).length;
  if (successCount === 0 && attendees.length > 0) {
    const firstErr = results[0]?.error || "Template population failed";
    return jsonResponse({
      status: "error",
      message: `Template population failed: ${firstErr}. Verify the template is a valid Google Slides presentation.`,
      results: results
    });
  }

  return jsonResponse({
    status: "success",
    action: "generate_certificates",
    total_processed: results.length,
    total_requested: attendees.length,
    results: results
  });
}

/**
 * -----------------------------------------------------------------------------
 * 2. PRESIDENTIAL ANNOUNCEMENT & OFFICIAL EMAIL PIPELINE
 * -----------------------------------------------------------------------------
 */
function handlePresidentialAnnouncement(data, startTime) {
  const subject = data.subject || "Official Announcement — CSEC ASTU";
  const title = data.title || "Club Governance Notice";
  const messageBody = data.message_body || "";
  const recipients = data.recipients || [];
  const badge = data.badge || "OFFICIAL NOTICE";
  const ctaText = data.cta_text || "";
  const ctaUrl = data.cta_url || "";
  const senderTitle = data.sender_title || "Office of the President";

  if (!recipients || recipients.length === 0) {
    return jsonResponse({ status: "error", message: "No recipients provided" });
  }

  const results = [];
  let sentCount = 0;
  let failCount = 0;
  const MAX_RUNTIME_MS = 270000;

  for (let i = 0; i < recipients.length; i++) {
    if (new Date().getTime() - startTime > MAX_RUNTIME_MS) {
      Logger.log("Execution approaching time limit in announcement loop.");
      break;
    }

    const recipient = recipients[i];
    const email = recipient.email;
    const name = recipient.name || "Member";

    if (!email || !email.includes("@")) {
      results.push({ email: email, status: "skipped_invalid_email" });
      failCount++;
      continue;
    }

    try {
      sendPresidentialEmail({
        recipientEmail: email,
        recipientName: name,
        subject: subject,
        badge: badge,
        title: title,
        messageBody: messageBody,
        ctaText: ctaText,
        ctaUrl: ctaUrl,
        senderTitle: senderTitle
      });
      sentCount++;
      results.push({ email: email, status: "delivered" });
    } catch (err) {
      failCount++;
      Logger.log("Failed to send announcement to " + email + ": " + err);
      results.push({ email: email, status: "failed", error: err.toString() });
    }

    Utilities.sleep(100);
  }

  return jsonResponse({
    status: "success",
    action: "send_announcement",
    total_sent: sentCount,
    total_failed: failCount,
    total_recipients: recipients.length,
    remaining_quota: MailApp.getRemainingDailyQuota(),
    results: results
  });
}

/**
 * -----------------------------------------------------------------------------
 * 3. MINIMALIST EMAIL TEMPLATES (HIGH-CONTRAST / MODERN DARK AESTHETIC)
 * -----------------------------------------------------------------------------
 */

/**
 * Template 1: Minimalist Certificate Delivery Email
 */
function sendCertificateEmail(attendee, eventName, pdfBlob, driveUrl, verifyUrl) {
  const subject = `🎓 Official Certificate: ${eventName} — CSEC-ASTU`;
  const name = escapeHtml(attendee.recipient_name);
  const event = escapeHtml(eventName);
  const code = escapeHtml(attendee.certificate_code);
  const issueDate = escapeHtml(attendee.issue_date);

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f4f4f5; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #111114; border: 1px solid #27272a; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
          
          <!-- Minimalist Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #1f1f23;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #38bdf8; background-color: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 6px; padding: 4px 10px;">
                      VERIFIED CREDENTIAL
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #71717a;">CSEC ASTU</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 18px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em; line-height: 1.3;">
                      Certificate of Achievement
                    </h1>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">
                      Official credential record from the Computer Science &amp; Engineering Club
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #d4d4d8;">
                Dear <strong style="color: #ffffff;">${name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.65; color: #a1a1aa;">
                Congratulations on successfully completing participation requirements for <strong style="color: #f4f4f5;">${event}</strong>. Your performance has been verified and permanently archived on the university club ledger.
              </p>

              <!-- Credential Meta Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #18181b; border: 1px solid #27272a; border-radius: 10px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #222226;">
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a;">Credential Identifier</div>
                    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 15px; font-weight: 700; color: #38bdf8; margin-top: 4px; letter-spacing: 0.04em;">
                      ${code}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%">
                          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a;">Issue Date</div>
                          <div style="font-size: 13px; font-weight: 500; color: #f4f4f5; margin-top: 2px;">${issueDate}</div>
                        </td>
                        <td width="50%">
                          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a;">Issuing Authority</div>
                          <div style="font-size: 13px; font-weight: 500; color: #f4f4f5; margin-top: 2px;">CSEC-ASTU</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Buttons -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding-right: 12px;">
                    <a href="${verifyUrl}" target="_blank" style="display: inline-block; background-color: #ffffff; color: #09090b; font-size: 13px; font-weight: 600; text-decoration: none; padding: 11px 22px; border-radius: 8px; letter-spacing: -0.01em;">
                      Verify Credential &rarr;
                    </a>
                  </td>
                  ${driveUrl ? `
                  <td>
                    <a href="${driveUrl}" target="_blank" style="display: inline-block; background-color: #1f1f23; color: #e4e4e7; border: 1px solid #323238; font-size: 13px; font-weight: 500; text-decoration: none; padding: 10px 20px; border-radius: 8px;">
                      Drive Archive
                    </a>
                  </td>` : ''}
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 12px; color: #71717a; line-height: 1.5;">
                ${pdfBlob ? '⚡ A print-ready, high-resolution PDF certificate is attached directly to this message.' : ''}
              </p>
            </td>
          </tr>

          <!-- Minimalist Footer -->
          <tr>
            <td style="padding: 20px 32px 24px 32px; background-color: #0c0c0e; border-top: 1px solid #1f1f23; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #71717a; line-height: 1.5;">
                Computer Science &amp; Engineering Club &middot; Adama Science and Technology University
              </p>
              <p style="margin: 4px 0 0 0; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 10px; color: #52525b;">
                AUTHENTICATED VIA CSEC CREDENTIAL AUTHORITY
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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

/**
 * Template 2: Minimalist Executive Presidential Announcement Email
 */
function sendPresidentialEmail(opts) {
  const recipientEmail = opts.recipientEmail;
  const recipientName = escapeHtml(opts.recipientName);
  const subject = opts.subject;
  const badge = escapeHtml(opts.badge || "OFFICIAL NOTICE");
  const title = escapeHtml(opts.title);
  const senderTitle = escapeHtml(opts.senderTitle || "Office of the President");
  const ctaText = escapeHtml(opts.ctaText || "");
  const ctaUrl = opts.ctaUrl || "";
  
  // Format body: convert newlines to clean HTML paragraphs if plain text
  let bodyContent = opts.messageBody || "";
  if (!bodyContent.includes("<p>") && !bodyContent.includes("<div>")) {
    const paragraphs = bodyContent.split(/\n\s*\n/);
    bodyContent = paragraphs.map(p => `<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.7; color: #d4d4d8;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
  }

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f4f4f5; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #111114; border: 1px solid #27272a; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
          
          <!-- Minimalist Executive Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #1f1f23;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #a1a1aa; background-color: #1a1a1e; border: 1px solid #2e2e34; border-radius: 6px; padding: 4px 10px;">
                      ${badge}
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #71717a;">CSEC ASTU</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 18px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em; line-height: 1.3;">
                      ${title}
                    </h1>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                      Dispatched from the ${senderTitle}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.6; color: #f4f4f5;">
                Hello <strong style="color: #ffffff;">${recipientName}</strong>,
              </p>

              <!-- Main message content -->
              <div style="color: #d4d4d8; font-size: 14px; line-height: 1.7;">
                ${bodyContent}
              </div>

              <!-- Optional Call-to-Action Button -->
              ${ctaText && ctaUrl ? `
              <table border="0" cellspacing="0" cellpadding="0" style="margin-top: 28px; margin-bottom: 8px;">
                <tr>
                  <td>
                    <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #ffffff; color: #09090b; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; letter-spacing: -0.01em;">
                      ${ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Signature -->
              <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #1f1f23;">
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #ffffff;">Executive Leadership</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: #71717a;">Computer Science &amp; Engineering Club &middot; ASTU</p>
              </div>
            </td>
          </tr>

          <!-- Minimalist Footer -->
          <tr>
            <td style="padding: 20px 32px 24px 32px; background-color: #0c0c0e; border-top: 1px solid #1f1f23; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #71717a; line-height: 1.5;">
                You are receiving this official correspondence as an enrolled member of CSEC ASTU.
              </p>
              <p style="margin: 4px 0 0 0; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 10px; color: #52525b;">
                EXECUTIVE BROADCAST SERVICE &middot; ADAMA SCIENCE &amp; TECHNOLOGY UNIVERSITY
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  GmailApp.sendEmail(recipientEmail, subject, "", {
    htmlBody: htmlBody,
    name: "CSEC-ASTU President"
  });
}

/**
 * -----------------------------------------------------------------------------
 * 3. FILE & PROFILE PICTURE UPLOAD PIPELINE
 * -----------------------------------------------------------------------------
 * Uploads files directly into Google Drive under the user's 1 TB personal/school quota.
 */
function handleFileUpload(data) {
  const base64Data = data.file_base64;
  if (!base64Data) {
    return jsonResponse({ status: "error", message: "Missing file_base64 payload" });
  }

  const fileName = data.file_name || ("upload_" + new Date().getTime() + ".bin");
  let mimeType = data.mime_type;

  // Resolve canonical MIME type based on filename extension
  if (!mimeType || mimeType === "application/octet-stream") {
    if (fileName.match(/\.pptx$/i)) {
      mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    } else if (fileName.match(/\.ppt$/i)) {
      mimeType = "application/vnd.ms-powerpoint";
    } else if (fileName.match(/\.png$/i)) {
      mimeType = "image/png";
    } else if (fileName.match(/\.jpe?g$/i)) {
      mimeType = "image/jpeg";
    } else if (fileName.match(/\.pdf$/i)) {
      mimeType = "application/pdf";
    } else if (fileName.match(/\.svg$/i)) {
      mimeType = "image/svg+xml";
    } else {
      mimeType = "application/octet-stream";
    }
  }

  const folderId = data.folder_id || OUTPUT_DRIVE_FOLDER_ID;

  let targetFolder = null;
  if (folderId) {
    try {
      targetFolder = DriveApp.getFolderById(folderId);
    } catch (folderErr) {
      Logger.log("Specified folder ID not accessible (" + folderId + "): " + folderErr);
    }
  }

  if (!targetFolder) {
    targetFolder = DriveApp.getRootFolder();
  }

  try {
    // Strip data URI scheme prefix and any whitespace/newlines
    let cleanBase64 = String(base64Data).trim();
    if (cleanBase64.indexOf("base64,") !== -1) {
      cleanBase64 = cleanBase64.split("base64,")[1];
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, "");

    const decodedBytes = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
    const file = targetFolder.createFile(blob);

    // Make viewable via link for certificate/profile display
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const directUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    const driveUrl = file.getUrl();
    let googleSlideId = null;
    let googleSlideUrl = null;

    // If a PowerPoint file was uploaded, automatically convert it to native Google Slides
    if (fileName.match(/\.pptx?$/i)) {
      try {
        const convertedSlide = convertPptxToGoogleSlide(file, targetFolder);
        if (convertedSlide) {
          googleSlideId = convertedSlide.getId();
          googleSlideUrl = "https://docs.google.com/presentation/d/" + googleSlideId + "/edit";
          Logger.log("Auto-converted uploaded PPTX to native Google Slide: " + googleSlideId);
        } else {
          Logger.log("Warning: convertPptxToGoogleSlide returned null for " + fileName);
        }
      } catch (convErr) {
        Logger.log("Auto-conversion of PPTX failed during upload: " + convErr);
      }
    }

    return jsonResponse({
      status: "success",
      file_id: fileId,
      url: directUrl,
      drive_url: driveUrl,
      name: fileName,
      google_slide_id: googleSlideId || fileId,
      google_slide_url: googleSlideUrl || (googleSlideId ? ("https://docs.google.com/presentation/d/" + googleSlideId + "/edit") : driveUrl)
    });
  } catch (uploadErr) {
    Logger.log("handleFileUpload Error: " + uploadErr);
    return jsonResponse({
      status: "error",
      message: "Failed to upload file to Google Drive: " + uploadErr.toString()
    });
  }
}

/** Helper to construct standard JSON response */
function jsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Automatically converts a Microsoft PowerPoint (.pptx) file into a native Google Slides presentation.
 * Returns the Google Slides Drive File object, or null if conversion cannot be performed.
 */
function convertPptxToGoogleSlide(file, targetFolder, logs) {
  if (!file) {
    if (logs) logs.push("File object is null/undefined");
    return null;
  }
  const mime = file.getMimeType();
  if (mime === MimeType.GOOGLE_SLIDES || mime === "application/vnd.google-apps.presentation") {
    return file;
  }

  const baseName = file.getName().replace(/\.pptx?$/i, "");
  const folder = targetFolder || DriveApp.getRootFolder();
  const fileId = file.getId();
  if (logs) logs.push(`Source file: "${file.getName()}" (ID: ${fileId}, MIME: ${mime})`);

  // 1. Check if a converted Google Slide already exists in this folder with the baseName
  try {
    const existing = folder.getFilesByName(baseName);
    while (existing.hasNext()) {
      const f = existing.next();
      const fMime = f.getMimeType();
      if (fMime === MimeType.GOOGLE_SLIDES || fMime === "application/vnd.google-apps.presentation") {
        Logger.log("Found existing converted Google Slide: " + f.getId());
        if (logs) logs.push("Reused existing converted slide: " + f.getId());
        return f;
      }
    }
  } catch (findErr) {
    if (logs) logs.push("Check existing slide note: " + findErr.toString());
  }

  // 2. Strategy A: Convert existing PPTX file directly via Google Drive API v2 copy endpoint with convert=true
  try {
    const token = ScriptApp.getOAuthToken();
    const copyUrl = "https://www.googleapis.com/drive/v2/files/" + encodeURIComponent(fileId) + "/copy?convert=true";
    const copyPayload = {
      title: baseName,
      parents: [{ id: folder.getId() }]
    };
    const copyRes = UrlFetchApp.fetch(copyUrl, {
      method: "post",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(copyPayload),
      muteHttpExceptions: true
    });
    const copyCode = copyRes.getResponseCode();
    if (copyCode >= 200 && copyCode < 300) {
      const copyData = JSON.parse(copyRes.getContentText());
      if (copyData && copyData.id) {
        const slideFile = DriveApp.getFileById(copyData.id);
        try {
          slideFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (_) {}
        Logger.log("Successfully converted PPTX to Google Slide via Drive API v2 copy: " + copyData.id);
        return slideFile;
      }
    } else {
      if (logs) logs.push(`Drive API v2 copy returned ${copyCode}: ${copyRes.getContentText().substring(0, 150)}`);
    }
  } catch (copyErr) {
    if (logs) logs.push("Drive API v2 copy exception: " + copyErr.toString());
  }

  // 3. Strategy B: Drive Advanced Service (if enabled in Apps Script Services)
  if (typeof Drive !== "undefined" && Drive.Files) {
    try {
      const blob = file.getBlob();
      if (Drive.Files.insert) {
        const resource = {
          title: baseName,
          mimeType: MimeType.GOOGLE_SLIDES,
          parents: [{ id: folder.getId() }]
        };
        const created = Drive.Files.insert(resource, blob, { convert: true });
        const slideFile = DriveApp.getFileById(created.id);
        try {
          slideFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (_) {}
        Logger.log("Converted PPTX via Drive Advanced Service v2: " + created.id);
        return slideFile;
      }
      if (Drive.Files.create) {
        const resource = {
          name: baseName,
          mimeType: MimeType.GOOGLE_SLIDES,
          parents: [folder.getId()]
        };
        const created = Drive.Files.create(resource, blob);
        const slideFile = DriveApp.getFileById(created.id);
        try {
          slideFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (_) {}
        Logger.log("Converted PPTX via Drive Advanced Service v3: " + created.id);
        return slideFile;
      }
    } catch (driveErr) {
      if (logs) logs.push("Drive Advanced Service failed: " + driveErr.toString());
    }
  } else {
    if (logs) logs.push("Drive Advanced Service is not enabled in Apps Script (Drive is undefined)");
  }

  // 4. Strategy C: Drive REST API v3 multipart upload with raw binary bytes
  try {
    const token = ScriptApp.getOAuthToken();
    const boundary = "csec_boundary_" + Utilities.getUuid();
    const metadata = {
      name: baseName,
      mimeType: "application/vnd.google-apps.presentation",
      parents: [folder.getId()]
    };

    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--\r\n";

    const headString = delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n";

    const headBytes = Utilities.newBlob(headString).getBytes();
    const fileBytes = file.getBlob().getBytes();
    const tailBytes = Utilities.newBlob(closeDelimiter).getBytes();

    const totalLength = headBytes.length + fileBytes.length + tailBytes.length;
    const combinedBytes = new Uint8Array(totalLength);
    combinedBytes.set(headBytes, 0);
    combinedBytes.set(fileBytes, headBytes.length);
    combinedBytes.set(tailBytes, headBytes.length + fileBytes.length);

    const payloadBlob = Utilities.newBlob(Array.from(combinedBytes), "multipart/related; boundary=" + boundary);

    const response = UrlFetchApp.fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "post",
      headers: {
        Authorization: "Bearer " + token
      },
      contentType: "multipart/related; boundary=" + boundary,
      payload: payloadBlob.getBytes(),
      muteHttpExceptions: true
    });

    const status = response.getResponseCode();
    if (status >= 200 && status < 300) {
      const json = JSON.parse(response.getContentText());
      const slideFile = DriveApp.getFileById(json.id);
      try {
        slideFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (_) {}
      Logger.log("Converted PPTX via Drive API v3 multipart: " + json.id);
      return slideFile;
    } else {
      if (logs) logs.push(`Drive API v3 multipart returned ${status}: ${response.getContentText().substring(0, 150)}`);
    }
  } catch (v3Err) {
    if (logs) logs.push("Drive API v3 multipart exception: " + v3Err.toString());
  }

  return null;
}

