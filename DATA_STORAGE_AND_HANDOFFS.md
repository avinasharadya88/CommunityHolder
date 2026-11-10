# CommunityHolder: Backend Connection, Data Storage & Workflow Handoffs

This document provides a transparent, end-to-end breakdown of how CommunityHolder connects its frontend interfaces to the backend services, how data is organized and stored across the database tiers, and how data handoffs occur across system boundaries.

---

## 1. System Topology & Connection Architecture

The application implements a decoupled, three-tier architecture with a unified RESTful API layer and a dual-layer persistence model.

```mermaid
flowchart TD
    subgraph Clients["1. Frontend Client Layer (React 19 + Tailwind)"]
        ResidentMobile["Resident Mobile Web<br/>(Phone OTP, 3D Black Card, Gate Radar)"]
        GuardTablet["Guard Station Tablet<br/>(PIN Numpad, Walk-ins, Parcels)"]
        AdminErp["Estate Manager ERP<br/>(KYC Queue, Double-Entry Ledger, Billing)"]
    end

    subgraph Network["2. Network & Reverse Proxy Layer"]
        ViteProxy["Vite Dev / Reverse Proxy (:3000)<br/>/api/v1/* -> http://localhost:4000/api/v1/*<br/>/healthz -> http://localhost:4000/healthz"]
    end

    subgraph Gateway["3. Backend API Gateway (Express 4 on :4000)"]
        CorsBody["CORS & Body Parser"]
        Idempotency["Idempotency Guard<br/>(SHA-256 Key Cache)"]
        AuthMiddleware["JWT Auth Middleware<br/>(Bearer Token Verification)"]
        ConfinementGuard["Confinement Guard<br/>(Blocks unverified KYC)"]
        Controllers["Domain Controllers<br/>(Auth, KYC, Gate, ERP, Payments, Webhooks)"]
    end

    subgraph Persistence["4. Dual-Layer Persistence Tier"]
        subgraph SupabaseCloud["Supabase Managed PostgreSQL 16 (Project: ggzbyynthvxwkpdbjklf)"]
            PgTables[("13 Relational Tables<br/>societies, users, units, invoices...")]
            RLS["Row-Level Security (RLS)<br/>Tenant Isolation by society_id"]
            RealtimePub["Supabase Realtime Engine<br/>visitor_sessions, invoices"]
        end
        subgraph LocalSync["In-Memory Synchronized Datastore (inMemoryDb.ts)"]
            MemMaps[("High-Speed Memory Maps<br/>Zero-latency fallback & 52 CI Vitests")]
        end
    end

    ResidentMobile -->|HTTP /api/v1/*| ViteProxy
    GuardTablet -->|HTTP /api/v1/*| ViteProxy
    AdminErp -->|HTTP /api/v1/*| ViteProxy

    ViteProxy -->|Proxies to :4000| CorsBody
    CorsBody --> Idempotency
    Idempotency --> AuthMiddleware
    AuthMiddleware --> ConfinementGuard
    ConfinementGuard --> Controllers

    Controllers -->|When credentials active| PgTables
    Controllers <-->|Continuous sync & fallback| MemMaps
```

### How the Frontend Connects to the Backend
1. **Network Proxy (`apps/web/vite.config.ts`)**:
   - The React frontend runs on port `3000`.
   - All network requests targeting `/api` or `/healthz` are automatically reverse-proxied to `http://localhost:4000` where the Express API is listening.
   - This eliminates browser CORS complications in development and ensures seamless local and containerized operation.

2. **HTTP Client (`apps/web/src/api/client.ts`)**:
   - The singleton `ApiClient` manages sessions via browser `localStorage`:
     - `ch_token`: Signed JWT authentication bearer token.
     - `ch_user`: Current serialized user object including role list and KYC status.
     - `ch_selected_society_id`: Currently active apartment ID (default: `'soc_prestige_greenwoods'`).
     - `ch_selected_society_name`: Display name of the active apartment (default: `'Generic Apartment name'`).
   - Every outgoing request automatically injects:
     ```http
     Authorization: Bearer <ch_token>
     Content-Type: application/json
     ```

---

## 2. Multi-Apartment / Locality Selection Architecture

CommunityHolder supports multi-tenant society isolation. Users can select their apartment/locality across all three platform interfaces:

