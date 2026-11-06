# CommunityHolder

> **App for communities like apartments, villas to track security, visitors, finances, and community operations.**  
> *Next-Generation Smart Community, Society ERP & Gate Management Ecosystem*  
> *Target Platforms: Android Mobile, iOS Mobile, and Web (Responsive)*

---

## 📌 Overview

**CommunityHolder** is a comprehensive, enterprise-grade community super-app and housing society ERP reverse-engineered and conceptualized from leading market ecosystems such as **ADDA (ApartmentADDA / ADDA ERP & ADDA Gatekeeper)**. 

It provides an end-to-end digital operating system for modern residential apartments, gated layouts, villas, and housing societies, bridging residents, security personnel, facility managers, and management committees onto a unified platform.

---

## 📚 Project Documentation Suite

The complete product, architectural, and engineering blueprint has been documented in this repository:

1. 📄 **[PRD.md](file:///Users/avinasharadya88/Documents/CommunityHolder/PRD.md)** — **Product Requirements Document**:
   - Product Vision, User Personas (Resident Owners, Tenants, Landlords, Guards, Treasurers, Facility Managers).
   - Functional module breakdowns:
     - **Authentication & Onboarding**: Strict role-based login via mobile phone number with Indian (`+91`) and international country codes, passwordless OTP (SMS & WhatsApp delivery), first-time registration with mandatory Government ID and Property Ownership/Tenancy proof, manual review and approval queue for Society Admin / Estate / Facility Managers, and pre-approval app confinement.
     - **Front-Gate Security (Gatekeeper)**: Walk-in visitor check-in, pre-approved guest PINs/QR, delivery & parcel custody, domestic daily staff tracking, guard patrolling, overstay alerts, emergency panic SOS.
     - **Society ERP & Accounting**: Flexible dues calculation engine (sq.ft, flat, utility meters), automated invoice delivery, multi-channel payment gateway (UPI/Cards), Virtual Account Numbers (VAN) auto-reconciliation, double-entry general ledger, vendor purchase order (PO) workflows.
     - **Resident Experience Super App**: Helpdesk ticketing with SLAs, amenity slot bookings, domestic staff directory & reviews, community notice board, discussions, and polling.
   - Non-functional requirements (NFRs) and phased delivery roadmap.

2. 🏗️ **[architecture.md](file:///Users/avinasharadya88/Documents/CommunityHolder/architecture.md)** — **System Architecture**:
   - High-Level Topology & Edge Routing (Cloudflare CDN/WAF, API Gateway).
   - Strict Role-Based Identity & KYC Pipeline (E.164 normalization, Redis cryptographic OTP store, direct-to-S3 presigned document uploads, KMS encryption, API Gateway confinement guard, and Admin Review Queue).
   - Cross-Platform Frontend Strategy:
     - **Mobile**: Flutter for Android & iOS (Resident App & Gatekeeper Tablet App) with native platform channels (CallKit/PushKit/ConnectionService for VoIP intercom).
     - **Web**: Next.js (React 19 / TypeScript / Tailwind CSS) for Society Admin ERP Portal and Resident Web Portal.
   - Real-Time Intercom & Notification Mesh (WebRTC peer audio/video streaming, WebSocket event bus, VoIP Push, and telephony IVR fallback).
   - Offline-First Guard Synchronization Architecture (Local SQLite with encrypted storage, Outbox event queues, and delta-sync reconciliation).
   - Multi-Tenant Data Tier & Supabase Architecture (Managed PostgreSQL 16 on Supabase project `ggzbyynthvxwkpdbjklf`, Row-Level Security, GoTrue Auth sync, Supabase Storage for encrypted KYC documents, Supavisor connection pooling on port 6543, and Supabase Realtime).
   - Security, Zero-Trust Privacy, Phone Number Masking, and DPDPA/GDPR compliance.

3. 🎨 **[design.md](file:///Users/avinasharadya88/Documents/CommunityHolder/design.md)** — **System & Technical Design**:
   - Entity-Relationship Diagram (ERD) & Supabase PostgreSQL 16 DDL schemas (including `users`, `auth.users` sync triggers, `otp_verifications`, `kyc_documents`, and `unit_members`).
   - Supabase Row-Level Security (RLS) policies for user self-access, guard gate permissions, and multi-tenant society isolation.
   - Supabase Storage bucket configurations (`kyc-documents`, `visitor-photos`, `invoice-assets`) and Realtime publications.
   - Business State Machines (First-Time Registration & KYC Approval, Visitor Pass lifecycle, Maintenance Invoice lifecycle, Helpdesk ticket SLA escalation).
   - REST, WebSocket & Sync API contracts (Phone OTP request/verify, KYC upload presigned URLs, Admin review queue & decision, Gatekeeper check-ins).
   - UI/UX Design System: Color tokens, typography hierarchy, screen layout wireframes for mobile onboarding, resident app, and admin split-screen verification workspace.
   - Edge case analysis and system resiliency matrix.

4. 💎 **[UI_DESIGN.md](file:///Users/avinasharadya88/Documents/CommunityHolder/UI_DESIGN.md)** — **CRED-Inspired UI/UX Design System & Figma Specification**:
   - Dark Luxury Aesthetic: Obsidian surfaces (`#0A0B0E`), soft tactile neumorphism, dual-directional shadow bevels, and vibrant neon accents (Neon Mint `#00F5A0`, Electric Violet `#7C5CFC`, Sunset Amber `#FFB800`, Neon Crimson `#FF3366`).
   - Signature Tactile Components: CRED-style **Slide-to-Approve** and **Slide-to-Pay** pill slider with spring release and haptic feedback, 3D Property **Black Card Carousel**, debossed inset OTP wells, and live gate radar pulse card.
   - Comprehensive Figma Screen Specs: Mobile onboarding, 6-digit OTP verification, first-time KYC document vault, "Application Under Review" confinement screen, resident approved dashboard, incoming gate intercom overlay, ultra-contrast guard tablet, and dual-pane admin KYC review workspace.
   - Design Tokens (DTCG standard) & ready-to-use Flutter / Tailwind CSS code snippets.

5. 🛡️ **[NFR.md](file:///Users/avinasharadya88/Documents/CommunityHolder/NFR.md)** — **Non-Functional Requirements Specification**:
   - **Security and Privacy**: DPDPA 2023 & GDPR compliance, automated 90-day visitor photo purging, phone number masking, AES-256-GCM, AWS KMS envelope encryption for KYC deeds, asymmetric RS256 JWTs, and multi-tenant Row-Level Security (RLS).
   - **Reliability and Availability**: 99.99% gate availability SLA, zero-downtime offline-first guard tablet engine (local SQLite + Outbox queue with delta sync), Multi-AZ Aurora PostgreSQL & Redis failover, circuit breakers.
   - **Scalability and Capacity**: 5,000 societies, 1.5M units, 10M daily gate events, KEDA-driven predictive morning rush autoscaling (15,000 req/s), TimescaleDB hypertables, and PgBouncer connection pooling.
   - **Performance and Speed**: Latency budgets (Pre-approved check-in < 150ms, VoIP intercom ringing < 500ms, WebRTC setup < 600ms, mobile cold start < 900ms, 60 FPS sustained UI rendering, app bundle < 24MB).
   - **Compatibility and Portability**: Android 8.0+, iOS 15.0+, 8-10" guard tablets, evergreen desktop browsers (Chrome, Safari, Firefox, Edge), OCI containerization, and cloud-agnostic Kubernetes deployment.
   - **Usability and Accessibility**: WCAG 2.1 AA compliance (18.2:1 contrast ratio), TalkBack & VoiceOver screen reader integration, 48x48dp touch targets, outdoor sunlight guard mode, and 10 regional/international languages.
   - **Maintainability and Observability**: OpenTelemetry distributed tracing with correlation IDs, Prometheus metric instrumentation, health probes, 85% test coverage gates, and zero-downtime canary deployments.

6. 🧪 **[testing.md](file:///Users/avinasharadya88/Documents/CommunityHolder/testing.md)** — **Comprehensive Test Cases & Quality Assurance Specification**:
   - Multi-tier testing strategy (Unit, Contract, End-to-End, and Hardware/Audit testing).
   - Detailed step-by-step test cases covering Happy Flows, Edge Cases, Boundary Values, and Adversarial Scenarios:
     - **Auth & OTP**: Indian/International E.164, brute-force lockout, rate-limiting, SMS-to-WhatsApp failover.
     - **KYC & Onboarding**: First-time registration, malicious file rejection, API Gateway confinement guard, manual admin verification, and unit conflict handling.
     - **Gatekeeper Security**: Walk-in visitor check-in, sub-second pre-approved PIN validation, telephony IVR fallback, overstay detection, and patrol tag tampering.
     - **WebRTC Intercom**: Two-way audio/video connection and Wi-Fi to 5G network handover.
     - **Offline Sync Engine**: Offline local PIN verification, outbox flushing, and cloud revocation vs offline pass conflict resolution.
     - **ERP & Accounting**: Automated billing, Virtual Account Number (VAN) reconciliation, double-payment race conditions, and general ledger zero-balance invariants.
     - **Amenities & Concurrency**: Redis Redlock tennis court double-booking race condition.
     - **CRED UI Physics**: Slide-to-Approve 84% snapback vs 86% lock, 3D Black Card parallax tilt, and glove-friendly guard UI.
     - **NFR & Security Audits**: DPDPA 90-day photo purge verification, multi-tenant RLS penetration testing, and 15,000 req/s morning rush load test.

---

## 🛠️ Technology Stack Plan

| Component | Technology | Rationale |
|---|---|---|
| **Mobile Apps (Resident & Guard)** | Flutter (Dart) | High-performance 60fps UI on iOS and Android from a single codebase; seamless camera, NFC, Bluetooth, and native VoIP calling bridges |
| **Web Applications (Admin & Resident)** | Next.js (React 19, TypeScript, Tailwind CSS) | High-speed server-side rendering for dense financial grids and responsive administrative controls |
| **Backend API Services** | NestJS (TypeScript) or Go | Enterprise modular architecture, strong type-safety, microservices/modular monolith support |
| **Real-Time & Intercom** | WebSockets (Socket.io) + WebRTC (LiveKit/Pion) | Low-latency audio/video intercom and instant gate push notifications |
| **Primary Database** | PostgreSQL 16 (with Row-Level Security) | ACID compliance for accounting ledgers, multi-tenant isolation, and relational consistency |
| **In-Memory Cache & Distributed Lock** | Redis 7.2 | Redlock distributed mutex to prevent double-booking amenities and duplicate payment processing |
| **Time-Series / Telemetry** | TimescaleDB | High-throughput tracking for guard patrol checkpoints, IoT utility meter readings, and audit trails |
| **Object Storage** | Cloudflare R2 / AWS S3 | Encrypted storage for visitor face snapshots, parcel photos, and PDF invoices |

---

## 💻 Implementation & Codebase Architecture

The application has been implemented as an enterprise-grade monorepo containing the shared schema library, the backend API server, and the interactive CRED-styled web application.

```
CommunityHolder/
├── packages/
│   └── shared/                # Common TypeScript models, DTOs, Enums & Schemas
├── apps/
│   ├── api/                   # High-performance Express & WebSocket API Server
│   │   ├── src/
│   │   │   ├── config.ts
│   │   │   ├── db/            # Atomic In-Memory/SQLite DB with seeded master data
│   │   │   ├── middleware/    # JWT Auth & KYC Confinement Guard
│   │   │   ├── modules/       # Auth, KYC, Gatekeeper, ERP, Amenities controllers
│   │   │   └── server.ts
│   │   └── tests/             # 52 Automated Vitest test suites (All 9 suites passing!)
│   └── web/                   # CRED-Inspired Dark Luxury React 19 Frontend (PWA Ready)
│       ├── src/
│       │   ├── components/    # CredSlider, BlackCard, InsetWell, GatePulseRadar
│       │   ├── views/         # ResidentView (Mobile/PWA), GuardTabletView, AdminErpView
│       │   └── App.tsx        # Top command bar with instant 3-persona switcher
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node.js v20 & v26)
- **pnpm**: v9+ (or install via `npm install -g pnpm`)
- **Modern Web Browser**: Google Chrome, Apple Safari, Microsoft Edge, or Mozilla Firefox
- **Mobile Device (Optional)**: Any Android smartphone (Chrome 90+) or iOS device (Safari 15+) connected to the same Wi-Fi network

### 2. Install Dependencies & Build Monorepo
Clone the repository and build all packages from the root directory:
```bash
# Clone the repository
git clone https://github.com/avinasharadya88/CommunityHolder.git
cd CommunityHolder

# Install dependencies across all packages
pnpm install

# Build shared types, API backend, and Web frontend
pnpm build
```

### 3. Run Automated Vitest Regression Test Suite
Execute the comprehensive 52 automated tests covering Phone Auth & E.164, KYC Confinement Guard, Gatekeeper & Offline Sync, ERP Double-Entry Ledger, Amenities Redlock Concurrency, DPDPA 2023 Data Retention, Adversarial Security Injections, and Supabase PostgreSQL Database integration:
```bash
pnpm test
```
*Expected Result: `9 passed (9)`, `52 passed (52)`, 100% Pass Rate.*

### 4. Start Development Servers
You can start both the backend API and frontend dev server concurrently:
```bash
# Start API (Port 4000) and Web App (Port 3000) simultaneously:
pnpm dev
```
Alternatively, launch services in dedicated terminal tabs:
```bash
pnpm dev:api   # API server bound to http://0.0.0.0:4000
pnpm dev:web   # Web & PWA server bound to http://0.0.0.0:3000 (accessible on LAN)
```

---

## 🔑 Pre-Seeded Test Personas & Credentials

The platform includes pre-seeded master records for immediate testing across all roles. The system automatically populates the required 6-digit OTP in the input field for streamlined demonstration:

| Persona | Phone Number | Unit / Flat | Role & KYC Status | Primary Capabilities & Flow |
|---|---|---|---|---|
| **Resident Owner** | `+91 9876543210` | Flat 1204 (Tower Alpha) | `PRIMARY_OWNER` (Approved) | 3D Black Card, CRED Slide-to-Pay Dues, Gate Intercom Radar, Guest Passes |
| **New Resident Applicant** | `+91 9988776655` | Flat 101 (Tower Alpha) | `PRIMARY_OWNER` (Pending KYC) | First-time registration, Document Vault, Confinement Guard active |
| **Estate / Facility Manager** | `+91 9888877777` | Society Office | `FACILITY_MANAGER` (Approved) | Split-screen KYC queue, Double-entry general ledger, Monthly billing runs |
| **Gate Security Guard** | `+91 9777766666` | Main Security Post | `SECURITY_GUARD` (Approved) | PIN barrier numpad, Walk-in visitor check-in, Overstay tracking, Parcel bay |

---

## 🖥️ Web Application User Guide (Desktop & Admin)

The Web application runs at **`http://localhost:3000`** with the CRED luxury dark aesthetic (`#0B0D10` obsidian surfaces, neon mint `#00F5A0`, and electric gold accents).

### 1. Navigation & Command Bar
Upon opening `http://localhost:3000`, the top sticky command bar provides:
- **API Status Indicator**: Pulsing green dot showing `API Online` (connected to Express + Supabase reverse proxy) or `Mock Mode`.
- **Persona Quick-Switcher**: Instantly toggle between **Resident Mobile**, **Guard Tablet**, and **Admin ERP** without re-authenticating.
- **Testing Guide (`HelpCircle`)**: Click the top-right button to open an interactive overlay detailing step-by-step test verification workflows.

---

### 2. Admin ERP & Facility Manager Workspace
Click the **Admin ERP** button in the top switcher bar to access society administration:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Admin ERP Tabs: [ KYC Review Queue ]  [ General Ledger ]  [ Billing ]  │
└────────────────────────────────────────────────────────────────────────┘
```

#### A. KYC Review Queue & Split-Screen Inspection
1. Navigate to **Admin ERP > KYC Review Queue**.
2. Select any pending application from the left panel (e.g. `Aditi Rao - Flat 101`).
3. **Split-Screen Document Viewer**:
   - The right panel displays the submitted Government ID (Aadhaar/Passport) and Property Ownership Proof (Sale Deed) with an anti-tamper watermark (`CONFIDENTIAL - SOCIETY VERIFICATION ONLY`).
   - Check the unit conflict indicator (flags if another approved resident already claims Flat 101).
4. **Approve Action**: Click **"Approve Resident"** to grant access, create the unit membership record, and release the user from the mobile confinement guard.
5. **Reject Action**: Click **"Reject Application"** to open the remediation modal, select the reason (`DOCUMENT_ILLEGIBLE`, `NAME_MISMATCH`, `INVALID_DEED`, `UNIT_CONFLICT`), add review notes, and notify the resident.

#### B. Double-Entry General Ledger
1. Click the **General Ledger** tab.
2. Review the live trial balance:
   - **Total Debits** vs **Total Credits** balance verification indicator (`In Balance: YES`).
   - Transaction ledger recording account heads (`Accounts Receivable`, `Bank Operating Account`, `Maintenance Income`, `Member Advance Liability`).

#### C. Automated Monthly Billing & VAN Webhook
1. Click the **Billing & VAN** tab.
2. **Monthly Billing Run**:
   - Adjust the rate per square foot (default: `₹0.10 / sq.ft`).
   - Click **"Run Monthly Billing"** to issue maintenance invoices for all units according to their super built-up area.
3. **Virtual Account Number (VAN) Banking Simulation**:
   - Enter a simulated bank transfer amount (e.g. `₹120.00`).
   - Click **"Simulate VAN Webhook Transfer"** to trigger a real-time banking credit webhook that matches the unit's virtual account number, marks the invoice `PAID`, and logs the corresponding ledger entry.

#### D. Statutory DPDPA 2023 Purge Worker
1. Click the **DPDPA Purge** tab.
2. Click **"Run 90-Day Visitor Photo Purge Worker"** to verify statutory compliance by auto-purging visitor camera snapshots older than 90 days while preserving encrypted gate audit timestamps.

---

### 3. Guard Tablet (Gatekeeper Console)
Click the **Guard Tablet** button in the top switcher bar. This view is optimized for high-contrast touch tablets at security boom barriers:

#### A. Tactile PIN Barrier Numpad
1. Click **PIN Validator**.
2. Type a 6-digit guest passcode using the debossed on-screen numeric keypad (or test with pre-approved PIN `849201`).
3. Click **"Verify PIN & Open Barrier"**:
   - Valid PIN: Displays green confirmation, guest name, destination unit, and triggers the boom barrier lift animation.
   - Already-Used / Expired PIN: Displays crimson error warning prohibiting gate entry.

#### B. Walk-in Visitor Check-in
1. Click **Walk-in Check-in**.
2. Select the visitor category: `Delivery`, `Guest`, `Cab`, or `Service`.
3. Enter visitor name (e.g. `Mukesh`), mobile number, vehicle registration number, and destination unit.
4. Tap **"Simulate Camera Capture"** to attach the visitor's face snapshot.
5. Click **"Ring Resident Intercom"**: This instantly pushes an alert to the resident's mobile app with the live radar pulse.

#### C. Active Visitors & Crimson Overstay Alert
1. Click **Active Visitors**.
2. View real-time occupancy counts on the society premises.
3. Observe the overstay monitoring timers: delivery personnel on premises exceeding 30 minutes are flagged in pulsating crimson (`OVERSTAY DETECTED`).
4. Click **"Check-Out"** when a visitor departs to record exit timestamps and close the session.

#### D. Parcel Custody Bay
1. Click **Parcels**.
2. Select the courier company (`Amazon`, `Flipkart`, `Swiggy Instamart`, `BlueDart`) and destination flat.
3. Click **"Log Inward Parcel"**: The system creates an encrypted parcel custody entry and generates a secure 4-digit pickup OTP delivered to the resident.

---

## 📱 Mobile Application User Guide (Android & iOS)

CommunityHolder includes full mobile support, providing a native app experience on Android and iOS through responsive viewports and **Progressive Web App (PWA)** capabilities.

### 1. Connect Mobile Device to Local Machine (LAN)

To access the application directly on your phone:
1. Ensure your mobile phone and development machine are connected to the **same Wi-Fi network**.
2. Find the local IP address of your host machine:
   - **macOS**: Run in terminal:
     ```bash
     ipconfig getifaddr en0   # or en1 for secondary interface
     ```
   - **Linux**: Run `hostname -I | awk '{print $1}'`
   - **Windows**: Run `ipconfig` and find the `IPv4 Address` under Wireless LAN adapter.
   *(Example local IP: `192.168.68.112`)*
3. On your mobile phone, open Chrome (Android) or Safari (iOS) and navigate to:
   ```
   http://<YOUR_LOCAL_IP>:3000
   # Example: http://192.168.68.112:3000
   ```

---

### 2. Install as Standalone App (PWA)

Installing the app to your home screen removes the browser URL bar and enables full-screen native mobile execution:

#### 🤖 Android (Google Chrome)
1. Open `http://<YOUR_LOCAL_IP>:3000` in Google Chrome on Android.
2. Tap the **three vertical dots** (`⋮`) in the top-right corner of Chrome.
3. Tap **"Install App"** (or **"Add to Home Screen"**).
4. Tap **"Install"** on the confirmation prompt.
5. The CommunityHolder app icon will appear on your Home Screen and in your App Drawer.
6. Tap the icon to launch the app in standalone full-screen mode with dark luxury status bars.

#### 🍏 iOS / iPhone / iPad (Apple Safari)
1. Open `http://<YOUR_LOCAL_IP>:3000` in Apple Safari on your iPhone or iPad.
2. Tap the **Share** button (`⎙` / square with an arrow pointing upwards) in the bottom toolbar.
3. Scroll down the share sheet and tap **"Add to Home Screen"** (`➕`).
4. In the top-right corner, tap **"Add"**.
5. The CommunityHolder icon will appear on your iOS home screen.
6. Tap the icon to launch the app in borderless full-screen mode with translucent black status bar styling (`black-translucent`).

---

### 3. Step-by-Step Resident Super App Mobile Workflows

#### Flow A: Mobile Phone Authentication
1. Tap the country code picker to select your region:
   - `🇮🇳 +91` (India)
   - `🇺🇸 +1` (USA / Canada)
   - `🇦🇪 +971` (UAE)
   - `🇬🇧 +44` (United Kingdom)
2. Enter your 10-digit mobile number:
   - To test as **Approved Resident**: Enter `9876543210`
   - To test as **First-Time Registration**: Enter `9988776655`
3. Tap **"Request OTP"**:
   - The system calls the backend OTP generator and automatically populates the 6-digit code in the inset wells for rapid testing.
4. Tap **"Verify & Enter"** to enter the application.

---

#### Flow B: First-Time Resident Onboarding & Confinement Guard
*(Use phone number `+91 9988776655`)*
1. After OTP verification, you are greeted with the **Digital KYC Onboarding Vault**.
2. Fill in the resident application form:
   - **Full Name**: Enter `Aditi Rao`
   - **Flat Number**: Enter `Flat 101`
   - **Occupancy Role**: Select `Primary Owner`, `Co-Owner`, or `Tenant`
   - **Documents**: Default government ID (Aadhaar) and sale deed are attached.
3. Tap **"Submit Registration"**.
4. **Experience the API Gateway Confinement Guard**:
   - The resident dashboard transitions to an amber **"Application Under Review"** status screen.
   - All gate feeds, intercom controls, amenity bookings, and payment APIs remain strictly confined until an Estate Manager reviews the documents.
5. **Approve via Admin**:
   - Switch to **Admin ERP** in your web browser, navigate to the **KYC Review Queue**, select Aditi Rao, and click **"Approve Resident"**.
   - Return to the mobile app or tap refresh: the resident dashboard instantly unlocks all features!

---

#### Flow C: Approved Resident Super App Dashboard
*(Use phone number `+91 9876543210`)*
Once logged in as an approved resident of Flat 1204:

1. **CRED 3D Black Card Carousel**:
   - Touch and tilt the luxury property card for Flat 1204.
   - View your flat's unique Virtual Account Number (`VAN: HDFC0001204`), Super Built-Up Area (`1,500 sq.ft`), and outstanding maintenance balance.
2. **CRED Tactile Slide-to-Pay**:
   - View pending maintenance dues (e.g. `₹120.00`).
   - Touch the glowing mint **"SLIDE TO PAY DUES"** pill slider.
   - Drag the slider thumb to the right: dragging past the 85% threshold locks the slider and executes an instant ledger-balanced payment.
   - A celebratory confirmation banner appears, and the dues status updates to **PAID**.
3. **Live Gate Intercom Radar**:
   - Tap the **"Simulate Gate Call"** button to simulate an incoming visitor or delivery at the security barrier.
   - The screen displays the **Gate Pulse Radar Card** featuring pulsating concentric radar rings, visitor photo, delivery company (`Swiggy Instamart`), vehicle number, and flat destination.
   - Drag the **"SLIDE TO APPROVE"** slider to grant immediate entry, or tap **"Leave at Gate"** if you are away.
4. **Generate Pre-Approved Guest Passes**:
   - Tap **"+ Guest Pass"**.
   - Enter guest name (e.g. `Karan Malhotra`) and category (`Guest`, `Cab`, `Delivery`).
   - Tap **"Generate Pass"**: Receive a secure 6-digit gate PIN (`849201`) and a scannable QR code that your guest can present directly at the security gate.
5. **Parcel Delivery Bay & Pickup OTP**:
   - View parcels held at the security gate under the **Deliveries at Gate** section.
   - Check the courier company and your secure 4-digit pickup OTP (`7821`). Present this code to security guards to retrieve your delivery.

---

## 🔍 Troubleshooting & Network FAQ

| Issue | Cause | Solution |
|---|---|---|
| **Mobile phone cannot open `http://<IP>:3000`** | Devices on different Wi-Fi networks or firewall blocking port | Ensure phone and computer are on the same Wi-Fi SSID. Verify computer firewall allows incoming TCP connections on port 3000 and 4000. |
| **API calls fail or show "Mock Mode" on mobile** | API server not running or proxy not routing | Run `pnpm dev` from the root directory so both API (port 4000) and Web (port 3000) run simultaneously with Vite reverse proxy. |
| **"EPERM 127.0.0.1" during tests on macOS** | macOS sandbox network restrictions during CLI tests | Run tests with network permissions or run `pnpm --filter @communityholder/api test` in terminal. |
| **PWA does not show "Install" banner** | Manifest not detected or non-HTTPS / non-localhost origin | Google Chrome requires either `localhost` or an active LAN IP. Tap Chrome menu (`⋮`) and select "Add to Home Screen" manually. |


