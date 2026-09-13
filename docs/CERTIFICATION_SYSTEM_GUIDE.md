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

## 3. Canva-to-PowerPoint (.pptx) Template Instructions

Designers in the Social Media division must adhere to the following technical rules when building templates in Canva:

1. **Orientation**: Standard Landscape (16:9 Widescreen or A4 Landscape `297mm × 210mm`).
2. **Dynamic Placeholder Text Runs**:
   Leave exact mustache tags inside the text boxes so the automated Python engine can inject student data:
   - `{{STUDENT_NAME}}` (Recipient Full Name — Headline font)
   - `{{STUDENT_ID}}` (University ID: e.g., UGR/12345/14)
   - `{{DIVISION_NAME}}`
   - `{{CERT_TITLE}}`
   - `{{DESCRIPTION}}`
   - `{{ISSUE_DATE}}`
   - `{{ACADEMIC_YEAR}}`
   - `{{CERT_CODE}}`
3. **QR Code Placement**:
   - Place a square shape/box labeled `{{QR_CODE}}` in a high-contrast bottom corner.
   - The backend `python-pptx` worker will swap this shape with the generated cryptographic QR code image.
4. **Signatories**:
   - Left Block: President Signature PNG, Name, and Title ("President, CSEC-ASTU").
   - Right Block: Vice President / Division Head Signature PNG, Name, and Title.
5. **Export Format**:
   - In Canva, navigate to **Share** $\rightarrow$ **More** $\rightarrow$ **Microsoft PowerPoint (.pptx)**.
   - Deliver the `.pptx` file to the platform administrator.

---

## 4. Division Head Pairing Protocol

To ensure all 8 division certificates are finalized quickly and cohesively:
1. **1-on-1 Pairing**: Each Division Head appoints 1 division point-of-contact (POC) to pair with 1 Social Media division designer.
2. **Telegram Taskforce Group**: All pairs coordinate in a shared Telegram group to review typography, color harmony, and accurate technical citations.
3. **Executive Approval**: Final `.pptx` templates are reviewed and signed off by the President and Vice President before platform ingestion.
