import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/inMemoryDb.js';

describe('Module 2: KYC & Mandatory Manual Approval Tests', () => {
  let app: any;
  let residentPendingToken: string;
  let managerToken: string;
  let residentUserId: string;

  beforeEach(async () => {
    db.reset();
    app = createApp();

    // 1. Authenticate a new resident
    const otpRes = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919988776655' });
    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919988776655', otp_code: otpRes.body.otp_code });

    residentPendingToken = verifyRes.body.token;
    residentUserId = verifyRes.body.user.id;

    // 2. Authenticate Estate Manager (+919888877777)
    const mgrOtp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919888877777' });
    const mgrVerify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919888877777', otp_code: mgrOtp.body.otp_code });

    managerToken = mgrVerify.body.token;
  });

  it('TC-KYC-002: should reject executable files or files exceeding 10MB limit', async () => {
    // 1. Test .exe rejection
    const exeRes = await request(app)
      .post('/api/v1/onboarding/kyc/presigned-url')
      .set('Authorization', `Bearer ${residentPendingToken}`)
      .send({
        document_category: 'GOVERNMENT_ID',
        document_type: 'PASSPORT',
        mime_type: 'application/x-msdownload',
        file_size_bytes: 1024 * 1024,
      });

    expect(exeRes.status).toBe(400);
    expect(exeRes.body.error).toBe('UNSUPPORTED_MIME_TYPE');

    // 2. Test file size > 10MB
    const largeRes = await request(app)
      .post('/api/v1/onboarding/kyc/presigned-url')
      .set('Authorization', `Bearer ${residentPendingToken}`)
      .send({
        document_category: 'PROPERTY_PROOF',
        document_type: 'SALE_DEED',
        mime_type: 'application/pdf',
        file_size_bytes: 15 * 1024 * 1024, // 15MB
      });

    expect(largeRes.status).toBe(400);
    expect(largeRes.body.error).toBe('FILE_SIZE_EXCEEDS_10MB_LIMIT');
  });

  it('TC-KYC-001: should allow presigned URL creation and submit registration documents', async () => {
    // 1. Request presigned upload URL
    const presignRes = await request(app)
      .post('/api/v1/onboarding/kyc/presigned-url')
      .set('Authorization', `Bearer ${residentPendingToken}`)
      .send({
        document_category: 'GOVERNMENT_ID',
        document_type: 'AADHAAR',
        mime_type: 'application/pdf',
        file_size_bytes: 2 * 1024 * 1024,
      });

    expect(presignRes.status).toBe(200);
    expect(presignRes.body.upload_url).toContain('storage.communityholder.com');
    expect(presignRes.body.storage_key).toBeDefined();

    // 2. Submit KYC application with Aadhaar and Sale Deed
    const submitRes = await request(app)
      .post('/api/v1/onboarding/kyc/submit')
      .set('Authorization', `Bearer ${residentPendingToken}`)
      .send({
        full_name: 'Aditi Rao',
        email: 'aditi.rao@example.com',
        society_id: 'soc_prestige_greenwoods',
        block_id: 'block_tower_alpha',
        unit_id: 'unit_alpha_101',
        relationship_type: 'PRIMARY_OWNER',
        documents: [
          {
            document_category: 'GOVERNMENT_ID',
            document_type: 'AADHAAR',
            document_identifier_masked: 'XXXX-XXXX-9012',
            file_url: presignRes.body.storage_key,
            file_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            file_size_bytes: 2 * 1024 * 1024,
            mime_type: 'application/pdf',
          },
          {
            document_category: 'PROPERTY_PROOF',
            document_type: 'SALE_DEED',
            document_identifier_masked: 'REG/2024/7821',
            file_url: 'kyc-vault/2026/11/sale-deed.pdf',
            file_sha256: 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890',
            file_size_bytes: 4 * 1024 * 1024,
            mime_type: 'application/pdf',
          },
        ],
      });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.kyc_status).toBe('PENDING_VERIFICATION');

    // 3. Verify status endpoint reflects pending verification
    const statusRes = await request(app)
      .get('/api/v1/onboarding/kyc/status')
      .set('Authorization', `Bearer ${residentPendingToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.kyc_status).toBe('PENDING_VERIFICATION');
    expect(statusRes.body.documents.length).toBe(2);
  });

  it('TC-KYC-003: API Gateway Confinement Guard must block unapproved users with 403', async () => {
    // User is in PENDING_VERIFICATION status.
    // Any attempt to access operational routes must be strictly rejected with 403 and KYC confinement error.

    // Try creating gate visitor session
    const gateRes = await request(app)
      .post('/api/v1/gate/visitor-sessions')
      .set('Authorization', `Bearer ${residentPendingToken}`)
      .send({
        society_id: 'soc_prestige_greenwoods',
        unit_id: 'unit_alpha_101',
        visitor_type: 'GUEST',
        visitor_name: 'Friend',
      });

    expect(gateRes.status).toBe(403);
    expect(gateRes.body.error).toBe('ACCESS_CONFINED_PENDING_KYC');
    expect(gateRes.body.code).toBe('KYC_PENDING_CONFINEMENT');

    // Try booking amenity
    const amenRes = await request(app)
      .post('/api/v1/amenities/bookings')
      .set('Authorization', `Bearer ${residentPendingToken}`)
      .send({
        amenity_id: 'amenity_tennis_01',
        unit_id: 'unit_alpha_101',
        booking_start: '2026-12-01T10:00:00Z',
        booking_end: '2026-12-01T12:00:00Z',
      });

    expect(amenRes.status).toBe(403);
    expect(amenRes.body.code).toBe('KYC_PENDING_CONFINEMENT');
  });

  it('TC-KYC-004 & TC-KYC-006: Estate Manager reviews queue with watermarked docs and APPROVES resident', async () => {
    // 1. Resident submits KYC
    await request(app)
      .post('/api/v1/onboarding/kyc/submit')
      .set('Authorization', `Bearer ${residentPendingToken}`)
      .send({
        full_name: 'Aditi Rao',
        society_id: 'soc_prestige_greenwoods',
        block_id: 'block_tower_alpha',
        unit_id: 'unit_alpha_101',
        relationship_type: 'PRIMARY_OWNER',
        documents: [
          {
            document_category: 'GOVERNMENT_ID',
            document_type: 'PASSPORT',
            document_identifier_masked: 'Z9876543',
            file_url: 'kyc-vault/2026/11/passport.pdf',
            file_sha256: 'sha256_mock_1',
            file_size_bytes: 1024 * 500,
            mime_type: 'application/pdf',
          },
        ],
      });

    // 2. Estate Manager inspects KYC Queue
    const queueRes = await request(app)
      .get('/api/v1/admin/kyc/queue')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(queueRes.status).toBe(200);
    expect(queueRes.body.total_pending).toBeGreaterThanOrEqual(1);

    const appItem = queueRes.body.applications.find((a: any) => a.user_id === residentUserId);
    expect(appItem).toBeDefined();
    expect(appItem.applicant_name).toBe('Aditi Rao');
    // TC-KYC-006: Ensure secure watermarked view URLs
    expect(appItem.documents[0].view_url).toContain('watermark=VERIFIED_BY_');

    // 3. Estate Manager Approves Application
    const approveRes = await request(app)
      .patch(`/api/v1/admin/kyc/${appItem.application_id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        decision: 'APPROVE',
        notes: 'Aadhaar name and Sale Deed verified against Land Registry.',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('APPROVED');
    expect(approveRes.body.assigned_role).toBe('RESIDENT_OWNER');

    // 4. Resident re-authenticates or tokens now grant operational access!
    const updatedStatus = await request(app)
      .get('/api/v1/onboarding/kyc/status')
      .set('Authorization', `Bearer ${residentPendingToken}`);

    expect(updatedStatus.body.kyc_status).toBe('APPROVED');

    // Now protected routes are UNLOCKED for this resident!
    const gateAllowedRes = await request(app)
      .post('/api/v1/gate/visitor-sessions')
      .set('Authorization', `Bearer ${residentPendingToken}`)
      .send({
        society_id: 'soc_prestige_greenwoods',
        unit_id: 'unit_alpha_101',
        visitor_type: 'GUEST',
        visitor_name: 'Rahul Sharma',
      });

    expect(gateAllowedRes.status).toBe(201);
    expect(gateAllowedRes.body.status).toBe('PENDING');
  });

  it('TC-KYC-005: Estate Manager rejects application with mandatory remediation reason', async () => {
    // 1. Submit KYC
    await request(app)
      .post('/api/v1/onboarding/kyc/submit')
      .set('Authorization', `Bearer ${residentPendingToken}`)
      .send({
        full_name: 'Karan Mehra',
        society_id: 'soc_prestige_greenwoods',
        block_id: 'block_tower_alpha',
        unit_id: 'unit_alpha_101',
        relationship_type: 'TENANT',
        documents: [
          {
            document_category: 'PROPERTY_PROOF',
            document_type: 'RENTAL_AGREEMENT',
            document_identifier_masked: 'AGR-BLR-881',
            file_url: 'kyc-vault/2026/11/rental.pdf',
            file_sha256: 'sha256_mock_2',
            file_size_bytes: 1024 * 300,
            mime_type: 'application/pdf',
          },
        ],
      });

    const queueRes = await request(app)
      .get('/api/v1/admin/kyc/queue')
      .set('Authorization', `Bearer ${managerToken}`);

    const appItem = queueRes.body.applications.find((a: any) => a.user_id === residentUserId);

    // Try rejecting without reason -> should fail 400
    const failReject = await request(app)
      .patch(`/api/v1/admin/kyc/${appItem.application_id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ decision: 'REJECT' });

    expect(failReject.status).toBe(400);
    expect(failReject.body.error).toBe('MISSING_REJECTION_REASON');

    // Reject with explicit remediation instructions
    const rejectRes = await request(app)
      .patch(`/api/v1/admin/kyc/${appItem.application_id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        decision: 'REJECT',
        rejection_reason: 'DOCUMENT_ILLEGIBLE',
        notes: 'Rental agreement page 2 with owner signatures is cut off. Please re-upload full scan.',
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe('REJECTED');
    expect(rejectRes.body.rejection_reason).toContain('DOCUMENT_ILLEGIBLE');

    // Resident checks status -> sees REJECTED and the instructions
    const userStatus = await request(app)
      .get('/api/v1/onboarding/kyc/status')
      .set('Authorization', `Bearer ${residentPendingToken}`);

    expect(userStatus.body.kyc_status).toBe('REJECTED');
    expect(userStatus.body.rejection_reason).toContain('Rental agreement page 2');
  });
});
