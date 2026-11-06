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
   - Multi-Tenant Data Tier (PostgreSQL with Row-Level Security, Redis Cluster, TimescaleDB, Cloudflare R2 / S3 storage).
   - Security, Zero-Trust Privacy, Phone Number Masking, and DPDPA/GDPR compliance.

3. 🎨 **[design.md](file:///Users/avinasharadya88/Documents/CommunityHolder/design.md)** — **System & Technical Design**:
   - Entity-Relationship Diagram (ERD) & production PostgreSQL 16 DDL schemas (including `users`, `otp_verifications`, `kyc_documents`, and `unit_members`).
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
│   │   └── tests/             # 23 Automated Vitest test suites (All passing!)
│   └── web/                   # CRED-Inspired Dark Luxury React 19 Frontend
│       ├── src/
│       │   ├── components/    # CredSlider, BlackCard, InsetWell, GatePulseRadar
│       │   ├── views/         # ResidentView (Mobile), GuardTabletView, AdminErpView
│       │   └── App.tsx        # Top command bar with instant 3-persona switcher
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node.js v26)
- **pnpm**: v9+ (or `npm install -g pnpm`)

### 2. Install Dependencies & Build Packages
```bash
# Install all monorepo dependencies
pnpm install

# Build all packages (@communityholder/shared, @communityholder/api, @communityholder/web)
pnpm build
```

### 3. Run Automated Vitest Test Suite
Execute the 23 automated test suites covering Auth & E.164, KYC Confinement Guard, Gatekeeper & Offline Sync, ERP Double-Entry Balancing, Amenities Redlock Concurrency, and DPDPA 2023 Retention:
```bash
pnpm test
```

### 4. Start Development Servers
```bash
# Option A: Start both API (port 4000) and Web Frontend (port 3000) simultaneously
pnpm dev

# Option B: Run services individually
pnpm dev:api   # API runs at http://localhost:4000
pnpm dev:web   # Web app runs at http://localhost:3000
```

---

## 🧪 Interactive Testing & Persona Verification

When launching `pnpm dev:web`, the application opens with an interactive **CRED Luxury Command Bar** providing an instant switcher across all three core personas:

1. 📱 **Resident Mobile Super App** (Simulated iPhone Frame):
   - **Strict Phone Login**: Enter Indian (`+91`) or international country code (`+1`, `+971`, `+44`) with 6-digit OTP verification.
   - **First-Time KYC**: Test unverified user (`+919988776655`) to view the **Confinement Guard** blocking gate feeds until Estate Manager approval.
   - **CRED 3D Black Card**: Inspect the luxury property card for Flat 1204 with tactile hover tilt and Virtual Account Number.
   - **Slide-to-Pay Dues**: Grab the tactile pill slider and swipe right past 85% to settle maintenance dues.
   - **Live Gate Intercom Radar**: Click *"Simulate Gate Call"* to experience the pulsing concentric radar and slide to approve entry.
   - **Pre-Approved Guest Pass**: Generate instant 6-digit guest PINs and QR codes.

2. 📟 **Guard Tablet (Gatekeeper Console)**:
   - **Tactile PIN Numpad**: Enter 6-digit guest PINs with instant boom barrier lift animation.
   - **Walk-in Check-in**: Log delivery/cab/guest entries with camera photo simulation that immediately rings the resident intercom.
   - **Active Occupancy & Overstay**: Real-time timer flagging delivery overstays exceeding 30 minutes in pulsating crimson.
   - **Parcel Custody Bay**: Log delivery packages with automated 4-digit pickup OTP generation.

3. 🏢 **Admin ERP & Facility Manager Workspace**:
   - **Split-Screen KYC Queue**: Side-by-side verification pane with anti-tamper watermarking overlay.
   - **Approve / Reject Action**: Approve resident access or reject with mandatory remediation reasons.
   - **Double-Entry General Ledger**: Live balance verification (`Total Debits == Total Credits`).
   - **Automated Billing Run**: Issue monthly maintenance invoices calculated by unit square footage.
   - **VAN Banking Webhook**: Simulate real-time RTGS/UPI bank inward credits directly reconciling flat invoices.
   - **DPDPA 2023 Purge Worker**: Trigger statutory 90-day visitor photo purging.

