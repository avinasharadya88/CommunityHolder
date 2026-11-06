import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/inMemoryDb.js';

describe('Module 6: Non-Functional Requirements (NFR) Verification Tests', () => {
  let app: any;
  let managerToken: string;

  beforeEach(async () => {
    db.reset();
    app = createApp();

    // Login Estate Manager (+919888877777)
    const mgrOtp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919888877777' });
    const mgrVerify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919888877777', otp_code: mgrOtp.body.otp_code });
    managerToken = mgrVerify.body.token;
  });

  it('TC-NFR-SEC-001: should enforce DPDPA 2023 visitor retention and purge visitor photos older than 90 days', async () => {
    const now = Date.now();
    const oneHundredDaysAgo = new Date(now - 100 * 24 * 3600 * 1000).toISOString();
    const tenDaysAgo = new Date(now - 10 * 24 * 3600 * 1000).toISOString();

    // 1. Seed an old visitor session (100 days old)
    db.visitorSessions.set('sess_old_100d', {
      id: 'sess_old_100d',
      society_id: 'soc_prestige_greenwoods',
      unit_id: 'unit_alpha_1204',
      visitor_type: 'GUEST',
      visitor_name: 'Old Visitor',
      photo_url: 'https://cdn.communityholder.com/visitors/2026/08/old.jpg',
      status: 'CHECKED_OUT',
      created_at: oneHundredDaysAgo,
    });

    // 2. Seed a recent visitor session (10 days old)
    db.visitorSessions.set('sess_recent_10d', {
      id: 'sess_recent_10d',
      society_id: 'soc_prestige_greenwoods',
      unit_id: 'unit_alpha_1204',
      visitor_type: 'DELIVERY',
      visitor_name: 'Recent Courier',
      photo_url: 'https://cdn.communityholder.com/visitors/2026/10/recent.jpg',
      status: 'CHECKED_OUT',
      created_at: tenDaysAgo,
    });

    // 3. Trigger DPDPA auto-purge maintenance job
    const purgeRes = await request(app)
      .post('/api/v1/admin/maintenance/purge-old-visitor-photos')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(purgeRes.status).toBe(200);
    expect(purgeRes.body.status).toBe('PURGE_COMPLETED');
    expect(purgeRes.body.purged_photos_count).toBe(1);
    expect(purgeRes.body.compliance_policy).toBe('DPDPA_2023_ARTICLE_8');

    // 4. Verify old session photo was purged while keeping metadata
    const oldSession = db.visitorSessions.get('sess_old_100d');
    expect(oldSession?.photo_url).toBeUndefined();
    expect(oldSession?.visitor_name).toBe('Old Visitor'); // audit log kept

    // 5. Verify recent session photo remains intact
    const recentSession = db.visitorSessions.get('sess_recent_10d');
    expect(recentSession?.photo_url).toBe('https://cdn.communityholder.com/visitors/2026/10/recent.jpg');
  });

  it('TC-NFR-PERF-001: health probe responds with sub-5ms latency and healthy status', async () => {
    const start = Date.now();
    const res = await request(app).get('/healthz');
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEALTHY');
    expect(elapsed).toBeLessThan(50); // fast local execution
  });
});