```mermaid
sequenceDiagram
    autonumber
    actor User as Resident / Guard / Admin
    participant UI as Client View
    participant Storage as LocalStorage
    participant API as /api/v1/societies
    participant Auth as /api/v1/auth/verify-otp

    UI->>API: GET /api/v1/societies
    API-->>UI: Return [Generic Apartment name, Silver Oak Heights, Palm Meadows Residency]
    User->>UI: Selects "Generic Apartment name" (or other society)
    UI->>Storage: setSelectedSociety("soc_prestige_greenwoods", "Generic Apartment name")
    User->>UI: Submits Login / Authentication
    UI->>Auth: POST /api/v1/auth/verify-otp { phone, otp, society_id: "soc_prestige_greenwoods" }
    Auth-->>UI: { access_token, user: { active_society_id: "soc_prestige_greenwoods", ... } }
    UI->>Storage: setSession(token, user)
    UI-->>User: Renders Home Screen branded with selected society name
```

### Supported Default Societies
| Society ID | Display Name | Code | Address Street | Bank Prefix |
| :--- | :--- | :--- | :--- | :--- |
| `soc_prestige_greenwoods` | **Generic Apartment name** | `GEN-APT-01` | Main Central Avenue, Layout #1, Bangalore | `CHOLDR` |
| `soc_silver_oak` | **Silver Oak Heights** | `SLV-OAK-02` | 45 Green Valley Road, Bangalore | `SLVOAK` |
| `soc_palm_meadows` | **Palm Meadows Residency** | `PLM-MDW-03` | 12 Lakeview Boulevard, Bangalore | `PLMMDW` |

---

## 3. Database Schema & Relational Model

