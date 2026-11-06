# Non-Functional Requirements (NFR) Specification
## CommunityHolder — Enterprise Engineering, Security, Scalability & Quality Standards

---

| **Document Version** | 1.0.0 |
| **Status** | Approved Engineering Specification |
| **System Scope** | Client Applications (iOS, Android, Tablet, Web), API Gateways, Microservices, Persistence Tier |
| **Compliance Benchmarks** | DPDPA 2023 (India), GDPR (EU), ISO/IEC 27001, SOC 2 Type II, WCAG 2.1 AA |

---

## 1. Security and Privacy

Residential community systems handle high-risk Personal Identifiable Information (PII), domestic movement timestamps, facial biometric photos, property ownership title deeds, and financial transaction records. CommunityHolder enforces a **Defense-in-Depth, Zero-Trust Architecture**.

### 1.1 Data Protection, Privacy & Statutory Compliance (DPDPA 2023 & GDPR)
- **Principle of Data Minimization**: Only information strictly necessary for campus safety or society billing shall be requested or retained.
- **Automated Facial Snapshot Lifecycle**:
  - Facial photos captured at the gate for walk-in visitors must be automatically deleted from cloud object storage after **90 calendar days**.
  - Only anonymized cryptographic access hashes and directional metadata (timestamp, unit visited, vehicle classification) are permanently retained for society security statistics.
- **Phone Number Masking & Proxy Calling**:
  - Raw phone numbers of residents are never revealed to gate guards, delivery couriers, or cab drivers.
  - In-app intercom audio calls route over peer-to-peer encrypted WebRTC. When routing over public telephony (PSTN), virtual masked proxy numbers (via Twilio / Exotel) bridge the call.
  - *Example Masking Policy*:
    ```json
    // Public API response for Security Guard view
    {
      "unit": "Tower A - 1204",
      "resident_display": "Avinash A.",
      "virtual_intercom_channel": "rtc_ch_88219_towerA_1204",
      "phone_masked": "+91 98XXXX XX10"
    }
    ```

### 1.2 Cryptography & Data Protection
- **Data in Transit**:
  - Strict Transport Security (HSTS) with TLS 1.3 enforced on all public and internal service-to-service endpoints.
  - HTTP/1.1 without TLS is rejected at the Cloudflare edge; plain HTTP ports are disabled.
  - Asymmetric mTLS (Mutual TLS) with rotating certificates enforced for inter-service gRPC communication inside the Kubernetes cluster.
- **Data at Rest**:
  - All database tables, tablespaces, and volume snapshots encrypted using **AES-256-GCM**.
  - Sensitive KYC documents (Aadhaar cards, passports, sale deeds) encrypted at rest using envelope encryption backed by **AWS Key Management Service (KMS)** or **HashiCorp Vault** with dedicated customer-managed keys (CMKs) and automatic annual rotation.
- **Cryptographic Watermarking**:
  - When an Estate Manager views an uploaded KYC title deed, the system dynamically watermarks the rendered image with reviewer identity and timestamp:
    `"CONFIDENTIAL — REVIEWED BY ESTATE MGR ID: EMP-402 ON 2026-11-06T10:15:00Z IP: 103.21.12.8"`.

### 1.3 Authentication, Session & Access Security
- **Asymmetric JWT Architecture**:
  - Authentication tokens signed using asymmetric **RS256** (RSA 4096-bit) or **Ed25519**. The public key is exposed via a standard JWKS endpoint (`/.well-known/jwks.json`), enabling instant stateless verification by API gateways.
  - Access Token Expiration: **15 minutes**.
  - Refresh Token Expiration: **30 days** with strict single-use token rotation (detects token reuse and revokes entire token family upon anomaly).
- **OTP Anti-Brute-Force & Rate Limiting**:
  - Max 3 OTP generation requests per phone number within a rolling 10-minute window.
  - OTP validity: Exactly 300 seconds (5 minutes).
  - Max 5 incorrect OTP entry attempts per session. Upon 5 consecutive failures, the phone identifier is locked for 30 minutes, and an IP security alert is logged.
  - OTP values are stored exclusively in Redis as salted cryptographic hashes (`HMAC-SHA256`).

### 1.4 Multi-Tenant Row-Level Security (RLS)
- Cross-tenant data leakage is prevented at the database engine level via PostgreSQL Row-Level Security:
  ```sql
  -- Mandatory enforcement on all transactional tables
  ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE visitor_sessions FORCE ROW LEVEL SECURITY;

  CREATE POLICY tenant_isolation_policy ON visitor_sessions
      AS RESTRICTIVE
      USING (society_id = NULLIF(current_setting('app.current_society_id', true), '')::uuid);
  ```

