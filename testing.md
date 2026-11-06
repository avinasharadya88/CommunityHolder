# Comprehensive Test Cases & Quality Assurance Specification
## CommunityHolder — High-Assurance Verification Suite across PRD, Architecture, Design, UI & NFRs

---

| **Document Version** | 1.0.0 |
| **Status** | Approved QA Specification |
| **Target Platforms** | Android Mobile, iOS Mobile, Guard Tablet, Web Admin ERP |
| **Test Focus** | Happy Paths, Boundary Values, High-Concurrency Race Conditions, Adversarial Scenarios, Offline Droop, and NFR Verification |

---

## 1. Test Strategy & Execution Framework

### 1.1 Test Pyramid & Tooling Stack
CommunityHolder enforces a strict multi-tier testing strategy designed to break unverified code paths prior to production releases:

```
                  / \
                 /   \       End-to-End & UAT (Playwright, Patrol, Maestro)
                / E2E \      - User Journeys: Onboarding, Gate Intercom, Billing, SOS
               /-------\
              /  INTG   \    Integration & Contract Tests (Supertest, Pact, Testcontainers)
             /           \   - Multi-Tenant RLS, WebRTC Signaling, S3 Uploads, Bank VAN Webhooks
            /-------------\
           /   UNIT & DDL  \ Unit, Security & DDL Tests (Vitest, Jest, pgTAP)
          /                 \- State Machines, Formulas, JWT Validation, Redis Mutex
         +-------------------+
```

### 1.2 Test Persona & Environment Matrix
To execute these tests, ensure the following test accounts and test harnesses are provisioned in the staging environment:

| Persona ID | Account Role | Verified Society & Unit | Verification State | Key Permissions |
|---|---|---|---|---|
| **USR-OWN-01** | `RESIDENT_OWNER` | Prestige Greenwoods (A-1204) | `APPROVED` | Full Gate Intercom, Dues Payment, Amenity Booking |
| **USR-TEN-01** | `RESIDENT_TENANT`| Prestige Greenwoods (B-302) | `APPROVED` | Full Gate Intercom, Utility Dues, Staff Logs |
| **USR-NEW-01** | `APPLICANT` | Prestige Greenwoods (A-101) | `PENDING_VERIFICATION` | Confinement Mode only ("Application Under Review") |
| **GRD-TAB-01** | `SECURITY_GUARD` | North Gate Tablet #01 | Active Shift | Walk-in Check-in, PIN Scan, Parcel Log |
| **MGR-EST-01** | `ESTATE_MANAGER` | Prestige Greenwoods Estate Office | Certified Staff | Review Queue: Approve/Reject KYC, SLA Escalations |
| **FIN-TRZ-01** | `TREASURER` | Prestige Greenwoods MC | Dual-Signer Auth | General Ledger, Bank Reconciliation, PO Approvals |

---

## 2. Module 1: Global Phone Number OTP & Strict Authentication Tests

### TC-AUTH-001: Standard Indian Mobile Number Login (Happy Flow)
- **Component**: Identity & Auth Service / Mobile App
- **Severity**: Critical (P0)
- **Preconditions**: User has mobile number `+91 98765 43210` with active SMS gateway reception.
- **Step-by-Step Test Steps**:
  1. Launch CommunityHolder Mobile App.
  2. Select Country Code `+91 (India)` from country picker.
  3. Input national number `9876543210` and tap **Get 6-Digit OTP**.
  4. Verify SMS arrival with 6-digit numeric payload within 5 seconds.
  5. Enter the 6 digits into the debossed OTP input wells.
  6. Tap **Verify & Proceed**.
- **Expected Result**: 
  - API returns `200 OK` with session JWT.
  - Redis contains single-use consumed flag.
  - User lands on their assigned dashboard or first-time onboarding screen according to their `kyc_status`.

### TC-AUTH-002: International E.164 Mobile Number Login (Happy Flow)
- **Component**: Identity & Auth Service / Mobile App
- **Severity**: High (P1)
- **Preconditions**: User has US number `+1 415 555 2671` or UAE number `+971 50 123 4567`.
- **Step-by-Step Test Steps**:
  1. Open Country Code selector; search `United States (+1)` or `UAE (+971)`.
  2. Input phone number without leading zeros.
  3. Tap **Get 6-Digit OTP**.
  4. Verify SMS delivery via Tier-1 international routing (Twilio / MessageBird).
  5. Input valid OTP code within 300 seconds.
- **Expected Result**: 
  - Phone is normalized to strict E.164 standard (`+14155552671`).
  - System validates carrier validity via `libphonenumber`.
  - Authentication succeeds and JWT issued.

### TC-AUTH-003: Invalid Mobile Format & Non-Existent Country Code (Adversarial / Corner Case)
- **Component**: Client Form Validation & API Gateway
- **Severity**: High (P1)
- **Test Steps**:
  1. Attempt submitting `+91 12345` (incomplete length).
  2. Attempt submitting `+91 0000000000` (invalid Indian mobile numbering plan).
  3. Attempt submitting `+999 9876543210` (non-existent ITU-T country dial code).
- **Expected Result**: 
  - Client flags error immediately before network dispatch: *"Please enter a valid 10-digit mobile number"*.
  - Direct HTTP request to `/api/v1/auth/request-otp` returns `400 Bad Request` with error code `INVALID_PHONE_E164`. No SMS credits are consumed.

### TC-AUTH-004: Brute-Force OTP Attack & Account Lockout (Edge / Security)
- **Component**: Identity Service / Redis Brute-Force Guard
- **Severity**: Critical (P0)
- **Test Steps**:
  1. Request OTP for phone `+91 98765 00001`. Valid OTP generated is `491823`.
  2. Enter incorrect code `111111` -> Verify error *"Invalid OTP. 4 attempts remaining."*
  3. Enter incorrect code `222222` -> Verify error *"3 attempts remaining."*
  4. Enter incorrect code `333333` -> Verify error *"2 attempts remaining."*
  5. Enter incorrect code `444444` -> Verify error *"1 attempt remaining."*
  6. Enter incorrect code `555555` (5th failure).
  7. Attempt entering the true valid code `491823` on the 6th try.
- **Expected Result**: 
  - On the 5th failure, the API returns `429 Too Many Requests`: *"Account temporarily locked for 30 minutes due to repeated security failures"*.
  - Entering the correct OTP on attempt 6 is strictly rejected. Redis key `lockout:+919876500001` persists with a 1800-second TTL.

### TC-AUTH-005: High-Frequency OTP Request Flooding (Rate-Limiting Edge)
- **Component**: API Gateway / Redis Token Bucket
- **Severity**: High (P1)
- **Test Steps**:
  1. Script 10 rapid concurrent POST requests to `/api/v1/auth/request-otp` for the same phone number within 3 seconds.
- **Expected Result**: 
  - Request 1 succeeds (`200 OK`).
  - Requests 2 and 3 return `429 Rate Limited`: *"Please wait 60 seconds before requesting a new OTP"*.
  - Total OTPs sent via SMS is strictly **1**.

### TC-AUTH-006: Primary SMS Gateway Failure with Automatic WhatsApp Failover (Resiliency Flow)
- **Component**: Notification Gateway / WhatsApp Business API
- **Severity**: High (P1)
- **Preconditions**: Mock primary SMS provider returning HTTP `503 Service Unavailable`.
- **Step-by-Step Test Steps**:
  1. Request OTP from mobile app.
  2. SMS gateway fails or fails to return delivery receipt within 45 seconds.
  3. Client UI automatically enables the **Send via WhatsApp** button.
  4. User taps **Send via WhatsApp**.
- **Expected Result**: 
  - Secondary notification worker routes template message via WhatsApp Business API: *"Your CommunityHolder verification code is 491823. Valid for 5 minutes."*
  - User inputs code and authenticates successfully.

---

## 3. Module 2: First-Time KYC Registration & Manual Admin Verification

### TC-KYC-001: First-Time Owner Registration & Document Submission (Happy Flow)
- **Component**: KYC Onboarding Service / S3 Presigned Vault
- **Severity**: Critical (P0)
- **Preconditions**: User `USR-NEW-01` successfully verifies phone via OTP; `kyc_status` is `UNREGISTERED`.
- **Step-by-Step Test Steps**:
  1. User fills Profile: Name: `Avinash Aradya`, Email: `avinash@example.com`.
  2. Selects Society: `Prestige Greenwoods`, Tower: `Tower Alpha`, Unit: `Flat 1204`.
  3. Selects Relationship: `Owner-Occupant`.
  4. Uploads Government ID: `aadhaar_card.pdf` (2.4 MB).
  5. Uploads Property Title Proof: `sale_deed.pdf` (5.8 MB).
  6. Drags the CRED-style slider: **Slide to Submit for Estate Approval**.
