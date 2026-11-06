import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/inMemoryDb.js';
import type { VisitorCheckInDto, VisitorSession, OfflineSyncBatchDto } from '@communityholder/shared';

export const GateController = {
  createVisitorSession(req: Request, res: Response) {
    const {
      society_id,
      unit_id,
      visitor_type,
      visitor_name,
      visitor_phone,
      vehicle_number,
      delivery_company,
      photo_url,
      idempotency_key,
    } = req.body as VisitorCheckInDto;

    if (!society_id || !unit_id || !visitor_type || !visitor_name) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'society_id, unit_id, visitor_type, visitor_name are required' });
    }

    // Check idempotency
    if (idempotency_key) {
      for (const existing of db.visitorSessions.values()) {
        if (existing.idempotency_key === idempotency_key) {
          return res.status(200).json({
            session_id: existing.id,
            status: existing.status,
            message: 'Idempotent request: returning existing session',
          });
        }
      }
    }

    const sessionId = uuidv4();
    const isPreApproved = req.body.is_pre_approved === true;
    const passcode = isPreApproved
      ? req.body.passcode || Math.floor(100000 + Math.random() * 900000).toString()
      : undefined;
    const validUntil = isPreApproved
      ? req.body.valid_until || new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      : undefined;

    const session: VisitorSession = {
      id: sessionId,
      society_id,
      unit_id,
      visitor_type,
      visitor_name,
      visitor_phone,
      vehicle_number,
      delivery_company,
      photo_url,
      status: isPreApproved ? 'APPROVED' : 'PENDING',
      is_pre_approved: isPreApproved,
      passcode,
      valid_until: validUntil,
      guard_id: isPreApproved ? undefined : req.user?.userId,
      idempotency_key,
      created_at: new Date().toISOString(),
    };

    db.visitorSessions.set(sessionId, session);

    return res.status(201).json({
      session_id: sessionId,
      status: session.status,
      is_pre_approved: isPreApproved,
      passcode,
      qr_payload: isPreApproved ? `CH-PASS:${sessionId}:${passcode}` : undefined,
      valid_until: validUntil,
      message: isPreApproved
        ? 'Pre-approved visitor pass generated successfully'
        : 'Push notification and Intercom alert dispatched to resident',
      created_at: session.created_at,
    });
  },

  residentDecision(req: Request, res: Response) {
    const id = req.params.id as string;
    const { decision, delivery_instruction } = req.body;

    const session = db.visitorSessions.get(id);
    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
    }

    if (!decision || !['APPROVE', 'DENY', 'LEAVE_AT_GATE'].includes(decision)) {
      return res.status(400).json({ error: 'INVALID_DECISION' });
    }

    if (decision === 'APPROVE') {
      session.status = 'APPROVED';
      session.approved_by_user_id = req.user?.userId;
      session.checked_in_at = new Date().toISOString();
    } else if (decision === 'DENY') {
      session.status = 'DENIED';
    } else if (decision === 'LEAVE_AT_GATE') {
      session.status = 'CHECKED_OUT';
    }

    return res.status(200).json({
      session_id: session.id,
      status: session.status,
      delivery_instruction,
      approved_at: session.checked_in_at,
    });
  },

  validatePreApprovedPin(req: Request, res: Response) {
    const { society_id, passcode } = req.body;

    if (!passcode) {
      return res.status(400).json({ error: 'MISSING_PASSCODE' });
    }

    const now = new Date();
    let matchedSession: VisitorSession | undefined;

    for (const session of db.visitorSessions.values()) {
      if (session.passcode === passcode && session.is_pre_approved) {
        if (society_id && session.society_id !== society_id) {
          continue; // Cross-society isolation: cannot use pass at another society barrier
        }
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      return res.status(404).json({ error: 'PIN_NOT_FOUND', message: 'Invalid or non-existent guest PIN' });
    }

    if (matchedSession.status === 'CHECKED_IN') {
      return res.status(400).json({
        error: 'PIN_ALREADY_USED',
        message: `PIN was already used for entry at ${matchedSession.checked_in_at}. Single-use pre-approved pass.`,
      });
    }

    if (matchedSession.valid_until && new Date(matchedSession.valid_until) < now) {
      return res.status(400).json({
        error: 'PIN_EXPIRED',
        message: `PIN expired at ${matchedSession.valid_until}. Fresh walk-in check-in required.`,
      });
    }

    matchedSession.status = 'CHECKED_IN';
    matchedSession.checked_in_at = now.toISOString();

    const unit = db.units.get(matchedSession.unit_id);

    return res.status(200).json({
      session_id: matchedSession.id,
      status: 'CHECKED_IN',
      guest_name: matchedSession.visitor_name,
      unit_number: unit?.unit_number || 'Unit',
      message: 'PIN verified. Barrier open permitted.',
    });
  },

  syncBatch(req: Request, res: Response) {
    const { society_id, device_id, events } = req.body as OfflineSyncBatchDto;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'INVALID_EVENTS_ARRAY' });
    }

    const syncedEventIds: string[] = [];
    const conflicts: any[] = [];

    for (const evt of events) {
      if (evt.event_type === 'PRE_APPROVED_CHECK_IN') {
        const { passcode } = evt.payload;
        // Check if revoked on server
        let session = Array.from(db.visitorSessions.values()).find((s) => s.passcode === passcode);
        if (session && session.status === 'DENIED') {
          conflicts.push({
            event_id: evt.event_id,
            reason: 'SERVER_REVOCATION_SUPERSEDES_CLIENT',
            passcode,
            message: 'Pass was revoked by resident on server prior to offline check-in.',
          });
        } else {
          syncedEventIds.push(evt.event_id);
        }
      } else {
        syncedEventIds.push(evt.event_id);
      }
    }

    return res.status(200).json({
      synced_count: syncedEventIds.length,
      synced_event_ids: syncedEventIds,
      conflicts,
      message: 'Offline batch synchronized successfully',
    });
  },

  getActiveVisitors(req: Request, res: Response) {
    const now = Date.now();
    const thresholdMs = 30 * 60 * 1000; // 30 mins

    const activeList = Array.from(db.visitorSessions.values())
      .filter((s) => s.status === 'CHECKED_IN' || s.status === 'PENDING')
      .map((s) => {
        const checkInTime = s.checked_in_at ? new Date(s.checked_in_at).getTime() : new Date(s.created_at).getTime();
        const durationMinutes = Math.floor((now - checkInTime) / 60000);
        const isOverstay = durationMinutes > 30;

        return {
          ...s,
          duration_minutes: durationMinutes,
          is_overstay: isOverstay,
          status: isOverstay ? 'OVERSTAY' : s.status,
        };
      });

    return res.status(200).json({
      total_active: activeList.length,
      visitors: activeList,
    });
  },

  logParcel(req: Request, res: Response) {
    const { society_id, unit_id, courier_company, photo_url } = req.body;
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const parcelId = uuidv4();
    db.parcels.set(parcelId, {
      id: parcelId,
      society_id,
      unit_id,
      courier_company,
      photo_url,
      pickup_otp: pickupOtp,
      status: 'AT_GATE',
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({
      parcel_id: parcelId,
      pickup_otp: pickupOtp,
      status: 'AT_GATE',
      message: 'Parcel logged. Pickup OTP sent to resident.',
    });
  },

  collectParcel(req: Request, res: Response) {
    const { parcel_id, pickup_otp } = req.body;

    const parcel = db.parcels.get(parcel_id);
    if (!parcel) {
      return res.status(404).json({ error: 'PARCEL_NOT_FOUND' });
    }

    if (parcel.pickup_otp !== pickup_otp) {
      return res.status(400).json({ error: 'INVALID_PICKUP_OTP' });
    }

    parcel.status = 'COLLECTED';
    parcel.collected_at = new Date().toISOString();

    return res.status(200).json({
      parcel_id: parcel.id,
      status: 'COLLECTED',
      collected_at: parcel.collected_at,
    });
  },
};
