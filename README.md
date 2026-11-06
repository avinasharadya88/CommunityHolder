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

## 🚀 Status & Next Steps

> [!IMPORTANT]
> Per project directives, application implementation will commence once the requirements, architecture, and design specifications are verified and approved.