- **Expected Result**: 
  - Client requests presigned URLs; uploads directly to private S3 bucket with KMS encryption.
  - Server validates SHA-256 hashes and creates records in `kyc_documents`.
  - User `kyc_status` transitions to `PENDING_VERIFICATION`.
  - App transitions immediately to the **"Application Under Review"** screen.

### TC-KYC-002: Malicious & Oversized File Injection Attempt (Adversarial / Security)
- **Component**: S3 Presigned URL Engine & Gateway Filter
- **Severity**: Critical (P0)
- **Test Steps**:
  1. Attempt requesting a presigned URL for an executable file `malware.exe` with MIME `application/x-msdownload`.
  2. Attempt requesting presigned URL for a valid PDF exceeding size limit: `oversized_deed.pdf` (25 MB).
  3. Attempt tampering with S3 upload by modifying file content after hash generation.
- **Expected Result**: 
  - Step 1: Rejected with `400 Bad Request (UNSUPPORTED_MIME_TYPE)`.
  - Step 2: Rejected with `400 Bad Request (FILE_SIZE_EXCEEDS_10MB_LIMIT)`.
  - Step 3: S3 rejects upload due to `Content-MD5 / x-amz-checksum-sha256` mismatch.

### TC-KYC-003: Pre-Approval API Gateway Confinement Guard (Strict Security Edge)
- **Component**: API Gateway / Auth Guard Middleware
- **Severity**: Critical (P0)
- **Preconditions**: User has valid JWT token, but `kyc_status == 'PENDING_VERIFICATION'`.
- **Test Steps**:
  1. Extract JWT token for unverified user.
  2. Send direct HTTP request to fetch live gate visitor feed: `GET /api/v1/gate/visitor-sessions`.
  3. Send direct HTTP request to trigger gate barrier: `POST /api/v1/gate/barrier/open`.
  4. Send direct HTTP request to book clubhouse: `POST /api/v1/amenities/bookings`.
  5. Send direct HTTP request to post on community forum: `POST /api/v1/governance/notices`.
- **Expected Result**: 
  - All requests from Step 2 to Step 5 are intercepted by the Gateway and rejected with **`403 Forbidden`**.
  - Error Body:
    ```json
    {
      "error": "ACCESS_CONFINED",
      "code": "KYC_VERIFICATION_PENDING",
      "message": "Your profile is awaiting Estate Manager approval. Community operations remain locked."
    }
    ```

### TC-KYC-004: Estate / Facility Manager Manual Verification & Approval (Happy Flow)
- **Component**: Admin Web Portal / KYC Review Queue
- **Severity**: Critical (P0)
- **Preconditions**: Application `#CH-88219` is in `PENDING_VERIFICATION` state.
- **Step-by-Step Test Steps**:
  1. Estate Manager `MGR-EST-01` logs into Admin Web Portal.
  2. Navigates to **KYC Review Queue**.
  3. Clicks on Application `#CH-88219` (Avinash Aradya, Flat 1204).
  4. Uses the Document Inspector to pan, zoom, and verify Aadhaar and Sale Deed against the Builder Handover Ledger.
  5. Enters internal note: *"Verified matching sale deed and allotment register"*.
  6. Clicks **Verify & Approve Full Access**.
- **Expected Result**: 
  - Database transaction executes atomically:
    - `users.kyc_status` updated to `APPROVED`.
    - `unit_members` updated with `approval_status = 'APPROVED'`, `approved_by = MGR-EST-01`.
    - Virtual Account Number (VAN) `CHOLDRBLR1204` generated.
  - High-priority push notification and SMS sent to resident.
  - Resident app immediately refreshes and unlocks the full **CRED Black Card Resident Dashboard**.

### TC-KYC-005: Application Rejection with Mandatory Reason & Resident Re-upload (Negative Flow)
- **Component**: Admin Web Portal & Resident Mobile App
- **Severity**: High (P1)
- **Test Steps**:
  1. Estate Manager inspects uploaded Sale Deed and notices pages are blurry and illegible.
  2. Clicks **Reject Application**.
  3. Attempts to submit without selecting a reason -> Prevented by UI validation.
  4. Selects rejection category `DOCUMENT_ILLEGIBLE` and inputs note: *"Page 3 of Sale Deed is blurry. Please upload clear scan"*.
  5. Submits rejection.
  6. Open resident mobile app on user device.
- **Expected Result**: 
  - User `kyc_status` updates to `REJECTED`.
  - Resident app transitions from "Under Review" to **"Application Requires Action"** banner showing Estate Manager's exact comment.
  - Resident clicks **Re-upload Documents**, replaces only the defective document, and resubmits.
  - Application re-enters the Estate Manager's queue at status `PENDING_VERIFICATION`.

### TC-KYC-006: Concurrent Claim of Identical Unit by Two Separate Users (Race Condition Edge)
- **Component**: KYC Service / PostgreSQL Unique Constraint
- **Severity**: High (P1)
- **Test Steps**:
  1. User A and User B concurrently submit onboarding applications claiming `Tower Alpha - Flat 1204` as `PRIMARY_OWNER`.
  2. Estate Manager reviews User A first and approves.
  3. Estate Manager opens User B's application.
- **Expected Result**: 
  - On opening User B's application, the system displays a persistent amber warning flag:
    *"CONFLICT: Unit Tower Alpha - Flat 1204 already has an approved Primary Owner (Avinash Aradya). Approving this user will replace or add as Co-owner."*
  - Approving a duplicate without changing role to `CO_OWNER` is blocked by database constraints.

---

## 4. Module 3: Gatekeeper Security & Visitor Management Tests

### TC-GATE-001: Walk-In Visitor Approval with Photo & Push Intercom (Happy Flow)
- **Component**: Gatekeeper Tablet / Resident App / Real-Time WebSocket
- **Severity**: Critical (P0)
- **Step-by-Step Test Steps**:
  1. Delivery executive arrives at North Gate.
  2. Guard enters Flat `A-1204`, selects `Swiggy`, captures visitor photo via tablet camera.
  3. Guard taps **Ring Resident Intercom**.
  4. Observe Resident Phone (`USR-OWN-01`).
  5. Phone rings with full-screen dark luxury intercom overlay displaying Swiggy logo, visitor photo, and resident options.
  6. Resident drags the slider: **Slide to Approve Entry**.
- **Expected Result**: 
  - Approval event reaches server in < 500ms over WebSocket.
  - Guard tablet immediately flashes Neon Mint checkmark with audible tone: *"Entry Permitted by Resident"*.
  - Boom barrier trigger relay activates for 8 seconds.
  - Visitor session transitions to `CHECKED_IN`.

### TC-GATE-002: Pre-Approved 6-Digit Guest PIN Verification (Sub-Second Flow)
- **Component**: Resident App / Gatekeeper App
- **Severity**: Critical (P0)
- **Step-by-Step Test Steps**:
  1. Resident generates Guest Pass in-app for friend `Vikram`; system creates PIN `849201` valid today 4 PM – 10 PM.
  2. Guest arrives at gate at 5:30 PM and shares PIN `849201` with guard.
  3. Guard inputs `849201` into tablet debossed numpad.
- **Expected Result**: 
  - Tablet validates PIN in **< 150ms** against local cache.
  - Screen displays: *"Guest: Vikram Shah -> Flat A-1204. Entry Permitted."*
  - Resident's phone is not disturbed by a ring, but receives an instant silent notification: *"Your guest Vikram has entered the campus."*

### TC-GATE-003: Resident Unresponsive for 30 Seconds with Telephony IVR Fallback (Resiliency Edge)
- **Component**: Gatekeeper Service / Twilio IVR Gateway
- **Severity**: High (P1)
- **Preconditions**: Resident has phone in Do-Not-Disturb or app notifications disabled.
- **Step-by-Step Test Steps**:
  1. Guard submits walk-in visitor for Flat `A-1204`.
  2. Push notification and WebSocket alerts dispatch.
  3. No response received from resident device for 30 seconds.
- **Expected Result**: 
  - At second 31, the server initiates an automated Telephony IVR call to resident's verified phone number.
  - Resident's regular phone rings via cellular network: *"CommunityHolder Security Gate: Swiggy courier is at the gate for Flat A-1204. Press 1 to approve, Press 2 to deny."*
  - Resident presses `1` on cellular keypad.
  - IVR webhook confirms approval to Gatekeeper tablet. Pass is issued.

### TC-GATE-004: Delivery Executive Overstay Alert (Corner / Security)
- **Component**: TimescaleDB / Overstay Worker
- **Severity**: High (P1)
- **Preconditions**: Society setting `overstay_alert_minutes = 30`.
- **Test Steps**:
  1. Courier checks in at 10:00 AM.
  2. System records `checked_in_at = 10:00:00`.
  3. Time advances to 10:31:00 AM without guard logging exit.
