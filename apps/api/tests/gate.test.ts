import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/inMemoryDb.js';

describe('Module 3: Gatekeeper, Access Control & Offline Sync Tests', () => {
  let app: any;
  let residentToken: string;
  let guardToken: string;

  beforeEach(async () => {
    db.reset();
    app = createApp();

    // 1. Login Verified Resident (Avinash: +919876543210)
    const resOtp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919876543210' });
    const resVerify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919876543210', otp_code: resOtp.body.otp_code });
    residentToken = resVerify.body.token;

    // 2. Login Security Guard (Ramesh: +919777766666)
    const guardOtp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919777766666' });
    const guardVerify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919777766666', otp_code: guardOtp.body.otp_code });
    guardToken = guardVerify.body.token;
  });

  it('TC-GATE-001: should allow resident to generate pre-approved visitor pass with 6-digit PIN and QR payload', async () => {
    const res = await request(app)
      .post('/api/v1/gate/visitor-sessions')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        society_id: 'soc_prestige_greenwoods',
        unit_id: 'unit_alpha_1204',
        visitor_type: 'GUEST',
        visitor_name: 'Priya Sharma',
        visitor_phone: '+919811122233',
        is_pre_approved: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.is_pre_approved).toBe(true);
    expect(res.body.passcode).toMatch(/^\d{6}$/); // 6-digit PIN
    expect(res.body.qr_payload).toContain('CH-PASS:');
    expect(res.body.valid_until).toBeDefined();
  });

  it('TC-GATE-002 & TC-GATE-004: should handle guard walk-in check-in and resident Slide-to-Approve action', async () => {
    // 1. Guard initiates walk-in visitor check-in
    const walkinRes = await request(app)
      .post('/api/v1/gate/visitor-sessions')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        society_id: 'soc_prestige_greenwoods',
        unit_id: 'unit_alpha_1204',
        visitor_type: 'CAB',
        visitor_name: 'Uber - Suresh',
        vehicle_number: 'KA-01-MJ-9921',
        photo_url: 'https://cdn.communityholder.com/visitors/2026/11/suresh.jpg',
      });

    expect(walkinRes.status).toBe(201);
    expect(walkinRes.body.status).toBe('PENDING');
    const sessionId = walkinRes.body.session_id;

    // 2. Resident performs Slide-to-Approve action
    const approveRes = await request(app)
      .patch(`/api/v1/gate/visitor-sessions/${sessionId}/decision`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        decision: 'APPROVE',
        delivery_instruction: 'ALLOW_ENTRY',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('APPROVED');
    expect(approveRes.body.approved_at).toBeDefined();

    // Verify record in database
    const session = db.visitorSessions.get(sessionId);
    expect(session?.status).toBe('APPROVED');
  });

  it('TC-GATE-005: should validate 6-digit guest PIN at gate barrier and reject expired PIN', async () => {
    // 1. Pre-approve a pass with valid PIN
    const passRes = await request(app)
      .post('/api/v1/gate/visitor-sessions')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        society_id: 'soc_prestige_greenwoods',
        unit_id: 'unit_alpha_1204',
        visitor_type: 'GUEST',
        visitor_name: 'Vikram Seth',
        passcode: '839201',
        is_pre_approved: true,
      });

    expect(passRes.status).toBe(201);

    // 2. Guard inputs PIN on barrier tablet
    const pinValidateRes = await request(app)
      .post('/api/v1/gate/validate-pin')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        society_id: 'soc_prestige_greenwoods',
        passcode: '839201',
      });

    expect(pinValidateRes.status).toBe(200);
    expect(pinValidateRes.body.status).toBe('CHECKED_IN');
    expect(pinValidateRes.body.guest_name).toBe('Vikram Seth');

    // 3. Test expired PIN rejection
    const expiredPassRes = await request(app)
      .post('/api/v1/gate/visitor-sessions')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        society_id: 'soc_prestige_greenwoods',
        unit_id: 'unit_alpha_1204',
        visitor_type: 'GUEST',
        visitor_name: 'Old Friend',
        passcode: '112233',
        is_pre_approved: true,
        valid_until: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hr ago
      });

    const expiredValidate = await request(app)
      .post('/api/v1/gate/validate-pin')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        society_id: 'soc_prestige_greenwoods',
        passcode: '112233',
      });

    expect(expiredValidate.status).toBe(400);
    expect(expiredValidate.body.error).toBe('PIN_EXPIRED');
  });

  it('TC-GATE-006: should list active visitors and flag overstays exceeding 30 minutes', async () => {
    // 1. Create a visitor session checked in 45 minutes ago
    const oldTime = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    const oldSessionId = 'session_overstay_delivery';
    db.visitorSessions.set(oldSessionId, {
      id: oldSessionId,
      society_id: 'soc_prestige_greenwoods',
      unit_id: 'unit_alpha_1204',
      visitor_type: 'DELIVERY',
      visitor_name: 'Zomato Rider',
      delivery_company: 'Zomato',
      status: 'CHECKED_IN',
      checked_in_at: oldTime,
      is_pre_approved: false,
      created_at: oldTime,
    });

    // 2. Fetch active visitors
    const activeRes = await request(app)
      .get('/api/v1/gate/active-visitors')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(activeRes.status).toBe(200);
    const visitor = activeRes.body.visitors.find((v: any) => v.id === oldSessionId);
    expect(visitor).toBeDefined();
    expect(visitor.is_overstay).toBe(true);
    expect(visitor.status).toBe('OVERSTAY');
    expect(visitor.duration_minutes).toBeGreaterThanOrEqual(44);
  });

  it('TC-GATE-007: should log parcels at gate with 4-digit pickup OTP and mark collected upon verification', async () => {
    // 1. Guard logs delivery parcel
    const logRes = await request(app)
      .post('/api/v1/gate/parcels')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        society_id: 'soc_prestige_greenwoods',
        unit_id: 'unit_alpha_1204',
        courier_company: 'Amazon',
        photo_url: 'https://cdn.communityholder.com/parcels/box_1.jpg',
      });

    expect(logRes.status).toBe(201);
    expect(logRes.body.pickup_otp).toMatch(/^\d{4}$/); // 4-digit OTP
    const parcelId = logRes.body.parcel_id;
    const otp = logRes.body.pickup_otp;

    // 2. Guard attempts collection with wrong OTP -> fails
    const failRes = await request(app)
      .post('/api/v1/gate/parcels/collect')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ parcel_id: parcelId, pickup_otp: '0000' });

    expect(failRes.status).toBe(400);
    expect(failRes.body.error).toBe('INVALID_PICKUP_OTP');

    // 3. Resident or maid provides correct OTP -> succeeds
    const collectRes = await request(app)
      .post('/api/v1/gate/parcels/collect')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ parcel_id: parcelId, pickup_otp: otp });

    expect(collectRes.status).toBe(200);
    expect(collectRes.body.status).toBe('COLLECTED');
    expect(collectRes.body.collected_at).toBeDefined();
  });

  it('TC-OFFLINE-002 & TC-OFFLINE-003: should sync offline queued entries and resolve revoked pass conflict', async () => {
    // 1. Create a pass on server that was subsequently REVOKED (DENIED) by resident
    const revokedPasscode = '778899';
    db.visitorSessions.set('sess_revoked', {
      id: 'sess_revoked',
      society_id: 'soc_prestige_greenwoods',
      unit_id: 'unit_alpha_1204',
      visitor_type: 'GUEST',
      visitor_name: 'Suspicious Individual',
      passcode: revokedPasscode,
      status: 'DENIED', // Revoked!
      is_pre_approved: true,
      created_at: new Date().toISOString(),
    });

    // 2. Guard tablet reconnects after network outage and sends batch of queued offline check-ins
    const syncRes = await request(app)
      .post('/api/v1/gate/sync-batch')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        society_id: 'soc_prestige_greenwoods',
        device_id: 'guard-tablet-north-01',
        events: [
          {
            event_id: 'evt_sync_1',
            event_type: 'WALK_IN_CHECK_IN',
            timestamp: new Date().toISOString(),
            payload: { visitor_name: 'Electrician' },
          },
          {
            event_id: 'evt_sync_2',
            event_type: 'PRE_APPROVED_CHECK_IN',
            timestamp: new Date().toISOString(),
            payload: { passcode: revokedPasscode }, // attempted with revoked passcode
          },
        ],
      });

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.synced_count).toBe(1);
    expect(syncRes.body.synced_event_ids).toContain('evt_sync_1');
    expect(syncRes.body.conflicts.length).toBe(1);
    expect(syncRes.body.conflicts[0].reason).toBe('SERVER_REVOCATION_SUPERSEDES_CLIENT');
  });
});
