# CSEC-ASTU Automated Cryptographic Certification Guide

## Overview & Purpose
The CSEC-ASTU Certification Engine replaces manual Canva exports with a high-throughput, cryptographically verifiable credential system. 

Certificates issued through this system:
1. Are dynamically minted from `.pptx` templates designed in Canva.
2. Embed an HMAC-SHA256 cryptographic signature encoded into an on-certificate QR code.
3. Resolve to a public verification endpoint (`/verify/certificate/[code]`) allowing recruiters, university administrators, and employers to confirm credential validity.
4. Provide a 1-click **"Add to LinkedIn"** credential flow for ASTU students.
5. Are archived to the club's Google Drive and delivered to members via automated queue.

---

## 1. Division Color & Identity Specifications

All certificates share the master CSEC-ASTU dark-mode foundation (`#0b0d13` to `#121520` background, dual-layer tech border, and gold foil seal), accented by division-specific neon/metallic palettes:

| Division | Accent Color Palette | Hex Codes | Core Certificate Focus |
| :--- | :--- | :--- | :--- |
| **Development** | Electric Cyan & Sky Blue | `#00e5ff` / `#0072ff` | Full-Stack, Mobile, Cloud, Open-Source |
| **Competitive Programming** | Emerald Green & Acid Lime | `#10b981` / `#00f5a0` | Algorithms, Data Structures, ICPC Contests |
| **Cybersecurity** | Crimson Red & Laser Orange | `#ef4444` / `#f97316` | Network Security, CTF, Penetration Testing |
| **Data Science & AI** | Deep Violet & Cyber Purple | `#8b5cf6` / `#d946ef` | Machine Learning, Analytics, Pipelines |
| **Capacity Building** | Royal Gold & Warm Amber | `#f59e0b` / `#fbbf24` | Mentorship, Peer Tutoring, Workshop Delivery |
| **Blockchain Team** | Solana Purple & Neon Mint | `#9945ff` / `#14f195` | Smart Contracts, Cryptography, Web3 |
| **Social Media & Branding** | Hot Coral & Radiant Pink | `#f43f5e` / `#ec4899` | Creative Direction, Multimedia, Brand Strategy |
| **Executive Council** | Champagne Gold & Platinum | `#d4af37` / `#e2e8f0` | Executive Leadership & Club-Wide Governance |

---

## 2. Standard Certificate Titles & Citations

### A. Development Division
- **Tier 1 (Track Completion)**: *Certificate of Full-Stack & Software Engineering Mastery*
  - **Citation**: *"For successful completion of the core development curriculum, active contribution to club software projects, and demonstrated technical competence."*
- **Tier 2 (Merit & Distinction)**: *Certificate of Excellence in Open-Source & Product Engineering*
  - **Citation**: *"In recognition of extraordinary architectural contributions, open-source leadership, and high-impact software delivery for CSEC-ASTU."*

### B. Competitive Programming Division
- **Tier 1 (Track Completion)**: *Certificate of Algorithmic & Data Structures Mastery*
  - **Citation**: *"For rigorous training in advanced algorithms, problem-solving, and active participation in weekly coding rounds."*
- **Tier 2 (Merit & Distinction)**: *Certificate of Competitive Programming Distinction*
  - **Citation**: *"Conferred for exemplary performance in official programming contests, ICPC qualifiers, and divisional problem-solving benchmarks."*

### C. Cybersecurity Division
- **Tier 1 (Track Completion)**: *Certificate of Offensive & Defensive Security Mastery*
  - **Citation**: *"For completing foundational training in network security, system hardening, and web penetration testing."*
- **Tier 2 (Merit & Distinction)**: *Certificate of CTF & Threat Analysis Excellence*
  - **Citation**: *"Conferred for outstanding defensive acumen, capture-the-flag tournament rankings, and security research."*

### D. Data Science & AI Division
- **Tier 1 (Track Completion)**: *Certificate of Applied Machine Learning & Data Engineering*
  - **Citation**: *"For hands-on completion of predictive modeling, data pipelines, and machine learning architectures."*
- **Tier 2 (Merit & Distinction)**: *Certificate of AI Research & Analytics Distinction*
  - **Citation**: *"In recognition of superior project execution in deep learning, data visualization, and empirical research."*

### E. Capacity Building Division
- **Tier 1 (Track Completion)**: *Certificate of Technical Mentorship & Workshop Delivery*
  - **Citation**: *"In recognition of outstanding dedication to peer education, conducting tech workshops, and student mentorship."*
- **Tier 2 (Service Honor)**: *Certificate of Leadership & Community Empowerment*
  - **Citation**: *"Conferred for exceptional commitment to student onboarding, leadership training, and club capacity development."*

### F. Blockchain Team
- **Tier 1 (Track Completion)**: *Certificate of Web3 & Smart Contract Engineering*
  - **Citation**: *"For demonstrated proficiency in decentralized architectures, cryptography, and smart contract protocol development."*

### G. Social Media & Branding Division
- **Tier 1 (Service Honor)**: *Certificate of Creative Media & Digital Brand Direction*
  - **Citation**: *"In recognition of high-impact visual design, community engagement, and multimedia storytelling for CSEC-ASTU."*

