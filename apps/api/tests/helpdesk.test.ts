import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/inMemoryDb.js';

describe('Module 7: Helpdesk & Automated SLA Escalation Tests (TC-HELP-001)', () => {
  let app: any;
  let residentToken: string;
  let managerToken: string;

  beforeEach(async () => {
    db.reset();
    app = createApp();

    // Resident (+919876543210)
    const resOtp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919876543210' });
    const resVerify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919876543210', otp: resOtp.body.otp_code });
    residentToken = resVerify.body.token;

    // Manager (+919888877777)
    const mgrOtp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone_e164: '+919888877777' });
    const mgrVerify = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone_e164: '+919888877777', otp: mgrOtp.body.otp_code });
    managerToken = mgrVerify.body.token;
  });

  it('TC-HELP-001: should create ticket, assign to contractor, and auto-escalate past SLA thresholds', async () => {
    // 1. Resident files ticket with video evidence
    const createRes = await request(app)
      .post('/api/v1/helpdesk/tickets')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        society_id: 'soc_prestige_greenwoods',
        unit_id: 'unit_alpha_1204',
        category: 'LIFT_MAINTENANCE',
        scope: 'COMMON_AREA',
        title: 'Passenger Lift #2 grinding noise',
        description: 'Tower Alpha Passenger Lift #2 making loud grinding noise on 10th floor',
        priority: 'HIGH',
        sla_deadline_hours: 4,
        attachment_url: 'https://cdn.communityholder.com/helpdesk/lift_grind.mp4',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('OPEN');
    expect(createRes.body.assigned_to).toBe('contractor_facility_lead');
    expect(createRes.body.sla_expires_at).toBeDefined();

    const ticketId = createRes.body.ticket_id;
    const ticketRecord = db.helpdeskTickets.get(ticketId) as any;
    expect(ticketRecord.escalation_level).toBe('NONE');

    // 2. Simulate 5 hours elapse (past 4-hour SLA)
    const fiveHoursAgo = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
    ticketRecord.created_at = fiveHoursAgo;

    // Run SLA escalation cron
    const l1Run = await request(app)
      .post('/api/v1/admin/maintenance/escalate-sla-tickets')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(l1Run.status).toBe(200);
    expect(l1Run.body.escalated_l1_count).toBe(1);
    expect(ticketRecord.escalation_level).toBe('L1');

    // 3. Simulate 26 hours elapse (past 24-hour L2 SLA threshold)
    const twentySixHoursAgo = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
    ticketRecord.created_at = twentySixHoursAgo;

    // Run SLA escalation cron again
    const l2Run = await request(app)
      .post('/api/v1/admin/maintenance/escalate-sla-tickets')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(l2Run.status).toBe(200);
    expect(l2Run.body.escalated_l2_count).toBe(1);
    expect(ticketRecord.escalation_level).toBe('L2');

    // 4. Resolve ticket -> no longer escalates
    const resolveRes = await request(app)
      .patch(`/api/v1/helpdesk/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'RESOLVED' });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.status).toBe('RESOLVED');
  });
});