- **Expected Result**: 
  - Overstay background cron marks session as `OVERSTAY`.
  - Guard tablet displays high-contrast Amber Card in **Active Campus Visitors**: *"[! OVERSTAY ALERT: Delivery courier in campus for 31 minutes !]"*.
  - Resident receives notification: *"Security Alert: Courier who entered for your flat at 10:00 AM has not exited the gate. Please verify."*

### TC-GATE-005: Pre-Approved PIN Presented Outside Validity Window (Corner Case)
- **Component**: Gatekeeper Service
- **Severity**: Medium (P2)
- **Test Steps**:
  1. Resident generates pass valid today between 10:00 AM and 02:00 PM.
  2. Guest arrives at 02:05 PM (5 minutes past expiration).
  3. Guard enters PIN.
- **Expected Result**: 
  - Tablet displays Amber rejection alert: *"PIN EXPIRED at 02:00 PM. Please initiate fresh walk-in check-in."*
  - Barrier does not open.

### TC-GATE-006: Parcel Custody "Leave at Security Gate" with Pickup OTP (Happy Flow)
- **Component**: Gatekeeper App / Resident App
- **Severity**: High (P1)
- **Step-by-Step Test Steps**:
  1. Delivery courier arrives; resident taps **Leave at Security Gate**.
  2. Guard selects Flat `A-1204`, snaps photo of parcel barcode, and deposits box in North Gate storage rack.
  3. Resident app receives notification with pickup OTP `7732`.
  4. In the evening, resident's domestic maid visits security gate to collect parcel.
  5. Maid tells guard OTP `7732`.
  6. Guard enters OTP on tablet.
- **Expected Result**: 
  - Tablet matches OTP, marks parcel `COLLECTED`, logs timestamp and guard ID.
  - Resident receives instant delivery closure confirmation.

### TC-GATE-007: Cryptographic Guard Patrol Checkpoint Tampering (Adversarial Edge)
- **Component**: Gatekeeper Patrol Engine
- **Severity**: Medium (P2)
- **Test Steps**:
  1. Guard attempts scanning a printed paper copy of a patrol NFC tag UID.
  2. Guard alters device system clock by +2 hours to simulate completing a late-night patrol route.
  3. Submits patrol batch.
- **Expected Result**: 
  - System verifies NFC cryptographic signature from hardware tag (cannot be spoofed with paper QR).
  - Server detects clock skew (> 30s delta against NTP server); rejects patrol log and flags an administrative anomaly report.

---

## 5. Module 4: Real-Time WebRTC Intercom & Audio Mesh Tests

### TC-RTC-001: WebRTC Two-Way Audio Intercom Connection (Happy Flow)
- **Component**: WebRTC Signaling Server / Resident App / Guard Tablet
- **Severity**: Critical (P0)
- **Step-by-Step Test Steps**:
  1. Guard initiates audio call from tablet.
  2. Resident accepts call.
  3. Both devices establish WebRTC peer connection through STUN/TURN servers.
- **Expected Result**: 
  - ICE connection state transitions to `CONNECTED` in **< 600 ms**.
  - Audio streams bidirectional with Opus codec, round-trip audio latency **< 120 ms**.
  - Resident can speak with visitor, then tap **Slide to Let In** without terminating audio stream abruptly.

### TC-RTC-002: Network Handover Mid-Intercom Call (Wi-Fi to 5G Edge)
- **Component**: WebRTC Client / ICE Restart Engine
- **Severity**: High (P1)
- **Test Steps**:
  1. Resident establishes active gate audio call on home Wi-Fi.
  2. While audio is streaming, turn off Wi-Fi on resident device, forcing immediate handover to 5G cellular.
- **Expected Result**: 
  - WebRTC client executes seamless **ICE Restart**.
  - Audio resumes within 400 ms without dropping the call session or forcing the guard to redial.

---

## 6. Module 5: Offline-First Guard Synchronization Tests

### TC-OFFLINE-001: Offline Pre-Approved PIN Validation (Broadband Outage Flow)
- **Component**: Guard Tablet / Local SQLite (Drift)
- **Severity**: Critical (P0)
- **Preconditions**: Disconnect Wi-Fi and Cellular data on Guard Tablet.
- **Step-by-Step Test Steps**:
  1. Tablet indicator turns amber: `OFFLINE MODE (LOCAL ENGINE ACTIVE)`.
  2. Guest presents 6-digit PIN `849201` generated earlier that morning.
  3. Guard enters PIN.
- **Expected Result**: 
  - PIN resolves successfully against local encrypted SQLite table in **< 50 ms**.
  - Tablet issues entry pass and triggers boom barrier relay locally.
  - Event stored in local `OutboxQueue` table with UUID `evt_99182`.

### TC-OFFLINE-002: Reconnection Batch Sync & Outbox Flushing (Happy Flow)
- **Component**: Sync Worker / Ingestion API
- **Severity**: Critical (P0)
- **Preconditions**: Tablet operated offline for 2 hours, accumulating 75 walk-in logs and 40 staff entries in local SQLite outbox.
- **Step-by-Step Test Steps**:
  1. Re-enable Wi-Fi on guard tablet.
  2. Observe background sync worker.
- **Expected Result**: 
  - Sync worker dispatches `POST /api/v1/gate/sync-batch` with 115 queued events in chunks of 50.
  - Server confirms ingestion with `200 OK`.
  - Tablet marks outbox records as `SYNCED`.
  - Zero duplicate records created in server database.

### TC-OFFLINE-003: Resident Revokes Pass on Cloud while Guard is Offline (Conflict Resolution Edge)
- **Component**: Conflict Resolution Engine
- **Severity**: High (P1)
- **Test Steps**:
  1. Resident creates PIN `112233`; PIN syncs to guard tablet at 09:00 AM.
  2. Guard tablet goes offline at 10:00 AM.
  3. Resident revokes PIN `112233` on cloud at 10:15 AM due to security concerns.
  4. Visitor presents PIN `112233` at 10:20 AM to offline guard tablet.
  5. Tablet permits entry based on stale local cache.
  6. Tablet reconnects to network at 10:30 AM and flushes sync batch.
- **Expected Result**: 
  - Server detects revocation conflict (`SERVER_REVOCATION_SUPERSEDES_CLIENT`).
  - Server accepts the entry log as a historical security breach event, marks it `INVALID_ENTRY_PERMITTED_OFFLINE`, and immediately broadcasts an urgent security alert to the Estate Manager and Resident:
    *"CRITICAL: Pass 112233 was used while gate was offline after being revoked. Please inspect Unit A-1204."*

---

## 7. Module 6: Society ERP, Billing & Double-Entry Accounting Tests

### TC-ERP-001: Automated Maintenance Invoice Generation & UPI Settlement (Happy Flow)
- **Component**: ERP Invoicing Engine / Payment Gateway Webhook
- **Severity**: Critical (P0)
- **Preconditions**: Society has 500 units; monthly billing scheduled for 1st of month.
- **Step-by-Step Test Steps**:
  1. Automated billing cron triggers at `00:01 AM, 1st November`.
  2. Inspect Flat `A-1204` (Super built-up area: 1,500 sq.ft @ $0.08 / sq.ft = $120.00).
  3. Resident receives push notification with PDF bill copy.
  4. Resident opens app, views CRED Black Card, and drags slider: **Slide to Pay Maintenance $120.00**.
  5. Completes UPI payment.
  6. Webhook arrives at `/api/v1/payments/webhook`.
- **Expected Result**: 
  - Invoice status updates from `ISSUED` to `PAID`.
  - Automated digital receipt with GST breakdown generated.
  - Immutable General Ledger entries created atomically:
    - `Debit: 1010-Bank HDFC ($120.00)`
    - `Credit: 4010-Maintenance Income ($120.00)`
  - Total Debits equal Total Credits.

### TC-ERP-002: Direct NEFT/RTGS Bank Transfer via Virtual Account Number - VAN (Happy Flow)
- **Component**: Banking Integration / VAN Reconciliation Worker
- **Severity**: Critical (P0)
- **Preconditions**: Flat `A-1204` allocated VAN `CHOLDRBLR1204`. Invoice due: $120.00.
- **Step-by-Step Test Steps**:
  1. Resident transfers $120.00 via net banking from external bank account to virtual account `CHOLDRBLR1204`.
  2. Partner bank (HDFC/ICICI) sends credit webhook to `/api/v1/webhooks/banking/van`.
- **Expected Result**: 
  - Webhook parser extracts suffix `BLR1204`, identifying Flat `A-1204`.
  - Invoice automatically marked `PAID`.
  - Payment reconciled with zero manual intervention by society accountant.
  - Resident receives push receipt within 3 seconds of bank webhook.