### H. Executive Council (Club-Wide)
- **Executive Tier**: *Certificate of Executive Leadership & Outstanding Service*
  - **Citation**: *"Conferred upon members of the executive leadership council in recognition of exceptional service, strategic direction, and stewardship of CSEC-ASTU."*

---

## 3. Slide & Canva Template Technical Guidelines (.pptx / Google Slides)

Designers in the Social Media division and division technical leads must adhere to the following technical rules when building templates in Canva, PowerPoint, or Google Slides:

### A. Dimensions & Layout
1. **Orientation**: Standard Landscape (16:9 Widescreen `1920×1080` or A4 Landscape `297mm × 210mm`).
2. **Safe Margin**: Keep all essential elements, border insets, signatures, and stamps at least `15mm` (or `60px`) away from the canvas edges to allow clean printing and framing.

### B. Dynamic Text Placeholders
Leave exact mustache tags inside dedicated text boxes so the automated cloud rendering engine can dynamically inject recipient and event data:
- `{{STUDENT_NAME}}` / `{{FULL_NAME}}` — Recipient full name (Headline font, centered).
- `{{STUDENT_ID}}` — Recipient University ID (e.g., `UGR/12345/14` or organization name for external participants).
- `{{DIVISION_NAME}}` — Issuing division (e.g., `Cybersecurity Division`).
- `{{CERT_TITLE}}` / `{{EVENT_NAME}}` — Event or credential title.
- `{{DESCRIPTION}}` — Conferred honor / track citation body text.
- `{{ISSUE_DATE}}` — Date formatted automatically (e.g., `October 27, 2026`).
- `{{ACADEMIC_YEAR}}` — Active cycle academic year (e.g., `2026`).
- `{{CERT_CODE}}` — Unique credential identifier (e.g., `CSEC-2026-DEV-A9B8C7`).
- `{{VERIFY_URL}}` — Full textual verification link (optional, if printed as text).

### C. QR Code Placeholder Specification (`{{QR_CODE}}`)
To enable seamless automated QR code replacement, designers must insert a dedicated placeholder shape:
1. **Shape Type**: A 1:1 **Square Rectangle Shape** (not a loose text box or irregular circle).
2. **Placeholder Text**: Inside the square shape, type the exact text: `{{QR_CODE}}`.
3. **Recommended Size**:
   - On 16:9 widescreen slides: `80px × 80px` to `110px × 110px`.
   - On A4 print layouts: `18mm × 18mm` to `22mm × 22mm`.
4. **Placement**:
   - Place in a quiet, high-contrast corner (typically bottom-right or bottom-center adjacent to the official foil seal and signatories).
   - Maintain a minimum of `10px` clear margin around the box.
5. **Styling**: Give the square a subtle light background (e.g., white or `#ffffff15` with a thin accent border). The engine will delete this placeholder shape and insert a sharp 300 DPI vector QR code in its exact bounding box (`left, top, width, height`).
6. **Automated Behavior**:
   - The engine reads the environment domain (`FRONTEND_URL` from `.env`, defaulting to `https://csec.astu.edu.et`).
   - The QR code encodes `{FRONTEND_URL}/verify/certificate/{CERT_CODE}`.
   - In the generated PDF, the QR code is also an interactive clickable hyperlink.
7. **Human-Readable Credential Code (`{{CERT_CODE}}`)**:
   - Directly beneath the `{{QR_CODE}}` square (with a 2–4px vertical margin), place a small monospace text run: `{{CERT_CODE}}` (e.g., 6–8pt font size in high-contrast neutral or light gray).
   - When generated, this resolves to the unique code (e.g., `CSEC-2026-DEV-A9B8C7`).
   - **Fail-safe verification**: If an employer does not have a QR camera scanner or if the club domain ever migrates, the employer can visit `/verify` on the new website and enter this printed code directly.

### D. Signatories & Official Seals
1. **Left Signatory Block**: President Signature (transparent PNG), Name, and Title ("President, CSEC-ASTU").
2. **Right Signatory Block**: Vice President / Division Head Signature (transparent PNG), Name, and Title.
3. **Official Seal**: Centered gold/division foil seal stamp between the signatories.

### E. Template Export & Ingestion
1. **From Canva**: Click **Share** $\rightarrow$ **More** $\rightarrow$ **Microsoft PowerPoint (.pptx)** and download the `.pptx` file.
2. **Import to Platform**:
   - Go to `http://localhost:3000/templates` (or production templates dashboard).
   - Click **Import Canva Template (.pptx)** to upload and link the slide template.
   - Alternatively, open the `.pptx` in Google Drive, save as Google Slides, and paste the presentation ID into the issuance dialog.

---

## 4. Division Head Pairing Protocol

To ensure all 8 division certificates are finalized quickly and cohesively:
1. **1-on-1 Pairing**: Each Division Head appoints 1 division point-of-contact (POC) to pair with 1 Social Media division designer.
2. **Telegram Taskforce Group**: All pairs coordinate in a shared Telegram group to review typography, color harmony, and accurate technical citations.
3. **Executive Approval**: Final `.pptx` templates are reviewed and signed off by the President and Vice President before platform ingestion.
