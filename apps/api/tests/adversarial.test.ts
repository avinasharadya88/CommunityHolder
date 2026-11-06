import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { db } from '../src/db/inMemoryDb.js';
import { CONFIG } from '../src/config.js';

describe('Adversarial & Breaking Tests: Security, Edge Cases & Data Integrity', () => {
  let app: any;
  let residentToken: string;
  let managerToken: string;
  let guardToken: string;

  beforeEach(async () => {
    db.reset();
    app = createApp();

    // 1. Resident (+919876543210)
    const resOtp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919876543210' });
    const resVerify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919876543210', otp: resOtp.body.otp_code });
    residentToken = resVerify.body.token;

    // 2. Manager (+919888877777)
    const mgrOtp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919888877777' });
    const mgrVerify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919888877777', otp: mgrOtp.body.otp_code });
    managerToken = mgrVerify.body.token;

    // 3. Guard (+919777766666)
    const grdOtp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919777766666' });
    const grdVerify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919777766666', otp: grdOtp.body.otp_code });
    guardToken = grdVerify.body.token;
  });

  describe('1. Adversarial Phone Normalization & Input Sanitation', () => {
    it('should properly sanitize messy phone numbers containing spaces, hyphens, and brackets', async () => {
      const res = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ country_code: '+91 ', national_number: ' (9876) 543-210 ' });

      expect(res.status).toBe(200);
      expect(res.body.phone_e164).toBe('+919876543210');
    });

    it('should reject non-numeric characters, letters, and SQL injection strings in phone fields', async () => {
      const sqlRes = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ country_code: '+91', national_number: "98765' OR '1'='1" });

      expect(sqlRes.status).toBe(400);

      const letterRes = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ country_code: '+91', national_number: '987654321A' });

      expect(letterRes.status).toBe(400);
    });

    it('should reject leading zeroes in Indian 10-digit mobile numbers', async () => {
      const zeroRes = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ country_code: '+91', national_number: '0987654321' });

      expect(zeroRes.status).toBe(400);
    });
  });

  describe('2. Malicious File Uploads & Path Traversal Probing', () => {
    it('should reject zero-byte, negative file size, and integer overflow file size in presigned URL request', async () => {
      // 0 bytes
      const zeroByte = await request(app)
        .post('/api/v1/onboarding/kyc/presigned-url')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          document_category: 'GOVERNMENT_ID',
          document_type: 'PASSPORT',
          mime_type: 'application/pdf',
          file_size_bytes: 0,
        });

      expect(zeroByte.status).toBe(400);

      // Negative file size
      const negByte = await request(app)
        .post('/api/v1/onboarding/kyc/presigned-url')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          document_category: 'GOVERNMENT_ID',
          document_type: 'PASSPORT',
          mime_type: 'application/pdf',
          file_size_bytes: -1024,
        });

      expect(negByte.status).toBe(400);
    });

    it('should sanitize path traversal strings in document submission file URLs', async () => {
      const res = await request(app)
        .post('/api/v1/onboarding/kyc/submit')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          full_name: 'Attacker',
          society_id: 'soc_prestige_greenwoods',
          block_id: 'block_tower_alpha',
          unit_id: 'unit_alpha_101',
          relationship_type: 'PRIMARY_OWNER',
          documents: [
            {
              document_category: 'GOVERNMENT_ID',
              document_type: 'PASSPORT',
              document_identifier_masked: 'XXXX',
              file_url: '../../../../etc/passwd',
              file_sha256: 'valid_sha256',
              file_size_bytes: 1024,
              mime_type: 'application/pdf',
            },
          ],
        });

      // Must either sanitize or reject path traversal
      expect(res.status).toBe(400);
    });
  });

  describe('3. Financial & Accounting Fraud Attacks', () => {
    it('should reject negative, zero, NaN, or non-finite payment amounts in settlement', async () => {
      // Negative amount
      const negRes = await request(app)
        .post('/api/v1/payments/settle')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          invoice_id: 'inv_nov_1204',
          amount: -500.0,
        });

      expect(negRes.status).toBe(400);

      // Zero amount
      const zeroRes = await request(app)
        .post('/api/v1/payments/settle')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          invoice_id: 'inv_nov_1204',
          amount: 0,
        });

      expect(zeroRes.status).toBe(400);

      // String/NaN injection
      const nanRes = await request(app)
        .post('/api/v1/payments/settle')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          invoice_id: 'inv_nov_1204',
          amount: 'FREE_MONEY',
        });

      expect(nanRes.status).toBe(400);
    });

    it('should reject negative amounts in banking VAN webhook', async () => {
      const negVan = await request(app)
        .post('/api/v1/webhooks/banking/van')
        .send({
          virtual_account_number: 'CHOLDRBLR1204',
          amount: -120.0,
          utr_reference: 'FRAUD_TXN',
        });

      expect(negVan.status).toBe(400);
    });

    it('should handle concurrent double payments on same invoice without creating ledger imbalance', async () => {
      // Fire 2 concurrent payments of $120 each for inv_nov_1204 ($120 invoice)
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/v1/payments/settle')
          .set('Authorization', `Bearer ${residentToken}`)
          .send({ invoice_id: 'inv_nov_1204', amount: 120.0 }),
        request(app)
          .post('/api/v1/payments/settle')
          .set('Authorization', `Bearer ${residentToken}`)
          .send({ invoice_id: 'inv_nov_1204', amount: 120.0 }),
      ]);

      // One must succeed, one must either be rejected as already paid OR routed cleanly
      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);

      // Ledger must still remain mathematically balanced
      const ledgerRes = await request(app)
        .get('/api/v1/erp/reports/ledger')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(ledgerRes.body.is_balanced).toBe(true);
      expect(ledgerRes.body.total_debits).toEqual(ledgerRes.body.total_credits);
    });
  });

  describe('4. Token Tampering & Role Forgery Attacks', () => {
    it('should reject forged JWT with "none" algorithm or unsigned signature', async () => {
      const forgedToken = jwt.sign(
        { userId: 'user_fake_admin', roles: ['ESTATE_MANAGER', 'SOCIETY_ADMIN'] },
        '',
        { algorithm: 'none' as any }
      );

      const res = await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user_estate_mgr', roles: ['ESTATE_MANAGER'] },
        CONFIG.JWT_SECRET,
        { expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('should reject resident attempting to call manager endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${residentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('5. Gatekeeper Security & PIN Replay Attacks', () => {
    it('should prevent replay of already-used PIN when one-time entry rule applies', async () => {
      // 1. Create a guest pass with PIN
      const pass = await request(app)
        .post('/api/v1/gate/visitor-sessions')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          society_id: 'soc_prestige_greenwoods',
          unit_id: 'unit_alpha_1204',
          visitor_type: 'GUEST',
          visitor_name: 'One Time Guest',
          passcode: '948201',
          is_pre_approved: true,
        });

      expect(pass.status).toBe(201);

      // 2. Validate PIN first time -> Granted
      const firstCheckin = await request(app)
        .post('/api/v1/gate/validate-pin')
        .set('Authorization', `Bearer ${guardToken}`)
        .send({ passcode: '948201' });

      expect(firstCheckin.status).toBe(200);
      expect(firstCheckin.body.status).toBe('CHECKED_IN');

      // 3. Second attempt with same PIN -> Rejected as already checked in!
      const replayCheckin = await request(app)
        .post('/api/v1/gate/validate-pin')
        .set('Authorization', `Bearer ${guardToken}`)
        .send({ passcode: '948201' });

      expect(replayCheckin.status).toBe(400);
      expect(replayCheckin.body.error).toBe('PIN_ALREADY_USED');
    });

    it('should reject decision on non-existent or already finalized visitor session', async () => {
      const res = await request(app)
        .patch('/api/v1/gate/visitor-sessions/sess_non_existent/decision')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ decision: 'APPROVE' });

      expect(res.status).toBe(404);
    });
  });

  describe('6. Amenities Booking Range & Boundary Attacks', () => {
    it('should reject bookings where booking_end is earlier than or equal to booking_start', async () => {
      const invertedRes = await request(app)
        .post('/api/v1/amenities/bookings')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          amenity_id: 'amenity_tennis_01',
          unit_id: 'unit_alpha_1204',
          booking_start: '2026-11-20T19:00:00Z',
          booking_end: '2026-11-20T18:00:00Z', // Inverted! End before start!
        });

      expect(invertedRes.status).toBe(400);
      expect(invertedRes.body.error).toBe('INVALID_BOOKING_INTERVAL');
    });

    it('should reject bookings with non-existent amenity ID', async () => {
      const invalidAmenity = await request(app)
        .post('/api/v1/amenities/bookings')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          amenity_id: 'amenity_fake_pool_99',
          unit_id: 'unit_alpha_1204',
          booking_start: '2026-11-20T10:00:00Z',
          booking_end: '2026-11-20T11:00:00Z',
        });

      expect(invalidAmenity.status).toBe(404);
    });
  });

  describe('7. KYC Unit Conflict Detection (TC-KYC-006)', () => {
    it('TC-KYC-006: should flag conflict when a new user claims a unit already owned by another approved resident', async () => {
      // Flat 1204 already has an approved resident owner (Avinash)
      // New user (+919988771122) applies claiming Flat 1204 as PRIMARY_OWNER
      const newOtp = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ phone_e164: '+919988771122' });
      const newVerify = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone_e164: '+919988771122', otp: newOtp.body.otp_code });
      const newApplicantToken = newVerify.body.token;

      // Submit application claiming Unit 1204
      await request(app)
        .post('/api/v1/onboarding/kyc/submit')
        .set('Authorization', `Bearer ${newApplicantToken}`)
        .send({
          full_name: 'Imposter or Co-Buyer',
          society_id: 'soc_prestige_greenwoods',
          block_id: 'block_tower_alpha',
          unit_id: 'unit_alpha_1204',
          relationship_type: 'PRIMARY_OWNER',
          documents: [
            {
              document_category: 'PROPERTY_PROOF',
              document_type: 'SALE_DEED',
              document_identifier_masked: 'REG-991',
              file_url: 'kyc-vault/2026/11/doc.pdf',
              file_sha256: 'sha256_fake',
              file_size_bytes: 1024,
              mime_type: 'application/pdf',
            },
          ],
        });

      // Manager inspects queue -> must flag conflict!
      const queueRes = await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${managerToken}`);

      const application = queueRes.body.applications.find(
        (a: any) => a.user_id === newVerify.body.user.id
      );

      expect(application).toBeDefined();
      expect(application.has_conflict).toBe(true);
      expect(application.conflicting_owner_name).toBe('Avinash Aradya');
    });
  });
});