### TC-ERP-003: Double-Payment Race Condition via Gateway and Bank VAN (Edge Case)
- **Component**: Payment Reconciliation Engine / Distributed Mutex
- **Severity**: Critical (P0)
- **Test Steps**:
  1. Resident initiates UPI payment for $120.00 on their phone.
  2. Simultaneously, resident's spouse initiates NEFT bank transfer for $120.00 using the flat's VAN.
  3. Both webhook payloads hit the server within 200 ms of each other.
- **Expected Result**: 
  - First transaction settles the invoice to `PAID`.
  - Second transaction attempts settling already-paid invoice; Redis distributed lock routes excess payment to the flat's **Prepaid Advance Wallet Balance**.
  - Flat ledger shows: Invoice paid ($120.00), Advance credit balance ($120.00) automatically offset against next month's bill.
  - No money is lost or unaccounted in ledger.

### TC-ERP-004: General Ledger Mathematical Invariant Zero-Check (Integrity Edge)
- **Component**: PostgreSQL Financial Constraints
- **Severity**: Critical (P0)
- **Test Steps**:
  1. Execute a mock transaction attempt where debits ($100.00) do not equal credits ($90.00).
- **Expected Result**: 
  - Database trigger / constraint rejects transaction with `23514 check_violation`: *"General Ledger transaction lines must balance: Total Debits must equal Total Credits"*.
  - No orphaned ledger rows created.

---

## 8. Module 7: Amenities, Helpdesk & Concurrency Tests

### TC-AMEN-001: Concurrent Double-Booking Race Condition for Tennis Court (Concurrency Stress)
- **Component**: Amenity Booking Service / Redis Redlock
- **Severity**: Critical (P0)
- **Preconditions**: Tennis Court Slot `Saturday 06:00 PM – 07:00 PM` is vacant.
- **Test Steps**:
  1. Write an automated script firing two concurrent requests from Resident A and Resident B for the exact same slot at timestamp `T0`.
- **Expected Result**: 
  - Resident A acquires Redis Redlock mutex `amenity:tennis_01:slot:20261107_1800`.
  - Resident A's booking is confirmed (`201 Created`).
  - Resident B's request receives `409 Conflict`: *"This amenity slot was just reserved by another resident. Please select an alternate slot."*
  - Database composite constraint `UNIQUE(amenity_id, booking_start)` guarantees zero double-bookings.

### TC-HELP-001: Helpdesk Ticket Creation with Multi-Media & Automated SLA Escalation (Happy & Escalation Flow)
- **Component**: Helpdesk Service / Escalation Cron
- **Severity**: High (P1)
- **Step-by-Step Test Steps**:
  1. Resident files ticket: Category: `LIFT_MAINTENANCE`, Scope: `COMMON_AREA`, Description: *"Tower Alpha Passenger Lift #2 making loud grinding noise"*, attaches 10-second video.
  2. Ticket auto-assigns to Lift Contractor with SLA deadline set to 4 hours.
  3. Contractor does not acknowledge ticket within 4 hours.
  4. At Hour 4 + 1 min, background worker checks unacknowledged tickets.
  5. Advance time to 24 hours without resolution.
- **Expected Result**: 
  - At Hour 4: Ticket status escalates to `ESCALATED_L1`; urgent SMS sent to Estate Manager.
  - At Hour 24: Ticket status escalates to `ESCALATED_L2`; high-priority email and dashboard notification sent to Society Secretary and MC President.

---

## 9. Module 8: CRED-Inspired UI/UX & Tactile Interaction Tests

### TC-UI-001: CRED Slider Elastic Snapback at 84% Drag (Physics Boundary Test)
- **Component**: Flutter Custom Slider Widget / React Touch Handler
- **Severity**: High (P1)
- **Step-by-Step Test Steps**:
  1. Open Resident App with incoming visitor gate request.
  2. Place finger on Neon Mint knob of **Slide to Approve Entry** slider.
  3. Drag knob horizontally across track to exactly **84% of total track width**.
  4. Release finger without crossing the 85% threshold.
- **Expected Result**: 
  - Knob snaps elastically back to the left resting wall with spring curve `cubic-bezier(0.175, 0.885, 0.32, 1.275)` over 380 ms.
  - Gate barrier does **not** trigger.
  - Light haptic snapback tick felt on release.

### TC-UI-002: CRED Slider Threshold Lock & Bloom at 86% Drag (Physics Boundary Test)
- **Component**: Flutter Custom Slider Widget
- **Severity**: High (P1)
- **Step-by-Step Test Steps**:
  1. Drag knob horizontally past the **85% threshold** to 86%.
  2. Release finger.
- **Expected Result**: 
  - Knob magnetically locks to the right edge with a sharp, heavy confirmation haptic buzz.
  - Icon morphs from `>>` to `✓`.
  - Translucent neon mint particle bloom radiates from knob.
  - Approval API dispatches immediately.

### TC-UI-003: Property "Black Card" Gyroscope 3D Parallax Tilt (Motion Test)
- **Component**: Flutter Sensor Bridge (`sensors_plus`)
- **Severity**: Medium (P2)
- **Step-by-Step Test Steps**:
  1. Hold device in portrait orientation displaying the Black Card.
  2. Tilt device 25 degrees along X and Y axes.
- **Expected Result**: 
  - Card applies real-time 3D matrix transformation (`Transform(transform: Matrix4.identity()..setEntry(3, 2, 0.001)..rotateX(pitch)..rotateY(roll))`).
  - Metallic reflection highlight glides across the card surface smoothly at 60 FPS without frame lag.

### TC-UI-004: Outdoor Sunlight Guard Mode with Gloves / Wet Fingers (Physical Ergonomics)
- **Component**: Gatekeeper Tablet UI
- **Severity**: High (P1)
- **Test Steps**:
  1. Place tablet under direct sunlight simulator (15,000 lux).
  2. Operator wears standard security cotton/leather work gloves.
  3. Enter 6-digit PIN on the 64dp numpad.
- **Expected Result**: 
  - High-contrast Neon Mint accents (`#00F5A0`) on deep obsidian (`#07080A`) remain clearly readable.
  - Minimum 64×64dp touch buttons prevent adjacent key misses even with thick duty gloves.

---

## 10. Module 9: Non-Functional & Stress Tests (NFR Verification)

### TC-NFR-SEC-001: Automated Purging of 90-Day-Old Visitor Facial Snapshots (DPDPA Audit)
- **Component**: Cloud Storage Lifecycle Worker / TimescaleDB
- **Severity**: Critical (P0)
- **Preconditions**: Test database seeded with visitor entries:
  - Session A: Created 89 days ago (Photo URL: `s3://.../face_a.jpg`).
  - Session B: Created 91 days ago (Photo URL: `s3://.../face_b.jpg`).
- **Step-by-Step Test Steps**:
  1. Trigger the scheduled automated privacy purge job.
  2. Inspect S3 bucket and database records.
- **Expected Result**: 
  - `face_a.jpg` remains accessible in S3.
  - `face_b.jpg` is permanently purged from S3 bucket.
  - Session B's database row retains visitor name, flat visited, and timestamp, but `photo_url` is updated to `NULL` or `'PURGED_DPDPA_COMPLIANCE'`.

### TC-NFR-SEC-002: Multi-Tenant Row-Level Security Isolation Penetration Test (Security Audit)
- **Component**: PostgreSQL Engine / API Gateway
- **Severity**: Critical (P0)
- **Test Steps**:
  1. Authenticate as Society Admin of Society X (`society_id = X`).
  2. Craft malicious raw SQL injection payload targeting tenant bypass:
     `GET /api/v1/erp/reports/defaulters?society_id=X' OR '1'='1`
  3. Attempt reading invoices belonging to Society Y via direct primary key lookup:
     `GET /api/v1/erp/invoices/{uuid_of_society_Y_invoice}`
