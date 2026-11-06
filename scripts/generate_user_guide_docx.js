const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  NumberFormat
} = require('docx');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const OUTPUT_FILE = path.join(__dirname, '..', 'user_guide.docx');

// Helper to load image safely
function getImageRun(filename, width = 500, height = 350) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: Image ${filename} not found!`);
    return new Paragraph({ text: `[Image: ${filename} not found]` });
  }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 180, after: 120 },
    children: [
      new ImageRun({
        data: fs.readFileSync(filePath),
        transformation: { width, height },
        type: 'png',
      }),
    ],
  });
}

function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 200 },
    children: [
      new TextRun({
        text: `Figure: ${text}`,
        italics: true,
        size: 18, // 9pt
        color: '666666',
        font: 'Arial',
      }),
    ],
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 140 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32, // 16pt
        color: '0F172A',
        font: 'Arial',
      }),
    ],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 26, // 13pt
        color: '0284C7',
        font: 'Arial',
      }),
    ],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22, // 11pt
        color: '334155',
        font: 'Arial',
      }),
    ],
  });
}

function p(text, boldPrefix = '') {
  const children = [];
  if (boldPrefix) {
    children.push(
      new TextRun({
        text: boldPrefix + ' ',
        bold: true,
        size: 20, // 10pt
        color: '0F172A',
        font: 'Arial',
      })
    );
  }
  children.push(
    new TextRun({
      text,
      size: 20, // 10pt
      color: '334155',
      font: 'Arial',
    })
  );
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children,
  });
}

function bullet(text, boldPrefix = '') {
  const children = [];
  children.push(new TextRun({ text: '•  ', bold: true, color: '0284C7', size: 20, font: 'Arial' }));
  if (boldPrefix) {
    children.push(new TextRun({ text: boldPrefix + ' ', bold: true, size: 20, color: '0F172A', font: 'Arial' }));
  }
  children.push(new TextRun({ text, size: 20, color: '334155', font: 'Arial' }));
  return new Paragraph({
    spacing: { before: 40, after: 60 },
    indent: { left: 360 },
    children,
  });
}

function noteBox(title, body) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: 'F0FDF4', type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.SINGLE, size: 24, color: '059669' },
            },
            margins: { top: 140, bottom: 140, left: 200, right: 140 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [
                  new TextRun({ text: `📌 ${title}`, bold: true, size: 20, color: '065F46', font: 'Arial' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: body, size: 19, color: '047857', font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: '0F172A', type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 140, right: 140 },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: h, bold: true, size: 19, color: 'FFFFFF', font: 'Arial' })],
          }),
        ],
      })
    ),
  });

  const bodyRows = rows.map(
    (row, rIdx) =>
      new TableRow({
        children: row.map((cellText, i) =>
          new TableCell({
            width: { size: colWidths[i], type: WidthType.DXA },
            shading: { fill: rIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF', type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
              left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
              right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
            },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: cellText, size: 18, color: '334155', font: 'Arial' })],
              }),
            ],
          })
        ),
      })
  );

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...bodyRows],
  });
}

async function buildDocx() {
  console.log('Generating comprehensive user_guide.docx...');

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 20 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // US Letter
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'CommunityHolder — Comprehensive User Guide & Operations Manual',
                    size: 16,
                    color: '94A3B8',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8', font: 'Arial' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                    font: 'Arial',
                  }),
                  new TextRun({ text: ' of ', size: 16, color: '94A3B8', font: 'Arial' }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Title Page Banner
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: 'COMMUNITYHOLDER',
                bold: true,
                size: 48, // 24pt
                color: '0F172A',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [
              new TextRun({
                text: 'Next-Generation Smart Society, Gated Community ERP & Gatekeeper Operating System',
                italics: true,
                size: 24, // 12pt
                color: '0284C7',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 360 },
            children: [
              new TextRun({
                text: 'Comprehensive Multi-Persona User Guide with Visual Screen Walkthroughs',
                bold: true,
                size: 22,
                color: '475569',
                font: 'Arial',
              }),
            ],
          }),

          // Metadata Table
          createTable(
            ['Parameter', 'Specification Details'],
            [
              ['System Version', 'CommunityHolder v1.0.0 (CRED-Inspired Tactile Neumorphism)'],
              ['Target Personas', 'Resident Owners, New Applicants, Estate Managers, Security Guards'],
              ['Target Form Factors', 'Web (Desktop/Tablet), Android Mobile (PWA), iOS Mobile (PWA)'],
              ['Backend Infrastructure', 'Node.js Express + Supabase PostgreSQL (Project: ggzbyynthvxwkpdbjklf)'],
              ['Localhost Access', 'http://localhost:3000 (Vite Reverse Proxy) / http://localhost:4000 (API)'],
              ['Document Date', 'November 2026 • Production Edition'],
            ],
            [3000, 6360]
          ),

          new Paragraph({ spacing: { before: 200, after: 200 } }),

          noteBox(
            'Executive Overview',
            'CommunityHolder is an enterprise-grade digital operating system designed for modern gated communities, apartment complexes, and villa layouts. It bridges residents, security personnel, facility managers, and managing committees onto a unified platform featuring bank-grade security, double-entry financial accounting, and tactile CRED-inspired mobile experiences.'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // CHAPTER 1
          heading1('Chapter 1: Platform Setup & Quick Navigation'),
          p(
            'CommunityHolder is engineered as a monorepo consisting of shared TypeScript schemas (@communityholder/shared), a high-performance Express & WebSocket API (@communityholder/api), and a responsive React 19 web application (@communityholder/web). Both the Web client and mobile devices access the system through port 3000.'
          ),

          heading2('1.1 System Launch & Server Commands'),
          p('To run the entire system locally, execute the following commands in terminal:'),
          bullet('pnpm install', 'Dependency Installation:'),
          bullet('pnpm build', 'Monorepo Compilation:'),
          bullet('pnpm dev', 'Concurrent Launch (API on 4000, Web on 3000):'),
          bullet('pnpm test', 'Regression Verification (52 tests across 9 test files):'),

          heading2('1.2 Pre-Seeded Test Personas & Access Credentials'),
          p(
            'The platform includes pre-configured test profiles allowing instant verification of every business flow. The system automatically populates the required 6-digit OTP for testing convenience:'
          ),

          createTable(
            ['Persona & Role', 'Mobile Number', 'Unit / Flat', 'KYC Status', 'Key Functional Highlights'],
            [
              ['Resident Owner', '+91 9876543210', 'Flat 1204', 'APPROVED', '3D Black Card, Slide-to-Pay, Gate Radar, Guest PIN'],
              ['New Applicant', '+91 9988776655', 'Flat 101', 'PENDING', 'First-time registration, Document vault, Confinement guard'],
              ['Estate Manager', '+91 9888877777', 'Office', 'APPROVED', 'Split-screen KYC queue, Ledger, Monthly billing, DPDPA'],
              ['Security Guard', '+91 9777766666', 'Gate Post', 'APPROVED', 'PIN barrier numpad, Walk-in check-in, Overstay, Parcels'],
            ],
            [1800, 1600, 1200, 1200, 3560]
          ),

          new Paragraph({ spacing: { before: 200, after: 200 } }),

          heading2('1.3 Top Command Bar & Persona Quick-Switcher'),
          p(
            'When visiting http://localhost:3000, the top sticky command bar displays the live API connection status ("API Online" / "Mock Mode"), an interactive Testing Guide button, and an instant three-persona switcher:'
          ),
          bullet('Resident Mobile: Switches to the mobile smartphone super-app experience.', '1.'),
          bullet('Guard Tablet: Switches to the high-contrast security cabin tablet console.', '2.'),
          bullet('Admin ERP: Switches to the society facility manager administrative dashboard.', '3.'),

          new Paragraph({ children: [new PageBreak()] }),

          // CHAPTER 2
          heading1('Chapter 2: Persona 1 — Resident Owner (Approved Resident)'),
          p(
            'The Resident Owner persona represents an approved resident living in Flat 1204 (Tower Alpha) of Prestige Greenwoods. The resident has access to the full suite of luxury super-app features.'
          ),

          heading2('2.1 Mobile Phone Passwordless Login & OTP Verification'),
          p(
            'CommunityHolder employs strict phone-based authentication using E.164 normalization. Password-based credentials are eliminated in favor of single-use 6-digit cryptographic OTPs.'
          ),
          bullet('Step 1: Select Country Code (e.g. +91 India, +1 US, +971 UAE, +44 UK).', 'Action:'),
          bullet('Step 2: Enter resident phone number 9876543210 and tap "Send 6-Digit OTP".', 'Action:'),
          bullet('Step 3: The 6-digit OTP is generated and populated into the tactile debossed wells.', 'Action:'),
          bullet('Step 4: Tap "Verify & Unlock Pass" to authenticate and load the resident session.', 'Action:'),

          getImageRun('01_resident_phone_login.png', 480, 335),
          caption('Resident Mobile Phone Authentication Login Screen'),

          getImageRun('02_resident_otp_entry.png', 480, 335),
          caption('6-Digit OTP Verification Screen with Tactile Inset Wells'),

          heading2('2.2 Approved Resident Super App Dashboard'),
          p(
            'Upon successful login, the approved resident is welcomed by the CRED-inspired dark luxury dashboard. Core elements include:'
          ),
          bullet('3D Black Property Card: Displays property identity (Flat 1204, Tower Alpha, 1,500 sq.ft) with unique Virtual Account Number (VAN: HDFC0001204) and current outstanding maintenance balance.', '•'),
          bullet('CRED Tactile Slide-to-Pay Slider: A glowing neon-mint thumb pill requiring a deliberate drag past the 85% spring threshold to execute immediate invoice settlement.', '•'),
          bullet('Quick Action Pills: One-tap triggers for "+ Pre-Approve Guest" and "Simulate Gate Call".', '•'),
          bullet('Deliveries at Gate Bay: Real-time list of inward parcels awaiting collection with secure 4-digit pickup OTPs.', '•'),

          getImageRun('03_resident_dashboard.png', 480, 335),
          caption('Approved Resident Dashboard with 3D Black Card and Slide-to-Pay Widget'),

          heading2('2.3 Tactile Slide-to-Pay Maintenance Dues Settlement'),
          p(
            'To settle pending maintenance dues (₹120.00 for November 2026), touch and drag the glowing "SLIDE TO PAY DUES" pill. Dragging past the 85% threshold locks the pill, triggers haptic feedback, and posts a double-entry ledger settlement on the backend. The dues card transitions immediately to "All maintenance dues settled for November!" with receipt reference RCP-INV-202611.'
          ),

          heading2('2.4 Live Gate Intercom & Concentric Radar Pulse Alert'),
          p(
            'When a delivery executive (e.g. Swiggy Instamart) or cab arrives at the security gate, the guard rings the flat intercom. Click "Simulate Gate Call" to experience this flow:'
          ),
          bullet('Pulsing Concentric Radar: The screen displays an active radar visualization with visitor photo, courier company, vehicle number (KA-03-HA-8192), and timestamp.', '•'),
          bullet('Slide-to-Approve Action: Drag the slider to authorize the boom barrier lift instantly.', '•'),
          bullet('Leave at Gate Action: Tap "Leave at Gate" if you are away, notifying the guard to redirect the package to the parcel bay.', '•'),

          getImageRun('04_resident_gate_radar.png', 480, 335),
          caption('Live Gate Intercom Alert with Concentric Radar Pulse Card'),

          heading2('2.5 Pre-Approved Guest Passes & Instant QR Code Generator'),
          p(
            'Residents can generate pre-authorized visitor passes in advance to bypass manual security questions at the gate:'
          ),
          bullet('Tap "+ Pre-Approve Guest" on the dashboard.', 'Step 1:'),
          bullet('Enter guest name (e.g. "Vikram Sharma") and category (Guest, Cab, Delivery).', 'Step 2:'),
          bullet('Tap "Generate 6-Digit Pass". The system assigns a 6-digit PIN (e.g. 849201) and generates a shareable QR code valid for 24 hours.', 'Step 3:'),

          getImageRun('05_resident_guest_pass_modal.png', 480, 335),
          caption('Pre-Approved Guest Pass Creation Modal'),

          getImageRun('05b_resident_pass_generated.png', 480, 335),
          caption('Generated Guest Gate Pass with 6-Digit PIN and Scannable QR Code'),

          heading2('2.6 Parcel Custody & Pickup OTP Verification'),
          p(
            'When couriers (Amazon, Flipkart, Swiggy) deliver packages while a resident is unavailable, guards deposit items in the security parcel bay. The resident dashboard displays the package name along with an encrypted 4-digit pickup OTP (e.g. 7821). The resident provides this OTP to the guard upon collection to release custody.'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // CHAPTER 3
          heading1('Chapter 3: Persona 2 — New Resident Applicant (KYC & Confinement)'),
          p(
            'The New Resident Applicant persona demonstrates the strict zero-trust onboarding workflow. In this flow, an unverified user attempts to join the society for Flat 101.'
          ),

          heading2('3.1 First-Time Registration & KYC Document Vault'),
          p(
            'Login using phone number +91 9988776655. Because this number is not yet recognized in the master unit directory, the platform directs the user to the Digital KYC Verification Vault.'
          ),
          bullet('Full Name: Aditi Rao', 'Applicant Details:'),
          bullet('Unit Claimed: Flat 101 (Tower Alpha)', 'Applicant Details:'),
          bullet('Occupancy Type: Primary Owner (or Tenant / Co-Owner)', 'Applicant Details:'),
          bullet('Government ID: Aadhaar Card / Passport (PDF / PNG, encrypted with SHA-256)', 'Required Documents:'),
          bullet('Property Proof: Registered Sale Deed / Tenancy Agreement (PDF / PNG)', 'Required Documents:'),

          getImageRun('06_new_resident_kyc_vault.png', 480, 335),
          caption('Digital KYC Verification Vault for First-Time Resident Registration'),

          heading2('3.2 API Gateway Confinement Guard Enforcement'),
          p(
            'Upon tapping "Submit Documents For Manual Approval", the documents are vaulted with SHA-256 integrity checksums, and the application status is set to PENDING_VERIFICATION.'
          ),
          p(
            'The user enters the Confinement Guard state: all gate intercom feeds, visitor creation endpoints, amenity bookings, and payment APIs are strictly locked at the API Gateway level (HTTP 403 Forbidden). A persistent amber status card informs the user that their application is undergoing review by the Estate Manager.'
          ),

          getImageRun('07_kyc_confinement_guard.png', 480, 335),
          caption('API Gateway Confinement Guard Banner — Application Under Review'),

          new Paragraph({ children: [new PageBreak()] }),

          // CHAPTER 4
          heading1('Chapter 4: Persona 3 — Estate / Facility Manager (Admin ERP)'),
          p(
            'The Estate / Facility Manager persona operates the society back-office ERP suite. Click "Admin ERP" in the top navigation bar to open the management console.'
          ),

          heading2('4.1 Split-Screen KYC Review Queue & Anti-Tamper Watermark'),
          p(
            'The KYC Review Queue enables administrators to inspect incoming resident applications side-by-side with original legal documents.'
          ),
          bullet('Left Panel: Displays the list of pending applicants (e.g. Aditi Rao, Flat 101) with phone numbers and role claims.', '1.'),
          bullet('Right Panel (Document Viewer): Renders the submitted Government ID and Sale Deed documents with an automated diagonal security watermark: "CONFIDENTIAL - SOCIETY VERIFICATION ONLY".', '2.'),
          bullet('Unit Conflict Detection: Automatically alerts the administrator if another resident already holds approved ownership of the claimed unit.', '3.'),
          bullet('Approve Resident: One-click approval that registers the resident in the Unit Member directory and lifts the mobile confinement guard.', '4.'),
          bullet('Reject Application: Opens a modal requiring a mandatory remediation reason (e.g. DOCUMENT_ILLEGIBLE, NAME_MISMATCH, INVALID_DEED) and auditor notes.', '5.'),

          getImageRun('12_admin_kyc_queue.png', 520, 365),
          caption('Admin ERP Split-Screen KYC Review Queue with Watermarked Documents'),

          heading2('4.2 Double-Entry General Ledger & Trial Balance'),
          p(
            'CommunityHolder includes a strict double-entry accounting engine where every transaction enforces the mathematical invariant: Total Debits == Total Credits.'
          ),
          bullet('Trial Balance Verification: Live display showing balanced status (Total Debits: ₹240.00, Total Credits: ₹240.00, Balanced: YES).', '•'),
          bullet('Account Chart: Tracks Bank Operating Accounts, Accounts Receivable, Maintenance Income, and Member Advance Deposit Wallets.', '•'),
          bullet('Audit Journal: Displays timestamped transactions with credit/debit breakdowns and source document references.', '•'),

          getImageRun('13_admin_general_ledger.png', 520, 365),
          caption('Admin ERP Double-Entry General Ledger & Trial Balance'),

          heading2('4.3 Automated Monthly Billing Run & VAN Webhook Simulation'),
          p(
            'The Billing & VAN tab manages the society dues generation and automated bank payment reconciliation:'
          ),
          bullet('Monthly Billing Generation: Set the maintenance rate per sq.ft (e.g. ₹0.10/sq.ft) and click "Run Monthly Billing" to issue invoices to all flats.', '•'),
          bullet('Virtual Account Number (VAN) Banking Simulation: Enter an inward transfer amount (e.g. ₹120.00) and click "Simulate VAN Webhook Transfer" to trigger an automated bank reconciliation matching the unit virtual account number.', '•'),

          getImageRun('14_admin_billing_van.png', 520, 365),
          caption('Admin ERP Monthly Billing Engine & Banking VAN Webhook Simulator'),

          heading2('4.4 Statutory DPDPA 2023 Visitor Retention Purge Worker'),
          p(
            'Under the Digital Personal Data Protection Act (DPDPA 2023), visitor photos cannot be retained indefinitely. Click "DPDPA 2023 Purge Worker" and tap "Run 90-Day Visitor Photo Purge Worker" to trigger the automated minimization cycle. Photos older than 90 days are purged from storage while encrypted audit logs are retained for statutory compliance.'
          ),

          getImageRun('15_admin_dpdpa_purge.png', 520, 365),
          caption('Admin ERP Statutory DPDPA 2023 Visitor Photo Purge Worker'),

          new Paragraph({ children: [new PageBreak()] }),

          // CHAPTER 5
          heading1('Chapter 5: Persona 4 — Security Guard (Gatekeeper Tablet Console)'),
          p(
            'The Guard Tablet Console is designed specifically for ruggedized 8"–10" touch tablets installed at society security cabins and boom barriers. Click "Guard Tablet" in the top bar to access this console.'
          ),

          heading2('5.1 Tactile PIN Barrier Validator & Boom Barrier Lift'),
          p(
            'When a guest arrives with a pre-approved 6-digit PIN, the guard uses the high-contrast numeric keypad to validate entry:'
          ),
          bullet('Enter the 6-digit PIN (e.g. 8, 4, 9, 2, 0, 1) using the debossed number buttons.', 'Step 1:'),
          bullet('Tap "Verify PIN & Open Barrier".', 'Step 2:'),
          bullet('Valid PIN: Displays a glowing green confirmation with guest name and flat number, and triggers the boom barrier lift animation.', 'Step 3:'),
          bullet('Already-Used PIN: Prohibits entry and flags a single-use replay violation.', 'Security:'),

          getImageRun('08_guard_pin_validator.png', 520, 365),
          caption('Guard Tablet PIN Barrier Validator with Tactile Numeric Keypad'),

          getImageRun('08b_guard_pin_entered.png', 520, 365),
          caption('Guard Tablet PIN Verification Ready with Destination Flat Display'),

          heading2('5.2 Walk-in Visitor Check-in & Photo Capture'),
          p(
            'For unexpected visitors (cabs, delivery riders, contractors), the guard registers a walk-in entry:'
          ),
          bullet('Select Category: Delivery, Guest, Cab, or Service Contractor.', 'Step 1:'),
          bullet('Enter visitor name (e.g. "Ramesh Patel"), phone number, and vehicle registration.', 'Step 2:'),
          bullet('Select destination unit (e.g. Flat 1204).', 'Step 3:'),
          bullet('Tap "Simulate Camera Capture" to snap a facial photograph.', 'Step 4:'),
          bullet('Tap "Ring Resident Intercom" to dispatch an immediate call to the resident app.', 'Step 5:'),

          getImageRun('09_guard_walkin_checkin.png', 520, 365),
          caption('Guard Tablet Walk-in Visitor Registration and Facial Snapshot Capture'),

          heading2('5.3 Active Occupancy & Crimson Overstay Tracking'),
          p(
            'The "Active & Overstay" tab provides real-time situational awareness of all visitors currently inside the society gates. The system tracks on-premises duration:'
          ),
          bullet('Normal Visits: Displayed in neutral slate with live elapsed timers.', '•'),
          bullet('Crimson Overstay Warning: Any delivery or cab visitor remaining on premises beyond 30 minutes is automatically highlighted with a pulsating crimson alert badge ("OVERSTAY DETECTED").', '•'),
          bullet('Check-Out: The guard clicks "Check-Out" when the visitor exits to log the departure time.', '•'),

          getImageRun('10_guard_active_overstay.png', 520, 365),
          caption('Guard Tablet Active Occupancy Monitoring with Crimson Overstay Alert'),

          heading2('5.4 Parcel Custody Bay & Courier Intake'),
          p(
            'The "Parcels & Deliveries" tab manages packages left at security cabins:'
          ),
          bullet('Select courier provider (Amazon, Flipkart, Swiggy Instamart, Dunzo, BlueDart).', 'Step 1:'),
          bullet('Choose recipient flat (e.g. Flat 1204).', 'Step 2:'),
          bullet('Click "Log Inward Parcel". The system creates an encrypted custody record and generates a 4-digit pickup OTP notified to the resident.', 'Step 3:'),

          getImageRun('11_guard_parcel_bay.png', 520, 365),
          caption('Guard Tablet Parcel Custody Intake and Resident OTP Issuance'),

          heading2('5.5 Offline-First Synchronization & Outbox Queue'),
          p(
            'Guard stations often face intermittent Wi-Fi connectivity. The Guard Tablet includes an offline engine: clicking "Toggle Offline Mode" simulates network loss. During offline mode, guest PINs are verified against local cache and walk-in events are queued in an offline Outbox. Once connectivity is restored, the queue flushes automatically to the cloud.'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // CHAPTER 6
          heading1('Chapter 6: Mobile Native App Experience (Android & iOS PWA)'),
          p(
            'In addition to desktop browsers, CommunityHolder delivers a native mobile app experience on Android and iOS devices using modern Progressive Web App (PWA) standards.'
          ),

          heading2('6.1 Connecting Mobile Phone via Local Wi-Fi (LAN)'),
          p(
            'To test the application on your physical smartphone over local Wi-Fi:'
          ),
          bullet('Connect your smartphone and development computer to the same Wi-Fi SSID.', '1.'),
          bullet('Identify your computer\'s local IP address (e.g. 192.168.68.112).', '2.'),
          bullet('Open Chrome (Android) or Safari (iOS) and navigate to: http://<YOUR_LOCAL_IP>:3000', '3.'),

          heading2('6.2 Installing Standalone PWA on Android & iOS'),
          bullet('Android (Chrome): Tap the three-dot menu (⋮) -> tap "Install App" or "Add to Home Screen" -> Confirm installation. The app installs to your app drawer and opens full-screen.', 'Android:'),
          bullet('iOS (Safari): Tap the Share button (⎙) -> scroll down and tap "Add to Home Screen" (➕) -> Tap "Add". The app icon appears on your iOS home screen and launches borderless with a translucent black status bar.', 'iOS:'),

          heading2('6.3 Mobile Native Viewport Screen Walkthrough'),
          p(
            'On mobile viewports (390 × 844 px), the application automatically adapts to full-screen touch ergonomics with spring physics and tactile feedback:'
          ),

          getImageRun('16_mobile_native_login.png', 280, 580),
          caption('Native Mobile Smartphone Viewport — Strict Phone Login Screen'),

          getImageRun('17_mobile_native_dashboard.png', 280, 580),
          caption('Native Mobile Smartphone Viewport — Approved Resident Super App Dashboard'),

          new Paragraph({ children: [new PageBreak()] }),

          // CHAPTER 7
          heading1('Chapter 7: Operations & Troubleshooting Guide'),
          p(
            'This chapter answers common technical and operational questions encountered during deployment and daily usage:'
          ),

          createTable(
            ['Issue / Question', 'Probable Cause', 'Recommended Resolution'],
            [
              [
                'Mobile phone cannot load http://<IP>:3000',
                'Firewall blocking incoming port 3000 or devices on different Wi-Fi networks',
                'Verify both phone and computer share the same Wi-Fi network. Ensure firewall allows TCP port 3000 and 4000.',
              ],
              [
                'API status displays "Mock Mode"',
                'Backend Express server (port 4000) is stopped',
                'Run "pnpm dev" from the repository root to start both API and Web servers simultaneously with Vite proxy.',
              ],
              [
                'Single-use PIN fails at gate barrier',
                'The PIN has already been used once or expired (24h limit)',
                'Generate a fresh guest pass from the Resident Super App or use Guard Walk-in check-in.',
              ],
              [
                'Resident cannot view gate feeds or pay dues',
                'API Gateway Confinement Guard is active for unverified KYC',
                'Switch to Admin ERP > KYC Review Queue and click "Approve Resident" for the applicant flat.',
              ],
              [
                'Accounting Ledger shows imbalance',
                'Manual database edit or non-atomic direct write',
                'The system enforces debit/credit parity. Settle payments through the ERP controller or VAN webhook to maintain balance.',
              ],
            ],
            [2400, 3100, 3860]
          ),

          new Paragraph({ spacing: { before: 300, after: 100 } }),

          noteBox(
            'Support & Documentation References',
            'For deeper architectural and technical details, please refer to the accompanying engineering documents in the repository: PRD.md (Product Requirements), architecture.md (System Architecture & Supabase Topology), design.md (PostgreSQL DDL & ERD), and TEST_REPORT.md (Quality Assurance & Test Suite Sign-off).'
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_FILE, buffer);
  console.log(`=== user_guide.docx successfully generated! ===`);
  console.log(`File path: ${OUTPUT_FILE}`);
  console.log(`File size: ${(buffer.length / 1024).toFixed(1)} KB`);
}

buildDocx().catch((err) => {
  console.error('Error building docx:', err);
  process.exit(1);
});

