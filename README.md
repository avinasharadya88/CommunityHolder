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

7. 📖 **[user_guide.docx](file:///Users/avinasharadya88/Documents/CommunityHolder/user_guide.docx)** — **Comprehensive Multi-Persona Visual User Operations Guide**:
   - Complete operational manual featuring **19 high-resolution application screenshots** covering every individual user persona and workflow.
   - Detailed step-by-step guides for **Resident Owners**, **New KYC Applicants**, **Estate / Facility Managers**, and **Security Guards**.
   - Covers desktop web access, Android Mobile PWA (Chrome), and iOS Mobile PWA (Safari).
   - In-depth operational documentation for live gate intercom radar, CRED Slide-to-Pay mechanics, split-screen KYC watermarking, double-entry general ledger verification, and troubleshooting FAQ.

8. 🗄️ **[DATA_STORAGE_AND_HANDOFFS.md](file:///Users/avinasharadya88/Documents/CommunityHolder/DATA_STORAGE_AND_HANDOFFS.md)** — **Backend Connection, Data Storage & Workflow Handoffs**:
   - End-to-end transparent guide explaining how the React frontend connects to the Express API (Vite reverse proxy, JWT tokens, header injection).
   - Multi-tenant locality architecture enabling apartment selection on login across Mobile, Guard Tablet, and Admin ERP.
   - Dual-layer data tier: Supabase Cloud PostgreSQL 16 (Project `ggzbyynthvxwkpdbjklf`) paired with synchronized in-memory datastores for offline/CI resilience.
   - Exhaustive sequence diagrams and payload specifications for 6 core workflow handoffs (Auth/OTP, KYC Confinement Guard, Gate Intercom Radar, ERP Double-Entry Billing, Banking VAN Webhooks, and DPDPA 90-Day Privacy Purge).

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

## 📖 Detailed Visual User Guide (`user_guide.docx`)

> ### 📘 Complete Multi-Persona User Guide with Screenshots
> For an exhaustive, illustrated operational manual containing **19 high-resolution application screenshots**, please open:  
> 📄 **[`user_guide.docx`](file:///Users/avinasharadya88/Documents/CommunityHolder/user_guide.docx)**
>
> **Document Highlights in `user_guide.docx`:**
> - **Chapter 1**: Platform Architecture, Monorepo Setup & Access Credentials
> - **Chapter 2**: Persona 1 — Resident Owner (Phone Auth, 3D Black Card, CRED Slide-to-Pay, Live Gate Intercom Radar, Guest Pass PIN & QR, Parcel Bay)
> - **Chapter 3**: Persona 2 — New Resident Applicant (KYC Document Vault & API Gateway Confinement Guard)
> - **Chapter 4**: Persona 3 — Estate & Facility Manager (Split-Screen Watermarked KYC Queue, Double-Entry General Ledger, Monthly Billing & VAN Webhook, DPDPA 2023 Purge Worker)
> - **Chapter 5**: Persona 4 — Security Guard (Tactile PIN Barrier Numpad, Walk-in Check-in with Facial Snapshot, Active Overstay Tracking, Parcel Custody Intake)
> - **Chapter 6**: Mobile Native Experience (Wi-Fi LAN setup, Android Chrome PWA installation, iOS Safari PWA installation, native touch viewports)
> - **Chapter 7**: Troubleshooting & Operational FAQ

---

## 🌐 Quick Application Overview & Access Points

The application is accessible across desktop browsers, security tablets, and mobile devices:

| Interface | Access URL | Recommended Form Factor | Primary Persona / Function |
|---|---|---|---|
| **Web Portal** | `http://localhost:3000` | Desktop Browser / Laptop | Top Persona Switcher: Resident Mobile, Guard Tablet, Admin ERP |
| **Mobile PWA** | `http://<YOUR_LOCAL_IP>:3000` | Android (Chrome) / iOS (Safari) | Standalone Resident Super App with touch haptics and spring physics |
| **API Backend** | `http://localhost:4000` | REST & WebSocket Server | Express, Supabase PostgreSQL, Authentication, Realtime Intercom |

### 🖥️ Web Portal Key Capabilities
- **Sticky CRED Command Bar**: Live system health (`API Online`), persona switcher, and interactive test guide modal.
- **Admin ERP**: Side-by-side KYC document inspection with anti-tamper watermark, double-entry general ledger, and automated square-footage billing runs.
- **Guard Tablet**: Touchscreen numpad for instant boom barrier lift, walk-in registration with photo capture, overstay alerts, and parcel custody.

### 📱 Mobile PWA Installation (Android & iOS)
1. **Connect to LAN**: Ensure your smartphone and development machine share the same Wi-Fi network. Find your host IP (macOS: `ipconfig getifaddr en0`, Linux: `hostname -I`).
2. **Android (Chrome)**: Navigate to `http://<YOUR_LOCAL_IP>:3000`, tap `⋮` → **"Install App"** / **"Add to Home Screen"**.
3. **iOS (Safari)**: Navigate to `http://<YOUR_LOCAL_IP>:3000`, tap Share (`⎙`) → **"Add to Home Screen"** (`➕`) → Tap **"Add"**.
4. **Launch**: CommunityHolder opens in full-screen borderless mode with dark luxury status bar styling.

---

## 🔍 Troubleshooting & Network FAQ

| Issue | Cause | Solution |
|---|---|---|
| **Mobile phone cannot open `http://<IP>:3000`** | Devices on different Wi-Fi networks or firewall blocking port | Ensure phone and computer are on the same Wi-Fi SSID. Verify computer firewall allows incoming TCP connections on port 3000 and 4000. |
| **API calls fail or show "Mock Mode" on mobile** | API server not running or proxy not routing | Run `pnpm dev` from the root directory so both API (port 4000) and Web (port 3000) run simultaneously with Vite reverse proxy. |
| **"EPERM 127.0.0.1" during tests on macOS** | macOS sandbox network restrictions during CLI tests | Run tests with network permissions or run `pnpm --filter @communityholder/api test` in terminal. |
| **PWA does not show "Install" banner** | Manifest not detected or non-HTTPS / non-localhost origin | Google Chrome requires either `localhost` or an active LAN IP. Tap Chrome menu (`⋮`) and select "Add to Home Screen" manually. |