- **Expected Result**: 
  - Step 2: Parameterized query prevents SQL injection; returns `400 Bad Request`.
  - Step 3: PostgreSQL RLS policy filters query by `app.current_society_id = X`; returns `404 Not Found` (Society Y's record is completely invisible).

### TC-NFR-PERF-001: Morning Rush Hour Load Spike (15,000 req/s k6 Stress Test)
- **Component**: Kubernetes Ingress / API Gateway / Gate Service
- **Severity**: Critical (P0)
- **Test Steps**:
  1. Launch distributed **k6** load testing cluster across 5 runner nodes.
  2. Simulate 50,000 simulated guard tablets and resident mobile apps.
  3. Ramp traffic from 500 req/s to **15,000 req/s** over a 5-minute ramp-up window simulating the morning 8:00 AM rush.
  4. Sustain load for 20 minutes.
- **Expected Result**: 
  - KEDA autoscaling provisions additional pods within 90 seconds.
  - **Latency SLA**: p50 latency < 150ms; p95 latency < 500ms; p99 latency < 1,200ms.
  - Error rate (HTTP 5xx) remains **< 0.05%**.
  - Database CPU utilization peaks at < 72% with PgBouncer connection queue empty.

### TC-NFR-A11Y-001: WCAG 2.1 Level AA Accessibility Walkthrough (VoiceOver & Contrast)
- **Component**: Mobile & Web Resident Apps
- **Severity**: High (P1)
- **Test Steps**:
  1. Run automated a11y linter (Axe-core on Web, Flutter Accessibility Guidelines analyzer).
  2. Enable Apple VoiceOver on iOS device and Google TalkBack on Android device.
  3. Navigate through the login, OTP entry, visitor approval, and maintenance payment screens with eyes closed relying exclusively on audio screen reading.
- **Expected Result**: 
  - All text elements exhibit contrast ratio **>= 4.5:1** (CRED dark theme achieves 18.2:1).
  - Every icon button announces its function (e.g., *"Emergency SOS, double tap to trigger"*).
  - VoiceOver gestures allow completing visitor approval without visual aids.

---

## 11. Module 10: Adversarial Breaking Tests & Vulnerability Remediations

This module contains adversarial stress tests designed to actively attempt breaking the API, bypassing confinement, corrupting ledgers, or leaking cross-tenant data:

### TC-ADV-001: Zero-Byte & Negative File Size Exploit (Storage Tampering)
- **Attack Vector**: Requesting presigned URLs with `file_size_bytes = 0`, negative values (`-1024`), or non-integer inputs to bypass bucket quota checks.
- **Vulnerability Found**: Server previously checked `!file_size_bytes` which evaluated `0` as falsy but allowed negative numbers.
- **Remediation Applied**: Enforced strict positive integer validation: `typeof file_size_bytes === 'number' && file_size_bytes > 0 && Number.isFinite(file_size_bytes)`.
- **Status**: **PASS (Verified by Vitest `adversarial.test.ts`)**

### TC-ADV-002: Path Traversal Injection in KYC Document Vault
- **Attack Vector**: Submitting malicious `file_url` strings containing `../../../../etc/passwd` or protocol schemes `file:///`.
- **Vulnerability Found**: Application accepted arbitrary strings in `file_url` during KYC submission.
- **Remediation Applied**: Enforced strict path traversal sanitization rejecting `..`, leading slashes `/`, backslashes `\`, and URL protocol prefixes.
- **Status**: **PASS (Verified by Vitest `adversarial.test.ts`)**

### TC-ADV-003: Negative & Non-Finite Payment Amounts in ERP Settlement (Ledger Corruption)
- **Attack Vector**: Sending `amount: -500.0` or `amount: NaN` to `/api/v1/payments/settle` to reverse payments or inflate ledger debits.
- **Vulnerability Found**: Invoicing engine allowed negative addition `invoice.amount_paid += amount`, potentially creating negative dues and corrupted double-entry journal lines.
- **Remediation Applied**: Added positive finite number guard rejecting any non-positive or non-numeric amount with `400 Bad Request (INVALID_PAYMENT_AMOUNT)`.
- **Status**: **PASS (Verified by Vitest `adversarial.test.ts`)**

### TC-ADV-004: Inward Negative Credit Injection in Banking VAN Webhook
- **Attack Vector**: External banking webhook simulation with negative credit amount (`amount: -120.0`).
- **Vulnerability Found**: VAN webhook credited advance balances without checking for positive numbers.
- **Remediation Applied**: Webhook parser rejects non-positive credits before initiating database transaction or ledger posting.
- **Status**: **PASS (Verified by Vitest `adversarial.test.ts`)**

### TC-ADV-005: Pre-Approved PIN Replay & Barrier Double-Entry Attack
- **Attack Vector**: Reusing a 6-digit guest PIN that has already been validated and marked `CHECKED_IN` to gain unauthorized re-entry.
- **Vulnerability Found**: Server re-validated the same PIN on consecutive calls and returned `200 OK`.
- **Remediation Applied**: Enforced single-use validation: if `matchedSession.status === 'CHECKED_IN'`, request is rejected with `400 Bad Request (PIN_ALREADY_USED)`.
- **Status**: **PASS (Verified by Vitest `adversarial.test.ts`)**

### TC-ADV-006: Inverted Amenity Booking Time Range (Chronological Tampering)
- **Attack Vector**: Submitting `booking_end` earlier than `booking_start` (e.g., 07:00 PM to 06:00 PM).
- **Vulnerability Found**: Concurrency lock acquired without chronological timestamp verification.
- **Remediation Applied**: Added interval sanity check: `endDate <= startDate` returns `400 Bad Request (INVALID_BOOKING_INTERVAL)`.
- **Status**: **PASS (Verified by Vitest `adversarial.test.ts`)**

### TC-ADV-007: Cross-Tenant PIN Boundary Infiltration Attack
- **Attack Vector**: Presenting a valid 6-digit PIN created for Society A at the gate barrier of Society B.
- **Vulnerability Found**: Barrier validator matched passcode globally across all societies.
- **Remediation Applied**: Constrained PIN resolution by `society_id`, isolating cross-tenant barrier validation.
- **Status**: **PASS (Verified by Vitest `adversarial.test.ts`)**

---

## 12. Module 11: Backend Database & Supabase PostgreSQL Verification (Project: ggzbyynthvxwkpdbjklf)

This module provides exhaustive test specifications for validating the **Supabase PostgreSQL 16** managed database infrastructure (`ggzbyynthvxwkpdbjklf`). It evaluates database constraints, foreign key cascades, Row-Level Security (RLS) multi-tenant policies, automated trigger functions, ACID transactional integrity, high-concurrency race conditions, and data retention lifecycles.

---

### 12.1 Schema Constraints & Referential Integrity Tests

#### TC-DB-001: Foreign Key Cascade & Deletion Restrict Invariants
- **Component**: PostgreSQL Engine / Foreign Key Constraints
- **Severity**: Critical (P0)
- **Preconditions**: Staging database populated with test societies, blocks, units, and active residents.
- **Corner Cases Evaluated**:
  1. Deletion of a society (`DELETE FROM societies WHERE id = '...'`) cascades cleanly to its child `blocks`, `units`, `accounts`, and `visitor_sessions`.
  2. Deletion of an active unit member with historical paid invoices is restricted (`RESTRICT` / protected) to preserve financial statutory audit compliance for 7 years.
- **Step-by-Step Test Steps**:
  1. Create a dummy test society `soc_test_ephemeral` with 2 blocks, 4 units, and 2 visitor sessions.
  2. Execute `DELETE FROM societies WHERE id = 'soc_test_ephemeral';`.
  3. Query `SELECT COUNT(*) FROM units WHERE society_id = 'soc_test_ephemeral';` and `SELECT COUNT(*) FROM visitor_sessions WHERE society_id = 'soc_test_ephemeral';`.
  4. Attempt deleting a unit referenced by an existing settled invoice: `DELETE FROM units WHERE id = 'unit_alpha_1204';`.
- **Expected Result**:
  - Step 3 returns `0` (clean cascade without orphaned children).
  - Step 4 throws PostgreSQL error `23503 foreign_key_violation` (*"update or delete on table 'units' violates foreign key constraint 'invoices_unit_id_fkey'"*). The invoice and unit remain intact.

#### TC-DB-002: Multi-Column Composite Unique Constraint Enforcement
- **Component**: Table Constraints (`units`, `accounts`, `unit_members`)
- **Severity**: Critical (P0)
- **Corner Cases Evaluated**:
  1. Attempting to insert duplicate unit number within the same block and society (`society_id, block_id, unit_number`).
  2. Inserting same unit number in a *different* block of the same society (permitted).
  3. Assigning the same user twice to the same unit (`unit_id, user_id`).
  4. Multiple primary emergency contacts assigned to a single flat simultaneously.
- **Step-by-Step Test Steps**:
  1. Execute `INSERT INTO units (society_id, block_id, unit_number, super_built_up_area) VALUES ('soc_01', 'blk_alpha', '101', 1200);`.
  2. Execute identical insert with same `(soc_01, blk_alpha, '101')`.
  3. Execute insert with `(soc_01, blk_beta, '101')`.
  4. Execute `INSERT INTO unit_members (unit_id, user_id, member_type) VALUES ('unit_101', 'usr_01', 'TENANT');` twice.
- **Expected Result**:
  - Step 2 fails with `23505 unique_violation` on composite index `units_society_id_block_id_unit_number_key`.
  - Step 3 succeeds (distinct block allows same flat number).
  - Step 4 fails with `23505 unique_violation` on `unit_members_unit_id_user_id_key`.

#### TC-DB-003: Check Constraint Boundary Tests
- **Component**: PostgreSQL Table Check Constraints
- **Severity**: High (P1)
- **Corner Cases Evaluated**:
  1. Financial ledger entries with zero or negative amounts (`amount <= 0`).
  2. Non-numeric / NaN amounts passed via JSON payloads.
  3. Inverted amenity reservation intervals (`booking_end <= booking_start`).
  4. Helpdesk ratings outside allowable 1–5 range (`rating = 0` or `rating = 6`).
  5. Negative carpet area or super built-up area on units.
- **Step-by-Step Test Steps**:
  1. Attempt inserting ledger entry: `INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount) VALUES ('tx_01', 'acc_01', 'DEBIT', 0.00);`.
  2. Attempt inserting ledger entry with `amount = -50.00`.
  3. Attempt inserting amenity booking: `INSERT INTO amenity_bookings (amenity_id, unit_id, user_id, booking_start, booking_end, total_fee, deposit_amount) VALUES ('amen_01', 'unit_01', 'usr_01', '2026-11-10 18:00:00+00', '2026-11-10 17:00:00+00', 50, 0);`.
  4. Attempt inserting helpdesk ticket review: `UPDATE helpdesk_tickets SET rating = 6 WHERE id = 'tick_01';`.
- **Expected Result**:
  - Steps 1 & 2 fail with `23514 check_violation` (*"check constraint 'ledger_entries_amount_check' is violated"*).
  - Step 3 fails with `check_violation` (*"booking_end must be strictly greater than booking_start"*).
  - Step 4 fails with `23514 check_violation` on `helpdesk_tickets_rating_check`.

#### TC-DB-004: CITEXT Case-Insensitive Email & Strict E.164 Phone Normalization
- **Component**: Data Types (`CITEXT`) & International Phone Storage
- **Severity**: Medium (P2)
- **Test Steps**:
  1. Insert user with email `Resident.Owner@Example.COM`.
  2. Attempt inserting second user with email `resident.owner@example.com`.
  3. Insert valid E.164 numbers: `+919876543210` (India), `+14155552671` (US), `+971501234567` (UAE).
  4. Attempt inserting invalid phone: `9876543210` (missing leading `+`), `+91 98765-43210` (unstripped spaces/dashes), `+910987654321` (leading zero).
- **Expected Result**:
  - Step 2 fails with `23505 unique_violation` (CITEXT enforces case-insensitive uniqueness without lowercase indexing functions).
  - Step 3 succeeds for all valid E.164 formats.
  - Step 4 fails regex format constraint `CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$')`.