---

## 2. Reliability and Availability

Gate operations, emergency alarms, and visitor processing cannot fail due to network drops, cloud regional outages, or peak load spikes.

### 2.1 Service Level Agreements (SLA) & Uptime Targets
| System Component | Target Availability | Allowed Monthly Downtime | Disaster Recovery Target (RTO / RPO) |
|---|---|---|---|
| **Gatekeeper Local Tablet Operations** | **99.99%** | < 4.3 minutes | RTO: Instant (Local Engine) / RPO: 0 seconds |
| **Cloud API Gateway & Visitor Services**| **99.95%** | < 21.9 minutes | RTO: < 15 minutes / RPO: < 1 minute |
| **Financial ERP & Accounting Engine**   | **99.90%** | < 43.8 minutes | RTO: < 30 minutes / RPO: 0 seconds (ACID) |
| **Emergency Panic / SOS Alert Pipeline**| **99.99%** | < 4.3 minutes | RTO: < 1 minute / RPO: 0 seconds |

### 2.2 Offline-First Gatekeeper Resiliency
Security gates frequently experience broadband failure or power outages during storms. 
- **Local SQLite Storage**: The Gatekeeper tablet maintains an encrypted local SQLite (Drift) database containing:
  - Full society unit and resident directory.
  - All pre-approved visitor passes and 6-digit OTPs valid for the current calendar date.
  - Registered domestic staff biometric/passcode signatures.
- **Zero-Downtime Offline Check-in**:
  - Pre-approved visitor PINs are validated locally on-device without contacting the cloud server.
  - Walk-in visitor logs, photos, and vehicle numbers are written to an atomic **Local Outbox Queue** on the device filesystem.
- **Bidirectional Delta Synchronization**:
  - As soon as network connectivity is restored (Wi-Fi or cellular 4G/5G failover), the tablet background worker streams pending events via `/api/v1/gate/sync-batch`.
  - Idempotency tokens ensure that retried network packets never duplicate visitor entries or gate passes.

### 2.3 Disaster Recovery & High Availability Topology
- **Multi-Availability Zone (Multi-AZ) Redundancy**:
  - Aurora PostgreSQL operates in a Multi-AZ cluster with synchronous replication to a standby instance and automatic failover in < 30 seconds.
  - Redis clusters deployed in a 3-shard, 6-node configuration with automatic sentinel failover.
- **Circuit Breaker & Fallback Patterns**:
  - External integrations (SMS gateways, payment processors, WhatsApp Business API) wrapped in **Resilience4j / Opossum circuit breakers**.
  - If the primary SMS gateway returns error rates > 5% over 60 seconds, the circuit trips and automatically diverts OTP traffic to WhatsApp and secondary carriers.

---

## 3. Scalability and Capacity

CommunityHolder is engineered to scale across thousands of housing complexes and millions of concurrent resident devices.

### 3.1 Platform Sizing & Capacity Targets
- **Societies Supported**: Up to **5,000 distinct gated communities** on shared cluster infrastructure.
- **Residential Units**: **1,500,000 active flats/villas**.
- **Daily Active Users (DAU)**: **3,000,000 residents and guards**.
- **Gate Events**: **10,000,000 check-ins and pass validations per day**.
- **Concurrent Intercom Calls**: **25,000 simultaneous WebRTC audio sessions**.

### 3.2 Morning Peak Burst Handling
Housing societies exhibit extreme diurnal load spikes:
- **Morning Rush (07:30 AM – 10:00 AM)**:
  - Thousands of domestic staff (maids, cooks, drivers), school buses, and delivery executives arrive simultaneously.
  - Gate transactions surge from a baseline of 200 req/sec to **15,000 req/sec**.
- **Autoscaling Strategy**:
  - Kubernetes Horizontal Pod Autoscaling (HPA) driven by **KEDA (Kubernetes Event-driven Autoscaling)**.
  - Metric triggers include CPU (> 65%), memory (> 70%), and Redis queue backlog depth (> 500 unprocessed events).
  - Pre-scheduled predictive scale-out at 07:15 AM every weekday to pre-warm pod capacity.

```
Traffic Profile (24-Hour Diurnal Gate Ingestion)
Req/s
 15k |               __/\__
 10k |              /      \                  __/\__
  5k |             /        \                /      \
  1k | ___        /          \______________/__     \__________
     +------------------------------------------------------------>
      00:00     08:00 (Staff Rush)       18:00 (Deliveries)   23:59
```

### 3.3 Database Partitioning & Archival
- **TimescaleDB Hypertable Partitioning**:
  - `visitor_sessions` and `gate_telemetry` partitioned chronologically by 30-day chunks.
  - Queries for today's visitors hit only the active in-memory chunk, preventing table scan bloat.
