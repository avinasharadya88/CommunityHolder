import express from 'express';
import cors from 'cors';
import { AuthController } from './modules/auth/authController.js';
import { KycController } from './modules/kyc/kycController.js';
import { GateController } from './modules/gate/gateController.js';
import { ErpController } from './modules/erp/erpController.js';
import { AmenitiesController } from './modules/amenities/amenitiesController.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { kycConfinementGuard } from './middleware/kycConfinementGuard.js';
import { db } from './db/inMemoryDb.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health probe
  app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
  });

  // Metadata / Societies lookup
  app.get('/api/v1/societies', (req, res) => {
    res.status(200).json(Array.from(db.societies.values()));
  });

  app.get('/api/v1/societies/:id/structure', (req, res) => {
    const blocks = Array.from(db.blocks.values()).filter((b) => b.society_id === req.params.id);
    const units = Array.from(db.units.values()).filter((u) => u.society_id === req.params.id);
    res.status(200).json({ blocks, units });
  });

  // 1. Authentication Routes (Open)
  app.post('/api/v1/auth/request-otp', AuthController.requestOtp);
  app.post('/api/v1/auth/verify-otp', AuthController.verifyOtp);

  // 2. Banking Webhook (Open with signature in production)
  app.post('/api/v1/webhooks/banking/van', ErpController.vanWebhook);

  // 3. KYC & Onboarding Routes (Authenticated)
  app.post('/api/v1/onboarding/kyc/presigned-url', authMiddleware, KycController.getPresignedUrl);
  app.post('/api/v1/onboarding/kyc/submit', authMiddleware, KycController.submitKyc);
  app.get('/api/v1/onboarding/kyc/status', authMiddleware, KycController.getKycStatus);

  // Admin KYC Management (Authenticated + Role Check)
  app.get('/api/v1/admin/kyc/queue', authMiddleware, KycController.getAdminQueue);
  app.patch('/api/v1/admin/kyc/:id/decision', authMiddleware, KycController.reviewDecision);

  // 4. Operational Routes (Protected by Auth + Strict KYC Confinement Guard!)
  const operational = express.Router();
  operational.use(authMiddleware);
  operational.use(kycConfinementGuard);

  // Gatekeeper
  operational.post('/gate/visitor-sessions', GateController.createVisitorSession);
  operational.patch('/gate/visitor-sessions/:id/decision', GateController.residentDecision);
  operational.post('/gate/validate-pin', GateController.validatePreApprovedPin);
  operational.post('/gate/sync-batch', GateController.syncBatch);
  operational.get('/gate/active-visitors', GateController.getActiveVisitors);
  operational.post('/gate/parcels', GateController.logParcel);
  operational.post('/gate/parcels/collect', GateController.collectParcel);

  // ERP & Finance
  operational.post('/erp/invoices/generate-monthly', ErpController.generateMonthlyInvoices);
  operational.get('/erp/invoices/unit/:unitId', ErpController.getUnitInvoices);
  operational.post('/payments/settle', ErpController.settlePayment);
  operational.get('/erp/reports/ledger', ErpController.getLedger);

  // Amenities
  operational.post('/amenities/bookings', AmenitiesController.createBooking);
  operational.get('/amenities/bookings', AmenitiesController.listBookings);

  // NFR Security / DPDPA Purge Worker Endpoint
  operational.post('/admin/maintenance/purge-old-visitor-photos', (req, res) => {
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    let purgedCount = 0;

    for (const session of db.visitorSessions.values()) {
      const sessionAgeMs = now - new Date(session.created_at).getTime();
      if (sessionAgeMs > ninetyDaysMs && session.photo_url) {
        session.photo_url = undefined; // Purged from storage
        purgedCount += 1;
      }
    }

    res.status(200).json({
      status: 'PURGE_COMPLETED',
      purged_photos_count: purgedCount,
      compliance_policy: 'DPDPA_2023_ARTICLE_8',
    });
  });

  app.use('/api/v1', operational);

  return app;
}