---

### 12.2 Supabase Row-Level Security (RLS) & Multi-Tenant Isolation Tests

#### TC-DB-005: Cross-Tenant Data Leakage Prevention under RLS
- **Component**: Supabase PostgreSQL RLS Policies (`society_isolation_policy`)
- **Severity**: Critical (P0)
- **Preconditions**:
  - Society A (`Prestige Greenwoods`, id: `soc_prestige_greenwoods`) has 10 units, 45 invoices.
  - Society B (`Sobha Windsor`, id: `soc_sobha_windsor`) has 8 units, 30 invoices.
  - User `usr_resident_a` is an approved resident of Society A.
- **Step-by-Step Test Steps**:
  1. Open authenticated Supabase connection as `usr_resident_a` with JWT:
     ```json
     { "sub": "usr_resident_a", "app_metadata": { "society_id": "soc_prestige_greenwoods" } }
     ```
  2. Execute query: `SELECT * FROM units;`.
  3. Execute explicit cross-tenant query: `SELECT * FROM units WHERE society_id = 'soc_sobha_windsor';`.
  4. Attempt cross-tenant update: `UPDATE units SET occupancy_status = 'VACANT' WHERE society_id = 'soc_sobha_windsor';`.
- **Expected Result**:
  - Step 2 returns ONLY the 10 units belonging to Society A.
  - Step 3 returns `0 rows` (database engine filters out unauthorized tenant rows silently).
  - Step 4 updates `0 rows` with no errors, completely isolated from Society B.

#### TC-DB-006: Resident Unit Data Confinement under RLS
- **Component**: Supabase RLS Policy (`invoices_resident_read`)
- **Severity**: Critical (P0)
- **Preconditions**:
  - User `usr_resident_a` lives in Flat `A-1204` (`unit_alpha_1204`).
  - Peer User `usr_resident_b` lives in Flat `A-1205` (`unit_alpha_1205`).
- **Step-by-Step Test Steps**:
  1. Authenticate as `usr_resident_a`.
  2. Execute query: `SELECT * FROM invoices;`.
  3. Execute targeted probe: `SELECT * FROM invoices WHERE unit_id = 'unit_alpha_1205';`.
  4. Attempt marking peer's invoice as paid: `UPDATE invoices SET status = 'PAID' WHERE unit_id = 'unit_alpha_1205';`.
- **Expected Result**:
  - Step 2 returns only invoices where `unit_id = 'unit_alpha_1204'`.
  - Step 3 returns `0 rows`.
  - Step 4 returns `0 rows updated`. Financial privacy between neighbors is 100% preserved.

#### TC-DB-007: Guard Gate Privilege Scoping under RLS
- **Component**: Supabase RLS Policy (`visitor_sessions_guard_access`)
- **Severity**: High (P1)
- **Preconditions**: User `usr_guard_01` is assigned `SECURITY_GUARD` role at North Gate of Society A.
- **Step-by-Step Test Steps**:
  1. Authenticate as `usr_guard_01`.
  2. Execute: `SELECT * FROM visitor_sessions WHERE society_id = 'soc_prestige_greenwoods';`.
  3. Attempt inserting new visitor session at the gate barrier:
     ```sql
     INSERT INTO visitor_sessions (society_id, unit_id, visitor_name, visitor_type, status)
     VALUES ('soc_prestige_greenwoods', 'unit_alpha_1204', 'Amazon Courier', 'DELIVERY', 'PENDING');
     ```
  4. Attempt reading society general ledger: `SELECT * FROM accounts;` and `SELECT * FROM ledger_transactions;`.
- **Expected Result**:
  - Steps 2 & 3 succeed (Guards have read/write access to visitor passes for their assigned society).
  - Step 4 returns `0 rows` or throws `42501 permission_denied`. Security personnel have zero visibility into society bank accounts, revenue, or dues.

#### TC-DB-008: Unverified Applicant Confinement at DB Level
- **Component**: Supabase RLS Policy on Incomplete KYC
- **Severity**: Critical (P0)
- **Preconditions**: User `usr_applicant_01` has authenticated via phone OTP but `kyc_status` is `PENDING_VERIFICATION`.
- **Step-by-Step Test Steps**:
  1. Authenticate as `usr_applicant_01`.
  2. Attempt querying gate visitors: `SELECT * FROM visitor_sessions;`.
  3. Attempt querying maintenance invoices: `SELECT * FROM invoices;`.
  4. Query own profile and KYC documents: `SELECT * FROM users WHERE id = auth.uid();` and `SELECT * FROM kyc_documents WHERE user_id = auth.uid();`.
- **Expected Result**:
  - Steps 2 & 3 return `0 rows` (strict confinement; operational tables are sealed until approval).
  - Step 4 returns applicant's profile and pending KYC records.

---

### 12.3 Trigger Automation & Function Tests

#### TC-DB-009: Supabase Auth Sync Trigger (`on_auth_user_created` / `handle_new_user()`)
- **Component**: PostgreSQL Trigger Function `public.handle_new_user()`
- **Severity**: Critical (P0)
- **Corner Cases Evaluated**:
  1. Indian mobile phone with `+91` code.
  2. International phone with country code: US (`+1`), UAE (`+971`), UK (`+44`).
  3. Missing optional metadata (full name falls back to `'Resident Applicant'`).
  4. Special characters in applicant name (e.g. `O'Connor`, `Avinash & Aditi`).
- **Step-by-Step Test Steps**:
  1. Insert record into `auth.users`:
     ```sql
     INSERT INTO auth.users (id, phone, raw_user_meta_data)
     VALUES (
         'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
         '+919876543210',
         '{"full_name": "Avinash O''Connor", "country_code": "+91", "national_number": "9876543210"}'::jsonb
     );
     ```
  2. Query `SELECT * FROM public.users WHERE id = 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c';`.
- **Expected Result**:
  - Exactly 1 record created in `public.users`.
  - `phone_e164` = `+919876543210`.
  - `full_name` = `Avinash O'Connor`.
  - `kyc_status` defaults to `UNREGISTERED`.
  - `is_active` defaults to `TRUE`.

#### TC-DB-010: Auth Trigger Conflict Handling & Idempotency
- **Component**: Trigger Function Conflict Resolution (`ON CONFLICT (id) DO UPDATE`)
- **Severity**: High (P1)
- **Test Steps**:
  1. Fire trigger with an existing user ID and updated phone number.
- **Expected Result**:
  - Database executes `DO UPDATE` without throwing duplicate key error.
  - Profile timestamps (`updated_at`) updated; primary key remains stable.