- **Connection Pooling**:
  - Microservices connect through an enterprise **PgBouncer** pool operating in transaction-pooling mode.
  - Max client connections capped at 10,000 with a maximum pool size of 200 dedicated PostgreSQL server backends.

---

## 4. Performance and Speed

Sub-second response times are critical to prevent vehicle congestion at physical society entry gates.

### 4.1 Latency Budgets & Benchmarks

| Transaction / Action | Target Metric (p50) | Target Metric (p95) | Maximum Allowed (p99) |
|---|---|---|---|
| **Pre-Approved Guest Pass Check-in (Local)** | **< 150 ms** | **< 300 ms** | **< 500 ms** |
| **Walk-in Visitor Check-in (Cloud Ingestion)**| **< 400 ms** | **< 800 ms** | **< 1,500 ms** |
| **Guard-to-Resident Intercom Push Ringing**  | **< 500 ms** | **< 900 ms** | **< 1,800 ms** |
| **WebRTC Audio Media Connection Setup**      | **< 600 ms** | **< 1,200 ms**| **< 2,000 ms** |
| **Maintenance Dues Payment Settlement Webhook**| **< 800 ms** | **< 1,500 ms**| **< 3,000 ms** |
| **ERP General Ledger Balance Sheet Query**   | **< 250 ms** | **< 600 ms** | **< 1,200 ms** |
| **Mobile App Cold Startup Time**             | **< 900 ms** | **< 1,400 ms**| **< 2,000 ms** |

### 4.2 Frontend & Mobile Rendering Performance
- **60 FPS Sustained UI Performance**:
  - Flutter mobile app maintains 60 frames per second (16.6 ms per frame budget) across all navigation and scrolling lists.
  - Long lists (e.g., Member Directory, Visitor History) employ virtualized windowing (`ListView.builder`) with lazy image decoding to prevent frame drops.
- **App Binary Size Caps**:
  - Android APK download size: **< 24 MB**.
  - iOS IPA download size: **< 35 MB**.
  - Assets (illustrations, sounds) loaded dynamically or packaged as compressed WebP/SVG.

---

## 5. Compatibility and Portability

CommunityHolder must operate seamlessly across a fragmented ecosystem of low-cost guard tablets, modern iPhones, budget Android smartphones, and diverse web browsers.

### 5.1 Mobile & Tablet Compatibility Matrix

```
+--------------------------------------------------------------------------+
| Client Application Support Matrix                                        |
+--------------------------------------------------------------------------+
| Platform    | Minimum OS Version | Recommended Hardware Specs             |
+-------------+--------------------+---------------------------------------+
| Android     | Android 8.0 (Oreo) | 3 GB RAM, Quad-Core 1.8 GHz, Camera   |
| (Resident)  | API Level 26+      | (Redmi, Samsung Galaxy M, Realme)     |
+-------------+--------------------+---------------------------------------+
| iOS         | iOS 15.0+          | iPhone 8 and newer, A11 Bionic+       |
| (Resident)  |                    | (Supports CallKit & PushKit VoIP)     |
+-------------+--------------------+---------------------------------------+
| Gatekeeper  | Android 9.0+ /     | 8-inch or 10-inch Tablet, 4 GB RAM,   |
| (Guard Tab) | iPadOS 15.0+       | Rugged Casing, Front Camera, 4G LTE   |
|             |                    | (Samsung Tab A8 / Lenovo M10 / iPad)  |
+--------------------------------------------------------------------------+
```

### 5.2 Web Browser Compatibility (Admin & Resident Portals)
- **Supported Browsers**:
  - Google Chrome (Version 100+)
  - Apple Safari (Version 15+)
  - Mozilla Firefox (Version 100+)
  - Microsoft Edge (Version 100+)
- **Responsive Layout Support**:
  - Breakpoints: Mobile (`360px – 767px`), Tablet Portrait (`768px – 1023px`), Desktop/Laptop (`1024px – 1440px`), Ultra-Wide Displays (`1441px – 4K`).

### 5.3 Cloud & Infrastructure Portability
- **Cloud-Agnostic Design**:
  - All microservices containerized as Open Container Initiative (OCI) compliant Docker images.
  - Zero proprietary lock-in: Helm charts deployable to AWS EKS, Google Cloud GKE, Azure AKS, or bare-metal Kubernetes.
  - Infrastructure defined declaratively via **Terraform** modules.

---

## 6. Usability and Accessibility (a11y)

The application serves diverse demographics: from tech-savvy residents to elderly homeowners and non-English-speaking security guards operating under bright sunlight.