The database schema is defined in [`supabase/migrations/20261106_init_communityholder_schema.sql`](file:///Users/avinasharadya88/Documents/CommunityHolder/supabase/migrations/20261106_init_communityholder_schema.sql) and hosted on Supabase Cloud PostgreSQL 16 (Project `ggzbyynthvxwkpdbjklf`).

```mermaid
erDiagram
    societies ||--o{ blocks : contains
    blocks ||--o{ units : contains
    societies ||--o{ units : partitions
    societies ||--o{ user_roles : assigns
    users ||--o{ user_roles : holds
    users ||--o{ unit_members : belongs_to
    units ||--o{ unit_members : houses
    users ||--o{ kyc_documents : submits
    units ||--o{ visitor_sessions : receives
    societies ||--o{ visitor_sessions : monitors
    societies ||--o{ accounts : maintains
    societies ||--o{ invoices : bills
    units ||--o{ invoices : charged_to
    societies ||--o{ ledger_transactions : logs
    ledger_transactions ||--|{ ledger_entries : splits
    accounts ||--o{ ledger_entries : balances
    societies ||--o{ amenities : offers
    amenities ||--o{ amenity_bookings : reserves
```

### Schema Summary
1. **`societies`**: Multi-tenant partitions representing distinct residential complexes. Contains localized settings for overstay thresholds, IVR timeouts, and annual penalty interest.
2. **`blocks` & `units`**: Structural hierarchy. Every unit has a square footage rating (for maintenance calculations) and a unique Virtual Account Number (`virtual_account_number`) for automated bank reconciliation.
3. **`users`**: Master user identity table storing normalized E.164 phone numbers, KYC verification status (`UNREGISTERED`, `PENDING_VERIFICATION`, `APPROVED`, `REJECTED`), and profile metadata.
4. **`user_roles`**: Granular role assignments per society (`RESIDENT_OWNER`, `RESIDENT_TENANT`, `SECURITY_GUARD`, `ESTATE_MANAGER`, `SOCIETY_ADMIN`).
5. **`unit_members`**: Binds a user to a specific unit with occupancy classification (`PRIMARY_OWNER`, `TENANT`, `FAMILY_MEMBER`).
6. **`kyc_documents`**: Stores legal property documents (Aadhaar, Sale Deed, Rental Agreement) with SHA-256 integrity hashes, verification notes, and auditor stamps.
7. **`visitor_sessions`**: Real-time gate passes, photo snapshots, 6-digit barrier passcodes, overstay flags, and check-in/out timestamps.
8. **`accounts`, `invoices`, `ledger_transactions`, `ledger_entries`**: Indian Accounting Standard (Ind AS) compliant double-entry general ledger. Every billing run and payment creates balanced debit and credit entries.
9. **`helpdesk_tickets` & `amenities`**: Operational workflows for maintenance tickets with SLA tracking and clubhouse amenity slot reservations.

---

## 4. End-to-End Workflow Data Handoffs

### Handoff 1: Resident Registration & Confinement Mode Guard
```mermaid
sequenceDiagram
    autonumber
    actor Resident as Unregistered Resident (Aditi)
    participant Web as Web Mobile UI
    participant API as /api/v1/onboarding/kyc/submit
    participant Guard as ConfinementGuard Middleware
    participant Admin as Admin ERP Queue

    Resident->>Web: Selects "Generic Apartment name" & enters phone
    Web->>API: Submits KYC form + Aadhaar & Sale Deed URLs
    API->>API: Creates user with kyc_status = 'PENDING_VERIFICATION'
    API->>API: Inserts kyc_documents records with status = 'PENDING'
    API-->>Web: Returns 201 Created (Token with KYC: PENDING)

    Note over Resident,Web: Confinement Guard Activated
    Resident->>Web: Attempts to access Gate Intercom or Amenities
    Web->>Guard: GET /api/v1/gate/visitor-sessions
    Guard-->>Web: 403 Forbidden { code: 'CONFINEMENT_RESTRICTION', status: 'PENDING_VERIFICATION' }
    Web-->>Resident: Displays "Account Under Review" Confinement Banner

    Note over Admin,API: Admin Approval Handoff
    Admin->>API: GET /api/v1/admin/kyc/queue
    API-->>Admin: Returns Aditi Rao application with document links
    Admin->>API: PATCH /api/v1/admin/kyc/:id/decision { decision: 'APPROVE' }
    API->>API: Updates user.kyc_status = 'APPROVED' and unit_members.approval_status = 'APPROVED'
    API-->>Admin: 200 OK (Resident Approved)
    Resident->>Web: Re-authenticates / Refreshes session
    Web-->>Resident: Full Access Granted (3D Black Card unlocked)
```

### Handoff 2: Gatekeeper Radar Pulse & PIN Barrier Check-in
```mermaid
sequenceDiagram
    autonumber
    actor Guest as Visitor / Delivery Rider
    actor Guard as Security Guard (Ramesh)
    actor Resident as Approved Resident (Avinash)
    participant GuardUI as Guard Station Tablet
    participant ResidentUI as Resident Mobile App
    participant GateAPI as /api/v1/gate/*

    alt Flow A: Pre-Approved Guest PIN Check-In
        Resident->>ResidentUI: Creates Guest Pass for "Priya Sharma"
        ResidentUI->>GateAPI: POST /visitor-sessions { visitor_type: 'GUEST', is_pre_approved: true }
        GateAPI-->>ResidentUI: Generated Passcode: "482910"
        Resident->>Guest: Shares 6-Digit PIN
        Guest->>Guard: Arrives at Boom Barrier, quotes PIN "482910"
        Guard->>GuardUI: Enters PIN on Tactile Numpad
        GuardUI->>GateAPI: POST /gate/validate-pin { passcode: '482910' }
        GateAPI->>GateAPI: Marks session checked_in_at = NOW(), status = 'CHECKED_IN'
        GateAPI-->>GuardUI: 200 OK { access: 'GRANTED', guest_name: 'Priya Sharma' }
        GuardUI-->>Guard: Boom Barrier Opens (Green Glow)
    else Flow B: Walk-In / Delivery with Live Resident Radar Alert
        Guest->>Guard: Delivery Agent arrives without PIN
        Guard->>GuardUI: Fills Walk-In Form (Zomato, Unit 1204, Photo Snapshot)
        GuardUI->>GateAPI: POST /visitor-sessions { is_pre_approved: false, status: 'PENDING' }
        GateAPI-->>ResidentUI: Emits Live Gate Pulse Event (WebSocket / Polling)
        ResidentUI-->>Resident: Triggers Concentric Radar Pulse Ring
        Resident->>ResidentUI: Slides to Approve ("Slide to Grant Access")
        ResidentUI->>GateAPI: PATCH /visitor-sessions/:id/decision { decision: 'APPROVE' }
        GateAPI-->>GuardUI: Barrier Console switches to GRANTED
    end
```

### Handoff 3: Monthly Maintenance Billing & Double-Entry Ledger
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Estate Manager (Rajesh)
    actor Resident as Resident Owner (Avinash)
    participant ErpUI as Admin ERP View
    participant ResidentUI as Resident Mobile View
    participant ErpAPI as /api/v1/erp/*
    participant Ledger as Double-Entry Ledger

    Admin->>ErpUI: Sets billing rate (e.g. ₹0.10/sq.ft) and clicks "Execute Monthly Billing Run"
    ErpUI->>ErpAPI: POST /erp/invoices/generate-monthly { society_id, rate_per_sqft: 0.10 }
    ErpAPI->>ErpAPI: Iterates all occupied units in society
    ErpAPI->>ErpAPI: Generates invoice records (e.g. 1200 sq.ft * 0.10 = ₹120.00)
    ErpAPI->>Ledger: Creates Ledger Transaction (Description: "Monthly Maintenance Assessment")
    ErpAPI->>Ledger: DEBIT: Maintenance Accounts Receivable (Account #1120) [₹120.00]
    ErpAPI->>Ledger: CREDIT: Member Maintenance Charges Income (Account #4010) [₹120.00]
    Note over Ledger: Balanced Check: Total Debits == Total Credits
    ErpAPI-->>ErpUI: Returns Billing Summary (Invoices Issued: 1)

    Resident->>ResidentUI: Opens Resident Mobile, sees ₹120.00 Dues on 3D Black Card
    Resident->>ResidentUI: Slides CRED Tactile Slider ("SLIDE TO PAY DUES")
    ResidentUI->>ErpAPI: POST /payments/settle { invoice_id, amount: 120.00, method: 'CRED_UPI' }
    ErpAPI->>ErpAPI: Updates invoice.amount_paid = 120.00, status = 'PAID'
    ErpAPI->>Ledger: Creates Settlement Transaction ("Dues Payment - CRED UPI")
    ErpAPI->>Ledger: DEBIT: Bank Operational Current A/c (Account #1010) [₹120.00]
    ErpAPI->>Ledger: CREDIT: Maintenance Accounts Receivable (Account #1120) [₹120.00]
    ErpAPI-->>ResidentUI: Payment Confirmed (Receipt Issued, Black Card Dues Cleared)
```

### Handoff 4: Banking VAN (Virtual Account Number) Webhook Ingestion
```mermaid
sequenceDiagram
    autonumber
    participant Bank as Partner Bank (HDFC / ICICI CMS)
    participant Webhook as /api/v1/webhooks/banking/van
    participant Db as CommunityHolder Database
    participant Ledger as General Ledger

    Bank->>Webhook: POST /banking/van { virtual_account: "CHOLDRBLR1204", amount: 120, utr: "CMS1730000000" }
    Webhook->>Db: Validates idempotency key against duplicate processing
    Webhook->>Db: Finds Unit matching virtual_account_number = 'CHOLDRBLR1204' (Unit 1204)
    Webhook->>Db: Locates unpaid invoice for Unit 1204
    Webhook->>Db: Marks invoice status = 'PAID', amount_paid = 120.00
    Webhook->>Ledger: DEBIT: Bank Current A/c (1010) [₹120.00]
    Webhook->>Ledger: CREDIT: Accounts Receivable (1120) [₹120.00]
    Webhook-->>Bank: 200 OK { status: 'RECONCILED', invoice_id: '...' }
```

---

## 5. DPDPA (Digital Personal Data Protection Act) Retention Handoff

In compliance with India's **DPDPA 2023** standards:
- Any visitor photo snapshots, license plate images, or facial captures collected at the guard barrier are stamped with `checked_in_at` and society retention policy (`auto_purge_visitor_days: 90`).
- The scheduled maintenance job calls:
  ```http
  POST /api/v1/admin/maintenance/purge-old-visitor-photos
  ```
- The backend identifies records older than the retention threshold and nullifies `photo_url` (`photo_url = NULL`, `status = 'PURGED'`), preserving the audit session trail while purging personal biometrics.

---

## 6. Supabase Cloud Configuration Guide

| Parameter | Configuration |
| :--- | :--- |
| **Supabase Project** | `ggzbyynthvxwkpdbjklf` |
| **Dashboard URL** | [https://supabase.com/dashboard/project/ggzbyynthvxwkpdbjklf](https://supabase.com/dashboard/project/ggzbyynthvxwkpdbjklf) |
| **REST API Base URL** | `https://ggzbyynthvxwkpdbjklf.supabase.co` |
| **Database Host** | `db.ggzbyynthvxwkpdbjklf.supabase.co` (Port 5432) |
| **Migration Script** | `supabase/migrations/20261106_init_communityholder_schema.sql` |

### Running the Schema Migration in Supabase
1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/ggzbyynthvxwkpdbjklf/sql).
2. Copy the contents of [`supabase/migrations/20261106_init_communityholder_schema.sql`](file:///Users/avinasharadya88/Documents/CommunityHolder/supabase/migrations/20261106_init_communityholder_schema.sql).
3. Click **Run**. This will create all 13 tables, apply RLS policies, enable Realtime streams, and seed the default societies ("Generic Apartment name", "Silver Oak Heights", "Palm Meadows Residency") along with sample blocks, units, users, and ledger accounts.