---

### 12.4 ACID Financial Transactions & Concurrency Race Conditions

#### TC-DB-011: Double-Entry General Ledger Zero-Sum Invariant with Mid-Transaction Abort
- **Component**: PostgreSQL Transaction Isolation (Serializable / Read Committed)
- **Severity**: Critical (P0)
- **Corner Cases Evaluated**:
  1. Sum of debits != sum of credits.
  2. Transaction fails midway (e.g., division by zero or constraint check failure on line 3).
- **Step-by-Step Test Steps**:
  1. Open transaction block:
     ```sql
     BEGIN;
     INSERT INTO ledger_transactions (id, society_id, transaction_date, description)
     VALUES ('tx_test_01', 'soc_prestige_greenwoods', CURRENT_DATE, 'Maintenance Bill Settlement');
     
     -- Line 1: Debit Bank $120.00
     INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount)
     VALUES ('tx_test_01', 'acc_bank_hdfc', 'DEBIT', 120.00);
     
     -- Line 2: Credit Maintenance Income $100.00
     INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount)
     VALUES ('tx_test_01', 'acc_maint_income', 'CREDIT', 100.00);
     
     -- Line 3: Erroneous line with negative amount (triggers CHECK constraint violation)
     INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount)
     VALUES ('tx_test_01', 'acc_gst_output', 'CREDIT', -20.00);
     COMMIT;
     ```
  2. Query `SELECT * FROM ledger_transactions WHERE id = 'tx_test_01';` and `SELECT * FROM ledger_entries WHERE transaction_id = 'tx_test_01';`.
- **Expected Result**:
  - Entire transaction aborts and rolls back atomically.
  - Step 2 returns `0 rows` for both header and lines. No partial debit/credit entries exist in the database.

#### TC-DB-012: High-Concurrency Amenity Slot Booking Race Condition
- **Component**: Database Exclusion / Composite Unique Constraint (`amenity_id, booking_start, booking_end`)
- **Severity**: Critical (P0)
- **Preconditions**: Badminton Court Slot `2026-11-15 18:00:00 to 19:00:00` is vacant.
- **Step-by-Step Test Steps**:
  1. Open 10 concurrent database sessions via connection pooler.
  2. All 10 sessions simultaneously execute:
     ```sql
     INSERT INTO amenity_bookings (amenity_id, unit_id, user_id, booking_start, booking_end, total_fee, deposit_amount)
     VALUES ('amen_badminton_01', 'unit_101', 'usr_resident_a', '2026-11-15 18:00:00+00', '2026-11-15 19:00:00+00', 100, 0);
     ```
- **Expected Result**:
  - Exactly 1 session succeeds with `INSERT 0 1`.
  - Remaining 9 sessions fail immediately with `23505 unique_violation`.
  - Database contains exactly 1 booking record; zero double-booking occurrences.

#### TC-DB-013: Virtual Account Number (VAN) Double-Credit Idempotency
- **Component**: Banking Webhook Processor & Idempotency Key Table
- **Severity**: Critical (P0)
- **Preconditions**: Bank sends payment webhook for Bank UTR `HDFCN26310884912`.
- **Step-by-Step Test Steps**:
  1. Inject bank webhook payload with UTR `HDFCN26310884912` for $120.00.
  2. Replay identical webhook payload 150 ms later (simulating network retry from bank).
- **Expected Result**:
  - First request processes receipt and posts ledger entries.
  - Second request triggers unique constraint on `reference_number` or idempotency table; returns HTTP `200 OK` with cached response.
  - Account ledger shows exactly one credit of $120.00.

---

### 12.5 Data Retention & Compliance Testing

#### TC-DB-014: DPDPA 2023 90-Day Visitor Facial Photo Auto-Purge Worker Boundary
- **Component**: Scheduled Retention Purge Worker / Storage Cleaner
- **Severity**: High (P1)
- **Preconditions**:
  - Record A: Visitor session created 91 days ago with `photo_url = 'supabase/storage/v1/visitor-photos/session_91.jpg'`.
  - Record B: Visitor session created 89 days ago with `photo_url = 'supabase/storage/v1/visitor-photos/session_89.jpg'`.
  - Record C: Visitor session created 92 days ago with `photo_url = NULL` (already purged).
- **Step-by-Step Test Steps**:
  1. Trigger purge procedure:
     ```sql
     SELECT public.purge_expired_visitor_photos(90);
     ```
  2. Inspect Record A: Verify `photo_url` is updated to `NULL` and file deleted from `visitor-photos` Supabase storage bucket.
  3. Inspect Record B: Verify `photo_url` is preserved and file remains in storage.
  4. Inspect metadata: Verify visitor arrival timestamp, visitor name, vehicle number, and flat destination remain intact for security logs.
- **Expected Result**:
  - Record A photo is permanently erased in compliance with DPDPA 2023 Section 8.
  - Record B photo remains fully accessible.
  - Zero disruption to society visitor statistics or audit trails.

---

### 12.6 Production-Grade Sample Datasets & Test Fixtures

Below is the comprehensive SQL fixture dataset representing real-world societies, international residents, gate operations, double-entry financial ledgers, and adversarial test inputs.