### 6.1 Accessibility Standards (WCAG 2.1 Level AA)
- **Contrast Ratios**:
  - High-contrast text: Minimum **4.5:1** contrast ratio against dark backgrounds for normal text, and **7:1** for primary callouts.
  - In the CRED-inspired dark theme, active primary text `#F8FAFC` against `#0A0B0E` delivers a contrast ratio of **18.2:1**, comfortably exceeding WCAG AAA standards.
- **Screen Reader Navigation**:
  - All Flutter widgets and React DOM elements annotated with semantic labels (`Semantics` in Flutter, `aria-label` / `aria-labelledby` on Web).
  - Full compatibility verified with **Apple VoiceOver** (iOS) and **Google TalkBack** (Android).
- **Minimum Tap Target Sizes**:
  - Interactive buttons, slider knobs, and icon taps have a minimum touch boundary of **48 × 48 dp (device independent pixels)** to prevent mis-clicks.

### 6.2 Guard-Optimized Physical Ergonomics
- **Outdoor Sunlight Readability**:
  - Gatekeeper tablet includes an **Ultra-Contrast Guard Mode** with saturated neon green highlights and thick 2.5px borders visible under direct 10,000+ lux daylight.
- **Glove & Wet-Screen Resilience**:
  - Buttons use large, separated card layouts (min 64dp height) so security guards wearing duty gloves can operate numpads without precision errors.

### 6.3 Multilingual & Regional Localization (i18n)
- The app architecture implements dynamic runtime string translation (`flutter_localizations` & `next-intl`):
  - **Tier 1 (Launch Languages)**: English, Hindi (हिंदी), Kannada (ಕನ್ನಡ), Tamil (தமிழ்), Telugu (తెలుగు).
  - **Tier 2 (Expansion Languages)**: Marathi (मराठी), Bengali (বাংলা), Malayalam (മലയാളം), Arabic (العربية), Spanish (Español).
- Number and currency formatters respect local conventions (e.g., Indian numbering system formatting: `₹ 1,20,000` vs International: `$ 120,000`).

---

## 7. Maintainability and Observability

Operating an enterprise community platform requires proactive telemetry, distributed tracing, and zero-downtime deployment capabilities.

### 7.1 Distributed Tracing & Correlation IDs
- Every inbound HTTP request, WebSocket event, and background queue job is stamped with a unique `X-Correlation-ID` (UUIDv4) at the API Gateway.
- Traces are propagated across all downstream microservices via **W3C Trace Context headers** (`traceparent`, `tracestate`) and collected via **OpenTelemetry**.
- *Example Structured Log Event*:
  ```json
  {
    "timestamp": "2026-11-06T10:15:32.402Z",
    "level": "INFO",
    "service": "gate-service",
    "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
    "span_id": "00f067aa0ba902b7",
    "society_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "unit_id": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
    "action": "VISITOR_SESSION_APPROVED",
    "latency_ms": 42.6,
    "environment": "production"
  }
  ```

### 7.2 Metrics, Alerting & Health Probes
- **Prometheus Metric Instrumentation**:
  - `gate_pass_validation_duration_seconds` (Histogram by society and check-in type).
  - `intercom_call_drop_rate_ratio` (Gauge; alerts if drop rate > 2%).
  - `kyc_queue_pending_applications_count` (Gauge; alerts if pending queue > 50 for > 24h).
  - `db_connection_pool_active_ratio` (Gauge; warning threshold at 80%).
- **Standardized Kubernetes Health Probes**:
  - `/healthz/liveness`: Returns `200 OK` if the process loop is responsive.
  - `/healthz/readiness`: Returns `200 OK` only if PostgreSQL and Redis connection pools are healthy.

### 7.3 Code Quality & Automated Testing Gateways
- **Test Coverage Gates (Backpressure Enforcement)**:
  - Unit Test Coverage: Minimum **85%** enforced in CI/CD pipeline before branch merge.
  - Integration Test Coverage: All critical paths (OTP login, KYC upload, Visitor approval, Payment settlement) covered by automated E2E tests (Playwright for Web, Patrol/IntegrationTest for Flutter).
- **Zero-Downtime Deployment (Blue-Green / Canary)**:
  - Microservices deployed using **Canary Releases** via Argo Rollouts or Flagger.
  - New versions receive 5% of traffic for 10 minutes while automated metric analyzers monitor error rates and latency before 100% rollout.
- **Database Schema Migration Safety**:
  - Schema migrations automated through tools like Flyway / Prisma Migrate.
  - Strict rule against destructive schema migrations (e.g., column drops); all migrations must be backward-compatible using the **Expand/Contract (Parallel Run) Pattern**.