```sql
-- ============================================================================
-- FIXTURE SET 1: SOCIETIES & PROPERTY HIERARCHY
-- ============================================================================

INSERT INTO societies (id, name, code, address_street, city, state, postal_code, country, van_bank_prefix, settings)
VALUES
(
    'soc_prestige_greenwoods',
    'Prestige Greenwoods',
    'BLR-GRN-01',
    'Outer Ring Road, Bellandur',
    'Bangalore',
    'Karnataka',
    '560103',
    'IN',
    'CHOLDR',
    '{"visitor_photo_required": true, "overstay_alert_minutes": 30, "auto_purge_visitor_days": 90, "late_payment_penalty_rate_annual": 18.0}'
),
(
    'soc_sobha_windsor',
    'Sobha Windsor',
    'BLR-WND-02',
    'ECC Road, Whitefield',
    'Bangalore',
    'Karnataka',
    '560066',
    'IN',
    'SOBHAW',
    '{"visitor_photo_required": true, "overstay_alert_minutes": 45, "auto_purge_visitor_days": 90, "late_payment_penalty_rate_annual": 15.0}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO blocks (id, society_id, name, total_floors)
VALUES
('blk_green_alpha', 'soc_prestige_greenwoods', 'Tower Alpha', 14),
('blk_green_beta',  'soc_prestige_greenwoods', 'Tower Beta',  14),
('blk_wind_elm',    'soc_sobha_windsor',      'Elm Block',   18)
ON CONFLICT (id) DO NOTHING;

INSERT INTO units (id, society_id, block_id, unit_number, super_built_up_area, carpet_area, occupancy_status, virtual_account_number)
VALUES
('unit_alpha_101',  'soc_prestige_greenwoods', 'blk_green_alpha', '101',  1250.00,  980.00, 'OWNER_OCCUPIED',  'CHOLDRBLR101'),
('unit_alpha_1204', 'soc_prestige_greenwoods', 'blk_green_alpha', '1204', 1500.00, 1180.00, 'OWNER_OCCUPIED',  'CHOLDRBLR1204'),
('unit_alpha_1205', 'soc_prestige_greenwoods', 'blk_green_alpha', '1205', 1500.00, 1180.00, 'TENANT_OCCUPIED', 'CHOLDRBLR1205'),
('unit_beta_302',   'soc_prestige_greenwoods', 'blk_green_beta',  '302',  1850.00, 1420.00, 'TENANT_OCCUPIED', 'CHOLDRBLR302'),
('unit_beta_PH1',   'soc_prestige_greenwoods', 'blk_green_beta',  'PH1',  3200.00, 2600.00, 'VACANT',          'CHOLDRBLRPH1'),
('unit_wind_504',   'soc_sobha_windsor',      'blk_wind_elm',    '504',  1400.00, 1100.00, 'OWNER_OCCUPIED',  'SOBHAWBLR504')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FIXTURE SET 2: DIVERSE USERS (DOMESTIC & INTERNATIONAL RESIDENTS)
-- ============================================================================

INSERT INTO users (id, country_code, national_number, phone_e164, email, full_name, kyc_status, is_active)
VALUES
-- Approved Owner (India)
('usr_avinash_owner', '+91', '9876543210', '+919876543210', 'avinash.owner@example.com', 'Avinash Aradya', 'APPROVED', TRUE),
-- Approved Tenant (India)
('usr_rahul_tenant',  '+91', '9123456780', '+919123456780', 'rahul.tenant@example.com',  'Rahul Sharma',  'APPROVED', TRUE),
-- NRI Landlord (United States)
('usr_priya_nri',     '+1',  '4155552671', '+14155552671', 'priya.nri@example.com',     'Priya Nair',    'APPROVED', TRUE),
-- Overseas Investor (UAE)
('usr_tariq_uae',     '+971','501234567',  '+971501234567','tariq.uae@example.com',     'Tariq Al-Mansoor','APPROVED', TRUE),
-- Applicant in Review Queue (India)
('usr_applicant_01',  '+91', '9988776655', '+919988776655', 'applicant1@example.com',   'Aditi Rao',     'PENDING_VERIFICATION', TRUE),
-- Security Guard (India)
('usr_guard_ramesh',  '+91', '9811122233', '+919811122233', 'guard.ramesh@security.org','Ramesh Kumar',  'APPROVED', TRUE),
-- Estate / Facility Manager (India)
('usr_manager_rajesh','+91', '9844455566', '+919844455566', 'estate.manager@prestige.com','Rajesh Hegde','APPROVED', TRUE)
ON CONFLICT (id) DO NOTHING;

-- User Roles
INSERT INTO user_roles (user_id, society_id, role)
VALUES
('usr_avinash_owner',  'soc_prestige_greenwoods', 'RESIDENT_OWNER'),
('usr_rahul_tenant',   'soc_prestige_greenwoods', 'RESIDENT_TENANT'),
('usr_priya_nri',      'soc_prestige_greenwoods', 'RESIDENT_OWNER'),
('usr_guard_ramesh',   'soc_prestige_greenwoods', 'SECURITY_GUARD'),
('usr_manager_rajesh', 'soc_prestige_greenwoods', 'FACILITY_MANAGER')
ON CONFLICT DO NOTHING;

-- Unit Members
INSERT INTO unit_members (unit_id, society_id, user_id, member_type, is_primary_contact, approval_status)
VALUES
('unit_alpha_1204', 'soc_prestige_greenwoods', 'usr_avinash_owner', 'PRIMARY_OWNER', TRUE, 'APPROVED'),
('unit_beta_302',   'soc_prestige_greenwoods', 'usr_rahul_tenant',  'TENANT',        TRUE, 'APPROVED'),
('unit_alpha_1205', 'soc_prestige_greenwoods', 'usr_priya_nri',     'PRIMARY_OWNER', TRUE, 'APPROVED')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FIXTURE SET 3: KYC DOCUMENTS (PENDING & APPROVED)
-- ============================================================================

INSERT INTO kyc_documents (id, user_id, society_id, unit_id, document_category, document_type, document_identifier_masked, file_url, file_sha256, file_size_bytes, mime_type, status, verified_by)
VALUES
(
    'kyc_doc_approved_01',
    'usr_avinash_owner',
    'soc_prestige_greenwoods',
    'unit_alpha_1204',
    'GOVT_ID',
    'AADHAAR',
    'XXXX-XXXX-8821',
    'kyc-documents/usr_avinash_owner/aadhaar_front.pdf',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    1048576,
    'application/pdf',
    'VERIFIED',
    'usr_manager_rajesh'
),
(
    'kyc_doc_pending_02',
    'usr_applicant_01',
    'soc_prestige_greenwoods',
    'unit_alpha_101',
    'PROPERTY_PROOF',
    'SALE_DEED',
    'REG-BLR-2025-9921',
    'kyc-documents/usr_applicant_01/sale_deed.pdf',
    '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    4194304,
    'application/pdf',
    'PENDING',
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FIXTURE SET 4: GATEKEEPER VISITOR SESSIONS & OVERSTAY
-- ============================================================================

INSERT INTO visitor_sessions (id, society_id, unit_id, visitor_type, visitor_name, visitor_phone, delivery_company, passcode, status, is_pre_approved, approved_by_user_id, guard_id, checked_in_at)
VALUES
(
    'vissess_active_guest',
    'soc_prestige_greenwoods',
    'unit_alpha_1204',
    'GUEST',
    'Vikram Seth',
    '+919845012345',
    NULL,
    '491823',
    'CHECKED_IN',
    TRUE,
    'usr_avinash_owner',
    'usr_guard_ramesh',
    NOW() - INTERVAL '15 minutes'
),
(
    'vissess_overstay_delivery',
    'soc_prestige_greenwoods',
    'unit_alpha_1204',
    'DELIVERY',
    'Ramesh (Swiggy)',
    '+919731098765',
    'Swiggy',
    NULL,
    'CHECKED_IN',
    FALSE,
    'usr_avinash_owner',
    'usr_guard_ramesh',
    NOW() - INTERVAL '48 minutes' -- Exceeds 30-min overstay threshold
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FIXTURE SET 5: DOUBLE-ENTRY GENERAL LEDGER & INVOICES
-- ============================================================================

INSERT INTO accounts (id, society_id, account_code, account_name, account_type)
VALUES
('acc_bank_hdfc',    'soc_prestige_greenwoods', '1010', 'HDFC Society Operational Current A/c', 'ASSET'),
('acc_maint_receiv', 'soc_prestige_greenwoods', '1120', 'Maintenance Accounts Receivable',      'ASSET'),
('acc_maint_income', 'soc_prestige_greenwoods', '4010', 'Member Maintenance Charges Income',     'REVENUE'),
('acc_gst_output',   'soc_prestige_greenwoods', '2050', 'GST Output Liability (18%)',            'LIABILITY')
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (id, society_id, unit_id, invoice_number, bill_date, due_date, subtotal_amount, tax_amount, total_amount, amount_paid, status)
VALUES
(
    'inv_nov_alpha_1204',
    'soc_prestige_greenwoods',
    'unit_alpha_1204',
    'INV-202611-A1204',
    '2026-11-01',
    '2026-11-15',
    101.69,
    18.31,
    120.00,
    0.00,
    'ISSUED'
)
ON CONFLICT (id) DO NOTHING;

-- Double-Entry Journal for Invoice Issuance
INSERT INTO ledger_transactions (id, society_id, transaction_date, reference_number, description, posted_by)
VALUES
(
    'tx_journal_inv_1204',
    'soc_prestige_greenwoods',
    '2026-11-01',
    'INV-202611-A1204',
    'Monthly Maintenance Billing - Flat A-1204',
    'usr_manager_rajesh'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, unit_id)
VALUES
-- Debit: Accounts Receivable $120.00
('entry_dr_ar_1204',  'tx_journal_inv_1204', 'acc_maint_receiv', 'DEBIT',  120.00, 'unit_alpha_1204'),
-- Credit: Revenue $101.69
('entry_cr_rev_1204', 'tx_journal_inv_1204', 'acc_maint_income', 'CREDIT', 101.69, 'unit_alpha_1204'),
-- Credit: GST Payable $18.31
('entry_cr_gst_1204', 'tx_journal_inv_1204', 'acc_gst_output',   'CREDIT',  18.31, 'unit_alpha_1204')
ON CONFLICT (id) DO NOTHING;

-- Verification of Zero-Sum Invariant
-- SELECT SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE -amount END) FROM ledger_entries WHERE transaction_id = 'tx_journal_inv_1204';
-- Invariant check must yield exactly 0.00
```

---

## 13. Test Execution Sign-Off Matrix

| Test Suite / Category | Total Test Cases | Automated (CI/CD) | Manual / Hardware Test | Blocking Gate |
|---|---|---|---|---|
| **Module 1: Authentication & OTP** | 6 Cases | 5 Automated | 1 Telephony Gate | PR Merge |
| **Module 2: First-Time KYC Registration**| 6 Cases | 5 Automated | 1 Document Audit | PR Merge |
| **Module 3: Gatekeeper Security Ops** | 7 Cases | 5 Automated | 2 Tablet / Relay | Nightly Staging |
| **Module 4: Real-Time WebRTC Intercom** | 2 Cases | 1 Automated | 1 Audio Lab | Release Candidate |
| **Module 5: Offline Sync Engine** | 3 Cases | 3 Automated | 0 | PR Merge |
| **Module 6: Society ERP Accounting** | 4 Cases | 4 Automated | 0 | PR Merge |
| **Module 7: Amenities & Concurrency** | 2 Cases | 2 Automated | 0 | PR Merge |
| **Module 8: Helpdesk & SLA Escalation** | 2 Cases | 2 Automated | 0 | PR Merge |
| **Module 9: CRED UI & Slide Physics** | 4 Cases | 2 Automated | 2 Haptic / Lux | Release Candidate |
| **Module 10: Adversarial Breaking Tests**| 8 Cases | 8 Automated | 0 | PR Merge |
| **Module 11: Backend Database & Supabase**| 14 Cases | 14 Automated | 0 | PR Merge |
| **Module 12: NFR, Performance & Security**| 4 Cases | 3 Automated | 1 A11y Audit | Pre-Production |
| **TOTAL** | **62 Cases** | **54 Automated (87%)**| **8 Hardware/Audit** | **Zero P0 Defect Policy** |


